// PMREM environment presets built from tiny procedural scenes (for metal / glass / porcelain reflections).
//
//   import { applyEnv, envTexture } from '/previz/lib/env.js';
//   applyEnv(scene, ctx.renderer, 'night_museum', { intensity: 0.6 });     // sets scene.environment (+ intensity)
//   const t = envTexture(ctx.renderer, 'candle_interior');               // cached per renderer + preset + opts
//
// Presets: night_museum · candle_interior · moon_exterior · dawn_window · chapel_coloured
// Options: { rotation (rad about Y), sky: sky params for moon_exterior/dawn_window, warmth, seed }
import * as THREE from 'three';
import { createSky } from './sky.js';
import { stainedGlass, windowCookie } from './textures.js';

const CACHE = new WeakMap();
const L = (r, g, b, k = 1) => new THREE.Color(r * k, g * k, b * k); // linear HDR
const basic = (c, map = null) => new THREE.MeshBasicMaterial({ color: c, map, side: THREE.DoubleSide, toneMapped: false, fog: false });

function room(scene, w, h, d, col, floorCol = null, ceilCol = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mats = [basic(col), basic(col), basic(ceilCol || col), basic(floorCol || col), basic(col), basic(col)];
  const m = new THREE.Mesh(g, mats); m.position.y = h / 2; scene.add(m);
  return m;
}
function panel(scene, w, h, pos, rotY, col, map = null) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(col, map)); m.position.copy(pos); m.rotation.y = rotY; scene.add(m); return m;
}
function disc(scene, r, pos, col) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), basic(col)); m.position.copy(pos); scene.add(m); return m; }

const BUILD = {
  night_museum(s, o) {
    room(s, 30, 7, 16, L(0.010, 0.010, 0.012), L(0.016, 0.015, 0.014), L(0.004, 0.004, 0.005));
    // tall moonlit windows along one wall
    for (let i = 0; i < 5; i++) panel(s, 1.6, 3.4, new THREE.Vector3(-12 + i * 6, 3.0, -7.95), 0, L(0.16, 0.21, 0.34, o.moon ?? 1));
    // warm vitrine glows near floor
    for (let i = 0; i < 6; i++) panel(s, 0.7, 0.5, new THREE.Vector3(-10 + i * 4, 1.2, 2 + (i % 2) * 2.5), Math.PI / 2 * (i % 2), L(0.9, 0.72, 0.52, 0.5 * (o.warmth ?? 1)));
    // ceiling track spots
    for (let i = 0; i < 8; i++) disc(s, 0.08, new THREE.Vector3(-12 + i * 3.4, 6.85, (i % 2) * 3 - 1), L(4, 3.4, 2.7));
    // exit-sign-free far door glow (cool corridor)
    panel(s, 2.2, 3, new THREE.Vector3(14.95, 1.5, 0), -Math.PI / 2, L(0.03, 0.04, 0.06));
  },
  candle_interior(s, o) {
    room(s, 5, 3, 5, L(0.012, 0.007, 0.004), L(0.01, 0.006, 0.004), L(0.004, 0.003, 0.002));
    disc(s, 0.04, new THREE.Vector3(0.6, 0.85, 0.4), L(14, 7, 2.6, o.warmth ?? 1));
    disc(s, 0.6, new THREE.Vector3(0.6, 0.85, 0.4), L(0.12, 0.05, 0.015));
    const ck = windowCookie({ cols: 4, rows: 5, bar: 0.06, frame: 0.05, glass: 0 }).map;
    panel(s, 1.1, 1.3, new THREE.Vector3(-2.48, 1.6, -0.5), Math.PI / 2, L(0.05, 0.07, 0.12, o.moon ?? 1), ck);
  },
  moon_exterior(s, o) {
    const sky = createSky({ preset: 'night', ...(o.sky || {}) }); s.add(sky.object3D);
    const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 32), basic(L(0.004, 0.009, 0.018))); sea.rotation.x = -Math.PI / 2; sea.position.y = -2; s.add(sea);
  },
  dawn_window(s, o) {
    room(s, 8, 3.2, 8, L(0.05, 0.048, 0.046), L(0.04, 0.036, 0.032), L(0.03, 0.03, 0.032));
    const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#4c6a98'); gr.addColorStop(0.55, '#c8b4a8'); gr.addColorStop(0.75, '#f4c494'); gr.addColorStop(1, '#2a2e3a');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    panel(s, 5.5, 2.4, new THREE.Vector3(0, 1.5, -3.95), 0, L(1, 1, 1, 2.2 * (o.warmth ?? 1)), t);
  },
  chapel_coloured(s, o) {
    room(s, 12, 14, 30, L(0.012, 0.012, 0.013), L(0.018, 0.016, 0.014), L(0.005, 0.005, 0.006));
    const sg = stainedGlass({ seed: o.seed ?? 14 }).map;
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) panel(s, 1.4, 4.2, new THREE.Vector3(side * 5.95, 7.5, -10 + i * 6), side * -Math.PI / 2, L(1, 1, 1, 1.6), sg);
    panel(s, 3, 6, new THREE.Vector3(0, 8, -14.95), 0, L(1, 1, 1, 1.2), stainedGlass({ seed: (o.seed ?? 14) + 1, style: 'floral' }).map);
    disc(s, 0.5, new THREE.Vector3(0, 1.5, -12), L(0.8, 0.5, 0.25));
  },
};

export const ENV_PRESETS = Object.keys(BUILD);

export function envTexture(renderer, preset = 'night_museum', o = {}) {
  if (!BUILD[preset]) throw new Error('env: unknown preset ' + preset);
  let m = CACHE.get(renderer); if (!m) { m = new Map(); CACHE.set(renderer, m); }
  const key = preset + JSON.stringify(o);
  if (m.has(key)) return m.get(key);
  const s = new THREE.Scene();
  BUILD[preset](s, o);
  if (o.rotation) s.rotation.y = o.rotation;
  const pm = new THREE.PMREMGenerator(renderer);
  const rtt = pm.fromScene(s, o.sigma ?? 0.02, 0.05, 1000);
  pm.dispose();
  s.traverse((x) => { if (x.geometry) x.geometry.dispose(); });
  m.set(key, rtt.texture);
  return rtt.texture;
}

export function applyEnv(scene, renderer, preset, { intensity = 1, ...o } = {}) {
  scene.environment = envTexture(renderer, preset, o);
  scene.environmentIntensity = intensity;
  return scene.environment;
}
