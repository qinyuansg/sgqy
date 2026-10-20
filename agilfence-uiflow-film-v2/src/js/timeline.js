// Hand-written timeline for the AgilFence UI-flow film v2, cut A · Operator flow (no narration: lines is empty).
// Scene windows in seconds; the scenes and chrome read them through E.S(id).
// Operator clicks fall 0.2 s before the end of verify (SOP Flow tab), decide (Confirm intrusion), raised (Dispatch)
// and closure (Submit for sign-off); pending holds the list card's 'Pending sign-off' state after the submit; the duty
// manager's Sign and close 0.2 s before the end of signoff (his Close Incident click falls inside it); the alternative
// path's Authorised activity click 0.2 s before the end of alt (it opens on the list, the new card flashing).
// "mix.ceiling": the limiter ceiling for this cut (dBTP), set so the AAC encodes stay under -3 dBTP at -14 LUFS.
window.TL = {
  "fps": 30, "total": 121.1, "lines": [], "thumb": 12.6,
  "mix": { "ceiling": -4.5 },
  "scenes": {
    "slate":    { "start": 0.0,   "end": 3.5 },
    "quiet":    { "start": 3.5,   "end": 7.0 },
    "alarm":    { "start": 7.0,   "end": 19.0 },
    "verify":   { "start": 19.0,  "end": 28.5 },
    "decide":   { "start": 28.5,  "end": 37.0 },
    "raised":   { "start": 37.0,  "end": 50.0 },
    "running":  { "start": 50.0,  "end": 57.0 },
    "handover": { "start": 57.0,  "end": 62.5 },
    "outcomes": { "start": 62.5,  "end": 69.5 },
    "closure":  { "start": 69.5,  "end": 78.5 },
    "pending":  { "start": 78.5,  "end": 81.3 },
    "signoff":  { "start": 81.3,  "end": 90.8 },
    "closed":   { "start": 90.8,  "end": 97.3 },
    "card":     { "start": 97.3,  "end": 99.5 },
    "alt":      { "start": 99.5,  "end": 110.0 },
    "resolved": { "start": 110.0, "end": 117.6 },
    "end":      { "start": 117.6, "end": 121.1 }
  }
};
