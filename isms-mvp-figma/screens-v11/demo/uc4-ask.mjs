// UC4 · Search / Ask Co-pilot · end-to-end click flow in the current V11 UI, one state per frame.
// Journey: Assist & govern (S1–S3: the question) → Correlate (S4: the answer links the events) →
// Contextualise (S5: Locate flies the map) → Assist & govern (S6: follow-up, everything logged).
// Improvements applied: lavender appears only in the Co-pilot answer; alert cards carry no Co-pilot line
// (plainCards); every answer names its sources and is logged with user and clock time. People act on it.
// Names, IDs and times are illustrative (demo night; duty manager Daniel L. asks at 02:30).
import { Frame, f, rect, circle, line, poly, text, rich, icon, image, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, SEVC, W, H, asset, alertsPanel, deviceStatus, scene } from '../../lib/v11.mjs';
import { camera, clayAirport } from '../../lib/clay.mjs';
import { cursor, hover, btnState, linkHover, focusRing, caret, tooltip, note, stageChip, plainCards } from '../../lib/demo.mjs';
import { ALERTS } from '../data.mjs';

// ---------- anchors: on-screen rects of the key UI elements per frame (boards / film read them) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR && r) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- scenario ----------
const USER = 'Daniel L.', T0 = '02:30';
const Q1 = 'Show critical incidents in Terminal 5 in the last hour';
const Q2 = 'Where was this person last detected?';
const TYPED = 'Show crit';
const COUNTS = [['2 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];
const BAR = [649, 43, 446, 40];          // the search field inside the header bar
const DX = 440, DY = 92, DW = 655;       // the Co-pilot answer panel hangs under the whole bar (as V11-11)
const TX = 649, TW = 446;                // typeahead dropdowns and the collapsed summary hang under the field
const RECENT = [
  { text: 'Which doors are still held open in T3?', time: '01:58' },
  { text: 'Who is on patrol near Sector 5?', time: '01:40' },
  { text: 'Show open alarms in Terminal 1', time: '01:22' },
];
const SUGGEST = [Q1, 'Show critical alarms still open', 'Show critical incidents closed tonight'];
const ANS1 = {
  headline: 'Two critical incidents in Terminal 5 in the last hour.',
  sub: 'Both are closed: a forced door (Andrew Teo, 02:05) and a wildlife alarm (Siti K., 01:49).',
  results: [
    { n: 1, sev: 'Critical', title: 'T5 Pier B Service Door', time: '01:47 am', desc: 'Door forced, no badge within 30 s · Closed 02:05 · Andrew Teo', open: 'Open alarm' },
    { n: 2, sev: 'Critical', title: 'Fence Sector 15 · T5 apron', time: '01:42 am', desc: 'Wildlife, confirmed on LiDAR and video · Closed 01:49 · Siti K.', open: 'Open alarm' },
  ],
  sources: 'event log (8 events) · SOP-SEC-014 §3.2 · CAM 5-210, 5-212',
  chips: [Q2, 'Show cameras around the incident', 'Why is this door alarm high priority?'],
};
const ANS2 = {
  asked: Q2,
  headline: 'Last seen at T5 Gate B10 at 02:21 on CAM 5-212; no exit badge since.',
  sub: 'Appearance match from the Pier B door event (TGT-209); no exit badge at any T5 door since 02:05. Verify on the clip before acting.',
  results: [{ n: 1, sev: 'Critical', title: 'T5 Gate B10 · last detection', time: '02:21 am', desc: 'CAM 5-212 · linked to TGT-209 (Pier B door, closed 02:05)', open: 'Open clip' }],
  sources: 'CAM 5-212 (02:21:08) · ACS exit badges T5 (none since 02:05) · TGT-209 record',
  chips: ['Show the clip at 02:21', 'Which T5 exits have no camera?', 'Draft a note for the T5 patrol'],
  recent: [Q1, T0],
};

// ---------- header (copied from v11.mjs so the search field can show idle / focus / typing / query) ----------
function headerX(F, o = {}) {
  let s = image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  let e = rect(119, 40, 257, 46, { r: 8, fill: C.red });
  e += poly([[147, 51], [158, 62], [147, 73], [136, 62]], { fill: '#FFFFFF' }) + rect(145.8, 55.5, 2.4, 9, { fill: C.red }) + rect(145.8, 66.5, 2.4, 2.6, { fill: C.red });
  e += text(163, 70, 'Emergency Lockdown', { size: 20, weight: 700, fill: '#FFFFFF' });
  s += g(F, 'Button Emergency Lockdown', e);
  const loc = o.loc || ['Main Airport', 'T3'];
  let b = rect(440, 43, 655, 40, { r: 8, fill: C.search });
  b += rect(440, 43, 209, 40, { r: 8, fill: C.locSeg }) + rect(640, 43, 9, 40, { fill: C.locSeg });
  const w0 = textWidth(loc[0], 16, 500);
  b += text(450, 69, loc[0], { size: 16, weight: 500, fill: '#FFFFFF' }) + text(450 + w0 + 7, 68, '›', { size: 14, fill: C.t3 }) + text(450 + w0 + 22, 69, loc[1], { size: 16, weight: 500, fill: '#FFFFFF' });
  b += poly([[627, 60], [637, 60], [632, 66]], { fill: '#FFFFFF' });
  const m = o.search || { mode: 'idle' }, [bx, by, bw, bh] = BAR;
  if (m.mode === 'query') {   // the question stays in the bar while the answer is open (V11-11)
    const qs = textWidth(m.text, 16) > 390 ? 15 : 16;
    b += rect(bx, by, bw, bh, { r: 8, fill: '#3A3F48', stroke: C.copilot, sw: 1.5 });
    b += icon(F, 'sparkle', 660, 53, 20, C.copilot, 2) + text(689, 69, m.text, { size: qs, fill: '#FFFFFF' });
  } else if (m.mode === 'focus' || m.mode === 'typing') {
    b += rect(bx, by, bw, bh, { r: 8, fill: '#3A3F48' }) + icon(F, 'search', 660, 53, 20, C.t1, 2);
    if (m.mode === 'typing') {
      const tw = textWidth(m.text, 16);
      b += text(689, 69, m.text, { size: 16, fill: '#FFFFFF' }) + caret(F, 689 + tw + 2, 53, 20) + icon(F, 'x', 1066, 53, 20, C.t2, 2);
    } else b += caret(F, 689, 53, 20) + text(694, 69, 'Search or ask Co-pilot…', { size: 16, fill: C.t3, fo: 0.55 });
  } else b += icon(F, 'search', 660, 53, 20, C.t1, 2) + text(689, 69, 'Search or ask Co-pilot…', { size: 16, fill: C.t3 });
  s += g(F, m.mode === 'idle' ? 'Search bar' : `Search bar (${m.mode}) NEW`, b);
  s += g(F, 'Button Incident Management', rect(1103.5, 40.5, 256, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'extLink', 1121, 51, 22, '#FFFFFF', 2) + text(1150, 70, 'Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  return g(F, 'Header', s);
}

// ---------- centre views ----------
const LBL = { tailgate: 'D-214 · Tailgating', fence: 'Sector 5 · Intrusion' };
const markersFor = (labels = true) => ALERTS.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: labels ? LBL[a.key] : undefined, left: a.key === 'watch' || a.key === 'spoof' }));
const PIN1 = { id: 'result1', X: 86, Y: 24, sev: 'Critical', icon: 'door', num: 1 };
const PIN2 = { id: 'result2', X: 99, Y: 30, sev: 'Critical', icon: 'fence', num: 2 };
const PIN1_LABEL = 'T5 Pier B Service Door · closed 02:05 · Andrew Teo';
// whole airport (home); with o.results the two answered incidents are pinned as numbered result markers
function homeView(F, o = {}) {
  const P = camera(870, 520, 8.4, 50, 29);
  const mk = [...markersFor(), ...(o.results ? [{ ...PIN1, h: 4.5 }, { ...PIN2, h: 3.5 }] : [])];
  if (o.results) { const [hx, hy] = P(86, 24, 4.5); mark('pin1', [hx - 18, hy - 18, 36, 36]); const [gx, gy] = P(99, 30, 3.5); mark('pin2', [gx - 18, gy - 18, 36, 36]); }
  return scene(F, clayAirport(F, P, { markers: mk }));
}
// camera pin in the viewer (fence.mjs style)
function camPin(F, P, X, Y, label) {
  const [cx, cy] = P(X, Y, 0), [hx, hy] = P(X, Y, 1.6), col = '#55D6E6';
  let m = line(cx, cy, hx, hy, { stroke: col, sw: 2 }) + circle(hx, hy, 14, { fill: '#1D232C', stroke: col, sw: 2 }) + icon(F, 'cctv', hx - 9, hy - 9, 18, '#FFFFFF', 1.8);
  const lw = textWidth(label, 13, 500) + 20, lx = hx + 20, ly = hy - 14;
  m += rect(lx, ly, lw, 28, { r: 7, fill: '#1D232C', stroke: col, sw: 1.2 }) + text(lx + 10, ly + 19, label, { size: 13, weight: 500, fill: '#FFFFFF' });
  mark('camPin', [hx - 14, hy - 14, 34 + lw + 6, 28]);
  return g(F, `Camera ${label} NEW`, m);
}
// map flown to the T5 Pier B door (after Locate): result 1 labelled, result 2 and the door camera in view
function t5View(F) {
  const P = camera(700, 560, 16, 86, 24);
  // only the answered incidents are pinned here; the whole-airport alarm overlays would clutter the close-up
  const mk = [{ ...PIN1, h: 4, label: PIN1_LABEL }, { ...PIN2, h: 3.5, label: 'Fence Sector 15 · closed 01:49' }];
  let s = clayAirport(F, P, { markers: mk, lidar: false, alarmFence: false });
  s += camPin(F, P, 89.5, 27, 'CAM 5-210 · door');
  { const [hx, hy] = P(86, 24, 4); mark('pin1', [hx - 18, hy - 18, 36, 36]); mark('pinLabel', [hx + 22, hy - 16, textWidth(PIN1_LABEL, 14, 500) + 24, 32]); }
  return scene(F, s);
}

// ---------- the Co-pilot components (NEW) ----------
// typeahead dropdown under the search field: recent questions or suggestions
function typeahead(F, o) {
  const x = TX, y = DY, w = TW, rh = 40, n = o.rows.length, h = 32 + n * rh + 8 + 38;
  let s = rect(x, y, w, h, { r: 12, fill: C.panel, fo: 0.97, stroke: '#4A505B', sw: 1, filter: F.shadow(8, 12, 0.5) });
  s += text(x + 16, y + 23, o.title, { size: 11.5, weight: 700, ls: 1, fill: C.t2 });
  const rows = [];
  o.rows.forEach((r, i) => {
    const ry = y + 32 + i * rh, hl = i === o.hl;
    if (hl) s += rect(x + 6, ry, w - 12, rh - 2, { r: 6, fill: C.tabOn, fo: 0.9 });
    s += icon(F, r.icon || 'clock', x + 16, ry + 11, 16, hl ? '#FFFFFF' : C.t2, 1.8);
    s += r.runs ? rich(x + 40, ry + 24, r.runs, { size: 14 }) : text(x + 40, ry + 24, r.text, { size: 14, fill: C.t1 });
    if (r.time) s += text(x + w - 16, ry + 24, r.time, { size: 12.5, fill: C.t3, anchor: 'end' });
    rows.push([x + 6, ry, w - 12, rh - 2]);
  });
  const fy = y + 32 + n * rh + 8;
  s += line(x + 12, fy, x + w - 12, fy, { stroke: '#3A404B' }) + o.footer(x, fy, w);
  return { svg: g(F, o.name, s), h, rows };
}
// one result card inside the answer: severity, number, title, time, one fact line, Locate / Open
function resultCard(F, x, y, w, r, o = {}) {
  const h = 96;
  let s = '';
  if (o.selected) s += rect(x, y, w, h, { fill: C.selCard });
  s += rect(x, y, 4, h, { fill: SEVC[r.sev] });
  s += text(x + 18, y + 31, r.title, { size: 18, fill: C.t1 });
  const tw = textWidth(r.time, 14), nx = x + w - 18 - tw - 20;
  s += text(x + w - 18, y + 30, r.time, { size: 14, fill: C.t2, anchor: 'end' });
  s += circle(nx, y + 25, 9, { fill: SEVC[r.sev] }) + text(nx, y + 29, String(r.n), { size: 11, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  s += text(x + 18, y + 55, r.desc, { size: 15, fill: C.t2 });
  const ly = y + 80;
  s += icon(F, 'target', x + 18, ly - 14, 18, C.link, 1.8) + text(x + 41, ly, 'Locate', { size: 15, fill: C.link });
  const ox = x + 41 + textWidth('Locate', 15) + 26;
  s += icon(F, 'extLink', ox, ly - 14, 16, C.link, 1.8) + text(ox + 22, ly, r.open, { size: 15, fill: C.link });
  s += line(x, y + h, x + w, y + h, { stroke: '#2C3036' });
  return { svg: g(F, 'Result ' + r.title, s), h, locate: [x + 41, ly, textWidth('Locate', 15)], open: [ox + 22, ly, textWidth(r.open, 15)] };
}
// the answer panel: Co-pilot line, (follow-up chip), headline, fact line, result cards, sources, chips, (recent), logged
function answerPanel(F, a, o = {}) {
  const x = DX, y = DY, w = DW, L = { cards: [], locate: [], open: [], chips: [] };
  let d = '', cy = y + 48;
  d += icon(F, 'sparkle', x + 18, y + 18, 20, C.copilot, 2) + text(x + 46, y + 34, 'Co-pilot', { size: 18, weight: 700, fill: C.copilot }) + text(x + w - 18, y + 34, 'From live events · ' + T0, { size: 14, fill: C.t2, anchor: 'end' });
  if (a.asked) {   // the follow-up chip that was just clicked stays as the current question
    const lw = textWidth('FOLLOW-UP', 11.5, 700, 1), cx = x + 18 + lw + 12, tw = textWidth(a.asked, 14) + 24;
    d += text(x + 18, cy + 20, 'FOLLOW-UP', { size: 11.5, weight: 700, ls: 1, fill: C.t2 });
    d += g(F, 'Follow-up chip NEW', rect(cx, cy + 1, tw, 30, { r: 15, fill: C.tabOn }) + text(cx + 12, cy + 21, a.asked, { size: 14, fill: '#FFFFFF' }));
    L.asked = [cx, cy + 1, tw, 30];
    cy += 44;
  }
  const hl = wrap(a.headline, w - 36, 18, 500);
  hl.forEach((l, i) => { d += text(x + 18, cy + 20 + i * 24, l, { size: 18, weight: 500, fill: '#FFFFFF' }); });
  cy += hl.length * 24 + 2;
  const sl = wrap(a.sub, w - 36, 15);
  sl.forEach((l, i) => { d += text(x + 18, cy + 18 + i * 21, l, { size: 15, fill: C.t2 }); });
  cy += sl.length * 21 + 12;
  for (const r of a.results) { const c = resultCard(F, x, cy, w, r, { selected: o.selected === r.n }); d += c.svg; L.cards.push([x, cy, w, c.h]); L.locate.push(c.locate); L.open.push(c.open); cy += c.h; }
  const src = wrap('Sources: ' + a.sources, w - 36, 13.5);
  src.forEach((l, i) => { d += text(x + 18, cy + 26 + i * 18, l, { size: 13.5, fill: C.t2 }); });
  cy += 12 + src.length * 18 + 10;
  let cx = x + 18;
  for (const t of a.chips) {
    const tw = textWidth(t, 14) + 24;
    if (cx + tw > x + w - 18) { cx = x + 18; cy += 38; }
    d += g(F, 'Follow-up ' + t, rect(cx, cy, tw, 30, { r: 15, fill: C.devRow, stroke: '#4A505B' }) + text(cx + 12, cy + 20, t, { size: 14, fill: C.t1 }));
    L.chips.push([cx, cy, tw, 30]);
    cx += tw + 8;
  }
  cy += 42;
  if (a.recent) {   // the previous question stays one click away
    d += line(x + 18, cy, x + w - 18, cy, { stroke: '#3A404B' });
    d += icon(F, 'clock', x + 18, cy + 12, 16, C.t2, 1.8) + text(x + 42, cy + 25, 'RECENT', { size: 11.5, weight: 700, ls: 1, fill: C.t2 });
    const rx = x + 42 + textWidth('RECENT', 11.5, 700, 1) + 14;
    d += text(rx, cy + 25, a.recent[0], { size: 14, fill: C.link }) + text(x + w - 18, cy + 25, a.recent[1], { size: 12.5, fill: C.t3, anchor: 'end' });
    L.recent = [x + 18, cy + 4, w - 36, 34];
    cy += 40;
  }
  d += line(x + 18, cy, x + w - 18, cy, { stroke: '#3A404B' });
  d += icon(F, 'doc', x + 18, cy + 11, 15, C.t2, 1.8) + text(x + 40, cy + 23, `Logged · ${USER} · ${T0} · question, answer and sources`, { size: 12.5, fill: C.t2 });
  d += text(x + w - 18, cy + 23, 'Esc to close', { size: 12, fill: C.t3, anchor: 'end' });
  L.logged = [x + 18, cy + 6, 380, 24];
  L.h = cy + 36 - y;
  L.svg = g(F, 'Co-pilot answer dropdown NEW', rect(x, y, w, L.h, { r: 16, fill: C.panel, fo: 0.97, stroke: C.copilot, so: 0.6, sw: 1.2, filter: F.shadow(8, 12, 0.5) }) + d);
  return L;
}
const layout = a => answerPanel(new Frame('m'), a);   // dry run: positions of the links and chips
// the answer collapsed to one line after Locate: count, the selected result, Expand
function summaryBar(F) {
  const x = TX, y = DY, w = TW, h = 34, head = '2 results · T5 · ' + T0, lab = 'T5 Pier B Service Door';
  let s = rect(x, y, w, h, { r: 10, fill: C.panel, fo: 0.97, stroke: C.copilot, so: 0.6, sw: 1.2, filter: F.shadow(6, 10, 0.45) });
  s += icon(F, 'sparkle', x + 12, y + 9, 16, C.copilot, 2) + text(x + 34, y + 22, head, { size: 14, weight: 500, fill: '#FFFFFF' });
  const cx = x + 34 + textWidth(head, 14, 500) + 14, cw = textWidth(lab, 12.5, 500) + 22;
  s += g(F, 'Selected result NEW', rect(cx, y + 5, cw, 24, { r: 6, fill: C.selCard }) + rect(cx, y + 5, 3, 24, { r: 1.5, fill: C.crit }) + text(cx + 12, y + 21, lab, { size: 12.5, weight: 500, fill: C.t1 }));
  s += text(x + w - 32, y + 22, 'Expand', { size: 14, weight: 500, fill: C.link, anchor: 'end' }) + icon(F, 'chevD', x + w - 28, y + 9, 16, C.link, 2);
  return { svg: g(F, 'Co-pilot summary bar NEW', s), h, selected: [cx, y + 5, cw, 24], expand: [x + w - 32 - textWidth('Expand', 14, 500), y + 5, 54, 24] };
}

// ---------- frame template + annotation helpers ----------
function consoleFrame(title, o) {
  const F = new Frame(title, W, H);
  let s = o.center(F);
  s += headerX(F, { loc: o.loc, search: o.search });
  mark('searchBar', BAR);
  s += alertsPanel(F, { cluster: 'All terminals', counts: COUNTS, cards: plainCards(ALERTS, null) });
  s += deviceStatus(F, { online: 4812, offline: 6 });
  s += o.after(F);
  return F.render(s);
}
const chip = (F, key, x = 400, y = 100) => { const c = stageChip(F, x, y, key); mark('stage', [x, y, c.w, c.h]); return c.svg; };
const placeNote = (F, x, y, label, o = {}) => { const n = note(F, x, y, label, o); mark(o.kind === 'shows' ? 'noteShows' : 'noteUser', [x, y, n.w, n.h]); return n.svg; };
const noteR = (F, right, y, label, o = {}) => placeNote(F, right - (textWidth(label, 13, 700) + 24), y, label, o);   // right-aligned
const point = (F, x, y, o) => { mark('cursor', [x, y, 14, 24]); return cursor(F, x, y, o); };
const tip = (F, cx, y, label, o = {}) => { const w = textWidth(label, 13, 500) + 20; mark('tooltip', [o.left ? cx - w : o.right ? cx : cx - w / 2, y - 34, w, 26]); return tooltip(F, cx, y, label, o); };

// ---------- UC4-S1 · idle search bar, pointer hovering it ----------
export function s1() {
  return consoleFrame('UC4-S1 · Assist & govern · Search bar idle · hover', {
    center: homeView, search: { mode: 'idle' },
    after: F => {
      const [bx, by, bw, bh] = BAR, px = 760, py = 70;
      let s = btnState(F, bx, by, bw, bh, 'hover', { r: 8 });
      s += tip(F, px, by - 2, 'Search, or ask a question');
      s += point(F, px, py);
      s += chip(F, 'govern');
      s += placeNote(F, 600, 104, 'Hover · Search bar', { to: [px + 2, py + 2] });
      s += placeNote(F, 866, 5, 'Shows · Tooltip', { kind: 'shows', to: [px + (textWidth('Search, or ask a question', 13, 500) + 20) / 2 + 2, 20] });
      return s;
    },
  });
}

// ---------- UC4-S2 · focused: ring, caret, recent questions ----------
export function s2() {
  return consoleFrame('UC4-S2 · Assist & govern · Search bar focused · recent questions', {
    center: homeView, search: { mode: 'focus' },
    after: F => {
      const [bx, by, bw, bh] = BAR, px = 760, py = 72;
      let s = focusRing(F, bx, by, bw, bh, 8);
      const d = typeahead(F, { name: 'Recent questions NEW', title: 'RECENT QUESTIONS', rows: RECENT,
        footer: (x, fy, w) => icon(F, 'sparkle', x + 16, fy + 10, 16, C.copilot, 2) + text(x + 40, fy + 23, 'Ask anything about tonight', { size: 14, weight: 500, fill: C.copilot }) + text(x + w - 16, fy + 23, 'Enter to ask', { size: 12, fill: C.t3, anchor: 'end' }) });
      s += d.svg; mark('dropdown', [TX, DY, TW, d.h]); mark('recent1', d.rows[0]); mark('askHint', [TX + 6, DY + d.h - 38, TW - 12, 32]);
      s += point(F, px, py, { click: true });
      s += chip(F, 'govern');
      s += placeNote(F, 640, 5, 'Click · Search bar', { to: [px + 2, py + 2] });
      s += noteR(F, 1388, 150, 'Shows · Recent questions', { kind: 'shows', to: [TX + TW + 2, 164] });
      return s;
    },
  });
}

// ---------- UC4-S3 · typing "Show crit": suggestions, first highlighted ----------
export function s3() {
  const cx = 689 + textWidth(TYPED, 16) + 2;
  return consoleFrame('UC4-S3 · Assist & govern · Typing "Show crit" · suggestions', {
    center: homeView, search: { mode: 'typing', text: TYPED },
    after: F => {
      const [bx, by, bw, bh] = BAR;
      let s = focusRing(F, bx, by, bw, bh, 8);
      const rows = SUGGEST.map(q => ({ icon: 'search', runs: [{ t: TYPED, fill: '#FFFFFF', weight: 500 }, { t: q.slice(TYPED.length), fill: C.t1 }] }));
      const d = typeahead(F, { name: 'Suggestions NEW', title: 'SUGGESTIONS', rows, hl: 0,
        footer: (x, fy) => text(x + 16, fy + 23, 'Up / Down to choose · Enter to ask · Esc to close', { size: 12.5, fill: C.t3 }) });
      s += d.svg; mark('dropdown', [TX, DY, TW, d.h]); mark('suggestion1', d.rows[0]); mark('caret', [cx, 53, 2, 20]);
      const px = 1010, py = 74;
      s += point(F, px, py);
      s += chip(F, 'govern');
      s += placeNote(F, 600, 5, 'Type · Show crit', { to: [cx + 1, 63] });
      s += noteR(F, 1388, 150, 'Shows · Suggestions · first highlighted', { kind: 'shows', to: [TX + TW + 2, 151] });
      return s;
    },
  });
}

// ---------- UC4-S4 · the answer: headline, result cards, sources, follow-ups · hover on result 1 ----------
export function s4() {
  return consoleFrame('UC4-S4 · Correlate · Answer · results, sources, follow-ups · hover on a result card', {
    center: F => homeView(F, { results: true }), search: { mode: 'query', text: Q1 },
    after: F => {
      const p = answerPanel(F, ANS1);
      let s = p.svg;
      mark('answer', [DX, DY, DW, p.h]); mark('result1', p.cards[0]); mark('result2', p.cards[1]); mark('logged', p.logged); p.chips.forEach((c, i) => mark('chip' + (i + 1), c));
      const [cx0, cy0, cw, chh] = p.cards[0];
      s += hover(F, cx0, cy0 + 1, cw, chh - 2, { name: 'result card' });
      const [lx, ly, lw] = p.locate[0], [ox, oy, ow] = p.open[0];
      s += linkHover(F, lx, ly, lw) + linkHover(F, ox, oy, ow); mark('locate', [lx - 23, ly - 18, lw + 24, 26]); mark('openAlarm', [ox - 22, oy - 18, ow + 24, 26]);
      const px = cx0 + 520, py = cy0 + 82;
      s += tip(F, px, py - 6, 'CAM 5-210');
      s += point(F, px, py);
      s += chip(F, 'correlate', 1110, 100);   // the answer panel occupies the x 400 column; the chip sits in the open centre view
      s += noteR(F, 1388, cy0 + 70, 'Hover · T5 Pier B result card', { to: [px + 2, py + 2] });
      s += noteR(F, 1388, 146, 'Shows · Answer with sources', { kind: 'shows', to: [DX + DW + 2, 128] });
      return s;
    },
  });
}

// ---------- UC4-S5 · Locate clicked: map flies to T5 Pier B door, answer collapsed to one line ----------
export function s5() {
  const [lx, ly] = layout(ANS1).locate[0];
  return consoleFrame('UC4-S5 · Contextualise · Locate clicked · map flies to T5 Pier B door · results collapsed', {
    loc: ['Main Airport', 'T5'], center: t5View, search: { mode: 'query', text: Q1 },
    after: F => {
      const b = summaryBar(F);
      let s = b.svg; mark('summaryBar', [TX, DY, TW, b.h]); mark('selectedResult', b.selected); mark('expand', b.expand);
      const px = lx + 22, py = ly - 4;   // where the Locate link was (the panel has collapsed)
      s += point(F, px, py, { click: true });
      s += chip(F, 'context');
      s += placeNote(F, px + 30, py + 30, 'Click · Locate', { to: [px + 2, py + 2] });
      s += placeNote(F, 740, 400, 'Shows · Map flies to T5 Pier B door · results collapsed', { kind: 'shows', to: [760, 480] });
      return s;
    },
  });
}

// ---------- UC4-S6 · follow-up chip clicked: second answer, first question kept in Recent ----------
export function s6() {
  return consoleFrame('UC4-S6 · Assist & govern · Follow-up clicked · second answer · first question in Recent', {
    loc: ['Main Airport', 'T5'], center: t5View, search: { mode: 'query', text: Q2 },
    after: F => {
      const p = answerPanel(F, ANS2);
      let s = p.svg;
      mark('answer', [DX, DY, DW, p.h]); mark('followupChip', p.asked); mark('result1', p.cards[0]); mark('recentRow', p.recent); mark('logged', p.logged); p.chips.forEach((c, i) => mark('chip' + (i + 1), c));
      const [ax, ay, aw, ah] = p.asked;
      s += btnState(F, ax, ay, aw, ah, 'pressed', { r: 15 });
      const px = ax + aw - 10, py = ay + 21;   // pointer on the chip's right padding, not on its text
      s += point(F, px, py, { click: true });
      s += chip(F, 'govern', 1110, 100);   // as in S4: off the white T5 roof under the panel
      s += noteR(F, 1388, ay + 1, 'Click · follow-up chip', { to: [px + 2, py + 2] });
      s += noteR(F, 1388, p.recent[1] - 3, 'Shows · Recent keeps question 1', { kind: 'shows', to: [DX + DW + 2, p.recent[1] + 17] });
      return s;
    },
  });
}

export const FRAMES = [
  ['UC4-S1-search-idle-hover', s1],
  ['UC4-S2-search-focus-recent', s2],
  ['UC4-S3-typing-suggestions', s3],
  ['UC4-S4-answer-hover-result', s4],
  ['UC4-S5-locate-map-collapsed', s5],
  ['UC4-S6-followup-second-answer', s6],
];
