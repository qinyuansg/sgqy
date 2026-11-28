"""Props: the clear access card for the "in use" shot (L-pedestal-local mm, like every other part)."""
from gg_mesh import *
from parts_drive import P
from parts_glass import LID_Z1
from parts_rail import RFID_C

CARD_W, CARD_L, CARD_T = 54.0, 85.6, 1.2          # ID-1 card; long side along Y
CARD_GAP = 1.5                                   # rest height above the lid top


def card():
    cx, cy = RFID_C
    cz = LID_Z1 + CARD_GAP + CARD_T / 2
    M = T(cx, cy, cz)
    body = prism(rrect(CARD_W, CARD_L, 3.2, 8), -CARD_T / 2, CARD_T / 2, bevel=0.2, segs=2, mat='GLASS_WING')
    body.xf(M)
    root = P('PROP_card', 0, 0, 'glass', body, (cx, cy, cz))
    # ---- inlay, fully embedded (>= 0.3 mm of glass all round)
    inl = MB('COPPER')
    hx0, hy0, pitch, rc, turns, seg = 24.0, 39.8, 0.9, 2.6, 4, 5
    cs = ((1, -1, 1.5 * PI), (1, 1, 0.0), (-1, 1, PI / 2), (-1, -1, PI))
    tot = turns * 4 * (seg + 1)
    path = []
    idx = 0
    for k in range(turns):
        for (sx, sy, a0) in cs:
            for j in range(seg + 1):
                s = pitch * turns * idx / tot
                a = a0 + (PI / 2) * j / seg
                path.append((sx * (hx0 - s - rc) + rc * cos(a), sy * (hy0 - s - rc) + rc * sin(a), 0.0))
                idx += 1
    inl.add(ribbon(path, (0, 0, 1), 0.08, 0.45, 'COPPER'))
    mx, my = 3.0, -27.0                                   # chip module
    # leads: outer end bridges over the turns, inner end runs straight to the module
    p0, pn = path[0], path[-1]
    inl.add(ribbon([(p0[0], p0[1] - 0.2, 0.1), (p0[0], -31.0, 0.1), (mx + 5.0, -31.0, 0.1)], (0, 0, 1), 0.07, 0.45, 'COPPER'))
    inl.add(ribbon([(pn[0], pn[1], 0.0), (pn[0] + 6.0, -23.5, 0.0), (mx - 5.0, -23.5, 0.0)], (0, 0, 1), 0.08, 0.45, 'COPPER'))
    inl.add(prism(rrect(11.8, 13.0, 1.6, 4, mx, my), -0.25, 0.2, bevel=0.08, mat='CHIP_BLACK'))
    for ix in (-1, 1):
        for iy in (-1, 0, 1):
            inl.add(prism(rrect(3.9, 3.3, 0.6, 3, mx + ix * 3.2, my + iy * 3.9), 0.19, 0.28, bevel=0.03, mat='PCB_GOLD'))
    inl.add(prism(rrect(1.7, 10.9, 0.5, 2, mx, my), 0.19, 0.28, bevel=0.03, mat='PCB_GOLD'))
    # printed mark: an open ring with a dot, and a short bar
    zc0, zc1 = 0.2, 0.24
    inl.add(prism(circle(7.2, 56, 0.0, 22.0), zc0, zc1, holes=[circle(4.9, 48, 0.0, 22.0)], mat='PRINT_WHITE'))
    inl.add(cyl(1.5, zc0, zc1, 20, mat='PRINT_WHITE'), T(0.0, 22.0, 0))
    inl.add(prism(rrect(15.0, 2.4, 1.2, 4, 0.0, 8.5), zc0, zc1, mat='PRINT_WHITE'))
    inl.xf(M)
    child = P('PROP_card_inlay', 0, 0, 'pcb', inl, (cx, cy, cz), parent='PROP_card', is_child=True)
    return [root, child], dict(name='PROP_card', size_mm=(CARD_W, CARD_L, CARD_T), children=['PROP_card_inlay'])
