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
sched = C.schedule(parts, man)          # list of dicts: part, t, dur, dist, dir, twist, turns, sfx, gain, shake, k, bounce
by_part = {}
for s in sched:
    by_part.setdefault(s['part'], s)
missing = [n for n in parts if n not in by_part]
if missing:
    print(f'[warn] {len(missing)} parts have no landing in the schedule:', missing[:20])

# every child must land after its parent
for n, s in by_part.items():
    p = parts[n].obj.parent
    while p is not None:
        if p.name in by_part and by_part[p.name]['t'] > s['t'] - s.get('dur', 0.4) + 1e-6:
            print(f'[warn] {n} flies at {s["t"] - s.get("dur", 0.4):.2f} before its parent {p.name} has landed ({by_part[p.name]["t"]:.2f})')
        p = p.parent

# ---------------------------------------------------------------- hook: exploded hover, then lift away
HOOK_END = C.HOOK_END
rnd = random.Random(3)
for n, part in parts.items():
    E = Vector(C.explode_offset(part, man))
    ph = rnd.uniform(0, math.tau); bob = rnd.uniform(0.004, 0.009)
    spin = C.hook_spin(part)                      # rad/s about world Z for gears etc.
    t_go = C.SCATTER_T0 + C.scatter_delay(part)   # when this part starts to leave
    part.show(0, True)
    f_end = F(HOOK_END)
    for f in range(0, f_end):
        t = f / FPS
        off = E * (1.0 + C.HOOK_BREATHE * math.sin(math.pi * t / HOOK_END)) + Vector((0, 0, bob * math.sin(math.tau * 0.45 * t + ph)))
        if t > t_go:
            u = (t - t_go) / max(1e-3, HOOK_END - t_go)
            off = off + Vector(C.scatter_dir(part)) * (C.SCATTER_DIST * al.ease_in(u, 2.6))
        part.pose(f, off, spin * t, (0, 0, 1))
    part.show(f_end, False)

# ---------------------------------------------------------------- build: fly-ins
events = []
shakes = []
for n, s in by_part.items():
    part = parts[n]
    al.fly_in(part, s['t'], dur=s.get('dur', 0.4), dist=s.get('dist', 0.6), direction=s.get('dir', part.info.get('insert_dir', (0, 0, 1))),
              twist_deg=s.get('twist', 0.0), k=s.get('k', 2.4), bounce=s.get('bounce', 0.004), wobble_deg=s.get('wobble', 0.6),
              turns=s.get('turns', 0.0), seed=hash(n) & 0xffff)
    if s.get('shake'):
        shakes.append((s['t'], s['shake']))

for part in parts.values():
    part.bake(names)
    al.set_linear(part.obj)

# ---------------------------------------------------------------- in use: wings + gear train
wing_angle = man.get('wing_open_angle_deg', {})
gear = man.get('gear', {})
def wing_theta(t):
    return C.wing_open_fraction(t)      # 0 closed .. 1 open (may overshoot slightly)
use_f0, use_f1 = F(C.USE_T0), NF - 1
def key_spin(obj, base_q, axis, ang, f):
    obj.rotation_quaternion = base_q @ Quaternion(axis, ang)
    obj.keyframe_insert('rotation_quaternion', frame=f)
spin_objs = []
for wn, deg in wing_angle.items():
    o = bpy.data.objects.get(wn)
    if o: spin_objs.append((o, math.radians(deg)))
side_sign = {}
for wn, deg in wing_angle.items():
    side_sign[wn[-1]] = math.radians(deg)
ratio = gear.get('ratio', 4.0)
teeth = gear.get('teeth', {'sun': 18, 'planet': 18, 'ring': 54})
for key, mult in (('carrier', 1.0), ('sun', ratio), ('planets', -teeth['ring'] / teeth['planet'])):
    for gn in gear.get(key, []):
        o = bpy.data.objects.get(gn)
        if o: spin_objs.append((o, side_sign.get(gn[-1], math.radians(90)) * mult * C.GEAR_DIR))
for o, full in spin_objs:
    o.rotation_mode = 'QUATERNION'
    base = parts[o.name].rest_rot.copy() if o.name in parts else o.rotation_quaternion.copy()
    for f in range(use_f0, use_f1 + 1):
        key_spin(o, base, (0, 0, 1), full * wing_theta(f / FPS), f)
    al.set_linear(o)

# ---------------------------------------------------------------- extras (card, light pass, sweep lights)
extra_events = C.extras(sc, parts, man) or []

# ---------------------------------------------------------------- camera
cam = bpy.data.objects.get('DIRECTOR_CAM')
if cam is None:
    cd = bpy.data.cameras.new('DIRECTOR_CAM'); cam = bpy.data.objects.new('DIRECTOR_CAM', cd); sc.collection.objects.link(cam)
cam.data.sensor_width = 36.0
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.clip_start = 0.01; cam.data.clip_end = 100
cam.data.dof.aperture_blades = 9
sc.camera = cam
shots = C.shots(parts, man)
baked = al.bake_camera(cam, shots, NF, shakes)
al.set_linear(cam); al.set_linear(cam.data)

# camera sanity: speed/acceleration spikes inside shots (hitches)
cuts = sorted({F(s.t0) for s in shots})
worst = []
for f in range(2, NF):
    if f in cuts or f - 1 in cuts:
        continue
    v1 = (baked[f][0] - baked[f - 1][0]).length; v0 = (baked[f - 1][0] - baked[f - 2][0]).length
    worst.append((abs(v1 - v0), f))
worst.sort(reverse=True)
print('[camera] cuts at frames', cuts)
print('[camera] largest frame-to-frame speed changes (m/frame):', [(round(d, 4), f) for d, f in worst[:6]])

# ---------------------------------------------------------------- alive moment
if not a.no_alive:
    try:
        from look import alive
        C.key_alive(sc, alive)
        print('[alive] keyed')
    except Exception as e:
        print('[warn] alive keys not applied:', repr(e))

# ---------------------------------------------------------------- timeline export (sound follows picture)
def ndc(point, f):
    sc.frame_set(f)
    return al.project(sc, cam, point)

for n, s in by_part.items():
    if not s.get('sfx'):
        continue
    part = parts[n]
    f = F(s['t'])
    x, y, z = ndc(part.rest_world.translation, f)
    on = (-0.15 < x < 1.15) and (-0.15 < y < 1.15) and z > 0
    gain = s.get('gain', 0.8) * (1.0 if on else C.OFFSCREEN_GAIN)
    if gain <= 0.01:
        continue
    pan = max(-0.7, min(0.7, (x - 0.5) * 1.6)) if z > 0 else 0.0
    for i, name in enumerate(s['sfx'] if isinstance(s['sfx'], (list, tuple)) else [s['sfx']]):
        e = dict(t=round(f / FPS, 4), sfx=name, part=n, gain=round(gain, 3), pan=round(pan, 2), var=s.get('var', (hash(n) >> 4) % 12))
        if name in ('glass_slide', 'screw', 'servo') or s.get('sfx_dur'):
            e['dur'] = s.get('sfx_dur', s.get('dur', 0.4))
        events.append(e)
events += extra_events + C.fixed_events()

# merge duplicates that hit on the same frame with the same sound (mirror parts landing together)
merged = {}
for e in events:
    k = (round(e['t'] * FPS), e['sfx'])
    if k in merged:
        m = merged[k]; m['gain'] = round(min(1.0, max(m['gain'], e['gain']) * 1.12), 3); m['pan'] = round((m['pan'] + e['pan']) / 2, 2)
        m['part'] += '+' + e['part']
    else:
        merged[k] = dict(e)
events = sorted(merged.values(), key=lambda e: e['t'])

T = dict(version=C.VERSION, fps=FPS, bpm=120, duration_s=DUR, frames=NF, drop_t=C.DROP_T,
         sections=C.SECTIONS, cuts=[c / FPS for c in cuts],
         shots=[dict(name=s.name, t0=s.t0, t1=s.t1) for s in shots],
         sfx_vocabulary=sorted({e['sfx'] for e in events}), events=events)
json.dump(T, open(a.timeline, 'w'), indent=1)
print(f'[timeline] {len(events)} events -> {a.timeline}')

sc.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out), compress=True)
print('[saved]', a.out)
