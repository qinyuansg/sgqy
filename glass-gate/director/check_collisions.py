"""Do parts pass through each other? Triangle-level check of the animated scene.

  /opt/blender-env/venv/bin/python director/check_collisions.py [--blend director/scene.blend] [--step 1]

1. Hook: every pair of parts in the exploded hover pose (frames 0 and 50).
2. Build: every part during its flight, every `step` frames, against all parts that have already landed and
   against other parts in flight. Pairs that touch in the assembled gate (plugs, press fits, screws in holes)
   are allowed to touch during the last 30 mm of the flight only.
Writes director/collisions.json.
"""
import bpy, sys, os, json, argparse
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--blend', default=os.path.join(HERE, 'scene.blend'))
ap.add_argument('--step', type=int, default=1)
a = ap.parse_args()
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
sc = bpy.context.scene
FL = json.load(open(os.path.join(os.path.dirname(os.path.abspath(a.blend)), 'flights.json')))
flights = FL['flights']; names = set(flights)

def family(o):
    out = [o]; st = list(o.children)
    while st:
        c = st.pop()
        if c.name in names: continue
        out.append(c); st.extend(c.children)
    return [m for m in out if m.type == 'MESH']

fam = {n: family(bpy.data.objects[n]) for n in names}
local = {}
for n, ms in fam.items():
    for m in ms:
        me = m.data
        local[m.name] = ([v.co.copy() for v in me.vertices], [tuple(p.vertices) for p in me.polygons])

def world_bvh(n):
    verts, polys, off = [], [], 0
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for m in fam[n]:
        vs, ps = local[m.name]
        mw = m.matrix_world
        for v in vs:
            w = mw @ v; verts.append(w)
            lo.x = min(lo.x, w.x); lo.y = min(lo.y, w.y); lo.z = min(lo.z, w.z)
            hi.x = max(hi.x, w.x); hi.y = max(hi.y, w.y); hi.z = max(hi.z, w.z)
        polys.extend(tuple(i + off for i in p) for p in ps)
        off += len(vs)
    return BVHTree.FromPolygons(verts, polys, epsilon=0.0), lo, hi

def bb_hit(a, b, pad=0.0):
    return all(a[0][i] - pad <= b[1][i] and b[0][i] - pad <= a[1][i] for i in range(3))

# rest pose: everything assembled, just before the drop
sc.frame_set(955)
rest = {n: world_bvh(n) for n in names}
rest_loc = {n: bpy.data.objects[n].matrix_world.translation.copy() for n in names}
order = sorted(names)
rest_pairs = set()
for i, n in enumerate(order):
    for m in order[i + 1:]:
        if bb_hit(rest[n][1:], rest[m][1:]) and rest[n][0].overlap(rest[m][0]):
            rest_pairs.add((n, m))
print(f'[rest] {len(rest_pairs)} pairs touch in the assembled gate (plugs, press fits, seats)')

report = dict(rest_pairs=len(rest_pairs), hook=[], build=[])
# 1. hook
for f in (0, 50):
    sc.frame_set(f)
    cur = {n: world_bvh(n) for n in names}
    for i, n in enumerate(order):
        for m in order[i + 1:]:
            if bb_hit(cur[n][1:], cur[m][1:]):
                k = len(cur[n][0].overlap(cur[m][0]))
                if k:
                    report['hook'].append(dict(frame=f, a=n, b=m, tri_pairs=k, also_at_rest=(n, m) in rest_pairs))
bad_hook = [h for h in report['hook'] if not h['also_at_rest']]
print(f'[hook] {len(report["hook"])} overlapping pairs in the exploded pose, {len(bad_hook)} of them not also touching at rest')
for h in bad_hook[:30]:
    print('   ', h)

# 2. build
by_frame = {}
for n, fl in flights.items():
    for f in range(fl['vis0'], fl['land'] + 1, a.step):
        by_frame.setdefault(f, []).append(n)
hits = {}
for f in sorted(by_frame):
    sc.frame_set(f)
    moving = {n: world_bvh(n) for n in by_frame[f]}
    for n, (bv, lo, hi) in moving.items():
        dist = (bpy.data.objects[n].matrix_world.translation - rest_loc[n]).length
        for m in names:
            if m == n: continue
            if m in moving:
                if m < n: continue
                other = moving[m]
            elif flights[m]['land'] < f:
                other = rest[m]
            else:
                continue
            if not bb_hit((lo, hi), other[1:]): continue
            pair = (n, m) if n < m else (m, n)
            if pair in rest_pairs and dist < 0.03: continue
            k = len(bv.overlap(other[0]))
            if k:
                h = hits.setdefault((n, m), dict(a=n, b=m, frames=[], max_tri_pairs=0, max_dist_from_seat=0.0, touch_at_rest=pair in rest_pairs))
                h['frames'].append(f); h['max_tri_pairs'] = max(h['max_tri_pairs'], k); h['max_dist_from_seat'] = round(max(h['max_dist_from_seat'], dist), 4)
report['build'] = sorted(hits.values(), key=lambda h: -len(h['frames']))
print(f'[build] {len(report["build"])} part pairs intersect during a flight')
for h in report['build'][:60]:
    print(f"    {h['a']:22s} x {h['b']:22s} frames {h['frames'][0]}-{h['frames'][-1]} ({len(h['frames'])})  tri pairs {h['max_tri_pairs']}  up to {h['max_dist_from_seat'] * 1000:.0f} mm from seat  rest-touch={h['touch_at_rest']}")
json.dump(report, open(os.path.join(HERE, 'collisions.json'), 'w'), indent=1)
