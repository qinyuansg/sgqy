"""PCB construction, autorouting and fabrication outputs (KiCad 7 pcbnew API).

Run under the system Python that ships KiCad's `pcbnew` module.
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess

import pcbnew

from .circuit import Circuit, Part
from .library import footprint_path
from .sexp import find, get, parse

mm = pcbnew.FromMM
FREEROUTING = "/opt/tools/freerouting.jar"
LAYER_NAMES = ["F.Cu", "In1.Cu", "In2.Cu", "In3.Cu", "In4.Cu", "B.Cu"]


def V(x, y):
    return pcbnew.VECTOR2I(mm(x), mm(y))


# ----------------------------------------------------------------- project
def write_project(path_pro: str, rules: dict, classes: list[dict], circuit: Circuit, template: dict | None = None,
                  route_margin: float = 0.0):
    """Write a KiCad 7 .kicad_pro with design rules and net classes.

    `route_margin` inflates class clearances while autorouting so that the router's coordinate
    rounding never lands below the nominal clearance that DRC checks afterwards."""
    classes = [{**c, "clearance": round(c["clearance"] + route_margin, 4)} for c in classes]
    pro = template or {
        "board": {"design_settings": {"defaults": {}, "diff_pair_dimensions": [], "drc_exclusions": [],
                                      "meta": {"version": 2}, "rule_severities": {}, "rules": {},
                                      "track_widths": [], "via_dimensions": []}},
        "meta": {"filename": os.path.basename(path_pro), "version": 1},
        "net_settings": {"classes": [], "meta": {"version": 3}, "net_colors": None,
                         "netclass_assignments": None, "netclass_patterns": []},
        "pcbnew": {"page_layout_descr_file": ""}, "sheets": [], "text_variables": {}, "libraries": {},
        "boards": [], "cvpcb": {}, "schematic": {},
    }
    ds = pro["board"]["design_settings"]
    ds["rules"].update({"min_resolved_spokes": 1, "min_text_height": 0.8, **rules})
    # headless builds have no footprint-library table: library-link checks are meaningless here
    ds["rule_severities"].update({"lib_footprint_issues": "ignore", "lib_footprint_mismatch": "ignore",
                                  "silk_over_copper": "warning", "silk_overlap": "warning",
                                  "silk_edge_clearance": "warning", "text_height": "warning"})
    base = {"bus_width": 12, "diff_pair_gap": 0.15, "diff_pair_via_gap": 0.25, "diff_pair_width": 0.15,
            "line_style": 0, "microvia_diameter": 0.3, "microvia_drill": 0.1,
            "pcb_color": "rgba(0, 0, 0, 0.000)", "schematic_color": "rgba(0, 0, 0, 0.000)", "wire_width": 6}
    pro["net_settings"]["classes"] = [{**base, **c} for c in classes]
    patterns = []
    for net in circuit.nets.values():
        if net.cls != "Default":
            patterns.append({"netclass": net.cls, "pattern": net.name})
    pro["net_settings"]["netclass_patterns"] = patterns
    ds["track_widths"] = [0.0] + sorted({c["track_width"] for c in classes})
    ds["via_dimensions"] = [{"diameter": 0.0, "drill": 0.0}] + [
        {"diameter": d, "drill": r} for d, r in sorted({(c["via_diameter"], c["via_drill"]) for c in classes})]
    with open(path_pro, "w", encoding="utf-8") as f:
        json.dump(pro, f, indent=2)


# ------------------------------------------------------------------- board
class BoardBuilder:
    def __init__(self, circuit: Circuit, path: str, layers: int = 6):
        self.c = circuit
        self.path = path
        open(path, "w").write('(kicad_pcb (version 20221018) (generator pcbnew))\n')
        self.b = pcbnew.LoadBoard(path)
        self.b.SetCopperLayerCount(layers)
        self.fps: dict[str, pcbnew.FOOTPRINT] = {}
        self.placed: list[tuple[str, pcbnew.BOX2I]] = []
        self.keepouts: list[tuple[float, float, float, float]] = []
        for name in circuit.nets:
            self.b.Add(pcbnew.NETINFO_ITEM(self.b, name))
        self.b.BuildListOfNets()

    # --- footprints
    def load(self, part: Part) -> pcbnew.FOOTPRINT:
        libdir, name = footprint_path(part.footprint)
        fp = pcbnew.FootprintLoad(libdir, name)
        if fp is None:
            raise RuntimeError(f"{part.ref}: footprint {part.footprint} not found")
        fp.SetReference(part.ref)
        fp.SetValue(part.value)
        fp.Reference().SetTextSize(V(0.8, 0.8))
        fp.Reference().SetTextThickness(mm(0.12))
        fp.Value().SetVisible(False)
        for k, v in (("MPN", part.mpn), ("Manufacturer", part.mfr)):
            if v:
                fp.SetProperty(k, v)
        if part.dnp:
            fp.SetAttributes(fp.GetAttributes() | pcbnew.FP_EXCLUDE_FROM_BOM)
        for pad in fp.Pads():
            num = pad.GetNumber()
            if num in part.conn:
                pad.SetNet(self.b.FindNet(part.conn[num].name))
        return fp

    def _bbox(self, fp) -> pcbnew.BOX2I:
        cy = fp.GetCourtyard(pcbnew.F_CrtYd if not fp.IsFlipped() else pcbnew.B_CrtYd)
        if cy.OutlineCount():
            return cy.BBox()
        return fp.GetBoundingBox(False, False)

    def put(self, ref: str, x: float, y: float, rot: float = 0, bottom: bool = False):
        part = next(p for p in self.c.parts if p.ref == ref)
        fp = self.load(part)
        fp.SetPosition(V(x, y))
        fp.SetOrientationDegrees(rot)
        self.b.Add(fp)  # must be on the board before flipping (layer mapping)
        if bottom:
            fp.Flip(V(x, y), False)
        self.fps[ref] = fp
        self.placed.append((ref, self._bbox(fp)))
        return fp

    def put_edge(self, ref: str, edge: str, along: float, inset: float = 0.0, bottom: bool = False):
        """Place a connector so its mating face points out of `edge` and sits `inset` mm inside it.

        The mating direction is taken as the vector from the pad centroid to the courtyard centre.
        """
        part = next(p for p in self.c.parts if p.ref == ref)
        fp = self.load(part)
        want = {"top": (0, -1), "bottom": (0, 1), "left": (-1, 0), "right": (1, 0)}[edge]
        best = None
        for rot in (0, 90, 180, 270):
            fp.SetOrientationDegrees(rot)
            fp.SetPosition(V(0, 0))
            pads = list(fp.Pads())
            px = sum(p.GetPosition().x for p in pads) / len(pads)
            py = sum(p.GetPosition().y for p in pads) / len(pads)
            bb = self._bbox(fp)
            dx, dy = bb.GetCenter().x - px, bb.GetCenter().y - py
            score = dx * want[0] + dy * want[1]
            if best is None or score > best[0]:
                best = (score, rot)
        fp.SetOrientationDegrees(best[1])
        fp.SetPosition(V(0, 0))
        bb = self._bbox(fp)
        W, H = self.size
        if edge in ("top", "bottom"):
            x = mm(along) - bb.GetCenter().x
            y = (mm(inset) - bb.GetTop()) if edge == "top" else (mm(H - inset) - bb.GetBottom())
        else:
            y = mm(along) - bb.GetCenter().y
            x = (mm(inset) - bb.GetLeft()) if edge == "left" else (mm(W - inset) - bb.GetRight())
        fp.SetPosition(pcbnew.VECTOR2I(int(x), int(y)))
        self.b.Add(fp)
        if bottom:
            fp.Flip(fp.GetPosition(), False)
        self.fps[ref] = fp
        self.placed.append((ref, self._bbox(fp)))
        return fp

    def _free(self, bb: pcbnew.BOX2I, margin: float, area) -> bool:
        x0, y0, x1, y1 = area
        if bb.GetLeft() < mm(x0) or bb.GetTop() < mm(y0) or bb.GetRight() > mm(x1) or bb.GetBottom() > mm(y1):
            return False
        grown = pcbnew.BOX2I(bb.GetPosition(), bb.GetSize())
        grown.Inflate(mm(margin))
        for _, other in self.placed:
            if grown.Intersects(other):
                return False
        for kx0, ky0, kx1, ky1 in self.keepouts:
            if grown.Intersects(pcbnew.BOX2I(V(kx0, ky0), V(kx1 - kx0, ky1 - ky0))):
                return False
        return True

    def place_satellites(self, area, margin=0.2, step=0.25, max_r=40.0):
        """Place every part that has `near=` close to the pads it shares nets with."""
        todo = [p for p in self.c.parts if p.ref not in self.fps]
        missing = [p.ref for p in todo if p.near is None]
        if missing:
            raise RuntimeError(f"parts without placement: {missing}")
        def depth(p):
            d = 0
            while p.near is not None and p.ref not in self.fps:
                p, d = p.near, d + 1
            return d

        # anchors before their satellites; within a cluster, larger parts first
        todo.sort(key=lambda p: (depth(p), -len(p.pins), p.near.ref))
        for part in todo:
            anchor = self.fps[part.near.ref]
            nets = {n.name for n in part.conn.values()} - {"GND"}
            pads = [pd for pd in anchor.Pads() if pd.GetNetname() in nets]
            if pads:
                tx = sum(pd.GetPosition().x for pd in pads) / len(pads)
                ty = sum(pd.GetPosition().y for pd in pads) / len(pads)
            else:
                pos = anchor.GetPosition()
                tx, ty = pos.x, pos.y
            fp = self.load(part)
            side_bottom = anchor.IsFlipped() and part.fields.get("side") != "top"
            self.b.Add(fp)
            if side_bottom:
                fp.Flip(fp.GetPosition(), False)
            done = False
            r = 0.0
            while r <= max_r and not done:
                n = max(1, int(2 * math.pi * r / step)) if r else 1
                for i in range(n):
                    a = 2 * math.pi * i / n
                    x = tx + mm(r) * math.cos(a)
                    y = ty + mm(r) * math.sin(a)
                    for rot in (0, 90):
                        fp.SetOrientationDegrees(rot)
                        fp.SetPosition(pcbnew.VECTOR2I(int(x), int(y)))
                        bb = self._bbox(fp)
                        if self._free(bb, margin, area):
                            done = True
                            break
                    if done:
                        break
                r += step
            if not done:
                raise RuntimeError(f"could not place {part.ref} near {part.near.ref}")
            self.fps[part.ref] = fp
            self.placed.append((part.ref, self._bbox(fp)))

    # --- outline / holes / zones
    def outline_rounded_rect(self, w, h, r):
        self.size = (w, h)
        def seg(a, b):
            s = pcbnew.PCB_SHAPE(self.b)
            s.SetShape(pcbnew.SHAPE_T_SEGMENT)
            s.SetStart(V(*a)); s.SetEnd(V(*b))
            s.SetLayer(pcbnew.Edge_Cuts); s.SetWidth(mm(0.1)); self.b.Add(s)

        def arc(c, start, ang):
            s = pcbnew.PCB_SHAPE(self.b)
            s.SetShape(pcbnew.SHAPE_T_ARC)
            s.SetCenter(V(*c)); s.SetStart(V(*start)); s.SetArcAngleAndEnd(pcbnew.EDA_ANGLE(ang, pcbnew.DEGREES_T))
            s.SetLayer(pcbnew.Edge_Cuts); s.SetWidth(mm(0.1)); self.b.Add(s)

        seg((r, 0), (w - r, 0)); seg((w, r), (w, h - r)); seg((w - r, h), (r, h)); seg((0, h - r), (0, r))
        arc((w - r, r), (w - r, 0), 90); arc((w - r, h - r), (w, h - r), 90)
        arc((r, h - r), (r, h), 90); arc((r, r), (0, r), 90)

    def hole(self, ref, x, y, fp="MountingHole:MountingHole_3.2mm_M3_Pad_Via"):
        libdir, name = footprint_path(fp)
        f = pcbnew.FootprintLoad(libdir, name)
        f.SetReference(ref); f.SetPosition(V(x, y)); f.Reference().SetVisible(False); f.Value().SetVisible(False)
        for pad in f.Pads():
            pad.SetNet(self.b.FindNet("GND"))
        self.b.Add(f)
        self.placed.append((ref, self._bbox(f)))

    def zone(self, net, layer, poly, priority=0, clearance=0.2, min_width=0.2, thermal=True):
        z = pcbnew.ZONE(self.b)
        z.SetLayer(self.b.GetLayerID(layer))
        z.SetNet(self.b.FindNet(net))
        ol = z.Outline()
        ol.NewOutline()
        for x, y in poly:
            ol.Append(mm(x), mm(y))
        z.SetAssignedPriority(priority)
        z.SetLocalClearance(mm(clearance))
        z.SetMinThickness(mm(min_width))
        z.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL if thermal else pcbnew.ZONE_CONNECTION_FULL)
        z.SetIslandRemovalMode(pcbnew.ISLAND_REMOVAL_MODE_ALWAYS)
        z.SetThermalReliefGap(mm(0.25))
        z.SetThermalReliefSpokeWidth(mm(0.4))
        self.b.Add(z)
        return z

    def edge_keepout(self, band: float = 0.6):
        """Track/via keep-out band along the board edge (honoured by the autorouter)."""
        W, H = self.size
        for x0, y0, x1, y1 in ((0, 0, W, band), (0, H - band, W, H), (0, 0, band, H), (W - band, 0, W, H)):
            z = pcbnew.ZONE(self.b)
            z.SetIsRuleArea(True)
            z.SetDoNotAllowTracks(True); z.SetDoNotAllowVias(True)
            z.SetDoNotAllowCopperPour(False); z.SetDoNotAllowPads(False); z.SetDoNotAllowFootprints(False)
            cu = pcbnew.LSET()
            for layer in self.b.GetEnabledLayers().CuStack():
                cu.AddLayer(layer)
            z.SetLayerSet(cu)
            ol = z.Outline(); ol.NewOutline()
            for px, py in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
                ol.Append(mm(px), mm(py))
            self.b.Add(z)

    def fill_zones(self):
        pcbnew.ZONE_FILLER(self.b).Fill(self.b.Zones())

    def text(self, s, x, y, layer="F.SilkS", size=1.2):
        t = pcbnew.PCB_TEXT(self.b)
        layer_id = {"F.SilkS": pcbnew.F_SilkS, "B.SilkS": pcbnew.B_SilkS, "F.Fab": pcbnew.F_Fab,
                    "B.Fab": pcbnew.B_Fab}.get(layer, None)
        t.SetText(s); t.SetPosition(V(x, y)); t.SetLayer(layer_id if layer_id is not None else self.b.GetLayerID(layer))
        t.SetTextSize(V(size, size)); t.SetTextThickness(mm(size * 0.15))
        if layer.startswith("B."):
            t.SetMirrored(True)
        self.b.Add(t)

    def save(self, path=None):
        pcbnew.SaveBoard(path or self.path, self.b)


# ----------------------------------------------------------------- routing
def unrouted(board) -> int:
    board.BuildConnectivity()
    return board.GetConnectivity().GetUnconnectedCount(True)


def mark_plane_layers(dsn: str, layers):
    """Declare plane layers as `power` in the DSN so the autorouter keeps signals off them."""
    text = open(dsn, encoding="utf-8").read()
    for name in layers:
        text = re.sub(r"(\(layer " + re.escape(name) + r"\s*\n\s*\(type )signal\)", r"\1power)", text)
    open(dsn, "w", encoding="utf-8").write(text)


def strip_plane_nets(dsn: str, nets):
    """Remove plane-connected nets from a Specctra DSN so the autorouter leaves them to the planes.
    Their pads stay in the design as obstacles; `repair.fanout` later connects them with vias."""
    text = open(dsn, encoding="utf-8").read()
    head, tail = text.split("(network", 1)
    for name in nets:
        tok = re.escape(name)
        tail = re.sub(r"\n\s*\(net " + tok + r"\n\s*\(pins [^)]*\)\n\s*\)", "", tail)
        tail = re.sub(r"(?<=\s)" + tok + r"(?=[\s)])", "", tail)  # drop from class member lists
    open(dsn, "w", encoding="utf-8").write(head + "(network" + tail)


def autoroute(board_path: str, workdir: str, passes: int = 100, timeout_s: int = 5400, rounds: int = 3,
              log=print, plane_nets=(), plane_layers=()) -> int:
    """Export DSN, run Freerouting, import the session; repeat (keeping existing copper) until
    nothing is left unrouted or `rounds` is reached. Returns the remaining unrouted count."""
    left = None
    for rnd in range(1, rounds + 1):
        b = pcbnew.LoadBoard(board_path)
        dsn = os.path.join(workdir, f"route{rnd}.dsn")
        ses = os.path.join(workdir, f"route{rnd}.ses")
        if os.path.exists(ses):
            os.remove(ses)
        if not pcbnew.ExportSpecctraDSN(b, dsn):
            raise RuntimeError("DSN export failed")
        if plane_nets:
            strip_plane_nets(dsn, plane_nets)
        if plane_layers:
            mark_plane_layers(dsn, plane_layers)
        cmd = ["xvfb-run", "-a", "java", "-Xmx6g", "-jar", FREEROUTING, "-de", dsn, "-do", ses,
               "-mp", str(passes), "-mt", "1", "-oit", "0.1"]
        log(f"round {rnd}: " + " ".join(cmd))
        with open(os.path.join(workdir, f"freerouting{rnd}.log"), "w") as lf:
            proc = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                proc.wait(timeout=timeout_s)
            except subprocess.TimeoutExpired:
                import signal
                os.killpg(proc.pid, signal.SIGKILL)  # take Xvfb and the JVM down with it
                proc.wait()
                log(f"round {rnd}: Freerouting timed out after {timeout_s} s")
                break
        if not os.path.exists(ses):
            raise RuntimeError(f"Freerouting produced no session file; see freerouting{rnd}.log")
        # Freerouting writes the complete wiring (pre-existing + new) to the session. Replace the
        # board's tracks with it only if the session really contains at least as much copper.
        ses_text = open(ses, encoding="utf-8").read()
        n_ses = ses_text.count("(wire") + ses_text.count("(via ")
        existing = list(b.GetTracks())
        if n_ses >= sum(1 for t in existing if t.GetClass() == "PCB_VIA") + 1:
            for t in existing:
                b.Remove(t)
        import_ses(b, ses)
        left = unrouted(b)
        pcbnew.SaveBoard(board_path, b)
        log(f"round {rnd}: {left} unrouted connections")
        if left == 0:
            break
    return left


def import_ses(board, ses_path: str):
    """Import wires and vias from a Specctra session file (KiCad 7 API lacks a headless importer)."""
    ses = parse(open(ses_path, encoding="utf-8").read())
    routes = get(ses, "routes")
    res = get(routes, "resolution")
    scale = {"um": 1000, "mm": 1_000_000, "mil": 25400}[res[1]] / float(res[2])  # nm per unit
    layer_ids = {name: board.GetLayerID(name) for name in LAYER_NAMES}
    padstacks = {}
    for ps in find(get(routes, "library_out") or [], "padstack"):
        m = re.match(r"Via\[(\d+)-(\d+)\]_(\d+):(\d+)_um", ps[1])
        if m:
            padstacks[ps[1]] = tuple(int(g) for g in m.groups())
    for net in find(get(routes, "network_out"), "net"):
        ni = board.FindNet(net[1])
        for wire in find(net, "wire"):
            path = get(wire, "path")
            layer, width = path[1], float(path[2]) * scale
            pts = [(float(path[i]) * scale, -float(path[i + 1]) * scale) for i in range(3, len(path) - 1, 2)]
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                t = pcbnew.PCB_TRACK(board)
                t.SetStart(pcbnew.VECTOR2I(int(x0), int(y0)))
                t.SetEnd(pcbnew.VECTOR2I(int(x1), int(y1)))
                t.SetWidth(int(width))
                t.SetLayer(layer_ids[layer])
                t.SetNet(ni)
                board.Add(t)
        for via in find(net, "via"):
            name, x, y = via[1], float(via[2]) * scale, -float(via[3]) * scale
            l0, l1, dia, drill = padstacks.get(name, (0, 5, 450, 200))
            v = pcbnew.PCB_VIA(board)
            v.SetPosition(pcbnew.VECTOR2I(int(x), int(y)))
            v.SetWidth(int(dia * 1000))
            v.SetDrill(int(drill * 1000))
            v.SetViaType(pcbnew.VIATYPE_THROUGH)
            v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
            v.SetNet(ni)
            board.Add(v)


def add_pours(board_path: str, net: str, layers, poly, clearance=0.25):
    """Add outer-layer copper pours after routing (so the autorouter keeps those layers free)."""
    b = pcbnew.LoadBoard(board_path)
    # custom-shaped pads (e.g. a microphone's ground ring) cannot take thermal spokes: connect them solid
    for fp in b.GetFootprints():
        for pad in fp.Pads():
            if pad.GetNetname() == net and pad.GetShape() == pcbnew.PAD_SHAPE_CUSTOM:
                pad.SetZoneConnection(pcbnew.ZONE_CONNECTION_FULL)
    for layer in layers:
        z = pcbnew.ZONE(b)
        z.SetLayer(b.GetLayerID(layer))
        z.SetNet(b.FindNet(net))
        ol = z.Outline(); ol.NewOutline()
        for x, y in poly:
            ol.Append(mm(x), mm(y))
        z.SetLocalClearance(mm(clearance)); z.SetMinThickness(mm(0.2))
        z.SetIslandRemovalMode(pcbnew.ISLAND_REMOVAL_MODE_ALWAYS)
        z.SetPadConnection(pcbnew.ZONE_CONNECTION_THERMAL)
        z.SetThermalReliefGap(mm(0.25)); z.SetThermalReliefSpokeWidth(mm(0.4))
        b.Add(z)
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())
    pcbnew.SaveBoard(board_path, b)


# --------------------------------------------------------------- stitching
def stitch(board_path: str, net: str = "GND", pitch: float = 4.0, via_d: float = 0.6, drill: float = 0.3,
           clearance: float = 0.25, edge: float = 3.0, keepouts=()) -> int:
    """Drop ground stitching vias on a grid wherever they clear all other copper."""
    b = pcbnew.LoadBoard(board_path)
    gnd = b.FindNet(net)
    bb = b.GetBoardEdgesBoundingBox()
    x0, y0, x1, y1 = bb.GetLeft(), bb.GetTop(), bb.GetRight(), bb.GetBottom()
    r = mm(via_d / 2 + clearance)
    obstacles = []  # (kind, data, extra_radius)
    for fp in b.GetFootprints():
        for pad in fp.Pads():
            box = pad.GetBoundingBox()
            box.Inflate(r)
            obstacles.append(("box", box))
        cy = fp.GetCourtyard(pcbnew.F_CrtYd if not fp.IsFlipped() else pcbnew.B_CrtYd)
        if cy.OutlineCount() and fp.GetReference().startswith(("U", "J", "Y")):
            box = cy.BBox()
            obstacles.append(("box", box))
    for t in b.GetTracks():
        if t.GetClass() == "PCB_VIA":
            obstacles.append(("pt", t.GetPosition(), r + t.GetWidth() // 2))
        else:
            obstacles.append(("seg", t.GetStart(), t.GetEnd(), r + t.GetWidth() // 2))
    for kx0, ky0, kx1, ky1 in keepouts:
        obstacles.append(("box", pcbnew.BOX2I(V(kx0, ky0), V(kx1 - kx0, ky1 - ky0))))

    def seg_dist(px, py, ax, ay, bx, by):
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
        cx, cy2 = ax + t * dx, ay + t * dy
        return math.hypot(px - cx, py - cy2)

    added = 0
    step = mm(pitch)
    candidates = []
    y = y0 + mm(edge)
    while y < y1 - mm(edge):
        x = x0 + mm(edge)
        while x < x1 - mm(edge):
            candidates.append((x, y))
            x += step
        y += step
    # rings around every GND pad so that small pour islands get a via too
    for fp in b.GetFootprints():
        for pad in fp.Pads():
            if pad.GetNetname() != net:
                continue
            c0 = pad.GetPosition()
            for rad in (1.0, 1.5, 2.2):
                for k in range(12):
                    a = 2 * math.pi * k / 12
                    px, py = c0.x + mm(rad) * math.cos(a), c0.y + mm(rad) * math.sin(a)
                    if x0 + mm(edge) < px < x1 - mm(edge) and y0 + mm(edge) < py < y1 - mm(edge):
                        candidates.append((px, py))
    for x, y in candidates:
            ok = True
            for ob in obstacles:
                if ob[0] == "box":
                    if ob[1].Contains(pcbnew.VECTOR2I(int(x), int(y))):
                        ok = False; break
                elif ob[0] == "pt":
                    if math.hypot(x - ob[1].x, y - ob[1].y) < ob[2] + r:
                        ok = False; break
                elif seg_dist(x, y, ob[1].x, ob[1].y, ob[2].x, ob[2].y) < ob[3]:
                    ok = False; break
            if ok:
                v = pcbnew.PCB_VIA(b)
                v.SetPosition(pcbnew.VECTOR2I(int(x), int(y)))
                v.SetWidth(mm(via_d)); v.SetDrill(mm(drill))
                v.SetViaType(pcbnew.VIATYPE_THROUGH); v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
                v.SetNet(gnd)
                b.Add(v)
                obstacles.append(("pt", v.GetPosition(), r + mm(via_d / 2)))
                added += 1
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())
    pcbnew.SaveBoard(board_path, b)
    return added


# --------------------------------------------------------------------- DRC
def drc(board_path: str, report: str) -> dict:
    b = pcbnew.LoadBoard(board_path)
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())
    pcbnew.SaveBoard(board_path, b)
    pcbnew.WriteDRCReport(b, report, pcbnew.EDA_UNITS_MILLIMETRES, True)
    text = open(report, encoding="utf-8").read()
    counts = {}
    for key, pat in (("violations", r"\*\* Found (\d+) DRC violations"),
                     ("unconnected", r"\*\* Found (\d+) unconnected pads"),
                     ("footprint_errors", r"\*\* Found (\d+) Footprint errors")):
        m = re.search(pat, text)
        counts[key] = int(m.group(1)) if m else None
    kinds: dict[str, dict[str, int]] = {}
    for m in re.finditer(r"^\[(\w+)\]:.*\n.*Severity: (\w+)", text, re.M):
        sev = kinds.setdefault(m.group(2), {})
        sev[m.group(1)] = sev.get(m.group(1), 0) + 1
    counts["errors"] = sum(kinds.get("error", {}).values())
    counts["warnings"] = sum(kinds.get("warning", {}).values())
    counts["by_severity"] = kinds
    return counts


# --------------------------------------------------------------- fab files
def fab_outputs(board_path: str, outdir: str, name: str, layers2: bool = False, copper=None):
    os.makedirs(outdir, exist_ok=True)
    g = os.path.join(outdir, "gerbers")
    os.makedirs(g, exist_ok=True)
    copper = copper or (["F.Cu", "B.Cu"] if layers2 else LAYER_NAMES)
    layers = ",".join(copper + ["F.Paste", "B.Paste", "F.SilkS", "B.SilkS", "F.Mask", "B.Mask", "Edge.Cuts"])

    def cli(*args):
        r = subprocess.run(["kicad-cli", "pcb", "export", *args, board_path], capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(r.stdout + r.stderr)

    cli("gerbers", "-o", g + "/", "--layers", layers, "--subtract-soldermask", "--no-x2")
    cli("drill", "-o", g + "/", "--format", "excellon", "--excellon-units", "mm", "--generate-map", "--map-format", "pdf")
    cli("pos", "-o", os.path.join(outdir, f"{name}-cpl.csv"), "--format", "csv", "--units", "mm", "--use-drill-file-origin")
    cli("step", "-o", os.path.join(outdir, f"{name}.step"), "--subst-models", "--force")
    for side, lay in (("top", "F.Cu,F.SilkS,F.Mask,Edge.Cuts"), ("bottom", "B.Cu,B.SilkS,B.Mask,Edge.Cuts")):
        cli("svg", "-o", os.path.join(outdir, f"{name}-{side}.svg"), "--layers", lay, "--exclude-drawing-sheet",
            "--page-size-mode", "2", *(["--mirror"] if side == "bottom" else []))
    cli("pdf", "-o", os.path.join(outdir, f"{name}-assembly-top.pdf"), "--layers", "F.Fab,F.SilkS,Edge.Cuts", "--exclude-refdes")
    cli("dxf", "-o", os.path.join(outdir, f"{name}-outline.dxf"), "--layers", "Edge.Cuts", "--exclude-refdes", "--exclude-value", "--output-units", "mm")
    zipbase = os.path.join(outdir, f"{name}-gerbers")
    shutil.make_archive(zipbase, "zip", g)
    return zipbase + ".zip"
