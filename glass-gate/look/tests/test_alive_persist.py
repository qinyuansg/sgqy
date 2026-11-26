"""Proof that the alive system survives save -> re-open from another script.

    /opt/blender-env/venv/bin/python look/tests/test_alive_persist.py [--gate hardware/gate.blend]

1. builds the look, keys a first wave (frames 100..190) and a green wave (300..360) with look/alive.py, saves a .blend
2. a SECOND python process opens that .blend with plain bpy (no look/ imports), steps through frames and prints the
   scene properties, two glow-light energies/colours (drivers) and the mean colour of a tiny render (shaders).
"""
import os, sys, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
LOOK = os.path.dirname(HERE)
ROOT = os.path.dirname(LOOK)
TMP = os.path.join(ROOT, 'renders', 'look', 'tmp')
BLEND = os.path.join(TMP, 'alive_persist.blend')

STAGE2 = r'''
import bpy, sys, json
import numpy as np
bpy.ops.wm.open_mainfile(filepath=sys.argv[-1])
sc = bpy.context.scene
sc.render.resolution_percentage = 12; sc.cycles.samples = 6; sc.render.threads = 2
glow = sorted([o for o in bpy.data.objects if o.name.startswith('GG_GLOW_')], key=lambda o: o['gg_wave_u'])
probe = [glow[1], glow[len(glow) // 2], glow[-2]]
rows = []
for f in (90, 110, 145, 200, 299, 300, 330, 370):
    sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    sc.render.filepath = sys.argv[-1].replace('.blend', f'_{f:04d}.png')
    bpy.ops.render.render(write_still=True)
    px = np.array(bpy.data.images.load(sc.render.filepath).pixels[:]).reshape(-1, 4)[:, :3].mean(0)
    rows.append(dict(frame=f, power=round(sc['gg_power'], 3), wave=round(sc['gg_wave'], 3), grant=round(sc['gg_grant'], 3),
                     screens=round(sc['gg_screens'], 3),
                     glow=[(round(o['gg_wave_u'], 2), round(o.evaluated_get(dg).data.energy, 1), [round(c, 2) for c in o.evaluated_get(dg).data.color]) for o in probe],
                     mean_rgb=[round(float(v), 4) for v in px]))
for r in rows:
    print('PERSIST', json.dumps(r))
'''


def main():
    gate = sys.argv[sys.argv.index('--gate') + 1] if '--gate' in sys.argv else 'hardware/gate.blend'
    for p in (LOOK, os.path.join(ROOT, 'shared')):
        sys.path.insert(0, p)
    import bpy
    import gg_common as gg, apply_look, alive, studio
    sc = apply_look.open_gate(gate)
    gg.setup_cycles(sc, 'test')
    apply_look.apply(sc, 'dark')
    alive.key_first_wave(sc, 100, 190)
    alive.key_grant_wave(sc, 300, 360)
    alive.key_alive(sc, 99, house=1.0); alive.key_alive(sc, 104, house=0.12)
    # a camera so stage 2 can render
    import render_tests
    cams = render_tests.make_cameras(sc); sc.camera = cams['hero']
    os.makedirs(TMP, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print('saved', BLEND)
    s2 = os.path.join(TMP, 'alive_persist_stage2.py')
    open(s2, 'w').write(STAGE2)
    r = subprocess.run([sys.executable, s2, BLEND], capture_output=True, text=True)
    lines = [l for l in r.stdout.splitlines() if l.startswith('PERSIST')]
    print('\n'.join(lines) if lines else r.stdout[-3000:] + r.stderr[-3000:])
    open(os.path.join(HERE, 'alive_persist_result.txt'), 'w').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
