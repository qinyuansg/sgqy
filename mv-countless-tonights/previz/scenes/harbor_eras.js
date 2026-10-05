// harbor_eras — LOC_HARBOR · the fictional harbour city and its old customs house (关栈 / today the museum).
// Shots: S018 (CH1 "千年啊" scale opens: outside the lab's lit arched window → heavy-lift rise + pull-back over the quay and
//        the hillside city of countless lit windows → the veiled moon, cut on motion into S019's sky) ·
//        S046 (BR1 "换旗换誓言／旧梦换了衣冠": ONE locked 40 mm frame on the quay road west of the customs house looking east,
//        four eras hard-cut on the beat — E1 c.1630s timber godown + stockade gate + lantern, E2 c.1890s new customs house,
//        E3 c.1930s awning + wires + the MIGRANT with her case, E4 c.1950s repaint + bars; same dusk, same light direction,
//        the waiting person always on the spot (0.38, 0.70)) ·
//        S080 (TAIL: the same locked frame today at dawn, E5 — museum, bare flagpole, the east-end light still on, the spot
//        empty and lit by daylight, three or four fishing lamps still burning on the sea).
//
// SET SPACE (metres, Y up; all set geometry lives in `setRoot`): +X = east, −Z = north, +Z = south (harbour). Quay level y = 0,
// water y = SEA_Y. Customs house X 0…64, Z −22…0 (south facade on Z = 0 faces the harbour), quay edge Z = QUAY_Z, hillside
// city to the north. `setRoot` is rotated about Y by THETA so that S018's end frame shows the moon in the very same WORLD
// direction as old_home's S019 (moon glow at frame (0.80, 0.14)) → sky.js clouds / moon of the match cut are the same plate.
// The sky dome and the sea are world-space; every azimuth given to them is converted with azW() below.
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { createSea, createCoast } from '../lib/sea.js';
import { envTexture } from '../lib/env.js';
import { loadCharacter, makeExtra, preloadCrowd, makeCrowd, preloadCharacters, makeCharacter } from '../lib/cast.js';

const D2R = Math.PI / 180;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SEA_Y = -2.2, QUAY_Z = 28;
const CH = { x0: 0, x1: 64, z0: -22, z1: 0, plinth: 0.9, gf: 5.2, sc: 5.5, uf: 10.6, corn: 11.3 };
// S046 era cuts (director ruling): E1 148.67–149.21 · E2 –149.66 (言) · E3 –150.80 (MIGRANT, 27 f) · E4 –151.62 (衣)
const CUT_E2 = 3581, CUT_E3 = 3592, CUT_E4 = 3619;
// old_home S019 camera (scenes/old_home.js CAM19) — the moon direction of the shared sky plate B is derived from it
const CAM19 = { pos: [-13.0, 1.15, 0.4], target: [-3.2, 0.85, 4.2], mm: 32 };
const SKY18 = { preset: 'night', moonSize: 0.0105, moonIntensity: 3.2, moonHalo: 0.45, stars: 0.35, cloudCover: 0.58, cloudDensity: 0.88, cloudScale: 0.085, wind: [-0.0035, 0.0008], exposure: 1.0 };

export default async function create(ctx) {
  const { cam, util } = ctx;
  const { clamp, lerp, smoothstep, ease } = util;
  const Q = new URLSearchParams(location.search);
  const DBG = Q.get('he') || 'dev';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 1.0, 9000);
  camera.userData.H = ctx.H;
  const setRoot = new THREE.Group(); setRoot.name = 'setRoot'; scene.add(setRoot);

  // ================================================================ small helpers
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; (parent || setRoot).add(m); return m; };
  // planar UVs in metres (dominant normal axis) — every tiling texture is sized by its repeat = 1 / tile (m)
  function metreUV(g) {
    const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ay >= ax && ay >= az) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); }
      else if (ax >= az) { uv[i * 2] = p.getZ(i); uv[i * 2 + 1] = p.getY(i); }
      else { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
  }
  const box = (w, h, d, mat, parent, x, y, z, cast = true) => mesh(metreUV(new THREE.BoxGeometry(w, h, d).translate(x, y, z)), mat, parent, 0, 0, 0, cast);
  const boxR = (w, h, d, mat, parent, x, y, z, rx = 0, ry = 0, rz = 0, cast = true) => { const m = mesh(metreUV(new THREE.BoxGeometry(w, h, d)), mat, parent, x, y, z, cast); m.rotation.set(rx, ry, rz); return m; };
  const cyl = (r0, r1, h, mat, parent, x, y, z, seg = 10, cast = true) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat, parent, x, y, z, cast);
  const group = (parent, name) => { const g = new THREE.Group(); if (name) g.name = name; (parent || setRoot).add(g); return g; };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctex = (c, srgb = true, wrap = false) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const M4 = (x, y, z, ry = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(sx, sy, sz));
  function instanced(geo, mat, mats, parent, cast = true) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, mats.length)); mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.count = mats.length; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true; (parent || setRoot).add(im); return im;
  }
  function archPath(cx, w, y0, yTop, P = new THREE.Path()) {
    const r = w / 2, ys = yTop - r; P.moveTo(cx - r, y0); P.lineTo(cx + r, y0); P.lineTo(cx + r, ys); P.absarc(cx, ys, r, 0, Math.PI, false); P.lineTo(cx - r, y0); return P;
  }
  function archShape(w, h) { return archPath(0, w, 0, h, new THREE.Shape()); }
  function archPlane(w, h) { // arch-shaped plane, uv 0..1 over its bounding box
    const g = new THREE.ShapeGeometry(archShape(w, h), 16), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h); return g;
  }
  function wall(len, y0, y1, holes, depth = 0.6) {
    const s = new THREE.Shape(); s.moveTo(0, y0); s.lineTo(len, y0); s.lineTo(len, y1); s.lineTo(0, y1); s.lineTo(0, y0);
    for (const h of holes) s.holes.push(h);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  }
  const rngB = util.rng(4711);

  // ================================================================ layout solve (set space)
  const tc = new THREE.PerspectiveCamera(30, ctx.aspect, 0.5, 9000);
  function orient(c, pos, yawDeg, pitchDeg, mm) {
    cam.lens(c, mm); const y = yawDeg * D2R, p = pitchDeg * D2R;
    c.position.copy(pos); c.up.set(0, 1, 0);
    c.lookAt(pos.x + Math.sin(y) * Math.cos(p), pos.y + Math.sin(p), pos.z - Math.cos(y) * Math.cos(p)); c.updateMatrixWorld(true); return c;
  }
  const rayOf = (c, sx, sy) => V3(2 * sx - 1, 1 - 2 * sy, 0.5).unproject(c).sub(c.position).normalize();
  const projOf = (c, p) => { const v = p.clone().project(c); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
  const hitY = (c, sx, sy, y) => { const d = rayOf(c, sx, sy); return c.position.clone().addScaledVector(d, (y - c.position.y) / d.y); };
  const hitX = (c, sx, sy, x) => { const d = rayOf(c, sx, sy); return c.position.clone().addScaledVector(d, (x - c.position.x) / d.x); };
  function bisect(f, a, b, n = 48) { let fa = f(a); for (let i = 0; i < n; i++) { const m = (a + b) / 2, fm = f(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }

  // ---- S046 / S080 locked camera (LOC_HARBOR lock: 40 mm, lens 1.6 m, looking east along the waterfront)
  // yaw 95°: looking east along the waterfront, 5° toward the harbour mouth (SE) so the customs house's far end, its corner
  // flagpole and the east-end light clear the gate's left pier (the shot list's (0.30, 0.38) light point would sit behind it)
  const C46 = { pos: V3(-60, 1.6, 22), yaw: 95, pitch: -Math.atan(0.08 * Math.tan(Math.atan(36 / ctx.aspect / 2 / 40))) / D2R, mm: 40 }; // horizon at y 0.46
  const BAYP = V3(58, 7.4, -0.28);                   // E5: the east-end light (bay lamp seen through the last glazed arch)
  C46.pos.z = bisect((z) => { orient(tc, V3(C46.pos.x, 1.6, z), C46.yaw, C46.pitch, 40); return projOf(tc, BAYP)[0] - 0.235; }, 4, 60);
  orient(tc, C46.pos, C46.yaw, C46.pitch, C46.mm);
  const TH = hitY(tc, 0.38, 0.66, 0.13);          // threshold front (camera-side) edge, top of the sill
  const SPOT = hitY(tc, 0.38, 0.70, 0.0);         // the waiting spot (feet)
  const GX = TH.x + 0.25, GZ = TH.z;               // gate line (centre of the sill) / gate axis
  const LANT = hitX(tc, 0.40, 0.46, GX - 0.18);    // E1 hand-lantern flame (light-point match to S045's shore light)
  const D46 = C46.pos.distanceTo(SPOT);

  // ---- S018 (moon lock with old_home S019, then the aerial path)
  const moonW = (() => { const c = new THREE.PerspectiveCamera(30, 2.39, 0.1, 100); cam.lens(c, CAM19.mm); cam.place(c, CAM19.pos, CAM19.target); c.updateMatrixWorld(true); return V3(0.6, 0.72, 0.5).unproject(c).sub(c.position).normalize(); })();
  const MOON_EL = Math.asin(moonW.y) / D2R, MOON_AZW = Math.atan2(moonW.x, -moonW.z) / D2R;
  const W18 = V3(58, 3.4, 0.0);                    // the lab window (centre of the arched sash)
  const S18 = { mm: 28, yaw: 0 };
  S18.pitch1 = bisect((p) => { orient(tc, V3(0, 30, 100), 0, p, 28); return Math.asin(rayOf(tc, 0.80, 0.14).y) / D2R - MOON_EL; }, -20, 20);
  S18.p1 = (() => { orient(tc, V3(0, 30, 100), 0, S18.pitch1, 28); const d = rayOf(tc, 0.44, 0.88); return W18.clone().addScaledVector(d, -(W18.y - 30) / d.y); })();
  S18.pitch0 = bisect((p) => { orient(tc, V3(0, 3, 40), 0, p, 28); const d = rayOf(tc, 0.42, 0.46); const t0 = 3.2 / (0.14 * 2 * Math.tan(tc.fov * D2R / 2)); return (W18.y - t0 * d.y) - 3.0; }, -20, 20);
  S18.p0 = (() => { orient(tc, V3(0, 3, 40), 0, S18.pitch0, 28); const d = rayOf(tc, 0.42, 0.46); const t0 = 3.2 / (0.14 * 2 * Math.tan(tc.fov * D2R / 2)); return W18.clone().addScaledVector(d, -t0); })();
  orient(tc, S18.p1, 0, S18.pitch1, 28);
  const moonSet = rayOf(tc, 0.80, 0.14);
  const THETA = Math.atan2(moonSet.x, -moonSet.z) - MOON_AZW * D2R;   // world az = set az − THETA
  setRoot.rotation.y = THETA; setRoot.updateMatrixWorld(true);
  const azW = (azSetDeg) => azSetDeg - THETA / D2R;
  if (DBG) console.warn('harbor layout', JSON.stringify({ C46: C46.pos, pitch46: C46.pitch, TH, SPOT, LANT, D46, MOON_EL, MOON_AZW, p0: S18.p0, p1: S18.p1, pitch0: S18.pitch0, pitch1: S18.pitch1, THETA: THETA / D2R }));

  // ================================================================ sky, sea, environment
  // dusk just after sunset, looking EAST: deep blue (P02 → P03 toward the horizon), a faint mauve-rose band low down
  // (anti-twilight) and a few high clouds catching the last pink; the sun itself is behind camera (set WSW)
  const SKY46 = { preset: 'dusk', zenith: ['#14274a', 1.0], horizon: ['#3c5479', 0.86], haze: ['#8a7a92', 0.5], hazeAmt: 0.42, ground: ['#0c1220', 0.3],
    sunAz: azW(262), sunElev: -4, sunColor: ['#d89a7c', 0.6], sunGlow: 0.2, sunGlowWidth: 10, sunSharp: 4, moonIntensity: 0, moonHalo: 0, stars: 0.0,
    cloudCover: 0.36, cloudDensity: 0.62, cloudScale: 0.045, cloudLit: ['#c49ca6', 0.5], cloudDark: ['#2e3a5a', 0.55], wind: [0.0012, 0.0004], exposure: 1.0 };
  // dawn 20 min before sunrise, looking east: P20 blue-grey sky and sea, ONE thin peach line (P21) on the horizon right of
  // centre where the sun will rise (set az 101°, x ≈ 0.62–0.85); light comes up over the shot, never orange
  const SKY80a = { preset: 'predawn', zenith: ['#2a3c5e', 0.78], horizon: ['#5B6F8A', 0.82], haze: ['#7f88a0', 0.5], hazeAmt: 0.32,
    sunAz: azW(101), sunElev: -3.0, sunColor: ['#EBB894', 1.0], sunGlow: 0.85, sunGlowWidth: 46, sunSharp: 9, moonIntensity: 0, moonHalo: 0, stars: 0.0,
    cloudCover: 0.34, cloudDensity: 0.55, cloudScale: 0.05, cloudLit: ['#b8a4a4', 0.55], cloudDark: ['#46526e', 0.5], wind: [0.0015, 0.0003], exposure: 1.0 };
  const SKY80b = { ...SKY80a, zenith: ['#32486c', 0.84], horizon: ['#6c7c96', 0.9], haze: ['#9a98a8', 0.52], sunGlow: 1.2, sunElev: -2.4, cloudLit: ['#d6b4a4', 0.66] };
  const SKY18W = { ...SKY18, moonAz: MOON_AZW, moonElev: MOON_EL };
  const sky = createSky(SKY46); scene.add(sky.object3D);
  // the sea reflects its own sky copy: same sky everywhere, except S018 where its moon is raised (glitter path on the basin)
  const seaSky = createSky(SKY46);
  const sea = createSea({ sky: seaSky, swell: { amp: 0.14, steep: 0.3, chop: 0.7, longest: 34 }, windDir: azW(200), level: SEA_Y, cols: 112, rows: 84, foam: 0.0, detail: 0.35, fogDensity: 0.0004 });
  scene.add(sea.object3D);
  const ENV = {
    dusk: envTexture(ctx.renderer, 'moon_exterior', { sky: SKY46 }),
    dawn: envTexture(ctx.renderer, 'moon_exterior', { sky: SKY80b }),
    night: envTexture(ctx.renderer, 'moon_exterior', { sky: SKY18W }),
  };
  const fog = new THREE.FogExp2(0x4a5470, 0.0011); scene.fog = fog;

  // ================================================================ textures & materials
  const T = {
    brick: TX.brick({ rows: 12, perRow: 4, limewash: 0.0, seed: 30 }),
    plaster: TX.plaster({ tone: 'lime', damp: 0.35, flake: 0.2, cracks: 0.25, strokes: 0.5, seed: 2 }),
    granite: TX.granite({ rows: 5, seed: 31 }),
    stone: TX.stone({ tone: 'granite', rows: 9, seed: 3, wear: 0.7 }),
    earth: TX.plaster({ tone: 'warm', damp: 0.8, flake: 0.0, cracks: 0.2, strokes: 0.1, seed: 9 }),
    wood: TX.wood({ tone: 'beam', planks: 5, seed: 5 }),
    noise: TX.noiseTexture(),
  };
  const R = (set, tile, tileV = tile) => TX.withRepeat(set, 1 / tile, 1 / tileV);
  const matOf = (set, tile, o = {}) => { const s = R(set, tile, o.tileV || tile); delete o.tileV; return std({ map: s.map, normalMap: s.normalMap || null, roughnessMap: s.roughnessMap || null, roughness: 1, ...o }); };
  const M = {
    granite: matOf(T.granite, 3.0, { color: 0xb8b2a8 }),
    graniteDark: matOf(T.granite, 3.0, { color: 0x8e8a84 }),
    paving: matOf(T.stone, 3.2, { color: 0x9a948a }),
    earth: matOf(T.earth, 7.0, { color: 0x7a6a58 }),
    timber: matOf(T.wood, 2.0, { color: 0x9a8a78 }),
    timberDark: matOf(T.wood, 2.0, { color: 0x6a5a4c }),
    joinery: std({ color: 0xE3DED3, roughness: 0.6 }),
    iron: std({ color: 0x1a1d20, roughness: 0.55, metalness: 0.6 }),
    ironGreen: std({ color: 0x2c3632, roughness: 0.55, metalness: 0.5 }),
    corridor: std({ color: 0x2a2826, roughness: 0.95 }),
    teak: TX.mat('teak', { repeat: [0.3, 0.3] }),
    dark: std({ color: 0x0b0d10, roughness: 0.95 }),
    rope: std({ color: 0x5a4a38, roughness: 0.9 }),
    canvasAwning: std({ color: 0x7a6e5c, roughness: 0.85, side: THREE.DoubleSide }),
    corrugated: std({ color: 0x5c605e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    concrete: std({ color: 0x8a8884, roughness: 0.9 }),
  };
  // facade: brick ↔ lime render blended in the shader (large-scale patches + grime streaks; per-era coverage / paint)
  function facadeMaterial() {
    const b = R(T.brick, 0.9);
    const m = std({ map: b.map, normalMap: b.normalMap, roughnessMap: b.roughnessMap, roughness: 1 });
    const U = { uPlaster: { value: T.plaster.map }, uPlS: { value: 1 / 4.5 }, uMask: { value: T.noise }, uMaskS: { value: 1 / 34 }, uCover: { value: 1 }, uPaint: { value: new THREE.Color(1, 1, 1) }, uGrime: { value: 0.2 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMU;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMU = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vMU; uniform sampler2D uPlaster, uMask; uniform float uPlS, uCover, uGrime, uMaskS; uniform vec3 uPaint;')
        .replace('#include <map_fragment>', `
          vec3 bc = texture2D(map, vMapUv).rgb;
          vec3 pc = texture2D(uPlaster, vMU * uPlS).rgb * uPaint;
          float mk = texture2D(uMask, vMU * uMaskS).r * 0.7 + texture2D(uMask, vMU * uMaskS * 3.7 + 0.31).a * 0.3;
          float fl = texture2D(uMask, vMU * 0.37 + 0.11).g - 0.5;
          float cov = uCover > 0.995 ? 1.0 : smoothstep(1.0 - uCover - 0.16, 1.0 - uCover + 0.16, mk + fl * 0.2 + 0.18 * smoothstep(1.0, 9.0, vMU.y)) * 0.88;
          float gs = texture2D(uMask, vec2(vMU.x * 0.31, vMU.y * 0.035 + 0.2)).g;
          vec3 fcol = mix(bc, pc, cov);
          fcol *= 1.0 - uGrime * smoothstep(0.42, 0.8, gs) * 0.55 - uGrime * 0.25 * smoothstep(3.0, 0.0, vMU.y);
          diffuseColor.rgb *= fcol;`);
    };
    m.customProgramCacheKey = () => 'harborFacade';
    m.userData.U = U;
    return m;
  }
  // damp ground: large-scale puddle mask lowers roughness (lamp + sky reflections on the setts), darkens slightly
  function damp(m, k = 1) {
    const U = { uMask: { value: T.noise }, uWet: { value: k } };
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWU;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWU = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWU; uniform sampler2D uMask; uniform float uWet; float wetK;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n  { float pm = texture2D(uMask, vWU * 0.021).r * 0.75 + texture2D(uMask, vWU * 0.09 + 0.3).a * 0.25; wetK = uWet * smoothstep(0.5, 0.64, pm); diffuseColor.rgb *= 1.0 - 0.35 * wetK; }')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.08, wetK);');
    };
    m.customProgramCacheKey = () => 'harborDamp' + m.uuid; m.userData.wet = U; return m;
  }
  damp(M.paving, 1.0); damp(M.earth, 0.6);
  M.facade = facadeMaterial();
  M.facadeTrim = facadeMaterial();     // cornice / string course / pilasters (always rendered, slightly lighter)
  // roof tiles (weathered terracotta courses) and E1 grey channel tiles
  const roofTex = (kind) => {
    const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = util.rng(kind === 'grey' ? 61 : 62);
    g.fillStyle = kind === 'grey' ? '#4a4a48' : '#6a4a3e'; g.fillRect(0, 0, S, S);
    if (kind === 'grey') { // channel tiles running down-slope (vertical rolls)
      for (let x = 0; x < S; x += 16) { const sh = 0.75 + r() * 0.35; g.fillStyle = `rgba(${Math.round(88 * sh)},${Math.round(88 * sh)},${Math.round(84 * sh)},1)`; g.fillRect(x, 0, 10, S); g.fillStyle = 'rgba(20,20,20,0.7)'; g.fillRect(x + 10, 0, 6, S); }
      for (let y = 0; y < S; y += 21) { g.fillStyle = 'rgba(15,15,15,0.35)'; g.fillRect(0, y, S, 2); }
    } else {
      for (let y = 0; y < S; y += 26) { const off = ((y / 26) % 2) * 14; for (let x = -28; x < S; x += 28) { const sh = 0.7 + r() * 0.45; g.fillStyle = `rgb(${Math.round(118 * sh)},${Math.round(78 * sh)},${Math.round(62 * sh)})`; g.fillRect(x + off, y, 26, 23); } g.fillStyle = 'rgba(12,8,6,0.75)'; g.fillRect(0, y + 22, S, 4); }
    }
    const N = TX.makeNoise(kind === 'grey' ? 3 : 4), im = g.getImageData(0, 0, S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const k = 0.8 + 0.35 * (N.fbm(x / S, y / S, 4, 4) * 0.5 + 0.5), i = (y * S + x) * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k * 0.98; }
    g.putImageData(im, 0, 0); const t = ctex(c, true, true); t.repeat.set(1 / 4, 1 / 4); return t;
  };
  M.roof = std({ map: roofTex('red'), roughness: 0.85, color: 0xc8b8b0 });
  M.roofGrey = std({ map: roofTex('grey'), roughness: 0.9 });
  // window cards: arched six-over-six sash + fanlight (ground floor), steel arcade glazing (E5), plain sash (west/upper)
  function windowCard(kind) {
    const W = 192, H = 256, c = canvas(W, H), g = c.getContext('2d'), rc = canvas(W, H), gr = rc.getContext('2d');
    const frame = kind === 'steel' ? '#2f3a36' : '#d9d3c6', glass = kind === 'steel' ? '#16191c' : '#121518';
    g.fillStyle = glass; g.fillRect(0, 0, W, H); gr.fillStyle = '#101010'; gr.fillRect(0, 0, W, H); // roughness ≈ 0.06 on glass
    const bar = (x, y, w, h) => { g.fillStyle = frame; g.fillRect(x, y, w, h); gr.fillStyle = '#b4b4b4'; gr.fillRect(x, y, w, h); };
    const f = kind === 'steel' ? 5 : 9, b = kind === 'steel' ? 3 : 5, spring = W / 2;
    bar(0, 0, f, H); bar(W - f, 0, f, H); bar(0, H - f, W, f); bar(0, H - spring - b / 2, W, b);
    if (kind === 'sash') { for (const x of [W / 3, 2 * W / 3]) bar(x - b / 2, H - spring, b, spring); for (const y of [0.25, 0.5, 0.75]) bar(0, H - spring + (spring) * y - b / 2, W, b); bar(0, H - spring * 0.5 - b, W, b * 1.6); }
    else { bar(W / 2 - b / 2, H - spring, b, spring); for (const y of [0.2, 0.4, 0.6, 0.8]) bar(0, H - spring + spring * y - b / 2, W, b); }
    g.save(); g.strokeStyle = frame; g.lineWidth = b; g.translate(W / 2, H - spring); for (let k = 1; k < 4; k++) { const a = Math.PI + Math.PI * k / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * W, Math.sin(a) * W); g.stroke(); }
    g.lineWidth = f; g.beginPath(); g.arc(0, 0, W / 2 - f / 2, Math.PI, 2 * Math.PI); g.stroke(); g.beginPath(); g.arc(0, 0, W * 0.18, Math.PI, 2 * Math.PI); g.stroke(); g.restore();
    gr.save(); gr.strokeStyle = '#b4b4b4'; gr.lineWidth = f; gr.translate(W / 2, H - spring); gr.beginPath(); gr.arc(0, 0, W / 2 - f / 2, Math.PI, 2 * Math.PI); gr.stroke(); gr.restore();
    return { map: ctex(c), rough: ctex(rc, false) };
  }
  const WC = { sash: windowCard('sash'), steel: windowCard('steel') };
  M.sash = std({ map: WC.sash.map, roughnessMap: WC.sash.rough, roughness: 1, envMapIntensity: 1.3 });
  M.steelGlaze = std({ map: WC.steel.map, roughnessMap: WC.steel.rough, roughness: 1, envMapIntensity: 1.5 });
  M.steelGlazeLit = std({ map: WC.steel.map, roughnessMap: WC.steel.rough, roughness: 1, envMapIntensity: 1.2, emissive: new THREE.Color(0xffb46a), emissiveIntensity: 0, emissiveMap: null });
  M.sashLitBlind = std({ map: WC.sash.map, roughnessMap: WC.sash.rough, roughness: 1 });
  // soft radial textures for lamp pools and glows
  const radial = (() => { const S = 128, c = canvas(S, S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); return ctex(c, false); })();
  function pool(parent, x, z, r, color, k = 0.12, y = 0.02) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 2 * r), new THREE.MeshBasicMaterial({ map: radial, color: new THREE.Color(color).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 5; parent.add(m); m.userData.k = k; m.userData.col = new THREE.Color(color); return m;
  }
  // constant-pixel-size warm points (distant lamps, portholes, obstruction lights) — Points, additive
  function lampPoints(parent, pts, { px = 3.0, intensity = 4 } = {}) {
    const n = pts.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sd = new Float32Array(n);
    pts.forEach((p, i) => { pos.set([p[0], p[1], p[2]], i * 3); const c = new THREE.Color(p[3] ?? 0xE2A458).multiplyScalar(p[4] ?? 1); col.set([c.r, c.g, c.b], i * 3); sd[i] = (i * 0.618) % 1; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uT: { value: 0 }, uPx: { value: px }, uK: { value: intensity }, uTw: { value: 0.15 } },
      vertexShader: /* glsl */ `attribute vec3 color; attribute float aS; uniform float uT, uPx, uTw; varying vec3 vC; varying float vF;
        void main(){ vC = color; vF = 1.0 - uTw + uTw * sin(uT * (2.0 + aS * 5.0) + aS * 40.0); vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPx * clamp(60.0 / -mv.z, 0.8, 2.5) * 2.2; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform float uK; varying vec3 vC; varying float vF; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); if (r2 > 1.0) discard;
          float a = exp(-r2 * 9.0) + 0.1 * exp(-r2 * 2.0); gl_FragColor = vec4(vC * uK * a * vF, 1.0); }` });
    const P = new THREE.Points(g, m); P.frustumCulled = false; P.renderOrder = 20; parent.add(P); return P;
  }

  // ================================================================ GROUND: quay apron, quay wall, plaza
  const ground = group(setRoot, 'ground');
  const pave = mesh(metreUV(new THREE.PlaneGeometry(1400, 120).rotateX(-Math.PI / 2).translate(100, 0, QUAY_Z - 60)), M.paving, ground, 0, 0, 0, false);
  const earthG = mesh(metreUV(new THREE.PlaneGeometry(1400, 120).rotateX(-Math.PI / 2).translate(100, 0.005, QUAY_Z - 60)), M.earth, ground, 0, 0, 0, false);
  { // quay wall + coping along Z = QUAY_Z
    box(1400, 4.2, 1.2, M.graniteDark, ground, 100, -2.1, QUAY_Z + 0.6, false);
    box(1400, 0.32, 0.7, M.granite, ground, 100, 0.0, QUAY_Z - 0.3, false);
  }
  // iron bollards (E2+) and timber mooring posts (E1) along the edge
  const bollardG = new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.15, 0.4], [0.12, 0.52], [0.18, 0.58], [0.17, 0.66], [0, 0.68]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const bollX = []; for (let x = -54; x < 420; x += 12.5) bollX.push(x);
  const bollards = instanced(bollardG, M.iron, bollX.map((x) => M4(x, 0.16, QUAY_Z - 0.45)), ground);
  const postsE1 = instanced(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 7), M.timberDark, bollX.filter((_, i) => i % 2 === 0).map((x) => M4(x + 3, 0.55, QUAY_Z - 0.4)), ground);

  // ================================================================ THE CUSTOMS HOUSE (E2–E5) — 64 × 22 m, two storeys + hipped roof
  const chG = group(setRoot, 'customsHouse');
  const GFX = []; for (let k = 1; k <= 14; k++) if (k !== 7 && k !== 8) GFX.push(2 + 4 * k);   // ground-floor windows (lab = 58)
  const ARX = []; for (let k = 1; k <= 14; k++) ARX.push(2 + 4 * k);                            // upper arcade arches 6 … 58
  {
    // plinth (granite) around the building
    box(64.3, CH.plinth, 0.82, M.granite, chG, 32, CH.plinth / 2, -0.33);
    box(0.82, CH.plinth, 22.3, M.granite, chG, -0.11 + 0.3, CH.plinth / 2, -11);
    box(0.82, CH.plinth, 22.3, M.granite, chG, 64.11 - 0.3, CH.plinth / 2, -11);
    // south ground floor (windows + central door)
    const holes = GFX.map((x) => archPath(x, 2.4, 1.8, 5.0)); holes.push(archPath(32, 3.4, CH.plinth, 4.95));
    mesh(wall(64, CH.plinth, CH.gf, holes), M.facade, chG, 0, 0, -0.6);
    // south upper floor: arcaded verandah
    mesh(wall(64, CH.sc, CH.uf, ARX.map((x) => archPath(x, 2.6, 6.0, 10.0))), M.facade, chG, 0, 0, -0.6);
    // west facade (u = 0 at NW → 21.4 just short of the south wall)
    const WU = [4.6, 8.8, 13.0, 17.2];
    mesh(wall(21.4, CH.plinth, CH.gf, WU.map((u) => archPath(u, 2.0, 1.9, 4.9))), M.facade, chG, 0.6, 0, -22).rotation.y = -Math.PI / 2;
    mesh(wall(21.4, CH.sc, CH.uf, WU.map((u) => archPath(u, 1.8, 6.2, 9.8))), M.facade, chG, 0.6, 0, -22).rotation.y = -Math.PI / 2;
    // east facade (u = 0.6 at SE → 22 NE)
    const EU = [8.8, 13.0, 17.2];
    const e1 = mesh(wall(21.4, CH.plinth, CH.gf, [4.6, ...EU].map((u) => archPath(u - 0.6, 2.0, 1.9, 4.9))), M.facade, chG, 63.4, 0, -0.6); e1.rotation.y = Math.PI / 2;
    const e2 = mesh(wall(21.4, CH.sc, CH.uf, [archPath(2.0, 3.2, 6.0, 10.0), ...EU.map((u) => archPath(u - 0.6, 1.8, 6.2, 9.8))]), M.facade, chG, 63.4, 0, -0.6); e2.rotation.y = Math.PI / 2;
    // north facade (plain) and floor slabs
    box(64, CH.uf - CH.plinth, 0.6, M.facade, chG, 32, (CH.uf + CH.plinth) / 2, -21.7);
    box(64, CH.sc - CH.gf, 0.6, M.facadeTrim, chG, 32, (CH.sc + CH.gf) / 2, -0.3); // spandrel band behind the string course (south)
    box(0.6, CH.sc - CH.gf, 21.4, M.facadeTrim, chG, 0.3, (CH.sc + CH.gf) / 2, -11.3);
    box(0.6, CH.sc - CH.gf, 21.4, M.facadeTrim, chG, 63.7, (CH.sc + CH.gf) / 2, -11.3);
    // string course + cornice (granite) projecting on all sides
    const band = (y, h, out, mat) => { box(64 + 2 * out, h, 0.6 + out, mat, chG, 32, y, -0.3 + out / 2); box(64 + 2 * out, h, 0.6 + out, mat, chG, 32, y, -21.7 - out / 2); box(0.6 + out, h, 22, mat, chG, 0.3 - out / 2, y, -11); box(0.6 + out, h, 22, mat, chG, 63.7 + out / 2, y, -11); };
    band(CH.sc - 0.15, 0.3, 0.14, M.granite);
    band(CH.uf + 0.12, 0.24, 0.12, M.granite); band(CH.uf + 0.42, 0.36, 0.36, M.granite); band(CH.corn - 0.08, 0.16, 0.5, M.granite);
    // quoins at the four corners (alternating long/short granite blocks)
    for (const [cx, cz, sx, sz] of [[0, 0, 1, -1], [64, 0, -1, -1], [0, -22, 1, 1], [64, -22, -1, 1]]) {
      for (let k = 0, y = CH.plinth; y < CH.uf - 0.3; k++, y += 0.62) {
        if (y > CH.gf - 0.3 && y < CH.sc + 0.1) continue;
        const L = k % 2 ? 0.55 : 0.95;
        box(L, 0.56, 0.08, M.granite, chG, cx + sx * L / 2, y + 0.29, cz + 0.04 * (sz < 0 ? 1 : -1), false);
        box(0.08, 0.56, k % 2 ? 0.95 : 0.55, M.granite, chG, cx - sx * 0.04, y + 0.29, cz + sz * (k % 2 ? 0.95 : 0.55) / 2, false);
      }
    }
    // main door steps
    for (let i = 0; i < 3; i++) box(4.4 - i * 0.3, 0.3, 0.9 - i * 0.3, M.granite, chG, 32, 0.15 + i * 0.3, 0.45 - i * 0.15);
    // roof (hipped, weathered tiles) + fascia + chimneys
    const roof = (() => {
      const o = 0.55, X0 = -o, X1 = 64 + o, Z0 = -22 - o, Z1 = o, yE = CH.corn, hd = (Z1 - Z0) / 2, yR = yE + hd * Math.tan(24 * D2R), zc = (Z0 + Z1) / 2;
      const P = [], U = [];
      const quad = (a, b, c, d, ua, ub, uc, ud) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); U.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud); };
      const sl = hd / Math.cos(24 * D2R);
      quad([X0, yE, Z1], [X1, yE, Z1], [X1 - hd, yR, zc], [X0 + hd, yR, zc], [X0, 0], [X1, 0], [X1 - hd, sl], [X0 + hd, sl]);
      quad([X1, yE, Z0], [X0, yE, Z0], [X0 + hd, yR, zc], [X1 - hd, yR, zc], [-X1, 0], [-X0, 0], [-X0 - hd, sl], [-X1 + hd, sl]);
      P.push(X0, yE, Z0, X0, yE, Z1, X0 + hd, yR, zc); U.push(Z0, 0, Z1, 0, zc, sl);
      P.push(X1, yE, Z1, X1, yE, Z0, X1 - hd, yR, zc); U.push(-Z1, 0, -Z0, 0, -zc, sl);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals();
      return mesh(g, M.roof, chG);
    })();
    box(65.2, 0.28, 0.12, M.timberDark, chG, 32, CH.corn - 0.1, 0.6, false);
    for (const [x, z] of [[14, -8], [50, -8], [30, -15]]) { box(1.0, 3.2, 1.6, M.facade, chG, x, CH.corn + 3.4, z); box(1.2, 0.2, 1.8, M.granite, chG, x, CH.corn + 5.05, z); }
    chG.userData.roof = roof;
  }
  // window cards in the recesses (ground floor: sash; arcade: open (E2–E4) or steel glazing (E5)); west/east windows
  const sashG = archPlane(2.4, 3.2), sashW = archPlane(2.0, 3.0), sashU = archPlane(1.8, 3.6), arcG = archPlane(2.6, 4.0);
  const gfWin = instanced(sashG, M.sash, GFX.filter((x) => x !== 58).map((x) => M4(x, 1.8, -0.32)), chG, false);
  const labSash = mesh(sashG, M.sash, chG, 58, 1.8, -0.32, false);              // swapped for the see-through lab window in S018
  const doorLeaf = box(3.3, 4.0, 0.12, M.timberDark, chG, 32, 2.9, -0.4, false);
  const westWin = instanced(sashW, M.sash, [4.6, 8.8, 13.0, 17.2].flatMap((u) => [new THREE.Matrix4().compose(V3(0.3, 1.9, -22 + u), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -Math.PI / 2), V3(1, 1, 1)),
    new THREE.Matrix4().compose(V3(0.3, 6.2, -22 + u), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -Math.PI / 2), V3(0.9, 1.2, 1))]), chG, false);
  const eastWin = instanced(sashW, M.sash, [4.6, 8.8, 13.0, 17.2].flatMap((u) => [new THREE.Matrix4().compose(V3(63.7, 1.9, -u), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI / 2), V3(1, 1, 1))])
    .concat([8.8, 13.0, 17.2].map((u) => new THREE.Matrix4().compose(V3(63.7, 6.2, -u), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI / 2), V3(0.9, 1.2, 1)))), chG, false);
  const arcGlaze = instanced(arcG, M.steelGlaze, ARX.filter((x) => x !== 58).map((x) => M4(x, 6.0, -0.28)), chG, false);
  const arcGlazeEnd = mesh(arcG, M.steelGlazeLit, chG, 58, 6.0, -0.28, false);   // E5: the east end, lit from the bay's reading lamp
  // the verandah interior behind the arcade (seen through the open arches in E2–E4)
  box(63, 0.2, 5.0, M.teak, chG, 32, CH.sc + 0.1, -3.1, false);
  box(63, 0.2, 5.0, M.corridor, chG, 32, CH.uf - 0.1, -3.1, false);
  box(63, CH.uf - CH.sc, 0.3, M.corridor, chG, 32, (CH.uf + CH.sc) / 2, -5.6, false);
  for (const x of ARX) box(1.4, 2.6, 0.06, M.dark, chG, x, CH.sc + 1.4, -5.42, false);
  // bay window at the east end of the upper floor (projects east 1.6 m; E, NE, SE panes)
  const bayG = group(chG, 'bay');
  { const bx = 64, bz = -2.6, y0 = CH.sc + 0.4, h = 4.2;
    box(1.6, 0.4, 4.2, M.granite, bayG, bx + 0.8, y0 - 0.2, bz); box(1.7, 0.3, 4.3, M.granite, bayG, bx + 0.85, y0 + h + 0.15, bz);
    const pane = std({ color: 0x14181c, roughness: 0.08, envMapIntensity: 1.4 });
    const pE = box(0.08, h, 2.2, pane, bayG, bx + 1.6, y0 + h / 2, bz, false);
    for (const s of [-1, 1]) boxR(0.08, h, 1.45, pane, bayG, bx + 0.8, y0 + h / 2, bz + s * 1.62, 0, s * Math.PI / 4, 0, false);
  }
  // flagpole on the SE roof corner (E2–E4 flags; E5 bare)
  const FP = V3(63.3, CH.corn + 0.15, -0.9);
  cyl(0.07, 0.09, 8.2, M.joinery, chG, FP.x, FP.y + 4.1, FP.z, 8);
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M.joinery); b.position.set(FP.x, FP.y + 8.3, FP.z); chG.add(b); }
  box(0.6, 0.5, 0.6, M.granite, chG, FP.x, FP.y + 0.25, FP.z);

  // ================================================================ E1 (c.1630s): timber godown on the same ground, stockade, landing steps
  const e1G = group(setRoot, 'E1');
  {
    const x0 = 6, x1 = 50, z0 = -17, z1 = -3, yB = 0.6, yE = 5.2;
    box(x1 - x0 + 0.6, yB, z1 - z0 + 0.6, M.graniteDark, e1G, (x0 + x1) / 2, yB / 2, (z0 + z1) / 2);
    box(x1 - x0, yE - yB, z1 - z0, M.timberDark, e1G, (x0 + x1) / 2, (yE + yB) / 2, (z0 + z1) / 2);
    for (let x = x0; x <= x1 + 0.01; x += 4) box(0.3, yE - yB, 0.3, M.timber, e1G, x, (yE + yB) / 2, z1 + 0.05);
    for (const x of [12, 20, 28, 36, 44]) box(2.4, 3.2, 0.1, M.dark, e1G, x + 2, yB + 1.6, z1 + 0.06, false);
    const o = 1.4, hd = (z1 - z0) / 2 + o, yR = yE + hd * Math.tan(28 * D2R), zc = (z0 + z1) / 2, X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o;
    const P = [], U = [];
    const tri = (a, b, c, ua, ub, uc) => { P.push(...a, ...b, ...c); U.push(...ua, ...ub, ...uc); };
    const sl = hd / Math.cos(28 * D2R);
    tri([X0, yE, Z1], [X1, yE, Z1], [X1 - hd * 0.6, yR, zc], [X0, 0], [X1, 0], [X1 - hd * 0.6, sl]); tri([X0, yE, Z1], [X1 - hd * 0.6, yR, zc], [X0 + hd * 0.6, yR, zc], [X0, 0], [X1 - hd * 0.6, sl], [X0 + hd * 0.6, sl]);
    tri([X1, yE, Z0], [X0, yE, Z0], [X0 + hd * 0.6, yR, zc], [-X1, 0], [-X0, 0], [-X0 - hd * 0.6, sl]); tri([X1, yE, Z0], [X0 + hd * 0.6, yR, zc], [X1 - hd * 0.6, yR, zc], [-X1, 0], [-X0 - hd * 0.6, sl], [-X1 + hd * 0.6, sl]);
    tri([X0, yE, Z0], [X0, yE, Z1], [X0 + hd * 0.6, yR, zc], [Z0, 0], [Z1, 0], [zc, sl]); tri([X1, yE, Z1], [X1, yE, Z0], [X1 - hd * 0.6, yR, zc], [-Z1, 0], [-Z0, 0], [-zc, sl]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals();
    mesh(g, M.roofGrey, e1G);
    // a second, smaller shed further east + low houses along the shore
    box(16, 3.6, 9, M.timberDark, e1G, 68, 1.8, -8); box(17, 0.4, 10, M.roofGrey, e1G, 68, 3.8, -8);
  }
  // granite landing steps down to the water, just east of the gate on the quay edge
  const stepsG = group(setRoot, 'steps');
  { const sx = GX + 8; for (let i = 0; i < 6; i++) box(5.0, 0.42, 0.62, M.granite, stepsG, sx, -0.21 - i * 0.42, QUAY_Z + 0.31 + i * 0.62); }

  // ================================================================ THE GATE + barrier (per era)
  const gateE1 = group(setRoot, 'gateE1'), gateStone = group(setRoot, 'gateStone');
  {
    // E1: timber stockade gate — two posts, lintel with a small tiled hood, palisade of stakes
    const half = 0.82;
    for (const s of [-1, 1]) box(0.28, 3.3, 0.28, M.timber, gateE1, GX, 1.65, GZ + s * (half + 0.14));
    box(0.34, 0.3, 2 * half + 0.9, M.timber, gateE1, GX, 3.15, GZ);
    box(0.9, 0.12, 2 * half + 1.3, M.roofGrey, gateE1, GX - 0.05, 3.42, GZ);
    const stakes = [], r = util.rng(17);
    for (let z = GZ - half - 0.45; z > GZ - 22; z -= 0.26) stakes.push(M4(GX + (r() - 0.5) * 0.05, 1.15 + r() * 0.12, z, r() * 3, 1, 1 + (r() - 0.5) * 0.1, 1));
    for (let z = GZ + half + 0.45; z < QUAY_Z - 5.2; z += 0.26) stakes.push(M4(GX + (r() - 0.5) * 0.05, 1.15 + r() * 0.12, z, r() * 3, 1, 1 + (r() - 0.5) * 0.1, 1));
    const sg = new THREE.CylinderGeometry(0.035, 0.1, 2.5, 6); const sgt = new THREE.ConeGeometry(0.1, 0.25, 6).translate(0, 1.37, 0);
    instanced(sg, M.timber, stakes, gateE1); instanced(sgt, M.timber, stakes, gateE1);
    box(0.12, 0.12, 22, M.timberDark, gateE1, GX - 0.1, 1.9, GZ - half - 11); box(0.12, 0.12, QUAY_Z - 5.2 - GZ - half, M.timberDark, gateE1, GX - 0.1, 1.9, (GZ + half + QUAY_Z - 5.2) / 2); box(0.3, 2.9, 0.3, M.timber, gateE1, GX, 1.45, QUAY_Z - 5.1);
    // gate leaf (open inward) and a bracket with the lantern on the right post
    boxR(half * 0.95, 2.4, 0.08, M.timberDark, gateE1, GX + 0.42, 1.35, GZ + half - 0.1, 0, -1.25, 0);
    boxR(half * 0.95, 2.4, 0.08, M.timberDark, gateE1, GX + 0.42, 1.35, GZ - half + 0.1, 0, 1.25, 0);
    { const zp = GZ + half; box(0.06, 0.06, zp - LANT.z, M.iron, gateE1, GX - 0.05, LANT.y + 0.16, (zp + LANT.z) / 2, false); }
  }
  {
    // E2–E5: granite piers with caps, sill + iron edge strip, iron gate leaves, low wall + railing
    const half = 1.2;
    for (const s of [-1, 1]) { const z = GZ + s * (half + 0.36); box(0.72, 3.0, 0.72, M.granite, gateStone, GX, 1.5, z); box(0.9, 0.22, 0.9, M.granite, gateStone, GX, 3.11, z); box(0.5, 0.18, 0.5, M.granite, gateStone, GX, 3.31, z); }
    box(0.5, 0.13, 2 * half, M.granite, gateStone, GX, 0.065, GZ, false);
    box(0.035, 0.03, 2 * half, M.iron, gateStone, TH.x + 0.017, 0.118, GZ, false);
    // iron gate leaves folded back inside
    const bars = []; for (const s of [-1, 1]) for (let k = 0; k < 9; k++) bars.push(M4(GX + 0.5 + k * 0.13, 1.05, GZ + s * (half - 0.06), 0, 1, 1, 1));
    instanced(new THREE.BoxGeometry(0.025, 2.1, 0.025), M.iron, bars, gateStone);
    for (const s of [-1, 1]) for (const y of [0.15, 1.0, 2.05]) box(1.2, 0.05, 0.04, M.iron, gateStone, GX + 1.0, y, GZ + s * (half - 0.06), false);
    // low wall + railing to the left (off frame) and right (quay edge)
    const zL0 = GZ - half - 0.72, zR0 = GZ + half + 0.72, zL1 = GZ - 30, zR1 = QUAY_Z - 0.4;
    box(0.5, 0.5, zL0 - zL1, M.granite, gateStone, GX, 0.25, (zL0 + zL1) / 2); box(0.5, 0.5, zR1 - zR0, M.granite, gateStone, GX, 0.25, (zR0 + zR1) / 2);
    box(0.62, 1.3, 0.62, M.granite, gateStone, GX, 0.65, zR1 + 0.1);
    const rb = []; for (let z = zL0 - 0.12; z > zL1; z -= 0.16) rb.push(M4(GX, 0.85, z)); for (let z = zR0 + 0.12; z < zR1 - 0.3; z += 0.16) rb.push(M4(GX, 0.85, z));
    instanced(new THREE.CylinderGeometry(0.011, 0.011, 0.7, 5), M.iron, rb, gateStone);
    for (const y of [0.56, 1.2]) { box(0.05, 0.04, zL0 - zL1, M.iron, gateStone, GX, y, (zL0 + zL1) / 2, false); box(0.05, 0.04, zR1 - zR0, M.iron, gateStone, GX, y, (zR0 + zR1) / 2, false); }
  }
  // ================================================================ LAMPS per era (posts + heads + glows + pools; ≤ 2 real lights)
  const lampX = [-30, -6, 18, 42, 76, 100, 124, 148];
  const lampsG = {};
  function lampRig(key, { post, head, color, glowSize = 0.7, glowK = 0.8, poolK = 0.14, poolR = 5, height = 4.2, arm = 0, facade = false, piers = false }) {
    const g = group(setRoot, 'lamps_' + key), glows = [], pools = [];
    const add = (x, y, z, onPost = true) => {
      if (onPost && post) post(g, x, z);
      const hz = onPost ? z - arm : z;
      if (head) head(g, x, y, hz);
      const gl = FX.glow({ color, size: glowSize, intensity: glowK, falloff: 2.0 }); gl.object3D.position.set(x, y - 0.1, hz); g.add(gl.object3D); glows.push(gl);
      if (poolK > 0 && onPost) pools.push(pool(g, x, hz, poolR, color, poolK));
    };
    for (const x of lampX) add(x, height, QUAY_Z - 0.9);
    if (facade) for (let x = 4; x <= 60; x += 8) add(x, 4.1, 0.6, false);
    if (piers) for (const s of [-1, 1]) add(GX, 3.95, GZ + s * 1.56, false);
    lampsG[key] = { g, glows, pools, color: new THREE.Color(color) };
    return lampsG[key];
  }
  const glassHead = (col, k) => std({ color: 0x302418, emissive: new THREE.Color(col), emissiveIntensity: k, roughness: 0.3 });
  const kerosene = glassHead(0xffb062, 1.6), bulbM = glassHead(0xffc27a, 2.2), sodiumM = glassHead(0xe0a860, 2.6), ledM = glassHead(0xeef2f8, 3.0);
  // E1 torches (poles with open flames) + the gate's hand lantern
  const e1Lights = group(setRoot, 'e1Lights');
  const torches = [];
  for (const [x, z] of [[GX + 4.5, QUAY_Z - 1.2], [GX + 18, QUAY_Z - 1.0], [GX + 34, QUAY_Z - 1.0], [12, -1.5], [36, -1.5]]) {
    cyl(0.05, 0.06, 2.6, M.timberDark, e1Lights, x, 1.3, z, 6);
    const fl = FX.flameMesh({ width: 0.16, height: 0.42, intensity: 5, seed: x }); fl.position.set(x, 2.62, z); e1Lights.add(fl);
    const gl = FX.glow({ color: 0xff9a48, size: 1.6, intensity: 0.4, falloff: 2.0 }); gl.object3D.position.set(x, 2.8, z); e1Lights.add(gl.object3D);
    torches.push({ fl, gl, p: pool(e1Lights, x, z, 4.5, 0xff9a48, 0.16) });
  }
  const lantern = FX.lantern({ style: 'paper', size: 0.55, intensity: 0, seed: 5, pendulum: 0.03, period: 6, paper: '#ead6b0' });
  lantern.object3D.position.set(LANT.x, LANT.y + 0.11, LANT.z); e1Lights.add(lantern.object3D);
  // E2 kerosene posts (cast iron, glass lantern heads), E3 electric (enamel shades, bracket arms), E4 sodium (concrete poles,
  // cobra heads), E5 LED (slim steel poles)
  lampRig('E2', { color: 0xffb062, glowSize: 0.9, glowK: 0.55, poolK: 0.1, height: 3.6, facade: true, piers: true,
    post: (g, x, z) => { cyl(0.06, 0.1, 3.3, M.ironGreen, g, x, 1.65, z, 8); cyl(0.16, 0.2, 0.3, M.ironGreen, g, x, 0.15, z, 8); },
    head: (g, x, y, z) => { box(0.3, 0.42, 0.3, kerosene, g, x, y, z, false); const c = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 4), M.ironGreen); c.position.set(x, y + 0.32, z); c.rotation.y = Math.PI / 4; g.add(c); } });
  lampRig('E3', { color: 0xffc27a, glowSize: 1.0, glowK: 0.75, poolK: 0.16, height: 4.6, arm: 0.75, facade: true, piers: true,
    post: (g, x, z) => { cyl(0.07, 0.1, 4.9, M.ironGreen, g, x, 2.45, z, 8); box(0.05, 0.05, 0.8, M.ironGreen, g, x, 4.85, z - 0.4); },
    head: (g, x, y, z) => { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.16, 14, 1, true), std({ color: 0x2a3a34, roughness: 0.4, side: THREE.DoubleSide })); sh.position.set(x, y + 0.08, z); g.add(sh); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bulbM); b.position.set(x, y, z); g.add(b); } });
  lampRig('E4', { color: 0xe0a860, glowSize: 1.3, glowK: 0.85, poolK: 0.2, poolR: 7, height: 7.6, arm: 1.5,
    post: (g, x, z) => { cyl(0.1, 0.16, 7.8, M.concrete, g, x, 3.9, z, 8); box(0.08, 0.08, 1.6, M.concrete, g, x, 7.8, z - 0.8); },
    head: (g, x, y, z) => { box(0.3, 0.14, 0.6, sodiumM, g, x, y, z, false); } });
  lampRig('E5', { color: 0xeef2f8, glowSize: 0.9, glowK: 0.6, poolK: 0.1, poolR: 6, height: 6.4, arm: 0.3,
    post: (g, x, z) => { cyl(0.06, 0.08, 6.4, std({ color: 0x3a3d40, roughness: 0.5, metalness: 0.5 }), g, x, 3.2, z, 8); },
    head: (g, x, y, z) => { box(0.22, 0.08, 0.7, ledM, g, x, y, z, false); } });
  // E3 overhead wires (two timber poles on the quay + catenaries to the building), E3 gate canopy, E4 sentry box with bars
  const e3G = group(setRoot, 'E3extras'), e4G = group(setRoot, 'E4extras');
  {
    // timber telegraph poles along the quay edge beyond the gate; wires sag between them and run to the building
    const poles = [[GX + 21, QUAY_Z - 1.6], [GX + 49, QUAY_Z - 1.6], [GX + 77, QUAY_Z - 1.6], [GX + 105, QUAY_Z - 1.6]];
    for (const [x, z] of poles) { cyl(0.1, 0.14, 8.6, M.timberDark, e3G, x, 4.3, z, 7); box(0.09, 0.09, 1.5, M.timberDark, e3G, x, 8.1, z); }
    const pts = [];
    const cat = (a, b, sag, n = 18) => { for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1); p0.y -= sag * 4 * t0 * (1 - t0); p1.y -= sag * 4 * t1 * (1 - t1); pts.push(p0, p1); } };
    for (let i = 0; i < poles.length - 1; i++) for (const dz of [-0.6, 0.6]) cat(V3(poles[i][0], 8.15, poles[i][1] + dz), V3(poles[i + 1][0], 8.15, poles[i + 1][1] + dz), 0.5);
    cat(V3(poles[0][0], 8.15, poles[0][1] - 0.6), V3(GX + 0.3, 3.9, GZ + 1.56), 0.25);
    cat(V3(poles[1][0], 8.15, poles[1][1] - 0.6), V3(6, 9.4, 0.4), 0.9); cat(V3(poles[2][0], 8.15, poles[2][1] - 0.6), V3(30, 9.4, 0.4), 0.9);
    e3G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x17181a, fog: true })));
    // rain awning over the gate: pale painted corrugated sheet on a timber frame with a fascia, sloping toward the quay road
    const awM = std({ color: 0xb4b8ae, roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide });
    boxR(1.9, 0.04, 4.3, awM, e3G, GX - 0.5, 4.32, GZ, 0, 0, -0.17);
    box(0.05, 0.1, 4.3, awM, e3G, GX - 1.43, 4.12, GZ, false);
    for (const s of [-1, 1]) { boxR(0.06, 0.95, 0.06, M.timberDark, e3G, GX, 3.85, GZ + s * 1.62, 0, 0, 0, false); boxR(1.5, 0.06, 0.06, M.timberDark, e3G, GX - 0.62, 3.98, GZ + s * 1.62, 0, 0, 0.36, false); }
    // facade awning along the south front (corrugated iron on slender posts)
    boxR(56, 0.05, 2.6, awM, e3G, 32, 4.62, 1.3, 0.2, 0, 0);
    for (let x = 6; x <= 58; x += 6.5) cyl(0.04, 0.04, 4.3, M.ironGreen, e3G, x, 2.15, 2.55, 6);
    // E4: concrete sentry box with an iron-barred window, left of the gate behind the wall
    const sbx = GX + 1.4, sbz = GZ - 4.2;
    box(1.7, 2.7, 1.7, M.concrete, e4G, sbx, 1.35, sbz); box(2.0, 0.16, 2.0, M.concrete, e4G, sbx, 2.78, sbz);
    box(0.04, 0.8, 0.9, std({ color: 0x8a6a3a, emissive: new THREE.Color(0xd09050), emissiveIntensity: 0.35 }), e4G, sbx - 0.86, 1.6, sbz, false);
    for (let k = -3; k <= 3; k++) box(0.03, 0.85, 0.025, M.iron, e4G, sbx - 0.9, 1.6, sbz + k * 0.13, false);
  }

  // ---- era props: what lies about on the quay (frames the waiting spot without competing with it)
  const props = { 1: group(setRoot, 'props1'), 2: group(setRoot, 'props2'), 3: group(setRoot, 'props3'), 4: group(setRoot, 'props4'), 5: group(setRoot, 'props5') };
  {
    const crateM = std({ color: 0x7a6650, roughness: 0.85, map: R(T.wood, 1.2).map }), barrelM = std({ color: 0x5a4434, roughness: 0.8 }), sackM = std({ color: 0x9a8a6c, roughness: 0.95 });
    const crate = (g, x, z, s = 1, ry = 0) => boxR(0.9 * s, 0.7 * s, 0.7 * s, crateM, g, x, 0.35 * s, z, 0, ry, 0);
    const barrel = (g, x, z, ry = 0) => { const b = cyl(0.3, 0.27, 0.85, barrelM, g, x, 0.425, z, 12); for (const y of [0.15, 0.7]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 4, 16), M.iron); h.rotation.x = Math.PI / 2; h.position.set(x, y, z); g.add(h); } return b; };
    const sack = (g, x, z, ry = 0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), sackM); m.scale.set(0.9, 0.5, 0.62); m.position.set(x, 0.2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); };
    const basketP = (g, x, z, h = 0.4) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, h, 14, 1, true), std({ map: TX.mat('rattan', { repeat: [3, 1] }).map, color: 0xb09870, side: THREE.DoubleSide, roughness: 0.9 })); b.position.set(x, h / 2, z); b.castShadow = true; g.add(b); };
    // E1: baskets of produce, a coil of rope, sacks by the palisade
    basketP(props[1], GX - 6.5, GZ - 4.2); basketP(props[1], GX - 6.0, GZ - 3.5, 0.32); sack(props[1], GX - 7.2, GZ - 3.6, 0.4); sack(props[1], GX - 3.2, GZ + 6.8, 1.1); basketP(props[1], GX - 2.6, GZ + 7.5);
    { const c = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 18), M.rope); c.rotation.x = Math.PI / 2; c.position.set(GX - 9, 0.07, GZ + 5.5); props[1].add(c); }
    // E2: tea crates and a porter's handcart
    crate(props[2], GX - 6.2, GZ - 4.5, 1, 0.1); crate(props[2], GX - 6.0, GZ - 4.4, 0.8, 0.05).position.y = 0.98; crate(props[2], GX - 4.8, GZ - 5.3, 1, -0.2); barrel(props[2], GX - 3.0, GZ + 7.0);
    // E3: luggage — a steamer trunk, cloth bundles, a second rattan case — and a bench
    boxR(0.95, 0.62, 0.55, std({ color: 0x4a3a2a, roughness: 0.6 }), props[3], GX - 5.4, 0.31, GZ - 4.4, 0, 0.3, 0); boxR(0.58, 0.38, 0.21, TX.mat('rattan', { repeat: [2, 1] }), props[3], GX - 4.6, 0.19, GZ - 3.4, 0, 1.2, 0);
    { const bm = std({ color: 0x5a4632, roughness: 0.8 }); box(2.2, 0.06, 0.45, bm, props[3], GX - 3.0, 0.46, GZ + 6.8); for (const dx of [-0.95, 0.95]) box(0.08, 0.46, 0.4, M.iron, props[3], GX - 3.0 + dx, 0.23, GZ + 6.8); }
    // E4: oil drums and a bicycle leaning on the wall
    for (const [dx, dz] of [[-5.6, -4.6], [-5.0, -5.3], [-6.3, -5.0]]) { const d = cyl(0.29, 0.29, 0.88, std({ color: 0x3e4a44, roughness: 0.55, metalness: 0.4 }), props[4], GX + dx, 0.44, GZ + dz, 14); }
    { const bk = group(props[4]); bk.position.set(GX - 0.45, 0, GZ + 4.2); bk.rotation.y = Math.PI / 2 + 0.1; for (const sx of [-0.52, 0.52]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 5, 22), M.iron); w.position.set(sx, 0.34, 0); bk.add(w); } const f1 = box(1.0, 0.03, 0.03, M.iron, bk, 0, 0.62, 0, false); f1.rotation.z = 0.1; box(0.03, 0.4, 0.03, M.iron, bk, 0.32, 0.8, 0, false); box(0.03, 0.03, 0.42, M.iron, bk, 0.36, 1.0, 0, false); }
    // E5: museum quay — a bench, planter boxes with low shrubs
    { const bm = std({ color: 0x6a5a48, roughness: 0.6 }); box(2.0, 0.08, 0.5, bm, props[5], GX - 5.5, 0.45, GZ - 4.4); box(2.0, 0.4, 0.06, bm, props[5], GX - 5.5, 0.7, GZ - 4.65); for (const dx of [-0.85, 0.85]) box(0.06, 0.45, 0.5, M.iron, props[5], GX - 5.5 + dx, 0.22, GZ - 4.4);
    }
  }

  // ================================================================ FLAGS (all invented; far, limp, half-furled or partly hidden) + E1 pennants
  function flagCanvas(kind) {
    const W = 256, H = kind === 'FD' ? 128 : 170, c = canvas(W, H), g = c.getContext('2d');
    if (kind === 'FB') { g.fillStyle = '#4E6273'; g.fillRect(0, 0, W, H); g.strokeStyle = '#E6E1D4'; g.lineWidth = 12; g.beginPath(); for (let x = 0; x <= W; x += 4) { const y = H / 2 + 14 * Math.sin(x / W * Math.PI * 6 - 0.4); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.fillStyle = '#B48A45'; g.beginPath(); g.arc(34, 30, 13, 0, 7); g.fill(); }
    if (kind === 'FC') { g.fillStyle = '#6E4A3A'; g.fillRect(0, 0, W, H); g.strokeStyle = '#E3D7BE'; g.lineWidth = 11; g.beginPath(); g.arc(W / 2, H / 2, 40, 0, 7); g.stroke(); g.fillStyle = '#E3D7BE'; g.fillRect(W - 14, 0, 14, H); }
    if (kind === 'FD') { g.fillStyle = '#C2B08C'; g.fillRect(0, 0, W, H); g.fillStyle = '#4E6273'; g.fillRect(0, 8, W, 9); g.fillRect(0, H - 17, W, 9); g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 9 : 20; g.lineTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); } g.closePath(); g.fill(); }
    if (kind === 'PM' || kind === 'PI') { g.fillStyle = kind === 'PM' ? '#9A5A44' : '#2E3F5C'; g.fillRect(0, 0, W, H); }
    return ctex(c);
  }
  function flagMaterial(map, { W, H, droop = 1.1, taper = 0 }) {
    const m = std({ map, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
    const U = { uT: { value: 0 }, uW: { value: W }, uH: { value: H }, uDroop: { value: droop }, uTaper: { value: taper }, uAmp: { value: 0.12 }, uFurl: { value: 0 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uW, uH, uDroop, uTaper, uAmp, uFurl;').replace('#include <begin_vertex>', `
        float s = position.x / uW, v = position.y / uH;                 // s 0 hoist → 1 fly, v 0 top → −1 bottom
        float wv = sin(s * 9.0 - uT * 1.7 + v * 1.3) * uAmp * s + sin(s * 4.0 - uT * 0.9) * uAmp * 0.6 * s;
        float a = uDroop * (0.55 + 0.45 * s) + 0.08 * sin(uT * 0.6);
        float L = s * uW * (1.0 - uFurl * 0.7);
        float hh = v * uH * (1.0 - uTaper * s);
        vec3 transformed = vec3(L * cos(a), hh - L * sin(a), wv + uFurl * 0.08 * sin(s * 20.0));`);
    };
    m.customProgramCacheKey = () => 'harborFlag';
    m.userData.U = U; return m;
  }
  const flagGeo = (W, H, nx = 16, ny = 8) => new THREE.PlaneGeometry(W, H, nx, ny).translate(W / 2, -H / 2, 0);
  const flags = {};
  for (const [k, W, H, droop, furl] of [['FB', 2.1, 1.4, 1.0, 0.0], ['FC', 2.1, 1.4, 1.15, 0.0], ['FD', 2.4, 1.2, 1.2, 0.45]]) {
    const m = flagMaterial(flagCanvas(k), { W, H, droop }); m.userData.U.uFurl.value = furl;
    const f = new THREE.Mesh(flagGeo(W, H), m); f.position.set(FP.x, FP.y + 8.0, FP.z); f.rotation.y = -Math.PI / 2 - 0.25 + (k === 'FC' ? -0.45 : 0); f.castShadow = false; chG.add(f); flags[k] = f;
  }

  // ================================================================ SHIPS (lofted hulls, simple superstructures, rigging)
  function hullGeo({ L, B, D, sheerAft = 0.25, sheerFwd = 0.18, bilge = 0.25, sternW = 0.6, bowRake = 0.08, sternRake = 0, ns = 26, nt = 6, colors }) {
    const pos = [], col = [], idx = [];
    const plan = (s) => Math.min(sternW + (1 - sternW) * smoothstep(0, 0.35, s), 1 - 0.97 * Math.pow(smoothstep(0.55, 1.0, s), 1.4));
    const deckY = (s) => D * (1 + sheerAft * Math.pow(1 - s, 3) + sheerFwd * Math.pow(s, 3));
    const cAt = (y) => { for (const [h, c] of colors) if (y <= h) return c; return colors[colors.length - 1][1]; };
    const vid = (side, i, j) => ((side > 0 ? 0 : 1) * (ns + 1) + i) * (nt + 1) + j;
    for (const side of [1, -1]) for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) {
      const s = i / ns, t = j / nt, yd = deckY(s), y = t * yd;
      const hb = B / 2 * plan(s) * Math.pow(Math.max(t, 0.02), bilge);
      const x = (s - 0.5) * L + bowRake * L * t * smoothstep(0.85, 1, s) - sternRake * L * t * smoothstep(0.15, 0, s);
      pos.push(x, y, side * hb); const c = new THREE.Color(cAt(y)); col.push(c.r, c.g, c.b);
    }
    for (const side of [1, -1]) for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
      const a = vid(side, i, j), b = vid(side, i + 1, j), c = vid(side, i + 1, j + 1), d = vid(side, i, j + 1);
      if (side > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
    // deck + transom
    const base = pos.length / 3; const dc = new THREE.Color(0x3a3430);
    for (let i = 0; i <= ns; i++) for (const side of [1, -1]) { const k = vid(side, i, nt); pos.push(pos[k * 3], pos[k * 3 + 1] - 0.05, pos[k * 3 + 2]); col.push(dc.r, dc.g, dc.b); }
    for (let i = 0; i < ns; i++) { const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    for (let j = 0; j < nt; j++) { const a = vid(1, 0, j), b = vid(1, 0, j + 1), c = vid(-1, 0, j + 1), d = vid(-1, 0, j); idx.push(a, b, c, a, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.userData.deckY = deckY; return g;
  }
  const hullM = std({ vertexColors: true, roughness: 0.65 });
  const ship = (parent, { x, z, heading = 0, draft = 2.0 }) => { const g = new THREE.Group(); g.position.set(x, SEA_Y - draft, z); g.rotation.y = heading; parent.add(g); g.userData.base = { x, z, y: SEA_Y - draft, heading }; return g; };
  const shipsE = { 1: group(setRoot, 'shipsE1'), 2: group(setRoot, 'shipsE2'), 3: group(setRoot, 'shipsE3'), 4: group(setRoot, 'shipsE4'), 5: group(setRoot, 'shipsE5') };
  const bobbers = [];
  const sailM = std({ color: 0x8a5a3a, roughness: 0.95, side: THREE.DoubleSide }), mastM = std({ color: 0x4a3a2c, roughness: 0.8 }), whiteM = std({ color: 0xd9d6cc, roughness: 0.6 }), blackM = std({ color: 0x1c1c1e, roughness: 0.55 });
  const furledM = std({ color: 0xc8bea8, roughness: 0.9 });
  function lines(parent, segs, color = 0x15140f) { const g = new THREE.BufferGeometry().setFromPoints(segs.flat()); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, fog: true })); parent.add(l); return l; }
  function junk(parent, o) {
    const g = ship(parent, { draft: 1.8, ...o }), L = o.L || 26, B = L * 0.27;
    g.add(new THREE.Mesh(hullGeo({ L, B, D: 4.4, sheerAft: 0.75, sheerFwd: 0.32, bilge: 0.45, sternW: 0.72, bowRake: 0.05, sternRake: 0.06, colors: [[1.8, 0x2a1e18], [3.6, 0x3a2a20], [4.2, 0x6a3a2a], [99, 0x2e221a]] }), hullM));
    const yd = (s) => 4.4 * (1 + 0.75 * Math.pow(1 - s, 3) + 0.32 * Math.pow(s, 3));
    box(L * 0.22, 1.6, B * 0.75, mastM, g, -L * 0.36, yd(0.12) + 0.8, 0);
    const masts = [[0.55, 0.78 * L], [0.82, 0.52 * L], [0.14, 0.34 * L]];
    for (const [s, h] of masts) {
      const mx = (s - 0.5) * L, my = yd(s); cyl(0.12, 0.2, h, mastM, g, mx, my + h / 2, 0, 6);
      // battened lug sail, half lowered (dusk at anchor): a trapezoid with batten lines
      const sh = h * 0.42, sw = h * 0.36, sy = my + h * 0.32;
      const sg = new THREE.Shape(); sg.moveTo(-sw * 0.35, 0); sg.lineTo(sw * 0.65, 0); sg.lineTo(sw * 0.6, sh); sg.quadraticCurveTo(sw * 0.1, sh * 1.06, -sw * 0.25, sh * 0.96); sg.lineTo(-sw * 0.35, 0);
      const sail = new THREE.Mesh(new THREE.ShapeGeometry(sg, 6), sailM); sail.position.set(mx, sy, 0.25); sail.rotation.y = 0.15; g.add(sail);
      const bat = []; for (let k = 0; k <= 5; k++) { const yy = sy + sh * k / 5; bat.push([V3(mx - sw * 0.35, yy, 0.3), V3(mx + sw * 0.63, yy + 0.2, 0.3)]); } lines(g, bat, 0x2a1c12);
      // pennant at the masthead (text-free, madder / indigo)
      const pm = flagMaterial(flagCanvas(s > 0.5 && s < 0.7 ? 'PM' : 'PI'), { W: 3.6, H: 0.5, droop: 0.75, taper: 0.85 });
      const pen = new THREE.Mesh(flagGeo(3.6, 0.5, 18, 2), pm); pen.position.set(mx, my + h, 0); pen.rotation.y = 1.9 + s; g.add(pen);
      (parent.userData.flags = parent.userData.flags || []).push(pm);
    }
    const rig = []; for (const [s, h] of masts) { const mx = (s - 0.5) * L; rig.push([V3(mx, yd(s) + h, 0), V3((s - 0.5 - 0.25) * L, yd(s - 0.25), B * 0.4)]); rig.push([V3(mx, yd(s) + h, 0), V3((s - 0.5 + 0.2) * L, yd(Math.min(1, s + 0.2)), -B * 0.4)]); } lines(g, rig);
    const sl = FX.glow({ color: 0xE2A458, size: 1.1, intensity: 0.5 }); sl.object3D.position.set(-L * 0.47, yd(0) + 1.4, 0); g.add(sl.object3D);
    bobbers.push({ g, amp: 0.012, per: 6.5 }); return g;
  }
  function barque(parent, o) {
    const g = ship(parent, { draft: 3.2, ...o }), L = 48, B = 9;
    g.add(new THREE.Mesh(hullGeo({ L, B, D: 7.2, sheerAft: 0.12, sheerFwd: 0.16, bilge: 0.2, sternW: 0.55, bowRake: 0.14, colors: [[3.2, 0x3a2420], [6.2, 0x161618], [6.6, 0xd2ccbe], [99, 0x161618]] }), hullM));
    for (const [s, h] of [[0.75, 34], [0.5, 37], [0.24, 28]]) {
      const mx = (s - 0.5) * L; cyl(0.25, 0.38, h, mastM, g, mx, 7 + h / 2, 0, 6);
      for (let k = 0; k < (s < 0.3 ? 2 : 4); k++) { const yy = 7 + h * (0.42 + k * 0.16), w = 15 * (1 - k * 0.16); const yd = cyl(0.12, 0.12, w, mastM, g, mx, yy, 0, 5); yd.rotation.x = Math.PI / 2; const fu = cyl(0.32, 0.32, w * 0.92, furledM, g, mx + 0.2, yy - 0.25, 0, 6); fu.rotation.x = Math.PI / 2; }
    }
    const bs = cyl(0.2, 0.3, 14, mastM, g, L * 0.55, 8.6, 0, 6); bs.rotation.z = -1.25;
    lines(g, [[V3(L * 0.25, 44, 0), V3(L * 0.75, 9, 0)], [V3(0, 44, 0), V3(L * 0.25, 41, 0)], [V3(0, 44, 0), V3(-L * 0.26, 35, 0)], [V3(-L * 0.26, 35, 0), V3(-L * 0.5, 8, 0)], [V3(0, 44, 0), V3(-4, 7.5, 4.5)], [V3(0, 44, 0), V3(-4, 7.5, -4.5)], [V3(L * 0.25, 41, 0), V3(L * 0.2, 7.5, 4.5)]]);
    bobbers.push({ g, amp: 0.008, per: 8 }); return g;
  }
  function steamer(parent, o) {
    const g = ship(parent, { draft: o.draft ?? 4.2, ...o }), L = o.L, B = o.B, D = o.D;
    g.add(new THREE.Mesh(hullGeo({ L, B, D, sheerAft: 0.06, sheerFwd: 0.12, bilge: 0.12, sternW: 0.5, bowRake: 0.06, colors: o.colors }), hullM));
    for (const [x, w, h, d, m] of o.houses) { box(w, h, d, m, g, x, D + h / 2, 0); if (o.band) box(w * 0.94, h * 0.36, d + 0.06, o.band, g, x, D + h * 0.58, 0, false); }
    if (o.funnel) { const [fx, fh, fr, fcol, band] = o.funnel; const yb = D + (o.houses[0] ? o.houses[0][2] : 2); cyl(fr, fr * 1.05, fh, std({ color: fcol, roughness: 0.6 }), g, fx, yb + fh / 2, 0, 16); if (band) cyl(fr * 1.01, fr * 1.01, fh * 0.16, std({ color: band, roughness: 0.6 }), g, fx, yb + fh * 0.62, 0, 16); cyl(fr * 1.02, fr * 1.02, fh * 0.12, blackM, g, fx, yb + fh * 0.94, 0, 16); }
    for (const [mx, mh] of o.masts || []) cyl(0.18, 0.26, mh, mastM, g, mx, D + mh / 2, 0, 6);
    if (o.masts && o.masts.length > 1) lines(g, [[V3(o.masts[0][0], D + o.masts[0][1], 0), V3(o.masts[1][0], D + o.masts[1][1], 0)], [V3(o.masts[0][0], D + o.masts[0][1], 0), V3(L * 0.5, D + 0.5, 0)], [V3(o.masts[1][0], D + o.masts[1][1], 0), V3(-L * 0.5, D + 0.5, 0)]]);
    if (o.ports) { const pts = []; const r = util.rng(o.seed || 3); const hs = o.houses[0];
      for (let k = 0; k < o.ports; k++) { const lit = r() < (o.portLit ?? 0.5), onHouse = hs && r() < 0.45, k2 = Math.floor(r() * 2); if (!lit) continue;
        if (onHouse) { const px = hs[0] + (r() - 0.5) * hs[1] * 0.9, py = D + 0.7 + k2 * Math.min(2.2, hs[2] - 1.2) * 0.9; pts.push([px, py, hs[3] / 2 + 0.05, 0xffc07a, 0.7 + r() * 0.5]); }
        else { const px = (r() - 0.5) * L * 0.62, py = D - 1.1 - k2 * 1.3; pts.push([px, py, B / 2 + 0.05, 0xffc07a, 0.6 + r() * 0.5]); } }
      const lp = lampPoints(g, pts, { px: 1.1, intensity: 2.6 }); lp.material.uniforms.uTw.value = 0.04; }
    bobbers.push({ g, amp: 0.004, per: 9 }); return g;
  }
  // ---- per-era fleets (set space; the harbour is +Z)
  junk(shipsE[1], { x: GX + 30, z: QUAY_Z + 5.5, heading: 0.08, L: 22 });
  junk(shipsE[1], { x: GX + 120, z: QUAY_Z + 34, heading: -0.5, L: 30 });
  junk(shipsE[1], { x: GX + 210, z: QUAY_Z + 90, heading: 0.3, L: 26 });
  barque(shipsE[2], { x: GX + 190, z: QUAY_Z + 55, heading: -0.35 });
  steamer(shipsE[2], { x: GX + 78, z: QUAY_Z + 6.5, heading: 0, L: 56, B: 8.5, D: 5.6, draft: 3.4, colors: [[3.4, 0x40261e], [5.2, 0x141416], [5.6, 0xc8c2b4], [99, 0x141416]],
    houses: [[2, 14, 2.4, 6, whiteM]], funnel: [-2, 11, 0.85, 0x1a1a1c, 0xb8b0a0], masts: [[18, 20], [-20, 17]], ports: 10, seed: 4 });
  steamer(shipsE[3], { x: GX + 128, z: QUAY_Z + 8.5, heading: 0, L: 92, B: 13, D: 8.4, draft: 5, colors: [[5, 0x5a2620], [8.0, 0x18181a], [8.4, 0xd9d6cc], [99, 0x18181a]],
    houses: [[0, 30, 2.6, 10, whiteM], [-2, 20, 2.4, 8, whiteM]], funnel: [-4, 9.5, 1.7, 0xB58B4A, 0x4E6273], masts: [[34, 21], [-36, 18]], ports: 46, seed: 7 });
  steamer(shipsE[4], { x: GX + 210, z: QUAY_Z + 60, heading: -0.25, L: 118, B: 17, D: 10, draft: 6, colors: [[6, 0x5a2a24], [9.6, 0x4a5058], [10, 0x8a8e90], [99, 0x4a5058]],
    houses: [[-38, 16, 9, 13, std({ color: 0xc8c6bc, roughness: 0.6 })]], funnel: [-40, 7, 1.9, 0xb9a882, 0x2a2c2e], masts: [[30, 16], [-10, 14]], ports: 18, seed: 9 });
  { const bg = ship(shipsE[4], { x: GX + 58, z: QUAY_Z + 5.5, heading: 0.02, draft: 1.4 }); bg.add(new THREE.Mesh(hullGeo({ L: 32, B: 8, D: 3.0, sheerAft: 0.04, sheerFwd: 0.04, bilge: 0.08, sternW: 0.9, colors: [[1.4, 0x2a2420], [99, 0x2c2a28]] }), hullM)); box(26, 0.8, 6.4, std({ color: 0x4a4038, roughness: 0.9 }), bg, 0, 3.4, 0); bobbers.push({ g: bg, amp: 0.01, per: 7 }); }
  steamer(shipsE[5], { x: GX + 74, z: QUAY_Z + 7.0, heading: 0, L: 44, B: 11, D: 4.6, draft: 2.0, colors: [[2.0, 0x2a3036], [4.2, 0xdcdcd8], [4.6, 0x2a3036], [99, 0xdcdcd8]],
    houses: [[2, 30, 2.6, 9.5, std({ color: 0xe6e6e2, roughness: 0.5 })], [4, 22, 2.2, 8, std({ color: 0xd8d8d4, roughness: 0.5 })]], band: std({ color: 0x1a2028, roughness: 0.1, envMapIntensity: 1.4 }), masts: [[8, 6]], ports: 14, portLit: 0.25, seed: 11 });
  // E5: container cranes far out on the right (gantry silhouettes + tiny warm obstruction lights) and the fishing lamps on the sea
  const cranes = group(shipsE[5], 'cranes');
  { const cm = std({ color: 0x3a3e44, roughness: 0.8 }), obst = [];
    for (let k = 0; k < 4; k++) { const cx = 1650 + k * 110, cz = 900 + k * 60; for (const dx of [-7, 7]) for (const dz of [-8, 8]) box(1.6, 44, 1.6, cm, cranes, cx + dx, 22, cz + dz, false); box(18, 4, 20, cm, cranes, cx, 44, cz, false); boxR(70, 2.5, 3, cm, cranes, cx + 18, 50, cz - 10, 0, -0.5, 0, false); obst.push([cx, 47, cz, 0xff9a50, 0.8], [cx + 46, 52, cz - 26, 0xff9a50, 0.6]); }
    lampPoints(cranes, obst, { px: 2.2, intensity: 2.5 }); }
  const FISH = [[97.5, 1700], [101.5, 2600], [105, 1150], [108.5, 3200]].map(([az, d]) => V3(C46.pos.x + Math.sin(az * D2R) * d, SEA_Y + 1.4, C46.pos.z - Math.cos(az * D2R) * d));
  const fishPts = lampPoints(shipsE[5], FISH.map((p) => [p.x, p.y, p.z, 0xE2A458, 1.0]), { px: 2.6, intensity: 5.0 });

  // ================================================================ DISTANT: far shores (set azimuths, east view) + era shore lights
  const farG = group(setRoot, 'far');
  const coastL = createCoast({ sky, az0: 46, az1: 89, distance: 2900, height: 74, lights: 0, haze: 0.62, level: SEA_Y, seed: 21 });
  const coastR = createCoast({ sky, az0: 107, az1: 140, distance: 4200, height: 96, lights: 0, haze: 0.72, level: SEA_Y, seed: 23 });
  farG.add(coastL.object3D, coastR.object3D);
  const shoreLights = {};
  { const r = util.rng(91);
    const mk = (n, k, az0, az1, d0, d1, hMax) => { const pts = []; for (let i = 0; i < n; i++) { const az = (az0 + (az1 - az0) * r()) * D2R, d = d0 + (d1 - d0) * r(); pts.push([Math.sin(az) * d, SEA_Y + 2 + r() * hMax, -Math.cos(az) * d, r() < 0.8 ? 0xE2A458 : 0xf0d0a0, 0.5 + r() * 0.7]); } return lampPoints(farG, pts, { px: 1.6, intensity: k }); };
    shoreLights[1] = mk(5, 2.0, 60, 88, 2400, 2800, 14); shoreLights[2] = mk(18, 2.2, 55, 88, 1800, 2800, 22); shoreLights[3] = mk(34, 2.4, 52, 88, 1500, 2800, 30);
    shoreLights[4] = mk(60, 2.5, 50, 88, 1200, 2800, 34); shoreLights[5] = mk(90, 1.4, 50, 88, 900, 2800, 40); }

  // ================================================================ THE HILLSIDE CITY (E5; S018 + far view in S080)
  const Hter = (x, z) => {
    const d = -z - 34; if (d <= 0) return 0.0;
    let h = 0.012 * Math.min(d, 140) + 96 * Math.pow(smoothstep(110, 1700, d), 1.1);
    h += 16 * Math.sin(x / 260 + 0.7) * Math.cos(x / 410 - 0.3) * smoothstep(250, 1300, d) + 8 * Math.sin(x / 95 + z / 130) * smoothstep(200, 900, d);
    h += 26 * Math.exp(-((x - 520) ** 2) / (560 ** 2) - ((z + 1450) ** 2) / (420 ** 2)) - 14 * Math.exp(-((x + 300) ** 2) / (300 ** 2) - ((z + 900) ** 2) / (500 ** 2));
    return h;
  };
  const cityG = group(setRoot, 'city');
  const terrain = (() => {
    const g = new THREE.PlaneGeometry(4200, 2400, 210, 120).rotateX(-Math.PI / 2).translate(150, 0, -1234);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Hter(p.getX(i), p.getZ(i)) - 0.6);
    g.computeVertexNormals();
    return mesh(g, std({ color: 0x1c2420, roughness: 1 }), cityG, 0, 0, 0, false);
  })();
  const CITY = (() => {
    const r = util.rng(1234), mats = [], aB = [], aT = [];
    const free = (x, z) => !((x > -150 && x < 96 && z > -60) || (z > (x > 110 && x < 700 ? 9 : -8)));
    for (let gx = -1500; gx < 1800; gx += 13) for (let gz = -1700; gz < 10; gz += 13) {
      const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 6, d = -z;
      if (!free(x, z)) continue;
      const nearCH = Math.abs(x - 32) < 260 && d < 260;
      const dens = d < 160 ? 0.88 : d < 700 ? 0.74 : d < 1300 ? 0.58 : 0.34;
      if (r() > dens * (0.75 + 0.25 * Math.sin(x / 70 + z / 55))) continue;
      const w = 6 + r() * (d < 200 && !nearCH ? 12 : 7), dp = 6 + r() * 7;
      const floors = nearCH ? 2 + Math.floor(r() * 3) : d < 200 ? 3 + Math.floor(r() * (r() < 0.25 ? 10 : 5)) : d < 700 ? 2 + Math.floor(r() * 4) : 2 + Math.floor(r() * 2.6);
      const fh = 3.0 + r() * 0.4, h = floors * fh + 0.6;
      const y = Math.min(Hter(x - w / 2, z), Hter(x + w / 2, z), Hter(x, z - dp / 2), Hter(x, z + dp / 2)) - 0.8;
      mats.push(M4(x, y, z, (r() - 0.5) * 0.2 + (d > 500 ? 0.35 * Math.sin(x / 300 + z / 400) : 0), w, h + (Hter(x, z) - y), dp));
      aB.push(r() * 97.0, (0.16 + 0.24 * r()) * (d < 300 ? 1.15 : 1), 2.8 + r() * 0.9, fh);
      const tone = 0.1 + r() * 0.16, warm = r(); aT.push(tone * (0.95 + 0.1 * warm), tone * (0.93 + 0.04 * warm), tone * (0.9 - 0.04 * warm));
    }
    return { mats, aB, aT };
  })();
  const cityU = { uSkyAmb: { value: new THREE.Color(0.01, 0.014, 0.025) }, uGndAmb: { value: new THREE.Color(0.004, 0.004, 0.005) }, uKeyDir: { value: V3(0, 1, 0) }, uKeyCol: { value: new THREE.Color(0, 0, 0) },
    uFogCol: { value: new THREE.Color(0.02, 0.03, 0.05) }, uFogDen: { value: 0.0009 }, uLit: { value: 1 }, uWin: { value: 1 }, uHide: { value: new THREE.Vector4(1e9, -1e9, 1e9, -1e9) }, uSetRot: { value: new THREE.Matrix3() } };
  const cityMesh = (() => {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mat = new THREE.ShaderMaterial({ uniforms: cityU, fog: false,
      vertexShader: /* glsl */ `attribute vec4 aB; attribute vec3 aT; uniform vec4 uHide;
        varying vec3 vP; varying vec3 vNl; varying vec3 vNw; varying vec3 vW; varying vec4 vB; varying vec3 vT;
        void main(){
          vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vP = position * sc; vNl = normal; vB = aB; vT = aT;
          vec4 lp = instanceMatrix * vec4(position, 1.0);
          vec4 wp = modelMatrix * lp; vW = wp.xyz;
          vNw = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
          vec3 o = instanceMatrix[3].xyz; if (o.x > uHide.x && o.x < uHide.y && o.z > uHide.z && o.z < uHide.w) gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `uniform vec3 uSkyAmb, uGndAmb, uKeyDir, uKeyCol, uFogCol; uniform float uFogDen, uLit, uWin;
        varying vec3 vP; varying vec3 vNl; varying vec3 vNw; varying vec3 vW; varying vec4 vB; varying vec3 vT;
        float h3(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
        void main(){
          vec3 n = normalize(vNw);
          vec3 col = vT * (mix(uGndAmb, uSkyAmb, n.y * 0.5 + 0.5) + uKeyCol * max(dot(n, uKeyDir), 0.0));
          if (abs(vNl.y) < 0.5) {
            float u = abs(vNl.x) > 0.5 ? vP.z * sign(vNl.x) : -vP.x * sign(vNl.z);
            float face = vNl.x > 0.5 ? 1.0 : vNl.x < -0.5 ? 2.0 : vNl.z > 0.5 ? 3.0 : 4.0;
            vec2 g = vec2(u / vB.z, (vP.y - 0.6) / vB.w);
            vec2 c = floor(g), f = fract(g), fw = fwidth(g);
            float wx = smoothstep(0.3 - fw.x, 0.3 + fw.x, f.x) * (1.0 - smoothstep(0.7 - fw.x, 0.7 + fw.x, f.x));
            float wy = smoothstep(0.34 - fw.y, 0.34 + fw.y, f.y) * (1.0 - smoothstep(0.8 - fw.y, 0.8 + fw.y, f.y));
            float win = wx * wy * step(0.0, g.y);
            float hA = h3(vec3(c, face + vB.x)), hB = h3(vec3(c.yx + 17.0, face * 3.1 + vB.x));
            float lit = step(hA, vB.y * uLit);
            vec3 wc = mix(vec3(1.0, 0.6, 0.3), vec3(0.95, 0.78, 0.58), hB); if (hB > 0.92) wc = vec3(0.7, 0.8, 0.95);
            float far = smoothstep(0.16, 0.5, max(fw.x, fw.y));
            vec3 em = mix(wc * (0.3 + 0.75 * hB * hB) * win * lit, vec3(1.0, 0.66, 0.36) * 0.17 * vB.y * uLit * 0.55, far) * uWin;
            col = mix(col, col * 0.45 + uSkyAmb * 0.6, win * (1.0 - lit) * (1.0 - far));
            col += em;
          } else col *= 0.75;
          float d = length(vW - cameraPosition);
          col = mix(col, uFogCol, 1.0 - exp(-d * uFogDen));
          gl_FragColor = vec4(col, 1.0);
        }` });
    const im = new THREE.InstancedMesh(geo, mat, CITY.mats.length); CITY.mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
    geo.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(CITY.aB), 4)); geo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(CITY.aT), 3));
    im.frustumCulled = false; cityG.add(im); return im;
  })();
  // street lamps of the city (warm sodium-ish + a few cool LEDs) along contour "streets"
  const cityLamps = (() => {
    const r = util.rng(77), pts = [];
    for (let k = 0; k < 52; k++) { const z0 = -50 - k * 31 - r() * 12; for (let x = -1500 + r() * 40; x < 1800; x += 14 + r() * 22) { const z = z0 + 18 * Math.sin(x / 140 + k); if (z > -60 && x > -150 && x < 96) continue; if (r() < 0.2) continue; pts.push([x, Hter(x, z) + 4.5, z, r() < 0.75 ? 0xe8a868 : 0xdfe8f2, 0.45 + r() * 0.6]); } }
    for (let x = -800; x < 1400; x += 22) if (x < -120 || x > 80) pts.push([x, 5.5, -3, 0xe0e6ee, 0.8]);
    return lampPoints(cityG, pts, { px: 1.25, intensity: 3.2 });
  })();
  // a few anchored ships' lights on the harbour (S018)
  const harbourLights = lampPoints(cityG, [[-180, SEA_Y + 6, 160, 0xE2A458, 1], [-140, SEA_Y + 9, 175, 0xf0d6a8, 0.8], [260, SEA_Y + 5, 140, 0xE2A458, 1], [420, SEA_Y + 7, 230, 0xE2A458, 0.9], [120, SEA_Y + 4, 210, 0xd0e0f0, 0.6]], { px: 2.2, intensity: 4 });

  // ================================================================ THE LAB (S018: the one lit window; restorer at her bench)
  const labG = group(setRoot, 'lab');
  const labLamp = new THREE.PointLight(0xffd2a0, 0, 0, 2); labG.add(labLamp);
  {
    const wallM = std({ color: 0xD9D4CA, roughness: 0.9 }), x0 = 55.2, x1 = 63.4, z0 = -7.0, z1 = -0.6, y0 = CH.plinth, y1 = CH.gf - 0.05;
    box(x1 - x0, y1 - y0, 0.1, wallM, labG, (x0 + x1) / 2, (y0 + y1) / 2, z0, false);
    box(0.1, y1 - y0, z1 - z0, wallM, labG, x0, (y0 + y1) / 2, (z0 + z1) / 2, false); box(0.1, y1 - y0, z1 - z0, wallM, labG, x1, (y0 + y1) / 2, (z0 + z1) / 2, false);
    box(x1 - x0, 0.1, z1 - z0, std({ color: 0x9A958C, roughness: 0.6 }), labG, (x0 + x1) / 2, y0, (z0 + z1) / 2, false);
    box(x1 - x0, 0.1, z1 - z0, wallM, labG, (x0 + x1) / 2, y1, (z0 + z1) / 2, false);
    box(3.0, 0.06, 0.9, std({ color: 0x8a6a48, roughness: 0.5 }), labG, 58, y0 + 0.9, -1.2, false);
    box(2.9, 0.86, 0.06, std({ color: 0x3a3c40, roughness: 0.6 }), labG, 58, y0 + 0.45, -1.62, false);
    for (let k = 0; k < 4; k++) box(1.2, 1.1, 0.5, std({ color: 0x4A4E52, roughness: 0.55, metalness: 0.4 }), labG, 56.2 + k * 1.3, y0 + 0.55, -6.6, false);
    box(2.4, 1.6, 0.35, std({ color: 0x5a4a3a, roughness: 0.8 }), labG, 61.6, y0 + 2.2, -6.75, false);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 14, 1, true), std({ color: 0x2a2a2a, emissive: new THREE.Color(0xffd2a0), emissiveIntensity: 0.4, side: THREE.DoubleSide })); shade.position.set(56.95, y0 + 1.55, -1.1); shade.rotation.z = 0.5; labG.add(shade);
    const gl = FX.glow({ color: 0xffd8a8, size: 0.5, intensity: 0.8 }); gl.object3D.position.set(57.05, y0 + 1.42, -1.05); labG.add(gl.object3D);
    labLamp.position.set(57.1, y0 + 1.4, -1.0);
    const shelf = FX.glow({ color: 0xffb070, size: 0.3, intensity: 0.6 }); shelf.object3D.position.set(61.6, y0 + 3.1, -6.5); labG.add(shelf.object3D);
    // see-through lab sash: frame + muntins as geometry, faint glass
    const fr = M.joinery;
    for (const s of [-1, 1]) box(0.09, 2.0, 0.08, fr, labG, 58 + s * 1.15, 2.8, -0.3, false);
    box(2.4, 0.1, 0.08, fr, labG, 58, 1.85, -0.3, false); box(2.4, 0.07, 0.08, fr, labG, 58, 3.8, -0.3, false); box(2.4, 0.08, 0.08, fr, labG, 58, 2.85, -0.3, false);
    for (const s of [-1, 1]) box(0.045, 2.0, 0.05, fr, labG, 58 + s * 0.4, 2.8, -0.3, false);
    for (const y of [2.35, 3.33]) box(2.3, 0.04, 0.05, fr, labG, 58, y, -0.3, false);
    { const arc = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.045, 5, 24, Math.PI), fr); arc.position.set(58, 3.8, -0.3); labG.add(arc); const arc2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 4, 16, Math.PI), fr); arc2.position.set(58, 3.8, -0.3); labG.add(arc2);
      for (let k = 1; k < 4; k++) { const a = Math.PI * k / 4; const sp = box(0.03, 0.75, 0.04, fr, labG, 0, 0, 0, false); sp.position.set(58 + Math.cos(a) * 0.79, 3.8 + Math.sin(a) * 0.79, -0.3); sp.rotation.z = a - Math.PI / 2; } }
    const glass = new THREE.Mesh(archPlane(2.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.2 }));
    glass.position.set(58, 1.8, -0.27); labG.add(glass);
    // warm spill through the window onto the quay
    const spill = new THREE.SpotLight(0xffc896, 0, 22, 0.75, 0.9, 2); spill.position.set(58, 3.6, -3.2); spill.target.position.set(58, 0, 7); labG.add(spill, spill.target); labG.userData.spill = spill;
  }
  const rest = await loadCharacter('RESTORER', { lod: 'mid' });
  labG.add(rest.root);
  rest.root.position.set(57.9, CH.plinth, -2.05); rest.root.rotation.y = 0; // facing the window (south, +Z)
  const stool = box(0.45, 0.5, 0.45, std({ color: 0x2a2a2c }), labG, 57.9, CH.plinth + 0.25, -2.15, false);

  // ================================================================ FIGURES (per era; the waiting person always on SPOT)
  await Promise.all(['home', 'navigator', 'maphand', 'migrant', 'chapel'].map((e) => preloadCrowd(e)));
  const mig = await loadCharacter('MIGRANT', { lod: 'hi' });
  const child = await loadCharacter('CHILD', { lod: 'mid' });
  const figs = {
    E1: makeExtra('home', 104), E2: makeExtra('navigator', 101), E4: makeExtra('chapel', 102),
    g2a: makeExtra('maphand', 101), g2b: makeExtra('maphand', 102), g3a: makeExtra('migrant', 101), g3b: makeExtra('migrant', 103), g4a: makeExtra('chapel', 101), g4b: makeExtra('chapel', 103),
  };
  for (const f of Object.values(figs)) setRoot.add(f.root);
  setRoot.add(mig.root, child.root);
  const recolor = (f, col, skip = ['skin', 'hair']) => { for (const [k, m] of Object.entries(f.materials)) if (!skip.some((s) => k.startsWith(s)) && m && m.color) m.color.setHex(col); };
  const recolorN = (f, prefix, col) => { for (const [k, m] of Object.entries(f.materials)) if (k.startsWith(prefix) && m && m.color) m.color.setHex(col); };
  recolor(figs.E1, 0x4a5568); recolorN(figs.E1, 'skirt', 0x2a2826); recolorN(figs.E1, 'shoes', 0x1e1c1a);
  for (const k of ['g2a', 'g2b']) recolor(figs[k], 0xE6E1D6);
  for (const k of ['g3a', 'g3b']) recolor(figs[k], 0x7d7866);
  for (const k of ['g4a', 'g4b']) { recolor(figs[k], 0xA9ADB0); recolorN(figs[k], 'trousers', 0x4e5560); recolorN(figs[k], 'shoes', 0x1c1c1e); }
  for (const k of ['g2a', 'g2b']) recolorN(figs[k], 'shoes', 0x2a2420);
  for (const k of ['g3a', 'g3b']) { recolorN(figs[k], 'trousers', 0x6e6a58); recolorN(figs[k], 'shoes', 0x241e18); }
  recolorN(figs.E4, 'shirt', 0xd8d4c8);
  if (DBG) console.warn('harbor mats', Object.keys(figs.E1.materials).join(','), '|', Object.keys(figs.g3a.materials).join(','));
  // hats (attached to the head bone): E2 soft-top cap with band, E3 peaked cap with invented ring-and-wave badge, E4 soft cap
  function hat(f, kind) {
    const hb = f.bone('head'), hu = f.P.hu || 0.23, g = new THREE.Group();
    const col = kind === 'E2' ? 0xEDEAE2 : kind === 'E3' ? 0x77735f : 0x9ea4a8;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(kind === 'E3' ? 0.125 : 0.108, 0.1, kind === 'E2' ? 0.09 : 0.075, 14), std({ color: col, roughness: 0.8 })); g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.03, 14), std({ color: kind === 'E2' ? 0x2b3346 : 0x3a3024 })); band.position.y = -0.03; g.add(band);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 14, 1, false, -Math.PI / 2, Math.PI), std({ color: 0x141414, roughness: 0.4 })); visor.position.set(0, -0.045, 0.03); visor.scale.set(1, 1, 0.7); g.add(visor);
    if (kind === 'E3') { const b = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), std({ color: 0xb09060, metalness: 0.7, roughness: 0.4 })); b.position.set(0, -0.02, 0.104); g.add(b); }
    g.position.set(0, 0.78 * hu, 0.01 * hu); g.rotation.x = -0.06; hb.add(g); return g;
  }
  hat(figs.g2a, 'E2'); hat(figs.g2b, 'E2'); hat(figs.g3a, 'E3'); hat(figs.g3b, 'E3'); hat(figs.g4a, 'E4');
  if (figs.E2.layers.hair) { /* headcloth stays */ }
  // props: E1 bamboo basket (in her right hand), E2 carrying pole with two loads, E3 rattan case (right hand)
  const rattanM = TX.mat('rattan', { repeat: [2, 1], tex: { seed: 13, age: 0.4 } });
  const basket = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.24, 16, 1, true), std({ map: rattanM.map, normalMap: rattanM.normalMap, roughness: 0.85, color: 0xc8b088, side: THREE.DoubleSide })); b.position.y = -0.34; g.add(b);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(0.15, 14), std({ color: 0x6a5434 })); bot.rotation.x = -Math.PI / 2; bot.position.y = -0.46; g.add(bot);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 5, 18, Math.PI), std({ color: 0x8a6a40 })); h.position.y = -0.22; g.add(h);
    const greens = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6), std({ color: 0x4a5a34, roughness: 0.9 })); greens.scale.set(1, 0.35, 1); greens.position.y = -0.24; g.add(greens);
    setRoot.add(g); return g; })();
  const poleLoad = (() => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 6), std({ color: 0x9a8058 })); p.rotation.x = Math.PI / 2; g.add(p);
    for (const s of [-1, 1]) { const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), M.rope); rp.position.set(0, -0.35, s * 0.82); g.add(rp); const ld = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.36, 12), std({ map: rattanM.map, color: 0xa89068, roughness: 0.9 })); ld.position.set(0, -0.86, s * 0.82); g.add(ld); const top = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 6), std({ color: 0x6e6252, roughness: 0.95 })); top.scale.set(1, 0.4, 1); top.position.set(0, -0.68, s * 0.82); g.add(top); }
    setRoot.add(g); return g; })();
  const caseObj = (() => { const g = new THREE.Group(); const W = 0.58, H = 0.38, D = 0.21;
    const c = new THREE.Mesh(new THREE.BoxGeometry(D, H, W), [rattanM, rattanM, rattanM, rattanM, rattanM, rattanM]); c.position.y = -0.05 - H / 2; g.add(c);
    const lea = std({ color: 0x6A4A30, roughness: 0.55 }); for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(D + 0.012, H + 0.012, 0.035), lea); st.position.set(0, -0.05 - H / 2, s * 0.15); g.add(st); }
    const bk = new THREE.Mesh(new THREE.BoxGeometry(D + 0.02, 0.03, 0.03), std({ color: 0x9A7D4E, metalness: 0.8, roughness: 0.4 })); bk.position.set(0, -0.05 - H * 0.35, 0.15); g.add(bk);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 5, 12, Math.PI), std({ color: 0x7A5530, roughness: 0.6 })); hd.rotation.y = Math.PI / 2; hd.position.y = -0.05; g.add(hd);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); setRoot.add(g); return g; })();
  // background people per era (static instanced crowd, beyond the gate / along the quay)
  const crowdOf = (era, people) => { const c = makeCrowd(era, people, { castShadow: true }); setRoot.add(c); return c; };
  const crowds = {
    E1: crowdOf('navigator', [{ pos: [GX + 26, 0, QUAY_Z - 3.2], rotY: 2.2, pose: 'stand', seed: 1 }, { pos: [GX + 29, 0, QUAY_Z - 2.4], rotY: -1.6, pose: 'walk', phase: 0.3, seed: 2 }, { pos: [GX + 52, 0, QUAY_Z - 6], rotY: 0.4, pose: 'stand', seed: 3 }, { pos: [GX + 61, 0, QUAY_Z - 5.0], rotY: -2.6, pose: 'walk', phase: 0.6, seed: 4 }]),
    E2: crowdOf('maphand', [{ pos: [GX + 22, 0, QUAY_Z - 4], rotY: 1.7, pose: 'walk', phase: 0.1, seed: 0 }, { pos: [GX + 46, 0, QUAY_Z - 2.6], rotY: -1.5, pose: 'stand', seed: 3 }, { pos: [GX + 70, 0, 4.5], rotY: 3.0, pose: 'stand', seed: 2 }]),
    E3: crowdOf('migrant', [{ pos: [GX + 14, 0, QUAY_Z - 3.5], rotY: 1.5, pose: 'walk', phase: 0.2, seed: 0 }, { pos: [GX + 16, 0, QUAY_Z - 2.6], rotY: 1.6, pose: 'walk', phase: 0.7, seed: 4 }, { pos: [GX + 34, 0, QUAY_Z - 2.0], rotY: 0.2, pose: 'stand', seed: 5 }, { pos: [GX + 36, 0, QUAY_Z - 2.6], rotY: -0.4, pose: 'stand', seed: 1 }, { pos: [GX + 58, 0, 5], rotY: 1.6, pose: 'walk', phase: 0.45, seed: 2 }]),
    E4: crowdOf('chapel', [{ pos: [GX + 24, 0, QUAY_Z - 4.5], rotY: 1.4, pose: 'walk', phase: 0.35, seed: 0 }, { pos: [GX + 44, 0, 6], rotY: -1.7, pose: 'stand', seed: 3 }, { pos: [GX + 12, 0, GZ - 8], rotY: 0.6, pose: 'stand', seed: 2 }]),
  };

  // ================================================================ LIGHTS
  const key = new THREE.DirectionalLight(0xffffff, 1); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  { const c = key.shadow.camera; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 400; }
  setRoot.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0x8090b0, 0x2a2622, 1); scene.add(hemi);
  const pA = new THREE.PointLight(0xffb062, 0, 0, 2), pB = new THREE.PointLight(0xffb062, 0, 0, 2); setRoot.add(pA, pB);
  function setKey(azSet, elDeg, color, intensity, target) {
    const a = azSet * D2R, e = elDeg * D2R, t = target || V3(GX, 0, GZ);
    key.position.set(t.x + Math.sin(a) * Math.cos(e) * 160, t.y + Math.sin(e) * 160, t.z - Math.cos(a) * Math.cos(e) * 160);
    key.target.position.copy(t); key.color.set(color); key.intensity = intensity; key.target.updateMatrixWorld();
  }

  // E5: the east-end light (bay reading lamp seen through the last glazed arch) — a small steady warm point
  const bayGlow = FX.glow({ color: 0xffb46a, size: 1.6, intensity: 0.0, falloff: 2.2 }); bayGlow.object3D.position.copy(BAYP).add(V3(0, 0, 0.5)); setRoot.add(bayGlow.object3D);
  // S080 skylight band: a soft high spot sliding R→L over the quay onto the empty spot + its sheen on the water
  const bandL = new THREE.SpotLight(0xffe6cc, 0, 0, 0.32, 1.0, 0); setRoot.add(bandL, bandL.target);
  const bandSheen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radial, color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  bandSheen.rotation.x = -Math.PI / 2; bandSheen.renderOrder = 4; setRoot.add(bandSheen);

  // ================================================================ STATE (era + time of day)
  const ERA_GROUPS = { e1G, gateE1, e1Lights, stepsG, chG, gateStone, e3G, e4G };
  function state(era, tod, T) {
    const E1 = era === 1;
    e1G.visible = gateE1.visible = e1Lights.visible = E1; earthG.visible = E1; postsE1.visible = E1; stepsG.visible = era <= 2;
    chG.visible = gateStone.visible = !E1; pave.visible = !E1; bollards.visible = !E1;
    e3G.visible = era === 3 || era === 4; e4G.visible = era === 4;
    for (const k of ['E2', 'E3', 'E4', 'E5']) lampsG[k].g.visible = k === 'E' + era;
    for (let e = 1; e <= 5; e++) { shipsE[e].visible = e === era; shoreLights[e].visible = e === era; props[e].visible = e === era; }
    // E3 keeps the bracket lamps on the gate piers; E4 the canopy but no pier lamps
    flags.FB.visible = era === 2; flags.FC.visible = era === 3; flags.FD.visible = era === 4;
    // facade per era: E2 fresh lime render · E3 render greyed with streaks · E4 repainted buff with white trim · E5 brick + patchy lime
    const U = M.facade.userData.U, Ut = M.facadeTrim.userData.U;
    if (era === 2) { U.uCover.value = 1; U.uPaint.value.setRGB(1.04, 1.02, 0.98); U.uGrime.value = 0.08; M.facade.normalScale.set(0.15, 0.15); }
    if (era === 3) { U.uCover.value = 1; U.uPaint.value.setRGB(0.86, 0.84, 0.8); U.uGrime.value = 0.6; M.facade.normalScale.set(0.2, 0.2); }
    if (era === 4) { U.uCover.value = 1; U.uPaint.value.setRGB(1.0, 0.8, 0.52); U.uGrime.value = 0.12; M.facade.normalScale.set(0.15, 0.15); }
    if (era === 5) { U.uCover.value = 0.5; U.uPaint.value.setRGB(0.74, 0.73, 0.7); U.uGrime.value = 0.3; M.facade.normalScale.set(0.8, 0.8); }
    Ut.uCover.value = era === 5 ? 0.42 : 1; Ut.uPaint.value.copy(U.uPaint.value).multiplyScalar(era === 4 ? 1.12 : 1.0); Ut.uGrime.value = U.uGrime.value;
    arcGlaze.visible = arcGlazeEnd.visible = era === 5;
    for (const k of Object.keys(figs)) figs[k].root.visible = false; mig.root.visible = child.root.visible = false;
    basket.visible = poleLoad.visible = caseObj.visible = false;
    for (const k of Object.keys(crowds)) crowds[k].visible = k === 'E' + era;
    cityG.visible = era === 5; labG.visible = false; labSash.visible = true; rest.root.visible = false;
    M.steelGlazeLit.emissive.setHex(0xffb46a); M.steelGlazeLit.emissiveIntensity = tod === 'dawn' ? 0.9 : 0; labLamp.intensity = 0; labG.userData.spill.intensity = 0;
    M.steelGlaze.envMapIntensity = tod === 'night' ? 3.0 : 1.5;
    key.castShadow = tod === 'dusk'; bayGlow.set(0); bandL.intensity = 0; bandSheen.visible = false; cityLamps.visible = harbourLights.visible = tod === 'night';
    terrain.visible = true;
    scene.environment = ENV[tod]; scene.environmentIntensity = tod === 'night' ? 0.8 : 1.0;
  }
  // practical lights near the gate per era (pA: gate, pB: first quay lamp on the right)
  function practicals(era, T) {
    const f = util.flicker(T, 3), f2 = util.flicker(T + 1.7, 8);
    pA.intensity = pB.intensity = 0;
    lantern.update(T, { intensity: 0 });
    if (era === 1) {
      pA.color.setHex(0xffa050); pA.position.set(LANT.x - 0.1, LANT.y, LANT.z); pA.intensity = 2.6 * f;
      pB.color.setHex(0xff9440); pB.position.set(GX + 4.5, 2.8, QUAY_Z - 1.2); pB.intensity = 6.0 * f2;
      torches.forEach((t, i) => { const fi = util.flicker(T + i * 0.73, 11 + i); t.fl.material.uniforms.uT.value = T + i; t.fl.material.uniforms.uInt.value = 5 * fi; t.fl.material.uniforms.uLean.value = 0.12 + 0.1 * util.fbm1(T * 0.8, i); t.gl.set(0.4 * fi); t.p.material.color.copy(t.p.userData.col).multiplyScalar(t.p.userData.k * fi); });
    }
    if (era === 2) { pA.color.setHex(0xffb062); pA.position.set(GX - 0.2, 3.8, GZ); pA.intensity = 4.5 * (0.96 + 0.04 * f); pB.color.setHex(0xffb062); pB.position.set(-30, 3.5, QUAY_Z - 0.9); pB.intensity = 5.0; }
    if (era === 3) { pA.color.setHex(0xffc27a); pA.position.set(GX - 0.4, 3.85, GZ); pA.intensity = 6.0; pB.color.setHex(0xffc27a); pB.position.set(-30, 4.5, QUAY_Z - 1.6); pB.intensity = 7.0; }
    if (era === 4) { pA.color.setHex(0xe0a860); pA.position.set(-30, 7.5, QUAY_Z - 2.4); pA.intensity = 22; pB.color.setHex(0xe0a860); pB.position.set(GX + 1.4, 1.6, GZ - 4.2 - 0.9); pB.intensity = 0.6; }
    if (era === 5) { pA.color.setHex(0xeef2f8); pA.position.set(-30, 6.3, QUAY_Z - 1.2); pA.intensity = 10; }
  }

  // ---- figure staging on the spot (the waiting person); facing the gate (+X), turned ~20° toward the water
  const faceE = Math.PI / 2 - 0.36;
  function stand(f, x, z, rotY, T, weight = 0.3, seed = 0) {
    f.root.visible = true; f.root.position.set(x, 0, z); f.root.rotation.set(0, rotY, 0);
    f.pose('stand', { weight: weight + 0.15 * Math.sin(T * 0.4 + seed) }); f.breathe(T + seed, 1); f.root.updateMatrixWorld(true);
  }
  const local = (f, x, y, z) => f.root.localToWorld(V3(x, y, z));
  function waitingPerson(era, T) {
    const x = SPOT.x, z = SPOT.z;
    if (era === 1) { const f = figs.E1; stand(f, x, z, faceE + 0.1, T, 0.4, 1); f.reach('R', local(f, -0.24, 0.78, 0.06), { fingers: V3(0, -1, 0) }); f.root.updateMatrixWorld(true);
      basket.visible = true; const w = f.hands?.R ? f.hands.R.sockets.grip.getWorldPosition(V3()) : f.worldPos('armR.hand'); basket.position.copy(setRoot.worldToLocal(w)); basket.rotation.set(0, faceE, 0.05 * Math.sin(T * 1.3)); f.lookAt(setRoot.localToWorld(V3(GX + 6, 1.4, GZ + 3)), 0.4); }
    if (era === 2) { const f = figs.E2; stand(f, x, z, faceE, T, -0.3, 2);
      const sh = local(f, -0.17, f.P.H * 0.82, 0.0); poleLoad.visible = true; poleLoad.position.copy(setRoot.worldToLocal(sh.clone())); poleLoad.rotation.set(0, faceE, 0); poleLoad.position.y += 0.05;
      f.reach('R', local(f, -0.2, f.P.H * 0.86, 0.32), { fingers: V3(0, 0, 1).applyQuaternion(f.root.getWorldQuaternion(new THREE.Quaternion())) }); }
    if (era === 3) { const f = mig; stand(f, x, z, faceE + 0.05, T, 0.35, 3);
      f.reach('R', local(f, -0.21, 0.74, 0.03), { palm: V3(1, 0, 0).applyQuaternion(f.root.getWorldQuaternion(new THREE.Quaternion())), fingers: V3(0, -1, 0.05) }); f.hands.R?.pose('rattan');
      f.root.updateMatrixWorld(true); const g = f.hands.R ? f.hands.R.sockets.grip.getWorldPosition(V3()) : f.worldPos('armR.hand');
      caseObj.visible = true; caseObj.position.copy(setRoot.worldToLocal(g)); caseObj.rotation.set(0, faceE + 0.05, 0.02 * Math.sin(T * 0.9));
      f.lookAt(setRoot.localToWorld(V3(GX + 30, 1.6, GZ + 8)), 0.35); }
    if (era === 4) { const f = figs.E4; stand(f, x - 0.1, z - 0.25, faceE + 0.05, T, 0.2, 4);
      const c = child; c.root.visible = true; c.root.position.set(x + 0.05, 0, z + 0.4); c.root.rotation.set(0, faceE - 0.1, 0); c.pose('stand', { weight: 0.5 * Math.sin(T * 0.7) }); c.breathe(T, 1.2); c.root.updateMatrixWorld(true);
      const hp = local(f, -0.32, 0.8, 0.12).lerp(local(c, 0.2, c.P.H * 0.52, 0.06), 0.5);
      f.reach('R', hp.clone().add(V3(0, 0.02, 0)), { fingers: V3(0, -1, 0) }); c.reach('L', hp.clone().add(V3(0, -0.02, 0)), { fingers: V3(0, -1, 0) });
      c.lookAt(f.eye(), 0.4); }
  }
  function guards(era, T) {
    const gIn = (f, dx, dz, rot, s) => { stand(f, GX + dx, GZ + dz, rot, T, 0.2, s); };
    if (era === 2) { gIn(figs.g2a, 1.0, -0.72, -Math.PI / 2 + 0.25, 5); gIn(figs.g2b, 4.2, 0.85, -Math.PI / 2 - 0.3, 6); }
    if (era === 3) { gIn(figs.g3a, 1.0, -0.7, -Math.PI / 2 + 0.3, 7); gIn(figs.g3b, 4.6, 0.9, -Math.PI / 2 - 0.4, 8); }
    if (era === 4) { gIn(figs.g4a, 0.95, -0.72, -Math.PI / 2 + 0.25, 9); gIn(figs.g4b, 1.6, -4.4, -Math.PI / 2 + 0.9, 10); }
  }
  function animate(T) {
    for (const b of bobbers) { const u = b.g.userData.base; b.g.position.y = u.y + 0.05 * Math.sin(T * 2 * Math.PI / b.per + u.x); b.g.rotation.set(b.amp * Math.sin(T * 2 * Math.PI / b.per + u.z), u.heading, b.amp * 0.6 * Math.sin(T * 2 * Math.PI / (b.per * 1.3) + 1)); }
    for (const f of Object.values(flags)) f.material.userData.U.uT.value = T;
    for (const e of [1, 2, 3, 4, 5]) for (const pm of shipsE[e].userData.flags || []) pm.userData.U.uT.value = T + e;
    for (const p of [fishPts, cityLamps, harbourLights, ...Object.values(shoreLights)]) p.material.uniforms.uT.value = T;
    coastL.update(T); coastR.update(T);
  }
  function placeCam(pos, yaw, pitch, mm) {
    const y = yaw * D2R, p = pitch * D2R;
    const pw = setRoot.localToWorld(pos.clone()), tw = setRoot.localToWorld(pos.clone().add(V3(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p))));
    cam.place(camera, pw, tw); cam.lens(camera, mm); camera.updateMatrixWorld(true);
  }
  function dbgLog(tag) {
    if (!DBG) return; const pr = (p) => { const v = setRoot.localToWorld(p.clone()).project(camera); return [((v.x + 1) / 2).toFixed(3), ((1 - v.y) / 2).toFixed(3)]; };
    console.warn('harbor', tag, JSON.stringify({ spot: pr(SPOT), th: pr(TH), thL: pr(V3(TH.x, 0.13, GZ - 1.2)), thR: pr(V3(TH.x, 0.13, GZ + 1.2)), lant: pr(LANT), bay: pr(V3(58, 7.6, 0)), flag: pr(V3(FP.x, FP.y + 7.4, FP.z)), win18: pr(W18), corner: pr(V3(64, 3, 0)) }));
  }

  // ================================================================ SHOT SET-UPS
  const setups = {
    // ---------------------------------------------------------------- S046 — locked, four eras, hard cuts on the beat
    S046(tl, u, T0, shot) {
      const f = Math.round(T0 * 24), era = f < CUT_E2 ? 1 : f < CUT_E3 ? 2 : f < CUT_E4 ? 3 : 4;
      state(era, 'dusk', T0); M.paving.userData.wet.uWet.value = 1.0;
      sky.set(SKY46); seaSky.set(SKY46); sky.update(T0); seaSky.update(T0);
      // unified dusk: afterglow from behind camera-right (set WSW, low), deep-blue sky fill; same in every slice
      setKey(256, 13, 0xf0b4a0, 1.55, V3(GX, 0, GZ));
      hemi.color.setRGB(0.42, 0.48, 0.68); hemi.groundColor.setRGB(0.16, 0.13, 0.12); hemi.intensity = 0.62;
      fog.color.setRGB(0.24, 0.24, 0.32); fog.density = 0.0012;
      practicals(era, T0);
      waitingPerson(era, T0); guards(era, T0);
      animate(T0);
      placeCam(C46.pos, C46.yaw, C46.pitch, C46.mm); camera.near = 1; camera.far = 9000;
      sea.setLamps(era === 1 ? [{ position: setRoot.localToWorld(V3(GX + 4.5, 2.6, QUAY_Z - 1.2)), color: 0xff9440, intensity: 6 }] : [{ position: setRoot.localToWorld(V3(-6, 4, QUAY_Z - 1)), color: era === 4 ? 0xe0a860 : 0xffb062, intensity: 4 }, { position: setRoot.localToWorld(V3(18, 4, QUAY_Z - 1)), color: era === 4 ? 0xe0a860 : 0xffb062, intensity: 3 }]);
      sea.update(T0, camera);
      dbgLog('S046 E' + era);
      // one dusk grade; per-era offsets only in practicals' warmth and texture (CT_BASE / CT_MIG softness / E4 desaturation)
      const per = [null, { temp: 0.06, saturation: 0.9, grain: 0.04 }, { temp: -0.02, saturation: 0.88, grain: 0.042 }, { temp: 0.02, saturation: 0.8, contrast: 0.98, grain: 0.046, gamma: [1.02, 1.02, 1.0] }, { temp: 0.0, saturation: 0.76, grain: 0.044 }][era];
      return { dof: null, exposure: 1.45, contrast: 1.03, vignette: 0.36, bloom: { strength: 0.42, radius: 0.55, threshold: 0.78 }, ...per };
    },
    // ---------------------------------------------------------------- S080 — the same locked frame today at dawn (E5)
    // Cut in on the tail swell (246.06). Pre-sunrise: no direct sun, the sky is the light (blue-grey → soft peach); 248.10
    // (tl 2.04) a band of brighter skylight slides right → left over the water and the quay and settles on the empty spot.
    S080(tl, u, T0) {
      state(5, 'dawn', T0);
      cityG.visible = false; M.paving.userData.wet.uWet.value = 1.0;                                    // the old customs house alone against the waterfront (no towers)
      const t = clamp(tl / 3.25), up = smoothstep(0, 1, t);
      sky.blend(SKY80a, SKY80b, up); seaSky.blend(SKY80a, SKY80b, up); sky.update(T0); seaSky.update(T0);
      setKey(101, 18, 0xe8d4c8, lerp(0.12, 0.2, up), V3(GX, 0, GZ));   // faint directional share of the dawn sky (no specular glare)
      hemi.color.setRGB(0.55, 0.6, 0.74); hemi.groundColor.setRGB(0.2, 0.18, 0.17); hemi.intensity = lerp(0.95, 1.2, up);
      fog.color.copy(sky.horizonColor()).multiplyScalar(0.95); fog.density = 0.0011;
      practicals(5, T0); pA.intensity *= 1 - 0.4 * up;
      bayGlow.set(0.55);
      // the skylight band: travels from the water (+Z) onto the spot 2.04 → 2.70 s, the spot keeps a soft residue
      const bt = smoothstep(2.04, 2.72, tl), bz = lerp(SPOT.z + 34, SPOT.z, bt), bI = smoothstep(1.95, 2.25, tl) * (1 - 0.45 * smoothstep(2.75, 3.6, tl));
      bandL.position.set(SPOT.x + 9, 42, bz + 6); bandL.target.position.set(SPOT.x + 1.5, 0, bz); bandL.target.updateMatrixWorld(); bandL.intensity = 1.25 * bI;
      bandSheen.visible = bI > 0.001; const over = smoothstep(QUAY_Z + 2, QUAY_Z + 12, bz);
      bandSheen.position.set(SPOT.x + 30, SEA_Y + 0.15, Math.max(bz, QUAY_Z + 6)); bandSheen.scale.set(120, 26, 1); bandSheen.material.color.setRGB(0.07, 0.065, 0.06).multiplyScalar(bI * over);
      animate(T0);
      placeCam(C46.pos, C46.yaw, C46.pitch, C46.mm); camera.near = 1; camera.far = 9000;
      sea.setLamps(FISH.map((p) => ({ position: setRoot.localToWorld(p.clone()), color: 0xE2A458, intensity: 26 })));
      sea.update(T0, camera);
      dbgLog('S080');
      return { dof: null, exposure: lerp(1.3, 1.42, up), temp: lerp(-0.06, 0.08, up), saturation: 0.86, contrast: 1.0, vignette: 0.32, grain: 0.034, bloom: { strength: 0.38, radius: 0.6, threshold: 0.8 } };
    },
    // ---------------------------------------------------------------- S018 — lab window → heavy-lift rise + pull-back → veiled moon
    S018(tl, u, T0) {
      state(5, 'night', T0);
      sky.set(SKY18W); sky.update(T0);
      seaSky.set({ ...SKY18W, moonElev: 14, moonAz: MOON_AZW - 14, moonIntensity: 3.2, cloudCover: 0.25 }); seaSky.update(T0);
      // veil: the moon reads as a glow behind gathering cloud, the veil thins as it enters the top third (2.6 → 2.9 s)
      const veil = 1 - smoothstep(2.5, 2.86, tl);
      sky.uniforms.uMoonIntensity.value = SKY18.moonIntensity * (1 - 0.96 * veil); sky.uniforms.uMoonHalo.value = SKY18.moonHalo * (1 - 0.6 * veil);
      cityU.uHide.value.set(1e9, -1e9, 1e9, -1e9); cityU.uLit.value = 1; cityU.uWin.value = 1.25;
      cityU.uSkyAmb.value.setRGB(0.012, 0.016, 0.03); cityU.uGndAmb.value.setRGB(0.004, 0.004, 0.006); cityU.uKeyCol.value.setRGB(0.05, 0.058, 0.07); cityU.uFogCol.value.setRGB(0.028, 0.038, 0.06); cityU.uFogDen.value = 0.0006;
      cityU.uKeyDir.value.copy(moonW).setY(0).normalize().multiplyScalar(Math.cos(32 * D2R)).setY(Math.sin(32 * D2R));
      // moonlight (lighting cheat: the moon's azimuth, raised to 32°) from behind the building → the south facade stays dark
      setKey(Math.atan2(moonSet.x, -moonSet.z) / D2R, 32, 0xc8d4e6, 0.5, V3(58, 0, 0));
      hemi.color.setRGB(0.1, 0.13, 0.2); hemi.groundColor.setRGB(0.03, 0.03, 0.035); hemi.intensity = 0.5;
      fog.color.setRGB(0.03, 0.04, 0.062); fog.density = 0.0006;
      lampsG.E5.g.visible = true; practicals(5, T0); pA.intensity = 0; pB.intensity = 0;
      labG.visible = true; labSash.visible = false; labLamp.intensity = 9.0; labG.userData.spill.intensity = 40; shipsE[5].visible = false;
      M.paving.userData.wet.uWet.value = 0.45;
      rest.root.visible = true;
      rest.pose('sit_desk', { seat: 0.5, lean: 0.55 }); rest.pose({ 'neck.x': 0.35, 'head.x': 0.25, 'chest.x': 0.12 }, { add: true }); rest.breathe(T0, 0.8);
      animate(T0);
      // move: hold to 0.16 s ("千年啊"), 12-frame ease-in, then constant speed, no ease-out (cut on motion at 73.458)
      const t0 = 0.16, ramp = 0.5, v = 1 / (ramp / 2 + (70 / 24 - t0 - ramp));
      const s = tl < t0 ? 0 : tl < t0 + ramp ? v * (tl - t0) ** 2 / (2 * ramp) : v * (ramp / 2 + (tl - t0 - ramp));
      const sc = clamp(s, 0, 1.08);
      const P = S18.p0.clone().lerp(S18.p1, sc); P.y = lerp(S18.p0.y, S18.p1.y, Math.pow(clamp(sc, 0, 1.08), 0.85));
      const pitch = lerp(S18.pitch0, S18.pitch1, sc);
      placeCam(P, 0, pitch, S18.mm); camera.near = 1; camera.far = 9000;
      sea.setLamps([{ position: setRoot.localToWorld(V3(58, 2.2, 1.0)), color: 0xffc080, intensity: 10 }]);
      sea.update(T0, camera);
      dbgLog('S018');
      return { dof: null, exposure: 1.55, temp: -0.12, saturation: 0.9, contrast: 1.05, vignette: 0.34, grain: 0.035, bloom: { strength: 0.5, radius: 0.55, threshold: 0.72 } };
    },
  };
  setups.default = setups.S046;

  return {
    scene, camera,
    post: { exposure: 1.4, bloom: { strength: 0.4, radius: 0.55, threshold: 0.8 }, vignette: 0.34, grain: 0.038 },
    setShot(shot, tl, u, T0) {
      return (setups[shot.id] || setups.default)(tl, u, T0, shot);
    },
  };
}
