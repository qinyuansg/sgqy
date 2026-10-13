// UI component library for the ISMS MVP frames. Every component returns an SVG string
// wrapped in a named <g> so it imports into Figma as a tidy, renamable layer.
import fs from 'fs';
import path from 'path';
import { T, SEV, f, esc, textWidth, wrap, rect, circle, line, pathEl, text, rich, para, icon, image, g } from './svg.mjs';

export const L = { rail: 84, top: 68, x0: 112, x1: 1896, y0: 92, y1: 1056 };
export const AI = ['#4D8DFF', '#8A7CFF', '#FF5A9E', '#FFB020'];

// ---------- assets ----------
let CCTV_DIR = null, META = {};
export function useCctv(dir) { CCTV_DIR = dir; META = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); }
const cache = {};
export function img(name) {
  if (!cache[name]) cache[name] = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(CCTV_DIR, name + '.jpg')).toString('base64');
  return cache[name];
}
export const boxes = name => (META[name] || {}).boxes || {};

// ---------- backdrop ----------
export function backdrop(F) {
  return g(F, 'Background', [
    rect(0, 0, F.w, F.h, { fill: T.bg }),
    rect(0, 0, F.w, F.h, { fill: F.rad([[0, '#1B3A8C', 0.32], [1, '#1B3A8C', 0]], 0.18, -0.05, 0.55) }),
    rect(0, 0, F.w, F.h, { fill: F.rad([[0, '#5B3FA8', 0.14], [1, '#5B3FA8', 0]], 0.95, 1.05, 0.5) }),
  ].join(''));
}

// ---------- primitives ----------
export const overline = (x, y, s, o = {}) => text(x, y, s.toUpperCase(), { size: 11, weight: 600, ls: 0.9, fill: o.fill || T.t3, anchor: o.anchor });
export const hair = (x1, y, x2, o = {}) => line(x1, y, x2, y, { stroke: '#FFFFFF', so: o.so ?? 0.07 });
export const vhair = (x, y1, y2, o = {}) => line(x, y1, x, y2, { stroke: '#FFFFFF', so: o.so ?? 0.07 });

export function aiGrad(F, horiz = true) { return F.lin(AI.map((c, i) => [i / (AI.length - 1), c]), 0, 0, horiz ? 1 : 0.6, horiz ? 0 : 1); }
// gradient "intelligence" tile with sparkle
export function aiMark(F, x, y, s = 28, o = {}) {
  return g(F, 'AI mark', rect(x, y, s, s, { r: s * 0.32, fill: aiGrad(F, false) }) + icon(F, 'sparkle', x + s * 0.18, y + s * 0.18, s * 0.64, '#FFFFFF', 1.9));
}
export function avatar(F, cx, cy, r, ini, col = '#3B6BFF', o = {}) {
  return g(F, 'Avatar ' + ini, circle(cx, cy, r, { fill: col }) + (o.ring ? circle(cx, cy, r + 2.5, { stroke: o.ring, sw: 1.5 }) : '') + text(cx, cy + r * 0.36, ini, { size: Math.round(r * 0.82), weight: 600, fill: '#FFFFFF', anchor: 'middle' }));
}
export function keycap(F, x, y, label, o = {}) {
  const w = textWidth(label, 12, 500) + 14;
  return g(F, 'Keycap ' + label, rect(x, y, w, 22, { r: 6, fill: '#FFFFFF', fo: 0.06, stroke: '#FFFFFF', so: 0.12 }) + text(x + 7, y + 15.5, label, { size: 12, weight: 500, fill: T.t2 }));
}

// pill chip; returns {svg,w}
export function chip(F, x, y, label, o = {}) {
  const size = o.size || 12, h = o.h || 24, wt = o.weight || 600, col = o.color || T.t2;
  const ic = o.icon ? size + 6 : 0, dot = o.dot ? 12 : 0;
  const w = Math.round(textWidth(label, size, wt) + 20 + ic + dot);
  const bg = o.bg || col;
  let s = rect(x, y, w, h, { r: h / 2, fill: bg, fo: o.bgo ?? 0.14, stroke: o.stroke, so: o.so });
  let tx = x + 10;
  if (o.dot) { s += circle(tx + 3.5, y + h / 2, 3.5, { fill: col }); tx += 12; }
  if (o.icon) { s += icon(F, o.icon, tx - 1, y + (h - size - 2) / 2, size + 2, col, 1.8); tx += ic; }
  s += text(tx, y + h / 2 + size * 0.36, label, { size, weight: wt, fill: o.tcol || col });
  return { svg: g(F, 'Chip ' + label, s), w };
}
export function sevChip(F, x, y, sev, o = {}) {
  return chip(F, x, y, sev, { color: SEV[sev], dot: true, ...o });
}
// row of chips; returns {svg,w}
export function chips(F, x, y, list, gap = 8) {
  let s = '', cx = x;
  for (const c of list) { const r = typeof c === 'function' ? c(cx) : chip(F, cx, y, c.label, c); s += r.svg; cx += r.w + gap; }
  return { svg: s, w: cx - x - gap };
}

export function button(F, x, y, w, h, label, o = {}) {
  const kind = o.kind || 'secondary', size = o.size || 15;
  let bg, tc = T.t1, extra = '';
  if (kind === 'primary') { bg = F.lin([[0, '#3A6BFF'], [1, '#2D5BFF']], 0, 0, 0, 1); tc = '#FFFFFF'; extra = rect(x, y, w, h, { r: o.r ?? 12, stroke: '#FFFFFF', so: 0.18 }); }
  if (kind === 'ai') { bg = aiGrad(F); tc = '#FFFFFF'; }
  if (kind === 'secondary') bg = null;
  if (kind === 'danger') { bg = null; tc = T.crit; }
  if (kind === 'ghost') { bg = null; tc = T.t2; }
  const iw = o.icon ? 20 + 8 : 0, tw = textWidth(label, size, 600);
  const tx = x + (w - tw - iw) / 2;
  let s = '';
  if (bg) s += rect(x, y, w, h, { r: o.r ?? 12, fill: bg });
  else if (kind !== 'ghost') s += rect(x, y, w, h, { r: o.r ?? 12, fill: kind === 'danger' ? T.crit : '#FFFFFF', fo: kind === 'danger' ? 0.1 : 0.07, stroke: '#FFFFFF', so: 0.1 });
  s += extra;
  if (o.icon) s += icon(F, o.icon, tx, y + h / 2 - 10, 20, tc, 2);
  s += text(tx + iw, y + h / 2 + size * 0.36, label, { size, weight: 600, fill: tc });
  if (o.kbd) s += text(x + w - 14, y + h / 2 + 4.5, o.kbd, { size: 12, weight: 500, fill: tc, fo: 0.55, anchor: 'end' });
  return g(F, 'Button ' + label, s);
}
export function iconBtn(F, x, y, s, name, o = {}) {
  return g(F, 'IconButton ' + name, rect(x, y, s, s, { r: o.r ?? s / 2, fill: '#FFFFFF', fo: o.fo ?? 0.06, stroke: '#FFFFFF', so: 0.08 }) + icon(F, name, x + (s - s * 0.5) / 2, y + (s - s * 0.5) / 2, s * 0.5, o.color || T.t2, 1.8));
}
export function seg(F, x, y, items, active = 0, o = {}) {
  const h = o.h || 32, size = o.size || 13, pad = 14;
  const ws = items.map(t => textWidth(t, size, 600) + pad * 2);
  const w = ws.reduce((a, b) => a + b, 0) + 6;
  let s = rect(x, y, w, h, { r: h / 2, fill: '#FFFFFF', fo: 0.05, stroke: '#FFFFFF', so: 0.07 });
  let cx = x + 3;
  items.forEach((t, i) => {
    if (i === active) s += rect(cx, y + 3, ws[i], h - 6, { r: (h - 6) / 2, fill: '#FFFFFF', fo: 0.14 });
    s += text(cx + pad, y + h / 2 + size * 0.36, t, { size, weight: i === active ? 600 : 500, fill: i === active ? T.t1 : T.t3 });
    cx += ws[i];
  });
  return { svg: g(F, 'Segmented', s), w };
}
export function toggle(F, x, y, on = true, col = T.ok) {
  return g(F, 'Toggle ' + (on ? 'on' : 'off'), rect(x, y, 34, 20, { r: 10, fill: on ? col : '#FFFFFF', fo: on ? 0.9 : 0.12 }) + circle(on ? x + 24 : x + 10, y + 10, 8, { fill: '#FFFFFF' }));
}
export function progress(F, x, y, w, pct, col = T.blue, h = 6) {
  return g(F, 'Progress', rect(x, y, w, h, { r: h / 2, fill: '#FFFFFF', fo: 0.08 }) + rect(x, y, Math.max(h, w * pct), h, { r: h / 2, fill: col }));
}
// confidence / score ring
export function arcPath(cx, cy, r, a0, a1) {
  const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}
export function ring(F, cx, cy, r, pct, col = T.blue, o = {}) {
  const sw = o.sw || Math.max(4, r * 0.16);
  const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.min(pct, 0.9999);
  let s = circle(cx, cy, r, { stroke: '#FFFFFF', so: 0.08, sw });
  s += pathEl(arcPath(cx, cy, r, a0, a1), { stroke: col, sw, cap: 'round' });
  const big = o.size || Math.round(r * 0.72);
  const val = o.value ?? Math.round(pct * 100);
  const vw = textWidth(String(val), big, 700), pw = o.unit === '' ? 0 : textWidth(o.unit ?? '%', big * 0.5, 600);
  s += text(cx - (vw + pw) / 2, cy + big * 0.36, String(val), { size: big, weight: 700, fill: T.t1 });
  if (pw) s += text(cx - (vw + pw) / 2 + vw + 1, cy + big * 0.36, o.unit ?? '%', { size: Math.round(big * 0.5), weight: 600, fill: T.t2 });
  if (o.label) s += text(cx, cy + r + sw + 16, o.label, { size: 11, weight: 600, ls: 0.6, fill: T.t3, anchor: 'middle' });
  return g(F, 'Ring ' + (o.label || ''), s);
}

// ---------- surfaces ----------
export function surface(F, x, y, w, h, o = {}) {
  const fill = o.fill || F.lin([[0, '#111A2C', o.alpha ?? 0.92], [1, '#0B111E', o.alpha ?? 0.92]], 0, 0, 0, 1);
  let s = rect(x, y, w, h, { r: o.r ?? 18, fill, stroke: o.stroke || '#FFFFFF', so: o.so ?? 0.075, sw: o.sw || 1, filter: o.shadow ? F.shadow(18, 30, 0.5) : undefined });
  if (o.accent) s += rect(x, y, w, h, { r: o.r ?? 18, stroke: o.accent, so: o.accentO ?? 0.5, sw: 1.5 });
  if (o.topGlow) s += rect(x + 1, y + 1, w - 2, Math.min(120, h - 2), { r: (o.r ?? 18) - 1, fill: F.lin([[0, o.topGlow, 0.16], [1, o.topGlow, 0]], 0, 0, 0, 1) });
  return s;
}
// card with header; body is a string drawn by caller in absolute coordinates
export function card(F, name, x, y, w, h, o = {}, body = '') {
  let s = surface(F, x, y, w, h, o);
  let tx = x + 22;
  if (o.ai) { s += aiMark(F, x + 20, y + 18, 24); tx = x + 54; }
  else if (o.icon) { s += icon(F, o.icon, x + 20, y + 20, 20, o.iconCol || T.t2, 1.8); tx = x + 50; }
  if (o.title) s += text(tx, y + 36, o.title, { size: o.titleSize || 15, weight: 600, fill: T.t1 });
  if (o.count !== undefined) s += text(tx + textWidth(o.title, o.titleSize || 15, 600) + 8, y + 36, String(o.count), { size: 15, weight: 500, fill: T.t3 });
  if (o.meta) s += text(x + w - 22, y + 36, o.meta, { size: 13, weight: 500, fill: o.metaCol || T.t3, anchor: 'end' });
  return g(F, name, s + body);
}

// ---------- application shell ----------
const NAV = [['Overview', 'grid'], ['Incidents', 'bell'], ['Access', 'key'], ['Perimeter', 'fence'], ['Co-pilot', 'sparkle'], ['Insights', 'chart'], ['Sites', 'globe']];
export function shell(F, o = {}) {
  const active = o.active ?? 0;
  let r = rect(0, 0, L.rail, F.h, { fill: '#070A12', fo: 0.92 }) + vhair(L.rail, 0, F.h, { so: 0.06 });
  // app icon
  r += rect(22, 14, 40, 40, { r: 12, fill: F.lin([[0, '#2D5BFF'], [1, '#8A7CFF']], 0, 0, 1, 1) }) + icon(F, 'shieldCheck', 30, 22, 24, '#FFFFFF', 2);
  NAV.forEach(([lab, ic], i) => {
    const y = 96 + i * 72;
    let s = '';
    if (i === active) s += rect(12, y - 6, 60, 60, { r: 14, fill: T.blue, fo: 0.16 });
    s += icon(F, ic, 30, y + 2, 24, i === active ? T.blue : T.t3, 1.8);
    s += text(42, y + 44, lab, { size: 10.5, weight: i === active ? 600 : 500, fill: i === active ? T.t1 : T.t3, anchor: 'middle' });
    if (lab === 'Incidents' && o.badge !== false) s += rect(48, y - 2, 22, 16, { r: 8, fill: T.crit }) + text(59, y + 10, String(o.badge ?? 7), { size: 10.5, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
    r += g(F, 'Nav ' + lab, s);
  });
  r += icon(F, 'gear', 30, 960, 24, T.t3, 1.8);
  r += avatar(F, 42, 1032, 17, 'NA', '#3B6BFF', { ring: T.ok });
  let t = hair(L.rail, L.top, F.w, { so: 0.06 });
  // site switcher
  const site = o.site || 'Central SOC';
  t += g(F, 'Site switcher',
    rect(L.x0, 14, 236, 40, { r: 12, fill: '#FFFFFF', fo: 0.04, stroke: '#FFFFFF', so: 0.07 }) +
    icon(F, 'building', L.x0 + 12, 24, 20, T.t2, 1.7) +
    text(L.x0 + 42, 30, site, { size: 13, weight: 600, fill: T.t1 }) +
    rich(L.x0 + 42, 46, [{ t: '● ', fill: T.ok }, { t: o.siteSub || '7 of 7 sites online', fill: T.t3 }], { size: 11 }) +
    icon(F, 'chevD', L.x0 + 208, 26, 16, T.t3, 2));
  // co-pilot command bar
  const cx = 662, cw = 680;
  t += g(F, 'Co-pilot command bar',
    rect(cx, 13, cw, 42, { r: 21, fill: '#FFFFFF', fo: 0.05 }) +
    rect(cx, 13, cw, 42, { r: 21, stroke: aiGrad(F), sw: 1.2, so: 0.75 }) +
    aiMark(F, cx + 9, 20, 28) +
    text(cx + 48, 39, o.ask || 'Ask Co-pilot or search people, doors, cameras, incidents…', { size: 14, weight: 400, fill: o.askCol || T.t3 }) +
    keycap(F, cx + cw - 82, 23, '⌘K') + icon(F, 'mic', cx + cw - 38, 23, 22, T.t2, 1.8));
  // right cluster
  t += g(F, 'Shift status',
    rich(1600, 31, [{ t: o.time || '02:16:04', weight: 600, fill: T.t1 }], { size: 14 }) +
    text(1600, 48, o.shift || 'Night shift B · Day 3', { size: 11, fill: T.t3 }) +
    iconBtn(F, 1730, 16, 36, 'bell') + circle(1758, 20, 5, { fill: T.crit }) +
    avatar(F, 1800, 34, 17, 'NA', '#3B6BFF') +
    text(1824, 31, 'Nurul A.', { size: 13, weight: 600, fill: T.t1 }) + text(1824, 47, 'Operator', { size: 11, fill: T.t3 }));
  return g(F, 'Nav rail', r) + g(F, 'Top bar', t);
}

// page header: title + subtitle + optional right content
export function pageHeader(F, title, sub, o = {}) {
  let s = text(L.x0, L.y0 + 30, title, { size: 26, weight: 600, fill: T.t1 });
  if (sub) s += text(L.x0 + textWidth(title, 26, 600) + 16, L.y0 + 30, sub, { size: 15, weight: 400, fill: T.t3 });
  return g(F, 'Page header', s + (o.right || ''));
}

// ---------- evidence player ----------
// boxes: [{b:[x,y,w,h] in 1280x720, color, label, sub}]
export function player(F, name, x, y, w, img, o = {}) {
  const h = Math.round(w * 9 / 16), k = w / 1280;
  let s = image(F, 'Video frame', img, x, y, w, h, o.r ?? 14);
  s += rect(x, y, w, h, { r: o.r ?? 14, stroke: '#FFFFFF', so: 0.08 });
  for (const bx of o.boxes || []) {
    const [bx0, by0, bw, bh] = bx.b.map(v => v * k);
    const X = x + bx0, Y = y + by0, col = bx.color || T.crit;
    let b = rect(X, Y, bw, bh, { r: 6, fill: col, fo: 0.07, stroke: col, sw: 2 });
    if (bx.label) {
      const lw = textWidth(bx.label, 12, 600) + 16 + (bx.sub ? 0 : 0);
      const ly = bx.below ? Y + bh + 6 : Y - 28;
      b += rect(X, ly, lw, 22, { r: 6, fill: col }) + text(X + 8, ly + 15, bx.label, { size: 12, weight: 600, fill: '#0A0F1A' });
      if (bx.sub) { const sw2 = textWidth(bx.sub, 11, 500) + 14; b += rect(X + lw + 4, ly, sw2, 22, { r: 6, fill: '#05070D', fo: 0.72 }) + text(X + lw + 11, ly + 15, bx.sub, { size: 11, weight: 500, fill: T.t1 }); }
    }
    s += g(F, 'BBox ' + (bx.label || ''), b);
  }
  // overlay chips
  if (o.live !== false) {
    const lab = o.liveLabel || 'LIVE';
    const cw = textWidth(lab, 11, 700) + 30;
    s += g(F, 'Live chip', rect(x + 14, y + 14, cw, 24, { r: 12, fill: '#05070D', fo: 0.7 }) + circle(x + 27, y + 26, 4, { fill: o.liveCol || T.crit }) + text(x + 36, y + 30, lab, { size: 11, weight: 700, ls: 0.6, fill: T.t1 }));
  }
  if (o.cam) {
    const cw = textWidth(o.cam, 12, 600) + 40;
    s += g(F, 'Camera chip', rect(x + w - cw - 14, y + 14, cw, 26, { r: 13, fill: '#05070D', fo: 0.7 }) + icon(F, 'video', x + w - cw - 4, y + 19, 16, T.t2, 1.8) + text(x + w - cw + 18, y + 31, o.cam, { size: 12, weight: 600, fill: T.t1 }));
  }
  let H = h;
  if (o.scrub !== false) {
    const sy = y + h + 14;
    let c = '';
    c += iconBtn(F, x, sy, 34, 'play', { color: T.t1 });
    c += text(x + 46, sy + 22, o.tStart || '02:14:30', { size: 12, weight: 500, fill: T.t3 });
    const tx0 = x + 116, tx1 = x + w - 170;
    c += rect(tx0, sy + 15, tx1 - tx0, 4, { r: 2, fill: '#FFFFFF', fo: 0.1 });
    const now = o.now ?? 0.62;
    c += rect(tx0, sy + 15, (tx1 - tx0) * now, 4, { r: 2, fill: T.t2 });
    for (const m of o.markers || []) {
      const mx = tx0 + (tx1 - tx0) * m.t;
      c += circle(mx, sy + 17, 5.5, { fill: m.color || T.crit, stroke: '#05070D', sw: 2 });
    }
    c += circle(tx0 + (tx1 - tx0) * now, sy + 17, 7, { fill: '#FFFFFF' });
    c += text(tx1 + 12, sy + 22, o.tEnd || '02:16:04', { size: 12, weight: 500, fill: T.t3 });
    c += iconBtn(F, x + w - 80, sy, 34, 'camera') + iconBtn(F, x + w - 36, sy, 34, 'expand');
    s += g(F, 'Scrubber', c);
    H += 14 + 34;
  }
  return { svg: g(F, name, s), h: H };
}
export function thumb(F, name, x, y, w, img, o = {}) {
  const h = Math.round(w * 9 / 16), k = w / 1280;
  let s = image(F, 'Frame', img, x, y, w, h, 10);
  s += rect(x, y, w, h, { r: 10, stroke: o.active ? (o.color || T.blue) : '#FFFFFF', so: o.active ? 1 : 0.08, sw: o.active ? 2 : 1 });
  if (o.box) { const [a, b, c, d] = o.box.map(v => v * k); s += rect(x + a, y + b, c, d, { r: 3, stroke: o.color || T.blue, sw: 1.5 }); }
  if (o.tag) { const tw = textWidth(o.tag, 10.5, 600) + 12; s += rect(x + 6, y + 6, tw, 18, { r: 5, fill: '#05070D', fo: 0.75 }) + text(x + 12, y + 18.5, o.tag, { size: 10.5, weight: 600, fill: T.t1 }); }
  if (o.label) s += text(x, y + h + 18, o.label, { size: 12, weight: 600, fill: T.t1 });
  if (o.sub) s += text(x, y + h + 34, o.sub, { size: 11, weight: 400, fill: T.t3 });
  return g(F, name, s);
}

// ---------- lists ----------
// vertical timeline: items [{t, title, sub, color, icon, dim}]
export function timeline(F, x, y, w, items, o = {}) {
  const gap = o.gap || 54;
  let s = '';
  items.forEach((it, i) => {
    const yy = y + i * gap, col = it.color || T.blue;
    if (i < items.length - 1) s += line(x + 13, yy + 28, x + 13, yy + gap - 2, { stroke: '#FFFFFF', so: 0.1, sw: 1.5 });
    let r = circle(x + 13, yy + 13, 13, { fill: col, fo: 0.16 }) + icon(F, it.icon || 'dots', x + 5, yy + 5, 16, col, 1.9);
    r += text(x + 38, yy + 11, it.title, { size: 13.5, weight: 600, fill: it.dim ? T.t2 : T.t1 });
    if (it.sub) r += text(x + 38, yy + 29, it.sub, { size: 12, fill: T.t3 });
    if (it.t) r += text(x + w, yy + 11, it.t, { size: 12, weight: 500, fill: T.t3, anchor: 'end' });
    s += g(F, 'Signal ' + it.title, r);
  });
  return g(F, o.name || 'Timeline', s);
}
// response plan: steps [{title, sub, state: done|running|approve|pending|auto, who}]
export function plan(F, x, y, w, steps, o = {}) {
  const gap = o.gap || 62;
  let s = '';
  steps.forEach((st, i) => {
    const yy = y + i * gap;
    let r = '';
    const st_ = st.state;
    if (st_ === 'done') r += circle(x + 12, yy + 12, 12, { fill: T.ok, fo: 0.18 }) + icon(F, 'check', x + 4, yy + 4, 16, T.ok, 2.4);
    else if (st_ === 'running') r += circle(x + 12, yy + 12, 11, { stroke: '#FFFFFF', so: 0.12, sw: 2.5 }) + pathEl(arcPath(x + 12, yy + 12, 11, -Math.PI / 2, Math.PI * 0.6), { stroke: T.blue, sw: 2.5, cap: 'round' });
    else if (st_ === 'approve') r += circle(x + 12, yy + 12, 12, { fill: T.high, fo: 0.18 }) + icon(F, 'hand', x + 4, yy + 4, 16, T.high, 1.9);
    else r += circle(x + 12, yy + 12, 11, { stroke: '#FFFFFF', so: 0.2, sw: 1.5 }) + text(x + 12, yy + 16.5, String(i + 1), { size: 12, weight: 600, fill: T.t3, anchor: 'middle' });
    r += text(x + 36, yy + 11, st.title, { size: 14, weight: 600, fill: st_ === 'pending' ? T.t2 : T.t1 });
    if (st.sub) r += text(x + 36, yy + 30, st.sub, { size: 12, fill: T.t3 });
    const tag = st.tag || ({ done: 'Done', running: 'Running', approve: 'Needs approval', pending: 'Queued', auto: 'Auto' })[st_];
    const tcol = ({ done: T.ok, running: T.blue, approve: T.high, pending: T.t3, auto: T.ice })[st_] || T.t3;
    if (tag) { const tw = textWidth(tag, 11, 600) + 16; r += rect(x + w - tw, yy - 2, tw, 20, { r: 10, fill: tcol, fo: 0.13 }) + text(x + w - tw + 8, yy + 12, tag, { size: 11, weight: 600, fill: tcol }); }
    s += g(F, 'Step ' + st.title, r);
  });
  return g(F, o.name || 'Response plan', s);
}
// factor bars: [{label, v (0..1), note}]
export function factors(F, x, y, w, list, o = {}) {
  const gap = o.gap || 40;
  let s = '';
  list.forEach((fa, i) => {
    const yy = y + i * gap;
    let r = text(x, yy + 12, fa.label, { size: 13, weight: 500, fill: T.t1 });
    r += text(x + w, yy + 12, fa.note || ('+' + Math.round(fa.v * 100)), { size: 12, weight: 600, fill: T.t2, anchor: 'end' });
    r += rect(x, yy + 20, w, 4, { r: 2, fill: '#FFFFFF', fo: 0.07 }) + rect(x, yy + 20, Math.max(6, w * fa.v), 4, { r: 2, fill: fa.color || T.blue });
    s += g(F, 'Factor ' + fa.label, r);
  });
  return g(F, o.name || 'Why it matters', s);
}
// key-value rows
export function kv(F, x, y, w, rows, o = {}) {
  const gap = o.gap || 30;
  let s = '';
  rows.forEach(([k, v, col], i) => {
    const yy = y + i * gap;
    s += text(x, yy, k, { size: 13, fill: T.t3 }) + text(x + w, yy, v, { size: 13, weight: 600, fill: col || T.t1, anchor: 'end' });
    if (o.lines && i < rows.length - 1) s += hair(x, yy + gap / 2 + 2, x + w);
  });
  return g(F, o.name || 'Details', s);
}

// ---------- co-pilot ----------
export function bubbleUser(F, x, y, w, str) {
  const lines = wrap(str, w - 32, 13.5, 500);
  const h = lines.length * 20 + 18, bw = Math.min(w, Math.max(...lines.map(l => textWidth(l, 13.5, 500))) + 32);
  return { svg: g(F, 'User message', rect(x + w - bw, y, bw, h, { r: 16, fill: T.blue2, fo: 0.9 }) + lines.map((l, i) => text(x + w - bw + 16, y + 23 + i * 20, l, { size: 13.5, weight: 500, fill: '#FFFFFF' })).join('')), h };
}
export function bubbleAI(F, x, y, w, str, o = {}) {
  const p = para(x + 34, y + 16, str, w - 34, { size: 13.5, lh: 20, fill: T.t1 });
  return { svg: g(F, 'Co-pilot message', aiMark(F, x, y, 24) + p.svg), h: p.h + 8 };
}
export function suggest(F, x, y, list, o = {}) {
  // lay out first so the block can be bottom-anchored (o.bottom = y of the block's bottom edge)
  const maxX = o.maxX || 99999, pos = [];
  let cx = x, cy = 0;
  for (const t of list) {
    const w = textWidth(t, 12.5, 500) + 24;
    if (cx + w > maxX && cx > x) { if (o.maxRows && cy / 36 + 1 >= o.maxRows) continue; cx = x; cy += 36; }
    pos.push([t, cx, cy, w]); cx += w + 8;
  }
  const h = cy + 28, y0 = o.bottom !== undefined ? o.bottom - h : y;
  const s = pos.map(([t, px, py, w]) => rect(px, y0 + py, w, 28, { r: 14, fill: '#FFFFFF', fo: 0.05, stroke: '#FFFFFF', so: 0.12 }) + text(px + 12, y0 + py + 18.5, t, { size: 12.5, weight: 500, fill: T.t2 })).join('');
  return { svg: g(F, 'Suggested prompts', s), h, y: y0 };
}
export function askBox(F, x, y, w, ph = 'Ask about this incident…') {
  return g(F, 'Ask box', rect(x, y, w, 44, { r: 22, fill: '#FFFFFF', fo: 0.05, stroke: aiGrad(F), sw: 1.2, so: 0.6 }) + text(x + 18, y + 27, ph, { size: 13.5, fill: T.t3 }) + icon(F, 'mic', x + w - 70, y + 11, 22, T.t2) + circle(x + w - 22, y + 22, 16, { fill: T.blue2 }) + icon(F, 'send', x + w - 31, y + 13, 18, '#FFFFFF', 2));
}

// ---------- incident header (shared by all workspace frames) ----------
export function incidentHeader(F, inc) {
  let s = '';
  s += g(F, 'Back', icon(F, 'chevL', L.x0 - 4, L.y0 + 4, 20, T.t3, 2) + text(L.x0 + 18, L.y0 + 19, 'Incidents', { size: 13, weight: 500, fill: T.t3 }) + text(L.x0 + 84, L.y0 + 19, '/  ' + inc.id, { size: 13, weight: 500, fill: T.t4 }));
  s += rect(L.x0, L.y0 + 34, 52, 52, { r: 16, fill: SEV[inc.sev], fo: 0.14 }) + icon(F, inc.icon, L.x0 + 12, L.y0 + 46, 28, SEV[inc.sev], 1.9);
  s += text(L.x0 + 70, L.y0 + 64, inc.title, { size: 26, weight: 600, fill: T.t1 });
  // meta line
  const meta = chips(F, L.x0 + 70, L.y0 + 76, [
    { label: inc.sev, color: SEV[inc.sev], dot: true },
    ...(inc.status ? [{ label: inc.status, color: inc.statusCol || T.high, icon: inc.statusIcon || 'hand' }] : []),
    ...inc.tags.map(t => ({ label: t, color: T.t2, bgo: 0.07, weight: 500 })),
  ]);
  s += meta.svg;
  // right: confidence + time open + actions (laid out right-to-left so long notes never collide)
  const rx = L.x1, note = inc.confNote || 'High · 5 sources agree', age = inc.age || '1m 12s';
  const ox = rx - 104 - Math.max(textWidth('Open for', 12, 500), textWidth(age, 13, 600));
  const cw = Math.max(textWidth('AI confidence', 12, 500), textWidth(note, 13, 600));
  const tx = ox - 40 - cw;
  s += ring(F, tx - 38, L.y0 + 58, 26, inc.conf / 100, SEV[inc.sev], { size: 17, sw: 5 });
  s += text(tx, L.y0 + 52, 'AI confidence', { size: 12, weight: 500, fill: T.t3 }) + text(tx, L.y0 + 72, note, { size: 13, weight: 600, fill: T.t1 });
  s += vhair(ox - 20, L.y0 + 36, L.y0 + 82);
  s += text(ox, L.y0 + 52, 'Open for', { size: 12, weight: 500, fill: T.t3 }) + text(ox, L.y0 + 72, age, { size: 13, weight: 600, fill: T.t1 });
  s += iconBtn(F, rx - 92, L.y0 + 40, 38, 'users') + iconBtn(F, rx - 44, L.y0 + 40, 38, 'dots');
  return g(F, 'Incident header', s);
}
