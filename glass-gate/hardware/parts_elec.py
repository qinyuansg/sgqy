"""Wave 3 - electronics inside the end posts (pedestal-local mm; +x = lane side).
Entry post (-Y): controller PCB.  Exit post (+Y): power supply."""
import random
from gg_mesh import *
from parts_drive import P

# ---- controller PCB ---------------------------------------------------------
PCB_W, PCB_H, PCB_T = 110.0, 280.0, 1.6
PCB_X = -7.4          # front (component) face, facing the lane
PCB_Y0 = -670.0       # a = 0
PCB_Z0 = 150.0        # b = 0
M_BOARD = FRAME((PCB_X, PCB_Y0, PCB_Z0), (0, 1, 0), (0, 0, 1), (1, 0, 0))   # (a, b, h) -> world
MOUNT = [(5.0, 10.0), (105.0, 10.0), (5.0, 270.0), (105.0, 270.0)]
CONN_A = (22.5, 12.0)   # 2-pin power  -> world y = -647.5 / -652.5 ... see cables
CONN_B = (45.0, 12.0)
TERM_TOP = (60.0, 268.0)


def _cb(a0, a1, b0, b1, h0, h1, mat, bevel=0.0, r=0.0):
    return cbox(a0, a1, b0, b1, h0, h1, bevel=bevel, r=r, mat=mat)


def _ic(B, a, b, w, l, h, pins_w=0, pins_l=0, pitch=0.8, mat='CHIP_BLACK'):
    """IC body centred (a,b), w along a, l along b. pins_w: pins on each of the two
    edges parallel to a; pins_l: pins on each of the two edges parallel to b."""
    B.add(prism(rrect(w, l, 0.3, 2, a, b), 0.12, h, bevel=0.22, mat=mat))
    pw = pitch * 0.42
    for k in range(pins_w):
        o = (k - (pins_w - 1) / 2) * pitch
        B.add(_cb(a + o - pw / 2, a + o + pw / 2, b + l / 2 - 0.05, b + l / 2 + 1.0, 0.0, 0.3, 'METAL_STEEL'))
        B.add(_cb(a + o - pw / 2, a + o + pw / 2, b - l / 2 - 1.0, b - l / 2 + 0.05, 0.0, 0.3, 'METAL_STEEL'))
    for k in range(pins_l):
        o = (k - (pins_l - 1) / 2) * pitch
        B.add(_cb(a + w / 2 - 0.05, a + w / 2 + 1.0, b + o - pw / 2, b + o + pw / 2, 0.0, 0.3, 'METAL_STEEL'))
        B.add(_cb(a - w / 2 - 1.0, a - w / 2 + 0.05, b + o - pw / 2, b + o + pw / 2, 0.0, 0.3, 'METAL_STEEL'))
    B.add(cyl(0.35, h - 0.01, h + 0.02, 8, mat='PRINT_WHITE'), T(a - w / 2 + 1.1, b + l / 2 - 1.1, 0))


def _ecap(B, a, b, d, h):
    r = d / 2
    B.add(prism(rrect(d + 0.7, d + 0.7, 0.9, 2, a, b), 0.0, 1.3, bevel=0.2, mat='CHIP_BLACK'))
    prof = [(0, 1.0), (r, 1.0), (r, 2.0), (r - 0.35, 2.3), (r - 0.35, 2.9), (r, 3.2), (r, h - 0.9)]
    for k in range(1, 4):
        ph = (PI / 2) * k / 3
        prof.append((r - 0.9 + 0.9 * cos(ph), h - 0.9 + 0.9 * sin(ph)))
    prof.append((0, h))
    B.add(lathe(prof, 28, 'CAP_ALU'), T(a, b, 0))
    half = [(r * 0.82 * cos(PI * k / 10), r * 0.82 * sin(PI * k / 10)) for k in range(11)]
    B.add(prism(half, h - 0.02, h + 0.03, mat='CHIP_BLACK'), T(a, b, 0))


def _header(B, a, b, n, pitch=2.5, mat='PLASTIC_WHITE', depth=5.8, height=7.0, down=False):
    """Shrouded pin header. down=False: opening faces the lane (+h), centred on (a, b).
    down=True: right-angle, opening faces down (-b); the body then spans b-4 .. b+3, h 0..depth."""
    L = n * pitch + 2.4
    H = MB(mat)
    H.add(prism(rrect(L, depth, 0.5, 2), 0.0, height, bevel=0.4, mat=mat,
                pockets=[(rrect(L - 1.6, depth - 1.6, 0.2, 1), height - 1.6, 0.0)]))
    for k in range(n):
        o = (k - (n - 1) / 2) * pitch
        H.add(_cb(o - 0.32, o + 0.32, -0.32, 0.32, 1.0, height - 0.8, 'PCB_GOLD'))
    if down:
        B.add(H, FRAME((a, b + 3.0, depth / 2), (1, 0, 0), (0, 0, 1), (0, -1, 0)))
    else:
        B.add(H, T(a, b, 0))


def _smd(B, a, b, rot, kind):
    body = 'CHIP_BLACK' if kind == 'r' else 'BRASS'
    m = MB(body)
    m.add(cbox(-0.5, 0.5, -0.42, 0.42, 0.02, 0.5 if kind == 'r' else 0.8, mat=body))
    for sgn in (-1, 1):
        m.add(cbox(sgn * 0.5 if sgn > 0 else -0.85, 0.85 if sgn > 0 else -0.5, -0.44, 0.44, 0.0,
                   0.52 if kind == 'r' else 0.82, mat='METAL_STEEL'))
    B.add(m, T(a, b, 0) @ RZ(rot))


def pcb():
    B = MB('PCB_GREEN')
    # substrate with mounting holes
    B.add(prism(rrect(PCB_W, PCB_H, 3.0, 4, PCB_W / 2, PCB_H / 2), -PCB_T, 0.0, bevel=0.12,
                holes=[circle(1.7, 16, a, b) for a, b in MOUNT], mat='PCB_GREEN'))
    for a, b in MOUNT:
        B.add(ring(1.72, 3.5, -0.02, 0.05, 20, mat='PCB_GOLD'), T(a, b, 0))
        B.add(ring(1.72, 3.5, -PCB_T - 0.05, -PCB_T + 0.02, 20, mat='PCB_GOLD'), T(a, b, 0))
    keep = []

    def ko(a0, a1, b0, b1, m=1.5):
        keep.append((a0 - m, a1 + m, b0 - m, b1 + m))

    # --- main processor + heat sink
    ca, cb_ = 55.0, 185.0
    B.add(prism(rrect(35, 35, 1.0, 2, ca, cb_), 0.0, 0.9, bevel=0.1, mat='PCB_GREEN'))
    B.add(prism(rrect(27, 27, 0.8, 2, ca, cb_), 0.85, 2.6, bevel=0.3, mat='CHIP_BLACK'))
    B.add(prism(rrect(32, 32, 1.0, 2, ca, cb_), 2.7, 5.2, bevel=0.35, mat='METAL_ALU'))
    for k in range(11):
        o = -15.0 + 3.0 * k
        B.add(prism(rrect(1.3, 32, 0.3, 2, ca + o, cb_), 5.0, 16.2, bevel=0.3, mat='METAL_ALU'))
    for sa, sb in ((-1, -1), (1, 1)):
        B.add(cap_screw(2.0, 0, n=10), T(ca + sa * 20.5, cb_ + sb * 20.5, 0.9))
        B.add(prism(rrect(8, 3, 1.4, 3), 0.0, 0.9, bevel=0.2, mat='METAL_STEEL'), T(ca + sa * 19, cb_ + sb * 19, 0) @ RZ(45))
    ko(ca - 24, ca + 24, cb_ - 24, cb_ + 24)
    # --- ICs
    _ic(B, 26.0, 118.0, 14, 14, 1.7, 16, 16, 0.8)
    ko(18, 34, 110, 126)
    for (a, b) in ((82.0, 128.0), (82.0, 108.0), (24.0, 92.0), (60.0, 100.0)):
        _ic(B, a, b, 10.0, 6.2, 1.8, 8, 0, 1.27)
        ko(a - 5, a + 5, b - 4.2, b + 4.2)
    _ic(B, 84.0, 150.0, 7, 7, 1.2, 8, 8, 0.65)
    ko(80, 88, 146, 154)
    # --- electrolytic capacitors
    for (a, b, d, h) in ((20, 244, 10, 16.5), (33, 244, 10, 16.5), (45.5, 244, 8, 12.5), (18, 226, 6.3, 11), (92, 242, 12.5, 20.5),
                         (92, 222, 8, 12.5)):
        _ecap(B, a, b, d, h)
        ko(a - d / 2, a + d / 2, b - d / 2, b + d / 2)
    # --- connectors along the bottom edge
    _header(B, CONN_A[0], CONN_A[1], 2, 5.0, depth=7.0, down=True)      # body b 8..15 (z 158..165), plugs enter from below
    _header(B, CONN_B[0], CONN_B[1], 4, depth=7.0, down=True)
    _header(B, 72.0, 12.0, 8)
    ko(10, 90, 6, 18, 2)
    # 2x10 pin header on the right edge
    B.add(prism(rrect(5.1, 25.6, 0.3, 2, 100.0, 180.0), 0.0, 2.5, bevel=0.3, mat='CHIP_BLACK'))
    for k in range(10):
        for c in (-1.27, 1.27):
            B.add(prism(rrect(0.64, 0.64, 0.0, 1, 100.0 + c, 180.0 + (k - 4.5) * 2.54), 2.0, 8.4, bevel=0.15, mat='PCB_GOLD'))
    ko(96, 104, 166, 194)
    # --- screw terminal block (top edge) for the rail harness
    ta, tb = TERM_TOP
    B.add(prism(rrect(46, 11, 0.6, 2, ta, tb), 0.0, 13.0, bevel=0.5, mat='PLASTIC_BLACK',
                pockets=[(circle(2.4, 14, ta + (k - 2.5) * 7.5, tb), 3.0, 0.3) for k in range(6)]))
    for k in range(6):
        B.add(socket_head(2.0, 1.4, 2.0, 0.9, 12, mat='METAL_STEEL', z0=9.7), T(ta + (k - 2.5) * 7.5, tb, 0))
    ko(ta - 23, ta + 23, tb - 6, tb + 8)
    # --- relays
    for a in (22.0, 45.0, 68.0):
        B.add(prism(rrect(19, 15.5, 1.0, 3, a, 60.0), 0.0, 15.2, bevel=0.6, segs=2, mat='CHIP_BLACK'))
        B.add(prism(rrect(13, 7, 0.5, 2, a, 61.0), 15.18, 15.24, mat='PRINT_WHITE'))
        B.add(prism(rrect(21.4, 17.9, 0.3, 2, a, 60.0), -0.01, 0.04, holes=[rrect(20.6, 17.1, 0.2, 2, a, 60.0)], mat='PRINT_WHITE'))
        ko(a - 10, a + 10, 51.5, 68.5)
    # --- status LEDs
    for k in range(5):
        B.add(_cb(95.6, 97.2, 30.0 + 4.0 * k - 0.4, 30.0 + 4.0 * k + 0.4, 0.0, 0.62, 'LED_STATUS', bevel=0.1))
        B.add(_cb(95.1, 95.65, 30.0 + 4.0 * k - 0.45, 30.0 + 4.0 * k + 0.45, 0.0, 0.3, 'PCB_GOLD'))
        B.add(_cb(97.15, 97.7, 30.0 + 4.0 * k - 0.45, 30.0 + 4.0 * k + 0.45, 0.0, 0.3, 'PCB_GOLD'))
    ko(93, 100, 27, 49)
    # --- crystal, inductor, coin cell, tact switch
    B.add(prism(rrect(11.0, 4.6, 2.3, 5, 30.0, 150.0), 0.1, 3.6, bevel=0.6, segs=2, mat='METAL_STEEL'))
    ko(24, 36, 147, 153)
    B.add(prism(rrect(10, 10, 2.2, 4, 84.0, 213.0), 0.0, 5.0, bevel=0.9, segs=2, mat='CHIP_BLACK'))
    B.add(ring(1.6, 3.6, 4.98, 5.06, 20, mat='COPPER'), T(84.0, 213.0, 0))
    ko(78, 90, 207, 219)
    B.add(ring(10.2, 11.6, 0.0, 4.2, 40, ch=0.4, mat='PLASTIC_BLACK'), T(88.0, 72.0, 0))
    B.add(cyl(10.0, 1.2, 4.4, 40, ch=0.45, segs=2, mat='METAL_STEEL'), T(88.0, 72.0, 0))
    B.add(prism(rrect(4.5, 23.5, 1.5, 3, 88.0, 72.0), 4.3, 4.8, bevel=0.15, mat='PCB_GOLD'))
    ko(76, 100, 60, 84)
    B.add(prism(rrect(6, 6, 0.5, 2, 10.0, 36.0), 0.0, 3.4, bevel=0.3, mat='METAL_STEEL'))
    B.add(cyl(1.7, 3.3, 4.6, 14, ch=0.3, mat='CHIP_BLACK'), T(10.0, 36.0, 0))
    ko(6, 14, 32, 40)
    # --- wireless module: daughter board, shield can, meander antenna
    wa, wb = 63.0, 237.0
    B.add(prism(rrect(26, 20, 0.8, 2, wa, wb), 0.0, 0.8, bevel=0.1, mat='PCB_GREEN'))
    B.add(prism(rrect(16.5, 16.0, 1.2, 3, wa - 4.0, wb), 0.75, 3.4, bevel=0.5, segs=2, mat='METAL_STEEL'))
    for k in range(4):
        B.add(cyl(0.45, 3.38, 3.42, 8, mat='METAL_DARK'), T(wa - 9.5 + 3.7 * k, wb + 5.5, 0))
    mz = []
    for k in range(9):
        bb_ = wb - 8.0 + 2.0 * k
        mz += [(wa + 7.0, bb_, 0.82), (wa + 11.5, bb_, 0.82)] if k % 2 == 0 else [(wa + 11.5, bb_, 0.82), (wa + 7.0, bb_, 0.82)]
    B.add(ribbon(mz, (0, 0, 1), 0.06, 0.55, 'PCB_GOLD'))
    for k in range(7):
        B.add(_cb(wa - 12.2 + 0.0, wa - 11.2, wb - 7.5 + 2.5 * k - 0.5, wb - 7.5 + 2.5 * k + 0.5, 0.0, 0.25, 'PCB_GOLD'))
    ko(wa - 13, wa + 13, wb - 10, wb + 10)
    # --- second processor with a metal lid
    B.add(prism(rrect(15, 15, 0.6, 2, 54.0, 132.0), 0.0, 1.0, bevel=0.15, mat='PCB_GREEN'))
    B.add(prism(rrect(10.5, 10.5, 1.0, 3, 54.0, 132.0), 0.95, 2.1, bevel=0.3, segs=2, mat='METAL_STEEL'))
    for k in range(4):
        B.add(_cb(46.6 + 0.0, 47.4, 126.5 + 3.5 * k, 127.5 + 3.5 * k, 0.95, 1.5, 'BRASS'))
        B.add(_cb(60.6, 61.4, 126.5 + 3.5 * k, 127.5 + 3.5 * k, 0.95, 1.5, 'BRASS'))
    B.add(prism(rrect(17.4, 17.4, 0.3, 2, 54.0, 132.0), -0.01, 0.04, holes=[rrect(16.6, 16.6, 0.2, 2, 54.0, 132.0)], mat='PRINT_WHITE'))
    ko(45, 63, 123, 141)
    # --- power stage: two DPAK regulators + shielded inductor
    for bb_ in (172.0, 188.0):
        B.add(prism(rrect(6.6, 9.6, 0.4, 2, 14.0, bb_ + 0.8), 0.0, 0.5, mat='METAL_STEEL'))
        B.add(prism(rrect(6.6, 6.1, 0.4, 2, 14.0, bb_), 0.1, 2.35, bevel=0.3, mat='CHIP_BLACK'))
        for da in (-2.28, 2.28):
            B.add(_cb(14.0 + da - 0.4, 14.0 + da + 0.4, bb_ - 6.0, bb_ - 3.0, 0.0, 0.5, 'METAL_STEEL'))
    B.add(prism(rrect(10, 10, 2.2, 4, 15.0, 205.5), 0.0, 4.4, bevel=0.9, segs=2, mat='CHIP_BLACK'))
    B.add(ring(1.6, 3.6, 4.38, 4.46, 20, mat='COPPER'), T(15.0, 205.5, 0))
    ko(8, 22, 164, 212)
    # --- data-matrix sticker
    B.add(prism(rrect(13, 13, 0.6, 2, 100.0, 105.0), -0.01, 0.06, mat='PRINT_WHITE'))
    rq = random.Random(11)
    for i in range(10):
        for j in range(10):
            if i == 0 or j == 0 or rq.random() < 0.45:
                B.add(_cb(94.5 + 1.1 * i, 95.6 + 1.1 * i, 99.5 + 1.1 * j, 100.6 + 1.1 * j, 0.05, 0.085, 'CHIP_BLACK'))
    ko(92, 108, 97, 113)
    # --- silkscreen frame round the board + pin-1 triangles
    B.add(prism(rrect(104, 274, 2.0, 3, 55, 140), -0.01, 0.035, holes=[rrect(103.2, 273.2, 1.8, 3, 55, 140)], mat='PRINT_WHITE'))
    B.add(prism(rrect(15.8, 15.8, 0.3, 2, 26.0, 118.0), -0.01, 0.035, holes=[rrect(15.0, 15.0, 0.2, 2, 26.0, 118.0)], mat='PRINT_WHITE'))
    # --- test pads + fiducials
    for k in range(8):
        B.add(cyl(0.9, -0.02, 0.06, 12, mat='PCB_GOLD'), T(40.0 + 3.2 * k, 32.0, 0))
    ko(38, 66, 30, 34)
    for (a, b) in ((10, 20), (100, 20), (10, 258)):
        B.add(cyl(0.6, -0.02, 0.05, 10, mat='PCB_GOLD'), T(a, b, 0))
    # --- scattered SMD passives (seeded, avoiding keep-outs)
    for a, b in MOUNT:
        ko(a - 4, a + 4, b - 4, b + 4)
    rng = random.Random(7)
    b = 24.0
    while b < 262.0:
        a = 8.0
        while a < 104.0:
            if rng.random() < 0.42 and not any(k[0] < a < k[1] and k[2] < b < k[3] for k in keep):
                _smd(B, a + rng.uniform(-0.6, 0.6), b + rng.uniform(-0.6, 0.6), rng.choice((0, 0, 90)), rng.choice('rrc'))
            a += 3.4
        b += 3.1
    # --- vias (tiny gold dots, both sides)
    rv = random.Random(23)
    nv = 0
    while nv < 170:
        a, b = rv.uniform(5, 105), rv.uniform(22, 260)
        if any(k[0] < a < k[1] and k[2] < b < k[3] for k in keep):
            continue
        B.add(cyl(0.32, -0.015, 0.04, 6, mat='PCB_GOLD'), T(a, b, 0))
        B.add(cyl(0.32, -PCB_T - 0.04, -PCB_T + 0.015, 6, mat='PCB_GOLD'), T(a, b, 0))
        nv += 1
    # --- back side: solder joints of the through-hole parts, a label
    joints = []
    for a in (22.0, 45.0, 68.0):
        joints += [(a - 7.5, 54), (a - 7.5, 66), (a + 7.5, 54), (a + 7.5, 66), (a, 66)]
    joints += [(TERM_TOP[0] + (k - 2.5) * 7.5, TERM_TOP[1] - 2) for k in range(6)]
    joints += [(100.0 + c, 180.0 + (k - 4.5) * 2.54) for k in range(10) for c in (-1.27, 1.27)]
    joints += [(72.0 + (k - 3.5) * 2.5, 12.0) for k in range(8)] + [(45.0 + (k - 1.5) * 2.5, 12.0) for k in range(4)]
    joints += [(20.0, 12.0), (25.0, 12.0), (79.5, 72.0), (96.5, 72.0)]
    for a, b in joints:
        B.add(lathe([(0, -PCB_T + 0.02), (0.85, -PCB_T + 0.02), (0.75, -PCB_T - 0.25), (0.3, -PCB_T - 0.8), (0, -PCB_T - 0.95)], 8,
                    'METAL_STEEL'), T(a, b, 0))
    B.add(prism(rrect(34, 14, 1.0, 2, 55.0, 30.0), -PCB_T - 0.06, -PCB_T + 0.01, mat='PRINT_WHITE'))
    for k in range(16):
        w = (0.5, 1.0, 0.5, 1.4)[k % 4]
        B.add(cbox(41.0 + 1.75 * k, 41.0 + 1.75 * k + w, 26.0, 34.0, -PCB_T - 0.09, -PCB_T - 0.03, mat='CHIP_BLACK'))

    mb = MB('PCB_GREEN').add(B, M_BOARD)
    # --- frame: two rails on foot plates, brass standoffs, screws
    for yr, yf0, yf1 in ((-565.0, -586.0, -561.0), (-665.0, -669.0, -644.0)):
        mb.add(cbox(-24, -16, yr - 4, yr + 4, 30.5, 440.0, bevel=0.6, r=1.0, mat='METAL_ALU'))
        mb.add(cbox(-30, -10, yf0, yf1, 30.5, 34.5, bevel=0.5, r=1.5, mat='METAL_ALU'))
        mb.add(cap_screw(3.0, 0, n=12), T(-27.0 if yr > -600 else -13.0, (yf0 + yf1) / 2 - (8 if yr > -600 else -8), 34.45))
    for zz in (60.0, 436.0):
        mb.add(cbox(-22.5, -17.5, -661.5, -568.5, zz - 3, zz + 3, bevel=0.5, mat='METAL_ALU'))
    Mx = FRAME((0, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0))
    for a, b in MOUNT:
        y, z = PCB_Y0 + a, PCB_Z0 + b
        so = hex_standoff(5.0, -16.0, PCB_X - PCB_T - 0.05, 'BRASS', ch=0.3)
        mb.add(so, T(0, y, z) @ Mx)
        mb.add(cap_screw(2.5, 0, n=12), T(PCB_X + 0.05, y, z) @ Mx)
    part = P('ELE_pcb', 3, 0, 'pcb', mb, (PCB_X, PCB_Y0 + PCB_W / 2, PCB_Z0 + PCB_H / 2))
    part['uv'] = {'PCB_GREEN': ((PCB_X, PCB_Y0, PCB_Z0), (0, PCB_W, 0), (0, 0, PCB_H))}
    return part


# ---- power supply -----------------------------------------------------------
PSU_X0, PSU_X1 = -26.0, 18.0
PSU_Y0, PSU_Y1 = 562.0, 662.0
PSU_Z0, PSU_Z1 = 46.0, 256.0
M_PSU = FRAME((PSU_X1, PSU_Y0, PSU_Z0), (0, 1, 0), (0, 0, 1), (1, 0, 0))    # (a along y, b along z, h along +x)
TERM_B = 15.0
TERM_A = [8.0 + 6.3 + 12.6 * k for k in range(7)]


def psu():
    F = MB('METAL_ALU')
    D = PSU_X1 - PSU_X0
    A, Bh = PSU_Y1 - PSU_Y0, PSU_Z1 - PSU_Z0
    win = rrect(84, 146, 3.0, 3, 50, 131)
    F.add(prism(rrect(A, Bh, 2.5, 3, A / 2, Bh / 2), -D, 0.0, bevel=0.8, mat='METAL_ALU', pockets=[(win, 13.0, 0.0, 'METAL_DARK')]))
    # things inside the window: transformer, toroid, capacitors, small heat sink
    F.add(prism(rrect(36, 30, 1.0, 2, 52, 158), -13.0, -3.2, bevel=0.5, mat='METAL_DARK'))
    F.add(prism(rrect(24, 34, 3.0, 4, 52, 158), -13.0, -2.2, bevel=0.8, segs=2, mat='COPPER'))
    F.add(prism(rrect(25, 12, 1.0, 2, 52, 158), -13.0, -2.0, bevel=0.3, mat='CABLE_YELLOW'))
    F.add(torus(9.0, 3.6, 40, 12, 'COPPER', zc=-9.0), T(30.0, 96.0, 0))
    F.add(cyl(5.0, -13.0, -8.0, 20, mat='METAL_DARK'), T(30.0, 96.0, 0))
    for (a, b, r, h) in ((22, 188, 6.5, 10.5), (38, 188, 6.5, 10.5), (72, 110, 8.0, 10.8), (72, 88, 5.0, 9.5)):
        F.add(lathe([(0, -13.0), (r, -13.0), (r, -13.0 + h - 0.8), (r - 0.8, -13.0 + h), (0, -13.0 + h)], 24, 'CAP_ALU'), T(a, b, 0))
    for k in range(7):
        F.add(cbox(60.0 + 3.4 * k, 61.2 + 3.4 * k, 172.0, 198.0, -13.0, -2.6, bevel=0.2, mat='METAL_ALU'))
    F.add(prism(rrect(30, 22, 1.0, 2, 28, 132), -13.0, -11.4, mat='PCB_GREEN'))
    F.add(prism(rrect(10, 6.2, 0.3, 2, 28, 132), -11.4, -9.6, bevel=0.2, mat='CHIP_BLACK'))
    # perforated cover over the lane face
    holes = []
    row = 0
    b = 62.0
    while b < 201.0:
        a = 12.0 + (2.6 if row % 2 else 0.0)
        while a < 89.0:
            holes.append(circle(1.75, 6, a, b, a0=PI / 6))
            a += 5.2
        b += 4.5
        row += 1
    F.add(prism(rrect(A - 4, 160, 2.0, 3, A / 2, 128), 0.3, 1.3, bevel=0.15, holes=holes, mat='METAL_STEEL'))
    for (a, b) in ((5.5, 52.5), (94.5, 52.5), (5.5, 203.5), (94.5, 203.5)):
        F.add(cap_screw(2.5, 0, n=12), T(a, b, 1.25))
    # terminal block with barriers and 7 screws
    F.add(prism(rrect(90, 22, 1.0, 2, 50, TERM_B), -0.5, 9.0, bevel=0.5, mat='PLASTIC_BLACK'))
    for k in range(8):
        a = 8.0 + 12.6 * k * (84.0 / 88.2)
        F.add(cbox(a - 0.7, a + 0.7, TERM_B - 11, TERM_B + 11, 8.5, 15.0, bevel=0.3, mat='PLASTIC_BLACK'))
    for k in range(7):
        a = 8.0 + 12.0 * k + 6.0
        F.add(prism(rrect(8.0, 8.0, 0.6, 2, a, TERM_B + 1.5), 8.9, 10.2, bevel=0.2, mat='METAL_STEEL'))
        F.add(socket_head(3.0, 2.0, 3.2, 1.2, 14, mat='METAL_STEEL', z0=10.1), T(a, TERM_B + 1.5, 0))
        F.add(prism(rrect(5.0, 4.0, 0.3, 2, a, TERM_B - 8.0), 8.9, 9.02, mat='PRINT_WHITE'))
    # status LED + trim pot
    F.add(dome(1.5, 1.2, 12, 4, 'LED_STATUS', z0=0.0), T(88.0, 40.0, 0))
    F.add(cyl(3.2, 0.0, 2.2, 16, ch=0.3, mat='PLASTIC_WHITE'), T(78.0, 40.0, 0))
    F.add(cbox(75.4, 80.6, 39.6, 40.4, 2.15, 2.5, mat='METAL_STEEL'))
    # heat-sink fins on the outer face (-x)
    for k in range(13):
        a = 14.0 + 6.0 * k
        F.add(cbox(a - 0.9, a + 0.9, 34.0, 184.0, -D - 13.0, -D + 0.4, bevel=0.35, mat='METAL_ALU'))
    mb = MB('METAL_ALU').add(F, M_PSU)
    # label on the face that looks at the column
    Ml = FRAME((0, PSU_Y0, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0))
    mb.add(prism(rrect(30, 74, 2.0, 3, -4.0, 150.0), -0.03, 0.07, mat='PRINT_WHITE'), Ml)
    for k in range(22):
        w = (0.6, 1.2, 0.6, 1.8, 0.9)[k % 5]
        mb.add(cbox(-15.0, -5.0, 120.0 + 2.0 * k, 120.0 + 2.0 * k + w, 0.05, 0.1, mat='CHIP_BLACK'), Ml)
    for k in range(5):
        mb.add(cbox(-2.0, 8.0, 172.0 - 7.0 * k, 174.5 - 7.0 * k, 0.05, 0.1, mat='CHIP_BLACK'), Ml)
    # four feet
    for (x, y) in ((-18.0, 572.0), (10.0, 572.0), (-18.0, 652.0), (10.0, 652.0)):
        mb.add(cyl(4.0, 30.5, PSU_Z0 + 0.3, 16, ch=0.4, mat='METAL_ALU'), T(x, y, 0))
        mb.add(ring(4.0, 6.5, 30.5, 32.5, 16, ch=0.3, mat='METAL_ALU'), T(x, y, 0))
    return P('ELE_psu', 3, 0, 'metal_heavy', mb, ((PSU_X0 + PSU_X1) / 2, (PSU_Y0 + PSU_Y1) / 2, (PSU_Z0 + PSU_Z1) / 2))


# ---- IR sensor strips ---------------------------------------------------------
def sensor(name, ysign):
    y0 = 608.0 * ysign
    mb = MB('METAL_ALU')
    mb.add(cbox(48.0, 54.0, y0 - 7, y0 + 7, 30.5, 880.0, bevel=0.6, r=1.0, mat='METAL_ALU'))
    mb.add(cbox(38.0, 58.0, y0 - 12, y0 + 12, 30.5, 33.5, bevel=0.5, r=1.5, mat='METAL_ALU'))
    mb.add(cap_screw(3.0, 0, n=12), T(42.5, y0, 33.45))
    mb.add(cbox(54.3, 55.5, y0 - 6, y0 + 6, 50.0, 870.0, mat='PCB_GREEN'))
    Mx = FRAME((0, 0, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0))     # local z -> +x
    for k in range(24):
        z = 82.0 + 33.0 * k
        M = T(55.5, y0, z) @ Mx
        mb.add(prism(rrect(5.0, 5.0, 0.5, 2), 0.0, 1.5, bevel=0.25, mat='CHIP_BLACK'), M)
        mb.add(dome(2.2, 0.9, 16, 5, 'GLASS_LENS', z0=1.25), M)
        mb.add(cyl(1.0, 1.3, 1.6, 10, mat='PCB_GOLD'), M)
        mb.add(cbox(-0.8, 0.8, 5.2, 6.0, 0.0, 0.5, mat='CHIP_BLACK'), M)
        mb.add(cbox(-4.5, -3.3, -0.4, 0.4, 0.0, 0.5, mat='BRASS'), M)
    for z in (60.0, 860.0):
        mb.add(cap_screw(2.5, 0, n=12), T(55.45, y0, z) @ Mx)
    mb.add(prism(rrect(9.0, 5.0, 0.4, 2, 0, 0), 0.0, 4.5, bevel=0.35, mat='PLASTIC_WHITE'), T(55.5, y0, 69.0) @ Mx)
    return P(name, 3, 1, 'pcb', mb, (52.0, y0, 455.0))


# ---- wiring harness -----------------------------------------------------------
CH_ZC = 20.6       # cable centre height in the base channel
CH_XS = (-12.5, -19.0, -25.5)
RISE_X = PCB_X + 3.5          # cable risers come straight up under the bottom-entry headers
PLUG_Z0, PLUG_Z1 = PCB_Z0 + 1.0, PCB_Z0 + 8.5    # plug bodies end 0.3 mm short of the header pins


def _cable(pts, r, mat, fr=7.0):
    return tube(resample(fillet_path(pts, fr, 7), 8.0), r, 12, mat, grow=True)


def cables():
    parts = []
    r = 2.1
    xt = PSU_X1 + 7.0              # under the PSU terminal block
    zt = PSU_Z0 + TERM_B - 11.0 - 0.3      # cable tips stop 0.3 mm under the terminal block
    # two power cables PSU -> PCB (red inner lane, blue middle lane)
    for i, (xc, zl, y_term, y_conn, mat) in enumerate(((CH_XS[0], 36.0, PSU_Y0 + 8.0 + 12.0 * 2 + 6.0, PCB_Y0 + CONN_A[0] - 2.5, 'CABLE_RED'),
                                                       (CH_XS[1], 42.0, PSU_Y0 + 8.0 + 12.0 * 1 + 6.0, PCB_Y0 + CONN_A[0] + 2.5, 'CABLE_BLUE'))):
        pts = [(xt, y_term, zt - 0.2), (xt, y_term, zl), (xt, 554.0, zl), (xc, 554.0, zl), (xc, 554.0, CH_ZC),
               (xc, -554.0, CH_ZC), (xc, -554.0, zl), (RISE_X, -554.0, zl), (RISE_X, y_conn, zl), (RISE_X, y_conn, PLUG_Z0 + 4.0)]
        mb = _cable(pts, r, mat)
        mb.add(ring(r - 0.3, r + 0.7, zt - 5.0, zt, 14, ch=0.2, mat='METAL_STEEL'), T(xt, y_term, 0), t=0.0)
        mb.add(cbox(PCB_X + 1.0, PCB_X + 6.0, y_conn - 2.3, y_conn + 2.3, PLUG_Z0, PLUG_Z1, bevel=0.3, mat='PLASTIC_WHITE'), t=1.0)
        parts.append(P('ELE_cable_%d' % i, 3, 2, 'cable', mb, (xc, 0.0, CH_ZC)))
    # signal cable PCB -> motor connector in the channel
    r2 = 2.0
    y_conn = PCB_Y0 + CONN_B[0]
    pts = [(RISE_X, y_conn, PLUG_Z0 + 4.0), (RISE_X, y_conn, 48.0), (RISE_X, -554.0, 48.0), (CH_XS[2], -554.0, 48.0),
           (CH_XS[2], -554.0, CH_ZC), (CH_XS[2], -103.0, CH_ZC)]
    mb = _cable(pts, r2, 'CABLE_YELLOW')
    mb.add(cbox(PCB_X + 1.0, PCB_X + 6.0, y_conn - 5.2, y_conn + 5.2, PLUG_Z0, PLUG_Z1, bevel=0.3, mat='PLASTIC_WHITE'), t=0.0)
    mb.add(cbox(CH_XS[2] - 3.1, CH_XS[2] + 3.1, -115.0, -103.5, 18.3, 24.6, bevel=0.5, r=0.8, mat='PLASTIC_WHITE'), t=1.0)
    parts.append(P('ELE_cable_2', 3, 2, 'cable', mb, (CH_XS[2], -330.0, CH_ZC)))
    # multi-core up the entry post to the rail, with two cable ties
    yt = PCB_Y0 + TERM_TOP[0]
    zt2 = PCB_Z0 + TERM_TOP[1] + 5.5
    pts = [(-0.9, yt, zt2 - 1.0), (-0.9, yt, zt2 + 30.0), (-40.0, -602.0, zt2 + 90.0), (-40.0, -602.0, 931.0)]
    mb = _cable(pts, 2.8, 'CABLE_WHITE', fr=26.0)
    for zz in (640.0, 820.0):
        tt = (zz - zt2) / (931.0 - zt2)
        mb.add(ring(2.6, 3.5, zz - 1.4, zz + 1.4, 14, ch=0.3, mat='PLASTIC_BLACK'), T(-40.0, -602.0, 0), t=tt)
        mb.add(cbox(-45.6, -43.2, -603.6, -600.4, zz - 1.6, zz + 1.6, bevel=0.3, mat='PLASTIC_BLACK'), t=tt)
    mb.add(ring(2.6, 4.4, 925.0, 931.2, 16, ch=0.5, mat='RUBBER'), T(-40.0, -602.0, 0), t=1.0)
    parts.append(P('ELE_cable_3', 3, 2, 'cable', mb, (-20.0, -606.0, 680.0)))
    return parts


def build():
    return [psu(), pcb(), sensor('ELE_sensor_entry', -1), sensor('ELE_sensor_exit', +1)] + cables()
