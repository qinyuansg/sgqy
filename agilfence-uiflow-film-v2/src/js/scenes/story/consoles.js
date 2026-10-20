/* Cut C (story), chapters 3–5 on the V11-faithful AGIL Secure V11 console (real AV frames, 1400×1069, the Incident
   Management frames 1600×1069; DEMO_CLEAN, 2x):
   3 Shows who is there        AV-S1 quiet (1 Critical) → the AgilFence alarm card drops in at the top of the left Real
                               Time Alerts list (the rows below slide down one card, 2 Critical) as the Active Alarms panel,
                               the nearest cameras and the PTZ 7-02 live player in the viewer open themselves (AV-S2, no
                               pointer); in on the card, then the hero push onto the climber on the viewer player; the three
                               tiles; the Investigation tab: 3 alarms linked · one track (T-07) · Health OK, then the
                               authorised-activity check · 4 of 4 sources Clear
   4 Coordinates the response  the pointer clicks the SOP Flow tab (AV-S3) → step 1 Verify the alarm, Confirm intrusion
                               (AV-S4 hover, AV-S5 pressed) → AV-S6 Confirmed · Nurul A. · 02:15:24 (a look across at the left
                               list card, now Incident PER-005), step 2 Dispatch Patrol 2, Dispatch (AV-S7) → AV-S8 police chain and tower decision → AV-S9 PTZ 7-03 took over on the
                               viewer player → AV-S10 handed to police on the viewer player, step 6 outcomes
   5 Closes with evidence      AV-S11 step 7, six evidence items, Submit for sign-off → the duty manager's Incident Management
                               (scan reveal, AV-S12 PER-005 Pending sign-off), Close Incident → AV-S13 the dialog (6 of 6,
                               badge + PIN), Sign and close → AV-S14 PER-005 Closed · Daniel L., pull back to the whole console
   One console device per chapter (the chapter cards sit between them); a camera that pushes in, a pointer for the clicks
   on real V11 controls (the tab, the SOP action buttons, Close Incident, the dialog button). */
(function () {
  'use strict';
  const S = E.S;
  const A = (f, k) => window.ANCH[f][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const DW = 1360, DX = 280, DY = 21;
  const FW = 1400, FH = 1069;
  const ZMAX = 2.9;     // the frames are 2x: 2.9 is about 1.4x upsampling at the tightest push
  const RED = '#FF5A5F';
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
  const VIEWER = A(F.s2, 'viewerPlayer');      // the PTZ live player floating in the 3D viewer
  const HERO = Z(VIEWER[0] + VIEWER[2] / 2, VIEWER[1] + VIEWER[3] / 2 - 2, 2.66);

  const B = (window.BEATS = {
    alarm: S('alarm').start + 1.4,                // AV-S2: the card drops in at the top of the list, the alarm view opens itself
    tab: S('respond').start + 1.3,                // SOP Flow tab             (operator)
    c1: S('respond').start + 3.4,                 // Confirm intrusion        (operator)
    c2: S('respond').start + 5.9,                 // Dispatch Patrol 2        (operator)
    running: S('respond').start + 6.1,            // AV-S8: police chain, tower decision
    handover: S('respond').start + 9.0,           // AV-S9: PTZ 7-02 video lost, PTZ 7-03 took over
    outcomes: S('respond').start + 11.2,          // AV-S10: handed to police
    c3: S('signoff').start - 0.35,                // Submit for sign-off      (operator)
    im: S('signoff').start,                       // the duty manager's Incident Management (scan reveal)
    close: S('signoff').start + 2.0,              // Close Incident           (duty manager)
    dm: S('signoff').start + 4.5,                 // Sign and close           (duty manager)
  });

  // a layer in frame px that moves with the camera (overlays drawn on the V11 frame)
  const layer = (c, z = 3) => E.add(c.dev, `<div class="abs" style="left:0;top:0;width:${FW}px;height:${FH}px;z-index:${z};pointer-events:none;transform-origin:0 0;visibility:hidden"></div>`);
  const sync = (c, el, vis) => E.css(el, { visibility: vis ? 'visible' : 'hidden',
    transform: `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)})` });
  // a window onto a frame: box r (frame px), showing frame src at its own position
  const crop = (parent, src, r) => {
    const box = E.add(parent, `<div class="abs" style="left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px;overflow:hidden"></div>`);
    const img = E.add(box, `<img src="assets/af/${src}.png" style="position:absolute;left:${-r[0]}px;top:${-r[1]}px;width:${FW}px;max-width:none">`);
    return { box, img };
  };
  // a pulsing ring around a box (frame px)
  const ring = (parent, r, pad = 3) => E.add(parent, `<div class="abs" style="left:${r[0] - pad}px;top:${r[1] - pad}px;width:${r[2] + 2 * pad}px;height:${r[3] + 2 * pad}px;border-radius:6px;border:2.5px solid ${RED};box-shadow:0 0 16px 3px rgba(255,90,95,.55),inset 0 0 14px rgba(255,90,95,.2);opacity:0"></div>`);
  const pulse = (t, t0, t1) => E.env(t, t0, t1, 0.25) * (0.7 + 0.3 * Math.cos((t - t0) * Math.PI * 2));

  function consoleScene(id, start, end, def) {
    E.scene({
      id, start, end, inDur: 0.6, outDur: 0.6,
      build(el, s) {
        const c = (s.con = K.console(el, { x: DX, y: DY, w: DW }));
        c.zmax = ZMAX;
        def.frames.forEach(f => c.frame(f));
        c.plan = { screens: def.screens, shots: def.shots };
        // soft dark edges on the device when the camera is in close (slivers of the next panel fade out);
        // they replace the kit's one-sided edge fades, which would darken the viewer player at a tight push
        s.vig = E.add(c.dev, '<div class="abs" style="inset:0;z-index:3;pointer-events:none;opacity:0;background:' +
          'linear-gradient(180deg,#05070D 0,rgba(5,7,13,0) 40px,rgba(5,7,13,0) calc(100% - 48px),#05070D 100%),' +
          'linear-gradient(90deg,#05070D 0,rgba(5,7,13,0) 60px,rgba(5,7,13,0) calc(100% - 60px),#05070D 100%)"></div>');
        s.path = def.path; s.clicks = def.clicks; s.wins = def.wins;
        s.cur = K.cursor(c);
        if (def.build) def.build(c, s);
        def.cues(s);
      },
      update(t, lt, s) {
        const c = s.con;
        const kin = E.ep(t, s.start, s.start + 1.1, 'out5'), kout = E.ep(t, s.end - 0.7, s.end, 'in');
        E.css(c.root, { transform: `perspective(2400px) translate3d(${E.f3(50 * (1 - kin) - 30 * kout)}px,0,0) rotateY(${E.f3(-7 * (1 - kin) + 4 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})`, opacity: E.f3(kin * (1 - kout)) });
        K.bracketsIn(c.brk, E.ep(t, s.start + 0.5, s.start + 1.2) * (1 - kout));
        K.consoleUpdate(c, t);
        E.css(c.edge, { opacity: '0' }); E.css(c.edgeR, { opacity: '0' }); E.css(c.edgeT, { opacity: '0' });
        E.css(s.vig, { opacity: E.f3(E.clamp((c.cam.z - 1.5) / 0.5)) });
        if (def.update) def.update(t, c, s);
        let vis = 0;
        for (const [a, b] of s.wins) vis = Math.max(vis, E.env(t, a, b, 0.25));
        if (s.path.length) K.cursorUpdate(c, s.cur, t, s.path, s.clicks, vis);
        else E.css(s.cur.c, { visibility: 'hidden' });
      },
    });
  }

  // ================= chapter 3 · Shows who is there =================
  {
    const q = S('alarm').start, al = B.alarm, v = S('verify').start, ve = S('verify').end;
    const CARD = A(F.s2, 'fenceCard'), LIST = [40, 296, 336, 449], PANEL = [892, 118, 476, 920], SH = CARD[3];
    const PILLS = [92, 130, 232, 28];   // the severity counter (1 Critical → 2 Critical)
    const i1 = al + 0.75;   // the overlays hand over to AV-S2
    consoleScene('con3', q, ve, {
      frames: [F.s1, F.s2],
      screens: [[q, F.s1], [al, F.s2, { fade: 0.45 }]],
      shots: [
        [q, Z(700, 534, 1.0), 0.1],
        [q + 0.2, Z(700, 528, 1.05), al - q - 0.2],    // a slow drift over the quiet console (1 Critical); the whole
                                                       // Active Alarms panel and the header stay in frame as it opens
        [al + 0.85, Z(362, 352, 1.95), 1.0],           // the alarm card at the top of Real Time Alerts (2 Critical) and
                                                       // the nearest cameras: PTZ 7-02 live · on target
        [al + 3.0, HERO, 1.4],                         // hero: PTZ 7-02 live in the viewer, the person climbing
        [al + 4.5, Z(638, 740, 2.76), 2.4],            //   a slow push while it plays
        [v - 0.4, Z(1140, 360, 2.58), 1.0],            // the event head (Fence Sector 5 · Now) over the three tiles:
                                                       //   PTZ 7-02 live, CAM 7-11 replay, LiDAR L-5B T-07
        [v + 1.3, Z(1130, 668, 2.8), 0.9],             // Investigation: 3 alarms linked · one track (T-07) · Health OK
        [v + 3.2, Z(1130, 830, 2.6), 0.9],             // the authorised-activity check · 4 of 4 sources Clear, Remarks and
                                                       //   the Clear · Escalate · Acknowledge footer fully in
      ],
      path: [], clicks: [], wins: [],
      build(c, s) {
        s.ov = layer(c);
        // the panel region of S1 under the opening panel, then the S2 panel sliding in from the right
        s.pS1 = crop(s.ov, F.s1, PANEL);
        s.pS2 = crop(s.ov, F.s2, PANEL);
        // the list: S1's rows slide down one card while the S2 card slides in at the top
        s.list = E.add(s.ov, `<div class="abs" style="left:${LIST[0]}px;top:${LIST[1]}px;width:${LIST[2]}px;height:${LIST[3]}px;overflow:hidden;background:#191E25"></div>`);
        s.rows = E.add(s.list, `<div class="abs" style="left:0;top:0;width:${LIST[2]}px;height:${LIST[3]}px;overflow:hidden"><img src="assets/af/${F.s1}.png" style="position:absolute;left:${-LIST[0]}px;top:${-LIST[1]}px;width:${FW}px;max-width:none"></div>`);
        s.card = crop(s.list, F.s2, CARD);
        E.css(s.card.box, { left: '0px', top: '0px' });
        E.css(s.card.img, { left: -CARD[0] + 'px', top: -CARD[1] + 'px' });
        s.ring = ring(s.ov, CARD);
        // S1's counter (1 Critical) holds over the crossfading screen until the card lands, then gives way to 2 Critical
        s.pills = crop(s.ov, F.s1, PILLS);
        s.flash = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(760px 560px at 22% 34%, rgba(215,45,48,.34), rgba(215,45,48,0));opacity:0"></div>');
      },
      update(t, c, s) {
        const on = t >= al - 0.05 && t < i1 + 0.05;
        sync(c, s.ov, true);
        const kl = E.ep(t, al, al + 0.55, 'inOut'), kc = E.ep(t, al + 0.15, al + 0.65, 'out'), kp = E.ep(t, al, al + 0.6, 'out');
        E.css(s.list, { visibility: on ? 'visible' : 'hidden' });
        E.css(s.rows, { transform: `translate3d(0,${E.f3(SH * kl)}px,0)` });
        E.css(s.card.box, { opacity: E.f3(Math.min(1, kc * 2)), transform: `translate3d(${E.f3(-CARD[2] * 0.6 * (1 - kc))}px,0,0)` });
        E.css(s.pS1.box, { visibility: on ? 'visible' : 'hidden', opacity: E.f3(1 - E.p(t, al + 0.45, al + 0.6)) });
        E.css(s.pS2.box, { visibility: on ? 'visible' : 'hidden', opacity: E.f3(Math.min(1, kp * 1.6)), transform: `translate3d(${E.f3(120 * (1 - kp))}px,0,0)` });
        E.css(s.ring, { opacity: E.f3(pulse(t, al + 0.6, al + 3.1)) });
        E.css(s.pills.box, { visibility: on ? 'visible' : 'hidden', opacity: E.f3(1 - E.ep(t, al + 0.42, al + 0.56)) });
        E.css(s.flash, { opacity: E.f3(t > al ? (0.5 + 0.5 * Math.cos((t - al) * 9)) * (1 - E.ep(t, al, al + 1.6)) * 0.75 : 0) });
      },
      cues(s) {
        E.cue(q + 0.1, 'whoosh', 0.4);
        E.cue(al, 'alert', 0.75); E.cue(al + 0.75, 'alert', 0.5); E.cue(al + 0.03, 'impactSoft', 0.35);
        E.cue(al + 0.5, 'pop', 0.28);                 // the card lands at the top of the list
        E.cue(al + 1.0, 'blip', 0.22);
        E.cue(al + 3.0, 'whoosh', 0.26); E.cue(al + 3.9, 'notify', 0.3);   // the live player: the person climbing
        E.cue(v - 0.35, 'whoosh', 0.22);
        E.cue(v + 1.4, 'blip', 0.22);                 // one track, health OK
        E.cue(v + 3.4, 'blip', 0.25);                 // checks complete: 4 of 4 Clear
      },
    });
  }

  // ================= chapter 4 · Coordinates the response =================
  {
    const r = S('respond').start, re = S('respond').end;
    const TAB = P('s2', 'tabSop', 6, 4), CF = P('s3', 'confirmBtn', 10, 3), DB = P('s6', 'dispatchBtn', 6, 3);
    consoleScene('con4', r, re, {
      frames: [F.s2, F.s3, F.s4, F.s5, F.s6, F.s7, F.s8, F.s9, F.s10],
      screens: [
        [r, F.s2], [B.tab + 0.05, F.s3, { fade: 0.15 }], [B.c1 - 0.9, F.s4, { fade: 0.3 }], [B.c1 - 0.05, F.s5, { fade: 0.06 }],
        [B.c1 + 0.15, F.s6, { fade: 0.25 }], [B.c2 - 0.05, F.s7, { fade: 0.06 }], [B.c2 + 0.2, F.s8, { fade: 0.35 }],
        [B.handover, F.s9, { fade: 0.45 }], [B.outcomes, F.s10, { fade: 0.5 }],
      ],
      shots: [
        [r, Z(1140, 640, 2.6), 0.1],                    // the tabs: Investigation · SOP Flow
        [B.tab + 0.25, Z(1130, 690, 2.85), 0.8],       // step 1 Verify the alarm: Confirm intrusion · Authorised activity · False alarm
        [B.c1 + 0.3, Z(1130, 700, 2.75), 0.6],         // Confirmed · Nurul A. · 02:15:24; step 2 Dispatch Patrol 2
        [B.c1 + 1.05, Z(362, 352, 1.95), 0.55],        // a look across: the left list card now reads Incident PER-005 ·
        [B.c1 + 1.85, Z(1130, 700, 2.75), 0.5],        //   AgilFence 5-14 · climb; back on step 2 before Dispatch
        [B.c2 + 0.3, Z(1130, 776, 2.72), 0.8],         // police chain (acknowledged, responding) + tower (Runway 02L arrivals held)
        [B.c2 + 1.2, Z(1130, 780, 2.8), B.handover - B.c2 - 1.6],
        [B.handover - 0.35, HERO, 1.0],                // the viewer player: PTZ 7-03 · took over 02:16:42, still on the person
        [B.handover + 0.8, Z(638, 736, 2.74), 1.4],
        [B.outcomes + 0.2, Z(638, 744, 2.7), 2.0],     // patrol and police with the person: Handed to police · AP-12
      ],
      path: [[r + 0.6, 1210, 760], [B.tab - 0.12, ...TAB], [B.tab + 0.55, ...TAB], [B.c1 - 0.55, ...CF], [B.c1 + 0.9, ...CF],
        [B.c2 - 0.15, ...DB], [re, ...DB]],
      clicks: [B.tab, B.c1, B.c2],
      wins: [[r + 0.55, B.c2 + 0.75]],
      build(c, s) {
        s.ov = layer(c);
        s.ring = ring(s.ov, A(F.s6, 'fenceCard'));
      },
      update(t, c, s) {
        sync(c, s.ov, t > B.c1 + 0.9 && t < B.c1 + 2.4);
        E.css(s.ring, { opacity: E.f3(pulse(t, B.c1 + 1.35, B.c1 + 2.0)) });
      },
      cues(s) {
        E.cue(r + 0.1, 'whoosh', 0.35);
        s.clicks.forEach(t => E.cue(t, 'click', 0.8));
        E.cue(B.tab + 0.05, 'switch', 0.22);          // the SOP Flow tab
        E.cue(B.c1 + 0.15, 'confirm', 0.5);           // decision recorded, incident raised
        E.cue(B.c1 + 0.35, 'notify', 0.42);
        E.cue(B.c1 + 1.05, 'whoosh', 0.2); E.cue(B.c1 + 1.5, 'blip', 0.2);   // the list card: Incident PER-005
        E.cue(B.c1 + 1.85, 'whoosh', 0.18);
        E.cue(B.c2 + 0.12, 'confirm', 0.45);          // dispatch recorded
        E.cue(B.running + 0.5, 'notify', 0.36);       // acknowledged: police, duty manager, tower
        E.cue(B.handover + 0.05, 'alertSoft', 0.4);   // PTZ 7-02 lost, PTZ 7-03 took over
        E.cue(B.outcomes + 0.05, 'notify', 0.45);     // handed to police
      },
    });
  }

  // ================= chapter 5 · Closes with evidence =================
  {
    const cl = S('closure').start, end = S('signoff').end;
    const SB = P('s11', 'submitBtn', 8, 3), CB = P('s12', 'closeIncidentBtn', 40, 4), SG = P('s13', 'signBtn', 20, 4);
    const tB = B.dm + 0.12;   // the closed state
    consoleScene('con5', cl, end, {
      frames: [F.s11, F.s12, F.s13, F.s14],
      screens: [[cl, F.s11], [B.im, F.s12], [B.close + 0.1, F.s13, { fade: 0.25 }], [tB, F.s14, { fade: 0.3 }]],   // the duty manager's own console: a scan reveal
      shots: [
        [cl, Z(1130, 806, 2.62), 0.1],                 // step 7: closing is blocked until every item is complete; six items
        [cl + 1.9, Z(1130, 836, 2.72), 1.3],           //   down to Submit for sign-off
        [B.im, Z(445, 382, 1.74), 0.01],               // Incident Management (a cut under the scan reveal): PER-005 · Pending
        [B.im + 0.1, Z(452, 378, 1.8), 1.5],          //   sign-off · Nurul A. 02:43:50
        [B.close - 0.85, Z(1214, 880, 2.0), 0.65],     // the remarks (submitted for sign-off · 6 of 6) and Close Incident
        [B.close + 0.15, Z(800, 546, 1.6), 0.75],      // the Close Incident dialog: evidence 6 of 6, badge + PIN
        [tB + 0.15, WIDE, 1.1],                        // pull back: PER-005 Closed · Daniel L., closed 02:44:20
      ],
      path: [[B.c3 - 1.15, 1240, 860], [B.c3 - 0.15, ...SB], [B.c3 + 0.5, ...SB],
        [B.close - 0.95, 1300, 760], [B.close - 0.12, ...CB], [B.close + 0.9, ...CB], [B.dm - 0.2, ...SG], [end, ...SG]],
      clicks: [B.c3, B.close, B.dm],
      wins: [[B.c3 - 1.2, B.c3 + 0.3], [B.close - 1.0, B.dm + 0.7]],
      cues(s) {
        E.cue(cl + 0.1, 'whoosh', 0.35); E.cue(cl + 0.3, 'switch', 0.25, { dur: 0.55 });
        s.clicks.forEach(t => E.cue(t, 'click', 0.8));
        E.cue(B.c3 + 0.12, 'confirm', 0.45);                                  // submitted
        E.cue(B.im + 0.05, 'whoosh', 0.3);                                    // the duty manager's console
        E.cue(B.close + 0.1, 'pop', 0.3);                                     // the dialog
        E.cue(B.dm + 0.1, 'confirm', 0.45); E.cue(tB + 0.2, 'success', 0.5); // signed off, closed
      },
    });
  }
})();
