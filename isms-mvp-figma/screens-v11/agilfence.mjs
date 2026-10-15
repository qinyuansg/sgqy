// AgilFence end-to-end flow in the current V11 UI: a climb on the fence → system message and
// alarm → incident list → Locate (nearest cameras) → PTZ films the area → command-centre
// video wall → SOP → patrol on scene → close and report. Product frames reuse the V11 kit;
// the few new elements carry "NEW" in their layer names. All names, IDs and times are illustrative.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, poly, text, rich, para, icon, image, g, textWidth, wrap } from '../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, modelToggle, pill, alertsPanel, alertCard, deviceStatus, activeAlarms, timeline, remarksBox, sopFlow, scene, camTile } from '../lib/v11.mjs';
import { camera, clayAirport, marker } from '../lib/clay.mjs';
import { AF, fenceSite, toast, nearestCams, player } from '../lib/fence.mjs';
import { fenceIllustration, segmentStrip } from './agilfence-illustration.mjs';
import { ALERTS } from './data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// on-screen rects [x, y, w, h] of key elements, per frame: the film reads them to place its callouts
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };
const markCounts = counts => { const ws = counts.map(([t]) => textWidth(t, 14, 500) + 16), tot = ws.reduce((a, b) => a + b, 0) + 8 * (ws.length - 1); mark('counter', [40 + (336 - tot) / 2, 134, ws[0], 20]); };

// colour grammar used on the cover, the flow board and the film
export const ROLE = {
  sensor: ['AgilFence', '#D4B741'], system: ['AGIL Secure (auto)', '#3EA9FF'], copilot: ['Co-pilot (concept)', C.copilot],
  operator: ['People decide', '#FFFFFF'], patrol: ['Patrol', '#44AC0C'],
};
const AMBER = '#D4B741', TEAL = '#55D6E6', GREEN = '#44AC0C';
const LOC = ['Main Airport', 'Airfield'];
const EV = { time: '02:14:58', id: 'AGF-5-14', code: 'PER-005', title: 'Fence Sector 5', lines: [['AgilFence alarm on segment 5-14, LiDAR object 1.7 m'], ['PTZ ', { b: '7-02' }, ' on preset 5-14 · runway ', { b: '02L' }, ' 150 m']] };

// ---------- shared pieces ----------
// tonight's other alerts (the standalone AgilFence night: no D-214 tailgating card)
const OTHERS = [   // tonight's other alerts, as in the incident list (no AI lines: this flow is about the fence)
  { key: 'spoof', sev: 'Warning', title: 'T1 Door C2', desc: 'Same card used at T3 Door A17 at 02:09', time: '02:13 am', X: 19, Y: 36, icon: 'idcard' },
  { key: 'watch', sev: 'Warning', title: 'T1 Departure Row K', desc: 'Person in a closed area since 01:49', time: '02:12 am', X: 15, Y: 29, icon: 'eye' },
  { key: 'fight', sev: 'Warning', title: 'T2 Arrival Belt 5', desc: 'Crowd forming near the belt', time: '02:11 am', X: 31, Y: 28, icon: 'users' },
  { key: 'bag', sev: 'Warning', title: 'T2 Gate E5', desc: 'Unattended bag reported', time: '02:04 am', X: 34, Y: 39, icon: 'bag' },
  { key: 'overstay', sev: 'Info', title: 'T4 Baggage Hall B2', desc: 'Overstay in a restricted zone', time: '01:45 am', X: 66, Y: 29.5, icon: 'timer' },
];
const fenceCard = (ai, o = {}) => ({ key: 'fence', sev: 'Critical', title: 'Fence Sector 5', desc: o.desc || 'AgilFence alarm, segment 5-14', ai, time: o.time || 'Now', X: 63, Y: 1, icon: 'fence', selected: o.selected });
const COUNTS = [['1 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];
const cardsWith = fc => fc ? [fc, ...OTHERS] : OTHERS;

// mouse pointer + click ripple (prototype annotation)
function cursor(F, x, y, o = {}) {
  if (process.env.AF_FILM) return '';   // the film animates its own pointer
  let s = '';
  if (o.click) s += circle(x, y, 22, { fill: C.link, fo: 0.18, stroke: C.link, so: 0.8, sw: 1.5 }) + circle(x, y, 34, { stroke: C.link, so: 0.35, sw: 1.2 });
  s += pathEl(`M${f(x)} ${f(y)} l0 22 l6 -5.5 l4 9.5 l3.6 -1.6 l-4 -9.2 l8 0 Z`, { fill: '#FFFFFF', stroke: '#111111', sw: 1.3, join: 'round', filter: F.shadow(2, 2, 0.5) });
  return g(F, o.click ? 'Cursor click' : 'Cursor', s);
}
// close-up of the north fence around segment 5-14 (the Locate view)
function siteView(F, o = {}) {
  const P = camera(o.sx ?? 640, o.sy ?? 400, o.sc ?? 40, o.cx ?? 64.6, o.cy ?? 2.0);
  let s = clayAirport(F, P, { alarmFence: false, lidar: false, labels: false, markers: [] });
  s += fenceSite(F, P, { cams: o.cams ?? AF.cams.map(c => ({ ...c, place: 'above', label: c.id === 'PTZ 7-03' ? false : undefined })), patrol: o.patrol, runway: o.runway, alarm: o.alarm });
  if (o.extra) s += o.extra(F, P);
  s += marker(F, P, { X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: o.mh ?? 3.2, label: o.label ?? 'Seg 5-14 · Alarm', left: o.mleft });
  { const [hx, hy] = P(63, 1, o.mh ?? 3.2), lw = textWidth(o.label ?? 'Seg 5-14 · Alarm', 14, 500) + 24; mark('site', o.mleft ? [hx - 42 - lw, hy - 20, lw + 62, 40] : [hx - 20, hy - 20, lw + 62, 40]); }
  if (o.patrol) { const [vx, vy] = P(...(o.patrol.at || o.patrol.from), 0.2), lw = textWidth(`${o.patrol.id} · ${o.patrol.eta}`, 13, 500) + 20; mark('vehicle', [vx - 18, vy - 18, 36, 36]); mark('patrolLabel', [Math.max(o.patrol.minX ?? -1e9, vx - lw / 2), vy + (o.patrol.dy ?? 30), lw, 28]); }
  return scene(F, s);
}
// wider view of the north perimeter road: patrol route, vehicle and the alarm segment
function patrolView(F, o) {
  return siteView(F, {
    sx: 640, sy: 510, sc: 30, cx: 61, cy: 3.5, label: o.label, mleft: o.mleft,
    cams: [{ ...AF.cams[0], place: 'left', text: 'PTZ 7-02 · tracking' }, { ...AF.cams[1], label: false }, { ...AF.cams[2], label: false }],
    patrol: { ...AF.patrol, id: 'Patrol 2', eta: o.eta, at: o.at, place: 'below', minX: 392, dy: o.pdy },
    runway: { X: 64, Y: 6.4, label: o.runway, col: o.runwayCol },
  });
}
function airportView(F, o = {}) {
  const P = camera(870, 520, 8.4, 50, 29);
  const mk = OTHERS.map(a => ({ id: a.key, X: a.X, Y: a.Y, sev: a.sev, icon: a.icon, h: 4.5, left: a.key === 'watch' || a.key === 'spoof' }));
  if (!o.quiet) {
    mk.push({ id: 'fence', X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: 3.5, label: o.label || 'Sector 5 · Seg 5-14 · Alarm' });
    const [hx, hy] = P(63, 1, 3.5);
    mark('marker', [hx - 20, hy - 20, 42 + textWidth(o.label || 'Sector 5 · Seg 5-14 · Alarm', 14, 500) + 24, 40]);
  }
  return scene(F, clayAirport(F, P, { markers: mk, alarmFence: !o.quiet }));
}
// console frame: header, Real Time Alerts, Device Status, centre view, optional Active Alarms
function consoleFrame(name, o) {
  const F = new Frame(name, W, H);
  let s = o.center(F);
  s += header(F, { loc: LOC, placeholder: 'Search…' });
  if (o.toggle) s += modelToggle(F);
  s += alertsPanel(F, { cluster: 'All terminals', counts: o.counts || COUNTS, cards: cardsWith(o.card) });
  markCounts(o.counts || COUNTS);
  if (o.card) mark('card', [40, 296, 336, alertCard(new Frame('m'), 40, 296, 336, o.card).h]);
  s += deviceStatus(F, { online: 4812, offline: 6 });
  if (o.alarm) s += activeAlarms(F, o.alarm);
  if (o.after) s += o.after(F);
  return F.render(s);
}
const CAMS = {
  ptz: (o = {}) => ({ href: cctv('fence_ptz_clean'), label: 'PTZ 7-02 · Thermal + IR', focus: [0.5, 0.42], box: box('fence_ptz', 'person'), boxCol: C.crit, boxLabel: 'Person · climbing', ...o }),
  thermal: (o = {}) => ({ href: cctv('thermal_clean'), label: 'PTZ 7-02 · Thermal', focus: [0.54, 0.5], box: box('thermal', 'person'), boxCol: C.crit, boxLabel: 'Person 1.7 m', ...o }),
  track: (o = {}) => ({ href: cctv('fence_inside_clean'), label: 'PTZ 7-02 · Auto-track', focus: [0.55, 0.62], box: box('fence_inside', 'person'), boxCol: C.crit, boxLabel: 'Person · tracking', ...o }),
  wide: (o = {}) => ({ href: cctv('fence_wide_clean'), label: 'CAM 7-11 · Sector 5 wide', focus: [0.62, 0.45], box: box('fence_wide', 'person'), boxCol: C.crit, ...o }),
  pre: (o = {}) => ({ href: cctv('fence_pre_clean'), label: 'CAM 7-11 · Perimeter road', focus: [0.62, 0.6], box: box('fence_pre', 'person'), boxCol: C.warn, ...o }),
  lidar: (o = {}) => ({ href: cctv('lidar_clean'), label: 'LiDAR L-5B · point cloud', focus: [0.5, 0.42], ...o }),
  patrol: (o = {}) => ({ href: cctv('fence_patrol_clean'), label: 'PTZ 7-02 · Seg 5-14', focus: [0.5, 0.6], focus: [0.48, 0.6], boxes: [{ box: box('fence_patrol', 'person'), col: C.crit, label: 'Person' }, { box: box('fence_patrol', 'officer1'), col: C.link }, { box: box('fence_patrol', 'officer2'), col: C.link }], ...o }),
};
// Investigation tab: Co-pilot summary + linked alarms + optional extra entries + remarks
const investigation = (entries, o = {}) => (F, x, y, w, h) => {
  const tl = timeline(F, x + 16, y + 12, w - 32, entries, { gap: 10 });
  const ry = y + 12 + tl.h + 4;
  return { svg: tl.svg + remarksBox(F, x + 16, ry, w - 32, { h: 56, ph: o.ph }), h: ry - y + 24 + 56 + 10 + 40 + 16 };
};
const LINKED = [
  ['02:14:58', 'Fence alarm (climb)', 'AgilFence 5-14', C.crit],
  ['02:15:01', 'Object 1.7 m', 'LiDAR L-5B', C.crit],
  ['02:15:03', 'PTZ 7-02 to preset 5-14', 'iPAMS / VMS', C.link],
  ['02:15:12', 'Thermal: 1 person', 'PTZ 7-02', C.crit],
];
// screen-space position of the fence card's "Locate" link (card 1 in Real Time Alerts)
function locateLink(F, fc) { const c = alertCard(new Frame('m'), 40, 296, 336, fc); return [56, 296 + c.h - 24]; }   // icon x, text baseline

// ---------- AF-00 · Cover ----------
export function cover() {
  const F = new Frame('AF-00 · AgilFence end to end · Cover', W, H);
  let s = rect(0, 0, W, H, { fill: C.frame }) + image(F, 'Starfield', asset('stars.jpg'), 0, 0, W, H) + rect(0, 0, W, H, { fill: F.rad([[0, '#0B1424', 0.2], [1, '#020303', 0.95]], 0.7, 0.35, 0.9) });
  s += image(F, 'Logo', asset('logo_s.png'), 60, 56, 50, 46);
  s += text(128, 76, 'AGIL Secure V11', { size: 16, weight: 700, fill: '#FFFFFF' }) + text(128, 96, 'with AgilFence perimeter intrusion detection', { size: 14, fill: C.t2 });
  s += rect(1110.5, 60.5, 230, 30, { r: 15, fill: '#1D232C', stroke: '#4A505B' }) + text(1225.5, 80.5, 'Illustrative scenario · simulated data', { size: 12.5, weight: 500, fill: C.t3, anchor: 'middle' });
  s += text(1340, 112, 'Concepts for V11: auto-linking, nearest cameras, one-click live, wall layout, timeline, evidence pack, Co-pilot', { size: 12.5, fill: C.t2, anchor: 'end' });
  s += text(60, 190, 'END-TO-END FLOW', { size: 14, weight: 700, ls: 2, fill: AMBER });
  s += text(60, 252, 'AgilFence, end to end', { size: 58, weight: 700, fill: '#FFFFFF' });
  s += para(60, 300, 'From a climb on the fence to a confirmed response: what the operator sees on the AGIL Secure V11 dashboard and the command-centre video wall.', 640, { size: 21, lh: 31, fill: C.t1 }).svg;
  // hero: the trigger illustration in a card
  const hx = 760, hy = 150, hw = 580, hh = 400;
  const hc = F.clip(`<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="18"/>`);
  s += g(F, 'Hero', rect(hx, hy, hw, hh, { r: 18, fill: '#070B12', stroke: '#2B3442' }) + `<g clip-path="${hc}">${fenceIllustration(F, hx - 40, hy + 10, hw + 80, hh - 10, { hotX: hx + hw * 0.56, k: 0.8 })}</g>` +
    rect(hx + 18, hy + 18, 238, 30, { r: 8, fill: '#1D232C', fo: 0.92, stroke: C.crit, sw: 1.3 }) + circle(hx + 34, hy + 33, 5, { fill: C.crit }) + text(hx + 46, hy + 38, 'Seg 5-14 · Alarm · 02:14:58', { size: 14, weight: 500, fill: '#FFFFFF' }));
  // the nine steps
  const steps = ['Perimeter triggered', 'System message and alarm', 'Alarm in the incident list', 'Locate: nearest camera', 'PTZ films the area', ['Command-', 'centre video', 'wall'], 'Operator runs the SOP', 'Patrol on scene', 'Close and report'];
  const ACT = [AMBER, C.link, C.link, '#FFFFFF', '#FFFFFF', C.link, '#FFFFFF', GREEN, '#FFFFFF'];   // who acts first, as on the board
  const sy = 610, cw = 131, gap = 12;
  s += text(60, sy - 22, 'THE FLOW · 9 STEPS · SCENARIO CLOCK 02:14:58 TO 02:44:20', { size: 12.5, weight: 700, ls: 1.2, fill: C.t2 });
  steps.forEach((t, i) => {
    const x = 60 + i * (cw + gap), act = ACT[i];
    let c = rect(x, sy, cw, 118, { r: 12, fill: '#1D232C', fo: 0.92, stroke: '#323A47' }) + rect(x, sy, cw, 4, { r: 2, fill: act });
    c += circle(x + 24, sy + 32, 13, { fill: i === 0 ? AMBER : C.blue }) + text(x + 24, sy + 37, String(i + 1), { size: 13, weight: 700, fill: i === 0 ? '#111111' : '#FFFFFF', anchor: 'middle' });
    (Array.isArray(t) ? t : wrap(t, cw - 28, 15, 500)).forEach((l, j) => { c += text(x + 14, sy + 70 + j * 20, l, { size: 15, weight: 500, fill: '#FFFFFF' }); });
    s += g(F, 'Step ' + (i + 1), c);
    if (i < 8) s += pathEl(`M${x + cw + 2} ${sy + 59} l8 0`, { stroke: '#5C6675', sw: 1.5 });
  });
  // legend + cast + facts
  const ly = 790;
  s += text(60, ly, 'WHO DOES WHAT', { size: 12.5, weight: 700, ls: 1.2, fill: C.t2 });
  let lx = 60;
  for (const k of ['sensor', 'system', 'copilot', 'operator', 'patrol']) {
    const [lab, col] = ROLE[k], w = textWidth(lab, 14, 500) + 34;
    s += rect(lx, ly + 16, w, 30, { r: 15, fill: '#1D232C', stroke: col, so: 0.7 }) + circle(lx + 15, ly + 31, 5, { fill: col }) + text(lx + 26, ly + 36, lab, { size: 14, weight: 500, fill: '#FFFFFF' });
    lx += w + 10;
  }
  const cast = [['Nurul A.', 'Control-room operator'], ['Daniel L.', 'Duty manager'], ['Arjun', 'Patrol 2, two-officer crew']];
  s += text(60, ly + 92, 'CAST', { size: 12.5, weight: 700, ls: 1.2, fill: C.t2 });
  cast.forEach(([n, r], i) => { const x = 60 + i * 220; s += circle(x + 18, ly + 128, 18, { fill: '#2C3036', stroke: '#4A505B' }) + icon(F, 'user', x + 8, ly + 118, 20, C.t1, 1.8) + text(x + 46, ly + 124, n, { size: 15, weight: 700, fill: '#FFFFFF' }) + text(x + 46, ly + 143, r, { size: 13, fill: C.t2 }); });
  const facts = [['fence', 'Fibre Bragg grating sensors in one optical cable feel a climb, cut or lift'], ['target', 'Pinpoints the segment to within a few metres'], ['shield', 'Senses with light: immune to electromagnetic and radio interference'], ['wave', 'Adapts to wind, rain and jet blast to keep nuisance alarms low']];
  s += text(760, ly, 'WHY AGILFENCE ON AN AIRFIELD', { size: 12.5, weight: 700, ls: 1.2, fill: C.t2 });
  facts.forEach(([ic, t], i) => { const y = ly + 22 + i * 44; s += circle(778, y + 16, 16, { fill: AMBER, fo: 0.16 }) + icon(F, ic, 768, y + 6, 20, AMBER, 1.9) + text(806, y + 21, t, { size: 15, fill: C.t1 }); });
  s += line(60, 1000, 1340, 1000, { stroke: '#2B3442' });
  s += text(60, 1030, 'Restricted: for CAG security and airside operations stakeholders · not for public display', { size: 14, fill: C.t2 }) + text(1340, 1030, 'ST Engineering · prepared for Changi Airport Group', { size: 14, fill: C.t2, anchor: 'end' });
  return F.render(s);
}

// ---------- AF-01 · Perimeter triggered (physical world) ----------
export function trigger() {
  const F = new Frame('AF-01 · Perimeter triggered · AgilFence senses a climb', W, H);
  let s = rect(0, 0, W, H, { fill: F.lin([[0, '#03060B'], [0.6, '#0A101A'], [1, '#05080D']]) });
  // airfield behind the fence: runway edge lights on the horizon
  let bg = '';
  for (let i = 0; i < 40; i++) { const x = 30 + i * 24; bg += circle(x, 300 + i * 0.4, 2.2, { fill: i % 5 === 0 ? '#FF6A3D' : '#7FB2FF', fo: 0.85 }) + circle(x, 300 + i * 0.4, 6, { fill: '#7FB2FF', fo: 0.08 }); }
  bg += rect(96, 268, 236, 22, { r: 11, fill: '#0B111A', fo: 0.85 }) + text(108, 284, 'Runway 02L edge lights · 150 m', { size: 13, weight: 500, fill: '#7FB2FF' });
  s += g(F, 'Airfield beyond the fence', bg);
  // step header
  s += circle(78, 74, 20, { fill: AMBER }) + text(78, 81, '1', { size: 19, weight: 700, fill: '#111111', anchor: 'middle' });
  s += text(112, 70, 'Perimeter triggered', { size: 28, weight: 700, fill: '#FFFFFF' }) + text(112, 96, '02:14:58 · Fence Sector 5, north perimeter', { size: 16, fill: C.t2 });
  s += rect(1110.5, 56.5, 230, 30, { r: 15, fill: '#1D232C', stroke: '#4A505B' }) + text(1225.5, 76.5, 'Illustrative scenario · simulated data', { size: 12.5, weight: 500, fill: C.t3, anchor: 'middle' });
  // the fence bay with the climber
  const X = 40, Y = 150, Wd = 940, Ht = 560, hot = X + Wd * 0.58;
  s += fenceIllustration(F, X, Y, Wd, Ht, { hotX: hot });
  // pin over the hot zone
  const pw = 360;
  s += g(F, 'Location pin NEW', rect(hot - pw / 2, 136, pw, 54, { r: 10, fill: '#1D232C', fo: 0.95, stroke: C.crit, sw: 1.5 }) + circle(hot - pw / 2 + 24, 163, 9, { fill: C.crit }) + icon(F, 'pin', hot - pw / 2 + 15, 154, 18, '#FFFFFF', 2) +
    text(hot - pw / 2 + 44, 158, 'Fence Sector 5 · Segment 5-14', { size: 15, weight: 700, fill: '#FFFFFF' }) + text(hot - pw / 2 + 44, 178, 'Pinpointed to within a few metres', { size: 13, fill: '#FF8E8F' }));
  // segment strip
  s += text(X + 40, 760, 'FENCE SECTOR 5 · SEGMENTS', { size: 12, weight: 700, ls: 1.2, fill: C.t2 });
  s += segmentStrip(F, X + 40, 772, Wd - 80, { first: 10 });
  // right column: what the fence feels + how it senses
  const rx = 1010, rw = 350;
  let a = rect(rx, 150, rw, 312, { r: 14, fill: '#1D232C', fo: 0.95, stroke: '#323A47' });
  a += text(rx + 20, 182, 'What the fence feels', { size: 17, weight: 700, fill: '#FFFFFF' }) + text(rx + rw - 20, 182, 'Illustrative', { size: 12, fill: C.t2, anchor: 'end' });
  const trace = (y0, amp, col, seed, spikeAt) => {
    let d = `M${rx + 20} ${y0}`;
    for (let i = 1; i <= 62; i++) { const x = rx + 20 + i * 5, sp = spikeAt && i > spikeAt && i < spikeAt + 14 ? Math.sin((i - spikeAt) * 1.3) * 34 * Math.exp(-(i - spikeAt) / 9) : 0; d += ` L${f(x)} ${f(y0 + Math.sin(i * 0.9 + seed) * amp + Math.sin(i * 2.3 + seed) * amp * 0.5 + sp)}`; }
    return pathEl(d, { stroke: col, sw: 2, join: 'round' });
  };
  a += text(rx + 20, 216, 'Seg 5-09 · wind 12 km/h', { size: 13.5, weight: 500, fill: C.t1 }) + pill(F, rx + rw - 96, 202, 'No alarm', '#3A404B', { size: 12, h: 19 }).svg;
  a += line(rx + 20, 256, rx + rw - 20, 256, { stroke: '#323A47' }) + trace(256, 5, '#8C96A6', 1);
  a += text(rx + 20, 312, 'Seg 5-14 · strain above the wind', { size: 13.5, weight: 500, fill: C.t1 }) + pill(F, rx + rw - 76, 298, 'Alarm', C.crit, { size: 12, h: 19 }).svg;
  a += line(rx + 20, 368, rx + rw - 20, 368, { stroke: '#323A47' }) + trace(368, 4, C.crit, 2.2, 26);
  a += rect(rx + 20 + 26 * 5, 324, 1, 74, { fill: '#FFFFFF', fo: 0.4 }) + text(rx + 20 + 26 * 5 + 6, 334, '02:14:58', { size: 11.5, fill: C.t2 });
  a += text(rx + 20, 428, 'Same fence, same night: the wind stays below', { size: 13, fill: C.t2 }) + text(rx + 20, 445, 'the threshold; the climb rises above it.', { size: 13, fill: C.t2 });
  s += g(F, 'Strain signatures NEW', a);
  let b = rect(rx, 478, rw, 236, { r: 14, fill: '#1D232C', fo: 0.95, stroke: '#323A47' }) + text(rx + 20, 510, 'How AgilFence senses it', { size: 17, weight: 700, fill: '#FFFFFF' });
  [['fence', 'FBG sensors along one optical cable feel the strain of a climb, cut or lift.'], ['shield', 'Senses with light: immune to electromagnetic and radio interference.'], ['wave', 'Adapts to wind, rain and jet blast to keep nuisance alarms low.']].forEach(([ic, t], i) => {
    const y = 534 + i * 58;
    b += circle(rx + 36, y + 14, 16, { fill: AMBER, fo: 0.16 }) + icon(F, ic, rx + 26, y + 4, 20, AMBER, 1.9);
    wrap(t, rw - 90, 14).forEach((l, j) => { b += text(rx + 64, y + 12 + j * 19, l, { size: 14, fill: C.t1 }); });
  });
  s += g(F, 'How it senses', b);
  // signal chain
  const chain = [['AgilFence sensor', 'Alarm on 5-14', AMBER, 'fence'], ['iPAMS', 'Location + camera preset', C.link, 'pin'], ['AGIL Secure V11', 'Alarm, incident, SOP', C.link, 'monitor'], ['Operator', 'Sees, clicks, decides', '#FFFFFF', 'user']];
  const cy = 886, cw2 = 296;
  s += text(60, cy - 16, 'SIGNAL CHAIN', { size: 12, weight: 700, ls: 1.2, fill: C.t2 });
  chain.forEach(([t, sub, col, ic], i) => {
    const x = 60 + i * (cw2 + 30);
    s += g(F, 'Chain ' + t, rect(x, cy, cw2, 72, { r: 12, fill: '#1D232C', fo: 0.95, stroke: col, so: 0.6, sw: 1.3 }) + circle(x + 34, cy + 36, 18, { fill: col, fo: 0.16 }) + icon(F, ic, x + 23, cy + 25, 22, col, 1.9) +
      text(x + 64, cy + 31, t, { size: 16, weight: 700, fill: '#FFFFFF' }) + text(x + 64, cy + 53, sub, { size: 13.5, fill: C.t2 }));
    if (i < 3) s += pathEl(`M${x + cw2 + 6} ${cy + 36} l18 0 m-6 -6 l6 6 l-6 6`, { stroke: '#8C96A6', sw: 2, cap: 'round', join: 'round' });
  });
  s += text(60, 1010, 'Someone climbs the fence at segment 5-14. The strain in the fibre rises above the wind, and AgilFence pinpoints the segment.', { size: 16, fill: C.t1 });
  return F.render(s);
}

// ---------- AF-02 · System message and alarm alert ----------
export function alarm() {
  const fc = fenceCard('Co-pilot (concept) · preparing a summary…');
  return consoleFrame('AF-02 · System message and alarm alert (home)', {
    card: fc, toggle: true,
    center: F => airportView(F),
    after: F => {
      const ch = alertCard(new Frame('m'), 40, 296, 336, fc).h;
      let s = g(F, 'New alarm highlight NEW', rect(41, 297, 334, ch - 2, { stroke: C.crit, sw: 2, so: 0.9 }) + rect(37, 293, 342, ch + 6, { stroke: C.crit, sw: 6, so: 0.18 }));
      const ts = toast(F, 930, 196, { title: 'AgilFence alarm · Segment 5-14', sub: 'Fence Sector 5 · Critical · north perimeter', time: '02:14:59', sound: true, w: 430,
        text: 'Disturbance on segment 5-14, consistent with a climb. PTZ 7-02 is moving to preset 5-14.', actions: [['Open alarm', 'primary'], ['Locate', ''], ['Silence', '']] });
      mark('toast', [930, 196, 430, ts.h]);
      s += ts.svg;
      return s;
    },
  });
}

// ---------- Incident Management page (existing V11 page), parameterised ----------
function imPage(name, o) {
  const F = new Frame(name, 1600, H);
  let s = rect(0, 0, 1600, H, { fill: C.frame });
  s += image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  s += g(F, 'Button Exit Incident Management', rect(1265.5, 40.5, 294, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'x', 1284, 53, 20, '#FFFFFF', 2.2) + text(1312, 70, 'Exit Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  s += rect(40, 118, 1520, 911, { r: 16, fill: C.panel, fo: 0.85 });
  s += text(256, 165, 'Incident Management', { size: 24, weight: 700, fill: '#FFFFFF' }) + text(256 + textWidth('Incident Management', 24, 700) + 10, 165, '(24)', { size: 24, weight: 700, fill: '#7D8490' });
  s += pill(F, 256 + textWidth('Incident Management (24)', 24, 700) + 30, 149, o.open + ' Open', C.open, { h: 24 }).svg;
  s += rect(1070, 135, 155, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + text(1080, 160, 'Location', { size: 16, fill: '#FFFFFF' }) + poly([[1200, 151], [1210, 151], [1205, 157]], { fill: C.t2 });
  s += rect(1225, 135, 200, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'search', 1234, 145, 18, C.t2, 2);
  s += rect(1438, 135, 106, 38, { r: 6, fill: C.tabOn }) + icon(F, 'search', 1452, 145, 18, '#FFFFFF', 2) + text(1478, 160, 'Search', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += text(60, 232, 'All', { size: 18, weight: 500, fill: C.link }) + text(97, 232, 'Open', { size: 18, fill: C.t2 }) + text(153, 232, 'Closed', { size: 18, fill: C.t2 });
  s += rect(603, 206, 106, 40, { r: 6, fill: C.tabOn }) + icon(F, 'download', 619, 216, 18, '#FFFFFF', 2.2) + text(648, 232, 'Export', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += rect(718.5, 206.5, 125, 39, { r: 6, stroke: C.t3 }) + text(733, 232, 'Filter (0)', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'filter', 812, 216, 18, '#FFFFFF', 2);
  const cols = [['Status', 52], ['Severity', 137], ['Location', 257], ['Date & Time', 377], ['Code', 497], ['Closed By', 617], ['Device ID', 737]];
  s += rect(40, 254, 804, 42, { fill: '#262A31' });
  cols.forEach(([c, x]) => { s += text(x, 281, c, { size: 14, weight: 500, fill: '#FFFFFF' }); });
  o.rows.forEach(([st, sev, loc, dt, code, by, dev], i) => {
    const y = 296 + i * 56;
    let r = '';
    if (i === 0) r += rect(40, y, 804, 56, { fill: '#3A3F47' }) + (o.fresh ? rect(40, y, 4, 56, { fill: C.crit }) : '');
    r += pill(F, 52, y + 16, st, st === 'Open' ? C.open : C.closed, { h: 25, r: 7.5, pad: 20 }).svg;
    r += pill(F, 137, y + 18, sev, SEVC[sev], { h: 21, r: 6, pad: 16 }).svg;
    r += text(257, y + 33, loc.length > 16 ? loc.slice(0, 14) + '…' : loc, { size: 14, fill: '#FFFFFF' }) + text(377, y + 33, dt, { size: 12, fill: '#FFFFFF' }) + text(497, y + 33, code, { size: 14, fill: '#FFFFFF' });
    if (by) r += text(617, y + 26, by[0], { size: 14, fill: '#FFFFFF' }) + text(617, y + 42, by[1], { size: 12, fill: C.t2 }); else r += text(617, y + 33, '-', { size: 14, fill: '#FFFFFF' });
    r += text(737, y + 33, dev, { size: 14, fill: '#FFFFFF' });
    if (i === 0 && o.fresh) r += g(F, 'New row badge NEW', pill(F, 778, y + 4, 'New', C.crit, { h: 16, size: 10.5, pad: 12 }).svg);
    r += line(40, y + 56, 844, y + 56, { stroke: '#3A3F47' });
    s += g(F, 'Row ' + code, r);
  });
  const py = 828;
  s += rect(393, py - 15, 105, 30, { r: 15, fill: '#FFFFFF' }) + text(403, py + 5, '10 / page', { size: 13, weight: 500, fill: '#111111' }) + poly([[478, py - 3], [488, py - 3], [483, py + 3]], { fill: '#111111' });
  s += text(526, py + 5, '←', { size: 16, fill: '#FFFFFF' });
  [1, 2, 3].forEach((n, i) => { s += circle(567 + i * 35, py, 10, { fill: i ? '#FFFFFF' : '#1D232C', stroke: '#FFFFFF' }) + text(567 + i * 35, py + 4.5, String(n), { size: 12, weight: 700, fill: i ? '#111111' : '#FFFFFF', anchor: 'middle' }); });
  s += text(670, py + 5, '→', { size: 16, fill: '#FFFFFF' }) + text(703, py + 5, 'Go to page', { size: 13, weight: 700, fill: '#FFFFFF' }) + rect(790, py - 14, 28, 28, { r: 6, fill: '#FFFFFF' }) + text(804, py + 5, '1', { size: 13, weight: 700, fill: '#111111', anchor: 'middle' }) + text(828, py + 5, 'Go ›', { size: 13, weight: 700, fill: C.link });
  if (o.note) s += o.note(F);
  // detail pane
  const dx = 860, dy = 198, dw = 700, dh = 831;
  const clip = F.clip(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>`);
  let d = rect(dx, dy, dw, dh, { fill: C.body, fo: 0.8 }) + rect(dx, dy, dw, 4, { fill: C.crit });
  d += rich(876, 228, [{ t: 'Name: ', fill: C.t2 }, { t: 'AGILFENCE · SECTOR 5 · SEG 5-14', fill: C.t1 }], { size: 16 }) + rich(1210, 228, [{ t: 'ID: ', fill: C.t2 }, { t: 'AGF-5-14', fill: C.t1 }], { size: 16 }) + rich(1375, 228, [{ t: 'Code: ', fill: C.t2 }, { t: 'PER-005', fill: C.t1 }], { size: 16 });
  d += text(876, 258, 'Fence Sector 5', { size: 20, weight: 500, fill: C.t1 }) + pill(F, 1440, 242, 'Today, 02:14:58', '#4F545E', { h: 20, size: 13 }).svg;
  o.desc.forEach((runs, i) => { d += rich(876, 286 + i * 22, runs.map(r => typeof r === 'string' ? { t: r, fill: C.t2 } : { t: r.b, fill: '#FFFFFF', weight: 500 }), { size: 16 }); });
  d += camTile(F, 876, 333, 330, 200, o.cams[0]) + camTile(F, 1214, 333, 330, 200, o.cams[1]);
  d += o.detail(F);
  s += g(F, 'Incident detail', `<g clip-path="${clip}">${d}</g>`);
  if (o.after) s += o.after(F);
  return F.render(s);
}
const IM_OTHERS = [
  ['Open', 'Warning', 'T1 Door C2', 'Today, 02:13:20', 'IDS-207', null, 'ACS-C2'],
  ['Open', 'Warning', 'T1 Departure Row K', 'Today, 02:12:40', 'LTR-033', null, 'CAM-1-311'],
  ['Open', 'Warning', 'T2 Arrival Belt 5', 'Today, 02:11:09', 'FGT-040', null, 'CAM-1-142'],
  ['Open', 'Warning', 'T2 Gate E5', 'Today, 02:04:12', 'UAB-112', null, 'CAM-2-031'],
  ['Open', 'Info', 'T4 Baggage Hall B2', 'Today, 01:45:20', 'OVS-012', null, 'ACS-B2'],
  ['Closed', 'Critical', 'T3 Pier B Service Door', 'Today, 01:47:02', 'TGT-209', ['Andrew Teo', 'Today, 02:05:40'], 'ACS-P3B'],
  ['Closed', 'Warning', 'T4 Door G3', 'Today, 01:38:10', 'IDS-198', ['Nurul A.', 'Today, 01:52:30'], 'ACS-G3'],
];
function tabs2(F, a, b, on = 0) {
  return rect(876, 549, 334, 40, { fill: on === 0 ? C.tabBody : '#2E333B' }) + rect(1210, 549, 334, 40, { fill: on === 1 ? C.tabBody : '#2E333B' }) +
    text(1043, 576, a, { size: 18, weight: 700, fill: on === 0 ? '#FFFFFF' : '#8E95A1', anchor: 'middle' }) + text(1377, 576, b, { size: 18, weight: 700, fill: on === 1 ? '#FFFFFF' : '#8E95A1', anchor: 'middle' });
}

// ---------- AF-03 · Alarm in the incident list ----------
export function incidentList() {
  return imPage('AF-03 · Alarm in the incident list (Incident Management)', {
    open: 6, fresh: true,
    rows: [['Open', 'Critical', 'Fence Sector 5', 'Today, 02:14:58', 'PER-005', null, 'AGF-5-14'], ...IM_OTHERS],
    desc: [['AgilFence alarm on segment 5-14 · north perimeter'], ['Runway ', { b: '02L' }, ' 150 m · PTZ ', { b: '7-02' }, ' on preset 5-14']],
    cams: [CAMS.ptz({ label: 'PTZ 7-02 · Thermal + IR', box: null, chips: [['On preset 5-14', C.blue], ['LIVE', C.crit]] }), CAMS.wide({ chips: [['LIVE', C.crit]] })],
    detail: F => {
      let d = tabs2(F, 'Linked (3)', 'SOP Flow');
      d += rect(876, 589, 668, 360, { fill: C.tabBody });
      const tl = timeline(F, 892, 602, 636, [
        { who: 'System', time: '02:15:03', text: '2 alarms and 1 camera action linked', size: 14, italic: true, rows: LINKED.slice(0, 3) },
        { who: 'Co-pilot', tag: 'AI summary · concept', time: '02:15:04', col: C.copilot, text: 'AgilFence and LiDAR L-5B agree: one object, 1.7 m tall, at the fence on segment 5-14. No works or patrols are booked at Sector 5. PTZ 7-02 is on preset 5-14.', size: 14, lh: 20 },
      ], { gap: 12 });
      d += g(F, 'Linked alarms NEW', tl.svg);
      mark('linked', [876, 589, 668, tl.h + 22]); mark('row', [40, 296, 804, 56]); mark('locate', [884, 965, 320, 44]); mark('cams', [876, 333, 668, 200]); mark('note', [60, 870, 764, 64]);
      // NEW actions in the detail: Locate on map / Open in console
      d += g(F, 'Locate on map NEW', rect(884, 965, 320, 44, { r: 8, fill: C.blue }) + icon(F, 'target', 960, 976, 22, '#FFFFFF', 2) + text(990, 994, 'Locate on map', { size: 20, weight: 700, fill: '#FFFFFF' }));
      d += rect(1216.5, 965.5, 327, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(1380, 994, 'Close Incident', { size: 20, weight: 700, fill: '#6B7280', anchor: 'middle' });
      return d;
    },
    after: F => cursor(F, 1160, 992, { click: true }),
  });
}

// ---------- AF-04 · Locate: nearest cameras ----------
export function locate() {
  const fc = fenceCard('Co-pilot (concept) · fence + LiDAR agree', { selected: true });
  return consoleFrame('AF-04 · Locate · nearest cameras on target', {
    card: fc,
    center: F => { const n = nearestCams(F, 400, 590, AF.cams.map(c => c.pref ? { ...c, action: 'Open live', kind: 'Thermal + IR · on preset' } : c), { w: 300 }); mark('nearest', [400, 590, 300, n.h]); { const bw = textWidth('Open live', 12, 700) + 20; mark('openLive', [700 - 20 - bw, 640 + 12, bw, 24]); } mark('ptzTile', [916, 296, 210, 248]); const [lx, ly] = locateLink(F, fc); mark('locateLink', [lx - 4, ly - 18, 82, 26]); return siteView(F) + n.svg; },
    alarm: {
      ev: EV,
      cams: [CAMS.ptz({ box: null, chips: [['On preset 5-14', C.blue], ['LIVE', C.crit]] }), CAMS.wide(), CAMS.lidar()],
      body: investigation([
        { who: 'Co-pilot', tag: 'AI summary · concept', time: '02:15:06', col: C.copilot, text: 'AgilFence reports a disturbance on segment 5-14 at 02:14:58, consistent with a climb. LiDAR L-5B sees one 1.7 m object at the same spot. PTZ 7-02 is on preset.', size: 14, lh: 20 },
        { who: 'System', time: '02:15:03', text: '2 alarms and 1 camera action linked', size: 14, italic: true, rows: LINKED.slice(0, 3) },
      ]),
    },
    after: F => { const [x, y] = locateLink(F, fc); return cursor(F, x + 62, y - 8, { click: true }); },
  });
}

// ---------- AF-05 · PTZ films the area ----------
export function ptz() {
  const fc = fenceCard('Co-pilot (concept) · fence + LiDAR + thermal', { selected: true });
  return consoleFrame('AF-05 · PTZ films the area · live thermal + pre-alarm clip', {
    card: fc,
    center: F => {
      let s = siteView(F, { sy: 745, sc: 40, cx: 63.5, cy: 2.2, cams: [{ ...AF.cams[0], text: 'PTZ 7-02 · auto-track', place: 'left' }], label: 'Seg 5-14 · Person', mh: 1.8 });
      const x = 396, y = 146, w = 488, ph = 300;
      let p = rect(x - 6, y - 6, w + 12, ph + 120, { r: 14, fill: '#1D232C', fo: 0.97, stroke: '#3E4655', filter: F.shadow(10, 18, 0.5) });
      p += player(F, x, y, w, ph, CAMS.thermal({ label: 'PTZ 7-02 · Thermal · preset 5-14', focus: [0.56, 0.48] }), { badge: 'LIVE · Auto-track', clip: { from: 'On preset · 02:15:03', now: 1, to: 'LIVE', live: true } });
      // PTZ controls + actions
      const cy = y + ph + 14;
      p += g(F, 'PTZ controls NEW', rect(x, cy, 92, 36, { r: 8, fill: '#2C3036' }) + icon(F, 'chevL', x + 6, cy + 7, 22, '#FFFFFF', 2) + icon(F, 'chevD', x + 35, cy + 7, 22, '#FFFFFF', 2) + icon(F, 'chevR', x + 64, cy + 7, 22, '#FFFFFF', 2) +
        rect(x + 100, cy, 64, 36, { r: 8, fill: '#2C3036' }) + icon(F, 'minus', x + 106, cy + 7, 22, '#FFFFFF', 2) + icon(F, 'plus', x + 136, cy + 7, 22, '#FFFFFF', 2));
      p += g(F, 'Save clip', rect(x + 172, cy, 108, 36, { r: 8, fill: '#3A404B' }) + icon(F, 'film', x + 182, cy + 8, 20, '#FFFFFF', 1.9) + text(x + 208, cy + 24, 'Save clip', { size: 14, weight: 700, fill: '#FFFFFF' }));
      p += g(F, 'Send to video wall NEW', rect(x + 288, cy, 200, 36, { r: 8, fill: C.blue }) + icon(F, 'monitor', x + 300, cy + 8, 20, '#FFFFFF', 1.9) + text(x + 328, cy + 24, 'Send to video wall', { size: 14, weight: 700, fill: '#FFFFFF' }));
      p += g(F, 'Pre-alarm clip saved NEW', icon(F, 'check', x, cy + 52, 15, C.link, 2.4) + text(x + 21, cy + 64, 'Pre-alarm clip from CAM 7-11 (02:14:41–02:15:08) saved to PER-005', { size: 13, weight: 500, fill: C.link }));
      s += g(F, 'PTZ live view NEW', p);
      { const ih = ph - 34, sc = Math.max(w / 1280, ih / 720), iw = 1280 * sc, ihh = 720 * sc, [bx, by, bw, bh] = box('thermal', 'person');
        const ox = Math.min(x, Math.max(x + w - iw, x + w / 2 - 0.56 * iw)), oy = Math.min(y, Math.max(y + ih - ihh, y + ih / 2 - 0.48 * ihh));   // as player()
        mark('player', [x - 6, y - 6, w + 12, ph + 120]); mark('pbox', [ox + bx * sc - 4, oy + by * sc - 4, bw * sc + 8, bh * sc + 8]); mark('clip', [x - 4, cy + 46, 460, 26]); mark('send', [x + 288, cy, 200, 36]); mark('summary', [916, 604, 428, 116]); }
      return s;
    },
    alarm: {
      ev: EV,
      cams: [CAMS.thermal({ chips: [['Auto-track', C.blue], ['LIVE', C.crit]] }), CAMS.wide(), CAMS.lidar()],
      body: investigation([
        { who: 'Co-pilot', tag: 'AI summary · concept', time: '02:15:12', col: C.copilot, text: 'Disturbance on segment 5-14 at 02:14:58. LiDAR sees one 1.7 m object at the fence and thermal shows one person. No works are booked at Sector 5.', size: 14, lh: 20 },
        { who: 'System', time: '02:15:12', text: '3 alarms and 1 camera action linked', size: 14, italic: true, rows: LINKED },
      ]),
    },
  });
}

// ---------- AF-06 · Command Centre video wall (NEW page, 1920×1080) ----------
export function videoWall() {
  const WW = 1920, HH = 1080;
  const F = new Frame('AF-06 · Command Centre · Video wall NEW', WW, HH);
  let s = rect(0, 0, WW, HH, { fill: C.frame });
  s += image(F, 'Logo', asset('logo_s.png'), 40, 26, 46, 42);
  s += text(104, 50, 'Command Centre · Video Wall', { size: 24, weight: 700, fill: '#FFFFFF' }) + text(104, 72, 'Wall 1 · Layout: Perimeter alarm (auto) · 3 × 3', { size: 14, fill: C.t2 });
  s += rect(1530.5, 26.5, 190, 41, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'chevL', 1544, 35, 22, '#FFFFFF', 2) + text(1572, 54, 'Back to console', { size: 16, weight: 700, fill: '#FFFFFF' });
  s += text(1880, 54, '02:15:18', { size: 22, weight: 500, fill: '#FFFFFF', anchor: 'end' });
  // incident strip
  let st = rect(40, 92, 1840, 52, { r: 10, fill: '#1D232C', fo: 0.95 }) + rect(40, 92, 6, 52, { r: 3, fill: C.crit });
  st += pill(F, 62, 106, 'Critical', C.crit, { h: 24 }).svg + text(150, 125, 'PER-005 · Fence Sector 5 · Segment 5-14', { size: 18, weight: 500, fill: '#FFFFFF' });
  st += text(560, 125, 'Alarm 02:14:58', { size: 16, fill: C.t1 }) + text(720, 125, 'SOP 3 / 8', { size: 16, fill: C.t1 }) + text(830, 125, 'Patrol 2 standing by', { size: 16, fill: C.t1 });
  st += icon(F, 'users', 1420, 106, 20, C.t2, 1.8) + text(1448, 124, 'Viewing: Nurul A., Daniel L.', { size: 15, fill: C.t2 });
  st += rect(1700, 100, 168, 36, { r: 8, fill: C.blue }) + text(1784, 124, 'Open in console', { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  s += g(F, 'Incident strip NEW', st);
  // grid
  const gx = 40, gy = 160, gw = 1840, gh = 850, gap = 12, cw = (gw - 2 * gap) / 3, ch = (gh - 2 * gap) / 3;
  const cell = (c, r, cs = 1, rs = 1) => [gx + c * (cw + gap), gy + r * (ch + gap), cw * cs + gap * (cs - 1), ch * rs + gap * (rs - 1)];
  const osd = (F, x, y, h, t) => text(x + 10, y + h - 12, t, { size: 12, weight: 500, fill: '#E6E6E6' });
  [['hero', 0, 0, 2, 2], ['replay', 2, 0], ['wide', 2, 1], ['lidar', 0, 2], ['map', 1, 2], ['strain', 2, 2]].forEach(([k, ...a]) => mark(k, cell(...a)));
  mark('strip', [40, 92, 1840, 52]);
  let [x, y, w, h] = cell(0, 0, 2, 2);
  s += player(F, x, y, w, h, CAMS.track({ label: 'PTZ 7-02 · Thermal + IR · auto-track · zoom 18×', focus: [0.55, 0.55] }), { badge: 'LIVE', scrub: false }) + osd(F, x, y, h, 'PTZ 7-02 · 2026-10-13 02:15:18');
  [x, y, w, h] = cell(2, 0);
  s += player(F, x, y, w, h, CAMS.pre({ label: 'Replay · CAM 7-11 · before the alarm', boxCol: C.warn, boxLabel: 'Person approaching' }), { badge: 'REPLAY', clip: { from: '02:14:41', alarm: 0.63, now: 0.42, to: '02:15:08' } });
  s += g(F, 'Evidence chip NEW', rect(x + 10, y + 40, 136, 22, { r: 11, fill: '#0E5E68', stroke: TEAL }) + icon(F, 'check', x + 18, y + 44, 14, '#FFFFFF', 2.4) + text(x + 36, y + 56, 'Saved as evidence', { size: 12, weight: 700, fill: '#FFFFFF' }));
  [x, y, w, h] = cell(2, 1);
  s += player(F, x, y, w, h, CAMS.wide({ label: 'CAM 7-11 · Sector 5 wide', focus: [0.6, 0.45] }), { badge: 'LIVE', scrub: false }) + osd(F, x, y, h, 'CAM 7-11 · 2026-10-13 02:15:18');
  [x, y, w, h] = cell(0, 2);
  s += player(F, x, y, w, h, CAMS.lidar({ label: 'LiDAR L-5B · point cloud · 1 track', focus: [0.5, 0.45], box: null }), { badge: 'LIVE', scrub: false });
  [x, y, w, h] = cell(1, 2);
  // sector map tile
  {
    const P = camera(x + w / 2, y + h / 2 + 30, 17, 63, 3);
    const mc = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="6"/>`);
    let m = rect(x, y, w, h, { r: 6, fill: '#05080D' }) + clayAirport(F, P, { alarmFence: false, lidar: false, labels: false, markers: [] });
    m += fenceSite(F, P, { cams: AF.cams.map(c => ({ ...c, label: false })), segLabels: false, sensors: false, patrol: { ...AF.patrol, id: 'Patrol 2', eta: 'standing by', at: AF.patrol.from, place: 'below', dy: 22 } });
    m += marker(F, P, { X: 63, Y: 1, sev: 'Critical', icon: 'fence', h: 3, scale: 0.8, label: 'Seg 5-14' });
    s += g(F, 'Sector 5 map NEW', `<g clip-path="${mc}">${m}${rect(x, y, w, 30, { fill: '#000000', fo: 0.45 })}${icon(F, 'pin', x + 10, y + 7, 16, '#FFFFFF', 1.8)}${text(x + 32, y + 20, 'Sector 5 · map · cameras and patrol', { size: 13, weight: 500, fill: '#FFFFFF' })}</g>`);
  }
  [x, y, w, h] = cell(2, 2);
  {
    let t = rect(x, y, w, h, { r: 6, fill: '#0B0F15', stroke: '#2B3442' }) + rect(x, y, w, 30, { fill: '#000000', fo: 0.45 }) + icon(F, 'wave', x + 10, y + 7, 16, AMBER, 1.8) + text(x + 32, y + 20, 'AgilFence · Seg 5-14 · strain', { size: 13, weight: 500, fill: '#FFFFFF' });
    const bx = x + 20, by = y + 160, bw = w - 40;
    for (let k = 0; k < 4; k++) t += line(bx, y + 70 + k * 40, bx + bw, y + 70 + k * 40, { stroke: '#1E2633' });
    let d = `M${bx} ${by}`;
    for (let i = 1; i <= 110; i++) { const xx = bx + i * bw / 110, sp = i > 58 && i < 82 ? Math.sin((i - 58) * 1.25) * 64 * Math.exp(-(i - 58) / 11) : 0; d += ` L${f(xx)} ${f(by + Math.sin(i * 0.8) * 4 + Math.sin(i * 2.1) * 2 + sp)}`; }
    t += pathEl(d, { stroke: AMBER, sw: 2, join: 'round' }) + rect(bx + 58 * bw / 110, y + 50, 1.5, 180, { fill: C.crit }) + text(bx + 58 * bw / 110 + 6, y + 62, 'Alarm · 02:14:58', { size: 12, weight: 500, fill: '#FF8E8F' });
    t += text(bx, y + h - 18, '02:14:40', { size: 11.5, fill: C.t2 }) + text(bx + bw, y + h - 18, '02:15:18', { size: 11.5, fill: C.t2, anchor: 'end' });
    s += g(F, 'AgilFence strain trace NEW', t);
  }
  // status bar
  s += g(F, 'Wall status NEW', (process.env.AF_FILM ? '' : text(40, 1050, '3 live streams · 1 replay · pre-alarm clip saved to PER-005, PTZ 7-02 recording · layout opened automatically for a Critical perimeter alarm; the operator can pin or swap any tile', { size: 14, fill: C.t2 })) + text(1880, 1050, 'Illustrative scenario · simulated data', { size: 14, fill: C.t2, anchor: 'end' }));
  return F.render(s);
}

// ---------- AF-07 · Operator runs the SOP ----------
const SOP = (stage = 0) => [
  { title: 'Alarm located, cameras on target', state: 'done', tag: 'Auto' },
  { title: 'No works or patrols at segment 5-14', state: 'done', tag: 'Auto' },
  stage >= 0 ? { title: 'Verify on video', state: 'done', tag: 'Confirmed · Nurul 02:15:24' } : { title: 'Verify on video', state: 'todo' },
  stage >= 1 ? { title: 'Dispatch Patrol 2', state: 'done', tag: 'Approved · Nurul 02:15:30' } :
    { title: 'Critical Action Required', state: 'critical', tag: 'Your approval', text: 'Dispatch Patrol 2 (Arjun + 1) by the airside perimeter road, ETA 02:18:30. Keep off the runway strip unless the tower clears it.', actions: [['Dispatch', 'blue'], ['Choose another', 'grey']] },
  { title: 'Inform Airside Ops and tower', state: stage >= 2 ? 'done' : 'todo', tag: stage >= 2 ? 'Logged 02:15:40' : null },
  { title: 'Police call', state: stage >= 3 ? 'done' : 'todo', tag: stage >= 3 ? 'Approved · Daniel 02:16:00' : null },
  { title: 'Keep target in view', state: 'todo', tag: 'Auto · running' },
  { title: 'Secure, close and report', state: 'todo' },
];
export function sop(stage = 0) {
  const fc = fenceCard('Co-pilot (concept) · fence + LiDAR + thermal', { selected: true });
  return consoleFrame(stage < 0 ? 'AF-07a · SOP, routine checks (film)' : 'AF-07 · Operator runs the SOP · approve dispatch', {
    card: fc,
    center: F => patrolView(F, { at: AF.patrol.from, eta: 'standing by', runway: 'Runway 02L · 150 m', pdy: 40 }),
    alarm: {
      ev: EV,
      cams: [CAMS.track({ chips: [['Auto-track', C.blue], ['LIVE', C.crit]] }), CAMS.wide(), CAMS.lidar()],
      tab: 1,
      body: (F, x, y, w, h) => { const pos = []; const r = sopFlow(F, x, y + 4, w, SOP(stage), { caption: 'Loaded automatically: SOP-PER-02 Perimeter intrusion (sample)', captionCol: C.link, captionIcon: 'list', pos });
        mark('auto', [x, pos[0].y, w, pos[2].y - pos[0].y]); mark('verify', [x, pos[2].y, w, pos[3].y + pos[3].h - pos[2].y]); mark('crit', [x, pos[3].y, w, pos[3].h]); mark('dispatch', pos[3].actions[0]); mark('sop', [x, y, w, h]); return r; },
    },
    after: F => cursor(F, 1030, 880, { click: true }),
  });
}

// ---------- AF-08 · Patrol on scene ----------
export function onScene() {
  const fc = fenceCard('Co-pilot (concept) · summary updated', { selected: true });
  return consoleFrame('AF-08 · Patrol on scene · person held short of the runway', {
    card: fc,
    center: F => patrolView(F, { at: [60.2, 2.4], eta: 'on scene 02:18:08', runway: 'Runway 02L · 130 m', runwayCol: GREEN, label: 'Seg 5-14 · Patrol on scene', mleft: true }),
    alarm: {
      ev: { ...EV, lines: [['Person stationary inside the fence line'], ['Patrol 2 on scene ', { b: '02:18:08' }, ' · police on the way']] },
      cams: (mark('tile', [916, 296, 210, 248]), mark('radio', [916, 604, 428, 104]), [CAMS.patrol({ chips: [['LIVE', C.crit]] }), CAMS.wide({ box: null }), CAMS.lidar()]),
      body: investigation([
        { who: 'Arjun (radio)', time: '02:18:47', col: GREEN, text: 'Patrol 2 on scene at segment 5-14, two officers. One person stationary in the grass inside the fence line, 130 m from runway 02L. Holding until police arrive.', size: 14, lh: 20 },
        { who: 'System', time: '02:18:08', text: 'Response so far', size: 14, italic: true, rows: [['02:15:30', 'Patrol 2 dispatched', 'Nurul A.', C.link], ['02:15:46', 'Tower acknowledged', 'Airside Ops', '#FFFFFF'], ['02:16:00', 'Police call approved', 'Daniel L.', '#FFFFFF'], ['02:18:08', 'Patrol on scene', 'Patrol app', GREEN]] },
      ], { ph: 'Add investigation note…' }),
    },
  });
}

// ---------- AF-09 · Close and report ----------
export function close() {
  return imPage('AF-09 · Close and report · response timeline + evidence pack', {
    open: 5,
    rows: [['Closed', 'Critical', 'Fence Sector 5', 'Today, 02:14:58', 'PER-005', ['Nurul A.', 'Today, 02:44:20'], 'AGF-5-14'], ...IM_OTHERS],
    desc: [['Person in police custody · segment 5-14 mesh bent, no cut'], ['Closed by Nurul A. · signed off by Daniel L.']],
    cams: [CAMS.patrol({ label: 'PTZ 7-02 · clip 02:15:03–02:18:50' }), CAMS.pre({ label: 'Replay · CAM 7-11 · 02:14:41', boxCol: C.warn })],
    detail: F => {
      let d = '';
      // response timeline strip (NEW)
      const kp = [['Detected', '02:14:58'], ['Verified', '02:15:24'], ['Dispatched', '02:15:30'], ['Tower told', '02:15:40'], ['On scene', '02:18:08'], ['Custody', '02:26:30'], ['Closed', '02:44:20']];
      let rt = text(876, 562, 'Incident timeline', { size: 15, weight: 700, fill: '#FFFFFF' }) + text(1544, 562, 'Illustrative scenario clock', { size: 12, fill: C.t2, anchor: 'end' });
      const kw = (668 - 6 * 8) / 7;
      kp.forEach(([l, v], i) => { const x = 876 + i * (kw + 8); rt += rect(x, 572, kw, 52, { r: 8, fill: '#2C3036' }) + text(x + 10, 593, l, { size: 12, fill: C.t2 }) + text(x + 8, 615, v, { size: 15, weight: 700, fill: i === 6 ? '#A9D0FF' : '#FFFFFF' }); if (i < 6) rt += text(x + kw + 1, 602, '›', { size: 12, fill: C.t2 }); });
      d += g(F, 'Incident timeline NEW', rt);
      mark('timeline', [870, 542, 680, 88]); mark('report', [876, 684, 668, 92]); mark('evidence', [876, 906, 668, 50]); mark('closed', [884, 965, 660, 44]);
      // tabs: Remarks / SOP Flow (8/8)
      d += rect(876, 638, 334, 40, { fill: C.tabBody }) + rect(1210, 638, 334, 40, { fill: '#2E333B' }) + text(1043, 665, 'Remarks', { size: 18, weight: 700, fill: '#FFFFFF', anchor: 'middle' }) + text(1377, 665, 'SOP Flow · 8/8', { size: 18, weight: 700, fill: '#8E95A1', anchor: 'middle' });
      d += rect(876, 678, 668, 220, { fill: C.tabBody });
      const tl = timeline(F, 892, 690, 636, [
        { who: 'Co-pilot', tag: 'Report draft · concept', time: '02:40:05', col: C.copilot, text: 'Disturbance on fence segment 5-14 at 02:14:58 (AgilFence), corroborated by LiDAR and thermal; verified on video by Nurul A. 02:15:24. Patrol 2 dispatched 02:15:30, on scene 02:18:08; person held 130 m short of runway 02L, police custody 02:26:30. Mesh bent, no cut.', size: 14, lh: 19 },
        { who: 'Nurul A.', time: '02:44:20', col: '#2E8BFF', text: 'Reviewed and closed; Daniel L. signed off. Segment 5-14 guarded until repair.', size: 14, lh: 20 },
      ], { gap: 8 });
      d += tl.svg;
      // evidence pack (NEW)
      let ep = rect(876, 906, 668, 50, { r: 8, fill: '#2C3036' }) + icon(F, 'shieldCheck', 888, 919, 22, TEAL, 1.9) + text(918, 937, 'Evidence pack', { size: 15, weight: 700, fill: '#FFFFFF' });
      let ex = 1036;
      for (const t of ['Locked', '2 clips', 'LiDAR track', 'SOP log 8/8']) { const tw = textWidth(t, 12.5, 500) + 16; ep += rect(ex, 919, tw, 24, { r: 12, fill: '#0E5E68', fo: 0.8 }) + text(ex + 8, 935, t, { size: 12.5, weight: 500, fill: '#FFFFFF' }); ex += tw + 6; }
      ep += rect(1446, 915, 88, 32, { r: 6, fill: C.blue }) + text(1490, 936, 'Export', { size: 14, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
      d += g(F, 'Evidence pack NEW', ep);
      d += rect(884, 965, 660, 44, { r: 8, fill: '#2F6B2F' }) + icon(F, 'check', 1032, 976, 22, '#FFFFFF', 2.4) + text(1062, 994, 'Closed 02:44:20 · signed off by Daniel L.', { size: 20, weight: 700, fill: '#FFFFFF' });
      return d;
    },
  });
}

// ---------- film-only states ----------
// before the alarm: a quiet night on the console
export function quiet() {
  return consoleFrame('AF-02a · Home before the alarm (film)', { card: null, toggle: true, counts: [['0 Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]], center: F => airportView(F, { quiet: true }) });
}
// the alarm card without the system message (toast dismissed)
export function alarmNoToast() {
  return consoleFrame('AF-02b · Alarm card, message dismissed (film)', { card: fenceCard('Co-pilot (concept) · preparing a summary…'), toggle: true, center: F => airportView(F) });
}
// SOP after the dispatch was approved (stage 1), the tower informed (2), the police call approved (3)
function sopStage(stage, name) {
  const fc = fenceCard('Co-pilot (concept) · fence + LiDAR + thermal', { selected: true });
  return consoleFrame(name, {
    card: fc,
    center: F => patrolView(F, { at: [54, 2.4], eta: 'ETA 02:18:30', runway: stage >= 2 ? 'Runway 02L · tower informed' : 'Runway 02L · 150 m' }),
    alarm: { ev: EV, cams: [CAMS.track({ chips: [['Auto-track', C.blue], ['LIVE', C.crit]] }), CAMS.wide(), CAMS.lidar()], tab: 1,
      body: (F, x, y, w, h) => { const pos = []; const r = sopFlow(F, x, y + 4, w, SOP(stage), { caption: 'Loaded automatically: SOP-PER-02 Perimeter intrusion (sample)', captionCol: C.link, captionIcon: 'list', pos });
        mark('step4', [x, pos[3].y, w, 32]); mark('step5', [x, pos[4].y, w, 32]); mark('step6', [x, pos[5].y, w, 32]); return r; } },
  });
}
export const sopDone = () => sopStage(1, 'AF-07b · SOP after dispatch (film)');
export const sopTower = () => sopStage(2, 'AF-07c · SOP, tower informed (film)');
export const sopPolice = () => sopStage(3, 'AF-07d · SOP, police call approved (film)');
export const AF_FILM_FRAMES = [['AF-02a-quiet', quiet, W], ['AF-02b-alarm-card', alarmNoToast, W], ['AF-07a-sop-checks', () => sop(-1), W], ['AF-07b-sop-dispatched', sopDone, W], ['AF-07c-sop-tower', sopTower, W], ['AF-07d-sop-police', sopPolice, W]];

export const AF_FRAMES = [
  ['AF-00-cover', cover, W],
  ['AF-01-perimeter-triggered', trigger, W],
  ['AF-02-system-message-alarm', alarm, W],
  ['AF-03-incident-list', incidentList, 1600],
  ['AF-04-locate-nearest-cameras', locate, W],
  ['AF-05-ptz-films-the-area', ptz, W],
  ['AF-06-command-centre-video-wall', videoWall, 1920],
  ['AF-07-sop-approve-dispatch', sop, W],
  ['AF-08-patrol-on-scene', onScene, W],
  ['AF-09-close-and-report', close, 1600],
];
