// Airport digital twin in the current V11 3D-viewer look: white "clay" buildings with
// stacked floor slabs on a blue grid. Same world data as twin.mjs; camera can zoom
// onto a world point so "Locate" frames show the incident site up close.
import { T, f, rect, circle, line, poly, text, icon, g, textWidth } from './svg.mjs';
import { TERMINALS, WORLD } from './twin.mjs';

export const V = { crit: '#D72D30', warn: '#D4B741', info: '#4DAFBE', blue: '#3EA9FF', grid: '#2A62C9' };

// camera: centre world point (cx,cy) at screen (sx,sy) with scale sc (px per world unit)
export function camera(sx, sy, sc, cx, cy, o = {}) {
  const th = (o.theta ?? 24) * Math.PI / 180, tilt = o.tilt ?? 0.56;
  const c = Math.cos(th), s = Math.sin(th);
  const U = (X, Y) => X * c - Y * s, Vv = (X, Y) => (X * s + Y * c) * tilt;
  const P = (X, Y, Z = 0) => [sx + (U(X, Y) - U(cx, cy)) * sc, sy + (Vv(X, Y) - Vv(cx, cy)) * sc - Z * sc];
  P.depth = (X, Y) => X * s + Y * c;
  P.sc = sc;
  return P;
}
const q = (P, pts, z = 0) => pts.map(([a, b, zz]) => P(a, b, zz ?? z));

// one clay building: alternating dark glazing bands and white slab edges
function clayBox(F, P, name, x1, y1, x2, y2, floors, o = {}) {
  const fh = o.fh ?? 0.62, gh = fh * 0.62, z0 = o.z0 || 0, H = z0 + floors * fh;
  let s = '';
  for (let k = 0; k < floors; k++) {
    const zb = z0 + k * fh, zg = zb + gh, zt = zb + fh;
    // glazing (recessed look: darker)
    s += poly([P(x1, y2, zb), P(x2, y2, zb), P(x2, y2, zg), P(x1, y2, zg)], { fill: '#3B4049' });
    s += poly([P(x2, y1, zb), P(x2, y2, zb), P(x2, y2, zg), P(x2, y1, zg)], { fill: '#2C3037' });
    // mullions on the long facade
    const n = Math.max(2, Math.round((x2 - x1) / 1.4));
    for (let i = 1; i < n; i++) { const xx = x1 + (x2 - x1) * i / n; s += line(...P(xx, y2, zb), ...P(xx, y2, zg), { stroke: '#6E747D', sw: 0.8, so: 0.6 }); }
    // slab edge
    s += poly([P(x1, y2, zg), P(x2, y2, zg), P(x2, y2, zt), P(x1, y2, zt)], { fill: '#D9DDE2' });
    s += poly([P(x2, y1, zg), P(x2, y2, zg), P(x2, y2, zt), P(x2, y1, zt)], { fill: '#AEB4BC' });
  }
  s += poly([P(x1, y1, H), P(x2, y1, H), P(x2, y2, H), P(x1, y2, H)], { fill: F.lin([[0, '#F4F6F8'], [1, '#D3D8DE']], 0, 0, 1, 1), stroke: '#FFFFFF', so: 0.7, sw: 1 });
  const ins = Math.min(0.9, (x2 - x1) * 0.12, (y2 - y1) * 0.12);
  s += poly([P(x1 + ins, y1 + ins, H), P(x2 - ins, y1 + ins, H), P(x2 - ins, y2 - ins, H), P(x1 + ins, y2 - ins, H)], { stroke: '#9AA1AA', sw: 1, so: 0.6 });
  return g(F, name, s);
}
function plane(P, cx, cy, ang, sz = 1) {
  const sh = [[0, -1.9], [0.22, -1.6], [0.25, -0.3], [1.75, 0.35], [1.75, 0.6], [0.25, 0.35], [0.2, 1.35], [0.75, 1.75], [0.75, 1.92], [0, 1.8], [-0.75, 1.92], [-0.75, 1.75], [-0.2, 1.35], [-0.25, 0.35], [-1.75, 0.6], [-1.75, 0.35], [-0.25, -0.3], [-0.22, -1.6]];
  const c = Math.cos(ang), s = Math.sin(ang);
  return poly(sh.map(([a, b]) => P(cx + (a * c - b * s) * sz, cy + (a * s + b * c) * sz, 0.12)), { fill: '#E9ECEF', stroke: '#FFFFFF', so: 0.5, sw: 0.6 });
}
function wedge(P, cx, cy, r, a0, a1, col) {
  const p = [[cx, cy]];
  for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return poly(p.map(([a, b]) => P(a, b, 0.05)), { fill: col, fo: 0.12, stroke: col, so: 0.5, sw: 1 });
}

// V11-style map marker: severity disc + white icon, optional label pill
export function marker(F, P, m) {
  const col = m.col || { Critical: V.crit, Warning: V.warn, Info: V.info }[m.sev] || V.blue;
  const k = m.scale || 1;
  const [bx, by] = P(m.X, m.Y, 0), [hx, hy] = P(m.X, m.Y, m.h ?? 4.5);
  let s = '';
  const ring = [];
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; ring.push(P(m.X + 1.6 * Math.cos(a), m.Y + 1.6 * Math.sin(a), 0.05)); }
  s += poly(ring, { fill: col, fo: 0.22, stroke: col, so: 0.9, sw: 1.5 });
  s += line(bx, by, hx, hy + 14 * k, { stroke: col, sw: 2 });
  s += circle(hx, hy, 18 * k, { fill: col, fo: 0.3, filter: F.blur(5 * k) }) + circle(hx, hy, 15 * k, { fill: col, stroke: '#FFFFFF', sw: 2 });
  // numbered marker (deck demo map) or icon marker (product UI)
  if (m.num !== undefined) s += text(hx, hy + 6 * k, String(m.num), { size: Math.round(17 * k), weight: 700, fill: m.numCol || '#FFFFFF', anchor: 'middle' });
  else s += icon(F, m.icon || 'alert', hx - 8.5 * k, hy - 8.5 * k, 17 * k, '#FFFFFF', 2);
  if (m.label) {
    const lw = textWidth(m.label, 14, 500) + 24;
    const lx = m.left ? hx - 22 * k - lw : hx + 22 * k, ly = hy - 16;
    s += rect(lx, ly, lw, 32, { r: 8, fill: '#1D232C', fo: 0.92, stroke: col, sw: 1.5 }) + text(lx + 12, ly + 21, m.label, { size: 14, weight: 500, fill: '#FFFFFF' });
  }
  return g(F, 'Marker ' + (m.id || m.label || ''), s);
}

export function clayAirport(F, P, o = {}) {
  let s = '';
  // grid (axonometric, aligned with the twin), fading with distance
  let gr = '';
  if (o.grid !== false) for (let k = -60; k <= 160; k += 4) {
    gr += line(...P(k, -60), ...P(k, 120), { stroke: V.grid, so: 0.28, sw: 1 });
  }
  if (o.grid !== false) for (let k = -60; k <= 120; k += 4) gr += line(...P(-60, k), ...P(160, k), { stroke: V.grid, so: 0.28, sw: 1 });
  s += g(F, 'Grid', gr);
  // site plate
  s += g(F, 'Site plate', poly([P(0, 0), P(WORLD.w, 0), P(WORLD.w, WORLD.h), P(0, WORLD.h)], { fill: '#0B0F15', fo: 0.92, stroke: '#5C83C9', so: 0.45, sw: 1.2 }));
  let rw = '';
  const runway = (x1, x2, y1, y2) => {
    let r = poly(q(P, [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]), { fill: '#252A31' });
    for (let X = x1 + 4; X < x2 - 4; X += 3) r += line(...P(X, (y1 + y2) / 2), ...P(X + 1.6, (y1 + y2) / 2), { stroke: '#FFFFFF', so: 0.7, sw: 1.2 });
    return r;
  };
  rw += runway(6, 94, 3.5, 6.5) + runway(10, 96, 51, 54);
  rw += poly(q(P, [[9, 12.5], [96, 12.5], [96, 44.5], [9, 44.5]]), { fill: '#151A21' });
  s += g(F, 'Airside surfaces', rw);
  if (o.lidar !== false) s += g(F, 'LiDAR coverage', [[57, 1, 0.15, Math.PI - 0.15], [71, 1, 0.15, Math.PI - 0.15], [99, 30, Math.PI / 2 + 0.15, Math.PI * 1.5 - 0.15]].map(([X, Y, a0, a1]) => wedge(P, X, Y, 7.5, a0, a1, V.info)).join(''));
  // aircraft
  let ac = '';
  for (const t of TERMINALS) for (const [px1, px2, py1, py2] of t.piers) {
    const n = Math.floor((py2 - py1) / 4.2);
    for (let i = 0; i < n; i++) {
      const yy = py1 + 2.2 + i * 4.2;
      if ((i + t.id.length + px1) % 3 !== 1) ac += plane(P, px1 - 2.4, yy, Math.PI / 2, 0.95);
      if ((i + px2) % 3 !== 0) ac += plane(P, px2 + 2.4, yy, -Math.PI / 2, 0.95);
    }
  }
  s += g(F, 'Aircraft', ac);
  // fence
  const per = [[1, 1], [99, 1], [99, 57], [1, 57], [1, 1]];
  let fe = '';
  for (let e = 0; e < 4; e++) fe += line(...P(...per[e], 0.6), ...P(...per[e + 1], 0.6), { stroke: V.blue, so: 0.55, sw: 1.4 });
  if (o.alarmFence !== false) fe += line(...P(57, 1, 0.6), ...P(71, 1, 0.6), { stroke: V.crit, sw: 3 }) + line(...P(57, 1, 0.6), ...P(71, 1, 0.6), { stroke: V.crit, sw: 9, so: 0.3 });
  s += g(F, 'AGIL Fence', fe);
  // buildings (painter's order)
  const blds = [];
  for (const t of TERMINALS) {
    const fl = Math.round(t.h / 0.62);
    blds.push({ d: P.depth((t.x1 + t.x2) / 2, (t.y1 + t.y2) / 2), svg: () => clayBox(F, P, 'Terminal ' + t.id, t.x1, t.y1, t.x2, t.y2, fl) });
    t.piers.forEach(([a, b, c, d], i) => blds.push({ d: P.depth((a + b) / 2, (c + d) / 2), svg: () => clayBox(F, P, `Pier ${t.id}-${i + 1}`, a, c, b, d, 2) }));
  }
  blds.push({ d: P.depth(41, 18), svg: () => clayBox(F, P, 'Control tower', 40.2, 17.2, 41.8, 18.8, 12) + clayBox(F, P, 'Tower cab', 39.6, 16.6, 42.4, 19.4, 2, { z0: 12 * 0.62 }) });
  for (const [a, b, c, d, nm] of [[2.5, 7.5, 14, 18.5, 'Cargo 1'], [2.5, 7.5, 20, 24.5, 'Cargo 2'], [2.5, 7.5, 27, 31, 'Cargo 3']]) blds.push({ d: P.depth((a + b) / 2, (c + d) / 2), svg: () => clayBox(F, P, nm, a, c, b, d, 2) });
  blds.sort((a, b) => a.d - b.d);
  s += g(F, 'Buildings', blds.map(b => b.svg()).join(''));
  // terminal labels
  if (o.labels !== false) {
    let lb = '';
    for (const t of TERMINALS) {
      const [lx, ly] = P(t.labLeft ? t.x1 + 0.5 : t.x2 - 2.5, t.y1, t.h + 0.4);
      lb += g(F, 'Label ' + t.id, rect(lx - 4, ly - 30, 36, 24, { r: 6, fill: '#1D232C', fo: 0.9 }) + text(lx + 14, ly - 13, t.id, { size: 14, weight: 700, fill: '#FFFFFF', anchor: 'middle' }));
    }
    s += g(F, 'Terminal labels', lb);
  }
  for (const m of o.markers || []) s += marker(F, P, m);
  return g(F, 'Digital twin (3D viewer)', s);
}
