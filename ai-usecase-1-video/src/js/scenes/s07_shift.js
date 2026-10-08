/* s07 · One night shift — five moments, four people. */
E.scene({
  id: 's07',
  build(el, s) {
    const MOM = [['02:14', 'Alarm storm', 'Triage'], ['02:15', 'Tailgating', 'Respond'], ['02:16', 'Unattended bag', 'Investigate'], ['05:10', 'Before the peak', 'Anticipate · Maintain'], ['07:00', 'Handover', 'Report']];
    const PER = ['nurul', 'arjun', 'daniel', 'grace'];
    const X0 = 160, X1 = 1760, step = (X1 - X0) / 4;
    el.innerHTML = `
      <div class="abs hd" style="left:120px;top:136px">
        <div class="label" style="color:#8FB4FF">User scenarios</div>
        <div class="h-l" style="margin-top:14px">One night shift at Terminal 2.</div>
      </div>
      <svg class="abs" width="1920" height="1080" style="left:0;top:0"><line class="tl" x1="${X0}" y1="420" x2="${X1}" y2="420" stroke="rgba(143,161,192,.35)" stroke-width="2" pathLength="1" stroke-dasharray="1 1"/></svg>
      ${MOM.map((m, i) => `
        <div class="abs mk" style="left:${X0 + i * step - 150}px;top:404px;width:300px;text-align:center">
          <div style="width:32px;height:32px;margin:0 auto;border-radius:50%;background:#0A1428;border:3px solid #4D8DFF;box-shadow:0 0 18px rgba(77,141,255,.6)"></div>
          <div class="mono" style="font-size:26px;margin-top:18px;color:#EEF3FC">${m[0]}</div>
          <div style="font-size:21px;font-weight:600;margin-top:6px">${m[1]}</div>
          <div style="margin-top:12px"><span class="chip blue" style="font-size:13px">${C.icon('sparkle', 14)} ${m[2]}</span></div>
        </div>`).join('')}
      ${PER.map((k, i) => { const p = C.PERSONAS[k]; return `
        <div class="abs panel flat pc" style="left:${120 + i * 428}px;top:668px;width:396px;height:112px;display:flex;align-items:center;gap:18px;padding:0 24px">
          ${C.avatar(k, 60)}
          <div><div class="h-s" style="font-size:26px">${p.name}</div><div style="color:#A9B7CF;font-size:18px;margin-top:2px">${p.role}</div></div>
        </div>`; }).join('')}`;
    s.hd = E.q(el, '.hd'); s.tl = E.q(el, '.tl'); s.mk = E.qa(el, '.mk'); s.pc = E.qa(el, '.pc');
    E.cue(s.start + 0.3, 'sweep', 0.35, { dur: 1.0 });
    [0, 1, 2, 3, 4].forEach(i => E.cue(s.start + 0.5 + i * 0.22, 'blip', 0.3));
    [0, 1, 2, 3].forEach(i => E.cue(s.start + 1.6 + i * 0.18, 'pop', 0.25));
  },
  update(t, lt, s) {
    E.fade(s.hd, E.ep(t, s.start, s.start + 0.6), { dy: 16 });
    E.attr(s.tl, 'stroke-dashoffset', E.f3(1 - E.ep(t, s.start + 0.3, s.start + 1.3, 'inOut')));
    s.mk.forEach((m, i) => E.fade(m, E.ep(t, s.start + 0.5 + i * 0.22, s.start + 0.95 + i * 0.22), { dy: 14, s: 0.9 }));
    s.pc.forEach((c, i) => E.fade(c, E.ep(t, s.start + 1.6 + i * 0.18, s.start + 2.1 + i * 0.18), { dy: 18 }));
  },
});
