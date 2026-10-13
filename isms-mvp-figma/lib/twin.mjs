// 3D digital twin (axonometric) of a generic airport, drawn as flat vector faces so it
// stays fully editable in Figma. World units ~ 40 m; X runs along the runways.
import { T, SEV, f, rect, circle, line, pathEl, poly, text, icon, g, textWidth } from './svg.mjs';

export function projector(x, y, w, h, worldW, worldH, o = {}) {
  const th = (o.theta ?? 20) * Math.PI / 180, tilt = o.tilt ?? 0.6, zk = o.zk ?? 1;
  const c = Math.cos(th), s_ = Math.sin(th);
  const U = (X, Y) => X * c - Y * s_, V = (X, Y) => (X * s_ + Y * c) * tilt;
  const corners = [[0, 0], [worldW, 0], [0, worldH], [worldW, worldH]];
  const us = corners.map(([a, b]) => U(a, b)), vs = corners.map(([a, b]) => V(a, b));
  const uMin = Math.min(...us), uMax = Math.max(...us), vMin = Math.min(...vs), vMax = Math.max(...vs);
  const sc = Math.min(w / (uMax - uMin), (h - (o.headroom ?? 60)) / (vMax - vMin)) * (o.fill ?? 0.94);
  const ox = x + (w - (uMax - uMin) * sc) / 2 - uMin * sc;
  const oy = y + (o.headroom ?? 60) + (h - (o.headroom ?? 60) - (vMax - vMin) * sc) / 2 - vMin * sc;
  const P = (X, Y, Z = 0) => [ox + U(X, Y) * sc, oy + V(X, Y) * sc - Z * sc * zk];
  P.depth = (X, Y) => X * s_ + Y * c;
  P.sc = sc;
  return P;
}

const pts = (P, list, z = 0) => list.map(([a, b, zz]) => P(a, b, zz ?? z));
export function ground(P, list, o) { return poly(pts(P, list, o.z || 0), o); }

// extruded box: faces visible for θ∈(0,90): top, front (y=y2), right (x=x2)
export function box(F, P, name, x1, y1, x2, y2, h, o = {}) {
  const z0 = o.z0 || 0, z1 = z0 + h;
  const top = o.top || F.lin([[0, '#2A4677'], [1, '#18294A']], 0, 0, 1, 1);
  const front = o.front || '#13213C', right = o.right || '#0C172C';
  const edge = o.edge || '#8FB4FF';
  let s = '';
  s += poly([P(x1, y2, z0), P(x2, y2, z0), P(x2, y2, z1), P(x1, y2, z1)], { fill: front, stroke: edge, so: 0.22, sw: 1 });
  s += poly([P(x2, y1, z0), P(x2, y2, z0), P(x2, y2, z1), P(x2, y1, z1)], { fill: right, stroke: edge, so: 0.22, sw: 1 });
  // window bands on facades
  if (o.windows && h > 1) {
    for (let zz = z0 + 0.6; zz < z1 - 0.3; zz += 0.7) {
      s += line(...P(x1 + 0.3, y2, zz), ...P(x2 - 0.3, y2, zz), { stroke: '#8FB4FF', so: 0.16, sw: 1 });
      s += line(...P(x2, y1 + 0.3, zz), ...P(x2, y2 - 0.3, zz), { stroke: '#8FB4FF', so: 0.12, sw: 1 });
    }
  }
  s += poly([P(x1, y1, z1), P(x2, y1, z1), P(x2, y2, z1), P(x1, y2, z1)], { fill: top, stroke: edge, so: o.edgeO ?? 0.55, sw: 1.1 });
  if (o.roof) s += poly([P(x1 + 0.8, y1 + 0.8, z1), P(x2 - 0.8, y1 + 0.8, z1), P(x2 - 0.8, y2 - 0.8, z1), P(x1 + 0.8, y2 - 0.8, z1)], { stroke: edge, so: 0.18, sw: 1 });
  return g(F, name, s);
}

function plane(P, cx, cy, ang, sz = 1, z = 0.12) {
  const sh = [[0, -1.9], [0.22, -1.6], [0.25, -0.3], [1.75, 0.35], [1.75, 0.6], [0.25, 0.35], [0.2, 1.35], [0.75, 1.75], [0.75, 1.92], [0, 1.8], [-0.75, 1.92], [-0.75, 1.75], [-0.2, 1.35], [-0.25, 0.35], [-1.75, 0.6], [-1.75, 0.35], [-0.25, -0.3], [-0.22, -1.6]];
  const c = Math.cos(ang), s = Math.sin(ang);
  return poly(sh.map(([a, b]) => P(cx + (a * c - b * s) * sz, cy + (a * s + b * c) * sz, z)), { fill: '#D7E2F5', fo: 0.85, stroke: '#FFFFFF', so: 0.4, sw: 0.6 });
}
function wedge(P, cx, cy, r, a0, a1, col, z = 0.05) {
  const p = [[cx, cy]];
  for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return poly(p.map(([a, b]) => P(a, b, z)), { fill: col, fo: 0.13, stroke: col, so: 0.45, sw: 1 });
}
function ringW(P, cx, cy, r, col, o = {}) {
  const p = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; p.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), 0.05)); }
  return poly(p, { fill: col, fo: o.fo ?? 0.14, stroke: col, so: o.so ?? 0.7, sw: o.sw || 1.4, dash: o.dash });
}

// pin: {id, X, Y, sev, icon, label, sub, selected}
export function pin(F, P, p, o = {}) {
  const col = SEV[p.sev] || T.blue;
  const [bx, by] = P(p.X, p.Y, 0), [hx, hy] = P(p.X, p.Y, p.h || 5.5);
  let s = ringW(P, p.X, p.Y, 2.2, col, { fo: 0.10, so: 0.35 }) + ringW(P, p.X, p.Y, 1.1, col, { fo: 0.25, so: 0.9 });
  s += line(bx, by, hx, hy + 14, { stroke: col, sw: 1.5, so: 0.8 });
  s += circle(hx, hy, 20, { fill: col, fo: 0.22, filter: F.blur(6) });
  s += circle(hx, hy, 15, { fill: '#0A0F1A', stroke: col, sw: 2 });
  s += icon(F, p.icon || 'alert', hx - 8.5, hy - 8.5, 17, col, 2);
  if (p.selected || o.labels) {
    const lw = Math.max(textWidth(p.label, 13, 600), textWidth(p.sub || '', 11.5, 400)) + 28;
    const lx = p.left ? hx - 24 - lw : hx + 24, ly = hy - 24;
    s += rect(lx, ly, lw, p.sub ? 50 : 32, { r: 12, fill: '#0A0F1A', fo: 0.88, stroke: col, so: p.selected ? 0.9 : 0.35, sw: p.selected ? 1.5 : 1 });
    s += text(lx + 14, ly + 21, p.label, { size: 13, weight: 600, fill: T.t1 });
    if (p.sub) s += text(lx + 14, ly + 39, p.sub, { size: 11.5, fill: T.t3 });
  }
  return g(F, 'Pin ' + (p.id || p.label), s);
}

// ---------- the airport ----------
export const TERMINALS = [
  { id: 'T1', x1: 11, x2: 21, y1: 25, y2: 32, h: 2.4, piers: [[12.5, 14.6, 15, 25], [17.5, 19.6, 32, 42]] },
  { id: 'T2', x1: 26, x2: 37, y1: 25, y2: 32, h: 2.6, piers: [[28, 30, 15, 25], [33, 35, 32, 42]] },
  { id: 'T3', labLeft: true, x1: 44, x2: 58, y1: 24, y2: 32, h: 3.2, piers: [[46, 48.2, 14, 24], [53, 55.2, 32, 43]] },
  { id: 'T4', x1: 64, x2: 72, y1: 26, y2: 32, h: 2.0, piers: [[66.5, 68.5, 32, 41]] },
  { id: 'T5', x1: 78, x2: 94, y1: 24, y2: 33, h: 3.4, piers: [[79.5, 81.7, 14, 24], [85, 87.2, 14, 24], [90.5, 92.7, 33, 43]] },
];
export const WORLD = { w: 100, h: 58 };

export function airport(F, x, y, w, h, o = {}) {
  const P = projector(x, y, w, h, WORLD.w, WORLD.h, { headroom: o.headroom ?? 70, fill: o.fill ?? 0.95 });
  const Lr = { cams: true, fence: true, lidar: true, access: true, incidents: true, ...(o.layers || {}) };
  let s = '';
  // plate slab
  const slab = 1.6;
  s += g(F, 'Site plate',
    poly([P(0, WORLD.h, 0), P(WORLD.w, WORLD.h, 0), P(WORLD.w, WORLD.h, -slab), P(0, WORLD.h, -slab)], { fill: '#0A1222' }) +
    poly([P(WORLD.w, 0, 0), P(WORLD.w, WORLD.h, 0), P(WORLD.w, WORLD.h, -slab), P(WORLD.w, 0, -slab)], { fill: '#070D19' }) +
    poly([P(0, 0), P(WORLD.w, 0), P(WORLD.w, WORLD.h), P(0, WORLD.h)], { fill: F.lin([[0, '#0F1A30'], [1, '#0B1324']], 0, 0, 1, 1), stroke: '#8FB4FF', so: 0.25 }));
  // grid
  let gr = '';
  for (let X = 5; X < WORLD.w; X += 5) gr += line(...P(X, 0), ...P(X, WORLD.h), { stroke: '#8FB4FF', so: 0.045 });
  for (let Y = 5; Y < WORLD.h; Y += 5) gr += line(...P(0, Y), ...P(WORLD.w, Y), { stroke: '#8FB4FF', so: 0.045 });
  s += g(F, 'Grid', gr);
  // airside surfaces
  let rw = '';
  const runway = (x1, x2, y1, y2, lab) => {
    let r = ground(P, [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], { fill: '#1A2438', stroke: '#8FB4FF', so: 0.18 });
    for (let X = x1 + 4; X < x2 - 4; X += 3) r += line(...P(X, (y1 + y2) / 2), ...P(X + 1.6, (y1 + y2) / 2), { stroke: '#FFFFFF', so: 0.5, sw: 1.2 });
    for (let k = 0; k < 4; k++) { const yy = y1 + 0.5 + k * (y2 - y1 - 1) / 3; r += line(...P(x1 + 0.6, yy), ...P(x1 + 2.2, yy), { stroke: '#FFFFFF', so: 0.45, sw: 1 }) + line(...P(x2 - 2.2, yy), ...P(x2 - 0.6, yy), { stroke: '#FFFFFF', so: 0.45, sw: 1 }); }
    return g(F, 'Runway ' + lab, r);
  };
  rw += runway(6, 94, 3.5, 6.5, '02L');
  rw += runway(10, 96, 51, 54, '02R');
  rw += ground(P, [[8, 9], [92, 9], [92, 10], [8, 10]], { fill: '#141E31' }) + ground(P, [[8, 47], [94, 47], [94, 48], [8, 48]], { fill: '#141E31' });
  for (const X of [18, 38, 60, 82]) rw += ground(P, [[X, 6.5], [X + 1, 6.5], [X + 1, 9], [X, 9]], { fill: '#141E31' }) + ground(P, [[X + 4, 48], [X + 5, 48], [X + 5, 51], [X + 4, 51]], { fill: '#141E31' });
  rw += ground(P, [[9, 12.5], [96, 12.5], [96, 44.5], [9, 44.5]], { fill: '#13203A', fo: 0.6, stroke: '#8FB4FF', so: 0.08 });
  s += g(F, 'Airside surfaces', rw);
  // LiDAR coverage
  if (Lr.lidar) {
    let l = '';
    for (const [X, Y, a0, a1] of [[57, 1, 0.15, Math.PI - 0.15], [71, 1, 0.15, Math.PI - 0.15], [99, 30, Math.PI / 2 + 0.15, Math.PI * 1.5 - 0.15], [30, 57, Math.PI + 0.15, Math.PI * 2 - 0.15]]) l += wedge(P, X, Y, 7.5, a0, a1, T.teal);
    s += g(F, 'Layer LiDAR coverage', l);
  }
  // cameras
  if (Lr.cams) {
    let c = '';
    const cams = [[15, 33.5, 1.2], [31, 33.5, 1.4], [50, 33, 1.3], [56, 23, -1.6], [68, 33, 1.3], [84, 34, 1.5], [47, 13.5, -1.5], [86, 13.5, -1.6], [24, 44, -1.2], [62, 44, -1.4], [92, 44, -1.6], [8, 20, 0.2]];
    for (const [X, Y, a] of cams) c += wedge(P, X, Y, 2.6, a - 0.45, a + 0.45, T.blue, 0.06) + circle(...P(X, Y, 0.1), 2.6, { fill: T.ice });
    s += g(F, 'Layer cameras', c);
  }
  // aircraft at piers
  let ac = '';
  for (const t of TERMINALS) for (const [px1, px2, py1, py2] of t.piers) {
    const n = Math.floor((py2 - py1) / 4.2);
    for (let i = 0; i < n; i++) {
      const yy = py1 + 2.2 + i * 4.2;
      if ((i + t.id.length + px1) % 3 !== 1) ac += plane(P, px1 - 2.4, yy, Math.PI / 2, 0.95);
      if ((i + px2) % 3 !== 0) ac += plane(P, px2 + 2.4, yy, -Math.PI / 2, 0.95);
    }
  }
  ac += plane(P, 30, 5, Math.PI, 1.05) + plane(P, 70, 52.5, 0, 1.05);
  s += g(F, 'Aircraft', ac);
  // fence (back + left edges first)
  const fenceSeg = (a, b, col, alarm) => {
    const hh = 0.9;
    let r = poly([P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], hh), P(a[0], a[1], hh)], { fill: col, fo: alarm ? 0.5 : 0.18 });
    r += line(...P(a[0], a[1], hh), ...P(b[0], b[1], hh), { stroke: col, sw: alarm ? 2.5 : 1.4, so: alarm ? 1 : 0.7 });
    if (alarm) r += line(...P(a[0], a[1], hh), ...P(b[0], b[1], hh), { stroke: col, sw: 8, so: 0.35 });
    return r;
  };
  const sectors = [];
  // perimeter path: back edge Y=1 (X 1→99), right X=99 (Y 1→57), front Y=57 (X 99→1), left X=1 (Y 57→1)
  const per = [[1, 1], [99, 1], [99, 57], [1, 57], [1, 1]];
  let sid = 1;
  for (let e = 0; e < 4; e++) {
    const [a, b] = [per[e], per[e + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(len / 14);
    for (let i = 0; i < n; i++) {
      const p0 = [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], p1 = [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n];
      sectors.push({ id: sid++, a: p0, b: p1, edge: e });
    }
  }
  const alarmSec = o.alarmSector ?? 5;
  if (Lr.fence) {
    s += g(F, 'Layer AGIL Fence (rear)', sectors.filter(q => q.edge === 0 || q.edge === 3).map(q => fenceSeg(q.a, q.b, q.id === alarmSec ? T.crit : T.teal, q.id === alarmSec)).join(''));
  }
  // buildings (painter's order)
  const blds = [];
  for (const t of TERMINALS) {
    blds.push({ d: P.depth((t.x1 + t.x2) / 2, (t.y1 + t.y2) / 2), svg: () => box(F, P, 'Terminal ' + t.id, t.x1, t.y1, t.x2, t.y2, t.h, { windows: true, roof: true }) });
    t.piers.forEach(([a, b, c, d], i) => blds.push({ d: P.depth((a + b) / 2, (c + d) / 2), svg: () => box(F, P, `Pier ${t.id}-${i + 1}`, a, c, b, d, 1.3, { top: F.lin([[0, '#223B66'], [1, '#162845']], 0, 0, 1, 1) }) }));
  }
  blds.push({ d: P.depth(41, 18), svg: () => box(F, P, 'Control tower', 40.2, 17.2, 41.8, 18.8, 8, {}) + box(F, P, 'Tower cab', 39.6, 16.6, 42.4, 19.4, 1.3, { z0: 8, top: '#2D5BFF', edgeO: 0.9 }) });
  for (const [a, b, c, d, nm] of [[2.5, 7.5, 14, 18.5, 'Cargo 1'], [2.5, 7.5, 20, 24.5, 'Cargo 2'], [2.5, 7.5, 27, 31, 'Cargo 3']]) blds.push({ d: P.depth((a + b) / 2, (c + d) / 2), svg: () => box(F, P, nm, a, c, b, d, 1.3, { top: '#1A2A46' }) });
  blds.sort((a, b) => a.d - b.d);
  s += g(F, 'Buildings', blds.map(b => b.svg()).join(''));
  if (Lr.fence) s += g(F, 'Layer AGIL Fence (front)', sectors.filter(q => q.edge === 1 || q.edge === 2).map(q => fenceSeg(q.a, q.b, q.id === alarmSec ? T.crit : T.teal, q.id === alarmSec)).join(''));
  // terminal labels
  let lb = '';
  for (const t of TERMINALS) {
    const [lx, ly] = P(t.labLeft ? t.x1 + 0.5 : t.x2 - 2.5, t.y1, t.h + 0.2);
    lb += g(F, 'Label ' + t.id, rect(lx - 2, ly - 30, 34, 22, { r: 7, fill: '#05070D', fo: 0.7, stroke: '#FFFFFF', so: 0.15 }) + text(lx + 15, ly - 14.5, t.id, { size: 12, weight: 700, fill: T.t1, anchor: 'middle' }));
  }
  s += g(F, 'Terminal labels', lb);
  // links between pins (e.g. impossible presence)
  for (const k of o.links || []) {
    const [a, b] = [P(k.a[0], k.a[1], 5.5), P(k.b[0], k.b[1], 5.5)];
    const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 60;
    s += pathEl(`M${f(a[0])} ${f(a[1])} Q${f(mx)} ${f(my)} ${f(b[0])} ${f(b[1])}`, { stroke: SEV[k.sev] || T.high, sw: 1.6, dash: '5 5', so: 0.85 });
  }
  if (Lr.incidents) s += g(F, 'Layer incidents', (o.pins || []).map(p => pin(F, P, p)).join(''));
  return { svg: g(F, o.name || 'Digital twin', s), P, sectors };
}

// small regional site (federation view)
export function smallSite(F, x, y, w, h, o = {}) {
  const P = projector(x, y, w, h, 60, 34, { headroom: o.headroom ?? 40, fill: 0.92 });
  let s = '';
  s += poly([P(0, 34, 0), P(60, 34, 0), P(60, 34, -1.2), P(0, 34, -1.2)], { fill: '#0A1222' }) + poly([P(60, 0, 0), P(60, 34, 0), P(60, 34, -1.2), P(60, 0, -1.2)], { fill: '#070D19' });
  s += poly([P(0, 0), P(60, 0), P(60, 34), P(0, 34)], { fill: '#0E182C', stroke: '#8FB4FF', so: 0.25 });
  for (let X = 5; X < 60; X += 5) s += line(...P(X, 0), ...P(X, 34), { stroke: '#8FB4FF', so: 0.045 });
  for (let Y = 5; Y < 34; Y += 5) s += line(...P(0, Y), ...P(60, Y), { stroke: '#8FB4FF', so: 0.045 });
  s += ground(P, [[5, 5], [55, 5], [55, 8], [5, 8]], { fill: '#1A2438', stroke: '#8FB4FF', so: 0.18 });
  for (let X = 9; X < 51; X += 3) s += line(...P(X, 6.5), ...P(X + 1.5, 6.5), { stroke: '#FFFFFF', so: 0.5 });
  s += ground(P, [[10, 11], [40, 11], [40, 22], [10, 22]], { fill: '#13203A', fo: 0.7 });
  s += plane(P, 18, 16, Math.PI / 2, 1.1) + plane(P, 27, 16, Math.PI / 2, 0.9);
  s += wedge(P, 59, 17, 7, Math.PI / 2 + 0.2, Math.PI * 1.5 - 0.2, T.teal) + wedge(P, 30, 33, 6, Math.PI + 0.2, Math.PI * 2 - 0.2, T.teal);
  const per = [[1, 1], [59, 1], [59, 33], [1, 33], [1, 1]];
  let fr = '', ff = '';
  per.slice(0, 4).forEach((a, e) => {
    const b = per[e + 1];
    const seg = poly([P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], 0.8), P(a[0], a[1], 0.8)], { fill: T.teal, fo: 0.18 }) + line(...P(a[0], a[1], 0.8), ...P(b[0], b[1], 0.8), { stroke: T.teal, sw: 1.4, so: 0.7 });
    if (e === 0 || e === 3) fr += seg; else ff += seg;
  });
  s += fr;
  s += box(F, P, 'Small terminal', 42, 13, 54, 22, 2.2, { windows: true, roof: true });
  s += box(F, P, 'Hangar', 12, 25, 22, 31, 2.4, { top: '#1A2A46' }) + box(F, P, 'Fire station', 26, 26, 31, 30, 1.2, { top: '#1A2A46' });
  s += box(F, P, 'Edge node', 35, 25, 37, 27, 1.2, { top: '#2D5BFF', edgeO: 0.9 });
  s += ff;
  for (const p of o.pins || []) s += pin(F, P, p);
  return { svg: g(F, o.name || 'Small site twin', s), P };
}
