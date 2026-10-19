// Hand-written timeline for the AgilFence UI-flow film v2 (no narration: lines is empty).
// Scene windows in seconds; the scenes and chrome read them through E.S(id).
// Operator clicks fall 0.2 s before the end of verify, response and closure; the duty manager's
// click 0.2 s before the end of signoff; the alternative-path click 0.2 s before the end of alt.
window.TL = {
  "fps": 30, "total": 109.7, "lines": [],
  "scenes": {
    "slate":      { "start": 0.0,   "end": 3.5 },
    "quiet":      { "start": 3.5,   "end": 7.0 },
    "alarm":      { "start": 7.0,   "end": 19.5 },
    "verify":     { "start": 19.5,  "end": 31.0 },
    "confirmed":  { "start": 31.0,  "end": 34.0 },
    "response":   { "start": 34.0,  "end": 47.5 },
    "dispatched": { "start": 47.5,  "end": 49.5 },
    "running":    { "start": 49.5,  "end": 61.5 },
    "outcomes":   { "start": 61.5,  "end": 70.0 },
    "closure":    { "start": 70.0,  "end": 80.0 },
    "signoff":    { "start": 80.0,  "end": 86.5 },
    "closed":     { "start": 86.5,  "end": 92.5 },
    "card":       { "start": 92.5,  "end": 94.7 },
    "alt":        { "start": 94.7,  "end": 101.2 },
    "resolved":   { "start": 101.2, "end": 106.2 },
    "end":        { "start": 106.2, "end": 109.7 }
  }
};
