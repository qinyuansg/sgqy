// AgilFence operator experience v2 inside the ORIGINAL V11 screens (DEMOFLOW-V2.md §7 'V11 fidelity').
// The Active Alarms panel opens itself on the Critical fence alarm (Investigation tab by default, three camera
// tiles), the 3D viewer Locates to segment 5-14 with the nearest cameras and the PTZ 7-02 live player floating in
// the viewer. Verification lives in the Investigation tab (System entries), the decision and the response lanes
// live in the SOP Flow tab (steps 1–7, Critical Action steps with buttons), the duty manager signs off on the
// V11 Incident Management page. Header, Real Time Alerts, Device Status, tabs and footer come unchanged from
// lib/v11.mjs. Pressed / hover states only where a click happens; no cursors (the film draws its own).
// All names, IDs, times and SOP clauses are illustrative.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, poly, text, rich, icon, image, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, modelToggle, pill, alertsPanel, alertCard, deviceStatus, activeAlarms, timeline, remarksBox, sopFlow, scene, eventHead, camTile } from '../../lib/v11.mjs';
import { camera, clayAirport, marker } from '../../lib/clay.mjs';
import { AF, fenceSite, nearestCams, player } from '../../lib/fence.mjs';
import { btnState, confirmToast, plainCards } from '../../lib/demo.mjs';
import { ALERTS, BYK } from '../data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// ---------- anchors (frame px rects the film pushes on / clicks) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };
// layout guard: warn when a label would not fit its slot at the kit size (never shrink text)
const fits = (what, s, size, wt, max) => { const w = textWidth(s, size, wt); if (w > max) console.warn(`[${CUR}] ${what} too wide: "${s}" ${w.toFixed(0)} > ${max}`); };

const OWNER = 'Nurul A.', DM = 'Daniel L.';
const LOC = ['Main Airport', 'Airfield'];
const HEAD = { loc: LOC, placeholder: 'Search…' };

// ---------- Real Time Alerts (left list) ----------
// other cards in clock times only; the fence card is the FIRST card while the alarm / incident is live
const OTHER = {
  watch: [['02:12 am', 'Possible watchlist match, loitering since 01:49'], ['01:12 am', 'Possible watchlist match, loitering since 00:49']],
  spoof: [['02:13 am', 'Same card used at T3 A17 at 02:09'], ['01:13 am', 'Same card used at T3 A17 at 01:09']],
  fight: [['02:11 am', 'Fight detected, crowd forming'], ['01:11 am', 'Fight detected, crowd forming']],
  bag: [['02:04 am', 'Unattended bag since 01:52, owner located'], ['01:04 am', 'Unattended bag since 00:52, owner located']],
  overstay: [['01:45 am', 'In restricted zone since 22:05'], ['00:45 am', 'In restricted zone since 21:05']],
};
const FENCE_DESC = {
  alarm: 'AgilFence alarm · segment 5-14 · climb',
  incident: 'Incident PER-005 · AgilFence 5-14 · climb',
  pending: 'Incident PER-005 · Pending sign-off',
  cleared: 'Cleared · authorised activity · PTW-2231',
};
// o.fence: key of FENCE_DESC or null (no card); o.alt: the other night (A-path);
// o.late: the frame is minutes after 02:14 (02:16 on), so Staff Door D-214 (02:14:52) and the fence card (02:14:58) show
// their clock time, not 'Now'
function cardList(o) {
  const others = ALERTS.filter(a => a.key !== 'fence').map(a => OTHER[a.key] ? { ...a, time: OTHER[a.key][o.alt ? 1 : 0][0], desc: OTHER[a.key][o.alt ? 1 : 0][1] } : o.alt && a.time === 'Now' ? { ...a, time: '01:14 am' } : o.late && a.time === 'Now' ? { ...a, time: '02:14 am' } : a);
  // cleared (A-path): the card stays in the list with a neutral stripe and its clock time, no longer Critical
  const fence = o.fence ? [{ ...BYK.fence, title: 'Fence Sector 5', desc: FENCE_DESC[o.fence], time: o.fence === 'cleared' ? '01:22 am' : o.late ? '02:14 am' : 'Now', ...(o.fence === 'cleared' ? { sev: 'Cleared' } : {}) }] : [];
  return plainCards([...fence, ...others], o.fence && o.sel !== false ? 'fence' : null);
}
SEVC.Cleared = SEVC.Cleared || C.closed;   // neutral stripe for a cleared alarm card (local key, not a severity)
const counts = crit => [[crit + ' Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];

// ---------- 3D viewer ----------
// home: whole airport, markers for tonight's alerts (fence only while live)
function airportView(F, withFence) {
  const P = camera(870, 520, 8.4, 50, 29);
  const mk = ALERTS.filter(a => withFence || a.key !== 'fence').map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: a.key === 'tailgate' ? 'D-214 · Tailgating' : undefined, left: a.key === 'watch' || a.key === 'spoof' }));
  return scene(F, clayAirport(F, P, { markers: mk, alarmFence: !!withFence }));
}
// Locate (automatic): close-up of the north fence with segment 5-14, sensors, cameras and their cones (UC2 AF pattern)
function locateView(F, o = {}) {
  const P = camera(570, 490, 40, 63, 1);
  let s = clayAirport(F, P, { alarmFence: false, lidar: false, labels: false, markers: [] });
  s += fenceSite(F, P, { cams: AF.cams.map(c => ({ ...c, place: 'above', label: c.id === 'PTZ 7-03' ? false : undefined })), alarm: o.alarm });
  s += marker(F, P, { X: 63, Y: 1, sev: o.sev || 'Critical', icon: 'fence', h: 2.5, label: o.label || 'Seg 5-14 · Alarm' });
  { const [hx, hy] = P(63, 1, 2.5), lw = textWidth(o.label || 'Seg 5-14 · Alarm', 14, 500) + 24; mark('segment', [hx - 20, hy - 20, lw + 62, 40]); }
  return scene(F, s);
}
// response: wider north perimeter, patrol on the perimeter road, runway note, the tracking camera labelled
function patrolView(F, o = {}) {
  const P = camera(615, 495, 30, 61, 3.5);
  let s = clayAirport(F, P, { alarmFence: false, lidar: false, labels: false, markers: [], cullX: 390 });   // nothing behind the Real Time Alerts panel
  const patrol = { ...AF.patrol, id: 'Patrol 2', eta: o.eta || 'ETA 02:18:30', at: o.at || AF.patrol.from, place: 'below', minX: 392, dy: 34 };
  const lost = !!o.ptz703;
  const cams = [
    { ...AF.cams[0], pref: !lost, place: 'left', text: lost ? 'PTZ 7-02 · video lost' : 'PTZ 7-02 · tracking', label: undefined },
    { ...AF.cams[1], label: false },
    { ...AF.cams[2], pref: lost, label: false },
  ];
  if (lost) cams[0].cone = false;
  s += fenceSite(F, P, { cams, patrol, runway: { X: 64, Y: 6.4, label: o.runway || 'Runway 02L · 130 m', col: o.runwayCol }, alarm: o.alarm });
  s += marker(F, P, { X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: 3.2, label: o.label || 'Seg 5-14 · PER-005' });
  { const [vx, vy] = P(...patrol.at, 0.2); mark('patrol', [vx - 18, vy - 18, 36, 36]); }
  return scene(F, s);
}

// floating in the viewer: nearest cameras (top-left) and the live player (bottom), both opened by the Locate
const NC = { x: 400, y: 140, w: 300 };
const PL = { x: 400, y: 586, w: 476, h: 300 };
const NEAR = {
  live: () => [
    { ...AF.cams[0], state: 'Live · on target' },
    { ...AF.cams[1], state: 'Live' },
    { ...AF.cams[2], state: 'Live' },
  ],
  handover: () => [
    { ...AF.cams[2], pref: true, state: 'Live · on target' },
    { ...AF.cams[1], state: 'Live' },
    { ...AF.cams[0], pref: false, state: 'Video lost', lost: true },
  ],
};
function overlays(F, o) {
  let s = '';
  if (o.near) {
    const list = NEAR[o.near]();
    const n = nearestCams(F, NC.x, NC.y, list, { w: NC.w, note: 'Seg 5-14' });
    s += n.svg;
    // a lost camera: grey status dot instead of the online green
    list.forEach((c, i) => {
      if (!c.lost) return;
      const ry = NC.y + 50 + i * 54, sw = textWidth(c.state, 12, 500) + 18;
      s += circle(NC.x + NC.w - 20 - sw + 10, ry + 24, 3.5, { fill: '#9BA1AC' });
    });
    mark('nearestCams', [NC.x, NC.y, NC.w, n.h]);
  }
  if (o.player) {
    const p = o.player;
    let b = rect(PL.x - 6, PL.y - 6, PL.w + 12, PL.h + 24, { r: 12, fill: '#1D232C', fo: 0.97, stroke: '#3E4655', filter: F.shadow(10, 18, 0.5) });
    b += player(F, PL.x, PL.y, PL.w, PL.h, p.cam, { badge: 'LIVE', clip: p.clip });
    s += g(F, 'Live view (Locate)', b);
    mark('viewerPlayer', [PL.x - 6, PL.y - 6, PL.w + 12, PL.h + 24]);
  }
  return s;
}
// player cameras (1280×720 scenes); zoomed so the person reads in the floating player
const PCAM = {
  climb: () => ({ href: cctv('fence_ptz_clean'), label: 'PTZ 7-02 · Live · preset 5-14', focus: [0.5, 0.42], zoom: 1.35, box: box('fence_ptz', 'person'), boxCol: C.crit, boxLabel: 'Person · climbing' }),
  track: () => ({ href: cctv('fence_inside_clean'), label: 'PTZ 7-02 · Live · auto-track T-07', focus: [0.55, 0.6], zoom: 1.35, box: box('fence_inside', 'person'), boxCol: C.crit, boxLabel: 'Person · T-07' }),
  p703: () => ({ href: cctv('thermal_clean'), label: 'PTZ 7-03 · Live · took over 02:16:42', focus: [0.54, 0.5], zoom: 1.3, box: box('thermal', 'person'), boxCol: C.crit, boxLabel: 'Person · T-07' }),
  handed: () => ({ href: cctv('fence_handover_clean'), label: 'PTZ 7-03 · Live', focus: [0.5, 0.56], zoom: 1.15, box: box('fence_handover', 'person'), boxCol: C.crit, boxLabel: 'Handed to police · AP-12' }),
  guard: () => ({ href: cctv('fence_wide_clean'), label: 'CAM 7-11 · Live · 5-14', focus: [0.62, 0.45], zoom: 1.5, box: box('fence_wide', 'person'), boxCol: C.blue, boxLabel: 'Guard posted · 5-14' }),
  crew: () => ({ href: cctv('fence_crew_clean'), label: 'PTZ 7-02 · Live · preset 5-14', focus: [0.55, 0.55], zoom: 1.4, box: box('fence_crew', 'crew1'), boxCol: '#0E7C8A', boxLabel: 'Crew · hi-vis · PTW-2231' }),
};
const LIVECLIP = (from = '02:14:41') => ({ from, alarm: 0.62, now: 1, to: 'LIVE', live: true });

// ---------- Active Alarms: event head + three camera tiles ----------
// Code stays '—' while it is an alarm; PER-005 only exists from the operator's confirmation (02:15:24) on
const EV = (lines, o = {}) => ({ time: o.t0 || '02:14:58', id: 'AGF-5-14', code: o.code || '—', title: 'Fence Sector 5', lines, ...(o.badge ? { badge: o.badge } : {}) });
const LINES = {
  alarm: [['AgilFence alarm on segment 5-14 · climb signature'], ['PTZ ', { b: '7-02' }, ' live on segment 5-14 · runway ', { b: '02L' }, ' 130 m']],
  incident: [['Incident ', { b: 'PER-005' }, ' · raised from alarm AGF-5-14'], ['History since ', { b: '02:14:58' }, ' · owner ', { b: OWNER }]],
  alt: [['AgilFence alarm on segment 5-14 · climb signature'], ['Permit ', { b: 'PTW-2231' }, ' · fence repair · crew of 2']],
};
const TILE = {
  ptz: (o = {}) => ({ href: cctv('fence_ptz_clean'), label: 'PTZ 7-02 · Live', focus: [0.5, 0.42], box: box('fence_ptz', 'person'), boxCol: C.crit, boxLabel: 'Person · climbing', chips: [['On preset 5-14', C.blue], ['LIVE', C.crit]], ...o }),
  track: (o = {}) => ({ href: cctv('fence_inside_clean'), label: 'PTZ 7-02 · Live', focus: [0.55, 0.62], box: box('fence_inside', 'person'), boxCol: C.crit, boxLabel: 'Person · T-07', chips: [['Auto-track T-07', C.blue], ['LIVE', C.crit]], ...o }),
  p703: (o = {}) => ({ href: cctv('thermal_clean'), label: 'PTZ 7-03 · Live', focus: [0.54, 0.5], box: box('thermal', 'person'), boxCol: C.crit, boxLabel: 'Person · T-07', chips: [['PTZ 7-02 video lost 02:16:40', C.open]], ...o }),
  handed: (o = {}) => ({ href: cctv('fence_handover_clean'), label: 'PTZ 7-03 · Live', focus: [0.5, 0.56], zoom: 1.1, box: box('fence_handover', 'person'), boxCol: C.crit, boxLabel: 'Handed over', chips: [['LIVE', C.crit]], ...o }),
  guard: (o = {}) => ({ href: cctv('fence_wide_clean'), label: 'PTZ 7-03 · Live', focus: [0.62, 0.45], zoom: 1.5, box: box('fence_wide', 'person'), boxCol: C.blue, boxLabel: 'Guard posted', chips: [['LIVE', C.crit]], ...o }),
  crew: (o = {}) => ({ href: cctv('fence_crew_clean'), label: 'PTZ 7-02 · Live', focus: [0.55, 0.55], zoom: 1.2, box: box('fence_crew', 'crew1'), boxCol: '#0E7C8A', boxLabel: 'Crew · hi-vis', chips: [['On preset 5-14', C.blue], ['LIVE', C.crit]], ...o }),
  replay: (o = {}) => ({ href: cctv('fence_pre_clean'), label: 'CAM 7-11 · Replay 02:14:41', focus: [0.62, 0.6], box: box('fence_pre', 'person'), boxCol: C.warn, chips: [['Pre-alarm', '#3A404B']], ...o }),
  lidar: (o = {}) => ({ href: cctv('lidar_clean'), label: 'LiDAR L-5B · T-07', focus: [0.5, 0.42], ...o }),
};
const TILES = {
  climb: () => [TILE.ptz(), TILE.replay(), TILE.lidar()],
  track: () => [TILE.track(), TILE.replay(), TILE.lidar()],
  p703: () => [TILE.p703(), TILE.replay(), TILE.lidar()],
  handed: () => [TILE.handed(), TILE.replay(), TILE.lidar({ label: 'LiDAR L-5B · T-07 held' })],
  guard: () => [TILE.guard(), TILE.replay({ label: 'CAM 7-11 · clip sealed', chips: [['Evidence', '#3A404B']] }), TILE.lidar({ label: 'LiDAR L-5B · track sealed' })],
  crew: () => [TILE.crew(), TILE.replay({ href: cctv('fence_wide_clean'), label: 'CAM 7-11 · Replay 01:20:14', focus: [0.62, 0.45], zoom: 1.4, box: null }), TILE.lidar({ label: 'LiDAR L-5B · 2 objects' })],
};
function markPanel(o) {
  mark('activeAlarms', [900, 125, 460, 904]);
  mark('tile1', [916, 296, 210, 248]); mark('tile2', [1134, 296, 210, 120]); mark('tile3', [1134, 424, 210, 120]);
  mark('tabInvestigation', [916, 560, 214, 40]); mark('tabSop', [1130, 560, 214, 40]);
  mark('tabBody', [916, 600, 428, 356]);
}

// ---------- Investigation tab: System entries + Remarks (V11) ----------
const OKC = C.green, FOUNDC = C.info;
const INV = {
  linked: { who: 'System', time: '02:15:01', text: '3 alarms linked · one track (T-07)', size: 14, italic: true,
    rows: [['02:14:58', 'AgilFence 5-14 · climb signature', 'Health OK', C.crit], ['02:14:59', 'PTZ 7-02 · person · preset 5-14', 'Health OK', C.crit], ['02:15:01', 'LiDAR L-5B · T-07 · 1 object 1.7 m', 'Health OK', C.crit]] },
  auth: { who: 'System', time: '02:15:06', text: 'Authorised-activity check · 4 of 4 sources Clear', size: 14, italic: true,
    rows: [['02:15:05', 'Permit-to-work · none for Sector 5', 'Clear', OKC], ['02:15:05', 'Patrol roster · no patrol in Sector 5', 'Clear', OKC], ['02:15:06', 'Gate access · no badge at G-5 since 23:40', 'Clear', OKC], ['02:15:06', 'Maintenance schedule · none booked', 'Clear', OKC]] },
  altLinked: { who: 'System', time: '01:20:45', text: '3 alarms linked · works location', size: 14, italic: true,
    rows: [['01:20:31', 'AgilFence 5-14 · climb signature', 'Health OK', C.crit], ['01:20:34', 'LiDAR L-5B · 2 objects at the works', 'Health OK', C.link], ['01:20:45', 'PTZ 7-02 · 2 people, hi-vis', 'Health OK', C.link]] },
  altAuth: { who: 'System', time: '01:20:38', text: 'Authorised-activity check · Found: permit-to-work PTW-2231, fence repair Sector 5, 01:00–04:00, crew of 2', size: 14, italic: true,
    rows: [['01:20:38', 'Permit-to-work · PTW-2231', 'Found', FOUNDC], ['01:20:38', 'Gate access · 2 badges at G-5 01:05', 'Found', FOUNDC], ['01:20:38', 'Maintenance · linked to PTW-2231', 'Found', FOUNDC], ['01:20:38', 'Patrol roster · no patrol in Sector 5', 'Clear', OKC]] },
  // the exception and the patrol radio reports (V11 timeline: oldest first)
  handover: { who: 'System', time: '02:16:42', text: 'PTZ 7-02 video lost · PTZ 7-03 took over 02:16:42 · LiDAR T-07 tracking', size: 14, italic: true },
  onScene: { who: 'Arjun (radio)', time: '02:18:08', text: 'On scene · person stationary inside fence', size: 15, lh: 22 },
  detained: { who: 'Arjun (radio)', time: '02:20:05', text: 'Person intercepted 02:19:30 and detained', size: 15, lh: 22 },
  handedOver: { who: 'Arjun (radio)', time: '02:26:30', text: 'Handed to police · custody record AP-12', size: 15, lh: 22 },
};
// rows of the System entries: label + source must fit (timeline kit: label at x+102, source right-aligned)
function checkRows(e, w) { for (const [, lab, src] of e.rows || []) fits('Investigation row', lab, 13, 500, w - 102 - textWidth(src, 12) - 10); }
const investigation = (entries, keys) => (F, x, y, w, h) => {
  const tx = x + 16, tw = w - 32;
  entries.forEach(e => checkRows(e, tw));
  const tl = timeline(F, tx, y + 12, tw, entries, { gap: 10 });
  // per-entry rects for the film (measured with the same kit call)
  let yy = y + 12;
  entries.forEach((e, i) => {
    const hi = timeline(new Frame('m'), tx, yy, tw, [e], { gap: 10 }).h;
    if (keys[i]) mark(keys[i], [x + 8, yy - 4, w - 16, hi - 2]);
    yy += hi;
  });
  const ry = y + 12 + tl.h + 4;
  return { svg: tl.svg + remarksBox(F, tx, ry, tw, { h: 56 }), h: ry - y + 24 + 56 + 10 + 40 + 16 };
};

// ---------- SOP Flow tab: SOP-PER-02 steps 1–7 (kit sopFlow) ----------
// The decision step carries three buttons; they do not fit one row at the kit size, so the step text reserves a
// second row (two invisible spacer lines) and 'Confirm intrusion' is drawn there in the kit's button style.
const NB = ' '.repeat(64), SPACER = ' ' + NB + ' ' + NB;
const BTN_RED = '#A61B1B', BTN_BLUE = '#1F4FBF', BTN_GREY = '#5A606B';
const kitButton = (F, x, y, lab, fill) => { const bw = textWidth(lab, 15, 700) + 26; return { svg: g(F, 'Action ' + lab, rect(x, y, bw, 32, { r: 6, fill }) + text(x + bw / 2, y + 21.5, lab, { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' })), r: [x, y, bw, 32] }; };

const T = {   // step titles
  verify: 'Verify the alarm', patrol: 'Dispatch Patrol 2', police: 'Airport Police', tower: 'Tower / aviation safety',
  view: 'Keep target in view', contain: 'Contain and hand over', close: 'Secure, close and report',
};
// one wording and one time per evidence item, in time order (same in the S13 sign dialog and the S12 remark)
const EVIDENCE = [
  ['Handed to police · custody record AP-12 · 02:26:30', true],
  ['Runway 02L restored · tower, ATC Tan · 02:31:10', true],
  ['Area secured · Sector 5 sweep, Patrol 2 · 02:38:40', true],
  ['Fence 5-14 made safe · FM-90412, guard posted · 02:40:15', true],
  ['SOP-PER-02 steps 1–6 complete · 02:43:30', true],
  ['Evidence sealed · 3 clips, fence trace, LiDAR · 02:43:40', true],
];
// one SOP state per frame; k = stage key. Steps after the current stage stay plain headers (todo).
const ORD = { verify: 0, confirm: 0, altVerify: 0, altCleared: 0, raised: 1, dispatch: 1, running: 2, handover: 3, contained: 4, submit: 5 };
function steps(k) {
  const n = ORD[k], S = {};
  // 1 · Verify the alarm (Critical Action: the operator's decision becomes the record)
  if (k === 'verify' || k === 'confirm') S[1] = { title: T.verify, state: 'critical', tag: 'Your decision', text: '3 sensors on one track · authorised-activity check Clear. Your decision becomes the incident record.' + SPACER, actions: [['Authorised activity', 'grey'], ['False alarm', 'grey']] };
  else if (k === 'altVerify') S[1] = { title: T.verify, state: 'critical', tag: 'Your decision', text: 'Permit PTW-2231 found · 2 people in hi-vis at the works location. Your decision becomes the record.' + SPACER, actions: [['Authorised activity', 'blue'], ['False alarm', 'grey']] };
  else if (k === 'altCleared') S[1] = { title: T.verify, state: 'done', tag: 'Authorised · 01:22:10', items: [['Works supervisor called to confirm crew · 01:21:40', true], ['Authorised activity · Nurul A. · 01:22:10 · PTW-2231', true], ['Alarm kept in the record · no incident raised', true]] };
  else S[1] = { title: T.verify, state: 'done', tag: 'Confirmed · Nurul A. · 02:15:24' };
  // 2 · Dispatch Patrol 2 (Critical Action, pre-authorised for Critical)
  if (n < 1) S[2] = { title: T.patrol, state: 'todo', tag: 'Pre-authorised · SOP-PER-02 §3.1' };
  else if (n === 1) S[2] = { title: T.patrol, state: 'critical', tag: 'Pre-authorised · SOP-PER-02 §3.1', text: 'Patrol 2 (Arjun + 1) · nearest · perimeter road · ETA 02:18:30', actions: [['Dispatch', 'blue'], ['Choose another', 'grey']] };
  else if (n <= 3) S[2] = { title: T.patrol, state: 'todo', tag: 'En route · ETA 02:18:30' };
  else S[2] = { title: T.patrol, state: 'done', tag: 'On scene · 02:18:08' };
  // 3 · Airport Police (pre-authorised §3.2), duty manager informed in parallel
  S[3] = { title: T.police, state: 'todo', tag: 'Pre-authorised · SOP-PER-02 §3.2' };
  if (n === 1) S[3].items = [['Requested · with your confirmation · 02:15:25', true], ['Contacted · Airport Police ops room', false], ['Duty manager Daniel L. informed · 02:15:25', true]];
  if (n === 2) S[3].items = [['Requested · 02:15:25', true], ['Contacted · Airport Police ops room · 02:15:38', true], ['Acknowledged · Sgt. Lim (APD) · 02:15:52', true], ['Responding · unit AP-12 · ETA 02:24:00 · 02:16:05', true], ['On scene', false], ['Duty manager Daniel L. acknowledged · 02:15:41', true]];
  if (n === 3) S[3].tag = 'Responding · AP-12 · 02:16:05';
  if (n >= 4) S[3] = { title: T.police, state: 'done', tag: 'On scene · AP-12 · 02:24:10' };
  // 4 · Tower / aviation safety (authority: ATC; security sees the decision and its status)
  S[4] = { title: T.tower, state: 'todo', tag: 'Authority: ATC' };
  if (n === 1) S[4].items = [['Tower notified · person 130 m from Runway 02L · 02:15:25', true], ['ATC decision · awaiting tower', false]];
  if (n === 2) S[4].items = [['Tower notified · person 130 m from Runway 02L · 02:15:25', true], ['ATC supervisor Tan · Runway 02L arrivals held · 02:15:58', true], ['Restriction active · no movements on 02L', true]];
  if (n === 3 || n === 4) S[4].tag = 'Restriction active · ATC';
  if (n >= 5) S[4] = { title: T.tower, state: 'done', tag: 'Restored · ATC Tan · 02:31:10' };
  // 5 · Keep target in view (Auto) — the camera hand-over is recorded here
  S[5] = { title: T.view, state: 'todo', tag: n >= 1 ? 'Auto · PTZ 7-02 on T-07' : 'Auto' };
  if (n === 3) S[5] = { title: T.view, state: 'todo', tag: 'Auto', items: [['LiDAR L-5B tracking T-07', true], ['PTZ 7-02 video lost · 02:16:40', true], ['PTZ 7-03 took over automatically · 02:16:42', true], ['PTZ 7-03 auto-track on T-07 · LiDAR T-07 tracking', true]] };
  if (n === 4) S[5].tag = 'Auto · PTZ 7-03 on T-07';
  if (n >= 5) S[5] = { title: T.view, state: 'done', tag: 'Auto · ended 02:26:30' };
  // 6 · Contain and hand over (outcomes, reported by Patrol 2 by radio)
  S[6] = { title: T.contain, state: 'todo', tag: n >= 1 ? 'Patrol 2 · by radio' : null };
  if (n === 4) S[6] = { title: T.contain, state: 'done', tag: 'Handed over · 02:26:30', items: [['Contained · person stationary inside fence · 02:18:08', true], ['Intercepted · 02:19:30', true], ['Detained · 02:20:05', true], ['Police on scene · AP-12 · 02:24:10', true], ['Handed to police · custody AP-12 · 02:26:30', true]] };
  if (n >= 5) S[6] = { title: T.contain, state: 'done', tag: 'Handed over · 02:26:30' };
  // 7 · Secure, close and report (evidence gate, Critical Action Submit for sign-off)
  S[7] = { title: T.close, state: 'todo', tag: n >= 1 ? 'Evidence gate' : null };
  if (n === 5) S[7] = { title: T.close, state: 'critical', tag: 'Your submission', text: 'Closing is blocked until every item is complete.', items: EVIDENCE, actions: [['Submit for sign-off', 'blue']] };
  if (k === 'altCleared') for (let i = 2; i <= 7; i++) S[i] = { title: S[i].title, state: 'todo', tag: 'Not required' };
  return [1, 2, 3, 4, 5, 6, 7].map(i => S[i]);
}
// guard every step: title vs tag, item widths, text at kit sizes
function checkSteps(list, w) {
  list.forEach((st, i) => {
    const tagW = st.tag ? textWidth(st.tag, 11, 500) + 12 : 0, tagX = w - 30 - 10 - tagW, titleEnd = 44 + textWidth(st.title, 16, 500);
    if (st.tag && titleEnd + 6 > tagX) console.warn(`[${CUR}] step ${i + 1} title/tag overlap`, st.title, '|', st.tag);
    for (const [lab] of st.items || []) fits('SOP item', lab, 12.5, 400, w - 62 - 14);
    if (st.actions) { const aw = st.actions.reduce((a, [l]) => a + textWidth(l, 15, 700) + 26 + 8, -8); if (40 + aw > w - 12) console.warn(`[${CUR}] step ${i + 1} actions overflow`, aw); }
  });
}
// o: { focus: step index to bring into view, keys: {i: anchorKey}, press: {key: 'pressed'|'hover'}, alt }
const sopBody = (k, o = {}) => (F, x, y, w, h) => {
  const list = steps(k);
  checkSteps(list, w);
  const pos = [];
  const r = sopFlow(F, x, y + 6, w, list, { pos });
  const full = 6 + r.h + 8;
  // second action row of the decision step: 'Confirm intrusion' (kit button style) above the kit row
  let extra = '';
  const btn = {};
  if (list[0].state === 'critical' && pos[0].actions.length) {
    const [ax, ay] = pos[0].actions[0];
    const c = kitButton(F, ax, ay - 38, 'Confirm intrusion', BTN_RED);
    extra += c.svg; btn.confirmBtn = c.r;
    btn.authorisedBtn = pos[0].actions[0]; btn.falseBtn = pos[0].actions[1];
  }
  if (list[1].state === 'critical' && pos[1].actions.length) btn.dispatchBtn = pos[1].actions[0];
  if (list[6].state === 'critical' && pos[6].actions.length) btn.submitBtn = pos[6].actions[0];
  // scroll so the focused step is fully in view (never shrink: the body scrolls, the kit idiom)
  let sc = 0;
  if (o.top != null && full > h) {
    sc = Math.min(Math.max(0, pos[o.top].y - y - 14), full - h + 20);   // up to 20 px of end padding so no header straddles the top
    // no step header may straddle the bottom edge: scroll back so it sits fully below (keeps the focused step on top)
    for (const p of pos) { const y0 = p.y - y; if (sc + h > y0 && sc + h < y0 + 32) sc = Math.max(0, y0 - h); }
    // nor the top edge: a step whose header would be cut is scrolled out (up to 60 px of end padding) or fully into view
    for (const p of pos) {
      const y0 = p.y - y;
      if (sc > y0 - 6 && sc < y0 + 32) { const hide = y0 + p.h - 14; sc = hide <= full - h + 60 ? hide : Math.max(0, y0 - 6); break; }
    }
  }
  const st = { x, w };
  for (const [i, key] of Object.entries(o.keys || {})) { const p = pos[i]; if (p) mark(key, [x, p.y - sc, w, p.h]); }
  let states = '';
  for (const [key, r0] of Object.entries(btn)) {
    const rr = [r0[0], r0[1] - sc, r0[2], r0[3]];
    mark(key, rr);
    if (o.press && o.press[key]) states += btnState(F, ...rr, o.press[key], { r: 6 });
  }
  let s = `<g transform="translate(0 ${f(-sc)})">${r.svg + extra}</g>` + states;
  if (sc > 0) {   // scrolled: own thumb at the scroll position + top fade (kit draws only the top thumb)
    const th = Math.max(24, h * h / full - 8), ty = y + 4 + (h - 8 - th) * Math.min(1, sc / (full - h));
    s += rect(x, y, w, 12, { fill: F.lin([[0, C.tabBody, 1], [1, C.tabBody, 0]], 0, 0, 0, 1) }) + rect(x + w - 6, ty, 3, th, { r: 1.5, fill: '#FFFFFF', fo: 0.35 });
    if (sc < full - h) s += rect(x, y + h - 28, w, 28, { fill: F.lin([[0, C.tabBody, 0], [1, C.tabBody, 1]], 0, 0, 0, 1) });
    return { svg: s, h };
  }
  return { svg: s, h: full };
};

// ---------- frame template: the V11 console ----------
function consoleFrame(name, o) {
  const F = new Frame(name, W, H);
  let s = o.center(F);
  s += header(F, HEAD);
  if (o.toggle) s += modelToggle(F);
  s += alertsPanel(F, { cluster: 'All terminals', counts: counts(o.crit ?? 2), cards: cardList(o.cards || {}) });
  if (o.cards && o.cards.fence) {
    const c0 = cardList(o.cards)[0];
    mark('fenceCard', [40, 296, 336, alertCard(new Frame('m'), 40, 296, 336, c0).h]);
  }
  s += deviceStatus(F, { online: 4812, offline: o.offline ?? 6 });
  if (o.alarm) { s += activeAlarms(F, { bodyH: 356, ...o.alarm }); markPanel(o.alarm); }
  if (o.alarm && o.alarm.pressTab) s += btnState(F, 1130, 560, 214, 40, 'pressed', { r: 0 });
  s += overlays(F, o);
  if (o.newIncident) {   // header Incident Management button: '1 new' (spec §7)
    s += g(F, 'New incident badge', pill(F, 1324, 30, '1 new', C.crit, { h: 20, size: 12, pad: 14 }).svg);
    mark('imButton', [1103.5, 40.5, 256, 45]);
  }
  if (o.after) s += o.after(F);
  return F.render(s);
}

// ---------- operator frames ----------
function s1() {
  return consoleFrame('AV-S1 · Quiet console · no fence alarm', { toggle: true, crit: 1, center: F => airportView(F, false), cards: { fence: null } });
}
const ALARM = (o) => ({ ev: EV(LINES.alarm), ...o });
function s2() {
  return consoleFrame('AV-S2 · Fence alarm · Active Alarms opened automatically · Investigation · viewer Located to 5-14', {
    center: F => locateView(F), cards: { fence: 'alarm' }, near: 'live', player: { cam: PCAM.climb(), clip: LIVECLIP() },
    alarm: ALARM({ cams: TILES.climb(), tab: 0, body: investigation([INV.linked, INV.auth], ['invLinked', 'invAuthCheck']) }),
  });
}
function s3() {
  return consoleFrame('AV-S3 · Click 1 · SOP Flow tab', {
    center: F => locateView(F), cards: { fence: 'alarm' }, near: 'live', player: { cam: PCAM.climb(), clip: LIVECLIP() },
    alarm: ALARM({ cams: TILES.climb(), tab: 1, pressTab: true, body: sopBody('verify', { keys: { 0: 'sopStep1' } }) }),
  });
}
function s4() {
  return consoleFrame('AV-S4 · SOP step 1 · Verify the alarm · Confirm intrusion / Authorised activity / False alarm', {
    center: F => locateView(F), cards: { fence: 'alarm' }, near: 'live', player: { cam: PCAM.track(), clip: LIVECLIP() },
    alarm: ALARM({ cams: TILES.track(), tab: 1, body: sopBody('verify', { keys: { 0: 'sopStep1' }, press: { confirmBtn: 'hover' } }) }),
  });
}
function s5() {
  return consoleFrame('AV-S5 · Click 2 · Confirm intrusion · Nurul A. · 02:15:24', {
    center: F => locateView(F), cards: { fence: 'alarm' }, near: 'live', player: { cam: PCAM.track(), clip: LIVECLIP() },
    alarm: ALARM({ cams: TILES.track(), tab: 1, body: sopBody('verify', { keys: { 0: 'sopStep1' }, press: { confirmBtn: 'pressed' } }) }),
  });
}
const INC = (o) => ({ ev: EV(LINES.incident, { code: 'PER-005' }), ...o });
function s6() {
  return consoleFrame('AV-S6 · Incident PER-005 raised from alarm AGF-5-14 · SOP step 2 Dispatch Patrol 2', {
    center: F => locateView(F, { label: 'Seg 5-14 · PER-005' }), cards: { fence: 'incident' }, near: 'live', player: { cam: PCAM.track(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.track(), tab: 1, body: sopBody('raised', { keys: { 0: 'sopStep1', 1: 'sopStep2', 2: 'sopStep3', 3: 'sopStep4' } }) }),
    after: F => {
      const x = 396, w = 488, y = 935;
      mark('incidentToast', [x, y, w, 70]);
      return confirmToast(F, x, y, 'Incident PER-005 raised from alarm AGF-5-14', 'History inherited since 02:14:58 · owner Nurul A. · 02:15:24', { w });
    },
  });
}
function s7() {
  return consoleFrame('AV-S7 · Click 3 · Dispatch Patrol 2 · 02:15:30', {
    center: F => locateView(F, { label: 'Seg 5-14 · PER-005' }), cards: { fence: 'incident' }, near: 'live', player: { cam: PCAM.track(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.track(), tab: 1, body: sopBody('dispatch', { keys: { 1: 'sopStep2' }, press: { dispatchBtn: 'pressed' } }) }),
  });
}
function s8() {
  return consoleFrame('AV-S8 · Police and tower running · Sgt. Lim acknowledged · Runway 02L arrivals held', {
    center: F => patrolView(F, { at: [54.5, 2.4], runway: 'Runway 02L · arrivals held · ATC', runwayCol: C.warn }), cards: { fence: 'incident', late: true }, near: 'live', player: { cam: PCAM.track(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.track(), tab: 1, body: sopBody('running', { top: 1, keys: { 1: 'sopStep2', 2: 'sopStep3', 3: 'sopStep4' } }) }),
  });
}
function s9() {
  return consoleFrame('AV-S9 · PTZ 7-02 video lost 02:16:40 · PTZ 7-03 took over 02:16:42 · SOP step 5', {
    center: F => patrolView(F, { at: [59.5, 2.4], ptz703: true, runway: 'Runway 02L · arrivals held · ATC', runwayCol: C.warn }), cards: { fence: 'incident', late: true }, near: 'handover', offline: 7,
    player: { cam: PCAM.p703(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.p703(), tab: 1, body: sopBody('handover', { top: 2, keys: { 4: 'sopStep5', 2: 'sopStep3', 3: 'sopStep4' } }) }),
    after: F => {
      mark('tileHandover', [916, 296, 210, 248]);
      // the exception as recorded on the SOP side (items 2–3 of step 5); the Investigation System entry is the record shown on the incident page (S12)
      const a = ANCHORS[CUR] && ANCHORS[CUR].sopStep5;
      if (a) mark('invHandover', [a[0] + 34, a[1] + 58, a[2] - 44, 46]);   // items 2–3 of step 5
      return '';
    },
  });
}
function s10() {
  return consoleFrame('AV-S10 · Contained 02:18:08 · detained 02:20:05 · handed to police AP-12 02:26:30', {
    center: F => patrolView(F, { at: [62.4, 2.4], eta: 'on scene', ptz703: true, runway: 'Runway 02L · arrivals held · ATC', runwayCol: C.warn }), cards: { fence: 'incident', late: true }, near: 'handover', offline: 7,
    player: { cam: PCAM.handed(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.handed(), tab: 1, body: sopBody('contained', { top: 3, keys: { 5: 'sopStep6' } }) }),
  });
}
// still (no operator click): the Investigation timeline with the exception System entry and Patrol 2's radio reports
function s10b() {
  return consoleFrame('AV-S10b · Investigation · PTZ 7-03 took over 02:16:42 · Arjun (radio) on scene, detained, handed over', {
    center: F => patrolView(F, { at: [62.4, 2.4], eta: 'on scene', ptz703: true, runway: 'Runway 02L · arrivals held · ATC', runwayCol: C.warn }), cards: { fence: 'incident', late: true }, near: 'handover', offline: 7,
    player: { cam: PCAM.handed(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.handed(), tab: 0, body: investigation([INV.handover, INV.onScene, INV.detained, INV.handedOver], ['invHandover', 'radioOnScene', 'radioDetained', 'radioHandedOver']) }),
  });
}
// the click frame: still the before-submit state (head and left card); 'Pending sign-off' appears after it (S11b)
function s11() {
  return consoleFrame('AV-S11 · Click 4 · SOP step 7 · six evidence items complete · Submit for sign-off', {
    center: F => patrolView(F, { at: [62.4, 2.4], eta: 'guard posted', ptz703: true, alarm: false, runway: 'Runway 02L · restored 02:31:10', runwayCol: C.green }), cards: { fence: 'incident', late: true }, near: 'handover', offline: 7,
    player: { cam: PCAM.guard(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.guard(), tab: 1, body: sopBody('submit', { top: 4, keys: { 6: 'sopStep7' }, press: { submitBtn: 'pressed' } }) }),
  });
}
// after the submit (02:43:50): the top list card reads 'Pending sign-off' (spec §7); step 7 as submitted, nothing pressed
function s11b() {
  return consoleFrame('AV-S11b · Submitted for sign-off · list card Incident PER-005 · Pending sign-off', {
    center: F => patrolView(F, { at: [62.4, 2.4], eta: 'guard posted', ptz703: true, alarm: false, runway: 'Runway 02L · restored 02:31:10', runwayCol: C.green }), cards: { fence: 'pending', late: true }, near: 'handover', offline: 7,
    player: { cam: PCAM.guard(), clip: LIVECLIP() }, newIncident: true,
    alarm: INC({ cams: TILES.guard(), tab: 1, body: sopBody('submit', { top: 4, keys: { 6: 'sopStep7' } }) }),
  });
}
// after the sign-off: the operator's console without the fence card, counters back down
function s15() {
  return consoleFrame('AV-S15 · Operator console · PER-005 closed · fence card gone', {
    toggle: true, crit: 1, center: F => airportView(F, false), cards: { fence: null, late: true }, offline: 7,
    after: F => {
      const w = 420, x = 1360 - w, y = 943;
      mark('closedToast', [x, y, w, 70]);
      return confirmToast(F, x, y, 'PER-005 closed · signed by Daniel L.', '02:44:20 · badge + PIN · audit record locked', { w });
    },
  });
}

// ---------- alternative path: permit found, cleared as authorised activity (another night, 01:2x) ----------
const ALT = (o, badge) => ({ ev: EV(LINES.alt, { t0: '01:20:31', badge }), ...o });
function a1() {
  return consoleFrame('AV-A1 · Alternative · Investigation · Permit-to-work PTW-2231 Found', {
    center: F => locateView(F), cards: { fence: 'alarm', alt: true }, near: 'live', player: { cam: PCAM.crew(), clip: LIVECLIP('01:20:14') },
    alarm: ALT({ cams: TILES.crew(), tab: 0, body: investigation([INV.altAuth, INV.altLinked], ['permitEntry', 'invLinked']) }),
    after: F => { const a = ANCHORS[CUR] && ANCHORS[CUR].permitEntry; if (a) mark('invAuthCheck', a); return ''; },
  });
}
function a1b() {
  return consoleFrame('AV-A1b · Alternative · SOP step 1 · Authorised activity pressed', {
    center: F => locateView(F), cards: { fence: 'alarm', alt: true }, near: 'live', player: { cam: PCAM.crew(), clip: LIVECLIP('01:20:14') },
    alarm: ALT({ cams: TILES.crew(), tab: 1, body: sopBody('altVerify', { keys: { 0: 'sopStep1' }, press: { authorisedBtn: 'pressed' } }) }),
  });
}
function a2() {
  return consoleFrame('AV-A2 · Alternative · Authorised activity · cleared · no incident raised', {
    center: F => locateView(F, { alarm: false, sev: 'Info', label: 'Seg 5-14 · PTW-2231' }), cards: { fence: 'cleared', alt: true }, crit: 1, near: 'live', player: { cam: PCAM.crew(), clip: LIVECLIP('01:20:14') },
    alarm: ALT({ cams: TILES.crew(), tab: 1, body: sopBody('altCleared', { keys: { 0: 'sopStep1' } }) }),
    after: F => {
      // event head: the red 'Now' badge gives way to a neutral 'Cleared' badge (same slot, right-aligned)
      const bw = textWidth('Cleared', 14, 500) + 16;
      mark('clearedBadge', [1344 - bw, 209, bw, 20]);
      return g(F, 'Badge Cleared', pill(F, 1344 - bw, 209, 'Cleared', C.closed).svg) + a2toast(F);
    },
  });
}
function a2toast(F) {
  const x = 396, w = 488, y = 935;
  mark('clearedToast', [x, y, w, 70]);
  return confirmToast(F, x, y, 'Alarm AGF-5-14 cleared · authorised activity', 'Nurul A. · 01:22:10 · linked to PTW-2231 · no incident raised', { w });
}

// ---------- duty manager: V11 Incident Management page (1600 wide) ----------
const IW = 1600;
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
const PER005 = closed => closed ? ['Closed', 'Critical', 'Fence Sector 5', 'Today, 02:14:58', 'PER-005', [DM, 'Today, 02:44:20'], 'AGF-5-14'] : ['Open', 'Critical', 'Fence Sector 5', 'Today, 02:14:58', 'PER-005', ['Pending sign-off', 'Nurul A. · 02:43:50'], 'AGF-5-14'];
const COLS = [['Status', 52], ['Severity', 137], ['Location', 257], ['Date & Time', 377], ['Code', 497], ['Closed By', 617], ['Device ID', 737]];
const TAB_Y = 549, BODY_Y = 589, BODY_H = 360;
function imPage(name, o) {
  const F = new Frame(name, IW, H);
  let s = rect(0, 0, IW, H, { fill: C.frame });
  s += image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  s += g(F, 'Button Exit Incident Management', rect(1265.5, 40.5, 294, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'x', 1284, 53, 20, '#FFFFFF', 2.2) + text(1312, 70, 'Exit Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  s += rect(40, 118, 1520, 911, { r: 16, fill: C.panel, fo: 0.85 });
  s += text(256, 165, 'Incident Management', { size: 24, weight: 700, fill: '#FFFFFF' }) + text(256 + textWidth('Incident Management', 24, 700) + 10, 165, '(24)', { size: 24, weight: 700, fill: '#7D8490' });
  s += pill(F, 256 + textWidth('Incident Management (24)', 24, 700) + 30, 149, (o.closed ? 4 : 5) + ' Open', C.open, { h: 24 }).svg;
  s += rect(1070, 135, 155, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + text(1080, 160, 'Location', { size: 16, fill: '#FFFFFF' }) + poly([[1200, 151], [1210, 151], [1205, 157]], { fill: C.t2 });
  s += rect(1225, 135, 200, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'search', 1234, 145, 18, C.t2, 2);
  s += rect(1438, 135, 106, 38, { r: 6, fill: C.tabOn }) + icon(F, 'search', 1452, 145, 18, '#FFFFFF', 2) + text(1478, 160, 'Search', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += text(60, 232, 'All', { size: 18, weight: 500, fill: C.link }) + text(97, 232, 'Open', { size: 18, fill: C.t2 }) + text(153, 232, 'Closed', { size: 18, fill: C.t2 });
  s += rect(603, 206, 106, 40, { r: 6, fill: C.tabOn }) + icon(F, 'download', 619, 216, 18, '#FFFFFF', 2.2) + text(648, 232, 'Export', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += rect(718.5, 206.5, 125, 39, { r: 6, stroke: C.t3 }) + text(733, 232, 'Filter (0)', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'filter', 812, 216, 18, '#FFFFFF', 2);
  // table: PER-005 on top (selected)
  s += rect(40, 254, 804, 42, { fill: '#262A31' });
  COLS.forEach(([c, x]) => { s += text(x, 281, c, { size: 14, weight: 500, fill: '#FFFFFF' }); });
  [PER005(o.closed), ...OTHERS].forEach(([st, sev, loc, dt, code, by, dev], i) => {
    const y = 296 + i * 56;
    let r = '';
    if (i === 0) r += rect(40, y, 804, 56, { fill: '#3A3F47' });
    r += pill(F, 52, y + 16, st, st === 'Open' ? C.open : C.closed, { h: 25, r: 7.5, pad: 20 }).svg;
    r += pill(F, 137, y + 18, sev, SEVC[sev], { h: 21, r: 6, pad: 16 }).svg;
    r += text(257, y + 33, loc.length > 16 ? loc.slice(0, 14) + '…' : loc, { size: 14, fill: '#FFFFFF' }) + text(377, y + 33, dt, { size: 12, fill: '#FFFFFF' }) + text(497, y + 33, code, { size: 14, fill: '#FFFFFF' });
    if (by) r += text(617, y + 26, by[0], { size: 14, weight: code === 'PER-005' ? 500 : 400, fill: code === 'PER-005' && !o.closed ? C.warn : '#FFFFFF' }) + text(617, y + 42, by[1], { size: 12, fill: C.t2 }); else r += text(617, y + 33, '-', { size: 14, fill: '#FFFFFF' });
    r += text(737, y + 33, dev, { size: 14, fill: '#FFFFFF' });
    r += line(40, y + 56, 844, y + 56, { stroke: '#3A3F47' });
    s += g(F, 'Row ' + code, r);
    if (code === 'PER-005') mark(o.closed ? 'imClosedRow' : 'imRow', [40, y, 804, 56]);
  });
  // pagination (V11)
  const py = 828;
  s += rect(393, py - 15, 105, 30, { r: 15, fill: '#FFFFFF' }) + text(403, py + 5, '10 / page', { size: 13, weight: 500, fill: '#111111' }) + poly([[478, py - 3], [488, py - 3], [483, py + 3]], { fill: '#111111' });
  s += text(526, py + 5, '←', { size: 16, fill: '#FFFFFF' });
  [1, 2, 3].forEach((n, i) => { s += circle(567 + i * 35, py, 10, { fill: i ? '#FFFFFF' : '#1D232C', stroke: '#FFFFFF' }) + text(567 + i * 35, py + 4.5, String(n), { size: 12, weight: 700, fill: i ? '#111111' : '#FFFFFF', anchor: 'middle' }); });
  s += text(670, py + 5, '→', { size: 16, fill: '#FFFFFF' }) + text(703, py + 5, 'Go to page', { size: 13, weight: 700, fill: '#FFFFFF' }) + rect(790, py - 14, 28, 28, { r: 6, fill: '#FFFFFF' }) + text(804, py + 5, '1', { size: 13, weight: 700, fill: '#111111', anchor: 'middle' }) + text(828, py + 5, 'Go ›', { size: 13, weight: 700, fill: C.link });
  // detail pane (V11): name / ID / code, title, date pill, description, two camera tiles, Remarks / SOP Flow, Close Incident
  const dx = 860, dy = 198, dw = 700, dh = 831;
  const clip = F.clip(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="0"/>`);
  let d = rect(dx, dy, dw, dh, { fill: C.body, fo: 0.8 }) + rect(dx, dy, dw, 4, { fill: o.closed ? C.closed : C.crit });
  d += rich(876, 228, [{ t: 'Name: ', fill: C.t2 }, { t: 'AGILFENCE · SECTOR 5 · SEG 5-14', fill: C.t1 }], { size: 16 }) + rich(1210, 228, [{ t: 'ID: ', fill: C.t2 }, { t: 'AGF-5-14', fill: C.t1 }], { size: 16 }) + rich(1375, 228, [{ t: 'Code: ', fill: C.t2 }, { t: 'PER-005', fill: C.t1 }], { size: 16 });
  d += text(876, 258, 'Fence Sector 5', { size: 20, weight: 500, fill: C.t1 });
  d += pill(F, 1440, 242, 'Today, 02:14:58', '#4F545E', { h: 20, size: 13 }).svg;
  d += rich(876, 286, [{ t: 'Raised from alarm ', fill: C.t2 }, { t: 'AGF-5-14', fill: '#FFFFFF', weight: 500 }, { t: ' · history since ', fill: C.t2 }, { t: '02:14:58', fill: '#FFFFFF', weight: 500 }, { t: ' · owner ', fill: C.t2 }, { t: OWNER, fill: '#FFFFFF', weight: 500 }], { size: 16 });
  d += rich(876, 308, [{ t: 'Handed to Airport Police ', fill: C.t2 }, { t: '02:26:30', fill: '#FFFFFF', weight: 500 }, { t: ' · submitted for sign-off ', fill: C.t2 }, { t: '02:43:50', fill: '#FFFFFF', weight: 500 }], { size: 16 });
  d += camTile(F, 876, 333, 330, 200, { href: cctv('fence_ptz_clean'), label: 'PTZ 7-02 · clip 02:14:58–02:16:40', focus: [0.5, 0.42], box: box('fence_ptz', 'person'), boxCol: C.crit, chips: [['Sealed', '#3A404B']] });
  d += camTile(F, 1214, 333, 330, 200, { href: cctv('fence_handover_clean'), label: 'PTZ 7-03 · clip 02:16:42–02:26:30', focus: [0.5, 0.56], box: box('fence_handover', 'person'), boxCol: C.crit, chips: [['Sealed', '#3A404B']] });
  d += rect(876, TAB_Y, 334, 40, { fill: C.tabBody }) + rect(1210, TAB_Y, 334, 40, { fill: '#2E333B' }) + text(1043, TAB_Y + 27, 'Remarks', { size: 18, weight: 700, fill: '#FFFFFF', anchor: 'middle' }) + text(1377, TAB_Y + 27, 'SOP Flow', { size: 18, weight: 700, fill: '#8E95A1', anchor: 'middle' });
  d += rect(876, BODY_Y, 668, BODY_H, { fill: C.tabBody });
  // Remarks: the incident inherits the alarm's history; the latest entries, newest last (V11 order)
  const ents = [
    { who: 'System', time: '02:16:42', col: '#2E8BFF', text: 'PTZ 7-02 video lost 02:16:40 · PTZ 7-03 took over 02:16:42 · LiDAR T-07 tracking', size: 14, italic: true },
    { who: 'Arjun (radio)', time: '02:26:30', col: '#2E8BFF', text: 'Handed to police · custody record AP-12', size: 15, lh: 22 },
    { who: OWNER, time: '02:43:50', col: '#2E8BFF', text: 'Submitted for sign-off · 6 of 6 items · SOP-PER-02 steps 1–6 complete · 02:43:30', size: 15, lh: 22 },
  ];
  const tl = timeline(F, 892, 602, 636, ents, { gap: 10 });
  d += tl.svg;
  const h0 = timeline(new Frame('m'), 892, 602, 636, [ents[0]], { gap: 10 }).h;
  mark('invHandover', [884, 598, 652, h0 - 2]);
  d += remarksBox(F, 892, 828, 636, { h: 40 });
  if (o.closed) {
    const lab = 'Closed 02:44:20 · signed off by Daniel L. · badge + PIN', tw = textWidth(lab, 20, 700), x0 = 1214 - (tw + 32) / 2;
    d += g(F, 'Closed bar', rect(884, 965, 660, 44, { r: 8, fill: '#2F6B2F' }) + icon(F, 'check', x0, 976, 22, '#FFFFFF', 2.4) + text(x0 + 32, 994, lab, { size: 20, weight: 700, fill: '#FFFFFF' }));
    mark('closedBar', [884, 965, 660, 44]);
  } else {
    d += g(F, 'Button Close Incident', rect(884, 965, 660, 44, { r: 8, fill: C.blue }) + text(1214, 994, 'Close Incident', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
    mark('closeIncidentBtn', [884, 965, 660, 44]);
  }
  s += g(F, 'Incident detail', `<g clip-path="${clip}">${d}</g>`);
  mark('imDetail', [dx, dy, dw, dh]);
  if (o.after) s += o.after(F);
  return F.render(s);
}
// Close Incident → sign dialog (V11 dialog idiom): evidence list, badge + PIN, Sign and close
function signDialog(F, o = {}) {
  const x = 475, y = 214, w = 650;
  const rows = [
    ['Handed to police', 'Custody record AP-12 · Airport Police', '02:26:30'],
    ['Runway 02L restored', 'Tower log · ATC supervisor Tan', '02:31:10'],
    ['Area secured', 'Sector 5 sweep · Patrol 2', '02:38:40'],
    ['Fence 5-14 made safe', 'FM-90412 · mesh bent, no cut · guard posted', '02:40:15'],
    ['SOP-PER-02 steps 1–6 complete', 'Checked by Nurul A.', '02:43:30'],
    ['Evidence sealed', '3 clips · fence trace · LiDAR track', '02:43:40'],
  ];
  const rh = 46, h = 36 + 116 + 34 + rows.length * rh + 30 + 34 + 52 + 34 + 52;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let m = `<g clip-path="${clip}">${rect(x, y, w, h, { fill: '#333A47' }) + rect(x, y, w, 36, { fill: '#191E25' })}</g>`;
  m += text(x + 16, y + 23, 'Close Incident', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', x + w - 37, y + 8, 20, '#FFFFFF', 2.2);
  m += eventHead(F, x + 16, y + 68, w - 32 - 24, { time: '02:14:58', id: 'AGF-5-14', code: 'PER-005', title: 'Fence Sector 5', badge: 'Critical', lines: [['Submitted by ', { b: OWNER }, ' · ', { b: '02:43:50' }, ' · intruder handed to Airport Police']] });
  let yy = y + 152;
  m += line(x + 16, yy, x + w - 16, yy, { stroke: '#6B7280' });
  yy += 34;
  m += text(x + 24, yy, 'Evidence · 6 of 6 complete', { size: 18, fill: '#FFFFFF' });
  yy += 12;
  rows.forEach(([t, src, tm]) => {
    m += rect(x + 24, yy, w - 48, rh - 6, { r: 6, fill: '#282828', stroke: '#3D3D3D' });
    m += circle(x + 44, yy + 20, 9, { fill: C.green }) + icon(F, 'check', x + 37.5, yy + 13.5, 13, '#FFFFFF', 3);
    m += text(x + 62, yy + 17, t, { size: 15, weight: 500, fill: '#FFFFFF' }) + text(x + 62, yy + 34, src, { size: 13, fill: C.t2 });
    m += text(x + w - 36, yy + 25, tm, { size: 14, weight: 500, fill: C.t1, anchor: 'end' });
    yy += rh;
  });
  mark('signEvidence', [x + 24, yy - rows.length * rh, w - 48, rows.length * rh]);
  yy += 30;
  m += text(x + 24, yy, 'Sign with badge + PIN', { size: 18, fill: '#FFFFFF' }) + text(x + 24 + textWidth('Sign with badge + PIN', 18), yy, '*', { size: 18, fill: C.crit }) + text(x + w - 24, yy, 'Signed in as Daniel L. · Duty manager', { size: 13.5, fill: C.t2, anchor: 'end' });
  yy += 12;
  const fw = (w - 48 - 12) / 2;
  m += rect(x + 24, yy, fw, 40, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'idcard', x + 34, yy + 10, 20, C.t2, 1.8) + text(x + 62, yy + 26, 'Badge  DL-••••17', { size: 16, fill: '#FFFFFF' });
  m += rect(x + 36 + fw, yy, fw, 40, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'key', x + 46 + fw, yy + 10, 20, C.t2, 1.8) + text(x + 74 + fw, yy + 26, 'PIN  ••••••', { size: 16, fill: '#FFFFFF' });
  mark('badgePin', [x + 24, yy, w - 48, 40]);
  yy += 52;
  m += icon(F, 'lock', x + 24, yy + 2, 15, C.t2, 2) + text(x + 46, yy + 14, 'Signing closes the incident and locks the audit record.', { size: 13.5, fill: C.t2 });
  yy += 34;
  m += rect(x + 16.5, yy + 0.5, 139, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(x + 86, yy + 29, 'Cancel', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' });
  const bx = x + 165, bw = w - 181;
  m += g(F, 'Button Sign and close', rect(bx, yy, bw, 44, { r: 8, fill: C.blue }) + icon(F, 'lock', bx + bw / 2 - textWidth('Sign and close', 20, 700) / 2 - 16, yy + 12, 20, '#FFFFFF', 2) + text(bx + bw / 2 + 12, yy + 29, 'Sign and close', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
  if (o.state) m += btnState(F, bx, yy, bw, 44, o.state);
  mark('signBtn', [bx, yy, bw, 44]);
  mark('signDialog', [x, y, w, h]);
  if (yy + 44 + 16 > y + h) console.warn(`[${CUR}] sign dialog content overflows`, yy + 60 - y - h);
  return rect(0, 0, IW, H, { fill: '#000000', fo: 0.67 }) + g(F, 'Close Incident dialog', m);
}
function s12() {
  return imPage('AV-S12 · Duty manager · Incident Management · PER-005 pending sign-off', { closed: false });
}
function s13() {
  return imPage('AV-S13 · Duty manager · Close Incident · sign with badge + PIN · Sign and close', {
    closed: false,
    after: F => btnState(F, 884, 965, 660, 44, 'pressed') + signDialog(F, { state: 'pressed' }),
  });
}
function s14() {
  return imPage('AV-S14 · Duty manager · PER-005 closed · Daniel L. · 02:44:20', {
    closed: true,
    after: F => {
      mark('closedToast', [60, 930, 600, 70]);
      return confirmToast(F, 60, 930, 'PER-005 closed · signed by Daniel L. · 02:44:20', 'Badge + PIN · audit record locked · removed from Real Time Alerts', { w: 600 });
    },
  });
}

export const FRAMES = [
  ['AV-S1-quiet', s1],
  ['AV-S2-auto-open-investigation', s2],
  ['AV-S3-sop-tab-click', s3],
  ['AV-S4-verify-step', s4],
  ['AV-S5-confirm-click', s5],
  ['AV-S6-incident-raised-dispatch', s6],
  ['AV-S7-dispatch-click', s7],
  ['AV-S8-police-tower-running', s8],
  ['AV-S9-ptz-handover', s9],
  ['AV-S10-contained-handed-over', s10],
  ['AV-S10b-investigation-radio', s10b],
  ['AV-S11-close-step-submit', s11],
  ['AV-S11b-pending-signoff', s11b],
  ['AV-S12-im-pending-signoff', s12],
  ['AV-S13-im-sign-dialog', s13],
  ['AV-S14-im-closed', s14],
  ['AV-S15-operator-closed', s15],
  ['AV-A1-permit-found', a1],
  ['AV-A1b-authorised-click', a1b],
  ['AV-A2-cleared-authorised', a2],
];
