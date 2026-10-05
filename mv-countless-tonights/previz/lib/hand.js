// hand.js — detailed sculpted hand for close-ups / macro (and the figures' hands at lower LOD).
//
//   import { makeHand, pairHands, HAND_POSES } from '/previz/lib/hand.js';
//   const h = makeHand({ side:'L', variant:'glove'|'bare'|'salt', age:0.2, skin:0xd2a586,
//                        lod:'macro'|'close'|'figure', cuffs:[{style:'rolled', color, fabric, detail:[{type:'patch'}]}] });
//   scene.add(h.root);  h.placeWrist(pos, fingerDir, palmNormal);  h.pose('grip', {radius:0.02});
//
// Canonical frame (LEFT hand): wrist joint at origin, forearm along +Y, fingers toward −Y,
// palm faces −X (dorsal +X), thumb on the +Z side. RIGHT hands are the X-mirror (palm faces +X).
// This equals the figure's neutral pose (arms hanging, palms toward the thighs, thumbs forward).
import * as THREE from 'three';
import { Field, prim, meshField, compact, toGeometry, mirrorX, vnoise3, filterFaces, boundaryEdges } from './figure_sdf.js';
import { skinMaterial, clothMaterial } from './figure_mat.js';

export const FINGERS = ['index', 'middle', 'ring', 'little'];
const LOD_H = { macro: 0.00085, close: 0.0013, figure: 0.0026, crowd: 0.004 };

function dimsOf(o) {
  const male = o.sex === 'm';
  const L = o.length ?? (male ? 0.19 : 0.174);
  const s = L / 0.18;
  const wf = (o.width ?? (male ? 1.05 : 0.94)) * s;     // width (z) factor
  const tf = (o.thick ?? (male ? 1.04 : 0.96)) * s;     // thickness (x) factor
  const age = o.age ?? 0.2;
  const knob = 1 + 0.03 * age;                          // older: knobblier joints
  const F = [
    { name: 'index', mcp: [0.0012, -0.0935, 0.0250], len: [0.0370, 0.0225, 0.0190], r: [0.0093, 0.0084, 0.0076, 0.0068], fan: -0.07 },
    { name: 'middle', mcp: [0.0012, -0.0965, 0.0072], len: [0.0400, 0.0255, 0.0200], r: [0.0095, 0.0087, 0.0078, 0.0069], fan: -0.005 },
    { name: 'ring', mcp: [0.0008, -0.0935, -0.0110], len: [0.0375, 0.0245, 0.0195], r: [0.0089, 0.0081, 0.0074, 0.0065], fan: 0.06 },
    { name: 'little', mcp: [0.0000, -0.0855, -0.0275], len: [0.0300, 0.0180, 0.0175], r: [0.0078, 0.0071, 0.0065, 0.0058], fan: 0.14 },
  ].map((f) => ({
    ...f,
    mcp: [f.mcp[0] * tf, f.mcp[1] * s, f.mcp[2] * wf],
    len: f.len.map((x) => x * s),
    r: f.r.map((x, i) => x * Math.sqrt(wf * tf) * (o.slender ?? 1) * (i === 1 || i === 2 ? knob : 1)),
  }));
  const T = {
    cmc: [-0.0080 * tf, -0.0255 * s, 0.0190 * wf],
    dir: [-0.33, -0.70, 0.63], nailDir: [0.55, 0.0, 0.84],
    len: [0.039 * s, 0.029 * s, 0.025 * s],
    r: [0.0108, 0.0097, 0.0092, 0.0084].map((x) => x * Math.sqrt(wf * tf) * (o.slender ?? 1)),
  };
  return { L, s, wf, tf, F, T, age, wristR: [0.0175 * tf, 0.0262 * wf] };
}

const _e = new THREE.Euler(), _q1 = new THREE.Quaternion();
function quatFromBasis(xAxis, yAxis) {
  const X = new THREE.Vector3().fromArray(xAxis).normalize();
  const Y = new THREE.Vector3().fromArray(yAxis).normalize();
  X.sub(Y.clone().multiplyScalar(X.dot(Y))).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  const m = new THREE.Matrix4().makeBasis(X, Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

// ------------------------------------------------------------------------------------------
// skeleton (canonical LEFT, rest pose)
// ------------------------------------------------------------------------------------------
function buildRest(D) {
  const B = [];
  const add = (name, parent, pos, quat) => { B.push({ name, parent, pos: pos.slice(), quat: quat ? quat.clone() : new THREE.Quaternion() }); return B.length - 1; };
  const forearm = add('forearm', -1, [0, 0, 0]);
  const wrist = add('wrist', forearm, [0, 0, 0]);
  const fingerBones = {};
  for (const f of D.F) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(f.fan, 0, 0));
    const b1 = add(f.name + '1', wrist, f.mcp, q);
    const b2 = add(f.name + '2', b1, [0, -f.len[0], 0]);
    const b3 = add(f.name + '3', b2, [0, -f.len[1], 0]);
    fingerBones[f.name] = [b1, b2, b3];
  }
  const T = D.T;
  const q0 = quatFromBasis(T.nailDir, T.dir.map((x) => -x));
  const t0 = add('thumb0', wrist, T.cmc, q0);
  const t1 = add('thumb1', t0, [0, -T.len[0], 0], new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.12)));
  const t2 = add('thumb2', t1, [0, -T.len[1], 0], new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.08)));
  fingerBones.thumb = [t0, t1, t2];
  // world matrices
  const W = B.map(() => new THREE.Matrix4());
  B.forEach((b, i) => {
    const local = new THREE.Matrix4().compose(new THREE.Vector3().fromArray(b.pos), b.quat, new THREE.Vector3(1, 1, 1));
    W[i] = b.parent < 0 ? local : W[b.parent].clone().multiply(local);
  });
  return { B, W, fingerBones, forearm, wrist };
}

// ------------------------------------------------------------------------------------------
// sculpt (canonical LEFT)
// ------------------------------------------------------------------------------------------
function buildField(D, R, o) {
  const f = new Field();
  const { W, fingerBones, wrist, forearm } = R;
  const s = D.s, wf = D.wf, tf = D.tf, age = D.age;
  const nails = [];
  const fw = W[wrist];
  const kP = 0.0055 * s;
  // forearm stub
  const stub = o.forearmLen ?? 0.12;
  f.add(prim('cone', { frame: W[forearm], a: [0, -0.004, 0], b: [0, stub * s, 0], r1: D.wristR[1], r2: D.wristR[1] * 1.18, s: [D.wristR[0] / D.wristR[1], 1, 1] }), { k: 0.008 * s, bone: forearm, tag: 'forearm' });
  f.add(prim('sphere', { frame: W[forearm], c: [0.0030 * tf, 0.014 * s, -0.0195 * wf], r: 0.0050 * s }), { k: 0.008 * s, bone: forearm, tag: 'forearm' }); // ulnar head
  // carpus / heel of hand
  f.add(prim('ellipsoid', { frame: fw, c: [-0.0005, -0.017 * s, 0.001], r: [0.0150 * tf, 0.025 * s, 0.0285 * wf] }), { k: 0.01 * s, bone: wrist, tag: 'palm' });
  // palm block (rounded) + dorsal arch
  f.add(prim('box', { frame: fw, c: [0.0004 * tf, -0.0565 * s, -0.0010 * wf], rot: [0.14, 0, 0], h: [0.0022 * tf, 0.0255 * s, 0.0215 * wf], rad: 0.0098 * s }), { k: 0.009 * s, bone: wrist, tag: 'palm' });
  f.add(prim('ellipsoid', { frame: fw, c: [0.0032 * tf, -0.060 * s, -0.0010], rot: [0.14, 0, 0], r: [0.0098 * tf, 0.036 * s, 0.0315 * wf] }), { k: 0.008 * s, bone: wrist, tag: 'palm' });
  // thenar (two parts: palm-bound and thumb-bound)
  f.add(prim('ellipsoid', { frame: fw, c: [-0.0080 * tf, -0.040 * s, 0.0165 * wf], rot: [0.25, 0, 0.3], r: [0.0115 * tf, 0.026 * s, 0.0135 * wf] }), { k: 0.008 * s, bone: wrist, tag: 'palm' });
  f.add(prim('ellipsoid', { frame: fw, c: [-0.0070 * tf, -0.033 * s, 0.0245 * wf], rot: [0.5, 0, 0.3], r: [0.0095 * tf, 0.019 * s, 0.0100 * wf] }), { k: 0.008 * s, bone: fingerBones.thumb[0], tag: 'palm', w: 0.8 });
  // hypothenar
  f.add(prim('ellipsoid', { frame: fw, c: [-0.0062 * tf, -0.052 * s, -0.0240 * wf], rot: [0.05, 0, 0], r: [0.0088 * tf, 0.030 * s, 0.0100 * wf] }), { k: 0.008 * s, bone: wrist, tag: 'palm' });
  // distal palm pads under the finger bases
  f.add(prim('ellipsoid', { frame: fw, c: [-0.0060 * tf, -0.0875 * s, -0.001 * wf], rot: [0.14, 0, 0], r: [0.0068 * tf, 0.0110 * s, 0.0305 * wf] }), { k: 0.006 * s, bone: wrist, tag: 'palm' });
  // shallow hollow in the palm centre
  f.sub(prim('ellipsoid', { frame: fw, c: [-0.0205 * tf, -0.060 * s, -0.003 * wf], r: [0.0075 * tf, 0.020 * s, 0.014 * wf] }), { k: 0.008 * s });
  // dorsal tendons (more visible with age)
  const tendon = 0.0011 + 0.0006 * age;
  for (const fi of D.F) {
    f.add(prim('cone', { frame: fw, a: [0.0085 * tf, -0.018 * s, fi.mcp[2] * 0.45], b: [0.0098 * tf + 0.0008, fi.mcp[1] + 0.004, fi.mcp[2]], r1: tendon, r2: tendon * 1.1 }), { k: 0.0035 * s, bone: wrist, tag: 'tendon' });
  }
  if (age > 0.4) { // veins
    const vk = (age - 0.4) * 1.6;
    const vein = (a, b, r) => f.add(prim('cone', { frame: fw, a, b, r1: r, r2: r * 0.85 }), { k: 0.0028 * s, bone: wrist, tag: 'vein' });
    vein([0.0098 * tf, -0.012 * s, 0.006 * wf], [0.0102 * tf, -0.045 * s, -0.004 * wf], 0.0011 * vk);
    vein([0.0102 * tf, -0.045 * s, -0.004 * wf], [0.0098 * tf, -0.07 * s, 0.012 * wf], 0.0010 * vk);
    vein([0.0102 * tf, -0.045 * s, -0.004 * wf], [0.0095 * tf, -0.066 * s, -0.02 * wf], 0.0009 * vk);
    vein([0.0095 * tf, -0.01 * s, -0.016 * wf], [0.0102 * tf, -0.045 * s, -0.004 * wf], 0.0009 * vk);
  }
  // fingers
  const addDigit = (bones, lens, rr, isThumb) => {
    for (let j = 0; j < 3; j++) {
      const bw = W[bones[j]], L = lens[j], r0 = rr[j], r1 = rr[j + 1];
      const flat = isThumb ? (j === 2 ? 0.8 : 0.88) : 0.86;
      f.add(prim('cone', { frame: bw, a: [0, 0, 0], b: [0, -L, 0], r1: r0, r2: r1, s: [flat, 1, 1] }), { k: 0.0042 * s, bone: bones[j], tag: 'finger' });
      // palmar pad
      const pr = (r0 + r1) / 2;
      const tip = j === 2;
      f.add(prim('ellipsoid', { frame: bw, c: [-pr * (tip ? 0.2 : 0.26), -L * (tip ? 0.60 : 0.52), 0], r: [pr * (tip ? 0.74 : 0.66), L * (tip ? 0.42 : 0.40), pr * (tip ? 0.86 : 0.84)] }), { k: pr * 0.7, bone: bones[j], tag: 'pad' });
      // dorsal knuckle at the joint at the end of this phalanx (PIP/DIP heads)
      if (j < 2) f.add(prim('ellipsoid', { frame: bw, c: [r1 * 0.06, -L, 0], r: [r1 * 0.82, r1 * 0.78, r1 * 1.0] }), { k: r1 * 0.8, bone: bones[j], tag: 'knuckle' });
      if (tip) {
        const rr2 = (r0 * 0.42 + r1 * 0.58) * flat;
        const np = prim('ellipsoid', { frame: bw, c: [rr2 - 0.00075, -L * 0.58, 0], rot: [0.06, 0, 0], r: [0.00105, L * 0.40, (r0 + r1) * 0.5 * 0.68] });
        f.add(np, { k: 0.0009 * s, bone: bones[j], tag: 'nail' });
        nails.push({ bone: bones[j], frame: bw.clone().invert(), L, w: (r0 + r1) * 0.5 * 0.62, x0: rr2 * 0.4 });
      }
    }
  };
  for (const fi of D.F) {
    // metacarpal head (knuckle) – belongs to the palm
    f.add(prim('sphere', { frame: fw, c: [fi.mcp[0] + 0.0042 * tf, fi.mcp[1] + 0.002 * s, fi.mcp[2]], r: fi.r[0] * 0.88 }), { k: 0.006 * s, bone: wrist, tag: 'mcp' });
    addDigit(fingerBones[fi.name], fi.len, fi.r, false);
  }
  addDigit(fingerBones.thumb, D.T.len, D.T.r, true);
  // thumb web (between thumb metacarpal and index)
  f.add(prim('cone', { frame: fw, a: [-0.001 * tf, -0.034 * s, 0.022 * wf], b: [0.0005 * tf, -0.062 * s, 0.028 * wf], r1: 0.0068 * s, r2: 0.0052 * s, s: [0.8, 1, 1] }), { k: 0.007 * s, bone: wrist, tag: 'web', w: 0.7 });
  return { f, nails };
}

// signed rectangle-ish footprint distance of a nail (negative inside), in the distal bone frame
function nailSD(n, x, y, z) {
  const p = new THREE.Vector3(x, y, z).applyMatrix4(n.frame);
  if (p.x < n.x0) return 0.004;
  const cy = -n.L * 0.6, hy = n.L * 0.36;
  const dy = (p.y - cy) / hy, dz = p.z / n.w;
  const r = Math.pow(Math.pow(Math.abs(dy), 3) + Math.pow(Math.abs(dz), 3), 1 / 3);
  return (r - 1) * Math.min(hy, n.w);
}

const _cache = new Map();
export const HAND_CACHE = _cache;

// ------------------------------------------------------------------------------------------
// cuff stub: sleeve tube around the forearm, opening at the wrist.
// c = {style:'plain'|'band'|'rolled', color, fabric, radius, len, edge (y of opening), th,
//      detail:[{type:'worn'|'patch', angle?, color?}], inner: true}
// ------------------------------------------------------------------------------------------
function buildCuff(D, c, h) {
  const s = D.s;
  const R = (c.radius ?? 0.042) * s;
  const y0 = (c.edge ?? 0.004) * s;          // opening (towards the hand is −Y)
  const y1 = (c.len ?? 0.13) * s;
  const th = Math.max(c.th ?? 0.0028, h * 2.4);
  const ex = c.ellipse ?? 0.86;               // x squash (dorsal/palmar)
  const fold = c.fold ?? 1;
  const roll = c.style === 'rolled', band = c.style === 'band';
  const rollW = (c.rollW ?? (roll ? 0.045 : 0.03)) * s;
  const tube = (x, y, z, Rr, ya, yb) => {
    const ang = Math.atan2(z, x);
    const rr = Rr * (1 + 0.05 * (y - y0) / 0.1) * (1 + fold * 0.04 * vnoise3(Math.cos(ang) * 2.2, y * 22, Math.sin(ang) * 2.2, 3) + fold * 0.025 * Math.sin(ang * 5 + y * 40));
    const q = Math.sqrt((x / ex) ** 2 + z * z);
    const dr = Math.abs(q - rr) - th / 2;
    return Math.max(dr, ya - y, y - yb);
  };
  const fn = (x, y, z) => {
    let d = tube(x, y, z, R, y0, y1);
    if (roll || band) {
      const d2 = tube(x, y, z, R + th * (roll ? 1.05 : 0.75), y0 - (roll ? th * 0.2 : 0), y0 + rollW);
      const k = th * 0.9;
      const hh = Math.max(k - Math.abs(d - d2), 0) / k;
      d = Math.min(d, d2) - hh * hh * k * 0.25;
    }
    return d;
  };
  const pad = R + th * 3 + 0.01;
  const m = meshField(fn, { min: [-pad, y0 - th * 2, -pad], max: [pad, y1 + th, pad] }, h, { project: 2 });
  // aux: x wear, y patch, z seam, w hem
  const nv = m.pos.length / 3;
  const aux = new Float32Array(nv * 4);
  const det = c.detail || [];
  for (let v = 0; v < nv; v++) {
    const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2];
    const ang = Math.atan2(z, x); // 0 = dorsal (+X), ±π = palmar, +π/2 = thumb side
    let wear = 0, patch = 0;
    for (const d of det) {
      if (d.type === 'worn') { // e.g. 18 x 8 mm, ~1 cm above the edge, outer (little-finger, -Z) side
        const a0 = d.angle ?? -Math.PI / 2;
        const da = Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0));
        const sd = Math.max(Math.abs(da) * R - (d.w ?? 0.009), Math.abs(y - y0 - (d.at ?? 0.010)) - (d.h ?? 0.004)) + 0.0008 * vnoise3(x * 600, y * 600, z * 600, 4);
        wear = Math.max(wear, Math.min(1, Math.max(0, 0.5 - sd / 0.003)) * (d.amount ?? 1));
      }
      if (d.type === 'patch') {
        const a0 = d.angle ?? Math.PI; // palmar side
        const da = Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0));
        const halfA = (d.width ?? 0.032) * s / R / 2, ya = y0 + (d.from ?? 0.005) * s, yb = y0 + (d.to ?? (roll ? 0.04 : 0.035)) * s;
        const ea = (Math.abs(da) - halfA) * R, ey = Math.max(ya - y, y - yb);
        const sd = Math.max(ea, ey) + 0.0008 * vnoise3(x * 400, y * 400, z * 400, 9);
        // 'inside' patches live on the inner wall of the sleeve (normal toward the axis)
        const inner = (m.nrm[v * 3] * x / ex + m.nrm[v * 3 + 2] * z) < 0;
        if (!d.inside || inner) patch = Math.max(patch, Math.min(1, Math.max(0, 0.5 - sd / 0.004)));
      }
    }
    aux[v * 4] = wear;
    aux[v * 4 + 1] = patch;
    aux[v * 4 + 2] = Math.min(1, Math.abs(Math.atan2(Math.sin(ang - Math.PI * 0.82), Math.cos(ang - Math.PI * 0.82))) * R / 0.012); // underside seam
    aux[v * 4 + 3] = Math.min(1, Math.max(0, (y - y0)) / (0.03 * s));
  }
  m.aux = aux;
  return m;
}

// cache key of a hand built with options o (geometry only; materials are per instance)
export function handCacheKey(o = {}) {
  const D = dimsOf(o);
  const h = o.h || LOD_H[o.lod || 'close'] || LOD_H.close;
  const glove = (o.variant || 'bare') === 'glove' || o.glove === true;
  const salt = o.variant === 'salt' ? (o.salt ?? 1) : (o.salt ?? 0);
  return JSON.stringify({ v: 'hand-1', L: D.L, wf: D.wf, tf: D.tf, age: D.age, sex: o.sex, h, glove, gloveOnly: !!o.gloveOnly, salt: salt > 0, fl: o.forearmLen, sl: o.slender, cuffs: (o.cuffs || []).map((c) => ({ ...c, material: undefined })), side: o.side || 'L', smudge: o.smudge || null, wrist: o.wrist || null });
}

// ------------------------------------------------------------------------------------------
export function makeHand(o = {}) {
  const side = o.side || 'L';
  const variant = o.variant || 'bare';                // 'bare' | 'glove' | 'salt'
  const lod = o.lod || 'close';
  const h = o.h || LOD_H[lod] || LOD_H.close;
  const D = dimsOf(o);
  const R = buildRest(D);
  const mir = side === 'R';
  const glove = variant === 'glove' || o.glove === true;
  const salt = variant === 'salt' ? (o.salt ?? 1) : (o.salt ?? 0);
  const key = handCacheKey(o);
  let G = _cache.get(key);
  if (!G) {
    G = {};
    const { f, nails } = buildField(D, R, o);
    if (salt > 0) { // rough, weathered skin
      const base = f.disp;
      f.disp = (x, y, z, d) => d - 0.00012 * vnoise3(x * 900, y * 900, z * 900, 5) - 0.0001 * vnoise3(x * 300, y * 300, z * 300, 6);
    }
    const ev = (x, y, z) => f.eval(x, y, z);
    const yTop = ((o.forearmLen ?? 0.12) - 0.004) * D.s;
    const clipTop = (x, y, z) => Math.max(ev(x, y, z), y - yTop);
    const bb = { min: [-0.065 * D.s, -0.205 * D.s, -0.05 * D.s], max: [0.04 * D.s, yTop + 0.004, 0.10 * D.s] };
    f.accel({ min: [bb.min[0] - 0.01, bb.min[1] - 0.01, bb.min[2] - 0.01], max: [bb.max[0] + 0.01, bb.max[1] + 0.01, bb.max[2] + 0.01] }, 0.009 * D.s);
    const skinMesh = (field) => {
      let m = meshField(field, bb, h, { project: 2 });
      // drop the cap at the forearm cut (open tube)
      m.idx = filterFaces(m.pos, m.idx, (x, y, z) => y < yTop - h * 0.6);
      m = compact(m);
      return m;
    };
    const ms = skinMesh(clipTop);
    const nv = ms.pos.length / 3;
    const w = f.weights(ms.pos, { tau: 0.0022 * D.s, nBones: R.B.length, exclude: (e) => e.tag === 'vein' || e.tag === 'tendon' });
    // aux: nail mask, salt, joint coordinate, side
    const aux = new Float32Array(nv * 4);
    const inv = R.W.map((m) => m.clone().invert());
    const joints = []; // finger bones (for the glove seams)
    for (const name of [...FINGERS, 'thumb']) for (let j = 0; j < 3; j++) joints.push(R.fingerBones[name][j]);
    // joint list for crease coordinates: centre, axis (distal direction), radius
    const JT = [];
    const radOf = (name, j) => (name === 'thumb' ? D.T.r[j] : D.F.find((ff) => ff.name === name).r[j]);
    for (const name of [...FINGERS, 'thumb']) for (let j = name === 'thumb' ? 1 : 0; j < 3; j++) {
      const bm = R.W[R.fingerBones[name][j]];
      const c = new THREE.Vector3().setFromMatrixPosition(bm);
      const ax = new THREE.Vector3(0, -1, 0).transformDirection(bm);
      JT.push({ c, ax, r: radOf(name, j), mcp: j === 0 });
    }
    const pv = new THREE.Vector3(), nv3 = new THREE.Vector3(), dX = new THREE.Vector3();
    for (let v = 0; v < nv; v++) {
      const x = ms.pos[v * 3], y = ms.pos[v * 3 + 1], z = ms.pos[v * 3 + 2];
      let nm = 0;
      for (const n of nails) nm = Math.max(nm, Math.min(1, Math.max(0, 0.5 - nailSD(n, x, y, z) / 0.0011)));
      // side: normal against the dominant bone's dorsal axis (+X local)
      const b = w.skinIndex[v * 4];
      nv3.set(ms.nrm[v * 3], ms.nrm[v * 3 + 1], ms.nrm[v * 3 + 2]);
      dX.set(1, 0, 0).transformDirection(R.W[b]);
      const sideV = Math.max(-1, Math.min(1, nv3.dot(dX) * 1.6));
      // crease coordinate: signed axial offset from the nearest joint, only on the finger surface
      let js = 0.02, best = 1e9;
      for (const J of JT) { // (only used for salt placement; the shader computes creases exactly)
        const dx = x - J.c.x, dy = y - J.c.y, dz = z - J.c.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < best) { best = d2; js = dx * J.ax.x + dy * J.ax.y + dz * J.ax.z; }
      }
      let sm = 0;
      if (salt > 0) {
        const dors = Math.max(0, sideV);
        sm = Math.min(1, 0.3 + 0.5 * dors + 0.3 * vnoise3(x * 120, y * 120, z * 120, 11) + 0.25 * (1 - Math.min(1, Math.abs(js) / 0.006)));
      }
      aux[v * 4] = nm; aux[v * 4 + 1] = sm; aux[v * 4 + 2] = 0; aux[v * 4 + 3] = sideV;
    }
    G.joints = JT.map((J) => ({ c: J.c.toArray(), ax: J.ax.toArray(), r: J.mcp ? -J.r : J.r }));
    ms.aux = aux;
    ms.skinIndex = w.skinIndex; ms.skinWeight = w.skinWeight;
    G.skin = ms;
    if (glove) {
      // cotton glove: grown, smoothed hand + cuff up the wrist
      const gf = f.derive((e) => e.tag !== 'nail' && e.tag !== 'vein' && e.tag !== 'tendon' && e.tag !== 'knuckle' && e.tag !== 'mcp', { grow: (e) => (e.op === 's' ? -0.0012 : e.tag === 'pad' ? 0.0004 : 0.0009) * D.s, kMul: 1.35, kAdd: 0.0006 });
      const gcuffLen = (o.gloveCuff ?? 0.055) * D.s;
      gf.add(prim('cone', { frame: R.W[R.forearm], a: [0, -0.01, 0], b: [0, gcuffLen, 0], r1: D.wristR[1] + 0.0014, r2: D.wristR[1] + 0.006, s: [D.wristR[0] / D.wristR[1] * 1.05, 1, 1] }), { k: 0.008, bone: R.forearm, tag: 'gcuff' });
      gf.disp = (x, y, z, d) => d - 0.00025 * vnoise3(x * 160, y * 160, z * 160, 21);
      gf.accel({ min: [-0.08 * D.s, -0.22 * D.s, -0.065 * D.s], max: [0.055 * D.s, gcuffLen + 0.01, 0.115 * D.s] }, 0.009 * D.s);
      const gEval = (x, y, z) => gf.eval(x, y, z);
      // open shell at the cuff: keep everything below the cut plane, remove the cap
      const cutY = gcuffLen - 0.002;
      const gclip = (x, y, z) => Math.max(gEval(x, y, z), y - cutY);
      const gb = { min: [-0.07 * D.s, -0.21 * D.s, -0.055 * D.s], max: [0.045 * D.s, cutY + 0.004, 0.105 * D.s] };
      let mg = meshField(gclip, gb, h, { project: 2 });
      mg.idx = filterFaces(mg.pos, mg.idx, (x, y, z) => y < cutY - h * 0.6);
      mg = compact(mg);
      // thin rim inward at the cuff opening
      const gw = gf.weights(mg.pos, { tau: 0.0025 * D.s, nBones: R.B.length });
      const gnv = mg.pos.length / 3;
      const gaux = new Float32Array(gnv * 4);
      const smudgeTips = (o.smudge || []).map((name) => { const b = R.fingerBones[name][2]; const len = name === 'thumb' ? D.T.len[2] : D.F.find((ff) => ff.name === name).len[2]; return new THREE.Vector3(-0.002, -len * 0.75, 0).applyMatrix4(R.W[b]); });
      for (let v = 0; v < gnv; v++) {
        const x = mg.pos[v * 3], y = mg.pos[v * 3 + 1], z = mg.pos[v * 3 + 2];
        const b = gw.skinIndex[v * 4];
        pv.set(x, y, z).applyMatrix4(inv[b]);
        let seam = 1;
        if (joints.includes(b)) seam = Math.min(1, Math.abs(pv.z) < 0.004 ? Math.abs(pv.x) / 0.0018 : 1); // side seams of fingers
        // three decorative stitch lines on the back of the hand
        if (b === R.wrist && x > 0.004 && y < -0.022 * D.s && y > -0.07 * D.s) for (const zz of [0.012, 0.0, -0.012]) seam = Math.min(seam, Math.abs(z - zz * D.wf + (y + 0.045) * 0.08) / 0.0016);
        gaux[v * 4 + 2] = seam;
        gaux[v * 4 + 3] = Math.min(1, Math.max(0, (cutY - y) / 0.03));
        for (const tp of smudgeTips) { const d2 = (x - tp.x) ** 2 + (y - tp.y) ** 2 + (z - tp.z) ** 2; gaux[v * 4] = Math.max(gaux[v * 4], 0.85 * Math.exp(-d2 / (0.0065 ** 2)) * (0.75 + 0.25 * vnoise3(x * 900, y * 900, z * 900, 2))); }
      }
      mg.aux = gaux; mg.skinIndex = gw.skinIndex; mg.skinWeight = gw.skinWeight;
      G.glove = mg;
      // skin left visible above the glove cuff only
      const ks = { ...ms };
      ks.idx = filterFaces(ms.pos, ms.idx, (x, y, z) => y > gcuffLen - 0.012);
      G.skinArm = ks.idx.length ? compact(ks) : null;
    }
    // cuffs (sleeve stubs), rigid on the forearm bone
    G.cuffs = [];
    for (const c of o.cuffs || []) {
      const m = buildCuff(D, c, Math.max(h, 0.0011));
      const n = m.pos.length / 3;
      m.skinIndex = new Uint16Array(n * 4).fill(R.forearm);
      m.skinWeight = new Float32Array(n * 4); for (let i = 0; i < n; i++) m.skinWeight[i * 4] = 1;
      G.cuffs.push(m);
    }
    if (mir) {
      const mm = (m) => (m ? mirrorX(m, { rest: true, aux: false }) : m);
      G.skin = mm(G.skin); if (G.glove) G.glove = mm(G.glove); if (G.skinArm) G.skinArm = mm(G.skinArm);
      G.cuffs = G.cuffs.map(mm);
    }
    // geometries
    G.geo = {
      skin: toGeometry(G.skin, { skin: G.skin }),
      glove: G.glove ? toGeometry(G.glove, { skin: G.glove }) : null,
      skinArm: G.skinArm ? toGeometry(G.skinArm, { skin: G.skinArm }) : null,
      cuffs: G.cuffs.map((m) => toGeometry(m, { skin: m })),
    };
    for (const g of [G.geo.skin, G.geo.glove, G.geo.skinArm, ...G.geo.cuffs]) if (g) { g.computeBoundingBox(); g.computeBoundingSphere(); }
    _cache.set(key, G);
  }
  const hand = new Hand(o, D, R, G, side, glove, salt);
  hand.cacheKey = key;
  return hand;
}

// ------------------------------------------------------------------------------------------
class Hand {
  constructor(o, D, R, G, side, glove, salt) {
    this.side = side; this.dims = D; this.opts = o;
    this.mir = side === 'R' ? -1 : 1;
    this.root = new THREE.Group();
    this.root.name = 'hand' + side;
    // bones
    this.bones = R.B.map((b) => { const bone = new THREE.Bone(); bone.name = b.name; return bone; });
    this.rest = R.B.map((b) => {
      const p = new THREE.Vector3().fromArray(b.pos), q = b.quat.clone();
      if (this.mir < 0) { p.x = -p.x; q.set(q.x, -q.y, -q.z, q.w); }
      return { p, q };
    });
    R.B.forEach((b, i) => {
      const bone = this.bones[i];
      bone.position.copy(this.rest[i].p); bone.quaternion.copy(this.rest[i].q);
      if (b.parent >= 0) this.bones[b.parent].add(bone); else this.root.add(bone);
    });
    this.byName = Object.fromEntries(this.bones.map((b) => [b.name, b]));
    this.fingerBones = Object.fromEntries(Object.entries(R.fingerBones).map(([k, v]) => [k, v.map((i) => this.bones[i])]));
    this.root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(this.bones);
    // materials
    const skinCol = o.skin ?? 0xd2a586;
    const joints = G.joints.map((J) => (this.mir < 0 ? { c: [-J.c[0], J.c[1], J.c[2]], ax: [-J.ax[0], J.ax[1], J.ax[2]], r: J.r } : J));
    this.skinMat = o.skinMaterial || skinMaterial({ color: skinCol, hand: true, age: D.age, salt, detail: o.detail ?? 1, joints });
    const mk = (geo, mat, name) => {
      const m = new THREE.SkinnedMesh(geo, mat);
      m.name = name; m.castShadow = true; m.receiveShadow = true;
      m.bind(skeleton, new THREE.Matrix4());
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.05, 0.01), 0.3);
      this.root.add(m);
      return m;
    };
    this.meshes = {};
    if (glove) {
      this.gloveMat = o.gloveMaterial || clothMaterial({ fabric: 'cotton', color: o.gloveColor ?? 0xecebe4, sheen: 0.8, sheenColor: 0xffffff, mottle: 0.025, stitchColor: 0xd8d6cc, detail: 1.1, wearColor: o.smudgeColor ?? 0xb9ae9c });
      this.meshes.glove = mk(G.geo.glove, this.gloveMat, 'glove');
      if (G.geo.skinArm) this.meshes.skinArm = mk(G.geo.skinArm, this.skinMat, 'skinArm');
      if (!o.gloveOnly) { this.meshes.skin = mk(G.geo.skin, this.skinMat, 'skin'); this.meshes.skin.visible = false; }
    } else {
      this.meshes.skin = mk(G.geo.skin, this.skinMat, 'skin');
    }
    this.cuffMats = (o.cuffs || []).map((c) => c.material || clothMaterial({ fabric: c.fabric || 'cotton', color: c.color ?? 0x444444, patchColor: (c.detail || []).find((d) => d.type === 'patch')?.color ?? 0x4a6f93, stitchColor: (c.detail || []).find((d) => d.type === 'patch')?.stitch, faded: c.faded ?? 0, mottle: c.mottle, wearColor: c.wearColor }));
    this.meshes.cuffs = G.geo.cuffs.map((g, i) => mk(g, this.cuffMats[i], 'cuff' + i));
    this.skeleton = skeleton;
    // sockets (in wrist-bone space; updated after each pose)
    const wrist = this.byName.wrist;
    this.sockets = {};
    for (const n of ['grip', 'pen', 'pinch', 'palm', 'cup']) { const s = new THREE.Object3D(); s.name = 'socket_' + n; wrist.add(s); this.sockets[n] = s; }
    this.gloved = glove;
    this.pose('relaxed');
  }
  // world position of a fingertip / pad (name: 'index'…'thumb')
  tip(name, target = new THREE.Vector3(), pad = true) {
    const b = this.fingerBones[name][2];
    const D = this.dims;
    const len = name === 'thumb' ? D.T.len[2] : D.F.find((f) => f.name === name).len[2];
    const r = name === 'thumb' ? D.T.r[3] : D.F.find((f) => f.name === name).r[3];
    b.updateWorldMatrix(true, false);
    return target.set(pad ? -r * 0.6 * this.mir : 0, -len * (pad ? 0.7 : 1.0), 0).applyMatrix4(b.matrixWorld);
  }
  setGlove(on) {
    if (!this.meshes.glove) return;
    this.meshes.glove.visible = on;
    if (this.meshes.skin) this.meshes.skin.visible = !on;
    if (this.meshes.skinArm) this.meshes.skinArm.visible = on;
    this.gloved = on;
  }
  // channels: {wrist:[flex, dev], thumb:[cmcFlex, cmcAbd, mcp, ip, twist], index:[mcp, pip, dip, spread], ...}
  setChannels(ch) {
    const m = this.mir;
    const qz = (a) => _q1.setFromAxisAngle(_Z, -m * a);
    const set = (bone, i, rots) => {
      bone.position.copy(this.rest[i].p);
      bone.quaternion.copy(this.rest[i].q);
      for (const [ax, a] of rots) { if (!a) continue; const axis = ax === 'x' ? _X : ax === 'y' ? _Y : _Z; const sgn = ax === 'x' ? 1 : -m; bone.quaternion.multiply(_q1.setFromAxisAngle(axis, sgn * a)); }
    };
    const idx = (bone) => this.bones.indexOf(bone);
    const w = ch.wrist || [0, 0];
    set(this.byName.wrist, idx(this.byName.wrist), [['z', w[0]], ['x', -(w[1] || 0)]]);
    for (const name of FINGERS) {
      const c = ch[name] || [0, 0, 0, 0];
      const [b1, b2, b3] = this.fingerBones[name];
      set(b1, idx(b1), [['x', -(c[3] || 0)], ['z', c[0]]]);
      set(b2, idx(b2), [['z', c[1]]]);
      set(b3, idx(b3), [['z', c[2]]]);
    }
    const t = ch.thumb || [0, 0, 0, 0, 0];
    const [t0, t1, t2] = this.fingerBones.thumb;
    set(t0, idx(t0), [['z', t[0]], ['x', t[1]], ['y', t[4] || 0]]);
    set(t1, idx(t1), [['z', t[2]]]);
    set(t2, idx(t2), [['z', t[3]]]);
    this.channels = ch;
    this.updateSockets();
    return this;
  }
  pose(name, params = {}) {
    const ch = typeof name === 'string' ? handPose(name, params, this.dims) : name;
    return this.setChannels(ch);
  }
  updateSockets() {
    const D = this.dims, m = this.mir;
    const palmHalf = 0.014 * D.tf;
    const R = this.channels?._radius ?? 0.02;
    const S = this.sockets;
    S.palm.position.set(-palmHalf * m, -0.05 * D.s, 0); S.palm.quaternion.setFromEuler(new THREE.Euler(0, 0, m * Math.PI / 2));
    const mid = D.F[1], rf = (mid.r[1] + mid.r[2]) / 2;
    S.grip.position.set((mid.mcp[0] - (R + rf + 0.003)) * m, mid.mcp[1] - 0.004, 0.0); S.grip.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    S.cup.position.copy(S.grip.position); S.cup.quaternion.copy(S.grip.quaternion);
    // pen / pinch: between thumb pad and index pad (in wrist space)
    this.root.updateMatrixWorld(true);
    const wInv = this.byName.wrist.matrixWorld.clone().invert();
    const a = this.tip('thumb', new THREE.Vector3()).applyMatrix4(wInv), b = this.tip('index', new THREE.Vector3()).applyMatrix4(wInv);
    S.pinch.position.copy(a).add(b).multiplyScalar(0.5);
    // pen axis: from pinch point toward the thumb web (index MCP area)
    const web = new THREE.Vector3(0.002 * m, -0.07 * D.s, 0.03 * D.wf);
    const dir = web.clone().sub(S.pinch.position).normalize();
    S.pen.position.copy(S.pinch.position);
    S.pen.quaternion.setFromUnitVectors(_Y, dir);
  }
  // attach an object to a socket ('grip'|'cup'|'pen'|'pinch'|'palm')
  hold(obj, socket = 'grip') { this.sockets[socket].add(obj); return obj; }
  // place the wrist joint at pos with fingers pointing along fingerDir and palm facing palmNormal (world or parent space)
  placeWrist(pos, fingerDir, palmNormal) {
    const Y = new THREE.Vector3().fromArray(fingerDir.toArray ? fingerDir.toArray() : fingerDir).normalize().negate(); // local +Y = toward forearm
    const N = new THREE.Vector3().fromArray(palmNormal.toArray ? palmNormal.toArray() : palmNormal).normalize();
    // local palm normal is -X (L) / +X (R)
    const X = N.clone().multiplyScalar(-this.mir);
    X.sub(Y.clone().multiplyScalar(X.dot(Y))).normalize();
    const Z = new THREE.Vector3().crossVectors(X, Y);
    this.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    this.root.position.fromArray(pos.toArray ? pos.toArray() : pos);
    this.root.updateMatrixWorld(true);
    return this;
  }
}
const _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);

// ------------------------------------------------------------------------------------------
// Pose presets (radians; flex + = curl toward the palm). All deterministic.
// ------------------------------------------------------------------------------------------
function wrapAngles(lens, rr, R) {
  const rho = R + rr;
  const th = lens.map((L) => 2 * Math.asin(Math.min(0.999, L / (2 * rho))));
  return [th[0] * 0.5 + 0.08, (th[0] + th[1]) * 0.5, (th[1] + th[2]) * 0.5];
}
export function handPose(name, p = {}, D = dimsOf({})) {
  const lerpA = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const F = Object.fromEntries(D.F.map((f) => [f.name, f]));
  switch (name) {
    case 'relaxed': {
      const c = p.curl ?? 1;
      return { wrist: [0.05, 0.05], thumb: [0.12 * c, 0.08, 0.15 * c, 0.2 * c, 0], index: [0.22 * c, 0.32 * c, 0.15 * c, 0.02], middle: [0.28 * c, 0.42 * c, 0.2 * c, 0], ring: [0.33 * c, 0.5 * c, 0.24 * c, -0.02], little: [0.38 * c, 0.58 * c, 0.3 * c, -0.05] };
    }
    case 'flat': case 'flat_on_glass': {
      const sp = p.spread ?? (name === 'flat_on_glass' ? 0.6 : 0.2);
      const press = name === 'flat_on_glass' ? -0.06 : 0;
      return { wrist: [press, 0], thumb: [-0.05, 0.25 + 0.15 * sp, 0.02, 0.05, 0], index: [press, 0.02, 0.0, 0.05 * sp], middle: [press, 0.02, 0.0, 0.0], ring: [press, 0.02, 0.0, -0.05 * sp], little: [press, 0.03, 0.02, -0.12 * sp] };
    }
    case 'wipe': // fingers together, slightly bent, thumb alongside the index
      return { wrist: [0.0, 0.0], thumb: [0.28, -0.32, 0.12, 0.12, 0.15], index: [0.12, 0.12, 0.05, -0.06], middle: [0.12, 0.12, 0.05, 0.0], ring: [0.13, 0.14, 0.06, 0.05], little: [0.15, 0.16, 0.08, 0.09] };
    case 'grip': case 'hold_cup': case 'rattan': {
      const R = p.radius ?? (name === 'hold_cup' ? 0.038 : name === 'rattan' ? 0.012 : 0.02);
      const ch = { _radius: R, wrist: [p.wrist ?? 0.0, 0.08] };
      for (const n of FINGERS) {
        const f = F[n];
        const a = wrapAngles(f.len, (f.r[1] + f.r[2]) / 2, R);
        const open = name === 'hold_cup' ? 0.82 : 1;
        ch[n] = [a[0] * open, a[1] * open, a[2] * open * 0.9, n === 'index' ? 0.03 : n === 'little' ? -0.04 : 0];
      }
      const tw = Math.min(1, 0.02 / R);
      ch.thumb = name === 'hold_cup' ? [0.25, 0.55, 0.15, 0.15, 0.1] : [0.55 * tw + 0.2, 0.35, 0.35 + 0.3 * tw, 0.35 * tw, 0.25];
      return ch;
    }
    case 'fist':
      return { wrist: [0, 0], thumb: [0.7, 0.2, 0.6, 0.5, 0.3], index: [1.35, 1.6, 0.9, 0], middle: [1.4, 1.65, 0.9, 0], ring: [1.45, 1.65, 0.9, 0], little: [1.5, 1.6, 0.85, 0] };
    case 'pinch': // thumb pad meets index pad; other fingers gently curled
      return { wrist: [0.1, 0.05], thumb: [0.55, 0.42, 0.25, 0.25, 0.35], index: [0.62, 0.72, 0.32, 0.0], middle: [0.55, 0.85, 0.4, 0.0], ring: [0.6, 0.95, 0.45, -0.02], little: [0.68, 1.0, 0.5, -0.05] };
    case 'write': // pen grip (pen in the 'pen' socket)
      return { wrist: [-0.1, 0.12], thumb: [0.5, 0.38, 0.3, 0.1, 0.35], index: [0.45, 0.55, 0.1, 0.02], middle: [0.62, 0.9, 0.45, 0.0], ring: [0.95, 1.25, 0.6, -0.02], little: [1.05, 1.3, 0.6, -0.05] };
    case 'point':
      return { wrist: [0, 0], thumb: [0.6, 0.15, 0.5, 0.3, 0.3], index: [0.0, 0.05, 0.02, 0.02], middle: [1.35, 1.55, 0.8, 0], ring: [1.4, 1.6, 0.85, 0], little: [1.45, 1.55, 0.8, 0] };
    case 'pray': // flat, fingers together (pair two hands palm-to-palm)
      return { wrist: [0, 0], thumb: [0.02, 0.05, 0.05, 0.08, 0], index: [0.02, 0.03, 0.02, -0.03], middle: [0.02, 0.03, 0.02, 0], ring: [0.03, 0.04, 0.03, 0.03], little: [0.04, 0.05, 0.04, 0.06] };
    case 'cupped':
      return { wrist: [0.1, 0], thumb: [0.3, 0.3, 0.2, 0.2, 0.2], index: [0.35, 0.45, 0.3, -0.03], middle: [0.35, 0.45, 0.3, 0], ring: [0.38, 0.48, 0.32, 0.02], little: [0.4, 0.5, 0.35, 0.05] };
    case 'hold_hand': { // fingers wrap round another hand's edge
      const R = p.radius ?? 0.016;
      const ch = handPose('grip', { radius: R }, D);
      ch.thumb = [0.25, 0.25, 0.25, 0.2, 0.1];
      for (const n of FINGERS) ch[n] = ch[n].map((x, i) => (i < 3 ? x * 0.85 : x));
      return ch;
    }
    case 'touch': // fingertips resting on a surface (e.g. on a sleeve patch)
      return { wrist: [0.25, 0], thumb: [0.3, 0.3, 0.2, 0.25, 0.2], index: [0.35, 0.35, 0.18, 0.02], middle: [0.42, 0.45, 0.22, 0], ring: [0.55, 0.65, 0.3, -0.02], little: [0.65, 0.75, 0.35, -0.05] };
    case 'spread':
      return { wrist: [-0.1, 0], thumb: [-0.15, 0.55, -0.05, 0.0, 0], index: [-0.08, 0.0, 0.0, 0.18], middle: [-0.08, 0, 0, 0.02], ring: [-0.08, 0.0, 0.0, -0.15], little: [-0.08, 0.02, 0.0, -0.3] };
    default:
      if (name.startsWith('blend:')) return lerpA ? handPose('relaxed', p, D) : null;
      return handPose('relaxed', p, D);
  }
}
export const HAND_POSES = ['relaxed', 'flat', 'flat_on_glass', 'wipe', 'grip', 'hold_cup', 'rattan', 'fist', 'pinch', 'write', 'point', 'pray', 'cupped', 'hold_hand', 'touch', 'spread'];

// blend two channel sets
export function blendHandChannels(a, b, t) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === '_radius') { out[k] = (a[k] ?? b[k]) * (1 - t) + (b[k] ?? a[k]) * t; continue; }
    const x = a[k] || b[k], y = b[k] || a[k];
    out[k] = x.map((v, i) => v + ((y[i] ?? 0) - v) * t);
  }
  return out;
}

// Two hands holding each other ("迟迟没有松开的手"). A stays where it is; B is placed relative
// to A (B.root must share A.root's parent). mode 'hold' = handshake-like hold, 'palm' = palms
// pressed together (pray / farewell), t = 0 holding … 1 released (fingers open, B slides 6 cm).
export function pairHands(A, B, { mode = 'hold', t = 0 } = {}) {
  const release = Math.min(1, Math.max(0, t));
  A.root.updateMatrix();
  if (mode === 'palm') {
    A.pose('pray'); B.pose('pray');
    const off = new THREE.Matrix4().makeTranslation(-A.mir * (0.029 * A.dims.tf), 0, 0);
    B.root.matrix.copy(A.root.matrix).multiply(off);
  } else {
    const ra = blendHandChannels(handPose('hold_hand', {}, A.dims), handPose('relaxed', { curl: 0.6 }, A.dims), release);
    const rb = blendHandChannels(handPose('hold_hand', { radius: 0.014 }, B.dims), handPose('relaxed', { curl: 0.6 }, B.dims), release);
    A.setChannels(ra); B.setChannels(rb);
    // B: rotated 180° about A's local X (fingers opposite), palm facing A's palm, overlapping across the palm
    const m = A.mir;
    const off = new THREE.Matrix4().compose(
      new THREE.Vector3(-m * (0.030 + 0.01 * release) * A.dims.tf, -0.105 * A.dims.s + release * 0.06, 0.004),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -m * 0.12))),
      new THREE.Vector3(1, 1, 1));
    B.root.matrix.copy(A.root.matrix).multiply(off);
  }
  B.root.matrix.decompose(B.root.position, B.root.quaternion, B.root.scale);
  B.root.updateMatrixWorld(true);
  return B;
}

export { dimsOf as handDims };
