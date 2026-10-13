/* s07 · Governed by design: on premise, role based, every suggestion and decision logged, and no
   facial recognition needed to link a bag to its owner. */
(function () {
  'use strict';
  const ROWS = [
    ['server', 'On premise', 'Runs on the airport’s own servers', ['v25', 'premise']],
    ['users', 'Role based', 'Each person sees what their role allows', ['v25', 'Role']],
    ['list', 'Everything logged', 'Every suggestion and every decision', ['v25', 'suggestion']],
    ['eyeOff', 'No facial recognition needed', 'Bag and owner linked by clothing', ['v26', 'facial']],
  ];
  const CX = 520, CY = 540;
  E.scene({
    id: 's07',
    build(el, s) {
      s.k = E.add(el, '<div class="abs kicker" style="left:960px;top:226px">Governed by design</div>');
      s.h = E.add(el, '<div class="abs h-m" style="left:960px;top:264px;width:840px;font-size:52px">Trusted by default.</div>');
      // ring
      const r = 230, C2 = 2 * Math.PI * r;
      s.ring = E.add(el, `<svg class="abs" width="700" height="700" style="left:${CX - 350}px;top:${CY - 350}px" viewBox="-350 -350 700 700">
        <circle r="${r + 70}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
        <circle r="${r}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="10"/>
        ${[0, 1, 2, 3].map(i => `<circle class="arc" r="${r}" fill="none" stroke="${i === 3 ? '#B69CFF' : '#8FB4FF'}" stroke-width="10" stroke-linecap="round" stroke-dasharray="0 ${C2.toFixed(1)}" transform="rotate(${-90 + i * 90 + 4})"/>`).join('')}
        <g class="tk">${Array.from({ length: 72 }, (_, i) => `<line x1="${r + 26}" y1="0" x2="${r + (i % 6 ? 34 : 44)}" y2="0" stroke="rgba(255,255,255,${i % 6 ? 0.16 : 0.4})" stroke-width="1.5" transform="rotate(${i * 5})"/>`).join('')}</g>
        <circle r="${r - 50}" fill="url(#tg)"/>
        <defs><radialGradient id="tg"><stop offset="0" stop-color="rgba(124,92,255,.35)"/><stop offset="1" stop-color="rgba(124,92,255,0)"/></radialGradient></defs>
      </svg>`);
      s.arcs = E.qa(s.ring, '.arc'); s.tk = E.q(s.ring, '.tk'); s.C2 = C2;
      s.sh = E.add(el, `<div class="abs" style="left:${CX - 80}px;top:${CY - 80}px;width:160px;height:160px;display:grid;place-items:center;color:#fff">${K.icon('shieldCheck', 150, 1.2)}</div>`);
      s.rows = ROWS.map((d, i) => {
        const e = E.add(el, `<div class="abs" style="left:960px;top:${400 + i * 112}px;width:840px;display:flex;align-items:center;gap:24px">
          ${K.ibox(d[0], 76, 34, i === 3 ? 'background:rgba(182,156,255,.16);border-color:rgba(182,156,255,.7)' : '')}
          <div><div class="h-s" style="font-size:32px;white-space:nowrap">${d[1]}</div><div style="font-size:21px;color:var(--muted);margin-top:4px;white-space:nowrap">${d[2]}</div></div></div>`);
        return { e, t0: E.at(d[3][0], d[3][1]) - 0.25 };
      });
      s.rows.forEach(r => E.cue(r.t0, 'confirm', 0.35));
      E.cue(s.start + 0.25, 'swell', 0.3, { dur: 1.5 });
    },
    update(t, lt, s) {
      E.fade(s.k, E.ep(t, s.start + 0.2, s.start + 0.6), { dy: 10 });
      E.fade(s.h, E.ep(t, s.start + 0.3, s.start + 0.9, 'out5'), { dy: 18, blur: 8 });
      E.css(s.ring, { opacity: E.f3(E.ep(t, s.start, s.start + 0.8)), transform: `scale(${E.f3(0.92 + 0.08 * E.ep(t, s.start, s.start + 1.2, 'out5'))})` });
      E.css(s.tk, { transform: `rotate(${E.f3(t * 6)}deg)` });
      s.rows.forEach((r, i) => {
        E.fade(r.e, E.ep(t, r.t0, r.t0 + 0.5, 'out'), { dx: -20, dy: 0 });
        const k = E.ep(t, r.t0, r.t0 + 0.9, 'inOut');
        E.attr(s.arcs[i], 'stroke-dasharray', `${(s.C2 * 0.25 * k - 8 * k).toFixed(1)} ${s.C2.toFixed(1)}`);
      });
      E.fade(s.sh, E.ep(t, s.start + 0.4, s.start + 1.0, 'back'), { s: 0.7, dy: 0 });
    },
  });
})();
