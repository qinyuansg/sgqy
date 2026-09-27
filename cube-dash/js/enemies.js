// ─────────────────────────────────────────────────────────────
// CUBE DASH — enemies: every red cube (AI · billiards physics · BONK ·
// dizzy/smash) + all gameplay telegraph decals + instanced rendering.
//
//   const em = new EnemyManager(G, run)       (run.enemies)
//   em.list · em.boss · em.aliveCount
//   em.spawnWithPortal(type, x, z, opts) · em.spawn(type, x, z, opts)
//   em.spawnFalling(type, x, z, opts) · em.spawnBoss(opts)
//   em.knock(e, dx, dz, speed, {byPlayer, heavy, hops})
//   em.smash(e, {dirX, dirZ, byNova, bySat, force, perfect, combo})
//   em.dizzy(e, seconds, source) · em.dizzyRadius(x, z, r, s, source)
//   em.pushRadius(x, z, r, speed) · em.nova(x, z, r, heroId)
//   em.threatTTC(px, pz, pvx, pvz, radius) · em.nearestSmashable(...)
//   extras: em.pull(...) · em.freezeAll(s) · em.slowRadius(...) · em.freeMinions()
//   em.update(dt) · em.clear() · em.dispose()
//
// Design: docs/DESIGN_BRIEF.md §2 · contract: docs/ARCHITECTURE.md
// Colour law: RED = hurts · ORANGE stripes = incoming attack ·
//             YELLOW stars + pink-white = smash me now.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { TAU, clamp, lerp, len2, rand } from './core.js';
import { CubeCrowd, BlobShadows, EXPR } from './art.js';
import { DATA } from './data.js';
import { Boss } from './boss.js';

const D = DATA.TUNE;
const EN = DATA.enemies;
const DEG = Math.PI / 180;

// module-local tuning (not design numbers → data.js wins for those)
const TUNE = {
  capacity: 160,              // CubeCrowd instances (≥ 128)
  radiusK: 0.52,              // collision radius = size × radiusK
  dropHeight: 7, gravity: 38, // portal drop-in
  circle: { min: 4, max: 6, speedK: 0.6 },
  tokenRecheck: 0.3, tokenHysteresis: 1.5,
  sepK: 0.6,                  // fraction of overlap resolved per frame
  sleepWake: 3.0,
  stun: 0.28,                 // HURT face after a knock that bonked nothing
  bonkImmune: 1.5,
  projEnd: 2.2,               // knocked flight ends below this speed
  dizzyFriction: 9,           // u/s² for drifting dizzy cubes
  rimBounceBase: 0.35,
  bumperBounce: 1.05,
  bowlSpeed: 7.5, bowlCd: 0.6,
  zippyHitSpeed: 11,
  zippyBackUp: 0.3,           // u backed up during the wind-up (kid rule 9)
  dizzyTilt: 0.26,            // ~15° lean while dizzy
  shakeWarn: 0.12,
  wobbleHz: 6,
  smashTint: 0.4, smashTintColor: 0xffe8f2,
  hazardDizzy: 2.0, hazardDizzyCd: 0.8,
  tutorialBonkSpeed: 0.8,     // 1-1 steerTogether pair bonks at any real closing speed
  pulledBonkSpeed: 3,
  nudgeSpeed: 3.2,
  miniPop: 6.5,
  eliteSpeedy: 1.4,
  fallTime: 0.7,
  contactDamage: true,        // fallback only: skipped when run.playerCtl.resolve() owns hero contact
  heroPassives: true,         // Stella Starlight drift handled here (enemy physics)
  driveShake: false,          // run.js already shakes / hit-stops on enemy:bonk (kept as an option)
  blastChainBudget: 8,        // popper chain explosions resolved per frame
  beamerTurn: 60,             // °/s idle turn toward the hero
  steerTogetherDefault: 0.4,
};

const COL = {
  tele: 0xff8a1c, tele2: 0xffd65a, white: 0xffffff, cyan: 0x62f4ff,
  beamGlow: 0xffa23a, beamCore: 0xfffbe8,   // danger = yellow-white / orange, never plain red (kid rule 12) star: 0xffe14a, crown: 0xffc630,
  steel: 0x9aa6c4, horn: 0xfff1d6, seam: 0xffd2f0, lens: 0xffe36b, pylon: 0xc9c6ec, aim: 0xfff4c2,
  hat: 0x2b2d4f, hatBand: 0xffcf3a, shield: 0x7fe8ff, flame: 0xffa531, spark: 0xfff3a0,
  fuse: 0x5a3a2e, nozzle: 0x3b3f5c, fin: 0xffd06b, pipOff: 0x3a3f55, pipOn: 0xffb13b,
};

// ─────────────── geometry helpers ───────────────
/** merge indexed/non-indexed geometries (position + normal only) */
export function mergeGeos(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal;
    pos.set(p.array.subarray(0, p.count * 3), vo * 3);
    if (n) nrm.set(n.array.subarray(0, p.count * 3), vo * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < p.count; i++) idx[io++] = i + vo;
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  for (const g of geos) g.dispose();
  return out;
}

export function starGeometry(outer = 0.5, inner = 0.22, depth = 0.14) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + Math.PI / 2, r = i % 2 ? inner : outer;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** zig-zag crown: open cylinder whose top ring alternates up/down, plus gem balls */
export function crownGeometry(r = 0.36, h = 0.24, spikes = 5) {
  const seg = spikes * 2;
  const c = new THREE.CylinderGeometry(r, r * 0.86, h, seg, 1, true);
  const p = c.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      const a = Math.atan2(p.getX(i), p.getZ(i));
      const k = ((Math.round((a / TAU) * seg) % seg) + seg) % seg;
      if (k % 2 === 0) p.setY(i, p.getY(i) + h * 0.85);
    }
  }
  c.computeVertexNormals();
  const parts = [c];
  for (let i = 0; i < spikes; i++) {
    const a = (i * 2 / seg) * TAU;
    const b = new THREE.SphereGeometry(0.06, 8, 6);
    b.translate(Math.sin(a) * r, h * 0.5 + h * 0.85, Math.cos(a) * r);
    parts.push(b);
  }
  const ring = new THREE.TorusGeometry(r * 0.93, 0.035, 6, 20); ring.rotateX(Math.PI / 2); ring.translate(0, -h * 0.35, 0);
  parts.push(ring);
  return mergeGeos(parts);
}

// ─────────────── telegraph decals (ground) + beams (air) ───────────────
// Immediate mode: every frame begin() → disc()/rect()/beam() → end().
// ONE instanced draw per shape. ORANGE striped animated fill, white flash at the end.
const DECAL_VERT = /* glsl */`
attribute vec4 aA;   // fill, flash, alpha, mode
attribute vec4 aB;   // disc: radius, inner, seed, tint · rect: length, width, seed, tint
varying vec2 vUv; varying vec4 vA; varying vec4 vB;
void main() {
  vUv = uv; vA = aA; vB = aB;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const DECAL_COMMON = /* glsl */`
uniform float uTime; uniform vec3 uO1; uniform vec3 uO2; uniform vec3 uW; uniform vec3 uC; uniform vec3 uR;
varying vec2 vUv; varying vec4 vA; varying vec4 vB;
float sdSegD(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// "!" glyph (screen-upright on the ground), height s in world units → (fill, outline)
vec2 bang(vec2 p, float s) {
  float d = min(sdSegD(p, vec2(0.0, 0.02 * s), vec2(0.0, 0.40 * s)) - 0.1 * s, length(p - vec2(0.0, -0.32 * s)) - 0.11 * s);
  return vec2(1.0 - smoothstep(-0.012, 0.012, d), 1.0 - smoothstep(0.05 * s, 0.09 * s, d));
}
`;
const DISC_FRAG = DECAL_COMMON + /* glsl */`
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float fill = vA.x, flash = vA.y, alpha = vA.z, mode = vA.w;
  float R = max(vB.x, 0.05);
  float fw = max(fwidth(r), 0.002);
  vec3 col = uO1; float a = 0.0;
  if (mode < 0.5) {                       // telegraph: stripes fill from the centre out
    float edgeW = clamp(0.14 / R, 0.03, 0.22);
    float edge = smoothstep(1.0 - edgeW - fw, 1.0 - edgeW, r);
    vec2 wp = p * R;
    float st = step(0.5, fract((wp.x + wp.y) * 1.25 - uTime * 1.8));
    float inFill = 1.0 - smoothstep(fill - fw, fill, r);
    col = mix(uO1, mix(uO1, uO2, st), inFill);
    a = mix(0.18, 0.64, inFill);
    float lead = (1.0 - smoothstep(0.0, 0.06, abs(r - fill))) * step(0.02, fill) * (1.0 - step(0.995, fill));
    col = mix(col, uO2, lead); a = max(a, lead * 0.9);
    col = mix(col, uO1, edge); a = max(a, edge * 0.95);
    vec2 g = bang(wp, min(R * 0.55, 1.1));   // "!" in the middle of every danger zone
    col = mix(col, uO1 * 0.75, g.y); a = max(a, g.y * 0.9);
    col = mix(col, uW, g.x); a = max(a, g.x);
  } else if (mode < 1.5) {                // shockwave ring band (inner..1)
    float inner = vB.y;
    float band = smoothstep(inner - fw, inner + fw, r) * (1.0 - smoothstep(1.0 - fw * 2.0, 1.0, r));
    float mid = 1.0 - abs((r - inner) / max(1.0 - inner, 0.001) * 2.0 - 1.0);
    col = mix(uO1, uO2, mid);
    col = mix(col, uW, 0.25 + 0.25 * mid);
    a = band * (0.55 + 0.4 * mid);
  } else if (mode < 2.5) {                // thin marker ring (spawn portal / warp gate)
    float pulse = 0.65 + 0.35 * sin(uTime * 7.0 + vB.z * 6.28);
    float ring = smoothstep(0.80 - fw, 0.84, r) * (1.0 - smoothstep(0.96, 1.0, r));
    vec3 tint = mix(uW, uC, vB.w);
    col = tint; a = ring * pulse * 0.9 + (1.0 - r) * 0.10 * vB.w;
    float spin = step(0.5, fract(atan(p.y, p.x) / 6.2831 * 8.0 + uTime * 0.6 * (vB.w > 0.5 ? 1.0 : -1.0)));
    a *= mix(1.0, 0.55 + 0.45 * spin, vB.w);
  } else if (mode < 3.5) {                // blast flash (filled glow)
    col = mix(uO2, uW, 0.55); a = (1.0 - r * r) * 0.85;
  } else {                                // "!" badge (lanes / beams get one at their base)
    vec2 g = bang(p * R, R * 1.5);
    float bg = (1.0 - smoothstep(0.86, 1.0, r)) * 0.35;
    col = mix(uO2, uO1 * 0.75, g.y); a = max(bg, g.y * 0.95);
    col = mix(col, uW, g.x); a = max(a, g.x);
  }
  col = mix(col, uW, flash); a = mix(a, max(a, 0.85) * step(0.001, a + flash), flash);
  gl_FragColor = vec4(col, clamp(a * alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}`;
const RECT_FRAG = DECAL_COMMON + /* glsl */`
void main() {
  float u = vUv.x - 0.5;           // across (-0.5..0.5)
  float v = 1.0 - vUv.y;           // along  (0 base → 1 tip)
  float fill = vA.x, flash = vA.y, alpha = vA.z, mode = vA.w;
  float L = max(vB.x, 0.05), W = max(vB.y, 0.05);
  vec2 wp = vec2(u * W, v * L);
  float fwv = max(fwidth(v), 0.0005), fwu = max(fwidth(u), 0.0005);
  vec3 col = uO1; float a = 0.0;
  if (mode < 0.5) {                       // lane: stripes fill base → tip
    float bw = clamp(0.1 / W, 0.03, 0.2);
    float border = smoothstep(0.5 - bw - fwu, 0.5 - bw, abs(u));
    float cap = 1.0 - smoothstep(0.0, clamp(0.12 / L, 0.004, 0.1), min(v, 1.0 - v));
    float st = step(0.5, fract((wp.x + wp.y) * 1.1 - uTime * 2.2));
    float inFill = 1.0 - smoothstep(fill - fwv, fill, v);
    col = mix(uO1, mix(uO1, uO2, st), inFill);
    a = mix(0.16, 0.62, inFill);
    float e = max(border, cap);
    col = mix(col, uO1, e); a = max(a, e * 0.92);
  } else if (mode < 1.5) {                // chevrons (Zippy): fill chevron by chevron toward the tip
    float c = fract((wp.y - abs(wp.x) * 0.9) / 1.05);
    float chev = smoothstep(0.42, 0.48, c) * (1.0 - smoothstep(0.78, 0.84, c));
    float inFill = 1.0 - smoothstep(fill - fwv * 2.0, fill, v);
    float side = 1.0 - smoothstep(0.46, 0.5, abs(u));
    col = mix(uO1, uO2, inFill * 0.6);
    a = chev * side * mix(0.28, 0.95, inFill) + 0.08 * side;
  } else if (mode < 2.5) {                // thin aiming line (Beamer floor line)
    float core = 1.0 - smoothstep(0.0, 0.5, abs(u) * 2.0);
    float pulse = 0.55 + 0.45 * sin(uTime * 14.0 - v * L * 1.5);
    col = mix(uO1, uO2, core);
    a = core * (0.35 + 0.5 * pulse) * (1.0 - smoothstep(0.85, 1.0, v));
  } else if (mode < 3.5) {                // active beam scorch on the floor
    float core = 1.0 - smoothstep(0.0, 0.5, abs(u) * 2.0);
    col = mix(uR, uW, core * core);
    a = (0.35 + 0.55 * core) * (1.0 - smoothstep(0.92, 1.0, v));
  } else {                                // thick dashed yellow-white line (Beamer / laser telegraph)
    float dash = step(0.42, fract(wp.y / 0.9 - uTime * 1.4));
    float body = 1.0 - smoothstep(0.40, 0.5, abs(u));
    float inFill = 1.0 - smoothstep(fill - fwv, fill, v);
    col = mix(uO2, uW, 0.45 + 0.55 * inFill);
    a = body * mix(0.12, 0.2, inFill) + body * dash * mix(0.4, 0.95, inFill);
  }
  col = mix(col, uW, flash); a = mix(a, max(a, 0.8), flash);
  gl_FragColor = vec4(col, clamp(a * alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

class DecalLayer {
  constructor(scene, { discs = 96, rects = 64, beams = 48 } = {}) {
    this.uniforms = {
      uTime: { value: 0 },
      uO1: { value: new THREE.Color(COL.tele) }, uO2: { value: new THREE.Color(COL.tele2) },
      uW: { value: new THREE.Color(COL.white) }, uC: { value: new THREE.Color(COL.cyan) },
      uR: { value: new THREE.Color(COL.beamGlow) },
    };
    const mk = (geo, frag, cap) => {
      const aA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
      const aB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aA', aA); geo.setAttribute('aB', aB);
      const mat = new THREE.ShaderMaterial({
        uniforms: this.uniforms, vertexShader: DECAL_VERT, fragmentShader: frag,
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false; m.renderOrder = 2; m.count = 0;
      scene.add(m);
      return { mesh: m, aA, aB, cap, n: 0 };
    };
    const dg = new THREE.PlaneGeometry(2, 2); dg.rotateX(-Math.PI / 2);
    const rg = new THREE.PlaneGeometry(1, 1); rg.rotateX(-Math.PI / 2); rg.translate(0, 0, 0.5);
    this.d = mk(dg, DISC_FRAG, discs);
    this.r = mk(rg, RECT_FRAG, rects);
    // beams in the air: additive boxes (glow shell + white core) coloured per instance
    const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0, 0.5);
    this.beamMesh = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }), beams);
    this.beamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.beamMesh.frustumCulled = false; this.beamMesh.count = 0; this.beamMesh.renderOrder = 3;
    this.beamMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.beamMesh);
    this.beamCap = beams; this.nb = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0); this._c = new THREE.Color();
    this.y = 0.035;
  }
  begin(time) { this.uniforms.uTime.value = time; this.d.n = 0; this.r.n = 0; this.nb = 0; }
  /** ground disc: mode 0 telegraph fill · 1 ring band (inner 0..1) · 2 marker ring (tint 0 white..1 cyan) · 3 blast flash */
  disc(x, z, radius, fill = 1, flash = 0, alpha = 1, mode = 0, inner = 0, seed = 0, tint = 0) {
    const L = this.d; if (L.n >= L.cap || radius <= 0.01) return;
    const i = L.n++;
    this._m.makeScale(radius, 1, radius); this._m.setPosition(x, this.y + i * 0.0004, z);
    L.mesh.setMatrixAt(i, this._m);
    L.aA.setXYZW(i, fill, flash, alpha, mode); L.aB.setXYZW(i, radius, inner, seed, tint);
  }
  /** screen-upright "!" badge on the ground (lanes / beams / charges) */
  bang(x, z, size = 0.5, flash = 0, alpha = 1) { this.disc(x, z, size, 1, flash, alpha, 4); }
  /** ground rect from (x,z) along angle (atan2(dx,dz)) — mode 0 lane · 1 chevrons · 2 thin line · 3 beam scorch */
  rect(x, z, angle, length, width, fill = 1, flash = 0, alpha = 1, mode = 0) {
    const L = this.r; if (L.n >= L.cap || length <= 0.01) return;
    const i = L.n++;
    this._q.setFromAxisAngle(this._up, angle);
    this._p.set(x, this.y + 0.002 + i * 0.0004, z); this._s.set(width, 1, length);
    this._m.compose(this._p, this._q, this._s);
    L.mesh.setMatrixAt(i, this._m);
    L.aA.setXYZW(i, fill, flash, alpha, mode); L.aB.setXYZW(i, length, width, 0, 0);
  }
  /** air beam (additive box) from (x,y,z) along angle */
  beam(x, y, z, angle, length, width, color, intensity = 1) {
    if (this.nb >= this.beamCap || length <= 0.01) return;
    const i = this.nb++;
    this._q.setFromAxisAngle(this._up, angle);
    this._p.set(x, y, z); this._s.set(width, width, length);
    this._m.compose(this._p, this._q, this._s);
    this.beamMesh.setMatrixAt(i, this._m);
    this._c.set(color).multiplyScalar(intensity);
    this.beamMesh.setColorAt(i, this._c);
  }
  end() {
    for (const L of [this.d, this.r]) {
      L.mesh.count = L.n;
      L.mesh.instanceMatrix.needsUpdate = true; L.aA.needsUpdate = true; L.aB.needsUpdate = true;
    }
    this.beamMesh.count = this.nb;
    this.beamMesh.instanceMatrix.needsUpdate = true;
    if (this.beamMesh.instanceColor) this.beamMesh.instanceColor.needsUpdate = true;
  }
  dispose(scene) {
    for (const m of [this.d.mesh, this.r.mesh, this.beamMesh]) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); m.dispose?.(); }
  }
}

/** ray from (x,z) along (dx,dz) → distance to the arena circle of radius R (≥ 0) */
export function rayToRim(x, z, dx, dz, R) {
  const b = x * dx + z * dz, c = x * x + z * z - R * R;
  const disc = b * b - c;
  if (disc < 0) return 0;
  return Math.max(0, -b + Math.sqrt(disc));
}

// ─────────────── enemy manager ───────────────
const BODY = {        // per-type body proportions (× size)
  grumpy: [1, 1, 1], zippy: [1, 0.82, 1.15], splitter: [1, 1, 1], popper: [1, 0.92, 1],
  beamer: [1, 0.95, 1], bruiser: [1, 0.9, 1], coin: [1, 1, 1],
};
const LIGHT_TYPES = { grumpy: 1, zippy: 1, splitter: 1, popper: 1 };
const TOKEN_TYPES = { grumpy: 1, splitter: 1, popper: 1, bruiser: 1 };
const BRUISER_PIP_SOURCES = { rim: 1, bumper: 1, laser: 1, beam: 1, charge: 1, knock: 1, shock: 1, bonk: 1, slam: 1, ring: 1, mine: 1 };
const BRUISER_DIZZY_SOURCES = { nova: 1, armor: 1, timestop: 1, blast: 1, victory: 1 };   // popper blasts dizzy Bruisers too (kid rule 10)

export class EnemyManager {
  constructor(G, run) {
    this.G = G; this.run = run; this.bus = G.bus;
    this.scene = G.scene;
    this.list = [];
    this.boss = null;
    this.time = 0;
    this._id = 0;
    this._tokenT = 0;
    this.tokenBonus = 0;            // waves.js raises this in endless
    this.minionCount = 0;
    this._blastBudget = TUNE.blastChainBudget;
    this._deferred = [];            // spawns queued during iteration
    this._sorted = [];
    this._push = { x: 0, z: 0 };
    this._o = { x: 0, y: 0, z: 0, sx: 1, sy: 1, sz: 1, rotX: 0, rotY: 0, rotZ: 0, color: 0, expr: 0, blink: 0, lookX: 0, lookY: 0, flash: 0, glow: 0, opacity: 1 };
    this._col = new THREE.Color(); this._col2 = new THREE.Color(); this._tint = new THREE.Color(TUNE.smashTintColor);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._shakeBudget = 0;
    this._lingering = [];
    this._hitStopFrame = -1;
    this._frame = 0;
    this._buildRender();
    this._unsub = [
      this.bus.on('player:perfect', (p) => {
        const b = this.boss;
        if (b && !b.dead && len2(b.x - p.x, b.z - p.z) < b.radius + 3.5) b.addStagger?.(DATA.boss.stagger.perfectNear, 'perfect');
      }),
    ];
  }

  // ---------- render resources ----------
  _buildRender() {
    const S = this.scene;
    const low = this.G.quality === 'low';
    this.crowd = new CubeCrowd(TUNE.capacity);
    this.crowd.mesh.name = 'enemyCrowd';
    this.shadows = new BlobShadows(TUNE.capacity + 8);
    S.add(this.crowd.mesh, this.shadows.mesh);
    this.decals = new DecalLayer(S);
    const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
    const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
    const inst = (name, geo, mat, cap, colors = false) => {
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false; m.count = 0; m.name = name;
      if (colors) m.setColorAt(0, new THREE.Color(1, 1, 1));
      S.add(m);
      return { mesh: m, n: 0, cap };
    };
    const A = this.acc = {};
    A.stars = inst('dizzyStars', starGeometry(), basic(COL.star, { toneMapped: false }), TUNE.capacity * 3 + 8);
    // Zippy: dorsal fin + thruster nozzle + flame
    const fin = new THREE.CylinderGeometry(0.0, 0.5, 0.8, 3, 1); fin.rotateX(-Math.PI / 2); fin.scale(0.4, 1.1, 1); fin.translate(0, 0.12, -0.05);
    A.fin = inst('zippyFin', fin, lam(COL.fin, { emissive: 0x442200 }), 64);
    const noz = new THREE.CylinderGeometry(0.2, 0.27, 0.22, 12); noz.rotateX(Math.PI / 2);
    A.nozzle = inst('zippyNozzle', noz, lam(COL.nozzle), 64);
    const flame = new THREE.ConeGeometry(0.17, 0.6, 10); flame.rotateX(-Math.PI / 2); flame.translate(0, 0, -0.3);
    A.flame = inst('zippyFlame', flame, basic(COL.flame, { transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 64);
    // Popper: fuse stem + spark
    const stem = new THREE.CylinderGeometry(0.045, 0.055, 0.3, 6); stem.translate(0, 0.15, 0);
    A.stem = inst('popperStem', stem, lam(COL.fuse), 64);
    A.spark = inst('popperSpark', new THREE.IcosahedronGeometry(0.11, 1), basic(COL.spark, { toneMapped: false }), 64);
    // Beamer: pylon + lens
    const pyl = mergeGeos([
      (() => { const g = new THREE.CylinderGeometry(0.42, 0.6, 0.44, 18); g.translate(0, 0.22, 0); return g; })(),
      (() => { const g = new THREE.TorusGeometry(0.56, 0.07, 6, 24); g.rotateX(Math.PI / 2); g.translate(0, 0.06, 0); return g; })(),
      (() => { const g = new THREE.TorusGeometry(0.44, 0.05, 6, 24); g.rotateX(Math.PI / 2); g.translate(0, 0.42, 0); return g; })(),
    ]);
    A.pylon = inst('beamerPylon', pyl, lam(COL.pylon, { emissive: 0x201a40 }), 24);
    const lensG = mergeGeos([
      (() => { const g = new THREE.CylinderGeometry(0.05, 0.07, 0.2, 8); g.translate(0, 0.1, 0); return g; })(),
      (() => { const g = new THREE.SphereGeometry(0.16, 14, 10); g.translate(0, 0.26, 0); return g; })(),
    ]);
    A.lens = inst('beamerLens', lensG, basic(COL.lens, { toneMapped: false }), 24, true);
    const ringG = new THREE.TorusGeometry(0.17, 0.035, 6, 18); ringG.translate(0, 0.26, 0.02);
    A.lensRing = inst('beamerLensRing', ringG, lam(0xe8e6ff, { emissive: 0x302a60 }), 24);
    // Bruiser: helmet dome + horns + crack pips
    const dome = new THREE.SphereGeometry(0.58, 20, 10, 0, TAU, 0, Math.PI * 0.5); dome.scale(1, 0.46, 1);
    const brim = new THREE.TorusGeometry(0.56, 0.05, 6, 28); brim.rotateX(Math.PI / 2);
    const helmetG = mergeGeos([dome, brim]);
    A.helmet = inst('bruiserHelmet', helmetG, new THREE.MeshStandardMaterial({ color: COL.steel, metalness: 0.55, roughness: 0.32, emissive: 0x1a1e30 }), 24);
    const hornL = new THREE.ConeGeometry(0.1, 0.42, 8); hornL.rotateZ(0.8); hornL.translate(-0.5, 0.2, 0);
    const hornR = new THREE.ConeGeometry(0.1, 0.42, 8); hornR.rotateZ(-0.8); hornR.translate(0.5, 0.2, 0);
    A.horns = inst('bruiserHorns', mergeGeos([hornL, hornR]), lam(COL.horn), 24);
    A.pips = inst('bruiserPips', new THREE.SphereGeometry(0.07, 8, 6), basic(0xffffff, { toneMapped: false }), 72, true);
    // Splitter seam
    A.seam = inst('splitterSeam', new THREE.BoxGeometry(0.075, 1.035, 1.035), basic(COL.seam, { toneMapped: false }), 64, true);
    // Elite crown + shield bubble
    A.crown = inst('eliteCrown', crownGeometry(), new THREE.MeshStandardMaterial({ color: COL.crown, metalness: 0.6, roughness: 0.3, emissive: 0x6a4300, side: THREE.DoubleSide }), 40);
    A.bubble = inst('eliteBubble', new THREE.SphereGeometry(0.5, low ? 12 : 20, low ? 8 : 14), basic(COL.shield, { transparent: true, opacity: 0.28, depthWrite: false }), 40);
    // Coin cube top hat
    const hat = mergeGeos([
      (() => { const g = new THREE.CylinderGeometry(0.44, 0.44, 0.05, 20); return g; })(),
      (() => { const g = new THREE.CylinderGeometry(0.27, 0.29, 0.42, 18); g.translate(0, 0.23, 0); return g; })(),
    ]);
    A.hat = inst('coinHat', hat, lam(COL.hat), 6);
    const band = new THREE.CylinderGeometry(0.295, 0.295, 0.08, 18); band.translate(0, 0.08, 0);
    A.band = inst('coinBand', band, lam(COL.hatBand, { emissive: 0x553300 }), 6);
  }

  // ---------- helpers ----------
  get R() { return this.run?.arenaRadius ?? this.G.world?.arenaRadius ?? 11; }
  get worldIndex() { return this.run?.worldIndex ?? 0; }
  get player() { return this.run?.player || null; }
  get cardMods() { return this.run?.cardMods || EMPTY; }
  get teleMult() { return this.run?.assist ? D.assist.telegraph : 1; }
  _hazards() { const r = this.run; if (!r) return null; if (!Array.isArray(r.hazards)) { try { r.hazards = []; } catch { return null; } } return r.hazards; }
  _addHazard(h) { const hz = this._hazards(); if (hz && !hz.includes(h)) hz.push(h); return h; }
  _removeHazard(h) { if (!h) return; h.active = false; const hz = this._hazards(); if (!hz) return; const i = hz.indexOf(h); if (i >= 0) hz.splice(i, 1); }
  /** hazard record per contract: {kind, active, hearts, srcX, srcZ, test(x,z,r), dizzies} */
  makeHazard(kind, hearts, test, dizzies = false, extra = {}) {
    return this._addHazard({ kind, active: false, hearts, srcX: 0, srcZ: 0, test, dizzies, own: true, ...extra });
  }
  removeHazard(h) { this._removeHazard(h); }
  _emit(name, payload) { this.bus.emit(name, payload); }
  _fx(kind, x, y, z, opts) { try { this.G.fx?.burst?.(kind, x, y, z, opts); } catch { /* fx optional */ } }
  _shake(k, s = 0.2) {
    if (!TUNE.driveShake || this._shakeBudget > 0.5) return;
    this._shakeBudget += k;
    try { this.G.cam?.shake?.(k, s); } catch { /* cam optional */ }
  }
  _dizzyBonus() {
    let b = (this.cardMods.dizzyBonus || 0) + (this.run?.guardian?.dizzyBonus || 0);
    if (TUNE.heroPassives && this.run?.heroDef?.passive?.id === 'starlight') b += this.run.heroDef.passive.dizzyBonus ?? 0.5;
    return b;
  }
  _speedMult() {
    let m = (this.run?.guardian?.speedMult ?? 1) * (this.run?.mutator?.speedMult ?? 1);
    if (this.run?.assist) m *= D.assist.enemySpeed;
    return m;
  }
  _enemyColor(type) {
    if (type === 'grumpy') return this.G.world?.theme?.enemyColor ?? DATA.worlds[this.worldIndex]?.enemyColor ?? EN.grumpy.color;
    return EN[type]?.color ?? EN.grumpy.color;
  }

  // ---------- spawning ----------
  _make(type, x, z, opts = {}) {
    const def = EN[type] || EN.grumpy;
    if (!EN[type]) type = 'grumpy';
    let size, speed, turn, hearts, xp, sizeKey;
    if (type === 'grumpy') {
      sizeKey = def.sizes[opts.size] ? opts.size : 'M';
      const sd = def.sizes[sizeKey];
      size = opts.mini ? EN.splitter.miniSize : sd.size;
      speed = sd.speed; turn = sd.turn; hearts = sd.hearts; xp = opts.mini ? 'S' : sd.xp;
      if (opts.mini) { sizeKey = 'S'; speed = def.sizes.S.speed; turn = def.sizes.S.turn; }
    } else {
      size = def.size; speed = def.speed || 0; turn = def.turn || 90; hearts = def.hearts; xp = def.xp;
      sizeKey = size >= 1.4 ? 'L' : size >= 0.95 ? 'M' : 'S';
      if (type === 'bruiser') sizeKey = 'L';
    }
    if (opts.elite) xp = 'XL';
    // kid rule 2: every hit = 1 heart; 'hearts' only scales knockback in run.hurtPlayer (1 + 0.45 per extra)
    const kb = (type === 'grumpy' ? def.sizes[sizeKey]?.knockback : def.knockback) ?? D.player.knockback;
    if (hearts > 0) hearts = Math.max(1, 1 + (kb / D.player.knockback - 1) / 0.45);
    const mass = (def.mass ?? 1) * (type === 'grumpy' ? Math.max(0.6, Math.pow(size, 1.5)) : 1);
    let sMult = (opts.speedMult ?? 1);
    if (opts.elite === 'speedy') sMult *= TUNE.eliteSpeedy;
    const R = this.R;
    const a0 = Math.atan2(-x, -z);
    const e = {
      id: ++this._id, type, sizeKey, def, x, z, y: 0, vx: 0, vz: 0, size, radius: size * TUNE.radiusK, rotY: a0,
      mass, hearts, state: 'portal', portal: true, smashable: false, harmful: false, elite: opts.elite || null, isBoss: false,
      color: opts.color ?? this._enemyColor(type), treasure: !!def.treasure, stationary: !!def.stationary,
      xp, mini: !!opts.mini, minion: !!opts.minion, waveIndex: opts.wave ?? -1, pairId: opts.pairId ?? null,
      steer: opts.steerTogether ?? 0,
      // internals
      ai: opts.sleep ? 'sleep' : 'chase', t: 0, heading: a0, spd: 0,
      maxSpeed: speed * sMult, baseSpeedMult: sMult, turn, accel: def.accel ?? 6,
      dizzyT: 0, tiredT: 0, stunT: 0, immuneT: 0, freezeT: 0, slowT: 0, slowMult: 1, hazCd: 0, bowlCd: 0,
      proj: false, hops: 0, byPlayer: false, pullT: 0, pullX: 0, pullZ: 0, pullS: 0, pullOrbit: 0,
      portalT: 0, portalMax: 0, dropping: false, vy: 0, grounded: false, rain: null,
      sq: 1, sqV: 0, flash: 0, hopPh: rand() * TAU, wobPh: rand() * TAU, look: 0,
      token: false, circA: rand() * TAU, circR: lerp(TUNE.circle.min, TUNE.circle.max, rand()), circDir: rand() < 0.5 ? -1 : 1,
      shield: opts.elite === 'shielded', pips: 0, fall: 0, dead: false,
      // type state
      cd: 1 + rand() * 1.5, wT: 0, wDur: 0, cdx: 0, cdz: 1, chargeLeft: 0,
      fuse: 0, fuseMax: 1, fuseLit: false, armed: false,
      phase: 'idle', phT: 0, beamA: a0, beamA0: a0, beamSign: 1, beamLen: 0,
      coinKnocks: [], life: def.lifetime ?? 0, hz: null, hz2: null,
    };
    if (type === 'zippy') this._zippyHazard(e);
    if (type === 'beamer') this._beamerHazard(e);
    if (type === 'popper') this._popperHazard(e);
    if (e.stationary) e.y = 0;
    // keep inside arena
    const d = len2(x, z), lim = R - size * 0.6;
    if (d > lim) { e.x = x / d * lim; e.z = z / d * lim; }
    return e;
  }

  _minDistFix(x, z, minD) {
    const p = this.player; const out = this._push;
    out.x = x; out.z = z;
    if (!p) return out;
    let dx = x - p.x, dz = z - p.z, d = len2(dx, dz);
    if (d >= minD) return out;
    if (d < 0.01) { dx = -p.x || 1; dz = -p.z || 0; d = len2(dx, dz) || 1; }
    out.x = p.x + dx / d * minD; out.z = p.z + dz / d * minD;
    const R = this.R - 1, dd = len2(out.x, out.z);
    if (dd > R) { // pushed outside: mirror to the other side of the hero
      out.x = p.x - dx / d * minD; out.z = p.z - dz / d * minD;
      const d2 = len2(out.x, out.z); if (d2 > R) { out.x *= R / d2; out.z *= R / d2; }
    }
    return out;
  }

  /** portal telegraph → drop-in. opts {size, sleep, elite, speedMult, delay, wave, minion, pairId, steerTogether, mini} */
  spawnWithPortal(type, x, z, opts = {}) {
    const fix = this._minDistFix(x, z, D.spawn.minDistFromPlayer);
    const e = this._make(type, fix.x, fix.z, opts);
    const base = this.worldIndex === 0 && this.run?.mode !== 'endless' ? D.spawn.portalTimeEarly : D.spawn.portalTime;
    e.portalT = e.portalMax = Math.max(0.2, (opts.delay ?? base) * this.teleMult);
    e.portal = true;
    this._add(e);
    this._emit('enemy:spawnWarn', { x: e.x, z: e.z, type: e.type, size: e.size, delay: e.portalT, elite: e.elite });
    return e;
  }

  /** immediate spawn (no portal). opts {vx, vz, dizzy, airborne} */
  spawn(type, x, z, opts = {}) {
    const e = this._make(type, x, z, opts);
    e.portal = false; e.grounded = true;
    if (opts.vx || opts.vz) { e.vx = opts.vx || 0; e.vz = opts.vz || 0; e.proj = true; e.hops = 0; }
    if (opts.airborne) { e.y = opts.airborne; e.vy = 4; e.grounded = false; e.dropping = true; }
    this._add(e);
    if (opts.dizzy) this.dizzy(e, opts.dizzy, 'spawn', true);
    this._emit('enemy:spawn', { x: e.x, z: e.z, type: e.type, size: e.size, color: e.color, silent: !!opts.silent });
    return e;
  }

  /** Glitch Rain: shadow disc telegraph, cube lands after `fall` s (hurts), then is DIZZY */
  spawnFalling(type, x, z, opts = {}) {
    const e = this._make(type, x, z, opts);
    const fall = Math.max(0.4, opts.fall ?? 1.2);
    const dropT = Math.sqrt(2 * TUNE.dropHeight / TUNE.gravity);
    e.portalT = Math.max(0, fall - dropT); e.portalMax = fall;
    e.rain = { t: 0, fall, radius: opts.radius ?? 1, hearts: opts.hearts ?? 1, dizzy: opts.landDizzy ?? 2, landT: 0 };
    e.rain.hz = this.makeHazard('rain', e.rain.hearts, (hx, hz, r) => len2(hx - e.x, hz - e.z) < e.rain.radius + r, false);
    e.rain.hz.srcX = x; e.rain.hz.srcZ = z;
    e.portal = true;
    this._add(e);
    return e;
  }

  /** King Glitch — lives in em.boss AND em.list (isBoss) so dashes / aim assist see it */
  spawnBoss(opts = {}) {
    if (this.boss && !this.boss.dead) return this.boss;
    const b = new Boss(this.G, this.run, this, { id: ++this._id, ...opts });
    this.boss = b;
    this.list.push(b);
    return b;
  }

  _add(e) {
    if (this.list.length >= 92) { // hard cap (ARCHITECTURE §9)
      if (e.hz) this._removeHazard(e.hz);
      if (e.hz2) this._removeHazard(e.hz2);
      if (e.rain?.hz) this._removeHazard(e.rain.hz);
      return;
    }
    if (e.minion) this.minionCount++;
    this.list.push(e);
  }

  get aliveCount() {
    let n = 0;
    for (const e of this.list) if (!e.dead && !e.treasure && !e.isBoss) n++;
    return n;
  }
  countWave(i) {
    let n = 0;
    for (const e of this.list) if (!e.dead && !e.treasure && !e.isBoss && e.waveIndex === i) n++;
    return n;
  }

  // ---------- hazards owned by enemies ----------
  _zippyHazard(e) {
    e.hz = this.makeHazard('charge', e.hearts || 1, (x, z, r) => len2(x - e.x, z - e.z) < e.radius + r, false, { e });
  }
  _popperHazard(e) {
    const R = e.def.blastRadius;
    e.hz = this.makeHazard('blast', e.def.blastHearts ?? 1, (x, z, r) => len2(x - e.x, z - e.z) < R + r * 0.25, true, { e, noAutoDizzy: true });
  }
  _beamerHazard(e) {
    const W = e.def.beamWidth;
    e.hz = this.makeHazard('beam', e.hearts || 1, (x, z, r) => {
      const dx = Math.sin(e.beamA), dz = Math.cos(e.beamA);
      const px = x - e.x, pz = z - e.z;
      const t = clamp(px * dx + pz * dz, 0, e.beamLen);
      return len2(px - dx * t, pz - dz * t) < W * 0.5 + r;
    }, true, { e });
  }

  // ---------- public API: knock / smash / dizzy ----------
  _heroBash() { return this.run?.heroDef?.dashKind === 'bash' || this.run?.player?.heroId === 'mochi'; }

  /** Billiards: launch a cube. Bruiser armour / Beamer rotation / Coin counting / shields handled here. */
  knock(e, dirX, dirZ, speed, opts = {}) {
    if (!e || e.dead) return false;
    if (e.isBoss) return e.onKnock?.(dirX, dirZ, speed, opts) ?? false;
    if (e.portal || e.fall > 0) return false;
    let n = len2(dirX, dirZ); if (n < 1e-5) { dirX = 0; dirZ = 1; n = 1; }
    dirX /= n; dirZ /= n;
    const byPlayer = !!opts.byPlayer;
    let sp = speed * (this.run?.mutator?.knockMult ?? 1);
    this._wake(e);
    e.flash = Math.max(e.flash, 0.6);
    if (e.type === 'coin') { this._coinKnock(e, byPlayer); sp *= 1.1; }
    if (e.shield) {
      e.shield = false; sp *= 0.45;
      this._emit('enemy:shieldPop', { x: e.x, z: e.z });
      this._fx('sparks', e.x, e.size * 0.6, e.z, { color: COL.shield, count: 14 });
    }
    if (e.type === 'bruiser' && e.dizzyT <= 0 && !(opts.heavy || opts.bash || (byPlayer && this._heroBash()))) {
      this._armorHit(e, byPlayer ? 'player' : 'knock');
      e.vx += dirX * 0.6; e.vz += dirZ * 0.6;
      return true;
    }
    if (e.stationary) {           // Beamer: heavy pylon — rotates 90° instead of flying
      if (e.tiredT <= 0 && e.dizzyT <= 0) {
        const cross = Math.sin(e.beamA) * dirZ - Math.cos(e.beamA) * dirX;
        const d = (cross >= 0 ? 1 : -1) * Math.PI / 2;
        e.beamA += d; e.beamA0 += d; e.rotY += d;
        this._emit('enemy:clang', { x: e.x, z: e.z, type: e.type });
      }
      e.sq = 0.8;
      return true;
    }
    if (e.type === 'splitter' && e.def.splitOnKnock && !e.portal) {   // kid rule 8: a knock splits it → 2 dizzy minis (jackpot)
      this.smash(e, { force: true, dirX, dirZ, byKnock: true, byPlayer, splitSpeed: sp });
      return true;
    }
    if (e.type === 'popper' && !e.fuseLit) {
      e.fuseLit = true; e.armed = true; e.fuse = e.fuseMax = e.def.knockedFuse;
      this._emit('enemy:windup', { x: e.x, z: e.z, type: 'popper', dirX, dirZ, fuse: e.fuse });
    }
    if (e.ai === 'windup' && e.type === 'zippy') { e.ai = 'chase'; e.cd = 1.2; }
    const m = Math.sqrt(Math.max(0.5, e.mass));
    e.vx = dirX * sp / m; e.vz = dirZ * sp / m;
    e.proj = true; e.byPlayer = byPlayer;
    const cm = this.cardMods;
    let hops = opts.hops ?? (D.knock.maxHops + (cm.extraHops || 0));
    if (cm.pinball) hops = Math.max(hops, 6);
    e.hops = hops;
    e.stunT = TUNE.stun; e.spd = 0; e.heading = Math.atan2(dirX, dirZ);
    e.sq = 1.25; e.sqV = 0;
    this._publish(e);
    this._emit('enemy:knock', { x: e.x, z: e.z, type: e.type, byPlayer, speed: sp, dirX, dirZ });
    return true;
  }

  _armorHit(e, source) {
    e.pips = Math.min(e.def.armor, e.pips + 1);
    e.flash = 1; e.sq = 0.85;
    this._emit('enemy:clang', { x: e.x, z: e.z, type: e.type, pips: e.pips, armor: e.def.armor, source });
    this._fx('sparks', e.x, e.size * 0.9, e.z, { color: 0xffffff, count: 8 });
    if (e.pips >= e.def.armor) {
      e.pips = 0;
      this.dizzy(e, e.def.dizzy, 'armor', false, source);
      return true;
    }
    return false;
  }

  _coinKnock(e, byPlayer) {
    const now = this.time, win = e.def.window;
    e.coinKnocks.push(now);
    while (e.coinKnocks.length && now - e.coinKnocks[0] > win) e.coinKnocks.shift();
    this._giveCoins(e.x, e.z, 1);
    if (e.coinKnocks.length >= e.def.knocksNeeded) {
      this._giveCoins(e.x, e.z, Math.max(1, e.def.coins - e.def.knocksNeeded));
      this._emit('enemy:coinBurst', { x: e.x, z: e.z, coins: e.def.coins });
      this._emit('enemy:freed', { x: e.x, z: e.z, size: e.size, type: 'coin', treasure: true });
      this._kill(e);
    }
  }
  _giveCoins(x, z, n) {
    const pk = this.run?.pickups;
    if (pk?.spawnCoins) { try { pk.spawnCoins(x, z, n); return; } catch { /* fall through */ } }
    this._emit('pickup:coin', { x, z, amount: n, fromCoinCube: true });
  }

  /** frees a smashable cube → enemy:smash + enemy:freed. Returns crystal size key or null */
  smash(e, opts = {}) {
    if (!e || e.dead) return null;
    if (e.isBoss) return e.hitCore?.({ perfect: !!opts.perfect, byNova: !!opts.byNova, dirX: opts.dirX, dirZ: opts.dirZ }) ? null : null;
    if (e.treasure) return null;
    if (e.portal && !opts.force) return null;
    if (!e.smashable && !opts.force) return null;
    const p = this.player;
    let dx = opts.dirX, dz = opts.dirZ;
    if (dx === undefined || (!dx && !dz)) { dx = p ? e.x - p.x : e.x; dz = p ? e.z - p.z : e.z; }
    const dl = len2(dx, dz) || 1; dx /= dl; dz /= dl;
    const crystal = opts.byFall ? 'S' : e.xp;
    this._kill(e);
    this._emit('enemy:smash', {
      x: e.x, z: e.z, y: e.y + e.size * 0.5, type: e.type, size: e.size, sizeKey: e.sizeKey, color: e.color,
      dirX: dx, dirZ: dz, combo: opts.combo ?? ((this.run?.combo ?? 0) + 1), byNova: !!opts.byNova, bySat: !!opts.bySat,
      byBlast: !!opts.fromBlast, byFall: !!opts.byFall, crystal, elite: e.elite, minion: e.minion, mini: e.mini, id: e.id,
    });
    this._emit('enemy:freed', { x: e.x, z: e.z, size: e.size, type: e.type, crystal, minion: e.minion });
    if (e.type === 'splitter' && !opts.noSplit) this._split(e, dx, dz, opts.splitSpeed);
    if (e.type === 'popper' && !opts.fromOwnBlast) this._explode(e, { harmless: !e.fuseLit || !!opts.byNova, smashed: true });
    return crystal;
  }

  _kill(e) {
    e.dead = true; e.state = 'dying'; e.smashable = false; e.harmful = false;
    if (e.hz) { this._removeHazard(e.hz); e.hz = null; }
    if (e.hz2) { this._removeHazard(e.hz2); e.hz2 = null; }
    if (e.rain?.hz) { this._removeHazard(e.rain.hz); e.rain.hz = null; }
    if (e.minion) this.minionCount = Math.max(0, this.minionCount - 1);
  }

  _split(e, dx, dz, knockSpeed = 0) {
    const n = e.def.splitInto ?? 2;
    const fwd = knockSpeed > 0 ? 0.8 : 0.4, pop = knockSpeed > 0 ? Math.max(TUNE.miniPop, knockSpeed * 0.55) : TUNE.miniPop;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const px = -dz * side, pz = dx * side;              // fan out sideways from the hit direction
      const vx = (px * 0.75 + dx * fwd) * pop, vz = (pz * 0.75 + dz * fwd) * pop;
      this._deferred.push(['grumpy', e.x + px * 0.3, e.z + pz * 0.3, {
        size: 'S', mini: true, wave: e.waveIndex, vx, vz, dizzy: EN.splitter.miniDizzy ?? 2, airborne: 0.4,
        minion: e.minion, speedMult: e.baseSpeedMult,
      }]);
    }
    this._emit('enemy:split', { x: e.x, z: e.z });
  }

  /** make a cube smashable. source: bonk|rim|bumper|laser|blast|nova|shock|spark|armor|timestop|... */
  dizzy(e, seconds, source = 'bonk', silent = false, cause = null) {
    if (!e || e.dead) return false;
    if (e.isBoss) return e.applyDizzy?.(seconds, source) ?? false;
    if (e.treasure || e.fall > 0) return false;
    if (e.portal && !e.dropping) return false;
    if (e.type === 'bruiser' && !BRUISER_DIZZY_SOURCES[source]) {
      if (BRUISER_PIP_SOURCES[source] && e.dizzyT <= 0) return this._armorHit(e, source);
      return false;
    }
    if (source === 'bonk' && e.immuneT > 0) return false;
    const was = e.dizzyT > 0 || e.tiredT > 0;
    e.dizzyT = Math.max(e.dizzyT, seconds + this._dizzyBonus());
    this._wake(e, true);
    // cancel wind-ups
    if (e.type === 'zippy' && (e.ai === 'windup' || e.ai === 'charge')) { e.ai = 'chase'; e.cd = 1.5; if (e.hz) e.hz.active = false; }
    if (e.type === 'popper' && e.armed && !e.fuseLit) { e.armed = false; e.fuse = 0; }
    if (e.type === 'beamer' && e.phase !== 'hot') { e.phase = 'hot'; e.phT = 0; if (e.hz) e.hz.active = false; }
    e.sq = Math.min(e.sq, 0.78);
    this._publish(e);
    if (!was && !silent) this._emit('enemy:dizzy', { x: e.x, z: e.z, size: e.size, type: e.type, source, cause: cause || source, id: e.id });
    return true;
  }

  _wake(e, instant = false) {
    if (e.ai !== 'sleep') return;
    e.ai = 'chase'; e.stunT = instant ? 0 : 0.35; e.sq = 1.3;
    this._emit('enemy:wake', { x: e.x, z: e.z, type: e.type });
  }

  /** perfect shockwave / sparks. Returns number of cubes affected */
  dizzyRadius(x, z, r, seconds, source = 'shock') {
    let n = 0;
    for (const e of this.list) {
      if (e.dead || e.isBoss || e.treasure) continue;
      if (len2(e.x - x, e.z - z) > r + e.radius) continue;
      if (e.type === 'bruiser' && source === 'spark') continue;   // blink sparks: Bruisers immune
      if (this.dizzy(e, seconds, source)) n++;
    }
    return n;
  }

  /** radial knock (pop rocks, blasts). Returns number knocked */
  pushRadius(x, z, r, speed, opts = {}) {
    let n = 0;
    for (const e of this.list) {
      if (e.dead || e.isBoss || e.portal) continue;
      const dx = e.x - x, dz = e.z - z, d = len2(dx, dz);
      if (d > r + e.radius || e === opts.except) continue;
      const k = 1 - clamp(d / (r + e.radius), 0, 1) * 0.5;
      if (this.knock(e, d > 0.01 ? dx : rand() - 0.5, d > 0.01 ? dz : rand() - 0.5, speed * k, { hops: opts.hops ?? 1 })) n++;
    }
    return n;
  }

  /** hero NOVA: smash light cubes, dizzy heavy ones, crack the boss. Returns cubes freed */
  nova(x, z, r, heroId) {
    let freed = 0;
    const heavy = D.nova.heavyDizzy;
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (e.dead) continue;
      const d = len2(e.x - x, e.z - z);
      if (d > r + e.radius) continue;
      if (e.isBoss) { e.novaHit?.(); continue; }
      if (e.treasure) { this.knock(e, e.x - x, e.z - z, 10); continue; }
      if (e.portal && !e.dropping) continue;
      if (LIGHT_TYPES[e.type] || e.smashable) {
        if (this.smash(e, { force: true, byNova: true, dirX: e.x - x, dirZ: e.z - z })) freed++;
      } else {
        this.dizzy(e, heavy, 'nova');
        if (e.type === 'bruiser') e.pips = 0;
      }
    }
    return freed;
  }

  /** Popper explosion: smashes dizzy cubes, dizzies+knocks others, hurts the hero (hazard) unless harmless */
  _explode(e, { harmless = false, smashed = false } = {}) {
    if (e._exploded) return 0;
    e._exploded = true;
    const R = e.def.blastRadius ?? 2.8;
    if (this._blastBudget <= 0) { harmless = true; }
    this._blastBudget--;
    if (!harmless && e.hz) {
      e.hz.active = true; e.hz.srcX = e.x; e.hz.srcZ = e.z; e.hz.t = 0.15;
      e.hz.test = ((ex, ez) => (x, z, r) => len2(x - ex, z - ez) < R + r * 0.25)(e.x, e.z);
      this._lingering.push(e.hz); e.hz = null;       // keep the blast hazard alive a few frames after death
    }
    let count = 0;
    for (let i = 0; i < this.list.length; i++) {
      const o = this.list[i];
      if (o === e || o.dead) continue;
      const dx = o.x - e.x, dz = o.z - e.z, d = len2(dx, dz);
      if (d > R + o.radius) continue;
      if (o.isBoss) { o.addStagger?.(DATA.boss.stagger.bonkNear * 2, 'blast'); continue; }
      if (o.portal && !o.dropping) continue;
      if (o.treasure) { this.knock(o, dx, dz, 9); continue; }
      if (o.smashable) { if (this.smash(o, { dirX: dx, dirZ: dz, fromBlast: true })) count++; continue; }
      if (o.type === 'bruiser') { if (this.dizzy(o, e.def.blastDizzy ?? 3, 'blast')) count++; continue; }
      if (this.dizzy(o, e.def.blastDizzy ?? 2.5, 'blast')) count++;
      this.knock(o, d > 0.01 ? dx : 1, d > 0.01 ? dz : 0, 9 * (1 - d / (R + o.radius) * 0.5), { hops: 1 });
    }
    if (!e.dead) this.smash(e, { force: true, fromOwnBlast: true, fromBlast: true });
    this._emit('enemy:explode', { x: e.x, z: e.z, radius: R, count, harmless, smashed });
    this._shake(0.25, 0.3);
    return count;
  }

  /** min time-to-contact of any harmful enemy / hazard (Perfect detection) */
  threatTTC(px, pz, pvx = 0, pvz = 0, radius = D.player.hurtRadius) {
    let best = Infinity;
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (e.dead) continue;
      if (e.isBoss) { const t = e.threatTTC?.(px, pz, radius, pvx, pvz); if (t < best) best = t; continue; }
      if (e.rain && e.portal) {         // glitch rain about to land on the hero
        if (len2(e.x - px, e.z - pz) < e.rain.radius + radius) best = Math.min(best, Math.max(0, e.rain.fall - e.rain.t));
        continue;
      }
      if (e.type === 'popper' && e.armed && e.fuseLit !== undefined && e.fuse > 0 && !e.dead) {
        if (len2(e.x - px, e.z - pz) < e.def.blastRadius + radius) best = Math.min(best, e.fuse);
      }
      if (!e.harmful) continue;
      const rx = e.x - px, rz = e.z - pz, R = radius + e.radius;
      const c = rx * rx + rz * rz - R * R;
      if (c <= 0) return 0;
      const vx = e.vx - pvx, vz = e.vz - pvz;
      const b = rx * vx + rz * vz;
      if (b >= 0) continue;
      const a = vx * vx + vz * vz;
      const disc = b * b - a * c;
      if (disc < 0 || a < 1e-6) continue;
      const t = (-b - Math.sqrt(disc)) / a;
      if (t >= 0 && t < best) best = t;
    }
    return best;
  }

  /** dash aim assist: nearest smashable within maxDist (and within ±coneDeg of dir if dir given) */
  nearestSmashable(x, z, maxDist = 5, dirX = 0, dirZ = 0, coneDeg = 25) {
    const dl = len2(dirX, dirZ);
    const cosC = Math.cos(coneDeg * DEG);
    let best = null, bd = Infinity;
    for (const e of this.list) {
      if (e.dead || !e.smashable) continue;
      const dx = e.x - x, dz = e.z - z, d = len2(dx, dz);
      if (d > maxDist + e.radius) continue;
      let score = d;
      if (dl > 0.1 && d > 0.01) {
        const dot = (dx * dirX + dz * dirZ) / (d * dl);
        if (dot < cosC) continue;
        score = d * (1.6 - dot * 0.6);
      }
      if (score < bd) { bd = score; best = e; }
    }
    return best;
  }

  /** gravity well / black hole: pull cubes toward (x,z) for this frame. orbit > 0 adds swirl */
  pull(x, z, r, strength, orbit = 0) {
    let n = 0;
    for (const e of this.list) {
      if (e.dead || e.isBoss || e.stationary || e.portal) continue;
      if (len2(e.x - x, e.z - z) > r + e.radius) continue;
      e.pullT = 0.12; e.pullX = x; e.pullZ = z; e.pullS = strength; e.pullOrbit = orbit;
      this._wake(e, true); n++;
    }
    return n;
  }
  /** Time Stop evolution: every cube frozen (and smashable) for s seconds */
  freezeAll(seconds) {
    for (const e of this.list) {
      if (e.dead || e.isBoss || e.treasure || e.portal) continue;
      e.freezeT = seconds; e.proj = false; e.vx = e.vz = 0;
      this.dizzy(e, seconds, 'timestop');
    }
  }
  /** Time Magic: cubes within r move at `mult` speed for s seconds */
  slowRadius(x, z, r, mult, seconds) {
    for (const e of this.list) {
      if (e.dead || e.isBoss) continue;
      if (len2(e.x - x, e.z - z) > r + e.radius) continue;
      e.slowT = Math.max(e.slowT, seconds); e.slowMult = mult;
    }
  }
  /** phase shift / boss defeat: free every minion (no crystals from rain/summons beyond the normal smash) */
  freeMinions() {
    for (const e of this.list) if (!e.dead && e.minion && !e.isBoss) this.smash(e, { force: true, byNova: false });
  }
  /** end of stage cleanup: free everything left (victory rain) */
  freeAll() {
    for (const e of this.list) if (!e.dead && !e.isBoss && !e.treasure) this.smash(e, { force: true });
  }

  // ─────────────── update ───────────────
  update(dt) {
    this._frame++;
    if (!(dt > 0)) { this._render(0); return; }
    this.time += dt;
    this._blastBudget = TUNE.blastChainBudget;
    this._shakeBudget = Math.max(0, this._shakeBudget - dt * 2);
    if (this._deferred.length) {
      const q = this._deferred.splice(0);
      for (const a of q) this.spawn(a[0], a[1], a[2], a[3]);
    }
    this._tokenT -= dt;
    if (this._tokenT <= 0) { this._tokenT = TUNE.tokenRecheck; this._assignTokens(); }
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.isBoss) { if (!e.removeMe) { try { e.update(dt); } catch (err) { console.error('[boss] update', err); } } continue; }
      if (e.dead) continue;
      this._updateEnemy(e, dt);
    }
    this._collide(dt);
    this._worldPass(dt);
    this._hazardPass(dt);
    this._contactPass(dt);
    for (let i = this._lingering.length - 1; i >= 0; i--) {
      const h = this._lingering[i];
      h.t -= dt;
      if (h.t <= 0) { this._removeHazard(h); this._lingering.splice(i, 1); }
    }
    for (const e of list) if (!e.isBoss && !e.dead) this._publish(e);
    // compact (no allocation)
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.isBoss ? e.removeMe : e.dead) {
        if (e.isBoss) { try { e.dispose(); } catch { /* */ } if (this.boss === e) this.boss = null; }
        continue;
      }
      list[w++] = e;
    }
    list.length = w;
    this._render(dt);
  }

  _fr(x, z) {
    const w = this.G.world;
    if (!w?.frictionAt) return 1;
    try { const f = w.frictionAt(x, z); return f > 0 ? f : 1; } catch { return 1; }
  }

  _publish(e) {
    const sm = !e.dead && !e.treasure && !e.portal && e.fall <= 0 && (e.dizzyT > 0 || e.tiredT > 0 || e.freezeT > 0);
    e.smashable = sm;
    let st;
    if (e.dead || e.fall > 0) st = 'dying';
    else if (e.portal) st = 'portal';
    else if (e.proj) st = 'knocked';
    else if (e.dizzyT > 0 || e.freezeT > 0) st = 'dizzy';
    else if (e.tiredT > 0) st = 'tired';
    else if (e.type === 'beamer') st = e.phase === 'tele' ? 'windup' : e.phase === 'sweep' ? 'charge' : 'chase';
    else st = e.ai === 'sleep' ? 'sleep' : e.ai === 'windup' ? 'windup' : e.ai === 'charge' ? 'charge' : e.ai === 'circle' ? 'circle' : 'chase';
    e.state = st;
    e.harmful = !sm && !e.dead && !e.portal && !e.treasure && e.fall <= 0 && !e.proj && e.stunT <= 0 && e.ai !== 'sleep' && e.grounded !== false;
  }

  _updateEnemy(e, dt) {
    e.t += dt;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 3);
    if (e.immuneT > 0) e.immuneT -= dt;
    if (e.hazCd > 0) e.hazCd -= dt;
    if (e.bowlCd > 0) e.bowlCd -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowMult = 1; }
    // squash & stretch spring (k≈320, damping≈16)
    e.sqV += ((1 - e.sq) * 320 - e.sqV * 16) * dt;
    e.sq = clamp(e.sq + e.sqV * dt, 0.55, 1.5);
    if (e.rain && e.rain.landT > 0) { e.rain.landT -= dt; if (e.rain.landT <= 0 && e.rain.hz) { this._removeHazard(e.rain.hz); e.rain.hz = null; } }

    if (e.portal) { this._updatePortal(e, dt); return; }
    if (e.fall > 0) { this._updateFall(e, dt); return; }
    if (!e.grounded) {                               // popped minis / airborne
      e.vy -= TUNE.gravity * dt; e.y += e.vy * dt;
      const by = this._baseY(e);
      if (e.y <= by) { e.y = by; e.grounded = true; e.dropping = false; e.sq = 0.72; e.vy = 0; }
    }
    if (e.freezeT > 0) { e.freezeT -= dt; e.vx = e.vz = 0; return; }
    if (e.stunT > 0) e.stunT -= dt;
    if (e.dizzyT > 0) {
      e.dizzyT -= dt;
      if (e.dizzyT <= 0) {
        e.dizzyT = 0; e.immuneT = D.bonk.immunity ?? TUNE.bonkImmune; e.sq = 1.25;
        if (e.type === 'beamer') { e.phase = 'idle'; e.phT = 0; e.cd = e.def.cooldown; }
        if (e.type === 'bruiser') e.pips = 0;
      }
    }
    if (e.tiredT > 0 && e.type !== 'beamer') {
      e.tiredT -= dt;
      if (e.tiredT <= 0) { e.tiredT = 0; e.ai = 'chase'; e.cd = e.def.cooldown ?? 3; e.immuneT = TUNE.bonkImmune * 0.5; e.sq = 1.2; }
    }
    if (e.type === 'popper' && e.armed && (e.fuseLit || e.dizzyT <= 0)) {
      e.fuse -= dt;
      if (e.fuse <= 0) { this._explode(e); return; }
    }
    if (e.type === 'beamer') { this._beamer(e, dt); e.vx = e.vz = 0; return; }

    const fr = this._fr(e.x, e.z);
    if (e.proj) {
      let sp = len2(e.vx, e.vz);
      const nsp = Math.max(0, sp - D.knock.friction * fr * dt);
      if (sp > 1e-4) { e.vx *= nsp / sp; e.vz *= nsp / sp; }
      if (nsp < TUNE.projEnd) { e.proj = false; e.hops = 0; }
      if (sp > 1) e.rotY = turnTo(e.rotY, Math.atan2(-e.vx, -e.vz), 10 * dt);   // looks back where it came from
    } else if (e.dizzyT > 0 || e.tiredT > 0 || e.stunT > 0) {
      let sp = len2(e.vx, e.vz);
      const nsp = Math.max(0, sp - TUNE.dizzyFriction * fr * dt);
      if (sp > 1e-4) { e.vx *= nsp / sp; e.vz *= nsp / sp; }
      const pas = this.run?.heroDef?.passive;
      if (TUNE.heroPassives && pas?.id === 'starlight' && e.dizzyT > 0 && this.player) {
        const p = this.player, dx = p.x - e.x, dz = p.z - e.z, d = len2(dx, dz);
        if (d < 3 && d > 0.9) { e.x += dx / d * (pas.drift ?? 2) * dt; e.z += dz / d * (pas.drift ?? 2) * dt; }
      }
      if (e.ai === 'windup' && e.type === 'zippy') e.ai = 'chase';
    } else {
      this._ai(e, dt, fr);
    }
    if (e.pullT > 0) {                                  // gravity well / black hole
      e.pullT -= dt;
      const dx = e.pullX - e.x, dz = e.pullZ - e.z, d = len2(dx, dz) || 1;
      const s = e.pullS * Math.min(1, d / 0.8);
      e.vx += (dx / d * s - e.vx) * Math.min(1, dt * 6) + (-dz / d) * e.pullOrbit * dt * 6;
      e.vz += (dz / d * s - e.vz) * Math.min(1, dt * 6) + (dx / d) * e.pullOrbit * dt * 6;
    }
    const tm = e.slowT > 0 ? e.slowMult : 1;
    e.x += e.vx * dt * tm; e.z += e.vz * dt * tm;
  }

  _baseY(e) { return e.stationary ? 0.42 : 0; }

  _updatePortal(e, dt) {
    if (e.rain) e.rain.t += dt;
    if (!e.dropping) {
      e.portalT -= dt;
      if (e.portalT <= 0) {
        e.dropping = true; e.y = TUNE.dropHeight; e.vy = 0; e.grounded = false;
        if (!e.rain) this._emit('enemy:spawn', { x: e.x, z: e.z, type: e.type, size: e.size, color: e.color, elite: e.elite });
      }
      return;
    }
    e.vy -= TUNE.gravity * dt; e.y += e.vy * dt;
    const by = this._baseY(e);
    if (e.y <= by) {
      e.y = by; e.vy = 0; e.grounded = true; e.dropping = false; e.portal = false;
      e.sq = 0.6; e.sqV = 0;
      this._fx('dust', e.x, 0.1, e.z, { count: 6, size: e.size });
      if (e.rain) {
        const h = e.rain.hz;
        if (h) { h.active = true; h.srcX = e.x; h.srcZ = e.z; e.rain.landT = 0.12; }
        this._emit('enemy:spawn', { x: e.x, z: e.z, type: e.type, size: e.size, color: e.color, rain: true });
        this._emit('enemy:land', { x: e.x, z: e.z, radius: e.rain.radius });
        this.dizzy(e, e.rain.dizzy, 'rain');
        this._shake(0.08, 0.12);
      } else if (e.ai === 'sleep') e.sq = 0.75;
      this._publish(e);
    }
  }

  _updateFall(e, dt) {
    e.fall += dt; e.vy -= TUNE.gravity * 0.6 * dt; e.y += e.vy * dt;
    e.x += e.vx * dt * 0.4; e.z += e.vz * dt * 0.4;
    if (e.fall > TUNE.fallTime) {
      if (e.treasure) { this._emit('enemy:escape', { x: e.x, z: e.z, type: e.type }); this._kill(e); }
      else this.smash(e, { force: true, byFall: true, noSplit: true });
    }
  }

  // ---------- aggression tokens ----------
  _assignTokens() {
    const p = this.player, arr = this._sorted;
    arr.length = 0;
    const base = this.G.world?.theme?.tokens ?? DATA.worlds[this.worldIndex]?.tokens ?? 3;
    const N = Math.max(1, base + (this.run?.guardian?.tokensDelta ?? 0) + this.tokenBonus);
    for (const e of this.list) {
      if (e.dead || e.isBoss || !TOKEN_TYPES[e.type]) continue;
      if (e.pairId) { e.token = true; continue; }
      if (e.portal || e.ai === 'sleep' || e.dizzyT > 0 || e.proj || e.freezeT > 0 || (e.type === 'popper' && e.armed)) { e.token = e.type === 'popper' && e.armed; continue; }
      e._td = p ? len2(e.x - p.x, e.z - p.z) - (e.token ? TUNE.tokenHysteresis : 0) : 0;
      arr.push(e);
    }
    arr.sort(byTd);
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i], had = e.token;
      e.token = i < N;
      if (had && !e.token && p) { e.circA = Math.atan2(e.x - p.x, e.z - p.z); }
    }
    arr.length = 0;
  }

  // ---------- AI ----------
  _ai(e, dt, fr) {
    switch (e.type) {
      case 'zippy': return this._zippy(e, dt, fr);
      case 'popper': return this._popper(e, dt, fr);
      case 'coin': return this._coin(e, dt, fr);
      default: return this._chaser(e, dt, fr);
    }
  }

  /** steering with inertia: turn-rate cap + accel; ice lowers grip so cubes slide */
  _steer(e, tx, tz, speed, dt, fr) {
    const dx = tx - e.x, dz = tz - e.z, d = len2(dx, dz);
    if (d > 0.05) {
      const want = Math.atan2(dx, dz);
      const diff = angDiff(e.heading, want);
      const maxTurn = e.turn * DEG * dt * (e.spd < speed * 0.3 ? 2.2 : 1);
      e.heading += clamp(diff, -maxTurn, maxTurn);
      const brake = Math.abs(diff) > 1.75 ? 0.45 : 1;          // hard juke → overshoot & bleed speed
      const target = speed * brake * (d < 0.5 ? d / 0.5 : 1);
      e.spd += clamp(target - e.spd, -e.accel * 1.6 * dt, e.accel * dt);
    } else e.spd = Math.max(0, e.spd - e.accel * dt);
    const tvx = Math.sin(e.heading) * e.spd, tvz = Math.cos(e.heading) * e.spd;
    const g = clamp(dt * 10 * fr, 0, 1);
    e.vx += (tvx - e.vx) * g; e.vz += (tvz - e.vz) * g;
    e.rotY = turnTo(e.rotY, e.heading, 9 * dt);
  }

  _mate(e) {
    for (const o of this.list) if (o !== e && !o.dead && o.pairId === e.pairId && !o.portal) return o;
    return null;
  }

  _chaser(e, dt, fr) {
    const p = this.player;
    const spd = e.maxSpeed * this._speedMult();
    if (e.ai === 'sleep') {
      e.vx *= Math.max(0, 1 - 8 * dt); e.vz *= Math.max(0, 1 - 8 * dt);
      if (p && len2(p.x - e.x, p.z - e.z) < TUNE.sleepWake) this._wake(e);
      return;
    }
    if (!p) { this._steer(e, 0, 0, spd * 0.4, dt, fr); return; }
    let tx = p.x, tz = p.z, sp = spd;
    if (TOKEN_TYPES[e.type] && !e.token && !e.pairId) {
      e.ai = 'circle';
      e.circA += e.circDir * (spd * TUNE.circle.speedK / e.circR) * dt;
      tx = p.x + Math.sin(e.circA) * e.circR; tz = p.z + Math.cos(e.circA) * e.circR;
      const R = this.R - 1.2, tl = len2(tx, tz);
      if (tl > R) { tx *= R / tl; tz *= R / tl; }
      const off = len2(tx - e.x, tz - e.z);
      sp = spd * TUNE.circle.speedK * (off > 3 ? 1.35 : 1);
    } else {
      e.ai = 'chase';
      if (e.pairId && e.steer > 0) {                  // 1-1 tutorial: bias the pair toward each other
        const m = this._mate(e);
        if (m) {
          const ax = p.x - e.x, az = p.z - e.z, al = len2(ax, az) || 1;
          const bx = m.x - e.x, bz = m.z - e.z, bl = len2(bx, bz) || 1;
          const k = clamp(e.steer, 0, 1);
          tx = e.x + (ax / al * (1 - k) + bx / bl * k) * 4;
          tz = e.z + (az / al * (1 - k) + bz / bl * k) * 4;
        }
      }
    }
    this._steer(e, tx, tz, sp, dt, fr);
  }

  _los(e, p) {
    const dx = p.x - e.x, dz = p.z - e.z, L = len2(dx, dz) || 1, ux = dx / L, uz = dz / L;
    for (const o of this.list) {
      if (o === e || o.dead || o.portal || !(o.isBoss || o.type === 'bruiser' || o.stationary)) continue;
      const px = o.x - e.x, pz = o.z - e.z, t = px * ux + pz * uz;
      if (t < 0 || t > L) continue;
      if (len2(px - ux * t, pz - uz * t) < o.radius * 0.9) return false;
    }
    return true;
  }

  _zippy(e, dt, fr) {
    const p = this.player, def = e.def;
    if (e.ai === 'windup') {
      e.wT += dt;
      const k = Math.max(0, 1 - 10 * dt); e.vx *= k; e.vz *= k;
      if (p && e.wT < e.wDur * 0.72) {
        const dx = p.x - e.x, dz = p.z - e.z, d = len2(dx, dz) || 1;
        e.cdx = dx / d; e.cdz = dz / d;
      }
      e.rotY = turnTo(e.rotY, Math.atan2(e.cdx, e.cdz), 14 * dt);
      e.heading = e.rotY;
      const back = TUNE.zippyBackUp / Math.max(0.2, e.wDur);          // kid rule 9: backs up 0.3 u
      e.x -= e.cdx * back * dt; e.z -= e.cdz * back * dt;
      e.sq = Math.min(e.sq, 1 - 0.14 * clamp(e.wT / e.wDur, 0, 1));
      if (e.wT >= e.wDur) {
        e.ai = 'charge';
        e.chargeLeft = Math.min(def.chargeDist, rayToRim(e.x, e.z, e.cdx, e.cdz, this.R - e.size * 0.5) + 0.2);
        e.sq = 1.35;
        if (e.hz) { e.hz.active = true; e.hz.srcX = e.x; e.hz.srcZ = e.z; }
        this._emit('enemy:charge', { x: e.x, z: e.z, type: 'zippy', dirX: e.cdx, dirZ: e.cdz });
      }
      return;
    }
    if (e.ai === 'charge') {
      const cs = def.chargeSpeed * this._speedMult();
      e.vx = e.cdx * cs; e.vz = e.cdz * cs;
      e.rotY = Math.atan2(e.cdx, e.cdz);
      e.chargeLeft -= cs * dt;
      if (e.hz) { e.hz.srcX = e.x - e.cdx; e.hz.srcZ = e.z - e.cdz; }
      if (e.chargeLeft <= 0) this._zippyTire(e);
      return;
    }
    e.ai = 'chase';
    e.cd -= dt;
    if (!p) return this._steer(e, 0, 0, e.maxSpeed * 0.4, dt, fr);
    const dx = p.x - e.x, dz = p.z - e.z, d = len2(dx, dz);
    if (e.cd <= 0 && d < def.triggerRange && d > 1.8 && this._los(e, p)) {
      e.ai = 'windup'; e.wT = 0;
      e.wDur = (this.worldIndex >= 2 ? def.windupLate : def.windup) * this.teleMult;
      e.cdx = dx / d; e.cdz = dz / d;
      this._emit('enemy:windup', { x: e.x, z: e.z, type: 'zippy', dirX: e.cdx, dirZ: e.cdz, time: e.wDur });
      return;
    }
    this._steer(e, p.x, p.z, e.maxSpeed * this._speedMult(), dt, fr);
  }

  _zippyStop(e, vx = 0, vz = 0) {
    e.ai = 'chase'; e.chargeLeft = 0; e.cd = e.def.cooldown ?? 3.5;
    if (e.hz) e.hz.active = false;
    e.vx = vx; e.vz = vz; e.sq = 0.7;
  }
  _zippyTire(e) {
    e.ai = 'tired'; e.tiredT = e.def.tired; e.chargeLeft = 0;
    if (e.hz) e.hz.active = false;
    e.vx *= 0.25; e.vz *= 0.25; e.sq = 0.7;
    this._emit('enemy:tired', { x: e.x, z: e.z, type: e.type });
    this._publish(e);
  }

  _popper(e, dt, fr) {
    const p = this.player;
    if (e.armed) {
      e.ai = 'windup';
      if (p && !e.fuseLit) this._steer(e, p.x, p.z, e.maxSpeed * this._speedMult() * 0.45, dt, fr);
      else { const k = Math.max(0, 1 - 4 * dt); e.vx *= k; e.vz *= k; }
      return;
    }
    if (p && e.ai !== 'sleep' && len2(p.x - e.x, p.z - e.z) < e.def.armRange) {
      e.armed = true; e.fuse = e.fuseMax = e.def.fuse * this.teleMult; e.ai = 'windup';
      this._emit('enemy:windup', { x: e.x, z: e.z, type: 'popper', dirX: 0, dirZ: 0, fuse: e.fuse });
      return;
    }
    this._chaser(e, dt, fr);
  }

  _coin(e, dt, fr) {
    e.life -= dt;
    if (e.life <= 0) {
      this._emit('enemy:escape', { x: e.x, z: e.z, type: 'coin' });
      this._fx('sparks', e.x, 0.6, e.z, { color: COL.crown, count: 16 });
      this._kill(e);
      return;
    }
    const p = this.player, R = this.R;
    let fx = -e.x * 0.08, fz = -e.z * 0.08;
    if (p) {
      const dx = e.x - p.x, dz = e.z - p.z, d = len2(dx, dz) || 1;
      const w = 0.35 + clamp(1 - d / 8, 0, 1) * 2.2;
      fx += dx / d * w; fz += dz / d * w;
    }
    const r = len2(e.x, e.z);
    if (r > R * 0.62 && r > 0.01) {                  // slide along the rim instead of hugging it
      const tx = -e.z / r, tz = e.x / r, s = (tx * fx + tz * fz) >= 0 ? 1 : -1;
      const k = clamp((r - R * 0.62) / (R * 0.3), 0, 1);
      fx += (tx * s * 1.6 - e.x / r * 1.4) * k; fz += (tz * s * 1.6 - e.z / r * 1.4) * k;
    }
    this._steer(e, e.x + fx * 2, e.z + fz * 2, e.maxSpeed * (p ? 1 : 0.5), dt, fr);
    e.rotY = turnTo(e.rotY, p ? Math.atan2(p.x - e.x, p.z - e.z) : e.heading, 6 * dt);   // laughs at you while fleeing
  }

  _beamer(e, dt) {
    const def = e.def, p = this.player;
    e.beamLen = Math.min(def.beamLength, rayToRim(e.x, e.z, Math.sin(e.beamA), Math.cos(e.beamA), this.R));
    if (e.dizzyT > 0) { e.phase = 'hot'; if (e.hz) e.hz.active = false; return; }
    e.phT += dt;
    switch (e.phase) {
      case 'idle': {
        if (p) e.rotY = turnTo(e.rotY, Math.atan2(p.x - e.x, p.z - e.z), TUNE.beamerTurn * DEG * dt);
        e.beamA = e.rotY;
        if (e.phT >= e.cd) {
          e.phase = 'tele'; e.phT = 0;
          const center = p ? Math.atan2(p.x - e.x, p.z - e.z) : e.rotY;
          e.beamSign = -e.beamSign || 1;
          e.beamA0 = center - e.beamSign * def.sweepDeg * DEG * 0.5;
          e.beamA = e.beamA0;
          this._emit('enemy:windup', { x: e.x, z: e.z, type: 'beamer', dirX: Math.sin(e.beamA), dirZ: Math.cos(e.beamA), time: def.telegraph * this.teleMult });
        }
        break;
      }
      case 'tele':
        e.beamA = e.beamA0;
        e.rotY = turnTo(e.rotY, e.beamA, 10 * dt);
        if (e.phT >= def.telegraph * this.teleMult) {
          e.phase = 'sweep'; e.phT = 0;
          if (e.hz) { e.hz.active = true; e.hz.srcX = e.x; e.hz.srcZ = e.z; }
          this._emit('enemy:beam', { x: e.x, z: e.z, type: 'beamer' });
        }
        break;
      case 'sweep': {
        const k = clamp(e.phT / def.sweepTime, 0, 1);
        e.beamA = e.beamA0 + e.beamSign * def.sweepDeg * DEG * k;
        e.rotY = e.beamA;
        if (k >= 1) {
          e.phase = 'hot'; e.phT = 0; e.tiredT = def.overheat;
          if (e.hz) e.hz.active = false;
          this._emit('enemy:overheat', { x: e.x, z: e.z, type: 'beamer' });
          this._publish(e);
        }
        break;
      }
      case 'hot':
        if (e.tiredT > 0) {
          e.tiredT -= dt;
          if (Math.floor(e.t * 4) !== Math.floor((e.t - dt) * 4)) this._fx('dust', e.x, 1.6, e.z, { color: 0xffffff, count: 2, size: 0.5 });
        }
        if (e.tiredT <= 0) { e.tiredT = 0; e.phase = 'idle'; e.phT = 0; e.cd = def.cooldown; }
        break;
    }
  }

  // ─────────────── collisions: separation · BONK · billiards ───────────────
  _solid(e) {
    if (e.dead || e.portal) return false;
    if (e.isBoss) return e.solid !== false;
    return e.fall <= 0 && e.grounded !== false && e.y < 1.2;
  }

  _collide() {
    const L = this.list, n = L.length;
    for (let i = 0; i < n; i++) {
      const a = L[i];
      if (!this._solid(a)) continue;
      for (let j = i + 1; j < n; j++) {
        const b = L[j];
        if (!this._solid(b)) continue;
        let dx = b.x - a.x, dz = b.z - a.z;
        const rs = a.radius + b.radius, d2 = dx * dx + dz * dz;
        if (d2 >= rs * rs) continue;
        let d = Math.sqrt(d2);
        if (d < 1e-4) { dx = rand() - 0.5; dz = rand() - 0.5; d = len2(dx, dz) || 1; }
        const nx = dx / d, nz = dz / d, overlap = rs - d;
        if (a.isBoss || b.isBoss) {
          if (a.isBoss && b.isBoss) continue;
          if (a.isBoss) this._bossContact(a, b, nx, nz, overlap); else this._bossContact(b, a, -nx, -nz, overlap);
          continue;
        }
        this._pair(a, b, nx, nz, overlap);
      }
    }
  }

  _canBonk(e) {
    return !e.proj && e.dizzyT <= 0 && e.tiredT <= 0 && e.immuneT <= 0 && e.ai !== 'sleep' && !e.stationary && !e.treasure && e.type !== 'bruiser' && e.freezeT <= 0;
  }

  _pair(a, b, nx, nz, overlap) {
    const sa = len2(a.vx, a.vz), sb = len2(b.vx, b.vz);
    const aP = a.proj && sa > 0.5, bP = b.proj && sb > 0.5;   // kid rule 5: a knocked cube always bonks
    const zA = a.type === 'zippy' && a.ai === 'charge', zB = b.type === 'zippy' && b.ai === 'charge';
    if (aP || bP) {
      if (aP && (!bP || sa >= sb)) this._impact(a, b, nx, nz, sa); else this._impact(b, a, -nx, -nz, sb);
    } else if (zA || zB) {
      if (zA) this._zippyHit(a, b, nx, nz); else this._zippyHit(b, a, -nx, -nz);
    } else {
      const bowlA = a.type === 'bruiser' && a.dizzyT <= 0 && b.mass < a.mass && !b.stationary && b.bowlCd <= 0 && sa > 0.6;
      const bowlB = b.type === 'bruiser' && b.dizzyT <= 0 && a.mass < b.mass && !a.stationary && a.bowlCd <= 0 && sb > 0.6;
      if (bowlA) this._bowl(a, b, nx, nz);
      else if (bowlB) this._bowl(b, a, -nx, -nz);
      else {
        const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        const pair = a.pairId && a.pairId === b.pairId;
        const pulled = a.pullT > 0 || b.pullT > 0;
        const need = pair ? TUNE.tutorialBonkSpeed : pulled ? TUNE.pulledBonkSpeed : D.bonk.headOnSpeed;
        if (closing >= need && this._canBonk(a) && this._canBonk(b)) this._bonk(a, b, closing, { headOn: true, tutorial: !!pair });
      }
    }
    // soft separation (mass-weighted; stationary pylons are immovable)
    const ma = a.stationary ? 1e6 : a.mass, mb = b.stationary ? 1e6 : b.mass, tot = ma + mb;
    const k = overlap * TUNE.sepK;
    a.x -= nx * k * (mb / tot); a.z -= nz * k * (mb / tot);
    b.x += nx * k * (ma / tot); b.z += nz * k * (ma / tot);
    if (!a.proj && !b.proj) {
      const rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rv > 0) {
        const imp = rv * 0.5;
        if (!a.stationary) { a.vx -= nx * imp * (mb / tot) * 2; a.vz -= nz * imp * (mb / tot) * 2; }
        if (!b.stationary) { b.vx += nx * imp * (ma / tot) * 2; b.vz += nz * imp * (ma / tot) * 2; }
      }
    }
  }

  /** knocked cube s (speed sp, normal n from s → t) hits cube t → BONK + billiards hop */
  _impact(s, t, nx, nz, sp) {
    const cm = this.cardMods;
    const vn = s.vx * nx + s.vz * nz;
    if (t.treasure) { this.knock(t, nx, nz, sp * 0.8); s.vx *= 0.5; s.vz *= 0.5; return; }
    if (t.smashable && cm.pinball && !t.portal) {           // Pinball Storm: impacts smash dizzy cubes
      this.smash(t, { dirX: nx, dirZ: nz, pinball: true });
      s.vx *= 0.85; s.vz *= 0.85;
      return;
    }
    if (t.type === 'bruiser' && t.dizzyT <= 0 && t.tiredT <= 0) {
      this._armorHit(t, 'knock');
      if (vn > 0) { s.vx -= nx * vn * 1.6; s.vz -= nz * vn * 1.6; }
      s.hops--;
      this.dizzy(s, D.bonk.dizzy, 'bonk');
      this._emitBonk((s.x + t.x) / 2, (s.z + t.z) / 2, sp, { byKnock: true, bruiser: true, byPlayer: s.byPlayer });
      return;
    }
    if (t.stationary) {
      this.dizzy(t, D.bonk.dizzy, 'bonk');
      if (vn > 0) { s.vx -= nx * vn * 1.6; s.vz -= nz * vn * 1.6; }
      s.hops--;
      this._bonk(s, t, sp, { byKnock: true });
      return;
    }
    const hops = s.hops;
    if (hops > 0) {
      const ratio = clamp(Math.sqrt(s.mass / Math.max(0.3, t.mass)), 0.6, 1.4);
      const wasProj = t.proj;
      this.knock(t, nx, nz, sp * D.knock.chainFactor * ratio, { hops: hops - 1, chain: true });
      t.byPlayer = s.byPlayer || wasProj && t.byPlayer;
    } else {
      t.vx += nx * 2.5; t.vz += nz * 2.5;
    }
    if (vn > 0) { s.vx -= nx * vn * 0.85; s.vz -= nz * vn * 0.85; }
    s.hops = hops - 1;
    this._bonk(s, t, sp, { byKnock: true, byPlayer: s.byPlayer });
  }

  _bonk(a, b, strength, info = {}) {
    if (a._bonkId === b.id && this.time - a._bonkT < (D.bonk.pairCooldown ?? 1.5)) return;
    a._bonkId = b.id; a._bonkT = this.time; b._bonkId = a.id; b._bonkT = this.time;
    const sec = D.bonk.dizzy;
    const da = this.dizzy(a, sec, 'bonk'), db = this.dizzy(b, sec, 'bonk');
    a.sq = Math.min(a.sq, 0.7); b.sq = Math.min(b.sq, 0.7);
    a.flash = Math.max(a.flash, 0.5); b.flash = Math.max(b.flash, 0.5);
    if (!da && !db && !info.byKnock) return;
    this._emitBonk((a.x + b.x) / 2, (a.z + b.z) / 2, strength, { ...info, dizzied: (da ? 1 : 0) + (db ? 1 : 0) });
  }

  _emitBonk(x, z, strength, extra = {}) {
    const ice = this._fr(x, z) < 1;
    this._emit('enemy:bonk', { x, z, strength, ice, ...extra });
    const b = this.boss;
    if (b && !b.dead && !extra.noStagger && len2(b.x - x, b.z - z) < b.radius + 3) b.addStagger?.(DATA.boss.stagger.bonkNear, 'bonk');
    if (TUNE.driveShake && this._hitStopFrame !== this._frame) {
      this._hitStopFrame = this._frame;
      try { this.G.hitStop?.(D.hitstop.bonk); } catch { /* */ }
    }
    this._shake(D.shake.bonk, 0.15);
  }

  _zippyHit(zp, o, nx, nz) {
    if (o._zipHit === zp.id && this.time - o._zipT < 0.5) return;
    o._zipHit = zp.id; o._zipT = this.time;
    if (o.treasure) { this.knock(o, nx, nz, TUNE.zippyHitSpeed); return; }
    const big = zp.def.bigBonk ?? D.bonk.dizzy;
    if (o.type === 'bruiser') this._armorHit(o, 'charge');
    else if (o.stationary) this.dizzy(o, big, 'charge');
    else {
      const px = -zp.cdz, pz = zp.cdx, side = (px * nx + pz * nz) >= 0 ? 1 : -1;
      this.knock(o, nx * 0.6 + px * side * 0.8, nz * 0.6 + pz * side * 0.8, TUNE.zippyHitSpeed, { hops: 1 });
      if (!o.dead) this.dizzy(o, big, 'charge');
    }
    this._zippyStop(zp, -nx * 2.5, -nz * 2.5);
    this.dizzy(zp, big, 'charge');
    this._emitBonk((zp.x + o.x) / 2, (zp.z + o.z) / 2, 10, { byZippy: true, big: true });
  }

  _bowl(br, o, nx, nz) {
    o.bowlCd = TUNE.bowlCd;
    const hx = Math.sin(br.heading), hz = Math.cos(br.heading);
    const px = -hz, pz = hx, side = (px * nx + pz * nz) >= 0 ? 1 : -1;
    this.knock(o, nx * 0.5 + px * side, nz * 0.5 + pz * side, TUNE.bowlSpeed, { hops: 1 });
    this._emit('enemy:bowl', { x: o.x, z: o.z });
  }

  /** boss B vs cube o (n from boss → cube). Boss is immovable. */
  _bossContact(B, o, nx, nz, overlap) {
    const sp = len2(o.vx, o.vz);
    if (B.charging) {
      if (o.treasure) this.knock(o, nx, nz, 12);
      else if (o.type === 'bruiser') this._armorHit(o, 'charge');
      else if (!o.stationary && o._ramT !== B.moveId) {
        o._ramT = B.moveId;
        this.knock(o, nx + B.dirX * 0.4, nz + B.dirZ * 0.4, 12, { hops: 1 });
        this.dizzy(o, D.bonk.dizzy, 'charge');
      }
    } else if (o.proj && sp > 0.5 && o._bossHit !== o._bonkT + ':' + o.hops) {
      o._bossHit = o._bonkT + ':' + o.hops;
      B.addStagger?.(DATA.boss.stagger.knockedCube, 'cube');
      const vn = o.vx * nx + o.vz * nz;
      if (vn < 0) { o.vx -= nx * vn * 1.7; o.vz -= nz * vn * 1.7; }
      o.hops = 0;
      this.dizzy(o, D.bonk.dizzy, 'bonk');
      B.flashHit?.();
      this._emitBonk(B.x + nx * B.radius, B.z + nz * B.radius, sp, { boss: true, byKnock: true, noStagger: true, byPlayer: o.byPlayer });
    }
    o.x += nx * overlap; o.z += nz * overlap;
  }

  // ─────────────── arena rim & world gimmicks ───────────────
  _worldPass(dt) {
    const R = this.R, w = this.G.world, cm = this.cardMods, push = this._push;
    for (const e of this.list) {
      if (e.dead || e.isBoss || e.portal || e.fall > 0) continue;
      if (w) {
        if (!e.stationary && e.grounded && w.pushAt) {
          push.x = 0; push.z = 0;
          try { w.pushAt(e.x, e.z, push); } catch { push.x = push.z = 0; }
          e.x += (push.x || 0) * dt; e.z += (push.z || 0) * dt;
        }
        if (w.bumperHit) {
          let h = null;
          try { h = w.bumperHit(e.x, e.z, e.radius); } catch { h = null; }
          if (h) this._bumper(e, h);
        }
        if (w.solidAt && e.grounded && !e.stationary) {
          let solid = true;
          try { solid = w.solidAt(e.x, e.z) !== false; } catch { solid = true; }
          if (!solid) { e.fall = 1e-4; e.proj = false; e.vy = 0; e.grounded = false; this._emit('enemy:fall', { x: e.x, z: e.z, type: e.type }); continue; }
        }
      }
      const d = len2(e.x, e.z), lim = R - e.size * 0.5;
      if (d > lim && d > 1e-4) {
        const nx = e.x / d, nz = e.z / d, vn = e.vx * nx + e.vz * nz, sp = len2(e.vx, e.vz);
        if (e.proj && vn > 0) {
          const bounce = cm.rimBounce || TUNE.rimBounceBase;
          e.vx -= (1 + bounce) * vn * nx; e.vz -= (1 + bounce) * vn * nz;
          e.hops--;
          this.dizzy(e, D.bonk.rimDizzy + (cm.rimBounce ? 1 : 0), 'rim');
          e.sq = 0.7;
          this._emitBonk(nx * R, nz * R, sp, { rim: true, byKnock: true, byPlayer: e.byPlayer });
          if (cm.pinball) { try { w?.pulseRim?.(0xffd84a); } catch { /* */ } }
        } else if (vn > 0) { e.vx -= vn * nx; e.vz -= vn * nz; }
        if (e.type === 'zippy' && e.ai === 'charge') {   // kid rule 9: Zippy into the rim = dizzy 3 s
          this._zippyStop(e, -nx * 2, -nz * 2);
          this.dizzy(e, e.def.rimDizzy ?? D.bonk.rimDizzy, 'rim');
          this._emitBonk(nx * R, nz * R, e.def.chargeSpeed, { rim: true, byZippy: true });
        }
        e.x = nx * lim; e.z = nz * lim;
      }
    }
  }

  _bumper(e, h) {
    let nx = h.nx ?? 0, nz = h.nz ?? 0;
    const b = h.bumper;
    if (b && typeof b.x === 'number' && typeof b.r === 'number') {
      const dx = e.x - b.x, dz = e.z - b.z, d = len2(dx, dz) || 1;
      nx = dx / d; nz = dz / d;
      e.x = b.x + nx * (b.r + e.radius + 0.01); e.z = b.z + nz * (b.r + e.radius + 0.01);
    } else { e.x += nx * 0.12; e.z += nz * 0.12; }
    const vn = e.vx * nx + e.vz * nz, sp = len2(e.vx, e.vz);
    if (vn >= 0) return;
    if (e.proj && sp > 0.5) {
      e.vx -= (1 + TUNE.bumperBounce) * vn * nx; e.vz -= (1 + TUNE.bumperBounce) * vn * nz;
      e.hops--;
      this.dizzy(e, D.bonk.rimDizzy, 'bumper');
      e.sq = 0.7;
      this._emitBonk(e.x - nx * e.radius, e.z - nz * e.radius, sp, { bumper: true, byKnock: true, byPlayer: e.byPlayer, bumperRef: b || null });
    } else { e.vx -= vn * nx; e.vz -= vn * nz; }
    if (e.type === 'zippy' && e.ai === 'charge') { this._zippyStop(e, nx * 2, nz * 2); this.dizzy(e, e.def.rimDizzy ?? D.bonk.rimDizzy, 'bumper'); }
  }

  // ─────────────── hazards that dizzy red cubes (lasers, rings, mines…) ───────────────
  _hazardPass() {
    const hz = this.run?.hazards;
    if (!hz || !hz.length) return;
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      if (!h || !h.active || !h.dizzies || h.noAutoDizzy || typeof h.test !== 'function') continue;
      const src = h.kind === 'beam' || h.kind === 'laser' ? 'laser' : (h.kind || 'hazard');
      for (const e of this.list) {
        if (e.dead || e.isBoss || e.portal || e.hazCd > 0 || e === h.e || e.treasure) continue;
        let hit = false;
        try { hit = h.test(e.x, e.z, e.radius); } catch { hit = false; }
        if (!hit) continue;
        e.hazCd = TUNE.hazardDizzyCd;
        this.dizzy(e, h.dizzySeconds ?? TUNE.hazardDizzy, src);
      }
    }
  }

  // ─────────────── contact with the hero ───────────────
  _contactPass(dt) {
    const p = this.player;
    if (!p || typeof this.run?.playerCtl?.resolve === 'function') return;   // player.js owns hero contact + nudges
    const hr = p.hurtRadius ?? D.player.hurtRadius;
    const body = (p.size ?? 1) * 0.45;
    let hurt = false;
    for (const e of this.list) {
      if (e.dead || e.isBoss || e.portal || e.fall > 0 || e.grounded === false) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = len2(dx, dz) || 1e-4;
      if (e.harmful) {
        if (!hurt && TUNE.contactDamage && !p.invuln && !p.dashing && d < e.radius * 0.92 + hr && this.run?.hurtPlayer) {
          try { hurt = !!this.run.hurtPlayer(e.hearts || 1, e.x, e.z, e.type); } catch { hurt = false; }
          if (hurt) { e.flash = 0.6; e.spd *= 0.2; if (!e.stationary) { e.vx = dx / d * 2.5; e.vz = dz / d * 2.5; } }
        }
      } else if (!p.dashing && !e.stationary && d < e.radius + body) {
        const k = e.radius + body - d;                // harmless cubes get nudged by walking into them
        e.x += dx / d * k; e.z += dz / d * k;
        if (e.smashable) { e.vx += dx / d * TUNE.nudgeSpeed * dt * 8; e.vz += dz / d * TUNE.nudgeSpeed * dt * 8; }
      }
    }
  }

  // ─────────────── rendering ───────────────
  _put(A, x, y, z, rotX, rotY, rotZ, sx, sy, sz, color) {
    if (A.n >= A.cap) return;
    this._e.set(rotX, rotY, rotZ, 'YXZ'); this._q.setFromEuler(this._e);
    this._p.set(x, y, z); this._s.set(sx, sy, sz);
    this._m.compose(this._p, this._q, this._s);
    A.mesh.setMatrixAt(A.n, this._m);
    if (color !== undefined) A.mesh.setColorAt(A.n, typeof color === 'number' ? this._col2.setHex(color) : color);
    A.n++;
  }
  /** world position of a local offset (lx right, lz forward) under rotation rot */
  _wx(e, lx, lz, rot) { return e.x + Math.cos(rot) * lx + Math.sin(rot) * lz; }
  _wz(e, lx, lz, rot) { return e.z - Math.sin(rot) * lx + Math.cos(rot) * lz; }

  /** yellow dizzy stars orbiting above (shared by cubes and the boss).
   *  remaining (s): kid rule 6 — one star fades out each second (a countdown without numbers) */
  stars(x, z, y, r, count, scale, ph = 0, remaining = 99) {
    const t = this.G.time?.real ?? this.time, A = this.acc.stars;
    for (let k = 0; k < count; k++) {
      const vis = count === 3 ? clamp(remaining - k, 0, 1) : clamp(remaining * count / 3 - k, 0, 1);
      if (vis <= 0.02) continue;
      const a = t * 4 + ph + (k * TAU) / count, sc = scale * (0.35 + 0.65 * vis);
      this._put(A, x + Math.cos(a) * r, y + Math.sin(t * 6 + k * 2) * 0.06, z + Math.sin(a) * r, 0, -a + t * 3, 0, sc, sc, sc);
    }
  }

  _render(dt) {
    const crowd = this.crowd, sh = this.shadows, dec = this.decals, A = this.acc, o = this._o;
    const t = this.time, tr = this.G.time?.real ?? t;
    const p = this.player;
    dec.begin(tr);
    sh.begin();
    for (const k in A) A[k].n = 0;
    let ci = 0;
    for (const e of this.list) {
      if (e.isBoss) {
        if (e.removeMe) continue;
        try { e.render?.(dt, dec, sh, this); } catch (err) { console.error('[boss] render', err); }
        continue;
      }
      if (e.dead) continue;
      if (e.portal && !e.dropping) {
        if (e.rain) {
          const k = clamp(e.rain.t / e.rain.fall, 0, 1);
          dec.disc(e.x, e.z, e.rain.radius, k, e.rain.fall - e.rain.t < 0.15 ? 1 : 0, 1, 0);
        } else {
          const k = clamp(1 - e.portalT / e.portalMax, 0, 1);
          dec.disc(e.x, e.z, e.size * 0.6 + 0.35, 1, 0, 0.35 + 0.6 * k, 2, 0, e.id * 0.137, 0);
        }
        continue;
      }
      if (e.rain && e.dropping) dec.disc(e.x, e.z, e.rain.radius, clamp(e.rain.t / e.rain.fall, 0, 1), e.rain.fall - e.rain.t < 0.15 ? 1 : 0, 1, 0);
      if (ci >= crowd.capacity) continue;
      const B = BODY[e.type] || BODY.grumpy, s = e.size, smash = e.smashable;
      const sq = e.sq, sxz = 1 / Math.sqrt(Math.max(0.3, sq));
      let bob = 0;
      if (!smash && e.grounded && !e.stationary && e.ai !== 'sleep' && !e.proj && dt > 0) {
        const sp = len2(e.vx, e.vz);
        e.hopPh += dt * (7 + sp * 2.2);
        bob = Math.abs(Math.sin(e.hopPh)) * Math.min(1, sp / 2) * 0.13 * s;
      } else if (!smash && e.grounded && !e.stationary && e.ai !== 'sleep' && !e.proj) {
        bob = Math.abs(Math.sin(e.hopPh)) * Math.min(1, len2(e.vx, e.vz) / 2) * 0.13 * s;
      }
      const baseY = e.y + bob;
      let hY = s * B[1] * sq;
      if (e.ai === 'sleep') hY *= 1 + Math.sin(t * 1.7 + e.wobPh) * 0.035;
      o.x = e.x; o.z = e.z; o.y = baseY + hY * 0.5;
      o.sx = s * B[0] * sxz; o.sy = hY; o.sz = s * B[2] * sxz;
      o.rotY = e.rotY; o.rotX = 0; o.rotZ = 0;
      const rem = Math.max(e.dizzyT, e.tiredT, e.freezeT);
      const warn = smash && e.freezeT <= 0 && rem < (D.bonk.wakeWarn ?? 0.5);
      if (smash) {                                   // ~15° lean + 6 Hz wobble; last 0.5 s: shake = wake-up warning
        o.rotZ = (e.wobPh > Math.PI ? 1 : -1) * TUNE.dizzyTilt + Math.sin(t * TUNE.wobbleHz * TAU + e.wobPh) * 0.08;
        if (warn) { o.rotZ += Math.sin(tr * 44) * TUNE.shakeWarn; o.x += Math.sin(tr * 57) * 0.05; }
      }
      else if (e.proj) o.rotX = -0.22;
      else if (e.ai === 'windup' && e.type === 'zippy') o.rotX = 0.12;
      if (e.fall > 0) { o.rotX = e.fall * 5; o.rotZ = e.fall * 3; }
      this._col.set(e.color);
      if (smash) this._col.lerp(this._tint, TUNE.smashTint);
      o.color = this._col;
      const winding = e.ai === 'windup' || e.ai === 'charge' || e.phase === 'tele' || e.phase === 'sweep';
      o.expr = smash ? (warn ? EXPR.ANGRY : EXPR.DIZZY) : e.ai === 'sleep' ? EXPR.SLEEP : (e.proj || e.stunT > 0) ? EXPR.HURT
        : winding ? EXPR.CHARGE : e.treasure ? EXPR.JOY : EXPR.ANGRY;
      o.blink = o.expr === EXPR.ANGRY && ((e.t + e.wobPh * 3) % 3.7) < 0.1 ? 1 : 0;
      if (p && !smash) {
        const a = Math.atan2(p.x - e.x, p.z - e.z);
        o.lookX = clamp(Math.sin(angDiff(e.rotY, a)) * 1.2, -1, 1);
        o.lookY = -0.25;
      } else { o.lookX = 0; o.lookY = 0; }
      let fl = e.flash * 0.8;
      if (e.type === 'popper' && e.armed) {
        const rate = lerp(2, 8, 1 - clamp(e.fuse / e.fuseMax, 0, 1));
        if (Math.sin(tr * rate * TAU) > 0.4) fl = Math.max(fl, 0.45);
      }
      if (e.tiredT > 0 && e.type === 'beamer') fl = Math.max(fl, 0.1 + 0.1 * Math.sin(tr * 10));
      o.flash = fl;
      o.glow = smash ? 0.2 + 0.15 * Math.sin(tr * 8 + e.wobPh) : e.elite ? 0.12 + 0.08 * Math.sin(tr * 4) : winding ? 0.22 : 0;
      o.opacity = 1;
      crowd.set(ci++, o);
      sh.add(e.x, e.z, s * (e.type === 'beamer' ? 1.2 : 1.05), Math.max(0, e.y - this._baseY(e)));
      this._accessories(e, baseY, hY, s, o, tr);
      this._telegraphs(e, tr);
    }
    crowd.count = ci;
    crowd.commit();
    const g = this.run?.waves?.gate;
    if (g && g.open) dec.disc(g.x, g.z, g.radius ?? 1.3, 1, 0, 1, 2, 0, 0.5, 1);
    sh.end();
    dec.end();
    for (const k in A) {
      const a = A[k];
      a.mesh.count = a.n;
      a.mesh.instanceMatrix.needsUpdate = true;
      if (a.mesh.instanceColor) a.mesh.instanceColor.needsUpdate = true;
    }
  }

  _accessories(e, baseY, hY, s, o, t) {
    const A = this.acc, rot = e.rotY, top = baseY + hY;
    const rz = o.rotZ;
    switch (e.type) {
      case 'zippy': {
        const back = -o.sz * 0.5;
        this._put(A.fin, this._wx(e, 0, back * 0.15, rot), top - 0.04 * s, this._wz(e, 0, back * 0.15, rot), 0, rot, rz, s, s * 0.8, s);
        const ny = baseY + hY * 0.45;
        this._put(A.nozzle, this._wx(e, 0, back - 0.05 * s, rot), ny, this._wz(e, 0, back - 0.05 * s, rot), 0, rot, 0, s, s, s);
        let fl = 0;
        if (e.ai === 'charge') fl = 1.9 + Math.sin(t * 60) * 0.25;
        else if (e.ai === 'windup') fl = 0.7 + 0.5 * clamp(e.wT / e.wDur, 0, 1) + Math.sin(t * 45) * 0.15;
        else if (!e.smashable) fl = 0.45 + Math.sin(t * 30) * 0.08;
        if (fl > 0) this._put(A.flame, this._wx(e, 0, back - 0.15 * s, rot), ny, this._wz(e, 0, back - 0.15 * s, rot), 0, rot, 0, s * (0.8 + fl * 0.15), s * (0.8 + fl * 0.15), s * fl);
        break;
      }
      case 'popper': {
        this._put(A.stem, e.x, top - 0.03 * s, e.z, 0, rot, rz, s, s, s);
        let sc = 0.75 + Math.sin(t * 9 + e.wobPh) * 0.2;
        if (e.armed) {
          const rate = lerp(2, 8, 1 - clamp(e.fuse / e.fuseMax, 0, 1));
          sc = Math.sin(t * rate * TAU) > 0 ? 1.7 : 0.8;
        }
        this._put(A.spark, e.x, top + 0.3 * s, e.z, 0, t * 5, 0, s * sc, s * sc, s * sc);
        break;
      }
      case 'beamer': {
        this._put(A.pylon, e.x, 0, e.z, 0, rot, 0, s, 1, s);
        const inten = e.phase === 'sweep' ? 1.6 : e.phase === 'tele' ? 0.8 + 0.6 * Math.sin(t * 22) : e.tiredT > 0 || e.dizzyT > 0 ? 0.25 : 0.7;
        this._col2.setHex(e.tiredT > 0 || e.dizzyT > 0 ? 0xff9a6a : COL.lens).multiplyScalar(inten);
        this._put(A.lens, e.x, top - 0.02 * s, e.z, 0, rot, 0, s, s, s, this._col2);
        this._put(A.lensRing, e.x, top - 0.02 * s, e.z, 0, rot, 0, s, s, s);
        break;
      }
      case 'bruiser': {
        const hy = top - 0.04 * s;
        this._put(A.helmet, e.x, hy, e.z, 0, rot, rz, o.sx * 1.04, s, o.sz * 1.04);
        this._put(A.horns, e.x, hy, e.z, 0, rot, rz, s, s, s);
        for (let k = 0; k < 3; k++) {
          const lx = (-0.2 + 0.2 * k) * s, lz = 0.52 * s;
          const on = k < e.pips;
          this._put(A.pips, this._wx(e, lx, lz, rot), hy + 0.1 * s, this._wz(e, lx, lz, rot), 0, rot, 0, s * (on ? 1.25 : 0.9), s * (on ? 1.25 : 0.9), s * 0.6, on ? COL.pipOn : COL.pipOff);
        }
        break;
      }
      case 'splitter': {
        const k = e.smashable ? 1.25 : 0.75 + 0.25 * Math.sin(t * 5 + e.wobPh);
        this._col2.setHex(COL.seam).multiplyScalar(k);
        this._put(A.seam, e.x, o.y, e.z, o.rotX, rot, rz, o.sx, o.sy, o.sz, this._col2);
        break;
      }
      case 'coin': {
        const tilt = Math.sin(t * 7) * 0.12;
        this._put(A.hat, e.x, top - 0.02, e.z, tilt, rot, 0, s, s, s);
        this._put(A.band, e.x, top - 0.02, e.z, tilt, rot, 0, s, s, s);
        break;
      }
    }
    if (e.elite) {
      const cy = top + (e.type === 'bruiser' ? 0.22 * s : 0.03) + Math.sin(t * 3 + e.wobPh) * 0.03;
      this._put(A.crown, e.x, cy, e.z, 0, rot + t * 0.8, 0, s * 0.85, s * 0.85, s * 0.85);
    }
    if (e.shield) {
      const k = s * 1.6 * (1 + Math.sin(t * 5 + e.wobPh) * 0.03);
      this._put(A.bubble, e.x, baseY + hY * 0.5, e.z, 0, 0, 0, k, k, k);
    }
    if (e.smashable) this.stars(e.x, e.z, top + 0.3 + 0.08 * s, 0.3 + 0.35 * s, 3, 0.26 + 0.08 * s, e.wobPh, Math.max(e.dizzyT, e.tiredT, e.freezeT));
  }

  _telegraphs(e, t) {
    const dec = this.decals;
    if (e.type === 'zippy' && e.ai === 'windup') {
      const len = Math.min(e.def.chargeDist, rayToRim(e.x, e.z, e.cdx, e.cdz, this.R - 0.2));
      const k = clamp(e.wT / e.wDur, 0, 1);
      const fl = e.wDur - e.wT < 0.15 ? 1 : 0;
      dec.rect(e.x + e.cdx * e.radius, e.z + e.cdz * e.radius, Math.atan2(e.cdx, e.cdz), Math.max(0.5, len - e.radius), 1.35, k, fl, 1, 1);
      dec.bang(e.x + e.cdx * (e.radius + 1.2), e.z + e.cdz * (e.radius + 1.2), 0.42, fl);
    } else if (e.type === 'popper' && e.armed) {
      const k = 1 - clamp(e.fuse / e.fuseMax, 0, 1);
      dec.disc(e.x, e.z, e.def.blastRadius, k, e.fuse < 0.15 ? 1 : 0, 0.9, 0);
    } else if (e.type === 'beamer' && e.dizzyT <= 0) {
      const dx = Math.sin(e.beamA), dz = Math.cos(e.beamA);
      const ly = this._baseY(e) + e.size * BODY.beamer[1] + 0.24 * e.size;
      const ox = e.x + dx * 0.12 * e.size, oz = e.z + dz * 0.12 * e.size;
      const L = e.beamLen;
      if (e.phase === 'tele') {
        const dur = e.def.telegraph * this.teleMult, k = clamp(e.phT / dur, 0, 1);
        const fl = dur - e.phT < 0.15 ? 1 : 0;
        dec.rect(e.x, e.z, e.beamA, L, e.def.beamWidth + 0.2, k, fl, 1, 4);       // thick dashed yellow-white line
        dec.rect(e.x, e.z, e.beamA0 + e.beamSign * e.def.sweepDeg * DEG, L, 0.3, 1, 0, 0.45, 2);   // where the sweep ends
        dec.bang(e.x + dx * 1.6, e.z + dz * 1.6, 0.42, fl);
        dec.beam(ox, ly, oz, e.beamA, L, 0.05, COL.aim, 0.45 + 0.4 * Math.sin(t * 24));
      } else if (e.phase === 'sweep') {
        dec.rect(e.x, e.z, e.beamA, L, e.def.beamWidth * 1.15, 1, 0, 1, 3);
        dec.beam(ox, ly, oz, e.beamA, L, e.def.beamWidth, COL.beamGlow, 0.95);
        dec.beam(ox, ly, oz, e.beamA, L, e.def.beamWidth * 0.35, COL.beamCore, 1.1);
      }
    }
  }

  // ─────────────── lifecycle ───────────────
  clear() {
    for (const e of this.list) {
      if (e.isBoss) { try { e.dispose(); } catch { /* */ } continue; }
      this._kill(e);
    }
    for (const h of this._lingering) this._removeHazard(h);
    this._lingering.length = 0;
    this.list.length = 0;
    this._deferred.length = 0;
    this.boss = null;
    this.minionCount = 0;
    this._render(0);
  }

  dispose() {
    this.clear();
    for (const u of this._unsub) u();
    this._unsub.length = 0;
    const S = this.scene;
    for (const m of [this.crowd.mesh, this.shadows.mesh]) { S.remove(m); m.geometry.dispose(); m.material.map?.dispose?.(); m.material.dispose(); }
    for (const k in this.acc) { const m = this.acc[k].mesh; S.remove(m); m.geometry.dispose(); m.material.dispose(); m.dispose?.(); }
    this.decals.dispose(S);
  }
}

// ─────────────── small helpers ───────────────
const EMPTY = Object.freeze({});
const byTd = (a, b) => a._td - b._td;
/** shortest signed angle from a to b */
export function angDiff(a, b) { return ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; }
/** rotate angle a toward b by at most step (radians) */
export function turnTo(a, b, step) { const d = angDiff(a, b); return a + clamp(d, -step, step); }
