#!/usr/bin/env python3
"""Animated NOVA+ reader UI for the mirror video.

One SVG per frame (30 fps) on the timeline measured from the recording:
  pass 1  find f1–37 · look f38 · capture f44 · match f51 · relock/fade f188
  pass 2  find f190 · look f220 · eyes lock f233 · capture f245 · match f254
Canvas is the physical panel aspect measured from the footage (0.589): 416 × 706.
"""
import math
import os
import sys

sys.path.insert(0, os.environ.get("BOARD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")))
import build_board as bb  # noqa: E402
from build_board import (Doc, el, T, lg, rg, fx, glass_rect, glass_circle, ticks, silhouette, reticle,  # noqa: E402
                         iris_sig, arc_d, tw, num, g_iris, g_progress, g_lock_open, g_check, g_chev_up, MOODS,
                         WHITE, AMBER, CYAN, GREEN, BLUE, INK_ON_GLASS)

UW, UH = 416, 706
SCALE = 2.5
SCX = UW / 2
RCX, RCY, RL = 208, 350, 110
ISL_Y, ISL_H = 12, 38
FPS = 30

# ── timeline (frame numbers are 1-based, t = (f-1)/30) ──
F_LOOK1, F_LOCK1, F_CAP1, F_MATCH1 = 38, 40, 44, 51
F_OUT1, F_FIND2, F_LOOK2, F_LOCK2, F_CAP2, F_MATCH2 = 187, 190, 220, 233, 245, 254
HOLD_OPEN = 4.6  # seconds the door stays unlocked after a match
FILL1 = [(1, 0.26), (10, 0.24), (20, 0.40), (30, 0.74), (36, 0.94), (38, 1.0)]
K1 = [(1, 0.62), (20, 0.66), (30, 0.80), (36, 0.94), (38, 1.0)]
FILL2 = [(190, 0.35), (200, 0.58), (210, 0.80), (216, 0.93), (219, 1.0)]
K2 = [(190, 0.72), (200, 0.82), (210, 0.92), (219, 1.0)]


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, t):
    return a + (b - a) * t


def ease(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def spring(t):
    """0 → 1 with a soft ~8% overshoot (iOS-style spring, damping ≈ 0.8)."""
    if t <= 0:
        return 0.0
    return 1 - math.exp(-6 * t) * math.cos(7.5 * t) if t < 1.6 else 1.0


def prog(f, f0, f1):
    return clamp((f - f0) / (f1 - f0))


def keyed(f, keys):
    if f <= keys[0][0]:
        return keys[0][1]
    for (f0, v0), (f1, v1) in zip(keys, keys[1:]):
        if f <= f1:
            return lerp(v0, v1, (f - f0) / (f1 - f0))
    return keys[-1][1]


def mix(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(lerp(x, y, clamp(t))):02X}" for x, y in zip(a, b))


# ── state machine ────────────────────────────────────────────────────────────
def phase(f):
    """Return (pass, name, frames since phase start, match frame)."""
    if f < F_LOOK1:
        return 1, "find", f - 1, F_MATCH1
    if f < F_CAP1:
        return 1, "look", f - F_LOOK1, F_MATCH1
    if f < F_MATCH1:
        return 1, "capture", f - F_CAP1, F_MATCH1
    if f < F_FIND2:
        return 1, "enter", f - F_MATCH1, F_MATCH1
    if f < F_LOOK2:
        return 2, "find", f - F_FIND2, F_MATCH2
    if f < F_CAP2:
        return 2, "look", f - F_LOOK2, F_MATCH2
    if f < F_MATCH2:
        return 2, "capture", f - F_CAP2, F_MATCH2
    return 2, "enter", f - F_MATCH2, F_MATCH2


# ── drawing ──────────────────────────────────────────────────────────────────
def wallpaper(doc, mood, op=1.0):
    m = MOODS[mood]
    sy = UH / 666
    doc.open(name=f"Wallpaper · {mood}", opacity=op if op < 0.999 else None)
    el(doc, "rect", width=UW, height=UH, fill=lg(doc, [(0, m["top"], 1), (1, m["bot"], 1)]))
    for bx, by, rx, ry, col, a in m["blobs"]:
        el(doc, "ellipse", cx=bx, cy=by * sy, rx=rx, ry=ry * sy,
           fill=rg(doc, [(0, col, a), (0.45, col, a * 0.5), (1, col, 0)]))
    doc.close()


def mood_layers(f):
    p, name, n, M = phase(f)
    order = {"find": "guide", "look": "look", "capture": "scan", "enter": "success"}
    cur = order[name]
    prev = {"find": "success" if p == 2 else "guide", "look": "guide", "capture": "look", "enter": "scan"}[name]
    w = ease(n / 9) if not (p == 1 and name == "find") else 1.0
    if p == 2 and name == "find":
        w = ease(prog(f, F_OUT1 + 1, F_FIND2 + 9))
    return prev, cur, w


ISLAND = {
    "find": dict(glyph="iris", label=None, bright=0.0, tint=None, gcol=WHITE, gop=0.72, tcol=WHITE),
    "look": dict(glyph="iris", label="Look here", bright=1.0, tint=None, gcol=BLUE, gop=1.0, tcol=INK_ON_GLASS),
    "capture": dict(glyph="progress", label="Scanning", bright=0.0, tint=None, gcol=CYAN, gop=1.0, tcol=WHITE),
    "enter": dict(glyph="lock_open", label="Unlocked", bright=0.0, tint=GREEN, gcol=WHITE, gop=1.0, tcol=WHITE),
}
PREV = {"find": "enter", "look": "find", "capture": "look", "enter": "capture"}


def island_w(label):
    return 84 if not label else 18 + 9 + tw(label, 15, 600) + 34


def island_content(doc, st, op, cap_p):
    if op <= 0.01:
        return
    cy = ISL_Y + ISL_H / 2
    doc.open(opacity=op if op < 0.999 else None)
    if st["label"]:
        lw = tw(st["label"], 15, 600)
        x0 = SCX - (18 + 9 + lw) / 2
        gx = x0 + 9
        if st["glyph"] == "progress":
            g_progress(doc, gx, cy, 18, CYAN, 1, frac=max(0.04, cap_p))
        else:
            bb.GLYPH[st["glyph"]](doc, gx, cy, 18, st["gcol"], st["gop"])
        T(doc, gx + 18, cy + 5.4, st["label"], 15, 600, st["tcol"])
    else:
        bb.GLYPH[st["glyph"]](doc, SCX, cy, 18, st["gcol"], st["gop"])
    doc.close()


def island(doc, f):
    p, name, n, M = phase(f)
    a, b = ISLAND[PREV[name]], ISLAND[name]
    if p == 1 and name == "find":
        u = 1.0
    elif p == 2 and name == "find":
        u = prog(f, F_OUT1 + 1, F_FIND2 + 8)
    else:
        u = clamp(n / {"look": 8, "capture": 5, "enter": 8}[name])
    ws = spring(u * 1.25)
    w = lerp(island_w(a["label"]), island_w(b["label"]), ws)
    bright = lerp(a["bright"], b["bright"], ease(u))
    tint_a = (1 - ease(u)) if a["tint"] else 0.0
    tint_b = ease(u) if b["tint"] else 0.0
    x = SCX - w / 2
    cy = ISL_Y + ISL_H / 2
    look_w = bright
    doc.open(name="Iris Island")
    if look_w > 0.01:  # light from the island toward the camera
        pulse = 0.5 + 0.06 * math.sin(f / FPS * 2 * math.pi * 1.4)
        el(doc, "ellipse", cx=SCX, cy=cy + 4, rx=w * 0.95 + 34, ry=78,
           fill=rg(doc, [(0, WHITE, 0.55), (0.45, WHITE, 0.2), (1, WHITE, 0)]), opacity=round(look_w * pulse * 1.6, 3))
    if bright > 0.01:
        el(doc, "rect", x=x, y=ISL_Y, width=w, height=ISL_H, rx=ISL_H / 2,
           fill=lg(doc, [(0, WHITE, 0.92), (1, WHITE, 0.72)]), opacity=round(bright, 3))
    for tint, tw_ in ((a["tint"], tint_a), (b["tint"], tint_b)):
        if tint and tw_ > 0.01:
            el(doc, "rect", x=x, y=ISL_Y, width=w, height=ISL_H, rx=ISL_H / 2,
               fill=lg(doc, [(0, tint, 0.62), (1, tint, 0.3)]), opacity=round(tw_, 3))
    glass_rect(doc, x, ISL_Y, w, ISL_H, ISL_H / 2, shadow=(0, 6, 12, "#000000", 0.35), name="Capsule")
    cap_p = capture_progress(f)
    island_content(doc, a, 1 - ease(u / 0.45), cap_p)
    island_content(doc, b, ease((u - 0.3) / 0.7), cap_p)
    doc.close()


def capture_progress(f):
    if F_CAP1 <= f < F_MATCH1:
        return prog(f, F_CAP1, F_MATCH1 - 0.5)
    if F_CAP2 <= f < F_MATCH2:
        return prog(f, F_CAP2, F_MATCH2 - 0.5)
    return 1.0 if f >= F_MATCH1 else 0.0


def headline_layers(f):
    """List of (title, sub, opacity, dy) — crossfading instruction text."""
    p, name, n, M = phase(f)
    copy = {"find": ("Come a little closer", "Clear glasses are fine"), "look": ("Look up at the light", None),
            "capture": ("Hold still", None)}
    if name == "enter":
        prev = copy["capture"]
        o = 1 - ease(n / 4)
        return [(prev[0], prev[1], o, -6 * ease(n / 4))] if o > 0.01 else []
    cur = copy[name]
    if p == 1 and name == "find":
        return [(cur[0], cur[1], 1.0, 0)]
    if p == 2 and name == "find":
        u = prog(f, F_FIND2, F_FIND2 + 7)
        return [(cur[0], cur[1], ease(u), 8 * (1 - ease_out(u)))]
    prev = copy[PREV[name]]
    if name == "capture":
        u_out, u_in = clamp(n / 3), clamp((n - 1) / 4)
    else:
        u_out, u_in = clamp(n / 4), clamp((n - 2) / 6)
    out = []
    if u_out < 1:
        out.append((prev[0], prev[1], 1 - ease(u_out), -6 * ease(u_out)))
    if u_in > 0:
        out.append((cur[0], cur[1], ease(u_in), 8 * (1 - ease_out(u_in))))
    return out


def headlines(doc, f):
    for title, sub, op, dy in headline_layers(f):
        doc.open(opacity=round(op, 3) if op < 0.999 else None)
        T(doc, SCX, 118 + dy, title, 31, 600, WHITE, anchor="middle", ls=-0.6)
        if sub:
            T(doc, SCX, 150 + dy, sub, 17, 400, WHITE, anchor="middle", op=0.72)
        doc.close()


def ring_params(f):
    """Opacity, scale, lit fraction, lit colour, rest alpha, silhouette k."""
    p, name, n, M = phase(f)
    if name == "find":
        fill = keyed(f, FILL1 if p == 1 else FILL2)
        k = keyed(f, K1 if p == 1 else K2)
        op, sc = 1.0, 1.0
        if p == 2:
            u = prog(f, F_FIND2 - 1, F_FIND2 + 8)
            op, sc = ease(u), lerp(0.9, 1.0, ease_out(u))
        return dict(op=op, sc=sc, lit=fill, col=AMBER, rest=0.16, k=k)
    if name == "look":
        return dict(op=1.0, sc=1.0, lit=1.0, col=mix(AMBER, WHITE, n / 5), rest=0.16, k=1.0)
    if name == "capture":
        cp = capture_progress(f)
        return dict(op=1.0, sc=1.0, lit=cp, col=CYAN, rest=lerp(0.92, 0.32, ease(n / 4)), k=1.0)
    c = ease_out(n / 8)  # enter: collapse into the medallion
    return dict(op=1 - c, sc=1 - 0.35 * c, lit=1.0, col=mix(CYAN, GREEN, ease(n / 3)), rest=0.2, k=1.0)


def eyes(doc, f, hx, hy, k):
    p, name, n, M = phase(f)
    if name == "find" or name == "enter":
        return
    L, R = (hx - 23 * k, hy - 4 * k), (hx + 23 * k, hy - 4 * k)
    if name == "look":
        lock_f = F_LOCK1 if p == 1 else F_LOCK2
        appear = ease(prog(f, (F_LOOK1 if p == 1 else F_LOOK2), (F_LOOK1 if p == 1 else F_LOOK2) + 4))
        if f < lock_f:  # searching: dashed, breathing
            s = 1.18 + 0.05 * math.sin(f / FPS * 2 * math.pi * 2.2)
            for (x, y), side in ((L, -1), (R, 1)):
                reticle(doc, x, y, 12 * s, WHITE, side, op=0.55 * appear, dashed=True)
        else:  # locked: spring in, cyan
            s = lerp(1.35, 1.0, spring((f - lock_f) / 8))
            for (x, y), side in ((L, -1), (R, 1)):
                reticle(doc, x, y, 12 * s, CYAN, side, op=1.0)
        return
    # capture
    f0 = F_CAP1 if p == 1 else F_CAP2
    span = (F_MATCH1 if p == 1 else F_MATCH2) - f0
    pl = prog(f, f0, f0 + span * 0.55)
    pr = prog(f, f0 + span * 0.3, f0 + span - 0.5)
    for (x, y), pe, side in ((L, pl, -1), (R, pr, 1)):
        if pe >= 1:
            el(doc, "circle", cx=x, cy=y, r=13, stroke=GREEN, stroke_width=2)
            iris_sig(doc, x, y, 11, GREEN)
            done_f = f0 + (span * 0.55 if side < 0 else span - 0.5)
            bs = spring((f - done_f) / 5)
            bx, by = x + side * 11, y - 11
            el(doc, "circle", cx=bx, cy=by, r=7.5 * bs, fill=GREEN, stroke="#000000", stroke_opacity=0.35)
            if bs > 0.4:
                g_check(doc, bx, by + 0.5, 11 * bs, WHITE, 1, sw=2)
        else:
            el(doc, "circle", cx=x, cy=y, r=13, stroke=WHITE, stroke_opacity=0.28, stroke_width=2)
            if pe > 0.02:
                el(doc, "path", d=arc_d(x, y, 13, -90, -90 + 360 * pe), stroke=CYAN, stroke_width=2.4,
                   stroke_linecap="round")
            iris_sig(doc, x, y, 11, CYAN, frac=max(0.0, pe))


def mirror(doc, f):
    rp = ring_params(f)
    if rp["op"] <= 0.01:
        return
    sc, op, k = rp["sc"], rp["op"], rp["k"]
    rl = RL * sc
    doc.open(name="Mirror", opacity=round(op, 3) if op < 0.999 else None)
    glass_circle(doc, RCX, RCY, rl, kind="clear", shadow=(0, 16, 26, "#000000", 0.40), name="Lens · Glass clear")
    hx, hy = RCX, RCY - 10 + (1 - k) * 22
    doc.open(name="Silhouette mask", clip_path=bb.clip_circle(doc, RCX, RCY, rl - 1))
    silhouette(doc, hx, hy, k * sc, 1.0)
    doc.close()
    ticks(doc, RCX, RCY, (RL + 13) * sc, (RL + 27) * sc, 96, rp["lit"], rp["col"], base_a=rp["rest"])
    eyes(doc, f, hx, hy, k)
    doc.close()


def gaze_cue(doc, f):
    p, name, n, M = phase(f)
    if name != "look":
        if name == "capture" and n < 5:
            w = 1 - ease(n / 5)
        else:
            return
    else:
        w = ease(n / 5)
    el(doc, "path", name="Gaze beam", d=f"M{SCX - 70} 40L{SCX + 70} 40L{SCX + 160} 230L{SCX - 160} 230Z",
       fill=lg(doc, [(0, WHITE, 0.26), (1, WHITE, 0)]), filter=fx(doc, (SCX - 160, 40, 320, 190), blur=14),
       opacity=round(w, 3))
    if name == "look":
        cyc = (f / FPS * 1.6) % 1.0  # chevrons flow upward toward the island
        for i in range(3):
            ph = (cyc + i / 3) % 1.0
            y = 86 - ph * 22
            o = math.sin(ph * math.pi) * 0.9 * w
            g_chev_up(doc, SCX, y, 18, WHITE, round(o, 3))


def check_draw(doc, cx, cy, s, sw, p):
    if p <= 0.02:
        return
    k = s / 24
    pts = [(cx + (5 - 12) * k, cy + (12.5 - 12) * k), (cx + (10 - 12) * k, cy + (17.5 - 12) * k),
           (cx + (19.5 - 12) * k, cy + (7 - 12) * k)]
    L = math.dist(pts[0], pts[1]) + math.dist(pts[1], pts[2])
    d = f"M{num(pts[0][0])} {num(pts[0][1])}L{num(pts[1][0])} {num(pts[1][1])}L{num(pts[2][0])} {num(pts[2][1])}"
    el(doc, "path", d=d, stroke=WHITE, stroke_width=sw, stroke_linecap="round", stroke_linejoin="round",
       stroke_dasharray=num(L), stroke_dashoffset=num(L * (1 - clamp(p))))


def enter_layer(doc, f):
    for M, f_end in ((F_MATCH1, F_FIND2 + 5), (F_MATCH2, 10 ** 6)):
        if M <= f < f_end:
            enter_pass(doc, f, M, 1 - ease(prog(f, F_OUT1, F_FIND2 + 4)) if M == F_MATCH1 else 1.0)


def enter_pass(doc, f, M, fade):
    n = f - M
    t = (f - 1) / FPS
    t_match = (M - 1) / FPS
    if fade <= 0.01:
        return
    doc.open(name="Enter", opacity=round(fade, 3) if fade < 0.999 else None)
    # bloom
    b = ease(n / 6) * lerp(1.0, 0.75, ease(prog(n, 8, 34)))
    el(doc, "ellipse", name="Bloom", cx=RCX, cy=RCY, rx=lerp(120, 330, ease_out(n / 14)), ry=lerp(120, 330, ease_out(n / 14)),
       fill=rg(doc, [(0, GREEN, 0.55), (0.5, GREEN, 0.18), (1, GREEN, 0)]), opacity=round(b, 3))
    # ripples settling outward
    r1 = ease_out(prog(n, 2, 18))
    r2 = ease_out(prog(n, 5, 24))
    if r1 > 0:
        ticks(doc, RCX, RCY, lerp(88, 104, r1), lerp(96, 112, r1), 96, 1.0, GREEN, lit_a=round(0.5 * ease(r1 * 2), 3),
              glow=False, sw=2.2, name="Ripple 1")
    if r2 > 0:
        ticks(doc, RCX, RCY, lerp(104, 128, r2), lerp(109, 133, r2), 96, 1.0, GREEN, lit_a=round(0.2 * ease(r2 * 2), 3),
              glow=False, sw=2, name="Ripple 2")
    # medallion
    s = spring(n / 11)
    r = 84 * (0.55 + 0.45 * s)
    mo = ease(n / 4)
    doc.open(name="Medallion", opacity=round(mo, 3) if mo < 0.999 else None)
    glass_circle(doc, RCX, RCY, r, tint=GREEN, glow=(GREEN, 0.5, 26), shadow=(0, 14, 24, "#000000", 0.45),
                 name="Glass tinted", edge=True)
    check_draw(doc, RCX, RCY + 2, 78 * (r / 84), 9 * (r / 84), ease_out(prog(n, 4, 12)))
    doc.close()
    # text
    wo, wdy = ease(prog(n, 3, 11)), 10 * (1 - ease_out(prog(n, 3, 14)))
    if wo > 0.01:
        T(doc, SCX, RCY + 158 + wdy, "Welcome, Ma Lun", 34, 600, WHITE, anchor="middle", ls=-0.6, op=round(wo, 3))
    do_ = ease(prog(n, 6, 14))
    if do_ > 0.01:
        T(doc, SCX, RCY + 192 + 10 * (1 - ease_out(prog(n, 6, 16))), "Door unlocked — go ahead", 18, 400, WHITE,
          anchor="middle", op=round(0.78 * do_, 3))
    # relock capsule with a live countdown
    co = ease(prog(n, 9, 17))
    if co > 0.01:
        remaining = max(0.0, t_match + HOLD_OPEN - t)
        label = f"Relocks in {max(1, math.ceil(remaining - 1e-6))} s"
        lw = tw("Relocks in 5 s", 17, 600)
        w = lw + 30 + 56
        x = SCX - w / 2
        y = 606 + 10 * (1 - ease_out(prog(n, 9, 19)))
        doc.open(name="Relock", opacity=round(co, 3) if co < 0.999 else None)
        glass_rect(doc, x, y, w, 50, 25, name="Capsule")
        sx = SCX - (lw + 30) / 2
        g_progress(doc, sx + 10, y + 25, 20, GREEN, 1, frac=max(0.02, remaining / HOLD_OPEN))
        T(doc, sx + 30, y + 25 + 17 * 0.36, label, 17, 600, WHITE)
        doc.close()
    doc.close()


def status(doc):
    T(doc, 26, 36, "Data Hall 01", 13, 600, WHITE, op=0.8)
    T(doc, UW - 26, 36, "4:01 PM", 13, 600, WHITE, anchor="end", op=0.8)


def frame_svg(f):
    doc = Doc(UW)
    doc.h = UH
    prev, cur, w = mood_layers(f)
    if w < 0.999:
        wallpaper(doc, prev)
    wallpaper(doc, cur, w if w < 0.999 else 1.0)
    status(doc)
    gaze_cue(doc, f)
    mirror(doc, f)
    enter_layer(doc, f)
    headlines(doc, f)
    island(doc, f)
    svg = doc.render()
    # raster size = SCALE × canvas
    return svg.replace(f'width="{UW}" height="{UH}"', f'width="{int(UW * SCALE)}" height="{int(UH * SCALE)}"', 1)


if __name__ == "__main__":
    out = sys.argv[1]
    frames = range(1, 289) if len(sys.argv) < 3 else [int(x) for x in sys.argv[2].split(",")]
    os.makedirs(out, exist_ok=True)
    for f in frames:
        with open(os.path.join(out, f"{f:04d}.svg"), "w", encoding="utf-8") as fh:
            fh.write(frame_svg(f))
    print("wrote", len(list(frames)), "frames to", out)
