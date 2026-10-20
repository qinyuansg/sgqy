// Cut B · Highlight (CUT=highlight): 45.5 s, music-led, on the V11-faithful AV frames (AV-S1 … AV-S14).
// Hand-written scene windows in seconds, on the score's 120 BPM beat lattice (a beat every 0.5 s from 0; bar lines at
// 0.5 + 2k s): every window starts on a beat, the alarm, the response, the evidence and the sign-off on a bar line, every
// click on a beat. Shots cross-dissolve (0.4 s, centred on the window start); the scenes read the windows through E.S(id).
// 1.0 s black, the product line over the quiet console, the fence feels the climb (AF-01 fence bay), then the alarm card
// drops in at the top of Real Time Alerts as the Active Alarms panel opens itself. "im" + "closed" are one shot (the duty
// manager's Incident Management): "closed" starts on the Sign and close click, where the score resolves.
// "scripts": the cut's own scene files (loaded by index.html); "thumb": the thumbnail time (the hero push);
// "mix": the bus levels for tools/mix.py (music leads).
window.TL = {
  "fps": 30, "total": 45.5, "lines": [], "cut": "highlight", "thumb": 11.0,
  "scripts": ["js/scenes/highlight/shots.js", "js/scenes/highlight/chrome.js"],
  "mix": { "music": -16.0, "sfx": -24.0 },
  "grid": { "bpm": 120, "t0": 0.5 },
  "scenes": {
    "open":      { "start": 0.0,  "end": 2.5 },
    "quiet":     { "start": 2.5,  "end": 4.5 },
    "fence":     { "start": 4.5,  "end": 6.5 },
    "alarm":     { "start": 6.5,  "end": 12.5 },
    "verify":    { "start": 12.5, "end": 18.5 },
    "dispatch":  { "start": 18.5, "end": 24.5 },
    "handover":  { "start": 24.5, "end": 27.5 },
    "handed":    { "start": 27.5, "end": 30.5 },
    "evidence":  { "start": 30.5, "end": 34.5 },
    "im":        { "start": 34.5, "end": 38.5 },
    "closed":    { "start": 38.5, "end": 40.5 },
    "end":       { "start": 40.5, "end": 45.5 }
  }
};
