#!/usr/bin/env python3
"""Before/after key-frame poster: same frames from the recording and from the concept video."""
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FD = "/usr/share/fonts/opentype/inter/"
F_T = ImageFont.truetype(FD + "Inter-Bold.otf", 30)
F_S = ImageFont.truetype(FD + "Inter-Medium.otf", 22)
F_R = ImageFont.truetype(FD + "Inter-SemiBold.otf", 24)
KEYS = [(20, "0.6 s", "Stepping in"), (40, "1.3 s", "In range"), (47, "1.5 s", "Capturing"),
        (60, "2.0 s", "Matched"), (110, "3.6 s", "Still waiting today"), (150, "5.0 s", "Door open")]
TW, TH = 300, 533
PAD, LABEL_W, HEAD = 16, 150, 92


def up(path):
    im = cv2.imread(path)
    if im.shape[1] != 1080:
        im = cv2.resize(im, (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
    return cv2.cvtColor(cv2.resize(im, (TW, TH), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)


W = LABEL_W + len(KEYS) * (TW + PAD) + PAD
H = HEAD + 2 * (TH + PAD) + PAD
canvas = Image.new("RGB", (W, H), (9, 9, 11))
d = ImageDraw.Draw(canvas)
for i, (f, t, lab) in enumerate(KEYS):
    x = LABEL_W + PAD + i * (TW + PAD)
    d.text((x, 22), t, font=F_T, fill=(245, 245, 247))
    d.text((x, 58), lab, font=F_S, fill=(161, 161, 166))
    canvas.paste(Image.fromarray(up(f"src/{f:04d}.png")), (x, HEAD))
    canvas.paste(Image.fromarray(up(f"comp/{f:04d}.png")), (x, HEAD + TH + PAD))
for j, (name, col) in enumerate((("Today", (255, 69, 58)), ("Concept", (48, 209, 88)))):
    y = HEAD + j * (TH + PAD) + TH // 2
    d.ellipse([24, y - 8, 40, y + 8], fill=col)
    d.text((50, y - 15), name, font=F_R, fill=(245, 245, 247))
canvas.save("poster.jpg", quality=88)
print("poster.jpg", canvas.size)
