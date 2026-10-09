"""Robust screen-edge lines: raw-contour RANSAC + sub-pixel luminance-profile refinement."""
import cv2, numpy as np, json, glob, os, sys
SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 478, 850
rng = np.random.default_rng(7)

def component(f):
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    m = cv2.inRange(hsv, (50, 45, 70), (112, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1: return None
    k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    if st[k, cv2.CC_STAT_AREA] < 20000: return None
    big = (lab == k).astype(np.uint8) * 255
    big = cv2.morphologyEx(big, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return big

def side_points(mask):
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)[:, 0, :].astype(np.float64)
    n = len(c); cx, cy = c.mean(0)
    sides = {"top": [], "right": [], "bottom": [], "left": []}
    for i in range(n):
        x, y = c[i]
        if x <= 2 or x >= W - 3 or y <= 2 or y >= H - 3: continue
        t = c[(i + 7) % n] - c[(i - 7) % n]
        nx, ny = t[1], -t[0]
        if (nx * (x - cx) + ny * (y - cy)) < 0: nx, ny = -nx, -ny
        ang = np.degrees(np.arctan2(ny, nx))
        k = "top" if -135 <= ang < -45 else "right" if -45 <= ang < 45 else "bottom" if 45 <= ang < 135 else "left"
        sides[k].append((x, y))
    return {k: np.array(v) for k, v in sides.items()}

def ransac_line(pts, thr=1.5, iters=400):
    best = None
    for _ in range(iters):
        a, b = pts[rng.choice(len(pts), 2, replace=False)]
        d = b - a; nrm = np.hypot(*d)
        if nrm < 30: continue
        nvec = np.array([-d[1], d[0]]) / nrm
        dist = np.abs((pts - a) @ nvec)
        inl = dist < thr
        if best is None or inl.sum() > best.sum(): best = inl
    return pts[best] if best is not None else pts

def fit(pts):
    vx, vy, x0, y0 = cv2.fitLine(pts.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
    return np.array([x0, y0]), np.array([vx, vy])

def refine(gray, p, d, side, span):
    """Sample luminance profiles across the edge; locate the 50% bright->dark crossing."""
    nrm = np.array([d[1], -d[0]])
    out = {"top": (0, -1), "right": (1, 0), "bottom": (0, 1), "left": (-1, 0)}[side]
    if nrm @ out < 0: nrm = -nrm
    t0, t1 = span
    pts = []
    for t in np.linspace(t0 + 0.12 * (t1 - t0), t1 - 0.12 * (t1 - t0), 48):
        base = p + t * d
        offs = np.arange(-9, 9.01, 0.5)
        xs = base[0] + offs * nrm[0]; ys = base[1] + offs * nrm[1]
        if xs.min() < 1 or xs.max() > W - 2 or ys.min() < 1 or ys.max() > H - 2: continue
        prof = cv2.remap(gray, xs.astype(np.float32).reshape(1, -1), ys.astype(np.float32).reshape(1, -1),
                         cv2.INTER_LINEAR).ravel()
        inside, outside = np.median(prof[:6]), np.median(prof[-6:])
        if inside - outside < 25: continue
        thr = (inside + outside) / 2
        # last crossing from bright to dark scanning outward from the inside
        idx = np.where((prof[:-1] >= thr) & (prof[1:] < thr))[0]
        if len(idx) == 0: continue
        j = idx[0]
        frac = (prof[j] - thr) / (prof[j] - prof[j + 1] + 1e-6)
        o = offs[j] + frac * 0.5
        pts.append(base + o * nrm)
    return np.array(pts)

res = {}
for f in sorted(glob.glob(f"{SRC}/*.png")):
    i = int(os.path.basename(f)[:4])
    img = cv2.imread(f); gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    m = component(img)
    if m is None: res[i] = None; continue
    S = side_points(m)
    lines = {}
    for k, pts in S.items():
        if len(pts) < 60: continue
        inl = ransac_line(pts)
        if len(inl) < 50: continue
        p, d = fit(inl)
        ts = (inl - p) @ d
        rp = refine(gray, p, d, k, (ts.min(), ts.max()))
        if len(rp) >= 12:
            rp = ransac_line(rp, thr=0.8, iters=200)
            p, d = fit(rp)
            r = np.abs((rp - p) @ np.array([-d[1], d[0]]))
            lines[k] = dict(p=p.tolist(), d=d.tolist(), n=int(len(inl)), m=int(len(rp)), rms=float(np.sqrt(np.mean(r ** 2))),
                            span=[float(((inl - p) @ d).min()), float(((inl - p) @ d).max())])
    res[i] = dict(lines=lines)
json.dump(res, open(OUT, "w"))
from collections import Counter
print(Counter(tuple(sorted(v["lines"])) if v else None for v in res.values()))
for i in (1, 30, 90, 150, 200, 225, 255, 275, 280):
    r = res.get(i)
    if r: print(i, {k: (round(v["rms"], 2), v["n"], v["m"]) for k, v in r["lines"].items()})
