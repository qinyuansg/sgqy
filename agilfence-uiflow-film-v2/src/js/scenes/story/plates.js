/* Cut C (story), chapters 1–2: the sensing illustrations as plates under a moving camera.
   AF-01 fence bay (AF-01-fence-clean: cable, sensors, the climber, the strain ripple; the segment callout painted out by tools/af-crops.py,
   so pinpointing is first shown in chapter 2) as the cold open, AF-01 'What the fence feels' (wind vs climb traces,
   with a threshold drawn across both) and the AF-04 airfield map (fence line, 5-14 lit, PTZ 7-02 swinging onto it).
   Crops from tools/af-crops.py (2x renders; coordinates below are plate px = crop px / 2). Light overlays move with
   the camera: pulse rings on the strained sensors, a signal running along the fibre, a wipe that draws the two traces,
   the threshold, a light that runs along the fence line and stops on 5-14, the PTZ 7-02 view cone. */
(function () {
  'use strict';
  const S = E.S;
  const RED = '#FF5A5F';

  // a plate: an illustration in the V11 device frame, a camera of shots [[t, rect|null, dur]] in plate px
  function plate(parent, o) {
    const root = E.add(parent, `<div class="abs con" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px"></div>`);
    const dev = E.add(root, `<div class="abs dev" style="left:0;top:0;width:${o.w}px;height:${o.h}px"><div class="spec"></div></div>`);
    const inner = E.add(dev, `<div class="abs" style="left:0;top:0;width:${o.iw}px;height:${o.ih}px;transform-origin:0 0"><img src="assets/af/${o.img}.png" style="width:${o.iw}px;height:${o.ih}px"></div>`);
    const svg = K.sadd(inner, `<svg class="abs" width="${o.iw}" height="${o.ih}" viewBox="0 0 ${o.iw} ${o.ih}" style="left:0;top:0;overflow:visible"></svg>`);
    const brk = K.brackets(root, 0, 0, o.w, o.h, { gap: 18, arm: 46 });
    return { ...o, root, dev, inner, svg, brk, zfit: Math.max(o.w / o.iw, o.h / o.ih), shots: [] };
  }
  const camAt = (p, t) => {
    const toP = r => { r = r || [0, 0, p.iw, p.ih]; const z = E.clamp(Math.min(p.w / r[2], p.h / r[3]), p.zfit, p.zmax); return [r[0] + r[2] / 2, r[1] + r[3] / 2, Math.log(z)]; };
    let q = toP(p.shots.length ? p.shots[0][1] : null);
    for (const [ts, r, d = 1.3, ez = 'inOut'] of p.shots) {
      if (t < ts) break;
      const n = toP(r), k = E.ease[ez](E.p(t, ts, ts + d));
      q = [E.lerp(q[0], n[0], k), E.lerp(q[1], n[1], k), E.lerp(q[2], n[2], k)];
    }
    const z = Math.exp(q[2]);
    return { z, ox: E.clamp(p.w / 2 - q[0] * z, p.w - p.iw * z, 0), oy: E.clamp(p.h / 2 - q[1] * z, p.h - p.ih * z, 0) };
  };
  const plateUpdate = (p, t, s) => {
    const kin = E.ep(t, s.start, s.start + (p.kin || 1.1), 'out5'), kout = E.ep(t, s.end - 0.7, s.end, 'in');
    E.css(p.root, { transform: `perspective(2400px) translate3d(${E.f3(50 * (1 - kin) - 30 * kout)}px,0,0) rotateY(${E.f3(-7 * (1 - kin) + 4 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})`, opacity: E.f3(kin * (1 - kout)) });
    K.bracketsIn(p.brk, E.ep(t, s.start + 0.5, s.start + 1.2) * (1 - kout));
    const c = camAt(p, t);
    E.css(p.inner, { transform: `translate3d(${c.ox.toFixed(2)}px,${c.oy.toFixed(2)}px,0) scale(${c.z.toFixed(5)})` });
  };
  // expanding rings: k 0..1 phase of one ring
  const ring = (el, k, r0, r1, a = 0.85) => {
    E.attr(el, 'r', E.f3(E.lerp(r0, r1, E.ease.out(k))));
    E.attr(el, 'opacity', E.f3(k <= 0 || k >= 1 ? 0 : a * (1 - k)));
  };
  const plateScene = (id, def) => E.scene({
    id, inDur: def.inDur === undefined ? 0.6 : def.inDur, outDur: 0.6,
    build(el, s) { s.p = plate(el, def.plate); s.p.shots = def.shots(s); if (def.build) def.build(s.p, s); def.cues(s); },
    update(t, lt, s) { plateUpdate(s.p, t, s); if (def.update) def.update(t, s.p, s); },
  });

  // ================= cold open · chapter 1 · Feels a climb: the fence bay =================
  // AF-01 crop (40,244)+(1960×1180) → plate 980×590. The cable runs at y 278.5 from x 40 to 934; the five strained
  // sensors (red) sit either side of the climber; the climber's hands are on the top rail at x ~525–610. The film opens
  // on the climber and the ripple (no fade-up: picture from the first frame, the ripple from 0.3 s), drifts in, then
  // eases back to the whole climber. Every framing keeps x ≥ 280, so the 'Runway 02L edge lights' label (x 88–273)
  // never sits cut at the left edge.
  const SENS = [450, 494, 537.5, 625.5, 670], CY = 278.5;
  plateScene('fence', {
    inDur: 0,
    plate: { x: 160, y: 58, w: 1600, h: 963, img: 'AF-01-fence-clean', iw: 980, ih: 590, zmax: 3.3, kin: 0.35 },
    shots: s => {
      const f = s.start;
      return [
        [f, [330, 82, 560, 337], 0.1],              // the climber's arms and the strain ripple either side of him
        [f + 0.1, [360, 100, 500, 301], 2.0, 'sine'],   // drift in on the ripple
        [f + 2.1, [280, 60, 700, 421], 1.6],        // ease back: the whole climber on the bay
      ];
    },
    build(p, s) {
      // pulse rings on the strained sensors, a signal running along the fibre to the left
      s.rings = SENS.map(x => [0, 1].map(() => K.sadd(p.svg, `<circle cx="${x}" cy="${CY}" r="6" fill="none" stroke="${RED}" stroke-width="2.2" opacity="0"/>`)));
      s.glow = K.sadd(p.svg, `<defs><linearGradient id="sig" x1="0" x2="1"><stop offset="0" stop-color="#9FF3FF" stop-opacity="0"/><stop offset=".75" stop-color="#E8FDFF" stop-opacity=".95"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>`);
      s.sig = [0, 1].map(() => K.sadd(p.svg, `<rect x="0" y="${CY - 2.6}" width="70" height="5.2" rx="2.6" fill="url(#sig)" opacity="0" style="filter:drop-shadow(0 0 6px #7FEAFF)"/>`));
    },
    update(t, p, s) {
      const t0 = s.start + 0.3;   // the climb registers on the fibre
      s.rings.forEach((pair, i) => pair.forEach((el, j) => {
        const ph = (t - t0 - i * 0.12 - j * 0.6) / 1.2;
        ring(el, t < t0 ? -1 : ph - Math.floor(ph), 7, 30, 0.8 * (1 - E.ep(t, s.end - 0.8, s.end)));
      }));
      // two signal pulses leave the strained segment and run left along the fibre (toward the interrogator)
      s.sig.forEach((el, j) => {
        const a = t0 + 0.4 + j * 1.1, k = E.p(t, a, a + 1.6);
        const x = E.lerp(440, 30, E.ease.in(k)) - 70;
        E.attr(el, 'x', E.f3(x));
        E.attr(el, 'transform', `rotate(180 ${E.f3(x + 35)} ${CY})`);
        E.attr(el, 'opacity', E.f3(t < a || k >= 1 ? 0 : Math.min(1, k * 8, (1 - k) * 5)));
      });
    },
    cues(s) {
      const t0 = s.start + 0.3;
      E.cue(t0, 'thud', 0.5); E.cue(t0 + 0.6, 'thud', 0.32);
      E.cue(t0 + 0.4, 'sweep', 0.18, { dur: 1.6 }); E.cue(t0 + 1.5, 'sweep', 0.14, { dur: 1.6 });
    },
  });

  // ================= chapter 1 · the signature: wind vs climb against the threshold =================
  // AF-01 crop (2018,298)+(702×628) → plate 351×314, shown near full frame from the first second. Wind trace (Seg 5-09):
  // midline y 106.5, peaks 7.5 above it; climb trace (Seg 5-14): midline y 219, the spike 21.5 above it at x ~171, every
  // other peak at most 11.5 above. One threshold, 15 above each midline, is drawn across both traces: the wind stays
  // under it, only the climb spike crosses it, and the 'Alarm' badge pulses as it does. The small grey caption under the
  // traces is covered by a short callout. Panel colour rgb(28,33,42). Each trace is drawn by a wipe, left to right.
  const PANEL = 'rgb(28,33,42)', TX0 = 16, TX1 = 336, AMB = '#E3B341';
  const THR = [106.5 - 15, 219 - 15], XS = 171;                  // the threshold on each trace; the spike's crossing
  const W1 = 1.3, W2 = 2.9;                                      // the climb wipe (seconds into the scene)
  const tSpike = a => a + W1 + (W2 - W1) * Math.acos(1 - 2 * ((XS - (TX0 - 10)) / (TX1 + 4 - (TX0 - 10)))) / Math.PI;
  plateScene('trace', {
    plate: { x: 423, y: 60, w: 1073, h: 960, img: 'AF-01-trace', iw: 351, ih: 314, zmax: 3.3 },
    shots: s => [[s.start, null, 0.1], [s.start + 0.3, [6, 24, 339, 286], 4.6, 'sine']],
    build(p, s) {
      // the covers sit under the overlay svg, so the threshold shows across both traces before they are drawn
      const under = el => (p.inner.insertBefore(el, p.svg), el);
      const cover = (y, h) => under(E.add(p.inner, `<div class="abs" style="top:${y}px;height:${h}px;background:linear-gradient(90deg,rgba(28,33,42,0),${PANEL} 10px)"></div>`));
      s.cw = cover(86, 38);     // the wind trace
      s.cc = cover(170, 92);    // the climb trace, its marker and time
      under(E.add(p.inner, `<div class="abs" style="left:14px;top:263px;width:300px;height:40px;background:${PANEL}"></div>`));   // the caption
      s.thr = THR.map(y => K.sadd(p.svg, `<line x1="21" y1="${y}" x2="21" y2="${y}" stroke="${AMB}" stroke-width=".9" stroke-dasharray="4.5 3" opacity="0"/>`));
      s.thrL = K.sadd(p.svg, `<text x="331" y="${THR[0] - 3}" text-anchor="end" font-family="Mono, monospace" font-size="7.2" font-weight="500" letter-spacing=".6" fill="${AMB}" opacity="0">THRESHOLD</text>`);
      s.spike = K.sadd(p.svg, `<ellipse cx="${XS - 2}" cy="210" rx="10" ry="30" fill="${RED}" opacity="0" style="filter:blur(9px)"/>`);
      s.sr = [0, 1].map(() => K.sadd(p.svg, `<circle cx="${XS}" cy="${THR[1]}" r="5" fill="none" stroke="${RED}" stroke-width="1.6" opacity="0"/>`));
      s.dot = K.sadd(p.svg, `<circle cx="${XS}" cy="${THR[1]}" r="2.6" fill="#fff" opacity="0" style="filter:drop-shadow(0 0 3px ${RED})"/>`);
      // the 'Alarm' badge (275–323.5, 150–167.5) pulses as the spike crosses
      s.badge = [0, 1].map(() => K.sadd(p.svg, `<rect x="275" y="150" width="48.5" height="17.5" rx="8.75" fill="none" stroke="${RED}" stroke-width="1.4" opacity="0"/>`));
      s.call = K.sadd(p.svg, `<text x="21" y="287" font-family="InterF, sans-serif" font-size="12.5" font-weight="600" opacity="0"><tspan fill="#C9D3E6">Wind: no alarm</tspan><tspan fill="#7D8AA3" dx="6">·</tspan><tspan fill="#FF6B6F" dx="6">Climb: alarm</tspan></text>`);
    },
    update(t, p, s) {
      const a = s.start, wipe = (el, t0, t1) => {
        const k = E.ep(t, t0, t1, 'sine'), x = E.lerp(TX0 - 10, TX1 + 4, k);
        E.css(el, { left: E.f3(x) + 'px', width: E.f3(Math.max(0, TX1 + 6 - x)) + 'px', visibility: k >= 1 ? 'hidden' : 'visible' });
      };
      wipe(s.cw, a + 0.35, a + 1.35);
      wipe(s.cc, a + W1, a + W2);
      const live = 1 - E.ep(t, s.end - 0.7, s.end);
      const kt = E.ep(t, a + 0.15, a + 0.85, 'out');
      s.thr.forEach(el => { E.attr(el, 'x2', E.f3(E.lerp(21, 331, kt))); E.attr(el, 'opacity', E.f3((t > a + 0.15 ? 0.95 : 0) * live)); });
      E.attr(s.thrL, 'opacity', E.f3(E.ep(t, a + 0.6, a + 1.0) * live));
      const tS = tSpike(a);
      E.attr(s.spike, 'opacity', E.f3(t < tS ? 0 : 0.55 * Math.exp(-(t - tS) * 1.1) * live));
      E.attr(s.dot, 'opacity', E.f3(t < tS ? 0 : Math.min(1, (t - tS) * 8) * (0.55 + 0.45 * Math.exp(-(t - tS) * 2)) * live));
      s.sr.forEach((el, j) => ring(el, E.p(t, tS + j * 0.35, tS + j * 0.35 + 1.4), 5, 24, 0.75));
      s.badge.forEach((el, j) => {
        const k = E.p(t, tS + 0.05 + j * 0.45, tS + 0.05 + j * 0.45 + 1.1), g = E.lerp(0, 9, E.ease.out(k));
        E.attr(el, 'x', E.f3(275 - g)); E.attr(el, 'y', E.f3(150 - g * 0.6)); E.attr(el, 'width', E.f3(48.5 + 2 * g)); E.attr(el, 'height', E.f3(17.5 + 1.2 * g));
        E.attr(el, 'opacity', E.f3(k <= 0 || k >= 1 ? 0 : 0.9 * (1 - k)));
      });
      E.attr(s.call, 'opacity', E.f3(E.ep(t, tS + 0.35, tS + 0.85) * live));
    },
    cues(s) {
      const a = s.start, tS = tSpike(a);
      E.cue(a + 0.1, 'whoosh', 0.35);
      E.cue(a + 0.35, 'scan', 0.16, { dur: 1.0 });                // the wind: calm, under the threshold
      E.cue(a + W1, 'scan', 0.2, { dur: 0.8 });
      E.cue(tS, 'alertSoft', 0.45); E.cue(tS + 0.02, 'thud', 0.32);   // the climb crosses it: Alarm
    },
  });

  // ================= chapter 2 · Pinpoints the segment: the airfield map =================
  // AF-04 crop (806,410)+(988×732) → plate 494×366. The fence line runs y ≈ 87.7 + 0.2374·x; 5-14 (the alarm zone and its
  // pin) sits at x 194. A light runs along the fence line and stops on 5-14, the camera pushes in, and PTZ 7-02's view
  // cone (apex 112.5,161; reach ~102; aimed at -3.4°, ±10.5°) swings onto the segment and locks: the hand-off to
  // 'Shows who is there'.
  const FY = x => 87.7 + 0.2374 * x, X14 = 194, PTZ = [112.5, 161], PTZI = [112.5, 99.5];
  const wedge = (r, a0, a1) => {
    const P = a => [PTZ[0] + r * Math.cos(a * Math.PI / 180), PTZ[1] + r * Math.sin(a * Math.PI / 180)];
    const [p0, p1] = [P(a0), P(a1)];
    return `M${PTZ[0]} ${PTZ[1]} L${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`;
  };
  plateScene('map', {
    plate: { x: 180, y: 70, w: 1560, h: 940, img: 'AF-04-map', iw: 494, ih: 366, zmax: 3.9 },
    shots: s => {
      const m = s.start, MAP = [0, 0, 494, 300];   // the fence line and the cameras, not the taxiway below
      return [
        [m, MAP, 0.1],
        [m + 1.7, [0, 0, 400, 240], 1.7],           // onto 5-14 and PTZ 7-02: the lit segment, Seg 5-14 · Alarm, the camera
      ];
    },
    build(p, s) {
      K.sadd(p.svg, `<defs><radialGradient id="lt"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#BFE9FF" stop-opacity=".9"/><stop offset="1" stop-color="#4D8DFF" stop-opacity="0"/></radialGradient>
        <linearGradient id="cone" x1="0" x2="1"><stop offset="0" stop-color="#5EE6F0" stop-opacity=".55"/><stop offset="1" stop-color="#5EE6F0" stop-opacity=".08"/></linearGradient></defs>`);
      s.trail = K.sadd(p.svg, `<line x1="0" y1="${FY(0)}" x2="0" y2="${FY(0)}" stroke="#9FD8FF" stroke-width="2.4" stroke-linecap="round" opacity="0" style="filter:drop-shadow(0 0 4px #6FB6FF)"/>`);
      s.dot = K.sadd(p.svg, `<circle cx="0" cy="${FY(0)}" r="9" fill="url(#lt)" opacity="0"/>`);
      s.rings = [0, 1, 2].map(() => K.sadd(p.svg, `<ellipse cx="${X14}" cy="${FY(X14) + 8}" rx="10" ry="4" fill="none" stroke="${RED}" stroke-width="1.6" opacity="0"/>`));
      s.cone = K.sadd(p.svg, `<path d="${wedge(104, -13.9, 7.1)}" fill="url(#cone)" stroke="#7FF0F8" stroke-width="1.3" stroke-linejoin="round" opacity="0" style="filter:drop-shadow(0 0 5px #3FD3E0)"/>`);
      s.cr = [0, 1].map(() => K.sadd(p.svg, `<circle cx="${PTZI[0]}" cy="${PTZI[1]}" r="15" fill="none" stroke="#7FF0F8" stroke-width="1.6" opacity="0"/>`));
    },
    update(t, p, s) {
      const m = s.start, a = m + 0.5, b = m + 1.9, k = E.ep(t, a, b, 'inOut'), x = E.lerp(4, X14, k);
      const fade = 1 - E.ep(t, b + 0.6, b + 1.6), live = 1 - E.ep(t, s.end - 0.8, s.end);
      E.attr(s.dot, 'cx', E.f3(x)); E.attr(s.dot, 'cy', E.f3(FY(x)));
      E.attr(s.dot, 'opacity', E.f3(t < a ? 0 : Math.min(1, (t - a) * 4) * fade));
      E.attr(s.trail, 'x1', E.f3(Math.max(4, x - 70))); E.attr(s.trail, 'y1', E.f3(FY(Math.max(4, x - 70))));
      E.attr(s.trail, 'x2', E.f3(x)); E.attr(s.trail, 'y2', E.f3(FY(x)));
      E.attr(s.trail, 'opacity', E.f3(t < a ? 0 : 0.85 * fade));
      s.rings.forEach((el, j) => {
        const ph = (t - b - j * 0.5) / 1.5, kk = t < b ? -1 : ph - Math.floor(ph);
        E.attr(el, 'rx', E.f3(E.lerp(12, 64, E.ease.out(kk)))); E.attr(el, 'ry', E.f3(E.lerp(5, 26, E.ease.out(kk))));
        E.attr(el, 'opacity', E.f3(kk <= 0 || kk >= 1 ? 0 : 0.85 * (1 - kk) * live));
      });
      // PTZ 7-02 swings from the far side of the fence (pointing up the line, -78°) onto 5-14 and locks
      const c0 = m + 3.0, c1 = m + 4.1, kc = E.ep(t, c0, c1, 'inOut');
      E.attr(s.cone, 'transform', `rotate(${E.f3(-64 * (1 - kc))} ${PTZ[0]} ${PTZ[1]})`);
      E.attr(s.cone, 'opacity', E.f3((t < c0 ? 0 : Math.min(1, (t - c0) * 5)) * (0.85 + 0.15 * Math.exp(-Math.max(0, t - c1) * 3)) * live));
      s.cr.forEach((el, j) => ring(el, E.p(t, c1 + j * 0.45, c1 + j * 0.45 + 1.3), 14, 34, 0.85));
    },
    cues(s) {
      const m = s.start;
      E.cue(m + 0.1, 'whoosh', 0.35);
      E.cue(m + 0.5, 'sweep', 0.2, { dur: 1.4 });     // the light runs along the fence line
      E.cue(m + 1.9, 'ping', 0.4);                     // stops on 5-14
      E.cue(m + 1.95, 'alertSoft', 0.28);
      E.cue(m + 3.0, 'sweep', 0.14, { dur: 1.1 });    // PTZ 7-02 swings onto the segment
      E.cue(m + 4.1, 'blip', 0.3);                     // and locks on
    },
  });
})();
