#!/usr/bin/env python3
"""Before | after, frame-synced: original recording vs the same moment with the Liquid Glass UI."""
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC, COMP, OUT = "src", "comp", sys.argv[1] if len(sys.argv) > 1 else "sbs"
N = 311
VW, VH = 1080, 1920
BAND = 220
CW, CH = VW * 2, VH + BAND
FD = "/usr/share/fonts/opentype/inter/"
F_SEMI = ImageFont.truetype(FD + "Inter-SemiBold.otf", 34)
F_BOLD = ImageFont.truetype(FD + "Inter-Bold.otf", 30)
F_SMALL = ImageFont.truetype(FD + "Inter-Medium.otf", 24)
F_TINY = ImageFont.truetype(FD + "Inter-SemiBold.otf", 22)
GREEN, RED, CYAN, WHITE, INK2 = (48, 209, 88), (255, 69, 58), (100, 210, 255), (245, 245, 247), (161, 161, 166)
T_END = N / 30
MATCH = [50 / 30, 253 / 30]
OLD_DOOR = 129 / 30          # "Door Unlocked" appears on today's UI (frame 130)


def src_frame(f):
    bg = cv2.imread(f"{SRC}/{f:04d}.png")
    bg = cv2.resize(bg, (VW, VH), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    soft = cv2.GaussianBlur(bg, (0, 0), 1.3)
    return np.clip(bg + 0.25 * (bg - soft), 0, 255).astype(np.uint8)


def pill(d, x, y, title, sub, accent):
    tw_ = d.textlength(title, font=F_BOLD) + d.textlength(sub, font=F_SMALL) + 76
    d.rounded_rectangle([x, y, x + tw_, y + 62], radius=31, fill=(10, 10, 12, 175), outline=(255, 255, 255, 40), width=2)
    d.ellipse([x + 22, y + 24, x + 36, y + 38], fill=accent)
    d.text((x + 48, y + 14), title, font=F_BOLD, fill=WHITE)
    d.text((x + 48 + d.textlength(title, font=F_BOLD) + 14, y + 19), sub, font=F_SMALL, fill=INK2)


def timeline(d, t):
    x0, x1 = 300, CW - 120
    X = lambda s: x0 + (x1 - x0) * s / T_END
    rows = [("Today", VH + 70, [(MATCH[0], CYAN, "verified"), (OLD_DOOR, RED, "told “Door Unlocked”"), (MATCH[1], CYAN, "verified")]),
            ("Concept", VH + 160, [(MATCH[0], GREEN, "verified + door unlocked"), (MATCH[1], GREEN, "verified + door unlocked")])]
    for name, y, marks in rows:
        d.text((90, y - 22), name, font=F_SEMI, fill=WHITE)
        d.rounded_rectangle([x0, y - 4, x1, y + 4], radius=4, fill=(58, 58, 64))
        d.rounded_rectangle([x0, y - 4, X(min(t, T_END)), y + 4], radius=4, fill=(120, 120, 128))
        for s, col, lab in marks:
            on = t >= s
            r = 13 if on else 9
            d.ellipse([X(s) - r, y - r, X(s) + r, y + r], fill=col if on else (70, 70, 76))
            if on and t - s < 2.2 or (on and lab.startswith("told")):
                d.text((X(s) + 20, y - 46), lab, font=F_TINY, fill=col)
        if name == "Today" and t >= MATCH[0]:
            gap_end = min(t, OLD_DOOR)
            d.rounded_rectangle([X(MATCH[0]), y - 4, X(gap_end), y + 4], radius=4, fill=RED)
            if t >= OLD_DOOR:
                mid = (X(MATCH[0]) + X(OLD_DOOR)) / 2
                d.text((mid - 34, y + 14), "+2.6 s", font=F_TINY, fill=RED)
    d.line([X(t), VH + 30, X(t), VH + 190], fill=WHITE, width=3)
    d.text((CW - 110, VH + 100), f"{t:4.1f}s", font=F_SMALL, fill=INK2, anchor="lm")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in range(1, N + 1):
        t = (f - 1) / 30
        canvas = np.zeros((CH, CW, 3), np.uint8)
        canvas[:VH, :VW] = src_frame(f)
        canvas[:VH, VW:] = cv2.imread(f"{COMP}/{f:04d}.png")
        canvas[:VH, VW - 2:VW + 2] = 8
        im = Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)).convert("RGBA")
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        pill(d, 40, 40, "TODAY", "current NOVA+ UI", RED)
        pill(d, VW + 40, 40, "CONCEPT", "Liquid Glass UI, same moment", GREEN)
        d.rectangle([0, VH, CW, CH], fill=(9, 9, 11, 255))
        timeline(d, t)
        im = Image.alpha_composite(im, ov).convert("RGB")
        im.save(f"{OUT}/{f:04d}.png")
    print("wrote", N, "frames")
