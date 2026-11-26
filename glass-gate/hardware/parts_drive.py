"""Wave 2 - drive unit inside the centre column (pedestal-local mm, axis = Z through 0,0)."""
from gg_mesh import *

MOD = 1.5
N_SUN, N_PLANET, N_RING = 18, 18, 54
CARRIER_R = MOD * (N_SUN + N_PLANET) / 2.0      # 27 mm
RATIO = 1.0 + N_RING / N_SUN                     # 4.0  (ring fixed, sun in, carrier out)
GEAR_Z0, GEAR_Z1 = 209.0, 229.0
ROD_ANG = (60.0, 180.0, 300.0)


def P(name, wave, order, kind, mb, origin, insert=(0, 0, 1), **kw):
    d = dict(name=name, wave=wave, order=order, kind=kind, mb=mb, origin=origin, insert=insert, screw=False,
             parent=None, uv=None, wave_fn=None)
    d.update(kw)
    return d


def fin_outline(n=40, rb=38.2, rt=42.0, wb=1.35, wt=0.8):
    pts = []
    step = TAU / n
    for i in range(n):
        a = step * i
        hb, ht = wb / rb, wt / rt
        pts += [(rb, a - step / 2), (rb, a - hb - (step / 2 - hb) * 0.5), (rb, a - hb),
                (rt - 0.35, a - ht), (rt, a - ht * 0.45), (rt, a + ht * 0.45), (rt - 0.35, a + ht),
                (rb, a + hb), (rb, a + hb + (step / 2 - hb) * 0.5)]
    return [(r * cos(t), r * sin(t)) for r, t in pts]


def motor():
    mb = MB('METAL_ALU')
    # mounting flange (dark)
    mb.add(lathe([(0, 30.5), (41.2, 30.5), (42, 31.3), (42, 36.2), (41.2, 37.0), (0, 37.0)], 72, 'METAL_DARK'))
    # rear end bell with a machined groove
    mb.add(lathe([(0, 36.8), (39.4, 36.8), (40, 37.6), (40, 45.6), (38.8, 46.6), (38.8, 48.4), (40, 49.4), (40, 58.6),
                  (39.2, 59.4), (36, 59.4), (36, 60.5), (0, 60.5)], 72, 'METAL_ALU'))
    # dark stator core seen through the winding gaps
    prof = [(0, 59.0)]
    z = 59.0
    while z < 153.0:
        prof += [(21.6, z), (21.6, z + 0.7), (21.2, z + 0.85), (21.2, z + 1.15)]
        z += 1.3
    prof += [(21.6, 153.2), (0, 153.2)]
    mb.add(lathe(prof, 48, 'METAL_DARK'))
    # copper windings: 12 concentrated coils, 7 turns each (racetracks through the can)
    for k in range(12):
        a = rad(30 * k + 15)
        for j in range(7):
            rho = 23.2 + 1.25 * j
            hw = 3.9 + 0.18 * j
            pts = []
            for i in range(9):
                ang = PI + PI * i / 8
                pts.append((hw * cos(ang), 70.5 + hw * sin(ang)))
            for i in range(9):
                ang = PI * i / 8
                pts.append((hw * cos(ang), 141.5 + hw * sin(ang)))
            path = [(rho * cos(a) - t * sin(a), rho * sin(a) + t * cos(a), z) for t, z in pts]
            mb.add(tube(path, 0.58, 6, 'COPPER', closed=True))
    # white slot insulators between the coils (thin radial fins)
    for k in range(12):
        a = 30 * k
        mb.add(cbox(22.0, 32.6, -0.45, 0.45, 61.5, 152.0, mat='PLASTIC_WHITE'), RZ(a))
    # tie rods
    for k in range(4):
        a = rad(45 + 90 * k)
        mb.add(cyl(1.5, 59.5, 153.5, 12, mat='METAL_STEEL'), T(35.2 * cos(a), 35.2 * sin(a), 0))
    # finned can
    mb.add(prism(fin_outline(), 70.0, 142.0, bevel=0.6, mat='METAL_ALU'))
    # front end bell
    mb.add(lathe([(0, 151.5), (36, 151.5), (36, 152.5), (39.2, 152.5), (40, 153.3), (40, 159.6), (44.2, 161.8), (45, 162.6),
                  (45, 169.2), (44.2, 170.0), (15, 170.0), (15, 172.6), (14.4, 173.2), (7, 173.2), (7, 170.6), (0, 170.6)],
                 72, 'METAL_ALU'))
    for k in range(4):
        a = rad(45 + 90 * k)
        mb.add(cap_screw(3.0, 0, n=14), T(35.2 * cos(a), 35.2 * sin(a), 169.95))
    for k in range(3):
        a = rad(120 * k)
        mb.add(cap_screw(3.0, 0, n=14), T(42.0 * cos(a), 42.0 * sin(a), 169.95))
    mb.add(ring(5.05, 7.4, 172.2, 173.6, 28, ch=0.3, mat='RUBBER'))
    # nameplate riveted on the fins, facing the lane
    Mn = FRAME((42.15, 0, 106.0), (0, 1, 0), (0, 0, 1), (1, 0, 0))
    mb.add(prism(rrect(26.0, 16.0, 1.5, 3), 0.0, 0.8, bevel=0.2, mat='METAL_STEEL'), Mn)
    for (u, v) in ((-11.0, -6.0), (11.0, -6.0), (-11.0, 6.0), (11.0, 6.0)):
        mb.add(lathe([(0, 0.7), (0.9, 0.7), (0.7, 1.15), (0, 1.25)], 10, 'METAL_STEEL'), Mn @ T(u, v, 0))
    for i, (v, w) in enumerate(((4.6, 15.0), (2.0, 9.0), (-0.4, 12.0), (-2.8, 7.0), (-5.2, 13.0))):
        mb.add(cbox(-8.5, -8.5 + w, v - 0.55, v + 0.55, 0.78, 0.84, mat='CHIP_BLACK'), Mn)
    # motor shaft (plain round, so nobody sees that it does not turn)
    mb.add(lathe([(0, 170), (5, 170), (5, 225.0), (4.5, 225.5), (0, 225.5)], 32, 'METAL_STEEL'))
    # cable gland + cable into the base channel
    az = rad(236.4)
    er = Vector((cos(az), sin(az), 0))
    tg = Vector((-sin(az), cos(az), 0))
    up = Vector((0, 0, 1))
    M = FRAME(er * 39.4 + up * 53.0, tg, up, er)
    mb.add(hex_nut(11.0, 3.6, 2.9, 'METAL_STEEL', z0=0.3), M)
    mb.add(ring(2.9, 4.4, 0.0, 6.2, 20, ch=0.4, mat='METAL_DARK'), M)
    path = fillet_path([er * 39.0 + up * 53.0, er * 46.1 + up * 53.0, er * 46.1 + up * 20.6, Vector((-25.5, -92, 20.6))], 4.5, 7)
    mb.add(tube(resample(path, 6.0), 2.4, 12, 'RUBBER'))
    mb.add(cbox(-28.8, -22.2, -103, -90, 18.3, 24.6, bevel=0.5, r=0.8, mat='CHIP_BLACK'))
    return P('DRV_motor', 2, 0, 'metal_heavy', mb, (0, 0, 100))


def brake():
    mb = MB('METAL_DARK')
    # magnet body with a coil groove
    mb.add(lathe([(6.5, 174.0), (30.3, 174.0), (31, 174.7), (31, 177.0), (28.6, 177.0), (28.6, 184.0), (31, 184.0), (31, 186.3),
                  (30.3, 187.0), (6.5, 187.0)], 64, 'METAL_DARK'))
    prof = [(27.0, 177.1)]
    z = 177.1
    while z < 183.6:
        prof += [(30.2, z + 0.1), (30.45, z + 0.35), (30.2, z + 0.6)]
        z += 0.7
    prof += [(27.0, 183.9)]
    mb.add(lathe(prof, 64, 'COPPER'))
    # armature plate
    mb.add(ring(7.0, 30.6, 188.0, 190.4, 64, ch=0.35, mat='METAL_STEEL'))
    # friction disc: steel core + linings
    mb.add(ring(7.0, 23.2, 191.7, 193.1, 64, ch=0.2, mat='METAL_STEEL'))
    mb.add(ring(15.5, 22.6, 191.2, 191.9, 64, ch=0.1, mat='RUBBER'))
    mb.add(ring(15.5, 22.6, 192.9, 193.6, 64, ch=0.1, mat='RUBBER'))
    # splined hub
    hub = gear_outline(0.8, 22, add=0.5, ded=0.6, n_flank=2, n_tip=1, n_root=1)
    mb.add(prism(hub, 190.7, 194.2, bevel=0.2, holes=[circle(5.2, 24)], mat='METAL_STEEL'))
    # end plate
    mb.add(ring(10.5, 31.0, 194.4, 198.0, 64, ch=0.5, mat='METAL_ALU'))
    for k in range(3):
        a = rad(120 * k + 30)
        x, y = 26.6 * cos(a), 26.6 * sin(a)
        mb.add(cyl(2.3, 186.8, 194.6, 14, mat='METAL_STEEL'), T(x, y, 0))
        mb.add(cap_screw(3.0, 0, n=14), T(x, y, 197.95))
    # two lead wires
    for sgn, mat in ((1, 'CABLE_RED'), (-1, 'CABLE_BLUE')):
        a0 = rad(200 + 4 * sgn)
        p = [(31.0 * cos(a0), 31.0 * sin(a0), 180.5), (34.5 * cos(a0), 34.5 * sin(a0), 180.5),
             (36.0 * cos(a0), 36.0 * sin(a0), 177.0), (36.0 * cos(a0), 36.0 * sin(a0), 169.6)]
        mb.add(tube(fillet_path(p, 1.5, 4), 0.6, 6, mat))
    return P('DRV_brake', 2, 1, 'metal_small', mb, (0, 0, 186))


def ring_gear():
    mb = MB('METAL_STEEL')
    # base plate
    mb.add(ring(9.2, 49.0, 202.0, 207.2, 96, ch=0.6, mat='METAL_DARK'))
    # input bearing
    mb.add(ring(7.4, 9.6, 203.0, 208.2, 32, ch=0.3, mat='METAL_STEEL'))
    mb.add(ring(5.25, 6.4, 203.0, 208.2, 32, ch=0.3, mat='METAL_STEEL'))
    mb.add(ring(6.2, 7.6, 203.6, 207.7, 32, mat='METAL_DARK'))
    # internal ring gear
    hole = gear_outline(MOD, N_RING, internal=True, backlash=0.08, n_flank=5, n_tip=2, n_root=2)
    lv = [(0.5, 206.6), (0.0, 207.1), (0.0, 209.6), (0.55, 210.0), (0.55, 210.9), (0.0, 211.3), (0.0, 214.3), (0.55, 214.7),
          (0.55, 215.6), (0.0, 216.0), (0.0, 218.4), (0.6, 219.0)]
    mb.add(prism(circle(49.0, 216), 206.6, 219.0, holes=[hole], hole_bevel=0.25, mat='METAL_STEEL', levels=lv))
    for k in range(3):
        a = rad(120 * k)
        mb.add(cap_screw(3.0, 0, n=14), T(46.0 * cos(a), 46.0 * sin(a), 218.95))
    for k in range(6):
        a = rad(60 * k + 30)
        mb.add(cyl(1.25, 218.6, 219.35, 12, ch=0.2, mat='METAL_DARK'), T(46.0 * cos(a), 46.0 * sin(a), 0))
    # timing mark (small brass index pin on the rim)
    mb.add(cyl(0.9, 218.6, 219.5, 10, ch=0.2, mat='BRASS'), T(46.0 * cos(rad(8)), 46.0 * sin(rad(8)), 0))
    # three legs down to the motor flange
    for ang in ROD_ANG:
        a = rad(ang)
        x, y = 42.0 * cos(a), 42.0 * sin(a)
        mb.add(hex_standoff(5.0, 170.2, 202.3, 'METAL_STEEL', ch=0.4), T(x, y, 0) @ RZ(ang))
    return P('DRV_ring', 2, 2, 'gear', mb, (0, 0, 210))


def _ball_bearing(mb, r_in, r_out, z0, z1, n_balls, M=None, n=32):
    w = (r_out - r_in)
    rb = w * 0.27
    rm = (r_in + r_out) / 2
    b = MB('METAL_STEEL')
    b.add(ring(r_out - w * 0.26, r_out, z0, z1, n, ch=w * 0.05, mat='METAL_STEEL'))
    b.add(ring(r_in, r_in + w * 0.26, z0, z1, n, ch=w * 0.05, mat='METAL_STEEL'))
    zc = (z0 + z1) / 2
    hh = min((z1 - z0) / 2 - rb * 0.55, rb * 0.6)
    b.add(ring(rm - rb * 0.55, rm + rb * 0.55, zc - hh, zc + hh, n, mat='BRASS'))
    for k in range(n_balls):
        a = TAU * k / n_balls
        b.add(sphere(rb, 10, 6, 'METAL_STEEL', zc), T(rm * cos(a), rm * sin(a), 0))
    mb.add(b, M)


def planet_mesh():
    """Planet gear at the origin; a tooth gap faces +x and -x (18 teeth)."""
    mb = MB('BRASS')
    out = gear_outline(MOD, N_PLANET, backlash=0.08)
    holes = [circle(5.6, 32)] + [circle(1.5, 12, 8.6 * cos(TAU * k / 6), 8.6 * sin(TAU * k / 6)) for k in range(6)]
    g = prism(out, GEAR_Z0, GEAR_Z1, bevel=0.3, holes=holes, hole_bevel=0.2, mat='BRASS')
    g.xf(RZ(10.0))
    mb.add(g)
    # ball bearings top and bottom
    _ball_bearing(mb, 2.55, 5.5, GEAR_Z1 - 4.6, GEAR_Z1 + 0.3, 8)
    _ball_bearing(mb, 2.55, 5.5, GEAR_Z0 - 0.3, GEAR_Z0 + 4.6, 8)
    return mb


def planets():
    parts = []
    for i in range(3):
        a = rad(120 * i)
        cx, cy = CARRIER_R * cos(a), CARRIER_R * sin(a)
        mb = MB('BRASS').add(planet_mesh(), T(cx, cy, 0) @ RZ(120 * i))
        parts.append(P('DRV_planet_%d' % i, 2, 3, 'gear', mb, (cx, cy, 219), parent='DRV_out', spin='planet'))
    return parts


def sun():
    mb = MB('BRASS')
    out = gear_outline(MOD, N_SUN, backlash=0.08)
    holes = [circle(1.2, 12, 7.3 * cos(TAU * k / 3 + 0.5), 7.3 * sin(TAU * k / 3 + 0.5)) for k in range(3)]
    mb.add(prism(out, GEAR_Z0, GEAR_Z1, bevel=0.3, holes=holes, hole_bevel=0.15, mat='BRASS'))
    mb.add(lathe([(0, 228.5), (4.2, 228.5), (4.2, 229.7), (3.7, 230.2), (0, 230.2)], 32, 'BRASS'))
    mb.add(socket_head(2.6, 1.8, 2.5, 1.3, 18, mat='METAL_STEEL', z0=230.0))
    return P('DRV_sun', 2, 4, 'gear', mb, (0, 0, 219), spin='sun')


def carrier():
    mb = MB('METAL_STEEL')

    def sdf(x, y):
        d = math.hypot(x, y) - 14.0
        for k in range(3):
            a = TAU * k / 3
            px, py = CARRIER_R * cos(a), CARRIER_R * sin(a)
            d = smin(d, sd_capsule(x, y, 0, 0, px, py, 4.6), 5.0)
            d = smin(d, math.hypot(x - px, y - py) - 6.8, 3.0)
        return d
    out = polar_outline(sdf, 240, 60.0)
    mb.add(prism(out, 233.0, 239.0, bevel=0.7, segs=2, mat='METAL_STEEL'))
    for k in range(3):
        a = TAU * k / 3
        px, py = CARRIER_R * cos(a), CARRIER_R * sin(a)
        mb.add(lathe([(0, 207.9), (2.1, 207.9), (2.5, 208.3), (2.5, 239.9), (2.1, 240.3), (0, 240.3)], 20, 'METAL_STEEL'), T(px, py, 0))
        mb.add(ring(2.55, 4.2, 238.8, 239.7, 20, ch=0.15, mat='METAL_DARK'), T(px, py, 0))
    # hub with blind bore for the output shaft
    mb.add(lathe([(8.25, 241.0), (8.25, 250.0), (8.8, 250.6), (13.4, 250.6), (14.0, 250.0), (14.0, 239.6), (15.2, 238.4),
                  (0, 238.4), (0, 241.0)], 48, 'METAL_STEEL'))
    M = FRAME(Vector((14.0 * cos(rad(60)), 14.0 * sin(rad(60)), 245.5)), Vector((-sin(rad(60)), cos(rad(60)), 0)),
              Vector((0, 0, 1)), Vector((cos(rad(60)), sin(rad(60)), 0)))
    mb.add(socket_head(1.6, 1.0, 1.6, 0.8, 12, mat='METAL_DARK', z0=-0.3), M)
    return P('DRV_carrier', 2, 5, 'gear', mb, (0, 0, 236), parent='DRV_out')


def shaft():
    mb = MB('METAL_STEEL')
    N = 48
    kw, kd = 5.0, 2.3
    # (z, r, keyed)
    st = [(241.3, 7.5, 0), (241.8, 8.0, 0), (251.6, 8.0, 0), (252.0, 9.6, 0), (252.4, 10.0, 0),
          (332.0, 10.0, 0), (332.0, 10.0, 1), (378.0, 10.0, 1), (378.0, 10.0, 0),
          (397.6, 10.0, 0), (398.0, 9.6, 0), (398.4, 9.0, 0),
          (408.0, 9.0, 0), (408.0, 9.0, 1), (472.0, 9.0, 1), (472.0, 9.0, 0),
          (919.6, 9.0, 0), (920.2, 8.4, 0), (920.6, 7.0, 0), (931.0, 7.0, 0), (931.6, 6.4, 0)]
    loops = [mb.loop2(keyed_loop(r, kw, kd, N, k), z) for z, r, k in st]
    for a, b in zip(loops, loops[1:]):
        mb.bridge(a, b)
    mb.cap(loops[0])
    mb.cap(loops[-1])
    # spring collar with a set screw
    mb.add(ring(10.05, 18.0, 323.0, 329.0, 48, ch=0.6, mat='METAL_DARK'))
    M = FRAME(Vector((0, 18.0, 326.0)), Vector((-1, 0, 0)), Vector((0, 0, 1)), Vector((0, 1, 0)))
    mb.add(socket_head(1.7, 1.0, 1.7, 0.8, 12, mat='METAL_STEEL', z0=-0.3), M)
    # feather keys sitting in the keyways (brass, a little proud)
    mb.add(cbox(7.9, 10.9, -2.3, 2.3, 340.0, 370.0, bevel=0.4, r=0.5, mat='BRASS'))
    return P('DRV_shaft', 2, 6, 'metal_heavy', mb, (0, 0, 590), parent='DRV_out')


def spring():
    R, zr0, zr1, turns, wr = 15.6, 266.0, 316.0, 7.0, 1.9
    a0 = rad(240.0)
    hx = helix(R, zr0, zr1, turns, 44, a0)
    p0 = Vector(hx[0])
    tg = Vector((-sin(a0), cos(a0), 0))
    # bottom tang: straight tangent leg reaching to the stop collar on a cage rod
    leg = [p0 - tg * 37.5, p0 - tg * 30, p0 - tg * 20, p0 - tg * 10, p0 - tg * 4]
    # top tang: turns up, ends just under the shaft collar
    a1 = a0 + TAU * turns
    p1 = Vector(hx[-1])
    t1 = Vector((-sin(a1), cos(a1), 0))
    top = fillet_path([p1, p1 + t1 * 5.0, p1 + t1 * 5.0 + Vector((0, 0, 3.4))], 2.6, 5)[1:]
    path = leg + hx + top
    mb = tube(path, wr, 12, 'SPRING_STEEL')
    return P('DRV_spring', 2, 7, 'spring', mb, (0, 0, 292))


def encoder():
    """Fixed read head (root) + rotating slotted disc (child)."""
    fx = MB('PCB_GREEN')
    # opto interrupter straddling the rim (U section in (r, z), extruded tangentially)
    u = [(31.5, 344.6), (42.9, 344.6), (42.9, 355.4), (31.5, 355.4), (31.5, 351.6), (39.2, 351.6), (39.2, 348.4), (31.5, 348.4)]
    opto = prism(u, -5.0, 5.0, bevel=0.3, mat='CHIP_BLACK')
    fx.add(opto, FRAME((0, 0, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0)))
    # vertical PCB behind it
    pcb = prism(rrect(26.0, 18.0, 1.5, 3, 0, 350.0), 43.0, 44.2, bevel=0.0, mat='PCB_GREEN')
    Mv = FRAME((0, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0))
    fx.add(pcb, Mv)
    fx.add(prism(rrect(8.0, 4.4, 0.4, 2, -7.0, 345.0), 44.2, 47.6, bevel=0.3, mat='PLASTIC_WHITE'), Mv)
    for k in range(4):
        fx.add(prism(rrect(0.6, 0.6, 0, 1, -9.4 + 1.6 * k, 345.0), 47.6, 48.6, mat='PCB_GOLD'), Mv)
    fx.add(prism(rrect(4.9, 3.9, 0.3, 2, 9.6, 353.5), 44.2, 45.7, bevel=0.2, mat='CHIP_BLACK'), Mv)
    for k in range(3):
        fx.add(prism(rrect(1.6, 0.8, 0, 1, 2.0 + 3.0 * k, 346.0), 44.2, 44.75, mat='CHIP_BLACK'), Mv)
    fx.add(prism(rrect(1.6, 0.8, 0, 1, -8.0, 355.5), 44.2, 44.8, mat='LED_STATUS'), Mv)
    # hanging bracket + two screws
    fx.add(prism(rrect(12.0, 29.4, 1.0, 3, 0, 369.1), 44.5, 46.0, bevel=0.3, mat='METAL_ALU'), Mv)
    for zz in (357.5, 362.5):
        fx.add(cap_screw(1.6, 0, n=10), FRAME((45.95, 0, zz), (0, 1, 0), (0, 0, 1), (1, 0, 0)))
    root = P('DRV_encoder', 2, 8, 'pcb', fx, (0, 0, 350))
    # disc
    dk = MB('METAL_STEEL')
    slots = []
    ns = 72
    for k in range(ns):
        a = TAU * k / ns + TAU / ns / 2
        w = TAU / ns * 0.25
        slots.append([(28.5 * cos(a - w), 28.5 * sin(a - w)), (33.4 * cos(a - w), 33.4 * sin(a - w)),
                      (33.4 * cos(a + w), 33.4 * sin(a + w)), (28.5 * cos(a + w), 28.5 * sin(a + w))])
    # index window + 6 lightening holes
    holes = [circle(12.0, 48)] + slots + [circle(3.6, 16, 20.5 * cos(TAU * k / 6), 20.5 * sin(TAU * k / 6)) for k in range(6)]
    dk.add(prism(circle(35.0, 144), 349.6, 350.4, holes=holes, mat='METAL_STEEL'))
    dk.add(lathe([(10.05, 343.6), (14.4, 343.6), (15.0, 344.2), (15.0, 348.0), (17.5, 348.0), (17.5, 352.0), (15.0, 352.0),
                  (15.0, 355.8), (14.4, 356.4), (10.05, 356.4)], 48, 'METAL_ALU'))
    M = FRAME(Vector((-15.0, 0, 354.0)), Vector((0, -1, 0)), Vector((0, 0, 1)), Vector((-1, 0, 0)))
    dk.add(socket_head(1.5, 0.9, 1.5, 0.7, 12, mat='METAL_DARK', z0=-0.3), M)
    disc = P('DRV_encdisc', 2, 8, 'metal_small', dk, (0, 0, 350), parent='DRV_out')
    return [root, disc]


def cage():
    mb = MB('METAL_ALU')
    holes = [circle(18.3, 48)] + [circle(7.0, 24, 34.0 * cos(TAU * k / 6), 34.0 * sin(TAU * k / 6)) for k in range(6)]
    mb.add(prism(circle(50.0, 128), 384.0, 396.0, bevel=0.9, segs=2, holes=holes, hole_bevel=0.5, mat='METAL_ALU'))
    _ball_bearing(mb, 10.06, 18.2, 385.0, 395.0, 9, n=48)
    for ang in ROD_ANG:
        a = rad(ang)
        x, y = 46.0 * cos(a), 46.0 * sin(a)
        mb.add(cyl(2.0, 219.3, 397.0, 16, mat='METAL_STEEL'), T(x, y, 0))
        mb.add(hex_nut(7.0, 3.2, 1.9, 'BRASS', z0=396.05), T(x, y, 0))
        mb.add(lathe([(0, 399.2), (2.0, 399.2), (1.4, 399.9), (0, 399.9)], 16, 'METAL_STEEL'), T(x, y, 0))
        mb.add(hex_nut(7.0, 3.6, 1.9, 'BRASS', z0=219.25), T(x, y, 0))
        mb.add(hex_nut(7.0, 3.0, 1.9, 'BRASS', z0=380.9), T(x, y, 0))
    # spring stop collar on the 180 deg rod
    mb.add(ring(1.95, 5.2, 260.0, 272.0, 20, ch=0.5, mat='BRASS'), T(-46.0, 0, 0))
    return P('DRV_cage', 2, 9, 'metal_small', mb, (0, 0, 390))


def build():
    parts = [motor(), brake(), ring_gear()]
    parts += planets()
    parts += [sun(), carrier(), shaft(), spring()]
    parts += encoder()
    parts += [cage()]
    return parts
