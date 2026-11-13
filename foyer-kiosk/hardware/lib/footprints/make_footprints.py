"""Generate the Foyer custom footprints (Foyer.pretty) in KiCad 7 format.

Verified:
  * RPi_CM5_DF40C-100DS_Pair — pad geometry taken from Raspberry Pi's CM5 IO
    board design data (2x Hirose DF40C-100DS-0.4V(51), 0.4 mm pitch, rows
    3.08 mm apart, M2.5 holes on a 33 x 48 mm pattern, module 40 x 55 mm).

PROVISIONAL (vendor drawings could not be retrieved; must be checked against
the manufacturer's recommended land pattern before fabrication — see
docs/verification-register.md):
  * Bel_0826-1X1T-HS-F  — 1G 4PPoE MagJack, tab-up
  * Silvertel_Ag59812-LPB — PoE++ PD module, 50.6 x 30 mm SMD
  * OSRAM_OSLON_Black_SFH4725AS — 850 nm IR emitter
"""
from __future__ import annotations

import os
import uuid

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Foyer.pretty")
F = "(effects (font (size 1 1) (thickness 0.15)))"


def u(*k):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "foyer/" + "/".join(map(str, k))))


class FP:
    def __init__(self, name, descr, smd=True):
        self.name, self.descr, self.is_smd = name, descr, smd
        self.items: list[str] = []

    def line(self, layer, a, b, w=0.12):
        self.items.append(f'(fp_line (start {a[0]:.3f} {a[1]:.3f}) (end {b[0]:.3f} {b[1]:.3f}) '
                          f'(stroke (width {w}) (type solid)) (layer "{layer}") (tstamp {u(self.name, layer, a, b)}))')

    def rect(self, layer, x0, y0, x1, y1, w=0.12):
        for a, b in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
            self.line(layer, a, b, w)

    def text(self, kind, s, x, y, layer):
        self.items.append(f'(fp_text {kind} "{s}" (at {x:.3f} {y:.3f}) (layer "{layer}") (tstamp {u(self.name, kind)}) {F})')

    def smd(self, num, x, y, w, h, shape="rect", paste=True):
        layers = '"F.Cu" "F.Paste" "F.Mask"' if paste else '"F.Cu" "F.Mask"'
        self.items.append(f'(pad "{num}" smd {shape} (at {x:.3f} {y:.3f}) (size {w:.3f} {h:.3f}) '
                          f'(layers {layers}) (tstamp {u(self.name, "pad", num, x, y)}))')

    def tht(self, num, x, y, d, drill, shape="circle"):
        self.items.append(f'(pad "{num}" thru_hole {shape} (at {x:.3f} {y:.3f}) (size {d:.3f} {d:.3f}) '
                          f'(drill {drill:.3f}) (layers "*.Cu" "*.Mask") (tstamp {u(self.name, "pad", num, x, y)}))')

    def npth(self, x, y, d):
        self.items.append(f'(pad "" np_thru_hole circle (at {x:.3f} {y:.3f}) (size {d:.3f} {d:.3f}) '
                          f'(drill {d:.3f}) (layers "*.Cu" "*.Mask") (tstamp {u(self.name, "npth", x, y)}))')

    def write(self):
        attr = "(attr smd)" if self.is_smd else "(attr through_hole)"
        body = "\n  ".join(self.items)
        with open(os.path.join(OUT, self.name + ".kicad_mod"), "w") as f:
            f.write(f'(footprint "{self.name}" (version 20221018) (generator foyer)\n'
                    f'  (layer "F.Cu")\n  (descr "{self.descr}")\n  {attr}\n  {body}\n)\n')


def cm5():
    f = FP("RPi_CM5_DF40C-100DS_Pair",
           "Raspberry Pi Compute Module 5 socket: 2x Hirose DF40C-100DS-0.4V(51), 1.5 mm stack; "
           "geometry per Raspberry Pi CM5 IO board design data. Origin = mounting hole near pins 99/100.")
    for i in range(50):
        y = -31.3 + 0.4 * i
        f.smd(str(2 * i + 1), -2.04, y, 0.7, 0.2)
        f.smd(str(2 * i + 2), 1.04, y, 0.7, 0.2)
        f.smd(str(101 + 2 * i), 31.96, y, 0.7, 0.2)
        f.smd(str(102 + 2 * i), 35.04, y, 0.7, 0.2)
    for x, y in ((0, 0), (0, -48), (33, 0), (33, -48)):
        f.npth(x, y, 2.7)
    f.rect("F.Fab", -3.5, -51.5, 36.5, 3.5, 0.1)          # module outline 40 x 55
    f.rect("F.CrtYd", -3.75, -51.75, 36.75, 3.75, 0.05)
    f.rect("F.SilkS", -3.6, -51.6, 36.6, 3.6)
    f.line("F.SilkS", (-3.0, -32.2), (-2.6, -32.2))     # pin-1 mark
    f.rect("F.Fab", -2.9, -32.3, 1.9, -10.7, 0.1)        # connector bodies
    f.rect("F.Fab", 31.1, -32.3, 35.9, -10.7, 0.1)
    f.text("reference", "REF**", 16.5, -25, "F.SilkS")
    f.text("value", "CM5", 16.5, -20, "F.Fab")
    f.write()


def bel_magjack():
    # PROVISIONAL generic 1x1 tab-up ICM land pattern: 2 staggered rows of signal
    # pins (1.02 mm pitch, 2.54 mm row spacing), 4 LED pins, 2 shield tabs, 2 posts.
    f = FP("Bel_0826-1X1T-HS-F_PROVISIONAL",
           "PROVISIONAL - verify against Bel 0826-1X1T-HS-F drawing. 1G 4PPoE MagJack, tab up, THT", smd=False)
    names = [str(i) for i in range(1, 13)]
    for i, n in enumerate(names):
        x = -5.61 + i * 1.02
        y = 0.0 if i % 2 == 0 else 2.54
        f.tht(n, x, y, 0.9, 0.6, "rect" if i == 0 else "circle")
    for i, n in enumerate(("L1", "L2", "L3", "L4")):
        x = (-6.6, -4.06, 4.06, 6.6)[i]
        f.tht(n, x, 11.43, 1.0, 0.7)
    f.tht("SH", -7.75, 3.05, 2.4, 1.6)
    f.tht("SH", 7.75, 3.05, 2.4, 1.6)
    f.npth(-5.715, 6.35, 3.25)
    f.npth(5.715, 6.35, 3.25)
    f.rect("F.Fab", -8.0, -6.0, 8.0, 15.5, 0.1)
    f.rect("F.CrtYd", -8.5, -6.5, 8.5, 16.0, 0.05)
    f.rect("F.SilkS", -8.1, -6.1, 8.1, 15.6)
    f.text("reference", "REF**", 0, -7.5, "F.SilkS")
    f.text("value", "VERIFY_FOOTPRINT", 0, 8, "F.Fab")
    f.write()


def silvertel():
    # PROVISIONAL: 50.6 x 30 mm SMD PoE module, 2 rows of castellated pads.
    f = FP("Silvertel_Ag59812-LPB_PROVISIONAL",
           "PROVISIONAL - verify against Silvertel Ag59812-LPB datasheet. 12 V 89 W PoE++ PD module, SMD")
    left = ["VA1", "VA2", "VB1", "VB2", "NC1"]
    right = ["VOUT+", "VOUT+2", "VOUT-", "VOUT-2", "ADJ", "AT", "BT"]
    for i, n in enumerate(left):
        f.smd(n, -24.0, -10.0 + i * 5.0, 3.0, 2.0)
    for i, n in enumerate(right):
        f.smd(n, 24.0, -12.0 + i * 4.0, 3.0, 2.0)
    f.rect("F.Fab", -25.3, -15.0, 25.3, 15.0, 0.1)
    f.rect("F.CrtYd", -26.0, -15.5, 26.0, 15.5, 0.05)
    f.rect("F.SilkS", -25.4, -15.1, 25.4, 15.1)
    f.text("reference", "REF**", 0, -16.5, "F.SilkS")
    f.text("value", "VERIFY_FOOTPRINT", 0, 0, "F.Fab")
    f.write()


def oslon():
    f = FP("OSRAM_OSLON_Black_SFH4725AS_PROVISIONAL",
           "PROVISIONAL - verify against ams OSRAM SFH 4725AS land pattern. OSLON Black 3.85 x 3.85 mm")
    f.smd("1", -1.25, 0, 1.0, 3.0)      # anode
    f.smd("2", 1.25, 0, 1.0, 3.0)       # cathode
    f.smd("3", 0, 0, 1.0, 2.2, paste=True)  # thermal (electrically isolated)
    f.rect("F.Fab", -1.925, -1.925, 1.925, 1.925, 0.1)
    f.rect("F.CrtYd", -2.25, -2.25, 2.25, 2.25, 0.05)
    f.line("F.SilkS", (-2.1, -2.1), (-2.1, 2.1))
    f.text("reference", "REF**", 0, -3, "F.SilkS")
    f.text("value", "VERIFY_FOOTPRINT", 0, 3, "F.Fab")
    f.write()


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    cm5(); bel_magjack(); silvertel(); oslon()
    print("footprints written to", OUT)
