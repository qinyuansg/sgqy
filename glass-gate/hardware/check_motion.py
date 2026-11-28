"""Motion checks on hardware/gate.blend (triangle-triangle intersection, BVH).

    /opt/blender-env/venv/bin/python hardware/check_motion.py [gears] [posts] [cables] [leaf]

gears   rotate output / sun / planets / wings through 0-90 deg: nothing may collide
posts   CHECK 1: each glass post dropped straight down over what stands inside it
cables  CHECK 2: base-channel cables dropped into the bare base; then motor, PCB and PSU dropped onto them
leaf    CHECK 3: the wing leaf flown in exactly like director/anim_lib.fly_in does it
        (vertical, 4 mm side offset closing in the last 22 %, then the bounce and wobble)
"""
import sys, os, json, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import numpy as np
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree
import validate as V

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, 'gate.blend'))
man = json.load(open(os.path.join(HERE, 'manifest.json')))
objs = [o for o in bpy.data.objects if o.type == 'MESH']
GEO = {o.name: V.world_geo(o) for o in objs}
WAVE = {p['name']: p['wave'] for p in man['parts']}
which = set(sys.argv[1:]) or {'gears', 'posts', 'cables', 'leaf'}


def bvh(co, tv):
    return BVHTree.FromPolygons([Vector(p) for p in co], [tuple(int(i) for i in t) for t in tv], epsilon=0.0)


def geo_of(names):
    cos_, tvs, n0 = [], [], 0
    for n in names:
        co, tv = GEO[n]
        cos_.append(co)
        tvs.append(tv + n0)
        n0 += len(co)
    return np.vstack(cos_), np.vstack(tvs)


def family(name):
    """An object plus its non-animatable children (diffusers, display)."""
    o = bpy.data.objects[name]
    return [name] + [c.name for c in o.children_recursive if c.type == 'MESH' and c.name not in WAVE]


def min_dist(co, tree, lim=0.02):
    d = lim
    for p in co:
        r = tree.find_nearest(Vector(p), d)
        if r[0] is not None and r[3] < d:
            d = r[3]
    return d


def drop_test(movers, statics, dzs, label):
    """Translate movers up by dz (m) and count intersecting triangle pairs with each static object."""
    co, tv = geo_of(movers)
    hits = {}
    st = {n: (bvh(*GEO[n]), GEO[n][0].min(0), GEO[n][0].max(0)) for n in statics}
    for dz in dzs:
        c = co + np.array([0, 0, dz])
        t = bvh(c, tv)
        lo, hi = c.min(0), c.max(0)
        for n, (ts, slo, shi) in st.items():
            if np.any(lo > shi) or np.any(slo > hi):
                continue
            k = len(t.overlap(ts))
            if k:
                hits.setdefault(n, []).append((round(dz * 1000, 2), k))
    print('  %-46s %s' % (label, 'clear at every height' if not hits else 'HITS (dz mm, tri pairs): %s' % hits))
    return hits


# ----------------------------------------------------------------------------- gears + wings
def tree_live(o):
    co, tv = V.world_geo(o)
    return bvh(co, tv), co.min(0), co.max(0)


def descend(o):
    return [c for c in o.children_recursive]


if 'gears' in which:
    ratio = man['gear']['ratio']
    spin = man['gear']['planet_local_spin_per_carrier']
    worst = {}
    for side, sgn in (('L', 1.0), ('R', -1.0)):
        out = bpy.data.objects['DRV_out_' + side]
        wing = bpy.data.objects['WING_' + side]
        sun = bpy.data.objects['DRV_sun_' + side]
        planets = [bpy.data.objects['DRV_planet_%d_%s' % (i, side)] for i in range(3)]
        moving = [o for o in descend(out) + descend(wing) + [sun] if o.type == 'MESH']
        mset = set(o.name for o in moving)
        static = [o for o in objs if o.name not in mset and o.name.endswith('_' + side)]
        st = {o.name: tree_live(o) for o in static}
        for deg in (0, 3, 7, 10, 15, 22.5, 30, 45, 60, 75, 90):
            a = math.radians(deg) * sgn
            out.rotation_euler.z = a
            wing.rotation_euler.z = a
            sun.rotation_euler.z = ratio * a
            for p in planets:
                p.rotation_euler.z = spin * a
            bpy.context.view_layer.update()
            mt = {o.name: tree_live(o) for o in moving}
            names = list(mt)
            for i, an in enumerate(names):
                t1, lo1, hi1 = mt[an]
                for sn, (t2, lo2, hi2) in list(st.items()) + [(bn, mt[bn]) for bn in names[i + 1:]]:
                    if np.any(lo1 > hi2) or np.any(lo2 > hi1):
                        continue
                    n = len(t1.overlap(t2))
                    if n:
                        worst.setdefault('%s | %s' % (an, sn), {})[deg] = n
        out.rotation_euler.z = wing.rotation_euler.z = sun.rotation_euler.z = 0.0
        for p in planets:
            p.rotation_euler.z = 0.0
        bpy.context.view_layer.update()
    print('GEARS / WING SWEEP 0-90 deg: pairs that intersect at some angle (angle: triangle pairs)')
    for k, v in sorted(worst.items()):
        print('  ', k, v)
    if not worst:
        print('   none')

DZ = [0.0, 0.0002, 0.0005, 0.001, 0.002, 0.003, 0.005, 0.008, 0.012, 0.02, 0.035, 0.06, 0.1, 0.16, 0.25, 0.4, 0.65, 0.9, 1.3, 1.7]

# ----------------------------------------------------------------------------- CHECK 1
if 'posts' in which:
    print('CHECK 1 - posts dropped straight down over the parts standing inside them')
    for side in 'LR':
        inside = [n for n in GEO if n.endswith('_' + side) and (WAVE.get(n, 9) <= 3 or n.startswith('LED_accent'))]
        for end in ('entry', 'exit'):
            post = 'GLS_post_%s_%s' % (end, side)
            drop_test([post], [n for n in inside if n != post], DZ, post + ' over waves 1-3 + accent bars')
            t = bvh(*GEO[post])
            for nm in ('LED_accent_%s_%s' % (end, side), 'LED_accent_%s_diffuser_%s' % (end, side), 'ELE_sensor_%s_%s' % (end, side)):
                d = min(min_dist(GEO[nm][0], t), min_dist(GEO[post][0], bvh(*GEO[nm])))
                print('      rest gap %-34s %.2f mm' % (nm, d * 1000))

# ----------------------------------------------------------------------------- CHECK 2
if 'cables' in which:
    print('CHECK 2 - base-channel cables land in wave 1; motor, PCB and PSU then drop onto them')
    for side in 'LR':
        base = [n for n in GEO if n.endswith('_' + side) and n.startswith('BASE_')]
        cab = ['ELE_cable_%d_%s' % (i, side) for i in range(3)]
        for i, c in enumerate(cab):          # landing order 0, 1, 2 (1 and 2 may fly together)
            drop_test([c], base + cab[:i], DZ, c + ' into base + anchors + cables already in')
        for mover in ('DRV_motor', 'GLS_column', 'ELE_pcb', 'ELE_psu'):
            drop_test(family('%s_%s' % (mover, side)), cab + base, DZ, '%s_%s onto cables + base' % (mover, side))

# ----------------------------------------------------------------------------- CHECK 3
if 'leaf' in which:
    print('CHECK 3 - wing leaf: director fly_in (vertical, 4 mm lane-side offset closing in the last 22 %, bounce, wobble)')

    def clamp01(x):
        return 0.0 if x < 0 else 1.0 if x > 1 else x

    def smooth(x):
        x = clamp01(x)
        return x * x * (3 - 2 * x)

    FPS = 60
    for side in 'LR':
        name = 'WING_leaf_' + side
        fam = family(name)
        co, tv = geo_of(fam)
        org = np.array(bpy.data.objects[name].matrix_world.translation)
        local = co - org
        others = [n for n in GEO if n.endswith('_' + side) and n not in fam]
        st = {n: (bvh(*GEO[n]), GEO[n][0].min(0), GEO[n][0].max(0)) for n in others}
        watch = ['RAIL_lid', 'RAIL_led_diffuser', 'WING_clamp_a', 'WING_clamp_b', 'WING_edgeled', 'WING_edgeled_diffuser', 'RAIL_badge', 'LED_colring_diffuser']
        lane = np.array([1.0 if side == 'L' else -1.0, 0, 0])
        d = Vector((0, 0, 1))
        rnd = random.Random(sum(map(ord, name)))
        perp = d.orthogonal().normalized()
        perp = Quaternion(d, rnd.uniform(0, math.tau)) @ perp
        for dist in (1.3, 1.69, 2.197, 2.856):
            for wobble_deg, bounce in ((0.2, 0.002),):
                hits, mind = {}, {w: (9.0, None) for w in watch}
                n_fl, n_set = 30, 18
                frames = []
                for f in range(n_fl * 4 + 1):                     # flight, 4 sub-steps per frame
                    s = f / (n_fl * 4)
                    off = np.array([0, 0, dist * (1.0 - clamp01(s) ** 2.4)]) + lane * 0.004 * (1.0 - smooth((s - 0.78) / 0.22))
                    frames.append(('s=%.3f' % s, off, None))
                for f in range(1, n_set + 1):                     # settle
                    tau = f / FPS
                    off = np.array([0, 0, bounce * math.exp(-tau / 0.05) * abs(math.sin(2 * math.pi * 9.0 * tau))])
                    ang = math.radians(wobble_deg * math.exp(-tau / 0.07) * math.sin(2 * math.pi * 11.0 * tau))
                    frames.append(('settle+%d' % f, off, ang))
                for lab, off, ang in frames:
                    if ang:
                        R = np.array(Quaternion(perp, ang).to_matrix())
                        c = local @ R.T + org + off
                    else:
                        c = co + off
                    t = bvh(c, tv)
                    lo, hi = c.min(0), c.max(0)
                    for n, (ts, slo, shi) in st.items():
                        if np.any(lo > shi + 0.01) or np.any(slo > hi + 0.01):
                            continue
                        k = len(t.overlap(ts))
                        if k:
                            hits.setdefault(n, []).append(lab)
                        base = n[:-2]
                        if base in mind:
                            sel = np.all((c > slo - 0.01) & (c < shi + 0.01), axis=1)
                            dd = min(min_dist(c[sel], ts, 0.01), min_dist(GEO[n][0], t, 0.01)) if sel.any() else 0.01
                            if dd < mind[base][0]:
                                mind[base] = (dd, lab)
                print('  %s dist %.2f m: %s' % (name, dist, 'no intersection on the whole path' if not hits else 'HITS %s' % {k: (v[0], v[-1], len(v)) for k, v in hits.items()}))
                if dist == 1.3:
                    print('      closest approach (mm, when): ' + ', '.join('%s %.2f @%s' % (k, v[0] * 1000, v[1]) for k, v in mind.items() if v[1]))
