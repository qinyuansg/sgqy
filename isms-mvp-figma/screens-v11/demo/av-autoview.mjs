// AgilFence operator experience v2 (DEMOFLOW-V2.md): the alarm view opens itself, the operator verifies, confirms,
// dispatches and submits; the duty manager signs off on his own console. States AV-S1 … AV-S10c and the
// alternative path AV-A1, AV-A2, one frame per state, V11 shell (header, Real Time Alerts, right panel).
// NEW in this flow: Alarm view in the centre (live tile, replay + thermal strip, map inset), Incident progress rail,
// Verification / Response / Close tabs in the right panel, lockdown status pill, sign-off dialog.
// Pressed states only on the click frames; no cursors (the film draws its own). All data illustrative.
import fs from 'fs';
import path from 'path';
import { Frame, f, rect, circle, line, pathEl, poly, text, rich, icon, g, textWidth, wrap } from '../../lib/svg.mjs';
import { C, W, H, asset, pill, alertsPanel, deviceStatus, scene, modelToggle } from '../../lib/v11.mjs';
import { camera, clayAirport } from '../../lib/clay.mjs';
import { toast } from '../../lib/fence.mjs';
import { btnState, confirmToast, plainCards } from '../../lib/demo.mjs';
import { ALERTS, BYK } from '../data.mjs';

const cctv = n => asset('cctv/' + n + '.jpg');
let META = null;
const box = (sc, k) => { if (!META) META = JSON.parse(fs.readFileSync(path.join(asset.dir, 'cctv/meta.json'), 'utf8')); return META[sc].boxes[k]; };

// ---------- anchors (frame px rects the film points at) ----------
export const ANCHORS = {};
let CUR = null;
export const setFrame = name => { CUR = name; };
const mark = (k, r) => { if (CUR) (ANCHORS[CUR] = ANCHORS[CUR] || {})[k] = r.map(v => Math.round(v * 10) / 10); };

// ---------- tokens (V11 colours only; amber = AgilFence sensor content + exception banner) ----------
const GREEN = C.green, GREEN_T = '#9BE27A', BLUE = C.link, AMBER = C.warn, RED = C.crit, GREY = '#6B7280';
const CARD = '#3A3F49';   // card on the tab body
const OWNER = 'Nurul A.', DM = 'Daniel L.';

// ---------- small parts ----------
// status dot: done (green check) / current (blue ring) / pending (grey ring) / lost (grey x)
function dot(F, cx, cy, s, r = 7) {
  if (s === 'done') return circle(cx, cy, r, { fill: GREEN }) + icon(F, 'check', cx - r + 1.5, cy - r + 1.5, 2 * r - 3, '#FFFFFF', 2.6);
  if (s === 'current') return circle(cx, cy, r, { fill: '#0E2440', stroke: BLUE, sw: 2 }) + circle(cx, cy, r * 0.38, { fill: BLUE });
  if (s === 'red') return circle(cx, cy, r, { fill: RED }) + circle(cx, cy, r * 0.38, { fill: '#FFFFFF' });
  if (s === 'skip') return circle(cx, cy, r, { stroke: GREY, sw: 1.5 }) + line(cx - r * 0.45, cy, cx + r * 0.45, cy, { stroke: '#9BA1AC', sw: 1.6 });
  return circle(cx, cy, r, { stroke: '#7D8490', sw: 1.5, dash: '2.5 2' });
}
// small rounded tag
function tag(F, x, y, label, o = {}) {
  const size = o.size || 11.5, w = textWidth(label, size, 500) + 14, h = o.h || 19, k = o.kind || 'auth';
  const st = {
    auth: { fill: '#2E8BFF', fo: 0.24, tc: '#B9D9FF' },
    atc: { fill: '#1D232C', fo: 0.9, tc: '#FFFFFF', stroke: '#9BA1AC' },
    ok: { fill: GREEN, fo: 0.22, tc: GREEN_T },
    found: { fill: C.info, fo: 0.25, tc: '#BFEFF6' },
    unknown: { fill: '#1D232C', fo: 0.6, tc: '#BDBDBD', stroke: '#9BA1AC', dash: '3 2' },
    crit: { fill: RED, fo: 1, tc: '#FFFFFF' },
    blue: { fill: BLUE, fo: 0.22, tc: '#CFE8FF' },
    grey: { fill: '#FFFFFF', fo: 0.12, tc: '#DDE1E8' },
  }[k];
  const xx = o.right ? x - w : x;
  return { svg: rect(xx, y, w, h, { r: 6, fill: st.fill, fo: st.fo, stroke: st.stroke, sw: 1, dash: st.dash }) + text(xx + 7, y + h / 2 + size * 0.36, label, { size, weight: 500, fill: st.tc }), w, x: xx };
}
// wrap that measures with weight
const lines = (s, w, size, wt = 400) => wrap(s, w, size, wt);

// ---------- header: V11 header, search 'Search…', lockdown status pill (separate from the button), user chip ----------
function header(F, o = {}) {
  const user = o.user || [OWNER, 'Operator'];
  let s = g(F, 'Logo', `<image x="40" y="40" width="50" height="46" preserveAspectRatio="xMidYMid slice" href="${asset('logo_s.png')}" xlink:href="${asset('logo_s.png')}"/>`);
  let e = rect(119, 40, 257, 46, { r: 8, fill: C.red });
  e += poly([[147, 51], [158, 62], [147, 73], [136, 62]], { fill: '#FFFFFF' }) + rect(145.8, 55.5, 2.4, 9, { fill: C.red }) + rect(145.8, 66.5, 2.4, 2.6, { fill: C.red });
  e += text(163, 70, 'Emergency Lockdown', { size: 20, weight: 700, fill: '#FFFFFF' });
  s += g(F, 'Button Emergency Lockdown', e);
  // right to left: Incident Management, user chip, lockdown status, search
  // one chip width for both consoles (operator and duty manager), so the header grid never moves between frames
  const uw = Math.max(...[[OWNER, 'Operator'], [DM, 'Duty manager']].map(([a, b]) => Math.max(textWidth(a, 14, 700), textWidth(b, 12, 400)))) + 46, ux = 1095 - uw;
  let u = rect(ux, 43, uw, 40, { r: 8, fill: '#1D232C', stroke: '#4A505B' }) + circle(ux + 18, 63, 11, { fill: user[1] === 'Operator' ? '#2E5DA8' : '#5A4A2E' }) + icon(F, 'user', ux + 10, 55, 16, '#FFFFFF', 2);
  u += text(ux + 36, 60, user[0], { size: 14, weight: 700, fill: '#FFFFFF' }) + text(ux + 36, 76, user[1], { size: 12, fill: C.t2 });
  s += g(F, 'User chip NEW', u);
  const lab = 'Lockdown: not active', lw = textWidth(lab, 14, 500) + 38, lx = ux - 10 - lw;
  s += g(F, 'Lockdown status NEW', rect(lx, 43, lw, 40, { r: 20, fill: '#1D232C', stroke: '#5A606B', sw: 1.2 }) + circle(lx + 17, 63, 5, { fill: '#9BA1AC' }) + text(lx + 29, 68, lab, { size: 14, weight: 500, fill: C.t1 }));
  mark('lockdownStatus', [lx, 43, lw, 40]);
  const sx1 = lx - 10;
  let b = rect(440, 43, sx1 - 440, 40, { r: 8, fill: C.search }) + rect(440, 43, 209, 40, { r: 8, fill: C.locSeg }) + rect(640, 43, 9, 40, { fill: C.locSeg });
  const w0 = textWidth('Main Airport', 16, 500);
  b += text(450, 69, 'Main Airport', { size: 16, weight: 500, fill: '#FFFFFF' }) + text(450 + w0 + 7, 68, '›', { size: 14, fill: C.t3 }) + text(450 + w0 + 22, 69, 'Airfield', { size: 16, weight: 500, fill: '#FFFFFF' });
  b += poly([[627, 60], [637, 60], [632, 66]], { fill: '#FFFFFF' });
  b += icon(F, 'search', 660, 53, 20, C.t1, 2) + text(689, 69, 'Search…', { size: 16, fill: C.t3 });
  s += g(F, 'Search bar', b);
  s += g(F, 'Button Incident Management', rect(1103.5, 40.5, 256, 45, { r: 7.5, fill: '#000000', stroke: '#8B8B8B' }) + icon(F, 'extLink', 1121, 51, 22, '#FFFFFF', 2) + text(1150, 70, 'Incident Management', { size: 20, weight: 700, fill: '#FFFFFF' }));
  return g(F, 'Header', s);
}

// ---------- alert list ----------
// other alerts on the list, in clock times only: [time, description] for the main night and the A-path night (01:2x)
const OTHER = {
  watch: [['02:12', 'Possible watchlist match, loitering since 01:49'], ['01:12', 'Possible watchlist match, loitering since 00:49']],
  spoof: [['02:13', 'Same card used at T3 A17 at 02:09'], ['01:13', 'Same card used at T3 A17 at 01:09']],
  fight: [['02:11', 'Fight detected, crowd forming'], ['01:11', 'Fight detected, crowd forming']],
  bag: [['02:04', 'Unattended bag since 01:52, owner located'], ['01:04', 'Unattended bag since 00:52, owner located']],
  overstay: [['01:45', 'In restricted zone since 22:05'], ['00:45', 'In restricted zone since 21:05']],
};
function cardList(o) {
  // fence card text follows the state; it leaves the list once resolved or closed
  const fence = o.fence === false ? null : { ...BYK.fence, desc: o.fence || BYK.fence.desc, time: 'Now' };
  const others = ALERTS.filter(a => a.key !== 'fence').map(a => OTHER[a.key] ? { ...a, time: OTHER[a.key][o.alt ? 1 : 0][0], desc: OTHER[a.key][o.alt ? 1 : 0][1] } : a);
  return plainCards([...(fence ? [fence] : []), ...others], fence && o.sel !== false ? 'fence' : null);
}
const counts = crit => [[crit + ' Critical', C.crit], ['4 Warnings', C.warn], ['1 Info', C.info]];

// ---------- centre: Incident progress rail (NEW) ----------
const RX = 388, RW = 500, RY = 118, RH = 142;
function rail(F, st) {
  let s = rect(RX, RY, RW, RH, { r: 14, fill: C.panel, fo: 0.92, stroke: '#2C3440' });
  s += text(RX + 16, RY + 23, 'Incident progress', { size: 13, weight: 700, fill: '#FFFFFF' }) + text(RX + RW - 16, RY + 23, st.ref, { size: 12, fill: C.t2, anchor: 'end' });
  // four phases
  const cw = (RW - 32) / 4, py = RY + 34;
  st.phases.forEach((p, i) => {
    const cx = RX + 16 + i * cw, col = { done: GREEN, current: BLUE }[p.state] || '#4A505B';
    s += rect(cx, py, cw - 6, 4, { r: 2, fill: col });
    s += dot(F, cx + 8, py + 20, p.state, 8);
    s += text(cx + 22, py + 25, p.name, { size: 13, weight: 700, fill: p.state === 'pending' ? C.t2 : '#FFFFFF' });
    s += text(cx, py + 44, p.sub, { size: 12, weight: p.state === 'current' ? 500 : 400, fill: p.state === 'done' ? GREEN_T : p.state === 'current' ? '#CFE8FF' : C.t2 });
  });
  // chain of states of the current phase (wraps, at most 3 lines)
  const cy0 = RY + 96;
  s += line(RX + 16, cy0 - 8, RX + RW - 16, cy0 - 8, { stroke: '#3A4250' });
  let x = RX + 16, y = cy0 + 6, ch = '';
  const maxX = RX + RW - 14;
  let nl = 1;
  st.chain.forEach((c, i) => {
    const tw = textWidth(c.t, 12, 400) + (c.time ? 5 + textWidth(c.time, 12, 700) : 0), w = 14 + tw;
    if (i > 0) { if (x + 16 + w > maxX) { x = RX + 16; y += 16; nl++; } else { ch += icon(F, 'chevR', x + 2, y - 5, 10, '#7D8490', 2); x += 16; } }
    ch += dot(F, x + 5, y, c.s || 'done', 5);
    ch += text(x + 14, y + 4, c.t, { size: 12, fill: c.s === 'pending' ? C.t2 : C.t1 });
    if (c.time) ch += text(x + 14 + textWidth(c.t, 12) + 5, y + 4, c.time, { size: 12, weight: 700, fill: '#FFFFFF' });
    x += w;
  });
  if (nl > 3) console.warn('rail chain overflows', CUR, nl);
  s += ch;
  mark('progressRail', [RX, RY, RW, RH]);
  if (st.chainKey) mark(st.chainKey, [RX + 10, cy0 - 6, RW - 20, y - cy0 + 18]);
  return g(F, 'Incident progress rail NEW', s);
}

// ---------- centre: Alarm view (NEW) ----------
const AX = 388, AY = RY + RH + 8, AW = 500, AH = 1029 - AY;
const TX = AX + 8, TW = AW - 16;          // tile column
const LT = { x: TX, y: AY + 40, w: TW, h: 290 };
const ST = { y: LT.y + LT.h + 8, h: 112 };
const MP = { y: ST.y + ST.h + 8 };
MP.h = AY + AH - 8 - MP.y;

// image placed to cover a rect (focus + zoom), optional boxes and a patch (copy of the image shifted, to clear a region)
function cover(F, x, y, w, h, cam) {
  const [sw0, sh0] = [1280, 720];
  const sc = Math.max(w / sw0, h / sh0) * (cam.zoom || 1), iw = sw0 * sc, ih = sh0 * sc;
  const [fx, fy] = cam.focus || [0.5, 0.5];
  let ox = x + w / 2 - fx * iw, oy = y + h / 2 - fy * ih;
  ox = Math.min(x, Math.max(x + w - iw, ox)); oy = Math.min(y, Math.max(y + h - ih, oy));
  const img = (dx = 0) => `<image x="${f(ox - dx * sc)}" y="${f(oy)}" width="${f(iw)}" height="${f(ih)}" preserveAspectRatio="none" href="${cam.href}" xlink:href="${cam.href}"/>`;
  let s = img();
  if (cam.patch) { const [px, py, pw, ph] = cam.patch.box; const cp = F.clip(`<rect x="${f(ox + px * sc)}" y="${f(oy + py * sc)}" width="${f(pw * sc)}" height="${f(ph * sc)}"/>`); s += `<g clip-path="${cp}">${img(cam.patch.dx)}</g>`; }
  for (const b of cam.boxes || []) {
    const [bx, by, bw, bh] = b.box, X = ox + bx * sc, Y = oy + by * sc, col = b.col || RED;
    s += rect(X, Y, bw * sc, bh * sc, { r: 3, stroke: col, sw: 2 });
    if (b.label) {
      const lw = textWidth(b.label, 12, 500) + 12, ly = b.top ? Math.max(y + 34, Y - 22) : Math.min(Y + bh * sc + 3, y + h - 24), lx = Math.max(x + 4, Math.min(X + (b.dx || 0), x + w - lw - 4));
      s += rect(lx, ly, lw, 19, { r: 3, fill: col }) + text(lx + 6, ly + 14, b.label, { size: 12, weight: 500, fill: '#FFFFFF' });
    }
  }
  return s;
}
// tile with a top bar (camera name + chips) — chips at 11 px (kit minimum)
function tile(F, x, y, w, h, cam, o = {}) {
  const clip = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="6"/>`);
  let inner = rect(x, y, w, h, { fill: '#05070A' }) + (cam.href ? cover(F, x, y, w, h, cam) : '');
  if (cam.empty) inner += cam.empty;
  const bh = o.bar || 30;
  inner += rect(x, y, w, bh, { fill: '#000000', fo: 0.55 }) + icon(F, cam.icon || 'cctv', x + 9, y + (bh - 16) / 2, 16, '#FFFFFF', 1.7) + text(x + 31, y + bh / 2 + 4.5, cam.label, { size: o.ls || 13, weight: 500, fill: '#FFFFFF' });
  let cx = x + w - 7;
  for (const [lab, col] of [...(cam.chips || [])].reverse()) {
    const live = lab === 'LIVE', cw = textWidth(lab, 11, 700) + (live ? 22 : 14);
    cx -= cw;
    inner += rect(cx, y + (bh - 19) / 2, cw, 19, { r: 9.5, fill: col }) + (live ? circle(cx + 9, y + bh / 2, 3, { fill: '#FFFFFF' }) : '') + text(cx + (live ? 15 : 7), y + bh / 2 + 4, lab, { size: 11, weight: 700, fill: '#FFFFFF' });
    cx -= 5;
  }
  if (cam.ts) inner += rect(x + 8, y + h - 26, textWidth(cam.ts, 12, 500) + 14, 19, { r: 4, fill: '#000000', fo: 0.6 }) + text(x + 15, y + h - 12, cam.ts, { size: 12, weight: 500, fill: '#FFFFFF' });
  if (o.banner) inner += o.banner;
  return g(F, 'Tile ' + cam.label, `<g clip-path="${clip}">${inner}</g>` + rect(x, y, w, h, { r: 6, stroke: o.ring || '#3E4655', sw: o.ring ? 2 : 1 }));
}

// map inset: schematic plan of Sector 5 (fence line, segments, cameras, LiDAR, track trail, runway distance)
function mapInset(F, x, y, w, h, m) {
  const k = 1.4, ox = x + w * 0.4, oy = y + 60;
  const P = (X, Y) => [ox + X * k, oy + Y * k];
  const clip = F.clip(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="8"/>`);
  let s = rect(x, y, w, h, { fill: '#0E131A' });
  for (let gx = -150; gx <= 250; gx += 25) s += line(...P(gx, -60), ...P(gx, 200), { stroke: '#2A62C9', so: 0.13 });
  for (let gy = -50; gy <= 200; gy += 25) s += line(...P(-160, gy), ...P(260, gy), { stroke: '#2A62C9', so: 0.13 });
  s += rect(x, y, w, oy - y, { fill: '#000000', fo: 0.28 });   // outside the fence
  // perimeter road
  s += rect(x, P(0, 19)[1], w, 12 * k, { fill: '#232A34' }) + line(x, P(0, 25)[1], x + w, P(0, 25)[1], { stroke: '#5A606B', dash: '6 6' });
  // runway 02L (edge 130 m from segment 5-14)
  const [, ry] = P(0, 130);
  s += rect(x, ry, w, h, { fill: '#2B313B' }) + line(x, ry, x + w, ry, { stroke: '#DDE1E8', so: 0.6, sw: 1.5 }) + line(x, ry + 30, x + w, ry + 30, { stroke: '#DDE1E8', so: 0.5, sw: 2, dash: '16 12' });
  s += text(x + 12, ry + 22, 'Runway 02L', { size: 12, weight: 700, fill: '#DDE1E8' });
  if (m.hold) s += tag(F, x + 12 + textWidth('Runway 02L', 12, 700) + 8, ry + 8, m.hold, { kind: m.holdKind || 'crit', size: 11 }).svg;
  // fence + AgilFence cable (amber dots) + segment ticks
  s += line(x, oy, x + w, oy, { stroke: '#9FC3FF', so: 0.75, sw: 2 });
  for (let X = -150; X <= 260; X += 5) { const [dx] = P(X, 0); if (dx > x && dx < x + w) s += circle(dx, oy, 1.4, { fill: AMBER, fo: 0.75 }); }
  for (let kk = 10; kk <= 18; kk++) {
    const [sx] = P((kk - 14) * 40 - 20, 0);
    if (sx > x && sx < x + w) s += line(sx, oy - 6, sx, oy + 6, { stroke: '#9FC3FF', so: 0.8, sw: 1.2 });
    const [lx] = P((kk - 14) * 40, 0);
    if (lx > x + 20 && lx < x + w - 20 && kk !== 14) s += text(lx, oy - 9, '5-' + kk, { size: 11, weight: 500, fill: '#9FC3FF', anchor: 'middle' });
  }
  const [a0] = P(-20, 0), [a1] = P(20, 0);
  if (m.alarm !== false) s += line(a0, oy, a1, oy, { stroke: RED, sw: 10, so: 0.3 }) + line(a0, oy, a1, oy, { stroke: RED, sw: 4 });
  else s += line(a0, oy, a1, oy, { stroke: GREEN, sw: 4 });
  s += rect(ox - 34, oy - 30, 68, 19, { r: 5, fill: m.alarm === false ? GREEN : RED }) + text(ox, oy - 16, 'AGF 5-14', { size: 11, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  // works area (alternative path)
  if (m.works) { const [w0, w1] = [P(-16, -6), P(16, 9)]; s += rect(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1], { r: 3, fill: C.info, fo: 0.16, stroke: C.info, sw: 1.2, dash: '4 3' }); }
  // dimension 5-14 → runway
  const [dx0, dy0] = P(-12, 3), [, dy1] = P(-12, 130);
  s += line(dx0, dy0, dx0, dy1 - 1, { stroke: '#DDE1E8', so: 0.7, sw: 1.2, dash: '3 3' }) + poly([[dx0 - 4, dy1 - 8], [dx0 + 4, dy1 - 8], [dx0, dy1 - 1]], { fill: '#DDE1E8', fo: 0.8 });
  const dl = '130 m to runway', dlw = textWidth(dl, 11, 500) + 12, dly = dy0 + (dy1 - dy0) * 0.78;
  s += rect(dx0 - dlw / 2, dly - 10, dlw, 19, { r: 5, fill: '#1D232C', stroke: '#9BA1AC', sw: 1 }) + text(dx0, dly + 4, dl, { size: 11, weight: 500, fill: '#FFFFFF', anchor: 'middle' });
  // LiDAR L-5B with coverage (left out when a toast covers that corner of the map)
  const [lx, ly] = P(-40, 62);
  const lidarSvg = circle(lx, ly, 46 * k, { stroke: '#55D6E6', so: 0.28, sw: 1, dash: '4 4', fill: '#55D6E6', fo: 0.04 }) +
    circle(lx, ly, 11, { fill: '#1D232C', stroke: '#55D6E6', sw: 1.5 }) + icon(F, 'radar', lx - 7.5, ly - 7.5, 15, '#FFFFFF', 1.8) + text(lx, ly + 26, 'LiDAR L-5B', { size: 11, weight: 500, fill: '#BFEFF6', anchor: 'middle' });
  s += LIDAR_MARK;
  // cameras + cones
  const tgt = m.tgt || [0, 5];
  for (const c of m.cams) {
    const [cx, cy] = P(c.X, c.Y), act = c.state === 'active', lost = c.state === 'lost';
    if (act) {
      const [tx, ty] = P(...tgt), ang = Math.atan2(ty - cy, tx - cx), d = Math.hypot(tx - cx, ty - cy) * 1.2, hw = 0.26;
      s += poly([[cx, cy], [cx + d * Math.cos(ang - hw), cy + d * Math.sin(ang - hw)], [cx + d * Math.cos(ang + hw), cy + d * Math.sin(ang + hw)]], { fill: '#55D6E6', fo: 0.2, stroke: '#55D6E6', so: 0.7, sw: 1 });
    }
    const col = lost ? GREY : act ? '#55D6E6' : '#7FB2FF';
    s += circle(cx, cy, 11, { fill: '#1D232C', stroke: col, sw: 1.5 }) + icon(F, 'cctv', cx - 7.5, cy - 7.5, 15, lost ? '#9BA1AC' : '#FFFFFF', 1.7);
    if (lost) s += circle(cx + 9, cy - 9, 6, { fill: GREY }) + icon(F, 'x', cx + 5, cy - 13, 8, '#FFFFFF', 2);
    const lab = c.id + (c.note ? ' · ' + c.note : ''), lw = textWidth(lab, 11, 500) + 10;
    let lx2 = c.place === 'left' ? cx - 15 - lw : c.place === 'below' ? cx - lw / 2 : cx + 15, ly2 = c.place === 'below' ? cy + 14 : cy - 9;
    lx2 = Math.max(x + 4, Math.min(x + w - lw - 4, lx2));
    s += rect(lx2, ly2, lw, 18, { r: 4, fill: '#1D232C', fo: 0.9 }) + text(lx2 + 5, ly2 + 13, lab, { size: 11, weight: 500, fill: lost ? '#BDBDBD' : '#FFFFFF' });
  }
  // track trail T-07 (LiDAR)
  if (m.track) {
    const pts = m.track.map(p => P(...p));
    pts.forEach(([px, py], i) => { if (i < pts.length - 1) s += circle(px, py, 2.6, { fill: RED, fo: 0.35 + 0.5 * i / pts.length }); });
    if (pts.length > 1) s += pathEl('M' + pts.map(p => p.map(f).join(' ')).join(' L'), { stroke: RED, so: 0.55, sw: 1.5, dash: '3 3' });
    const [hx, hy] = pts[pts.length - 1];
    s += circle(hx, hy, 11, { fill: RED, fo: 0.25 }) + circle(hx, hy, 6, { fill: RED, stroke: '#FFFFFF', sw: 1.5 });
    const tl = m.trackLabel || 'T-07', tlw = textWidth(tl, 11, 700) + 12, tx0 = m.trackLeft ? hx - 10 - tlw : hx + 10;
    s += rect(tx0, hy + 6, tlw, 18, { r: 4, fill: RED }) + text(tx0 + 6, hy + 19, tl, { size: 11, weight: 700, fill: '#FFFFFF' });
  }
  if (m.lidar === false) s = s.replace(LIDAR_MARK, ''); else s = s.replace(LIDAR_MARK, lidarSvg);
  if (m.people) for (const p of m.people) { const [px, py] = P(...p); s += circle(px, py, 5.5, { fill: C.info, stroke: '#FFFFFF', sw: 1.5 }); }
  if (m.peopleLabel) { const [px, py] = P(0, 9); const lw = textWidth(m.peopleLabel, 11, 500) + 12; s += rect(px - lw / 2, py + 4, lw, 18, { r: 4, fill: '#0E5E68' }) + text(px - lw / 2 + 6, py + 17, m.peopleLabel, { size: 11, weight: 500, fill: '#FFFFFF' }); }
  // units on the ground
  for (const u of m.units || []) {
    const [px, py] = P(...u.at), col = u.col || GREEN;
    if (u.offmap) {   // not on the map yet: arrow on the map edge where it will enter, with its label
      s += poly([[x + 3, py - 9], [x + 15, py], [x + 3, py + 9]], { fill: col });
      const lw = textWidth(u.label, 11, 500) + 12; s += rect(x + 20, py - 9, lw, 18, { r: 4, fill: '#1D232C', stroke: col, sw: 1 }) + text(x + 26, py + 4, u.label, { size: 11, weight: 500, fill: '#FFFFFF' });
      continue;
    }
    if (u.from) { const [fx2, fy2] = P(...u.from); s += line(Math.max(x, fx2), fy2, px, py, { stroke: col, sw: 2.5, dash: '7 5' }); }
    if (u.edge) {   // arrives from off-map: arrow on the map edge + origin
      const ey = py; s += poly([[x + 2, ey - 9], [x + 14, ey], [x + 2, ey + 9]], { fill: col });
      const el = u.edge, ew = textWidth(el, 11, 500) + 10; s += rect(x + 4, ey + 12, ew, 18, { r: 4, fill: '#1D232C', fo: 0.9 }) + text(x + 9, ey + 25, el, { size: 11, weight: 500, fill: C.t1 });
    }
    s += circle(px, py, 11, { fill: col, stroke: '#FFFFFF', sw: 1.5 }) + icon(F, u.icon || 'car', px - 7.5, py - 7.5, 15, '#FFFFFF', 1.8);
    const lw = textWidth(u.label, 11, 500) + 12, lx3 = u.left ? px - 15 - lw : px + 15, ly3 = u.below ? py + 13 : u.above ? py - 31 : py - 9;
    s += rect(lx3, ly3, lw, 18, { r: 4, fill: '#1D232C', stroke: col, sw: 1 }) + text(lx3 + 6, ly3 + 13, u.label, { size: 11, weight: 500, fill: '#FFFFFF' });
  }
  // map chrome: title, scale, north
  const tt = 'Map · Sector 5 · north perimeter', ttw = textWidth(tt, 12, 700) + 30;
  s += rect(x + 8, y + 8, ttw, 24, { r: 6, fill: '#1D232C', fo: 0.92 }) + icon(F, 'pin', x + 13, y + 12, 15, '#55D6E6', 2) + text(x + 31, y + 25, tt, { size: 12, weight: 700, fill: '#FFFFFF' });
  s += text(x + w - 12, y + 25, 'Outside', { size: 11, weight: 500, fill: C.t2, anchor: 'end' });
  const sbx = x + w - 92, sby = ry - 8;
  s += line(sbx, sby, sbx + 50 * k, sby, { stroke: '#FFFFFF', sw: 2 }) + line(sbx, sby - 4, sbx, sby + 1, { stroke: '#FFFFFF', sw: 2 }) + line(sbx + 50 * k, sby - 4, sbx + 50 * k, sby + 1, { stroke: '#FFFFFF', sw: 2 }) + text(sbx + 25 * k, sby - 6, '50 m', { size: 11, weight: 500, fill: '#FFFFFF', anchor: 'middle' });
  return g(F, 'Map inset NEW', `<g clip-path="${clip}">${s}</g>` + rect(x, y, w, h, { r: 8, stroke: '#3E4655' }));
}

const LIDAR_MARK = '<!--lidar-->';
const CAMS = {
  climb: (o = {}) => ({ href: cctv('fence_ptz_clean'), label: 'PTZ 7-02 · Live', focus: [0.5, 0.4], boxes: [{ box: box('fence_ptz', 'person'), label: 'Person · climbing' }], ...o }),
  inside: (o = {}) => ({ href: cctv('fence_inside_clean'), label: 'PTZ 7-02 · Live', focus: [0.55, 0.58], boxes: [{ box: box('fence_inside', 'person'), label: 'Person · T-07' }], ...o }),
  ptz703: (o = {}) => ({ href: cctv('thermal_clean'), label: 'PTZ 7-03 · Live · thermal', focus: [0.54, 0.5], boxes: [{ box: box('thermal', 'person'), label: 'Person · T-07' }], ...o }),
  // hand-over at 02:26:30: Patrol 2 officer, the person, Airport Police AP-12 officer and car
  patrol: (o = {}) => ({ href: cctv('fence_handover_clean'), label: 'PTZ 7-03 · Live', focus: [0.5, 0.56], zoom: 1.15, boxes: [{ box: box('fence_handover', 'person'), label: 'Handed to police · AP-12', top: true, dx: -40 }, { box: box('fence_handover', 'officer1'), col: C.blue, label: 'Patrol 2', dx: -30 }, { box: box('fence_handover', 'police'), col: '#2D5BD8', label: 'Police AP-12', dx: 20 }, { box: box('fence_handover', 'vehicle'), col: '#2D5BD8', label: 'AP-12' }], ...o }),
  wide: (o = {}) => ({ href: cctv('fence_wide_clean'), label: 'CAM 7-11 · Live', focus: [0.62, 0.45], zoom: 1.5, boxes: [{ box: box('fence_wide', 'person'), col: C.blue, label: 'Guard posted · 5-14' }], ...o }),
  crew: (o = {}) => ({ href: cctv('fence_crew_clean'), label: 'PTZ 7-02 · Live', focus: [0.55, 0.55], zoom: 1.45, boxes: [{ box: box('fence_crew', 'crew1'), col: '#0E7C8A', label: 'Crew 1 · hi-vis' }, { box: box('fence_crew', 'crew2'), col: '#0E7C8A', label: 'Crew 2 · hi-vis' }], ...o }),
  pre: (o = {}) => ({ href: cctv('fence_pre_clean'), label: 'Replay · CAM 7-11', icon: 'play', focus: [0.6, 0.6], zoom: 1.2, boxes: [{ box: box('fence_pre', 'person') }], ...o }),
  thermal: (o = {}) => ({ href: cctv('thermal_clean'), label: 'Thermal · PTZ 7-02', focus: [0.53, 0.5], zoom: 1.2, boxes: [{ box: box('thermal', 'person') }], ...o }),
  lidar: (o = {}) => ({ href: cctv('lidar_clean'), label: 'LiDAR L-5B · T-07', icon: 'radar', focus: [0.5, 0.45], zoom: 1.2, ...o }),
};
const LIVE_CH = [['On preset 5-14', C.blue], ['LIVE', RED]];

// small strip tile footer: scrubber from the replay start through the alarm
function scrub(F, x, y, w, from, alarmAt, o = {}) {
  let s = rect(x, y, w, 26, { fill: '#000000', fo: 0.6 });
  const bx = x + 8 + textWidth(from, 11, 500) + 8, bw = w - (bx - x) - 10;
  s += text(x + 8, y + 17, from, { size: 11, weight: 500, fill: '#FFFFFF' });
  s += rect(bx, y + 11, bw, 4, { r: 2, fill: '#3A404B' }) + rect(bx, y + 11, bw * (o.now ?? 0.35), 4, { r: 2, fill: C.blue });
  s += rect(bx + bw * 0.62 - 1, y + 6, 2.5, 14, { fill: RED });
  s += circle(bx + bw * (o.now ?? 0.35), y + 13, 4.5, { fill: '#FFFFFF' });
  return s;
}

function alarmView(F, v) {
  let s = rect(AX, AY, AW, AH, { r: 16, fill: C.panel, fo: 0.92, stroke: '#2C3440' });
  s += icon(F, 'video', AX + 14, AY + 10, 20, '#FFFFFF', 1.8) + text(AX + 42, AY + 26, 'Alarm view', { size: 16, weight: 700, fill: '#FFFFFF' });
  if (v.opened) {
    const lab = v.opened, lw = textWidth(lab, 12, 500) + 30, lx = AX + AW - 12 - lw;
    s += g(F, 'Opened automatically chip NEW', rect(lx, AY + 9, lw, 22, { r: 11, fill: C.blue, fo: 0.3, stroke: BLUE, so: 0.7 }) + icon(F, 'eye', lx + 8, AY + 13, 14, '#CFE8FF', 1.8) + text(lx + 25, AY + 24.5, lab, { size: 12, weight: 500, fill: '#CFE8FF' }));
    mark('autoChip', [lx, AY + 9, lw, 22]);
  }
  // live tile
  s += tile(F, LT.x, LT.y, LT.w, LT.h, v.live, { banner: v.banner ? v.banner(LT, F) : '', ring: v.ring });
  mark('liveVideo', [LT.x, LT.y, LT.w, LT.h]);
  if (v.banner) mark('exceptionBanner', [LT.x + 8, LT.y + 36, textWidth(EXC, 12.5, 700) + 38, 24]);
  // strip: replay + second tile
  const sw = (TW - 8) / 2;
  s += tile(F, TX, ST.y, sw, ST.h, v.strip[0], { bar: 26, ls: 12, banner: v.strip[0].scrub ? scrub(F, TX, ST.y + ST.h - 26, sw, ...v.strip[0].scrub) : '' });
  s += tile(F, TX + sw + 8, ST.y, sw, ST.h, v.strip[1], { bar: 26, ls: 12 });
  mark('replayStrip', [TX, ST.y, TW, ST.h]);
  s += mapInset(F, TX, MP.y, TW, MP.h, v.map);
  mark('mapInset', [TX, MP.y, TW, MP.h]);
  return g(F, 'Alarm view NEW', s);
}
// small amber exception pill on the live tile (S7), one line under the tile header
const EXC = 'PTZ 7-02 video lost 02:16:40 · PTZ 7-03 took over 02:16:42';
const excBanner = (T, F0) => {
  const x = T.x + 8, y = T.y + 36, w = textWidth(EXC, 12.5, 700) + 38, h = 24;
  return rect(x, y, w, h, { r: 12, fill: AMBER, fo: 0.95 }) + icon(F0, 'alert', x + 9, y + 4.5, 15, '#1A1A1A', 2) + text(x + 30, y + 16.5, EXC, { size: 12.5, weight: 700, fill: '#1A1A1A' });
};

// ---------- right panel shell ----------
const PX = 900, PY = 125, PW = 460, PH = 904, BX = 916, BW = 428, BY = 332, BH = 1013 - 332;
const CX = BX + 14, CW = BW - 28;   // content inside the tab body
function rightPanel(F, o) {
  const clip = F.clip(`<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="16"/>`);
  let s = rect(PX, PY, PW, PH, { r: 16, fill: C.panel, fo: 0.85 });
  s += `<g clip-path="${clip}">${rect(PX, 161.8, PW, 868, { fill: C.body, fo: 0.8 })}</g>`;
  s += text(916, 149, 'Active Alarms', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', 1323, 132, 22, '#FFFFFF', 2.2);
  // head: alarm (and incident once raised)
  const hy = 194;
  let h = icon(F, 'clock', 916, hy - 14, 17, C.t2, 1.8) + text(940, hy, o.t0 || '02:14:58', { size: 16, fill: C.t1 });
  let cx = 940 + textWidth(o.t0 || '02:14:58', 16) + 18;
  h += text(cx, hy, 'ID:', { size: 16, fill: C.t2 }); cx += textWidth('ID:', 16) + 8;
  h += text(cx, hy, 'AGF-5-14', { size: 16, fill: C.t1 }); cx += textWidth('AGF-5-14', 16) + 18;
  if (o.incident) { h += text(cx, hy, 'Incident:', { size: 16, fill: C.t2 }); cx += textWidth('Incident:', 16) + 8; h += text(cx, hy, 'PER-005', { size: 16, weight: 500, fill: '#FFFFFF' }); }
  h += text(916, hy + 32, 'Fence Sector 5', { size: 20, weight: 500, fill: C.t1 });
  const [bl, bc] = o.badge || ['Critical', RED];
  const bw = textWidth(bl, 14, 500) + 16;
  h += rect(1344 - bw, hy + 14, bw, 22, { r: 8, fill: bc }) + text(1344 - bw / 2, hy + 29.5, bl, { size: 14, weight: 500, fill: '#FFFFFF', anchor: 'middle' });
  (o.lines || []).forEach((l, i) => { h += rich(916, hy + 58 + i * 21, l.map(r => typeof r === 'string' ? { t: r, fill: C.t2 } : { t: r.b, fill: '#FFFFFF', weight: 500 }), { size: 14 }); });
  s += g(F, 'Alarm head', h);
  // tabs
  const tabs = ['Verification', 'Response', 'Close'], tw = BW / 3;
  let t = '';
  tabs.forEach((lab, i) => {
    const on = i === o.tab, nw = textWidth(lab, 16, 700);
    t += rect(BX + i * tw, 292, tw, 40, { fill: on ? C.tabOn : C.tabOff }) + text(BX + i * tw + tw / 2, 318, lab, { size: 16, weight: 700, fill: on ? '#FFFFFF' : '#8E9CC0', anchor: 'middle' });
    if (o.tabDone && o.tabDone[i]) t += circle(BX + i * tw + tw / 2 + nw / 2 + 12, 312, 6, { fill: GREEN }) + icon(F, 'check', BX + i * tw + tw / 2 + nw / 2 + 7.5, 307.5, 9, '#FFFFFF', 2.6);
  });
  s += g(F, 'Tabs NEW', t);
  s += rect(BX, BY, BW, BH, { fill: C.tabBody });
  const bclip = F.clip(`<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}"/>`);
  s += g(F, tabs[o.tab] + ' tab NEW', `<g clip-path="${bclip}">${o.body(F)}</g>`);
  return g(F, 'Active Alarms', s);
}

// ---------- Verification tab ----------
function sectionHead(F, y, ic, title, right) {
  let s = icon(F, ic, CX, y - 15, 18, '#FFFFFF', 2) + text(CX + 26, y, title, { size: 15, weight: 700, fill: '#FFFFFF' });
  if (right) s += tag(F, CX + CW, y - 15, right[0], { kind: right[1], right: true, size: 12, h: 21 }).svg;
  return s;
}
const CORR = (alt) => alt ? [
  ['01:20:31', 'AgilFence 5-14', 'Climb signature at the works location', 'done', 'amber'],
  ['01:20:34', 'LiDAR L-5B', 'Tracks T-03, T-04 · 2 objects at the works', 'done'],
  ['01:20:45', 'PTZ 7-02', '2 people, hi-vis, at the works location', 'done'],
] : [
  ['02:14:58', 'AgilFence 5-14', 'Climb signature', 'done', 'amber'],
  ['02:15:01', 'LiDAR L-5B', 'Track T-07 · 1 object · 1.7 m', 'done'],
  ['02:15:12', 'PTZ 7-02', 'Auto-track locked on T-07', 'done'],
];
const AUTH = alt => alt ? [
  ['Permit-to-work', 'PTW-2231 · fence repair Sector 5 · 01:00–04:00 · contractor crew of 2', 'found'],
  ['Gate access', 'Badge-in at G-5 01:05 · 2 contractor badges', 'found'],
  ['Patrol roster', 'No patrol in Sector 5', 'ok'],
  ['Maintenance schedule', 'Fence repair Sector 5 · linked to PTW-2231', 'found'],
] : [
  ['Permit-to-work', 'No permit for Sector 5 tonight', 'ok'],
  ['Patrol roster', 'No patrol in Sector 5', 'ok'],
  ['Gate access', 'No badge at G-5 since 23:40', 'ok'],
  ['Maintenance schedule', 'None', 'ok'],
];
const STATE_LAB = { ok: 'Clear', found: 'Found', unknown: 'Unknown', pending: 'Checking' };

function verifyBody(v) {
  return F => {
    let s = '', y = BY + 30;
    // 1 corroboration
    s += sectionHead(F, y, 'link', v.alt ? 'Corroboration · works location' : 'Corroboration · same track', v.corrPill);
    const ry0 = y + 14, rows = CORR(v.alt);
    let r = '';
    rows.forEach(([t, sensor, what, st, ac], i) => {
      const yy = ry0 + i * 48, pend = v.corrN != null && i >= v.corrN;
      r += rect(CX, yy, CW, 42, { r: 6, fill: CARD, fo: pend ? 0.5 : 1 });
      if (i < rows.length - 1) r += line(CX + 74, yy + 30, CX + 74, yy + 60, { stroke: pend ? GREY : GREEN, sw: 2, dash: pend ? '3 3' : null });
      r += text(CX + 10, yy + 26, pend ? '–' : t, { size: 13, fill: C.t3 });
      r += dot(F, CX + 74, yy + 21, pend ? (i === v.corrN ? 'current' : 'pending') : st, 7);
      if (ac && !pend) r += rect(CX + 88, yy + 8, 3, 26, { r: 1.5, fill: AMBER });
      r += text(CX + 97, yy + 18, sensor, { size: 14, weight: 500, fill: pend ? C.t2 : '#FFFFFF' });
      r += text(CX + 97, yy + 35, pend ? (v.pendText?.[i] || 'Waiting') : what, { size: 12.5, fill: pend ? C.t2 : C.t1 });
      if (!pend) r += tag(F, CX + CW - 8, yy + 11, 'Health OK', { kind: 'ok', right: true, size: 11.5 }).svg;
    });
    s += r;
    y = ry0 + rows.length * 48;
    if (v.corrStatus) {
      s += rect(CX, y, CW, 32, { r: 6, fill: GREEN, fo: 0.18, stroke: GREEN, so: 0.6 }) + circle(CX + 16, y + 16, 8, { fill: GREEN }) + icon(F, 'check', CX + 10, y + 10, 12, '#FFFFFF', 2.8);
      s += text(CX + 32, y + 21, v.corrStatus, { size: 14, weight: 700, fill: '#FFFFFF' });
      y += 32;
    }
    mark('corroboration', [CX, BY + 12, CW, y - BY - 12]);
    // 2 authorised-activity check
    y += 34;
    const ay0 = y - 20;
    s += sectionHead(F, y, 'shieldCheck', 'Authorised-activity check', v.authPill);
    y += 12;
    AUTH(v.alt).forEach(([src, finding, st], i) => {
      const pend = v.authPending, k = pend ? 'unknown' : st, fl = lines(finding, CW - 104, 12.5), rh = 22 + fl.length * 17;
      const hl = v.alt && i === 0;
      s += rect(CX, y, CW, rh, { r: 6, fill: hl ? C.info : CARD, fo: hl ? 0.2 : 1, stroke: hl ? C.info : null, so: 0.8 });
      s += text(CX + 10, y + 18, src, { size: 13.5, weight: 500, fill: '#FFFFFF' });
      fl.forEach((l, j) => { s += text(CX + 10, y + 35 + j * 17, pend ? 'Checking…' : l, { size: 12.5, fill: C.t1 }); });
      s += tag(F, CX + CW - 8, y + 8, pend ? 'Checking' : STATE_LAB[k], { kind: pend ? 'unknown' : k, right: true, size: 11.5 }).svg;
      if (hl) mark('permitRow', [CX, y, CW, rh]);
      y += rh + 5;
    });
    // result states legend: Unknown has its own style (none tonight)
    let lx = CX;
    s += text(lx, y + 15, 'Result states', { size: 12, fill: C.t2 }); lx += textWidth('Result states', 12) + 8;
    for (const [lab, k] of [['Clear', 'ok'], ['Found', 'found'], ['Unknown', 'unknown']]) { const t = tag(F, lx, y + 2, lab, { kind: k, size: 11 }); s += t.svg; lx += t.w + 6; }
    s += text(lx + 2, y + 15, v.alt ? 'Unknown: none' : 'Unknown: none tonight', { size: 12, fill: C.t2 });
    y += 24;
    mark('authCheck', [CX, ay0, CW, y - ay0]);
    // 3 decision bar
    if (v.decision !== false) {
      y = Math.max(y + 18, BY + BH - 160);
      s += line(CX, y - 10, CX + CW, y - 10, { stroke: '#6B7280', so: 0.6 });
      s += icon(F, 'user', CX, y - 2, 16, '#FFFFFF', 2) + text(CX + 22, y + 11, 'Your decision — becomes the incident record', { size: 13, weight: 500, fill: '#FFFFFF' });
      y += 22;
      const alt = v.alt, off = k => v.recorded && v.pressed !== k;   // buttons not chosen are disabled once the decision is recorded
      // Confirm intrusion (red, full width; neutral ghost when de-emphasised on the A-path)
      const ci = alt ? '#C9CED6' : '#FFFFFF';
      s += rect(CX, y, CW, 44, { r: 8, fill: alt ? 'none' : C.redCreate, stroke: alt ? '#7D8490' : null, sw: 1.2 }) + icon(F, 'alert', CX + CW / 2 - textWidth('Confirm intrusion', 18, 700) / 2 - 14, y + 13, 18, ci, 2) + text(CX + CW / 2 + 12, y + 28.5, 'Confirm intrusion', { size: 18, weight: 700, fill: ci, anchor: 'middle' });
      mark('confirmBtn', [CX, y, CW, 44]);
      if (v.pressed === 'confirm') s += btnState(F, CX, y, CW, 44, 'pressed');
      if (off('confirm')) s += btnState(F, CX, y, CW, 44, 'disabled');
      y += 52;
      const hw = (CW - 8) / 2;
      // Authorised activity (highlighted on the alternative path) · False alarm
      if (alt) s += rect(CX - 3, y - 3, hw + 6, 44, { r: 10, stroke: C.info, sw: 2, so: 0.55 });
      s += rect(CX, y, hw, 38, { r: 8, fill: alt ? '#0E6E7C' : '#5A606B' }) + text(CX + hw / 2, y + 25, 'Authorised activity', { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
      mark('authorisedBtn', [CX, y, hw, 38]);
      if (v.pressed === 'authorised') s += btnState(F, CX, y, hw, 38, 'pressed');
      if (off('authorised')) s += btnState(F, CX, y, hw, 38, 'disabled');
      s += rect(CX + hw + 8, y, hw, 38, { r: 8, fill: '#5A606B' }) + text(CX + hw + 8 + hw / 2, y + 25, 'False alarm', { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
      mark('falseBtn', [CX + hw + 8, y, hw, 38]);
      if (off('false')) s += btnState(F, CX + hw + 8, y, hw, 38, 'disabled');
      y += 46;
      if (v.recorded) {
        s += circle(CX + 9, y + 10, 8, { fill: GREEN }) + icon(F, 'check', CX + 3, y + 4, 12, '#FFFFFF', 2.8);
        s += rich(CX + 24, y + 15, [{ t: 'Recorded · ', fill: C.t2 }, { t: v.recorded, fill: '#FFFFFF', weight: 500 }], { size: 13 });
        if (textWidth('Recorded · ' + v.recorded, 13, 500) > CW - 26) console.warn('recorded line too long', CUR);
        mark('decisionRecorded', [CX, y, CW, 20]);
      }
    }
    return s;
  };
}

// ---------- Response tab: three concurrent lanes ----------
const RULE_ACK = ['Rule: no duty-manager acknowledgement within SOP time', '→ head of security notified · not triggered'];
function lane(F, x, y, w, L) {
  // header: icon + name + state chip; authority tag on the right
  let s = '';
  const gap = L.gap ?? 6;
  const steps = L.steps.map(st => ({ ...st, ls: lines(st.t, w - 34 - 72, 13, st.s === 'current' ? 500 : 400), sub: st.sub ? [st.sub] : [] }));
  const nl = st => st.ls.length + st.sub.length;
  let h = 40 + (L.info ? 20 : 0) + steps.reduce((a, st) => a + gap + nl(st) * 17, 0) + (L.extra ? 26 : 0) + (L.actions ? 46 : 0) + (L.recorded ? 26 : 0) + 8;
  s += rect(x, y, w, h, { r: 8, fill: CARD }) + rect(x, y, 4, h, { r: 2, fill: L.col });
  s += icon(F, L.icon, x + 14, y + 10, 18, '#FFFFFF', 2) + text(x + 40, y + 25, L.name, { size: 15, weight: 700, fill: '#FFFFFF' });
  s += tag(F, x + w - 10, y + 10, L.auth, { kind: L.authKind || 'auth', right: true, size: 11.5 }).svg;
  let yy = y + 40;
  if (L.info) { s += text(x + 14, yy + 9, L.info, { size: 13, fill: C.t1 }); yy += 20; }
  steps.forEach((st, i) => {
    yy += gap;
    const cy = yy + 6;
    if (i < steps.length - 1) s += line(x + 21, cy + 8, x + 21, cy + nl(st) * 17 + gap - 2, { stroke: st.s === 'done' ? GREEN : '#5A606B', sw: 1.5 });
    s += dot(F, x + 21, cy, st.s, 6);
    st.ls.forEach((l, j) => { s += text(x + 34, yy + 10.5 + j * 17, l, { size: 13, weight: st.s === 'current' ? 500 : 400, fill: st.s === 'pending' ? C.t2 : '#FFFFFF' }); });
    st.sub.forEach((l, j) => { s += text(x + 34, yy + 10.5 + (st.ls.length + j) * 17, l, { size: 12.5, fill: C.t2 }); });
    if (st.time) s += text(x + w - 10, yy + 10.5, st.time, { size: 13, weight: 500, fill: st.s === 'pending' ? C.t2 : '#FFFFFF', anchor: 'end' });
    yy += nl(st) * 17;
  });
  if (L.extra) {
    yy += 6; s += rect(x + 10, yy, w - 20, 22, { r: 5, fill: '#FFFFFF', fo: 0.07 }) + icon(F, 'user', x + 16, yy + 4, 14, C.t2, 2);
    if (Array.isArray(L.extra)) s += rich(x + 36, yy + 15.5, L.extra.map(r => typeof r === 'string' ? { t: r, fill: C.t1 } : { t: r.b, fill: GREEN_T, weight: 500 }), { size: 12.5 });
    else s += text(x + 36, yy + 15.5, L.extra, { size: 12.5, fill: C.t1 });
    yy += 22;
  }
  let btns = [];
  if (L.actions) {
    yy += 10; let ax = x + 14;
    for (const [lab, kind] of L.actions) {
      const bw = textWidth(lab, 15, 700) + 28;
      s += rect(ax, yy, bw, 34, { r: 7, fill: kind === 'blue' ? '#1F4FBF' : '#5A606B' }) + text(ax + bw / 2, yy + 22.5, lab, { size: 15, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
      btns.push([ax, yy, bw, 34]); ax += bw + 8;
    }
    yy += 34;
  }
  let rec = null;
  if (L.recorded) {
    yy += 8;
    s += circle(x + 23, yy + 9, 8, { fill: GREEN }) + icon(F, 'check', x + 17, yy + 3, 12, '#FFFFFF', 2.8);
    s += rich(x + 38, yy + 14, [{ t: 'Recorded · ', fill: C.t2 }, { t: L.recorded, fill: '#FFFFFF', weight: 500 }], { size: 13 });
    rec = [x + 14, yy, w - 28, 18];
  }
  return { svg: g(F, 'Lane ' + L.name + ' NEW', s), h, btns, rec };
}
function responseBody(r) {
  return F => {
    let s = '', y = BY + 24;
    s += text(CX, y, 'SOP-PER-02 · Critical perimeter intrusion', { size: 13, weight: 500, fill: '#FFFFFF' }) + text(CX + CW, y, 'Owner ' + OWNER, { size: 13, fill: C.t2, anchor: 'end' });
    y += 12;
    // tracking line
    s += rect(CX, y, CW, 28, { r: 6, fill: r.trackWarn ? AMBER : '#FFFFFF', fo: r.trackWarn ? 0.16 : 0.07, stroke: r.trackWarn ? AMBER : null, so: 0.5 }) + icon(F, 'radar', CX + 8, y + 6, 16, r.trackWarn ? AMBER : '#55D6E6', 2);
    if (textWidth('Tracking  ' + r.tracking, 13, 500) > CW - 40) console.warn('tracking line too long', CUR);
    s += rich(CX + 32, y + 19, [{ t: 'Tracking  ', fill: C.t2, weight: 500 }, { t: r.tracking, fill: '#FFFFFF' }], { size: 13 });
    y += 38;
    for (const [key, L] of [['lanePatrol', r.patrol], ['lanePolice', r.police], ['laneAviation', r.aviation]]) {
      const l = lane(F, CX, y, CW, L);
      s += l.svg; mark(key, [CX, y, CW, l.h]);
      if (key === 'lanePatrol' && l.btns.length) {
        mark('dispatchBtn', l.btns[0]);
        if (r.pressed) s += btnState(F, ...l.btns[0], 'pressed', { r: 7 });
        if (L.recorded) s += btnState(F, ...l.btns[1], 'disabled', { r: 7 });
      }
      if (l.rec) mark('dispatchRecorded', l.rec);
      y += l.h + 10;
    }
    // escalation rule of the authority matrix (acknowledgement timeout), shown as a rule, not triggered
    const rl = RULE_ACK;
    s += icon(F, 'timer', CX, y + 2, 15, C.t2, 2);
    rl.forEach((l, j) => { s += text(CX + 22, y + 14 + j * 17, l, { size: 12.5, fill: C.t2 }); });
    mark('escalationRule', [CX, y, CW, rl.length * 17 + 4]);
    if (y + rl.length * 17 > BY + BH - 4) console.warn('response tab overflows', CUR, Math.round(y + rl.length * 17 - BY - BH));
    return s;
  };
}

// ---------- Close tab: evidence gate ----------
const EVIDENCE = [
  ['Handed to police', 'Custody record AP-12', 'Airport Police', '02:26:30'],
  ['Area secured', 'Sweep of Sector 5 by Patrol 2', 'Patrol app', '02:38:40'],
  ['Runway 02L restored', 'Tower, ATC supervisor Tan', 'Tower log', '02:31:10'],
  ['Fence 5-14 made safe', 'Mesh bent, no cut; guard posted; FM ticket FM-90412', 'FM system', '02:40:15'],
  ['SOP complete', 'SOP-PER-02 · 7 of 7 steps', 'SOP record', '02:43:30'],
  ['Evidence pack sealed', '3 clips + fence trace + LiDAR track', 'Evidence store', '02:43:40'],
];
function evidenceRows(F, x, y, w, o = {}) {
  let s = '';
  EVIDENCE.forEach(([t, ev, src, tm]) => {
    const el = lines(ev, w - 44 - 20 - textWidth(src, 12), 12.5), rh = (o.compact ? 20 : 24) + el.length * 16 + (o.compact ? 0 : 0);
    s += rect(x, y, w, rh, { r: 6, fill: o.fill || CARD });
    s += circle(x + 17, y + 15, 8, { fill: GREEN }) + icon(F, 'check', x + 11, y + 9, 12, '#FFFFFF', 2.8);
    s += text(x + 34, y + 18, t, { size: 14, weight: 500, fill: '#FFFFFF' });
    s += text(x + w - 10, y + 18, tm, { size: 13, weight: 500, fill: '#FFFFFF', anchor: 'end' });
    el.forEach((l, j) => { s += text(x + 34, y + 35 + j * 16, l, { size: 12.5, fill: C.t1 }); });
    s += text(x + w - 10, y + 35 + (el.length - 1) * 16, src, { size: 12, fill: C.t2, anchor: 'end' });
    y += rh + 5;
  });
  return { svg: s, y };
}
function closeBody(o) {
  return F => {
    let s = '', y = BY + 30;
    s += sectionHead(F, y, 'shieldCheck', 'Close · evidence for sign-off', ['6 of 6 complete', 'ok']);
    y += 12;
    const ey0 = y;
    const ev = evidenceRows(F, CX, y, CW);
    s += ev.svg; y = ev.y;
    mark('closeChecklist', [CX, BY + 12, CW, y - BY - 12]);
    // gate rule
    y += 4;
    s += rect(CX, y, CW, 50, { r: 6, fill: '#FFFFFF', fo: 0.07, stroke: '#9BA1AC', so: 0.5 }) + icon(F, 'lock', CX + 10, y + 8, 16, '#FFFFFF', 2);
    s += text(CX + 34, y + 21, 'Closing is blocked until every item is complete.', { size: 13, weight: 500, fill: '#FFFFFF' });
    s += text(CX + 34, y + 39, 'All 6 complete · Submit is enabled', { size: 12.5, fill: GREEN_T });
    mark('gateRule', [CX, y, CW, 50]);
    y += 60;
    s += icon(F, 'idcard', CX, y, 15, C.t2, 2) + text(CX + 22, y + 12, 'Sign-off: duty manager ' + DM + ' · badge + PIN on his console', { size: 12.5, fill: C.t1 });
    s += icon(F, 'timer', CX, y + 21, 15, C.t2, 2) + text(CX + 22, y + 33, 'Duty manager acknowledged 02:15:41 · escalation not triggered', { size: 12.5, fill: C.t2 });
    // the action sits right under the sign-off lines (no empty gap above it)
    y += 54;
    if (o.submitted) {
      s += rect(CX, y, CW, 44, { r: 8, fill: '#FFFFFF', fo: 0.08, stroke: '#9BA1AC', so: 0.5 }) + circle(CX + 20, y + 22, 9, { fill: GREEN }) + icon(F, 'check', CX + 13.5, y + 15.5, 13, '#FFFFFF', 2.8);
      s += text(CX + 38, y + 27, o.submitted, { size: 14, weight: 500, fill: '#FFFFFF' });
      return s;
    }
    s += rect(CX, y, CW, 44, { r: 8, fill: '#1F4FBF' }) + icon(F, 'send', CX + CW / 2 - textWidth('Submit for sign-off', 18, 700) / 2 - 16, y + 12, 20, '#FFFFFF', 2) + text(CX + CW / 2 + 12, y + 28.5, 'Submit for sign-off', { size: 18, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
    mark('submitBtn', [CX, y, CW, 44]);
    if (o.pressed) s += btnState(F, CX, y, CW, 44, 'pressed');
    return s;
  };
}

// ---------- frame builder ----------
function build(name, o) {
  const F = new Frame(name, W, H);
  // the 3D scene keeps the S1 framing in every frame; while the Alarm view is open it is dimmed so the left column reads as in S1
  let s = scene(F, clayAirport(F, camera(870, 520, 8.4, 50, 29), { markers: [], alarmFence: false, lidar: false, labels: o.home }));
  if (!o.home) s += rect(0, 0, W, H, { fill: C.frame, fo: 0.72 });
  s += header(F, { user: o.user });
  if (o.home) s += modelToggle(F);
  s += alertsPanel(F, { cluster: 'All terminals', counts: counts(o.crit ?? 2), cards: cardList(o.cards || {}) });
  s += deviceStatus(F, { online: 4812, offline: o.offline ?? 6 });
  if (o.rail) s += rail(F, o.rail);
  if (o.view) s += alarmView(F, o.view);
  if (o.panel) s += rightPanel(F, o.panel);
  if (o.after) s += o.after(F);
  return F.render(s);
}

// ---------- scenario states ----------
const CAMLIST = (o = {}) => [
  { id: 'PTZ 7-02', X: -88, Y: 44, state: o.p702 || 'active', place: 'below', note: o.n702 },
  { id: 'CAM 7-11', X: 72, Y: 9, state: 'idle' },
  { id: 'PTZ 7-03', X: 150, Y: 52, state: o.p703 || 'idle', place: o.p703place || 'left', note: o.n703 },
];
const TRACK0 = [[0, 1], [1, 4], [2, 7], [3, 10]];
const TRACK7 = [[0, 1], [1, 4], [3, 8], [7, 11], [12, 13], [18, 14], [24, 15], [30, 16]];
const STRIP = { pre: CAMS.pre({ scrub: ['02:14:41', 0.62, { now: 0.3 }], chips: [['Pre-alarm', '#3A404B']] }), thermal: CAMS.thermal() };
const HEAD_ALARM = [[{ b: 'AgilFence 5-14' }, ' · climb signature · north perimeter'], ['Owner ', { b: OWNER }, ' · Runway 02L 130 m from 5-14']];
const HEAD_INC = [['Raised from alarm ', { b: 'AGF-5-14' }, ' · history since ', { b: '02:14:58' }], ['Perimeter intrusion · owner ', { b: OWNER }, ' · SOP-PER-02']];
const PHS = (d, v, r, z) => [
  { name: 'Detection', ...d }, { name: 'Verification', ...v }, { name: 'Response', ...r }, { name: 'Resolution', ...z },
];
const P_DET = { state: 'done', sub: 'Alarm 02:14:58' };

function s1() {
  return build('AV-S1 · Quiet console · lockdown status shown separately', { home: true, crit: 1, cards: { fence: false } });
}
function s2() {
  return build('AV-S2 · Alarm view opened automatically · PTZ 7-02 live on preset 5-14', {
    cards: { fence: 'Climb signature on segment 5-14' },
    rail: { ref: 'Alarm AGF-5-14', phases: PHS(P_DET, { state: 'current', sub: 'Checks running' }, { state: 'pending', sub: 'Not started' }, { state: 'pending', sub: 'Not started' }),
      chain: [{ t: 'Alarm raised · AgilFence 5-14 climb signature', time: '02:14:58' }, { t: 'Alarm view opened automatically', time: '02:14:59' }, { t: 'Corroboration and authorised-activity check running', s: 'current' }] },
    view: { opened: 'Opened automatically · 02:14:59', live: CAMS.climb({ chips: LIVE_CH, ts: '02:14:59' }), strip: [STRIP.pre, STRIP.thermal], map: { cams: CAMLIST() } },
    panel: { tab: 0, lines: HEAD_ALARM, body: verifyBody({ corrN: 1, pendText: ['', 'Waiting for LiDAR L-5B', 'PTZ 7-02 on preset 5-14 · locking on'], corrPill: ['Checking', 'unknown'], authPending: true, authPill: ['Checking 4 sources', 'unknown'], decision: false }) },
    after: F => {
      const tx = 908, tw = 444, o = { title: 'AgilFence alarm · Segment 5-14', sub: 'Fence Sector 5 · Critical · north perimeter', time: '02:14:59', sound: true, w: tw, text: 'Climb signature on 5-14. Alarm view opened with PTZ 7-02 live on preset 5-14. The alarm stays Critical until resolved.', actions: [['Mute tone', '']] };
      const h = toast(new Frame('m'), 0, 0, o).h, ty = 1013 - h;
      const t = toast(F, tx, ty, o);
      mark('alarmToast', [tx, ty, tw, h]);
      mark('muteBtn', [tx + 62, ty + h - 44, textWidth('Mute tone', 14, 700) + 24, 30]);
      return t.svg;
    },
  });
}
const RAIL_VER = (sub, chain3) => ({ ref: 'Alarm AGF-5-14', phases: PHS(P_DET, { state: 'current', sub }, { state: 'pending', sub: 'Opens on confirm' }, { state: 'pending', sub: 'Not started' }),
  chain: [{ t: 'Authorised activity: clear', time: '02:15:06' }, { t: 'Corroborated · 3 sensors, one track', time: '02:15:12' }, chain3] });
const VIEW_VER = () => ({ opened: 'Opened automatically · 02:14:59', live: CAMS.inside({ chips: [['Auto-track T-07', '#0E5E68'], ...LIVE_CH], ts: '02:15:20' }), strip: [STRIP.pre, STRIP.thermal], map: { cams: CAMLIST(), track: TRACK0 } });
const VER_BASE = { corrPill: ['Corroborated', 'ok'], corrStatus: 'Corroborated · 3 sensors, one track', authPill: ['Clear · 4 of 4 sources', 'ok'] };
function s3() {
  return build('AV-S3 · Verification · corroboration and authorised-activity check · decision bar', {
    cards: { fence: 'Climb on 5-14 · 3 sensors, one track' },
    rail: RAIL_VER('Your decision', { t: 'Visual confirmation by operator', s: 'current' }),
    view: VIEW_VER(),
    panel: { tab: 0, lines: HEAD_ALARM, body: verifyBody({ ...VER_BASE }) },
  });
}
function s4() {
  const v = VIEW_VER(); v.live.ts = '02:15:24';
  return build('AV-S4 · Click 1 · Confirm intrusion · visually confirmed by Nurul A. 02:15:24', {
    cards: { fence: 'Climb on 5-14 · 3 sensors, one track' },
    rail: { ...RAIL_VER('Confirmed 02:15:24', { t: 'Visually confirmed · Nurul A.', time: '02:15:24' }), phases: PHS(P_DET, { state: 'done', sub: 'Confirmed 02:15:24' }, { state: 'current', sub: 'Opening' }, { state: 'pending', sub: 'Not started' }) },
    view: v,
    panel: { tab: 0, lines: HEAD_ALARM, body: verifyBody({ ...VER_BASE, pressed: 'confirm', recorded: 'Visually confirmed · Nurul A. (owner) · 02:15:24' }) },
  });
}
// response lanes per state
const LANES = {
  s5: {
    tracking: 'LiDAR T-07 live · PTZ 7-02 on target',
    patrol: { name: 'Patrol', icon: 'car', col: BLUE, auth: 'Pre-authorised · SOP-PER-02 §3.1', info: 'Patrol 2 (Arjun + 1) · nearest · ETA 02:18:30',
      steps: [{ t: 'Dispatch · your click', s: 'current' }, { t: 'En route', s: 'pending' }, { t: 'On scene', s: 'pending' }], actions: [['Dispatch Patrol 2', 'blue'], ['Choose another', 'grey']] },
    police: { name: 'Police', icon: 'siren', col: BLUE, auth: 'Pre-authorised · SOP-PER-02 §3.2',
      steps: [{ t: 'Requested · with your confirmation', time: '02:15:25', s: 'done' }, { t: 'Contacting · Airport Police ops room', s: 'current' }, { t: 'Acknowledged', s: 'pending' }, { t: 'Responding', s: 'pending' }, { t: 'On scene', s: 'pending' }],
      extra: 'Duty manager Daniel L. · informed 02:15:25 · reviewing' },
    aviation: { name: 'Aviation safety', icon: 'plane', col: BLUE, auth: 'Authority: ATC', authKind: 'atc',
      steps: [{ t: 'Tower notified · person 130 m from Runway 02L', time: '02:15:25', s: 'done' }, { t: 'Tower decision · awaiting ATC', s: 'current' }, { t: 'Restriction active', s: 'pending' }, { t: 'Restored', s: 'pending' }] },
  },
};
LANES.s7 = {
  tracking: 'PTZ 7-02 lost 02:16:40 · PTZ 7-03 since 02:16:42', trackWarn: true,
  patrol: { name: 'Patrol', icon: 'car', col: BLUE, auth: 'Pre-authorised · SOP-PER-02 §3.1', info: 'Patrol 2 (Arjun + 1) · ETA 02:18:30',
    steps: [{ t: 'Dispatched · Nurul A.', time: '02:15:30', s: 'done' }, { t: 'En route · perimeter road', s: 'current' }, { t: 'On scene', s: 'pending' }] },
  police: { name: 'Police', icon: 'siren', col: BLUE, auth: 'Pre-authorised · SOP-PER-02 §3.2',
    steps: [{ t: 'Requested', time: '02:15:25', s: 'done' }, { t: 'Contacted · Airport Police ops room', time: '02:15:38', s: 'done' }, { t: 'Acknowledged · Sgt. Lim (APD)', time: '02:15:52', s: 'done' }, { t: 'Responding · unit AP-12 · ETA 02:24:00', time: '02:16:05', s: 'current' }, { t: 'On scene', s: 'pending' }],
    extra: ['Duty manager Daniel L. · ', { b: 'acknowledged 02:15:41' }] },
  aviation: { name: 'Aviation safety', icon: 'plane', col: BLUE, auth: 'Authority: ATC', authKind: 'atc',
    steps: [{ t: 'Tower notified', time: '02:15:25', s: 'done' }, { t: 'Tower decision · Runway 02L: arrivals held, no movements on 02L', sub: 'ATC supervisor Tan', time: '02:15:58', s: 'done' }, { t: 'Restriction active', s: 'current' }, { t: 'Restored', s: 'pending' }] },
};
LANES.s8 = {
  tracking: 'T-07 stationary inside fence line · PTZ 7-03',
  patrol: { name: 'Patrol 2 (Arjun + 1)', icon: 'car', col: GREEN, auth: 'Pre-authorised · SOP-PER-02 §3.1', gap: 3,
    steps: [{ t: 'Dispatched · Nurul A.', time: '02:15:30', s: 'done' }, { t: 'On scene', time: '02:18:08', s: 'done' }, { t: 'Contained · person stationary inside fence', time: '02:18:08', s: 'done' }, { t: 'Intercepted', time: '02:19:30', s: 'done' }, { t: 'Detained', time: '02:20:05', s: 'done' }] },
  police: { name: 'Police', icon: 'siren', col: GREEN, auth: 'Pre-authorised · SOP-PER-02 §3.2', gap: 3,
    steps: [{ t: 'Requested', time: '02:15:25', s: 'done' }, { t: 'Contacted · Airport Police ops room', time: '02:15:38', s: 'done' }, { t: 'Acknowledged · Sgt. Lim (APD)', time: '02:15:52', s: 'done' }, { t: 'Responding · unit AP-12', time: '02:16:05', s: 'done' }, { t: 'On scene · AP-12', time: '02:24:10', s: 'done' }, { t: 'Custody · handed to police AP-12', time: '02:26:30', s: 'done' }],
    extra: ['Duty manager Daniel L. · ', { b: 'acknowledged 02:15:41' }] },
  aviation: { name: 'Aviation safety', icon: 'plane', col: BLUE, auth: 'Authority: ATC', authKind: 'atc', gap: 3,
    steps: [{ t: 'Tower decision · 02L arrivals held', sub: 'ATC supervisor Tan', time: '02:15:58', s: 'done' }, { t: 'Restriction active · until tower restores', s: 'current' }, { t: 'Restored', s: 'pending' }] },
};
const RAIL_RESP = (chain, rsub = 'Lanes open') => ({ ref: 'Incident PER-005 · from alarm AGF-5-14', phases: PHS(P_DET, { state: 'done', sub: 'Confirmed 02:15:24' }, { state: 'current', sub: rsub }, { state: 'pending', sub: 'Not started' }), chain });
const VIEW_RESP = (ts, map = {}) => ({ opened: 'Opened automatically · 02:14:59', live: CAMS.inside({ chips: [['Auto-track T-07', '#0E5E68'], ...LIVE_CH], ts }), strip: [STRIP.pre, STRIP.thermal], map: { cams: CAMLIST(), track: [...TRACK0, [4, 12]], units: [{ at: [-130, 25], label: 'Patrol 2 · from G-4', offmap: true }], ...map } });
const CHAIN5 = [{ t: 'Incident PER-005 raised · Nurul A.', time: '02:15:24' }, { t: 'Police requested', time: '02:15:25' }, { t: 'Tower notified', time: '02:15:25' }, { t: 'Duty manager informed', time: '02:15:25' }, { t: 'Patrol dispatch', s: 'current' }];
function s5() {
  return build('AV-S5 · Incident PER-005 raised · response lanes open in parallel', {
    cards: { fence: 'Incident PER-005 · response open' },
    rail: RAIL_RESP(CHAIN5),
    view: VIEW_RESP('02:15:26'),
    panel: { tab: 1, tabDone: [true], incident: true, lines: HEAD_INC, body: responseBody({ ...LANES.s5 }) },
    after: F => {
      const x = 396, w = 484, y = 943;
      mark('incidentToast', [x, y, w, 70]);
      return confirmToast(F, x, y, 'Incident PER-005 raised from alarm AGF-5-14', 'History inherited since 02:14:58 · owner Nurul A. · 02:15:24', { w });
    },
  });
}
function s6() {
  return build('AV-S6 · Click 2 · Dispatch Patrol 2 · 02:15:30', {
    cards: { fence: 'Incident PER-005 · response open' },
    rail: RAIL_RESP(CHAIN5),
    view: VIEW_RESP('02:15:30'),
    panel: { tab: 1, tabDone: [true], incident: true, lines: HEAD_INC, body: responseBody({ ...LANES.s5, pressed: true, patrol: { ...LANES.s5.patrol, recorded: 'Dispatch Patrol 2 · Nurul A. · 02:15:30' } }) },
  });
}
function s7() {
  return build('AV-S7 · Response running · PTZ 7-02 video lost · PTZ 7-03 took over', {
    cards: { fence: 'Incident PER-005 · patrol en route' },
    rail: RAIL_RESP([{ t: 'Patrol 2 dispatched', time: '02:15:30' }, { t: 'Duty manager acknowledged', time: '02:15:41' }, { t: 'Police acknowledged', time: '02:15:52' }, { t: 'Runway 02L held · ATC', time: '02:15:58' }, { t: 'PTZ 7-03 took over', time: '02:16:42' }, { t: 'Patrol en route · ETA 02:18:30', s: 'current' }], 'Running · 3 lanes'),
    view: { opened: 'Opened automatically · 02:14:59', live: CAMS.ptz703({ chips: [['Auto-track T-07', '#0E5E68'], ['LIVE', RED]], ts: '02:16:42' }), banner: excBanner, ring: AMBER,
      strip: [STRIP.pre, { label: 'PTZ 7-02 · no video', icon: 'video', empty: '' }],
      map: { cams: CAMLIST({ p702: 'lost', n702: 'video lost', p703: 'active', n703: 'tracking' }), tgt: [30, 16], track: TRACK7, hold: 'Arrivals held · 02:15:58', units: [{ at: [-112, 25], from: [-160, 25], label: 'Patrol 2 · ETA 02:18:30', above: true }] } },
    panel: { tab: 1, tabDone: [true], incident: true, lines: HEAD_INC, body: responseBody({ ...LANES.s7 }) },
    after: F => {
      // the PTZ 7-02 strip tile: video lost placeholder
      const sw = (TW - 8) / 2, x = TX + sw + 8, y = ST.y;
      return g(F, 'Video lost NEW', icon(F, 'video', x + sw / 2 - 14, y + 40, 28, '#9BA1AC', 1.8) + line(x + sw / 2 - 16, y + 40, x + sw / 2 + 16, y + 70, { stroke: '#9BA1AC', sw: 2 }) + text(x + sw / 2, y + 92, 'Video lost 02:16:40', { size: 12, weight: 500, fill: C.t1, anchor: 'middle' }));
    },
  });
}
function s8() {
  return build('AV-S8 · On scene and outcomes · handed to police 02:26:30', {
    cards: { fence: 'Incident PER-005 · handed to police' },
    rail: { ref: 'Incident PER-005 · from alarm AGF-5-14', chainKey: 'outcomes',
      phases: PHS(P_DET, { state: 'done', sub: 'Confirmed 02:15:24' }, { state: 'done', sub: 'On scene 02:18:08' }, { state: 'current', sub: 'Outcomes' }),
      chain: [{ t: 'Patrol on scene', time: '02:18:08' }, { t: 'Contained', time: '02:18:08' }, { t: 'Intercepted', time: '02:19:30' }, { t: 'Detained', time: '02:20:05' }, { t: 'Police on scene AP-12', time: '02:24:10' }, { t: 'Handed to police · custody AP-12', time: '02:26:30' }] },
    view: { opened: 'Opened automatically · 02:14:59', live: CAMS.patrol({ chips: [['LIVE', RED]], ts: '02:26:30' }), strip: [STRIP.pre, CAMS.lidar({ label: 'LiDAR L-5B · T-07 stationary' })],
      map: { cams: CAMLIST({ p702: 'lost', p703: 'active', p703place: 'below' }), tgt: [32, 17], track: TRACK7.concat([[32, 17]]), trackLabel: 'T-07 · contained', trackLeft: true, hold: 'Arrivals held · 02:15:58',
        units: [{ at: [44, 25], from: [-160, 25], label: 'Patrol 2 · on scene', below: true, left: true }, { at: [118, 25], from: [220, 25], label: 'AP-12 · on scene', col: C.blue, icon: 'siren', above: true }] } },
    panel: { tab: 1, tabDone: [true], incident: true, lines: HEAD_INC, body: responseBody({ ...LANES.s8 }) },
  });
}
const VIEW_CLOSE = (ts, opened) => ({ opened, live: CAMS.wide({ chips: [['LIVE', RED]], ts }), strip: [{ ...STRIP.pre, label: 'Sealed clip 1 of 3', chips: [['CAM 7-11', '#3A404B']] }, CAMS.lidar({ label: 'LiDAR track T-07 · sealed' })],
  map: { alarm: false, cams: CAMLIST({ p702: 'lost', p703: 'idle' }), hold: 'Restored · 02:31:10', holdKind: 'ok', units: [{ at: [4, 6], label: 'Guard posted · 5-14', icon: 'user', below: true }] } });
function s9() {
  return build('AV-S9 · Close · six evidence items complete · Submit for sign-off', {
    cards: { fence: 'Incident PER-005 · ready to close' },
    rail: { ref: 'Incident PER-005 · from alarm AGF-5-14',
      phases: PHS(P_DET, { state: 'done', sub: 'Confirmed 02:15:24' }, { state: 'done', sub: 'Custody 02:26:30' }, { state: 'current', sub: 'Submit 02:43:50' }),
      chain: [{ t: 'Runway 02L restored', time: '02:31:10' }, { t: 'Area secured', time: '02:38:40' }, { t: 'Fence 5-14 made safe', time: '02:40:15' }, { t: 'Evidence sealed', time: '02:43:40' }, { t: 'Submitted for sign-off', time: '02:43:50', s: 'current' }, { t: 'Signed off', s: 'pending' }, { t: 'Closed', s: 'pending' }] },
    view: VIEW_CLOSE('02:43:50', 'Opened automatically · 02:14:59'),
    panel: { tab: 2, tabDone: [true, true], incident: true, lines: HEAD_INC, body: closeBody({ pressed: true }) },
  });
}
// duty manager's console: sign-off dialog, badge + PIN, Sign and close; closed confirmation
function signDialog(F, o = {}) {
  const x = 380, y = 150, w = 640, h0 = 760;
  let m = '';
  const clip = F.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h0}" rx="16"/>`);
  m += `<g clip-path="${clip}">${rect(x, y, w, h0, { fill: '#333A47' }) + rect(x, y, w, 40, { fill: '#191E25' })}</g>`;
  m += icon(F, 'shieldCheck', x + 16, y + 10, 20, '#FFFFFF', 2) + text(x + 44, y + 26, 'Sign off and close · Incident PER-005', { size: 16, weight: 700, fill: '#FFFFFF' }) + icon(F, 'x', x + w - 34, y + 9, 20, '#FFFFFF', 2.2);
  let yy = y + 72;
  m += text(x + 20, yy, 'Fence Sector 5 · Perimeter intrusion', { size: 20, weight: 500, fill: C.t1 }) + pill(F, x + w - 20 - textWidth('Critical', 14, 500) - 16, yy - 17, 'Critical', RED, { h: 22 }).svg;
  yy += 24;
  m += rich(x + 20, yy, [{ t: 'Submitted by ', fill: C.t2 }, { t: 'Nurul A. (owner)', fill: '#FFFFFF', weight: 500 }, { t: ' · 02:43:50 · raised from alarm AGF-5-14 at 02:14:58', fill: C.t2 }], { size: 14 });
  yy += 22;
  m += text(x + 20, yy + 6, 'Evidence · 6 of 6 complete', { size: 15, weight: 700, fill: '#FFFFFF' });
  yy += 16;
  const ev = evidenceRows(F, x + 20, yy, w - 40, { fill: '#2A303B' });
  m += ev.svg;
  mark('closeChecklist', [x + 20, yy - 20, w - 40, ev.y - yy + 20]);
  yy = ev.y + 10;
  m += text(x + 20, yy + 6, 'Sign with badge + PIN', { size: 15, weight: 700, fill: '#FFFFFF' }) + text(x + w - 20, yy + 6, 'Signed in as Daniel L. · Duty manager', { size: 12.5, fill: C.t2, anchor: 'end' });
  yy += 16;
  const fw = (w - 52) / 2;
  m += rect(x + 20, yy, fw, 40, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'idcard', x + 30, yy + 10, 20, C.t2, 1.8) + text(x + 58, yy + 25.5, 'Badge  DL-••••17', { size: 15, fill: '#FFFFFF' });
  m += rect(x + 32 + fw, yy, fw, 40, { r: 6, fill: '#282828', stroke: C.t3 }) + icon(F, 'key', x + 42 + fw, yy + 10, 20, C.t2, 1.8) + text(x + 70 + fw, yy + 25.5, 'PIN  ••••••', { size: 15, fill: '#FFFFFF' });
  m += circle(x + w - 36, yy + 20, 9, { fill: GREEN }) + icon(F, 'check', x + w - 42, yy + 14, 12, '#FFFFFF', 2.8);
  mark('badgePin', [x + 20, yy, w - 40, 40]);
  yy += 52;
  m += text(x + 20, yy + 4, 'Your signature closes the incident and locks the audit record.', { size: 13, fill: C.t1 });
  yy += 18;
  const bh = 44;
  m += rect(x + 20.5, yy + 0.5, 139, bh - 1, { r: 7.5, stroke: '#8B8B8B' }) + text(x + 90, yy + 29, 'Cancel', { size: 18, weight: 700, fill: C.t3, anchor: 'middle' });
  const sx = x + 170, sw = w - 190;
  m += rect(sx, yy, sw, bh, { r: 8, fill: '#1F4FBF' }) + icon(F, 'lock', sx + sw / 2 - textWidth('Sign and close', 18, 700) / 2 - 14, yy + 12, 20, '#FFFFFF', 2) + text(sx + sw / 2 + 12, yy + 29, 'Sign and close', { size: 18, weight: 700, fill: '#FFFFFF', anchor: 'middle' });
  if (o.pressed) m += btnState(F, sx, yy, sw, bh, 'pressed');
  mark('signBtn', [sx, yy, sw, bh]);
  const h = yy + bh + 18 - y;
  mark('signDialog', [x, y, w, h]);
  // trim the dialog background to the content height
  m = m.replace(`height="${h0}"`, `height="${h}"`).replace(`height="${h0}"`, `height="${h}"`);
  return { svg: rect(0, 0, W, H, { fill: '#000000', fo: 0.67 }) + g(F, 'Sign-off dialog NEW', m), y: y + h };
}
// S10a: the duty manager's console with the sign-off dialog filled in (badge + PIN), Sign and close not yet pressed;
// behind it the incident is still Critical and Submitted
const S10_RAIL = (signed) => ({ ref: 'Incident PER-005 · from alarm AGF-5-14',
  phases: PHS(P_DET, { state: 'done', sub: 'Confirmed 02:15:24' }, { state: 'done', sub: 'Custody 02:26:30' }, signed ? { state: 'done', sub: 'Closed 02:44:20' } : { state: 'current', sub: 'Awaiting sign-off' }),
  chain: [{ t: 'Submitted · Nurul A.', time: '02:43:50' }, signed ? { t: 'Signed off · Daniel L. (badge + PIN)', time: '02:44:20' } : { t: 'Sign-off · Daniel L.', s: 'current' }, signed ? { t: 'Closed · audit record locked', time: '02:44:20' } : { t: 'Closed', s: 'pending' }] });
function s10a() {
  return build('AV-S10a · Duty manager console · sign-off dialog filled · badge + PIN', {
    user: [DM, 'Duty manager'], cards: { fence: 'Incident PER-005 · awaiting your sign-off' },
    rail: S10_RAIL(false),
    view: VIEW_CLOSE('02:44:14', 'For sign-off · PER-005'),
    panel: { tab: 2, tabDone: [true, true], incident: true, lines: HEAD_INC, body: closeBody({ submitted: 'Submitted by Nurul A. · 02:43:50 · for your sign-off' }) },
    after: F => signDialog(F).svg,
  });
}
// S10b: signed and closed on the duty manager's console: header Closed, confirmation, counters down
function s10b() {
  return build('AV-S10b · Duty manager console · signed off · PER-005 closed 02:44:20', {
    user: [DM, 'Duty manager'], crit: 1, cards: { fence: false },
    rail: S10_RAIL(true),
    view: VIEW_CLOSE('02:44:20', 'For sign-off · PER-005'),
    panel: { tab: 2, tabDone: [true, true, true], incident: true, badge: ['Closed', '#525252'], lines: HEAD_INC, body: closeBody({ submitted: 'Signed off by Daniel L. · 02:44:20 · closed' }) },
    after: F => {
      const x = 396, w = 484, y = 943;
      mark('closedToast', [x, y, w, 70]);
      return confirmToast(F, x, y, 'PER-005 closed · signed by Daniel L.', '02:44:20 · badge + PIN · audit record locked · removed from alerts', { w });
    },
  });
}
// S10c: the operator's console back to quiet, counters down, with the closure notice
function s10c() {
  return build('AV-S10c · Operator console back to quiet · PER-005 closed', {
    home: true, crit: 1, cards: { fence: false },
    after: F => {
      const w = 400, x = 1360 - w, y = 943;
      mark('closedToast', [x, y, w, 70]);
      return confirmToast(F, x, y, 'PER-005 closed · signed by Daniel L.', '02:44:20 · audit record locked', { w });
    },
  });
}
// ---------- alternative path: authorised work found (another night, 01:2x) ----------
const RAIL_ALT = (v, r, z, chain) => ({ ref: 'Alarm AGF-5-14', phases: PHS({ state: 'done', sub: 'Alarm 01:20:31' }, v, r, z), chain });
const VIEW_ALT = ts => ({ opened: 'Opened automatically · 01:20:32', live: CAMS.crew({ chips: LIVE_CH, ts }),
  strip: [CAMS.pre({ href: cctv('fence_wide_clean'), label: 'Replay · CAM 7-11', focus: [0.62, 0.45], zoom: 1.4, boxes: [], scrub: ['01:20:14', 0.62, { now: 0.3 }], chips: [['Pre-alarm', '#3A404B']] }),
    { label: 'Gate G-5 · access log', icon: 'idcard', empty: '' }],
  map: { cams: CAMLIST(), works: true, people: [[-6, 2], [6, 3]], peopleLabel: 'PTW-2231 · crew of 2' } });
const gateCard = F => {
  const sw = (TW - 8) / 2, x = TX + sw + 8, y = ST.y + 34;
  let s = '';
  [['01:05:12', 'Contractor badge · PTW-2231'], ['01:05:20', 'Contractor badge · PTW-2231']].forEach(([t, l], i) => {
    s += text(x + 12, y + 16 + i * 22, t, { size: 12, weight: 500, fill: '#FFFFFF' }) + text(x + 72, y + 16 + i * 22, l, { size: 12, fill: C.t1 });
  });
  s += text(x + 12, y + 66, 'Badge-in at G-5 · crew of 2', { size: 12, weight: 500, fill: '#BFEFF6' });
  return g(F, 'Gate log NEW', s);
};
function a1() {
  return build('AV-A1 · Alternative path · permit PTW-2231 found · Authorised activity highlighted', {
    cards: { fence: 'Climb on 5-14 · permit PTW-2231 found', alt: true },
    rail: RAIL_ALT({ state: 'current', sub: 'Your decision' }, { state: 'pending', sub: 'Not needed yet' }, { state: 'pending', sub: 'Not started' },
      [{ t: 'Permit PTW-2231 found', time: '01:20:38' }, { t: 'Corroborated · 3 sensors, 2 people', time: '01:20:45' }, { t: 'Your decision', s: 'current' }]),
    view: VIEW_ALT('01:21:05'),
    panel: { tab: 0, t0: '01:20:31', lines: [[{ b: 'AgilFence 5-14' }, ' · climb signature · north perimeter'], ['Owner ', { b: OWNER }, ' · works permit PTW-2231 on 5-14']],
      body: verifyBody({ alt: true, corrPill: ['Corroborated', 'ok'], corrStatus: 'Corroborated · 3 sensors, 2 people at the works', authPill: ['Found · PTW-2231', 'found'] }) },
    after: gateCard,
  });
}
function a2() {
  return build('AV-A2 · Resolved as authorised activity · Nurul A. 01:22:10 · no incident raised', {
    crit: 1, cards: { fence: false, alt: true },
    rail: RAIL_ALT({ state: 'done', sub: 'Authorised 01:22:10' }, { state: 'skip', sub: 'Not needed' }, { state: 'done', sub: 'Resolved 01:22:10' },
      [{ t: 'Works supervisor called to confirm crew', time: '01:21:40' }, { t: 'Resolved as authorised activity · Nurul A.', time: '01:22:10' }, { t: 'No incident raised · no patrol dispatched' }]),
    view: (v => ({ ...v, map: { ...v.map, lidar: false } }))(VIEW_ALT('01:22:10')),
    panel: { tab: 0, t0: '01:20:31', badge: ['Resolved', '#525252'], lines: [[{ b: 'AgilFence 5-14' }, ' · climb signature · north perimeter'], ['Owner ', { b: OWNER }, ' · works permit PTW-2231 on 5-14']],
      body: verifyBody({ alt: true, corrPill: ['Corroborated', 'ok'], corrStatus: 'Corroborated · 3 sensors, 2 people at the works', authPill: ['Found · PTW-2231', 'found'], pressed: 'authorised', recorded: 'Authorised activity · Nurul A. · 01:22:10' }) },
    after: F => {
      let s = gateCard(F);
      const x = 396, w = 484, y = 893, h = 120;
      let t = rect(x, y, w, h, { r: 10, fill: '#1D232C', fo: 0.97, stroke: GREEN, sw: 1.2, filter: F.shadow(8, 14, 0.5) });
      t += circle(x + 26, y + 28, 12, { fill: GREEN }) + icon(F, 'check', x + 18, y + 20, 16, '#FFFFFF', 3);
      t += text(x + 50, y + 30, 'Resolved as authorised activity · Nurul A. · 01:22:10', { size: 15, weight: 700, fill: '#FFFFFF' });
      t += text(x + 50, y + 52, 'Linked to PTW-2231 · alarm kept in the record', { size: 13, fill: C.t1 });
      t += text(x + 50, y + 72, 'No incident raised · no patrol dispatched', { size: 13, fill: C.t1 });
      t += icon(F, 'phone', x + 50, y + 85, 14, C.t2, 2) + text(x + 70, y + 97, 'Works supervisor called to confirm crew · 01:21:40', { size: 13, fill: C.t2 });
      s += g(F, 'Resolved confirmation NEW', t);
      mark('resolvedToast', [x, y, w, h]);
      return s;
    },
  });
}

export const FRAMES = [
  ['AV-S1-quiet', s1],
  ['AV-S2-alarm-view-auto', s2],
  ['AV-S3-verification', s3],
  ['AV-S4-confirm-click', s4],
  ['AV-S5-incident-response-lanes', s5],
  ['AV-S6-dispatch-click', s6],
  ['AV-S7-response-running-ptz-handover', s7],
  ['AV-S8-on-scene-outcomes', s8],
  ['AV-S9-closure-checklist-submit', s9],
  ['AV-S10a-signoff-dialog', s10a],
  ['AV-S10b-closed', s10b],
  ['AV-S10c-operator-quiet', s10c],
  ['AV-A1-authorised-work-found', a1],
  ['AV-A2-resolved-authorised', a2],
];
