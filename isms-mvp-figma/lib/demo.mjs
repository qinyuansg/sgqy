// Interaction-state kit for the demo click flows: cursor, hover, focus, pressed, tooltip, annotation
// pills ("what the user does" / "what appears"), journey stage chips and the Co-pilot briefing block
// that lives in the SOP Flow tab. Everything is drawn in the V11 language; layers carry NEW / Annotation.
import { f, rect, circle, line, pathEl, text, icon, g, textWidth, wrap } from './svg.mjs';
import { C } from './v11.mjs';

export const STAGES = {
  detect: ['Detect', '#D72D30'], correlate: ['Correlate', '#3EA9FF'], context: ['Contextualise', '#55D6E6'],
  orchestrate: ['Orchestrate', '#D4B741'], govern: ['Assist & govern', '#B69CFF'],
};
const PINK = '#FDD8FD', PLUM = '#480448';

// mouse pointer, optional click ripple
export function cursor(F, x, y, o = {}) {
  let s = '';
  if (o.click) s += circle(x, y, 22, { fill: C.link, fo: 0.18, stroke: C.link, so: 0.8, sw: 1.5 }) + circle(x, y, 34, { stroke: C.link, so: 0.35, sw: 1.2 });
  s += pathEl(`M${f(x)} ${f(y)} l0 22 l6 -5.5 l4 9.5 l3.6 -1.6 l-4 -9.2 l8 0 Z`, { fill: '#FFFFFF', stroke: '#111111', sw: 1.3, join: 'round', filter: F.shadow(2, 2, 0.5) });
  return g(F, o.click ? 'Cursor click NEW' : 'Cursor NEW', s);
}
// hover overlay on a row / card
export function hover(F, x, y, w, h, o = {}) {
  return g(F, 'Hover ' + (o.name || '') + ' NEW', rect(x, y, w, h, { r: o.r ?? 0, fill: '#FFFFFF', fo: o.fo ?? 0.06, stroke: '#FFFFFF', so: 0.25, sw: 1 }));
}
// hover / pressed on a button rect (lightens, white outline; pressed darkens with an inner line)
export function btnState(F, x, y, w, h, state = 'hover', o = {}) {
  const r = o.r ?? 8;
  if (state === 'pressed') return g(F, 'Pressed NEW', rect(x, y, w, h, { r, fill: '#000000', fo: 0.22 }) + rect(x + 1.5, y + 1.5, w - 3, h - 3, { r: r - 1, stroke: '#FFFFFF', so: 0.35, sw: 1 }));
  if (state === 'disabled') return g(F, 'Disabled NEW', rect(x, y, w, h, { r, fill: C.frame, fo: 0.6 }));
  return g(F, 'Button hover NEW', rect(x, y, w, h, { r, fill: '#FFFFFF', fo: 0.1, stroke: '#FFFFFF', so: 0.6, sw: 1 }));
}
// tab hover: translucent active fill over an inactive tab
export const tabHover = (F, x, y, w, h) => g(F, 'Tab hover NEW', rect(x, y, w, h, { fill: C.tabOn, fo: 0.7 }));
// link hover: underline under a text run
export const linkHover = (F, x, baseline, w, col = C.link) => g(F, 'Link hover NEW', line(x, baseline + 3, x + w, baseline + 3, { stroke: col, sw: 1.2 }));
// focus ring (search bar, inputs)
export const focusRing = (F, x, y, w, h, r = 8) => g(F, 'Focus ring NEW', rect(x - 1.5, y - 1.5, w + 3, h + 3, { r: r + 1, stroke: C.copilot, sw: 1.5 }) + rect(x - 4, y - 4, w + 8, h + 8, { r: r + 3, stroke: C.copilot, so: 0.3, sw: 1 }));
// text caret
export const caret = (F, x, y, h = 20) => g(F, 'Caret NEW', rect(x, y, 1.5, h, { fill: '#FFFFFF' }));
// tooltip pill above a point
export function tooltip(F, cx, y, label, o = {}) {
  const w = textWidth(label, 13, 500) + 20, h = 26, x = o.left ? cx - w : o.right ? cx : cx - w / 2;
  let s = rect(x, y - h - 8, w, h, { r: 6, fill: '#0B0F16', stroke: '#4A505B', filter: F.shadow(4, 6, 0.45) });
  s += pathEl(`M${f(cx - 5)} ${f(y - 8)} L${f(cx)} ${f(y - 2)} L${f(cx + 5)} ${f(y - 8)} Z`, { fill: '#0B0F16' });
  s += text(x + 10, y - h - 8 + 17.5, label, { size: 13, weight: 500, fill: '#FFFFFF' });
  return g(F, 'Tooltip NEW', s);
}
// annotation: what the user does (plum on pink) or what appears (white on dark, lavender border)
export function note(F, x, y, label, o = {}) {
  const size = o.size || 13, w = textWidth(label, size, 700) + 24 + (o.n ? 22 : 0), h = 28;
  const user = o.kind !== 'shows';
  let s = rect(x, y, w, h, { r: 14, fill: user ? PINK : '#1D232C', stroke: user ? PLUM : C.copilot, sw: 1.2, filter: F.shadow(3, 5, 0.4) });
  let tx = x + 12;
  if (o.n) { s += circle(x + 15, y + 14, 9, { fill: user ? PLUM : C.copilot }) + text(x + 15, y + 18, String(o.n), { size: 11, weight: 700, fill: user ? PINK : '#111111', anchor: 'middle' }); tx = x + 30; }
  s += text(tx, y + 18.5, label, { size, weight: 700, fill: user ? PLUM : '#FFFFFF' });
  if (o.to) { // leader to a point
    const [px, py] = o.to, ax = px < x ? x : px > x + w ? x + w : px, ay = py < y ? y : py > y + h ? y + h : py;
    s += line(ax, ay, px, py, { stroke: user ? PLUM : C.copilot, sw: 1.5, dash: '4 3' }) + circle(px, py, 3.5, { fill: user ? PLUM : C.copilot });
  }
  return { svg: g(F, `Annotation ${user ? 'user' : 'shows'} · ${label}`, s), w, h };
}
// journey stage chip
export function stageChip(F, x, y, key, o = {}) {
  const [lab, col] = STAGES[key], size = o.size || 12, w = textWidth(lab.toUpperCase(), size, 700, 1) + 30, h = o.h || 24;
  return { svg: g(F, 'Stage ' + lab, rect(x, y, w, h, { r: h / 2, fill: col, fo: 0.16, stroke: col, so: 0.9, sw: 1 }) + circle(x + 12, y + h / 2, 4, { fill: col }) + text(x + 22, y + h / 2 + size * 0.36, lab.toUpperCase(), { size, weight: 700, ls: 1, fill: '#FFFFFF' })), w, h };
}
// Co-pilot briefing block for the SOP Flow tab (replaces the lavender summary in Investigation)
export function copilotBriefing(F, x, y, w, o) {
  const lines = wrap(o.text, w - 48, 13.5, 400), h = 46 + lines.length * 19 + (o.sources ? 22 : 0) + 12;
  let s = rect(x, y, w, h, { r: 8, fill: C.copilot, fo: 0.1, stroke: C.copilot, so: 0.55, sw: 1 });
  s += icon(F, 'sparkle', x + 14, y + 13, 16, C.copilot, 2) + text(x + 36, y + 26, o.title || 'Co-pilot briefing', { size: 14, weight: 700, fill: C.copilot });
  if (o.time) s += text(x + w - 14, y + 26, o.time, { size: 12, fill: C.t3, anchor: 'end' });
  lines.forEach((l, i) => { s += text(x + 14, y + 50 + i * 19, l, { size: 13.5, fill: C.t1 }); });
  if (o.sources) s += text(x + 14, y + 50 + lines.length * 19 + 10, 'Sources: ' + o.sources, { size: 12, fill: C.t2 });
  return { svg: g(F, 'Co-pilot briefing NEW', s), h };
}
// confirmation toast (bottom right), e.g. "Acknowledged · Nurul A. · 01:52"
export function confirmToast(F, x, y, title, sub, o = {}) {
  const w = o.w || 360, h = sub ? 70 : 50;
  let s = rect(x, y, w, h, { r: 10, fill: '#1D232C', fo: 0.97, stroke: C.green, sw: 1.2, filter: F.shadow(8, 14, 0.5) });
  s += circle(x + 26, y + (sub ? 28 : 25), 12, { fill: C.green }) + icon(F, 'check', x + 18, y + (sub ? 20 : 17), 16, '#FFFFFF', 3);
  s += text(x + 50, y + (sub ? 30 : 30), title, { size: 15, weight: 700, fill: '#FFFFFF' });
  if (sub) s += text(x + 50, y + 52, sub, { size: 13, fill: C.t2 });
  return g(F, 'Confirmation NEW', s);
}
// dropdown menu (filters, export): items with optional selected index
export function menu(F, x, y, w, items, o = {}) {
  const rh = 36, h = items.length * rh + 12;
  let s = rect(x, y, w, h, { r: 8, fill: '#262A31', stroke: '#4A505B', filter: F.shadow(8, 14, 0.5) });
  items.forEach((it, i) => {
    const yy = y + 6 + i * rh;
    if (i === o.selected) s += rect(x + 4, yy, w - 8, rh, { r: 6, fill: C.tabOn, fo: 0.9 });
    else if (i === o.hover) s += rect(x + 4, yy, w - 8, rh, { r: 6, fill: '#FFFFFF', fo: 0.08 });
    s += text(x + 16, yy + 23, it, { size: 15, fill: '#FFFFFF' });
    if (i === o.selected) s += icon(F, 'check', x + w - 32, yy + 9, 18, '#FFFFFF', 2.5);
  });
  return { svg: g(F, 'Dropdown NEW', s), h };
}
// snap a tab-body scroll offset to a step-row boundary: with the viewport [sc, sc+bodyH] in content coordinates and the
// sopFlow() read-back `pos` ([{y, h}] in screen coordinates, header 32px tall), returns the smallest offset >= sc at which
// no step header straddles the clip edge (the header is either fully in view or fully below it). Callers that compute
// `sc` themselves (uc1/uc3 alarmsPanel, uc2 sopBody) pass it through here before translating the content.
export function snapScroll(sc, bodyH, pos, o = {}) {
  const head = o.head ?? 32, top = o.top ?? 600;
  let out = sc;
  for (const p of pos || []) { if (!p) continue; const y0 = p.y - top, y1 = y0 + head, edge = out + bodyH; if (edge > y0 && edge < y1) out = y1 - bodyH; }
  return Math.max(0, out);
}
// alert cards without Co-pilot text (improvement 3)
export const plainCards = (list, sel) => list.map(a => { const { ai, ...rest } = a; return { ...rest, selected: a.key === sel }; });
