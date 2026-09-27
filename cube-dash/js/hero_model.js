// ─────────────────────────────────────────────────────────────
// CUBE DASH — hero character model & cosmetics
//   createHeroModel(heroId, skinId, {hat, trail}) → HeroModel
//
//   The poster hero: a soft clay cube (art.js face shader) with tiny round
//   hands & feet, per-hero silhouette touches (Blu antenna · Mochi softer +
//   bandage · Zap lightning hair + blue outline · Stella star tiara), skins
//   (colour + 'shine' / 'galaxy' patterns injected into the face shader),
//   every HATS id as a little procedural prop, and TRAILS colours for fx.
//
//   Animation: idle breathing, random blinks, hop-walk with alternating
//   feet + hand swing, lean into velocity & bank into turns, squash/stretch
//   spring, dash stretch, landing squash, tired (sweat + panting + greyed),
//   hurt face + flash, celebrate (JOY + waving), nova-ready golden aura,
//   i-frame 6 Hz pulse + cyan bubble, pupils follow lookX/lookY.
//   Emotes: model.emote('yawn') / model.yawn() — ~1.3 s sleepy yawn (eyes squeeze shut, big
//   round mouth, arms stretch overhead, body stretches tall) for the night lobby (§4.4).
//
//   Hierarchy (origin at the FEET centre, face = local +Z):
//     group ─ ring (cyan ground ring, stays on the floor)
//           └ pivot (lean / bank) ─ limbs (4 instanced spheres) · sweat · bubble · motes
//                                  └ lift (hop) ─ squash (spring scale, origin = body bottom)
//                                                 ─ body · outline · aura · accents · hat
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { roundedBoxGeometry, createCubeMaterial, EXPR, LIGHT } from './art.js';
import { HEROES, SKINS, TRAILS } from './data.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

const TUNE = {
  bodyBottom: 0.12,             // feet peek out below the cube
  blink: { min: 2, max: 5, time: 0.14, double: 0.2 },
  dashStretch: [0.82, 0.84, 1.34],   // across · up · along (local Z = facing)
  land: [1.28, 0.7, 1.28],
  dashKick: [0.72, 0.8, 1.5],
  dashEnd: [1.14, 0.86, 0.9],
  // §7.20 "this is you" ring: cyan band + deep-blue cel edge (cyan alone vanished on the light sand floor)
  ring: { radius: 1.15, width: 0.15, color: 0x40f0ff, edge: 0x1e6fe0, alpha: 0.85, gold: 0xffd23f },
  iframeHz: 6, bubbleHz: 8,
  outline: 0x2b1d3f,
  gold: 0xffd23f,
  sweat: 0xbff3ff,
  yawn: { dur: 1.3, open: 0.3, hold: 0.72, close: 0.9 },   // phases as fractions of dur
};

// per-hero body silhouettes (Mochi is rounder, softer & jigglier)
const SHAPES = {
  blu: { r: 0.2, seg: 4, w: 1, h: 1, d: 1, k: 320, c: 16, breathe: 0.03, outline: TUNE.outline, outlineW: 0.035 },
  mochi: { r: 0.34, seg: 5, w: 1.08, h: 0.94, d: 1.05, k: 230, c: 11, breathe: 0.045, outline: TUNE.outline, outlineW: 0.035 },
  zap: { r: 0.16, seg: 4, w: 0.96, h: 1.0, d: 0.96, k: 360, c: 17, breathe: 0.025, outline: 0x5ab8ff, outlineW: 0.07 },
  stella: { r: 0.22, seg: 4, w: 1, h: 1, d: 1, k: 320, c: 15, breathe: 0.03, outline: TUNE.outline, outlineW: 0.035 },
};

// which hats hide which silhouette accent (they would clip through)
const HIDE_ACCENT = {
  blu: ['antenna', 'wizard', 'w_nebula', 'w_cloud', 'astro'],
  zap: ['wizard', 'w_nebula', 'w_cloud', 'astro'],
  stella: ['wizard', 'w_neon', 'astro'],
  mochi: [],
};

// ─────────────────────────────────────────────────────────────
// Shared "clay" material for limbs, props & fx bits. Same lighting model as
// the art.js face shader (wrapped lambert + hemisphere + rim + soft spec),
// reading the SAME LIGHT objects so setCharacterLighting() retints everything.
// ─────────────────────────────────────────────────────────────
export const CLAY_TIME = { value: 0 };

const CLAY_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vV;
varying vec3 vCol;
varying vec3 vLP;
#include <common>
#include <fog_pars_vertex>
void main() {
#ifdef USE_INSTANCING
  mat4 m = modelMatrix * instanceMatrix;
#else
  mat4 m = modelMatrix;
#endif
#ifdef USE_INSTANCING_COLOR
  vCol = instanceColor;
#else
  vCol = vec3(1.0);
#endif
#ifdef USE_COLOR
  vCol *= color;
#endif
  vLP = position;
  vec4 wp = m * vec4(position, 1.0);
  vN = normalize(mat3(m) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const CLAY_FRAG = /* glsl */`
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform vec4 uFx;        // flash, glow, opacity, -
uniform vec3 uMat;       // spec, shininess, shine (0..1 metallic sheen)
uniform vec3 uLightDir;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uRim;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying vec3 vCol;
varying vec3 vLP;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV);
  vec3 Ld = normalize(uLightDir);
  vec3 base = uColor * vCol;
  float wrap = dot(N, Ld) * 0.5 + 0.5;
  float diff = smoothstep(0.15, 0.95, wrap);
  vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
  vec3 lit = base * (0.38 * hemi + 0.8 * diff);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  lit += uRim * rim * 0.32;
  vec3 H = normalize(Ld + V);
  lit += vec3(1.0) * pow(max(dot(N, H), 0.0), uMat.y) * uMat.x;
  if (uMat.z > 0.0) {
    vec3 R = reflect(-V, N);
    vec3 env = mix(uGround * 0.85, uSky * 1.3, smoothstep(-0.3, 0.5, R.y));
    lit = mix(lit, base * env * 1.1 + env * 0.1, 0.4 * uMat.z);
    lit += vec3(1.0) * pow(max(dot(N, H), 0.0), 160.0) * 1.2 * uMat.z;
    float s = vLP.x * 2.0 + vLP.y * 2.6 + vLP.z;
    float c = fract(uTime * 0.3) * 6.0 - 3.0;
    lit += vec3(1.0) * exp(-pow((s - c) * 4.0, 2.0)) * 0.35 * uMat.z;
  }
  lit = mix(lit, vec3(1.6), uFx.x);
  lit += base * uFx.y * 1.4 + uEmissive;
  gl_FragColor = vec4(lit, uFx.z);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/**
 * Clay material. opts: {emissive, emissiveIntensity, spec, shininess, shine, fx (shared uFx uniform), transparent, opacity}
 * Supports InstancedMesh (+ instanceColor).
 */
export function createClayMaterial(color = 0xffffff, opts = {}) {
  const {
    emissive = 0x000000, emissiveIntensity = 1, spec = 0.3, shininess = 40, shine = 0,
    fx = null, transparent = false, opacity = 1, side = THREE.FrontSide, vertexColors = false,
  } = opts;
  const em = new THREE.Color(emissive).multiplyScalar(emissiveIntensity);
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uEmissive: { value: em },
    uFx: fx || { value: new THREE.Vector4(0, 0, opacity, 0) },
    uMat: { value: new THREE.Vector3(spec, shininess, shine) },
    uLightDir: { value: LIGHT.dir },
    uSky: { value: LIGHT.sky },
    uGround: { value: LIGHT.ground },
    uRim: { value: LIGHT.rim },
    uTime: CLAY_TIME,
    ...THREE.UniformsLib.fog,
  };
  return new THREE.ShaderMaterial({
    uniforms, vertexShader: CLAY_VERT, fragmentShader: CLAY_FRAG,
    fog: true, transparent, side, vertexColors,
  });
}

// ─────────────────────────────────────────────────────────────
// Fresnel shell (aura, i-frame bubble, astro glass)
// ─────────────────────────────────────────────────────────────
const FRES_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vV;
varying vec3 vWN;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * mv;
}`;
const FRES_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uAlpha;
uniform float uPow;
uniform float uBase;
uniform float uHi;
uniform float uTime;
uniform float uBands;
varying vec3 vN;
varying vec3 vV;
varying vec3 vWN;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
  float a = uAlpha * (uBase + (1.0 - uBase) * f);
  vec3 col = uColor;
  if (uBands > 0.0) {
    float b = 0.5 + 0.5 * sin(vWN.y * 9.0 - uTime * 7.0);
    a *= 0.75 + 0.25 * b;
  }
  if (uHi > 0.0) {
    float h = smoothstep(0.9, 0.97, dot(normalize(vWN), normalize(vec3(-0.55, 0.7, 0.45))));
    float h2 = smoothstep(0.965, 0.99, dot(normalize(vWN), normalize(vec3(0.5, 0.45, 0.75))));
    col = mix(col, vec3(1.3), max(h, h2 * 0.8));
    a = max(a, (h + h2 * 0.6) * uHi);
  }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
function fresnelMaterial(color, { alpha = 1, pow = 2, base = 0.1, hi = 0, additive = true, bands = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uAlpha: { value: alpha }, uPow: { value: pow },
      uBase: { value: base }, uHi: { value: hi }, uTime: CLAY_TIME, uBands: { value: bands },
    },
    vertexShader: FRES_VERT, fragmentShader: FRES_FRAG,
    transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

// ─────────────────────────────────────────────────────────────
// Ground ring (permanent cyan "this is you" ring; gold pulse when nova ready)
// ─────────────────────────────────────────────────────────────
const RING_VERT = /* glsl */`
uniform float uS;
varying vec2 vP;
void main() {
  vP = position.xy * uS;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const RING_FRAG = /* glsl */`
uniform vec3 uColor;
uniform vec3 uEdge;
uniform vec3 uGold;
uniform float uAlpha;
uniform float uGlow;
uniform float uTime;
uniform float uR;
uniform float uW;
varying vec2 vP;
void main() {
  float d = length(vP);
  float aa = fwidth(d) * 1.2 + 0.004;
  float inB = uR - uW;
  // cyan band + deep-blue outer cel edge: reads on light sand AND on the pale holo grid
  float band = smoothstep(inB - aa, inB + aa, d) * (1.0 - smoothstep(uR - uW * 0.32 - aa, uR - uW * 0.32 + aa, d));
  float edge = smoothstep(uR - uW * 0.32 - aa, uR - uW * 0.32 + aa, d) * (1.0 - smoothstep(uR - aa, uR + aa, d));
  float ang = atan(vP.y, vP.x);
  // four brighter arc "ticks" that slowly orbit (sci-fi HUD feel)
  float tick = smoothstep(0.62, 0.72, abs(fract(ang / 6.2831853 * 4.0 + uTime * 0.06) - 0.5) * 2.0);
  float inner = (1.0 - smoothstep(0.0, inB, d)) * 0.07 + smoothstep(inB - uW * 2.0, inB, d) * (1.0 - step(inB, d)) * 0.14;
  // nova ready: golden pulse rolling outward
  float ph = fract(uTime * 1.1);
  float pr = uR + 0.08 + ph * 0.55;
  float gp = exp(-pow((d - pr) * 12.0, 2.0)) * (1.0 - ph) * uGlow * 1.4;
  vec3 bandCol = mix(uColor, uGold, uGlow * 0.75) * (1.05 + 0.3 * tick);
  vec3 edgeCol = mix(uEdge, uGold * 0.55, uGlow * 0.6);
  float aBand = band * (0.72 + 0.28 * tick);
  float aEdge = edge * 0.9;
  float aIn = inner;
  float A = (aBand + aEdge + aIn) * uAlpha;
  vec3 col = (bandCol * aBand + edgeCol * aEdge + bandCol * aIn) / max(aBand + aEdge + aIn, 1e-4);
  A = A * (1.0 + uGlow * 0.25) + gp * 0.8;
  col = mix(col, mix(uColor, uGold, 0.85), clamp(gp, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(A, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

// ─────────────────────────────────────────────────────────────
// Skin patterns: injected into the art.js cube shader (material tweak we own).
// 'shine' = glossy metallic sheen + moving highlight band;
// 'galaxy' = nebula swirl + twinkling stars + light "screen" face plate on dark bodies.
// ─────────────────────────────────────────────────────────────
const PAT_DECL = /* glsl */`
uniform float uPattern;
uniform vec3 uPatA;
uniform vec3 uPatB;
uniform float uFacePlate;
float cdH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cdN(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cdH(i), cdH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(cdH(i + vec3(0.0, 1.0, 0.0)), cdH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(cdH(i + vec3(0.0, 0.0, 1.0)), cdH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(cdH(i + vec3(0.0, 1.0, 1.0)), cdH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float cdPlate() {
  if (vLocalN.z < 0.55) return 0.0;
  vec2 q = abs(vLocal.xy - vec2(0.0, -0.02)) - vec2(0.3, 0.2);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.1;
  return 1.0 - smoothstep(-0.012, 0.012, d);
}
`;
const PAT_BASE = /* glsl */`
  if (uPattern > 1.5) {
    vec3 gp = vLocal * 3.1 + vec3(0.0, uTime * 0.05, uTime * 0.02);
    float gn = cdN(gp) * 0.6 + cdN(gp * 2.3 + 7.0) * 0.4;
    float gm = cdN(gp * 1.4 + 19.0);
    base = mix(base, uPatA, smoothstep(0.42, 0.85, gn) * 0.75);
    base = mix(base, uPatB, smoothstep(0.6, 0.92, gm) * 0.6);
    base = mix(base, vec3(0.94, 0.92, 1.0), cdPlate() * uFacePlate);
  }
`;
const PAT_LIGHT = /* glsl */`
  if (uPattern > 0.5 && uPattern < 1.5) {
    vec3 cdR = reflect(-V, N);
    vec3 cdEnv = mix(uGround * 0.85, uSky * 1.3, smoothstep(-0.3, 0.5, cdR.y));
    lit = mix(lit, base * cdEnv * 1.08 + cdEnv * 0.1, 0.36);
    lit += vec3(1.0) * pow(max(dot(N, H), 0.0), 180.0) * 1.1;
    float cdS = vLocal.x * 0.8 + vLocal.y + vLocal.z * 0.45;
    float cdC = fract(uTime * 0.28) * 5.0 - 2.5;
    lit += vec3(1.0) * exp(-pow((cdS - cdC) * 7.0, 2.0)) * 0.42;
  }
  if (uPattern > 1.5) {
    vec3 sp = vLocal * 9.0;
    vec3 cell = floor(sp); vec3 fr = fract(sp) - 0.5;
    float sh = cdH(cell + 3.1);
    vec3 off = vec3(cdH(cell + 1.7), cdH(cell + 5.3), cdH(cell + 9.1)) - 0.5;
    float sd = length(fr - off * 0.6);
    float tw = 0.45 + 0.55 * sin(uTime * (2.0 + sh * 4.0) + sh * 30.0);
    float star = step(0.7, sh) * (1.0 - smoothstep(0.0, 0.1, sd)) * tw;
    star *= 1.0 - cdPlate() * uFacePlate;
    lit += vec3(1.0, 0.95, 0.9) * star * 1.8;
    lit += base * 0.08;
  }
`;
const ANCHOR_MAIN = 'void main() {';
const ANCHOR_BASE = 'vec3 base = vColor;';
const ANCHOR_LIT = 'lit += base * smoothstep(0.7, 1.0, N.y) * 0.08;';
let warnedPatch = false;

// yawn mouth (emote 'yawn'): uYawn 0..1 grows a tall round "O" (+ tongue) out of the current mouth
const ANCHOR_FACE = 'vec4 face(vec2 uv, float expr, float blink, vec2 look) {';
const ANCHOR_MOUTH = 'col.rgb = mix(col.rgb, vec3(0.35, 0.05, 0.08), mouth);';
const YAWN_MOUTH = /* glsl */`
  if (uYawn > 0.001) {
    vec2 yq = m - vec2(0.0, -0.035);
    vec2 yr = vec2(0.04 + 0.032 * uYawn, 0.03 + 0.09 * uYawn);
    float yo = fill(sdEllipse(yq, yr), aa);
    float yt = fill(sdEllipse(yq - vec2(0.0, -yr.y * 0.58), vec2(yr.x * 0.66, yr.y * 0.36)), aa) * yo;
    float yk = smoothstep(0.0, 0.3, uYawn);
    mouth = mix(mouth, yo, yk);
    tongue = mix(tongue, yt, yk);
  }
  `;
let warnedYawn = false;
function patchYawn(mat) {
  const src = mat.fragmentShader;
  if (!src.includes(ANCHOR_FACE) || !src.includes(ANCHOR_MOUTH)) {
    if (!warnedYawn) { console.warn('[hero_model] art.js face shader changed: yawn mouth falls back to SLEEP'); warnedYawn = true; }
    return false;
  }
  mat.fragmentShader = src.replace(ANCHOR_FACE, 'uniform float uYawn;\n' + ANCHOR_FACE).replace(ANCHOR_MOUTH, YAWN_MOUTH + ANCHOR_MOUTH);
  mat.uniforms.uYawn = { value: 0 };
  return true;
}

function patchBodyMaterial(mat, pattern, patA, patB, plate) {
  const src = mat.fragmentShader;
  if (!src.includes(ANCHOR_MAIN) || !src.includes(ANCHOR_BASE) || !src.includes(ANCHOR_LIT)) {
    if (!warnedPatch) { console.warn('[hero_model] art.js shader changed: skin patterns disabled'); warnedPatch = true; }
    return false;
  }
  mat.fragmentShader = src
    .replace(ANCHOR_MAIN, PAT_DECL + ANCHOR_MAIN)
    .replace(ANCHOR_BASE, ANCHOR_BASE + PAT_BASE)
    .replace(ANCHOR_LIT, ANCHOR_LIT + PAT_LIGHT);
  mat.uniforms.uPattern = { value: pattern === 'galaxy' ? 2 : pattern === 'shine' ? 1 : 0 };
  mat.uniforms.uPatA = { value: new THREE.Color(patA) };
  mat.uniforms.uPatB = { value: new THREE.Color(patB) };
  mat.uniforms.uFacePlate = { value: plate };
  return true;
}

// ─────────────────────────────────────────────────────────────
// Geometry cache (shared by every model; never disposed)
// ─────────────────────────────────────────────────────────────
const GEO = new Map();
function geo(key, make) {
  let g = GEO.get(key);
  if (!g) { g = make(); GEO.set(key, g); }
  return g;
}
function starShape(outer = 0.5, inner = 0.22, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i / (n * 2)) * TAU;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
function boltShape() {
  const p = [[0.12, 0.5], [-0.2, 0.02], [0.02, 0.02], [-0.14, -0.5], [0.24, 0.1], [0.02, 0.1], [0.26, 0.5]];
  const s = new THREE.Shape();
  p.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return s;
}
function gearShape(R = 0.3, teeth = 10, depth = 0.07) {
  const s = new THREE.Shape();
  const N = teeth * 4;
  for (let i = 0; i <= N; i++) {
    const k = i % 4;
    const r = k === 1 || k === 2 ? R : R - depth;
    const a = (i / N) * TAU;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, R * 0.32, 0, TAU, true);
  s.holes.push(hole);
  return s;
}
function extrude(shape, depth, bevel = 0.02) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.center();
  g.computeVertexNormals();
  return g;
}
const G_SPHERE = () => geo('sphere', () => new THREE.SphereGeometry(1, 20, 14));
const G_SPHERE_LO = () => geo('sphereLo', () => new THREE.SphereGeometry(1, 12, 8));
function dropGeometry() {
  const g = new THREE.SphereGeometry(1, 12, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > 0) { const k = 1 - y * 0.88; x *= k; z *= k; y *= 1.7; }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// ─────────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────────
const _c1 = new THREE.Color();
function lum(hex) { _c1.setHex(hex); return 0.2126 * _c1.r + 0.7152 * _c1.g + 0.0722 * _c1.b; }
function shade(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * (k < 1 ? 1.05 : 0.95)), clamp(hsl.l * k, 0, 0.97));
  return c.getHex();
}

// ─────────────────────────────────────────────────────────────
// Hats: every HATS id is a tiny procedural prop sitting on the body top.
// Each builder gets the kit K and returns nothing (adds to K.hat).
// ─────────────────────────────────────────────────────────────
const HAT_BUILDERS = {
  antenna(K) { // bobbling alien boppers
    const stalk = geo('hat.antStalk', () => new THREE.CylinderGeometry(0.018, 0.024, 0.34, 8).translate(0, 0.17, 0));
    const colors = [0xffe14d, 0xff7ab8];
    const band = K.mesh(geo('hat.antBand', () => new THREE.TorusGeometry(0.5, 0.03, 8, 40, Math.PI)), K.clay(0x6e7bff));
    band.rotation.set(0, Math.PI / 2, 0); band.position.set(0, -K.bh / 2, 0); band.scale.set(1, K.bh * 1.02, K.bd);
    [-1, 1].forEach((sd, i) => {
      const piv = new THREE.Group();
      piv.position.set(sd * 0.16, 0.0, -0.02);
      piv.rotation.z = -sd * 0.28;
      piv.add(K.mesh(stalk, K.clay(0x6e7bff)));
      const ball = K.mesh(G_SPHERE(), K.clay(colors[i], { emissive: colors[i], emissiveIntensity: 0.55, spec: 0.6 }));
      ball.scale.setScalar(0.085); ball.position.y = 0.37;
      piv.add(ball);
      K.hat.add(piv);
      K.tick((t, dt, s) => { piv.rotation.x = s.wob.x * 1.4; piv.rotation.z = -sd * 0.28 + s.wob.z * 1.4 + Math.sin(t * 3 + i) * 0.04; });
    });
  },
  flower(K) {
    const head = new THREE.Group();
    head.position.set(-0.22, 0.0, 0.17);
    head.scale.setScalar(1.6);
    const stem = K.mesh(geo('hat.stem', () => new THREE.CylinderGeometry(0.018, 0.022, 0.2, 6).translate(0, 0.1, 0)), K.clay(0x5ad06a));
    head.add(stem);
    const bloom = new THREE.Group();
    bloom.position.y = 0.2; bloom.rotation.x = -0.55;
    const petalMat = K.clay(0xffffff, { spec: 0.2 });
    const petalMat2 = K.clay(0xffb3d6, { spec: 0.2 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const p = K.mesh(G_SPHERE(), i % 2 ? petalMat2 : petalMat);
      p.scale.set(0.085, 0.035, 0.055);
      p.position.set(Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085);
      p.rotation.y = -a;
      bloom.add(p);
    }
    const c = K.mesh(G_SPHERE(), K.clay(0xffd23f, { emissive: 0xffb400, emissiveIntensity: 0.15 }));
    c.scale.set(0.06, 0.04, 0.06); c.position.y = 0.02;
    bloom.add(c);
    head.add(bloom);
    K.hat.add(head);
    K.tick((t, dt, s) => { head.rotation.z = Math.sin(t * 2.2) * 0.08 + s.wob.z; head.rotation.x = s.wob.x * 0.8; });
  },
  propeller(K) {
    const cap = K.mesh(geo('hat.capStriped', () => {
      const g = new THREE.SphereGeometry(0.34, 32, 10, 0, TAU, 0, Math.PI / 2);
      const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
      const pal = [0xff7ab8, 0xffe14d, 0x40c8ff, 0x5affa0].map((h) => new THREE.Color(h));
      for (let i = 0; i < pos.count; i++) {
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const k = Math.floor(((a / TAU) + 1.0) * 6 + 0.001) % 4;
        const c = pos.getY(i) > 0.3 ? pal[1] : pal[k];
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return g;
    }), K.clay(0xffffff, { spec: 0.4, vertexColors: true }));
    cap.scale.set(1, 0.5, 1);
    const band = K.mesh(geo('hat.capBand', () => new THREE.TorusGeometry(0.335, 0.03, 8, 32)), K.clay(0x6e7bff));
    band.rotation.x = Math.PI / 2; band.position.y = 0.01;
    const stick = K.mesh(geo('hat.propStick', () => new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6).translate(0, 0.07, 0)), K.clay(0x9aa3b5));
    stick.position.y = 0.15;
    const spin = new THREE.Group();
    spin.position.y = 0.3;
    const hub = K.mesh(G_SPHERE(), K.clay(0xff7ab8)); hub.scale.setScalar(0.045);
    spin.add(hub);
    const bladeG = roundedBoxGeometry(0.4, 2);
    [0x40c8ff, 0xff7ab8].forEach((col, i) => {
      const b = K.mesh(bladeG, K.clay(col, { spec: 0.5 }));
      b.scale.set(0.3, 0.025, 0.09);
      b.position.x = (i ? -1 : 1) * 0.16;
      b.rotation.x = (i ? -1 : 1) * 0.3;
      spin.add(b);
    });
    K.hat.add(cap, band, stick, spin);
    K.tick((t, dt, s) => { spin.rotation.y += dt * (9 + 28 * s.speed + (s.dashing ? 20 : 0)); });
  },
  cat(K) {
    const ear = geo('hat.catEar', () => new THREE.ConeGeometry(0.17, 0.3, 4, 1).rotateY(Math.PI / 4).translate(0, 0.15, 0));
    const earIn = geo('hat.catEarIn', () => new THREE.ConeGeometry(0.1, 0.2, 4, 1).rotateY(Math.PI / 4).translate(0, 0.1, 0));
    const outer = K.clay(K.limbColor);
    const inner = K.clay(0xffa3c7, { spec: 0.15 });
    [-1, 1].forEach((sd, i) => {
      const piv = new THREE.Group();
      piv.position.set(sd * 0.28 * K.bw, -0.02, -0.02);
      piv.rotation.z = -sd * 0.22;
      const o = K.mesh(ear, outer); o.scale.set(1, 1, 0.6);
      const n = K.mesh(earIn, inner); n.scale.set(1, 1, 0.5); n.position.set(0, 0.02, 0.05);
      piv.add(o, n);
      K.hat.add(piv);
      let tw = 0, next = 1.5 + Math.random() * 3;
      K.tick((t, dt, s) => {
        next -= dt;
        if (next <= 0) { tw = 0.25; next = 2 + Math.random() * 3.5; }
        tw = Math.max(0, tw - dt);
        piv.rotation.z = -sd * (0.22 + Math.sin((tw / 0.25) * Math.PI) * 0.25 * (i ? 1 : 0.6)) + s.wob.z * 0.5;
        piv.rotation.x = s.wob.x * 0.4;
      });
    });
  },
  headphones(K) {
    const band = K.mesh(geo('hat.hpBand', () => new THREE.TorusGeometry(0.56, 0.045, 8, 40, Math.PI)), K.clay(0xf4f6ff, { spec: 0.5 }));
    band.position.set(0, -K.bh / 2 + 0.02, -0.04);
    band.scale.set(K.bw * 1.02, 1.08, 1);
    const cupG = geo('hat.hpCup', () => new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24).rotateZ(Math.PI / 2));
    const glowG = geo('hat.hpGlow', () => new THREE.TorusGeometry(0.12, 0.022, 8, 28).rotateY(Math.PI / 2));
    const cupMat = K.clay(0xff7ab8, { spec: 0.5 });
    const glowMat = K.glow(0x40f0ff, 1.8);
    [-1, 1].forEach((sd) => {
      const cup = K.mesh(cupG, cupMat);
      cup.position.set(sd * (K.bw / 2 + 0.05), -0.24, -0.04);
      const g = K.mesh(glowG, glowMat);
      g.position.set(sd * (K.bw / 2 + 0.115), -0.24, -0.04);
      K.hat.add(cup, g);
    });
    K.hat.add(band);
    K.tick((t) => { glowMat.color.setRGB(0.25, 0.94, 1).multiplyScalar(1.4 + Math.sin(t * 6) * 0.5); });
  },
  bunny(K) {
    const earG = geo('hat.bunEar', () => new THREE.CapsuleGeometry(0.1, 0.5, 6, 12).translate(0, 0.33, 0));
    const inG = geo('hat.bunIn', () => new THREE.CapsuleGeometry(0.055, 0.38, 4, 10).translate(0, 0.33, 0));
    const outer = K.clay(0xfdfbff, { spec: 0.2 });
    const inner = K.clay(0xffa3c7, { spec: 0.1 });
    [-1, 1].forEach((sd, i) => {
      const piv = new THREE.Group();
      piv.position.set(sd * 0.17, -0.02, -0.06);
      const o = K.mesh(earG, outer); o.scale.set(1, 1, 0.55);
      const n = K.mesh(inG, inner); n.scale.set(1, 1, 0.4); n.position.z = 0.045;
      piv.add(o, n);
      K.hat.add(piv);
      K.tick((t, dt, s) => {
        piv.rotation.z = -sd * (0.18 + (i ? 0.12 : 0)) + s.wob.z * 1.6;
        piv.rotation.x = -0.15 + s.wob.x * 1.8 + Math.sin(t * 2.4 + i) * 0.03;
      });
    });
  },
  astro(K) {
    const glass = new THREE.Mesh(G_SPHERE(), fresnelMaterial(0xbff3ff, { alpha: 0.55, pow: 2.2, base: 0.12, hi: 0.75, additive: false }));
    K.own(glass.material);
    glass.renderOrder = 3;
    glass.scale.set(0.86 * K.bw, 0.74 * K.bh, 0.86 * K.bd);
    glass.position.y = -K.bh / 2 + 0.06;
    const collar = K.mesh(geo('hat.collar', () => new THREE.TorusGeometry(0.6, 0.06, 10, 40)), K.clay(0xf2f6ff, { spec: 0.6 }));
    collar.rotation.x = Math.PI / 2; collar.position.y = -K.bh + 0.05;
    collar.scale.set(K.bw, K.bd, 1);
    const ant = K.mesh(geo('hat.astroAnt', () => new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6).translate(0, 0.08, 0)), K.clay(0xdfe6f5));
    ant.position.set(0.18, -K.bh / 2 + 0.06 + 0.74 * K.bh * 0.9 - 0.02, 0);
    const tip = K.mesh(G_SPHERE_LO(), K.glow(0xffe14d, 2.0));
    tip.scale.setScalar(0.045); tip.position.set(0.18, ant.position.y + 0.17, 0);
    K.hat.add(glass, collar, ant, tip);
    tip.userData.keep = true;
    K.tick((t) => { tip.visible = (t % 1.2) < 0.8; });
  },
  wizard(K) {
    const hatCol = 0x5b3cc4;
    const hm = K.clay(hatCol);
    const brim = K.mesh(geo('hat.brim', () => new THREE.CylinderGeometry(0.52, 0.54, 0.04, 32)), hm);
    brim.position.y = 0.02; brim.scale.set(K.bw, 1, K.bd);
    const cone = K.mesh(geo('hat.wizLow', () => new THREE.CylinderGeometry(0.13, 0.33, 0.42, 24).translate(0, 0.21, 0)), hm);
    cone.position.y = 0.03;
    const bandM = K.mesh(geo('hat.wizBand', () => new THREE.TorusGeometry(0.31, 0.035, 8, 32)), K.clay(0xffd23f, { shine: 0.8, spec: 0.6 }));
    bandM.rotation.x = Math.PI / 2; bandM.position.y = 0.09;
    const tipPiv = new THREE.Group();
    tipPiv.position.y = 0.44;
    const tip = K.mesh(geo('hat.wizTip', () => new THREE.ConeGeometry(0.13, 0.36, 20).translate(0, 0.18, 0)), hm);
    const pom = K.mesh(G_SPHERE_LO(), K.glow(0xffe27a, 2.2));
    pom.scale.setScalar(0.05); pom.position.y = 0.37;
    tipPiv.add(tip, pom);
    const starG = geo('hat.star', () => extrude(starShape(0.5, 0.22), 0.12, 0.03));
    const st = K.mesh(starG, K.clay(0xffe27a, { emissive: 0xffc23a, emissiveIntensity: 0.4, shine: 0.6 }));
    st.scale.setScalar(0.14); st.position.set(0.02, 0.24, 0.24); st.rotation.x = -0.35;
    K.hat.add(brim, cone, bandM, tipPiv, st);
    K.hat.rotation.z = 0.06;
    K.tick((t, dt, s) => { tipPiv.rotation.x = -0.55 + s.wob.x * 1.6; tipPiv.rotation.z = s.wob.z * 1.6 + Math.sin(t * 1.7) * 0.05; });
  },
  crown(K) {
    const gold = K.clay(0xffc23a, { shine: 1, spec: 0.7, shininess: 60 });
    const band = K.mesh(geo('hat.crownBand', () => new THREE.CylinderGeometry(0.3, 0.27, 0.15, 30, 1, true).translate(0, 0.075, 0)), gold);
    band.material.side = THREE.DoubleSide;
    const spikeG = geo('hat.crownSpike', () => new THREE.ConeGeometry(0.065, 0.17, 10).translate(0, 0.085, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + Math.PI / 2;
      const sp = K.mesh(spikeG, gold);
      sp.position.set(Math.cos(a) * 0.29, 0.14, Math.sin(a) * 0.29);
      const ball = K.mesh(G_SPHERE_LO(), gold);
      ball.scale.setScalar(0.035); ball.position.set(sp.position.x, 0.32, sp.position.z);
      K.hat.add(sp, ball);
    }
    const gemCols = [0x40f0ff, 0xff7ab8, 0x5affa0];
    gemCols.forEach((c, i) => {
      const a = Math.PI / 2 + (i - 1) * 0.55;
      const g = K.mesh(G_SPHERE_LO(), K.clay(c, { emissive: c, emissiveIntensity: 0.7, spec: 0.9, shininess: 90 }));
      g.scale.setScalar(0.045); g.position.set(Math.cos(a) * 0.3, 0.07, Math.sin(a) * 0.3);
      K.hat.add(g);
    });
    K.hat.add(band);
  },
  halo(K) {
    const ring = K.mesh(geo('hat.halo', () => new THREE.TorusGeometry(0.3, 0.042, 12, 44)), K.glow(0xfff0b0, 2.4));
    ring.rotation.x = Math.PI / 2;
    const piv = new THREE.Group();
    piv.add(ring);
    piv.position.y = 0.3;
    K.hat.add(piv);
    K.tick((t) => { piv.position.y = 0.3 + Math.sin(t * 2.1) * 0.035; piv.rotation.z = Math.sin(t * 1.3) * 0.06; });
  },
  w_cloud(K) {
    const m = K.clay(0xf6fbff, { spec: 0.12 });
    const puffs = [[0, 0.1, 0, 0.26], [0.21, 0.05, 0.06, 0.19], [-0.21, 0.05, 0.05, 0.2], [0.05, 0.08, -0.19, 0.2], [-0.1, 0.2, -0.04, 0.18], [0.12, 0.2, 0.03, 0.15]];
    const grp = new THREE.Group();
    puffs.forEach(([x, y, z, r]) => { const p = K.mesh(G_SPHERE(), m); p.position.set(x, y, z); p.scale.set(r, r * 0.82, r); grp.add(p); });
    K.hat.add(grp);
    K.tick((t) => { grp.position.y = Math.sin(t * 1.6) * 0.02; });
  },
  w_neon(K) {
    const frame = K.mesh(roundedBoxGeometry(0.35, 2), K.clay(0x232a6b, { spec: 0.6 }));
    frame.scale.set(0.92 * K.bw, 0.15, 0.2);
    frame.position.set(0, -0.06, K.bd / 2 - 0.07);
    frame.rotation.x = -0.28;
    const lensMat = new THREE.ShaderMaterial({
      uniforms: { uTime: CLAY_TIME },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main(){ vec3 a = vec3(0.25,0.95,1.0), b = vec3(1.0,0.35,0.9);
          vec3 c = mix(a, b, vUv.x); float scan = exp(-pow((vUv.x - fract(uTime*0.6))*9.0, 2.0));
          gl_FragColor = vec4(c * (1.5 + scan * 1.5), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    K.own(lensMat);
    const lens = K.mesh(geo('hat.lens', () => new THREE.PlaneGeometry(1, 1)), lensMat);
    lens.scale.set(0.78 * K.bw, 0.075, 1);
    lens.position.set(0, -0.045, K.bd / 2 + 0.035);
    lens.rotation.x = -0.28;
    const podG = geo('hat.pod', () => new THREE.CylinderGeometry(0.06, 0.06, 0.08, 14).rotateZ(Math.PI / 2));
    const podMat = K.glow(0xff5fd2, 1.8);
    [-1, 1].forEach((sd) => { const p = K.mesh(podG, podMat); p.position.set(sd * (0.46 * K.bw), -0.07, K.bd / 2 - 0.08); K.hat.add(p); });
    K.hat.add(frame, lens);
  },
  w_crystal(K) {
    const crysG = geo('hat.crystal', () => new THREE.OctahedronGeometry(0.16, 0));
    const mat = K.clay(0xb9f3ff, { emissive: 0x7fb8ff, emissiveIntensity: 0.35, spec: 0.9, shininess: 90, shine: 0.6 });
    const main = K.mesh(crysG, mat);
    main.scale.set(0.55, 2.3, 0.55); main.position.set(0, 0.3, 0.08); main.rotation.x = 0.22;
    const s1 = K.mesh(crysG, mat); s1.scale.set(0.4, 1.3, 0.4); s1.position.set(0.2, 0.14, -0.04); s1.rotation.z = -0.5;
    const s2 = K.mesh(crysG, mat); s2.scale.set(0.4, 1.3, 0.4); s2.position.set(-0.2, 0.14, -0.04); s2.rotation.z = 0.5;
    K.hat.add(main, s1, s2);
    const em = mat.uniforms.uEmissive.value;
    K.tick((t) => { em.setRGB(0.5, 0.72, 1.0).multiplyScalar(0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.5))); });
  },
  w_nebula(K) {
    const cap = K.mesh(geo('hat.nebCap', () => new THREE.SphereGeometry(0.42, 28, 12, 0, TAU, 0, Math.PI / 2)), K.clay(0x6a3cff, { spec: 0.5, shine: 0.35 }));
    cap.scale.set(1.12 * K.bw, 0.62, 1.12 * K.bd);
    const bandMat = K.glow(0xff7ad9, 1.6);
    const band = K.mesh(geo('hat.nebBand', () => new THREE.TorusGeometry(0.47, 0.025, 8, 40)), bandMat);
    band.rotation.x = Math.PI / 2; band.position.y = 0.015; band.scale.set(K.bw, K.bd, 1);
    const orbit = new THREE.Group();
    orbit.position.y = 0.2;
    const ring = K.mesh(geo('hat.nebRing', () => new THREE.TorusGeometry(0.56, 0.018, 6, 48)), K.glow(0x7ff6ff, 1.5));
    ring.rotation.x = Math.PI / 2;
    const moon = K.mesh(G_SPHERE_LO(), K.clay(0xffe27a, { emissive: 0xffc23a, emissiveIntensity: 0.4 }));
    moon.scale.setScalar(0.06); moon.position.x = 0.56;
    orbit.add(ring, moon);
    orbit.rotation.z = 0.35;
    const fin = K.mesh(roundedBoxGeometry(0.4, 2), K.clay(0xff7ad9));
    fin.scale.set(0.05, 0.14, 0.34); fin.position.set(0, 0.26, -0.04);
    K.hat.add(cap, band, orbit, fin);
    K.tick((t, dt) => { orbit.rotation.y += dt * 1.6; });
  },
  w_foundry(K) {
    const gearG = geo('hat.gear', () => extrude(gearShape(0.3, 10, 0.075), 0.08, 0.015).rotateX(-Math.PI / 2));
    const gear = K.mesh(gearG, K.clay(0xff9f1c, { shine: 0.8, spec: 0.6 }));
    gear.position.y = 0.06;
    const bolt = K.mesh(geo('hat.bolt', () => new THREE.CylinderGeometry(0.09, 0.09, 0.14, 6)), K.clay(0x5d6680, { spec: 0.7, shine: 0.5 }));
    bolt.position.y = 0.09;
    const light = K.mesh(G_SPHERE_LO(), K.glow(0x3cffd1, 2));
    light.scale.setScalar(0.045); light.position.y = 0.18;
    K.hat.add(gear, bolt, light);
    gear.userData.keep = true;
    K.tick((t, dt) => { gear.rotation.y += dt * 0.9; });
  },
  w_core(K) {
    const N = 14;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    mat.color.setScalar(1.8);
    K.own(mat);
    const im = new THREE.InstancedMesh(geo('hat.pixel', () => new THREE.BoxGeometry(0.075, 0.075, 0.075)), mat, N);
    im.frustumCulled = false;
    const cols = [0xff3df2, 0x39e6ff, 0xffffff, 0xff3df2, 0x39e6ff];
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) im.setColorAt(i, c.setHex(cols[i % cols.length]));
    const piv = new THREE.Group();
    piv.position.y = 0.32;
    piv.add(im);
    K.hat.add(piv);
    K.own(im);
    const m4 = new THREE.Matrix4();
    const jit = new Float32Array(N * 3);
    let acc = 0;
    K.tick((t, dt) => {
      acc -= dt;
      if (acc <= 0) {
        acc = 0.09;
        for (let i = 0; i < N * 3; i++) jit[i] = (Math.random() - 0.5) * 0.06;
        for (let i = 0; i < N; i++) if (Math.random() < 0.12) jit[i * 3 + 1] = 99; // glitch-hide
      }
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const hide = jit[i * 3 + 1] > 50;
        m4.makeScale(hide ? 0.001 : 1, hide ? 0.001 : 1, hide ? 0.001 : 1);
        m4.setPosition(Math.cos(a) * 0.36 + jit[i * 3], hide ? 0 : jit[i * 3 + 1] * 0.5, Math.sin(a) * 0.36 + jit[i * 3 + 2]);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      piv.rotation.y += dt * 0.8;
      piv.position.y = 0.32 + Math.sin(t * 2) * 0.03;
    });
  },
};

// ─────────────────────────────────────────────────────────────
// Per-hero silhouette accents
// ─────────────────────────────────────────────────────────────
const ACCENTS = {
  blu(K) {
    const piv = new THREE.Group();
    piv.position.set(0.25, -0.01, -0.25);
    const stalk = K.mesh(geo('acc.bluStalk', () => new THREE.CylinderGeometry(0.022, 0.03, 0.26, 8).translate(0, 0.13, 0)), K.clay(K.limbColor));
    const tipCol = K.hero.accent ?? 0x8fd3ff;
    const tip = K.mesh(G_SPHERE(), K.clay(tipCol, { emissive: tipCol, emissiveIntensity: 0.5, spec: 0.7 }));
    tip.scale.setScalar(0.075); tip.position.y = 0.29;
    piv.add(stalk, tip);
    K.accent.add(piv);
    K.tick((t, dt, s) => { piv.rotation.x = -0.15 + s.wob.x * 1.6; piv.rotation.z = -0.12 + s.wob.z * 1.6; });
  },
  mochi(K) { // soft body is the silhouette; plus a cheeky criss-cross bandage on the top
    const strip = roundedBoxGeometry(0.45, 2);
    const plaster = K.clay(0xffe2c4, { spec: 0.15 });
    const pad = K.clay(0xf2c49a, { spec: 0.1 });
    const grp = new THREE.Group();
    grp.position.set(0.2 * K.bw, 0.004, 0.2 * K.bd);
    [0.62, -0.62].forEach((ry, i) => {
      const s = K.mesh(strip, plaster);
      s.scale.set(0.34, 0.035, 0.12); s.rotation.y = ry; s.position.y = i * 0.006;
      grp.add(s);
    });
    const p = K.mesh(strip, pad); p.scale.set(0.11, 0.045, 0.1); p.position.y = 0.008; p.rotation.y = 0.62;
    grp.add(p);
    K.accent.add(grp);
  },
  zap(K) { // electric lightning-bolt hair
    const boltG = geo('acc.bolt', () => extrude(boltShape(), 0.12, 0.025));
    const mat = K.clay(0x5ab8ff, { emissive: 0x3aa0ff, emissiveIntensity: 0.55, spec: 0.7, shininess: 70 });
    const spec = [[0, 0.17, -0.06, 0.46, 0, -0.18], [0.2, 0.12, -0.14, 0.34, -0.42, -0.3], [-0.2, 0.12, -0.14, 0.34, 0.42, -0.3]];
    const grp = new THREE.Group();
    spec.forEach(([x, y, z, s, rz, rx]) => {
      const b = K.mesh(boltG, mat);
      b.scale.setScalar(s); b.position.set(x, y, z); b.rotation.set(rx, 0, rz);
      grp.add(b);
    });
    K.accent.add(grp);
    const em = mat.uniforms.uEmissive.value;
    K.tick((t, dt, s) => {
      grp.rotation.x = s.wob.x * 0.6; grp.rotation.z = s.wob.z * 0.6;
      const f = Math.random() < 0.06 ? 1.2 : 0.55;
      em.setRGB(0.23, 0.63, 1.0).multiplyScalar(f);
    });
  },
  stella(K) { // star tiara on the top front edge
    const gold = K.clay(0xffe27a, { shine: 0.9, spec: 0.7 });
    const bar = K.mesh(roundedBoxGeometry(0.45, 2), gold);
    bar.scale.set(0.72 * K.bw, 0.05, 0.06); bar.position.set(0, 0.012, K.bd / 2 - 0.1);
    const starG = geo('hat.star', () => extrude(starShape(0.5, 0.22), 0.12, 0.03));
    const starMat = K.clay(0xffe27a, { emissive: 0xffc23a, emissiveIntensity: 0.55, shine: 0.7, spec: 0.8 });
    const big = K.mesh(starG, starMat);
    big.scale.setScalar(0.3); big.position.set(0, 0.15, K.bd / 2 - 0.1); big.rotation.x = -0.4;
    big.userData.keep = true;                 // wobbles on its own (not merged)
    const sm = [-1, 1].map((sd) => {
      const s = K.mesh(starG, starMat);
      s.scale.setScalar(0.15); s.position.set(sd * 0.25, 0.08, K.bd / 2 - 0.1); s.rotation.set(-0.4, 0, sd * -0.3);
      return s;
    });
    K.accent.add(bar, big, ...sm);
    const em = starMat.uniforms.uEmissive.value;
    K.tick((t) => { em.setRGB(1, 0.76, 0.23).multiplyScalar(0.4 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3))); big.rotation.y = Math.sin(t * 1.5) * 0.25; });
  },
};

// ─────────────────────────────────────────────────────────────
// Static merge: sibling meshes that share a material and are not animated on
// their own (userData.keep) are baked into ONE geometry → one draw call.
// Animated pivots/groups are parents, so their children still move together.
// ─────────────────────────────────────────────────────────────
function mergeStatic(root, own) {
  const parents = [];
  root.traverse((o) => { if (o.children.length > 1) parents.push(o); });
  for (const par of parents) {
    const groups = new Map();
    for (const c of par.children) {
      if (!c.isMesh || c.isInstancedMesh || c.userData.keep || c.children.length || !c.geometry?.attributes?.normal) continue;
      let l = groups.get(c.material);
      if (!l) groups.set(c.material, (l = []));
      l.push(c);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const g = bakeGeometries(list);
      if (!g) continue;
      const m = new THREE.Mesh(g, list[0].material);
      m.renderOrder = list[0].renderOrder;
      m.name = 'merged';
      for (const c of list) par.remove(c);
      par.add(m);
      own.push(g);
    }
  }
}
function bakeGeometries(list) {
  const withColor = list.every((m) => m.geometry.attributes.color);
  const parts = [];
  let total = 0;
  for (const m of list) {
    m.updateMatrix();
    const src = m.geometry;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.attributes.position.clone());
    g.setAttribute('normal', src.attributes.normal.clone());
    if (withColor) g.setAttribute('color', src.attributes.color.clone());
    if (src.index) g.setIndex(src.index.clone());
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    flat.applyMatrix4(m.matrix);
    parts.push(flat);
    total += flat.attributes.position.count;
  }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), cl = withColor ? new Float32Array(total * 3) : null;
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (cl) cl.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (cl) out.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  out.computeBoundingSphere();
  return out;
}

// ─────────────────────────────────────────────────────────────
// HeroModel
// ─────────────────────────────────────────────────────────────
const EMPTY = {};
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

class HeroModel {
  constructor(heroId, skinId, { hat = 'none', trail = 'default' } = {}) {
    const hero = HEROES.find((h) => h.id === heroId) || HEROES[0];
    this.heroId = hero.id;
    this.hero = hero;
    const skin = (skinId && SKINS.find((s) => s.id === skinId && s.hero === hero.id))
      || SKINS.find((s) => s.hero === hero.id && s.default) || null;
    this.skinId = skin?.id ?? null;
    this.hatId = hat || 'none';
    this.trailId = trail || 'default';
    const tr = TRAILS.find((x) => x.id === this.trailId);
    /** hex colours for the fx dash trail (null = hero colour) */
    this.trailColors = tr?.colors ? tr.colors.slice() : null;

    const shape = SHAPES[hero.id] || SHAPES.blu;
    this.shape = shape;
    const bodyHex = skin?.color ?? hero.color;
    this.color = bodyHex;
    const pattern = skin?.pattern || null;
    this.pattern = pattern;
    const dark = lum(bodyHex) < 0.12;
    const bright = lum(bodyHex) > 0.8;
    const limbHex = bright ? 0xd4def2 : pattern === 'galaxy' ? shade(bodyHex, 1.25) : shade(bodyHex, 0.8);
    this.limbColor = limbHex;

    this._own = [];
    this._ticks = [];
    this.t = Math.random() * 10;

    // shared flash/glow uniform for every clay part
    this.fxU = { value: new THREE.Vector4(0, 0, 1, 0) };

    // ---- nodes
    this.group = new THREE.Group();
    this.group.name = 'hero:' + hero.id;
    // non-enumerable: Object3D.clone() JSON-copies userData and would choke on the cycle
    Object.defineProperty(this.group.userData, 'heroModel', { value: this, enumerable: false, configurable: true });
    this.pivot = new THREE.Group();
    this.lift = new THREE.Group();
    this.sq = new THREE.Group();
    this.sq.position.y = TUNE.bodyBottom;
    this.group.add(this.pivot);
    this.pivot.add(this.lift);
    this.lift.add(this.sq);

    // ---- body (art.js face shader + our skin-pattern tweak)
    const bw = shape.w, bh = shape.h, bd = shape.d;
    this.bw = bw; this.bh = bh; this.bd = bd;
    const bodyGeo = roundedBoxGeometry(shape.r, shape.seg);
    const bodyMat = createCubeMaterial({ color: bodyHex });
    this._yawnMouth = patchYawn(bodyMat);
    if (pattern) {
      const pinkish = (() => { _c1.setHex(bodyHex); return _c1.r > _c1.b; })();
      const patA = pinkish ? 0x7a4cff : 0xff6fd8;
      const patB = pinkish ? 0xfff0a0 : 0x5ad8ff;
      patchBodyMaterial(bodyMat, pattern, patA, patB, dark ? 1 : 0);
    }
    bodyMat.uniforms.uFx = this.fxU;
    this._own.push(bodyMat);
    this.bodyMat = bodyMat;
    this.baseColor = new THREE.Color(bodyHex);
    this.limbBase = new THREE.Color(limbHex);
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.scale.set(bw, bh, bd);
    this.body.position.y = bh / 2;
    this.sq.add(this.body);

    // outline hull (thin plum; Zap: electric blue accent)
    const olMat = new THREE.MeshBasicMaterial({ color: shape.outline, side: THREE.BackSide, fog: false });
    this._own.push(olMat);
    this.outline = new THREE.Mesh(bodyGeo, olMat);
    const ow = shape.outlineW;
    this.outline.scale.set(bw + ow, bh + ow, bd + ow);
    this.outline.position.y = bh / 2;
    this.sq.add(this.outline);

    // golden nova-ready aura (fresnel shell)
    this.auraMat = fresnelMaterial(TUNE.gold, { alpha: 0, pow: 1.8, base: 0.02, bands: 1, additive: false });
    this._own.push(this.auraMat);
    this.aura = new THREE.Mesh(bodyGeo, this.auraMat);
    this.aura.scale.set(bw * 1.16, bh * 1.16, bd * 1.16);
    this.aura.position.y = bh / 2;
    this.aura.visible = false;
    this.aura.renderOrder = 4;
    this.sq.add(this.aura);

    // ---- limbs: 2 hands + 2 feet in ONE instanced draw
    this.limbMat = createClayMaterial(limbHex, { fx: this.fxU, spec: 0.3 });
    this._own.push(this.limbMat);
    this.limbs = new THREE.InstancedMesh(G_SPHERE(), this.limbMat, 4);
    this.limbs.frustumCulled = false;
    this._own.push(this.limbs);            // InstancedMesh.dispose() frees its instanceMatrix GL buffer
    this.pivot.add(this.limbs);
    this.hand = [new THREE.Vector3(), new THREE.Vector3()];
    this.handT = [new THREE.Vector3(), new THREE.Vector3()];
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1;
      this.hand[i].set(sd * (bw / 2 + 0.05), bh * 0.42, 0.04);
    }

    // ---- sweat drops (tired)
    this.sweatMat = createClayMaterial(TUNE.sweat, { spec: 0.9, shininess: 80, emissive: 0x6fd8ff, emissiveIntensity: 0.15 });
    this._own.push(this.sweatMat);
    this.sweat = new THREE.InstancedMesh(geo('drop', dropGeometry), this.sweatMat, 3);
    this.sweat.frustumCulled = false;
    this._own.push(this.sweat);
    this.sweat.visible = false;
    this.pivot.add(this.sweat);

    // ---- i-frame bubble shield
    // soap-bubble shield: NORMAL blend (additive cyan over a yellow/green hero read as a white blob)
    this.bubbleMat = fresnelMaterial(0x40f0ff, { alpha: 0, pow: 2.2, base: 0.06, hi: 0.5, additive: false });
    this._own.push(this.bubbleMat);
    this.bubble = new THREE.Mesh(geo('bubble', () => new THREE.SphereGeometry(0.88, 32, 18)), this.bubbleMat);
    this.bubble.visible = false;
    this.bubble.renderOrder = 5;
    this.lift.add(this.bubble);
    this.bubble.position.y = TUNE.bodyBottom + bh / 2;

    // ---- golden motes (nova ready)
    this._buildMotes();

    // ---- ground ring
    this.ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(TUNE.ring.color) }, uGold: { value: new THREE.Color(TUNE.ring.gold) },
        uEdge: { value: new THREE.Color(TUNE.ring.edge) },
        uAlpha: { value: TUNE.ring.alpha }, uGlow: { value: 0 }, uTime: CLAY_TIME,
        uR: { value: TUNE.ring.radius }, uW: { value: TUNE.ring.width },
      },
      vertexShader: RING_VERT, fragmentShader: RING_FRAG,
      extensions: { derivatives: true },
      transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this._own.push(this.ringMat);
    const rs = (TUNE.ring.radius + 0.75) * 2;
    this.ringMat.uniforms.uS = { value: rs };
    // XY plane laid flat by the mesh rotation; the shader works in world units (vP = xy * uS)
    this.ring = new THREE.Mesh(geo('plane', () => new THREE.PlaneGeometry(1, 1)), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.scale.set(rs, rs, 1);
    this.ring.position.y = 0.03;
    this.ring.renderOrder = 1;
    this.ring.frustumCulled = false;
    this.group.add(this.ring);

    // ---- accents & hat (kit)
    const K = this._kit();
    this.accentNode = new THREE.Group();
    this.accentNode.position.y = bh;
    this.sq.add(this.accentNode);
    K.accent = this.accentNode;
    const hidden = (HIDE_ACCENT[hero.id] || []).includes(this.hatId);
    if (ACCENTS[hero.id] && !hidden) ACCENTS[hero.id](K);
    this.hatNode = new THREE.Group();
    this.hatNode.position.y = bh;
    this.sq.add(this.hatNode);
    K.hat = this.hatNode;
    if (HAT_BUILDERS[this.hatId]) HAT_BUILDERS[this.hatId](K);
    // bake static same-material props into one mesh each (crown 14 → 4 draws, cloud 6 → 1 …)
    mergeStatic(this.accentNode, this._own);
    mergeStatic(this.hatNode, this._own);

    // ---- animation state
    this.sqS = new THREE.Vector3(1, 1, 1);
    this.sqV = new THREE.Vector3(0, 0, 0);
    this.phase = 0;
    this.walkAmt = 0;
    this.lean = 0; this.bank = 0;
    this.prevYaw = null;
    this.flashT = 0; this.flashDur = 0.12;
    this.blinkOn = false;
    this.blinkT = 0; this.blinkNext = 1 + Math.random() * 2; this.blinkQueued = 0;
    this.lx = 0; this.ly = 0;
    this.tiredAmt = 0; this.glowAmt = 0; this.bubbleAmt = 0; this.celebAmt = 0;
    this.wasAir = false; this.wasDash = false; this.wasHurt = false;
    this.liftY = 0; this.liftV = 0;
    this.wob = { x: 0, z: 0, vx: 0, vz: 0 };
    this.ringOn = true;
    this._state = { wob: this.wob, speed: 0, dashing: false, lean: 0 };
    this._col = new THREE.Color();
    this._grey = new THREE.Color();
    this._emote = null;           // {name, t, dur, settled}
    this._yawn = { mouth: 0, eyes: 0, stretch: 0 };

    this.update(0, EMPTY);
  }

  // kit handed to hat / accent builders
  _kit() {
    const self = this;
    return {
      hero: this.hero, bw: this.bw, bh: this.bh, bd: this.bd,
      limbColor: this.limbColor, color: this.color,
      hat: null, accent: null,
      clay(color, o = {}) { const m = createClayMaterial(color, { fx: self.fxU, ...o }); self._own.push(m); return m; },
      glow(color, intensity = 1.8) {
        const m = new THREE.MeshBasicMaterial({ color, fog: false });
        m.color.multiplyScalar(intensity);
        self._own.push(m);
        return m;
      },
      mesh(g, m) { return new THREE.Mesh(g, m); },
      own(x) { self._own.push(x); },
      tick(fn) { self._ticks.push(fn); },
    };
  }

  _buildMotes() {
    const N = 10;
    const g = new THREE.BufferGeometry();
    this.motePos = new Float32Array(N * 3);
    this.moteSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) this.moteSeed[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(this.motePos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSeed', new THREE.BufferAttribute(this.moteSeed, 1));
    this._own.push(g);
    this.moteMat = new THREE.ShaderMaterial({
      uniforms: { uAlpha: { value: 0 }, uColor: { value: new THREE.Color(TUNE.gold) }, uTime: CLAY_TIME },
      vertexShader: `attribute float aSeed; varying float vA; uniform float uTime;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
          vA = 0.55 + 0.45 * sin(uTime * 9.0 + aSeed * 40.0);
          gl_PointSize = (40.0 + aSeed * 20.0) * (10.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uAlpha; uniform vec3 uColor; varying float vA;
        void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
          float cross = max(exp(-abs(p.x) * 14.0) * exp(-abs(p.y) * 2.2), exp(-abs(p.y) * 14.0) * exp(-abs(p.x) * 2.2));
          float a = (exp(-r * r * 9.0) + cross * 0.8) * uAlpha * vA; if (a < 0.01) discard;
          gl_FragColor = vec4(uColor * 1.6 * a, a);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._own.push(this.moteMat);
    this.motes = new THREE.Points(g, this.moteMat);
    this.motes.frustumCulled = false;
    this.motes.visible = false;
    this.pivot.add(this.motes);
  }

  // ---------- public API ----------
  /** impulse into the squash/stretch spring (1 = rest) */
  squash(sx = 1, sy = 1, sz = 1) {
    this.sqS.set(sx, sy, sz);
    this.sqV.set(0, 0, 0);
  }
  /** white hit flash */
  flash(seconds = 0.12) { this.flashDur = Math.max(0.01, seconds); this.flashT = this.flashDur; }
  /** hurt i-frames: soft 6 Hz pulse + cyan bubble shield */
  setBlink(on) { this.blinkOn = !!on; }
  /** permanent cyan ground ring (hide it in the hub) */
  setRing(on) { this.ringOn = !!on; this.ring.visible = this.ringOn; }
  /**
   * One-shot emote. 'yawn' (night lobby, §4.4): ~1.3 s — eyes squeeze shut, a big round yawn mouth,
   * arms stretch overhead and the body stretches tall, then a sleepy half-lidded blink back.
   * @returns {boolean} true if the emote started (unknown names are ignored)
   */
  emote(name) {
    if (name !== 'yawn') return false;
    this._emote = { name, t: 0, dur: TUNE.yawn.dur, settled: false };
    return true;
  }
  /** shorthand for emote('yawn') */
  yawn() { return this.emote('yawn'); }
  /** name of the emote playing now, or null */
  get emoting() { return this._emote ? this._emote.name : null; }

  update(dt, anim) {
    const a = anim || EMPTY;
    dt = Math.min(Math.max(dt || 0, 0), 0.05);
    this.t += dt;
    const t = this.t;
    CLAY_TIME.value = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const shape = this.shape;

    const moving = !!a.moving;
    const speed = clamp(a.speed ?? (moving ? 1 : 0), 0, 1);
    const dashing = !!a.dashing;
    const sprinting = !!a.sprinting && moving;
    const tired = !!a.tired;
    const hurt = !!a.hurt;
    const air = !!a.airborne;
    const celebrate = !!a.celebrate;
    const glow = clamp(a.glow || 0, 0, 1);

    this.tiredAmt = damp(this.tiredAmt, tired ? 1 : 0, 6, dt);
    this.glowAmt = damp(this.glowAmt, glow, 5, dt);
    this.celebAmt = damp(this.celebAmt, celebrate ? 1 : 0, 10, dt);
    this.bubbleAmt = damp(this.bubbleAmt, this.blinkOn ? 1 : 0, 14, dt);

    // ---- emote: yawn (mouth 0..1 · eyes shut 0..1 · stretch 0..1)
    const Y = this._yawn;
    Y.mouth = 0; Y.eyes = 0; Y.stretch = 0;
    const em = this._emote;
    if (em) {
      em.t += dt;
      const u = em.t / em.dur, P = TUNE.yawn;
      if (u >= 1) this._emote = null;
      else if (em.name === 'yawn') {
        const eo = (x) => 1 - (1 - x) * (1 - x);
        if (u < P.open) Y.mouth = eo(u / P.open);
        else if (u < P.hold) Y.mouth = 1 - 0.08 * Math.sin((u - P.open) / (P.hold - P.open) * Math.PI);   // tiny "mmm-ahh" wobble
        else if (u < P.close) Y.mouth = 1 - eo((u - P.hold) / (P.close - P.hold));
        Y.stretch = u < P.close ? Math.min(1, u / (P.open * 0.8)) * (u < P.hold ? 1 : 1 - (u - P.hold) / (P.close - P.hold)) : 0;
        // eyes squeeze shut with the mouth, then reopen slowly, sleepy (half-lidded) to the end
        Y.eyes = u < P.close ? clamp(Y.mouth * 1.6, 0, 1) : 0.45 * (1 - (u - P.close) / (1 - P.close));
        if (u >= P.hold && !em.settled) { em.settled = true; this.squash(1.08, 0.9, 1.08); }
        if (hurt || dashing) this._emote = null;
      }
    }

    // ---- walk cycle
    const walking = moving && !dashing && !air;
    this.walkAmt = damp(this.walkAmt, walking ? 1 : 0, 12, dt);
    if (walking) this.phase += dt * (8 + 6 * speed) * (sprinting ? 1.3 : 1);
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    const w = this.walkAmt * (0.35 + 0.65 * speed);
    let lift = Math.abs(s) * 0.11 * w;
    lift += this.celebAmt * Math.abs(Math.sin(t * 9)) * 0.14;
    const prevLift = this.liftY;
    this.liftY = lift;
    const liftV = dt > 0 ? (lift - prevLift) / dt : 0;
    const liftAcc = dt > 0 ? (liftV - this.liftV) / dt : 0;
    this.liftV = liftV;
    this.lift.position.y = lift;

    // ---- events from state edges
    if (this.wasAir && !air) this.squash(...TUNE.land);
    if (dashing && !this.wasDash) this.squash(...TUNE.dashKick);
    if (!dashing && this.wasDash) this.squash(...TUNE.dashEnd);
    if (hurt && !this.wasHurt) { this.flash(0.12); this.squash(0.85, 1.2, 0.85); }
    this.wasAir = air; this.wasDash = dashing; this.wasHurt = hurt;

    // ---- squash spring target
    let tx = 1, ty = 1, tz = 1;
    const brHz = tired ? 2.6 : 1.1;
    const br = Math.sin(t * TAU * brHz) * (tired ? 0.055 : shape.breathe) * (1 - this.walkAmt * 0.6);
    ty += br; tx -= br * 0.5; tz -= br * 0.5;
    const contact = (1 - Math.abs(s)) * 0.06 * w;
    ty -= contact; tx += contact * 0.5; tz += contact * 0.5;
    if (dashing) { tx = TUNE.dashStretch[0]; ty = TUNE.dashStretch[1]; tz = TUNE.dashStretch[2]; }
    if (air && !dashing) { ty += 0.08; tx -= 0.04; tz -= 0.04; }
    if (Y.stretch > 0) { ty += 0.13 * Y.stretch; tx -= 0.06 * Y.stretch; tz -= 0.06 * Y.stretch; tx += Math.sin(t * 31) * 0.008 * Y.stretch; }
    const k = shape.k, cd = shape.c;
    const steps = dt > 0.02 ? 2 : 1;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.sqV.x += (-k * (this.sqS.x - tx) - cd * this.sqV.x) * h;
      this.sqV.y += (-k * (this.sqS.y - ty) - cd * this.sqV.y) * h;
      this.sqV.z += (-k * (this.sqS.z - tz) - cd * this.sqV.z) * h;
      this.sqS.x += this.sqV.x * h; this.sqS.y += this.sqV.y * h; this.sqS.z += this.sqV.z * h;
    }
    const sx = clamp(this.sqS.x, 0.4, 1.9), sy = clamp(this.sqS.y, 0.4, 1.9), sz = clamp(this.sqS.z, 0.4, 1.9);
    this.sq.scale.set(sx, sy, sz);

    // ---- lean & bank
    let leanT = 0;
    if (moving) leanT += 0.08 + 0.1 * speed;
    if (sprinting) leanT += 0.08;
    if (dashing) leanT = 0.3;
    if (tired) leanT += 0.1;
    if (hurt) leanT = -0.28;
    leanT -= 0.13 * Y.stretch;                       // yawn: head tips back a little
    this.lean = damp(this.lean, leanT, 10, dt);
    const yaw = this.group.rotation.y;
    let yawRate = 0;
    if (this.prevYaw !== null && dt > 0) {
      let dy = yaw - this.prevYaw;
      dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI;
      yawRate = dy / dt;
    }
    this.prevYaw = yaw;
    const bankT = clamp(-yawRate * 0.045 * (moving || dashing ? 1 : 0.3), -0.3, 0.3);
    this.bank = damp(this.bank, bankT, 8, dt);
    this.pivot.rotation.x = this.lean;
    this.pivot.rotation.z = this.bank + Math.sin(this.phase) * 0.05 * w + (hurt ? Math.sin(t * 40) * 0.04 : 0);

    // ---- wobble spring for floppy accessories
    const wb = this.wob;
    const wtx = -this.lean * 1.1, wtz = -this.bank * 1.2;
    wb.vx += (-90 * (wb.x - wtx) - 5 * wb.vx) * dt - liftAcc * 0.004;
    wb.vz += (-90 * (wb.z - wtz) - 5 * wb.vz) * dt;
    wb.x = clamp(wb.x + wb.vx * dt, -0.7, 0.7);
    wb.z = clamp(wb.z + wb.vz * dt, -0.7, 0.7);

    // ---- limbs
    const BB = TUNE.bodyBottom;
    const bw = this.bw, bh = this.bh;
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1;
      const ht = this.handT[i];
      ht.set(sd * (bw / 2 + 0.05), bh * 0.42, 0.04);
      if (dashing) { ht.x = sd * (bw / 2 + 0.02); ht.y += 0.1; ht.z = -0.24; }
      if (air && !dashing) { ht.y += 0.18; ht.x += sd * 0.05; }
      if (tired) { ht.y -= 0.08 * this.tiredAmt; ht.z += 0.1 * this.tiredAmt; }
      if (hurt) { ht.y += 0.16; ht.x += sd * 0.08; }
      if (this.celebAmt > 0.01) {
        const wave = Math.sin(t * 14 + i * 1.3);
        const cx = sd * (bw / 2 + 0.12), cy = bh + 0.1 + wave * 0.06, cz = 0.06 + wave * 0.08;
        ht.x += (cx - ht.x) * this.celebAmt; ht.y += (cy - ht.y) * this.celebAmt; ht.z += (cz - ht.z) * this.celebAmt;
      }
      if (Y.stretch > 0.001) {                     // yawn: both arms stretch up overhead
        const k2 = Y.stretch, cx = sd * (bw / 2 - 0.04), cy = bh + 0.3, cz = -0.04;
        ht.x += (cx - ht.x) * k2; ht.y += (cy - ht.y) * k2; ht.z += (cz - ht.z) * k2;
      }
      const hh = this.hand[i];
      hh.x = damp(hh.x, ht.x, 18, dt); hh.y = damp(hh.y, ht.y, 18, dt); hh.z = damp(hh.z, ht.z, 18, dt);
      const swing = (i ? s : -s) * 0.16 * w * (sprinting ? 1.4 : 1);
      const hx = hh.x * sx;
      const hy = BB + hh.y * sy + lift + Math.abs(s) * 0.02 * w + (hurt ? Math.sin(t * 38 + i) * 0.03 : 0);
      const hz = (hh.z + swing) * sz;
      _v.set(hx, hy, hz);
      _s.set(0.15, 0.14, 0.14);
      _q.identity();
      _m4.compose(_v, _q, _s);
      this.limbs.setMatrixAt(i, _m4);
    }
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1;
      const ph = i ? -1 : 1;
      let fz = 0.12 + ph * s * 0.16 * w;
      let fy = 0.08 + Math.max(0, ph * c) * 0.08 * w;
      if (dashing) { fz = -0.12; fy = 0.1; }
      if (air && !dashing) { fy = 0.05; fz = 0.03 + ph * 0.04; }
      const fx = sd * 0.24 * (0.55 + 0.45 * sx) * bw;
      _v.set(fx, fy, fz);
      _e.set(dashing ? -0.4 : -ph * s * 0.25 * w, 0, 0);
      _q.setFromEuler(_e);
      _s.set(0.2, 0.13, 0.25);
      _m4.compose(_v, _q, _s);
      this.limbs.setMatrixAt(2 + i, _m4);
    }
    this.limbs.instanceMatrix.needsUpdate = true;

    // ---- face
    let expr = EXPR.HAPPY;
    let blinkBase = 0;
    if (tired) blinkBase = 0.5 * this.tiredAmt;
    if (dashing) expr = EXPR.FOCUS;
    if (celebrate) expr = EXPR.JOY;
    if (hurt) expr = EXPR.HURT;
    if (a.expr !== undefined && a.expr !== null) expr = a.expr;
    if (Y.eyes > 0 && !hurt) {
      // lids need the round-eye expressions; without the mouth patch the SLEEP face stands in
      expr = !this._yawnMouth && Y.mouth > 0.3 ? EXPR.SLEEP : EXPR.HAPPY;
      blinkBase = Math.max(blinkBase, Y.eyes);
    }
    if (this._yawnMouth) this.bodyMat.uniforms.uYawn.value = Y.mouth;
    // blink timer
    this.blinkNext -= dt;
    if (this.blinkNext <= 0 && this.blinkT <= 0) {
      this.blinkT = TUNE.blink.time;
      if (this.blinkQueued > 0) { this.blinkQueued--; this.blinkNext = 0.18; } else {
        this.blinkNext = TUNE.blink.min + Math.random() * (TUNE.blink.max - TUNE.blink.min);
        if (Math.random() < TUNE.blink.double) { this.blinkQueued = 1; this.blinkNext = 0.18; }
      }
    }
    let blink = 0;
    if (this.blinkT > 0) { this.blinkT -= dt; blink = Math.sin(Math.PI * clamp(1 - this.blinkT / TUNE.blink.time, 0, 1)); }
    blink = Math.max(blink, blinkBase);
    this.lx = damp(this.lx, clamp(a.lookX ?? 0, -1, 1), 10, dt);
    this.ly = damp(this.ly, tired ? -0.5 : clamp(a.lookY ?? 0, -1, 1), 10, dt);
    const uf = this.bodyMat.uniforms.uFace.value;
    uf.set(expr, blink, this.lx, this.ly);

    // ---- flash / i-frame pulse / glow
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
    let fl = this.flashT > 0 ? Math.pow(this.flashT / this.flashDur, 0.6) : 0;
    // soft 6 Hz pulse (never a grey swap); capped so the face + blue body stay readable under bloom
    if (this.blinkOn) fl = Math.max(fl, (0.5 + 0.5 * Math.sin(t * TAU * TUNE.iframeHz)) * 0.24);
    const fx = this.fxU.value;
    fx.x = fl;
    fx.y = this.glowAmt * 0.12 * (0.7 + 0.3 * Math.sin(t * TAU * 2));
    fx.z = 1;

    // ---- tired grey-out (subtle) — body & limbs
    if (this.tiredAmt > 0.003) {
      const L = 0.2126 * this.baseColor.r + 0.7152 * this.baseColor.g + 0.0722 * this.baseColor.b;
      this._grey.setRGB(L * 0.9 + 0.08, L * 0.9 + 0.09, L * 0.9 + 0.12);
      this.bodyMat.uniforms.uColor.value.copy(this.baseColor).lerp(this._grey, 0.32 * this.tiredAmt);
      this.limbMat.uniforms.uColor.value.copy(this.limbBase).lerp(this._grey, 0.32 * this.tiredAmt);
    } else {
      this.bodyMat.uniforms.uColor.value.copy(this.baseColor);
      this.limbMat.uniforms.uColor.value.copy(this.limbBase);
    }

    // ---- sweat drops
    const sweatOn = this.tiredAmt > 0.05;
    this.sweat.visible = sweatOn;
    if (sweatOn) {
      for (let i = 0; i < 3; i++) {
        const u = (t / 0.75 + i / 3) % 1;
        const sd = i === 1 ? -1 : 1;
        const x0 = sd * (bw * 0.42 - (i === 2 ? 0.15 : 0));
        const px = (x0 + sd * u * 0.32) * sx;
        const py = BB + lift + (bh + 0.02 + u * 0.28 - u * u * 0.62) * sy;
        const pz = (0.22 + (i === 2 ? -0.2 : 0)) * sz;
        const sc = 0.065 * (1 - u * 0.35) * clamp(this.tiredAmt * 1.5, 0, 1) * Math.min(1, u * 8);
        _v.set(px, py, pz);
        _e.set(0, 0, sd * (0.4 + u * 1.2));
        _q.setFromEuler(_e);
        _s.setScalar(Math.max(0.0001, sc));
        _m4.compose(_v, _q, _s);
        this.sweat.setMatrixAt(i, _m4);
      }
      this.sweat.instanceMatrix.needsUpdate = true;
    }

    // ---- aura & motes (nova ready)
    const ga = this.glowAmt;
    this.aura.visible = ga > 0.02;
    this.auraMat.uniforms.uAlpha.value = ga * (0.75 + 0.25 * Math.sin(t * TAU * 2));
    this.motes.visible = ga > 0.02;
    if (this.motes.visible) {
      this.moteMat.uniforms.uAlpha.value = ga;
      const mp = this.motePos;
      for (let i = 0; i < mp.length / 3; i++) {
        const sd = this.moteSeed[i];
        const u = (t * (0.35 + sd * 0.25) + sd) % 1;
        const ang = sd * TAU * 3 + t * (0.8 + sd);
        const r = 0.62 + sd * 0.25;
        mp[i * 3] = Math.cos(ang) * r;
        mp[i * 3 + 1] = 0.1 + u * (bh + 0.9);
        mp[i * 3 + 2] = Math.sin(ang) * r;
      }
      this.motes.geometry.attributes.position.needsUpdate = true;
    }
    this.ringMat.uniforms.uGlow.value = ga;

    // ---- bubble shield
    this.bubble.visible = this.bubbleAmt > 0.02;
    this.bubbleMat.uniforms.uAlpha.value = this.bubbleAmt * (0.42 + 0.1 * Math.sin(t * TAU * TUNE.bubbleHz));
    this.bubble.scale.setScalar(1 + Math.sin(t * TAU * 1.5) * 0.02);

    // ---- ground ring stays on the floor even when the group is lifted
    if (this.ringOn) {
      const gs = this.group.scale.y || 1;
      this.ring.position.y = (0.03 - this.group.position.y) / gs;
    }

    // ---- hats & accents
    const st = this._state;
    st.speed = speed; st.dashing = dashing; st.lean = this.lean;
    for (let i = 0; i < this._ticks.length; i++) this._ticks[i](t, dt, st);
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const o of this._own) o.dispose?.();
    this._own.length = 0;
    this._ticks.length = 0;
  }
}

/**
 * Build the poster hero. heroId: 'blu'|'mochi'|'zap'|'stella'; skinId from SKINS (null = default);
 * hat: HATS id; trail: TRAILS id (exposed as model.trailColors for fx).
 */
export function createHeroModel(heroId, skinId = null, { hat = 'none', trail = 'default' } = {}) {
  return new HeroModel(heroId, skinId, { hat, trail });
}
export { HeroModel };
