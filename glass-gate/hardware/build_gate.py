"""HYALO G1 glass speed gate - builds every part in its assembled pose.

    /opt/blender-env/venv/bin/python hardware/build_gate.py [--no-save] [--only L]

Writes hardware/gate.blend and hardware/manifest.json.
Part geometry lives in parts_*.py (pedestal-local millimetres, +x = lane side);
this file turns it into Blender objects for the L pedestal (as built) and the
R pedestal (mirror image, mesh mirrored - never a negative scale).
"""
import sys, os, json, math, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'shared'))
import bpy, bmesh
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import gg_common
import parts_base, parts_drive, parts_elec, parts_glass, parts_rail, parts_wing, parts_props

PX = 0.38                      # pedestal centre plane |x|
SHARP_ANGLE = math.radians(35.0)

# name: (viewport rgba, metallic, roughness, transmission, emission strength)
MATS = {
    'GLASS_BODY': ((0.78, 0.86, 0.98, 0.35), 0.0, 0.02, 1.0, 0.0),
    'GLASS_WING': ((0.80, 0.90, 1.00, 0.35), 0.0, 0.02, 1.0, 0.0),
    'GLASS_LENS': ((0.70, 0.80, 0.95, 0.45), 0.0, 0.0, 1.0, 0.0),
    'METAL_STEEL': ((0.78, 0.79, 0.80, 1), 1.0, 0.18, 0.0, 0.0),
    'METAL_ALU': ((0.62, 0.64, 0.68, 1), 1.0, 0.38, 0.0, 0.0),
    'METAL_DARK': ((0.07, 0.07, 0.08, 1), 1.0, 0.42, 0.0, 0.0),
    'BRASS': ((0.80, 0.58, 0.22, 1), 1.0, 0.25, 0.0, 0.0),
    'COPPER': ((0.85, 0.42, 0.26, 1), 1.0, 0.30, 0.0, 0.0),
    'SPRING_STEEL': ((0.30, 0.32, 0.36, 1), 1.0, 0.28, 0.0, 0.0),
    'PCB_GREEN': ((0.02, 0.22, 0.10, 1), 0.0, 0.35, 0.0, 0.0),
    'PCB_GOLD': ((0.95, 0.72, 0.25, 1), 1.0, 0.25, 0.0, 0.0),
    'CHIP_BLACK': ((0.02, 0.02, 0.022, 1), 0.0, 0.45, 0.0, 0.0),
    'CAP_ALU': ((0.70, 0.71, 0.73, 1), 1.0, 0.30, 0.0, 0.0),
    'PLASTIC_WHITE': ((0.85, 0.85, 0.83, 1), 0.0, 0.45, 0.0, 0.0),
    'PLASTIC_BLACK': ((0.025, 0.025, 0.028, 1), 0.0, 0.35, 0.0, 0.0),
    'RUBBER': ((0.015, 0.015, 0.015, 1), 0.0, 0.75, 0.0, 0.0),
    'CABLE_RED': ((0.65, 0.03, 0.03, 1), 0.0, 0.5, 0.0, 0.0),
    'CABLE_BLUE': ((0.03, 0.12, 0.65, 1), 0.0, 0.5, 0.0, 0.0),
    'CABLE_YELLOW': ((0.85, 0.60, 0.04, 1), 0.0, 0.5, 0.0, 0.0),
    'CABLE_WHITE': ((0.80, 0.80, 0.78, 1), 0.0, 0.5, 0.0, 0.0),
    'LED_STRIP': ((0.35, 0.30, 1.00, 1), 0.0, 0.3, 0.0, 2.0),
    'LED_DIFFUSER': ((0.82, 0.84, 0.98, 0.7), 0.0, 0.55, 0.6, 0.0),
    'LED_IR': ((1.00, 0.15, 0.35, 1), 0.0, 0.3, 0.0, 2.0),
    'LED_STATUS': ((0.10, 1.00, 0.30, 1), 0.0, 0.3, 0.0, 2.0),
    'SCREEN_LCD': ((0.03, 0.04, 0.07, 1), 0.0, 0.08, 0.0, 0.0),
    'SCREEN_WING': ((0.20, 0.35, 0.60, 0.25), 0.0, 0.05, 1.0, 0.0),
    'BADGE': ((0.70, 0.71, 0.74, 1), 1.0, 0.22, 0.0, 0.0),
    'PRINT_WHITE': ((0.92, 0.92, 0.92, 1), 0.0, 0.6, 0.0, 0.0),
}


def get_mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    rgba, metal, rough, trans, emis = MATS.get(name, ((1, 0, 1, 1), 0, 0.5, 0, 0))
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba
    m.metallic = metal
    m.roughness = rough
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    if nt:
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            def setv(key, val):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = val
            setv('Base Color', (rgba[0], rgba[1], rgba[2], 1.0))
            setv('Metallic', metal)
            setv('Roughness', rough)
            setv('Transmission Weight', trans)
            setv('IOR', 1.52 if trans else 1.5)
            if emis:
                setv('Emission Color', (rgba[0], rgba[1], rgba[2], 1.0))
                setv('Emission Strength', emis)
    return m


def island_check_fix(me):
    """Per connected shell: outward normals (signed volume > 0). Returns (#islands, #flipped, #nonmanifold edges)."""
    nv = len(me.vertices)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    nonman = sum(1 for e in bm.edges if not e.is_manifold)
    bm.to_mesh(me)
    bm.free()
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32)
    me.loop_triangles.foreach_get('vertices', tv)
    tv = tv.reshape(-1, 3)
    co = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)
    ne = len(me.edges)
    ed = np.empty(ne * 2, np.int32)
    me.edges.foreach_get('vertices', ed)
    ed = ed.reshape(-1, 2)
    g = coo_matrix((np.ones(ne, np.int8), (ed[:, 0], ed[:, 1])), shape=(nv, nv))
    ncomp, lab = connected_components(g, directed=False)
    p0, p1, p2 = co[tv[:, 0]], co[tv[:, 1]], co[tv[:, 2]]
    cen = co.mean(0)
    vol = np.einsum('ij,ij->i', p0 - cen, np.cross(p1 - cen, p2 - cen)) / 6.0
    volc = np.bincount(lab[tv[:, 0]], weights=vol, minlength=ncomp)
    bad = np.where(volc < 0)[0]
    if len(bad):
        badset = set(bad.tolist())
        bm = bmesh.new()
        bm.from_mesh(me)
        fl = [f for f in bm.faces if int(lab[f.verts[0].index]) in badset]
        bmesh.ops.reverse_faces(bm, faces=fl)
        bm.to_mesh(me)
        bm.free()
    return ncomp, len(bad), nonman


STATS = {'islands': 0, 'flipped': 0, 'nonmanifold': {}, 'tris': 0}


def make_object(name, part, side, coll):
    """Create one mesh object from a part dict for the given side."""
    mb = part['mb']
    v_mm = np.asarray(mb.v, dtype=np.float64)
    v = v_mm * 0.001
    o = np.asarray(part['origin'], dtype=np.float64) * 0.001
    sx = -1.0 if side == 'L' else 1.0
    # L: world x = -PX + x_local ; R: world x = +PX - x_local (mirror)
    wx = (-PX + v[:, 0]) if side == 'L' else (PX - v[:, 0])
    ow = np.array([(-PX + o[0]) if side == 'L' else (PX - o[0]), o[1], o[2]])
    vw = np.column_stack([wx, v[:, 1], v[:, 2]]) - ow
    me = bpy.data.meshes.new(name)
    me.from_pydata(vw.tolist(), [], mb.f)
    # materials
    names = []
    idx = {}
    mi = np.empty(len(mb.fm), np.int32)
    for i, m in enumerate(mb.fm):
        k = idx.get(m)
        if k is None:
            k = idx[m] = len(names)
            names.append(m)
        mi[i] = k
    for m in names:
        me.materials.append(get_mat(m))
    me.polygons.foreach_set('material_index', mi)
    me.update()
    ncomp, nflip, nonman = island_check_fix(me)
    STATS['islands'] += ncomp
    STATS['flipped'] += nflip
    if nonman:
        STATS['nonmanifold'][name] = nonman
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    me.set_sharp_from_angle(angle=SHARP_ANGLE)
    # UVs (planar projection per material), u flipped on the mirrored side so textures still read
    if part.get('uv'):
        uvl = me.uv_layers.new(name='UVMap')
        nl = len(me.loops)
        lv = np.empty(nl, np.int32)
        me.loops.foreach_get('vertex_index', lv)
        uv = np.zeros((nl, 2), np.float32)
        pm = np.empty(len(me.polygons), np.int32)
        me.polygons.foreach_get('material_index', pm)
        ls = np.empty(len(me.polygons), np.int32)
        me.polygons.foreach_get('loop_start', ls)
        lt = np.empty(len(me.polygons), np.int32)
        me.polygons.foreach_get('loop_total', lt)
        loop_poly = np.repeat(np.arange(len(me.polygons)), lt)
        loop_mat = pm[loop_poly]
        for mname, (org, uvec, vvec) in part['uv'].items():
            if mname not in idx:
                continue
            org, uvec, vvec = np.asarray(org, float), np.asarray(uvec, float), np.asarray(vvec, float)
            d = v_mm - org
            uu = d @ uvec / uvec.dot(uvec)
            vv = d @ vvec / vvec.dot(vvec)
            if side == 'R':
                uu = 1.0 - uu
            sel = loop_mat == idx[mname]
            uv[sel, 0] = uu[lv[sel]]
            uv[sel, 1] = vv[lv[sel]]
        uvl.data.foreach_set('uv', uv.ravel())
    if part.get('wave_fn'):
        at = me.attributes.new('wave_u', 'FLOAT', 'POINT')
        w = np.clip(np.asarray(part['wave_fn'](v_mm), np.float32), 0.0, 1.0)
        at.data.foreach_set('value', w)
    if mb.t is not None:
        at = me.attributes.new('grow_t', 'FLOAT', 'POINT')
        at.data.foreach_set('value', np.clip(np.asarray(mb.t, np.float32), 0.0, 1.0))
    ob = bpy.data.objects.new(name, me)
    ob.location = ow
    coll.objects.link(ob)
    part.setdefault('obj', {})[side] = ob
    part.setdefault('ow', {})[side] = ow
    return ob


def apply_weighted_normals(objs):
    for ob in objs:
        md = ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
        md.keep_sharp = True
        md.weight = 100
        md.mode = 'FACE_AREA'
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in objs:
        ev = ob.evaluated_get(dg)
        me2 = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
        old = ob.data
        ob.modifiers.clear()
        ob.data = me2
        me2.name = old.name
        bpy.data.meshes.remove(old)


def all_parts():
    parts = []
    parts += parts_base.build()
    parts += parts_drive.build()
    parts += [parts_glass.column()]
    parts += parts_wing.build_wave2()
    parts += parts_elec.build()
    parts += parts_glass.build_wave4()
    parts += clips()
    parts += parts_rail.build()
    parts += parts_wing.build()
    return parts


def clips():
    """Steel U clips under the side panels (wave 4)."""
    from gg_mesh import MB, prism, cap_screw, FRAME, T
    from parts_drive import P
    from parts_glass import PANEL_X0, PANEL_X1, PANEL_Z0
    out = []
    for nm, ys in (('GLS_clips_entry', -1), ('GLS_clips_exit', 1)):
        mb = MB('METAL_STEEL')
        u = [(PANEL_X0 - 4.4, 30.4), (PANEL_X1 + 4.4, 30.4), (PANEL_X1 + 4.4, 52.0), (PANEL_X1 + 0.4, 52.0), (PANEL_X1 + 0.4, PANEL_Z0 - 0.5),
             (PANEL_X0 - 0.4, PANEL_Z0 - 0.5), (PANEL_X0 - 0.4, 52.0), (PANEL_X0 - 4.4, 52.0)]
        for yc in (130.0, 430.0):
            c = prism(u, -15.0, 15.0, bevel=0.7, segs=2, mat='METAL_STEEL')
            mb.add(c, FRAME((0, ys * yc, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0)))
            mb.add(cap_screw(3.0, 0, n=12), FRAME((PANEL_X1 + 4.35, ys * yc, 44.0), (0, 1, 0), (0, 0, 1), (1, 0, 0)))
        out.append(P(nm, 4, 1, 'metal_small', mb, ((PANEL_X0 + PANEL_X1) / 2, ys * 280.0, 41.0)))
    return out


def build(save=True, sides=('L', 'R')):
    t0 = time.time()
    sc = gg_common.reset_scene()
    parts = all_parts()
    t1 = time.time()
    print('[build] %d part definitions in %.1fs' % (len(parts), t1 - t0))
    by_name = {p['name']: p for p in parts}
    colls = {}
    for s in sides:
        c = bpy.data.collections.new('GATE_' + s)
        sc.collection.children.link(c)
        colls[s] = c
    pivots = {}
    mesh_objs = []
    for s in sides:
        xw = -PX if s == 'L' else PX
        for pv in ('WING', 'DRV_out'):
            e = bpy.data.objects.new('%s_%s' % (pv, s), None)
            e.empty_display_type = 'ARROWS'
            e.empty_display_size = 0.05
            e.location = (xw, 0.0, 0.0)
            colls[s].objects.link(e)
            pivots[(pv, s)] = e
        for p in parts:
            ob = make_object('%s_%s' % (p['name'], s), p, s, colls[s])
            mesh_objs.append(ob)
        for p in parts:
            par = p.get('parent')
            if not par:
                continue
            ob = p['obj'][s]
            if par in ('WING', 'DRV_out'):
                po = pivots[(par, s)]
                pl = np.array(po.location)
            else:
                po = by_name[par]['obj'][s]
                pl = by_name[par]['ow'][s]
            ob.parent = po
            ob.location = p['ow'][s] - pl
    # ---- props (not part of the gate, not mirrored): the access card over the LEFT reader
    prop_info, prop_parts = [], []
    if 'L' in sides:
        pc = bpy.data.collections.new('PROPS')
        sc.collection.children.link(pc)
        pp, info = parts_props.card()
        for p in pp:
            mesh_objs.append(make_object(p['name'], p, 'L', pc))
        root = pp[0]['obj']['L']
        for p in pp[1:]:
            p['obj']['L'].parent = root
            p['obj']['L'].location = p['ow']['L'] - pp[0]['ow']['L']
        prop_parts = pp
        info['rest_location'] = [round(float(x), 5) for x in pp[0]['ow']['L']]
        info['size'] = [round(x * 0.001, 5) for x in info.pop('size_mm')]
        info['note'] = 'lies flat, long side along Y, centred over the card-tap icon of the L rail, 1.5 mm above the lid; hidden or animated by the director'
        prop_info.append(info)
    apply_weighted_normals(mesh_objs)
    bpy.context.view_layer.update()
    t2 = time.time()
    print('[build] objects in %.1fs' % (t2 - t1))

    # ---- manifest
    def bbox_world(ob):
        m = ob.matrix_world
        co = np.empty(len(ob.data.vertices) * 3, np.float32)
        ob.data.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3).astype(np.float64)
        A = np.array(m)
        w = co @ A[:3, :3].T + A[:3, 3]
        return w.min(0), w.max(0)

    def tris(ob):
        ob.data.calc_loop_triangles()
        return len(ob.data.loop_triangles)

    total = 0
    mparts = []
    children_of = {}
    for p in parts:
        if p.get('is_child'):
            children_of.setdefault(p['parent'], []).append(p)
    for s in sides:
        for p in parts:
            ob = p['obj'][s]
            n = tris(ob)
            total += n
            if p.get('is_child'):
                continue
            lo, hi = bbox_world(ob)
            ch = []
            for c in children_of.get(p['name'], []):
                co_ = c['obj'][s]
                ch.append(co_.name)
                l2, h2 = bbox_world(co_)
                lo, hi = np.minimum(lo, l2), np.maximum(hi, h2)
                n += tris(co_)
            ins = list(p['insert'])
            if s == 'R':
                ins[0] = -ins[0]
            e = {'name': ob.name, 'side': s, 'wave': p['wave'], 'order': p['order'], 'kind': p['kind'],
                 'insert_dir': [float(x) for x in ins], 'screw': bool(p['screw']), 'children': ch,
                 'bbox_min': [round(float(x), 5) for x in lo], 'bbox_max': [round(float(x), 5) for x in hi],
                 'origin': [round(float(x), 5) for x in ob.matrix_world.translation], 'triangles': n}
            if p.get('parent'):
                e['parent'] = '%s_%s' % (p['parent'], s)
            mparts.append(e)
    for p in prop_parts:
        total += tris(p['obj']['L'])
    mparts.sort(key=lambda e: (e['wave'], e['order'], e['side'], e['name']))
    STATS['tris'] = total
    used = sorted({m.name for ob in mesh_objs for m in ob.data.materials})
    R = parts_drive
    man = {
        'units': 'm',
        'brand': 'HYALO G1',
        'pedestal_x': PX,
        'wing_open_angle_deg': {'WING_L': 90, 'WING_R': -90},
        'gear': {
            'sun': ['DRV_sun_%s' % s for s in sides],
            'carrier': ['DRV_out_%s' % s for s in sides],
            'carrier_mesh': ['DRV_carrier_%s' % s for s in sides],
            'planets': ['DRV_planet_%d_%s' % (i, s) for s in sides for i in range(3)],
            'ring': ['DRV_ring_%s' % s for s in sides],
            'ratio': R.RATIO,
            'teeth': {'sun': R.N_SUN, 'planet': R.N_PLANET, 'ring': R.N_RING},
            'module_mm': R.MOD,
            'planet_local_spin_per_carrier': -float(R.N_RING) / R.N_PLANET,
            'note': ('Ring gear is fixed. Output angle a (rad, about +Z): set DRV_out_<s>.rotation_euler.z = a '
                     '(pivot Empty on the column axis; carrier plate, 3 planets, output shaft and encoder disc are its children), '
                     'DRV_sun_<s>.rotation_euler.z = ratio * a, each DRV_planet_<i>_<s>.rotation_euler.z = -3 * a (local spin about its own axis), '
                     'WING_<s>.rotation_euler.z = a. Wing open: a = +90 deg for L, -90 deg for R.'),
        },
        'pivots': {
            ('%s_%s' % (pv, s)): {'location': [(-PX if s == 'L' else PX), 0.0, 0.0],
                                  'children': sorted(o.name for o in pivots[(pv, s)].children)}
            for s in sides for pv in ('WING', 'DRV_out')
        },
        'materials': used,
        'wave_u': {'attribute': 'wave_u', 'domain': 'POINT',
                   'objects': sorted(ob.name for ob in mesh_objs if 'wave_u' in ob.data.attributes),
                   'ranges': {'RAIL_led': [0.02, 0.88], 'LED_accent_entry': [0.03, 0.06], 'LED_colring': [0.47, 0.47],
                              'LED_accent_exit': [0.89, 0.92], 'WING_edgeled': [0.92, 1.0]},
                   'diffusers': sorted(ob.name for ob in mesh_objs if ob.name.rsplit('_', 1)[0].endswith('_diffuser')),
                   'note': 'every LED part has a child <name>_diffuser_<s> (material LED_DIFFUSER) carrying the same wave_u as the chips under it'},
        'grow_t': {'attribute': 'grow_t', 'domain': 'POINT',
                   'objects': sorted(ob.name for ob in mesh_objs if 'grow_t' in ob.data.attributes),
                   'note': ('0..1 along each cable from its first end to its last (plugs carry the value of their end). Optional: lets a cable be '
                            '"laid" along its path (hide where grow_t > x) instead of dropping it in; cables 0 and 1 run under the column in the base channel.')},
        'uv': {'SCREEN_LCD': 'RAIL_lcd_<s>: 0..1 over the screen, v towards +Y (away from the user), u to the user\'s right',
               'SCREEN_WING': 'WING_display_<s>: 0..1 over the layer, v up, u to the right when seen from the entry side (-Y)',
               'BADGE': 'RAIL_badge_<s>: 0..1 over the front face, v up, u to the right when seen from the lane',
               'PCB_GREEN': 'ELE_pcb_<s> (and the small rail PCBs): 0..1 over the board'},
        'triangles': total,
        'props': prop_info,
        'parts': mparts,
    }
    if save:
        out = os.path.join(HERE, 'gate.blend')
        bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
        with open(os.path.join(HERE, 'manifest.json'), 'w') as f:
            json.dump(man, f, indent=1)
        b1 = out + '1'
        if os.path.exists(b1):
            os.remove(b1)
    print('[build] total %.1fs  objects=%d  manifest parts=%d  triangles=%d' % (time.time() - t0, len(mesh_objs), len(mparts), total))
    print('[build] shells=%d flipped=%d nonmanifold=%s' % (STATS['islands'], STATS['flipped'], STATS['nonmanifold'] or 'none'))
    import gg_mesh
    if gg_mesh.OFFSET_WARN:
        print('[build] WARNING bevel larger than a feature (edge flipped) in:', gg_mesh.OFFSET_WARN)
    return sc, parts, man


if __name__ == '__main__':
    args = sys.argv[1:]
    sides = ('L', 'R')
    if '--only' in args:
        sides = (args[args.index('--only') + 1],)
    build(save='--no-save' not in args, sides=sides)
