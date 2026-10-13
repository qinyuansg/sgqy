/* s08 · The difference: 1,248 alarms collapse into seven ranked incidents. Fewer alarms to chase;
   faster, steadier calls. */
(function () {
  'use strict';
  // the same seven incidents, in the order Co-pilot ranked them (s05)
  const RANK = [['crit', 'Tailgating', 'T3 · Staff Door D-214'], ['crit', 'Fence climb', 'Perimeter · Sector 5'], ['warn', 'Unattended bag', 'T2 · Gate B12'],
    ['warn', 'Fight starting', 'T2 · Arrival Belt 5'], ['warn', 'Card used twice', 'T1 · Door C2'], ['warn', 'Possible watchlist match', 'T1 · Departure Row K'],
    ['info', 'Overstay', 'T4 · Baggage Hall B2']];
  const SEV = RANK.map(r => r[0]);
  const NX = 1080, NY0 = 290, NDY = 78;
  E.scene({
    id: 's08',
    build(el, s) {
      const v27 = E.L('v27'), v28 = E.L('v28');
      s.tC = E.at('v27', 'become') - 0.2;
      s.k = E.add(el, '<div class="abs kicker" style="left:120px;top:250px">Tonight, with Co-pilot</div>');
      s.n = E.add(el, '<div class="abs h-xl" style="left:112px;top:286px;font-size:176px;letter-spacing:-.04em;color:#FF8E8F">1,248</div>');
      s.nl = E.add(el, '<div class="abs label" style="left:120px;top:476px;font-size:17px;color:var(--muted)">alarms</div>');
      s.n7 = E.add(el, '<div class="abs h-xl" style="left:112px;top:286px;font-size:176px;letter-spacing:-.04em;color:#fff">7</div>');
      s.n7l = E.add(el, '<div class="abs label" style="left:120px;top:476px;font-size:17px;color:var(--lav)">ranked incidents</div>');
      s.h = E.add(el, '<div class="abs h-m" style="left:120px;top:580px;width:760px;font-size:54px">Fewer alarms to chase.<br><span style="color:var(--lav)">Faster, steadier calls.</span></div>');
      // particle funnel into seven nodes
      const R = E.rng(707);
      s.nodes = SEV.map((sv, i) => ({ x: NX, y: NY0 + i * NDY, col: K.SEV[sv][1] }));
      s.p = Array.from({ length: 420 }, () => {
        const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 230, n = Math.floor(R() * 7);
        return { x0: 830 + Math.cos(a) * r * 0.9, y0: 540 + Math.sin(a) * r, n, d: R() * 0.8, ph: R() * 6.28, col: ['#D72D30', '#D4B741', '#4DAFBE', '#7D8AA3', '#7D8AA3'][Math.floor(R() * 5)], rad: 1.8 + R() * 2 };
      });
      s.svg = E.add(el, `<svg class="abs" width="1920" height="1080" style="left:0;top:0">
        <g class="pp">${s.p.map(p => `<circle r="${p.rad.toFixed(1)}" fill="${p.col}"/>`).join('')}</g>
        ${s.nodes.map(n => `<g class="nd"><circle cx="${n.x}" cy="${n.y}" r="26" fill="none" stroke="${n.col}" stroke-width="2" opacity=".5"/><circle cx="${n.x}" cy="${n.y}" r="15" fill="${n.col}" stroke="#fff" stroke-width="2.5"/></g>`).join('')}
      </svg>`);
      s.pe = E.qa(s.svg, '.pp circle'); s.ne = E.qa(s.svg, '.nd');
      s.tags = s.nodes.map((n, i) => E.add(el, `<div class="abs" style="left:${n.x + 46}px;top:${n.y - 17}px;display:flex;align-items:baseline;gap:14px;white-space:nowrap">
        <span class="label" style="color:${K.SEV[SEV[i]][2]};width:92px">${K.SEV[SEV[i]][0]}</span><span style="font-size:24px;font-weight:600;color:#fff">${RANK[i][1]}</span><span style="font-size:18px;color:var(--muted)">${RANK[i][2]}</span></div>`));
      E.cue(s.tC, 'riser', 0.4, { dur: 1.0 });
      E.cue(s.tC + 1.1, 'impact', 0.6);
      E.cue(v28.start, 'chime', 0.35);
    },
    update(t, lt, s) {
      E.fade(s.k, E.ep(t, s.start + 0.2, s.start + 0.6), { dy: 10 });
      const kc = E.ep(t, s.tC + 0.2, s.tC + 1.2, 'inOut');
      E.fade(s.n, E.ep(t, s.start + 0.3, s.start + 0.8) * (1 - E.ep(t, s.tC + 0.7, s.tC + 1.0)), { dy: 0, blur: 10 });
      E.fade(s.nl, E.ep(t, s.start + 0.4, s.start + 0.8) * (1 - E.ep(t, s.tC + 0.7, s.tC + 1.0)), { dy: 0 });
      E.fade(s.n7, E.ep(t, s.tC + 1.0, s.tC + 1.4, 'out5'), { dy: 20, blur: 10, s: 1.2 });
      E.fade(s.n7l, E.ep(t, s.tC + 1.1, s.tC + 1.5), { dy: 8 });
      const v28 = E.L('v28');
      E.fade(s.h, E.ep(t, v28.start - 0.1, v28.start + 0.5, 'out5'), { dy: 18, blur: 8 });
      s.p.forEach((p, i) => {
        const n = s.nodes[p.n], k = E.ep(t, s.tC + p.d * 0.5, s.tC + p.d * 0.5 + 0.9, 'inOut');
        const jx = Math.sin(t * 1.3 + p.ph) * 10 * (1 - k), jy = Math.cos(t * 1.1 + p.ph) * 10 * (1 - k);
        // bend toward the node along a gentle curve
        const mx = E.lerp(p.x0, n.x, k), my = E.lerp(p.y0, n.y, k * k);
        E.attr(s.pe[i], 'cx', (mx + jx).toFixed(1)); E.attr(s.pe[i], 'cy', (my + jy).toFixed(1));
        E.attr(s.pe[i], 'opacity', E.f3(E.ep(t, s.start + 0.2, s.start + 0.9) * (1 - E.ep(t, s.tC + 0.9, s.tC + 1.3)) * (0.6 + 0.4 * Math.sin(t * 3 + p.ph))));
      });
      s.ne.forEach((e, i) => {
        const k = E.ep(t, s.tC + 0.8 + i * 0.05, s.tC + 1.2 + i * 0.05, 'back');
        E.css(e, { opacity: E.f3(E.ep(t, s.tC + 0.8 + i * 0.05, s.tC + 1.0 + i * 0.05)), transformOrigin: `${s.nodes[i].x}px ${s.nodes[i].y}px`, transform: `scale(${E.f3(0.4 + 0.6 * k)})` });
        E.fade(s.tags[i], E.ep(t, s.tC + 1.0 + i * 0.05, s.tC + 1.4 + i * 0.05), { dx: -10, dy: 0 });
      });
    },
  });
})();
