"""12-frame contact sheet from rendered frames.  python director/contact_sheet.py <frames_dir> <out.jpg> [prefix]"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
prefix = sys.argv[3] if len(sys.argv) > 3 else 'f_'
picks = [0, 90, 180, 330, 450, 570, 690, 810, 930, 1020, 1290, 1530] if len(sys.argv) <= 4 else [int(x) for x in sys.argv[4].split(',')]
W = 432; H = 540; pad = 14; cols = 4; rows = 3
sheet = Image.new('RGB', (cols * W + (cols + 1) * pad, rows * (H + 34) + (rows + 1) * pad), (14, 14, 18))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except Exception: font = ImageFont.load_default()
for i, f in enumerate(picks):
    p = os.path.join(src, f'{prefix}{f:04d}.png')
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS)
    x = pad + (i % cols) * (W + pad); y = pad + (i // cols) * (H + 34 + pad)
    sheet.paste(im, (x, y))
    d.text((x + 2, y + H + 6), f'{f / 60:05.2f} s   frame {f}', fill=(200, 200, 210), font=font)
sheet.save(out, quality=92)
print(out, sheet.size)
