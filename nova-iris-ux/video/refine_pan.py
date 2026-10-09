"""Refine pan-frame quads (280–288) by maximising overlap with the measured old-screen region."""
import cv2, numpy as np, json
from scipy.optimize import minimize
T = {int(k): np.array(v, np.float64) for k, v in json.load(open("tracks.json")).items()}
W, H = 478, 850

def old_region(f, quad):
    img = cv2.imread(f"src/{f:04d}.png"); hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m = cv2.inRange(hsv, (50, 40, 60), (112, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    qm = np.zeros((H, W), np.uint8); cv2.fillPoly(qm, [quad.astype(np.int32).reshape(-1, 1, 2)], 255)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    best, ov = None, 0
    for k in range(1, n):                       # component that overlaps the prediction most (not the monitor)
        o = np.count_nonzero((lab == k) & (qm > 0))
        if o > ov: best, ov = k, o
    if best is None: return None
    reg = (lab == best).astype(np.uint8) * 255
    cnts, _ = cv2.findContours(reg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    fill = np.zeros_like(reg); cv2.drawContours(fill, cnts, -1, 255, -1)
    return fill > 0

def apply(q, p):
    tx, ty, th, ls = p
    c = q[2]                                    # rotate/scale about the bottom-right corner (always visible)
    R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]]) * np.exp(ls)
    return (q - c) @ R.T + c + [tx, ty]

def iou_loss(p, q, reg):
    qm = np.zeros((H, W), np.uint8)
    cv2.fillPoly(qm, [np.round(apply(q, p) * 4).astype(np.int32).reshape(-1, 1, 2)], 1, shift=2)
    qm = qm > 0
    inter = np.count_nonzero(qm & reg); uni = np.count_nonzero(qm | reg)
    return 1 - inter / max(uni, 1)

R = {k: v.tolist() for k, v in T.items()}
prev_p = np.zeros(4)
for f in range(279, 289):
    q = T[f]
    reg = old_region(f, q)
    if reg is None or reg.sum() < 1500:
        print(f, "no region"); continue
    base = iou_loss(np.zeros(4), q, reg)
    best = None
    for init in (np.zeros(4), prev_p):
        r = minimize(iou_loss, init, args=(q, reg), method="Nelder-Mead",
                     options=dict(xatol=0.05, fatol=1e-5, maxiter=600, initial_simplex=np.array(
                         [init, init + [3, 0, 0, 0], init + [0, 3, 0, 0], init + [0, 0, 0.01, 0], init + [0, 0, 0, 0.01]])))
        if best is None or r.fun < best.fun: best = r
    p = best.x if best.fun < base else np.zeros(4)
    if f >= 280:
        R[f] = apply(q, p).tolist(); prev_p = p
    print(f, "IoU %.4f -> %.4f" % (1 - base, 1 - min(best.fun, base)), "corr tx=%.1f ty=%.1f rot=%.2fdeg scale=%.3f" % (p[0], p[1], np.degrees(p[2]), np.exp(p[3])))
json.dump(R, open("tracks_refined.json", "w"))
