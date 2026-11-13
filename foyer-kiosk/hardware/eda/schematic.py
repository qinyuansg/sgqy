"""Generate KiCad 7 hierarchical schematics from a Circuit.

Each functional group becomes a sheet. Every part is drawn as a box symbol
whose pins come from the verified pin map; each pin carries a global label with
its net name, so connectivity is explicit and reviewable. `kicad-cli` then
renders a PDF and exports a netlist, which `build` diffs against the circuit.
"""
from __future__ import annotations

import datetime
import os
import uuid as _uuid

from .circuit import Circuit, Part
from .sexp import q

G = 2.54
FONT = "(effects (font (size 1.27 1.27)))"
FONT_HIDE = "(effects (font (size 1.27 1.27)) hide)"
NS = _uuid.UUID("6f6f7965-722d-6b69-6f73-6b2d73636831")


def uid(*key) -> str:
    return str(_uuid.uuid5(NS, "/".join(map(str, key))))


def _snap(v: float) -> float:
    return round(v / G) * G


class _Box:
    """Box symbol geometry for one part."""

    def __init__(self, part: Part):
        self.part = part
        nums = sorted(part.pins, key=lambda n: (len(n), n))
        if len(nums) <= 2:
            self.left, self.right = nums[:1], nums[1:]
        else:
            half = (len(nums) + 1) // 2
            self.left, self.right = nums[:half], nums[half:]
        names = [part.pins[n][0] for n in nums] + [""]
        name_w = max(len(n) for n in names) * 1.0
        self.w = _snap(max(7.62, 2 * name_w + 5.08) if len(nums) > 2 else 5.08)
        rows = max(len(self.left), len(self.right), 1)
        self.h = _snap(rows * G + G)
        self.lib_id = "Foyer:" + part.ref

    def pin_points(self):
        """(num, x, y, side) in symbol coordinates (y up)."""
        top = self.h / 2 - G
        out = []
        for i, n in enumerate(self.left):
            out.append((n, -self.w / 2 - G, top - i * G, "L"))
        for i, n in enumerate(self.right):
            out.append((n, self.w / 2 + G, top - i * G, "R"))
        return out

    def lib_symbol(self) -> str:
        p = self.part
        hw, hh = self.w / 2, self.h / 2
        pins = []
        for n, x, y, side in self.pin_points():
            name, etype = p.pins[n]
            etype = etype if etype in ("input", "output", "bidirectional", "tri_state", "passive",
                                       "free", "unspecified", "power_in", "power_out",
                                       "open_collector", "open_emitter", "no_connect") else "passive"
            if etype in ("power_in", "power_out", "no_connect", "free"):
                etype = "passive"
            ang = 0 if side == "L" else 180
            pins.append(f'(pin {etype} line (at {x:.2f} {y:.2f} {ang}) (length {G}) '
                        f'(name {q(name)} {FONT}) (number {q(n)} {FONT}))')
        short = self.lib_id.split(":")[1]
        return (f'(symbol {q(self.lib_id)} (in_bom yes) (on_board yes)\n'
                f'  (property "Reference" {q(p.ref.rstrip("0123456789"))} (at 0 {hh + 1.27:.2f} 0) {FONT})\n'
                f'  (property "Value" {q(p.value)} (at 0 {-hh - 1.27:.2f} 0) {FONT})\n'
                f'  (property "Footprint" "" (at 0 0 0) {FONT_HIDE})\n'
                f'  (property "Datasheet" "" (at 0 0 0) {FONT_HIDE})\n'
                f'  (symbol {q(short + "_0_1")} (rectangle (start {-hw:.2f} {hh:.2f}) (end {hw:.2f} {-hh:.2f}) '
                f'(stroke (width 0.254) (type default)) (fill (type background))))\n'
                f'  (symbol {q(short + "_1_1")} {" ".join(pins)}))')


def _sheet_body(circuit: Circuit, parts: list[Part], root_uuid: str, sheet_uuid: str | None,
                project: str, title: str, page: int, paper: str = "A2") -> str:
    # cluster each anchor with its satellites so a circuit reads as a unit
    refs = {id(p) for p in parts}
    heads = [p for p in parts if p.near is None or id(p.near) not in refs]
    ordered = []

    def visit(node, head):
        ordered.append((node, head))
        for p in parts:
            if p.near is node:
                visit(p, False)

    for h in heads:
        visit(h, True)
    assert len(ordered) == len(parts), "schematic clustering lost parts"
    boxes = [_Box(p) for p, _ in ordered]
    starts = [is_head for _, is_head in ordered]
    # shelf packing on an A2 sheet (594 x 420 mm); each cluster starts a new row
    W, H = (594, 420) if paper == "A2" else (841, 594)
    x, y, shelf = 25.4, 30.48, 0.0
    placed = []
    for b, new_row in zip(boxes, starts):
        bw = b.w + 2 * G + 28  # room for labels
        bh = b.h + 10
        if x + bw > W - 20 or (new_row and x > 25.4 and len(b.part.pins) > 3):
            x, y, shelf = 25.4, y + shelf, 0.0
        placed.append((b, _snap(x + bw / 2), _snap(y + bh / 2)))
        x += bw
        shelf = max(shelf, bh)
    path = f"/{root_uuid}" + (f"/{sheet_uuid}" if sheet_uuid else "")
    out = [f'(kicad_sch (version 20230121) (generator eeschema)',
           f'  (uuid {sheet_uuid or root_uuid})',
           f'  (paper {q(paper)})',
           f'  (title_block (title {q(title)}) (date {q(datetime.date.today().isoformat())}) (rev "A") '
           f'(company "Foyer VK-1") (comment 1 {q("Generated from " + circuit.name + ".py - do not edit by hand")}))',
           '  (lib_symbols']
    out += ["    " + b.lib_symbol() for b in boxes]
    out.append('  )')
    for b, sx, sy in placed:
        p = b.part
        out.append(f'  (symbol (lib_id {q(b.lib_id)}) (at {sx:.2f} {sy:.2f} 0) (unit 1) (in_bom yes) (on_board yes) '
                   f'(dnp {"yes" if p.dnp else "no"}) (uuid {uid(circuit.name, p.ref)})')
        out.append(f'    (property "Reference" {q(p.ref)} (at {sx:.2f} {sy - b.h / 2 - 1.27:.2f} 0) {FONT})')
        out.append(f'    (property "Value" {q(p.value)} (at {sx:.2f} {sy + b.h / 2 + 1.27:.2f} 0) {FONT})')
        out.append(f'    (property "Footprint" {q(p.footprint)} (at {sx:.2f} {sy:.2f} 0) {FONT_HIDE})')
        out.append(f'    (property "Datasheet" "" (at {sx:.2f} {sy:.2f} 0) {FONT_HIDE})')
        out.append(f'    (property "MPN" {q(p.mpn)} (at {sx:.2f} {sy:.2f} 0) {FONT_HIDE})')
        out.append(f'    (property "Manufacturer" {q(p.mfr)} (at {sx:.2f} {sy:.2f} 0) {FONT_HIDE})')
        for n in p.pins:
            out.append(f'    (pin {q(n)} (uuid {uid(circuit.name, p.ref, "pin", n)}))')
        out.append(f'    (instances (project {q(project)} (path {q(path)} (reference {q(p.ref)}) (unit 1))))')
        out.append('  )')
        for n, px, py, side in b.pin_points():
            ax, ay = sx + px, sy - py
            if n in p.conn:
                net = p.conn[n].name
                ang, just = (180, "right") if side == "L" else (0, "left")
                out.append(f'  (global_label {q(net)} (shape passive) (at {ax:.2f} {ay:.2f} {ang}) (fields_autoplaced) '
                           f'(effects (font (size 1.27 1.27)) (justify {just})) (uuid {uid(circuit.name, p.ref, n, "lbl")}) '
                           f'(property "Intersheetrefs" "${{INTERSHEET_REFS}}" (at {ax:.2f} {ay:.2f} 0) {FONT_HIDE}))')
            else:
                out.append(f'  (no_connect (at {ax:.2f} {ay:.2f}) (uuid {uid(circuit.name, p.ref, n, "nc")}))')
    if sheet_uuid is None:
        out.append('  (sheet_instances (path "/" (page "1")))')
    out.append(')')
    return "\n".join(out) + "\n"


def write(circuit: Circuit, outdir: str, sheet_titles: dict[str, str]) -> str:
    """Write <name>.kicad_sch (root) plus one sheet per group. Returns root path."""
    os.makedirs(outdir, exist_ok=True)
    project = circuit.name
    root_uuid = uid(circuit.name, "root")
    groups: dict[str, list[Part]] = {}
    for p in circuit.parts:
        groups.setdefault(p.group, []).append(p)
    order = [g for g in sheet_titles if g in groups] + sorted(g for g in groups if g not in sheet_titles)

    sheets = []
    for i, g in enumerate(order):
        su = uid(circuit.name, "sheet", g)
        fname = f"{project}_{g}.kicad_sch"
        title = f"{circuit.title} — {sheet_titles.get(g, g)}"
        with open(os.path.join(outdir, fname), "w", encoding="utf-8") as f:
            f.write(_sheet_body(circuit, groups[g], root_uuid, su, project, title, i + 2))
        sheets.append((g, su, fname, i + 2))

    lines = [f'(kicad_sch (version 20230121) (generator eeschema)', f'  (uuid {root_uuid})', '  (paper "A3")',
             f'  (title_block (title {q(circuit.title)}) (date {q(datetime.date.today().isoformat())}) (rev "A") '
             f'(company "Foyer VK-1") (comment 1 "Root sheet - functional blocks") '
             f'(comment 2 {q("Generated from " + circuit.name + ".py - do not edit by hand")}))',
             '  (lib_symbols)']
    for idx, (g, su, fname, page) in enumerate(sheets):
        x, y = 30 + (idx % 4) * 90, 40 + (idx // 4) * 50
        name = sheet_titles.get(g, g)
        lines.append(f'  (sheet (at {x} {y}) (size 70 30) (fields_autoplaced) (stroke (width 0.1524) (type solid)) '
                     f'(fill (color 0 0 0 0.0000)) (uuid {su})')
        lines.append(f'    (property "Sheetname" {q(name)} (at {x} {y - 0.7} 0) (effects (font (size 1.27 1.27)) (justify left bottom)))')
        lines.append(f'    (property "Sheetfile" {q(fname)} (at {x} {y + 30.6} 0) (effects (font (size 1.27 1.27)) (justify left top)))')
        lines.append(f'    (instances (project {q(project)} (path {q("/" + root_uuid)} (page {q(str(page))}))))')
        lines.append('  )')
    lines.append('  (sheet_instances (path "/" (page "1")))')
    lines.append(')')
    root = os.path.join(outdir, f"{project}.kicad_sch")
    with open(root, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return root
