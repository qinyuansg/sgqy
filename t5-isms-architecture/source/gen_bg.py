"""Background artwork for the three slide versions (13.333in x 7.5in @ 200 dpi)."""
import sys
import numpy as np
from PIL import Image

DPI = 200
W, H = int(13.333 * DPI), int(7.5 * DPI)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
rng = np.random.default_rng(7)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
X, Y = xx / DPI, yy / DPI  # inches


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def blob(cx, cy, sx, sy=None):
    sy = sx if sy is None else sy
    return np.exp(-(((X - cx) / sx) ** 2 + ((Y - cy) / sy) ** 2) / 2.0)


def save(img, name):
    img = img + rng.normal(0, 0.6 / 255.0, img.shape).astype(np.float32)  # dither, kills banding
    img = np.clip(img, 0, 1)
    Image.fromarray((img * 255).astype(np.uint8)).save(f"{OUT}/{name}", quality=93, subsampling=0)


def stars(img, n, max_a, color=(1, 1, 1), avoid=None):
    for _ in range(n):
        x, y = rng.integers(0, W), rng.integers(0, H)
        if avoid is not None and avoid(x / DPI, y / DPI):
            continue
        a = max_a * rng.random() ** 3
        r = 1 if rng.random() < 0.9 else 2
        img[max(0, y - r + 1):y + r, max(0, x - r + 1):x + r] += np.array(color) * a


# ---------- V1: SpaceX — black, starfield, orbital horizon ----------
img = np.zeros((H, W, 3), np.float32)
stars(img, 900, 0.55)
cx, R = 8.9, 34.0
cy = 7.08 + R
d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) - R  # >0 outside planet (space), <0 inside
space = d > 0
atm = hexrgb("8CB8FF")
glow = np.where(space, 0.95 * np.exp(-d / 0.035) + 0.30 * np.exp(-d / 0.30) + 0.10 * np.exp(-d / 1.1), 0)
img += glow[..., None] * atm
surface = np.where(~space, 1.0, 0.0)
dn = np.minimum(d, 0)
rim = np.where(~space, 0.55 * np.exp(dn / 0.05) + 0.12 * np.exp(dn / 0.35), 0)
img = img * (1 - surface[..., None]) + surface[..., None] * (hexrgb("03060C") + rim[..., None] * hexrgb("5D8FD8"))
# sunrise glint on the limb
gx = 11.9
gy = cy - np.sqrt(R ** 2 - (gx - cx) ** 2)
img += (0.55 * blob(gx, gy, 0.10) + 0.22 * blob(gx, gy, 0.45, 0.22) + 0.06 * blob(gx, gy, 2.2, 0.12))[..., None] * hexrgb("FFF1DC")
# faint top vignette lift so the header doesn't sit on dead black
img += 0.025 * blob(3.0, -0.6, 4.5, 1.6)[..., None] * hexrgb("9DB6D9")
save(img, "bg_v1.jpg")

# ---------- V2: Apple — black with soft "intelligence" glow ----------
img = np.zeros((H, W, 3), np.float32)
for (bx, by, s, c, a) in [
    (8.9, 2.6, 1.25, "0A84FF", 0.42),
    (10.4, 2.0, 1.15, "BF5AF2", 0.40),
    (11.9, 2.9, 1.10, "FF375F", 0.34),
    (12.6, 4.1, 1.05, "FF9F0A", 0.26),
    (9.9, 4.2, 1.40, "5E5CE6", 0.22),
    (1.2, 7.6, 2.4, "0A84FF", 0.07),
]:
    img += a * blob(bx, by, s)[..., None] * hexrgb(c)
img = 1 - np.exp(-img * 1.15)  # soft tonemap so overlaps stay luminous, not clipped
save(img, "bg_v2.jpg")

# ---------- V3 / V4: Neon HUD — deep navy, perspective grid, coloured glows ----------
def neon(glows, name, floor=5.05):
    img = np.broadcast_to(hexrgb("02050C"), (H, W, 3)).copy()
    img += 0.55 * blob(6.5, 4.4, 5.5, 3.5)[..., None] * hexrgb("0B1A33")
    vx, vy = 6.67, floor - 1.85
    grid = np.zeros((H, W), np.float32)
    fl = Y > floor
    depth = np.where(fl, (Y - vy), 1.0)
    u = (X - vx) / depth * 4.0  # converging verticals
    grid += np.where(fl, np.exp(-((u - np.round(u)) * depth * DPI / 26) ** 2 * 4), 0)
    z = 1.0 / np.maximum(depth, 1e-3)
    v = z * 14.0
    grid += np.where(fl, np.exp(-(((v - np.round(v)) / np.maximum(z, 1e-3)) * 0.9) ** 2 * 6), 0)
    fade = np.clip((Y - floor) / 2.2, 0, 1) ** 1.3
    img += (np.clip(grid, 0, 1) * fade * 0.11)[..., None] * hexrgb("19D3FF")
    dots = ((xx % 28 < 2) & (yy % 28 < 2) & (Y < 4.8)).astype(np.float32)
    img += (dots * 0.05 * np.clip(1 - Y / 4.8, 0, 1))[..., None] * hexrgb("6FB7FF")
    for (gx, gy, sx, sy, a, c) in glows:
        img += a * blob(gx, gy, sx, sy)[..., None] * hexrgb(c)
    vig = np.clip(1 - 0.55 * (((X - 6.67) / 7.5) ** 2 + ((Y - 3.75) / 4.6) ** 2), 0.35, 1)
    img *= vig[..., None]
    save(img, name)


neon([
    (9.28, 3.8, 1.05, 1.05, 0.30, "00C8FF"),   # orchestration hub
    (7.05, 3.8, 0.9, 0.9, 0.14, "FF2BD6"),     # A.I.
    (11.7, 4.4, 1.5, 1.5, 0.14, "7C4DFF"),     # autonomy
    (1.6, 4.4, 1.6, 2.6, 0.06, "00C8FF"),      # sites
], "bg_v3.jpg")

neon([
    (9.93, 4.25, 0.75, 2.4, 0.26, "00C8FF"),   # orchestration spine
    (7.6, 2.33, 1.7, 0.6, 0.15, "FF2BD6"),     # A.I. cell
    (11.6, 4.4, 1.4, 2.0, 0.14, "7C4DFF"),     # autonomy column
    (5.6, 3.6, 3.2, 1.6, 0.06, "00C8FF"),      # platform
], "bg_v4.jpg", floor=5.6)

# ---------- V5: Pearl white liquid glass — iridescent pearl, terminal-canopy arcs ----------
img = np.broadcast_to(hexrgb("FBFAF8"), (H, W, 3)).copy()
img = img * (1 - 0.6 * (Y / 7.5)[..., None]) + hexrgb("EFEEEA") * (0.6 * (Y / 7.5))[..., None]
for (bx, by, sx, sy, a, c) in [
    (1.6, 0.6, 2.8, 1.6, 0.55, "F1E3C9"),   # champagne
    (8.7, 2.7, 2.2, 1.7, 0.70, "D2E0F1"),   # sky
    (11.2, 2.1, 1.8, 1.5, 0.60, "E0D8F1"),  # lilac
    (12.8, 4.7, 1.6, 1.8, 0.45, "F0DAE1"),  # blush
    (2.8, 6.4, 3.0, 1.6, 0.55, "D7EAE3"),   # pearl mint
    (7.3, 6.6, 2.6, 1.3, 0.45, "DAE2EC"),   # silver blue
]:
    a_ = (a * blob(bx, by, sx, sy))[..., None]
    img = img * (1 - a_) + hexrgb(c) * a_
# canopy ribs: soft embossed arcs sweeping across the top like a terminal roof
for k, r in enumerate(np.linspace(8.9, 11.4, 9)):
    dist = np.abs(np.sqrt((X - 6.67) ** 2 + (Y - 9.6) ** 2) - r)
    fadeout = np.exp(-((X - 6.67) / 7.5) ** 4) * (0.55 + 0.45 * np.exp(-k / 3))
    hi = np.exp(-(dist / 0.012) ** 2) * 0.8 * fadeout
    sh = np.exp(-((dist - 0.03) / 0.03) ** 2) * 0.07 * fadeout
    img = img * (1 - hi[..., None]) + hi[..., None]
    img = img * (1 - sh[..., None]) + sh[..., None] * hexrgb("8A93A3")
img += 0.05 * blob(6.67, -0.4, 4.0, 1.0)[..., None]  # skylight
save(img, "bg_v5.jpg")

# ---------- V6: Dark liquid glass — graphite, map grid, range rings ----------
img = np.broadcast_to(hexrgb("08090C"), (H, W, 3)).copy()
for (bx, by, sx, sy, a, c) in [
    (4.6, 4.1, 4.2, 2.6, 0.95, "171C25"),
    (9.3, 3.8, 1.9, 1.9, 0.85, "17202D"),
    (11.8, 2.3, 1.8, 1.4, 0.55, "1D222B"),
    (12.6, 7.4, 2.2, 1.2, 0.55, "2A1F14"),   # sodium-lamp warmth, low on the apron
    (1.0, 0.0, 2.5, 1.2, 0.35, "1A2230"),
]:
    img += a * blob(bx, by, sx, sy)[..., None] * hexrgb(c)
fine = ((np.abs(((X + 0.125) % 0.25) - 0.125) * DPI < 0.6) | (np.abs(((Y + 0.125) % 0.25) - 0.125) * DPI < 0.6)).astype(np.float32)
major = ((np.abs(((X + 0.5) % 1.0) - 0.5) * DPI < 0.7) | (np.abs(((Y + 0.5) % 1.0) - 0.5) * DPI < 0.7)).astype(np.float32)
img += (fine * 0.018 + major * 0.03)[..., None] * hexrgb("BFD3EA")
# crosshair marks on the major grid
cx_ = np.abs(((X + 0.5) % 1.0) - 0.5); cy_ = np.abs(((Y + 0.5) % 1.0) - 0.5)
cross = (((cx_ * DPI < 0.9) & (cy_ < 0.05)) | ((cy_ * DPI < 0.9) & (cx_ < 0.05))).astype(np.float32)
img += (cross * 0.10)[..., None] * hexrgb("D6E4F5")
# range rings around the orchestration hub
rr = np.sqrt((X - 9.325) ** 2 + (Y - 3.8) ** 2)
for r in (1.2, 1.75, 2.4, 3.2, 4.1):
    img += (np.exp(-((rr - r) * DPI / 1.2) ** 2) * 0.05)[..., None] * hexrgb("9CC3F0")
vig = np.clip(1 - 0.5 * (((X - 6.67) / 7.5) ** 2 + ((Y - 3.75) / 4.4) ** 2), 0.4, 1)
img *= vig[..., None]
save(img, "bg_v6.jpg")
print("ok")
