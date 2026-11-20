"""Frame renderer: perspective ground warp, crisp vectors, glowing trails,
explosions, interceptors, bloom/grade and HUD.  Every frame is a pure function
of video time, so chunks render in parallel.

  python3 sim/render.py stills 3 10 20          -> work/still_XX.png
  python3 sim/render.py chunk START END OUT.mp4  -> encoded segment
"""
import os, sys, math, pickle, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
import scene as SC
from geo import project

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WK = lambda *p: os.path.join(ROOT, 'work', *p)
W, H, BAR = SC.W, SC.H, SC.BAR
FOVH = math.radians(52.0)
FPX = (W / 2) / math.tan(FOVH / 2)
cv2.setNumThreads(1)

FONT = {
    'disp_b': '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf',
    'disp_sb': '/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf',
    'sb': '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf',
    'md': '/usr/share/fonts/opentype/inter/Inter-Medium.otf',
    'rg': '/usr/share/fonts/opentype/inter/Inter-Regular.otf',
    'lt': '/usr/share/fonts/opentype/inter/Inter-Light.otf',
    'mono': '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf',
    'mono_l': '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf',
}


# ======================================================================= assets
class Assets:
    def __init__(self):
        tex = cv2.imread(WK('basemap.png'), cv2.IMREAD_COLOR)[:, :, ::-1].copy()
        # feather the texture edges into the fog colour so its boundary never shows
        th_, tw_ = tex.shape[:2]; m = 420
        ex = np.minimum(np.arange(tw_), np.arange(tw_)[::-1]).astype(np.float32)
        ey = np.minimum(np.arange(th_), np.arange(th_)[::-1]).astype(np.float32)
        fx_ = np.clip(ex / m, 0, 1); fy_ = np.clip(ey / m, 0, 1)
        wgt = (fy_[:, None] * fx_[None, :]) ** 0.7
        wgt = (wgt * wgt * (3 - 2 * wgt))[..., None]
        tex = (tex.astype(np.float32) * wgt + np.array([22, 29, 38], np.float32) * (1 - wgt)).astype(np.uint8)
        self.levels = [tex]
        for _ in range(3):
            self.levels.append(cv2.pyrDown(self.levels[-1]))
        vec = pickle.load(open(WK('vectors.pkl'), 'rb'))
        self.X0, self.X1, self.Y0, self.Y1 = vec['extent']; self.RES = vec['res']
        styles = {'oblasts': ((46, 50, 60), 1), 'borders': ((105, 112, 128), 1), 'ua_coast': ((60, 72, 88), 1),
                  'front': ((150, 70, 45), 1), 'ua_border': ((150, 160, 182), 2)}
        self.vec = []
        for k, (col, th) in styles.items():
            lines = [l for l in vec[k] if len(l) > 1]
            pts = np.vstack(lines); off = np.r_[0, np.cumsum([len(l) for l in lines])]
            self.vec.append((k, col, th, np.c_[pts, np.zeros(len(pts))], off))

        T = pickle.load(open(WK('tracks.pkl'), 'rb'))
        self.kinds = T['kinds']
        self.col = {k: np.array(v[1], np.float32) for k, v in T['kinds'].items()}
        trk = T['tracks']
        self.tracks = trk
        self.XYZ = np.vstack([t['xyz'] for t in trk]).astype(np.float64)
        self.TAU = np.concatenate([t['tau'] for t in trk]).astype(np.float64)
        self.VT = SC.s2v(self.TAU)
        self.off = np.r_[0, np.cumsum([len(t['tau']) for t in trk])]
        # ballistic ground tracks (shadows)
        self.shadow_ids = [i for i, t in enumerate(trk) if t['kind'] == 'iskm']
        self.hits = sorted(T['hits'], key=lambda h: h['S'])
        for i, h in enumerate(self.hits):
            h['v'] = float(SC.s2v(h['S'])); h['seed'] = i
        self.pops = T['pops']
        rng = np.random.default_rng(11)
        for i, p in enumerate(self.pops):
            p['v'] = float(SC.s2v(p['S'])); p['seed'] = 1000 + i
            k = p['kind']
            sam = k != 'drone' or rng.random() < 0.35
            p['sams'] = []
            if sam:
                n = 2 if k == 'iskm' else 1
                for j in range(n):
                    if k == 'iskm':
                        kx, ky = project(30.52, 50.45)
                        a = rng.uniform(0, 2 * np.pi); d = rng.uniform(8, 28)
                        L = np.array([kx + d * np.cos(a), ky + d * np.sin(a), 0.0]); dur = rng.uniform(1.1, 1.5)
                    else:
                        a = rng.uniform(0, 2 * np.pi); d = rng.uniform(10, 28) if k == 'drone' else rng.uniform(22, 50)
                        L = np.array([p['x'] + d * np.cos(a), p['y'] + d * np.sin(a), 0.0]); dur = rng.uniform(0.45, 0.8)
                    p['sams'].append((L, dur, j * 0.18))
        self.sites = T['sites']
        self.site_launch = {}
        for t in trk:
            if t['site']:
                self.site_launch.setdefault(t['site'], []).append(float(SC.s2v(t['tau'][0])))
        cities, seen = [], set()
        for name, lo, la, tier, ua in SC.CITIES:
            if name in seen:
                continue
            seen.add(name); x, y = project(lo, la)
            cities.append((name, float(x), float(y), tier, ua))
        self.cities = cities
        self.n_drones = sum(t['kind'] == 'drone' for t in trk); self.n_missiles = len(trk) - self.n_drones
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r2 = ((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2
        self.vignette = (1 - 0.42 * np.clip(r2 / 1.6, 0, 1) ** 1.3)[..., None].astype(np.float32)


A = None
_txt_cache, _spr_cache = {}, {}


# ======================================================================= camera
def make_cam(v):
    c = SC.camera(v)
    th, ps = math.radians(c['pitch']), math.radians(c['heading'])
    f = np.array([math.sin(ps) * math.sin(th), math.cos(ps) * math.sin(th), -math.cos(th)])
    r = np.array([math.cos(ps), -math.sin(ps), 0.0])
    u = np.cross(r, f)
    T = np.array([c['tx'], c['ty'], 0.0])
    C = T - c['dist'] * f
    R = np.stack([r, -u, f])
    sx, sy = shake(v, c)
    K = np.array([[FPX, 0, W / 2 + sx], [0, FPX, H / 2 + sy], [0, 0, 1.0]])
    c.update(R=R, C=C, K=K, T=T)
    return c


def shake(v, c):
    amp = 0.0
    for h in A.hits:
        dt = v - h['v']
        if 0 <= dt < 1.6:
            d = math.hypot(h['x'] - c['tx'], h['y'] - c['ty'])
            vis = math.exp(-d / (0.55 * c['dist']))
            amp += (1.0 if h['big'] else 0.3) * vis * math.exp(-dt / 0.28)
    amp = min(amp, 1.6)
    sx = amp * 9 * (math.sin(v * 71.3) + 0.6 * math.sin(v * 117.1 + 1.3))
    sy = amp * 9 * (math.sin(v * 83.9 + 0.4) + 0.6 * math.sin(v * 131.7 + 2.1))
    sx += 1.6 * (math.sin(v * 0.71) + 0.5 * math.sin(v * 1.93 + 2.0))
    sy += 1.3 * (math.sin(v * 0.53 + 1.0) + 0.5 * math.sin(v * 1.61 + 0.3))
    return sx, sy


def proj(cam, P):
    Q = (P - cam['C']) @ cam['R'].T
    z = Q[:, 2]; zs = np.maximum(z, 1e-3)
    K = cam['K']
    x = np.clip(K[0, 0] * Q[:, 0] / zs + K[0, 2], -1e6, 1e6)
    y = np.clip(K[1, 1] * Q[:, 1] / zs + K[1, 2], -1e6, 1e6)
    return x, y, z


# ======================================================================= ground
FOG = np.array([0.0075, 0.0125, 0.021], np.float32)


def render_ground(cam):
    R, C, K = cam['R'], cam['C'], cam['K']
    Am = np.array([[A.RES, 0, A.X0], [0, -A.RES, A.Y1], [0, 0, 0]])
    Mt = R @ Am; Mt[:, 2] -= R @ C
    Hm = K @ Mt
    Hi = np.linalg.inv(Hm)
    y0r, y1r = BAR - 4, H - BAR + 4
    ys = np.arange(y0r, y1r, dtype=np.float64)
    def tex_at(x, y):
        p = np.c_[np.full_like(y, x), y, np.ones_like(y)] @ Hi.T
        return p[:, :2] / p[:, 2:3], p[:, 2]
    p0, wz = tex_at(W / 2, ys); py, _ = tex_at(W / 2, ys + 1); px, _ = tex_at(W / 2 + 1, ys)
    foot = np.maximum(np.hypot(*(py - p0).T), np.hypot(*(px - p0).T))
    lod = np.clip(np.log2(np.maximum(foot, 1e-6)) - 0.35, 0, 3)
    out = np.zeros((y1r - y0r, W, 3), np.float32)
    for k in range(4):
        wk = np.clip(1 - np.abs(lod - k), 0, 1)
        nz = np.nonzero(wk > 0)[0]
        if len(nz) == 0:
            continue
        a, b = nz[0], nz[-1] + 1
        S = np.diag([2.0 ** k, 2.0 ** k, 1.0])
        Tsh = np.array([[1, 0, 0], [0, 1, -(y0r + a)], [0, 0, 1.0]])
        band = cv2.warpPerspective(A.levels[k], Tsh @ Hm @ S, (W, b - a), flags=cv2.INTER_LINEAR,
                                   borderMode=cv2.BORDER_CONSTANT, borderValue=(22, 29, 38))
        out[a:b] += band.astype(np.float32) * wk[a:b, None, None]
    out *= 1 / 255.0
    out *= out
    # distance fog per row
    world = np.c_[A.X0 + p0[:, 0] * A.RES, A.Y1 - p0[:, 1] * A.RES]
    d = np.hypot(np.hypot(world[:, 0] - C[0], world[:, 1] - C[1]), C[2])
    bad = wz <= 0
    fog = 1 - np.exp(-np.maximum(d - 0.75 * cam['dist'], 0) / (1.6 * cam['dist']))
    fog[bad] = 1
    fog = fog.astype(np.float32)[:, None, None]
    img = np.zeros((H, W, 3), np.float32)
    img[y0r:y1r] = out * (1 - fog) + FOG * fog
    return img, (y0r, fog)


def runs(valid):
    """Index ranges [a,b) of consecutive True values."""
    v = np.r_[False, valid, False].astype(np.int8)
    d = np.diff(v)
    return zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0])


def draw_vectors(img, cam, fogpack):
    layer = np.zeros((H, W, 3), np.uint8)
    for name, col, th, P, off in A.vec:
        x, y, z = proj(cam, P)
        ok = (z > 2) & (np.abs(x - W / 2) < 3 * W) & (np.abs(y - H / 2) < 3 * H)
        pts = np.round(np.c_[x, y] * 8).astype(np.int32)
        polys = []
        for i in range(len(off) - 1):
            a, b = off[i], off[i + 1]
            for ra, rb in runs(ok[a:b]):
                if rb - ra > 1:
                    polys.append(pts[a + ra:a + rb])
        if polys:
            cv2.polylines(layer, polys, False, col, th, cv2.LINE_AA, shift=3)
    y0r, fog = fogpack
    L = layer.astype(np.float32) * (1 / 255.0)
    L *= L
    L[y0r:y0r + len(fog)] *= (1 - fog)
    img += L * 0.9


# ======================================================================= sprites
def sprite(rad, prof):
    key = (prof, int(round(math.log(max(rad, 0.5)) / math.log(1.05))))
    s = _spr_cache.get(key)
    if s is None:
        R = 1.05 ** key[1]
        n = int(math.ceil(R))
        yy, xx = np.mgrid[-n:n + 1, -n:n + 1].astype(np.float32)
        q2 = (xx * xx + yy * yy) / (R * R)
        if prof == 'gauss':
            s = np.exp(-4.0 * q2)
        elif prof == 'core':
            s = np.exp(-18.0 * q2) * 1.0 + np.exp(-3.5 * q2) * 0.25
        elif prof == 'flash':
            s = 1.6 * np.exp(-70 * q2) + 0.55 * np.exp(-12 * q2) + 0.22 * np.exp(-3.2 * q2)
        s = (s * (q2 < 1)).astype(np.float32)
        _spr_cache[key] = s
    return s


def add_sprite(layer, x, y, rad, color, inten, prof='gauss'):
    if not (np.isfinite(x) and np.isfinite(y)) or inten <= 0:
        return
    rad = float(np.clip(rad, 0.8, 520))
    s = sprite(rad, prof)
    n = s.shape[0] // 2
    xi, yi = int(round(x)), int(round(y))
    x0, y0, x1, y1 = xi - n, yi - n, xi + n + 1, yi + n + 1
    if x1 <= 0 or y1 <= 0 or x0 >= W or y0 >= H:
        return
    sx0, sy0 = max(0, -x0), max(0, -y0)
    sx1, sy1 = s.shape[1] - max(0, x1 - W), s.shape[0] - max(0, y1 - H)
    patch = s[sy0:sy1, sx0:sx1, None] * (np.asarray(color, np.float32) * inten)
    layer[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] += patch


# ======================================================================= trails
PERSIST = {'drone': 0.20, 'x101': 0.30, 'kalibr': 0.32, 'kh59': 0.32, 'iskk': 0.32, 'iskm': 0.36}
FADE = {'drone': 1.1, 'x101': 0.75, 'kalibr': 0.75, 'kh59': 0.75, 'iskk': 0.75, 'iskm': 1.4}
HEAD = {'drone': 4.5, 'x101': 7.5, 'kalibr': 7.5, 'kh59': 7.0, 'iskk': 7.0, 'iskm': 13.0}
TRAIL_GAIN = 1.7


def draw_tracks(cam, v, S, trails, hot, stats):
    x, y, z = proj(cam, A.XYZ)
    ok = (z > 2) & (np.abs(x - W / 2) < 3 * W) & (np.abs(y - H / 2) < 3 * H)
    pts = np.round(np.c_[x, y] * 8).astype(np.int32)
    boost = np.clip((v - 59.5) / 7.0, 0, 1)
    boost = boost * boost * (3 - 2 * boost)
    zoom = float(np.clip((800 / cam['dist']) ** 0.35, 0.65, 1.5))
    persistent, bright, heads, shadows = [], [], [], []
    for ti, t in enumerate(A.tracks):
        a, b = A.off[ti], A.off[ti + 1]
        tau = A.TAU[a:b]
        if S < tau[0]:
            continue
        kind = t['kind']; col = A.col[kind]
        p = PERSIST[kind] * (1 + 0.65 * boost)
        h = int(np.searchsorted(tau, S, 'right'))
        done = h >= b - a
        hp = None
        if not done:
            f = (S - tau[h - 1]) / max(tau[h] - tau[h - 1], 1e-9)
            P0, P1 = A.XYZ[a + h - 1], A.XYZ[a + h]
            hw = P0 + (P1 - P0) * f
            hx, hy, hz = proj(cam, hw[None])
            if hz[0] > 2:
                hp = (hx[0], hy[0])
                heads.append((hx[0], hy[0], kind, hz[0]))
            stats[kind == 'drone'] += 1
        end = h if done else h
        segs = [(pts[a:a + end], ok[a:a + end])]
        if hp is not None:
            segs = [(np.vstack([pts[a:a + end], np.round(np.array(hp) * 8).astype(np.int32)]),
                     np.r_[ok[a:a + end], True])]
        P_, O_ = segs[0]
        c_p = tuple(float(c) for c in np.clip(col * p * 255, 0, 255))
        for ra, rb in runs(O_):
            if rb - ra > 1:
                persistent.append((c_p, P_[ra:rb]))
        # bright recent part, banded by age
        tf = FADE[kind]
        vt = A.VT[a:a + end]
        if len(vt) == 0:
            continue
        nb = 5
        edges = v - tf * 3.2 * np.arange(nb, -1, -1) / nb      # oldest .. newest
        idx = np.searchsorted(vt, edges)
        idx[-1] = len(P_)
        for bi in range(nb):
            i0, i1 = max(idx[bi] - 1, 0), min(idx[bi + 1] + 1, len(P_))
            if i1 - i0 < 2:
                continue
            age = tf * 3.2 * (nb - bi - 0.5) / nb
            I = p + (1 - p) * math.exp(-age / tf) * (1.0 if not done else max(0, 1 - (v - vt[-1]) / tf))
            c = tuple(float(cc) for cc in np.clip(col * I * 255, 0, 255))
            th = 2 if (bi >= nb - 2 and kind != 'drone') or (bi == nb - 1 and kind == 'drone' and zoom > 1.05) else 1
            for ra, rb in runs(O_[i0:i1]):
                if rb - ra > 1:
                    bright.append((c, th, P_[i0 + ra:i0 + rb]))
        if kind == 'iskm':
            gz = A.XYZ[a:a + end].copy(); gz[:, 2] = 0
            if len(gz) > 1:
                gx, gy, gzz = proj(cam, gz)
                if (gzz > 2).all():
                    shadows.append(np.round(np.c_[gx, gy] * 8).astype(np.int32))
    for c, P_ in persistent:
        cv2.polylines(trails, [P_], False, c, 1, cv2.LINE_AA, shift=3)
    sc = tuple(float(cc) for cc in A.col['iskm'] * 60)
    for P_ in shadows:
        cv2.polylines(trails, [P_], False, sc, 1, cv2.LINE_AA, shift=3)
    for c, th, P_ in bright:
        cv2.polylines(trails, [P_], False, c, th, cv2.LINE_AA, shift=3)
    for hx, hy, kind, hz in heads:
        col = A.col[kind]; r = HEAD[kind] * zoom
        add_sprite(hot, hx, hy, r * 2.4, col, 0.9 if kind == 'drone' else 1.4, 'gauss')
        add_sprite(hot, hx, hy, r * 0.9, np.array([1.0, 0.95, 0.92]) * 0.6 + col * 0.4, 1.6 if kind == 'drone' else 3.0, 'core')
    return len(heads)


# ======================================================================= effects
def km2px(cam, z):
    return FPX / max(z, 1e-3)


def draw_effects(cam, v, S, hot, fx):
    zoom = float(np.clip((800 / cam['dist']) ** 0.35, 0.65, 1.5))
    # impacts
    for h in A.hits:
        dt = v - h['v']
        if dt < 0:
            continue
        sx, sy, sz = proj(cam, np.array([[h['x'], h['y'], 0.0]]))
        if sz[0] <= 2:
            continue
        sx, sy = sx[0], sy[0]; k = km2px(cam, sz[0])
        sc = 1.0 if h['big'] else 0.62
        rs = np.random.default_rng(h['seed'])
        if dt < 1.6:
            add_sprite(hot, sx, sy, max(10, 9 * sc * k), (1.0, 0.92, 0.78), 5.0 * math.exp(-dt / 0.09) + 1.3 * math.exp(-dt / 0.45), 'flash')
        if dt < 3.5:
            add_sprite(hot, sx, sy, max(16, 34 * sc * k), (1.0, 0.40, 0.10), 0.85 * math.exp(-dt / 0.7), 'gauss')
        if dt < 0.9:
            rk = (2 + 24 * dt ** 0.6) * sc
            ang = np.linspace(0, 2 * np.pi, 72)
            ring = np.c_[h['x'] + rk * np.cos(ang), h['y'] + rk * np.sin(ang), np.zeros(72)]
            rx, ry, rz = proj(cam, ring)
            if (rz > 2).all():
                I = 0.55 * (1 - dt / 0.9) ** 2.5
                cv2.polylines(fx, [np.round(np.c_[rx, ry] * 8).astype(np.int32)], True,
                              (255 * I, 180 * I, 120 * I), 1, cv2.LINE_AA, shift=3)
        if dt > 0.15:
            fl = 0.5 + 0.5 * math.sin(v * 17.0 + h['seed']) * math.sin(v * 6.3 + h['seed'] * 2.1)
            I = (0.55 + 0.30 * fl) * min(1, (dt - 0.15) / 0.6) * (0.65 + 0.35 * math.exp(-dt / 6))
            add_sprite(hot, sx, sy, max(7, 5.5 * sc * k) * (0.9 + 0.2 * fl), (1.0, 0.36, 0.07), I, 'gauss')
            add_sprite(hot, sx, sy, max(2.5, 1.4 * sc * k), (1.0, 0.75, 0.45), I * 1.2, 'core')
        if dt < 2.2:
            n = 18 if h['big'] else 9
            vel = np.c_[rs.normal(0, 7, n), rs.normal(0, 7, n), rs.uniform(6, 20, n)] * sc
            P = np.c_[h['x'] + vel[:, 0] * dt, h['y'] + vel[:, 1] * dt, np.maximum(vel[:, 2] * dt - 13 * dt * dt, 0)]
            px, py, pz = proj(cam, P)
            I = (1 - dt / 2.2) ** 1.5 * 2.2
            for X, Y, Z in zip(px, py, pz):
                if Z > 2:
                    add_sprite(hot, X, Y, 2.2 * zoom, (1.0, 0.62, 0.25), I, 'core')
    # intercepts and interceptor missiles
    for p in A.pops:
        dt = v - p['v']
        if dt < -1.8 or dt > 1.2:
            continue
        T = np.array([p['x'], p['y'], p['z']])
        for L, dur, lag in p['sams']:
            t0 = p['v'] - dur - lag
            u = (v - t0) / dur
            if u < 0 or v > p['v'] + 0.7:
                continue
            u = min(u, 1.0)
            dist = np.linalg.norm(T[:2] - L[:2])
            Cc = (L + T) / 2 + np.array([0, 0, 0.35 * dist + 0.5 * T[2]])
            us = np.linspace(max(0, u - 0.45), u, 14)[:, None]
            Bz = (1 - us) ** 2 * L + 2 * (1 - us) * us * Cc + us ** 2 * T
            bx, by, bz = proj(cam, Bz)
            if (bz > 2).all():
                fade = 1.0 if v <= p['v'] else max(0, 1 - (v - p['v']) / 0.7)
                pts = np.round(np.c_[bx, by] * 8).astype(np.int32)
                for j in range(len(pts) - 1):
                    I = fade * (j + 1) / len(pts)
                    cv2.line(fx, tuple(pts[j]), tuple(pts[j + 1]), (150 * I, 200 * I, 255 * I), 1, cv2.LINE_AA, shift=3)
                if v <= p['v']:
                    add_sprite(hot, bx[-1], by[-1], 6 * zoom, (0.75, 0.88, 1.0), 2.0, 'core')
        if 0 <= dt < 1.0:
            sx, sy, sz = proj(cam, T[None])
            if sz[0] > 2:
                k = km2px(cam, sz[0]); big = p['kind'] == 'iskm'
                rr = (5.0 if big else (2.2 if p['kind'] == 'drone' else 3.2)) * k
                add_sprite(hot, sx[0], sy[0], max(5, rr) * 1.0, (0.95, 0.97, 1.0),
                           (3.0 if big else 2.0) * math.exp(-dt / 0.08) + 0.5 * math.exp(-dt / 0.3), 'flash')
                add_sprite(hot, sx[0], sy[0], max(9, rr * 4), (1.0, 0.65, 0.35), 0.35 * math.exp(-dt / 0.35), 'gauss')
                rs = np.random.default_rng(p['seed'])
                n = 10 if big else 5
                vel = np.c_[rs.normal(0, 4, n), rs.normal(0, 4, n), rs.normal(0, 3, n)]
                P = T + vel * dt + np.array([0, 0, -9]) * dt * dt
                P[:, 2] = np.maximum(P[:, 2], 0)
                px, py, pz = proj(cam, P)
                for X, Y, Z in zip(px, py, pz):
                    if Z > 2:
                        add_sprite(hot, X, Y, 1.8 * zoom, (1.0, 0.7, 0.4), 1.6 * (1 - dt), 'core')
    # launch-site pulses
    for name, times in A.site_launch.items():
        sx_, sy_ = A.sites[name]
        recent = [v - t for t in times if 0 <= v - t < 0.9]
        if not recent:
            continue
        px, py, pz = proj(cam, np.array([[sx_, sy_, 0.0]]))
        if pz[0] <= 2:
            continue
        for dt in recent[-3:]:
            add_sprite(hot, px[0], py[0], 7 * zoom, (1.0, 0.8, 0.4), 1.2 * (1 - dt / 0.9), 'core')


# ======================================================================= text / HUD
def text_img(text, font, size, color=(1, 1, 1), tracking=0.0, shadow=0.0):
    key = (text, font, size, tuple(color), tracking, shadow)
    r = _txt_cache.get(key)
    if r is not None:
        return r
    f = ImageFont.truetype(FONT[font], size)
    pad = int(size * 0.6) + 4
    tmp = ImageDraw.Draw(Image.new('L', (1, 1)))
    widths = [tmp.textlength(ch, font=f) for ch in text]
    total = sum(widths) + tracking * size * max(0, len(text) - 1)
    asc, desc = f.getmetrics()
    im = Image.new('L', (int(total) + 2 * pad, asc + desc + 2 * pad), 0)
    d = ImageDraw.Draw(im)
    if tracking == 0:
        d.text((pad, pad), text, font=f, fill=255)
    else:
        x = pad
        for ch, w in zip(text, widths):
            d.text((x, pad), ch, font=f, fill=255); x += w + tracking * size
    a = np.asarray(im).astype(np.float32) / 255
    if shadow > 0:
        sa = cv2.GaussianBlur(a, (0, 0), size * 0.12 + 1.0) * shadow
        alpha = a + sa * (1 - a)
        rgb = np.asarray(color, np.float32) * (a / np.maximum(alpha, 1e-6))[..., None]
    else:
        alpha = a; rgb = np.broadcast_to(np.asarray(color, np.float32), a.shape + (3,)).copy()
    r = (rgb.astype(np.float32), alpha.astype(np.float32), pad, asc)
    _txt_cache[key] = r
    return r


def blit_text(img, text, font, size, x, y, color=(1, 1, 1), alpha=1.0, anchor='l', tracking=0.0, shadow=0.0):
    """y is the baseline. anchor: l / r / c horizontal."""
    if alpha <= 0.003:
        return 0
    rgb, a, pad, asc = text_img(text, font, size, color, tracking, shadow)
    w = a.shape[1] - 2 * pad
    if anchor == 'r':
        x = x - w
    elif anchor == 'c':
        x = x - w / 2
    X, Y = int(round(x)) - pad, int(round(y)) - asc - pad
    h_, w_ = a.shape
    x0, y0, x1, y1 = max(X, 0), max(Y, 0), min(X + w_, W), min(Y + h_, H)
    if x1 <= x0 or y1 <= y0:
        return w
    aa = a[y0 - Y:y1 - Y, x0 - X:x1 - X, None] * alpha
    img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - aa) + rgb[y0 - Y:y1 - Y, x0 - X:x1 - X] * aa
    return w


def fill_rect(img, x0, y0, x1, y1, color, alpha):
    x0, y0, x1, y1 = int(max(0, x0)), int(max(0, y0)), int(min(W, x1)), int(min(H, y1))
    if x1 > x0 and y1 > y0 and alpha > 0:
        img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - alpha) + np.asarray(color, np.float32) * alpha


def smooth01(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def env(v, a, b, fi=0.6, fo=0.6):
    return smooth01((v - a) / fi) * smooth01((b - v) / fo)


def draw_labels(img, cam, v):
    end_fade = 1 - 0.35 * smooth01((v - 64) / 3)
    placed = []
    P = np.array([[c[1], c[2], 0.0] for c in A.cities])
    x, y, z = proj(cam, P)
    order = sorted(range(len(A.cities)), key=lambda i: A.cities[i][3])
    d = cam['dist']
    for i in order:
        name, wx, wy, tier, ua = A.cities[i]
        if z[i] <= 2 or not (40 < x[i] < W - 40 and BAR + 20 < y[i] < H - BAR - 10):
            continue
        lim = {1: 99999, 2: 1700, 3: 820}[tier]
        a = smooth01((lim - d) / (0.25 * lim)) if tier > 1 else 1.0
        depth_fade = smooth01((3.2 * d - z[i]) / (1.2 * d))
        a *= depth_fade * end_fade
        if a <= 0.02:
            continue
        size = {1: 23, 2: 17, 3: 14}[tier]
        font = {1: 'sb', 2: 'md', 3: 'rg'}[tier]
        col = (0.93, 0.95, 1.0) if ua else (0.60, 0.63, 0.68)
        w_est = len(name) * size * 0.56
        rect = (x[i] - 6, y[i] - size, x[i] + 12 + w_est, y[i] + 6)
        if any(not (rect[2] < r[0] or rect[0] > r[2] or rect[3] < r[1] or rect[1] > r[3]) for r in placed):
            continue
        placed.append(rect)
        dot = 2 if tier < 3 else 1
        fill_rect(img, x[i] - dot, y[i] - dot, x[i] + dot + 1, y[i] + dot + 1, col, 0.9 * a)
        blit_text(img, name, font, size, x[i] + 8, y[i] + size * 0.36, col, a * (0.95 if tier < 3 else 0.8), shadow=0.85)
    # launch sites
    for name, (sx_, sy_) in A.sites.items():
        px, py, pz = proj(cam, np.array([[sx_, sy_, 0.0]]))
        if pz[0] <= 2 or not (40 < px[0] < W - 40 and BAR + 30 < py[0] < H - BAR - 10):
            continue
        a = smooth01((2200 - d) / 500) * end_fade * smooth01((3.4 * d - pz[0]) / (1.2 * d))
        if a <= 0.02:
            continue
        fill_rect(img, px[0] - 0.5, py[0] - 16, px[0] + 1.5, py[0], (1.0, 0.78, 0.3), 0.85 * a)
        fill_rect(img, px[0] - 2.5, py[0] - 20, px[0] + 3.5, py[0] - 14, (1.0, 0.8, 0.35), a)
        blit_text(img, name, 'md', 14, px[0] + 8, py[0] - 12, (1.0, 0.82, 0.5), a * 0.9, shadow=0.85)


def hud(img, v, S, stats, impacts):
    fill_rect(img, 0, 0, W, BAR, (0, 0, 0), 1.0)
    fill_rect(img, 0, H - BAR, W, H, (0, 0, 0), 1.0)
    on = smooth01((v - 0.3) / 1.2)
    # top bar
    blit_text(img, 'AIR ATTACK ON UKRAINE', 'sb', 15, 64, 44, (0.88, 0.9, 0.95), on, tracking=0.22)
    blit_text(img, 'Night of 19–20 November 2026  ·  3D reconstruction', 'rg', 15, 64, 68, (0.55, 0.58, 0.64), on)
    blit_text(img, 'ROUTES AFTER ППО РАДАР × MONITORING', 'md', 13, W - 64, 44,
              (0.62, 0.65, 0.7), on, anchor='r', tracking=0.16)
    blit_text(img, 'Timing simulated · routes approximate', 'rg', 13, W - 64, 67, (0.45, 0.48, 0.53), on, anchor='r')
    # clock
    hh, mm, day = SC.clock(S)
    yb = H - BAR / 2 + 15
    blit_text(img, f'{hh:02d}:{mm:02d}', 'mono', 42, 62, yb + 2, (0.96, 0.97, 1.0), on)
    blit_text(img, 'KYIV TIME', 'md', 11, 206, yb - 22, (0.55, 0.58, 0.64), on, tracking=0.2)
    blit_text(img, f'{day} NOV 2026', 'md', 13, 206, yb - 3, (0.85, 0.87, 0.92), on, tracking=0.08)
    rt = SC.rate(v) * 60
    if rt > 1:
        rtxt = f'TIME ×{int(round(rt, -2 if rt >= 1000 else (-1 if rt >= 100 else 0))):,}'.replace(',', ' ')
        blit_text(img, rtxt, 'mono_l', 12, 206, yb + 14, (0.95, 0.62, 0.35), on * 0.9)
    # timeline
    x0, x1, yl = 560, 1360, int(H - BAR / 2 + 6)
    fill_rect(img, x0, yl, x1, yl + 2, (0.28, 0.30, 0.34), on)
    for hr, lab in [(0, '18:00'), (180, '21:00'), (360, '00:00'), (540, '03:00'), (720, '06:00'), (810, '07:30')]:
        xx = x0 + (x1 - x0) * hr / 810
        fill_rect(img, xx, yl - 5, xx + 1, yl + 2, (0.4, 0.42, 0.47), on)
        blit_text(img, lab, 'mono_l', 11, xx, yl + 22, (0.45, 0.48, 0.53), on, anchor='c')
    xp = x0 + (x1 - x0) * min(S, 810) / 810
    fill_rect(img, x0, yl, xp, yl + 2, (0.9, 0.92, 0.96), on)
    for hS in impacts:
        xx = x0 + (x1 - x0) * hS / 810
        fill_rect(img, xx - 1, yl - 9, xx + 1, yl - 1, (1.0, 0.45, 0.15), on)
    fill_rect(img, xp - 3, yl - 3, xp + 4, yl + 5, (1, 1, 1), on)
    blit_text(img, 'NIGHT TIMELINE', 'md', 11, x0, yl - 18, (0.5, 0.53, 0.58), on, tracking=0.2)
    # counters
    xr = W - 64
    blit_text(img, 'IN THE AIR NOW', 'md', 11, xr, yb - 22, (0.55, 0.58, 0.64), on, anchor='r', tracking=0.2)
    w1 = blit_text(img, f'{stats[0]:3d} missile' + ('' if stats[0] == 1 else 's'), 'mono', 18, xr, yb + 2, (1.0, 0.55, 0.45), on, anchor='r')
    blit_text(img, f'{stats[1]:3d} drone' + (' ' if stats[1] == 1 else 's') + '   ', 'mono', 18, xr - w1 - 10, yb + 2, (1.0, 0.45, 0.9), on, anchor='r')
    blit_text(img, f'IMPACTS {len(impacts):2d}', 'mono_l', 12, xr, yb + 20, (1.0, 0.62, 0.35), on, anchor='r')


def captions(img, v):
    for a, b, title, sub, kind in SC.CAPTIONS:
        e = env(v, a, b, 0.7, 0.7)
        if e <= 0:
            continue
        dy = (1 - smooth01((v - a) / 0.9)) * 14
        y = H - BAR - 78 + dy
        if kind:
            col = tuple(float(c) for c in np.clip(A.col[kind] * 0.9 + 0.1, 0, 1))
            fill_rect(img, 80, y - 34, 84, y + 30, col, e)
        blit_text(img, title, 'disp_sb', 34, 100, y, (0.97, 0.97, 1.0), e, shadow=0.9)
        blit_text(img, sub, 'rg', 19, 101, y + 28, (0.78, 0.8, 0.85), e, shadow=0.9)


def title_card(img, v):
    e = env(v, SC.TITLE[0], SC.TITLE[1], 1.0, 0.9)
    if e <= 0:
        return
    fill_rect(img, 0, BAR, W, H - BAR, (0, 0, 0), 0.35 * e)
    cy = H / 2
    blit_text(img, 'РУХ ПОВІТРЯНИХ ЦІЛЕЙ '
                   'НАД ТЕРИТОРІЄЮ УКРАЇНИ',
              'md', 15, W / 2, cy - 70, (0.62, 0.65, 0.7), e, anchor='c', tracking=0.3)
    blit_text(img, 'The night of 19–20 November', 'disp_b', 76, W / 2, cy + 8, (0.98, 0.98, 1.0), e, anchor='c', shadow=0.6)
    blit_text(img, 'Drones and missiles over Ukraine — a 3D reconstruction of the night’s flight paths', 'lt', 24,
              W / 2, cy + 58, (0.8, 0.82, 0.87), e, anchor='c')


LEGEND = [('drone', 'Attack drones (Geran / Shahed-type)'), ('x101', 'Kh-101 cruise missiles'),
          ('kalibr', 'Kalibr cruise missiles'), ('kh59', 'Kh-59/69 guided missiles'),
          ('iskk', 'Iskander-K cruise missiles'), ('iskm', 'Iskander-M ballistic missiles')]


def end_card(img, v):
    e = smooth01((v - SC.END_CARD) / 1.2)
    if e <= 0:
        return
    x0, y0 = 70, BAR + 40
    blit_text(img, 'Morning, 20 November 2026', 'disp_sb', 40, x0, y0 + 40, (0.98, 0.98, 1.0), e, shadow=0.9)
    blit_text(img, 'Every route flown overnight, as traced by Ukrainian air-monitoring channels', 'rg', 19, x0 + 1, y0 + 72,
              (0.78, 0.8, 0.85), e, shadow=0.9)
    e2 = smooth01((v - SC.END_CARD - 0.8) / 1.2)
    lx, ly = 70, H - BAR - 300
    fill_rect(img, lx - 18, ly - 34, lx + 410, ly + 238, (0.0, 0.0, 0.0), 0.55 * e2)
    blit_text(img, 'LEGEND', 'md', 11, lx, ly - 10, (0.6, 0.63, 0.68), e2, tracking=0.25)
    for i, (k, lab) in enumerate(LEGEND):
        yy = ly + 18 + i * 28
        c = tuple(float(x) for x in np.clip(A.col[k], 0, 1))
        fill_rect(img, lx, yy - 6, lx + 30, yy - 3, c, e2)
        blit_text(img, lab, 'rg', 16, lx + 44, yy, (0.88, 0.9, 0.94), e2)
    yy = ly + 18 + 6 * 28
    fill_rect(img, lx + 10, yy - 10, lx + 20, yy, (1.0, 0.55, 0.2), e2)
    blit_text(img, 'Impact', 'rg', 16, lx + 44, yy, (0.88, 0.9, 0.94), e2)
    blit_text(img, '/// Occupied territory', 'rg', 16, lx + 200, yy, (0.7, 0.72, 0.76), e2)
    yy += 28
    blit_text(img, f'Reconstructed: {A.n_drones} drone and {A.n_missiles} missile tracks, {len(A.hits)} impacts',
              'rg', 13, lx, yy + 2, (0.6, 0.63, 0.68), e2)
    e3 = smooth01((v - SC.END_CARD - 1.6) / 1.2)
    src = ('Source map: «Рух повітряних цілей '
           'над територією України», '
           '19–20.11.2026 — ППО РАДАР (t.me/mon1tor_ua) × monitoring (t.me/monitorwarr), CC BY 4.0.')
    blit_text(img, src, 'rg', 13, W - 70, H - BAR - 46, (0.7, 0.72, 0.76), e3, anchor='r', shadow=0.9)
    blit_text(img, 'Adapted into an animated 3D reconstruction. Timing, altitudes and counts are illustrative; '
                   'the source notes it may contain inaccuracies.', 'rg', 13, W - 70, H - BAR - 26,
              (0.55, 0.58, 0.62), e3, anchor='r', shadow=0.9)


# ======================================================================= frame
def tonemap(x):
    k = 0.55
    y = np.where(x < k, x, k + (1 - k) * (1 - np.exp(-(x - k) / (1 - k))))
    return y


def render(v):
    S = SC.story(v)
    cam = make_cam(v)
    img, fogpack = render_ground(cam)
    draw_vectors(img, cam, fogpack)
    trails = np.zeros((H, W, 3), np.uint8)
    fx = np.zeros((H, W, 3), np.uint8)
    hot = np.zeros((H, W, 3), np.float32)
    stats = [0, 0]
    draw_tracks(cam, v, S, trails, hot, stats)
    draw_effects(cam, v, S, hot, fx)
    emis = trails.astype(np.float32) * (TRAIL_GAIN / 255.0)
    emis += fx.astype(np.float32) * (1.4 / 255.0)
    emis += hot
    img += emis
    # bloom (multi-scale) on the emissive layer + bright ground lights
    src = emis + np.maximum(img - 0.35, 0) * 0.5
    b2 = cv2.resize(src, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    g1 = cv2.GaussianBlur(b2, (0, 0), 2.5)
    b4 = cv2.resize(b2, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    g2 = cv2.GaussianBlur(b4, (0, 0), 5)
    b8 = cv2.resize(b4, (W // 8, H // 8), interpolation=cv2.INTER_AREA)
    g3 = cv2.GaussianBlur(b8, (0, 0), 7)
    # anamorphic streak from the hottest parts
    hot4 = cv2.resize(hot, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    st = cv2.blur(np.maximum(hot4 - 0.6, 0), (121, 1)) * np.array([0.55, 0.75, 1.0], np.float32)
    bloom = (cv2.resize(g1, (W, H)) * 0.55 + cv2.resize(g2, (W, H)) * 0.45 + cv2.resize(g3, (W, H)) * 0.4
             + cv2.resize(st, (W, H)) * 0.9)
    img += bloom
    # highlight roll-off to white, filmic shoulder
    lum = img[..., 0] * 0.3 + img[..., 1] * 0.55 + img[..., 2] * 0.15
    wmix = np.clip((lum - 1.0) / 2.5, 0, 1)[..., None]
    img = img * (1 - wmix) + lum[..., None] * wmix
    img = tonemap(img)
    # grade: cool shadows, warm highlights
    l2 = img.mean(axis=2, keepdims=True)
    img = img + (np.array([-0.004, 0.0, 0.010], np.float32) * (1 - l2) + np.array([0.012, 0.004, -0.010], np.float32) * l2)
    img = np.clip(img, 0, 1) ** (1 / 2.2)
    img *= A.vignette
    # subtle chromatic aberration
    M1 = cv2.getRotationMatrix2D((W / 2, H / 2), 0, 1.0016); M2 = cv2.getRotationMatrix2D((W / 2, H / 2), 0, 0.9984)
    img[..., 0] = cv2.warpAffine(img[..., 0], M1, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    img[..., 2] = cv2.warpAffine(img[..., 2], M2, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    # film grain
    rng = np.random.default_rng(int(v * 1000))
    g = rng.standard_normal((H // 2, W // 2), dtype=np.float32)
    g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR) * 0.010
    img += g[..., None] * (0.6 + 0.4 * (1 - img))
    # overlays
    draw_labels(img, cam, v)
    impacts = [h['S'] for h in A.hits if h['v'] <= v]
    captions(img, v)
    title_card(img, v)
    end_card(img, v)
    hud(img, v, S, stats, impacts)
    fade = smooth01(v / 1.4) * smooth01((SC.DURATION - v) / 1.6)
    img *= fade
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def main():
    global A
    A = Assets()
    mode = sys.argv[1]
    if mode == 'stills':
        for s in sys.argv[2:]:
            v = float(s)
            im = render(v)
            cv2.imwrite(WK(f'still_{v:05.1f}.png'), im[:, :, ::-1])
            print('still', v, flush=True)
    elif mode == 'chunk':
        a, b, out = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
        p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                              '-s', f'{W}x{H}', '-r', str(SC.FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium',
                              '-crf', '12', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        for fi in range(a, b):
            p.stdin.write(render(fi / SC.FPS).tobytes())
            if fi % 30 == 0:
                print(f'{out}: frame {fi}', flush=True)
        p.stdin.close(); p.wait()


if __name__ == '__main__':
    main()
