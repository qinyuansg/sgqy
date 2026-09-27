// ─────────────────────────────────────────────────────────────
// CUBE DASH — WORLD: the themed floating arena, sky & set pieces
//
//   G.world.load(worldId)        build / swap the "Candy Sci-Fi" environment
//   G.world.update(dt, rdt)      animate (sky, rim, clouds, gimmicks…)
//   G.world.pulseRim(color)      flash the neon rim (wave start, boss)
//   G.world.setFever(on)         rainbow rim + grid (also listens to 'fever')
//   G.world.setPlayRadius(r)     storm wall at r (r ≥ arenaRadius → none)
//   gameplay queries: frictionAt · pushAt · bumperHit (+ bumpFx) · solidAt
//
// Design rules (DESIGN_BRIEF §0 colour law, §3.1, §7):
//   • the play floor is ALWAYS light & matte (never blooms); only emissive
//     strips / set-piece lights feed the bloom
//   • danger = yellow-white / orange stripes + "!", never plain red
//   • a permanent cyan ground ring under the hero (§7.20) is drawn in the
//     floor shader (0 extra draw calls)
//
// Architecture: shared, re-themable systems (sky dome, floor, rim, island
// base, cloud sea, floating islands, sparkles, planet) are re-coloured by
// uniforms on load(); per-world set pieces are built lazily and cached
// (LRU of 3).  ≈ 11 shared draw calls + ≤ 6 per set piece.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { TAU, clamp, lerp, damp, makeRng } from './core.js';
import { roundedBoxGeometry, setCharacterLighting } from './art.js';
import { DATA } from './data.js';

const TUNE = {
  rim: { w: 1.28, gap: 0.07, h: 0.92, d: 1.05, cap: 128 },
  floorPad: 1.25,             // floor disc extends this far past arenaRadius (under the rim)
  heroRing: { r: 0.78, w: 0.06, color: 0x40f0ff },
  iceFriction: 0.25,
  clouds: { high: 290, low: 150 },
  islands: { high: 64, low: 34 },
  sparkles: { high: 180, low: 70 },
  tileBack: 0.4,              // glitch tile re-assembly time
  bumperCooldown: 0.12,
  cacheSets: 3,               // per-world set pieces kept alive (LRU)
  domeRadius: 1500,
  planetDist: 720,
};

// Per-world art direction that isn't gameplay data (palette itself lives in DATA.worlds).
const LOOK = {
  cloud: {
    below: 0x86bfff, fog: 0xcfe4ff, fogNear: 110, fogFar: 700,
    sunSky: [-0.42, 0.34, -0.84], sunSkyCol: 0xfff3c4,
    stars: 0, nebula: 0, nebA: 0xffc6e8, nebB: 0xbfe0ff, rainbow: 1,
    planet: { dir: [0.4, 0.2, -0.9], size: 62, c1: 0xffb7d5, c2: 0xfff0f6, atmo: 0xffffff, ring: 0xfff0c2, ringA: 0.85, tilt: [0.42, 0.25], mode: 0 },
    cloudK: 1, cloudS: 1,
    cloudLit: 0xffffff, cloudShade: 0xaebfe8, cloudRim: 0xffe6f4, cloudEmit: 0, cloudTints: [0xffffff, 0xfff4fa, 0xf2f8ff, 0xfffaf0],
    island: { top: 0x8fe38a, side: 0xf3d7a6, bottom: 0xcfa87e },
    rock: [0xf0d3a4, 0xc79ad8], tip: 0xffb7d5,
    sparkle: [0xffffff, 0xfff3b0, 0xffd9f0, 0xc8ecff],
    hemi: [0xeaf4ff, 0xf6e4c8, 1.5], sun: [0xfff4e0, 2.3],
    char: { sky: 0xdcecff, ground: 0xf3d9b8, rim: 0xbfe4ff },
    grade: { saturation: 1.1, contrast: 1.04, tint: 0xfffaf2, bloom: 1.0 },
    warnA: 0xffa62b, warnB: 0xfff4c2, glitch: 0xb07cff,
  },
  neon: {
    below: 0x6a44b8, fog: 0x8a64d0, fogNear: 70, fogFar: 460,
    sunSky: [0.5, 0.25, -0.83], sunSkyCol: 0xffc6f2,
    stars: 0.9, nebula: 0.6, nebA: 0xff7ad9, nebB: 0x7c6cff, rainbow: 0,
    planet: { dir: [-0.44, 0.13, -0.89], size: 150, c1: 0x7ce7ff, c2: 0xc9f6ff, atmo: 0xb7f7ff, ring: 0xb7f7ff, ringA: 0.75, tilt: [0.3, -0.35], mode: 0 },
    cloudK: 0.55, cloudS: 0.8,
    cloudLit: 0xffd9f4, cloudShade: 0x8f73db, cloudRim: 0xff9cf0, cloudEmit: 0.12, cloudTints: [0xffffff, 0xffe0f6, 0xe4e0ff],
    island: { top: 0x9ff8ff, side: 0x8d7fd8, bottom: 0x5b4bb0 },
    rock: [0xb9a8f5, 0x5a3fa8], tip: 0x7ff6ff,
    sparkle: [0xffffff, 0xff9cf0, 0x9ff8ff, 0xfff3b0],
    hemi: [0xf1e8ff, 0xe9e4ff, 1.45], sun: [0xffeefa, 2.2],
    char: { sky: 0xe8e2ff, ground: 0xe9e4ff, rim: 0xffc6f2 },
    grade: { saturation: 1.08, contrast: 1.05, tint: 0xfff6ff, bloom: 1.05 },
    warnA: 0xffa62b, warnB: 0xfff4c2, glitch: 0xff8af2,
  },
  crystal: {
    below: 0x8fc4f4, fog: 0xb4dcff, fogNear: 80, fogFar: 520,
    sunSky: [-0.3, 0.3, -0.9], sunSkyCol: 0xe8fbff,
    stars: 0.6, nebula: 0.25, nebA: 0x7cffb2, nebB: 0x9d8cff, rainbow: 0,
    planet: { dir: [0.42, 0.23, -0.88], size: 105, c1: 0xd9f2ff, c2: 0xa9c4f5, atmo: 0xe0f0ff, ring: 0xe0f0ff, ringA: 0.35, tilt: [0.2, 0.5], mode: 0 },
    cloudK: 0.85, cloudS: 0.9,
    cloudLit: 0xf6fbff, cloudShade: 0xa6bdef, cloudRim: 0xd2c8ff, cloudEmit: 0, cloudTints: [0xffffff, 0xeef7ff, 0xf0ecff],
    island: { top: 0xffffff, side: 0xa9b8f0, bottom: 0x7d8fd6 },
    rock: [0xc9d6ff, 0x7b82d8], tip: 0xb9f3ff,
    sparkle: [0xffffff, 0xb9f3ff, 0xd2c8ff, 0x9fffd8],
    hemi: [0xeef8ff, 0xeaf6ff, 1.5], sun: [0xf2fbff, 2.2],
    char: { sky: 0xe2f2ff, ground: 0xeaf2ff, rim: 0xd2c8ff },
    grade: { saturation: 1.08, contrast: 1.04, tint: 0xf6fbff, bloom: 1.0 },
    warnA: 0xffa62b, warnB: 0xfff4c2, glitch: 0x9d8cff,
  },
  nebula: {
    below: 0x7a3c8e, fog: 0x9a5aa8, fogNear: 70, fogFar: 460,
    sunSky: [0.35, 0.18, -0.92], sunSkyCol: 0xffd9a0,
    stars: 1, nebula: 1, nebA: 0xff7ab8, nebB: 0x9b6bff, rainbow: 0,
    planet: { dir: [-0.42, 0.2, -0.89], size: 95, c1: 0xff9cf0, c2: 0xffd9a0, atmo: 0xffc6e8, ring: 0xffd9a0, ringA: 0.8, tilt: [0.5, 0.3], mode: 0 },
    cloudK: 0.65, cloudS: 0.8,
    cloudLit: 0xffc9e4, cloudShade: 0xc27ad0, cloudRim: 0xffb38a, cloudEmit: 0.3, cloudTints: [0xffffff, 0xffd9b8, 0xe9ccff, 0xffc2e0],
    island: { top: 0xffe07a, side: 0xf4c3e0, bottom: 0xb07ad0 },
    rock: [0xf6c6e4, 0x8e5ac2], tip: 0xfff08a,
    sparkle: [0xffffff, 0xfff08a, 0xff9cf0, 0x9ff8ff],
    hemi: [0xfff0f8, 0xfbe3f0, 1.5], sun: [0xffeedd, 2.2],
    char: { sky: 0xffe8f4, ground: 0xfbe3f0, rim: 0xffd9a0 },
    grade: { saturation: 1.1, contrast: 1.05, tint: 0xfff6f4, bloom: 1.1 },
    warnA: 0xffa62b, warnB: 0xfff4c2, glitch: 0xff7ab8,
  },
  foundry: {
    below: 0x1f5a74, fog: 0x2f7b92, fogNear: 70, fogFar: 460,
    sunSky: [-0.5, 0.22, -0.84], sunSkyCol: 0xd6fff6,
    stars: 0.7, nebula: 0.3, nebA: 0x3cffd1, nebB: 0x4b5bd6, rainbow: 0,
    planet: { dir: [0.4, 0.22, -0.89], size: 90, c1: 0x9effe8, c2: 0x5fb8d0, atmo: 0xd6fff6, ring: 0xd6fff6, ringA: 0.7, tilt: [0.25, -0.4], mode: 0 },
    cloudK: 0.4, cloudS: 0.7,
    cloudLit: 0xe6fffb, cloudShade: 0x5a93aa, cloudRim: 0x9effe8, cloudEmit: 0.08, cloudTints: [0xffffff, 0xe4f6ff, 0xe8fff6],
    island: { top: 0xdcebf2, side: 0x7f9bb4, bottom: 0x4f6a86 },
    rock: [0xb8ccd8, 0x4f6a86], tip: 0x3cffd1,
    sparkle: [0xffffff, 0x9effe8, 0xffd08a, 0xd6fff6],
    hemi: [0xeefcff, 0xe6f1f5, 1.5], sun: [0xf4fffc, 2.2],
    char: { sky: 0xe4f8ff, ground: 0xe6f1f5, rim: 0x9effe8 },
    grade: { saturation: 1.08, contrast: 1.05, tint: 0xf4fffc, bloom: 1.05 },
    warnA: 0xffa62b, warnB: 0xfff4c2, glitch: 0x3cffd1,
  },
  core: {
    below: 0x2c1266, fog: 0x3a1a70, fogNear: 60, fogFar: 420,
    sunSky: [0.4, 0.2, -0.9], sunSkyCol: 0xb6a6ff,
    stars: 1, nebula: 0.95, nebA: 0xff3df2, nebB: 0x39e6ff, rainbow: 0,
    planet: { dir: [-0.38, 0.19, -0.9], size: 80, c1: 0x1a0b3d, c2: 0x2a1060, atmo: 0xff6fd8, ring: 0xffffff, ringA: 1.0, tilt: [0.62, 0.3], mode: 1 },
    cloudK: 0.6, cloudS: 0.8,
    cloudLit: 0xb9a2ff, cloudShade: 0x5a2c9c, cloudRim: 0xff6fd8, cloudEmit: 0.22, cloudTints: [0xffffff, 0xe0d0ff, 0xd0f4ff],
    island: { top: 0xa6f8ff, side: 0x4b3a8a, bottom: 0x2a1a5a },
    rock: [0x6d5ab8, 0x241450], tip: 0xff3df2,
    sparkle: [0xffffff, 0xff9cf0, 0xa6f8ff, 0xfff3b0],
    hemi: [0xf0ecff, 0xece6ff, 1.55], sun: [0xf6f0ff, 2.2],
    char: { sky: 0xe8e2ff, ground: 0xece6ff, rim: 0xff9cf0 },
    grade: { saturation: 1.06, contrast: 1.05, tint: 0xfaf6ff, bloom: 1.1 },
    warnA: 0xffa62b, warnB: 0xfff4c2, glitch: 0xff3df2,
  },
};

// ============================================================
// GLSL chunks
// ============================================================
const GLSL_COMMON = /* glsl */`
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y); }
float vnoise3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
// candy rainbow that skips pure red (red = enemies only)
vec3 candyHue(float t){ return hue(0.07 + fract(t) * 0.86); }
`;

const GLSL_LIGHT = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uHemiSky;
uniform vec3 uHemiGround;
vec3 softLit(vec3 base, vec3 N, vec3 V){
  float w = dot(N, uSunDir) * 0.5 + 0.5;
  float diff = smoothstep(0.12, 0.95, w);
  vec3 hemi = mix(uHemiGround, uHemiSky, N.y * 0.5 + 0.5);
  vec3 c = base * (hemi * 0.5 + uSunCol * diff * 0.62);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  c += uHemiSky * rim * 0.2;
  return c;
}
`;

const OUT_FRAG = /* glsl */`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
`;

// ---------- sky dome ----------
const SKY_VS = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FS = /* glsl */`
uniform vec3 uTop, uBottom, uBelow, uSkySun, uSkySunCol, uNebA, uNebB, uRbDir;
uniform float uStars, uNebula, uRainbow, uTime, uGain;
varying vec3 vDir;
${GLSL_COMMON}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < OCT; i++){ s += a * vnoise3(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, pow(clamp(h, 0.0, 1.0), 0.42)));
  col += uBottom * 0.10 * exp(-abs(h) * 16.0);                 // horizon haze
  col = mix(col, uBelow, smoothstep(0.03, -0.4, h));           // below the island: cloud-sea base / void
  col *= uGain;                                                 // unlit dome: pre-compensate the ACES shoulder
  float s = max(dot(d, uSkySun), 0.0);
  col += uSkySunCol * (smoothstep(0.99985, 0.9999, s) * 1.6 + pow(s, 260.0) * 0.5 + pow(s, 12.0) * 0.1);
#if OCT > 0
  if (uNebula > 0.001) {
    vec3 q = d * 2.3;
    float n1 = fbm(q + vec3(0.0, uTime * 0.006, 0.0));
    float n2 = vnoise3(q * 2.4 + 9.1);
    float m = smoothstep(0.38, 0.78, n1);
    col += mix(uNebA, uNebB, n2) * m * uNebula * 0.5 * (0.55 + 0.45 * smoothstep(-0.7, 0.3, h));
  }
#endif
  if (uStars > 0.001) {
    vec3 sp = d * 95.0;
    vec3 cell = floor(sp);
    float hs = hash13(cell);
    if (hs > 0.972) {
      vec3 off = vec3(hash13(cell + 1.7), hash13(cell + 3.1), hash13(cell + 5.3)) - 0.5;
      float dd = length(fract(sp) - 0.5 - off * 0.55);
      float tw = 0.55 + 0.45 * sin(uTime * (1.3 + hs * 4.0) + hs * 70.0);
      float big = step(0.994, hs);
      col += mix(vec3(1.0, 0.94, 0.86), vec3(0.8, 0.9, 1.0), fract(hs * 37.0)) * smoothstep(0.16 + big * 0.1, 0.0, dd) * tw * uStars * (1.4 + big * 2.0);
    }
  }
  if (uRainbow > 0.001) {
    float a = acos(clamp(dot(d, uRbDir), -1.0, 1.0));
    float x = (a - 0.36) / 0.045;
    if (abs(x) < 1.0) {
      vec3 rb = mix(vec3(1.0), hue(-0.03 + (x * 0.5 + 0.5) * 0.78), 0.62);
      float m = (1.0 - x * x) * smoothstep(-0.03, 0.12, h);
      col = mix(col, rb * 1.02, m * 0.62 * uRainbow);
    }
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------- arena floor ----------
const FLOOR_VS = /* glsl */`
varying vec3 vW;
#include <fog_pars_vertex>
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FLOOR_FS = /* glsl */`
uniform vec3 uFloor, uFloorAlt, uGrid, uEdge, uHeroCol, uIceCol, uBeltCol, uBeltChev, uBeltRail, uWarnA, uWarnB, uGlitch, uInk;
uniform float uR, uPlayR, uTime, uBeat, uFever, uScan;
uniform vec4 uHero;           // x, z, alpha, radius
uniform vec4 uIce[4];         // x, z, r, -
uniform int uIceN;
uniform vec4 uBelt[2];        // x, z, halfW, halfD
uniform vec4 uBeltDir[2];     // dirX, dirZ, speed, -
uniform int uBeltN;
uniform vec4 uTile[6];        // x, z, r(inradius), state
uniform int uTileN;
varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_COMMON}
float hexSdf(vec2 p, float r){ p = abs(p); return max(dot(p, vec2(0.8660254, 0.5)), p.y) - r; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float bang(vec2 g){ // "!" glyph, g in [-1,1], +y = up the screen
  float d = min(sdSeg(g, vec2(0.0, 0.42), vec2(0.0, -0.05)) - 0.13, length(g - vec2(0.0, -0.36)) - 0.14);
  return 1.0 - smoothstep(-0.02, 0.02, d);
}
void main(){
  vec2 p = vW.xz;
  float r = length(p);
  float aa = max(fwidth(r), 0.002);
  vec2 fw = max(fwidth(p), vec2(0.002));
  // --- sandy / pastel base with soft macro variation
  float n = vnoise2(p * 0.23) * 0.65 + vnoise2(p * 1.3 + 4.0) * 0.35;
  vec3 col = mix(uFloor, uFloorAlt, smoothstep(0.3, 0.8, n) * 0.5 + smoothstep(0.35 * uR, uR, r) * 0.3);
  // swirl trails (poster's dash swooshes)
  float ang = atan(p.y, p.x);
  float sw = abs(fract(ang / 6.2831853 * 2.0 + r * 0.055 - 0.08) - 0.5);
  col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.035, sw)) * 0.14 * smoothstep(2.5, 5.0, r) * (1.0 - smoothstep(uR - 3.0, uR - 1.0, r)));
  float inside = 1.0 - smoothstep(uR - 0.6, uR + 0.2, r);
  // --- hologram grid (1.5 u)
  vec2 g = abs(fract(p / 1.5 - 0.5) - 0.5) * 1.5;
  float line = 1.0 - min(smoothstep(0.018, 0.018 + fw.x * 1.2, g.x), smoothstep(0.018, 0.018 + fw.y * 1.2, g.y));
  float gx = (1.0 - smoothstep(0.05, 0.05 + fw.x, g.x)) * (1.0 - smoothstep(0.05, 0.05 + fw.y, g.y));
  vec3 gridCol = mix(uGrid, candyHue(r * 0.06 - uTime * 0.35), uFever);
  float gA = (0.2 + 0.1 * uBeat * (1.0 + uFever)) * inside;
  col = mix(col, gridCol, clamp(line * gA + gx * gA * 1.6, 0.0, 1.0));
  // --- concentric rings + spawn pad
  float rd = abs(fract(r / 3.0 - 0.5) - 0.5) * 3.0;
  col = mix(col, gridCol, (1.0 - smoothstep(0.025, 0.025 + aa * 1.5, rd)) * 0.16 * step(r, uR - 1.2));
  float pad = (1.0 - smoothstep(0.035, 0.035 + aa * 1.5, abs(r - 1.7))) * (0.55 + 0.45 * step(0.5, fract(ang / 6.2831853 * 24.0)));
  col = mix(col, gridCol, pad * 0.3);
  // travelling scan ring (holo feel)
  float sr = mod(uTime * 3.2, uR + 6.0);
  col = mix(col, gridCol, exp(-abs(r - sr) * 3.0) * 0.07 * inside * uScan);
  // --- inner edge glow line + rim contact shade
  float e = abs(r - (uR - 0.32));
  vec3 edgeCol = mix(uEdge, candyHue(ang / 6.2831853 + uTime * 0.5), uFever);
  col = mix(col, edgeCol * 1.25, (1.0 - smoothstep(0.035, 0.035 + aa * 1.5, e)) * 0.95);
  col += edgeCol * exp(-e * 5.0) * 0.05;
  col *= 1.0 - 0.16 * smoothstep(uR - 0.8, uR + 0.05, r);

  // --- W3 ice patches (glossy light-blue decals)
  for (int i = 0; i < 4; i++) {
    if (i >= uIceN) break;
    vec4 c = uIce[i];
    vec2 q = p - c.xy;
    float d = length(q) - c.z + (vnoise2(q * 1.4 + c.xy) - 0.5) * 0.3;
    float m = 1.0 - smoothstep(-aa * 1.5, aa * 1.5, d);
    if (m > 0.0) {
      float streak = smoothstep(0.82, 1.0, sin(dot(q, vec2(0.62, 0.78)) * 2.1 + vnoise2(q * 0.9) * 2.0));
      float crack = 1.0 - smoothstep(0.0, 0.035, abs(vnoise2(q * 1.25 + 3.0) - 0.5));
      float glint = pow(max(0.0, sin(dot(q, vec2(0.7, 0.7)) * 0.9 - uTime * 1.2)), 24.0);
      vec3 ic = uIceCol * (0.94 + streak * 0.08) + vec3(streak * 0.12 + crack * 0.09 + glint * 0.18);
      col = mix(col, ic, m * 0.92);
    }
    col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.14, abs(d))) * 0.45);
  }
  // --- W5 conveyor belts (chevrons scroll in the push direction)
  for (int i = 0; i < 2; i++) {
    if (i >= uBeltN) break;
    vec4 b = uBelt[i]; vec4 bd = uBeltDir[i];
    vec2 q = p - b.xy;
    vec2 ad = abs(q) - b.zw;
    float sd = length(max(ad, 0.0)) + min(max(ad.x, ad.y), 0.0) - 0.0;
    float m = 1.0 - smoothstep(-aa, aa, sd);
    vec2 dir = bd.xy; vec2 perp = vec2(-dir.y, dir.x);
    float along = dot(q, dir), across = dot(q, perp);
    float half_ = abs(dot(b.zw, abs(perp)));
    float ch = fract((along - uTime * bd.z) / 1.3 - abs(across) * 0.42);
    float cm = smoothstep(0.0, 0.05, ch) * (1.0 - smoothstep(0.3, 0.36, ch)) * step(abs(across), half_ - 0.32);
    float rail = smoothstep(half_ - 0.3, half_ - 0.22, abs(across));
    float roll = step(0.5, fract((along - uTime * bd.z) / 0.35)) * rail;
    vec3 belt = mix(uBeltCol, uBeltChev, cm);
    belt = mix(belt, uBeltRail * (0.9 + 0.1 * roll), rail);
    col = mix(col, belt, m);
    col *= 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.2, abs(sd)));
  }
  // --- W6 glitch tiles: idle outline · warning stripes + "!" · hole (discard) · re-assembly
  for (int i = 0; i < 6; i++) {
    if (i >= uTileN) break;
    vec4 T = uTile[i];
    vec2 q = p - T.xy;
    float hd = hexSdf(q, T.z);
    float st = T.w;
    float m = 1.0 - smoothstep(-aa, aa, hd);
    if (st >= 1.0 && st < 2.0 && hd < 0.0) discard;
    if (st >= 2.0 && hd < 0.0) {
      vec2 cell = floor(q * 2.2);
      if (hash12(cell + T.xy * 3.7) > (st - 2.0) * 1.15) discard;
    }
    float blink = step(0.5, fract(uTime * 3.0 + hash12(floor(q * 3.0)) * 0.3));
    col = mix(col, uGlitch, (1.0 - smoothstep(0.03, 0.08 + aa, abs(hd))) * (0.35 + 0.15 * blink));
    if (st > 0.0 && st < 1.0) {
      float stripe = step(0.5, fract((q.x - q.y) * 0.85 - uTime * 1.6));
      vec3 wc = mix(uWarnA, uWarnB, stripe);
      float fl = 0.62 + 0.38 * step(0.5, fract(uTime * (2.5 + st * 3.0)));   // ≤ 5.5 Hz, small area
      col = mix(col, wc, m * 0.8 * fl);
      col = mix(col, uInk, bang(vec2(q.x, -q.y) / (T.z * 0.8)) * m);
    }
    if (st >= 1.0 && st < 2.0) col += uGlitch * (1.0 - smoothstep(0.0, 0.3, hd)) * 0.9;
    if (st >= 2.0) col = mix(col, uGlitch, m * (1.0 - (st - 2.0)) * 0.45);
  }
  // --- storm: outside the play radius = orange / yellow-white hatch + bright edge
  if (uPlayR < uR - 0.01) {
    float d = r - uPlayR;
    float stripe = step(0.5, fract((p.x - p.y) * 0.32 + uTime * 0.7));
    col = mix(col, mix(uWarnA, uWarnB, stripe) * 0.92, smoothstep(-0.04, 0.06, d) * 0.5);
    col = mix(col, vec3(1.0, 0.96, 0.84), (1.0 - smoothstep(0.03, 0.12, abs(d))) * 0.9);
  }
  // --- cyan hero ground ring (§7.20)
  if (uHero.z > 0.001) {
    float hdist = length(p - uHero.xy);
    float rr = abs(hdist - uHero.w);
    float ring = 1.0 - smoothstep(0.045, 0.045 + aa * 1.6, rr);
    col = mix(col, uHeroCol, (1.0 - smoothstep(uHero.w - 0.5, uHero.w, hdist)) * 0.14 * uHero.z);
    col = mix(col, uHeroCol * 1.08, ring * 0.95 * uHero.z);
  }
  gl_FragColor = vec4(col * 0.97, 1.0);
  ${OUT_FRAG}
}`;

// ---------- rim blocks (instanced) ----------
const RIM_VS = /* glsl */`
attribute vec2 aRim;          // angle01, variant
varying vec3 vL; varying vec3 vN; varying vec3 vW; varying vec2 vRim;
#include <fog_pars_vertex>
void main(){
  vL = position; vRim = aRim;
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(m) * normal);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const RIM_FS = /* glsl */`
uniform vec3 uRimCol, uRimGlow, uPulseCol;
uniform float uPulse, uFever, uTime, uBeat, uChase;
varying vec3 vL; varying vec3 vN; varying vec3 vW; varying vec2 vRim;
#include <fog_pars_fragment>
${GLSL_COMMON}
${GLSL_LIGHT}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  vec3 base = uRimCol * (0.9 + 0.14 * vRim.y);
  base = mix(base * 0.92, base * 1.08 + 0.02, smoothstep(0.3, 0.48, vL.y));
  base = mix(base, candyHue(vRim.x + uTime * 0.5) * 0.85, uFever * 0.35);
  vec3 c = softLit(base, N, V) - uHemiSky * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.12;
  // neon strip: a band on the inner face + a thin line along the top (visible from above)
  float inner = smoothstep(-0.3, -0.44, vL.z);
  float band = smoothstep(0.1, 0.14, vL.y) * (1.0 - smoothstep(0.24, 0.28, vL.y));
  float topLine = smoothstep(0.485, 0.5, vL.y) * (1.0 - smoothstep(0.04, 0.08, abs(vL.z + 0.16)));
  float strip = max(band * inner, topLine * 0.85);
  vec3 glow = mix(uRimGlow, candyHue(vRim.x + uTime * 0.5), uFever);
  float chase = uChase * pow(0.5 + 0.5 * sin((vRim.x * 6.2831853) * 3.0 - uTime * 6.0), 6.0);
  glow = mix(glow, uPulseCol, uPulse);
  c = mix(c, glow * (1.9 + 1.6 * uPulse + (uBeat * 0.5 + chase) * (0.4 + uFever)), strip);
  c += uPulseCol * uPulse * 0.25;
  gl_FragColor = vec4(c, 1.0);
  ${OUT_FRAG}
}`;

// ---------- floating-island base (lathe) ----------
const BASE_VS = /* glsl */`
varying vec3 vL; varying vec3 vN; varying vec3 vW;
#include <fog_pars_vertex>
void main(){
  vL = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const BASE_FS = /* glsl */`
uniform vec3 uSkirt, uRockA, uRockB, uBand, uTip, uMetal;
uniform float uTime, uFever;
varying vec3 vL; varying vec3 vN; varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_COMMON}
${GLSL_LIGHT}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float y = vL.y;
  float a = atan(vL.z, vL.x) / 6.2831853;
  vec3 c;
  float emit = 0.0;
  if (y > -0.5) c = uSkirt;
  else if (y > -1.05) {
    c = uMetal;
    float lamp = step(0.55, fract(a * 48.0)) * (1.0 - smoothstep(0.06, 0.11, abs(y + 0.78)));
    float chase = 0.45 + 0.55 * step(0.5, fract(a * 6.0 - uTime * 0.6));
    emit = lamp * chase;
  } else {
    float strata = vnoise2(vec2(a * 40.0, y * 1.6)) * 0.5 + vnoise2(vec2(a * 9.0, y * 0.5)) * 0.5;
    c = mix(uRockA, uRockB, clamp(smoothstep(-1.0, -9.0, y) + (strata - 0.5) * 0.45, 0.0, 1.0));
    c *= 0.9 + 0.12 * step(0.5, fract(y * 0.9 + strata * 0.4));
  }
  c = softLit(c, N, V);
  vec3 bandCol = mix(uBand, candyHue(a + uTime * 0.5), uFever);
  c = mix(c, bandCol * 2.6, emit);
  c += uTip * smoothstep(-6.8, -9.3, y) * 1.6;
  gl_FragColor = vec4(c, 1.0);
  ${OUT_FRAG}
}`;

// ---------- soft cloud puffs (instanced, drifting) ----------
const CLOUD_VS = /* glsl */`
attribute float aDrift;
uniform float uTime, uWrap;
varying vec3 vN; varying vec3 vW; varying vec3 vTint;
#include <fog_pars_vertex>
void main(){
  vec4 c = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float x = c.x + uTime * aDrift;
  float wx = mod(x + uWrap, 2.0 * uWrap) - uWrap;
  float fade = aDrift > 0.0 ? smoothstep(uWrap, uWrap * 0.8, abs(wx)) : 1.0;
  vec3 local = (instanceMatrix * vec4(position * fade, 0.0)).xyz;   // rotation+scale only
  float bob = sin(uTime * 0.5 + c.z * 0.13 + c.x * 0.07) * 0.35;
  vec4 wp = modelMatrix * vec4(vec3(wx, c.y + bob, c.z) + local, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
#ifdef USE_INSTANCING_COLOR
  vTint = instanceColor;
#else
  vTint = vec3(1.0);
#endif
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const CLOUD_FS = /* glsl */`
uniform vec3 uLit, uShade, uCRim, uSunDir, uHemiSky;
uniform float uEmit;
varying vec3 vN; varying vec3 vW; varying vec3 vTint;
#include <fog_pars_fragment>
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float l = dot(N, uSunDir) * 0.5 + 0.5;
  vec3 col = mix(uShade, uLit, smoothstep(0.25, 0.85, l));
  col = mix(col, uLit, smoothstep(0.3, 1.0, N.y) * 0.45);
  col = mix(col, uShade * 0.9, smoothstep(-0.2, -0.9, N.y) * 0.5);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  col += uCRim * fr * (0.22 + uEmit);
  col *= vTint;
  col += uCRim * uEmit * 0.35;
  gl_FragColor = vec4(col * 0.9, 1.0);
  ${OUT_FRAG}
}`;

// ---------- generic decor (instanced clay + variants) ----------
const DECOR_VS = /* glsl */`
uniform float uTime;
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec3 vObj;
#ifdef EMIT_ATTR
attribute float aEmit;
varying float vEmit;
#endif
#include <fog_pars_vertex>
void main(){
  vec3 col = vec3(1.0);
#ifdef USE_COLOR
  col *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  col *= instanceColor;
#endif
  vCol = col; vObj = position;
#ifdef EMIT_ATTR
  vEmit = aEmit;
#endif
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
#ifdef BOB
  wp.y += sin(uTime * 1.6 + m[3].x * 0.37 + m[3].z * 0.23) * BOB;
#endif
  vW = wp.xyz;
  vN = normalize(mat3(m) * normal);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const DECOR_FS = /* glsl */`
uniform float uTime, uBeat, uFever;
uniform vec3 uAccent, uBody, uAccent2;
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec3 vObj;
#ifdef EMIT_ATTR
varying float vEmit;
#endif
#include <fog_pars_fragment>
${GLSL_COMMON}
${GLSL_LIGHT}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  vec3 base = vCol;
#ifdef NEON
  base = uBody;
#endif
  vec3 c = softLit(base, N, V);
#ifdef WINDOWS
  if (abs(N.y) < 0.4) {
    vec2 wc = vec2(vW.x + vW.z, vW.y);
    vec2 cell = floor(wc / vec2(1.1, 1.4));
    vec2 f = fract(wc / vec2(1.1, 1.4));
    float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.25, f.y) * step(f.y, 0.7);
    float on = step(0.35, hash12(cell)) * (0.75 + 0.25 * sin(uTime * 2.0 + hash12(cell + 7.0) * 30.0));
    c = mix(c, mix(uAccent, uAccent2, step(0.8, hash12(cell + 3.0))) * 1.9, win * on);
  }
  if (N.y > 0.6) c = mix(c, uAccent * 1.4, (1.0 - smoothstep(0.0, 0.03, min(0.5 - abs(vObj.x), 0.5 - abs(vObj.z)))) * 0.8);
#endif
#ifdef CRYSTAL
  float t = clamp(vObj.y + 0.5, 0.0, 1.4);
  vec3 cc = mix(vCol * 0.45, mix(vCol, vec3(1.0), 0.25), t);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  c = softLit(cc, N, V) + vCol * fr * 0.7 + vCol * (0.35 + 0.4 * uBeat) * smoothstep(0.9, 1.35, t);
#endif
#ifdef STRIPES
  float sb = step(0.5, fract((vObj.y + vObj.x * 0.35) * 3.0));
  c = softLit(mix(vCol, vec3(1.0), sb * 0.75), N, V);
#endif
#ifdef NEON
  float cap = smoothstep(0.34, 0.4, vObj.y);
  float ring = 1.0 - smoothstep(0.02, 0.05, abs(vObj.y - 0.05));
  c = mix(c, vCol * (2.4 + uBeat * 0.8 + uFever), max(cap, ring * 0.9));
#endif
#ifdef GEAR
  float gr = length(vObj.xy);
  c = softLit(uBody, N, V);
  c = mix(c, vCol * (1.25 + uBeat * 0.4), max(step(0.95, gr), 1.0 - smoothstep(0.34, 0.37, gr)));
#endif
#ifdef SHARD
  vec3 e = abs(vObj);
  float edge = step(0.4, max(max(min(e.x, e.y), min(e.y, e.z)), min(e.x, e.z)));
  float flick = 0.7 + 0.3 * step(0.2, fract(uTime * 1.7 + vW.x * 0.13));
  c = mix(softLit(uBody, N, V), vCol * 2.3 * flick, edge);
#endif
#ifdef EMIT_ATTR
  c += vCol * vEmit;
#endif
  gl_FragColor = vec4(c, 1.0);
  ${OUT_FRAG}
}`;

// ---------- planet + ring ----------
const PLANET_VS = /* glsl */`
varying vec3 vN; varying vec3 vO; varying vec3 vW;
void main(){
  vO = position; vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const PLANET_FS = /* glsl */`
uniform vec3 uP1, uP2, uAtmo, uLightDir;
uniform float uMode, uTime;
varying vec3 vN; varying vec3 vO; varying vec3 vW;
${GLSL_COMMON}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  vec3 c;
  if (uMode < 0.5) {
    float lat = normalize(vO).y;
    float w = vnoise3(vO * 2.5) * 2.0 + vnoise3(vO * 7.0) * 0.6;
    float band = sin(lat * 14.0 + w * 1.6) * 0.5 + 0.5;
    c = mix(uP1, uP2, band * 0.8);
    float diff = smoothstep(-0.35, 0.7, dot(N, uLightDir));
    c *= 0.42 + 0.7 * diff;
    c += uAtmo * fr * 1.1;
  } else {
    // black hole / glitch core: dark disc, glowing event horizon
    c = mix(uP1, uP2, fr) * 0.4;
    c += uAtmo * pow(fr, 1.5) * (2.2 + 0.6 * sin(uTime * 2.0));
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const RING_VS = /* glsl */`
varying vec2 vUv2; varying vec3 vW;
void main(){ vUv2 = position.xz; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const RING_FS = /* glsl */`
uniform vec3 uRingCol;
uniform float uRingA, uMode, uTime, uInner, uOuter;
varying vec2 vUv2; varying vec3 vW;
${GLSL_COMMON}
void main(){
  float r = length(vUv2);
  float t = (r - uInner) / (uOuter - uInner);
  if (t < 0.0 || t > 1.0) discard;
  float bands = 0.55 + 0.45 * vnoise2(vec2(t * 38.0, 0.5));
  float gap = smoothstep(0.02, 0.06, abs(t - 0.62));
  float a = bands * gap * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.85, 1.0, t)) * uRingA;
  vec3 c = uRingCol * (0.8 + 0.4 * bands);
  if (uMode > 0.5) {
    float ang = atan(vUv2.y, vUv2.x) / 6.2831853;
    c = candyHue(ang + t * 0.4 - uTime * 0.05) * (1.6 + 1.2 * (1.0 - t));
    a = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.55, 1.0, t)) * (0.7 + 0.3 * bands);
  }
  gl_FragColor = vec4(c, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------- additive points (sparkles, thrusters, fireworks) ----------
const POINTS_VS = /* glsl */`
attribute float aSize;
attribute float aSeed;
attribute vec3 aCol;
uniform float uScale, uTime;
varying vec3 vCol; varying float vA; varying float vSeed;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 40.0);
  vA = tw; vCol = aCol; vSeed = aSeed;
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.1) * (0.7 + 0.3 * tw), 0.0, 96.0);
  gl_Position = projectionMatrix * mv;
}`;
const POINTS_FS = /* glsl */`
uniform float uStar;
varying vec3 vCol; varying float vA; varying float vSeed;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = length(q);
  float soft = exp(-d * d * 4.0);
  float star = max(1.0 - smoothstep(0.0, 0.12, abs(q.x)) - d * 0.4, 0.0) + max(1.0 - smoothstep(0.0, 0.12, abs(q.y)) - d * 0.4, 0.0);
  float a = mix(soft, max(soft * 0.5, star * (1.0 - d)), uStar) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a, a);
}`;

const FIREWORK_VS = /* glsl */`
attribute vec4 aBurst;   // centre xyz, start time
attribute vec4 aDir;     // dir xyz, speed
attribute vec3 aCol;
uniform float uTime, uScale;
varying vec3 vCol; varying float vA;
void main(){
  float t = uTime - aBurst.w;
  float life = 1.9;
  float k = clamp(t / life, 0.0, 1.0);
  vec3 p = aBurst.xyz + aDir.xyz * aDir.w * (1.0 - exp(-t * 2.2)) / 2.2 + vec3(0.0, -1.6 * t * t, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vA = (t < 0.0 || t > life) ? 0.0 : (1.0 - k) * (0.75 + 0.25 * sin(t * 30.0 + aDir.x * 20.0));
  vCol = aCol;
  gl_PointSize = vA <= 0.0 ? 0.0 : clamp(1.4 * uScale / max(-mv.z, 0.1), 0.0, 48.0);
  gl_Position = projectionMatrix * mv;
}`;
const FIREWORK_FS = /* glsl */`
varying vec3 vCol; varying float vA;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 3.5) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a * 2.2, a);
}`;

// ---------- misc shaders ----------
const STORM_FS = /* glsl */`
uniform vec3 uWarnA, uWarnB;
uniform float uTime, uAlpha;
varying vec2 vUv;
void main(){
  float stripe = step(0.5, fract(vUv.x * 90.0 + vUv.y * 2.2 - uTime * 0.8));
  vec3 c = mix(uWarnA, uWarnB, stripe);
  float chev = 1.0 - smoothstep(0.0, 0.1, abs(fract(vUv.y * 2.0 - uTime * 0.9 + abs(fract(vUv.x * 60.0) - 0.5) * 0.8) - 0.5));
  float a = (1.0 - smoothstep(0.1, 1.0, vUv.y)) * 0.5 + chev * 0.18 * (1.0 - vUv.y);
  gl_FragColor = vec4(c * (1.2 + chev), a * uAlpha);
}`;
const WELL_FS = /* glsl */`
uniform vec3 uGlitch, uVoid;
uniform float uTime;
varying vec2 vUv; varying vec3 vPos;
${GLSL_COMMON}
void main(){
  float depth = clamp(-vPos.y, 0.0, 1.0);
  vec3 c = mix(uGlitch * 1.6, uVoid, smoothstep(0.0, 0.55, depth));
  vec2 sp = vec2(vUv.x * 40.0, vUv.y * 12.0 + uTime * 0.6);
  float st = step(0.93, hash12(floor(sp))) * smoothstep(0.35, 0.9, depth);
  c += vec3(1.0, 0.9, 1.0) * st * (0.6 + 0.4 * sin(uTime * 5.0 + vUv.x * 40.0));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const ROAD_FS = /* glsl */`
uniform vec3 uRoad, uLineA, uLineB;
uniform float uTime, uIn, uOut, uFever;
varying vec3 vPos;
#include <fog_pars_fragment>
${GLSL_COMMON}
void main(){
  float r = length(vPos.xz);
  float t = (r - uIn) / (uOut - uIn);
  float ang = atan(vPos.z, vPos.x) / 6.2831853;
  vec3 c = uRoad * (0.85 + 0.15 * step(0.5, fract(t * 3.0)));
  float edge = 1.0 - smoothstep(0.0, 0.03, min(t, 1.0 - t));
  c = mix(c, uLineA * 2.2, edge);
  float lane = 1.0 - smoothstep(0.004, 0.012, abs(fract(t * 3.0) - 0.0));
  float dash = step(0.5, fract(ang * 120.0));
  c = mix(c, vec3(0.9), lane * dash * step(0.05, t) * step(t, 0.95) * 0.6);
  // light-cycles racing around
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float lt = (fi + 0.5) / 3.0;
    float sp = (0.06 + fi * 0.025) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
    float x = fract(ang * 3.0 - uTime * sp);
    float head = smoothstep(0.0, 0.004, x) * exp(-(1.0 - x) * 0.0) * (1.0 - smoothstep(0.0, 0.18, 1.0 - x) * 0.0);
    float trail = smoothstep(0.75, 1.0, x);
    float across = 1.0 - smoothstep(0.02, 0.05, abs(t - lt));
    vec3 lc = mix(uLineA, uLineB, mod(fi, 2.0));
    lc = mix(lc, candyHue(fi * 0.3 + uTime * 0.5), uFever);
    c += lc * trail * trail * across * 3.0 * head;
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const HOLO_FS = /* glsl */`
uniform sampler2D uMap;
uniform vec3 uHoloA;
uniform float uTime;
varying vec2 vUv;
void main(){
  float scan = 0.75 + 0.25 * sin(vUv.y * 180.0 - uTime * 6.0);
  float flick = 0.85 + 0.15 * step(0.93, fract(sin(floor(uTime * 12.0)) * 43758.5));
  vec4 t = texture2D(uMap, vUv + vec2(step(0.97, fract(uTime * 0.7)) * 0.01, 0.0));
  float a = t.a * scan * flick * 0.85;
  gl_FragColor = vec4(mix(uHoloA, t.rgb, 0.6) * a * 1.8, a);
}`;
const AURORA_VS = /* glsl */`
attribute float aPhase;
uniform float uTime;
varying vec2 vUv; varying float vPh;
void main(){
  vUv = uv; vPh = aPhase;
  vec3 p = position;
  p.y += sin(uv.x * 9.0 + uTime * 0.5 + aPhase * 3.0) * 6.0 * uv.y;
  p.x += sin(uv.x * 5.0 + uTime * 0.3 + aPhase) * 8.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const AURORA_FS = /* glsl */`
uniform vec3 uA, uB;
uniform float uTime;
varying vec2 vUv; varying float vPh;
void main(){
  float v = vUv.y;
  float curtain = 0.6 + 0.4 * sin(vUv.x * 70.0 + uTime * 1.2 + vPh * 5.0) * sin(vUv.x * 23.0 - uTime * 0.7);
  float a = smoothstep(0.0, 0.12, v) * (1.0 - smoothstep(0.25, 1.0, v)) * curtain * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  vec3 c = mix(uA, uB, smoothstep(0.1, 0.8, v + 0.2 * sin(vUv.x * 6.0 + vPh)));
  gl_FragColor = vec4(c * a * 1.3, a);
}`;
const GLOW_FS = /* glsl */`
uniform vec3 uGlowCol;
uniform float uTime, uGlowA;
varying vec2 vUv;
void main(){
  vec2 q = vUv * 2.0 - 1.0;
  float d = length(q);
  float a = exp(-d * d * 5.0) * (0.85 + 0.15 * sin(uTime * 2.2)) * uGlowA;
  gl_FragColor = vec4(uGlowCol * a * 1.6, a);
}`;
const UV_VS = /* glsl */`
varying vec2 vUv; varying vec3 vPos;
void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const UV_VS_INST = /* glsl */`
varying vec2 vUv; varying vec3 vPos;
void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`;
const ROAD_VS = /* glsl */`
varying vec3 vPos;
#include <fog_pars_vertex>
void main(){ vPos = position; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

// ============================================================
// helpers
// ============================================================
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

const col = (hex) => new THREE.Color(hex);
function setMat(mesh, i, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
  _m.compose(_v, _q, _s); mesh.setMatrixAt(i, _m);
}
const rbox = (r, seg) => roundedBoxGeometry(r, seg).clone();
function fogUniforms() { return THREE.UniformsUtils.clone(THREE.UniformsLib.fog); }
function hexSdf(x, z, r) {
  const ax = Math.abs(x), az = Math.abs(z);
  return Math.max(ax * 0.8660254 + az * 0.5, az) - r;
}
/** colour a geometry by face normal: top / side / bottom (for clay islands) */
function paintByNormal(geo, top, side, bottom) {
  const n = geo.attributes.normal, cnt = n.count;
  let c = geo.attributes.color;
  if (!c) { c = new THREE.BufferAttribute(new Float32Array(cnt * 3), 3); geo.setAttribute('color', c); }
  const T = col(top), S = col(side), B = col(bottom), tmp = new THREE.Color();
  for (let i = 0; i < cnt; i++) {
    const ny = n.getY(i);
    if (ny > 0) tmp.copy(S).lerp(T, THREE.MathUtils.smoothstep(ny, 0.35, 0.7));
    else tmp.copy(S).lerp(B, THREE.MathUtils.smoothstep(-ny, 0.4, 0.9));
    c.setXYZ(i, tmp.r, tmp.g, tmp.b);
  }
  c.needsUpdate = true;
}
function mergeGeos(list) {
  // minimal non-indexed merge of position/normal/color(/uv) for static set pieces
  let total = 0;
  const prepared = list.map(({ geo, color, matrix }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    total += g.attributes.position.count;
    return { g, color: color !== undefined ? col(color) : null };
  });
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), clr = new Float32Array(total * 3);
  let o = 0;
  for (const { g, color } of prepared) {
    const p = g.attributes.position, n = g.attributes.normal, gc = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      pos[(o + i) * 3] = p.getX(i); pos[(o + i) * 3 + 1] = p.getY(i); pos[(o + i) * 3 + 2] = p.getZ(i);
      nrm[(o + i) * 3] = n.getX(i); nrm[(o + i) * 3 + 1] = n.getY(i); nrm[(o + i) * 3 + 2] = n.getZ(i);
      if (color) { clr[(o + i) * 3] = color.r; clr[(o + i) * 3 + 1] = color.g; clr[(o + i) * 3 + 2] = color.b; }
      else if (gc) { clr[(o + i) * 3] = gc.getX(i); clr[(o + i) * 3 + 1] = gc.getY(i); clr[(o + i) * 3 + 2] = gc.getZ(i); }
      else { clr[(o + i) * 3] = clr[(o + i) * 3 + 1] = clr[(o + i) * 3 + 2] = 1; }
    }
    o += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(clr, 3));
  out.computeBoundingSphere();
  return out;
}
const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sx, sy, sz));
};

// ============================================================
// World
// ============================================================
export class World {
  constructor(G) {
    this.G = G;
    this.scene = G.scene;
    this.low = G.quality === 'low';
    this.root = new THREE.Group();
    this.root.name = 'world';
    this.scene.add(this.root);

    this.arenaRadius = 11;
    this.playRadius = 11;
    this._playTarget = 11;
    this._stormA = 0;
    this.theme = null;
    this.features = undefined;
    this.look = LOOK.cloud;
    this.fever = false;
    this.heroRing = true;       // set false if another module draws the §7.20 ring
    this._feverK = 0;
    this._pulse = 0;
    this._t = 0;
    this._radiusOverride = null;
    this._sets = new Map();     // worldId → set piece {group, update, dispose, bumpers?, wells?}
    this._set = null;
    this._tiles = [];
    this._tileTimer = 0;
    this._bumpers = [];
    this._belts = [];
    this._ice = [];
    this._pushOut = { x: 0, z: 0 };

    // shared uniforms (same objects referenced by every world material)
    this.U = {
      uTime: { value: 0 }, uBeat: { value: 0 }, uFever: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.45, 0.85, 0.55).normalize() },
      uSunCol: { value: col(0xfff4e0) },
      uHemiSky: { value: col(0xeaf4ff) },
      uHemiGround: { value: col(0xf6e4c8) },
    };

    this._buildLights();
    this._buildSky();
    this._buildFloor();
    this._buildRim();
    this._buildBase();
    this._buildClouds();
    this._buildIslands();
    this._buildSparkles();
    this._buildPlanet();
    this._buildStorm();

    // ---- bus
    const bus = G.bus;
    this._offs = [
      bus.on('fever', () => this.setFever(true)),
      bus.on('run:end', () => { this.setFever(false); this._resetGimmicks(); }),
      bus.on('run:start', () => { this.setFever(false); this._resetGimmicks(); }),
      bus.on('wave:start', (p) => this.pulseRim(p?.isBoss ? 0xff8af2 : 0xffffff, p?.isBoss ? 1 : 0.6)),
      bus.on('boss:intro', () => this.pulseRim(0xff8af2, 1)),
      bus.on('boss:phase', () => { this.pulseRim(0xff8af2, 1); this.rimJump(0.35); }),
      bus.on('boss:slam', () => this.rimJump(0.28)),
      bus.on('boss:defeat', () => { this.pulseRim(0xffe07a, 1); this.rimJump(0.4); }),
      bus.on('enemy:bonk', (p) => {
        if (!p) return;
        const r = Math.hypot(p.x || 0, p.z || 0);
        if (r > this.arenaRadius - 1.8) this.rimRipple(Math.atan2(p.z, p.x), 0.22);
      }),
      bus.on('post:quality', (p) => this._applyDetail(p?.tier ?? 2)),
    ];
  }

  // ============================================================
  // build: shared systems
  // ============================================================
  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0xeaf4ff, 0xf6e4c8, 1.5);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.3);
    this.sun.position.copy(this.U.uSunDir.value).multiplyScalar(60);
    this.sun.target.position.set(0, 0, 0);
    this.root.add(this.hemi, this.sun, this.sun.target);
  }

  _buildSky() {
    const geo = new THREE.SphereGeometry(TUNE.domeRadius, 48, 24);
    this.skyU = {
      uTop: { value: col(0x6fb6ff) }, uBottom: { value: col(0xfbe7ff) }, uBelow: { value: col(0xdcebff) },
      uSkySun: { value: new THREE.Vector3(-0.4, 0.3, -0.85).normalize() }, uSkySunCol: { value: col(0xfff3c4) },
      uNebA: { value: col(0xff7ad9) }, uNebB: { value: col(0x7c6cff) },
      uRbDir: { value: new THREE.Vector3(0.05, -0.08, -1).normalize() },
      uStars: { value: 0 }, uNebula: { value: 0 }, uRainbow: { value: 0 }, uTime: this.U.uTime, uGain: { value: 0.62 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS,
      side: THREE.BackSide, depthWrite: false, fog: false, defines: { OCT: this.low ? 2 : 4 },
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = 10;        // after opaque: early-z skips covered pixels
    this.sky.frustumCulled = false;
    this.root.add(this.sky);
  }

  _buildFloor() {
    const vec4s = (n) => Array.from({ length: n }, () => new THREE.Vector4());
    this.floorU = {
      ...fogUniforms(),
      uFloor: { value: col(0xf6e7c8) }, uFloorAlt: { value: col(0xefd9b0) }, uGrid: { value: col(0x8fc8ff) },
      uEdge: { value: col(0x7dffc0) }, uHeroCol: { value: col(TUNE.heroRing.color) },
      uIceCol: { value: col(0xcdeeff) }, uBeltCol: { value: col(0xd5dde8) }, uBeltChev: { value: col(0x3cffd1) }, uBeltRail: { value: col(0x8fa3b8) },
      uWarnA: { value: col(0xffa62b) }, uWarnB: { value: col(0xfff4c2) }, uGlitch: { value: col(0xff3df2) }, uInk: { value: col(0x2b1d3f) },
      uR: { value: 11 }, uPlayR: { value: 11 }, uScan: { value: 1 },
      uTime: this.U.uTime, uBeat: this.U.uBeat, uFever: this.U.uFever,
      uHero: { value: new THREE.Vector4(0, 0, 0, TUNE.heroRing.r) },
      uIce: { value: vec4s(4) }, uIceN: { value: 0 },
      uBelt: { value: vec4s(2) }, uBeltDir: { value: vec4s(2) }, uBeltN: { value: 0 },
      uTile: { value: vec4s(6) }, uTileN: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.floorU, vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS, fog: true });
    const geo = new THREE.CircleGeometry(1, 128);
    geo.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(geo, mat);
    this.floor.name = 'arenaFloor';
    this.root.add(this.floor);
  }

  _buildRim() {
    const T = TUNE.rim;
    const geo = roundedBoxGeometry(0.28, 3).clone();
    this.rimAttr = new THREE.InstancedBufferAttribute(new Float32Array(T.cap * 2), 2);
    geo.setAttribute('aRim', this.rimAttr);
    this.rimU = {
      ...fogUniforms(), ...this.U,
      uRimCol: { value: col(0x57d18a) }, uRimGlow: { value: col(0x7dffc0) }, uPulseCol: { value: col(0xffffff) },
      uPulse: { value: 0 }, uChase: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.rimU, vertexShader: RIM_VS, fragmentShader: RIM_FS, fog: true });
    this.rim = new THREE.InstancedMesh(geo, mat, T.cap);
    this.rim.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rim.frustumCulled = false;
    this.rim.count = 0;
    this._rimN = 0;
    this._rimA = new Float32Array(T.cap);        // angle
    this._rimV = new Float32Array(T.cap);        // height variant
    this._rimJ = new Float32Array(T.cap);        // jump offset
    this._rimJV = new Float32Array(T.cap);       // jump velocity
    this._rimW = 1;
    this._rimActive = false;
    this.root.add(this.rim);
  }

  _layoutRim() {
    const T = TUNE.rim, R = this.arenaRadius;
    const rr = R + T.d / 2 + 0.02;
    const n = Math.min(T.cap, Math.max(24, Math.round((TAU * rr) / (T.w + T.gap))));
    this._rimN = n;
    this._rimRR = rr;
    this._rimW = (TAU * rr) / n - T.gap;
    const rng = makeRng(77);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this._rimA[i] = a;
      this._rimV[i] = rng();
      this._rimJ[i] = 0; this._rimJV[i] = 0;
      this.rimAttr.setXY(i, i / n, this._rimV[i]);
    }
    this.rimAttr.needsUpdate = true;
    this.rim.count = n;
    this._writeRim();
  }

  _writeRim() {
    const T = TUNE.rim, rr = this._rimRR;
    for (let i = 0; i < this._rimN; i++) {
      const a = this._rimA[i], h = T.h * (0.96 + this._rimV[i] * 0.08);
      const j = this._rimJ[i];
      setMat(this.rim, i, Math.cos(a) * rr, h / 2 + j, Math.sin(a) * rr, this._rimW, h * (1 + j * 0.25), T.d, 0, Math.atan2(Math.cos(a), Math.sin(a)), 0);
    }
    this.rim.instanceMatrix.needsUpdate = true;
  }

  _buildBase() {
    this.baseU = {
      ...fogUniforms(), ...this.U,
      uSkirt: { value: col(0xe8cfa6) }, uRockA: { value: col(0xf0d3a4) }, uRockB: { value: col(0xc79ad8) },
      uBand: { value: col(0x7dffc0) }, uTip: { value: col(0xffb7d5) }, uMetal: { value: col(0xe6e9f5) },
    };
    this.baseMat = new THREE.ShaderMaterial({ uniforms: this.baseU, vertexShader: BASE_VS, fragmentShader: BASE_FS, fog: true });
    this.base = new THREE.Mesh(new THREE.BufferGeometry(), this.baseMat);
    this.root.add(this.base);
    // thruster glows under the island (+ one big under-glow)
    const n = 5;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n).map((_, i) => i * 0.13), 1));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.thrustU = { uScale: { value: 400 }, uTime: this.U.uTime, uStar: { value: 0 } };
    this.thrust = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.thrustU, vertexShader: POINTS_VS, fragmentShader: POINTS_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.thrust.frustumCulled = false;
    this.root.add(this.thrust);
  }

  _layoutBase() {
    const outer = this.arenaRadius + TUNE.floorPad;
    const prof = [[1.0, 0], [1.0, -0.28], [0.992, -0.46], [0.975, -0.55], [0.975, -1.0], [0.955, -1.12],
      [0.9, -1.6], [0.8, -2.5], [0.66, -3.5], [0.52, -4.7], [0.38, -6.0], [0.24, -7.3], [0.11, -8.5], [0.03, -9.2], [0.0, -9.35]];
    const pts = prof.map(([r, y]) => new THREE.Vector2(r * outer, y));
    const geo = new THREE.LatheGeometry(pts, this.low ? 48 : 72);
    this.base.geometry.dispose();
    this.base.geometry = geo;
    // thrusters
    const p = this.thrust.geometry.attributes.position, s = this.thrust.geometry.attributes.aSize, c = this.thrust.geometry.attributes.aCol;
    const glow = col(this.look.tip);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      p.setXYZ(i, Math.cos(a) * outer * 0.56, -4.3, Math.sin(a) * outer * 0.56);
      s.setX(i, 7);
      c.setXYZ(i, glow.r * 0.8, glow.g * 0.8, glow.b * 0.8);
    }
    p.setXYZ(4, 0, -9.8, 0); s.setX(4, 16); c.setXYZ(4, glow.r, glow.g, glow.b);
    p.needsUpdate = s.needsUpdate = c.needsUpdate = true;
  }

  _buildClouds() {
    const cap = this.low ? TUNE.clouds.low : TUNE.clouds.high;
    const geo = this.low ? new THREE.IcosahedronGeometry(1, 2) : new THREE.SphereGeometry(1, 20, 14);
    this.cloudDrift = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    geo.setAttribute('aDrift', this.cloudDrift);
    this.cloudU = {
      ...fogUniforms(),
      uTime: this.U.uTime, uWrap: { value: 300 }, uSunDir: this.U.uSunDir, uHemiSky: this.U.uHemiSky,
      uLit: { value: col(0xfdfbff) }, uShade: { value: col(0xd0cff4) }, uCRim: { value: col(0xffe4f3) }, uEmit: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.cloudU, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, fog: true });
    this.clouds = new THREE.InstancedMesh(geo, mat, cap);
    this.clouds.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.clouds.frustumCulled = false;
    this.clouds.count = 0;
    this._cloudCap = cap;
    this.root.add(this.clouds);
  }

  _layoutClouds(seed) {
    const rng = makeRng(seed);
    const L = this.look, R = this.arenaRadius;
    const tints = L.cloudTints.map(col);
    let i = 0;
    const cap = this._cloudCap;
    const put = (x, y, z, s, sy, drift) => {
      if (i >= cap) return;
      setMat(this.clouds, i, x, y, z, s, s * sy, s * (0.8 + rng() * 0.4), 0, rng() * TAU, 0);
      const t = tints[(rng() * tints.length) | 0];
      this.clouds.instanceColor.setXYZ(i, t.r, t.g, t.b);
      this.cloudDrift.setX(i, drift);
      i++;
    };
    const cluster = (cx, cy, cz, size, n, drift) => {
      for (let k = 0; k < n; k++) {
        const a = rng() * TAU, d = rng() * size * 0.9;
        const s = size * (0.45 + rng() * 0.55) * (k === 0 ? 1.15 : 1);
        put(cx + Math.cos(a) * d, cy + (rng() - 0.3) * size * 0.25, cz + Math.sin(a) * d * 0.7, s, 0.55 + rng() * 0.2, drift);
      }
    };
    // 1) halo hugging the floating island (visible around the arena in gameplay; the intro flies through it)
    const K = L.cloudK ?? 1, SZ = L.cloudS ?? 1;
    const halo = Math.round((this.low ? 10 : 16) * K);
    for (let k = 0; k < halo; k++) {
      const a = (k / halo) * TAU + rng() * 0.3;
      const r = R + 3.2 + rng() * 4.5;
      cluster(Math.cos(a) * r, -3.6 - rng() * 3.5, Math.sin(a) * r, (1.8 + rng() * 1.6) * SZ, 4, 0);
    }
    // 2) the drifting cloud sea below
    const sea = Math.round((this.low ? 26 : 52) * K);
    for (let k = 0; k < sea; k++) {
      const a = rng() * TAU, r = R + 10 + Math.pow(rng(), 0.8) * 220;
      const size = (3.5 + r * 0.045 + rng() * 4) * SZ;
      cluster(Math.cos(a) * r, -16 - rng() * 12 - r * 0.02, Math.sin(a) * r, size, 4 + ((rng() * 2) | 0), 0.5 + rng() * 0.6);
    }
    // 3) high wisps above the arena: never seen by the gameplay / hub cameras, the intro dives through them
    const wisps = Math.round((this.low ? 8 : 14) * Math.max(0.5, K));
    for (let k = 0; k < wisps; k++) {
      const a = rng() * TAU, r = 8 + rng() * 42;
      cluster(Math.cos(a) * r, 44 + rng() * 16, Math.sin(a) * r + 30, (2.4 + rng() * 2.5) * SZ, 4, 0.3);
    }
    // 4) towering cumulus on the horizon (hub / intro backdrop)
    const towers = Math.round((this.low ? 8 : 14) * Math.max(0.5, K));
    for (let k = 0; k < towers; k++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 1.6;
      const r = 240 + rng() * 120;
      const size = 26 + rng() * 22;
      cluster(Math.cos(a) * r, -30 + rng() * 22, Math.sin(a) * r, size, 3, 0);
    }
    this.clouds.count = i;
    this.clouds.instanceMatrix.needsUpdate = true;
    this.clouds.instanceColor.needsUpdate = true;
    this.cloudDrift.needsUpdate = true;
  }

  _buildIslands() {
    const cap = this.low ? TUNE.islands.low : TUNE.islands.high;
    const geo = roundedBoxGeometry(0.2, 3).clone();
    paintByNormal(geo, 0x8fe38a, 0xf3d7a6, 0xcfa87e);
    this.islandGeo = geo;
    this.islandMat = this._decorMat({ vertexColors: true, bob: 0.45 });
    this.islands = new THREE.InstancedMesh(geo, this.islandMat, cap);
    this.islands.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    this.islands.frustumCulled = false;
    this.islands.count = 0;
    this._islandCap = cap;
    this.islandTops = [];     // [{x, y, z, s, high}] for set pieces (houses …)
    this.root.add(this.islands);
  }

  _layoutIslands(seed) {
    const rng = makeRng(seed + 11);
    const R = this.arenaRadius;
    const cap = this._islandCap;
    let i = 0;
    this.islandTops.length = 0;
    const put = (x, y, z, sx, sy, sz, ry, tint = 1) => {
      if (i >= cap) return;
      setMat(this.islands, i, x, y, z, sx, sy, sz, 0, ry, 0);
      this.islands.instanceColor.setXYZ(i, tint, tint, tint);
      i++;
    };
    const island = (x, y, z, s, high) => {
      const ry = rng() * TAU;
      put(x, y, z, s, s * 0.55, s * (0.8 + rng() * 0.3), ry, 0.94 + rng() * 0.08);
      if (rng() < 0.7) put(x + (rng() - 0.5) * s * 0.6, y - s * 0.45, z + (rng() - 0.5) * s * 0.5, s * 0.55, s * 0.45, s * 0.5, ry + 0.4, 0.9);
      if (rng() < 0.5) put(x + (rng() - 0.5) * s * 0.4, y + s * 0.4, z + (rng() - 0.5) * s * 0.3, s * 0.38, s * 0.3, s * 0.38, ry + 0.8, 1.0);
      this.islandTops.push({ x, y: y + s * 0.275, z, s, high });
    };
    // low ring (visible from the gameplay camera, around & below the arena)
    const nLow = this.low ? 7 : 11;
    for (let k = 0; k < nLow; k++) {
      const a = (k / nLow) * TAU + (rng() - 0.5) * 0.5;
      const r = R + 8 + rng() * 22;
      island(Math.cos(a) * r, -6 - rng() * 10, Math.sin(a) * r, 2 + rng() * 2.5, false);
    }
    // high islands in the sky (hub / intro backdrop), mostly in front of the hub camera (−Z)
    const nHigh = this.low ? 8 : 13;
    for (let k = 0; k < nHigh; k++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 1.5;
      const r = 42 + rng() * 110;
      island(Math.cos(a) * r, 2 + rng() * 26 + r * 0.06, Math.sin(a) * r, 3 + rng() * 6 + r * 0.02, true);
    }
    this.islands.count = i;
    this.islands.instanceMatrix.needsUpdate = true;
    this.islands.instanceColor.needsUpdate = true;
  }

  _buildSparkles() {
    const n = this.low ? TUNE.sparkles.low : TUNE.sparkles.high;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.sparkU = { uScale: { value: 400 }, uTime: this.U.uTime, uStar: { value: 1 } };
    this.sparkles = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.sparkU, vertexShader: POINTS_VS, fragmentShader: POINTS_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.sparkles.frustumCulled = false;
    this._sparkN = n;
    this.root.add(this.sparkles);
  }

  _layoutSparkles(seed) {
    const rng = makeRng(seed + 23);
    const g = this.sparkles.geometry, R = this.arenaRadius;
    const p = g.attributes.position, s = g.attributes.aSize, sd = g.attributes.aSeed, c = g.attributes.aCol;
    const cols = this.look.sparkle.map(col);
    for (let i = 0; i < this._sparkN; i++) {
      let x, y, z;
      if (i % 3 === 0) {          // near the arena, outside the play area
        const a = rng() * TAU, r = R + 2.5 + rng() * 10;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = -4 + rng() * 9;
      } else {
        const a = rng() * TAU, r = 20 + rng() * 90;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = -25 + rng() * 55;
      }
      p.setXYZ(i, x, y, z);
      s.setX(i, 0.35 + rng() * 0.6 + (i % 3 ? 0.6 : 0));
      sd.setX(i, rng());
      const k = cols[(rng() * cols.length) | 0];
      c.setXYZ(i, k.r, k.g, k.b);
    }
    p.needsUpdate = s.needsUpdate = sd.needsUpdate = c.needsUpdate = true;
  }

  _buildPlanet() {
    this.planetU = {
      uP1: { value: col(0xffb7d5) }, uP2: { value: col(0xfff0f6) }, uAtmo: { value: col(0xffffff) },
      uLightDir: { value: new THREE.Vector3(-0.4, 0.4, 0.8).normalize() }, uMode: { value: 0 }, uTime: this.U.uTime,
    };
    this.planetGroup = new THREE.Group();
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.ShaderMaterial({
      uniforms: this.planetU, vertexShader: PLANET_VS, fragmentShader: PLANET_FS, fog: false,
    }));
    this.ringU = {
      uRingCol: { value: col(0xfff0c2) }, uRingA: { value: 0.8 }, uMode: this.planetU.uMode, uTime: this.U.uTime,
      uInner: { value: 1.35 }, uOuter: { value: 2.35 },
    };
    const rg = new THREE.RingGeometry(1.35, 2.35, 128, 1);
    rg.rotateX(-Math.PI / 2);
    this.planetRing = new THREE.Mesh(rg, new THREE.ShaderMaterial({
      uniforms: this.ringU, vertexShader: RING_VS, fragmentShader: RING_FS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    this.planetGroup.add(this.planet, this.planetRing);
    this.root.add(this.planetGroup);
  }

  _buildStorm() {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 128, 1, true);
    geo.translate(0, 0.5, 0);
    this.stormU = { uWarnA: { value: col(0xffa62b) }, uWarnB: { value: col(0xfff4c2) }, uTime: this.U.uTime, uAlpha: { value: 0 } };
    this.storm = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.stormU, vertexShader: UV_VS, fragmentShader: STORM_FS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    this.storm.visible = false;
    this.storm.renderOrder = 3;
    this.root.add(this.storm);
  }

  /** shared decor material (instanced clay + variants) */
  _decorMat({ vertexColors = false, bob = 0, kind = null, emitAttr = false, accent = 0xffffff, accent2 = 0xffffff, body = 0xffffff } = {}) {
    const defines = {};
    if (bob) defines.BOB = bob.toFixed(3);
    if (kind) defines[kind] = '';
    if (emitAttr) defines.EMIT_ATTR = '';
    const uniforms = {
      ...fogUniforms(), ...this.U,
      uAccent: { value: col(accent) }, uAccent2: { value: col(accent2) }, uBody: { value: col(body) },
    };
    return new THREE.ShaderMaterial({ uniforms, defines, vertexShader: DECOR_VS, fragmentShader: DECOR_FS, fog: true, vertexColors });
  }

  // ============================================================
  // load / theme
  // ============================================================
  /**
   * Build / swap the themed environment. Safe to call many times (hub backdrop,
   * every run, Endless world cycling). opts.arenaRadius overrides DATA (modes).
   */
  load(worldId, opts = {}) {
    const worlds = DATA.worlds;
    const W = typeof worldId === 'number' ? (worlds[worldId] || worlds[0]) : (worlds.find((w) => w.id === worldId) || worlds[0]);
    const changed = this.theme !== W;
    this.theme = W;
    this.features = W.features;
    this.look = LOOK[W.id] || LOOK.cloud;
    this._radiusOverride = opts.arenaRadius ?? null;
    const R = this._radiusOverride ?? this._modeRadius() ?? W.arenaRadius;
    const rChanged = Math.abs(R - this.arenaRadius) > 1e-3 || !this._laidOut;
    this.arenaRadius = R;
    this.playRadius = this._playTarget = R;
    if (changed || rChanged) {
      this._applyPalette();
      this._layoutAll(W.index * 131 + 7);
    }
    if (changed || this._set?.R !== R) this._activateSet(W);
    this._setupGimmicks();
    this._resetGimmicks();
    this.setFever(false);
    this._pulse = 0;
    this.G.post?.setGrade?.(this.look.grade);
    return this;
  }

  /** Change the gameplay radius (Endless / Storm arenas). Rebuilds rim + base, keeps everything else. */
  setArenaRadius(r) {
    if (!(r > 3)) return;
    if (Math.abs(r - this.arenaRadius) < 1e-3 && this._laidOut) return;
    this.arenaRadius = r;
    this.playRadius = this._playTarget = r;
    if (this.theme) {
      this._layoutAll(this.theme.index * 131 + 7);
      this._activateSet(this.theme);   // set pieces hug the rim → rebuild for the new radius
    }
    this._setupGimmicks();
  }

  _modeRadius() {
    const run = this.G.run;
    if (!run) return null;
    const md = this.G.data?.modes?.[run.mode];
    return md?.arenaRadius ?? md?.radii?.[0] ?? null;
  }

  _layoutAll(seed) {
    const R = this.arenaRadius;
    const outer = R + TUNE.floorPad;
    this.floor.scale.set(outer, 1, outer);
    this.floorU.uR.value = R;
    this.floorU.uPlayR.value = R;
    this._layoutRim();
    this._layoutBase();
    this._layoutClouds(seed);
    this._layoutIslands(seed);
    this._layoutSparkles(seed);
    this._laidOut = true;
  }

  _applyPalette() {
    const P = this.theme.palette, L = this.look;
    // sky
    const S = this.skyU;
    S.uTop.value.set(P.skyTop); S.uBottom.value.set(P.skyBottom); S.uBelow.value.set(L.below);
    S.uSkySun.value.set(...L.sunSky).normalize(); S.uSkySunCol.value.set(L.sunSkyCol);
    S.uNebA.value.set(L.nebA); S.uNebB.value.set(L.nebB);
    S.uGain.value = L.skyGain ?? 0.62;
    S.uStars.value = L.stars; S.uNebula.value = this.low ? L.nebula * 0.8 : L.nebula; S.uRainbow.value = L.rainbow;
    // fog
    if (!this.scene.fog || !this.scene.fog.isFog) this.scene.fog = new THREE.Fog(L.fog, L.fogNear, L.fogFar);
    this.scene.fog.color.set(L.fog); this.scene.fog.near = L.fogNear; this.scene.fog.far = L.fogFar;
    // lights (world meshes use the same numbers through shared uniforms)
    this.hemi.color.set(L.hemi[0]); this.hemi.groundColor.set(L.hemi[1]); this.hemi.intensity = L.hemi[2];
    this.sun.color.set(L.sun[0]); this.sun.intensity = L.sun[1];
    this.U.uHemiSky.value.set(L.hemi[0]); this.U.uHemiGround.value.set(L.hemi[1]);
    this.U.uSunCol.value.set(L.sun[0]);
    setCharacterLighting({ sky: L.char.sky, ground: L.char.ground, rim: L.char.rim });
    // floor
    const F = this.floorU;
    F.uFloor.value.set(P.floor); F.uFloorAlt.value.set(P.floorAlt); F.uGrid.value.set(P.grid); F.uEdge.value.set(P.rimGlow);
    F.uWarnA.value.set(L.warnA); F.uWarnB.value.set(L.warnB); F.uGlitch.value.set(L.glitch);
    F.uBeltChev.value.set(P.accent);
    // rim + base
    this.rimU.uRimCol.value.set(P.rim); this.rimU.uRimGlow.value.set(P.rimGlow);
    const B = this.baseU;
    B.uSkirt.value.set(P.floorAlt).multiplyScalar(0.92); B.uRockA.value.set(L.rock[0]); B.uRockB.value.set(L.rock[1]);
    B.uBand.value.set(P.rimGlow); B.uTip.value.set(L.tip);
    // clouds
    const C = this.cloudU;
    C.uLit.value.set(L.cloudLit); C.uShade.value.set(L.cloudShade); C.uCRim.value.set(L.cloudRim); C.uEmit.value = L.cloudEmit;
    // islands
    paintByNormal(this.islandGeo, L.island.top, L.island.side, L.island.bottom);
    // planet
    const pl = L.planet;
    this.planetU.uP1.value.set(pl.c1); this.planetU.uP2.value.set(pl.c2); this.planetU.uAtmo.value.set(pl.atmo);
    this.planetU.uMode.value = pl.mode;
    this.planetU.uLightDir.value.set(...L.sunSky).normalize();
    this.ringU.uRingCol.value.set(pl.ring); this.ringU.uRingA.value = pl.ringA;
    _v.set(...pl.dir).normalize().multiplyScalar(TUNE.planetDist);
    this.planetGroup.position.copy(_v);
    this.planetGroup.scale.setScalar(pl.size);
    this.planetGroup.rotation.set(pl.tilt[0], 0, pl.tilt[1]);
    // storm
    this.stormU.uWarnA.value.set(L.warnA); this.stormU.uWarnB.value.set(L.warnB);
  }

  _applyDetail(tier) {
    // auto quality dropped: thin out décor (instance counts only — no rebuild)
    const k = tier <= 0 ? 0.45 : tier === 1 ? 0.7 : 1;
    this._detailK = k;
    if (this.sparkles) this.sparkles.geometry.setDrawRange(0, Math.floor(this._sparkN * k));
  }

  // ============================================================
  // per-world set pieces (lazy, cached LRU)
  // ============================================================
  _activateSet(W) {
    for (const s of this._sets.values()) s.group.visible = false;
    let set = this._sets.get(W.id);
    if (set && set.R !== this.arenaRadius) {
      this._sets.delete(W.id);
      this.root.remove(set.group);
      disposeTree(set.group);
      set.dispose?.();
      set = null;
    }
    if (!set) {
      const builder = SET_BUILDERS[W.id];
      set = builder ? builder(this, W) : { group: new THREE.Group(), update() {}, dispose() {} };
      set.R = this.arenaRadius;
      this.root.add(set.group);
      this._sets.set(W.id, set);
    } else {
      this._sets.delete(W.id); this._sets.set(W.id, set);  // LRU bump
    }
    set.group.visible = true;
    this._set = set;
    // evict the least recently used set pieces
    while (this._sets.size > TUNE.cacheSets) {
      const [id, old] = this._sets.entries().next().value;
      if (old === set) break;
      this._sets.delete(id);
      this.root.remove(old.group);
      disposeTree(old.group);
      old.dispose?.();
    }
    this._bumpers = set.bumpers || [];
  }

  // ============================================================
  // gimmicks: ice · conveyors · bumpers · glitch tiles · storm
  // ============================================================
  _setupGimmicks() {
    const f = this.features || {};
    const F = this.floorU;
    // ice
    this._ice = (f.ice || []).slice(0, 4);
    F.uIceN.value = this._ice.length;
    this._ice.forEach((c, i) => F.uIce.value[i].set(c.x, c.z, c.r, 0));
    // conveyors (axis-aligned rects: w along x, d along z)
    this._belts = (f.conveyors || []).slice(0, 2).map((b) => {
      const l = Math.hypot(b.dirX, b.dirZ) || 1;
      return { x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, dx: b.dirX / l, dz: b.dirZ / l, speed: b.speed };
    });
    F.uBeltN.value = this._belts.length;
    this._belts.forEach((b, i) => { F.uBelt.value[i].set(b.x, b.z, b.hw, b.hd); F.uBeltDir.value[i].set(b.dx, b.dz, b.speed, 0); });
    // glitch tiles — 6 hex sites on a ring around the centre (hero spawns in the middle)
    const gt = f.glitchTiles;
    this._tileCfg = gt || null;
    this._tiles = [];
    if (gt) {
      const n = Math.min(6, gt.count || 6), R = this.arenaRadius;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.PI / 6;
        const rr = R * 0.56;
        this._tiles.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, r: gt.radius || 2.2, state: 'idle', t: 0 });
      }
    }
    F.uTileN.value = this._tiles.length;
    this._writeTiles();
  }

  _resetGimmicks() {
    for (const t of this._tiles) { t.state = 'idle'; t.t = 0; }
    this._tileTimer = (this._tileCfg?.every ?? 7) * 0.6;
    this._lastTile = -1;
    this._writeTiles();
    this.setPlayRadius(this.arenaRadius, true);
    for (const b of this._bumpers) { b.sy = 1; b.v = 0; b.flash = 0; b.cool = 0; }
  }

  _writeTiles() {
    const F = this.floorU;
    this._tiles.forEach((t, i) => {
      let st = 0;
      if (t.state === 'warn') st = Math.min(0.999, 0.001 + t.t / (this._tileCfg.flicker || 1));
      else if (t.state === 'gone') st = 1.5;
      else if (t.state === 'back') st = 2 + Math.min(1, t.t / TUNE.tileBack);
      F.uTile.value[i].set(t.x, t.z, t.r, st);
    });
    this._set?.wells?.(this._tiles);
  }

  _updateTiles(dt) {
    const cfg = this._tileCfg;
    if (!cfg || !this._tiles.length) return;
    const playing = this.G.run?.state === 'playing';
    let dirty = false;
    for (const t of this._tiles) {
      if (t.state === 'idle') continue;
      t.t += dt; dirty = true;
      if (t.state === 'warn' && t.t >= (cfg.flicker || 1)) { t.state = 'gone'; t.t = 0; this.G.bus.emit('world:tile', { x: t.x, z: t.z, r: t.r, state: 'gone' }); }
      else if (t.state === 'gone' && t.t >= (cfg.gone || 3)) { t.state = 'back'; t.t = 0; this.G.bus.emit('world:tile', { x: t.x, z: t.z, r: t.r, state: 'back' }); }
      else if (t.state === 'back' && t.t >= TUNE.tileBack) { t.state = 'idle'; t.t = 0; }
    }
    if (playing) {
      this._tileTimer -= dt;
      if (this._tileTimer <= 0) {
        this._tileTimer = cfg.every || 7;
        const n = this.fever ? 2 : 1;
        for (let k = 0; k < n; k++) this._warnTile();
        dirty = true;
      }
    }
    if (dirty) this._writeTiles();
  }

  _warnTile() {
    const p = this.G.run?.player;
    let best = -1, bestW = -1;
    this._tiles.forEach((t, i) => {
      if (t.state !== 'idle' || i === this._lastTile) return;
      let w = 0.5 + Math.random();
      if (p && hexSdf(p.x - t.x, p.z - t.z, t.r + 0.8) < 0) w *= 0.15;   // fairness: rarely under the hero
      if (w > bestW) { bestW = w; best = i; }
    });
    if (best < 0) return;
    const t = this._tiles[best];
    t.state = 'warn'; t.t = 0; this._lastTile = best;
    this.G.bus.emit('world:tile', { x: t.x, z: t.z, r: t.r, state: 'warn' });
  }

  /** debug / scripted: force a glitch tile cycle now */
  triggerTile(i = -1) {
    if (!this._tiles.length) return;
    if (i < 0) this._warnTile();
    else if (this._tiles[i]) { this._tiles[i].state = 'warn'; this._tiles[i].t = 0; }
    this._writeTiles();
  }

  /** Shrink Storm / W6 finale: animated storm wall at radius r (r ≥ arenaRadius → none) */
  setPlayRadius(r, instant = false) {
    const R = this.arenaRadius;
    this._playTarget = clamp(r ?? R, 2, R);
    if (instant) { this.playRadius = this._playTarget; this.floorU.uPlayR.value = this.playRadius; }
  }

  // ---------- gameplay queries ----------
  frictionAt(x, z) {
    for (let i = 0; i < this._ice.length; i++) {
      const c = this._ice[i], dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r) return TUNE.iceFriction;
    }
    return 1;
  }

  pushAt(x, z, out = this._pushOut) {
    out.x = 0; out.z = 0;
    for (let i = 0; i < this._belts.length; i++) {
      const b = this._belts[i];
      if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd) { out.x += b.dx * b.speed; out.z += b.dz * b.speed; }
    }
    return out;
  }

  bumperHit(x, z, r = 0.5) {
    for (let i = 0; i < this._bumpers.length; i++) {
      const b = this._bumpers[i];
      const dx = x - b.x, dz = z - b.z, rr = b.r + r;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 1;
        b.hit.nx = d2 > 1e-8 ? dx / d : 1; b.hit.nz = d2 > 1e-8 ? dz / d : 0;
        if (b.cool <= 0) this.bumpFx(b);
        return b.hit;
      }
    }
    return null;
  }

  /** bounce + flash animation for a bumper (auto-called by bumperHit, with a short cooldown) */
  bumpFx(bumper, strength = 1) {
    const b = bumper?.bumper || bumper;
    if (!b || b.sy === undefined) return;
    b.v -= 7 * strength; b.flash = 1; b.cool = TUNE.bumperCooldown; b.ring = 0;
    this.G.bus.emit('world:bumper', { x: b.x, z: b.z });
  }

  solidAt(x, z) {
    for (let i = 0; i < this._tiles.length; i++) {
      const t = this._tiles[i];
      if ((t.state === 'gone' || t.state === 'back') && hexSdf(x - t.x, z - t.z, t.r - 0.2) < 0) return false;
    }
    return true;
  }

  // ============================================================
  // rim feedback
  // ============================================================
  pulseRim(color = 0xffffff, strength = 1) {
    this.rimU.uPulseCol.value.set(color);
    this._pulse = Math.max(this._pulse, clamp(strength, 0, 1));
    this._chase = 1.2;
  }

  setFever(on) {
    this.fever = !!on;
    if (on) { this.pulseRim(0xfff3b0, 1); this.rimJump(0.25); }
  }

  rimRipple(angle, strength = 0.2) {
    for (let i = 0; i < this._rimN; i++) {
      let d = Math.abs(this._rimA[i] - angle) % TAU; if (d > Math.PI) d = TAU - d;
      const k = Math.exp(-((d / 0.22) ** 2));
      if (k > 0.02) this._rimJV[i] += strength * k * 9;
    }
    this._rimActive = true;
  }

  rimJump(strength = 0.3) {
    for (let i = 0; i < this._rimN; i++) this._rimJV[i] += strength * 9 * (0.85 + 0.3 * Math.sin(i * 2.3));
    this._rimActive = true;
  }

  // ============================================================
  // update
  // ============================================================
  update(dt, rdt) {
    const G = this.G;
    this._t += rdt;
    const U = this.U;
    U.uTime.value = this._t;
    const beat = G.audio?.beat;
    U.uBeat.value = typeof beat === 'number' ? Math.pow(Math.max(0, 1 - beat * 2.2), 2) : 0;
    this._feverK = damp(this._feverK, this.fever ? 1 : 0, 3, rdt);
    U.uFever.value = this._feverK;

    // keep the dome centred on the camera ("infinitely far")
    this.sky.position.copy(G.camera.position);

    // point-sprite scale (px per world unit at distance 1)
    const h = G.renderer.domElement.height || 720;
    const sc = h / (2 * Math.tan(THREE.MathUtils.degToRad(G.camera.fov) / 2));
    this.sparkU.uScale.value = sc; this.thrustU.uScale.value = sc;
    if (this._set?.pointsU) this._set.pointsU.uScale.value = sc;

    // Endless / Storm arenas are bigger than the world default
    if (!this._radiusOverride) {
      const want = this._modeRadius();
      if (want && Math.abs(want - this.arenaRadius) > 1e-3) this.setArenaRadius(want);
    }

    // rim pulse / chase / ripple
    this._pulse = Math.max(0, this._pulse - rdt * 1.6);
    this.rimU.uPulse.value = this._pulse * this._pulse;
    this._chase = Math.max(0, (this._chase || 0) - rdt);
    this.rimU.uChase.value = Math.min(1, this._chase) + this._feverK * 0.6;
    if (this._rimActive) {
      let any = false;
      const k = 220, c = 11;
      for (let i = 0; i < this._rimN; i++) {
        const a = -k * this._rimJ[i] - c * this._rimJV[i];
        this._rimJV[i] += a * rdt;
        this._rimJ[i] = clamp(this._rimJ[i] + this._rimJV[i] * rdt, -0.2, 0.6);
        if (Math.abs(this._rimJ[i]) > 0.002 || Math.abs(this._rimJV[i]) > 0.02) any = true;
      }
      this._writeRim();
      this._rimActive = any;
    }

    // storm wall
    if (Math.abs(this.playRadius - this._playTarget) > 1e-3) {
      this.playRadius = damp(this.playRadius, this._playTarget, 2.2, dt > 0 ? dt : rdt * 0.5);
      if (Math.abs(this.playRadius - this._playTarget) < 0.01) this.playRadius = this._playTarget;
    }
    this.floorU.uPlayR.value = this.playRadius;
    const stormOn = this.playRadius < this.arenaRadius - 0.02;
    this._stormA = damp(this._stormA, stormOn ? 1 : 0, 4, rdt);
    this.storm.visible = this._stormA > 0.01;
    if (this.storm.visible) {
      this.storm.scale.set(this.playRadius, 2.4, this.playRadius);
      this.stormU.uAlpha.value = this._stormA;
    }

    // hero ground ring (§7.20) — run hero, or the hub pedestal
    const F = this.floorU;
    const pl = G.run?.player;
    if (this.heroRing && pl && G.run.state !== 'ended') {
      F.uHero.value.set(pl.x, pl.z, damp(F.uHero.value.z, pl.hp === 0 ? 0 : 1, 10, rdt), TUNE.heroRing.r * (pl.size || 1));
    } else if (this.heroRing && !G.run && (G.app?.state === 'hub' || G.app?.state === 'title')) {
      F.uHero.value.set(0, 0, damp(F.uHero.value.z, 0.85, 4, rdt), 1.05);
    } else {
      F.uHero.value.z = damp(F.uHero.value.z, 0, 8, rdt);
    }

    // gimmicks
    this._updateTiles(dt);
    for (const b of this._bumpers) {
      b.cool -= rdt;
      const a = -260 * (b.sy - 1) - 12 * b.v;
      b.v += a * rdt; b.sy += b.v * rdt;
      b.flash = Math.max(0, b.flash - rdt * 3);
      b.ring = Math.min(1.5, (b.ring ?? 1.5) + rdt * 2.2);
    }

    if (this._set?.props) this._set.props.visible = !!G.run;   // bumpers etc. only matter in a run (hub camera sits among them)
    this._set?.update?.(this._t, rdt, dt);
  }

  dispose() {
    this._offs?.forEach((off) => off());
    for (const s of this._sets.values()) { disposeTree(s.group); s.dispose?.(); }
    this._sets.clear();
    this.scene.remove(this.root);
    disposeTree(this.root);
  }
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { for (const k in m.uniforms || {}) { const v = m.uniforms[k]?.value; if (v && v.isTexture) v.dispose(); } m.dispose(); }
    }
  });
}

// ============================================================
// SET PIECES — one builder per world id. Each returns
//   { group, update(t, rdt, dt), dispose(), bumpers?, wells?(tiles), pointsU? }
// ============================================================
const SET_BUILDERS = {
  // ---------- W1 Cloud Harbor: cube houses, harbor lighthouse, blimps (+ rainbow in the sky)
  cloud(w, W) {
    const group = new THREE.Group();
    const rng = makeRng(101);
    const tops = w.islandTops.filter((t) => t.s > 2.2);
    // cube houses on the islands
    const houseGeo = rbox(0.16, 2);
    const roofGeo = new THREE.ConeGeometry(0.78, 0.62, 4, 1);
    roofGeo.rotateY(Math.PI / 4); roofGeo.translate(0, 0.31, 0);
    const n = Math.min(26, tops.length * 2);
    const houses = new THREE.InstancedMesh(houseGeo, w._decorMat({ bob: 0.45 }), n);
    const roofs = new THREE.InstancedMesh(roofGeo, w._decorMat({ bob: 0.45 }), n);
    houses.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    roofs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const walls = [0xfff6ea, 0xffe3ef, 0xe5f3ff, 0xfff2c9, 0xe9ffe9].map(col);
    const roofC = [0xff9ec4, 0x7fc4ff, 0xffc36b, 0xb39cff, 0x6fdcae].map(col);
    let k = 0;
    for (const t of tops) {
      const cnt = t.s > 4 ? 2 : 1;
      for (let j = 0; j < cnt && k < n; j++, k++) {
        const hs = Math.min(1.6, t.s * 0.28) * (0.8 + rng() * 0.4);
        const ox = (rng() - 0.5) * t.s * 0.5, oz = (rng() - 0.5) * t.s * 0.4;
        const ry = rng() * TAU;
        setMat(houses, k, t.x + ox, t.y + hs * 0.5, t.z + oz, hs, hs * (0.9 + rng() * 0.3), hs, 0, ry, 0);
        setMat(roofs, k, t.x + ox, t.y + hs * 0.95, t.z + oz, hs, hs * 0.9, hs, 0, ry, 0);
        const wc = walls[(rng() * walls.length) | 0], rc = roofC[(rng() * roofC.length) | 0];
        houses.instanceColor.setXYZ(k, wc.r, wc.g, wc.b);
        roofs.instanceColor.setXYZ(k, rc.r, rc.g, rc.b);
      }
    }
    houses.count = roofs.count = k;
    houses.frustumCulled = roofs.frustumCulled = false;
    group.add(houses, roofs);

    // harbor lighthouse on its own island (left of the hub view)
    const LX = -46, LY = 3, LZ = -62;
    const parts = [];
    const isl = roundedBoxGeometry(0.2, 3).clone(); paintByNormal(isl, 0x8fe38a, 0xf3d7a6, 0xcfa87e);
    parts.push({ geo: isl, matrix: M4(0, -1.6, 0, 11, 3.2, 9) });
    parts.push({ geo: roundedBoxGeometry(0.2, 3), color: 0xf3d7a6, matrix: M4(1.5, -4.2, 0.5, 6, 3, 5) });
    for (let s = 0; s < 6; s++) {
      const r0 = 1.55 - s * 0.1, r1 = 1.55 - (s + 1) * 0.1;
      parts.push({ geo: new THREE.CylinderGeometry(r1, r0, 1.2, 20), color: s % 2 ? 0xff9ec4 : 0xfffaf2, matrix: M4(0, 0.6 + s * 1.2, 0) });
    }
    parts.push({ geo: new THREE.CylinderGeometry(1.5, 1.5, 0.3, 24), color: 0x7fc4ff, matrix: M4(0, 7.35, 0) });
    parts.push({ geo: new THREE.ConeGeometry(1.2, 1.3, 20), color: 0xff9ec4, matrix: M4(0, 9.7, 0) });
    parts.push({ geo: roundedBoxGeometry(0.16, 2), color: 0xfff2c9, matrix: M4(3.2, 0.9, 1.4, 1.8, 1.8, 1.8) });
    parts.push({ geo: new THREE.ConeGeometry(1.35, 1.1, 4), color: 0x7fc4ff, matrix: M4(3.2, 2.35, 1.4, 1, 1, 1, 0, Math.PI / 4, 0) });
    const tower = new THREE.Mesh(mergeGeos(parts), w._decorMat({ vertexColors: true }));
    tower.position.set(LX, LY, LZ);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.4, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0a0).multiplyScalar(2.2), toneMapped: true }));
    lantern.position.set(0, 8.3, 0);
    tower.add(lantern);
    // rotating light beam (additive cone)
    const beamGeo = new THREE.ConeGeometry(2.2, 26, 24, 1, true);
    beamGeo.translate(0, -13, 0); beamGeo.rotateZ(Math.PI / 2);
    const beamU = { uGlowCol: { value: col(0xfff3b0) }, uTime: w.U.uTime, uGlowA: { value: 0.28 } };
    const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
      uniforms: beamU, vertexShader: UV_VS,
      fragmentShader: `uniform vec3 uGlowCol; uniform float uGlowA; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * uGlowA * (0.6 + 0.4 * sin(vUv.x * 6.2831)); gl_FragColor = vec4(uGlowCol * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    beam.position.set(0, 8.3, 0);
    tower.add(beam);
    group.add(tower);

    // blimps
    const bparts = [];
    const body = new THREE.SphereGeometry(1, 24, 16);
    // stripe the body via vertex colours
    const bc = new Float32Array(body.attributes.position.count * 3);
    const cA = col(0xfff6fb), cB = col(0x9fd4ff);
    for (let i = 0; i < body.attributes.position.count; i++) {
      const x = body.attributes.position.getX(i);
      const c = Math.abs(Math.sin(x * 5.0)) > 0.75 ? cB : cA;
      bc[i * 3] = c.r; bc[i * 3 + 1] = c.g; bc[i * 3 + 2] = c.b;
    }
    body.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    bparts.push({ geo: body, matrix: M4(0, 0, 0, 3.4, 1.35, 1.35) });
    bparts.push({ geo: roundedBoxGeometry(0.2, 2), color: 0xff9ec4, matrix: M4(-3.0, 0.9, 0, 1.2, 1.1, 0.14) });
    bparts.push({ geo: roundedBoxGeometry(0.2, 2), color: 0xff9ec4, matrix: M4(-3.0, 0, 0, 1.2, 0.14, 2.2) });
    bparts.push({ geo: roundedBoxGeometry(0.25, 2), color: 0xffe07a, matrix: M4(0.3, -1.45, 0, 1.4, 0.55, 0.7) });
    const blimpGeo = mergeGeos(bparts);
    const blimps = new THREE.InstancedMesh(blimpGeo, w._decorMat({ vertexColors: true }), 3);
    blimps.frustumCulled = false;
    group.add(blimps);
    const paths = [{ r: 52, y: 16, sp: 0.045, ph: 1.2 }, { r: 78, y: 26, sp: -0.03, ph: 3.8 }, { r: 34, y: -12, sp: 0.06, ph: 0.2 }];

    return {
      group,
      update(t) {
        beam.rotation.y = t * 0.9;
        for (let i = 0; i < paths.length; i++) {
          const p = paths[i], a = p.ph + t * p.sp;
          const x = Math.cos(a) * p.r, z = Math.sin(a) * p.r - 20;
          const dir = p.sp > 0 ? 1 : -1;
          setMat(blimps, i, x, p.y + Math.sin(t * 0.6 + i) * 0.8, z, 1, 1, 1, 0, -a - (Math.PI / 2) * dir, Math.sin(t * 0.4 + i) * 0.05);
        }
        blimps.instanceMatrix.needsUpdate = true;
      },
      dispose() {},
    };
  },

  // ---------- W2 Neon Ring: ring highway with light-cycles, neon posts, holo billboards, BUMPERS
  neon(w, W) {
    const group = new THREE.Group();
    const R = w.arenaRadius;
    const P = W.palette;
    // ring highway around the island
    const roadIn = R + 5.5, roadOut = R + 15;
    const rg = new THREE.RingGeometry(roadIn, roadOut, 160, 3);
    rg.rotateX(-Math.PI / 2);
    const roadU = { ...fogUniforms(), uRoad: { value: col(0x3a2a7a) }, uLineA: { value: col(P.grid) }, uLineB: { value: col(P.rim) }, uTime: w.U.uTime, uIn: { value: roadIn }, uOut: { value: roadOut }, uFever: w.U.uFever };
    const road = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: roadU, vertexShader: ROAD_VS, fragmentShader: ROAD_FS, fog: true }));
    road.position.y = -3.2;
    road.rotation.z = 0.04;
    group.add(road);
    // neon posts outside the rim (short so they never hide the play field)
    const nPosts = 14;
    const postGeo = rbox(0.2, 2);
    const posts = new THREE.InstancedMesh(postGeo, w._decorMat({ kind: 'NEON', body: 0xe9e4ff }), nPosts);
    posts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nPosts * 3), 3);
    const pc = [col(P.grid), col(P.rim)];
    for (let i = 0; i < nPosts; i++) {
      const a = (i / nPosts) * TAU + 0.11;
      const rr = R + 2.4;
      setMat(posts, i, Math.cos(a) * rr, 0.95, Math.sin(a) * rr, 0.42, 1.9, 0.42, 0, -a, 0);
      const c = pc[i % 2]; posts.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    posts.frustumCulled = false;
    group.add(posts);
    // holographic billboards (hub backdrop)
    const tex = holoTexture();
    const holoU = { uMap: { value: tex }, uHoloA: { value: col(0x7ff6ff) }, uTime: w.U.uTime };
    const holoMat = new THREE.ShaderMaterial({ uniforms: holoU, vertexShader: UV_VS, fragmentShader: HOLO_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const boards = [[-34, 9, -52, 0.55], [38, 13, -58, -0.5]].map(([x, y, z, ry]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), holoMat);
      m.position.set(x, y, z); m.rotation.y = ry;
      group.add(m);
      return m;
    });
    // bumper pillars (gameplay props: hidden in the hub)
    const props = new THREE.Group();
    group.add(props);
    const bumpers = buildBumpers(w, props, W.features?.bumpers || [], col(P.accent), col(P.rim));
    return {
      group, props, bumpers: bumpers.list,
      update(t, rdt) {
        boards.forEach((b, i) => { b.position.y += Math.sin(t * 0.8 + i) * 0.004; });
        bumpers.update(t, rdt);
      },
      dispose() { tex.dispose(); },
    };
  },

  // ---------- W3 Crystal Moon: crystal spires, aurora (ice patches live in the floor shader)
  crystal(w, W) {
    const group = new THREE.Group();
    const R = w.arenaRadius;
    const rng = makeRng(303);
    const prism = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);
    const tip = new THREE.ConeGeometry(0.5, 0.7, 6, 1);
    tip.translate(0, 0.85, 0);
    const cgeo = mergeGeos([{ geo: prism, color: 0xffffff }, { geo: tip, color: 0xffffff }]);
    cgeo.computeVertexNormals();
    const n = w.low ? 34 : 60;
    const spires = new THREE.InstancedMesh(cgeo, w._decorMat({ kind: 'CRYSTAL' }), n);
    spires.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const cc = [0x7fe3ff, 0xb3a0ff, 0x6fd0ff, 0xffa8e6, 0x7affd8].map(col);
    for (let i = 0; i < n; i++) {
      let x, y, z, s, h;
      if (i < n * 0.4) { // clusters just outside the rim (short)
        const a = rng() * TAU, r = R + 2.3 + rng() * 3;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = -0.6; s = 0.5 + rng() * 0.5; h = 1 + rng() * 1.6;
      } else if (i < n * 0.75) { // rising from the mist below (tips stay under the arena)
        const a = rng() * TAU, r = R + 9 + rng() * 40;
        x = Math.cos(a) * r; z = Math.sin(a) * r; h = 5 + rng() * 9; y = -6 - h - rng() * 8; s = 1.2 + rng() * 1.8;
      } else { // tall spires on the horizon (hub)
        const a = -Math.PI / 2 + (rng() - 0.5) * 2.4, r = 70 + rng() * 90;
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = -18; s = 3 + rng() * 4; h = 20 + rng() * 32;
      }
      setMat(spires, i, x, y + h * 0.5, z, s, h, s, (rng() - 0.5) * 0.35, rng() * TAU, (rng() - 0.5) * 0.35);
      const c = cc[(rng() * cc.length) | 0]; spires.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    spires.frustumCulled = false;
    group.add(spires);
    const aurora = buildAurora(w, 0x7cffb2, 0xff8ad8);
    group.add(aurora);
    return { group, update() {}, dispose() { prism.dispose(); tip.dispose(); } };
  },

  // ---------- W4 Bomb Nebula: firework bursts + candy planetoids (nebula = sky + glowing cloud puffs)
  nebula(w, W) {
    const group = new THREE.Group();
    const rng = makeRng(404);
    const per = 42, bursts = w.low ? 5 : 9, n = per * bursts;
    const g = new THREE.BufferGeometry();
    const aB = new Float32Array(n * 4), aD = new Float32Array(n * 4), aC = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aBurst', new THREE.BufferAttribute(aB, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aDir', new THREE.BufferAttribute(aD, 4));
    g.setAttribute('aCol', new THREE.BufferAttribute(aC, 3).setUsage(THREE.DynamicDrawUsage));
    for (let i = 0; i < n; i++) {
      _v.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
      aD.set([_v.x, _v.y, _v.z, 7 + rng() * 5], i * 4);
      aB[i * 4 + 3] = -100;
    }
    const pointsU = { uTime: w.U.uTime, uScale: { value: 400 } };
    const fw = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: pointsU, vertexShader: FIREWORK_VS, fragmentShader: FIREWORK_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    fw.frustumCulled = false;
    group.add(fw);
    const palette = [0xffe14d, 0x7ff6ff, 0xff8ad8, 0xb39cff, 0x9fffd8, 0xffc36b].map(col);
    let next = 0, bi = 0;
    // candy planetoids
    const pn = 9;
    const ball = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), w._decorMat({ kind: 'STRIPES', bob: 0.8 }), pn);
    ball.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pn * 3), 3);
    for (let i = 0; i < pn; i++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 3.6, r = 40 + rng() * 80, s = 2 + rng() * 5;
      setMat(ball, i, Math.cos(a) * r, -10 + rng() * 36, Math.sin(a) * r, s, s, s, rng(), rng() * 3, rng());
      const c = palette[i % palette.length]; ball.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    ball.frustumCulled = false;
    group.add(ball);
    return {
      group, pointsU,
      update(t) {
        if (t >= next) {
          next = t + 0.45 + rng() * 0.9;
          const a = rng() * TAU, r = 45 + rng() * 110;
          const cx = Math.cos(a) * r, cz = Math.sin(a) * r - 25, cy = -14 + rng() * 45;
          const c1 = palette[(rng() * palette.length) | 0], c2 = palette[(rng() * palette.length) | 0];
          for (let i = bi * per; i < (bi + 1) * per; i++) {
            aB[i * 4] = cx; aB[i * 4 + 1] = cy; aB[i * 4 + 2] = cz; aB[i * 4 + 3] = t;
            const c = i % 3 ? c1 : c2; aC[i * 3] = c.r; aC[i * 3 + 1] = c.g; aC[i * 3 + 2] = c.b;
          }
          bi = (bi + 1) % bursts;
          g.attributes.aBurst.needsUpdate = true; g.attributes.aCol.needsUpdate = true;
        }
      },
      dispose() {},
    };
  },

  // ---------- W5 Laser Foundry: factory towers, rotating gears, orbit rings (conveyors in the floor shader)
  foundry(w, W) {
    const group = new THREE.Group();
    const R = w.arenaRadius;
    const P = W.palette;
    const rng = makeRng(505);
    const n = w.low ? 30 : 52;
    const towers = new THREE.InstancedMesh(rbox(0.08, 2), w._decorMat({ kind: 'WINDOWS', accent: P.accent, accent2: 0xffd08a }), n);
    towers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const tc = [0xdce8f0, 0xc8d8e6, 0xe6eef6, 0xb8c9da].map(col);
    for (let i = 0; i < n; i++) {
      let x, z, top, wdt, dep;
      if (i < n * 0.55) { const a = rng() * TAU, r = R + 7 + rng() * 34; x = Math.cos(a) * r; z = Math.sin(a) * r; top = -3 - rng() * 12; }
      else { const a = -Math.PI / 2 + (rng() - 0.5) * 2.8, r = 60 + rng() * 100; x = Math.cos(a) * r; z = Math.sin(a) * r; top = 4 + rng() * 34; }
      wdt = 2.5 + rng() * 5; dep = 2.5 + rng() * 5;
      const bottom = -70, h = top - bottom;
      setMat(towers, i, x, bottom + h / 2, z, wdt, h, dep, 0, rng() * 0.3, 0);
      const c = tc[(rng() * tc.length) | 0]; towers.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    towers.frustumCulled = false;
    group.add(towers);
    // gears
    const gearGeo = gearGeometry(16, 1, 0.84, 0.3, 0.26);
    const gearMat = w._decorMat({ kind: 'GEAR', body: 0x9fb2c6 });
    const gears = new THREE.InstancedMesh(gearGeo, gearMat, 3);
    gears.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(9), 3);
    const gc = col(P.accent);
    for (let i = 0; i < 3; i++) gears.instanceColor.setXYZ(i, gc.r, gc.g, gc.b);
    gears.frustumCulled = false;
    group.add(gears);
    const gearDefs = [
      { x: 30, y: 16, z: -70, s: 16, rx: 0, sp: 0.15 },
      { x: -R - 9, y: -6, z: -6, s: 6, rx: Math.PI / 2, sp: -0.4 },
      { x: R + 11, y: -8, z: 5, s: 8, rx: Math.PI / 2, sp: 0.3 },
    ];
    // glowing orbit rings below the arena
    const ringGeo = new THREE.TorusGeometry(1, 0.012, 6, 160);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uGlowCol: { value: col(P.accent).multiplyScalar(1) }, uTime: w.U.uTime, uGlowA: { value: 1 } },
      vertexShader: UV_VS,
      fragmentShader: `uniform vec3 uGlowCol; uniform float uTime; varying vec2 vUv; void main(){ float d = step(0.5, fract(vUv.x * 40.0 - uTime * 0.8)); gl_FragColor = vec4(uGlowCol * (1.2 + 1.6 * d), 1.0); }`,
    });
    const rings = [R + 5, R + 9].map((rr, i) => { const m = new THREE.Mesh(ringGeo, ringMat); m.scale.setScalar(rr); m.position.y = -2.2 - i * 3; group.add(m); return m; });
    return {
      group,
      update(t) {
        gearDefs.forEach((g, i) => setMat(gears, i, g.x, g.y, g.z, g.s, g.s, g.s, g.rx, 0, t * g.sp));
        gears.instanceMatrix.needsUpdate = true;
        rings[0].rotation.y = t * 0.1; rings[1].rotation.y = -t * 0.07;
      },
      dispose() {},
    };
  },

  // ---------- W6 Glitch Core: pulsing core star below, glitch shards, void wells for vanished tiles
  core(w, W) {
    const group = new THREE.Group();
    const P = W.palette;
    const rng = makeRng(606);
    // pulsing core star far below the arena (top of the gameplay view)
    const starU = { uGlowCol: { value: col(P.accent) }, uTime: w.U.uTime, uGlowA: { value: 1 } };
    const star = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 24), new THREE.ShaderMaterial({
      uniforms: { ...starU, uP1: { value: col(0xff3df2) }, uP2: { value: col(0x8a5cff) } },
      vertexShader: PLANET_VS,
      fragmentShader: `uniform vec3 uP1, uP2; uniform float uTime; varying vec3 vN; varying vec3 vO; varying vec3 vW; ${GLSL_COMMON}
        void main(){ vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.0);
          float n = vnoise3(vO * 0.12 + vec3(0.0, uTime * 0.25, 0.0)) * 0.6 + vnoise3(vO * 0.35 - uTime * 0.3) * 0.4;
          float pulse = 0.8 + 0.2 * sin(uTime * 2.4);
          vec3 c = mix(uP2, uP1, n) * (1.3 + fr * 1.8) * pulse + vec3(1.0) * pow(1.0 - fr, 6.0) * 0.6;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    star.position.set(0, -150, -175);
    group.add(star);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: starU, vertexShader: UV_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.setScalar(190);
    glow.position.copy(star.position);
    group.add(glow);
    // glitch shards floating around
    const n = w.low ? 24 : 44;
    const shards = new THREE.InstancedMesh(rbox(0.12, 2), w._decorMat({ kind: 'SHARD', body: 0x3a2a70 }), n);
    shards.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const sc = [0xff3df2, 0x39e6ff, 0xa6f8ff, 0xfff3b0].map(col);
    const sdefs = [];
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, r = i < n / 3 ? w.arenaRadius + 4 + rng() * 10 : 25 + rng() * 80;
      const d = { x: Math.cos(a) * r, y: i < n / 3 ? -6 - rng() * 8 : -30 + rng() * 55, z: Math.sin(a) * r, s: 0.6 + rng() * (i < n / 3 ? 1.2 : 4), rx: rng() * 3, ry: rng() * 3, sp: (rng() - 0.5) * 0.8 };
      sdefs.push(d);
      const c = sc[(rng() * sc.length) | 0]; shards.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    shards.frustumCulled = false;
    group.add(shards);
    // void wells under the glitch tiles (hex tubes, visible only while a tile is gone)
    const wellGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true, Math.PI / 2);
    wellGeo.translate(0, -0.5, 0);
    const wells = new THREE.InstancedMesh(wellGeo, new THREE.ShaderMaterial({
      uniforms: { uGlitch: { value: col(P.accent) }, uVoid: { value: col(0x0d0620) }, uTime: w.U.uTime },
      vertexShader: UV_VS_INST, fragmentShader: WELL_FS, side: THREE.BackSide,
    }), 6);
    wells.frustumCulled = false;
    wells.count = 0;
    group.add(wells);
    const wellK = new Float32Array(6);
    let glitchT = 0;
    return {
      group,
      wells(tiles) {
        wells.count = tiles.length;
        tiles.forEach((t, i) => { wellK[i] = t.state === 'gone' || t.state === 'back' ? 1 : 0; });
      },
      update(t, rdt) {
        glow.quaternion.copy(w.G.camera.quaternion);
        glitchT -= rdt;
        const jump = glitchT <= 0;
        if (jump) glitchT = 0.12 + rng() * 0.3;
        for (let i = 0; i < n; i++) {
          const d = sdefs[i];
          if (jump && rng() < 0.08) { d.jx = (rng() - 0.5) * 1.6; d.jy = (rng() - 0.5) * 1.2; } else if (jump) { d.jx = 0; d.jy = 0; }
          setMat(shards, i, d.x + (d.jx || 0), d.y + Math.sin(t * 0.7 + i) * 0.6 + (d.jy || 0), d.z, d.s, d.s * 0.7, d.s * 0.5, d.rx + t * d.sp, d.ry + t * d.sp * 0.7, 0);
        }
        shards.instanceMatrix.needsUpdate = true;
        const tl = w._tiles;
        for (let i = 0; i < tl.length && i < 6; i++) {
          const target = wellK[i] ? 1 : 0;
          const cur = wells.userData['k' + i] ?? 0;
          const nk = damp(cur, target, 10, rdt);
          wells.userData['k' + i] = nk;
          const rr = tl[i].r / 0.8660254;
          setMat(wells, i, tl[i].x, 0.001, tl[i].z, nk > 0.01 ? rr : 0.0001, Math.max(0.0001, nk * 6), nk > 0.01 ? rr : 0.0001);
        }
        wells.instanceMatrix.needsUpdate = true;
      },
      dispose() {},
    };
  },
};

function buildBumpers(w, group, defs, accent, rimCol) {
  const prof = [[0, 0], [1.0, 0], [1.06, 0.08], [1.06, 0.3], [0.94, 0.4], [0.94, 0.86], [1.06, 0.96], [1.06, 1.14], [0.92, 1.28], [0.55, 1.4], [0, 1.43]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const bmat = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms(), ...w.U, uA: { value: accent }, uB: { value: rimCol }, uBody: { value: col(0xf4f0ff) } },
    defines: { EMIT_ATTR: '' },
    vertexShader: DECOR_VS,
    fragmentShader: /* glsl */`
      uniform vec3 uA, uB, uBody; uniform float uTime, uBeat;
      varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec3 vObj; varying float vEmit;
      #include <fog_pars_fragment>
      ${GLSL_LIGHT}
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        vec3 c = softLit(uBody, N, V);
        float y = vObj.y;
        float b1 = smoothstep(0.3, 0.33, y) * (1.0 - smoothstep(0.4, 0.43, y));
        float b2 = smoothstep(0.86, 0.89, y) * (1.0 - smoothstep(0.96, 0.99, y));
        float cap = smoothstep(1.25, 1.3, y);
        c = mix(c, uA * (1.5 + vEmit * 2.5), b1 + b2);
        c = mix(c, uB * (1.15 + vEmit * 2.5 + uBeat * 0.3), cap);
        c += vec3(1.0) * vEmit * 0.4;
        gl_FragColor = vec4(c, 1.0);
        ${OUT_FRAG}
      }`,
    fog: true,
  });
  const n = Math.max(1, defs.length);
  const emit = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  emit.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aEmit', emit);
  const mesh = new THREE.InstancedMesh(geo, bmat, n);
  mesh.count = defs.length;
  mesh.frustumCulled = false;
  group.add(mesh);
  // expanding floor ring on hit
  const rgeo = new THREE.RingGeometry(0.86, 1, 48); rgeo.rotateX(-Math.PI / 2);
  const rmat = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const rings = defs.map(() => { const m = new THREE.Mesh(rgeo, rmat.clone()); m.position.y = 0.03; m.visible = false; group.add(m); return m; });
  const list = defs.map((d) => {
    const b = { x: d.x, z: d.z, r: d.r, sy: 1, v: 0, flash: 0, cool: 0, ring: 1.5 };
    b.hit = { nx: 0, nz: 0, bumper: b };
    return b;
  });
  return {
    list,
    update() {
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const sy = clamp(b.sy, 0.6, 1.4), sxz = 1 + (1 - sy) * 0.55;
        setMat(mesh, i, b.x, 0, b.z, b.r * sxz, sy * 1.15, b.r * sxz);
        emit.setX(i, b.flash);
        const rg = rings[i];
        rg.visible = b.ring < 1.2;
        if (rg.visible) { const s = b.r * (1 + b.ring * 2.2); rg.scale.set(s, 1, s); rg.material.opacity = 1 - b.ring / 1.2; }
      }
      mesh.instanceMatrix.needsUpdate = true;
      emit.needsUpdate = true;
    },
  };
}

function buildAurora(w, cA, cB) {
  const ribbons = [];
  const rng = makeRng(313);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(1, 1, 80, 1);
    const pos = g.attributes.position;
    const R = 330 + i * 60, span = 1.3 + rng() * 0.4, a0 = -Math.PI / 2 - span / 2 + (rng() - 0.5) * 0.6;
    const y0 = 70 + i * 25, hgt = 60 + rng() * 30;
    for (let k = 0; k < pos.count; k++) {
      const u = pos.getX(k) + 0.5, v = pos.getY(k) + 0.5;
      const a = a0 + u * span;
      pos.setXYZ(k, Math.cos(a) * R, y0 + v * hgt + Math.sin(u * 7 + i) * 12, Math.sin(a) * R);
    }
    g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(pos.count).fill(i * 1.7), 1));
    ribbons.push(g);
  }
  const geo = new THREE.BufferGeometry();
  const tot = ribbons.reduce((s, g) => s + g.index.count, 0);
  const vtot = ribbons.reduce((s, g) => s + g.attributes.position.count, 0);
  const P = new Float32Array(vtot * 3), UVa = new Float32Array(vtot * 2), PH = new Float32Array(vtot), I = new Uint32Array(tot);
  let vo = 0, io = 0;
  for (const g of ribbons) {
    P.set(g.attributes.position.array, vo * 3); UVa.set(g.attributes.uv.array, vo * 2); PH.set(g.attributes.aPhase.array, vo);
    for (let k = 0; k < g.index.count; k++) I[io + k] = g.index.array[k] + vo;
    vo += g.attributes.position.count; io += g.index.count;
    g.dispose();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(UVa, 2));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(PH, 1));
  geo.setIndex(new THREE.BufferAttribute(I, 1));
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uA: { value: col(cA) }, uB: { value: col(cB) }, uTime: w.U.uTime },
    vertexShader: AURORA_VS, fragmentShader: AURORA_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  mesh.frustumCulled = false;
  return mesh;
}

function gearGeometry(teeth, rOut, rIn, rHole, depth) {
  const s = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const r = (i % 4 === 1 || i % 4 === 2) ? rOut : rIn;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, rHole, 0, TAU, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  // local y is "up" for the NEON cap test: make the rim teeth glow by mapping radius → y in a copy attr? keep simple:
  return g;
}

function holoTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(160,255,255,0.95)'; g.lineWidth = 6;
  roundRect(g, 14, 14, 228, 228, 26); g.stroke();
  // Blu-style cube face
  g.fillStyle = 'rgba(90,190,255,0.9)'; roundRect(g, 62, 44, 132, 132, 30); g.fill();
  g.fillStyle = 'rgba(10,20,60,1)';
  g.beginPath(); g.ellipse(104, 104, 11, 16, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(152, 104, 11, 16, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(100, 97, 4, 0, TAU); g.arc(148, 97, 4, 0, TAU); g.fill();
  g.fillStyle = 'rgba(80,10,40,1)'; g.beginPath(); g.ellipse(128, 138, 16, 12, 0, 0, Math.PI); g.fill();
  g.fillStyle = 'rgba(255,160,220,1)'; g.font = '900 30px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('CUBE DASH', 128, 218);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
