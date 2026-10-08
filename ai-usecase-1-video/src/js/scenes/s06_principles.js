/* s06 · Design principles — four rules that make AI trustworthy in a control room. */
E.scene({
  id: 's06',
  build(el, s) {
    const PR = [
      ['hand', 'Human in command', 'AI recommends. People decide — every action approved and logged.', 'Approve · override · audit'],
      ['eye', 'Explainable', 'Every score and every suggestion shows the evidence behind it.', 'No black boxes'],
      ['list', 'Grounded in your SOPs', "Responses follow the airport's own procedures and regulations.", 'SOP-native playbooks'],
      ['lock', 'Secure by design', 'Zero-trust architecture. AI runs on-premises — data stays in the airport.', 'On-premises AI'],
    ];
    const W = 396, G = 32;
    el.innerHTML = `
      <div class="abs hd" style="left:120px;top:136px">
        <div class="label" style="color:#8FB4FF">Design principles</div>
        <div class="h-l" style="margin-top:14px">Built for trust in the control room.</div>
      </div>
      ${PR.map((p, i) => `
        <div class="abs panel card" style="left:${120 + i * (W + G)}px;top:312px;width:${W}px;height:440px;padding:34px 32px">
          <div class="mono" style="font-size:18px;color:#8FB4FF;letter-spacing:.1em">0${i + 1}</div>
          <div style="margin-top:26px">${C.ibox(p[0], 68, 34)}</div>
          <div class="h-s" style="margin-top:30px;font-size:32px">${p[1]}</div>
          <div class="body" style="margin-top:14px;font-size:22px;line-height:1.45;color:#B4C1D8">${p[2]}</div>
          <div class="label" style="position:absolute;left:32px;bottom:30px;color:#8FB4FF">${p[3]}</div>
        </div>`).join('')}`;
    s.hd = E.q(el, '.hd'); s.cards = E.qa(el, '.card');
    const v = E.L('v12');
    s.at = [v.cues[0].start, v.cues[1].start, v.cues[2].start, E.at('v12', 'runs') - 0.1];
    s.at.forEach(t => E.cue(t, 'pop', 0.45));
  },
  update(t, lt, s) {
    E.fade(s.hd, E.ep(t, s.start, s.start + 0.6), { dy: 16 });
    s.cards.forEach((c, i) => {
      E.fade(c, E.ep(t, s.at[i] - 0.1, s.at[i] + 0.5), { dy: 30, s: 0.98, blur: 4 });
      const hot = E.env(t, s.at[i], (s.at[i + 1] || s.end - 0.3) + 0.1, 0.25);
      E.css(c, { borderColor: `rgba(77,141,255,${E.f3(0.16 + 0.45 * hot)})`, boxShadow: `0 30px 80px rgba(0,0,0,.45), 0 0 ${Math.round(46 * hot)}px rgba(45,91,255,${E.f3(0.28 * hot)})` });
    });
  },
});
