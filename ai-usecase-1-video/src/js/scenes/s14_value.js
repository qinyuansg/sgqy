/* s14 · Core value — per stakeholder, with proof from the scenario; and an upgrade path, not a rip-and-replace. */
E.scene({
  id: 's14',
  build(el, s) {
    const V = [
      ['Operators', 'Focus', 'Less noise, fewer screens, less fatigue.', '312 alarms → 3 incidents'],
      ['Duty managers', 'Consistency', 'The right, SOP-based response on every shift.', '5/5 SOP steps · one-click approvals'],
      ['Airport', 'Continuity', 'Fewer disruptions, smoother journeys.', 'No gate closure · queue averted'],
      ['Security leadership', 'Compliance', 'Audit-ready by default.', 'Every action logged'],
    ];
    const W = 396, G = 32;
    el.innerHTML = `
      <div class="abs hd" style="left:120px;top:136px">
        <div class="label" style="color:#8FB4FF">Core value</div>
        <div class="h-l" style="margin-top:14px">Value for every stakeholder.</div>
      </div>
      ${V.map((v, i) => `
        <div class="abs panel col" style="left:${120 + i * (W + G)}px;top:300px;width:${W}px;height:290px;padding:28px 30px">
          <div class="label" style="color:#8FB4FF">${v[0]}</div>
          <div style="font-family:var(--head);font-weight:800;font-size:50px;letter-spacing:-.03em;margin-top:16px;background:linear-gradient(90deg,#EEF3FC,#9CC0FF);-webkit-background-clip:text;color:transparent">${v[1]}</div>
          <div class="body" style="margin-top:10px;font-size:21px;color:#C9D5EA;line-height:1.42">${v[2]}</div>
          <div class="mono" style="position:absolute;left:30px;bottom:24px;font-size:13px;color:#7BE8AC;display:flex;align-items:center;gap:8px">${C.icon('check', 14, 2.2)} ${v[3]}</div>
        </div>`).join('')}
      <div class="abs panel flat band" style="left:120px;top:624px;width:1680px;height:208px;display:flex;align-items:center;gap:48px;padding:0 44px">
        <div class="stack" style="position:relative;width:360px;height:150px;flex:none">
          <div class="ly l0" style="position:absolute;left:0;right:0;bottom:0;height:40px;border-radius:10px;background:rgba(143,161,192,.12);border:1px solid var(--line2);display:flex;align-items:center;padding:0 16px;font-size:15px;color:#A9B7CF">Existing security subsystems</div>
          <div class="ly l1" style="position:absolute;left:0;right:0;bottom:52px;height:40px;border-radius:10px;background:rgba(45,91,255,.14);border:1px solid rgba(77,141,255,.4);display:flex;align-items:center;padding:0 16px;font-size:15px;font-weight:600">AGIL<sup style="font-size:12px">®</sup>&nbsp;Secure ISMS · deployed</div>
          <div class="ly l2" style="position:absolute;left:0;right:0;bottom:104px;height:42px;border-radius:10px;background:linear-gradient(90deg,#2D5BFF,#4D8DFF);display:flex;align-items:center;gap:10px;padding:0 16px;font-size:15px;font-weight:700;box-shadow:0 0 30px rgba(45,91,255,.55)">${C.icon('sparkle', 18)} AI co-pilot · new layer</div>
        </div>
        <div>
          <div class="label" style="color:#8FB4FF">Built on AGIL<sup style="font-size:11px">®</sup> Secure and existing systems</div>
          <div class="h-m" style="margin-top:12px;font-size:42px">An upgrade, not a rip-and-replace.</div>
          <div class="body bl" style="margin-top:12px;font-size:19px;color:#A9B7CF">Vendor-neutral · works with legacy subsystems · AGIL<sup style="font-size:12px">®</sup> Secure operational at Dhoho Kediri International Airport, Indonesia</div>
        </div>
      </div>`;
    s.hd = E.q(el, '.hd'); s.cols = E.qa(el, '.col'); s.band = E.q(el, '.band'); s.l2 = E.q(el, '.l2'); s.l1 = E.q(el, '.l1'); s.l0 = E.q(el, '.l0'); s.bl = E.q(el, '.bl');
    const v27 = E.L('v27'), v28 = E.L('v28');
    s.tC = v27.cues.map(c => c.start);
    s.tBand = v28.start - 0.1;
    s.tUp = E.at('v28', 'upgrade') - 0.3;
    s.tC.forEach(t => E.cue(t, 'pop', 0.4)); E.cue(s.tBand, 'pop', 0.35);
    E.cue(s.tUp - 0.1, 'whoosh', 0.45); E.cue(s.tUp + 0.35, 'impactSoft', 0.55);
  },
  update(t, lt, s) {
    E.fade(s.hd, E.ep(t, s.start, s.start + 0.6), { dy: 16 });
    s.cols.forEach((c, i) => {
      E.fade(c, E.ep(t, s.tC[i] - 0.1, s.tC[i] + 0.45), { dy: 26, s: 0.98, blur: 4 });
      const hot = E.env(t, s.tC[i], (s.tC[i + 1] || s.tBand) + 0.1, 0.2);
      E.css(c, { borderColor: `rgba(77,141,255,${E.f3(0.16 + 0.45 * hot)})` });
    });
    E.fade(s.band, E.ep(t, s.tBand, s.tBand + 0.5), { dy: 24 });
    E.fade(s.l0, E.ep(t, s.tBand + 0.2, s.tBand + 0.5), { dy: 10 });
    E.fade(s.l1, E.ep(t, s.tBand + 0.4, s.tBand + 0.7), { dy: 10 });
    E.fade(s.l2, E.ep(t, s.tUp, s.tUp + 0.6, 'out5'), { dy: -60, s: 1.05 });
    E.fade(s.bl, E.ep(t, s.tUp + 0.4, s.tUp + 0.9), { dy: 8 });
  },
});
