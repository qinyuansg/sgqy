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

# ---------- V3: Neon HUD — deep navy, perspective grid, hub glow ----------
base = hexrgb("02050C")
img = np.broadcast_to(base, (H, W, 3)).copy()
img += 0.55 * blob(6.5, 4.4, 5.5, 3.5)[..., None] * hexrgb("0B1A33")
# perspective floor grid
vx, vy, floor = 6.67, 3.2, 5.05
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
# dot matrix in the upper field
dots = ((xx % 28 < 2) & (yy % 28 < 2) & (Y < 4.8)).astype(np.float32)
img += (dots * 0.05 * np.clip(1 - Y / 4.8, 0, 1))[..., None] * hexrgb("6FB7FF")
# glows behind hub, AI and autonomy
img += 0.30 * blob(9.28, 3.8, 1.05)[..., None] * hexrgb("00C8FF")
img += 0.14 * blob(7.05, 3.8, 0.9)[..., None] * hexrgb("FF2BD6")
img += 0.14 * blob(11.7, 4.4, 1.5)[..., None] * hexrgb("7C4DFF")
img += 0.06 * blob(1.6, 4.4, 1.6, 2.6)[..., None] * hexrgb("00C8FF")
# vignette
vig = np.clip(1 - 0.55 * (((X - 6.67) / 7.5) ** 2 + ((Y - 3.75) / 4.6) ** 2), 0.35, 1)
img *= vig[..., None]
save(img, "bg_v3.jpg")
print("ok")
