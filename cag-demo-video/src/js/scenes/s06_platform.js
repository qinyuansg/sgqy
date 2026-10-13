/* s06 · One platform: four layers above the systems the airport already owns, federated from every
   terminal up to the central operations centre. */
(function () {
  'use strict';
  const LAY = [ // top to bottom
    ['AI Co-pilot', 'Correlates, explains, recommends', '#B69CFF', 'Co-pilot'],
    ['AGIL® Secure V11', 'Alarms, SOPs, incidents, 3D twin', '#4D8DFF', 'platform'],
    ['Site edge, per terminal', 'Video analytics, runs offline too', '#8FB4FF', 'above'],
    ['Systems you already own', 'CCTV · access · LiDAR · fence · intercom', '#8C97B3', 'systems'],
  ];
  const CX = 470, Y0 = 330, DY = 128, HW = 270, HH = 96;
  E.scene({
    id: 's06',
    build(el, s) {
      const v = E.L('v24');
      s.k = E.add(el, '<div class="abs kicker" style="left:200px;top:190px">Above the systems you own</div>');
      const rh = (cx, cy) => `${cx},${cy - HH} ${cx + HW},${cy} ${cx},${cy + HH} ${cx - HW},${cy}`;
      s.svg = E.add(el, `<svg class="abs" width="1920" height="1080" style="left:0;top:0"><defs>${LAY.map((l, i) => `
        <linearGradient id="lg${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l[2]}" stop-opacity=".34"/><stop offset="1" stop-color="${l[2]}" stop-opacity=".06"/></linearGradient>`).join('')}</defs></svg>`);
      const R = E.rng(606);
      // order of appearance: bottom-up
      s.L = LAY.map((l, i) => ({ l, i, y: Y0 + i * DY })).reverse().map((o, j) => {
        const g = K.sadd(s.svg, `<g>
          <polygon points="${rh(CX, o.y)}" fill="url(#lg${o.i})" stroke="${o.l[2]}" stroke-width="1.6" stroke-opacity=".85"/>
          ${Array.from({ length: 9 }, () => { const u = R() * 2 - 1, w = (R() * 2 - 1) * (1 - Math.abs(u)); return `<circle cx="${(CX + u * HW * 0.8).toFixed(1)}" cy="${(o.y + w * HH * 0.8).toFixed(1)}" r="3" fill="#fff" opacity=".8"/>`; }).join('')}
        </g>`);
        const lab = E.add(el, `<div class="abs" style="left:${CX + HW + 70}px;top:${o.y - 34}px;width:520px">
          <div style="display:flex;align-items:center;gap:12px"><i style="width:10px;height:10px;border-radius:50%;background:${o.l[2]};box-shadow:0 0 12px ${o.l[2]}"></i><span class="h-s" style="font-size:30px;white-space:nowrap">${o.l[0]}</span></div>
          <div style="font-size:20px;color:var(--muted);margin:6px 0 0 22px;white-space:nowrap">${o.l[1]}</div></div>`);
        const ln = K.sadd(s.svg, `<line x1="${CX + HW + 8}" y1="${o.y}" x2="${CX + HW + 56}" y2="${o.y}" stroke="${o.l[2]}" stroke-width="1.5" stroke-opacity=".7"/>`);
        return { g, lab, ln, y: o.y, t0: v.start + 0.2 + j * 0.42 };
      });
      // vertical light between the layers
      s.beam = K.sadd(s.svg, `<line x1="${CX}" y1="${Y0 + 3 * DY}" x2="${CX}" y2="${Y0}" stroke="#D4C6FF" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${3 * DY} ${3 * DY}"/>`);
      // federation: every terminal to the central operations centre
      s.tF = E.C('v24', 1).start - 0.1;
      const FX = 1566, FY = 360, TY = 700, TX = [-2, -1, 0, 1, 2].map(k => FX + k * 100);
      s.fed = E.add(el, `<div class="abs" style="left:0;top:0;width:1920px;height:1080px"></div>`);
      s.fsvg = E.add(s.fed, `<svg class="abs" width="1920" height="1080" style="left:0;top:0">${TX.map(x => `<path d="M${x} ${TY - 30} C${x} ${TY - 180} ${FX} ${FY + 160} ${FX} ${FY + 44}" fill="none" stroke="#8FB4FF" stroke-width="1.6" stroke-opacity=".7"/>`).join('')}</svg>`);
      s.paths = E.qa(s.fsvg, 'path').map(p => { const L = p.getTotalLength(); p.setAttribute('stroke-dasharray', `${L.toFixed(1)} ${L.toFixed(1)}`); return { p, L }; });
      s.hub = E.add(s.fed, `<div class="abs" style="left:${FX - 44}px;top:${FY - 44}px;width:88px;height:88px;border-radius:50%;background:#4D8DFF;box-shadow:0 0 50px 10px rgba(77,141,255,.55);display:grid;place-items:center;color:#fff">${K.icon('building', 38, 1.8)}</div>`);
      s.hubL = E.add(s.fed, `<div class="abs label" style="left:${FX - 200}px;width:400px;top:${FY - 92}px;text-align:center;color:#fff;font-size:15px">Central operations centre</div>`);
      s.term = TX.map((x, i) => E.add(s.fed, `<div class="abs" style="left:${x - 34}px;top:${TY - 30}px;width:68px;height:60px;border-radius:12px;background:rgba(14,22,40,.9);border:1.5px solid rgba(143,180,255,.6);display:grid;place-items:center;font-family:var(--head);font-weight:800;font-size:24px;color:#fff">T${i + 1}</div>`));
      s.termL = E.add(s.fed, `<div class="abs label" style="left:${FX - 250}px;width:500px;top:${TY + 48}px;text-align:center;color:var(--muted)">Every terminal</div>`);
      s.L.forEach(l => E.cue(l.t0, 'thud', 0.35));
      E.cue(s.tF, 'sweep', 0.4, { dur: 1.2 });
      E.cue(s.tF + 1.0, 'chime', 0.3);
    },
    update(t, lt, s) {
      E.fade(s.k, E.ep(t, s.start + 0.2, s.start + 0.6), { dy: 10 });
      s.L.forEach(l => {
        const k = E.ep(t, l.t0, l.t0 + 0.6, 'out5');
        E.css(l.g, { opacity: E.f3(k), transform: `translate(0,${E.f3(50 * (1 - k))}px)` });
        E.fade(l.lab, E.ep(t, l.t0 + 0.2, l.t0 + 0.6), { dx: -16, dy: 0 });
        E.attr(l.ln, 'opacity', E.f3(E.ep(t, l.t0 + 0.2, l.t0 + 0.5)));
      });
      const kb = E.ep(t, s.L[3].t0 + 0.4, s.L[3].t0 + 1.2, 'inOut');
      E.attr(s.beam, 'stroke-dashoffset', (3 * DY * (1 - kb)).toFixed(1));
      E.attr(s.beam, 'opacity', E.f3(kb > 0 ? 0.9 : 0));
      // federation
      const kf = E.ep(t, s.tF, s.tF + 0.5);
      E.vis(s.fed, kf);
      s.term.forEach((e, i) => E.fade(e, E.ep(t, s.tF + i * 0.08, s.tF + 0.4 + i * 0.08, 'back'), { s: 0.7, dy: 10 }));
      E.fade(s.termL, E.ep(t, s.tF + 0.3, s.tF + 0.7), { dy: 8 });
      s.paths.forEach((p, i) => E.attr(p.p, 'stroke-dashoffset', (p.L * (1 - E.ep(t, s.tF + 0.4 + i * 0.06, s.tF + 1.2 + i * 0.06, 'inOut'))).toFixed(1)));
      E.fade(s.hub, E.ep(t, s.tF + 1.0, s.tF + 1.4, 'back'), { s: 0.6, dy: 0 });
      E.fade(s.hubL, E.ep(t, s.tF + 1.2, s.tF + 1.6), { dy: 8 });
    },
  });
})();
