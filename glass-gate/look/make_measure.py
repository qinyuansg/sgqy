"""Helper B — cost and noise measurements (test resolution, one render at a time).

    /opt/blender-env/venv/bin/python look/make_measure.py [--gate hardware/gate.blend] [--only a,b]

Everything at 540x675, 2 threads, 16 spp + OIDN (the final animation's sample count) unless stated.
Writes renders to renders/look/measure/, numbers to look/tests/measure.json, and the seed A/B crops to look/tests/.
"""
import os, sys, subprocess, re, argparse, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PY = sys.executable
OUT = os.path.join(ROOT, 'renders', 'look', 'measure')
ALIVE = 'power=1,wave=1.1,grant=0,screens=1,ir=1,house=0.3'
JOBS = [  # name, args
    ('macro_default_s0', ['--cam', 'macro', '--spp', '16', '--seed', '0']),
    ('macro_default_s1', ['--cam', 'macro', '--spp', '16', '--seed', '1']),
    ('macro_fast', ['--cam', 'macro', '--spp', '16', '--quality', 'fast']),
    ('macro_macro', ['--cam', 'macro', '--spp', '16', '--quality', 'macro']),
    ('hero_default_s0', ['--cam', 'hero', '--spp', '16', '--seed', '0']),
    ('hero_default_s1', ['--cam', 'hero', '--spp', '16', '--seed', '1']),
    ('hero_fast', ['--cam', 'hero', '--spp', '16', '--quality', 'fast']),
    ('hero_mnee', ['--cam', 'hero', '--spp', '16', '--set', "studio.set_caustics(sc,'mnee')"]),
    ('alive_hybrid_s0', ['--cam', 'entry', '--spp', '16', '--seed', '0', '--alive', ALIVE]),
    ('alive_hybrid_s1', ['--cam', 'entry', '--spp', '16', '--seed', '1', '--alive', ALIVE]),
    ('alive_mesh_s0', ['--cam', 'entry', '--spp', '16', '--seed', '0', '--alive', ALIVE, '--led-mode', 'mesh']),
    ('alive_mesh_s1', ['--cam', 'entry', '--spp', '16', '--seed', '1', '--alive', ALIVE, '--led-mode', 'mesh']),
]


def rms(a, b):
    import numpy as np
    from PIL import Image
    A = np.asarray(Image.open(a).convert('RGB'), dtype=np.float32) / 255.0
    B = np.asarray(Image.open(b).convert('RGB'), dtype=np.float32) / 255.0
    d = A - B
    return float(np.sqrt((d ** 2).mean())), float(np.percentile(np.abs(d), 99)), float((np.abs(d).max(axis=2) > 0.1).mean())


def seed_sheet(a, b, out, box):
    from PIL import Image, ImageChops
    A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB')
    D = ImageChops.difference(A, B).point(lambda v: min(255, v * 8))
    w, h = box[2] - box[0], box[3] - box[1]
    s = Image.new('RGB', (w * 3 + 16, h), (20, 20, 24))
    for i, im in enumerate((A, B, D)):
        s.paste(im.crop(box), (i * (w + 8), 0))
    s = s.resize((s.width * 2, s.height * 2), Image.NEAREST)
    s.save(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gate', default='hardware/gate.blend')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    mj = os.path.join(HERE, 'tests', 'measure.json')
    res = json.load(open(mj)) if os.path.exists(mj) else {}
    only = set(a.only.split(',')) if a.only else None
    for name, args in JOBS:
        if only and name not in only:
            continue
        out = os.path.join(OUT, name + '.png')
        r = subprocess.run([PY, os.path.join(HERE, 'render_tests.py'), '--gate', a.gate, '--studio', 'dark', '--out', out, *args],
                           capture_output=True, text=True)
        m = re.search(r'render ([\d.]+)s cpu ([\d.]+)s', r.stdout)
        if not m:
            print(r.stdout[-1500:], r.stderr[-1500:]); raise SystemExit('render failed ' + name)
        la = os.getloadavg()[0]
        res.setdefault('wall_s', {})[name] = float(m.group(1)); res.setdefault('cpu_s', {})[name] = float(m.group(2))
        res.setdefault('load1', {})[name] = round(la, 2)
        print(f'{name:20s} wall {m.group(1)} s   cpu {m.group(2)} s   (load {la:.1f})')
        json.dump(res, open(mj, 'w'), indent=1)
    pairs = {'macro_seeds': ('macro_default_s0', 'macro_default_s1'), 'hero_seeds': ('hero_default_s0', 'hero_default_s1'),
             'alive_hybrid_seeds': ('alive_hybrid_s0', 'alive_hybrid_s1'), 'alive_mesh_seeds': ('alive_mesh_s0', 'alive_mesh_s1'),
             'macro_fast_vs_default': ('macro_default_s0', 'macro_fast'), 'macro_macro_vs_default': ('macro_default_s0', 'macro_macro'),
             'hero_mnee_vs_off': ('hero_default_s0', 'hero_mnee')}
    for k, (x, y) in pairs.items():
        px, py = os.path.join(OUT, x + '.png'), os.path.join(OUT, y + '.png')
        if os.path.exists(px) and os.path.exists(py):
            r_, p99, frac = rms(px, py)
            res.setdefault('diff', {})[k] = {'rms': round(r_, 4), 'p99': round(p99, 4), 'pixels_over_0.1': round(frac, 5)}
    json.dump(res, open(mj, 'w'), indent=1)
    for nm, x, y, box in (('seeds_macro.png', 'macro_default_s0', 'macro_default_s1', (120, 300, 420, 560)),
                          ('seeds_alive.png', 'alive_hybrid_s0', 'alive_hybrid_s1', (60, 240, 480, 560))):
        px, py = os.path.join(OUT, x + '.png'), os.path.join(OUT, y + '.png')
        if os.path.exists(px) and os.path.exists(py):
            seed_sheet(px, py, os.path.join(HERE, 'tests', nm), box)
    print(json.dumps(res.get('diff', {}), indent=1))


if __name__ == '__main__':
    main()
