"""Glass parts: column tube, upper sleeve, end posts, side panels, rail lid, wing leaf.
Every part here is ONE closed manifold shell of GLASS_* only."""
from gg_mesh import *
from parts_drive import P

POST_BACK = 540.0      # |y| of the flat back wall (outer face)
POST_ARC = 630.0       # |y| of the stadium arc centre
POST_Z0, POST_Z1 = 30.5, 933.0
WALL = 8.0
LID_Z0, LID_Z1, LID_CEIL = 940.3, 1000.0, 992.0
LID_SCREWS = [(52.0, -560.0), (-52.0, -560.0), (52.0, 0.0), (-52.0, 0.0), (52.0, 560.0), (-52.0, 560.0)]
PANEL_X0, PANEL_X1 = -60.0, -50.0
PANEL_Z0, PANEL_Z1 = 36.0, 932.5
PANEL_Y0, PANEL_Y1 = 40.0, 539.5
LEAF_X0, LEAF_X1, LEAF_Z0, LEAF_Z1, LEAF_T = 70.0, 368.0, 220.0, 920.0, 12.0


def post_outline_outer(flutes=18, pts_per=16, depth=1.7, R=70.0):
    pts = arc(R - 6, POST_BACK + 6, 6.0, -PI / 2, 0.0, 5)
    n = flutes * pts_per
    for i in range(n + 1):
        th = PI * i / n
        ph = (i % pts_per) / pts_per
        d = depth * (sin(PI * ph) ** 1.4)
        r = R - d
        pts.append((r * cos(th), POST_ARC + r * sin(th)))
    pts += arc(-R + 6, POST_BACK + 6, 6.0, PI, 1.5 * PI, 5)
    return pts


def post_outline_inner(R=70.0 - WALL, n=72):
    yb = POST_BACK + WALL
    pts = arc(R - 3, yb + 3, 3.0, -PI / 2, 0.0, 4)
    pts += arc(0, POST_ARC, R, 0.0, PI, n)
    pts += arc(-R + 3, yb + 3, 3.0, PI, 1.5 * PI, 4)
    return pts


def post(name, ysign):
    o, i = post_outline_outer(), post_outline_inner()
    if ysign < 0:
        o = [(x, -y) for x, y in o]
        i = [(x, -y) for x, y in i]
    mb = prism(o, POST_Z0, POST_Z1, bevel=2.0, segs=2, holes=[i], hole_bevel=1.5, mat='GLASS_BODY')
    return P(name, 4, 0, 'glass', mb, (0, ysign * 620.0, (POST_Z0 + POST_Z1) / 2))


def column():
    mb = lathe(ring_profile(52.0, 60.0, 30.5, 400.0, 2.0, 2), 128, 'GLASS_BODY')
    return P('GLS_column', 2, 10, 'glass', mb, (0, 0, 215))


def sleeve():
    mb = lathe(ring_profile(52.0, 60.0, 403.0, 920.0, 2.0, 2), 128, 'GLASS_BODY')
    return P('WING_sleeve', 2, 12, 'glass', mb, (0, 0, 661.5), parent='WING')


def panel(name, ysign):
    w = PANEL_Y1 - PANEL_Y0
    h = PANEL_Z1 - PANEL_Z0
    cy = ysign * (PANEL_Y0 + PANEL_Y1) / 2
    cz = (PANEL_Z0 + PANEL_Z1) / 2
    cx = (PANEL_X0 + PANEL_X1) / 2
    t = PANEL_X1 - PANEL_X0
    mb = prism(rrect(w, h, 4.0, 5), -t / 2, t / 2, bevel=2.2, segs=2, mat='GLASS_BODY')
    mb.xf(FRAME((cx, cy, cz), (0, 1, 0), (0, 0, 1), (1, 0, 0)))
    return P(name, 4, 2, 'glass', mb, (cx, cy, cz), insert=(0, 0, 1))


def leaf():
    w = LEAF_X1 - LEAF_X0
    h = LEAF_Z1 - LEAF_Z0
    cx, cz = (LEAF_X0 + LEAF_X1) / 2, (LEAF_Z0 + LEAF_Z1) / 2
    mb = prism(rrect(w, h, 30.0, 14), -LEAF_T / 2, LEAF_T / 2, bevel=3.0, segs=3, mat='GLASS_WING')
    mb.xf(FRAME((cx, 0, cz), (1, 0, 0), (0, 0, 1), (0, -1, 0)))
    return P('WING_leaf', 6, 2, 'wing', mb, (cx, 0, cz), insert=(1, 0, 0), parent='WING')


def lid():
    mb = MB('GLASS_BODY')
    z0, z1 = LID_Z0, LID_Z1
    out = stadium(140.0, 1400.0, 64)
    cav = stadium(140.0 - 2 * WALL, 1400.0 - 2 * WALL, 64)
    # outer skin: small rounded bottom edge, generous rounded top edge
    lv = []
    bb, bt = 1.2, 7.0
    for k in range(3):
        ph = (PI / 2) * k / 2
        lv.append((bb * (1 - sin(ph)), z0 + bb * (1 - cos(ph))))
    ns = 7
    for k in range(ns + 1):
        ph = (PI / 2) * (1 - k / ns)
        lv.append((bt * (1 - sin(ph)), z1 - bt * (1 - cos(ph))))
    ol = [mb.loop2(offset2d(out, d) if d else out, z) for d, z in lv]
    for a, b in zip(ol, ol[1:]):
        mb.bridge(a, b)
    # cavity skin: chamfered mouth, filleted ceiling
    cv = [(-1.0, z0), (-0.3, z0 + 0.3), (0.0, z0 + 1.0)]
    fr = 3.0
    for k in range(4):
        ph = (PI / 2) * k / 3
        cv.append((fr * (1 - cos(ph)), LID_CEIL - fr + fr * sin(ph)))
    cl = [mb.loop2(offset2d(cav, d) if d else cav, z) for d, z in cv]
    for a, b in zip(cl, cl[1:]):
        mb.bridge(a, b)
    mb.bridge(ol[0], cl[0])            # bottom rim
    # countersunk screw holes through the top
    top_holes, ceil_holes = [], []
    n = 28
    for (x, y) in LID_SCREWS:
        h0 = mb.loop2(circle(3.0, n, x, y), LID_CEIL)
        h1 = mb.loop2(circle(2.7, n, x, y), LID_CEIL + 0.3)
        h2 = mb.loop2(circle(2.7, n, x, y), z1 - 2.8)
        h3 = mb.loop2(circle(5.5, n, x, y), z1)
        mb.bridge(h0, h1)
        mb.bridge(h1, h2)
        mb.bridge(h2, h3)
        ceil_holes.append(h0)
        top_holes.append(h3)
    mb.cap(cl[-1], ceil_holes)
    mb.cap(ol[-1], top_holes)
    return P('RAIL_lid', 5, 9, 'glass', mb, (0, 0, 970))


def build_wave4():
    return [post('GLS_post_entry', -1), post('GLS_post_exit', +1),
            panel('GLS_panel_entry', -1), panel('GLS_panel_exit', +1)]
