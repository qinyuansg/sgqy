#!/usr/bin/env python3
"""Before | after, frame-synced: the original recording vs the same moment with the Liquid Glass UI.

Streams raw frames into ffmpeg:  python3 sbs.py out.mp4 audio.wav
"""
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC, COMP = "src", "comp"
OUT, AUDIO = sys.argv[1], sys.argv[2]
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


def pill_patch(title, sub, accent):
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    w = int(probe.textlength(title, font=F_BOLD) + probe.textlength(sub, font=F_SMALL) + 76)
    im = Image.new("RGBA", (w + 4, 66), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w, 62], radius=31, fill=(10, 10, 12, 175), outline=(255, 255, 255, 40), width=2)
    d.ellipse([22, 24, 36, 38], fill=accent)
    d.text((48, 14), title, font=F_BOLD, fill=WHITE)
    d.text((48 + d.textlength(title, font=F_BOLD) + 14, 19), sub, font=F_SMALL, fill=INK2)
    a = np.asarray(im).astype(np.float32)
    return cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2BGR), a[..., 3:] / 255


def paste(dst, patch, x, y):
    rgb, al = patch
    h, w = al.shape[:2]
    roi = dst[y:y + h, x:x + w].astype(np.float32)
    dst[y:y + h, x:x + w] = (roi * (1 - al) + rgb * al).astype(np.uint8)


def band(t):
    im = Image.new("RGB", (CW, BAND), (9, 9, 11))
    d = ImageDraw.Draw(im)
    x0, x1 = 300, CW - 140
    X = lambda s: x0 + (x1 - x0) * s / T_END
    rows = [("Today", 70, [(MATCH[0], CYAN, "verified"), (OLD_DOOR, RED, "tells you “Door Unlocked”"),
                           (MATCH[1], CYAN, "verified")]),
            ("Concept", 160, [(MATCH[0], GREEN, "verified + door unlocked"), (MATCH[1], GREEN, "verified + door unlocked")])]
    for name, y, marks in rows:
        d.text((90, y - 22), name, font=F_SEMI, fill=WHITE)
        d.rounded_rectangle([x0, y - 4, x1, y + 4], radius=4, fill=(58, 58, 64))
        d.rounded_rectangle([x0, y - 4, max(x0 + 8, X(min(t, T_END))), y + 4], radius=4, fill=(120, 120, 128))
        if name == "Today" and t >= MATCH[0]:
            d.rounded_rectangle([X(MATCH[0]), y - 4, max(X(MATCH[0]) + 8, X(min(t, OLD_DOOR))), y + 4], radius=4, fill=RED)
            if t >= OLD_DOOR:
                d.text(((X(MATCH[0]) + X(OLD_DOOR)) / 2, y + 30), "+2.6 s", font=F_TINY, fill=RED, anchor="mm")
        for s, col, lab in marks:
            on = t >= s
            r = 13 if on else 9
            d.ellipse([X(s) - r, y - r, X(s) + r, y + r], fill=col if on else (70, 70, 76))
            if on and (t - s < 2.4 or lab.startswith("tells")):
                d.text((X(s) + 20, y - 46), lab, font=F_TINY, fill=col)
    d.line([X(t), 30, X(t), 190], fill=WHITE, width=3)
    d.text((CW - 120, 115), f"{t:4.1f}s", font=F_SMALL, fill=INK2, anchor="lm")
    return cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)


if __name__ == "__main__":
    left_pill = pill_patch("TODAY", "current NOVA+ UI", RED)
    right_pill = pill_patch("CONCEPT", "Liquid Glass UI, same moment", GREEN)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{CW}x{CH}", "-r", "30", "-i", "-",
         "-i", AUDIO, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT], stdin=subprocess.PIPE)
    for f in range(1, N + 1):
        t = (f - 1) / 30
        canvas = np.zeros((CH, CW, 3), np.uint8)
        canvas[:VH, :VW] = src_frame(f)
        canvas[:VH, VW:] = cv2.imread(f"{COMP}/{f:04d}.png")
        canvas[:VH, VW - 2:VW + 2] = 8
        paste(canvas, left_pill, 40, 40)
        paste(canvas, right_pill, VW + 40, 40)
        canvas[VH:] = band(t)
        if f in (1, 60, 140, 260):
            cv2.imwrite(f"sbs_check_{f:04d}.jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, 85])
        enc.stdin.write(canvas.tobytes())
    enc.stdin.close()
    enc.wait()
    print("wrote", OUT, "exit", enc.returncode)
