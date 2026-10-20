/* Cut B · Highlight: the v2 alarm flow on the V11-faithful AV frames, in eight console shots and one fence plate, cut
   to the score (120 BPM, a beat every 0.5 s). Each shot is its own V11 console (same device, same place) with its
   pushes; consecutive shots cross-dissolve over 0.4 s centred on the window start, the incoming shot on top; the outgoing
   shot holds still through the dissolve, so only one layer moves. Inside a shot the screen changes with the clicks.
   Before the alarm view, the AF-01 fence bay: the climber, the strained sensors pulsing on the cable, Fence Sector 5 ·
   Segment 5-14 (the fence feels it). Then the AgilFence alarm card drops in at the top of the left Real Time Alerts list
   (the rows below slide down, 1 → 2 Critical) as the Active Alarms panel opens itself; the camera goes to the card, then
   onto the climber on the PTZ 7-02 live player. The pointer clicks real V11 controls: the SOP Flow tab, Confirm
   intrusion, Dispatch, Submit for sign-off (operator, 4), then Close Incident and Sign and close (duty manager, on
   Incident Management). Real V11 frames, no labels. */
(function () {
  'use strict';
  const S = E.S;
  const A = (f, k) => window.ANCH[f][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const DW = 1360, DX = 280, DY = 21;
  const FW = 1400, FH = 1069;
  const XD = 0.4;       // cross-dissolve length
  const ENTER = 0.1;    // the first shot enters the stage at a + ENTER, after the product line has gone (no text over the UI)
  const ZMAX = 3.1;     // the frames are 2x: 3.1 is about 1.5x upsampling at the tightest push
  const F = {
    s1: 'AV-S1-quiet', s2: 'AV-S2-auto-open-investigation', s3: 'AV-S3-sop-tab-click', s4: 'AV-S4-verify-step',
    s5: 'AV-S5-confirm-click', s6: 'AV-S6-incident-raised-dispatch', s7: 'AV-S7-dispatch-click',
    s8: 'AV-S8-police-tower-running', s9: 'AV-S9-ptz-handover', s10: 'AV-S10-contained-handed-over',
    s11: 'AV-S11-close-step-submit', s12: 'AV-S12-im-pending-signoff', s13: 'AV-S13-im-sign-dialog', s14: 'AV-S14-im-closed',
  };
  const P = (f, k, dx = 0, dy = 0) => { const [x, y] = mid(A(F[f], k)); return [x + dx, y + dy]; };
  // a framing by centre and zoom (frame px); WIDE is the whole screen
  const Z = (cx, cy, z) => { const w = FW / z, h = FH / z; return [cx - w / 2, cy - h / 2, w, h]; };
  const WIDE = null;
  const RED = '#FF5A5F';

  // ---- the beats (seconds) ----
  const B = (window.BEATS = {
    alarm: S('alarm').start,
    tab: S('verify').start + 2.0,        // SOP Flow tab               (operator click 1, bar line)
    c1: S('verify').start + 4.0,         // Confirm intrusion          (operator click 2, bar line)
    c2: S('dispatch').start + 2.0,       // Dispatch (Patrol 2)        (operator click 3, bar line)
    ticks: S('dispatch').start + 3.0,    // police / tower items tick, one a beat
    ptz: S('alarm').start + 3.0,         // the camera leaves the alarm card for the PTZ 7-02 live player (clock steps)
    handover: S('handover').start,       // PTZ 7-02 video lost → PTZ 7-03 took over
    submit: S('evidence').start + 3.0,   // Submit for sign-off        (operator click 4)
    close: S('im').start + 1.5,          // Close Incident             (duty manager)
    sign: S('closed').start,             // Sign and close             (duty manager, bar line: the score resolves)
  });

  // a layer in frame px that moves with the camera (overlays drawn on the V11 frame)
  const layer = (c, z = 3) => E.add(c.dev, `<div class="abs" style="left:0;top:0;width:${FW}px;height:${FH}px;z-index:${z};pointer-events:none;transform-origin:0 0;visibility:hidden"></div>`);
  const sync = (c, el, vis) => E.css(el, { visibility: vis ? 'visible' : 'hidden',
    transform: `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)})` });
  // a window onto a frame: box r (frame px), showing frame src at its own position (+ an inner offset)
  const crop = (parent, src, r, bg = '') => {
    const box = E.add(parent, `<div class="abs" style="left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px;overflow:hidden;${bg ? 'background:' + bg : ''}"></div>`);
    const img = E.add(box, `<img src="assets/af/${src}.png" style="position:absolute;left:${-r[0]}px;top:${-r[1]}px;width:${FW}px;max-width:none">`);
    return { box, img };
  };
  // a pulsing ring around a box (frame px)
  const ring = (parent, r, col = RED, pad = 3) => E.add(parent, `<div class="abs" style="left:${r[0] - pad}px;top:${r[1] - pad}px;width:${r[2] + 2 * pad}px;height:${r[3] + 2 * pad}px;border-radius:6px;border:2.5px solid ${col};box-shadow:0 0 16px 3px rgba(255,90,95,.55),inset 0 0 14px rgba(255,90,95,.2);opacity:0"></div>`);
  const pulse = (t, t0, t1) => E.env(t, t0, t1, 0.25) * (0.7 + 0.3 * Math.cos((t - t0) * Math.PI * 2));

  let order = 0;
  function shot(id, def) {
    const a = def.start, b = def.end, first = !!def.first, last = !!def.last;
    const idx = order++;
    E.scene({
      id: 'hl-' + id, start: a + (first ? ENTER - 0.05 : -XD / 2), end: b + (last ? 0 : XD / 2), inDur: 0, outDur: 0, ownFade: true,
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
        const kin = first ? E.ep(t, a + ENTER, a + ENTER + 0.9, 'out5') : 1;
        const kout = last ? E.ep(t, b - 0.7, b, 'in') : 0;
        const o = first ? kin * (1 - kout) : E.ep(t, a - XD / 2, a + XD / 2, 'sine') * (1 - kout);
        E.css(s.el, { opacity: E.f3(o), zIndex: String(10 + idx) });
        E.css(c.root, { transform: `perspective(2400px) translate3d(${E.f3(50 * (1 - kin) - 30 * kout)}px,0,0) rotateY(${E.f3(-7 * (1 - kin) + 4 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})` });
        K.bracketsIn(c.brk, first ? E.ep(t, a + ENTER + 0.3, a + ENTER + 1.0) * (1 - kout) : 1 - kout);
        const tt = last ? t : Math.min(t, b - XD / 2);   // the outgoing shot holds still under the dissolve
        K.consoleUpdate(c, tt);
        E.css(c.edge, { opacity: '0' }); E.css(c.edgeR, { opacity: '0' });
        E.css(s.vig, { opacity: E.f3(E.clamp((c.cam.z - 1.6) / 0.6)) });
        if (def.update) def.update(tt, c, s);
        let vis = 0;
        for (const [w0, w1] of def.wins || []) vis = Math.max(vis, E.env(tt, w0, w1, 0.25));
        if (def.path) K.cursorUpdate(c, s.cur, tt, def.path, def.clicks, vis);
        else E.css(s.cur.c, { visibility: 'hidden' });
      },
    });
  }

  // 1 · quiet console, 02:14:50: a slow drift over the airport model; the alert list stays out of frame, so nothing
  //     reads as the incident before the fence feels the climb
  {
    const a = S('quiet').start, b = S('quiet').end;
    shot('quiet', {
      start: a, end: b, first: true, frames: [F.s1], screens: [[0, F.s1]],
      cams: [[0, Z(915, 520, 1.62), 0.01], [a - 0.2, Z(925, 515, 1.5), b - a + 0.4]],
      cues() { E.cue(a + ENTER - 0.05, 'whoosh', 0.35); },
    });
  }

  // 1b · the fence feels it: the AF-01 fence bay (crop (40,244)+(1960×1180), plate px = crop px / 2 → 980×590).
  //      The climber's hands on the top rail, the five strained sensors pulse red on the cable (y 278.5), two signal
  //      pulses run left along the fibre; the callout reads Fence Sector 5 · Segment 5-14. A slow push in.
  {
    const a = S('fence').start, b = S('fence').end, idx = order++;
    const IW = 980, IH = 590, VH = Math.round(DW * FH / FW), SENS = [450, 494, 537.5, 625.5, 670], CY = 278.5;
    const SH = [[a - XD / 2, [150, 40, 760, 430], 0.01], [a - XD / 2, [300, 20, 580, 400], b - a + XD, 'sine']];
    const zfit = Math.max(DW / IW, VH / IH), zmax = 2.6;
    const camAt = t => {
      const toP = r => { const z = E.clamp(Math.min(DW / r[2], VH / r[3]), zfit, zmax); return [r[0] + r[2] / 2, r[1] + r[3] / 2, Math.log(z)]; };
      let q = toP(SH[0][1]);
      for (const [ts, r, d, ez = 'inOut'] of SH) { if (t < ts) break; const n = toP(r), k = E.ease[ez](E.p(t, ts, ts + d)); q = [E.lerp(q[0], n[0], k), E.lerp(q[1], n[1], k), E.lerp(q[2], n[2], k)]; }
      const z = Math.exp(q[2]);
      return { z, ox: E.clamp(DW / 2 - q[0] * z, DW - IW * z, 0), oy: E.clamp(VH / 2 - q[1] * z, VH - IH * z, 0) };
    };
    const rng = (el, k, r0, r1, al) => { E.attr(el, 'r', E.f3(E.lerp(r0, r1, E.ease.out(k)))); E.attr(el, 'opacity', E.f3(k <= 0 || k >= 1 ? 0 : al * (1 - k))); };
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
          rng(el, t < t0 ? -1 : ph - Math.floor(ph), 7, 30, 0.85);
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

  // 2 · the alarm: on the whole console (AV-S1 → AV-S2) the AgilFence alarm card drops in at the top of Real Time Alerts
  //     (the rows below slide down one card, the counters go to 2 Critical) and the Active Alarms panel opens itself
  //     (no pointer); in on the card (red pulse: Fence Sector 5 · AgilFence alarm · segment 5-14 · climb · Now), then
  //     the hero push onto the climber on the PTZ 7-02 live player
  {
    const a = S('alarm').start, b = S('alarm').end;
    const CARD = A(F.s2, 'fenceCard'), LIST = [40, 296, 336, 449], PANEL = [892, 118, 476, 920], SH = CARD[3];
    const i0 = a + 0.2, i1 = a + 0.9;      // the insert (S1 → S2), as soon as the console has dissolved in (a + XD/2)
    shot('alarm', {
      start: a, end: b, frames: [F.s1, F.s2], screens: [[0, F.s1], [i0, F.s2, { fade: 0.4 }]],
      cams: [
        [0, WIDE, 0.01],
        [a + 1.5, Z(232, 372, 2.55), 1.0],      // the whole console holds with the card in place (i0 + 0.65 → a + 1.5),
                                                // then in on the alarm card at the top of the list
        [B.ptz, Z(638, 736, 2.8), 1.2],         // across to the PTZ 7-02 live player: the climber
        [B.ptz + 1.2, Z(638, 724, 3.05), b - B.ptz - 1.0],
      ],
      build(c, s) {
        s.ov = layer(c);
        // the panel region of S1 under the opening panel, then the S2 panel sliding in from the right
        s.pS1 = crop(s.ov, F.s1, PANEL);
        s.pS2 = crop(s.ov, F.s2, PANEL);
        // the list: S1's rows slide down one card while the S2 card slides in at the top
        // (box = the list area in S1's list colour; rows = S1's rows only, moving down; card = S2's card)
        s.list = { box: E.add(s.ov, `<div class="abs" style="left:${LIST[0]}px;top:${LIST[1]}px;width:${LIST[2]}px;height:${LIST[3]}px;overflow:hidden;background:#191E25"></div>`) };
        s.list.img = E.add(s.list.box, `<div class="abs" style="left:0;top:0;width:${LIST[2]}px;height:${LIST[3]}px;overflow:hidden"><img src="assets/af/${F.s1}.png" style="position:absolute;left:${-LIST[0]}px;top:${-LIST[1]}px;width:${FW}px;max-width:none"></div>`);
        s.card = crop(s.list.box, F.s2, CARD);
        E.css(s.card.box, { left: '0px', top: '0px' });
        E.css(s.card.img, { left: -CARD[0] + 'px', top: -CARD[1] + 'px' });
        s.ring = ring(s.ov, CARD);
        s.flash = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(700px 520px at 18% 32%, rgba(215,45,48,.34), rgba(215,45,48,0));opacity:0"></div>');
      },
      update(t, c, s) {
        const on = t < i1 + 0.05;
        sync(c, s.ov, true);
        const kl = E.ep(t, i0, i0 + 0.55, 'inOut'), kc = E.ep(t, i0 + 0.15, i0 + 0.65, 'out'), kp = E.ep(t, i0, i0 + 0.6, 'out');
        E.css(s.list.box, { visibility: on ? 'visible' : 'hidden' });
        E.css(s.list.img, { transform: `translate3d(0,${E.f3(SH * kl)}px,0)` });
        // the card lives only in the gap the moving rows open (clipped to SH * kl), so it never sits on top of a row
        E.css(s.card.box, { opacity: E.f3(Math.min(1, kc * 2)), transform: `translate3d(${E.f3(-CARD[2] * 0.6 * (1 - kc))}px,0,0)`,
          clipPath: `inset(0 0 ${E.f3(SH * (1 - kl))}px 0)` });
        E.css(s.pS1.box, { visibility: on ? 'visible' : 'hidden', opacity: E.f3(1 - E.p(t, i0 + 0.45, i0 + 0.6)) });
        E.css(s.pS2.box, { visibility: on ? 'visible' : 'hidden', opacity: E.f3(Math.min(1, kp * 1.6)), transform: `translate3d(${E.f3(120 * (1 - kp))}px,0,0)` });
        E.css(s.ring, { opacity: E.f3(pulse(t, i1 - 0.1, B.ptz + 0.2)) });
        E.css(s.flash, { opacity: E.f3(t > a ? (0.5 + 0.5 * Math.cos((t - a) * 9)) * (1 - E.ep(t, a, a + 1.6)) * 0.8 : 0) });
      },
      cues() {
        E.cue(a, 'alert', 0.75); E.cue(a + 0.75, 'alert', 0.5); E.cue(a + 0.02, 'impactSoft', 0.4);
        E.cue(i0, 'whoosh', 0.22); E.cue(i0 + 0.5, 'pop', 0.3); E.cue(a + 1.55, 'blip', 0.22);
        E.cue(B.ptz, 'whoosh', 0.28); E.cue(B.ptz + 1.0, 'notify', 0.26);
      },
    });
  }

  // 3 · verification: the Investigation tab (3 alarms linked · one track (T-07), health OK on each row; the
  //     authorised-activity check, 4 of 4 sources Clear), the pointer clicks the SOP Flow tab → step 1 Verify the alarm
  //     (live feed now on auto-track T-07), Confirm intrusion → step 1 Confirmed · Nurul A. · 02:15:24, step 2 Dispatch
  //     Patrol 2 opens
  {
    const a = S('verify').start, b = S('verify').end;
    const TAB = P('s2', 'tabSop', 6, 4), CF = P('s3', 'confirmBtn', 10, 3);
    shot('verify', {
      start: a, end: b, frames: [F.s2, F.s3, F.s4, F.s5, F.s6],
      screens: [[0, F.s2], [B.tab + 0.05, F.s3, { fade: 0.15 }], [B.c1 - 0.85, F.s4, { fade: 0.3 }],
        [B.c1 - 0.05, F.s5, { fade: 0.06 }], [B.c1 + 0.15, F.s6, { fade: 0.22 }]],
      cams: [
        [0, Z(1130, 668, 2.7), 0.01],
        [a - 0.3, Z(1130, 676, 2.95), 1.3],              // 3 alarms linked · one track · health OK
        [a + 1.0, Z(1130, 806, 2.85), 0.7],              // the authorised-activity check · 4 of 4 Clear
        [B.tab - 0.6, Z(1130, 640, 2.55), 0.55],         // up to the tabs
        [B.tab + 0.3, Z(1130, 690, 2.85), 0.8],          // step 1 · Verify the alarm
        [B.c1 + 0.4, Z(1130, 700, 2.7), b - B.c1 - 0.4], // Confirmed; step 2 opens
      ],
      path: [[B.tab - 0.7, 1210, 760], [B.tab - 0.12, ...TAB], [B.tab + 0.55, ...TAB], [B.c1 - 0.6, ...CF], [b, ...CF]],
      clicks: [B.tab, B.c1], wins: [[B.tab - 0.75, B.c1 + 0.8]],
      cues() {
        E.cue(a + 0.05, 'switch', 0.25, { dur: 0.55 }); E.cue(a + 1.05, 'blip', 0.2);
        E.cue(B.tab, 'click', 0.75); E.cue(B.tab + 0.05, 'switch', 0.2);
        E.cue(B.c1, 'click', 0.8); E.cue(B.c1 + 0.15, 'confirm', 0.5);
      },
    });
  }

  // 4 · incident raised: the whole console (the card now reads Incident PER-005 · AgilFence 5-14 · climb; the toast
  //     Incident PER-005 raised from alarm AGF-5-14 · history inherited), in on step 2 and the pointer clicks Dispatch;
  //     step 2 goes En route and the camera goes down to the police and tower items as they tick, one a beat
  {
    const a = S('dispatch').start, b = S('dispatch').end;
    const DB = P('s6', 'dispatchBtn', 6, 3), CARD = A(F.s6, 'fenceCard'), TOAST = A(F.s6, 'incidentToast');
    // AV-S8 rows that tick (frame px centres): police Contacted, Acknowledged, Responding, On scene (pending) +
    // Duty manager acknowledged, then tower ATC supervisor (arrivals held), Restriction active
    const ROWS = [[730.5], [752], [774.5], [796, 818.5], [908.5], [930]];
    shot('dispatch', {
      start: a, end: b, frames: [F.s6, F.s7, F.s8],
      screens: [[0, F.s6], [B.c2 - 0.05, F.s7, { fade: 0.06 }], [B.c2 + 0.2, F.s8, { fade: 0.25 }]],
      cams: [
        [0, Z(612, 600, 1.2), 0.01],                      // the whole console: card, toast, map label, SOP
        [a - 0.3, Z(606, 604, 1.26), 1.4],
        [a + 1.1, Z(1118, 706, 2.8), 0.75],               // in on step 2 · Dispatch
        [B.c2 + 0.3, Z(1130, 800, 2.6), 0.75],            // down to police + tower
        [B.c2 + 1.1, Z(1130, 808, 2.68), b - B.c2 - 1.1],
      ],
      build(c, s) {
        s.ov = layer(c);
        s.ring = ring(s.ov, CARD); s.ringT = ring(s.ov, TOAST, '#5BD16B');
        E.css(s.ringT, { boxShadow: '0 0 16px 3px rgba(91,209,107,.45)' });
        s.masks = ROWS.map(g => g.map(y => E.add(s.ov, `<div class="abs" style="left:950px;top:${y - 10.5}px;width:386px;height:21px;background:#4F545E"></div>`)));
      },
      update(t, c, s) {
        sync(c, s.ov, true);
        E.css(s.ring, { opacity: E.f3(pulse(t, a + 0.1, a + 1.3)) });
        E.css(s.ringT, { opacity: E.f3(pulse(t, a + 0.1, a + 1.3) * 0.9) });
        const s8 = t >= B.c2 + 0.2;
        s.masks.forEach((g, i) => g.forEach(m => {
          const k = E.ep(t, B.ticks + i * 0.5, B.ticks + i * 0.5 + 0.22, 'out');
          E.css(m, { visibility: s8 && k < 1 ? 'visible' : 'hidden', clipPath: `inset(0 0 0 ${(k * 100).toFixed(1)}%)` });
        }));
      },
      path: [[a + 1.0, 1150, 820], [B.c2 - 0.15, ...DB], [b, ...DB]],
      clicks: [B.c2], wins: [[a + 0.95, B.c2 + 0.8]],
      cues() {
        E.cue(a + 0.05, 'notify', 0.42);                 // incident raised
        E.cue(a + 1.1, 'whoosh', 0.22);
        E.cue(B.c2, 'click', 0.8); E.cue(B.c2 + 0.12, 'confirm', 0.45);
        ROWS.forEach((g, i) => { if (i !== 3) E.cue(B.ticks + i * 0.5, 'tick', 0.35); else E.cue(B.ticks + i * 0.5, 'blip', 0.18); });
      },
    });
  }

  // 5 · keep target in view: PTZ 7-02 video lost · PTZ 7-03 took over, the tile still on the person (T-07)
  {
    const a = S('handover').start, b = S('handover').end;
    shot('handover', {
      start: a, end: b, frames: [F.s9], screens: [[0, F.s9]],
      cams: [[0, Z(1060, 452, 2.55), 0.01], [a - 0.3, Z(1024, 430, 3.05), 1.6], [a + 1.3, Z(1026, 434, 3.1), b - a - 1.1]],
      cues() { E.cue(a + 0.05, 'alertSoft', 0.4); E.cue(a + 0.9, 'notify', 0.25); },
    });
  }

  // 6 · contained and handed over: the patrol and Airport Police with the person on the live player (PTZ 7-03),
  //     Handed to police · AP-12; then step 6 with the outcomes (contained → intercepted → detained → handed to police)
  {
    const a = S('handed').start, b = S('handed').end;
    shot('handed', {
      start: a, end: b, frames: [F.s10], screens: [[0, F.s10]],
      cams: [[0, Z(640, 736, 2.6), 0.01], [a - 0.3, Z(642, 744, 2.85), 1.9], [a + 1.6, Z(1130, 786, 2.75), 0.85], [a + 2.45, Z(1130, 790, 2.8), b - a - 2.25]],
      cues() { E.cue(a + 0.05, 'notify', 0.42); E.cue(a + 1.6, 'whoosh', 0.2); },
    });
  }

  // 7 · evidence before closure: step 7 Secure, close and report: closing is blocked until every item is complete,
  //     six items with source and time; the pointer clicks Submit for sign-off
  {
    const a = S('evidence').start, b = S('evidence').end;
    const SB = P('s11', 'submitBtn', 8, 3);
    shot('evidence', {
      start: a, end: b, frames: [F.s11], screens: [[0, F.s11]],
      cams: [[0, Z(1130, 772, 2.85), 0.01], [a - 0.3, Z(1130, 790, 2.75), 1.5], [a + 1.4, Z(1128, 820, 2.65), b - a - 1.2]],
      path: [[B.submit - 0.95, 1240, 860], [B.submit - 0.15, ...SB], [b, ...SB]],
      clicks: [B.submit], wins: [[B.submit - 1.0, b + 0.3]],
      cues() { E.cue(a + 0.05, 'switch', 0.28, { dur: 0.55 }); E.cue(B.submit, 'click', 0.8); E.cue(B.submit + 0.12, 'confirm', 0.42); },
    });
  }

  // 8 · Incident Management, the duty manager: PER-005 Pending sign-off (Nurul A. · 02:43:50); the pointer clicks Close
  //     Incident → the Close Incident dialog (evidence 6 of 6, badge + PIN, signed in as Daniel L. · Duty manager);
  //     Sign and close → PER-005 Closed · Daniel L.; Closed 02:44:20 · signed off by Daniel L. · badge + PIN; pull back
  {
    const a = S('im').start, b = S('closed').end;
    const CB = P('s12', 'closeIncidentBtn', 40, 4), SG = P('s13', 'signBtn', 20, 4);
    shot('im', {
      start: a, end: b, last: true, frames: [F.s12, F.s13, F.s14],
      screens: [[0, F.s12], [B.close + 0.1, F.s13, { fade: 0.25 }], [B.sign + 0.12, F.s14, { fade: 0.25 }]],
      cams: [
        [0, Z(530, 338, 2.15), 0.01],                    // PER-005 · Pending sign-off
        [a - 0.3, Z(540, 332, 2.3), 1.0],
        [a + 0.75, Z(1214, 900, 2.04), 0.65],            // down to Close Incident (the whole button)
        [B.close + 0.15, Z(800, 546, 1.58), 0.75],       // the Close Incident dialog
        [B.sign + 0.2, WIDE, 1.0],                       // pull back: PER-005 closed
      ],
      path: [[a + 0.8, 1300, 760], [B.close - 0.12, ...CB], [B.close + 0.9, ...CB], [B.sign - 0.2, ...SG], [b, ...SG]],
      clicks: [B.close, B.sign], wins: [[a + 0.75, B.sign + 0.8]],
      cues() {
        E.cue(a + 0.05, 'switch', 0.3, { dur: 0.55 });
        E.cue(B.close, 'click', 0.8); E.cue(B.close + 0.1, 'pop', 0.3);
        E.cue(B.sign, 'click', 0.8); E.cue(B.sign + 0.1, 'success', 0.5); E.cue(B.sign + 0.25, 'stamp', 0.3);
      },
    });
  }
})();
