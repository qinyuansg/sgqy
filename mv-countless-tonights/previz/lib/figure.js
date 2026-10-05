// figure.js — parametric stylised human figure: hierarchical rig, sculpted SDF body (faceless
// head with brow/nose planes), hair masses, layered costume (see figure_garments.js), detailed
// hands (hand.js), deterministic pose API with presets, 2-bone arm IK, look-at, hold, breathe, walk.
//
//   import { makeFigure } from '/previz/lib/figure.js';
//   const f = makeFigure({ sex:'f', height:1.62, build:0.45, age:28, skin:0xd6ab90,
//                          hair:{style:'low_bun', color:0x1b1511}, costume:[...], hands:{glove:true} });
//   scene.add(f.root);
//   f.pose('stand'); f.pose({'head.y':-0.3}, {add:true}); f.lookAt(p); f.reach('R', target); f.breathe(T);
//
// Coordinates: metres, Y up, figure faces +Z, its LEFT side is +X. Root origin = floor between the feet.
// Pose channels are semantic Euler angles (radians) relative to the NEUTRAL pose (standing straight,
// arms hanging, palms toward thighs). L/R are mirrored so a positive value means the same motion:
//   torso (hips/spine/chest/neck/head/root): .x + bend forward / nod down, .y + turn to own left, .z + lean to own left
//   arm*.clav : .z + shrug (raise shoulder), .y + shoulder forward
//   arm*.upper: .x + raise forward (flexion), .z + raise sideways (abduction), .y + inward twist
//   arm*.lower: .x + bend elbow, .y + pronate
//   arm*.hand : .x + flex wrist toward palm, .z + bend toward thumb, .y twist
//   leg*.upper: .x + thigh forward (hip flexion), .z + leg out sideways, .y + toe-out twist
//   leg*.lower: .x + bend knee
//   leg*.foot : .x + point toes down
//   hips.px/py/pz, root.px/py/pz : translations (m). handL / handR : hand preset name or channels.
import * as THREE from 'three';
import { Field, prim, meshField, filterFaces, compact, toGeometry, concat, vnoise3, decimate, loftTable, loftAt, loftPrim } from './figure_sdf.js';
import { skinMaterial, hairMaterial, materialFromDesc } from './figure_mat.js';
import { makeHand, handPose } from './hand.js';
import { buildGarment, buildHair } from './figure_garments.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------------------------------
// Proportions (fractions of height): [male, female]
// ------------------------------------------------------------------------------------------
const PR = {
  // fractions of height [male, female] — natural adult proportions (≈7.5 heads, women narrower shoulders / men broader
  // but not boxy, tapered limbs with defined wrists / knees / ankles, slender natural neck)
  ankleY: [0.041, 0.041], kneeY: [0.284, 0.285], hipJY: [0.515, 0.515], hipJX: [0.049, 0.051],
  pelvisY: [0.551, 0.551], spineY: [0.617, 0.619], chestY: [0.707, 0.708], neckY: [0.830, 0.828],
  headY: [0.891, 0.888], shJY: [0.803, 0.797], shJX: [0.104, 0.092], clavX: [0.012, 0.011],
  uArm: [0.172, 0.170], fArm: [0.146, 0.142], hand: [0.108, 0.106], footL: [0.148, 0.144],
  neckR: [0.0322, 0.0290], uArmR: [0.0250, 0.0212], elbR: [0.0180, 0.0156], fArmR: [0.0218, 0.0186], wristR: [0.0148, 0.0130],
  thighR: [0.0450, 0.0455], kneeR: [0.0262, 0.0254], calfR: [0.0285, 0.0272], ankleR: [0.0142, 0.0130],
  rib: [[0.083, 0.097, 0.058], [0.074, 0.088, 0.052]], waist: [[0.077, 0.064, 0.054], [0.069, 0.062, 0.050]],
  pelvis: [[0.083, 0.062, 0.057], [0.087, 0.064, 0.059]], hu: [0.130, 0.133],
};
// Trunk cross-sections (fractions of H, adult reference heights; remapped to each figure's hip / shoulder / neck):
// [yRef, a male, a female, bf male, bf female, bb male, bb female, c]  a = half-width, bf / bb = front / back half-depth,
// c = z of the section centre. Seat behind the hips, lumbar hollow, ribcage forward, rounded upper back (natural S-curve).
const TORSO = [
  [0.462, 0.020, 0.022, 0.016, 0.016, 0.020, 0.022, -0.004],
  [0.474, 0.042, 0.045, 0.030, 0.031, 0.036, 0.038, -0.005],
  [0.488, 0.062, 0.065, 0.041, 0.042, 0.050, 0.053, -0.006],
  [0.515, 0.086, 0.091, 0.050, 0.051, 0.064, 0.068, -0.009],
  [0.540, 0.092, 0.098, 0.053, 0.054, 0.069, 0.073, -0.010],
  [0.570, 0.089, 0.093, 0.054, 0.054, 0.063, 0.065, -0.007],
  [0.600, 0.083, 0.082, 0.053, 0.052, 0.054, 0.054, -0.003],
  [0.628, 0.078, 0.070, 0.050, 0.048, 0.047, 0.046, -0.001],
  [0.658, 0.080, 0.071, 0.050, 0.047, 0.049, 0.047, -0.001],
  [0.690, 0.086, 0.076, 0.055, 0.050, 0.054, 0.051, -0.003],
  [0.728, 0.091, 0.080, 0.062, 0.054, 0.060, 0.055, -0.005],
  [0.765, 0.089, 0.078, 0.060, 0.053, 0.060, 0.055, -0.009],
  [0.795, 0.079, 0.069, 0.052, 0.046, 0.055, 0.050, -0.014],
  [0.822, 0.050, 0.043, 0.037, 0.032, 0.041, 0.037, -0.020],
];
function torsoKeys(P, H) {
  const sex = P.sex, build = P.build, ch = P.child, belly = 0.3 * clamp((P.age - 40) / 35) + 0.25 * ch;
  const hj = P.hipJY / H, sh = (P.shJY / H) + 0.009, nk = P.neckY / H, shRef = lerp(0.812, 0.806, sex); // keys were set for a 0.009 H higher joint
  const mapY = (y) => (y <= shRef ? hj + (y - 0.515) * (sh - hj) / (shRef - 0.515) : sh + (y - shRef) * (nk - sh) / (0.83 - shRef));
  return TORSO.map(([y, am, af, bfm, bff, bbm, bbf, c]) => {
    const chest = sstep(0.64, 0.72, y), waist = sstep(0.57, 0.62, y) * (1 - sstep(0.66, 0.70, y)), hip = 1 - sstep(0.56, 0.62, y);
    const fb = chest * lerp(0.94, 1.10, build) + waist * lerp(0.88, 1.2, build) + hip * lerp(0.93, 1.1, build) + (1 - chest - waist - hip) * lerp(0.92, 1.12, build);
    const kid = 1 + ch * (0.06 + 0.2 * waist - 0.08 * hip);
    const bel = belly * sstep(0.54, 0.6, y) * (1 - sstep(0.64, 0.69, y));
    return { y: mapY(y) * H, a: (lerp(am, af, sex) * fb * kid + 0.006 * bel) * H, bf: (lerp(bfm, bff, sex) * fb * kid + 0.012 * bel) * H, bb: lerp(bbm, bbf, sex) * fb * kid * H, c: c * H };
  });
}
function dims(o) {
  const sex = typeof o.sex === 'number' ? o.sex : o.sex === 'm' ? 0 : 1;
  const age = o.age ?? 30;
  const child = clamp((14 - age) / 9, 0, 1);  // 1 at age 5
  const H = o.height ?? lerp(lerp(1.72, 1.61, sex), 1.1, child);
  const build = o.build ?? 0.5;
  const g = (k) => { const v = PR[k]; return Array.isArray(v[0]) ? v[0].map((x, i) => lerp(x, v[1][i], sex)) : lerp(v[0], v[1], sex); };
  const P = { H, sex, age, build, child };
  for (const k of Object.keys(PR)) P[k] = g(k);
  // head height sets the head / neck bone heights (vertex at H, chin at H - hu)
  P.headY = 1 - 0.84 * P.hu; P.neckY = P.headY - 0.47 * P.hu;
  // children: bigger head, shorter legs
  if (child > 0) {
    P.hu = lerp(P.hu, 0.18, child);
    const legK = lerp(1, 0.86, child);
    for (const k of ['kneeY', 'hipJY', 'ankleY']) P[k] *= legK;
    P.pelvisY = P.hipJY + 0.035; P.spineY = lerp(P.spineY, P.hipJY + 0.09, child); P.chestY = lerp(P.chestY, 0.66, child);
    P.neckY = 1 - P.hu * 1.3; P.headY = 1 - P.hu * 0.84; P.shJY = P.neckY - 0.02; P.shJX *= lerp(1, 0.95, child);
    P.uArm *= lerp(1, 0.93, child); P.fArm *= lerp(1, 0.9, child);
  }
  // build: girth multipliers
  const gl = lerp(0.88, 1.18, build), gt = lerp(0.86, 1.25, build);
  for (const k of ['neckR', 'uArmR', 'elbR', 'fArmR', 'thighR', 'kneeR', 'calfR']) P[k] *= gl;
  P.wristR *= lerp(0.95, 1.08, build); P.ankleR *= lerp(0.95, 1.08, build);
  P.rib = P.rib.map((x, i) => x * (i === 1 ? 1 : lerp(0.94, 1.12, build)));
  P.waist = P.waist.map((x, i) => x * (i === 1 ? 1 : gt * (age > 45 ? 1 + (age - 45) * 0.004 : 1)));
  P.pelvis = P.pelvis.map((x, i) => x * (i === 1 ? 1 : lerp(0.93, 1.12, build)));
  // older: thinner limbs, slightly lower chest
  if (age > 50) { const a = clamp((age - 50) / 30); for (const k of ['uArmR', 'fArmR', 'calfR']) P[k] *= 1 - 0.07 * a; }
  P.girth = gl * (age > 50 ? 1 - 0.07 * clamp((age - 50) / 30) : 1); // muscle masses (deltoid …) scale with the limbs
  P.stoop = o.stoop ?? clamp((age - 45) / 35, 0, 0.8);
  // metres
  const M = {};
  for (const k of Object.keys(P)) M[k] = typeof P[k] === 'number' && !['H', 'sex', 'age', 'build', 'child', 'stoop', 'girth'].includes(k) ? P[k] * H : P[k];
  for (const k of ['rib', 'waist', 'pelvis']) M[k] = P[k].map((x) => x * H);
  M.H = H; M.hu = P.hu * H;
  // trunk loft keys (metres); rib / waist / pelvis summaries kept consistent with it (garments, accessories)
  M.torso = torsoKeys(M, H);
  const TT = loftTable(M.torso);
  const at = (yr) => loftAt(TT, M.torso[0].y + (yr - 0.462) / (0.822 - 0.462) * (M.torso[M.torso.length - 1].y - M.torso[0].y));
  const rb = at(0.728), wa = at(0.628), pv = at(0.540);
  M.rib = [rb[0], M.rib[1], rb[1]]; M.waist = [wa[0], M.waist[1], wa[1]]; M.pelvis = [pv[0], M.pelvis[1], pv[2]];
  return M;
}

// ------------------------------------------------------------------------------------------
// Skeleton definition (neutral pose: all rotations identity)
// ------------------------------------------------------------------------------------------
const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head',
  'armL.clav', 'armL.upper', 'armL.lower', 'armL.hand', 'armR.clav', 'armR.upper', 'armR.lower', 'armR.hand',
  'legL.upper', 'legL.lower', 'legL.foot', 'legR.upper', 'legR.lower', 'legR.foot'];
const PARENT = { root: null, hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  'armL.clav': 'chest', 'armL.upper': 'armL.clav', 'armL.lower': 'armL.upper', 'armL.hand': 'armL.lower',
  'armR.clav': 'chest', 'armR.upper': 'armR.clav', 'armR.lower': 'armR.upper', 'armR.hand': 'armR.lower',
  'legL.upper': 'hips', 'legL.lower': 'legL.upper', 'legL.foot': 'legL.lower',
  'legR.upper': 'hips', 'legR.lower': 'legR.upper', 'legR.foot': 'legR.lower' };
export const BONE_NAMES = BONES;
const ALIAS = { shoulderL: 'armL.clav', shoulderR: 'armR.clav', upperArmL: 'armL.upper', upperArmR: 'armR.upper', forearmL: 'armL.lower', forearmR: 'armR.lower', lowerArmL: 'armL.lower', lowerArmR: 'armR.lower', handL: 'armL.hand', handR: 'armR.hand', thighL: 'legL.upper', thighR: 'legR.upper', shinL: 'legL.lower', shinR: 'legR.lower', footL: 'legL.foot', footR: 'legR.foot', pelvis: 'hips' };

function neutralWorld(P) {
  // absolute neutral positions of each bone origin
  const H = P.H;
  const W = {};
  W.root = [0, 0, 0];
  W.hips = [0, P.pelvisY, -0.004 * H];
  W.spine = [0, P.spineY, -0.008 * H];
  W.chest = [0, P.chestY, -0.010 * H];
  W.neck = [0, P.neckY, -0.022 * H];
  W.head = [0, P.headY, -0.012 * H];
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    W[`arm${s}.clav`] = [sg * P.clavX, P.shJY + 0.006 * H, 0.012 * H];
    W[`arm${s}.upper`] = [sg * P.shJX, P.shJY, -0.008 * H];
    W[`arm${s}.lower`] = [sg * (P.shJX + 0.004 * H), P.shJY - P.uArm, -0.014 * H];
    W[`arm${s}.hand`] = [sg * (P.shJX + 0.006 * H), P.shJY - P.uArm - P.fArm, -0.004 * H];
    W[`leg${s}.upper`] = [sg * P.hipJX, P.hipJY, 0.0];
    W[`leg${s}.lower`] = [sg * (P.hipJX - 0.004 * H), P.kneeY, 0.004 * H];
    W[`leg${s}.foot`] = [sg * (P.hipJX - 0.003 * H), P.ankleY, -0.004 * H];
  }
  return W;
}

// semantic channel -> raw axis/sign (per bone kind; L/R mirror)
function channelMap(name) {
  const R = name.includes('R.') ? -1 : 1;
  if (/^(root|hips|spine|chest|neck|head)$/.test(name)) return { x: ['x', 1], y: ['y', 1], z: ['z', -1] };
  if (name.endsWith('.clav')) return { x: ['x', 1], y: ['y', -R], z: ['z', R] };
  if (name.endsWith('.upper') && name.startsWith('arm')) return { x: ['x', -1], y: ['y', -R], z: ['z', R] };
  if (name.endsWith('.lower') && name.startsWith('arm')) return { x: ['x', -1], y: ['y', -R], z: ['z', R] };
  if (name.endsWith('.hand')) return { x: ['z', -R], y: ['y', -R], z: ['x', -1] };
  if (name.endsWith('.upper')) return { x: ['x', -1], y: ['y', R], z: ['z', R] };
  if (name.endsWith('.lower')) return { x: ['x', 1], y: ['y', R], z: ['z', R] };
  if (name.endsWith('.foot')) return { x: ['x', 1], y: ['y', R], z: ['z', -R] };
  return { x: ['x', 1], y: ['y', 1], z: ['z', 1] };
}
const CMAP = Object.fromEntries(BONES.map((b) => [b, channelMap(b)]));
// sculpt / bind pose: arms abducted 0.45 rad (was 0.66) — closer to the common poses (hanging, forward), so garments deform
// less at the shoulders (no puffed shoulder tips); the 'apose' preset keeps the classic 0.66
const BIND_POSE = { 'armL.upper.z': 0.45, 'armR.upper.z': 0.45, 'armL.lower.x': 0.06, 'armR.lower.x': 0.06, 'legL.upper.z': 0.045, 'legR.upper.z': 0.045 };
const APOSE = { ...BIND_POSE, 'armL.upper.z': 0.66, 'armR.upper.z': 0.66 };

const _eu = new THREE.Euler(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3(), _m4 = new THREE.Matrix4();
function rawEuler(name, ch) {
  const m = CMAP[name];
  const r = { x: 0, y: 0, z: 0 };
  for (const a of ['x', 'y', 'z']) { const v = ch[a]; if (v) { const [ax, sg] = m[a]; r[ax] += v * sg; } }
  return r;
}

// ------------------------------------------------------------------------------------------
// Body sculpt (in bind space). Returns {field, tagsBy}
// ------------------------------------------------------------------------------------------
function bodyField(P, BW, bi, o) {
  const f = new Field();
  const H = P.H, hu = P.hu, fem = P.sex, ch = P.child, male = 1 - fem;
  const F = (n) => BW[bi[n]];
  const add = (n, type, oo, opt) => f.add(prim(type, { frame: F(n), ...oo }), { bone: bi[n], ...opt });
  const kT = 0.026 * H; // torso blend (smaller than before: defined waist / ribcage / hips instead of a blob)
  const age = clamp((P.age - 40) / 35), belly = 0.3 * age;
  // ---- trunk: one loft through art-directed cross-sections (see TORSO), split into hips / spine / chest segments so the
  // skin weights blend across the overlaps; anatomical accents (pecs, breasts, shoulder blades, trapezius) on top.
  const TT = loftTable(P.torso);
  const yS = P.spineY, yC = P.chestY;
  f.add(loftPrim(TT, -1, yS - 0.012 * H), { k: 0, bone: bi.hips, tag: 'torso', keepK: true });              // identical where they overlap:
  f.add(loftPrim(TT, P.pelvisY + 0.02 * H, yC - 0.012 * H), { k: 0, bone: bi.spine, tag: 'torso', keepK: true }); // hard union is exact
  f.add(loftPrim(TT, yS + 0.012 * H, 9), { k: 0, bone: bi.chest, tag: 'torso', keepK: true });
  // pectorals (flat, broad planes) and breasts (female)
  const frontAt = (dy) => { const q = loftAt(TT, yC + dy); return q[3] + q[1] - (yC ? 0 : 0); };
  const backAt = (dy) => { const q = loftAt(TT, yC + dy); return q[3] - q[2]; };
  const cz = BW[bi.chest].elements[14];
  for (const sg of [1, -1]) add('chest', 'ellipsoid', { c: [sg * 0.038 * H, 0.066 * H, frontAt(0.066 * H) - cz - 0.022 * H], rot: [0, 0, sg * 0.22], r: [0.042 * H, 0.03 * H, 0.024 * H] }, { k: 0.02 * H, tag: 'torso' });
  if (fem > 0.3 && ch < 0.5) for (const sg of [1, -1]) add('chest', 'ellipsoid', { c: [sg * 0.037 * H, 0.044 * H, frontAt(0.044 * H) - cz - 0.016 * H], rot: [0.35, sg * 0.15, 0], r: [0.029 * H, 0.028 * H, 0.025 * H].map((x) => x * (0.8 + 0.12 * fem)) }, { k: 0.022 * H, tag: 'torso' });
  // shoulder blades / upper back
  for (const sg of [1, -1]) add('chest', 'ellipsoid', { c: [sg * 0.042 * H, 0.072 * H, backAt(0.072 * H) - cz + 0.016 * H], rot: [0, 0, sg * 0.25], r: [0.04 * H, 0.046 * H, 0.02 * H] }, { k: 0.02 * H, tag: 'torso' });
  // trapezius slope (neck -> shoulder) and clavicles
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    const nb = BW[bi.neck], sh = BW[bi[`arm${s}.upper`]];
    const a = _va.set(sg * 0.004 * H, -0.004 * H, -0.010 * H).applyMatrix4(nb).toArray();
    // shoulder end placed in world axes from the joint (the upper-arm frame is rotated by the bind pose): one straight
    // slope neck -> acromion instead of a concave fillet at the neck and a flat shelf over the clavicle
    const b = _vb.setFromMatrixPosition(sh).add(_vc.set(-sg * 0.023 * H, 0.014 * H, -0.008 * H)).toArray();
    f.add(prim('cone', { a, b, r1: P.neckR * 0.78, r2: 0.011 * H }), { k: 0.03 * H, bone: bi.chest, tag: 'torso' });
    // clavicle: a slim bar at the front, sloping slightly down to the acromion (it must stay under the trapezius line)
    add(`arm${s}.clav`, 'cone', { a: [0, -0.004 * H, 0.002 * H], b: [sg * (P.shJX - P.clavX) * 0.9, -0.008 * H, -0.010 * H], r1: 0.008 * H, r2: 0.009 * H }, { k: 0.02 * H, tag: 'torso' });
  }
  // ---- neck: column + sternocleidomastoids (mastoid -> sternal notch) — a natural neck that catches side light
  add('neck', 'cone', { a: [0, -0.014 * H, 0.0], b: [0, (P.headY - P.neckY) + 0.012 * H, 0.010 * H], r1: P.neckR * 1.04, r2: P.neckR * 0.9, s: [1, 1, 0.94] }, { k: 0.024 * H, tag: 'neck' });
  {
    const hb = BW[bi.head], cb = BW[bi.chest];
    for (const sg of [1, -1]) {
      const a = _va.set(sg * 0.24 * hu, 0.16 * hu, -0.10 * hu).applyMatrix4(hb).toArray();
      const b = _vb.set(sg * 0.010 * H, (P.neckY - P.chestY) - 0.006 * H, 0.014 * H).applyMatrix4(cb).toArray();
      f.add(prim('cone', { a, b, r1: 0.0058 * H, r2: 0.0052 * H }), { k: 0.012 * H, bone: bi.neck, tag: 'neckm' }); // (collars follow the column, not these)
    }
    if (male > 0.5 && ch < 0.5) f.add(prim('ellipsoid', { frame: F('neck'), c: [0, 0.028 * H, P.neckR * 0.78], r: [0.006 * H, 0.009 * H, 0.005 * H] }), { k: 0.008 * H, bone: bi.neck, tag: 'neckm' }); // larynx
  }
  // ---- head (hu units, head-bone space; face toward +Z). Faceless but sculpted: brow ridge, closed-lid eye mounds in soft
  // sockets, cheekbones, nose bridge / tip / wings, muzzle with upper & lower lip volumes and a mouth line, chin, jaw line,
  // ears. Landmarks: vertex 0.84, brow 0.40, eye line 0.325, nose base 0.12, mouth 0.04, chin -0.16.
  const U = (v) => v.map((x) => x * hu);
  const hd = (type, oo, opt) => add('head', type, oo, { tag: 'head', ...opt });
  const hs = (type, oo, k) => f.sub(prim(type, { frame: F('head'), ...oo }), { k: k * hu, bone: bi.head, tag: 'head' });
  const jaw = lerp(1, 0.88, fem), brow = lerp(1, 0.55, fem), nose = lerp(1, 0.88, fem), kid = ch;
  const fs = lerp(1, 0.84, kid);                        // children: smaller face under a larger cranium
  const fy = (y) => y * fs - 0.05 * kid + 0.04 * kid;   // face-feature height remap (kids: features lower on the head)
  const fz = (z) => z * lerp(1, 0.95, kid);
  const lean = 0.02 * age * male;                       // older men: a little hollower in the cheeks
  hd('ellipsoid', { c: U([0, 0.43, -0.07]), r: U([0.335 * lerp(1, 0.97, fem), 0.41, 0.45]) }, { k: 0.05 * hu });          // cranium
  hd('ellipsoid', { c: U([0, 0.50, 0.115]), r: U([0.27, 0.23, 0.255]) }, { k: 0.08 * hu });                                  // forehead (upright)
  hd('ellipsoid', { c: U([0, fy(0.21), fz(0.115)]), r: U([0.262 * lerp(1, 0.97, fem), 0.25 * fs, 0.25 * fs]) }, { k: 0.08 * hu }); // mid-face mass
  hd('ellipsoid', { c: U([0, fy(0.05), fz(0.07)]), r: U([0.205 * jaw, 0.15 * fs, 0.235 * fs]) }, { k: 0.09 * hu });          // lower face (egg)
  hd('ellipsoid', { c: U([0, fy(-0.088), fz(0.256)]), r: U([0.068 * jaw, 0.07 * fs, 0.07 * fs]) }, { k: 0.07 * hu });         // chin (small, soft)
  for (const sg of [1, -1]) {
    hd('sphere', { c: U([sg * 0.198 * jaw, fy(0.065), -0.05]), r: 0.056 * hu * jaw }, { k: 0.09 * hu });                       // jaw angle
    hd('cone', { a: U([sg * 0.19 * jaw, fy(0.05), -0.03]), b: U([sg * 0.055 * jaw, fy(-0.105), fz(0.215)]), r1: 0.04 * hu * jaw, r2: 0.036 * hu * jaw }, { k: 0.085 * hu }); // soft jaw line -> oval
    hd('ellipsoid', { c: U([sg * 0.205, fy(0.27), fz(0.2)]), rot: [0, sg * 0.55, 0], r: U([0.076, 0.05, 0.06 - lean]) }, { k: 0.07 * hu });  // cheekbone
    hd('ellipsoid', { c: U([sg * 0.14, fy(0.215), fz(0.25)]), r: U([0.075, 0.07, 0.05 + 0.006 * fem - lean]) }, { k: 0.11 * hu }); // front of the cheek (merges softly)
    hd('ellipsoid', { c: U([sg * 0.33, 0.285, -0.06]), rot: [0, sg * 0.4, sg * 0.08], r: U([0.026, 0.105, 0.062]) }, { k: 0.022 * hu }); // ear
  }
  hd('cone', { a: U([-0.17, fy(0.4), fz(0.3)]), b: U([0.17, fy(0.4), fz(0.3)]), r1: 0.042 * hu, r2: 0.042 * hu, s: [1, 0.65 + 0.35 * brow, 1] }, { k: 0.07 * hu }); // brow ridge
  // nose: a straight bridge growing out of the brow, soft rounded tip, soft wings (no ball / no blade)
  const nz = (z) => fz(z) * nose + fz(0.38) * (1 - nose);
  hd('cone', { a: U([0, fy(0.36), fz(0.345)]), b: U([0, fy(0.198), nz(0.428)]), r1: 0.022 * hu, r2: 0.03 * hu * nose, s: [1.25, 1, 1] }, { k: 0.05 * hu }); // bridge
  hd('ellipsoid', { c: U([0, fy(0.17), nz(0.412)]), r: U([0.038 * (0.9 + 0.1 * nose), 0.032, 0.032]) }, { k: 0.035 * hu });                             // tip
  for (const sg of [1, -1]) hd('ellipsoid', { c: U([sg * 0.054 * (0.92 + 0.08 * nose), fy(0.15), fz(0.358)]), r: U([0.03, 0.025, 0.028]) }, { k: 0.035 * hu }); // alae
  // muzzle and lips (soft volumes, slight bow; a fine mouth line)
  hd('ellipsoid', { c: U([0, fy(0.05), fz(0.255)]), r: U([0.14, 0.11, 0.105]) }, { k: 0.06 * hu });
  hd('ellipsoid', { c: U([0, fy(0.042), fz(0.316)]), rot: [0.16, 0, 0], r: U([0.094, 0.042, 0.03]) }, { k: 0.05 * hu }); // lips: one soft volume
  hd('ellipsoid', { c: U([0, fy(0.062), fz(0.348)]), r: U([0.05, 0.016, 0.018]) }, { k: 0.02 * hu });    // upper-lip bow
  hs('ellipsoid', { c: U([0, fy(0.041), fz(0.367)]), r: U([0.088, 0.0016, 0.006]) }, 0.0025);             // lip line (shallow, closed mouth)
  for (const sg of [1, -1]) hs('sphere', { c: U([sg * 0.1, fy(0.041), fz(0.322)]), r: 0.008 * hu }, 0.012); // mouth corners
  hs('ellipsoid', { c: U([0, fy(-0.03), fz(0.33)]), r: U([0.05, 0.014, 0.012]) }, 0.03);                 // mentolabial sulcus (soft)
  // eye sockets (soft) and closed lids — no eyes drawn, but the planes catch light
  for (const sg of [1, -1]) {
    hs('ellipsoid', { c: U([sg * 0.138, fy(0.33), fz(0.352)]), r: U([0.085, 0.047, 0.05]) }, 0.05);       // socket under the brow
    hd('ellipsoid', { c: U([sg * 0.138, fy(0.322), fz(0.272)]), r: U([0.068, 0.032, 0.046]) }, { k: 0.035 * hu }); // closed lid (≈3 cm eye)
    hs('ellipsoid', { c: U([sg * 0.352, 0.27, -0.048]), rot: [0, sg * 0.4, 0], r: U([0.01, 0.04, 0.026]) }, 0.016); // ear concha (shallow)
  }
  // ---- arms
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    const up = `arm${s}.upper`, lo = `arm${s}.lower`, hn = `arm${s}.hand`;
    // deltoid split: the cap over the joint follows the clavicle (stays put when the arm lowers: no LBS bulge / square
    // shoulder tip), the body of the muscle follows the upper arm
    {
      const cl = `arm${s}.clav`, Up = BW[bi[up]], Cl = BW[bi[cl]];
      const capW = _va.set(sg * 0.006 * H, -0.007 * H, 0).applyMatrix4(Up).sub(_vb.setFromMatrixPosition(Cl));
      const gm = P.girth;
      add(cl, 'ellipsoid', { c: capW.toArray(), r: [0.021 * H * lerp(1, 0.9, fem) * gm, 0.0175 * H * gm, 0.026 * H * lerp(1, 0.92, fem) * gm] }, { k: 0.02 * H, tag: 'arm' }); // top ≈ trapezius line
      add(up, 'ellipsoid', { c: [sg * 0.005 * H, -0.034 * H, 0.0], r: [0.023 * H * lerp(1, 0.88, fem) * gm, 0.038 * H, 0.028 * H * lerp(1, 0.92, fem) * gm] }, { k: 0.022 * H, tag: 'arm' });
    }
    add(up, 'cone', { a: [0, -0.022 * H, 0], b: [0, -P.uArm, 0], r1: P.uArmR * 0.92, r2: P.elbR }, { k: 0.016 * H, tag: 'arm' });
    add(up, 'ellipsoid', { c: [0, -0.46 * P.uArm, 0.006 * H], r: [P.uArmR * 0.78, 0.34 * P.uArm, P.uArmR * 0.76] }, { k: 0.016 * H, tag: 'arm' }); // biceps
    add(up, 'ellipsoid', { c: [0, -0.38 * P.uArm, -0.007 * H], r: [P.uArmR * 0.78, 0.36 * P.uArm, P.uArmR * 0.72] }, { k: 0.016 * H, tag: 'arm' }); // triceps
    add(lo, 'sphere', { c: [0, 0.004 * H, -0.010 * H], r: 0.0105 * H }, { k: 0.012 * H, tag: 'arm' });             // olecranon (elbow point)
    add(lo, 'cone', { a: [0, 0.002 * H, 0], b: [0, -P.fArm, 0], r1: P.fArmR * 0.9, r2: P.wristR, s: [0.78, 1, 1] }, { k: 0.016 * H, tag: 'arm' });
    add(lo, 'ellipsoid', { c: [sg * 0.002 * H, -0.22 * P.fArm, 0.004 * H], r: [P.fArmR * 0.9, 0.32 * P.fArm, P.fArmR * 1.0] }, { k: 0.018 * H, tag: 'arm' }); // forearm muscle bellies
    add(hn, 'ellipsoid', { c: [0, -0.008 * H, 0], r: [P.wristR * 0.72, 0.012 * H, P.wristR * 1.02] }, { k: 0.01 * H, tag: 'wrist' }); // wrist stub
    if (o.mitten) { // cheap hands for crowds
      add(hn, 'box', { c: [0, -0.045 * H, 0.002 * H], h: [0.007 * H, 0.028 * H, 0.020 * H], rad: 0.006 * H }, { k: 0.012 * H, tag: 'mitten' });
      add(hn, 'cone', { a: [0, -0.02 * H, 0.016 * H], b: [-sg * 0.004 * H, -0.05 * H, 0.03 * H], r1: 0.0065 * H, r2: 0.005 * H }, { k: 0.008 * H, tag: 'mitten' });
    }
  }
  // ---- legs
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    const up = `leg${s}.upper`, lo = `leg${s}.lower`, ft = `leg${s}.foot`;
    const thL = P.hipJY - P.kneeY, shL = P.kneeY - P.ankleY;
    add(up, 'cone', { a: [0, 0.010 * H, -0.004 * H], b: [0, -thL, 0.002 * H], r1: P.thighR, r2: P.kneeR }, { k: 0.026 * H, tag: 'leg' });
    add(up, 'ellipsoid', { c: [0.002 * sg * H, -0.46 * thL, 0.010 * H], r: [P.thighR * 0.8, 0.36 * thL, P.thighR * 0.74] }, { k: 0.024 * H, tag: 'leg' });            // quads
    add(up, 'ellipsoid', { c: [-sg * 0.014 * H, -0.26 * thL, -0.004 * H], r: [P.thighR * 0.62, 0.30 * thL, P.thighR * 0.72] }, { k: 0.022 * H, tag: 'leg' });         // adductors (inner thigh)
    add(up, 'ellipsoid', { c: [sg * 0.012 * H, -0.02 * H, -0.006 * H], r: [0.024 * H * (1 + 0.08 * fem), 0.046 * H, 0.034 * H] }, { k: 0.026 * H, tag: 'leg', w: 0.7 }); // outer hip
    add(up, 'ellipsoid', { c: [0, -thL + 0.008 * H, 0.010 * H], r: [P.kneeR * 0.48, P.kneeR * 0.55, P.kneeR * 0.4] }, { k: 0.016 * H, tag: 'leg' });                    // patella
    add(lo, 'cone', { a: [0, 0, 0.002 * H], b: [0, -shL, -0.002 * H], r1: P.kneeR * 0.96, r2: P.ankleR }, { k: 0.022 * H, tag: 'leg' });
    add(lo, 'ellipsoid', { c: [-sg * 0.001 * H, -0.27 * shL, -0.013 * H], r: [P.calfR * 0.86, 0.26 * shL, P.calfR * 0.74] }, { k: 0.022 * H, tag: 'leg' });   // gastrocnemius
    add(lo, 'ellipsoid', { c: [-sg * 0.008 * H, -0.36 * shL, -0.008 * H], r: [P.calfR * 0.56, 0.2 * shL, P.calfR * 0.6] }, { k: 0.018 * H, tag: 'leg' });      // medial calf, a little lower
    // foot (ankle origin; sole at y = -ankleY). Length = footL: heel back ≈ -0.23 fl, toe tip ≈ +0.77 fl
    const fl = P.footL, ay = P.ankleY;
    add(ft, 'sphere', { c: [0, 0, -0.002 * H], r: P.ankleR * 1.0 }, { k: 0.01 * H, tag: 'foot' });
    for (const m of [1, -1]) add(ft, 'sphere', { c: [m * P.ankleR * 0.82, m > 0 === sg > 0 ? -0.003 * H : 0.001 * H, -0.002 * H], r: P.ankleR * 0.42 }, { k: 0.006 * H, tag: 'foot' }); // malleoli
    add(ft, 'ellipsoid', { c: [0, -ay * 0.55, -0.14 * fl], r: [0.017 * H, ay * 0.46, 0.09 * fl] }, { k: 0.012 * H, tag: 'foot' }); // heel
    add(ft, 'cone', { a: [0, -ay * 0.45, 0.0], b: [sg * 0.004 * H, -ay * 0.66, fl * 0.56], r1: 0.016 * H, r2: 0.0135 * H, s: [1.22, 0.7, 1] }, { k: 0.014 * H, tag: 'foot' }); // instep / metatarsals
    add(ft, 'cone', { a: [sg * 0.004 * H, -ay * 0.7, fl * 0.56], b: [sg * 0.006 * H, -ay * 0.76, fl * 0.71], r1: 0.0105 * H, r2: 0.0082 * H, s: [1.7, 0.78, 1] }, { k: 0.009 * H, tag: 'foot' }); // toes
  }
  return f;
}

// ------------------------------------------------------------------------------------------
const GEO_CACHE = new Map();
export const FIGURE_CACHE = GEO_CACHE;
export const FIGURE_LIB_VERSION = 'fig-2';
export function figureKey(o = {}) {
  const P = dims(o);
  const L = LOD[o.lod || 'hi'] || LOD.hi;
  return JSON.stringify({ v: FIGURE_LIB_VERSION, P, lod: o.lod || 'hi', costume: o.costume || [], hair: o.hair || null, mitten: !L.hand, barefoot: !!o.barefoot });
}
const LOD = {
  hi: { body: 0.008, head: 0.0028, hair: 0.0042, cloth: 0.0085, detail: 0.0036, hand: 'figure', dec: 0.0007 },
  mid: { body: 0.012, head: 0.0042, hair: 0.0060, cloth: 0.012, detail: 0.005, hand: 'crowd', dec: 0.0012 },
  lo: { body: 0.018, head: 0.011, hair: 0.012, cloth: 0.018, detail: 0.009, hand: null, dec: 0.0025, simple: true },
};

export function makeFigure(o = {}) {
  return new Figure(o);
}

export class Figure {
  // same name as the environment kit's helpers ({ object3D, update }) — fig.object3D === fig.root
  get object3D() { return this.root; }
  constructor(o) {
    this.opts = o;
    const P = this.P = dims(o);
    this.lod = LOD[o.lod || 'hi'] || LOD.hi;
    this.root = new THREE.Group();
    this.root.name = o.name || 'figure';
    // ---- skeleton
    const NW = neutralWorld(P);
    this.bones = BONES.map((n) => { const b = new THREE.Bone(); b.name = n; return b; });
    this.bi = Object.fromEntries(BONES.map((n, i) => [n, i]));
    this.neutral = BONES.map((n) => {
      const p = PARENT[n] ? NW[n].map((x, i) => x - NW[PARENT[n]][i]) : NW[n];
      return new THREE.Vector3().fromArray(p);
    });
    BONES.forEach((n, i) => {
      const b = this.bones[i];
      b.position.copy(this.neutral[i]);
      if (PARENT[n]) this.bones[this.bi[PARENT[n]]].add(b); else this.root.add(b);
    });
    // bind (A-pose) world matrices
    this._applyChannels(this._expand(BIND_POSE));
    this.root.updateMatrixWorld(true);
    const BW = this.bones.map((b) => b.matrixWorld.clone());
    this.bindWorld = BW;
    const skeleton = new THREE.Skeleton(this.bones);
    this.skeleton = skeleton;
    // ---- geometry (cached by build options)
    const key = figureKey(o);
    this.cacheKey = key;
    let G = GEO_CACHE.get(key);
    if (!G) { G = this._build(BW); GEO_CACHE.set(key, G); }
    this.G = G;
    // ---- meshes
    this.layers = {};
    this.materials = {};
    const skinCol = o.skin ?? 0xd2a586;
    this.materials.skin = o.skinMaterial || skinMaterial({ color: skinCol, age: clamp((P.age - 20) / 60), salt: o.salt ?? 0 });
    { // face colour zones (lips, cheeks, ears, lids, beard shadow) need the head's bind frame
      const su = this.materials.skin.userData.fzUniforms;
      if (su && su.uFace) { su.uFace.value = 1; su.uHeadInv.value.copy(BW[this.bi.head]).invert(); su.uHu.value = P.hu; su.uBeard.value = P.sex < 0.5 && P.child < 0.5 ? 0.7 * clamp((P.age - 22) / 30) : 0; }
    }
    const mk = (name, geo, mat) => {
      const m = new THREE.SkinnedMesh(geo, mat);
      m.name = name; m.castShadow = true; m.receiveShadow = true;
      m.bind(skeleton, new THREE.Matrix4());
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, P.H * 0.5, 0), P.H * 1.1);
      m.frustumCulled = true;
      this.root.add(m);
      this.layers[name] = m;
      return m;
    };
    mk('body', G.body.geo, this.materials.skin);
    if (G.head) mk('head', G.head.geo, this.materials.skin);
    if (G.hair) {
      this.materials.hair = o.hair?.material || materialFromDesc(G.hair.mat);
      const hu = this.materials.hair.userData.fzUniforms;
      if (hu && hu.uSkin) hu.uSkin.value.set(skinCol); // soft hairline fades into this figure's skin
      mk('hair', G.hair.geo, this.materials.hair);
    }
    for (const g of G.garments) {
      const mat = materialFromDesc(g.mat);
      this.materials[g.name] = mat;
      mk(g.name, g.geo, mat);
      for (const ex of g.extras || []) { const em = ex.mat ? materialFromDesc(ex.mat) : mat; this.materials[g.name + '.' + ex.name] = em; mk(g.name + '.' + ex.name, ex.geo, em); }
    }
    // rigid accessories (glasses, badge, …) attached to bones
    for (const acc of G.accessories || []) {
      const obj = acc.make();
      this.bones[this.bi[acc.bone]].add(obj);
      this.layers[acc.name] = obj;
    }
    // ---- hands
    this.hands = {};
    if (this.lod.hand) {
      const ho = o.hands || {};
      for (const s of ['L', 'R']) {
        const side = ho[s] || {};
        const h = makeHand({
          side: s, lod: ho.lod || this.lod.hand, sex: P.sex < 0.5 ? 'm' : 'f', length: P.hand,
          age: ho.age ?? clamp((P.age - 15) / 65), variant: side.variant || ho.variant || 'bare', glove: side.glove ?? ho.glove ?? false,
          skin: skinCol, skinMaterial: ho.shareSkin === false ? undefined : undefined, slender: ho.slender, salt: ho.salt, forearmLen: 0.03,
          detail: ho.detail ?? 0.6, cuffs: side.cuffs, smudge: side.smudge, smudgeColor: ho.smudgeColor, gloveColor: ho.gloveColor,
        });
        this.bones[this.bi[`arm${s}.hand`]].add(h.root);
        this.hands[s] = h;
        (this.handKeys = this.handKeys || []).push(h.cacheKey);
      }
    }
    // garments with a skirt part (hem below the crotch): rendered two-sided while the thighs are raised (seated, kneeling)
    // so panels that skinning folds over show their (darker) inside instead of see-through holes; single-sided otherwise
    // (two-sided cloth costs ≈ +0.3 s per close-up figure). Override with fig.setTwoSided(true|false|null=auto).
    const HEMF = { waist: 0.60, hip: 0.47, thigh: 0.40, knee: 0.295, below_knee: 0.25, calf: 0.19, ankle: 0.065, floor: 0.035 };
    this._foldMats = [];
    for (const sp of o.costume || []) {
      const hf = typeof sp.length === 'number' ? sp.length : HEMF[sp.length] ?? (['coat', 'robe', 'lab_coat', 'dress', 'cheongsam', 'skirt'].includes(sp.type) ? 0.3 : 0.47);
      const longType = ['skirt', 'dress', 'cheongsam', 'robe', 'coat', 'lab_coat', 'side_jacket', 'apron'].includes(sp.type);
      if (sp.type === 'shoes' || sp.type === 'trousers' || sp.type === 'sash' || sp.type === 'belt') continue;
      if (!(longType || hf <= 0.45)) continue;
      const name = sp.name; if (!name) continue;
      for (const [k, m] of Object.entries(this.materials)) if ((k === name || k.startsWith(name + '.')) && m && m.isMaterial && m.side === THREE.FrontSide) this._foldMats.push(m);
    }
    this._twoSided = null;
    // ---- state
    this.ch = {};
    this.pose('stand');
  }

  // ---------------- build all geometry in bind space -----------------
  _build(BW) {
    const P = this.P, o = this.opts, L = this.lod;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const field = bodyField(P, BW, this.bi, { mitten: !L.hand });
    const H = P.H;
    const bbAll = { min: [-0.62 * H, -0.01, -0.2 * H], max: [0.62 * H, H + 0.02, 0.22 * H] };
    field.accel({ min: [bbAll.min[0] - 0.05, -0.05, bbAll.min[2] - 0.05], max: [bbAll.max[0] + 0.05, H + 0.1, bbAll.max[2] + 0.05] }, 0.045 * H / 1.7);
    const ev = (x, y, z) => field.eval(x, y, z);
    const G = { garments: [], accessories: [] };
    // ---- garments first (we need their coverage to cull hidden skin)
    const ctx = { P, BW, bi: this.bi, field, ev, lod: L, H, bones: BONES };
    { // longest hem among skirt-like garments (seated skirt weights are keyed to it, identically for every layer)
      const HF = { waist: 0.60, hip: 0.47, thigh: 0.40, knee: 0.295, below_knee: 0.25, calf: 0.19, ankle: 0.065, floor: 0.035 };
      let mh = null;
      for (const sp of o.costume || []) {
        if (!['skirt', 'dress', 'cheongsam', 'robe', 'coat', 'lab_coat', 'side_jacket', 'apron', 'shirt', 'blouse', 'jacket', 'sailor', 'vest'].includes(sp.type)) continue;
        const fr = typeof sp.length === 'number' ? sp.length : HF[sp.length] ?? (['coat', 'robe', 'lab_coat', 'dress', 'cheongsam', 'skirt'].includes(sp.type) ? (sp.type === 'robe' ? 0.065 : sp.type === 'skirt' || sp.type === 'dress' || sp.type === 'cheongsam' ? 0.19 : 0.295) : 0.47);
        mh = mh === null ? fr * H : Math.min(mh, fr * H);
      }
      ctx.minHemY = mh;
    }
    const covers = [];
    // layer order (inner -> outer); garments wrap the hulls of the layers beneath them
    const RANK = { trousers: 0, skirt: 0.5, shirt: 1, blouse: 1.2, cheongsam: 1.5, dress: 1.5, vest: 1.8, jacket: 2, sailor: 2, side_jacket: 2, lab_coat: 2.6, coat: 3, robe: 3, apron: 4, shawl: 4.5, sash: 5, belt: 5, shoes: 6 };
    const specs = (o.costume || []).map((sp, i) => ({ sp, i, r: sp.layer ?? RANK[sp.type] ?? 2 })).sort((a, b) => a.r - b.r || a.i - b.i);
    ctx.hulls = [];
    const built = [];
    specs.forEach(({ sp }, rank) => {
      const g = buildGarment({ ...sp, layer: sp.layer ?? rank }, ctx, rank);
      if (!g) return;
      G.garments.push(g); built.push(g);
      if (g.cover) covers.push(g.cover);
      for (const a of g.accessories || []) G.accessories.push(a);
      for (const h of g.hulls || []) ctx.hulls.push(h);
    });
    // cull inner-garment faces hidden under outer layers
    for (let i = 0; i < built.length; i++) {
      const outer = built.slice(i + 1).map((g) => g.cover).filter(Boolean);
      if (!outer.length) continue;
      for (const geo of [built[i].geo, ...(built[i].extras || []).map((e) => e.geo)]) {
        const pa = geo.attributes.position.array, ix = geo.index.array;
        const keep = [];
        // a face is dropped only when ALL its corners are well inside an outer layer: culling on the centroid left a
        // saw-tooth edge that showed through openings (V-necks, lapels, cuffs)
        const deep = (o) => { for (const cv of outer) if (cv(pa[o], pa[o + 1], pa[o + 2]) < -0.009) return true; return false; };
        for (let f = 0; f < ix.length; f += 3) {
          const a = ix[f] * 3, b = ix[f + 1] * 3, c = ix[f + 2] * 3;
          if (!(deep(a) && deep(b) && deep(c))) keep.push(ix[f], ix[f + 1], ix[f + 2]);
        }
        geo.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
      }
    }
    // ---- body (without head; neck cut mid-way)
    const neckCut = P.neckY + (P.headY - P.neckY) * 0.55;
    const hiddenHand = !!L.hand; // detailed hands replace the wrist stub
    const bodyEval = (x, y, z) => ev(x, y, z);
    let mb = meshField((x, y, z) => Math.max(bodyEval(x, y, z), y - neckCut), bbAll, L.body, { project: 2 });
    // keep faces: below the neck cut, not covered by garments, not inside the hands
    const handC = ['L', 'R'].map((s) => new THREE.Vector3().setFromMatrixPosition(BW[this.bi[`arm${s}.hand`]]));
    const handAx = ['L', 'R'].map((s) => new THREE.Vector3(0, -1, 0).transformDirection(BW[this.bi[`arm${s}.hand`]]));
    mb.idx = filterFaces(mb.pos, mb.idx, (x, y, z) => {
      if (y > neckCut - L.body * 0.5) return false;
      if (hiddenHand) for (let k = 0; k < 2; k++) { const c = handC[k], a = handAx[k]; const t = (x - c.x) * a.x + (y - c.y) * a.y + (z - c.z) * a.z; if (t > 0.012 * H / 1.7 && (x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2 < (0.15 * H) ** 2) return false; }
      for (const cv of covers) if (cv(x, y, z) < -0.0045) return false;  // (covers check removal regions first)
      return true;
    });
    mb = compact(mb);
    // the neck overlap with the finer head mesh stays undecimated (exact surface: no seam line where the two meshes cross)
    const neckLow0 = P.neckY + (P.headY - P.neckY) * 0.25;
    if (L.dec) mb = decimate(mb, { maxError: L.dec, ratio: 0.2, lock: (x, y) => y > neckLow0 - 0.01 });
    const tauB = 0.010 * H / 1.7;
    const wb = field.weights(mb.pos, { tau: tauB, nBones: BONES.length });
    mb.skinIndex = wb.skinIndex; mb.skinWeight = wb.skinWeight;
    mb.aux = new Float32Array(mb.pos.length / 3 * 4);
    G.body = { geo: toGeometry(mb, { skin: mb }), stats: mb.idx.length / 3 };
    // ---- head + upper neck at finer resolution (slightly inflated so it covers the body's cut)
    const hb = BW[this.bi.head];
    const hc = new THREE.Vector3().setFromMatrixPosition(hb);
    const r = P.hu * 0.75;
    const neckLow = P.neckY + (P.headY - P.neckY) * 0.25;
    const bbH = { min: [hc.x - r, neckLow - 0.01, hc.z - r], max: [hc.x + r, H + 0.01, hc.z + r * 1.05] };
    let mh = meshField((x, y, z) => Math.max(bodyEval(x, y, z) - 0.0004 + 0.0009 * sstep(neckLow + 0.02 * H / 1.7, neckLow, y), neckLow - y), bbH, L.head, { project: 2 });
    mh.idx = filterFaces(mh.pos, mh.idx, (x, y, z) => y > neckLow + L.head * 0.5 && !covers.some((cv) => cv(x, y, z) < -0.012));
    mh = compact(mh);
    if (L.dec) mh = decimate(mh, { maxError: L.dec * 0.5, ratio: 0.25 });
    const wh = field.weights(mh.pos, { tau: tauB, nBones: BONES.length });
    { // the face and skull follow the head bone rigidly above the jaw line (no shear of the face when the head turns)
      const inv = hb.clone().invert(), q = new THREE.Vector3(), hi = this.bi.head, hu = P.hu;
      for (let v = 0; v < mh.pos.length / 3; v++) {
        q.fromArray(mh.pos, v * 3).applyMatrix4(inv);
        const t = sstep(-0.24 * hu, -0.1 * hu, q.y - 0.3 * Math.max(0, q.z));
        if (t <= 0) continue;
        const W = new Map();
        for (let j = 0; j < 4; j++) { const b = wh.skinIndex[v * 4 + j], w = wh.skinWeight[v * 4 + j] * (1 - t); if (w > 0) W.set(b, (W.get(b) || 0) + w); }
        W.set(hi, (W.get(hi) || 0) + t);
        const top = [...W.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const sum = top.reduce((a, e) => a + e[1], 0);
        for (let j = 0; j < 4; j++) { wh.skinIndex[v * 4 + j] = top[j] ? top[j][0] : hi; wh.skinWeight[v * 4 + j] = top[j] ? top[j][1] / sum : 0; }
      }
    }
    mh.skinIndex = wh.skinIndex; mh.skinWeight = wh.skinWeight;
    mh.aux = new Float32Array(mh.pos.length / 3 * 4);
    G.head = { geo: toGeometry(mh, { skin: mh }) };
    // ---- hair
    if (o.hair && o.hair.style !== 'none') G.hair = buildHair(o.hair, ctx);
    G.ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    G.tris = { body: mb.idx.length / 3, head: mh.idx.length / 3, garments: G.garments.map((g) => [g.name, g.tris]) };
    return G;
  }

  // ---------------- pose system -----------------
  // expand a channel dict into {bone: {x,y,z,px,py,pz}}
  _expand(ch, base = {}) {
    const out = base;
    for (const [k, v] of Object.entries(ch)) {
      if (k === 'handL' || k === 'handR' || k === 'ik' || k === 'look') continue;
      const dot = k.lastIndexOf('.');
      let bone = k.slice(0, dot), ax = k.slice(dot + 1);
      bone = ALIAS[bone] || bone;
      if (!(bone in CMAP)) continue;
      (out[bone] = out[bone] || {})[ax] = ((out[bone] || {})[ax] || 0) + v;
    }
    return out;
  }
  _applyChannels(E) {
    for (let i = 0; i < BONES.length; i++) {
      const n = BONES[i], b = this.bones[i], c = E[n] || {};
      const r = rawEuler(n, c);
      b.quaternion.setFromEuler(_eu.set(r.x, r.y, r.z, 'ZXY'));
      b.position.copy(this.neutral[i]);
      if (c.px || c.py || c.pz) b.position.add(_va.set(c.px || 0, c.py || 0, c.pz || 0));
    }
  }
  // pose(nameOrChannels, params|{add:true})
  pose(p, params = {}) {
    let ch;
    if (typeof p === 'string') ch = this.preset(p, params);
    else ch = p;
    if (!params.add) this.ch = {};
    for (const [k, v] of Object.entries(ch)) {
      if (k === 'handL' || k === 'handR' || k === 'ik' || k === 'look') { this.ch[k] = v; continue; }
      this.ch[k] = (params.add ? (this.ch[k] || 0) : 0) + v;
    }
    const E = this._expand(this.ch);
    this._applyChannels(E);
    this._flex = Math.max(E['legL.upper']?.x || 0, E['legR.upper']?.x || 0);
    this._updateFold();
    // hands
    for (const s of ['L', 'R']) {
      const h = this.hands[s]; if (!h) continue;
      const hp = this.ch['hand' + s] ?? 'relaxed';
      if (typeof hp === 'string') h.pose(hp, {});
      else if (Array.isArray(hp)) h.pose(hp[0], hp[1] || {});
      else h.setChannels(hp);
    }
    this.root.updateMatrixWorld(true);
    if (this.ch.ik) for (const [s, t] of Object.entries(this.ch.ik)) this.reach(s, this.root.localToWorld(new THREE.Vector3().fromArray(t.target)), { ...t, pole: t.pole ? new THREE.Vector3().fromArray(t.pole).transformDirection(this.root.matrixWorld) : undefined, palm: t.palm ? new THREE.Vector3().fromArray(t.palm).transformDirection(this.root.matrixWorld) : undefined, fingers: t.fingers ? new THREE.Vector3().fromArray(t.fingers).transformDirection(this.root.matrixWorld) : undefined });
    if (this.ch.look) this.lookAt(this.root.localToWorld(new THREE.Vector3().fromArray(this.ch.look)));
    return this;
  }
  setTwoSided(on = null) { this._twoSided = on; this._updateFold(); return this; }
  _updateFold() {
    if (!this._foldMats || !this._foldMats.length) return;
    const two = this._twoSided ?? (this._flex || 0) > 0.6;
    const side = two ? THREE.DoubleSide : THREE.FrontSide;
    for (const m of this._foldMats) if (m.side !== side) m.side = side;
  }
  // blend two channel dicts (numbers lerp; hand channels blend via hand.js)
  static blend(a, b, t) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = a[k], y = b[k];
      if (typeof x === 'number' || typeof y === 'number') out[k] = lerp(x || 0, y || 0, t);
      else out[k] = t < 0.5 ? (x ?? y) : (y ?? x);
    }
    return out;
  }
  blend(a, b, t) { return Figure.blend(typeof a === 'string' ? this.preset(a) : a, typeof b === 'string' ? this.preset(b) : b, t); }

  bone(name) { return this.bones[this.bi[ALIAS[name] || name]]; }
  worldPos(name, target = new THREE.Vector3()) { const b = this.bone(name); b.updateWorldMatrix(true, false); return target.setFromMatrixPosition(b.matrixWorld); }
  // eye point (between the eyes) in world space — for eyelines / cameras
  eye(target = new THREE.Vector3()) { const b = this.bone('head'); b.updateWorldMatrix(true, false); return target.set(0, 0.33 * this.P.hu, 0.42 * this.P.hu).applyMatrix4(b.matrixWorld); }
  socket(side, name = 'grip') { return this.hands[side]?.sockets[name]; }

  // ---------------- IK: reach(side, worldTarget, {pole, palm, fingers, elbowOut}) --------------
  // target = world position of the WRIST. pole = world direction the elbow should point toward.
  // palm / fingers (world directions) orient the hand; otherwise the posed wrist rotation is kept.
  reach(side, target, opt = {}) {
    const P = this.P;
    const up = this.bone(`arm${side}.upper`), lo = this.bone(`arm${side}.lower`), hn = this.bone(`arm${side}.hand`);
    this.root.updateMatrixWorld(true);
    const S = new THREE.Vector3().setFromMatrixPosition(up.matrixWorld);
    const a = lo.position.length(), b = hn.position.length();
    const T = target.clone();
    const dv = T.clone().sub(S);
    let d = dv.length();
    const dmax = (a + b) * 0.999, dmin = Math.abs(a - b) + 0.01;
    if (d > dmax) { dv.multiplyScalar(dmax / d); d = dmax; T.copy(S).add(dv); }
    if (d < dmin) { dv.multiplyScalar(dmin / Math.max(d, 1e-6)); d = dmin; T.copy(S).add(dv); }
    const u = dv.clone().normalize();
    const sg = side === 'L' ? 1 : -1;
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    const pole = (opt.pole ? opt.pole.clone() : new THREE.Vector3(sg * (opt.elbowOut ?? 0.45), -0.75, -0.45).applyQuaternion(rootQ)).normalize();
    const v = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u)));
    if (v.lengthSq() < 1e-8) v.set(0, -1, 0).sub(u.clone().multiplyScalar(-u.y));
    v.normalize();
    const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    const E = S.clone().add(u.clone().multiplyScalar(a * cosA)).add(v.clone().multiplyScalar(a * sinA));
    // upper arm: local -Y -> E-S ; local +Z toward the bend side (forearm direction component)
    const Y1 = S.clone().sub(E).normalize();
    const fdir = T.clone().sub(E).normalize();
    let Z1 = fdir.clone().sub(Y1.clone().multiplyScalar(fdir.dot(Y1)));
    if (Z1.lengthSq() < 1e-6) Z1 = new THREE.Vector3(0, 0, 1).applyQuaternion(rootQ).sub(Y1.clone().multiplyScalar(Y1.z));
    Z1.normalize();
    const X1 = new THREE.Vector3().crossVectors(Y1, Z1);
    const q1 = new THREE.Quaternion().setFromRotationMatrix(_m4.makeBasis(X1, Y1, Z1));
    const Y2 = E.clone().sub(T).normalize();
    const Z2 = new THREE.Vector3().crossVectors(X1, Y2).normalize();
    const q2 = new THREE.Quaternion().setFromRotationMatrix(_m4.makeBasis(X1, Y2, Z2));
    // forearm twist toward a desired palm direction is carried by the hand orientation
    const parentQ = up.parent.getWorldQuaternion(new THREE.Quaternion());
    // bone rest offsets are not exactly along -Y; correct for the neutral offset direction
    const off1 = lo.position.clone().normalize(), off2 = hn.position.clone().normalize();
    const c1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), off1);
    const c2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), off2);
    up.quaternion.copy(parentQ.invert().multiply(q1).multiply(c1.invert()));
    up.updateMatrixWorld(true);
    const q1w = up.getWorldQuaternion(new THREE.Quaternion());
    lo.quaternion.copy(q1w.invert().multiply(q2).multiply(c2.invert()));
    lo.updateMatrixWorld(true);
    if (opt.palm || opt.fingers) {
      const loW = lo.getWorldQuaternion(new THREE.Quaternion());
      const Yh = (opt.fingers ? opt.fingers.clone().negate() : Y2.clone()).normalize();
      let Xh = opt.palm ? opt.palm.clone().multiplyScalar(-sg) : new THREE.Vector3(1, 0, 0).applyQuaternion(loW);
      Xh.sub(Yh.clone().multiplyScalar(Xh.dot(Yh))).normalize();
      const Zh = new THREE.Vector3().crossVectors(Xh, Yh);
      const qh = new THREE.Quaternion().setFromRotationMatrix(_m4.makeBasis(Xh, Yh, Zh));
      hn.quaternion.copy(loW.invert().multiply(qh));
    }
    hn.updateMatrixWorld(true);
    for (const h of Object.values(this.hands)) h.updateSockets();
    return this;
  }

  // look at a world point: distributes yaw/pitch over chest/neck/head. w = 0..1 weight
  lookAt(point, w = 1) {
    const head = this.bone('head'), neck = this.bone('neck'), chest = this.bone('chest');
    this.root.updateMatrixWorld(true);
    const eye = this.eye();
    const dir = point.clone().sub(eye).normalize();
    // into neck-parent (chest) space
    const cq = chest.getWorldQuaternion(new THREE.Quaternion()).invert();
    const dl = dir.applyQuaternion(cq);
    const yaw = clamp(Math.atan2(dl.x, dl.z), -1.4, 1.4) * w;
    const pitch = clamp(-Math.atan2(dl.y, Math.hypot(dl.x, dl.z)), -0.7, 0.8) * w;
    // current head/neck forward already includes pose rotations: add on top
    const add = (b, y, x) => { b.quaternion.premultiply(_qa.setFromEuler(_eu.set(0, 0, 0))); b.quaternion.multiply(_qb.setFromEuler(_eu.set(x, y, 0, 'YXZ'))); };
    // subtract what the neck/head already rotate (approximately) by measuring the current head forward
    const hf = new THREE.Vector3(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(cq);
    const yaw0 = Math.atan2(hf.x, hf.z), pitch0 = -Math.atan2(hf.y, Math.hypot(hf.x, hf.z));
    const dy = yaw - yaw0 * w, dp = pitch - pitch0 * w;
    add(neck, dy * 0.4, dp * 0.35);
    add(head, dy * 0.6, dp * 0.65);
    this.root.updateMatrixWorld(true);
    return this;
  }

  // breathing (additive, call after pose). amp 1 = calm; 2 = deep sigh
  breathe(T, amp = 1, rate = 0.24) {
    const s = Math.sin(T * Math.PI * 2 * rate);
    const c = this.bone('chest'), sp = this.bone('spine');
    c.quaternion.multiply(_qa.setFromEuler(_eu.set(-0.012 * amp * s, 0, 0)));
    sp.quaternion.multiply(_qa.setFromEuler(_eu.set(-0.006 * amp * s, 0, 0)));
    for (const sd of ['L', 'R']) { const cl = this.bone(`arm${sd}.clav`); cl.quaternion.multiply(_qa.setFromEuler(_eu.set(0, 0, (sd === 'L' ? 1 : -1) * 0.012 * amp * (s * 0.5 + 0.5)))); }
    this.bone('head').quaternion.multiply(_qa.setFromEuler(_eu.set(0.01 * amp * s, 0, 0)));
    this.root.updateMatrixWorld(true);
    return this;
  }
  // trembling shoulders (additive), intensity 0..1
  tremble(T, k = 1) {
    const n = (f, sd) => Math.sin(T * f + sd) * 0.6 + Math.sin(T * f * 1.73 + sd * 2.1) * 0.4;
    for (const sd of ['L', 'R']) { const cl = this.bone(`arm${sd}.clav`); cl.quaternion.multiply(_qa.setFromEuler(_eu.set(0, 0, (sd === 'L' ? 1 : -1) * 0.02 * k * Math.max(0, n(9.5, sd === 'L' ? 0 : 1.3))))); }
    this.bone('chest').quaternion.multiply(_qa.setFromEuler(_eu.set(0.012 * k * n(6.1, 0.4), 0, 0)));
    this.root.updateMatrixWorld(true);
    return this;
  }
  hold(side, obj, { socket = 'grip', grip = null } = {}) {
    const h = this.hands[side]; if (!h) { this.bone(`arm${side}.hand`).add(obj); return obj; }
    if (grip) h.pose(grip[0] || grip, grip[1] || {});
    return h.hold(obj, socket);
  }
  setGloves(on) { for (const h of Object.values(this.hands)) h.setGlove(on); }
  setLayerVisible(name, v) { if (this.layers[name]) this.layers[name].visible = v; }

  // Bake the current pose into a static (non-skinned) mesh group — cheap to render, for extras.
  bake({ merge = true } = {}) {
    this.root.updateMatrixWorld(true);
    const out = new THREE.Group();
    const inv = this.root.matrixWorld.clone().invert();
    const parts = [];
    this.root.traverse((m) => {
      if (!m.isSkinnedMesh || !m.visible) return;
      const g = m.geometry, n = g.attributes.position.count;
      const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
      const v = new THREE.Vector3(), nn = new THREE.Vector3();
      const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(g.attributes.position, i); m.applyBoneTransform(i, v); v.applyMatrix4(mw);
        pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
        // normal: transform with the dominant bone only (cheap)
        nn.fromBufferAttribute(g.attributes.normal, i);
        const bi0 = g.attributes.skinIndex.getX(i);
        const bm = new THREE.Matrix4().multiplyMatrices(m.skeleton.bones[bi0].matrixWorld, m.skeleton.boneInverses[bi0]);
        nn.transformDirection(bm).transformDirection(mw);
        nrm[i * 3] = nn.x; nrm[i * 3 + 1] = nn.y; nrm[i * 3 + 2] = nn.z;
      }
      const ng = new THREE.BufferGeometry();
      ng.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      ng.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      for (const a of ['restPos', 'restNrm', 'aux']) if (g.attributes[a]) ng.setAttribute(a, g.attributes[a]);
      ng.setIndex(g.index);
      const mesh = new THREE.Mesh(ng, m.material);
      mesh.castShadow = mesh.receiveShadow = true;
      parts.push(mesh);
    });
    for (const p of parts) out.add(p);
    return out;
  }

  // ---------------- presets -----------------
  preset(name, p = {}) {
    const fn = POSES[name];
    if (!fn) throw new Error('unknown pose ' + name);
    const ch = fn(this.P, p, this);
    if (this.P.stoop > 0 && !p.noStoop) {
      const s = this.P.stoop;
      ch['chest.x'] = (ch['chest.x'] || 0) + 0.16 * s;
      ch['spine.x'] = (ch['spine.x'] || 0) + 0.04 * s;
      ch['neck.x'] = (ch['neck.x'] || 0) + 0.12 * s;
      ch['head.x'] = (ch['head.x'] || 0) - 0.2 * s;
      ch['armL.clav.y'] = (ch['armL.clav.y'] || 0) + 0.08 * s; ch['armR.clav.y'] = (ch['armR.clav.y'] || 0) + 0.08 * s;
    }
    return ch;
  }
}

// 2-D sagittal leg IK: given hip joint height above floor & desired ankle position (forward, up)
function legIK(P, hipY, ankleZ, ankleY) {
  const a = P.hipJY - P.kneeY, b = P.kneeY - P.ankleY;
  const dy = hipY - ankleY, dz = ankleZ;
  let d = Math.hypot(dy, dz);
  d = clamp(d, Math.abs(a - b) + 0.01, (a + b) * 0.999);
  const base = Math.atan2(dz, dy); // angle of hip->ankle from straight down, + forward
  const cA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const A = Math.acos(cA);
  const thigh = base + A;                 // thigh flexion (+ forward)
  const knee = Math.PI - Math.acos(clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  return { thigh, knee };
}

// relaxed stance: arms hang close to the body (just clearing the hips), soft elbow bend, forearms a little pronated so
// the backs of the hands turn outward, shoulders down; hands relaxed (fingers together, thumb alongside the index)
const STAND_BASE = {
  'armL.upper.z': 0.085, 'armR.upper.z': 0.085, 'armL.upper.x': 0.04, 'armR.upper.x': 0.04, 'armL.upper.y': 0.06, 'armR.upper.y': 0.06,
  'armL.lower.x': 0.24, 'armR.lower.x': 0.24, 'armL.lower.y': 0.32, 'armR.lower.y': 0.32,
  'armL.hand.x': 0.1, 'armR.hand.x': 0.1, 'armL.hand.z': 0.06, 'armR.hand.z': 0.06,
  'armL.clav.z': -0.02, 'armR.clav.z': -0.02,
  'legL.upper.z': 0.025, 'legR.upper.z': 0.025, 'legL.upper.y': 0.08, 'legR.upper.y': 0.08,
  'legL.foot.y': 0.05, 'legR.foot.y': 0.05,
  handL: 'relaxed', handR: 'relaxed',
};

export const POSES = {
  neutral: () => ({}),
  apose: () => ({ ...APOSE }),
  stand: (P, p) => {
    const w = p.weight ?? 0; // -1 on right leg … +1 on left leg (contrapposto)
    return { ...STAND_BASE, 'hips.z': -0.03 * w, 'hips.px': 0.012 * w * P.H / 1.7, 'chest.z': 0.03 * w, 'legL.upper.z': 0.025 - 0.02 * w, 'legR.upper.z': 0.025 + 0.02 * w, 'legR.lower.x': w > 0 ? 0.12 * w : 0, 'legL.lower.x': w < 0 ? -0.12 * w : 0 };
  },
  stand_hands_front: (P) => ({ ...STAND_BASE, 'armL.upper.x': 0.25, 'armR.upper.x': 0.25, 'armL.upper.z': 0.02, 'armR.upper.z': 0.02, 'armL.upper.y': 0.45, 'armR.upper.y': 0.45, 'armL.lower.x': 1.0, 'armR.lower.x': 1.0, 'armL.lower.y': 0.6, 'armR.lower.y': 0.6, handL: 'relaxed', handR: 'relaxed' }),
  sit_chair: (P, p, fig) => sitPose(P, { seat: 0.46, feet: 0.06, lean: 0.06, ...p }),
  sit_bench: (P, p) => sitPose(P, { seat: 0.44, feet: 0.1, lean: 0.12, hands: 'lap', ...p }),
  sit_desk: (P, p) => sitPose(P, { seat: 0.47, feet: 0.05, lean: 0.25, hands: 'desk', ...p }),
  kneel: (P, p) => kneelPose(P, p),
  pray_kneel: (P, p) => ({ ...kneelPose(P, p), ...prayArms(P, p), 'neck.x': 0.25, 'head.x': 0.28, 'chest.x': 0.06 }),
  pray_sit: (P, p) => ({ ...sitPose(P, { seat: 0.44, feet: 0.06, lean: 0.18, hands: 'none', ...p }), ...prayArms(P, { ...p, sit: true }), 'neck.x': 0.3, 'head.x': 0.3 }),
  walk: (P, p) => walkPose(P, p),
  lean_forward: (P, p) => ({ ...STAND_BASE, 'spine.x': 0.12, 'chest.x': 0.18, 'neck.x': -0.05, 'hips.x': 0.05 }),
  look_down: (P) => ({ ...STAND_BASE, 'neck.x': 0.35, 'head.x': 0.3, 'chest.x': 0.05 }),
};

function sitPose(P, p) {
  const H = P.H;
  const hipY = p.seat + 0.075 * H / 1.7;           // hip joint above the seat
  const lean = p.lean ?? 0.05;
  // pelvis rotates back a little when seated; thighs ~horizontal
  const ankleZ = (P.hipJY - P.kneeY) * 0.98 + (p.feet ?? 0.05);
  const ik = legIK(P, hipY, ankleZ, P.ankleY);
  const ch = {
    ...STAND_BASE,
    'hips.py': hipY - P.hipJY, 'hips.pz': -0.02 * H / 1.7, 'hips.x': -0.08,
    'spine.x': 0.06 + lean * 0.4, 'chest.x': 0.04 + lean * 0.5, 'neck.x': -0.02, 'head.x': 0.02,
    'legL.upper.x': ik.thigh + 0.08, 'legR.upper.x': ik.thigh + 0.08, 'legL.lower.x': ik.knee, 'legR.lower.x': ik.knee,
    'legL.foot.x': ik.knee - ik.thigh - 0.08 > 0 ? -(ik.knee - ik.thigh - 0.08) * 0.6 : 0, 'legR.foot.x': ik.knee - ik.thigh - 0.08 > 0 ? -(ik.knee - ik.thigh - 0.08) * 0.6 : 0,
    'legL.upper.z': 0.04, 'legR.upper.z': 0.04, 'legL.upper.y': 0.05, 'legR.upper.y': 0.05,
  };
  if (p.hands === 'lap' || p.hands === undefined) Object.assign(ch, { 'armL.upper.x': 0.42, 'armR.upper.x': 0.42, 'armL.upper.z': 0.06, 'armR.upper.z': 0.06, 'armL.upper.y': 0.3, 'armR.upper.y': 0.3, 'armL.lower.x': 0.75, 'armR.lower.x': 0.75, 'armL.lower.y': 0.9, 'armR.lower.y': 0.9, 'armL.hand.x': 0.15, 'armR.hand.x': 0.15, handL: 'relaxed', handR: 'relaxed' });
  if (p.hands === 'knees') Object.assign(ch, { 'armL.upper.x': 0.55, 'armR.upper.x': 0.55, 'armL.lower.x': 0.45, 'armR.lower.x': 0.45, 'armL.lower.y': 1.2, 'armR.lower.y': 1.2, 'armL.hand.x': 0.4, 'armR.hand.x': 0.4 });
  if (p.hands === 'desk') Object.assign(ch, { 'armL.upper.x': 0.55, 'armR.upper.x': 0.55, 'armL.upper.z': 0.15, 'armR.upper.z': 0.15, 'armL.upper.y': 0.35, 'armR.upper.y': 0.35, 'armL.lower.x': 1.35, 'armR.lower.x': 1.35, 'armL.lower.y': 1.35, 'armR.lower.y': 1.35, 'armL.hand.x': -0.05, 'armR.hand.x': -0.05 });
  return ch;
}
function kneelPose(P, p) {
  const H = P.H;
  const thL = P.hipJY - P.kneeY, shL = P.kneeY - P.ankleY;
  const kneeR = P.kneeR * 0.9;
  const sitBack = p.sitBack ?? 0;                 // 0 upright kneel … 1 sitting on heels
  const thighAng = lerp(0.05, 1.25, sitBack);    // flexion
  const hipY = kneeR + Math.cos(thighAng) * thL;
  return {
    ...STAND_BASE,
    'hips.py': hipY - P.hipJY, 'hips.pz': -Math.sin(thighAng) * thL * 0.0,
    'legL.upper.x': thighAng, 'legR.upper.x': thighAng, 'legL.lower.x': Math.PI / 2 + thighAng - 0.02, 'legR.lower.x': Math.PI / 2 + thighAng - 0.02,
    'legL.foot.x': 0.75, 'legR.foot.x': 0.75, 'legL.upper.z': 0.03, 'legR.upper.z': 0.03,
    'spine.x': -thighAng * 0.3 + 0.03, 'chest.x': 0.03,
  };
}
function prayArms(P, p) {
  // hands together in front of the chest: IK targets in root space (relative to the chest height)
  const H = P.H;
  const hy = (p.sit ? (p.seat ?? 0.44) + 0.075 * H / 1.7 - P.hipJY : 0) + (p.kneelOffset || 0);
  const ky = p.sit ? 0 : (P.kneeR * 0.9 + (P.hipJY - P.kneeY) * Math.cos(lerp(0.05, 1.25, p.sitBack ?? 0)) - P.hipJY);
  const y = P.chestY + 0.02 * H + (p.sit ? hy : ky) + (p.handsHigh ?? 0);
  const z = 0.17 * H / 1.7 + (p.handsFwd ?? 0);
  const gap = 0.012 * H / 1.7;
  return {
    handL: 'pray', handR: 'pray',
    ik: {
      L: { target: [gap + 0.008, y - 0.055, z], pole: [0.6, -0.6, -0.3], palm: [-1, 0.0, 0.05], fingers: [0, 0.75, 0.42] },
      R: { target: [-gap - 0.008, y - 0.055, z], pole: [-0.6, -0.6, -0.3], palm: [1, 0.0, 0.05], fingers: [0, 0.75, 0.42] },
    },
  };
}
function walkPose(P, p) {
  const ph = (p.phase ?? 0) * Math.PI * 2;
  const st = p.stride ?? 1;   // amplitude multiplier
  const s = Math.sin(ph), c = Math.cos(ph);
  const H = P.H;
  const swingL = s, swingR = -s;
  const kneeL = Math.max(0, Math.sin(ph + 1.9)) * 0.75 + 0.1, kneeR = Math.max(0, Math.sin(ph + 1.9 + Math.PI)) * 0.75 + 0.1;
  return {
    ...STAND_BASE,
    'hips.py': -0.012 * H / 1.7 * (1 - Math.abs(c)) * st - 0.008, 'hips.y': 0.07 * s * st, 'hips.z': 0.03 * Math.sin(ph * 2) * 0 + 0.025 * c,
    'spine.y': -0.05 * s * st, 'chest.y': -0.08 * s * st, 'chest.x': 0.04, 'head.y': 0.05 * s * st,
    'legL.upper.x': 0.36 * swingL * st + 0.05, 'legR.upper.x': 0.36 * swingR * st + 0.05,
    'legL.lower.x': kneeL * st, 'legR.lower.x': kneeR * st,
    'legL.foot.x': -0.18 * swingL * st + 0.12 * Math.max(0, -Math.sin(ph + 0.6)), 'legR.foot.x': -0.18 * swingR * st + 0.12 * Math.max(0, Math.sin(ph + 0.6)),
    'armL.upper.x': -0.3 * swingL * st + 0.05, 'armR.upper.x': -0.3 * swingR * st + 0.05,
    'armL.lower.x': 0.3 + 0.15 * Math.max(0, -swingL), 'armR.lower.x': 0.3 + 0.15 * Math.max(0, -swingR),
  };
}

export { dims as figureDims };
