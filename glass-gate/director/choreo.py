"""CLEAR PASSAGE — the director's shot list, landing schedule and alive-moment keys.

Everything sits on a 120 BPM grid at 60 fps: 1 beat = 0.5 s = 30 frames, 1 bar = 2 s.
    bar 1      0-2 s    HOOK     exploded gate hovering, light streak, parts lift away
    bars 2-8   2-16 s   BUILD    six waves, getting faster
    bar 9      16.0 s   DROP     light wave through the whole gate (alive moment)
    bars 11-12 20-24 s  IN USE   card tap, beep, green, wings open, light passes, wings close
    bar 13     24-26 s  HERO     slow orbit, clean end
"""
import math, re, random
from mathutils import Vector
import anim_lib as al
from anim_lib import Shot, smooth, smoother, ease_in, ease_out, clamp01

VERSION = 2
DURATION = 26.0
HOOK_END = 2.0
SCATTER_T0 = 1.42
SCATTER_DIST = 3.2
HOOK_BREATHE = 0.05
DROP_T = 16.0
USE_T0 = 20.0
OFFSCREEN_GAIN = 0.0        # a landing nobody can see makes no sound
GEAR_DIR = 1.0

SECTIONS = [
    dict(name='hook', t0=0, t1=2, busy=0.3), dict(name='w1_base', t0=2, t1=4, busy=0.6),
    dict(name='w2_drive', t0=4, t1=8, busy=0.8), dict(name='w3_electronics', t0=8, t1=10, busy=0.9),
    dict(name='w4_glass_body', t0=10, t1=12, busy=0.9), dict(name='w5_top_rail', t0=12, t1=14, busy=1.0),
    dict(name='w6_wings', t0=14, t1=16, busy=0.8), dict(name='drop_alive', t0=16, t1=20, busy=0.2),
    dict(name='in_use', t0=20, t1=24, busy=0.5), dict(name='hero_orbit', t0=24, t1=26, busy=0.0)]

# ---------------------------------------------------------------- landing defaults by kind
KIND = {
    'metal_heavy': dict(dur=0.45, dist=0.85, sfx='thunk_metal', gain=1.0, bounce=0.005, wobble=0.35, shake=0.0025),
    'metal_small': dict(dur=0.32, dist=0.40, sfx='clack', gain=0.7, bounce=0.003, wobble=0.8),
    'glass':       dict(dur=0.50, dist=0.95, sfx='glass_clink', gain=0.9, bounce=0.003, wobble=0.3, shake=0.0012),
    'pcb':         dict(dur=0.34, dist=0.45, sfx='click', gain=0.75, bounce=0.002, wobble=0.6),
    'screw':       dict(dur=0.22, dist=0.07, sfx='screw', gain=0.55, bounce=0.0, wobble=0.0, turns=3.0, k=1.3),
    'gear':        dict(dur=0.30, dist=0.30, sfx='gear_tick', gain=0.7, bounce=0.003, wobble=0.9, twist=140.0),
    'spring':      dict(dur=0.30, dist=0.30, sfx='spring', gain=0.6, bounce=0.006, wobble=1.2),
    'cable':       dict(dur=0.30, dist=0.30, sfx='click', gain=0.4, bounce=0.002, wobble=0.5),
    'plastic':     dict(dur=0.30, dist=0.35, sfx='snap', gain=0.65, bounce=0.003, wobble=0.8),
    'wing':        dict(dur=0.55, dist=0.70, sfx=('glass_clink', 'lock_clunk'), gain=0.9, bounce=0.002, wobble=0.3, shake=0.0012),
    'led':         dict(dur=0.34, dist=0.30, sfx='snap', gain=0.6, bounce=0.002, wobble=0.4),
}
WAVE_WINDOW = {1: (2.0, 4.0), 2: (4.0, 8.0), 3: (8.0, 10.0), 4: (10.0, 12.0), 5: (12.0, 14.0), 6: (14.0, 15.5)}

# (regex on the part name, landing time for the i-th match | fixed time, overrides)
# Filled in against hardware/manifest.json; anything unmatched falls back to its wave window.
RULES = []


def natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', s)]


def schedule(parts, man):
    out, used = [], set()
    for pat, t, opts in RULES:
        rx = re.compile(pat)
        ms = sorted([n for n in parts if rx.fullmatch(n) and n not in used], key=natural)
        if not ms:
            print('[choreo] rule matched nothing:', pat)
        for i, n in enumerate(ms):
            o = dict(KIND.get(parts[n].info.get('kind', 'metal_small'), KIND['metal_small']))
            o.update(opts)
            o['part'] = n
            o['t'] = t(i, n) if callable(t) else t
            out.append(o); used.add(n)
    # fallback: spread the rest over their wave window in manifest order, on 16th notes
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
            t = t0 + (t1 - t0) * (i + 0.5) / max(1, len(orders))
            t = round(t / 0.125) * 0.125
            o = dict(KIND.get(p.info.get('kind', 'metal_small'), KIND['metal_small']))
            o.update(part=p.name, t=t)
            out.append(o)
        print(f'[choreo] wave {w}: {len(ps)} parts on the fallback schedule')
    return out


# ---------------------------------------------------------------- hook (exploded hover)
LIFT = {1: 0.0, 2: 0.12, 3: 0.32, 4: 0.78, 5: 1.05, 6: 0.30}


def explode_offset(part, man):
    i = part.info
    w, o = i.get('wave', 3), i.get('order', 0)
    side = -1.0 if i.get('side') == 'L' else 1.0 if i.get('side') == 'R' else 0.0
    c = part.center
    z = LIFT.get(w, 0.3) + 0.035 * o
    y = c.y * 0.22
    x = side * 0.05 * (w - 1)
    if w == 6:
        y -= 0.42
    return (x, y, z)


def hook_spin(part):
    return {'gear': 1.6}.get(part.info.get('kind'), 0.0) * (1 if hash(part.name) & 1 else -1)


def scatter_delay(part):
    return 0.22 * (1.0 - clamp01(part.center.z / 1.0)) + 0.04 * (hash(part.name) % 5) / 5.0


def scatter_dir(part):
    return (0.0, 0.0, 1.0)


# ---------------------------------------------------------------- in use
def wing_open_fraction(t):
    """0 closed, 1 open. Opens 20.5-21.4 with a 3% overshoot, closes 22.75-23.5."""
    if t < 20.5:
        return 0.0
    if t < 21.4:
        u = (t - 20.5) / 0.9
        return smoother(u) * 1.0 + 0.03 * math.sin(math.pi * clamp01((u - 0.7) / 0.3)) * (u > 0.7)
    if t < 22.75:
        tau = t - 21.4
        return 1.0 + al.ring(tau, 0.012, 7.0, 0.09)
    if t < 23.5:
        u = (t - 22.75) / 0.75
        return 1.0 - ease_in(u, 2.2)
    tau = t - 23.5
    return al.rebound(tau, 0.018, 8.0, 0.05)


def extras(sc, parts, man):
    return []


def fixed_events():
    E = [
        dict(t=0.0, sfx='shimmer', part='hook_light_streak', gain=0.5, pan=0.0, dur=1.6, var=0),
        dict(t=2.0, sfx='whoosh', part='hook_lift_away', gain=0.7, pan=0.0, dur=0.6, var=0),
        dict(t=16.0, sfx='riser', part='pre_drop', gain=0.8, pan=0.0, dur=0.75, var=0),
        dict(t=16.0, sfx='impact_drop', part='drop', gain=1.0, pan=0.0, var=0),
        dict(t=16.0, sfx='power_up', part='light_wave', gain=0.8, pan=0.0, dur=2.5, var=0),
        dict(t=18.0, sfx='ui_boot', part='screens_on', gain=0.6, pan=0.0, var=0),
        dict(t=20.0, sfx='card_tap', part='card', gain=0.8, pan=-0.2, var=0),
        dict(t=20.12, sfx='beep_ok', part='reader', gain=0.7, pan=-0.2, var=0),
        dict(t=20.25, sfx='shimmer', part='led_green', gain=0.5, pan=0.0, dur=0.5, var=1),
        dict(t=20.5, sfx='servo', part='wings_open', gain=0.8, pan=0.0, dur=0.9, var=0),
        dict(t=21.4, sfx='lock_clunk', part='wings_open_stop', gain=0.6, pan=0.0, var=2),
        dict(t=22.0, sfx='whoosh', part='light_pass', gain=0.6, pan=0.0, dur=0.8, var=1),
        dict(t=22.75, sfx='servo', part='wings_close', gain=0.7, pan=0.0, dur=0.75, var=1),
        dict(t=23.5, sfx='lock_clunk', part='wings_closed', gain=0.8, pan=0.0, var=3),
        dict(t=24.0, sfx='final_hit', part='hero', gain=0.7, pan=0.0, var=0),
    ]
    return E


def key_alive(sc, alive):
    K = alive.key_alive
    K(sc, 0, power=0.0, wave=-0.1, grant=0.0, screens=0.0, ir=0.0)
    K(sc, al.F(DROP_T) - 1, power=0.0, wave=-0.1)
    K(sc, al.F(DROP_T), power=1.0, wave=-0.05)
    K(sc, al.F(DROP_T + 2.5), wave=1.1)
    K(sc, al.F(17.6), screens=0.0, ir=0.0)
    K(sc, al.F(18.3), screens=1.0, ir=1.0)
    K(sc, al.F(20.2), grant=0.0)
    K(sc, al.F(20.6), grant=1.0)
    K(sc, al.F(23.3), grant=1.0)
    K(sc, al.F(23.8), grant=0.0)


# ---------------------------------------------------------------- shots
def shots(parts, man):
    """Placeholder orbit until the real shot list is written against the geometry."""
    S = []
    for i in range(13):
        a0 = -2.2 + i * 0.35
        r = 1.9
        S.append(Shot(f'bar{i + 1}', i * 2.0, i * 2.0 + 2.0,
                      pos=[(r * math.cos(a0), r * math.sin(a0), 0.9), (r * math.cos(a0 + 0.3), r * math.sin(a0 + 0.3), 1.0)],
                      target=[(0, 0, 0.55)], lens=45, fstop=4.0))
    return S
