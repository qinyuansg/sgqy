"""Helper B — render frames of the DIRECTOR's animated scene with the current look (look-dev and profiling).

    /opt/blender-env/venv/bin/python look/director_frames.py --frames 330,331,332 --out renders/look/r2/base --asis
    /opt/blender-env/venv/bin/python look/director_frames.py --frames 330,331,332 --out renders/look/r2/new [--preset final]

Opens director/scene.blend (never saves it). Without --asis the current look is re-applied in memory exactly as the
pipeline will do it (apply_look.apply + studio.aim_for_director + settings.final), so the director's animation, camera
and alive keys are tested against the newest materials / studio / lights. Renders like director/render.py
(persistent data) and prints wall and CPU seconds per frame; the first frame of a run carries the scene sync.
    --set "python"    run before rendering (sc, bpy, studio, alive, settings, materials in scope), repeatable
"""
import bpy, os, sys, argparse, time, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
for p in (HERE, os.path.join(ROOT, 'shared')):
    if p not in sys.path:
        sys.path.insert(0, p)
import gg_common as gg

ap = argparse.ArgumentParser()
ap.add_argument('--blend', default=os.path.join(ROOT, 'director', 'scene.blend'))
ap.add_argument('--frames', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--preset', default='test')
ap.add_argument('--samples', type=int, default=16)
ap.add_argument('--scale', type=int, default=0)
ap.add_argument('--threads', type=int, default=0)
ap.add_argument('--asis', action='store_true', help='render the scene file as it is (the "before")')
ap.add_argument('--no-final', action='store_true', help='re-apply the look but skip settings.final()')
ap.add_argument('--set', action='append', default=[])
ap.add_argument('--tag', default='')
a = ap.parse_args()

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
sc = bpy.context.scene
keep = {k: getattr(sc.cycles, k) for k in ('max_bounces', 'transmission_bounces', 'glossy_bounces', 'diffuse_bounces',
                                           'transparent_max_bounces', 'caustics_reflective', 'caustics_refractive',
                                           'sample_clamp_indirect', 'sample_clamp_direct')}
gg.setup_cycles(sc, a.preset)
for k, v in keep.items():
    setattr(sc.cycles, k, v)
import apply_look, alive, studio, settings, materials
if not a.asis:
    apply_look.apply(sc, 'dark')
    studio.aim_for_director(sc)
    gg.setup_cycles(sc, a.preset)
    settings.recommended(sc)
    if not a.no_final:
        settings.final(sc)
if a.samples: sc.cycles.samples = a.samples
if a.scale: sc.render.resolution_percentage = a.scale
if a.threads: sc.render.threads = a.threads
sc.render.use_persistent_data = True
sc.render.image_settings.color_mode = 'RGB'
sc.render.image_settings.compression = 15
for expr in a.set:
    exec(expr, {'bpy': bpy, 'sc': sc, 'studio': studio, 'alive': alive, 'settings': settings, 'materials': materials})
out = a.out if os.path.isabs(a.out) else os.path.join(ROOT, a.out)
os.makedirs(out, exist_ok=True)
res = []
for f in [int(x) for x in a.frames.split(',')]:
    sc.frame_set(f)
    sc.render.filepath = os.path.join(out, f'f_{f:04d}.png')
    t, c = time.time(), time.process_time()
    bpy.ops.render.render(write_still=True)
    dt, dc = time.time() - t, time.process_time() - c
    res.append((f, round(dt, 2), round(dc, 2)))
    print(f'[dframe] {a.tag} {f} wall {dt:.1f}s cpu {dc:.1f}s  load {os.getloadavg()[0]:.1f}', flush=True)
print('[dsummary]', json.dumps({'tag': a.tag, 'preset': a.preset, 'spp': sc.cycles.samples, 'threads': sc.render.threads,
                                'res': [sc.render.resolution_x * sc.render.resolution_percentage // 100, sc.render.resolution_y * sc.render.resolution_percentage // 100],
                                'frames': res}), flush=True)
