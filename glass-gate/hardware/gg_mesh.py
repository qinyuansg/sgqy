"""gg_mesh.py - small procedural mesh toolkit for the HYALO G1 gate.

Units: millimetres, Z up.  Everything is built as closed shells out of vertex
loops; face winding does not matter here (normals are recalculated and checked
per island when the Blender object is made).
"""
import math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon

TAU = 2.0 * math.pi
PI = math.pi
cos, sin, sqrt = math.cos, math.sin, math.sqrt
rad = math.radians


# ----------------------------------------------------------------------------
# matrices
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def RX(deg):
    return Matrix.Rotation(rad(deg), 4, 'X')


def RY(deg):
    return Matrix.Rotation(rad(deg), 4, 'Y')


def RZ(deg):
    return Matrix.Rotation(rad(deg), 4, 'Z')


def S(x, y=None, z=None):
    y = x if y is None else y
    z = x if z is None else z
    m = Matrix.Identity(4)
    m[0][0], m[1][1], m[2][2] = x, y, z
    return m


def FRAME(o, xa, ya, za):
    """4x4 with the given axes as columns and origin o."""
    m = Matrix.Identity(4)
    for i in range(3):
        m[i][0], m[i][1], m[i][2], m[i][3] = xa[i], ya[i], za[i], o[i]
    return m


# ----------------------------------------------------------------------------
class MB:
    """Mesh builder: verts, faces, per-face material name."""

    def __init__(self, mat='METAL_STEEL'):
        self.v = []
        self.f = []
        self.fm = []
        self.mat = mat
        self.t = None          # optional per-vertex float (0..1 along a cable), exported as 'grow_t'

    def vert(self, p):
        self.v.append((float(p[0]), float(p[1]), float(p[2])))
        return len(self.v) - 1

    def loop(self, pts):
        i0 = len(self.v)
        self.v.extend((float(p[0]), float(p[1]), float(p[2])) for p in pts)
        return list(range(i0, len(self.v)))

    def loop2(self, pts2d, z):
        return self.loop([(x, y, z) for x, y in pts2d])

    def face(self, idx, mat=None):
        self.f.append(tuple(idx))
        self.fm.append(mat or self.mat)

    def bridge(self, a, b, mat=None, closed=True):
        n = len(a)
        assert n == len(b), (n, len(b))
        m = mat or self.mat
        for i in range(n if closed else n - 1):
            j = (i + 1) % n
            self.f.append((a[i], a[j], b[j], b[i]))
            self.fm.append(m)

    def fan(self, c, loop, mat=None):
        n = len(loop)
        m = mat or self.mat
        for i in range(n):
            self.f.append((c, loop[i], loop[(i + 1) % n]))
            self.fm.append(m)

    def cap(self, outer, holes=(), mat=None):
        m = mat or self.mat
        if not holes:
            self.f.append(tuple(outer))
            self.fm.append(m)
            return
        polys = [[Vector(self.v[i]) for i in outer]] + [[Vector(self.v[i]) for i in h] for h in holes]
        flat = list(outer)
        for h in holes:
            flat += list(h)
        for t in tessellate_polygon(polys):
            self.f.append((flat[t[0]], flat[t[1]], flat[t[2]]))
            self.fm.append(m)

    def add(self, other, M=None, mat=None, t=None):
        i0 = len(self.v)
        src = other.t if other.t is not None else ([float(t)] * len(other.v) if t is not None else None)
        if src is not None or self.t is not None:
            if self.t is None:
                self.t = [0.0] * i0
            self.t.extend(src if src is not None else [0.0] * len(other.v))
        if M is None:
            self.v.extend(other.v)
        elif other.v:
            A = np.array(M)
            v = np.asarray(other.v) @ A[:3, :3].T + A[:3, 3]
            self.v.extend(map(tuple, v.tolist()))
        self.f.extend(tuple(i + i0 for i in f) for f in other.f)
        self.fm.extend(other.fm if mat is None else [mat] * len(other.f))
        return self

    def xf(self, M):
        A = np.array(M)
        v = np.asarray(self.v) @ A[:3, :3].T + A[:3, 3]
        self.v = list(map(tuple, v.tolist()))
        return self

    def remat(self, mat):
        self.fm = [mat] * len(self.f)
        return self

    def bounds(self):
        a = np.asarray(self.v)
        return a.min(0), a.max(0)


# ----------------------------------------------------------------------------
# 2D outlines (all CCW)
def area2(poly):
    a = 0.0
    n = len(poly)
    for i in range(n):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % n]
        a += x0 * y1 - x1 * y0
    return a * 0.5


def ccw(poly):
    return list(poly) if area2(poly) >= 0 else list(reversed(poly))


def dedupe(pts, eps=1e-7):
    """Drop consecutive duplicate points of a closed 2D loop."""
    out = []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) > eps or abs(p[1] - out[-1][1]) > eps:
            out.append(p)
    while len(out) > 1 and abs(out[0][0] - out[-1][0]) <= eps and abs(out[0][1] - out[-1][1]) <= eps:
        out.pop()
    return out


def circle(r, n=32, cx=0.0, cy=0.0, a0=0.0):
    return [(cx + r * cos(a0 + TAU * i / n), cy + r * sin(a0 + TAU * i / n)) for i in range(n)]


def arc(cx, cy, r, a0, a1, n):
    """n+1 points from angle a0 to a1 (radians)."""
    return [(cx + r * cos(a0 + (a1 - a0) * i / n), cy + r * sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def rrect(w, h, r=0.0, seg=5, cx=0.0, cy=0.0):
    """Rounded rectangle w (x) by h (y)."""
    hw, hh = w / 2, h / 2
    r = min(r, hw, hh)
    if r <= 1e-9:
        return [(cx - hw, cy - hh), (cx + hw, cy - hh), (cx + hw, cy + hh), (cx - hw, cy + hh)]
    pts = []
    for (ox, oy, a0) in ((hw - r, -hh + r, -PI / 2), (hw - r, hh - r, 0.0), (-hw + r, hh - r, PI / 2), (-hw + r, -hh + r, PI)):
        pts += arc(cx + ox, cy + oy, r, a0, a0 + PI / 2, seg)
    return dedupe(pts)


def stadium(w, L, n_arc=32, cx=0.0, cy=0.0):
    """Stadium: width w along x, total length L along y."""
    r = w / 2
    h = L / 2 - r
    pts = arc(cx, cy + h, r, 0.0, PI, n_arc) + arc(cx, cy - h, r, PI, TAU, n_arc)
    return pts


def poly_n(n_sides, r_flat, n_verts, a0=0.0):
    """Regular polygon (across-flats radius r_flat) sampled with n_verts points
    at the same angles as circle(.., n_verts, a0=a0) so it can be bridged to one."""
    pts = []
    seg = TAU / n_sides
    for i in range(n_verts):
        a = a0 + TAU * i / n_verts
        t = ((a - a0) % seg) - seg / 2
        rr = r_flat / cos(t)
        pts.append((rr * cos(a), rr * sin(a)))
    return pts


def offset2d(poly, d):
    """Offset a CCW polygon inward by d (negative = outward), mitred."""
    if abs(d) < 1e-12:
        return list(poly)
    if area2(poly) < 0:
        d = -d
    n = len(poly)
    out = []
    for i in range(n):
        px, py = poly[i - 1]
        vx, vy = poly[i]
        qx, qy = poly[(i + 1) % n]
        e1x, e1y = vx - px, vy - py
        e2x, e2y = qx - vx, qy - vy
        l1 = math.hypot(e1x, e1y) or 1.0
        l2 = math.hypot(e2x, e2y) or 1.0
        n1x, n1y = -e1y / l1, e1x / l1
        n2x, n2y = -e2y / l2, e2x / l2
        nx, ny = n1x + n2x, n1y + n2y
        ln = math.hypot(nx, ny)
        if ln < 1e-9:
            nx, ny = n1x, n1y
            ln = 1.0
        nx, ny = nx / ln, ny / ln
        c = max(nx * n1x + ny * n1y, 0.35)
        out.append((vx + nx * d / c, vy + ny * d / c))
    return out


OFFSET_WARN = {}


def _check_offset(poly, off, inset):
    """Record offsets that flipped an edge (bevel larger than a small feature)."""
    n = len(poly)
    bad = 0
    for i in range(n):
        j = (i + 1) % n
        ex, ey = poly[j][0] - poly[i][0], poly[j][1] - poly[i][1]
        fx, fy = off[j][0] - off[i][0], off[j][1] - off[i][1]
        if ex * fx + ey * fy < 0 and (ex * ex + ey * ey) > 1e-12:
            bad += 1
    if bad:
        import traceback
        st = [f.name for f in traceback.extract_stack(limit=8)][:-2]
        key = '>'.join(s for s in st if s not in ('<module>', 'build', 'all_parts', 'walls', 'prism'))
        OFFSET_WARN[key] = max(OFFSET_WARN.get(key, 0), bad)


def polar_outline(sdf, n=180, rmax=100.0, a0=0.0):
    """Boundary of a star-shaped region given by sdf(x, y) < 0, sampled at n angles."""
    pts = []
    for i in range(n):
        a = a0 + TAU * i / n
        c, s = cos(a), sin(a)
        lo, hi = 0.0, rmax
        for _ in range(40):
            mid = 0.5 * (lo + hi)
            if sdf(mid * c, mid * s) < 0:
                lo = mid
            else:
                hi = mid
        pts.append((lo * c, lo * s))
    return pts


def smin(a, b, k):
    h = max(k - abs(a - b), 0.0) / k
    return min(a, b) - h * h * k * 0.25


def sd_capsule(x, y, ax, ay, bx, by, r):
    pax, pay = x - ax, y - ay
    bax, bay = bx - ax, by - ay
    h = max(0.0, min(1.0, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
    return math.hypot(pax - bax * h, pay - bay * h) - r


# ----------------------------------------------------------------------------
# solids
def _levels(z0, z1, bb, bt, segs):
    L = []
    if bb > 0:
        for k in range(segs + 1):
            ph = (PI / 2) * k / segs
            L.append((bb * (1 - sin(ph)), z0 + bb * (1 - cos(ph))))
    else:
        L.append((0.0, z0))
    if bt > 0:
        for k in range(segs + 1):
            ph = (PI / 2) * (1 - k / segs)
            L.append((bt * (1 - sin(ph)), z1 - bt * (1 - cos(ph))))
    else:
        L.append((0.0, z1))
    return L


def prism(outline, z0, z1, bevel=0.0, segs=1, holes=(), hole_bevel=0.0, mat=None,
          top_mat=None, bot_mat=None, bevel_top=None, bevel_bot=None, hole_segs=None, pockets=(), levels=None, support=0.0):
    """Extrude a CCW outline (with optional through holes) from z0 to z1 with
    bevelled top/bottom edges. bevel segs=1 -> 45 deg chamfer, >1 -> rounded.
    pockets: list of (outline, depth, bevel, floor_mat) blind pockets in the top face."""
    mb = MB(mat or 'METAL_STEEL')
    outline = ccw(outline)
    bt = bevel if bevel_top is None else bevel_top
    bb = bevel if bevel_bot is None else bevel_bot

    def walls(poly, lv, sign):
        loops = []
        for inset, z in lv:
            p = offset2d(poly, sign * inset) if inset else poly
            if inset:
                _check_offset(poly, p, inset)
            loops.append(mb.loop([(x, y, z) for x, y in p]))
        for a, b in zip(loops, loops[1:]):
            mb.bridge(a, b)
        return loops[0], loops[-1]

    ob, ot = walls(outline, levels or _levels(z0, z1, bb, bt, segs), +1)
    hb, ht = [], []
    for h in holes:
        b, t = walls(ccw(h), _levels(z0, z1, hole_bevel, hole_bevel, hole_segs or segs), -1)
        hb.append(b)
        ht.append(t)
    for pk in pockets:
        po, depth, pbev = ccw(pk[0]), pk[1], pk[2]
        fm = pk[3] if len(pk) > 3 else None
        if pbev > 0:
            p0 = mb.loop([(x, y, z1) for x, y in offset2d(po, -pbev)])
            p1 = mb.loop([(x, y, z1 - pbev) for x, y in po])
            mb.bridge(p0, p1)
        else:
            p0 = p1 = mb.loop([(x, y, z1) for x, y in po])
        p2 = mb.loop([(x, y, z1 - depth) for x, y in po])
        mb.bridge(p1, p2, fm)
        mb.cap(p2, (), fm)
        ht.append(p0)
    if support == 0 and segs >= 2 and (holes or pockets) and (bt > 0 or bb > 0):
        support = 0.25          # smooth bevel + tessellated cap: keep the flat really flat
    if support > 0:
        def sup(loop, d):
            pts = [(mb.v[i][0], mb.v[i][1]) for i in loop]
            z = mb.v[loop[0]][2]
            s = mb.loop([(x, y, z) for x, y in offset2d(pts, d)])
            mb.bridge(loop, s)
            return s
        ob, ot = sup(ob, support), sup(ot, support)
        hb = [sup(h, -support) for h in hb]
        ht = [sup(h, -support) for h in ht]
    mb.cap(ob, hb, bot_mat)
    mb.cap(ot, ht, top_mat)
    return mb


def box(sx, sy, sz, bevel=0.0, r=0.0, mat=None, segs=1, seg_r=3, top_mat=None, bot_mat=None):
    """Box centred in x,y, from z=0 to sz. r = vertical edge radius."""
    return prism(rrect(sx, sy, r, seg_r), 0.0, sz, bevel=bevel, segs=segs, mat=mat, top_mat=top_mat, bot_mat=bot_mat)


def cbox(x0, x1, y0, y1, z0, z1, bevel=0.0, r=0.0, mat=None, segs=1, seg_r=3, top_mat=None, bot_mat=None):
    return prism(rrect(x1 - x0, y1 - y0, r, seg_r, (x0 + x1) / 2, (y0 + y1) / 2), z0, z1, bevel=bevel, segs=segs,
                 mat=mat, top_mat=top_mat, bot_mat=bot_mat)


def lathe(profile, n=48, mat=None, mats=None):
    """Revolve a closed (r, z) profile about Z. Points with r ~ 0 become poles."""
    mb = MB(mat or 'METAL_STEEL')
    rings = []
    for r, z in profile:
        if r < 1e-7:
            rings.append(('p', mb.vert((0.0, 0.0, z))))
        else:
            rings.append(('r', mb.loop([(r * cos(TAU * i / n), r * sin(TAU * i / n), z) for i in range(n)])))
    m = len(profile)
    for i in range(m):
        ka, a = rings[i]
        kb, b = rings[(i + 1) % m]
        mt = mats[i] if mats else None
        if ka == 'r' and kb == 'r':
            mb.bridge(a, b, mt)
        elif ka == 'r' and kb == 'p':
            mb.fan(b, a, mt)
        elif ka == 'p' and kb == 'r':
            mb.fan(a, b, mt)
    return mb


def ring_profile(r0, r1, z0, z1, ch=0.0, segs=1):
    """Rectangular (r,z) ring section with chamfered/rounded corners."""
    if ch <= 0:
        return [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]
    pts = []
    corners = ((r1, z0, -PI / 2), (r1, z1, 0.0), (r0, z1, PI / 2), (r0, z0, PI))
    for (cr, cz, a0) in corners:
        ox = cr - ch * (1 if cr == r1 else -1)
        oz = cz - ch * (1 if cz == z1 else -1)
        for k in range(segs + 1):
            a = a0 + (PI / 2) * k / segs
            pts.append((ox + ch * cos(a), oz + ch * sin(a)))
    return pts


def disc_profile(r, z0, z1, ch=0.0, segs=1):
    """Solid cylinder section (poles on the axis)."""
    if ch <= 0:
        return [(0, z0), (r, z0), (r, z1), (0, z1)]
    pts = [(0, z0)]
    for (cz, a0) in ((z0, -PI / 2), (z1, 0.0)):
        oz = cz + ch * (1 if cz == z0 else -1)
        for k in range(segs + 1):
            a = a0 + (PI / 2) * k / segs
            pts.append((r - ch + ch * cos(a), oz + ch * sin(a)))
    pts.append((0, z1))
    return pts


def cyl(r, z0, z1, n=24, ch=0.0, segs=1, mat=None):
    return lathe(disc_profile(r, z0, z1, ch, segs), n, mat)


def ring(r0, r1, z0, z1, n=48, ch=0.0, segs=1, mat=None):
    return lathe(ring_profile(r0, r1, z0, z1, ch, segs), n, mat)


def sphere(r, n=16, m=8, mat=None, zc=0.0):
    prof = [(r * sin(PI * i / m), zc - r * cos(PI * i / m)) for i in range(m + 1)]
    prof[0] = (0.0, zc - r)
    prof[-1] = (0.0, zc + r)
    return lathe(prof, n, mat)


def torus(R, r, n=48, m=12, mat=None, zc=0.0):
    prof = [(R + r * cos(TAU * i / m), zc + r * sin(TAU * i / m)) for i in range(m)]
    return lathe(prof, n, mat)


def dome(r, h_cyl, n=16, m=5, mat=None, z0=0.0):
    """Cylinder of height h_cyl topped by a hemisphere (LED / lens dome)."""
    prof = [(0, z0), (r, z0)]
    for k in range(m + 1):
        a = (PI / 2) * k / m
        prof.append((r * cos(a), z0 + h_cyl + r * sin(a)))
    prof[-1] = (0, z0 + h_cyl + r)
    return lathe(prof, n, mat)


# ----------------------------------------------------------------------------
# sweeps
def _frames(path, closed=False):
    P = [Vector(p) for p in path]
    n = len(P)
    tans = []
    for i in range(n):
        if closed:
            t = P[(i + 1) % n] - P[i - 1]
        elif i == 0:
            t = P[1] - P[0]
        elif i == n - 1:
            t = P[-1] - P[-2]
        else:
            t = P[i + 1] - P[i - 1]
        if t.length < 1e-12:
            t = Vector((0, 0, 1))
        tans.append(t.normalized())
    t0 = tans[0]
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    nrm = (ref - t0 * ref.dot(t0)).normalized()
    fr = []
    for i in range(n):
        t = tans[i]
        nrm = nrm - t * nrm.dot(t)
        if nrm.length < 1e-9:
            ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            nrm = ref - t * ref.dot(t)
        nrm.normalize()
        fr.append((P[i], t, nrm.copy(), t.cross(nrm)))
    return fr


def tube(path, r, sides=10, mat=None, closed=False, caps=True, grow=False):
    mb = MB(mat or 'RUBBER')
    fr = _frames(path, closed)
    loops = []
    if grow:
        # arc-length parameter 0..1 along the path, stored per vertex
        acc = [0.0]
        for a_, b_ in zip(fr, fr[1:]):
            acc.append(acc[-1] + (b_[0] - a_[0]).length)
        mb.t = []
        for s_ in acc:
            mb.t.extend([s_ / (acc[-1] or 1.0)] * sides)
    for (p, t, n, b) in fr:
        loops.append(mb.loop([p + n * (r * cos(TAU * k / sides)) + b * (r * sin(TAU * k / sides)) for k in range(sides)]))
    for a, b in zip(loops, loops[1:]):
        mb.bridge(a, b)
    if closed:
        # align last->first with least twist
        a, b0 = loops[-1], loops[0]
        pa = Vector(mb.v[a[0]])
        best = min(range(sides), key=lambda k: (Vector(mb.v[b0[k]]) - pa).length)
        mb.bridge(a, b0[best:] + b0[:best])
    elif caps:
        mb.cap(loops[0])
        mb.cap(loops[-1])
    return mb


def ribbon(path, fixed, w_fixed, w_other, mat=None, closed=False):
    """Rectangular section sweep. Section spans +-w_fixed/2 along the constant
    direction `fixed` and +-w_other/2 along (tangent x fixed)."""
    mb = MB(mat or 'COPPER')
    P = [Vector(p) for p in path]
    F = Vector(fixed).normalized()
    n = len(P)
    loops = []
    for i in range(n):
        if closed:
            t = P[(i + 1) % n] - P[i - 1]
        elif i == 0:
            t = P[1] - P[0]
        elif i == n - 1:
            t = P[-1] - P[-2]
        else:
            t = (P[i + 1] - P[i]).normalized() + (P[i] - P[i - 1]).normalized()
        t = (t - F * t.dot(F)).normalized()
        o = t.cross(F)
        a, b = F * (w_fixed / 2), o * (w_other / 2)
        loops.append(mb.loop([P[i] - a - b, P[i] + a - b, P[i] + a + b, P[i] - a + b]))
    for a, b in zip(loops, loops[1:]):
        mb.bridge(a, b)
    if closed:
        mb.bridge(loops[-1], loops[0])
    else:
        mb.cap(loops[0])
        mb.cap(loops[-1])
    return mb


def fillet_path(pts, r, seg=6):
    """Round the corners of a 3D polyline with radius r."""
    P = [Vector(p) for p in pts]
    out = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        d1, d2 = (a - b), (c - b)
        l1, l2 = d1.length, d2.length
        if l1 < 1e-9 or l2 < 1e-9:
            continue
        d1.normalize()
        d2.normalize()
        ang = d1.angle(d2)
        if ang > PI - 1e-3:
            out.append(b)
            continue
        tl = min(r / math.tan(ang / 2), l1 * 0.49, l2 * 0.49)
        rr = tl * math.tan(ang / 2)
        p1, p2 = b + d1 * tl, b + d2 * tl
        bis = (d1 + d2).normalized()
        cen = b + bis * (rr / sin(ang / 2))
        v1, v2 = p1 - cen, p2 - cen
        tot = v1.angle(v2)
        axis = v1.cross(v2)
        if axis.length < 1e-12:
            out.append(b)
            continue
        axis.normalize()
        for k in range(seg + 1):
            q = Matrix.Rotation(tot * k / seg, 3, axis) @ v1
            out.append(cen + q)
    out.append(P[-1])
    # drop near-duplicates
    res = [out[0]]
    for p in out[1:]:
        if (p - res[-1]).length > 1e-6:
            res.append(p)
    return res


def resample(path, step):
    """Insert points so no segment is longer than step (keeps corners)."""
    P = [Vector(p) for p in path]
    out = [P[0]]
    for a, b in zip(P, P[1:]):
        L = (b - a).length
        k = max(1, int(math.ceil(L / step)))
        for i in range(1, k + 1):
            out.append(a.lerp(b, i / k))
    return out


def helix(R, z0, z1, turns, seg_per_turn=40, a0=0.0):
    n = int(turns * seg_per_turn)
    return [(R * cos(a0 + TAU * turns * i / n), R * sin(a0 + TAU * turns * i / n), z0 + (z1 - z0) * i / n) for i in range(n + 1)]


# ----------------------------------------------------------------------------
# gears
def _inv(a):
    return math.tan(a) - a


def gear_outline(m, z, pa_deg=20.0, add=1.0, ded=1.25, backlash=0.0, n_flank=6, n_tip=2, n_root=3, internal=False):
    """Involute spur gear outline, CCW, a tooth centred on angle 0.
    internal=True returns the outline of the HOLE of an internal ring gear
    (ring teeth, i.e. material, centred on angle 0)."""
    rp = m * z / 2.0
    pa = rad(pa_deg)
    rb = rp * cos(pa)
    if internal:
        # the hole is shaped like an external gear whose "teeth" are the ring's spaces
        ra = rp + ded * m          # hole reaches the ring root
        rf = rp - add * m          # ring tooth tips
        s = PI * m / 2 + backlash  # space width at pitch
    else:
        ra = rp + add * m
        rf = rp - ded * m
        s = PI * m / 2 - backlash
    psi = s / (2 * rp)
    r_start = max(rb, rf)

    def half_ang(r):
        phi = math.acos(min(1.0, rb / r))
        return psi + _inv(pa) - _inv(phi)

    flank = []
    for k in range(n_flank + 1):
        t = k / n_flank
        r = r_start + (ra - r_start) * (t ** 0.8)
        flank.append((r, half_ang(r)))
    th_tip = flank[-1][1]
    th_base = flank[0][1]
    pitch = TAU / z
    fr = 0.0
    if rf < r_start - 1e-6:
        fr = min(0.3 * m, (r_start - rf) * 0.9, rf * (pitch / 2 - th_base) * 0.9)
    pts = []
    for i in range(z):
        c = i * pitch
        # root arc from previous tooth's right flank to this tooth's left flank:
        a_lo = c - pitch + th_base
        a_hi = c - th_base
        if fr > 0:
            da = fr / rf
            # fillet out of previous flank
            pts.append((rf + fr * 0.3, a_lo + da * 0.25))
            for k in range(n_root + 1):
                a = (a_lo + da) + (a_hi - a_lo - 2 * da) * k / n_root
                pts.append((rf, a))
            pts.append((rf + fr * 0.3, a_hi - da * 0.25))
            pts.append((rf + fr, a_hi))
        else:
            for k in range(1, n_root + 1):
                a = a_lo + (a_hi - a_lo) * k / (n_root + 1)
                pts.append((rf, a))
        # left flank (negative side), root -> tip
        for r, th in flank:
            pts.append((r, c - th))
        # tip arc
        for k in range(1, n_tip):
            pts.append((ra, c - th_tip + 2 * th_tip * k / n_tip))
        # right flank, tip -> root
        for r, th in reversed(flank):
            pts.append((r, c + th))
        if fr > 0:
            pts.append((rf + fr, c + th_base))
    out = [(r * cos(a), r * sin(a)) for r, a in pts]
    if internal:
        hp = pitch / 2
        out = [(x * cos(hp) - y * sin(hp), x * sin(hp) + y * cos(hp)) for x, y in out]
    return out


# ----------------------------------------------------------------------------
# fasteners (axis along Z, built at origin)
def socket_head(r_head, h, af, depth, n=24, ch=None, mat=None, z0=0.0):
    """Cylindrical head from z0 to z0+h with a hex socket in the top face.
    Open at the bottom?  No: closed solid (bottom cap)."""
    mb = MB(mat or 'METAL_STEEL')
    ch = r_head * 0.12 if ch is None else ch
    rf = af / 2.0
    c0 = mb.loop2(circle(r_head - ch * 0.5, n), z0)
    c1 = mb.loop2(circle(r_head, n), z0 + ch * 0.5)
    c2 = mb.loop2(circle(r_head, n), z0 + h - ch)
    c3 = mb.loop2(circle(r_head - ch, n), z0 + h)
    h0 = mb.loop2(poly_n(6, rf * 1.06, n), z0 + h)
    h1 = mb.loop2(poly_n(6, rf, n), z0 + h - 0.06 * af)
    h2 = mb.loop2(poly_n(6, rf, n), z0 + h - depth)
    for a, b in ((c0, c1), (c1, c2), (c2, c3), (c3, h0), (h0, h1), (h1, h2)):
        mb.bridge(a, b)
    mb.cap(c0)
    mb.cap(h2)
    return mb


def thread_profile(r, z_top, z_bot, pitch, depth=None, tip=True):
    """(r,z) polyline of a ridged 'thread' going down from z_top to z_bot (no poles)."""
    depth = pitch * 0.55 if depth is None else depth
    pts = []
    z = z_top
    while z - pitch > z_bot + pitch * 0.5:
        pts.append((r, z))
        pts.append((r - depth, z - pitch * 0.5))
        z -= pitch
    pts.append((r, z))
    if tip:
        pts.append((r - depth, z_bot))
    else:
        pts.append((r, z_bot))
    return pts


def cap_screw(d=4.0, L=10.0, head_d=None, head_h=None, n=20, thread=True, mat=None, washer=0.0):
    """Socket head cap screw. Head sits on z=0 (underside), top at z=head_h, shank down to -L."""
    mat = mat or 'METAL_STEEL'
    head_d = head_d or d * 1.6
    head_h = head_h or d
    mb = MB(mat)
    mb.add(socket_head(head_d / 2, head_h, d * 0.8, head_h * 0.5, n, mat=mat))
    r = d / 2
    if L > 0:
        if thread:
            prof = [(0, 0.2), (r, 0.2), (r, -L * 0.25)] + thread_profile(r, -L * 0.25, -L, d * 0.16) + [(0, -L)]
        else:
            prof = [(0, 0.2), (r, 0.2), (r, -L + r * 0.2), (r * 0.8, -L), (0, -L)]
        mb.add(lathe(prof, n, mat))
    if washer > 0:
        mb.add(ring(r + 0.15, washer / 2, -0.12 * d - 0.0, -0.0, n, ch=0.03 * d, mat=mat), T(0, 0, -0.02))
    return mb


def csk_screw(d=4.0, L=9.0, head_d=9.4, n=24, mat=None, cone_h=None):
    """Countersunk socket screw: head top at z=0, going down."""
    mat = mat or 'METAL_STEEL'
    mb = MB(mat)
    r, rh = d / 2, head_d / 2
    cone_h = (rh - r) if cone_h is None else cone_h
    af = d * 0.62
    rf = af / 2
    dep = d * 0.5
    c_top = mb.loop2(circle(rh - 0.12, n), 0.0)
    c_rim = mb.loop2(circle(rh, n), -0.12)
    c_neck = mb.loop2(circle(r, n), -0.12 - cone_h)
    h0 = mb.loop2(poly_n(6, rf * 1.06, n), 0.0)
    h1 = mb.loop2(poly_n(6, rf, n), -0.1)
    h2 = mb.loop2(poly_n(6, rf, n), -dep)
    mb.bridge(c_top, c_rim)
    mb.bridge(c_rim, c_neck)
    mb.bridge(c_top, h0)
    mb.bridge(h0, h1)
    mb.bridge(h1, h2)
    mb.cap(h2)
    # shank
    zt = -0.12 - cone_h
    prof = thread_profile(r, zt - L * 0.2, -L, d * 0.17)
    prev = c_neck
    zs = [(r, zt - L * 0.2)] + prof[1:]
    for (rr, z) in zs:
        lp = mb.loop2(circle(rr, n), z)
        mb.bridge(prev, lp)
        prev = lp
    mb.cap(prev)
    return mb


def hex_standoff(af, z0, z1, mat='BRASS', ch=0.25, round_n=6):
    """Hex pillar from z0 to z1."""
    return prism(circle(af / 2 / cos(PI / 6), 6, a0=PI / 6), z0, z1, bevel=ch, mat=mat)


def hex_nut(af, h, bore, mat='METAL_STEEL', n=24, z0=0.0):
    mb = MB(mat)
    rf = af / 2
    o0 = mb.loop2(poly_n(6, rf * 0.93, n), z0)
    o1 = mb.loop2(poly_n(6, rf, n), z0 + h * 0.12)
    o2 = mb.loop2(poly_n(6, rf, n), z0 + h * 0.88)
    o3 = mb.loop2(poly_n(6, rf * 0.93, n), z0 + h)
    i3 = mb.loop2(circle(bore, n), z0 + h)
    i0 = mb.loop2(circle(bore, n), z0)
    for a, b in ((o0, o1), (o1, o2), (o2, o3), (o3, i3), (i3, i0), (i0, o0)):
        mb.bridge(a, b)
    return mb


def keyed_loop(r, key_w, key_d, n, keyed):
    """n-point loop of a shaft section, keyway centred on +x. Same count keyed or not."""
    al = math.asin(min(0.999, key_w / 2 / r))
    if keyed:
        x_out = r * cos(al)
        pts = [(x_out, -key_w / 2), (r - key_d, -key_w / 2), (r - key_d, key_w / 2), (x_out, key_w / 2)]
    else:
        pts = [(r * cos(a), r * sin(a)) for a in (-al, -al / 3, al / 3, al)]
    m = n - 4
    for k in range(1, m + 1):
        a = al + (TAU - 2 * al) * k / (m + 1)
        pts.append((r * cos(a), r * sin(a)))
    return pts
