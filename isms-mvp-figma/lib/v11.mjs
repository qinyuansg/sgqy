// Component kit that reproduces the current V11 dark UI (Roboto, 1400×1069 frames),
// measured from the team's Figma export. New demo content is expressed with these
// existing components; the few deltas are marked "NEW" in layer names.
import fs from 'fs';
import path from 'path';
import { T, f, esc, textWidth, wrap, rect, circle, line, pathEl, poly, text, rich, icon, image, g } from './svg.mjs';

export const C = {
  frame: '#020303', panel: '#1D232C', body: '#394150', tabBody: '#4F545E', field: '#383D47', fieldStroke: '#3D3D3D',
  t1: '#DDE1E8', t2: '#9BA1AC', t3: '#BDBDBD', white: '#FFFFFF',
  crit: '#D72D30', warn: '#D4B741', info: '#4DAFBE', red: '#A61B1B', redCreate: '#AC1E1E', blue: '#1B55A6', tabOn: '#1B47A6', tabOff: '#1C2E55',
  link: '#3EA9FF', orange: '#FF5500', green: '#44AC0C', online: '#3AEA30', selCard: '#454545', devRow: '#2C3036',
  search: '#4E4E4E', locSeg: '#262626', sopGold: '#A19379', sopBrown: '#6A423B', stepNum: '#739DDE', open: '#8D2729', closed: '#525252',
  copilot: '#B69CFF', // the only new colour token: marks Co-pilot (AI) content
};
export const SEVC = { Critical: C.crit, Warning: C.warn, Info: C.info };
export const W = 1400, H = 1069;

let ASSETS = null;
const cache = {};
export function useAssets(dir) { ASSETS = dir; asset.dir = dir; }
export function asset(name, mime) {
  if (!cache[name]) cache[name] = `data:${mime || (name.endsWith('.png') ? 'image/png' : 'image/jpeg')};base64,` + fs.readFileSync(path.join(ASSETS, name)).toString('base64');
  return cache[name];
}

// ---------- header ----------
export function header(F, o = {}) {
  let s = image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  // Emergency Lockdown
  let e = rect(119, 40, 257, 46, { r: 8, fill: C.red });
  e += poly([[147, 51], [158, 62], [147, 73], [136, 62]], { fill: '#FFFFFF' }) + rect(145.8, 55.5, 2.4, 9, { fill: C.red }) + rect(145.8, 66.5, 2.4, 2.6, { fill: C.red });
  e += text(163, 70, 'Emergency Lockdown', { size: 20, weight: 700, fill: '#FFFFFF' });
  s += g(F, 'Button Emergency Lockdown', e);
  // location + search
  const loc = o.loc || ['Main Airport', 'T3'];
  let b = rect(440, 43, 655, 40, { r: 8, fill: C.search });
  b += rect(440, 43, 209, 40, { r: 8, fill: C.locSeg }) + rect(640, 43, 9, 40, { fill: C.locSeg });
  const w0 = textWidth(loc[0], 16, 500);
  b += text(450, 69, loc[0], { size: 16, weight: 500, fill: '#FFFFFF' }) + text(450 + w0 + 7, 68, '›', { size: 14, fill: C.t3 }) + text(450 + w0 + 22, 69, loc[1], { size: 16, weight: 500, fill: '#FFFFFF' });
  b += poly([[627, 60], [637, 60], [632, 66]], { fill: '#FFFFFF' });
  if (o.query) {
    b += rect(649, 43, 446, 40, { r: 8, fill: '#3A3F48', stroke: C.copilot, sw: 1.5 });
    b += icon(F, 'sparkle', 660, 53, 20, C.copilot, 2) + text(689, 69, o.query, { size: 16, fill: '#FFFFFF' });
  } else {
    b += icon(F, 'search', 660, 53, 20, C.t1, 2) + text(689, 69, o.placeholder || 'Search or ask Co-pilot…', { size: 16, fill: C.t3 });
  }
  s += g(F, o.query ? 'Search bar (Co-pilot query) NEW' : 'Search bar', b);
  // Incident Management
  s += g(F, 'Button Incident Management', rect(1103.5, 40.5, 256, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'extLink', 1121, 51, 22, '#FFFFFF', 2) + text(1150, 70, 'Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  return g(F, 'Header', s);
}
export function modelToggle(F) {
  return g(F, '2D 3D toggle', rect(1054, 127, 118, 40, { r: 8, fill: C.tabOn }) + rect(1164, 127, 8, 40, { fill: C.tabOn }) + rect(1172, 127, 118, 40, { r: 8, fill: C.tabOff }) + rect(1172, 127, 8, 40, { fill: C.tabOff }) +
    text(1113, 154, '2D Model', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }) + text(1231, 154, '3D Model', { size: 20, weight: 700, fill: '#8494B8', anchor: 'middle' }) +
    rect(1310, 127, 50, 46, { r: 8, fill: '#1B47A5' }) + icon(F, 'layers', 1322, 138, 26, '#FFFFFF', 1.8));
}

// ---------- chips / badges ----------
export function pill(F, x, y, label, fill, o = {}) {
  const size = o.size || 14, w = textWidth(label, size, 500) + (o.pad ?? 16), h = o.h || 20;
  return { svg: g(F, 'Badge ' + label, rect(x, y, w, h, { r: o.r ?? 8, fill }) + text(x + w / 2, y + h / 2 + size * 0.36, label, { size, weight: 500, fill: o.tc || '#FFFFFF', anchor: 'middle' })), w };
}

// ---------- Real Time Alerts panel ----------
export function alertCard(F, x, y, w, c) {
  const col = SEVC[c.sev];
  const tl = wrap(c.title, w - 120, 20, 400).slice(0, 2);
  const dl = wrap(c.desc, w - 36, 16, 400).slice(0, c.descLines || 2);
  let h = 35 + (tl.length - 1) * 24 + 27 + (dl.length - 1) * 22 + (c.ai ? 26 : 0) + 25 + 24;
  let s = '';
  if (c.selected) s += rect(x, y, w, h, { fill: C.selCard });
  s += rect(x, y, 4, h, { fill: col });
  tl.forEach((l, i) => { s += text(x + 16, y + 35 + i * 24, l, { size: 20, fill: C.t1 }); });
  if (c.time === 'Now' || !c.time) s += pill(F, x + w - 61, y + 18, 'Now', C.crit).svg;
  else s += text(x + w - 16, y + 32, c.time, { size: 14, fill: C.t2, anchor: 'end' });
  let yy = y + 35 + (tl.length - 1) * 24 + 27;
  dl.forEach((l, i) => { s += text(x + 16, yy + i * 22, l, { size: 16, fill: C.t2 }); });
  yy += (dl.length - 1) * 22;
  if (c.ai) {
    yy += 26;
    s += g(F, 'Co-pilot line NEW', icon(F, 'sparkle', x + 16, yy - 13, 16, C.copilot, 2) + text(x + 38, yy, c.ai, { size: 14, weight: 500, fill: C.copilot }));
  }
  yy += 25;
  s += icon(F, 'target', x + 16, yy - 14, 18, C.link, 1.8) + text(x + 39, yy, 'Locate', { size: 16, fill: C.link });
  s += icon(F, 'arrowUR', x + 185, yy - 13, 16, C.orange, 2) + text(x + 208, yy, 'Escalate', { size: 16, fill: C.orange });
  s += line(x, y + h, x + w, y + h, { stroke: '#2C3036', sw: 1 });
  return { svg: g(F, 'Alert card ' + c.title, s), h };
}
export function alertsPanel(F, o) {
  const x = 40, y = 118, w = 336, h = o.h || 629;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });
  // severity counters
  const cs = o.counts || [['1 Critical', C.crit], ['4 Warnings', C.warn], ['8 Info', C.info]];
  const ws = cs.map(([t]) => textWidth(t, 14, 500) + 16), tot = ws.reduce((a, b) => a + b, 0) + 8 * (cs.length - 1);
  let cx = x + (w - tot) / 2;
  cs.forEach(([t, col], i) => { s += pill(F, cx, 134, t, col).svg; cx += ws[i] + 8; });
  s += text(56, 204, 'Real Time Alerts', { size: 20, weight: 700, fill: '#FFFFFF' });
  s += icon(F, 'pin', 54, 214, 20, C.green, 2.2) + text(81, 231, o.cluster || 'Terminal 3', { size: 20, weight: 500, fill: C.green, underline: true });
  const tabs = o.tabs || ['All', 'Open', 'On Hold'];
  let tx = 60;
  tabs.forEach((t, i) => { s += text(tx, 280, t, { size: 16, weight: i === 0 ? 500 : 400, fill: i === 0 ? C.link : C.t2 }); tx += textWidth(t, 16, 500) + 18; });
  // scroll so the selected card is visible (first or second in view)
  const sel = o.cards.findIndex(c => c.selected), start = Math.max(0, sel - 1);
  let cy = 296, cards = '';
  for (const c of o.cards.slice(start)) { if (cy > y + h - 40) break; const r = alertCard(F, x, cy, w, c); cards += r.svg; cy += r.h; }
  s += `<g clip-path="${clip}">${cards}</g>`;
  const n = o.cards.length, track = h - 190, th = track * Math.min(1, 3.2 / n), ty = 300 + (track - th) * (start / Math.max(1, n - 3));
  s += rect(x + w - 6, ty, 3, th, { r: 1.5, fill: '#FFFFFF', fo: 0.25 });
  return g(F, 'Real Time Alerts', s);
}
export function deviceStatus(F, o = {}) {
  const clip = F.clip(`<rect x="40" y="920" width="336" height="109" rx="16"/>`);
  let s = rect(40, 920, 336, 109, { r: 16, fill: C.panel, fo: 0.79 }) + text(60, 958, 'Device Status', { size: 20, weight: 700, fill: '#FFFFFF' });
  s += `<g clip-path="${clip}">${rect(40, 983, 168, 46, { fill: C.devRow }) + rect(208, 983, 168, 46, { fill: C.devRow })}</g>`;
  s += circle(56, 1006, 7, { fill: C.online }) + text(71, 1013, 'Online', { size: 20, fill: C.t2 }) + text(137, 1013, String(o.online ?? 342), { size: 20, weight: 700, fill: '#FFFFFF' });
  s += circle(223, 1006, 7, { fill: C.crit }) + text(239, 1013, 'Offline', { size: 20, fill: C.t2 }) + text(307, 1013, String(o.offline ?? 8), { size: 20, weight: 700, fill: '#FFFFFF' });
  return g(F, 'Device Status', s);
}

// ---------- camera tiles (same 1 big + 2 small grid) ----------
// img: {href, focus:[fx,fy] 0..1 in 1280×720 space, box:[x,y,w,h] in 1280×720, boxCol, boxLabel}
export function camTile(F, x, y, w, h, cam) {
  const [sw0, sh0] = cam.dims || [1280, 720];
  const sc = Math.max(w / sw0, h / sh0) * (cam.zoom || 1), iw = sw0 * sc, ih = sh0 * sc;
  const [fx, fy] = cam.focus || [0.5, 0.5];
  let ox = x + w / 2 - fx * iw, oy = y + h / 2 - fy * ih;
  ox = Math.min(x, Math.max(x + w - iw, ox)); oy = Math.min(y, Math.max(y + h - ih, oy));
  const clip = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`);
  let inner = `<image x="${f(ox)}" y="${f(oy)}" width="${f(iw)}" height="${f(ih)}" preserveAspectRatio="none" href="${cam.href}" xlink:href="${cam.href}"/>`;
  if (cam.box) {
    const [bx, by, bw, bh] = cam.box;
    const X = ox + bx * sc, Y = oy + by * sc, col = cam.boxCol || C.crit;
    inner += g(F, 'BBox NEW', rect(X, Y, bw * sc, bh * sc, { r: 3, stroke: col, sw: 2 }) + (cam.boxLabel ? rect(X, Y + bh * sc + 3, textWidth(cam.boxLabel, 11, 500) + 10, 18, { r: 3, fill: col }) + text(X + 5, Y + bh * sc + 16, cam.boxLabel, { size: 11, weight: 500, fill: '#FFFFFF' }) : ''));
  }
  inner += rect(x, y, w, 31, { fill: '#000000', fo: 0.2 }) + rect(x, y, w, 31, { fill: C.panel, fo: 0.65 });
  inner += icon(F, 'cctv', x + 10, y + 7, 17, '#FFFFFF', 1.7) + text(x + 31, y + 20, cam.label, { size: 12, weight: 500, fill: '#FFFFFF' });
  return g(F, 'Camera ' + cam.label, `<g clip-path="${clip}">${inner}</g>`);
}

// ---------- Active Alarms panel ----------
export function metaRow(F, x, y, ev) {
  let s = icon(F, 'clock', x, y - 14, 17, C.t2, 1.8) + text(x + 24, y, ev.time, { size: 16, fill: C.t1 });
  let cx = x + 24 + textWidth(ev.time, 16) + 18;
  s += text(cx, y, 'ID:', { size: 16, fill: C.t2 }); cx += textWidth('ID:', 16) + 8;
  s += text(cx, y, ev.id, { size: 16, fill: C.t1 }); cx += textWidth(ev.id, 16) + 18;
  s += text(cx, y, 'Code:', { size: 16, fill: C.t2 }); cx += textWidth('Code:', 16) + 8;
  s += text(cx, y, ev.code, { size: 16, fill: C.t1 });
  return s;
}
export function eventHead(F, x, y, w, ev) {
  let s = metaRow(F, x, y, ev);
  s += text(x, y + 32, ev.title, { size: 20, weight: 500, fill: C.t1 });
  s += pill(F, x + w - 45, y + 15, ev.badge || 'Now', C.crit).svg;
  (ev.lines || []).forEach((runs, i) => { s += rich(x, y + 59 + i * 22, runs.map(r => typeof r === 'string' ? { t: r, fill: C.t2 } : { t: r.b, fill: '#FFFFFF', weight: 500 }), { size: 16 }); });
  return s;
}
export function activeAlarms(F, o) {
  const x = 900, y = 125, w = 460, h = 904;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });
  s += `<g clip-path="${clip}">${rect(x, 161.8, w, 868, { fill: C.body, fo: 0.8 })}</g>`;
  s += text(916, 149, o.panelTitle || 'Active Alarms', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 1323, 132, 22, '#FFFFFF', 2.2);
  s += eventHead(F, 916, 194, 428, o.ev);
  // cameras
  const cams = o.cams;
  s += camTile(F, 916, 296, 210, 248, cams[0]) + camTile(F, 1134, 296, 210, 120, cams[1]) + camTile(F, 1134, 424, 210, 120, cams[2]);
  // tabs
  const ti = o.tab || 0;
  s += g(F, 'Tabs', rect(916, 560, 214, 40, { fill: ti === 0 ? C.tabOn : C.tabOff }) + rect(1130, 560, 214, 40, { fill: ti === 1 ? C.tabOn : C.tabOff }) +
    text(1023, 587, 'Investigation', { size: 18, weight: 700, fill: ti === 0 ? '#FFFFFF' : '#8E9CC0', anchor: 'middle' }) + text(1237, 587, 'SOP Flow', { size: 18, weight: 700, fill: ti === 1 ? '#FFFFFF' : '#8E9CC0', anchor: 'middle' }));
  const bodyH = o.bodyH || 350;
  s += rect(916, 600, 428, bodyH, { fill: C.tabBody });
  const bclip = F.clip(`<rect x="916" y="600" width="428" height="${bodyH}"/>`);
  const body = o.body(F, 916, 600, 428, bodyH);
  const content = typeof body === 'string' ? { svg: body, h: 0 } : body;
  s += g(F, ti === 0 ? 'Investigation tab' : 'SOP Flow tab', `<g clip-path="${bclip}">${content.svg}</g>`);
  if (content.h > bodyH) { // scrollable tab content (same behaviour as today's tab body)
    const th = bodyH * bodyH / content.h;
    s += rect(1338, 604, 3, th - 8, { r: 1.5, fill: '#FFFFFF', fo: 0.35 }) + rect(916, 600 + bodyH - 28, 428, 28, { fill: F.lin([[0, C.tabBody, 0], [1, C.tabBody, 1]], 0, 0, 0, 1) });
  }
  // footer buttons
  s += g(F, 'Footer buttons',
    rect(916.5, 966.5, 71, 43, { r: 7.5, stroke: '#717171' }) + text(952, 995, 'Clear', { size: 20, weight: 500, fill: C.t3, anchor: 'middle' }) +
    rect(1004, 966, 166, 44, { r: 8, fill: C.red }) + icon(F, 'bell', 1032, 977, 22, '#FFFFFF', 2) + text(1064, 995, 'Escalate', { size: 20, weight: 700, fill: '#FFFFFF' }) +
    rect(1178, 966, 166, 44, { r: 8, fill: C.blue }) + text(1261, 995, o.ackLabel || 'Acknowledge', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  return g(F, 'Active Alarms', s);
}

// ---------- Investigation tab content ----------
// entries: [{who, time, col, text (string) | rows: [[t, label, src]], italic}]
export function timeline(F, x, y, w, entries, o = {}) {
  let s = '', cy = y;
  for (const e of entries) {
    const col = e.col || '#2E8BFF';
    s += circle(x + 8, cy + 8, 8, { fill: col });
    if (e.who === 'Co-pilot') s += icon(F, 'sparkle', x + 2, cy + 2, 12, '#FFFFFF', 2.2);
    s += text(x + 24, cy + 14, e.who, { size: 16, weight: e.who === 'Co-pilot' ? 500 : 400, fill: e.who === 'Co-pilot' ? C.copilot : '#FFFFFF' });
    if (e.tag) { const tw = textWidth(e.tag, 12, 500) + 12; s += rect(x + 32 + textWidth(e.who, 16, 500), cy + 1, tw, 18, { r: 6, fill: C.copilot, fo: 0.22 }) + text(x + 38 + textWidth(e.who, 16, 500), cy + 14, e.tag, { size: 12, weight: 500, fill: C.copilot }); }
    s += text(x + w, cy + 14, e.time, { size: 14, fill: C.t3, anchor: 'end' });
    let by = cy + 36, bh = 0;
    if (e.text) {
      const ls = wrap(e.text, w - 26, e.size || 14, e.weight || 400);
      ls.forEach((l, i) => { s += text(x + 24, by + i * (e.lh || 20), l, { size: e.size || 14, weight: e.weight || 400, fill: e.fill || C.t1, italic: e.italic }); });
      bh = ls.length * (e.lh || 20);
    }
    if (e.rows) {
      const ry = by + (bh ? bh + 2 : -4);
      e.rows.forEach(([t, lab, src, rc], i) => {
        const yy = ry + i * 21;
        s += text(x + 24, yy, t, { size: 13, fill: C.t3 }) + circle(x + 92, yy - 4, 3.5, { fill: rc || C.t3 }) + text(x + 102, yy, lab, { size: 13, weight: 500, fill: '#FFFFFF' });
        if (src) s += text(x + w, yy, src, { size: 12, fill: C.t3, anchor: 'end' });
      });
      bh += e.rows.length * 21 + (bh ? 2 : -4);
    }
    if (e.more) { s += text(x + 24, by + bh + 2, e.more, { size: 13, weight: 500, fill: C.link }); bh += 21; }
    s += rect(x + 7.5, cy + 22, 1, bh + 4, { fill: C.t3 });
    cy = by + bh + (o.gap ?? 12);
  }
  return { svg: g(F, o.name || 'Timeline', s), h: cy - y };
}
export function remarksBox(F, x, y, w, o = {}) {
  return g(F, 'Remarks', text(x, y + 14, 'Remarks', { size: 16, fill: C.t1 }) + rect(x, y + 24, w, o.h || 56, { r: 8, fill: C.field, stroke: C.fieldStroke }) + text(x + 10, y + 46, o.ph || 'Add investigation note…', { size: 15, fill: '#80858F' }) +
    rect(x + w - 193, y + 24 + (o.h || 56) + 10, 193, 40, { r: 8, fill: '#000000' }) + text(x + w - 96.5, y + 24 + (o.h || 56) + 37, 'Add', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
}

// ---------- SOP Flow tab content ----------
// steps: [{title, text, state: 'done'|'todo'|'critical', tag, items:[[label, checked]], actions:[[label, kind]]}]
const BTN = { blue: '#1F4FBF', red: '#A61B1B', green: '#43A517', grey: '#5A606B' };
export function sopFlow(F, x, y, w, steps, o = {}) {
  let s = '', cy = y;
  if (o.caption) { s += icon(F, 'sparkle', x + 16, cy + 7, 14, C.copilot, 2) + text(x + 36, cy + 19, o.caption, { size: 12.5, weight: 500, fill: C.copilot }); cy += 30; }
  steps.forEach((st, i) => {
    const crit = st.state === 'critical', done = st.state === 'done';
    const tl = st.text ? wrap(st.text, w - 60, 12.5, 400) : [];
    const items = st.items || [];
    const bh = 8 + tl.length * 18 + items.length * 22 + (st.actions ? 44 : 0) + 6;
    let r = '';
    if (crit) r += rect(x, cy, w, 32, { fill: C.sopGold });
    r += circle(x + 25, cy + 16, 9, { fill: crit ? '#7A1E14' : C.stepNum, fo: crit ? 0.6 : 1 }) + text(x + 25, cy + 20.5, String(i + 1), { size: 12, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
    r += text(x + 44, cy + 22, st.title, { size: 16, weight: 500, fill: crit ? '#6E1A10' : '#FFFFFF' });
    const cbx = x + w - 30, cby = cy + 8;
    if (done) r += rect(cbx, cby, 16, 16, { r: 3, fill: '#2E8BFF' }) + icon(F, 'check', cbx + 1, cby + 1, 14, '#FFFFFF', 3);
    else r += rect(cbx, cby, 16, 16, { r: 3, fill: '#FFFFFF', fo: 0.9 });
    if (st.tag) {
      const tw = textWidth(st.tag, 11, 500) + 12;
      const tf = crit ? '#6E1A10' : done ? '#2E8BFF' : '#FFFFFF', to = crit ? 0.9 : done ? 0.28 : 0.14, tc = crit ? '#FFFFFF' : done ? '#A9D0FF' : C.t3;
      r += rect(cbx - 10 - tw, cby, tw, 17, { r: 6, fill: tf, fo: to }) + text(cbx - 10 - tw + 6, cby + 12.5, st.tag, { size: 11, weight: 500, fill: tc });
    }
    cy += 32;
    if (crit) r += rect(x, cy, w, bh, { fill: C.sopBrown });
    r += rect(x + 24.5, cy + 3, 1, bh - 8, { fill: crit ? '#D9B8AE' : C.t3, fo: 0.8 });
    let yy = cy + 20;
    for (const l of tl) { r += text(x + 40, yy, l, { size: 12.5, fill: crit ? '#F3DED7' : C.t1 }); yy += 18; }
    for (const [lab, chk] of items) {
      r += circle(x + 48, yy - 4, 7, { fill: chk ? '#2E8BFF' : '#FFFFFF', fo: chk ? 1 : 0.8 }) + (chk ? icon(F, 'check', x + 42, yy - 10, 12, '#FFFFFF', 3) : '');
      r += text(x + 62, yy, lab, { size: 12.5, fill: chk ? C.t3 : C.t1 }); yy += 22;
    }
    if (st.actions) {
      let ax = x + 40; const ay = yy - 8;
      for (const [lab, kind] of st.actions) {
        const bw = textWidth(lab, 15, 700) + 26;
        r += g(F, 'Action ' + lab, rect(ax, ay, bw, 32, { r: 6, fill: BTN[kind] || BTN.grey }) + text(ax + bw / 2, ay + 21.5, lab, { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
        ax += bw + 8;
      }
    }
    s += g(F, 'Step ' + (i + 1) + ' ' + st.title, r);
    cy += bh;
  });
  return { svg: g(F, 'SOP steps', s), h: cy - y };
}

// ---------- scene (starfield + grid + twin) ----------
export function scene(F, inner, o = {}) {
  const clip = F.clip(`<rect x="23" y="136" width="1377" height="725"/>`);
  let s = rect(0, 0, W, H, { fill: C.frame });
  s += `<g clip-path="${clip}">${image(F, 'Starfield', asset('stars.jpg'), 23, 136, 1377, 725)}${inner}${rect(23, 136, 1377, 60, { fill: F.lin([[0, '#020303', 1], [1, '#020303', 0]], 0, 0, 0, 1) })}${rect(23, 801, 1377, 60, { fill: F.lin([[0, '#020303', 0], [1, '#020303', 1]], 0, 0, 0, 1) })}</g>`;
  return g(F, '3D viewer', s);
}
