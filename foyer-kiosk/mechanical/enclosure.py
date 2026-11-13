"""Foyer VK-1 enclosure and mounting kits — parametric CadQuery model.

Frame: X = width (centred on 0, + to the visitor's right), Y = depth (0 = front
face of the lectern, + toward the back), Z = height (0 = underside of the unit).
Units: mm.

Architecture (see docs/mechanical.md):
  * HEAD (250 x 430 x 80): rear shell + lift-up front door carrying the 4 mm
    edge-to-edge glass and the 13.3" display. Behind the door: carrier board
    on the chassis plate, QR scanner + NFC tap zone in the lower glass band,
    cameras + sensor bar in the top band.
  * LECTERN (250 x 210 x 200): passport reader under a 10 deg glass deck,
    badge printer on a slide-out drawer below, speaker grille in the front
    face. The deck + front face form one drop-down door whose rear edge is
    captured by the head door: ONE keyed lock opens everything.
  * MOUNT: one hang-on mount plate shared by the wall, desk and floor kits.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import cadquery as cq

# ------------------------------------------------------------------ params
W = 250.0            # overall width
T = 3.0              # wall thickness (production: 6063-T5 aluminium, anodised)
R = 10.0             # vertical edge radius
HEAD_H = 430.0
HEAD_D = 86.0
LECT_H = 210.0       # lectern height at the back (= head base)
LECT_D = 200.0       # lectern depth = overall depth
DECK_ANGLE = 10.0    # deck slope toward the visitor (deg)
Z_HEAD = LECT_H      # head sits on the lectern
Y_HEAD_FRONT = LECT_D - HEAD_D   # 120
DECK_FRONT_Z = LECT_H - Y_HEAD_FRONT * math.tan(math.radians(DECK_ANGLE))  # ~188.8
GLASS_T = 4.0
REVEAL = 2.0         # aluminium reveal around the glass

# purchased-part envelopes (from vendor data; see BOM)
DISPLAY = (211.3, 25.05, 326.06)        # Elo 1302L no-stand, portrait (w, d, h)
DISPLAY_ACTIVE = (165.24, 293.76)       # active area portrait (w, h)
READER = (190.0, 143.0, 93.0)           # DESKO PENTA Scanner 4X Cube (w, d, h)
PRINTER = (143.5, 116.0, 76.4)          # Custom VKP80III (w, d, h)
SCANNER = (56.0, 72.0, 30.0)            # Zebra DS5502-SR (w, d, h)
CAMERA = (25.0, 12.4, 24.0)             # Raspberry Pi Camera Module 3 (w, d, h)
SPEAKER = (39.4, 20.0, 34.6)            # PUI ASE04008MS-LWC25-2 (w, d, h) depth approx.
FAN = (40.0, 10.0, 40.0)
NFC = (50.0, 9.0, 35.0)                 # HID OMNIKEY 5127CK Mini board
CARRIER = (180.0, 1.6, 120.0)           # FYR-CB-01
SENSORBAR = (200.0, 1.6, 22.0)          # FYR-SB-01

# placement inside the head (Z in absolute coords)
Z_BAND_BOTTOM = Z_HEAD + 40.0           # lower glass band (scanner/NFC), 40 mm
Z_DISPLAY = Z_BAND_BOTTOM                # display bottom
Z_DISPLAY_TOP = Z_DISPLAY + DISPLAY[2]
Z_CAM = Z_DISPLAY_TOP + 18.0            # camera centre line
Z_SENSORBAR = Z_DISPLAY_TOP + 31.0      # sensor bar bottom edge
Y_DISPLAY = Y_HEAD_FRONT + GLASS_T + 0.5
Y_CARRIER = Y_DISPLAY + DISPLAY[1] + 4.0 + 16.0   # board plane (components face the display)
Z_CARRIER = Z_HEAD + 70.0

# mounting interface (rear of head)
VESA = 100.0
Z_MOUNT = Z_HEAD + 215.0                # VESA centre
FLOOR_TO_UNIT = 671.0                   # floor/wall kit: unit underside height -> deck front 860 mm (ADA counter)


def box(w, d, h, x=0.0, y=0.0, z=0.0):
    """Axis-aligned box: x centred, y/z from the given minimum."""
    return cq.Workplane("XY").box(w, d, h, centered=(True, False, False)).translate((x, y, z))


def rounded_slab(w, d, h, r, x=0.0, y=0.0, z=0.0):
    """Plate with its plan-view corners rounded (for bases lying flat)."""
    return (cq.Workplane("XY").rect(w, d, centered=(True, False)).extrude(h)
            .edges("|Z").fillet(r).translate((x, y, z)))


def panel(w, d, h, x=0.0, y=0.0, z=0.0, rtop=0.0, rbot=0.0):
    """Box whose FRONT-VIEW corners are rounded (edges parallel to Y) — the unit's silhouette."""
    b = cq.Workplane("XY").box(w, d, h, centered=(True, False, False))
    if rtop > 0:
        b = b.edges("|Y and >Z").fillet(rtop)
    if rbot > 0:
        b = b.edges("|Y and <Z").fillet(rbot)
    return b.translate((x, y, z))


# =========================================================== head (fixed)
def head_shell():
    # the front 8 mm of the head is the door; the shell runs from there to the back
    y0 = Y_HEAD_FRONT + 8.0
    outer = panel(W, LECT_D - y0, HEAD_H, y=y0, z=Z_HEAD, rtop=R)
    inner = panel(W - 2 * T, LECT_D - y0 - T + 1, HEAD_H - 2 * T, y=y0 - 1, z=Z_HEAD + T, rtop=R - T)
    shell = outer.cut(inner)
    # notch in the bottom wall for the door's lock lip
    shell = shell.cut(box(W - 2 * R, 8.5, T + 1, 0, y0 - 0.5, Z_HEAD - 0.5))
    yb = LECT_D  # back face
    # VESA 100 bosses (M6 rivet nuts) + two hook slots for the mount plate
    for dx in (-VESA / 2, VESA / 2):
        for dz in (-VESA / 2, VESA / 2):
            shell = shell.union(cq.Workplane("XZ").center(dx, Z_MOUNT + dz).circle(7).extrude(8)
                                .translate((0, yb - T, 0)))
            shell = shell.cut(cq.Workplane("XZ").center(dx, Z_MOUNT + dz).circle(3.2).extrude(20)
                              .translate((0, yb + 5, 0)))
    for dx in (-60.0, 60.0):
        slot = cq.Workplane("XZ").center(dx, Z_MOUNT + 95).rect(24, 8).extrude(10).translate((0, yb + 2, 0))
        shell = shell.cut(slot)
    # cable entry (grommet) in the back wall, behind the carrier's bottom edge
    shell = shell.cut(cq.Workplane("XZ").center(-40, Z_MOUNT - 30).slot2D(46, 22).extrude(10).translate((0, yb + 2, 0)))
    # hidden ventilation: intake slots low on the back, exhaust slots high on the back (behind fan)
    for i in range(9):
        for z0 in (Z_HEAD + 30, Z_HEAD + HEAD_H - 40):
            shell = shell.cut(cq.Workplane("XZ").center(-80 + i * 20, z0).slot2D(14, 4, 90).extrude(10)
                              .translate((0, yb + 2, 0)))
    # door hinge knuckle seats (top front) and lock strike (bottom front, right)
    for dx in (-W / 2 + 30, W / 2 - 30):
        shell = shell.union(box(26, 10, 8, dx, Y_HEAD_FRONT + 8, Z_HEAD + HEAD_H - T - 8))
    shell = shell.union(box(30, 12, 6, 105, Y_HEAD_FRONT + 16, Z_HEAD + T))
    # security-screw lug behind the back wall (M6 tamper-resistant screw from below through the mount plate tab)
    shell = shell.union(box(40, 5, 6, 0, LECT_D, Z_MOUNT - 118).cut(
        cq.Workplane("XY").center(0, LECT_D + 2.5).circle(2.5).extrude(10).translate((0, 0, Z_MOUNT - 120))))
    return shell


def chassis_plate():
    """2 mm aluminium plate across the head interior, carrier on its front face."""
    pw, z0 = W - 2 * T - 4, Z_BAND_BOTTOM + 2
    ph = Z_HEAD + HEAD_H - T - 30 - z0
    plate = box(pw, 2.0, ph, 0, Y_CARRIER + 4.0, z0)
    # flanges to the side walls (riveted)
    for sx in (-1, 1):
        plate = plate.union(box(2.0, 18, ph, sx * (pw / 2 - 1), Y_CARRIER + 4.0, z0))
    # carrier standoffs (M3, 4 mm) at the board's six holes
    for hx, hz in ((4, 4), (176, 4), (4, 116), (176, 116), (86, 4), (94, 116)):
        x = -CARRIER[0] / 2 + hx
        z = Z_CARRIER + CARRIER[2] - hz
        plate = plate.union(cq.Workplane("XZ").center(x, z).circle(3).extrude(2.4).translate((0, Y_CARRIER + 4.0, 0)))
    # fan opening (40 mm fan at the top right, exhausting to the rear vents)
    plate = plate.cut(cq.Workplane("XZ").center(80, Z_HEAD + HEAD_H - 60).circle(19).extrude(10)
                      .translate((0, Y_CARRIER + 8, 0)))
    # cable pass-throughs
    plate = plate.cut(cq.Workplane("XZ").center(-40, Z_MOUNT - 30).slot2D(50, 24).extrude(10).translate((0, Y_CARRIER + 8, 0)))
    return plate


# ========================================================== head door
def head_door():
    """Bezel frame (production: machined 6063 ring) — glass is a separate part."""
    fz = Z_HEAD
    frame = panel(W, 8.0, HEAD_H, y=Y_HEAD_FRONT, z=fz, rtop=R)
    glass_seat = panel(W - 2 * REVEAL, GLASS_T + 1, HEAD_H - 2 * REVEAL, y=Y_HEAD_FRONT - 1, z=fz + REVEAL, rtop=R - REVEAL)
    window = panel(W - 2 * REVEAL - 8, 12, HEAD_H - 2 * REVEAL - 8, y=Y_HEAD_FRONT - 1, z=fz + REVEAL + 4, rtop=R - 6)
    frame = frame.cut(glass_seat).cut(window)
    # hinge knuckles (top) and lock lip (bottom) — hidden behind the glass/under the lip
    for dx in (-W / 2 + 54, W / 2 - 54):
        frame = frame.union(box(20, 8, 8, dx, Y_HEAD_FRONT + 8, fz + HEAD_H - T - 8))
    lip = box(W - 2 * R, 6, 3, 0, Y_HEAD_FRONT + 8, fz).cut(cq.Workplane("XY").center(105, Y_HEAD_FRONT + 11).circle(9.6).extrude(10)
                                                         .translate((0, 0, fz - 1)))
    frame = frame.union(lip)
    # display carrier: two cross bars behind the display (VESA 75 screws) tied to side straps on the bezel
    y_back = Y_DISPLAY + DISPLAY[1] + 0.2
    zc = Z_DISPLAY + DISPLAY[2] / 2
    for dz in (-37.5, 37.5):
        frame = frame.union(box(232, 3, 14, 0, y_back, zc + dz - 7))
    for sx in (-1, 1):
        frame = frame.union(box(4, y_back + 3 - (Y_HEAD_FRONT + 8), 100, sx * 114, Y_HEAD_FRONT + 8, zc - 50))
    return frame


def head_glass():
    return panel(W - 2 * REVEAL, GLASS_T, HEAD_H - 2 * REVEAL, y=Y_HEAD_FRONT, z=Z_HEAD + REVEAL, rtop=R - REVEAL)


# ===================================================== lectern (fixed)
def lectern_body():
    """Base tray + side walls + back; open at the front/top for the drop-down door."""
    outer = panel(W, LECT_D, LECT_H, rbot=R)
    inner = panel(W - 2 * T, LECT_D - T, LECT_H, y=-1, z=T, rbot=R - T)
    body = outer.cut(inner)
    # the drop-down door occupies the front 120 mm of the top and the full front face: cut the side walls' top
    # along the deck line so the door's side cheeks seat on them
    deck_cut = (cq.Workplane("YZ").polyline([(-1, DECK_FRONT_Z), (Y_HEAD_FRONT, LECT_H), (Y_HEAD_FRONT, LECT_H + 10),
                                              (-1, LECT_H + 10)]).close().extrude(W + 2).translate((-W / 2 - 1, 0, 0)))
    body = body.cut(deck_cut)
    front_cut = box(W - 2 * T, 3 * T, DECK_FRONT_Z + 1, 0, -1, T)
    body = body.cut(front_cut)
    # reader cradle (tilted 10 deg, quick-release) and printer slide rails
    for sx in (-1, 1):
        body = body.union(box(4, 150, 10, sx * (READER[0] / 2 + 4), 12, 95))
        body = body.union(box(6, PRINTER[1] + 20, 4, sx * (PRINTER[0] / 2 + 6), 6, T))
    # rubber foot pads / mount bosses underneath
    for sx in (-1, 1):
        for y in (25, LECT_D - 25):
            body = body.union(cq.Workplane("XY").center(sx * (W / 2 - 25), y).circle(8).extrude(2).translate((0, 0, -2)))
    return body


def lectern_door():
    """L-shaped drop-down door: front face + sloped deck frame; hinge at the bottom front edge."""
    front = box(W - 2 * T - 1, T, DECK_FRONT_Z - T - GLASS_T, 0, 0, T)
    # deck plate (sloped) with the reader window and glass recess
    g = GLASS_T  # the deck plate sits under the flush glass
    deck = (cq.Workplane("YZ").polyline([(0, DECK_FRONT_Z - T - g), (Y_HEAD_FRONT, LECT_H - T - g), (Y_HEAD_FRONT, LECT_H - g),
                                         (0, DECK_FRONT_Z - g)]).close().extrude(W - 2 * T - 1).translate((-(W - 2 * T - 1) / 2, 0, 0)))
    win_w, win_d = 150.0, 100.0
    window = (cq.Workplane("YZ").polyline([(10, 0), (10 + win_d, 0), (10 + win_d, 400), (10, 400)]).close()
              .extrude(win_w).translate((-win_w / 2, 0, 0)))
    deck = deck.cut(window.intersect(cq.Workplane("YZ").polyline(
        [(0, DECK_FRONT_Z - T - g - 1), (Y_HEAD_FRONT, LECT_H - T - g - 1), (Y_HEAD_FRONT, LECT_H + 1), (0, DECK_FRONT_Z + 1)])
        .close().extrude(W).translate((-W / 2, 0, 0))))
    door = front.union(deck)
    # badge slot (printer output) and speaker grille in the front face
    door = door.cut(box(96, 10, 5, 0, -2, 46))
    for i in range(6):
        for j in range(5):
            door = door.cut(cq.Workplane("XZ").center(-114 + i * 5.5, 52 + j * 5.5).circle(1.4).extrude(10).translate((0, 6, 0)))
    # hinge knuckles at the bottom front edge
    for dx in (-100, 100):
        door = door.union(cq.Workplane("YZ").center(4, T + 4.5).circle(3).extrude(30).translate((dx - 15, 0, 0)))
    return door


def deck_glass():
    t = math.tan(math.radians(DECK_ANGLE))
    y0, y1 = 2.0, Y_HEAD_FRONT - 2
    z0, z1 = DECK_FRONT_Z + y0 * t - GLASS_T, DECK_FRONT_Z + y1 * t - GLASS_T
    g = (cq.Workplane("YZ").polyline([(y0, z0), (y1, z1), (y1, z1 + GLASS_T), (y0, z0 + GLASS_T)]).close()
         .extrude(W - 2 * T - 4).translate((-(W - 2 * T - 4) / 2, 0, 0)))
    return g


def printer_drawer():
    """Tool-less slide-out tray: the printer bolts to it; paper roll drops in from the top in <1 min."""
    tray = box(PRINTER[0] + 8, PRINTER[1] + 12, 2.0, 0, 6, T + 4)
    for sx in (-1, 1):
        tray = tray.union(box(2.0, PRINTER[1] + 12, 12, sx * (PRINTER[0] / 2 + 3), 6, T + 4))
    tray = tray.union(box(70, 2.0, 18, 0, 6, T + 4).cut(box(46, 4, 10, 0, 5, T + 8)))  # finger pull
    return tray


# ====================================================== purchased parts
def purchased():
    """Envelopes of purchased modules for interference checking (not manufactured)."""
    return {
        "display_elo1302l": box(DISPLAY[0], DISPLAY[1], DISPLAY[2], 0, Y_DISPLAY, Z_DISPLAY),
        "carrier_FYR-CB-01": box(CARRIER[0], CARRIER[1], CARRIER[2], 0, Y_CARRIER, Z_CARRIER),
        "cm5_module": box(40, 5, 55, 23, Y_CARRIER - 6.5, Z_CARRIER + 15),
        "sensorbar_FYR-SB-01": box(SENSORBAR[0], SENSORBAR[1], SENSORBAR[2], 0, Y_HEAD_FRONT + 8.5, Z_SENSORBAR),
        "camera_rgb": box(CAMERA[0], CAMERA[1], CAMERA[2], -18, Y_HEAD_FRONT + 8.5, Z_CAM - CAMERA[2] / 2),
        "camera_noir": box(CAMERA[0], CAMERA[1], CAMERA[2], 18, Y_HEAD_FRONT + 8.5, Z_CAM - CAMERA[2] / 2),
        "qr_scanner_ds5502": box(SCANNER[0], SCANNER[1], SCANNER[2], -45, Y_HEAD_FRONT + 8.5, Z_HEAD + T + 2),
        "nfc_omnikey5127": box(NFC[0], NFC[1], NFC[2], 60, Y_HEAD_FRONT + 8.5, Z_HEAD + T + 0.5),
        "fan_40mm": box(FAN[0], FAN[1], FAN[2], 80, Y_CARRIER + 6.0, Z_HEAD + HEAD_H - 80),
        "passport_reader": (box(READER[0], READER[1], READER[2], 0, 0, 0)
                            .rotate((0, 0, 0), (1, 0, 0), DECK_ANGLE).translate((0, 22, 89))),
        "badge_printer": box(PRINTER[0], PRINTER[1], PRINTER[2], 0, 8, T + 6),
        "speaker": box(SPEAKER[0], SPEAKER[1], SPEAKER[2], -100, T + 1, 46),
    }


# =============================================================== mounting
def mount_plate():
    """Common hang-on plate (6 mm aluminium): two hooks, VESA 100, security screw tab, cable window."""
    p = panel(200, 6, 240, y=LECT_D + 6, z=Z_MOUNT - 120, rtop=8, rbot=8)
    p = p.cut(cq.Workplane("XZ").center(0, Z_MOUNT - 30).slot2D(70, 30).extrude(20).translate((0, LECT_D + 20, 0)))
    for dx in (-VESA / 2, VESA / 2):
        for dz in (-VESA / 2, VESA / 2):
            p = p.cut(cq.Workplane("XZ").center(dx, Z_MOUNT + dz).circle(3.3).extrude(20).translate((0, LECT_D + 20, 0)))
    for dx in (-60.0, 60.0):  # hooks engage the shell's slots
        hook = box(20, 12, 6, dx, LECT_D - 6, Z_MOUNT + 92).union(box(20, 3, 14, dx, LECT_D - 6, Z_MOUNT + 84))
        p = p.union(hook)
    # wall/stand fixing holes (6.5 mm, 4x on a 160 x 200 pattern) and a security-screw tab at the bottom
    for dx in (-80, 80):
        for dz in (-100, 100):
            p = p.cut(cq.Workplane("XZ").center(dx, Z_MOUNT + dz).circle(3.25).extrude(20).translate((0, LECT_D + 20, 0)))
    p = p.union(box(40, 10, 4, 0, LECT_D + 1, Z_MOUNT - 124).cut(
        cq.Workplane("XY").center(0, LECT_D + 2.5).circle(3.3).extrude(10).translate((0, 0, Z_MOUNT - 130))))
    return p


def desk_stand():
    """Weighted desk base (10 mm steel, powder-coated) + 15 deg column; mount plate bolts to the column head."""
    base = rounded_slab(300, 260, 10, 20, y=LECT_D - 130 - 40, z=-130)
    col = (cq.Workplane("XY").rect(80, 30).extrude(140).rotate((0, 0, 0), (1, 0, 0), -12)
           .translate((0, LECT_D + 40, -122)))
    col = col.cut(cq.Workplane("XY").rect(60, 12).extrude(160).rotate((0, 0, 0), (1, 0, 0), -12)
                  .translate((0, LECT_D + 40, -130)))  # cable channel
    head = box(170, 10, 120, 0, LECT_D + 12, Z_MOUNT - 210 - 2)
    return base.union(col).union(head)


def floor_stand():
    """Floor kit: 12 mm steel base (~13 kg) + 100 x 50 aluminium column with cable channel."""
    zf = -FLOOR_TO_UNIT
    base = rounded_slab(420, 360, 12, 30, y=LECT_D - 180 + 60, z=zf)
    col = box(100, 50, FLOOR_TO_UNIT + Z_MOUNT - 120 - 12, 0, LECT_D + 12, zf + 12)
    col = col.cut(box(80, 30, FLOOR_TO_UNIT + Z_MOUNT, 0, LECT_D + 22, zf + 12))
    cap = box(170, 12, 30, 0, LECT_D + 12, Z_MOUNT - 150)
    return base.union(col).union(cap)


@dataclass
class Part:
    name: str
    shape: cq.Workplane
    material: str
    process: str
    color: tuple


def manufactured() -> list[Part]:
    alu = (0.78, 0.79, 0.80)
    dark = (0.16, 0.17, 0.19)
    glass = (0.05, 0.06, 0.08)
    return [
        Part("head_shell", head_shell(), "6063-T5 aluminium, 3 mm", "Extruded/folded + CNC, bead-blast, anodise (Champagne or Graphite)", alu),
        Part("head_door_bezel", head_door(), "6063-T5 aluminium", "CNC machined ring, anodise", alu),
        Part("head_glass", head_glass(), "4 mm chemically strengthened soda-lime / Gorilla glass", "Cut, edge polish, black ceramic frit + IR-ink windows, AR coat", glass),
        Part("chassis_plate", chassis_plate(), "5052-H32 aluminium, 2 mm", "Laser cut + folded, PEM standoffs", dark),
        Part("lectern_body", lectern_body(), "6063-T5 aluminium, 3 mm", "Folded + welded tray, anodise", alu),
        Part("lectern_door", lectern_door(), "6063-T5 aluminium, 3 mm", "Folded + CNC, anodise", alu),
        Part("deck_glass", deck_glass(), "4 mm chemically strengthened glass (optically clear reader window)", "Cut, polish, black frit border", glass),
        Part("printer_drawer", printer_drawer(), "5052-H32 aluminium, 2 mm", "Laser cut + folded, ball-bearing slides", dark),
        Part("mount_plate", mount_plate(), "6061-T6 aluminium, 6 mm", "Laser cut + CNC, powder coat", dark),
    ]


def kits() -> dict[str, list[Part]]:
    dark = (0.16, 0.17, 0.19)
    return {
        "desk": [Part("desk_stand", desk_stand(), "S275 steel base 10 mm + 6063 column", "Laser cut, welded, powder coat", dark)],
        "floor": [Part("floor_stand", floor_stand(), "S275 steel base 12 mm + 6063 100x50 column", "Laser cut, welded, powder coat", dark)],
        "wall": [],  # the mount plate fixes straight to the wall (4x M6 into studs/anchors)
    }
