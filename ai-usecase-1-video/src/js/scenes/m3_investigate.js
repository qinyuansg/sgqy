/* m3 · 02:16 Who left this bag? — plain-language search, cross-camera trace, dispatch. */
E.scene({
  id: 'm3',
  build(el, s) {
    const v16 = E.L('v19'), v17 = E.L('v20'), v18 = E.L('v21');
    s.rail = MOMENT.rail(el, {
      n: 3, time: '02:16', title: 'Who left this bag?', who: ['nurul', 'arjun'],
      story: { as: 'operator', want: 'to search every camera in plain language', so: 'I find the right person in seconds, not hours' },
      before: 'Hours of footage, camera by camera', after: 'Owner traced in seconds', gainAt: v17.start + 1.2,
    });
    const st = MOMENT.stage(el, 'Investigation · Gate B12', `<span class="pill high hdpill">INCIDENT 2 · HIGH 71</span>`);
    s.hdpill = E.q(st, '.hdpill');
    const body = E.q(st, '.st-body');
    // CCTV
    s.cc = E.add(body, `<div class="abs" style="left:22px;top:20px;width:560px;height:315px;border-radius:12px;overflow:hidden;border:1px solid var(--line)">${C.cctvGate(560, 315, 'g2')}
      <div class="ff chip" style="position:absolute;right:12px;bottom:12px;background:rgba(5,10,22,.85);visibility:hidden">${C.icon('clock', 15)} 4 min later</div>
      <div class="res" style="position:absolute;left:0;right:0;bottom:0;height:58px;display:flex;align-items:center;gap:12px;padding:0 18px;background:linear-gradient(90deg,rgba(18,110,62,.95),rgba(18,110,62,.75));visibility:hidden">
        ${C.icon('check', 22, 2.4)}<span style="font-weight:600;font-size:19px">02:20 · Bag reclaimed by owner</span><span class="chip ok" style="margin-left:auto;background:rgba(5,30,15,.5)">No gate closure</span></div>
    </div>`);
    s.ts = E.q(s.cc, '.ts'); s.bbox = E.q(s.cc, '.bbox'); s.bboxRect = E.q(s.cc, '.bbox rect'); s.bboxTag = E.qa(s.cc, '.bbox rect')[1]; s.bboxLabel = E.q(s.cc, '.bboxLabel');
    s.ff = E.q(s.cc, '.ff'); s.res = E.q(s.cc, '.res');
    // search box
    s.sb = E.add(body, `<div class="abs" style="left:22px;top:352px;width:560px;height:62px;border-radius:12px;border:1px solid rgba(77,141,255,.5);background:rgba(8,16,34,.9);display:flex;align-items:center;gap:12px;padding:0 18px;box-shadow:0 0 0 4px rgba(77,141,255,.08)">
      <span style="color:#8FB4FF">${C.icon('search', 22)}</span><span class="q" style="font-size:20px;color:#EEF3FC;white-space:nowrap"></span><i class="caret" style="width:2px;height:24px;background:#8FB4FF"></i>
      <span class="ph" style="position:absolute;left:52px;font-size:20px;color:#5F7096">Ask in plain language…</span></div>`);
    s.q = E.q(s.sb, '.q'); s.caret = E.q(s.sb, '.caret'); s.ph = E.q(s.sb, '.ph');
    s.prog = E.add(body, `<div class="abs" style="left:22px;top:424px;width:560px;display:flex;align-items:center;gap:12px">
      <span style="color:#8FB4FF">${C.icon('sparkle', 18)}</span><span class="mono pt" style="font-size:14px;color:#8FB4FF">Searching 38 cameras…</span>
      <span style="flex:1;height:4px;border-radius:2px;background:rgba(143,161,192,.2);overflow:hidden"><i class="pb" style="display:block;height:100%;width:0;background:#4D8DFF"></i></span></div>`);
    s.pt = E.q(s.prog, '.pt'); s.pb = E.q(s.prog, '.pb');
    // AI answer + map
    s.ans = E.add(body, `<div class="abs panel ai" style="left:22px;top:458px;width:560px;height:204px;padding:16px 18px;border-radius:14px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px;white-space:nowrap"><span style="color:#8FB4FF">${C.icon('sparkle', 20)}</span><span class="h-s" style="font-size:21px">Owner traced in 4 s</span></div>
        <span class="chip blue" style="height:28px;font-size:12px">Match 96% · by appearance</span>
      </div>
      <div style="color:#B4C1D8;font-size:16px;margin-top:6px;white-space:nowrap">Woman · red coat · grey backpack · 38 cameras searched</div>
      <svg width="524" height="112" viewBox="0 0 524 112" style="margin-top:8px">
        <rect x="6" y="40" width="300" height="56" rx="10" fill="rgba(77,141,255,.05)" stroke="rgba(143,161,192,.35)"/>
        <rect x="236" y="6" width="26" height="40" rx="6" fill="rgba(77,141,255,.05)" stroke="rgba(143,161,192,.35)"/>
        <rect x="330" y="30" width="186" height="74" rx="10" fill="rgba(77,141,255,.05)" stroke="rgba(143,161,192,.35)" stroke-dasharray="4 4"/>
        <text x="16" y="88" font-family="Mono" font-size="11" fill="#6F80A0">LEVEL 1 · PIER B</text><text x="340" y="96" font-family="Mono" font-size="11" fill="#6F80A0">LEVEL 2</text>
        <path class="path" d="M249 18 V60 H120 C90 60 90 76 120 76 H300 C318 76 322 62 340 58 H440" fill="none" stroke="#4D8DFF" stroke-width="3" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>
        <circle cx="249" cy="18" r="5" fill="#FFB020"/>
        <g class="end"><circle cx="440" cy="58" r="14" fill="rgba(77,141,255,.25)"/><circle cx="440" cy="58" r="6" fill="#EEF3FC"/>
        <text x="460" y="54" font-family="InterF" font-size="13" font-weight="600" fill="#EEF3FC">Café</text><text class="mnow" x="460" y="70" font-family="Mono" font-size="11" fill="#8FB4FF">NOW</text></g>
        <circle class="dot" r="5" fill="#BFD5FF"/>
      </svg></div>`);
    s.path = E.q(s.ans, '.path'); s.endG = E.q(s.ans, '.end'); s.dot = E.q(s.ans, '.dot');
    // trace list
    const TR = [['gate', '02:08:14', 'Gate B12', 'CAM 2-031', 'Places suitcase, walks away'], ['walk', '02:10:02', 'Pier B walkway', 'CAM 2-044', 'Heading to main terminal'],
      ['esc', '02:12:47', 'Escalator to Level 2', 'CAM 1-112', 'Going up'], ['cafe', '02:16:10', 'Café · Level 2', 'CAM 1-130', 'Seated <span class="lv">· live</span>']];
    s.trHd = E.add(body, `<div class="abs label" style="left:604px;top:22px">Trace · 4 sightings</div>`);
    s.tr = TR.map((r, i) => E.add(body, `
      <div class="abs" style="left:604px;top:${50 + i * 104}px;width:514px;height:94px;border-radius:12px;border:1px solid ${i === 3 ? 'rgba(77,141,255,.7)' : 'var(--line)'};background:${i === 3 ? 'rgba(45,91,255,.14)' : 'rgba(13,24,48,.8)'};display:flex;align-items:center;gap:16px;padding:0 14px 0 8px;overflow:hidden">
        <div style="width:140px;height:78px;border-radius:8px;overflow:hidden;flex:none">${C.cctvThumb(140, 78, r[0], 'th' + i)}</div>
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:10px"><span class="mono ${i === 3 ? 'trnow' : ''}" style="font-size:17px;color:#EEF3FC">${r[1]}</span>${i === 3 ? '<span class="pill blue tnow" style="font-size:11px;padding:2px 8px">NOW</span>' : ''}</div>
          <div style="font-weight:600;font-size:17px;margin-top:3px">${r[2]}</div>
          <div style="font-size:14px;color:#8D9BB8;margin-top:2px"><span class="mono" style="font-size:12px">${r[3]}</span> · ${r[4]}</div>
        </div>
      </div>`));
    s.trNow = E.q(s.tr[3], '.trnow'); s.tnow = E.q(s.tr[3], '.tnow'); s.lv = E.q(s.tr[3], '.lv'); s.mnow = E.q(s.ans, '.mnow');
    s.ghost = MOMENT.ghost(body, 604, 50, 514, 612, 'Trace · waiting for a question');
    // dispatch card
    s.dc = E.add(body, `
      <div class="abs" style="left:604px;top:478px;width:514px;height:184px;border-radius:16px;background:linear-gradient(180deg,#F4F7FD,#E6ECF7);color:#0A1428;padding:16px 18px;box-shadow:0 20px 50px rgba(0,0,0,.45)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px"><span style="color:#2D5BFF">${C.icon('send', 18)}</span><span class="mono" style="font-size:13px;letter-spacing:.12em;color:#3A4A6B">DISPATCH · PATROL P-3</span></div>
          <span class="mono dct" style="font-size:13px;color:#5B6B86">02:16:12</span>
        </div>
        <div style="display:flex;gap:14px;margin-top:12px;align-items:center">
          <div style="width:74px;height:86px;border-radius:10px;overflow:hidden;background:#1F2A3B;flex:none">${C.cctvThumb(74, 86, 'cafe', 'thp')}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:19px">Locate bag owner</div>
            <div style="font-size:15px;color:#3A4A6B;margin-top:3px">Last seen: Café, Level 2 · red coat</div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:10px">${C.avatar('arjun', 30)}<span style="font-size:15px;font-weight:600">Arjun</span><span style="font-size:14px;color:#5B6B86">· 2 min away</span>
              <span class="acc" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:#E0E6F2;color:#3A4A6B;font-weight:600;font-size:14px">Sent</span></div>
          </div>
        </div>
      </div>`);
    s.acc = E.q(s.dc, '.acc'); s.dct = E.q(s.dc, '.dct');

    s.tType = v16.cues[1].start + 0.25;
    s.query = 'Who left the black suitcase at Gate B12?';
    s.tEnter = s.tType + s.query.length / 22 + 0.15;
    s.tTr = TR.map((_, i) => v17.start + 0.55 + i * 0.6);
    s.tAns = v17.start + 0.3;
    s.tDc = v17.cues[1].start + 0.05;
    s.tAcc = s.tDc + 1.4;
    s.tRes = v18.start - 0.1;
    const clockAt = tt => 2 * 3600 + 16 * 60 + (tt - s.start);
    E.txt(s.dct, E.clock(clockAt(s.tDc)));
    E.txt(s.trNow, E.clock(clockAt(s.tTr[3]) - 1));
    for (let i = 0; i < s.query.length; i++) if (s.query[i] !== ' ') E.cue(s.tType + i / 22, 'type', 0.22);
    E.cue(s.tEnter, 'click', 0.6); E.cue(s.tEnter + 0.05, 'scan', 0.4, { dur: 1.3 });
    s.tTr.forEach(t => E.cue(t, 'blip', 0.35)); E.cue(s.tAns + 0.9, 'chime', 0.5);
    E.cue(s.tDc, 'notify', 0.6); E.cue(s.tAcc, 'confirm', 0.45);
    E.cue(s.tRes - 0.05, 'whoosh', 0.45); E.cue(s.tRes + 0.15, 'success', 0.7);
  },
  update(t, lt, s) {
    MOMENT.updateRail(s.rail, t, s);
    // CCTV clock with a time-lapse jump at the resolution
    const jump = t >= s.tRes;
    E.txt(s.ts, jump ? E.clock(2 * 3600 + 20 * 60 + 10 + (t - s.tRes)) : E.clock(2 * 3600 + 16 * 60 + lt));
    E.txt(s.bboxLabel, jump ? 'OWNER RETURNED' : `UNATTENDED ${E.clock(7 * 60 + 46 + lt).slice(3)}`);
    const green = E.ep(t, s.tRes, s.tRes + 0.3);
    E.attr(s.bboxRect, 'stroke', green > 0.5 ? '#2ED47A' : '#FFB020');
    E.attr(s.bboxTag, 'fill', green > 0.5 ? '#2ED47A' : '#FFB020');
    E.attr(s.bboxRect, 'stroke-opacity', E.f3(green > 0.5 ? 1 : 0.6 + 0.4 * Math.sin(t * 6)));
    E.fade(s.ff, E.env(t, s.tRes - 0.05, s.tRes + 1.6, 0.2), { dy: 6 });
    E.fade(s.res, E.ep(t, s.tRes + 0.15, s.tRes + 0.55), { dy: 20 });
    const past = t >= s.tRes ? 0 : 1;
    E.vis(s.tnow, past); E.vis(s.lv, past); E.attr(s.mnow, 'opacity', String(past));
    E.txt(s.hdpill, t >= s.tRes + 0.3 ? 'INCIDENT 2 · RESOLVED' : 'INCIDENT 2 · HIGH 71');
    E.cls(s.hdpill, 'ok', t >= s.tRes + 0.3); E.cls(s.hdpill, 'high', t < s.tRes + 0.3);
    // typing
    E.type(s.q, s.query, t, s.tType, 22);
    E.vis(s.ph, t < s.tType ? 1 : 0);
    E.vis(s.caret, t < s.tEnter + 0.2 && (Math.floor(t * 2.4) % 2 === 0 || (t > s.tType && t < s.tEnter)) ? 1 : 0);
    // search progress
    const pk = E.p(t, s.tEnter, s.tEnter + 1.3);
    E.fade(s.prog, Math.min(E.ep(t, s.tEnter, s.tEnter + 0.2), 1 - E.ep(t, s.tAns + 0.9, s.tAns + 1.2)), { dy: 0 });
    E.css(s.pb, { width: (pk * 100).toFixed(1) + '%' });
    E.txt(s.pt, pk < 1 ? `Searching ${Math.round(38 * pk)} / 38 cameras…` : 'Search complete · 4 s');
    // answer + map
    E.fade(s.ans, E.ep(t, s.tAns + 0.9, s.tAns + 1.4), { dy: 16 });
    const mk = E.ep(t, s.tAns + 1.2, s.tTr[3] + 0.5, 'inOut');
    E.attr(s.path, 'stroke-dashoffset', E.f3(1 - mk));
    if (s.pathLen === undefined) s.pathLen = s.path.getTotalLength();
    const pt = s.path.getPointAtLength(s.pathLen * mk);
    E.attr(s.dot, 'cx', pt.x.toFixed(1)); E.attr(s.dot, 'cy', pt.y.toFixed(1));
    E.attr(s.dot, 'opacity', mk > 0 && mk < 1 ? '1' : '0');
    E.attr(s.endG, 'opacity', E.f3(E.ep(t, s.tTr[3] + 0.3, s.tTr[3] + 0.7)));
    // trace rows
    E.fade(s.trHd, E.ep(t, s.tTr[0] - 0.2, s.tTr[0] + 0.2), { dy: 0 });
    s.tr.forEach((r, i) => E.fade(r, E.ep(t, s.tTr[i], s.tTr[i] + 0.4), { dx: 24, dy: 0 }));
    E.vis(s.ghost, Math.min(E.ep(t, s.start + 0.4, s.start + 0.9), 1 - E.ep(t, s.tTr[0] - 0.3, s.tTr[0])) * (0.7 + 0.3 * Math.sin(t * 3.4)));
    // dispatch
    E.fade(s.dc, E.ep(t, s.tDc, s.tDc + 0.5, 'out5'), { dy: 40, s: 0.96 });
    const acc = t >= s.tAcc;
    E.txt(s.acc, acc ? '✓ Accepted' : 'Sent');
    E.css(s.acc, { background: acc ? '#D3F5E2' : '#E0E6F2', color: acc ? '#137A45' : '#3A4A6B' });
  },
});
