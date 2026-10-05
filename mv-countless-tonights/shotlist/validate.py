#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate the shot list for 《无数个今晚》 against the delivery contract
(brief/directors_notes.md §1, §4, §5) and timing/timing.json.

Usage:  python3 shotlist/validate.py [path/to/shots.json]   (default: shotlist/skeleton.json)
Exit code 0 = clean (warnings allowed), 1 = errors.
"""
import json, os, re, sys
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'skeleton.json')

SCENES = {'museum_gallery', 'restoration_lab', 'ship_cabin', 'sea_deck', 'old_home',
          'pier_waiting', 'harbor_eras', 'map_office', 'chapel', 'night_window', 'corridor'}
ERAS = {'modern', 'navigator', 'home', 'migrant', 'maphand', 'chapel', 'future', 'multi'}
SIZES = {'ECU', 'CU', 'MCU', 'MS', 'MWS', 'WS', 'EWS', 'INSERT'}
TRANS = {'cut', 'match_cut', 'dissolve', 'reflection', 'light', 'fade_in'}
TREF = {'一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', 'gap'}
REQUIRED = ['id', 'in_frame', 'out_frame', 'section', 'treatment_ref', 'lyric_ids', 'lyric',
            'sync_points', 'era', 'scene', 'location', 'characters', 'props', 'shot_size',
            'angle', 'lens_mm', 'camera_move', 'speed', 'action', 'emotion',
            'transition_in', 'continuity']
MIN_FRAMES = 12

errors, warns = [], []
def err(m): errors.append(m)
def warn(m): warns.append(m)

# ── load ──
try:
    shots = json.load(open(PATH, encoding='utf-8'))
except Exception as e:
    print(f'FAIL: cannot parse {PATH}: {e}'); sys.exit(1)
T = json.load(open(os.path.join(ROOT, 'timing', 'timing.json'), encoding='utf-8'))
FPS, TOTAL = T['fps'], T['total_frames']
SECS = OrderedDict((s['id'], s) for s in T['sections'])
LINES = T['lines']
if not isinstance(shots, list) or not shots:
    print('FAIL: top level must be a non-empty array'); sys.exit(1)

# ── per-shot structure ──
for i, s in enumerate(shots):
    tag = s.get('id', f'#{i}')
    for k in REQUIRED:
        if k not in s:
            err(f'{tag}: missing field "{k}"')
    if s.get('id') != f'S{i + 1:03d}':
        err(f'{tag}: id should be S{i + 1:03d} (sequential)')
    a, b = s.get('in_frame'), s.get('out_frame')
    if not (isinstance(a, int) and isinstance(b, int)):
        err(f'{tag}: in_frame/out_frame must be integers'); continue
    if b - a < MIN_FRAMES:
        err(f'{tag}: duration {b - a} frames < {MIN_FRAMES}')
    if s.get('scene') not in SCENES:
        err(f'{tag}: invalid scene "{s.get("scene")}"')
    if s.get('era') not in ERAS:
        err(f'{tag}: invalid era "{s.get("era")}"')
    if s.get('shot_size') not in SIZES:
        err(f'{tag}: invalid shot_size "{s.get("shot_size")}"')
    if s.get('treatment_ref') not in TREF:
        err(f'{tag}: invalid treatment_ref "{s.get("treatment_ref")}"')
    if not isinstance(s.get('lens_mm'), (int, float)):
        err(f'{tag}: lens_mm must be a number')
    if not re.match(r'^(24|48)\b', str(s.get('speed', ''))):
        err(f'{tag}: speed must start with 24 or 48')
    for k in ('characters', 'props', 'lyric_ids', 'sync_points'):
        if k in s and not isinstance(s[k], list):
            err(f'{tag}: {k} must be a list')
    for k in ('location', 'angle', 'camera_move', 'action', 'emotion', 'continuity'):
        if k in s and not str(s[k]).strip():
            err(f'{tag}: {k} is empty')
    tr = s.get('transition_in') or {}
    if tr.get('type') not in TRANS:
        err(f'{tag}: transition_in.type "{tr.get("type")}" invalid')
    if not isinstance(tr.get('frames'), int) or tr.get('frames', 0) < 0:
        err(f'{tag}: transition_in.frames must be a non-negative int')
    elif tr['frames'] > (b - a):
        err(f'{tag}: transition_in.frames longer than the shot')
    if not str(tr.get('on', '')).strip():
        err(f'{tag}: transition_in.on is empty')
    # section must be a real section that the shot overlaps (and ideally its majority)
    ta, tb = a / FPS, b / FPS
    sec = s.get('section')
    if sec not in SECS:
        err(f'{tag}: invalid section "{sec}"')
    else:
        ov = {k: min(tb, v['end']) - max(ta, v['start']) for k, v in SECS.items()}
        if ov[sec] <= 0:
            err(f'{tag}: section {sec} does not overlap shot {ta:.3f}-{tb:.3f}s')
        elif sec != max(ov, key=ov.get):
            warn(f'{tag}: section {sec} is not the majority section ({max(ov, key=ov.get)})')
    # sync points inside the shot
    for sp in s.get('sync_points') or []:
        t = sp.get('t') if isinstance(sp, dict) else None
        if not isinstance(t, (int, float)) or not str(sp.get('event', '')).strip():
            err(f'{tag}: malformed sync point {sp}')
        elif not (ta - 1e-6 <= t <= tb + 1e-6):
            err(f'{tag}: sync point t={t} outside shot [{ta:.3f}, {tb:.3f}]')

# ── contiguity & length ──
if shots[0].get('in_frame') != 0:
    err(f'S001.in_frame must be 0 (is {shots[0].get("in_frame")})')
for p, q in zip(shots, shots[1:]):
    if q.get('in_frame') != p.get('out_frame'):
        err(f'{q.get("id")}: in_frame {q.get("in_frame")} != previous out_frame {p.get("out_frame")}')
if shots[-1].get('out_frame') != TOTAL:
    err(f'last out_frame must be {TOTAL} (is {shots[-1].get("out_frame")})')

# ── lyric coverage & consistency: a line is listed iff [start,end] overlaps [in,out) ──
line_by_id = {L['id']: L for L in LINES}
seen = set()
for s in shots:
    a, b = s.get('in_frame'), s.get('out_frame')
    if not isinstance(a, int) or not isinstance(b, int):
        continue
    ta, tb = a / FPS, b / FPS
    expect = [L['id'] for L in LINES if L['start'] < tb and L['end'] > ta]
    got = s.get('lyric_ids') or []
    for lid in got:
        if lid not in line_by_id:
            err(f'{s["id"]}: unknown lyric id {lid}')
    if list(got) != expect:
        miss = [x for x in expect if x not in got]; extra = [x for x in got if x not in expect]
        err(f'{s["id"]}: lyric_ids {got} != expected {expect}'
            + (f' (missing {miss})' if miss else '') + (f' (extra {extra})' if extra else ''))
    if bool(got) != bool(str(s.get('lyric', '')).strip()):
        err(f'{s["id"]}: lyric text must be non-empty iff lyric_ids non-empty')
    for lid in got:
        L = line_by_id.get(lid)
        if L and L['text'] not in str(s.get('lyric', '')):
            warn(f'{s["id"]}: lyric text does not contain line {lid} 「{L["text"]}」')
    seen.update(got)
for L in LINES:
    if L['id'] not in seen:
        err(f'lyric line {L["id"]} 「{L["text"]}」 ({L["start"]}-{L["end"]}s) not covered by any shot')

# ── soft check: cuts that land just after a sung syllable onset (possible mid-syllable cut) ──
onsets = [(t, L['text'][k], L['id']) for L in LINES for k, t in enumerate(L['char_times'] or [])
          if t is not None and L['start'] - 0.05 <= t <= L['end'] + 0.05]
for s in shots[1:]:
    c = s['in_frame'] / FPS
    hit = [o for o in onsets if c - 0.15 < o[0] < c - 0.04]
    if hit:
        warn(f'{s["id"]}: cut at {c:.3f}s lands {c - hit[-1][0]:.2f}s after onset of 「{hit[-1][1]}」 ({hit[-1][2]})')

# ── report ──
durs = [s['out_frame'] - s['in_frame'] for s in shots if isinstance(s.get('in_frame'), int)]
n = len(shots)
print(f'File: {PATH}')
print(f'Shots: {n}   Total: {sum(durs)} frames = {sum(durs) / FPS:.3f}s   (contract {TOTAL} frames)')
print(f'Duration  avg {sum(durs) / n / FPS:.2f}s ({sum(durs) / n:.1f}f)   '
      f'min {min(durs) / FPS:.2f}s ({min(durs)}f, {shots[durs.index(min(durs))]["id"]})   '
      f'max {max(durs) / FPS:.2f}s ({max(durs)}f, {shots[durs.index(max(durs))]["id"]})')
print('\nPer section:            shots   avg(s)   span(s)')
for k, v in SECS.items():
    ds = [d for s, d in zip(shots, durs) if s.get('section') == k]
    span = v['end'] - v['start']
    print(f'  {k:<10} {v["start"]:7.1f}-{v["end"]:<7.1f} {len(ds):4d}   '
          f'{(sum(ds) / len(ds) / FPS if ds else 0):6.2f}   {span:6.1f}')
print('\nPer scene:  ' + ', '.join(f'{k} {v}' for k, v in Counter(s.get('scene') for s in shots).most_common()))
print('Per era:    ' + ', '.join(f'{k} {v}' for k, v in Counter(s.get('era') for s in shots).most_common()))
print('Transitions:' + ', '.join(f' {k} {v}' for k, v in Counter((s.get('transition_in') or {}).get('type') for s in shots).most_common()))
print(f'Lyric lines covered: {len(seen)}/{len(LINES)}')
if warns:
    print(f'\nWARNINGS ({len(warns)}):')
    for w in warns: print('  - ' + w)
if errors:
    print(f'\nERRORS ({len(errors)}):')
    for e in errors: print('  - ' + e)
    print('\nFAIL'); sys.exit(1)
print('\nOK — skeleton is valid.')
