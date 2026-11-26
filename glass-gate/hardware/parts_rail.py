"""Wave 5 - top rail: spine, LED strips, reader modules, screws, badge (pedestal-local mm).
Reader end is at -Y.  Inside of the glass lid: |x| < 62, z 936.4 .. 992."""
from gg_mesh import *
from parts_drive import P, _ball_bearing
from parts_glass import LID_SCREWS, LID_Z1

SPINE_Z0, SPINE_Z1 = 933.4, 936.4      # plate; modules stand on z = SPINE_Z1
FLOOR = SPINE_Z1
LED_HW = 67.95                          # half width of the LED flex band (outer face)
LED_Z = 936.8
MX = FRAME((0, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0))     # local (px,py,pz) -> (pz, px, py)


def led_chip():
    """One SMD LED: local x = along the strip, y = across, z = outward (emitting side)."""
    c = MB('PLASTIC_WHITE')
    c.add(cbox(-1.6, 1.6, -1.2, 1.2, -0.02, 0.72, bevel=0.14, mat='PLASTIC_WHITE'))
    c.add(cbox(-1.22, 1.22, -0.88, 0.88, 0.6, 0.95, bevel=0.1, mat='LED_STRIP'))
    c.add(cbox(-2.15, -1.55, -0.8, 0.8, -0.02, 0.25, mat='PCB_GOLD'))
    c.add(cbox(1.55, 2.15, -0.8, 0.8, -0.02, 0.25, mat='PCB_GOLD'))
    return c


def stadium_path(hw, straight, pitch):
    """(position, tangent, outward normal) samples round a stadium, CCW."""
    out = []
    ns = max(1, int(round(straight / pitch)))
    na = max(1, int(round(PI * hw / pitch)))
    for i in range(ns):
        y = -straight / 2 + straight * (i + 0.5) / ns
        out.append(((hw, y), (0, 1), (1, 0)))
    for i in range(na):
        a = PI * (i + 0.5) / na
        out.append(((hw * cos(a), straight / 2 + hw * sin(a)), (-sin(a), cos(a)), (cos(a), sin(a))))
    for i in range(ns):
        y = straight / 2 - straight * (i + 0.5) / ns
        out.append(((-hw, y), (0, -1), (-1, 0)))
    for i in range(na):
        a = PI + PI * (i + 0.5) / na
        out.append(((hw * cos(a), -straight / 2 + hw * sin(a)), (-sin(a), cos(a)), (cos(a), sin(a))))
    return out


def spine():
    mb = MB('METAL_ALU')
    W, L = 135.2, 1395.2
    holes = [rrect(30.0, 86.0, 15.0, 8, 0.0, y) for y in (-125.0, 125.0, 245.0, 365.0, 485.0)]
    holes += [circle(5.6, 20, -40.0, -602.0), circle(5.6, 20, -40.0, 602.0)]
    mb.add(prism(stadium(W, L, 48), SPINE_Z0, SPINE_Z1, bevel=0.5, holes=holes, hole_bevel=0.4, mat='METAL_ALU'))
    mb.add(prism(stadium(W, L, 48), SPINE_Z1 - 0.4, 939.9, bevel_top=0.4, bevel_bot=0.0, holes=[stadium(W - 4.0, L - 4.0, 48)],
                 mat='METAL_ALU'))
    # pillars for the lid screws
    for (x, y) in LID_SCREWS:
        mb.add(lathe([(2.3, 983.0), (2.3, 991.6), (4.5, 991.6), (5.0, 991.1), (5.0, 938.0), (6.6, 936.2), (0, 936.2), (0, 983.0)],
                     24, 'METAL_ALU'), T(x, y, 0))
    # shaft bearing boss in the middle
    mb.add(ring(9.0, 17.0, SPINE_Z1 - 0.3, 941.0, 40, ch=0.6, mat='METAL_ALU'))
    mb.add(cyl(9.2, SPINE_Z1 - 0.3, 939.6, 32, ch=0.4, mat='METAL_DARK'))
    return P('RAIL_spine', 5, 2, 'metal_heavy', mb, (0, 0, 935))


def led_strip():
    mb = MB('PLASTIC_WHITE')
    straight = 1400.0 - 140.0
    mb.add(prism(stadium(2 * LED_HW, straight + 2 * LED_HW, 48), 934.0, 939.6,
                 holes=[stadium(2 * (LED_HW - 0.25), straight + 2 * (LED_HW - 0.25), 48)], mat='PLASTIC_WHITE'))
    chip = led_chip()
    up = (0, 0, 1)
    for (p, t, n) in stadium_path(LED_HW, straight, 6.4):
        M = FRAME((p[0], p[1], LED_Z), (t[0], t[1], 0), up, (n[0], n[1], 0))
        mb.add(chip, M)
    part = P('RAIL_led', 5, 3, 'led', mb, (0, 0, LED_Z))
    part['wave_fn'] = lambda v: 0.02 + 0.86 * (v[:, 1] + 700.0) / 1400.0
    return part


def colring():
    mb = MB('METAL_ALU')
    mb.add(lathe(ring_profile(47.0, 57.8, 921.6, 932.4, 0.8, 2), 96, 'METAL_ALU'))
    holes = [circle(13.2, 32)] + [circle(10.5, 24, 30.0 * cos(TAU * k / 6), 30.0 * sin(TAU * k / 6)) for k in range(6)]
    mb.add(prism(circle(47.6, 64), 924.0, 928.0, bevel=0.4, holes=holes, hole_bevel=0.3, mat='METAL_ALU'))
    _ball_bearing(mb, 7.06, 13.4, 922.2, 930.2, 9, n=40)
    mb.add(ring(57.85, 58.1, 922.6, 931.4, 96, mat='PLASTIC_WHITE'))
    chip = led_chip()
    n = 56
    for k in range(n):
        a = TAU * (k + 0.5) / n
        M = FRAME((58.1 * cos(a), 58.1 * sin(a), 927.0), (-sin(a), cos(a), 0), (0, 0, 1), (cos(a), sin(a), 0))
        mb.add(chip, M)
    part = P('LED_colring', 5, 1, 'led', mb, (0, 0, 927))
    part['wave_fn'] = lambda v: 0.47 + 0.0 * v[:, 1]
    return part


def accent(name, ysign):
    y0 = 572.0 * ysign
    mb = MB('METAL_ALU')
    mb.add(cbox(54.0, 57.0, y0 - 5, y0 + 5, 30.5, 266.0, bevel=0.4, r=0.8, mat='METAL_ALU'))
    mb.add(cbox(44.0, 58.0, y0 - 8, y0 + 8, 30.5, 33.5, bevel=0.5, r=1.2, mat='METAL_ALU'))
    mb.add(cap_screw(3.0, 0, n=12), T(48.5, y0, 33.45))
    mb.add(prism(rrect(8.0, 124.0, 4.0, 8, y0, 200.0), 56.9, 60.6, bevel=1.2, segs=2, mat='LED_STRIP'), MX)
    part = P(name, 5, 0, 'led', mb, (56.0, y0, 150.0))
    u0 = 0.03 if ysign < 0 else 0.89
    part['wave_fn'] = lambda v: u0 + 0.03 * np.clip((v[:, 2] - 138.0) / 124.0, 0.0, 1.0)
    return part


# ---- reader modules ----------------------------------------------------------
RFID_C = (0.0, -612.0)
QR_C = (0.0, -525.0)
LCD_C = (0.0, -395.0)
SPK_C = (0.0, -225.0)
POD_Y = -285.0


def _standoffs(mb, pts, z1, af=4.0, screw=True):
    for (x, y) in pts:
        mb.add(hex_standoff(af, FLOOR + 0.05, z1 - 0.05, 'BRASS', ch=0.25), T(x, y, 0))


def rfid():
    cx, cy = RFID_C
    zb, zt = 988.4, 989.6
    mb = MB('PCB_GREEN')
    mnt = [(cx + sx * 34.5, cy + sy * 34.5) for sx in (-1, 1) for sy in (-1, 1)]
    mb.add(prism(rrect(76, 76, 6.0, 5, cx, cy), zb, zt, bevel=0.1, holes=[circle(1.3, 12, x, y) for x, y in mnt], mat='PCB_GREEN'))
    _standoffs(mb, mnt, zb)
    for (x, y) in mnt:
        mb.add(cap_screw(2.0, 0, head_d=3.2, head_h=1.3, n=10), T(x, y, zt - 0.02))
    # copper spiral antenna: 5 turns, rounded-square
    s0, pitch, rc, turns, seg = 35.5, 1.6, 10.0, 5, 7
    path = []
    cs = ((1, 1, 0.0), (-1, 1, PI / 2), (-1, -1, PI), (1, -1, 1.5 * PI))
    tot = turns * 4 * (seg + 1)
    idx = 0
    for k in range(turns):
        for (sx, sy, a0) in cs:
            for j in range(seg + 1):
                s = s0 - pitch * turns * idx / tot
                a = a0 + (PI / 2) * j / seg
                path.append((cx + sx * (s - rc) + rc * cos(a), cy + sy * (s - rc) + rc * sin(a), zt + 0.05))
                idx += 1
    mb.add(ribbon(path, (0, 0, 1), 0.14, 0.9, 'COPPER'))
    mb.add(cyl(1.3, zt - 0.02, zt + 0.16, 12, mat='PCB_GOLD'), T(path[0][0], path[0][1] - 1.5, 0))
    mb.add(cyl(1.3, zt - 0.02, zt + 0.16, 12, mat='PCB_GOLD'), T(path[-1][0] - 1.0, path[-1][1] - 1.0, 0))
    # card-tap icon (silkscreen): corner brackets, card, finger, waves
    zi0, zi1 = zt - 0.01, zt + 0.07
    ic = MB('PRINT_WHITE')
    hb, arm, rr = 21.0, 9.0, 4.0
    for (sx, sy) in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
        pp = fillet_path([(sx * (hb - arm), sy * hb, 0), (sx * hb, sy * hb, 0), (sx * hb, sy * (hb - arm), 0)], rr, 6)
        ic.add(ribbon([(p.x, p.y, (zi0 + zi1) / 2) for p in pp], (0, 0, 1), zi1 - zi0, 1.7, 'PRINT_WHITE'))
    ic.add(prism(rrect(17.0, 11.5, 1.8, 4, -1.5, 1.5), zi0, zi1, holes=[rrect(14.4, 8.9, 0.9, 3, -1.5, 1.5)], mat='PRINT_WHITE'))
    ic.add(prism(rrect(3.4, 2.6, 0.5, 2, -5.5, 2.5), zi0, zi1, mat='PRINT_WHITE'))
    fing = MB('PRINT_WHITE')
    fing.add(prism(rrect(3.4, 11.0, 1.7, 5, 0.0, 5.0), zi0, zi1, mat='PRINT_WHITE'))          # index finger
    fing.add(prism(rrect(9.6, 8.6, 2.8, 5, 2.4, -4.2), zi0, zi1, mat='PRINT_WHITE'))          # palm
    for k, (fx, fy) in enumerate(((3.4, 1.0), (6.2, 0.3))):
        fing.add(prism(rrect(2.7, 4.6, 1.3, 4, fx, fy), zi0, zi1, mat='PRINT_WHITE'))         # folded fingers
    th = MB('PRINT_WHITE').add(prism(rrect(3.2, 7.4, 1.6, 4, 0.0, 2.6), zi0, zi1, mat='PRINT_WHITE'))
    fing.add(th, T(-2.0, -5.2, 0) @ RZ(48))                                                   # thumb
    ic.add(fing, T(6.8, -7.0, 0) @ RZ(30))
    for sgn in (-1, 1):
        for rw, half in ((13.5, 26.0), (17.0, 30.0)):
            a_c = 0.0 if sgn > 0 else PI
            pp = [(-1.5 + rw * cos(a_c + rad(half) * (2 * j / 10 - 1)), 1.5 + rw * sin(a_c + rad(half) * (2 * j / 10 - 1)), (zi0 + zi1) / 2)
                  for j in range(11)]
            ic.add(ribbon(pp, (0, 0, 1), zi1 - zi0, 1.3, 'PRINT_WHITE'))
    mb.add(ic, T(cx, cy, 0))
    # underside: reader IC, crystal, connector, a few passives
    mb.add(cbox(cx - 3.5, cx + 3.5, cy - 26.5, cy - 19.5, zb - 1.1, zb + 0.02, bevel=0.2, mat='CHIP_BLACK'))
    mb.add(cbox(cx - 14.0, cx - 8.0, cy - 25.0, cy - 21.5, zb - 1.4, zb + 0.02, bevel=0.3, r=0.8, mat='METAL_STEEL'))
    mb.add(cbox(cx + 8.0, cx + 20.0, cy - 26.0, cy - 21.0, zb - 4.6, zb + 0.02, bevel=0.3, mat='PLASTIC_WHITE'))
    for k in range(6):
        mb.add(cbox(cx - 20.0 + 2.6 * k, cx - 18.4 + 2.6 * k, cy - 30.4, cy - 29.6, zb - 0.5, zb + 0.02, mat='CHIP_BLACK'))
    part = P('RAIL_rfid', 5, 4, 'pcb', mb, (cx, cy, 989.0))
    part['uv'] = {'PCB_GREEN': ((cx - 38, cy - 38, 0), (76, 0, 0), (0, 76, 0))}
    return part


def qr():
    cx, cy = QR_C
    zt = 991.4
    mb = MB('PLASTIC_WHITE')
    f = MB('PLASTIC_WHITE')
    o_top = f.loop2(rrect(51.0, 45.0, 6.5, 5), zt)
    o_lip = f.loop2(rrect(51.0, 45.0, 6.5, 5), zt - 1.6)
    o_bot = f.loop2(rrect(21.0, 19.0, 4.0, 5), 968.0)
    i_top = f.loop2(rrect(46.6, 40.6, 5.0, 5), zt)
    i_bot = f.loop2(rrect(17.0, 15.0, 3.0, 5), 969.6)
    n = 24
    c_in = f.loop2(circle(4.3, n), 969.6)
    c_out = f.loop2(circle(4.3, n), 968.0)
    f.bridge(o_top, i_top)
    f.bridge(i_top, i_bot)
    f.bridge(o_top, o_lip)
    f.bridge(o_lip, o_bot)
    f.bridge(c_in, c_out)
    f.cap(i_bot, [c_in])
    f.cap(o_bot, [c_out])
    mb.add(f, T(cx, cy, 0))
    # lens barrel with stepped rings, sensor, glass lens
    mb.add(lathe([(3.0, 957.6), (7.4, 957.6), (7.4, 963.6), (6.4, 964.4), (6.4, 965.8), (5.4, 966.4), (5.4, 967.3), (4.5, 967.3),
                  (4.5, 966.6), (3.0, 966.0)], 32, 'METAL_DARK'), T(cx, cy, 0))
    mb.add(cyl(3.1, 957.6, 965.6, 20, mat='CHIP_BLACK'), T(cx, cy, 0))
    mb.add(lathe([(0, 966.2), (3.9, 966.2), (3.9, 968.5), (3.4, 969.3), (2.2, 969.95), (1.1, 970.25), (0, 970.35)], 28, 'GLASS_LENS'), T(cx, cy, 0))
    mb.add(cbox(cx - 10, cx + 10, cy - 10, cy + 10, 950.0, 957.8, bevel=0.6, r=1.2, mat='CHIP_BLACK'))
    zb, zp = 948.8, 950.0
    mnt = [(cx + sx * 19.0, cy + sy * 17.0) for sx in (-1, 1) for sy in (-1, 1)]
    mb.add(prism(rrect(46, 42, 2.0, 3, cx, cy), zb, zp, bevel=0.1, holes=[circle(1.3, 12, x, y) for x, y in mnt], mat='PCB_GREEN'))
    _standoffs(mb, mnt, zb)
    for (x, y) in mnt:
        mb.add(cap_screw(2.0, 0, head_d=3.2, head_h=1.3, n=10), T(x, y, zp - 0.02))
    mb.add(cbox(cx + 12.5, cx + 19.5, cy - 9, cy - 2, zp - 0.02, zp + 1.3, bevel=0.2, mat='CHIP_BLACK'))
    mb.add(cbox(cx - 20.5, cx - 13.5, cy - 6, cy + 6, zp - 0.02, zp + 4.6, bevel=0.3, mat='PLASTIC_WHITE'))
    for k in range(5):
        mb.add(cbox(cx + 12.5 + 1.5 * k, cx + 13.3 + 1.5 * k, cy + 4, cy + 5.6, zp - 0.02, zp + 0.5, mat='CHIP_BLACK'))
    # two white illumination LEDs under the funnel rim
    for sx in (-1, 1):
        mb.add(cbox(cx + sx * 15 - 1.6, cx + sx * 15 + 1.6, cy + 12.0, cy + 15.0, zp - 0.02, zp + 0.9, bevel=0.15, mat='PLASTIC_WHITE'))
    part = P('RAIL_qr', 5, 5, 'plastic', mb, (cx, cy, 970.0))
    part['uv'] = {'PCB_GREEN': ((cx - 23, cy - 21, 0), (46, 0, 0), (0, 42, 0))}
    return part


def lcd():
    cx, cy = LCD_C
    mb = MB('METAL_DARK')
    mb.add(prism(rrect(96, 166, 5.0, 5, cx, cy), 984.6, 991.2, bevel=0.6, segs=2, mat='METAL_DARK',
                 pockets=[(rrect(90.6, 160.6, 2.2, 3, cx, cy), 1.25, 0.0)]))
    mb.add(prism(rrect(90, 160, 1.9, 3, cx, cy), 990.0, 990.95, bevel=0.12, mat='SCREEN_LCD'))
    mb.add(prism(rrect(92, 162, 3.0, 3, cx, cy), 982.6, 984.7, bevel=0.3, mat='METAL_STEEL'))
    mnt = [(cx + sx * 41.0, cy + sy * 76.0) for sx in (-1, 1) for sy in (-1, 1)]
    _standoffs(mb, mnt, 982.6, af=4.5)
    # driver PCB hanging under the back plate
    py = cy - 25.0
    zb, zp = 975.0, 976.2
    mb.add(prism(rrect(64, 46, 2.0, 3, cx, py), zb, zp, bevel=0.1, mat='PCB_GREEN'))
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add(cyl(1.6, zp - 0.05, 982.7, 12, mat='BRASS'), T(cx + sx * 28.0, py + sy * 19.0, 0))
            mb.add(cap_screw(2.0, 0, head_d=3.2, head_h=1.3, n=10), T(cx + sx * 28.0, py + sy * 19.0, zb + 0.02) @ RX(180))
    # components on the underside (visible from the side / below)
    mb.add(cbox(cx - 6, cx + 6, py - 6, py + 6, zb - 1.5, zb + 0.02, bevel=0.25, mat='CHIP_BLACK'))
    mb.add(cbox(cx + 12, cx + 22, py - 4, py + 2.2, zb - 1.7, zb + 0.02, bevel=0.25, mat='CHIP_BLACK'))
    mb.add(cbox(cx - 24, cx - 12, py + 8, py + 13, zb - 4.6, zb + 0.02, bevel=0.3, mat='PLASTIC_WHITE'))
    for k in range(3):
        mb.add(lathe([(0, zb + 0.02), (2.5, zb + 0.02), (2.5, zb - 5.0), (2.0, zb - 5.5), (0, zb - 5.5)], 16, 'CAP_ALU'),
               T(cx - 22.0 + 7.0 * k, py - 14.0, 0))
    for k in range(8):
        mb.add(cbox(cx + 6.0 + 2.4 * k, cx + 7.6 + 2.4 * k, py + 12.0, py + 12.8, zb - 0.5, zb + 0.02, mat='CHIP_BLACK'))
    # FPC connector + ribbon from the panel edge round to the driver board
    mb.add(cbox(cx - 12.5, cx + 12.5, py + 18.6, py + 22.4, zp - 0.02, zp + 2.0, bevel=0.3, mat='PLASTIC_WHITE'))
    ye = cy + 83.0
    path = fillet_path([(cx, ye - 0.6, 986.3), (cx, ye + 5.6, 986.3), (cx, ye + 5.6, 979.6), (cx, ye - 20.0, 979.0),
                        (cx, py + 21.0, 977.9)], 2.4, 6)
    mb.add(ribbon(resample(path, 4.0), (1, 0, 0), 22.0, 0.25, 'CABLE_YELLOW'))
    part = P('RAIL_lcd', 5, 6, 'pcb', mb, (cx, cy, 986.0))
    part['uv'] = {'SCREEN_LCD': ((cx - 45, cy - 80, 0), (90, 0, 0), (0, 160, 0)),
                  'PCB_GREEN': ((cx - 32, py - 23, 0), (64, 0, 0), (0, 46, 0))}
    return part


def speaker():
    cx, cy = SPK_C
    s = MB('METAL_DARK')
    s.add(lathe([(20.0, 987.6), (20.0, 989.4), (17.6, 989.4), (17.6, 988.2), (11.0, 976.5), (11.0, 975.5), (12.2, 975.5), (19.0, 987.6)],
                48, 'METAL_DARK'))
    s.add(lathe([(13.8, 988.6), (14.5, 989.9), (15.7, 990.4), (16.9, 989.9), (17.7, 988.6), (17.7, 988.0), (13.8, 988.0)], 48, 'RUBBER'))
    s.add(lathe([(13.9, 988.7), (13.9, 988.0), (5.0, 979.6), (5.0, 980.4)], 48, 'CHIP_BLACK'))
    s.add(lathe([(0, 979.8), (5.3, 979.8), (4.6, 981.8), (2.7, 983.2), (0, 983.7)], 32, 'PLASTIC_BLACK'))
    s.add(cyl(11.6, 966.0, 975.7, 40, ch=0.6, mat='METAL_STEEL'))
    s.add(cyl(12.6, 964.4, 966.1, 40, ch=0.4, mat='METAL_DARK'))
    s.add(ring(20.0, 24.5, 986.4, 987.8, 48, ch=0.3, mat='METAL_ALU'))
    for k in range(3):
        a = rad(90 + 120 * k)
        x, y = 22.3 * cos(a), 22.3 * sin(a)
        s.add(hex_standoff(4.0, FLOOR + 0.05, 986.45, 'BRASS', ch=0.25), T(x, y, 0))
        s.add(cap_screw(2.0, 0, head_d=3.2, head_h=1.3, n=10), T(x, y, 987.75))
    for sx in (-1, 1):
        s.add(cbox(sx * 3.0 - 1.0, sx * 3.0 + 1.0, -16.5, -13.0, 974.0, 974.5, mat='PCB_GOLD'))
    mb = MB('METAL_DARK').add(s, T(cx, cy, 0))
    return P('RAIL_speaker', 5, 7, 'metal_small', mb, (cx, cy, 978.0))


def campod():
    t = 25.0
    c, s_ = cos(rad(t)), sin(rad(t))
    oz = LID_Z1 + 0.35 + (12.0 * c + 15.0 * s_)
    M = FRAME((0.0, POD_Y, oz), (1, 0, 0), (0, s_, c), (0, -c, s_))        # (u, v, w): w = out of the front face
    b = MB('PLASTIC_BLACK')
    b.add(prism(rrect(118.0, 24.0, 12.0, 12), -15.0, 0.0, bevel=0.9, segs=2, mat='PLASTIC_BLACK',
                pockets=[(rrect(114.4, 20.4, 10.2, 12), 4.6, 0.0)]))
    b.add(prism(rrect(113.8, 19.8, 9.9, 12), -1.25, -0.1, bevel=0.25, segs=2, mat='GLASS_LENS'))
    for sx in (-1, 1):
        u = sx * 15.0
        b.add(lathe([(2.5, -4.7), (5.3, -4.7), (5.3, -3.9), (4.7, -3.6), (4.7, -2.2), (4.2, -1.9), (3.6, -1.9), (3.6, -2.4), (3.1, -2.4),
                     (3.1, -2.9), (2.5, -2.9)], 28, 'METAL_DARK'), T(u, 0, 0))
        b.add(cyl(2.6, -4.7, -3.5, 20, mat='CHIP_BLACK'), T(u, 0, 0))
        b.add(lathe([(0, -3.7), (2.45, -3.7), (2.45, -3.1), (1.9, -2.6), (1.0, -2.3), (0, -2.2)], 24, 'GLASS_LENS'), T(u, 0, 0))
        for vv in (-5.6, 0.0, 5.6):
            b.add(cbox(sx * 43.0 - 1.6, sx * 43.0 + 1.6, vv - 1.6, vv + 1.6, -4.7, -3.8, bevel=0.15, mat='CHIP_BLACK'))
            b.add(dome(1.15, 0.45, 12, 4, 'LED_IR', z0=-3.9), T(sx * 43.0, vv, 0))
    b.add(cyl(0.7, -4.7, -4.2, 10, mat='LED_STATUS'), T(0, 0, 0))
    mb = MB('PLASTIC_BLACK').add(b, M)
    # wedge foot between the tilted body and the lid
    y_f = POD_Y - 12.0 * s_          # front-bottom edge
    z_f = oz - 12.0 * c
    y_b = POD_Y - 12.0 * s_ + 15.0 * c
    tri = [(y_f + 1.6, LID_Z1 + 0.35), (y_b - 0.6, LID_Z1 + 0.35), (y_f + 1.6, z_f - 0.2)]
    mb.add(prism(tri, -50.0, 50.0, bevel=0.5, mat='PLASTIC_BLACK'), MX)
    return P('RAIL_campod', 5, 11, 'plastic', mb, (0.0, POD_Y + 5.0, oz - 3.0))


def lid_screws():
    parts = []
    for i, (x, y) in enumerate(LID_SCREWS):
        mb = MB('METAL_STEEL').add(csk_screw(4.0, 14.0, 9.4, 24), T(x, y, LID_Z1 - 0.1))
        parts.append(P('RAIL_screw_%d' % i, 5, 10, 'screw', mb, (x, y, LID_Z1 - 0.1), screw=True))
    return parts


def badge():
    w, h, tk = 64.0, 20.0, 1.5
    yc, zc = -170.0, 968.0
    mb = prism(rrect(w, h, 2.5, 4), 0.0, tk, bevel=0.3, mat='METAL_STEEL', top_mat='BADGE')
    mb.xf(FRAME((70.35, yc, zc), (0, 1, 0), (0, 0, 1), (1, 0, 0)))
    part = P('RAIL_badge', 5, 12, 'metal_small', mb, (70.35 + tk / 2, yc, zc), insert=(1, 0, 0))
    part['uv'] = {'BADGE': ((0, yc - w / 2, zc - h / 2), (0, w, 0), (0, 0, h))}
    return part


def build():
    from parts_glass import lid
    return ([accent('LED_accent_entry', -1), accent('LED_accent_exit', +1), colring(), spine(), led_strip(),
             rfid(), qr(), lcd(), speaker(), lid()] + lid_screws() + [campod(), badge()])
