#!/usr/bin/env python3
"""Front-end flow video: the Liquid Glass UI on a front-on NOVA+ reader mockup, on the recorded timeline.

Geometry is measured from the recording (screen = 416 × 706 units, lenses centred above it, button and
fingerprint base below).   usage: python3 flow_video.py <ui_png dir> <out.mp4>
"""
import math
import os
import subprocess
import sys
import tempfile
import wave

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

UI_DIR, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
N, FPS = 311, 30
OW, OH = 1080, 1920
S = 1.25                                  # px per screen unit
OX, OY = 280, 339                         # screen origin in output px
SW, SH = 520, 882                         # screen size in output px
FD = "/usr/share/fonts/opentype/inter/"

# ── static scene: background, reader head, pedestal (SVG → PNG via Chromium) ──
def scene_svg():
    dots = "".join(f'<circle cx="{300 + i * 8}" cy="-121" r="1.4" fill="#3a3c42"/>' for i in range(14))
    lens = lambda cx: (
        f'<circle cx="{cx}" cy="-56" r="23" fill="#0a0b0e" stroke="#34363c" stroke-width="1.5"/>'
        f'<circle cx="{cx}" cy="-56" r="15.5" fill="url(#lensg)"/>'
        f'<circle cx="{cx}" cy="-56" r="6" fill="#000" fill-opacity="0.7"/>'
        f'<ellipse cx="{cx - 5}" cy="-62" rx="3.6" ry="2.1" fill="#fff" fill-opacity="0.45"/>')
    ind = "".join(f'<rect x="{376 + dx}" y="{-63 + dy}" width="6" height="6" rx="1.6" fill="#b4404e"/>'
                  for dx in (0, 8) for dy in (0, 8))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{OW}" height="{OH}" viewBox="0 0 {OW} {OH}">
<defs>
 <radialGradient id="bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#22242b"/><stop offset="0.55" stop-color="#121317"/><stop offset="1" stop-color="#08080a"/></radialGradient>
 <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232429"/><stop offset="0.5" stop-color="#15161a"/><stop offset="1" stop-color="#0d0e11"/></linearGradient>
 <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b6e77"/><stop offset="0.25" stop-color="#2c2e34"/><stop offset="0.7" stop-color="#191a1e"/><stop offset="1" stop-color="#43464d"/></linearGradient>
 <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c7e84"/><stop offset="0.12" stop-color="#5e6066"/><stop offset="1" stop-color="#3a3c40"/></linearGradient>
 <linearGradient id="baserim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e3034"/><stop offset="0.5" stop-color="#8a8c92"/><stop offset="1" stop-color="#2e3034"/></linearGradient>
 <radialGradient id="lensg" cx="0.4" cy="0.36" r="0.62"><stop offset="0" stop-color="#3c4677"/><stop offset="0.45" stop-color="#141a30"/><stop offset="1" stop-color="#05060a"/></radialGradient>
 <linearGradient id="fp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2d33"/><stop offset="0.5" stop-color="#0b0c0f"/><stop offset="1" stop-color="#1c1e22"/></linearGradient>
 <filter id="blur18" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
</defs>
<rect width="{OW}" height="{OH}" fill="url(#bg)"/>
<ellipse cx="540" cy="1735" rx="330" ry="34" fill="url(#floor)" filter="url(#blur18)"/>
<g transform="translate({OX} {OY}) scale({S})">
 <path d="M14 860 L402 860 L432 1110 Q434 1124 420 1124 L-4 1124 Q-18 1124 -16 1110 Z" fill="url(#base)" stroke="url(#baserim)" stroke-width="1.5" stroke-linejoin="round"/>
 <path d="M18 868 L398 868 L401 896 L15 896 Z" fill="#9a9ca2" fill-opacity="0.35"/>
 <rect x="169" y="968" width="78" height="64" rx="15" fill="url(#fp)" stroke="#1a1b1f" stroke-width="2"/>
 <rect x="175" y="974" width="66" height="52" rx="11" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1.5"/>
 <rect x="-45" y="-135" width="506" height="1012" rx="52" fill="url(#body)" stroke="url(#rim)" stroke-width="2.5"/>
 <rect x="-39" y="-129" width="494" height="1000" rx="47" fill="none" stroke="#000" stroke-opacity="0.6" stroke-width="1.5"/>
 <rect x="-4" y="-4" width="424" height="714" rx="9" fill="#000"/>
 {dots}{lens(160)}{lens(268)}{ind}
 <circle cx="409" cy="-56" r="6" fill="#16171a" stroke="#4a4c52" stroke-width="1.5"/>
 <rect x="185" y="780" width="46" height="28" rx="8" fill="none" stroke="#4a4c52" stroke-width="2"/>
</g>
</svg>'''


def render_static():
    tmp = tempfile.mkdtemp()
    svg = os.path.join(tmp, "scene.svg")
    open(svg, "w").write(scene_svg())
    os.makedirs(os.path.join(tmp, "png"), exist_ok=True)
    os.rename(svg, os.path.join(tmp, "s.svg"))
    js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch(); const p = await (await b.newContext({{viewport: {{width: {OW}, height: {OH}}}}})).newPage();
await p.goto('file://{tmp}/s.svg'); await p.screenshot({{path: '{tmp}/scene.png'}}); await b.close(); }})();"""
    open(os.path.join(tmp, "r.cjs"), "w").write(js)
    subprocess.run(["node", os.path.join(tmp, "r.cjs")], check=True)
    return cv2.imread(os.path.join(tmp, "scene.png")).astype(np.float32)


# ── per-frame helpers ──
F_LOOK1, F_CAP1, F_MATCH1, F_FIND2, F_LOOK2, F_CAP2, F_MATCH2 = 38, 44, 51, 190, 220, 245, 254


def state(f):
    if f < F_LOOK1 or F_FIND2 <= f < F_LOOK2:
        return "find"
    if f < F_CAP1 or F_LOOK2 <= f < F_CAP2:
        return "look"
    if f < F_MATCH1 or F_CAP2 <= f < F_MATCH2:
        return "capture"
    return "enter"


LED = {"find": (64, 179, 255), "look": (255, 255, 255), "capture": (255, 255, 255), "enter": (88, 209, 48)}  # BGR
CAPTIONS = [(1, "Stepping in · 97 cm → 62 cm"), (F_LOOK1, "In range · capturing"),
            (F_MATCH1, "Matched · door unlocked at the same moment"), (F_FIND2, "Second pass · stepping in"),
            (F_LOOK2, "Looking up · eyes lock · capturing"), (F_MATCH2, "Matched · door unlocked")]


def caption_at(f):
    cur = [c for c in CAPTIONS if c[0] <= f][-1]
    i = CAPTIONS.index(cur)
    prev = CAPTIONS[i - 1][1] if i > 0 else None
    u = min(1.0, (f - cur[0]) / 6)
    return prev, cur[1], u


def screen_mask():
    m = np.zeros((SH * 2, SW * 2), np.uint8)
    r = 14
    cv2.rectangle(m, (r, 0), (SW * 2 - r, SH * 2), 255, -1)
    cv2.rectangle(m, (0, r), (SW * 2, SH * 2 - r), 255, -1)
    for c in ((r, r), (SW * 2 - r, r), (r, SH * 2 - r), (SW * 2 - r, SH * 2 - r)):
        cv2.circle(m, c, r, 255, -1, cv2.LINE_AA)
    return (cv2.resize(m, (SW, SH), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[..., None]


def sheen():
    yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)
    u, v = xx / SW, yy / SH
    band = np.exp(-(((u + 0.55 * v) - 0.95) / 0.18) ** 2)
    return (10.0 * band + 6.0 * np.clip(1 - (u * 0.8 + v), 0, 1) ** 2)[..., None]


def audio(path):
    sr, n = 48000, int(round(N / FPS * 48000))
    t = np.arange(n) / sr

    def tone(start, freq, amp, decay, attack=0.006, partials=((1, 1.0), (2, 0.16), (3, 0.05))):
        tt = t - start
        env = np.where(tt < 0, 0, np.where(tt < attack, tt / attack, np.exp(-(tt - attack) / decay)))
        return amp * env * sum(g * np.sin(2 * np.pi * freq * m * tt) for m, g in partials)

    y = np.zeros(n)
    for f in (F_MATCH1, F_MATCH2):
        s0 = (f - 1) / FPS
        y += tone(s0, 1318.5, 0.16, 0.30) + tone(s0 + 0.085, 1975.5, 0.14, 0.42)
    for f in (F_LOOK1, F_LOOK2):
        y += tone((f - 1) / FPS, 2400.0, 0.04, 0.035, attack=0.002, partials=((1, 1.0),))
    y += np.random.default_rng(3).normal(0, 0.0012, n)          # faint room tone
    pcm = (np.clip(np.stack([y * 0.96, y], 1), -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    static = render_static()
    mask, glare = screen_mask(), sheen()
    led_pos = (OX + 409 * S, OY - 56 * S)
    f_cap = ImageFont.truetype(FD + "Inter-Medium.otf", 32)
    f_top = ImageFont.truetype(FD + "Inter-SemiBold.otf", 30)
    f_sub = ImageFont.truetype(FD + "Inter-Medium.otf", 22)
    wav = os.path.join(tempfile.mkdtemp(), "ui.wav")
    audio(wav)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
         "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high",
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", OUT], stdin=subprocess.PIPE)
    yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
    for f in range(1, N + 1):
        frame = static.copy()
        ui = cv2.resize(cv2.imread(f"{UI_DIR}/{f:04d}.png"), (SW, SH), interpolation=cv2.INTER_AREA).astype(np.float32)
        ui = np.clip(ui + glare, 0, 255)
        roi = frame[OY:OY + SH, OX:OX + SW]
        frame[OY:OY + SH, OX:OX + SW] = roi * (1 - mask) + ui * mask
        # status light follows the state
        col = np.array(LED[state(f)], np.float32)
        d2 = (xx - led_pos[0]) ** 2 + (yy - led_pos[1]) ** 2
        glow = np.exp(-d2 / (2 * 9.0 ** 2))[..., None] * 0.85 + (d2 < 5.5 ** 2)[..., None] * 0.9
        frame = frame * (1 - np.clip(glow, 0, 1)) + col * np.clip(glow, 0, 1)
        # slow push-in
        t = (f - 1) / (N - 1)
        z = 1.0 + 0.035 * (t * t * (3 - 2 * t))
        cx, cy = OX + SW / 2, OY + SH / 2 + 60
        M = np.float32([[z, 0, cx - z * cx], [0, z, cy - z * cy - 10 * t]])
        frame = cv2.warpAffine(frame, M, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        # titles and caption
        im = Image.fromarray(cv2.cvtColor(np.clip(frame, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))
        d = ImageDraw.Draw(im, "RGBA")
        d.text((OW / 2, 70), "NOVA+ Iris Reader · Liquid Glass concept", font=f_top, fill=(245, 245, 247, 225), anchor="mm")
        d.text((OW / 2, 110), "Same flow and timing as the recorded walk-through", font=f_sub, fill=(142, 142, 147, 255), anchor="mm")
        prev, cur, u = caption_at(f)
        k = (f - [c for c in CAPTIONS if c[0] <= f][-1][0])      # frames since this caption started
        if prev and k < 3:                                        # previous fades out first...
            d.text((OW / 2, 1838 - 4 * k), prev, font=f_cap, fill=(199, 199, 204, int(255 * (1 - k / 3))), anchor="mm")
        else:                                                     # ...then the new one fades in
            a = 1.0 if not prev else min(1.0, (k - 2) / 5)
            d.text((OW / 2, 1838 + 6 * (1 - a)), cur, font=f_cap, fill=(199, 199, 204, int(255 * a)), anchor="mm")
        out = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR).astype(np.float32)
        fade = min(1.0, f / 8) * min(1.0, (N - f + 1) / 12)
        out = (out * fade).astype(np.uint8)
        if f in (20, 39, 41, 46, 70, 236, 300):
            cv2.imwrite(os.path.join(os.path.dirname(OUT) or ".", f"flow_check_{f:04d}.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 88])
        enc.stdin.write(out.tobytes())
    enc.stdin.close()
    enc.wait()
    print("wrote", OUT, "exit", enc.returncode)
