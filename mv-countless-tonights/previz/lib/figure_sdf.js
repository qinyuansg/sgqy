// figure_sdf.js — signed-distance sculpting + surface-nets meshing + skin weights.
// Shared by figure.js (bodies, garments, hair) and hand.js (detailed hands).
// Everything here is deterministic and runs once at build time (no per-frame work).
//
//   const f = new Field();                       // a sculpt = ordered list of primitives
//   f.add(prim('ellipsoid', {c:[0,1,0], r:[.1,.2,.1]}), {k:0.02, bone:3});
//   const m = meshField((x,y,z)=>f.eval(x,y,z), bbox, 0.008);   // {pos, nrm, idx}
//   const w = f.weights(m.pos, {tau:0.012});                       // {skinIndex, skinWeight}
import * as THREE from 'three';

// ---------------------------------------------------------------------------------------------
// Primitives. Each primitive lives in a rigid local frame (centre + rotation) with optional
// anisotropic scale; the canonical shape is evaluated in local space.
// ---------------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3();

export class Prim {
  constructor(type, o) {
    this.type = type;
    this.o = o;
    // frame: world matrix (THREE.Matrix4) or position + quaternion
    const M = o.frame ? o.frame.clone() : new THREE.Matrix4();
    if (o.c) { const t = new THREE.Matrix4().makeTranslation(o.c[0], o.c[1], o.c[2]); M.multiply(t); }
    if (o.rot) { const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.rot[0], o.rot[1], o.rot[2], o.rotOrder || 'XYZ')); M.multiply(r); }
    if (o.quat) M.multiply(new THREE.Matrix4().makeRotationFromQuaternion(o.quat));
    this.M = M;
    const inv = M.clone().invert().elements; // column-major
    // world -> local:  l = R p + t
    this.r00 = inv[0]; this.r01 = inv[4]; this.r02 = inv[8]; this.t0 = inv[12];
    this.r10 = inv[1]; this.r11 = inv[5]; this.r12 = inv[9]; this.t1 = inv[13];
    this.r20 = inv[2]; this.r21 = inv[6]; this.r22 = inv[10]; this.t2 = inv[14];
    const s = o.s || [1, 1, 1];
    this.isx = 1 / s[0]; this.isy = 1 / s[1]; this.isz = 1 / s[2];
    this.ms = Math.min(s[0], s[1], s[2]);
    this.scaled = s[0] !== 1 || s[1] !== 1 || s[2] !== 1;
    // canonical params
    switch (type) {
      case 'sphere': this.r = o.r; this.br = o.r; this.lc = [0, 0, 0]; break;
      case 'ellipsoid': this.rx = o.r[0]; this.ry = o.r[1]; this.rz = o.r[2]; this.br = Math.max(o.r[0], o.r[1], o.r[2]); this.lc = [0, 0, 0]; break;
      case 'cone': { // round cone from local a to local b
        const a = o.a || [0, 0, 0], b = o.b;
        this.ax = a[0]; this.ay = a[1]; this.az = a[2];
        this.bax = b[0] - a[0]; this.bay = b[1] - a[1]; this.baz = b[2] - a[2];
        this.l2 = this.bax * this.bax + this.bay * this.bay + this.baz * this.baz;
        this.r1 = o.r1; this.r2 = o.r2 ?? o.r1;
        this.rr = this.r1 - this.r2; this.a2 = this.l2 - this.rr * this.rr; this.il2 = 1 / this.l2;
        this.br = Math.sqrt(this.l2) / 2 + Math.max(this.r1, this.r2);
        this.lc = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        break;
      }
      case 'box': this.hx = o.h[0]; this.hy = o.h[1]; this.hz = o.h[2]; this.rad = o.rad || 0; this.br = Math.hypot(o.h[0], o.h[1], o.h[2]) + this.rad; this.lc = [0, 0, 0]; break;
      case 'torus': this.R = o.R; this.tr = o.r; this.br = o.R + o.r; this.lc = [0, 0, 0]; break;
      case 'cyl': this.cr = o.r; this.ch = o.h; this.rad = o.rad || 0; this.br = Math.hypot(o.r, o.h) + this.rad; this.lc = [0, 0, 0]; break; // capped cylinder along local Y, half-height h
      case 'plane': this.br = 1e9; this.lc = [0, 0, 0]; break; // local y > 0 is outside
      case 'fn': this.fn = o.fn; this.br = o.br || 1e9; this.lc = o.lc || [0, 0, 0]; break; // fn(lx,ly,lz) in local
      default: throw new Error('unknown prim ' + type);
    }
    // world bounding sphere
    const sMax = Math.max(s[0], s[1], s[2]);
    _v.set(this.lc[0] * s[0], this.lc[1] * s[1], this.lc[2] * s[2]).applyMatrix4(M);
    this.bx = _v.x; this.by = _v.y; this.bz = _v.z; this.bR = this.br * sMax;
  }
  // local-space canonical distance
  local(x, y, z) {
    switch (this.type) {
      case 'sphere': return Math.sqrt(x * x + y * y + z * z) - this.r;
      case 'ellipsoid': {
        const rx = this.rx, ry = this.ry, rz = this.rz;
        const k0 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
        const k1 = Math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2);
        return k1 < 1e-12 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
      }
      case 'cone': {
        const pax = x - this.ax, pay = y - this.ay, paz = z - this.az;
        const bax = this.bax, bay = this.bay, baz = this.baz, l2 = this.l2;
        const yy = pax * bax + pay * bay + paz * baz;
        const zz = yy - l2;
        const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
        const x2 = qx * qx + qy * qy + qz * qz;
        const y2 = yy * yy * l2, z2 = zz * zz * l2;
        const rr = this.rr, a2 = this.a2, il2 = this.il2;
        const k = Math.sign(rr) * rr * rr * x2;
        if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - this.r2;
        if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - this.r1;
        return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - this.r1;
      }
      case 'box': {
        const qx = Math.abs(x) - this.hx, qy = Math.abs(y) - this.hy, qz = Math.abs(z) - this.hz;
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
        return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - this.rad;
      }
      case 'torus': { const q = Math.sqrt(x * x + z * z) - this.R; return Math.sqrt(q * q + y * y) - this.tr; }
      case 'cyl': {
        const dx = Math.sqrt(x * x + z * z) - this.cr, dy = Math.abs(y) - this.ch;
        const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
        return Math.min(Math.max(dx, dy), 0) + Math.sqrt(ox * ox + oy * oy) - this.rad;
      }
      case 'plane': return y;
      case 'fn': return this.fn(x, y, z);
    }
    return 1e9;
  }
  eval(px, py, pz) {
    let x = this.r00 * px + this.r01 * py + this.r02 * pz + this.t0;
    let y = this.r10 * px + this.r11 * py + this.r12 * pz + this.t1;
    let z = this.r20 * px + this.r21 * py + this.r22 * pz + this.t2;
    if (this.scaled) { x *= this.isx; y *= this.isy; z *= this.isz; return this.local(x, y, z) * this.ms; }
    return this.local(x, y, z);
  }
  // lower bound of distance (bounding sphere)
  lb(px, py, pz) { const dx = px - this.bx, dy = py - this.by, dz = pz - this.bz; return Math.sqrt(dx * dx + dy * dy + dz * dz) - this.bR; }
}
export const prim = (type, o) => new Prim(type, o);

// Ribbon: a band of rectangular (rounded) cross-section swept along a polyline lying on a surface.
// pts: [Vector3], nrm: [Vector3] (surface normals), width/shift: number or per-point arrays,
// th: thickness, lift: centre offset along the normal, closed: loop, rad: corner rounding.
export class Ribbon {
  constructor({ pts, nrm, width, shift = 0, th, lift = 0, closed = false, rad = 0.0012 }) {
    const n = pts.length;
    this.type = 'ribbon'; this.o = {}; this.closed = closed;
    this.P = pts.map((p) => [p.x, p.y, p.z]);
    this.N = nrm.map((v) => [v.x, v.y, v.z]);
    this.W = Array.isArray(width) ? width : pts.map(() => width);
    this.S = Array.isArray(shift) ? shift : pts.map(() => shift);
    this.th = th; this.lift = lift; this.rad = Math.min(rad, th * 0.45);
    this.nseg = closed ? n : n - 1;
    let cx = 0, cy = 0, cz = 0;
    for (const p of this.P) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= n; cy /= n; cz /= n;
    let r = 0;
    for (const p of this.P) r = Math.max(r, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz));
    this.bx = cx; this.by = cy; this.bz = cz; this.bR = r + Math.max(...this.W) + Math.abs(lift) + th + Math.max(...this.S.map(Math.abs));
  }
  lb(px, py, pz) { return Math.hypot(px - this.bx, py - this.by, pz - this.bz) - this.bR; }
  eval(px, py, pz) {
    const P = this.P, n = P.length;
    let best = 1e9, bi = 0, bt = 0;
    for (let i = 0; i < this.nseg; i++) {
      const a = P[i], b = P[(i + 1) % n];
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
      const l2 = ex * ex + ey * ey + ez * ez || 1e-12;
      let t = ((px - a[0]) * ex + (py - a[1]) * ey + (pz - a[2]) * ez) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - a[0] - ex * t, dy = py - a[1] - ey * t, dz = pz - a[2] - ez * t;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) { best = d2; bi = i; bt = t; }
    }
    const i0 = bi, i1 = (bi + 1) % n;
    const a = P[i0], b = P[i1];
    const cx = a[0] + (b[0] - a[0]) * bt, cy = a[1] + (b[1] - a[1]) * bt, cz = a[2] + (b[2] - a[2]) * bt;
    let nx = this.N[i0][0] + (this.N[i1][0] - this.N[i0][0]) * bt, ny = this.N[i0][1] + (this.N[i1][1] - this.N[i0][1]) * bt, nz = this.N[i0][2] + (this.N[i1][2] - this.N[i0][2]) * bt;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // side = n x t
    const sx = ny * tz - nz * ty, sy = nz * tx - nx * tz, sz = nx * ty - ny * tx;
    const w = this.W[i0] + (this.W[i1] - this.W[i0]) * bt, sh = this.S[i0] + (this.S[i1] - this.S[i0]) * bt;
    const qx = px - cx, qy = py - cy, qz = pz - cz;
    const u = Math.abs(qx * sx + qy * sy + qz * sz - sh) - (w / 2 - this.rad);
    const v = Math.abs(qx * nx + qy * ny + qz * nz - this.lift) - (this.th / 2 - this.rad);
    let d = Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0) - this.rad;
    if (!this.closed) { // flat end caps
      let along = 0;
      if (bi === 0 && bt === 0) along = -(qx * tx + qy * ty + qz * tz);
      if (bi === this.nseg - 1 && bt === 1) along = qx * tx + qy * ty + qz * tz;
      if (along > 0) d = Math.max(d, along);
    }
    return w <= 0.0005 ? Math.max(d, 0.001) : d;
  }
}

// Loft: a trunk-like solid through elliptical cross-sections stacked along Y (bind space, world-aligned).
// keys: [{y, a (half-width x), bf (front half-depth, +z), bb (back half-depth), c (z of the section centre)}] sorted by y
// (metres). The section is interpolated with a monotone cubic, sampled every ~2 mm; front and back halves are separate
// half-ellipses sharing the width (C1 at the sides). The distance is slope-corrected so it stays ≈ Lipschitz-1 for the
// narrow-band mesher. y0 / y1 clip the solid (flat caps; overlapping segments of one loft union seamlessly).
export function loftTable(keys, dy = 0.004) {
  const n = keys.length, Y = keys.map((k) => k.y);
  const fields = ['a', 'bf', 'bb', 'c'];
  // natural cubic spline per field (C2: no curvature jumps at the keys -> no Mach bands in raking light)
  const T = { n, Y, V: {}, M: {} };
  for (const f of fields) {
    const v = keys.map((k) => k[f]);
    const M = new Float64Array(n); // second derivatives
    if (n > 2) {
      const a = new Float64Array(n), b = new Float64Array(n), c = new Float64Array(n), d = new Float64Array(n);
      for (let i = 1; i < n - 1; i++) {
        const h0 = Y[i] - Y[i - 1], h1 = Y[i + 1] - Y[i];
        a[i] = h0; b[i] = 2 * (h0 + h1); c[i] = h1; d[i] = 6 * ((v[i + 1] - v[i]) / h1 - (v[i] - v[i - 1]) / h0);
      }
      for (let i = 2; i < n - 1; i++) { const m = a[i] / b[i - 1]; b[i] -= m * c[i - 1]; d[i] -= m * d[i - 1]; } // Thomas
      for (let i = n - 2; i >= 1; i--) M[i] = (d[i] - (i < n - 2 ? c[i] * M[i + 1] : 0)) / b[i];
    }
    T.V[f] = Float64Array.from(v); T.M[f] = M;
  }
  T.yMin = Y[0]; T.yMax = Y[n - 1];
  const N = Math.max(2, Math.ceil((T.yMax - T.yMin) / dy) + 1); T.step = (T.yMax - T.yMin) / (N - 1); T.N = N;
  T.seg = new Int16Array(N); let sgi = 0;
  for (let j = 0; j < N; j++) { const y = T.yMin + j * T.step; while (sgi < n - 2 && y >= Y[sgi + 1]) sgi++; T.seg[j] = sgi; }
  let ma = 0, mb = 0, mc = 0;
  for (let j = 0; j < N; j++) { const q = loftAt(T, T.yMin + j * T.step); ma = Math.max(ma, q[0]); mb = Math.max(mb, q[1], q[2]); mc += q[3] / N; }
  T.maxA = ma; T.maxB = mb; T.midC = mc;
  return T;
}
const _lq = new Float64Array(8);
// evaluate all four fields and their y-derivatives at y -> out [a, bf, bb, c, da, dbf, dbb, dc]
function loftEval(T, y, out = _lq) {
  const yc = Math.min(T.yMax, Math.max(T.yMin, y));
  let i = T.seg[Math.min(T.N - 1, Math.max(0, Math.floor((yc - T.yMin) / T.step)))];
  const Y = T.Y;
  while (i < T.n - 2 && yc > Y[i + 1]) i++;
  while (i > 0 && yc < Y[i]) i--;
  const h = Y[i + 1] - Y[i], A = (Y[i + 1] - yc) / h, B = 1 - A;
  const inside = y === yc ? 1 : 0;
  let k = 0;
  for (const f of ['a', 'bf', 'bb', 'c']) {
    const V = T.V[f], M = T.M[f];
    out[k] = A * V[i] + B * V[i + 1] + ((A * A * A - A) * M[i] + (B * B * B - B) * M[i + 1]) * h * h / 6;
    out[k + 4] = inside * ((V[i + 1] - V[i]) / h - (3 * A * A - 1) / 6 * h * M[i] + (3 * B * B - 1) / 6 * h * M[i + 1]);
    k++;
  }
  return out;
}
// sample the loft at height y -> [a, bf, bb, c]
export function loftAt(T, y) { const q = loftEval(T, y, new Float64Array(8)); return [q[0], q[1], q[2], q[3]]; }
export function loftDist(T, x, y, z, grow = 0) {
  const q = loftEval(T, y);
  const a = q[0] + grow, c = q[3];
  const dz = z - c, front = dz >= 0;
  const b = (front ? q[1] : q[2]) + grow;
  const qx = x / a, qz = dz / b;
  const k0 = Math.sqrt(qx * qx + qz * qz), k1 = Math.sqrt((qx / a) * (qx / a) + (qz / b) * (qz / b));
  // (no slope correction: its derivative is not continuous across keys — normals kinked into horizontal bands; the plain
  // section distance overestimates by 1/cos(slope) ≤ ~1.15 on a trunk, inside the mesher's Lipschitz margin)
  return k1 < 1e-12 ? -Math.min(a, b) : k0 * (k0 - 1) / k1;
}
export function loftPrim(T, y0, y1) {
  const ya = Math.max(y0, T.yMin), yb = Math.min(y1, T.yMax);
  const fn = (x, y, z) => Math.max(loftDist(T, x, y, z), ya - y, y - yb);
  const hh = (yb - ya) / 2;
  return new Prim('fn', { fn, br: Math.hypot(T.maxA, T.maxB + 0.02, hh) + 0.01, lc: [0, (ya + yb) / 2, T.midC] });
}

// polynomial smooth min / max
export function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function smax(a, b, k) { return -smin(-a, -b, k); }

// ---------------------------------------------------------------------------------------------
// Field: ordered list of primitives combined with smooth CSG. Items:
//   {p: Prim, op: 'u'|'s'|'i', k, bone, tag, grow}
// 'grow' inflates the primitive (garment ease) without rebuilding it.
// ---------------------------------------------------------------------------------------------
export class Field {
  constructor(items = []) { this.items = items.slice(); this.disp = null; this.grow = 0; }
  add(p, o = {}) { this.items.push({ p, op: o.op || 'u', k: o.k ?? 0.01, bone: o.bone ?? -1, tag: o.tag || '', grow: o.grow || 0, w: o.w ?? 1, keepK: !!o.keepK }); return this; }
  sub(p, o = {}) { return this.add(p, { ...o, op: 's' }); }
  int(p, o = {}) { return this.add(p, { ...o, op: 'i' }); }
  // derive a new field from a subset of items, with extra growth and a new blend radius
  derive(filter, { grow = 0, k = null, kMul = 1, kAdd = 0 } = {}) {
    // keepK items (segments of one loft) keep their hard union: blending identical overlapping segments would bulge
    const f = new Field(this.items.filter(filter).map((it) => ({ ...it, grow: (it.grow || 0) + (typeof grow === 'function' ? grow(it) : grow), k: it.keepK ? it.k : (k ?? (it.k * kMul + kAdd)) })));
    return f;
  }
  // Spatial acceleration: per-block candidate lists of primitives (exact for union semantics
  // given Lipschitz-1 primitives). Call before heavy use; points outside the grid use all items.
  accel(bbox, cell = 0.02, margin = 0.003) {
    const it = this.items;
    const nx = Math.max(1, Math.ceil((bbox.max[0] - bbox.min[0]) / cell)), ny = Math.max(1, Math.ceil((bbox.max[1] - bbox.min[1]) / cell)), nz = Math.max(1, Math.ceil((bbox.max[2] - bbox.min[2]) / cell));
    const rb = cell * Math.sqrt(3) / 2;
    const lists = new Array(nx * ny * nz);
    const dd = new Float64Array(it.length), lb = new Float64Array(it.length);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = bbox.min[0] + (i + 0.5) * cell, cy = bbox.min[1] + (j + 0.5) * cell, cz = bbox.min[2] + (k + 0.5) * cell;
      let ub = 1e9;
      for (let q = 0; q < it.length; q++) {
        const e = it[q];
        lb[q] = e.p.lb(cx, cy, cz) - e.grow - rb;
        if (e.op !== 'u') continue;
        if (lb[q] > ub + 0.2) { dd[q] = 1e9; continue; }
        dd[q] = e.p.eval(cx, cy, cz) - e.grow;
        if (dd[q] + rb < ub) ub = dd[q] + rb;
      }
      const L = [];
      for (let q = 0; q < it.length; q++) {
        const e = it[q];
        if (e.op !== 'u') { L.push(e); continue; }
        if (dd[q] < 1e8) { if (dd[q] - rb <= ub + e.k + margin) L.push(e); }
        else if (lb[q] <= ub + e.k + margin) L.push(e);
      }
      lists[i + nx * (j + ny * k)] = L;
    }
    this._acc = { lists, nx, ny, nz, cell, ox: bbox.min[0], oy: bbox.min[1], oz: bbox.min[2] };
    return this;
  }
  eval(x, y, z) {
    let it = this.items;
    const A = this._acc;
    if (A) {
      const i = Math.floor((x - A.ox) / A.cell), j = Math.floor((y - A.oy) / A.cell), k = Math.floor((z - A.oz) / A.cell);
      if (i >= 0 && j >= 0 && k >= 0 && i < A.nx && j < A.ny && k < A.nz) it = A.lists[i + A.nx * (j + A.ny * k)];
    }
    let d = 1e9;
    for (let i = 0; i < it.length; i++) {
      const e = it[i];
      const p = e.p, op = e.op, k = e.k, g = e.grow;
      if (op === 'u') {
        if (d < 1e8 && p.lb(x, y, z) - g > d + k) continue;
        const di = p.eval(x, y, z) - g;
        d = smin(d, di, k);
      } else if (op === 's') {
        if (p.lb(x, y, z) - g > k - d) continue;
        const di = p.eval(x, y, z) - g;
        d = smax(d, -di, k);
      } else {
        const di = p.eval(x, y, z) - g;
        d = smax(d, di, k);
      }
    }
    if (this.disp) d = this.disp(x, y, z, d);
    return d;
  }
  // skin weights from a softmin over the distances of each bone's primitives.
  // opts: tau (m), boneFilter(boneIndex)->bool, custom(x,y,z, wmap) to post-edit weights
  weights(pos, { tau = 0.012, maxInf = 4, custom = null, nBones = 64, exclude = null } = {}) {
    const n = pos.length / 3;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const acc = new Float64Array(nBones);
    const used = [];
    const its = this.items.filter((e) => e.op === 'u' && e.bone >= 0 && !(exclude && exclude(e)));
    const dist = new Float64Array(its.length);
    for (let v = 0; v < n; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      let dmin = 1e9;
      for (let i = 0; i < its.length; i++) {
        const e = its[i];
        if (e.p.lb(x, y, z) - e.grow > dmin + tau * 8) { dist[i] = 1e9; continue; }
        const d = e.p.eval(x, y, z) - e.grow;
        dist[i] = d; if (d < dmin) dmin = d;
      }
      for (const b of used) acc[b] = 0;
      used.length = 0;
      for (let i = 0; i < its.length; i++) {
        const dd = dist[i] - dmin;
        if (dd > tau * 8) continue;
        const w = Math.exp(-dd / tau) * its[i].w;
        const b = its[i].bone;
        if (acc[b] === 0) used.push(b);
        acc[b] += w;
      }
      if (custom) custom(x, y, z, acc, used);
      // pick top maxInf
      used.sort((a, b) => acc[b] - acc[a]);
      let s = 0;
      for (let j = 0; j < maxInf && j < used.length; j++) s += acc[used[j]];
      for (let j = 0; j < 4; j++) {
        if (j < used.length && j < maxInf && s > 0) { si[v * 4 + j] = used[j]; sw[v * 4 + j] = acc[used[j]] / s; }
        else { si[v * 4 + j] = used[0] || 0; sw[v * 4 + j] = 0; }
      }
      for (const b of used) acc[b] = 0;
    }
    return { skinIndex: si, skinWeight: sw };
  }
}

// ---------------------------------------------------------------------------------------------
// Surface nets mesher (narrow band, two-level). evalFn(x,y,z) -> signed distance (<0 inside).
// bbox = {min:[x,y,z], max:[x,y,z]}, h = voxel size.
// Returns {pos: Float32Array, nrm: Float32Array, idx: Uint32Array}
// ---------------------------------------------------------------------------------------------
export function meshField(evalFn, bbox, h, { project = 2, lipschitz = 1.25, keepFace = null } = {}) {
  const min = bbox.min, max = bbox.max;
  const L0 = 8, B = 2; // coarse block (samples) and final block size
  const nx = Math.ceil((max[0] - min[0]) / h / L0) * L0 + 1;
  const ny = Math.ceil((max[1] - min[1]) / h / L0) * L0 + 1;
  const nz = Math.ceil((max[2] - min[2]) / h / L0) * L0 + 1;
  const ox = min[0], oy = min[1], oz = min[2];
  const sxy = nx * ny;
  const S = new Float32Array(nx * ny * nz);
  const have = new Uint8Array(nx * ny * nz);
  const get = (i, j, k) => {
    const id = i + nx * j + sxy * k;
    if (!have[id]) { S[id] = evalFn(ox + i * h, oy + j * h, oz + k * h); have[id] = 1; }
    return S[id];
  };
  // hierarchical narrow band: blocks of size L0 -> L0/2 -> ... -> B
  let blocks = [];
  for (let k = 0; k < nz - 1; k += L0) for (let j = 0; j < ny - 1; j += L0) for (let i = 0; i < nx - 1; i += L0) blocks.push(i, j, k);
  for (let L = L0; L >= B; L >>= 1) {
    const thr = L * h * Math.sqrt(3) * (L <= 2 ? Math.min(lipschitz, 1.05) : lipschitz);
    const next = [];
    for (let b = 0; b < blocks.length; b += 3) {
      const I = blocks[b], J = blocks[b + 1], K = blocks[b + 2];
      let mn = 1e9, pos = false, neg = false;
      for (let c = 0; c < 8; c++) {
        const d = get(I + (c & 1) * L, J + ((c >> 1) & 1) * L, K + ((c >> 2) & 1) * L);
        const a = d < 0 ? -d : d;
        if (a < mn) mn = a;
        if (d < 0) neg = true; else pos = true;
      }
      if (!((pos && neg) || mn < thr)) continue;
      if (L === B) { next.push(I, J, K); continue; }
      const H2 = L >> 1;
      for (let c = 0; c < 8; c++) next.push(I + (c & 1) * H2, J + ((c >> 1) & 1) * H2, K + ((c >> 2) & 1) * H2);
    }
    blocks = next;
  }
  const nb = blocks.length / 3;
  for (let b = 0; b < nb; b++) {
    const I = blocks[b * 3], J = blocks[b * 3 + 1], K = blocks[b * 3 + 2];
    for (let k = K; k <= K + B; k++) for (let j = J; j <= J + B; j++) for (let i = I; i <= I + B; i++) get(i, j, k);
  }
  // cell vertices (only inside active blocks)
  const mx = nx - 1, my = ny - 1;
  const cellV = new Map();
  const P = [];
  const corner = new Float32Array(8);
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const coff = co.map((c) => c[0] + nx * c[1] + sxy * c[2]);
  for (let b = 0; b < nb; b++) {
    const I = blocks[b * 3], J = blocks[b * 3 + 1], K = blocks[b * 3 + 2];
    for (let k = K; k < K + B; k++) for (let j = J; j < J + B; j++) for (let i = I; i < I + B; i++) {
      const base = i + nx * j + sxy * k;
      let mask = 0;
      for (let c = 0; c < 8; c++) { const d = S[base + coff[c]]; corner[c] = d; if (d < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let ax = 0, ay = 0, az = 0, n = 0;
      for (let e = 0; e < 12; e++) {
        const a = E[e][0], bb = E[e][1];
        const da = corner[a], db = corner[bb];
        if ((da < 0) === (db < 0)) continue;
        const t = da / (da - db);
        ax += co[a][0] + (co[bb][0] - co[a][0]) * t;
        ay += co[a][1] + (co[bb][1] - co[a][1]) * t;
        az += co[a][2] + (co[bb][2] - co[a][2]) * t;
        n++;
      }
      cellV.set(i + mx * (j + my * k), P.length / 3);
      P.push(ox + (i + ax / n) * h, oy + (j + ay / n) * h, oz + (k + az / n) * h);
    }
  }
  // quads (edges owned by each active block)
  const I = [];
  const cv = (i, j, k) => { const v = cellV.get(i + mx * (j + my * k)); return v === undefined ? -1 : v; };
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) { const t = b; b = d; d = t; }
    const d1 = dist2(P, a, c), d2 = dist2(P, b, d);
    if (d1 <= d2) I.push(a, b, c, a, c, d); else I.push(a, b, d, b, c, d);
  };
  for (let b = 0; b < nb; b++) {
    const I0 = blocks[b * 3], J0 = blocks[b * 3 + 1], K0 = blocks[b * 3 + 2];
    for (let k = K0; k < K0 + B; k++) for (let j = J0; j < J0 + B; j++) for (let i = I0; i < I0 + B; i++) {
      const id = i + nx * j + sxy * k;
      const s0 = S[id] < 0;
      if (j > 0 && k > 0 && have[id + 1]) { const s1 = S[id + 1] < 0; if (s0 !== s1) quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), !s0); }
      if (i > 0 && k > 0 && have[id + nx]) { const s1 = S[id + nx] < 0; if (s0 !== s1) quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), !s0); }
      if (i > 0 && j > 0 && have[id + sxy]) { const s1 = S[id + sxy] < 0; if (s0 !== s1) quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), !s0); }
    }
  }
  const pos = new Float32Array(P);
  const nv = pos.length / 3;
  const nrm = new Float32Array(nv * 3);
  const e = h * 0.25;
  for (let v = 0; v < nv; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = 0, gy = 1, gz = 0;
    for (let it = 0; it <= project; it++) {
      // tetrahedral gradient (4 evaluations); mean of the four ~ d(p)
      const a = evalFn(x + e, y - e, z - e), b = evalFn(x - e, y - e, z + e), c = evalFn(x - e, y + e, z - e), f4 = evalFn(x + e, y + e, z + e);
      const d = (a + b + c + f4) * 0.25;
      gx = a - b - c + f4; gy = -a - b + c + f4; gz = -a + b - c + f4;
      const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      if (it === project) break;
      // Newton step along the gradient, clamped to the voxel
      const g2 = gl / (4 * e);
      let step = d / Math.max(g2, 0.3);
      step = Math.max(-h * 0.75, Math.min(h * 0.75, step));
      x -= gx * step; y -= gy * step; z -= gz * step;
    }
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nrm[v * 3] = gx; nrm[v * 3 + 1] = gy; nrm[v * 3 + 2] = gz;
  }
  let idx = new Uint32Array(I);
  if (keepFace) idx = filterFaces(pos, idx, keepFace);
  return { pos, nrm, idx };
}
// bounding box of a field's primitives (union items), padded
export function fieldBBox(f, pad = 0.01) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const it of f.items) {
    if (it.op !== 'u' || it.p.bR > 1e6) continue;
    const p = it.p, r = p.bR + (it.grow || 0) + pad;
    mn[0] = Math.min(mn[0], p.bx - r); mn[1] = Math.min(mn[1], p.by - r); mn[2] = Math.min(mn[2], p.bz - r);
    mx[0] = Math.max(mx[0], p.bx + r); mx[1] = Math.max(mx[1], p.by + r); mx[2] = Math.max(mx[2], p.bz + r);
  }
  return { min: mn, max: mx };
}
function dist2(P, a, b) { const dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2]; return dx * dx + dy * dy + dz * dz; }

// keep faces whose centroid passes keep(x,y,z)
export function filterFaces(pos, idx, keep) {
  const out = [];
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f], b = idx[f + 1], c = idx[f + 2];
    const x = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3, y = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3, z = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    if (keep(x, y, z, a, b, c)) out.push(a, b, c);
  }
  return new Uint32Array(out);
}

// Remove unreferenced vertices; arrays = list of {arr, size} per-vertex attributes to compact.
export function compact(m, extra = {}) {
  const nv = m.pos.length / 3;
  const map = new Int32Array(nv).fill(-1);
  let n = 0;
  for (let i = 0; i < m.idx.length; i++) { const v = m.idx[i]; if (map[v] < 0) map[v] = n++; }
  const remap = (arr, size) => { const o = new arr.constructor(n * size); for (let v = 0; v < nv; v++) if (map[v] >= 0) for (let s = 0; s < size; s++) o[map[v] * size + s] = arr[v * size + s]; return o; };
  const out = { pos: remap(m.pos, 3), nrm: remap(m.nrm, 3), idx: new Uint32Array(m.idx.length) };
  for (let i = 0; i < m.idx.length; i++) out.idx[i] = map[m.idx[i]];
  for (const [k, v] of Object.entries(extra)) out[k] = remap(v.arr, v.size);
  for (const k of Object.keys(m)) if (!(k in out) && m[k] && m[k].length === nv * (m[k].length / nv) && k !== 'idx' && m[k].length % nv === 0) out[k] = remap(m[k], m[k].length / nv);
  return out;
}

// Boundary edges of an (open) triangle mesh -> array of [a, b] directed edges
export function boundaryEdges(idx) {
  const cnt = new Map();
  const key = (a, b) => (a < b ? a * 4194304 + b : b * 4194304 + a);
  for (let f = 0; f < idx.length; f += 3) for (let e = 0; e < 3; e++) {
    const a = idx[f + e], b = idx[f + (e + 1) % 3];
    const k = key(a, b);
    const c = cnt.get(k);
    if (c) { c[2]++; } else cnt.set(k, [a, b, 1]);
  }
  const out = [];
  for (const c of cnt.values()) if (c[2] === 1) out.push([c[0], c[1]]);
  return out;
}

// Snap open-boundary vertices onto the crease between surface A (fa=0) and cut B (fb=0).
export function snapBoundary(m, fa, fb, iters = 6, h = 0.005) {
  const be = boundaryEdges(m.idx);
  const verts = new Set();
  for (const [a, b] of be) { verts.add(a); verts.add(b); }
  const e = h * 0.2;
  const grad = (f, x, y, z) => { const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l, l / (2 * e)]; };
  for (const v of verts) {
    let x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    for (let it = 0; it < iters; it++) {
      for (const f of [fb, fa]) {
        const d = f(x, y, z); const g = grad(f, x, y, z);
        const s = Math.max(-h, Math.min(h, d / Math.max(g[3], 0.3)));
        x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
      }
    }
    m.pos[v * 3] = x; m.pos[v * 3 + 1] = y; m.pos[v * 3 + 2] = z;
  }
  return { boundary: be, verts };
}

// Smooth open boundaries (hems, cuffs, necklines) into clean curves: 1-D Laplacian along each boundary loop, then
// re-snap onto the crease between surface fa and cut fb; the first interior ring is relaxed and re-projected onto fa so
// no slivers / fold-overs remain next to the edge (a surface-nets cut otherwise zigzags along the crease).
export function smoothBoundary(m, fa, fb, { iters = 4, h = 0.005 } = {}) {
  const be = boundaryEdges(m.idx);
  if (!be.length) return m;
  const nb = new Map();
  const link = (a, b) => { let l = nb.get(a); if (!l) nb.set(a, (l = [])); if (!l.includes(b)) l.push(b); };
  for (const [a, b] of be) { link(a, b); link(b, a); }
  const P = m.pos;
  const e = h * 0.2;
  const grad = (f, x, y, z) => { const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l, l / (2 * e)]; };
  const snap = (v, fs) => {
    let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    for (let it = 0; it < 4; it++) for (const f of fs) { const d = f(x, y, z), g = grad(f, x, y, z), st = Math.max(-h, Math.min(h, d / Math.max(g[3], 0.3))); x -= g[0] * st; y -= g[1] * st; z -= g[2] * st; }
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
  };
  const verts = [...nb.keys()].filter((v) => nb.get(v).length === 2);
  const tmp = new Float64Array(verts.length * 3), orig = new Float64Array(verts.length * 3);
  verts.forEach((v, i) => { for (let k = 0; k < 3; k++) orig[i * 3 + k] = P[v * 3 + k]; });
  for (let it = 0; it < iters; it++) {
    verts.forEach((v, i) => { const [a, b] = nb.get(v); for (let k = 0; k < 3; k++) tmp[i * 3 + k] = P[v * 3 + k] * 0.5 + (P[a * 3 + k] + P[b * 3 + k]) * 0.25; });
    verts.forEach((v, i) => { for (let k = 0; k < 3; k++) P[v * 3 + k] = tmp[i * 3 + k]; snap(v, [fb, fa]); });
  }
  // safety: a vertex that drifted (snap not converging near a corner of the cut) goes back where it was
  verts.forEach((v, i) => {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const moved = Math.hypot(x - orig[i * 3], y - orig[i * 3 + 1], z - orig[i * 3 + 2]);
    if (moved > 0.8 * h || Math.abs(fa(x, y, z)) > 0.3 * h || Math.abs(fb(x, y, z)) > 0.3 * h) for (let k = 0; k < 3; k++) P[v * 3 + k] = orig[i * 3 + k];
  });
  // first interior ring
  const isB = new Uint8Array(P.length / 3); for (const v of nb.keys()) isB[v] = 1;
  const ring = new Map();
  for (let f = 0; f < m.idx.length; f += 3) {
    const t = [m.idx[f], m.idx[f + 1], m.idx[f + 2]];
    if (!(isB[t[0]] || isB[t[1]] || isB[t[2]])) continue;
    for (const v of t) if (!isB[v]) { let l = ring.get(v); if (!l) ring.set(v, (l = new Set())); for (const w of t) if (w !== v) l.add(w); }
  }
  for (let it = 0; it < 2; it++) for (const [v, l] of ring) {
    const ox = P[v * 3], oy = P[v * 3 + 1], oz = P[v * 3 + 2];
    let sx = 0, sy = 0, sz = 0; for (const w of l) { sx += P[w * 3]; sy += P[w * 3 + 1]; sz += P[w * 3 + 2]; }
    const n = l.size; P[v * 3] += 0.4 * (sx / n - P[v * 3]); P[v * 3 + 1] += 0.4 * (sy / n - P[v * 3 + 1]); P[v * 3 + 2] += 0.4 * (sz / n - P[v * 3 + 2]);
    snap(v, [fa]);
    if (Math.hypot(P[v * 3] - ox, P[v * 3 + 1] - oy, P[v * 3 + 2] - oz) > 0.6 * h || fb(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]) > 0.2 * h) { P[v * 3] = ox; P[v * 3 + 1] = oy; P[v * 3 + 2] = oz; }
  }
  return m;
}

// Laplacian smoothing of positions for a subset (or all) vertices, keeping them on the surface
export function relax(m, iters = 1, lambda = 0.5, onlyVerts = null) {
  const nv = m.pos.length / 3;
  const sum = new Float64Array(nv * 3), cnt = new Uint16Array(nv);
  for (let it = 0; it < iters; it++) {
    sum.fill(0); cnt.fill(0);
    for (let f = 0; f < m.idx.length; f += 3) for (let e = 0; e < 3; e++) {
      const a = m.idx[f + e], b = m.idx[f + (e + 1) % 3];
      for (let s = 0; s < 3; s++) { sum[a * 3 + s] += m.pos[b * 3 + s]; sum[b * 3 + s] += m.pos[a * 3 + s]; }
      cnt[a]++; cnt[b]++;
    }
    const vs = onlyVerts || Array.from({ length: nv }, (_, i) => i);
    for (const v of vs) if (cnt[v]) for (let s = 0; s < 3; s++) m.pos[v * 3 + s] += lambda * (sum[v * 3 + s] / cnt[v] - m.pos[v * 3 + s]);
  }
}

// Add a rim (thickness) along open boundaries: duplicates boundary verts pushed inward by -n*th.
// Rim normals point outward from the garment edge (dirFn(x,y,z) -> [nx,ny,nz] optional).
// Per-vertex attributes in `attrs` ({name: size}) are copied.
export function addRim(m, th, attrs = {}) {
  const be = boundaryEdges(m.idx);
  if (!be.length) return m;
  const nv = m.pos.length / 3;
  const dup = new Map();
  const newPos = [], newNrm = [], src = [];
  // rim direction per boundary vertex: average of (edge x normal)
  const rimDir = new Map();
  for (const [a, b] of be) {
    const ex = m.pos[b * 3] - m.pos[a * 3], ey = m.pos[b * 3 + 1] - m.pos[a * 3 + 1], ez = m.pos[b * 3 + 2] - m.pos[a * 3 + 2];
    for (const v of [a, b]) {
      const nx = m.nrm[v * 3], ny = m.nrm[v * 3 + 1], nz = m.nrm[v * 3 + 2];
      // for a face winding a->b (CCW seen from outside), the outward boundary dir is e x n
      const dx = ey * nz - ez * ny, dy = ez * nx - ex * nz, dz = ex * ny - ey * nx;
      const r = rimDir.get(v) || [0, 0, 0];
      r[0] += dx; r[1] += dy; r[2] += dz; rimDir.set(v, r);
    }
  }
  for (const [v, r] of rimDir) {
    const l = Math.hypot(r[0], r[1], r[2]) || 1;
    const id = nv + src.length;
    dup.set(v, id); src.push(v);
    newPos.push(m.pos[v * 3] - m.nrm[v * 3] * th, m.pos[v * 3 + 1] - m.nrm[v * 3 + 1] * th, m.pos[v * 3 + 2] - m.nrm[v * 3 + 2] * th);
    newNrm.push(r[0] / l, r[1] / l, r[2] / l);
  }
  // also give the original boundary verts a normal tilted toward the rim (rounded edge look)
  for (const [v, r] of rimDir) {
    const l = Math.hypot(r[0], r[1], r[2]) || 1;
    let nx = m.nrm[v * 3] + 0.6 * r[0] / l, ny = m.nrm[v * 3 + 1] + 0.6 * r[1] / l, nz = m.nrm[v * 3 + 2] + 0.6 * r[2] / l;
    const nl = Math.hypot(nx, ny, nz) || 1;
    // keep original normal for the shell but bend the rim's top vertices
    const id = dup.get(v);
    newNrm[(id - nv) * 3] = (newNrm[(id - nv) * 3] + nx / nl) * 0.5; // blend
    newNrm[(id - nv) * 3 + 1] = (newNrm[(id - nv) * 3 + 1] + ny / nl) * 0.5;
    newNrm[(id - nv) * 3 + 2] = (newNrm[(id - nv) * 3 + 2] + nz / nl) * 0.5;
  }
  const idx = Array.from(m.idx);
  for (const [a, b] of be) {
    const a2 = dup.get(a), b2 = dup.get(b);
    // face a->b was on the shell; rim quad b, a, a2, b2 (outward)
    idx.push(b, a, a2, b, a2, b2);
  }
  const pos = new Float32Array(nv * 3 + newPos.length); pos.set(m.pos); pos.set(newPos, nv * 3);
  const nrm = new Float32Array(nv * 3 + newNrm.length); nrm.set(m.nrm); nrm.set(newNrm, nv * 3);
  const out = { ...m, pos, nrm, idx: new Uint32Array(idx) };
  const all = { ...attrs };
  for (const [name, size] of Object.entries(all)) {
    const a = m[name]; if (!a) continue;
    const o = new a.constructor((nv + src.length) * size); o.set(a);
    for (let i = 0; i < src.length; i++) for (let s = 0; s < size; s++) o[(nv + i) * size + s] = a[src[i] * size + s];
    out[name] = o;
  }
  return out;
}

// Mirror a mesh across X (for right hands etc.), fixing winding.
export function mirrorX(m, attrs = {}) {
  const pos = m.pos.slice(), nrm = m.nrm.slice();
  for (let i = 0; i < pos.length; i += 3) { pos[i] = -pos[i]; nrm[i] = -nrm[i]; }
  const idx = m.idx.slice();
  for (let f = 0; f < idx.length; f += 3) { const t = idx[f + 1]; idx[f + 1] = idx[f + 2]; idx[f + 2] = t; }
  const out = { ...m, pos, nrm, idx };
  for (const [name, flipX] of Object.entries(attrs)) if (m[name]) { out[name] = m[name].slice(); if (flipX) for (let i = 0; i < out[name].length; i += 3) out[name][i] = -out[name][i]; }
  return out;
}

// Build a THREE.BufferGeometry from a mesh record.
export function toGeometry(m, { skin = null, aux = null, rest = true } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
  if (rest) { // rest-space coordinates for procedural shading == bind-space position/normal
    g.setAttribute('restPos', g.attributes.position);
    g.setAttribute('restNrm', g.attributes.normal);
  }
  const nv = m.pos.length / 3;
  g.setAttribute('aux', new THREE.BufferAttribute(aux || m.aux || new Float32Array(nv * 4), 4));
  if (m.color) g.setAttribute('color', new THREE.BufferAttribute(m.color, 3));
  if (skin) {
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skin.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(skin.skinWeight, 4));
  }
  g.setIndex(new THREE.BufferAttribute(m.idx, 1));
  return g;
}

// Concatenate several mesh records (same attribute sets).
export function concat(list, names = ['pos', 'nrm', 'aux', 'rest', 'restN', 'color', 'skinIndex', 'skinWeight']) {
  const out = {};
  let nv = 0, ni = 0;
  for (const m of list) { nv += m.pos.length / 3; ni += m.idx.length; }
  for (const n of names) {
    const first = list.find((m) => m[n]); if (!first) continue;
    const size = first[n].length / (first.pos.length / 3);
    const o = new first[n].constructor(nv * size);
    let off = 0;
    for (const m of list) { const c = m.pos.length / 3; if (m[n]) o.set(m[n], off * size); off += c; }
    out[n] = o;
  }
  out.idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const m of list) { for (let i = 0; i < m.idx.length; i++) out.idx[io + i] = m.idx[i] + vo; io += m.idx.length; vo += m.pos.length / 3; }
  return out;
}

// value noise 3D (deterministic) for sculpt displacement
export function hash3(x, y, z, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144269504) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) / 4294967296);
}
export function vnoise3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  let r = 0;
  for (let c = 0; c < 8; c++) {
    const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
    const w = (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
    r += w * hash3(ix + dx, iy + dy, iz + dz, seed);
  }
  return r * 2 - 1;
}

// ---------------------------------------------------------------------------------------------
// QEM half-edge-collapse decimation. Keeps surviving vertices' attributes untouched (they are exact
// SDF samples with true normals), never moves open-boundary vertices (hems / cuffs stay crisp).
// m: {pos, nrm, idx, ...per-vertex arrays}; returns a new compacted record.
// opts: maxError (m, geometric deviation bound), ratio (target face fraction), minNormalDot.
// ---------------------------------------------------------------------------------------------
export function decimate(m, { maxError = 0.0008, ratio = 0.3, minNormalDot = 0.35, attr = null, attrTol = null, lock = null } = {}) {
  const nv = m.pos.length / 3, nf0 = m.idx.length / 3;
  if (nf0 < 200) return m;
  const P = m.pos, F = new Int32Array(m.idx);
  const Q = new Float64Array(nv * 10);
  const vf = Array.from({ length: nv }, () => []);
  for (let f = 0; f < nf0; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    vf[a].push(f); vf[b].push(f); vf[c].push(f);
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
    const wx = P[c * 3] - ax, wy = P[c * 3 + 1] - ay, wz = P[c * 3 + 2] - az;
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-14) continue;
    const area = l * 0.5; nx /= l; ny /= l; nz /= l;
    const d = -(nx * ax + ny * ay + nz * az);
    const q = [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d, nz * nz, nz * d, d * d];
    for (const v of [a, b, c]) for (let i = 0; i < 10; i++) Q[v * 10 + i] += q[i] * area;
  }
  // normalise quadrics by area so costs are squared distances
  const areaSum = new Float64Array(nv);
  for (let f = 0; f < nf0; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
    const wx = P[c * 3] - P[a * 3], wy = P[c * 3 + 1] - P[a * 3 + 1], wz = P[c * 3 + 2] - P[a * 3 + 2];
    const ar = 0.5 * Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
    areaSum[a] += ar; areaSum[b] += ar; areaSum[c] += ar;
  }
  for (let v = 0; v < nv; v++) if (areaSum[v] > 0) for (let i = 0; i < 10; i++) Q[v * 10 + i] /= areaSum[v] / Math.max(1, vf[v].length);
  const locked = new Uint8Array(nv);
  for (const [a, b] of boundaryEdges(m.idx)) { locked[a] = 1; locked[b] = 1; }
  if (lock) for (let v = 0; v < nv; v++) if (lock(P[v * 3], P[v * 3 + 1], P[v * 3 + 2])) locked[v] = 1; // keep exact (e.g. overlap zones)
  const alive = new Uint8Array(nf0).fill(1);
  const removed = new Uint8Array(nv);
  const stamp = new Uint32Array(nv);
  const qerr = (q, x, y, z) => q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  const tmp = new Float64Array(10);
  const costUV = (u, v) => { for (let i = 0; i < 10; i++) tmp[i] = Q[u * 10 + i] + Q[v * 10 + i]; return qerr(tmp, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); };
  // binary heap over entry slots (typed arrays): cost, u, v, stampU, stampV
  let cap = 1 << 16, nE = 0;
  let EC = new Float64Array(cap), EU = new Int32Array(cap), EV = new Int32Array(cap), ESU = new Uint32Array(cap), ESV = new Uint32Array(cap);
  let HP = new Int32Array(cap); let hn = 0;
  const grow = () => { cap *= 2; const r = (A, C) => { const b = new C(cap); b.set(A); return b; }; EC = r(EC, Float64Array); EU = r(EU, Int32Array); EV = r(EV, Int32Array); ESU = r(ESU, Uint32Array); ESV = r(ESV, Uint32Array); HP = r(HP, Int32Array); };
  const free = [];
  const push = (c, u, v, su, sv) => {
    let e = free.length ? free.pop() : nE++;
    if (e >= cap || hn >= cap) grow();
    EC[e] = c; EU[e] = u; EV[e] = v; ESU[e] = su; ESV[e] = sv;
    let i = hn++; HP[i] = e;
    while (i > 0) { const p = (i - 1) >> 1; if (EC[HP[p]] <= EC[HP[i]]) break; const t = HP[p]; HP[p] = HP[i]; HP[i] = t; i = p; }
  };
  const pop = () => {
    const top = HP[0]; HP[0] = HP[--hn];
    let i = 0;
    for (;;) { const l = 2 * i + 1, r = l + 1; let m2 = i; if (l < hn && EC[HP[l]] < EC[HP[m2]]) m2 = l; if (r < hn && EC[HP[r]] < EC[HP[m2]]) m2 = r; if (m2 === i) break; const t = HP[m2]; HP[m2] = HP[i]; HP[i] = t; i = m2; }
    free.push(top);
    return top;
  };
  const mark = new Int32Array(nv), mark2 = new Int32Array(nv);
  let tick = 0;
  const nbuf = [];
  const neighbours = (u, buf) => { // unique 1-ring of u into buf (array)
    tick++; buf.length = 0;
    for (const f of vf[u]) if (alive[f]) for (let k = 0; k < 3; k++) { const w = F[f * 3 + k]; if (w !== u && mark[w] !== tick) { mark[w] = tick; buf.push(w); } }
    return buf;
  };
  const consider = (u) => { if (removed[u] || locked[u]) return; for (const v of neighbours(u, nbuf)) push(costUV(u, v), u, v, stamp[u], stamp[v]); };
  for (let u = 0; u < nv; u++) consider(u);
  let nf = nf0;
  const target = Math.floor(nf0 * ratio);
  const maxE2 = maxError * maxError;
  const nb2 = [];
  while (hn > 0 && nf > target) {
    const e = pop();
    const cost = EC[e], u = EU[e], v = EV[e], su = ESU[e], sv = ESV[e];
    if (cost > maxE2) break;
    if (removed[u] || removed[v] || stamp[u] !== su || stamp[v] !== sv || locked[u]) continue;
    if (attr) { let bad = false; for (let k = 0; k < attrTol.length; k++) if (Math.abs(attr[u * 4 + k] - attr[v * 4 + k]) > attrTol[k]) { bad = true; break; } if (bad) continue; }
    // link condition: shared neighbours must be exactly the opposite vertices of the shared faces
    neighbours(v, nb2); const tv = tick; for (const w of nb2) mark2[w] = tv;
    neighbours(u, nbuf);
    let common = 0; for (const w of nbuf) if (mark2[w] === tv) common++;
    let shared = 0; for (const f of vf[u]) if (alive[f] && (F[f * 3] === v || F[f * 3 + 1] === v || F[f * 3 + 2] === v)) shared++;
    if (common !== shared) continue;
    // no flips / degenerate faces
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2];
    let ok = true;
    for (const f of vf[u]) {
      if (!alive[f]) continue;
      const i0 = F[f * 3], i1 = F[f * 3 + 1], i2 = F[f * 3 + 2];
      if (i0 === v || i1 === v || i2 === v) continue;
      const A = i0 * 3, B = i1 * 3, Cc = i2 * 3;
      let ax = P[A], ay = P[A + 1], az = P[A + 2], bx = P[B], by = P[B + 1], bz = P[B + 2], cx = P[Cc], cy = P[Cc + 1], cz = P[Cc + 2];
      const n0x = (by - ay) * (cz - az) - (bz - az) * (cy - ay), n0y = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), n0z = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (i0 === u) { ax = px; ay = py; az = pz; } else if (i1 === u) { bx = px; by = py; bz = pz; } else { cx = px; cy = py; cz = pz; }
      const n1x = (by - ay) * (cz - az) - (bz - az) * (cy - ay), n1y = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), n1z = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const l0 = Math.hypot(n0x, n0y, n0z), l1 = Math.hypot(n1x, n1y, n1z);
      if (l1 < l0 * 0.02 || (n0x * n1x + n0y * n1y + n0z * n1z) < minNormalDot * l0 * l1) { ok = false; break; }
    }
    if (!ok) continue;
    // collapse u -> v
    for (const f of vf[u]) {
      if (!alive[f]) continue;
      if (F[f * 3] === v || F[f * 3 + 1] === v || F[f * 3 + 2] === v) { alive[f] = 0; nf--; continue; }
      for (let k = 0; k < 3; k++) if (F[f * 3 + k] === u) F[f * 3 + k] = v;
      vf[v].push(f);
    }
    vf[u] = [];
    removed[u] = 1;
    for (let i = 0; i < 10; i++) Q[v * 10 + i] += Q[u * 10 + i];
    stamp[v]++;
    // only edges touching v changed cost
    if (vf[v].length > 64) vf[v] = vf[v].filter((f) => alive[f]);
    for (const w of neighbours(v, nbuf).slice()) {
      if (!locked[w] && !removed[w]) push(costUV(w, v), w, v, stamp[w], stamp[v]);
      if (!locked[v]) push(costUV(v, w), v, w, stamp[v], stamp[w]);
    }
  }
  const out = [];
  for (let f = 0; f < nf0; f++) if (alive[f]) out.push(F[f * 3], F[f * 3 + 1], F[f * 3 + 2]);
  return compact({ ...m, idx: new Uint32Array(out) });
}
