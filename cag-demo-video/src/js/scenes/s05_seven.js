/* s05 · One night, seven incidents, already ranked: pins drop onto the airport twin while the
   ranked list builds: two Critical, four Warning, one Info. */
(function () {
  'use strict';
  // ranked by Co-pilot (severity first); pin = GEO.twin pin number
  const LIST = [
    ['crit', 'Tailgating', 'T3 · Staff Door D-214', 1], ['crit', 'Fence climb', 'Perimeter · Sector 5', 2],
    ['warn', 'Unattended bag', 'T2 · Gate B12', 3], ['warn', 'Fight starting', 'T2 · Arrival Belt 5', 4],
    ['warn', 'Card used twice', 'T1 · Door C2', 5], ['warn', 'Possible watchlist match', 'T1 · Departure Row K', 7],
    ['info', 'Overstay', 'T4 · Baggage Hall B2', 6],
  ];
  const IW = 1440, IH = 810, IX = 380, IY = 120;
  E.scene({
    id: 's05',
    build(el, s) {
      const v9 = E.L('v09'), v10 = E.L('v10');
      s.tw = E.add(el, `<div class="abs" style="left:${IX}px;top:${IY}px;width:${IW}px;height:${IH}px"><img src="assets/viz_twin.png" style="position:absolute;inset:0;width:${IW}px;height:${IH}px"></div>`);
      const P = p => [p[0] * IW, p[1] * IH];
      const ring = GEO.twin.ring;
      s.svg = E.add(s.tw, `<svg class="abs" width="${IW}" height="${IH}" style="left:0;top:0"></svg>`);
      s.pins = GEO.twin.pins.map(p => {
        const b = P(p.base), h = P(p.head), sev = p.sev === 'Critical' ? 'crit' : p.sev === 'Warning' ? 'warn' : 'info', col = K.SEV[sev][1];
        const g = K.sadd(s.svg, `<g>
          <ellipse class="rg" cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" rx="${(ring.rx * IW * 1.6).toFixed(1)}" ry="${(ring.ry * IH * 0.9).toFixed(1)}" fill="none" stroke="${col}" stroke-width="2"/>
          <ellipse cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" rx="${(ring.rx * IW * 0.7).toFixed(1)}" ry="${(ring.ry * IH * 0.4).toFixed(1)}" fill="${col}" opacity=".6"/>
          <line x1="${b[0].toFixed(1)}" y1="${b[1].toFixed(1)}" x2="${h[0].toFixed(1)}" y2="${h[1].toFixed(1)}" stroke="${col}" stroke-width="2.5"/>
          <circle cx="${h[0].toFixed(1)}" cy="${h[1].toFixed(1)}" r="11" fill="${col}" stroke="#fff" stroke-width="2.5"/></g>`);
        return { g, rg: E.q(g, '.rg'), n: p.n, sev, dy: h[1] - b[1] };
      });
      s.k = E.add(el, '<div class="abs kicker" style="left:120px;top:176px">02:14 · All terminals</div>');
      s.h = E.add(el, '<div class="abs h-m" style="left:120px;top:214px;width:560px;font-size:52px">Seven incidents.<br>Already ranked.</div>');
      s.rows = LIST.map((r, i) => {
        const e = E.add(el, `<div class="abs" style="left:120px;top:${372 + i * 66}px;width:620px;height:56px;display:flex;align-items:center;gap:16px;padding:0 16px;border-radius:12px;background:rgba(14,22,40,.78);border:1px solid rgba(255,255,255,.1)">
          <i style="width:5px;height:34px;border-radius:3px;background:${K.SEV[r[0]][1]};box-shadow:0 0 12px ${K.SEV[r[0]][1]};flex:none"></i>
          <span class="mono" style="font-size:16px;color:var(--t3);width:20px;flex:none">${i + 1}</span>
          <span style="font-size:22px;font-weight:600;color:#fff;white-space:nowrap">${r[1]}</span><span style="font-size:17px;color:var(--muted);white-space:nowrap;margin-left:auto;padding-left:12px">${r[2]}</span></div>`);
        return { e, pin: s.pins.find(p => p.n === r[3]), t0: v9.start + 0.35 + i * 0.32 };
      });
      const chipRow = E.add(el, '<div class="abs" style="left:120px;top:850px;display:flex;gap:14px"></div>');
      s.chips = [['crit', '2 Critical', 'Two'], ['warn', '4 Warning', 'Four'], ['info', '1 Info', 'One']].map(c => {
        const e = E.add(chipRow, `<div>${K.pill(c[0], c[1].toUpperCase())}</div>`);
        return { e, t0: E.at('v10', c[2]) - 0.1 };
      });
      s.rows.forEach(r => E.cue(r.t0, 'blipHi', 0.32));
      s.chips.forEach(c => E.cue(c.t0, 'pop', 0.45));
      E.cue(s.start + 0.2, 'sweep', 0.35, { dur: 1.2 });
    },
    update(t, lt, s) {
      const kt = E.ep(t, s.start, s.start + 1.0, 'out');
      E.css(s.tw, { opacity: E.f3(kt), transform: `perspective(2400px) rotateX(${E.f3(14 * (1 - kt))}deg) scale(${E.f3(0.94 + 0.06 * kt + 0.02 * E.p(t, s.start, s.end))})` });
      E.fade(s.k, E.ep(t, s.start + 0.2, s.start + 0.6), { dy: 10 });
      E.fade(s.h, E.ep(t, s.start + 0.3, s.start + 0.9, 'out5'), { dy: 18, blur: 8 });
      s.rows.forEach(r => {
        const k = E.ep(t, r.t0, r.t0 + 0.45, 'out');
        E.fade(r.e, k, { dx: -24, dy: 0 });
        const kp = E.ep(t, r.t0 - 0.05, r.t0 + 0.45, 'back');
        E.css(r.pin.g, { opacity: E.f3(E.ep(t, r.t0 - 0.05, r.t0 + 0.15)), transform: `translate(0,${E.f3(-60 * (1 - kp))}px)` });
        const pr = ((t - r.t0) % 1.6 + 1.6) % 1.6 / 1.6;
        E.css(r.pin.rg, { transformOrigin: 'center', transformBox: 'fill-box', transform: `scale(${E.f3(1 + pr * 1.6)})`, opacity: E.f3(t > r.t0 ? 1 - pr : 0) });
      });
      s.chips.forEach(c => E.fade(c.e, E.ep(t, c.t0, c.t0 + 0.35, 'back'), { s: 0.7, dy: 8 }));
    },
  });
})();
