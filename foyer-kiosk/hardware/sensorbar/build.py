"""Build FYR-SB-01 (sensor bar): schematic, placement, routing, DRC, fab outputs.

    /usr/bin/python3 sensorbar/build.py all

Board frame: 200 x 22 mm, 4 layers (F sig / In1 GND / In2 +5V / B sig), origin top-left; the top edge faces the top of the
kiosk. LEDs run along the top edge behind the light guide; the IR emitters,
ToF sensor and microphone ports sit on the centre line around the cameras,
which mount on the enclosure bracket directly below this board.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from eda import schematic  # noqa: E402
from sensorbar.sensorbar import N_LEDS, SHEETS, build  # noqa: E402

OUT = os.path.join(HERE, "kicad")
FAB = os.path.join(HERE, "fab")
NAME = "sensorbar"
W, H = 200.0, 22.0
RULES = {"min_clearance": 0.15, "min_track_width": 0.15, "min_via_diameter": 0.5, "min_through_hole_diameter": 0.25,
         "min_hole_clearance": 0.25, "min_copper_edge_clearance": 0.3}
CLASSES = [
    {"name": "Default", "track_width": 0.2, "clearance": 0.15, "via_diameter": 0.6, "via_drill": 0.3},
    {"name": "Power", "track_width": 0.6, "clearance": 0.2, "via_diameter": 0.8, "via_drill": 0.4},
]


def do_sch(c):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(FAB, exist_ok=True)
    root = schematic.write(c, OUT, SHEETS)
    c.write_netlist(os.path.join(OUT, f"{NAME}.net.txt"))
    rows = c.write_bom(os.path.join(FAB, f"{NAME}-bom.csv"))
    subprocess.run(["kicad-cli", "sch", "export", "pdf", "-o", os.path.join(FAB, f"{NAME}-schematic.pdf"), root],
                   check=True, capture_output=True)
    xml = os.path.join(OUT, f"{NAME}.xml")
    subprocess.run(["kicad-cli", "sch", "export", "netlist", "--format", "kicadxml", "-o", xml, root],
                   check=True, capture_output=True)
    sch = {net.get("name").lstrip("/"): frozenset(f"{x.get('ref')}.{x.get('pin')}" for x in net.iter("node"))
           for net in ET.parse(xml).getroot().iter("net") if not net.get("name").startswith("unconnected-")}
    model = {k: frozenset(f"{p.ref}.{n}" for p, n in v.nodes) for k, v in c.nets.items()}
    diff = [k for k in set(sch) | set(model) if sch.get(k) != model.get(k)]
    os.remove(xml)
    print(f"schematic: {len(sch)} nets, {len(diff)} differences vs model; BOM {len(rows)} lines")
    return not diff


def do_place(c):
    from eda.pcb import BoardBuilder, write_project
    pcb = os.path.join(OUT, f"{NAME}.kicad_pcb")
    write_project(os.path.join(OUT, f"{NAME}.kicad_pro"), RULES, CLASSES, c, route_margin=0.01)
    bb = BoardBuilder(c, pcb, layers=4)
    bb.outline_rounded_rect(W, H, 2.0)
    bb.edge_keepout(0.6)
    for i, x in enumerate((3.5, 56.0, 146.0, W - 3.5)):
        bb.hole(f"H{i + 1}", x, 9.0, "MountingHole:MountingHole_2.7mm_M2.5_Pad_Via")
    pitch = (W - 16) / (N_LEDS - 1)
    for i in range(1, N_LEDS + 1):
        bb.put(f"LED{i}", 8 + (i - 1) * pitch, 3.2, 0)
    bb.put("U1", 100.0, 10.5, 0)               # ToF on the centre line
    bb.put("D1", 84.0, 10.5, 0)                # IR emitters either side of the camera pair
    bb.put("D2", 116.0, 10.5, 0)
    bb.put("MK1", 70.0, 10.5, 0, bottom=True)  # bottom-port mics, ports face the front grille
    bb.put("MK2", 130.0, 10.5, 0, bottom=True)
    bb.put("U2", 40.0, 11.0, 0)                # IR driver
    bb.put_edge("J1", "bottom", 172.0, 0.0)
    bb.place_satellites((0.8, 0.8, W - 0.8, H - 0.8), margin=0.2, max_r=30)
    # 4-layer stack: In1 solid GND, In2 +5V plane (present while routing -> vias, not traces)
    full = [(0.3, 0.3), (W - 0.3, 0.3), (W - 0.3, H - 0.3), (0.3, H - 0.3)]
    bb.zone("GND", "In1.Cu", full)
    bb.zone("+5V", "In2.Cu", full)
    bb.text("FYR-SB-01 rev A", 12, 20.0, "F.SilkS", 0.9)
    bb.save()
    print(f"placed {len(bb.fps)} footprints -> {pcb}")


def do_route():
    import shutil
    from eda.pcb import autoroute
    work = os.path.join(OUT, "route")
    os.makedirs(work, exist_ok=True)
    autoroute(os.path.join(OUT, f"{NAME}.kicad_pcb"), work, passes=40, timeout_s=1800)
    shutil.copy(os.path.join(OUT, f"{NAME}.kicad_pcb"), os.path.join(OUT, f"{NAME}.routed.kicad_pcb"))


def do_fab(c):
    from eda.pcb import add_pours, drc, fab_outputs, stitch, write_project
    write_project(os.path.join(OUT, f"{NAME}.kicad_pro"), RULES, CLASSES, c)  # nominal clearances for DRC
    pcb = os.path.join(OUT, f"{NAME}.kicad_pcb")
    routed = os.path.join(OUT, f"{NAME}.routed.kicad_pcb")
    if os.path.exists(routed):  # fab always starts from the freshly routed board (idempotent)
        import shutil
        shutil.copy(routed, pcb)
    add_pours(pcb, "GND", ("F.Cu", "B.Cu"), [(0.3, 0.3), (W - 0.3, 0.3), (W - 0.3, H - 0.3), (0.3, H - 0.3)])
    from eda.repair import repair
    rpt = os.path.join(FAB, f"{NAME}-drc.rpt")
    # 1) close signal gaps while the board is still open, 2) stitch ground, 3) close pour gaps
    res = drc(pcb, rpt)
    if res.get("unconnected"):
        print(f"signal repair: {res['unconnected']} unconnected")
        repair(pcb, rpt, clearance=0.16, width=0.15, via_d=0.5, via_drill=0.25)
    print("stitching vias added:", stitch(pcb, keepouts=()))
    res = drc(pcb, rpt)
    for attempt in range(3):
        if not res.get("unconnected"):
            break
        print(f"repair pass {attempt + 1}: {res['unconnected']} unconnected")
        if not repair(pcb, rpt, clearance=0.16, width=0.15, via_d=0.5, via_drill=0.25):
            break
        res = drc(pcb, rpt)
    json.dump(res, open(os.path.join(FAB, f"{NAME}-drc-summary.json"), "w"), indent=2)
    print("DRC:", res)
    print("fab package:", fab_outputs(pcb, FAB, NAME, copper=["F.Cu", "In1.Cu", "In2.Cu", "B.Cu"]))


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
