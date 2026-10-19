/* Cut B · Highlight: the v2 alarm flow in nine console shots and one fence plate, cut to the score (120 BPM, a beat
   every 0.5 s). Each shot is its own V11 console (same device, same place) with one push; consecutive shots
   cross-dissolve over 0.4 s centred on the window start, the incoming shot on top; the outgoing shot holds still
   through the dissolve, so only one layer moves. Inside a shot the screen may change (the two clicks: Confirm
   intrusion → recorded, Dispatch Patrol 2 → recorded). Before the alarm view, the AF-01 fence bay: the climber, the
   strained sensors pulsing on the cable, Fence Sector 5 · Segment 5-14 (the fence feels it). Real V11 frames, no labels. */
(function () {
  'use strict';
  const S = E.S;
  const A = (f, k) => window.ANCH[f][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const DW = 1360, DX = 280, DY = 21;
  const FW = 1400, FH = 1069;
  const XD = 0.4;       // cross-dissolve length
  const ZMAX = 3.1;     // the frames are 2x: 3.1 is about 1.5x upsampling at the tightest push
  const F = {
    s1: 'AV-S1-quiet', s2: 'AV-S2-alarm-view-auto', s3: 'AV-S3-verification', s4: 'AV-S4-confirm-click',
    s5: 'AV-S5-incident-response-lanes', s6: 'AV-S6-dispatch-click', s7: 'AV-S7-response-running-ptz-handover',
    s8: 'AV-S8-on-scene-outcomes', s9: 'AV-S9-closure-checklist-submit', s10b: 'AV-S10b-closed',
  };
  const P = (f, k, dx = 0, dy = 0) => { const [x, y] = mid(A(F[f], k)); return [x + dx, y + dy]; };
  // a framing by centre and zoom (frame px); WIDE is the whole screen
  const Z = (cx, cy, z) => { const w = FW / z, h = FH / z; return [cx - w / 2, cy - h / 2, w, h]; };
  const WIDE = null;

  // ---- the beats (seconds) ----
  const B = (window.BEATS = {
    alarm: S('alarm').start,
    c1: S('confirm').start + 1.0,       // Confirm intrusion   (on the beat; the recorded state holds 1.2 s)
    c2: S('dispatch').start + 1.0,      // Dispatch Patrol 2   (on the beat)
    exception: S('running').start + 1.9,   // the camera lands on the PTZ 7-02 → 7-03 hand-over banner (2.5 s on screen)
  });

  let order = 0;
  function shot(id, def) {
    const a = def.start, b = def.end, first = !!def.first, last = !!def.last;
    const idx = order++;
    E.scene({
      id: 'hl-' + id, start: a - (first ? 0.3 : XD / 2), end: b + (last ? 0 : XD / 2), inDur: 0, outDur: 0, ownFade: true,
      build(el, s) {
        const c = (s.con = K.console(el, { x: DX, y: DY, w: DW }));
        c.zmax = ZMAX;
        def.frames.forEach(f => c.frame(f));
        c.plan = { screens: def.screens, shots: def.cams };
        // soft dark edges on the device when the camera is in close (slivers of the next panel fade out)
        s.vig = E.add(c.dev, '<div class="abs" style="inset:0;z-index:3;pointer-events:none;opacity:0;background:' +
          'linear-gradient(180deg,#05070D 0,rgba(5,7,13,0) 64px,rgba(5,7,13,0) calc(100% - 64px),#05070D 100%),' +
          'linear-gradient(90deg,#05070D 0,rgba(5,7,13,0) 72px,rgba(5,7,13,0) calc(100% - 72px),#05070D 100%)"></div>');
        s.cur = K.cursor(c);
        if (def.build) def.build(c, s);
        if (def.cues) def.cues();
      },
      update(t, lt, s) {
        const c = s.con;
        // opacity: a dissolve in over [a - XD/2, a + XD/2] (on top of the outgoing shot); the first shot enters
        // the stage like the operator film's console, the last one leaves the same way
        const kin = first ? E.ep(t, a - 0.3, a + 0.8, 'out5') : 1;
        const kout = last ? E.ep(t, b - 0.7, b, 'in') : 0;
        const o = first ? kin * (1 - kout) : E.ep(t, a - XD / 2, a + XD / 2, 'sine') * (1 - kout);
        E.css(s.el, { opacity: E.f3(o), zIndex: String(10 + idx) });
        E.css(c.root, { transform: `perspective(2400px) translate3d(${E.f3(50 * (1 - kin) - 30 * kout)}px,0,0) rotateY(${E.f3(-7 * (1 - kin) + 4 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})` });
        K.bracketsIn(c.brk, first ? E.ep(t, a + 0.2, a + 0.9) * (1 - kout) : 1 - kout);
        K.consoleUpdate(c, last ? t : Math.min(t, b - XD / 2));   // the outgoing shot holds still under the dissolve
        E.css(c.edge, { opacity: '0' }); E.css(c.edgeR, { opacity: '0' });
        E.css(s.vig, { opacity: E.f3(E.clamp((c.cam.z - 1.6) / 0.6)) });
        if (def.update) def.update(t, c, s);
        let vis = 0;
        for (const [w0, w1] of def.wins || []) vis = Math.max(vis, E.env(t, w0, w1, 0.25));
        if (def.path) K.cursorUpdate(c, s.cur, t, def.path, def.clicks, vis);
        else E.css(s.cur.c, { visibility: 'hidden' });
      },
    });
  }
  const seg = (t0, from, t1, to, tc) => [[t0, ...from], [t1, ...to], [tc + 0.5, ...to]];

  // 1 · quiet console, 02:14:50: a slow drift over the airport model; the alert list (an unrelated door alert)
  //     stays out of frame, so nothing reads as the incident before the fence feels the climb
  {
    const a = S('quiet').start, b = S('quiet').end;
    shot('quiet', {
      start: a, end: b, first: true, frames: [F.s1], screens: [[0, F.s1]],
      cams: [[0, Z(915, 520, 1.62), 0.01], [a - 0.2, Z(925, 515, 1.5), b - a + 0.4]],
      cues() { E.cue(a - 0.2, 'whoosh', 0.35); },
    });
  }

  // 1b · the fence feels it: the AF-01 fence bay (crop (40,244)+(1960×1180), plate px = crop px / 2 → 980×590).
  //      The climber's hands on the top rail, the five strained sensors pulse red on the cable (y 278.5), two signal
  //      pulses run left along the fibre; the callout reads Fence Sector 5 · Segment 5-14. A slow push in.
  {
    const a = S('fence').start, b = S('fence').end, idx = order++;
    const IW = 980, IH = 590, VH = Math.round(DW * FH / FW), SENS = [450, 494, 537.5, 625.5, 670], CY = 278.5, RED = '#FF5A5F';
    const SH = [[a - XD / 2, [150, 40, 760, 430], 0.01], [a - XD / 2, [300, 20, 580, 400], b - a + XD, 'sine']];
    const zfit = Math.max(DW / IW, VH / IH), zmax = 2.6;
    const camAt = t => {
      const toP = r => { const z = E.clamp(Math.min(DW / r[2], VH / r[3]), zfit, zmax); return [r[0] + r[2] / 2, r[1] + r[3] / 2, Math.log(z)]; };
      let q = toP(SH[0][1]);
      for (const [ts, r, d, ez = 'inOut'] of SH) { if (t < ts) break; const n = toP(r), k = E.ease[ez](E.p(t, ts, ts + d)); q = [E.lerp(q[0], n[0], k), E.lerp(q[1], n[1], k), E.lerp(q[2], n[2], k)]; }
      const z = Math.exp(q[2]);
      return { z, ox: E.clamp(DW / 2 - q[0] * z, DW - IW * z, 0), oy: E.clamp(VH / 2 - q[1] * z, VH - IH * z, 0) };
    };
    const ring = (el, k, r0, r1, al) => { E.attr(el, 'r', E.f3(E.lerp(r0, r1, E.ease.out(k)))); E.attr(el, 'opacity', E.f3(k <= 0 || k >= 1 ? 0 : al * (1 - k))); };
    E.scene({
      id: 'hl-fence', start: a - XD / 2, end: b + XD / 2, inDur: 0, outDur: 0, ownFade: true,
      build(el, s) {
        s.root = E.add(el, `<div class="abs con" style="left:${DX}px;top:${DY}px;width:${DW}px;height:${VH}px"></div>`);
        const dev = E.add(s.root, `<div class="abs dev" style="left:0;top:0;width:${DW}px;height:${VH}px"><div class="spec"></div></div>`);
        s.inner = E.add(dev, `<div class="abs" style="left:0;top:0;width:${IW}px;height:${IH}px;transform-origin:0 0"><img src="assets/af/AF-01-fence.png" style="width:${IW}px;height:${IH}px"></div>`);
        const svg = K.sadd(s.inner, `<svg class="abs" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}" style="left:0;top:0;overflow:visible"></svg>`);
        s.brk = K.brackets(s.root, 0, 0, DW, VH, { gap: 18, arm: 46 });
        s.rings = SENS.map(x => [0, 1].map(() => K.sadd(svg, `<circle cx="${x}" cy="${CY}" r="6" fill="none" stroke="${RED}" stroke-width="2.2" opacity="0"/>`)));
        K.sadd(svg, `<defs><linearGradient id="hlsig" x1="0" x2="1"><stop offset="0" stop-color="#9FF3FF" stop-opacity="0"/><stop offset=".75" stop-color="#E8FDFF" stop-opacity=".95"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>`);
        s.sig = [0, 1].map(() => K.sadd(svg, `<rect x="0" y="${CY - 2.6}" width="70" height="5.2" rx="2.6" fill="url(#hlsig)" opacity="0" style="filter:drop-shadow(0 0 6px #7FEAFF)"/>`));
        const t0 = a + 0.15;
        E.cue(a - 0.15, 'whoosh', 0.3);
        E.cue(t0, 'thud', 0.5); E.cue(t0 + 0.5, 'thud', 0.32);
        E.cue(t0 + 0.35, 'sweep', 0.18, { dur: 1.2 });
      },
      update(t, lt, s) {
        const tt = Math.min(t, b - XD / 2);
        E.css(s.el, { opacity: E.f3(E.ep(t, a - XD / 2, a + XD / 2, 'sine')), zIndex: String(10 + idx) });
        K.bracketsIn(s.brk, 1);
        const c = camAt(tt);
        E.css(s.inner, { transform: `translate3d(${c.ox.toFixed(2)}px,${c.oy.toFixed(2)}px,0) scale(${c.z.toFixed(5)})` });
        const t0 = a + 0.15;   // the climb registers as the shot lands
        s.rings.forEach((pair, i) => pair.forEach((el, j) => {
          const ph = (t - t0 - i * 0.1 - j * 0.5) / 1.0;
          ring(el, t < t0 ? -1 : ph - Math.floor(ph), 7, 30, 0.85);
        }));
        s.sig.forEach((el, j) => {
          const s0 = t0 + 0.3 + j * 0.6, k = E.p(t, s0, s0 + 1.2), x = E.lerp(440, 30, E.ease.in(k)) - 70;
          E.attr(el, 'x', E.f3(x));
          E.attr(el, 'transform', `rotate(180 ${E.f3(x + 35)} ${CY})`);
          E.attr(el, 'opacity', E.f3(t < s0 || k >= 1 ? 0 : Math.min(1, k * 8, (1 - k) * 5)));
        });
      },
    });
  }

  // 2 · the alarm view opens itself (no pointer): red flash and the alarm toast on the wide console,
  //     then the hero push onto PTZ 7-02 live, the person climbing
  {
    const a = S('alarm').start, b = S('alarm').end;
    shot('alarm', {
      start: a, end: b, frames: [F.s2], screens: [[0, F.s2]],
      cams: [
        [0, WIDE, 0.01],
        [a + 0.75, Z(638, 465, 2.6), 1.45],     // the live tile with the 'Opened automatically' header
        [a + 2.2, Z(640, 438, 3.05), b - a - 1.9],   // creep onto the climber through the dissolve
      ],
      build(c, s) {
        // the AgilFence alarm toast slides in from the right as the view opens
        s.toastL = E.add(c.dev, `<div class="scr" style="visibility:hidden;width:1400px;z-index:3"><img src="assets/af/${F.s2}.png" style="width:1400px"></div>`);
        s.flash = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(900px 600px at 50% 40%, rgba(215,45,48,.36), rgba(215,45,48,0));opacity:0"></div>');
      },
      update(t, c, s) {
        const on = t >= a - 0.3 && t < a + 1.4;
        if (on) {
          const k = E.ep(t, a - 0.3, a + 0.5, 'out5'), rr = A(F.s2, 'alarmToast'), p = 10;
          const tr = `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)}) translate(${E.f3((1 - k) * 480)}px,0)`;
          E.css(s.toastL, { visibility: 'visible', opacity: E.f3(Math.min(1, k * 3)), transform: tr, clipPath: `inset(${rr[1] - p}px ${1400 - rr[0] - rr[2] - p}px ${1069 - rr[1] - rr[3] - p}px ${rr[0] - p}px)` });
        } else E.css(s.toastL, { visibility: 'hidden' });
        E.css(s.flash, { opacity: E.f3(t > a ? (0.5 + 0.5 * Math.cos((t - a) * 9)) * (1 - E.ep(t, a, a + 1.6)) * 0.75 : 0) });
      },
      cues() {
        E.cue(a, 'alert', 0.75); E.cue(a + 0.75, 'alert', 0.5); E.cue(a + 0.02, 'impactSoft', 0.4);
        E.cue(a + 0.7, 'whoosh', 0.3); E.cue(a + 2.0, 'notify', 0.28);
      },
    });
  }

  // 3 · verification: corroboration (one track, three sensors, health OK), then in on the AgilFence 5-14 climb-signature
  //     row with a highlight pulse (the fence felt it first, 02:14:58), then down to the decision bar; the pointer clicks
  //     Confirm intrusion (on the beat) → Decision recorded, held 1.2 s before the dissolve
  {
    const a = S('verify').start, b = S('confirm').end, cf = S('confirm').start;
    const AFR = [931, 377, 398, 42];      // the AgilFence 5-14 · Climb signature row (frame px)
    const hl0 = a + 1.3, hl1 = cf - 0.3;  // the row's highlight window
    shot('verify', {
      start: a, end: b, frames: [F.s3, F.s4], screens: [[0, F.s3], [B.c1 + 0.1, F.s4, { fade: 0.2 }]],
      cams: [
        [0, Z(1130, 470, 2.45), 0.01],
        [a - 0.3, Z(1130, 452, 2.85), 1.3],              // corroboration: one track, three sensors, health OK
        [a + 1.1, Z(1118, 404, 3.1), 1.0],               // in on the AgilFence 5-14 climb-signature row
        [cf - 0.25, Z(1130, 850, 2.6), 0.65],            // down past the authorised-activity check to the decision bar
        [cf + 0.4, Z(1132, 880, 2.95), b - cf - 0.4],    // in on Confirm intrusion
      ],
      build(c, s) {
        s.hl = E.add(c.dev, `<div class="abs" style="left:0;top:0;width:1400px;height:1069px;z-index:3;pointer-events:none;transform-origin:0 0">
          <div class="abs" style="left:${AFR[0] - 4}px;top:${AFR[1] - 3}px;width:${AFR[2] + 8}px;height:${AFR[3] + 6}px;border-radius:7px;border:2px solid #FFD25A;box-shadow:0 0 14px 2px rgba(255,200,70,.55),inset 0 0 12px rgba(255,200,70,.18)"></div></div>`);
      },
      update(t, c, s) {
        const k = E.env(t, hl0, hl1, 0.25), pulse = 0.72 + 0.28 * Math.cos((t - hl0) * Math.PI * 2);   // one pulse a beat pair
        E.css(s.hl, { opacity: E.f3(k * pulse), visibility: k > 0.001 ? 'visible' : 'hidden',
          transform: `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)})` });
      },
      path: seg(cf + 0.05, [1250, 790], cf + 0.7, P('s3', 'confirmBtn', 10, 2), B.c1),
      clicks: [B.c1], wins: [[cf - 0.15, B.c1 + 0.8]],
      cues() {
        E.cue(a + 0.05, 'switch', 0.25, { dur: 0.55 }); E.cue(hl0, 'blip', 0.26); E.cue(hl0 + 1.0, 'blip', 0.16);
        E.cue(B.c1, 'click', 0.8); E.cue(B.c1 + 0.12, 'confirm', 0.5);
      },
    });
  }

  // 4 · incident raised, three response lanes (Patrol · Police · Aviation safety); in on Patrol and the
  //     pointer clicks Dispatch Patrol 2 (on the beat) → dispatch recorded
  {
    const a = S('lanes').start, b = S('dispatch').end, d = S('dispatch').start;
    shot('lanes', {
      start: a, end: b, frames: [F.s5, F.s6], screens: [[0, F.s5], [B.c2 + 0.1, F.s6, { fade: 0.2 }]],
      cams: [
        [0, Z(1100, 700, 1.7), 0.01],                    // the lanes and the incident-raised notice
        [a - 0.3, Z(1130, 690, 2.0), d - a + 0.2],
        [d - 0.25, Z(1130, 520, 2.8), 0.65],             // the Patrol lane
        [d + 0.4, Z(1100, 545, 3.05), b - d - 0.4],      // in on Dispatch Patrol 2
      ],
      path: seg(d + 0.05, [1240, 690], d + 0.7, P('s5', 'dispatchBtn', 8, 2), B.c2),
      clicks: [B.c2], wins: [[d - 0.15, B.c2 + 0.8]],
      cues() {
        E.cue(a + 0.05, 'notify', 0.45);                 // incident raised, lanes open
        E.cue(B.c2, 'click', 0.8); E.cue(B.c2 + 0.12, 'confirm', 0.5);
      },
    });
  }

  // 5 · response running: the tower decision (Runway 02L arrivals held), then across to the live tile:
  //     PTZ 7-02 video lost · PTZ 7-03 took over, still on the person
  {
    const a = S('running').start, b = S('running').end;
    shot('running', {
      start: a, end: b, frames: [F.s7], screens: [[0, F.s7]],
      cams: [
        [0, Z(1130, 828, 2.65), 0.01],
        [a - 0.3, Z(1130, 838, 2.9), 1.5],               // Aviation safety: the tower decision
        [B.exception - 1.0, Z(642, 455, 2.5), 1.1],      // across to the whole live tile and the hand-over banner
        [B.exception + 0.1, Z(644, 452, 2.56), b - B.exception],   // (tile edges stay inside the frame)
      ],
      cues() { E.cue(a + 0.05, 'notify', 0.38); E.cue(B.exception - 0.9, 'whoosh', 0.25); E.cue(B.exception + 0.1, 'alertSoft', 0.4); },
    });
  }

  // 6 · on scene: the patrol and police with the person on the live tile (PTZ 7-03), handed to police
  {
    const a = S('outcomes').start, b = S('outcomes').end;
    shot('outcomes', {
      start: a, end: b, frames: [F.s8], screens: [[0, F.s8]],
      cams: [[0, Z(642, 462, 2.8), 0.01], [a - 0.3, Z(655, 482, 3.05), b - a + 0.6]],   // tile top edge to the strip labels
      cues() { E.cue(a + 0.05, 'notify', 0.42); },
    });
  }

  // 7 · evidence before closure: six items with source and time, the gate rule, Submit for sign-off
  {
    const a = S('closure').start, b = S('closure').end;
    shot('closure', {
      start: a, end: b, frames: [F.s9], screens: [[0, F.s9]],
      cams: [[0, Z(1130, 495, 2.7), 0.01], [a + 0.2, Z(1130, 640, 2.75), b - a]],
      cues() { E.cue(a + 0.05, 'switch', 0.28, { dur: 0.55 }); },
    });
  }

  // 8 · signed off and closed: PER-005 closed · signed by Daniel L. · badge + PIN · audit record locked,
  //     then the pull back to the whole console (every stage green)
  {
    const a = S('closed').start, b = S('closed').end;
    shot('closed', {
      start: a, end: b, last: true, frames: [F.s10b], screens: [[0, F.s10b]],
      cams: [[0, Z(640, 975, 2.6), 0.01], [a - 0.2, Z(640, 960, 2.75), b - a - 1.3], [b - 1.5, WIDE, 0.9]],   // short pull back
      cues() { E.cue(a + 0.05, 'confirm', 0.45); E.cue(a + 0.3, 'success', 0.5); E.cue(b - 1.4, 'whoosh', 0.25); },
    });
  }
})();
