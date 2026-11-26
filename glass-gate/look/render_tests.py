"""Helper B — look-dev test renders ('test' preset, one at a time).

    /opt/blender-env/venv/bin/python look/render_tests.py --gate proxy --studio dark --cam hero --out renders/look/x.png
        [--alive power=1,wave=1.1,screens=1,ir=1,grant=0,house=1] [--spp 24] [--seed 0] [--quality default]
        [--set key=value ...]   (python expressions run before rendering; `sc`, `st`, `bpy` in scope)

Cameras: 'hero' = 3/4 view of the whole gate, 'macro' = column / gearbox. Both are also used for the A/B sheet.
"""
import bpy, os, sys, argparse, math, json, time
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
for p in (HERE, os.path.join(ROOT, 'shared')):
    if p not in sys.path:
        sys.path.insert(0, p)
import gg_common as gg
import apply_look, alive, studio, settings, materials


def look_at(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat('-Z', 'Y').to_euler()


def gear_target(scene):
    """Centre of the R gearbox: from the manifest if the real gate is loaded, else the proxy position."""
    for name in ('DRV_sun_R', 'DRV_ring_R'):
        ob = scene.objects.get(name)
        if ob is not None:
            bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
            return sum(bb, Vector()) / 8
    mf = os.path.join(ROOT, 'hardware', 'manifest.json')
    if os.path.exists(mf):
        try:
            g = json.load(open(mf)).get('gear', {})
            for n in g.get('sun', []):
                ob = scene.objects.get(n)
                if ob is not None and ob.matrix_world.translation.x > 0:
                    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
                    return sum(bb, Vector()) / 8
        except Exception as e:
            print('manifest:', e)
    return Vector((0.38, 0.0, 0.26))


def make_cameras(scene):
    cams = {}
    def cam(name, loc, target, lens):
        cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_width = 36; cd.clip_start = 0.02; cd.clip_end = 200
        ob = bpy.data.objects.new(name, cd); scene.collection.objects.link(ob)
        ob.location = loc; look_at(ob, target)
        cams[name.replace('CAM_', '').lower()] = ob
    cam('CAM_HERO', (1.80, -2.42, 1.12), (0.0, 0.0, 0.50), 50)
    g = gear_target(scene)
    cam('CAM_MACRO', (g.x + 0.66, g.y - 0.44, g.z + 0.24), (g.x, g.y, g.z + 0.01), 85)
    cam('CAM_READER', (0.38 - 0.42, -1.22, 1.42), (0.38, -0.40, 0.99), 70)
    cam('CAM_LOW', (-1.9, -2.3, 0.22), (0.0, 0.0, 0.50), 40)
    cam('CAM_BACK', (-2.3, 2.6, 0.9), (0.0, 0.0, 0.50), 50)
    cam('CAM_FLOOR', (-1.3, -3.1, 2.7), (-0.25, -0.45, 0.0), 35)
    return cams


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gate', default='proxy')
    ap.add_argument('--studio', default='dark')
    ap.add_argument('--cam', default='hero')
    ap.add_argument('--out', required=True)
    ap.add_argument('--alive', default='')
    ap.add_argument('--spp', type=int, default=None)
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--quality', default='default')
    ap.add_argument('--led-mode', default=None)
    ap.add_argument('--preset', default='test')
    ap.add_argument('--set', action='append', default=[])
    ap.add_argument('--no-aim', action='store_true', help='do not turn the light rig toward the camera')
    ap.add_argument('--save', default=None, help='also save the scene as this .blend')
    a = ap.parse_args()
    t0 = time.time()
    if a.gate.endswith('gate_look.blend'):
        bpy.ops.wm.open_mainfile(filepath=a.gate if os.path.isabs(a.gate) else os.path.join(ROOT, a.gate))
        sc = bpy.context.scene
        st = studio.get_studio(sc)
    else:
        sc = apply_look.open_gate(a.gate)
        gg.setup_cycles(sc, a.preset)
        info = apply_look.apply(sc, a.studio, a.quality, a.led_mode)
        st = info['studio']
    gg.setup_cycles(sc, a.preset)
    settings.recommended(sc, a.quality)
    cams = make_cameras(sc)
    sc.camera = cams[a.cam]
    if st and st.get('rig') is not None and not a.no_aim:
        studio.aim_rig(st['rig'], sc.camera)
    if a.spp:
        sc.cycles.samples = a.spp
    sc.cycles.seed = a.seed
    if a.alive:
        alive.set_alive(sc, **{k: float(v) for k, v in (kv.split('=') for kv in a.alive.split(','))})
    for expr in a.set:
        exec(expr, {'bpy': bpy, 'sc': sc, 'st': st, 'math': math, 'alive': alive, 'studio': studio, 'materials': materials, 'Vector': Vector})
    out = a.out if os.path.isabs(a.out) else os.path.join(ROOT, a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=a.save if os.path.isabs(a.save) else os.path.join(ROOT, a.save))
    t1 = time.time()
    dt = gg.render_still(sc, out)
    print(f'[test] setup {t1 - t0:.1f}s render {dt:.1f}s  spp {sc.cycles.samples} threads {sc.render.threads} '
          f'{sc.render.resolution_x * sc.render.resolution_percentage // 100}x{sc.render.resolution_y * sc.render.resolution_percentage // 100} -> {out}')


if __name__ == '__main__':
    main()
