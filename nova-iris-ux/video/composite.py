#!/usr/bin/env python3
"""Composite the animated UI onto the tracked NOVA+ screen in every frame of the recording."""
import json
import os
import sys

import cv2
import numpy as np

SRC, UI, OUT = "src", "ui_png", sys.argv[1] if len(sys.argv) > 1 else "comp"
ONLY = [int(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 else None
N_SRC, N_UI = 311, 288
OW, OH = 1080, 1920
SXo, SYo = OW / 478, OH / 850
UIW, UIH = 1040, 1765
RAD = 11 / 416 * UIW                      # UI corner radius (the physical panel is squarer), in UI px
T = {int(k): np.array(v, np.float64) for k, v in json.load(open("tracks_refined.json")).items()}
UI_CORNERS = np.float32([[0, 0], [UIW, 0], [UIW, UIH], [0, UIH]])
rng = np.random.default_rng(11)


def rounded_mask():
    s = 2
    m = np.zeros((UIH * s, UIW * s), np.uint8)
    r = int(RAD * s)
    cv2.rectangle(m, (r, 0), (UIW * s - r, UIH * s), 255, -1)
    cv2.rectangle(m, (0, r), (UIW * s, UIH * s - r), 255, -1)
    for cx, cy in ((r, r), (UIW * s - r, r), (r, UIH * s - r), (UIW * s - r, UIH * s - r)):
        cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return cv2.resize(m, (UIW, UIH), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


MASK = rounded_mask()
SQUARE = np.ones((UIH, UIW), np.float32)
BEZEL = np.array([19, 19, 21], np.float32)  # BGR, sampled from the footage
uu, vv = np.meshgrid(np.linspace(0, 1, UIW, dtype=np.float32), np.linspace(0, 1, UIH, dtype=np.float32))


def corners(f, tau=0.0):
    """Screen corners (output px) at fractional frame f + tau, with extrapolation at the ends."""
    def at(i):
        if i in T:
            return T[i]
        if i < 1:
            return T[1] + (T[1] - T[2]) * (1 - i)
        return T[N_UI] + (T[N_UI] - T[N_UI - 1]) * (i - N_UI)
    i0 = int(np.floor(f + tau))
    w = f + tau - i0
    q = at(i0) * (1 - w) + at(i0 + 1) * w
    return (q * [SXo, SYo]).astype(np.float32)


def display_look(ui, f):
    """How an LCD looks through a phone camera: black floor, highlight bloom, glass reflection, cool cast."""
    ui = ui.astype(np.float32)
    ui = ui * 0.93 + 10.0
    hi = np.clip(ui - 150.0, 0, None)
    ui += 0.30 * cv2.GaussianBlur(hi, (0, 0), 16)
    # reflection: soft diagonal sheen that drifts against the device motion (parallax)
    q = T.get(f, T[N_UI])
    c = 0.98 + (q[1][0] - 300.0) / 900.0
    band = np.exp(-(((uu + 0.55 * vv) - c) / 0.16) ** 2)
    sheen = 16.0 * band + 7.0 * np.clip(1.0 - (uu * 0.8 + vv), 0, 1) ** 2
    ui += sheen[..., None]
    ui *= np.array([1.0, 0.985, 0.955], np.float32)  # BGR: slightly cool, like the footage
    return np.clip(ui, 0, 255)


def velocity(f):
    a, b = corners(f, -0.5), corners(f, 0.5)
    return float(np.max(np.linalg.norm((b - a)[1:3], axis=1)))   # TR/BR: the visible side


def composite(f):
    bg = cv2.imread(f"{SRC}/{f:04d}.png")
    bg = cv2.resize(bg, (OW, OH), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    soft = cv2.GaussianBlur(bg, (0, 0), 1.3)
    bg = np.clip(bg + 0.25 * (bg - soft), 0, 255)
    if f > N_UI:
        return bg
    ui = display_look(cv2.imread(f"{UI}/{f:04d}.png"), f)
    pm = ui * MASK[..., None]
    v = velocity(f)
    n = 1 if v < 6 else int(min(15, v / 3 + 1))
    taus = [0.0] if n == 1 else np.linspace(-0.25, 0.25, n)
    acc = np.zeros((OH, OW, 3), np.float32)
    acc_a = np.zeros((OH, OW), np.float32)
    sq = np.zeros((OH, OW), np.float32)
    for tau in taus:
        Hm = cv2.getPerspectiveTransform(UI_CORNERS, corners(f, tau))
        acc += cv2.warpPerspective(pm, Hm, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        acc_a += cv2.warpPerspective(MASK, Hm, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        sq += cv2.warpPerspective(SQUARE, Hm, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    acc /= len(taus)
    acc_a /= len(taus)
    sq /= len(taus)
    # camera softness on the new layer, then a thin dark rim so no teal fringe of the old screen survives
    acc = cv2.GaussianBlur(acc, (0, 0), 0.9)
    acc_a = cv2.GaussianBlur(acc_a, (0, 0), 0.9)
    kd = 9 if v < 6 else int(min(31, 9 + v * 0.9)) | 1        # grow the dark rim with motion
    cover = cv2.GaussianBlur(cv2.dilate(sq, np.ones((kd, kd), np.uint8)), (0, 0), 0.8 if v < 6 else 2.0)
    cover = np.maximum(cover, acc_a)
    grain = cv2.GaussianBlur(rng.normal(0, 2.4, (OH, OW)).astype(np.float32), (0, 0), 0.6)[..., None]
    out = bg * (1 - cover[..., None]) + acc + BEZEL * (cover - acc_a)[..., None] + grain * acc_a[..., None]
    if f >= 278:  # fast pan: neutralise any blurred remnant of the old teal UI right around the screen
        near = cv2.dilate((sq > 0.02).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0
        hsv = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
        teal = (hsv[..., 0] >= 45) & (hsv[..., 0] <= 112) & (hsv[..., 1] > 28) & (hsv[..., 2] > 45) & near & (cover < 0.9)
        w = cv2.GaussianBlur(teal.astype(np.float32), (0, 0), 2.0)[..., None] * 0.9
        out = out * (1 - w) + BEZEL * w
    return np.clip(out, 0, 255)


def teal_left(img):
    small = cv2.resize(img.astype(np.uint8), (478, 850), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    m = cv2.inRange(hsv, (85, 70, 110), (100, 255, 255))   # the old UI's teal, not the monitor's sky blue
    return int(np.count_nonzero(m))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    frames = ONLY or range(1, N_SRC + 1)
    report = []
    for f in frames:
        img = composite(f)
        cv2.imwrite(f"{OUT}/{f:04d}.png", img.astype(np.uint8))
        report.append((f, teal_left(img)))
    worst = sorted(report, key=lambda r: -r[1])[:8]
    print("frames:", len(report), "| most residual old-teal pixels (frame, px @478w):", worst)
