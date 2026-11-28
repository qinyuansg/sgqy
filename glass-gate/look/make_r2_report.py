"""Helper B — round-2 evidence from the renders in renders/look/r2 (see NOTES.md, round 2).

    /opt/blender-env/venv/bin/python look/make_r2_report.py

Writes look/tests/r2_*.png sheets and look/tests/r2_measure.json:
  seeds   : same frame, two seeds (pure noise), before and after
  motion  : temporal crawl on frames 330-337 and 650-657: mean |f(t) - median(f(t-1), f(t), f(t+1))| of the luma, the
            part of the frame-to-frame change that is NOT smooth motion; per 8x8 block, so the worst places can be named
"""
import os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
R = os.path.join(ROOT, 'renders', 'look', 'r2')
T = os.path.join(HERE, 'tests')


def img(d, f):
    return np.asarray(Image.open(os.path.join(R, d, f'f_{f:04d}.png')).convert('RGB'), dtype=np.float32) / 255.0


def rms(a, b):
    d = a - b
    return round(float(np.sqrt((d ** 2).mean())), 4), round(float((np.abs(d).max(axis=2) > 0.1).mean()), 4)


def crawl(d, frames):
    L = np.stack([img(d, f).mean(axis=2) for f in frames])
    res = []
    for i in range(1, len(frames) - 1):
        med = np.median(L[i - 1:i + 2], axis=0)
        res.append(np.abs(L[i] - med))
    r = np.mean(res, axis=0)
    h, w = r.shape
    blocks = r[:h // 8 * 8, :w // 8 * 8].reshape(h // 8, 8, w // 8, 8).mean(axis=(1, 3))
    return float(r.mean()), float(np.percentile(blocks, 99)), r


def font(px):
    p = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
    return ImageFont.truetype(p, px) if os.path.exists(p) else ImageFont.load_default()


def main():
    out = {}
    seeds = {}
    for f in (331, 651, 1191, 1285):
        row = {}
        for key, (a, b) in (('before_16spp', ('base_s0', 'base_s1')), ('after_16spp', ('s16_0', 's16_1')), ('after_12spp', ('s12_0', 's12_1'))):
            try:
                row[key] = rms(img(a, f), img(b, f))
            except FileNotFoundError:
                pass
        seeds[f] = row
    out['seed_rms_and_fraction_over_0.1'] = seeds
    mot = {}
    heat = []
    for name, frames in (('330-337', list(range(330, 338))), ('650-657', list(range(650, 658)))):
        try:
            b = crawl('motion_before', frames); a = crawl('motion_after', frames)
        except FileNotFoundError as e:
            print('missing', e); continue
        mot[name] = {'before_mean': round(b[0], 5), 'before_p99_block': round(b[1], 4), 'after_mean': round(a[0], 5), 'after_p99_block': round(a[1], 4)}
        for tag, d, r in (('before', 'motion_before', b[2]), ('after', 'motion_after', a[2])):
            fr = Image.open(os.path.join(R, d, f'f_{frames[3]:04d}.png')).convert('RGB')
            hm = Image.fromarray((np.clip(r * 12, 0, 1) * 255).astype(np.uint8)).convert('RGB')
            heat.append((f'{name} {tag}', fr, hm))
    out['temporal_crawl'] = mot
    json.dump(out, open(os.path.join(T, 'r2_measure.json'), 'w'), indent=1)
    print(json.dumps(out, indent=1))
    if heat:
        W, H = heat[0][1].size
        sh = Image.new('RGB', (len(heat) * (W + 8), 2 * H + 40), (20, 20, 24))
        d = ImageDraw.Draw(sh)
        for i, (lab, fr, hm) in enumerate(heat):
            sh.paste(fr, (i * (W + 8), 32)); sh.paste(hm, (i * (W + 8), 32 + H + 8))
            d.text((i * (W + 8) + 6, 4), lab + '  (below: crawl x12)', font=font(20), fill=(235, 235, 235))
        sh.save(os.path.join(T, 'r2_motion_crawl.png'))


if __name__ == '__main__':
    main()
