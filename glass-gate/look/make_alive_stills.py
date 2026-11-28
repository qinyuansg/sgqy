"""Helper B — stills of the alive moment ('test' preset, one render at a time).

    /opt/blender-env/venv/bin/python look/make_alive_stills.py [--gate hardware/gate.blend] [--studio dark] [--only name,name]

Writes look/tests/alive_<name>.png and the contact sheet look/tests/alive_sheet.png.
"""
import os, sys, subprocess, re, argparse, json

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
SHOTS = [   # name, camera, alive values, caption
    ('0_before', 'entry', 'power=0,house=1', 'built, not alive   power 0 · house 1'),
    ('1_wave', 'entry', 'power=1,wave=0.42,grant=0,screens=0.1,ir=0,house=0.12', 'first wave mid-way   wave 0.42 · house 0.12'),
    ('2_idle', 'entry', 'power=1,wave=1.1,grant=0,screens=1,ir=1,house=0.3', 'alive, idle   wave 1.1 · screens 1 · house 0.3'),
    ('3_grantwave', 'entry', 'power=1,wave=0.42,grant=1,screens=1,ir=1,house=0.3', 'green wave over idle   grant 1 · wave 0.42'),
    ('4_granted', 'entry', 'power=1,wave=1.1,grant=1,screens=1,ir=1,house=0.3', 'access granted   grant 1 · wave 1.1'),
    ('5_reader', 'reader', 'power=1,wave=1.1,grant=0,screens=1,ir=1,house=0.3', 'reader end, idle (LCD, IR dots, LED line)'),
    ('6_hero_wave', 'hero', 'power=1,wave=0.55,grant=0,screens=0.3,ir=0,house=0.12', 'hero, wave 0.55 · house 0.12'),
    ('7_hero_granted', 'hero', 'power=1,wave=1.1,grant=1,screens=1,ir=1,house=0.3', 'hero, granted · house 0.3'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gate', default='hardware/gate.blend')
    ap.add_argument('--studio', default='dark')
    ap.add_argument('--only', default='')
    ap.add_argument('--sheet-only', action='store_true')
    a = ap.parse_args()
    tj = os.path.join(HERE, 'tests', 'alive_times.json')
    times = json.load(open(tj)) if os.path.exists(tj) else {}
    only = set(a.only.split(',')) if a.only else None
    for name, cam, alive, cap in SHOTS:
        if a.sheet_only or (only and name not in only and name.split('_', 1)[1] not in only):
            continue
        out = os.path.join(HERE, 'tests', f'alive_{name}.png')
        r = subprocess.run([PY, os.path.join(HERE, 'render_tests.py'), '--gate', a.gate, '--studio', a.studio, '--cam', cam,
                            '--out', out, '--alive', alive], capture_output=True, text=True)
        m = re.search(r'render ([\d.]+)s cpu ([\d.]+)s', r.stdout)
        if not m:
            print(r.stdout[-1500:], r.stderr[-1500:]); raise SystemExit('render failed ' + name)
        times[name] = float(m.group(2)); json.dump(times, open(tj, 'w'), indent=1)
        print(f'{name:16s} wall {m.group(1)} s  cpu {m.group(2)} s')
    from PIL import Image, ImageDraw, ImageFont
    fp = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
    f = ImageFont.truetype(fp, 18) if os.path.exists(fp) else ImageFont.load_default()
    W, H, pad = 540, 675, 12
    cols = 4
    rows = (len(SHOTS) + cols - 1) // cols
    sh = Image.new('RGB', (pad + cols * (W + pad), pad + rows * (H + 34 + pad)), (22, 22, 26))
    d = ImageDraw.Draw(sh)
    for i, (name, cam, alive, cap) in enumerate(SHOTS):
        p = os.path.join(HERE, 'tests', f'alive_{name}.png')
        x = pad + (i % cols) * (W + pad); y = pad + (i // cols) * (H + 34 + pad)
        if os.path.exists(p):
            sh.paste(Image.open(p).convert('RGB'), (x, y))
        t = times.get(name)
        d.text((x + 2, y + H + 6), cap + (f'   ·   {t:.0f} CPU-s' if t else ''), font=f, fill=(225, 225, 232))
    out = os.path.join(HERE, 'tests', 'alive_sheet.png')
    sh.save(out); print('wrote', out)


if __name__ == '__main__':
    main()
