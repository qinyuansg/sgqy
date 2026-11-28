"""UI / badge / PCB textures for the HYALO G1 glass gate, drawn from scratch with pillow.

    /opt/blender-env/venv/bin/python look/make_textures.py      -> look/tex/*.png  (+ look/tex/_contact.png to look at)

All text and marks are invented (brand HYALO, model G1). Emissive images are drawn on black: black = no light.
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
SS = 2  # supersampling

IDLE = (120, 110, 255)      # blue-violet (the idle LED colour)
IDLE_HI = (200, 195, 255)
GREEN = (40, 255, 120)
WHITE = (240, 244, 255)
DIM = (70, 72, 110)

_FONTS = {
    'bold': ['/usr/share/fonts/opentype/inter/Inter-Bold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
    'semi': ['/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
    'med': ['/usr/share/fonts/opentype/inter/Inter-Medium.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
    'light': ['/usr/share/fonts/opentype/inter/Inter-Light.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
    'mono': ['/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'],
}


def font(kind, px):
    for p in _FONTS[kind]:
        if os.path.exists(p):
            return ImageFont.truetype(p, int(px * SS))
    return ImageFont.load_default()


class Canvas:
    def __init__(self, w, h, bg=(0, 0, 0)):
        self.w, self.h = w, h
        self.im = Image.new('RGB', (w * SS, h * SS), bg)
        self.d = ImageDraw.Draw(self.im)

    def S(self, *v):
        return [x * SS for x in v]

    def text(self, xy, s, kind, px, fill, anchor='mm', spacing=0.0):
        f = font(kind, px)
        if spacing:
            # manual tracking
            widths = [self.d.textlength(ch, font=f) for ch in s]
            total = sum(widths) + spacing * SS * px * (len(s) - 1)
            x = xy[0] * SS - total / 2
            for ch, w in zip(s, widths):
                self.d.text((x, xy[1] * SS), ch, font=f, fill=fill, anchor='lm')
                x += w + spacing * SS * px
        else:
            self.d.text((xy[0] * SS, xy[1] * SS), s, font=f, fill=fill, anchor=anchor)

    def line(self, pts, fill, width):
        self.d.line([(x * SS, y * SS) for x, y in pts], fill=fill, width=int(width * SS), joint='curve')
        r = width * SS / 2
        for x, y in (pts[0], pts[-1]):
            self.d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=fill)

    def rrect(self, box, r, outline=None, fill=None, width=1):
        self.d.rounded_rectangle(self.S(*box), radius=r * SS, outline=outline, fill=fill, width=int(width * SS))

    def ellipse(self, box, outline=None, fill=None, width=1):
        self.d.ellipse(self.S(*box), outline=outline, fill=fill, width=int(width * SS))

    def arc(self, box, a0, a1, fill, width):
        self.d.arc(self.S(*box), a0, a1, fill=fill, width=int(width * SS))

    def done(self, glow=0.0):
        im = self.im.resize((self.w, self.h), Image.LANCZOS)
        if glow > 0:  # soft bloom baked into the emissive image
            g = im.filter(ImageFilter.GaussianBlur(glow))
            im = Image.blend(im, Image.eval(Image.merge('RGB', [Image.eval(c, lambda v: v) for c in g.split()]), lambda v: v), 0.0)
            from PIL import ImageChops
            im = ImageChops.screen(im, Image.eval(g, lambda v: int(v * 0.55)))
        return im


def brackets(c, box, ln, col, width):
    x0, y0, x1, y1 = box
    for (x, y, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x1, y1, -1, -1), (x0, y1, 1, -1)):
        c.line([(x + dx * ln, y), (x, y), (x, y + dy * ln)], col, width)


def status_bar(c, w, col=DIM):
    c.text((28, 34), 'HYALO', 'bold', 20, WHITE, anchor='lm')
    c.text((106, 35), 'G1', 'med', 18, col, anchor='lm')
    c.text((w - 28, 35), 'LANE 01', 'mono', 16, col, anchor='rm')
    c.line([(28, 62), (w - 28, 62)], (40, 40, 70), 1.5)


def lcd_idle():
    W, H = 540, 960
    c = Canvas(W, H, (2, 2, 6))
    status_bar(c, W)
    cx, cy = W / 2, 400
    # face outline: head oval + shoulders, drawn as a scan target
    c.ellipse((cx - 105, cy - 150, cx + 105, cy + 110), outline=IDLE_HI, width=5)
    c.arc((cx - 190, cy + 135, cx + 190, cy + 440), 200, 340, IDLE_HI, 5)
    brackets(c, (cx - 190, cy - 215, cx + 190, cy + 265), 46, IDLE, 7)
    # scan line and ticks
    c.line([(cx - 150, cy - 20), (cx + 150, cy - 20)], (90, 80, 220), 2)
    for i in range(-3, 4):
        c.line([(cx + i * 40, cy - 26), (cx + i * 40, cy - 14)], (90, 80, 220), 2)
    c.text((cx, 742), 'LOOK HERE', 'bold', 58, WHITE, spacing=0.06)
    c.text((cx, 806), 'or tap your card below', 'med', 24, (150, 150, 200))
    # footer: three mode chips
    for i, t in enumerate(('FACE', 'QR', 'CARD')):
        x = cx + (i - 1) * 150
        c.rrect((x - 60, 868, x + 60, 912), 22, outline=IDLE if i == 0 else (60, 60, 100), width=2)
        c.text((x, 890), t, 'semi', 19, WHITE if i == 0 else (120, 120, 160))
    return c.done(glow=5)


def check(c, cx, cy, r, col, width):
    c.line([(cx - 0.48 * r, cy + 0.02 * r), (cx - 0.12 * r, cy + 0.38 * r), (cx + 0.52 * r, cy - 0.34 * r)], col, width)


def lcd_grant():
    W, H = 540, 960
    c = Canvas(W, H, (1, 6, 3))
    status_bar(c, W, col=(60, 130, 90))
    cx, cy = W / 2, 400
    c.ellipse((cx - 170, cy - 170, cx + 170, cy + 170), outline=GREEN, width=12)
    c.ellipse((cx - 205, cy - 205, cx + 205, cy + 205), outline=(20, 110, 60), width=3)
    check(c, cx, cy, 170, WHITE, 30)
    c.text((cx, 712), 'WELCOME', 'bold', 66, WHITE, spacing=0.06)
    c.text((cx, 786), 'ACCESS GRANTED', 'semi', 28, GREEN, spacing=0.12)
    c.rrect((cx - 190, 866, cx + 190, 912), 23, outline=(30, 150, 80), width=2)
    c.text((cx, 889), 'PLEASE WALK THROUGH', 'semi', 19, (190, 255, 215))
    return c.done(glow=5)


def wing_idle():
    W, H = 800, 1440
    c = Canvas(W, H)
    cx = W / 2
    c.rrect((30, 30, W - 30, H - 30), 40, outline=(70, 62, 190), width=4)
    # big ring mark (invented HYALO mark: a ring with a gap and a dot)
    cy, R = 560, 215
    c.arc((cx - R, cy - R, cx + R, cy + R), -60, 240, IDLE_HI, 26)
    c.ellipse((cx - 34, cy - R - 60, cx + 34, cy - R + 8), fill=IDLE)
    c.arc((cx - R * 0.55, cy - R * 0.55, cx + R * 0.55, cy + R * 0.55), 120, 420, (90, 80, 230), 8)
    c.text((cx, 930), 'HYALO', 'bold', 128, WHITE, spacing=0.10)
    c.text((cx, 1035), 'CLEAR PASSAGE', 'med', 40, (150, 145, 235), spacing=0.22)
    # stand-by row of bars
    for i in range(9):
        x = cx + (i - 4) * 62
        c.rrect((x - 20, 1210, x + 20, 1222), 6, fill=IDLE if i % 2 == 0 else (60, 55, 150))
    c.text((cx, 1290), 'SCAN TO ENTER', 'semi', 46, WHITE, spacing=0.12)
    return c.done(glow=7)


def wing_grant():
    W, H = 800, 1440
    c = Canvas(W, H)
    cx = W / 2
    c.rrect((30, 30, W - 30, H - 30), 40, outline=(20, 170, 90), width=4)
    # three stacked chevrons pointing up (= walk through), brightest at the top
    for i, col in enumerate(((235, 255, 242), GREEN, (18, 150, 75))):
        y = 330 + i * 190
        c.line([(cx - 230, y + 140), (cx, y - 60), (cx + 230, y + 140)], col, 46)
    c.text((cx, 1010), 'WELCOME', 'bold', 122, WHITE, spacing=0.07)
    c.text((cx, 1118), 'ACCESS GRANTED', 'semi', 44, GREEN, spacing=0.16)
    cy, R = 1280, 66
    c.ellipse((cx - R, cy - R, cx + R, cy + R), outline=GREEN, width=8)
    check(c, cx, cy, R, WHITE, 13)
    return c.done(glow=7)


def badge():
    """Grey-scale mask: white = engraved/filled letters, black = bare plate."""
    W, H = 960, 288
    c = Canvas(W, H)
    c.rrect((10, 10, W - 10, H - 10), 28, outline=(110, 110, 110), width=3)
    # ring mark
    cx, cy, R = 118, H / 2 + 8, 56
    c.arc((cx - R, cy - R, cx + R, cy + R), -60, 240, (255, 255, 255), 14)
    c.ellipse((cx - 12, cy - R - 22, cx + 12, cy - R + 2), fill=(255, 255, 255))
    c.text((478, H / 2 - 2), 'HYALO', 'bold', 112, (255, 255, 255), spacing=0.12)
    c.rrect((792, 100, 912, 188), 16, outline=(255, 255, 255), width=5)
    c.text((852, 144), 'G1', 'bold', 58, (255, 255, 255))
    return c.done()


def pcb_traces(seed=7, N=1024):
    """Tileable PCB art. R = copper traces under the mask, G = exposed gold (pads / vias), B = silkscreen."""
    rnd = random.Random(seed)
    S = 2
    im = Image.new('RGB', (N * S, N * S), (0, 0, 0))
    d = ImageDraw.Draw(im)
    grid = 16 * S                       # routing pitch in px

    def seg(ch, p0, p1, w):
        col = [0, 0, 0]; col[ch] = 255
        for ox in (-N * S, 0, N * S):
            for oy in (-N * S, 0, N * S):
                d.line([(p0[0] + ox, p0[1] + oy), (p1[0] + ox, p1[1] + oy)], fill=None, width=0) if False else None
        return col

    tr = Image.new('L', (N * S, N * S), 0); dt = ImageDraw.Draw(tr)
    pad = Image.new('L', (N * S, N * S), 0); dp = ImageDraw.Draw(pad)
    silk = Image.new('L', (N * S, N * S), 0); ds = ImageDraw.Draw(silk)

    def wrap_line(draw, pts, w):
        for ox in (-N * S, 0, N * S):
            for oy in (-N * S, 0, N * S):
                draw.line([(x + ox, y + oy) for x, y in pts], fill=255, width=w, joint='curve')

    def wrap_dot(draw, x, y, r, fill=255, square=False):
        for ox in (-N * S, 0, N * S):
            for oy in (-N * S, 0, N * S):
                b = [x + ox - r, y + oy - r, x + ox + r, y + oy + r]
                (draw.rectangle if square else draw.ellipse)(b, fill=fill)

    ncell = N * S // grid
    # buses: bundles of parallel traces with 45-degree jogs
    for _ in range(46):
        x, y = rnd.randrange(ncell) * grid, rnd.randrange(ncell) * grid
        horiz = rnd.random() < 0.5
        n = rnd.choice((1, 1, 2, 3, 4, 6, 8))
        w = rnd.choice((3, 3, 4, 6)) * S // 2 + 1
        pitch = grid // 2
        length = rnd.randrange(8, 40) * grid
        jog = rnd.choice((-3, -2, 2, 3)) * grid
        l1 = rnd.randrange(3, 8) * grid
        for k in range(n):
            o = k * pitch
            if horiz:
                pts = [(x, y + o), (x + l1 + o, y + o), (x + l1 + o + abs(jog), y + o + jog), (x + length, y + o + jog)]
            else:
                pts = [(x + o, y), (x + o, y + l1 - o), (x + o + jog, y + l1 - o + abs(jog)), (x + o + jog, y + length)]
            wrap_line(dt, pts, w)
            for px, py in (pts[0], pts[-1]):
                wrap_dot(dt, px, py, w * 1.4)
                wrap_dot(dp, px, py, w * 0.9)
    # via fields and pad rows (IC footprints)
    for _ in range(30):
        x, y = rnd.randrange(ncell) * grid, rnd.randrange(ncell) * grid
        n = rnd.randrange(4, 12)
        horiz = rnd.random() < 0.5
        for k in range(n):
            px, py = (x + k * grid * 0.5, y) if horiz else (x, y + k * grid * 0.5)
            hw, hh = (3 * S, 7 * S) if horiz else (7 * S, 3 * S)
            for ox in (-N * S, 0, N * S):
                for oy in (-N * S, 0, N * S):
                    dp.rectangle([px + ox - hw, py + oy - hh, px + ox + hw, py + oy + hh], fill=255)
            wrap_dot(dt, px, py, 5 * S, square=True)
    for _ in range(90):
        x, y = rnd.randrange(N * S), rnd.randrange(N * S)
        wrap_dot(dt, x, y, 6 * S)
        wrap_dot(dp, x, y, 4 * S)
        wrap_dot(dp, x, y, 2 * S, fill=0)
    # silkscreen: outlines and designators
    f = ImageFont.truetype(_FONTS['mono'][0], 13 * S) if os.path.exists(_FONTS['mono'][0]) else ImageFont.load_default()
    for i in range(26):
        x, y = rnd.randrange(ncell - 6) * grid, rnd.randrange(ncell - 6) * grid
        w, h = rnd.randrange(2, 6) * grid, rnd.randrange(2, 5) * grid
        ds.rectangle([x, y, x + w, y + h], outline=255, width=S)
        ds.text((x + 2 * S, y - 16 * S), rnd.choice(('U', 'R', 'C', 'Q', 'D', 'J', 'L')) + str(rnd.randrange(1, 99)), font=f, fill=255)
    out = Image.merge('RGB', [tr, pad, silk]).resize((N, N), Image.LANCZOS)
    return out


def contact(images):
    """One sheet of all the textures, to look at."""
    H = 480
    tiles = []
    for name, im in images.items():
        t = im.convert('RGB')
        t = t.resize((int(t.width * H / t.height), H), Image.LANCZOS)
        tiles.append(t)
    W = sum(t.width for t in tiles) + 8 * (len(tiles) + 1)
    sheet = Image.new('RGB', (W, H + 16), (40, 40, 40))
    x = 8
    for t in tiles:
        sheet.paste(t, (x, 8)); x += t.width + 8
    return sheet


def main():
    os.makedirs(TEX, exist_ok=True)
    images = {
        'lcd_idle.png': lcd_idle(), 'lcd_grant.png': lcd_grant(),
        'wing_idle.png': wing_idle(), 'wing_grant.png': wing_grant(),
        'badge.png': badge(), 'pcb_traces.png': pcb_traces(),
    }
    for name, im in images.items():
        im.save(os.path.join(TEX, name))
        print('wrote', name, im.size)
    contact(images).save(os.path.join(TEX, '_contact.png'))


if __name__ == '__main__':
    main()
