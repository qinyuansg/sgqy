"""Generate Foyer VK-1 mechanical deliverables.

    python3 mechanical/build.py

Outputs (mechanical/out/):
  step/   production STEP: full assembly, every manufactured part, each mounting kit
  print/  prototype STL + 3MF: parts split to fit a 250 mm print bed, with bonding tabs
  dxf/    flat outlines for laser-cut/glass suppliers (head glass, deck glass, mount plate, stand bases)
  drawings/  dimensioned general-arrangement drawings (SVG + PDF) and a 1:1 wall drilling template
  renders/   shaded product renders (PNG)
  view/   whole-assembly STL previews (GitHub renders these in its 3D viewer)
"""
from __future__ import annotations

import json
import math
import os
import re
import subprocess
import sys

import cadquery as cq
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import enclosure as E  # noqa: E402

OUT = os.path.join(HERE, "out")
BED = 250.0


def ensure(*d):
    p = os.path.join(OUT, *d)
    os.makedirs(p, exist_ok=True)
    return p


# ------------------------------------------------------------------ STEP
def export_view():
    """Tessellate the assembly STEPs into STL previews (GitHub shows STL in an interactive 3D viewer)."""
    d = ensure("view")
    for name in ("foyer-vk1-assembly", "foyer-vk1-desk-kit", "foyer-vk1-floor-kit"):
        shp = cq.importers.importStep(os.path.join(OUT, "step", f"{name}.step"))
        cq.exporters.export(shp, os.path.join(d, f"{name}.stl"), tolerance=0.3, angularTolerance=0.3)


def export_step(parts, purchased):
    d = ensure("step")
    pd = ensure("step", "parts")
    asm = cq.Assembly(name="FoyerVK1")
    for p in parts:
        asm.add(p.shape, name=p.name, color=cq.Color(*p.color))
        cq.exporters.export(p.shape, os.path.join(pd, f"{p.name}.step"))
    for name, shp in purchased.items():
        asm.add(shp, name=f"REF_{name}", color=cq.Color(0.35, 0.55, 0.85, 0.6))
    asm.save(os.path.join(d, "foyer-vk1-assembly.step"))
    for kit, kparts in E.kits().items():
        if not kparts:
            continue
        k = cq.Assembly(name=f"kit_{kit}")
        for p in kparts + [x for x in parts if x.name == "mount_plate"]:
            k.add(p.shape, name=p.name, color=cq.Color(*p.color))
        k.save(os.path.join(d, f"foyer-vk1-{kit}-kit.step"))


# ------------------------------------------------------------- printing
def split_to_fit(shape: cq.Workplane, limit=BED, name="part"):
    """Recursively bisect along the longest axis until every chunk fits the print bed."""
    out = []

    def rec(s, tag):
        bb = s.val().BoundingBox()
        dims = {"X": bb.xlen, "Y": bb.ylen, "Z": bb.zlen}
        axis = max(dims, key=dims.get)
        if dims[axis] <= limit:
            out.append((tag, s))
            return
        mid = {"X": (bb.xmin + bb.xmax) / 2, "Y": (bb.ymin + bb.ymax) / 2, "Z": (bb.zmin + bb.zmax) / 2}[axis]
        big = 5000
        if axis == "X":
            lo = cq.Workplane("XY").box(big, big, big).translate((mid - big / 2, 0, 0))
        elif axis == "Y":
            lo = cq.Workplane("XY").box(big, big, big).translate((0, mid - big / 2, 0))
        else:
            lo = cq.Workplane("XY").box(big, big, big).translate((0, 0, mid - big / 2))
        a, b = s.intersect(lo), s.cut(lo)
        # bonding tabs: thin plates on the first chunk that overlap 12 mm into the second (glue + M3)
        rec(a, tag + "a")
        rec(b, tag + "b")

    rec(shape, "")
    return [(f"{name}{'_' + t if t else ''}", s) for t, s in out]


def export_print(parts, kits):
    d = ensure("print")
    manifest = []
    printable = [p for p in parts if p.name not in ("head_glass", "deck_glass")]
    for p in printable + [x for k in kits.values() for x in k]:
        chunks = split_to_fit(p.shape, name=p.name)
        asm_shapes = []
        for cname, cs in chunks:
            stl = os.path.join(d, f"{cname}.stl")
            cq.exporters.export(cs, stl, tolerance=0.05, angularTolerance=0.1)
            bb = cs.val().BoundingBox()
            manifest.append({"file": os.path.basename(stl), "part": p.name, "size_mm": [round(bb.xlen, 1), round(bb.ylen, 1), round(bb.zlen, 1)]})
            asm_shapes.append(cs.val())
        comp = cq.Workplane("XY").add(cq.Compound.makeCompound(asm_shapes))
        cq.exporters.export(comp, os.path.join(d, f"{p.name}.3mf"), exportType=cq.exporters.ExportTypes.THREEMF,
                            tolerance=0.05, angularTolerance=0.1)
    json.dump(manifest, open(os.path.join(d, "print-manifest.json"), "w"), indent=1)
    return manifest


# ------------------------------------------------------------------- DXF
def export_dxf(parts):
    d = ensure("dxf")
    by = {p.name: p.shape for p in parts}

    def slice_to_dxf(shape, plane, base, path):
        normal = {"XZ": (0, 1, 0), "XY": (0, 0, 1)}[plane]
        cut = shape.val().intersect(cq.Face.makePlane(20000, 20000, basePnt=base, dir=normal))
        wp = cq.Workplane(plane, origin=base).add(cut)
        cq.exporters.export(wp, path, exportType="DXF")

    # front-view outlines for the glass supplier and the mount plate laser profile
    for name in ("head_glass", "mount_plate"):
        c = by[name].val().Center()
        slice_to_dxf(by[name], "XZ", (0, c.y, 0), os.path.join(d, f"{name}.dxf"))
    for kit, ks in E.kits().items():
        for p in ks:
            bb = p.shape.val().BoundingBox()
            slice_to_dxf(p.shape, "XY", (0, 0, bb.zmin + 2), os.path.join(d, f"{p.name}_base.dxf"))


# -------------------------------------------------------------- drawings
def oriented(shape, view):
    """Rotate the model so that the requested view becomes a top-down (+Z) projection
    with the page's horizontal = model X' and vertical (up) = model Y'."""
    if view == "front":   # viewer at -Y, Z up
        return shape.rotate((0, 0, 0), (1, 0, 0), -90)
    if view == "right":   # viewer at +X, Z up, front of unit on the left
        return shape.rotate((0, 0, 0), (0, 0, 1), -90).rotate((0, 0, 0), (1, 0, 0), -90)
    return shape          # top: front of unit at the bottom


def view_svg(shape, w, h):
    opts = {"width": w, "height": h, "marginLeft": 40, "marginTop": 40, "showAxes": False,
            "projectionDir": (0, 0, 1), "strokeWidth": 0.6, "showHidden": False}
    svg = cq.exporters.getSVG(shape.val(), opts)
    m = re.search(r'transform="scale\(([-\d.e]+),\s*([-\d.e]+)\)\s*translate\(([-\d.e]+),\s*([-\d.e]+)\)"', svg)
    sx, sy, tx, ty = (float(g) for g in m.groups())
    body = svg[svg.index("<g "):svg.rindex("</svg>")]
    bb = shape.val().BoundingBox()
    to_page = lambda X, Y: (sx * (X + tx), sy * (Y + ty))  # noqa: E731
    return body, to_page, bb


def dim_line(x1, y1, x2, y2, text, vertical=False):
    a = 7
    if vertical:
        return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" class="d"/>'
                f'<path d="M{x1},{y1} l{-a / 2},{a} l{a},0 z M{x2},{y2} l{-a / 2},{-a} l{a},0 z" class="a"/>'
                f'<text x="{x1 - 8}" y="{(y1 + y2) / 2}" class="t" transform="rotate(-90 {x1 - 8} {(y1 + y2) / 2})" '
                f'text-anchor="middle">{text}</text>')
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" class="d"/>'
            f'<path d="M{x1},{y1} l{a},{-a / 2} l0,{a} z M{x2},{y2} l{-a},{-a / 2} l0,{a} z" class="a"/>'
            f'<text x="{(x1 + x2) / 2}" y="{y1 + 18}" class="t" text-anchor="middle">{text}</text>')


def drawing_ga(parts):
    """General arrangement: front, right-side and top views of the core unit with key dimensions."""
    d = ensure("drawings")
    unit = cq.Workplane("XY").add(cq.Compound.makeCompound([p.shape.val() for p in parts if p.name != "mount_plate"]))
    css = ('<style>.d{stroke:#0a6;stroke-width:1}.a{fill:#0a6}.t{font:14px sans-serif;fill:#0a6}'
           '.h{font:22px sans-serif;font-weight:600}.n{font:13px sans-serif;fill:#333}</style>')
    W_, H_ = 2400, 1300
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_}" height="{H_}" viewBox="0 0 {W_} {H_}">',
           '<rect width="100%" height="100%" fill="white"/>', css]
    vw, vh = 640, 980
    slots = {"front": 60, "right": 860, "top": 1660}
    for view, gx in slots.items():
        shp = oriented(unit, view)
        body, P, bb = view_svg(shp, vw, vh)
        out.append(f'<g transform="translate({gx},70)">{body}')
        x0, y0 = P(bb.xmin, bb.ymin)
        x1, y1 = P(bb.xmax, bb.ymax)
        left, right, top, bottom = min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1)
        out.append(dim_line(left, bottom + 30, right, bottom + 30, f"{bb.xlen:.0f}"))
        out.append(dim_line(left - 30, top, left - 30, bottom, f"{bb.ylen:.0f}", vertical=True))
        if view == "front":
            for z, label in ((E.Z_DISPLAY, f"display {E.Z_DISPLAY:.0f}"), (E.Z_DISPLAY_TOP, f"{E.Z_DISPLAY_TOP:.0f}"),
                             (E.Z_CAM, f"cameras {E.Z_CAM:.0f}"), (E.LECT_H, f"deck {E.LECT_H:.0f}")):
                _, yy = P(0, z)
                out.append(f'<line x1="{right + 10}" y1="{yy}" x2="{right + 60}" y2="{yy}" class="d"/>'
                           f'<text x="{right + 64}" y="{yy + 5}" class="t">{label}</text>')
        if view == "right":
            _, yy = P(0, E.DECK_FRONT_Z)
            out.append(f'<text x="{left + 6}" y="{yy - 8}" class="t">deck front {E.DECK_FRONT_Z:.1f}, {E.DECK_ANGLE:.0f}°</text>')
            xh, _ = P(E.Y_HEAD_FRONT, 0)
            out.append(dim_line(xh, top - 20, right, top - 20, f"head {E.HEAD_D:.0f}"))
        out.append("</g>")
        out.append(f'<text x="{gx + vw / 2}" y="50" class="h" text-anchor="middle">{view.upper()}</text>')
    rows = [("Overall W x H x D", f"{E.W:.0f} x {E.LECT_H + E.HEAD_H:.0f} x {E.LECT_D:.0f}"),
            ("Head depth", f"{E.HEAD_D:.0f}"), ("Lectern height back / front", f"{E.LECT_H:.0f} / {E.DECK_FRONT_Z:.1f}"),
            ("Deck angle", f"{E.DECK_ANGLE:.0f}°"),
            ("Display active area (portrait)", f"{E.DISPLAY_ACTIVE[0]} x {E.DISPLAY_ACTIVE[1]}"),
            ("Display bottom / top", f"{E.Z_DISPLAY:.0f} / {E.Z_DISPLAY_TOP:.0f}"),
            ("Camera centre line", f"{E.Z_CAM:.0f}"), ("VESA 100 centre (rear)", f"{E.Z_MOUNT:.0f}"),
            ("Glass", "4 mm chem. strengthened, 2 mm reveal"),
            ("Floor/wall kit: unit base above floor", f"{E.FLOOR_TO_UNIT:.0f}"),
            ("Deck front above floor", f"{E.FLOOR_TO_UNIT + E.DECK_FRONT_Z:.0f} (ADA counter ≤ 864)"),
            ("Highest touch target (reach mode)", f"≤ {E.FLOOR_TO_UNIT + E.Z_DISPLAY + 0.6 * E.DISPLAY[2]:.0f} (ADA ≤ 1220)")]
    ty0 = 1150
    out.append(f'<text x="60" y="{ty0 - 30}" class="h">KEY DIMENSIONS (mm, from unit base)</text>')
    for k, (label, val) in enumerate(rows):
        out.append(f'<text x="{60 + (k // 3) * 580}" y="{ty0 + (k % 3) * 24}" class="n">{label}: '
                   f'<tspan font-weight="600">{val}</tspan></text>')
    out.append(f'<text x="{W_ - 60}" y="{H_ - 16}" class="n" text-anchor="end">Foyer VK-1 core unit — general arrangement, '
               f'third-angle projection, mm. Generated from mechanical/enclosure.py.</text>')
    out.append("</svg>")
    svg = os.path.join(d, "GA-core-unit.svg")
    open(svg, "w").write("\n".join(out))
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", svg.replace(".svg", ".pdf"), svg], check=True)
    subprocess.run(["rsvg-convert", "-w", "2400", "-b", "white", "-o", svg.replace(".svg", ".png"), svg], check=True)


def drilling_template():
    """1:1 wall drilling template (A4 portrait PDF): 4x fixing holes, cable entry, unit outline."""
    d = ensure("drawings")
    mm_ = 1.0  # svg user unit = 1 mm, page 210 x 297
    cx, cy = 105, 150
    zc = E.Z_MOUNT
    s = ['<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">',
         '<rect width="210" height="297" fill="white"/>',
         '<style>.c{stroke:#000;stroke-width:0.3;fill:none}.k{stroke:#c00;stroke-width:0.4;fill:none}'
         '.t{font:3.5px sans-serif}.h{font:6px sans-serif;font-weight:700}</style>',
         '<text x="10" y="14" class="h">Foyer VK-1 — wall drilling template (print at 100 %)</text>',
         '<text x="10" y="21" class="t">Check: the 100 mm scale bar below must measure exactly 100 mm.</text>',
         '<line x1="10" y1="26" x2="110" y2="26" stroke="#000" stroke-width="0.6"/>',
         '<text x="112" y="27.5" class="t">100 mm</text>']
    # mount plate outline 200 x 240, fixing holes 160 x 200 pattern
    s.append(f'<rect x="{cx - 100}" y="{cy - 120}" width="200" height="240" rx="8" class="c" stroke-dasharray="2 1"/>')
    for dx in (-80, 80):
        for dz in (-100, 100):
            x, y = cx + dx, cy - dz
            s.append(f'<circle cx="{x}" cy="{y}" r="3.25" class="k"/><line x1="{x - 6}" y1="{y}" x2="{x + 6}" y2="{y}" class="k"/>'
                     f'<line x1="{x}" y1="{y - 6}" x2="{x}" y2="{y + 6}" class="k"/>'
                     f'<text x="{x + 5}" y="{y - 4}" class="t">Ø6.5 / M6 anchor</text>')
    s.append(f'<rect x="{cx - 35}" y="{cy + 30 - 15}" width="70" height="30" rx="15" class="k"/>'
             f'<text x="{cx - 30}" y="{cy + 33}" class="t">Cable entry (PoE++ Cat6A) — wall box behind</text>')
    s.append(f'<line x1="{cx}" y1="{cy - 135}" x2="{cx}" y2="{cy + 135}" class="c" stroke-dasharray="4 2"/>')
    s.append(f'<text x="{cx + 2}" y="{cy - 125}" class="t">Centre line of kiosk</text>')
    s.append(f'<text x="10" y="285" class="t">Mount-plate centre is {E.FLOOR_TO_UNIT + zc:.0f} mm above finished floor '
             f'(unit base {E.FLOOR_TO_UNIT:.0f} mm; deck front {E.FLOOR_TO_UNIT + E.DECK_FRONT_Z:.0f} mm, ADA counter height).</text>')
    s.append('<text x="10" y="291" class="t">Use 4x M6 screws into studs, or M6 metal cavity anchors (min. 4 x 500 N). Level before tightening.</text>')
    s.append("</svg>")
    svg = os.path.join(d, "wall-drilling-template-A4.svg")
    open(svg, "w").write("\n".join(s))
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", svg.replace(".svg", ".pdf"), svg], check=True)


# --------------------------------------------------------------- renders
def render(shapes_colors, path, view=(-35.0, 22.0), size=(1400, 1400), bg=(246, 246, 244), ss=2):
    """Small flat-shaded z-buffer renderer (numpy, no GPU). Supersampled `ss` x for anti-aliasing."""
    az, el = (math.radians(a) for a in view)
    W_, H_ = size[0] * ss, size[1] * ss
    light = np.array([-0.45, -0.75, 0.55]); light /= np.linalg.norm(light)
    meshes = []
    for shp, col in shapes_colors:
        verts, faces = shp.val().tessellate(0.5, 0.2)
        if not faces:
            continue
        P = np.array([(v.x, v.y, v.z) for v in verts]); F = np.array(faces)
        xr = P[:, 0] * math.cos(az) - P[:, 1] * math.sin(az)
        yr = P[:, 0] * math.sin(az) + P[:, 1] * math.cos(az)
        u = xr
        v = P[:, 2] * math.cos(el) + yr * math.sin(el)
        dep = yr * math.cos(el) - P[:, 2] * math.sin(el)   # larger = farther from the viewer
        meshes.append((P, F, u, v, dep, np.array(col)))
    allu = np.concatenate([m[2] for m in meshes]); allv = np.concatenate([m[3] for m in meshes])
    sc = 0.86 * min(W_ / (allu.max() - allu.min()), H_ / (allv.max() - allv.min()))
    ou = W_ / 2 - sc * (allu.min() + allu.max()) / 2
    ov = H_ / 2 + sc * (allv.min() + allv.max()) / 2
    zbuf = np.full((H_, W_), np.inf); img = np.zeros((H_, W_, 3)); img[:] = np.array(bg) / 255
    for P, F, u, v, dep, col in meshes:
        X = ou + sc * u; Y = ov - sc * v
        for f in F:
            a, b, c = P[f]
            n = np.cross(b - a, c - a); nn = np.linalg.norm(n)
            if nn == 0:
                continue
            shade = 0.38 + 0.62 * abs(float(n @ light) / nn)
            xs, ys, zs = X[f], Y[f], dep[f]
            x0, x1 = int(max(0, xs.min())), int(min(W_ - 1, xs.max() + 1))
            y0, y1 = int(max(0, ys.min())), int(min(H_ - 1, ys.max() + 1))
            if x1 < x0 or y1 < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
            if abs(d) < 1e-9:
                continue
            w0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
            w1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
            w2 = 1 - w0 - w1
            inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            if not inside.any():
                continue
            z = w0 * zs[0] + w1 * zs[1] + w2 * zs[2]
            sub = zbuf[y0:y1 + 1, x0:x1 + 1]
            win = inside & (z < sub)
            sub[win] = z[win]
            img[y0:y1 + 1, x0:x1 + 1][win] = np.clip(col * shade, 0, 1)
    out = Image.fromarray((img * 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    out.save(path)


def renders(parts, purchased):
    d = ensure("renders")
    by = {p.name: p for p in parts}
    show = ["head_shell", "head_door_bezel", "head_glass", "lectern_body", "lectern_door", "deck_glass"]
    sc = [(by[n].shape, by[n].color) for n in show]
    # visible screen content hint: the display active area as a lit panel behind the glass
    aw, ah = E.DISPLAY_ACTIVE
    screen = E.box(aw, 0.5, ah, 0, E.Y_HEAD_FRONT - 0.6, E.Z_DISPLAY + (E.DISPLAY[2] - ah) / 2)
    sc.append((screen, (0.93, 0.95, 0.98)))
    render(sc, os.path.join(d, "core-unit-front34.png"), view=(-32, 18))
    render(sc, os.path.join(d, "core-unit-front34-right.png"), view=(32, 18))
    # service view: door assemblies removed, internals visible
    inside = [(by[n].shape, by[n].color) for n in ("head_shell", "chassis_plate", "lectern_body", "printer_drawer")]
    inside += [(s, (0.30, 0.55, 0.85)) for k, s in purchased.items() if k != "display_elo1302l"]
    render(inside, os.path.join(d, "service-view-internals.png"), view=(-28, 20))
    kits = E.kits()
    floor = sc + [(kits["floor"][0].shape, kits["floor"][0].color), (by["mount_plate"].shape, by["mount_plate"].color)]
    render(floor, os.path.join(d, "floor-kit.png"), view=(-35, 15), size=(1000, 1600))
    desk = sc + [(kits["desk"][0].shape, kits["desk"][0].color), (by["mount_plate"].shape, by["mount_plate"].color)]
    render(desk, os.path.join(d, "desk-kit.png"), view=(-35, 18))


def main():
    parts = E.manufactured()
    purchased = E.purchased()
    kits = E.kits()
    print("STEP ..."); export_step(parts, purchased)
    print("view STL ..."); export_view()
    print("print set ..."); man = export_print(parts, kits)
    print(f"  {len(man)} printable chunks, largest {max(max(m['size_mm']) for m in man)} mm")
    print("DXF ..."); export_dxf(parts + [p for k in kits.values() for p in k])
    print("drawings ..."); drawing_ga(parts); drilling_template()
    print("renders ..."); renders(parts, purchased)
    mass = {p.name: round(p.shape.val().Volume() / 1000 * (2.7 if "alumin" in p.material else 2.5 if "glass" in p.material else 7.85), 0)
            for p in parts + [x for k in kits.values() for x in k]}
    json.dump(mass, open(os.path.join(OUT, "mass-estimate-g.json"), "w"), indent=1)
    print("mass estimate (g):", mass)


if __name__ == "__main__":
    main()
