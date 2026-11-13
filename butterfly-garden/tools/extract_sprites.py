"""Cut every character out of the (normalized) drawing as a paper 'sticker' with a white border.

Usage: python3 extract_sprites.py <photo.jpg> <out_dir>
Writes PNG sprites (RGBA) + sprites.json (each sprite's position in the original photo).
All polygons below are in the original photo's pixel coordinates (2576x1932).
"""
import json
import os
import sys

import cv2
import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
from normalize import normalize, PAPER  # noqa: E402

src, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
photo = cv2.imread(src)
img = normalize(photo)
H, W = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
gray = img.mean(axis=2)
chroma = img.max(axis=2).astype(np.int16) - img.min(axis=2)
manifest = {}


def poly_mask(pts):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    return m.astype(bool)


def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def close(m, r):
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disk(r)).astype(bool)


def dilate(m, r):
    return cv2.dilate(m.astype(np.uint8), disk(r)).astype(bool)


def keep_big(m, min_area):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[lab]


INK = (gray < 212) | (chroma > 38)
BLACK = (gray < 105) & (chroma < 60)
RED = ((hsv[..., 0] < 8) | (hsv[..., 0] > 165)) & (hsv[..., 1] > 70) & (hsv[..., 2] > 60)
ORANGE = (hsv[..., 0] >= 8) & (hsv[..., 0] <= 24) & (hsv[..., 1] > 110)
BLUE = (hsv[..., 0] >= 95) & (hsv[..., 0] <= 135) & (hsv[..., 1] > 60)


CUTOUTS = np.zeros((H, W), bool)


def save_sticker(name, sil, border=12, crop_to=None, pad=4, keep_rgb_mask=None, src=None):
    """sil: bool mask of the 'real' artwork; a paper border is grown around it."""
    global CUTOUTS
    sil = sil.copy()
    outer = dilate(sil, border) if border else sil
    if name in ("dino_raw", "icewall", "butterfly_raw", "tree_raw", "iceman", "police"):
        CUTOUTS |= outer
    # smooth outer contour for a scissor-cut look
    soft = cv2.GaussianBlur(outer.astype(np.float32), (0, 0), max(border / 3, 1.0))
    alpha = np.clip((soft - 0.5) * 3 + 0.5, 0, 1)
    ys, xs = np.nonzero(alpha > 0.01)
    if crop_to is not None:
        x0, y0, x1, y1 = crop_to
    else:
        x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
        x1, y1 = min(xs.max() + pad + 1, W), min(ys.max() + pad + 1, H)
    rgb = (img if src is None else src)[y0:y1, x0:x1].astype(np.float32)
    inner = (keep_rgb_mask if keep_rgb_mask is not None else sil)[y0:y1, x0:x1]
    # border area becomes clean paper (hides background scribbles next to the outline)
    feather = cv2.GaussianBlur(inner.astype(np.float32), (0, 0), 1.2)[..., None]
    rgb = rgb * feather + PAPER[None, None, :] * (1 - feather)
    rgba = np.dstack([rgb, alpha[y0:y1, x0:x1] * 255]).astype(np.uint8)
    cv2.imwrite(os.path.join(out_dir, name + ".png"), rgba)
    manifest[name] = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
    return (x0, y0, x1, y1)


def save_alpha(name, a, color=(255, 255, 255), box=None, pad=6):
    """Pure-colour sprite whose alpha is `a` (float 0..1)."""
    ys, xs = np.nonzero(a > 0.02)
    if box is None:
        box = (xs.min() - pad, ys.min() - pad, xs.max() + pad + 1, ys.max() + pad + 1)
    x0, y0, x1, y1 = box
    rgb = np.zeros((y1 - y0, x1 - x0, 3), np.float32) + np.array(color[::-1], np.float32)
    rgba = np.dstack([rgb, a[y0:y1, x0:x1] * 255]).astype(np.uint8)
    cv2.imwrite(os.path.join(out_dir, name + ".png"), rgba)
    manifest[name] = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}
    return box


def colorize(sil, rule):
    """Gently 'colour in' the white paper areas enclosed by her lines (multiply blend keeps paper texture)."""
    paper = (gray > 196) & (chroma < 36) & sil
    n, lab, stats, cents = cv2.connectedComponentsWithStats(paper.astype(np.uint8), 4)
    tints = np.full((n, 3), 255, np.float32)
    split = None
    for i in range(1, n):
        c = rule(stats[i, cv2.CC_STAT_AREA], cents[i])
        if c is not None and c[0] == 'split':          # ('split', top_rgb, bottom_rgb, y): vertical blend
            split = c
            c = c[1]
        if c is not None:
            tints[i] = np.array(c[::-1], np.float32)        # RGB -> BGR
    tmap = tints[lab]
    if split is not None:
        _, top, bot, ys = split
        yy = np.clip((np.arange(H)[:, None] - ys) / 50 + 0.5, 0, 1)[..., None]
        tinted = (tmap < 254.5).any(axis=2, keepdims=True)
        grad = np.array(top[::-1], np.float32) * (1 - yy) + np.array(bot[::-1], np.float32) * yy
        tmap = np.where(tinted, grad, tmap)
    tmap = cv2.GaussianBlur(tmap, (0, 0), 2.0)
    p = (np.clip((gray - 170) / 45, 0, 1) * np.clip(1 - chroma / 50, 0, 1))[..., None]
    out = img.astype(np.float32)
    out = out * (1 - p) + out * (tmap / 255.0) * p
    return np.clip(out, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- DINOSAUR
dino_area = poly_mask([(15, 545), (1012, 545), (1012, 1385), (15, 1385)])
outline = BLACK & dino_area
outline = keep_big(close(outline, 4), 300)
closing = outline.astype(np.uint8)
cv2.line(closing, (1003, 698), (988, 822), 1, 9)        # close the open mouth
cv2.line(closing, (996, 610), (1004, 700), 1, 7)         # snout tip
body = ndi.binary_fill_holes(close(closing, 6))
n, lab, stats, _ = cv2.connectedComponentsWithStats(body.astype(np.uint8), 8)
body = lab == (1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA])))   # only the dino itself
extras = np.zeros_like(body)
extras |= INK & poly_mask([(960, 628), (1008, 628), (1008, 676), (960, 676)])          # nostril
extras |= (INK & ~(chroma < 30)) & poly_mask([(948, 822), (992, 822), (992, 1004), (948, 1004)])  # drool dots
apple = RED & poly_mask([(690, 918), (800, 918), (800, 1022), (690, 1022)])
extras |= ndi.binary_fill_holes(close(apple, 5))
dino_sil = body | keep_big(extras, 6)
save_sticker("dino_raw", dino_sil, border=14)
save_sticker("dino", dino_sil, border=14, src=colorize(dino_sil, lambda a, c: (222, 242, 204) if a > 2500 else None))

# ---------------------------------------------------------------- FIRE (her red flames)
fire_area = poly_mask([(990, 672), (1215, 672), (1215, 905), (990, 905)])
fire_red = RED & fire_area & ~dino_sil
fire_red = keep_big(fire_red, 25)
fire_lines = cv2.GaussianBlur(dilate(fire_red, 1).astype(np.float32), (0, 0), 0.8)
box = save_alpha("fire_lines", np.clip(fire_lines * 1.3, 0, 1), color=(200, 20, 30))
fire_fill = ndi.binary_fill_holes(close(fire_red, 7))
fire_fill = dilate(fire_fill, 3)
save_alpha("fire_fill", cv2.GaussianBlur(fire_fill.astype(np.float32), (0, 0), 1.5), box=box)

# ---------------------------------------------------------------- ICE WALL (blue tower)
wall_area = poly_mask([(1312, 562), (1538, 552), (1556, 598), (1561, 1356), (1362, 1356), (1318, 600)])
wall = INK & wall_area
wall = cv2.morphologyEx(wall.astype(np.uint8), cv2.MORPH_OPEN, disk(2)).astype(bool)
wall = keep_big(wall, 400)
wall_sil = ndi.binary_fill_holes(close(wall, 14))
wall_sil = cv2.morphologyEx(wall_sil.astype(np.uint8), cv2.MORPH_OPEN, disk(9)).astype(bool)
save_sticker("icewall", wall_sil, border=10)

# ---------------------------------------------------------------- BUTTERFLY (3 pieces for flapping)
bf_area = poly_mask([(1560, 588), (1997, 588), (1997, 1052), (1560, 1052)])
warm = (RED | ORANGE | ((hsv[..., 0] > 140) & (hsv[..., 1] > 50))) & bf_area
warm = keep_big(close(warm, 3), 40)
bf_sil = ndi.binary_fill_holes(close(warm, 6))
bf_sil = keep_big(bf_sil, 400)
bf_col = colorize(bf_sil, lambda a, c: None if a < 1500 else ((255, 212, 236) if c[1] < 790 else (232, 214, 255)))
save_sticker("butterfly_raw", bf_sil, border=12)
full_box = save_sticker("butterfly", bf_sil, border=12, src=bf_col)
body_poly = [(1728, 596), (1790, 596), (1801, 660), (1799, 800), (1787, 935), (1765, 942), (1740, 880),
             (1731, 700), (1727, 640)]
body_m = poly_mask(body_poly)
left_m = poly_mask([(1500, 500), (1733, 500), (1733, 935), (1778, 935), (1778, 1100), (1500, 1100)]) & ~body_m
right_m = ~(left_m | body_m)
outer = dilate(bf_sil, 12)
for nm, part in (("bfly_body", body_m), ("bfly_left", left_m), ("bfly_right", right_m)):
    save_sticker(nm, bf_sil & part, border=0, crop_to=full_box, keep_rgb_mask=bf_sil, src=bf_col)
    # re-alpha: use the outer (bordered) silhouette restricted to the part
    p = cv2.imread(os.path.join(out_dir, nm + ".png"), cv2.IMREAD_UNCHANGED)
    x0, y0, x1, y1 = full_box
    soft = cv2.GaussianBlur(outer.astype(np.float32), (0, 0), 4)
    a = np.clip((soft - 0.5) * 3 + 0.5, 0, 1) * cv2.GaussianBlur(part.astype(np.float32), (0, 0), 0.8)
    p[..., 3] = (a[y0:y1, x0:x1] * 255).astype(np.uint8)
    cv2.imwrite(os.path.join(out_dir, nm + ".png"), p)

# ---------------------------------------------------------------- TREE
tree_area = poly_mask([(2008, 630), (2400, 630), (2445, 1200), (2030, 1200), (2030, 1150), (2075, 1080),
                       (2040, 980), (2003, 860)])
tree = INK & tree_area
tree = keep_big(close(tree, 3), 150)
tree_sil = ndi.binary_fill_holes(close(tree, 12))
tree_sil = keep_big(tree_sil, 3000)
save_sticker("tree_raw", tree_sil, border=12)
save_sticker("tree", tree_sil, border=12,
             src=colorize(tree_sil, lambda a, c: None if a < 700 else ('split', (204, 240, 182), (236, 212, 176), 985)))

# ---------------------------------------------------------------- ICE MAN (body + crescent wand)
ice_area = poly_mask([(1560, 1100), (1690, 1103), (1730, 1110), (1768, 1150), (1772, 1345), (1600, 1345),
                      (1575, 1275), (1560, 1200)])
ice = (INK & ~(chroma < 25) | (gray < 150)) & ice_area
ice = keep_big(close(ice, 2), 30)
ice_sil = keep_big(ndi.binary_fill_holes(close(ice, 9)), 800)
ice_col = colorize(ice_sil, lambda a, c: (214, 240, 255) if a > 250 else None)
full_ice = save_sticker("iceman", ice_sil, border=11, src=ice_col)
wand_m = poly_mask([(1550, 1095), (1640, 1095), (1646, 1248), (1664, 1262), (1662, 1300), (1550, 1300)])
outer = dilate(ice_sil, 11)
for nm, part in (("iceman_body", ~wand_m), ("iceman_wand", wand_m)):
    save_sticker(nm, ice_sil & part, border=0, crop_to=full_ice, keep_rgb_mask=ice_sil, src=ice_col)
    p = cv2.imread(os.path.join(out_dir, nm + ".png"), cv2.IMREAD_UNCHANGED)
    x0, y0, x1, y1 = full_ice
    soft = cv2.GaussianBlur(outer.astype(np.float32), (0, 0), 11 / 3)
    a = np.clip((soft - 0.5) * 3 + 0.5, 0, 1) * cv2.GaussianBlur(part.astype(np.float32), (0, 0), 0.8)
    p[..., 3] = (a[y0:y1, x0:x1] * 255).astype(np.uint8)
    cv2.imwrite(os.path.join(out_dir, nm + ".png"), p)

# ---------------------------------------------------------------- POLICE CAR
car_area = poly_mask([(1848, 1160), (2018, 1160), (2036, 1196), (2150, 1196), (2150, 1328), (1848, 1328)])
car = INK & car_area
car = keep_big(close(car, 2), 60)
car_sil = ndi.binary_fill_holes(close(car, 10))
car_sil = keep_big(car_sil, 100)
save_sticker("police", car_sil, border=11)


# ---------------------------------------------------------------- little particles from her drawing
def particle(name, box, colour_mask, close_r=3, border=4):
    m = colour_mask & poly_mask([(box[0], box[1]), (box[2], box[1]), (box[2], box[3]), (box[0], box[3])])
    m = ndi.binary_fill_holes(close(keep_big(m, 8), close_r))
    save_sticker(name, m, border=border)


PINK = (((hsv[..., 0] > 145) | (hsv[..., 0] < 6)) & (hsv[..., 1] > 45))
particle("flower_pink", (2088, 902, 2168, 978), PINK)
particle("flower_red", (2038, 802, 2118, 872), RED | PINK)
particle("flower_orange", (1603, 928, 1670, 988), ORANGE)
particle("flower_orange2", (1858, 598, 1912, 646), ORANGE)
particle("heart", (1619, 687, 1650, 713), RED, close_r=2, border=3)
particle("heart2", (1661, 634, 1691, 659), RED, close_r=2, border=3)

# ---------------------------------------------------------------- full pages (for the storybook bookends)
book = (30, 300, 2560, 1723)                 # 16:9-ish window around the book
x0, y0, x1, y1 = book
page = cv2.resize(img[y0:y1, x0:x1], (1920, int(1920 * (y1 - y0) / (x1 - x0))), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(out_dir, "page.jpg"), page, [cv2.IMWRITE_JPEG_QUALITY, 90])
blank = img.copy()
hole = dilate(CUTOUTS | dilate(fire_fill, 4), 3)
blank[hole] = PAPER.astype(np.uint8)
# a faint grey 'where it used to be' edge, like a cut-out left a mark
edge = dilate(hole, 2) & ~hole
blank[edge] = (blank[edge] * 0.93).astype(np.uint8)
pb = cv2.resize(blank[y0:y1, x0:x1], page.shape[1::-1], interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(out_dir, "page_blank.jpg"), pb, [cv2.IMWRITE_JPEG_QUALITY, 90])
ph = cv2.resize(photo[y0:y1, x0:x1], page.shape[1::-1], interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(out_dir, "photo.jpg"), ph, [cv2.IMWRITE_JPEG_QUALITY, 90])
manifest["page"] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "px": page.shape[1], "py": page.shape[0]}

with open(os.path.join(out_dir, "sprites.json"), "w") as f:
    json.dump(manifest, f, indent=1)
with open(os.path.join(out_dir, "sprites.js"), "w") as f:   # loadable from file:// too
    f.write("window.SPRITES = " + json.dumps(manifest) + ";\n")
print(json.dumps(manifest))
