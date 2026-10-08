/* s13 · Core capabilities — seven AI capabilities across the security lifecycle, each tied to the pain it removes. */
E.scene({
  id: 's13',
  build(el, s) {
    const LIFE = [
      ['target', 'Detect', 'Unusual behaviour: tailgating, loitering, unattended items', 'Fragmented picture'],
      ['filter', 'Triage', 'Context-aware alarm triage, ranked and explained', 'Alarm fatigue'],
      ['search', 'Investigate', 'Plain-language video search and cross-camera tracing', 'Slow investigation'],
      ['list', 'Respond', 'SOP-grounded steps, approved by people', 'Inconsistent response'],
      ['doc', 'Report', 'Auto-drafted reports with a complete audit trail', 'Patchy auditability'],
    ];
    const PRO = [
      ['chart', 'Anticipate', 'Traveller-flow forecasting across zones', 'Reactive operations'],
      ['wrench', 'Maintain', 'Device and network health prediction', 'Reactive operations'],
    ];
    const W = 312, G = 30;
    el.innerHTML = `
      <div class="abs hd" style="left:120px;top:136px">
        <div class="label" style="color:#8FB4FF">Core capabilities</div>
        <div class="h-l" style="margin-top:14px">Seven AI capabilities. One platform.</div>
      </div>
      <div class="abs label pro" style="right:120px;top:212px;color:#8A9BC0;font-size:14px">Proposed in AI Use Case 1 · each mapped to a pain point</div>
      <div class="abs label lab1" style="left:120px;top:288px">Incident lifecycle</div>
      ${LIFE.map((c, i) => `
        <div class="abs panel tile" style="left:${120 + i * (W + G)}px;top:318px;width:${W}px;height:268px;padding:24px 24px">
          ${C.ibox(c[0], 54, 27)}
          <div class="h-s" style="margin-top:18px;font-size:30px">${c[1]}</div>
          <div class="body" style="margin-top:8px;font-size:18px;line-height:1.42;color:#B4C1D8">${c[2]}</div>
          <div class="label" style="position:absolute;left:24px;bottom:20px;color:#FF8DA0;text-transform:none;letter-spacing:.04em;font-size:13px">Addresses: ${c[3]}</div>
        </div>
        ${i < 4 ? `<div class="abs arr" style="left:${120 + i * (W + G) + W + 3}px;top:438px;color:#4A5D86">${C.icon('arrow', 24)}</div>` : ''}`).join('')}
      <div class="abs label lab2" style="left:120px;top:622px">Proactive</div>
      ${PRO.map((c, i) => `
        <div class="abs panel tile" style="left:${120 + i * (825 + 30)}px;top:652px;width:825px;height:132px;padding:0 28px;display:flex;align-items:center;gap:22px">
          ${C.ibox(c[0], 54, 27)}
          <div style="flex:1"><div class="h-s" style="font-size:28px">${c[1]}</div><div class="body" style="font-size:18px;color:#B4C1D8;margin-top:4px">${c[2]}</div></div>
          <div class="label" style="color:#FF8DA0;text-transform:none;letter-spacing:.04em;font-size:13px;white-space:nowrap">Addresses: ${c[3]}</div>
        </div>`).join('')}
      <svg class="abs loop" width="1920" height="1080" style="left:0;top:0"><path d="M276 600 V612 H1644 V600" fill="none" stroke="#4D8DFF" stroke-width="2" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
    s.hd = E.q(el, '.hd'); s.pro = E.q(el, '.pro'); s.tiles = E.qa(el, '.tile'); s.arr = E.qa(el, '.arr'); s.lab = [E.q(el, '.lab1'), E.q(el, '.lab2')]; s.loop = E.q(el, '.loop path');
    const words = ['Detect', 'Triage', 'Investigate', 'Respond', 'Report', 'Anticipate', 'Maintain'];
    s.tW = words.map(w => E.at('v25', w) - 0.12);
    s.tLoop = E.L('v26').start;
    s.tW.forEach((t, i) => E.cue(t + 0.1, 'hit', 0.5 + 0.04 * i));
    E.cue(s.tLoop, 'swell', 0.5, { dur: 1.4 });
  },
  update(t, lt, s) {
    E.fade(s.hd, E.ep(t, s.start, s.start + 0.6), { dy: 16 });
    E.fade(s.pro, E.ep(t, s.start + 0.4, s.start + 0.9), { dy: 0 });
    E.fade(s.lab[0], E.ep(t, s.start + 0.3, s.start + 0.8), { dy: 0 });
    E.fade(s.lab[1], E.ep(t, s.tW[5] - 0.2, s.tW[5] + 0.3), { dy: 0 });
    s.tiles.forEach((c, i) => {
      const t0 = Math.min(s.tW[i], s.start + 0.4 + i * 0.12 + (i > 4 ? 1.2 : 0));
      E.fade(c, E.ep(t, t0 - 0.15, t0 + 0.35), { dy: 22, s: 0.98 });
      const hot = E.env(t, s.tW[i], s.tW[i] + 0.9, 0.18);
      const all = E.ep(t, s.tLoop, s.tLoop + 0.5);
      E.css(c, {
        borderColor: `rgba(77,141,255,${E.f3(0.16 + 0.6 * hot + 0.25 * all)})`,
        boxShadow: `0 30px 80px rgba(0,0,0,.45), 0 0 ${Math.round(44 * hot + 18 * all)}px rgba(45,91,255,${E.f3(0.32 * hot + 0.14 * all)})`,
      });
    });
    s.arr.forEach((a, i) => E.css(a, { color: t > s.tW[i + 1] ? '#8FB4FF' : '#3B4A6B', opacity: E.f3(E.ep(t, s.start + 0.6, s.start + 1.0)) }));
    E.attr(s.loop, 'stroke-dashoffset', E.f3(1 - E.ep(t, s.tLoop, s.tLoop + 1.0, 'inOut')));
  },
});
