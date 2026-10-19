// UC1 · Overstay (Info) · end-to-end click flow in the current V11 UI, one state per frame.
// Journey: Detect → Correlate → Contextualise → Orchestrate → Assist & govern (DEMOFLOWS.md §4 UC1).
// Improvements applied: Co-pilot text only as the briefing block on the SOP Flow tab; the Investigation
// tab holds System facts only; alert cards carry no Co-pilot line. Names, IDs and times are illustrative.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, text, rich, icon, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, modelToggle, pill, alertCard, deviceStatus, timeline, remarksBox, sopFlow, scene, camTile } from '../../lib/v11.mjs';
import { camera, clayAirport } from '../../lib/clay.mjs';
import { cursor, hover, btnState, linkHover, tooltip, note, stageChip, copilotBriefing, confirmToast, plainCards } from '../../lib/demo.mjs';
import { ALERTS } from '../data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// ---------- anchors (key UI rects per frame, read by the boards / film) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- the scenario ----------
const KEY = 'overstay';
const LOC = ['Main Airport', 'T4'];
const COUNTS = [['2 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];
const START = 4;   // the list is scrolled so the Info card (last of 7) is in view: Belt 5, Gate B12, Baggage Hall B2
const EV = (badge, badgeCol) => ({ time: '01:45:20', id: 'ACS-B2', code: 'OVS-012', title: 'Baggage Hall B2', badge, badgeCol, lines: [['In zone since 22:05 · shift ended 01:00'], ['Card user ', { b: 'K. Lim' }, ', Card ID ', { b: 'C-11873' }]] });
const CAMS = [
  { href: cctv('baghall_clean'), label: 'Camera 4-018 · B2', focus: [0.62, 0.6], box: box('baghall', 'person'), boxCol: C.info, boxLabel: 'K. Lim · 3h 40m' },
  { href: cctv('baghall_clean'), label: 'Camera 4-019 · ULD row 3', focus: [0.8, 0.5], box: box('baghall', 'person'), boxCol: C.info, boxLabel: 'K. Lim' },
  { href: cctv('door_clean'), label: 'Camera 4-011 · B2 east door', focus: [0.7, 0.5], chips: [['REPLAY 22:05', C.info]] },   // badge-in replay, corroborates the ACS fact row
];
// System facts for the Investigation tab (no Co-pilot entry here: improvement 1)
const FACTS = [
  { who: 'System', time: '22:05:14', rows: [['22:05', 'Badge in · B2 east door · C-11873', 'ACS', C.green]] },
  { who: 'System', time: '01:45:20', text: 'Airport rules triggered (4 of 5) · dwell 3h 40m', size: 14, italic: true, rows: [
    ['00:00', 'Rule (i) · Restricted zone, wee hours', 'ACS', C.info],
    ['01:00', 'Rule (ii) · Outside scope of duty', 'Roster', C.info],
    ['01:00', 'Rule (iii) · Non-working hours', 'Roster', C.info],
    ['01:45', 'Rule (v) · 3h 40m vs 45 min usual', 'Dwell', C.info],
  ] },
];
const BRIEF = { text: 'K. Lim (contractor) badged into B2 at 22:05, no badge-out. Shift ended 01:00, B2 outside duty zones, no overtime.', sources: 'ACS events · roster · airport rules (i)–(v)', time: '01:45' };

// ---------- shared pieces (copied from frames.mjs / v11.mjs so this module controls scroll, badges, list offset) ----------
const markersFor = (labels = {}) => ALERTS.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: labels[a.key], left: a.key === 'watch' || a.key === 'spoof' }));
function viewer(F, o = {}) {
  const P = camera(o.sx ?? 870, o.sy ?? 520, o.sc ?? 8.4, o.cx ?? 50, o.cy ?? 29);
  return scene(F, clayAirport(F, P, { markers: o.markers || [], labels: o.labels }));
}
const B2 = { X: 66, Y: 29.5 };
const b2Marker = (label) => ({ id: KEY, X: B2.X, Y: B2.Y, sev: 'Info', icon: 'timer', h: 4, label });

// Real Time Alerts panel with an explicit scroll offset (the kit scrolls to the selected card only)
function alertsList(F, o) {
  const x = 40, y = 118, w = 336, h = 629;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.frame }) + rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });   // opaque backing: the zoomed map must not show through the cards
  const ws = COUNTS.map(([t]) => textWidth(t, 14, 500) + 16), tot = ws.reduce((a, b) => a + b, 0) + 8 * (COUNTS.length - 1);
  let cx = x + (w - tot) / 2;
  COUNTS.forEach(([t, col], i) => { s += pill(F, cx, 134, t, col).svg; cx += ws[i] + 8; });
  s += text(56, 204, 'Real Time Alerts', { size: 20, weight: 700, fill: '#FFFFFF' });
  s += icon(F, 'pin', 54, 214, 20, C.green, 2.2) + text(81, 231, 'All terminals', { size: 20, weight: 500, fill: C.green, underline: true });
  let tx = 60;
  ['All', 'Open', 'On Hold'].forEach((t, i) => { s += text(tx, 280, t, { size: 16, weight: i === 0 ? 500 : 400, fill: i === 0 ? C.link : C.t2 }); tx += textWidth(t, 16, 500) + 18; });
  let cy = 296, cards = '';
  for (const c of o.cards.slice(START)) {
    if (cy > y + h - 40) break;
    const r = alertCard(F, x, cy, w, c);
    cards += r.svg;
    if (c.key === KEY) { CARD = [x, cy, w, r.h]; if (o.onHold) cards += onHoldTag(F, x, cy, w, r.h); }
    cy += r.h;
  }
  s += `<g clip-path="${clip}">${cards}</g>`;
  const n = o.cards.length, track = h - 190, th = track * Math.min(1, 3.2 / n), ty = 300 + (track - th) * (START / Math.max(1, n - 3));
  s += rect(x + w - 6, ty, 3, th, { r: 1.5, fill: '#FFFFFF', fo: 0.25 });
  return g(F, 'Real Time Alerts', s);
}
let CARD = null;   // on-screen rect of the Info card, read back after alertsList()
const locateLink = () => [CARD[0] + 39, CARD[1] + CARD[3] - 24];   // text x, baseline of the card's Locate link
function onHoldTag(F, x, y, w, h) {
  const p = pill(F, 0, 0, 'On Hold', '#5A606B', { h: 20, size: 13 });
  const px = x + w - 16 - textWidth('01:45 am', 14) - 10 - p.w, py = y + 18;
  mark('onHold', [px, py, p.w, 20]);
  return g(F, 'On Hold tag NEW', pill(F, px, py, 'On Hold', '#5A606B', { h: 20, size: 13 }).svg);
}

// event head with a severity-coloured badge (the kit's is always a red "Now")
function eventHeadX(F, x, y, w, ev) {
  let s = icon(F, 'clock', x, y - 14, 17, C.t2, 1.8) + text(x + 24, y, ev.time, { size: 16, fill: C.t1 });
  let cx = x + 24 + textWidth(ev.time, 16) + 18;
  s += text(cx, y, 'ID:', { size: 16, fill: C.t2 }); cx += textWidth('ID:', 16) + 8;
  s += text(cx, y, ev.id, { size: 16, fill: C.t1 }); cx += textWidth(ev.id, 16) + 18;
  s += text(cx, y, 'Code:', { size: 16, fill: C.t2 }); cx += textWidth('Code:', 16) + 8;
  s += text(cx, y, ev.code, { size: 16, fill: C.t1 });
  s += text(x, y + 32, ev.title, { size: 20, weight: 500, fill: C.t1 });
  const bw = textWidth(ev.badge || 'Now', 14, 500) + 16;
  s += pill(F, x + w - bw, y + 15, ev.badge || 'Now', ev.badgeCol || C.crit).svg;
  (ev.lines || []).forEach((runs, i) => { s += rich(x, y + 59 + i * 22, runs.map(r => typeof r === 'string' ? { t: r, fill: C.t2 } : { t: r.b, fill: '#FFFFFF', weight: 500 }), { size: 16 }); });
  return s;
}
// Active Alarms panel with a scrollable tab body (o.scroll = px scrolled)
function alarmsPanel(F, o) {
  const x = 900, y = 125, w = 460, h = 904;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });
  s += `<g clip-path="${clip}">${rect(x, 161.8, w, 868, { fill: C.body, fo: 0.8 })}</g>`;
  s += text(916, 149, 'Active Alarms', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 1323, 132, 22, '#FFFFFF', 2.2);
  s += eventHeadX(F, 916, 194, 428, o.ev);
  s += camTile(F, 916, 296, 210, 248, CAMS[0]) + camTile(F, 1134, 296, 210, 120, CAMS[1]) + camTile(F, 1134, 424, 210, 120, CAMS[2]);
  const ti = o.tab || 0;
  s += g(F, 'Tabs', rect(916, 560, 214, 40, { fill: ti === 0 ? C.tabOn : C.tabOff }) + rect(1130, 560, 214, 40, { fill: ti === 1 ? C.tabOn : C.tabOff }) +
    text(1023, 587, 'Investigation', { size: 18, weight: 700, fill: ti === 0 ? '#FFFFFF' : '#8E9CC0', anchor: 'middle' }) + text(1237, 587, 'SOP Flow', { size: 18, weight: 700, fill: ti === 1 ? '#FFFFFF' : '#8E9CC0', anchor: 'middle' }));
  mark('tabInvestigation', [916, 560, 214, 40]); mark('tabSop', [1130, 560, 214, 40]);
  const bodyH = 356;
  s += rect(916, 600, 428, bodyH, { fill: C.tabBody });
  const bclip = F.clip(`<rect x="916" y="600" width="428" height="${bodyH}"/>`);
  const content = o.body(F, 916, 600, 428, bodyH);
  const sc = o.scroll === 'end' ? Math.max(0, content.h - bodyH) : (o.scroll || 0);
  SCROLLED = sc;
  s += g(F, ti === 0 ? 'Investigation tab' : 'SOP Flow tab', `<g clip-path="${bclip}"><g transform="translate(0 ${f(-sc)})">${content.svg}</g></g>`);
  if (content.h > bodyH) {
    const th = Math.max(24, bodyH * bodyH / content.h - 8), ty = 604 + (bodyH - 8 - th) * Math.min(1, sc / (content.h - bodyH));
    s += rect(1338, ty, 3, th, { r: 1.5, fill: '#FFFFFF', fo: 0.35 });
    if (sc < content.h - bodyH) s += rect(916, 600 + bodyH - 28, 428, 28, { fill: F.lin([[0, C.tabBody, 0], [1, C.tabBody, 1]], 0, 0, 0, 1) });
    if (sc > 0) s += rect(916, 600, 428, 20, { fill: F.lin([[0, C.tabBody, 1], [1, C.tabBody, 0]], 0, 0, 0, 1) });
  }
  s += g(F, 'Footer buttons',
    rect(916.5, 966.5, 71, 43, { r: 7.5, stroke: '#717171' }) + text(952, 995, 'Clear', { size: 20, weight: 500, fill: C.t3, anchor: 'middle' }) +
    rect(1004, 966, 166, 44, { r: 8, fill: C.red }) + icon(F, 'bell', 1032, 977, 22, '#FFFFFF', 2) + text(1064, 995, 'Escalate', { size: 20, weight: 700, fill: '#FFFFFF' }) +
    rect(1178, 966, 166, 44, { r: 8, fill: C.blue }) + text(1261, 995, 'Acknowledge', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  mark('ack', [1178, 966, 166, 44]); mark('escalate', [1004, 966, 166, 44]);
  return g(F, 'Active Alarms', s);
}
// Investigation tab: System entries (facts) + remarks
const investigation = (F, x, y, w) => {
  const tl = timeline(F, x + 16, y + 12, w - 32, FACTS, { gap: 8 });
  mark('facts', [x + 16, y + 12, w - 32, tl.h]);
  const ry = y + 12 + tl.h + 4;
  return { svg: tl.svg + remarksBox(F, x + 16, ry, w - 32, { h: 48 }), h: ry - y + 24 + 48 + 10 + 40 + 16 };
};
// SOP Flow tab: Co-pilot briefing above SOP-OPS-003 (improvement 1)
let POS = [], SCROLLED = 0;
const sopBody = (steps) => (F, x, y, w) => {
  const b = copilotBriefing(F, x + 16, y + 6, w - 32, BRIEF);
  mark('briefing', [x + 16, y + 6, w - 32, b.h]);
  POS = [];
  const sf = sopFlow(F, x, y + 6 + b.h + 4, w, steps, { caption: 'SOP-OPS-003 · Overstay in a restricted zone', captionIcon: 'doc', captionCol: C.t2, pos: POS });
  return { svg: b.svg + sf.svg, h: 6 + b.h + 4 + sf.h + 8 };
};
const STEPS_S4 = [
  { title: 'Rules check', state: 'done', tag: 'Auto · rules (i)(ii)(iii)(v)' },
  { title: 'Radio check', state: 'critical', tag: 'Your decision', text: 'Radio K. Lim on Ch 4. No answer in 2 min: send the B2 patrol.', actions: [['Call K. Lim', 'blue'], ['Send patrol', 'grey']] },
  { title: 'Confirm reason', state: 'todo', text: 'Record what K. Lim says (works, delay, error).' },
  { title: 'Log and acknowledge', state: 'todo', text: 'Audit: rule set, operator, time. Card moves to On Hold.' },
];
const STEPS_S5 = [
  { title: 'Rules check', state: 'done', tag: 'Auto · rules (i)(ii)(iii)(v)' },
  { title: 'Radio check', state: 'done', tag: 'Approved · Nurul A. · 01:50', text: 'Call K. Lim · answered 01:51 on Ch 4.' },
  { title: 'Confirm reason', state: 'done', tag: 'Nurul A. · 01:51', text: 'Finishing a ULD repair, no overtime filed.' },
  { title: 'Log and acknowledge', state: 'done', tag: 'Nurul A. · 01:52', text: 'Audit line written; card moves to On Hold.', items: [['Rules (i)(ii)(iii)(v) logged', true], ['Radio check logged · 01:51', true], ['Acknowledged · Nurul A. · 01:52', true]] },
];
// Context card in the viewer after Locate (roster, duty zones, overtime)
function contextCard(F, x, y, w) {
  const rows = [['users', 'Roster', 'K. Lim · contractor · shift ended 01:00'], ['pin', 'Duty zones', 'B1, Apron Bay 12 · B2 is outside'], ['clock', 'Overtime', 'None requested tonight']];
  const h = 50 + rows.length * 40 + 6;
  let s = rect(x, y, w, h, { r: 12, fill: '#1D232C', fo: 0.95, stroke: '#3E4655', filter: F.shadow(8, 14, 0.45) });
  s += icon(F, 'idcard', x + 16, y + 15, 18, '#55D6E6', 1.9) + text(x + 42, y + 30, 'Context · B2', { size: 16, weight: 700, fill: '#FFFFFF' }) + text(x + w - 16, y + 30, 'ACS · roster', { size: 13, fill: C.t2, anchor: 'end' });
  rows.forEach(([ic, lab, val], i) => {
    const ry = y + 50 + i * 40;
    s += icon(F, ic, x + 16, ry + 4, 16, C.t2, 1.8) + text(x + 40, ry + 13, lab, { size: 12, weight: 700, ls: 0.6, fill: C.t2 });
    s += text(x + 40, ry + 31, val, { size: 13.5, fill: '#FFFFFF' });
  });
  mark('context', [x, y, w, h]);
  return { svg: g(F, 'Context NEW', s), h };
}
// console frame: centre view, header, lists, optional Active Alarms, then the interaction layer
function consoleFrame(title, o) {
  const F = new Frame(title, W, H);
  let s = o.center(F);
  s += header(F, { loc: LOC });
  if (o.toggle) s += modelToggle(F);
  s += alertsList(F, { cards: plainCards(ALERTS, o.sel), onHold: o.onHold });
  mark('card', CARD);
  s += deviceStatus(F, { online: 4812, offline: 6 });
  if (o.alarm) s += alarmsPanel(F, o.alarm);
  const ch = stageChip(F, 400, 98, o.stage); s += ch.svg; mark('stage', [400, 98, ch.w, ch.h]);
  s += o.after(F);
  return F.render(s);
}
const placeNote = (F, x, y, label, o) => { const n = note(F, x, y, label, o); mark(o.kind === 'shows' ? 'noteShows' : 'noteUser', [x, y, n.w, n.h]); return n.svg; };
const homeView = F => viewer(F, { markers: markersFor({ tailgate: 'D-214 · Tailgating', fence: 'Sector 5 · Intrusion', overstay: 'B2 · Overstay' }) });
const b2View = F => viewer(F, { sx: 640, sy: 500, sc: 15, cx: B2.X, cy: B2.Y, markers: [b2Marker('B2 · K. Lim · since 22:05')] });

// ---------- S1 · Detect: Info card at the bottom of the list, hover ----------
export function s1() {
  return consoleFrame('UC1-S1 · Detect · Info card in Real Time Alerts (hover)', {
    stage: 'detect', toggle: true, sel: null, center: homeView,
    after: F => {
      const [x, y, w, h] = CARD, px = x + w - 60, py = y + h - 30, tw = textWidth('Open alarm', 13, 500) + 20;
      let s = hover(F, x, y + 1, w, h - 2, { name: 'card' });
      s += tooltip(F, px, py - 2, 'Open alarm'); mark('tooltip', [px - tw / 2, py - 36, tw, 26]);
      s += cursor(F, px, py);
      s += placeNote(F, 400, 634, 'Hover · Baggage Hall B2 card', { to: [px + 2, py + 2] });
      s += placeNote(F, 400, 674, 'Shows · Info card · rules (i)(ii)(iii)(v) fired', { kind: 'shows', to: [x + w + 2, y + 24] });
      return s;
    },
  });
}
// ---------- S2 · Correlate: card clicked, Investigation tab with System facts ----------
export function s2() {
  return consoleFrame('UC1-S2 · Correlate · Alarm opened · Investigation (System facts)', {
    stage: 'correlate', sel: KEY, center: homeView,
    alarm: { ev: EV('Info', C.info), tab: 0, body: investigation },
    after: F => {
      const [x, y, w, h] = CARD, px = 336, py = 592;
      let s = cursor(F, px, py, { click: true });
      s += placeNote(F, 400, 634, 'Click · Baggage Hall B2 card', { to: [px + 2, py + 2] });
      s += placeNote(F, 600, 690, 'Shows · Investigation · System facts only', { kind: 'shows', to: [914, 700] });
      return s;
    },
  });
}
// ---------- S3 · Contextualise: Locate clicked, map on B2, context card ----------
export function s3() {
  return consoleFrame('UC1-S3 · Contextualise · Locate · map on B2 + context', {
    stage: 'context', sel: KEY,
    center: F => b2View(F) + contextCard(F, 400, 580, 284).svg,
    alarm: { ev: EV('Info', C.info), tab: 0, body: investigation },
    after: F => {
      const [lx, ly] = locateLink(), lw = textWidth('Locate', 16), px = lx + 30, py = ly - 6;
      let s = linkHover(F, lx, ly, lw); mark('locate', [lx - 23, ly - 18, lw + 24, 26]);
      s += cursor(F, px, py, { click: true });
      s += placeNote(F, 56, 650, 'Click · Locate', { to: [px + 2, py + 2] });
      s += placeNote(F, 400, 536, 'Shows · Map flies to B2 · roster, duty zones, overtime', { kind: 'shows', to: [430, 580] });
      return s;
    },
  });
}
// ---------- S4 · Orchestrate: SOP Flow tab · briefing + SOP-OPS-003, hover on Call K. Lim ----------
export function s4() {
  return consoleFrame('UC1-S4 · Orchestrate · SOP Flow · Co-pilot briefing + radio-check SOP (hover Call K. Lim)', {
    stage: 'orchestrate', sel: KEY,
    center: F => b2View(F) + contextCard(F, 400, 580, 284).svg,
    alarm: { ev: EV('Info', C.info), tab: 1, body: sopBody(STEPS_S4) },
    after: F => {
      const [bx, by, bw, bh] = POS[1].actions[0];
      mark('callBtn', [bx, by, bw, bh]); mark('sendPatrol', POS[1].actions[1]); mark('step2', [916, POS[1].y, 428, POS[1].h]);
      const px = bx + bw - 14, py = by + bh - 8;
      let s = btnState(F, bx, by, bw, bh, 'hover', { r: 6 });
      s += cursor(F, px, py);
      s += placeNote(F, 700, 922, 'Hover · Call K. Lim', { to: [px + 2, py + 2] });
      s += placeNote(F, 420, 780, 'Shows · Co-pilot briefing above SOP-OPS-003', { kind: 'shows', to: [930, 672] });
      return s;
    },
  });
}
// ---------- S5 · Assist & govern: Acknowledge clicked · confirmation, card On Hold ----------
export function s5() {
  return consoleFrame('UC1-S5 · Assist & govern · Acknowledge · confirmation, audit line, card On Hold', {
    stage: 'govern', sel: KEY, onHold: true,
    center: F => b2View(F) + contextCard(F, 400, 580, 284).svg,
    alarm: { ev: EV('On Hold', '#5A606B'), tab: 1, body: sopBody(STEPS_S5), scroll: 'end' },
    after: F => {
      const [ax, ay, aw, ah] = [1178, 966, 166, 44], px = 1268, py = 984;
      let s = btnState(F, ax, ay, aw, ah, 'pressed', { r: 8 });
      if (POS[3]) mark('step4', [916, POS[3].y - SCROLLED, 428, POS[3].h]);
      s += cursor(F, px, py, { click: true });
      s += confirmToast(F, 520, 940, 'Acknowledged · Nurul A. · 01:52', 'Logged: rules (i)(ii)(iii)(v) · radio check done'); mark('toast', [520, 940, 360, 70]);
      s += placeNote(F, 1012, 1028, 'Click · Acknowledge', { to: [px + 2, py + 2] });
      s += placeNote(F, 520, 896, 'Shows · Confirmation · audit line · card On Hold', { kind: 'shows', to: [560, 940] });
      return s;
    },
  });
}

export const FRAMES = [
  ['UC1-S1-detect-info-card-hover', s1],
  ['UC1-S2-correlate-investigation-facts', s2],
  ['UC1-S3-contextualise-locate-b2', s3],
  ['UC1-S4-orchestrate-sop-flow-briefing', s4],
  ['UC1-S5-govern-acknowledge-on-hold', s5],
];
