// UC2 · AgilFence (Critical) · end-to-end click flow in the V11 UI, one state per frame.
// Journey: Detect (S1) → Correlate (S2) → Contextualise (S3) → Orchestrate (S4, S5) → Assist & govern (S6–S8).
// Improvements applied: Co-pilot text only as the briefing at the top of the SOP Flow tab; the Investigation
// tab lists System facts only; alert cards carry no Co-pilot line (plainCards). People take the critical
// decisions: Dispatch and Create Incident are clicked and recorded with name and clock time.
// All names, IDs and times are illustrative (demo night, 02:14 scenario).
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, poly, text, rich, icon, image, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, modelToggle, pill, alertsPanel, alertCard, deviceStatus, activeAlarms, timeline, remarksBox, sopFlow, scene, eventHead, camTile } from '../../lib/v11.mjs';
import { camera, clayAirport, marker } from '../../lib/clay.mjs';
import { AF, fenceSite, toast, nearestCams, player } from '../../lib/fence.mjs';
import { cursor, hover, btnState, tabHover, linkHover, focusRing, caret, tooltip, note, stageChip, copilotBriefing, confirmToast, menu, plainCards } from '../../lib/demo.mjs';
import { ALERTS, BYK } from '../data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// ---------- anchors: on-screen rects of the key UI elements per frame (boards / film read them) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- scenario data ----------
const LOC = ['Main Airport', 'Airfield'];
const EV = { time: '02:14:58', id: 'AGF-5-14', code: 'PER-005', title: 'Fence Sector 5', lines: [['AgilFence alarm on segment 5-14, LiDAR object 1.7 m'], ['PTZ ', { b: '7-02' }, ' on preset 5-14 · runway ', { b: '02L' }, ' 150 m']] };
const COUNTS = [['2 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];
// the new alarm arrives at the top of the ranked list; no Co-pilot lines on the cards (improvement 3)
const LIST = [BYK.fence, ...ALERTS.filter(a => a.key !== 'fence')];
const cards = sel => plainCards(LIST, sel);
const CARD_H = alertCard(new Frame('m'), 40, 296, 336, cards('fence')[0]).h;
// linked alarms: System facts only (improvement 1)
const LINKED = [
  ['02:14:58', 'Fence alarm (climb)', 'AgilFence 5-14', C.crit],
  ['02:15:01', 'Object 1.7 m', 'LiDAR L-5B', C.crit],
  ['02:15:03', 'PTZ 7-02 to preset 5-14', 'iPAMS / VMS', C.link],
  ['02:15:12', 'Thermal: 1 person', 'PTZ 7-02', C.crit],
];
const CHECKS = [
  ['02:15:05', 'No works booked · Sector 5', 'Permit system', '#FFFFFF'],
  ['02:15:05', 'No patrol in Sector 5', 'Patrol app', '#FFFFFF'],
  ['02:15:06', 'Wind 12 km/h · below threshold', 'Weather', '#FFFFFF'],
];
const CAMS = {
  ptz: (o = {}) => ({ href: cctv('fence_ptz_clean'), label: 'PTZ 7-02 · Thermal + IR', focus: [0.5, 0.42], box: box('fence_ptz', 'person'), boxCol: C.crit, boxLabel: 'Person · climbing', ...o }),
  thermal: (o = {}) => ({ href: cctv('thermal_clean'), label: 'PTZ 7-02 · Thermal', focus: [0.54, 0.5], box: box('thermal', 'person'), boxCol: C.crit, boxLabel: 'Person 1.7 m', ...o }),
  track: (o = {}) => ({ href: cctv('fence_inside_clean'), label: 'PTZ 7-02 · Auto-track', focus: [0.55, 0.62], box: box('fence_inside', 'person'), boxCol: C.crit, boxLabel: 'Person · tracking', ...o }),
  wide: (o = {}) => ({ href: cctv('fence_wide_clean'), label: 'CAM 7-11 · Sector 5 wide', focus: [0.62, 0.45], box: box('fence_wide', 'person'), boxCol: C.crit, ...o }),
  lidar: (o = {}) => ({ href: cctv('lidar_clean'), label: 'LiDAR L-5B · point cloud', focus: [0.5, 0.42], ...o }),
};
const TILES = {
  inv: () => [CAMS.thermal({ chips: [['On preset 5-14', C.blue], ['LIVE', C.crit]] }), CAMS.lidar(), CAMS.wide()],
  sop: () => [CAMS.track({ chips: [['Auto-track', C.blue], ['LIVE', C.crit]] }), CAMS.lidar(), CAMS.wide()],
};
const BRIEF = { text: 'Climb on 5-14 at 02:14:58. LiDAR sees one 1.7 m object there; PTZ 7-02 thermal shows one person. No works or patrols at Sector 5; runway 02L 150 m.', sources: 'AgilFence 5-14 · LiDAR L-5B · PTZ 7-02', time: '02:15:14' };

// ---------- centre views ----------
// whole airport (home): markers for tonight's alerts, the fence segment lit
function airportView(F) {
  const P = camera(870, 520, 8.4, 50, 29);
  const mk = LIST.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: a.key === 'fence' ? 'Sector 5 · Seg 5-14 · Alarm' : undefined, left: a.key === 'watch' || a.key === 'spoof' || a.key === 'fence' }));
  const [hx, hy] = P(63, 1, 3.5);
  mark('marker', [hx - 42 - textWidth('Sector 5 · Seg 5-14 · Alarm', 14, 500) - 24, hy - 20, 42 + textWidth('Sector 5 · Seg 5-14 · Alarm', 14, 500) + 24, 40]);
  return scene(F, clayAirport(F, P, { markers: mk, alarmFence: true }));
}
// zoomed on the fence (alarm opened)
function fenceView(F) {
  const P = camera(640, 500, 12, 63, 1);
  return scene(F, clayAirport(F, P, { markers: [{ id: 'fence', X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: 4, label: 'Sector 5 · Seg 5-14' }] }));
}
// Locate: close-up of the north fence with segment 5-14, sensors, cameras and their cones
function locateView(F, o = {}) {
  const P = camera(o.sx ?? 600, o.sy ?? 490, 40, 63, 1);
  let s = clayAirport(F, P, { alarmFence: false, lidar: false, labels: false, markers: [] });
  s += fenceSite(F, P, { cams: AF.cams.map(c => ({ ...c, place: 'above', label: c.id === 'PTZ 7-03' ? false : undefined })) });
  s += marker(F, P, { X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: 2.5, label: 'Seg 5-14 · Alarm' });
  { const [hx, hy] = P(63, 1, 2.5), lw = textWidth('Seg 5-14 · Alarm', 14, 500) + 24; mark('segment', [hx - 20, hy - 20, lw + 62, 40]); }
  return scene(F, s);
}
// Orchestrate / govern: wider north perimeter with the patrol and the runway note
function patrolView(F, o = {}) {
  const P = camera(640, 510, 30, 61, 3.5);
  let s = clayAirport(F, P, { alarmFence: false, lidar: false, labels: false, markers: [] });
  const patrol = { ...AF.patrol, id: 'Patrol 2', eta: o.eta || 'standing by', at: o.at || AF.patrol.from, place: 'below', minX: 392, dy: o.pdy ?? 34 };
  s += fenceSite(F, P, { cams: [{ ...AF.cams[0], place: 'left', text: 'PTZ 7-02 · tracking' }, { ...AF.cams[1], label: false }, { ...AF.cams[2], label: false }], patrol, runway: { X: 64, Y: 6.4, label: o.runway || 'Runway 02L · 150 m', col: o.runwayCol } });
  s += marker(F, P, { X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: 3.2, label: 'Seg 5-14 · Alarm' });
  { const [vx, vy] = P(...patrol.at, 0.2); mark('patrol', [vx - 18, vy - 18, 36, 36]); }
  return scene(F, s);
}

// ---------- frame template: header, Real Time Alerts, Device Status, centre view, optional Active Alarms ----------
function consoleFrame(name, o) {
  const F = new Frame(name, W, H);
  let s = o.center(F);
  s += header(F, { loc: LOC });
  if (o.toggle) s += modelToggle(F);
  s += alertsPanel(F, { cluster: 'All terminals', counts: COUNTS, cards: cards(o.sel) });
  mark('card', [40, 296, 336, CARD_H]);
  s += deviceStatus(F, { online: 4812, offline: 6 });
  if (o.alarm) s += activeAlarms(F, { ev: EV, bodyH: 356, ...o.alarm });
  if (o.after) s += o.after(F);
  return F.render(s);
}
const chip = (F, key) => stageChip(F, 400, 100, key).svg;

// Investigation tab: System entries only (facts), then Remarks
const investigation = () => (F, x, y, w, h) => {
  const tl = timeline(F, x + 16, y + 12, w - 32, [
    { who: 'System', time: '02:15:12', text: '4 alarms linked into this event', size: 14, italic: true, rows: LINKED },
    { who: 'System', time: '02:15:06', text: 'Context checked', size: 14, italic: true, rows: CHECKS },
  ], { gap: 10 });
  mark('timeline', [x + 16, y + 12, w - 32, tl.h]);
  const ry = y + 12 + tl.h + 4;
  return { svg: tl.svg + remarksBox(F, x + 16, ry, w - 32, { h: 56 }), h: ry - y + 24 + 56 + 10 + 40 + 16 };
};

// SOP Flow tab: Co-pilot briefing on top (improvement 1), then SOP-PER-02 steps
const SOP = (stage = 0) => [
  { title: 'Alarm located, cameras on target', state: 'done', tag: 'Auto · 02:15:03' },
  { title: 'No works or patrols at Sector 5', state: 'done', tag: 'Auto · 02:15:05' },
  stage === 1 ? { title: 'Dispatch Patrol 2', state: 'done', tag: 'Approved · Nurul A. · 02:15:30', text: 'Patrol 2 (Arjun + 1) · perimeter road · ETA 02:18:30', items: [['Patrol app notified · 02:15:31', true]] }
    : stage >= 2 ? { title: 'Dispatch Patrol 2', state: 'done', tag: 'Approved · Nurul A. · 02:15:30' }
    : { title: 'Critical Action Required', state: 'critical', tag: 'Your approval', text: 'Dispatch Patrol 2 (Arjun + 1) · perimeter road · ETA 02:18:30', actions: [['Dispatch', 'blue'], ['Choose another', 'grey']] },
  { title: 'Inform Airside Ops and tower', state: stage >= 2 ? 'done' : 'todo', tag: stage >= 2 ? 'Logged · 02:15:40' : null },
  { title: 'Police call', state: 'todo', tag: 'Duty manager approval' },
  { title: 'Secure, close and report', state: 'todo' },
];
const sopBody = (stage, pos) => (F, x, y, w, h) => {
  const b = copilotBriefing(F, x + 16, y + 6, w - 32, BRIEF);
  mark('briefing', [x + 16, y + 6, w - 32, b.h]);
  const p = pos || [];
  const r = sopFlow(F, x, y + 6 + b.h + 4, w, SOP(stage), { pos: p });
  if (p[2]) mark('step3', [x, p[2].y, w, p[2].h]);
  if (p[2] && p[2].actions[0]) mark('dispatch', p[2].actions[0]);
  return { svg: b.svg + r.svg, h: 6 + b.h + 4 + r.h + 8 };
};
// layout read-back for the SOP (positions of the step rows and action buttons on screen)
function sopLayout(stage) { const pos = []; sopBody(stage, pos)(new Frame('m'), 916, 600, 428, 360); return pos; }

// ---------- UC2-S1 · Detect ----------
export function s1() {
  return consoleFrame('UC2-S1 · Detect · AgilFence alarm · system message and Critical card', {
    toggle: true, center: airportView,
    after: F => {
      let s = g(F, 'New alarm highlight NEW', rect(41, 297, 334, CARD_H - 2, { stroke: C.crit, sw: 2, so: 0.9 }) + rect(37, 293, 342, CARD_H + 6, { stroke: C.crit, sw: 6, so: 0.18 }));
      const tx = 930, ty = 196, tw = 430, ttext = 'Disturbance on segment 5-14, consistent with a climb. PTZ 7-02 is moving to preset 5-14.';
      const ts = toast(F, tx, ty, { title: 'AgilFence alarm · Segment 5-14', sub: 'Fence Sector 5 · Critical · north perimeter', time: '02:14:59', sound: true, w: tw, text: ttext, actions: [['Open alarm', 'primary'], ['Locate', ''], ['Silence', '']] });
      s += ts.svg;
      mark('toast', [tx, ty, tw, ts.h]);
      // hover on "Open alarm" (first action of the toast)
      const ax = tx + 62, ay = ty + ts.h - 44, bw = textWidth('Open alarm', 14, 700) + 24;
      mark('openAlarm', [ax, ay, bw, 30]);
      s += btnState(F, ax, ay, bw, 30, 'hover', { r: 6 });
      const cx = ax + bw / 2 + 8, cy = ay + 17;
      s += cursor(F, cx, cy);
      s += chip(F, 'detect');
      s += note(F, 1110, ty + ts.h + 22, 'Hover · Open alarm', { to: [cx, cy] }).svg;
      s += note(F, 560, 212, 'Shows · System message + Critical card', { kind: 'shows', to: [tx, ty + 34] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S2 · Correlate ----------
export function s2() {
  return consoleFrame('UC2-S2 · Correlate · Investigation · four linked System entries', {
    sel: 'fence', center: fenceView,
    alarm: { cams: TILES.inv(), tab: 0, body: investigation() },
    after: F => {
      mark('tab', [916, 560, 214, 40]);
      let s = cursor(F, 1040, 582, { click: true });
      s += chip(F, 'correlate');
      s += note(F, 660, 548, 'Click · Investigation tab', { to: [1040, 582] }).svg;
      s += note(F, 590, 706, 'Shows · 4 linked System entries · facts only', { kind: 'shows', to: [930, 662] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S3 · Contextualise ----------
export function s3() {
  return consoleFrame('UC2-S3 · Contextualise · Locate · nearest cameras · Open live', {
    sel: 'fence', center: F => locateView(F),
    alarm: { cams: TILES.inv(), tab: 0, body: investigation() },
    after: F => {
      // nearest cameras (top-left of the viewer), PTZ 7-02 preferred with one-click live view
      const nx = 400, ny = 150, nw = 300;
      const n = nearestCams(F, nx, ny, AF.cams.map(c => c.pref ? { ...c, action: 'Open live', kind: 'Thermal + IR · on preset' } : c), { w: nw, note: ' ' });
      let s = n.svg;
      mark('nearest', [nx, ny, nw, n.h]);
      const ry = ny + 50, bw = textWidth('Open live', 12, 700) + 20, bx = nx + nw - 20 - bw, by = ry + 12;
      mark('openLive', [bx, by, bw, 24]);
      s += hover(F, nx + 8, ry, nw - 16, 48, { r: 8, name: 'camera row' });
      s += btnState(F, bx, by, bw, 24, 'hover', { r: 6 });
      s += tooltip(F, bx + bw / 2, by, 'Open live view');
      const cx = bx + bw / 2 + 6, cy = by + 14;
      // the player that opens: live PTZ 7-02 with the pre-alarm replay marker
      const px = 500, py = 606, pw = 388, ph = 242;
      let p = rect(px - 6, py - 6, pw + 12, ph + 24, { r: 12, fill: '#1D232C', fo: 0.97, stroke: '#3E4655', filter: F.shadow(10, 18, 0.5) });
      p += player(F, px, py, pw, ph, CAMS.ptz({ label: 'PTZ 7-02 · Live · preset 5-14', focus: [0.52, 0.45] }), { badge: 'LIVE', clip: { from: '02:14:41', alarm: 0.62, now: 1, to: 'LIVE', live: true } });
      s += g(F, 'Live view NEW', p);
      mark('player', [px - 6, py - 6, pw + 12, ph + 24]);
      s += cursor(F, cx, cy, { click: true });
      s += chip(F, 'context');
      s += note(F, 720, 236, 'Click · Open live', { to: [cx, cy] }).svg;
      s += note(F, 400, 876, 'Shows · PTZ 7-02 live + pre-alarm replay marker', { kind: 'shows', to: [px + 40, py + ph + 18] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S4 · Orchestrate · hover Dispatch ----------
export function s4() {
  const pos = sopLayout(0), [dx, dy, dw, dh] = pos[2].actions[0];
  return consoleFrame('UC2-S4 · Orchestrate · SOP Flow · Co-pilot briefing · hover Dispatch', {
    sel: 'fence', center: F => patrolView(F),
    alarm: { cams: TILES.sop(), tab: 1, bodyH: 360, body: sopBody(0) },
    after: F => {
      let s = btnState(F, dx, dy, dw, dh, 'hover', { r: 6 });
      const cx = dx + dw / 2 + 6, cy = dy + dh / 2 + 2;
      s += cursor(F, cx, cy);
      s += chip(F, 'orchestrate');
      s += note(F, 700, 946, 'Hover · Dispatch', { to: [cx, cy] }).svg;
      s += note(F, 600, 628, 'Shows · Co-pilot briefing · steps 1–2 auto', { kind: 'shows', to: [916, 640] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S5 · Orchestrate · Dispatch approved ----------
export function s5() {
  const pos = sopLayout(0), [dx, dy, dw, dh] = pos[2].actions[0];
  const pos1 = sopLayout(1);
  return consoleFrame('UC2-S5 · Orchestrate · Dispatch clicked · Approved · Nurul A. · 02:15:30', {
    sel: 'fence', center: F => patrolView(F, { at: [54, 2.4], eta: 'ETA 02:18:30' }),
    alarm: { cams: TILES.sop(), tab: 1, bodyH: 360, body: sopBody(1) },
    after: F => {
      const cx = dx + dw / 2 + 6, cy = dy + dh / 2 + 2;
      let s = cursor(F, cx, cy, { click: true });
      const tagW = textWidth('Approved · Nurul A. · 02:15:30', 11, 500) + 12, tagX = 916 + 428 - 30 - 10 - tagW, tagY = pos1[2].y + 8;
      mark('approved', [tagX, tagY, tagW, 17]);
      s += confirmToast(F, 480, 690, 'Patrol 2 dispatched', 'Approved · Nurul A. · 02:15:30 · ETA 02:18:30', { w: 380 });
      mark('confirm', [480, 690, 380, 70]);
      s += chip(F, 'orchestrate');
      s += note(F, 700, 946, 'Click · Dispatch', { to: [cx, cy] }).svg;
      s += note(F, 560, tagY - 40, 'Shows · Approved · Nurul A. · 02:15:30', { kind: 'shows', to: [tagX - 2, tagY + 8] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S6 · Assist & govern · hover Escalate ----------
export function s6() {
  const pos = sopLayout(2);
  return consoleFrame('UC2-S6 · Assist & govern · hover Escalate', {
    sel: 'fence', center: F => patrolView(F, { at: [55, 2.4], eta: 'ETA 02:18:30', runway: 'Runway 02L · tower informed' }),
    alarm: { cams: TILES.sop(), tab: 1, bodyH: 360, body: sopBody(2) },
    after: F => {
      mark('escalate', [1004, 966, 166, 44]);
      let s = btnState(F, 1004, 966, 166, 44, 'hover');
      const cx = 1096, cy = 990;
      s += cursor(F, cx, cy);
      s += chip(F, 'govern');
      s += note(F, 1004, 1034, 'Hover · Escalate', { to: [cx, cy] }).svg;
      const tagW = textWidth('Logged · 02:15:40', 11, 500) + 12, tagX = 916 + 428 - 30 - 10 - tagW, tagY = pos[3].y + 8;
      mark('logged', [tagX, tagY, tagW, 17]);
      s += note(F, 560, tagY - 40, 'Shows · Steps logged with clock times', { kind: 'shows', to: [tagX - 2, tagY + 8] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S7 · Assist & govern · Escalate dialog pre-filled ----------
function select(F, x, y, w, val) {
  return rect(x, y, w, 40, { r: 6, fill: '#282828', stroke: C.t3, sw: 1 }) + text(x + 10, y + 26, val, { size: 16, fill: '#FFFFFF' }) + poly([[x + w - 32, y + 17], [x + w - 22, y + 17], [x + w - 27, y + 23]], { fill: '#9BA1AC' });
}
function escalateDialog(F) {
  const x = 375, y = 305, w = 650, h = 482;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let m = `<g clip-path="${clip}">${rect(x, y, w, h, { fill: '#333A47' }) + rect(x, y, w, 36, { fill: '#191E25' })}</g>`;
  m += text(391, 328, 'Escalate Event', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 988, 312, 20, '#FFFFFF', 2.2);
  m += eventHead(F, 391, 373, 618, EV);
  m += line(391, 474, 1009, 474, { stroke: '#6B7280' });
  m += text(399, 508, 'Category', { size: 18, fill: '#FFFFFF' }) + text(399 + textWidth('Category', 18), 508, '*', { size: 18, fill: C.crit });
  m += text(708, 508, 'Severity Level', { size: 18, fill: '#FFFFFF' }) + text(708 + textWidth('Severity Level', 18), 508, '*', { size: 18, fill: C.crit });
  m += select(F, 399, 519, 293, 'Perimeter intrusion') + select(F, 708, 519, 293, 'Critical');
  m += g(F, 'Pre-fill hint NEW', icon(F, 'list', 399, 566, 15, C.t2, 2) + text(420, 579, 'Pre-filled from the linked alarms and the SOP record. Edit if needed.', { size: 13.5, weight: 500, fill: C.t2 }));
  m += text(399, 612, 'Remarks', { size: 18, fill: '#FFFFFF' });
  m += rect(399, 623, 602, 80, { r: 6, fill: '#282828', stroke: C.t3, sw: 1 });
  wrap('AgilFence alarm on segment 5-14 at 02:14:58, corroborated by LiDAR L-5B (object 1.7 m) and PTZ 7-02 thermal (1 person). Patrol 2 dispatched 02:15:30, approved by Nurul A.; Airside Ops and tower informed 02:15:40. Runway 02L 150 m.', 582, 14).slice(0, 3).forEach((l, i) => { m += text(409, 645 + i * 20, l, { size: 14, fill: '#E6E6E6' }); });
  m += rect(391.5, 721.5, 139, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(461, 750, 'Cancel', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' });
  m += rect(540, 721, 469, 44, { r: 8, fill: C.redCreate }) + text(774.5, 750, 'Create Incident', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  mark('dialog', [x, y, w, h]); mark('category', [399, 519, 293, 40]); mark('severity', [708, 519, 293, 40]); mark('remarks', [399, 623, 602, 80]); mark('createIncident', [540, 721, 469, 44]);
  return rect(0, 0, W, H, { fill: '#000000', fo: 0.67 }) + g(F, 'Escalate Event dialog', m);
}
export function s7() {
  return consoleFrame('UC2-S7 · Assist & govern · Escalate dialog pre-filled · Create Incident', {
    sel: 'fence', center: F => patrolView(F, { at: [55, 2.4], eta: 'ETA 02:18:30', runway: 'Runway 02L · tower informed' }),
    alarm: { cams: TILES.sop(), tab: 1, bodyH: 360, body: sopBody(2) },
    after: F => {
      let s = escalateDialog(F);
      s += btnState(F, 540, 721, 469, 44, 'hover');
      const cx = 800, cy = 745;
      s += cursor(F, cx, cy, { click: true });
      s += chip(F, 'govern');
      s += note(F, 1045, 790, 'Click · Create Incident', { to: [cx, cy] }).svg;
      s += note(F, 1045, 525, 'Shows · Escalate dialog · pre-filled', { kind: 'shows', to: [1001, 539] }).svg;
      return s;
    },
  });
}

// ---------- UC2-S8 · Assist & govern · Incident created ----------
export function s8() {
  return consoleFrame('UC2-S8 · Assist & govern · Incident PER-005 created · Incident Management', {
    sel: 'fence', center: F => patrolView(F, { at: [58, 2.4], eta: 'ETA 02:18:30', runway: 'Runway 02L · tower informed' }),
    alarm: { cams: TILES.sop(), tab: 1, bodyH: 360, body: sopBody(2) },
    after: F => {
      mark('imButton', [1103.5, 40.5, 256, 45]);
      let s = btnState(F, 1103.5, 40.5, 256, 45, 'hover', { r: 7.5 });
      s += g(F, 'New incident badge NEW', pill(F, 1338, 30, '1 new', C.crit, { h: 20, size: 12, pad: 14 }).svg);
      const cx = 1250, cy = 66;
      s += cursor(F, cx, cy);
      s += confirmToast(F, 500, 150, 'Incident PER-005 created · 02:16:10', 'Perimeter intrusion · Critical · now the top row of Incident Management', { w: 470 });
      mark('confirm', [500, 150, 470, 70]);
      s += chip(F, 'govern');
      s += note(F, 880, 100, 'Hover · Incident Management', { to: [cx, cy] }).svg;
      s += note(F, 500, 250, 'Shows · Incident PER-005 created · 02:16:10', { kind: 'shows', to: [540, 220] }).svg;
      return s;
    },
  });
}

export const FRAMES = [
  ['UC2-S1-detect-toast', s1],
  ['UC2-S2-correlate-investigation', s2],
  ['UC2-S3-contextualise-locate-live', s3],
  ['UC2-S4-sop-hover', s4],
  ['UC2-S5-sop-approved', s5],
  ['UC2-S6-escalate-hover', s6],
  ['UC2-S7-escalate-dialog', s7],
  ['UC2-S8-incident-created', s8],
];
