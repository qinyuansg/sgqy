# LiDAR point-cloud still (fence line + one human-sized cluster) for the camera grid.
import random, sys, math
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
W, H = 1280, 720
random.seed(5)
im = Image.new('RGB', (W, H), (6, 10, 14)); d = ImageDraw.Draw(im)
for k in range(-20, 40):  # ground rings
    y = 420 + k * k * 0.9
    if y > H: break
    d.line((0, y, W, y), fill=(14, 40, 48), width=1)
for i in range(0, W, 14):  # fence: posts + mesh points
    for j in range(0, 170, 9):
        if random.random() < 0.55: d.point((i + random.random() * 4, 250 + j + random.random() * 3), fill=(40, 150, 165))
for x in range(0, W, 92):
    for j in range(0, 200, 4): d.point((x, 240 + j), fill=(80, 190, 205))
cx, cy = 660, 330  # person cluster
for _ in range(900):
    t = random.random()
    if t < 0.15: px, py = cx + random.gauss(0, 9), cy - 95 + random.gauss(0, 9)
    elif t < 0.6: px, py = cx + random.gauss(0, 18), cy - 40 + random.gauss(0, 28)
    else: px, py = cx + random.choice([-9, 9]) + random.gauss(0, 6), cy + 40 + random.random() * 70
    v = 200 + int(random.random() * 55)
    d.ellipse((px - 1.4, py - 1.4, px + 1.4, py + 1.4), fill=(v, 120, 90))
for _ in range(1500):  # far noise
    d.point((random.random() * W, random.random() * H), fill=(20, 60, 70))
im = im.filter(ImageFilter.GaussianBlur(0.4))
im.save(out, quality=86)
