// UC5 · Incident Management · overall list and report · end-to-end click flow, one state per frame.
// S1 is the 1400 console (header button hovered + clicked); S2–S7 are the 1600 Incident Management page.
// Journey: Detect (S1 list) → Correlate (S2 status filter) → Contextualise (S3 search, S4 detail + report draft)
// → Orchestrate (S5 SOP record with approvals) → Assist & govern (S6 governed close, S7 closed + export).
// Improvements applied: lavender Co-pilot text only as the report draft (Remarks) and the briefing on top of the
// SOP Flow tab; alert cards on the console carry no Co-pilot line (plainCards). People keep the decisions: the
// close needs a reason, a sign-off and a click, and the row then shows who closed it and when.
// All names, IDs and times are illustrative (demo night, 02:14 scenario; 07:00 handover review by Grace T.).
// The SOP record (STEPS) mirrors UC2's live SOP-PER-02 list one-for-one: six steps, same titles and times.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, poly, text, rich, icon, image, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, modelToggle, pill, alertsPanel, deviceStatus, remarksBox, sopFlow, scene, camTile } from '../../lib/v11.mjs';
import { camera, clayAirport } from '../../lib/clay.mjs';
import { cursor, hover, btnState, focusRing, caret, tooltip, note, stageChip, copilotBriefing, confirmToast, menu, plainCards } from '../../lib/demo.mjs';
import { ALERTS } from '../data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// ---------- anchors: on-screen rects of the key UI elements per frame (boards / film read them) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- scenario data ----------
const IW = 1600;                       // Incident Management frame width
const CLOSE_T = '07:02';
const PER005 = closed => ['Open', 'Critical', 'Fence Sector 5', 'Today, 02:14:58', 'PER-005', null, 'AGF-5-14'].map((v, i) => closed && i === 0 ? 'Closed' : closed && i === 5 ? ['Grace T.', 'Today, ' + CLOSE_T] : v);
// the demo night's rows (as frames.mjs), PER-005 first
const OTHERS = [
  ['Open', 'Critical', 'T3 Staff Door D-214', 'Today, 02:14:52', 'TGT-214', null, 'ACS-D214'],
  ['Open', 'Warning', 'T1 Departure Row K', 'Today, 02:12:40', 'WLS-033', null, 'CAM-1-311'],
  ['Open', 'Warning', 'T1 Door C2', 'Today, 02:13:20', 'IDS-207', null, 'ACS-C2'],
  ['Open', 'Warning', 'T2 Arrival Belt 5', 'Today, 02:11:09', 'FGT-040', null, 'CAM-1-142'],
  ['Closed', 'Warning', 'T2 Gate B12', 'Today, 02:16:04', 'UAB-112', ['Nurul A.', 'Today, 02:31:10'], 'CAM-2-031'],
  ['Closed', 'Info', 'T4 Baggage Hall B2', 'Today, 01:45:20', 'OVS-012', ['Siti K.', 'Today, 02:20:05'], 'ACS-B2'],
  ['Closed', 'Critical', 'T5 Pier B Service Door', 'Today, 01:47:02', 'TGT-209', ['Andrew Teo', 'Today, 02:05:40'], 'ACS-P5B'],
  ['Closed', 'Critical', 'Fence Sector 15', 'Today, 01:42:10', 'PER-015', ['Siti K.', 'Today, 01:49:20'], 'AGF-15-03'],
];
const ROWS = closed => [PER005(closed), ...OTHERS];
const TOTAL = 24;
// detail pane vertical layout: camera tiles 160 tall so the SOP Flow tab body (400) holds briefing + six steps
const TILE_H = 160, TAB_Y = 333 + TILE_H + 16, BODY_Y = TAB_Y + 40, BODY_H = 949 - BODY_Y;
// detail pane content for PER-005 (the 07:00 review: both tiles are recordings)
const DESC = [['Climb on segment 5-14 · LiDAR object 1.7 m · thermal: 1 person'], ['Patrol 2 on scene ', { b: '02:18:08' }, ' · handed to Airport Police ', { b: '02:26:30' }]];
const TILES = () => [
  { href: cctv('fence_patrol_clean'), label: 'PTZ 7-02 · clip 02:15:03–02:18:50', focus: [0.48, 0.6], boxes: [{ box: box('fence_patrol', 'person'), col: C.crit, label: 'Person' }, { box: box('fence_patrol', 'officer1'), col: C.link }, { box: box('fence_patrol', 'officer2'), col: C.link }], chips: [['REC', '#3A404B']] },
  { href: cctv('fence_pre_clean'), label: 'CAM 7-11 · replay 02:14:41', focus: [0.62, 0.6], box: box('fence_pre', 'person'), boxCol: C.warn, boxLabel: 'Approaching', chips: [['REC', '#3A404B']] },
];
const REPORT = 'Climb on segment 5-14 at 02:14:58 (AgilFence), confirmed by LiDAR L-5B (1.7 m) and PTZ 7-02 thermal; verified on video by Nurul A. 02:15:24. Patrol 2 dispatched 02:15:30 (approved by Nurul A.); Airside Ops and tower informed 02:15:40; police call approved by Daniel L. 02:16:00. On scene 02:18:08; intruder held 130 m short of runway 02L, handed to Airport Police 02:26:30. Mesh bent, no cut.';
const SOURCES = 'AgilFence 5-14 · LiDAR L-5B · PTZ 7-02 · SOP-PER-02 log · patrol app';
const BRIEF = { text: 'Climb on 5-14 at 02:14:58, confirmed by LiDAR and PTZ 7-02 thermal. Patrol 2 on scene 02:18:08; intruder held 130 m short of runway 02L, handed to Airport Police 02:26:30.', sources: 'AgilFence 5-14 · LiDAR L-5B · PTZ 7-02 · patrol app', time: '02:40' };
// SOP-PER-02 record: the same six steps, titles and times as the live SOP in UC2 (uc2-agilfence.mjs SOP), one-for-one;
// completed steps carry who approved and when; the last step waits for the head of security
const STEPS = closed => [
  { title: 'Alarm located, cameras on target', state: 'done', tag: 'Auto · 02:15:03' },
  { title: 'No works or patrols at Sector 5', state: 'done', tag: 'Auto · 02:15:05' },
  { title: 'Dispatch Patrol 2', state: 'done', tag: 'Approved · Nurul A. · 02:15:30' },
  { title: 'Inform Airside Ops and tower', state: 'done', tag: 'Logged · 02:15:40' },
  { title: 'Police call', state: 'done', tag: 'Approved · Daniel L. · 02:16:00' },
  closed ? { title: 'Secure, close and report', state: 'done', tag: 'Signed off · Grace T. · ' + CLOSE_T } : { title: 'Secure, close and report', state: 'todo', tag: 'Your sign-off · head of security' },
];

// ---------- S1 · the 1400 console (header, viewer, Real Time Alerts without Co-pilot lines) ----------
const markersFor = (labels = {}) => ALERTS.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: labels[a.key], left: a.key === 'watch' || a.key === 'spoof' }));
const COUNTS = [['2 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];
function consoleFrame(name, after) {
  const F = new Frame(name, W, H);
  const P = camera(870, 520, 8.4, 50, 29);
  let s = scene(F, clayAirport(F, P, { markers: markersFor({ tailgate: 'D-214 · Tailgating', fence: 'Sector 5 · PER-005' }) }));
  s += header(F) + modelToggle(F);
  // 07:00 review: the two Critical cards carry the clock time of the 02:14 events instead of the live 'Now' badge (data.mjs stays as UC1–UC4 need it)
  s += alertsPanel(F, { cluster: 'All terminals', counts: COUNTS, cards: plainCards(ALERTS.map(a => a.time === 'Now' ? { ...a, time: '02:14 am' } : a), null) });
  s += deviceStatus(F, { online: 4812, offline: 6 });
  s += after(F);
  return F.render(s);
}

// ---------- the Incident Management page (existing V11 page), parameterised per state ----------
// o: { open, rows, status, search, selected, hoverRow, pressedRow, detail: null | { status, tab, body, bottom }, after }
const COLS = [['Status', 52], ['Severity', 137], ['Location', 257], ['Date & Time', 377], ['Code', 497], ['Closed By', 617], ['Device ID', 737]];
function select(F, x, y, w, val, o = {}) {
  return rect(x, y, w, o.h || 40, { r: 6, fill: '#282828', stroke: C.t3, sw: 1 }) + text(x + 10, y + (o.h || 40) / 2 + 6, val, { size: 16, fill: '#FFFFFF' }) + poly([[x + w - 32, y + (o.h || 40) / 2 - 3], [x + w - 22, y + (o.h || 40) / 2 - 3], [x + w - 27, y + (o.h || 40) / 2 + 3]], { fill: '#9BA1AC' });
}
function imPage(name, o) {
  const F = new Frame(name, IW, H);
  let s = rect(0, 0, IW, H, { fill: C.frame });
  s += image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  s += g(F, 'Button Exit Incident Management', rect(1265.5, 40.5, 294, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'x', 1284, 53, 20, '#FFFFFF', 2.2) + text(1312, 70, 'Exit Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  s += rect(40, 118, 1520, 911, { r: 16, fill: C.panel, fo: 0.85 });
  // title row: count, open pill, Status filter (NEW), Location, search field, Search
  s += text(256, 165, 'Incident Management', { size: 24, weight: 700, fill: '#FFFFFF' }) + text(256 + textWidth('Incident Management', 24, 700) + 10, 165, `(${TOTAL})`, { size: 24, weight: 700, fill: '#7D8490' });
  const px = 256 + textWidth(`Incident Management (${TOTAL})`, 24, 700) + 30;
  const op = pill(F, px, 149, o.open + ' Open', C.open, { h: 24 });
  s += op.svg; mark('count', [256, 141, px + op.w - 256, 32]);
  s += g(F, 'Status filter NEW', select(F, 900, 135, 155, 'Status · ' + (o.status || 'All'), { h: 38 })); mark('statusFilter', [900, 135, 155, 38]);
  s += rect(1070, 135, 155, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + text(1080, 160, 'Location', { size: 16, fill: '#FFFFFF' }) + poly([[1200, 151], [1210, 151], [1205, 157]], { fill: C.t2 });
  s += rect(1225, 135, 200, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'search', 1234, 145, 18, C.t2, 2);
  if (o.search) s += g(F, 'Search text NEW', text(1258, 160, o.search, { size: 16, fill: '#FFFFFF' }) + icon(F, 'x', 1399, 145, 18, C.t2, 2));
  mark('search', [1225, 135, 200, 38]);
  s += rect(1438, 135, 106, 38, { r: 6, fill: C.tabOn }) + icon(F, 'search', 1452, 145, 18, '#FFFFFF', 2) + text(1478, 160, 'Search', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += text(60, 232, 'All', { size: 18, weight: 500, fill: C.link }) + text(97, 232, 'Open', { size: 18, fill: C.t2 }) + text(153, 232, 'Closed', { size: 18, fill: C.t2 });
  s += g(F, 'Button Export', rect(603, 206, 106, 40, { r: 6, fill: C.tabOn }) + icon(F, 'download', 619, 216, 18, '#FFFFFF', 2.2) + text(648, 232, 'Export', { size: 16, weight: 700, fill: '#FFFFFF' })); mark('export', [603, 206, 106, 40]);
  s += rect(718.5, 206.5, 125, 39, { r: 6, stroke: C.t3 }) + text(733, 232, 'Filter (0)', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'filter', 812, 216, 18, '#FFFFFF', 2);
  // table
  s += rect(40, 254, 804, 42, { fill: '#262A31' });
  COLS.forEach(([c, x]) => { s += text(x, 281, c, { size: 14, weight: 500, fill: '#FFFFFF' }); });
  const rows = o.search ? o.rows.filter(r => r[4] === o.search) : o.rows;
  rows.forEach(([st, sev, loc, dt, code, by, dev], i) => {
    const y = 296 + i * 56;
    let r = '';
    if (i === o.selected) r += rect(40, y, 804, 56, { fill: '#3A3F47' });
    r += pill(F, 52, y + 16, st, st === 'Open' ? C.open : C.closed, { h: 25, r: 7.5, pad: 20 }).svg;
    r += pill(F, 137, y + 18, sev, SEVC[sev], { h: 21, r: 6, pad: 16 }).svg;
    r += text(257, y + 33, loc.length > 16 ? loc.slice(0, 14) + '…' : loc, { size: 14, fill: '#FFFFFF' }) + text(377, y + 33, dt, { size: 12, fill: '#FFFFFF' }) + text(497, y + 33, code, { size: 14, fill: '#FFFFFF' });
    if (by) r += text(617, y + 26, by[0], { size: 14, fill: '#FFFFFF' }) + text(617, y + 42, by[1], { size: 12, fill: C.t2 }); else r += text(617, y + 33, '-', { size: 14, fill: '#FFFFFF' });
    r += text(737, y + 33, dev, { size: 14, fill: '#FFFFFF' });
    r += line(40, y + 56, 844, y + 56, { stroke: '#3A3F47' });
    s += g(F, 'Row ' + code, r);
    if (code === 'PER-005') { mark('row', [40, y, 804, 56]); mark('closedBy', [617, y + 14, 110, 32]); mark('status', [52, y + 16, textWidth(st, 14, 500) + 20, 25]); }
    if (i === o.hoverRow) s += hover(F, 40, y, 804, 56, { name: 'row ' + code });
    if (i === o.pressedRow) s += btnState(F, 40, y, 804, 56, 'pressed', { r: 0 });
  });
  if (o.search) {   // filtered list: result count + clear link instead of the pagination
    const ry = 296 + rows.length * 56 + 32, lab = `Showing ${rows.length} of ${TOTAL}`;
    s += g(F, 'Result count NEW', text(52, ry, lab, { size: 14, fill: C.t2 }) + text(52 + textWidth(lab, 14) + 6, ry, '·', { size: 14, fill: C.t2 }) + text(52 + textWidth(lab, 14) + 18, ry, 'Clear search', { size: 14, weight: 500, fill: C.link }));
    mark('showing', [52, ry - 14, textWidth(lab, 14) + 18 + textWidth('Clear search', 14, 500), 20]);
  } else {
    const py = 828;   // pager group inset 16 px so 'Go ›' ends inside the table's right edge (844)
    s += rect(377, py - 15, 105, 30, { r: 15, fill: '#FFFFFF' }) + text(387, py + 5, '10 / page', { size: 13, weight: 500, fill: '#111111' }) + poly([[462, py - 3], [472, py - 3], [467, py + 3]], { fill: '#111111' });
    s += text(510, py + 5, '←', { size: 16, fill: '#FFFFFF' });
    [1, 2, 3].forEach((n, i) => { s += circle(551 + i * 35, py, 10, { fill: i ? '#FFFFFF' : '#1D232C', stroke: '#FFFFFF' }) + text(551 + i * 35, py + 4.5, String(n), { size: 12, weight: 700, fill: i ? '#111111' : '#FFFFFF', anchor: 'middle' }); });
    s += text(654, py + 5, '→', { size: 16, fill: '#FFFFFF' }) + text(687, py + 5, 'Go to page', { size: 13, weight: 700, fill: '#FFFFFF' }) + rect(774, py - 14, 28, 28, { r: 6, fill: '#FFFFFF' }) + text(788, py + 5, '1', { size: 13, weight: 700, fill: '#111111', anchor: 'middle' }) + text(812, py + 5, 'Go ›', { size: 13, weight: 700, fill: C.link });
  }
  // detail pane
  const dx = 860, dy = 198, dw = 700, dh = 831;
  const clip = F.clip(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>`);
  let d = rect(dx, dy, dw, dh, { fill: C.body, fo: 0.8 });
  mark('detail', [dx, dy, dw, dh]);
  if (!o.detail) {   // nothing selected yet
    d += g(F, 'Empty state NEW', icon(F, 'list', dx + dw / 2 - 20, 540, 40, '#6B7280', 1.6) + text(dx + dw / 2, 612, 'Select an incident', { size: 18, weight: 500, fill: C.t2, anchor: 'middle' }) + text(dx + dw / 2, 638, 'Event, cameras, report draft and SOP record appear here', { size: 14, fill: '#6B7280', anchor: 'middle' }));
  } else {
    const dt = o.detail;
    d += rect(dx, dy, dw, 4, { fill: C.crit });
    d += rich(876, 228, [{ t: 'Name: ', fill: C.t2 }, { t: 'AGILFENCE · SECTOR 5 · SEG 5-14', fill: C.t1 }], { size: 16 }) + rich(1210, 228, [{ t: 'ID: ', fill: C.t2 }, { t: 'AGF-5-14', fill: C.t1 }], { size: 16 }) + rich(1375, 228, [{ t: 'Code: ', fill: C.t2 }, { t: 'PER-005', fill: C.t1 }], { size: 16 });
    d += text(876, 258, 'Fence Sector 5', { size: 20, weight: 500, fill: C.t1 });
    const sp = pill(F, 1030, 242, 'Critical', C.crit, { h: 20, size: 13 });
    d += sp.svg;
    const stLab = dt.status === 'Closed' ? `Closed · Grace T. · ${CLOSE_T}` : 'Open';
    const st = pill(F, 1030 + sp.w + 8, 242, stLab, dt.status === 'Closed' ? C.closed : C.open, { h: 20, size: 13 });
    d += g(F, 'Status pill NEW', st.svg); mark('detailStatus', [1030 + sp.w + 8, 242, st.w, 20]);
    d += pill(F, 1440, 242, 'Today, 02:14:58', '#4F545E', { h: 20, size: 13 }).svg;
    DESC.forEach((runs, i) => { d += rich(876, 286 + i * 22, runs.map(r => typeof r === 'string' ? { t: r, fill: C.t2 } : { t: r.b, fill: '#FFFFFF', weight: 500 }), { size: 16 }); });
    const tiles = TILES();
    d += camTile(F, 876, 333, 330, TILE_H, tiles[0]) + camTile(F, 1214, 333, 330, TILE_H, tiles[1]);
    mark('cams', [876, 333, 668, TILE_H]);
    // tabs Remarks / SOP Flow
    const on = dt.tab || 0;
    d += g(F, 'Detail tabs', rect(876, TAB_Y, 334, 40, { fill: on === 0 ? C.tabBody : '#2E333B' }) + rect(1210, TAB_Y, 334, 40, { fill: on === 1 ? C.tabBody : '#2E333B' }) +
      text(1043, TAB_Y + 27, 'Remarks', { size: 18, weight: 700, fill: on === 0 ? '#FFFFFF' : '#8E95A1', anchor: 'middle' }) + text(1377, TAB_Y + 27, 'SOP Flow · ' + (dt.status === 'Closed' ? '6/6' : '5/6'), { size: 18, weight: 700, fill: on === 1 ? '#FFFFFF' : '#8E95A1', anchor: 'middle' }));
    mark('remarksTab', [876, TAB_Y, 334, 40]); mark('sopTab', [1210, TAB_Y, 334, 40]);
    d += rect(876, BODY_Y, 668, BODY_H, { fill: C.tabBody });
    const bclip = F.clip(`<rect x="876" y="${BODY_Y}" width="668" height="${BODY_H}"/>`);
    d += g(F, on === 0 ? 'Remarks tab' : 'SOP Flow tab', `<g clip-path="${bclip}">${dt.body(F)}</g>`);
    // footer: Close Incident (open) or the closed bar
    if (dt.status === 'Closed') {
      const lab = `Closed ${CLOSE_T} · signed off by Grace T. · Head of Security`, tw = textWidth(lab, 20, 700), x0 = 1214 - (tw + 32) / 2;
      d += g(F, 'Closed bar NEW', rect(884, 965, 660, 44, { r: 8, fill: '#2F6B2F' }) + icon(F, 'check', x0, 976, 22, '#FFFFFF', 2.4) + text(x0 + 32, 994, lab, { size: 20, weight: 700, fill: '#FFFFFF' }));
      mark('closedBar', [884, 965, 660, 44]);
    } else {
      d += g(F, 'Button Close Incident', rect(884, 965, 660, 44, { r: 8, fill: C.blue }) + text(1214, 994, 'Close Incident', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
      mark('closeButton', [884, 965, 660, 44]);
    }
  }
  s += g(F, 'Incident detail', `<g clip-path="${clip}">${d}</g>`);
  if (o.after) s += o.after(F);
  return F.render(s);
}
const chipIM = (F, key) => stageChip(F, 700, 149, key).svg;

// ---------- Remarks tab: Co-pilot report draft (tagged, lavender) + the operator's remark ----------
function entry(F, x, y, w, e) {
  const ai = e.who === 'Co-pilot', size = e.size || 14, lh = e.lh || 20;
  let s = circle(x + 8, y + 8, 8, { fill: e.col || '#2E8BFF' });
  if (ai) s += icon(F, 'sparkle', x + 2, y + 2, 12, '#FFFFFF', 2.2);
  s += text(x + 24, y + 14, e.who, { size: 16, weight: ai ? 500 : 400, fill: ai ? C.copilot : '#FFFFFF' });
  if (e.tag) { const ww = textWidth(e.who, 16, 500), tw = textWidth(e.tag, 12, 500) + 12; s += rect(x + 32 + ww, y + 1, tw, 18, { r: 6, fill: C.copilot, fo: 0.22 }) + text(x + 38 + ww, y + 14, e.tag, { size: 12, weight: 500, fill: C.copilot }); }
  s += text(x + w, y + 14, e.time, { size: 14, fill: C.t3, anchor: 'end' });
  const ls = wrap(e.text, w - 26, size);
  ls.forEach((l, i) => { s += text(x + 24, y + 36 + i * lh, l, { size, fill: C.t1 }); });
  let bh = ls.length * lh;
  if (e.sources) { s += text(x + 24, y + 36 + bh + 2, 'Sources: ' + e.sources, { size: 12, fill: C.t2 }); bh += 20; }
  s += rect(x + 7.5, y + 22, 1, bh + 4, { fill: ai ? C.copilot : C.t3, fo: ai ? 0.7 : 1 });
  return { svg: g(F, ai ? 'Co-pilot report draft NEW' : 'Remark ' + e.who, s), h: 36 + bh };
}
function remarksBody(F) {
  const x = 892, w = 636;
  let y = BODY_Y + 13;
  const e1 = entry(F, x, y, w, { who: 'Co-pilot', tag: 'Report draft', time: '02:40:05', col: C.copilot, text: REPORT, sources: SOURCES });
  mark('report', [876, BODY_Y + 7, 668, e1.h + 12]);
  y += e1.h + 10;
  const e2 = entry(F, x, y, w, { who: 'Nurul A.', time: '02:45:10', col: '#2E8BFF', text: 'Reviewed the draft, agree. Segment 5-14 guarded until repair; FM ticket raised.' });
  mark('remark', [876, y - 6, 668, e2.h + 12]);
  y += e2.h;
  const ry = Math.max(828, y + 8);
  return e1.svg + e2.svg + remarksBox(F, x, ry, w, { h: 40, ph: 'Add remark…' });
}
// ---------- SOP Flow tab: Co-pilot briefing on top (improvement 1), then the SOP-PER-02 record ----------
function sopBody(F, closed, pos) {
  const b = copilotBriefing(F, 884, BODY_Y + 4, 652, BRIEF);
  mark('briefing', [884, BODY_Y + 4, 652, b.h]);
  const p = pos || [];
  const r = sopFlow(F, 876, BODY_Y + 4 + b.h + 4, 668, STEPS(closed), { pos: p });
  if (p[2]) { const tw = textWidth(STEPS(closed)[2].tag, 11, 500) + 12; mark('approved', [876 + 668 - 30 - 10 - tw, p[2].y + 8, tw, 17]); }   // step 3 · Dispatch Patrol 2
  if (p[5]) { const tw = textWidth(STEPS(closed)[5].tag, 11, 500) + 12; mark('lastStep', [876, p[5].y, 668, p[5].h]); mark('signoff', [876 + 668 - 30 - 10 - tw, p[5].y + 8, tw, 17]); }   // step 6 · Secure, close and report
  return b.svg + r.svg;
}
function sopLayout(closed) { const pos = []; sopBody(new Frame('m'), closed, pos); return pos; }
const DETAIL = {
  remarks: () => ({ status: 'Open', tab: 0, body: remarksBody }),
  sop: () => ({ status: 'Open', tab: 1, body: F => sopBody(F, false) }),
  closed: () => ({ status: 'Closed', tab: 1, body: F => sopBody(F, true) }),
};

// ---------- Close Incident dialog (NEW): reason, sign-off, report reviewed, audit line ----------
function closeDialog(F) {
  const x = 475, y = 300, w = 650, h = 446;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let m = `<g clip-path="${clip}">${rect(x, y, w, h, { fill: '#333A47' }) + rect(x, y, w, 36, { fill: '#191E25' })}</g>`;
  m += text(x + 16, y + 23, 'Close Incident', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', x + w - 37, y + 8, 20, '#FFFFFF', 2.2);
  m += text(x + 24, y + 68, 'Fence Sector 5', { size: 20, weight: 500, fill: C.t1 }) + pill(F, x + 24 + textWidth('Fence Sector 5', 20, 500) + 14, y + 53, 'Critical', C.crit, { h: 20, size: 13 }).svg;
  m += rich(x + 24, y + 92, [{ t: 'PER-005 · AGF-5-14 · Today, 02:14:58 · ', fill: C.t2 }, { t: 'SOP-PER-02 · 5 of 6 steps done', fill: C.t1 }], { size: 14 });
  m += line(x + 16, y + 110, x + w - 16, y + 110, { stroke: '#6B7280' });
  m += text(x + 24, y + 146, 'Closing reason', { size: 18, fill: '#FFFFFF' }) + text(x + 24 + textWidth('Closing reason', 18), y + 146, '*', { size: 18, fill: C.crit });
  m += select(F, x + 24, y + 157, w - 48, 'Intruder detained · handed to Airport Police');
  m += text(x + 24, y + 233, 'Sign-off', { size: 18, fill: '#FFFFFF' }) + text(x + 24 + textWidth('Sign-off', 18), y + 233, '*', { size: 18, fill: C.crit });
  m += select(F, x + 24, y + 244, w - 48, 'Grace T. · Head of Security');
  m += rect(x + 24, y + 306, 18, 18, { r: 3, fill: '#2E8BFF' }) + icon(F, 'check', x + 26, y + 308, 14, '#FFFFFF', 3) + text(x + 52, y + 320, 'Report reviewed', { size: 16, fill: '#FFFFFF' }) + text(x + 52 + textWidth('Report reviewed', 16) + 10, y + 320, 'Co-pilot draft 02:40:05 · remark by Nurul A. 02:45:10', { size: 13.5, fill: C.t2 });
  m += icon(F, 'doc', x + 24, y + 341, 15, C.t2, 2) + text(x + 46, y + 354, 'On confirm an audit line is written: reason, sign-off, time and the SOP record (6/6).', { size: 13.5, fill: C.t2 });
  m += rect(x + 16.5, y + 386.5, 139, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(x + 86, y + 415, 'Cancel', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' });
  const bx = x + 165, by = y + 386, bw = w - 181, bh = 44;
  m += g(F, 'Button Confirm close', rect(bx, by, bw, bh, { r: 8, fill: C.blue }) + text(bx + bw / 2, by + 29, 'Confirm close', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  mark('dialog', [x, y, w, h]); mark('reason', [x + 24, y + 157, w - 48, 40]); mark('signoff', [x + 24, y + 244, w - 48, 40]); mark('reviewed', [x + 24, y + 306, 18, 18]); mark('confirm', [bx, by, bw, bh]);
  return { svg: rect(0, 0, IW, H, { fill: '#000000', fo: 0.67 }) + g(F, 'Close Incident dialog NEW', m), confirm: [bx, by, bw, bh] };
}

// ---------- Export menu (NEW): PDF report / CSV list, carries the current filters ----------
function exportMenu(F, x, y) {
  const w = 164, m = menu(F, x, y, w, ['PDF report', 'CSV list', ''], {});
  const fy = y + 6 + 2 * 36;
  let s = m.svg + g(F, 'Export footnote NEW', line(x + 8, fy + 2, x + w - 8, fy + 2, { stroke: '#4A505B' }) + icon(F, 'filter', x + 14, fy + 11, 13, C.t2, 2) + text(x + 32, fy + 22, 'Carries current filters', { size: 11.5, fill: C.t2 }));
  const kx = x + 53;   // caret under the midpoint of the 106-wide Export button (menu flush-left with the button)
  s += g(F, 'Menu caret NEW', pathEl(`M${f(kx - 7)} ${f(y + 0.5)} L${f(kx)} ${f(y - 7)} L${f(kx + 7)} ${f(y + 0.5)} Z`, { fill: '#262A31', stroke: '#4A505B', sw: 1 }) + rect(kx - 6.5, y - 0.5, 13, 2, { fill: '#262A31' }));
  mark('exportMenu', [x, y, w, m.h]);
  return { svg: s, h: m.h };
}

// ---------- UC5-S1 · Detect · header: Incident Management hovered, then clicked ----------
export function s1() {
  return consoleFrame('UC5-S1 · Detect · header · Incident Management hovered and clicked', F => {
    const bx = 1103.5, by = 40.5, bw = 256, bh = 45;
    mark('imButton', [bx, by, bw, bh]);
    let s = btnState(F, bx, by, bw, bh, 'hover', { r: 7.5 });
    const cx = 1268, cy = 70;
    s += cursor(F, cx, cy, { click: true });
    s += stageChip(F, 400, 100, 'detect').svg;
    s += note(F, 880, 100, 'Hover + click · Incident Management', { to: [cx, cy] }).svg;
    s += note(F, 400, 136, 'Shows · the overall incident list · (24) · 5 Open · 07:00 handover', { kind: 'shows' }).svg;
    return s;
  });
}

// ---------- UC5-S2 · Correlate · list, Status dropdown open, hover on Open (one hover per frame; the row hover is S3) ----------
export function s2() {
  return imPage('UC5-S2 · Correlate · overall list (24) · Status filter open · All / Open / Closed', {
    open: 5, rows: ROWS(false), status: 'All', selected: -1, hoverRow: -1, detail: null,
    after: F => {
      let s = btnState(F, 900, 135, 155, 38, 'hover', { r: 6 });
      const m = menu(F, 900, 177, 155, ['All', 'Open', 'Closed'], { selected: 0, hover: 1 });
      s += m.svg; mark('statusMenu', [900, 177, 155, m.h]); mark('openItem', [904, 219, 147, 36]);
      const cx = 962, cy = 241;
      s += cursor(F, cx, cy);
      s += chipIM(F, 'correlate');
      s += note(F, 1075, 226, 'Hover · Status › Open', { to: [cx, cy] }).svg;
      s += note(F, 1075, 184, 'Shows · Status filter · All / Open / Closed', { kind: 'shows', to: [1055, 192] }).svg;
      return s;
    },
  });
}

// ---------- UC5-S3 · Contextualise · search "PER-005" typed, list filtered to the row ----------
export function s3() {
  return imPage('UC5-S3 · Contextualise · search PER-005 · Showing 1 of 24 · row hovered', {
    open: 5, rows: ROWS(false), status: 'All', search: 'PER-005', selected: -1, hoverRow: 0, detail: null,
    after: F => {
      let s = focusRing(F, 1225, 135, 200, 38, 6);
      const kx = 1258 + textWidth('PER-005', 16) + 2;
      s += caret(F, kx, 143, 22); mark('caret', [kx, 143, 2, 22]);
      const cx = 572, cy = 330;   // mouse rests on the row, keyboard focus stays in the search field
      s += cursor(F, cx, cy);
      s += chipIM(F, 'context');
      s += note(F, 1250, 190, 'Type · PER-005', { to: [kx + 1, 166] }).svg;
      s += note(F, 60, 430, 'Shows · 1 of 24 · filtered to PER-005', { kind: 'shows', to: [200, 352] }).svg;
      return s;
    },
  });
}

// ---------- UC5-S4 · Contextualise · row clicked: detail with the report draft ----------
export function s4() {
  return imPage('UC5-S4 · Contextualise · row clicked · detail · Remarks with the Co-pilot report draft', {
    open: 5, rows: ROWS(false), status: 'All', search: 'PER-005', selected: 0, pressedRow: 0, detail: DETAIL.remarks(),
    after: F => {
      const cx = 584, cy = 330;   // in the gap between Code and Closed By: the ripple leaves the cell text clear
      let s = cursor(F, cx, cy, { click: true });
      s += chipIM(F, 'context');
      const u = note(F, 0, 0, 'Click · PER-005 row');
      s += note(F, cx + 12 - u.w, 212, 'Click · PER-005 row', { to: [cx, cy] }).svg;   // right edge short of the Export button
      const n = note(F, 0, 0, 'Shows · event, cameras, report draft (Co-pilot) + remark', { kind: 'shows' });
      s += note(F, 866 - n.w, 560, 'Shows · event, cameras, report draft (Co-pilot) + remark', { kind: 'shows', to: [868, BODY_Y + 23] }).svg;
      return s;
    },
  });
}

// ---------- UC5-S5 · Orchestrate · SOP Flow tab: briefing + completed steps with approvals ----------
export function s5() {
  const pos = sopLayout(false);
  return imPage('UC5-S5 · Orchestrate · SOP Flow tab · briefing + completed steps · approvals', {
    open: 5, rows: ROWS(false), status: 'All', search: 'PER-005', selected: 0, detail: DETAIL.sop(),
    after: F => {
      const cx = 1486, cy = TAB_Y + 23;   // click lands right of the tab label so the ripple leaves the text clear
      let s = cursor(F, cx, cy, { click: true });
      s += chipIM(F, 'orchestrate');
      const u = note(F, 0, 0, 'Click · SOP Flow');
      s += note(F, 1544 - 6 - u.w, 335, 'Click · SOP Flow', { to: [cx, cy] }).svg;   // in the CAM 7-11 header strip, right of its label: off the footage, leader straight down to the ripple
      const tagY = pos[2].y + 8;   // step 3 · Dispatch Patrol 2 · Approved · Nurul A.
      const n = note(F, 0, 0, 'Shows · briefing + approvals with names and times', { kind: 'shows' });
      s += note(F, 866 - n.w, 560, 'Shows · briefing + approvals with names and times', { kind: 'shows', to: [868, tagY + 8] }).svg;
      return s;
    },
  });
}

// ---------- UC5-S6 · Assist & govern · Close Incident clicked → dialog, Confirm close ----------
export function s6() {
  return imPage('UC5-S6 · Assist & govern · Close Incident clicked · dialog · reason, sign-off, Confirm close', {
    open: 5, rows: ROWS(false), status: 'All', search: 'PER-005', selected: 0, detail: DETAIL.sop(),
    after: F => {
      let s = btnState(F, 884, 965, 660, 44, 'pressed');
      const d = closeDialog(F);
      s += d.svg;
      const [bx, by, bw, bh] = d.confirm;
      s += btnState(F, bx, by, bw, bh, 'hover');
      const cx = bx + bw / 2 + 104, cy = by + 26;
      s += cursor(F, cx, cy, { click: true });
      s += chipIM(F, 'govern');
      s += note(F, 640, 770, 'Click · Confirm close', { to: [cx, cy] }).svg;
      s += note(F, 1140, 312, 'Shows · Close Incident · reason + sign-off + audit', { kind: 'shows', to: [1125, 326] }).svg;
      return s;
    },
  });
}

// ---------- UC5-S7 · Assist & govern · closed state, Export hovered with its menu ----------
export function s7() {
  return imPage('UC5-S7 · Assist & govern · Closed · Grace T. · 07:02 · audit line · Export menu', {
    open: 4, rows: ROWS(true), status: 'All', search: 'PER-005', selected: 0, detail: DETAIL.closed(),
    after: F => {
      let s = btnState(F, 603, 206, 106, 40, 'hover', { r: 6 });
      s += exportMenu(F, 603, 252).svg;   // flush-left under the Export button (603–709); row 1's Closed By text is carried by the Shows pill and the pane
      const cx = 612, cy = 236;
      s += cursor(F, cx, cy);
      s += confirmToast(F, 60, 930, 'Incident PER-005 closed · audit line written', `Intruder detained · handed to Airport Police · Grace T. · Head of Security · ${CLOSE_T}`, { w: 600 });
      mark('toast', [60, 930, 600, 70]);
      s += chipIM(F, 'govern');
      s += note(F, 380, 212, 'Hover · Export', { to: [cx, cy] }).svg;
      s += note(F, 60, 440, `Shows · row Closed · Grace T. · ${CLOSE_T} · PDF / CSV carry the filters`, { kind: 'shows', to: [603, 372] }).svg;   // menu's bottom-left corner
      return s;
    },
  });
}

export const FRAMES = [
  ['UC5-S1-detect-open-incident-management', s1],
  ['UC5-S2-correlate-status-filter', s2],
  ['UC5-S3-contextualise-search-per-005', s3],
  ['UC5-S4-contextualise-detail-report-draft', s4],
  ['UC5-S5-orchestrate-sop-record-approvals', s5],
  ['UC5-S6-govern-close-dialog', s6],
  ['UC5-S7-govern-closed-export', s7],
];
