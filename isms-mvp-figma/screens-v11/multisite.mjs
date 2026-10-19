// Multi-site, multi-brand governance (strategic area 5) in the current V11 UI: estate overview →
// site drill-down (Seletar handles its own fence alarm under the estate baseline) → Estate Governance
// pages (security baseline · roles & access · systems & connectors · estate report). Product frames
// reuse the V11 kit; new compositions carry "NEW" in their layer names. The estate, sites, people,
// systems, IDs, times and figures are illustrative.
import fs from 'fs';
import path from 'path';
import { Frame, rect, circle, line, poly, text, icon, image, g, textWidth, wrap } from '../lib/svg.mjs';
import { C, SEVC, W, H, asset, header, pill, alertsPanel, alertCard, deviceStatus, activeAlarms, sopFlow, scene } from '../lib/v11.mjs';
import { camera, marker, V } from '../lib/clay.mjs';
import { fenceSite, segX } from '../lib/fence.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// on-screen rects [x, y, w, h] of key elements, per frame (the boards and the deck read them for callouts)
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- the estate (illustrative) ----------
const AMBER = '#D4B741';                         // AgilFence: fence-sensor content only
const GREEN = C.green, BLUE = C.link, GREY = C.tabBody;
const fmt = n => n.toLocaleString('en-US');
export const SITES = [
  { key: 'main', name: 'Changi Airport · Main', short: 'Changi Main', sub: 'T1–T4, airfield', systems: 'V11 native · AgilFence · LiDAR · VMS · ACS', online: 4812, offline: 6, mode: 'Central SOC', alarms: { Critical: 2, Warning: 4, Info: 1 }, baseline: ['compliant', 'Baseline v3 · compliant'], link: 'Link OK', fence: { km: 18.4, alarm: 0, fault: 1 } },
  { key: 'cargo', name: 'Changi Airfreight Centre', short: 'Airfreight Centre', sub: 'Cargo', systems: 'CCTV Vendor B · ACS Vendor C · AgilFence', online: 1204, offline: 2, mode: 'Central SOC', alarms: {}, tonight: 'No open alarms', baseline: ['compliant', 'Baseline v3 · compliant'], link: 'Link OK', fence: { km: 3.1, alarm: 0, fault: 0 } },
  { key: 'seletar', name: 'Seletar Airport', short: 'Seletar Airport', sub: 'Apron, hangars, 6.2 km fence', systems: 'VMS Vendor A · ACS Vendor C · AgilFence', online: 486, offline: 1, mode: 'Local autonomous', alarms: { Warning: 1 }, handler: 'handled locally by Faizal R.', baseline: ['override', 'Baseline v3 · override approved'], link: 'Link OK', fence: { km: 6.2, alarm: 0, fault: 0 } },
  { key: 'east', name: 'Changi East', short: 'Changi East · T5 site', sub: 'T5 construction site', systems: 'CCTV Vendor D · gate ACS Vendor E', online: 318, offline: 4, mode: 'Onboarding', alarms: {}, tonight: '2 systems pending certification', baseline: ['onboarding', 'Onboarding · 2 systems pending certification'], link: 'Link OK', fence: null },
  { key: 'fuel', name: 'Fuel farm', short: 'Fuel farm', sub: 'Off-site', systems: 'AgilFence · ACS Vendor C', online: 212, offline: 0, mode: 'Central SOC', alarms: {}, tonight: 'No open alarms', baseline: ['compliant', 'Baseline v3 · compliant'], link: 'Link OK', fence: { km: 2.4, alarm: 0, fault: 0 } },
];
const MODE = { 'Central SOC': C.blue, 'Local autonomous': GREEN, Onboarding: GREY };
const statusCol = st => st.alarms.Critical ? C.crit : st.alarms.Warning ? C.warn : st.mode === 'Onboarding' ? C.t2 : GREEN;
const sevList = al => ['Critical', 'Warning', 'Info'].filter(k => al[k]).map(k => [`${al[k]} ${k}${al[k] > 1 && k === 'Warning' ? 's' : ''}`, SEVC[k]]);
const ESTATE_COUNTS = [['2 Critical', C.crit], ['5 Warnings', C.warn], ['1 Info', C.info]];
// tonight's alerts across the estate, newest first (titles prefixed by site)
const ESTATE_CARDS = [
  { sev: 'Warning', title: 'Seletar · Fence Sector 2', desc: 'AgilFence alarm, segment 2-07 · site handling locally', time: 'Now' },
  { sev: 'Critical', title: 'Changi Main · Staff Door D-214', desc: 'Tailgating: 2 people crossed on 1 badge', time: '02:14 am' },
  { sev: 'Critical', title: 'Changi Main · Fence Sector 5', desc: 'AgilFence alarm, segment 5-14', time: '02:14 am' },
  { sev: 'Warning', title: 'Changi Main · T1 Door C2', desc: 'Same card used at T3 Door A17 at 02:09', time: '02:13 am' },
  { sev: 'Warning', title: 'Changi Main · T1 Departure Row K', desc: 'Person in a closed area since 01:49', time: '02:12 am' },
  { sev: 'Warning', title: 'Changi Main · T2 Arrival Belt 5', desc: 'Crowd forming near the belt', time: '02:11 am' },
  { sev: 'Warning', title: 'Changi Main · T2 Gate B12', desc: 'Unattended bag reported', time: '02:04 am' },
  { sev: 'Info', title: 'Changi Main · T4 Baggage Hall B2', desc: 'Overstay in a restricted zone', time: '01:45 am' },
];

// ---------- clay pieces for the estate map (NEW) ----------
// a small clay building: dark glazing bands and white slab edges, like the twin's terminals
function block(F, P, x1, y1, x2, y2, floors, o = {}) {
  const fh = o.fh ?? 0.62, gh = fh * 0.62, z0 = o.z0 || 0, top = z0 + floors * fh;
  let s = '';
  for (let k = 0; k < floors; k++) {
    const zb = z0 + k * fh, zg = zb + gh, zt = zb + fh;
    s += poly([P(x1, y2, zb), P(x2, y2, zb), P(x2, y2, zg), P(x1, y2, zg)], { fill: '#3B4049' }) + poly([P(x2, y1, zb), P(x2, y2, zb), P(x2, y2, zg), P(x2, y1, zg)], { fill: '#2C3037' });
    s += poly([P(x1, y2, zg), P(x2, y2, zg), P(x2, y2, zt), P(x1, y2, zt)], { fill: '#D9DDE2' }) + poly([P(x2, y1, zg), P(x2, y2, zg), P(x2, y2, zt), P(x2, y1, zt)], { fill: '#AEB4BC' });
  }
  s += poly([P(x1, y1, top), P(x2, y1, top), P(x2, y2, top), P(x1, y2, top)], { fill: '#E9ECF0', stroke: '#FFFFFF', so: 0.7, sw: 1 });
  return s;
}
function runway(P, x1, x2, y1, y2) {
  let r = poly([P(x1, y1), P(x2, y1), P(x2, y2), P(x1, y2)], { fill: '#252A31' });
  for (let X = x1 + 0.8; X < x2 - 0.8; X += 1.6) r += line(...P(X, (y1 + y2) / 2), ...P(X + 0.8, (y1 + y2) / 2), { stroke: '#FFFFFF', so: 0.7, sw: 1 });
  return r;
}
function tank(P, cx, cy, r, h) {
  const n = 14, phi = Math.atan2(Math.cos(24 * Math.PI / 180), Math.sin(24 * Math.PI / 180));   // the side of the tank that faces the camera
  const arc = (z, rev) => { const pts = []; for (let i = 0; i <= n; i++) { const a = phi - Math.PI / 2 + Math.PI * i / n; pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); } return rev ? pts.reverse() : pts; };
  const full = z => { const pts = []; for (let i = 0; i < 2 * n; i++) { const a = Math.PI * i / n; pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); } return pts; };
  return poly([...arc(0), ...arc(h, true)], { fill: '#AEB4BC' }) + poly(full(h), { fill: '#E9ECF0', stroke: '#FFFFFF', so: 0.7, sw: 1 });
}
function crane(P, X, Y) {
  return line(...P(X, Y, 0), ...P(X, Y, 3.6), { stroke: '#D9DDE2', sw: 1.6 }) + line(...P(X - 3.2, Y, 3.6), ...P(X + 1, Y, 3.6), { stroke: '#D9DDE2', sw: 1.6 }) + line(...P(X - 2.6, Y, 3.6), ...P(X - 2.6, Y, 1.4), { stroke: '#D9DDE2', sw: 1, so: 0.8 });
}
// what sits on each site tile (world units around the tile centre)
const TILE_CONTENT = {
  main: (F, P, X, Y) => runway(P, X - 8, X + 8, Y - 5.4, Y - 4.4) + block(F, P, X - 7, Y - 2.6, X - 1.2, Y + 0.6, 4) + block(F, P, X + 1.2, Y - 2.6, X + 7, Y + 0.6, 4) + block(F, P, X - 0.5, Y + 2.2, X + 0.5, Y + 3.2, 9, { fh: 0.45 }) + block(F, P, X - 5, Y + 0.6, X - 3.8, Y + 4.6, 2) + block(F, P, X + 3, Y + 0.6, X + 4.2, Y + 4.6, 2),
  cargo: (F, P, X, Y) => [-4.6, -1.3, 2].map(dx => block(F, P, X + dx, Y - 1.8, X + dx + 2.6, Y + 1.8, 2)).join(''),
  seletar: (F, P, X, Y) => runway(P, X - 4.4, X + 4.4, Y - 2.8, Y - 2.1) + block(F, P, X - 3.8, Y - 0.6, X - 1.2, Y + 2.2, 2, { fh: 0.8 }) + block(F, P, X + 0.2, Y - 0.6, X + 2.8, Y + 2.2, 2, { fh: 0.8 }) + block(F, P, X + 3.6, Y + 1.4, X + 4.2, Y + 2, 6, { fh: 0.45 }),
  east: (F, P, X, Y) => block(F, P, X - 3.4, Y - 1.2, X + 0.2, Y + 1.6, 2) + crane(P, X + 2.6, Y + 1.2),
  fuel: (F, P, X, Y) => [[-1.9, -1.4], [1.3, -1.4], [-1.9, 1.5], [1.3, 1.5]].map(([a, b]) => tank(P, X + a, Y + b, 1.1, 1.3)).join(''),
};
// tile centres on screen (the inverse projection places them in the world) and label cards
const TILE_AT = { seletar: [470, 300, 5, 3.5], east: [800, 400, 5, 3.5], main: [545, 560, 9, 6], cargo: [815, 690, 5.5, 3.5], fuel: [470, 790, 4.5, 3.5] };
const CARD_AT = { seletar: [530, 258], east: [500, 352], main: [640, 505], cargo: [510, 651], fuel: [520, 751] };

function siteTile(F, P, t) {
  const { st, X, Y, hw, hh } = t, x1 = X - hw, y1 = Y - hh, x2 = X + hw, y2 = Y + hh, col = statusCol(st);
  const plate = [P(x1, y1), P(x2, y1), P(x2, y2), P(x1, y2)];
  let s = g(F, 'Status ring', poly(plate, { stroke: col, sw: 9, so: 0.16 }) + poly(plate, { fill: '#0B0F15', fo: 0.92, stroke: col, sw: 1.8, dash: st.mode === 'Onboarding' ? '6 4' : undefined }));
  if (st.fence) { const i = 0.6; s += g(F, 'AgilFence line', poly([P(x1 + i, y1 + i, 0.3), P(x2 - i, y1 + i, 0.3), P(x2 - i, y2 - i, 0.3), P(x1 + i, y2 - i, 0.3)], { stroke: V.blue, so: 0.6, sw: 1.2 })); }
  s += g(F, 'Buildings', TILE_CONTENT[st.key](F, P, X, Y));
  return g(F, 'Site tile ' + st.short + ' NEW', s);
}
function siteCard(F, P, t) {
  const { st } = t, [x, y] = CARD_AT[st.key], w = 250, h = 78, col = statusCol(st);
  const [px, py] = P(t.X, t.Y, 0.4), ex = px < x ? x : x + w, ey = y + h / 2;
  let s = line(ex, ey, px, py, { stroke: col, so: 0.6, sw: 1.2 }) + circle(px, py, 3.5, { fill: col });
  s += rect(x, y, w, h, { r: 10, fill: '#1D232C', fo: 0.94, stroke: col, sw: 1.5 });
  s += text(x + 12, y + 21, st.short, { size: 14, weight: 500, fill: '#FFFFFF' });
  const pw = textWidth(st.mode, 11, 500) + 12;
  s += pill(F, x + w - 12 - pw, y + 8, st.mode, MODE[st.mode], { size: 11, h: 18, pad: 12 }).svg;
  s += text(x + 12, y + 42, `${fmt(st.online)} online · ${st.offline} offline`, { size: 12.5, fill: C.t2 });
  const al = sevList(st.alarms);
  let cx = x + 12;
  if (al.length) for (const [lab, c] of al) { const p = pill(F, cx, y + 52, lab, c, { size: 11, h: 17, pad: 10 }); s += p.svg; cx += p.w + 6; }
  else s += text(x + 12, y + 65, st.tonight, { size: 12.5, fill: C.t2 });
  return g(F, 'Site card ' + st.short + ' NEW', s);
}
// the estate map: five site tiles on the blue grid, linked to the Central SOC node
function estateMapView(F) {
  const sx = 640, sy = 500, sc = 7, th = 24 * Math.PI / 180, cth = Math.cos(th), sth = Math.sin(th), tilt = 0.56;
  const P = camera(sx, sy, sc, 0, 0);
  const world = (px, py) => { const a = (px - sx) / sc, b = (py - sy) / (sc * tilt); return [a * cth + b * sth, -a * sth + b * cth]; };
  let gr = '';
  for (let k = -140; k <= 200; k += 4) gr += line(...P(k, -140), ...P(k, 200), { stroke: V.grid, so: 0.28, sw: 1 }) + line(...P(-140, k), ...P(200, k), { stroke: V.grid, so: 0.28, sw: 1 });
  let s = g(F, 'Grid', gr);
  const tiles = SITES.map(st => { const [x, y, hw, hh] = TILE_AT[st.key], [X, Y] = world(x, y); return { st, X, Y, hw, hh }; });
  const main = tiles.find(t => t.st.key === 'main');
  const hub = [main.X - main.hw - 0.4, main.Y - main.hh - 0.4];
  let lk = '';
  for (const t of tiles) if (t.st.key !== 'main') {
    const local = t.st.mode === 'Local autonomous';
    lk += g(F, `Link ${t.st.short} to Central SOC`, line(...P(t.X, t.Y, 0.05), ...P(hub[0], hub[1], 0.05), { stroke: BLUE, so: local ? 0.6 : 0.7, sw: 1.5, dash: local ? '2 7' : '8 6', cap: 'round' }));
  }
  s += g(F, 'Links to Central SOC NEW', lk);
  for (const t of [...tiles].sort((a, b) => P.depth(a.X, a.Y) - P.depth(b.X, b.Y))) s += siteTile(F, P, t);
  s += marker(F, P, { id: 'Central SOC', X: hub[0], Y: hub[1], col: BLUE, icon: 'monitor', h: 5, scale: 0.9, label: 'Central SOC' });
  for (const t of tiles) s += siteCard(F, P, t);
  mark('map', [392, 150, 500, 690]);
  return scene(F, g(F, 'Estate map NEW', s));
}

// ---------- Sites panel (NEW, in the Active Alarms slot) ----------
function sitesPanel(F) {
  const x = 900, y = 125, w = 460, h = 904;
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>`);
  let s = rect(x, y, w, h, { r: 16, fill: C.panel, fo: 0.85 });
  s += `<g clip-path="${clip}">${rect(x, 161.8, w, 868, { fill: C.body, fo: 0.8 })}</g>`;
  s += text(916, 149, 'Sites', { size: 16, weight: 700, fill: '#FFFFFF' }) + text(962, 149, '5 sites · 1 local autonomous', { size: 13, fill: C.t2 });
  { const lab = 'Estate baseline v3', pw = textWidth(lab, 12, 500) + 14; s += pill(F, x + w - 16 - pw, 131, lab, C.blue, { size: 12, h: 20, pad: 14 }).svg; }
  const rh = 150;
  let ry = 170;
  for (const st of SITES) {
    const sel = st.key === 'seletar';
    let r = sel ? rect(x, ry, w, rh, { fill: '#3A3F47' }) + rect(x, ry, 4, rh, { fill: C.warn }) : '';
    r += text(916, ry + 27, st.name, { size: 16, weight: 500, fill: '#FFFFFF' });
    { const pw = textWidth(st.mode, 12, 500) + 14; r += pill(F, 1344 - pw, ry + 12, st.mode, MODE[st.mode], { size: 12, h: 20, pad: 14 }).svg; }
    r += text(916, ry + 48, st.sub + ' · ' + st.systems, { size: 13, fill: C.t2 });
    r += circle(922, ry + 70, 5, { fill: C.online }) + text(933, ry + 75, 'Online', { size: 13, fill: C.t2 }) + text(981, ry + 75, fmt(st.online), { size: 14, weight: 700, fill: '#FFFFFF' });
    r += circle(1046, ry + 70, 5, { fill: C.crit }) + text(1057, ry + 75, 'Offline', { size: 13, fill: C.t2 }) + text(1106, ry + 75, String(st.offline), { size: 14, weight: 700, fill: '#FFFFFF' });
    r += icon(F, 'link', 1200, ry + 62, 15, GREEN, 2) + text(1221, ry + 75, st.link, { size: 13, fill: C.t1 });
    r += text(916, ry + 101, 'Open alarms', { size: 13, fill: C.t2 });
    let cx = 916 + textWidth('Open alarms', 13) + 10;
    const al = sevList(st.alarms);
    if (al.length) { for (const [lab, c] of al) { const p = pill(F, cx, ry + 88, lab, c, { size: 12, h: 18, pad: 12 }); r += p.svg; cx += p.w + 6; } if (st.handler) r += text(cx + 4, ry + 101, '· ' + st.handler, { size: 13, fill: C.t2 }); }
    else r += text(cx, ry + 101, st.tonight, { size: 13, fill: C.t1 });
    const [bk, bt] = st.baseline, bc = bk === 'compliant' ? GREEN : bk === 'override' ? BLUE : C.t2;
    r += icon(F, bk === 'onboarding' ? 'clock' : 'shieldCheck', 916, ry + 114, 16, bc, 2) + text(938, ry + 127, bt, { size: 13, fill: C.t1 });
    r += line(x, ry + rh, x + w, ry + rh, { stroke: '#2C3036' });
    s += g(F, 'Site row ' + st.short, r);
    if (sel) mark('siteRowSeletar', [x, ry, w, rh]);
    ry += rh;
  }
  s += g(F, 'Footer buttons', rect(916, 966, 208, 44, { r: 8, fill: C.blue }) + icon(F, 'extLink', 958, 977, 22, '#FFFFFF', 2) + text(988, 995, 'Open site', { size: 20, weight: 700, fill: '#FFFFFF' }) +
    rect(1136.5, 966.5, 207, 43, { r: 7.5, stroke: '#8B8B8B' }) + icon(F, 'doc', 1162, 977, 22, '#FFFFFF', 2) + text(1192, 995, 'Estate report', { size: 20, weight: 700, fill: '#FFFFFF' }));
  mark('sitesPanel', [x, y, w, h]);
  return g(F, 'Sites panel NEW', s);
}

// ---------- MS-01 · Estate overview ----------
export function estateOverview() {
  const F = new Frame('MS-01 · Estate overview · CAG Estate · all sites, open alarms, baseline compliance', W, H);
  let s = estateMapView(F);
  s += header(F, { loc: ['CAG Estate', 'All sites'], placeholder: 'Search…' });
  mark('location', [440, 43, 209, 40]);
  s += alertsPanel(F, { cluster: 'All sites', counts: ESTATE_COUNTS, cards: ESTATE_CARDS });
  mark('cardSeletar', [40, 296, 336, alertCard(new Frame('m'), 40, 296, 336, ESTATE_CARDS[0]).h]);
  s += deviceStatus(F, { online: '7,032', offline: 13 });
  s += sitesPanel(F);
  return F.render(s);
}

// ---------- MS-02 · Site drill-down · Seletar ----------
const SEL_EV = { time: '02:20:14', id: 'AGF-S2-07', code: 'PER-S02', title: 'Fence Sector 2', lines: [['AgilFence alarm on segment 2-07 · Seletar north fence'], ['SOP-PER-02 · Estate baseline v3 · handled by ', { b: 'Faizal R.' }]] };
const SEL_CAMS = [
  { id: 'PTZ 2-04', kind: 'PTZ · thermal + IR', X: 55.2, Y: 2.0, dist: '70 m', pref: true, place: 'above' },
  { id: 'CAM 2-11', kind: 'Fixed · colour', X: 60.2, Y: 1.7, dist: '110 m', place: 'above' },
  { id: 'CAM 2-12', kind: 'Fixed · colour', X: 63.6, Y: 4.0, dist: '140 m', place: 'above' },
];
const SEL_CARDS = [
  { sev: 'Warning', title: 'Fence Sector 2', desc: 'AgilFence alarm, segment 2-07 · verified on PTZ 2-04', time: '02:20 am', selected: true },
  { sev: 'Info', title: 'Hangar 3 · Door H3-2', desc: 'Door held open 45 s · closed by staff', time: '01:58 am' },
  { sev: 'Info', title: 'Apron Gate A2', desc: 'Vehicle permit check · cleared', time: '01:36 am' },
];
// the baseline steps carry a lock; the one local step carries its approval
const SEL_SOP = [
  { title: 'Alarm located, cameras on target', state: 'done', lock: true, tag: 'Auto' },
  { title: 'Verify on video', state: 'done', lock: true, tag: 'Verified on PTZ 2-04 · 02:21:05' },
  { title: 'Dispatch Seletar patrol', state: 'done', lock: true, tag: 'Approved · Faizal 02:21:30' },
  { title: 'Notify Seletar tower', state: 'todo', tag: 'Local · approved by Grace T.', text: 'Local step for Seletar’s tower · approved by the estate on 12 Oct.' },
  { title: 'Inform Airside Ops and tower', state: 'todo', lock: true, tag: 'Estate baseline v3' },
  { title: 'Police call', state: 'todo', lock: true, tag: 'Estate baseline v3 · duty manager' },
  { title: 'Keep target in view', state: 'todo', lock: true, tag: 'Estate baseline v3' },
  { title: 'Secure, close and report', state: 'todo', lock: true, tag: 'Estate baseline v3' },
];
// Seletar's clay ground in the twin's grammar: grid, site plate, one runway, apron, perimeter fence, two hangars
function seletarGround(F, P) {
  let gr = '';
  for (let k = -60; k <= 160; k += 4) gr += line(...P(k, -60), ...P(k, 120), { stroke: V.grid, so: 0.28, sw: 1 });
  for (let k = -60; k <= 120; k += 4) gr += line(...P(-60, k), ...P(160, k), { stroke: V.grid, so: 0.28, sw: 1 });
  let s = g(F, 'Grid', gr);
  s += g(F, 'Site plate', poly([P(0, 0), P(100, 0), P(100, 40), P(0, 40)], { fill: '#0B0F15', fo: 0.92, stroke: '#5C83C9', so: 0.45, sw: 1.2 }));
  let rw = poly([P(8, 4.5), P(92, 4.5), P(92, 7.5), P(8, 7.5)], { fill: '#252A31' });
  for (let X = 12; X < 88; X += 3) rw += line(...P(X, 6), ...P(X + 1.6, 6), { stroke: '#FFFFFF', so: 0.7, sw: 1.2 });
  rw += poly([P(40, 9.5), P(76, 9.5), P(76, 16.5), P(40, 16.5)], { fill: '#151A21' }) + poly([P(56, 7.5), P(59, 7.5), P(59, 9.5), P(56, 9.5)], { fill: '#1C2128' });
  s += g(F, 'Airside surfaces', rw);
  const per = [[1, 1], [99, 1], [99, 39], [1, 39], [1, 1]];
  let fe = '';
  for (let e = 0; e < 4; e++) fe += line(...P(...per[e], 0.6), ...P(...per[e + 1], 0.6), { stroke: V.blue, so: 0.55, sw: 1.4 });
  s += g(F, 'AgilFence perimeter', fe);
  s += g(F, 'Hangar', block(F, P, 63, 14.5, 66.5, 16.5, 1, { fh: 0.8 }));
  return g(F, 'Seletar site (clay) NEW', s);
}
// Seletar's fence Sector 2 on the clay site: segment labels, the sensing cable and the alarm glow on 2-07
function seletarSegments(F, P) {
  const y = 1, ka = 11, [a0, a1] = segX(ka);
  // keep segment labels clear of the camera pins and their label boxes
  const camBoxes = SEL_CAMS.map(c => { const [hx, hy] = P(c.X, c.Y, 1.6), lw = textWidth(`${c.id} · ${c.dist}`, 13, 500) + 20; return [hx - lw / 2 - 4, hy - 54, lw + 8, 36]; });
  const clear = (x, yy) => !camBoxes.some(([bx, by, bw, bh]) => x > bx - 14 && x < bx + bw + 14 && yy > by - 2 && yy < by + bh + 12) && !SEL_CAMS.some(c => { const [px, py] = P(c.X, c.Y, 1.6); return Math.hypot(px - x, py - yy) < 24; });
  let lab = '';
  for (let k = 9; k <= 16; k++) {
    if (k === ka) continue;
    const [x0] = segX(k), [lx, ly] = P(x0 + 1, y - 0.55, 0);
    if (clear(lx, ly)) lab += text(lx, ly, '2-' + String(k - 4).padStart(2, '0'), { size: 12, weight: 500, fill: '#9FC3FF', anchor: 'middle' });
  }
  let dots = '';
  for (let X = 40; X <= 78; X += 0.5) { const [dx, dy] = P(X, y, 0.35), hot = X >= a0 - 0.2 && X <= a1 + 0.2; dots += circle(dx, dy, hot ? 2.6 : 1.7, { fill: hot ? AMBER : '#7FB2FF', fo: hot ? 1 : 0.8 }); }
  const [p0x, p0y] = P(a0, y, 0.6), [p1x, p1y] = P(a1, y, 0.6);
  let glow = line(p0x, p0y, p1x, p1y, { stroke: AMBER, sw: 12, so: 0.25 }) + line(p0x, p0y, p1x, p1y, { stroke: AMBER, sw: 4 });
  glow += [1.4, 2.4, 3.4].map((r, i) => { const pts = []; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; pts.push(P(57 + r * Math.cos(a), y + r * 0.7 * Math.sin(a), 0.05)); } return poly(pts, { stroke: AMBER, so: 0.7 - i * 0.2, sw: 1.5 }); }).join('');
  return g(F, 'Seletar fence Sector 2 NEW', g(F, 'Segment labels', lab) + g(F, 'AgilFence sensors', dots) + g(F, 'Alarm segment 2-07', glow));
}
function seletarView(F) {
  const P = camera(640, 430, 36, 58.6, 2.6);
  let s = seletarGround(F, P);
  s += fenceSite(F, P, { segLabels: false, sensors: false, alarm: false, cams: SEL_CAMS, target: [57, 1], patrol: { id: 'Seletar patrol', from: [47, 2.4], to: [56.4, 2.4], eta: 'sent 02:21:30', at: [53.5, 2.4], place: 'below', dy: 30, minX: 392 } });
  s += seletarSegments(F, P);
  s += marker(F, P, { id: 'Seg 2-07', X: 57, Y: 1, sev: 'Warning', icon: 'fence', h: 3.2, label: 'Seg 2-07 · Alarm' });
  return scene(F, s);
}
// site mode chip (NEW): the estate baseline, the site's autonomy and who is watching
function modeChip(F, x, y) {
  const parts = [['lock', 'Estate baseline v3', BLUE], ['dot', 'Local autonomous', GREEN], ['eye', 'Central SOC watching', BLUE]];
  let cx = x + 16, inner = '';
  parts.forEach(([ic, lab, col], i) => {
    if (i) { cx += 12; inner += circle(cx, y + 16, 2, { fill: C.t2 }); cx += 14; }
    if (ic === 'dot') { inner += circle(cx + 6, y + 16, 5, { fill: col }); cx += 18; } else { inner += icon(F, ic, cx, y + 8, 16, col, 2); cx += 22; }
    inner += text(cx, y + 21, lab, { size: 13, weight: 500, fill: '#FFFFFF' });
    cx += textWidth(lab, 13, 500);
  });
  const w = cx + 16 - x;
  mark('autonomyChip', [x, y, w, 32]);
  return g(F, 'Site mode chip NEW', rect(x, y, w, 32, { r: 16, fill: '#1D232C', fo: 0.95, stroke: '#3E4655' }) + inner);
}
export function siteSeletar() {
  const F = new Frame('MS-02 · Site drill-down · Seletar Airport · local autonomy under the estate baseline', W, H);
  let s = seletarView(F);
  s += header(F, { loc: ['Seletar Airport', 'Apron'], placeholder: 'Search…' });
  s += modeChip(F, 392, 146);
  s += alertsPanel(F, { cluster: 'All zones', counts: [['0 Critical', C.crit], ['1 Warning', C.warn], ['2 Info', C.info]], cards: SEL_CARDS });
  s += deviceStatus(F, { online: 486, offline: 1 });
  s += activeAlarms(F, {
    ev: SEL_EV,
    cams: [
      { href: cctv('fence_ptz_clean'), label: 'PTZ 2-04 · Thermal + IR', focus: [0.5, 0.42], box: box('fence_ptz', 'person'), boxCol: C.warn, boxLabel: 'Person · verified 02:21:05' },
      { href: cctv('fence_wide_clean'), label: 'CAM 2-11 · Sector 2 wide', focus: [0.62, 0.45], box: box('fence_wide', 'person'), boxCol: C.warn },
      { href: cctv('fence_pre_clean'), label: 'CAM 2-12 · Perimeter road', focus: [0.62, 0.6] },
    ],
    tab: 1, bodyH: 356,
    body: (F, x, y, w) => {
      const pos = [];
      const r = sopFlow(F, x, y + 4, w, SEL_SOP, { caption: 'Handled locally by Faizal R. · Central SOC watching', captionCol: BLUE, captionIcon: 'eye', pos });
      mark('caption', [x, y + 4, w, 30]); mark('sopBaselineStep', [x, pos[1].y, w, pos[1].h]); mark('sopLocalStep', [x, pos[3].y, w, pos[3].h]);
      return r;
    },
  });
  mark('alarmHead', [916, 176, 428, 108]);
  return F.render(s);
}

// ---------- Estate Governance pages (1600 wide, Incident Management idiom) ----------
const TABS = ['Security baseline', 'Roles & access', 'Systems & connectors', 'Estate report'];
const thead = (F, y, cols, h = 42) => rect(40, y, 804, h, { fill: '#262A31' }) + cols.map(([c, x, a]) => text(x, y + h / 2 + 5, c, { size: 14, weight: 500, fill: '#FFFFFF', anchor: a })).join('');
function detailPane(F, accent, inner) {
  const dx = 860, dy = 198, dw = 700, dh = 831;
  const clip = F.clip(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>`);
  return g(F, 'Detail pane', `<g clip-path="${clip}">${rect(dx, dy, dw, dh, { fill: C.body, fo: 0.8 }) + rect(dx, dy, dw, 4, { fill: accent }) + inner}</g>`);
}
function govPage(name, tab, o) {
  const F = new Frame(name, 1600, H);
  let s = rect(0, 0, 1600, H, { fill: C.frame }) + image(F, 'Logo', asset('logo_s.png'), 40, 40, 50, 46);
  const bl = 'Exit Estate Governance', bw = textWidth(bl, 20, 700) + 66, bx = 1559.5 - bw;
  s += g(F, 'Button Exit Estate Governance', rect(bx, 40.5, bw, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'x', bx + 18.5, 53, 20, '#FFFFFF', 2.2) + text(bx + 46.5, 70, bl, { size: 20, weight: 700, fill: '#FFFFFF' }));
  s += rect(40, 118, 1520, 911, { r: 16, fill: C.panel, fo: 0.85 });
  let p = '';
  const tw = textWidth('Estate Governance', 24, 700);
  p += text(256, 165, 'Estate Governance', { size: 24, weight: 700, fill: '#FFFFFF' }) + text(256 + tw + 10, 165, '(5 sites)', { size: 24, weight: 700, fill: '#7D8490' });
  p += pill(F, 256 + tw + 10 + textWidth('(5 sites)', 24, 700) + 20, 149, 'Baseline v3', C.blue, { h: 24 }).svg;
  if (o.controls) p += o.controls(F);
  else {
    p += rect(1070, 135, 155, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + text(1080, 160, 'CAG Estate', { size: 16, fill: '#FFFFFF' }) + poly([[1200, 151], [1210, 151], [1205, 157]], { fill: C.t2 });
    p += rect(1225, 135, 200, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'search', 1234, 145, 18, C.t2, 2);
    p += rect(1438, 135, 106, 38, { r: 6, fill: C.tabOn }) + icon(F, 'search', 1452, 145, 18, '#FFFFFF', 2) + text(1478, 160, 'Search', { size: 16, weight: 700, fill: '#FFFFFF' });
  }
  let tx = 60, tabs = '';
  TABS.forEach((t, i) => { const on = i === tab, w = textWidth(t, 18, on ? 500 : 400); tabs += text(tx, 232, t, { size: 18, weight: on ? 500 : 400, fill: on ? C.link : C.t2 }); if (on) tabs += rect(tx, 241, w, 2, { fill: C.link }); tx += w + 30; });
  p += g(F, 'Governance tabs', tabs);
  s += g(F, 'Estate Governance page NEW', p + o.body(F));
  return F.render(s);
}

// ---------- MS-03 · Security baseline ----------
const SOPS = [
  ['SOP-PER-02', 'Perimeter intrusion', 'v3', 4, '1 approved · 1 pending', '12 Oct 2026', true],
  ['SOP-SEC-014', 'Tailgating', 'v5', 4, '—', '30 Sep 2026'],
  ['SOP-SEC-021', 'Unattended item', 'v2', 4, '—', '15 Sep 2026'],
  ['SOP-ACS-007', 'Credential misuse', 'v1', 4, '—', '2 Oct 2026'],
  ['SOP-OPS-003', 'Overstay in restricted zone', 'v2', 4, '—', '8 Oct 2026'],
  ['SOP-EMG-001', 'Emergency lockdown', 'v4', 4, '—', '1 Oct 2026'],
];
const ESTATE_STEPS = [['Alarm located, cameras on target', 'Auto'], ['Verify on video', 'Operator'], ['Dispatch patrol', 'Critical action · approval'], ['Inform airside operations and tower', 'Operator'], ['Police call', 'Duty manager approval'], ['Keep target in view', 'Auto'], ['Secure, close and report', 'Operator']];
export function baseline() {
  return govPage('MS-03 · Estate Governance · Security baseline · estate SOPs, local overrides, approvals', 0, {
    body: F => {
      let s = g(F, 'Baseline table NEW', thead(F, 254, [['SOP', 52], ['Name', 160], ['Baseline', 392], ['Sites compliant', 470], ['Local overrides', 596], ['Last review', 736]]) + SOPS.map(([code, name, ver, n, ovr, rev, sel], i) => {
        const y = 296 + i * 56;
        let row = sel ? rect(40, y, 804, 56, { fill: '#3A3F47' }) + rect(40, y, 4, 56, { fill: BLUE }) : '';
        row += text(52, y + 33, code, { size: 14, weight: 500, fill: '#FFFFFF' }) + text(160, y + 33, name, { size: 14, fill: '#FFFFFF' });
        row += pill(F, 392, y + 18, ver, GREY, { size: 12, h: 20, pad: 14 }).svg + text(470, y + 33, `${n} / 5`, { size: 14, fill: '#FFFFFF' });
        SITES.forEach((st, k) => { const ok = !(n < 5 && st.key === 'east'); row += ok ? circle(524 + k * 12, y + 28, 4, { fill: GREEN }) : circle(524 + k * 12, y + 28, 3.5, { stroke: C.t3, sw: 1.2, so: 0.8 }); });
        row += text(596, y + 33, ovr, { size: 13, fill: ovr === '—' ? C.t2 : '#FFFFFF' }) + text(736, y + 33, rev, { size: 13, fill: '#FFFFFF' }) + line(40, y + 56, 844, y + 56, { stroke: '#3A3F47' });
        if (sel) mark('sopRow', [40, y, 804, 56]);
        return g(F, 'Row ' + code, row);
      }).join(''));
      s += text(60, 672, 'Baseline v3 · published 12 Oct by Grace T. · acknowledged by 4 sites on 13 Oct (Changi East after certification) · next review 12 Jan 2027', { size: 13, fill: C.t2 });
      const hx = 60, hy = 700, hw = 764;
      let hc = rect(hx, hy, hw, 150, { r: 12, fill: '#2C3036' }) + text(hx + 20, hy + 30, 'How the security baseline works', { size: 16, weight: 700, fill: '#FFFFFF' });
      [['lock', 'Estate steps are locked. Only estate admins change them, in a new baseline version.'], ['plus', 'Sites add local steps for their own needs. The estate approves or returns each request.'], ['eye', 'Central SOC sees every site. A site operator sees only their own site and runs the steps.']].forEach(([ic, t], i) => {
        const y = hy + 60 + i * 30;
        hc += circle(hx + 32, y - 5, 12, { fill: BLUE, fo: 0.16 }) + icon(F, ic, hx + 24, y - 13, 16, BLUE, 2) + text(hx + 54, y, t, { size: 14, fill: C.t1 });
      });
      s += g(F, 'How the baseline works NEW', hc);
      // detail: SOP-PER-02
      let d = text(876, 232, 'SOP-PER-02 · Perimeter intrusion', { size: 20, weight: 500, fill: C.t1 });
      { const lab = 'Estate baseline v3 · locked', pw = textWidth(lab, 13, 500) + 16; d += pill(F, 1544 - pw, 216, lab, C.blue, { size: 13, h: 22, pad: 16 }).svg; }
      d += text(876, 258, 'Owner Grace T. · Head of Security · reviewed 12 Oct 2026 · next review 12 Jan 2027', { size: 14, fill: C.t2 });
      d += text(876, 280, 'Applies to all 5 sites · 1 local step approved (Seletar) · 1 request pending (Changi East)', { size: 14, fill: C.t1 });
      d += text(876, 318, 'ESTATE STEPS · LOCKED', { size: 12, weight: 700, ls: 1.2, fill: C.t2 });
      let st = '';
      ESTATE_STEPS.forEach(([t, who], i) => {
        const y = 330 + i * 34;
        st += g(F, 'Estate step ' + (i + 1), circle(888, y + 11, 9, { fill: C.stepNum }) + text(888, y + 15.5, String(i + 1), { size: 12, weight: 700, fill: '#FFFFFF', anchor: 'middle' }) + icon(F, 'lock', 906, y + 3, 15, C.t3, 2) + text(928, y + 16, t, { size: 15, fill: '#FFFFFF' }) + text(1544, y + 16, who, { size: 12.5, fill: C.t2, anchor: 'end' }) + line(876, y + 30, 1544, y + 30, { stroke: '#4A505B' }));
      });
      d += g(F, 'Estate steps (locked) NEW', st);
      mark('detailSteps', [876, 306, 668, 7 * 34 + 24]);
      const ssy = 330 + 7 * 34 + 26, y1 = ssy + 14;
      d += text(876, ssy, 'SITE STEPS', { size: 12, weight: 700, ls: 1.2, fill: C.t2 });
      { const pw = textWidth('Approved', 12, 500) + 14;
        d += g(F, 'Site step Seletar NEW', rect(876, y1, 668, 54, { r: 8, fill: '#2C3036' }) + text(892, y1 + 22, 'Seletar Airport · “Notify Seletar tower” · after step 3', { size: 14, weight: 500, fill: '#FFFFFF' }) + text(892, y1 + 42, 'Requested by Faizal R. · approved by Grace T. · 12 Oct 2026', { size: 12.5, fill: C.t2 }) + pill(F, 1528 - pw, y1 + 10, 'Approved', GREEN, { size: 12, h: 20, pad: 14 }).svg); }
      d += text(892, y1 + 76, 'Changi Airport · Main, Changi Airfreight Centre, Fuel farm: no local steps', { size: 13, fill: C.t2 });
      const oy = y1 + 92;
      let ov = rect(876, oy, 668, 32, { fill: C.sopGold }) + icon(F, 'alert', 890, oy + 7, 18, '#6E1A10', 2) + text(916, oy + 22, 'Override request · Changi East (T5 construction site)', { size: 16, weight: 500, fill: '#6E1A10' }) + text(1530, oy + 21, 'Your approval', { size: 12.5, weight: 500, fill: '#6E1A10', anchor: 'end' });
      ov += rect(876, oy + 32, 668, 104, { fill: C.sopBrown });
      wrap('Add a local step after step 2: “Check construction gate C-1 on camera”. Requested 17 Oct 2026 by the Changi East site lead. Approving adds one site step for Changi East only; the estate steps stay locked.', 630, 13.5).forEach((l, i) => { ov += text(892, oy + 54 + i * 19, l, { size: 13.5, fill: '#F3DED7' }); });
      const by = oy + 32 + 104 - 44;
      [['Approve', '#43A517'], ['Return with comment', '#5A606B']].reduce((ax, [lab, col]) => { const bw = textWidth(lab, 15, 700) + 26; ov += g(F, 'Action ' + lab, rect(ax, by, bw, 32, { r: 6, fill: col }) + text(ax + bw / 2, by + 21.5, lab, { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' })); return ax + bw + 8; }, 892);
      d += g(F, 'Override request NEW', ov);
      mark('overrideRequest', [876, oy, 668, 136]);
      let vh = text(876, 870, 'VERSION HISTORY', { size: 12, weight: 700, ls: 1.2, fill: C.t2 });
      [['v3', '12 Oct 2026 · Grace T.', 'added step 6 “Keep target in view”; clarified the police-call approval'], ['v2', '3 Jul 2026 · Grace T.', 'police call needs duty-manager approval'], ['v1', '15 Feb 2026 · Grace T.', 'estate baseline created from the Changi Main SOP']].forEach(([v, who, what], i) => {
        const y = 896 + i * 28;
        vh += pill(F, 876, y - 14, v, i ? GREY : C.blue, { size: 12, h: 20, pad: 12 }).svg + text(916, y, who, { size: 13, weight: 500, fill: '#FFFFFF' }) + text(1086, y, what, { size: 13, fill: C.t2 });
      });
      d += g(F, 'Version history NEW', vh);
      d += text(876, 1004, 'Audit · every approval is logged with name, time and version · v3 published 12 Oct 2026 · 2 changes since v2', { size: 12.5, fill: C.t2 });
      return s + detailPane(F, BLUE, d);
    },
  });
}

// ---------- MS-04 · Roles & access ----------
const ROLES = [
  ['Estate admin', 'Grace T. + 1 · estate governance', ['Full', 'Full', 'Full', 'Full', 'Full']],
  ['Central SOC operator', 'Nurul A. + 11 · based at Changi Main', ['Operate', 'Operate', 'View', 'View', 'Operate']],
  ['Site security manager', 'own site only · Faizal R. at Seletar', ['Operate', 'Operate', 'Operate', 'Operate', 'Operate']],
  ['Auditor', 'read-only · estate and all sites', ['View', 'View', 'View', 'View', 'View']],
  ['Integrator', 'sandbox API only · no console access', ['—', '—', '—', 'Sandbox', '—']],
];
const CELL = { Full: C.blue, Operate: GREEN, View: GREY, Sandbox: C.devRow };
const PEOPLE = [['Faizal R.', 'Seletar Airport', 'Today, 02:20:40', true], ['A. Wong', 'Changi Airport · Main', 'Today, 01:58:12'], ['R. Kumar', 'Changi Airfreight Centre', 'Yesterday, 21:40'], ['M. Chen', 'Changi East', '15 Oct 2026'], ['S. Ong', 'Fuel farm', '16 Oct 2026']];
export function roles() {
  return govPage('MS-04 · Estate Governance · Roles & access · role × site matrix, Faizal R. at Seletar', 1, {
    body: F => {
      const colX = k => 300 + k * 108;
      let m = rect(40, 254, 804, 42, { fill: '#262A31' }) + text(52, 281, 'Role', { size: 14, weight: 500, fill: '#FFFFFF' });
      SITES.forEach((st, k) => { m += text(colX(k) + 54, 281, st.short.replace(' · T5 site', ''), { size: 13, weight: 500, fill: '#FFFFFF', anchor: 'middle' }); });
      ROLES.forEach(([role, sub, cells], i) => {
        const y = 296 + i * 62, sel = i === 2;
        let row = sel ? rect(40, y, 804, 62, { fill: '#3A3F47' }) + rect(40, y, 4, 62, { fill: BLUE }) : '';
        row += text(52, y + 27, role, { size: 15, weight: 500, fill: '#FFFFFF' }) + text(52, y + 46, sub, { size: 12, fill: C.t2 });
        cells.forEach((v, k) => {
          const cx = colX(k) + 54;
          if (v === '—') row += text(cx, y + 36, '—', { size: 14, fill: C.t3, anchor: 'middle' });
          else { const w = textWidth(v, 12, 500) + 16; row += rect(cx - w / 2, y + 20, w, 22, { r: 6, fill: CELL[v], stroke: v === 'Sandbox' ? C.t2 : undefined }) + text(cx, y + 35.5, v, { size: 12, weight: 500, fill: '#FFFFFF', anchor: 'middle' }); }
          if (sel && k === 2) row += rect(colX(k) + 2, y + 2, 104, 58, { r: 6, stroke: BLUE, sw: 2 });
        });
        row += line(40, y + 62, 844, y + 62, { stroke: '#3A3F47' });
        m += g(F, 'Role row ' + role, row);
      });
      mark('matrix', [40, 254, 804, 352]);
      let s = g(F, 'Role matrix NEW', m);
      let lx = 60, lg = '';
      [['Full', 'edit the baseline, roles and connectors'], ['Operate', 'run alarms, SOPs and cameras'], ['View', 'read-only'], ['—', 'no access']].forEach(([v, t]) => {
        if (v === '—') { lg += text(lx, 640, '—', { size: 13, fill: C.t3 }); lx += 14; } else { const w = textWidth(v, 12, 500) + 16; lg += rect(lx, 626, w, 20, { r: 6, fill: CELL[v] }) + text(lx + 8, 640, v, { size: 12, weight: 500, fill: '#FFFFFF' }); lx += w + 8; }
        lg += text(lx, 640, t, { size: 13, fill: C.t2 }); lx += textWidth(t, 13) + 24;
      });
      s += g(F, 'Matrix legend', lg);
      let pt = text(60, 690, 'People in this role · Site security manager (5)', { size: 14, weight: 500, fill: '#FFFFFF' });
      pt += rect(40, 702, 804, 32, { fill: '#262A31' }) + [['Name', 52], ['Site', 300], ['Last sign-in', 540], ['MFA', 740]].map(([c, x]) => text(x, 723, c, { size: 13, weight: 500, fill: '#FFFFFF' })).join('');
      PEOPLE.forEach(([n, site, last, sel], i) => {
        const y = 734 + i * 40;
        let row = sel ? rect(40, y, 804, 40, { fill: '#3A3F47' }) + rect(40, y, 4, 40, { fill: BLUE }) : '';
        row += text(52, y + 25, n, { size: 14, weight: sel ? 500 : 400, fill: '#FFFFFF' }) + text(300, y + 25, site, { size: 13, fill: C.t1 }) + text(540, y + 25, last, { size: 13, fill: C.t1 }) + icon(F, 'shieldCheck', 740, y + 11, 16, GREEN, 2) + text(762, y + 25, 'On', { size: 13, fill: C.t1 }) + line(40, y + 40, 844, y + 40, { stroke: '#3A3F47' });
        pt += g(F, 'Person ' + n, row);
      });
      s += g(F, 'People in role NEW', pt);
      s += g(F, 'Principle NEW', rect(60, 962, 764, 50, { r: 10, fill: '#2C3036' }) + icon(F, 'shield', 78, 976, 22, BLUE, 1.9) + text(112, 993, 'Local guards see only their site; the estate sees everything, edits only the baseline.', { size: 15, weight: 500, fill: C.t1 }));
      // person card
      let d = circle(904, 240, 26, { fill: '#2C3036', stroke: '#4A505B' }) + icon(F, 'user', 890, 226, 28, C.t1, 1.8);
      d += text(944, 236, 'Faizal R.', { size: 20, weight: 500, fill: C.t1 }) + text(944, 258, 'Site security manager · Seletar Airport', { size: 14, fill: C.t2 });
      let px = 944;
      for (const [lab, col] of [['MFA on', GREEN], ['Scope · Seletar Airport', GREY], ['Site mode · Local autonomous', C.blue]]) { const p = pill(F, px, 270, lab, col, { size: 12, h: 20, pad: 14 }); d += p.svg; px += p.w + 8; }
      const section = (y, title, rows, ic, col) => { let o = text(876, y, title, { size: 12, weight: 700, ls: 1.2, fill: C.t2 }); rows.forEach((t, i) => { const yy = y + 16 + i * 30; o += icon(F, ic, 878, yy + 2, 16, col, 2.4) + text(904, yy + 15, t, { size: 14, fill: C.t1 }); }); return o; };
      d += g(F, 'Can do', section(326, 'WHAT FAIZAL CAN DO', ['Operate Seletar: alarms, SOP runs, cameras and patrol dispatch', 'Run the approved local step “Notify Seletar tower”', 'View estate status: sites, baseline version and open alarm counts (read-only)', 'Propose local steps and overrides to the estate'], 'check', GREEN));
      d += g(F, 'Cannot do', section(474, 'CANNOT', ['Edit estate baseline steps (locked, estate admins only)', 'See other sites’ alarms, video or people', 'Change roles, connectors or the site mode'], 'x', C.crit));
      d += g(F, 'Access', section(592, 'ACCESS', ['Last sign-in · Today, 02:20:40 · Seletar SOC workstation 2', 'MFA on · session ends 06:00 · role granted by Grace T. on 12 Oct 2026', 'Site mode · Local autonomous · Central SOC watches in read-only'], 'clock', C.t2));
      d += rect(876, 716, 668, 1, { fill: '#4A505B' });
      d += text(876, 752, 'Who sees what', { size: 15, weight: 700, fill: '#FFFFFF' });
      [['Faizal R. (Seletar)', 'Seletar alarms, cameras, SOP runs · estate status read-only'], ['Nurul A. (Central SOC)', 'every site · operates three, watches Seletar and Changi East'], ['Grace T. (estate admin)', 'everything · edits only the baseline, roles and connectors']].forEach(([who, what], i) => { const y = 778 + i * 28; d += text(876, y, who, { size: 13.5, weight: 500, fill: '#FFFFFF' }) + text(1070, y, what, { size: 13.5, fill: C.t2 }); });
      d += g(F, 'Card buttons', rect(884.5, 965.5, 320, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(1044.5, 994, 'View audit log', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' }) + rect(1216, 965, 328, 44, { r: 8, fill: C.blue }) + text(1380, 994, 'Edit role', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
      mark('personCard', [860, 198, 700, 831]);
      return s + g(F, 'Person card NEW', detailPane(F, BLUE, d));
    },
  });
}

// ---------- MS-05 · Systems & connectors ----------
const CONNECTORS = [
  { site: 'Changi Airport · Main', short: 'Main', note: '5 systems · 4,812 online · 6 offline', rows: [['CCTV / VMS', 'cctv', 'AGIL', 'ONVIF Profile S/T', 'Connected', '2,960'], ['Access control', 'key', 'AGIL', 'OSDP v2', 'Connected', '1,650'], ['AgilFence', 'fence', 'AGIL', 'AgilFence native', 'Connected', '12 · 18.4 km'], ['LiDAR', 'radar', 'Vendor A', 'LiDAR SDK', 'Certified', '24'], ['Intercom', 'phone', 'Vendor B', 'SIP', 'Fault', '172 · 2 offline']] },
  { site: 'Changi Airfreight Centre', short: 'Airfreight', note: '3 systems · 1,204 online · 2 offline', rows: [['CCTV', 'cctv', 'Vendor B', 'ONVIF Profile S', 'Certified', '740'], ['Access control', 'key', 'Vendor C', 'OSDP v2', 'Certified', '460'], ['AgilFence', 'fence', 'AGIL', 'AgilFence native', 'Connected', '6 · 3.1 km']] },
  { site: 'Seletar Airport', short: 'Seletar', note: '3 systems · 486 online · 1 offline', rows: [['VMS', 'cctv', 'Vendor A', 'ONVIF Profile T', 'Certified', '286'], ['Access control', 'key', 'Vendor C', 'OSDP v2', 'Certified', '191'], ['AgilFence', 'fence', 'AGIL', 'AgilFence native', 'Connected', '10 · 6.2 km']] },
  { site: 'Changi East (T5 construction site)', short: 'Changi East', note: '2 systems · pending certification', rows: [['CCTV', 'cctv', 'Vendor D', 'ONVIF Profile S', 'Onboarding', '212'], ['Access control (gate)', 'key', 'Vendor E', 'OSDP v2', 'Onboarding', '110']] },
  { site: 'Fuel farm (off-site)', short: 'Fuel farm', note: '2 systems · 212 online · 0 offline', rows: [['AgilFence', 'fence', 'AGIL', 'AgilFence native', 'Connected', '4 · 2.4 km'], ['Access control', 'key', 'Vendor C', 'OSDP v2', 'Certified', '208']] },
];
const CSTAT = { Connected: GREEN, Certified: C.blue, Onboarding: GREY, Fault: C.crit };
const CHECKS = [['Discovery', 'Found 110 readers and 12 controllers', 'done', '01:41'], ['Events', 'Door open, forced and held-open events received', 'done', '01:46'], ['Video', 'Not applicable to access control', 'na', '—'], ['Time sync', 'In step with the estate clock', 'done', '01:47'], ['Audit', 'Writing and reading back test entries…', 'running', 'running']];
export function connectors() {
  return govPage('MS-05 · Estate Governance · Systems & connectors · any brand under one roof, onboarding dialog', 2, {
    body: F => {
      let s = thead(F, 254, [['System', 52], ['Vendor', 300], ['Protocol', 400], ['Status', 580], ['Devices', 832, 'end']]);
      let y = 296;
      for (const grp of CONNECTORS) {
        const gy = y, east = grp.short === 'Changi East';
        let gs = rect(40, y, 804, 28, { fill: '#262A31', fo: 0.6 }) + text(52, y + 19, grp.site, { size: 13, weight: 700, fill: '#FFFFFF' }) + text(832, y + 19, grp.note, { size: 12.5, fill: C.t2, anchor: 'end' });
        y += 28;
        for (const [sys, ic, vendor, proto, status, dev] of grp.rows) {
          let row = icon(F, ic, 52, y + 9, 18, status === 'Fault' ? C.crit : C.t1, 1.8) + text(78, y + 23, sys, { size: 14, fill: '#FFFFFF' }) + text(300, y + 23, vendor, { size: 14, fill: '#FFFFFF' }) + text(400, y + 23, proto, { size: 13, fill: C.t1 });
          row += pill(F, 580, y + 8, status, CSTAT[status], { size: 12, h: 20, pad: 14 }).svg + text(832, y + 23, dev, { size: 13, fill: '#FFFFFF', anchor: 'end' }) + line(40, y + 36, 844, y + 36, { stroke: '#3A3F47' });
          gs += g(F, `Row ${grp.short} ${sys}`, row);
          y += 36;
        }
        if (east) { gs += rect(41, gy + 1, 802, y - gy - 2, { stroke: BLUE, sw: 1.5, so: 0.9 }); mark('onboardingRows', [40, gy, 804, y - gy]); }
        s += g(F, 'Site group ' + grp.short, gs);
      }
      s = g(F, 'Connectors table NEW', s);
      s += text(60, y + 28, 'Connected: live in V11 · Certified: passed the five certification checks · Onboarding: checks running · Fault: needs attention', { size: 12.5, fill: C.t2 });
      // dialog (Escalate-dialog idiom) over the detail pane
      const dx = 890, dy = 230, dw = 640, dh = 626;
      const clip = F.clip(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="16"/>`);
      let dl = rect(dx, dy, dw, dh, { r: 16, fill: '#333A47', filter: F.shadow(12, 24, 0.5) }) + `<g clip-path="${clip}">${rect(dx, dy, dw, 36, { fill: '#191E25' })}</g>`;
      dl += text(dx + 16, dy + 23, 'Add third-party system', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', dx + dw - 36, dy + 8, 20, '#FFFFFF', 2.2);
      const lab = (x, y, t) => text(x, y, t, { size: 16, fill: '#FFFFFF' }) + text(x + textWidth(t, 16) + 2, y, '*', { size: 16, fill: C.crit });
      const sel = (x, y, w, val, o = {}) => rect(x, y, w, 40, { r: 6, fill: '#282828', stroke: o.focus ? C.link : C.t3, sw: o.focus ? 1.5 : 1 }) + text(x + 10, y + 26, val, { size: 16, fill: '#FFFFFF' }) + (o.plain ? '' : poly([[x + w - 32, y + 17], [x + w - 22, y + 17], [x + w - 27, y + 23]], { fill: '#9BA1AC' }));
      let fy = dy + 68;
      dl += g(F, 'Field Site', lab(dx + 16, fy, 'Site') + sel(dx + 16, fy + 10, dw - 32, 'Changi East (T5 construction site)'));
      fy += 74;
      dl += g(F, 'Field System type', lab(dx + 16, fy, 'System type') + sel(dx + 16, fy + 10, 296, 'Access control (gate)'));
      dl += g(F, 'Field Protocol', lab(dx + 328, fy, 'Protocol') + sel(dx + 328, fy + 10, 296, 'OSDP v2', { focus: true }));
      mark('protocolSelect', [dx + 328, fy + 10, 296, 40]);
      fy += 74;
      dl += g(F, 'Field Vendor', lab(dx + 16, fy, 'Vendor') + sel(dx + 16, fy + 10, 296, 'Vendor E'));
      dl += g(F, 'Field Credentials', text(dx + 328, fy, 'Credentials / sandbox key', { size: 16, fill: '#FFFFFF' }) + sel(dx + 328, fy + 10, 296, '••••••••-7F2A · sandbox', { plain: true }));
      fy += 80;
      dl += text(dx + 16, fy, 'Run certification checks', { size: 16, fill: '#FFFFFF' }) + text(dx + dw - 16, fy, 'started 01:40 · 3 of 5 passed, 1 running', { size: 13, fill: C.t2, anchor: 'end' });
      mark('certChecks', [dx + 16, fy - 18, dw - 32, 16 + 5 * 34 + 14]);
      let ck = '';
      CHECKS.forEach(([n, det, st, t], i) => {
        const y = fy + 16 + i * 34;
        let c = st === 'done' ? circle(dx + 28, y + 12, 9, { fill: '#2E8BFF' }) + icon(F, 'check', dx + 21, y + 5, 14, '#FFFFFF', 3) : st === 'running' ? circle(dx + 28, y + 12, 9, { stroke: C.link, sw: 2, dash: '4 3' }) : circle(dx + 28, y + 12, 9, { stroke: C.t3, sw: 1.5 });
        c += text(dx + 48, y + 17, n, { size: 14, weight: 500, fill: st === 'na' ? C.t2 : '#FFFFFF' }) + text(dx + 140, y + 17, det, { size: 13, fill: C.t2 }) + text(dx + dw - 16, y + 17, t, { size: 12.5, fill: st === 'running' ? C.link : C.t2, anchor: 'end' });
        ck += g(F, 'Check ' + n, c);
      });
      dl += g(F, 'Certification checks NEW', ck);
      fy += 16 + 5 * 34 + 18;
      dl += text(dx + 16, fy, 'The system goes live only after all five checks pass and an estate admin approves it.', { size: 13, fill: C.t2 });
      const byy = dy + dh - 60;
      dl += g(F, 'Dialog buttons', rect(dx + 16.5, byy + 0.5, 139, 43, { r: 7.5, stroke: '#8B8B8B' }) + text(dx + 86, byy + 29, 'Cancel', { size: 20, weight: 700, fill: C.t3, anchor: 'middle' }) + rect(dx + 164, byy, dw - 180, 44, { r: 8, fill: C.blue }) + text(dx + 164 + (dw - 180) / 2, byy + 29, 'Add system', { size: 20, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
      mark('dialog', [dx, dy, dw, dh]);
      // caption + connector catalogue
      let cap = icon(F, 'link', 892, 876, 18, BLUE, 2);
      wrap('Open API and SDK: partners connect through the same connector framework, and these five checks run in the partner sandbox before a system goes live.', 600, 13.5).forEach((l, i) => { cap += text(920, 890 + i * 19, l, { size: 13.5, fill: C.t2 }); });
      cap += text(892, 950, 'CONNECTOR CATALOGUE · 6 PROTOCOLS', { size: 12, weight: 700, ls: 1.2, fill: C.t2 });
      let cx = 892, cy = 962;
      for (const t of ['ONVIF Profile S/T', 'OSDP v2', 'AgilFence native', 'LiDAR SDK', 'SIP', 'REST API']) { const cw = textWidth(t, 12.5, 500) + 24; if (cx + cw > 1540) { cx = 892; cy += 34; } cap += rect(cx, cy, cw, 26, { r: 13, fill: C.devRow, stroke: '#4A505B' }) + text(cx + 12, cy + 17.5, t, { size: 12.5, weight: 500, fill: C.t1 }); cx += cw + 8; }
      return s + detailPane(F, BLUE, rect(860, 198, 700, 831, { fill: '#000000', fo: 0.3 })) + g(F, 'Add third-party system dialog NEW', dl) + g(F, 'Open API caption NEW', cap);
    },
  });
}

// ---------- MS-06 · Estate report ----------
const WEEK = [['Changi Main', [3, 11, 6]], ['Airfreight Centre', [0, 3, 2]], ['Seletar Airport', [0, 2, 1]], ['Changi East', [0, 1, 0]], ['Fuel farm', [0, 1, 1]]];
const SOURCES = [['CCTV / video analytics', 142], ['Access control', 96], ['AgilFence', 31], ['LiDAR', 18], ['Other', 12], ['Intercom', 9]];
const COMPLIANCE = [['Changi Airport · Main', 'Compliant · v3', GREEN, 'acknowledged 13 Oct'], ['Changi Airfreight Centre', 'Compliant · v3', GREEN, 'acknowledged 13 Oct'], ['Seletar Airport', 'Compliant · v3 + 1 local step', BLUE, 'override approved 12 Oct'], ['Changi East', 'Onboarding', GREY, 'baseline applies after certification'], ['Fuel farm', 'Compliant · v3', GREEN, 'acknowledged 13 Oct']];
const RECENT = [
  ['Seletar Airport', 'Fence Sector 2 · Seg 2-07', 'PER-S02', 'Warning', 'Today, 02:20:14', 'Closed', 'Faizal R. · 02:41:10 · local'],
  ['Changi Main', 'Fence Sector 5 · Seg 5-14', 'PER-005', 'Critical', 'Today, 02:14:58', 'Closed', 'Nurul A. · 02:44:20'],
  ['Changi Main', 'Staff Door D-214', 'TGT-214', 'Critical', 'Today, 02:14:52', 'Open', '—'],
  ['Changi Main', 'T1 Door C2', 'IDS-207', 'Warning', 'Today, 02:13:20', 'Open', '—'],
  ['Airfreight Centre', 'Dock 7 gate', 'IDS-311', 'Info', 'Today, 01:52:30', 'Closed', 'Nurul A. · 02:10:15'],
  ['Fuel farm', 'Fence Sector F1 · Seg 1-03', 'PER-F01', 'Warning', 'Today, 00:41:08', 'Closed', 'Nurul A. · 00:58:40 · wind'],
];
export function report() {
  return govPage('MS-06 · Estate Governance · Estate report · incidents, alarms, compliance, health, coverage across sites', 3, {
    controls: F => {
      mark('exportButton', [1312, 135, 232, 38]);
      return rect(1100, 135, 200, 38, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'clock', 1110, 145, 18, C.t2, 2) + text(1136, 160, 'This week', { size: 16, fill: '#FFFFFF' }) + poly([[1275, 151], [1285, 151], [1280, 157]], { fill: C.t2 }) +
        g(F, 'Button Export estate report NEW', rect(1312, 135, 232, 38, { r: 6, fill: C.tabOn }) + icon(F, 'download', 1326, 145, 18, '#FFFFFF', 2.2) + text(1352, 160, 'Export estate report', { size: 16, weight: 700, fill: '#FFFFFF' }));
    },
    body: F => {
      const tile = (key, [x, y, w, h], title, sub, body) => { mark(key, [x, y, w, h]); return g(F, 'Tile ' + title + ' NEW', rect(x, y, w, h, { r: 12, fill: '#2A303A' }) + text(x + 16, y + 30, title, { size: 16, weight: 700, fill: '#FFFFFF' }) + (sub ? text(x + w - 16, y + 30, sub, { size: 12.5, fill: C.t2, anchor: 'end' }) : '') + body(x, y, w, h)); };
      // one hue per job: severity colours for the severity stack, one blue ramp for magnitude, amber only for the fence
      const stack = (x, y, w) => {
        const max = Math.max(...WEEK.map(([, v]) => v[0] + v[1] + v[2])), bx = x + 140, bw = w - 140 - 60, bh = 14;
        let o = '', lx = x + 16;
        [['Critical', C.crit], ['Warning', C.warn], ['Info', C.info]].forEach(([l, c]) => { o += rect(lx, y + 42, 10, 10, { r: 2, fill: c }) + text(lx + 15, y + 51, l, { size: 12, fill: C.t2 }); lx += 15 + textWidth(l, 12) + 14; });
        WEEK.forEach(([lab, vals], i) => {
          const yy = y + 76 + i * 34, tot = vals[0] + vals[1] + vals[2];
          o += text(x + 16, yy + 12, lab, { size: 13, fill: C.t1 });
          let cx = bx;
          vals.forEach((n, k) => { if (!n) return; const ww = Math.max(0, n / max * bw - 2), col = [C.crit, C.warn, C.info][k]; o += rect(cx, yy, ww, bh, { r: 2, fill: col }); if (ww >= 14) o += text(cx + ww / 2, yy + 11, String(n), { size: 11, weight: 500, fill: k === 1 ? '#111111' : '#FFFFFF', anchor: 'middle' }); cx += ww + 2; });
          o += text(cx + 6, yy + 12, String(tot), { size: 13, weight: 500, fill: C.t1 });
        });
        return g(F, 'Stacked bars', o);
      };
      const bars = (x, y, w, rows, o = {}) => {
        const max = Math.max(...rows.map(r => r.v)), lw = o.lw || 150, bx = x + 16 + lw, bw = w - 32 - lw - (o.right ? o.rightW || 150 : 70), bh = 14;
        let s = '';
        rows.forEach((r, i) => {
          const yy = y + o.y0 + i * (o.rh || 30), ww = r.v > 0 ? Math.max(3, r.v / max * bw) : 0;
          s += text(x + 16, yy + 12, r.label, { size: 13, fill: C.t1 });
          if (ww) s += rect(bx, yy, ww, bh, { r: 2, fill: o.col || BLUE, fo: o.ramp ? 1 - i * 0.11 : 1 }) + text(bx + ww + 6, yy + 12, r.text ?? String(r.v), { size: 13, weight: 500, fill: C.t1 });
          else s += text(bx, yy + 12, r.text, { size: 13, fill: C.t2 });
          if (r.right) s += text(x + w - 16, yy + 12, r.right, { size: 12.5, fill: C.t2, anchor: 'end' });
        });
        return g(F, 'Bars', s);
      };
      let s = tile('tileIncidents', [60, 262, 480, 262], 'Incidents by site and severity', 'this week · open and closed', (x, y, w) => stack(x, y, w));
      s += tile('tileAlarms', [560, 262, 480, 262], 'Alarms by source system', 'this week · 308 alarms', (x, y, w) => bars(x, y, w, SOURCES.map(([label, v]) => ({ label, v })), { y0: 56, rh: 32, lw: 160, ramp: true }));
      s += tile('tileCompliance', [1060, 262, 480, 262], 'SOP baseline compliance by site', 'baseline v3 · 6 estate SOPs', (x, y, w) => {
        let o = '';
        COMPLIANCE.forEach(([site, st, col, det], i) => { const yy = y + 56 + i * 40; const pw = textWidth(st, 12, 500) + 14; o += text(x + 16, yy + 12, site, { size: 13, weight: 500, fill: '#FFFFFF' }) + text(x + 16, yy + 30, det, { size: 12, fill: C.t2 }) + pill(F, x + w - 16 - pw, yy, st, col, { size: 12, h: 20, pad: 14 }).svg; if (i < 4) o += line(x + 16, yy + 37, x + w - 16, yy + 37, { stroke: '#3A3F47' }); });
        return g(F, 'Compliance rows', o);
      });
      s += tile('tileHealth', [60, 540, 480, 222], 'Device health by site', 'online now · 7,032 of 7,045', (x, y, w) => bars(x, y, w, SITES.map(st => ({ label: st.short.replace(' · T5 site', ''), v: st.online, text: fmt(st.online), right: `${st.offline} offline` })), { y0: 52, rh: 30, lw: 130, right: true }));
      s += tile('tileFence', [60, 778, 480, 222], 'AgilFence coverage by site', 'km monitored · 30.1 km in all', (x, y, w) => bars(x, y, w, SITES.map(st => ({ label: st.short.replace(' · T5 site', ''), v: st.fence ? st.fence.km : 0, text: st.fence ? `${st.fence.km} km` : 'not fitted', right: st.fence ? `${st.fence.alarm} in alarm · ${st.fence.fault} fault` : '—' })), { y0: 52, rh: 30, lw: 130, right: true, rightW: 200, col: AMBER }));
      s += tile('tileRecent', [560, 540, 980, 460], 'Recent estate incidents', '6 most recent · all sites · newest first', (x, y, w, h) => {
        const cols = [['Site', 16], ['Incident', 170], ['Code', 370], ['Severity', 450], ['Time', 540], ['Status', 680], ['Closed by', 760]];
        let o = rect(x + 16, y + 50, w - 32, 30, { fill: '#262A31' }) + cols.map(([c, cx]) => text(x + cx + (cx === 16 ? 0 : 0), y + 70, c, { size: 13, weight: 500, fill: '#FFFFFF' })).join('');
        RECENT.forEach(([site, inc, code, sev, t, st, by], i) => {
          const yy = y + 80 + i * 50;
          let row = text(x + 16, yy + 30, site, { size: 13, fill: '#FFFFFF' }) + text(x + 170, yy + 30, inc, { size: 13, fill: '#FFFFFF' }) + text(x + 370, yy + 30, code, { size: 13, fill: '#FFFFFF' });
          row += pill(F, x + 450, yy + 15, sev, SEVC[sev], { size: 12, h: 20, pad: 14 }).svg + text(x + 540, yy + 30, t, { size: 12.5, fill: '#FFFFFF' });
          row += pill(F, x + 680, yy + 13, st, st === 'Open' ? C.open : C.closed, { size: 12, h: 24, r: 7, pad: 18 }).svg + text(x + 760, yy + 30, by, { size: 12.5, fill: by === '—' ? C.t2 : '#FFFFFF' });
          row += line(x + 16, yy + 50, x + w - 16, yy + 50, { stroke: '#3A3F47' });
          o += g(F, 'Incident row ' + code, row);
        });
        o += text(x + 16, y + h - 18, 'Showing 6 of 31 incidents this week · open items stay with their site until closed · full list in Incident Management', { size: 12.5, fill: C.t2 });
        return g(F, 'Recent incidents table', o);
      });
      s += text(60, 1018, 'Illustrative figures', { size: 12.5, fill: C.t2 }) + text(1540, 1018, 'Period: this week · Mon 12 – Sun 18 Oct 2026 · generated Today, 02:50', { size: 12.5, fill: C.t2, anchor: 'end' });
      return g(F, 'Report tiles NEW', s);
    },
  });
}

export const MS_FRAMES = [
  ['MS-01-estate-overview', estateOverview],
  ['MS-02-site-seletar-local-autonomy', siteSeletar],
  ['MS-03-governance-security-baseline', baseline],
  ['MS-04-governance-roles-access', roles],
  ['MS-05-governance-systems-connectors', connectors],
  ['MS-06-governance-estate-report', report],
];
