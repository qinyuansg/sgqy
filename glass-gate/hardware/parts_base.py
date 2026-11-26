"""Wave 1 - base rail, anchor bolts, levelling feet (pedestal-local mm; +x = lane side)."""
from gg_mesh import *
from parts_drive import P

W, L = 140.0, 1400.0
BASE_Z0, BASE_Z1 = 4.0, 30.0
ANCHORS = [(30.0, -450.0), (30.0, -170.0), (30.0, 170.0), (30.0, 450.0)]
FEET = [(46.0, -500.0), (-46.0, -500.0), (46.0, 500.0), (-46.0, 500.0)]
CH_X0, CH_X1, CH_Y, CH_Z = -30.0, -8.0, 640.0, 18.0     # cable channel


def base_rail():
    mb = MB('METAL_ALU')
    out = stadium(W, L, 40)
    # side wall with a machined reveal groove, 3 mm top chamfer
    lv = [(1.0, BASE_Z0), (0.0, BASE_Z0 + 1.0), (0.0, 11.0), (1.4, 11.6), (1.4, 14.4), (0.0, 15.0), (0.0, BASE_Z1 - 3.0), (3.0, BASE_Z1)]
    loops = [mb.loop2(offset2d(out, d) if d else out, z) for d, z in lv]
    for a, b in zip(loops, loops[1:]):
        mb.bridge(a, b)
    bot, top = loops[0], loops[-1]
    # machined groove parallel to the edge
    g = [mb.loop2(offset2d(out, d), z) for d, z in ((5.0, BASE_Z1), (5.3, BASE_Z1 - 0.8), (6.1, BASE_Z1 - 0.8), (6.4, BASE_Z1))]
    mb.bridge(top, g[0])
    for a, b in zip(g, g[1:]):
        mb.bridge(a, b)
    top = g[-1]
    top_holes, bot_holes = [], []
    # cable channel (blind slot)
    ch = rrect(CH_X1 - CH_X0, 2 * CH_Y, 11.0, 8, (CH_X0 + CH_X1) / 2, 0.0)
    c0 = mb.loop2(offset2d(ch, -0.7), BASE_Z1)
    c1 = mb.loop2(ch, BASE_Z1 - 0.7)
    c2 = mb.loop2(ch, CH_Z + 1.2)
    c3 = mb.loop2(offset2d(ch, 1.2), CH_Z)
    mb.bridge(c0, c1)
    mb.bridge(c1, c2)
    mb.bridge(c2, c3)
    mb.cap(c3)
    top_holes.append(c0)
    # counterbored anchor holes
    for (x, y) in ANCHORS:
        n = 32
        a0 = mb.loop2(circle(11.6, n, x, y), BASE_Z1)
        a1 = mb.loop2(circle(11.0, n, x, y), BASE_Z1 - 0.6)
        a2 = mb.loop2(circle(11.0, n, x, y), 20.0)
        a3 = mb.loop2(circle(5.6, n, x, y), 20.0)
        a4 = mb.loop2(circle(5.6, n, x, y), BASE_Z0)
        for p, q in ((a0, a1), (a1, a2), (a2, a3), (a3, a4)):
            mb.bridge(p, q)
        top_holes.append(a0)
        bot_holes.append(a4)
    # tapped holes for the levelling feet
    for (x, y) in FEET:
        n = 20
        f0 = mb.loop2(circle(4.9, n, x, y), BASE_Z1)
        f1 = mb.loop2(circle(4.45, n, x, y), BASE_Z1 - 0.45)
        f2 = mb.loop2(circle(4.45, n, x, y), BASE_Z0)
        mb.bridge(f0, f1)
        mb.bridge(f1, f2)
        top_holes.append(f0)
        bot_holes.append(f2)
    mb.cap(top, top_holes)
    mb.cap(bot, bot_holes)
    return P('BASE_rail', 1, 1, 'metal_heavy', mb, (0, 0, 17))


def anchors():
    parts = []
    for i, (x, y) in enumerate(ANCHORS):
        mb = MB('METAL_STEEL').add(cap_screw(10.0, 17.3, 16.0, 10.0, n=28, washer=20.0), T(x, y, 21.3))
        parts.append(P('BASE_anchor_%d' % i, 1, 2, 'screw', mb, (x, y, 21.3), screw=True))
    return parts


def feet():
    parts = []
    for i, (x, y) in enumerate(FEET):
        f = MB('METAL_STEEL')
        f.add(lathe([(0, 0), (13.2, 0), (14.0, 0.8), (14.0, 1.7), (0, 1.7)], 28, 'RUBBER'))
        f.add(lathe([(0, 1.5), (13.4, 1.5), (13.4, 2.7), (12.4, 3.7), (0, 3.7)], 28, 'METAL_STEEL'))
        f.add(lathe([(0, 25.9)] + thread_profile(4.0, 25.9, 3.6, 1.0, tip=False) + [(0, 3.6)], 16, 'METAL_STEEL'))
        f.add(socket_head(4.0, 4.0, 4.0, 2.6, 18, mat='METAL_STEEL', z0=25.8))
        mb = MB('METAL_STEEL').add(f, T(x, y, 0))
        parts.append(P('BASE_foot_%d' % i, 1, 0, 'metal_small', mb, (x, y, 2.0)))
    return parts


def build():
    return feet() + [base_rail()] + anchors()
