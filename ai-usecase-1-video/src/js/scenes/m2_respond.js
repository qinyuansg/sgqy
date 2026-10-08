/* m2 · 02:15 Tailgating to airside — SOP-grounded response, approved in one click, fully logged. */
E.scene({
  id: 'm2',
  build(el, s) {
    const v19 = E.L('v16'), v20 = E.L('v17'), v21 = E.L('v18');
    s.rail = MOMENT.rail(el, {
      n: 2, time: '02:15', title: 'Tailgating to airside', who: ['daniel'],
      story: { as: 'duty manager', want: 'responses recommended from our own SOPs, approved in one click', so: 'every shift gives the same, correct response' },
      before: 'Response depends on who is on shift', after: 'SOP steps, approved in one click', gainAt: v21.start + 0.6,
    });
    const st = MOMENT.stage(el, 'Incident 1 · Staff Door D-214',
      `<span class="pill crit">CRITICAL 94</span><span class="chip tm" style="height:32px">${C.icon('clock', 15)} <span class="tmv">Elapsed 00:00</span></span>`);
    s.tmv = E.q(st, '.tmv'); s.tm = E.q(st, '.tm');
    const body = E.q(st, '.st-body');
    s.door = E.add(body, `<div class="abs" style="left:22px;top:20px;width:430px;height:242px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,59,92,.45)">${C.cctvDoor(430, 242, 'd3')}<span class="chip" style="position:absolute;right:10px;bottom:10px;height:26px;font-size:12px;background:rgba(5,10,22,.85)">${C.icon('play', 13)} REPLAY · 02:13:52</span></div>`);
    s.p1 = E.q(s.door, '.p1'); s.p2 = E.q(s.door, '.p2'); s.b1 = E.q(s.door, '.b1'); s.b2 = E.q(s.door, '.b2'); s.reader = E.q(s.door, '.reader'); s.leaf = E.q(s.door, '.doorLeaf'); s.dts = E.q(s.door, '.ts');
    s.b1r = E.q(s.b1, 'rect'); s.b2r = E.q(s.b2, 'rect'); s.b1t = E.q(s.b1, 'text'); s.b2t = E.q(s.b2, 'text');
    const EV = [['users', '1 badge used · 2 people passed'], ['door', 'Door held open 14 s'], ['person', 'Second person not on roster'], ['route', 'Heading toward Stand C3']];
    s.why = E.add(body, `<div class="abs" style="left:22px;top:276px;width:430px">
      <div class="label" style="color:#FF8DA0;margin-bottom:10px">Why critical · evidence</div>
      ${EV.map(e => `<div class="ev" style="display:flex;align-items:center;gap:12px;height:40px;font-size:17px;color:#DCE4F2"><span style="color:#FF7A90">${C.icon(e[0], 18)}</span>${e[1]}</div>`).join('')}</div>`);
    s.evs = E.qa(s.why, '.ev');
    s.trk = E.add(body, `<div class="abs" style="left:22px;top:488px;width:430px;height:174px;border-radius:12px;overflow:hidden;border:1px solid rgba(77,141,255,.55)">${C.cctvApron(430, 174, 'a3')}
      <div class="chip blue trkc" style="position:absolute;left:10px;bottom:10px;height:28px;font-size:12px;background:rgba(5,10,22,.85)">${C.icon('sparkle', 13)} <span class="trkt">AI tracking · live</span></div></div>`);
    s.tp = E.q(s.trk, '.tp'); s.tb = E.q(s.trk, '.tb'); s.tbr = E.q(s.tb, 'rect'); s.trkt = E.q(s.trk, '.trkt'); s.ats = E.q(s.trk, '.ts');
    // response checklist
    const STEPS = [
      ['Lock staff doors D-214 and D-216', 'Access control · 2 doors', 'Approve', '02:15:04 · Approved by Daniel'],
      ['Track the unidentified person', 'Video analytics · cross-camera', 'Auto', '02:15:01 · AI tracking started'],
      ['Dispatch patrols P-1 and P-5', 'Nearest units · ETA 90 s', 'Approve', '02:15:12 · Approved by Daniel'],
      ['Notify Airport Police', 'Message drafted by AI', 'Send', '02:15:19 · Sent by Daniel'],
      ['Intercept and verify identity', 'Patrol P-1 at Stand C3', 'Confirm', '02:17:38 · Intercepted at Stand C3'],
    ];
    s.rp = E.add(body, `<div class="abs panel ai" style="left:474px;top:20px;width:644px;height:642px;padding:20px 22px;border-radius:16px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px;color:#8FB4FF">${C.icon('sparkle', 20)}<span class="kicker" style="font-size:14px">AI-recommended response</span></div>
        <span class="chip blue" style="height:28px;font-size:12px">${C.icon('list', 14)} Grounded in SOP AS-07 v3.2</span>
      </div>
      <div class="h-s" style="font-size:24px;margin-top:10px">Unauthorised airside access</div>
      <div class="steps" style="margin-top:14px">
        ${STEPS.map((x, i) => `
        <div class="stp" style="display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:14px;height:78px;border-top:1px solid var(--line)">
          <span class="num" style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:2px solid rgba(143,161,192,.4);font-family:var(--mono);font-size:15px;color:#A9B7CF">${i + 1}</span>
          <div style="min-width:0"><div style="font-weight:600;font-size:19px">${x[0]}</div><div class="det" style="font-size:15px;color:#8D9BB8;margin-top:3px">${x[1]}</div><div class="don mono" style="font-size:14px;color:#7BE8AC;margin-top:3px;display:none">${x[3]}</div></div>
          <span class="b btn ${x[2] === 'Auto' ? 'ghost' : ''}" style="min-width:104px">${x[2] === 'Auto' ? C.icon('sparkle', 15) + ' Auto' : x[2]}</span>
        </div>`).join('')}
      </div>
      <div class="audit" style="position:absolute;left:22px;right:22px;bottom:16px;height:92px;border-radius:12px;background:rgba(5,10,22,.6);border:1px solid var(--line);padding:10px 14px;overflow:hidden">
        <div style="display:flex;justify-content:space-between"><span class="label">Audit trail</span><span class="label alog" style="color:#7BE8AC">0 entries</span></div>
        <div class="lines mono" style="font-size:13px;color:#A9B7CF;margin-top:6px;line-height:1.55"></div>
      </div>
    </div>`);
    s.stps = E.qa(s.rp, '.stp').map(e => ({ el: e, num: E.q(e, '.num'), det: E.q(e, '.det'), don: E.q(e, '.don'), b: E.q(e, '.b') }));
    s.lines = E.q(s.rp, '.lines'); s.alog = E.q(s.rp, '.alog');
    s.banner = E.add(body, `<div class="abs" style="left:474px;top:20px;width:644px;height:0"></div>`);
    s.ghost = MOMENT.ghost(body, 474, 20, 644, 642, 'AI response · analysing incident…');
    s.cur = MOMENT.cursor(st);

    s.tWalk = v19.start + 0.1;
    s.tEv = v19.start + 2.2;
    s.tRp = v20.start + 0.05;
    s.tSteps = STEPS.map((_, i) => v20.start + 0.4 + i * 0.32);
    s.tClick = [v21.start + 0.55, null, v21.start + 1.45, v21.start + 2.3, null];
    s.tAuto = v20.end - 0.4;
    s.tJump = v21.cues[1].start + 0.05;
    s.tDone5 = s.tJump + 0.9;
    s.AUD = [
      [s.tAuto, '02:15:01  AI tracking started · CAM 4-207'],
      [s.tClick[0], '02:15:04  Daniel approved · lock D-214, D-216'],
      [s.tClick[2], '02:15:12  Daniel approved · dispatch P-1, P-5'],
      [s.tClick[3], '02:15:19  Daniel sent · Airport Police notified'],
      [s.tDone5, '02:17:38  P-1 intercepted subject · Stand C3'],
    ];
    s.doneAt = [s.tClick[0], s.tAuto, s.tClick[2], s.tClick[3], s.tDone5];
    E.cue(s.tWalk + 0.9, 'beep', 0.4); E.cue(s.tWalk + 1.5, 'alert', 0.75);
    E.cue(s.tRp, 'swell', 0.45, { dur: 1.2 }); s.tSteps.forEach(t => E.cue(t, 'blip', 0.28));
    E.cue(s.tAuto, 'blipHi', 0.4);
    [s.tClick[0], s.tClick[2], s.tClick[3]].forEach(t => { E.cue(t, 'click', 0.7); E.cue(t + 0.06, 'confirm', 0.45); });
    E.cue(s.tJump, 'whoosh', 0.5); E.cue(s.tDone5, 'success', 0.7);
  },
  update(t, lt, s) {
    MOMENT.updateRail(s.rail, t, s);
    const jump = t >= s.tJump;
    // scene clock (s since midnight): 02:15:00 at the response → 02:15:19 at the last click; time-lapse → 02:17:38
    const T0 = 2 * 3600 + 15 * 60, DET = 2 * 3600 + 13 * 60 + 52;
    const clk = jump ? Math.min(T0 + 158, T0 + 150 + (t - s.tJump) * 8 / 0.9)
      : T0 + 19 * Math.max(0, (t - s.tRp) / (s.tClick[3] - s.tRp)) - Math.max(0, s.tRp - t) * 0;
    E.txt(s.tmv, `Elapsed ${E.clock(Math.max(68, clk - DET)).slice(3)}`);
    E.cls(s.tm, 'ok', t >= s.tDone5);
    // door camera: badge holder, then tailgater
    const H = 242, W = 430;
    const x1 = E.lerp(60, 300, E.ep(t, s.tWalk, s.tWalk + 1.6, 'sine')), x2 = E.lerp(-30, 262, E.ep(t, s.tWalk + 0.55, s.tWalk + 2.3, 'sine'));
    const inside1 = E.p(x1, 236, 300), inside2 = E.p(x2, 210, 262);
    E.attr(s.p1, 'transform', `translate(${x1.toFixed(1)} ${H * 0.86})`); E.attr(s.p2, 'transform', `translate(${x2.toFixed(1)} ${H * 0.88})`);
    E.attr(s.p1, 'opacity', E.f3(1 - inside1)); E.attr(s.p2, 'opacity', E.f3(1 - inside2 * 0.85));
    E.attr(s.reader, 'fill', t > s.tWalk + 0.9 && t < s.tWalk + 3.6 ? '#2ED47A' : '#3A4A63');
    E.attr(s.leaf, 'opacity', t > s.tWalk + 1.0 && t < s.tWalk + 3.8 ? '1' : '0.25');
    const bw = 64, bh = 128;
    E.attr(s.b1, 'transform', `translate(${(x1 - bw / 2).toFixed(1)} ${(H * 0.86 - bh).toFixed(1)})`);
    E.attr(s.b2, 'transform', `translate(${(x2 - bw / 2).toFixed(1)} ${(H * 0.88 - bh - 4).toFixed(1)})`);
    E.attr(s.b1r, 'width', bw); E.attr(s.b1r, 'height', bh); E.attr(s.b2r, 'width', bw); E.attr(s.b2r, 'height', bh + 4);
    E.attr(s.b1t, 'y', '-6'); E.attr(s.b2t, 'y', '-6');
    E.attr(s.b1, 'opacity', E.f3(E.ep(t, s.tWalk + 0.5, s.tWalk + 0.8) * (1 - inside1)));
    E.attr(s.b2, 'opacity', E.f3(E.ep(t, s.tWalk + 1.5, s.tWalk + 1.8) * (1 - inside2 * 0.7)));
    E.txt(s.dts, E.clock(2 * 3600 + 13 * 60 + 43 + Math.min(Math.max(0, t - s.tWalk), 9)));
    s.evs.forEach((e, i) => E.fade(e, E.ep(t, s.tEv + i * 0.28, s.tEv + i * 0.28 + 0.35), { dx: -10, dy: 0 }));
    // tracking tile
    E.fade(s.trk, E.ep(t, s.tAuto, s.tAuto + 0.4), { dy: 12 });
    const tx = jump ? E.lerp(250, 300, E.ep(t, s.tJump, s.tDone5)) : E.lerp(90, 250, E.p(t, s.tAuto, s.tJump));
    E.attr(s.tp, 'transform', `translate(${tx.toFixed(1)} 150)`);
    E.attr(s.tb, 'transform', `translate(${(tx - 18).toFixed(1)} 84)`); E.attr(s.tbr, 'width', 36); E.attr(s.tbr, 'height', 68);
    E.attr(s.tbr, 'stroke', t >= s.tDone5 ? '#2ED47A' : '#FF3B5C');
    E.txt(s.trkt, t >= s.tDone5 ? 'Intercepted · P-1 on scene' : 'AI tracking · live');
    E.txt(s.ats, E.clock(Math.max(T0 + 1, clk)));
    // response panel + steps
    E.fade(s.rp, E.ep(t, s.tRp, s.tRp + 0.5), { dx: 24, dy: 0 });
    E.vis(s.ghost, Math.min(E.ep(t, s.start + 0.4, s.start + 0.9), 1 - E.ep(t, s.tRp, s.tRp + 0.3)) * (0.7 + 0.3 * Math.sin(t * 3.4)));
    s.stps.forEach((x, i) => {
      E.fade(x.el, E.ep(t, s.tSteps[i], s.tSteps[i] + 0.35), { dx: 14, dy: 0 });
      const done = t >= s.doneAt[i];
      E.css(x.don, { display: done ? 'block' : 'none' });
      E.css(x.det, { display: done ? 'none' : 'block' });
      E.css(x.num, { background: done ? '#2ED47A' : 'transparent', borderColor: done ? '#2ED47A' : 'rgba(143,161,192,.4)', color: done ? '#06210F' : '#A9B7CF' });
      E.txt(x.num, done ? '✓' : String(i + 1));
      E.cls(x.b, 'done', done);
      if (done) E.txt(x.b, i === 1 ? 'Tracking' : i === 4 ? 'Done' : 'Done');
    });
    // audit trail
    const shown = s.AUD.filter(a => t >= a[0]);
    E.txt(s.alog, `${shown.length} entr${shown.length === 1 ? 'y' : 'ies'} · logged`);
    const last3 = shown.slice(-3).map(a => a[1]).join('\n');
    if (s.lines.__t !== last3) { s.lines.__t = last3; s.lines.innerHTML = shown.slice(-3).map(a => `<div>${a[1]}</div>`).join(''); }
    // cursor: from below the panel to each button
    const bx = 474 + 644 - 22 - 52, by = (i) => 66 + 20 + 102 + i * 78 + 39;
    const P0 = [[s.tClick[0] - 0.75, 760, 640], [s.tClick[0] - 0.1, bx, by(0)], [s.tClick[2] - 0.35, bx, by(0) + 8], [s.tClick[2] - 0.1, bx, by(2)], [s.tClick[3] - 0.3, bx, by(2) + 6], [s.tClick[3] - 0.08, bx, by(3)], [s.tClick[3] + 1.2, bx + 60, by(3) + 120]];
    const vis = Math.min(E.ep(t, s.tClick[0] - 0.9, s.tClick[0] - 0.6), 1 - E.ep(t, s.tClick[3] + 0.7, s.tClick[3] + 1.1));
    MOMENT.updateCursor(s.cur, t, P0, [s.tClick[0], s.tClick[2], s.tClick[3]], vis);
  },
});
