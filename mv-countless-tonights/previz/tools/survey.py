#!/usr/bin/env python3
"""Integration survey: render first / middle / last frame of every shot, then build
   - per-shot strips   out/<dir>/shots/Sxxx.jpg        (in | mid | out)
   - cut-pair images   out/<dir>/cuts/Sxxx-Syyy.jpg    (last frame of A | first frame of B, labelled)
   - pages             out/<dir>/cuts_page_N.jpg       (8 cut pairs per page)
usage: python3 tools/survey.py out/survey_v2 [width] [--only S001,S002]  (run from previz/)"""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
pv = os.path.dirname(here)
root = os.path.dirname(pv)
out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'out/survey'
W = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].isdigit() else '960'
only = None
if '--only' in sys.argv:
    only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
shots = json.load(open(os.path.join(root, 'shotlist', 'shots.json')))
frames = {}
for s in shots:
    if only and s['id'] not in only:
        continue
    a, b = s['in_frame'], s['out_frame'] - 1
    frames[s['id']] = (a, (a + b) // 2, b)
fl = sorted({f for v in frames.values() for f in v})
raw = os.path.join(pv, out, 'raw')
os.makedirs(raw, exist_ok=True)
todo = [f for f in fl if not any(n.startswith(f'f{f:05d}_') for n in os.listdir(raw))]
if todo:
    subprocess.run(['node', 'render.mjs', '--w', W, '--frame-list', ','.join(map(str, todo)), '--stills', raw], cwd=pv, check=True)
byf = {int(n[1:6]): os.path.join(raw, n) for n in os.listdir(raw) if n.endswith('.jpg')}
sd = os.path.join(pv, out, 'shots'); cd = os.path.join(pv, out, 'cuts')
os.makedirs(sd, exist_ok=True); os.makedirs(cd, exist_ok=True)
for sid, (a, m, b) in frames.items():
    subprocess.run(['montage', '-label', '%t', '-pointsize', '12', '-fill', '#ddd', '-background', '#111', '-tile', '3x1', '-geometry', '480x+3+3',
                    byf[a], byf[m], byf[b], os.path.join(sd, f'{sid}.jpg')], check=True)
pairs = []
for i in range(1, len(shots)):
    A, B = shots[i - 1], shots[i]
    if only and not (A['id'] in only or B['id'] in only):
        continue
    fa, fb = A['out_frame'] - 1, B['in_frame']
    if fa not in byf or fb not in byf:
        continue
    tr = B.get('transition_in', {})
    lab = f"{A['id']} ({A['scene']}) -> {B['id']} ({B['scene']})  [{tr.get('type','cut')}{'/'+str(tr.get('frames')) if tr.get('frames') else ''}]  on: {str(tr.get('on',''))[:70]}"
    dst = os.path.join(cd, f"{A['id']}-{B['id']}.jpg")
    subprocess.run(['montage', byf[fa], byf[fb], '-tile', '2x1', '-geometry', '640x+2+2', '-background', '#111', dst], check=True)
    subprocess.run(['convert', dst, '-background', '#111', '-fill', '#e8d9b0', '-font', 'WenQuanYi-Zen-Hei', '-pointsize', '15', f'label:{lab}', '-gravity', 'west', '-append', dst], check=True)
    pairs.append(dst)
for k in range(0, len(pairs), 8):
    subprocess.run(['convert', *pairs[k:k + 8], '-append', os.path.join(pv, out, f'cuts_page_{k // 8}.jpg')], check=True)
print(f'{len(frames)} shots, {len(pairs)} cut pairs -> {os.path.join(pv, out)}')
