"""Helper B — the background A/B: every studio variant from the same two cameras, 'test' preset.

    /opt/blender-env/venv/bin/python look/make_ab.py [--gate hardware/gate.blend] [--only dark,violet] [--sheet-only]

Writes look/tests/ab_<variant>_<cam>.png and the side-by-side sheet look/tests/ab_backgrounds.png
(render times are printed on the sheet and saved in look/tests/ab_times.json). One render at a time.
"""
import os, sys, subprocess, json, re, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PY = sys.executable
VARIANTS = ('dark', 'violet', 'highkey', 'hdri')
CAMS = ('hero', 'macro')
TITLE = {'dark': 'A  dark studio', 'violet': 'B  blue-violet cyc', 'highkey': 'C  high-key cyc', 'hdri': 'D  HDRI studio'}


def render(gate, variant, cam, out, extra=()):
    cmd = [PY, os.path.join(HERE, 'render_tests.py'), '--gate', gate, '--studio', variant, '--cam', cam, '--out', out, *extra]
    r = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r'\[test\] setup ([\d.]+)s render ([\d.]+)s', r.stdout)
    if not m:
        print(r.stdout[-2000:], r.stderr[-2000:])
        raise SystemExit(f'render failed: {variant} {cam}')
    print(f'{variant:8s} {cam:6s} {m.group(2)} s')
    return float(m.group(2))


def sheet(times, gate_label):
    from PIL import Image, ImageDraw, ImageFont
    def font(px, bold=False):
        for p in (('/usr/share/fonts/opentype/inter/Inter-Bold.otf' if bold else '/usr/share/fonts/opentype/inter/Inter-Medium.otf'),
                  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
            if os.path.exists(p):
                return ImageFont.truetype(p, px)
        return ImageFont.load_default()
    W, H, pad, head = 540, 675, 14, 64
    sh = Image.new('RGB', (pad + len(VARIANTS) * (W + pad), head + len(CAMS) * (H + pad) + 40), (22, 22, 26))
    d = ImageDraw.Draw(sh)
    for i, v in enumerate(VARIANTS):
        x = pad + i * (W + pad)
        d.text((x, 12), TITLE[v], font=font(30, True), fill=(240, 240, 245))
        for j, c in enumerate(CAMS):
            p = os.path.join(HERE, 'tests', f'ab_{v}_{c}.png')
            y = head + j * (H + pad)
            if os.path.exists(p):
                sh.paste(Image.open(p).convert('RGB'), (x, y))
            t = times.get(f'{v}_{c}')
            label = f'{c}  ·  {t:.0f} s' if t else c
            d.rectangle([x, y + H - 34, x + 190, y + H], fill=(0, 0, 0))
            d.text((x + 8, y + H - 29), label, font=font(20), fill=(235, 235, 235))
    d.text((pad, sh.height - 34), f'{gate_label}  ·  test preset 540x675, 24 spp + OIDN, 2 threads  ·  same two cameras, light rig aimed per camera  ·  times = Cycles render time on the shared 4-core box',
           font=font(18), fill=(170, 170, 180))
    out = os.path.join(HERE, 'tests', 'ab_backgrounds.png')
    sh.save(out)
    print('wrote', out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gate', default='hardware/gate.blend')
    ap.add_argument('--only', default='')
    ap.add_argument('--sheet-only', action='store_true')
    a = ap.parse_args()
    os.makedirs(os.path.join(HERE, 'tests'), exist_ok=True)
    tj = os.path.join(HERE, 'tests', 'ab_times.json')
    times = json.load(open(tj)) if os.path.exists(tj) else {}
    if not a.sheet_only:
        for v in (a.only.split(',') if a.only else VARIANTS):
            for c in CAMS:
                times[f'{v}_{c}'] = render(a.gate, v, c, os.path.join(HERE, 'tests', f'ab_{v}_{c}.png'))
                json.dump(times, open(tj, 'w'), indent=1)
    sheet(times, 'real gate (hardware/gate.blend)' if a.gate != 'proxy' else 'PROXY gate')


if __name__ == '__main__':
    main()
