import { Frame, T, f, rect, circle, line, pathEl, poly, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { L, backdrop, shell, pageHeader, surface, card, chip, chips, seg, button, overline, hair, aiMark, aiGrad } from '../lib/ui.mjs';
import { kpiStrip } from './overview.mjs';

// two-series palette validated with the dataviz validator (dark, surface #0E1526): all checks pass
const S1 = '#4D8DFF', S2 = '#199E70';
// sequential ramp (single hue, dark → light on a dark surface)
const RAMP = ['#14233F', '#1B3360', '#244785', '#3463B8', '#4D8DFF', '#8FB4FF'];
const lerp = v => RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(v * (RAMP.length - 1))))];

function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export default function insights() {
  const F = new Frame('14 · Access insights (business analytics)');
  let s = backdrop(F) + shell(F, { active: 5 });
  const sg = seg(F, 0, 0, ['7 d', '30 d', '90 d'], 1);
  const ask = 'Which companies have the most unreturned expired passes?';
  const aw = textWidth(ask, 13) + 64;
  s += pageHeader(F, 'Access insights', 'All sites · last 30 days', {
    right: g(F, 'Ask chip', rect(L.x1 - sg.w - 16 - aw, L.y0 + 6, aw, 36, { r: 18, fill: '#FFFFFF', fo: 0.05, stroke: aiGrad(F), sw: 1.2, so: 0.6 }) + aiMark(F, L.x1 - sg.w - 16 - aw + 8, L.y0 + 12, 24) + text(L.x1 - sg.w - 16 - aw + 42, L.y0 + 29, ask, { size: 13, fill: T.t2 })) + seg(F, L.x1 - sg.w, L.y0 + 8, ['7 d', '30 d', '90 d'], 1).svg,
  });
  s += kpiStrip(F, L.x0, 150, L.x1 - L.x0, [
    { k: 'Active passes', v: '48,210', sub: '312 dormant > 12 months' },
    { k: 'Access events', v: '3.9 M', sub: 'Peak 07:00–08:00 weekdays' },
    { k: 'Behaviour deviations', v: '126', sub: '▲ 12% vs. previous 30 days', subCol: T.high },
    { k: 'Expired, not returned', v: '1,084', sub: 'Across 61 companies', subCol: T.high },
    { k: 'Busiest access point', v: 'T3 · G-04', sub: '18,400 / day staff gate' },
  ]);
  const ry = 274, rh = 366;
  // heatmap
  const hx = L.x0, hw = 880;
  let hm = '';
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cx0 = hx + 64, cy0 = ry + 66, cw = (hw - 64 - 24) / 24, ch = 30;
  const R = rnd(7);
  days.forEach((d, j) => {
    hm += text(hx + 22, cy0 + j * (ch + 4) + 20, d, { size: 12, fill: T.t2 });
    for (let h = 0; h < 24; h++) {
      const peak = Math.exp(-((h - 7.5) ** 2) / 4) * (j < 5 ? 1 : 0.55) + Math.exp(-((h - 18) ** 2) / 6) * (j < 5 ? 0.8 : 0.6) + (h >= 0 && h < 5 ? 0.02 : 0.12) + R() * 0.08;
      hm += rect(cx0 + h * cw, cy0 + j * (ch + 4), cw - 3, ch, { r: 4, fill: lerp(Math.min(1, peak)) });
    }
  });
  for (const h of [0, 6, 12, 18, 23]) hm += text(cx0 + h * cw + (cw - 3) / 2, cy0 + 7 * (ch + 4) + 14, String(h).padStart(2, '0'), { size: 11, fill: T.t3, anchor: 'middle' });
  const lgx = hx + hw - 22 - 6 * 22 - 90;
  hm += text(lgx, ry + 37, 'Fewer', { size: 11.5, fill: T.t3 });
  RAMP.forEach((c, i) => { hm += rect(lgx + 40 + i * 22, ry + 27, 20, 12, { r: 3, fill: c }); });
  hm += text(lgx + 40 + 6 * 22 + 6, ry + 37, 'More', { size: 11.5, fill: T.t3 });
  s += card(F, 'Busiest hour and day', hx, ry, hw, rh, { title: 'Busiest hour and day', meta: '' }, hm);
  // line chart: yesterday vs typical day
  const lx = hx + hw + 24, lw = L.x1 - lx;
  let lc = '';
  const gx = lx + 64, gy = ry + 70, gw = lw - 64 - 90, gh = rh - 128;
  const maxV = 20000;
  for (const v of [0, 10000, 20000]) { const yy = gy + gh - gh * v / maxV; lc += line(gx, yy, gx + gw, yy, { stroke: '#FFFFFF', so: v ? 0.06 : 0.14 }) + text(gx - 10, yy + 4, v ? (v / 1000) + 'k' : '0', { size: 11, fill: T.t3, anchor: 'end' }); }
  const typ = Array.from({ length: 24 }, (_, h) => 1200 + 15500 * Math.exp(-((h - 7.5) ** 2) / 4.5) + 11500 * Math.exp(-((h - 18) ** 2) / 7) + 2500 * Math.exp(-((h - 13) ** 2) / 8));
  const yest = typ.map((v, h) => v * (h >= 16 && h <= 19 ? 1.22 : 1) * (0.97 + 0.06 * Math.sin(h)));
  const P = arr => arr.map((v, h) => [gx + gw * h / 23, gy + gh - gh * v / maxV]);
  lc += poly(P(typ), { open: true, stroke: S2, sw: 2, dash: '6 4', join: 'round', cap: 'round' });
  lc += poly(P(yest), { open: true, stroke: S1, sw: 2, join: 'round', cap: 'round' });
  // direct labels where the two lines are furthest apart
  const l1 = P(yest)[20], l2 = P(typ)[20];
  lc += text(l1[0] + 10, l1[1] - 8, 'Yesterday', { size: 12, weight: 600, fill: T.t1 });
  lc += text(l2[0] - 6, l2[1] + 26, 'Typical', { size: 12, weight: 600, fill: T.t1 });
  // annotation at evening peak
  const ap = P(yest)[18];
  lc += line(ap[0], ap[1] - 6, ap[0], gy - 6, { stroke: T.t3, dash: '3 3' }) + text(ap[0] - 8, gy + 4, '+22% 16:00–19:00', { size: 12, weight: 600, fill: T.t1, anchor: 'end' }) + text(ap[0] - 8, gy + 20, 'Ground-ops shift change', { size: 11.5, fill: T.t3, anchor: 'end' });
  for (const h of [0, 6, 12, 18, 23]) lc += text(gx + gw * h / 23, gy + gh + 18, String(h).padStart(2, '0') + ':00', { size: 11, fill: T.t3, anchor: 'middle' });
  // legend (always present for ≥2 series)
  lc += line(lx + lw - 300, ry + 32, lx + lw - 280, ry + 32, { stroke: S1, sw: 2 }) + text(lx + lw - 274, ry + 36, 'Yesterday', { size: 12, fill: T.t2 });
  lc += line(lx + lw - 190, ry + 32, lx + lw - 170, ry + 32, { stroke: S2, sw: 2, dash: '6 4' }) + text(lx + lw - 164, ry + 36, 'Typical (30-day median)', { size: 12, fill: T.t2 });
  s += card(F, 'Access events per hour', lx, ry, lw, rh, { title: 'Access events per hour' }, lc);

  // row 2
  const y2 = ry + rh + 24, h2 = L.y1 - y2;
  const w1 = 580, w2 = 580, w3 = L.x1 - L.x0 - w1 - w2 - 48;
  // deviations (CAG BA rules)
  const dx = L.x0;
  let dv = '';
  [['clock', 'Restricted area entered in wee hours', 41], ['shield', 'Zone outside scope of duty', 33], ['route', 'Deviation from usual route', 29], ['users', 'Group moving together (3+)', 23]].forEach(([ic, lab, n], i) => {
    const yy = y2 + 62 + i * 58;
    dv += rect(dx + 22, yy, 36, 36, { r: 10, fill: T.blue, fo: 0.12 }) + icon(F, ic, dx + 30, yy + 8, 20, T.blue, 1.9);
    dv += text(dx + 72, yy + 16, lab, { size: 13.5, weight: 600, fill: T.t1 }) + text(dx + 72, yy + 33, 'vs. each person’s 90-day baseline', { size: 11.5, fill: T.t3 });
    dv += text(dx + w1 - 110, yy + 24, String(n), { size: 18, weight: 600, fill: T.t1, anchor: 'end' });
    dv += button(F, dx + w1 - 96, yy + 3, 74, 30, 'Review', { kind: 'secondary', size: 12.5, r: 15 });
  });
  s += card(F, 'Behaviour deviations', dx, y2, w1, h2, { icon: 'wave', title: 'Behaviour deviations', meta: 'From baseline' }, dv);
  // top access points (single hue, sorted)
  const tx = dx + w1 + 24;
  let tp = '';
  const aps = [['T3 · G-04 staff gate', 18400], ['T1 · Crew centre', 14100], ['T2 · Airside S-11', 12600], ['Cargo · Gate C2', 9800], ['T5 · Pier B service', 7400], ['T4 · B2 east door', 5100]];
  aps.forEach(([lab, v], i) => {
    const yy = y2 + 62 + i * 40, bw = (w2 - 44 - 190 - 70) * v / 18400;
    tp += text(tx + 22, yy + 13, lab, { size: 13, fill: T.t2 }) + rect(tx + 212, yy, bw, 16, { r: 4, fill: S1 }) + text(tx + 212 + bw + 10, yy + 13, (v / 1000).toFixed(1) + 'k', { size: 12.5, weight: 600, fill: T.t1 });
  });
  tp += text(tx + 22, y2 + h2 - 22, 'Average entries per day · tap a bar for hourly profile', { size: 12, fill: T.t3 });
  s += card(F, 'Top access points', tx, y2, w2, h2, { icon: 'door', title: 'Throughput by access point', meta: 'per day' }, tp);
  // pass hygiene
  const px = tx + w2 + 24;
  let ph = '';
  ph += rect(px + 22, y2 + 58, w3 - 44, 68, { r: 14, fill: T.high, fo: 0.08, stroke: T.high, so: 0.3 });
  ph += text(px + 40, y2 + 86, '312 passes unused for 12 months', { size: 14, weight: 600, fill: T.t1 }) + text(px + 40, y2 + 106, 'Suspend in bulk, notify sponsors', { size: 12, fill: T.t3 });
  ph += button(F, px + w3 - 22 - 96, y2 + 76, 80, 32, 'Suspend', { kind: 'secondary', size: 12.5, r: 16 });
  ph += overline(px + 22, y2 + 156, 'Expired passes not returned · top companies');
  [['Apex Ground Services', 214], ['Skyline Catering', 162], ['Northgate Facilities', 118], ['Harbour Logistics', 96]].forEach(([c, n], i) => {
    const yy = y2 + 176 + i * 32;
    ph += text(px + 22, yy + 14, c, { size: 13, fill: T.t2 }) + text(px + w3 - 22, yy + 14, String(n), { size: 13, weight: 600, fill: T.t1, anchor: 'end' });
    if (i < 3) ph += hair(px + 22, yy + 24, px + w3 - 22, { so: 0.05 });
  });
  s += card(F, 'Pass hygiene', px, y2, w3, h2, { icon: 'idcard', title: 'Pass hygiene' }, ph);
  return F.render(s);
}
