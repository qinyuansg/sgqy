"""Scan every rendered frame for glitches.

  python director/glitch_scan.py <frames_dir> <report_dir> [--prefix f_] [--cuts 120,240,...]

Checks, per frame (on a 1/3-scale luma copy unless noted):
  missing/unreadable frames, black or blown frames,
  flicker    : global luma second difference,
  pops       : residual against the temporal median of 3 frames, globally and per block (one-frame events),
  boiling    : frame-to-frame fine-grain energy in regions that are otherwise static (denoiser crawl),
  hitches    : global image shift (phase correlation) — spikes in its acceleration away from cuts.
Cuts (first frame of each shot) are excluded from the temporal tests.
Writes metrics.csv, flagged.json, plots.png and crops of the worst offenders for visual review.
"""
import sys, os, json, argparse
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('report')
ap.add_argument('--prefix', default='f_')
ap.add_argument('--cuts', default='')
ap.add_argument('--start', type=int, default=0)
ap.add_argument('--end', type=int, default=1559)
ap.add_argument('--top', type=int, default=24)
a = ap.parse_args()
os.makedirs(a.report, exist_ok=True)
cuts = set(int(x) for x in a.cuts.split(',') if x)
near_cut = set()
for c in cuts:
    near_cut.update((c - 1, c, c + 1))

SW, SH = 360, 450
frames = list(range(a.start, a.end + 1))
N = len(frames)
luma = np.zeros((N, SH, SW), np.float32)
missing = []
for i, f in enumerate(frames):
    p = os.path.join(a.src, f'{a.prefix}{f:04d}.png')
    try:
        im = Image.open(p).convert('L').resize((SW, SH), Image.BILINEAR)
        luma[i] = np.asarray(im, np.float32) / 255.0
    except Exception as e:
        missing.append(f); luma[i] = np.nan
if missing:
    print('MISSING/UNREADABLE:', missing)

mean = np.nanmean(luma, axis=(1, 2))
black = [frames[i] for i in range(N) if mean[i] < 0.004]
blown = [frames[i] for i in range(N) if np.nanmean(luma[i] > 0.985) > 0.35]

# flicker: global luma second difference
flick = np.zeros(N)
flick[1:-1] = np.abs(mean[1:-1] - 0.5 * (mean[:-2] + mean[2:]))

# pops: residual against temporal median of 3
BH, BW = 15, 12
pop_g = np.zeros(N); pop_b = np.zeros(N); pop_where = [None] * N
for i in range(1, N - 1):
    med = np.median(luma[i - 1:i + 2], axis=0)
    r = np.abs(luma[i] - med)
    # a moving object leaves residual in ALL three frames; a one-frame pop only in this one
    r_prev = np.abs(luma[i - 1] - med); r_next = np.abs(luma[i + 1] - med)
    excess = np.clip(r - np.maximum(r_prev, r_next), 0, None)
    pop_g[i] = excess.mean()
    blk = excess.reshape(BH, SH // BH, BW, SW // BW).mean(axis=(1, 3))
    pop_b[i] = blk.max()
    by, bx = np.unravel_index(blk.argmax(), blk.shape)
    pop_where[i] = (int(bx), int(by))

# boiling: fine grain that changes frame to frame where the coarse image is static
def blur(x):
    k = 4
    return x.reshape(SH // k, k, SW // k, k).mean(axis=(1, 3))
boil = np.zeros(N)
for i in range(1, N):
    coarse_change = np.abs(blur(luma[i]) - blur(luma[i - 1]))
    static = np.repeat(np.repeat(coarse_change < 0.004, 4, 0), 4, 1)
    fine = np.abs((luma[i] - luma[i - 1]))
    if static.mean() > 0.05:
        boil[i] = fine[static].mean()

# hitches: phase correlation shift between consecutive frames
def shift(x, y):
    X = np.fft.rfft2(x - x.mean()); Y = np.fft.rfft2(y - y.mean())
    R = X * np.conj(Y); R /= np.abs(R) + 1e-9
    c = np.fft.irfft2(R, s=x.shape)
    iy, ix = np.unravel_index(c.argmax(), c.shape)
    if iy > x.shape[0] // 2: iy -= x.shape[0]
    if ix > x.shape[1] // 2: ix -= x.shape[1]
    return ix, iy
sx = np.zeros(N); sy = np.zeros(N)
for i in range(1, N):
    sx[i], sy[i] = shift(luma[i], luma[i - 1])
acc = np.zeros(N)
acc[2:] = np.hypot(np.diff(sx[1:]), np.diff(sy[1:]))

def robust_flags(x, k, floor, skip=near_cut):
    med = np.median(x); mad = np.median(np.abs(x - med)) + 1e-9
    thr = max(med + k * 1.4826 * mad, floor)
    return [(frames[i], float(x[i])) for i in range(N) if x[i] > thr and frames[i] not in skip], thr

fl_flags, fl_thr = robust_flags(flick, 12, 0.004)
pg_flags, pg_thr = robust_flags(pop_g, 14, 0.0015)
pb_flags, pb_thr = robust_flags(pop_b, 14, 0.03)
bo_flags, bo_thr = robust_flags(boil, 10, 0.006)
hi_flags, hi_thr = robust_flags(acc, 12, 6.0)

with open(os.path.join(a.report, 'metrics.csv'), 'w') as fh:
    fh.write('frame,mean,flicker,pop_global,pop_block,boil,shift_x,shift_y,shift_acc\n')
    for i, f in enumerate(frames):
        fh.write(f'{f},{mean[i]:.5f},{flick[i]:.5f},{pop_g[i]:.5f},{pop_b[i]:.5f},{boil[i]:.5f},{sx[i]:.0f},{sy[i]:.0f},{acc[i]:.1f}\n')

res = dict(frames=N, missing=missing, black=black, blown=blown,
           thresholds=dict(flicker=fl_thr, pop_global=pg_thr, pop_block=pb_thr, boil=bo_thr, hitch=hi_thr),
           flicker=fl_flags, pop_global=pg_flags, pop_block=pb_flags, boil=bo_flags, hitch=hi_flags,
           boil_mean=float(boil.mean()), boil_p95=float(np.percentile(boil, 95)))
json.dump(res, open(os.path.join(a.report, 'flagged.json'), 'w'), indent=1)

# review strips for the worst block pops: prev | this | next, with the block marked
worst = sorted([(pop_b[i], i) for i in range(1, N - 1) if frames[i] not in near_cut], reverse=True)[:a.top]
strips = []
for score, i in worst:
    tiles = []
    for j in (i - 1, i, i + 1):
        t = Image.fromarray((np.nan_to_num(luma[j]) * 255).astype(np.uint8)).convert('RGB')
        if j == i and pop_where[i]:
            from PIL import ImageDraw
            bx, by = pop_where[i]; d = ImageDraw.Draw(t)
            d.rectangle([bx * SW // BW, by * SH // BH, (bx + 1) * SW // BW, (by + 1) * SH // BH], outline=(255, 60, 60), width=2)
        tiles.append(t)
    strip = Image.new('RGB', (SW * 3 + 8, SH + 22), (0, 0, 0))
    for k, t in enumerate(tiles):
        strip.paste(t, (k * (SW + 4), 22))
    from PIL import ImageDraw
    ImageDraw.Draw(strip).text((4, 4), f'frame {frames[i]}  block-pop {score:.3f}', fill=(255, 255, 0))
    strips.append(strip)
for n in range(0, len(strips), 6):
    grp = strips[n:n + 6]
    sheet = Image.new('RGB', (grp[0].width * 2 + 6, (grp[0].height + 6) * 3), (20, 20, 20))
    for k, s in enumerate(grp):
        sheet.paste(s, ((k % 2) * (s.width + 6), (k // 2) * (s.height + 6)))
    sheet.save(os.path.join(a.report, f'worst_pops_{n // 6}.jpg'), quality=85)

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(5, 1, figsize=(16, 13), sharex=True)
    for axx, (y, lab, thr) in zip(ax, ((mean, 'mean luma', None), (flick, 'flicker', fl_thr), (pop_b, 'block pop', pb_thr), (boil, 'boil', bo_thr), (acc, 'shift accel (px@1/3)', hi_thr))):
        axx.plot(frames, y, lw=0.7); axx.set_ylabel(lab)
        if thr: axx.axhline(thr, color='r', lw=0.5)
        for c in cuts: axx.axvline(c, color='g', lw=0.4, alpha=0.5)
    plt.tight_layout(); plt.savefig(os.path.join(a.report, 'plots.png'), dpi=80)
except Exception as e:
    print('no plot:', e)

print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in res.items()}, indent=1))
