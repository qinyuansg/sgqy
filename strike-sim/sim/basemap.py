"""Builds the static night-time base texture of the scene and the vector layers
that are drawn crisply in screen space every frame.

Output (work/):
  basemap.png    gamma-2 encoded RGB texture (sqrt of linear values)
  vectors.pkl    borders / oblast lines / front line in world km
"""
import json, math, os, pickle, glob
import numpy as np, cv2
from shapely.geometry import shape, box, LineString, MultiLineString, Polygon, MultiPolygon
from shapely.ops import unary_union, linemerge
from geo import project, unproject

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(ROOT, 'data', *p)
W_ = lambda *p: os.path.join(ROOT, 'work', *p)

RES = 0.4                       # km per texture pixel
X0, X1, Y0, Y1 = -1150.0, 1150.0, -800.0, 800.0
TW, TH = int((X1 - X0) / RES), int((Y1 - Y0) / RES)
BBOX = box(13.0, 39.5, 49.5, 57.5)   # lon/lat clip box for vector data

rng = np.random.default_rng(7)


def w2t(x, y):
    return (np.asarray(x) - X0) / RES, (Y1 - np.asarray(y)) / RES


def load(name):
    return json.load(open(D(name + '.geojson')))['features']


def geom_lonlat_to_tex(g):
    """Yield arrays of texture pixel coords for every ring/line of a geometry."""
    if g.is_empty:
        return
    if isinstance(g, (Polygon,)):
        rings = [g.exterior] + list(g.interiors)
    elif isinstance(g, (MultiPolygon,)):
        for p in g.geoms:
            yield from geom_lonlat_to_tex(p)
        return
    elif isinstance(g, (LineString,)):
        rings = [g]
    elif hasattr(g, 'geoms'):
        for p in g.geoms:
            yield from geom_lonlat_to_tex(p)
        return
    else:
        return
    for r in rings:
        a = np.asarray(r.coords)
        if len(a) < 2:
            continue
        tx, ty = w2t(*project(a[:, 0], a[:, 1]))
        yield np.c_[tx, ty]


def fill(mask, g, val=255):
    pts = [np.round(p * 16).astype(np.int32) for p in geom_lonlat_to_tex(g)]
    if pts:
        cv2.fillPoly(mask, pts, val, lineType=cv2.LINE_AA, shift=4)


def stroke(img, g, val, thick):
    for p in geom_lonlat_to_tex(g):
        cv2.polylines(img, [np.round(p * 16).astype(np.int32)], False, val, thick, cv2.LINE_AA, shift=4)


# ---------------------------------------------------------------- geography
def build_countries():
    feats = load('ne_10m_admin_1_states_provinces')
    ua_parts = [shape(f['geometry']).buffer(0) for f in feats
                if (f['properties'].get('iso_3166_2') or '').startswith('UA-')]
    ua = unary_union(ua_parts).buffer(0)
    oblasts = [shape(f['geometry']).buffer(0) for f in feats
               if (f['properties'].get('iso_3166_2') or '').startswith('UA-')]
    countries = {}
    for f in load('ne_10m_admin_0_countries'):
        g = shape(f['geometry']).buffer(0)
        if not g.intersects(BBOX):
            continue
        g = g.intersection(BBOX)
        a3 = f['properties']['ADM0_A3']
        if a3 == 'UKR':
            continue
        g = g.difference(ua)          # internationally recognised borders
        if not g.is_empty:
            countries[a3] = g
    countries['UKR'] = ua
    return ua, oblasts, countries


FRONT_LONLAT = [  # approximate line of contact, north -> south-west (illustrative)
    (37.95, 50.36), (37.70, 50.05), (37.62, 49.78), (37.80, 49.50), (38.02, 49.22),
    (38.10, 48.95), (37.88, 48.68), (37.62, 48.50), (37.30, 48.33), (37.02, 48.12),
    (36.72, 47.93), (36.32, 47.70), (35.95, 47.56), (35.55, 47.55), (35.28, 47.47),
    (34.70, 47.52), (34.25, 47.45), (33.80, 47.20), (33.40, 46.80), (32.98, 46.69),
    (32.62, 46.61), (32.30, 46.47), (31.80, 46.50), (31.50, 46.56)]


def build_occupied(ua):
    fl = list(FRONT_LONLAT)
    poly = Polygon(fl + [(31.0, 46.3), (31.0, 43.0), (42.0, 43.0), (42.0, 50.5), (38.2, 50.6)])
    return ua.intersection(poly.buffer(0))


# ------------------------------------------------------------------ terrain
def elevation_grid(lon, lat):
    Z = 8
    files = glob.glob(D('terrain', f'{Z}_*_*.png'))
    xs = sorted({int(f.split('_')[-2]) for f in files}); ys = sorted({int(f.split('_')[-1][:-4]) for f in files})
    mosaic = np.zeros((len(ys) * 256, len(xs) * 256), np.float32)
    for f in files:
        x = int(f.split('_')[-2]); y = int(f.split('_')[-1][:-4])
        im = cv2.imread(f, cv2.IMREAD_COLOR)[:, :, ::-1].astype(np.float32)
        e = im[:, :, 0] * 256 + im[:, :, 1] + im[:, :, 2] / 256 - 32768
        mosaic[(y - ys[0]) * 256:(y - ys[0] + 1) * 256, (x - xs[0]) * 256:(x - xs[0] + 1) * 256] = e
    n = 2 ** Z * 256
    mx = (lon + 180) / 360 * n - xs[0] * 256
    r = np.radians(lat)
    my = (1 - np.log(np.tan(r) + 1 / np.cos(r)) / np.pi) / 2 * n - ys[0] * 256
    return cv2.remap(mosaic, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def fbm(h, w, octaves=6, base=4, seed=1):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        s = base * 2 ** o
        n = r.standard_normal((max(2, h * s // w + 2), s + 2)).astype(np.float32)
        out += amp * cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC); tot += amp; amp *= 0.55
    return out / tot


def main():
    os.makedirs(W_(), exist_ok=True)
    print('texture', TW, TH)
    ua, oblasts, countries = build_countries()
    occupied = build_occupied(ua)

    # --- per-pixel lon/lat at half resolution (elevation is smooth)
    hw, hh = TW // 2, TH // 2
    gx, gy = np.meshgrid(X0 + (np.arange(hw) + 0.5) * RES * 2, Y1 - (np.arange(hh) + 0.5) * RES * 2)
    lon, lat = unproject(gx, gy)
    elev = elevation_grid(lon, lat)
    del gx, gy, lon, lat
    elev = cv2.resize(elev, (TW, TH), interpolation=cv2.INTER_CUBIC)

    # --- masks
    land = np.zeros((TH, TW), np.uint8)
    for f in load('ne_10m_land'):
        g = shape(f['geometry']).buffer(0)
        if g.intersects(BBOX):
            fill(land, g.intersection(BBOX))
    lakes = np.zeros((TH, TW), np.uint8)
    for name in ('ne_10m_lakes', 'ne_10m_lakes_europe'):
        for f in load(name):
            nm = f['properties'].get('name') or ''
            if 'Kakhovka' in nm:
                continue                  # drained since June 2023
            g = shape(f['geometry']).buffer(0)
            if g.intersects(BBOX):
                fill(lakes, g.intersection(BBOX))
    uam = np.zeros((TH, TW), np.uint8); fill(uam, ua)
    occ = np.zeros((TH, TW), np.uint8); fill(occ, occupied)
    land_f = land.astype(np.float32) / 255 * (1 - lakes.astype(np.float32) / 255)
    ua_f = uam.astype(np.float32) / 255
    occ_f = occ.astype(np.float32) / 255

    # --- hillshade (moonlight from the north-west)
    e = cv2.GaussianBlur(np.maximum(elev, 0), (0, 0), 1.2)
    px = RES * 1000.0
    ex = 9.0
    dzdx = cv2.Sobel(e, cv2.CV_32F, 1, 0, ksize=3) / (8 * px) * ex
    dzdy = cv2.Sobel(e, cv2.CV_32F, 0, 1, ksize=3) / (8 * px) * ex
    az, alt = math.radians(315), math.radians(38)
    lx, ly, lz = math.cos(alt) * math.sin(az), math.cos(alt) * math.cos(az), math.sin(alt)
    nz = 1 / np.sqrt(1 + dzdx ** 2 + dzdy ** 2)
    shade = (-dzdx * lx + dzdy * ly + lz) * nz          # image y points south
    shade = np.clip(shade / lz, 0, 2.2)
    relief_hi = np.clip(e / 1800.0, 0, 1)

    noise = fbm(TH, TW, octaves=7, base=6, seed=3)
    fields = fbm(TH, TW, octaves=3, base=180, seed=9)

    # --- colours (linear-ish floats)
    sea_deep = np.array([0.006, 0.012, 0.022]); sea_shallow = np.array([0.016, 0.030, 0.046])
    depth = cv2.GaussianBlur(np.clip(-elev / 2200.0, 0, 1) ** 0.6, (0, 0), 25)[..., None]
    sea = sea_shallow * (1 - depth) + sea_deep * depth
    sea = sea * (1 + 0.10 * noise[..., None])

    land_other = np.array([0.030, 0.032, 0.036])
    land_ua = np.array([0.060, 0.062, 0.066])
    base = land_other * (1 - ua_f[..., None]) + land_ua * ua_f[..., None]
    base = base * (1 - 0.18 * occ_f[..., None])
    tone = (0.55 + 0.55 * shade) * (1 + 0.10 * noise + 0.06 * fields) * (1 + 0.35 * relief_hi)
    landc = base * tone[..., None]
    moon = np.array([0.80, 0.90, 1.10])
    landc = landc * moon

    lf = land_f[..., None]
    img = sea * (1 - lf) + landc * lf
    lk = (lakes.astype(np.float32) / 255)[..., None]
    img = img * (1 - lk) + (sea_shallow * 1.3) * lk

    # --- rivers
    riv = np.zeros((TH, TW), np.uint8)
    for name in ('ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe'):
        for f in load(name):
            g = shape(f['geometry'])
            if not g.intersects(BBOX):
                continue
            sw = f['properties'].get('strokeweig') or 0.5
            th = 2 if sw >= 1.0 else 1
            stroke(riv, g.intersection(BBOX), int(150 + 60 * min(sw, 1.5)), th)
    rv = (cv2.GaussianBlur(riv, (0, 0), 0.6).astype(np.float32) / 255)[..., None]
    img = img * (1 - 0.75 * rv) + np.array([0.030, 0.055, 0.080]) * 0.75 * rv

    # --- night lights: roads + settlements
    lights = np.zeros((TH, TW), np.float32)
    roads = np.zeros((TH, TW), np.uint8)
    for f in load('ne_10m_roads'):
        g = shape(f['geometry'])
        if not g.intersects(BBOX):
            continue
        sr = f['properties'].get('scalerank') or 8
        v = 120 if sr <= 4 else (80 if sr <= 6 else 45)
        stroke(roads, g.intersection(BBOX), v, 1)
    speck = np.clip(fbm(TH, TW, octaves=2, base=900, seed=11) * 1.8 + 0.4, 0, 1)
    lights += cv2.GaussianBlur(roads.astype(np.float32) / 255, (0, 0), 0.7) * speck * 0.12

    spots = np.zeros((TH, TW), np.float32)

    def splat(cx, cy, n, sig, amp):
        """Heavy-tailed scatter of light specks -> irregular urban sprawl."""
        t = rng.standard_t(3, (n, 2)) * sig
        ang = rng.uniform(0, np.pi); ca, sa = np.cos(ang), np.sin(ang)
        t = t @ np.array([[ca, -sa], [sa, ca]]) * np.array([1.0, rng.uniform(0.55, 1.0)])
        pts = np.round(t + (cx, cy)).astype(int)
        ok = (pts[:, 0] >= 0) & (pts[:, 0] < TW) & (pts[:, 1] >= 0) & (pts[:, 1] < TH)
        np.add.at(spots, (pts[ok, 1], pts[ok, 0]), (amp * rng.uniform(0.1, 1.0, ok.sum()) ** 2).astype(np.float32))

    for f in load('ne_10m_populated_places'):
        p = f['properties']; lo, la = f['geometry']['coordinates']
        if not (14 < lo < 49 and 40 < la < 57):
            continue
        pop = max(p.get('POP_MAX') or 0, 5000)
        tx, ty = w2t(*project(lo, la))
        if not (0 <= tx < TW and 0 <= ty < TH):
            continue
        k = (pop / 1e6) ** 0.5
        splat(tx, ty, int(40 + 2600 * k), (0.7 + 2.2 * k) / RES, 0.9)
        splat(tx, ty, int(10 + 300 * k), (0.25 + 0.6 * k) / RES, 1.6)
    # villages strung along the road network
    for f in load('ne_10m_roads'):
        g = shape(f['geometry'])
        if not g.intersects(BBOX):
            continue
        for part in getattr(g.intersection(BBOX), 'geoms', [g.intersection(BBOX)]):
            if not isinstance(part, LineString) or part.length == 0:
                continue
            L = part.length
            for d in np.cumsum(rng.uniform(0.04, 0.16, int(L / 0.08) + 2)):
                if d > L:
                    break
                q = part.interpolate(d)
                tx, ty = w2t(*project(q.x, q.y))
                if 0 <= tx < TW and 0 <= ty < TH:
                    splat(tx, ty, int(rng.integers(3, 22)), rng.uniform(0.3, 0.9) / RES, 0.55)
    spots = cv2.GaussianBlur(spots, (0, 0), 0.8) * 1.3 + cv2.GaussianBlur(spots, (0, 0), 5) * 0.9 \
        + cv2.GaussianBlur(spots, (0, 0), 18) * 0.6
    lights += spots
    # wartime blackout: Ukrainian settlements are much darker than neighbours
    dim = 1 - 0.55 * ua_f
    lights = (1 - np.exp(-lights * 1.6)) * dim * land_f
    warm = np.array([1.0, 0.62, 0.30])
    img = img + warm * (lights[..., None] * 0.55)

    # --- occupied territory hatching (texture space so it lies on the ground)
    yy, xx = np.mgrid[0:TH, 0:TW].astype(np.float32)
    period = 20.0
    d = np.abs(((xx + yy) % period) - period / 2) / (period / 2)
    hatch = np.clip((0.16 - np.abs(d - 0.5)) * 9, 0, 1) * occ_f
    img = img + np.array([0.11, 0.11, 0.12]) * hatch[..., None]
    del xx, yy, d

    # --- ground labels (they lie on the terrain and tilt with the camera)
    from PIL import Image, ImageDraw, ImageFont
    lab = Image.new('L', (TW, TH), 0); dr = ImageDraw.Draw(lab)
    FONT = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
    FONT_I = '/usr/share/fonts/opentype/inter/Inter-LightItalic.otf'
    for text, lo, la, km, track, italic, val in [
            ('RUSSIA', 39.4, 51.15, 30, 1.0, False, 150), ('BELARUS', 27.9, 52.75, 22, 1.0, False, 140),
            ('POLAND', 21.4, 51.45, 22, 1.0, False, 140), ('MOLDOVA', 28.55, 47.55, 9, 0.8, False, 140),
            ('ROMANIA', 24.6, 46.35, 20, 1.0, False, 125), ('SLOVAKIA', 19.6, 48.75, 12, 0.9, False, 110),
            ('HUNGARY', 20.0, 47.25, 14, 1.0, False, 110), ('LITHUANIA', 23.9, 55.1, 12, 0.9, False, 100),
            ('Black Sea', 32.9, 43.35, 26, 0.35, True, 120), ('Sea of Azov', 36.75, 46.05, 10, 0.25, True, 120)]:
        f = ImageFont.truetype(FONT_I if italic else FONT, int(km / RES))
        tx, ty = w2t(*project(lo, la))
        widths = [dr.textlength(ch, font=f) for ch in text]
        sp = track * km / RES * 0.9
        total = sum(widths) + sp * (len(text) - 1)
        x = tx - total / 2
        for ch, w in zip(text, widths):
            dr.text((x, ty), ch, font=f, fill=val, anchor='lm'); x += w + sp
    lab = cv2.GaussianBlur(np.asarray(lab).astype(np.float32) / 255, (0, 0), 0.8)
    img = img + np.array([0.11, 0.115, 0.125]) * lab[..., None]

    enc = np.sqrt(np.clip(img, 0, 1)) * 255
    cv2.imwrite(W_('basemap.png'), np.round(enc[:, :, ::-1]).astype(np.uint8))
    print('basemap written')

    # ----------------------------------------------------------- vectors
    def lines_world(g, tol=0.004):
        g = g.simplify(tol)
        out = []
        geoms = getattr(g, 'geoms', [g])
        for s in geoms:
            if isinstance(s, LineString) and len(s.coords) > 1:
                a = np.asarray(s.coords); out.append(np.c_[project(a[:, 0], a[:, 1])])
            elif hasattr(s, 'geoms'):
                out += lines_world(s, tol)
        return out

    others = unary_union([g for k, g in countries.items() if k != 'UKR'])
    ua_border = ua.boundary.intersection(others.buffer(0.03))
    ua_coast = ua.boundary.difference(others.buffer(0.03))
    nb = []
    keys = [k for k in countries if k != 'UKR']
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            ga, gb = countries[a], countries[b]
            if ga.distance(gb) < 0.05:
                s = ga.boundary.intersection(gb.buffer(0.03))
                if not s.is_empty:
                    nb.append(s)
    obl = linemerge(unary_union([o.boundary for o in oblasts]).difference(ua.boundary.buffer(0.02)))
    fl = np.asarray(FRONT_LONLAT)
    vec = dict(ua_border=lines_world(ua_border), ua_coast=lines_world(ua_coast),
               borders=lines_world(unary_union(nb)), oblasts=lines_world(obl),
               front=[np.c_[project(fl[:, 0], fl[:, 1])]],
               extent=(X0, X1, Y0, Y1), res=RES)
    pickle.dump(vec, open(W_('vectors.pkl'), 'wb'))
    print({k: (len(v) if isinstance(v, list) else v) for k, v in vec.items()})


if __name__ == '__main__':
    main()
