"""Glass-validity and clearance checks on hardware/gate.blend.

    /opt/blender-env/venv/bin/python hardware/validate.py [--all-pairs]

Checks, per mesh object: closed manifold, outward normals per shell (signed volume).
Per glass object: triangle-triangle intersections with every other object, minimum
air gap to every neighbour (vertex<->surface, both ways), wall thickness (inward rays).
Writes hardware/validation.json.
"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
import bpy, bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

GLASS = ('GLASS_BODY', 'GLASS_WING')
MIN_GAP = 0.0003


def world_geo(ob):
    me = ob.data
    A = np.array(ob.matrix_world)
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64) @ A[:3, :3].T + A[:3, 3]
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32)
    me.loop_triangles.foreach_get('vertices', tv)
    return co, tv.reshape(-1, 3)


def shell_report(ob, co, tv):
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    nonman = sum(1 for e in bm.edges if not e.is_manifold)
    bnd = sum(1 for e in bm.edges if e.is_boundary)
    bm.free()
    ne = len(me.edges)
    ed = np.empty(ne * 2, np.int32)
    me.edges.foreach_get('vertices', ed)
    ed = ed.reshape(-1, 2)
    nv = len(co)
    g = coo_matrix((np.ones(ne, np.int8), (ed[:, 0], ed[:, 1])), shape=(nv, nv))
    ncomp, lab = connected_components(g, directed=False)
    cen = co.mean(0)
    p0, p1, p2 = co[tv[:, 0]] - cen, co[tv[:, 1]] - cen, co[tv[:, 2]] - cen
    vol = np.einsum('ij,ij->i', p0, np.cross(p1, p2)) / 6.0
    volc = np.bincount(lab[tv[:, 0]], weights=vol, minlength=ncomp)
    return dict(nonmanifold=nonman, boundary=bnd, shells=int(ncomp), inverted=int((volc <= 0).sum()),
                volume_cm3=float(volc.sum() * 1e6))


def main():
    path = os.path.join(HERE, 'gate.blend')
    bpy.ops.wm.open_mainfile(filepath=path)
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    geo = {}
    rep = {'objects': len(objs), 'problems': [], 'glass': {}}
    tot_tris = 0
    bb = {}
    for o in objs:
        co, tv = world_geo(o)
        geo[o.name] = (co, tv)
        bb[o.name] = (co.min(0), co.max(0))
        tot_tris += len(tv)
        r = shell_report(o, co, tv)
        if r['nonmanifold'] or r['boundary'] or r['inverted']:
            rep['problems'].append((o.name, r))
        if o.scale[:] != (1.0, 1.0, 1.0) or min(o.scale) < 0:
            rep['problems'].append((o.name, 'scale %s' % (o.scale[:],)))
        if o.modifiers:
            rep['problems'].append((o.name, 'unapplied modifiers'))
    rep['triangles'] = tot_tris
    lo = np.min([b[0] for b in bb.values()], axis=0)
    hi = np.max([b[1] for b in bb.values()], axis=0)
    rep['bbox'] = [lo.round(4).tolist(), hi.round(4).tolist()]

    def is_glass(o):
        ms = [m.name for m in o.data.materials]
        return ms and all(m in GLASS for m in ms)

    glass = [o for o in objs if is_glass(o)]
    mixed = [o.name for o in objs if any(m.name in GLASS for m in o.data.materials) and not is_glass(o)]
    if mixed:
        rep['problems'].append(('mixed glass/non-glass objects', mixed))
    trees = {}

    def tree(name):
        if name not in trees:
            co, tv = geo[name]
            trees[name] = BVHTree.FromPolygons([Vector(p) for p in co], [tuple(int(i) for i in t) for t in tv], epsilon=0.0)
        return trees[name]

    worst_gap = (9.0, None, None)
    n_inter = 0
    for g in glass:
        gco, gtv = geo[g.name]
        glo, ghi = bb[g.name]
        tg = tree(g.name)
        entry = {'neighbours': 0, 'intersections': {}, 'min_gap_mm': None, 'closest': None}
        # shells / manifold
        entry.update(shell_report(g, gco, gtv))
        # wall thickness by inward rays from a sample of face centres
        me = g.data
        pn = np.empty(len(me.polygons) * 3, np.float32)
        me.polygons.foreach_get('normal', pn)
        pc = np.empty(len(me.polygons) * 3, np.float32)
        me.polygons.foreach_get('center', pc)
        A = np.array(g.matrix_world)
        pn = pn.reshape(-1, 3).astype(np.float64) @ A[:3, :3].T
        pc = pc.reshape(-1, 3).astype(np.float64) @ A[:3, :3].T + A[:3, 3]
        idx = np.linspace(0, len(pc) - 1, min(len(pc), 4000)).astype(int)
        th = []
        for i in idx:
            n = Vector(pn[i])
            hit = tg.ray_cast(Vector(pc[i]) - n * 1e-5, -n)
            if hit[0] is not None:
                th.append(hit[3])
        th = np.array(th)
        entry['wall_mm'] = {'min': round(float(th.min() * 1000), 2), 'p05': round(float(np.percentile(th, 5) * 1000), 2),
                            'median': round(float(np.median(th) * 1000), 2)}
        gmin = (9.0, None)
        for o in objs:
            if o is g:
                continue
            olo, ohi = bb[o.name]
            if np.any(olo > ghi + 0.003) or np.any(ohi < glo - 0.003):
                continue
            entry['neighbours'] += 1
            to = tree(o.name)
            ov = tg.overlap(to)
            if ov:
                entry['intersections'][o.name] = len(ov)
                n_inter += len(ov)
            oco, otv = geo[o.name]
            # other's vertices -> glass surface
            sel = np.all((oco > glo - 0.003) & (oco < ghi + 0.003), axis=1)
            d1 = 9.0
            for p in oco[sel]:
                r = tg.find_nearest(Vector(p), 0.003)
                if r[0] is not None and r[3] < d1:
                    d1 = r[3]
            # glass vertices -> other's surface
            sel = np.all((gco > olo - 0.003) & (gco < ohi + 0.003), axis=1)
            for p in gco[sel]:
                r = to.find_nearest(Vector(p), 0.003)
                if r[0] is not None and r[3] < d1:
                    d1 = r[3]
            if d1 < gmin[0]:
                gmin = (d1, o.name)
        entry['min_gap_mm'] = None if gmin[1] is None else round(gmin[0] * 1000, 3)
        entry['closest'] = gmin[1]
        if gmin[0] < worst_gap[0]:
            worst_gap = (gmin[0], g.name, gmin[1])
        if gmin[0] < MIN_GAP:
            rep['problems'].append((g.name, 'gap %.3f mm to %s' % (gmin[0] * 1000, gmin[1])))
        if entry['intersections']:
            rep['problems'].append((g.name, 'intersects %s' % entry['intersections']))
        rep['glass'][g.name] = entry
    rep['glass_intersections'] = n_inter
    rep['worst_gap_mm'] = [round(worst_gap[0] * 1000, 3), worst_gap[1], worst_gap[2]]

    # small glass elements (lenses) inside mixed objects are skipped on purpose (they are sunk into their mounts)
    if '--all-pairs' in sys.argv:
        names = [o.name for o in objs]
        pairs = {}
        for i, a in enumerate(names):
            for b in names[i + 1:]:
                if a[-1] != b[-1]:
                    continue
                if np.any(bb[a][0] > bb[b][1]) or np.any(bb[b][0] > bb[a][1]):
                    continue
                ov = tree(a).overlap(tree(b))
                if ov:
                    pairs['%s | %s' % (a, b)] = len(ov)
        rep['all_pair_intersections'] = pairs
    with open(os.path.join(HERE, 'validation.json'), 'w') as f:
        json.dump(rep, f, indent=1)
    print('objects', rep['objects'], 'triangles', rep['triangles'], 'bbox', rep['bbox'])
    print('glass objects:', len(glass))
    for k, e in sorted(rep['glass'].items()):
        print('  %-20s shells=%d nonman=%d inverted=%d wall(min/p05/med)=%s gap=%s mm (%s) inter=%s' % (
            k, e['shells'], e['nonmanifold'], e['inverted'], list(e['wall_mm'].values()), e['min_gap_mm'], e['closest'], e['intersections'] or 0))
    print('worst gap', rep['worst_gap_mm'], ' glass intersections', n_inter)
    if '--all-pairs' in sys.argv:
        print('all-pair intersections (same side):')
        for k, v in sorted(rep['all_pair_intersections'].items()):
            print('   ', k, v)
    print('PROBLEMS:' if rep['problems'] else 'no problems')
    for p in rep['problems']:
        print('  ', p)


if __name__ == '__main__':
    main()
