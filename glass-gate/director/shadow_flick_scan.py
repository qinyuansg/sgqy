"""Find short shadow flicks: a bright, otherwise static patch that goes dark for 1-3 frames and comes back.

  python director/shadow_flick_scan.py <frames_dir> [--cuts 108,228,...] [--start 0] [--end 1559]

A fast part flying between a hard lamp and a part that has already landed throws exactly this (the glitch scanner's
global flicker test only sees the big ones). Prints frame runs with the block position and the depth of the dip.
"""
import sys, os, argparse
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('--cuts', default=''); ap.add_argument('--prefix', default='f_')
ap.add_argument('--start', type=int, default=0); ap.add_argument('--end', type=int, default=1559)
ap.add_argument('--dip', type=float, default=0.30); ap.add_argument('--bright', type=float, default=0.22)
a = ap.parse_args()
cuts = sorted(int(x) for x in a.cuts.split(',') if x)
SW, SH, B = 216, 270, 9                       # 24 x 30 blocks of 9 px
fr = list(range(a.start, a.end + 1)); N = len(fr)
lum = np.zeros((N, SH // B, SW // B), np.float32)
for i, f in enumerate(fr):
    im = Image.open(os.path.join(a.src, f'{a.prefix}{f:04d}.png')).convert('L').resize((SW, SH), Image.BOX)
    lum[i] = np.asarray(im, np.float32).reshape(SH // B, B, SW // B, B).mean(axis=(1, 3)) / 255.0
def same_shot(i, j):
    return not any(fr[min(i, j)] < c <= fr[max(i, j)] for c in cuts)
hits = {}
for i in range(4, N - 4):
    for w in (1, 2, 3):                        # dip of w frames starting at i
        j0, j1 = i - 2, i + w + 1              # reference frames before and after
        if j1 >= N or not same_shot(j0 - 1, j1 + 1): continue
        before = 0.5 * (lum[j0] + lum[j0 - 1]); after = 0.5 * (lum[j1] + lum[min(j1 + 1, N - 1)])
        ref = np.minimum(before, after)
        stable = np.abs(before - after) < 0.12 * np.maximum(before, after)      # the patch itself did not change
        dip = (ref - lum[i:i + w].max(axis=0)) / np.maximum(ref, 1e-3)
        m = (ref > a.bright) & stable & (dip > a.dip)
        if m.sum() >= 3:                       # at least three blocks
            ys, xs = np.nonzero(m)
            for k in range(w):
                h = hits.setdefault(fr[i + k], [0, 0.0, None])
                if m.sum() > h[0]: hits[fr[i + k]] = [int(m.sum()), float(dip[m].mean()), (int(xs.mean() * B * 4), int(ys.mean() * B * 4))]
run = []
def flush():
    if run:
        best = max(run, key=lambda f: hits[f][0])
        print(f'frames {run[0]}-{run[-1]}: {hits[best][0]} blocks, mean dip {hits[best][1]:.0%}, around x,y={hits[best][2]} (of 864x1080)')
for f in sorted(hits):
    if run and f > run[-1] + 1: flush(); run = []
    run.append(f)
flush()
print('frames with a flick:', len(hits))
