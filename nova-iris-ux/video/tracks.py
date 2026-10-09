"""Final per-frame screen corners (source px): model quads, pan handling, light smoothing."""
import json, numpy as np, sys
sys.path.insert(0, sys.argv[1])
from model import quad_from_lines, hline
from scipy.signal import savgol_filter
E = json.load(open("edges2.json")); P = json.load(open("model_params.json"))
f, a, cx, cy = P["f"], P["a"], P["cx"], P["cy"]
N = 311
Q = {}
for i in range(1, N + 1):
    r = E.get(str(i))
    if r and all(k in r["lines"] for k in ("top", "right", "bottom")) and i <= 282:
        q = quad_from_lines(r["lines"], f, a, cx, cy)
        Q[i] = np.array([q["TL"], q["TR"], q["BR"], q["BL"]], float)
# light temporal smoothing over the continuous run 1..282
idx = sorted(Q); arr = np.array([Q[i] for i in idx])          # (n,4,2)
sm = savgol_filter(arr, 7, 2, axis=0, mode="interp")
for k, i in enumerate(idx): Q[i] = sm[k]
# pan frames 283..287: snap the carried-forward shape to the measured right & bottom lines
def unit(v): return v / np.linalg.norm(v)
prev = [Q[i] for i in range(276, 283)]
vel_shape = (prev[-1] - prev[-1][2]) - (prev[-2] - prev[-2][2])  # shape change per frame (relative to BR)
for i in range(283, 288):
    L = E[str(i)]["lines"]
    lr, lb = hline(L["right"]), hline(L["bottom"])
    BR = np.cross(lr, lb); BR = BR[:2] / BR[2]
    shape = (Q[i - 1] - Q[i - 1][2]) + vel_shape                  # predicted offsets from BR
    dr_pred, db_pred = unit(shape[1]), unit(shape[3])               # BR->TR, BR->BL directions
    dr = unit(np.array(L["right"]["d"])); dr = dr if dr @ dr_pred > 0 else -dr
    db = unit(np.array(L["bottom"]["d"])); db = db if db @ db_pred > 0 else -db
    # affine map taking predicted edge directions onto measured ones (keeps lengths)
    A_pred = np.stack([dr_pred, db_pred], 1); A_meas = np.stack([dr, db], 1)
    M = A_meas @ np.linalg.inv(A_pred)
    Q[i] = BR + (M @ shape.T).T
# frame 288: constant-velocity extrapolation of every corner
Q[288] = Q[287] + (Q[287] - Q[286])
out = {i: Q[i].tolist() for i in sorted(Q)}
json.dump(out, open("tracks.json", "w"))
d2 = np.array([np.abs(Q[i + 1] - 2 * Q[i] + Q[i - 1]).max() for i in range(2, 282)])
print("frames tracked:", len(out), "| max |accel| (px/frame^2) over 2..281: median %.2f p95 %.2f max %.2f" % (np.median(d2), np.percentile(d2, 95), d2.max()))
print("frame 1 corners:", np.round(Q[1]).tolist()); print("frame 287:", np.round(Q[287]).tolist())
