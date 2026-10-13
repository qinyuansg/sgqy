/* m1–m9 · The night on the V11 console: one device stays on screen while Co-pilot works through
   seven incidents, then the duty manager's question and the handover report. Real V11 screens;
   the camera pushes in on the evidence; lavender tags name what the narration points at. */
(function () {
  'use strict';
  const F = {
    home: 'V11-01-home-real-time-alerts', tail: 'V11-02-tailgating-investigation', sop: 'V11-03-tailgating-sop-flow-door-control',
    card: 'V11-04-identity-spoofing-investigation', bag: 'V11-05-unattended-bag-sop-flow', watch: 'V11-06-watchlist-loitering-sop-verify',
    fight: 'V11-07-fight-detection-investigation', over: 'V11-08-overstay-investigation', fence: 'V11-09-agil-fence-lidar-investigation',
    esc: 'V11-10-escalate-event-copilot-prefill', ask: 'V11-11-search-ask-copilot', rep: 'V11-12-incident-management-report',
  };
  const L = E.L, at = E.at, S = E.S;
  const PANEL = [880, 180, 480, 540], HEAD = [880, 180, 480, 380];
  const PERSONA = {
    nurul: ['Nurul', 'Control room operator'], arjun: ['Arjun', 'Patrol officer'],
    daniel: ['Daniel', 'Duty security manager'], grace: ['Grace', 'Head of security'],
  };

  // ---- one entry per scene: left column beats + screen plan ----
  const SC = [
    {
      id: 'm1', seg: 0, kicker: '02:14 · T3 · Staff Door D-214', sev: 'crit',
      beats: () => [
        { t: S('m1').start, title: '5 alarms.\n1 incident.', meter: { kind: 'gauge', v: 94 }, tq: L('v11').start + 0.5,
          quote: 'Two people, one badge at D-214. The follower has no credential and is heading airside.' },
        { t: L('v12').start - 0.25, title: 'Co-pilot prepares.\nYou approve.', meter: { kind: 'steps', n: 4, done: 1, wait: 1, label: 'Step 2 of 4', after: { t: at('v12', 'locks') + 0.1, done: 2, wait: 0, label: 'Step 2 approved' } }, tq: L('v12').start + 0.2,
          quote: 'Step 1 done: follower tracked on 3 cameras. Step 2, locking D-214, runs only on your approval.',
          persona: { k: 'nurul', act: 'Approved: lock D-214', t: at('v12', 'locks') + 0.15 } },
      ],
      plan: () => {
        const tEsc = at('v12', 'escalation') - 0.35, tClick = at('v12', 'locks') - 0.05;
        return {
          screens: [[S('m1').start, F.tail], [L('v12').start - 0.15, F.sop], [tEsc, F.esc]],
          shots: [[L('v11').start - 0.3, [880, 175, 480, 690], 1.5], [E.C('v11', 1).start - 0.2, [900, 218, 300, 350], 1.2],
            [L('v12').start, [700, 535, 700, 534], 1.1], [tEsc + 0.15, [345, 280, 710, 530], 1.1]],
          hls: [
            { r: [946, 736, 398, 114], n: 1, label: '5 alarms linked', side: 'l', t0: at('v11', 'Five') + 0.1, t1: E.C('v11', 1).start },
            { r: [964, 376, 70, 172], n: 2, label: 'No badge, heading airside', side: 'l', t0: E.C('v11', 1).start + 0.6, t1: L('v12').start - 0.2 },
            { r: [930, 634, 426, 62], n: 3, label: 'Step 1 done by Co-pilot', side: 'l', t0: L('v12').start + 0.9, t1: tClick - 0.2 },
            { r: [952, 775, 66, 38], n: 4, label: 'One click: lock D-214', side: 'l', dist: 24, t0: tClick + 0.05, t1: tEsc },
            { r: [393, 492, 614, 72], n: 5, label: 'Pre-filled by Co-pilot', side: 't', dx: 300, dist: 2, t0: tEsc + 0.75, t1: S('m1').end + 0.1 },
          ],
          marks: [{ r: [1313, 705, 18, 18], t: tClick + 0.12, t1: tEsc + 0.6 }],
          cursor: { path: [[tClick - 1.3, 1230, 905], [tClick - 0.15, 986, 795], [tEsc - 0.2, 1010, 820]], clicks: [tClick], win: [tClick - 1.4, tEsc - 0.05] },
          cues: [[tClick, 'click', 0.8], [tClick + 0.08, 'confirm', 0.55], [tEsc, 'whoosh', 0.35]],
        };
      },
    },
    {
      id: 'm2', seg: 1, kicker: '02:15 · Fence Sector 5', sev: 'crit',
      beats: () => [{ t: S('m2').start, title: 'A real intruder,\nnot the wind.', meter: { kind: 'gauge', v: 91 }, tq: L('v13').start + 0.4,
        quote: 'LiDAR: one 1.7 m object. Thermal: one person. Wind is 12 km/h, so not a nuisance alarm.' }],
      plan: () => ({
        screens: [[S('m2').start, F.fence]],
        shots: [[S('m2').start + 0.2, PANEL, 1.2], [at('v13', 'LiDAR') - 0.2, [990, 260, 380, 300], 1.2], [E.C('v13', 1).start - 0.1, [900, 280, 300, 300], 1.1]],
        hls: [
          { r: [1218, 324, 44, 58], n: 1, label: 'LiDAR: 1 object, 1.7 m', side: 'b', dx: -40, dist: 8, t0: at('v13', 'LiDAR') + 0.5, t1: S('m2').end + 0.1 },
          { r: [999, 374, 86, 112], n: 2, label: 'Thermal: one person', side: 'l', t0: at('v13', 'Thermal') + 0.1, t1: S('m2').end + 0.1 },
        ],
      }),
    },
    {
      id: 'm3', seg: 2, kicker: '02:16 · T2 · Gate B12', sev: 'warn',
      beats: () => [{ t: S('m3').start, title: 'Bag and owner,\nlinked in 6 s.', meter: { kind: 'steps', n: 5, done: 4, wait: 1, label: '4 of 5 done' }, tq: L('v14').start + 0.3,
        quote: 'Bag placed at 01:58. The owner is at Food Court L3, matched by clothing. Found in 6.2 s.',
        persona: { k: 'arjun', act: 'Sent to the owner, once approved', t: E.C('v14', 1).start + 2.0 } }],
      plan: () => ({
        screens: [[S('m3').start, F.bag]],
        shots: [[S('m3').start + 0.15, [900, 225, 460, 330], 1.1], [E.C('v14', 1).start + 0.8, [700, 540, 700, 529], 1.0]],
        hls: [
          { r: [988, 436, 54, 66], n: 1, label: 'Unattended bag', side: 'l', t0: L('v14').start + 0.5, t1: E.C('v14', 1).start + 0.7 },
          { r: [1251, 466, 52, 78], n: 2, label: 'By clothing', side: 'r', dist: 12, t0: at('v14', 'owner') - 0.1, t1: E.C('v14', 1).start + 0.7 },
          { r: [928, 634, 428, 172], n: 3, label: 'Steps 1–4 in 6.2 s', side: 'l', t0: E.C('v14', 1).start + 1.3, t1: S('m3').end },
          { r: [951, 895, 92, 38], n: 4, label: 'You decide', side: 'l', t0: E.C('v14', 1).start + 2.0, t1: S('m3').end },
        ],
      }),
    },
    {
      id: 'm4', seg: 3, kicker: '02:11 · T2 · Arrival Belt 5', sev: 'warn',
      beats: () => [{ t: S('m4').start, title: 'Seen and heard,\nbefore it spreads.', meter: { kind: 'gauge', v: 78 }, tq: L('v15').start + 0.3,
        quote: 'Arguing turned to pushing. Video and intercom audio agree. Nearest officers: 40 m and 90 m.' }],
      plan: () => ({
        screens: [[S('m4').start, F.fight]],
        shots: [[S('m4').start + 0.2, PANEL, 1.2], [at('v15', 'Video') - 0.2, [880, 300, 480, 540], 1.1], [E.C('v15', 1).start - 0.15, HEAD, 1.1]],
        hls: [
          { r: [979, 372, 93, 129], n: 1, label: 'Video: aggression 0.89', side: 'l', dist: 20, t0: at('v15', 'Video') + 0.4, t1: E.C('v15', 1).start },
          { r: [946, 758, 404, 22], n: 2, label: 'Audio: raised voices', side: 'l', t0: at('v15', 'audio') - 0.1, t1: E.C('v15', 1).start },
          { r: [910, 258, 276, 24], n: 3, label: 'Officers 40 m and 90 m', side: 'b', t0: at('v15', 'nearest') + 0.4, t1: S('m4').end + 0.1 },
        ],
      }),
    },
    {
      id: 'm5', seg: 4, kicker: '02:13 · T1 · Door C2', sev: 'warn',
      beats: () => [{ t: S('m5').start, title: 'One card. Two doors.\nFour minutes.', meter: { kind: 'gauge', v: 82 }, tq: L('v16').start + 0.3,
        quote: 'Card S-20931 opened A17 at 02:09 and C2 at 02:13. C2 accepted an old card ID.' }],
      plan: () => ({
        screens: [[S('m5').start, F.card]],
        shots: [[S('m5').start + 0.2, HEAD, 1.2], [L('v17').start + 0.1, [700, 590, 660, 330], 1.2]],
        hls: [
          { r: [908, 236, 408, 24], n: 1, label: 'A17 → C2 in 4 minutes', side: 't', dist: 2, t0: L('v16').start + 0.5, t1: L('v17').start },
          { r: [988, 378, 90, 166], n: 2, label: 'Not the cardholder', side: 'l', t0: E.C('v16', 1).start + 0.2, t1: L('v17').start },
          { r: [946, 799, 404, 24], n: 3, label: 'Old card ID, not revoked', side: 'l', t0: at('v17', 'old') - 0.1, t1: S('m5').end + 0.1 },
        ],
      }),
    },
    {
      id: 'm6', seg: 5, kicker: '01:45 · T4 · Baggage Hall B2', sev: 'info',
      beats: () => [{ t: S('m6').start, title: 'Your own rules,\nrunning live.', meter: { kind: 'gauge', v: 73 }, tq: L('v18').start + 0.3,
        quote: 'K. Lim has been in B2 since 22:05. The shift ended at 01:00. Outside duty zones, no overtime.' }],
      plan: () => ({
        screens: [[S('m6').start, F.over]],
        shots: [[S('m6').start + 0.2, HEAD, 1.2], [E.C('v18', 1).start - 0.2, [700, 600, 660, 330], 1.1], [L('v19').start - 0.2, [10, 360, 520, 300], 1.3]],
        hls: [
          { r: [908, 234, 304, 28], n: 1, label: 'In B2 since 22:05', side: 'r', dist: 24, t0: L('v18').start + 0.4, t1: E.C('v18', 1).start },
          { r: [944, 735, 408, 110], n: 2, label: 'Your rules: 4 triggered', side: 'l', t0: E.C('v18', 1).start + 0.6, t1: L('v19').start },
          { r: [44, 444, 324, 116], n: 3, label: 'Rated Info: a radio check', side: 'r', t0: L('v19').start + 0.9, t1: S('m6').end + 0.1 },
        ],
      }),
    },
    {
      id: 'm7', seg: 6, kicker: '02:12 · T1 · Departure Hall Row K', sev: 'warn',
      beats: () => [{ t: S('m7').start, title: 'Sensitive calls\nstay human.', meter: { kind: 'gauge', v: 87, col: '#D4B741', label: 'Possible match' }, tq: L('v20').start + 0.3,
        quote: 'Loitering 23 min, three staff-door approaches. Nothing happens until you confirm.',
        persona: { k: 'nurul', act: 'Confirms or rejects. Logged.', t: L('v21').start } }],
      plan: () => ({
        screens: [[S('m7').start, F.watch]],
        shots: [[S('m7').start + 0.2, HEAD, 1.2], [E.C('v20', 1).start - 0.2, [1080, 270, 290, 300], 1.1], [L('v21').start - 0.4, [900, 600, 460, 220], 1.1]],
        hls: [
          { r: [908, 234, 424, 48], n: 1, label: '23 min, 3 approaches', side: 'b', dist: 130, dx: -90, t0: L('v20').start + 0.6, t1: E.C('v20', 1).start },
          { r: [1132, 296, 214, 250], n: 2, label: 'Side by side', side: 'b', dist: 20, t0: E.C('v20', 1).start + 0.6, t1: L('v21').start - 0.3 },
          { r: [951, 712, 252, 36], n: 3, label: 'A person decides', side: 'r', t0: L('v21').start + 0.4, t1: S('m7').end + 0.1 },
        ],
      }),
    },
    {
      id: 'm8', seg: 7, kicker: '02:30 · The duty manager asks', sev: 'ask',
      beats: () => [{ t: S('m8').start, title: 'Ask in plain\nEnglish.', label: 'CO-PILOT ANSWERS', tq: at('v22', 'English') + 0.6, cps: 44, pre: 'Listening',
        quote: 'Two critical incidents in Terminal 5 in the last hour. Both are closed: a forced door and a wildlife alarm.',
        persona: { k: 'daniel', act: 'Asks, in plain English', t: L('v22').start + 0.4 } }],
      plan: () => {
        const tAns = at('v22', 'English') + 0.35;
        return {
          screens: [[S('m8').start, F.home], [tAns, F.ask]],
          shots: [[S('m8').start + 0.2, [440, 0, 960, 733], 1.2], [tAns + 0.1, [180, 20, 920, 600], 0.9]],
          hls: [
            { r: [438, 92, 644, 110], n: 1, label: 'One-line answer', side: 'l', t0: tAns + 0.7, t1: tAns + 2.3 },
            { r: [452, 492, 490, 22], n: 2, label: 'With its sources', side: 'l', t0: tAns + 1.9, t1: S('m8').end },
          ],
          type: { r: [649, 42, 446, 40], text: 'Show critical incidents in Terminal 5 in the last hour', t0: L('v22').start + 0.9, t1: tAns, cps: 30 },
        };
      },
    },
    {
      id: 'm9', seg: 8, kicker: '07:00 · Shift handover', sev: 'rep',
      beats: () => [{ t: S('m9').start, title: 'The report\nwrites itself.', label: 'CO-PILOT REPORT DRAFT', tq: L('v23').start + 0.4, cps: 48,
        quote: 'Badge B-55821 took two people airside. The follower was intercepted at L2-East at 02:21. Root cause: courtesy tailgating.',
        persona: { k: 'grace', act: 'Reviews and signs', t: E.C('v23', 1).start } }],
      plan: () => ({
        screens: [[S('m9').start, F.rep]],
        shots: [[S('m9').start + 0.1, [20, 180, 1000, 700], 1.1], [at('v23', 'written') - 0.3, [860, 480, 700, 560], 1.3]],
        hls: [
          { r: [42, 296, 802, 500], n: 1, label: 'Every escalation, listed', side: 'b', dist: 10, t0: L('v23').start - 0.2, t1: at('v23', 'written') - 0.2 },
          { r: [886, 596, 650, 112], n: 2, label: 'Drafted from the audit trail', side: 't', dist: 14, t0: at('v23', 'audit') - 0.3, t1: S('m9').end },
          { r: [879, 962, 669, 51], n: 3, label: 'A person signs', side: 't', dist: 14, t0: E.C('v23', 1).start - 0.2, t1: S('m9').end },
        ],
      }),
    },
  ];
  const TRACK = ['1', '2', '3', '4', '5', '6', '7', 'Ask', 'Report'];
  const SEVPILL = { crit: K.pill('crit'), warn: K.pill('warn'), info: K.pill('info'), ask: '<span class="pill lav"><i></i>ASK CO-PILOT</span>', rep: '<span class="pill lav"><i></i>HANDOVER</span>' };
  const CX = 120, CW = 520, DX = 700, DY = 128, DW = 1060;

  E.scene({
    id: 'console', start: S('m1').start, end: S('m9').end, inDur: 0.6, outDur: 0.6,
    build(el, s) {
      // device
      s.con = K.console(el, { x: DX, y: DY, w: DW });
      Object.values(F).forEach(f => s.con.frame(f));
      s.live = E.add(el, `<div class="abs live" style="left:${DX}px;top:62px"><span class="rd"></span><b>LIVE</b><span class="dv"></span><span class="lp"></span></div>`);
      s.lp = E.q(s.live, '.lp');
      // tracker
      s.trk = E.add(el, `<div class="abs" style="left:${CX}px;top:186px;display:flex;align-items:center;gap:6px">${TRACK.map(k =>
        `<i style="display:block;height:8px;border-radius:4px;width:${k.length > 1 ? 40 : 26}px;background:rgba(255,255,255,.16)"></i>`).join('')}
        <span class="label trl" style="margin-left:12px;color:var(--lav)"></span></div>`);
      s.trkI = E.qa(s.trk, 'i'); s.trl = E.q(s.trk, '.trl');
      // per-scene columns and plans
      s.sc = SC.map(d => {
        const w = S(d.id), plan = d.plan();
        const col = { d, w, plan, beats: d.beats().map((b, i, arr) => {
          const g = E.add(el, `<div class="abs" style="left:${CX}px;top:0;width:${CW}px;height:1080px"></div>`);
          const kick = E.add(g, `<div class="abs kicker" style="left:0;top:228px">${d.kicker}</div>`);
          const pill = E.add(g, `<div class="abs" style="left:0;top:270px">${SEVPILL[d.sev]}</div>`);
          const ttl = E.add(g, `<div class="abs h-m ttl" style="left:0;top:336px;width:${CW}px;font-size:50px">${b.title.split('\n').map(l => `<div class="h-m" style="font-size:50px;white-space:nowrap">${l}</div>`).join('')}</div>`);
          const cp = K.copilot(g, { x: 0, y: 478, w: CW, h: 214, label: b.label, meter: b.meter, quote: b.quote, pre: b.pre });
          let per = null;
          if (b.persona) {
            const p = PERSONA[b.persona.k];
            per = E.add(g, `<div class="abs" style="left:0;top:${478 + cp.el.offsetHeight + 30}px;display:flex;align-items:center;gap:18px">
              <div style="width:84px;height:96px;flex:none;border-radius:12px;overflow:hidden;box-shadow:0 0 0 1.5px rgba(255,255,255,.45),0 12px 30px rgba(0,0,0,.5)">
                <img src="assets/persona_${b.persona.k}.jpg" style="width:84px;height:96px;object-fit:cover;object-position:50% 30%"></div>
              <div><div style="font-size:22px;font-weight:600;color:#fff">${p[0]} <span style="color:var(--muted);font-weight:400">· ${p[1]}</span></div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:21px;color:var(--lav2)">${K.icon('userCheck', 22, 1.9)}<span>${b.persona.act}</span></div></div></div>`);
          }
          const end = i + 1 < arr.length ? arr[i + 1].t : w.end;
          return { b, g, kick, pill, ttl, cp, per, t0: b.t, t1: end, first: i === 0 };
        }) };
        plan.hls.forEach(h => { h.t1 = Math.min(h.t1, w.end - 0.45); K.hl(s.con, h); });
        if (plan.cursor) col.cur = K.cursor(s.con);
        col.marks = (plan.marks || []).map(m => ({ ...m, el: E.add(s.con.root, `<div class="abs" style="left:0;top:0;transform-origin:0 0;z-index:5;width:${m.r[2]}px;height:${m.r[3]}px;border-radius:3px;background:#2D6BFF;color:#fff;display:grid;place-items:center">${K.icon('check', 14, 3)}</div>`) }));
        if (plan.type) {
          col.ty = E.add(s.con.root, `<div class="abs" style="left:0;top:0;transform-origin:0 0;z-index:5;width:${plan.type.r[2]}px;height:${plan.type.r[3]}px;border-radius:8px;background:#3A3F48;border:1.5px solid #B69CFF;display:flex;align-items:center;gap:8px;padding:3px 0 0 16px;color:#fff;font:400 16px/1 InterF;white-space:nowrap;overflow:hidden">
            <span style="color:#B69CFF;display:flex">${K.icon('sparkle', 18, 2)}</span><span class="tt"></span><span class="caret" style="height:18px"></span></div>`);
          col.tyT = E.q(col.ty, '.tt');
        }
        (plan.cues || []).forEach(c => E.cue(c[0], c[1], c[2]));
        return col;
      });
      // all screens share one plan, in time order
      s.con.plan = { screens: s.sc.flatMap(c => c.plan.screens), shots: s.sc.flatMap(c => [[c.w.start - 0.45, null, 0.9], ...c.plan.shots]) };
      s.con.plan.shots.shift();
      s.con.plan.shots.unshift([s.start, null, 0.1]);
      // sound: screen changes, tags, typing
      s.con.plan.screens.slice(1).forEach(([t]) => E.cue(t, 'scan', 0.45));
      s.sc.forEach(c => c.plan.hls.forEach(h => E.cue(h.t0 + 0.05, 'blip', 0.5)));
      s.sc.forEach(c => c.beats.forEach(bt => { E.cue(bt.b.tq, 'typerun', 0.22, { dur: Math.min(3.2, bt.b.quote.length / (bt.b.cps || 42)) }); if (bt.b.persona) E.cue(bt.b.persona.t, 'pop', 0.4); }));
      s.sc.forEach(c => { if (c.ty) E.cue(c.plan.type.t0, 'typerun', 0.35, { dur: c.plan.type.text.length / c.plan.type.cps }); });
      E.cue(s.start + 0.1, 'whoosh', 0.5); E.cue(s.start + 0.5, 'swell', 0.3, { dur: 1.6 });
    },
    update(t, lt, s) {
      // device enters with a short dolly, leaves the same way
      const kin = E.ep(t, s.start, s.start + 1.1, 'out5'), kout = E.ep(t, s.end - 0.7, s.end, 'in');
      E.css(s.con.root, { transform: `perspective(2400px) translate3d(${E.f3(60 * (1 - kin) - 40 * kout)}px,0,0) rotateY(${E.f3(-9 * (1 - kin) + 6 * kout)}deg) scale(${E.f3(0.96 + 0.04 * kin)})`, opacity: E.f3(kin * (1 - kout)) });
      K.bracketsIn(s.con.brk, E.ep(t, s.start + 0.5, s.start + 1.2) * (1 - kout));
      K.consoleUpdate(s.con, t);
      // tracker + live path
      let cur = s.sc[0];
      for (const c of s.sc) if (t >= c.w.start + 0.3) cur = c;
      s.trkI.forEach((e, i) => E.css(e, { background: i < cur.d.seg ? 'rgba(182,156,255,.45)' : i === cur.d.seg ? '#B69CFF' : 'rgba(255,255,255,.16)', boxShadow: i === cur.d.seg ? '0 0 12px rgba(182,156,255,.7)' : 'none' }));
      E.txt(s.trl, cur.d.seg < 7 ? `Incident ${cur.d.seg + 1} of 7` : cur.d.seg === 7 ? 'Ask Co-pilot' : 'Report');
      E.fade(s.trk, E.ep(t, s.start + 0.3, s.start + 0.9), { dy: 8 });
      E.txt(s.lp, LIVEP[cur.d.id](t));
      E.fade(s.live, E.ep(t, s.start + 0.6, s.start + 1.1) * (1 - kout), { dx: -10, dy: 0 });
      // columns
      s.sc.forEach(c => {
        c.beats.forEach(bt => {
          const a = bt.t0, b = bt.t1, on = t >= a - 0.1 && t <= b + 0.1;
          E.css(bt.g, { display: on ? 'block' : 'none' });
          if (!on) return;
          const out = 1 - E.ep(t, b - 0.35, b, 'in');
          const fresh = bt.first ? a + 0.05 : a;
          E.fade(bt.kick, (bt.first ? E.ep(t, fresh, fresh + 0.4) : 1) * out, { dy: 8 });
          E.fade(bt.pill, (bt.first ? E.ep(t, fresh + 0.1, fresh + 0.5) : 1) * out, { dx: -10, dy: 0 });
          Array.from(bt.ttl.children).forEach((ln, j) => E.revealWords(ln, t, fresh + 0.15 + j * 0.18, { per: 0.06, dur: 0.5, dy: 18, blur: 8 }));
          E.vis(bt.ttl, out);
          E.fade(bt.cp.el, E.ep(t, fresh + 0.3, fresh + 0.8) * out, { dy: 18, blur: 4 });
          K.copilotUpdate(bt.cp, t, bt.b.tq, fresh + 0.6, bt.b.cps || 42);
          if (bt.per) E.fade(bt.per, E.ep(t, bt.b.persona.t, bt.b.persona.t + 0.5) * out, { dx: -14, dy: 0 });
        });
        if (c.cur) K.cursorUpdate(s.con, c.cur, t, c.plan.cursor.path, c.plan.cursor.clicks, E.env(t, c.plan.cursor.win[0], c.plan.cursor.win[1], 0.25));
        c.marks.forEach(m => {
          const k = E.env(t, m.t, m.t1, 0.12), [x0, y0] = K.map(s.con, m.r[0], m.r[1]);
          E.css(m.el, { left: x0.toFixed(1) + 'px', top: y0.toFixed(1) + 'px', transform: `scale(${(s.con.cam.k * (0.7 + 0.3 * E.ep(t, m.t, m.t + 0.25, 'back'))).toFixed(4)})`, opacity: E.f3(k), visibility: k > 0.001 ? 'visible' : 'hidden' });
        });
        if (c.ty) {
          const y = c.plan.type, k = E.ep(t, y.t0 - 0.4, y.t0 - 0.15) * (t < y.t1 + 0.08 ? 1 : 0);
          const [x0, y0] = K.map(s.con, y.r[0], y.r[1]);
          E.css(c.ty, { left: x0.toFixed(1) + 'px', top: y0.toFixed(1) + 'px', transform: `scale(${s.con.cam.k.toFixed(4)})`, opacity: E.f3(k), visibility: k > 0.001 ? 'visible' : 'hidden' });
          E.type(c.tyT, y.text, t, y.t0, y.cps);
        }
      });
    },
  });
  const LIVEP = {
    m1: t => t < L('v12').start - 0.15 ? 'Active Alarms  ›  Staff Door D-214' : t < at('v12', 'escalation') - 0.35 ? 'SOP Flow  ›  Lock D-214' : 'Escalate  ›  Create Incident',
    m2: () => 'Active Alarms  ›  Fence Sector 5', m3: () => 'Gate B12 Holdroom  ›  SOP Flow', m4: () => 'Active Alarms  ›  Arrival Hall Belt 5',
    m5: () => 'Active Alarms  ›  T1 Door C2', m6: () => 'Active Alarms  ›  Baggage Hall B2', m7: () => 'Departure Hall Row K  ›  SOP Flow',
    m8: () => 'Search  ›  Ask Co-pilot', m9: () => 'Incident Management  ›  TGT-214',
  };
})();
