// Cut C · Product story (CUT=story): 67 s, five chapters, each opened by a large headline card (1.5 s).
// Hand-written scene windows in seconds on the score's 80 BPM grid (a bar every 3 s from 0): the film cold-opens on the
// fence bay (the climber and the strain ripple from 0.3 s, the product line laid over it), every card is a two-beat
// pickup, and each chapter's picture starts on a downbeat (0 · 13.5 · 21 · 36 · 51).
//   1 Feels a climb            fence (AF-01 fence bay, cold open) + trace (AF-01 wind vs climb against the threshold)
//   2 Pinpoints the segment    map (AF-04 airfield map: 5-14 lit, PTZ 7-02 swings onto it)
//   3 Shows who is there       alarm (AV-S1 quiet → the AgilFence card drops in at the top of the left Real Time Alerts list
//                              as AV-S2 opens itself; hero push on the PTZ 7-02 live player in the viewer) + verify (the
//                              three tiles, the Investigation tab: one track, health OK; authorised-activity check)
//   4 Coordinates the response respond (SOP Flow tab · AV-S3 step 1 · Confirm intrusion · AV-S6 · Dispatch · AV-S8 police +
//                              tower · AV-S9 PTZ 7-03 took over · AV-S10 handed to police, step 6 outcomes)
//   5 Closes with evidence     closure (AV-S11 step 7 evidence, Submit for sign-off) + signoff (AV-S12 Incident Management,
//                              Close Incident → AV-S13 dialog, Sign and close → AV-S14 closed)
// "title": the product line over the cold open; "scripts": the cut's scene files; "thumb": the thumbnail time
// (hero push on the climber on the viewer's live player); "mix": bus levels.
window.TL = {
  "fps": 30, "total": 67.0, "lines": [], "cut": "story", "thumb": 27.2,
  "scripts": ["js/scenes/story/plates.js", "js/scenes/story/consoles.js", "js/scenes/story/chrome.js"],
  "mix": { "music": -16.5, "sfx": -23.0 },
  "grid": { "bpm": 80, "t0": 0.0 },
  "chapters": [
    { "n": 1, "card": "card1", "title": "Feels a climb" },
    { "n": 2, "card": "card2", "title": "Pinpoints the segment" },
    { "n": 3, "card": "card3", "title": "Shows who is there" },
    { "n": 4, "card": "card4", "title": "Coordinates the response" },
    { "n": 5, "card": "card5", "title": "Closes with evidence" }
  ],
  "scenes": {
    "fence":    { "start": 0.0,  "end": 4.5 },
    "title":    { "start": 1.8,  "end": 4.5 },
    "card1":    { "start": 4.5,  "end": 6.0 },
    "trace":    { "start": 6.0,  "end": 12.0 },
    "card2":    { "start": 12.0, "end": 13.5 },
    "map":      { "start": 13.5, "end": 19.5 },
    "card3":    { "start": 19.5, "end": 21.0 },
    "alarm":    { "start": 21.0, "end": 29.0 },
    "verify":   { "start": 29.0, "end": 34.5 },
    "card4":    { "start": 34.5, "end": 36.0 },
    "respond":  { "start": 36.0, "end": 49.5 },
    "card5":    { "start": 49.5, "end": 51.0 },
    "closure":  { "start": 51.0, "end": 54.6 },
    "signoff":  { "start": 54.6, "end": 61.5 },
    "end":      { "start": 61.5, "end": 67.0 }
  }
};
