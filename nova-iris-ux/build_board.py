#!/usr/bin/env python3
"""
NOVA+ Iris Reader · Liquid Glass redesign board  ->  Figma-importable SVG

    python3 nova-iris-ux/build_board.py

Writes nova-iris-ux/NOVA-Iris-Reader-LiquidGlass.svg. Drag it onto a Figma
canvas (or File > Import). Every layer is a named vector group, text stays
editable (Inter, Figma's built-in face; ship in SF Pro), and the glass effects
use the same filter chains Figma itself exports, so they come back as native
Drop shadow / Inner shadow / Layer blur effects. No scale transforms, no
foreignObject, no raster images.
"""

import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "NOVA-Iris-Reader-LiquidGlass.svg")

# ── Text metrics (Inter via fontTools; falls back to an estimate) ────────────
FONT_DIR = "/usr/share/fonts/opentype/inter"
_STYLE = {300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold"}
_metric_cache = {}
MISSING = set()


def _metrics(weight, italic):
    key = (weight, italic)
    if key not in _metric_cache:
        try:
            from fontTools.ttLib import TTFont

            style = _STYLE[weight]
            if italic:
                style = "Italic" if style == "Regular" else style + "Italic"
            f = TTFont(os.path.join(FONT_DIR, f"Inter-{style}.otf"))
            _metric_cache[key] = (f.getBestCmap(), f["hmtx"].metrics, f["head"].unitsPerEm)
        except Exception:
            _metric_cache[key] = None
    return _metric_cache[key]


def tw(s, size, weight=400, ls=0.0, italic=False):
    """Advance width of a single line of text in px."""
    m = _metrics(weight, italic)
    if m is None:
        return len(s) * size * 0.56 + (ls or 0) * len(s)
    cmap, hmtx, upm = m
    units = 0
    for ch in s:
        g = cmap.get(ord(ch))
        if g is None:
            MISSING.add(ch)
            g = cmap[ord("?")]
        units += hmtx[g][0]
    return units * size / upm + (ls or 0) * len(s)


def wrap(s, size, weight, max_w, ls=0, italic=False):
    lines = []
    for para in s.split("\n"):
        cur = ""
        for word in para.split(" "):
            trial = f"{cur} {word}" if cur else word
            if cur and tw(trial, size, weight, ls, italic) > max_w:
                lines.append(cur)
                cur = word
            else:
                cur = trial
        lines.append(cur)
    return lines


# ── SVG document ─────────────────────────────────────────────────────────────
def num(v):
    if isinstance(v, float):
        s = f"{v:.2f}".rstrip("0").rstrip(".")
        return "0" if s in ("-0", "") else s
    return str(v)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def attrs(**kw):
    out = []
    for k, v in kw.items():
        if v is None or v is False:
            continue
        out.append(f'{k.rstrip("_").replace("_", "-")}="{num(v)}"')
    return " ".join(out)


class Doc:
    def __init__(self, w):
        self.w, self.h = w, 0
        self.defs, self.body = [], []
        self.n = 0
        self.names = set()
        self.cache = {}

    def uid(self, prefix):
        self.n += 1
        return f"{prefix}{self.n}"

    def name(self, s):
        base, i = s, 2
        while s in self.names:
            s, i = f"{base} {i}", i + 1
        self.names.add(s)
        return esc(s)

    def add(self, s):
        self.body.append(s)

    def define(self, s):
        self.defs.append(s)

    def open(self, name=None, **kw):
        nm = f' id="{self.name(name)}"' if name else ""
        a = attrs(**kw)
        self.add(f"<g{nm}{' ' + a if a else ''}>")

    def close(self):
        self.add("</g>")

    def placeholder(self):
        self.body.append("")
        return len(self.body) - 1

    def render(self):
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{num(self.h)}" '
            f'viewBox="0 0 {self.w} {num(self.h)}" fill="none">\n'
            + "\n".join(self.body)
            + "\n<defs>\n"
            + "\n".join(self.defs)
            + "\n</defs>\n</svg>\n"
        )


def el(doc, tag, name=None, **kw):
    nm = f'id="{doc.name(name)}" ' if name else ""
    doc.add(f"<{tag} {nm}{attrs(**kw)}/>")


def _stops(stops):
    out = []
    for o, c, a in stops:
        op = "" if a == 1 else f' stop-opacity="{num(float(a))}"'
        out.append(f'<stop offset="{num(float(o))}" stop-color="{c}"{op}/>')
    return "".join(out)


def lg(doc, stops, x1=0, y1=0, x2=0, y2=1, user=False):
    key = ("lg", tuple(stops), x1, y1, x2, y2, user)
    if key not in doc.cache:
        gid = doc.uid("lg")
        units = ' gradientUnits="userSpaceOnUse"' if user else ""
        doc.define(
            f'<linearGradient id="{gid}" x1="{num(x1)}" y1="{num(y1)}" x2="{num(x2)}" y2="{num(y2)}"{units}>'
            f"{_stops(stops)}</linearGradient>"
        )
        doc.cache[key] = f"url(#{gid})"
    return doc.cache[key]


def rg(doc, stops, cx=0.5, cy=0.5, r=0.5, user=False):
    key = ("rg", tuple(stops), cx, cy, r, user)
    if key not in doc.cache:
        gid = doc.uid("rg")
        units = ' gradientUnits="userSpaceOnUse"' if user else ""
        doc.define(
            f'<radialGradient id="{gid}" cx="{num(cx)}" cy="{num(cy)}" r="{num(r)}"{units}>'
            f"{_stops(stops)}</radialGradient>"
        )
        doc.cache[key] = f"url(#{gid})"
    return doc.cache[key]


def _cm(col, a):
    r, g, b = (int(col[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return f"0 0 0 0 {num(r)} 0 0 0 0 {num(g)} 0 0 0 0 {num(b)} 0 0 0 {num(float(a))} 0"


_HARD = ('<feColorMatrix in="SourceAlpha" type="matrix" '
         'values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>')


def fx(doc, box, drop=None, inner=(), blur=None):
    """Figma-style effect chain: drop shadow (not behind fill), inner shadows, layer blur."""
    x, y, w, h = box
    pad = 4
    if drop:
        dx, dy, std, _, _ = drop
        pad = max(pad, abs(dx) + abs(dy) + std * 3)
    if blur:
        pad = max(pad, blur * 3)
    fid = doc.uid("fx")
    p = [f'<filter id="{fid}" x="{num(x - pad)}" y="{num(y - pad)}" width="{num(w + 2 * pad)}" '
         f'height="{num(h + 2 * pad)}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">',
         '<feFlood flood-opacity="0" result="BackgroundImageFix"/>']
    if drop:
        dx, dy, std, col, a = drop
        p += [_HARD, f'<feOffset dx="{num(dx)}" dy="{num(dy)}"/>', f'<feGaussianBlur stdDeviation="{num(std)}"/>',
              '<feComposite in2="hardAlpha" operator="out"/>',
              f'<feColorMatrix type="matrix" values="{_cm(col, a)}"/>',
              '<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>',
              '<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>']
    else:
        p.append('<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>')
    prev = "shape"
    for i, (dx, dy, std, col, a) in enumerate(inner):
        res = f"effect{i + 2}_innerShadow"
        p += [_HARD, f'<feOffset dx="{num(dx)}" dy="{num(dy)}"/>', f'<feGaussianBlur stdDeviation="{num(std)}"/>',
              '<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>',
              f'<feColorMatrix type="matrix" values="{_cm(col, a)}"/>',
              f'<feBlend mode="normal" in2="{prev}" result="{res}"/>']
        prev = res
    if blur:
        p.append(f'<feGaussianBlur stdDeviation="{num(blur)}" result="effect1_foregroundBlur"/>')
    p.append("</filter>")
    doc.define("".join(p))
    return f"url(#{fid})"


def clip_rect(doc, x, y, w, h, r):
    cid = doc.uid("clip")
    doc.define(f'<clipPath id="{cid}"><rect x="{num(x)}" y="{num(y)}" width="{num(w)}" height="{num(h)}" rx="{num(r)}"/></clipPath>')
    return f"url(#{cid})"


def clip_circle(doc, cx, cy, r):
    cid = doc.uid("clip")
    doc.define(f'<clipPath id="{cid}"><circle cx="{num(cx)}" cy="{num(cy)}" r="{num(r)}"/></clipPath>')
    return f"url(#{cid})"


# ── Type ─────────────────────────────────────────────────────────────────────
FF = "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def T(doc, x, y, s, size, weight=400, fill="#FFFFFF", anchor=None, ls=None, op=None, italic=False, name=None):
    nm = f'id="{doc.name(name)}" ' if name else ""
    a = attrs(x=x, y=y, font_family=FF, font_size=size, font_weight=weight,
              font_style="italic" if italic else None, fill=fill, fill_opacity=op,
              letter_spacing=ls, text_anchor=anchor)
    doc.add(f"<text {nm}{a}>{esc(s)}</text>")


def P(doc, x, y, s, size, weight=400, fill="#FFFFFF", max_w=600, lh=None, anchor=None, ls=None, op=None,
      italic=False, name=None):
    """Wrapped paragraph; returns the baseline of the last line."""
    lh = lh or round(size * 1.42)
    lines = wrap(s, size, weight, max_w, ls or 0, italic)
    spans = "".join(f'<tspan x="{num(x)}" y="{num(y + i * lh)}">{esc(t)}</tspan>' for i, t in enumerate(lines))
    nm = f'id="{doc.name(name)}" ' if name else ""
    a = attrs(font_family=FF, font_size=size, font_weight=weight, font_style="italic" if italic else None,
              fill=fill, fill_opacity=op, letter_spacing=ls, text_anchor=anchor)
    doc.add(f"<text {nm}{a}>{spans}</text>")
    return y + (len(lines) - 1) * lh


def RT(doc, x, y, runs, size, anchor=None, ls=None):
    """One line of mixed-style runs: (text, weight, fill, opacity)."""
    spans = "".join(f'<tspan {attrs(font_weight=w, fill=c, fill_opacity=o)}>{esc(t)}</tspan>' for t, w, c, o in runs)
    doc.add(f"<text {attrs(x=x, y=y, font_family=FF, font_size=size, letter_spacing=ls, text_anchor=anchor)}>{spans}</text>")


# ── Palette ──────────────────────────────────────────────────────────────────
BG = "#09090B"
INK, INK2, INK3 = "#F5F5F7", "#A1A1A6", "#6E6E73"
HAIR = "#26262B"
CARD = "#121215"
WHITE = "#FFFFFF"
AMBER, CYAN, GREEN, RED = "#FFB340", "#64D2FF", "#30D158", "#FF453A"
BLUE, INDIGO, TEAL = "#0A84FF", "#5E5CE6", "#1BA9A0"
NV = "#76B900"
INK_ON_GLASS = "#0B1626"
LENS = {"JOBS": ("#E5E5EA", "#1C1C1E"), "MUSK": ("#FF453A", "#FFFFFF"), "HUANG": ("#76B900", "#0B1200")}
LENS_NAME = {"JOBS": "Jobs lens", "MUSK": "Musk lens", "HUANG": "Huang lens"}
MOMENT = {"READY": "#B4B9FF", "FIND": AMBER, "LOOK": CYAN, "ENTER": GREEN, "ALERT": RED}

W = 3240
M = 160
CW = W - 2 * M

# Screen wallpapers: base gradient + soft aurora blobs (cx, cy, rx, ry, colour, alpha) in 416x666 space
MOODS = {
    "neutral": dict(top="#0B1326", bot="#05070C", blobs=[
        (40, 120, 300, 260, INDIGO, 0.55), (400, 540, 320, 280, "#159E95", 0.45),
        (340, 20, 220, 160, "#9F6BFF", 0.25), (110, 650, 230, 150, "#2D6BFF", 0.25)]),
    "guide": dict(top="#0D1222", bot="#05060A", blobs=[
        (40, 110, 290, 250, INDIGO, 0.48), (208, 520, 280, 210, "#FF9F0A", 0.30),
        (410, 640, 260, 200, "#159E95", 0.30), (350, 30, 200, 150, "#9F6BFF", 0.20)]),
    "look": dict(top="#0B1528", bot="#04070C", blobs=[
        (208, -20, 280, 190, "#DDEBFF", 0.50), (20, 300, 260, 260, INDIGO, 0.45),
        (410, 610, 320, 260, "#159E95", 0.40), (120, 660, 220, 140, "#2D6BFF", 0.22)]),
    "scan": dict(top="#06141F", bot="#03080C", blobs=[
        (208, 356, 240, 240, CYAN, 0.30), (20, 130, 260, 220, INDIGO, 0.40),
        (410, 620, 320, 260, "#159E95", 0.42), (360, 20, 200, 150, "#9F6BFF", 0.18)]),
    "success": dict(top="#03140B", bot="#020704", blobs=[
        (208, 300, 340, 340, GREEN, 0.50), (20, 60, 240, 200, "#159E95", 0.38),
        (410, 650, 300, 220, "#9BE15D", 0.22)]),
    "alert": dict(top="#170709", bot="#060203", blobs=[
        (208, 300, 320, 320, RED, 0.40), (20, 60, 240, 200, INDIGO, 0.25),
        (410, 650, 300, 220, "#FF375F", 0.22)]),
    "wait": dict(top="#171006", bot="#060402", blobs=[
        (208, 300, 320, 320, "#FF9F0A", 0.36), (20, 60, 240, 200, INDIGO, 0.25),
        (410, 650, 300, 220, AMBER, 0.18)]),
}

# ── Liquid Glass primitives ──────────────────────────────────────────────────
RIM = [(0, WHITE, 0.85), (0.28, WHITE, 0.18), (0.62, WHITE, 0.05), (1, WHITE, 0.38)]
EDGE = [(0, WHITE, 0.0), (0.55, WHITE, 0.0), (1, WHITE, 0.32)]
FILL = {
    "regular": [(0, WHITE, 0.22), (1, WHITE, 0.07)],
    "bright": [(0, WHITE, 0.92), (1, WHITE, 0.72)],
    "clear": [(0, WHITE, 0.10), (1, WHITE, 0.025)],
}
GLASS_INNER = [(0, 1.5, 0.8, WHITE, 0.65), (0, -5, 5, WHITE, 0.14)]


def glass_fill(doc, kind, tint):
    if tint:
        return lg(doc, [(0, tint, 0.52), (1, tint, 0.22)])
    return lg(doc, FILL[kind])


def _glass(doc, tag, geom, box, kind, tint, shadow, glow, name, rim_w, edge):
    if glow:
        col, a, std = glow
        el(doc, tag, **geom, fill=col, fill_opacity=a, filter=fx(doc, box, blur=std))
    el(doc, tag, name=name, **geom, fill=glass_fill(doc, kind, tint), stroke=lg(doc, RIM, 0, 0, 1, 1),
       stroke_width=rim_w, filter=fx(doc, box, drop=shadow, inner=GLASS_INNER))
    if edge:  # second, inset caustic edge = optical thickness
        x, y, w, h = box
        if tag == "circle":
            el(doc, "circle", cx=geom["cx"], cy=geom["cy"], r=geom["r"] - 5, stroke=lg(doc, EDGE, 0, 0, 1, 1),
               stroke_width=1.5)
        else:
            r = max(0, geom["rx"] - 4)
            el(doc, "rect", x=x + 4, y=y + 4, width=w - 8, height=h - 8, rx=r, stroke=lg(doc, EDGE, 0, 0, 1, 1),
               stroke_width=1.2)


def glass_rect(doc, x, y, w, h, r, kind="regular", tint=None, shadow=(0, 10, 16, "#000000", 0.32), glow=None,
               name=None, rim_w=1.25, edge=False):
    _glass(doc, "rect", dict(x=x, y=y, width=w, height=h, rx=r), (x, y, w, h), kind, tint, shadow, glow, name,
           rim_w, edge)


def glass_circle(doc, cx, cy, r, kind="regular", tint=None, shadow=(0, 12, 20, "#000000", 0.35), glow=None,
                 name=None, rim_w=1.5, edge=False):
    _glass(doc, "circle", dict(cx=cx, cy=cy, r=r), (cx - r, cy - r, 2 * r, 2 * r), kind, tint, shadow, glow,
           name, rim_w, edge)


def arc_d(cx, cy, r, a0, a1):
    """Clockwise arc from a0 to a1 (degrees, 0 = 3 o'clock)."""
    sweep = (a1 - a0) % 360
    if sweep == 0:
        sweep = 359.99
    a1 = a0 + sweep
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    return f"M{num(x0)} {num(y0)}A{num(r)} {num(r)} 0 {1 if sweep > 180 else 0} 1 {num(x1)} {num(y1)}"


def ticks(doc, cx, cy, r1, r2, n, lit, lit_col, base_a=0.16, lit_a=1.0, glow=True, sw=2.6, name="Tick ring"):
    on, off = [], []
    for i in range(n):
        a = math.radians(-90 + 360 * i / n)
        c, s = math.cos(a), math.sin(a)
        seg = f"M{num(cx + r1 * c)} {num(cy + r1 * s)}L{num(cx + r2 * c)} {num(cy + r2 * s)}"
        (on if i < round(lit * n) else off).append(seg)
    doc.open(name=name)
    if off:
        el(doc, "path", d="".join(off), stroke=WHITE, stroke_opacity=base_a, stroke_width=sw, stroke_linecap="round")
    if on:
        d = "".join(on)
        if glow:
            el(doc, "path", d=d, stroke=lit_col, stroke_opacity=0.65, stroke_width=sw + 3, stroke_linecap="round",
               filter=fx(doc, (cx - r2, cy - r2, 2 * r2, 2 * r2), blur=4))
        el(doc, "path", d=d, stroke=lit_col, stroke_opacity=lit_a, stroke_width=sw, stroke_linecap="round")
    doc.close()


# ── Glyphs (SF Symbols–style, drawn on a 24-unit grid) ───────────────────────
def _k(cx, cy, s):
    k = s / 24
    return k, (lambda v: cx + (v - 12) * k), (lambda v: cy + (v - 12) * k)


def g_iris(doc, cx, cy, s, col=WHITE, op=1, **_):
    r = s / 2
    el(doc, "circle", cx=cx, cy=cy, r=r - 0.8, stroke=col, stroke_opacity=op, stroke_width=max(1.4, s / 12))
    el(doc, "circle", cx=cx, cy=cy, r=r * 0.32, fill=col, fill_opacity=op)
    d = ""
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        d += (f"M{num(cx + r * 0.5 * math.cos(a))} {num(cy + r * 0.5 * math.sin(a))}"
              f"L{num(cx + r * 0.72 * math.cos(a))} {num(cy + r * 0.72 * math.sin(a))}")
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=max(1.1, s / 16), stroke_linecap="round")


def g_check(doc, cx, cy, s, col=WHITE, op=1, sw=None, **_):
    k, X, Y = _k(cx, cy, s)
    d = f"M{num(X(5))} {num(Y(12.5))}L{num(X(10))} {num(Y(17.5))}L{num(X(19.5))} {num(Y(7))}"
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=sw or 2.4 * k, stroke_linecap="round",
       stroke_linejoin="round")


def g_lock(doc, cx, cy, s, col=WHITE, op=1, open_=False, **_):
    k, X, Y = _k(cx, cy, s)
    sw = 2.1 * k
    if open_:
        el(doc, "rect", x=X(3), y=Y(11), width=13 * k, height=10 * k, rx=2.6 * k, fill=col, fill_opacity=op)
        d = f"M{num(X(12.5))} {num(Y(11))}V{num(Y(7))}A{num(3.9 * k)} {num(3.9 * k)} 0 0 1 {num(X(20.3))} {num(Y(7))}V{num(Y(9))}"
    else:
        el(doc, "rect", x=X(5), y=Y(11), width=14 * k, height=10 * k, rx=2.6 * k, fill=col, fill_opacity=op)
        d = f"M{num(X(8))} {num(Y(11))}V{num(Y(7.6))}A{num(4 * k)} {num(4 * k)} 0 0 1 {num(X(16))} {num(Y(7.6))}V{num(Y(11))}"
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=sw, stroke_linecap="round")


def g_lock_open(doc, cx, cy, s, col=WHITE, op=1, **_):
    g_lock(doc, cx, cy, s, col, op, open_=True)


def g_hourglass(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    d = (f"M{num(X(6.5))} {num(Y(3.5))}H{num(X(17.5))}M{num(X(6.5))} {num(Y(20.5))}H{num(X(17.5))}"
         f"M{num(X(8))} {num(Y(3.5))}C{num(X(8))} {num(Y(8.5))} {num(X(12))} {num(Y(10))} {num(X(12))} {num(Y(12))}"
         f"C{num(X(12))} {num(Y(14))} {num(X(8))} {num(Y(15.5))} {num(X(8))} {num(Y(20.5))}"
         f"M{num(X(16))} {num(Y(3.5))}C{num(X(16))} {num(Y(8.5))} {num(X(12))} {num(Y(10))} {num(X(12))} {num(Y(12))}"
         f"C{num(X(12))} {num(Y(14))} {num(X(16))} {num(Y(15.5))} {num(X(16))} {num(Y(20.5))}")
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=1.8 * k, stroke_linecap="round",
       stroke_linejoin="round")


def g_chev_up(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    el(doc, "path", d=f"M{num(X(5))} {num(Y(15.5))}L{num(X(12))} {num(Y(8.5))}L{num(X(19))} {num(Y(15.5))}",
       stroke=col, stroke_opacity=op, stroke_width=2.4 * k, stroke_linecap="round", stroke_linejoin="round")


def g_chev_right(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    el(doc, "path", d=f"M{num(X(8.5))} {num(Y(5))}L{num(X(15.5))} {num(Y(12))}L{num(X(8.5))} {num(Y(19))}",
       stroke=col, stroke_opacity=op, stroke_width=2.4 * k, stroke_linecap="round", stroke_linejoin="round")


def g_arrow_down(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    d = f"M{num(X(12))} {num(Y(4))}V{num(Y(19.5))}M{num(X(6))} {num(Y(13.5))}L{num(X(12))} {num(Y(19.5))}L{num(X(18))} {num(Y(13.5))}"
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=2.2 * k, stroke_linecap="round",
       stroke_linejoin="round")


def g_person(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    el(doc, "circle", cx=X(12), cy=Y(7.6), r=3.7 * k, stroke=col, stroke_opacity=op, stroke_width=2 * k)
    d = (f"M{num(X(4.5))} {num(Y(20.5))}C{num(X(4.5))} {num(Y(15.8))} {num(X(7.9))} {num(Y(13.6))} {num(X(12))} {num(Y(13.6))}"
         f"C{num(X(16.1))} {num(Y(13.6))} {num(X(19.5))} {num(Y(15.8))} {num(X(19.5))} {num(Y(20.5))}")
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=2 * k, stroke_linecap="round")


def g_eye(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    d = (f"M{num(X(2))} {num(Y(12))}C{num(X(5))} {num(Y(6.5))} {num(X(8.5))} {num(Y(4.8))} {num(X(12))} {num(Y(4.8))}"
         f"C{num(X(15.5))} {num(Y(4.8))} {num(X(19))} {num(Y(6.5))} {num(X(22))} {num(Y(12))}"
         f"C{num(X(19))} {num(Y(17.5))} {num(X(15.5))} {num(Y(19.2))} {num(X(12))} {num(Y(19.2))}"
         f"C{num(X(8.5))} {num(Y(19.2))} {num(X(5))} {num(Y(17.5))} {num(X(2))} {num(Y(12))}Z")
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=1.9 * k, stroke_linejoin="round")
    el(doc, "circle", cx=cx, cy=cy, r=3.6 * k, stroke=col, stroke_opacity=op, stroke_width=1.9 * k)
    el(doc, "circle", cx=cx, cy=cy, r=1.3 * k, fill=col, fill_opacity=op)


def g_finger(doc, cx, cy, s, col=WHITE, op=1, **_):
    k, X, Y = _k(cx, cy, s)
    d = ""
    for r, l1, l2 in ((2.2, 6.5, 3.0), (4.8, 4.5, 7.0), (7.4, 6.5, 5.0), (10.0, 1.5, 3.5)):
        d += (f"M{num(X(12 - r))} {num(Y(12.5 + l1))}V{num(Y(12.5))}"
              f"A{num(r * k)} {num(r * k)} 0 0 1 {num(X(12 + r))} {num(Y(12.5))}V{num(Y(12.5 + l2))}")
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=1.6 * k, stroke_linecap="round")


def g_progress(doc, cx, cy, s, col=CYAN, op=1, frac=0.72, **_):
    r = s / 2 - 1.5
    el(doc, "circle", cx=cx, cy=cy, r=r, stroke=WHITE, stroke_opacity=0.25, stroke_width=2.4)
    el(doc, "path", d=arc_d(cx, cy, r, -90, -90 + 360 * frac), stroke=col, stroke_opacity=op, stroke_width=2.4,
       stroke_linecap="round")


def g_timer(doc, cx, cy, s, col=GREEN, op=1, **_):
    g_progress(doc, cx, cy, s, col, op, frac=0.62)


GLYPH = {"iris": g_iris, "check": g_check, "lock": g_lock, "lock_open": g_lock_open, "hourglass": g_hourglass,
         "chev_up": g_chev_up, "chev_right": g_chev_right, "arrow_down": g_arrow_down, "person": g_person, "eye": g_eye, "finger": g_finger,
         "progress": g_progress, "timer": g_timer}

# ── Reader hardware + screen kit ─────────────────────────────────────────────
DW, DH, DR = 460, 900, 60
SX, SY, SWD, SHT, SR = 22, 120, 416, 666, 32
SCX = SWD / 2
ISL_Y, ISL_H = 12, 38
RCX, RCY, RL = 208, 356, 110        # mirror lens centre + radius
HEAD = (208, 346)                  # silhouette head centre at k = 1


def wallpaper(doc, mood):
    m = MOODS[mood]
    doc.open(name="Wallpaper · " + mood)
    el(doc, "rect", width=SWD, height=SHT, fill=lg(doc, [(0, m["top"], 1), (1, m["bot"], 1)]))
    for bx, by, rx, ry, col, a in m["blobs"]:
        el(doc, "ellipse", cx=bx, cy=by, rx=rx, ry=ry, fill=rg(doc, [(0, col, a), (0.45, col, a * 0.5), (1, col, 0)]))
    doc.close()


def status(doc, time=True):
    T(doc, 26, 36, "Data Hall 01", 13, 600, WHITE, op=0.8, name="Location")
    if time:
        T(doc, SWD - 26, 36, "4:01 PM", 13, 600, WHITE, anchor="end", op=0.8, name="Time")


def island_w(label):
    return 84 if not label else 18 + 9 + tw(label, 15, 600) + 34


def island(doc, label=None, glyph="iris", tint=None, bright=False, halo=None, gcol=WHITE, gop=0.92):
    w = island_w(label)
    x = SCX - w / 2
    cy = ISL_Y + ISL_H / 2
    doc.open(name="Iris Island" + (f" · {label}" if label else " · Ready"))
    if halo:
        col, a = halo
        el(doc, "ellipse", cx=SCX, cy=cy + 4, rx=w * 0.95 + 30, ry=74,
           fill=rg(doc, [(0, col, a), (0.45, col, a * 0.35), (1, col, 0)]))
    glass_rect(doc, x, ISL_Y, w, ISL_H, ISL_H / 2, kind="bright" if bright else "regular", tint=tint,
               shadow=(0, 6, 12, "#000000", 0.35), name="Capsule")
    gx = x + 17 + 9 if label else SCX
    GLYPH[glyph](doc, gx, cy, 18, BLUE if bright else gcol, 1 if bright else gop)
    if label:
        T(doc, gx + 9 + 9, cy + 5.4, label, 15, 600, INK_ON_GLASS if bright else WHITE)
    doc.close()


def headline(doc, title, sub=None, y=116, size=31):
    T(doc, SCX, y, title, size, 600, WHITE, anchor="middle", ls=-0.6, name="Instruction")
    if sub:
        T(doc, SCX, y + 32, sub, 17, 400, WHITE, anchor="middle", op=0.72, name="Supporting line")


def capsule_w(label, icon=True, size=17):
    return tw(label, size, 600) + (30 if icon else 0) + 56


def capsule(doc, y, label, icon=None, icon_col=WHITE, h=50, size=17, name="Dock", tint=None):
    lw = tw(label, size, 600)
    iw, gap = (20, 10) if icon else (0, 0)
    w = lw + iw + gap + 56
    x = SCX - w / 2
    doc.open(name=name)
    glass_rect(doc, x, y, w, h, h / 2, tint=tint, name="Capsule")
    sx = SCX - (lw + iw + gap) / 2
    cy = y + h / 2
    if icon:
        GLYPH[icon](doc, sx + iw / 2, cy, 20, icon_col, 1)
    T(doc, sx + iw + gap, cy + size * 0.36, label, size, 600, WHITE)
    doc.close()


def silhouette(doc, hx, hy, k, op=1.0):
    fill = lg(doc, [(0, WHITE, 0.30 * op), (1, WHITE, 0.05 * op)], 0, hy - 60 * k, 0, hy + 150 * k, user=True)
    doc.open(name="Privacy silhouette", filter=fx(doc, (hx - 125 * k, hy - 62 * k, 250 * k, 215 * k), blur=1.6))
    el(doc, "ellipse", cx=hx, cy=hy, rx=47 * k, ry=59 * k, fill=fill)
    d = (f"M{num(hx - 21 * k)} {num(hy + 48 * k)}L{num(hx - 21 * k)} {num(hy + 70 * k)}"
         f"C{num(hx - 52 * k)} {num(hy + 78 * k)} {num(hx - 104 * k)} {num(hy + 92 * k)} {num(hx - 120 * k)} {num(hy + 150 * k)}"
         f"L{num(hx + 120 * k)} {num(hy + 150 * k)}"
         f"C{num(hx + 104 * k)} {num(hy + 92 * k)} {num(hx + 52 * k)} {num(hy + 78 * k)} {num(hx + 21 * k)} {num(hy + 70 * k)}"
         f"L{num(hx + 21 * k)} {num(hy + 48 * k)}Z")
    el(doc, "path", d=d, fill=fill)
    doc.close()


def reticle(doc, cx, cy, r, col, side, op=1.0, dashed=False):
    el(doc, "circle", cx=cx, cy=cy, r=r, stroke=col, stroke_opacity=op, stroke_width=1.8,
       stroke_dasharray="3 3" if dashed else None)
    d = ""
    for a in (-90, 90, 180 if side < 0 else 0):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        d += f"M{num(cx + (r + 3) * c)} {num(cy + (r + 3) * s)}L{num(cx + (r + 7) * c)} {num(cy + (r + 7) * s)}"
    el(doc, "path", d=d, stroke=col, stroke_opacity=op, stroke_width=1.8, stroke_linecap="round")
    el(doc, "circle", cx=cx, cy=cy, r=2.2, fill=col, fill_opacity=op)


def iris_sig(doc, cx, cy, r, col, frac=1.0):
    """Abstract iris 'signature' — a code-like glyph, never the captured image."""
    rnd = random.Random(int(cx * 7 + cy * 3))
    n = 28
    d = ""
    for i in range(int(round(n * frac))):
        a = math.radians(-90 + 360 * i / n)
        r0, r1 = r * 0.36, r * (0.6 + 0.32 * rnd.random())
        d += (f"M{num(cx + r0 * math.cos(a))} {num(cy + r0 * math.sin(a))}"
              f"L{num(cx + r1 * math.cos(a))} {num(cy + r1 * math.sin(a))}")
    if d:
        el(doc, "path", d=d, stroke=col, stroke_width=1.1, stroke_linecap="round", stroke_opacity=0.95)
    el(doc, "circle", cx=cx, cy=cy, r=r * 0.24, fill=col)


def badge(doc, cx, cy, col):
    el(doc, "circle", cx=cx, cy=cy, r=7.5, fill=col, stroke="#000000", stroke_opacity=0.35)
    g_check(doc, cx, cy + 0.5, 11, WHITE, 1, sw=2)


def eye_marks(doc, mode, hx, hy, k=1.0):
    L = (hx - 23 * k, hy - 4 * k)
    R = (hx + 23 * k, hy - 4 * k)
    doc.open(name="Eye lock · " + mode)
    if mode == "lock":
        reticle(doc, *L, 12, CYAN, -1)
        reticle(doc, *R, 12, CYAN, 1)
    elif mode == "scan":
        el(doc, "circle", cx=L[0], cy=L[1], r=13, stroke=GREEN, stroke_width=2)
        iris_sig(doc, *L, 11, GREEN)
        badge(doc, L[0] - 11, L[1] - 11, GREEN)
        el(doc, "circle", cx=R[0], cy=R[1], r=13, stroke=WHITE, stroke_opacity=0.25, stroke_width=2)
        el(doc, "path", d=arc_d(R[0], R[1], 13, -90, 126), stroke=CYAN, stroke_width=2.4, stroke_linecap="round")
        iris_sig(doc, *R, 11, CYAN, frac=0.6)
    elif mode == "one":
        el(doc, "circle", cx=L[0], cy=L[1], r=13, stroke=GREEN, stroke_width=2)
        iris_sig(doc, *L, 11, GREEN)
        badge(doc, L[0] - 11, L[1] - 11, GREEN)
        reticle(doc, *R, 13, AMBER, 1, dashed=True)
    doc.close()


def mirror(doc, k=1.0, lit=1.0, lit_col=WHITE, base_a=0.16, eyes=None, sil_op=1.0):
    doc.open(name="Mirror")
    glass_circle(doc, RCX, RCY, RL, kind="clear", shadow=(0, 16, 26, "#000000", 0.40), name="Lens · Glass clear")
    hx, hy = HEAD[0], HEAD[1] + (1 - k) * 22
    doc.open(name="Silhouette mask", clip_path=clip_circle(doc, RCX, RCY, RL - 1))
    silhouette(doc, hx, hy, k, sil_op)
    doc.close()
    ticks(doc, RCX, RCY, RL + 13, RL + 27, 96, lit, lit_col, base_a=base_a)
    if eyes:
        eye_marks(doc, eyes, hx, hy, k)
    doc.close()


def medallion(doc, cy, tint, glyph, gsize=64, glow_a=0.5):
    doc.open(name="Medallion")
    glass_circle(doc, SCX, cy, 84, tint=tint, glow=(tint, glow_a, 26), shadow=(0, 14, 24, "#000000", 0.45),
                 name="Glass tinted", edge=True)
    GLYPH[glyph](doc, SCX, cy + (2 if glyph == "check" else 0), gsize, WHITE, 1,
                 sw=9 if glyph == "check" else None)
    doc.close()


def lens(doc, cx, cy, r, name):
    doc.open(name=name)
    el(doc, "circle", cx=cx, cy=cy, r=r, fill="#050608", stroke="#30323A", stroke_width=1.5)
    el(doc, "circle", cx=cx, cy=cy, r=r * 0.66,
       fill=rg(doc, [(0, "#3A4470", 1), (0.45, "#141A30", 1), (1, "#06070B", 1)], cx=0.4, cy=0.36, r=0.62))
    el(doc, "circle", cx=cx, cy=cy, r=r * 0.26, fill="#000000", fill_opacity=0.7)
    el(doc, "ellipse", cx=cx - r * 0.22, cy=cy - r * 0.28, rx=r * 0.16, ry=r * 0.09, fill=WHITE, fill_opacity=0.45)
    doc.close()


def device(doc, ox, oy, draw, name, led=None):
    doc.open(name=name, transform=f"translate({num(ox)} {num(oy)})")
    el(doc, "ellipse", name="Spotlight", cx=DW / 2, cy=DH / 2 + 20, rx=390, ry=580,
       fill=rg(doc, [(0, "#3B4458", 0.40), (0.6, "#262B38", 0.14), (1, "#1A1D26", 0)]))
    el(doc, "ellipse", name="Contact shadow", cx=DW / 2, cy=DH + 14, rx=210, ry=14, fill="#000000", fill_opacity=0.8,
       filter=fx(doc, (DW / 2 - 210, DH, 420, 28), blur=10))
    doc.open(name="Hardware")
    el(doc, "rect", name="Body", width=DW, height=DH, rx=DR,
       fill=lg(doc, [(0, "#24252B", 1), (0.5, "#15161A", 1), (1, "#0D0E11", 1)]),
       stroke=lg(doc, [(0, "#6B6E77", 1), (0.22, "#2C2E34", 1), (0.7, "#191A1E", 1), (1, "#41444B", 1)], 0, 0, 1, 1),
       stroke_width=2.5)
    el(doc, "rect", x=6, y=6, width=DW - 12, height=DH - 12, rx=DR - 6, stroke="#000000", stroke_opacity=0.6,
       stroke_width=1.5)
    lens(doc, 190, 62, 24, "Iris camera")
    lens(doc, 270, 62, 24, "Face camera")
    if led:
        el(doc, "circle", cx=380, cy=62, r=11, fill=led, fill_opacity=0.6, filter=fx(doc, (369, 51, 22, 22), blur=5))
    el(doc, "circle", name="Status light", cx=380, cy=62, r=4.5, fill=led or "#2A2C31", stroke="#3A3C42",
       stroke_width=1)
    doc.open(name="Fingerprint sensor")
    el(doc, "rect", x=DW / 2 - 30, y=822, width=60, height=48, rx=14, fill="#08090B", stroke="#34363C",
       stroke_width=1.5)
    g_finger(doc, DW / 2, 846, 26, WHITE, 0.22)
    doc.close()
    doc.close()
    el(doc, "rect", x=SX - 3, y=SY - 3, width=SWD + 6, height=SHT + 6, rx=SR + 3, fill="#000000")
    doc.open(name="Screen 416×666", transform=f"translate({SX} {SY})")
    doc.open(name="Screen content", clip_path=clip_rect(doc, 0, 0, SWD, SHT, SR))
    draw(doc)
    el(doc, "path", name="Panel reflection", d=f"M0 0H{num(SWD * 0.78)}L0 {num(SHT * 0.56)}Z",
       fill=lg(doc, [(0, WHITE, 0.06), (0.45, WHITE, 0)], 0, 0, 1, 1))
    doc.close()
    doc.close()
    doc.close()


# ── The redesigned reader states ─────────────────────────────────────────────
def s_ready(doc):
    wallpaper(doc, "neutral")
    status(doc, time=False)
    island(doc, glyph="iris")
    T(doc, SCX, 290, "4:01", 116, 300, WHITE, anchor="middle", ls=-3, op=0.95, name="Clock")
    T(doc, SCX, 332, "Friday, 9 October", 20, 500, WHITE, anchor="middle", op=0.72, name="Date")
    capsule(doc, 572, "Look up to enter", icon="chev_up", name="Invitation")


def s_find(doc):
    wallpaper(doc, "guide")
    status(doc)
    island(doc, glyph="iris", gop=0.7)
    headline(doc, "Come a little closer", "Clear glasses are fine")
    mirror(doc, k=0.66, lit=0.42, lit_col=AMBER)


def chevrons(doc, cx, y):
    doc.open(name="Gaze chevrons")
    for i, op in enumerate((0.9, 0.55, 0.28)):
        g_chev_up(doc, cx, y + i * 9, 18, WHITE, op)
    doc.close()


def s_look(doc):
    wallpaper(doc, "look")
    status(doc)
    el(doc, "path", name="Gaze beam", d=f"M{SCX - 70} 40L{SCX + 70} 40L{SCX + 160} 230L{SCX - 160} 230Z",
       fill=lg(doc, [(0, WHITE, 0.26), (1, WHITE, 0)]), filter=fx(doc, (SCX - 160, 40, 320, 190), blur=14))
    island(doc, label="Look here", bright=True, halo=(WHITE, 0.5))
    chevrons(doc, SCX, 66)
    headline(doc, "Look up at the light", y=128)
    mirror(doc, eyes="lock")


def s_scan(doc):
    wallpaper(doc, "scan")
    status(doc)
    island(doc, label="Scanning", glyph="progress", gcol=CYAN)
    headline(doc, "Hold still")
    mirror(doc, lit=0.72, lit_col=CYAN, eyes="scan")


def s_enter(doc):
    wallpaper(doc, "success")
    status(doc)
    island(doc, label="Unlocked", glyph="lock_open", tint=GREEN)
    ticks(doc, SCX, 300, 104, 112, 96, 1.0, GREEN, lit_a=0.5, glow=False, sw=2.2, name="Ripple 1")
    ticks(doc, SCX, 300, 128, 133, 96, 1.0, GREEN, lit_a=0.2, glow=False, sw=2, name="Ripple 2")
    medallion(doc, 300, GREEN, "check", gsize=78)
    T(doc, SCX, 450, "Welcome, Ma Lun", 34, 600, WHITE, anchor="middle", ls=-0.6, name="Welcome")
    T(doc, SCX, 484, "Door unlocked — go ahead", 18, 400, WHITE, anchor="middle", op=0.78, name="Door state")
    capsule(doc, 572, "Relocks in 5 s", icon="timer", icon_col=GREEN, name="Relock")


def s_one_eye(doc):
    wallpaper(doc, "guide")
    status(doc)
    island(doc, label="Almost", glyph="iris", tint=AMBER)
    headline(doc, "Eyes a little wider", "One more second")
    mirror(doc, lit=0.86, lit_col=AMBER, eyes="one")


def s_retry(doc):
    wallpaper(doc, "guide")
    status(doc)
    island(doc, label="Retry", glyph="iris", tint=AMBER)
    headline(doc, "Let’s try that again", "Look up at the light")
    mirror(doc, lit=0.25, lit_col=AMBER, sil_op=0.7)
    el(doc, "ellipse", name="Sensor hint", cx=SCX, cy=SHT + 20, rx=150, ry=70,
       fill=rg(doc, [(0, AMBER, 0.45), (0.5, AMBER, 0.15), (1, AMBER, 0)]))
    capsule(doc, 572, "Or use fingerprint", icon="arrow_down", icon_col=AMBER, name="Fallback")


def s_denied(doc):
    wallpaper(doc, "alert")
    status(doc)
    island(doc, label="No access", glyph="lock", tint=RED)
    medallion(doc, 300, RED, "lock", gsize=62, glow_a=0.4)
    T(doc, SCX, 450, "No access to this door", 30, 600, WHITE, anchor="middle", ls=-0.6, name="Instruction")
    T(doc, SCX, 484, "Ask Security to add Data Hall 01", 18, 400, WHITE, anchor="middle", op=0.78,
      name="Supporting line")


def s_wait(doc):
    wallpaper(doc, "wait")
    status(doc)
    island(doc, label="Wait", glyph="hourglass", tint=AMBER)
    medallion(doc, 300, AMBER, "person", gsize=64, glow_a=0.35)
    T(doc, SCX, 450, "One person at a time", 31, 600, WHITE, anchor="middle", ls=-0.6, name="Instruction")
    T(doc, SCX, 484, "The airlock is still in use", 18, 400, WHITE, anchor="middle", op=0.78, name="Supporting line")
    capsule(doc, 572, "Opens in about 8 s", icon="timer", icon_col=AMBER, name="Wait time")


# ── Today's UI, redrawn (low-fi replicas of the recorded screens) ────────────
OW, OH = 300, 480


def old_hexes(doc):
    rnd = random.Random(11)
    d = ""
    r = 15
    for row in range(5):
        for col in range(7):
            if rnd.random() < 0.42:
                continue
            cx = 112 + col * r * 1.732 + (row % 2) * r * 0.866
            cy = 30 + row * r * 1.5
            pts = [(cx + r * math.cos(math.radians(60 * k + 30)), cy + r * math.sin(math.radians(60 * k + 30)))
                   for k in range(6)]
            d += "M" + "L".join(f"{num(px)} {num(py)}" for px, py in pts) + "Z"
    for cx, cy in ((22, 120), (40, 146), (30, 330), (270, 360), (252, 384)):
        pts = [(cx + r * math.cos(math.radians(60 * k + 30)), cy + r * math.sin(math.radians(60 * k + 30)))
               for k in range(6)]
        d += "M" + "L".join(f"{num(px)} {num(py)}" for px, py in pts) + "Z"
    el(doc, "path", name="Hex network", d=d, stroke=WHITE, stroke_opacity=0.17, stroke_width=0.8)
    dots = ""
    for _ in range(26):
        x, y = rnd.uniform(10, 290), rnd.uniform(40, 400)
        dots += f"M{num(x)} {num(y)}h0.01"
    el(doc, "path", d=dots, stroke=WHITE, stroke_opacity=0.5, stroke_width=1.6, stroke_linecap="round")


def old_frame(doc, time):
    el(doc, "rect", width=OW, height=OH, fill=lg(doc, [(0, "#2B7FB2", 1), (0.5, "#2C989C", 1), (1, "#58B283", 1)]))
    old_hexes(doc)
    T(doc, 12, 24, "NOVA+", 12, 800, WHITE)
    T(doc, 12, 34, "Data Hall 01 – Biometric Airlock …", 5.6, 500, WHITE, op=0.85)
    el(doc, "path", d="M150 14L158 27H142Z M150 18L155 25.5H145Z", stroke=WHITE, stroke_width=1, stroke_opacity=0.9)
    el(doc, "circle", cx=246, cy=22, r=2.2, fill="#34C759")
    el(doc, "rect", x=251, y=20, width=36, height=4, rx=2, fill=WHITE, fill_opacity=0.65)
    el(doc, "rect", x=10, y=410, width=280, height=58, rx=29, stroke=WHITE, stroke_opacity=0.45, fill=WHITE,
       fill_opacity=0.05)
    T(doc, 272, 428, "Fri, Oct 9, 2026", 7, 600, WHITE, anchor="end", op=0.9)
    T(doc, 28, 457, time, 9, 600, WHITE)


def old_face(doc, x, y, w, h, scanning=False):
    el(doc, "rect", x=x, y=y, width=w, height=h, rx=5, fill="#17323A", fill_opacity=0.92)
    cx = x + w / 2
    sil = "#2E5A63"
    el(doc, "ellipse", cx=cx, cy=y + h * 0.38, rx=w * 0.2, ry=h * 0.21, fill=sil)
    d = (f"M{num(cx - w * 0.09)} {num(y + h * 0.56)}L{num(cx - w * 0.1)} {num(y + h * 0.66)}"
         f"C{num(cx - w * 0.3)} {num(y + h * 0.7)} {num(cx - w * 0.42)} {num(y + h * 0.8)} {num(cx - w * 0.46)} {num(y + h)}"
         f"L{num(cx + w * 0.46)} {num(y + h)}"
         f"C{num(cx + w * 0.42)} {num(y + h * 0.8)} {num(cx + w * 0.3)} {num(y + h * 0.7)} {num(cx + w * 0.1)} {num(y + h * 0.66)}"
         f"L{num(cx + w * 0.09)} {num(y + h * 0.56)}Z")
    el(doc, "path", d=d, fill=sil)
    gy = y + h * 0.36
    for gx in (cx - w * 0.255, cx + w * 0.015):
        el(doc, "rect", x=gx, y=gy - 6, width=w * 0.24, height=12, rx=2.5, stroke=WHITE, stroke_width=1.3,
           fill="#0C1A1E", fill_opacity=0.65)
    if scanning:
        T(doc, cx, gy + 28, "Scanning iris…", 6.5, 600, WHITE, anchor="middle")
    L = 12
    x0, y0, x1, y1 = x - 8, y - 8, x + w + 8, y + h + 8
    d = (f"M{x0} {y0 + L}V{y0}H{x0 + L}M{x1 - L} {y0}H{x1}V{y0 + L}"
         f"M{x1} {y1 - L}V{y1}H{x1 - L}M{x0 + L} {y1}H{x0}V{y1 - L}")
    el(doc, "path", d=d, stroke=WHITE, stroke_opacity=0.85, stroke_width=1.4)


def old_ir(doc, x, y, w, h):
    el(doc, "rect", x=x, y=y, width=w, height=h, rx=4, fill="#D9DCDC")
    cx = x + w / 2
    for s in (-1, 1):
        ex = cx + s * w * 0.22
        ey = y + h * 0.45
        el(doc, "path", d=f"M{num(ex - 15)} {num(ey - 13)}Q{num(ex)} {num(ey - 21)} {num(ex + 15)} {num(ey - 12)}",
           stroke="#3A3F40", stroke_width=3, stroke_linecap="round")
        el(doc, "path", d=f"M{num(ex - 11)} {num(ey)}Q{num(ex)} {num(ey - 7)} {num(ex + 11)} {num(ey)}"
                          f"Q{num(ex)} {num(ey + 6)} {num(ex - 11)} {num(ey)}Z", stroke="#4A5050", stroke_width=1)
        el(doc, "circle", cx=ex, cy=ey - 0.5, r=3.4, fill="#5B6263")
        el(doc, "rect", x=ex - 14, y=ey - 8, width=28, height=15, stroke="#2FBF71", stroke_width=1)
    el(doc, "path", d=f"M{num(cx - 6)} {num(y + h * 0.72)}Q{num(cx)} {num(y + h * 0.76)} {num(cx + 6)} {num(y + h * 0.72)}",
       stroke="#6B7172", stroke_width=1.6, stroke_linecap="round")
    T(doc, x + w - 6, y + 12, "N:1 G:00", 6.4, 600, "#222222", anchor="end")
    L = 12
    x0, y0, x1, y1 = x - 8, y - 8, x + w + 8, y + h + 8
    d = (f"M{x0} {y0 + L}V{y0}H{x0 + L}M{x1 - L} {y0}H{x1}V{y0 + L}"
         f"M{x1} {y1 - L}V{y1}H{x1 - L}M{x0 + L} {y1}H{x0}V{y1 - L}")
    el(doc, "path", d=d, stroke=WHITE, stroke_opacity=0.85, stroke_width=1.4)


def old_gauge(doc, y, good):
    col = "#33D17A" if good else "#F5A524"
    el(doc, "rect", x=58, y=y, width=184, height=42, rx=9, fill="#0F2B30", fill_opacity=0.88)
    el(doc, "circle", cx=67, cy=y + 12, r=2.4, fill=col)
    T(doc, 73, y + 14.6, "Good distance — hold still" if good else "Too far — move closer", 7.6, 700, col)
    T(doc, 236, y + 10, "43 cm" if good else "97 cm", 5.6, 600, WHITE, anchor="end", op=0.85)
    by = y + 24
    el(doc, "rect", x=66, y=by, width=48, height=3.6, rx=1.8, fill="#D95B4F")
    el(doc, "rect", x=112, y=by, width=76, height=3.6, fill="#2FBF71")
    el(doc, "rect", x=186, y=by, width=48, height=3.6, rx=1.8, fill="#E89A3A")
    el(doc, "circle", cx=150 if good else 228, cy=by + 1.8, r=3.7, fill=WHITE)
    T(doc, 66, y + 36, "Too close", 4.8, 500, WHITE, op=0.75)
    T(doc, 150, y + 36, "Good", 4.8, 500, WHITE, anchor="middle", op=0.75)
    T(doc, 234, y + 36, "Too far", 4.8, 500, WHITE, anchor="end", op=0.75)


def old_up_arrow(doc):
    el(doc, "path", d="M150 80V64M144 70L150 64L156 70", stroke=WHITE, stroke_width=1.6, stroke_linecap="round",
       stroke_linejoin="round")


def old_eyes(doc, y, right_captured=False):
    for x, label, captured in ((70, "Left eye", True), (154, "Right eye", right_captured)):
        if captured:
            el(doc, "rect", x=x, y=y, width=76, height=54, rx=4, fill="#D2D6D7")
            ex, ey = x + 38, y + 30
            el(doc, "path", d=f"M{ex - 26} {ey}Q{ex} {ey - 20} {ex + 26} {ey - 2}Q{ex} {ey + 14} {ex - 26} {ey}Z",
               stroke="#3E4445", stroke_width=1.4, fill="#E6E9EA")
            el(doc, "circle", cx=ex - 2, cy=ey - 2, r=8, fill="#7D8587")
            el(doc, "circle", cx=ex - 2, cy=ey - 2, r=3.4, fill="#1E2223")
            el(doc, "path", d=f"M{ex - 24} {ey - 7}Q{ex} {ey - 26} {ex + 26} {ey - 8}", stroke="#2B3031",
               stroke_width=2.2, stroke_linecap="round")
        else:
            el(doc, "rect", x=x, y=y, width=76, height=54, rx=4, fill="#47525A")
            T(doc, x + 38, y + 29, "Not captured", 5.4, 600, WHITE, anchor="middle", op=0.8)
        T(doc, x + 38, y + 66, label, 5.6, 600, WHITE, anchor="middle", op=0.9)


def old_screen(doc, kind):
    times = {"position": "04:01:21 PM", "far": "04:01:15 PM", "good": "04:01:22 PM", "live": "04:01:23 PM",
             "captured": "04:01:16 PM", "match": "04:01:17 PM", "welcome": "04:01:18 PM", "door": "04:01:19 PM"}
    old_frame(doc, times[kind])
    if kind == "position":
        T(doc, 150, 116, "Position face here", 12.5, 600, WHITE, anchor="middle")
        old_face(doc, 70, 132, 160, 176, scanning=True)
    elif kind in ("far", "good", "live"):
        old_up_arrow(doc)
        T(doc, 150, 100, "Please look up", 12.5, 600, WHITE, anchor="middle")
        sub = "Keep both eyes inside the guides" if kind == "live" else "Look at the iris camera above the screen"
        T(doc, 150, 109, sub, 5.4, 500, WHITE, anchor="middle", op=0.85)
        T(doc, 150, 125, "00:19 seconds" if kind == "far" else "00:20 seconds", 10.5, 700, WHITE, anchor="middle")
        if kind == "live":
            old_ir(doc, 80, 138, 140, 146)
        else:
            old_face(doc, 80, 138, 140, 146)
        old_gauge(doc, 296, kind != "far")
    elif kind == "captured":
        T(doc, 150, 190, "Iris captured", 11.5, 600, WHITE, anchor="middle")
        T(doc, 150, 206, "00:20 seconds", 10.5, 700, WHITE, anchor="middle")
        old_eyes(doc, 218)
    elif kind == "match":
        el(doc, "circle", cx=150, cy=176, r=12, fill="#34C759")
        g_check(doc, 150, 176.5, 15, WHITE, 1, sw=2.2)
        old_eyes(doc, 206)
    elif kind == "welcome":
        T(doc, 150, 106, "Welcome", 13, 600, WHITE, anchor="middle")
        T(doc, 150, 124, "Ma Lun", 13, 600, WHITE, anchor="middle")
        el(doc, "rect", x=112, y=140, width=76, height=154, rx=10, stroke=WHITE, stroke_opacity=0.85, stroke_width=1.2)
        for cx in (138, 150):
            el(doc, "circle", cx=cx, cy=149, r=2.6, stroke=WHITE, stroke_opacity=0.85)
        el(doc, "rect", x=118, y=158, width=64, height=100, rx=3, fill="#1E4A50", fill_opacity=0.9)
        el(doc, "circle", cx=150, cy=208, r=15, fill="#34C759")
        g_check(doc, 150, 208.5, 19, WHITE, 1, sw=2.6)
        el(doc, "rect", x=146, y=266, width=8, height=3, rx=1.5, stroke=WHITE, stroke_opacity=0.8)
        el(doc, "rect", x=144, y=274, width=12, height=11, rx=2.5, stroke=WHITE, stroke_opacity=0.8)
    elif kind == "door":
        g_lock_open(doc, 152, 192, 46, "#34C759", 1)
        T(doc, 150, 244, "Door Unlocked", 12.5, 600, WHITE, anchor="middle")
        T(doc, 150, 255, "Please proceed.", 6, 500, WHITE, anchor="middle", op=0.85)


# ── Board furniture ──────────────────────────────────────────────────────────
def section_head(doc, y, num_, eyebrow, title, desc, desc_w=1700):
    RT(doc, M, y, [(num_, 700, BLUE, None), ("   " + eyebrow, 600, INK3, None)], 18, ls=3)
    T(doc, M, y + 72, title, 58, 700, INK, ls=-1.6)
    last = P(doc, M, y + 126, desc, 24, 400, INK2, max_w=desc_w, lh=35)
    return last + 76


def card(doc, x, y, w, h, r=28, name=None):
    el(doc, "rect", name=name, x=x, y=y, width=w, height=h, rx=r, fill=CARD, stroke=WHITE, stroke_opacity=0.07)


def aurora_tile(doc, x, y, w, h, r, mood="neutral", name="Aurora tile"):
    m = MOODS[mood]
    doc.open(name=name, clip_path=clip_rect(doc, x, y, w, h, r))
    el(doc, "rect", x=x, y=y, width=w, height=h, fill=lg(doc, [(0, m["top"], 1), (1, m["bot"], 1)]))
    for bx, by, rx, ry, col, a in m["blobs"]:
        el(doc, "ellipse", cx=x + bx / SWD * w, cy=y + by / SHT * h, rx=rx / SWD * w * 0.8, ry=ry / SHT * h * 1.2,
           fill=rg(doc, [(0, col, a), (0.45, col, a * 0.5), (1, col, 0)]))
    doc.close()
    el(doc, "rect", x=x, y=y, width=w, height=h, rx=r, stroke=WHITE, stroke_opacity=0.09)


def lens_dot(doc, x, y, key, label=None):
    bg, _ = LENS[key]
    el(doc, "circle", cx=x, cy=y, r=7, fill=bg)
    if label:
        T(doc, x + 16, y + 6, label, 18, 500, INK2)


def pin(doc, x, y, n, key, tx=None, ty=None):
    bg, fg = LENS[key]
    if tx is not None:
        d = f"M{num(x)} {num(y)}H{num(tx)}" + (f"V{num(ty)}" if abs(ty - y) > 0.5 else "")
        el(doc, "path", d=d, stroke=WHITE, stroke_opacity=0.6, stroke_width=1.25, stroke_linejoin="round")
        el(doc, "circle", cx=tx, cy=ty, r=4.5, fill=bg, stroke="#000000", stroke_opacity=0.5)
    el(doc, "circle", cx=x, cy=y, r=15, fill=bg, stroke="#000000", stroke_opacity=0.4)
    T(doc, x, y + 5.3, str(n), 15, 700, fg, anchor="middle")


def note_list(doc, x, y, items, width, size=18, lh=26, gap=22):
    for n, key, text in items:
        bg, fg = LENS[key]
        el(doc, "circle", cx=x + 14, cy=y - 6, r=14, fill=bg)
        T(doc, x + 14, y - 1, str(n), 14, 700, fg, anchor="middle")
        y = P(doc, x + 42, y, text, size, 400, "#D1D1D6", max_w=width - 42, lh=lh) + lh + gap
    return y


# ── Sections ─────────────────────────────────────────────────────────────────
def header(doc):
    doc.open(name="00 · Cover")
    T(doc, M, 98, "NOVA+", 30, 800, INK, ls=0.5)
    T(doc, M + tw("NOVA+", 30, 800, 0.5) + 22, 97, "Iris Reader  ·  Experience redesign", 22, 500, INK2)
    T(doc, W - M, 97, "Product review  ·  9 Oct 2026  ·  v1.0  ·  Proposal", 18, 500, INK3, anchor="end")
    el(doc, "rect", x=M, y=134, width=CW, height=1, fill=HAIR)
    T(doc, M, 246, "BIOMETRIC AIRLOCK  ·  DATA HALL 01  ·  CPO REVIEW", 19, 600, INK3, ls=3)
    title = "Look. Verified. Walk in."
    size = 124
    while tw(title, size, 700, -4) > 1660:
        size -= 2
    T(doc, M, 372, title, size, 700, INK, ls=-4, name="Title")
    P(doc, M, 450, "One calm Liquid Glass surface replaces eight screens. Reviewed from the Chief Product "
                   "Officer’s chair through three chief-designer lenses: Jobs, Musk and Huang.",
      29, 400, INK2, max_w=1560, lh=42)

    # three moments
    px, py, pw, ph = 1940, 176, W - M - 1940, 384
    doc.open(name="Three moments")
    aurora_tile(doc, px, py, pw, ph, 40, "neutral")
    items = [("FIND", AMBER, "person", "Come closer", "The ring fills as you step in"),
             ("LOOK", CYAN, "eye", "Look up", "The Island sits under the camera"),
             ("ENTER", GREEN, "lock_open", "Walk in", "Unlocks at the match")]
    cxs = [px + pw * (2 * i + 1) / 6 for i in range(3)]
    cy = py + 132
    el(doc, "path", d=f"M{num(cxs[0] + 80)} {cy}H{num(cxs[1] - 80)}M{num(cxs[1] + 80)} {cy}H{num(cxs[2] - 80)}",
       stroke=WHITE, stroke_opacity=0.35, stroke_width=2, stroke_dasharray="2 9", stroke_linecap="round")
    for cx, (lab, col, ic, t1, t2) in zip(cxs, items):
        glass_circle(doc, cx, cy, 62, tint=col, glow=(col, 0.32, 22), name=f"Moment · {lab}", edge=True)
        GLYPH[ic](doc, cx, cy, 44, WHITE, 1)
        T(doc, cx, cy + 112, lab, 16, 700, col, anchor="middle", ls=3)
        T(doc, cx, cy + 148, t1, 27, 600, WHITE, anchor="middle")
        T(doc, cx, cy + 180, t2, 17, 400, WHITE, anchor="middle", op=0.7)
    doc.close()

    # KPI tiles
    y = 632
    kp = [("8", "3", "Screens per pass → moments on one living screen"),
          ("2.6 s", "0 s", "Wait between the match and “Door unlocked”"),
          ("6", "2", "Things to read while being guided"),
          ("3", "0", "Raw face and iris images shown on screen")]
    kw = (CW - 3 * 32) / 4
    doc.open(name="Headline numbers")
    for i, (old, new, label) in enumerate(kp):
        x = M + i * (kw + 32)
        card(doc, x, y, kw, 184)
        RT(doc, x + 40, y + 98, [(old, 700, INK3, None), ("  →  ", 400, INK3, None), (new, 700, INK, None)], 64)
        P(doc, x + 40, y + 146, label, 20, 400, INK2, max_w=kw - 80, lh=28)
    doc.close()
    doc.close()
    return y + 184


def sec_today(doc, y):
    doc.open(name="01 · Today, as recorded")
    y = section_head(
        doc, y, "01", "TODAY, AS RECORDED", "Eight screens to open one door.",
        "The engine is fast: 2.1 s from face to match. The choreography is slow: the person learns the door "
        "is open 2.6 s after they were already verified. Screens redrawn from the on-device recording "
        "(9 Oct 2026, on-screen clock 16:01:15–16:01:24); durations measured at 10 fps across two passes.")
    kinds = ["position", "far", "good", "live", "captured", "match", "welcome", "door"]
    gap = (CW - 8 * OW) / 7
    xs = [M + i * (OW + gap) for i in range(8)]
    ty = y + 70

    # timing brackets above the strip
    by = ty - 26
    e0, e1 = xs[0], xs[5] + OW / 2
    c0, c1 = xs[5] + OW / 2, xs[7] + OW
    el(doc, "path", d=f"M{num(e0)} {by + 12}V{by}H{num(e1 - 8)}V{by + 12}", stroke=CYAN, stroke_width=2)
    el(doc, "path", d=f"M{num(c0 + 8)} {by + 12}V{by}H{num(c1)}V{by + 12}", stroke=RED, stroke_width=2)
    RT(doc, (e0 + e1) / 2, by - 14, [("2.1 s", 700, CYAN, None), ("   face detected → iris matched", 500, INK2, None)],
       20, anchor="middle")
    RT(doc, (c0 + c1) / 2, by - 14, [("+2.6 s", 700, RED, None), ("   already verified → “Door Unlocked”", 500, INK2, None)],
       20, anchor="middle")

    captions = [("Position face here", "“Scanning iris…” · 1.0 s"),
                ("Look up · too far", "Countdown + 97 cm gauge · 1.3 s+"),
                ("Look up · good distance", "43 cm, “hold still” · 0.4 s"),
                ("Live IR face feed", "“Keep both eyes inside…” · 0.4 s"),
                ("Iris captured", "Left / right iris photos · 0.3 s"),
                ("Match", "Tick beside “Not captured” · 1.2 s"),
                ("Welcome Ma Lun", "Drawing of the device · 1.4 s"),
                ("Door Unlocked", "“Please proceed.” · 2.0 s")]
    pains = {0: [(4, 252, 212)], 1: [(1, 262, 96), (2, 230, 122)], 2: [(3, 254, 302)], 3: [(5, 240, 150)],
             4: [(9, 112, 28)], 5: [(6, 244, 240)], 6: [(8, 208, 236)], 7: [(7, 236, 168)]}
    for i, kind in enumerate(kinds):
        doc.open(name=f"Today {i + 1} · {captions[i][0]}", transform=f"translate({num(xs[i])} {ty})")
        doc.open(name="Screen", clip_path=clip_rect(doc, 0, 0, OW, OH, 22))
        old_screen(doc, kind)
        doc.close()
        el(doc, "rect", width=OW, height=OH, rx=22, stroke=WHITE, stroke_opacity=0.14)
        for n, px, py in pains.get(i, []):
            el(doc, "circle", cx=px, cy=py, r=14, fill=RED, stroke="#000000", stroke_opacity=0.35)
            T(doc, px, py + 5, str(n), 14, 700, WHITE, anchor="middle")
        RT(doc, 0, OH + 42, [(f"{i + 1:02d}  ", 700, INK3, None), (captions[i][0], 600, INK, None)], 19)
        T(doc, 0, OH + 70, captions[i][1], 16, 400, INK2)
        doc.close()

    # moment mapping
    my = ty + OH + 122
    groups = [(0, 1, "FIND", AMBER, "2 screens → 1 moment"), (2, 4, "LOOK", CYAN, "3 screens → 1 moment"),
              (5, 7, "ENTER", GREEN, "3 screens → 1 moment")]
    doc.open(name="Collapse into three moments")
    for a, b, lab, col, sub in groups:
        x0, x1 = xs[a], xs[b] + OW
        el(doc, "rect", x=x0, y=my, width=x1 - x0, height=6, rx=3, fill=col)
        RT(doc, (x0 + x1) / 2, my + 40, [(lab, 700, col, None), ("   " + sub, 500, INK2, None)], 18,
           anchor="middle", ls=1)
    doc.close()

    # pain points
    py0 = my + 118
    pts = [
        ("Split gaze", "“Look up” is printed mid-screen while the camera sits above it, so people read down, then hunt for the lens."),
        ("A countdown nobody needs", "“00:19 seconds” adds pressure; in pass 2 it still read 00:20 when the iris was captured."),
        ("An engineering gauge", "Centimetres and a three-zone scale to read at the exact moment you should hold still."),
        ("Mixed metaphors", "A “sunglasses” silhouette, corner brackets and a box frame all compete with the face."),
        ("Raw IR feed on show", "Anyone nearby sees the live face feed, plus debug text “N:1 G:00”."),
        ("Biometrics on glass", "Iris photos are rendered on screen, and a green tick appears beside “Right eye: Not captured”."),
        ("Three screens to say yes", "Tick, then Welcome, then Door Unlocked: the good news lands 2.6 s after the match."),
        ("Decoration as information", "A drawing of the device, shown on the device, tells the person nothing."),
        ("Noise floor", "Hex-network wallpaper, 5–7 px labels, a truncated location and an internal system label."),
    ]
    colw = (CW - 2 * 60) / 3
    doc.open(name="Pain points")
    row_y = py0
    for r in range(3):
        bottoms = []
        for c in range(3):
            i = r * 3 + c
            title, desc = pts[i]
            x = M + c * (colw + 60)
            el(doc, "circle", cx=x + 16, cy=row_y - 7, r=16, fill=RED)
            T(doc, x + 16, row_y - 1, str(i + 1), 16, 700, WHITE, anchor="middle")
            T(doc, x + 48, row_y, title, 22, 600, INK)
            bottoms.append(P(doc, x + 48, row_y + 34, desc, 19, 400, INK2, max_w=colw - 60, lh=28))
        row_y = max(bottoms) + 66
    doc.close()
    doc.close()
    return row_y - 20


LENSES = [
    dict(key="JOBS", init="SJ", name="Steve Jobs", role="Focus & delight", idea="“Design is how it works.”",
         grad=("#F2F2F7", "#8E8E93"), ink="#1C1C1E", bullets=[
             "One screen, one instruction, five words or fewer.",
             "Guidance lives where the eyes must go: the Iris Island sits directly under the camera.",
             "End on a feeling. Green bloom, chime and status light land together, then the screen gets out of the way."]),
    dict(key="MUSK", init="EM", name="Elon Musk", role="First principles & deletion", idea="“The best part is no part.”",
         grad=("#FF6B5F", "#9B1C14"), ink=WHITE, bullets=[
             "Ten parts deleted: countdown, cm gauge, sunglasses silhouette, raw IR feed, debug text, iris photos, "
             "device drawing, Welcome screen, hex wallpaper, system label.",
             "Unlock fires at the match. A verified person never waits for an animation.",
             "One number rules every release: approach-to-unlock time."]),
    dict(key="HUANG", init="JH", name="Jensen Huang", role="Accelerated, real-time AI",
         idea="Work back from the speed of light.", grad=("#A6E35F", "#3E6B00"), ink="#0B1200", bullets=[
             "A 60 fps perception loop: the ring answers distance and gaze within a frame.",
             "Show the AI working, never the data: eye-lock reticles and progress, zero biometric pixels.",
             "Edge-first. Detect, capture, liveness and match run on the device, each with a latency budget."]),
]


def sec_lenses(doc, y):
    doc.open(name="02 · Chief-designer lenses")
    y = section_head(doc, y, "02", "THE CHIEF-DESIGNER LENSES", "Three lenses, one product.",
                     "Every decision was pressure-tested against the principle each leader is known for. "
                     "In the redesign, each pin is coloured by the lens that drove it.")
    cw = (CW - 2 * 40) / 3
    # measure
    layouts = []
    for L in LENSES:
        idea_lines = wrap(L["idea"], 31, 500, cw - 112, italic=True)
        blines = [wrap(b, 20, 400, cw - 140) for b in L["bullets"]]
        layouts.append((idea_lines, blines))
    max_idea = max(len(a) for a, _ in layouts)
    bullets_h = max(sum(len(b) * 29 + 22 for b in bl) for _, bl in layouts)
    ch = 56 + 92 + 60 + max_idea * 42 + 44 + 40 + bullets_h + 40
    for i, L in enumerate(LENSES):
        x = M + i * (cw + 40)
        doc.open(name=f"Lens · {L['name']}")
        el(doc, "rect", x=x, y=y, width=cw, height=ch, rx=32,
           fill=lg(doc, [(0, "#18181C", 1), (1, "#111114", 1)]), stroke=WHITE, stroke_opacity=0.08)
        el(doc, "rect", x=x + 56, y=y, width=120, height=4, rx=2, fill=LENS[L["key"]][0])
        mx, my = x + 56 + 44, y + 56 + 44
        el(doc, "circle", cx=mx, cy=my, r=44, fill=lg(doc, [(0, L["grad"][0], 1), (1, L["grad"][1], 1)], 0, 0, 1, 1))
        T(doc, mx, my + 10, L["init"], 28, 700, L["ink"], anchor="middle", ls=0.5)
        T(doc, x + 172, y + 92, L["name"], 32, 700, INK)
        T(doc, x + 172, y + 124, "Lens  ·  " + L["role"], 19, 500, INK2)
        iy = y + 56 + 92 + 66
        for j, line in enumerate(layouts[i][0]):
            T(doc, x + 56, iy + j * 42, line, 31, 500, INK, italic=True)
        dy = iy + (max_idea - 1) * 42 + 44
        el(doc, "rect", x=x + 56, y=dy, width=cw - 112, height=1, fill=HAIR)
        T(doc, x + 56, dy + 44, "WHAT THIS LENS CHANGED", 14, 700, INK3, ls=2)
        by = dy + 88
        for b in L["bullets"]:
            el(doc, "circle", cx=x + 64, cy=by - 7, r=5, fill=LENS[L["key"]][0])
            by = P(doc, x + 84, by, b, 20, 400, "#D1D1D6", max_w=cw - 140, lh=29) + 29 + 22
        doc.close()
    T(doc, M, y + ch + 52, "Lenses are a thinking tool drawn from each leader’s publicly stated principles. "
                          "No affiliation or endorsement is implied.", 16, 400, INK3)
    doc.close()
    return y + ch + 52


SCENES = [
    dict(num="00", key="READY", title="A quiet glass slab", draw=s_ready, led="#8E93B8",
         replaces="Nothing today: the current reader has no calm resting state (the recording starts mid-flow).",
         pins=[(1, "JOBS", "island"), (2, "JOBS", (96, 262)), (3, "HUANG", "dock")],
         notes=[(1, "JOBS", "The Iris Island docks right under the camera: the one place anyone needs to look."),
                (2, "JOBS", "Lock-screen calm. Time, date and a clean location replace the truncated header."),
                (3, "HUANG", "Proximity wake in under 100 ms, and a single invitation: Look up to enter.")]),
    dict(num="01", key="FIND", title="Come a little closer", draw=s_find, led=AMBER,
         replaces="Position face here · Too far — move closer · 97 cm gauge · 00:19 countdown",
         pins=[(1, "MUSK", (RCX - RL - 20, RCY)), (2, "JOBS", "headline"), (3, "MUSK", "sub")],
         notes=[(1, "MUSK", "The tick ring is the distance gauge: it fills as you step in. No centimetres."),
                (2, "JOBS", "Amber means adjust, never error. A request, not a reading."),
                (3, "MUSK", "No countdown. The reader waits for people; people never race the reader.")]),
    dict(num="02", key="LOOK", title="Look up at the light", draw=s_look, led=WHITE,
         replaces="Please look up · Look at the iris camera above the screen · Good distance — hold still · Live IR feed",
         pins=[(1, "JOBS", "island"), (2, "HUANG", (HEAD[0] - 23 - 14, HEAD[1] - 4)), (3, "MUSK", (RCX + (RL + 20) * math.cos(math.radians(145)), RCY + (RL + 20) * math.sin(math.radians(145))))],
         notes=[(1, "JOBS", "The Island lights up and the instruction sits right beneath it, so reading it means looking at the camera."),
                (2, "HUANG", "Eye-lock reticles show the AI has both eyes. The silhouette is drawn from tracking points, never camera pixels."),
                (3, "MUSK", "Debug data (N:1 G:00, cm) moves to a service mode for technicians.")]),
    dict(num="03", key="LOOK", title="Hold still", draw=s_scan, led=WHITE,
         replaces="Iris captured · 00:20 seconds · Left / Right eye photos · Not captured",
         pins=[(1, "HUANG", (RCX + (RL + 20) * math.cos(math.radians(145)), RCY + (RL + 20) * math.sin(math.radians(145)))), (2, "HUANG", (HEAD[0] - 23 - 10, HEAD[1] + 6)), (3, "MUSK", "island")],
         notes=[(1, "HUANG", "Capture progress runs around the ring and each eye: one glance says how close you are."),
                (2, "HUANG", "Iris images never reach the glass. Each eye shows an abstract signature instead."),
                (3, "MUSK", "Liveness runs in parallel with capture. No extra step, no extra screen.")]),
    dict(num="04", key="ENTER", title="Welcome, Ma Lun", draw=s_enter, led=GREEN,
         replaces="Match tick · Welcome Ma Lun + device drawing · Door Unlocked · Please proceed.",
         pins=[(1, "MUSK", (SCX - 84, 300)), (2, "JOBS", "led"), (3, "JOBS", "dock")],
         notes=[(1, "MUSK", "Unlock fires at the match: tick, welcome and unlock become one moment, 2.6 s sooner."),
                (2, "JOBS", "Bloom, chime and status light land together: confirmation you feel without reading."),
                (3, "JOBS", "The only timer left belongs to the door, not the person.")]),
]

DOCK_LABEL = {"READY": ("Look up to enter", True), "ENTER": ("Relocks in 5 s", True)}


ISLAND_LABEL = {"00": None, "01": None, "02": "Look here", "03": "Scanning", "04": "Unlocked"}


def pin_target(scene, where):
    """Resolve a pin target to device coordinates: (target x, target y, pin y)."""
    if where == "island":  # elbow under the status row so the leader never crosses text
        w = island_w(ISLAND_LABEL[scene["num"]])
        tx, ty = SX + SCX - w / 2 + 20, SY + ISL_Y + ISL_H + 1
        return tx, ty, ty + 14
    if where == "dock":
        label, icon = DOCK_LABEL[scene["key"]]
        w = capsule_w(label, icon)
        tx, ty = SX + SCX - w / 2 - 2, SY + 572 + 25
    elif where == "headline":
        tx, ty = SX + SCX - tw("Come a little closer", 31, 600, -0.6) / 2 - 14, SY + 106
    elif where == "sub":
        tx, ty = SX + SCX - tw("Clear glasses are fine", 17, 400) / 2 - 14, SY + 142
    elif where == "led":
        tx, ty = 380 + 7, 62
    else:
        tx, ty = SX + where[0], SY + where[1]
    return tx, ty, ty


def sec_redesign(doc, y):
    doc.open(name="03 · The redesign — core scenes")
    stage_idx = doc.placeholder()
    top = y
    y = section_head(doc, y, "03", "THE REDESIGN", "Five states. One living screen.",
                     "The reader never jumps between screens. The Iris Island, the tick ring and the light carry the "
                     "person from approach to the open door. Each state maps to screens in the recording.")
    # legend
    lx = W - M - 640
    T(doc, lx, top + 72 - 34, "PINS", 14, 700, INK3, ls=2)
    for i, k in enumerate(("JOBS", "MUSK", "HUANG")):
        lens_dot(doc, lx + i * 214 + 7, top + 72, k, LENS_NAME[k])
    T(doc, lx, top + 126 - 6, "MOMENTS", 14, 700, INK3, ls=2)
    for i, (k, lab) in enumerate((("READY", "Ready"), ("FIND", "Find"), ("LOOK", "Look"), ("ENTER", "Enter"))):
        el(doc, "rect", x=lx + i * 160, y=top + 136, width=26, height=6, rx=3, fill=MOMENT[k])
        T(doc, lx + i * 160 + 36, top + 145, lab, 18, 500, INK2)

    gap = (CW - 5 * DW) / 4
    dy = y + 116
    bottom = 0
    for i, s in enumerate(SCENES):
        x = M + i * (DW + gap)
        col = MOMENT[s["key"]]
        el(doc, "circle", cx=x + 6, cy=dy - 82, r=6, fill=col)
        T(doc, x + 22, dy - 76, f"{s['num']}  ·  {s['key']}", 16, 700, col, ls=2.5)
        T(doc, x, dy - 34, s["title"], 30, 600, INK, ls=-0.5)
        device(doc, x, dy, s["draw"], f"Scene {s['num']} · {s['key'].title()} · {s['title']}", led=s["led"])
        doc.open(name=f"Scene {s['num']} pins", transform=f"translate({num(x)} {dy})")
        for n, key, where in s["pins"]:
            tx, ty, py = pin_target(s, where)
            px = DW + 38 if where == "led" else -38
            pin(doc, px, py, n, key, tx, ty)
        doc.close()
        ny = dy + DH + 70
        doc.open(name=f"Scene {s['num']} notes")
        T(doc, x, ny, "REPLACES", 13, 700, INK3, ls=2)
        ny = P(doc, x, ny + 30, s["replaces"], 17, 400, "#FF8A80", max_w=DW, lh=25, op=0.92) + 58
        ny = note_list(doc, x, ny, s["notes"], DW)
        doc.close()
        bottom = max(bottom, ny)
    end = bottom + 10
    doc.body[stage_idx] = (
        f'<rect id="{doc.name("Stage")}" x="0" y="{num(top - 110)}" width="{W}" height="{num(end - top + 200)}" '
        f'fill="{lg(doc, [(0, "#0C0C10", 1), (0.5, "#111217", 1), (1, "#0C0C10", 1)])}"/>'
        f'<rect x="0" y="{num(top - 110)}" width="{W}" height="1" fill="{HAIR}"/>'
        f'<rect x="0" y="{num(end + 89)}" width="{W}" height="1" fill="{HAIR}"/>')
    doc.close()
    return end + 90


EDGES = [
    dict(title="One eye missed", key="FIND", draw=s_one_eye, led=AMBER, tag="SEEN IN RECORDING",
         note="Recovery is specific and kind. A green tick never appears beside a failure, as it did in the recording."),
    dict(title="Not recognised", key="FIND", draw=s_retry, led=AMBER, tag=None,
         note="One automatic retry, then a graceful hand-off to the fingerprint sensor right below the screen."),
    dict(title="No access", key="ALERT", draw=s_denied, led=RED, tag=None,
         note="Clear and private, never alarming. Red is reserved for this single state."),
    dict(title="Airlock in use", key="FIND", draw=s_wait, led=AMBER, tag=None,
         note="The anti-tailgating interlock, explained in plain words, with a real wait time."),
]


def sec_edges(doc, y):
    doc.open(name="04 · Unhappy paths")
    y = section_head(doc, y, "04", "UNHAPPY PATHS, DESIGNED IN", "When it doesn’t just work.",
                     "Only the half-captured eye appears in the recording. The rest are designed so that every "
                     "failure ends with one clear next step, in the same glass language.")
    gap = (CW - 4 * DW) / 3
    dy = y + 116
    bottom = 0
    for i, e in enumerate(EDGES):
        x = M + i * (DW + gap)
        col = MOMENT[e["key"]]
        el(doc, "circle", cx=x + 6, cy=dy - 82, r=6, fill=col)
        T(doc, x + 22, dy - 76, f"E{i + 1}", 16, 700, col, ls=2.5)
        if e["tag"]:
            tw_ = tw(e["tag"], 12, 700, 1.5) + 24
            el(doc, "rect", x=x + 64, y=dy - 96, width=tw_, height=26, rx=13, fill=RED, fill_opacity=0.16,
               stroke=RED, stroke_opacity=0.5)
            T(doc, x + 64 + 12, dy - 78.5, e["tag"], 12, 700, "#FF8A80", ls=1.5)
        T(doc, x, dy - 34, e["title"], 30, 600, INK, ls=-0.5)
        device(doc, x, dy, e["draw"], f"Edge E{i + 1} · {e['title']}", led=e["led"])
        ny = P(doc, x, dy + DH + 70, e["note"], 19, 400, "#D1D1D6", max_w=DW, lh=28)
        bottom = max(bottom, ny)
    doc.close()
    return bottom + 40


def sec_system(doc, y):
    doc.open(name="05 · Liquid Glass reader system")
    y = section_head(doc, y, "05", "LIQUID GLASS READER SYSTEM", "Materials, states and signals.",
                     "A deliberately small system that ships on today’s hardware: three glass materials, one Island, "
                     "seven colours and one multisensory state machine.")
    rh = 600
    # A — materials
    ax, aw = M, 1180
    doc.open(name="Materials")
    aurora_tile(doc, ax, y, aw, rh, 36, "neutral", name="Materials backdrop")
    T(doc, ax + 48, y + 66, "Materials", 30, 600, WHITE)
    T(doc, ax + 48, y + 98, "Translucent, specular, and always legible over the aurora.", 18, 400, WHITE, op=0.7)
    cols = [ax + aw * (2 * i + 1) / 6 for i in range(3)]
    sy = y + 250
    # regular
    w = island_w("Look here") * 1.45
    glass_rect(doc, cols[0] - w / 2, sy - 32, w, 64, 32, name="Sample · Glass regular", edge=True)
    g_iris(doc, cols[0] - w / 2 + 38, sy, 26, CYAN, 1)
    T(doc, cols[0] - w / 2 + 64, sy + 8, "Look here", 22, 600, WHITE)
    # clear
    glass_circle(doc, cols[1], sy, 78, kind="clear", name="Sample · Glass clear")
    doc.open(clip_path=clip_circle(doc, cols[1], sy, 77))
    silhouette(doc, cols[1], sy - 4, 0.62)
    doc.close()
    ticks(doc, cols[1], sy, 88, 98, 72, 1.0, WHITE, lit_a=0.85, glow=False, sw=2.2)
    # tinted
    for j, col in enumerate((AMBER, CYAN, GREEN, RED)):
        cx = cols[2] + (j % 2 - 0.5) * 92
        cy = sy + (j // 2 - 0.5) * 92
        glass_circle(doc, cx, cy, 38, tint=col, glow=(col, 0.3, 14), name="Sample · Glass tinted", edge=True)
    specs = [("Glass · Regular", "Island, docks, capsules. White 22→7 %, 1.25 px specular rim, 1.5 px inner light, caustic glow, shadow 0/10/32 @ 32 %."),
             ("Glass · Clear", "The mirror lens over the silhouette. White 10→3 %, rim only, so the person reads through it."),
             ("Glass · Tinted", "State colour 52→22 % under the same rim. Amber adjust, Cyan scan, Green go, Red stop.")]
    for cx, (t, d) in zip(cols, specs):
        T(doc, cx - 165, y + 428, t, 21, 600, WHITE)
        P(doc, cx - 165, y + 462, d, 16.5, 400, WHITE, max_w=330, lh=24, op=0.75)
    doc.close()

    # B — Iris Island states
    bx, bw = M + aw + 40, 840
    doc.open(name="Iris Island states")
    aurora_tile(doc, bx, y, bw, rh, 36, "look", name="Island backdrop")
    T(doc, bx + 48, y + 66, "Iris Island", 30, 600, WHITE)
    T(doc, bx + 48, y + 98, "One component, six states. It lives under the camera.", 18, 400, WHITE, op=0.7)
    states = [(None, "iris", None, False, "Ready", "Idle beacon under the lens"),
              ("Look here", "iris", None, True, "Look here", "Brightest thing on screen: the gaze target"),
              ("Scanning", "progress", None, False, "Scanning", "Progress lives where the eyes already are"),
              ("Unlocked", "lock_open", GREEN, False, "Unlocked", "Green tint; the lock opens"),
              ("No access", "lock", RED, False, "No access", "The only red in the system"),
              ("Wait", "hourglass", AMBER, False, "Wait", "Airlock interlock in use")]
    for j, (label, glyph, tint, bright, nm, desc) in enumerate(states):
        cy = y + 162 + j * 70
        w = island_w(label)
        x0 = bx + 48 + (180 - w) / 2
        doc.open(name=f"Island · {nm}")
        glass_rect(doc, x0, cy - ISL_H / 2, w, ISL_H, ISL_H / 2, kind="bright" if bright else "regular", tint=tint,
                   shadow=(0, 6, 12, "#000000", 0.35))
        gx = x0 + 26 if label else x0 + w / 2
        GLYPH[glyph](doc, gx, cy, 18, BLUE if bright else (CYAN if glyph == "progress" else WHITE), 1)
        if label:
            T(doc, gx + 18, cy + 5.4, label, 15, 600, INK_ON_GLASS if bright else WHITE)
        T(doc, bx + 270, cy - 2, nm, 19, 600, WHITE)
        T(doc, bx + 270, cy + 22, desc, 16, 400, WHITE, op=0.7)
        doc.close()
    doc.close()

    # C — colour + type
    cx0, cw0 = bx + bw + 40, W - M - (bx + bw + 40)
    doc.open(name="Colour and type")
    card(doc, cx0, y, cw0, rh, 36)
    T(doc, cx0 + 44, y + 66, "Colour", 30, 600, INK)
    tokens = [("Night", "#070B14"), ("Indigo", INDIGO), ("Teal", TEAL), ("Amber", AMBER), ("Cyan", CYAN),
              ("Green", GREEN), ("Red", RED)]
    sw_ = (cw0 - 88) / 7
    for j, (nm, hx) in enumerate(tokens):
        sx_ = cx0 + 44 + j * sw_ + sw_ / 2
        el(doc, "circle", cx=sx_, cy=y + 132, r=27, fill=hx, stroke=WHITE, stroke_opacity=0.18)
        T(doc, sx_, y + 186, nm, 15, 600, INK, anchor="middle")
        T(doc, sx_, y + 206, hx, 13, 500, INK3, anchor="middle")
    T(doc, cx0 + 44, y + 272, "Type", 30, 600, INK)
    T(doc, cx0 + cw0 - 44, y + 272, "SF Pro in production · Inter in Figma", 15, 500, INK3, anchor="end")
    ramp = [("4:01", 54, 300, "Clock · 116 / Light / −3"),
            ("Look up at the light", 31, 600, "Instruction · 31 / Semibold / −0.6"),
            ("Clear glasses are fine", 17, 400, "Supporting · 17 / Regular / 72 %"),
            ("Look here", 15, 600, "Island · 15 / Semibold"),
            ("Data Hall 01", 13, 600, "Status · 13 / Semibold / 80 %")]
    ry = y + 340
    for txt, size, wt, spec in ramp:
        T(doc, cx0 + 44, ry, txt, size, wt, INK, ls=-1.5 if size > 50 else (-0.6 if size > 30 else None))
        T(doc, cx0 + cw0 - 44, ry, spec, 15, 500, INK2, anchor="end")
        ry += {54: 62, 31: 50, 17: 40, 15: 38, 13: 30}[size]
    doc.close()

    # Row 2
    y2 = y + rh + 40
    rh2 = 470
    # D — multisensory table
    dx, dw = M, 1520
    doc.open(name="Multisensory state machine")
    card(doc, dx, y2, dw, rh2, 36)
    T(doc, dx + 48, y2 + 66, "Screen, light, sound and voice move together", 30, 600, INK)
    cols_ = [("STATE", 0), ("SCREEN", 230), ("STATUS LIGHT", 560), ("SOUND", 840), ("VOICE (OPTIONAL)", 1080)]
    hy = y2 + 124
    for lab, off in cols_:
        T(doc, dx + 48 + off, hy, lab, 13, 700, INK3, ls=2)
    rows = [("Ready", MOMENT["READY"], "Aurora, Island idle", "#8E93B8", "Dim white", "—", "—"),
            ("Find", AMBER, "Amber tick ring", AMBER, "Amber, breathing", "—", "“Come a little closer”"),
            ("Look", CYAN, "Island lights up", WHITE, "White, pulsing", "Soft tick", "“Look up at the light”"),
            ("Capture", CYAN, "Cyan progress", WHITE, "White, steady", "—", "—"),
            ("Enter", GREEN, "Green bloom", GREEN, "Green", "Rising chime", "“Welcome”"),
            ("No access", RED, "Red medallion", RED, "Red", "Low tone", "“No access”")]
    for j, (st, scol, scr, lcol, light, sound, voice) in enumerate(rows):
        ry = hy + 26 + j * 52
        el(doc, "rect", x=dx + 48, y=ry, width=dw - 96, height=1, fill=HAIR)
        by_ = ry + 34
        el(doc, "circle", cx=dx + 56, cy=by_ - 6, r=6, fill=scol)
        T(doc, dx + 72, by_, st, 19, 600, INK)
        T(doc, dx + 48 + 230, by_, scr, 19, 400, "#D1D1D6")
        el(doc, "circle", cx=dx + 48 + 568, cy=by_ - 6, r=6, fill=lcol)
        T(doc, dx + 48 + 584, by_, light, 19, 400, "#D1D1D6")
        T(doc, dx + 48 + 840, by_, sound, 19, 400, "#D1D1D6")
        T(doc, dx + 48 + 1080, by_, voice, 19, 400, "#D1D1D6")
    doc.close()

    # E — motion
    ex, ew = dx + dw + 40, 640
    doc.open(name="Motion")
    card(doc, ex, y2, ew, rh2, 36)
    T(doc, ex + 44, y2 + 66, "Motion", 30, 600, INK)
    motion = [("Island morph", "Spring · response 0.35 s · damping 0.8"),
              ("Tick ring", "Tracks distance every frame (≤ 16 ms)"),
              ("Success", "450 ms bloom · medallion 0.85 → 1.0"),
              ("Back to Ready", "8 s after the door relocks")]
    my_ = y2 + 128
    for t, d in motion:
        T(doc, ex + 44, my_, t, 20, 600, INK)
        T(doc, ex + 44, my_ + 30, d, 18, 400, INK2)
        my_ += 80
    doc.close()

    # F — accessibility
    fx0 = ex + ew + 40
    fw = W - M - fx0
    doc.open(name="Accessibility")
    card(doc, fx0, y2, fw, rh2, 36)
    T(doc, fx0 + 44, y2 + 66, "Accessible by default", 30, 600, INK)
    acc = ["Colour is never the only signal: icon, words, light and sound.",
           "No countdowns on people. The only timer is the door’s relock.",
           "Instructions at 31 pt, nothing below 13 pt; ≥ 7:1 contrast through the glass.",
           "Reduce Transparency turns glass into solid tinted panels.",
           "Optional voice prompts that scale with data-hall noise."]
    ay = y2 + 124
    for a in acc:
        el(doc, "circle", cx=fx0 + 52, cy=ay - 7, r=4.5, fill=BLUE)
        ay = P(doc, fx0 + 70, ay, a, 18, 400, "#D1D1D6", max_w=fw - 114, lh=26) + 26 + 16
    doc.close()
    doc.close()
    return y2 + rh2


def sec_metrics(doc, y):
    doc.open(name="06 · Measure and ship")
    y = section_head(doc, y, "06", "MEASURE & SHIP", "How we’ll know it’s better.",
                     "One north-star metric, time to door, plus guardrails for accuracy, privacy and trust.")
    rh = 560
    # latency chart
    lx, lw = M, 1640
    doc.open(name="Time to door")
    card(doc, lx, y, lw, rh, 36)
    T(doc, lx + 48, y + 66, "Time to door", 30, 600, INK)
    T(doc, lx + 48, y + 98, "Approach → “Door unlocked” message, seconds", 18, 400, INK2)
    ax0 = lx + 300
    scale = (lw - 300 - 150) / 5.0
    by1, by2, bh = y + 210, y + 336, 56
    floor_x = ax0 + 0.7 * scale
    el(doc, "path", d=f"M{num(floor_x)} {y + 156}V{by2 + bh + 22}", stroke=NV, stroke_width=2,
       stroke_dasharray="6 6")
    T(doc, floor_x + 12, y + 168, "Speed-of-light floor ≈ 0.7 s  (one glance + one exposure, est.)", 16, 600, NV)
    bars = [(by1, "Today", "recorded", [(1.0, AMBER, "Find 1.0"), (0.8, CYAN, "Look 0.8"), (0.3, INDIGO, "0.3"),
                                         (2.6, RED, "Confirmation screens 2.6")], "4.7 s"),
            (by2, "Redesign", "budget", [(0.3, AMBER, ""), (0.6, CYAN, "Look 0.6"), (0.3, INDIGO, "0.3"),
                                         (0.1, GREEN, "")], "1.3 s")]
    for byy, lab, sub, segs, total in bars:
        T(doc, lx + 48, byy + 26, lab, 24, 600, INK)
        T(doc, lx + 48, byy + 52, sub, 17, 400, INK2)
        x = ax0
        tot = sum(s[0] for s in segs)
        clipr = clip_rect(doc, ax0, byy, tot * scale, bh, 14)
        doc.open(name=f"Bar · {lab}", clip_path=clipr)
        for v, col, txt in segs:
            el(doc, "rect", x=x, y=byy, width=v * scale, height=bh, fill=col, fill_opacity=0.9 if col != RED else 0.75)
            if txt and tw(txt, 16, 700) + 16 < v * scale:
                T(doc, x + v * scale / 2, byy + bh / 2 + 6, txt, 16, 700,
                  "#0B0B0D" if col in (AMBER, CYAN, GREEN) else WHITE, anchor="middle")
            x += v * scale
        doc.close()
        T(doc, ax0 + tot * scale + 18, byy + bh / 2 + 11, total, 30, 700, INK)
    T(doc, ax0 + 0.15 * scale, by2 + bh + 36, "Confirmation: 0 s, it runs in parallel with the unlock", 16, 500, GREEN)
    for s in range(6):
        xx = ax0 + s * scale
        el(doc, "rect", x=xx, y=y + rh - 92, width=1, height=10, fill=INK3)
        T(doc, xx, y + rh - 62, f"{s} s", 15, 500, INK3, anchor="middle")
    el(doc, "rect", x=ax0, y=y + rh - 92, width=5 * scale, height=1, fill=HAIR)
    T(doc, lx + 48, y + rh - 26, "Today = pass 2 (face → match, 2.1 s) + pass 1 (match → “Door Unlocked”, 2.6 s), "
                                  "measured at 10 fps. Redesign = per-stage latency budget.", 15, 400, INK3)
    legend = [(AMBER, "Find"), (CYAN, "Look / align"), (INDIGO, "Capture + match"), (GREEN, "Unlock"),
              (RED, "Confirmation screens")]
    lgx = lx + lw - 48
    for col, t in reversed(legend):
        lgx -= tw(t, 15, 500) + 34
        el(doc, "rect", x=lgx, y=y + 58, width=14, height=14, rx=4, fill=col)
        T(doc, lgx + 22, y + 70, t, 15, 500, INK2)
    doc.close()

    # scorecard
    kx = lx + lw + 40
    kw = W - M - kx
    doc.open(name="Scorecard")
    card(doc, kx, y, kw, rh, 36)
    T(doc, kx + 48, y + 66, "Scorecard", 30, 600, INK)
    T(doc, kx + 48, y + 98, "North star plus guardrails", 18, 400, INK2)
    c1, c2 = kx + kw - 380, kx + kw - 180
    T(doc, kx + 48, y + 156, "METRIC", 13, 700, INK3, ls=2)
    T(doc, c1, y + 156, "TODAY", 13, 700, INK3, ls=2)
    T(doc, c2, y + 156, "TARGET", 13, 700, INK3, ls=2)
    rows = [("Time to door, p50", "≈ 4.7 s", "≤ 1.5 s", True),
            ("First-attempt success", "baseline", "≥ 97 %", False),
            ("Fallback to fingerprint / Security", "baseline", "≤ 2 %", False),
            ("Raw face / iris images on screen", "3", "0", False),
            ("“Felt effortless” (pilot survey)", "—", "≥ 4.5 / 5", False)]
    for j, (m_, t, g, star) in enumerate(rows):
        ry = y + 176 + j * 66
        el(doc, "rect", x=kx + 48, y=ry, width=kw - 96, height=1, fill=HAIR)
        T(doc, kx + 48, ry + 42, m_, 20, 600 if star else 400, INK)
        if star:
            sx_ = kx + 48 + tw(m_, 20, 600) + 14
            el(doc, "rect", x=sx_, y=ry + 22, width=118, height=26, rx=13, fill=BLUE, fill_opacity=0.18,
               stroke=BLUE, stroke_opacity=0.5)
            T(doc, sx_ + 59, ry + 40, "NORTH STAR", 12, 700, "#64B5FF", anchor="middle", ls=1.5)
        T(doc, c1, ry + 42, t, 20, 500, INK2)
        T(doc, c2, ry + 42, g, 20, 700, GREEN)
    T(doc, kx + 48, y + rh - 26, "Baselines for success and fallback rates are captured in the pilot.", 15, 400, INK3)
    doc.close()

    # rollout
    ry0 = y + rh + 40
    steps = [("1", "Prototype · 2 weeks", "Liquid Glass UI on today’s NOVA+ hardware. Same engine; the unlock moves to the match.", AMBER),
             ("2", "Validate · 20 people", "First-timers, glasses wearers and seated users. Time-to-door measured on video.", CYAN),
             ("3", "Pilot · Data Hall 01", "Four-week A/B against the current UI, with a kill switch if first-try success drops.", INDIGO),
             ("4", "Scale · OTA", "Fleet rollout. Service mode keeps cm, debug data and logs for technicians.", GREEN)]
    sw2 = (CW - 3 * 32) / 4
    sh = 204
    doc.open(name="Rollout")
    for j, (n, t, d, col) in enumerate(steps):
        x = M + j * (sw2 + 32)
        card(doc, x, ry0, sw2, sh, 32)
        el(doc, "rect", x=x + 44, y=ry0, width=80, height=4, rx=2, fill=col)
        T(doc, x + 44, ry0 + 84, n, 48, 700, col)
        T(doc, x + 100, ry0 + 76, t, 24, 600, INK)
        P(doc, x + 44, ry0 + 134, d, 18, 400, INK2, max_w=sw2 - 88, lh=27)
        if j < 3:
            g_chev_right(doc, x + sw2 + 16, ry0 + sh / 2, 22, INK3, 1)
    doc.close()

    # the ask
    ay = ry0 + sh + 40
    ah = 196
    doc.open(name="The ask")
    el(doc, "rect", x=M, y=ay, width=CW, height=ah, rx=36,
       fill=lg(doc, [(0, "#0A2A4D", 1), (0.55, "#0D1B33", 1), (1, "#101826", 1)], 0, 0, 1, 1),
       stroke=lg(doc, [(0, BLUE, 0.9), (0.5, BLUE, 0.25), (1, CYAN, 0.6)], 0, 0, 1, 1), stroke_width=1.5)
    T(doc, M + 56, ay + 64, "THE ASK", 16, 700, "#64B5FF", ls=3)
    T(doc, M + 56, ay + 116, "Approve a two-week prototype on today’s NOVA+ hardware.", 40, 700, INK, ls=-0.8)
    T(doc, M + 56, ay + 156, "No new sensors, no new matching engine. One integration change: signal the unlock at the "
                             "match, in parallel with the welcome.", 21, 400, INK2)
    chips = ["No hardware change", "No engine change", "Reversible over the air"]
    cx_ = W - M - 56
    for c in reversed(chips):
        w = tw(c, 17, 600) + 52
        cx_ -= w
        el(doc, "rect", x=cx_, y=ay + 46, width=w, height=40, rx=20, fill=WHITE, fill_opacity=0.06, stroke=WHITE,
           stroke_opacity=0.16)
        g_check(doc, cx_ + 22, ay + 66, 16, GREEN, 1, sw=2.2)
        T(doc, cx_ + 36, ay + 72, c, 17, 600, INK)
        cx_ -= 12
    doc.close()
    doc.close()
    return ay + ah


def footer(doc, y):
    doc.open(name="Footer")
    el(doc, "rect", x=M, y=y, width=CW, height=1, fill=HAIR)
    P(doc, M, y + 44, "Source: on-device recording of the NOVA+ reader, 9 Oct 2026, on-screen clock 16:01:15–16:01:24 (10.4 s, two "
                      "passes); timings measured frame by frame at 10 fps. Recorded screens are redrawn as low-fi "
                      "replicas; no biometric imagery is reproduced. Lenses are a thinking tool drawn from public "
                      "principles; no affiliation or endorsement implied. All layers are editable vectors: Inter in "
                      "Figma, SF Pro in production.", 16, 400, INK3, max_w=CW - 420, lh=25)
    T(doc, W - M, y + 44, "NOVA+  ·  Iris Reader  ·  v1.0", 16, 600, INK2, anchor="end")
    doc.close()
    return y + 120


def build():
    doc = Doc(W)
    bg_idx = doc.placeholder()
    y = header(doc)
    y = sec_today(doc, y + 150)
    y = sec_lenses(doc, y + 150)
    y = sec_redesign(doc, y + 210)
    y = sec_edges(doc, y + 130)
    y = sec_system(doc, y + 150)
    y = sec_metrics(doc, y + 150)
    y = footer(doc, y + 110)
    doc.h = y
    doc.body[bg_idx] = f'<rect id="{doc.name("Board background")}" width="{W}" height="{num(y)}" fill="{BG}"/>'
    doc.body.insert(0, f'<g id="{doc.name("NOVA+ Iris Reader · Liquid Glass redesign")}">')
    doc.body.append("</g>")
    return doc


if __name__ == "__main__":
    d = build()
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(d.render())
    print(f"wrote {OUT}  {d.w}×{num(d.h)}  {os.path.getsize(OUT) / 1024:.0f} KB  defs={len(d.defs)}")
    if MISSING:
        print("missing glyphs:", "".join(sorted(MISSING)))
