"""Closed-form screen quad from top/right/bottom lines under a pinhole model (focal f, aspect a)."""
import numpy as np, json

W, H = 478, 850
C = np.array([W / 2, H / 2])

def hline(l):
    p, d = np.array(l["p"]), np.array(l["d"])
    return np.cross([p[0], p[1], 1.0], [p[0] + d[0], p[1] + d[1], 1.0])

def quad_from_lines(L, f, a, cx=C[0], cy=C[1]):
    K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1.0]]); Ki = np.linalg.inv(K)
    lt, lb, lr = hline(L["top"]), hline(L["bottom"]), hline(L["right"])
    TR = np.cross(lt, lr); TR = TR / TR[2]
    BR = np.cross(lb, lr); BR = BR / BR[2]
    vh = np.cross(lt, lb)                    # horizontal vanishing point (homogeneous)
    e1 = Ki @ vh; e1 /= np.linalg.norm(e1)
    e2 = np.cross(e1, K.T @ lr); e2 /= np.linalg.norm(e2)
    rT, rB = Ki @ TR, Ki @ BR
    # BR3 - TR3 = e2 (height 1): solve lam2*rB - lam1*rT = e2
    A = np.stack([-rT, rB], 1)
    lam, *_ = np.linalg.lstsq(A, e2, rcond=None)
    if lam[0] < 0:                            # e2 sign flipped: points up instead of down
        e2 = -e2; lam, *_ = np.linalg.lstsq(A, e2, rcond=None)
    TR3, BR3 = lam[0] * rT, lam[1] * rB
    # e1 must point from left to right: TR3 - a*e1 should land left of TR in the image
    def proj(P):
        q = K @ P; return q[:2] / q[2]
    TL3, BL3 = TR3 - a * e1, BR3 - a * e1
    if proj(TL3)[0] > TR[0]:
        e1 = -e1; TL3, BL3 = TR3 - a * e1, BR3 - a * e1
    return dict(TL=proj(TL3), TR=TR[:2], BR=BR[:2], BL=proj(BL3))

def left_line_error(q, L):
    """Mean distance of the measured left-line segment endpoints to the predicted TL-BL line."""
    p, d = np.array(L["left"]["p"]), np.array(L["left"]["d"])
    pts = [p + s * d for s in (-120, 120)]
    a, b = q["TL"], q["BL"]
    n = np.array([b[1] - a[1], a[0] - b[0]]); n /= np.linalg.norm(n)
    return float(np.mean([abs((pt - a) @ n) for pt in pts]))

if __name__ == "__main__":
    import sys
    E = json.load(open(sys.argv[1]))
    good = [int(i) for i, r in E.items() if r and "left" in r["lines"] and r["lines"]["left"]["n"] >= 300
            and all(k in r["lines"] for k in ("top", "right", "bottom"))]
    print("reliable 4-edge frames:", len(good), good[:5], "...", good[-5:])
    best = None
    for f in np.arange(380, 1400, 10):
        for a in np.arange(0.52, 0.72, 0.005):
            errs = [left_line_error(quad_from_lines(E[str(i)]["lines"], f, a), E[str(i)]["lines"]) for i in good]
            e = float(np.mean(errs))
            if best is None or e < best[0]:
                best = (e, f, a)
    print("best f=%.0f a=%.3f mean left-line err=%.2f px" % (best[1], best[2], best[0]))
    # sensitivity: error landscape near optimum
    for f in (best[1] - 150, best[1] - 50, best[1], best[1] + 50, best[1] + 150):
        row = []
        for a in (best[2] - 0.02, best[2], best[2] + 0.02):
            errs = [left_line_error(quad_from_lines(E[str(i)]["lines"], f, a), E[str(i)]["lines"]) for i in good]
            row.append(f"{np.mean(errs):.2f}")
        print(f"f={f:.0f}: a-0.02/a/a+0.02 ->", row)
    json.dump(dict(f=best[1], a=best[2]), open("model_params.json", "w"))
