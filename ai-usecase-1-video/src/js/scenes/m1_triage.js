/* m1 · 02:14 Alarm storm → three incidents (context-aware triage, explained). */
E.scene({
  id: 'm1',
  build(el, s) {
    s.rail = MOMENT.rail(el, {
      n: 1, time: '02:14', title: 'Alarm storm → three incidents', who: ['nurul'],
      story: { as: 'control room operator', want: 'alarms from every system fused, ranked and explained', so: 'I act on real threats first' },
      before: '312 raw alarms, triaged by hand', after: '3 incidents, ranked with evidence', gainAt: E.L('v14').cues[1].start + 0.9,
    });
    const st = MOMENT.stage(el, 'Incidents · Terminal 2',
      `<span class="label" style="color:#A9B7CF">AI triage</span>
       <span class="sw" style="position:relative;width:54px;height:30px;border-radius:15px;background:rgba(143,161,192,.25);display:inline-block"><i class="knob" style="position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#EEF3FC"></i></span>
       <span class="chip cnt" style="height:32px">312 alarms</span>`);
    const body = E.q(st, '.st-body');
    s.sw = E.q(st, '.sw'); s.knob = E.q(st, '.knob'); s.cnt = E.q(st, '.cnt');

    // ---- raw queue ----
    // the same 12 alarms the storm scene ended on (shared queue)
    const RAW = ALARMQ.RECENT.map(r => [r[1], r[2], r[3], r[4], ['crit', 'high', 'low'].includes(r[5]) ? null : r[5], { crit: 0, high: 1, low: 2 }[r[5]], r[0]]);
    const raw = E.add(body, `<div class="raw" style="position:absolute;inset:0">
      <div class="label" style="height:40px;display:grid;grid-template-columns:118px 92px 1fr 300px 84px;align-items:center;padding:0 22px;border-bottom:1px solid var(--line)"><span>Time</span><span>Sev</span><span>Alarm</span><span>Location</span><span>Source</span></div>
    </div>`);
    s.raw = raw; s.rawHd = raw.firstElementChild;
    s.rows = RAW.map((r, i) => {
      const e = E.add(raw, ALARMQ.rowHTML({ time: E.clock(r[6]), sev: r[3], type: r[0], loc: r[2], src: r[1] }));
      e.style.top = (40 + i * 50) + 'px';
      const tag = E.q(e, '.aq-tag');
      if (r[4]) tag.innerHTML = `${C.icon('eye', 15)} ${r[4]}`;
      const ring = E.q(e, '.aq-ring');
      if (r[5] !== undefined) {
        const col = ['255,59,92', '255,176,32', '124,139,168'][r[5]];
        ring.style.boxShadow = `0 0 0 2px rgba(${col},.95), 0 0 22px rgba(${col},.4)`;
        ring.style.background = `linear-gradient(90deg, rgba(${col},.18), rgba(${col},0) 70%)`;
      }
      return { el: e, tag, ring, inc: r[5], y: 40 + i * 50 };
    });
    s.sweep = E.add(body, '<div style="position:absolute;left:0;right:0;height:3px;top:0;background:linear-gradient(90deg,transparent,#8FB4FF,transparent);box-shadow:0 0 24px 6px rgba(77,141,255,.55);opacity:0"></div>');

    // ---- incident cards ----
    const INC = [
      { sev: 'crit', score: 94, label: 'CRITICAL', col: '#FF3B5C', title: 'Tailgating · Staff Door D-214 → airside', meta: '02:13:52 · Access control + video analytics · fused',
        ev: [['users', '1 badge · 2 people'], ['door', 'Door open 14 s'], ['person', 'Not on roster'], ['route', 'Heading to Stand C3']], act: 'Respond' },
      { sev: 'high', score: 71, label: 'HIGH', col: '#FFB020', title: 'Unattended bag · Gate B12', meta: '02:12:40 · Video analytics · CAM 2-031',
        ev: [['bag', 'Static 6 min'], ['person', 'Owner left the area'], ['plane', 'Gate boards 02:55']], act: 'Investigate' },
      { sev: 'low', score: 8, label: 'LOW', col: '#7C8BA8', title: 'Fence vibration · Sector 7', meta: '02:13:20 · Perimeter intrusion · verified by thermal camera',
        ev: [['thermo', 'Thermal: small animal'], ['signal', 'Wind 32 km/h']], act: null },
    ];
    s.cards = INC.map((c, i) => {
      const C2 = 2 * Math.PI * 27;
      const e = E.add(body, `
        <div class="abs card" style="left:22px;top:${20 + i * 152}px;width:1096px;height:140px;border-radius:16px;border:1px solid ${c.sev === 'low' ? 'var(--line)' : `${c.col}66`};background:${c.sev === 'low' ? 'rgba(18,32,61,.6)' : `linear-gradient(90deg, ${c.col}1F, rgba(18,32,61,.75) 45%)`};display:grid;grid-template-columns:118px 1fr auto;align-items:center;padding:0 24px 0 18px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            <svg width="68" height="68" viewBox="0 0 68 68"><circle cx="34" cy="34" r="27" fill="none" stroke="rgba(143,161,192,.18)" stroke-width="6"/>
              <circle class="arc" cx="34" cy="34" r="27" fill="none" stroke="${c.col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C2.toFixed(1)}" stroke-dashoffset="${C2.toFixed(1)}" transform="rotate(-90 34 34)"/>
              <text class="sc" x="34" y="41" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="22" fill="#EEF3FC">0</text></svg>
            <span class="pill ${c.sev}" style="font-size:11px;padding:2px 8px">${c.label}</span>
          </div>
          <div>
            <div class="h-s" style="font-size:24px">${c.title}</div>
            <div class="mono" style="font-size:14px;color:#7C8BA8;margin-top:6px">${c.meta}</div>
            <div class="ev" style="display:flex;gap:10px;margin-top:14px">${c.ev.map(v => `<span class="chip ${c.sev === 'low' ? '' : c.sev}" style="height:32px;font-size:13px">${C.icon(v[0], 15)} ${v[1]}</span>`).join('')}</div>
          </div>
          <div class="act">${c.act ? `<span class="btn ghost" style="height:40px">${c.act} ${C.icon('arrow', 16)}</span>` : `<span class="chip ok auto" style="height:36px">${C.icon('check', 16, 2.2)} Closed by Nurul · AI-verified low risk</span>`}</div>
        </div>`);
      return { el: e, arc: E.q(e, '.arc'), sc: E.q(e, '.sc'), ev: E.qa(e, '.ev .chip'), act: E.q(e, '.act'), C2, score: c.score, i };
    });

    // ---- nuisance group ----
    const R = [['Cleaning roster match', 214, '#4D8DFF'], ['Weather · wind & rain', 61, '#34C7C9'], ['Lens glare & reflections', 34, '#8A7CFF']];
    s.bar = E.add(body, `
      <div class="abs nb" style="left:22px;top:486px;width:1096px;height:174px;border-radius:16px;border:1px solid var(--line);background:rgba(13,24,48,.85);padding:20px 24px;transform-origin:50% 100%">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">${C.icon('layers', 22)}<span class="h-s" style="font-size:22px"><span class="nn">309</span> nuisance alarms — grouped and explained</span></div>
          <span class="btn ghost" style="height:36px;font-size:15px">${C.icon('eye', 16)} Review all</span>
        </div>
        <div class="grp" style="position:absolute;left:24px;right:24px;top:72px;height:62px;border:1.5px dashed rgba(77,141,255,.35);border-radius:10px;display:flex;align-items:center;justify-content:center;gap:10px;color:#5F7BB8">${C.icon('sparkle', 16)}<span class="kicker" style="font-size:12px;color:#5F7BB8">Grouping 309 alarms by reason…</span></div>
        <div class="seg" style="display:flex;gap:4px;height:14px;margin-top:20px">${R.map(r => `<i style="flex:${r[1]};background:${r[2]};border-radius:4px;transform-origin:0 50%"></i>`).join('')}</div>
        <div class="segl" style="display:flex;gap:34px;margin-top:12px">${R.map(r => `<div style="display:flex;align-items:center;gap:10px;font-size:16px;color:#C9D5EA;white-space:nowrap"><i style="width:12px;height:12px;border-radius:3px;background:${r[2]};display:inline-block"></i><b class="mono" style="font-weight:600;color:#EEF3FC">${r[1]}</b> ${r[0]}</div>`).join('')}</div>
        <div class="foot label" style="margin-top:14px;text-transform:none;letter-spacing:.04em;font-size:14px;color:#8FB4FF">${C.icon('check', 14, 2.2)} Never silently dropped — every reason logged and reviewable</div>
      </div>`);
    s.segs = E.qa(s.bar, '.seg i'); s.grp = E.q(s.bar, '.grp'); s.segl = E.q(s.bar, '.segl'); s.foot = E.q(s.bar, '.foot');

    const v14 = E.L('v14'), v15 = E.L('v15');
    s.tOn = v14.cues[0].start + 1.2;
    s.tSweep = s.tOn + 0.2;
    s.tCol = v14.cues[1].start - 0.05;
    s.tScore = v14.cues[2].start;
    s.tEv = v14.cues[2].start + 0.6;
    s.tBar = v15.start - 0.1;
    s.tNever = E.at('v15', 'never') - 0.2;
    E.cue(s.tOn, 'switch', 0.6); E.cue(s.tSweep, 'scan', 0.5, { dur: 1.0 });
    E.cue(s.tCol, 'whoosh', 0.5); [0, 1, 2].forEach(i => E.cue(s.tCol + 0.35 + i * 0.1, 'pop', 0.45));
    E.cue(s.tScore, 'tickrun', 0.3, { dur: 1.1 });
    E.cue(s.tBar, 'swell', 0.3, { dur: 1.0 }); E.cue(s.tNever, 'confirm', 0.5);
  },
  update(t, lt, s) {
    MOMENT.updateRail(s.rail, t, s);
    // switch
    const on = E.ep(t, s.tOn, s.tOn + 0.25);
    E.css(s.sw, { background: on > 0.5 ? '#2D5BFF' : 'rgba(143,161,192,.25)', boxShadow: `0 0 ${Math.round(16 * on)}px rgba(77,141,255,.6)` });
    E.css(s.knob, { transform: `translateX(${E.f3(24 * on)}px)` });
    E.txt(s.cnt, t < s.tCol + 0.6 ? '312 alarms' : '312 alarms → 3 incidents');
    E.cls(s.cnt, 'blue', t >= s.tCol + 0.6);
    // sweep
    const sk = E.p(t, s.tSweep, s.tSweep + 1.0);
    E.css(s.sweep, { top: (40 + sk * 600).toFixed(1) + 'px', opacity: E.f3(sk > 0 && sk < 1 ? 1 : 0) });
    const col = E.ep(t, s.tCol, s.tCol + 0.8, 'inOut');
    E.vis(s.rawHd, 1 - E.ep(t, s.tCol, s.tCol + 0.4));
    s.rows.forEach((r, i) => {
      const passed = t >= s.tSweep + (r.y - 40) / 600 * 1.0;
      if (r.inc === undefined) {
        E.fade(r.tag, passed ? E.ep(t, s.tSweep + (r.y - 40) / 600, s.tSweep + (r.y - 40) / 600 + 0.25) : 0, { dx: 8, dy: 0 });
        // nuisance rows drop into the group bar
        const dy = col * (560 - r.y + i * 2);
        E.css(r.el, { transform: `translate3d(0,${E.f3(dy)}px,0) scaleY(${E.f3(1 - 0.6 * col)})`, opacity: E.f3((passed ? 0.55 : 1) * (1 - col)), visibility: col >= 1 ? 'hidden' : 'visible' });
      } else {
        E.css(r.ring, { opacity: E.f3(passed ? E.ep(t, s.tSweep + (r.y - 40) / 600, s.tSweep + (r.y - 40) / 600 + 0.25) : 0) });
        const target = 20 + r.inc * 152 + 45;
        E.css(r.el, { transform: `translate3d(0,${E.f3(col * (target - r.y))}px,0)`, opacity: E.f3(1 - E.ep(t, s.tCol + 0.35, s.tCol + 0.8)), visibility: col >= 1 ? 'hidden' : 'visible' });
      }
    });
    // cards
    s.cards.forEach(c => {
      const k = E.ep(t, s.tCol + 0.35 + c.i * 0.1, s.tCol + 0.85 + c.i * 0.1);
      E.fade(c.el, k, { dy: 0, s: 0.97 });
      const sk2 = E.ep(t, s.tScore + c.i * 0.15, s.tScore + 0.9 + c.i * 0.15);
      E.attr(c.arc, 'stroke-dashoffset', (c.C2 * (1 - sk2 * c.score / 100)).toFixed(1));
      E.txt(c.sc, String(Math.round(c.score * sk2)).padStart(2, '0'));
      E.attr(c.sc, 'opacity', t >= s.tScore + c.i * 0.15 ? '1' : '0');
      c.ev.forEach((v, j) => E.fade(v, E.ep(t, s.tEv + c.i * 0.35 + j * 0.16, s.tEv + c.i * 0.35 + j * 0.16 + 0.3), { dx: -8, dy: 0 }));
      if (c.i === 2) E.fade(c.act, E.ep(t, s.tNever, s.tNever + 0.4), { dx: 10, dy: 0, s: 0.9 });
      else E.fade(c.act, E.ep(t, s.tEv + 1.4, s.tEv + 1.8), { dx: 10, dy: 0 });
    });
    // nuisance group
    E.fade(s.bar, E.ep(t, s.tCol + 0.4, s.tCol + 0.9), { dy: 20 });
    s.segs.forEach((g, i) => E.css(g, { transform: `scaleX(${E.f3(E.ep(t, s.tBar + i * 0.18, s.tBar + 0.6 + i * 0.18, 'out'))})` }));
    E.vis(s.grp, (1 - E.ep(t, s.tBar - 0.1, s.tBar + 0.2)) * (0.7 + 0.3 * Math.sin(t * 3.4)));
    E.fade(s.segl, E.ep(t, s.tBar + 0.4, s.tBar + 0.9), { dy: 8 });
    E.fade(s.foot, E.ep(t, s.tNever, s.tNever + 0.4), { dy: 6 });
  },
});
