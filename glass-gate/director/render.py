"""Final render (director only, ONE at a time). Resumable: frames that already exist are skipped.

  /opt/blender-env/venv/bin/python director/render.py --blend director/scene.blend --out renders/final \
        --start 0 --end 1559 [--preset final] [--samples 16] [--scale 100] [--frames 0,60,120] [--force]
"""
import bpy, sys, os, time, argparse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared'))
import gg_common as gg

ap = argparse.ArgumentParser()
ap.add_argument('--blend', default=gg.path('director', 'scene.blend'))
ap.add_argument('--out', default=gg.path('renders', 'final'))
ap.add_argument('--start', type=int, default=0)
ap.add_argument('--end', type=int, default=1559)
ap.add_argument('--step', type=int, default=1)
ap.add_argument('--frames', default='')
ap.add_argument('--preset', default='final')
ap.add_argument('--samples', type=int, default=0)
ap.add_argument('--scale', type=int, default=0)
ap.add_argument('--threads', type=int, default=0)
ap.add_argument('--seed', type=int, default=-1)
ap.add_argument('--force', action='store_true')
ap.add_argument('--prefix', default='f_')
a = ap.parse_args()

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
sc = bpy.context.scene
keep = {k: getattr(sc.cycles, k) for k in ('max_bounces', 'transmission_bounces', 'glossy_bounces', 'diffuse_bounces',
                                           'transparent_max_bounces', 'caustics_reflective', 'caustics_refractive',
                                           'sample_clamp_indirect', 'sample_clamp_direct')}
gg.setup_cycles(sc, a.preset)
for k, v in keep.items():          # light-path settings travel with the scene file (look-dev decides them)
    setattr(sc.cycles, k, v)
if a.samples: sc.cycles.samples = a.samples
if a.scale: sc.render.resolution_percentage = a.scale
if a.threads: sc.render.threads = a.threads
if a.seed >= 0: sc.cycles.seed = a.seed
try:                                # look helper's cost settings: OIDN balanced + accurate prefilter, light tree off, CPU compositor
    sys.path.insert(0, gg.path('look'))
    import settings as look_settings
    look_settings.recommended(sc); look_settings.final(sc)
except Exception as e:
    print('[warn] look settings not applied:', repr(e))
sc.render.use_persistent_data = True
sc.render.dither_intensity = 1.0
sc.render.image_settings.color_mode = 'RGB'
sc.render.image_settings.compression = 15
os.makedirs(a.out, exist_ok=True)
frames = [int(x) for x in a.frames.split(',')] if a.frames else list(range(a.start, a.end + 1, a.step))
log = open(os.path.join(a.out, 'render_log.csv'), 'a')
t_all = time.time(); done = 0
for f in frames:
    dst = os.path.join(a.out, f'{a.prefix}{f:04d}.png')
    if os.path.exists(dst) and not a.force:
        continue
    tmp = os.path.join(a.out, f'.tmp_{a.prefix}{f:04d}.png')
    sc.frame_set(f)
    sc.render.filepath = tmp
    t = time.time()
    bpy.ops.render.render(write_still=True)
    os.replace(tmp, dst)
    dt = time.time() - t; done += 1
    log.write(f'{f},{dt:.2f},{sc.cycles.samples},{sc.render.resolution_percentage}\n'); log.flush()
    print(f'[frame] {f} {dt:.1f}s  avg {(time.time() - t_all) / done:.1f}s', flush=True)
print(f'[done] {done} frames in {(time.time() - t_all) / 60:.1f} min', flush=True)
