import { Frame, T, SEV, f, rect, circle, line, pathEl, text, rich, icon, g, textWidth } from '../lib/svg.mjs';
import { L, backdrop, shell, pageHeader, surface, card, chip, chips, seg, button, overline, hair, vhair, aiMark, aiGrad, progress } from '../lib/ui.mjs';
import { smallSite } from '../lib/twin.mjs';

export default function federation() {
  const F = new Frame('15 · Sites — Federated architecture');
  let s = backdrop(F) + shell(F, { active: 6 });
  const sg = seg(F, 0, 0, ['Map', 'List'], 0);
  s += pageHeader(F, 'Sites', 'Federated · 7 sites · 7,890 devices', { right: seg(F, 1240 - sg.w, L.y0 + 8, ['Map', 'List'], 0).svg });
  const mx = L.x0, my = 150, mw = 1128, mh = L.y1 - my;
  let m = '';
  const cx = mx + mw / 2, cy = my + 420;
  const sites = [
    { n: 'Main airport', sub: 'T1–T5 · 4,812 devices', inc: 7, st: 'ok', x: mx + 40, y: my + 70, lat: '4 ms' },
    { n: 'Cargo complex', sub: '1,204 devices', inc: 0, st: 'ok', x: mx + mw / 2 - 130, y: my + 40, lat: '6 ms' },
    { n: 'Maintenance base', sub: '640 devices', inc: 0, st: 'ok', x: mx + mw - 300, y: my + 70, lat: '7 ms' },
    { n: 'Fuel farm (off-site)', sub: '212 devices', inc: 0, st: 'ok', x: mx + mw - 290, y: my + 380, lat: '11 ms' },
    { n: 'Regional airfield', sub: 'Small site · 186 devices', inc: 1, st: 'warn', x: mx + mw - 320, y: my + 640, lat: 'WAN degraded · on 4G' },
    { n: 'Remote radar station', sub: '48 devices', inc: 0, st: 'ok', x: mx + 60, y: my + 640, lat: '18 ms' },
    { n: 'Backup SOC (DR)', sub: 'Hot standby', inc: 0, st: 'ok', x: mx + 40, y: my + 380, lat: 'In sync' },
  ];
  const cwid = 260, chh = 96;
  sites.forEach(si => {
    const scx = si.x + cwid / 2, scy = si.y + chh / 2, warn = si.st === 'warn';
    m += line(cx, cy, scx, scy, { stroke: warn ? T.high : T.blue, so: warn ? 0.8 : 0.35, sw: warn ? 1.6 : 1.2, dash: warn ? '6 5' : undefined });
    const lx = (cx + scx) / 2, ly = (cy + scy) / 2, lw = textWidth(si.lat, 11, 600) + 16;
    m += rect(lx - lw / 2, ly - 11, lw, 22, { r: 11, fill: '#0A0F1A', stroke: warn ? T.high : '#FFFFFF', so: warn ? 0.6 : 0.12 }) + text(lx, ly + 4, si.lat, { size: 11, weight: 600, fill: warn ? T.high : T.t2, anchor: 'middle' });
  });
  sites.forEach(si => {
    const warn = si.st === 'warn', sel = warn;
    let c = rect(si.x, si.y, cwid, chh, { r: 16, fill: sel ? '#15233F' : '#0E1626', stroke: sel ? T.high : '#FFFFFF', so: sel ? 0.8 : 0.1, sw: sel ? 1.5 : 1 });
    c += rect(si.x + 16, si.y + 18, 36, 36, { r: 10, fill: warn ? T.high : T.blue, fo: 0.14 }) + icon(F, warn ? 'plane' : si.n.startsWith('Backup') ? 'server' : si.n.startsWith('Remote') ? 'radar' : 'building', si.x + 24, si.y + 26, 20, warn ? T.high : T.blue, 1.8);
    c += text(si.x + 64, si.y + 34, si.n, { size: 14, weight: 600, fill: T.t1 }) + text(si.x + 64, si.y + 52, si.sub, { size: 12, fill: T.t3 });
    c += rich(si.x + 16, si.y + 80, [{ t: '● ', fill: warn ? T.high : T.ok }, { t: warn ? 'Edge autonomous' : 'Online', fill: warn ? T.high : T.t2, weight: 600 }], { size: 11.5 });
    c += text(si.x + cwid - 16, si.y + 80, si.inc ? si.inc + ' open incident' + (si.inc > 1 ? 's' : '') : 'No open incidents', { size: 11.5, weight: si.inc ? 600 : 400, fill: si.inc ? T.t1 : T.t3, anchor: 'end' });
    m += g(F, 'Site ' + si.n, c);
  });
  // central node
  const nw = 260, nh = 132;
  let cn = rect(cx - nw / 2 - 30, cy - nh / 2 - 30, nw + 60, nh + 60, { r: 40, fill: T.blue, fo: 0.08, filter: F.blur(18) });
  cn += rect(cx - nw / 2, cy - nh / 2, nw, nh, { r: 22, fill: '#101A30' }) + rect(cx - nw / 2, cy - nh / 2, nw, nh, { r: 22, stroke: aiGrad(F), sw: 1.5, so: 0.8 });
  cn += aiMark(F, cx - nw / 2 + 18, cy - nh / 2 + 18, 32) + text(cx - nw / 2 + 62, cy - nh / 2 + 32, 'Central SOC', { size: 16, weight: 600, fill: T.t1 }) + text(cx - nw / 2 + 62, cy - nh / 2 + 50, 'ISMS core · you are here', { size: 12, fill: T.t3 });
  cn += chips(F, cx - nw / 2 + 18, cy + 14, [{ label: 'Correlation', color: T.ice }, { label: 'Co-pilot', color: T.violet }, { label: 'Twin', color: T.teal }].map(c => ({ ...c, h: 24, size: 11.5, bgo: 0.12 })), 6).svg;
  m += g(F, 'Central SOC node', cn);
  // policy strip
  const py = my + mh - 70;
  m += hair(mx + 24, py - 16, mx + mw - 24);
  [['video', 'Video stays on site', 'Clips pulled on demand'], ['swap', 'Events & incidents replicate', 'Metadata only, < 2 s'], ['cpu', 'Each site runs on its own', 'Edge keeps detecting if the link drops'], ['lock', 'Role-based access per site', 'Local guards see only their site']].forEach(([ic, a, b], i) => {
    const xx = mx + 24 + i * (mw - 48) / 4;
    m += rect(xx, py, 34, 34, { r: 10, fill: T.blue, fo: 0.12 }) + icon(F, ic, xx + 8, py + 8, 18, T.blue, 1.9) + text(xx + 46, py + 14, a, { size: 13, weight: 600, fill: T.t1 }) + text(xx + 46, py + 31, b, { size: 11.5, fill: T.t3 });
  });
  s += card(F, 'Federation map', mx, my, mw, mh, {}, m);

  // right: small site detail
  const rx = 1264, rw = L.x1 - rx;
  let r = text(rx + 22, my + 36, 'Regional airfield', { size: 16, weight: 600, fill: T.t1 }) + text(rx + 22, my + 56, 'Small site · 3D twin (lite) · ISMS-Edge-02', { size: 12.5, fill: T.t3 });
  r += chip(F, rx + rw - 22 - 150, my + 22, 'Edge autonomous', { color: T.high, dot: true }).svg;
  const tw = smallSite(F, rx + 12, my + 60, rw - 24, 320, { pins: [{ id: 'INC-2419', X: 59, Y: 12, sev: 'Medium', icon: 'fence', label: 'Fence alarm · LiDAR checking', sub: 'Handled on edge', selected: true, left: true, h: 5 }] });
  r += tw.svg;
  const sy = my + 392;
  const stats = [['Devices', '186'], ['Cameras', '42'], ['AGIL Fence', '6.2 km'], ['LiDAR', '4 units'], ['Local storage', '21 days'], ['Edge load', '34%']];
  stats.forEach(([k, v], i) => {
    const xx = rx + 22 + (i % 3) * ((rw - 44) / 3), yy = sy + Math.floor(i / 3) * 58;
    r += overline(xx, yy + 14, k) + text(xx, yy + 40, v, { size: 20, weight: 600, fill: T.t1 });
  });
  r += hair(rx + 22, sy + 128, rx + rw - 22);
  r += text(rx + 22, sy + 160, 'While the link is degraded', { size: 14, weight: 600, fill: T.t1 });
  [['check', T.ok, 'Detection and correlation run on the edge node'], ['check', T.ok, 'Critical alerts reach Central SOC over 4G backup'], ['clock', T.high, '1,422 events buffered · sync when link recovers'], ['sparkle', T.violet, 'Co-pilot answers from last sync (4 min old)']].forEach(([ic, col, t], i) => {
    const yy = sy + 180 + i * 34;
    r += circle(rx + 33, yy + 11, 11, { fill: col, fo: 0.14 }) + icon(F, ic, rx + 25, yy + 3, 16, col, 2) + text(rx + 54, yy + 16, t, { size: 13, fill: T.t1 });
  });
  const by2 = sy + 330;
  r += hair(rx + 22, by2 - 18, rx + rw - 22);
  r += text(rx + 22, by2 + 8, 'Edge buffer', { size: 13, weight: 600, fill: T.t1 }) + text(rx + rw - 22, by2 + 8, '1,422 of 50,000 events · last sync 02:12', { size: 12, fill: T.t3, anchor: 'end' });
  r += progress(F, rx + 22, by2 + 22, rw - 44, 0.03, T.high, 6);
  r += button(F, rx + 22, L.y1 - 66, (rw - 54) / 2, 44, 'Open site twin', { kind: 'primary', size: 14, icon: 'cube' }) + button(F, rx + 32 + (rw - 54) / 2, L.y1 - 66, (rw - 54) / 2, 44, 'Call site guard', { kind: 'secondary', size: 14, icon: 'phone' });
  s += card(F, 'Small site detail', rx, my, rw, mh, { accent: T.high, accentO: 0.3 }, r);
  return F.render(s);
}
