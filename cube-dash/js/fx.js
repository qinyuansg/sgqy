// ─────────────────────────────────────────────────────────────
// CUBE DASH — FX (G.fx): particles, shockwaves, portals, nova kits
//
//   Everything is pooled & instanced (one draw call per system, zero
//   per-frame allocation, pre-warmed so the first smash never hitches):
//     Sprites  – billboards: glow dots, sparkles, cartoon stars, hearts,
//                streaks, dust puffs, confetti, comic bursts, bubbles, gems
//     Shards   – rounded mini-cubes with gravity + one floor bounce
//     Rings    – floor decals: shockwaves, portal fills, vortex discs,
//                swish arcs, dashed fields, glow discs
//     Beams    – sky beams / light pillars      Shells – nova fresnel domes
//     Ghosts   – dash afterimages               Bolts  – lightning
//     Ribbon   – dash trail following the hero  Freed  – happy freed cubes
//   A small timeline pool drives multi-stage effects (portal telegraphs,
//   nova kits, warp gate, confetti rain, gravity wells).
//
//   Feedback Director: the DIRECTOR table maps bus events → handlers and
//   the RECIPE numbers below; gameplay never has to call fx directly.
//
//   Readability rules (DESIGN_BRIEF §7.20 + cinematic lens):
//     • FX depth is "floor-projected" in the vertex shaders, so enemies and
//       the hero (opaque) always render ABOVE particles.
//     • World particles within 3 u of the hero draw at 50 % opacity.
//     • Freed cubes are pastel / white (never blue), non-colliding, gone
//       upward in ~1.2 s. Telegraphs are orange / yellow-white + "!".
//     • quality 'low' → smaller pools & half emission; reduceFlash → no
//       big white bursts, steady lightning.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { roundedBoxGeometry, CubeCrowd, BlobShadows, EXPR } from './art.js';
import { createClayMaterial } from './hero_model.js';
import { HEROES, TRAILS, TUNE as GT, MODES } from './data.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = Math.random;
const rr = (a, b) => a + (b - a) * rnd();
const easeOutCubic = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// ============ tuning (FX-only numbers; gameplay numbers live in data.js) ============
const TUNE = {
  pools: {
    high: { sprites: 1500, shards: 360, rings: 72, beams: 16, shells: 6, ghosts: 12, bolts: 10, freed: 48, events: 48 },
    low: { sprites: 520, shards: 110, rings: 44, beams: 12, shells: 4, ghosts: 6, bolts: 6, freed: 24, events: 32 },
  },
  emitLow: 0.5,
  focus: { enemies: 40, mult: 0.5 },        // decorative emission halves in crowded waves
  depthPush: 0.9,                           // floor-projected depth factor (enemies above FX)
  minTimeScale: 0.3,                        // particles in slow-mo never slower than 30 % real time
  hitStopRate: 0.45,                        // particles keep breathing during hit-stop
  smash: { shards: 10, shardsL: 13, shardsXL: 16, sparks: 14, ring: 2.5, ringTime: 0.3, flash: 1.5 },
  bonk: { sparks: 8, stars: 4, ring: 1.7 },
  perfect: { sparks: 24, ring: 5, ringTime: 0.4, second: 0.1 },
  nearMiss: { radius: 1.3, arc: 1.9, sparkles: 6 },
  freed: { life: 1.2, pop: 0.25, wave: 0.3, goldChance: 0.01 },
  portal: { fill: 0.6, white: 0.2, beamH: 16, collapse: 0.16 },
  dash: { ghosts: 4, ghostEvery: 0.035, ghostLife: 0.2, ribbonLife: 0.26, ribbonWidth: 0.9 },
  confetti: { rain: 300, rainTime: 1.5, burst: 60 },
  knocked: { every: 0.04, minSpeed: 3 },
  ambientDust: { every: 0.25, minSpeed: 2.5, max: 40 },
  bolt: { life: 0.3, top: 15 },
  storm: { bolts: 12, time: 2.5, firstDelay: 0.2 },
};

// reserved colours (colour law: RED = enemies only, never used here)
const HEX = {
  cyan: 0x40f0ff, cyanSoft: 0xbff3ff, white: 0xffffff, gold: 0xffd23f, goldDeep: 0xffb400,
  pink: 0xff5c8a, pinkSoft: 0xffc1dc, star: 0xffe14d, orange: 0xff9a2e, teleWhite: 0xfff3c0,
  plum: 0x2b1d3f, violet: 0x9b6bff, mega: 0xff9ed8, storm: 0xffe14d, magenta: 0xff3df2,
};
const PAL = {
  freed: [0xa8f0d8, 0xfff09a, 0xd4c0ff, 0xffc8a8, 0xf7fbff],       // mint · lemon · lilac · peach · white — never blue
  candy: [0xffb13b, 0xff7ab8, 0xffe14d, 0xffffff, 0xff9a2e, 0xffc1dc],
  confetti: [0xff7ab8, 0xffe14d, 0x5affa0, 0x5ac8ff, 0xb38bff, 0xffffff, 0xffb13b],
  rainbow: [0xff7a7a, 0xffb13b, 0xfff05a, 0x5affa0, 0x5ac8ff, 0xb05aff],
  sparkWarm: [0xffffff, 0xfff3b0, 0xffe14d],
  hurt: [0xff5c8a, 0xffc1dc, 0xffffff],
};
const NOVA_COLOR = { bigbang: HEX.cyan, mega: HEX.mega, storm: HEX.storm, blackhole: HEX.violet };

// linear-space colour cache (hex → THREE.Color) so hot paths never convert or allocate
const COL = new Map();
function col(hex) {
  let c = COL.get(hex);
  if (!c) { c = new THREE.Color(hex); COL.set(hex, c); }
  return c;
}
const pick = (arr) => arr[(rnd() * arr.length) | 0];
// payload sizes may be numbers (world units) or size keys
const SIZE_KEY = { S: 0.7, M: 1.0, L: 1.4, XL: 2.0 };
const sizeOf = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v : SIZE_KEY[v] ?? d);

// sprite shapes
const SH = { DOT: 0, SPARKLE: 1, STAR: 2, HEART: 3, STREAK: 4, PUFF: 5, RECT: 6, BURST: 7, BUBBLE: 8, FLASH: 9, GEM: 10, SWISH: 11 };
// sprite motion modes
const MO = { BALLISTIC: 0, SPIRAL: 1, FLUTTER: 2, RISE: 3 };
// floor ring styles
const RS = { SHOCK: 0, PORTAL: 1, VORTEX: 2, ARC: 3, DASHED: 4, DISC: 5 };

// ============ shared GLSL ============
// Floor-projected depth: FX fragments take the depth of the point where their
// view ray meets the floor, so opaque characters standing there win the depth
// test (enemies/hero render above FX) while FX still sit above the floor.
const PUSH_GLSL = /* glsl */`
uniform float uPush;
vec4 cdProject(vec3 wp, float self) {
  vec4 clip = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  if (self > 1.5) {            // overlay: pulled toward the camera (brief hero feedback over nearby bodies)
    vec3 d = normalize(cameraPosition - wp);
    vec4 c2 = projectionMatrix * viewMatrix * vec4(wp + d * 2.5, 1.0);
    clip.z = c2.z / c2.w * clip.w;
  } else if (self < 0.5 && uPush > 0.0) {
    vec3 d = wp - cameraPosition;
    d /= max(length(d), 1e-4);
    if (d.y < -0.06 && wp.y > 0.0) {
      float t = min(wp.y / -d.y * uPush, 10.0);
      vec4 c2 = projectionMatrix * viewMatrix * vec4(wp + d * t, 1.0);
      clip.z = c2.z / c2.w * clip.w;
    }
  }
  return clip;
}
`;
const HERO_FADE_GLSL = /* glsl */`
uniform vec3 uHero;   // hero x, z, active
float cdHeroFade(vec3 p, float self) {
  if (self > 0.5 || uHero.z < 0.5) return 1.0;
  return mix(0.5, 1.0, smoothstep(2.6, 3.0, length(p.xz - uHero.xy)));
}
`;

function fxMaterial(vs, fs, uniforms, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms, vertexShader: vs, fragmentShader: fs,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    side: opts.side ?? THREE.FrontSide,
  });
}

// ─────────────────────────────────────────────────────────────
// Sprites: instanced billboards with CPU sim (AoS buffer, swap-remove)
// ─────────────────────────────────────────────────────────────
const SPR_VERT = /* glsl */`
attribute vec4 iPos;   // xyz, size
attribute vec4 iCol;   // rgb, alpha
attribute vec4 iMisc;  // shape, rotation, additive(0..1), stretch
attribute vec4 iDir;   // orientation (stretch) / confetti flip, self
varying vec2 vUv;
varying vec4 vCol;
varying float vShape;
varying float vAdd;
${PUSH_GLSL}
${HERO_FADE_GLSL}
void main() {
  vUv = position.xy * 2.0;
  vShape = iMisc.x;
  vAdd = iMisc.z;
  vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float size = iPos.w;
  vec2 c = position.xy;
  vec2 q;
  if (iMisc.w > 0.0) {
    vec2 sd = vec2(dot(iDir.xyz, camR), dot(iDir.xyz, camU));
    float l = length(sd);
    vec2 d = l > 1e-5 ? sd / l : vec2(1.0, 0.0);
    vec2 n = vec2(-d.y, d.x);
    q = d * (c.x * size * (1.0 + iMisc.w)) + n * (c.y * size);
  } else {
    vec2 cc = c * size;
    if (abs(vShape - 6.0) < 0.5) cc.x *= iDir.x;
    float cs = cos(iMisc.y), sn = sin(iMisc.y);
    q = vec2(cc.x * cs - cc.y * sn, cc.x * sn + cc.y * cs);
  }
  vec3 wp = iPos.xyz + camR * q.x + camU * q.y;
  vCol = vec4(iCol.rgb, iCol.a * cdHeroFade(iPos.xyz, iDir.w));
  gl_Position = cdProject(wp, iDir.w);
}`;

const SPR_FRAG = /* glsl */`
varying vec2 vUv;
varying vec4 vCol;
varying float vShape;
varying float vAdd;
float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-0.809016994375, -0.587785252292);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.35355;
  vec2 a = p - vec2(0.0, 1.0);
  vec2 b = p - 0.5 * max(p.x + p.y, 0.0);
  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}
void main() {
  vec2 uv = vUv;
  float r = length(uv);
  float a = 0.0;
  vec3 col = vCol.rgb;
  int sh = int(vShape + 0.5);
  if (sh == 0) {                       // soft glow dot
    a = exp(-r * r * 4.5);
    col *= 1.0 + exp(-r * r * 20.0) * 1.2;
  } else if (sh == 1) {                // 4-point sparkle
    vec2 p = abs(uv);
    float rays = max(exp(-p.x * 16.0) * (1.0 - smoothstep(0.0, 1.0, p.y)), exp(-p.y * 16.0) * (1.0 - smoothstep(0.0, 1.0, p.x)));
    float core = exp(-r * r * 14.0);
    a = clamp(rays + core, 0.0, 1.0);
    col *= 1.0 + core * 1.3;
  } else if (sh == 2) {                // cartoon star (dizzy / bonk)
    float d = sdStar5(uv * 1.05 + vec2(0.0, 0.06), 0.88, 0.5);
    a = 1.0 - smoothstep(-0.02, 0.035, d);
    float rim = smoothstep(-0.2, -0.09, d);
    col = mix(col, col * vec3(1.0, 0.58, 0.2), rim * 0.9);
    col += vec3(0.5) * (1.0 - smoothstep(0.0, 0.22, length(uv - vec2(-0.16, 0.2))));
  } else if (sh == 3) {                // heart
    vec2 p = vec2(uv.x * 0.7, uv.y * 0.7 + 0.46);
    float d = sdHeart(p);
    a = 1.0 - smoothstep(-0.015, 0.025, d);
    col = mix(col, col * 0.72, smoothstep(-0.12, -0.05, d) * 0.7);
    col += vec3(0.55) * (1.0 - smoothstep(0.0, 0.17, length(uv - vec2(-0.3, 0.28))));
  } else if (sh == 4) {                // velocity streak
    float along = abs(uv.x), across = abs(uv.y);
    a = (1.0 - smoothstep(0.3, 1.0, across)) * (1.0 - smoothstep(0.15, 1.0, along));
    col *= 1.0 + (1.0 - smoothstep(0.0, 0.4, across)) * 0.6;
  } else if (sh == 5) {                // dust puff (shaded clay ball)
    a = 1.0 - smoothstep(0.72, 1.0, r);
    vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - r * r)));
    float l = dot(n, normalize(vec3(-0.45, 0.6, 0.65)));
    col *= 0.8 + 0.28 * l;
  } else if (sh == 6) {                // confetti
    vec2 p = abs(uv);
    a = (1.0 - smoothstep(0.82, 1.0, p.x)) * (1.0 - smoothstep(0.4, 0.55, p.y));
  } else if (sh == 7) {                // comic impact burst
    float ang = atan(uv.y, uv.x);
    float spikes = 0.6 + 0.36 * pow(abs(cos(ang * 4.0 + 0.4)), 5.0);
    a = 1.0 - smoothstep(-0.03, 0.02, r - spikes);
    col = mix(col, vec3(1.6), 1.0 - smoothstep(0.1, 0.5, r));
  } else if (sh == 8) {                // bubble
    float ring = smoothstep(0.7, 0.88, r) * (1.0 - smoothstep(0.9, 1.0, r));
    float hi = 1.0 - smoothstep(0.0, 0.22, length(uv - vec2(-0.35, 0.35)));
    a = ring * 0.9 + hi * 0.9 + (1.0 - smoothstep(0.0, 0.9, r)) * 0.1;
    col = mix(col, vec3(1.2), hi);
  } else if (sh == 9) {                // flash disc
    a = (1.0 - smoothstep(0.72, 1.0, r)) * (0.55 + 0.45 * (1.0 - r));
    col *= 1.0 + (1.0 - r) * 0.6;
  } else if (sh == 11) {               // swish crescent (convex side = +x)
    float d = max(r - 0.95, -(length(uv - vec2(-0.42, 0.0)) - 0.92));
    a = (1.0 - smoothstep(-0.015, 0.015, d)) * (1.0 - smoothstep(0.45, 0.95, abs(uv.y)));
    float rim = smoothstep(-0.1, -0.025, d);
    col = mix(col * 1.15, vec3(1.35), (1.0 - smoothstep(0.0, 0.3, abs(uv.y))) * (1.0 - rim) * 0.55);
    col = mix(col, col * 0.38, rim * 0.75);
  } else {                             // 10: crystal glint
    vec2 p = abs(uv);
    float d = p.x * 1.6 + p.y - 0.95;
    a = 1.0 - smoothstep(-0.03, 0.03, d);
    col *= 0.82 + 0.4 * step(0.0, uv.x * 0.6 + uv.y);
    col += vec3(0.45) * (1.0 - smoothstep(0.0, 0.2, length(uv - vec2(-0.12, 0.25))));
  }
  float A = a * vCol.a;
  if (A < 0.003) discard;
  gl_FragColor = vec4(col * A, A * (1.0 - vAdd));
  #include <colorspace_fragment>
}`;

// AoS layout (floats per particle)
const PS = 32;
const P_X = 0, P_Y = 1, P_Z = 2, P_VX = 3, P_VY = 4, P_VZ = 5, P_LIFE = 6, P_MAX = 7, P_S0 = 8, P_S1 = 9,
  P_A = 10, P_R = 11, P_G = 12, P_B = 13, P_SHAPE = 14, P_ADD = 15, P_MODE = 16, P_ROT = 17, P_ROTV = 18,
  P_GRAV = 19, P_DRAG = 20, P_OX = 21, P_OY = 22, P_OZ = 23, P_K1 = 24, P_K2 = 25, P_FADE = 26,
  P_STRETCH = 27, P_SELF = 28, P_BOUNCE = 29, P_FADEIN = 30, P_TAG = 31;

class SpriteSpec {
  reset() {
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
    this.life = 0.5; this.delay = 0; this.size = 0.3; this.size1 = -1; this.alpha = 1;
    this.r = 1; this.g = 1; this.b = 1; this.shape = SH.DOT; this.add = 1; this.mode = MO.BALLISTIC;
    this.rot = 0; this.rotV = 0; this.grav = 0; this.drag = 0; this.ox = 0; this.oy = 0; this.oz = 0;
    this.k1 = 0; this.k2 = 0; this.fade = 1; this.stretch = 0; this.self = 0; this.bounce = 0; this.fadeIn = 0; this.tag = 0;
    return this;
  }
  color(hex, mul = 1) { const c = col(hex); this.r = c.r * mul; this.g = c.g * mul; this.b = c.b * mul; return this; }
}

class Sprites {
  constructor(cap) {
    this.cap = cap;
    this.n = 0;
    this.d = new Float32Array(cap * PS);
    this.spec = new SpriteSpec().reset();
    this.dust = 0;
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iMisc = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iDir = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.iPos); g.setAttribute('iCol', this.iCol);
    g.setAttribute('iMisc', this.iMisc); g.setAttribute('iDir', this.iDir);
    g.instanceCount = 0;
    this._attrs = [this.iPos, this.iCol, this.iMisc, this.iDir];
    this.geo = g;
  }
  make(uniforms) {
    this.mat = fxMaterial(SPR_VERT, SPR_FRAG, uniforms);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    return this.mesh;
  }
  get free() { return this.cap - this.n; }
  /** returns the reset spec to fill; call add() after */
  s() { return this.spec.reset(); }
  add(p = this.spec) {
    if (this.n >= this.cap) return -1;
    const o = this.n * PS, d = this.d;
    d[o + P_X] = p.x; d[o + P_Y] = p.y; d[o + P_Z] = p.z;
    d[o + P_VX] = p.vx; d[o + P_VY] = p.vy; d[o + P_VZ] = p.vz;
    d[o + P_LIFE] = -p.delay; d[o + P_MAX] = Math.max(0.01, p.life);
    d[o + P_S0] = p.size; d[o + P_S1] = p.size1 < 0 ? p.size : p.size1;
    d[o + P_A] = p.alpha; d[o + P_R] = p.r; d[o + P_G] = p.g; d[o + P_B] = p.b;
    d[o + P_SHAPE] = p.shape; d[o + P_ADD] = p.add; d[o + P_MODE] = p.mode;
    d[o + P_ROT] = p.rot; d[o + P_ROTV] = p.rotV; d[o + P_GRAV] = p.grav; d[o + P_DRAG] = p.drag;
    d[o + P_OX] = p.ox; d[o + P_OY] = p.oy; d[o + P_OZ] = p.oz; d[o + P_K1] = p.k1; d[o + P_K2] = p.k2;
    d[o + P_FADE] = p.fade; d[o + P_STRETCH] = p.stretch; d[o + P_SELF] = p.self; d[o + P_BOUNCE] = p.bounce;
    d[o + P_FADEIN] = p.fadeIn; d[o + P_TAG] = p.tag;
    if (p.tag === 1) this.dust++;
    return this.n++;
  }
  _kill(i) {
    const d = this.d;
    if (d[i * PS + P_TAG] === 1) this.dust--;
    const last = --this.n;
    if (i !== last) d.copyWithin(i * PS, last * PS, last * PS + PS);
  }
  clear() { this.n = 0; this.dust = 0; this.geo.instanceCount = 0; }
  update(dt) {
    const d = this.d;
    let i = 0;
    while (i < this.n) {
      const o = i * PS;
      const life = d[o + P_LIFE] + dt;
      if (life >= d[o + P_MAX]) { this._kill(i); continue; }
      d[o + P_LIFE] = life;
      if (life < 0) { i++; continue; }
      const mode = d[o + P_MODE];
      if (mode === MO.BALLISTIC) {
        d[o + P_VY] -= d[o + P_GRAV] * dt;
        const dr = d[o + P_DRAG];
        if (dr > 0) { const k = Math.exp(-dr * dt); d[o + P_VX] *= k; d[o + P_VY] *= k; d[o + P_VZ] *= k; }
        d[o + P_X] += d[o + P_VX] * dt; d[o + P_Y] += d[o + P_VY] * dt; d[o + P_Z] += d[o + P_VZ] * dt;
        if (d[o + P_BOUNCE] > 0 && d[o + P_Y] < 0.05 && d[o + P_VY] < 0) {
          d[o + P_Y] = 0.05; d[o + P_VY] *= -d[o + P_BOUNCE]; d[o + P_VX] *= 0.6; d[o + P_VZ] *= 0.6;
        }
      } else if (mode === MO.SPIRAL) {
        // k1 = angle, k2 = radius, vx = radial speed (grows), vz = angular speed, oy = target height
        let rad = d[o + P_K2];
        d[o + P_VX] += d[o + P_GRAV] * dt;
        rad -= d[o + P_VX] * dt;
        if (rad <= 0.12) { this._kill(i); continue; }
        d[o + P_K2] = rad;
        d[o + P_K1] += d[o + P_VZ] * dt / Math.max(0.6, rad);
        d[o + P_X] = d[o + P_OX] + Math.cos(d[o + P_K1]) * rad;
        d[o + P_Z] = d[o + P_OZ] + Math.sin(d[o + P_K1]) * rad;
        d[o + P_Y] += (d[o + P_OY] - d[o + P_Y]) * (1 - Math.exp(-3 * dt));
      } else if (mode === MO.FLUTTER) {
        d[o + P_VY] += (-d[o + P_GRAV] - d[o + P_VY]) * (1 - Math.exp(-2.5 * dt));
        const sw = Math.sin(life * d[o + P_K1] + d[o + P_K2]);
        d[o + P_X] += (d[o + P_VX] + sw * 0.9) * dt;
        d[o + P_Z] += (d[o + P_VZ] + Math.cos(life * d[o + P_K1] * 0.7 + d[o + P_K2]) * 0.6) * dt;
        d[o + P_Y] += d[o + P_VY] * dt;
        d[o + P_VX] *= Math.exp(-1.5 * dt); d[o + P_VZ] *= Math.exp(-1.5 * dt);
        if (d[o + P_Y] < 0.03) { d[o + P_Y] = 0.03; d[o + P_VY] = 0; d[o + P_VX] = 0; d[o + P_VZ] = 0; }
      } else { // RISE (hearts, bubbles): steady rise + wobble
        d[o + P_Y] += d[o + P_VY] * dt;
        d[o + P_X] += (d[o + P_VX] + Math.sin(life * d[o + P_K1] + d[o + P_K2]) * 0.6) * dt;
        d[o + P_Z] += d[o + P_VZ] * dt;
        d[o + P_VX] *= Math.exp(-3 * dt); d[o + P_VZ] *= Math.exp(-3 * dt);
      }
      d[o + P_ROT] += d[o + P_ROTV] * dt;
      i++;
    }
    this._upload();
  }
  _upload() {
    const d = this.d, n = this.n;
    const P = this.iPos.array, Cc = this.iCol.array, M = this.iMisc.array, D = this.iDir.array;
    for (let i = 0; i < n; i++) {
      const o = i * PS, j = i * 4;
      const life = d[o + P_LIFE];
      if (life < 0) { P[j + 3] = 0; Cc[j + 3] = 0; continue; }
      const t = life / d[o + P_MAX];
      let size = d[o + P_S0] + (d[o + P_S1] - d[o + P_S0]) * t;
      let a = d[o + P_A] * (1 - Math.pow(t, d[o + P_FADE]));
      const fi = d[o + P_FADEIN];
      if (fi > 0 && life < fi) { const k = life / fi; a *= k; size *= 0.5 + 0.5 * k; }
      P[j] = d[o + P_X]; P[j + 1] = d[o + P_Y]; P[j + 2] = d[o + P_Z]; P[j + 3] = size;
      Cc[j] = d[o + P_R]; Cc[j + 1] = d[o + P_G]; Cc[j + 2] = d[o + P_B]; Cc[j + 3] = a;
      const shape = d[o + P_SHAPE];
      M[j] = shape; M[j + 1] = d[o + P_ROT]; M[j + 2] = d[o + P_ADD];
      let st = d[o + P_STRETCH];
      if (shape === SH.RECT) {
        D[j] = Math.cos(life * d[o + P_K1] * 2.2 + d[o + P_K2]); D[j + 1] = 0; D[j + 2] = 0; st = 0;
      } else if (st > 0) {
        if (d[o + P_MODE] === MO.SPIRAL) { // tangent of the spiral
          const ang = d[o + P_K1];
          D[j] = -Math.sin(ang); D[j + 1] = -0.15; D[j + 2] = Math.cos(ang);
          if (st >= 100) st -= 100;
        } else if (st < 50) { // dynamic: stretch ∝ speed
          const vx = d[o + P_VX], vy = d[o + P_VY], vz = d[o + P_VZ];
          const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
          D[j] = vx; D[j + 1] = vy; D[j + 2] = vz;
          st = sp * st;
        } else { // fixed orientation stored in ox/oy/oz, stretch - 100
          D[j] = d[o + P_OX]; D[j + 1] = d[o + P_OY]; D[j + 2] = d[o + P_OZ];
          st -= 100;
        }
      }
      M[j + 3] = st;
      D[j + 3] = d[o + P_SELF];
    }
    this.geo.instanceCount = n;
    for (const at of this._attrs) {
      at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(4, n * 4)); at.needsUpdate = true;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Floor rings (instanced decals): fire-and-forget shockwaves + immediate-mode
// instances pushed each frame by timeline effects (portals, vortex, arcs…)
// ─────────────────────────────────────────────────────────────
const RING_VERT = /* glsl */`
attribute vec4 iA;   // x, y, z, R
attribute vec4 iB;   // rgb, alpha
attribute vec4 iC;   // style, thickness, fill, seed
attribute vec4 iD;   // arc0, arcLen, white, flags(self + 2*add)
varying vec2 vP;
varying vec4 vCol;
varying vec4 vC;
varying vec4 vD;
varying float vR;
varying float vFade;
varying float vAdd;
varying vec3 vW;
${PUSH_GLSL}
${HERO_FADE_GLSL}
void main() {
  float R = iA.w + 0.06;
  vec3 wp = vec3(iA.x + position.x * R, iA.y, iA.z - position.y * R);
  vP = vec2(position.x, -position.y) * R;
  vR = iA.w;
  vCol = iB; vC = iC; vD = iD;
  float self = mod(iD.w, 2.0);
  vAdd = floor(iD.w * 0.5 + 0.01);
  vW = wp;
  vFade = self;
  gl_Position = cdProject(wp, self);
}`;
const RING_FRAG = /* glsl */`
uniform float uTime;
uniform vec3 uHero;
varying vec2 vP;
varying vec4 vCol;
varying vec4 vC;
varying vec4 vD;
varying float vR;
varying float vFade;
varying float vAdd;
varying vec3 vW;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void over(inout vec3 C, inout float A, vec3 c2, float a2) {
  a2 = clamp(a2, 0.0, 1.0);
  float na = a2 + A * (1.0 - a2);
  C = (c2 * a2 + C * A * (1.0 - a2)) / max(na, 1e-4);
  A = na;
}
void main() {
  float R = max(vR, 0.001);
  float d = length(vP);
  if (d > R + 0.03) discard;
  int st = int(vC.x + 0.5);
  float T = max(vC.y, 0.015);
  float fill = vC.z;
  float seed = vC.w;
  float ang = atan(vP.y, vP.x);
  vec3 col = vCol.rgb;
  float a = 0.0;
  if (st == 0) {                                    // shockwave ring (cel edge reads on light floors)
    float inner = R - T;
    float e = clamp((d - inner) / T, 0.0, 1.0);
    float inB = step(inner, d);
    float band = inB * smoothstep(0.0, 0.4, e) * (1.0 - smoothstep(0.78, 0.9, e));
    float edge = inB * smoothstep(0.78, 0.88, e) * (1.0 - smoothstep(0.95, 1.0, e));
    float glow = (1.0 - inB) * smoothstep(inner * 0.2, inner, d) * 0.25 * fill;
    vec3 C = vec3(0.0); float A = 0.0;
    over(C, A, col, glow);
    over(C, A, col * 1.2, band);
    over(C, A, col * 0.4, edge * 0.85);
    col = C; a = A;
  } else if (st == 1) {                             // spawn portal (orange / yellow-white telegraph + "!")
    float q = d / R;
    float a01 = fract(atan(vP.x, -vP.y) / 6.2831853 + 1.0);
    float white = vD.z;
    vec3 orange = vec3(1.0, 0.33, 0.035);
    vec3 cream = vec3(1.0, 0.9, 0.55);
    vec3 plum = vec3(0.024, 0.012, 0.05);
    vec3 C = vec3(0.0); float A = 0.0;
    // swirl core
    float swirl = (1.0 - smoothstep(0.55, 0.62, q)) * (0.5 + 0.5 * sin(ang * 3.0 + q * 9.0 - uTime * 6.0 + seed));
    over(C, A, mix(vec3(1.0, 0.5, 0.25), vec3(1.0, 0.86, 0.45), 1.0 - q), swirl * (0.12 + 0.34 * fill));
    // striped band, filled clockwise from 12 o'clock
    float bandM = smoothstep(0.6, 0.62, q) * (1.0 - smoothstep(0.86, 0.88, q));
    float stripe = step(0.5, fract(a01 * 18.0 + q * 1.4 - uTime * 0.9));
    float filled = step(a01, fill);
    over(C, A, mix(mix(orange, cream, stripe), vec3(1.3), white * 0.35), bandM * mix(0.16, 0.92, filled));
    // bright rim + dark plum outline (reads on light floors)
    float rim = smoothstep(0.86, 0.88, q) * (1.0 - smoothstep(0.955, 0.975, q));
    over(C, A, mix(orange * 1.25, vec3(1.5), white), rim * 0.95);
    float outline = smoothstep(0.955, 0.975, q) * (1.0 - smoothstep(0.99, 1.0, q));
    over(C, A, plum, outline * 0.5);
    // "!" glyph (screen-up = world -Z)
    vec2 g = vP / R;
    float glyph = min(box(g - vec2(0.0, -0.15), vec2(0.075, 0.24), 0.06), length(g - vec2(0.0, 0.25)) - 0.085);
    float gA = smoothstep(0.05, 0.3, fill);
    over(C, A, plum, (1.0 - smoothstep(0.035, 0.055, glyph)) * gA * 0.85);
    over(C, A, mix(cream * 1.25, vec3(1.6), white), (1.0 - smoothstep(-0.01, 0.01, glyph)) * gA);
    col = C; a = A;
  } else if (st == 2) {                             // vortex (gravity well / black hole / warp gate)
    float q = d / R;
    float spin = seed > 0.5 ? -1.0 : 1.0;
    float arms = 0.5 + 0.5 * sin(ang * 3.0 * spin - q * 8.0 + uTime * 7.0);
    float body = 1.0 - smoothstep(0.8, 1.0, q);
    a = body * (0.22 + 0.5 * arms) * (0.45 + 0.55 * q);
    col = mix(col, vec3(1.25), arms * 0.35 * q);
    float rimR = smoothstep(0.9, 0.95, q) * (1.0 - smoothstep(0.97, 1.0, q));
    a += rimR * 0.8; col += rimR * 0.4;
    float core = 1.0 - smoothstep(0.13, 0.17, q);
    float coreRim = smoothstep(0.12, 0.17, q) * (1.0 - smoothstep(0.17, 0.23, q));
    col = mix(col, vec3(0.1, 0.03, 0.22), core * fill);
    a = mix(a, 0.9, core * fill);
    a += coreRim * fill; col += coreRim * fill * 0.8;
  } else if (st == 3) {                             // swish arc (near-miss)
    float da = mod(ang - vD.x + 12.566370, 6.2831853);
    float L = max(vD.y, 0.01);
    if (da > L) discard;
    float u = da / L;
    float taper = sin(u * 3.14159);
    float mid = R - T * 0.5;
    float w = max(T * 0.5 * taper, 0.001);
    float dd = abs(d - mid);
    float head = 0.35 + 0.65 * u;
    vec3 C = vec3(0.0); float A = 0.0;
    over(C, A, col * 0.4, (1.0 - smoothstep(w * 0.8, w, dd)) * head * 0.85);
    over(C, A, col * 1.15, (1.0 - smoothstep(w * 0.5, w * 0.72, dd)) * head);
    over(C, A, vec3(1.3), (1.0 - smoothstep(0.0, w * 0.28, dd)) * head * 0.9);
    col = C; a = A;
  } else if (st == 4) {                             // dashed rotating field
    float inner = R - T;
    float band = step(inner, d) * (1.0 - smoothstep(R - 0.03, R, d)) * smoothstep(inner, inner + 0.04, d);
    float dash = step(0.45, fract(ang / 6.2831853 * 24.0 + uTime * (seed > 0.5 ? -0.35 : 0.35)));
    a = band * (0.35 + 0.65 * dash);
    a += (1.0 - step(inner, d)) * smoothstep(0.0, inner, d) * 0.08 * fill;
  } else {                                          // soft glow disc
    float q = d / R;
    a = pow(1.0 - smoothstep(0.0, 1.0, q), 1.6) * (0.6 + 0.4 * fill);
  }
  float self = vFade;
  float fade = 1.0;
  if (self < 0.5 && uHero.z > 0.5) fade = mix(0.5, 1.0, smoothstep(2.6, 3.0, length(vW.xz - uHero.xy)));
  float A = clamp(a, 0.0, 1.0) * vCol.a * fade;
  if (A < 0.003) discard;
  gl_FragColor = vec4(col * A, A * (1.0 - vAdd));
  #include <colorspace_fragment>
}`;

const RA = 24; // AoS stride for animated rings
class Rings {
  constructor(cap) {
    this.cap = cap;
    this.n = 0;            // animated
    this.m = 0;            // immediate (this frame)
    this.d = new Float32Array(cap * RA);
    const quad = new THREE.PlaneGeometry(2, 2);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    this.iA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iC = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iD = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.iA); g.setAttribute('iB', this.iB); g.setAttribute('iC', this.iC); g.setAttribute('iD', this.iD);
    g.instanceCount = 0;
    this._attrs = [this.iA, this.iB, this.iC, this.iD];
    this.geo = g;
  }
  make(uniforms) {
    this.mat = fxMaterial(RING_VERT, RING_FRAG, uniforms);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    return this.mesh;
  }
  /** fire-and-forget animated ring */
  anim(x, z, r0, r1, life, hex, alpha = 1, { t0 = 0.35, t1 = 0.08, style = RS.SHOCK, delay = 0, fill = 1, self = 0, add = 0, y = 0.04, mul = 1, seed = 0, arc0 = 0, arcLen = 0, ease = 0 } = {}) {
    if (this.n + this.m >= this.cap) return;
    const o = this.n * RA, d = this.d, c = col(hex);
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = r0; d[o + 4] = r1; d[o + 5] = t0; d[o + 6] = t1;
    d[o + 7] = -delay; d[o + 8] = Math.max(0.01, life);
    d[o + 9] = c.r * mul; d[o + 10] = c.g * mul; d[o + 11] = c.b * mul; d[o + 12] = alpha;
    d[o + 13] = style; d[o + 14] = fill; d[o + 15] = seed; d[o + 16] = arc0; d[o + 17] = arcLen;
    d[o + 18] = self + add * 2; d[o + 19] = ease;
    this.n++;
  }
  clear() { this.n = 0; this.m = 0; this.geo.instanceCount = 0; }
  begin() { this.m = 0; }
  /** immediate instance for this frame (after update) */
  now(x, z, R, thick, c, alpha, style, fill = 1, seed = 0, arc0 = 0, arcLen = 0, white = 0, self = 0, add = 0, y = 0.035) {
    const i = this.n + this.m;
    if (i >= this.cap) return;
    this._write(i, x, y, z, R, c.r, c.g, c.b, alpha, style, thick, fill, seed, arc0, arcLen, white, self + add * 2);
    this.m++;
  }
  _write(i, x, y, z, R, r, g, b, a, style, thick, fill, seed, arc0, arcLen, white, flags) {
    const j = i * 4;
    const A = this.iA.array, B = this.iB.array, Cc = this.iC.array, D = this.iD.array;
    A[j] = x; A[j + 1] = y; A[j + 2] = z; A[j + 3] = R;
    B[j] = r; B[j + 1] = g; B[j + 2] = b; B[j + 3] = a;
    Cc[j] = style; Cc[j + 1] = thick; Cc[j + 2] = fill; Cc[j + 3] = seed;
    D[j] = arc0; D[j + 1] = arcLen; D[j + 2] = white; D[j + 3] = flags;
  }
  update(dt) {
    const d = this.d;
    let i = 0;
    while (i < this.n) {
      const o = i * RA;
      const life = d[o + 7] + dt;
      if (life >= d[o + 8]) {
        const last = --this.n;
        if (i !== last) d.copyWithin(o, last * RA, last * RA + RA);
        continue;
      }
      d[o + 7] = life;
      i++;
    }
    // write animated rings first; immediates are appended by now() afterwards
    for (let k = 0; k < this.n; k++) {
      const o = k * RA;
      const life = d[o + 7];
      if (life < 0) { this._write(k, 0, -50, 0, 0.001, 0, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 1); continue; }
      const t = life / d[o + 8];
      const e = d[o + 19] === 1 ? t : easeOutCubic(t);
      const R = d[o + 3] + (d[o + 4] - d[o + 3]) * e;
      const th = d[o + 5] + (d[o + 6] - d[o + 5]) * t;
      const a = d[o + 12] * (1 - t * t);
      const style = d[o + 13];
      let arc0 = d[o + 16], arcLen = d[o + 17];
      if (style === RS.ARC) arcLen *= Math.min(1, t * 5); // swish draws in quickly
      this._write(k, d[o], d[o + 1], d[o + 2], R, d[o + 9], d[o + 10], d[o + 11], a, style, Math.min(th, R), d[o + 14], d[o + 15], arc0, arcLen, 0, d[o + 18]);
    }
  }
  end() {
    const n = this.n + this.m;
    this.geo.instanceCount = n;
    for (const at of this._attrs) {
      at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(4, n * 4)); at.needsUpdate = true;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Beams (sky beams / light pillars) & Shells (nova domes): immediate mode
// ─────────────────────────────────────────────────────────────
const BEAM_VERT = /* glsl */`
attribute vec4 iA;   // x, y, z, radius
attribute vec4 iB;   // rgb, alpha
attribute vec4 iC;   // height, white, seed, self
varying vec4 vCol;
varying vec3 vN;
varying vec3 vV;
varying float vH;
varying float vWhite;
varying float vSeed;
${PUSH_GLSL}
void main() {
  vec3 p = position;
  vec3 wp = vec3(iA.x + p.x * iA.w, iA.y + p.y * iC.x, iA.z + p.z * iA.w);
  vN = normalize(vec3(p.x, 0.0, p.z));
  vV = normalize(cameraPosition - wp);
  vH = p.y;
  vCol = iB; vWhite = iC.y; vSeed = iC.z;
  gl_Position = cdProject(wp, iC.w);
}`;
const BEAM_FRAG = /* glsl */`
uniform float uTime;
varying vec4 vCol;
varying vec3 vN;
varying vec3 vV;
varying float vH;
varying float vWhite;
varying float vSeed;
void main() {
  float facing = abs(dot(vN, normalize(vec3(vV.x, 0.0, vV.z))));
  float core = pow(facing, 1.6);
  float vf = pow(1.0 - vH, 1.4) * smoothstep(0.0, 0.02, vH);
  float stripes = 0.78 + 0.22 * sin(vH * 46.0 - uTime * 14.0 + vSeed * 7.0);
  float a = vCol.a * vf * (0.25 + 0.75 * core) * stripes;
  vec3 c = mix(vCol.rgb, vec3(1.3), max(vWhite, core * 0.22));
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, 0.0);
  #include <colorspace_fragment>
}`;
class Beams {
  constructor(cap) {
    this.cap = cap; this.m = 0;
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.index = cyl.index;
    g.setAttribute('position', cyl.attributes.position);
    this.iA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iC = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.iA); g.setAttribute('iB', this.iB); g.setAttribute('iC', this.iC);
    g.instanceCount = 0;
    this._attrs = [this.iA, this.iB, this.iC];
    this.geo = g;
  }
  make(uniforms) {
    this.mat = fxMaterial(BEAM_VERT, BEAM_FRAG, uniforms, { side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    return this.mesh;
  }
  begin() { this.m = 0; }
  now(x, z, y, radius, height, c, alpha, white = 0, seed = 0, self = 0) {
    if (this.m >= this.cap) return;
    const j = this.m * 4;
    const A = this.iA.array, B = this.iB.array, Cc = this.iC.array;
    A[j] = x; A[j + 1] = y; A[j + 2] = z; A[j + 3] = radius;
    B[j] = c.r; B[j + 1] = c.g; B[j + 2] = c.b; B[j + 3] = alpha;
    Cc[j] = height; Cc[j + 1] = white; Cc[j + 2] = seed; Cc[j + 3] = self;
    this.m++;
  }
  end() {
    this.geo.instanceCount = this.m;
    for (const at of this._attrs) { at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(4, this.m * 4)); at.needsUpdate = true; }
  }
}

const SHELL_VERT = /* glsl */`
attribute vec4 iA;   // x, y, z, R
attribute vec4 iB;   // rgb, alpha
attribute vec4 iC;   // mode, seed, squashY, self
varying vec4 vCol;
varying vec3 vN;
varying vec3 vV;
varying float vMode;
varying float vSeed;
${PUSH_GLSL}
void main() {
  vec3 p = position;
  vec3 wp = iA.xyz + vec3(p.x, p.y * iC.z, p.z) * iA.w;
  vN = normalize(p);
  vV = normalize(cameraPosition - wp);
  vCol = iB; vMode = iC.x; vSeed = iC.y;
  gl_Position = cdProject(wp, iC.w);
}`;
const SHELL_FRAG = /* glsl */`
uniform float uTime;
varying vec4 vCol;
varying vec3 vN;
varying vec3 vV;
varying float vMode;
varying float vSeed;
void main() {
  vec3 N = normalize(vN);
  float f = pow(1.0 - abs(dot(N, normalize(vV))), 2.0);
  vec3 c = vCol.rgb;
  float a;
  float add = 1.0;
  int m = int(vMode + 0.5);
  if (m == 1) {                                     // hexagon shield (Mega Mochi)
    vec2 uv = vec2(atan(N.z, N.x) * 3.8197, acos(clamp(N.y, -1.0, 1.0)) * 3.8197);
    vec2 r = vec2(1.0, 1.732);
    vec2 h = r * 0.5;
    vec2 a1 = mod(uv, r) - h;
    vec2 a2 = mod(uv - h, r) - h;
    vec2 g = dot(a1, a1) < dot(a2, a2) ? a1 : a2;
    vec2 ag = abs(g);
    float hx = max(dot(ag, normalize(vec2(1.0, 1.732))), ag.x);
    float line = smoothstep(0.38, 0.47, hx);
    a = vCol.a * (0.04 + 0.55 * f + 0.6 * line);
    c *= 1.0 + line * 0.5;
    add = 0.5;
  } else if (m == 2) {                              // dark core with bright rim (black hole)
    c = mix(vec3(0.07, 0.02, 0.16), vCol.rgb * 1.6, pow(f, 1.3));
    a = vCol.a;
    add = 0.0;
  } else {                                          // plain fresnel shell (bright rim, clear middle)
    a = vCol.a * (0.03 + 0.97 * pow(f, 1.4));
    c *= 1.0 + f * 0.5;
    add = 0.55;
  }
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, a * (1.0 - add));
  #include <colorspace_fragment>
}`;
class Shells {
  constructor(cap) {
    this.cap = cap; this.m = 0;
    const ico = new THREE.IcosahedronGeometry(1, 4);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', ico.attributes.position);
    this.iA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iC = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.iA); g.setAttribute('iB', this.iB); g.setAttribute('iC', this.iC);
    g.instanceCount = 0;
    this._attrs = [this.iA, this.iB, this.iC];
    this.geo = g;
  }
  make(uniforms) {
    this.mat = fxMaterial(SHELL_VERT, SHELL_FRAG, uniforms);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    return this.mesh;
  }
  begin() { this.m = 0; }
  now(x, y, z, R, c, alpha, mode = 0, squashY = 1, self = 1) {
    if (this.m >= this.cap || R <= 0.001) return;
    const j = this.m * 4;
    const A = this.iA.array, B = this.iB.array, Cc = this.iC.array;
    A[j] = x; A[j + 1] = y; A[j + 2] = z; A[j + 3] = R;
    B[j] = c.r; B[j + 1] = c.g; B[j + 2] = c.b; B[j + 3] = alpha;
    Cc[j] = mode; Cc[j + 1] = 0; Cc[j + 2] = squashY; Cc[j + 3] = self;
    this.m++;
  }
  end() {
    this.geo.instanceCount = this.m;
    for (const at of this._attrs) { at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(4, this.m * 4)); at.needsUpdate = true; }
  }
}

// ─────────────────────────────────────────────────────────────
// Shards: rounded mini-cubes (clay lit) with gravity, spin, one floor bounce
// ─────────────────────────────────────────────────────────────
const SA = 20;
class Shards {
  constructor(cap) {
    this.cap = cap; this.n = 0;
    this.d = new Float32Array(cap * SA);
    this.mat = createClayMaterial(0xffffff, { spec: 0.45, shininess: 50 });
    this.mesh = new THREE.InstancedMesh(roundedBoxGeometry(0.3, 2), this.mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  add(x, y, z, vx, vy, vz, size, c, mul = 1, life = 0.8) {
    if (this.n >= this.cap) return;
    const o = this.n * SA, d = this.d;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    d[o + 6] = rnd() * TAU; d[o + 7] = rnd() * TAU; d[o + 8] = rnd() * TAU;
    d[o + 9] = rr(-10, 10); d[o + 10] = rr(-10, 10); d[o + 11] = rr(-10, 10);
    d[o + 12] = 0; d[o + 13] = life; d[o + 14] = size;
    d[o + 15] = c.r * mul; d[o + 16] = c.g * mul; d[o + 17] = c.b * mul; d[o + 18] = 0;
    this.n++;
  }
  clear() { this.n = 0; this.mesh.count = 0; }
  update(dt) {
    const d = this.d;
    let i = 0;
    while (i < this.n) {
      const o = i * SA;
      const life = d[o + 12] + dt;
      if (life >= d[o + 13]) {
        const last = --this.n;
        if (i !== last) d.copyWithin(o, last * SA, last * SA + SA);
        continue;
      }
      d[o + 12] = life;
      d[o + 4] -= 25 * dt;
      d[o] += d[o + 3] * dt; d[o + 1] += d[o + 4] * dt; d[o + 2] += d[o + 5] * dt;
      const half = d[o + 14] * 0.5;
      if (d[o + 1] < half && d[o + 4] < 0) {
        d[o + 1] = half;
        if (d[o + 18] < 1) { d[o + 4] *= -0.35; d[o + 3] *= 0.6; d[o + 5] *= 0.6; d[o + 9] *= 0.5; d[o + 11] *= 0.5; d[o + 18] = 1; } else { d[o + 4] = 0; d[o + 3] *= 0.8; d[o + 5] *= 0.8; }
      }
      d[o + 6] += d[o + 9] * dt; d[o + 7] += d[o + 10] * dt; d[o + 8] += d[o + 11] * dt;
      i++;
    }
    const C = this.mesh.instanceColor.array;
    for (let k = 0; k < this.n; k++) {
      const o = k * SA;
      const t = d[o + 12] / d[o + 13];
      const s = d[o + 14] * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
      this._e.set(d[o + 6], d[o + 7], d[o + 8]);
      this._q.setFromEuler(this._e);
      this._p.set(d[o], d[o + 1], d[o + 2]);
      this._s.set(s, s, s);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(k, this._m);
      C[k * 3] = d[o + 15]; C[k * 3 + 1] = d[o + 16]; C[k * 3 + 2] = d[o + 17];
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

// ─────────────────────────────────────────────────────────────
// Ghosts: dash afterimages (fresnel-rim translucent cubes)
// ─────────────────────────────────────────────────────────────
const GHOST_VERT = /* glsl */`
attribute vec4 iGhost;
varying vec4 vCol;
varying vec3 vN;
varying vec3 vV;
${PUSH_GLSL}
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(position, 1.0);
  vN = normalize(mat3(m) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vCol = iGhost;
  gl_Position = cdProject(wp.xyz, 0.0);
}`;
const GHOST_FRAG = /* glsl */`
varying vec4 vCol;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
  vec3 c = vCol.rgb * (0.85 + f * 0.6);
  float a = vCol.a * (0.45 + 0.55 * f);
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, a * 0.85);
  #include <colorspace_fragment>
}`;
const GA = 14;
class Ghosts {
  constructor(cap) {
    this.cap = cap; this.n = 0;
    this.d = new Float32Array(cap * GA);
    this.iGhost = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this._geo = roundedBoxGeometry(0.22, 2).clone();
    this._geo.setAttribute('iGhost', this.iGhost);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
  }
  make(uniforms) {
    this.mat = fxMaterial(GHOST_VERT, GHOST_FRAG, uniforms);
    this.mesh = new THREE.InstancedMesh(this._geo, this.mat, this.cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 5;
    return this.mesh;
  }
  add(x, y, z, rotY, size, c, alpha = 0.55, life = 0.2) {
    if (this.n >= this.cap) { // recycle the oldest
      this.d.copyWithin(0, GA, this.n * GA); this.n--;
    }
    const o = this.n * GA, d = this.d;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = rotY; d[o + 4] = size;
    d[o + 5] = 0; d[o + 6] = life; d[o + 7] = c.r; d[o + 8] = c.g; d[o + 9] = c.b; d[o + 10] = alpha;
    this.n++;
  }
  clear() { this.n = 0; if (this.mesh) this.mesh.count = 0; }
  update(dt) {
    const d = this.d;
    let i = 0;
    while (i < this.n) {
      const o = i * GA;
      const life = d[o + 5] + dt;
      if (life >= d[o + 6]) { const last = --this.n; if (i !== last) d.copyWithin(o, last * GA, last * GA + GA); continue; }
      d[o + 5] = life; i++;
    }
    const G = this.iGhost.array;
    for (let k = 0; k < this.n; k++) {
      const o = k * GA;
      const t = d[o + 5] / d[o + 6];
      const s = d[o + 4];
      this._q.setFromAxisAngle(this._up, d[o + 3]);
      this._p.set(d[o], d[o + 1], d[o + 2]);
      this._s.set(s * 0.84 * (1 + t * 0.1), s * 0.86, s * 1.3 * (1 - t * 0.2));
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(k, this._m);
      G[k * 4] = d[o + 7]; G[k * 4 + 1] = d[o + 8]; G[k * 4 + 2] = d[o + 9]; G[k * 4 + 3] = d[o + 10] * (1 - t);
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.iGhost.needsUpdate = true;
  }
}

// ─────────────────────────────────────────────────────────────
// Lightning bolts (jagged camera-facing ribbons with branches)
// ─────────────────────────────────────────────────────────────
const BOLT_VERT = /* glsl */`
attribute vec2 aUv;
attribute vec4 aCol;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vUv = aUv; vCol = aCol;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;
const BOLT_FRAG = /* glsl */`
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float x = vUv.x;
  float core = exp(-x * x * 14.0);
  float glow = exp(-x * x * 2.2);
  vec3 c = mix(vCol.rgb * 1.3, vec3(2.0), core);
  float a = vCol.a * (glow * 0.7 + core);
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, 0.0);
  #include <colorspace_fragment>
}`;
const BOLT_SEG = 32;   // max segments per bolt
class Bolts {
  constructor(cap) {
    this.cap = cap;
    this.segs = new Float32Array(cap * BOLT_SEG * 7);   // ax ay az bx by bz width
    this.segN = new Int32Array(cap);
    this.life = new Float32Array(cap);
    this.max = new Float32Array(cap);
    this.col = new Float32Array(cap * 3);
    this.alive = new Uint8Array(cap);
    const V = cap * BOLT_SEG * 4;
    this.pos = new Float32Array(V * 3);
    this.uv = new Float32Array(V * 2);
    this.cols = new Float32Array(V * 4);
    const idx = new Uint32Array(cap * BOLT_SEG * 6);
    for (let s = 0; s < cap * BOLT_SEG; s++) {
      const v = s * 4, k = s * 6;
      idx[k] = v; idx[k + 1] = v + 1; idx[k + 2] = v + 2; idx[k + 3] = v + 2; idx[k + 4] = v + 1; idx[k + 5] = v + 3;
    }
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aUv = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.cols, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aUv', this.aUv); g.setAttribute('aCol', this.aCol);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    this.geo = g;
    this._pts = new Float32Array(20 * 3);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._d = new THREE.Vector3(); this._v = new THREE.Vector3(); this._side = new THREE.Vector3();
  }
  make(uniforms) {
    this.mat = fxMaterial(BOLT_VERT, BOLT_FRAG, uniforms, { side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    return this.mesh;
  }
  clear() { this.alive.fill(0); this.geo.setDrawRange(0, 0); }
  _path(pts, n, ax, ay, az, bx, by, bz, amp) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const env = Math.sin(t * Math.PI);
      pts[i * 3] = ax + (bx - ax) * t + (rnd() - 0.5) * amp * env;
      pts[i * 3 + 1] = ay + (by - ay) * t + (rnd() - 0.5) * amp * 0.3 * env;
      pts[i * 3 + 2] = az + (bz - az) * t + (rnd() - 0.5) * amp * env;
    }
  }
  spawn(ax, ay, az, bx, by, bz, c, { width = 0.34, life = TUNE.bolt.life, branches = 2, amp = 1.3 } = {}) {
    let slot = -1;
    for (let i = 0; i < this.cap; i++) if (!this.alive[i]) { slot = i; break; }
    if (slot < 0) { // steal the oldest
      let best = 0, bt = -1;
      for (let i = 0; i < this.cap; i++) if (this.life[i] > bt) { bt = this.life[i]; best = i; }
      slot = best;
    }
    const S = this.segs, base = slot * BOLT_SEG * 7;
    let s = 0;
    const pts = this._pts;
    const N = 16;
    this._path(pts, N, ax, ay, az, bx, by, bz, amp);
    for (let i = 0; i < N - 1 && s < BOLT_SEG; i++, s++) {
      const o = base + s * 7;
      S[o] = pts[i * 3]; S[o + 1] = pts[i * 3 + 1]; S[o + 2] = pts[i * 3 + 2];
      S[o + 3] = pts[i * 3 + 3]; S[o + 4] = pts[i * 3 + 4]; S[o + 5] = pts[i * 3 + 5];
      S[o + 6] = width * (1 - (i / N) * 0.35);
    }
    for (let b = 0; b < branches; b++) {
      const k = 3 + ((rnd() * (N - 7)) | 0);
      const sx = pts[k * 3], sy = pts[k * 3 + 1], sz = pts[k * 3 + 2];
      const len = rr(1.2, 2.6);
      const ang = rnd() * TAU;
      const ex = sx + Math.cos(ang) * len, ez = sz + Math.sin(ang) * len, ey = Math.max(0.1, sy - len * rr(0.6, 1.2));
      const M = 7;
      let px = sx, py = sy, pz = sz;
      for (let i = 1; i < M && s < BOLT_SEG; i++, s++) {
        const t = i / (M - 1);
        const qx = sx + (ex - sx) * t + (rnd() - 0.5) * 0.5, qy = sy + (ey - sy) * t, qz = sz + (ez - sz) * t + (rnd() - 0.5) * 0.5;
        const o = base + s * 7;
        S[o] = px; S[o + 1] = py; S[o + 2] = pz; S[o + 3] = qx; S[o + 4] = qy; S[o + 5] = qz;
        S[o + 6] = width * 0.5 * (1 - t * 0.6);
        px = qx; py = qy; pz = qz;
      }
    }
    this.segN[slot] = s;
    this.life[slot] = 0; this.max[slot] = life;
    this.col[slot * 3] = c.r; this.col[slot * 3 + 1] = c.g; this.col[slot * 3 + 2] = c.b;
    this.alive[slot] = 1;
  }
  update(dt, camPos, steady) {
    let v = 0;
    const P = this.pos, U = this.uv, Cc = this.cols;
    for (let b = 0; b < this.cap; b++) {
      if (!this.alive[b]) continue;
      this.life[b] += dt;
      const t = this.life[b] / this.max[b];
      if (t >= 1) { this.alive[b] = 0; continue; }
      const flick = steady ? 1 - t : (1 - t) * (0.55 + 0.45 * ((((this.life[b] * 30) | 0) % 3) ? 1 : 0.25));
      const r = this.col[b * 3], g = this.col[b * 3 + 1], bl = this.col[b * 3 + 2];
      const base = b * BOLT_SEG * 7;
      for (let s = 0; s < this.segN[b]; s++) {
        const o = base + s * 7;
        this._a.set(this.segs[o], this.segs[o + 1], this.segs[o + 2]);
        this._b.set(this.segs[o + 3], this.segs[o + 4], this.segs[o + 5]);
        this._d.subVectors(this._b, this._a);
        this._v.subVectors(camPos, this._a);
        this._side.crossVectors(this._d, this._v).normalize().multiplyScalar(this.segs[o + 6] * (1 + t * 0.6));
        const j = v * 3, k = v * 2, q = v * 4;
        P[j] = this._a.x - this._side.x; P[j + 1] = this._a.y - this._side.y; P[j + 2] = this._a.z - this._side.z;
        P[j + 3] = this._a.x + this._side.x; P[j + 4] = this._a.y + this._side.y; P[j + 5] = this._a.z + this._side.z;
        P[j + 6] = this._b.x - this._side.x; P[j + 7] = this._b.y - this._side.y; P[j + 8] = this._b.z - this._side.z;
        P[j + 9] = this._b.x + this._side.x; P[j + 10] = this._b.y + this._side.y; P[j + 11] = this._b.z + this._side.z;
        U[k] = -1; U[k + 1] = 0; U[k + 2] = 1; U[k + 3] = 0; U[k + 4] = -1; U[k + 5] = 1; U[k + 6] = 1; U[k + 7] = 1;
        for (let z = 0; z < 4; z++) { Cc[q + z * 4] = r; Cc[q + z * 4 + 1] = g; Cc[q + z * 4 + 2] = bl; Cc[q + z * 4 + 3] = flick; }
        v += 4;
      }
    }
    this.geo.setDrawRange(0, (v / 4) * 6);
    if (v > 0) {
      this.aPos.clearUpdateRanges(); this.aPos.addUpdateRange(0, v * 3); this.aPos.needsUpdate = true;
      this.aUv.clearUpdateRanges(); this.aUv.addUpdateRange(0, v * 2); this.aUv.needsUpdate = true;
      this.aCol.clearUpdateRanges(); this.aCol.addUpdateRange(0, v * 4); this.aCol.needsUpdate = true;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Dash ribbon (camera-facing strip following the hero)
// ─────────────────────────────────────────────────────────────
const RIB_VERT = /* glsl */`
attribute vec2 aUv;
attribute vec4 aCol;
varying vec2 vUv;
varying vec4 vCol;
${PUSH_GLSL}
void main() { vUv = aUv; vCol = aCol; gl_Position = cdProject(position, 0.0); }`;
const RIB_FRAG = /* glsl */`
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float across = abs(vUv.y);
  float a = vCol.a * (1.0 - across * across) * (0.5 + 0.5 * (1.0 - vUv.x));
  vec3 c = mix(vCol.rgb * 1.1, vec3(1.15), (1.0 - smoothstep(0.0, 0.3, across)) * 0.3);
  if (a < 0.003) discard;
  gl_FragColor = vec4(c * a, a * 0.9);
  #include <colorspace_fragment>
}`;
const RIB_N = 32;
class Ribbon {
  constructor() {
    this.px = new Float32Array(RIB_N); this.py = new Float32Array(RIB_N); this.pz = new Float32Array(RIB_N); this.pt = new Float32Array(RIB_N);
    this.count = 0; this.head = 0; this.clock = 0;
    this.colors = [col(0xffffff)];
    const V = RIB_N * 2;
    this.pos = new Float32Array(V * 3); this.uv = new Float32Array(V * 2); this.cols = new Float32Array(V * 4);
    const idx = [];
    for (let i = 0; i < RIB_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aUv = new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.cols, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aUv', this.aUv); g.setAttribute('aCol', this.aCol);
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.geo = g;
    this._t = new THREE.Vector3(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
  }
  make(uniforms) {
    this.mat = fxMaterial(RIB_VERT, RIB_FRAG, uniforms, { side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    return this.mesh;
  }
  clear() { this.count = 0; this.geo.setDrawRange(0, 0); }
  push(x, y, z) {
    if (this.count > 0) {
      const h = this.head;
      const dx = x - this.px[h], dz = z - this.pz[h];
      if (dx * dx + dz * dz < 0.0144) { this.pt[h] = this.clock; return; }
    }
    this.head = (this.head + 1) % RIB_N;
    this.px[this.head] = x; this.py[this.head] = y; this.pz[this.head] = z; this.pt[this.head] = this.clock;
    this.count = Math.min(RIB_N, this.count + 1);
  }
  update(dt, camPos, life, width) {
    this.clock += dt;
    while (this.count > 0) { // drop expired tail points
      const tail = (this.head - this.count + 1 + RIB_N) % RIB_N;
      if (this.clock - this.pt[tail] > life) this.count--; else break;
    }
    const n = this.count;
    if (n < 2) { this.geo.setDrawRange(0, 0); return; }
    const P = this.pos, U = this.uv, Cc = this.cols;
    const nc = this.colors.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.head - i + RIB_N) % RIB_N;
      const nxt = (this.head - Math.min(i + 1, n - 1) + RIB_N) % RIB_N;
      const prv = (this.head - Math.max(i - 1, 0) + RIB_N) % RIB_N;
      this._t.set(this.px[prv] - this.px[nxt], this.py[prv] - this.py[nxt], this.pz[prv] - this.pz[nxt]);
      this._v.set(camPos.x - this.px[idx], camPos.y - this.py[idx], camPos.z - this.pz[idx]);
      this._s.crossVectors(this._t, this._v);
      const sl = this._s.length() || 1;
      const age = clamp((this.clock - this.pt[idx]) / life, 0, 1);
      const u = i / (n - 1);
      const w = width * (1 - u) * (1 - age * 0.6) * 0.5;
      this._s.multiplyScalar(w / sl);
      const j = i * 6;
      P[j] = this.px[idx] - this._s.x; P[j + 1] = this.py[idx] - this._s.y; P[j + 2] = this.pz[idx] - this._s.z;
      P[j + 3] = this.px[idx] + this._s.x; P[j + 4] = this.py[idx] + this._s.y; P[j + 5] = this.pz[idx] + this._s.z;
      U[i * 4] = u; U[i * 4 + 1] = -1; U[i * 4 + 2] = u; U[i * 4 + 3] = 1;
      const cf = u * (nc - 1);
      const c0 = this.colors[Math.floor(cf)], c1 = this.colors[Math.min(nc - 1, Math.floor(cf) + 1)];
      this._c.copy(c0).lerp(c1, cf - Math.floor(cf));
      const a = 0.85 * (1 - age);
      for (let z = 0; z < 2; z++) { const q = i * 8 + z * 4; Cc[q] = this._c.r; Cc[q + 1] = this._c.g; Cc[q + 2] = this._c.b; Cc[q + 3] = a; }
    }
    this.geo.setDrawRange(0, (n - 1) * 6);
    this.aPos.needsUpdate = true; this.aUv.needsUpdate = true; this.aCol.needsUpdate = true;
  }
}

// ─────────────────────────────────────────────────────────────
// Freed cubes: happy pastel friends (CubeCrowd JOY faces + waving hands)
// ─────────────────────────────────────────────────────────────
const FA = 12;
class Freed {
  constructor(cap) {
    this.cap = cap; this.n = 0;
    this.d = new Float32Array(cap * FA);
    this.crowd = new CubeCrowd(cap);
    this.handMat = createClayMaterial(0xffffff, { spec: 0.3 });
    this.hands = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), this.handMat, cap * 2);
    this.hands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hands.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.hands.frustumCulled = false;
    this.hands.count = 0;
    // plum outline hull (sticker read on light floors) + contact shadows (height read)
    this.outlineMat = new THREE.MeshBasicMaterial({ color: HEX.plum, side: THREE.BackSide, fog: false });
    this.outline = new THREE.InstancedMesh(roundedBoxGeometry(0.22, 3), this.outlineMat, cap);
    this.outline.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.outline.frustumCulled = false;
    this.outline.count = 0;
    this.shadows = new BlobShadows(cap);
    this.colors = PAL.freed.map((h) => col(h));
    this.gold = col(HEX.gold);
    this.o = { x: 0, y: 0, z: 0, sx: 1, sy: 1, sz: 1, rotX: 0, rotY: 0, rotZ: 0, color: this.colors[0], expr: EXPR.JOY, blink: 0, lookX: 0, lookY: 0, flash: 0, glow: 0 };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._hc = new THREE.Color();
  }
  add(x, y, z, size, golden) {
    if (this.n >= this.cap) return -1;
    const o = this.n * FA, d = this.d;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size; d[o + 4] = 0;
    d[o + 5] = golden ? -1 : (rnd() * this.colors.length) | 0;
    d[o + 6] = rnd() * TAU; d[o + 7] = rr(0.8, 1.2); d[o + 8] = rr(-0.25, 0.25); d[o + 9] = 0; d[o + 10] = rr(0.9, 1.15);
    return this.n++;
  }
  clear() { this.n = 0; this.crowd.count = 0; this.hands.count = 0; this.outline.count = 0; this.shadows.begin(); this.shadows.end(); }
  /** returns via callback each live cube's rocket phase for sparkle trails */
  update(dt, emit) {
    const d = this.d, T = TUNE.freed;
    let i = 0;
    while (i < this.n) {
      const o = i * FA;
      const life = d[o + 4] + dt;
      if (life >= T.life * d[o + 10]) { const last = --this.n; if (i !== last) d.copyWithin(o, last * FA, last * FA + FA); continue; }
      d[o + 4] = life; i++;
    }
    const fo = this.o;
    const HC = this.hands.instanceColor.array;
    this.shadows.begin();
    for (let k = 0; k < this.n; k++) {
      const o = k * FA;
      const L = T.life * d[o + 10];
      const t = d[o + 4];
      const size = d[o + 3];
      const golden = d[o + 5] < 0;
      const c = golden ? this.gold : this.colors[d[o + 5] | 0];
      let y, sc, sx = 1, sy = 1, rotY, rotZ = 0, handUp = 0, wave = 0;
      const popEnd = T.pop, waveEnd = T.pop + T.wave;
      if (t < popEnd) {
        const u = t / popEnd;
        const e = easeOutBack(u);
        y = d[o + 1] + (1.3 - d[o + 1] + size * 0.5) * e;
        sc = 0.35 + 0.65 * e;
        rotY = (1 - u) * TAU * d[o + 7];
        sy = 1 + Math.sin(u * Math.PI) * 0.25; sx = 1 - Math.sin(u * Math.PI) * 0.12;
        handUp = u;
      } else if (t < waveEnd) {
        const u = (t - popEnd) / T.wave;
        y = 1.3 + size * 0.5 + Math.sin(u * TAU) * 0.06;
        sc = 1;
        rotY = Math.sin(u * TAU * 1.5) * 0.25;
        rotZ = Math.sin(u * TAU * 2) * 0.12;
        const sq = Math.abs(Math.sin(u * TAU * 2));
        sy = 1 - sq * 0.08; sx = 1 + sq * 0.05;
        handUp = 1; wave = Math.sin(u * TAU * 4);
      } else {
        const u = (t - waveEnd) / Math.max(0.01, L - waveEnd);
        const tau = t - waveEnd;
        y = 1.3 + size * 0.5 + 3 * tau + 16 * tau * tau;
        sc = u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;
        rotY = tau * 9;
        sy = 1.3; sx = 0.8;
        handUp = 1.4;
        if (emit) emit(d[o], y - size * 0.5, d[o + 2], golden, u, 2);
      }
      const s = size * sc;
      if (golden && emit && t < waveEnd) emit(d[o], y, d[o + 2], true, t / waveEnd, 1);
      fo.x = d[o]; fo.y = y; fo.z = d[o + 2];
      fo.sx = s * sx; fo.sy = s * sy; fo.sz = s * sx;
      fo.rotY = rotY + d[o + 8]; fo.rotZ = rotZ; fo.rotX = 0;
      fo.color = c;
      fo.glow = golden ? 0.35 + 0.15 * Math.sin(t * 20) : 0.06;
      fo.expr = EXPR.JOY;
      this.crowd.set(k, fo);
      this._e.set(0, fo.rotY, rotZ, 'YXZ');
      this._q.setFromEuler(this._e);
      this._p.set(fo.x, fo.y, fo.z);
      this._s.set(fo.sx + 0.07, fo.sy + 0.07, fo.sz + 0.07);
      this._m.compose(this._p, this._q, this._s);
      this.outline.setMatrixAt(k, this._m);
      this.shadows.add(fo.x, fo.z, s * 0.9, Math.max(0, y - s * 0.5));
      // hands
      this._hc.copy(c).multiplyScalar(0.8);
      for (let h = 0; h < 2; h++) {
        const sd = h ? 1 : -1;
        const up = handUp * (h ? 1 : 0.7);
        const hx = sd * (0.5 * sx + 0.1);
        const hy = -0.05 + up * 0.55 + (h ? wave * 0.12 : 0);
        const hz = 0.05 + (h ? wave * 0.1 : 0);
        this._e.set(0, fo.rotY, rotZ, 'YXZ');
        this._q.setFromEuler(this._e);
        this._p.set(hx * s, hy * s * sy, hz * s).applyQuaternion(this._q);
        this._p.x += fo.x; this._p.y += fo.y; this._p.z += fo.z;
        const hs = 0.19 * s;
        this._s.set(hs, hs, hs);
        this._m.compose(this._p, this._q, this._s);
        this.hands.setMatrixAt(k * 2 + h, this._m);
        const q = (k * 2 + h) * 3;
        HC[q] = this._hc.r; HC[q + 1] = this._hc.g; HC[q + 2] = this._hc.b;
      }
    }
    this.crowd.count = this.n;
    this.crowd.commit();
    this.outline.count = this.n;
    this.outline.instanceMatrix.needsUpdate = true;
    this.shadows.end();
    this.hands.count = this.n * 2;
    this.hands.instanceMatrix.needsUpdate = true;
    this.hands.instanceColor.needsUpdate = true;
  }
}

// ─────────────────────────────────────────────────────────────
// Timeline effects (multi-stage): fixed pool of plain objects
// ─────────────────────────────────────────────────────────────
const K = { PORTAL: 1, PILLAR: 2, SHELL: 3, VORTEX: 4, BIGBANG: 5, MEGA: 6, STORM: 7, BLACKHOLE: 8, GATE: 9, RAIN: 10, CHARGE: 11 };
function newEv() {
  return { on: false, kind: 0, t: 0, dur: 1, x: 0, y: 0, z: 0, r: 1, a: 0, b: 0, c: 0, e: 0, n: 0, f1: 0, f2: 0, f3: 0, acc: 0, color: new THREE.Color(), game: false };
}

// inline palettes hoisted out of hot paths (zero per-frame allocation)
const IP_GOLD = [HEX.gold, 0xfff3b0, HEX.white];
const IP0 = [HEX.white, HEX.cyanSoft];
const IP1 = [HEX.white];
const IP2 = [HEX.storm, HEX.cyanSoft, HEX.white];
const IP3 = [HEX.star, HEX.cyan, 0xff9ed8];
const IP4 = [0xfff05a, 0x7ff6ff, 0xff9ed8, 0xb8f2e6];
const IP5 = [HEX.gold, 0xfff3b0, HEX.white];
const IP6 = [HEX.white, HEX.star, 0xfff3b0];
const IP7 = [HEX.white, HEX.star, HEX.orange];
const IP8 = [HEX.white, 0xffd0d6];
const IP9 = [HEX.star, 0xfff3b0];
const IP10 = [HEX.pinkSoft, HEX.white];
const IP11 = [HEX.cyan, HEX.white, HEX.pinkSoft];
const IP12 = [HEX.gold, HEX.white];
const IP13 = [HEX.cyan, HEX.white];
const IP14 = [HEX.gold, 0xfff3b0];
const IP15 = [HEX.magenta, HEX.white];
const IP16 = [HEX.gold, HEX.white, 0xff7ab8, HEX.cyan];
const IP17 = [HEX.violet, 0xd9c8ff, HEX.white];
const IP18 = [HEX.teleWhite, HEX.orange, HEX.white];
const IP19 = [HEX.teleWhite, HEX.white];
const IP20 = [HEX.cyan, HEX.white, 0xd9c8ff];
const IP21 = [HEX.cyan, HEX.white, HEX.cyanSoft];
const IP22 = [HEX.mega, HEX.white, 0xffc1dc];
const IP23 = [HEX.mega, HEX.white];
const IP24 = [HEX.storm, HEX.white];
const IP25 = [HEX.violet, 0xff7ad9, HEX.white, 0xd9c8ff];
const IP26 = [HEX.violet, 0xff7ad9, HEX.white];
const IP27 = [HEX.white, 0xd9c8ff, 0xfff3b0];

// ─────────────────────────────────────────────────────────────
// Feedback Director: bus event → handler (the "juice table")
// ─────────────────────────────────────────────────────────────
const DIRECTOR = {
  'enemy:smash': 'onSmash', 'enemy:freed': 'onFreed', 'enemy:bonk': 'onBonk', 'enemy:spawnWarn': 'onSpawnWarn',
  'enemy:spawn': 'onSpawn', 'enemy:explode': 'onExplode', 'enemy:split': 'onSplit', 'enemy:dizzy': 'onDizzy',
  'player:dash': 'onDash', 'player:dashEnd': 'onDashEnd', 'player:perfect': 'onPerfect', 'player:nearMiss': 'onNearMiss',
  'player:hurt': 'onHurt', 'player:heal': 'onHeal', 'player:shieldBlock': 'onShieldBlock', 'player:staminaEmpty': 'onStaminaEmpty',
  'player:spawn': 'onPlayerSpawn', 'player:revive': 'onRevive', 'player:secondChance': 'onSecondChance', 'player:death': 'onDeath',
  'checkpoint': 'onCheckpoint', 'nova': 'onNova', 'nova:ready': 'onNovaReady', 'combo:milestone': 'onMilestone', 'fever': 'onFever',
  'pickup:crystal': 'onCrystal', 'pickup:heart': 'onHeartPickup', 'pickup:coin': 'onCoin', 'pickup:magnet': 'onMagnet',
  'boss:slam': 'onBossSlam', 'boss:hit': 'onBossHit', 'boss:defeat': 'onBossDefeat', 'boss:phase': 'onBossPhase',
  'run:end': 'onRunEnd', 'gate:open': 'onGateOpen', 'gate:close': 'onGateClose', 'settings:change': 'onSettings',
};

export class FX {
  constructor(G) {
    this.G = G;
    const low = G.quality === 'low';
    this.low = low;
    const cap = low ? TUNE.pools.low : TUNE.pools.high;
    this.emitBase = low ? TUNE.emitLow : 1;
    this.emit = this.emitBase;
    this.deco = this.emitBase;
    this.reduceFlash = !!G.save?.profile?.settings?.reduceFlash;

    // shared uniforms (one object each, referenced by every FX material)
    this.U = {
      uPush: { value: TUNE.depthPush },
      uHero: { value: new THREE.Vector3(0, 0, 0) },
      uTime: { value: 0 },
    };
    const U = this.U;

    this.root = new THREE.Group();
    this.root.name = 'fx';
    this.sp = new Sprites(cap.sprites);
    this.rings = new Rings(cap.rings);
    this.beams = new Beams(cap.beams);
    this.shells = new Shells(cap.shells);
    this.shards = new Shards(cap.shards);
    this.ghosts = new Ghosts(cap.ghosts);
    this.bolts = new Bolts(cap.bolts);
    this.ribbon = new Ribbon();
    this.freed = new Freed(cap.freed);
    this.root.add(
      this.rings.make({ uPush: U.uPush, uHero: U.uHero, uTime: U.uTime }),
      this.ribbon.make({ uPush: U.uPush }),
      this.ghosts.make({ uPush: U.uPush }),
      this.sp.make({ uPush: U.uPush, uHero: U.uHero }),
      this.beams.make({ uPush: U.uPush, uTime: U.uTime }),
      this.shells.make({ uPush: U.uPush, uTime: U.uTime }),
      this.bolts.make({}),
      this.shards.mesh, this.freed.crowd.mesh, this.freed.hands, this.freed.outline, this.freed.shadows.mesh,
    );
    G.scene?.add(this.root);

    this.evs = [];
    for (let i = 0; i < cap.events; i++) this.evs.push(newEv());

    // dash state
    this.dash = { on: false, t: 0, n: 0, heroId: 'blu', x0: 0, z0: 0, dirX: 0, dirZ: 1, size: 1, colors: [col(0xffffff)], trail: 'default', emitAcc: 0, blinkFrom: null };
    this._blinkFrom = { x: 0, z: 0, has: false };
    this.knockAcc = 0; this.dustAcc = 0; this.heroDustAcc = 0; this.freedTrailAcc = 0;
    this.lastRain = -99;
    this._warm = 2;
    this.clock = 0;
    this.extBoltT = -99;
    this._cam = new THREE.Vector3();
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
    this._c = new THREE.Color();
    this._trailCache = new Map();

    // wire the director (listeners only; systems looked up lazily)
    this._offs = [];
    const bus = G.bus;
    if (bus) {
      for (const ev of Object.keys(DIRECTOR)) {
        const fn = this[DIRECTOR[ev]];
        if (typeof fn === 'function') this._offs.push(bus.on(ev, (p) => { try { fn.call(this, p || {}); } catch (err) { console.error('[fx]', ev, err); } }));
      }
    }
    this._prewarm();
  }

  // =========================================================
  // frame
  // =========================================================
  update(dt, rdt) {
    dt = Math.max(0, dt || 0); rdt = Math.max(0, rdt || 0);
    const G = this.G;
    const st = G.run?.state;
    const frozen = st === 'paused' || st === 'levelup';
    const scale = G.time?.scale ?? (rdt > 0 ? dt / rdt : 1);
    // particle clock: slow-mo stays cinematic, hit-stop keeps breathing
    const fdt = frozen ? 0 : (scale <= 0.001 ? rdt * TUNE.hitStopRate : Math.max(dt, rdt * TUNE.minTimeScale));
    const gdt = frozen ? 0 : dt;                               // gameplay-synced timelines
    const ndt = frozen ? 0 : Math.max(dt, rdt * 0.6);          // cinematic timelines (nova etc.)
    this.clock += rdt;
    this.U.uTime.value = this.clock;
    const cam = G.camera;
    if (cam) cam.getWorldPosition(this._cam);

    // hero proximity fade + focus mode (decorative emission halves in crowded waves)
    const pl = G.run?.player;
    if (pl && Number.isFinite(pl.x)) this.U.uHero.value.set(pl.x, pl.z, 1); else this.U.uHero.value.z = 0;
    const list = G.run?.enemies?.list;
    const crowd = list ? list.length : 0;
    this.deco = this.emitBase * (crowd > TUNE.focus.enemies ? TUNE.focus.mult : 1);
    this.emit = this.emitBase;

    this.rings.begin(); this.beams.begin(); this.shells.begin();
    if (this._warm > 0) { // compile beam/shell programs on the first frames
      this._warm--;
      this.beams.now(0, 0, -60, 0.001, 0.001, col(HEX.white), 0);
      this.shells.now(0, -60, 0, 0.001, col(HEX.white), 0);
    }

    // timelines
    for (let i = 0; i < this.evs.length; i++) {
      const e = this.evs[i];
      if (!e.on) continue;
      const edt = e.game ? gdt : ndt;
      e.t += edt;
      this._tick(e, edt, fdt);
    }
    // dash afterimages + ribbon
    this._tickDash(gdt, fdt);
    // streaks behind knocked cubes, ambient dust behind fast cubes
    if (list && crowd && fdt > 0) this._tickEnemies(list, fdt);
    if (pl && fdt > 0) this._tickHero(pl, fdt);

    // systems
    this.sp.update(fdt);
    this.rings.update(fdt);
    this.shards.update(fdt);
    this.ghosts.update(fdt);
    this.freedTrailAcc -= fdt;
    const trailNow = this.freedTrailAcc <= 0;
    if (trailNow) this.freedTrailAcc = this.low ? 0.06 : 0.03;
    this.freed.update(fdt, trailNow ? this._freedTrail : null);
    this.bolts.update(fdt, this._cam, this.reduceFlash);
    this.ribbon.update(fdt, this._cam, TUNE.dash.ribbonLife, TUNE.dash.ribbonWidth * (this.dash.size || 1));
    this.rings.end(); this.beams.end(); this.shells.end();
  }

  /** remove every live effect (run dispose / restart) */
  clear() {
    this.sp.clear(); this.rings.clear(); this.shards.clear(); this.ghosts.clear(); this.bolts.clear();
    this.ribbon.clear(); this.freed.clear();
    for (const e of this.evs) e.on = false;
    this.dash.on = false;
    this._blinkFrom.has = false;
  }

  dispose() {
    this.clear();
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    this.root.parent?.remove(this.root);
    this.root.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }

  // =========================================================
  // public burst API: 'shards'|'sparks'|'dust'|'confetti'|'ring'|'stars'|'heal'|'crystal'
  //   (+ 'sparkle','hearts','flash','smash','bonk','explode','bubbles','steam','streaks')
  // =========================================================
  burst(kind, x = 0, y = 0, z = 0, opts = {}) {
    const o = opts || {};
    const n = o.count;
    switch (kind) {
      case 'shards': this._shards(x, y || 0.5, z, n ?? 10, o.color ?? 0xef4b3c, o.dirX ?? 0, o.dirZ ?? 0, o.size ?? 0.18, o.speed ?? 1); break;
      case 'sparks': this._sparks(x, y || 0.5, z, n ?? 12, o.colors || (o.color != null ? [o.color] : PAL.sparkWarm), o.speed ?? 10, o.life ?? 0.35, !!o.self); break;
      case 'sparkle': this._sparkles(x, y || 0.6, z, n ?? 8, o.colors || (o.color != null ? [o.color] : IP0), o.radius ?? 0.8, !!o.self); break;
      case 'dust': this._dust(x, z, n ?? 8, o.radius ?? 0.5, o.speed ?? 3, o.size ?? 0.45); break;
      case 'confetti': this._confettiBurst(x, y || 1, z, n ?? TUNE.confetti.burst, !!o.self); break;
      case 'ring': this.rings.anim(x, z, o.r0 ?? 0.2, o.radius ?? 2.5, o.life ?? 0.35, o.color ?? HEX.white, o.alpha ?? 0.9, { t0: o.thick ?? 0.35, t1: 0.08, self: o.self ? 1 : 0 }); break;
      case 'stars': this._stars(x, y || 0.9, z, n ?? 4, o.size ?? 0.42); break;
      case 'heal': case 'hearts': this._hearts(x, y || 0.8, z, n ?? 5, o.self ?? true); break;
      case 'crystal': this._gemGlints(x, y || 0.5, z, n ?? 3, o.color ?? HEX.cyan); break;
      case 'flash': this._flash(x, y || 0.6, z, o.size ?? 1.5, o.color ?? HEX.white, o.life ?? 0.14); break;
      case 'smash': this.onSmash({ x, z, y, ...o }); break;
      case 'bonk': this.onBonk({ x, z, strength: o.strength ?? 1 }); break;
      case 'explode': this.onExplode({ x, z, radius: o.radius ?? 3 }); break;
      case 'bubbles': this._bubbles(x, y || 0.6, z, n ?? 8, o.color ?? HEX.cyanSoft); break;
      case 'steam': this._steam(x, y || 1.3, z, n ?? 5); break;
      case 'bolt': this.bolt(x, z, o); break;
      default: this._sparkles(x, y || 0.6, z, n ?? 6, IP1, 0.6, false);
    }
  }

  /** lightning strike at (x, z) — Zap's storm (gameplay may call this per target) */
  bolt(x, z, opts = {}) {
    if (!opts.auto) this.extBoltT = this.clock;
    const c = col(opts.color ?? HEX.storm);
    const top = TUNE.bolt.top;
    const fx = opts.fromX, fy = opts.fromY, fz = opts.fromZ;
    const sx = fx ?? x + rr(-2, 2), sy = fy ?? top, sz = fz ?? z + rr(-3, -1);
    this.bolts.spawn(sx, sy, sz, x, opts.y ?? 0.15, z, c, { width: opts.width ?? 0.36, amp: opts.amp ?? 1.4, branches: opts.branches ?? 2 });
    this.bolts.spawn(sx, sy, sz, x, opts.y ?? 0.15, z, col(HEX.white), { width: 0.16, amp: 0.9, branches: 0, life: 0.18 });
    if (opts.impact !== false) {
      this.rings.anim(x, z, 0.2, 1.9, 0.3, HEX.storm, 0.95, { t0: 0.4, t1: 0.08 });
      this.rings.anim(x, z, 0.1, 1.0, 0.22, HEX.white, 0.9, { t0: 0.25, t1: 0.05 });
      this._sparks(x, 0.3, z, Math.round(12 * this.emit), IP2, 9, 0.3, false);
      this._flash(x, 0.4, z, 1.6, HEX.storm, 0.12);
      this._dust(x, z, Math.round(4 * this.deco), 0.4, 3, 0.35);
    }
  }

  // =========================================================
  // Director handlers
  // =========================================================
  onSmash(p) {
    const x = p.x ?? 0, z = p.z ?? 0, size = sizeOf(p.size);
    const y = p.y ?? size * 0.5;
    const R = TUNE.smash;
    const k = p.byNova ? 0.5 : 1;
    const shards = Math.round((size >= 1.8 ? R.shardsXL : size >= 1.3 ? R.shardsL : R.shards) * this.emit * k);
    this._shards(x, y, z, shards, p.color ?? 0xef4b3c, p.dirX ?? 0, p.dirZ ?? 0, 0.17 + size * 0.1, 1);
    this._sparks(x, y, z, Math.round(R.sparks * this.emit * k), PAL.sparkWarm, 11, 0.34, false);
    this._sparkles(x, y + 0.3, z, Math.round(4 * this.deco * k), IP3, 0.6, false);
    const combo = p.combo | 0;
    const ringHex = combo >= 10 ? PAL.rainbow[combo % PAL.rainbow.length] : combo >= 5 ? HEX.gold : combo >= 3 ? HEX.cyan : 0x9ff3ff;
    this.rings.anim(x, z, 0.3 * size, R.ring * (0.8 + size * 0.25) * (p.byNova ? 0.7 : 1), R.ringTime, ringHex, 0.95, { t0: 0.42, t1: 0.08 });
    if (!p.byNova) this._flash(x, y, z, R.flash * (0.7 + size * 0.35), 0xfff6c8, 0.13, SH.BURST);
    this._dust(x, z, Math.round(4 * this.deco * k), 0.3 * size, 2.5, 0.35 + size * 0.1);
  }

  onFreed(p) {
    const x = p.x ?? 0, z = p.z ?? 0, size = clamp(sizeOf(p.size) * 0.78, 0.5, 1.05);
    const golden = p.golden ?? (rnd() < TUNE.freed.goldChance);
    if (this.freed.add(x, size * 0.5, z, size, golden) < 0) return;
    this._sparkles(x, 0.9, z, Math.round(6 * this.deco), IP4, 0.7, false);
    if (golden) {
      this.rings.anim(x, z, 0.3, 2.2, 0.45, HEX.gold, 1, { t0: 0.4, t1: 0.1 });
      this._sparkles(x, 1.2, z, 16, IP5, 1.1, false);
      this.G.bus?.emit('fx:goldenFreed', { x, z });
    }
  }

  onBonk(p) {
    const x = p.x ?? 0, z = p.z ?? 0, s = clamp(p.strength ?? 1, 0.5, 2);
    const R = TUNE.bonk;
    this._stars(x, 1.1, z, Math.round(R.stars * (0.75 + s * 0.25)) + 1, 0.46 + 0.08 * s);
    this._sparks(x, 0.7, z, Math.round(R.sparks * this.emit * s), IP6, 8, 0.3, false);
    this.rings.anim(x, z, 0.2, R.ring * (0.8 + 0.3 * s), 0.28, HEX.star, 0.95, { t0: 0.34, t1: 0.06 });
    this._flash(x, 0.8, z, 1.3 * (0.8 + 0.2 * s), 0xfff3b0, 0.12, SH.BURST);
  }

  onSpawnWarn(p) {
    const e = this._ev(K.PORTAL);
    if (!e) return;
    e.game = true;
    e.x = p.x ?? 0; e.z = p.z ?? 0;
    e.r = 0.55 + sizeOf(p.size) * 0.55;
    e.dur = Math.max(0.3, p.delay ?? GT.spawn?.portalTime ?? 1.1);
    e.a = 0; e.f1 = 0; e.c = rnd() * 6;
  }

  onSpawn(p) {
    const x = p.x ?? 0, z = p.z ?? 0, size = sizeOf(p.size);
    // close the matching portal early (collapse)
    for (const e of this.evs) {
      if (e.on && e.kind === K.PORTAL && !e.f1) {
        const dx = e.x - x, dz = e.z - z;
        if (dx * dx + dz * dz < 1.0) { e.f1 = 1; e.a = 0; }
      }
    }
    this._dust(x, z, Math.round(8 * this.deco + 2), 0.35 * size, 3.2, 0.42);
    this.rings.anim(x, z, 0.3, 1.2 + size * 0.6, 0.3, HEX.white, 0.8, { t0: 0.3, t1: 0.05 });
  }

  onExplode(p) {
    const x = p.x ?? 0, z = p.z ?? 0, R = p.radius ?? 3;
    this.rings.anim(x, z, 0.3, R, 0.26, HEX.orange, 1, { t0: 0.6, t1: 0.1 });
    this.rings.anim(x, z, 0.2, R * 1.1, 0.4, 0xfff3b0, 0.8, { t0: 0.25, t1: 0.05, delay: 0.05 });
    this.rings.anim(x, z, R * 0.9, R * 0.9, 0.35, HEX.orange, 0.35, { style: RS.DISC });
    const n = Math.round(14 * this.emit);
    const s = this.sp;
    for (let i = 0; i < n; i++) { // candy blast puffs
      const a = rnd() * TAU, sp = rr(3, 7) * R / 3;
      const p2 = s.s();
      p2.x = x; p2.y = rr(0.3, 1); p2.z = z; p2.vx = Math.cos(a) * sp; p2.vz = Math.sin(a) * sp; p2.vy = rr(1, 4);
      p2.drag = 4; p2.life = rr(0.4, 0.65); p2.size = rr(0.5, 0.9); p2.size1 = p2.size * 1.8; p2.shape = SH.PUFF; p2.add = 0; p2.fade = 2;
      p2.color(pick(PAL.candy)); s.add(p2);
    }
    this._sparks(x, 0.6, z, Math.round(18 * this.emit), IP7, 13, 0.4, false);
    this._flash(x, 0.8, z, R * 0.9, 0xfff3b0, 0.14, SH.BURST);
    this._shards(x, 0.6, z, Math.round(6 * this.emit), 0xff5a36, 0, 0, 0.16, 1.2);
  }

  onSplit(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    const s = this.sp.s();
    s.x = x; s.y = 0.8; s.z = z; s.life = 0.18; s.size = 0.28; s.size1 = 0.4; s.shape = SH.STREAK; s.stretch = 104;
    s.ox = 0; s.oy = 1; s.oz = 0; s.color(HEX.white, 1.4); s.add = 0.6;
    this.sp.add(s);
    this._sparks(x, 0.7, z, Math.round(10 * this.emit), IP8, 8, 0.3, false);
    this.rings.anim(x, z, 0.2, 1.6, 0.28, HEX.white, 0.8, { t0: 0.3, t1: 0.05 });
  }

  onDizzy(p) {
    const x = p.x ?? 0, z = p.z ?? 0, size = sizeOf(p.size);
    this._sparkles(x, size + 0.3, z, Math.round(3 * this.deco), IP9, 0.4, false);
  }

  onDash(p) {
    const D = this.dash;
    D.on = true; D.t = 0; D.n = 0; D.emitAcc = 0;
    D.heroId = p.heroId || this.G.run?.player?.heroId || 'blu';
    D.x0 = p.x ?? 0; D.z0 = p.z ?? 0;
    const dl = Math.hypot(p.dirX ?? 0, p.dirZ ?? 0) || 1;
    D.dirX = (p.dirX ?? 0) / dl; D.dirZ = (p.dirZ ?? 1) / dl;
    D.size = this.G.run?.player?.size ?? 1;
    D.trail = p.trail || this.G.meta?.selectedTrail?.() || 'default';
    D.colors = this._trailColors(p.trailColors || null, D.trail, p.color ?? HEROES.find((h) => h.id === D.heroId)?.color ?? 0x2f6bff);
    this.ribbon.colors = D.colors;
    const hero = HEROES.find((h) => h.id === D.heroId);
    D.time = hero?.dashTime ?? GT.dash.time;
    const x = D.x0, z = D.z0;
    // dash-start puff
    this._dust(x - D.dirX * 0.4, z - D.dirZ * 0.4, Math.round((D.heroId === 'mochi' ? 7 : 4) * this.deco + 1), 0.3, 2.2, 0.4);
    this.rings.anim(x, z, 0.3, 1.1, 0.2, HEX.white, 0.55, { t0: 0.18, t1: 0.04 });
    if (D.heroId === 'zap') {
      this._blinkFrom.x = x; this._blinkFrom.z = z; this._blinkFrom.has = true;
      this.rings.anim(x, z, 0.3, hero?.passive?.sparkRadius ?? 1.6, 0.25, HEX.storm, 0.9, { style: RS.DASHED, t0: 0.25, t1: 0.1 });
      this._sparks(x, 0.5, z, Math.round(10 * this.emit), IP2, 7, 0.28, true);
    }
    if (D.heroId === 'stella') {
      const w = hero?.well;
      const e = this._ev(K.VORTEX);
      if (e) { e.game = true; e.x = x; e.z = z; e.r = w?.radius ?? 3.5; e.dur = w?.time ?? 1.8; e.color.copy(col(HEX.violet)); e.c = 0; }
    }
  }

  onDashEnd(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    const D = this.dash;
    D.on = false;
    this._dust(x, z, Math.round(3 * this.deco + 1), 0.3, 1.8, 0.35);
    if (D.heroId === 'mochi') this.rings.anim(x, z, 0.3, 1.6, 0.25, HEX.white, 0.7, { t0: 0.3, t1: 0.05 });
    if (D.heroId === 'zap' && this._blinkFrom.has) {
      const f = this._blinkFrom;
      this.bolt(x, z, { fromX: f.x, fromY: 0.55, fromZ: f.z, y: 0.55, width: 0.22, amp: 0.6, branches: 1, impact: false, auto: true, color: HEX.storm });
      this.rings.anim(x, z, 0.3, 1.6, 0.25, HEX.storm, 0.9, { style: RS.DASHED, t0: 0.25, t1: 0.1 });
      this._sparks(x, 0.5, z, Math.round(10 * this.emit), IP2, 7, 0.28, true);
      f.has = false;
    }
  }

  onPerfect(p) {
    const x = p.x ?? 0, z = p.z ?? 0, R = TUNE.perfect;
    this.rings.anim(x, z, 0.4, R.ring, R.ringTime, HEX.gold, 1, { t0: 0.5, t1: 0.1, self: 1 });
    this.rings.anim(x, z, 0.3, R.ring * 0.85, R.ringTime, HEX.cyan, 0.9, { t0: 0.3, t1: 0.06, delay: R.second, self: 1 });
    this.rings.anim(x, z, R.ring * 0.7, R.ring * 0.7, 0.35, HEX.gold, 0.35, { style: RS.DISC, self: 1 });
    const n = Math.round(R.sparks * this.emit);
    for (let i = 0; i < n; i++) { // radial speed lines + sparkles
      const a = (i / n) * TAU + rnd() * 0.2, sp = rr(9, 15);
      const s = this.sp.s();
      s.x = x + Math.cos(a) * 0.5; s.y = rr(0.3, 1.1); s.z = z + Math.sin(a) * 0.5;
      s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = rr(-0.5, 1.5); s.drag = 5;
      s.life = rr(0.3, 0.45); s.size = 0.13; s.shape = i % 3 ? SH.STREAK : SH.SPARKLE; s.stretch = i % 3 ? 0.14 : 0;
      if (s.shape === SH.SPARKLE) { s.size = 0.5; s.rotV = 4; }
      s.color(i % 2 ? HEX.gold : HEX.white, 1.4); s.self = 1;
      this.sp.add(s);
    }
    this._flash(x, 0.7, z, 2.2, 0xfff3b0, 0.15, SH.BURST, true);
  }

  onNearMiss(p) {
    const x = p.x ?? 0, z = p.z ?? 0, cnt = p.count ?? 1;
    // which side? nearest enemy → swish on that side; else perpendicular to movement
    let ang = null;
    const list = this.G.run?.enemies?.list;
    if (list) {
      let best = 16;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e || e.state === 'dying') continue;
        const dx = e.x - x, dz = e.z - z, d2 = dx * dx + dz * dz;
        if (d2 < best) { best = d2; ang = Math.atan2(dz, dx); }
      }
    }
    if (ang === null) {
      const pl = this.G.run?.player;
      const vx = pl?.vx ?? 1, vz = pl?.vz ?? 0;
      ang = Math.atan2(vz, vx) + (cnt % 2 ? Math.PI / 2 : -Math.PI / 2);
    }
    const dx = Math.cos(ang), dz = Math.sin(ang);
    const R = TUNE.nearMiss;
    const big = Math.min(1.35, 1 + cnt * 0.05);
    // camera-facing crescent between hero and enemy, convex side toward the enemy
    const s = this.sp.s();
    s.x = x + dx * 0.62; s.y = 0.6; s.z = z + dz * 0.62;
    s.vx = dx * 1.6; s.vz = dz * 1.6; s.drag = 4;
    s.life = 0.34; s.size = 1.1 * big; s.size1 = 2.0 * big; s.shape = SH.SWISH; s.add = 0.15; s.fade = 1.6;
    s.rot = this._screenAngle(x, 0.6, z, dx, dz); s.self = 2; s.alpha = 0.9;
    s.color(HEX.cyan, 1.05);
    this.sp.add(s);
    // tangent speed lines + sparkles
    const tx = -dz, tz = dx;
    for (let i = 0; i < 3; i++) {
      const q = this.sp.s();
      const o = (i - 1) * 0.35;
      q.x = x + dx * (0.95 + Math.abs(o) * 0.3) + tx * o; q.y = 0.35 + i * 0.22; q.z = z + dz * (0.95 + Math.abs(o) * 0.3) + tz * o;
      q.life = 0.22; q.size = 0.1; q.shape = SH.STREAK; q.stretch = 108; q.ox = tx; q.oy = 0; q.oz = tz;
      q.vx = tx * 3; q.vz = tz * 3; q.color(HEX.white, 1.2); q.add = 0.3; q.self = 2;
      this.sp.add(q);
    }
    for (let i = 0; i < R.sparkles; i++) {
      const a = ang + (i / (R.sparkles - 1) - 0.5) * R.arc;
      const q = this.sp.s();
      q.x = x + Math.cos(a) * R.radius; q.y = rr(0.3, 0.9); q.z = z + Math.sin(a) * R.radius;
      q.vx = Math.cos(a) * rr(1.5, 3); q.vz = Math.sin(a) * rr(1.5, 3); q.vy = rr(0.5, 2); q.drag = 3;
      q.life = rr(0.3, 0.45); q.size = rr(0.32, 0.46); q.shape = SH.SPARKLE; q.rotV = rr(-4, 4);
      q.color(i % 2 ? HEX.cyan : HEX.white, 1.25); q.add = 0.35; q.self = 1;
      this.sp.add(q);
    }
  }

  /** screen-space angle (radians, CCW from screen-right) of world direction (dx, dz) at a point */
  _screenAngle(x, y, z, dx, dz) {
    const cam = this.G.camera;
    if (!cam) return Math.atan2(-dz, dx);
    cam.updateMatrixWorld();
    this._v.set(x, y, z).project(cam);
    this._w.set(x + dx, y, z + dz).project(cam);
    return Math.atan2(this._w.y - this._v.y, (this._w.x - this._v.x) * (cam.aspect || 1));
  }

  onHurt(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    let ax = x - (p.srcX ?? x), az = z - (p.srcZ ?? z);
    const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
    const n = Math.round(16 * this.emit);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, sp = rr(5, 10);
      const s = this.sp.s();
      s.x = x; s.y = 0.7; s.z = z;
      s.vx = Math.cos(a) * sp + ax * 4; s.vz = Math.sin(a) * sp + az * 4; s.vy = rr(1, 5); s.grav = 12; s.drag = 3;
      s.life = rr(0.3, 0.5); s.size = 0.12; s.shape = SH.STREAK; s.stretch = 0.12;
      s.color(pick(PAL.hurt), 1.3); s.add = 0.5; s.self = 1;
      this.sp.add(s);
    }
    this.rings.anim(x, z, 0.3, 1.8, 0.3, HEX.pink, 0.9, { t0: 0.35, t1: 0.06, self: 1 });
    this._flash(x, 0.7, z, 1.6, HEX.pinkSoft, 0.12, SH.BURST, true);
  }

  onHeal(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    this._hearts(x, 0.9, z, 3 + Math.min(4, (p.amount ?? 1) * 2), true);
    this.rings.anim(x, z, 0.2, 1.4, 0.4, HEX.pink, 0.7, { t0: 0.25, t1: 0.05, self: 1 });
    this.rings.anim(x, z, 1.1, 1.1, 0.45, HEX.pink, 0.35, { style: RS.DISC, self: 1 });
    this._sparkles(x, 0.9, z, 6, IP10, 0.7, true);
  }

  onShieldBlock(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    this._bubbles(x, 0.7, z, Math.round(10 * this.emit), HEX.cyanSoft);
    this.rings.anim(x, z, 0.5, 2.2, 0.35, HEX.cyan, 0.9, { t0: 0.3, t1: 0.05, self: 1 });
    this._flash(x, 0.7, z, 1.8, HEX.cyanSoft, 0.12, SH.FLASH, true);
  }

  onStaminaEmpty(p) { this._steam(p.x ?? 0, 1.35, p.z ?? 0, 5); }

  onPlayerSpawn(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    const e = this._ev(K.PILLAR);
    if (e) { e.x = x; e.z = z; e.r = 0.7; e.dur = 0.5; e.color.copy(col(HEX.cyan)); e.a = 20; }
    this._dust(x, z, Math.round(12 * this.deco), 0.45, 3.5, 0.45);
    this.rings.anim(x, z, 0.3, 2.2, 0.35, HEX.cyan, 0.9, { t0: 0.35, t1: 0.05, self: 1 });
  }

  onRevive(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    this.rings.anim(x, z, 0.4, 6, 0.5, HEX.cyan, 1, { t0: 0.6, t1: 0.1, self: 1 });
    this.rings.anim(x, z, 0.3, 5, 0.5, HEX.white, 0.8, { t0: 0.3, t1: 0.05, delay: 0.08, self: 1 });
    this._hearts(x, 1, z, 6, true);
    this._sparkles(x, 1, z, 14, IP11, 1.2, true);
    const e = this._ev(K.PILLAR);
    if (e) { e.x = x; e.z = z; e.r = 0.9; e.dur = 0.6; e.color.copy(col(HEX.cyan)); e.a = 18; }
  }

  onSecondChance(p) { this._bubbles(p.x ?? 0, 0.9, p.z ?? 0, 12, HEX.cyanSoft); }

  onDeath(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    this._stars(x, 1.2, z, 5, 0.38);
    this._dust(x, z, 8, 0.4, 2.5, 0.45);
  }

  onCheckpoint() {
    const pl = this.G.run?.player;
    const x = pl?.x ?? 0, z = pl?.z ?? 0;
    this.rings.anim(x, z, 0.3, 3, 0.45, HEX.gold, 0.9, { t0: 0.35, t1: 0.06, self: 1 });
    this._sparkles(x, 1, z, 12, IP12, 1, true);
  }

  onNovaReady() {
    const pl = this.G.run?.player;
    if (!pl) return;
    this.rings.anim(pl.x, pl.z, 0.3, 2.4, 0.45, HEX.gold, 0.9, { t0: 0.3, t1: 0.05, self: 1 });
    this._sparkles(pl.x, 1, pl.z, 12, IP5, 0.9, true);
  }

  onMilestone(p) {
    const pl = this.G.run?.player;
    if (!pl) return;
    const c = p.count ?? 10;
    const hex = c >= 50 ? PAL.rainbow[(c / 5 | 0) % PAL.rainbow.length] : c >= 20 ? HEX.gold : HEX.cyan;
    this.rings.anim(pl.x, pl.z, 0.4, 2.6, 0.4, hex, 0.9, { t0: 0.3, t1: 0.05, self: 1 });
    this._sparkles(pl.x, 1, pl.z, Math.round(10 * this.emit), [hex, HEX.white], 1, true);
  }

  onFever() {
    const pl = this.G.run?.player;
    const x = pl?.x ?? 0, z = pl?.z ?? 0;
    for (let i = 0; i < 3; i++) this.rings.anim(x, z, 0.4, 4 + i * 2, 0.6, PAL.rainbow[i * 2], 0.8, { t0: 0.35, t1: 0.06, delay: i * 0.1, self: 1 });
    this._sparkles(x, 1, z, 20, PAL.rainbow, 1.5, true);
  }

  onCrystal(p) { this._gemGlints(p.x ?? 0, 0.5, p.z ?? 0, 2, HEX.cyan); this._sparkles(p.x ?? 0, 0.6, p.z ?? 0, 2, IP13, 0.35, false); }
  onHeartPickup(p) { this._hearts(p.x ?? 0, 0.7, p.z ?? 0, 2, true); this._sparkles(p.x ?? 0, 0.7, p.z ?? 0, 4, IP10, 0.5, true); }
  onCoin(p) {
    const n = Math.min(10, 2 + ((p.amount ?? 1) / 3 | 0));
    this._sparkles(p.x ?? 0, 0.6, p.z ?? 0, n, IP14, 0.5, false);
    this.rings.anim(p.x ?? 0, p.z ?? 0, 0.1, 0.8, 0.22, HEX.gold, 0.8, { t0: 0.18, t1: 0.04 });
  }
  onMagnet(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    for (let i = 0; i < 3; i++) this.rings.anim(x, z, 0.3, 14, 0.8, HEX.cyan, 0.8, { t0: 0.4, t1: 0.1, delay: i * 0.15, self: 1 });
    this._sparkles(x, 0.8, z, 10, IP13, 1, true);
  }

  onBossSlam(p) {
    const x = p.x ?? 0, z = p.z ?? 0, R = p.radius ?? 5;
    const n = Math.round(24 * this.deco + 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rr(-0.1, 0.1), sp = rr(5, 9);
      const s = this.sp.s();
      s.x = x + Math.cos(a) * 1.8; s.y = 0.3; s.z = z + Math.sin(a) * 1.8;
      s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = rr(0.5, 2); s.drag = 3.5;
      s.life = rr(0.5, 0.8); s.size = rr(0.6, 0.9); s.size1 = s.size * 1.6; s.shape = SH.PUFF; s.add = 0; s.fade = 2;
      s.color(0xffffff); this.sp.add(s);
    }
    this.rings.anim(x, z, 1, Math.max(4, R), 0.45, HEX.white, 0.9, { t0: 0.7, t1: 0.1 });
    this.rings.anim(x, z, 0.8, Math.max(3, R * 0.7), 0.35, 0xfff3b0, 0.7, { t0: 0.35, t1: 0.05, delay: 0.06 });
    this._shards(x, 0.4, z, Math.round(10 * this.emit), 0xf6e7c8, 0, 0, 0.16, 1.1);
  }

  onBossHit(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    const c = this.G.data?.boss?.coreColor ?? HEX.magenta;
    this._shards(x, 1.8, z, Math.round(40 * this.emit), c, 0, 0, 0.2, 1.3, 1.6);
    this._shards(x, 1.8, z, Math.round(10 * this.emit), HEX.white, 0, 0, 0.16, 1.2);
    this._sparks(x, 1.8, z, Math.round(60 * this.emit), [c, HEX.white, HEX.pinkSoft], 14, 0.45, false);
    for (let i = 0; i < 3; i++) this.rings.anim(x, z, 0.5, 4 + i * 1.5, 0.45, i === 1 ? HEX.white : c, 0.9, { t0: 0.45, t1: 0.08, delay: i * 0.08 });
    this._flash(x, 1.8, z, 4, 0xffd0f8, 0.16, SH.BURST);
  }

  onBossPhase() {
    const b = this.G.run?.boss || this.G.run?.enemies?.boss;
    const x = b?.x ?? 0, z = b?.z ?? 0;
    for (let i = 0; i < 2; i++) this.rings.anim(x, z, 1, 9 + i * 3, 0.6, i ? HEX.white : HEX.magenta, 0.85, { t0: 0.5, t1: 0.08, delay: i * 0.12 });
    this._sparkles(x, 2, z, 20, IP15, 2, false);
  }

  onBossDefeat(p) {
    const x = p.x ?? 0, z = p.z ?? 0;
    for (let i = 0; i < 4; i++) this.rings.anim(x, z, 0.5, 6 + i * 3, 0.7, i % 2 ? HEX.white : HEX.gold, 0.9, { t0: 0.6, t1: 0.1, delay: i * 0.1 });
    this._sparkles(x, 2, z, 40, IP16, 2.5, false);
    this._confettiRain();
  }

  onRunEnd(p) { if (p.win) this._confettiRain(); }

  onGateOpen(p) {
    const e = this._ev(K.GATE);
    if (!e) return;
    e.game = true;
    e.x = p.x ?? 0; e.z = p.z ?? 0;
    e.r = p.radius ?? 1.6;
    e.dur = p.seconds ?? p.duration ?? MODES?.endless?.warpGate?.open ?? 10;
    e.color.copy(col(HEX.cyan));
    this.rings.anim(e.x, e.z, 0.2, e.r * 2.2, 0.5, HEX.cyan, 1, { t0: 0.5, t1: 0.08 });
  }

  onGateClose(p) {
    for (const e of this.evs) if (e.on && e.kind === K.GATE && (p.x == null || Math.hypot(e.x - p.x, e.z - p.z) < 1.5)) e.t = Math.max(e.t, e.dur - 0.3);
  }

  onSettings({ key, value }) { if (key === 'reduceFlash') this.reduceFlash = !!value; }

  onNova(p) {
    const heroId = p.heroId || this.G.run?.player?.heroId || 'blu';
    const hero = HEROES.find((h) => h.id === heroId) || HEROES[0];
    const kind = hero.nova?.kind || 'bigbang';
    const map = { bigbang: K.BIGBANG, mega: K.MEGA, storm: K.STORM, blackhole: K.BLACKHOLE };
    const e = this._ev(map[kind] || K.BIGBANG);
    if (!e) return;
    e.x = p.x ?? this.G.run?.player?.x ?? 0; e.z = p.z ?? this.G.run?.player?.z ?? 0;
    e.r = p.radius ?? hero.nova?.radius ?? GT.nova?.radius ?? 8;
    e.color.copy(col(NOVA_COLOR[kind] ?? p.color ?? HEX.cyan));
    e.f1 = 0; e.f2 = 0; e.f3 = 0; e.n = 0; e.acc = 0;
    if (kind === 'bigbang') e.dur = 1.3;
    if (kind === 'mega') { e.dur = (hero.nova?.duration ?? 6) + 0.3; e.game = true; }
    if (kind === 'storm') { e.dur = (hero.nova?.duration ?? TUNE.storm.time) + 0.5; e.n = hero.nova?.bolts ?? TUNE.storm.bolts; e.a = this.clock; e.game = true; }
    if (kind === 'blackhole') { e.dur = (hero.nova?.duration ?? 3) + 1.0; e.b = hero.nova?.duration ?? 3; e.c = hero.nova?.implode ?? 4; e.r = hero.nova?.radius ?? 11; }
  }

  // =========================================================
  // timeline tick
  // =========================================================
  _tick(e, edt, fdt) {
    const t = e.t;
    if (t >= e.dur) { this._end(e); return; }
    switch (e.kind) {
      case K.PORTAL: this._tickPortal(e, t, edt); break;
      case K.PILLAR: {
        const u = t / e.dur;
        this.beams.now(e.x, e.z, 0, e.r * (1 - u * 0.6), e.a || 20, e.color, (1 - u) * (e.b || 0.75), (1 - u) * 0.35, 0, 1);
        this.rings.now(e.x, e.z, e.r * 1.6, 0.2, e.color, (1 - u) * 0.6, RS.DISC, 1, 0, 0, 0, 0, 1);
        break;
      }
      case K.SHELL: {
        const u = t / e.dur;
        const R = e.r * easeOutCubic(u);
        this.shells.now(e.x, e.y, e.z, R, e.color, (1 - u * u) * (e.a || 1), e.b | 0, e.c || 1, 1);
        break;
      }
      case K.VORTEX: {
        const u = t / e.dur;
        const open = Math.min(1, t / 0.2), close = Math.min(1, (e.dur - t) / 0.25);
        this.rings.now(e.x, e.z, e.r * easeOutBack(open) * close, 0.1, e.color, 0.75 * close, RS.VORTEX, e.c, 1, 0, 0, 0, 0, 0);
        e.acc -= fdt;
        if (e.acc <= 0 && u < 0.85) {
          e.acc = 0.05 / Math.max(0.3, this.deco);
          this._spiralIn(e.x, e.z, e.r, IP17, 0.5, false);
        }
        break;
      }
      case K.GATE: this._tickGate(e, t, fdt); break;
      case K.RAIN: {
        e.acc += fdt * (e.n / e.dur);
        const pl = this.G.run?.player;
        const cx = pl?.x ?? 0, cz = pl?.z ?? 0;
        while (e.acc >= 1) {
          e.acc -= 1;
          const s = this.sp.s();
          s.x = cx + rr(-11, 11); s.y = rr(7, 11); s.z = cz + rr(-9, 7);
          s.vx = rr(-1, 1); s.vz = rr(-1, 1); s.vy = -rr(1, 3); s.grav = rr(2.5, 3.5);
          s.mode = MO.FLUTTER; s.k1 = rr(3, 7); s.k2 = rnd() * TAU; s.rot = rnd() * TAU; s.rotV = rr(-5, 5);
          s.life = rr(3, 4); s.size = rr(0.3, 0.44); s.shape = SH.RECT; s.add = 0; s.fade = 6; s.self = 1;
          s.color(pick(PAL.confetti), 1.05);
          this.sp.add(s);
        }
        break;
      }
      case K.BIGBANG: this._tickBigBang(e, t, fdt); break;
      case K.MEGA: this._tickMega(e, t, fdt); break;
      case K.STORM: this._tickStorm(e, t, fdt); break;
      case K.BLACKHOLE: this._tickBlackHole(e, t, fdt); break;
      default: break;
    }
  }

  _end(e) {
    if (e.kind === K.PORTAL && !e.f2) this._portalCollapse(e);
    e.on = false;
  }

  _tickPortal(e, t, edt) {
    const P = TUNE.portal;
    let u = t / e.dur;
    const oc = col(HEX.orange);
    if (e.f1) { // collapsing (enemy arrived): 0.16 s implode
      e.a += edt;
      const k = clamp(1 - e.a / P.collapse, 0, 1);
      if (k <= 0) { this._portalCollapse(e); e.on = false; return; }
      this.rings.now(e.x, e.z, e.r * (0.4 + 0.6 * k), 0.1, oc, k, RS.PORTAL, 1, e.c, 0, 0, 1, 0, 0);
      this.beams.now(e.x, e.z, 0, e.r * 0.5 * k, TUNE.portal.beamH, col(HEX.teleWhite), k, 1, e.c, 0);
      return;
    }
    const open = easeOutBack(Math.min(1, t / 0.18));
    const fill = clamp(u / P.fill, 0, 1);
    const white = t > e.dur - P.white ? 1 : 0;
    this.rings.now(e.x, e.z, e.r * open, 0.1, oc, 1, RS.PORTAL, fill, e.c, 0, 0, white, 0, 0);
    const beamA = clamp((u - P.fill) / (1 - P.fill), 0, 1);   // stage 2: sky beam brightens
    if (beamA > 0) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 20);
      this.beams.now(e.x, e.z, 0, e.r * (0.28 + 0.2 * beamA), P.beamH, col(white ? HEX.white : HEX.teleWhite), (0.15 + 0.6 * beamA) * pulse, white * 0.6, e.c, 0);
    }
    // suction sparkles spiralling in
    e.acc -= edt;
    if (e.acc <= 0) {
      e.acc = 0.07 / Math.max(0.3, this.deco);
      const s = this.sp.s();
      s.mode = MO.SPIRAL; s.ox = e.x; s.oz = e.z; s.oy = 0.2; s.k1 = rnd() * TAU; s.k2 = e.r * 1.1;
      s.x = e.x + Math.cos(s.k1) * s.k2; s.z = e.z + Math.sin(s.k1) * s.k2; s.y = rr(0.2, 0.7);
      s.vx = 1.5; s.grav = 6; s.vz = 5; s.life = 0.6; s.size = 0.28; s.shape = SH.SPARKLE; s.rotV = 6;
      s.color(pick(IP18), 1.2);
      this.sp.add(s);
    }
  }

  _portalCollapse(e) {
    e.f2 = 1;
    this._flash(e.x, 0.6, e.z, e.r * 1.6, HEX.teleWhite, 0.12, SH.FLASH);
    this._sparkles(e.x, 0.6, e.z, Math.round(6 * this.deco), IP19, e.r * 0.6, false);
  }

  _tickGate(e, t, fdt) {
    const open = easeOutBack(Math.min(1, t / 0.35));
    const close = Math.min(1, (e.dur - t) / 0.3);
    const k = open * close;
    this.rings.now(e.x, e.z, e.r * k, 0.1, e.color, 0.9 * close, RS.VORTEX, 0, 1, 0, 0, 0, 0, 0);
    this.rings.now(e.x, e.z, e.r * 1.35 * k, 0.16, col(HEX.white), 0.8 * close, RS.DASHED, 0, 0, 0, 0, 0, 0, 0);
    this.beams.now(e.x, e.z, 0, e.r * 0.6 * k, 18, e.color, 0.42 * close, 0, 1, 0);
    e.acc -= fdt;
    if (e.acc <= 0) {
      e.acc = 0.05;
      const s = this.sp.s();
      const a = rnd() * TAU, r = rr(0.2, e.r);
      s.x = e.x + Math.cos(a) * r; s.z = e.z + Math.sin(a) * r; s.y = 0.1; s.vy = rr(2, 5);
      s.life = rr(0.6, 1); s.size = rr(0.25, 0.4); s.shape = SH.SPARKLE; s.rotV = 3;
      s.color(pick(IP20), 1.3); s.self = 1;
      this.sp.add(s);
    }
  }

  // ---- NOVA kits ----
  _tickBigBang(e, t, fdt) {
    const x = e.x, z = e.z, c = e.color;
    const CH = 0.35;
    if (t < CH) { // charge: particles gather, glow core grows, ring contracts
      const u = t / CH;
      this.shells.now(x, 1.1, z, 0.3 + u * 1.1, c, 0.5 + u * 0.5, 0, 1, 1);
      this.rings.now(x, z, 4 * (1 - u) + 0.6, 0.18, c, 0.8, RS.SHOCK, 1, 0, 0, 0, 0, 1, 0);
      e.acc -= fdt;
      while (e.acc <= 0) { e.acc += 0.012; this._spiralIn(x, z, rr(2.5, 4), IP21, 1.1, true); }
      return;
    }
    if (!e.f1) {
      e.f1 = 1;
      this._spawnShell(x, 1, z, e.r * 1.05, c, 0.6, 0, 0.8 * this._flashK());
      this._spawnShell(x, 1, z, e.r * 0.6, col(HEX.cyanSoft), 0.45, 0, 0.45 * this._flashK());
      for (let i = 0; i < 3; i++) this.rings.anim(x, z, 0.5, e.r * (1.05 - i * 0.12), 0.55, i === 1 ? HEX.white : HEX.cyan, 1, { t0: 0.8, t1: 0.12, delay: i * 0.08, self: 1 });
      this.rings.anim(x, z, e.r * 0.8, e.r * 0.8, 0.5, HEX.cyan, 0.3, { style: RS.DISC, self: 1 });
      const pe = this._ev(K.PILLAR);
      if (pe) { pe.x = x; pe.z = z; pe.r = 1.1; pe.dur = 0.7; pe.color.copy(col(HEX.cyan)); pe.a = 30; pe.b = 0.7 * this._flashK(); }
      const n = Math.round(40 * this.emit);
      for (let i = 0; i < n; i++) { // cube-shaped shards blasting outward
        const a = (i / n) * TAU + rnd() * 0.15, sp = rr(9, 16);
        this.shards.add(x, 1, z, Math.cos(a) * sp, rr(4, 9), Math.sin(a) * sp, rr(0.14, 0.26), col(i % 3 ? HEX.cyan : HEX.white), 1.4, rr(0.7, 1));
      }
      this._sparks(x, 1, z, Math.round(60 * this.emit), IP21, 18, 0.5, true);
      this._flash(x, 1, z, 3, HEX.cyanSoft, 0.16, SH.BURST, true);
    }
  }

  _tickMega(e, t, fdt) {
    const pl = this.G.run?.player;
    const x = pl?.x ?? e.x, z = pl?.z ?? e.z, c = e.color;
    if (!e.f1) {
      e.f1 = 1;
      this._spawnShell(x, 0.2, z, 4.2, c, 0.9, 1, 0.7 * this._flashK());
      for (let i = 0; i < 3; i++) this.rings.anim(x, z, 0.8, 5 + i * 1.5, 0.5, i === 1 ? 0xffc1dc : HEX.mega, 1, { t0: 0.6, t1: 0.1, delay: i * 0.1, self: 1 });
      this._dust(x, z, Math.round(12 * this.deco + 2), 1.4, 6, 0.6);
      this._sparkles(x, 1.5, z, 16, IP22, 1.8, true);
      e.acc = 0.5;
    }
    // ground-pound stomps every 0.5 s while giant
    e.acc -= fdt;
    if (e.acc <= 0 && t < e.dur - 0.4) {
      e.acc += 0.5;
      this.rings.anim(x, z, 1, 3.4, 0.35, HEX.mega, 0.9, { t0: 0.5, t1: 0.08, self: 1 });
      this.rings.anim(x, z, 0.8, 2.6, 0.3, HEX.white, 0.6, { t0: 0.25, t1: 0.05, delay: 0.04, self: 1 });
      this._dust(x, z, Math.round(8 * this.deco + 2), 1.1, 4.5, 0.6);
    }
    e.b -= fdt;
    if (e.b <= 0) { e.b = 0.08; this._sparkles(x, rr(0.5, 2.5), z, 1, IP23, 1.4, true); }
  }

  _tickStorm(e, t, fdt) {
    const pl = this.G.run?.player;
    const x = pl?.x ?? e.x, z = pl?.z ?? e.z;
    const k = Math.min(1, t / 0.3) * Math.min(1, (e.dur - t) / 0.4);
    this.rings.now(x, z, e.r, 0.22, e.color, 0.55 * k, RS.DASHED, 0.6, 0, 0, 0, 0, 1, 0);
    this.rings.now(x, z, e.r * 0.62, 0.12, col(HEX.cyanSoft), 0.4 * k, RS.DASHED, 0, 1, 0, 0, 0, 1, 0);
    if (!e.f1) { e.f1 = 1; this._sparks(x, 1, z, Math.round(24 * this.emit), IP24, 12, 0.4, true); this._flash(x, 1, z, 2.4, HEX.storm, 0.15, SH.BURST, true); }
    // auto bolts only if gameplay isn't calling fx.bolt() itself
    const external = this.extBoltT >= e.a;
    if (external || e.n <= 0 || t < TUNE.storm.firstDelay) return;
    e.acc -= fdt;
    if (e.acc > 0) return;
    const span = Math.max(0.5, (e.dur - 0.5 - TUNE.storm.firstDelay));
    e.acc = span / Math.max(1, TUNE.storm.bolts);
    e.n--;
    let tx = x + rr(-e.r, e.r) * 0.7, tz = z + rr(-e.r, e.r) * 0.7;
    const list = this.G.run?.enemies?.list;
    if (list && list.length) { // prefer dizzy, then nearest in range
      let best = null, bd = e.r * e.r * 1.2, bestDizzy = false;
      for (let i = 0; i < list.length; i++) {
        const en = list[i];
        if (!en || en.state === 'dying' || en.state === 'portal') continue;
        const dx = en.x - x, dz = en.z - z, d2 = dx * dx + dz * dz;
        const dz_ = en.state === 'dizzy' || en.smashable;
        if (d2 > e.r * e.r * 1.2) continue;
        if ((dz_ && !bestDizzy) || (dz_ === bestDizzy && d2 < bd)) { best = en; bd = d2; bestDizzy = dz_; }
      }
      if (best) { tx = best.x; tz = best.z; }
    }
    this.bolt(tx, tz, { auto: true });
  }

  _tickBlackHole(e, t, fdt) {
    const x = e.x, z = e.z, c = e.color;
    const pull = e.b;          // pull seconds
    if (t < pull) {
      const open = easeOutBack(Math.min(1, t / 0.3));
      this.rings.now(x, z, 3.6 * open, 0.1, c, 1, RS.VORTEX, 1, 1, 0, 0, 0, 1, 0);
      this.rings.now(x, z, 2.2 * open, 0.14, col(0xff7ad9), 0.85, RS.DASHED, 0, 1, 0, 0, 0, 1, 0);
      this.rings.now(x, z, 4.6 * open, 0.1, col(0xd9c8ff), 0.5, RS.DASHED, 0, 0, 0, 0, 0, 1, 0);
      this.shells.now(x, 1.2, z, 0.75 * open + Math.sin(t * 20) * 0.03, c, 1, 2, 1, 1);
      this.shells.now(x, 1.2, z, 1.25 * open, c, 0.5, 0, 1, 1);
      e.acc -= fdt;
      while (e.acc <= 0) { e.acc += 0.018 / Math.max(0.35, this.deco); this._spiralIn(x, z, rr(4, e.r), IP25, 1.2, true, true); }
      return;
    }
    const u = (t - pull);
    if (u < 0.2) { // implode
      const k = 1 - u / 0.2;
      this.rings.now(x, z, 3.4 * k, 0.1, c, 0.9, RS.VORTEX, 1, 1, 0, 0, 0, 1, 0);
      this.shells.now(x, 1.2, z, 0.75 * k + 0.05, c, 1, 2, 1, 1);
      return;
    }
    if (!e.f1) {
      e.f1 = 1;
      const R = e.c;
      this._spawnShell(x, 1.2, z, R * 1.1, c, 0.7, 0, 0.9 * this._flashK());
      this._spawnShell(x, 1.2, z, R * 0.6, col(0xff9ed8), 0.5, 0, 0.6 * this._flashK());
      for (let i = 0; i < 3; i++) this.rings.anim(x, z, 0.3, R + i * 1.2, 0.5, i === 1 ? HEX.white : HEX.violet, 1, { t0: 0.7, t1: 0.1, delay: i * 0.07, self: 1 });
      this._sparks(x, 1.2, z, Math.round(60 * this.emit), IP26, 16, 0.5, true);
      this._sparkles(x, 1.2, z, 20, IP27, 2.5, true);
      this._flash(x, 1.2, z, 3, 0xd9c8ff, 0.16, SH.BURST, true);
    }
  }

  _flashK() { return this.reduceFlash ? 0.5 : 1; }

  _spawnShell(x, y, z, R, c, dur, mode = 0, alpha = 1, squash = 1) {
    const e = this._ev(K.SHELL);
    if (!e) return;
    e.x = x; e.y = y; e.z = z; e.r = R; e.dur = dur; e.b = mode; e.a = alpha; e.c = squash;
    e.color.copy(c);
  }

  // =========================================================
  // continuous: dash, enemies, hero
  // =========================================================
  _tickDash(gdt, fdt) {
    const D = this.dash;
    const pl = this.G.run?.player;
    if (!D.on) return;
    D.t += gdt;
    const dashT = D.time ?? 0.18;
    let active;
    if (pl && typeof pl.dashing === 'boolean') active = pl.dashing || D.t < 0.06;
    else active = D.t < dashT + 0.04;
    if (D.t > 2) active = false;
    if (!active) { D.on = false; return; }
    let x, z, rotY;
    if (pl && Number.isFinite(pl.x)) { x = pl.x; z = pl.z; rotY = pl.rotY ?? Math.atan2(D.dirX, D.dirZ); } else {
      const u = Math.min(1, D.t / (D.time ?? 0.18));
      const dist = GT.dash.dist * (1 - Math.pow(1 - u, 1.6));
      x = D.x0 + D.dirX * dist; z = D.z0 + D.dirZ * dist; rotY = Math.atan2(D.dirX, D.dirZ);
    }
    const size = D.size || 1;
    if (D.heroId !== 'zap') this.ribbon.push(x, 0.45 * size, z);
    // afterimages
    D.emitAcc -= gdt;
    if (D.n < TUNE.dash.ghosts && D.emitAcc <= 0 && D.heroId !== 'zap') {
      D.emitAcc = TUNE.dash.ghostEvery;
      const c = D.colors[D.n % D.colors.length];
      this.ghosts.add(x, 0.12 + 0.5 * size * 0.86, z, rotY, size, c, 0.75, TUNE.dash.ghostLife);
      D.n++;
      this._trailParticle(x, z, D);
    }
  }

  _tickEnemies(list, fdt) {
    this.knockAcc -= fdt;
    const doKnock = this.knockAcc <= 0;
    if (doKnock) this.knockAcc = TUNE.knocked.every;
    this.dustAcc -= fdt;
    const doDust = this.dustAcc <= 0 && !this.low;
    if (doDust) this.dustAcc = TUNE.ambientDust.every / Math.max(1, list.length / 8);
    if (!doKnock && !doDust) return;
    let dustBudget = doDust ? 2 : 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      const vx = e.vx || 0, vz = e.vz || 0;
      const sp2 = vx * vx + vz * vz;
      const size = e.size || 1;
      if (doKnock && e.state === 'knocked' && sp2 > TUNE.knocked.minSpeed * TUNE.knocked.minSpeed) {
        const sp = Math.sqrt(sp2), nx = vx / sp, nz = vz / sp;
        for (let k = 0; k < 2; k++) {
          const s = this.sp.s();
          const off = rr(-0.45, 0.45) * size;
          s.x = e.x - nx * size * 0.6 - nz * off; s.z = e.z - nz * size * 0.6 + nx * off; s.y = (e.y || 0) + rr(0.15, 0.95) * size;
          s.vx = vx * 0.08; s.vz = vz * 0.08; s.life = 0.2; s.size = 0.09;
          s.shape = SH.STREAK; s.stretch = 100 + 6 + sp * 0.35; s.ox = nx; s.oy = 0; s.oz = nz;
          s.color(k ? 0xfff3b0 : HEX.white, 1.15); s.add = 0.4;
          this.sp.add(s);
        }
      }
      if (dustBudget > 0 && e.state !== 'knocked' && sp2 > TUNE.ambientDust.minSpeed * TUNE.ambientDust.minSpeed && this.sp.dust < TUNE.ambientDust.max * this.deco && rnd() < 0.5) {
        dustBudget--;
        const sp = Math.sqrt(sp2);
        const s = this.sp.s();
        s.x = e.x - vx / sp * size * 0.5 + rr(-0.2, 0.2); s.z = e.z - vz / sp * size * 0.5 + rr(-0.2, 0.2); s.y = 0.15;
        s.vx = -vx * 0.1; s.vz = -vz * 0.1; s.vy = 0.5; s.drag = 2;
        s.life = rr(0.4, 0.6); s.size = 0.25 * size + 0.1; s.size1 = s.size * 1.7; s.shape = SH.PUFF; s.add = 0; s.fade = 2; s.alpha = 0.85; s.tag = 1;
        s.color(0xffffff);
        this.sp.add(s);
      }
    }
  }

  _tickHero(pl, fdt) {
    const vx = pl.vx || 0, vz = pl.vz || 0;
    const sp2 = vx * vx + vz * vz;
    this.heroDustAcc -= fdt;
    if (sp2 > 30 && !pl.dashing && this.heroDustAcc <= 0 && !this.low) {
      this.heroDustAcc = 0.14;
      const sp = Math.sqrt(sp2);
      const s = this.sp.s();
      s.x = pl.x - vx / sp * 0.45 + rr(-0.15, 0.15); s.z = pl.z - vz / sp * 0.45 + rr(-0.15, 0.15); s.y = 0.12;
      s.vy = 0.6; s.drag = 2; s.life = 0.45; s.size = 0.28; s.size1 = 0.5; s.shape = SH.PUFF; s.add = 0; s.fade = 2; s.alpha = 0.8; s.self = 1;
      s.color(0xffffff);
      this.sp.add(s);
    }
  }

  _freedTrail = (x, y, z, golden, u, phase) => {
    if (phase === 1) { // golden aura: sparkles orbiting the lucky cube
      const s = this.sp.s();
      const a = rnd() * TAU, r = rr(0.5, 0.8);
      s.x = x + Math.cos(a) * r; s.y = y + rr(-0.4, 0.5); s.z = z + Math.sin(a) * r;
      s.vy = rr(0.3, 1.2); s.life = rr(0.3, 0.5); s.size = rr(0.3, 0.45); s.shape = SH.SPARKLE; s.rotV = rr(-5, 5);
      s.color(pick(IP_GOLD), 1.3); s.add = 0.4;
      this.sp.add(s);
      return;
    }
    if (rnd() < 0.5) { // rocket contrail
      const q = this.sp.s();
      q.x = x; q.y = y - 0.2; q.z = z; q.vy = -2; q.life = 0.22; q.size = 0.14; q.shape = SH.STREAK; q.stretch = 106;
      q.ox = 0; q.oy = 1; q.oz = 0; q.color(golden ? HEX.gold : HEX.white, 1.2); q.add = 0.3;
      this.sp.add(q);
    }
    const s = this.sp.s();
    s.x = x + rr(-0.18, 0.18); s.y = y; s.z = z + rr(-0.18, 0.18);
    s.vy = -rr(0.5, 1.5); s.life = rr(0.3, 0.45); s.size = rr(0.3, 0.44) * (1 - u * 0.4); s.shape = SH.SPARKLE; s.rotV = rr(-5, 5);
    s.color(golden ? pick(IP14) : pick(PAL.rainbow), 1.2); s.add = 0.4;
    this.sp.add(s);
  };

  _trailParticle(x, z, D) {
    const trail = D.trail;
    const s = this.sp.s();
    s.x = x + rr(-0.3, 0.3); s.y = rr(0.3, 0.9) * (D.size || 1); s.z = z + rr(-0.3, 0.3);
    s.vx = -D.dirX * rr(0.5, 2); s.vz = -D.dirZ * rr(0.5, 2); s.vy = rr(0.2, 1.2); s.drag = 2;
    s.life = rr(0.35, 0.55); s.size = 0.3; s.self = 1;
    const c = D.colors[(rnd() * D.colors.length) | 0];
    s.r = c.r * 1.2; s.g = c.g * 1.2; s.b = c.b * 1.2;
    if (trail === 'hearts') { s.shape = SH.HEART; s.add = 0; s.size = 0.32; s.mode = MO.RISE; s.vy = 1.2; s.k1 = 6; }
    else if (trail === 'bubbles') { s.shape = SH.BUBBLE; s.add = 0.3; s.size = 0.3; s.mode = MO.RISE; s.vy = 1; s.k1 = 5; }
    else if (trail === 'lightning') { s.shape = SH.STREAK; s.stretch = 0.2; s.size = 0.1; s.vx *= 4; s.vz *= 4; s.vy = rr(-2, 2); }
    else { s.shape = SH.SPARKLE; s.rotV = rr(-6, 6); s.size = trail === 'default' ? 0.28 : 0.36; s.add = 0.8; }
    this.sp.add(s);
  }

  _trailColors(given, trailId, heroHex) {
    const key = (given ? given.join(',') : trailId) + '|' + heroHex;
    let arr = this._trailCache.get(key);
    if (arr) return arr;
    let hexes = given || TRAILS.find((t) => t.id === trailId)?.colors || null;
    if (!hexes) { // hero colour → toward cyan ("blue family = you")
      const c = new THREE.Color(heroHex);
      const mid = c.clone().lerp(new THREE.Color(HEX.cyan), 0.5);
      arr = [c, mid, new THREE.Color(HEX.cyan)];
    } else arr = hexes.map((h) => new THREE.Color(h));
    this._trailCache.set(key, arr);
    return arr;
  }

  // =========================================================
  // emitters (building blocks)
  // =========================================================
  _shards(x, y, z, n, hex, dirX, dirZ, size, speed = 1, mul = 1) {
    const c = col(hex), pinkish = col(0xffd0d6);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, sp = rr(4, 9) * speed;
      const vx = Math.cos(a) * sp + dirX * 5, vz = Math.sin(a) * sp + dirZ * 5;
      this.shards.add(x + rr(-0.2, 0.2), y + rr(-0.2, 0.2), z + rr(-0.2, 0.2), vx, rr(4, 8) * speed, vz, size * rr(0.7, 1.3), i % 3 === 2 ? pinkish : c, mul, rr(0.6, 0.9));
    }
  }

  _sparks(x, y, z, n, hexes, speed, life, self) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = rnd() * TAU, el = rr(-0.2, 0.9), sp = rr(0.5, 1) * speed;
      s.x = x; s.y = y; s.z = z;
      s.vx = Math.cos(a) * Math.cos(el) * sp; s.vz = Math.sin(a) * Math.cos(el) * sp; s.vy = Math.sin(el) * sp + 2;
      s.grav = 14; s.drag = 3.5; s.life = life * rr(0.7, 1.15); s.size = rr(0.08, 0.13);
      s.shape = SH.STREAK; s.stretch = 0.09; s.color(pick(hexes), 1.4); s.add = 0.5; s.self = self ? 1 : 0;
      this.sp.add(s);
    }
  }

  _sparkles(x, y, z, n, hexes, radius, self) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = rnd() * TAU, r = rnd() * radius;
      s.x = x + Math.cos(a) * r; s.y = y + rr(-0.3, 0.5); s.z = z + Math.sin(a) * r;
      s.vx = Math.cos(a) * rr(0.5, 2); s.vz = Math.sin(a) * rr(0.5, 2); s.vy = rr(0.5, 2.5); s.drag = 2.5;
      s.life = rr(0.35, 0.65); s.size = rr(0.3, 0.5); s.shape = SH.SPARKLE; s.rot = rnd() * 0.5; s.rotV = rr(-3, 3);
      s.color(pick(hexes), 1.25); s.add = 0.35; s.self = self ? 1 : 0; s.fade = 2;
      this.sp.add(s);
    }
  }

  _stars(x, y, z, n, size) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = (i / n) * TAU + rr(-0.3, 0.3);
      s.x = x; s.y = y; s.z = z;
      s.vx = Math.cos(a) * rr(2.5, 4); s.vz = Math.sin(a) * rr(2.5, 4); s.vy = rr(3, 5); s.grav = 12; s.drag = 1.5;
      s.life = rr(0.55, 0.75); s.size = size * rr(0.85, 1.15); s.shape = SH.STAR; s.add = 0; s.rot = rr(-0.5, 0.5); s.rotV = rr(-7, 7);
      s.fade = 4; s.color(HEX.star, 1.1); s.self = 1;
      this.sp.add(s);
    }
  }

  _hearts(x, y, z, n, self) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = rnd() * TAU, r = rr(0.1, 0.6);
      s.x = x + Math.cos(a) * r; s.y = y + rr(0, 0.4); s.z = z + Math.sin(a) * r;
      s.mode = MO.RISE; s.vy = rr(1.4, 2.4); s.vx = Math.cos(a) * 1.5; s.vz = Math.sin(a) * 1.5; s.k1 = rr(5, 8); s.k2 = rnd() * TAU;
      s.life = rr(0.7, 1.0); s.size = rr(0.42, 0.56); s.shape = SH.HEART; s.add = 0; s.fade = 3; s.fadeIn = 0.08;
      s.delay = i * 0.04; s.self = self ? 1 : 0;
      s.color(i % 3 === 2 ? 0xff7ab8 : HEX.pink, 1.1);
      this.sp.add(s);
    }
  }

  _dust(x, z, n, radius, speed, size) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = (i / Math.max(1, n)) * TAU + rr(-0.3, 0.3);
      s.x = x + Math.cos(a) * radius; s.y = rr(0.12, 0.3); s.z = z + Math.sin(a) * radius;
      const sp = rr(0.6, 1) * speed;
      s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = rr(0.3, 1.2); s.drag = 4;
      s.life = rr(0.4, 0.6); s.size = size * rr(0.8, 1.2); s.size1 = s.size * 1.7; s.shape = SH.PUFF; s.add = 0; s.fade = 2; s.alpha = 0.95;
      s.color(0xffffff);
      this.sp.add(s);
    }
  }

  _flash(x, y, z, size, hex, life, shape = SH.BURST, self = false) {
    const s = this.sp.s();
    const rf = this.reduceFlash;
    s.x = x; s.y = y; s.z = z; s.life = life; s.size = size * (rf ? 0.6 : 0.55); s.size1 = size * (rf ? 0.8 : 1.15);
    s.shape = shape; s.rot = rnd() * TAU; s.add = 0.35; s.alpha = rf ? 0.3 : 0.85; s.fade = 1.5; s.self = 0;
    s.color(hex, 1.1);
    this.sp.add(s);
  }

  _gemGlints(x, y, z, n, hex) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      s.x = x + rr(-0.2, 0.2); s.y = y + rr(0, 0.3); s.z = z + rr(-0.2, 0.2);
      s.vy = rr(1.5, 3); s.vx = rr(-1, 1); s.vz = rr(-1, 1); s.drag = 2;
      s.life = rr(0.3, 0.45); s.size = rr(0.22, 0.3); s.shape = SH.GEM; s.add = 0.3; s.fade = 2;
      s.color(hex, 1.2);
      this.sp.add(s);
    }
  }

  _bubbles(x, y, z, n, hex) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = rnd() * TAU;
      s.x = x + Math.cos(a) * 0.5; s.y = y + rr(-0.2, 0.4); s.z = z + Math.sin(a) * 0.5;
      s.mode = MO.RISE; s.vx = Math.cos(a) * rr(2, 4); s.vz = Math.sin(a) * rr(2, 4); s.vy = rr(0.8, 1.8); s.k1 = 5; s.k2 = rnd() * TAU;
      s.life = rr(0.6, 0.9); s.size = rr(0.25, 0.45); s.shape = SH.BUBBLE; s.add = 0.2; s.self = 1; s.fade = 3;
      s.color(hex, 1.1);
      this.sp.add(s);
    }
  }

  _steam(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      s.x = x + rr(-0.3, 0.3); s.y = y; s.z = z + rr(-0.3, 0.3);
      s.vy = rr(1, 2); s.vx = rr(-0.5, 0.5); s.vz = rr(-0.5, 0.5); s.drag = 1.5;
      s.life = rr(0.5, 0.8); s.size = rr(0.22, 0.32); s.size1 = s.size * 2; s.shape = SH.PUFF; s.add = 0; s.fade = 1.5; s.alpha = 0.8;
      s.delay = i * 0.05; s.self = 1;
      s.color(0xeef2fb);
      this.sp.add(s);
    }
  }

  _spiralIn(cx, cz, r, hexes, y, self, streak = false) {
    const s = this.sp.s();
    s.mode = MO.SPIRAL; s.ox = cx; s.oz = cz; s.oy = y; s.k1 = rnd() * TAU; s.k2 = r;
    s.x = cx + Math.cos(s.k1) * r; s.z = cz + Math.sin(s.k1) * r; s.y = rr(0.1, 1.2);
    s.vx = rr(2, 4); s.grav = rr(6, 12); s.vz = rr(4, 9);
    s.life = 1.2; s.size = streak ? 0.1 : rr(0.22, 0.34);
    s.shape = streak ? SH.STREAK : SH.SPARKLE; s.stretch = streak ? 104 : 0; s.rotV = 5;
    s.color(pick(hexes), 1.3); s.add = 0.5; s.self = self ? 1 : 0;
    this.sp.add(s);
  }

  _confettiBurst(x, y, z, n, self) {
    n = Math.round(n * this.emit);
    for (let i = 0; i < n; i++) {
      const s = this.sp.s();
      const a = rnd() * TAU, sp = rr(2, 6);
      s.x = x; s.y = y; s.z = z;
      s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = rr(5, 9); s.grav = 3;
      s.mode = MO.FLUTTER; s.k1 = rr(3, 7); s.k2 = rnd() * TAU; s.rot = rnd() * TAU; s.rotV = rr(-6, 6);
      s.life = rr(1.8, 2.6); s.size = rr(0.28, 0.4); s.shape = SH.RECT; s.add = 0; s.fade = 5; s.self = self ? 1 : 0;
      s.color(pick(PAL.confetti), 1.05);
      this.sp.add(s);
    }
  }

  _confettiRain() {
    if (this.clock - this.lastRain < 3) return;
    this.lastRain = this.clock;
    const e = this._ev(K.RAIN);
    if (!e) return;
    e.dur = TUNE.confetti.rainTime; e.n = Math.round(TUNE.confetti.rain * this.emit); e.acc = 0;
  }

  _ev(kind) {
    for (let i = 0; i < this.evs.length; i++) {
      const e = this.evs[i];
      if (!e.on) {
        e.on = true; e.kind = kind; e.t = 0; e.dur = 1; e.x = 0; e.y = 0; e.z = 0; e.r = 1;
        e.a = 0; e.b = 0; e.c = 0; e.e = 0; e.n = 0; e.f1 = 0; e.f2 = 0; e.f3 = 0; e.acc = 0; e.game = false;
        return e;
      }
    }
    return null;
  }

  // compile every shader on the first rendered frame (no hitch on the first smash)
  _prewarm() {
    const y = -60;
    for (let sh = 0; sh <= 10; sh++) {
      const s = this.sp.s(); s.x = 0; s.y = y; s.z = 0; s.size = 0.001; s.alpha = 0; s.life = 0.05; s.shape = sh; this.sp.add(s);
    }
    this.rings.anim(0, 0, 0.01, 0.01, 0.05, HEX.white, 0, { y });
    this.shards.add(0, y, 0, 0, 0, 0, 0.001, col(HEX.white), 1, 0.05);
    this.ghosts.add(0, y, 0, 0, 0.001, col(HEX.white), 0, 0.05);
    this.freed.add(0, y, 0, 0.001, false);
    this.bolts.spawn(0, y, 0, 0, y - 1, 0, col(HEX.white), { life: 0.05, branches: 0 });
    // immediate systems: draw one invisible instance for their first frame
    this.beams.now(0, 0, y, 0.001, 0.001, col(HEX.white), 0);
    this.shells.now(0, y, 0, 0.001, col(HEX.white), 0);
    this.beams.end(); this.shells.end();
    this.ribbon.push(0, y, 0); this.ribbon.push(0.5, y, 0);
  }
}
