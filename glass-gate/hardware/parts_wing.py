"""Wave 6 - wing: clamps, edge LED bar, leaf + display layer, sleeve hubs (pedestal-local mm).
Everything here is a child of the WING pivot (an Empty on the column axis)."""
from gg_mesh import *
from parts_drive import P
from parts_glass import leaf, sleeve, LEAF_X0
from parts_rail import led_chip

CLAMP_Z = (520.0, 840.0)
CLAMP_H = 60.0


def clamp(name, zc):
    mb = MB('METAL_STEEL')
    z0, z1 = zc - CLAMP_H / 2, zc + CLAMP_H / 2
    a = rad(38.0)
    sad = arc(0, 0, 66.5, -a, a, 18) + arc(0, 0, 60.4, a, -a, 18)
    mb.add(prism(sad, z0, z1, bevel=1.2, segs=3, mat='METAL_STEEL'))
    sw = 8.2      # half width of the jaw slot (leaf is +-6, rubber liners fill most of the rest)
    jaw = [(63.0, -13.5), (100.0, -13.5)] + arc(100.0, -9.5, 4.0, -PI / 2, 0.0, 6)[1:] + \
          [(104.0, -sw), (68.9, -sw), (68.9, sw), (104.0, sw)] + \
          arc(100.0, 9.5, 4.0, 0.0, PI / 2, 6) + [(63.0, 13.5)]
    mb.add(prism(jaw, z0 + 2.0, z1 - 2.0, bevel=1.2, segs=3, mat='METAL_STEEL'))
    for sgn in (-1, 1):
        y0_, y1_ = (6.85, sw + 0.05) if sgn > 0 else (-sw - 0.05, -6.85)
        mb.add(cbox(71.0, 104.6, y0_, y1_, z0 + 1.2, z1 - 1.2, bevel=0.3, mat='RUBBER'))
        # machined relief line on each jaw face
        mb.add(cbox(66.0, 66.8, sgn * 13.2 - 0.5, sgn * 13.2 + 0.5, z0 + 6.0, z1 - 6.0, mat='METAL_DARK'))
    # clamping screws through the jaw (heads on the entry side, nuts on the other)
    for dz in (-17.0, 17.0):
        mb.add(cap_screw(4.0, 0, n=16), FRAME((87.0, -13.45, zc + dz), (1, 0, 0), (0, 0, 1), (0, -1, 0)))
        mb.add(lathe([(0, 0), (3.4, 0), (3.4, 1.2), (2.6, 2.2), (0, 2.2)], 16, 'METAL_STEEL'),
               FRAME((87.0, 13.45, zc + dz), (-1, 0, 0), (0, 0, 1), (0, 1, 0)))
    # saddle screws
    for ang in (-27.0, 27.0):
        er = Vector((cos(rad(ang)), sin(rad(ang)), 0))
        tg = Vector((-sin(rad(ang)), cos(rad(ang)), 0))
        for dz in (-19.0, 19.0):
            mb.add(cap_screw(3.0, 0, n=14), FRAME(er * 66.45 + Vector((0, 0, zc + dz)), tg, Vector((0, 0, 1)), er))
    # thin rubber liners inside the jaw (stay 0.3 mm off the glass)
    return P(name, 6, 0, 'metal_small', mb, (80.0, 0.0, zc), insert=(1, 0, 0), parent='WING')


def edge_led():
    mb = MB('METAL_ALU')
    z0, z1 = CLAMP_Z[0] + CLAMP_H / 2 + 1.0, CLAMP_Z[1] - CLAMP_H / 2 - 1.0
    mb.add(cbox(62.6, 66.4, -3.2, 3.2, z0, z1, bevel=0.4, r=0.6, mat='METAL_ALU'))
    mb.add(cbox(66.38, 66.65, -2.8, 2.8, z0 + 3.0, z1 - 3.0, mat='PLASTIC_WHITE'))
    chip = led_chip()
    n = int((z1 - z0 - 12.0) / 5.6)
    for k in range(n + 1):
        z = z0 + 6.0 + (z1 - z0 - 12.0) * k / n
        mb.add(chip, FRAME((66.65, 0.0, z), (0, 0, 1), (0, -1, 0), (1, 0, 0)))
    wf = lambda v: 0.92 + 0.08 * np.clip((v[:, 2] - z0) / (z1 - z0), 0.0, 1.0)
    part = P('WING_edgeled', 6, 1, 'led', mb, (64.5, 0.0, (z0 + z1) / 2), insert=(1, 0, 0), parent='WING')
    part['wave_fn'] = wf
    # frosted light guide: a U channel over the chips, facing the leaf's hinge edge (0.95 mm from it)
    u = [(66.95, -5.0), (69.05, -5.0), (69.05, 5.0), (66.95, 5.0), (66.95, 3.4), (68.0, 3.4), (68.0, -3.4), (66.95, -3.4)]
    d = prism(u, z0 + 3.0, z1 - 3.0, bevel=0.3, mat='LED_DIFFUSER')
    dp = P('WING_edgeled_diffuser', 6, 1, 'led', d, (68.0, 0.0, (z0 + z1) / 2), insert=(1, 0, 0), parent='WING_edgeled', is_child=True)
    dp['wave_fn'] = wf
    return [part, dp]


def display():
    w, h = 200.0, 360.0
    x0, zb = 120.0, 500.0
    mb = prism(rrect(w, h, 4.0, 4), -6.75, -6.4, mat='SCREEN_WING')
    mb.xf(FRAME((x0 + w / 2, 0.0, zb + h / 2), (1, 0, 0), (0, 0, 1), (0, -1, 0)))
    part = P('WING_display', 6, 2, 'wing', mb, (x0 + w / 2, 6.575, zb + h / 2), insert=(1, 0, 0), parent='WING_leaf', is_child=True)
    part['uv'] = {'SCREEN_WING': ((x0, 0, zb), (w, 0, 0), (0, 0, h))}
    return part


def hubs():
    mb = MB('METAL_ALU')
    for (z0, z1) in ((406.0, 416.0), (900.0, 910.0)):
        holes = [circle(9.15, 32)] + [circle(10.5, 24, 31.0 * cos(TAU * k / 6), 31.0 * sin(TAU * k / 6)) for k in range(6)]
        mb.add(prism(circle(51.4, 96), z0, z1, bevel=0.8, segs=2, holes=holes, hole_bevel=0.4, mat='METAL_ALU'))
        mb.add(ring(9.15, 15.5, z0 - 2.0, z1 + 4.0, 40, ch=0.6, mat='METAL_ALU'))
        M = FRAME(Vector((0, -15.5, z1 + 1.6)), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)))
        mb.add(socket_head(1.7, 1.0, 1.7, 0.8, 12, mat='METAL_DARK', z0=-0.3), M)
    return P('WING_hub', 2, 11, 'metal_small', mb, (0, 0, 658), parent='WING')


def build_wave2():
    return [hubs(), sleeve()]


def build():
    return [clamp('WING_clamp_a', CLAMP_Z[0]), clamp('WING_clamp_b', CLAMP_Z[1])] + edge_led() + [leaf(), display()]
