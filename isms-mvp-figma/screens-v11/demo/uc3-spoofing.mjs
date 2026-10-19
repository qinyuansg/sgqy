// UC3 · Identity spoofing (Warning) · end-to-end click flow in the current V11 UI, one state per frame.
// Journey: Detect (S1) → Correlate (S2) → Contextualise (S3 compare, S4 locate) → Orchestrate (S5 hover Suspend,
// S6 approved) → Assist & govern (S7 escalate dialog, S8 incident created)  (DEMOFLOWS.md §4 UC3).
// Improvements applied: Co-pilot text only as the briefing at the top of the SOP Flow tab; the Investigation tab
// lists System facts only; alert cards carry no Co-pilot line (plainCards). People decide: Suspend and Create
// Incident are clicked and recorded with name and clock time. Names, IDs and times are illustrative (02:14 night).
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, poly, text, rich, icon, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, W, H, asset, header, modelToggle, pill, alertCard, deviceStatus, timeline, remarksBox, sopFlow, scene, camTile } from '../../lib/v11.mjs';
import { camera, clayAirport, marker } from '../../lib/clay.mjs';
import { cursor, hover, btnState, linkHover, tooltip, note, stageChip, copilotBriefing, confirmToast, plainCards } from '../../lib/demo.mjs';
import { ALERTS } from '../data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// ---------- anchors: on-screen rects of the key UI elements per frame (boards / film read them) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR && r) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- the scenario ----------
const KEY = 'spoof';
const LOC = ['Main Airport', 'T1'];
const COUNTS = [['2 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];
const START = 2;   // the list is scrolled so the Warning card (4th of 7) is second in view: Row K, T1 Door C2, Belt 5, Gate B12
const DOORS = { C2: { X: 19, Y: 36 }, A17: { X: 47, Y: 16 } };   // world positions on the clay twin
const EV = { time: '02:13:20', id: 'ACS-C2', code: 'IDS-207', title: 'T1 Door C2', badge: 'Warning', badgeCol: C.warn, lines: [['Opened 4 min after T3 A17 · fastest route 19 min'], ['Card user ', { b: 'M. Rahman' }, ', Card ID ', { b: 'S-20931' }]] };
const CAM = {
  c2: (o = {}) => ({ href: cctv('doorC2_clean'), label: 'Camera 1-204 · Door C2 · now', focus: [0.55, 0.58], box: box('doorC2', 'person'), boxCol: C.crit, boxLabel: 'Not the holder', ...o }),
  a17: (o = {}) => ({ href: cctv('doorA17_clean'), label: 'Camera 3-052 · A17 · 02:09', focus: [0.45, 0.58], box: box('doorA17', 'person'), boxCol: C.green, boxLabel: 'Holder', ...o }),
  zoom: (o = {}) => ({ href: cctv('doorC2_clean'), label: 'Appearance · C2 (zoom)', zoom: 1.8, focus: [0.547, 0.6], ...o }),
};
const TILES = () => [CAM.c2({ chips: [['LIVE', C.crit]] }), CAM.a17(), CAM.zoom()];
const TILE_A17 = [1134, 296, 210, 120];
// System facts for the Investigation tab (no Co-pilot entry here: improvement 1)
const FACTS = [
  { who: 'System', time: '02:13:22', text: '5 alarms linked into this event', size: 14, italic: true, rows: [
    ['02:09:12', 'Granted · T3 A17 (new SSID)', 'ACS', C.green],
    ['02:12:05', 'Denied ×3 · T1 C3', 'ACS', C.warn],
    ['02:13:20', 'Granted · T1 C2 (legacy SSID)', 'ACS', C.crit],
    ['02:13:21', 'Appearance differs from holder', 'CAM 1-204', C.crit],
    ['02:13:22', 'Off-roster access · M. Rahman', 'Roster', C.warn],
  ] },
  { who: 'System', time: '02:13:24', text: 'Context checked', size: 14, italic: true, rows: [
    ['02:13:24', 'Fastest route A17 → C2 · 19 min', 'Wayfinding', '#FFFFFF'],
    ['02:13:24', 'Card S-20931 · 2 SSIDs active', 'ACS', '#FFFFFF'],
    ['02:13:24', 'Holder M. Rahman · shift ended 23:00', 'Roster', '#FFFFFF'],
  ] },
];
const BRIEF = { text: 'One card at two doors: A17 02:09:12, C2 02:13:20; fastest route 19 min. Person at C2 is not the holder M. Rahman. C2 used legacy SSID S-20931-L, due for revocation.', sources: 'ACS grants · CAM 1-204 · CAM 3-052 · roster', time: '02:13:26' };
const REMARKS = 'Card S-20931 (holder M. Rahman) opened T3 A17 at 02:09:12 and T1 C2 at 02:13:20; fastest route 19 min. Person at C2 does not match the holder (CAM 1-204 vs CAM 3-052). C2 used legacy SSID S-20931-L. Both SSIDs suspended 02:16:05, approved by Siti K.';

// ---------- shared pieces (copied from frames.mjs / v11.mjs so this module controls scroll, badges, list offset) ----------
const markersFor = (labels = {}) => ALERTS.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: labels[a.key], left: a.key === 'watch' || a.key === 'spoof' }));
function viewer(F, o = {}) {
  const P = camera(o.sx ?? 870, o.sy ?? 520, o.sc ?? 8.4, o.cx ?? 50, o.cy ?? 29);
  return scene(F, clayAirport(F, P, { markers: o.markers || [], labels: o.labels }));
}
const homeView = F => viewer(F, { markers: markersFor({ tailgate: 'D-214 · Tailgating', fence: 'Sector 5 · Intrusion', spoof: 'C2 · Same card as A17' }) });
const c2View = F => viewer(F, { sx: 640, sy: 500, sc: 15, cx: DOORS.C2.X, cy: DOORS.C2.Y, markers: [{ id: KEY, X: DOORS.C2.X, Y: DOORS.C2.Y, sev: 'Warning', icon: 'idcard', h: 4, label: 'T1 Door C2 · same card as A17' }] });
// Locate: both doors on the clay twin with the fastest walking route between them
const ROUTE = [[47, 16], [47, 23], [41, 23], [41, 44.5], [21, 44.5], [21, 36], [19, 36]];
function routeView(F) {
  const P = camera(640, 540, 10, 33, 26);
  let s = clayAirport(F, P, { markers: [] });
  const pts = ROUTE.map(([a, b]) => P(a, b, 0.15));
  let r = pathEl('M' + pts.map(p => p.map(f).join(' ')).join(' L'), { stroke: '#55D6E6', sw: 7, so: 0.22, cap: 'round', join: 'round' });
  r += pathEl('M' + pts.map(p => p.map(f).join(' ')).join(' L'), { stroke: '#55D6E6', sw: 2.5, dash: '9 6', cap: 'round', join: 'round' });
  const [mx, my] = P(41, 33.5, 0.15), lab = 'Fastest route · 19 min', lw = textWidth(lab, 13, 500) + 44;
  r += rect(mx + 14, my - 14, lw, 28, { r: 7, fill: '#1D232C', fo: 0.95, stroke: '#55D6E6', sw: 1.2 }) + icon(F, 'route', mx + 24, my - 8, 16, '#55D6E6', 2) + text(mx + 46, my + 5, lab, { size: 13, weight: 500, fill: '#FFFFFF' });
  mark('route', [mx + 14, my - 14, lw, 28]);
  s += g(F, 'Route A17 to C2 NEW', r);
  s += marker(F, P, { id: 'a17', X: DOORS.A17.X, Y: DOORS.A17.Y, sev: 'Info', col: C.link, icon: 'door', h: 4, label: 'T3 Door A17 · 02:09:12', left: true });
  s += marker(F, P, { id: KEY, X: DOORS.C2.X, Y: DOORS.C2.Y, sev: 'Warning', icon: 'idcard', h: 4, label: 'T1 Door C2 · 02:13:20' });
  { const [hx, hy] = P(DOORS.A17.X, DOORS.A17.Y, 4), lw2 = textWidth('T3 Door A17 · 02:09:12', 14, 500) + 24; mark('doorA17', [hx - 22 - lw2, hy - 16, lw2 + 37, 32]); }
  { const [hx, hy] = P(DOORS.C2.X, DOORS.C2.Y, 4), lw2 = textWidth('T1 Door C2 · 02:13:20', 14, 500) + 24; mark('doorC2', [hx - 15, hy - 16, lw2 + 37, 32]); }
  return scene(F, s);
}

// Real Time Alerts panel with an explicit scroll offset (the kit scrolls to the selected card only)
let CARD = null;   // on-screen rect of the Warning card, read back after alertsList()
function alertsList(F, o) {
  const x = 40, y = 118, w = 336, h = 629;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });
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
    if (c.key === KEY) CARD = [x, cy, w, r.h];
    cy += r.h;
  }
  s += `<g clip-path="${clip}">${cards}</g>`;
  const n = o.cards.length, track = h - 190, th = track * Math.min(1, 3.2 / n), ty = 300 + (track - th) * (START / Math.max(1, n - 3));
  s += rect(x + w - 6, ty, 3, th, { r: 1.5, fill: '#FFFFFF', fo: 0.25 });
  return g(F, 'Real Time Alerts', s);
}
const locateLink = () => [CARD[0] + 39, CARD[1] + CARD[3] - 24];   // text x, baseline of the card's Locate link

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
// Active Alarms panel with a scrollable tab body (o.scroll = px scrolled | 'end')
let SCROLLED = 0;
function alarmsPanel(F, o) {
  const x = 900, y = 125, w = 460, h = 904;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });
  s += `<g clip-path="${clip}">${rect(x, 161.8, w, 868, { fill: C.body, fo: 0.8 })}</g>`;
  s += text(916, 149, 'Active Alarms', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 1323, 132, 22, '#FFFFFF', 2.2);
  s += eventHeadX(F, 916, 194, 428, EV);
  const cams = o.cams || TILES();
  s += camTile(F, 916, 296, 210, 248, cams[0]) + camTile(F, 1134, 296, 210, 120, cams[1]) + camTile(F, 1134, 424, 210, 120, cams[2]);
  mark('tileC2', [916, 296, 210, 248]); mark('tileA17', TILE_A17);
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
  if (sc && CUR && ANCHORS[CUR]) for (const k of ['briefing', 'step2', 'suspend', 'keepActive']) if (ANCHORS[CUR][k]) ANCHORS[CUR][k][1] = Math.round((ANCHORS[CUR][k][1] - sc) * 10) / 10;
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
  const tl = timeline(F, x + 16, y + 12, w - 32, FACTS, { gap: 10 });
  mark('facts', [x + 16, y + 12, w - 32, tl.h]);
  const ry = y + 12 + tl.h + 4;
  return { svg: tl.svg + remarksBox(F, x + 16, ry, w - 32, { h: 56 }), h: ry - y + 24 + 56 + 10 + 40 + 16 };
};
// SOP Flow tab: Co-pilot briefing on top (improvement 1), then SOP-ACS-007 steps
const SOP = (stage = 0) => [
  { title: 'Compare doors', state: 'done', tag: 'Auto · 02:13:24' },
  stage === 0 ? { title: 'Suspend card S-20931', state: 'critical', tag: 'Your approval', text: 'Both SSIDs (new + legacy S-20931-L) at all readers.', actions: [['Suspend', 'blue'], ['Keep active', 'grey']] }
    : { title: 'Suspend card S-20931', state: 'done', tag: 'Approved · Siti K. · 02:16:05', text: 'Both SSIDs suspended at all readers.', items: [['New SSID S-20931-N suspended · 02:16:06', true], ['Legacy SSID S-20931-L suspended · 02:16:06', true]] },
  { title: 'Notify duty manager', state: stage >= 2 ? 'done' : 'todo', tag: stage >= 2 ? 'Sent · Siti K. · 02:16:40' : 'Next', text: 'Call Daniel (duty manager), send the door comparison.' },
  { title: 'Log and escalate', state: 'todo', tag: stage >= 2 ? 'In progress' : null, text: 'Audit: grants, route check, suspension, operator, time.' },
];
let POS = [];
const sopBody = (stage, pos) => (F, x, y, w) => {
  const b = copilotBriefing(F, x + 16, y + 10, w - 32, BRIEF);
  mark('briefing', [x + 16, y + 10, w - 32, b.h]);
  const p = pos || (POS = []);
  const sf = sopFlow(F, x, y + 10 + b.h + 8, w, SOP(stage), { caption: 'SOP-ACS-007 · Credential misuse', captionIcon: 'doc', captionCol: C.t2, pos: p });
  if (p[1]) mark('step2', [x, p[1].y, w, p[1].h]);
  if (p[1] && p[1].actions[0]) { mark('suspend', p[1].actions[0]); mark('keepActive', p[1].actions[1]); }
  return { svg: b.svg + sf.svg, h: 10 + b.h + 8 + sf.h + 8 };
};
// layout read-back for the SOP (positions of the step rows and action buttons on screen)
function sopLayout(stage) { const pos = []; sopBody(stage, pos)(new Frame('m'), 916, 600, 428, 356); return pos; }

// ---------- NEW pieces of this use case ----------
// Compare overlay in the centre view: the hovered A17 tile enlarged next to C2 now, with the travel-time line
function compareOverlay(F, x, y, w) {
  const tw = (w - 32 - 12) / 2, th = 190, ty = y + 48;
  const h = 48 + th + 8 + 20 + 30 + 14 + 28 + 16;
  let s = rect(x, y, w, h, { r: 12, fill: '#1D232C', fo: 0.97, stroke: '#3E4655', filter: F.shadow(10, 18, 0.5) });
  s += icon(F, 'swap', x + 16, y + 14, 18, '#55D6E6', 1.9) + text(x + 42, y + 29, 'Compare · card S-20931', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', x + w - 34, y + 14, 18, '#FFFFFF', 2.2);
  { const lab = 'Impossible presence', pw = textWidth(lab, 11.5, 700) + 16; s += rect(x + w - 44 - pw, y + 13, pw, 20, { r: 10, fill: C.warn, fo: 0.2, stroke: C.warn, sw: 1 }) + text(x + w - 44 - pw + 8, y + 27, lab, { size: 11.5, weight: 700, fill: C.warn }); }
  s += camTile(F, x + 16, ty, tw, th, CAM.c2({ label: 'CAM 1-204 · T1 Door C2 · now', focus: [0.56, 0.58], zoom: 1.25, chips: [['LIVE', C.crit]] }));
  s += camTile(F, x + 16 + tw + 12, ty, tw, th, CAM.a17({ label: 'CAM 3-052 · T3 Door A17 · 02:09', focus: [0.46, 0.58], zoom: 1.25, chips: [['Recorded', '#3A404B']] }));
  const cy = ty + th + 22;
  s += text(x + 16, cy, 'Cap, dark jacket, no lanyard', { size: 13, fill: '#FF8E8F' }) + text(x + 16 + tw + 12, cy, 'Holder M. Rahman · lanyard and badge', { size: 13, fill: '#9BE37A' });
  const ry = cy + 30;
  s += icon(F, 'route', x + 16, ry - 14, 18, '#55D6E6', 2) + text(x + 42, ry, 'Fastest route A17 → C2: 19 min · elapsed 4 min', { size: 14, weight: 500, fill: '#FFFFFF' });
  let bx = x + 16; const by = ry + 14;
  for (const lab of ['Swap', 'Zoom faces', 'Add to evidence']) {
    const bw = textWidth(lab, 13, 700) + 24;
    s += g(F, 'Compare action ' + lab, rect(bx, by, bw, 28, { r: 6, fill: '#3A404B' }) + text(bx + bw / 2, by + 18.5, lab, { size: 13, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
    bx += bw + 8;
  }
  mark('compare', [x, y, w, h]);
  return { svg: g(F, 'Compare NEW', s), h };
}
// Context card in the centre view after Locate: grants, travel time, the legacy SSID note
function contextCard(F, x, y, w) {
  const rows = [['door', 'Grants', ['A17 02:09:12 → C2 02:13:20 · card S-20931']], ['route', 'Travel time', ['Fastest route 19 min · elapsed 4 min']], ['key', 'Credential', ['Legacy SSID S-20931-L should have been', 'revoked · replaced 03 Mar']]];
  let h = 50; for (const r of rows) h += 22 + r[2].length * 18 + 2;
  h += 6;
  let s = rect(x, y, w, h, { r: 12, fill: '#1D232C', fo: 0.95, stroke: '#3E4655', filter: F.shadow(8, 14, 0.45) });
  s += icon(F, 'idcard', x + 16, y + 15, 18, '#55D6E6', 1.9) + text(x + 42, y + 30, 'Context · Card S-20931', { size: 16, weight: 700, fill: '#FFFFFF' }) + text(x + w - 16, y + 30, 'ACS · roster', { size: 13, fill: C.t2, anchor: 'end' });
  let ry = y + 50;
  rows.forEach(([ic, lab, vals]) => {
    const warn = lab === 'Credential';
    s += icon(F, ic, x + 16, ry + 4, 16, warn ? C.warn : C.t2, 1.8) + text(x + 40, ry + 13, lab, { size: 12, weight: 700, ls: 0.6, fill: warn ? C.warn : C.t2 });
    vals.forEach((v, i) => { s += text(x + 40, ry + 31 + i * 18, v, { size: 13.5, fill: '#FFFFFF' }); });
    ry += 22 + vals.length * 18 + 2;
  });
  mark('context', [x, y, w, h]);
  return { svg: g(F, 'Context NEW', s), h };
}
// Escalate Event dialog, pre-filled from the linked alarms and the SOP record
function select(F, x, y, w, val) {
  return rect(x, y, w, 40, { r: 6, fill: '#282828', stroke: C.t3, sw: 1 }) + text(x + 10, y + 26, val, { size: 16, fill: '#FFFFFF' }) + poly([[x + w - 32, y + 17], [x + w - 22, y + 17], [x + w - 27, y + 23]], { fill: '#9BA1AC' });
}
function escalateDialog(F) {
  const x = 375, y = 305, w = 650, h = 482;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let m = `<g clip-path="${clip}">${rect(x, y, w, h, { fill: '#333A47' }) + rect(x, y, w, 36, { fill: '#191E25' })}</g>`;
  m += text(391, 328, 'Escalate Event', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 988, 312, 20, '#FFFFFF', 2.2);
  m += eventHeadX(F, 391, 373, 618, EV);
  m += line(391, 474, 1009, 474, { stroke: '#6B7280' });
  m += text(399, 508, 'Category', { size: 18, fill: '#FFFFFF' }) + text(399 + textWidth('Category', 18), 508, '*', { size: 18, fill: C.crit });
  m += text(708, 508, 'Severity Level', { size: 18, fill: '#FFFFFF' }) + text(708 + textWidth('Severity Level', 18), 508, '*', { size: 18, fill: C.crit });
  m += select(F, 399, 519, 293, 'Credential misuse') + select(F, 708, 519, 293, 'Warning');
  m += g(F, 'Pre-fill hint NEW', icon(F, 'list', 399, 566, 15, C.t2, 2) + text(420, 579, 'Pre-filled from the linked alarms and the SOP record. Edit if needed.', { size: 13.5, weight: 500, fill: C.t2 }));
  m += text(399, 612, 'Remarks', { size: 18, fill: '#FFFFFF' });
  m += rect(399, 623, 602, 80, { r: 6, fill: '#282828', stroke: C.t3, sw: 1 });
  wrap(REMARKS, 582, 14).slice(0, 3).forEach((l, i) => { m += text(409, 645 + i * 20, l, { size: 14, fill: '#E6E6E6' }); });
  m += rect(391.5, 721.5, 139, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(461, 750, 'Cancel', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' });
  m += rect(540, 721, 469, 44, { r: 8, fill: C.redCreate }) + text(774.5, 750, 'Create Incident', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  mark('dialog', [x, y, w, h]); mark('category', [399, 519, 293, 40]); mark('severity', [708, 519, 293, 40]); mark('remarks', [399, 623, 602, 80]); mark('createIncident', [540, 721, 469, 44]);
  return rect(0, 0, W, H, { fill: '#000000', fo: 0.67 }) + g(F, 'Escalate Event dialog', m);
}

// ---------- frame template: centre view, header, lists, optional Active Alarms, then the interaction layer ----------
function consoleFrame(title, o) {
  const F = new Frame(title, W, H);
  let s = o.center(F);
  s += header(F, { loc: LOC });
  if (o.toggle) s += modelToggle(F);
  s += alertsList(F, { cards: plainCards(ALERTS, o.sel) });
  mark('card', CARD);
  s += deviceStatus(F, { online: 4812, offline: 6 });
  if (o.alarm) s += alarmsPanel(F, o.alarm);
  const ch = stageChip(F, 400, 100, o.stage); s += ch.svg; mark('stage', [400, 100, ch.w, ch.h]);
  s += o.after(F);
  return F.render(s);
}
const placeNote = (F, x, y, label, o) => { const n = note(F, x, y, label, o); mark(o.kind === 'shows' ? 'noteShows' : 'noteUser', [x, y, n.w, n.h]); return n.svg; };
let CTX_H = 0;
const locateView = F => { const r = routeView(F), c = contextCard(F, 400, 140, 330); CTX_H = c.h; return r + c.svg; };

// ---------- UC3-S1 · Detect: Warning card in Real Time Alerts, hover ----------
export function s1() {
  return consoleFrame('UC3-S1 · Detect · Warning card "T1 Door C2 · Same card used at T3 A17 4 min earlier" (hover)', {
    stage: 'detect', toggle: true, sel: null, center: homeView,
    after: F => {
      const [x, y, w, h] = CARD, px = 346, py = y + h - 12;
      let s = hover(F, x, y + 1, w, h - 2, { name: 'card' });
      s += tooltip(F, px, py - 2, 'Open alarm', { right: true }); mark('tooltip', [px, py - 36, textWidth('Open alarm', 13, 500) + 20, 26]);
      s += cursor(F, px, py);
      s += placeNote(F, 400, py + 30, 'Hover · T1 Door C2 card', { to: [px + 2, py + 2] });
      s += placeNote(F, 400, py + 70, 'Shows · Warning card · one card, two doors, 4 min apart', { kind: 'shows', to: [x + w + 2, y + 24] });
      return s;
    },
  });
}
// ---------- UC3-S2 · Correlate: card clicked, Investigation tab with System facts ----------
export function s2() {
  return consoleFrame('UC3-S2 · Correlate · Alarm opened · Investigation (5 linked System entries)', {
    stage: 'correlate', sel: KEY, center: c2View,
    alarm: { tab: 0, body: investigation },
    after: F => {
      const [x, y] = CARD, px = 250, py = y + 41;
      let s = cursor(F, px, py, { click: true });
      s += placeNote(F, 400, py - 14, 'Click · T1 Door C2 card', { to: [px + 2, py] });
      s += placeNote(F, 560, 690, 'Shows · Investigation · 5 linked System entries · facts only', { kind: 'shows', to: [914, 700] });
      return s;
    },
  });
}
// ---------- UC3-S3 · Contextualise: hover on the A17 tile → Compare overlay (C2 now vs A17 02:09) ----------
export function s3() {
  return consoleFrame('UC3-S3 · Contextualise · hover A17 tile → Compare · C2 now vs A17 02:09 · travel time', {
    stage: 'context', sel: KEY, center: F => c2View(F) + compareOverlay(F, 400, 150, 480).svg,
    alarm: { tab: 0, body: investigation },
    after: F => {
      // tooltip above the tile, right-aligned to its edge (clear of the event head text and of the holder); pointer on the tile label row
      const [tx, ty, tw, th] = TILE_A17, px = tx + tw - 4, py = ty + 22, tip = 'Compare with C2', tipW = textWidth(tip, 13, 500) + 20;
      let s = hover(F, tx, ty, tw, th, { name: 'A17 tile', fo: 0.1 });
      s += tooltip(F, px, ty - 2, tip, { left: true }); mark('tooltip', [px - tipW, ty - 36, tipW, 26]);
      s += cursor(F, px, py);
      // note at the right end of the tab bar; its leader runs up the tiles' right edge instead of across the C2 tile
      s += placeNote(F, tx + tw - (textWidth('Hover · A17 tile', 13, 700) + 24), 544, 'Hover · A17 tile', { to: [px + 2, py + 2] });
      s += placeNote(F, 400, 516, 'Shows · Compare · C2 now vs A17 02:09 · 19 min route, 4 min elapsed', { kind: 'shows', to: [430, 504] });
      return s;
    },
  });
}
// ---------- UC3-S4 · Contextualise: Locate clicked → both doors on the twin, route, legacy-SSID note ----------
export function s4() {
  return consoleFrame('UC3-S4 · Contextualise · Locate · A17 and C2 on the twin · 19-min route · legacy SSID', {
    stage: 'context', sel: KEY, center: locateView,
    alarm: { tab: 0, body: investigation },
    after: F => {
      const [lx, ly] = locateLink(), lw = textWidth('Locate', 16), px = lx + 28, py = ly - 21;
      let s = linkHover(F, lx, ly, lw); mark('locate', [lx - 23, ly - 18, lw + 24, 26]);
      s += cursor(F, px, py, { click: true });
      s += placeNote(F, 400, py - 14, 'Click · Locate', { to: [px + 2, py] });
      s += placeNote(F, 400, 140 + CTX_H + 14, 'Shows · Both doors · 19-min route · legacy SSID S-20931-L', { kind: 'shows', to: [430, 140 + CTX_H] });
      return s;
    },
  });
}
// ---------- UC3-S5 · Orchestrate: SOP Flow tab · Co-pilot briefing + SOP-ACS-007, hover on Suspend ----------
export function s5() {
  const pos = sopLayout(0), [bx, by, bw, bh] = pos[1].actions[0];
  return consoleFrame('UC3-S5 · Orchestrate · SOP Flow · Co-pilot briefing · hover Suspend (both SSIDs)', {
    stage: 'orchestrate', sel: KEY, center: locateView,
    alarm: { tab: 1, body: sopBody(0) },
    after: F => {
      const px = bx + bw - 14, py = by + bh - 8;
      let s = btnState(F, bx, by, bw, bh, 'hover', { r: 6 });
      s += cursor(F, px, py);
      s += placeNote(F, 700, by + 36, 'Hover · Suspend', { to: [px + 2, py + 2] });
      s += placeNote(F, 420, 700, 'Shows · Co-pilot briefing · impossible presence, legacy SSID', { kind: 'shows', to: [930, 680] });
      return s;
    },
  });
}
// ---------- UC3-S6 · Orchestrate: Suspend clicked → Approved · Siti K. · 02:16:05 ----------
export function s6() {
  const pos0 = sopLayout(0), [bx, by, bw, bh] = pos0[1].actions[0];
  const pos1 = sopLayout(1);
  return consoleFrame('UC3-S6 · Orchestrate · Suspend clicked · Approved · Siti K. · 02:16:05', {
    stage: 'orchestrate', sel: KEY, center: locateView,
    alarm: { tab: 1, body: sopBody(1) },
    after: F => {
      const px = bx + bw - 14, py = by + bh - 8;
      let s = cursor(F, px, py, { click: true });
      const tag = 'Approved · Siti K. · 02:16:05', tagW = textWidth(tag, 11, 500) + 12, tagX = 916 + 428 - 30 - 10 - tagW, tagY = pos1[1].y + 8;
      mark('approved', [tagX, tagY, tagW, 17]);
      s += confirmToast(F, 480, 700, 'Card S-20931 suspended · both SSIDs', 'Approved · Siti K. · 02:16:05 · ACS confirmed 02:16:06', { w: 420 });
      mark('toast', [480, 700, 420, 70]);
      s += placeNote(F, 700, by + 36, 'Click · Suspend', { to: [px + 2, py + 2] });
      s += placeNote(F, 560, tagY - 44, 'Shows · Approved · Siti K. · 02:16:05', { kind: 'shows', to: [tagX - 2, tagY + 8] });
      return s;
    },
  });
}
// ---------- UC3-S7 · Assist & govern: Escalate dialog pre-filled (Credential misuse · Warning) → Create Incident ----------
export function s7() {
  return consoleFrame('UC3-S7 · Assist & govern · Escalate dialog pre-filled · Credential misuse · Warning · Create Incident', {
    stage: 'govern', sel: KEY, center: locateView,
    alarm: { tab: 1, body: sopBody(2) },
    after: F => {
      let s = escalateDialog(F);
      s += btnState(F, 540, 721, 469, 44, 'hover');
      const px = 800, py = 745;
      s += cursor(F, px, py, { click: true });
      s += placeNote(F, 1045, 790, 'Click · Create Incident', { to: [px + 2, py + 2] });
      s += placeNote(F, 1045, 525, 'Shows · Escalate dialog · pre-filled', { kind: 'shows', to: [1001, 539] });
      return s;
    },
  });
}
// ---------- UC3-S8 · Assist & govern: Incident IDS-207 created ----------
export function s8() {
  return consoleFrame('UC3-S8 · Assist & govern · Incident IDS-207 created · Incident Management', {
    stage: 'govern', sel: KEY, center: locateView,
    alarm: { tab: 1, body: sopBody(2), scroll: 'end' },   // steps 3-4 ('Notify duty manager' · Sent, 'Log and escalate') in view
    after: F => {
      mark('imButton', [1103.5, 40.5, 256, 45]);
      let s = btnState(F, 1103.5, 40.5, 256, 45, 'hover', { r: 7.5 });
      s += g(F, 'New incident badge NEW', pill(F, 1338, 30, '1 new', C.crit, { h: 20, size: 12, pad: 14 }).svg);
      const px = 1250, py = 66;
      s += cursor(F, px, py);
      s += confirmToast(F, 420, 720, 'Incident IDS-207 created · 02:17:10', 'Credential misuse · Warning · listed in Incident Management', { w: 470 });
      mark('confirm', [420, 720, 470, 70]);
      s += placeNote(F, 880, 100, 'Hover · Incident Management', { to: [px, py] });
      s += placeNote(F, 480, 812, 'Shows · Incident IDS-207 created · 02:17:10', { kind: 'shows', to: [520, 790] });
      return s;
    },
  });
}

export const FRAMES = [
  ['UC3-S1-detect-warning-card-hover', s1],
  ['UC3-S2-correlate-investigation-facts', s2],
  ['UC3-S3-contextualise-compare-hover', s3],
  ['UC3-S4-contextualise-locate-route', s4],
  ['UC3-S5-orchestrate-sop-hover-suspend', s5],
  ['UC3-S6-orchestrate-suspend-approved', s6],
  ['UC3-S7-govern-escalate-dialog', s7],
  ['UC3-S8-govern-incident-created', s8],
];
