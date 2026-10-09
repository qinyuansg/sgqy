import json, numpy as np, sys
sys.path.insert(0, sys.argv[2])
from model import quad_from_lines, left_line_error
from scipy.optimize import least_squares
E = json.load(open(sys.argv[1]))
good = [int(i) for i, r in E.items() if r and "left" in r["lines"] and r["lines"]["left"]["n"] >= 300
        and all(k in r["lines"] for k in ("top", "right", "bottom"))]
print("reliable frames:", len(good))
def resid(x):
    f, a, cx, cy = x
    out = []
    for i in good:
        L = E[str(i)]["lines"]
        q = quad_from_lines(L, f, a, cx, cy)
        p, d = np.array(L["left"]["p"]), np.array(L["left"]["d"])
        s0, s1 = L["left"]["span"]
        A, B = q["TL"], q["BL"]
        n = np.array([B[1] - A[1], A[0] - B[0]]); n /= np.linalg.norm(n)
        for s in np.linspace(s0, s1, 5):
            out.append((p + s * d - A) @ n)
    return np.array(out)
best = None
for f0 in (500, 650, 800, 1000):
    for a0 in (0.58, 0.61, 0.64):
        r = least_squares(resid, [f0, a0, 239, 425], bounds=([250, 0.45, 100, 200], [2500, 0.8, 380, 650]), loss="soft_l1", f_scale=2)
        e = np.sqrt(np.mean(r.fun ** 2))
        if best is None or e < best[0]: best = (e, r.x)
e, x = best
print("fit: f=%.0f a=%.4f cx=%.1f cy=%.1f  rms left-edge err=%.2f px" % (*x, e))
r0 = resid([x[0], x[1], 239, 425]); print("same f,a with centred principal point: rms=%.2f" % np.sqrt(np.mean(r0 ** 2)))
# per-frame error distribution
per = []
for i in good:
    L = E[str(i)]["lines"]
    per.append(left_line_error(quad_from_lines(L, *x), L))
print("per-frame mean left err: median %.2f  p90 %.2f  max %.2f" % (np.median(per), np.percentile(per, 90), max(per)))
json.dump(dict(f=float(x[0]), a=float(x[1]), cx=float(x[2]), cy=float(x[3])), open("model_params.json", "w"))
