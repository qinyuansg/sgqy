/* Cut C (story), chapters 3–5 on the AGIL Secure V11 console (real AV frames, 1400×1069, DEMO_CLEAN):
   3 Shows who is there        AV-S1 quiet → AV-S2 the alarm view opens itself, hero push on the live climber → AV-S3 corroboration
   4 Coordinates the response  Confirm intrusion → AV-S4 → AV-S5 straight onto Patrol → Dispatch Patrol 2 → AV-S6 → a short dip →
                               AV-S7 tower decision → PTZ 7-02 → 7-03 hand-over → AV-S8 patrol and police with the person live
   5 Closes with evidence      AV-S9 six evidence items, Submit for sign-off → AV-S10a the duty manager's authenticated
                               sign-off (badge + PIN), Sign and close → AV-S10b closed, audit record locked
   One console device per chapter (the chapter cards sit between them); a camera that pushes in, a pointer for the clicks. */
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
  };
  const P = (f, k, dx = 0, dy = 0) => { const [x, y] = mid(A(F[f], k)); return [x + dx, y + dy]; };
  const WIDE = null;
  const HERO = [396, 346.5, 484, 300];          // the live tile with its replay strip (as in the operator cut)
  const SUBMIT = [910, 417, 440, 465];          // the gate rule, the sign-off lines, Submit for sign-off

  const B = (window.BEATS = {
    alarm: S('alarm').start + 1.4,                // AV-S2: the alarm view opens itself
    c1: S('respond').start + 2.2,                 // Confirm intrusion        (operator)
    lanes: S('respond').start + 3.5,              // AV-S5: incident raised, the lanes (a short dip, then straight onto Patrol)
    c2: S('respond').start + 5.6,                 // Dispatch Patrol 2        (operator)
    running: S('respond').start + 6.6,            // AV-S7: tower decision (a short dip between the two lane states)
    exception: S('respond').start + 8.0,          // the camera lands on the PTZ 7-02 → 7-03 banner
    outcomes: S('respond').start + 10.0,          // AV-S8: on scene
    c3: S('closure').end - 0.2,                   // Submit for sign-off      (operator)
    dm: S('signoff').start + 3.9,                 // Sign and close           (duty manager, his own console)
  });

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
        const fcx = (c.VW / 2 - c.cam.ox) / c.cam.k, kl = E.clamp((c.cam.z - 1.9) / 0.4) * E.clamp((fcx - 1000) / 80);
        E.css(c.edge, { width: (190 + 110 * kl).toFixed(1) + 'px', background: `linear-gradient(90deg,#05070D ${(42 + 38 * kl).toFixed(1)}%,rgba(5,7,13,0))` });
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

  // ================= chapter 3 · Shows who is there =================
  {
    const q = S('alarm').start, al = B.alarm, v = S('verify').start;
    consoleScene('con3', q, S('verify').end, {
      frames: [F.s1, F.s2, F.s3],
      screens: [[q, F.s1], [al, F.s2, { fade: 0.6 }], [v, F.s3, { fade: 0.5 }]],
      shots: [
        [q, WIDE, 0.1],
        [al + 1.2, HERO, 2.0],                        // hero: PTZ 7-02 live on preset 5-14, the person climbing
        [al + 6.3, [330, 570, 640, 470], 1.4],        // pull back: the pre-alarm replay strip and the map inset
        [v - 0.5, [900, 120, 470, 920], 1.0],         // the right panel switches to Verification
        [v + 0.6, [920, 335, 420, 220], 1.3],         // corroboration: one track, three sensors, health OK
        [v + 3.0, [920, 560, 420, 240], 1.3],         // the authorised-activity check: four sources, all Clear
      ],
      path: [[q, 1200, 700]], clicks: [], wins: [],
      build(c, s) {
        s.toastL = E.add(c.dev, `<div class="scr" style="visibility:hidden;width:1400px;z-index:3"><img src="assets/af/${F.s2}.png" style="width:1400px"></div>`);
        s.flash = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(900px 600px at 50% 40%, rgba(215,45,48,.36), rgba(215,45,48,0));opacity:0"></div>');
      },
      update(t, c, s) {
        const on = t >= al && t < al + 1.3;
        if (on) {
          const k = E.ep(t, al, al + 0.8, 'out5'), rr = A(F.s2, 'alarmToast'), p = 10;
          const tr = `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)}) translate(${E.f3((1 - k) * 480)}px,0)`;
          E.css(s.toastL, { visibility: 'visible', opacity: E.f3(Math.min(1, k * 3)), transform: tr, clipPath: `inset(${rr[1] - p}px ${1400 - rr[0] - rr[2] - p}px ${1069 - rr[1] - rr[3] - p}px ${rr[0] - p}px)` });
        } else E.css(s.toastL, { visibility: 'hidden' });
        E.css(s.flash, { opacity: E.f3(t > al ? (0.5 + 0.5 * Math.cos((t - al) * 9)) * (1 - E.ep(t, al, al + 1.8)) * 0.7 : 0) });
        // the hero push sweeps the top edge through the incident-progress banner: soften that edge while it moves
        E.css(c.edgeT, { opacity: E.f3(Math.min(E.ep(t, al + 1.25, al + 1.6), 1 - E.ep(t, al + 2.7, al + 3.2))) });
      },
      cues(s) {
        E.cue(q + 0.1, 'whoosh', 0.4);
        E.cue(al, 'alert', 0.75); E.cue(al + 0.9, 'alert', 0.5); E.cue(al + 0.05, 'impactSoft', 0.35); E.cue(al + 1.9, 'notify', 0.32);
        E.cue(v, 'switch', 0.3, { dur: 0.55 });
        E.cue(v + 3.3, 'blip', 0.25);                 // checks complete
      },
    });
  }

  // ================= chapter 4 · Coordinates the response =================
  {
    const r = S('respond').start;
    const tg = { confirm: P('s3', 'confirmBtn', 10, 2), dispatch: P('s5', 'dispatchBtn', 8, 2) };
    consoleScene('con4', r, S('respond').end, {
      frames: [F.s3, F.s4, F.s5, F.s6, F.s7, F.s8],
      screens: [
        [r, F.s3], [B.c1 + 0.1, F.s4, { fade: 0.2 }], [B.lanes, F.s5, { fade: 0.03 }], [B.c2 + 0.1, F.s6, { fade: 0.2 }],
        [B.running, F.s7, { fade: 0.03 }], [B.outcomes, F.s8, { fade: 0.6 }],   // AV-S7 swaps in under the dip
      ],
      shots: [
        [r, [900, 330, 460, 700], 0.1],               // the decision bar under the verification
        [B.c1 + 0.3, [910, 840, 440, 170], 0.8],      // Recorded · Visually confirmed · Nurul A. (owner) · 02:15:24
        [B.lanes - 0.03, [905, 340, 450, 455], 0.06], // under the dip: incident raised, straight onto Patrol
        [B.lanes + 0.1, [900, 329, 460, 465], 1.4],   //   and a slow push to Dispatch Patrol 2
        [B.running - 0.03, [910, 547, 440, 464], 0.06],   // under the dip: police chain + tower decision (Runway 02L arrivals held)
        [B.running + 0.1, [915, 560, 430, 440], 1.3], //   and a slow push on it
        [B.exception, HERO, 1.2],                     // the live tile: PTZ 7-02 video lost · PTZ 7-03 took over
        [B.outcomes + 0.6, [420, 330, 460, 330], 1.3],   // AV-S8: patrol and police with the person on the live tile
      ],
      path: [
        ...seg(r + 0.9, [1190, 700], r + 2.2, tg.confirm, B.c1),
        ...seg(B.c2 - 1.5, [1210, 690], B.c2 - 0.35, tg.dispatch, B.c2),
      ],
      clicks: [B.c1, B.c2],
      wins: [[r + 0.7, B.c1 + 0.8], [B.c2 - 1.7, B.c2 + 0.7]],
      build(c, s) {
        // a short dip where the right panel changes state (AV-S4 → AV-S5 lanes, AV-S6 → AV-S7): their text panels do
        // not line up, so no crossfade of one over the other
        s.dip = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:#05070D;opacity:0"></div>');
      },
      update(t, c, s) {
        let k = 0;
        for (const d of [B.lanes, B.running]) k = Math.max(k, t < d ? E.ep(t, d - 0.2, d, 'in') : 1 - E.ep(t, d + 0.04, d + 0.34, 'out'));
        E.css(s.dip, { opacity: E.f3(k) });
      },
      cues(s) {
        E.cue(r + 0.1, 'whoosh', 0.35);
        s.clicks.forEach(t => E.cue(t, 'click', 0.8));
        E.cue(B.c1 + 0.12, 'confirm', 0.5);           // decision recorded
        E.cue(B.lanes + 0.05, 'notify', 0.5);         // incident raised, lanes open
        E.cue(B.c2 + 0.12, 'confirm', 0.5);           // dispatch recorded
        E.cue(B.running + 0.05, 'notify', 0.4);       // acknowledged: police, duty manager, tower
        E.cue(B.exception + 0.9, 'alertSoft', 0.4);   // PTZ 7-02 lost, PTZ 7-03 took over
        E.cue(B.outcomes + 0.05, 'notify', 0.45);     // on scene
      },
    });
  }

  // ================= chapter 5 · Closes with evidence =================
  {
    const cl = S('closure').start, so = S('signoff').start;
    const tg = { submit: P('s9', 'submitBtn', 12, 2), sign: P('s10a', 'signBtn', 14, 2) };
    const tB = B.dm + 0.15;   // the closed state
    consoleScene('con5', cl, S('signoff').end, {
      frames: [F.s9, F.s10a, F.s10b],
      screens: [[cl, F.s9], [so + 0.1, F.s10a], [tB, F.s10b, { fade: 0.35 }]],   // the duty manager's own console: a scan reveal
      shots: [
        [cl, [920, 282, 420, 485], 0.1],              // six evidence items with source and time
        [cl + 2.4, SUBMIT, 1.2],                      // the gate rule, the sign-off lines, Submit for sign-off
        [so - 0.1, [370, 140, 660, 580], 1.0],        // the duty manager's console: the sign-off dialog
        [so + 1.4, [390, 252, 620, 473], 1.2],        // six items, badge + PIN, Sign and close
        [tB + 0.15, WIDE, 1.1],                       // pull back to the whole console: every stage ticked, PER-005 closed
                                                      // (a pull-back, not a pan: no tile header passes the top edge)
      ],
      path: [
        ...seg(cl + 3.1, [1230, 870], cl + 4.4, tg.submit, B.c3),
        ...seg(so + 2.4, [900, 560], so + 3.55, tg.sign, B.dm),
      ],
      clicks: [B.c3, B.dm],
      wins: [[cl + 2.9, B.c3 + 0.6], [so + 2.2, B.dm + 0.6]],
      update(t, c) {
        // the dialog would be darkened at the edges by the kit's edge fades
        if (t >= so && t < tB) { E.css(c.edge, { opacity: '0' }); E.css(c.edgeR, { opacity: '0' }); }
        // the pull-back to the whole console reveals the incident-progress panel through the top edge: soften it
        if (t >= tB) E.css(c.edgeT, { opacity: E.f3(Math.min(E.ep(t, tB + 0.1, tB + 0.3), 1 - E.ep(t, tB + 0.9, tB + 1.25))) });
      },
      cues(s) {
        E.cue(cl + 0.1, 'whoosh', 0.35); E.cue(cl + 0.3, 'switch', 0.25, { dur: 0.55 });
        s.clicks.forEach(t => E.cue(t, 'click', 0.8));
        E.cue(B.c3 + 0.12, 'confirm', 0.45);                                   // submitted
        E.cue(so + 0.05, 'whoosh', 0.35); E.cue(so + 0.3, 'pop', 0.3);         // the duty manager's console, the dialog
        E.cue(tB + 0.05, 'confirm', 0.5); E.cue(tB + 0.3, 'success', 0.5);     // signed off, closed
      },
    });
  }
})();
