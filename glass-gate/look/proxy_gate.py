"""Helper B proxy gate — a stand-in for hardware/gate.blend, built to the spec envelope with the
contract material names, so the look can be developed before the real gate exists.

    /opt/blender-env/venv/bin/python look/proxy_gate.py            -> look/proxy_gate.blend

It is NOT the product model (Helper A owns that). It has just enough of the right kind of geometry:
closed bevelled glass solids (rail lid, fluted end posts, column tubes, side panels, wings), a finned motor,
a meshing brass planetary set, a PCB with parts, cables, an LED line with the `wave_u` attribute, screens with
UV 0..1, a badge. Coordinates per shared/SPEC.md.
"""
import bpy, bmesh, math, os, sys
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))

PLACEHOLDER = {
    'GLASS_BODY': (0.7, 0.85, 1.0), 'GLASS_WING': (0.75, 0.9, 1.0), 'GLASS_LENS': (0.3, 0.4, 0.6),
    'METAL_STEEL': (0.7, 0.7, 0.72), 'METAL_ALU': (0.6, 0.62, 0.65), 'METAL_DARK': (0.08, 0.08, 0.1),
    'BRASS': (0.8, 0.6, 0.2), 'COPPER': (0.8, 0.4, 0.25), 'SPRING_STEEL': (0.3, 0.32, 0.4),
    'PCB_GREEN': (0.05, 0.3, 0.12), 'PCB_GOLD': (0.9, 0.7, 0.2), 'CHIP_BLACK': (0.03, 0.03, 0.03),
    'CAP_ALU': (0.5, 0.5, 0.55), 'PLASTIC_WHITE': (0.9, 0.9, 0.9), 'PLASTIC_BLACK': (0.02, 0.02, 0.02),
    'RUBBER': (0.01, 0.01, 0.01), 'CABLE_RED': (0.7, 0.05, 0.05), 'CABLE_BLUE': (0.05, 0.1, 0.7),
    'CABLE_YELLOW': (0.8, 0.7, 0.05), 'CABLE_WHITE': (0.85, 0.85, 0.85), 'LED_STRIP': (0.3, 0.3, 1.0),
    'LED_IR': (1.0, 0.2, 0.5), 'LED_STATUS': (0.1, 1.0, 0.2), 'SCREEN_LCD': (0.1, 0.1, 0.15),
    'SCREEN_WING': (0.2, 0.3, 0.4), 'BADGE': (0.6, 0.6, 0.6), 'PRINT_WHITE': (1, 1, 1),
}


def mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        c = PLACEHOLDER.get(name, (0.5, 0.5, 0.5))
        m.diffuse_color = (*c, 1.0)
    return m


# ----------------------------------------------------------------------------------------------- mesh helpers
def new_obj(name, verts, faces, material, coll, parent=None, matrix=None, uvs=None, smooth=True, fix_normals=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if fix_normals:
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
    if uvs is not None:
        uv = me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            for li in poly.loop_indices:
                uv.data[li].uv = uvs[me.loops[li].vertex_index]
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        me.set_sharp_from_angle(angle=math.radians(32))
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    if matrix is not None:
        ob.matrix_local = matrix
    return ob


def sweep(outline_fn, profile, closed=False, cap_start=True, cap_end=True):
    """outline_fn(d) -> list of N (x, y) for an inward offset d; profile = [(d, z), ...]."""
    rings = [outline_fn(d) for d, _ in profile]
    N, K = len(rings[0]), len(profile)
    verts = [(x, y, profile[k][1]) for k in range(K) for (x, y) in rings[k]]
    faces = []
    for k in range(K if closed else K - 1):
        k2 = (k + 1) % K
        for i in range(N):
            j = (i + 1) % N
            faces.append((k * N + i, k * N + j, k2 * N + j, k2 * N + i))
    if not closed:
        if cap_start:
            faces.append(tuple(reversed(range(N))))
        if cap_end:
            faces.append(tuple((K - 1) * N + i for i in range(N)))
    return verts, faces


def bev(d0, z0, d1, z1, seg=2):
    """Quarter-round from (d0,z0) to (d1,z1) (exclusive of the end points)."""
    out = []
    for i in range(1, seg):
        a = (i / seg) * math.pi / 2
        out.append((d0 + (d1 - d0) * (1 - math.cos(a)), z0 + (z1 - z0) * math.sin(a)))
    return out


def wall_profile(w, z0, z1, c=0.002, seg=3):
    """Closed rounded-rectangle profile of a wall (d: 0..w, z: z0..z1)."""
    p = [(0, z0 + c)]
    p += [(0, z1 - c)] + bev(0, z1 - c, c, z1, seg) + [(c, z1)]
    p += [(w - c, z1)] + [(w - c + (c) * (1 - math.cos(a)) * 0 + c * math.sin(a), z1 - c * (1 - math.cos(a)))
                          for a in [math.pi / 2 * i / seg for i in range(1, seg)]] + [(w, z1 - c)]
    p += [(w, z0 + c)] + [(w - c * (1 - math.cos(a)), z0 + c - c * math.sin(a))
                          for a in [math.pi / 2 * i / seg for i in range(1, seg)]] + [(w - c, z0)]
    p += [(c, z0)] + [(c - c * math.sin(a), z0 + c * (1 - math.cos(a)))
                      for a in [math.pi / 2 * i / seg for i in range(1, seg)]]
    return p


def solid_profile(z0, z1, c=0.001, seg=2):
    """Open profile of a capped prism with chamfered top and bottom."""
    return [(c, z0)] + [(c - c * math.sin(a), z0 + c * (1 - math.cos(a)))
                        for a in [math.pi / 2 * i / seg for i in range(1, seg)]] + [(0, z0 + c), (0, z1 - c)] \
        + bev(0, z1 - c, c, z1, seg) + [(c, z1)]


def circle(r, n=64, cx=0.0, cy=0.0):
    def f(d):
        rr = max(r - d, 1e-5)
        return [(cx + rr * math.cos(2 * math.pi * i / n), cy + rr * math.sin(2 * math.pi * i / n)) for i in range(n)]
    return f


def stadium(half, r, cx=0.0, arc=28, straight=6):
    """Stadium along Y: total length 2*half, half-width r."""
    def f(d):
        rr = max(r - d, 1e-5)
        yc = half - r
        pts = []
        for i in range(arc + 1):                      # +Y cap, from +x round to -x
            a = math.pi * i / arc
            pts.append((cx + rr * math.cos(a), yc + rr * math.sin(a)))
        for i in range(1, straight):
            pts.append((cx - rr, yc - 2 * yc * i / straight))
        for i in range(arc + 1):
            a = math.pi + math.pi * i / arc
            pts.append((cx + rr * math.cos(a), -yc + rr * math.sin(a)))
        for i in range(1, straight):
            pts.append((cx + rr, -yc + 2 * yc * i / straight))
        return pts
    return f


def dpost(end, cx, r=0.068, yc=0.632, yback=0.505, flutes=11, depth=0.0028, per=9):
    """End-post outline: fluted half-round at the end, straight sides, flat back. end = -1 entry, +1 exit."""
    def f(d):
        rr = r - d
        amp = depth * max(0.0, 1.0 - d / 0.003)
        pts = []
        n = flutes * per
        for i in range(n + 1):
            t = i / n
            a = math.pi * t
            sc = abs(math.sin(math.pi * flutes * t)) ** 0.8         # scalloped flutes
            rad = rr - amp * (1 - sc)
            pts.append((cx + rad * math.cos(a), end * (yc + rad * math.sin(a))))
        yb = yback + d
        for i in range(1, 5):
            pts.append((cx - rr, end * (yc + (yb - yc) * i / 4)))
        cr = 0.004 * max(0.2, 1 - d / 0.01)
        pts[-1] = (cx - rr, end * (yb + cr)); pts.append((cx - rr + cr, end * yb))
        pts.append((cx + rr - cr, end * yb)); pts.append((cx + rr, end * (yb + cr)))
        for i in range(3, 0, -1):
            pts.append((cx + rr, end * (yc + (yb - yc) * i / 4)))
        return pts
    return f


def roundrect(w, h, r, n=8):
    """Rounded rectangle centred on the origin in XY; inward offset shrinks it."""
    def f(d):
        hw, hh, rr = w / 2 - d, h / 2 - d, max(r - d, 1e-4)
        pts = []
        for (sx, sy, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
            for i in range(n + 1):
                a = math.radians(a0 + 90 * i / n)
                pts.append((sx * (hw - rr) + rr * math.cos(a), sy * (hh - rr) + rr * math.sin(a)))
        return pts
    return f


def gear(n, rp, m, internal=False, phase=0.0, per=10):
    """Trapezoid-tooth gear outline (pitch radius rp, module m); a tooth is centred on angle `phase`."""
    def f(d):
        tip = rp - m if internal else rp + m
        root = rp + 1.25 * m if internal else rp - 1.25 * m
        sgn = 1 if internal else -1
        pts = []
        for t in range(n):
            for i in range(per):
                u = i / per                                   # 0..1 across one pitch, tooth centred at u=0.5
                if u < 0.15: r = root
                elif u < 0.36: r = root + (tip - root) * (u - 0.15) / 0.21
                elif u < 0.64: r = tip
                elif u < 0.85: r = tip + (root - tip) * (u - 0.64) / 0.21
                else: r = root
                a = phase + 2 * math.pi * (t + u - 0.5) / n
                r = r + sgn * d
                pts.append((r * math.cos(a), r * math.sin(a)))
        return pts
    return f


def box(name, size, material, coll, loc=(0, 0, 0), bevel=0.0008, seg=2, parent=None, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size) * 0.3), segments=seg, affect='EDGES', profile=0.5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); me.set_sharp_from_angle(angle=math.radians(32))
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
    if parent is not None: ob.parent = parent
    M = Matrix.Translation(loc)
    if rot is not None: M = M @ rot
    ob.matrix_local = M
    return ob


def cyl(name, r, z0, z1, material, coll, loc=(0, 0), n=40, c=0.0008, parent=None):
    v, f = sweep(circle(r, n), solid_profile(z0, z1, c))
    return new_obj(name, v, f, material, coll, parent=parent, matrix=Matrix.Translation((loc[0], loc[1], 0)))


def tube_path(name, pts, r, material, coll, seg=10, parent=None):
    pts = [Vector(p) for p in pts]
    verts, faces = [], []
    up = Vector((0, 0, 1))
    prev_n = None
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        n = prev_n - t * prev_n.dot(t) if prev_n is not None else (up - t * up.dot(t))
        if n.length < 1e-6: n = Vector((1, 0, 0)) - t * t.x
        n.normalize(); b = t.cross(n); prev_n = n
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append(tuple(p + r * (math.cos(a) * n + math.sin(a) * b)))
    K = len(pts)
    for k in range(K - 1):
        for i in range(seg):
            j = (i + 1) % seg
            faces.append((k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i))
    faces.append(tuple(reversed(range(seg)))); faces.append(tuple((K - 1) * seg + i for i in range(seg)))
    return new_obj(name, verts, faces, material, coll, parent=parent)


def bezier(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(tuple((1 - t) ** 3 * Vector(p0) + 3 * (1 - t) ** 2 * t * Vector(p1) + 3 * (1 - t) * t * t * Vector(p2) + t ** 3 * Vector(p3)))
    return out


def quad(name, corners, material, coll, parent=None, matrix=None):
    """Flat quad with UV 0..1: corners given as (u0v0, u1v0, u1v1, u0v1)."""
    return new_obj(name, list(corners), [(0, 1, 2, 3)], material, coll, parent=parent, matrix=matrix,
                   uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], smooth=False, fix_normals=False)


def set_wave_u(ob, fn):
    """fn(world_co) -> wave_u"""
    me = ob.data
    at = me.attributes.get('wave_u') or me.attributes.new('wave_u', 'FLOAT', 'POINT')
    bpy.context.view_layer.update()
    mw = ob.matrix_world
    for i, v in enumerate(me.vertices):
        at.data[i].value = max(0.0, min(1.0, fn(mw @ v.co)))


# ----------------------------------------------------------------------------------------------- the gate
def rail_u(y):
    return 0.05 + 0.75 * (y + 0.70) / 1.40


def build_pedestal(side, coll):
    s = -1 if side == 'L' else 1
    cx = s * 0.38
    T = Matrix.Translation
    P = lambda n: f'{n}_{side}'
    parts = []

    # --- wave 1: base
    v, f = sweep(stadium(0.70, 0.07), solid_profile(0.0, 0.030, 0.003, 3))
    parts.append(new_obj(P('BASE_rail'), v, f, 'METAL_ALU', coll, matrix=T((cx, 0, 0))))
    for i, y in enumerate((-0.6, -0.2, 0.2, 0.6)):
        cyl(P(f'BASE_bolt{i}'), 0.007, 0.030, 0.037, 'METAL_STEEL', coll, loc=(cx + s * 0.045, y), n=16)

    # --- wave 2: drive in the lower column
    v, f = sweep(gear(24, 0.040, 0.0022, per=6), solid_profile(0.045, 0.200, 0.0015))
    new_obj(P('DRV_motor'), v, f, 'METAL_ALU', coll, matrix=T((cx, 0, 0)))
    cyl(P('DRV_endbell'), 0.036, 0.2003, 0.214, 'METAL_DARK', coll, loc=(cx, 0), c=0.002)
    v, f = sweep(gear(36, 0.030, 0.0012, per=6), solid_profile(0.2143, 0.228, 0.002))
    new_obj(P('DRV_windings'), v, f, 'COPPER', coll, matrix=T((cx, 0, 0)))
    cyl(P('DRV_brake'), 0.043, 0.2300, 0.238, 'METAL_STEEL', coll, loc=(cx, 0), c=0.001)
    cyl(P('DRV_carrier'), 0.036, 0.2420, 0.2475, 'METAL_STEEL', coll, loc=(cx, 0), c=0.001)
    m = 0.0015; rs = 18 * m / 2; rr = 54 * m / 2
    z0, z1 = 0.2500, 0.2740
    # ring gear: outer cylinder wall + internal teeth
    outer = circle(0.0475, 54 * 10)
    inner = gear(54, rr, m, internal=True, phase=0.0, per=10)
    def ring_outline(d):
        return outer(0) if d < 0.5 else inner(0)
    v, f = sweep(ring_outline, [(0, z0), (0, z1), (1, z1), (1, z0)], closed=True)
    new_obj(P('DRV_ring'), v, f, 'BRASS', coll, matrix=T((cx, 0, 0)))
    v, f = sweep(gear(18, rs, m, phase=0.0), solid_profile(z0, z1 + 0.002, 0.0006))
    new_obj(P('DRV_sun'), v, f, 'BRASS', coll, matrix=T((cx, 0, 0)))
    for k in range(3):
        a = 2 * math.pi * k / 3
        v, f = sweep(gear(18, rs, m, phase=a + math.pi / 18), solid_profile(z0, z1, 0.0006))
        new_obj(P(f'DRV_planet{k}'), v, f, 'BRASS', coll, matrix=T((cx + 2 * rs * math.cos(a), 2 * rs * math.sin(a), 0)))
        cyl(P(f'DRV_pin{k}'), 0.004, 0.2478, z1 + 0.003, 'METAL_STEEL', coll, loc=(cx + 2 * rs * math.cos(a), 2 * rs * math.sin(a)), n=20, c=0.0006)
    cyl(P('DRV_shaft'), 0.009, z1 + 0.0022, 0.918, 'METAL_STEEL', coll, loc=(cx, 0), n=32, c=0.001)
    cyl(P('DRV_encoder'), 0.032, 0.380, 0.3815, 'METAL_STEEL', coll, loc=(cx, 0), c=0.0004)
    helix = [(cx + 0.0155 * math.cos(t), 0.0155 * math.sin(t), 0.295 + 0.07 * t / (2 * math.pi * 9)) for t in
             [2 * math.pi * 9 * i / 288 for i in range(289)]]
    tube_path(P('DRV_spring'), helix, 0.0022, 'SPRING_STEEL', coll, seg=8)
    # glass column
    v, f = sweep(circle(0.060, 96), wall_profile(0.008, 0.031, 0.400, 0.0022), closed=True)
    parts.append(new_obj(P('GLS_column_lower'), v, f, 'GLASS_BODY', coll, matrix=T((cx, 0, 0))))

    # --- wave 3: electronics
    e = -1  # entry post: controller PCB, standing in the plane x = cx
    pcb = new_obj(P('ELC_pcb'), *box_data((0.0016, 0.110, 0.300)), 'PCB_GREEN', coll, matrix=T((cx, e * 0.608, 0.46)),
                  smooth=False)
    box_uv(pcb, axis_u=(0, 1, 0), axis_v=(0, 0, 1))
    fx = -s  # components face the lane
    def on_pcb(name, size, material, y, z, bevel=0.0006):
        return box(P(name), size, material, coll, loc=(fx * (0.0008 + size[0] / 2), y, z), parent=pcb, bevel=bevel)
    on_pcb('ELC_cpu', (0.003, 0.030, 0.030), 'CHIP_BLACK', 0.0, 0.05)
    on_pcb('ELC_heatsink', (0.010, 0.026, 0.026), 'METAL_ALU', 0.0, 0.05).location.x += fx * 0.0032
    for i in range(4):
        on_pcb(f'ELC_ic{i}', (0.0018, 0.012, 0.018), 'CHIP_BLACK', -0.03 + 0.02 * i, -0.02)
        on_pcb(f'ELC_pad{i}', (0.0003, 0.016, 0.022), 'PCB_GOLD', -0.03 + 0.02 * i, -0.02, bevel=0)
    for i in range(3):
        c = cyl(P(f'ELC_cap{i}'), 0.006, 0, 0.016, 'CAP_ALU', coll, n=24, parent=pcb)
        c.matrix_local = T((fx * 0.0008, -0.03 + 0.03 * i, -0.075)) @ Matrix.Rotation(fx * math.pi / 2, 4, 'Y')
    on_pcb('ELC_relay0', (0.014, 0.018, 0.028), 'CHIP_BLACK', -0.03, 0.11)
    on_pcb('ELC_relay1', (0.014, 0.018, 0.028), 'CHIP_BLACK', 0.0, 0.11)
    on_pcb('ELC_conn', (0.010, 0.012, 0.045), 'PLASTIC_WHITE', 0.038, 0.095)
    on_pcb('ELC_edge', (0.0003, 0.090, 0.010), 'PCB_GOLD', 0.0, -0.138, bevel=0)
    for i in range(5):
        on_pcb(f'ELC_led{i}', (0.0012, 0.002, 0.003), 'LED_STATUS', 0.04, -0.01 + 0.012 * i, bevel=0.0002)
    # PSU in the exit post
    box(P('ELC_psu'), (0.050, 0.100, 0.200), 'METAL_ALU', coll, loc=(cx, 0.605, 0.20), bevel=0.002)
    box(P('ELC_psu_cap'), (0.052, 0.102, 0.020), 'METAL_DARK', coll, loc=(cx, 0.605, 0.311), bevel=0.002)
    box(P('ELC_terminal'), (0.020, 0.080, 0.016), 'PLASTIC_BLACK', coll, loc=(cx, 0.605, 0.33), bevel=0.001)
    for i in range(5):
        cyl(P(f'ELC_tscrew{i}'), 0.003, 0.338, 0.340, 'METAL_STEEL', coll, loc=(cx, 0.575 + 0.015 * i), n=12, c=0.0004)
    # IR sensor strips on the lane side of each post
    for e2, nm in ((-1, 'in'), (1, 'out')):
        st = box(P(f'ELC_ir_{nm}'), (0.0016, 0.012, 0.50), 'PCB_GREEN', coll, loc=(cx - s * 0.052, e2 * 0.56, 0.55), bevel=0)
        for i in range(12):
            box(P(f'ELC_irdome_{nm}{i}'), (0.003, 0.004, 0.004), 'CHIP_BLACK', coll, loc=(-s * 0.002, 0, -0.22 + 0.04 * i), parent=st, bevel=0.001)
    # cables along the base
    for i, (cn, dz) in enumerate((('CABLE_RED', 0.0), ('CABLE_BLUE', 0.006), ('CABLE_YELLOW', 0.012), ('CABLE_WHITE', 0.018))):
        dx = s * (0.022 - 0.012 * i) * 0.6
        p = bezier((cx + dx, -0.60, 0.31), (cx + dx, -0.62, 0.02 + dz), (cx + dx * 2, -0.25, 0.036 + dz * 0.3), (cx + s * 0.03, -0.035 - 0.004 * i, 0.06 + dz), 28)
        tube_path(P(f'CBL_{i}'), p, 0.0022, cn, coll)
        p = bezier((cx + s * 0.03, 0.035 + 0.004 * i, 0.06 + dz), (cx + dx * 2, 0.25, 0.036 + dz * 0.3), (cx + dx, 0.5, 0.03 + dz), (cx + dx, 0.585, 0.105), 28)
        tube_path(P(f'CBL_b{i}'), p, 0.0022, cn, coll)

    # --- wave 4: glass body
    for e2, nm in ((-1, 'entry'), (1, 'exit')):
        v, f = sweep(dpost(e2, cx), wall_profile(0.008, 0.031, 0.938, 0.0022), closed=True)
        parts.append(new_obj(P(f'GLS_post_{nm}'), v, f, 'GLASS_BODY', coll))
        # side panel: outline in (y, z), thickness along x
        w, h = 0.420, 0.900
        v, f = sweep(roundrect(w, h, 0.006), [(0.0022, -0.005)] + [(0.0022 * (1 - math.sin(a)), -0.005 + 0.0022 * (1 - math.cos(a))) for a in (math.pi / 6, math.pi / 3)]
                     + [(0, -0.0028), (0, 0.0028)] + bev(0, 0.0028, 0.0022, 0.005, 3) + [(0.0022, 0.005)])
        M = T((cx, e2 * 0.285, 0.485)) @ Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
        parts.append(new_obj(P(f'GLS_panel_{nm}'), v, f, 'GLASS_BODY', coll, matrix=M))
        box(P(f'GLS_clip_{nm}'), (0.022, 0.030, 0.014), 'METAL_STEEL', coll, loc=(cx, e2 * 0.2, 0.0372), bevel=0.0015)
        # post accent LED bar (lane side, low)
        acc = box(P(f'LED_accent_{nm}'), (0.003, 0.010, 0.16), 'LED_STRIP', coll, loc=(cx - s * 0.055, e2 * 0.60, 0.26), bevel=0.001)
        set_wave_u(acc, lambda co, e2=e2: rail_u(co.y) + (0.02 if e2 > 0 else -0.03))

    # --- wave 5: top rail
    v, f = sweep(stadium(0.692, 0.0575), solid_profile(0.9405, 0.9455, 0.001))
    new_obj(P('RAIL_spine'), v, f, 'METAL_ALU', coll, matrix=T((cx, 0, 0)))
    led_out = stadium(0.70, 0.07, arc=40, straight=60)
    v, f = sweep(led_out, [(0.0088, 0.9465), (0.0088, 0.9535), (0.0106, 0.9535), (0.0106, 0.9465)], closed=True)
    led = new_obj(P('LED_rail'), v, f, 'LED_STRIP', coll, matrix=T((cx, 0, 0)))
    set_wave_u(led, lambda co: rail_u(co.y))
    v, f = sweep(circle(0.0595, 64), [(0, 0.9225), (0, 0.9375), (0.006, 0.9375), (0.006, 0.9225)], closed=True)
    ring = new_obj(P('LED_ring'), v, f, 'LED_STRIP', coll, matrix=T((cx, 0, 0)))
    set_wave_u(ring, lambda co: 0.5 + 0.3 * co.y)
    cyl(P('RAIL_ringcore'), 0.053, 0.9212, 0.9390, 'METAL_DARK', coll, loc=(cx, 0), c=0.001)
    # reader end (-Y): card icon, QR funnel, LCD, camera pod
    box(P('RDR_lcd_body'), (0.098, 0.168, 0.008), 'PLASTIC_BLACK', coll, loc=(cx, -0.345, 0.9855), bevel=0.001)
    quad(P('RDR_lcd'), [(cx - 0.045, -0.425, 0.9897), (cx + 0.045, -0.425, 0.9897), (cx + 0.045, -0.265, 0.9897), (cx - 0.045, -0.265, 0.9897)],
         'SCREEN_LCD', coll)
    box(P('RDR_qr'), (0.050, 0.040, 0.030), 'PLASTIC_WHITE', coll, loc=(cx, -0.475, 0.9745), bevel=0.003)
    v, f = sweep(circle(0.006, 20), solid_profile(0.9896, 0.9905, 0.0003))
    new_obj(P('RDR_qr_lens'), v, f, 'GLASS_LENS', coll, matrix=T((cx, -0.475, 0)))
    v, f = sweep(roundrect(0.085, 0.060, 0.008), [(0, 0.948), (0, 0.9488), (0.004, 0.9488), (0.004, 0.948)], closed=True)
    new_obj(P('RDR_rfid_coil'), v, f, 'COPPER', coll, matrix=T((cx, -0.585, 0)))
    box(P('RDR_rfid_pcb'), (0.095, 0.070, 0.0012), 'PCB_GREEN', coll, loc=(cx, -0.585, 0.9472), bevel=0)
    v, f = sweep(roundrect(0.070, 0.050, 0.006), [(0, 0.9900), (0, 0.9903), (0.003, 0.9903), (0.003, 0.9900)], closed=True)
    new_obj(P('RDR_icon'), v, f, 'PRINT_WHITE', coll, matrix=T((cx, -0.585, 0)))
    box(P('RDR_icon_card'), (0.026, 0.017, 0.0003), 'PRINT_WHITE', coll, loc=(cx, -0.585, 0.99015), bevel=0)
    # lid
    w, c = 0.008, 0.004
    prof = [(w + 0.002, 1.0 - w)] + [(w, 1.0 - w - 0.002), (w, 0.9415), (w - 0.0015, 0.940), (0.0015, 0.940), (0, 0.9415), (0, 1.0 - c)] \
        + bev(0, 1.0 - c, c, 1.0, 4) + [(c, 1.0)]
    v, f = sweep(stadium(0.70, 0.07, arc=40), prof)
    parts.append(new_obj(P('RAIL_lid'), v, f, 'GLASS_BODY', coll, matrix=T((cx, 0, 0))))
    for i, y in enumerate((-0.66, -0.2, 0.2, 0.66)):
        cyl(P(f'RAIL_screw{i}'), 0.004, 1.0003, 1.0022, 'METAL_STEEL', coll, loc=(cx, y), n=16, c=0.0006)
    # camera pod on top of the lid, tilted toward the user at -Y
    R = Matrix.Rotation(math.radians(-35), 4, 'X')
    pod = box(P('RDR_pod'), (0.112, 0.030, 0.026), 'PLASTIC_BLACK', coll, loc=(cx, -0.225, 1.0155), bevel=0.006, seg=3, rot=R)
    for k in (-1, 1):
        for i in range(3):
            d = box(P(f'RDR_ir{k}{i}'), (0.003, 0.0006, 0.003), 'LED_IR', coll, loc=(k * 0.040, -0.0151, -0.007 + 0.007 * i), parent=pod, bevel=0.0002)
        l = cyl(P(f'RDR_lens{k}'), 0.0045, 0, 0.0012, 'GLASS_LENS', coll, n=20, c=0.0004, parent=pod)
        l.matrix_local = T((k * 0.016, -0.0150, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'X')
    # badge on the lane-side face of the rail
    xb = cx - s * 0.0704
    ya, yb = (-0.36, -0.44) if s > 0 else (-0.44, -0.36)
    quad(P('RAIL_badge'), [(xb, ya, 0.958), (xb, yb, 0.958), (xb, yb, 0.982), (xb, ya, 0.982)], 'BADGE', coll)

    # --- wave 6: wing (root on the column axis)
    root = bpy.data.objects.new(f'WING_{side}', None); coll.objects.link(root)
    root.empty_display_size = 0.05
    root.location = (cx, 0, 0)
    v, f = sweep(circle(0.045, 80), wall_profile(0.008, 0.4005, 0.920, 0.002), closed=True)
    new_obj(P('WING_sleeve'), v, f, 'GLASS_BODY', coll, parent=root)
    u0, u1 = 0.050, 0.368
    wd, ht = u1 - u0, 0.70
    prof = [(0.0025, -0.006)] + [(0.0025 * (1 - math.sin(a)), -0.006 + 0.0025 * (1 - math.cos(a))) for a in (math.pi / 6, math.pi / 3)] \
        + [(0, -0.0035), (0, 0.0035)] + bev(0, 0.0035, 0.0025, 0.006, 3) + [(0.0025, 0.006)]
    v, f = sweep(roundrect(wd, ht, 0.03, n=10), prof)
    # local frame: x across the lane (toward the lane centre), y up, z thickness -> world
    M = T((-s * (u0 + wd / 2), 0, 0.57)) @ Matrix(((-s, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    new_obj(P('WING_leaf'), v, f, 'GLASS_WING', coll, parent=root, matrix=M)
    # display layer on the rear (+Y) face, read from the entry side (-Y): u runs toward +X, v up
    xc = -s * (u0 + wd / 2)
    scr = quad(P('WING_display'), [(xc - 0.10, 0.0063, 0.39), (xc + 0.10, 0.0063, 0.39), (xc + 0.10, 0.0063, 0.75), (xc - 0.10, 0.0063, 0.75)],
               'SCREEN_WING', coll, parent=root)
    v, f = sweep(roundrect(0.212, 0.372, 0.008), [(0, 0.0066), (0, 0.0074), (0.0016, 0.0074), (0.0016, 0.0066)], closed=True)
    Mf = T((xc, 0, 0.57)) @ Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    fr = new_obj(P('LED_wing'), v, f, 'LED_STRIP', coll, parent=root, matrix=Mf)
    set_wave_u(fr, lambda co: 0.90 + 0.10 * (co.z - 0.384) / 0.372)
    for i, z in enumerate((0.30, 0.84)):
        box(P(f'WING_clamp{i}'), (0.036, 0.030, 0.050), 'METAL_STEEL', coll, loc=(-s * 0.060, 0, z), parent=root, bevel=0.003, seg=3)
    return parts


def box_data(size):
    hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
    v = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz), (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return v, f


def box_uv(ob, axis_u, axis_v):
    me = ob.data
    uv = me.uv_layers.new(name='UVMap')
    au, av = Vector(axis_u), Vector(axis_v)
    cos = [v.co for v in me.vertices]
    us = [c.dot(au) for c in cos]; vs = [c.dot(av) for c in cos]
    u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
    for l in me.loops:
        c = me.vertices[l.vertex_index].co
        uv.data[l.index].uv = ((c.dot(au) - u0) / (u1 - u0), (c.dot(av) - v0) / (v1 - v0))


def build_proxy(scene=None):
    scene = scene or bpy.context.scene
    out = {}
    for side in ('L', 'R'):
        coll = bpy.data.collections.new(f'GATE_{side}')
        scene.collection.children.link(coll)
        out[side] = build_pedestal(side, coll)
    bpy.context.view_layer.update()
    return out


if __name__ == '__main__':
    sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'shared'))
    import gg_common as gg
    sc = gg.reset_scene()
    build_proxy(sc)
    tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
    print('proxy objects', len(bpy.data.objects), 'triangles', tris)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'proxy_gate.blend'))
