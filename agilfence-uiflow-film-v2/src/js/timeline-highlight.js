// Cut B · Highlight (CUT=highlight): 45.5 s, music-led. Hand-written scene windows in seconds, on the score's
// 120 BPM beat lattice (a beat every 0.5 s from 0; bar lines at 0.5 + 2k s): every window starts on a beat, the alarm on
// a bar line, the two clicks on a beat. Shots cross-dissolve (0.4 s, centred on the window start); the scenes read the
// windows through E.S(id). 1.0 s black, the product line over the quiet console, then the fence feels the climb (AF-01
// fence bay) before the alarm view opens itself.
// "scripts": the cut's own scene files (loaded by index.html); "thumb": the thumbnail time (the hero push);
// "mix": the bus levels for tools/mix.py (music leads).
window.TL = {
  "fps": 30, "total": 45.5, "lines": [], "cut": "highlight", "thumb": 10.8,
  "scripts": ["js/scenes/highlight/shots.js", "js/scenes/highlight/chrome.js"],
  "mix": { "music": -16.0, "sfx": -24.0 },
  "grid": { "bpm": 120, "t0": 0.5 },
  "scenes": {
    "open":      { "start": 0.0,  "end": 2.5 },
    "quiet":     { "start": 2.5,  "end": 4.5 },
    "fence":     { "start": 4.5,  "end": 6.5 },
    "alarm":     { "start": 6.5,  "end": 13.5 },
    "verify":    { "start": 13.5, "end": 17.5 },
    "confirm":   { "start": 17.5, "end": 20.0 },
    "lanes":     { "start": 20.0, "end": 23.0 },
    "dispatch":  { "start": 23.0, "end": 25.5 },
    "running":   { "start": 25.5, "end": 30.0 },
    "outcomes":  { "start": 30.0, "end": 34.5 },
    "closure":   { "start": 34.5, "end": 37.5 },
    "closed":    { "start": 37.5, "end": 40.5 },
    "end":       { "start": 40.5, "end": 45.5 }
  }
};
