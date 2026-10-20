/* Cut A · Operator flow: the AgilFence alarm flow v2 on the original AGIL Secure V11 screens. The alarm view opens
   itself and the AgilFence alarm card takes the top of the Real Time Alerts list; the operator makes four clicks
   (SOP Flow tab · Confirm intrusion · Dispatch · Submit for sign-off); the duty manager closes the incident on his own
   Incident Management console (Close Incident · Sign and close); the operator's console returns to quiet with the
   card gone from the list. Then a short alternative path on another night (approved works: the alarm card flashes at
   the top of the list; SOP Flow tab · Authorised activity, no incident). Real V11 frames (DEMO_CLEAN; 1400×1069, Incident Management 1600×1069), a camera
   that pushes in on the panel in play, a pointer that clicks the real controls, and no labels. */
(function () {
  'use strict';
  const S = E.S;
  const A = (f, k) => window.ANCH[f][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const DW = 1360, DX = 280, DY = 21;
  const F = {
    s1: 'AV-S1-quiet', s2: 'AV-S2-auto-open-investigation', s3: 'AV-S3-sop-tab-click', s4: 'AV-S4-verify-step',
    s5: 'AV-S5-confirm-click', s6: 'AV-S6-incident-raised-dispatch', s7: 'AV-S7-dispatch-click',
    s8: 'AV-S8-police-tower-running', s9: 'AV-S9-ptz-handover', s10: 'AV-S10-contained-handed-over',
    s11: 'AV-S11-close-step-submit', s11b: 'AV-S11b-pending-signoff', s12: 'AV-S12-im-pending-signoff', s13: 'AV-S13-im-sign-dialog', s14: 'AV-S14-im-closed',
    s15: 'AV-S15-operator-closed',
    a1: 'AV-A1-permit-found', a1b: 'AV-A1b-authorised-click', a2: 'AV-A2-cleared-authorised',
  };
  // the centre of a control, nudged so the pointer's tip sits on its label
  const P = (f, k, dx = 0, dy = 0) => { const [x, y] = mid(A(F[f], k)); return [x + dx, y + dy]; };
  const pad = (r, px, py = px) => [r[0] - px, r[1] - py, r[2] + 2 * px, r[3] + 2 * py];
  const WIDE = null;
  // a shot by its centre and zoom (frame px; the device shows 1400/z × 1069/z frame px; the console allows z ≤ 2.7)
  const Z = (cx, cy, z) => [cx - 700 / z, cy - 534.5 / z, 1400 / z, 1069 / z];
  // framings whose side edges fall in the gaps between the V11 columns (the list ends at x 376, the centre column
  // spans 394–884, the right panel starts at 900), so no column is sliced and no edge fade is needed
  const LIST = Z(446, 350, 1400 / 892);             // the Real Time Alerts list, the nearest cameras and the viewer
  const HERO = Z(640, 746, 2.65);                   // the live player floating in the 3D viewer
  const TOAST = Z(640, 970, 2.65);                  // the notice under the viewer (bottom of the screen)
  const MAP = Z(640, 470, 2.65);                    // the 3D view around segment 5-14
  // right-panel framings (the kit's widened left fade covers the clipped centre column)
  const RP = (cy, z = 2.3) => Z(1130, cy, z);
  const TILES = RP(400);                            // alarm header + the three tiles
  const PANEL = [900, 125, 460, 904];               // the whole Active Alarms panel
  const INV = RP(790, 2.2);                         // the Investigation tab body, top edge on the tab row
  const TABS = RP(560);                             // tiles' lower half, the tab row, the top of the tab body
  const STEP1 = RP(700);                            // SOP step 1 (Verify the alarm) with its buttons, steps 2–4 below

  // ---- the beats (seconds) ----
  const B = (window.BEATS = {
    alarm: S('alarm').start,
    c1: S('verify').end - 0.2,      // SOP Flow tab               (operator click 1)
    c2: S('decide').end - 0.2,      // Confirm intrusion          (operator click 2)
    c3: S('raised').end - 0.2,      // Dispatch (Patrol 2)        (operator click 3)
    c4: S('closure').end - 0.2,     // Submit for sign-off        (operator click 4)
    dm1: S('signoff').start + 5.6,  // Close Incident             (duty manager, Incident Management)
    dm2: S('signoff').end - 0.2,    // Sign and close             (duty manager, badge + PIN)
    a1: S('alt').start + 7.7,       // SOP Flow tab               (alternative path, operator click 1)
    a2: S('alt').end - 0.2,         // Authorised activity        (alternative path, operator click 2)
    back: S('closed').start + 3.2,  // back on the operator's console (Nurul A.): the card has left the list
  });
  B.raised = B.c2 + 0.35;           // Incident PER-005 raised from alarm AGF-5-14

  const GAPS = [[370, 402], [878, 906]];
  const curScreen = (scr, t) => { let n = scr[0][1]; for (const e of scr) if (t >= e[0]) n = e[1]; return n; };
  // the new alert flashes on its card in the Real Time Alerts list (two red pulses over 2.2 s from t0)
  const pulseBuild = c => E.add(c.dev, '<div class="abs" style="z-index:4;border:2px solid rgba(255,96,98,.95);border-radius:8px;box-shadow:0 0 26px 6px rgba(215,45,48,.5),inset 0 0 18px rgba(215,45,48,.35);opacity:0;visibility:hidden"></div>');
  function pulseUpdate(c, el, t, t0, rc) {
    const t1 = t0 + 2.2;
    if (t > t0 && t < t1) {
      const [x0, y0] = K.map(c, rc[0], rc[1]), [x1, y1] = K.map(c, rc[0] + rc[2], rc[1] + rc[3]);
      const k = (0.5 - 0.5 * Math.cos((t - t0) / (t1 - t0) * 4 * Math.PI)) * (1 - E.ep(t, t1 - 0.6, t1, 'in'));
      E.css(el, { visibility: 'visible', opacity: E.f3(0.85 * k), left: x0.toFixed(1) + 'px', top: y0.toFixed(1) + 'px', width: (x1 - x0).toFixed(1) + 'px', height: (y1 - y0).toFixed(1) + 'px' });
    } else E.css(el, { visibility: 'hidden', opacity: '0' });
  }
  // one console device: frames, camera plan, pointer, sound cues
  function consoleScene(id, start, end, def) {
    E.scene({
      id, start, end, inDur: 0.6, outDur: 0.6,
      build(el, s) {
        const c = (s.con = K.console(el, { x: DX, y: DY, w: DW }));
        c.zmax = 2.7;   // the hero, notice and map framings fit one V11 column exactly
        def.frames.forEach(f => c.frame(f));
        c.plan = { screens: def.screens, shots: def.shots };
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
        // the side columns are narrower than the kit's edge fades expect: widen them when zoomed in close
        // (on the right panel the left fade covers the clipped 3D-viewer column)
        const fcx = (c.VW / 2 - c.cam.ox) / c.cam.k, kl = E.clamp((c.cam.z - 1.9) / 0.4) * E.clamp((fcx - 1000) / 80);
        E.css(c.edge, { width: (190 + 110 * kl).toFixed(1) + 'px', background: `linear-gradient(90deg,#05070D ${(42 + 38 * kl).toFixed(1)}%,rgba(5,7,13,0))` });
        const kr = E.clamp((c.cam.z - 1.9) / 0.4) * E.clamp((760 - fcx) / 80);
        E.css(c.edgeR, { width: (190 - 40 * kr).toFixed(1) + 'px', background: `linear-gradient(270deg,#05070D ${(42 + 40 * kr).toFixed(1)}%,rgba(5,7,13,0))` });
        // a framing whose edge falls in a gap between the V11 columns needs no fade on that side
        if ((window.FRAMES[curScreen(def.screens, t)] || [1400])[0] === 1400) {
          const fx0 = -c.cam.ox / c.cam.k, fx1 = (c.VW - c.cam.ox) / c.cam.k, gap = x => GAPS.some(([a, b]) => x >= a && x <= b);
          if (gap(fx0)) E.css(c.edge, { opacity: '0' });
          if (gap(fx1)) E.css(c.edgeR, { opacity: '0' });
        }
        if (def.update) def.update(t, c, s);
        let vis = 0;
        for (const [a, b] of s.wins) vis = Math.max(vis, E.env(t, a, b, 0.25));
        K.cursorUpdate(c, s.cur, t, s.path, s.clicks, vis);
      },
    });
  }

  // ================= main path: 02:14:50 → 02:44:20 =================
  {
    const q = S('quiet').start, al = S('alarm').start, v = S('verify').start, d = S('decide').start, r = S('raised').start;
    const ru = S('running').start, h = S('handover').start, o = S('outcomes').start, cl = S('closure').start;
    const so = S('signoff').start, cd = S('closed').start;
    const tg = {
      tab: P('s2', 'tabSop', 6, 2), confirm: P('s4', 'confirmBtn', 8, 2), dispatch: P('s6', 'dispatchBtn', 4, 2),
      submit: P('s11', 'submitBtn', 10, 2), close: P('s12', 'closeIncidentBtn', 14, 2), sign: P('s13', 'signBtn', 18, 2),
    };
    const tS13 = B.dm1 + 0.1, tS14 = B.dm2 + 0.15;
    consoleScene('console', q, S('closed').end, {
      frames: [F.s1, F.s2, F.s3, F.s4, F.s5, F.s6, F.s7, F.s8, F.s9, F.s10, F.s11, F.s11b, F.s12, F.s13, F.s14, F.s15],
      screens: [
        [q, F.s1],
        [al, F.s2, { fade: 0.2 }],                       // the alarm view opens itself; the card takes the top of the list (short fade: no ghost of the old top card)
        [B.c1 + 0.1, F.s3, { fade: 0.2 }],               // SOP Flow tab
        [d + 3.5, F.s4, { fade: 0.25 }],                 // the live tile follows the track; Confirm intrusion under the pointer
        [B.c2 - 0.06, F.s5, { fade: 0.06 }],             // Confirm intrusion pressed
        [B.raised, F.s6, { fade: 0.3 }],                 // Incident PER-005 raised; step 2 Dispatch Patrol 2
        [B.c3 - 0.06, F.s7, { fade: 0.06 }],             // Dispatch pressed
        [ru + 0.25, F.s8, { fade: 0.5 }],                // police chain, tower decision, Patrol 2 on the map
        [h, F.s9, { fade: 0.5 }],                        // PTZ 7-02 video lost, PTZ 7-03 took over
        [o, F.s10, { fade: 0.6 }],                       // contained, handed over to police
        [cl, F.s11, { fade: 0.5 }],                      // step 7: the evidence gate and Submit for sign-off
        [B.c4 + 0.3, F.s11b, { fade: 0.3 }],             // submitted: the top list card reads Pending sign-off
        [so + 0.1, F.s12],                               // the duty manager's own console: a scan reveal, not a crossfade
        [tS13, F.s13, { fade: 0.25 }],                   // Close Incident dialog: badge + PIN
        [tS14, F.s14, { fade: 0.35 }],                   // closed, signed off
        [B.back, F.s15],                                 // back to the operator's console: the same scan reveal
      ],
      shots: [
        [q, WIDE, 0.1],
        [q + 0.8, LIST, 1.4],                         // the quiet list: 1 Critical, Staff Door D-214 on top
        [al + 2.4, WIDE, 1.0],                        // the alarm view has opened itself (no pointer)
        [al + 4.0, HERO, 1.5],                        // hero: PTZ 7-02 live in the viewer, the person climbing (lands 12.5 s)
        [al + 8.0, TILES, 1.3],                       // the three tiles: PTZ 7-02 live, CAM 7-11 replay, LiDAR L-5B
        [al + 10.6, PANEL, 1.1],                      // the whole Active Alarms panel, Investigation tab open
        [v, INV, 1.3],                                // 3 alarms linked · one track (T-07) · Health OK; 4 of 4 sources Clear
        [v + 6.8, TABS, 1.0],                         // the tab row: SOP Flow
        [d + 0.1, STEP1, 1.1],                        // step 1 Verify the alarm: Your decision
        [d + 2.0, RP(528), 1.2],                      // the live tile with step 1: the feed follows the track
        [d + 6.0, STEP1, 1.2],                        // Confirm intrusion
        [r + 2.2, TOAST, 1.2],                        // Incident PER-005 raised from alarm AGF-5-14 · history inherited
        [r + 4.4, LIST, 1.3],                         // the list: Incident PER-005 on the top card, 2 Critical (holds 2.3 s)
        [r + 8.0, RP(830), 1.2],                      // police requested, duty manager informed; tower notified
        [r + 10.2, STEP1, 1.1],                       // back to step 2: Dispatch
        [ru + 0.3, RP(740), 1.2],                     // police chain: acknowledged, responding, ETA
        [ru + 2.6, RP(850), 1.2],                     // tower: Runway 02L arrivals held (ATC)
        [ru + 4.6, MAP, 1.2],                         // the map: Patrol 2 en route, PTZ 7-02 tracking, Runway 02L held
        [h, HERO, 1.3],                               // PTZ 7-03 took over 02:16:42, the person still in frame
        [h + 2.8, RP(780), 1.2],                      // step 5 Keep target in view: the automatic hand-over
        [o + 0.1, HERO, 1.2],                         // patrol and police with the person: handed to police
        [o + 3.2, RP(790), 1.2],                      // step 6: contained → intercepted → detained → handed to police
        [cl + 0.1, RP(788, 2.2), 1.2],                // step 7: closing is blocked until every item is complete (tab row to footer, whole)
        [cl + 4.8, RP(832), 1.0],                     // Submit for sign-off (top edge under the tab row)
        [B.c4 + 0.35, LIST, 1.0],                     // the list: Incident PER-005 · Pending sign-off on the top card
        [so - 0.1, WIDE, 1.0],                        // the duty manager's Incident Management
        [so + 1.3, [30, 270, 830, 120], 1.1],         // PER-005 · Pending sign-off · Nurul A. 02:43:50
        [so + 3.0, Z(1210, 440, 2.0), 1.0],           // the incident: raised from AGF-5-14, sealed clips
        [so + 4.3, Z(1210, 790, 2.0), 0.9],           // remarks and Close Incident
        [so + 5.9, pad(A(F.s13, 'signDialog'), 6), 1.0],   // the dialog: six items, badge + PIN, Sign and close
        [cd + 0.1, [30, 600, 830, 420], 1.0],         // PER-005 closed · signed by Daniel L. · audit record locked
        [cd + 1.6, WIDE, 1.0],                        // the closed row, the notice, Closed 02:44:20 · signed off by Daniel L.
        [B.back, WIDE, 0.7],                          // the operator's console (1400 wide after the 1600-wide IM): quiet, the closure notice
        [B.back + 1.2, LIST, 1.3],                    // the card has left the list: 1 Critical again
      ],
      path: [
        [v + 7.2, 1180, 820], [v + 8.6, ...tg.tab], [d + 2.2, ...tg.tab], [d + 3.4, ...tg.confirm], [B.c2 + 0.6, ...tg.confirm],
        [r + 10.6, 1180, 810], [r + 12.0, ...tg.dispatch], [B.c3 + 0.6, ...tg.dispatch],
        [cl + 5.6, 1220, 830], [cl + 7.0, ...tg.submit], [B.c4 + 0.6, ...tg.submit],
        [so + 4.2, 1100, 760], [so + 5.2, ...tg.close], [so + 7.0, ...tg.close], [so + 8.5, ...tg.sign], [B.dm2 + 0.6, ...tg.sign],
      ],
      clicks: [B.c1, B.c2, B.c3, B.c4, B.dm1, B.dm2],
      wins: [[v + 7.0, B.c2 + 0.5], [r + 10.4, B.c3 + 0.5], [cl + 5.4, B.c4 + 0.6], [so + 4.0, B.dm2 + 0.6]],
      build(c, s) { s.pulse = pulseBuild(c); },      // the new alert flashes as it takes the top of the Real Time Alerts list
      update(t, c, s) { pulseUpdate(c, s.pulse, t, B.alarm + 0.25, A(F.s2, 'fenceCard')); },
      cues(s) {
        E.cue(s.start + 0.1, 'whoosh', 0.45);
        // the alarm: tone, no pointer; the view opened itself (notify)
        E.cue(al, 'alert', 0.75); E.cue(al + 0.9, 'alert', 0.5); E.cue(al + 0.05, 'impactSoft', 0.35); E.cue(al + 1.9, 'notify', 0.32);
        E.cue(v + 3.9, 'blip', 0.25);                                          // the authorised-activity check: Clear
        s.clicks.forEach(t => E.cue(t, 'click', 0.8));
        E.cue(B.c1 + 0.1, 'switch', 0.3, { dur: 0.55 });                       // SOP Flow tab
        E.cue(B.c2 + 0.12, 'confirm', 0.5);                                    // decision recorded
        E.cue(B.raised + 0.05, 'notify', 0.5);                                 // Incident PER-005 raised
        E.cue(B.c3 + 0.12, 'confirm', 0.5);                                    // dispatch recorded
        E.cue(ru + 0.3, 'notify', 0.4);                                        // acknowledged: police, duty manager, tower
        E.cue(h + 0.15, 'alertSoft', 0.4);                                     // PTZ 7-02 lost, PTZ 7-03 took over
        E.cue(o + 0.05, 'notify', 0.45);                                       // handed to police
        E.cue(cl + 0.05, 'switch', 0.3, { dur: 0.55 });
        E.cue(B.c4 + 0.12, 'confirm', 0.45);                                   // submitted
        E.cue(B.c4 + 0.4, 'blip', 0.22);                                       // the list card: Pending sign-off
        E.cue(so + 0.05, 'whoosh', 0.35);                                      // the duty manager's console
        E.cue(tS13 + 0.05, 'pop', 0.3);                                        // the Close Incident dialog
        E.cue(tS14 + 0.05, 'confirm', 0.5); E.cue(tS14 + 0.3, 'success', 0.5); // signed off, closed
        E.cue(B.back + 0.05, 'whoosh', 0.3); E.cue(B.back + 0.6, 'notify', 0.3);   // the operator's console: closure notice
      },
    });
  }

  // ================= alternative path: another night, approved works =================
  {
    const a = S('alt').start, rs = S('resolved').start;
    const tA1b = B.a1 + 0.1, tA2 = B.a2 + 0.1;
    const tab = P('a1', 'tabSop', 6, 2), auth = P('a1b', 'authorisedBtn', 8, 2);
    consoleScene('altcon', a, S('resolved').end, {
      frames: [F.a1, F.a1b, F.a2],
      screens: [[a, F.a1], [tA1b, F.a1b, { fade: 0.2 }], [tA2, F.a2, { fade: 0.3 }]],
      shots: [
        [a, WIDE, 0.1],
        [a + 0.5, LIST, 1.0],                         // the list: the AgilFence alarm card on top, flashing (held to a + 3.4)
        [a + 3.4, INV, 1.3],                          // Permit-to-work PTW-2231 · Found; gate badges; maintenance
        [a + 5.9, TABS, 1.0],                         // the tab row
        [a + 7.9, STEP1, 0.9],                        // step 1: permit found, Authorised activity
        [rs + 0.1, RP(740), 0.9],                     // Authorised · 01:22:10 · no incident raised; steps not required
        [rs + 2.2, LIST, 1.0],                        // the list: Cleared · authorised activity · PTW-2231 (holds 2.1 s)
        [rs + 5.3, TOAST, 1.0],                       // Alarm AGF-5-14 cleared · authorised activity
      ],
      path: [[a + 6.1, 1180, 820], [a + 7.3, ...tab], [a + 8.0, ...tab], [a + 9.0, ...auth], [B.a2 + 0.6, ...auth]],
      clicks: [B.a1, B.a2],
      wins: [[a + 5.9, B.a2 + 0.9]],
      build(c, s) { s.pulse = pulseBuild(c); },      // the alarm card flashes at the top of the list, as on the main path
      update(t, c, s) { pulseUpdate(c, s.pulse, t, a + 1.0, A(F.a1, 'fenceCard')); },
      cues(s) {
        E.cue(a + 0.1, 'whoosh', 0.4); E.cue(a + 0.25, 'alertSoft', 0.4);
        E.cue(B.a1, 'click', 0.8); E.cue(B.a1 + 0.1, 'switch', 0.3, { dur: 0.55 });
        E.cue(B.a2, 'click', 0.8); E.cue(tA2 + 0.05, 'notify', 0.45);
      },
    });
  }
})();
