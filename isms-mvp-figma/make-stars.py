# Starfield backdrop for the V11 3D viewer (matches the current black + star-noise look).
import random, sys
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
W, H = 1377, 725
random.seed(11)
im = Image.new('RGB', (W, H), (2, 3, 3))
d = ImageDraw.Draw(im)
for _ in range(2600):
    x, y = random.random() * W, random.random() * H
    b = int(random.random() ** 3 * 200) + 25
    r = 0.6 if random.random() < 0.85 else 1.1
    c = (b, b, min(255, b + 12))
    d.ellipse((x - r, y - r, x + r, y + r), fill=c)
im = im.filter(ImageFilter.GaussianBlur(0.35))
im.save(out, quality=86)
