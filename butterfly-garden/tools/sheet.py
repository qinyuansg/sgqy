"""Contact sheet of rendered review frames: python3 sheet.py <dir> <out.jpg>"""
import glob, sys
from PIL import Image
fs = sorted(glob.glob(sys.argv[1] + '/f_*.jpg'), key=lambda f: float(f.split('f_')[1][:-4]))
ims = [Image.open(f).resize((960, 540)) for f in fs]
sheet = Image.new('RGB', (1920, 540 * ((len(ims) + 1) // 2)), 'black')
for i, im in enumerate(ims):
    sheet.paste(im, ((i % 2) * 960, (i // 2) * 540))
sheet.save(sys.argv[2], quality=85)
