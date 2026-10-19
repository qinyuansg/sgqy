/* The AgilFence alarm flow on the AGIL Secure V11 console: one device stays on screen from the quiet
   before-state to the closed incident. Real V11 frames, a camera that pushes in on the element in
   play, a pointer that makes the clicks, and no labels. Frame px: 1400×1069 (Incident Management 1600). */
(function () {
  'use strict';
  const S = E.S;
  const F = {
    quiet: 'AF-02a-quiet', s1: 'UC2-S1-detect-toast', s2: 'UC2-S2-correlate-investigation', s3: 'UC2-S3-contextualise-locate-live',
    s4: 'UC2-S4-sop-hover', s5: 'UC2-S5-sop-approved', s6: 'UC2-S6-escalate-hover', s7: 'UC2-S7-escalate-dialog', s8: 'UC2-S8-incident-created',
    patrol: 'AF-08-patrol-on-scene', i3: 'UC5-S3-contextualise-search-per-005', i5: 'UC5-S5-orchestrate-sop-record-approvals',
    i6: 'UC5-S6-govern-close-dialog', i7: 'UC5-S7-govern-closed',   // the closed state without the Export menu (tools/closed-frame.mjs)
  };
  const A = (f, k) => window.ANCH[F[f]][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const DW = 1360, DX = 280, DY = 21;

  // ---- the beats (seconds): screen switches, clicks and camera moves ----
  const T = {
    toast: S('toast').start,            // 6.4  the system message slides in
    s1: S('toast').start + 0.5,         // the full alarm state (card, pin) fades in under it
    clickOpen: 11.4, s2: S('inv').start,              // Open alarm → Investigation
    clickLocate: 18.6, s3: S('locate').start,         // Locate → nearest cameras
    clickLive: 22.3, live: S('live').start,           // Open live → push on the player
    back: S('wall').end,                              // back from the video wall
    clickTab: 36.3, s4: 36.6,                         // SOP Flow tab
    clickDispatch: 40.9, s5: S('dispatched').start,   // Dispatch → approved
    s6: 46.6, clickEsc: 47.5, s7: S('escalate').start + 0.3,   // Escalate → the camera pushes on the click, the dialog opens once it has landed
    clickCreate: 53.0, s8: S('created').start,        // Create Incident → the dialog dissolves into the created toast
    patrol: S('patrol').start,
    clickIM: 64.9, i3: S('im').start,                 // Incident Management → PER-005 search (the search field first, then the list)
    clickRow: 68.3, i5: 68.6,                         // row → SOP record
    clickClose: 74.1, i6: S('close').start,           // Close Incident → dialog
    clickConfirm: 79.0, i7: 79.3,                     // Confirm close → closed
  };

  E.scene({
    id: 'console', start: S('quiet').start, end: S('close').end, inDur: 0.6, outDur: 0.6,
    build(el, s) {
      const c = (s.con = K.console(el, { x: DX, y: DY, w: DW }));
      Object.values(F).forEach(f => c.frame(f));
      // the console header's search placeholder reads "Search or ask Co-pilot…": keep "Search" only
      ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].forEach(k => E.add(c.layers[F[k]], '<div class="abs" style="left:740px;top:50px;width:122px;height:26px;background:#4E4E4E"></div>'));
      // the close dialog's "report reviewed" note names a Co-pilot draft: cover the note, keep the checkbox line
      E.add(c.layers[F.i6], '<div class="abs" style="left:649px;top:605px;width:316px;height:21px;background:#333A47"></div>');
      // the system message as its own layer: it slides in from the right before the full alarm state appears
      s.toastL = E.add(c.dev, `<div class="scr" style="visibility:hidden;width:1400px;z-index:3"><img src="assets/af/${F.s1}.png" style="width:1400px"></div>`);
      s.flash = E.add(c.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(900px 600px at 72% 26%, rgba(215,45,48,.42), rgba(215,45,48,0));opacity:0"></div>');

      c.plan = {
        screens: [
          [s.start, F.quiet], [T.s1, F.s1, { fade: 0.5 }], [T.s2, F.s2], [T.s3, F.s3], [T.s4, F.s4], [T.s5, F.s5],
          [T.s6, F.s6, { fade: 0.4 }], [T.s7, F.s7, { fade: 0.35 }], [T.s8, F.s8, { fade: 0.3 }], [T.patrol, F.patrol],
          [T.i3, F.i3], [T.i5, F.i5], [T.i6, F.i6, { fade: 0.35 }], [T.i7, F.i7, { fade: 0.3 }],   // dialogs dissolve; pages wipe
        ],
        shots: [
          [s.start, null, 0.1],
          [T.toast + 0.6, [880, 160, 540, 260], 1.8],          // the system message and the pin
          [T.s2 + 0.4, [880, 110, 520, 560], 1.4],             // Active Alarms: linked entries
          [16.0, [20, 100, 1360, 900], 1.3],                    // out, so the pointer can reach Locate on the card
          [T.s3 + 0.4, [380, 130, 340, 250], 1.5],             // nearest cameras
          [T.live, [430, 580, 420, 300], 1.5],                 // the live player (right edge on the map, the side panel stays out)
          [T.back - 0.5, [20, 100, 1360, 900], 0.1],           // (under the wall) back to the wide console
          [T.s4 + 0.4, [900, 560, 470, 420], 1.4],             // SOP Flow steps
          [T.s5 + 0.3, [440, 540, 940, 470], 1.4],             // dispatched: confirmation + steps + Escalate
          [T.clickEsc, [355, 290, 690, 520], 0.9],            // Escalate Event dialog (lands before the dialog fades in)
          [T.s8 + 0.3, [300, 20, 1100, 900], 1.5],             // incident created (after the dialog has dissolved)
          [T.patrol + 0.3, [440, 150, 940, 760], 1.5],         // patrol on scene (map + Active Alarms)
          [62.6, [560, 20, 840, 620], 1.4],                     // up to the Incident Management button
          [T.clickIM, [880, 0, 700, 534], 1.2],                // Incident Management: the PER-005 search
          [66.8, [20, 100, 880, 340], 1.0],                     // the filtered list: Showing 1 of 24
          [T.i5 + 0.3, [0, 0, 1600, 1069], 1.3],               // the whole record
          [70.6, [860, 500, 700, 520], 1.5],                    // the SOP record, approvals, Close Incident
          [T.i6 + 0.1, [460, 285, 680, 480], 1.2],             // Close Incident dialog
          [T.i7 + 0.1, [0, 0, 1600, 1069], 1.4],               // closed: the whole page
          [82.4, [860, 500, 700, 520], 1.6],                    // the record again: Closed 07:02 · signed off by Grace T.
        ],
      };
      // pointer: [t, fx, fy] in frame px; it rests at each target until the click and fades out after it
      const P = (f, k, dx = 0, dy = 0) => { const [x, y] = mid(A(f, k)); return [x + dx, y + dy]; };
      const tg = {
        open: P('s1', 'openAlarm', 4, 2), locate: [104, 378], live: P('s3', 'openLive', 4, 2), tab: [1250, 582], dispatch: P('s4', 'dispatch', 6, 2),
        esc: P('s6', 'escalate', 8, 4), create: P('s7', 'createIncident', 30, 2), im: P('s8', 'imButton', 20, 4), row: [572, 326],
        close: P('i5', 'closeButton', 30, 2), confirm: P('i6', 'confirm', 26, 2),
      };
      const seg = (t0, from, t1, to, tc) => [[t0, ...from], [t1, ...to], [tc + 0.5, ...to]];
      s.path = [
        ...seg(9.2, [1190, 430], 11.0, tg.open, T.clickOpen),
        ...seg(16.4, [700, 430], 18.2, tg.locate, T.clickLocate),
        ...seg(20.5, [820, 310], 21.9, tg.live, T.clickLive),
        ...seg(34.6, [700, 760], 36.0, tg.tab, T.clickTab),
        ...seg(39.0, [1150, 700], 40.5, tg.dispatch, T.clickDispatch),
        ...seg(45.6, tg.dispatch, 47.1, tg.esc, T.clickEsc),
        ...seg(50.8, tg.esc, 52.6, tg.create, T.clickCreate),
        ...seg(63.2, [1000, 400], 64.5, tg.im, T.clickIM),
        ...seg(66.9, [1060, 420], 68.0, tg.row, T.clickRow),
        ...seg(72.2, [1100, 800], 73.7, tg.close, T.clickClose),
        ...seg(77.0, tg.close, 78.6, tg.confirm, T.clickConfirm),
      ];
      s.clicks = [T.clickOpen, T.clickLocate, T.clickLive, T.clickTab, T.clickDispatch, T.clickEsc, T.clickCreate, T.clickIM, T.clickRow, T.clickClose, T.clickConfirm];
      s.wins = [[9.0, 11.9], [16.2, 19.1], [20.3, 22.8], [34.4, 36.8], [38.8, 41.4], [45.4, 48.0], [50.6, 53.5], [63.0, 65.3], [66.7, 68.8], [72.0, 74.6], [76.8, 79.5]];
      s.cur = K.cursor(c);

      // sound cues
      E.cue(s.start + 0.1, 'whoosh', 0.45);
      E.cue(T.toast, 'alert', 0.75); E.cue(T.toast + 0.9, 'alert', 0.5); E.cue(T.toast + 0.05, 'impactSoft', 0.35);
      s.clicks.forEach(t => E.cue(t, 'click', 0.8));
      c.plan.screens.slice(2).forEach(([t, , o]) => E.cue(t, o && o.fade ? 'switch' : 'scan', o && o.fade ? 0.3 : 0.4, { dur: 0.55 }));
      E.cue(T.s3 + 0.1, 'whoosh', 0.3); E.cue(T.live + 0.1, 'switch', 0.4);
      E.cue(T.back + 0.1, 'whoosh', 0.3);
      E.cue(T.s5 + 0.1, 'confirm', 0.55); E.cue(T.s7 + 0.05, 'pop', 0.35); E.cue(T.s8 + 0.1, 'notify', 0.5);
      E.cue(T.patrol + 0.2, 'success', 0.35); E.cue(T.i3 + 0.1, 'whoosh', 0.3); E.cue(T.i6 + 0.05, 'pop', 0.3);
      E.cue(T.i7 + 0.1, 'confirm', 0.5); E.cue(T.i7 + 0.35, 'success', 0.45);
    },
    update(t, lt, s) {
      const c = s.con;
      const kin = E.ep(t, s.start, s.start + 1.1, 'out5'), kout = E.ep(t, s.end - 0.7, s.end, 'in');
      E.css(c.root, { transform: `perspective(2400px) translate3d(${E.f3(50 * (1 - kin) - 30 * kout)}px,0,0) rotateY(${E.f3(-7 * (1 - kin) + 4 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})`, opacity: E.f3(kin * (1 - kout)) });
      K.bracketsIn(c.brk, E.ep(t, s.start + 0.5, s.start + 1.2) * (1 - kout));
      K.consoleUpdate(c, t);
      // the kit's edge fades (for clipped list text) would darken a centred dialog's edges: off while one is open
      if ((t >= T.s7 && t < T.s8) || (t >= T.i6 && t < T.i7)) { E.css(c.edge, { opacity: '0' }); E.css(c.edgeR, { opacity: '0' }); }
      // on the live player the device's right edge falls on the side panel's border: keep the right fade up
      if (t >= T.live + 0.6 && t < T.back - 0.6) E.css(c.edgeR, { opacity: '1' });
      // the system message slides in from the right edge, ahead of the full alarm state
      const tA = T.toast, on = t >= tA && t < T.s1 + 0.6;
      if (on) {
        const k = E.ep(t, tA, tA + 0.8, 'out5'), r = A('s1', 'toast'), p = 10;
        const tr = `translate3d(${c.cam.ox.toFixed(2)}px,${c.cam.oy.toFixed(2)}px,0) scale(${c.cam.k.toFixed(5)}) translate(${E.f3((1 - k) * 480)}px,0)`;
        E.css(s.toastL, { visibility: 'visible', opacity: E.f3(Math.min(1, k * 3)), transform: tr, clipPath: `inset(${r[1] - p}px ${1400 - r[0] - r[2] - p}px ${1069 - r[1] - r[3] - p}px ${r[0] - p}px)` });
      } else E.css(s.toastL, { visibility: 'hidden' });
      E.css(s.flash, { opacity: E.f3(t > tA ? (0.5 + 0.5 * Math.cos((t - tA) * 9)) * (1 - E.ep(t, tA, tA + 1.8)) * 0.8 : 0) });
      // pointer
      let vis = 0;
      for (const [a, b] of s.wins) vis = Math.max(vis, E.env(t, a, b, 0.25));
      K.cursorUpdate(c, s.cur, t, s.path, s.clicks, vis);
    },
  });
})();
