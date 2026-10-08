/* s05 · The solution — an AI co-pilot layered on the AGIL® Secure ISMS. */
E.scene({
  id: 's05',
  build(el, s) {
    const SUBS = [['door', 'Access control', 'access control'], ['camera', 'CCTV & VMS', 'video'], ['eye', 'Video analytics', 'video'],
      ['fence', 'Intrusion detection', 'intrusion'], ['badge', 'Identity management', 'identity'], ['signal', 'Building & IoT', 'identity']];
    const LIFE = [['target', 'Detect', 'detects'], ['filter', 'Triage', 'triages'], ['search', 'Investigate', 'investigates'], ['list', 'Respond', 'recommends'], ['doc', 'Report', 'writes']];
    const PRO = [['chart', 'Anticipate', 'Traveller-flow forecasting'], ['wrench', 'Maintain', 'Device & network health']];
    const PEOPLE = [['person', 'Control room operators'], ['shield', 'Duty managers'], ['route', 'Patrol officers'], ['search', 'Investigators'], ['badge', 'Security leadership']];
    const tileW = 202, gap = 17.6;
    el.innerHTML = `
      <div class="abs hero" style="left:120px;top:300px;transform-origin:0 0">
        <div class="kicker hk" style="display:flex;align-items:center;gap:12px;font-size:20px">${C.icon('sparkle', 24, 1.8)} AI Use Case 01</div>
        <div class="h-xl ht" style="margin-top:22px;font-size:112px"><span class="blue" style="background:linear-gradient(90deg,#4D8DFF,#9CC0FF);-webkit-background-clip:text;color:transparent">AI-powered</span><br>AGIL<sup style="font-size:46px;vertical-align:58px">®</sup> Secure ISMS</div>
        <div class="lead hs" style="margin-top:26px;font-size:32px">An AI co-pilot for the airport security control room</div>
      </div>
      <div class="abs ghost" style="left:120px;top:270px;width:1300px;height:238px;border:1.5px dashed rgba(77,141,255,.45);border-radius:18px;display:flex;align-items:center;justify-content:center;gap:12px;color:#5F7BB8"><span>${C.icon('sparkle', 24, 1.8)}</span><span class="kicker" style="color:#5F7BB8">AI co-pilot layer</span></div>
      <div class="abs panel ai aip" style="left:120px;top:270px;width:1300px;height:238px;padding:24px 28px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px;color:#8FB4FF">${C.icon('sparkle', 26, 1.8)}<span class="kicker" style="font-size:17px">AI co-pilot</span></div>
          <span class="chip blue" style="font-size:13px">${C.icon('hand', 16)} Assistive · human-approved</span>
        </div>
        <div class="life" style="display:flex;align-items:center;gap:14px;margin-top:22px">
          ${LIFE.map((l, i) => `${i ? `<span class="arr" style="color:#4A5D86">${C.icon('arrow', 22)}</span>` : ''}
            <div class="lc" style="display:flex;align-items:center;gap:12px;height:66px;padding:0 20px;border-radius:14px;border:1px solid rgba(143,161,192,.25);background:rgba(143,161,192,.06);flex:1">
              ${C.icon(l[0], 26)}<span style="font-family:var(--head);font-weight:700;font-size:23px">${l[1]}</span></div>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:16px">
          <span class="label" style="width:120px">Proactive</span>
          ${PRO.map(p => `<div class="pc" style="display:flex;align-items:center;gap:12px;height:56px;padding:0 20px;border-radius:14px;border:1px solid rgba(143,161,192,.25);background:rgba(143,161,192,.06)">
              ${C.icon(p[0], 24)}<span style="font-family:var(--head);font-weight:700;font-size:21px">${p[1]}</span><span style="color:#8D9BB8;font-size:17px">· ${p[2]}</span></div>`).join('')}
        </div>
      </div>
      <svg class="abs links" width="1920" height="1080" style="left:0;top:0">
        ${SUBS.map((_, i) => { const x = 120 + i * (tileW + gap) + tileW / 2; return `<line x1="${x}" y1="690" x2="${x}" y2="652" stroke="rgba(77,141,255,.45)" stroke-width="1.5" stroke-dasharray="3 4"/>`; }).join('')}
        ${[320, 770, 1220].map(x => `<line x1="${x}" y1="560" x2="${x}" y2="510" stroke="rgba(77,141,255,.6)" stroke-width="2"/>`).join('')}
        <path class="plink" d="M1422 400 H1478" stroke="rgba(77,141,255,.6)" stroke-width="2" fill="none"/>
      </svg>
      <div class="abs panel flat isms" style="left:120px;top:560px;width:1300px;height:92px;display:flex;align-items:center;gap:22px;padding:0 28px">
        ${C.ibox('layers', 52, 26)}
        <div><div style="font-family:var(--head);font-weight:700;font-size:26px">AGIL<sup style="font-size:12px">®</sup> Secure ISMS</div>
        <div style="color:#A9B7CF;font-size:18px;margin-top:2px">One operating picture · vendor-neutral integration · works with legacy subsystems</div></div>
      </div>
      ${SUBS.map((u, i) => `
        <div class="abs panel flat sub" style="left:${120 + i * (tileW + gap)}px;top:690px;width:${tileW}px;height:104px;padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between">
          <span style="color:#8FB4FF">${C.icon(u[0], 26)}</span>
          <span style="font-weight:600;font-size:18px;line-height:1.2">${u[1]}</span>
        </div>`).join('')}
      <div class="abs label slab" style="left:120px;top:806px">Existing security subsystems</div>
      <div class="abs ppl" style="left:1480px;top:270px;width:320px">
        <div class="label" style="margin-bottom:14px">People in command</div>
        ${PEOPLE.map(p => `<div class="pr" style="display:flex;align-items:center;gap:14px;height:66px;padding:0 16px;margin-bottom:10px;border-radius:14px;border:1px solid var(--line);background:rgba(13,24,48,.8)">
          <span style="color:#8FB4FF">${C.icon(p[0], 22)}</span><span style="font-size:18px;font-weight:500">${p[1]}</span></div>`).join('')}
      </div>`;
    s.hero = E.q(el, '.hero'); s.hk = E.q(el, '.hk'); s.ht = E.q(el, '.ht'); s.hs = E.q(el, '.hs');
    s.aip = E.q(el, '.aip'); s.ghost = E.q(el, '.ghost'); s.isms = E.q(el, '.isms'); s.subs = E.qa(el, '.sub'); s.slab = E.q(el, '.slab'); s.links = E.q(el, '.links');
    s.lc = E.qa(el, '.lc'); s.arr = E.qa(el, '.arr'); s.pc = E.qa(el, '.pc'); s.ppl = E.q(el, '.ppl'); s.pr = E.qa(el, '.pr'); s.plink = E.q(el, '.plink');
    const v10 = E.L('v10');
    s.tShrink = v10.cues[1].start - 0.15;
    s.tSub = SUBS.map((u, i) => E.at('v10', u[2]) + (i === 2 ? 0.25 : i === 5 ? 0.45 : 0) - 0.1);
    s.tLife = LIFE.map(l => E.at('v11', l[2]) - 0.1);
    s.tPro = E.at('v11', 'looks') - 0.15;
    E.cue(s.start + 0.45, 'impact', 0.9); E.cue(s.start + 0.5, 'shimmer', 0.5, { dur: 2.5 });
    E.cue(s.tShrink, 'whoosh', 0.45);
    s.tSub.forEach(t => E.cue(t, 'blip', 0.3));
    E.cue(E.L('v11').start - 0.35, 'swell', 0.55, { dur: 1.6 });
    s.tLife.forEach(t => E.cue(t, 'blipHi', 0.45));
    E.cue(s.tPro, 'blipHi', 0.45); E.cue(s.tPro + 0.25, 'blipHi', 0.4);
  },
  update(t, lt, s) {
    // hero: reveal, then shrink up to make room for the stack
    E.fade(s.hk, E.ep(t, s.start + 0.2, s.start + 0.8), { dy: 10 });
    E.fade(s.ht, E.ep(t, s.start + 0.5, s.start + 1.3, 'out5'), { dy: 30, blur: 10 });
    E.fade(s.hs, E.ep(t, s.start + 1.4, s.start + 2.0), { dy: 14 });
    const k = E.ep(t, s.tShrink, s.tShrink + 0.8, 'inOut');
    E.css(s.hero, { transform: `translate3d(0,${E.f3(-189 * k)}px,0) scale(${E.f3(1 - 0.55 * k)})` });
    E.vis(s.hs, (1 - E.p(k, 0, 0.4)) * E.ep(t, s.start + 1.4, s.start + 2.0));
    E.vis(s.hk, (1 - E.p(k, 0, 0.4)) * E.ep(t, s.start + 0.2, s.start + 0.8));
    // stack, bottom-up
    E.fade(s.isms, E.ep(t, s.tShrink + 0.3, s.tShrink + 0.9), { dy: 20 });
    s.subs.forEach((u, i) => E.fade(u, E.ep(t, s.tSub[i], s.tSub[i] + 0.45), { dy: 24 }));
    E.fade(s.slab, E.ep(t, s.tSub[0] + 0.2, s.tSub[0] + 0.7), { dy: 0 });
    const tAI = E.L('v11').start - 0.35;
    E.vis(s.links, E.ep(t, s.tSub[0], s.tSub[0] + 0.6));
    E.fade(s.aip, E.ep(t, tAI, tAI + 0.6), { dy: 0, s: 0.98 });
    E.vis(s.ghost, Math.min(E.ep(t, s.tSub[1], s.tSub[1] + 0.6), 1 - E.ep(t, tAI, tAI + 0.5)) * (0.75 + 0.25 * Math.sin(t * 3.2)));
    s.lc.forEach((c, i) => {
      const on = E.ep(t, s.tLife[i], s.tLife[i] + 0.35);
      const hot = E.env(t, s.tLife[i], s.tLife[i] + 1.4, 0.3);
      E.css(c, {
        background: `rgba(45,91,255,${E.f3(0.06 + 0.22 * on + 0.2 * hot)})`,
        borderColor: `rgba(77,141,255,${E.f3(0.25 + 0.55 * on)})`,
        boxShadow: `0 0 ${Math.round(36 * hot)}px rgba(77,141,255,${E.f3(0.5 * hot)})`,
        color: on > 0.5 ? '#FFFFFF' : '#8D9BB8',
      });
    });
    s.arr.forEach((a, i) => E.css(a, { color: t > s.tLife[i + 1] ? '#8FB4FF' : '#3B4A6B' }));
    s.pc.forEach((c, i) => {
      const on = E.ep(t, s.tPro + i * 0.25, s.tPro + i * 0.25 + 0.35);
      E.css(c, { background: `rgba(45,91,255,${E.f3(0.06 + 0.22 * on)})`, borderColor: `rgba(77,141,255,${E.f3(0.25 + 0.55 * on)})`, color: on > 0.5 ? '#FFFFFF' : '#8D9BB8' });
    });
    const tP = s.tLife[3] - 0.3;
    E.fade(s.ppl, E.ep(t, tP, tP + 0.5), { dx: 20, dy: 0 });
    s.pr.forEach((r, i) => E.fade(r, E.ep(t, tP + 0.1 + i * 0.12, tP + 0.5 + i * 0.12), { dx: 16, dy: 0 }));
    E.vis(s.plink, E.ep(t, tP, tP + 0.5));
  },
});
