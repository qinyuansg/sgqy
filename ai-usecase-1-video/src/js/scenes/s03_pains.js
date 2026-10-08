/* s03 · Six pain points, each owned by a persona. */
E.scene({
  id: 's03',
  build(el, s) {
    const PAINS = [
      ['alarm', 'Alarm fatigue', 'Real threats buried in nuisance alarms.', 'Operator', 'Missed or late response'],
      ['grid', 'Fragmented picture', 'Siloed systems, little cross-zone visibility. Every alarm verified by hand.', 'Operator', 'Slow exception handling'],
      ['play', 'Slow investigation', 'Tracing one person means hours of footage.', 'Operator', 'Hours per search'],
      ['users', 'Inconsistent response', 'Outcomes depend on who is on shift.', 'Duty manager', 'Variable outcomes'],
      ['doc', 'Patchy auditability', 'Reports and evidence assembled by hand.', 'Head of security', 'Audit gaps'],
      ['queue', 'Reactive operations', 'Queues and device faults surface only after they cause trouble.', 'Duty manager', 'Disruption · blind spots'],
    ];
    const W = 536, H = 268, GX = 36, GY = 30, X0 = 120, Y0 = 296;
    el.innerHTML = `
      <div class="abs hd" style="left:120px;top:136px">
        <div class="label" style="color:#FF8DA0">Pain points</div>
        <div class="h-l" style="margin-top:14px">Six pain points. Every shift.</div>
      </div>
      ${PAINS.map((p, i) => `
        <div class="abs panel card" style="left:${X0 + (i % 3) * (W + GX)}px;top:${Y0 + Math.floor(i / 3) * (H + GY)}px;width:${W}px;height:${H}px;padding:28px 30px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="ibox ib" style="width:58px;height:58px;background:rgba(255,59,92,.12);color:#FF7A90;border-color:rgba(255,59,92,.32)">${C.icon(p[0], 28)}</div>
            <span class="chip" style="height:30px;font-size:12px;text-transform:uppercase;letter-spacing:.12em">${C.icon('person', 14)} ${p[3]}</span>
          </div>
          <div class="h-s" style="margin-top:24px;font-size:30px">${p[1]}</div>
          <div class="body" style="margin-top:10px;font-size:21px;line-height:1.42;color:#B4C1D8">${p[2]}</div>
          <div class="label" style="position:absolute;left:30px;bottom:24px;color:#FF8DA0;letter-spacing:.12em">→ ${p[4]}</div>
        </div>`).join('')}`;
    s.hd = E.q(el, '.hd');
    s.cards = E.qa(el, '.card');
    const v6 = E.L('v06'), v7 = E.L('v07'), v8 = E.L('v08');
    s.at = [s.start + 0.3, v6.start + 0.05, v7.cues[0].start, v7.cues[1].start, E.at('v07', 'auditability') - 0.1, v8.start];
    s.at.forEach(t => E.cue(t, 'thud', 0.55));
  },
  update(t, lt, s) {
    E.fade(s.hd, E.ep(t, s.start, s.start + 0.6), { dy: 16 });
    s.cards.forEach((c, i) => {
      const t0 = s.at[i];
      E.fade(c, E.ep(t, t0, t0 + 0.55), { dy: 28, s: 0.98, blur: 4 });
      const next = i + 1 < s.at.length ? s.at[i + 1] : s.end - 0.6;
      const focus = E.env(t, t0, Math.max(t0 + 1.2, next + 0.15), 0.25);
      E.css(c, {
        borderColor: `rgba(${Math.round(143 + 112 * focus)},${Math.round(161 - 102 * focus)},${Math.round(192 - 100 * focus)},${E.f3(0.16 + 0.34 * focus)})`,
        boxShadow: `0 30px 80px rgba(0,0,0,.45), 0 0 ${Math.round(40 * focus)}px rgba(255,59,92,${E.f3(0.18 * focus)}), inset 0 1px 0 rgba(255,255,255,.05)`,
      });
    });
  },
});
