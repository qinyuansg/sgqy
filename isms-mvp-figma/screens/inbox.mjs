import { Frame, T, SEV, f, rect, circle, line, pathEl, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { L, backdrop, shell, pageHeader, surface, card, chip, chips, seg, button, iconBtn, overline, hair, vhair, aiMark, progress } from '../lib/ui.mjs';
import { INCIDENTS } from './data.mjs';

export default function inbox() {
  const F = new Frame('04 · Incidents — Alarm correlation inbox');
  let s = backdrop(F) + shell(F, { active: 1 });
  const sg = seg(F, 0, 0, ['Correlated', 'All alarms', 'Closed'], 0);
  s += pageHeader(F, 'Incidents', 'Correlation inbox · last 24 h', { right: seg(F, L.x1 - sg.w, L.y0 + 8, ['Correlated', 'All alarms', 'Closed'], 0).svg });

  // ---- noise-to-signal flow ----
  const fy = 150, fh = 112;
  let fl = surface(F, L.x0, fy, L.x1 - L.x0, fh);
  const steps = [
    ['1,248', 'Raw alarms', 'From 9 subsystems', T.t1],
    ['1,184', 'Auto-closed as noise', 'Duplicates, weather, maintenance', T.t2],
    ['57', 'Merged as evidence', 'Attached to incidents', T.ice],
    ['7', 'Incidents for a human', '3 awaiting your decision', T.high],
  ];
  const sw = (L.x1 - L.x0) / 4;
  steps.forEach(([v, k, sub, col], i) => {
    const x = L.x0 + i * sw + 28;
    fl += text(x, fy + 58, v, { size: 34, weight: 600, fill: col });
    const vw = textWidth(v, 34, 600);
    fl += text(x + vw + 14, fy + 44, k, { size: 14, weight: 600, fill: T.t1 }) + text(x + vw + 14, fy + 63, sub, { size: 12.5, fill: T.t3 });
    if (i < 3) fl += circle(L.x0 + (i + 1) * sw, fy + fh / 2, 16, { fill: '#0A0F1A', stroke: '#FFFFFF', so: 0.12 }) + icon(F, 'chevR', L.x0 + (i + 1) * sw - 8, fy + fh / 2 - 8, 16, T.t2, 2.2);
  });
  fl += rect(L.x0 + 28, fy + 84, L.x1 - L.x0 - 56, 6, { r: 3, fill: '#FFFFFF', fo: 0.06 });
  const tot = L.x1 - L.x0 - 56;
  fl += rect(L.x0 + 28, fy + 84, tot * 1184 / 1248, 6, { r: 3, fill: T.t4 }) + rect(L.x0 + 28 + tot * 1184 / 1248 + 2, fy + 84, tot * 57 / 1248 - 2, 6, { r: 0, fill: T.ice }) + rect(L.x0 + 28 + tot * 1241 / 1248 + 2, fy + 84, tot * 7 / 1248 + 2, 6, { r: 3, fill: T.high });
  s += g(F, 'Noise to signal', fl);

  const y = 286, y1 = L.y1;
  // ---- left: raw alarm stream ----
  const lx = L.x0, lw = 420;
  let st = '';
  const rows = [
    ['02:15:12', 'thermo', 'Thermal: person detected', 'PTZ 7-02', 'INC-2416', T.crit],
    ['02:15:03', 'camera', 'PTZ auto-slew', 'PTZ 7-02', 'INC-2416', T.crit],
    ['02:15:01', 'radar', 'LiDAR object 1.7 m', 'L-5B', 'INC-2416', T.crit],
    ['02:14:59', 'clock', 'Door held open 9 s', 'D-214', 'INC-2417', T.crit],
    ['02:14:58', 'fence', 'Fence vibration', 'Seg 5-14', 'INC-2416', T.crit],
    ['02:14:52', 'video', 'Tailgating', 'CAM 3-118', 'INC-2417', T.crit],
    ['02:14:52', 'radar', 'Count mismatch 2 / 1', 'LiDAR D-214', 'INC-2417', T.crit],
    ['02:14:50', 'door', 'Door opened', 'D-214', 'INC-2417', T.crit],
    ['02:14:48', 'key', 'Badge granted', 'B-55821', 'INC-2417', T.crit],
    ['02:14:41', 'door', 'Door held open 22 s', 'C7', 'Known pattern', null],
    ['02:14:30', 'video', 'Camera image degraded', 'CAM 4-022', 'Maintenance', null],
    ['02:14:12', 'fence', 'Fence vibration', 'Seg 3-07', 'Wind 41 km/h', null],
    ['02:13:58', 'door', 'Door forced ×4', 'D-118', 'Duplicate', null],
    ['02:13:22', 'clock', 'Off-roster access', 'S-20931', 'INC-2414', T.high],
    ['02:13:21', 'eye', 'Appearance differs', 'CAM 1-204', 'INC-2414', T.high],
  ];
  const rh = 44;
  rows.forEach(([t, ic, title, src, tag, col], i) => {
    const yy = y + 64 + i * rh;
    let r = text(lx + 22, yy + 18, t, { size: 12, weight: 500, fill: T.t3 });
    r += icon(F, ic, lx + 86, yy + 4, 18, col ? T.t2 : T.t4, 1.8);
    r += text(lx + 114, yy + 13, title, { size: 13, weight: 500, fill: col ? T.t1 : T.t3 }) + text(lx + 114, yy + 29, src, { size: 11.5, fill: T.t4 });
    const c = chip(F, 0, 0, tag, { size: 11, h: 22, color: col ? T.ice : T.t3, bgo: col ? 0.12 : 0.06, weight: col ? 600 : 500 });
    r += chip(F, lx + lw - 22 - c.w, yy + 4, tag, { size: 11, h: 22, color: col ? T.ice : T.t3, bgo: col ? 0.12 : 0.06, weight: col ? 600 : 500 }).svg;
    if (i < rows.length - 1) r += hair(lx + 22, yy + rh - 6, lx + lw - 22, { so: 0.05 });
    st += g(F, 'Alarm ' + t + ' ' + title, r);
  });
  s += card(F, 'Raw alarm stream', lx, y, lw, y1 - y, { icon: 'wave', title: 'Raw alarm stream', meta: '52 / min' }, st);

  // ---- centre: correlated incidents table ----
  const cx = 556, cw = 860;
  const cols = [['Incident', 22], ['Location', 330], ['Signals', 548], ['Confidence', 630], ['Age', 790]];
  let tb = '';
  cols.forEach(([h, dx]) => { tb += overline(cx + dx, y + 76, h); });
  tb += hair(cx + 22, y + 90, cx + cw - 22);
  INCIDENTS.forEach((inc, i) => {
    const yy = y + 92 + i * 58, sel = i === 0, col = SEV[inc.sev];
    let r = '';
    if (sel) r += rect(cx + 10, yy + 3, cw - 20, 52, { r: 12, fill: T.blue, fo: 0.1, stroke: T.blue, so: 0.5 });
    r += rect(cx + 22, yy + 17, 24, 24, { r: 7, fill: col, fo: 0.15 }) + icon(F, inc.icon, cx + 26, yy + 21, 16, col, 2);
    r += text(cx + 56, yy + 26, inc.short, { size: 13.5, weight: 600, fill: T.t1 }) + rich(cx + 56, yy + 44, [{ t: inc.sev, fill: col, weight: 600 }, { t: '  ·  ' + inc.id, fill: T.t3 }], { size: 11.5 });
    r += text(cx + 330, yy + 34, inc.loc.length > 30 ? inc.loc.slice(0, 29) + '…' : inc.loc, { size: 12.5, fill: T.t2 });
    r += icon(F, 'link', cx + 548, yy + 21, 16, T.t3, 1.8) + text(cx + 570, yy + 34, String(inc.signals), { size: 13, weight: 600, fill: T.t1 });
    r += progress(F, cx + 630, yy + 27, 90, inc.conf / 100, col, 5) + text(cx + 730, yy + 34, inc.conf + '%', { size: 12.5, weight: 600, fill: T.t1 });
    r += text(cx + 790, yy + 34, inc.ago, { size: 12.5, fill: T.t3 });
    if (i < INCIDENTS.length - 1 && !sel) r += hair(cx + 22, yy + 57, cx + cw - 22, { so: 0.05 });
    tb += g(F, 'Row ' + inc.id, r);
  });
  const th = 92 + 7 * 58 + 18;
  s += card(F, 'Correlated incidents', cx, y, cw, th, { icon: 'layers', title: 'Correlated incidents', count: 7, meta: 'Sorted by priority' }, tb);
  // noise breakdown (single-hue horizontal bars, sorted)
  const ny = y + th + 16, nh = y1 - ny;
  let nb = '';
  const reasons = [['Duplicate of an open alarm', 612], ['Weather / wildlife (fence, LiDAR-checked)', 318], ['Known pattern (e.g. cleaning cart)', 154], ['Planned maintenance window', 100]];
  const maxV = 612, bx = cx + 330, bw = cw - 330 - 90;
  reasons.forEach(([lab, v], i) => {
    const yy = ny + 66 + i * 34;
    nb += text(cx + 22, yy + 12, lab, { size: 13, fill: T.t2 }) + rect(bx, yy, bw * v / maxV, 14, { r: 4, fill: T.ice, fo: 0.75 }) + text(bx + bw * v / maxV + 10, yy + 12, v.toLocaleString('en-US'), { size: 12.5, weight: 600, fill: T.t1 });
  });
  s += card(F, 'Noise absorbed', cx, ny, cw, nh, { icon: 'filter', title: 'Why 1,184 alarms were closed', meta: 'Every closure is logged and reversible' }, nb);

  // ---- right: correlation graph for selected incident ----
  const rx = 1440, rw = 456;
  let gr = '';
  const gcx = rx + rw / 2, gcy = y + 250, R = 142;
  const nodes = [
    ['key', 'Badge granted', 'Access control', T.ok, 'same door'],
    ['door', 'Door opened', 'Door sensor', T.blue, '+2 s'],
    ['radar', '2 people / 1 badge', 'LiDAR', T.crit, 'same door'],
    ['video', 'Tailgating', 'CAM 3-118', T.crit, 'same track'],
    ['clock', 'Held open 9 s', 'Door sensor', T.high, '+11 s'],
  ];
  nodes.forEach(([ic, lab, src, col, edge], i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / nodes.length;
    const nx = gcx + R * Math.cos(a), ny2 = gcy + R * Math.sin(a) * 0.86;
    gr += line(gcx, gcy, nx, ny2, { stroke: '#FFFFFF', so: 0.16, sw: 1.5 });
    const mx = (gcx + nx) / 2, my = (gcy + ny2) / 2, ew = textWidth(edge, 10.5, 600) + 14;
    gr += rect(mx - ew / 2, my - 10, ew, 20, { r: 10, fill: '#0A0F1A', stroke: '#FFFFFF', so: 0.12 }) + text(mx, my + 4, edge, { size: 10.5, weight: 600, fill: T.t2, anchor: 'middle' });
    gr += circle(nx, ny2, 22, { fill: '#0A0F1A', stroke: col, sw: 1.5 }) + circle(nx, ny2, 22, { fill: col, fo: 0.12 }) + icon(F, ic, nx - 10, ny2 - 10, 20, col, 1.9);
    const below = Math.sin(a) > -0.2;
    const ly = below ? ny2 + 40 : ny2 - 46;
    gr += text(nx, ly, lab, { size: 12.5, weight: 600, fill: T.t1, anchor: 'middle' }) + text(nx, ly + 16, src, { size: 11, fill: T.t3, anchor: 'middle' });
  });
  gr += circle(gcx, gcy, 44, { fill: T.crit, fo: 0.12, filter: F.blur(10) }) + circle(gcx, gcy, 36, { fill: '#0A0F1A', stroke: T.crit, sw: 2 }) + icon(F, 'door', gcx - 13, gcy - 19, 26, T.crit, 2) + text(gcx, gcy + 22, 'INC-2417', { size: 10.5, weight: 700, fill: T.t1, anchor: 'middle' });
  // keys
  const ky = y + 470;
  gr += overline(rx + 22, ky, 'Correlated on');
  [['clock', 'Time', 'All within 11 s'], ['pin', 'Place', 'Door D-214 + corridor L2-East'], ['user', 'Person', 'One video track across 2 cameras'], ['idcard', 'Credential', 'Badge B-55821']].forEach(([ic, k, v], i) => {
    const yy = ky + 22 + i * 40;
    gr += rect(rx + 22, yy, 30, 30, { r: 9, fill: T.blue, fo: 0.12 }) + icon(F, ic, rx + 29, yy + 7, 16, T.blue, 1.9);
    gr += text(rx + 64, yy + 13, k, { size: 12, weight: 600, fill: T.t1 }) + text(rx + 64, yy + 28, v, { size: 12, fill: T.t3 });
  });
  gr += button(F, rx + 22, y1 - 66, rw - 44, 44, 'Open incident INC-2417', { kind: 'primary', icon: 'chevR' });
  s += card(F, 'Correlation graph', rx, y, rw, y1 - y, { ai: true, title: 'Why these belong together', meta: '5 alarms → 1' }, gr);
  return F.render(s);
}
