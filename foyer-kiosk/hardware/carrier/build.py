"""Build FYR-CB-01: schematic, PCB placement, autorouting, DRC and fab outputs.

Run with KiCad's Python (it provides `pcbnew`):

    /usr/bin/python3 carrier/build.py all        # everything
    /usr/bin/python3 carrier/build.py sch        # schematic + netlist + BOM only
    /usr/bin/python3 carrier/build.py place      # placement only (fast, for review)
    /usr/bin/python3 carrier/build.py route      # route the placed board
    /usr/bin/python3 carrier/build.py fab        # DRC + fabrication outputs

Board coordinate frame: origin top-left, +x right, +y down, units mm. The board
mounts on the kiosk's rear chassis plate with the top edge toward the top of
the kiosk; RJ45 and USB-C exit through the bottom edge into the rear cable
recess of the mount.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
HW = os.path.dirname(HERE)
sys.path.insert(0, HW)

from carrier.carrier import SHEETS, build  # noqa: E402
from eda import schematic  # noqa: E402

OUT = os.path.join(HERE, "kicad")
FAB = os.path.join(HERE, "fab")
NAME = "carrier"
W, H = 180.0, 120.0

RULES = {
    "min_clearance": 0.1, "min_track_width": 0.1, "min_via_diameter": 0.4, "min_through_hole_diameter": 0.2,
    "min_via_annular_width": 0.1, "min_hole_clearance": 0.2, "min_hole_to_hole": 0.25,
    "min_copper_edge_clearance": 0.3, "min_silk_clearance": 0.0,
}
CLASSES = [
    {"name": "Default", "track_width": 0.127, "clearance": 0.127, "via_diameter": 0.45, "via_drill": 0.2},
    {"name": "Power", "track_width": 0.6, "clearance": 0.2, "via_diameter": 0.6, "via_drill": 0.3},
    {"name": "PoE", "track_width": 0.5, "clearance": 2.0, "via_diameter": 0.8, "via_drill": 0.4},
    {"name": "USB", "track_width": 0.15, "clearance": 0.15, "via_diameter": 0.45, "via_drill": 0.2,
     "diff_pair_width": 0.15, "diff_pair_gap": 0.15},
    {"name": "HDMI", "track_width": 0.15, "clearance": 0.15, "via_diameter": 0.45, "via_drill": 0.2,
     "diff_pair_width": 0.15, "diff_pair_gap": 0.15},
    {"name": "MIPI", "track_width": 0.15, "clearance": 0.15, "via_diameter": 0.45, "via_drill": 0.2,
     "diff_pair_width": 0.15, "diff_pair_gap": 0.15},
    {"name": "Eth", "track_width": 0.15, "clearance": 0.15, "via_diameter": 0.45, "via_drill": 0.2,
     "diff_pair_width": 0.15, "diff_pair_gap": 0.15},
]

# CM5 footprint origin = mounting hole beside pins 99/100. Module spans x-3.5..+36.5, y-51.5..+3.5.
CM5_ORIGIN = (103.0, 104.0)
CM5_KEEPOUT = (CM5_ORIGIN[0] - 3.6, CM5_ORIGIN[1] - 51.6, CM5_ORIGIN[0] + 36.6, CM5_ORIGIN[1] + 3.6)
HOLES = ((4, 4), (W - 4, 4), (4, H - 4), (W - 4, H - 4), (86, 4), (94, H - 4))

EDGE = [  # ref, edge, position along edge, inset (negative = protrudes past the edge)
    ("J1", "bottom", 16.0, -1.0),    # RJ45 PoE++ (protrudes 1 mm into the cable recess)
    ("J2", "bottom", 66.0, -0.5),    # USB-C
    ("J7", "top", 104.0, 1.0),       # CAM1 FPC
    ("J6", "top", 122.0, 1.0),       # CAM0 FPC
    ("J5", "top", 140.0, 0.0),       # HDMI to display
    ("J16", "top", 160.0, 1.0),      # sensor bar
    ("J10", "right", 24.0, -0.5),    # USB touch | scanner
    ("J11", "right", 44.0, -0.5),    # USB printer | NFC
    ("J12", "right", 64.0, -0.5),    # USB LTE | service
    ("J9", "right", 88.0, -0.5),     # USB3 passport reader
]
ANCHORS = {  # ref: (x, y, rotation)
    "U1": (40.0, 89.0, 90),      # PoE++ PD module (vertical, beside the jack)
    "U2": (66.0, 104.0, 0),      # STUSB4500
    "U3": (68.0, 88.0, 0),       # 12 V from USB-C
    "U4": (58.0, 70.0, 0),       # ideal diode PoE
    "U5": (70.0, 72.0, 0),       # ideal diode USB
    "RS1": (82.0, 66.0, 90),     # 12 V bus current shunt
    "U7": (90.0, 88.0, 90),      # 5 V CM
    "U8": (160.0, 106.0, 0),     # 5 V AUX
    "U9": (152.0, 92.0, 0),      # 3.3 V
    "U10": (36.0, 30.0, 0),      # LM5176 24 V
    "U11": (154.0, 36.0, 0),     # hub 1
    "U12": (154.0, 62.0, 0),     # hub 2
    "U13": (90.0, 14.0, 0),      # audio amp
    "U15": (92.0, 40.0, 0),      # secure element
    "U16": (92.0, 48.0, 0),      # temperature
    "Q20": (18.0, 50.0, 0),      # display switch
    "F1": (16.0, 64.0, 90),      # aux 12 V fuse
}
LEFT_CONNECTORS = [("J_PRN", 20.0), ("J_DISP", 50.0), ("J_AUX", 66.0)]  # Micro-Fit headers, left edge
TOP_MISC = [("J_SPK", 74.0), ("J18", 60.0)]                            # speaker, fan
MISC = {"J17": (114.0, 113.0, 0), "J19": (126.0, 113.0, 0), "J_RTC": (138.0, 113.0, 0)}


def resolve(c):
    """Map role names to the auto-assigned references."""
    by = {p.ref: p for p in c.parts}
    find = lambda pred: next(p.ref for p in c.parts if pred(p))  # noqa: E731
    roles = {
        "U2": find(lambda p: p.value == "STUSB4500"),
        "J_PRN": find(lambda p: p.value == "PRINTER 24V"),
        "J_DISP": find(lambda p: p.value == "DISPLAY 12V"),
        "J_AUX": find(lambda p: p.value == "AUX 12V"),
        "J_RTC": find(lambda p: p.value == "RTC"),
        "J_SPK": find(lambda p: p.value == "SPEAKER"),
    }
    return by, roles


def do_sch(c):
    os.makedirs(OUT, exist_ok=True)
    root = schematic.write(c, OUT, SHEETS)
    c.write_netlist(os.path.join(OUT, f"{NAME}.net.txt"))
    os.makedirs(FAB, exist_ok=True)
    rows = c.write_bom(os.path.join(FAB, f"{NAME}-bom.csv"))
    subprocess.run(["kicad-cli", "sch", "export", "pdf", "-o", os.path.join(FAB, f"{NAME}-schematic.pdf"), root],
                   check=True, capture_output=True)
    xml = os.path.join(OUT, f"{NAME}.xml")
    subprocess.run(["kicad-cli", "sch", "export", "netlist", "--format", "kicadxml", "-o", xml, root],
                   check=True, capture_output=True)
    # verify: schematic connectivity == circuit model
    sch_nets = {}
    for net in ET.parse(xml).getroot().iter("net"):
        nodes = frozenset(f"{x.get('ref')}.{x.get('pin')}" for x in net.iter("node"))
        if not net.get("name").startswith("unconnected-"):
            sch_nets[net.get("name").lstrip("/")] = nodes
    model = {name: frozenset(f"{p.ref}.{n}" for p, n in net.nodes) for name, net in c.nets.items()}
    diff = [k for k in set(model) | set(sch_nets) if model.get(k) != sch_nets.get(k)]
    os.remove(xml)
    print(f"schematic: {len(sch_nets)} nets exported by KiCad, {len(diff)} differences vs circuit model")
    for k in diff[:10]:
        print("   ", k, sorted(model.get(k, []))[:6], sorted(sch_nets.get(k, []))[:6])
    print(f"BOM: {len(rows)} lines, {sum(r['Qty'] for r in rows)} placements")
    return not diff


def do_place(c):
    from eda.pcb import BoardBuilder, write_project
    os.makedirs(OUT, exist_ok=True)
    pcb_path = os.path.join(OUT, f"{NAME}.kicad_pcb")
    write_project(os.path.join(OUT, f"{NAME}.kicad_pro"), RULES, CLASSES, c, route_margin=0.01)
    bb = BoardBuilder(c, pcb_path)
    bb.outline_rounded_rect(W, H, 3.0)
    bb.edge_keepout(0.6)
    by, roles = resolve(c)
    for i, (x, y) in enumerate(HOLES):
        bb.hole(f"H{i + 1}", x, y)
    bb.keepouts.append(CM5_KEEPOUT)
    bb.put("J3", *CM5_ORIGIN, 0)
    for ref, edge, along, inset in EDGE:
        bb.put_edge(ref, edge, along, inset)
    for role, along in LEFT_CONNECTORS:
        bb.put_edge(roles[role], "left", along, 0.0)
    for role, along in TOP_MISC:
        bb.put_edge(roles.get(role, role), "top", along, 0.5)
    for ref, (x, y, r) in ANCHORS.items():
        bb.put(roles.get(ref, ref), x, y, r)
    for ref, (x, y, r) in MISC.items():
        bb.put(roles.get(ref, ref), x, y, r)
    bb.place_satellites((1.0, 1.0, W - 1.0, H - 1.0), margin=0.25)
    # copper zones: solid GND on In1/In4, power planes on In3, GND pour on outer layers
    full = [(0.3, 0.3), (W - 0.3, 0.3), (W - 0.3, H - 0.3), (0.3, H - 0.3)]
    bb.zone("GND", "In1.Cu", full)
    bb.zone("GND", "In4.Cu", full)
    bb.zone("+12V_BUS", "In3.Cu", [(0.3, 0.3), (78, 0.3), (78, 56), (86, 56), (86, H - 0.3), (0.3, H - 0.3)])
    bb.zone("+5V_CM", "In3.Cu", [(88, 52), (144, 52), (144, H - 0.3), (88, H - 0.3)])
    bb.zone("+5V_AUX", "In3.Cu", [(80, 0.3), (W - 0.3, 0.3), (W - 0.3, H - 0.3), (146, H - 0.3), (146, 50),
                                  (80, 50)])
    bb.text("FYR-CB-01 rev A  Foyer VK-1 carrier", 150, 117, "F.SilkS", 1.2)
    bb.text("circuit-as-code: foyer-kiosk/hardware", 150, 115, "F.SilkS", 0.8)
    bb.save()
    print(f"placed {len(bb.fps)} footprints on {W}x{H} mm board -> {pcb_path}")
    return pcb_path


def do_route():
    from eda.pcb import autoroute
    work = os.path.join(OUT, "route")
    os.makedirs(work, exist_ok=True)
    autoroute(os.path.join(OUT, f"{NAME}.kicad_pcb"), work, passes=60)


def do_fab(c):
    from eda.pcb import add_pours, drc, fab_outputs, stitch, write_project
    write_project(os.path.join(OUT, f"{NAME}.kicad_pro"), RULES, CLASSES, c)  # nominal clearances for DRC
    os.makedirs(FAB, exist_ok=True)
    pcb = os.path.join(OUT, f"{NAME}.kicad_pcb")
    add_pours(pcb, "GND", ("F.Cu", "B.Cu"), [(0.3, 0.3), (W - 0.3, 0.3), (W - 0.3, H - 0.3), (0.3, H - 0.3)])
    print("stitching vias added:", stitch(pcb, keepouts=(CM5_KEEPOUT,)))
    from eda.repair import repair
    rpt = os.path.join(FAB, f"{NAME}-drc.rpt")
    res = drc(pcb, rpt)
    for attempt in range(3):
        if not res.get("unconnected"):
            break
        print(f"repair pass {attempt + 1}: {res['unconnected']} unconnected")
        if not repair(pcb, rpt, clearance=0.15, width=0.15, via_d=0.45, via_drill=0.2):
            break
        res = drc(pcb, rpt)
    json.dump(res, open(os.path.join(FAB, f"{NAME}-drc-summary.json"), "w"), indent=2)
    print("DRC:", res)
    print("fab package:", fab_outputs(pcb, FAB, NAME))


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    circ = build()
    errs = circ.erc()
    if errs:
        sys.exit("ERC failed:\n" + "\n".join(errs))
    if step in ("sch", "all"):
        do_sch(circ)
    if step in ("place", "all"):
        do_place(circ)
    if step in ("route", "all"):
        do_route()
    if step in ("fab", "all"):
        do_fab(circ)
