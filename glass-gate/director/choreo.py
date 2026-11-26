"""CLEAR PASSAGE — the director's shot list, landing schedule and alive-moment keys.

Everything sits on a 120 BPM grid at 60 fps: 1 beat = 0.5 s = 30 frames, 1 bar = 2 s, 16th = 0.125 s.
    bar 1      0-2 s    HOOK     exploded gate hovering, light streak, parts lift away
    bars 2-8   2-16 s   BUILD    six waves, getting faster
    bar 9      16.0 s   DROP     light wave through the whole gate (alive moment)
    bars 11-12 20-24 s  IN USE   card tap, beep, green, wings open, light passes, wings close
    bar 13     24-26 s  HERO     slow orbit, clean end
"""
import math, os, re
from mathutils import Vector
import anim_lib as al
from anim_lib import Shot, smooth, smoother, ease_in, ease_out, clamp01

VERSION = 10
DURATION = 26.0
HOOK_END = 1.8          # the hook runs into the first slam: parts are still leaving as the camera reaches the floor
SCATTER_T0 = 1.34
SCATTER_DIST = 3.4
HOOK_BREATHE = 0.04
DROP_T = 16.0
USE_T0 = 20.0
OFFSCREEN_GAIN = 0.0        # a landing nobody can see makes no sound
GEAR_DIR = 1.0

# in-use beats
T_CARD_IN, T_TAP, T_BEEP, T_GREEN = 20.0, 20.25, 20.36, 20.5
T_OPEN0, T_OPEN1 = 21.0, 21.9
T_PASS0, T_PASS1 = 22.0, 22.8
T_CLOSE0, T_CLOSE1 = 22.9, 23.5
T_HERO = 24.0

SECTIONS = [
    dict(name='hook', t0=0, t1=2, busy=0.3), dict(name='w1_base', t0=2, t1=4, busy=0.6),
    dict(name='w2_drive', t0=4, t1=8, busy=0.8), dict(name='w3_electronics', t0=8, t1=10, busy=0.9),
    dict(name='w4_glass_body', t0=10, t1=12, busy=0.9), dict(name='w5_top_rail', t0=12, t1=14, busy=1.0),
    dict(name='w6_wings', t0=14, t1=16, busy=0.8), dict(name='drop_alive', t0=16, t1=20, busy=0.2),
    dict(name='in_use', t0=20, t1=24, busy=0.5), dict(name='hero_orbit', t0=24, t1=26, busy=0.0)]

XL = -0.38       # left pedestal centre plane; the camera lives on the left/front side
LEAD = 0.2       # every cut leads the downbeat by 0.2 s so the first landing of a wave is seen arriving
CUT = dict(base=HOOK_END, gears=4 - LEAD, stack=6.3, pcb=8 - LEAD, psu=9 - LEAD, glass=10 - LEAD, rail=12 - LEAD, wings=14 - LEAD,
           badge=15.0, wave=16.0, alive=18.0, card=20.0, drive=20.9, lane=21.95, hero=24.0)


def nid(name):
    return sum(map(ord, name))


# ---------------------------------------------------------------- landing defaults by kind
KIND = {
    'metal_heavy': dict(dur=0.45, dist=0.85, sfx='thunk_metal', gain=1.0, bounce=0.005, wobble=0.35, shake=0.0022),
    'metal_small': dict(dur=0.32, dist=0.40, sfx='clack', gain=0.7, bounce=0.003, wobble=0.8),
    'glass':       dict(dur=0.50, dist=1.10, sfx='glass_clink', gain=0.9, bounce=0.003, wobble=0.25, shake=0.0012),
    'pcb':         dict(dur=0.34, dist=0.45, sfx='click', gain=0.75, bounce=0.002, wobble=0.6),
    'screw':       dict(dur=0.30, dist=0.45, sfx='screw', gain=0.55, bounce=0.0, wobble=0.0, turns=0.6),
    'gear':        dict(dur=0.30, dist=0.30, sfx='gear_tick', gain=0.7, bounce=0.003, wobble=0.9, twist=55.0),
    'spring':      dict(dur=0.30, dist=0.35, sfx='spring', gain=0.6, bounce=0.006, wobble=1.2),
    'cable':       dict(dur=0.30, dist=0.30, sfx='click', gain=0.4, bounce=0.002, wobble=0.5),
    'plastic':     dict(dur=0.30, dist=0.35, sfx='snap', gain=0.65, bounce=0.003, wobble=0.8),
    'wing':        dict(dur=0.55, dist=1.00, sfx=('glass_clink', 'lock_clunk'), gain=0.9, bounce=0.002, wobble=0.2, shake=0.0012),
    'led':         dict(dur=0.34, dist=0.30, sfx='snap', gain=0.6, bounce=0.002, wobble=0.4),
}
WAVE_WINDOW = {1: (2.0, 4.0), 2: (4.0, 8.0), 3: (8.0, 10.0), 4: (10.0, 12.0), 5: (12.0, 14.0), 6: (14.0, 15.5)}


def lane(side):
    """Unit vector from a pedestal toward the lane centre."""
    return (1.0, 0.0, 0.0) if side == 'L' else (-1.0, 0.0, 0.0)


def front(side, lane_w=0.1, up=0.1):
    """From the entry side (toward the camera), leaning a little toward the lane: never crosses the other pedestal."""
    return (lane(side)[0] * lane_w, -1.0, up)


def outside(side, up=0.12):
    """From outside the pedestal, away from the lane."""
    return (-lane(side)[0], 0.0, up)


def R(base, tL, tR=None, **o):
    """A rule for both sides. tR None = together with L; a float = that time; 'off' = L time + offset given in o['r_off']."""
    return (base, tL, tL if tR is None else tR, o)


# name (without _L/_R; a trailing index is matched by '#'), time L, time R, overrides
RULES = [
    # ---- wave 1: base (bar 2) ---------------------------------------------------------------------
    R('BASE_rail', 2.0, 2.5, dur=0.42, dist=0.9),
    R('BASE_foot_#', lambda i: 2.0, lambda i: 2.5, dur=0.42, dist=0.9, sfx=None, bounce=0.005, wobble=0.0, mode='none'),
    R('BASE_anchor_#', lambda i: 3.0 + 0.125 * i),
    # the base-channel cables go in before the drive unit sits on top of them
    R('ELE_cable_0', 3.5, dur=0.28, dist=0.4, gain=0.55, group='harness', wobble=0.0),
    R('ELE_cable_1', 3.5, dur=0.28, dist=0.4, sfx=None, group='harness', wobble=0.0),
    R('ELE_cable_2', 3.5, dur=0.28, dist=0.4, sfx=None, group='harness', wobble=0.0),
    # ---- wave 2: drive unit, the macro hero (bars 3-4) --------------------------------------------
    R('DRV_motor', 4.0, dur=0.42, dist=0.75),
    R('DRV_brake', 4.5, dur=0.32, dist=0.4, twist=40.0),
    R('DRV_ring', 5.0, dur=0.34, dist=0.4, sfx='thunk_metal', gain=0.8, twist=25.0, var=1),
    R('DRV_planet_#', lambda i: 5.25 + 0.25 * i, dur=0.28, dist=0.3, twist=60.0),
    R('DRV_sun', 6.0, dur=0.28, dist=0.3, twist=-60.0, gain=0.8, var=5),
    R('DRV_carrier', 6.125, dur=0.26, dist=0.32, sfx='clack', twist=40.0),
    # spring and encoder disc sit on the shaft: the three arrive as one piece
    R('DRV_shaft', 6.5, dur=0.40, dist=0.95, sfx='click', gain=0.8, twist=90.0, wobble=0.0, bounce=0.003, group='shaft'),
    R('DRV_encdisc', 6.5, dur=0.40, dist=0.95, sfx=None, twist=90.0, wobble=0.0, bounce=0.003, group='shaft'),
    R('DRV_spring', 6.5, dur=0.40, dist=0.95, twist=90.0, wobble=0.0, bounce=0.003, group='shaft', gain=0.5),
    R('DRV_encoder', 6.75, dur=0.24, dist=0.3, dirfn=lambda s: (lane(s)[0] * 0.5, -0.5, 0.7), gain=0.6),
    R('DRV_cage', 7.0, dur=0.28, dist=0.6, twist=40.0),
    R('GLS_column', 7.25, dur=0.46, dist=0.75, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.4, k=1.9),
    R('WING_hub', 7.375, dur=0.28, dist=0.6, twist=60.0),
    R('WING_sleeve', 7.5, dur=0.44, dist=0.85, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.38, k=1.9),
    # ---- wave 3: electronics (bar 5) --------------------------------------------------------------
    R('ELE_pcb', 8.0, 8.25, dur=0.36, dist=0.65),
    R('ELE_sensor_entry', 8.5, 8.5, dur=0.28, dist=0.3, dirfn=lane, sfx='snap'),
    R('LED_accent_entry', 8.625, 8.625, dur=0.26, dist=0.25, dirfn=lane),
    R('ELE_cable_3', 8.625, 8.625, dur=0.26, dist=0.3, sfx=None),
    R('ELE_psu', 9.0, 9.125, dur=0.38, dist=0.7),
    R('ELE_sensor_exit', 9.25, 9.375, dur=0.28, dist=0.3, dirfn=lane, sfx='snap'),
    R('LED_accent_exit', 9.5, 9.5, dur=0.26, dist=0.25, dirfn=lane),
    # ---- wave 4: glass body (bar 6) ---------------------------------------------------------------
    R('GLS_post_entry', 10.0, 10.25, dur=0.5, dist=1.7, gain=1.0),
    R('GLS_post_exit', 10.5, 10.75, dur=0.5, dist=1.7, gain=0.9),
    R('GLS_clips_entry', 10.875, 10.875, dur=0.2, dist=0.4, dirfn=outside),
    R('GLS_clips_exit', 10.875, 10.875, dur=0.2, dist=0.4, dirfn=outside),
    R('GLS_panel_entry', 11.125, 11.25, dur=0.42, dist=1.6, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.3, k=1.9),
    R('GLS_panel_exit', 11.375, 11.5, dur=0.42, dist=1.6, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.3, k=1.9),
    # ---- wave 5: top rail (bar 7) -----------------------------------------------------------------
    R('LED_colring', 12.0, 12.125, dur=0.36, dist=0.6, sfx=None, group='spine', wobble=0.35, bounce=0.005),
    R('RAIL_spine', 12.0, 12.125, dur=0.36, dist=0.6, group='spine'),
    R('RAIL_led', 12.25, 12.25, dur=0.26, dist=0.3),
    R('RAIL_harness', 12.375, dur=0.24, dist=0.3, sfx='click', gain=0.45),
    R('RAIL_rfid', 12.5, dur=0.24, dist=0.3, sfx='tap'),
    R('RAIL_qr', 12.625, dur=0.24, dist=0.3),
    R('RAIL_lcd', 12.75, dur=0.26, dist=0.32, sfx='clack'),
    R('RAIL_speaker', 12.875, dur=0.22, dist=0.28, sfx='click'),
    R('RAIL_lid', 13.0, 13.125, dur=0.42, dist=0.7, gain=1.0),
    R('RAIL_campod', 13.25, 13.375, dur=0.26, dist=0.3, sfx='click'),
    R('RAIL_screw_#', lambda i: 13.375 + 0.125 * (i // 2)),
    # ---- wave 6: wings (bar 8) --------------------------------------------------------------------
    R('WING_clamp_a', 14.0, dur=0.24, dist=0.4, dirfn=front),
    R('WING_clamp_b', 14.125, dur=0.24, dist=0.4, dirfn=front),
    R('WING_edgeled', 14.25, dur=0.22, dist=0.4, dirfn=front),
    R('WING_leaf', 14.5, 14.75, dur=0.5, dist=1.3, dir=(0, 0, 1), sidefn=lambda s: tuple(0.004 * c for c in lane(s))),
    R('RAIL_badge', 15.25, dur=0.3, dist=0.3, dirfn=lane, sfx='tap', gain=0.85, wobble=0.0, bounce=0.0015),
]


def shake_scale(t):
    """Impact shake is tuned for mid shots; macro shots get less so the frame does not jump."""
    return 0.5 if (CUT['gears'] <= t < CUT['stack'] or CUT['rail'] <= t < CUT['wings']) else 1.0


def natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', s)]


def schedule(parts, man):
    out, used = [], set()
    for base, tL, tR, opts in RULES:
        for side, t in (('L', tL), ('R', tR)):
            if '#' in base:
                rx = re.compile(re.escape(base).replace('\\#', r'(\d+)').replace('#', r'(\d+)') + '_' + side)
            else:
                rx = re.compile(re.escape(base) + '_' + side)
            ms = sorted([n for n in parts if rx.fullmatch(n) and n not in used], key=natural)
            if not ms:
                print('[choreo] rule matched nothing:', base, side)
            for i, n in enumerate(ms):
                o = dict(KIND.get(parts[n].info.get('kind', 'metal_small'), KIND['metal_small']))
                o.update(opts)
                if 'dirfn' in o:
                    o['dir'] = o.pop('dirfn')(side)
                if 'sidefn' in o:
                    o['side'] = o.pop('sidefn')(side)
                o['part'] = n
                o['t'] = t(i) if callable(t) else t
                out.append(o); used.add(n)
    rest = {}
    for n, p in parts.items():
        if n not in used:
            rest.setdefault(p.info.get('wave', 3), []).append(p)
    for w, ps in rest.items():
        t0, t1 = WAVE_WINDOW.get(w, (8.0, 10.0))
        ps.sort(key=lambda p: (p.info.get('order', 0), natural(p.name)))
        orders = sorted({p.info.get('order', 0) for p in ps})
        for p in ps:
            i = orders.index(p.info.get('order', 0))
            t = round((t0 + (t1 - t0) * (i + 0.5) / max(1, len(orders))) / 0.125) * 0.125
            o = dict(KIND.get(p.info.get('kind', 'metal_small'), KIND['metal_small']))
            o.update(part=p.name, t=t)
            out.append(o)
        print(f'[choreo] wave {w}: {len(ps)} parts on the FALLBACK schedule:', [p.name for p in ps])
    return out


# ---------------------------------------------------------------- hook (exploded hover)
LIFT = {1: 0.0, 2: 0.06, 3: 0.12, 4: 0.50, 5: 0.74, 6: 0.06}
EXPLODE = {   # per-part offsets (x toward the lane centre, y, z) that replace the wave formula
    'BASE_rail': (0, 0, 0.0), 'BASE_foot': (0, 0, 0.0), 'BASE_anchor': (0, 0, 0.07),
    'ELE_cable_0': (0, 0, 0.05), 'ELE_cable_1': (0, 0, 0.05), 'ELE_cable_2': (0, 0, 0.05), 'ELE_cable_3': (0, 0, 0.14),
    'DRV_motor': (0, 0, 0.09), 'DRV_brake': (0, 0, 0.19), 'DRV_ring': (0, 0, 0.27), 'DRV_planet': (0, 0, 0.36), 'DRV_sun': (0, 0, 0.41),
    'DRV_carrier': (0, 0, 0.47), 'DRV_spring': (0, 0, 0.74), 'DRV_encdisc': (0, 0, 0.74), 'DRV_encoder': (0.07, 0, 0.60), 'DRV_cage': (0, 0, 0.56),
    'DRV_shaft': (0, 0, 0.74), 'GLS_column': (0, 0, 0.60), 'WING_hub': (0, 0, 0.74), 'WING_sleeve': (0, 0, 0.74),
    'ELE_pcb': (0, 0, 0.14), 'ELE_psu': (0, 0, 0.14), 'ELE_sensor': (0.10, 0, 0.10), 'LED_accent': (0.10, 0, 0.16),
    'GLS_post': (0, 0, 0.60), 'GLS_clips': (0, 0, 0.10), 'GLS_panel': (-0.20, 0, 0.42),
    'LED_colring': (0, 0, 1.06), 'RAIL_spine': (0, 0, 0.84), 'RAIL_led': (0, 0, 0.78), 'RAIL_harness': (0, 0, 0.90),
    'RAIL_rfid': (0, 0, 0.96), 'RAIL_qr': (0, 0, 1.00), 'RAIL_lcd': (0, 0, 0.96), 'RAIL_speaker': (0, 0, 1.00),
    'RAIL_lid': (0, 0, 1.16), 'RAIL_campod': (0, 0, 1.25), 'RAIL_screw': (0, 0, 1.30), 'RAIL_badge': (0.10, 0, 1.16),
    'WING_clamp': (0, -0.26, 0.10), 'WING_edgeled': (0, -0.34, 0.10), 'WING_leaf': (0, -0.46, 0.10),
}


def explode_offset(part, man):
    i = part.info
    w, o = i.get('wave', 3), i.get('order', 0)
    side = -1.0 if i.get('side') == 'L' else 1.0 if i.get('side') == 'R' else 0.0
    c = part.center
    for k in sorted(EXPLODE, key=len, reverse=True):
        if part.name.startswith(k):
            v = EXPLODE[k]
            spread = 0.0 if k.startswith(('BASE_', 'ELE_cable_0', 'ELE_cable_1', 'ELE_cable_2')) else 0.10
            return (-side * v[0], v[1] + c.y * spread, v[2])
    return (0.0, c.y * 0.10, LIFT.get(w, 0.3) + 0.02 * o)


HOVER_GROUPS = ('ELE_cable_0', 'ELE_cable_1', 'ELE_cable_2'), ('DRV_shaft', 'DRV_encdisc', 'DRV_spring', 'WING_hub', 'WING_sleeve'), ('WING_clamp', 'WING_edgeled', 'WING_leaf')


def hover_key(part):
    """Parts that share a key bob together (they touch or nest); None = sits on the floor, no bob."""
    if part.name.startswith('BASE_rail') or part.name.startswith('BASE_foot'):
        return None
    side = part.info.get('side', 'C')
    for i, g in enumerate(HOVER_GROUPS):
        if any(part.name.startswith(k) for k in g):
            return f'g{i}{side}'
    return part.name


def hook_spin(part):
    return {'gear': 1.5}.get(part.info.get('kind'), 0.0) * (1 if nid(part.name) & 1 else -1)


def scatter_delay(part):
    return 0.20 * (1.0 - clamp01(part.center.z / 1.0)) + 0.05 * (nid(part.name) % 5) / 5.0


def scatter_dir(part):
    return (0.0, 0.0, 1.0)


# ---------------------------------------------------------------- in use
def wing_open_fraction(t):
    """0 closed, 1 open: servo S-curve open with a small overshoot, accelerating close with a rebound."""
    if t < T_OPEN0:
        return 0.0
    if t < T_OPEN1:
        return al.trapezoid((t - T_OPEN0) / (T_OPEN1 - T_OPEN0), 0.24)
    if t < T_CLOSE0:
        return 1.0 + al.ring(t - T_OPEN1, 0.014, 6.0, 0.09)
    if t < T_CLOSE1:
        return 1.0 - ease_in((t - T_CLOSE0) / (T_CLOSE1 - T_CLOSE0), 2.2)
    return al.rebound(t - T_CLOSE1, 0.016, 8.0, 0.05)


def _area(sc, name, size, size_y, color, spread=None):
    import bpy
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = size_y; ld.color = color
    if spread is not None:
        ld.spread = spread
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob)
    ob.rotation_mode = 'QUATERNION'
    return ob


def _key_light(ob, f, loc=None, aim=None, energy=None):
    if loc is not None:
        ob.location = loc; ob.keyframe_insert('location', frame=f)
        if aim is not None:
            ob.rotation_quaternion = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y'); ob.keyframe_insert('rotation_quaternion', frame=f)
    if energy is not None:
        ob.data.energy = energy; ob.data.keyframe_insert('energy', frame=f)


SWEEP_W = 1500.0       # hook light streak
SWEEP_X0, SWEEP_X1, SWEEP_Z = 0.3, 2.0, 1.3          # passes behind the hovering glass during the first second
if os.environ.get('GG_SWEEP'):          # look experiments:  GG_SWEEP="x0,x1,z,watts"
    SWEEP_X0, SWEEP_X1, SWEEP_Z, SWEEP_W = (float(v) for v in os.environ['GG_SWEEP'].split(','))
SPARK_BASE = 1500.0
SPARK_W = 3500.0       # the look helper's hard spot at 9000 W clips the steel base rails to white in every shot
SWEEP_FLOOR = 0.25     # how much of it reaches the floor (the look helper's floor twin)
PASS_W = 420.0         # the "someone walks through" light


def extras(sc, parts, man, baked):
    """Director's own lights and props: the hook light streak, the light that passes through the lane,
    the studio dimming around the drop, and the access card."""
    F = al.F
    # 1. hook: a long thin light sweeps behind the exploded gate so every polished edge flashes in turn
    sw = _area(sc, 'DIR_sweep', 0.06, 3.2, (0.80, 0.88, 1.0), spread=math.radians(70))
    f_end = F(HOOK_END)
    for f in range(0, f_end):                       # off on the first frame of the next shot
        u = f / (f_end - 1)
        x = SWEEP_X0 + (SWEEP_X1 - SWEEP_X0) * smooth(u)
        _key_light(sw, f, loc=(x, 1.15, SWEEP_Z), aim=(x * 0.35, 0.0, 0.9), energy=SWEEP_W * (0.55 + 0.45 * math.sin(math.pi * u)) * min(1.0, (1.0 - u) / 0.25))     # gone before the camera reaches the floor
    _key_light(sw, f_end, energy=0.0)
    al.set_linear(sw); al.set_linear(sw.data)
    # 2. in use: a tall warm light glides through the open lane (two faces, one toward each pedestal)
    f0, f1 = F(T_PASS0), F(T_PASS1)
    for sx in (-1, 1):
        pl = _area(sc, f'DIR_pass_{"L" if sx < 0 else "R"}', 0.30, 1.45, (1.0, 0.86, 0.70), spread=math.radians(150))
        _key_light(pl, f0 - 1, energy=0.0)
        for f in range(f0, f1 + 1):
            u = (f - f0) / (f1 - f0)
            y = -2.3 + 4.3 * u
            _key_light(pl, f, loc=(0.0, y, 0.90), aim=(sx * 1.0, y, 0.90), energy=PASS_W * math.sin(math.pi * u) ** 0.6)
        _key_light(pl, f1 + 1, energy=0.0)
        al.set_linear(pl); al.set_linear(pl.data)
    ev = []
    ev += studio_dim(sc)
    ev += access_card(sc, parts, man)
    return ev


def after_aim(sc):
    """Runs after the look helper's studio.aim_for_director: director's trims on its handles."""
    import bpy
    tw = bpy.data.objects.get('STUDIO_DIR_sweep_FLOOR')
    if tw is not None:
        tw['gg_floor_gain'] = SWEEP_FLOOR
    sw = bpy.data.objects.get('DIR_sweep')          # the streak is for the glass: keep it off the floor AND off the steel rails
    floor = bpy.data.objects.get('STUDIO_FLOOR')
    if sw is not None and floor is not None:
        coll = bpy.data.collections.get('DIR_LL_sweep') or bpy.data.collections.new('DIR_LL_sweep')
        for o in [floor] + [o for o in sc.objects if o.name.startswith('BASE_rail')]:
            if o.name not in coll.objects:
                coll.objects.link(o)
        for co in coll.collection_objects:
            co.light_linking.link_state = 'EXCLUDE'
        sw.light_linking.receiver_collection = coll
    sp = bpy.data.objects.get('STUDIO_SPARK')
    if sp is not None and 'gg_energy' in sp:
        # per shot: the base shot looks straight down the bare rail toward the spot, so it gets less of it
        al.key_steps(sp, 'gg_energy', [(0, SPARK_W), (al.F(CUT['base']), SPARK_BASE), (al.F(CUT['gears']), SPARK_W)])


def studio_dim(sc):
    """House lights: hold back before the drop, fall away on it so the gate's own light carries the frame,
    come back for the hero. Filled in against the look helper's studio handles."""
    return []


def access_card(sc, parts, man):
    """A clear access card comes in from the upper right, taps the reader at T_TAP and lifts away."""
    import bpy
    from mathutils import Quaternion
    props = {p['name']: p for p in man.get('props', [])}
    ob = bpy.data.objects.get('PROP_card')
    if ob is None or 'PROP_card' not in props:
        print('[choreo] no PROP_card in the gate: the card tap is sound only')
        return []
    F = al.F
    rest = Vector(props['PROP_card']['rest_location'])
    ob.rotation_mode = 'QUATERNION'
    q0 = ob.rotation_quaternion.copy()
    fam = [ob] + list(ob.children_recursive)
    def vis(f, v):
        for m in fam:
            m.hide_render = not v; m.hide_viewport = not v
            m.keyframe_insert('hide_render', frame=f); m.keyframe_insert('hide_viewport', frame=f)
    vis(0, False); vis(F(T_CARD_IN), True); vis(F(T_TAP + 0.62), False)
    src = Vector((0.20, -0.17, 0.18))           # in from screen right and above, at the reader's distance (never through the lens)
    for f in range(F(T_CARD_IN), F(T_TAP + 0.62) + 1):
        t = f / al.FPS
        if t <= T_TAP:
            a = al.approach((t - T_CARD_IN) / (T_TAP - T_CARD_IN), 2.0)
            off = src * a; tilt = math.radians(26) * a
        elif t <= T_TAP + 0.14:
            off = Vector((0, 0, al.rebound(t - T_TAP, 0.003, 9.0, 0.04))); tilt = 0.0
        else:
            u = ease_in((t - T_TAP - 0.14) / 0.48, 2.0)
            off = Vector((0.26, -0.10, 0.24)) * u; tilt = math.radians(-22) * u
        ob.location = rest + off
        ob.rotation_quaternion = q0 @ Quaternion((0.6, 1.0, 0.0), tilt)
        ob.keyframe_insert('location', frame=f); ob.keyframe_insert('rotation_quaternion', frame=f)
    al.set_linear(ob)
    return []


def fixed_events():
    return [
        dict(t=0.0, sfx='shimmer', part='hook_light_streak', gain=0.5, pan=0.0, dur=1.3, var=0),
        dict(t=HOOK_END, sfx='whoosh', part='hook_lift_away', gain=0.75, pan=0.0, dur=0.55, var=0),
        dict(t=DROP_T, sfx='riser', part='pre_drop', gain=0.8, pan=0.0, dur=0.7, var=0),
        dict(t=DROP_T, sfx='impact_drop', part='drop', gain=1.0, pan=0.0, var=0),
        dict(t=DROP_T, sfx='power_up', part='light_wave', gain=0.8, pan=0.0, dur=WAVE_DUR, var=0),
        dict(t=18.25, sfx='ui_boot', part='screens_on', gain=0.6, pan=0.0, var=0),
        dict(t=T_TAP, sfx='card_tap', part='card', gain=0.85, pan=-0.1, var=0),
        dict(t=T_BEEP, sfx='beep_ok', part='reader', gain=0.7, pan=-0.1, var=0),
        dict(t=T_GREEN, sfx='shimmer', part='led_green', gain=0.5, pan=0.0, dur=0.5, var=1),
        dict(t=T_OPEN0, sfx='servo', part='wings_open', gain=0.8, pan=0.0, dur=T_OPEN1 - T_OPEN0, var=0),
        dict(t=T_OPEN1, sfx='lock_clunk', part='wings_open_stop', gain=0.55, pan=0.0, var=2),
        dict(t=T_PASS1, sfx='whoosh', part='light_pass', gain=0.6, pan=0.0, dur=0.8, var=1),
        dict(t=T_CLOSE0, sfx='servo', part='wings_close', gain=0.7, pan=0.0, dur=T_CLOSE1 - T_CLOSE0, var=1),
        dict(t=T_CLOSE1, sfx='lock_clunk', part='wings_closed', gain=0.85, pan=0.0, var=3),
        dict(t=T_HERO, sfx='final_hit', part='hero', gain=0.7, pan=0.0, var=0),
    ]


def key_alive(sc, alive):
    """The alive moment and the house lights. See look/alive.py for what each value does."""
    K = alive.key_alive
    F = al.F
    # hook: the hovering parts are already lit and a head of light runs through the LED lines; it dies as they scatter
    K(sc, 0, power=1.0, wave=HOOK_WAVE0, grant=0.0, screens=0.0, ir=0.0, house=HOUSE_HOOK)
    K(sc, F(0.8), wave=1.1)
    K(sc, F(SCATTER_T0 - 0.07), power=1.0, house=HOUSE_HOOK)
    K(sc, F(SCATTER_T0 + 0.10), power=0.0, wave=1.1)
    K(sc, F(SCATTER_T0 + 0.10) + 1, wave=-0.1)
    K(sc, F(HOOK_END), house=1.0)
    # the room holds its breath before the drop, then goes dark on it so the gate's own light carries the frame
    K(sc, F(15.3), house=1.0)
    K(sc, F(DROP_T) - 1, power=0.0, wave=-0.1, house=HOUSE_BREATH)
    K(sc, F(DROP_T), power=1.0, wave=0.04, house=1.0)             # a flash of the whole room on the drop...
    K(sc, F(DROP_T) + FLASH_FRAMES, house=HOUSE_DROP)             # ...that falls away and leaves the gate's own light
    K(sc, F(DROP_T + WAVE_DUR), wave=1.1)
    K(sc, F(18.0), house=HOUSE_DROP)
    K(sc, F(18.0) + 1, house=HOUSE_ALIVE)
    K(sc, F(17.95), screens=0.0, ir=0.0)
    K(sc, F(18.65), screens=1.0, ir=1.0)
    # access granted: a green wave runs over the idle gate (grant 1 / wave -0.1 looks the same as grant 0 / wave 1.1)
    K(sc, F(T_GREEN) - 1, grant=0.0, wave=1.1)
    K(sc, F(T_GREEN), grant=1.0, wave=-0.1)
    K(sc, F(T_GREEN + 0.5), wave=1.1)
    # wings shut: back to idle
    K(sc, F(T_CLOSE1 - 0.1), grant=1.0)
    K(sc, F(T_CLOSE1 + 0.35), grant=0.0)
    K(sc, F(CUT['drive']) - 1, house=HOUSE_ALIVE)
    K(sc, F(CUT['drive']), house=HOUSE_DRIVE)
    K(sc, F(CUT['lane']) - 1, house=HOUSE_DRIVE)
    K(sc, F(CUT['lane']), house=HOUSE_ALIVE)
    K(sc, F(T_HERO) - 1, house=HOUSE_ALIVE)
    K(sc, F(T_HERO), house=HOUSE_HERO)


HOUSE_DRIVE = 0.95
HOUSE_HOOK, HOOK_WAVE0 = 0.9, 0.5
HOUSE_BREATH, FLASH_FRAMES = 0.25, 14
WAVE_DUR = 1.5          # the wave crosses the gate in three beats; the pull-back ends on the fully lit gate
HOUSE_DROP, HOUSE_ALIVE, HOUSE_HERO = 0.30, 0.45, 0.80          # look helper's round-2 values, tested on these cameras


# ---------------------------------------------------------------- shots
def fast_then_slow(u):          # speed ramp: rush in, then glide
    return ease_out(u, 2.6)


def slow_then_fast(u):
    return ease_in(u, 2.4)


def drift(u):                   # constant slow glide
    return u


def base_ramp(u):               # wide for the two rail slams, then a fast push down to the rail for anchors and cables
    if u < 0.38:
        return 0.30 * u / 0.38
    if u < 0.64:
        return 0.30 + 0.40 * smooth((u - 0.38) / 0.26)
    return 0.70 + 0.30 * (u - 0.64) / 0.36


def hook_ramp(u):               # glide for 64 % of the shot, then rush toward the floor
    return 0.30 * (u / 0.64) if u < 0.64 else 0.30 + 0.70 * ease_in((u - 0.64) / 0.36, 2.0)


def shots(parts, man):
    S = []
    # 1 HOOK — the whole gate exploded and hovering, like a diagram; ends rushing down to where the base will land
    S.append(Shot('01_hook', 0.0, CUT['base'],
                  pos=[(-2.02, -2.40, 1.50), (-1.86, -2.22, 1.46), (-0.84, -1.16, 0.34)],
                  target=[(-0.02, 0.0, 1.06), (-0.04, 0.0, 1.03), (-0.28, -0.26, 0.02)],
                  focus=[(0.0, (XL, 0.0, 0.9)), (1.3, (XL, 0.0, 0.9)), (HOOK_END, (XL, -0.3, 0.03))],
                  lens=[(0.0, 50.0), (1.2, 50.0), (HOOK_END, 40.0)], fstop=5.6, ramp=hook_ramp))
    # 2 BASE — low 3/4 down the rails: L rail slams in, R rail behind it, anchors spin in, cables drop into the channel
    S.append(Shot('02_base', CUT['base'], CUT['gears'],
                  pos=[(-0.84, -1.16, 0.34), (-0.80, -1.10, 0.31), (-0.57, -0.66, 0.14), (-0.55, -0.60, 0.125)],
                  target=[(-0.28, -0.26, 0.02), (-0.28, -0.26, 0.02), (-0.34, -0.12, 0.03), (-0.34, -0.06, 0.03)],
                  focus=[(HOOK_END, (XL, -0.45, 0.03)), (2.30, (XL, -0.45, 0.03)), (2.52, (0.38, -0.3, 0.03)), (2.85, (0.38, -0.3, 0.03)),
                         (3.0, (-0.35, -0.45, 0.03)), (3.375, (-0.35, 0.2, 0.03)), (3.5, (XL, -0.3, 0.03)), (3.8, (XL, -0.2, 0.03))],
                  lens=40, fstop=2.8, ramp=base_ramp))
    # 3 GEARS — macro hero on the planetary gearbox
    S.append(Shot('03_gears', CUT['gears'], CUT['stack'],
                  pos=[(-0.70, -0.34, 0.37), (-0.63, -0.25, 0.43), (-0.60, -0.20, 0.46)],
                  target=[(XL, 0.0, 0.13), (XL, 0.0, 0.20), (XL, 0.0, 0.215)],
                  focus=[(4.0, (XL, -0.03, 0.20)), (4.9, (XL, -0.03, 0.21)), (6.5, (XL, -0.01, 0.225))],
                  lens=58, fstop=5.6, ramp=fast_then_slow))
    # 4 STACK — pull back as shaft, spring, encoder and the glass column go on
    S.append(Shot('04_stack', CUT['stack'], CUT['pcb'],
                  pos=[(-0.84, -0.46, 0.50), (-1.00, -0.62, 0.62), (-1.18, -0.80, 0.74)],
                  target=[(XL, 0.0, 0.30), (XL, 0.0, 0.42), (XL, 0.0, 0.50)],
                  focus=[(6.5, (XL, -0.05, 0.3)), (8.0, (XL, -0.06, 0.45))],
                  lens=42, fstop=4.0, ramp=smooth))
    # 5 PCB — entry end, from the lane
    S.append(Shot('05_pcb', CUT['pcb'], CUT['psu'],
                  pos=[(0.10, -1.12, 0.40), (0.02, -1.02, 0.36)],
                  target=[(XL, -0.60, 0.26), (XL, -0.60, 0.28)],
                  focus=[(8.0, (-0.37, -0.61, 0.25)), (8.4, (-0.37, -0.61, 0.25)), (8.55, (-0.33, -0.61, 0.3)), (9.0, (-0.33, -0.58, 0.2))],
                  lens=50, fstop=3.2, ramp=fast_then_slow))
    # 6 PSU + cables — exit end, low along the base
    S.append(Shot('06_psu', CUT['psu'], CUT['glass'],
                  pos=[(0.08, 1.12, 0.26), (0.0, 1.02, 0.30)],
                  target=[(XL, 0.52, 0.12), (XL, 0.40, 0.10)],
                  focus=[(9.0, (-0.36, 0.6, 0.15)), (9.4, (-0.34, 0.6, 0.2)), (9.55, (XL, 0.3, 0.05)), (10.0, (XL, 0.0, 0.05))],
                  lens=45, fstop=3.2, ramp=fast_then_slow))
    # 7 GLASS BODY — both pedestals, posts and panels come down
    S.append(Shot('07_glass', CUT['glass'], CUT['rail'],
                  pos=[(-1.26, -1.70, 0.44), (-1.12, -1.56, 0.52), (-1.02, -1.46, 0.58)],
                  target=[(0.04, -0.10, 0.50), (0.06, -0.08, 0.50)],
                  focus=[(9.8, (XL, -0.62, 0.5)), (10.2, (XL, -0.62, 0.5)), (10.3, (0.38, -0.62, 0.5)), (10.45, (0.38, -0.62, 0.5)),
                         (10.6, (XL, 0.3, 0.5)), (11.2, (XL, -0.3, 0.5)), (11.8, (XL, -0.4, 0.5))],
                  lens=40, fstop=3.5, ramp=fast_then_slow))
    # 8 RAIL — high macro over the reader end
    S.append(Shot('08_rail', CUT['rail'], CUT['wings'],
                  pos=[(-0.90, -1.14, 1.36), (-0.80, -1.02, 1.40), (-0.74, -0.92, 1.42)],
                  target=[(-0.40, -0.52, 0.97), (-0.40, -0.46, 0.98)],
                  focus=[(11.8, (XL, -0.6, 0.96)), (12.6, (XL, -0.55, 0.96)), (12.8, (XL, -0.40, 0.97)), (13.25, (XL, -0.30, 1.0)), (13.45, (-0.33, -0.56, 1.0)), (13.8, (-0.33, -0.56, 1.0))],
                  lens=50, fstop=4.0, ramp=fast_then_slow))
    # 9 WINGS — in the lane, tight on the leaves slotting in
    S.append(Shot('09_wings', CUT['wings'], CUT['badge'],
                  pos=[(-0.16, -1.42, 0.74), (-0.10, -1.26, 0.70)],
                  target=[(-0.02, 0.0, 0.60), (0.0, 0.0, 0.59)],
                  focus=[(13.8, (-0.30, -0.02, 0.6)), (14.3, (-0.30, -0.02, 0.6)), (14.5, (-0.1, 0.0, 0.57)), (15.0, (0.0, 0.0, 0.57))],
                  lens=44, fstop=3.5, ramp=fast_then_slow))
    # 10 BADGE — the last piece, then stillness before the drop
    S.append(Shot('10_badge', CUT['badge'], CUT['wave'],
                  pos=[(-0.13, -0.34, 1.005), (-0.15, -0.31, 0.998)],
                  target=[(-0.31, -0.17, 0.968), (-0.31, -0.17, 0.968)],
                  focus=[(15.0, (-0.31, -0.17, 0.968))],
                  lens=70, fstop=8.0, ramp=drift))
    # 11 WAVE — the drop: at the head of the LED line as the light races away down the rail, then pull back to see both
    S.append(Shot('11_wave', CUT['wave'], CUT['alive'],
                  pos=[(-0.20, -1.16, 1.20), (-0.22, -1.22, 1.22), (-0.46, -1.52, 1.26), (-0.66, -1.82, 1.28)],
                  target=[(-0.26, 0.20, 0.86), (-0.25, 0.18, 0.85), (-0.10, 0.06, 0.72), (0.0, 0.0, 0.62)],
                  focus=[(16.0, (-0.45, -0.60, 0.94)), (16.9, (-0.45, 0.0, 0.93)), (18.0, (XL, -0.2, 0.9))],
                  lens=[(16.0, 30.0), (18.0, 36.0)], fstop=3.5, ramp=slow_then_fast))
    # 12 ALIVE — front hero, the wing displays wake up
    S.append(Shot('12_alive', CUT['alive'], CUT['card'],
                  pos=[(0.30, -2.00, 1.16), (0.12, -1.80, 1.08), (0.0, -1.56, 0.98)],
                  target=[(0.0, 0.0, 0.50), (0.0, 0.0, 0.54)],
                  focus=[(18.0, (0.0, 0.0, 0.58))],
                  lens=38, fstop=3.5, ramp=fast_then_slow))
    # 13 CARD — macro on the reader, a pass taps in
    S.append(Shot('13_card', CUT['card'], CUT['drive'],
                  pos=[(-0.70, -0.98, 1.22), (-0.66, -0.92, 1.20)],
                  target=[(XL, -0.60, 0.99)],
                  focus=[(20.0, (XL, -0.61, 1.0))],
                  lens=60, fstop=4.5, ramp=drift))
    # 14 DRIVE — the gears turn inside the glass column as the wings open
    S.append(Shot('14_drive', CUT['drive'], CUT['lane'],
                  pos=[(-0.74, -0.36, 0.34), (-0.70, -0.32, 0.36)],
                  target=[(XL, 0.0, 0.21)],
                  focus=[(21.0, (XL, -0.03, 0.22))],
                  lens=55, fstop=4.5, ramp=drift))
    # 15 LANE — low in the lane, wings open, light passes, wings close
    S.append(Shot('15_lane', CUT['lane'], CUT['hero'],
                  pos=[(0.05, -1.86, 0.44), (0.02, -1.74, 0.48), (0.0, -1.66, 0.52)],
                  target=[(0.0, 0.0, 0.55)],
                  focus=[(22.0, (0.0, 0.0, 0.56))],
                  lens=35, fstop=3.5, ramp=drift))
    # 16 HERO — slow orbit, held about 2 s
    a0, a1, r = math.radians(-112), math.radians(-124), 2.28
    S.append(Shot('16_hero', CUT['hero'], DURATION,
                  pos=[(r * math.cos(a0 + (a1 - a0) * k / 4), r * math.sin(a0 + (a1 - a0) * k / 4), 1.22) for k in range(5)],
                  target=[(0.0, 0.0, 0.46)],
                  focus=[(24.0, (XL, -0.3, 0.6))],
                  lens=40, fstop=4.0, ramp=drift))
    return S
