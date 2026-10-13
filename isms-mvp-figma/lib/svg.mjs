// Figma-friendly SVG toolkit: plain presentation attributes (no CSS, no foreignObject),
// named <g id> layers (Figma uses them as layer names), <text> as editable Inter text,
// gradients in a per-frame <defs>. Text is measured with Inter's own advance widths.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const W = JSON.parse(fs.readFileSync(path.join(HERE, 'inter-widths.json'), 'utf8'));

export const T = {
  // surfaces (dark, navy-black, like the deck)
  bg: '#05070D', bg2: '#080C16', rail: '#070A12', s1: '#0C1220', s2: '#111A2C', s3: '#17223A', s4: '#1E2B47',
  line: '#1A2438', line2: '#25324D', line3: '#33446A',
  // text
  t1: '#F2F5FA', t2: '#A9B7CF', t3: '#6E7C96', t4: '#4A5772',
  // brand + status (deck palette)
  blue: '#4D8DFF', blue2: '#2D5BFF', ice: '#8FB4FF', teal: '#34C7C9', violet: '#8A7CFF', pink: '#FF6FB5',
  crit: '#FF5A6E', high: '#FF9A3C', med: '#F5CF4A', low: '#8E9BB5', ok: '#2ED47A', amber: '#FFB020',
  font: 'Inter',
};
export const SEV = { Critical: T.crit, High: T.high, Medium: T.med, Low: T.low };

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const f = x => (Math.round(x * 100) / 100).toString();

export function textWidth(str, size = 14, weight = 400, ls = 0) {
  const tbl = W[weight] || W[400];
  let w = 0;
  for (const ch of String(str)) w += (tbl[ch] ?? 0.58) * size + ls;
  return w;
}
// wrap text into lines that fit maxW
export function wrap(str, maxW, size = 14, weight = 400, ls = 0) {
  const words = String(str).split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t, size, weight, ls) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// one frame = one Figma frame (top-level <svg>)
export class Frame {
  constructor(name, w = 1920, h = 1080) { this.name = name; this.w = w; this.h = h; this.defs = []; this.n = 0; this.ids = new Set(); }
  uid(p = 'd') { return `${p}${++this.n}`; }
  // unique, Figma-readable layer name
  id(name) {
    let base = String(name).replace(/[^A-Za-z0-9_\-·]+/g, '_').replace(/·/g, '-').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Layer';
    if (/^[0-9]/.test(base)) base = 'L_' + base;
    let n = base, i = 2;
    while (this.ids.has(n)) n = `${base}_${i++}`;
    this.ids.add(n);
    return n;
  }
  lin(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, units) {
    const id = this.uid('lg');
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${units ? ` gradientUnits="${units}"` : ''}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`);
    return `url(#${id})`;
  }
  rad(stops, cx = 0.5, cy = 0.5, r = 0.5, units, extra = '') {
    const id = this.uid('rg');
    this.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${units ? ` gradientUnits="${units}"` : ''}${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`);
    return `url(#${id})`;
  }
  clip(shape) { const id = this.uid('cp'); this.defs.push(`<clipPath id="${id}">${shape}</clipPath>`); return `url(#${id})`; }
  blur(sd) { const id = this.uid('fb'); this.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return `url(#${id})`; }
  shadow(dy = 12, sd = 24, a = 0.45) { const id = this.uid('fs'); this.defs.push(`<filter id="${id}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${sd}" flood-color="#000000" flood-opacity="${a}"/></filter>`); return `url(#${id})`; }
  render(body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" fill="none">
<title>${esc(this.name)}</title>
<defs>${this.defs.join('\n')}</defs>
<g id="${this.id(this.name)}">${body}</g>
</svg>`;
  }
}

// ---------- primitives (return strings) ----------
export const g = (F, name, body, attrs = '') => `<g id="${F.id(name)}"${attrs ? ' ' + attrs : ''}>${body}</g>`;
export function rect(x, y, w, h, o = {}) {
  const a = [`x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"`];
  if (o.r) a.push(`rx="${f(o.r)}"`);
  a.push(`fill="${o.fill || 'none'}"`);
  if (o.fo !== undefined) a.push(`fill-opacity="${o.fo}"`);
  if (o.stroke) a.push(`stroke="${o.stroke}" stroke-width="${o.sw || 1}"`);
  if (o.so !== undefined) a.push(`stroke-opacity="${o.so}"`);
  if (o.dash) a.push(`stroke-dasharray="${o.dash}"`);
  if (o.op !== undefined) a.push(`opacity="${o.op}"`);
  if (o.filter) a.push(`filter="${o.filter}"`);
  return `<rect ${a.join(' ')}/>`;
}
export const circle = (cx, cy, r, o = {}) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${o.fill || 'none'}"${o.fo !== undefined ? ` fill-opacity="${o.fo}"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : ''}${o.so !== undefined ? ` stroke-opacity="${o.so}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op !== undefined ? ` opacity="${o.op}"` : ''}${o.filter ? ` filter="${o.filter}"` : ''}/>`;
export const line = (x1, y1, x2, y2, o = {}) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${o.stroke || T.line2}" stroke-width="${o.sw || 1}"${o.so !== undefined ? ` stroke-opacity="${o.so}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.cap ? ` stroke-linecap="${o.cap}"` : ''}/>`;
export const pathEl = (d, o = {}) => `<path d="${d}" fill="${o.fill || 'none'}"${o.fo !== undefined ? ` fill-opacity="${o.fo}"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : ''}${o.so !== undefined ? ` stroke-opacity="${o.so}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.cap ? ` stroke-linecap="${o.cap}"` : ''}${o.join ? ` stroke-linejoin="${o.join}"` : ''}${o.op !== undefined ? ` opacity="${o.op}"` : ''}${o.filter ? ` filter="${o.filter}"` : ''}/>`;
export const poly = (pts, o = {}) => pathEl('M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + (o.open ? '' : 'Z'), o);

// text: one line; returns string. anchor start|middle|end
export function text(x, y, str, o = {}) {
  const size = o.size || 14, wt = o.weight || 400, ls = o.ls || 0;
  // anchor is resolved here (measured with Inter widths) so Figma always gets left-aligned text boxes
  if (o.anchor === 'middle') x -= (textWidth(str, size, wt, ls) - ls) / 2;
  else if (o.anchor === 'end') x -= textWidth(str, size, wt, ls) - ls;
  return `<text x="${f(x)}" y="${f(y)}" font-family="${T.font}" font-size="${size}" font-weight="${wt}"${ls ? ` letter-spacing="${ls}"` : ''} fill="${o.fill || T.t1}"${o.fo !== undefined ? ` fill-opacity="${o.fo}"` : ''}${o.op !== undefined ? ` opacity="${o.op}"` : ''}>${esc(str)}</text>`;
}
// rich text: runs [{t, fill, weight}] on one line
export function rich(x, y, runs, o = {}) {
  const size = o.size || 14;
  if (o.anchor) {
    const w = runs.reduce((a, r) => a + textWidth(r.t, size, r.weight || o.weight || 400), 0);
    x -= o.anchor === 'middle' ? w / 2 : o.anchor === 'end' ? w : 0;
  }
  return `<text x="${f(x)}" y="${f(y)}" font-family="${T.font}" font-size="${size}" font-weight="${o.weight || 400}" fill="${o.fill || T.t1}">${runs.map(r => `<tspan${r.fill ? ` fill="${r.fill}"` : ''}${r.weight ? ` font-weight="${r.weight}"` : ''}>${esc(r.t)}</tspan>`).join('')}</text>`;
}
// paragraph: wrapped text block; returns {svg, h}
export function para(x, y, str, maxW, o = {}) {
  const size = o.size || 14, lh = o.lh || Math.round(size * 1.45), lines = wrap(str, maxW, size, o.weight || 400, o.ls || 0).slice(0, o.max || 99);
  return { svg: lines.map((l, i) => text(x, y + i * lh, l, o)).join(''), h: lines.length * lh, n: lines.length };
}

// ---------- icons (24×24 stroke, SF-Symbols-like) ----------
const P = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.8H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2"/>',
  fence: '<path d="M5 20V8.5l2-2.5 2 2.5V20"/><path d="M10 20V8.5l2-2.5 2 2.5V20"/><path d="M15 20V8.5l2-2.5 2 2.5V20"/><path d="M3 11h18M3 16h18"/>',
  sparkle: '<path d="M11 3.5 12.9 9l5.6 2-5.6 2L11 18.5 9.1 13l-5.6-2 5.6-2z"/><path d="M18.5 3v3.6M16.7 4.8h3.6"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.5 5.6 3.5 8.5s-.9 5.9-3.5 8.5c-2.6-2.6-3.5-5.6-3.5-8.5s.9-5.9 3.5-8.5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>', chevL: '<path d="m15 5-7 7 7 7"/>', chevD: '<path d="m5 9 7 7 7-7"/>',
  check: '<path d="m5 12.5 4.6 4.6L19.2 7.4"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  camera: '<path d="M2.8 8.2 14.6 5l1.9 6.3-11.8 3.2z"/><path d="m16.2 7.4 4.4-1.3.9 3.1-4.4 1.3"/><path d="m8.3 13.6 1.2 4.6H4.6"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.9-4 3.8-6 7.5-6s6.6 2 7.5 6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.7-3.3 3.1-5 6-5s5.3 1.7 6 5"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2"/><path d="M17.5 14.7c1.8.6 3.1 2.2 3.5 4.8"/>',
  shield: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/>',
  shieldCheck: '<path d="M12 3 5 6v5.6c0 4.2 3 7.7 7 9.4 4-1.7 7-5.2 7-9.4V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  door: '<path d="M6.5 3.5h10v17h-10z"/><path d="M13.5 12.3h.01"/><path d="M3.5 20.5h17"/>',
  bag: '<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M9.5 8V5.2h5V8"/><path d="M9 11.5v5M15 11.5v5"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.3h.01"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  send: '<path d="M21 3 10.5 13.5"/><path d="m21 3-6.5 18-4-7.5L3 9.5z"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  doc: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5"/><path d="M9 12.5h7M9 16.5h7"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  radar: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 18 6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  building: '<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01M8 13h.01M12 13h.01M16 13h.01"/>',
  plane: '<path d="M21 15.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4.5l-7 5v2l7-2.2V18l-2.2 1.6V21l3.7-1 3.7 1v-1.4L13 18v-4.7z"/>',
  fight: '<circle cx="7.5" cy="5" r="2"/><circle cx="16.5" cy="5" r="2"/><path d="M7.5 7v6l-2 7M7.5 10.5l4.5-2M16.5 7v6l2 7M16.5 10.5 12 8.5M7.5 13l2.5 7M16.5 13 14 20"/>',
  fire: '<path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.6-2.5-5.4-3.4-8.7-1.9 1.4-2.3 3-2.4 4.4-1-1.2-1.6-2.3-1.7-3.9C8.1 9 6 11.6 6 15.2 6 18.6 8.4 21 12 21z"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.6 1.6M9.5 2.8h5"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13.5h4"/>',
  swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  filter: '<path d="M4 5h16l-6.2 7.6v6.2L10.2 20.5v-7.9z"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  phone: '<path d="M5 4h3l1.5 4.5-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2L20 16v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
  thermo: '<path d="M14 14.6V5.2a2 2 0 0 0-4 0v9.4a4 4 0 1 0 4 0z"/><path d="M12 15.5v-5"/>',
  wave: '<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  hand: '<path d="M8 12.5V5.8a1.5 1.5 0 0 1 3 0v5.4M11 11V4.6a1.5 1.5 0 0 1 3 0V11M14 11V6.2a1.5 1.5 0 0 1 3 0v7.3a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.9-2.6L3.2 14.6a1.6 1.6 0 0 1 2.6-1.9L8 15"/>',
  list: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  server: '<rect x="4" y="4" width="16" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="16" height="6.5" rx="1.5"/><path d="M7.5 7.2h.01M7.5 16.8h.01"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5z"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
  thumbUp: '<path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2.6 2.3L13 10h5.5a2 2 0 0 1 2 2.4l-1.4 6A2.5 2.5 0 0 1 16.7 20H7"/>',
  thumbDown: '<path d="M7 13V4H4v9zM7 13l4 7a2 2 0 0 0 2.6-2.3L13 14h5.5a2 2 0 0 0 2-2.4l-1.4-6A2.5 2.5 0 0 0 16.7 4H7"/>',
};
export const ICONS = Object.keys(P);
export function icon(F, name, x, y, size = 24, color = T.t2, sw = 1.75) {
  const k = size / 24;
  return `<g id="${F.id('Icon-' + name)}" transform="translate(${f(x)} ${f(y)}) scale(${f(k)})" stroke="${color}" stroke-width="${f(sw / k)}" stroke-linecap="round" stroke-linejoin="round" fill="none">${P[name] || ''}</g>`;
}
export function image(F, name, href, x, y, w, h, r = 0) {
  const clip = r ? F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}"/>`) : null;
  return `<g id="${F.id(name)}"${clip ? ` clip-path="${clip}"` : ''}><image x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="xMidYMid slice" href="${href}" xlink:href="${href}"/></g>`;
}
