/* f05–f12 · The alarm on the V11 console, then the response: one device stays on screen while the
   flow runs from the system message to the closed incident. Real AgilFence V11 frames; the camera
   pushes in; ice-blue tags name what the narration points at; the left column tracks the 9 steps. */
(function () {
  'use strict';
  const L = E.L, at = E.at, S = E.S;
  const F = {
    quiet: 'AF-02a-quiet', alarm: 'AF-02-system-message-alarm', list: 'AF-03-incident-list', loc: 'AF-04-locate-nearest-cameras',
    ptz: 'AF-05-ptz-films-the-area', sopa: 'AF-07a-sop-checks', sop: 'AF-07-sop-approve-dispatch', sopd: 'AF-07b-sop-dispatched', sopt: 'AF-07c-sop-tower', sopp: 'AF-07d-sop-police', scene: 'AF-08-patrol-on-scene', close: 'AF-09-close-and-report',
  };
  const A = (f, k) => window.ANCH[F[f]][k];
  const mid = r => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const pad = (r, p) => [r[0] - p, r[1] - p, r[2] + 2 * p, r[3] + 2 * p];
  const WHO = { system: ['System', '#3EA9FF'], operator: ['Operator', '#FFFFFF'], copilot: ['Co-pilot', '#B69CFF'], patrol: ['Patrol', '#44AC0C'], sensor: ['AgilFence', '#E3B341'] };
  const PERSONA = { nurul: ['Nurul', 'Control-room operator'], arjun: ['Arjun', 'Patrol officer'], daniel: ['Daniel', 'Duty manager'] };
  const STEPS = ['Perimeter triggered', 'System message and alarm', 'Alarm in the incident list', 'Locate: nearest camera', 'PTZ films the area', 'Command-centre video wall', 'Operator runs the SOP', 'Patrol on scene', 'Close and report'];

  const SC = [
    {
      id: 'f05', step: 2, kicker: '02:14:59 · Fence Sector 5', title: 'The alarm,\non the console.', who: ['system'], concept: 'Concept: system message, Co-pilot',
      body: 'A system message, an alarm tone, a Critical card and a pin on the airport model.', path: 'Home  ›  Real Time Alerts',
      plan: () => {
        const tA = L('v06').start - 0.35;
        return {
          screens: [[S('f05').start, F.quiet], [tA, F.alarm]],
          shots: [[tA + 0.4, [20, 30, 1360, 1020], 2.4]],
          hls: [
            { r: pad(A('alarm', 'toast'), 4), n: 1, label: 'System message', side: 'l', t0: at('v06', 'system') - 0.1, t1: S('f05').end },
            { r: pad(A('alarm', 'card'), 2), n: 2, label: 'Critical alarm, with tone', side: 'r', t0: at('v06', 'tone') - 0.15, t1: S('f05').end },
            { r: pad(A('alarm', 'marker'), 4), n: 3, label: 'Pin on the airport model', side: 'b', dx: 90, dist: 8, t0: at('v06', 'pin') - 0.45, t1: S('f05').end },
          ],
          cues: [[tA, 'alert', 0.75], [tA + 0.9, 'alert', 0.5], [tA + 0.05, 'impactSoft', 0.4]],
          flash: tA,
        };
      },
    },
    {
      id: 'f06', step: 3, kicker: '02:15:05 · Incident list', title: 'Linked into\none incident.', who: ['system', 'copilot'], concept: 'Concept: auto-linked incident, Co-pilot summary',
      body: 'The fence and laser scanner alarms, and the camera call-up, are linked into PER-005 at the top of the list.', path: 'Incident Management  ›  PER-005',
      plan: () => ({
        screens: [[S('f06').start, F.list]],
        shots: [[S('f06').start + 0.15, [30, 120, 830, 640], 1.1], [at('v07', 'linked') + 0.3, [475, 280, 1125, 700], 1.1]],
        hls: [
          { r: pad(A('list', 'row'), 2), n: 1, label: 'Top of the list', side: 't', dist: 62, dx: 74, t0: at('v07', 'tops') - 0.1, t1: at('v07', 'linked') + 0.5 },
          { r: [880, 595, 660, 140], n: 2, label: 'Fence, scanner, camera', side: 'l', dy: 100, t0: at('v07', 'linked') + 0.9, t1: S('f06').end },
        ],
      }),
    },
    {
      id: 'f07', step: 4, kicker: '02:15:08 · Locate', title: 'One click.\nNearest cameras.', who: ['operator', 'system'], concept: 'Concept: nearest-camera list, Co-pilot summary',
      body: 'Locate flies the map to segment 5-14 and lists the cameras. iPAMS has already turned PTZ 7-02 there.',
      path: 'Locate  ›  Fence Sector 5 · Seg 5-14', personas: [{ k: 'nurul', act: 'Clicks Locate', t: () => at('v08', 'Locate') }],
      plan: () => {
        const tc = at('v08', 'Locate') + 0.05, b = A('list', 'locate'), [bx, by] = mid(b);
        return {
          screens: [[tc + 0.25, F.loc]],
          shots: [[S('f07').start + 0.05, [860, 600, 700, 470], 1.0], [tc + 0.35, [380, 150, 560, 690], 1.2], [at('v08', 'already') - 0.6, [600, 150, 780, 440], 1.2]],
          hls: [
            { r: pad(A('loc', 'nearest'), 3), n: 1, label: 'Nearest cameras, listed', side: 't', dist: 30, t0: at('v08', 'lists') - 0.1, t1: at('v08', 'already') - 0.65 },
            { r: pad(A('loc', 'ptzTile'), 3), n: 2, label: 'Already on preset', side: 'l', dy: 110, t0: at('v08', 'already') - 0.1, t1: S('f07').end },
          ],
          cursor: { path: [[S('f07').start + 0.1, bx + 150, by - 120], [tc - 0.1, bx - 40, by + 2]], clicks: [tc], win: [S('f07').start, tc + 0.5] },
          cues: [[tc, 'click', 0.8], [tc + 0.3, 'whoosh', 0.3]],
        };
      },
    },
    {
      id: 'f08', step: 5, kicker: '02:15:12 · PTZ 7-02 live', title: 'One more click.\nLive, and tracking.', who: ['operator', 'system', 'copilot'], path: 'Active Alarms  ›  PTZ 7-02 live',
      concept: 'Concept: one-click live view, Co-pilot',
      copilot: { label: 'CO-PILOT · CONCEPT', pre: 'Summarising fence, scanner and camera', quote: 'Fence, laser scanner and thermal agree: one person, 1.7 m, at segment 5-14. No works are booked here.', tq: () => at('v09', 'person') + 0.2 },
      plan: () => {
        const tc = at('v09', 'click') + 0.05, b = A('loc', 'openLive'), [bx, by] = mid(b);
        return {
          screens: [[tc + 0.25, F.ptz]],
          shots: [[S('f08').start + 0.05, [380, 520, 520, 340], 1.0], [tc + 0.35, [384, 132, 520, 440], 1.1], [at('v09', 'agree') - 0.9, [560, 540, 800, 420], 1.1]],
          hls: [
            { r: pad(b, 3), n: 1, label: '', t0: S('f08').start + 0.3, t1: tc + 0.35 },
            { r: A('ptz', 'pbox'), n: 1, label: 'One person, 1.7 m · tracking', side: 'r', dist: 40, t0: at('v09', 'person') - 0.1, t1: at('v09', 'agree') - 0.95 },
            { r: pad(A('ptz', 'summary'), 1), n: 2, label: 'Fence, scanner and camera agree', side: 'l', dy: -90, t0: at('v09', 'agree') - 0.4, t1: S('f08').end },
          ],
          cursor: { path: [[S('f08').start + 0.1, bx - 120, by + 80], [tc - 0.1, bx + 4, by + 4]], clicks: [tc], win: [S('f08').start, tc + 0.5] },
          cues: [[tc, 'click', 0.8], [tc + 0.25, 'switch', 0.4]],
        };
      },
    },
    {
      id: 'f10', step: 7, kicker: '02:15:24 – 02:16:00 · SOP', title: 'Your procedure,\nstep by step.', who: ['operator', 'system'], concept: 'Concept: works check, SOP prompts',
      body: 'The system runs the routine checks. Nurul verifies and dispatches; the duty manager approves the police call.',
      path: 'Active Alarms  ›  SOP Flow',
      personas: [{ k: 'nurul', act: 'Approves the dispatch', t: () => at('v11', 'approves') + 0.25 }, { k: 'daniel', act: 'Approves the police call', t: () => at('v12', 'Daniel') }],
      plan: () => {
        const td = at('v11', 'approves') + 0.2, d = A('sop', 'dispatch'), [dx, dy] = mid(d);
        return {
          screens: [[S('f10').start, F.sopa], [at('v11', 'Nurul') + 0.1, F.sop], [td + 0.3, F.sopd], [at('v12', 'informs') + 0.2, F.sopt], [at('v12', 'approves') - 0.1, F.sopp]],
          shots: [[S('f10').start + 0.1, [560, 560, 820, 420], 1.1], [td + 0.6, [370, 280, 600, 340], 1.2], [at('v12', 'Airside') - 0.4, [560, 560, 820, 420], 1.1]],
          hls: [
            { r: pad(A('sop', 'auto'), 2), n: null, label: 'Routine checks: the system', side: 'l', t0: at('v11', 'system') - 0.1, t1: at('v11', 'Nurul') - 0.2 },
            { r: pad(A('sop', 'verify'), 2), n: null, label: 'Nurul verifies and approves', side: 'l', t0: at('v11', 'Nurul') + 0.1, t1: td + 0.25 },
            { r: pad(A('sopd', 'vehicle'), 6), n: null, label: 'Patrol 2 on the way', side: 't', dist: 40, t0: td + 0.9, t1: at('v12', 'Airside') - 0.45 },
            { r: pad(A('sopt', 'step5'), 2), n: null, label: 'Airside Ops and tower', side: 'l', t0: at('v12', 'Airside') + 0.1, t1: at('v12', 'Daniel') - 0.2 },
            { r: pad(A('sopp', 'step6'), 2), n: null, label: 'Police call: duty manager', side: 'l', t0: at('v12', 'Daniel') + 0.1, t1: S('f10').end },
          ],
          cursor: { path: [[at('v11', 'Nurul') - 0.4, dx + 190, dy + 70], [td - 0.12, dx + 6, dy + 4]], clicks: [td], win: [at('v11', 'Nurul') - 0.5, td + 0.5] },
          cues: [[td, 'click', 0.8], [td + 0.1, 'confirm', 0.55], [at('v12', 'Airside'), 'notify', 0.4], [at('v12', 'approves'), 'confirm', 0.4]],
        };
      },
    },
    {
      id: 'f11', step: 8, kicker: '02:18:08 · Patrol on scene', title: 'Stopped short\nof the runway.', who: ['patrol', 'system'], concept: 'Concept: patrol on the map',
      body: 'Cameras keep the person in view. Patrol 2, two officers, reaches them inside the fence line and holds for the police.', path: 'Active Alarms  ›  Patrol 2 on scene',
      personas: [{ k: 'arjun', act: 'Patrol 2 · two officers', t: () => at('v13', 'patrol') }],
      plan: () => ({
        screens: [[S('f11').start, F.scene]],
        shots: [[S('f11').start + 0.1, [380, 290, 520, 340], 1.2]],
        hls: [
          { r: pad(A('scene', 'patrolLabel'), 2), n: 1, label: 'Inside the fence line, short of the runway', side: 'b', dist: 14, dx: -230, t0: at('v13', 'reaches') - 0.1, t1: S('f11').end },
        ],
        cues: [[at('v13', 'reaches'), 'success', 0.35]],
      }),
    },
    {
      id: 'f12', step: 9, kicker: '02:44:20 · Closed', title: 'Closed, with\na full record.', who: ['operator', 'copilot'], concept: 'Concept: incident timeline, evidence pack, Co-pilot draft',
      body: 'Closed by Nurul, signed off by Daniel: the incident timeline, locked evidence and a report drafted by Co-pilot.', path: 'Incident Management  ›  PER-005 closed',
      plan: () => ({
        screens: [[S('f12').start, F.close]],
        shots: [[S('f12').start + 0.1, [600, 500, 960, 560], 1.1]],
        hls: [
          { r: A('close', 'closed'), n: 1, label: 'Closed and signed off', side: 'b', dist: 8, t0: at('v14', 'closes') - 0.1, t1: S('f12').end },
          { r: A('close', 'timeline'), n: 2, label: 'Every step, timed', side: 'l', dist: 24, dy: 211, t0: at('v14', 'Every') - 0.1, t1: S('f12').end },
          { r: A('close', 'report'), n: 3, label: 'Drafted for review', side: 'l', dist: 24, dy: 192, t0: at('v14', 'with') - 0.3, t1: S('f12').end },
        ],
        cues: [[at('v14', 'closes'), 'stamp', 0.4]],
      }),
    },
  ];
  const CX = 120, CW = 520, DX = 725, DY = 128, DW = 1010;   // device bottom clears two-line subtitles

  E.scene({
    id: 'console', start: S('f05').start, end: S('f12').end, inDur: 0.6, outDur: 0.6,
    build(el, s) {
      s.con = K.console(el, { x: DX, y: DY, w: DW });
      Object.values(F).forEach(f => s.con.frame(f));
      s.live = E.add(el, `<div class="abs live" style="left:${DX}px;top:62px"><span class="rd"></span><b>LIVE</b><span class="dv"></span><span class="lp"></span></div>`);
      s.lp = E.q(s.live, '.lp');
      s.flash = E.add(s.con.dev, '<div class="abs" style="inset:0;z-index:4;background:radial-gradient(900px 600px at 70% 30%, rgba(215,45,48,.45), rgba(215,45,48,0));opacity:0"></div>');
      // step tracker
      s.trk = E.add(el, `<div class="abs" style="left:${CX}px;top:186px;display:flex;align-items:center;gap:6px">${STEPS.map(() =>
        '<i style="display:block;height:8px;border-radius:4px;width:30px;background:rgba(255,255,255,.16)"></i>').join('')}
        <span class="label trl" style="margin-left:12px;color:var(--acc)"></span></div>`);
      s.trkI = E.qa(s.trk, 'i'); s.trl = E.q(s.trk, '.trl');
      s.sc = SC.map(d => {
        const w = S(d.id), plan = d.plan();
        const g = E.add(el, `<div class="abs" style="left:${CX}px;top:0;width:${CW}px;height:1080px"></div>`);
        const kick = E.add(g, `<div class="abs kicker" style="left:0;top:236px">${d.kicker}</div>`);
        const ttl = E.add(g, `<div class="abs" style="left:0;top:282px;width:${CW}px">${d.title.split('\n').map(l => `<div class="h-m" style="font-size:52px;white-space:nowrap">${l}</div>`).join('')}</div>`);
        let y = 282 + d.title.split('\n').length * 56 + 30;
        let body = null, cp = null, per = [], con = null;
        if (d.body) { body = E.add(g, `<div class="abs body" style="left:0;top:${y}px;width:${CW - 20}px;font-size:24px;line-height:1.45;color:#C9D3E6">${d.body}</div>`); y += body.offsetHeight + 26; }
        if (d.copilot) { cp = K.copilot(g, { x: 0, y, w: CW, label: d.copilot.label, quote: d.copilot.quote, meter: d.copilot.meter, pre: d.copilot.pre }); y += cp.el.offsetHeight + 26; }
        const who = E.add(g, `<div class="abs" style="left:0;top:${y}px;display:flex;gap:10px">${d.who.map(k => `<span style="display:inline-flex;align-items:center;gap:9px;height:36px;padding:0 16px;border-radius:18px;background:rgba(14,22,40,.8);border:1.5px solid ${WHO[k][1]}AA;font-size:18px;font-weight:600;color:#fff;white-space:nowrap"><i style="width:9px;height:9px;border-radius:50%;background:${WHO[k][1]};box-shadow:0 0 10px ${WHO[k][1]}"></i>${WHO[k][0]}</span>`).join('')}</div>`);
        y += 54;
        if (d.concept) { con = E.add(g, `<div class="abs" style="left:0;top:${y}px;display:inline-flex;height:30px;align-items:center;padding:0 13px;border-radius:15px;border:1.5px dashed rgba(201,211,230,.55);font-size:16px;color:#C9D3E6;white-space:nowrap">${d.concept}</div>`); y += 52; }
        (d.personas || []).forEach(pp => {
          const p = PERSONA[pp.k];
          per.push(E.add(g, `<div class="abs" style="left:0;top:${y}px;display:flex;align-items:center;gap:18px">
            <div style="width:84px;height:96px;flex:none;border-radius:12px;overflow:hidden;box-shadow:0 0 0 1.5px rgba(255,255,255,.45),0 12px 30px rgba(0,0,0,.5)">
              <img src="assets/persona_${pp.k}.jpg" style="width:84px;height:96px;object-fit:cover;object-position:50% 30%"></div>
            <div><div style="font-size:22px;font-weight:600;color:#fff">${p[0]} <span style="color:var(--muted);font-weight:400">· ${p[1]}</span></div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:21px;color:var(--acc2)">${K.icon('userCheck', 22, 1.9)}<span>${pp.act}</span></div></div></div>`));
          y += 112;
        });
        plan.hls.forEach(h => { h.t1 = Math.min(h.t1, w.end - (d.id === 'f12' ? 0.2 : 0.45)); K.hl(s.con, h); });
        const col = { d, w, plan, g, kick, ttl, body, cp, who, per, con };
        if (plan.cursor) col.cur = K.cursor(s.con);
        (plan.cues || []).forEach(c => E.cue(c[0], c[1], c[2]));
        return col;
      });
      // one plan for the whole sequence, in time order
      s.con.plan = { screens: s.sc.flatMap(c => c.plan.screens), shots: s.sc.flatMap(c => [[c.w.start - 0.45, null, 0.9], ...c.plan.shots]) };
      s.con.plan.shots.shift();
      s.con.plan.shots.unshift([s.start, null, 0.1]);
      s.con.plan.screens.slice(2).forEach(([t]) => E.cue(t, 'scan', 0.4, { dur: 0.55 }));
      s.sc.forEach(c => c.plan.hls.forEach(h => E.cue(h.t0 + 0.05, 'blip', 0.45)));
      s.sc.forEach(c => { if (c.cp) E.cue(c.d.copilot.tq(), 'typerun', 0.2, { dur: Math.min(3.0, c.d.copilot.quote.length / 42) }); (c.d.personas || []).forEach(pp => E.cue(pp.t(), 'pop', 0.35)); });
      E.cue(s.start + 0.1, 'whoosh', 0.45);
    },
    update(t, lt, s) {
      const kin = E.ep(t, s.start, s.start + 1.1, 'out5'), kout = E.ep(t, s.end - 0.7, s.end, 'in');
      E.css(s.con.root, { transform: `perspective(2400px) translate3d(${E.f3(60 * (1 - kin) - 40 * kout)}px,0,0) rotateY(${E.f3(-9 * (1 - kin) + 6 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})`, opacity: E.f3(kin * (1 - kout)) });
      K.bracketsIn(s.con.brk, E.ep(t, s.start + 0.5, s.start + 1.2) * (1 - kout));
      K.consoleUpdate(s.con, t);
      // alarm flash
      const fl = s.sc[0].plan.flash;
      E.css(s.flash, { opacity: E.f3(t > fl ? (0.5 + 0.5 * Math.cos((t - fl) * 9)) * (1 - E.ep(t, fl, fl + 1.6)) : 0) });
      // tracker + live path (the wall interlude counts as step 6)
      let cur = s.sc[0];
      for (const c of s.sc) if (t >= c.w.start + 0.3) cur = c;
      const step = t >= S('f09').start + 0.3 && t < S('f10').start + 0.3 ? 6 : cur.d.step;
      s.trkI.forEach((e, i) => E.css(e, { background: i < step - 1 ? 'rgba(143,180,255,.45)' : i === step - 1 ? '#8FB4FF' : 'rgba(255,255,255,.16)', boxShadow: i === step - 1 ? '0 0 12px rgba(143,180,255,.7)' : 'none' }));
      E.txt(s.trl, `Step ${step} of 9`);
      E.fade(s.trk, E.ep(t, s.start + 0.3, s.start + 0.9) * (1 - kout), { dy: 8 });
      E.txt(s.lp, cur.d.path);
      E.fade(s.live, E.ep(t, s.start + 0.6, s.start + 1.1) * (1 - kout), { dx: -10, dy: 0 });
      // left column, one step at a time
      s.sc.forEach(c => {
        const a = c.w.start, b = c.w.end, on = t >= a - 0.1 && t <= b + 0.1;
        E.css(c.g, { display: on ? 'block' : 'none' });
        if (on) {
          const out = 1 - E.ep(t, b - 0.35, b, 'in'), fresh = a + 0.05;
          E.fade(c.kick, E.ep(t, fresh, fresh + 0.4) * out, { dy: 8 });
          Array.from(c.ttl.children).forEach((ln, j) => E.revealWords(ln, t, fresh + 0.15 + j * 0.18, { per: 0.06, dur: 0.5, dy: 18, blur: 8 }));
          E.vis(c.ttl, out);
          if (c.body) E.fade(c.body, E.ep(t, fresh + 0.45, fresh + 0.95) * out, { dy: 14 });
          if (c.cp) { E.fade(c.cp.el, E.ep(t, fresh + 0.3, fresh + 0.8) * out, { dy: 18, blur: 4 }); K.copilotUpdate(c.cp, t, c.d.copilot.tq(), fresh + 0.6); }
          E.fade(c.who, E.ep(t, fresh + 0.6, fresh + 1.0) * out, { dx: -10, dy: 0 });
          if (c.con) E.fade(c.con, E.ep(t, fresh + 0.8, fresh + 1.2) * out, { dx: -10, dy: 0 });
          c.per.forEach((e, k) => { const tp = c.d.personas[k].t(); E.fade(e, E.ep(t, tp, tp + 0.5) * out, { dx: -14, dy: 0 }); });
        }
        if (c.cur) K.cursorUpdate(s.con, c.cur, t, c.plan.cursor.path, c.plan.cursor.clicks, E.env(t, c.plan.cursor.win[0], c.plan.cursor.win[1], 0.25));
      });
    },
  });
})();
