/* m4 · 05:10 Before the morning peak — traveller-flow forecast + predictive device health. */
E.scene({
  id: 'm4',
  build(el, s) {
    const v22 = E.L('v22'), v23 = E.L('v23');
    s.tClick = v22.cues[1].end + 0.15;
    s.rail = MOMENT.rail(el, {
      n: 4, time: '05:10', title: 'Before the morning peak', who: ['daniel'],
      story: { as: 'duty manager', want: 'early warning of queues and failing devices', so: 'I&nbsp;act before the peak, not after it' },
      before: 'Queues and faults found too late', after: 'Forecast early, fixed before impact', gainAt: s.tClick + 0.2,
    });
    const st = MOMENT.stage(el, 'Operations outlook · Terminal 2', `<span class="chip blue" style="height:32px">${C.icon('sparkle', 15)} Forecast · next 2 h</span>`);
    const body = E.q(st, '.st-body');
    // ---- chart ----
    const X0 = 64, X1 = 1026, Y0 = 262, Y1 = 58; // 05:00..07:00, 0..30 min
    const xm = m => X0 + (X1 - X0) * m / 120, ym = v => Y0 - (Y0 - Y1) * v / 30;
    s.xm = xm; s.ym = ym;
    const A = [[10, 3.6], [20, 6], [30, 10.5], [40, 15.5], [50, 19.2], [55, 20], [65, 19.2], [80, 14.5], [100, 8.5], [120, 6]];
    const B = [[10, 3.6], [20, 6], [30, 8], [40, 10], [50, 11], [55, 11], [65, 10.5], [80, 9], [100, 6], [120, 5]];
    s.A = A; s.B = B;
    s.chart = E.add(body, `<div class="abs panel flat" style="left:22px;top:20px;width:1096px;height:356px;padding:18px 22px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="h-s" style="font-size:22px">Security Checkpoint 3 · forecast wait time</div>
        <div style="display:flex;gap:20px;font-size:14px;color:#A9B7CF;align-items:center">
          <span style="display:flex;align-items:center;gap:8px"><i style="width:22px;height:3px;background:#EEF3FC;display:inline-block"></i>Actual</span>
          <span style="display:flex;align-items:center;gap:8px"><i style="width:22px;height:0;border-top:3px dashed #8FB4FF;display:inline-block"></i>AI forecast</span>
          <span style="display:flex;align-items:center;gap:8px"><i style="width:22px;height:0;border-top:2px dashed #FFB020;display:inline-block"></i>Service target · 15 min</span>
        </div>
      </div>
      <svg width="1052" height="300" viewBox="0 0 1052 300" style="position:absolute;left:22px;top:52px">
        <g font-family="Mono" font-size="12" fill="#6F80A0">
          ${[0, 10, 20, 30].map(v => `<line x1="${X0}" x2="${X1}" y1="${ym(v)}" y2="${ym(v)}" stroke="rgba(143,161,192,.12)"/><text x="${X0 - 12}" y="${ym(v) + 4}" text-anchor="end">${v}</text>`).join('')}
          ${[0, 30, 60, 90, 120].map(m => `<text x="${xm(m)}" y="${Y0 + 22}" text-anchor="middle">${['05:00', '05:30', '06:00', '06:30', '07:00'][m / 30]}</text>`).join('')}
          <text x="${X0 - 12}" y="${Y1 - 14}" text-anchor="end">min</text>
        </g>
        <line x1="${X0}" x2="${X1}" y1="${ym(15)}" y2="${ym(15)}" stroke="#FFB020" stroke-width="2" stroke-dasharray="6 6" opacity=".8"/>
        <path class="areaA" fill="rgba(255,59,92,.16)"/>
        <path class="fc" fill="none" stroke="#8FB4FF" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round"/>
        <path class="act" d="M${xm(0)} ${ym(3.2)} L${xm(5)} ${ym(3.4)} L${xm(10)} ${ym(3.6)}" fill="none" stroke="#EEF3FC" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="${xm(10)}" x2="${xm(10)}" y1="${Y1 - 6}" y2="${Y0}" stroke="rgba(238,243,252,.5)" stroke-dasharray="3 4"/>
        <text x="${xm(10) + 8}" y="${Y1 + 4}" font-family="Mono" font-size="12" fill="#EEF3FC">NOW 05:10</text>
        <g class="pk"><rect rx="6" height="26" width="196" fill="#3A1420" stroke="#FF3B5C"/><text x="12" y="18" font-family="Mono" font-size="13" font-weight="600" fill="#FF8DA0">Forecast peak 20 min</text></g>
        <g class="pk2"><rect rx="6" height="26" width="176" fill="#0F3321" stroke="#2ED47A"/><text x="12" y="18" font-family="Mono" font-size="13" font-weight="600" fill="#7BE8AC">New peak 11 min</text></g>
      </svg>
    </div>`);
    s.fc = E.q(s.chart, '.fc'); s.areaA = E.q(s.chart, '.areaA'); s.act = E.q(s.chart, '.act'); s.pk = E.q(s.chart, '.pk'); s.pk2 = E.q(s.chart, '.pk2');
    // ---- recommendation ----
    s.rec = E.add(body, `<div class="abs panel ai" style="left:22px;top:394px;width:540px;height:268px;padding:20px 22px;border-radius:16px">
      <div style="display:flex;align-items:center;gap:10px;color:#8FB4FF">${C.icon('sparkle', 20)}<span class="kicker" style="font-size:14px">AI recommendation</span></div>
      <div class="h-s" style="font-size:24px;margin-top:14px">Open lanes 5 and 6 at 05:30</div>
      <div style="font-size:17px;color:#B4C1D8;margin-top:8px;line-height:1.45">Redeploy 4 officers from Checkpoint 1,<br>forecast to be quiet until 06:30.</div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:22px">
        <span class="btn ap" style="min-width:120px">Approve</span><span class="btn ghost">Adjust</span>
        <span class="mono apt" style="font-size:14px;color:#7BE8AC;visibility:hidden;white-space:nowrap">✓ 05:10:42 · Daniel</span>
      </div>
    </div>`);
    s.ap = E.q(s.rec, '.ap'); s.apt = E.q(s.rec, '.apt');
    // ---- device health ----
    const SPm = Array.from({ length: 19 }, (_, i) => [i, 92 - (i < 10 ? i * 0.5 : 5 + (i - 10) * 1.3) + Math.sin(i * 1.7) * 0.9]);
    const SPf = [[18, SPm[18][1]], [20, 72.4], [22, 68.0], [24, 63.2]];
    const sx = i => 18 + i * 19.5, sy = v => 96 - (v - 50) * 1.6;
    const pth = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(' ');
    s.dev = E.add(body, `<div class="abs panel flat" style="left:578px;top:394px;width:540px;height:268px;padding:20px 22px;border-radius:16px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px;color:#A9B7CF">${C.icon('wrench', 19)}<span class="kicker" style="font-size:14px;color:#A9B7CF">Device health</span></div>
        <span class="pill high">AT RISK</span>
      </div>
      <div class="h-s" style="font-size:22px;margin-top:12px">CAM 4-221 · Apron Stands C4–C5</div>
      <svg width="500" height="96" viewBox="0 0 500 96" style="margin-top:6px">
        <line x1="18" x2="486" y1="${sy(70)}" y2="${sy(70)}" stroke="#FFB020" stroke-dasharray="5 5" opacity=".7"/>
        <text x="18" y="${sy(70) + 14}" font-family="Mono" font-size="11" fill="#FFCB6B">usable threshold</text>
        <path class="spk" d="${pth(SPm)}" fill="none" stroke="#8FB4FF" stroke-width="2.5" pathLength="1" stroke-dasharray="1 1"/>
        <path class="spf" d="${pth(SPf)}" fill="none" stroke="#FFB020" stroke-width="2.5" stroke-dasharray="5 5"/>
        <circle class="spx" cx="${sx(21.1).toFixed(1)}" cy="${sy(70).toFixed(1)}" r="5" fill="none" stroke="#FFB020" stroke-width="2"/>
        <text x="18" y="10" font-family="Mono" font-size="11" fill="#6F80A0">image sharpness · last 36 h</text>
        <text class="spl" x="${sx(21).toFixed(1)}" y="94" font-family="Mono" font-size="11" fill="#FFCB6B">forecast</text>
      </svg>
      <div class="dl1" style="font-size:16px;color:#FFCB6B;margin-top:4px">Lens fogging · likely unusable within 72 h</div>
      <div class="dl2 mono" style="font-size:14px;color:#7BE8AC;margin-top:10px">✓ WO-5531 raised · fix before the departures peak</div>
    </div>`);
    s.spk = E.q(s.dev, '.spk'); s.spf = E.q(s.dev, '.spf'); s.spx = E.q(s.dev, '.spx'); s.spl = E.q(s.dev, '.spl'); s.dl1 = E.q(s.dev, '.dl1'); s.dl2 = E.q(s.dev, '.dl2');
    s.g1 = MOMENT.ghost(body, 22, 394, 540, 268, 'AI recommendation · computing…');
    s.g2 = MOMENT.ghost(body, 578, 394, 540, 268, 'Device health · scanning…');
    s.cur = MOMENT.cursor(st);
    s.tFc = E.at('v22', 'forecasts') - 0.2;
    s.tPk = E.at('v22', '20-minute');
    s.tRec = v22.cues[1].start - 0.1;
    s.tDev = v23.start - 0.1;
    s.tFail = E.at('v23', 'failing');
    s.tWo = E.at('v23', 'blind') + 0.2;
    E.cue(s.tFc, 'sweep', 0.35, { dur: 1.6 }); E.cue(s.tPk, 'alertSoft', 0.5);
    E.cue(s.tRec, 'pop', 0.4); E.cue(s.tClick, 'click', 0.7); E.cue(s.tClick + 0.1, 'success', 0.55);
    E.cue(s.tDev, 'pop', 0.4); E.cue(s.tFail, 'alertSoft', 0.45); E.cue(s.tWo, 'confirm', 0.45);
  },
  curve(pts) {
    const { xm, ym } = this;
    let d = `M${xm(pts[0][0]).toFixed(1)} ${ym(pts[0][1]).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [m0, v0] = pts[i - 1], [m1, v1] = pts[i];
      const cx = (xm(m0) + xm(m1)) / 2;
      d += ` C${cx.toFixed(1)} ${ym(v0).toFixed(1)} ${cx.toFixed(1)} ${ym(v1).toFixed(1)} ${xm(m1).toFixed(1)} ${ym(v1).toFixed(1)}`;
    }
    return d;
  },
  update(t, lt, s) {
    MOMENT.updateRail(s.rail, t, s);
    E.fade(s.chart, E.ep(t, s.start, s.start + 0.5), { dy: 14 });
    // forecast draws left→right, then morphs to the improved plan after approval
    const draw = E.ep(t, s.tFc, s.tFc + 1.6, 'inOut');
    const mk = E.ep(t, s.tClick + 0.1, s.tClick + 1.0, 'inOut');
    const pts = s.A.map((p, i) => [p[0], E.lerp(p[1], s.B[i][1], mk)]);
    const n = Math.max(2, Math.ceil(draw * pts.length));
    const vis = pts.slice(0, n);
    const d = this.curve.call(s, vis);
    E.attr(s.fc, 'd', d);
    E.attr(s.fc, 'opacity', E.f3(draw > 0 ? 1 : 0));
    E.attr(s.fc, 'stroke', mk > 0.5 ? '#7BE8AC' : '#8FB4FF');
    // red area above the 15-min target (only for the original forecast)
    const above = pts.map(p => [p[0], Math.max(15, p[1])]);
    const da = this.curve.call(s, above.slice(0, n)) + ` L${s.xm(above[n - 1][0]).toFixed(1)} ${s.ym(15).toFixed(1)} L${s.xm(above[0][0]).toFixed(1)} ${s.ym(15).toFixed(1)} Z`;
    E.attr(s.areaA, 'd', da);
    E.attr(s.areaA, 'opacity', E.f3(draw * (1 - mk)));
    E.attr(s.pk, 'transform', `translate(${(s.xm(55) - 98).toFixed(1)} ${(s.ym(20) - 40).toFixed(1)})`);
    E.attr(s.pk, 'opacity', E.f3(E.ep(t, s.tPk, s.tPk + 0.3) * (1 - mk)));
    E.attr(s.pk2, 'transform', `translate(${(s.xm(55) - 88).toFixed(1)} ${(s.ym(11) + 14).toFixed(1)})`);
    E.attr(s.pk2, 'opacity', E.f3(E.ep(t, s.tClick + 0.8, s.tClick + 1.1)));
    // recommendation + approval
    E.fade(s.rec, E.ep(t, s.tRec, s.tRec + 0.45), { dy: 18 });
    const ok = t >= s.tClick;
    E.cls(s.ap, 'done', ok); E.txt(s.ap, ok ? 'Approved' : 'Approve');
    E.fade(s.apt, E.ep(t, s.tClick + 0.1, s.tClick + 0.4), { dx: -8, dy: 0 });
    const bx = 22 + 22 + 60, by = 66 + 394 + 152;
    MOMENT.updateCursor(s.cur, t, [[s.tClick - 0.8, 420, 700], [s.tClick - 0.08, bx, by], [s.tClick + 0.9, bx + 40, by + 90]], [s.tClick],
      Math.min(E.ep(t, s.tClick - 0.9, s.tClick - 0.7), 1 - E.ep(t, s.tClick + 0.6, s.tClick + 0.9)));
    E.vis(s.g1, Math.min(E.ep(t, s.start + 0.5, s.start + 1.0), 1 - E.ep(t, s.tRec, s.tRec + 0.3)) * (0.7 + 0.3 * Math.sin(t * 3.4)));
    E.vis(s.g2, Math.min(E.ep(t, s.start + 0.6, s.start + 1.1), 1 - E.ep(t, s.tDev, s.tDev + 0.3)) * (0.7 + 0.3 * Math.sin(t * 3.4 + 1)));
    // device health
    E.fade(s.dev, E.ep(t, s.tDev, s.tDev + 0.45), { dy: 18 });
    E.attr(s.spk, 'stroke-dashoffset', E.f3(1 - E.ep(t, s.tDev + 0.2, s.tDev + 1.2, 'inOut')));
    const fk = E.ep(t, s.tFail - 0.4, s.tFail + 0.2);
    E.attr(s.spf, 'opacity', E.f3(fk)); E.attr(s.spx, 'opacity', E.f3(E.ep(t, s.tFail, s.tFail + 0.3))); E.attr(s.spl, 'opacity', E.f3(fk));
    E.fade(s.dl1, E.ep(t, s.tFail, s.tFail + 0.35), { dy: 6 });
    E.fade(s.dl2, E.ep(t, s.tWo, s.tWo + 0.35), { dy: 6 });
  },
});
