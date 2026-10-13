// Demo use cases fitted into the current V11 screens. Each frame = an existing V11 state
// (home, alarm opened on Investigation or SOP Flow, escalate dialog, incident management)
// filled with demo content; the few new elements carry "NEW" in their layer names.
import { Frame, T, f, rect, circle, line, pathEl, poly, text, rich, para, icon, image, g, textWidth, wrap } from '../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, modelToggle, pill, alertsPanel, deviceStatus, activeAlarms, timeline, remarksBox, sopFlow, scene, eventHead, camTile } from '../lib/v11.mjs';
import { camera, clayAirport, marker } from '../lib/clay.mjs';
import { ALERTS, BYK } from './data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
import fs from 'fs';
let META = null;
const box = (scene, k) => { if (!META) META = JSON.parse(fs.readFileSync(asset.dir + '/cctv/meta.json', 'utf8')); return META[scene].boxes[k]; };
const markersFor = (sel, labels = {}) => ALERTS.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: a.key === 'fence' ? 3.5 : 4.5, label: labels[a.key], left: a.key === 'watch' || a.key === 'spoof' }));
const cards = (sel) => ALERTS.map(a => ({ ...a, selected: a.key === sel }));
const COUNTS = [['2 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];

// 3D viewer focused on a world point (default: whole airport)
function viewer(F, o = {}) {
  const P = camera(o.sx ?? 870, o.sy ?? 520, o.sc ?? 8.4, o.cx ?? 50, o.cy ?? 29);
  return scene(F, clayAirport(F, P, { markers: o.markers || [], labels: o.labels }));
}

// ---------- 01 · Home ----------
export function home() {
  const F = new Frame('V11-01 · Home · Real Time Alerts (AI-correlated)', W, H);
  let s = viewer(F, { markers: markersFor(null, { tailgate: 'D-214 · Tailgating', fence: 'Sector 5 · Intrusion' }) });
  s += header(F) + modelToggle(F);
  s += alertsPanel(F, { cluster: 'All terminals', counts: COUNTS, cards: cards(null) });
  s += deviceStatus(F, { online: 4812, offline: 6 });
  return F.render(s);
}

// ---------- incident frame template (alarm opened) ----------
function incident(name, key, o) {
  const F = new Frame(name, W, H);
  const a = BYK[key];
  let s = o.center ? o.center(F) : viewer(F, { sx: 640, sy: 500, sc: o.zoom || 15, cx: a.X, cy: a.Y, markers: [{ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: 4, label: o.marker || a.title }] });
  s += header(F, o.header || {});
  s += alertsPanel(F, { cluster: o.cluster || 'All terminals', counts: COUNTS, cards: cards(key) });
  s += deviceStatus(F, { online: 4812, offline: 6 });
  s += activeAlarms(F, { ev: o.ev, cams: o.cams, tab: o.tab || 0, bodyH: 356, body: o.body });
  if (o.after) s += o.after(F);
  return F.render(s);
}
// Investigation tab body: Co-pilot summary + linked alarms + remarks
const investigation = (summary, linkedTitle, rows, o = {}) => (F, x, y, w, h) => {
  const shown = rows.slice(0, o.show || 3), more = rows.length - shown.length;
  const tl = timeline(F, x + 16, y + 12, w - 32, [
    { who: 'Co-pilot', tag: o.tag || 'AI summary', time: o_time(rows), col: C.copilot, text: summary, size: 14, lh: 20 },
    { who: 'System', time: o_time(rows), text: linkedTitle, size: 14, italic: true, rows: shown, more: more > 0 ? `+${more} more · view all` : null },
  ], { gap: 10 });
  // Remarks + Add keep their place in the flow; the tab scrolls when content is longer
  const ry = y + 12 + tl.h + 4;
  return { svg: tl.svg + remarksBox(F, x + 16, ry, w - 32, { h: 56 }), h: ry - y + 24 + 56 + 10 + 40 + 16 };
};
function o_time(rows) { return rows[rows.length - 1][0]; }

// ---------- 02 · Tailgating · Investigation ----------
export function tailgateInv() {
  const B = { door: [570, 280, 160, 390] };
  return incident('V11-02 · Tailgating · Active Alarm · Investigation', 'tailgate', {
    marker: 'D-214 · Tailgating',
    ev: { time: '02:14:52', id: 'ACS-D214', code: 'TGT-214', title: 'Staff Door D-214', lines: [['Tailgating: 2 people crossed, 1 badge presented'], ['Card user ', { b: 'J. Tan' }, ', Card ID ', { b: 'B-55821' }]] },
    cams: [
      { href: cctv('door_clean'), label: 'Camera 3-118 · D-214', focus: [0.52, 0.6], box: [524, 248, 132, 420], boxCol: C.crit, boxLabel: 'No badge' },
      { href: cctv('corridor_clean'), label: 'Camera 3-121 · L2-East', focus: [0.5, 0.55], box: [600, 255, 120, 280], boxCol: C.crit },
      { href: cctv('trail_walk_clean'), label: 'Camera 3-119 · Airside', focus: [0.5, 0.6] },
    ],
    body: investigation('Two people passed Staff Door D-214 on one badge (J. Tan, Ground Ops). The follower has no credential and is walking airside towards Pier C. 4 sources agree.',
      '5 alarms linked into this event',
      [['02:14:48', 'Badge granted · B-55821', 'Access control', C.green], ['02:14:50', 'Door opened', 'Door sensor', C.link], ['02:14:52', '2 crossings, 1 badge', 'LiDAR', C.crit], ['02:14:52', 'Tailgating detected', 'CAM 3-118', C.crit], ['02:14:59', 'Door held open 9 s', 'Door sensor', C.warn]]),
  });
}

// ---------- 03 · Tailgating · SOP Flow (Locate → door in 3D) ----------
export function tailgateSop() {
  return incident('V11-03 · Tailgating · SOP Flow + door control (Locate view)', 'tailgate', {
    center: F => scene(F, image(F, 'Locate view · Door D-214 (existing 3D)', asset('locate_door.jpg'), -10, 136, 1491, 725) +
      g(F, 'Locate marker NEW', rect(560, 365, 222, 32, { r: 8, fill: '#1D232C', fo: 0.92, stroke: C.crit, sw: 1.5 }) + circle(578, 381, 6, { fill: C.crit }) + text(592, 386, 'D-214 · Locked by operator', { size: 14, weight: 500, fill: '#FFFFFF' }))),
    ev: { time: '02:14:52', id: 'ACS-D214', code: 'TGT-214', title: 'Staff Door D-214', lines: [['Tailgating: 2 people crossed, 1 badge presented'], ['Card user ', { b: 'J. Tan' }, ', Card ID ', { b: 'B-55821' }]] },
    cams: [
      { href: cctv('door_clean'), label: 'Camera 3-118 · D-214', focus: [0.52, 0.6], box: [524, 248, 132, 420], boxCol: C.crit, boxLabel: 'No badge' },
      { href: cctv('corridor_clean'), label: 'Camera 3-121 · L2-East', focus: [0.5, 0.55], box: [600, 255, 120, 280], boxCol: C.crit },
      { href: cctv('trail_walk_clean'), label: 'Camera 3-119 · Airside', focus: [0.5, 0.6] },
    ],
    tab: 1,
    body: (F, x, y, w, h) => sopFlow(F, x, y + 4, w, [
      { title: 'Verify on camera', state: 'done', tag: 'Done by Co-pilot', text: 'Follower confirmed and auto-followed on 3 cameras.' },
      { title: 'Critical Action Required', state: 'critical', tag: 'Your approval', text: 'Lock D-214 and switch on hard anti-passback (reversible, 2 h). Exit without a matching entry is denied.', actions: [['Lock', 'blue'], ['Secure', 'blue'], ['Normal', 'grey']] },
      { title: 'Dispatch patrol', state: 'todo', text: 'Send Patrol Arjun to Corridor L2-East (ETA 3 min).', items: [['Photo of follower sent to mobile app', true]] },
      { title: 'Notify Ground Ops and log', state: 'todo' },
    ], { caption: 'SOP-SEC-014 loaded and pre-filled by Co-pilot' }).svg,
  });
}


const TG_EV = { time: '02:14:52', id: 'ACS-D214', code: 'TGT-214', title: 'Staff Door D-214', lines: [['Tailgating: 2 people crossed, 1 badge presented'], ['Card user ', { b: 'J. Tan' }, ', Card ID ', { b: 'B-55821' }]] };

// ---------- 04 · Identity spoofing · Investigation ----------
export function spoofInv() {
  return incident('V11-04 · Identity spoofing · Investigation', 'spoof', {
    marker: 'T1 Door C2 · same card as A17',
    ev: { time: '02:13:20', id: 'ACS-C2', code: 'IDS-207', title: 'T1 Door C2', lines: [['Same card used at T3 Door A17 at 02:09 (19 min away)'], ['Card user ', { b: 'M. Rahman' }, ', Card ID ', { b: 'S-20931' }]] },
    cams: [
      { href: cctv('doorC2_clean'), label: 'Camera 1-204 · Door C2 · now', focus: [0.55, 0.55], box: box('doorC2', 'person'), boxCol: C.crit, boxLabel: 'Not the holder' },
      { href: cctv('doorA17_clean'), label: 'Camera 3-052 · A17 · 02:09', focus: [0.45, 0.55], box: box('doorA17', 'person'), boxCol: C.green, boxLabel: 'Holder' },
      { href: asset('cctv/face_c2.jpg'), dims: [512, 512], label: 'Face crop · C2 vs holder 31%', focus: [0.5, 0.45] },
    ],
    body: investigation('Card S-20931 opened T3 Door A17 at 02:09 and T1 Door C2 at 02:13. The fastest route takes 19 min and the person at C2 does not match the holder. C2 used a legacy SSID that should have been revoked.',
      '5 alarms linked into this event',
      [['02:09:12', 'Granted · T3 A17 (new SSID)', 'Access control', C.green], ['02:13:20', 'Granted · T1 C2 (legacy SSID)', 'Access control', C.crit], ['02:13:21', 'Appearance differs', 'CAM 1-204', C.crit], ['02:12:05', 'Denied ×3 · T1 C3', 'Access control', C.warn], ['02:13:22', 'Off-roster access', 'Roster', C.warn]]),
  });
}

// ---------- 05 · Unattended bag · SOP Flow (autonomous investigation) ----------
export function bagSop() {
  return incident('V11-05 · Unattended bag · SOP Flow (autonomous investigation)', 'bag', {
    marker: 'Gate B12 · Unattended bag',
    ev: { time: '02:16:04', id: 'CAM-2-031', code: 'UAB-112', title: 'Gate B12 Holdroom', lines: [['Black hard-shell suitcase unattended since 02:04'], ['Owner located at ', { b: 'Food Court L3' }, ', ', { b: '410 m' }, ' away']] },
    cams: [
      { href: cctv('gate_clean'), label: 'Camera 2-031 · Gate B12', focus: [0.42, 0.7], box: box('gate', 'bag'), boxCol: C.warn, boxLabel: 'Unattended 12:06' },
      { href: cctv('trail_gate_clean'), label: 'Camera 2-031 · Owner 01:58', focus: [0.5, 0.6], box: box('trail_gate', 'person'), boxCol: C.warn },
      { href: cctv('trail_food_clean'), label: 'Camera 2-077 · Owner now', focus: [0.6, 0.6], box: box('trail_food', 'person'), boxCol: C.green, boxLabel: 'Owner' },
    ],
    tab: 1,
    body: (F, x, y, w, h) => sopFlow(F, x, y + 4, w, [
      { title: 'Identify object and time', state: 'done', tag: 'Auto · suitcase, 02:04' },
      { title: 'Find owner and track', state: 'done', tag: 'Auto · 4 cameras' },
      { title: 'Check related events', state: 'done', tag: 'Auto · none within 100 m' },
      { title: 'Load SOP-SEC-021', state: 'done', tag: 'Auto' },
      { title: 'Critical Action Required', state: 'critical', tag: 'Your decision', text: 'Send Officer Arjun to the owner (ETA 2 min) and keep the camera locked on the bag.', actions: [['Approve', 'green'], ['More info', 'grey']] },
    ], { caption: 'Co-pilot ran steps 1–4 in 6.2 s. You decide step 5.' }).svg,
  });
}

// ---------- 06 · Watchlist loitering · SOP Flow (verify first) ----------
export function watchSop() {
  return incident('V11-06 · Watchlist person loitering · SOP Flow (verify first)', 'watch', {
    marker: 'Row K · Possible match',
    ev: { time: '02:12:40', id: 'CAM-1-311', code: 'WLS-033', title: 'Departure Hall Row K', lines: [['Possible watchlist match (87%), loitering 23 min'], ['Approached staff door ', { b: 'K-Service' }, ' 3 times']] },
    cams: [
      { href: cctv('hall_clean'), label: 'Camera 1-311 · Row K', focus: [0.6, 0.6], box: box('hall', 'person'), boxCol: C.warn, boxLabel: 'Possible match 87%' },
      { href: asset('cctv/face_live.jpg'), dims: [512, 512], label: 'Live capture · 02:12', focus: [0.5, 0.45] },
      { href: asset('cctv/face_ref.jpg'), dims: [512, 512], label: 'Watchlist reference · 2025', focus: [0.5, 0.45] },
    ],
    tab: 1,
    body: (F, x, y, w, h) => sopFlow(F, x, y + 4, w, [
      { title: 'Critical Action Required', state: 'critical', tag: 'Verify first', text: 'Compare the live capture with the watchlist reference. Nothing is actioned until you confirm.', actions: [['Confirm match', 'red'], ['Not a match', 'grey']] },
      { title: 'Discreet approach', state: 'todo', text: 'Plain-clothes team of 2, ETA 4 min.' },
      { title: 'Notify police liaison', state: 'todo', text: 'Only if confirmed. Report pre-filled by Co-pilot.' },
      { title: 'Keep auto-follow on person', state: 'done', tag: 'Running · 3 cameras' },
    ], { caption: 'SOP-SEC-033 loaded · operator verification required' }).svg,
  });
}

// ---------- 07 · Fight · Investigation ----------
export function fightInv() {
  return incident('V11-07 · Fight detection · Investigation', 'fight', {
    marker: 'Belt 5 · Fight',
    ev: { time: '02:11:09', id: 'CAM-1-142', code: 'FGT-040', title: 'Arrival Hall Belt 5', lines: [['Aggressive motion (0.89) and shouting at intercom IC-B5'], ['Nearest officers ', { b: 'Lee 40 m' }, ', ', { b: 'Ravi 90 m' }]] },
    cams: [
      { href: cctv('belt_clean'), label: 'Camera 1-142 · Belt 5', focus: [0.5, 0.55], box: box('belt', 'pair'), boxCol: C.crit, boxLabel: 'Aggression 0.89' },
      { href: cctv('belt_clean'), label: 'Camera 1-143 · Belt 4–6', focus: [0.5, 0.6], zoom: 1 },
      { href: cctv('trail_walk_clean'), label: 'Camera 1-150 · Exit doors', focus: [0.5, 0.6] },
    ],
    body: investigation('Two passengers at Belt 5 went from arguing to pushing at 02:11. Pose analytics and the intercom microphone agree. About 14 people are gathering; nobody is on the ground.',
      '3 alarms linked into this event',
      [['02:10:40', 'Raised voices', 'Audio · IC-B5', C.warn], ['02:11:09', 'Aggression 0.89', 'CAM 1-142', C.crit], ['02:11:30', 'Crowd forming (~14)', 'CAM 1-143', C.warn]]),
  });
}

// ---------- 08 · Overstay · Investigation ----------
export function overstayInv() {
  return incident('V11-08 · Overstay · Investigation', 'overstay', {
    marker: 'B2 · Overstay',
    ev: { time: '02:15:47', id: 'ACS-B2', code: 'OVS-012', title: 'Baggage Hall B2', lines: [['In zone since 22:36 · shift ended 01:00'], ['Card user ', { b: 'K. Lim' }, ', Card ID ', { b: 'C-11873' }]] },
    cams: [
      { href: cctv('baghall_clean'), label: 'Camera 4-018 · B2', focus: [0.62, 0.6], box: box('baghall', 'person'), boxCol: C.info, boxLabel: 'K. Lim · 3h 40m' },
      { href: cctv('baghall_clean'), label: 'Camera 4-019 · ULD row 3', focus: [0.8, 0.5] },
      { href: cctv('door_clean'), label: 'Camera 4-011 · B2 east door', focus: [0.7, 0.5] },
    ],
    body: investigation('K. Lim (contractor) badged into B2 at 22:36 and has not badged out. The shift ended at 01:00, B2 is outside K. Lim’s duty zones, and there is no overtime request tonight.',
      'Airport rules triggered (4 of 5)',
      [['22:36', 'Restricted zone in wee hours', 'Rule (i)', C.info], ['01:00', 'Outside scope of duty', 'Rule (ii)', C.info], ['01:00', 'Non-working hours', 'Rule (iii)', C.info], ['01:45', '3h 40m vs 45 min usual', 'Rule (v)', C.info]], { tag: 'AI summary' }),
  });
}

// ---------- 09 · Fence + LiDAR · Investigation ----------
export function fenceInv() {
  return incident('V11-09 · AGIL Fence + LiDAR · Investigation', 'fence', {
    marker: 'Sector 5 · Seg 5-14', zoom: 12,
    ev: { time: '02:14:58', id: 'AGF-5-14', code: 'PER-005', title: 'Fence Sector 5', lines: [['Climb signature on segment 5-14, LiDAR object 1.7 m'], ['PTZ ', { b: '7-02' }, ' turned to target · runway ', { b: '02L' }, ' 150 m']] },
    cams: [
      { href: cctv('thermal_clean'), label: 'PTZ 7-02 · Thermal', focus: [0.54, 0.5], box: box('thermal', 'person'), boxCol: C.crit, boxLabel: 'Person 1.7 m' },
      { href: cctv('lidar_clean'), label: 'LiDAR L-5B · point cloud', focus: [0.5, 0.4] },
      { href: cctv('thermal_clean'), label: 'PTZ 7-03 · Thermal wide', focus: [0.5, 0.5] },
    ],
    body: investigation('Fence segment 5-14 picked up a climb signature at 02:14:58. LiDAR sees one 1.7 m object at the fence and thermal shows one person. Wind is 12 km/h; 3 earlier alarms were wind or animals.',
      '4 alarms linked into this event',
      [['02:14:58', 'Climb signature', 'AGIL Fence 5-14', C.crit], ['02:15:01', 'Object 1.7 m', 'LiDAR L-5B', C.crit], ['02:15:12', 'Thermal: 1 person', 'PTZ 7-02', C.crit], ['02:15:03', 'PTZ auto-slew', 'Camera control', C.link]]),
  });
}

// ---------- 10 · Escalate dialog with Co-pilot pre-fill ----------
function select(F, x, y, w, val, o = {}) {
  return rect(x, y, w, 40, { r: 6, fill: '#282828', stroke: o.ai ? C.copilot : C.t3, sw: o.ai ? 1.5 : 1 }) + text(x + 10, y + 26, val, { size: 16, fill: '#FFFFFF' }) + poly([[x + w - 32, y + 17], [x + w - 22, y + 17], [x + w - 27, y + 23]], { fill: '#9BA1AC' });
}
export function escalate() {
  return incident('V11-10 · Escalate Event · Co-pilot pre-fill', 'tailgate', {
    marker: 'D-214 · Tailgating',
    ev: TG_EV,
    cams: [
      { href: cctv('door_clean'), label: 'Camera 3-118 · D-214', focus: [0.52, 0.6], box: [524, 248, 132, 420], boxCol: C.crit, boxLabel: 'No badge' },
      { href: cctv('corridor_clean'), label: 'Camera 3-121 · L2-East', focus: [0.5, 0.55] },
      { href: cctv('trail_walk_clean'), label: 'Camera 3-119 · Airside', focus: [0.5, 0.6] },
    ],
    body: investigation('Two people passed Staff Door D-214 on one badge (J. Tan, Ground Ops). The follower has no credential and is walking airside towards Pier C. 4 sources agree.', '5 alarms linked into this event',
      [['02:14:48', 'Badge granted · B-55821', 'Access control', C.green], ['02:14:52', '2 crossings, 1 badge', 'LiDAR', C.crit], ['02:14:52', 'Tailgating detected', 'CAM 3-118', C.crit], ['02:14:50', 'Door opened', 'Door sensor', C.link], ['02:14:59', 'Door held open 9 s', 'Door sensor', C.warn]]),
    after: F => {
      const x = 375, y = 305, w = 650, h = 482;
      const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
      let m = `<g clip-path="${clip}">${rect(x, y, w, h, { fill: '#333A47' }) + rect(x, y, w, 36, { fill: '#191E25' })}</g>`;
      m += text(391, 328, 'Escalate Event', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 988, 312, 20, '#FFFFFF', 2.2);
      m += eventHead(F, 391, 373, 618, TG_EV);
      m += line(391, 474, 1009, 474, { stroke: '#6B7280' });
      m += text(399, 508, 'Category', { size: 18, fill: '#FFFFFF' }) + text(399 + textWidth('Category', 18), 508, '*', { size: 18, fill: C.crit });
      m += text(708, 508, 'Severity Level', { size: 18, fill: '#FFFFFF' }) + text(708 + textWidth('Severity Level', 18), 508, '*', { size: 18, fill: C.crit });
      m += select(F, 399, 519, 293, 'Unauthorised airside entry', { ai: true }) + select(F, 708, 519, 293, 'Critical', { ai: true });
      m += g(F, 'Co-pilot hint NEW', icon(F, 'sparkle', 399, 566, 15, C.copilot, 2) + text(420, 579, 'Pre-filled by Co-pilot from the investigation. Edit if needed.', { size: 13.5, weight: 500, fill: C.copilot }));
      m += text(399, 612, 'Remarks', { size: 18, fill: '#FFFFFF' });
      m += rect(399, 623, 602, 80, { r: 6, fill: '#282828', stroke: C.copilot, sw: 1.5 });
      ['Follower without a credential entered airside via D-214 at 02:14:52', 'behind badge B-55821. Door locked, hard anti-passback on, Patrol', 'Arjun dispatched to Corridor L2-East.'].forEach((l, i) => { m += text(409, 645 + i * 20, l, { size: 14, fill: '#E6E6E6' }); });
      m += rect(391.5, 721.5, 139, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(461, 750, 'Cancel', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' });
      m += rect(540, 721, 469, 44, { r: 8, fill: C.redCreate }) + text(774.5, 750, 'Create Incident', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
      return rect(0, 0, W, H, { fill: '#000000', fo: 0.67 }) + g(F, 'Escalate Event dialog', m);
    },
  });
}

// ---------- 11 · Co-pilot answer from the search bar ----------
export function copilotSearch() {
  const F = new Frame('V11-11 · Search bar · Ask Co-pilot (answer dropdown)', W, H);
  const mk = [...markersFor(null), { id: 'p5b', X: 86, Y: 24, sev: 'Critical', icon: 'door', h: 4.5, label: 'T5 Pier B door' }, { id: 'f15', X: 99, Y: 30, sev: 'Info', icon: 'fence', h: 3.5 }];
  let s = viewer(F, { markers: mk });
  s += header(F, { query: 'Show critical incidents in Terminal 5 in the last hour' });
  s += alertsPanel(F, { cluster: 'All terminals', counts: COUNTS, cards: cards(null) });
  s += deviceStatus(F, { online: 4812, offline: 6 });
  // dropdown (the one new component)
  const x = 440, y = 92, w = 655;
  let d = '';
  d += icon(F, 'sparkle', x + 18, y + 18, 20, C.copilot, 2) + text(x + 46, y + 34, 'Co-pilot', { size: 18, weight: 700, fill: C.copilot }) + text(x + w - 18, y + 34, 'From live events · 02:16', { size: 14, fill: C.t2, anchor: 'end' });
  d += text(x + 18, y + 68, 'Two critical incidents in Terminal 5 in the last hour.', { size: 18, weight: 500, fill: '#FFFFFF' });
  d += text(x + 18, y + 92, 'One is still open and needs a decision; the other was closed as wildlife.', { size: 16, fill: C.t2 });
  const { alertCard: ac } = { alertCard: null };
  let cy = y + 112;
  const res = [
    { sev: 'Critical', title: 'T5 Pier B Service Door', desc: 'Door forced, no badge within 30 s', ai: 'Co-pilot · open · awaiting decision', time: '01:47 am', selected: true },
    { sev: 'Critical', title: 'Fence Sector 15 · T5 apron', desc: 'Closed automatically: LiDAR classified wildlife', ai: 'Co-pilot · auto-closed · logged', time: '01:22 am' },
  ];
  for (const r of res) { const c = alertCardFn(F, x, cy, w, r); d += c.svg; cy += c.h; }
  d += text(x + 18, cy + 30, 'Sources: event log (8 events) · SOP-SEC-014 §3.2 · CAM 5-210, 5-212', { size: 13.5, fill: C.t2 });
  let cx = x + 18;
  for (const t of ['Where was this person last detected?', 'Show cameras around the incident', 'Why is this door alarm high priority?']) {
    const tw = textWidth(t, 14) + 24;
    if (cx + tw > x + w - 18) { cx = x + 18; cy += 40; }
    d += rect(cx, cy + 46, tw, 30, { r: 15, fill: C.devRow, stroke: '#4A505B' }) + text(cx + 12, cy + 66, t, { size: 14, fill: C.t1 });
    cx += tw + 8;
  }
  const h = cy + 92 - y;
  s += g(F, 'Co-pilot answer dropdown NEW', rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.97, stroke: C.copilot, so: 0.6, sw: 1.2 }) + d);
  return F.render(s);
}
import { alertCard as alertCardFn } from '../lib/v11.mjs';

// ---------- 12 · Incident Management (existing page) with Co-pilot report ----------
export function incidentMgmt() {
  const F = new Frame('V11-12 · Incident Management · Co-pilot report', 1600, H);
  let s = rect(0, 0, 1600, H, { fill: C.frame });
  s += image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  s += g(F, 'Button Exit Incident Management', rect(1265.5, 40.5, 294, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'x', 1284, 53, 20, '#FFFFFF', 2.2) + text(1312, 70, 'Exit Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  s += rect(40, 118, 1520, 911, { r: 16, fill: C.panel, fo: 0.85 });
  // title row
  s += text(256, 165, 'Incident Management', { size: 24, weight: 700, fill: '#FFFFFF' }) + text(256 + textWidth('Incident Management', 24, 700) + 10, 165, '(24)', { size: 24, weight: 700, fill: '#7D8490' });
  s += pill(F, 256 + textWidth('Incident Management (24)', 24, 700) + 30, 149, '5 Open', C.open, { h: 24 }).svg;
  s += rect(1070, 135, 155, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + text(1080, 160, 'Location', { size: 16, fill: '#FFFFFF' }) + poly([[1200, 151], [1210, 151], [1205, 157]], { fill: C.t2 });
  s += rect(1225, 135, 200, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'search', 1234, 145, 18, C.t2, 2);
  s += rect(1438, 135, 106, 38, { r: 6, fill: C.tabOn }) + icon(F, 'search', 1452, 145, 18, '#FFFFFF', 2) + text(1478, 160, 'Search', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += text(60, 232, 'All', { size: 18, weight: 500, fill: C.link }) + text(97, 232, 'Open', { size: 18, fill: C.t2 }) + text(153, 232, 'Closed', { size: 18, fill: C.t2 });
  s += rect(603, 206, 106, 40, { r: 6, fill: C.tabOn }) + icon(F, 'download', 619, 216, 18, '#FFFFFF', 2.2) + text(648, 232, 'Export', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += rect(718.5, 206.5, 125, 39, { r: 6, stroke: C.t3 }) + text(733, 232, 'Filter (0)', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'filter', 812, 216, 18, '#FFFFFF', 2);
  // table
  const cols = [['Status', 52], ['Severity', 137], ['Location', 257], ['Date & Time', 377], ['Code', 497], ['Closed By', 617], ['Device ID', 737]];
  s += rect(40, 254, 804, 42, { fill: '#262A31' });
  cols.forEach(([c, x]) => { s += text(x, 281, c, { size: 14, weight: 500, fill: '#FFFFFF' }); });
  const rows = [
    ['Open', 'Critical', 'T3 Staff Door D-214', 'Today, 02:14:52', 'TGT-214', null, 'ACS-D214'],
    ['Open', 'Critical', 'Fence Sector 5', 'Today, 02:14:58', 'PER-005', null, 'AGF-5-14'],
    ['Open', 'Warning', 'T1 Departure Row K', 'Today, 02:12:40', 'WLS-033', null, 'CAM-1-311'],
    ['Open', 'Warning', 'T1 Door C2', 'Today, 02:13:20', 'IDS-207', null, 'ACS-C2'],
    ['Open', 'Warning', 'T2 Arrival Belt 5', 'Today, 02:11:09', 'FGT-040', null, 'CAM-1-142'],
    ['Closed', 'Warning', 'T2 Gate B12', 'Today, 02:16:04', 'UAB-112', ['Nurul A.', 'Today, 02:31:10'], 'CAM-2-031'],
    ['Closed', 'Info', 'T4 Baggage Hall B2', 'Today, 01:45:20', 'OVS-012', ['Siti K.', 'Today, 02:20:05'], 'ACS-B2'],
    ['Closed', 'Critical', 'T5 Pier B Service Door', 'Today, 01:47:02', 'TGT-209', ['Andrew Teo', 'Today, 02:05:40'], 'ACS-P5B'],
    ['Closed', 'Critical', 'Fence Sector 15', 'Today, 01:22:10', 'PER-015', ['Auto (LiDAR)', 'Today, 01:22:40'], 'AGF-15-03'],
  ];
  rows.forEach(([st, sev, loc, dt, code, by, dev], i) => {
    const y = 296 + i * 56;
    let r = '';
    if (i === 0) r += rect(40, y, 804, 56, { fill: '#3A3F47' });
    r += pill(F, 52, y + 16, st, st === 'Open' ? C.open : C.closed, { h: 25, r: 7.5, pad: 20 }).svg;
    r += pill(F, 137, y + 18, sev, SEVC[sev], { h: 21, r: 6, pad: 16 }).svg;
    r += text(257, y + 33, loc.length > 16 ? loc.slice(0, 14) + '…' : loc, { size: 14, fill: '#FFFFFF' }) + text(377, y + 33, dt, { size: 12, fill: '#FFFFFF' }) + text(497, y + 33, code, { size: 14, fill: '#FFFFFF' });
    if (by) r += text(617, y + 26, by[0], { size: 14, fill: '#FFFFFF' }) + text(617, y + 42, by[1], { size: 12, fill: C.t2 }); else r += text(617, y + 33, '-', { size: 14, fill: '#FFFFFF' });
    r += text(737, y + 33, dev, { size: 14, fill: '#FFFFFF' });
    r += line(40, y + 56, 844, y + 56, { stroke: '#3A3F47' });
    s += g(F, 'Row ' + code, r);
  });
  // pagination
  const py = 828;
  s += rect(393, py - 15, 105, 30, { r: 15, fill: '#FFFFFF' }) + text(403, py + 5, '10 / page', { size: 13, weight: 500, fill: '#111111' }) + poly([[478, py - 3], [488, py - 3], [483, py + 3]], { fill: '#111111' });
  s += text(526, py + 5, '←', { size: 16, fill: '#FFFFFF' });
  [1, 2, 3].forEach((n, i) => { s += circle(567 + i * 35, py, 10, { fill: i ? '#FFFFFF' : '#1D232C', stroke: '#FFFFFF' }) + text(567 + i * 35, py + 4.5, String(n), { size: 12, weight: 700, fill: i ? '#111111' : '#FFFFFF', anchor: 'middle' }); });
  s += text(670, py + 5, '→', { size: 16, fill: '#FFFFFF' }) + text(703, py + 5, 'Go to page', { size: 13, weight: 700, fill: '#FFFFFF' }) + rect(790, py - 14, 28, 28, { r: 6, fill: '#FFFFFF' }) + text(804, py + 5, '1', { size: 13, weight: 700, fill: '#111111', anchor: 'middle' }) + text(828, py + 5, 'Go ›', { size: 13, weight: 700, fill: C.link });
  // detail pane
  const dx = 860, dy = 198, dw = 700, dh = 831;
  const clip = F.clip(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="0"/>`);
  let d = rect(dx, dy, dw, dh, { fill: C.body, fo: 0.8 }) + rect(dx, dy, dw, 4, { fill: C.crit });
  d += rich(876, 228, [{ t: 'Name: ', fill: C.t2 }, { t: 'ACS SERVER 1 - DOOR D-214', fill: C.t1 }], { size: 16 }) + rich(1210, 228, [{ t: 'ID: ', fill: C.t2 }, { t: 'ACS-D214', fill: C.t1 }], { size: 16 }) + rich(1375, 228, [{ t: 'Code: ', fill: C.t2 }, { t: 'TGT-214', fill: C.t1 }], { size: 16 });
  d += text(876, 258, 'Staff Door D-214', { size: 20, weight: 500, fill: C.t1 }) + pill(F, 1440, 242, 'Today, 02:14:52', '#4F545E', { h: 20, size: 13 }).svg;
  d += text(876, 286, 'Tailgating: 2 people crossed, 1 badge presented', { size: 16, fill: C.t2 });
  d += rich(876, 308, [{ t: 'Card user ', fill: C.t2 }, { t: 'J. Tan', fill: '#FFFFFF', weight: 500 }, { t: ', Card ID ', fill: C.t2 }, { t: 'B-55821', fill: '#FFFFFF', weight: 500 }], { size: 16 });
  d += camTile(F, 876, 333, 330, 200, { href: cctv('door_clean'), label: 'Camera 3-118', focus: [0.52, 0.6], box: [524, 248, 132, 420], boxCol: C.crit }) + camTile(F, 1214, 333, 330, 200, { href: cctv('corridor_clean'), label: 'Camera 3-121', focus: [0.5, 0.55], box: box('corridor', 'person'), boxCol: C.crit });
  d += rect(876, 549, 334, 40, { fill: C.tabBody }) + rect(1210, 549, 334, 40, { fill: '#2E333B' }) + text(1043, 576, 'Remarks', { size: 18, weight: 700, fill: '#FFFFFF', anchor: 'middle' }) + text(1377, 576, 'SOP Flow', { size: 18, weight: 700, fill: '#8E95A1', anchor: 'middle' });
  d += rect(876, 589, 668, 360, { fill: C.tabBody });
  const tl = timeline(F, 892, 602, 636, [
    { who: 'Co-pilot', tag: 'Report draft', time: '02:24:02', col: C.copilot, text: 'Follower without a credential entered airside behind badge B-55821 at 02:14:52. Intercepted by Patrol Arjun at Corridor L2-East at 02:21: contractor with an expired temporary pass, escorted landside. Root cause: courtesy tailgating and a slow door closer (9 s). Recommend staff briefing and door-closer service.', size: 14, lh: 20 },
    { who: 'Nurul A.', time: '02:24:10', col: '#2E8BFF', text: 'Reviewed report, agree. Door closer ticket FM-88213 raised.', size: 15, lh: 22 },
  ], { gap: 10 });
  d += tl.svg;
  d += remarksBox(F, 892, 828, 636, { h: 40, ph: 'Add investigation note…' });
  d += rect(884, 965, 660, 44, { r: 8, fill: C.blue }) + text(1214, 994, 'Close Incident', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  s += g(F, 'Incident detail', `<g clip-path="${clip}">${d}</g>`);
  return F.render(s);
}

export const FRAMES = [
  ['V11-01-home-real-time-alerts', home],
  ['V11-02-tailgating-investigation', tailgateInv],
  ['V11-03-tailgating-sop-flow-door-control', tailgateSop],
  ['V11-04-identity-spoofing-investigation', spoofInv],
  ['V11-05-unattended-bag-sop-flow', bagSop],
  ['V11-06-watchlist-loitering-sop-verify', watchSop],
  ['V11-07-fight-detection-investigation', fightInv],
  ['V11-08-overstay-investigation', overstayInv],
  ['V11-09-agil-fence-lidar-investigation', fenceInv],
  ['V11-10-escalate-event-copilot-prefill', escalate],
  ['V11-11-search-ask-copilot', copilotSearch],
  ['V11-12-incident-management-report', incidentMgmt],
];
