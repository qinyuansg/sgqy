// figure_garments.js — costume layers and hair for figure.js, sculpted as SDFs in bind (A-pose)
// space around the body field, meshed as open cloth shells (clean hems / cuffs / necklines with a
// thickness rim), skinned with the body's weights. Trims (collars, cuff bands, plackets, lapels,
// cross-collar bands, buttons, sashes) are swept solids meshed at finer resolution.
//
// Garment spec (all optional except type):
//   { type: 'shirt'|'blouse'|'jacket'|'coat'|'lab_coat'|'dress'|'cheongsam'|'robe'|'vest'|
//           'trousers'|'skirt'|'apron'|'shoes'|'sash'|'shawl',
//     name, color, fabric ('cotton'|'indigo'|'wool'|'linen'|'silk'|'knit'|'serge'|'canvas'), layer,
//     length: 'waist'|'hip'|'thigh'|'knee'|'calf'|'ankle'|<fraction of height>,
//     sleeve: 'long'|'wrist'|'3/4'|'elbow'|'short'|'none'|<0..1 of forearm>, sleeveWidth (m extra at cuff),
//     ease (m), flare (m extra at hem), drape (0 fitted … 1 hangs straight from chest), folds (0..2),
//     collar: 'none'|'round'|'mandarin'|'cross'|'lapel'|'shirt'|'stand', collarColor,
//     closure: 'center'|'side'|'cross'|'none', buttons (n), buttonColor, trimColor (binding),
//     open: bool (open front below the V), vDepth (m), slit (m, side slits),
//     cuff: { style:'plain'|'band'|'rolled', color, width, detail:[{type:'worn', side:'L'}, {type:'patch', side:'R', color}] },
//     wide (trousers: extra radius at hem), rolled (trousers: rolled hem), print: {colors, leaf, count, scale},
//     shoe: 'leather'|'cloth'|'boot'|'sandal'|'slipper', soleColor, faded, mottle, pockets }
import * as THREE from 'three';
import { Field, prim, Ribbon, meshField, filterFaces, compact, snapBoundary, addRim, toGeometry, boundaryEdges, vnoise3, smin, fieldBBox } from './figure_sdf.js';
import { clothMaterial, hairMaterial, leatherMaterial, floralPrint } from './figure_mat.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const V3 = (a) => new THREE.Vector3().fromArray(a);

const HEM = { waist: 0.60, hip: 0.47, thigh: 0.40, knee: 0.295, below_knee: 0.25, calf: 0.19, ankle: 0.065, floor: 0.035 };
const SLEEVE = { none: -1, short: 0.25, elbow: 0.48, '3/4': 0.7, long: 1.0, wrist: 1.0 };
const DEFAULTS = {
  shirt: { length: 'hip', sleeve: 'long', ease: 0.008, drape: 0.5, collar: 'shirt', closure: 'center', buttons: 6, fabric: 'cotton', cuffStyle: 'band' },
  blouse: { length: 'hip', sleeve: '3/4', ease: 0.012, drape: 0.6, collar: 'mandarin', closure: 'side', fabric: 'cotton', sleeveWidth: 0.02 },
  jacket: { length: 'hip', sleeve: 'long', ease: 0.013, drape: 0.75, collar: 'lapel', closure: 'center', buttons: 3, fabric: 'serge' },
  coat: { length: 'knee', sleeve: 'long', ease: 0.016, drape: 0.85, collar: 'lapel', closure: 'center', buttons: 4, fabric: 'wool', flare: 0.03 },
  lab_coat: { length: 'knee', sleeve: 'long', ease: 0.014, drape: 0.8, collar: 'lapel', closure: 'center', buttons: 4, fabric: 'cotton', flare: 0.02 },
  dress: { length: 'calf', sleeve: 'elbow', ease: 0.01, drape: 0.4, collar: 'round', closure: 'none', fabric: 'cotton', flare: 0.05 },
  cheongsam: { length: 'calf', sleeve: 'elbow', ease: 0.006, drape: 0.25, collar: 'mandarin', closure: 'side', fabric: 'silk', flare: 0.0, slit: 0.14 },
  robe: { length: 'ankle', sleeve: 'long', ease: 0.02, drape: 0.9, collar: 'cross', closure: 'cross', fabric: 'cotton', flare: 0.06, sleeveWidth: 0.04 },
  vest: { length: 'hip', sleeve: 'none', ease: 0.014, drape: 0.6, collar: 'v', closure: 'center', buttons: 5, fabric: 'wool' },
  sailor: { length: 'hip', sleeve: 'long', ease: 0.018, drape: 0.85, collar: 'cross', closure: 'cross', fabric: 'indigo', sleeveWidth: 0.03, cuffStyle: 'rolled' },
  side_jacket: { length: 'thigh', sleeve: 'long', ease: 0.013, drape: 0.75, collar: 'mandarin', closure: 'side', fabric: 'cotton', sleeveWidth: 0.025, flare: 0.02 },
};

// ------------------------------------------------------------------------------------------
// geometric helpers in bind space
// ------------------------------------------------------------------------------------------
function refs(ctx) {
  const { BW, bi, P } = ctx;
  const pos = (n) => new THREE.Vector3().setFromMatrixPosition(BW[bi[n]]);
  const R = { P };
  for (const n of ctx.bones) R[n] = pos(n);
  for (const s of ['L', 'R']) {
    R['upperDir' + s] = R[`arm${s}.lower`].clone().sub(R[`arm${s}.upper`]).normalize();
    R['foreDir' + s] = R[`arm${s}.hand`].clone().sub(R[`arm${s}.lower`]).normalize();
    R['thighDir' + s] = R[`leg${s}.lower`].clone().sub(R[`leg${s}.upper`]).normalize();
    R['shinDir' + s] = R[`leg${s}.foot`].clone().sub(R[`leg${s}.lower`]).normalize();
  }
  return R;
}
// distance from p to segment a-b (and param t)
function segDist(px, py, pz, a, b) {
  const bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z;
  const l2 = bx * bx + by * by + bz * bz;
  let t = ((px - a.x) * bx + (py - a.y) * by + (pz - a.z) * bz) / l2;
  t = clamp(t);
  const dx = px - a.x - bx * t, dy = py - a.y - by * t, dz = pz - a.z - bz * t;
  return [Math.sqrt(dx * dx + dy * dy + dz * dz), t];
}
// project a point onto the zero set of fn (Newton along gradient)
export function projectTo(fn, p, iters = 8, e = 0.0015) {
  const q = p.clone();
  for (let i = 0; i < iters; i++) {
    const d = fn(q.x, q.y, q.z);
    const gx = fn(q.x + e, q.y, q.z) - fn(q.x - e, q.y, q.z), gy = fn(q.x, q.y + e, q.z) - fn(q.x, q.y - e, q.z), gz = fn(q.x, q.y, q.z + e) - fn(q.x, q.y, q.z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    const s = d / Math.max(gl / (2 * e), 0.3);
    q.x -= gx / gl * s; q.y -= gy / gl * s; q.z -= gz / gl * s;
    if (Math.abs(d) < 1e-5) break;
  }
  return q;
}
function gradAt(fn, q, e = 0.0015) {
  const g = new THREE.Vector3(fn(q.x + e, q.y, q.z) - fn(q.x - e, q.y, q.z), fn(q.x, q.y + e, q.z) - fn(q.x, q.y - e, q.z), fn(q.x, q.y, q.z + e) - fn(q.x, q.y, q.z - e));
  return g.normalize();
}
// ring of points on the surface around an axis (centre c, axis dir a)
function ringOn(fn, c, a, n = 28, rMax = 0.25, ref = null) {
  const u = (ref ? ref.clone() : (Math.abs(a.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))).sub(a.clone().multiplyScalar((ref || (Math.abs(a.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))).dot(a))).normalize();
  const v = new THREE.Vector3().crossVectors(a, u);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const d = u.clone().multiplyScalar(Math.cos(th)).add(v.clone().multiplyScalar(Math.sin(th)));
    // march outward from inside until outside, then bisect
    let lo = 0, hi = rMax;
    const at = (r) => fn(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r);
    if (at(lo) > 0) { pts.push(c.clone()); continue; }
    let r = 0.002;
    while (r < rMax && at(r) < 0) r += 0.004;
    lo = Math.max(0, r - 0.004); hi = r;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (at(m) < 0) lo = m; else hi = m; }
    pts.push(new THREE.Vector3(c.x + d.x * hi, c.y + d.y * hi, c.z + d.z * hi));
  }
  return pts;
}
// smooth a polyline (Catmull-Rom resample)
function resample(pts, n, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  return curve.getSpacedPoints(n).slice(0, closed ? n : n + 1);
}

// Swept band of rounded boxes lying on the surface fn along pts.
// o: {width (m) or width(t), th (m), embed (m into the surface), closed, rad}
function sweptBand(field, fn, pts, o) {
  // ribbon lying on surface fn along pts (smooth, follows the surface — no faceting)
  const n = pts.length;
  if (n < 2) return;
  const nrm = pts.map((p, i) => (o.normal ? (typeof o.normal === 'function' ? o.normal(p, i / Math.max(1, n - 1)) : o.normal.clone()) : gradAt(fn, p)));
  const W = pts.map((p, i) => (typeof o.width === 'function' ? o.width(i / Math.max(1, n - 1)) : o.width));
  const S = pts.map((p, i) => (o.shift ? (typeof o.shift === 'function' ? o.shift(i / Math.max(1, n - 1)) : o.shift) : 0));
  const lift = o.th / 2 - (o.embed ?? o.th * 0.45);
  field.add(new Ribbon({ pts, nrm, width: W, shift: S, th: o.th, lift, closed: !!o.closed, rad: o.rad ?? 0.0015 }), { k: o.k ?? 0.002, bone: -1, tag: 'trim' });
}
function studs(field, fn, pts, o) {
  for (const p of pts) {
    const n = gradAt(fn, p);
    const c = p.clone().add(n.clone().multiplyScalar(o.lift ?? 0.001));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const m = new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1));
    if (o.knot) field.add(prim('sphere', { frame: m, r: o.r }), { k: 0.001, bone: -1, tag: 'stud' });
    else field.add(prim('cyl', { frame: m, r: o.r, h: o.h ?? 0.0018, rad: 0.0012 }), { k: 0.001, bone: -1, tag: 'stud' });
  }
}

// Build a skinned mesh record from a trim field (solid, no open shells)
function meshTrim(ctx, f, h, bbox0) {
  // tight bbox from the primitives themselves (intersected with the hint)
  const fb = fieldBBox(f, h * 2);
  const bbox = bbox0 ? { min: fb.min.map((x, i) => Math.max(x, bbox0.min[i])), max: fb.max.map((x, i) => Math.min(x, bbox0.max[i])) } : fb;
  if (!(bbox.max[0] > bbox.min[0])) return { pos: new Float32Array(0), nrm: new Float32Array(0), idx: new Uint32Array(0) };
  f.accel(bbox, Math.max(0.02, h * 6));
  const m = meshField((x, y, z) => f.eval(x, y, z), bbox, h, { project: 2 });
  return m;
}

function bboxOfPts(pts, pad) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of pts) { mn[0] = Math.min(mn[0], p.x); mn[1] = Math.min(mn[1], p.y); mn[2] = Math.min(mn[2], p.z); mx[0] = Math.max(mx[0], p.x); mx[1] = Math.max(mx[1], p.y); mx[2] = Math.max(mx[2], p.z); }
  return { min: mn.map((x) => x - pad), max: mx.map((x) => x + pad) };
}

// ------------------------------------------------------------------------------------------
// weights for cloth: body softmin + skirt rule below the hips
// ------------------------------------------------------------------------------------------
function clothWeights(ctx, pos, { skirt = false, tau = 0.016 } = {}) {
  const { field, bi, P, bones } = ctx;
  const R = refs(ctx);
  const crotch = P.hipJY - 0.05 * P.H, knee = P.kneeY;
  const hipsB = bi.hips;
  const custom = skirt ? (x, y, z, acc, used) => {
    if (y > crotch + 0.08 * P.H / 1.7) return;
    let tot = 0; for (const b of used) tot += acc[b];
    for (const b of used) acc[b] = 0;
    used.length = 0;
    const legShare = sstep(crotch + 0.09 * P.H / 1.7, crotch - 0.03 * P.H / 1.7, y);
    const shinShare = 0.85 * sstep(knee + 0.02 * P.H / 1.7, knee - 0.12 * P.H / 1.7, y);
    const wL = sstep(-0.05 * P.H / 1.7, 0.05 * P.H / 1.7, x);
    const put = (b, w) => { if (w <= 1e-4) return; if (acc[b] === 0) used.push(b); acc[b] += w; };
    put(hipsB, 1 - legShare);
    put(bi['legL.upper'], legShare * wL * (1 - shinShare)); put(bi['legL.lower'], legShare * wL * shinShare);
    put(bi['legR.upper'], legShare * (1 - wL) * (1 - shinShare)); put(bi['legR.lower'], legShare * (1 - wL) * shinShare);
  } : null;
  return field.weights(pos, { tau: tau * P.H / 1.7, nBones: bones.length, custom, exclude: (e) => e.tag === 'head' || e.tag === 'mitten' || e.tag === 'wrist' });
}

// ------------------------------------------------------------------------------------------
// open-shell garment meshing: raw (closed cloth volume incl. body), rem (removal regions, <0 inside)
// ------------------------------------------------------------------------------------------
function shellMesh(ctx, raw, rem, bbox, h, { rim = 0.004 } = {}) {
  const g = (x, y, z) => Math.max(raw(x, y, z), -rem(x, y, z));
  let m = meshField(g, bbox, h, { project: 1 });
  // remove cap faces (those lying on the removal surface inside the cloth)
  m.idx = filterFaces(m.pos, m.idx, (x, y, z) => raw(x, y, z) > -0.35 * h);
  m = compact(m);
  if (!m.idx.length) return m;
  snapBoundary(m, raw, (x, y, z) => -rem(x, y, z), 6, h);
  // normals from the raw surface
  const e = h * 0.25;
  for (let v = 0; v < m.pos.length / 3; v++) {
    const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    const a = raw(x + e, y - e, z - e), b = raw(x - e, y - e, z + e), c = raw(x - e, y + e, z - e), d = raw(x + e, y + e, z + e);
    const gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d;
    const l = Math.hypot(gx, gy, gz) || 1;
    m.nrm[v * 3] = gx / l; m.nrm[v * 3 + 1] = gy / l; m.nrm[v * 3 + 2] = gz / l;
  }
  m.rest = m.pos.slice();
  if (rim > 0) {
    m.aux = new Float32Array(m.pos.length / 3 * 4);
    m = addRim(m, rim, { aux: 4, rest: 3 });
  }
  return m;
}

function coverFn(raw, rem, bb) {
  return (x, y, z) => {
    if (x < bb.min[0] || y < bb.min[1] || z < bb.min[2] || x > bb.max[0] || y > bb.max[1] || z > bb.max[2]) return 1;
    const r = -rem(x, y, z);
    if (r > -0.01) return r;
    return Math.max(raw(x, y, z), r);
  };
}
// hem distance (aux.w) = distance to nearest boundary vertex / 3 cm (computed on the shell before rims)
function hemDistance(m, scale = 0.03) {
  const be = boundaryEdges(m.idx);
  const bv = new Set(); for (const [a, b] of be) { bv.add(a); bv.add(b); }
  const B = [...bv].map((v) => [m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]]);
  const nv = m.pos.length / 3;
  const out = new Float32Array(nv);
  // spatial hash of boundary points
  const cell = scale;
  const H = new Map();
  const key = (i, j, k) => i * 73856093 ^ j * 19349663 ^ k * 83492791;
  for (const p of B) { const k = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell)); if (!H.has(k)) H.set(k, []); H.get(k).push(p); }
  for (let v = 0; v < nv; v++) {
    const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    const i0 = Math.floor(x / cell), j0 = Math.floor(y / cell), k0 = Math.floor(z / cell);
    let best = scale * scale;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const L = H.get(key(i0 + i, j0 + j, k0 + k)); if (!L) continue;
      for (const p of L) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) best = d; }
    }
    out[v] = Math.sqrt(best) / scale;
  }
  return out;
}

// ------------------------------------------------------------------------------------------
// garment builders
// ------------------------------------------------------------------------------------------
export function buildGarment(spec0, ctx, index) {
  const d = DEFAULTS[spec0.type] || {};
  const spec = { ...d, ...spec0 };
  const t = spec.type;
  if (['shirt', 'blouse', 'jacket', 'coat', 'lab_coat', 'dress', 'cheongsam', 'robe', 'vest', 'sailor', 'side_jacket'].includes(t)) return upperGarment(spec, ctx, index);
  if (t === 'trousers') return trousers(spec, ctx, index);
  if (t === 'skirt') return skirt(spec, ctx, index);
  if (t === 'apron') return apron(spec, ctx, index);
  if (t === 'shoes') return shoes(spec, ctx, index);
  if (t === 'sash' || t === 'belt') return sash(spec, ctx, index);
  if (t === 'shawl') return shawl(spec, ctx, index);
  console.warn('unknown garment', t);
  return null;
}

function matFactory(spec) {
  return {
    kind: 'cloth', o: {
      fabric: spec.fabric, color: spec.color ?? 0x6b6b6b, patchColor: spec.cuff?.detail?.find((x) => x.type === 'patch')?.color,
      print: spec.print || null, printScale: spec.print?.scale ?? 0.11, printAmount: spec.print?.amount ?? 1, faded: spec.faded ?? 0, mottle: spec.mottle,
      sheen: spec.sheen, roughness: spec.roughness, fold: spec.foldDetail ?? 1, wearColor: spec.wearColor,
      patchInside: !!spec.cuff?.detail?.find((x) => x.type === 'patch' && x.inside), stitchColor: spec.cuff?.detail?.find((x) => x.type === 'patch')?.stitch,
    },
  };
}
function trimMatFactory(color, spec, fabric) {
  return { kind: 'cloth', o: { fabric: fabric || spec.fabric, color: color ?? spec.color ?? 0x555555, faded: spec.faded ?? 0, mottle: spec.mottle, patchColor: spec.cuff?.detail?.find((x) => x.type === 'patch')?.color, wearColor: spec.wearColor } };
}

// common: finish a shell (weights, aux, geometry)
function finishShell(ctx, m, spec, { skirt = false, cuffInfo = null, seams = null } = {}) {
  const Rf = refs(ctx);
  const zones = [];
  for (const zname of spec.wearZones || []) for (const sd of ['L', 'R']) {
    if (zname === 'elbows') zones.push([Rf[`arm${sd}.lower`], 0.06 * ctx.P.H / 1.7, 0.75]);
    if (zname === 'shoulders') zones.push([Rf[`arm${sd}.upper`].clone().add(new THREE.Vector3(0, 0.035 * ctx.P.H / 1.7, 0)), 0.075 * ctx.P.H / 1.7, 0.6]);
    if (zname === 'knees') zones.push([Rf[`leg${sd}.lower`].clone().add(new THREE.Vector3(0, 0, 0.03)), 0.06 * ctx.P.H / 1.7, 0.6]);
  }
  const nv = m.pos.length / 3;
  const w = clothWeights(ctx, m.pos, { skirt });
  m.skinIndex = w.skinIndex; m.skinWeight = w.skinWeight;
  if (!m.aux) m.aux = new Float32Array(nv * 4);
  if (!m.rest) m.rest = m.pos.slice();
  m.restN = m.nrm.slice();
  // aux.w hem distance; aux.z seam; aux.x wear; aux.y patch
  const hd = hemDistance(m);
  for (let v = 0; v < nv; v++) {
    m.aux[v * 4 + 3] = Math.min(1, hd[v]);
    const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    m.aux[v * 4 + 2] = seams ? Math.min(1, seams(x, y, z) / 0.012) : 1;
    for (const [c, r, a] of zones) { const d2 = (x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2; if (d2 < 9 * r * r) m.aux[v * 4] = Math.max(m.aux[v * 4], a * Math.exp(-d2 / (r * r)) * (0.7 + 0.3 * vnoise3(x * 60, y * 60, z * 60, 12))); }
  }
  if (cuffInfo) cuffAux(m, cuffInfo);
  return m;
}
function cuffAux(m, cuffInfo) {
  const nv = m.pos.length / 3;
  for (let v = 0; v < nv; v++) {
    const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    for (const ci of cuffInfo) {
      // position relative to the cuff: along-axis distance from the cuff edge, angle around the forearm
      const dx = x - ci.c.x, dy = y - ci.c.y, dz = z - ci.c.z;
      const s = -(dx * ci.a.x + dy * ci.a.y + dz * ci.a.z); // >0 toward the elbow
      if (s < -0.01 || s > 0.08) continue;
      const px = dx + ci.a.x * s, py = dy + ci.a.y * s, pz = dz + ci.a.z * s; // radial
      const ang = Math.atan2(px * ci.v.x + py * ci.v.y + pz * ci.v.z, px * ci.u.x + py * ci.u.y + pz * ci.u.z);
      for (const det of ci.detail) {
        const a0 = det.angle ?? (det.type === 'patch' ? Math.PI : -Math.PI / 2);
        const da = Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0));
        if (det.type === 'worn') { // e.g. 18 x 8 mm spot centred ~1 cm above the edge
          const sd = Math.max(Math.abs(da) * ci.r - (det.w ?? 0.009), Math.abs(s - (det.at ?? 0.010)) - (det.h ?? 0.004)) + 0.0012 * vnoise3(x * 500, y * 500, z * 500, 3);
          m.aux[v * 4] = Math.max(m.aux[v * 4], clamp(0.5 - sd / 0.004) * (det.amount ?? 1));
        }
        if (det.type === 'patch') {
          const R = ci.r;
          const ea = (Math.abs(da) - (det.width ?? 0.035) / R / 2) * R, ey = Math.max(0.003 - s, s - (det.height ?? 0.04));
          const sd = Math.max(ea, ey);
          m.aux[v * 4 + 1] = Math.max(m.aux[v * 4 + 1], clamp(0.5 - sd / 0.006));
        }
      }
    }
  }
  return m;
}

function hemY(spec, P) {
  const L = spec.length;
  return (typeof L === 'number' ? L : HEM[L] ?? 0.47) * P.H;
}

function upperGarment(spec, ctx, index) {
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const t = spec.type;
  const R = refs(ctx);
  const lay = spec.layer ?? index;
  const ease = (spec.ease ?? 0.012) * s + 0.0025 * lay * s;
  const sEase = (spec.sleeveEase ?? (spec.ease ?? 0.012) * 0.8) * s + 0.002 * lay * s;
  const yHem = hemY(spec, P);
  const long = yHem < P.hipJY - 0.03 * H;               // has a skirt part
  const drape = spec.drape ?? 0.6;
  const flare = (spec.flare ?? 0) * s;
  const boneOf = (e) => ctx.bones[e.bone] || '';
  // torso + sleeves fields
  const torso = field.derive((e) => e.op === 'u' && e.tag === 'torso', { grow: ease, kAdd: 0.02 * s });
  const sleeveFrac = typeof spec.sleeve === 'number' ? spec.sleeve : SLEEVE[spec.sleeve] ?? 1;
  const arms = sleeveFrac >= 0 ? field.derive((e) => e.op === 'u' && e.tag === 'arm', { grow: sEase, kAdd: 0.012 * s }) : null;
  // drape hull (cloth hanging from the chest)
  const chestY = P.chestY + 0.03 * H, ribX = P.rib[0], ribZ = P.rib[2];
  const hipX = Math.max(P.pelvis[0], P.hipJX + P.thighR * 1.0), hipZ = Math.max(P.pelvis[2], P.thighR * 1.15);
  const hull = new Field();
  const zc = -0.01 * H;
  const topR = lerp(P.waist[0], ribX, drape) + ease;
  const yH2 = Math.max(yHem, P.hipJY - 0.02 * H);
  hull.add(prim('cone', { c: [0, 0, zc], a: [0, chestY, 0], b: [0, yH2, 0], r1: ribX * 0.96 + ease * 0.8, r2: lerp(Math.max(P.waist[0], P.pelvis[0] * 0.95), hipX, long ? 0.6 : 0.3) + ease + (long ? 0 : flare * 0.5), s: [1, 1, lerp(ribZ / ribX, 0.75, 0.3)] }), { k: 0.03 * s, bone: ctx.bi.spine, tag: 'hull' });
  if (long) hull.add(prim('cone', { c: [0, 0, zc - 0.004 * H], a: [0, P.hipJY + 0.02 * H, 0], b: [0, yHem - 0.02 * H, 0], r1: hipX + ease, r2: hipX + ease + flare + 0.012 * s, s: [1, 1, 0.78] }), { k: 0.05 * s, bone: ctx.bi.hips, tag: 'hull' });
  // wrap the layers beneath (dedupe prims this garment already covers with enough ease)
  const gapL = 0.005 * s;
  const own = new Map();
  for (const e of torso.items) own.set(e.p, e.grow);
  if (arms) for (const e of arms.items) own.set(e.p, e.grow);
  const underArms = [];
  for (const hi of ctx.hulls || []) {
    if (own.has(hi.p) && own.get(hi.p) >= (hi.grow || 0) + gapL) continue;
    const it = { ...hi, grow: (hi.grow || 0) + gapL, k: Math.max(hi.k, 0.025 * s), op: 'u' };
    if (hi.tag === 'arm' || hi.tag === 'sleeve') underArms.push(it); else hull.items.push(it);
  }
  // wide sleeves
  const sw = (spec.sleeveWidth ?? 0) * s;
  const cuffPts = {};
  for (const sd of ['L', 'R']) {
    const S0 = R[`arm${sd}.upper`], E = R[`arm${sd}.lower`], W = R[`arm${sd}.hand`];
    let C;
    if (sleeveFrac <= 0.5) C = S0.clone().lerp(E, Math.max(0.15, sleeveFrac / 0.5));
    else C = E.clone().lerp(W, (sleeveFrac - 0.5) / 0.5 * 1.0);
    // a long sleeve ends just past the wrist joint
    if (sleeveFrac >= 0.99) C = W.clone().add(R['foreDir' + sd].clone().multiplyScalar(-0.006 * s));
    cuffPts[sd] = { C, dir: sleeveFrac <= 0.5 ? R['upperDir' + sd] : R['foreDir' + sd] };
    if (sw > 0 && sleeveFrac > 0) arms && arms.add(prim('cone', { a: S0.toArray(), b: C.toArray(), r1: P.uArmR + sEase + 0.006 * s, r2: (sleeveFrac > 0.5 ? P.wristR * 1.2 : P.elbR) + sEase + sw }), { k: 0.04 * s, bone: ctx.bi[`arm${sd}.lower`], tag: 'sleeve' });
  }
  // fold displacement
  const foldA = (spec.folds ?? 1) * 0.0028 * s;
  const disp = (x, y, z) => {
    if (foldA <= 0) return 0;
    let dd = 0;
    // vertical drape folds on the torso below the chest
    const ang = Math.atan2(x, z - zc);
    const vf = sstep(chestY, chestY - 0.12 * H, y);
    dd += vf * foldA * (0.6 * Math.sin(ang * 9 + 2.1 * vnoise3(x * 4, y * 3, z * 4, 1)) + 0.4 * vnoise3(x * 18, y * 6, z * 18, 2));
    if (long) { const lf = sstep(P.hipJY, yHem, y); dd += lf * foldA * 1.6 * Math.sin(ang * 7 + 1.5 * vnoise3(x * 3, y * 2, z * 3, 3)); }
    return dd;
  };
  const sleeveDisp = (x, y, z) => {
    let dd = 0;
    for (const sd of ['L', 'R']) {
      const E = R[`arm${sd}.lower`];
      const r2 = (x - E.x) ** 2 + (y - E.y) ** 2 + (z - E.z) ** 2;
      if (r2 < (0.09 * s) ** 2) dd += foldA * 0.8 * Math.exp(-r2 / (0.05 * s) ** 2) * Math.sin(Math.sqrt(r2) * 160 / s + vnoise3(x * 30, y * 30, z * 30, 5) * 2.0);
      const C = cuffPts[sd].C;
      const c2 = (x - C.x) ** 2 + (y - C.y) ** 2 + (z - C.z) ** 2;
      if (c2 < (0.1 * s) ** 2) dd += foldA * 0.7 * Math.exp(-c2 / (0.06 * s) ** 2) * Math.sin(Math.sqrt(c2) * 120 / s + vnoise3(x * 25, y * 25, z * 25, 6) * 2.5);
    }
    return dd;
  };
  if (arms) for (const it of underArms) arms.items.push(it);
  torso.accel(ctx.accBox || { min: [-0.7 * H, 0, -0.3 * H], max: [0.7 * H, H, 0.3 * H] }, 0.05 * s);
  hull.accel({ min: [-0.7 * H, 0, -0.35 * H], max: [0.7 * H, H, 0.35 * H] }, 0.06 * s);
  if (arms) arms.accel({ min: [-0.7 * H, 0, -0.3 * H], max: [0.7 * H, H, 0.3 * H] }, 0.05 * s);
  const raw0 = (x, y, z) => {
    let dd = torso.eval(x, y, z);
    dd = smin(dd, hull.eval(x, y, z), 0.04 * s);
    if (arms) dd = smin(dd, arms.eval(x, y, z) - sleeveDisp(x, y, z), 0.03 * s);
    return dd - disp(x, y, z);
  };
  // ---- removal regions (<0 inside the removed zone)
  const nb = R.neck, neckR = P.neckR;
  const collar = spec.collar;
  const gap = (collar === 'lapel' || collar === 'shirt' ? 0.012 : collar === 'cross' ? 0.004 : 0.006) * s + ease * 0.3;
  const vDepth = (spec.vDepth ?? (collar === 'lapel' ? (t === 'coat' ? 0.17 : 0.2) : collar === 'v' ? 0.16 : collar === 'shirt' ? 0.05 : 0)) * s;
  const neckFrontDrop = (collar === 'round' ? 0.03 : 0.012) * s;
  const zFront = 0.04 * H;
  const rem = (x, y, z) => {
    // neck hole: cylinder around the neck axis, above a plane lower in front
    const dxn = x - nb.x, dzn = (z - nb.z - 0.004 * H) * 1.08;
    const cyl = Math.sqrt(dxn * dxn + dzn * dzn) - (neckR + gap);
    const lineY = nb.y + 0.012 * s - neckFrontDrop * clamp((z - nb.z) / (neckR + 0.01) * 0.5 + 0.5);
    let r = Math.max(cyl, lineY - y);
    // V opening at the front
    if (vDepth > 0) {
      const yV = nb.y - vDepth;
      const a = Math.atan2(neckR + gap + 0.01 * s, vDepth);
      const vw = Math.max(Math.abs(x) * Math.cos(a) - (y - yV) * Math.sin(a), (zFront * 0.2) - (z - nb.z + 0.01 * H), yV - y - 0.002);
      r = Math.min(r, vw);
      if (spec.open) r = Math.min(r, Math.max(Math.abs(x) - 0.035 * s, -(z - zc - 0.02 * s), y - yV));
    }
    // hem
    const hemCurve = yHem + 0.008 * s * Math.cos(Math.atan2(x, z - zc) * 2) + (z < zc ? 0.006 * s : 0) + (spec.ragged ? 0.012 * s * vnoise3(x * 30, y * 5, z * 30, 18) : 0);
    r = Math.min(r, Math.max(y - hemCurve, Math.abs(x) - 0.3 * H));
    // side slits
    if (spec.slit) { const sl = spec.slit * s; r = Math.min(r, Math.max(Math.abs(z - zc) - 0.006 * s, y - (yHem + sl), 0.05 * H - Math.abs(x))); }
    // cuffs / armholes
    for (const sd of ['L', 'R']) {
      const { C, dir } = cuffPts[sd];
      if (sleeveFrac < 0) {
        const S0 = R[`arm${sd}.upper`], ad = R['upperDir' + sd];
        const along = (x - S0.x) * ad.x + (y - S0.y) * ad.y + (z - S0.z) * ad.z;
        const rr = Math.sqrt(Math.max(0, (x - S0.x) ** 2 + (y - S0.y) ** 2 + (z - S0.z) ** 2 - along * along));
        r = Math.min(r, Math.max(0.01 * s - along, rr - 0.16 * s));
        continue;
      }
      let along = (x - C.x) * dir.x + (y - C.y) * dir.y + (z - C.z) * dir.z;
      if (spec.ragged) along += 0.012 * s * vnoise3(x * 40, y * 40, z * 40, 17);
      const rr = Math.sqrt(Math.max(0, (x - C.x) ** 2 + (y - C.y) ** 2 + (z - C.z) ** 2 - along * along));
      r = Math.min(r, Math.max(-along, rr - 0.13 * s));
    }
    return r;
  };
  const bbox = { min: [-0.62 * H, Math.max(0, yHem - 0.06 * H), -0.24 * H], max: [0.62 * H, nb.y + 0.06 * H, 0.24 * H] };
  let m = shellMesh(ctx, raw0, rem, bbox, ctx.lod.cloth, { rim: 0.0035 * s });
  // cuff info for aux (worn / patch details on sleeves)
  const cuffInfo = [];
  for (const sd of ['L', 'R']) {
    const det = (spec.cuff?.detail || []).filter((x) => (x.side || 'L') === sd);
    if (!det.length || sleeveFrac < 0) continue;
    const { C, dir } = cuffPts[sd];
    // u = dorsal (palm-back) direction of the hand in bind, v = thumb side
    const hb = ctx.BW[ctx.bi[`arm${sd}.hand`]];
    const u = new THREE.Vector3(sd === 'L' ? 1 : -1, 0, 0).transformDirection(hb);
    const v = new THREE.Vector3(0, 0, 1).transformDirection(hb);
    cuffInfo.push({ c: C, a: dir.clone(), u, v, r: P.wristR + sEase + sw * 0.5, detail: det });
  }
  // seams: side seams, shoulder seams, sleeve underseams, centre back
  const seams = (x, y, z) => {
    let dmin = 1;
    if (y < nb.y - 0.03 * H && Math.abs(x) > 0.05 * H && Math.abs(x) < 0.25 * H) dmin = Math.min(dmin, Math.abs(z - zc + 0.004 * H));
    if (z < zc && Math.abs(x) < 0.03 * H && y < nb.y - 0.02 * H && (spec.type === 'coat' || spec.type === 'jacket')) dmin = Math.min(dmin, Math.abs(x));
    for (const sd of ['L', 'R']) {
      const S0 = R[`arm${sd}.upper`];
      const dr = Math.hypot(x - S0.x, y - S0.y, z - S0.z);
      if (dr < 0.11 * s && sleeveFrac >= 0) dmin = Math.min(dmin, Math.abs(dr - 0.07 * s) * 0.8);
    }
    return dmin;
  };
  m = finishShell(ctx, m, spec, { skirt: long, cuffInfo, seams });
  const out = { name: spec.name || `${spec.type}${index}`, mat: matFactory(spec), tris: m.idx.length / 3, extras: [], accessories: [] };
  out.hulls = [...torso.items, ...hull.items, ...(arms ? arms.items : [])].filter((e) => e.op === 'u').map((e) => ({ ...e }));
  out.geo = toGeometry(m, { skin: m });
  out.cover = coverFn(raw0, rem, bbox);
  // ---- trims
  const trims = new Field();
  const trims2 = new Field(); // contrasting colour (binding)
  const trims3 = new Field(); // under-layer collar line
  const surf = (x, y, z) => raw0(x, y, z);
  const neckSurf = field.derive((e) => e.op === 'u' && (e.tag === 'neck' || e.tag === 'torso'), { grow: ease + gap * 0.7, kAdd: 0.012 * s });
  neckSurf.accel({ min: [-0.3 * H, P.chestY, -0.2 * H], max: [0.3 * H, P.headY + 0.05 * H, 0.2 * H] }, 0.04 * s);
  const ns = (x, y, z) => neckSurf.eval(x, y, z);
  const thT = 0.0062 * s;
  const tc = spec.trimColor;
  const T2 = tc !== undefined ? trims2 : trims;
  const trimPts = [];
  const neckRing = (yOff, n = 30) => ringOn(ns, new THREE.Vector3(nb.x, nb.y + yOff, nb.z + 0.004 * H), new THREE.Vector3(0, 1, 0), n, 0.2 * H, new THREE.Vector3(0, 0, 1));
  if (collar === 'mandarin' || collar === 'stand') {
    const hc = (spec.collarHeight ?? 0.032) * s;
    const ring = neckRing(0.014 * s + hc * 0.5);
    // gap at the very front for the mandarin opening
    const pts = ring.filter((p, i) => { const a = Math.atan2(p.x - nb.x, p.z - nb.z); return Math.abs(a) > 0.16; });
    const ordered = pts.sort((a, b) => Math.atan2(a.x - nb.x, -(a.z - nb.z)) - Math.atan2(b.x - nb.x, -(b.z - nb.z)));
    sweptBand(spec.collarColor !== undefined ? trims2 : trims, ns, resample(ordered, 34), { width: hc, th: thT * 1.05, embed: thT * 0.4, normal: (p) => new THREE.Vector3(p.x - nb.x, 0, p.z - nb.z).normalize(), rad: 0.002 * s });
    trimPts.push(...ordered);
  }
  if (collar === 'shirt' || collar === 'lapel' || collar === 'v' || collar === 'round') {
    // binding / rolled collar around the neckline (back) — lapels below
    const hc = collar === 'lapel' ? 0.045 * s : collar === 'shirt' ? 0.038 * s : 0.014 * s;
    const ring = neckRing(collar === 'round' ? -0.004 * s : 0.006 * s);
    const back = ring.filter((p) => (collar === 'round' ? true : (p.z - nb.z) < 0.6 * (neckR + gap)));
    const ordered = back.sort((a, b) => Math.atan2(a.x - nb.x, -(a.z - nb.z)) - Math.atan2(b.x - nb.x, -(b.z - nb.z)));
    if (ordered.length > 3) {
      if (collar === 'round') sweptBand(T2, surf, resample(ordered.map((p) => projectTo(surf, p)), 34), { width: hc, th: thT, embed: thT * 0.55, closed: true });
      else sweptBand(trims, ns, resample(ordered, 30), { width: hc, th: thT * 1.1, embed: thT * 0.3, normal: (p) => new THREE.Vector3(p.x - nb.x, 0.35, p.z - nb.z).normalize(), shift: -hc * 0.25 });
    }
    trimPts.push(...ordered);
    if (vDepth > 0 && collar !== 'round') {
      // lapels: bands along the V edges, from the side of the neck down to the V point
      const yV = nb.y - vDepth;
      for (const sg of [1, -1]) {
        const ctrl = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          const y = lerp(nb.y + 0.004 * s, yV, u);
          const xEdge = sg * lerp(neckR + gap + 0.004 * s, 0.004 * s, u);
          ctrl.push(projectTo(surf, new THREE.Vector3(xEdge, y, nb.z + 0.08 * H)));
        }
        const lw = collar === 'lapel' ? 0.06 * s : 0.02 * s;
        sweptBand(trims, surf, resample(ctrl, 14), { width: (tt) => lw * (collar === 'lapel' ? Math.sin(Math.PI * clamp(tt * 1.15)) * 0.85 + 0.15 : 1), th: thT, embed: thT * 0.5, shift: (tt) => sg * lw * 0.5 * (collar === 'lapel' ? Math.sin(Math.PI * clamp(tt * 1.15)) * 0.85 + 0.15 : 1) });
        trimPts.push(...ctrl);
      }
      // front edge (placket) below the V
      if (spec.closure === 'center') {
        const ctrl = [];
        for (let i = 0; i <= 10; i++) { const y = lerp(yV, yHem + 0.01 * s, i / 10); ctrl.push(projectTo(surf, new THREE.Vector3(spec.open ? 0.037 * s : 0.008 * s, y, 0.1 * H))); }
        sweptBand(T2, surf, resample(ctrl, 16), { width: 0.022 * s, th: thT * 0.8, embed: thT * 0.55 });
        trimPts.push(...ctrl);
        const nbtn = spec.buttons ?? 0;
        if (nbtn > 0) {
          const bp = [];
          for (let i = 0; i < nbtn; i++) bp.push(projectTo(surf, new THREE.Vector3(spec.open ? 0.05 * s : 0.012 * s, lerp(yV - 0.01 * s, Math.max(yHem + 0.08 * s, P.hipJY - 0.05 * H), nbtn > 1 ? i / (nbtn - 1) : 0), 0.1 * H)));
          const bf = new Field();
          studs(bf, surf, bp, { r: 0.0085 * s, h: 0.0022 * s, lift: 0.0018 * s });
          out._buttons = { f: bf, pts: bp, color: spec.buttonColor ?? 0x1e1c1a };
        }
      }
    }
  }
  if (spec.collar === 'shirt' && spec.closure === 'center' && !vDepth) {
    const ctrl = [];
    for (let i = 0; i <= 10; i++) ctrl.push(projectTo(surf, new THREE.Vector3(0.0, lerp(nb.y, yHem + 0.01 * s, i / 10), 0.1 * H)));
    sweptBand(trims, surf, resample(ctrl, 16), { width: 0.028 * s, th: thT * 0.8, embed: thT * 0.55 });
    trimPts.push(...ctrl);
  }
  if (collar === 'cross') {
    // 交领 (right-over-left): band from the back of the neck, round the wearer's LEFT side (+X),
    // diagonally down across the chest to the wearer's RIGHT underarm.
    const ring = neckRing(0.004 * s, 36);
    const back = ring.filter((p) => (p.z - nb.z) < 0.25 * (neckR + gap)).sort((a, b) => Math.atan2(a.x - nb.x, -(a.z - nb.z)) - Math.atan2(b.x - nb.x, -(b.z - nb.z)));
    const ctrl = back.map((p) => p.clone());
    const yEnd = P.chestY + 0.01 * H;
    for (let i = 1; i <= 9; i++) {
      const u = i / 9;
      const x = lerp(neckR * 0.9, -P.rib[0] * 0.95, sstep(0, 1, u));
      const y = lerp(nb.y - 0.01 * s, yEnd, Math.pow(u, 0.9));
      ctrl.push(projectTo(surf, new THREE.Vector3(x, y, 0.1 * H * (1 - u * 0.3))));
    }
    // left-front part of the back ring belongs before the diagonal: keep order back(R->L) then diagonal
    const pts = resample(ctrl.filter((p, i) => i === 0 || p.distanceTo(ctrl[i - 1]) > 0.003), 40);
    const cs2 = (x, y, z) => smin(surf(x, y, z), ns(x, y, z), 0.02 * s);
    sweptBand(spec.collarColor !== undefined ? trims2 : trims, cs2, pts, { width: (spec.collarWidth ?? 0.04) * s, th: thT, embed: thT * 0.45 });
    if (spec.underCollar !== undefined) sweptBand(trims3, cs2, pts.slice(0, Math.round(pts.length * 0.62)), { width: 0.012 * s, th: thT * 0.9, embed: thT * 0.5, shift: -(spec.collarWidth ?? 0.04) * s * 0.5 - 0.004 * s });
    trimPts.push(...pts);
  }
  if (spec.closure === 'side') {
    // 大襟: curved front edge from the centre of the neck across to the wearer's right underarm, then down the side
    const ctrl = [];
    const yU = P.chestY + 0.04 * H;
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const x = -lerp(0.0, P.rib[0] * 0.92, sstep(0, 1, u));
      const y = lerp(nb.y - 0.012 * s, yU, Math.pow(u, 1.6));
      ctrl.push(projectTo(surf, new THREE.Vector3(x, y, 0.1 * H * (1 - u * 0.45))));
    }
    for (let i = 1; i <= 6; i++) ctrl.push(projectTo(surf, new THREE.Vector3(-P.rib[0] * 1.1, lerp(yU, yHem + 0.012 * s, i / 6), zc + 0.004 * H)));
    sweptBand(T2, surf, resample(ctrl, 30), { width: 0.012 * s, th: thT * 0.8, embed: thT * 0.5 });
    trimPts.push(...ctrl);
    // knot buttons along the curve
    const bp = [ctrl[2], ctrl[6], ctrl[10], ctrl[12], ctrl[14]].filter(Boolean);
    const bf = new Field();
    studs(bf, surf, bp, { r: 0.0048 * s, lift: 0.002 * s, knot: true });
    out._buttons = { f: bf, pts: bp, color: spec.buttonColor ?? (spec.trimColor ?? spec.color) };
  }
  // cuff bands / rolled cuffs
  if (sleeveFrac > 0) {
    const cs = spec.cuff?.style ?? spec.cuffStyle ?? 'plain';
    if (cs === 'band' || cs === 'rolled') {
      for (const sd of ['L', 'R']) {
        const { C, dir } = cuffPts[sd];
        const wB = (spec.cuff?.width ?? (cs === 'rolled' ? 0.05 : 0.035)) * s;
        const c0 = C.clone().add(dir.clone().multiplyScalar(-wB * 0.5 - 0.002 * s));
        const ring = ringOn(surf, c0, dir.clone().negate(), 28, 0.15 * H);
        sweptBand(spec.cuff?.color !== undefined ? trims2 : trims, surf, ring, { width: wB, th: thT * (cs === 'rolled' ? 1.3 : 1.0), embed: thT * (cs === 'rolled' ? 0.3 : 0.5), closed: true, normal: (p) => { const q = p.clone().sub(c0); q.sub(dir.clone().multiplyScalar(q.dot(dir))); return q.normalize(); } });
        trimPts.push(...ring);
      }
    }
  }
  // sash / belt integrated
  const extrasFromField = (f, nameS, color, fabric) => {
    if (!f.items.length) return;
    const bb = bboxOfPts(trimPts.length ? trimPts : [new THREE.Vector3(0, P.chestY, 0)], 0.06 * s);
    const tm = meshTrim(ctx, f, ctx.lod.detail, { min: [-0.64 * H, Math.max(0, yHem - 0.05 * H), -0.25 * H], max: [0.64 * H, P.headY + 0.04 * H, 0.25 * H] });
    if (!tm.idx.length) return;
    tm.rest = tm.pos.slice(); tm.restN = tm.nrm.slice();
    const w = clothWeights(ctx, tm.pos, { skirt: long });
    tm.skinIndex = w.skinIndex; tm.skinWeight = w.skinWeight;
    tm.aux = new Float32Array(tm.pos.length / 3 * 4).fill(1); for (let v = 0; v < tm.pos.length / 3; v++) { tm.aux[v * 4] = 0; tm.aux[v * 4 + 1] = 0; }
    // patch / wear on rolled cuff bands
    if (cuffInfo.length) cuffAux(tm, cuffInfo);
    out.extras.push({ name: nameS, geo: toGeometry(tm, { skin: tm }), mat: trimMatFactory(color, spec, fabric) });
  };
  extrasFromField(trims, 'trim', spec.color, spec.fabric);
  extrasFromField(trims2, 'binding', tc ?? spec.collarColor ?? spec.cuff?.color, spec.trimFabric);
  extrasFromField(trims3, 'undercollar', spec.underCollar, 'linen');
  if (out._buttons) {
    const b = out._buttons;
    const bb = bboxOfPts(b.pts, 0.02 * s);
    const tm = meshTrim(ctx, b.f, Math.min(ctx.lod.detail, 0.0028 * s), bb);
    if (tm.idx.length) {
      tm.rest = tm.pos.slice(); tm.restN = tm.nrm.slice();
      const w = clothWeights(ctx, tm.pos, { skirt: long });
      tm.skinIndex = w.skinIndex; tm.skinWeight = w.skinWeight;
      tm.aux = new Float32Array(tm.pos.length / 3 * 4).fill(1);
      out.extras.push({ name: 'buttons', geo: toGeometry(tm, { skin: tm }), mat: (spec.collar === 'lapel' || spec.buttons ? { kind: 'leather', o: { color: b.color, roughness: 0.35, clearcoat: 0.4 } } : { kind: 'cloth', o: { fabric: 'silk', color: b.color } }) });
    }
    delete out._buttons;
  }
  return out;
}

function trousers(spec, ctx, index) {
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const R = refs(ctx);
  const lay = spec.layer ?? index;
  const ease = (spec.ease ?? 0.008) * s + 0.002 * lay * s;
  const yHem = hemY({ length: spec.length ?? 'ankle' }, P);
  const yWaist = P.spineY - 0.012 * H;
  const legs = field.derive((e) => e.op === 'u' && (e.tag === 'leg' || (e.tag === 'torso' && ctx.bones[e.bone] === 'hips')), { grow: ease, kAdd: 0.015 * s });
  const wide = (spec.wide ?? 0) * s;
  for (const sd of ['L', 'R']) {
    const Hp = R[`leg${sd}.upper`], K = R[`leg${sd}.lower`], A = R[`leg${sd}.foot`];
    if (wide > 0) {
      const tgt = A.clone().lerp(K, clamp((yHem - A.y) / (K.y - A.y)));
      const atK = clamp((yHem - A.y) / (K.y - A.y));
      legs.add(prim('cone', { a: Hp.clone().add(new THREE.Vector3(0, 0.03 * s, 0)).toArray(), b: tgt.toArray(), r1: P.thighR + ease + 0.008 * s, r2: lerp(P.ankleR + 0.016 * s, P.kneeR, atK) + ease + wide }), { k: 0.05 * s, bone: ctx.bi[`leg${sd}.lower`], tag: 'leg', w: 0.4 });
    }
  }
  legs.accel({ min: [-0.4 * H, 0, -0.25 * H], max: [0.4 * H, P.chestY, 0.25 * H] }, 0.05 * s);
  const foldA = (spec.folds ?? 1) * 0.0025 * s;
  const raw = (x, y, z) => {
    let d = legs.eval(x, y, z);
    // knee & ankle break folds
    for (const sd of ['L', 'R']) {
      const K = R[`leg${sd}.lower`];
      const r2 = (x - K.x) ** 2 + (y - K.y) ** 2 + (z - K.z) ** 2;
      if (r2 < (0.1 * s) ** 2) d -= foldA * Math.exp(-r2 / (0.06 * s) ** 2) * Math.sin((y - K.y) * 140 / s + vnoise3(x * 30, y * 10, z * 30, 7) * 2);
      if (Math.abs(y - yHem) < 0.12 * s) d -= foldA * 0.8 * sstep(yHem + 0.12 * s, yHem, y) * Math.sin(y * 120 / s + Math.atan2(x - K.x, z - K.z) * 2 + vnoise3(x * 20, y * 20, z * 20, 8) * 2);
    }
    return d;
  };
  // removal (<0 inside): above the waist line, below the hem
  const rem = (x, y, z) => Math.min(Math.max(yWaist - y, Math.abs(x) - 0.3 * H), Math.max(y - yHem, Math.abs(x) - 0.3 * H));
  const bbox = { min: [-0.3 * H, Math.max(0, yHem - 0.04 * H), -0.2 * H], max: [0.3 * H, yWaist + 0.04 * H, 0.2 * H] };
  let m = shellMesh(ctx, raw, rem, bbox, ctx.lod.cloth, { rim: 0.0035 * s });
  const seams = (x, y, z) => {
    let dmin = 1;
    for (const sd of ['L', 'R']) {
      const Hp = R[`leg${sd}.upper`];
      if (Math.abs(x) > 0.02 * s && y < Hp.y) dmin = Math.min(dmin, Math.abs(z - Hp.z - 0.004 * s) * (Math.abs(x) > Math.abs(Hp.x) ? 1 : 3));
    }
    return dmin;
  };
  m = finishShell(ctx, m, spec, { seams });
  const out = { name: spec.name || `trousers${index}`, mat: matFactory(spec), tris: m.idx.length / 3, extras: [] };
  out.hulls = legs.items.filter((e) => e.op === 'u').map((e) => ({ ...e, tag: e.w === 0.4 ? 'hull' : e.tag }));
  out.geo = toGeometry(m, { skin: m });
  out.cover = coverFn(raw, rem, bbox);
  // waistband / rolled hems
  const trims = new Field();
  const surf = raw;
  const thT = 0.007 * s;
  const ringW = ringOn(surf, new THREE.Vector3(0, yWaist - 0.016 * s, -0.01 * H), new THREE.Vector3(0, 1, 0), 40, 0.3 * H);
  if (!spec.noBand) sweptBand(trims, surf, ringW, { width: 0.03 * s, th: thT, embed: thT * 0.55, closed: true, normal: (p) => new THREE.Vector3(p.x, 0, p.z + 0.01 * H).normalize() });
  const pts = [...ringW];
  if (spec.rolled) {
    for (const sd of ['L', 'R']) {
      const K = R[`leg${sd}.lower`], A = R[`leg${sd}.foot`];
      const c = A.clone().lerp(K, clamp((yHem + 0.025 * s - A.y) / (K.y - A.y)));
      const ring = ringOn(surf, c, new THREE.Vector3(0, 1, 0), 30, 0.2 * H);
      sweptBand(trims, surf, ring, { width: 0.045 * s, th: thT * 1.25, embed: thT * 0.3, closed: true, normal: (p) => new THREE.Vector3(p.x - c.x, 0, p.z - c.z).normalize() });
      pts.push(...ring);
    }
  }
  if (trims.items.length) {
    const tm = meshTrim(ctx, trims, ctx.lod.detail, bboxOfPts(pts, 0.03 * s));
    if (tm.idx.length) {
      tm.rest = tm.pos.slice(); tm.restN = tm.nrm.slice();
      const w = clothWeights(ctx, tm.pos); tm.skinIndex = w.skinIndex; tm.skinWeight = w.skinWeight;
      tm.aux = new Float32Array(tm.pos.length / 3 * 4).fill(1);
      out.extras.push({ name: 'band', geo: toGeometry(tm, { skin: tm }), mat: trimMatFactory(spec.color, spec) });
    }
  }
  return out;
}

function skirt(spec, ctx, index) {
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const lay = spec.layer ?? index;
  const ease = (spec.ease ?? 0.01) * s + 0.003 * lay * s;
  const yHem = hemY({ length: spec.length ?? 'calf' }, P);
  const yWaist = (spec.waist ?? P.spineY / H - 0.004) * H;
  const flare = (spec.flare ?? 0.06) * s;
  const hipX = Math.max(P.pelvis[0], P.hipJX + P.thighR) + ease;
  const base = field.derive((e) => e.op === 'u' && ((e.tag === 'torso' && ['hips', 'spine'].includes(ctx.bones[e.bone])) || (e.tag === 'leg' && ctx.bones[e.bone].endsWith('upper'))), { grow: ease, kAdd: 0.02 * s });
  base.add(prim('cone', { c: [0, 0, -0.012 * H], a: [0, P.hipJY + 0.02 * H, 0], b: [0, yHem, 0], r1: hipX, r2: hipX + flare, s: [1, 1, 0.8] }), { k: 0.06 * s, bone: ctx.bi.hips, tag: 'hull' });
  base.accel({ min: [-0.4 * H, 0, -0.3 * H], max: [0.4 * H, P.chestY, 0.3 * H] }, 0.05 * s);
  const foldA = (spec.folds ?? 1) * 0.006 * s;
  const nF = spec.foldCount ?? 11;
  const raw = (x, y, z) => {
    const a = Math.atan2(x, z + 0.012 * H);
    const k = sstep(P.hipJY, yHem, y);
    return base.eval(x, y, z) - foldA * k * (Math.sin(a * nF + 1.7 * vnoise3(x * 3, y * 2.5, z * 3, 4)) * 0.75 + 0.25 * vnoise3(x * 12, y * 4, z * 12, 9));
  };
  const rem = (x, y, z) => Math.min(Math.max(yWaist - y, Math.abs(x) - 0.3 * H), Math.max(y - yHem - 0.006 * s * Math.sin(Math.atan2(x, z) * 3), Math.abs(x) - 0.4 * H));
  const bbox = { min: [-0.36 * H, Math.max(0, yHem - 0.05 * H), -0.3 * H], max: [0.36 * H, yWaist + 0.03 * H, 0.3 * H] };
  let m = shellMesh(ctx, raw, rem, bbox, ctx.lod.cloth, { rim: 0.0035 * s });
  m = finishShell(ctx, m, spec, { skirt: true, seams: (x, y, z) => (Math.abs(x) > 0.06 * H ? Math.abs(z + 0.012 * H) : 1) });
  const out = { name: spec.name || `skirt${index}`, mat: matFactory(spec), tris: m.idx.length / 3, extras: [] };
  out.hulls = base.items.filter((e) => e.op === 'u').map((e) => ({ ...e, grow: (e.grow || 0) + (e.tag === 'hull' ? foldA : 0) }));
  out.geo = toGeometry(m, { skin: m });
  out.cover = coverFn(raw, rem, bbox);
  // waistband
  const trims = new Field();
  const ring = ringOn(raw, new THREE.Vector3(0, yWaist - 0.014 * s, -0.012 * H), new THREE.Vector3(0, 1, 0), 40, 0.3 * H);
  sweptBand(trims, raw, ring, { width: 0.028 * s, th: 0.0068 * s, embed: 0.0035 * s, closed: true, normal: (p) => new THREE.Vector3(p.x, 0, p.z + 0.012 * H).normalize() });
  const tm = meshTrim(ctx, trims, ctx.lod.detail, bboxOfPts(ring, 0.03 * s));
  if (tm.idx.length) {
    tm.rest = tm.pos.slice(); tm.restN = tm.nrm.slice();
    const w = clothWeights(ctx, tm.pos); tm.skinIndex = w.skinIndex; tm.skinWeight = w.skinWeight;
    tm.aux = new Float32Array(tm.pos.length / 3 * 4).fill(1);
    out.extras.push({ name: 'band', geo: toGeometry(tm, { skin: tm }), mat: trimMatFactory(spec.bandColor ?? spec.color, spec) });
  }
  return out;
}

function apron(spec, ctx, index) {
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const lay = spec.layer ?? index;
  const ease = (spec.ease ?? 0.02) * s + 0.004 * lay * s;
  const yHem = hemY({ length: spec.length ?? 'knee' }, P);
  const yTop = spec.bib === false ? P.spineY : P.chestY + 0.07 * H;
  const half = (spec.halfWidth ?? 0.16) * s;
  const zc = -0.01 * H;
  const base = field.derive((e) => e.op === 'u' && e.tag === 'torso', { grow: ease, kAdd: 0.03 * s });
  base.add(prim('cone', { c: [0, 0, zc], a: [0, P.chestY, 0], b: [0, yHem, 0], r1: P.rib[0] + ease, r2: Math.max(P.pelvis[0], P.hipJX + P.thighR) + ease + 0.02 * s, s: [1, 1, 0.8] }), { k: 0.06 * s, bone: ctx.bi.hips, tag: 'hull' });
  for (const hi of ctx.hulls || []) if (hi.tag !== 'sleeve') base.items.push({ ...hi, grow: (hi.grow || 0) + 0.008 * s, k: Math.max(hi.k, 0.03 * s) });
  base.accel({ min: [-0.4 * H, 0, -0.3 * H], max: [0.4 * H, H, 0.3 * H] }, 0.05 * s);
  const raw = (x, y, z) => base.eval(x, y, z) - 0.002 * s * Math.sin(Math.atan2(x, z) * 8) * sstep(P.hipJY, yHem, y);
  const rem = (x, y, z) => {
    let r = z - (zc + 0.02 * s);                       // remove the back half
    r = Math.min(r, y - yHem);                            // below hem
    const topW = spec.bib === false ? half : lerp(0.09 * s, half, sstep(P.chestY + 0.07 * H, P.spineY, y));
    r = Math.min(r, topW - Math.abs(x));                  // beyond the side edges
    r = Math.min(r, yTop - y);                            // above the bib
    return r;
  };
  const bbox = { min: [-0.3 * H, Math.max(0, yHem - 0.04 * H), -0.05 * H], max: [0.3 * H, yTop + 0.03 * H, 0.25 * H] };
  let m = shellMesh(ctx, raw, rem, bbox, ctx.lod.cloth, { rim: 0.003 * s });
  m = finishShell(ctx, m, spec, { skirt: true });
  const out = { name: spec.name || `apron${index}`, mat: matFactory(spec), tris: m.idx.length / 3, extras: [] };
  out.geo = toGeometry(m, { skin: m });
  out.cover = null; // an apron covers no skin
  return out;
}

function shoes(spec, ctx, index) {
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const kind = spec.shoe || 'leather';
  const R = refs(ctx);
  const grow = (kind === 'boot' ? 0.006 : kind === 'cloth' ? 0.004 : 0.0045) * s;
  const out = { name: spec.name || `shoes${index}`, tris: 0, extras: [] };
  const fUp = field.derive((e) => e.op === 'u' && (e.tag === 'foot' || (kind === 'boot' && e.tag === 'leg' && ctx.bones[e.bone].endsWith('lower'))), { grow, kAdd: 0.006 * s });
  const soleTh = (kind === 'sandal' ? 0.011 : kind === 'cloth' ? 0.012 : kind === 'boot' ? 0.016 : 0.010) * s;
  const sole = new Field();
  for (const sd of ['L', 'R']) {
    const A = ctx.BW[ctx.bi[`leg${sd}.foot`]];
    const fl = P.footL;
    const c = new THREE.Vector3(0, -P.ankleY + soleTh * 0.5 - 0.0015, fl * 0.33).applyMatrix4(A);
    const q = new THREE.Quaternion().setFromRotationMatrix(A);
    const m = new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1));
    sole.add(prim('box', { frame: m, h: [0.034 * s, soleTh / 2, fl * 0.56], rad: 0.012 * s }), { k: 0.004, bone: ctx.bi[`leg${sd}.foot`], tag: 'sole' });
    if (kind === 'leather' || kind === 'boot') {
      const hc = new THREE.Vector3(0, -P.ankleY + soleTh + 0.008 * s, -0.022 * s).applyMatrix4(A);
      sole.add(prim('box', { frame: new THREE.Matrix4().compose(hc, q, new THREE.Vector3(1, 1, 1)), h: [0.028 * s, 0.012 * s, 0.026 * s], rad: 0.01 * s }), { k: 0.003, bone: ctx.bi[`leg${sd}.foot`], tag: 'sole' });
    }
  }
  fUp.accel({ min: [-0.3 * H, -0.05, -0.2 * H], max: [0.3 * H, P.kneeY, 0.35 * H] }, 0.04 * s);
  const collarY = kind === 'boot' ? P.ankleY + 0.07 * s : P.ankleY + (kind === 'cloth' || kind === 'slipper' ? 0.0 : 0.012 * s);
  const raw = (x, y, z) => {
    let d = fUp.eval(x, y, z);
    // flatten the bottom onto the sole top
    return d;
  };
  // removal above the collar line (lower toward the toes for cloth shoes / slippers)
  const rem = (x, y, z) => Math.max(collarY - y + (kind === 'cloth' || kind === 'slipper' ? 0.018 * s * clamp((z - 0.03 * s) / 0.08) : 0), Math.abs(x) - 0.25 * H);
  const bbox = { min: [-0.3 * H, -0.01, -0.12 * H], max: [0.3 * H, collarY + 0.04 * H, 0.24 * H] };
  if (kind !== 'sandal') {
    let m = shellMesh(ctx, raw, rem, bbox, Math.min(ctx.lod.cloth, 0.006 * s), { rim: 0.0035 * s });
    m = finishShell(ctx, m, spec, {});
    out.geo = toGeometry(m, { skin: m });
    out.tris += m.idx.length / 3;
    out.mat = kind === 'cloth' || kind === 'slipper' ? matFactory({ ...spec, fabric: spec.fabric || 'cotton', color: spec.color ?? 0x1c1b1a }) : { kind: 'leather', o: { color: spec.color ?? 0x241c17, roughness: 0.4, clearcoat: 0.3 } };
    out.cover = coverFn(raw, rem, bbox);
  } else {
    // straw sandal: straps as swept bands over the foot
    const f2 = new Field();
    for (const sd of ['L', 'R']) {
      const A = ctx.BW[ctx.bi[`leg${sd}.foot`]];
      const fs = (x, y, z) => fUp.eval(x, y, z);
      for (const zz of [0.08, 0.01]) {
        const c = new THREE.Vector3(0, -P.ankleY * 0.4, zz * s).applyMatrix4(A);
        const ring = ringOn(fs, c, new THREE.Vector3(0, 0, 1).transformDirection(A), 24, 0.1).filter((p) => p.y > -0.005 + c.y - P.ankleY * 0.45);
        if (ring.length > 4) sweptBand(f2, fs, ring.sort((a, b) => a.x - b.x), { width: 0.012 * s, th: 0.006 * s, embed: 0.0025 * s });
      }
    }
    const tm = meshTrim(ctx, f2, ctx.lod.detail, { min: [-0.3 * H, -0.01, -0.12 * H], max: [0.3 * H, 0.15 * H, 0.24 * H] });
    tm.rest = tm.pos.slice(); tm.restN = tm.nrm.slice();
    const w = clothWeights(ctx, tm.pos); tm.skinIndex = w.skinIndex; tm.skinWeight = w.skinWeight; tm.aux = new Float32Array(tm.pos.length / 3 * 4).fill(1);
    out.geo = toGeometry(tm, { skin: tm });
    out.mat = { kind: 'cloth', o: { fabric: 'canvas', color: spec.color ?? 0xb59a6a, mottle: 0.2 } };
    out.cover = null;
  }
  // sole
  sole.accel({ min: [-0.3 * H, -0.05, -0.15 * H], max: [0.3 * H, 0.1 * H, 0.3 * H] }, 0.04 * s);
  const ms = meshTrim(ctx, sole, Math.min(ctx.lod.detail, 0.004 * s), { min: [-0.3 * H, -0.01, -0.12 * H], max: [0.3 * H, 0.08 * H, 0.24 * H] });
  if (ms.idx.length) {
    ms.rest = ms.pos.slice(); ms.restN = ms.nrm.slice();
    const n = ms.pos.length / 3;
    ms.skinIndex = new Uint16Array(n * 4); ms.skinWeight = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) { ms.skinIndex[v * 4] = ms.pos[v * 3] > 0 ? ctx.bi['legL.foot'] : ctx.bi['legR.foot']; ms.skinWeight[v * 4] = 1; }
    ms.aux = new Float32Array(n * 4).fill(1);
    const sc = spec.soleColor ?? (kind === 'cloth' ? 0xe8e2d4 : kind === 'sandal' ? 0x9c8358 : 0x17130f);
    out.extras.push({ name: 'sole', geo: toGeometry(ms, { skin: ms }), mat: kind === 'cloth' ? { kind: 'cloth', o: { fabric: 'canvas', color: sc } } : kind === 'sandal' ? { kind: 'cloth', o: { fabric: 'canvas', color: sc, mottle: 0.25 } } : { kind: 'leather', o: { color: sc, roughness: 0.6 } } });
  }
  return out;
}

function sash(spec, ctx, index) {
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const y = (spec.y ?? (P.spineY / H - 0.01)) * H;
  const w = (spec.width ?? 0.05) * s;
  const lay = spec.layer ?? index;
  const base = field.derive((e) => e.op === 'u' && e.tag === 'torso', { grow: (0.016 + 0.004 * lay) * s + (spec.ease ?? 0) * s, kAdd: 0.03 * s });
  base.accel({ min: [-0.4 * H, 0, -0.3 * H], max: [0.4 * H, H, 0.3 * H] }, 0.05 * s);
  const f = new Field();
  const ring = ringOn((x, yy, z) => base.eval(x, yy, z), new THREE.Vector3(0, y, -0.01 * H), new THREE.Vector3(0, 1, 0), 40, 0.35 * H);
  sweptBand(f, (x, yy, z) => base.eval(x, yy, z), ring, { width: w, th: 0.008 * s, embed: 0.002 * s, closed: true, normal: (p) => new THREE.Vector3(p.x, 0, p.z + 0.01 * H).normalize() });
  if (spec.knot !== false) { // knot + hanging ends at the wearer's front-left
    const kp = ring.reduce((a, b) => (b.z + b.x * 0.4 > a.z + a.x * 0.4 ? b : a));
    f.add(prim('ellipsoid', { c: kp.toArray(), r: [0.022 * s, 0.018 * s, 0.014 * s] }), { k: 0.004 * s, bone: -1, tag: 'trim' });
    f.add(prim('box', { c: [kp.x + 0.006 * s, kp.y - 0.09 * s, kp.z + 0.004 * s], rot: [0.05, 0, 0.08], h: [w * 0.38, 0.08 * s, 0.003 * s], rad: 0.0025 * s }), { k: 0.004 * s, bone: -1, tag: 'trim' });
    f.add(prim('box', { c: [kp.x - 0.018 * s, kp.y - 0.07 * s, kp.z + 0.002 * s], rot: [0.05, 0, -0.12], h: [w * 0.34, 0.06 * s, 0.003 * s], rad: 0.0025 * s }), { k: 0.004 * s, bone: -1, tag: 'trim' });
  }
  const tm = meshTrim(ctx, f, ctx.lod.detail, bboxOfPts(ring, 0.2 * s));
  tm.rest = tm.pos.slice(); tm.restN = tm.nrm.slice();
  const wts = clothWeights(ctx, tm.pos, { skirt: true }); tm.skinIndex = wts.skinIndex; tm.skinWeight = wts.skinWeight;
  tm.aux = new Float32Array(tm.pos.length / 3 * 4).fill(1);
  return { name: spec.name || `sash${index}`, geo: toGeometry(tm, { skin: tm }), mat: matFactory(spec), tris: tm.idx.length / 3, extras: [], cover: null };
}

function shawl(spec, ctx, index) {
  // a shawl / cape over the shoulders (falls to mid-back, open front)
  const { P, field } = ctx;
  const H = P.H, s = H / 1.7;
  const lay = spec.layer ?? index;
  const ease = (spec.ease ?? 0.025) * s + 0.004 * lay * s;
  const base = field.derive((e) => e.op === 'u' && (e.tag === 'torso' || (e.tag === 'arm' && ctx.bones[e.bone].endsWith('upper'))), { grow: ease, kAdd: 0.04 * s });
  base.accel({ min: [-0.6 * H, 0, -0.3 * H], max: [0.6 * H, H, 0.3 * H] }, 0.05 * s);
  const yLow = (spec.low ?? 0.6) * H;
  const nb = refs(ctx).neck;
  const raw = (x, y, z) => base.eval(x, y, z) - 0.003 * s * Math.sin(Math.atan2(x, z) * 9) * sstep(P.shJY, yLow, y);
  const rem = (x, y, z) => {
    let r = y - (yLow + 0.04 * s * clamp(z / 0.1));
    const cyl = Math.hypot(x - nb.x, z - nb.z) - (P.neckR + 0.012 * s);
    r = Math.min(r, Math.max(cyl, nb.y - y));
    r = Math.min(r, Math.max(Math.abs(x) - 0.03 * s, -(z - 0.02 * s)));
    return r;
  };
  let m = shellMesh(ctx, raw, rem, { min: [-0.62 * H, yLow - 0.05 * H, -0.25 * H], max: [0.62 * H, nb.y + 0.05 * H, 0.25 * H] }, ctx.lod.cloth, { rim: 0.003 * s });
  m = finishShell(ctx, m, spec, {});
  return { name: spec.name || `shawl${index}`, geo: toGeometry(m, { skin: m }), mat: matFactory(spec), tris: m.idx.length / 3, extras: [], cover: null };
}

// ------------------------------------------------------------------------------------------
// HAIR (and head coverings). spec: {style, color, grey, thickness, hairline, bangs, volume, strands}
// styles: 'ponytail' (low, loose) | 'low_bun' (chignon) | 'bun' (high) | 'braid' (single, to mid-back) |
//   'short' | 'cropped' | 'bob' | 'loose' | 'perm' | 'topknot' | 'thin' (sparse, old) |
//   'headcloth' (wrapped cloth over a topknot) | 'headscarf' (cloth over hair & ears) | 'cap' (flat cloth cap) | 'none'
// ------------------------------------------------------------------------------------------
export function buildHair(spec, ctx) {
  const { P, field, BW, bi } = ctx;
  const hu = P.hu, H = P.H;
  const HB = BW[bi.head];
  const style = spec.style || 'short';
  const cloth = ['headscarf', 'headcloth', 'cap'].includes(style);
  // skull field: cranium + forehead masses only (big ellipsoids of the head)
  const skull = field.derive((e) => e.tag === 'head', { grow: 0 });
  skull.accel({ min: [-0.4, 0, -0.5], max: [0.4, H + 0.2, 0.5] }, 0.05);
  const inv = HB.clone().invert();
  const c0 = new THREE.Vector3(0, 0.40 * hu, -0.05 * hu); // head centre (head-local)
  const L = new THREE.Vector3();
  const U = (v) => v.map((x) => x * hu);
  const local = (x, y, z) => L.set(x, y, z).applyMatrix4(inv);
  // hairline elevation threshold vs azimuth (0 = front, ±π/2 = ears, π = nape)
  const front = spec.hairline ?? ({ short: 0.6, cropped: 0.62, thin: 0.7, topknot: 0.58 }[style] ?? 0.55);
  const bangs = spec.bangs ?? 0;
  const KN = [[0, front - bangs * 0.4], [0.5, front - 0.06 - bangs * 0.22], [0.92, 0.27], [1.3, 0.40], [1.72, 0.16], [2.3, -0.36], [Math.PI, spec.nape ?? (style === 'short' || style === 'cropped' || style === 'thin' ? -0.42 : -0.6)]];
  const eH = (phi) => {
    const a = Math.abs(phi);
    for (let i = 0; i < KN.length - 1; i++) if (a <= KN[i + 1][0]) { const t = (a - KN[i][0]) / (KN[i + 1][0] - KN[i][0]); return lerp(KN[i][1], KN[i + 1][1], t * t * (3 - 2 * t)); }
    return KN[KN.length - 1][1];
  };
  const T0 = { short: 0.075, cropped: 0.04, thin: 0.026, topknot: 0.06, ponytail: 0.085, low_bun: 0.09, bun: 0.085, braid: 0.085, bob: 0.1, loose: 0.1, perm: 0.12 }[style] ?? 0.08;
  const thick = (spec.thickness ?? T0) * hu;
  const pulled = ['ponytail', 'low_bun', 'bun', 'braid', 'topknot'].includes(style); // hair drawn back: flatter on the sides
  const f = new Field();      // extra masses (head-local frames)
  const fine = new Field();   // thin strands (meshed at finer resolution)
  const add = (fld, type, o, k = 0.05) => fld.add(prim(type, { frame: HB, ...o }), { k: k * hu, bone: bi.head, tag: 'hair' });
  if (style === 'ponytail') {
    add(f, 'ellipsoid', { c: U([0, 0.17, -0.5]), r: U([0.11, 0.1, 0.09]) }, 0.06);                 // gathered at the nape
    const tail = [[0, 0.13, -0.56, 0.075], [0, -0.05, -0.6, 0.07], [0.01, -0.25, -0.62, 0.065], [0.015, -0.45, -0.6, 0.055], [0.02, -0.62, -0.57, 0.04]];
    for (let i = 0; i < tail.length - 1; i++) add(f, 'cone', { a: U(tail[i].slice(0, 3)), b: U(tail[i + 1].slice(0, 3)), r1: tail[i][3] * hu, r2: tail[i + 1][3] * hu, s: [1, 1, 0.75] }, 0.04);
    add(f, 'torus', { c: U([0, 0.12, -0.565]), rot: [1.35, 0, 0], R: 0.06 * hu, r: 0.016 * hu }, 0.01); // elastic (same colour)
  }
  if (style === 'low_bun') { add(f, 'ellipsoid', { c: U([0, 0.2, -0.55]), rot: [0.35, 0, 0], r: U([0.17, 0.13, 0.12]) }, 0.05); add(f, 'ellipsoid', { c: U([0, 0.3, -0.47]), r: U([0.22, 0.14, 0.09]) }, 0.06); }
  if (style === 'bun') add(f, 'ellipsoid', { c: U([0, 0.64, -0.46]), r: U([0.16, 0.14, 0.14]) }, 0.05);
  if (style === 'topknot') { add(f, 'ellipsoid', { c: U([0, 0.86, -0.1]), r: U([0.1, 0.09, 0.1]) }, 0.04); }
  if (style === 'braid') {
    add(f, 'ellipsoid', { c: U([0, 0.12, -0.52]), r: U([0.1, 0.1, 0.08]) }, 0.06);
    for (let i = 0; i < 9; i++) {
      const y = 0.02 - i * 0.16, z = -0.56 - Math.min(i, 4) * 0.025, sc = 1 - i * 0.045;
      add(f, 'ellipsoid', { c: U([(i % 2 ? 0.012 : -0.012), y, z]), rot: [0.08, 0, (i % 2 ? 0.35 : -0.35)], r: U([0.07 * sc, 0.1, 0.055 * sc]) }, 0.025);
    }
    add(f, 'cone', { a: U([0, -1.42, -0.66]), b: U([0, -1.55, -0.66]), r1: 0.035 * hu, r2: 0.045 * hu }, 0.02); // tied end
  }
  if (style === 'loose') add(f, 'box', { c: U([0, 0.02, -0.33]), rot: [0.12, 0, 0], h: U([0.27, 0.36, 0.06]), rad: 0.1 * hu }, 0.1);
  if (style === 'bob') add(f, 'ellipsoid', { c: U([0, 0.22, -0.12]), r: U([0.43, 0.36, 0.5]) }, 0.08);
  if (style === 'perm') for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; add(f, 'sphere', { c: U([Math.sin(a) * 0.36, 0.42 + 0.06 * Math.cos(a * 2), -0.06 + Math.cos(a) * 0.4]), r: 0.11 * hu }, 0.06); }
  if (style === 'headcloth') {
    add(f, 'ellipsoid', { c: U([0, 0.82, -0.12]), r: U([0.15, 0.12, 0.15]) }, 0.06);      // topknot under the cloth
    add(f, 'ellipsoid', { c: U([0, 0.3, -0.56]), r: U([0.12, 0.09, 0.08]) }, 0.03);       // knot at the back
    add(f, 'box', { c: U([0.03, 0.08, -0.6]), rot: [0.15, 0, 0.12], h: U([0.045, 0.17, 0.012]), rad: 0.01 * hu }, 0.02); // hanging ends
    add(f, 'box', { c: U([-0.05, 0.12, -0.59]), rot: [0.12, 0, -0.18], h: U([0.04, 0.13, 0.012]), rad: 0.01 * hu }, 0.02);
  }
  if (style === 'headscarf') add(f, 'ellipsoid', { c: U([0, -0.05, -0.45]), r: U([0.16, 0.12, 0.11]) }, 0.05);
  if (spec.strands) { // loose strands at a temple ('R' = wearer's right = -X)
    const sg = spec.strands === 'L' ? 1 : -1;
    for (const [dx, dz, len] of [[0, 0, 1], [0.03, -0.025, 0.85], [-0.015, 0.03, 0.7]]) {
      const a = U([sg * (0.315 + dx), 0.55, 0.2 + dz]), b = U([sg * (0.335 + dx), 0.55 - 0.48 * len, 0.25 + dz]);
      const m = U([sg * (0.35 + dx), 0.55 - 0.24 * len, 0.27 + dz]);
      add(fine, 'cone', { a, b: m, r1: 0.011 * hu, r2: 0.009 * hu }, 0.01);
      add(fine, 'cone', { a: m, b, r1: 0.009 * hu, r2: 0.005 * hu }, 0.01);
    }
  }
  if (f.items.length) f.accel({ min: [-0.5, 0, -0.6], max: [0.5, H + 0.2, 0.5] }, 0.04);
  const capFn = (x, y, z) => {
    const p = local(x, y, z);
    const dx = p.x - c0.x, dy = p.y - c0.y, dz = p.z - c0.z;
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const phi = Math.atan2(dx, dz), el = Math.asin(clamp(dy / r, -1, 1));
    let eh, tt;
    if (cloth) {
      eh = style === 'cap' ? 0.5 : style === 'headcloth' ? lerp(0.5, -0.25, sstep(0.5, 2.6, Math.abs(phi))) : lerp(0.15, -0.9, sstep(0.6, 2.4, Math.abs(phi)));
      tt = (style === 'headcloth' ? 0.07 : 0.05) * hu * sstep(-0.02, 0.12, el - eh) + 0.004 * hu;
      if (style === 'headcloth') tt += 0.012 * hu * Math.sin(phi * 3 + el * 9) * sstep(-0.02, 0.2, el - eh); // wrapped folds
    } else {
      eh = eH(phi);
      tt = thick * sstep(-0.01, 0.42, el - eh) + 0.0004;
      tt *= 0.8 + 0.25 * sstep(0.2, 1.2, el);                        // more volume on top
      if (spec.part !== false && !['short', 'cropped', 'thin', 'perm'].includes(style)) { // soft centre / side part
        const px = p.x - (spec.partX ?? 0.06) * hu;
        tt *= 1 - 0.45 * Math.exp(-(px * px) / (0.022 * hu) ** 2) * sstep(0.6, 1.1, el) * sstep(-0.3, 0.4, p.z / hu);
      }
      if (pulled) tt *= lerp(1, 0.72, sstep(0.3, 1.3, Math.abs(phi)) * sstep(0.9, -0.2, el)); // flatter over the ears/sides
      if (style === 'short' || style === 'cropped' || style === 'thin') tt *= 1 + 0.25 * sstep(0.6, 1.3, el) * (style === 'thin' ? -2.2 : 1);
      if (spec.thinCrown) tt *= 1 - 0.55 * sstep(0.95, 1.35, el);
      tt += (spec.volume ?? 0) * hu * sstep(0, 0.6, el);
    }
    const over = el - eh;
    let d = Math.max(skull.eval(x, y, z) - Math.max(0.0004, tt), -over * r * 0.9);
    if (f.items.length) d = smin(d, f.eval(x, y, z), 0.04 * hu);
    if (style === 'cap') {
      const q = p;
      const crown = Math.hypot(q.x / 0.47, (q.y - 0.66 * hu) / 0.16, (q.z + 0.03 * hu) / 0.55) * 0.16 - 0.16 * hu;
      const brim = Math.max(Math.hypot(q.x / 0.37, (q.z - 0.40 * hu) / 0.22) * 0.22 - 0.22 * hu, Math.abs(q.y - 0.565 * hu + (q.z - 0.40 * hu) * 0.28) - 0.012 * hu);
      d = Math.min(d, smin(crown, brim, 0.04 * hu));
    }
    return d;
  };
  // strand grooves as geometry (subtle): only for real hair, small amplitude
  const fn = capFn;
  const hc = new THREE.Vector3().setFromMatrixPosition(HB);
  const r = hu * 0.95;
  const down = style === 'braid' ? 1.7 : style === 'ponytail' ? 0.8 : style === 'loose' ? 0.6 : 0.45;
  const bb = { min: [hc.x - r, hc.y - down * hu, hc.z - r * 1.15], max: [hc.x + r, hc.y + 1.1 * hu, hc.z + r] };
  const hh = ctx.lod.hair * (hu / 0.21);
  let m = meshField(fn, bb, hh, { project: 2 });
  if (fine.items.length) {
    fine.accel({ min: [-0.5, 0, -0.5], max: [0.5, H + 0.2, 0.5] }, 0.03);
    const mf = meshField((x, y, z) => fine.eval(x, y, z), fieldBBox(fine, 0.004), Math.min(hh, 0.0016), { project: 2 });
    if (mf.idx.length) {
      const off = m.pos.length / 3;
      const pos = new Float32Array(m.pos.length + mf.pos.length); pos.set(m.pos); pos.set(mf.pos, m.pos.length);
      const nrm = new Float32Array(m.nrm.length + mf.nrm.length); nrm.set(m.nrm); nrm.set(mf.nrm, m.nrm.length);
      const idx = new Uint32Array(m.idx.length + mf.idx.length); idx.set(m.idx); for (let i = 0; i < mf.idx.length; i++) idx[m.idx.length + i] = mf.idx[i] + off;
      m = { pos, nrm, idx };
    }
  }
  m.rest = m.pos.slice(); m.restN = m.nrm.slice();
  const n = m.pos.length / 3;
  m.skinIndex = new Uint16Array(n * 4).fill(bi.head); m.skinWeight = new Float32Array(n * 4); for (let v = 0; v < n; v++) m.skinWeight[v * 4] = 1;
  m.aux = new Float32Array(n * 4).fill(1); for (let v = 0; v < n; v++) { m.aux[v * 4] = 0; m.aux[v * 4 + 1] = 0; }
  const crown = new THREE.Vector3(0, 0.86 * hu, -0.16 * hu).applyMatrix4(HB);
  return {
    geo: toGeometry(m, { skin: m }), tris: m.idx.length / 3,
    mat: cloth
      ? { kind: 'cloth', o: { fabric: spec.fabric || 'cotton', color: spec.color ?? 0x3b3f4a, mottle: 0.12, side: THREE.FrontSide } }
      : { kind: 'hair', o: { color: spec.color ?? 0x17120f, grey: spec.grey ?? 0, crown: crown.toArray() } },
  };
}
