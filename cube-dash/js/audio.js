// ─────────────────────────────────────────────────────────────
// CUBE DASH — audio: 100% WebAudio synthesis (no samples)
//
//   "Candy Synthwave" adaptive music engine
//     · look-ahead 16th-note sequencer (ctx.currentTime, ~120 ms ahead)
//     · one hand-written pentatonic song per track, 8-bar A/B/breakdown form,
//       seeded variations per loop, drum fills every 8 bars
//     · 6 stems (bed/pad · drums · bass · arp · lead · hype) that enter/leave
//       on bar lines from intensity + game state (style tier, nova ready,
//       FEVER, low hearts, slow-mo, pause, boss phase)
//   SFX library — every gameplay verb has its own synthesized sound; melodic
//     SFX snap to the current song key; smash chains climb a pentatonic ladder
//   Mixer — music / sfx / ui buses → reverb send → compressor → limiter → soft clip
//   Cube-ese babble voices per hero, 3-note hero motifs
//
// Public API (ARCHITECTURE §6): unlock() update(rdt) music(track) intensity(v)
//   setVolumes({music, sfx}) toggleMute() sfx(name, opts) beat
// Extras: babble(hero, mood), motif(hero), kick (0..1 pulse), bar, bpm, muted
// Everything is a safe no-op until unlock() created the AudioContext.
// ─────────────────────────────────────────────────────────────
import { clamp, lerp, makeRng } from './core.js';
import { DATA } from './data.js';

// ============ tuning ============
const TUNE = {
  mix: {
    master: 0.8, music: 0.34, sfx: 0.8, ui: 0.6,
    comp: { threshold: -18, knee: 12, ratio: 4, attack: 0.003, release: 0.15 },
    limiter: { threshold: -3, knee: 0, ratio: 20, attack: 0.001, release: 0.08 },
    softClip: true,              // final tanh-ish shaper: peak can never reach 1.0
    reverb: { seconds: 1.8, lowSeconds: 1.1, musicSend: 0.2, sfxSend: 0.12, uiSend: 0.05 },
    volCurve: 1.5,               // slider → gain exponent (perceptual)
  },
  voices: {
    max: 24, maxLow: 16,
    caps: { smash: 6, crystal: 4, nearMiss: 2, freed: 3, spawnWarn: 3, bonk: 4, dizzy: 2, knock: 3, tick: 2, coin: 3, babble: 2, windup: 4, bumper: 3, tired: 2, fall: 3, bolt: 4 },
    defaultCap: 4,
    perFrame: { smash: 3, freed: 2, crystal: 2, spawnWarn: 2, bonk: 2, dizzy: 1, knock: 2, coin: 2, fall: 1 },
    defaultPerFrame: 2,
    perFrameTotal: 12,           // new sfx voices per frame across all names (protects the audio thread) …
    // … except these: a frame full of smashes must never swallow the hurt / perfect / nova / level-up sound
    priority: ['hurt', 'perfect', 'nova', 'death', 'freeze', 'revive', 'levelup', 'countdown', 'countIn', 'bossDefeat', 'phase', 'roar', 'shield', 'fever'],
    minGap: { click: 0.04, back: 0.04, claim: 0.05, buy: 0.05, error: 0.08, whoosh: 0.06, hover: 0.03, tick: 0.035, pop: 0.03, star: 0.05, cue: 0.3, puff: 0.15, notYet: 0.25, dizzy: 0.12, babble: 0.25, heartbeat: 0.2, coinAppear: 1, tileGone: 0.3, reroll: 0.15 },
  },
  music: {
    lookahead: 0.12, timerMs: 25,
    xfade: 1.2, stingerCut: 0.3,
    enterBars: 0.5, leaveBars: 1.0,       // stem ramps (in bars)
    stems: { arp: 0.35, lead: 0.6, hype: 0.85 },   // intensity thresholds
    styleArp: 10,                           // style (combo) ≥ this → arp
    leadIntroBars: 8,                       // the world theme is stated after GO
    novaHypeBars: 4,
    iTau: 2,                                // intensity smoothing (s)
    padLp: [800, 2000],                     // pad lowpass opens with stage progress
    dangerLp: 1200, slowLp: 450, hurtLp: 600, pauseLp: 1300, droneLp: 700,
    duck: { pause: 0.35, slow: 0.5, nova: 0.5, second: 0.3 },
    leadGain: 1.7,                          // the hook must sit ≈ 3 dB over arp / hype / bass (was the quietest stem)
    arpVel: 0.4,
    padGlide: 0.015,                        // pad chord-change glide (τ, s): a quick smear, not a pitch bend
    freeBpm: 110,                           // beat phase keeps ticking with no music
    endless: { bpmStep: 2, every: 60, maxBpm: 144, keyEvery: 180, keyStep: 2, maxKey: 4 },
    bossPhase: { semis: 1, bpm: 4 },
    endlessBossBack: 2.6,                   // endless: s after boss:defeat before the endless theme returns
  },
  // per-sound mix trims. Balanced by A-weighted loudness AND a phone-speaker proxy (A-weight + 350 Hz
  // high-pass, _dev/review-audio): core verbs sit ≈ 6–10 dB over the in-run music, telegraphs ≈ 4–8 dB,
  // frequent small feedback (dizzy, land, freed) at or just under it, nothing repeated louder than a smash.
  level: {
    zap: 0.8, bolt: 0.8, babble: 0.45, stomp: 1.2, miniNova: 0.7, dash: 1.0,
    crystal: 1.4, nearMiss: 1.4, coin: 1.5, freed: 2.5, dizzy: 1.5, whoosh: 3.5, open: 3.5, coinTick: 2,
    cue: 1.6, windup: 1.5, checkpoint: 2, coinBurst: 1.3, motif: 2.2, novaReady: 2.2, land: 0.6, wave: 1.8,
    claim: 1.8, buy: 1.8, milestone: 1.8, knock: 1.6, puff: 1.8, notYet: 2, womp: 1.4, error: 1.6,
    explode: 1.1, slam: 1.1,
  },
  ladder: { reset: 1.2, max: 10 },          // smash chime: 2 octaves of pentatonic, one step per chained smash
  crystalLadder: { reset: 0.5, max: 5 },    // crystal pings climb ≤ 1 octave (spec: +12 semitones max)
};

// ============ music theory ============
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const SCALES = {
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** finite number or fallback (payloads come from many modules — never feed NaN to an AudioParam) */
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
/** MIDI note of pentatonic degree d (0 = root) above `root` */
function degMidi(root, scale, d) {
  const s = SCALES[scale] || SCALES.majorPent;
  const n = s.length;
  const o = Math.floor(d / n);
  return root + o * 12 + s[((d % n) + n) % n];
}
const ROMAN = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
const QUAL = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], D7: [0, 4, 7, 10], sus: [0, 5, 7] };
/** 'bVII' 'vi7' 'Imaj7' 'V7' 'IVsus' → {root, q} (root = semitones above key) */
function parseChord(sym) {
  const m = /^(b?)([IViv]+)(maj7|7|sus)?$/.exec(sym);
  if (!m) return { root: 0, q: 'M' };
  const up = m[2].toUpperCase();
  const minor = m[2] !== up;
  let q = minor ? 'm' : 'M';
  if (m[3] === 'maj7') q = 'M7';
  else if (m[3] === '7') q = minor ? 'm7' : 'D7';
  else if (m[3] === 'sus') q = 'sus';
  return { root: ((ROMAN[up] ?? 0) - (m[1] ? 1 : 0) + 12) % 12, q };
}
/** motif string (8th-note tokens: degree | '.' rest | '-' tie; '|' ignored) → [{deg, len}|null] */
function parseMotif(str) {
  const tok = str.split(/\s+/).filter((x) => x && x !== '|');
  const out = new Array(tok.length).fill(null);
  for (let i = 0; i < tok.length; i++) {
    const k = tok[i];
    if (k === '.' || k === '-') continue;
    let len = 1;
    while (i + len < tok.length && tok[i + len] === '-') len++;
    out[i] = { deg: parseInt(k, 10) || 0, len };
  }
  return out;
}
/** 8-token bass bar: R root · O octave · 5 fifth · 3 third · 7 seventh · '.' rest · '-' tie */
function parseBass(str) {
  const tok = str.split(/\s+/).filter(Boolean);
  const out = new Array(8).fill(null);
  for (let i = 0; i < 8; i++) {
    const k = tok[i];
    if (!k || k === '.' || k === '-') continue;
    let len = 1;
    while (i + len < 8 && tok[i + len] === '-') len++;
    out[i] = { k, len };
  }
  return out;
}

// ============ drum / bass / arp patterns (16 steps per bar) ============
const DRUMS = {
  soft: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', o: '................' },
  pop: { k: 'x.....x...x.....', s: '....x.......x...', h: '..x...x...x...x.', o: '..............x.' },
  four: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', o: '......x.......x.' },
  break: { k: 'x.....x...x..x..', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  march: { k: 'x...x...x...x...', s: '....x..x....x.xx', h: 'x.x.x.x.x.x.x.x.', o: '................' },
  half: { k: 'x.........x.....', s: '........x.......', h: '..x...x...x...x.', o: '................' },
  none: { k: '................', s: '................', h: '................', o: '................' },
};
const BASS = {
  bounce: 'R . O R . R O .',
  drive: 'R R R R R R R R',
  octave: 'R O R O R O R O',
  synth: 'R - . R O . 5 .',
  walk: 'R . 3 . 5 . O .',
  villain: 'R . R 5 . R O 5',
  soft: 'R - - - 5 - - -',
  pulse: 'R . R . R . 5 .',
};
const ARPS = {
  up: [0, 1, 2, 3],
  updown: [0, 1, 2, 3, 2, 1],
  bounce: [0, 2, 1, 3],
  glitch: [0, 3, 1, 3, 2, 3, 1, 0],
};

// ============ songs ============
// prog: 4 (or 8) chords, 1 per bar, per section letter; lead: 4 two-bar motifs per 8-bar section
// motif tokens = pentatonic degrees at 8th-note resolution (0 = key root, 5 = octave up)
// transforms on motif refs: 'm0^' octave up · 'm0>' shift one 8th · 'm0~' thinned
const SONGS = {
  title: {
    bpm: 104, key: 'G', scale: 'majorPent', swing: 0.12, lead: 'musicbox', arp: 'updown', arpTone: 'bell', bass: 'bounce', drums: 'soft',
    prog: { A: ['I', 'vi', 'IV', 'V'], B: ['IV', 'V', 'iii', 'vi'] },
    motifs: [
      '2 3 5 . 3 2 0 . | 4 . 5 4 2 - . .',
      '4 5 4 2 0 - 2 . | 1 - 3 - 1 . . .',
      '4 5 7 6 5 - 4 . | 3 - 1 - 3 - . .',
      '7 - 6 5 4 - 5 . | 6 - 5 3 1 - . .',
      '2 - 3 2 1 . 2 . | 4 - - . 5 - 4 .',                 // (A, the m7 of iii — was a b6 clash)
      '2 3 5 3 2 - 0 . | -1 - 0 - . . . .',
    ],
    form: ['A', 'B', 'A', 'C'], menu: true,
  },
  hub: {
    bpm: 96, key: 'F', scale: 'majorPent', swing: 0.18, lead: 'pulse', arp: 'up', arpTone: 'tri', bass: 'walk', drums: 'pop',
    prog: { A: ['Imaj7', 'vi7', 'ii7', 'V'], B: ['IV', 'V', 'iii', 'vi'] },
    motifs: [
      '0 . 2 3 . 2 0 . | 4 - 3 . 2 . . .',
      '1 . 3 4 . 3 1 . | 2 - - . 1 - . .',
      '1 3 4 6 5 - 3 . | 4 - 3 - 1 - 0 .',
      '3 - 4 3 1 . 0 . | 1 - 2 1 3 - . .',
      '2 - 3 2 1 . -1 . | -1 - 0 - 1 - . .',
      '2 3 4 3 2 - 1 . | 0 - - - . . . .',
    ],
    form: ['A', 'B', 'A', 'C'], menu: true,
  },
  // ---- worlds (key / bpm / scale come from DATA.worlds[i].music) ----
  w1: { // Cloud Harbor — bouncy, sunny
    lead: 'pulse', arp: 'up', arpTone: 'tri', bass: 'bounce', drums: 'pop', swing: 0.06,
    prog: { A: ['I', 'V', 'vi', 'IV'], B: ['IV', 'V', 'iii', 'vi'] },
    motifs: [
      '3 . 2 3 5 - 3 2 | 1 - 3 . 6 - 5 .',
      '4 . 5 4 2 - 0 2 | 4 - 5 - 4 3 2 .',
      '4 . 5 7 6 - 5 4 | 5 - - . 3 - 2 .',
      '5 - 4 5 7 - 5 . | 6 - 5 6 8 - . .',
      '7 - 6 7 9 - 7 . | 7 6 5 4 5 - . .',
      '7 - 6 5 4 - 2 . | 4 - - - . . 2 3',
    ],
    form: ['A', 'A', 'B', 'C'],
  },
  w2: { // Neon Ring — neon pop, four-on-the-floor
    lead: 'square', arp: 'updown', arpTone: 'pulse', bass: 'drive', drums: 'four',
    prog: { A: ['I', 'bVII', 'IV', 'I'], B: ['vi', 'IV', 'I', 'V'] },
    motifs: [
      '0 0 3 . 0 . 4 3 | 1 - 0 1 . 3 - .',
      '4 . 3 4 5 - 4 3 | 2 - 0 - . . 2 3',
      '5 - 4 5 7 - 5 4 | 5 - - - 3 . 2 .',
      '4 - 5 4 2 . 0 . | 1 . 2 . 4 - . .',
      '2 - 3 5 3 . 2 . | 1 - 3 - 4 - 3 .',
      '5 - 4 5 6 - 5 4 | 3 - - - . . . .',
    ],
    form: ['A', 'B', 'A', 'C'],
  },
  w3: { // Crystal Moon — sparkly, bittersweet
    lead: 'bell', leadOct: -1, arp: 'updown', arpTone: 'bell', bass: 'synth', drums: 'break',
    prog: { A: ['vi', 'IV', 'I', 'V'], B: ['IV', 'I', 'V', 'vi'] },
    motifs: [
      '4 . 2 4 5 - 4 2 | 0 - 2 . 4 - . .',
      '2 . 3 5 7 - 5 3 | 1 - 3 - 6 - 5 .',
      '7 . 6 5 3 - 5 . | 6 - - - 3 - 1 .',
      '4 - 5 7 9 - 7 5 | 7 - 5 - 3 - . .',
      '6 - 5 6 8 - 6 . | 9 - 7 - 4 - . .',
      '8 7 6 5 6 - 3 . | 4 - - - . . 5 6',
    ],
    form: ['A', 'A', 'B', 'C'],
  },
  w4: { // Bomb Nebula — dreamy candy lydian
    lead: 'pulse', arp: 'bounce', arpTone: 'bell', bass: 'octave', drums: 'four', clap: true,
    prog: { A: ['Imaj7', 'II', 'iii7', 'vi7'], B: ['IV', 'V', 'iii', 'vi'] },
    motifs: [
      '2 - 3 2 0 . 2 3 | 1 - 4 - 6 - . .',                 // bar 2 spells the lydian II (G B D) — no sus clash
      '2 . 3 5 6 - 3 2 | 4 - - . 2 - 1 .',                 // F passes up to G, the 7th of iii7
      '7 - 6 7 8 - 7 6 | 5 - 4 - 2 - . .',
      '4 - 5 4 . 5 6 . | 6 - 5 3 . 3 1 .',
      '7 - 6 7 . 5 4 . | 4 - 5 - 7 - . .',
      '7 - 8 7 6 - 7 . | 9 - - - 7 . . .',
    ],
    form: ['A', 'B', 'A', 'C'],
  },
  w5: { // Laser Foundry — driving, robotic repeats
    lead: 'saw', arp: 'updown', arpTone: 'pulse', bass: 'drive', drums: 'break',
    prog: { A: ['vi', 'V', 'IV', 'V'], B: ['I', 'V', 'vi', 'IV'] },
    motifs: [
      '4 4 . 4 5 . 4 3 | 3 3 . 3 4 . 3 1',
      '2 . 3 4 3 . 2 0 | 1 - 3 - 1 . -1 .',
      '2 . 3 4 5 - 6 7 | 8 - - - 6 - 5 .',
      '5 - 4 5 7 - 5 . | 6 - 5 6 8 - . .',
      '9 - 8 7 5 - 7 . | 7 - 5 - 4 - . .',
      '9 8 7 5 4 - 5 . | 7 - - - . . 3 4',
    ],
    form: ['A', 'A', 'B', 'C'],
  },
  w6: { // Glitch Core — epic minor
    lead: 'saw', arp: 'glitch', arpTone: 'pulse', bass: 'octave', drums: 'break',
    prog: { A: ['i', 'bVI', 'bVII', 'i'], B: ['bVI', 'bIII', 'bVII', 'i'] },
    motifs: [
      '0 . 0 2 3 . 2 1 | 0 - 1 - -1 - . .',
      '4 . 3 4 5 - 4 3 | 3 - 2 - 0 - . .',
      '4 . 5 6 7 - 6 5 | 5 - - - 3 - 2 .',
      '5 - 3 5 7 - 5 . | 6 - 5 6 8 - . .',
      '9 - 8 9 7 - 8 . | 5 - 7 - 5 - . .',                 // over bVII: G E G D E (was a held C against B)
      '9 8 7 6 5 - 6 . | 5 - - - . . 3 4',
    ],
    form: ['A', 'B', 'A', 'C'],
  },
  boss: { // King Glitch — comic villain march (C minor, harmonic V)
    bpm: 140, key: 'C', scale: 'minorPent', lead: 'saw', arp: 'glitch', arpTone: 'pulse', bass: 'villain', drums: 'march',
    prog: { A: ['i', 'bVI', 'iv', 'V'], B: ['bVI', 'bVII', 'i', 'i'] },
    motifs: [
      '0 0 . 0 2 . 1 0 | 1 - 0 - -1 - . .',
      '2 . 2 3 4 . 3 2 | 3 - - - 2 - . .',
      '5 - 4 3 2 . 3 . | 3 - 3 . 3 - . .',
      '6 - 5 6 7 - 6 . | 7 - 6 7 9 - . .',
      '8 - 7 6 5 - 6 . | 5 - - - 3 . 4 .',
      '8 7 6 5 3 - 4 . | 5 - - - . . 3 4',
    ],
    form: ['A', 'B', 'A', 'B'], boss: true,
  },
  endless: { // Galaxy Survival — epic, speeds up over time
    bpm: 132, key: 'E', scale: 'minorPent', lead: 'pulse', leadOct: -1, arp: 'updown', arpTone: 'pulse', bass: 'drive', drums: 'four',
    prog: { A: ['i', 'bVI', 'bIII', 'bVII'], B: ['iv', 'bVI', 'bVII', 'i'] },
    motifs: [
      '0 . 1 2 3 - 2 1 | 0 - 1 - 3 - . .',
      '1 . 3 4 5 - 4 3 | 2 - 3 - 4 - 3 .',
      '5 - 4 5 6 - 5 4 | 3 - - - 2 . 4 .',
      '2 - 3 5 7 - 5 . | 5 - 4 5 7 - . .',
      '8 - 7 6 4 - 6 . | 5 - - - 3 . . .',
      '8 7 6 5 4 - 5 . | 5 - - - . . 3 4',
    ],
    form: ['A', 'B', 'A', 'C'],
  },
  lullaby: { // break reminder — music box at 80 BPM
    bpm: 80, key: 'F', scale: 'majorPent', swing: 0.1, lead: 'musicbox', arp: 'up', arpTone: 'bell', bass: 'soft', drums: 'none',
    // 8-chord progressions: the section closes IV → I under the tonic (was a sus4 over V)
    prog: { A: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'I'], B: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'I'] },
    motifs: [
      '2 - 1 0 . . 1 2 | 3 - - - . . . .',
      '4 - 3 2 . . 3 1 | 2 - - - . . . .',
      '2 - 1 0 . . -1 1 | 0 - - - . . . .',
      '5 - 4 3 . . 4 2 | 3 - - - . . . .',
      '4 - 3 2 . . 1 2 | 3 - - - . . . .',
      '2 - 1 0 . . -1 1 | 0 - - - . . . .',
    ],
    form: ['A', 'B'], menu: true, gentle: true,
  },
};
// each section = 8 bars: 4 two-bar motif slots
const SECTIONS = {
  A: { prog: 'A', lead: ['m0', 'm1', 'm0', 'm2'] },
  B: { prog: 'B', lead: ['m3', 'm4', 'm3', 'm5'] },
  C: { prog: 'A', lead: ['long', 'long', 'm0~', 'm2'], breakdown: true },
};
// per-loop seeded variations (loop 0 = as written)
const VARIATIONS = ['^', '>', '~', ''];

// 3-note hero motifs (pentatonic degrees) — played on nova:ready and victory
const HERO_MOTIF = {
  blu: { degs: [0, 2, 5], tone: 'pulse', oct: 0, step: 0.11 },
  mochi: { degs: [0, -2, 0], tone: 'tri', oct: -1, step: 0.14 },
  zap: { degs: [4, 7, 9], tone: 'square', oct: 0, step: 0.07 },
  stella: { degs: [2, 4, 7], tone: 'bell', oct: 0, step: 0.12 },
};
// Cube-ese voices: base pitch (Hz), syllable length (s), timbre
const VOICES = {
  blu: { f: 520, syl: 0.075, wave: 'square', vib: 0, gap: 0.03 },
  mochi: { f: 380, syl: 0.1, wave: 'triangle', vib: 0, gap: 0.04 },
  zap: { f: 700, syl: 0.05, wave: 'square', vib: 0, gap: 0.015 },
  stella: { f: 600, syl: 0.085, wave: 'triangle', vib: 40, gap: 0.03 },
  king: { f: 180, syl: 0.11, wave: 'sawtooth', vib: 0, gap: 0.035, crush: true },
  pixel: { f: 820, syl: 0.055, wave: 'square', vib: 0, gap: 0.02 },
  villager: { f: 640, syl: 0.06, wave: 'triangle', vib: 0, gap: 0.025 },
};
const VOWELS = [[800, 1200], [400, 2000], [300, 2300], [500, 900], [350, 700]];
// mood → pitch contour (semitones per syllable position 0..1) + syllable count range
const MOODS = {
  happy: { n: [3, 5], curve: (u) => Math.sin(u * Math.PI) * 4, end: 2 },
  cheer: { n: [4, 6], curve: (u) => u * 7, end: 5 },
  sad: { n: [3, 4], curve: (u) => -u * 6, end: -3 },
  oops: { n: [3, 4], curve: (u) => 3 - u * 8, end: -4 },
  question: { n: [3, 4], curve: () => 0, end: 6 },
  sleepy: { n: [3, 4], curve: (u) => -u * 3, end: -2, slow: 1.8 },
  angry: { n: [4, 6], curve: (u) => (u < 0.5 ? 0 : -2), end: -3 },
  laugh: { n: [5, 6], curve: (u) => (Math.floor(u * 6) % 2 ? 3 : 0), end: 5 },
};

const STEM_NAMES = ['bed', 'drums', 'bass', 'arp', 'lead', 'hype', 'heart'];
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const pcOf = (key) => PC[key] ?? 0;
/** lead-register root (MIDI 65..76) for a key */
const leadRoot = (pc) => 65 + ((pc - 5 + 12) % 12);

// ============ Song: one looping track = sequencer state + its own stems ============
class Song {
  constructor(sys, name, def, t0, fadeIn = 0.6) {
    this.sys = sys; this.name = name; this.def = def;
    const ctx = sys.ctx;
    this.pc = pcOf(def.key);
    this.scale = def.scale || 'majorPent';
    this.baseBpm = def.bpm || 120;
    this.bpm = this.baseBpm;
    this.pendingBpm = 0;
    this.transpose = 0; this.pendingTranspose = null;
    this.swing = def.swing || 0;
    this.step = 0; this.bar = -1; this.nextTime = t0;
    this.rng = makeRng(hashStr(name));
    this.motifRaw = def.motifs.map((m) => m.split(/\s+/).filter((x) => x && x !== '|'));
    this.bassPat = parseBass(BASS[def.bass] || BASS.bounce);
    this.bassBreak = parseBass(BASS.soft);   // breakdown sections: long notes → real contrast before the drop back
    this.drumPat = DRUMS[def.drums] || DRUMS.four;
    this.arpPat = ARPS[def.arp] || ARPS.up;
    this.motif = null; this.leadPrev = null;
    this.chord = { root: 0, q: 'M' };
    this.voicing = [60, 64, 67];
    this.snap = true;             // first bar: stems jump straight to their level
    this.forceHype = false; this.stopped = false;
    // ---- graph ----
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, t0);
    this.out.gain.linearRampToValueAtTime(1, t0 + Math.max(0.02, fadeIn));
    this.out.connect(sys._musicIn);
    this.pump = ctx.createGain(); this.pump.connect(this.out);           // sidechain for bed + bass
    this.stem = {}; this.level = {}; this.want = {}; this.offBar = {};
    for (const s of STEM_NAMES) {
      const g = ctx.createGain(); g.gain.value = 0;
      g.connect(s === 'bed' || s === 'bass' ? this.pump : this.out);
      this.stem[s] = g; this.level[s] = 0; this.want[s] = 0; this.offBar[s] = -1;
    }
    // pad: persistent detuned saws gliding between chords (cheap + lush)
    this.padLp = ctx.createBiquadFilter(); this.padLp.type = 'lowpass'; this.padLp.frequency.value = 1200; this.padLp.Q.value = 0.6;
    this.padAmp = ctx.createGain(); this.padAmp.gain.value = 1;
    this.padLp.connect(this.padAmp); this.padAmp.connect(this.stem.bed);
    this.padOsc = [];
    const layers = sys.low ? 1 : 2;
    for (let v = 0; v < 3; v++) for (let l = 0; l < layers; l++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = layers === 1 ? 0 : (l ? 9 : -9) + v * 2;
      o.frequency.value = mtof(this.voicing[v]);
      const g = ctx.createGain(); g.gain.value = 0.055 / layers;
      o.connect(g); g.connect(this.padLp);
      o.start(t0);
      this.padOsc.push({ o, v });
    }
    // arp echo: dotted-8th delay
    this.arpIn = ctx.createGain(); this.arpIn.connect(this.stem.arp);
    this.delay = ctx.createDelay(1.5);
    this.fb = ctx.createGain(); this.fb.gain.value = 0.3;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.25;
    this.arpIn.connect(this.delay); this.delay.connect(this.fb); this.fb.connect(this.delay);
    this.delay.connect(this.wet); this.wet.connect(this.stem.arp);
    this._setDelayTime(t0);
  }

  get stepDur() { return 60 / this.bpm / 4; }
  get barDur() { return this.stepDur * 16; }
  get root() { return leadRoot(this.pc) + this.transpose + 12 * (this.def.leadOct || 0); }
  _setDelayTime(t) { this.delay.delayTime.setValueAtTime(Math.min(1.4, (60 / this.bpm) * 0.75), t); }

  /** jump back to bar 0 at time t (the "drop" on GO) */
  resync(t) {
    this.nextTime = t; this.step = 0; this.bar = -1; this.snap = true; this.motif = null; this.occ = null;
  }

  /** schedule every 16th that starts before `until` */
  pump16(until) {
    while (!this.stopped && this.nextTime < until) {
      this._step(this.nextTime);
      this.nextTime += this.stepDur;
    }
  }

  stop(t, fade) {
    if (this.stopped) return;
    this.stopped = true;
    const g = this.out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + fade);
    for (const p of this.padOsc) { try { p.o.stop(t + fade + 0.1); } catch { /* already stopped */ } }
    const out = this.out;
    if (!this.sys.offline) setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, (fade + 0.4) * 1000 + Math.max(0, t - this.sys._now()) * 1000);
  }

  // ---------- one 16th step ----------
  _step(t) {
    const st = this.step & 15;
    if (st === 0) this._barStart(t);
    const sys = this.sys, sd = this.stepDur;
    const ts = t + (st % 4 === 2 ? this.swing * sd * 2 : 0);
    const play = (s) => this.want[s] > 0 || this.bar < this.offBar[s];
    const barIn8 = this.bar & 7;
    // drums (+ fills)
    if (play('drums')) this._drums(st, ts, barIn8);
    if (play('hype')) this._hype(st, ts);
    if (play('heart') && (st === 0 || st === 8)) sys._heartbeat(t, this.stem.heart);
    // bass on 8ths
    if (st % 2 === 0 && play('bass')) {
      const tok = (this.sec?.breakdown ? this.bassBreak : this.bassPat)[st >> 1];
      if (tok) {
        const c = this.chord, iv = QUAL[c.q] || QUAL.M;
        let semi = 0;
        if (tok.k === 'O') semi = 12; else if (tok.k === '5') semi = 7; else if (tok.k === '3') semi = iv[1]; else if (tok.k === '7') semi = iv[3] ?? 10;
        const m = 36 + ((this.pc + this.transpose + c.root) % 12 + 12) % 12 + semi;
        sys._bassNote(m, ts, tok.len * sd * 2 * 0.9, this.stem.bass, st === 0 ? 1 : 0.8);
      }
    }
    // lead on 8ths
    if (st % 2 === 0 && play('lead')) this._lead(st, ts);
    // arp on 16ths (8ths for gentle songs)
    if (play('arp') && (!this.def.gentle || st % 2 === 0)) {
      const tones = this.voicing;
      const i = this.arpPat[(this.step >> (this.def.gentle ? 1 : 0)) % this.arpPat.length];
      const m = (i === 3 ? tones[0] + 12 : tones[i]) + 12;
      sys._note(this.def.arpTone || 'tri', m, ts, sd * 0.9, this.arpIn, TUNE.music.arpVel, false);
    }
    if (st % 4 === 0) sys._markBeat(t, sd * 4);
    this.step++;
  }

  _barStart(t) {
    const sys = this.sys;
    this.bar++;
    if (this.pendingBpm) { this.bpm = this.pendingBpm; this.pendingBpm = 0; this._setDelayTime(t); }
    if (this.pendingTranspose !== null) { this.transpose = this.pendingTranspose; this.pendingTranspose = null; }
    const form = this.def.form;
    const secN = Math.floor(this.bar / 8);
    this.loop = Math.floor(secN / form.length);
    this.secKey = form[secN % form.length];
    this.sec = SECTIONS[this.secKey] || SECTIONS.A;
    if ((this.bar & 7) === 0 || this.occ == null) {          // how many times this section letter already played
      const pos = secN % form.length;
      let occ = 0, per = 0;
      for (let i = 0; i < form.length; i++) if (form[i] === this.secKey) { per++; if (i < pos) occ++; }
      this.occ = occ + this.loop * per;
    }
    const prog = this.def.prog[this.sec.prog] || this.def.prog.A;
    this.chord = parseChord(prog[(this.bar & 7) % prog.length]);
    this._voice(t);
    // lead motif for this 2-bar slot
    if ((this.bar & 1) === 0 || !this.motif) this.motif = this._resolveMotif(this.sec.lead[(this.bar & 7) >> 1]);
    // stems for this bar
    sys._planStems(this, t);
    const bd = this.barDur;
    for (const s of STEM_NAMES) {
      const want = this.want[s], was = this.level[s];
      if (want === was) continue;
      const g = this.stem[s].gain;
      const dur = this.snap ? 0.02 : bd * (want > was ? TUNE.music.enterBars : TUNE.music.leaveBars * 0.95);
      g.setValueAtTime(was, t);
      g.linearRampToValueAtTime(want, t + dur);
      if (want === 0) this.offBar[s] = this.bar + 1;
      this.level[s] = want;
    }
    this.snap = false;
    if (this.bar > 0 && (this.bar & 7) === 0 && this.want.drums > 0) sys._crash(t, this.stem.drums, 0.5);
    sys._logBar(this, t);
  }

  /** pad voicing with smooth voice-leading; pad oscillators glide to it */
  _voice(t) {
    const c = this.chord, iv = QUAL[c.q] || QUAL.M;
    const base = 48 + ((this.pc + this.transpose + c.root) % 12 + 12) % 12;
    const tones = (iv.length > 3 ? [iv[1], iv[2], iv[3]] : iv).map((x) => base + x);
    // put each tone in the octave nearest the previous voicing's centre (≈ 64)
    const out = tones.map((m) => { let x = m; while (x < 57) x += 12; while (x > 70) x -= 12; return x; }).sort((a, b) => a - b);
    this.voicing = out;
    for (const p of this.padOsc) p.o.frequency.setTargetAtTime(mtof(out[p.v]), t, TUNE.music.padGlide);
    const a = this.padAmp.gain;
    a.setTargetAtTime(0.72, t, 0.012);
    a.setTargetAtTime(1, t + 0.04, 0.35);
  }

  _resolveMotif(ref) {
    if (!ref) return null;
    if (ref === 'long') return 'long';
    let idx = parseInt(ref.slice(1), 10) || 0;
    let tf = ref.replace(/^m\d+/, '');
    const slot = (this.bar & 7) >> 1;
    // seeded per-loop variations keep a 3-minute stage from feeling like a 4-bar loop
    if (this.occ > 0 && !tf && slot === 2) tf = VARIATIONS[(this.occ + (hashStr(this.name) & 3)) % VARIATIONS.length];
    if (this.occ > 1 && !tf && slot === 0 && this.rng() < 0.35) tf = '>';
    let tok = this.motifRaw[idx % this.motifRaw.length].slice();
    if (tf.includes('>')) tok = [tok[tok.length - 1] === '-' ? '.' : tok[tok.length - 1], ...tok.slice(0, -1)].map((x, i) => (i === 0 && x === '-' ? '.' : x));
    if (tf.includes('~')) tok = tok.map((x, i) => (i % 2 === 1 && x !== '.' && x !== '-' ? '-' : x));
    let parsed = parseMotif(tok.join(' '));
    if (tf.includes('^')) {
      let mx = -99; for (const n of parsed) if (n && n.deg > mx) mx = n.deg;
      if (mx <= 5) parsed = parsed.map((n) => (n ? { deg: n.deg + 5, len: n.len } : null));
    }
    return parsed;
  }

  _lead(st, t) {
    const sys = this.sys, sd = this.stepDur;
    if (this.motif === 'long') {
      if (st !== 0 && st !== 8) return;
      const c = this.chord, iv = QUAL[c.q] || QUAL.M;
      const target = this.root + c.root + (st === 0 ? iv[1] : iv[2]);
      // nearest pentatonic tone to the chord tone
      let best = this.root, bd = 99;
      for (let d = -3; d < 12; d++) { const m = degMidi(this.root, this.scale, d); const dd = Math.abs(m - target); if (dd < bd) { bd = dd; best = m; } }
      sys._leadNote(this.def.lead, best, t, sd * 7.5, this.stem.lead, 0.7, this);
      return;
    }
    const m = this.motif;
    if (!m) return;
    const n = m[(this.bar & 1) * 8 + (st >> 1)];
    if (!n) return;
    const midi = degMidi(this.root, this.scale, n.deg);
    sys._leadNote(this.def.lead, midi, t, n.len * sd * 2 * 0.92, this.stem.lead, 0.9, this);
    if (sys.debug) sys._logEv({ t: +t.toFixed(3), type: 'lead', midi, bar: this.bar, deg: n.deg });
  }

  _drums(st, t, barIn8) {
    const sys = this.sys, d = this.drumPat, dest = this.stem.drums;
    const fill = barIn8 === 7 && st >= 12;
    const miniFill = (barIn8 === 3) && st >= 14;
    const half = this.sec?.breakdown;
    if (fill) {
      sys._snare(t, dest, 0.45 + (st - 12) * 0.15);
      if (st === 12 || st === 14) sys._tom(t, dest, st === 12 ? 190 : 150);
      return;
    }
    const k = half ? DRUMS.half : d;
    if (k.k[st] === 'x' || (miniFill && st === 15)) {
      sys._kick(t, dest, 1);
      sys._markKick(t);
      if (this.want.hype > 0 || this.forceHype) {
        const g = this.pump.gain; g.setValueAtTime(0.6, t); g.linearRampToValueAtTime(1, t + 0.18);
      }
    }
    if (k.s[st] === 'x') { sys._snare(t, dest, 0.8); if (this.def.clap) sys._clap(t, dest, 0.5); }
    if (k.h[st] === 'x') sys._hat(t, dest, 0.5, false);
    if (k.o[st] === 'x' || (miniFill && st === 14)) sys._hat(t, dest, 0.45, true);
  }

  _hype(st, t) {
    const sys = this.sys, dest = this.stem.hype;
    sys._hat(t, dest, st % 4 === 2 ? 0.55 : 0.3, false);         // 16th hats
    if (st % 4 === 2) sys._stab(this.voicing, t, this.stepDur * 1.6, dest);
  }
}

// ============ AudioSys (G.audio) ============
const ACTIVE_STATES = new Set(['playing', 'levelup', 'paused', 'secondChance', 'victory']);
const INTRO_STATES = new Set(['intro', 'countdown']);
const UI_SOUNDS = new Set(['click', 'back', 'claim', 'buy', 'error', 'whoosh', 'capsule', 'rankup', 'unlock', 'star', 'tick', 'pop', 'hover', 'coinTick', 'cardReveal', 'babble', 'open']);
const QUANTISED = new Set(['levelup', 'novaReady', 'milestone', 'wave', 'waveClear', 'checkpoint']);

export class AudioSys {
  /** names for dev harnesses / UI previews */
  static get TRACKS() { return [...Object.keys(SONGS), 'victory', 'defeat']; }
  static get SFX_NAMES() { return Object.keys(SFX); }

  constructor(G) {
    this.G = G;
    this.ctx = null;
    this.offline = false;
    this.muted = false;
    this.low = G?.quality === 'low';
    // public read-only state
    this.beat = 0; this.kick = 0; this.bar = 0; this.bpm = 0; this.track = null;
    // music state
    this.song = null;
    this._stinger = null;                 // {out, end, track}
    this._i = 0; this._iExt = 0; this._iExtAt = -99; this._iNearT = 0; this._iNear = 0;
    this.flags = { inRun: false, state: null, active: false, style: 0, novaReady: false, fever: false, danger: false, boss: false, progress: 0, paused: false, drone: false };
    this._slowT = 0; this._hurtAt = -99; this._perfectAt = -99; this._novaDuckUntil = -99;
    this._bossPhase = 1; this._endlessT = 0; this._stingerFor = null; this._prevRunState = null;
    this._lastGo = -99; this._lastCheer = -99;
    this._mix = { duck: 1, lp: 20000 };
    // beat clock (ring buffers, no allocations per frame)
    this._beatT = new Float64Array(16); this._beatD = new Float64Array(16); this._beatN = 0;
    this._kickT = new Float64Array(8); this._kickN = 0;
    this._freePhase = 0;
    // sfx state
    this._voices = [];
    this._rl = new Map();                // name → {frame, n, last}
    this._frameNo = 0;
    this._ladder = { idx: -1, n: -1, t: -99 };
    this._crys = { idx: -1, t: -99 };
    this._near = { idx: 0, t: -99 };
    this._pm = 1;                          // pitch multiplier of the recipe being built
    this._cur = null;                      // voice being built
    // volumes
    const s = G?.save?.profile?.settings || {};
    this._vol = { music: s.music ?? 0.7, sfx: s.sfx ?? 0.9 };
    // debug / verification log
    this.debug = false; this.log = [];
    this._wire();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || this.offline) return;
        try { if (document.hidden) this.ctx.suspend?.(); else this.ctx.resume?.(); } catch { /* ignore */ }
      });
    }
  }

  // ================= public API =================
  /** create/resume the AudioContext — call from a user gesture (main does, on every pointerdown/keydown) */
  unlock() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return;
      try { this._attach(new AC({ latencyHint: 'interactive' })); } catch (err) { console.warn('[audio] no AudioContext', err); return; }
    }
    if (this.ctx.state !== 'running' && !this.offline && !(typeof document !== 'undefined' && document.hidden)) {
      try { this.ctx.resume?.()?.catch?.(() => {}); } catch { /* ignore */ }
    }
  }

  update(rdt = 1 / 60) {
    this._frameNo++;
    rdt = clamp(num(rdt, 1 / 60), 0, 0.25);
    if (!this.ctx) { this._freeBeat(rdt); return; }
    try { this._frame(rdt, this._now()); } catch (err) { this._warnOnce('frame', err); }
  }

  _warnOnce(key, err) {
    this._warned ||= new Set();
    if (this._warned.has(key)) return;
    this._warned.add(key);
    console.warn('[audio] ' + key + ' failed (further errors muted)', err);
  }

  music(track) {
    track = track || null;
    if (track && !SONGS[track] && track !== 'victory' && track !== 'defeat') { console.warn('[audio] unknown track', track); return; }
    const now = this.ctx ? this._now() : 0;
    const same = track === this.track && (track === null || this.song?.name === track || (this._stinger && this._stinger.track === track && this._stinger.end > now));
    this.track = track;
    if (!this.ctx || same) return;
    this._startTrack(track);
  }

  intensity(v) {
    this._iExt = clamp(+v || 0, 0, 1);
    this._iExtAt = this.G?.time?.real ?? 0;
  }

  setVolumes(v) {
    const { music, sfx } = v || {};
    if (Number.isFinite(+music) && music !== null) this._vol.music = clamp(+music, 0, 1);
    if (Number.isFinite(+sfx) && sfx !== null) this._vol.sfx = clamp(+sfx, 0, 1);
    this._applyVolumes();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) {
      const t = this._now();
      const g = this._master.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(this.muted ? 0 : TUNE.mix.master, t + 0.08);
    }
    return this.muted;
  }

  /** one-shot sound. opts: {x, z} (pan/distance) · pan · volume|gain · pitch (×) · at (ctx time) · + recipe fields */
  sfx(name, opts = {}) {
    if (!this.ctx || (!this.offline && (this.muted || this.ctx.state !== 'running'))) return null;
    const recipe = SFX[name];
    if (!recipe) { if (this.debug) console.warn('[audio] unknown sfx', name); return null; }
    if (!this._allow(name)) return null;
    if (!opts || typeof opts !== 'object') opts = {};
    let t = Number.isFinite(opts.at) ? Math.max(opts.at, this._now()) : this._now() + 0.005;
    if (QUANTISED.has(name) && opts.at == null) t = this._nextEighth(t);
    const bus = UI_SOUNDS.has(name) && !this.G?.run ? this._uiIn : this._sfxIn;
    const v = this._voiceBegin(name, bus, t, opts);
    const pm = num(opts.pitch, 1);
    this._pm = pm > 0 ? clamp(pm, 0.25, 4) : 1;
    this._cur = v;
    let dur = 0.5;
    try { dur = recipe(this, t, opts, v.out) || 0.5; } catch (err) { console.warn('[audio] sfx failed', name, err); }
    this._cur = null; this._pm = 1;
    v.end = t + dur + 0.1;
    if (this.debug) this._logEv({ t, type: 'sfx', name });
    return v;
  }

  /** Cube-ese: gibberish syllable blips per hero. mood: happy|cheer|sad|oops|question|sleepy|angry|laugh */
  babble(hero = 'blu', mood = 'happy', n) { return this.sfx('babble', { hero, mood, n }); }
  /** the hero's 3-note motif */
  motif(hero = 'blu', opts = {}) { return this.sfx('motif', { hero, ...opts }); }

  // ================= graph =================
  _now() { return this._fakeNow ?? (this.ctx ? this.ctx.currentTime : 0); }

  /** build the mixer on a (possibly offline) context */
  _attach(ctx, { offline = false, clip = TUNE.mix.softClip } = {}) {
    this.ctx = ctx; this.offline = offline;
    const M = TUNE.mix;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = M.comp.threshold; comp.knee.value = M.comp.knee; comp.ratio.value = M.comp.ratio;
    comp.attack.value = M.comp.attack; comp.release.value = M.comp.release;
    const master = ctx.createGain(); master.gain.value = this.muted ? 0 : M.master;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = M.limiter.threshold; lim.knee.value = M.limiter.knee; lim.ratio.value = M.limiter.ratio;
    lim.attack.value = M.limiter.attack; lim.release.value = M.limiter.release;
    comp.connect(master); master.connect(lim);
    let last = lim;
    if (clip) {
      const sh = ctx.createWaveShaper();
      const n = 2048, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
        const y = a < 0.7 ? a : 0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28);
        curve[i] = Math.sign(x) * y;
      }
      sh.curve = curve; sh.oversample = 'none';
      lim.connect(sh); last = sh;
    }
    last.connect(ctx.destination);
    this._comp = comp; this._master = master; this._lim = lim; this._out = last;
    // reverb
    const rv = ctx.createConvolver();
    rv.buffer = this._impulse(this.low ? M.reverb.lowSeconds : M.reverb.seconds);
    const rvOut = ctx.createGain(); rvOut.gain.value = 1;
    rv.connect(rvOut); rvOut.connect(comp);
    this._reverb = rv;
    // buses
    const bus = (send) => {
      const vol = ctx.createGain();
      vol.connect(comp);
      const s = ctx.createGain(); s.gain.value = send; vol.connect(s); s.connect(rv);
      return vol;
    };
    this._musicVol = bus(M.reverb.musicSend);
    this._musicLp = ctx.createBiquadFilter(); this._musicLp.type = 'lowpass'; this._musicLp.frequency.value = 20000; this._musicLp.Q.value = 0.7;
    this._duck = ctx.createGain();
    this._musicIn = ctx.createGain();
    this._musicIn.connect(this._duck); this._duck.connect(this._musicLp); this._musicLp.connect(this._musicVol);
    this._sfxVol = bus(M.reverb.sfxSend);
    this._sfxIn = ctx.createGain(); this._sfxIn.connect(this._sfxVol);
    this._uiVol = bus(M.reverb.uiSend);
    this._uiIn = ctx.createGain(); this._uiIn.connect(this._uiVol);
    this._applyVolumes();
    // shared sources
    const len = ctx.sampleRate * 2;
    this._noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this._noiseBuf.getChannelData(0);
    const r = makeRng(7);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    const pw = (duty) => {
      const N = 32, re = new Float32Array(N), im = new Float32Array(N);
      for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return ctx.createPeriodicWave(re, im);
    };
    this._pulse25 = pw(0.25); this._pulse12 = pw(0.125);
    // scheduler timer (realtime only; offline tests pump manually)
    if (!offline && typeof setInterval !== 'undefined') {
      this._timer = setInterval(() => {
        if (this.ctx.state !== 'running') return;
        try { this._pumpMusic(this._now()); } catch (err) { this._warnOnce('scheduler', err); }
      }, TUNE.music.timerMs);
    }
    if (this.track) this._startTrack(this.track);
  }

  _impulse(sec) {
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * sec);
    const buf = ctx.createBuffer(2, n, sr);
    const r = makeRng(99);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        lp += ((r() * 2 - 1) - lp) * (0.55 - 0.4 * u);       // darker tail
        d[i] = lp * Math.pow(1 - u, 2.4) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
      }
    }
    return buf;
  }

  _applyVolumes() {
    if (!this.ctx) return;
    const M = TUNE.mix, c = M.volCurve, t = this._now();
    const set = (node, v) => { node.gain.setTargetAtTime(v, t, 0.03); };
    set(this._musicVol, M.music * Math.pow(this._vol.music, c));
    set(this._sfxVol, M.sfx * Math.pow(this._vol.sfx, c));
    set(this._uiVol, M.ui * Math.pow(this._vol.sfx, c));
  }

  // ================= bus wiring =================
  _wire() {
    const bus = this.G?.bus;
    if (!bus) return;
    const on = (n, fn) => bus.on(n, (p) => { try { fn(p || {}); } catch (err) { console.warn('[audio] handler', n, err); } });
    const S = (name, extra) => (p) => this.sfx(name, extra ? { ...p, ...extra } : p);
    // ---- run lifecycle ----
    on('run:start', (p) => this._onRunStart(p));
    on('run:countdown', (p) => this._onCountdown(p));
    on('run:go', () => this._onGo());
    on('run:end', (p) => this._onRunEnd(p));
    on('wave:start', (p) => { if ((this.G?.time?.real ?? 0) - this._lastGo > 0.8) this.sfx('wave', p); });
    on('wave:clear', S('waveClear'));
    on('fever', () => this._onFever());
    on('checkpoint', S('checkpoint'));
    on('objective:done', S('star'));
    on('tutorial:step', S('pop'));
    on('gate:open', S('gate'));
    // ---- player ----
    on('player:dash', (p) => this.sfx(p.blink || p.kind === 'blink' ? 'blink' : 'dash', p));
    on('player:dashDenied', S('puff'));
    on('player:perfect', (p) => {
      this._perfectAt = this._now?.() ?? 0;
      this.sfx('perfect', p);
      const now = this.G?.time?.real ?? 0;
      if (now - this._lastCheer > 4 && Math.random() < 0.4) { this._lastCheer = now; this.sfx('babble', { hero: this._heroId(), mood: 'cheer', at: this._now() + 0.35 }); }
    });
    on('player:nearMiss', S('nearMiss'));
    on('player:hurt', (p) => { this._hurtAt = this._now?.() ?? 0; this.sfx('hurt', p); });
    on('player:heal', S('heal'));
    on('player:shieldBlock', S('shield'));
    on('player:shieldReady', S('shieldReady'));
    on('player:staminaEmpty', S('wheeze'));
    on('player:staminaBack', S('ready'));
    on('player:cue', S('cue'));
    on('player:death', S('death'));
    on('player:secondChance', S('freeze'));
    on('player:revive', (p) => { this.sfx('revive', p); this.sfx('babble', { hero: this._heroId(), mood: 'cheer', at: this.ctx ? this._now() + 0.4 : 0 }); });
    on('player:levelup', (p) => { this.sfx('levelup', p); this.sfx('cardReveal', { at: this.ctx ? this._now() + 0.45 : 0 }); });
    on('card:chosen', S('card'));
    on('card:setBonus', S('setBonus'));
    on('card:mininova', S('miniNova'));
    on('card:reaction', (p) => this.sfx('pop', { ...p, pitch: 1 + Math.min(12, p.count || 0) * 0.06 }));
    on('player:well', S('well'));
    on('player:static', S('zap'));
    on('player:bolt', S('bolt'));
    on('player:stomp', S('stomp'));
    on('player:implode', S('implode'));
    on('player:bump', S('bump'));
    on('player:clang', S('clang'));
    // ---- nova / combo / pickups ----
    on('nova:ready', () => { this.flags.novaReady = true; this.sfx('novaReady', { hero: this._heroId() }); });
    on('nova:notReady', S('notYet'));
    on('nova', (p) => {
      this.flags.novaReady = false;
      this._novaDuckUntil = (this._now?.() ?? 0) + 0.5;
      if (this.song) this.song.hypeBars = TUNE.music.novaHypeBars;
      this.sfx('nova', p);
    });
    on('combo:milestone', S('milestone'));
    on('combo:break', (p) => { if ((p.count || 0) >= 5) this.sfx('womp', p); });
    on('pickup:crystal', S('crystal'));
    on('pickup:heart', S('heartPickup'));
    on('pickup:coin', S('coin'));
    on('pickup:magnet', S('magnet'));
    // ---- enemies / boss ----
    on('enemy:spawnWarn', S('portal'));
    on('enemy:spawn', (p) => { if (!p.silent) this.sfx('land', p); });
    on('enemy:bonk', S('bonk'));
    on('enemy:knock', S('knock'));
    on('enemy:clang', S('clang'));
    on('enemy:dizzy', S('dizzy'));
    on('enemy:wake', S('wake'));
    on('enemy:windup', S('windup'));
    on('enemy:smash', S('smash'));
    on('enemy:freed', (p) => this.sfx(p.treasure ? 'coinBurst' : 'freed', p));
    on('enemy:coinBurst', S('coinBurst'));
    on('enemy:explode', S('explode'));
    on('enemy:split', S('split'));
    on('enemy:shieldPop', S('shieldPop'));
    on('boss:intro', (p) => {
      this.flags.drone = false;
      this._runTrack = 'boss';
      this._bossPhase = 1;                         // boss rush: every king starts at phase 1
      if (this.song) this.song.forceHype = false;
      this.music('boss');
      this._retempo();
      this.sfx('roar', p);
      this.sfx('babble', { hero: 'king', mood: 'laugh', at: this.ctx ? this._now() + 1.2 : 0 });
    });
    on('boss:phase', (p) => this._onBossPhase(p));
    on('boss:slam', S('slam'));
    on('boss:vulnerable', S('vulnerable'));
    on('boss:hit', S('bossHit'));
    on('boss:defeat', S('bossDefeat'));
    // ---- ui / meta ----
    for (const n of ['click', 'back', 'claim', 'buy', 'error']) on('ui:' + n, S(n));
    on('ui:open', S('whoosh'));
    on('meta:rankup', S('rankup'));
    on('meta:unlock', S('unlock'));
    on('meta:break', () => { this.music('lullaby'); this.sfx('babble', { hero: 'blu', mood: 'sleepy', at: this.ctx ? this._now() + 0.6 : 0 }); });
    on('meta:goodnight', () => { this.music('lullaby'); this.sfx('babble', { hero: 'blu', mood: 'sleepy' }); });
    on('settings:change', ({ key, value }) => {
      if (key === 'music') this.setVolumes({ music: value });
      else if (key === 'sfx') this.setVolumes({ sfx: value });
    });
  }

  _heroId() { const r = this.G?.run; return r?.player?.heroId || r?.heroId || r?.heroDef?.id || this.G?.meta?.selectedHero || 'blu'; }

  _worldIndex(p) {
    const r = this.G?.run;
    if (r && Number.isFinite(r.worldIndex)) return r.worldIndex;
    const w = p?.worldId;
    if (Number.isFinite(w)) return w;
    const i = DATA.worlds.findIndex((x) => x.id === w);
    return i >= 0 ? i : 0;
  }

  _onRunStart(p) {
    const mode = p.mode || this.G?.run?.mode || 'stage';
    const wi = clamp(this._worldIndex(p), 0, DATA.worlds.length - 1);
    const run = this.G?.run;
    const stageDef = run?.stageDef || DATA.worlds[wi]?.stages?.[p.stageId];
    const isBoss = !!(run?.isBossStage || stageDef?.boss || stageDef?.kind === 'boss');
    this._stingerFor = null; this._prevRunState = null; this._bossPhase = 1;
    this._ladder.idx = -1; this._ladder.n = -1; this._ladder.t = -99; this._crys.idx = -1; this._near.idx = 0;
    this.flags.novaReady = false; this.flags.fever = false;
    this._endlessT = 0;
    let track = 'w' + (wi + 1);
    if (mode === 'endless') track = 'endless';
    else if (mode === 'rush') track = 'boss';
    this.flags.drone = isBoss && mode !== 'rush';      // the boss theme starts on boss:intro
    // flags must be right for the very first bar (scheduled before the next frame reads G.run)
    this.flags.inRun = true; this.flags.state = run?.state || 'intro'; this.flags.active = false; this.flags.danger = false; this.flags.progress = 0;
    this._runTrack = track;
    if (this.track === track && this.song && !this._stinger) { this._retempo(); return; }   // retry: keep the groove going
    this.music(track);
  }

  _onCountdown({ n }) {
    n = num(n, -1);
    if (n < 0) return;
    this.sfx('countdown', { n });
    if (n === 1) this.sfx('countIn', {});
    if (n === 0) this._lastGo = this.G?.time?.real ?? 0;
  }

  _onGo() {
    const now = this.G?.time?.real ?? 0;
    if (now - this._lastGo > 0.3) this.sfx('countdown', { n: 0 });
    this._lastGo = now;
    if (this.ctx && this.song && !this.flags.drone) {
      const t = this._now() + 0.02;
      this.song.resync(t);
      this.song.leadIntro = TUNE.music.leadIntroBars;
      this._crash(t, this._sfxIn, 0.7);
    }
    this.sfx('babble', { hero: this._heroId(), mood: 'cheer', at: this.ctx ? this._now() + 0.25 : 0 });
  }

  _onRunEnd({ win }) {
    if (this._stingerFor === this.G?.run && this.G?.run) return;
    this._stingerFor = this.G?.run || true;
    this.music(win ? 'victory' : 'defeat');
  }

  _onFever() {
    this.flags.fever = true;
    this.sfx('fever', {});
    this._retempo();
  }

  _onBossPhase({ phase }) {
    this._bossPhase = Math.max(1, phase | 0 || 1);
    this.sfx('phase', { phase });
    this._retempo();
    if (this.song) this.song.forceHype = this._bossPhase >= 3;
  }

  /** BPM / key from FEVER, boss phase and endless time — applied on the next bar line */
  _retempo() {
    const s = this.song;
    if (!s) return;
    const E = TUNE.music.endless, B = TUNE.music.bossPhase;
    let bpm = s.baseBpm, tr = 0;
    if (this.flags.fever) bpm += DATA.TUNE?.fever?.bpmAdd ?? 8;
    if (s.def.boss) { bpm += (this._bossPhase - 1) * B.bpm; tr += (this._bossPhase - 1) * B.semis; }
    if (s.name === 'endless') {
      const t = this._endlessT;
      bpm = Math.min(E.maxBpm, bpm + Math.floor(t / E.every) * E.bpmStep);
      tr += Math.min(E.maxKey, Math.floor(t / E.keyEvery) * E.keyStep);
    }
    if (bpm !== s.bpm) s.pendingBpm = bpm;
    if (tr !== s.transpose) s.pendingTranspose = tr;
  }

  // ================= tracks =================
  _songDef(track) {
    const base = SONGS[track];
    if (!base) return null;
    const m = /^w([1-6])$/.exec(track);
    if (!m) return base;
    const w = DATA.worlds[+m[1] - 1];
    const mu = w?.music || {};
    return { ...base, bpm: mu.bpm || 120, key: mu.key || 'C', scale: mu.scale || 'majorPent' };
  }

  _startTrack(track) {
    const now = this._now() + 0.03;
    const M = TUNE.music;
    // cut a playing stinger quickly, crossfade a playing song
    if (this._stinger) { this._fadeNode(this._stinger.out, now, M.stingerCut); this._stinger = null; }
    const old = this.song;
    this.song = null;
    if (track === 'victory' || track === 'defeat') {
      if (old) old.stop(now, M.stingerCut);
      this._playStinger(track, now + 0.05);
      return;
    }
    if (old) old.stop(now, M.xfade);
    if (!track) return;
    const def = this._songDef(track);
    if (!def) return;
    this.song = new Song(this, track, def, now + (old ? 0.1 : 0), old ? M.xfade : 0.5);
    this.song.leadIntro = 0; this.song.hypeBars = 0;
    this._retempo();
    if (this.debug) this._logEv({ t: now, type: 'track', track, bpm: def.bpm, key: def.key, scale: def.scale });
  }

  _fadeNode(node, t, fade) {
    const g = node.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + fade);
    if (!this.offline) setTimeout(() => { try { node.disconnect(); } catch { /* gone */ } }, (fade + 0.3) * 1000 + Math.max(0, t - this._now()) * 1000);
  }

  /** victory fanfare / defeat "wah-wah" — one-shot, then the friendly hub tune returns */
  _playStinger(kind, t) {
    const ctx = this.ctx;
    const out = ctx.createGain(); out.gain.value = 1; out.connect(this._musicIn);
    const pc = this.song?.pc ?? this._keyPc();
    const root = leadRoot(pc);
    let end;
    if (kind === 'victory') {
      const e = 0.14;                      // 8th note
      const deg = (d) => degMidi(root, 'majorPent', d);
      // hero motif pickup
      const hm = HERO_MOTIF[this._heroId()] || HERO_MOTIF.blu;
      hm.degs.forEach((d, i) => this._note(hm.tone, deg(d + hm.oct * 5), t + i * 0.075, 0.07, out, 0.8, false));
      const t1 = t + 0.32;
      this._snareRoll(t1 - 0.3, 0.28, out, 0.5);
      const seq = [[3, 0, 0.11], [3, 1, 0.11], [3, 2, 0.11], [5, 3, 0.55], [4, 7, 0.11], [5, 8, 0.11], [7, 9, 1.3]];
      for (const [d, s, len] of seq) this._leadNote('square', deg(d), t1 + s * e, len, out, 0.75, null);
      for (const [d, s, len] of seq) this._note('tri', deg(d) - 12, t1 + s * e, len, out, 0.5, false);
      const chordAt = (s, rootSemi, len) => {
        const b = 48 + ((pc + rootSemi) % 12);
        for (const iv of [0, 4, 7, 12]) this._note('saw', b + iv + 12, t1 + s * e, len, out, 0.28, false);
        this._bassNote(36 + ((pc + rootSemi) % 12), t1 + s * e, len, out, 1);
        this._kick(t1 + s * e, out, 1);
        this._crash(t1 + s * e, out, 0.6);
      };
      chordAt(3, 0, 0.55); chordAt(7, 5, 0.25); chordAt(9, 0, 1.4);
      for (let i = 0; i < 8; i++) this._note('bell', deg(5 + i), t1 + 9 * e + 0.08 + i * 0.06, 0.4, out, 0.35, false);
      this.sfx('babble', { hero: this._heroId(), mood: 'cheer', at: t1 + 9 * e + 0.35 });
      end = t1 + 9 * e + 1.6;
    } else {

      // playful sad trombone: saw through a closing wah, chromatic steps down
      const base = 55 + ((pc + 7) % 12);
      const notes = [[0, 0.3], [-1, 0.3], [-2, 0.3], [-3, 1.1]];
      let tt = t;
      for (const [semi, len] of notes) {
        const o = this._osc('sawtooth', mtof(base + semi), tt, tt + len + 0.1);
        const bp = this._filter('bandpass', 1400, 3);
        bp.frequency.setValueAtTime(1600, tt);
        bp.frequency.exponentialRampToValueAtTime(420, tt + len);
        const g = this._env(tt, 0.02, 0.32, len - 0.08, 0.1, out);
        o.connect(bp); bp.connect(g);
        if (len > 0.5) {                     // wobble on the last note
          const lfo = this._osc('sine', 6, tt, tt + len + 0.1);
          const lg = ctx.createGain(); lg.gain.value = mtof(base + semi) * 0.03;
          lfo.connect(lg); lg.connect(o.frequency);
        }
        tt += len + 0.05;
      }
      const pad = this._osc('triangle', mtof(base - 12 - 3), t, tt + 0.6);
      pad.connect(this._env(t, 0.3, 0.12, tt - t - 0.2, 0.5, out));
      this.sfx('babble', { hero: this._heroId(), mood: 'oops', at: tt + 0.1 });
      end = tt + 0.8;
    }
    this._stinger = { out, end, track: kind };
    // afterwards: the friendly hub tune comes back (UI may pick another track sooner)
    const after = kind === 'victory' ? 0.4 : 0.6;
    const back = () => {
      if (this._stinger?.out !== out) return;
      this._stinger = null;
      if (this.track === kind) { this.track = 'hub'; this._startTrack('hub'); }
    };
    if (this.offline) this._pendingBack = { at: end + after, fn: back };
    else setTimeout(back, Math.max(0, end + after - this._now()) * 1000);
  }

  _pumpMusic(now) {
    const s = this.song;
    if (!s) return;
    if (s.nextTime < now - 0.25) s.nextTime = now + 0.03;     // fell behind (tab throttled): skip, don't burst
    s.pump16(now + TUNE.music.lookahead);
  }

  /** stem targets for the coming bar (called by Song on each bar line) */
  _planStems(song, t) {
    const f = this.flags, W = song.want, def = song.def, M = TUNE.music;
    song.padLp.frequency.setTargetAtTime(f.inRun && !def.menu ? lerp(M.padLp[0], M.padLp[1], clamp(f.progress, 0, 1)) : 1700, t, 0.4);
    if (def.menu || !f.inRun) {
      W.bed = 1; W.bass = 0.85; W.drums = def.drums === 'none' ? 0 : 0.8; W.arp = 0.6; W.lead = 1; W.hype = 0; W.heart = 0;
      return;
    }
    const I = this._i, st = f.state;
    const intro = INTRO_STATES.has(st) || (st === 'bossIntro' && !def.boss);
    const drone = f.drone && !def.boss;
    const live = f.active && !intro && !drone;
    W.bed = 1;
    W.bass = drone ? 0.45 : intro ? 0.7 : 1;
    W.drums = live ? 1 : 0;
    W.arp = drone ? 0 : (intro || f.style >= M.styleArp || I >= M.stems.arp || f.fever) ? (intro ? 0.55 : 0.8) : 0;
    W.lead = live && (f.novaReady || I >= M.stems.lead || song.leadIntro > 0 || f.fever || def.boss) ? 1 : 0;
    W.hype = live && (f.fever || I >= M.stems.hype || song.hypeBars > 0 || song.forceHype) ? 0.9 : 0;
    W.heart = live && f.danger ? 1 : 0;
    if (song.leadIntro > 0) song.leadIntro--;
    if (song.hypeBars > 0) song.hypeBars--;
  }

  // ================= per-frame =================
  _freeBeat(rdt) {
    this._freePhase = (this._freePhase + rdt * TUNE.music.freeBpm / 60) % 1;
    this.beat = this._freePhase;
    this.kick = Math.max(0, 1 - this._freePhase * 4);
  }

  _frame(rdt, now) {
    this._readRun(rdt, now);
    this._pumpMusic(now);
    this._mixFrame(now);
    this._beatFrame(rdt, now);
    this._reapVoices(now);
    if (this._pendingBack && now >= this._pendingBack.at) { const b = this._pendingBack; this._pendingBack = null; b.fn(); }
  }

  _readRun(rdt, now) {
    const G = this.G, run = G?.run, f = this.flags;
    const prev = this._prevRunState;
    if (!run || run.state === 'ended') {
      f.inRun = !!run; f.state = run?.state ?? null; f.active = false; f.paused = false; f.danger = false;
      this._slowT = 0;
      this._i += (0 - this._i) * Math.min(1, rdt);
      return;
    }
    const st = run.state;
    f.inRun = true; f.state = st;
    f.active = ACTIVE_STATES.has(st);
    f.paused = st === 'paused' || st === 'levelup';
    f.style = num(run.combo, 0) | 0;
    f.novaReady = run.novaReady ?? (run.nova >= 1);
    f.fever = f.fever || !!run.fever;
    const p = run.player;
    const hp = num(p?.hp, 9), maxHp = num(p?.maxHp, 9);
    f.danger = !!p && maxHp > 1 && hp <= 1 && hp > 0;
    f.boss = !!(run.boss || run.enemies?.boss);
    f.progress = clamp(num(run.progress, 0), 0, 1);
    const sc = num(G.time?.scale, 1);
    this._slowT = sc > 0 && sc < 0.9 ? this._slowT + rdt : 0;
    // state transitions → stingers / drops
    if (st !== prev) {
      if (st === 'victory' && this._stingerFor !== run) { this._stingerFor = run; this.music('victory'); }
      if (st === 'dying' && this._stingerFor !== run) { this._stingerFor = run; this.music('defeat'); }
      if (st === 'playing' && (prev === 'dying' || prev === 'ended')) {      // revived / continue
        this._stingerFor = null;
        if (this._runTrack && this.track !== this._runTrack) this.music(this._runTrack);
      }
      if (st === 'playing' && prev === 'bossIntro' && this.song?.def?.boss && !this.song.stopped) {
        const t = now + 0.03;                                                // boss theme drops on the downbeat
        this.song.resync(t); this._crash(t, this._sfxIn, 0.6);
      }
    }
    this._prevRunState = st;
    // endless: tempo / key climb
    if (this.song?.name === 'endless' && st === 'playing') {
      this._endlessT += rdt;
      if ((this._frameNo & 31) === 0) this._retempo();
    }
    // intensity: run's value (when fresh) or our own estimate, smoothed (τ 2 s)
    let target = 0;
    const real = G.time?.real ?? 0;
    if (real - this._iExtAt < 3) target = this._iExt;
    else {
      this._iNearT -= rdt;
      if (this._iNearT <= 0) {
        this._iNearT = 0.25;
        let n = 0;
        const list = run.enemies?.list;
        if (list && p) for (let i = 0; i < list.length; i++) { const e = list[i]; if (e && e.harmful !== false && (e.x - p.x) ** 2 + (e.z - p.z) ** 2 < 64) n++; }
        this._iNear = n;
      }
      const lowHp = p && maxHp > 0 && hp / maxHp < 0.3 ? 0.3 : 0;
      target = clamp(0.25 * f.progress + 0.04 * this._iNear + lowHp + (f.style >= 5 ? 0.2 : 0), 0, 1);
    }
    if (f.boss) target = Math.max(0.7, target);
    if (!f.active) target = Math.min(target, 0.3);
    this._i += (target - this._i) * (1 - Math.exp(-rdt / TUNE.music.iTau));
  }

  /** ducks + music-bus lowpass from pause / slow-mo / hurt / danger / nova */
  _mixFrame(now) {
    const f = this.flags, M = TUNE.music;
    let duck = 1, lp = 20000, fast = false;
    if (f.paused) { duck *= M.duck.pause; lp = Math.min(lp, M.pauseLp); }
    if (f.state === 'secondChance') { duck *= M.duck.second; lp = Math.min(lp, 900); }
    if (this._slowT > 0.06 && f.active && f.state !== 'victory' && !this._stinger) { duck *= M.duck.slow; lp = Math.min(lp, M.slowLp); }
    if (now < this._novaDuckUntil) duck *= M.duck.nova;
    const h = now - this._hurtAt;
    if (h >= 0 && h < 0.4) { lp = Math.min(lp, h < 0.04 ? M.hurtLp : M.hurtLp * Math.pow(20000 / M.hurtLp, (h - 0.04) / 0.34)); fast = h < 0.05; }
    const pf = now - this._perfectAt;
    if (pf >= 0 && pf < 0.45) lp = Math.min(lp, 800);
    if (f.danger && f.active) lp = Math.min(lp, M.dangerLp);
    if (f.drone && f.inRun && !this.song?.def?.boss) lp = Math.min(lp, M.droneLp);
    const m = this._mix;
    if (Math.abs(duck - m.duck) > 0.01) { m.duck = duck; this._duck.gain.setTargetAtTime(duck, now, 0.08); }
    if (Math.abs(lp - m.lp) / m.lp > 0.03) { m.lp = lp; this._musicLp.frequency.setTargetAtTime(lp, now, fast ? 0.012 : 0.07); }
  }

  _markBeat(t, dur) {
    const i = this._beatN++ & 15;
    this._beatT[i] = t; this._beatD[i] = dur;
  }
  _markKick(t) { this._kickT[this._kickN++ & 7] = t; }

  _beatFrame(rdt, now) {
    if (!this.song || this.song.stopped) { this._freeBeat(rdt); this.bpm = 0; return; }
    const at = now - (this.ctx.outputLatency || this.ctx.baseLatency || 0);
    let bt = -1, bd = 0.5;
    for (let i = 0; i < 16; i++) { const t = this._beatT[i]; if (t <= at && t > bt) { bt = t; bd = this._beatD[i]; } }
    this.beat = bt < 0 ? 0 : clamp((at - bt) / bd, 0, 0.999);
    let kt = -1;
    for (let i = 0; i < 8; i++) { const t = this._kickT[i]; if (t <= at && t > kt) kt = t; }
    this.kick = kt < 0 ? 0 : Math.max(0, 1 - (at - kt) / 0.18);
    this.bpm = this.song.bpm;
    this.bar = this.song.bar;
  }

  _nextEighth(t) {
    const s = this.song;
    if (!s || s.stopped) return t;
    const e = s.stepDur * 2;
    // steps are scheduled up to `lookahead` ahead; nextTime is the next 16th boundary
    let q = s.nextTime - (s.step & 1 ? s.stepDur : 0);
    while (q - e >= t) q -= e;
    while (q < t) q += e;
    return q - t > 0.2 ? t : q;
  }

  _keyPc() {
    if (this.song) return (this.song.pc + this.song.transpose + 120) % 12;
    const wi = this.G?.run?.worldIndex;
    const m = DATA.worlds[Number.isFinite(wi) ? wi : 0]?.music;
    return pcOf(m?.key || 'C');
  }
  _keyScale() { return this.song?.scale || 'majorPent'; }
  /** frequency of pentatonic degree d in the current key, octave `oct` (0 = lead register ≈ C5) */
  _deg(d, oct = 0) { return mtof(degMidi(leadRoot(this._keyPc()) + oct * 12, this._keyScale(), d)); }

  // ================= logging (verification) =================
  _logBar(song, t) {
    if (!this.debug) return;
    const on = {};
    for (const s of STEM_NAMES) if (song.want[s] > 0) on[s] = +song.want[s].toFixed(2);
    this._logEv({ t: +t.toFixed(3), type: 'bar', track: song.name, bar: song.bar, sec: song.secKey, loop: song.loop, bpm: song.bpm, tr: song.transpose, chord: song.chord.root + song.chord.q, stems: on, I: +this._i.toFixed(2) });
  }
  _logEv(e) { this.log.push(e); if (this.log.length > 4000) this.log.splice(0, 1000); }

  // ================= voices (sfx) =================
  _allow(name) {
    const V = TUNE.voices;
    let r = this._rl.get(name);
    if (!r) { r = { frame: -1, n: 0, last: -99 }; this._rl.set(name, r); }
    const now = this._now();
    const gap = V.minGap[name];
    if (gap && now - r.last < gap) return false;
    if (r.frame !== this._frameNo) { r.frame = this._frameNo; r.n = 0; }
    if (r.n >= (V.perFrame[name] ?? V.defaultPerFrame)) return false;
    if (this._fcFrame !== this._frameNo) { this._fcFrame = this._frameNo; this._fc = 0; }
    if (this._fc >= V.perFrameTotal) return false;
    this._fc++;
    r.n++; r.last = now;
    return true;
  }

  _spatial(o) {
    if (o.pan != null) return { pan: clamp(num(o.pan, 0), -1, 1), g: 1 };
    if (!Number.isFinite(o.x) || !Number.isFinite(o.z)) return { pan: 0, g: 1 };
    let pan = null;
    try {
      const sc = this.G?.cam?.worldToScreen?.(o.x, o.y ?? 0.5, o.z);
      const W = typeof window !== 'undefined' ? window.innerWidth : 0;
      if (sc && Number.isFinite(sc.x) && W > 0) pan = (sc.x / W) * 2 - 1;
    } catch { /* camera optional */ }
    if (pan === null) pan = o.x / (this.G?.world?.arenaRadius || 12);
    let g = 1;
    const p = this.G?.run?.player;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) g = 1 / (1 + Math.hypot(o.x - p.x, o.z - p.z) / 12);
    return { pan: clamp(num(pan, 0), -0.7, 0.7), g };
  }

  _voiceBegin(name, bus, t, o) {
    const V = TUNE.voices, list = this._voices;
    const cap = V.caps[name] ?? V.defaultCap;
    const max = this.low ? V.maxLow : V.max;
    let same = 0, live = 0, oldestSame = null, oldest = null;
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (v.dead) continue;
      live++;
      if (v.name === name) { same++; if (!oldestSame || v.t0 < oldestSame.t0) oldestSame = v; }
      if (!oldest || v.t0 < oldest.t0) oldest = v;
    }
    if (same >= cap && oldestSame) this._steal(oldestSame, t);
    else if (live >= max && oldest) this._steal(oldest, t);
    const ctx = this.ctx;
    const sp = this._spatial(o);
    const out = ctx.createGain();
    out.gain.value = clamp(num(o.volume ?? o.gain, 1) * sp.g * (TUNE.level[name] ?? 1), 0, 4);
    let tail = out;
    if (sp.pan && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner(); pn.pan.value = sp.pan;
      out.connect(pn); tail = pn;
    }
    tail.connect(bus);
    const v = { name, t0: t, end: t + 2, out, tail, src: [], dead: false };
    list.push(v);
    return v;
  }

  _steal(v, t) {
    v.dead = true;
    v.end = t + 0.06;
    try { v.out.gain.cancelScheduledValues(t); v.out.gain.setTargetAtTime(0, t, 0.008); } catch { /* ignore */ }
    for (const s of v.src) { try { s.stop(t + 0.05); } catch { /* not started / stopped */ } }
  }

  _reapVoices(now) {
    const list = this._voices;
    for (let i = list.length - 1; i >= 0; i--) {
      const v = list[i];
      if (v.end > now) continue;
      // (offline renders keep nodes connected: disconnecting is immediate, not scheduled)
      if (!this.offline || this._reapOffline) { try { v.tail.disconnect(); if (v.tail !== v.out) v.out.disconnect(); } catch { /* gone */ } }
      v.src.length = 0;
      list[i] = list[list.length - 1]; list.pop();
    }
  }

  // ================= synthesis primitives =================
  _osc(type, f, t, stop) {
    const o = this.ctx.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this._pulse25);
    else if (type === 'pulse12') o.setPeriodicWave(this._pulse12);
    else o.type = type === 'tri' ? 'triangle' : type === 'saw' ? 'sawtooth' : type;
    o.frequency.setValueAtTime(Math.max(1, f * this._pm), t);
    o.start(t); o.stop(stop);
    if (this._cur) this._cur.src.push(o);
    return o;
  }
  _glide(o, f1, t1, t0) {
    if (t0 != null) o.frequency.setValueAtTime(o.frequency.value, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * this._pm), t1);
  }
  _noise(t, stop, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this._noiseBuf; s.loop = true; s.playbackRate.value = rate;
    s.start(t, Math.random() * 1.5); s.stop(stop);
    if (this._cur) this._cur.src.push(s);
    return s;
  }
  _filter(type, f, Q = 1) {
    const b = this.ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = Q;
    return b;
  }
  /** attack → hold → exponential release envelope gain node connected to dest */
  _env(t, a, peak, hold, rel, dest) {
    const g = this.ctx.createGain();
    const p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (hold > 0) p.setValueAtTime(peak, t + a + hold);
    p.setTargetAtTime(0, t + a + hold, Math.max(0.004, rel / 4));
    g.connect(dest);
    return g;
  }
  /** pitched percussive tone with optional glide */
  _tone(type, f0, f1, t, dur, peak, dest, a = 0.003, glide = null) {
    const o = this._osc(type, f0, t, t + a + dur * 1.3 + 0.02);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * this._pm), t + (glide ?? dur));
    o.connect(this._env(t, a, peak, 0, dur, dest));
    return o;
  }
  /** filtered noise burst with an optional filter sweep */
  _nz(t, dur, peak, dest, type = 'bandpass', f0 = 1000, f1 = null, Q = 1, a = 0.003, rate = 1) {
    const s = this._noise(t, t + a + dur * 1.3 + 0.02, rate);
    const f = this._filter(type, f0, Q);
    if (f1) { f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); }
    s.connect(f); f.connect(this._env(t, a, peak, 0, dur, dest));
    return f;
  }
  /** bell: sine + inharmonic 2.76× partial */
  _bell(f, t, dur, peak, dest) {
    this._tone('sine', f, null, t, dur, peak, dest, 0.002);
    this._tone('sine', f * 2.76, null, t, dur * 0.5, peak * 0.3, dest, 0.002);
  }
  /** chord of pentatonic degrees in the current key */
  _chime(degs, t, gap, dur, peak, dest, oct = 0, type = 'bell') {
    degs.forEach((d, i) => {
      const f = this._deg(d, oct);
      if (type === 'bell') this._bell(f, t + i * gap, dur, peak, dest);
      else this._tone(type, f, null, t + i * gap, dur, peak, dest, 0.004);
    });
  }

  // ================= music instruments =================
  _note(tone, midi, t, dur, dest, vel = 1, vib = false) {
    const f = mtof(midi);
    if (tone === 'bell') { this._bell(f, t, Math.max(0.45, dur * 2), 0.16 * vel, dest); return; }
    if (tone === 'musicbox') {
      this._tone('sine', f, null, t, Math.max(0.6, dur * 2.5), 0.2 * vel, dest, 0.002);
      this._tone('sine', f * 4, null, t, 0.25, 0.045 * vel, dest, 0.001);
      return;
    }
    const peak = (tone === 'tri' || tone === 'sine' ? 0.22 : tone === 'pulse' ? 0.12 : 0.1) * vel;
    const o = this._osc(tone, f, t, t + dur + 0.25);
    o.connect(this._env(t, 0.005, peak, Math.max(0, dur - 0.03), 0.08, dest));
    if (vib && dur > 0.25) this._vibrato(o, f, t + 0.15, t + dur + 0.2);
  }

  _vibrato(o, f, t, stop) {
    const l = this._osc('sine', 5.5, t, stop);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(f * 0.0087, t + 0.12);      // ±15 cents
    l.connect(g); g.connect(o.frequency);
  }

  _leadNote(tone, midi, t, dur, dest, vel, song) {
    const f = mtof(midi);
    vel *= TUNE.music.leadGain;
    if (tone === 'bell' || tone === 'musicbox') { this._note(tone, midi, t, dur, dest, vel * 1.1); return; }
    const o = this._osc(tone, f, t, t + dur + 0.25);
    // 30 ms glide from the previous note when legato
    if (song && song.leadPrevEnd != null && t - song.leadPrevEnd < 0.03 && song.leadPrevF) {
      o.frequency.setValueAtTime(song.leadPrevF, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    }
    let src = o;
    if (tone === 'saw' || tone === 'square') {
      const lp = this._filter('lowpass', tone === 'saw' ? 2600 : 3400, 1.2);
      o.connect(lp); src = lp;
    }
    const peak = (tone === 'tri' ? 0.24 : tone === 'pulse' ? 0.13 : 0.105) * vel;
    src.connect(this._env(t, 0.006, peak, Math.max(0, dur - 0.03), 0.09, dest));
    if (dur > 0.25) this._vibrato(o, f, t + 0.15, t + dur + 0.2);
    if (song) { song.leadPrevEnd = t + dur; song.leadPrevF = f; }
  }

  _bassNote(midi, t, dur, dest, vel = 1) {
    const f = mtof(midi);
    const cut = 300 + 1300 * this._i;
    const lp = this._filter('lowpass', cut * 2.5, 6);
    lp.frequency.setValueAtTime(cut * 2.5, t);
    lp.frequency.exponentialRampToValueAtTime(cut, t + Math.min(0.15, dur));
    const env = this._env(t, 0.004, 0.15 * vel, Math.max(0, dur - 0.02), 0.05, dest);
    lp.connect(env);
    const n = this.low ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const o = this._osc('sawtooth', f, t, t + dur + 0.15);
      o.detune.value = n === 1 ? 0 : (i ? 7 : -7);
      o.connect(lp);
    }
    const sub = this._osc('sine', f, t, t + dur + 0.15);
    sub.connect(env);
  }

  _kick(t, dest, vel = 1) {
    const o = this._osc('sine', 160, t, t + 0.45);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    o.connect(this._env(t, 0.002, 0.85 * vel, 0, 0.35, dest));
    const c = this._osc('square', 1800, t, t + 0.012);
    c.connect(this._env(t, 0.0005, 0.08 * vel, 0, 0.005, dest));
    const b = this._osc('triangle', 330, t, t + 0.07);                     // beater "tok": the kick's pulse on phone speakers
    b.frequency.exponentialRampToValueAtTime(110, t + 0.04);
    b.connect(this._env(t, 0.001, 0.13 * vel, 0, 0.035, dest));
  }
  _snare(t, dest, vel = 1) {
    this._nz(t, 0.14, 0.32 * vel, dest, 'bandpass', 1800, null, 0.8, 0.001);
    this._tone('triangle', 190, 160, t, 0.08, 0.22 * vel, dest, 0.001);
  }
  _hat(t, dest, vel = 0.5, open = false) {
    this._nz(t, open ? 0.15 : 0.035, 0.16 * vel, dest, 'highpass', 7000, null, 0.7, 0.001);
  }
  _clap(t, dest, vel = 0.5) {
    const s = this._noise(t, t + 0.25);
    const f = this._filter('bandpass', 1200, 1.2);
    const g = this.ctx.createGain();
    const p = g.gain, pk = 0.3 * vel;
    p.setValueAtTime(0, t);
    for (let i = 0; i < 3; i++) { p.setValueAtTime(pk, t + i * 0.011); p.setTargetAtTime(0.02, t + i * 0.011 + 0.001, 0.003); }
    p.setValueAtTime(pk * 0.8, t + 0.034); p.setTargetAtTime(0, t + 0.035, 0.03);
    s.connect(f); f.connect(g); g.connect(dest);
  }
  _tom(t, dest, f = 180) { this._tone('sine', f, f * 0.55, t, 0.2, 0.45, dest, 0.002, 0.15); }
  _crash(t, dest, vel = 0.5) {
    this._nz(t, 1.1, 0.11 * vel, dest, 'highpass', 5200, null, 0.5, 0.002);
    this._nz(t, 0.5, 0.06 * vel, dest, 'bandpass', 9000, null, 1.5, 0.002);
  }
  _stab(voicing, t, dur, dest) {
    const n = this.low ? 1 : 2;
    const lp = this._filter('lowpass', 3200, 0.8);
    lp.connect(this._env(t, 0.004, 0.06, dur, 0.07, dest));
    for (const m of voicing) for (let i = 0; i < n; i++) {
      const o = this._osc('sawtooth', mtof(m + 12), t, t + dur + 0.12);
      o.detune.value = n === 1 ? 0 : (i ? 20 : -20);
      o.connect(lp);
    }
  }
  _heartbeat(t, dest) {
    this._tone('sine', 62, 42, t, 0.14, 0.55, dest, 0.004);
    this._tone('sine', 58, 40, t + 0.17, 0.12, 0.38, dest, 0.004);
  }
  _snareRoll(t, dur, dest, vel = 0.6, n = 10) {
    for (let i = 0; i < n; i++) {
      const u = i / n;
      this._snare(t + dur * (1 - Math.pow(1 - u, 1.7)), dest, vel * (0.35 + 0.65 * u));
    }
  }
}

// ============ SFX recipes ============
// recipe(A, t, opts, out) → duration (s). `out` is the voice's gain (pan + distance applied).
// Melodic sounds use A._deg(degree, octave) so they always sit in the current song's key.
const NOVA_KIND = { blu: 'bigbang', mochi: 'mega', zap: 'storm', stella: 'blackhole' };
const rnd = (a, b) => a + Math.random() * (b - a);

/** "aah" choir: detuned saws through two vowel formants */
function choir(A, t, dur, out, degs = [0, 2, 3], oct = -1, peak = 0.05) {
  const f1 = A._filter('bandpass', 800, 1.5), f2 = A._filter('bandpass', 1250, 2);
  const env = A._env(t, 0.25, peak, Math.max(0, dur - 0.7), 0.45, out);
  f1.connect(env); f2.connect(env);
  const n = A.low ? 1 : 2;
  for (const d of degs) for (let i = 0; i < n; i++) {
    const o = A._osc('sawtooth', A._deg(d, oct), t, t + dur + 0.3);
    o.detune.value = n === 1 ? 0 : (i ? 9 : -9);
    o.connect(f1); o.connect(f2);
  }
}
/** saw chord through a lowpass sweeping open — the nova/fever riser */
function riser(A, t, dur, out, oct = -1, peak = 0.07) {
  const lp = A._filter('lowpass', 200, 3);
  lp.frequency.setValueAtTime(200, t);
  lp.frequency.exponentialRampToValueAtTime(5000, t + dur);
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur);
  g.gain.setTargetAtTime(0, t + dur, 0.02);
  lp.connect(g); g.connect(out);
  for (const d of [0, 2, 3]) {
    const o = A._osc('sawtooth', A._deg(d, oct), t, t + dur + 0.15);
    o.connect(lp);
  }
}
function boom(A, t, out, f = 50, dur = 0.8, peak = 0.6) {
  A._tone('sine', f * 1.8, f, t, dur, peak, out, 0.004, 0.12);
  A._nz(t, dur * 0.6, peak * 0.55, out, 'lowpass', 1400, 200, 0.7, 0.003);
}
function crack(A, t, out, peak = 0.3) {
  A._nz(t, 0.07, peak, out, 'bandpass', 3200, null, 0.8, 0.001);          // band-limited: repeated bolts don't fizz
  const z = A._osc('square', 2200, t, t + 0.1); z.frequency.exponentialRampToValueAtTime(300, t + 0.08);
  z.connect(A._env(t, 0.001, peak * 0.25, 0, 0.07, out));
}

const SFX = {
  // ---------- hero movement ----------
  dash(A, t, o, out) {
    const heavy = o.heroId === 'mochi' || o.kind === 'bash';
    A._nz(t, 0.14, 0.34, out, 'bandpass', heavy ? 500 : 800, heavy ? 1800 : 3000, 1.4, 0.01);
    A._tone('sine', heavy ? 160 : 220, heavy ? 320 : 440, t, 0.12, 0.16, out, 0.01);
    A._tone('sine', 62, 45, t, 0.07, 0.35, out, 0.002);
    return 0.22;
  },
  blink(A, t, o, out) {
    const c = A._osc('square', 1400, t, t + 0.2);
    c.frequency.exponentialRampToValueAtTime(300 * A._pm, t + 0.12);
    const m = A._osc('sine', 90, t, t + 0.2), mg = A.ctx.createGain(); mg.gain.value = 600;
    m.connect(mg); mg.connect(c.frequency);
    const lp = A._filter('lowpass', 3500, 0.7); c.connect(lp);
    lp.connect(A._env(t, 0.002, 0.08, 0, 0.12, out));
    A._nz(t, 0.08, 0.2, out, 'highpass', 4000, null, 0.7);
    A._tone('sine', A._deg(7, 1), null, t + 0.06, 0.14, 0.07, out);
    return 0.3;
  },
  perfect(A, t, o, out) {
    A._nz(t, 0.22, 0.22, out, 'highpass', 2000, 10000, 0.8, 0.01);          // shwing
    const r = leadRoot(A._keyPc()) + 12;
    [0, 4, 7, 11, 14, 24].forEach((iv, i) => A._bell(mtof(r + iv), t + 0.02 + i * 0.022, 1.2, i === 5 ? 0.06 : 0.085, out));
    return 1.5;
  },
  nearMiss(A, t, o, out) {
    const N = A._near;
    N.idx = t - N.t < 1.5 ? Math.min(N.idx + 1, 12) : 0; N.t = t;
    A._nz(t, 0.16, 0.2, out, 'bandpass', 2600, 700, 2, 0.02);
    A._tone('triangle', 1568 * Math.pow(2, N.idx / 12), null, t + 0.02, 0.04, 0.11, out, 0.001);
    return 0.22;
  },
  hurt(A, t, o, out) {
    A._tone('triangle', 440, 220, t, 0.14, 0.3, out, 0.004, 0.12);
    A._tone('square', 110, 90, t, 0.15, 0.07, out, 0.004);
    A._nz(t, 0.08, 0.1, out, 'lowpass', 900, null, 0.7);
    A._tone('sine', A._deg(7, 1), A._deg(5, 1), t + 0.05, 0.1, 0.05, out);
    return 0.32;
  },
  heal(A, t, o, out) {
    A._chime([0, 2, 4, 7], t, 0.06, 0.4, 0.09, out, 0, 'bell');
    A._nz(t, 0.3, 0.04, out, 'highpass', 6000, null, 0.5, 0.05);
    return 0.8;
  },
  shield(A, t, o, out) { A._bell(A._deg(5, 1), t, 0.5, 0.13, out); A._tone('sine', 400, 1400, t, 0.06, 0.18, out, 0.002); return 0.6; },
  shieldReady(A, t, o, out) { A._tone('sine', 300, 900, t, 0.12, 0.1, out, 0.01); A._bell(A._deg(7, 0), t + 0.08, 0.4, 0.06, out); return 0.5; },
  wheeze(A, t, o, out) {
    const s = A._osc('sawtooth', 300, t, t + 0.5);
    s.frequency.exponentialRampToValueAtTime(80 * A._pm, t + 0.4);
    const lp = A._filter('lowpass', 900, 1); s.connect(lp);
    lp.connect(A._env(t, 0.01, 0.12, 0.1, 0.3, out));
    A._nz(t, 0.6, 0.09, out, 'highpass', 3000, 1500, 0.7, 0.05);
    return 0.75;
  },
  puff(A, t, o, out) { A._nz(t, 0.18, 0.2, out, 'bandpass', 1100, 450, 1, 0.01); A._tone('triangle', 330, 200, t, 0.1, 0.08, out); return 0.25; },
  ready(A, t, o, out) { A._bell(A._deg(5, 1), t, 0.35, 0.08, out); return 0.4; },
  cue(A, t, o, out) { A._bell(A._deg(9, 1), t, 0.25, 0.045, out); return 0.3; },
  death(A, t, o, out) {
    for (let i = 0; i < 3; i++) A._tone('sine', 1800, 2400, t + i * 0.12, 0.08, 0.05, out, 0.005);
    A._tone('triangle', 500, 200, t, 0.5, 0.14, out, 0.01);
    return 0.7;
  },
  freeze(A, t, o, out) {
    A._tone('sine', 900, 250, t, 0.5, 0.14, out, 0.01);
    A._nz(t, 0.8, 0.07, out, 'bandpass', 3000, 600, 3, 0.05);
    A._chime([0, 2, 4], t + 0.3, 0.12, 0.8, 0.07, out, 0, 'bell');
    return 1.4;
  },
  revive(A, t, o, out) {
    const s = A._osc('sawtooth', 200, t, t + 0.5);
    s.frequency.exponentialRampToValueAtTime(800 * A._pm, t + 0.4);
    const lp = A._filter('lowpass', 400, 4);
    lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(5000, t + 0.4);
    s.connect(lp); lp.connect(A._env(t, 0.02, 0.09, 0.35, 0.1, out));
    A._chime([0, 2, 3, 5], t + 0.4, 0.05, 0.9, 0.08, out, 0, 'bell');
    return 1.4;
  },
  levelup(A, t, o, out) {
    [0, 1, 2, 3, 5].forEach((d, i) => A._tone('square', A._deg(d, 0), null, t + i * 0.07, 0.1, 0.055, out, 0.003));
    A._chime([5, 7, 8, 10], t + 0.35, 0, 1.0, 0.06, out, 0, 'bell');
    A._crash(t + 0.35, out, 0.5);
    return 1.4;
  },
  cardReveal(A, t, o, out) { A._snareRoll(t, 0.55, out, 0.3, 12); A._nz(t, 0.6, 0.04, out, 'highpass', 3000, 9000, 0.7, 0.4); return 0.8; },
  card(A, t, o, out) {
    const evo = DATA.evolutions?.some?.((e) => e.id === o.id);
    const r = evo ? 'legend' : (o.rarity || 'common');
    const n = r === 'rare' ? 2 : r === 'epic' ? 3 : r === 'legend' ? 6 : 1;
    A._chime([3, 5, 7, 8, 10, 12].slice(0, n), t, r === 'legend' ? 0.06 : 0.09, 0.7, 0.1, out, 0, 'bell');
    if (r === 'epic' || r === 'legend') A._nz(t + 0.2, 0.5, 0.05, out, 'highpass', 7000, null, 0.5, 0.05);
    if (r === 'legend') { choir(A, t + 0.1, 1.6, out, [0, 2, 3], 0, 0.045); A._crash(t, out, 0.5); }
    return r === 'legend' ? 2 : 1.1;
  },
  setBonus(A, t, o, out) { A._chime([0, 2, 3, 5], t, 0, 1.0, 0.07, out, 0, 'bell'); A._crash(t, out, 0.4); return 1.2; },
  miniNova(A, t, o, out) { boom(A, t, out, 70, 0.35, 0.3); A._bell(A._deg(5, 0), t, 0.5, 0.07, out); return 0.6; },
  well(A, t, o, out) {
    A._tone('sine', 700, 180, t, 0.35, 0.12, out, 0.01);
    A._tone('triangle', 90, 70, t, 1.2, 0.08, out, 0.05);
    A._nz(t, 0.5, 0.05, out, 'bandpass', 2500, 400, 3, 0.05);
    return 1.3;
  },
  zap(A, t, o, out) {
    for (let i = 0; i < 4; i++) A._nz(t + i * 0.045, 0.03, 0.18, out, 'bandpass', 4500, null, 1.1, 0.001);
    A._tone('square', 2000, 400, t, 0.2, 0.05, out, 0.002);
    return 0.3;
  },
  bolt(A, t, o, out) {
    crack(A, t, out, 0.28);
    A._nz(t + 0.02, 0.4, 0.12, out, 'lowpass', 500, 120, 0.7, 0.01);
    return 0.5;
  },
  stomp(A, t, o, out) {
    A._tone('sine', 90, 40, t, 0.25, 0.4, out, 0.003);
    A._tone('triangle', 210, 80, t, 0.12, 0.2, out, 0.002, 0.1);           // mid "thud" that phone speakers can play
    A._nz(t, 0.2, 0.18, out, 'lowpass', 600, null, 0.7);
    A._nz(t, 0.05, 0.1, out, 'bandpass', 1100, null, 1, 0.001);
    return 0.35;
  },
  implode(A, t, o, out) {
    const f = A._nz(t, 0.35, 0.001, out, 'bandpass', 400, 3000, 2, 0.001);
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.32); g.gain.setTargetAtTime(0, t + 0.33, 0.01);
    f.connect(g); g.connect(out);
    boom(A, t + 0.33, out, 60, 0.4, 0.35);
    A._chime([5, 7, 9], t + 0.35, 0.03, 0.6, 0.06, out, 0, 'bell');
    return 1.0;
  },
  bump(A, t, o, out) { A._tone('triangle', 200, 420, t, 0.18, 0.2, out, 0.003, 0.08); return 0.25; },
  clang(A, t, o, out) {
    const f = rnd(480, 560);
    [1, 2.76, 5.4, 8.9].forEach((m, i) => A._tone('sine', f * m, null, t, 0.45 / (1 + i * 0.6), 0.1 / (1 + i), out, 0.001));
    A._nz(t, 0.05, 0.15, out, 'highpass', 4000, null, 0.7, 0.001);
    return 0.5;
  },
  // ---------- nova ----------
  motif(A, t, o, out) {
    const m = HERO_MOTIF[o.hero] || HERO_MOTIF.blu;
    m.degs.forEach((d, i) => {
      const f = A._deg(d, m.oct), tt = t + i * m.step, len = i === 2 ? 0.35 : m.step * 0.9;
      if (m.tone === 'bell') A._bell(f, tt, 0.7, 0.12, out);
      else A._tone(m.tone, f, null, tt, len, m.tone === 'tri' ? 0.22 : 0.09, out, 0.004);
    });
    return 0.9;
  },
  novaReady(A, t, o, out) {
    SFX.motif(A, t, o, out);
    A._nz(t, 0.6, 0.04, out, 'highpass', 7000, null, 0.5, 0.1);
    return 1.0;
  },
  nova(A, t, o, out) {
    const kind = ['bigbang', 'mega', 'storm', 'blackhole'].includes(o.kind) ? o.kind : (NOVA_KIND[o.heroId] || 'bigbang');
    const T = t + 0.45;
    if (kind === 'blackhole') {
      const f = A._nz(t, 0.45, 0.001, out, 'bandpass', 3000, 300, 2.5, 0.001);
      const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.43); g.gain.setTargetAtTime(0, T, 0.02);
      f.connect(g); g.connect(out);
      A._tone('sine', 55, 40, t, 1.4, 0.2, out, 0.2);
    } else riser(A, t, 0.45, out, kind === 'mega' ? -2 : -1);
    if (kind === 'mega') A._tone('triangle', 100, 400, t + 0.1, 0.4, 0.18, out, 0.01, 0.35);
    boom(A, T, out, kind === 'mega' ? 40 : 50, 0.8, kind === 'storm' ? 0.4 : 0.6);
    if (kind === 'storm') { crack(A, T, out, 0.3); crack(A, T + 0.22, out, 0.22); crack(A, T + 0.5, out, 0.18); }
    A._crash(T, out, 0.8);
    choir(A, T + 0.05, 1.5, out, [0, 2, 3], kind === 'storm' ? 0 : -1, 0.05);
    A._chime([5, 7, 8], T + 0.1, 0.05, 1.0, 0.05, out, 0, 'bell');
    return 2.2;
  },
  // ---------- combo / pickups ----------
  milestone(A, t, o, out) {
    const c = num(o.count, 5);
    const n = c >= 100 ? 7 : c >= 50 ? 6 : c >= 25 ? 5 : c >= 10 ? 4 : 3;
    for (let i = 0; i < n; i++) A._tone('square', A._deg(3 + i, 0), null, t + i * 0.055, 0.08, 0.05, out, 0.002);
    A._bell(A._deg(3 + n, 0), t + n * 0.055, 0.8, 0.08, out);
    A._crash(t + n * 0.055, out, 0.4); A._clap(t + n * 0.055, out, 0.4);
    return n * 0.055 + 0.9;
  },
  womp(A, t, o, out) {                                                     // soft "wah-womp" (a friendly combo-break)
    const s = A._osc('sawtooth', 330, t, t + 0.4); s.frequency.exponentialRampToValueAtTime(170 * A._pm, t + 0.3);
    const lp = A._filter('lowpass', 1400, 3); lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(350, t + 0.3);
    s.connect(lp); lp.connect(A._env(t, 0.015, 0.07, 0.1, 0.15, out));
    A._tone('triangle', 220, 140, t, 0.25, 0.08, out, 0.01);
    return 0.4;
  },
  crystal(A, t, o, out) {
    const C = A._crys;
    C.idx = t - C.t < TUNE.crystalLadder.reset ? Math.min(C.idx + 1, TUNE.crystalLadder.max) : 0; C.t = t;
    A._tone('sine', A._deg(7 + C.idx, 0), null, t, 0.1, 0.09, out, 0.002);
    A._tone('sine', A._deg(8 + C.idx, 0), null, t + 0.02, 0.14, 0.07, out, 0.002);
    return 0.2;
  },
  heartPickup(A, t, o, out) {
    A._tone('triangle', A._deg(0, 0), null, t, 0.12, 0.2, out, 0.004);
    A._tone('triangle', A._deg(2, 0), null, t + 0.1, 0.25, 0.2, out, 0.004);
    A._bell(A._deg(7, 1), t + 0.12, 0.4, 0.04, out);
    return 0.5;
  },
  coin(A, t, o, out) {
    A._tone('square', A._deg(3, 1), null, t, 0.06, 0.05, out, 0.001);
    const o2 = A._osc('square', A._deg(5, 1), t + 0.06, t + 0.4);
    o2.connect(A._env(t + 0.06, 0.001, 0.05, 0.05, 0.25, out));
    return 0.45;
  },
  coinTick(A, t, o, out) { A._tone('square', A._deg(5, 1), null, t, 0.05, 0.03, out, 0.001); return 0.1; },
  magnet(A, t, o, out) { A._nz(t, 0.4, 0.12, out, 'bandpass', 500, 4000, 1.5, 0.05); A._chime([5, 6, 7, 8, 9], t + 0.15, 0.04, 0.3, 0.05, out, 0, 'bell'); return 0.7; },
  // ---------- enemies ----------
  portal(A, t, o, out) {
    const dur = clamp(num(o.delay, 0) || DATA.TUNE?.spawn?.portalTime || 1.1, 0.3, 3);
    const c = A._osc('sine', 200, t, t + dur + 0.1);
    c.frequency.exponentialRampToValueAtTime(800 * A._pm, t + dur);
    const m = A._osc('sine', 100, t, t + dur + 0.1);
    m.frequency.exponentialRampToValueAtTime(400, t + dur);
    const mg = A.ctx.createGain(); mg.gain.setValueAtTime(500, t); mg.gain.exponentialRampToValueAtTime(2000, t + dur);
    m.connect(mg); mg.connect(c.frequency);
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.9); g.gain.setTargetAtTime(0, t + dur, 0.02);
    c.connect(g); g.connect(out);
    A._tone('sine', 300, 700, t + dur, 0.06, 0.08, out, 0.002);
    return dur + 0.15;
  },
  land(A, t, o, out) { const s = clamp(num(o.size, 1), 0.5, 2); A._tone('sine', 180 / s, 90 / s, t, 0.08, 0.1 * s, out, 0.002); return 0.12; },
  bonk(A, t, o, out) {
    const s = num(o.strength, -1);
    const k = s < 0 ? 1 : s <= 1 ? 0.6 + 0.4 * s : clamp(0.6 + s / 20, 0.6, 1.2);
    A._pm *= rnd(0.94, 1.06);
    const wb = A._osc('square', 1200, t, t + 0.04);
    const bp = A._filter('bandpass', 1200, 4); wb.connect(bp); bp.connect(A._env(t, 0.001, 0.35 * k, 0, 0.015, out));
    A._tone('triangle', 880, 616, t, 0.15, 0.13 * k, out, 0.001);
    A._tone('triangle', 1320, 924, t, 0.15, 0.09 * k, out, 0.001);
    const bo = A._osc('square', 300, t + 0.01, t + 0.2);
    bo.frequency.exponentialRampToValueAtTime(150 * A._pm, t + 0.13);
    const lp = A._filter('lowpass', 1400, 1); bo.connect(lp); lp.connect(A._env(t + 0.01, 0.002, 0.08 * k, 0, 0.12, out));
    return 0.25;
  },
  knock(A, t, o, out) {                                                    // billiard "boing" (square 300→150)
    const bo = A._osc('square', 300, t, t + 0.18);
    bo.frequency.exponentialRampToValueAtTime(150 * A._pm, t + 0.12);
    const lp = A._filter('lowpass', 1800, 2); bo.connect(lp); lp.connect(A._env(t, 0.002, 0.1, 0, 0.12, out));
    A._tone('triangle', 600, 290, t, 0.1, 0.1, out, 0.002, 0.08);          // the spring you hear on a phone
    A._nz(t, 0.025, 0.1, out, 'bandpass', 1500, null, 1.2, 0.001);        // cue-ball contact tick
    A._tone('sine', 110, 60, t, 0.08, 0.25, out, 0.002);
    return 0.2;
  },
  dizzy(A, t, o, out) { A._tone('sine', 2000, 2600, t, 0.05, 0.035, out, 0.004); A._tone('sine', 2300, 3000, t + 0.07, 0.05, 0.03, out, 0.004); return 0.15; },
  wake(A, t, o, out) { const s = A._osc('sawtooth', 140, t, t + 0.2); s.frequency.linearRampToValueAtTime(110, t + 0.15); const b = A._filter('bandpass', 700, 2); s.connect(b); b.connect(A._env(t, 0.01, 0.1, 0.05, 0.08, out)); return 0.2; },
  windup(A, t, o, out) {
    const E = DATA.enemies || {};
    const type = o.type;
    if (type === 'popper') {
      const fuse = clamp(num(o.fuse, num(o.time, E.popper?.fuse ?? 2)), 0.4, 4);
      [0, 0.4, 0.68, 0.84, 0.93].forEach((u, i) => A._tone('square', 1320 * Math.pow(2, i / 24), null, t + u * fuse, 0.05, 0.05, out, 0.001));
      return fuse + 0.1;
    }
    if (type === 'beamer') {
      const dur = clamp(num(o.time, E.beamer?.telegraph ?? 1.2), 0.3, 3);
      const s = A._osc('sawtooth', 600, t, t + dur + 0.1);
      s.frequency.exponentialRampToValueAtTime(1100 * A._pm, t + dur);
      A._vibrato(s, 880, t, t + dur);
      const lp = A._filter('lowpass', 2500, 2); s.connect(lp);
      const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + dur); g.gain.setTargetAtTime(0, t + dur, 0.02);
      lp.connect(g); g.connect(out);
      A._nz(t, dur, 0.02, out, 'highpass', 6000, null, 0.5, dur * 0.8);
      A._tone('square', 1800, 900, t + dur, 0.12, 0.05, out, 0.002);    // zap
      return dur + 0.2;
    }
    const dur = clamp(num(o.time, (type === 'zippy' ? E.zippy?.windup : 0.6) ?? 0.8), 0.2, 3);
    const s = A._osc('square', 300, t, t + dur + 0.05);
    s.frequency.exponentialRampToValueAtTime(900 * A._pm, t + dur);
    const lp = A._filter('lowpass', 2000, 1); s.connect(lp);
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.004, t); g.gain.linearRampToValueAtTime(0.055, t + dur); g.gain.setTargetAtTime(0, t + dur, 0.015);
    lp.connect(g); g.connect(out);
    A._nz(t + dur, 0.25, 0.18, out, 'bandpass', 800, 3000, 1.5, 0.01);    // zoom
    return dur + 0.3;
  },
  smash(A, t, o, out) {
    // Pentatonic ladder: ONE step per smash chained within `ladder.reset` s, 2 octaves, then it sparkles
    // around the top. (payload.combo is the STYLE counter — 20+ mid-run — so it must not pick the step,
    // or every smash rings the top note.)
    const L = A._ladder, M = TUNE.ladder.max;
    L.n = t - L.t < TUNE.ladder.reset ? L.n + 1 : 0; L.t = t;
    L.idx = L.n <= M ? L.n : M - [1, 0, 2, 0][(L.n - M) % 4];
    const k = o.byNova ? 0.7 : 1;
    A._tone('sine', 600, 120, t, 0.08, 0.28 * k, out, 0.001);
    A._nz(t, 0.15, 0.12 * k, out, 'bandpass', 4200, null, 0.9, 0.001);          // glass (band-limited: no >8 kHz fizz)
    A._nz(t, 0.06, 0.22 * k, out, 'bandpass', 1200, 500, 1, 0.001);
    A._tone('triangle', A._deg(L.idx, 0), null, t + 0.01, 0.3, 0.15, out, 0.002);
    A._bell(A._deg(L.idx, L.idx < 5 ? 1 : 0), t + 0.01, 0.35, 0.045, out);       // sparkle octave only in the low half
    if (num(o.size, 1) >= 1.3) A._tone('sine', 90, 40, t, 0.15, 0.3, out, 0.002);
    return 0.45;
  },
  freed(A, t, o, out) { [0, 2, 3].forEach((d, i) => A._tone('square', A._deg(d, 1), null, t + 0.05 + i * 0.04, 0.04, 0.03, out, 0.002)); return 0.25; },
  coinBurst(A, t, o, out) {
    for (let i = 0; i < 8; i++) {
      const tt = t + i * 0.1 + Math.random() * 0.03;
      A._tone('square', A._deg([3, 5, 7, 8][i & 3], 1), null, tt, 0.07, 0.035, out, 0.001);
    }
    A._bell(A._deg(10, 0), t + 0.85, 0.6, 0.06, out);
    return 1.5;
  },
  explode(A, t, o, out) {
    A._nz(t, 0.4, 0.42, out, 'lowpass', 400, null, 0.7, 0.002);
    A._nz(t, 0.3, 0.2, out, 'bandpass', 1500, 280, 0.9, 0.002);             // mid crunch: the BOOM survives phone speakers
    A._tone('sine', 60, 40, t, 0.5, 0.42, out, 0.002);
    A._tone('sine', 300, 80, t, 0.1, 0.18, out, 0.001);
    A._tone('triangle', 240, 70, t, 0.2, 0.2, out, 0.001, 0.16);
    for (let i = 0; i < 4; i++) A._nz(t + 0.05 + i * 0.05 + Math.random() * 0.03, 0.03, 0.06, out, 'highpass', 2500, null, 0.7, 0.001);
    return 0.6;
  },
  split(A, t, o, out) {
    A._tone('sine', 500, 900, t, 0.05, 0.16, out, 0.002);
    A._tone('sine', 600, 1100, t + 0.07, 0.05, 0.16, out, 0.002);
    A._nz(t, 0.08, 0.08, out, 'bandpass', 1500, null, 1.5, 0.002);
    return 0.2;
  },
  shieldPop(A, t, o, out) { A._nz(t, 0.2, 0.15, out, 'highpass', 5000, null, 0.7, 0.001); A._chime([7, 9], t, 0.03, 0.4, 0.06, out, 0, 'bell'); return 0.5; },
  // ---------- boss ----------
  roar(A, t, o, out) {
    const lp = A._filter('lowpass', 700, 2);
    const am = A.ctx.createGain(); am.gain.value = 0.6;
    const lfo = A._osc('sine', 18, t, t + 1.4), lg = A.ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(am.gain);
    lp.connect(am); am.connect(A._env(t, 0.08, 0.2, 0.8, 0.4, out));
    for (const f of [55, 58, 82.5]) {
      const s = A._osc('sawtooth', f, t, t + 1.4);
      s.frequency.setValueAtTime(f, t); s.frequency.linearRampToValueAtTime(f * 1.25, t + 0.3); s.frequency.linearRampToValueAtTime(f * 0.85, t + 1.2);
      s.connect(lp);
    }
    A._nz(t, 1.0, 0.1, out, 'lowpass', 800, 300, 0.7, 0.05);
    return 1.5;
  },
  slam(A, t, o, out) {
    A._tone('sine', 40, 32, t, 0.6, 0.6, out, 0.003);
    A._nz(t, 0.5, 0.3, out, 'lowpass', 800, 150, 0.7, 0.002);
    A._nz(t, 0.3, 0.16, out, 'bandpass', 1000, 220, 0.9, 0.002);           // audible on small speakers
    A._tone('sine', 120, 50, t, 0.15, 0.35, out, 0.001);
    A._tone('triangle', 200, 65, t, 0.22, 0.22, out, 0.001, 0.18);
    return 0.8;
  },
  phase(A, t, o, out) {
    SFX.roar(A, t, o, out);
    const sq = A._osc('square', 200, t + 0.2, t + 0.9);
    for (let i = 0; i < 12; i++) sq.frequency.setValueAtTime((200 + i * 150 + Math.random() * 200) * A._pm, t + 0.2 + i * 0.05);
    const lp = A._filter('lowpass', 3000, 1); sq.connect(lp); lp.connect(A._env(t + 0.2, 0.01, 0.05, 0.5, 0.1, out));
    A._crash(t + 0.8, out, 0.7);
    return 1.6;
  },
  vulnerable(A, t, o, out) { A._chime([5, 7, 5, 7], t, 0.12, 0.3, 0.08, out, 0, 'bell'); A._tone('triangle', 300, 200, t, 0.5, 0.08, out, 0.02); return 0.9; },
  bossHit(A, t, o, out) {
    crack(A, t, out, 0.3);
    A._nz(t + 0.02, 0.3, 0.12, out, 'highpass', 5000, null, 0.7, 0.001);
    const done = clamp(num(o.maxHp, 5) - num(o.hp, 4), 0, 6) | 0;
    A._bell(A._deg(5 + done * 2, 0), t + 0.03, 0.8, 0.12, out);
    A._tone('sine', 100, 45, t, 0.2, 0.4, out, 0.002);
    return 0.9;
  },
  bossDefeat(A, t, o, out) {
    boom(A, t, out, 45, 1.2, 0.6);
    A._crash(t, out, 1);
    const g = A._osc('square', 200, t + 0.2, t + 1.3);
    g.frequency.exponentialRampToValueAtTime(2400 * A._pm, t + 1.2);
    const lp = A._filter('lowpass', 3000, 1); g.connect(lp); lp.connect(A._env(t + 0.2, 0.05, 0.04, 0.9, 0.1, out));
    choir(A, t + 0.3, 2.2, out, [0, 2, 3], -1, 0.06);
    A._chime([5, 7, 8, 10, 12], t + 1.2, 0.08, 1.2, 0.07, out, 0, 'bell');
    return 2.8;
  },
  // ---------- run flow ----------
  countdown(A, t, o, out) {
    if ((o.n | 0) > 0) {
      A._tone('square', A._deg(0, 0), null, t, 0.14, 0.1, out, 0.003);
      A._tone('triangle', A._deg(0, -1), null, t, 0.14, 0.2, out, 0.003);
      return 0.2;
    }
    A._tone('square', A._deg(5, 0), null, t, 0.4, 0.1, out, 0.003);
    A._chime([5, 7, 8], t, 0, 0.8, 0.06, out, 0, 'bell');
    A._crash(t, out, 0.7);
    A._kick(t, out, 0.8);
    return 0.9;
  },
  countIn(A, t, o, out) { A._snareRoll(t + 0.08, 0.6, out, 0.55, 10); A._tom(t, out, 200); A._tom(t + 0.36, out, 150); return 0.8; },
  wave(A, t, o, out) {
    if (o.isBoss) { A._tone('sine', 65, 55, t, 1.4, 0.35, out, 0.01); A._bell(A._deg(0, -1), t, 1.4, 0.1, out); return 1.5; }
    A._tone('square', A._deg(3, 0), null, t, 0.08, 0.07, out, 0.002);
    A._tone('square', A._deg(5, 0), null, t + 0.1, 0.3, 0.07, out, 0.002);
    A._crash(t + 0.1, out, 0.4);
    return 0.5;
  },
  waveClear(A, t, o, out) { A._chime([0, 2, 3, 5], t, 0.06, 0.5, 0.07, out, 0, 'bell'); return 0.8; },
  fever(A, t, o, out) {
    A._nz(t, 0.6, 0.001, out, 'bandpass', 400, 6000, 1.5, 0.001);
    riser(A, t, 0.6, out, -1, 0.06);
    A._crash(t + 0.6, out, 1);
    for (let i = 0; i < 8; i++) A._tone('pulse', A._deg(i, 0), null, t + 0.6 + i * 0.04, 0.07, 0.06, out, 0.002);
    choir(A, t + 0.6, 1.2, out, [0, 2, 3], 0, 0.04);
    return 2.0;
  },
  checkpoint(A, t, o, out) { [3, 5, 7].forEach((d, i) => A._tone('square', A._deg(d, 0), null, t + i * 0.09, 0.1, 0.06, out, 0.002)); A._bell(A._deg(10, 0), t + 0.27, 0.6, 0.06, out); return 0.9; },
  gate(A, t, o, out) {
    const c = A._osc('sine', 300, t, t + 1.2), m = A._osc('sine', 7, t, t + 1.2), mg = A.ctx.createGain(); mg.gain.value = 40;
    m.connect(mg); mg.connect(c.frequency);
    c.connect(A._env(t, 0.2, 0.08, 0.6, 0.3, out));
    A._chime([0, 2, 3, 5, 7], t + 0.1, 0.1, 1.0, 0.06, out, 0, 'bell');
    return 1.5;
  },
  // ---------- UI ----------
  click(A, t, o, out) { A._tone('sine', A._deg(7, 0), null, t, 0.05, 0.12, out, 0.001); A._tone('triangle', A._deg(7, 1), null, t, 0.02, 0.04, out, 0.001); return 0.08; },
  hover(A, t, o, out) { A._tone('sine', 1200, null, t, 0.012, 0.03, out, 0.001); return 0.03; },
  back(A, t, o, out) { A._tone('triangle', A._deg(5, 0), null, t, 0.05, 0.14, out, 0.002); A._tone('triangle', A._deg(3, 0), null, t + 0.06, 0.07, 0.14, out, 0.002); return 0.15; },
  claim(A, t, o, out) {
    [3, 5, 7].forEach((d, i) => A._tone('square', A._deg(d, 0), null, t + i * 0.06, 0.07, 0.06, out, 0.002));
    A._bell(A._deg(10, 0), t + 0.18, 0.6, 0.07, out);
    A._nz(t + 0.15, 0.4, 0.03, out, 'highpass', 7000, null, 0.5, 0.05);
    return 0.8;
  },
  buy(A, t, o, out) { SFX.coin(A, t, o, out); A._nz(t, 0.03, 0.12, out, 'bandpass', 3000, null, 2, 0.001); A._bell(A._deg(8, 0), t + 0.12, 0.4, 0.05, out); return 0.5; },
  error(A, t, o, out) {                                                    // gentle "bonk-bonk" — audible, never harsh
    A._tone('triangle', 440, 415, t, 0.08, 0.12, out, 0.003); A._tone('triangle', 392, 370, t + 0.1, 0.1, 0.12, out, 0.003);
    A._tone('square', 220, null, t, 0.06, 0.02, out, 0.003); A._tone('square', 196, null, t + 0.1, 0.08, 0.02, out, 0.003);
    return 0.25;
  },
  whoosh(A, t, o, out) { A._nz(t, 0.25, 0.12, out, 'bandpass', 400, 2400, 1.2, 0.04); return 0.3; },
  open(A, t, o, out) { return SFX.whoosh(A, t, o, out); },
  capsule(A, t, o, out) {
    for (let i = 0; i < 6; i++) {
      const tt = t + 0.7 * (1 - Math.pow(1 - i / 6, 1.5));
      A._nz(tt, 0.02, 0.15, out, 'bandpass', 3000, null, 2, 0.001);
      A._tone('square', 800, null, tt, 0.015, 0.03, out, 0.001);
    }
    A._tone('sine', 400, 1200, t + 0.8, 0.05, 0.18, out, 0.002);
    A._chime([0, 2, 3, 5, 7], t + 0.85, 0.05, 0.4, 0.05, out, 0, 'bell');
    return 1.3;
  },
  rankup(A, t, o, out) {
    [0, 2, 3, 5, 7, 8].forEach((d, i) => A._tone('square', A._deg(d, 0), null, t + i * 0.07, 0.09, 0.055, out, 0.002));
    A._chime([5, 7, 8, 10], t + 0.45, 0, 1.2, 0.06, out, 0, 'bell');
    A._crash(t + 0.45, out, 0.7);
    choir(A, t + 0.45, 1.3, out, [0, 2, 3], 0, 0.035);
    return 1.8;
  },
  unlock(A, t, o, out) {
    for (let i = 0; i < 8; i++) A._bell(A._deg(i, 0), t + i * 0.035, 0.4, 0.05, out);
    A._chime([5, 7, 8], t + 0.3, 0, 0.9, 0.06, out, 0, 'bell');
    return 1.2;
  },
  star(A, t, o, out) { A._tone('sine', 120, 60, t, 0.1, 0.3, out, 0.001); A._bell(A._deg(5, 0), t, 0.5, 0.1, out); A._bell(A._deg(7, 0), t + 0.05, 0.5, 0.07, out); return 0.6; },
  tick(A, t, o, out) { A._tone('sine', 2000, null, t, 0.012, 0.06, out, 0.0005); return 0.03; },
  pop(A, t, o, out) { A._tone('sine', 400, 1200, t, 0.04, 0.15, out, 0.001, 0.035); return 0.06; },
  notYet(A, t, o, out) {                                                   // soft "uh-uh" a step down, in key
    A._tone('triangle', A._deg(2, 0), A._deg(2, 0) * 0.98, t, 0.07, 0.1, out, 0.003);
    A._tone('triangle', A._deg(1, 0), A._deg(1, 0) * 0.97, t + 0.1, 0.1, 0.1, out, 0.003);
    return 0.25;
  },
  // ---------- Cube-ese babble ----------
  babble(A, t, o, out) {
    const V = VOICES[o.hero] || VOICES.blu;
    const md = MOODS[o.mood] || MOODS.happy;
    const n = clamp(o.n | 0 || Math.round(rnd(md.n[0], md.n[1] + 0.49)), 1, 8);
    const slow = md.slow || 1;
    let crush = null;
    if (V.crush) {
      crush = A.ctx.createWaveShaper();
      const c = new Float32Array(256);
      for (let i = 0; i < 256; i++) c[i] = Math.round(((i / 255) * 2 - 1) * 4) / 4;
      crush.curve = c;
    }
    const f1 = A._filter('bandpass', 800, 2.2), f2 = A._filter('bandpass', 1200, 3), dry = A._filter('lowpass', 2500, 0.7);
    const mix = A.ctx.createGain(); mix.gain.value = 1;
    f1.connect(mix); f2.connect(mix); dry.connect(mix);
    const wetGain = A.ctx.createGain(); wetGain.gain.value = 0.9;
    const dryGain = A.ctx.createGain(); dryGain.gain.value = 0.35;
    const src = crush || A.ctx.createGain();
    src.connect(wetGain); src.connect(dryGain);
    wetGain.connect(f1); wetGain.connect(f2); dryGain.connect(dry);
    mix.connect(out);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0;
      let semi = md.curve(u) + rnd(-2, 2);
      if (i === n - 1) semi += md.end;
      const f = V.f * Math.pow(2, semi / 12);
      const syl = V.syl * slow * rnd(0.8, 1.2);
      const os = A._osc(V.wave, f, tt, tt + syl + 0.06);
      os.frequency.exponentialRampToValueAtTime(f * A._pm * (i === n - 1 && md.end > 0 ? 1.12 : 0.94), tt + syl);
      if (V.vib) { const l = A._osc('sine', 9, tt, tt + syl + 0.06), lg = A.ctx.createGain(); lg.gain.value = f * (Math.pow(2, V.vib / 1200) - 1); l.connect(lg); lg.connect(os.frequency); }
      const v = VOWELS[(Math.random() * VOWELS.length) | 0];
      f1.frequency.setValueAtTime(v[0], tt); f2.frequency.setValueAtTime(v[1], tt);
      const peak = V.wave === 'square' || V.wave === 'sawtooth' ? 0.4 : 0.6;
      os.connect(A._env(tt, 0.008, peak, syl * 0.6, syl * 0.4, src));
      tt += syl + V.gap * slow;
    }
    return tt - t + 0.12;
  },
};
