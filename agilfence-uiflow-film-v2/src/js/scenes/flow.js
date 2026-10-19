/* The AgilFence alarm flow v2 on the AGIL Secure V11 console: the alarm view opens itself, the
   operator makes three decisions (Confirm intrusion · Dispatch Patrol 2 · Submit for sign-off), the
   duty manager signs off on his own console; then a short alternative path on another night
   (authorised works, one click, no incident). Real V11 frames (1400×1069, DEMO_CLEAN), a camera that
   pushes in on the panel in play, a pointer that makes the clicks, and no labels. */
(function () {
  'use strict';
  const S = E.S;
  const A = (f, k) => window.ANCH[f][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const DW = 1360, DX = 280, DY = 21;
  const F = {
    s1: 'AV-S1-quiet', s2: 'AV-S2-alarm-view-auto', s3: 'AV-S3-verification', s4: 'AV-S4-confirm-click',
    s5: 'AV-S5-incident-response-lanes', s6: 'AV-S6-dispatch-click', s7: 'AV-S7-response-running-ptz-handover',
    s8: 'AV-S8-on-scene-outcomes', s9: 'AV-S9-closure-checklist-submit', s10a: 'AV-S10a-signoff-dialog', s10b: 'AV-S10b-closed',
    s10c: 'AV-S10c-operator-quiet',
    a1: 'AV-A1-authorised-work-found', a2: 'AV-A2-resolved-authorised',
  };
  const P = (f, k, dx = 0, dy = 0) => { const [x, y] = mid(A(F[f], k)); return [x + dx, y + dy]; };
  const WIDE = null;
  // the live tile with its replay strip: top edge between the progress rail and the Alarm view header,
  // bottom edge between the strip and the map inset (no line of text sliced at either edge)
  const HERO = [396, 346.5, 484, 300];
  // the gate rule, the two sign-off lines and the Submit for sign-off button under them
  const SUBMIT = [910, 417, 440, 465];
  // the progress rail with the Alarm view header under it (top edge below the console header)
  const RAIL = [388, 172, 500, 300];

  // ---- the beats (seconds) ----
  const B = (window.BEATS = {
    alarm: S('alarm').start,
    c1: S('verify').end - 0.2,       // Confirm intrusion        (operator click 1)
    c2: S('response').end - 0.2,     // Dispatch Patrol 2        (operator click 2)
    c3: S('closure').end - 0.2,      // Submit for sign-off      (operator click 3)
    dm: S('signoff').end - 0.2,      // Sign and close           (duty manager, his own console)
    a1: S('alt').end - 0.2,          // Authorised activity      (alternative path, operator click 1)
    exception: S('running').start + 6.2,   // the camera lands on the PTZ 7-02 → 7-03 hand-over banner
    back: S('closed').start + 3.2,         // back on the operator's console (Nurul A.): quiet, closure notice
  });

  // one console device: frames, camera plan, pointer, sound cues
  function consoleScene(id, start, end, def) {
    E.scene({
      id, start, end, inDur: 0.6, outDur: 0.6,
      build(el, s) {
        const c = (s.con = K.console(el, { x: DX, y: DY, w: DW }));
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
        // (on the right panel the left fade covers the clipped alarm-view column)
        const fcx = (c.VW / 2 - c.cam.ox) / c.cam.k, kl = E.clamp((c.cam.z - 1.9) / 0.4) * E.clamp((fcx - 1000) / 80);
        E.css(c.edge, { width: (190 + 110 * kl).toFixed(1) + 'px', background: `linear-gradient(90deg,#05070D ${(42 + 38 * kl).toFixed(1)}%,rgba(5,7,13,0))` });
        // on the centre column the right panel's first characters sit ~100 px inside the right edge: a harder fade there
        const kr = E.clamp((c.cam.z - 1.9) / 0.4) * E.clamp((760 - fcx) / 80);
        E.css(c.edgeR, { width: (190 - 40 * kr).toFixed(1) + 'px', background: `linear-gradient(270deg,#05070D ${(42 + 40 * kr).toFixed(1)}%,rgba(5,7,13,0))` });
        if (def.update) def.update(t, c, s);
        let vis = 0;
        for (const [a, b] of s.wins) vis = Math.max(vis, E.env(t, a, b, 0.25));
        K.cursorUpdate(c, s.cur, t, s.path, s.clicks, vis);
      },
    });
  }
  const seg = (t0, from, t1, to, tc) => [[t0, ...from], [t1, ...to], [tc + 0.5, ...to]];

  // ================= main path: 02:14:50 → 02:44:20 =================
  {
    const q = S('quiet').start, al = S('alarm').start, v = S('verify').start, cf = S('confirmed').start, r = S('response').start;
    const ru = S('running').start, o = S('outcomes').start, cl = S('closure').start, so = S('signoff').start, cd = S('closed').start;
    const tg = {
      confirm: P('s3', 'confirmBtn', 10, 2), dispatch: P('s5', 'dispatchBtn', 8, 2), submit: P('s9', 'submitBtn', 12, 2), sign: P('s10a', 'signBtn', 14, 2),
    };
    const tB = B.dm + 0.15;   // the closed state
    consoleScene('console', q, S('closed').end, {
      frames: [F.s1, F.s2, F.s3, F.s4, F.s5, F.s6, F.s7, F.s8, F.s9, F.s10a, F.s10b, F.s10c],
      screens: [
        [q, F.s1], [al, F.s2, { fade: 0.6 }], [v, F.s3, { fade: 0.5 }], [B.c1 + 0.1, F.s4, { fade: 0.2 }],
        [r, F.s5, { fade: 0.5 }], [B.c2 + 0.1, F.s6, { fade: 0.2 }], [ru, F.s7, { fade: 0.5 }], [o, F.s8, { fade: 0.6 }],
        [cl, F.s9, { fade: 0.5 }], [so + 0.1, F.s10a],   // the duty manager's own console: a scan reveal, not a crossfade
        [tB, F.s10b, { fade: 0.35 }],
        [B.back, F.s10c],   // back to the operator's own console: the same scan reveal
      ],
      shots: [
        [q, WIDE, 0.1],
        [q + 1.0, [384, 14, 984, 116], 1.2],          // the header: Lockdown: not active (a status pill, apart from the button); edges in the gaps
        [al - 1.0, WIDE, 1.0],                        // wide as the alarm view opens itself
        [al + 1.3, HERO, 2.0],                        // hero: PTZ 7-02 live on preset 5-14, the person climbing
        [al + 8.4, [330, 570, 640, 470], 1.5],        // pull back: pre-alarm replay strip, thermal and the map inset
        [v - 0.6, [900, 120, 470, 920], 1.1],         // the right panel switches to Verification
        [v + 0.5, [920, 335, 420, 220], 1.4],         // corroboration: one track, three sensors, health OK
        [v + 4.0, [920, 560, 420, 240], 1.3],         // authorised-activity check: four sources, all Clear
        [v + 7.4, [900, 330, 460, 700], 1.2],         // the decision bar
        [cf + 0.2, [910, 840, 440, 170], 1.0],        // Recorded · Visually confirmed · Nurul A. (owner) · 02:15:24
        [cf + 1.6, RAIL, 1.2],                        // the Incident progress rail
        [r + 0.6, [380, 880, 520, 150], 1.3],         // Incident PER-005 raised from alarm AGF-5-14 · history inherited
        [r + 2.6, [920, 329, 420, 465], 1.3],         // lane 1: Patrol (pre-authorised); top edge under the tabs
        [r + 5.3, [920, 590, 420, 205], 1.2],         // lane 2: Police chain
        [r + 8.0, [920, 790, 420, 200], 1.2],         // lane 3: Aviation safety (authority: ATC) + the escalation rule
        [r + 10.6, [900, 329, 460, 465], 1.0],        // back to Patrol: Dispatch Patrol 2 (edges under the tabs, between lanes)
        [ru + 0.2, [920, 545, 420, 205], 1.3],        // police: acknowledged · responding · ETA
        [ru + 3.0, [920, 745, 420, 190], 1.2],        // tower decision: Runway 02L arrivals held
        [B.exception - 0.4, HERO, 1.5],               // exception banner + PTZ 7-03 hand-over on the live tile (strip fully in)
        [ru + 10.4, RAIL, 1.3],                       // the rail, as the outcomes come in
        [o + 3.0, HERO, 1.3],                         // live tile: patrol with the person, police AP-12
        [o + 5.0, [920, 334, 420, 562], 1.3],         // patrol + police + aviation lanes: contained → custody (under the tabs)
        [cl + 0.1, [900, 140, 470, 900], 1.0],        // the Close tab
        [cl + 1.2, [920, 282, 420, 485], 1.3],        // six evidence items with source and time (top edge above the tabs)
        [cl + 4.6, SUBMIT, 1.3],                      // the gate rule, the sign-off lines and Submit for sign-off
        [so - 0.1, [370, 140, 660, 580], 1.0],        // the duty manager's console: sign-off dialog
        [so + 2.4, [390, 252, 620, 473], 1.4],        // six evidence items, badge + PIN, Sign and close (the dialog without its header)
        [cd + 0.2, WIDE, 0.9],                        // closed: counters down, header pill Closed
        [cd + 1.2, [380, 900, 520, 130], 1.1],        // PER-005 closed · signed by Daniel L. · audit record locked
        [B.back - 0.1, WIDE, 1.1],                    // the operator's console back to quiet, the closure notice
      ],
      path: [
        ...seg(v + 8.6, [1190, 700], v + 10.4, tg.confirm, B.c1),
        ...seg(r + 11.2, [1210, 690], r + 12.8, tg.dispatch, B.c2),
        ...seg(cl + 7.6, [1230, 870], cl + 9.1, tg.submit, B.c3),
        ...seg(so + 4.1, [900, 560], so + 5.5, tg.sign, B.dm),
      ],
      clicks: [B.c1, B.c2, B.c3, B.dm],
      wins: [[v + 8.4, B.c1 + 0.9], [r + 11.0, B.c2 + 0.9], [cl + 7.4, B.c3 + 0.6], [so + 3.9, B.dm + 0.6]],
      build(c, s) {
        // the AgilFence alarm toast slides in from the right as the alarm view opens itself
        s.toastL = E.add(c.dev, `<div class="scr" style="visibility:hidden;width:1400px;z-index:3"><img src="assets/af/${F.s2}.png" style="width:1400px"></div>`);
        s.flash = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(900px 600px at 50% 40%, rgba(215,45,48,.36), rgba(215,45,48,0));opacity:0"></div>');
      },
      update(t, c, s) {
        // the dialog would be darkened at the edges by the kit's edge fades
        if (t >= S('signoff').start && t < tB) { E.css(c.edge, { opacity: '0' }); E.css(c.edgeR, { opacity: '0' }); }
        const tA = B.alarm, on = t >= tA && t < tA + 1.3;
        if (on) {
          const k = E.ep(t, tA, tA + 0.8, 'out5'), rr = A(F.s2, 'alarmToast'), p = 10;
          const tr = `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)}) translate(${E.f3((1 - k) * 480)}px,0)`;
          E.css(s.toastL, { visibility: 'visible', opacity: E.f3(Math.min(1, k * 3)), transform: tr, clipPath: `inset(${rr[1] - p}px ${1400 - rr[0] - rr[2] - p}px ${1069 - rr[1] - rr[3] - p}px ${rr[0] - p}px)` });
        } else E.css(s.toastL, { visibility: 'hidden' });
        E.css(s.flash, { opacity: E.f3(t > tA ? (0.5 + 0.5 * Math.cos((t - tA) * 9)) * (1 - E.ep(t, tA, tA + 1.8)) * 0.7 : 0) });
      },
      cues(s) {
        E.cue(s.start + 0.1, 'whoosh', 0.45);
        // the alarm: tone, no pointer; the view opened itself (notify)
        E.cue(al, 'alert', 0.75); E.cue(al + 0.9, 'alert', 0.5); E.cue(al + 0.05, 'impactSoft', 0.35); E.cue(al + 1.9, 'notify', 0.32);
        E.cue(v, 'switch', 0.3, { dur: 0.55 });
        E.cue(v + 4.3, 'blip', 0.25);                                          // checks complete
        s.clicks.forEach(t => E.cue(t, 'click', 0.8));
        E.cue(B.c1 + 0.12, 'confirm', 0.5);                                    // decision recorded
        E.cue(r + 0.05, 'notify', 0.5);                                        // incident raised, lanes open
        E.cue(B.c2 + 0.12, 'confirm', 0.5);                                    // dispatch recorded
        E.cue(ru + 0.05, 'notify', 0.4);                                       // acknowledged: police, duty manager, tower
        E.cue(B.exception + 0.9, 'alertSoft', 0.4);                            // PTZ 7-02 lost, PTZ 7-03 took over
        E.cue(o + 0.05, 'notify', 0.45);                                       // on scene, outcomes
        E.cue(cl + 0.05, 'switch', 0.3, { dur: 0.55 });
        E.cue(B.c3 + 0.12, 'confirm', 0.45);                                   // submitted
        E.cue(so + 0.05, 'whoosh', 0.35); E.cue(so + 0.3, 'pop', 0.3);         // the duty manager's console, the dialog
        E.cue(tB + 0.05, 'confirm', 0.5); E.cue(tB + 0.3, 'success', 0.5);     // signed off, closed
        E.cue(B.back + 0.05, 'whoosh', 0.3); E.cue(B.back + 0.6, 'notify', 0.3);   // the operator's console: closure notice
      },
    });
  }

  // ================= alternative path: another night, approved works =================
  {
    const a = S('alt').start, rs = S('resolved').start;
    const tA2 = B.a1 + 0.1;
    consoleScene('altcon', a, S('resolved').end, {
      frames: [F.a1, F.a2],
      screens: [[a, F.a1], [tA2, F.a2, { fade: 0.3 }]],
      shots: [
        [a, WIDE, 0.1],
        [a + 0.9, [920, 560, 420, 260], 1.3],         // Permit-to-work PTW-2231 · Found; gate badge-in
        [a + 3.4, [900, 620, 460, 420], 1.1],         // the decision bar: Authorised activity highlighted
        [rs + 0.2, [380, 880, 520, 150], 1.2],        // Resolved as authorised activity · no incident, no patrol
      ],
      path: [...seg(a + 3.9, [1210, 760], a + 5.4, P('a1', 'authorisedBtn', 10, 2), B.a1)],
      clicks: [B.a1],
      wins: [[a + 3.7, B.a1 + 0.9]],
      cues(s) {
        E.cue(a + 0.1, 'whoosh', 0.4); E.cue(a + 0.25, 'alertSoft', 0.4);
        E.cue(B.a1, 'click', 0.8); E.cue(tA2 + 0.05, 'notify', 0.45);
      },
    });
  }
})();
