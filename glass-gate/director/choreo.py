"""CLEAR PASSAGE — the director's shot list, landing schedule and alive-moment keys.

Everything sits on a 120 BPM grid at 60 fps: 1 beat = 0.5 s = 30 frames, 1 bar = 2 s, 16th = 0.125 s.
    bar 1      0-2 s    HOOK     exploded gate hovering, light streak, parts lift away
    bars 2-8   2-16 s   BUILD    six waves, getting faster
    bar 9      16.0 s   DROP     light wave through the whole gate (alive moment)
    bars 11-12 20-24 s  IN USE   card tap, beep, green, wings open, light passes, wings close
    bar 13     24-26 s  HERO     slow orbit, clean end
"""
import math, re
from mathutils import Vector
import anim_lib as al
from anim_lib import Shot, smooth, smoother, ease_in, ease_out, clamp01

VERSION = 5
DURATION = 26.0
HOOK_END = 1.6
SCATTER_T0 = 1.12
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
CUT = dict(base=1.6, gears=4 - LEAD, stack=6.3, pcb=8 - LEAD, psu=9 - LEAD, glass=10 - LEAD, rail=12 - LEAD, wings=14 - LEAD,
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


def R(base, tL, tR=None, **o):
    """A rule for both sides. tR None = together with L; a float = that time; 'off' = L time + offset given in o['r_off']."""
    return (base, tL, tL if tR is None else tR, o)


# name (without _L/_R; a trailing index is matched by '#'), time L, time R, overrides
RULES = [
    # ---- wave 1: base (bar 2) ---------------------------------------------------------------------
    R('BASE_rail', 2.0, 2.5, dur=0.42, dist=0.9),
    R('BASE_foot_#', lambda i: 2.0, lambda i: 2.5, dur=0.42, dist=0.9, sfx=None, bounce=0.005, wobble=0.0, mode='none'),
    R('BASE_anchor_#', lambda i: 3.0 + 0.125 * i, lambda i: 3.5 + 0.125 * (i // 2)),
    # ---- wave 2: drive unit, the macro hero (bars 3-4) --------------------------------------------
    R('DRV_motor', 4.0, dur=0.42, dist=0.75),
    R('DRV_brake', 4.5, dur=0.32, dist=0.4, twist=40.0),
    R('DRV_ring', 5.0, dur=0.34, dist=0.4, sfx='thunk_metal', gain=0.8, twist=25.0, var=1),
    R('DRV_planet_#', lambda i: 5.25 + 0.25 * i, dur=0.28, dist=0.3, twist=60.0),
    R('DRV_sun', 6.0, dur=0.28, dist=0.3, twist=-60.0, gain=0.8, var=5),
    R('DRV_carrier', 6.125, dur=0.26, dist=0.32, sfx='clack', twist=40.0),
    R('DRV_shaft', 6.5, dur=0.40, dist=0.95, sfx='click', gain=0.8, twist=90.0, wobble=0.15),
    R('DRV_spring', 6.75, dur=0.30, dist=0.6, twist=-120.0),
    R('DRV_encdisc', 6.875, dur=0.26, dist=0.5, sfx='click', twist=90.0, var=1),
    R('DRV_encoder', 7.0, dur=0.24, dist=0.25, dirfn=lane, gain=0.6),
    R('DRV_cage', 7.125, dur=0.28, dist=0.6, twist=40.0),
    R('GLS_column', 7.25, dur=0.46, dist=0.75, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.4, k=1.9),
    R('WING_hub', 7.375, dur=0.28, dist=0.6, twist=60.0),
    R('WING_sleeve', 7.5, dur=0.44, dist=0.85, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.38, k=1.9),
    # ---- wave 3: electronics (bar 5) --------------------------------------------------------------
    R('ELE_pcb', 8.0, 8.25, dur=0.36, dist=0.65),
    R('ELE_sensor_entry', 8.5, 8.5, dur=0.28, dist=0.3, dirfn=lane, sfx='snap'),
    R('LED_accent_entry', 8.625, 8.625, dur=0.26, dist=0.25, dirfn=lane),
    R('ELE_cable_3', 8.625, 8.625, dur=0.26, dist=0.3, sfx=None),
    R('ELE_psu', 9.0, 9.125, dur=0.38, dist=0.7),
    R('ELE_sensor_exit', 9.25, 9.25, dur=0.28, dist=0.3, dirfn=lane, sfx='snap'),
    R('LED_accent_exit', 9.25, 9.25, dur=0.26, dist=0.25, dirfn=lane, sfx=None),
    R('ELE_cable_#', lambda i: 9.375 + 0.125 * i, dur=0.26, dist=0.28),
    # ---- wave 4: glass body (bar 6) ---------------------------------------------------------------
    R('GLS_post_entry', 10.0, 10.25, dur=0.5, dist=1.7, gain=1.0),
    R('GLS_post_exit', 10.5, 10.75, dur=0.5, dist=1.7, gain=0.9),
    R('GLS_clips_entry', 11.0, 11.0, dur=0.24, dist=0.25),
    R('GLS_clips_exit', 11.0, 11.0, dur=0.24, dist=0.25),
    R('GLS_panel_entry', 11.125, 11.25, dur=0.42, dist=1.6, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.3, k=1.9),
    R('GLS_panel_exit', 11.375, 11.5, dur=0.42, dist=1.6, sfx=('glass_slide', 'glass_clink'), sfx_dur=0.3, k=1.9),
    # ---- wave 5: top rail (bar 7) -----------------------------------------------------------------
    R('LED_colring', 12.0, 12.125, dur=0.24, dist=0.3, sfx=None),
    R('RAIL_spine', 12.0, 12.125, dur=0.36, dist=0.6),
    R('RAIL_led', 12.25, 12.25, dur=0.26, dist=0.3),
    R('RAIL_rfid', 12.5, dur=0.24, dist=0.3, sfx='tap'),
    R('RAIL_qr', 12.625, dur=0.24, dist=0.3),
    R('RAIL_lcd', 12.75, dur=0.26, dist=0.32, sfx='clack'),
    R('RAIL_speaker', 12.875, dur=0.22, dist=0.28, sfx='click'),
    R('RAIL_lid', 13.0, 13.125, dur=0.42, dist=0.7, gain=1.0),
    R('RAIL_campod', 13.25, dur=0.26, dist=0.3, sfx='click'),
    R('RAIL_screw_#', lambda i: 13.375 + 0.125 * (i // 2)),
    # ---- wave 6: wings (bar 8) --------------------------------------------------------------------
    R('WING_clamp_a', 14.0, dur=0.24, dist=0.3, dirfn=lane),
    R('WING_clamp_b', 14.125, dur=0.24, dist=0.3, dirfn=lane),
    R('WING_edgeled', 14.25, dur=0.22, dist=0.25, dirfn=lane),
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
LIFT = {1: 0.0, 2: 0.08, 3: 0.10, 4: 0.46, 5: 0.56, 6: 0.10}
EXPLODE = {   # per-part overrides: extra world offset on top of the wave formula
    'BASE_anchor': (0, 0, 0.10), 'BASE_foot': (0, 0, 0.0),
    'GLS_column': (0, 0, 0.50), 'WING_sleeve': (0, 0, 0.52), 'WING_hub': (0, 0, 0.34),
    'DRV_shaft': (0, 0, 0.30), 'DRV_cage': (0, 0, 0.10),
    'RAIL_lid': (0, 0, 0.12), 'RAIL_campod': (0, 0, 0.16), 'RAIL_screw': (0, 0, 0.18), 'RAIL_badge': (0, 0, 0.0),
}


def explode_offset(part, man):
    i = part.info
    w, o = i.get('wave', 3), i.get('order', 0)
    side = -1.0 if i.get('side') == 'L' else 1.0 if i.get('side') == 'R' else 0.0
    c = part.center
    z = LIFT.get(w, 0.3) + 0.018 * o + 0.18 * c.z
    y = c.y * 0.20
    x = side * 0.035 * (w - 1)
    if w == 1:
        z = 0.0
    if w == 6:
        y -= 0.40; x = -side * 0.06
    if part.name.startswith('GLS_panel'):
        x += side * 0.22
    for k, v in EXPLODE.items():
        if part.name.startswith(k):
            x += v[0]; y += v[1]; z += v[2]
    return (x, y, z)


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


def extras(sc, parts, man, baked):
    return []


def fixed_events():
    return [
        dict(t=0.0, sfx='shimmer', part='hook_light_streak', gain=0.5, pan=0.0, dur=1.1, var=0),
        dict(t=HOOK_END, sfx='whoosh', part='hook_lift_away', gain=0.75, pan=0.0, dur=0.55, var=0),
        dict(t=DROP_T, sfx='riser', part='pre_drop', gain=0.8, pan=0.0, dur=0.7, var=0),
        dict(t=DROP_T, sfx='impact_drop', part='drop', gain=1.0, pan=0.0, var=0),
        dict(t=DROP_T, sfx='power_up', part='light_wave', gain=0.8, pan=0.0, dur=2.4, var=0),
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
    K = alive.key_alive
    K(sc, 0, power=0.0, wave=-0.1, grant=0.0, screens=0.0, ir=0.0)
    K(sc, al.F(DROP_T) - 1, power=0.0, wave=-0.1)
    K(sc, al.F(DROP_T), power=1.0, wave=-0.05)
    K(sc, al.F(DROP_T + 2.4), wave=1.1)
    K(sc, al.F(17.9), screens=0.0, ir=0.0)
    K(sc, al.F(18.6), screens=1.0, ir=1.0)
    K(sc, al.F(T_GREEN - 0.1), grant=0.0)
    K(sc, al.F(T_GREEN + 0.4), grant=1.0)
    K(sc, al.F(T_CLOSE1 - 0.1), grant=1.0)
    K(sc, al.F(T_CLOSE1 + 0.35), grant=0.0)


# ---------------------------------------------------------------- shots
def fast_then_slow(u):          # speed ramp: rush in, then glide
    return ease_out(u, 2.6)


def slow_then_fast(u):
    return ease_in(u, 2.4)


def drift(u):                   # constant slow glide
    return u


def hook_ramp(u):               # glide for 64 % of the shot, then rush toward the floor
    return 0.30 * (u / 0.64) if u < 0.64 else 0.30 + 0.70 * ease_in((u - 0.64) / 0.36, 2.0)


def shots(parts, man):
    S = []
    # 1 HOOK — exploded gate hovering; ends rushing down to where the base will land
    S.append(Shot('01_hook', 0.0, CUT['base'],
                  pos=[(-1.36, -1.72, 0.80), (-1.22, -1.58, 0.84), (-0.80, -1.30, 0.26)],
                  target=[(-0.16, 0.0, 0.88), (-0.18, 0.0, 0.86), (XL, -0.45, 0.04)],
                  focus=[(0.0, (XL, 0.0, 0.75)), (1.1, (XL, 0.0, 0.75)), (1.6, (XL, -0.6, 0.03))],
                  lens=40, fstop=4.0, ramp=hook_ramp))
    # 2 BASE — floor-level macro looking down the rail, rack focus L rail -> R rail -> anchors
    S.append(Shot('02_base', CUT['base'], CUT['gears'],
                  pos=[(-0.60, -1.12, 0.115), (-0.54, -1.02, 0.095), (-0.50, -0.96, 0.09)],
                  target=[(-0.33, -0.20, 0.035), (-0.31, -0.15, 0.035)],
                  focus=[(1.6, (XL, -0.66, 0.03)), (2.30, (XL, -0.66, 0.03)), (2.52, (0.38, -0.6, 0.03)), (2.85, (0.38, -0.6, 0.03)),
                         (3.0, (-0.35, -0.45, 0.03)), (3.375, (-0.35, 0.30, 0.03)), (3.5, (0.35, -0.45, 0.03)), (3.7, (0.35, 0.0, 0.03))],
                  lens=35, fstop=2.8, ramp=fast_then_slow))
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
    # 11 WAVE — the drop: chase the light along the rail
    S.append(Shot('11_wave', CUT['wave'], CUT['alive'],
                  pos=[(-0.78, -1.16, 1.10), (-0.92, -0.80, 1.12), (-1.05, -0.20, 1.08), (-1.10, 0.35, 1.02)],
                  target=[(XL, -0.62, 0.95), (XL, -0.25, 0.93), (XL, 0.25, 0.90), (-0.30, 0.55, 0.80)],
                  focus=[(16.0, (XL, -0.62, 0.95)), (18.0, (XL, 0.3, 0.93))],
                  lens=40, fstop=3.5, ramp=fast_then_slow))
    # 12 ALIVE — front hero, the wing displays wake up
    S.append(Shot('12_alive', CUT['alive'], CUT['card'],
                  pos=[(0.30, -2.05, 0.74), (0.12, -1.92, 0.70), (0.0, -1.84, 0.68)],
                  target=[(0.0, 0.0, 0.58)],
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
    a0, a1, r = math.radians(-131), math.radians(-121), 2.12
    S.append(Shot('16_hero', CUT['hero'], DURATION,
                  pos=[(r * math.cos(a0 + (a1 - a0) * k / 4), r * math.sin(a0 + (a1 - a0) * k / 4), 0.95) for k in range(5)],
                  target=[(0.0, 0.0, 0.50)],
                  focus=[(24.0, (XL, -0.3, 0.6))],
                  lens=44, fstop=4.0, ramp=drift))
    return S
