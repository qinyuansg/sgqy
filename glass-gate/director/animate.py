"""Director: assembly animation, cameras, alive-moment keys, timeline export.

  /opt/blender-env/venv/bin/python director/animate.py --gate look/gate_look.blend --out director/scene.blend

Reads hardware/manifest.json and director/choreo.py (the shot list and the landing schedule),
writes director/scene.blend and shared/timeline.json.
"""
import bpy, sys, os, json, math, re, argparse, random, importlib
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'shared')); sys.path.insert(0, os.path.join(HERE, '..'))
import gg_common as gg
import anim_lib as al
from anim_lib import F, FPS

ap = argparse.ArgumentParser()
ap.add_argument('--gate', default=gg.path('look', 'gate_look.blend'))
ap.add_argument('--manifest', default=gg.path('hardware', 'manifest.json'))
ap.add_argument('--out', default=gg.path('director', 'scene.blend'))
ap.add_argument('--choreo', default='choreo')
ap.add_argument('--timeline', default=gg.path('shared', 'timeline.json'))
ap.add_argument('--no-alive', action='store_true')
a = ap.parse_args()

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.gate))
sc = bpy.context.scene
sc.render.fps = FPS
man = json.load(open(a.manifest))
C = importlib.import_module(a.choreo)
DUR = C.DURATION
NF = F(DUR)
sc.frame_start, sc.frame_end = 0, NF - 1
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'

# ---------------------------------------------------------------- parts
parts = {}
for info in man['parts']:
    o = bpy.data.objects.get(info['name'])
    if o is None:
        print('[warn] manifest part missing in blend:', info['name']); continue
    parts[o.name] = al.Part(o, info)
names = set(parts)
print(f'[animate] {len(parts)} animatable parts')

# ---------------------------------------------------------------- schedule
sched = C.schedule(parts, man)
by_part = {}
for s in sched:
    by_part.setdefault(s['part'], s)
missing = [n for n in parts if n not in by_part]
if missing:
    print(f'[warn] {len(missing)} parts have no landing in the schedule:', missing[:20])
for n, s in by_part.items():        # every child must land after its parent
    p = parts[n].obj.parent
    while p is not None:
        if p.name in by_part and by_part[p.name]['t'] > s['t'] - s.get('dur', 0.4) + 1e-6:
            print(f'[warn] {n} flies at {s["t"] - s.get("dur", 0.4):.2f} before its parent {p.name} has landed ({by_part[p.name]["t"]:.2f})')
        p = p.parent

# ---------------------------------------------------------------- camera (first: flights are fitted to the framing)
cam = bpy.data.objects.get('DIRECTOR_CAM')
if cam is None:
    cd = bpy.data.cameras.new('DIRECTOR_CAM'); cam = bpy.data.objects.new('DIRECTOR_CAM', cd); sc.collection.objects.link(cam)
cam.data.sensor_width = 36.0
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.clip_start = 0.01; cam.data.clip_end = 100
cam.data.dof.aperture_blades = 9
sc.camera = cam
shots = C.shots(parts, man)
cuts = sorted({F(s.t0) for s in shots})
shakes = [(s['t'], s['shake'] * C.shake_scale(s['t'])) for s in by_part.values() if s.get('shake')]
baked = al.bake_camera(cam, shots, NF, shakes)
al.set_linear(cam); al.set_linear(cam.data)
worst = []
for f in range(2, NF):
    if f in cuts or f - 1 in cuts:
        continue
    v1 = (baked[f][0] - baked[f - 1][0]).length; v0 = (baked[f - 1][0] - baked[f - 2][0]).length
    worst.append((abs(v1 - v0), f))
worst.sort(reverse=True)
print('[camera] cuts at frames', cuts)
print('[camera] largest frame-to-frame speed changes (m/frame):', [(round(d, 4), f) for d, f in worst[:6]])


def shot_start(f):
    return max(c for c in cuts if c <= f)


def in_frame(part, off, f, margin=0.02):
    """Is any corner of the part's bounding box, displaced by `off`, inside the frame at frame f?"""
    for c in part.obj.bound_box:
        x, y, z = al.cam_project(baked[min(f, NF - 1)], part.rest_world @ Vector(c) + off)
        if z > 0 and -margin < x < 1 + margin and -margin < y < 1 + margin:
            return True
    return False


# ---------------------------------------------------------------- hook: exploded hover, then lift away
HOOK_F = F(C.HOOK_END)
rnd = random.Random(3)
for n, part in parts.items():
    E = Vector(C.explode_offset(part, man))
    ph = rnd.uniform(0, math.tau); bob = rnd.uniform(0.003, 0.007)
    spin = C.hook_spin(part)
    t_go = C.SCATTER_T0 + C.scatter_delay(part)
    part.show(0, True)
    for f in range(0, HOOK_F):
        t = f / FPS
        off = E * (1.0 + C.HOOK_BREATHE * math.sin(0.5 * math.pi * t / C.HOOK_END)) + Vector((0, 0, bob * math.sin(math.tau * 0.45 * t + ph)))
        if t > t_go:
            u = (t - t_go) / max(1e-3, C.HOOK_END - t_go)
            off = off + Vector(C.scatter_dir(part)) * (C.SCATTER_DIST * al.ease_in(u, 2.4))
        part.pose(f, off, spin * t, (0, 0, 1))
    part.show(HOOK_F, False)

# ---------------------------------------------------------------- build: fly-ins fitted to the frame
extended, stuck = [], []
for n, s in by_part.items():
    part = parts[n]
    d = Vector(s.get('dir', part.info.get('insert_dir', (0, 0, 1)))).normalized()
    dist = s.get('dist', 0.6)
    side = Vector(s['side']) if s.get('side') else None
    fl, f0 = F(s['t']), F(s['t'] - s.get('dur', 0.4))
    vis0 = max(f0, shot_start(fl), HOOK_F)
    if vis0 == f0 and s.get('mode') != 'none':
        d0 = dist
        for _ in range(9):
            if not in_frame(part, d * dist + (side or Vector()), f0):
                break
            dist *= 1.3
        else:
            stuck.append(n)
        if dist != d0:
            extended.append((n, round(d0, 2), round(dist, 2)))
    al.fly_in(part, s['t'], dur=s.get('dur', 0.4), dist=dist, direction=d, twist_deg=s.get('twist', 0.0), k=s.get('k', 2.4),
              bounce=s.get('bounce', 0.004), wobble_deg=s.get('wobble', 0.6), turns=s.get('turns', 0.0),
              seed=sum(map(ord, n)), side=side, show_from=vis0, mode='screw' if part.info.get('kind') == 'screw' else 'drop')
if extended:
    print(f'[fit] {len(extended)} flights lengthened to start out of frame:', extended)
if stuck:
    print(f'[warn] {len(stuck)} parts still start inside the frame:', stuck)

for part in parts.values():
    part.bake(names)
    al.set_linear(part.obj)

# ---------------------------------------------------------------- in use: wings + gear train
wing_angle = man.get('wing_open_angle_deg', {})
gear = man.get('gear', {})
side_open = {wn[-1]: math.radians(deg) for wn, deg in wing_angle.items()}
teeth = gear.get('teeth', {'sun': 18, 'planet': 18, 'ring': 54})
spin_objs = []
for wn, deg in wing_angle.items():
    o = bpy.data.objects.get(wn)
    if o: spin_objs.append((o, math.radians(deg)))
for key, mult in (('carrier', 1.0), ('sun', gear.get('ratio', 4.0)), ('planets', gear.get('planet_local_spin_per_carrier', -teeth['ring'] / teeth['planet']))):
    for gn in gear.get(key, []):
        o = bpy.data.objects.get(gn)
        if o: spin_objs.append((o, side_open.get(gn[-1], math.radians(90)) * mult * C.GEAR_DIR))
use_f0 = F(C.USE_T0)
for o, full in spin_objs:
    o.rotation_mode = 'QUATERNION'
    base = parts[o.name].rest_rot.copy() if o.name in parts else o.rotation_quaternion.copy()
    prev = None
    for f in range(use_f0, NF):
        q = base @ Quaternion((0, 0, 1), full * C.wing_open_fraction(f / FPS))
        if prev is not None and q.dot(prev) < 0:
            q = -q
        prev = q
        o.rotation_quaternion = q
        o.keyframe_insert('rotation_quaternion', frame=f)
    al.set_linear(o)

# ---------------------------------------------------------------- extras (card, light pass, sweep lights, studio dimming)
extra_events = C.extras(sc, parts, man, baked) or []

# ---------------------------------------------------------------- alive moment
if not a.no_alive:
    try:
        from look import alive
        C.key_alive(sc, alive)
        print('[alive] keyed')
    except Exception as e:
        import traceback; traceback.print_exc()
        print('[warn] alive keys not applied:', repr(e))

# ---------------------------------------------------------------- timeline export (sound follows picture)
events = []
silent = []
for n, s in by_part.items():
    if not s.get('sfx'):
        continue
    part = parts[n]
    f = F(s['t'])
    x, y, z = al.cam_project(baked[f], part.rest_world @ (sum((Vector(c) for c in part.obj.bound_box), Vector()) / 8))
    on = any(True for c in part.obj.bound_box
             for (px, py, pz) in [al.cam_project(baked[f], part.rest_world @ Vector(c))] if pz > 0 and 0 <= px <= 1 and 0 <= py <= 1)
    gain = s.get('gain', 0.8) * (1.0 if on else C.OFFSCREEN_GAIN)
    if gain <= 0.01:
        silent.append(n); continue
    pan = max(-0.7, min(0.7, (x - 0.5) * 1.6)) if z > 0 else 0.0
    for name in (s['sfx'] if isinstance(s['sfx'], (list, tuple)) else [s['sfx']]):
        e = dict(t=round(f / FPS, 4), sfx=name, part=n, gain=round(gain, 3), pan=round(pan, 2), var=s.get('var', sum(map(ord, n)) % 12))
        if name == 'glass_slide':
            e['dur'] = s.get('sfx_dur', 0.35)
        elif name == 'screw':
            e['dur'] = round(s.get('dur', 0.3) * 0.6, 3)
        events.append(e)
if silent:
    print(f'[sound] {len(silent)} landings are off screen and silent:', silent)
events += extra_events + C.fixed_events()

merged = {}                 # mirror parts landing on the same frame share one (slightly louder) hit
for e in events:
    k = (round(e['t'] * FPS), e['sfx'])
    if k in merged:
        m = merged[k]; m['gain'] = round(min(1.0, max(m['gain'], e['gain']) * 1.1), 3); m['pan'] = round((m['pan'] + e['pan']) / 2, 2)
        m['part'] += '+' + e['part']
    else:
        merged[k] = dict(e)
events = sorted(merged.values(), key=lambda e: e['t'])

T = dict(version=C.VERSION, fps=FPS, bpm=120, duration_s=DUR, frames=NF, drop_t=C.DROP_T,
         sections=C.SECTIONS, cuts=[round(c / FPS, 4) for c in cuts],
         shots=[dict(name=s.name, t0=s.t0, t1=s.t1) for s in shots],
         sfx_vocabulary=sorted({e['sfx'] for e in events}), events=events)
json.dump(T, open(a.timeline, 'w'), indent=1)
print(f'[timeline] {len(events)} events -> {a.timeline}')

sc.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out), compress=True)
print('[saved]', a.out)
