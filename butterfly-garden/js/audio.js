/* The Butterfly Garden — the whole soundtrack (music + sound effects), synthesized with Web Audio.
   renderSoundtrack() renders it offline, so the player and the exported video use exactly the same sound. */
'use strict';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const BS = 0.5;                                   // seconds per beat (120 BPM)
const PENTA = [0, 2, 4, 7, 9];
const penta = (i, base = 72) => base + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5];

// "The Butterfly Garden" theme — [beat, midi, beats]
const THEME = [
  [0, 72, 1], [1, 76, 1], [2, 79, 1], [3, 76, 1],
  [4, 77, 1], [5, 81, 1], [6, 79, 2],
  [8, 76, 0.5], [8.5, 77, 0.5], [9, 79, 1], [10, 84, 1], [11, 79, 1],
  [12, 81, 1], [13, 79, 1], [14, 76, 2],
  [16, 77, 1], [17, 76, 1], [18, 74, 1], [19, 76, 1],
  [20, 77, 1], [21, 81, 1], [22, 79, 1], [23, 76, 1],
  [24, 74, 1], [25, 76, 0.5], [25.5, 77, 0.5], [26, 74, 1], [27, 67, 1],
  [28, 72, 3],
];
// chords — [beat, root midi, quality, beats]
const CHORDS = [
  [0, 48, 'maj', 4], [4, 53, 'maj', 2], [6, 48, 'maj', 2], [8, 48, 'maj', 2], [10, 45, 'min', 2],
  [12, 53, 'maj', 2], [14, 48, 'maj', 2], [16, 50, 'min', 4], [20, 53, 'maj', 2], [22, 48, 'maj', 2],
  [24, 43, 'dom7', 4], [28, 48, 'maj', 4],
];
const QUAL = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10] };

async function renderSoundtrack(sr = 48000) {
  const ac = new OfflineAudioContext(2, Math.ceil(sr * DUR), sr);
  buildSoundtrack(ac);
  const buf = await ac.startRendering();
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
  const k = peak > 0 ? 0.89 / peak : 1;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
  return buf;
}

function wavBase64(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, bytes = 44 + n * ch * 2;
  const ab = new ArrayBuffer(bytes), v = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true);
  v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  const u8 = new Uint8Array(ab); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}

function buildSoundtrack(ac) {
  const R = rng(2024), pick = a => a[Math.floor(R() * a.length)];
  const sr = ac.sampleRate;

  // ---------------------------------------------------------------- mixing desk
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.22;
  const master = ac.createGain(); master.gain.setValueAtTime(1, 0);
  master.gain.setValueAtTime(1, C.fadeOut); master.gain.linearRampToValueAtTime(0, C.END - 0.05);
  comp.connect(master); master.connect(ac.destination);
  const rev = ac.createConvolver(); rev.buffer = impulse(2.8);
  const revOut = ac.createGain(); revOut.gain.value = 0.55; rev.connect(revOut); revOut.connect(comp);
  const bus = (g, send) => { const n = ac.createGain(); n.gain.value = g; n.connect(comp); const s = ac.createGain(); s.gain.value = send; n.connect(s); s.connect(rev); return n; };
  const MUS = bus(0.5, 0.32), SFX = bus(0.8, 0.16), AMB = bus(0.55, 0.6);
  const NOISE = (() => { const b = ac.createBuffer(1, sr * 3, sr), d = b.getChannelData(0), r = rng(77); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b; })();

  function impulse(sec) {
    const n = Math.floor(sr * sec), b = ac.createBuffer(2, n, sr), r = rng(5);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * 0.6 + (r() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - i / n, 3.2) * (i < sr * 0.01 ? i / (sr * 0.01) : 1); } }
    return b;
  }
  // ---------------------------------------------------------------- building blocks
  const osc = (type, f, t0, t1) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); o.start(t0); o.stop(t1); return o; };
  const noise = (t0, t1) => { const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true; s.start(t0, R() * 2.5); s.stop(t1); return s; };
  const filt = (type, f, Q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; return b; };
  const panner = (p, dest) => { const s = ac.createStereoPanner(); s.pan.value = p; s.connect(dest); return s; };
  const ad = (t, peak, a, d, dest) => { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(dest); return g; };
  const asr = (t, peak, a, dur, r, dest) => {
    const g = ac.createGain(), h = Math.max(a, dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + h); g.gain.linearRampToValueAtTime(0, t + h + r);
    g.connect(dest); return g;
  };
  const vib = (o, t0, t1, rate, depth) => { const l = osc('sine', rate, t0, t1), g = ac.createGain(); g.gain.value = depth; l.connect(g).connect(o.frequency); };
  const softClip = k => { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; };

  // ---------------------------------------------------------------- instruments
  function mbox(t, m, v = 0.2, dest = MUS, p = 0) {      // music box / celesta
    const f = mtof(m), out = p ? panner(p, dest) : dest;
    for (const [r, a, d] of [[1, 1, 1.5], [2, 0.3, 0.5], [3.01, 0.1, 0.25], [4.2, 0.05, 0.12]]) osc('sine', f * r, t, t + d + 0.2).connect(ad(t, v * a, 0.003, d, out));
  }
  function glock(t, m, v = 0.15, dest = MUS, p = 0) {
    const f = mtof(m), out = p ? panner(p, dest) : dest;
    for (const [r, a, d] of [[1, 1, 1.1], [2.76, 0.28, 0.25], [5.4, 0.1, 0.08]]) osc('sine', f * r, t, t + d + 0.2).connect(ad(t, v * a, 0.002, d, out));
  }
  function pluck(t, m, v = 0.2, dest = MUS, d = 0.35) {
    const lp = filt('lowpass', 2600, 1); lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(420, t + 0.3);
    osc('triangle', mtof(m), t, t + d + 0.3).connect(lp).connect(ad(t, v, 0.004, d, dest));
  }
  function bass(t, m, dur, v = 0.3, dest = MUS) {
    const lp = filt('lowpass', 800), g = asr(t, v, 0.01, dur * 0.85, 0.08, dest); lp.connect(g);
    osc('sine', mtof(m), t, t + dur + 0.2).connect(lp); const tri = osc('triangle', mtof(m), t, t + dur + 0.2), tg = ac.createGain(); tg.gain.value = 0.5; tri.connect(tg).connect(lp);
  }
  function pad(t, ms, dur, v = 0.1, cutoff = 1500, dest = MUS, a = 0.6, r = 1.0) {
    const lp = filt('lowpass', cutoff, 0.5), g = asr(t, v / Math.sqrt(ms.length), a, dur, r, dest); lp.connect(g);
    for (const m of ms) for (const det of [-8, 8]) { const o = osc('sawtooth', mtof(m), t, t + dur + r + 0.1); o.detune.value = det; o.connect(lp); }
  }
  function brass(t, m, dur, v = 0.2, dest = MUS, bright = 1, vibr = 0) {
    const lp = filt('lowpass', 400, 1.6);
    lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(2700 * bright, t + 0.06); lp.frequency.setTargetAtTime(1500 * bright, t + 0.08, 0.2);
    const g = asr(t, v, 0.03, dur, 0.12, dest); lp.connect(g);
    for (const det of [-6, 6]) { const o = osc('sawtooth', mtof(m), t, t + dur + 0.3); o.detune.value = det; o.connect(lp); if (vibr) vib(o, t + 0.25, t + dur + 0.3, 5.5, vibr); }
  }
  function strings(t, m, dur, v = 0.12, trem = 0, dest = MUS, a = 0.3) {
    const lp = filt('lowpass', 2000, 0.6), g = asr(t, v, a, dur, 0.6, dest);
    if (trem) { const tg = ac.createGain(); tg.gain.value = 0.6; const l = osc('sine', trem, t, t + dur + 0.7), lg = ac.createGain(); lg.gain.value = 0.4; l.connect(lg).connect(tg.gain); lp.connect(tg).connect(g); } else lp.connect(g);
    for (const det of [-5, 5]) { const o = osc('sawtooth', mtof(m), t, t + dur + 0.7); o.detune.value = det; o.connect(lp); vib(o, t, t + dur + 0.7, 5.2, mtof(m) * 0.004); }
  }
  // drums
  function kick(t, v = 0.7, f0 = 150, dest = MUS) { const o = osc('sine', f0, t, t + 0.6); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); o.connect(ad(t, v, 0.002, 0.45, dest)); }
  function snare(t, v = 0.35, dest = MUS) {
    noise(t, t + 0.3).connect(filt('highpass', 1300)).connect(ad(t, v * 0.75, 0.001, 0.17, dest));
    osc('triangle', 190, t, t + 0.2).connect(ad(t, v * 0.5, 0.001, 0.08, dest));
  }
  function hat(t, v = 0.08, open = false, dest = MUS) { noise(t, t + 0.4).connect(filt('highpass', 7500)).connect(ad(t, v, 0.001, open ? 0.25 : 0.04, dest)); }
  function clap(t, v = 0.3, dest = MUS) { const bp = filt('bandpass', 1500, 1.1); for (const [dt, d] of [[0, 0.01], [0.011, 0.01], [0.022, 0.16]]) noise(t + dt, t + dt + 0.25).connect(bp); const g = ad(t, v, 0.001, 0.18, dest); bp.connect(g); }
  function crash(t, v = 0.25, dest = MUS) { noise(t, t + 2.6).connect(filt('highpass', 4200)).connect(ad(t, v, 0.002, 2.3, dest)); }
  function timp(t, m, v = 0.5, dest = MUS) {
    const o = osc('sine', mtof(m) * 1.04, t, t + 1.8); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.15); o.connect(ad(t, v, 0.004, 1.4, dest));
    noise(t, t + 0.2).connect(filt('lowpass', 500)).connect(ad(t, v * 0.5, 0.002, 0.12, dest));
  }
  function tom(t, f, v = 0.4, dest = MUS) { const o = osc('sine', f, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.3); o.connect(ad(t, v, 0.002, 0.32, dest)); }

  // ---------------------------------------------------------------- sound effects
  const sparkle = (t, base = 84, n = 6, v = 0.09, step = 0.045) => { for (let i = 0; i < n; i++) glock(t + i * step, penta(i + Math.floor(R() * 2), base), v * (1 - i / (n * 1.6)), SFX, (R() - 0.5) * 0.8); };
  function popSfx(t, m, v = 0.18, p = 0) {
    const f = mtof(m), out = panner(p, SFX), o = osc('sine', f * 0.5, t, t + 0.25);
    o.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.05); o.connect(ad(t, v, 0.002, 0.12, out));
    glock(t + 0.01, m + 12, v * 0.35, SFX, p);
  }
  function whoosh(t, dur, v, f0 = 300, f1 = 2400, p0 = 0, p1 = 0) {
    const bp = filt('bandpass', f0, 1.3); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(Math.max(f0 * 0.7, 80), t + dur);
    const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur); pn.connect(SFX);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(pn);
    noise(t, t + dur + 0.05).connect(bp).connect(g);
  }
  function riser(t, dur, v) {
    const hp = filt('highpass', 400, 0.8); hp.frequency.setValueAtTime(400, t); hp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.04); g.connect(SFX);
    noise(t, t + dur + 0.1).connect(hp).connect(g);
  }
  function stomp(t, v) {
    const o = osc('sine', 62, t, t + 1.2); o.frequency.exponentialRampToValueAtTime(32, t + 0.6); o.connect(ad(t, v, 0.004, 0.9, SFX));
    osc('sine', 110, t, t + 0.3).connect(ad(t, v * 0.5, 0.002, 0.12, SFX));
    noise(t, t + 0.8).connect(filt('lowpass', 260)).connect(ad(t, v * 0.9, 0.003, 0.5, SFX));
    for (let i = 0; i < 6; i++) { const tt = t + 0.05 + R() * 0.4; noise(tt, tt + 0.05).connect(filt('bandpass', 2500 + R() * 2500, 3)).connect(ad(tt, v * 0.06, 0.001, 0.03, SFX)); }
  }
  function thunder(t, v) {
    noise(t, t + 0.5).connect(filt('highpass', 900)).connect(ad(t, v * 0.6, 0.002, 0.3, SFX));
    for (let i = 0; i < 6; i++) { const tt = t + 0.05 + i * 0.32 + R() * 0.2; noise(tt, tt + 2.5).connect(filt('lowpass', 160 + R() * 120)).connect(ad(tt, v * (1 - i * 0.12), 0.06, 1.6, SFX)); }
  }
  function roar(t, dur, v) {
    const shaper = ac.createWaveShaper(); shaper.curve = softClip(2.6);
    const lp = filt('lowpass', 600, 2.2); lp.frequency.setValueAtTime(450, t); lp.frequency.linearRampToValueAtTime(1600, t + 0.3); lp.frequency.linearRampToValueAtTime(650, t + dur);
    const out = asr(t, v, 0.12, dur - 0.45, 0.5, SFX); shaper.connect(lp).connect(out);
    const growl = ac.createGain(); growl.gain.value = 0.6; growl.connect(shaper);
    const am = osc('square', 29, t, t + dur + 0.6), amg = ac.createGain(); amg.gain.value = 0.38; am.connect(amg).connect(growl.gain);
    for (const [f0, f1, a] of [[94, 64, 0.9], [141, 96, 0.55], [62, 44, 0.8], [188, 128, 0.25]]) {
      const o = osc('sawtooth', f0, t, t + dur + 0.6); o.frequency.linearRampToValueAtTime(f0 * 1.12, t + 0.35); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      vib(o, t, t + dur + 0.6, 6.5, f0 * 0.05); const g = ac.createGain(); g.gain.value = a; o.connect(g).connect(growl);
    }
    noise(t, t + dur + 0.6).connect(filt('bandpass', 650, 0.9)).connect(asr(t, v * 0.45, 0.08, dur - 0.5, 0.5, SFX));
  }
  function growlShort(t, v) { roar(t, 0.8, v); }
  function inhale(t, dur, v) {
    const bp = filt('bandpass', 400, 1.5); bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(1800, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05); g.connect(SFX);
    noise(t, t + dur + 0.1).connect(bp).connect(g);
  }
  function fireSfx(t, dur, v) {
    const lp = filt('lowpass', 1100, 0.7), l = osc('sine', 7, t, t + dur + 1), lg = ac.createGain(); lg.gain.value = 380; l.connect(lg).connect(lp.frequency);
    noise(t, t + dur + 1).connect(lp).connect(asr(t, v, 0.22, dur - 0.3, 0.6, SFX));
    noise(t, t + dur + 1).connect(filt('bandpass', 170, 0.8)).connect(asr(t, v * 1.6, 0.2, dur - 0.3, 0.6, SFX));
    for (let k = 0; k < dur * 24; k++) { const tt = t + R() * dur; noise(tt, tt + 0.03).connect(filt('highpass', 2500 + R() * 3500)).connect(ad(tt, v * (0.25 + R() * 0.45), 0.001, 0.02, SFX)); }
  }
  function sizzle(t, dur, v, fall = false) {
    const hp = filt('highpass', 3600, 0.7), g = asr(t, v, 0.15, dur - 0.3, fall ? 0.9 : 0.5, SFX);
    const tg = ac.createGain(); tg.gain.value = 0.65; const l = osc('sine', 17, t, t + dur + 1), lg = ac.createGain(); lg.gain.value = 0.35; l.connect(lg).connect(tg.gain);
    noise(t, t + dur + 1).connect(hp).connect(tg).connect(g);
    if (fall) { hp.frequency.setValueAtTime(3600, t); hp.frequency.exponentialRampToValueAtTime(900, t + dur); }
  }
  function iceChime(t, m, v = 0.16) {
    glock(t, m, v, SFX, (R() - 0.5) * 0.6); glock(t + 0.02, m + 7, v * 0.5, SFX);
    noise(t, t + 0.06).connect(filt('highpass', 4500)).connect(ad(t, v * 0.9, 0.001, 0.035, SFX));
  }
  function crackle(t, dur, v) {
    for (let k = 0; k < dur * 40; k++) { const tt = t + R() * dur; noise(tt, tt + 0.03).connect(filt('bandpass', 3000 + R() * 5000, 4)).connect(ad(tt, v * (0.3 + R() * 0.7), 0.001, 0.015, SFX)); }
    for (let k = 0; k < dur * 10; k++) glock(t + R() * dur, penta(Math.floor(R() * 10), 91), v * 0.25, SFX, (R() - 0.5));
  }
  function siren(t0, t1, v) {
    const lp = filt('lowpass', 2400, 0.8), g = ac.createGain(), pn = ac.createStereoPanner();
    pn.pan.setValueAtTime(-0.9, t0); pn.pan.linearRampToValueAtTime(0.1, C.carB); pn.connect(SFX);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v * 0.35, t0 + 0.3); g.gain.linearRampToValueAtTime(v, C.carB);
    g.gain.linearRampToValueAtTime(v * 0.55, C.count[0]); g.gain.linearRampToValueAtTime(v * 0.25, t1 - 0.4); g.gain.linearRampToValueAtTime(0, t1);
    lp.connect(g).connect(pn);
    const o1 = osc('triangle', 880, t0, t1 + 0.1), o2 = osc('square', 880, t0, t1 + 0.1), g2 = ac.createGain(); g2.gain.value = 0.25;
    o1.connect(lp); o2.connect(g2).connect(lp);
    let i = 0;
    for (let tt = t0; tt < t1; tt += 0.42, i++) {
      const f = i % 2 ? 660 : 880, doppler = tt < C.carB ? 1 + 0.03 * (1 - (tt - t0) / (C.carB - t0)) : 1;
      for (const o of [o1, o2]) { o.frequency.setValueAtTime(f * doppler, tt); }
    }
  }
  function vroom(t, dur, v) {
    const lp = filt('lowpass', 500, 2), o = osc('sawtooth', 55, t, t + dur + 0.3);
    o.frequency.linearRampToValueAtTime(130, t + dur * 0.5); o.frequency.linearRampToValueAtTime(70, t + dur);
    vib(o, t, t + dur + 0.3, 22, 6); o.connect(lp).connect(asr(t, v, 0.2, dur - 0.3, 0.3, panner(-0.4, SFX)));
    whoosh(t + dur * 0.3, dur * 0.7, v * 0.8, 300, 1600, -0.7, 0.2);
  }
  function skid(t, dur, v) {
    noise(t, t + dur + 0.1).connect(filt('bandpass', 2300, 7)).connect(ad(t, v, 0.02, dur, SFX));
    const o = osc('sawtooth', 920, t, t + dur + 0.1); o.frequency.linearRampToValueAtTime(760, t + dur); o.connect(filt('bandpass', 1800, 9)).connect(ad(t, v * 0.25, 0.02, dur, SFX));
  }
  function boing(t, v = 0.25, f = 180) {
    const o = osc('sine', f, t, t + 0.8); o.frequency.linearRampToValueAtTime(f * 1.9, t + 0.5);
    const l = osc('sine', 13, t, t + 0.8), lg = ac.createGain(); lg.gain.setValueAtTime(f * 0.35, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.6); l.connect(lg).connect(o.frequency);
    o.connect(ad(t, v, 0.005, 0.55, SFX));
  }
  function tick(t, f = 1250, v = 0.35) {
    osc('sine', f, t, t + 0.15).connect(ad(t, v, 0.001, 0.07, SFX));
    noise(t, t + 0.05).connect(filt('bandpass', f * 2.2, 5)).connect(ad(t, v * 0.6, 0.001, 0.025, SFX));
  }
  function whistle(t, dur, v) {
    const o = osc('sine', 520, t, t + dur + 0.1); o.frequency.exponentialRampToValueAtTime(1900, t + dur); vib(o, t, t + dur, 9, 18);
    o.connect(asr(t, v, 0.1, dur - 0.1, 0.1, SFX));
  }
  function impact(t, v, chord) {
    kick(t, v * 0.9, 120, SFX); crash(t, v * 0.35, SFX); timp(t, chord[0] - 12, v * 0.6, SFX);
    for (const m of chord) brass(t, m, 0.5, v * 0.16, MUS, 1.2);
  }
  function cough(t, v) { for (const dt of [0, 0.32]) noise(t + dt, t + dt + 0.25).connect(filt('bandpass', 700, 1.2)).connect(ad(t + dt, v, 0.004, 0.16, SFX)); }
  function snort(t, v) { noise(t, t + 0.4).connect(filt('bandpass', 900, 2)).connect(ad(t, v, 0.02, 0.28, SFX)); osc('sawtooth', 80, t, t + 0.3).connect(filt('lowpass', 300)).connect(ad(t, v * 0.5, 0.02, 0.2, SFX)); }
  function wub(t, v) { const o = osc('sine', 90, t, t + 0.6); o.frequency.linearRampToValueAtTime(160, t + 0.15); o.frequency.linearRampToValueAtTime(70, t + 0.45); o.connect(ad(t, v, 0.01, 0.45, SFX)); }
  function wail(t, dur, v, f0 = 520) {
    const o = osc('sawtooth', f0 * 0.85, t, t + dur + 0.3);
    o.frequency.linearRampToValueAtTime(f0 * 1.12, t + 0.18); o.frequency.linearRampToValueAtTime(f0 * 0.98, t + dur * 0.6); o.frequency.linearRampToValueAtTime(f0 * 0.72, t + dur);
    vib(o, t + 0.1, t + dur + 0.3, 6.5, 14);
    const lp = filt('lowpass', 400, 1); lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(4200, t + 0.16);
    const mix = asr(t, v, 0.07, dur - 0.15, 0.22, SFX); o.connect(lp);
    for (const [f, q, a] of [[850, 5, 1], [1250, 6, 0.8], [2700, 8, 0.35]]) { const g = ac.createGain(); g.gain.value = a; lp.connect(filt('bandpass', f, q)).connect(g).connect(mix); }
  }
  function plip(t, v = 0.08) { const f = 1100 + R() * 900, o = osc('sine', f, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05); o.connect(ad(t, v, 0.002, 0.07, panner((R() - 0.5) * 0.8, SFX))); }
  function sniff(t, v = 0.12) { for (const dt of [0, 0.16]) { const bp = filt('bandpass', 2500, 2); bp.frequency.setValueAtTime(1800, t + dt); bp.frequency.linearRampToValueAtTime(3600, t + dt + 0.12); noise(t + dt, t + dt + 0.2).connect(bp).connect(ad(t + dt, v, 0.04, 0.09, SFX)); } }
  function mwah(t, v = 0.2) { const o = osc('sine', 700, t, t + 0.3); o.frequency.exponentialRampToValueAtTime(1600, t + 0.12); o.connect(ad(t, v, 0.01, 0.16, SFX)); }
  function harpGliss(t, base = 60, n = 15, step = 0.04, v = 0.12) { for (let i = 0; i < n; i++) pluck(t + i * step, [0, 2, 4, 7, 9][i % 5] + base + 12 * Math.floor(i / 5), v, MUS, 0.8); }
  function bird(t, v = 0.07) { for (let k = 0; k < 3; k++) { const tt = t + k * 0.11, f = 2600 + R() * 1200, o = osc('sine', f, tt, tt + 0.1); o.frequency.exponentialRampToValueAtTime(f * 1.35, tt + 0.06); o.connect(ad(tt, v, 0.005, 0.07, panner((R() - 0.5) * 1.4, AMB))); } }
  function partyHorn(t, v = 0.15) {
    const o = osc('sawtooth', 420, t, t + 0.8); o.frequency.linearRampToValueAtTime(700, t + 0.12); o.frequency.setValueAtTime(700, t + 0.5); o.frequency.linearRampToValueAtTime(640, t + 0.7);
    vib(o, t + 0.15, t + 0.8, 14, 12); o.connect(filt('lowpass', 2600, 2)).connect(asr(t, v, 0.03, 0.55, 0.15, SFX));
  }
  function firework(t, v = 0.2) {
    const p = (R() - 0.5) * 1.4;
    noise(t, t + 0.2).connect(filt('bandpass', 900, 0.9)).connect(ad(t, v, 0.002, 0.14, panner(p, SFX)));
    for (let k = 0; k < 14; k++) { const tt = t + 0.12 + R() * 0.8; noise(tt, tt + 0.03).connect(filt('highpass', 4000)).connect(ad(tt, v * 0.25 * (1 - (tt - t) / 1.2), 0.001, 0.015, panner(p + (R() - 0.5) * 0.4, SFX))); }
  }
  function vinylStop(t) {
    for (const m of [60, 64, 67, 72]) { const o = osc('sawtooth', mtof(m), t, t + 0.75); o.frequency.exponentialRampToValueAtTime(mtof(m) / 4, t + 0.65); o.connect(filt('lowpass', 1400)).connect(ad(t, 0.07, 0.005, 0.65, MUS)); }
  }
  function uhOh(t, v = 0.22) {
    for (const [dt, m, d] of [[0, 69, 0.22], [0.3, 64, 0.5]]) {
      const o = osc('square', mtof(m), t + dt, t + dt + d + 0.2); vib(o, t + dt + 0.08, t + dt + d + 0.2, 6, 6);
      o.connect(filt('bandpass', 900, 2)).connect(filt('lowpass', 2200)).connect(asr(t + dt, v, 0.02, d, 0.1, SFX));
    }
  }

  // ---------------------------------------------------------------- arrangement helpers
  function theme(t0, key, style, fromBar = 0, toBar = 8, beat = BS) {
    for (const [b, m, l] of THEME) {
      const bar = Math.floor(b / 4); if (bar < fromBar || bar >= toBar) continue;
      const tt = t0 + (b - fromBar * 4) * beat, mm = m + key, dur = l * beat;
      if (style === 'intro' || style === 'outro') mbox(tt, mm, 0.2);
      if (style === 'garden') { mbox(tt, mm, 0.32); glock(tt, mm + 12, 0.06); }
      if (style === 'hero') { brass(tt, mm - 12, dur * 0.92, 0.24, MUS, 1.1); glock(tt, mm + 12, 0.07); }
      if (style === 'party') { glock(tt, mm, 0.3); brass(tt, mm - 12, dur * 0.9, 0.27, MUS, 1.15); mbox(tt, mm + 12, 0.09); }
      if (style === 'tag') { glock(tt, mm, 0.13); pluck(tt, mm - 12, 0.12); }
    }
    for (const [b, root, q, l] of CHORDS) {
      const bar = Math.floor(b / 4); if (bar < fromBar || bar >= toBar) continue;
      const tt = t0 + (b - fromBar * 4) * beat, r = root + key, tones = QUAL[q].map(x => r + x), dur = l * beat;
      if (style === 'intro' || style === 'outro') pad(tt, tones.map(x => x + 12), dur, 0.07, 1200, MUS, 0.3, 0.6);
      if (style === 'garden') {
        pluck(tt, r - 12 + 12, 0.24, MUS, 0.4); if (l === 4) pluck(tt + 2 * beat, r + 7, 0.2, MUS, 0.4);
        const arp = [0, 1, 2, 1, 0, 2, 1, 2];
        for (let k = 0; k < l * 2; k++) pluck(tt + k * beat / 2, tones[arp[k % 8] % tones.length] + 12, 0.07, MUS, 0.25);
        if (bar >= 4) pad(tt, tones.map(x => x + 12), dur, 0.045, 1100, MUS, 0.2, 0.4);
      }
      if (style === 'hero') { strings(tt, r, dur, 0.09); strings(tt, r + 7, dur, 0.06); timp(tt, r - 12, 0.35); }
      if (style === 'party') {
        for (let k = 0; k < l; k++) { pluck(tt + k * beat, r - 12 + (k % 2 ? 12 : 0), 0.42, MUS, 0.3); for (const x of tones) brass(tt + k * beat + beat / 2, x + 12, beat * 0.3, 0.05, MUS, 1.3); }
        pad(tt, tones.map(x => x + 12), dur, 0.04, 1800, MUS, 0.1, 0.3);
      }
      if (style === 'tag') pluck(tt, r - 12, 0.2);
    }
  }
  const beats = (a, b, step, fn) => { for (let t = a, i = 0; t < b - 1e-6; t += step, i++) fn(t, i); };

  // ================================================================== THE SCORE
  // ---- 0 · the drawing comes alive
  pad(0.3, [60, 64, 67, 71, 74], 5.4, 0.13, 1300, MUS, 1.5, 1.2);
  beats(0.8, 5.8, 0.36, (t, i) => mbox(t, penta(Math.floor(R() * 8), 84), 0.05, MUS, (R() - 0.5) * 0.8));
  whoosh(C.starA - 0.1, 2.3, 0.18, 500, 4000, -0.8, 0.8);
  for (let i = 0; i < 22; i++) glock(C.starA + i * 0.09, penta(i, 72), 0.07, SFX, -0.8 + 1.6 * i / 22);
  Object.values(C.lift).sort((a, b) => a - b).forEach((L, i) => { glock(L, penta(i + 5, 72), 0.2, SFX); sparkle(L + 0.03, 91, 4, 0.05); popSfx(L, penta(i, 72), 0.12); });
  sparkle(C.title, 88, 9, 0.08); crash(C.title, 0.07);
  theme(C.title, 0, 'intro', 0, 2);
  riser(C.diveA + 0.1, C.world - C.diveA - 0.15, 0.22);
  for (let i = 0; i < 12; i++) glock(C.world - 0.9 + i * 0.07, penta(i, 79), 0.06, SFX);
  sparkle(C.world - 0.05, 93, 8, 0.09);

  // ---- 1 · the butterfly garden (theme, 8 bars)
  theme(C.gardenA, 0, 'garden');
  beats(C.gardenA, C.gardenB, BS / 2, (t, i) => hat(t, i % 2 ? 0.025 : 0.04));
  beats(C.gardenA, C.gardenB, BS * 4, t => kick(t, 0.22));
  FLOWERS.filter(f => f.pop < 20).sort((a, b) => a.pop - b.pop).forEach((f, i) => popSfx(f.pop, penta(i % 11, 72), f.hero ? 0.2 : 0.1, clamp((f.x - 2050) / 900, -0.9, 0.9)));
  sparkle(10.7, 91, 5, 0.06); sparkle(16.5, 91, 6, 0.06);
  beats(18.05, 21.6, 0.25, (t, i) => glock(t, penta(i * 2 % 7, 84), 0.035, SFX, 0.2));
  sparkle(C.land, 84, 7, 0.09); glock(C.land, 84, 0.12, SFX);
  vinylStop(C.gardenB - 0.05);
  uhOh(C.uhoh + 0.15);

  // ---- 2 · uh-oh … something big is coming
  strings(26.6, 36, 11.4, 0.08, 7, MUS, 2.5); strings(26.6, 43, 11.4, 0.06, 7, MUS, 2.5); bass(26.6, 24, 11, 0.12);
  strings(29.5, 63, 8.2, 0.035, 9, MUS, 2.5); strings(29.5, 66, 8.2, 0.03, 9, MUS, 2.5);
  beats(27.2, 33.0, 0.85, t => { kick(t, 0.14, 90); kick(t + 0.17, 0.1, 80); });
  C.stomps.forEach((s, i) => stomp(s, 0.28 + 0.4 * i / (C.stomps.length - 1)));
  growlShort(30.9, 0.18);
  thunder(30.2, 0.2); thunder(C.lightning, 0.75); thunder(36.0, 0.3); thunder(45.4, 0.25);
  impact(C.lightning, 0.45, [36, 43, 48, 51]);
  roar(C.roarA + 0.05, 2.4, 0.72); impact(C.roarA + 0.05, 0.45, [36, 39, 43, 48]);
  strings(36.4, 48, 1.7, 0.06, 10, MUS, 1.2); strings(36.4, 51, 1.7, 0.05, 10, MUS, 1.2);

  // ---- 3 · fire!
  inhale(C.inhale1[0], C.inhale1[1] - C.inhale1[0], 0.35);
  const ost = [36, 36, 39, 36, 43, 36, 46, 43];
  beats(38.0, 47.6, BS / 2, (t, i) => pluck(t, ost[i % 8], t < 44 ? 0.3 : 0.18, MUS, 0.22));
  beats(38.0, 47.6, BS * 4, t => timp(t, 36, 0.32));
  strings(38.0, 48, 9.6, 0.08, 12); strings(38.0, 55, 9.6, 0.06, 12);
  for (const t of [39.5, 41.5, 43.5]) for (const m of [48, 51, 55]) brass(t, m, 0.4, 0.1, MUS, 0.9);
  whoosh(C.fire1[0] + 0.05, 1.1, 0.5, 250, 2600, -0.6, 0.7);
  fireSfx(C.fire1[0], C.fire1[1] - C.fire1[0], 0.42);
  for (const [i, m] of [[0, 76], [1, 74], [2, 72]]) glock(42.4 + i * 0.28, m, 0.08, SFX);
  for (const t of [44.7, 45.3, 45.9, 46.5]) snort(t, 0.2);

  // ---- 4 · Ice Man to the rescue
  pad(C.iceA, [74, 78, 81, 86], 3.4, 0.14, 3000, MUS, 0.8, 1.0);
  beats(C.iceA, C.iceA + 1.2, 0.05, (t, i) => glock(t, penta(10 + (i % 7), 74), 0.03, SFX, (R() - 0.5)));
  beats(C.iceA + 1, 79, 0.7, t => glock(t + R() * 0.3, penta(Math.floor(R() * 10), 88), 0.022, AMB, (R() - 0.5) * 1.4));
  beats(C.skateA, C.skateB, 0.42, (t, i) => whoosh(t, 0.36, 0.14, 1200, 3800, i % 2 ? 0.3 : -0.3, i % 2 ? -0.1 : 0.1));
  beats(C.skateA, C.heroA, BS / 2, (t, i) => { pluck(t, [62, 66, 69, 74, 69, 66][i % 6], 0.22); if (i % 2 === 0) hat(t, 0.04); });
  whoosh(50.55, 0.5, 0.25, 600, 4000);
  impact(C.heroA, 0.5, [50, 57, 62, 66]);
  theme(C.heroA, 2, 'hero', 0, 2);
  beats(52.4, 53.0, 0.0625, (t, i) => snare(t, 0.06 + 0.15 * i / 10));
  whoosh(C.slam - 0.3, 0.3, 0.3, 500, 3000);
  kick(C.slam, 0.9, 110, SFX); crash(C.slam, 0.3, SFX); stomp(C.slam, 0.4);
  noise(C.slam, C.slam + 0.2).connect(filt('highpass', 3000)).connect(ad(C.slam, 0.5, 0.001, 0.1, SFX));
  for (let i = 0; i < A.wall.rows; i++) iceChime(C.wallA + i * C.wallRow, penta(i, 79), 0.14);
  inhale(C.inhale2[0], C.inhale2[1] - C.inhale2[0], 0.3);
  fireSfx(C.fire2[0], C.fire2[1] - C.fire2[0], 0.24);
  sizzle(C.fire2[0] + 0.2, C.fire2[1] - C.fire2[0], 0.2);
  beats(55.0, 60.5, BS * 4, t => { for (const m of [62, 66, 69]) brass(t, m, 0.35, 0.07); bass(t, 38, 1.8, 0.18); timp(t, 38, 0.2); });
  beats(55.0, 60.5, BS, (t, i) => { snare(t + BS / 2, 0.07); if (i % 4 === 3) { snare(t + BS * 0.75, 0.05); } kick(t, 0.18); });
  strings(55.0, 74, 5.5, 0.05); strings(55.0, 78, 5.5, 0.04);
  sparkle(56.4, 86, 6, 0.07); boing(56.5, 0.12, 260); boing(57.0, 0.1, 300);
  growlShort(60.6, 0.25); stomp(60.9, 0.5); stomp(61.7, 0.45);

  // ---- 5 · police car & the ice net
  siren(C.sirenA, 69.8, 0.09);
  vroom(C.carA, C.carB - C.carA, 0.22); skid(C.carB - 0.7, 0.9, 0.18); boing(C.carB + 0.1, 0.08, 150);
  const groove = [38, 38, 41, 38, 43, 38, 41, 33];
  beats(62.0, C.count[0], BS / 2, (t, i) => { bass(t, groove[i % 8], BS * 0.45, 0.17); hat(t, 0.04); if (i % 4 === 2) snare(t, 0.16); if (i % 4 === 0) kick(t, 0.32); if (i % 8 === 7) for (const m of [62, 66, 69]) brass(t, m, 0.15, 0.07); });
  for (let k = 0; k < 4; k++) tick(C.turret + k * 0.06, 2200, 0.08); boing(C.turret + 0.05, 0.16, 220);
  const servo = osc('sawtooth', 220, C.aim[0], C.aim[1] + 0.1); servo.frequency.linearRampToValueAtTime(420, C.aim[1]);
  servo.connect(filt('lowpass', 1200)).connect(asr(C.aim[0], 0.04, 0.05, C.aim[1] - C.aim[0] - 0.1, 0.05, SFX));
  C.count.forEach((t, i) => { tick(t, 1100 + i * 150, 0.4); timp(t, 38 + i * 2, 0.3); });
  pad(C.count[0], [62, 66, 69], C.launch - C.count[0], 0.07, 900, MUS, 1.5, 0.1);
  riser(C.count[0] + 0.3, C.launch - C.count[0] - 0.3, 0.12);
  inhale(67.3, 1.1, 0.22);
  fireSfx(C.fire3[0], C.fizzle[0] - C.fire3[0] + 0.3, 0.22);
  sizzle(C.fire3[0] + 0.2, C.fizzle[0] - C.fire3[0], 0.18);
  sizzle(C.fizzle[0], 1.4, 0.3, true);
  kick(C.launch, 0.8, 120, SFX); noise(C.launch, C.launch + 0.4).connect(filt('lowpass', 1300)).connect(ad(C.launch, 0.5, 0.002, 0.3, SFX));
  whoosh(C.launch, 0.8, 0.35, 300, 3000, 0.4, -0.3); tick(C.launch, 1650, 0.3);
  whistle(C.launch + 0.15, C.netOpen - C.launch - 0.1, 0.06);
  pad(C.launch + 0.2, [74, 78, 81, 86], C.netLand - C.launch - 0.4, 0.07, 2600, MUS, 1.0, 0.2);
  riser(C.netOpen - 0.4, C.netLand - C.netOpen + 0.35, 0.25);
  whoosh(C.netOpen, 0.9, 0.3, 2000, 400, -0.4, -0.2); sparkle(C.netOpen, 86, 6, 0.06);
  impact(C.netLand, 0.75, [50, 57, 62, 66, 69]);
  crackle(C.netLand, 1.3, 0.18); sparkle(C.netLand + 0.1, 91, 10, 0.08);
  cough(C.smokeRing - 0.1, 0.22);
  theme(75.6, 2, 'tag', 0, 2, 0.4);
  boing(75.8, 0.12, 240); boing(76.2, 0.1, 280);
  for (const t of [76.3, 77.3, 78.3]) wub(t, 0.16);
  pad(78.2, [57, 60, 64], 2.0, 0.06, 900, MUS, 0.8, 0.6); glock(79.2, 76, 0.06, SFX); glock(79.55, 72, 0.06, SFX);

  // ---- 6 · the dinosaur cries… and says sorry
  [[70, 0.5], [69, 0.5], [68, 0.5], [67, 1.5]].reduce((t, [m, d]) => { brass(t, m - 12, d * 0.92, 0.13, MUS, 0.55, m === 67 ? 9 : 0); return t + d; }, C.cryA);
  wail(80.75, 1.25, 0.5, 540); wail(82.3, 0.9, 0.42, 500); wail(83.35, 1.5, 0.46, 560);
  beats(80.8, C.tearsEnd, 0.19, t => plip(t + R() * 0.08, 0.05));
  for (const t of [84.0, 86.2, 88.1]) sniff(t, 0.12);
  boing(C.flag, 0.2, 200); whoosh(C.flag + 0.1, 0.4, 0.12, 1500, 3000);
  glock(C.sorry, 79, 0.1, SFX); glock(C.sorry + 0.12, 84, 0.08, SFX);
  pad(C.sorry, [57, 60, 64], 2, 0.07, 1000, MUS, 0.6, 0.4); pad(C.sorry + 2, [53, 57, 60], 2, 0.07, 1000, MUS, 0.6, 0.6);
  [[0, 69, 1], [1, 72, 1], [2, 76, 1], [3, 72, 1], [4, 74, 1], [5, 77, 1], [6, 76, 2]].forEach(([b, m]) => mbox(C.sorry + b * 0.5, m, 0.13));
  beats(C.comfort[0], C.comfort[1], 0.2, (t, i) => glock(t, penta(i, 84), 0.025, SFX, -0.4));
  mwah(C.blush - 0.05, 0.2); harpGliss(C.blush, 60, 15, 0.04, 0.1); sparkle(C.blush, 88, 8, 0.07);
  pad(C.blush, [60, 64, 67, 72], 2, 0.08, 1500, MUS, 0.3, 0.8);
  pad(C.sunBack - 0.1, [53, 57, 60, 65], 1.5, 0.08, 1800, MUS, 0.6, 0.3);
  pad(C.sunBack + 1.4, [55, 59, 62, 67], 1.5, 0.09, 2200, MUS, 0.4, 0.3);
  strings(C.sunBack, 72, 2.9, 0.05, 0, MUS, 1.0); strings(C.sunBack + 1.5, 74, 1.5, 0.05);
  for (const t of [91.5, 92.2, 92.9, 93.4]) bird(t, 0.06);
  beats(93.0, 94.0, 0.125, (t, i) => tom(t, [220, 200, 180, 160, 140, 120, 110, 100][i], 0.18));

  // ---- 7 · HOORAY! party time (theme in F)
  partyHorn(C.partyA, 0.12); partyHorn(C.partyA + 0.08, 0.1); impact(C.partyA, 0.6, [53, 60, 65, 69]);
  theme(C.partyA, 5, 'party');
  beats(C.partyA, 110, BS, (t, i) => { if (i % 2 === 0) kick(t, 0.72); else { clap(t, 0.4); snare(t, 0.14); } hat(t + BS / 2, 0.08); hat(t, 0.05); });
  beats(C.partyA + 8, 110, BS * 8, t => crash(t, 0.12));
  partyHorn(102.0, 0.1);
  [95.0, 96.2, 97.6, 99.0, 100.4, 101.6, 103.0, 104.6, 106.0, 107.2, 108.4, 109.4].forEach(t => firework(t, 0.14));
  FLOWERS.filter(f => f.pop >= 94).sort((a, b) => a.pop - b.pop).forEach((f, i) => popSfx(f.pop, penta(i % 12, 77), 0.07, clamp((f.x - 600) / 900, -0.9, 0.9)));
  impact(110.0, 0.55, [53, 60, 65, 69, 72]);
  riser(C.flyToCam + 1.2, C.outroA - C.flyToCam - 1.3, 0.2);
  for (let i = 0; i < 16; i++) glock(110.6 + i * 0.05, penta(i, 79), 0.05, SFX);
  sparkle(C.outroA - 0.05, 93, 9, 0.08);

  // ---- 8 · back into the drawing
  PAGE_CHARS.forEach((n, i) => { const t = C.outroA + 0.6 + i * 0.28; popSfx(t, penta(i, 79), 0.16); glock(t, penta(i, 84), 0.08, SFX); });
  pad(C.outroA, [65, 69, 72], 2.2, 0.07, 1500, MUS, 0.3, 0.6);
  pad(C.theEnd - 0.2, [60, 64, 67, 71, 74], 7.5, 0.1, 1300, MUS, 1.2, 2.5);
  sparkle(C.theEnd, 88, 9, 0.08);
  theme(C.theEnd, 0, 'outro', 0, 2);
  mbox(C.theEnd + 4.0, 72, 0.18); mbox(C.theEnd + 4.0, 76, 0.12); mbox(C.theEnd + 4.0, 79, 0.1); mbox(C.theEnd + 4.0, 84, 0.08);
  sparkle(119.0, 93, 7, 0.06);
}
