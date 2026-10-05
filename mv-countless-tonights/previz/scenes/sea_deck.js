// sea_deck — LOC_DECK: the ocean-going junk at dusk / night / pre-dawn, the vast heavy sea, the shore light (M7).
// Shots: S008 (EWS dusk) · S022 (135 mm shore light → navigator's eye) · S045 (patch → look to the shore light) ·
//        S067 (the coat falls over the sleeping companion, 48→24 fps ramp) · S075 (pre-dawn, he turns to screen-right).
// Named nested view: view_shiplamp (night sea, heavy swell, the horn stern lamp swaying over the waves) — used by the
// gallery glass (S002/S003) and the corridor pane P1 (S066).
//
// Ship-local frame: +X = bow, +Y = up (waterline y = 0), +Z = starboard. The ship sails along world +X; every camera
// is a ship-relative rig, the coast + shore light are placed relative to each shot's camera (geography per the bible:
// shore screen-LEFT, moon upper screen-RIGHT, ship heading screen-RIGHT).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSky } from '../lib/sky.js';
import { createSea, createCoast } from '../lib/sea.js';
import * as FX from '../lib/fx.js';
import * as TX from '../lib/textures.js';
import { applyEnv } from '../lib/env.js';
import { loadCharacter, loadCharacterHand, loadCrowd } from '../lib/cast.js';

// ------------------------------------------------------------------------------------------ palette (bible.json)
const P = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P09: '#B08D57', P10: '#6E5536',
  P13: '#E2A458', P14: '#C67A35', P16: '#A33A2E', P19: '#A26F4C', P20: '#5B6F8A', P21: '#EBB894', P22: '#F5E4C8',
  sail: '#8A5A3A', batten: '#4E3624', coat: '#5B4634', lining: '#CFC3A8', rope: '#8C7650',
};
const SHIP_SPEED = 2.4;                      // m/s along world +X (~4.7 kn)
const XS = -15.5, XB = 15.0, LEN = XB - XS;  // stern / bow transoms
const POOP_X = -7.7, POOP_Y = 3.95;          // stern-castle (poop) deck: front bulkhead x, deck height
const TW = 0.5;                              // ring fraction below the waterline

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------ hull lines
const sOf = (x) => (x - XS) / LEN;
function halfBeam(s) { return s < 0.42 ? 2.95 + 1.05 * Math.pow(Math.sin(Math.PI / 2 * s / 0.42), 1.2) : 4.0 - 2.1 * Math.pow((s - 0.42) / 0.58, 1.8); }
function mainDeckY(s) { return 1.85 + 0.3 * Math.pow(Math.max(0, (s - 0.6) / 0.4), 2); }
function deckYAt(x) { return x < POOP_X ? POOP_Y : mainDeckY(sOf(x)); }
function sheerY(s) {
  const aft = 5.05 + 0.22 * Math.pow(Math.max(0, 1 - s / 0.255), 2);
  const mid = mainDeckY(s) + 1.05 + 0.75 * sstep(0.84, 1.0, s);
  return lerp(aft, mid, sstep(0.245, 0.37, s));
}
function keelD(s) { return -0.25 + 2.65 * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * s)), 0.65); }
function section(s, t, out) {
  const B = halfBeam(s), D = keelD(s), Y = sheerY(s);
  if (t <= TW) { const ph = (t / TW) * Math.PI / 2, n = 2.6; out.z = B * Math.pow(Math.sin(ph), 2 / n); out.y = -D * Math.pow(Math.cos(ph), 2 / n); }
  else { const k = (t - TW) / (1 - TW); out.z = B * (1 + 0.035 * k); out.y = Y * k; }
  return out;
}
// inner half-beam at height y (bulwark ~11 cm thick)
function innerBeam(x, y) { const s = sOf(x), Y = sheerY(s); return halfBeam(s) * (1 + 0.035 * clamp(y / Y)) - 0.11; }

// ------------------------------------------------------------------------------------------ canvas textures (deterministic)
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t;
}
// painted stern transom: faded oxide-red ground, a ring of cloud scrolls and waves, a sun disc — no text, no emblem
function sternPaintTex(rng) {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#4a2a20'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${20 + rng() * 40},${12 + rng() * 20},${8 + rng() * 14},${0.08 + rng() * 0.12})`; g.fillRect(rng() * W, rng() * H, 2 + rng() * 30, 1 + rng() * 3); }
    // painted band frame
    g.strokeStyle = 'rgba(176,141,87,0.55)'; g.lineWidth = 10; g.strokeRect(26, 40, W - 52, H - 120);
    g.strokeStyle = 'rgba(40,54,80,0.7)'; g.lineWidth = 5; g.strokeRect(42, 56, W - 84, H - 152);
    // waves along the bottom
    g.strokeStyle = 'rgba(200,196,180,0.45)'; g.lineWidth = 4;
    for (let row = 0; row < 3; row++) { g.beginPath(); for (let x = 50; x <= W - 50; x += 4) { const y = H - 150 + row * 16 + 6 * Math.sin(x * 0.08 + row * 1.7); x === 50 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    // sun disc + cloud scrolls (abstract)
    g.fillStyle = 'rgba(178,120,64,0.7)'; g.beginPath(); g.arc(W / 2, 190, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(214,198,162,0.55)'; g.lineWidth = 6;
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); const cx = W / 2 + sx * (120 + k * 46), cy = 170 + k * 34; g.arc(cx, cy, 20 + k * 3, Math.PI * 0.2, Math.PI * 1.7); g.stroke(); }
    // fade / weathering
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(30,20,16,${0.1 + rng() * 0.25})`; g.beginPath(); g.arc(rng() * W, rng() * H, 1 + rng() * 6, 0, 6.283); g.fill(); }
  });
}
// towering cumulus card (alpha): soft blurred puff mass on a flat base, lit tops toward `lit` (−1 left … +1 right)
function cumulusTex(rng, { lit = -1, tower = 1, w = 512, h = 384 } = {}) {
  return canvasTex(w, h, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    const base = H * 0.84, puffs = [];
    for (let i = 0; i < 130; i++) {
      const t = Math.pow(rng(), 0.85), spread = (1 - 0.6 * t) * (0.8 + 0.2 * rng());
      const x = W / 2 + (rng() * 2 - 1) * W * 0.36 * spread + Math.sin(t * 4 + 1) * W * 0.05;
      const r = (H * 0.05 + H * 0.07 * rng()) * (1 - 0.3 * t);
      puffs.push([x, Math.min(base - t * H * 0.66 * tower, base - r * 0.5), r, t]);
    }
    // 1) alpha mass (blurred union of puffs)
    g.filter = 'blur(9px)'; g.fillStyle = '#fff';
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.filter = 'none';
    // 2) colour inside the mass: shadowed blue-grey base -> lit warm crown on the light side
    g.globalCompositeOperation = 'source-in';
    const vg = g.createLinearGradient(0, base, 0, H * 0.08); vg.addColorStop(0, '#3a4562'); vg.addColorStop(0.5, '#6a6e88'); vg.addColorStop(1, '#b8979a');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-atop';
    const hg = g.createLinearGradient(lit < 0 ? 0 : W, 0, lit < 0 ? W : 0, 0); hg.addColorStop(0, 'rgba(232,170,130,0.42)'); hg.addColorStop(0.5, 'rgba(160,130,130,0.1)'); hg.addColorStop(1, 'rgba(20,26,44,0.35)');
    g.fillStyle = hg; g.fillRect(0, 0, W, H);
    // last afterglow on the crown (bible: 积云顶部残留最后余晖)
    const cg = g.createLinearGradient(0, H * 0.05, 0, H * 0.55); cg.addColorStop(0, 'rgba(240,176,140,0.85)'); cg.addColorStop(0.45, 'rgba(214,150,130,0.35)'); cg.addColorStop(1, 'rgba(200,140,130,0)');
    g.fillStyle = cg; g.fillRect(0, 0, W, H);
    // billow shading: soft darker undersides of each puff
    g.filter = 'blur(7px)';
    for (const [x, y, r, t] of puffs) { const gr = g.createRadialGradient(x, y + r * 0.55, r * 0.1, x, y + r * 0.4, r * 0.9); gr.addColorStop(0, `rgba(24,30,50,${0.08 + 0.06 * (1 - t)})`); gr.addColorStop(1, 'rgba(24,30,50,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    g.filter = 'none';
    // flat base fade
    g.globalCompositeOperation = 'destination-out';
    const bg = g.createLinearGradient(0, base - H * 0.05, 0, base + H * 0.03); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = bg; g.fillRect(0, base - H * 0.05, W, H);
    g.globalCompositeOperation = 'source-over';
  });
}
function oculusTex() {
  return canvasTex(256, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(214,206,186,0.95)'; g.beginPath(); g.ellipse(W / 2, H / 2, W * 0.42, H * 0.36, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(18,16,16,1)'; g.beginPath(); g.arc(W / 2 + 10, H / 2, H * 0.24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(140,60,42,0.9)'; g.lineWidth = 7; g.beginPath(); g.ellipse(W / 2, H / 2, W * 0.44, H * 0.39, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  });
}
function ropeTex() {
  return canvasTex(64, 64, (g, W, H) => {
    g.fillStyle = '#8c7650'; g.fillRect(0, 0, W, H);
    for (let i = -4; i < 8; i++) { g.strokeStyle = 'rgba(40,30,18,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(i * 12, 0); g.lineTo(i * 12 + 24, H); g.stroke();
      g.strokeStyle = 'rgba(210,190,150,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 12 + 5, 0); g.lineTo(i * 12 + 29, H); g.stroke(); }
  });
}

// ------------------------------------------------------------------------------------------ geometry helpers
function gridGeometry(nu, nv, fn) { // fn(u, v) -> [x, y, z, uu, vv]
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const r = fn(i / nu, j / nv); pos.push(r[0], r[1], r[2]); uv.push(r[3] ?? i / nu, r[4] ?? j / nv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// sweep a w×h rectangle along a polyline (points: Vector3[]), up = +Y
function sweepRect(points, w, h, uScale = 1) {
  const pos = [], uv = [], idx = []; const n = points.length;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i], t = points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(t).normalize(), up = t.clone().cross(side).normalize();
    if (i > 0) acc += p.distanceTo(points[i - 1]);
    const c = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    for (let k = 0; k < 4; k++) { const q = p.clone().addScaledVector(side, c[k][0]).addScaledVector(up, c[k][1]); pos.push(q.x, q.y, q.z); uv.push(acc * uScale, k / 4); }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function tube(points, r, seg = 6, closed = false) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(4, points.length * 4), r, seg, closed); }
function boxAt(w, h, d, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
function cylAt(r0, r1, h, x, y, z, seg = 10) { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y + h / 2, z); return g; }

// battened lug sail in sail-plane coords: luff at x = 0 (foot corner at origin), battens run toward −X (aft), belly +Z
function makeSail({ footLen, headLen, luffH, nb, angTop = 0.42, camber = 1.0, bulge = 0.22, seg = 22, sub = 4, rake = 0.05 }) {
  const rows = nb * sub;
  const pos = [], uv = [], belly = [], idx = [];
  const pt = (u, v, onBatten) => {
    const hL = v * luffH, aL = -rake * hL, len = lerp(footLen, headLen, Math.pow(v, 1.25)), ang = angTop * Math.pow(v, 1.5);
    const leechBow = 0.06 * len * Math.sin(Math.PI * v) * u * u; // convex leech
    const x = aL - u * len * Math.cos(ang) - leechBow, y = hL + u * len * Math.sin(ang);
    const fr = v * nb - Math.floor(v * nb), panel = onBatten ? 0 : Math.sin(Math.PI * fr);
    const cam = camber * 4 * u * (1 - u) * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, v * 1.1))) * (len / 12);
    const b = bulge * panel * Math.sin(Math.PI * Math.min(1, u * 1.05));
    return { x, y, z: cam + b, bl: b * 0.6 + cam * 0.12 };
  };
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= seg; i++) {
    const u = i / seg, v = j / rows, p = pt(u, v, j % sub === 0);
    pos.push(p.x, p.y, p.z); uv.push(u * 3, v * 6); belly.push(p.bl);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aBelly', new THREE.Float32BufferAttribute(belly, 1)); g.setIndex(idx); g.computeVertexNormals();
  const battens = [], leech = [];
  for (let k = 0; k <= nb; k++) {
    const v = k / nb, pts = []; for (let i = 0; i <= 8; i++) { const p = pt(i / 8, v, true); pts.push(V3(p.x, p.y, p.z + 0.02)); }
    battens.push(tube(pts, k === nb ? 0.1 : k === 0 ? 0.08 : 0.055, 5)); leech.push(pts[8].clone());
  }
  const luff = []; for (let k = 0; k <= nb; k++) { const p = pt(0, k / nb, true); luff.push(V3(p.x, p.y, p.z)); }
  return { geometry: g, battens: mergeGeometries(battens), leech, luff };
}
// stacked rope coil (helix) on the deck, origin = centre of the coil's base
function ropeCoil(R = 0.36, turns = 4.5, r = 0.022, seed = 1) {
  const pts = []; const N = Math.round(turns * 28);
  for (let i = 0; i <= N; i++) { const a = i / 28 * Math.PI * 2, k = i / N; const rr = R - 0.012 * Math.sin(a * 3 + seed) - (k > 0.75 ? (k - 0.75) * 0.5 * R : 0); pts.push(V3(Math.cos(a) * rr, r + k * turns * 2.05 * r * 0.55, Math.sin(a) * rr)); }
  // tail running off across the deck
  const e = pts[pts.length - 1]; pts.push(V3(e.x + 0.25, r, e.z + 0.18), V3(e.x + 0.6, r, e.z + 0.5));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 3, r, 6, false);
}
function lathe(profile, seg = 24) { return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg); }

// ------------------------------------------------------------------------------------------ the junk
function buildJunk(ctx) {
  const rng = ctx.util.rng(1617);
  const ship = new THREE.Group(); ship.name = 'junk';
  const parts = {};
  // materials
  const hullM = TX.mat('wood_ship', { tex: { salt: 0.3, planks: 6, seed: 41, wear: 0.7 }, color: new THREE.Color(0.52, 0.47, 0.42), side: THREE.DoubleSide });
  const deckM = TX.mat('wood_ship', { tex: { salt: 0.45, planks: 6, seed: 43, wear: 0.6 }, color: new THREE.Color(0.86, 0.82, 0.76) });
  const darkM = TX.mat('wood_smoke', { tex: { planks: 4, seed: 44 } });
  const beamM = TX.mat('wood_beam', { tex: { seed: 45 } });
  const ironM = new THREE.MeshStandardMaterial({ color: 0x1b1a1a, roughness: 0.62, metalness: 0.7 });
  const ropeM = new THREE.MeshStandardMaterial({ map: (() => { const t = ropeTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); return t; })(), roughness: 0.92 });
  const sailTex = TX.cotton({ tone: [138, 90, 58], threads: 46, creases: 0.55, slub: 0.9, fade: 0.6, seed: 31 });
  const sailM = new THREE.MeshStandardMaterial({ map: sailTex.map, normalMap: sailTex.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.95, side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.93, 0.88) });
  const sailU = { uBreath: { value: 0 } };
  sailM.onBeforeCompile = (sh) => { sh.uniforms.uBreath = sailU.uBreath; sh.vertexShader = 'attribute float aBelly; uniform float uBreath;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * aBelly * uBreath;'); };
  sailM.customProgramCacheKey = () => 'junk_sail';
  const battenM = new THREE.MeshStandardMaterial({ color: new THREE.Color(P.batten), roughness: 0.8 });

  // ---- hull: lofted rings, port sheer -> keel -> starboard sheer
  const NS = 60, NR = 16;
  const hp = [], huv = [], hidx = []; const q = { y: 0, z: 0 };
  for (let i = 0; i <= NS; i++) {
    const s = i / NS, x = XS + s * LEN;
    for (let j = 0; j <= 2 * NR; j++) {
      const w = j / NR - 1, t = Math.abs(w), sg = w < 0 ? -1 : 1;
      section(s, t, q); hp.push(x, q.y, sg * q.z); huv.push(w * 3.2, x / 5.5);
    }
  }
  const RW = 2 * NR + 1;
  for (let i = 0; i < NS; i++) for (let j = 0; j < 2 * NR; j++) { const a = i * RW + j, b = a + 1, c = a + RW, d = c + 1; hidx.push(a, b, c, b, d, c); }
  const hullG = new THREE.BufferGeometry(); hullG.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hullG.setAttribute('uv', new THREE.Float32BufferAttribute(huv, 2)); hullG.setIndex(hidx); hullG.computeVertexNormals();
  const hull = new THREE.Mesh(hullG, hullM); hull.castShadow = hull.receiveShadow = true; ship.add(hull); parts.hull = hull;
  // transoms (stern painted, bow plain) — fans from an inner centre point
  const transom = (s, mat, flip) => {
    const x = XS + s * LEN, ring = []; for (let j = 0; j <= 2 * NR; j++) { const w = j / NR - 1; section(s, Math.abs(w), q); ring.push([q.y, (w < 0 ? -1 : 1) * q.z]); }
    const Y = sheerY(s), D = keelD(s), B = halfBeam(s) * 1.035;
    const pos = [x, Y * 0.42, 0], uv = [0.5, (Y * 0.42 + D) / (Y + D)], idx = [];
    for (const [y, z] of ring) { pos.push(x, y, z); uv.push(0.5 + z / (2 * B), (y + D) / (Y + D)); }
    for (let k = 1; k < ring.length; k++) flip ? idx.push(0, k + 1, k) : idx.push(0, k, k + 1);
    idx.push(...(flip ? [0, 1, ring.length] : [0, ring.length, 1]));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; ship.add(m); return m;
  };
  const paint = sternPaintTex(rng);
  parts.sternPanel = transom(0, new THREE.MeshStandardMaterial({ map: paint, roughness: 0.85, side: THREE.DoubleSide }), true);
  { const inner = transom(0, darkM, true); inner.position.x = 0.05; inner.scale.set(1, 1, 0.985); } // plain planking seen from the poop deck
  transom(1, hullM, false);
  // oculi on both bow quarters
  const eyeM = new THREE.MeshStandardMaterial({ map: oculusTex(), transparent: true, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const sg of [-1, 1]) { const x = XB - 2.2, s = sOf(x), y = sheerY(s) * 0.66; const z = halfBeam(s) * (1 + 0.035 * 0.66) + 0.02; const e = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), eyeM); e.position.set(x, y, sg * z); e.rotation.y = sg > 0 ? -0.18 : Math.PI + 0.18; ship.add(e); }
  // ---- decks (planks along the ship: texture v along x)
  const deckStrip = (x0, x1, yFn, nx = 24) => gridGeometry(nx, 8, (u, v) => { const x = lerp(x0, x1, u), y0 = yFn(x), Bd = innerBeam(x, y0) + 0.02, z = (v * 2 - 1) * Bd; return [x, y0 + 0.05 * (1 - (z / Bd) ** 2), z, z / 2.4, x / 3.0]; });
  const mainDeck = new THREE.Mesh(deckStrip(POOP_X - 0.05, XB - 0.35, (x) => mainDeckY(sOf(x))), deckM); mainDeck.receiveShadow = true; ship.add(mainDeck);
  const poopDeck = new THREE.Mesh(deckStrip(XS + 0.08, POOP_X + 0.05, () => POOP_Y, 16), deckM); poopDeck.receiveShadow = true; poopDeck.castShadow = false; ship.add(poopDeck); parts.poopDeck = poopDeck;
  // poop front bulkhead with a dark door
  { const Bd = innerBeam(POOP_X, POOP_Y) + 0.02, h = POOP_Y - mainDeckY(sOf(POOP_X)); const g = new THREE.PlaneGeometry(2 * Bd, h); g.rotateY(Math.PI / 2); g.translate(POOP_X, mainDeckY(sOf(POOP_X)) + h / 2, 0);
    const m = new THREE.Mesh(g, darkM); m.receiveShadow = true; ship.add(m);
    const door = new THREE.Mesh(boxAt(0.06, 1.55, 0.9, POOP_X + 0.03, mainDeckY(sOf(POOP_X)) + 0.78, -0.9), new THREE.MeshStandardMaterial({ color: 0x0d0a08, roughness: 0.9 })); ship.add(door); }
  // ---- rail caps along the sheer (both sides) + across the transom
  const capPts = (sg) => { const a = []; for (let i = 1; i <= 46; i++) { const s = 0.004 + i / 46 * 0.955; const x = XS + s * LEN; a.push(V3(x, sheerY(s) + 0.045, sg * (halfBeam(s) * 1.035 - 0.05))); } return a; };
  const capG = [sweepRect(capPts(1), 0.17, 0.09, 0.3), sweepRect(capPts(-1), 0.17, 0.09, 0.3)];
  { const s = 0.004, x = XS + s * LEN + 0.05, Y = sheerY(s) + 0.045, B = halfBeam(s) * 1.035 - 0.05; const pts = []; for (let k = 0; k <= 12; k++) pts.push(V3(x, Y, lerp(-B, B, k / 12))); capG.push(sweepRect(pts, 0.17, 0.09, 0.3)); }
  const caps = new THREE.Mesh(mergeGeometries(capG), beamM); caps.castShadow = caps.receiveShadow = true; ship.add(caps);
  // stanchions / frames on the inner bulwark of the poop (read in the close-ups)
  { const gs = []; for (const sg of [-1, 1]) for (let x = XS + 0.9; x < POOP_X - 0.2; x += 0.95) { const s = sOf(x), Y = sheerY(s), z = sg * (innerBeam(x, POOP_Y) - 0.03); gs.push(boxAt(0.09, Y - POOP_Y, 0.08, x, POOP_Y + (Y - POOP_Y) / 2, z)); }
    for (let z = -2.6; z <= 2.61; z += 0.87) gs.push(boxAt(0.08, sheerY(0.004) - POOP_Y, 0.09, XS + 0.24, POOP_Y + (sheerY(0.004) - POOP_Y) / 2, z));
    const m = new THREE.Mesh(mergeGeometries(gs), beamM); m.castShadow = m.receiveShadow = true; ship.add(m); }
  // ---- masts, yards, sails, sheets
  const mastG = [], sails = [], sheetPts = [];
  const rig = (mx, mz, baseY, topY, rakeX, sp, alpha) => {
    const h = topY - baseY; const g = new THREE.CylinderGeometry(0.13 * sp.mr, 0.28 * sp.mr, h, 12); g.translate(0, h / 2, 0); g.rotateZ(-rakeX); g.translate(mx, baseY, mz); mastG.push(g);
    const S = makeSail(sp);
    const piv = new THREE.Group(); piv.position.set(mx, 0, mz); piv.rotation.y = alpha; ship.add(piv);
    const sail = new THREE.Mesh(S.geometry, sailM); sail.position.set(sp.lead, sp.footY, 0.32 * sp.mr); sail.castShadow = sail.receiveShadow = true; piv.add(sail);
    const bat = new THREE.Mesh(S.battens, battenM); bat.position.copy(sail.position); bat.castShadow = true; piv.add(bat);
    sails.push(sail);
    piv.updateMatrix(); sail.updateMatrix();
    const M = piv.matrix.clone().multiply(sail.matrix);
    const sheetBase = V3(mx - sp.footLen * 0.8, deckYAt(mx - sp.footLen * 0.8) + 0.1, mz * 0.5);
    for (const p of S.leech) { const w = p.clone().applyMatrix4(M); sheetPts.push(w, sheetBase); }
    return { piv, sail, S };
  };
  parts.main = rig(1.6, 0, 1.85, 26.8, 0.0, { footLen: 13.5, headLen: 10.5, luffH: 19.6, nb: 11, footY: 4.1, lead: 3.1, mr: 1.0, angTop: 0.4 }, 0.36);
  parts.fore = rig(10.8, 0, 2.0, 18.5, 0.1, { footLen: 9.0, headLen: 7.2, luffH: 12.6, nb: 9, footY: 3.6, lead: 2.0, mr: 0.75, angTop: 0.4 }, 0.3);
  parts.mizzen = rig(-12.9, -0.7, POOP_Y, 16.5, -0.05, { footLen: 7.4, headLen: 5.6, luffH: 8.2, nb: 7, footY: POOP_Y + 2.7, lead: 1.4, mr: 0.6, angTop: 0.45 }, 0.32);
  const masts = new THREE.Mesh(mergeGeometries(mastG), beamM); masts.castShadow = masts.receiveShadow = true; ship.add(masts);
  const sheetsG = new THREE.BufferGeometry().setFromPoints(sheetPts);
  const sheets = new THREE.LineSegments(sheetsG, new THREE.LineBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.55 })); ship.add(sheets); parts.sheets = sheets;
  parts.sails = sails; parts.sailU = sailU;
  // ---- stern furniture: rudder post + tiller, stern lantern bracket (starboard quarter), hatch
  { const gs = [cylAt(0.2, 0.17, 1.0, XS + 0.9, POOP_Y, 0, 12), boxAt(2.6, 0.11, 0.13, XS + 2.2, POOP_Y + 0.92, 0)];
    const m = new THREE.Mesh(mergeGeometries(gs), beamM); m.castShadow = m.receiveShadow = true; ship.add(m); }
  // lantern post + iron arm (outboard over the water), lantern hook at parts.lampHook
  const lampX = XS + 1.25, lampS = sOf(lampX), lampZ = halfBeam(lampS) * 1.035 - 0.05, capY = sheerY(lampS) + 0.09;
  { const gs = [boxAt(0.1, 1.15, 0.1, lampX, capY + 0.575, lampZ)]; const m = new THREE.Mesh(mergeGeometries(gs), beamM); m.castShadow = true; ship.add(m); parts.lampPost = m;
    const arm = new THREE.Mesh(mergeGeometries([boxAt(0.035, 0.035, 0.95, lampX, capY + 1.1, lampZ + 0.45), boxAt(0.03, 0.03, 0.62, lampX, capY + 0.82, lampZ + 0.27).rotateX(0)]), ironM);
    const brace = new THREE.Mesh(tube([V3(lampX, capY + 0.55, lampZ + 0.02), V3(lampX, capY + 0.85, lampZ + 0.45), V3(lampX, capY + 1.08, lampZ + 0.85)], 0.015, 5), ironM);
    ship.add(arm, brace); parts.lampArm = [arm, brace, parts.lampPost]; }
  parts.lampHook = V3(lampX, capY + 1.08, lampZ + 0.9);
  // hatch in the poop deck over the navigator's cabin (glows amber from below)
  const hatchC = V3(-11.6, POOP_Y + 0.06, 0.95);
  { const gs = [boxAt(0.86, 0.14, 0.08, hatchC.x, POOP_Y + 0.07, hatchC.z - 0.39), boxAt(0.86, 0.14, 0.08, hatchC.x, POOP_Y + 0.07, hatchC.z + 0.39), boxAt(0.08, 0.14, 0.7, hatchC.x - 0.39, POOP_Y + 0.07, hatchC.z), boxAt(0.08, 0.14, 0.7, hatchC.x + 0.39, POOP_Y + 0.07, hatchC.z)];
    const m = new THREE.Mesh(mergeGeometries(gs), beamM); m.castShadow = true; ship.add(m);
    const lid = new THREE.Mesh(boxAt(0.74, 0.05, 0.74, hatchC.x - 0.82, POOP_Y + 0.03, hatchC.z, 0.12), darkM); ship.add(lid);
    const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.P13).multiplyScalar(2.2) });
    const hg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), glowM); hg.rotation.x = -Math.PI / 2; hg.position.set(hatchC.x, POOP_Y + 0.01, hatchC.z); ship.add(hg);
    parts.hatchGlow = hg; parts.hatchGlowM = glowM; }
  const hatchHalo = FX.glow({ color: P.P13, size: 2.2, intensity: 0.0, falloff: 2.0 }); hatchHalo.object3D.position.set(hatchC.x, POOP_Y + 0.5, hatchC.z); ship.add(hatchHalo.object3D); parts.hatchHalo = hatchHalo;
  parts.hatchC = hatchC;
  // ---- deck clutter: rope coils, water jars, tubs (poop deck + main deck)
  const coilG = [];
  const coil = (x, z, R, turns, seed, y = deckYAt(x)) => { const g = ropeCoil(R, turns, 0.022, seed); g.translate(x, y + 0.02, z); coilG.push(g); return V3(x, y, z); };
  parts.coilBoy = coil(-12.4, 2.55, 0.38, 6, 2);           // S067: the companion sleeps against this coil (starboard, poop)
  coil(-9.0, -2.4, 0.33, 4.5, 3); coil(-4.0, 2.7, 0.42, 5, 4); coil(6.0, -2.9, 0.4, 4, 5); coil(-14.1, -1.9, 0.3, 4, 6);
  const coils = new THREE.Mesh(mergeGeometries(coilG), ropeM); coils.castShadow = coils.receiveShadow = true; ship.add(coils);
  const jarM = new THREE.MeshPhysicalMaterial({ color: 0x3a2a1f, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const jarG = []; const jar = lathe([[0, 0], [0.16, 0.0], [0.24, 0.12], [0.27, 0.32], [0.22, 0.52], [0.12, 0.6], [0.11, 0.66], [0.13, 0.68], [0, 0.68]], 20);
  for (const [x, z] of [[-9.6, 2.5], [-9.0, 2.65], [-3.0, -2.9], [-2.4, -3.0]]) { const g = jar.clone(); g.translate(x, deckYAt(x), z); jarG.push(g); }
  const jars = new THREE.Mesh(mergeGeometries(jarG), jarM); jars.castShadow = jars.receiveShadow = true; ship.add(jars);
  const tubG = []; const tubP = lathe([[0, 0], [0.28, 0], [0.31, 0.25], [0.3, 0.48], [0, 0.48]], 18);
  for (const [x, z] of [[-6.2, -2.7], [-5.6, -2.8], [3.5, 2.9]]) { const g = tubP.clone(); g.translate(x, deckYAt(x), z); tubG.push(g); }
  const tubs = new THREE.Mesh(mergeGeometries(tubG), beamM); tubs.castShadow = tubs.receiveShadow = true; ship.add(tubs);
  return { ship, parts };
}

// ------------------------------------------------------------------------------------------ sea foam (bow wave + wake) on the Gerstner surface
const FOAM_VERT = /* glsl */ `
uniform vec4 uW[12]; uniform vec3 uW2[12]; uniform float uT, uLevel;
attribute vec2 aF; varying vec2 vF; varying vec2 vG; varying float vD;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 g = wp.xz; vec3 p = vec3(g.x, uLevel, g.y);
  for (int i = 0; i < 6; i++) { vec4 a = uW[i]; vec3 b = uW2[i]; float f = a.z * dot(a.xy, g) - b.y * uT + b.z; float c = cos(f), s = sin(f);
    p.x += b.x * a.w * a.x * c; p.z += b.x * a.w * a.y * c; p.y += a.w * s; }
  p.y += 0.06;
  vF = aF; vG = position.xz; vD = distance(cameraPosition, p);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FOAM_FRAG = /* glsl */ `
uniform sampler2D uNoise; uniform vec3 uCol; uniform float uOp, uTime, uSpeed;
varying vec2 vF; varying vec2 vG; varying float vD;
void main(){
  vec2 q = vec2(vG.x + uTime * uSpeed, vG.y);
  float n = texture2D(uNoise, q * 0.09).r * 0.55 + texture2D(uNoise, q * 0.31 + 0.37).a * 0.3 + texture2D(uNoise, q * 0.9 + 0.11).g * 0.15;
  float edge = smoothstep(0.0, 0.25, vF.y) * smoothstep(1.0, 0.45, vF.y);
  float along = smoothstep(0.0, 0.06, vF.x) * pow(1.0 - vF.x, 1.6);
  float a = uOp * smoothstep(0.42 + 0.3 * vF.x, 0.75, n + 0.25 * (1.0 - vF.y)) * along * max(edge, 0.0);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uCol, a);
}`;
function buildFoam(sea) {
  const geos = [];
  // bow wave: along each side from the bow back ~15 m, from the hull outward
  for (const sg of [-1, 1]) geos.push(gridGeometryF(28, 4, (u, v) => { const x = XB + 0.6 - u * 17, s = clamp(sOf(x), 0, 1), B = halfBeam(s) * 0.98; const w = 0.5 + 3.2 * Math.pow(u, 0.8); return [x, 0, sg * (B + v * w), u, v]; }));
  // stern wake: widening turbulent strip
  geos.push(gridGeometryF(30, 6, (u, v) => { const x = XS + 0.5 - u * 70, w = 6.2 + 16 * u; return [x, 0, (v - 0.5) * w, u, Math.abs(v - 0.5) * 2 > 1 ? 1 : 1 - Math.abs(v - 0.5) * 2 + 0.0]; }));
  const g = mergeGeometries(geos);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    uniforms: { uW: sea.uniforms.uW, uW2: sea.uniforms.uW2, uT: sea.uniforms.uT, uLevel: sea.uniforms.uLevel, uNoise: { value: TX.noiseTexture() }, uCol: { value: new THREE.Color(0.3, 0.34, 0.4) }, uOp: { value: 0.8 }, uTime: { value: 0 }, uSpeed: { value: SHIP_SPEED } },
    vertexShader: FOAM_VERT, fragmentShader: FOAM_FRAG });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5;
  return { object3D: m, material: mat };
}
function gridGeometryF(nu, nv, fn) { // grid with aF attribute (u along, v across), no normals
  const pos = [], af = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const r = fn(i / nu, j / nv); pos.push(r[0], r[1], r[2]); af.push(r[3], r[4]); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aF', new THREE.Float32BufferAttribute(af, 2)); g.setIndex(idx); return g;
}

// ------------------------------------------------------------------------------------------ the shore light (M7: 1900 K #E2A458, constant pixel size, DOF-friendly HDR)
function shoreLight() {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: new THREE.Color(P.P13) }, uInt: { value: 20 }, uPx: { value: 7 } },
    vertexShader: /* glsl */ `uniform float uPx; void main(){ gl_PointSize = uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uInt; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); if (r2 > 1.0) discard;
      float a = exp(-r2 * 7.0) + 0.05 * exp(-r2 * 1.5); gl_FragColor = vec4(uCol * uInt * a, 1.0); }` });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 20;
  return { object3D: pts, material: mat };
}

// ------------------------------------------------------------------------------------------ the coat (S067): shader-blended cloth keyframes
// Coat domain: cu ∈ [-1, 1] across (sleeves beyond |cu| > 0.42 only near the collar), cv ∈ [0, 1] collar → hem.
const COAT_NU = 30, COAT_NV = 26, COAT_W = 1.42, COAT_H = 1.02;
function coatMaterial(TXc) {
  const tx = TX.cotton({ tone: [91, 70, 52], threads: 70, creases: 0.75, slub: 0.7, fade: 0.5, seed: 77 });
  const m = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.93, side: THREE.DoubleSide });
  const U = { uP: { value: 0 }, uT: { value: 0 }, uFlut: { value: 1 }, uPull: { value: 0 }, uPullDir: { value: new THREE.Vector3() }, uLift: { value: 0.3 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `attribute vec3 aPA, aPB, aPC, aNA, aNB, aNC; attribute vec4 aCl; uniform float uP, uT, uFlut, uPull, uLift; uniform vec3 uPullDir; varying vec2 vCl;\n` + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
        float pv = clamp((uP - aCl.z * 0.3) / 0.7, 0.0, 1.0);
        float kb = smoothstep(0.0, 0.42, pv), kc = smoothstep(0.42, 1.0, pv);
        vec3 Pc = aPC + vec3(0.0, uLift * (1.0 - kc) * (1.0 - kc), 0.0);
        vec3 P = mix(mix(aPA, aPB, kb), Pc, kc);
        vec3 N = normalize(mix(mix(aNA, aNB, kb), aNC, kc) + vec3(1e-4));
        float air = sin(3.14159 * clamp(pv * 1.08, 0.0, 1.0));
        float fl = sin(aCl.x * 5.0 + aCl.y * 9.0 - uT * 13.0) * 0.06 + sin(aCl.y * 15.0 + aCl.x * 3.0 - uT * 9.0) * 0.03;
        P += N * air * uFlut * fl * (0.3 + aCl.y);
        P += uPullDir * uPull * aCl.w;
        vCl = aCl.xy;
        vec3 objectNormal = N;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = P;');
    sh.fragmentShader = 'varying vec2 vCl;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (abs(vCl.x) > 0.44 && (vCl.y > 0.36 || abs(vCl.x) > 0.98)) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (!gl_FrontFacing) diffuseColor.rgb *= vec3(3.0, 3.25, 3.1);`);
  };
  m.customProgramCacheKey = () => 'coat_cloth';
  return { material: m, U };
}

// ------------------------------------------------------------------------------------------ camera helpers
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
// orient camera at pos so that world point P lands at screen (sx, sy) (0..1 from top-left), zero roll (horizon level)
function aimAt(camera, pos, Pt, sx, sy, roll = 0) {
  camera.position.copy(pos); camera.rotation.order = 'YXZ';
  const d = Pt.clone().sub(pos).normalize();
  let yaw = Math.atan2(-d.x, -d.z), pitch = Math.asin(clamp(d.y, -1, 1));
  const ty = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tx = ty * camera.aspect;
  for (let i = 0; i < 5; i++) {
    camera.rotation.set(pitch, yaw, roll); camera.updateMatrixWorld(true);
    const p = Pt.clone().project(camera);
    yaw += Math.atan((2 * sx - 1 - p.x) * tx); pitch -= Math.atan((1 - 2 * sy - p.y) * ty);
  }
  camera.rotation.set(pitch, yaw, roll); camera.updateMatrixWorld(true);
  return camera;
}
// exact framing: world-level camera (yaw, pitch, no roll) placed so that world point Pt sits at screen (sx, sy) at distance dist
function frameAt(camera, Pt, sx, sy, dist, yaw, pitch) {
  camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yaw, 0); camera.position.set(0, 0, 0); camera.updateMatrixWorld(true);
  const d = new THREE.Vector3(2 * sx - 1, 1 - 2 * sy, 0.5).unproject(camera).normalize();
  camera.position.copy(Pt).addScaledVector(d, -dist); camera.updateMatrixWorld(true);
  return camera;
}
const yawOf = (F) => Math.atan2(-F.x, -F.z);                                   // camera yaw looking along horizontal F
const pitchForHorizon = (camera, hy) => Math.atan((hy - 0.5) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
// view-space depth of a world point (what the engine DOF calls "focus")
function depthOf(camera, Pt) { camera.updateMatrixWorld(true); return Math.max(0.05, -Pt.clone().applyMatrix4(camera.matrixWorldInverse).z); }
// world direction for a screen point (sx, sy)
function rayDir(camera, sx, sy) { camera.updateMatrixWorld(true); return new THREE.Vector3(2 * sx - 1, 1 - 2 * sy, 0.5).unproject(camera).sub(camera.position).normalize(); }
const azOf = (d) => THREE.MathUtils.radToDeg(Math.atan2(d.x, -d.z)); // sky.js azimuth (0 = −Z, 90 = +X)

// ==========================================================================================
export default async function create(ctx) {
  const { cam, util } = ctx;
  const { ease } = util;
  const Q = new URLSearchParams(location.search);
  const DBG = Q.get('sddbg');                                             // debug: pull the camera back to see the staging
  const OFF = new Set((Q.get('sdoff') || '').split(',').filter(Boolean)); // perf A/B: shadow,sea,fig,dof,foam,cloud
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 12000);
  camera.userData.H = ctx.H;
  scene.fog = new THREE.FogExp2(0x1a2438, 0.0);

  // ---- sky, sea (hero + cheap background instance), coasts, shore lights, cumulus cards
  const sky = createSky({ preset: 'night' });
  const sea = createSea({ sky, swell: 'heavy', windDir: 38, seed: 3, foam: 0.6, spread: 2.1 });
  const seaLo = createSea({ sky, swell: 'heavy', windDir: 38, seed: 3, foam: 0.6, spread: 2.1, cols: 80, rows: 56, defines: { NO_PPW: '' } });
  scene.add(sky.object3D, sea.object3D, seaLo.object3D);
  // draw order: everything near first, then the coast, the sea and finally the sky dome (it sits at the far plane, depth-tested),
  // so pixels hidden behind the ship / figures are rejected by the depth test instead of running the sea & sky shaders
  sea.object3D.renderOrder = seaLo.object3D.renderOrder = 50; sky.object3D.renderOrder = 100;
  const W0 = sea.waves.map((w) => ({ A: w.A, Q: w.Q }));
  function setSwell(k = 1) { // scale the swell height (steepness kept) on both instances + the CPU wave set
    for (const s of [sea, seaLo]) s.waves.forEach((w, i) => { w.A = W0[i].A * k; w.Q = W0[i].Q / k; s.uniforms.uW.value[i].w = w.A; s.uniforms.uW2.value[i].x = w.Q; });
  }
  const coast8 = createCoast({ sky, az0: -20, az1: 0, distance: 4300, height: 62, lights: 0, seed: 5, haze: 0.22 });
  const coastT = createCoast({ sky, az0: -14, az1: 2, distance: 4300, height: 48, lights: 0, seed: 9, haze: 0.16 });
  scene.add(coast8.object3D, coastT.object3D);
  for (const c of [coast8, coastT]) c.land.renderOrder = 40;
  const shore = shoreLight(), shore2 = shoreLight(); scene.add(shore.object3D, shore2.object3D);
  const cloudG = new THREE.Group(); scene.add(cloudG);
  {
    const rr = util.rng(808);
    const defs = [[-35, 0.5, 2500, 1.15, 1.2], [-15, 0.7, 1300, 0.8, 0.85], [10, 0.4, 1800, 1.0, 0.7], [31, 0.9, 1150, 0.7, 0.6]];
    defs.forEach(([az, el, h, tower, k], i) => {
      const tex = cumulusTex(rr, { lit: -1, tower });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(0.24 * k), opacity: 0.8 }));
      const d = 7600, a = THREE.MathUtils.degToRad(az);
      m.scale.set(h * 1.45, h, 1); m.position.set(Math.sin(a) * d, d * Math.tan(THREE.MathUtils.degToRad(el)) + h * 0.36, -Math.cos(a) * d); m.renderOrder = -500; m.frustumCulled = false;
      m.userData.k = k; cloudG.add(m);
    });
  }

  // ---- lights
  const moon = new THREE.DirectionalLight(0xdde5ee, 0.8);
  // no moon shadow map: at these night levels it was ~30 % of the frame cost (PCF soft taps on every lit pixel + a skinned
  // figure shadow pass) for little visible gain; ?sdon=shadow restores it for A/B
  moon.castShadow = (Q.get('sdon') || '').includes('shadow'); moon.shadow.mapSize.set(1536, 1536); moon.shadow.bias = -0.0002; moon.shadow.normalBias = 0.004;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(0x2a3a58, 0x0b0e14, 0.6); scene.add(hemi);
  const glowLight = new THREE.DirectionalLight(0xd08a4c, 0.0); scene.add(glowLight, glowLight.target); // dusk afterglow / dawn sky key (no shadow)
  const hatchLight = new THREE.PointLight(0xE2A458, 0.0, 0, 2); // the cabin lamp spilling up through the open hatch (S067 low warm fill)
  applyEnv(scene, ctx.renderer, 'moon_exterior', { intensity: 0.35 });

  // ---- the junk
  const { ship, parts } = buildJunk(ctx);
  scene.add(ship);
  hatchLight.position.copy(parts.hatchC).setY(POOP_Y + 0.08); ship.add(hatchLight);
  const lamp = FX.lantern({ style: 'horn', size: 1, intensity: 4, seed: 4, period: 7, pendulum: 0.06 });
  lamp.object3D.position.copy(parts.lampHook); ship.add(lamp.object3D);
  const ironM = new THREE.MeshStandardMaterial({ color: 0x1b1a1a, roughness: 0.62, metalness: 0.7 });
  const railHook = new THREE.Group(); ship.add(railHook); // S067: short iron hook on a rail stanchion
  { const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.0, 0.09).translate(0, -0.5, 0), TX.mat('wood_beam', { tex: { seed: 45 } })); post.position.set(0, 0.04, -0.13); post.castShadow = true; railHook.userData.post = post;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.15), ironM); arm.position.set(0, 0.03, -0.065);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.025), ironM); tip.position.set(0, -0.02, 0.0);
    railHook.add(post, arm, tip); }
  const foam = buildFoam(sea); scene.add(foam.object3D);
  const spray = FX.seaSpray({ center: [0, 1, 0], area: [30, 2, 14], count: 10, size: 2.4, opacity: 0.05, color: 0x9aa6bc, seed: 7,
    burst: { origin: [0, 1, 0], dir: [0.4, 0.8, 0.5], period: 3.4, speed: 4.5, size: 0.5, count: 60 } });
  scene.add(spray.object3D);
  const mist = FX.seaSpray({ center: [0, 4, 0], area: [12, 3, 12], count: 26, size: 1.6, opacity: 0.035, color: 0x8794ab, seed: 12 });
  scene.add(mist.object3D);

  // ---- figures (baked cache variants: NAVIGATOR outerCoat / plain, COMPANION mid; close-up hands for S045)
  const navC = await loadCharacter('NAVIGATOR', { outerCoat: true });   // night watch: brown padded coat (S022, S045, view)
  const navJ = await loadCharacter('NAVIGATOR');                        // indigo jacket only (S067 after giving the coat, S075)
  const comp = await loadCharacter('COMPANION', { lod: 'mid' });         // curled asleep (S067, < 1/3 frame height)
  const handR = await loadCharacterHand('NAVIGATOR', 'R', { cuffTurned: true, lod: 'close' });
  const handL = await loadCharacterHand('NAVIGATOR', 'L', { lod: 'close' });
  for (const f of [navC, navJ]) ship.add(f.root);
  ship.add(handR.root, handL.root);
  for (const h of [handR, handL]) for (const m of h.cuffMats) { m.color.multiplyScalar(0.62); if ('sheen' in m) m.sheen = Math.min(m.sheen, 0.25); } // faded indigo, not lit-plastic under the moon
  const helm = await loadCrowd('navigator', [{ pos: [XS + 3.1, POOP_Y, -0.35], rotY: Math.PI / 2 + 0.3, pose: 'stand', seed: 2 }], { castShadow: false });
  ship.add(helm);
  // S045: the sleeves are "pushed up" — the figure's sleeve ends (coat, jacket, forearm) are discarded in an 11 cm capsule around
  // each wrist (chained onto the figure's own materials) so only the close-up hands' jacket cuffs and the patch show there
  const sleeveU = { uClipA: { value: [V3(0, -99, 0), V3(0, -99, 0)] }, uClipB: { value: [V3(0, -99, 0), V3(0, -99, 0)] }, uClipR: { value: 0.13 }, uClipOn: { value: 0 } };
  const clipMats = []; // the discard is compiled in only while S045 needs it (a discard defeats early depth rejection)
  const clipDefine = (on) => { for (const m of clipMats) { if (!!m.userData.sleeveClip === on) continue; m.userData.sleeveClip = on; m.defines = m.defines || {}; if (on) m.defines.SLEEVE_CLIP = ''; else delete m.defines.SLEEVE_CLIP; m.needsUpdate = true; } };
  for (const [k, m] of Object.entries(navC.materials)) {
    if (!m || !m.isMaterial || k === 'hair') continue;
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      Object.assign(sh.uniforms, sleeveU);
      sh.vertexShader = 'varying vec3 vClipW;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vClipW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vClipW; uniform vec3 uClipA[2]; uniform vec3 uClipB[2]; uniform float uClipR, uClipOn;\nfloat sdSeg(vec3 p, vec3 a, vec3 b){ vec3 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }\n'
        + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n #ifdef SLEEVE_CLIP\n if (uClipOn > 0.5 && (sdSeg(vClipW, uClipA[0], uClipB[0]) < uClipR || sdSeg(vClipW, uClipA[1], uClipB[1]) < uClipR)) discard;\n #endif');
    };
    m.customProgramCacheKey = () => (prevKey ? prevKey.call(m) : '') + '|sleeveclip';
    clipMats.push(m);
  }
  // own forearm sleeves for S045: the padded coat sleeve bunched from the elbow to mid-forearm (tapered tube, open at the wrist end)
  const sleeveTex = TX.cotton({ tone: [91, 70, 52], threads: 70, creases: 0.9, slub: 0.7, fade: 0.5, seed: 78 });
  const sleeveM = new THREE.MeshStandardMaterial({ map: sleeveTex.map, normalMap: sleeveTex.normalMap, normalScale: new THREE.Vector2(1, 1), roughness: 0.93, side: THREE.DoubleSide });
  const sleeveGeo = (() => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.083 + 0.012 * Math.sin(t * Math.PI * 3) * (1 - t) + 0.01 * (1 - t), t)); } return new THREE.LatheGeometry(pts, 20); })();
  const sleeves = [new THREE.Mesh(sleeveGeo, sleeveM), new THREE.Mesh(sleeveGeo, sleeveM)];
  for (const m of sleeves) { m.castShadow = m.receiveShadow = true; m.visible = false; }
  const setSleeveClip = (f, on) => {
    sleeveU.uClipOn.value = on ? 1 : 0; for (const m of sleeves) m.visible = on; if (!on) return;
    ['R', 'L'].forEach((sd, i) => { const w = f.worldPos(`arm${sd}.hand`), e = f.worldPos(`arm${sd}.lower`); const d = w.clone().sub(e).normalize();
      sleeveU.uClipA.value[i].copy(w).addScaledVector(d, 0.06); sleeveU.uClipB.value[i].copy(e).addScaledVector(d, 0.02);
      // tube from 0.115 m short of the wrist (open end over the close-up jacket cuff) back to the elbow
      const m = sleeves[i], a = w.clone().addScaledVector(d, -0.115), b = e.clone().addScaledVector(d, -0.03);
      m.position.copy(a); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); m.scale.set(1, a.distanceTo(b), 1); m.updateMatrixWorld(true); });
  };
  scene.add(...sleeves);
  const catch1 = FX.glow({ color: P.P13, size: 0.008, intensity: 0, falloff: 3 }); scene.add(catch1.object3D);
  // patch centre on the turned-back right cuff, in hand-root space (from the cuff's aux.y mask)
  const patchLocal = (() => {
    const acc = new THREE.Vector3(); let n = 0;
    for (const m of handR.meshes.cuffs) { const a = m.geometry.attributes.aux, p = m.geometry.attributes.position; if (!a) continue; for (let i = 0; i < a.count; i++) if (a.getY(i) > 0.5) { acc.x += p.getX(i); acc.y += p.getY(i); acc.z += p.getZ(i); n++; } }
    return n ? acc.multiplyScalar(1 / n) : V3(0.055, 0.03, 0);
  })();

  // ------------------------------------------------------------------------------------------ S067 staging, solved from the camera rig
  // camera (ship-local): poop deck forward-port, 2.0 m above the planks, looking aft-starboard 10° down, 50 mm.
  const S67 = { C: V3(-10.35, POOP_Y + 1.9, -2.95), F: V3(0, 0, 1), pitch: THREE.MathUtils.degToRad(-9) };
  {
    // camera at the port rail of the poop looking straight across to the starboard rail (rail parallel to frame), 50 mm, 9° down.
    // Both figures ~4.7 m away, the lantern on its hook just inboard of the starboard rail at 5.9 m.
    // (The shot list's (0.70, 0.66) for a boy lying at deck level is unreachable at 50 mm with the navigator's chest at (0.26, 0.50):
    //  the boy sits lower, at y ≈ 0.74, on a raised hatch cover.)
    const tc = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 100); cam.lens(tc, 50);
    tc.position.copy(S67.C); tc.rotation.order = 'YXZ'; tc.rotation.set(S67.pitch, yawOf(S67.F), 0); tc.updateMatrixWorld(true);
    const ray = (sx, sy) => V3(2 * sx - 1, 1 - 2 * sy, 0.5).unproject(tc).sub(tc.position).normalize();
    const atDepth = (sx, sy, d) => { const r = ray(sx, sy); return S67.C.clone().addScaledVector(r, d / r.dot(S67.F)); };
    S67.R = V3(-S67.F.z, 0, S67.F.x);
    const chest = atDepth(0.225, 0.40, 4.55);
    S67.nav = V3(chest.x, POOP_Y, chest.z);
    S67.boyC = atDepth(0.70, 0.74, 4.85);
    S67.plat = clamp(S67.boyC.y - POOP_Y - 0.2, 0.3, 0.7);
    S67.flame = atDepth(0.38, 0.36, 5.95);
    S67.hook = S67.flame.clone().add(V3(0, 0.34, 0));
    S67.navChest = chest;
  }
  // the low hatch cover the boy sleeps on + the coil at his back
  const platM = TX.mat('wood_ship', { tex: { salt: 0.4, planks: 4, seed: 61 }, color: new THREE.Color(0.7, 0.66, 0.6) });
  const plat = new THREE.Mesh(new THREE.BoxGeometry(2.0, S67.plat, 1.1), platM); plat.castShadow = plat.receiveShadow = true;
  plat.position.set(S67.boyC.x, POOP_Y + S67.plat / 2, S67.boyC.z).addScaledVector(S67.F, 0.22); plat.rotation.y = yawOf(S67.F) + Math.PI / 2 - Math.PI / 2; ship.add(plat);
  { const a = Math.atan2(S67.R.x, S67.R.z); plat.rotation.y = a - Math.PI / 2; }
  const coil67 = new THREE.Mesh(ropeCoil(0.34, 5, 0.022, 9), new THREE.MeshStandardMaterial({ map: (() => { const t = ropeTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); return t; })(), roughness: 0.92 }));
  coil67.position.copy(S67.boyC).setY(POOP_Y + S67.plat).addScaledVector(S67.F, 0.62).addScaledVector(S67.R, 0.35); coil67.castShadow = coil67.receiveShadow = true; ship.add(coil67);

  // companion: lying on his left side, facing the camera, head toward screen-right (+R)
  const boyRig = new THREE.Group(); ship.add(boyRig); boyRig.add(comp.root);
  boyRig.rotation.y = Math.atan2(-S67.F.x, -S67.F.z) - Math.PI / 2 + Math.PI / 2; // rig +Z -> -F
  { // rig +X must map to +R: solve the yaw directly
    const th = Math.atan2(-S67.F.x, -S67.F.z); // maps +Z to -F
    boyRig.rotation.y = th;
  }
  comp.root.rotation.set(0, 0, -Math.PI / 2);
  const boyPose = (T, pull = 0, shiver = 1) => {
    comp.pose({
      'legL.upper.x': 1.35, 'legR.upper.x': 1.2, 'legL.lower.x': 1.9, 'legR.lower.x': 1.75, 'legL.upper.z': 0.06, 'legR.upper.z': -0.04,
      'legL.foot.x': 0.45, 'legR.foot.x': 0.4,
      'hips.x': 0.08, 'spine.x': 0.28, 'chest.x': 0.3, 'neck.x': 0.32, 'head.x': 0.16, 'head.z': -0.14,
      'armL.upper.x': 1.0, 'armL.upper.z': 0.08, 'armL.lower.x': 1.95, 'armL.upper.y': 0.3,
      'armR.upper.x': 0.85 + 0.3 * pull, 'armR.upper.z': 0.04, 'armR.lower.x': 2.0 + 0.25 * pull, 'armR.upper.y': 0.4, 'armR.hand.x': 0.3,
      'armL.clav.z': 0.08, 'armR.clav.z': 0.08,
      handL: ['relaxed', { curl: 0.85 }], handR: ['relaxed', { curl: 0.9 }],
    });
    comp.tremble(T, shiver);
    comp.breathe(T, 0.8, 0.28);
  };
  boyPose(0);
  ship.updateMatrixWorld(true);
  { // settle on the platform and centre on the solved point; then build the coat keyframes on top of him
    const bakeBB = () => { const b = comp.bake(); const M = comp.root.matrixWorld, t = new THREE.Vector3(), bb = new THREE.Box3(); for (const m of b.children) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) bb.expandByPoint(t.fromBufferAttribute(p, i).applyMatrix4(M)); } return { b, bb }; };
    let { bb } = bakeBB();
    const c = bb.getCenter(new THREE.Vector3());
    boyRig.position.add(V3(S67.boyC.x - c.x, POOP_Y + S67.plat + 0.01 - bb.min.y, S67.boyC.z - c.z));
    ship.updateMatrixWorld(true);
    const r2 = bakeBB();
    buildCoatShapes(r2.b, comp.root.matrixWorld, r2.bb);
  }

  // ---- the coat (S067): keyframes A (gathered in his hands) · B (flung, spreading in the wind) · C (draped over the boy)
  const coatM = coatMaterial();
  const coatGeo = S67.coatGeo;
  const coat = new THREE.Mesh(coatGeo, coatM.material); coat.frustumCulled = false; coat.castShadow = false; coat.receiveShadow = true; ship.add(coat);

  function buildCoatShapes(baked, M, bb) {
    const tmp = new THREE.Vector3(); const verts = [];
    for (const m of baked.children) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i).applyMatrix4(M); verts.push(tmp.x, tmp.y, tmp.z); } }
    const base = POOP_Y + S67.plat + 0.01;
    const N = 80, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, half = 1.25, cell = 2 * half / N;
    const Hf = new Float32Array(N * N).fill(base);
    // off the platform the cloth falls to the deck
    const platInv = new THREE.Matrix4(); plat.updateMatrixWorld(true); platInv.copy(plat.matrixWorld).invert();
    for (let gz = 0; gz < N; gz++) for (let gx = 0; gx < N; gx++) { const x = cx - half + (gx + 0.5) * cell, z = cz - half + (gz + 0.5) * cell; const lp = V3(x, POOP_Y + 0.2, z).applyMatrix4(platInv); const o = Math.max(Math.abs(lp.x) - 1.0, Math.abs(lp.z) - 0.55); if (o > 0) Hf[gz * N + gx] = base - Math.min(0.32, o * 2.2); }
    for (let i = 0; i < verts.length; i += 3) { const gx = Math.floor((verts[i] - cx + half) / cell), gz = Math.floor((verts[i + 2] - cz + half) / cell); if (gx < 0 || gz < 0 || gx >= N || gz >= N) continue; const k = gz * N + gx; if (verts[i + 1] > Hf[k]) Hf[k] = verts[i + 1]; }
    const cc = coil67.position; for (let gz = 0; gz < N; gz++) for (let gx = 0; gx < N; gx++) { const x = cx - half + (gx + 0.5) * cell, z = cz - half + (gz + 0.5) * cell; const r = Math.hypot(x - cc.x, z - cc.z); if (r < 0.38) Hf[gz * N + gx] = Math.max(Hf[gz * N + gx], base + 0.24 * (1 - sstep(0.28, 0.38, r))); }
    const dil = new Float32Array(N * N), RR = 3;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { let m = -1e9; for (let dz = -RR; dz <= RR; dz++) for (let dx = -RR; dx <= RR; dx++) { if (dx * dx + dz * dz > RR * RR) continue; const xx = clamp(x + dx, 0, N - 1), zz = clamp(z + dz, 0, N - 1); m = Math.max(m, Hf[zz * N + xx] - 0.02 * Math.hypot(dx, dz)); } dil[z * N + x] = m; }
    let cur = dil;
    for (let it = 0; it < 3; it++) { const nx = new Float32Array(N * N); for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { let s = 0, w = 0; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const xx = clamp(x + dx, 0, N - 1), zz = clamp(z + dz, 0, N - 1); const ww = 1 / (1 + dx * dx + dz * dz); s += cur[zz * N + xx] * ww; w += ww; } nx[z * N + x] = Math.max(POOP_Y + 0.015, s / w); } cur = nx; }
    const hAt = (x, z) => { const fx = (x - cx + half) / cell - 0.5, fz = (z - cz + half) / cell - 0.5; const x0 = clamp(Math.floor(fx), 0, N - 2), z0 = clamp(Math.floor(fz), 0, N - 2); const tx = clamp(fx - x0), tz = clamp(fz - z0);
      return lerp(lerp(cur[z0 * N + x0], cur[z0 * N + x0 + 1], tx), lerp(cur[(z0 + 1) * N + x0], cur[(z0 + 1) * N + x0 + 1], tx), tz); };
    const head = comp.worldPos('head'), hips = comp.worldPos('hips'), neck = comp.worldPos('neck');
    const along = head.clone().sub(hips).setY(0).normalize();
    let across = V3(-along.z, 0, along.x);
    const navF = S67.boyC.clone().sub(S67.nav).setY(0).normalize(), navL = V3(navF.z, 0, -navF.x);
    if (across.dot(navL) < 0) across.negate();
    const backSign = across.dot(S67.F) > 0 ? 1 : -1; // +across toward his back (away from camera)?
    S67.navYaw = Math.atan2(navF.x, navF.z); S67.navF = navF; S67.navL = navL; S67.head = head; S67.along = along;
    const collarC = neck.clone().addScaledVector(along, -0.06);
    const hA = S67.nav.clone().add(V3(0, 1.26, 0)).addScaledVector(navF, 0.3);
    const toBoy = collarC.clone().sub(hA).setY(0); const dB = toBoy.length(); toBoy.normalize();
    const nu = COAT_NU, nv = COAT_NV, n = (nu + 1) * (nv + 1);
    const A = new Float32Array(n * 3), B = new Float32Array(n * 3), Cc = new Float32Array(n * 3), cl = new Float32Array(n * 4);
    let k = 0;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
      const cu = i / nu * 2 - 1, cv = j / nv, x = cu * COAT_W / 2, y = cv * COAT_H;
      // A: hanging from both hands, collar between them, accordion folds
      const inBody = Math.abs(cu) <= 0.44;
      const pa = hA.clone().addScaledVector(navL, inBody ? 0.17 * cu / 0.44 : Math.sign(cu) * (0.17 + (Math.abs(cu) - 0.44) * 0.18))
        .add(V3(0, -y * 0.8 - (inBody ? 0 : (Math.abs(cu) - 0.44) * 0.3), 0))
        .addScaledVector(navF, 0.04 + 0.07 * Math.sin(cu * 11) * sstep(0.05, 0.45, cv) + 0.1 * cv);
      // B: flung — collar leading toward the boy, sheet spread wide, rising behind in the wind
      const mid = hA.clone().addScaledVector(toBoy, dB * 0.58).add(V3(0, -0.06, 0));
      const pb = mid.clone().addScaledVector(across, x * 1.08).addScaledVector(toBoy, -y * 0.82)
        .add(V3(0, y * 0.16 - 0.08 * y * y + 0.14 * Math.sin(Math.PI * cv) * Math.cos(cu * 1.3) + 0.05 * Math.abs(cu), 0));
      // C: draped — collar across his shoulders, length along his body toward the feet
      const xs = x * 0.82 + 0.16 * COAT_W / 2 * backSign; // shifted toward his back (the coil side) so the front edge just tucks over him
      const px = collarC.x + across.x * xs - along.x * y * 0.93, pz = collarC.z + across.z * xs - along.z * y * 0.93;
      const wr = 0.016 * Math.sin(cu * 13 + 2 * Math.sin(cv * 5)) * sstep(0.05, 0.3, cv) + 0.01 * Math.sin(cv * 17 + cu * 4);
      const pc = V3(px, hAt(px, pz) + 0.022 + wr, pz);
      A.set([pa.x, pa.y, pa.z], k * 3); B.set([pb.x, pb.y, pb.z], k * 3); Cc.set([pc.x, pc.y, pc.z], k * 3);
      cl.set([cu, cv, 1 - cv, clamp(1 - cv / 0.25) * clamp(1 - Math.abs(cu) * 0.9)], k * 4); // aCl.z: lag (hem lags, collar leads)
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const nrm = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); g.setIndex(idx); g.computeVertexNormals(); return g.attributes.normal.array; };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(Cc.slice(), 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm(Cc).slice(), 3));
    const uv = new Float32Array(n * 2); for (let j = 0, kk = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, kk++) { uv[kk * 2] = i / nu * 2.2; uv[kk * 2 + 1] = j / nv * 1.6; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aPA', new THREE.BufferAttribute(A, 3)); g.setAttribute('aPB', new THREE.BufferAttribute(B, 3)); g.setAttribute('aPC', new THREE.BufferAttribute(Cc, 3));
    g.setAttribute('aNA', new THREE.BufferAttribute(nrm(A), 3)); g.setAttribute('aNB', new THREE.BufferAttribute(nrm(B), 3)); g.setAttribute('aNC', new THREE.BufferAttribute(nrm(Cc), 3));
    g.setAttribute('aCl', new THREE.BufferAttribute(cl, 4)); g.setIndex(idx);
    S67.coatGeo = g;
    const corner = (cu) => { const i = Math.round((cu + 1) / 2 * nu); return { A: V3(A[i * 3], A[i * 3 + 1], A[i * 3 + 2]), B: V3(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]) }; };
    S67.cornerL = corner(0.44); S67.cornerR = corner(-0.44); // +cu is on the navigator's left
    S67.collarC = collarC; S67.pullDir = along.clone().multiplyScalar(0.07).add(V3(0, 0.035, 0));
  }

  // ------------------------------------------------------------------------------------------ per-frame world state
  function poseShip(T, k = 1) {
    const x0 = SHIP_SPEED * T, t = T - 0.45;
    const hb = sea.heightAt(x0 + 12, 0, t), hs = sea.heightAt(x0 - 12, 0, t), hp = sea.heightAt(x0, -3.6, t), hr = sea.heightAt(x0, 3.6, t), hc = sea.heightAt(x0, 0, t);
    const heave = ((hc * 2 + hb + hs + hp + hr) / 6) * 0.75 * k;
    const pitch = Math.atan2(hb - hs, 24) * 0.55 * k, roll = -Math.atan2(hr - hp, 7.2) * 0.5 * k;
    ship.position.set(x0, heave - 0.15, 0);
    ship.rotation.set(roll, 0, pitch, 'YZX');
    ship.updateMatrixWorld(true);
    return { x0, heave, pitch, roll };
  }
  const W = (x, y, z) => ship.localToWorld(V3(x, y, z));
  const WL = (v) => ship.localToWorld(v.clone());
  const dirW = (v) => v.clone().transformDirection(ship.matrixWorld);   // unit direction
  const vecW = (v) => v.clone().applyQuaternion(ship.quaternion);         // offset vector (keeps length)
  function stabPos(local, k = 0.35) { const full = ship.localToWorld(local.clone()); return V3(local.x + ship.position.x, local.y + ship.position.y, local.z).lerp(full, k); }
  function setMoon(azDeg, elDeg, target, intensity = 0.8, half = 3.5) {
    sky.set({ moonAz: azDeg, moonElev: elDeg });
    const d = sky.moonDir();
    moon.target.position.copy(target); moon.position.copy(target).addScaledVector(d, 40); moon.intensity = intensity;
    const c = moon.shadow.camera; c.left = c.bottom = -half; c.right = c.top = half; c.near = 20; c.far = 60; c.updateProjectionMatrix();
    moon.target.updateMatrixWorld();
  }
  function placeCoast(coastObj, centerAzDeg, k = 1) {
    coastObj.object3D.visible = true;
    coastObj.object3D.position.set(camera.position.x, 0, camera.position.z);
    coastObj.object3D.rotation.y = -THREE.MathUtils.degToRad(centerAzDeg);
    coastObj.object3D.scale.set(1, k, 1);
    coastObj.update(0);
  }
  function placeShoreLight(s, az, elevM = 4, intensity = 20, px = 7, dist = 4250) {
    const a = THREE.MathUtils.degToRad(az);
    s.object3D.visible = true;
    s.object3D.position.set(camera.position.x + Math.sin(a) * dist, elevM, camera.position.z - Math.cos(a) * dist);
    s.material.uniforms.uInt.value = intensity; s.material.uniforms.uPx.value = px;
  }
  const optional = [navC.root, navJ.root, comp.root, handR.root, handL.root, coat, helm, catch1.object3D, shore.object3D, shore2.object3D, coast8.object3D, coastT.object3D, spray.object3D, mist.object3D,
    foam.object3D, parts.hatchHalo.object3D, cloudG, plat, coil67, railHook, seaLo.object3D];
  function reset() {
    for (const o of optional) o.visible = false;
    for (const f of [navC, navJ]) { f.hands.L.root.visible = true; f.hands.R.root.visible = true; }
    lamp.object3D.visible = true; lamp.object3D.position.copy(parts.lampHook); for (const a of parts.lampArm) a.visible = true;
    parts.hatchHalo.set(0); parts.hatchGlowM.color.set(P.P13).multiplyScalar(2.2);
    glowLight.intensity = 0; hatchLight.intensity = 0; hemi.intensity = 0.6; hemi.color.set(0x2a3a58); hemi.groundColor.set(0x0b0e14); scene.fog.density = 0;
    sea.object3D.visible = !OFF.has('sea'); sky.object3D.visible = true; sleeveU.uClipOn.value = 0; for (const m of sleeves) m.visible = false;
    setSwell(1); camera.userData.H = ctx.H;
    for (const s of parts.sails) s.material.emissive.setRGB(0, 0, 0);
  }
  // the hero sea or the cheap one (defocused backgrounds)
  function useSea(lo) { sea.object3D.visible = !lo && !OFF.has('sea'); seaLo.object3D.visible = lo && !OFF.has('sea'); }
  function envUpdate(T, Te, { lampI = 4, seaLamp = 9, pose, swing = 1 } = {}) {
    sky.update(Te);
    const sw = [(-pose.roll * 1.4 + 0.07 * Math.sin(Te * 2 * Math.PI / 7.0 + 0.6)) * swing, (-pose.pitch * 1.1 + 0.03 * Math.sin(Te * 2 * Math.PI / 6.3)) * swing];
    lamp.update(Te, { swing: sw, intensity: lampI });
    const L = lamp.object3D.visible && lampI > 0 ? [{ position: lamp.flameWorld(), color: 0xE2A458, intensity: seaLamp }] : [];
    sea.setLamps(L); seaLo.setLamps(L);
    sea.update(Te, sea.object3D.visible ? camera : null); seaLo.update(Te, seaLo.object3D.visible ? camera : null);
    foam.material.uniforms.uTime.value = Te;
    parts.sailU.uBreath.value = 0.6 + 0.4 * Math.sin(Te * 0.9) * Math.sin(Te * 0.37 + 1.0);
  }
  // debug: pull back along the view to see the staging (render with ?sddbg=1)
  function debugCam() {
    if (!DBG || DBG === 'flat') return;
    const f = new THREE.Vector3(); camera.getWorldDirection(f);
    if (DBG === 'side' || DBG === 'side2') { // orbit 70° around the point 1.8 m ahead, keep it framed
      const piv = camera.position.clone().addScaledVector(f, 1.8), off = camera.position.clone().sub(piv).applyAxisAngle(V3(0, 1, 0), DBG === 'side' ? 1.2 : -1.2).multiplyScalar(1.6);
      camera.position.copy(piv).add(off); camera.lookAt(piv); cam.lens(camera, 35);
    } else if (DBG === 'top') { // overview from above the poop, camera position marked by the view direction
      const c = camera.position.clone();
      dbgMark.visible = true; dbgMark.position.copy(c); dbgMark.lookAt(c.clone().add(f));
      camera.position.copy(W(-11, POOP_Y + 13, 0.0)); camera.up.set(1, 0, 0); camera.lookAt(W(-11, POOP_Y, 0)); camera.up.set(0, 1, 0); cam.lens(camera, 24);
    } else camera.position.addScaledVector(f, -(+DBG > 1 ? +DBG : 6)).add(V3(0, 1.5, 0)), cam.lens(camera, 24);
    camera.updateMatrixWorld(true);
    if (sea.object3D.visible) sea.update(sea.uniforms.uT.value, camera); if (seaLo.object3D.visible) seaLo.update(seaLo.uniforms.uT.value, camera);
  }
  const post = (p) => { if (OFF.has('dof')) p.dof = null; if (DBG) { p.dof = null; p.exposure = (p.exposure || 1) * 2.5; } return p; };
  const dbgMark = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3020 })); dbgMark.visible = false; scene.add(dbgMark);

  // ------------------------------------------------------------------------------------------ setups
  const setups = {
    // ---------------------------------------------------------------- S008 EWS dusk — tiny junk, vast heavy sea, shore light far left
    S008(tl, u, T) {
      reset();
      setSwell(1.35);
      const pose = poseShip(T, 1);
      sky.set({ preset: 'dusk', sunAz: -46, sunElev: -2.5, cloudCover: 0.42, cloudScale: 0.07, cloudDensity: 0.8, moonAz: 120, moonElev: 14, stars: 0.18 });
      cam.lens(camera, 28);
      // high, steady heavy-lift aerial: slow constant pull-back + rise; registered: ship (0.55,0.64), horizon y≈0.42, light (0.10,0.44)
      const e = clamp(u) * 0.85 + ease.inOutSine(clamp(u)) * 0.15;
      const D = lerp(292, 352, e), Hc = lerp(30, 41, e);
      const shipC = W(-1.0, 3.2, 0);
      const pitch = pitchForHorizon(camera, lerp(0.42, 0.405, e));
      const dirC = V3(0.06, 0, -1).normalize();
      // place the camera so the ship sits at (0.55, 0.64): solve distance along the screen ray with the camera height fixed
      camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yawOf(dirC), 0); camera.position.set(0, 0, 0); camera.updateMatrixWorld(true);
      const r = V3(2 * 0.55 - 1, 1 - 2 * 0.64, 0.5).unproject(camera).normalize();
      const tRay = (Hc - shipC.y) / -r.y;
      camera.position.copy(shipC).addScaledVector(r, -tRay); camera.updateMatrixWorld(true);
      cam.handheld(camera, T, 0.12, 11);
      const camAz = azOf(rayDir(camera, 0.5, 0.5));
      // coast on the far-left horizon (ends ≈ x 0.24), one warm light at (0.10, 0.44) that dips once at 47.18 s (f1132)
      const az10 = azOf(rayDir(camera, 0.10, 0.44)), az24 = azOf(rayDir(camera, 0.24, 0.42));
      placeCoast(coast8, az24 + 2.6, 0.75);
      const dip = 1 - 0.85 * Math.exp(-Math.pow((T - 47.2) / 0.08, 2));
      placeShoreLight(shore, az10, 4, 9 * dip, 4.5);
      placeShoreLight(shore2, az10 - 5.5, 5, 2.4, 3.2);
      cloudG.visible = !OFF.has('cloud'); cloudG.position.set(camera.position.x, 0, camera.position.z); for (const c of cloudG.children) c.lookAt(camera.position.x, c.position.y, camera.position.z);
      // dusk light: sky fill + the faint afterglow through the matting sails
      const sd = sky.sunDir(); glowLight.color.set(0xd08a4c); glowLight.position.copy(shipC).addScaledVector(sd.setY(Math.max(0.08, sd.y)).normalize(), 60); glowLight.target.position.copy(shipC); glowLight.target.updateMatrixWorld(); glowLight.intensity = 0.4;
      for (const s of parts.sails) s.material.emissive.setRGB(0.05, 0.022, 0.012);
      setMoon(120, 14, shipC, 0.0, 22);
      hemi.color.set(0x41557e); hemi.groundColor.set(0x0c1220); hemi.intensity = 1.0;
      scene.fog.color.copy(sky.horizonColor()); scene.fog.density = 0.00036;
      helm.visible = true; foam.object3D.visible = !OFF.has('foam'); spray.object3D.visible = true;
      parts.hatchHalo.object3D.visible = true; parts.hatchHalo.set(1.4); parts.hatchGlowM.color.set(P.P13).multiplyScalar(4);
      const bw = W(XB + 0.5, 0.6, 0); spray.material.uniforms.uBO.value.copy(bw); spray.material.uniforms.uMin.value.set(bw.x - 15, -0.5, bw.z - 7);
      foam.material.uniforms.uCol.value.setRGB(0.2, 0.24, 0.32); foam.material.uniforms.uOp.value = 0.9;
      debugCam();
      envUpdate(T, T, { lampI: 7, seaLamp: 30, pose });
      spray.update(T);
      return post({ exposure: 1.2, temp: -0.04, contrast: 1.07, saturation: 0.9, bloom: { strength: 0.55, radius: 0.5, threshold: 0.65 }, vignette: 0.36, grain: 0.038, dof: null,
        shadowTint: [0.44, 0.49, 0.6], highTint: [0.58, 0.52, 0.45] });
    },

    // ---------------------------------------------------------------- S022 CU 135 mm: shore light sharp → rack to his eye
    S022(tl, u, T) {
      reset(); useSea(false);
      const pose = poseShip(T, 0.5);
      sky.set({ preset: 'night', cloudCover: 0.34, stars: 0.8 });
      cam.lens(camera, lerp(135, 139, ease.inOutSine(clamp(u))));   // ~3 % push
      const f = navC; f.root.visible = true;
      f.root.position.set(-11.0, POOP_Y, innerBeam(-11.0, POOP_Y) - 0.36); f.root.rotation.set(0, 0.05, 0);
      navLean(f, T, tl);
      ship.updateMatrixWorld(true);
      const eye = f.eye();
      const F = dirW(V3(-0.966, 0, 0.259)).setY(0).normalize();
      const pitch = pitchForHorizon(camera, 0.58);
      const yaw = yawOf(F);
      frameAt(camera, eyeL(f), 0.70, 0.40 + 0.004 * Math.sin(T * 2 * Math.PI / 7.2), 1.95, yaw, pitch);
      cam.handheld(camera, T, 0.1, 22);
      const camAz = azOf(F);
      for (const a of parts.lampArm) a.visible = false;
      const R = V3(-F.z, 0, F.x);
      // shore light at (0.30, 0.58) on the low coast spanning x 0..0.48
      placeCoast(coastT, azOf(rayDir(camera, 0.48, 0.58)) - 2.0, 1.0);
      placeShoreLight(shore, azOf(rayDir(camera, 0.30, 0.58)), 4, 11, 14);
      // light: hard moon from upper right (behind him, in depth) rims the head; the stern lantern low right warms his cheek
      setMoon(camAz + 38, 26, eye, 1.5, 1.2);
      lamp.object3D.position.copy(ship.worldToLocal(eye.clone().addScaledVector(R, 0.62).addScaledVector(F, -0.85).add(V3(0, -0.12, 0))));
      catch1.object3D.visible = true; catch1.object3D.position.copy(eyeL(f)); catch1.set(0.9 * sstep(1.1, 1.5, tl));
      debugCam();
      envUpdate(T, T, { lampI: 0.55, seaLamp: 3, pose, swing: 0.6 });
      // focus: the shore (∞) until 0.3 s, rack to the eye by 1.33 s (81.62 '某个人一面'), ≥ 1 beat
      const rk = ease.inOutSine(clamp((tl - 0.3) / 1.03));
      const focus = 1 / lerp(1 / 4000, 1 / depthOf(camera, eye), rk);
      return post({ dof: { focus, fstop: 2.0, maxCoc: 1.6 }, exposure: 1.35, temp: -0.08, contrast: 1.06, bloom: { strength: 0.6, radius: 0.6, threshold: 0.55 }, vignette: 0.42, grain: 0.04 });
    },

    // ---------------------------------------------------------------- S045 CU 100 mm: cuff/patch → tilt up to his eye, the shore light in it
    S045(tl, u, T) {
      reset(); useSea(true);
      const pose = poseShip(T, 0.45);
      sky.set({ preset: 'night', cloudCover: 0.34, stars: 0.8 });
      cam.lens(camera, 100);
      const f = navC; f.root.visible = true;
      // at the starboard rail of the poop, facing forward along it; camera at his front-left looks aft-starboard (the shore, as S022)
      f.root.position.set(-11.0, POOP_Y, innerBeam(-11.0, POOP_Y) - 0.45); f.root.rotation.set(0, Math.PI / 2, 0);
      const lookUp = ease.inOutSine(clamp((tl - 1.6) / 0.85));
      navPatch(f, T, tl, lookUp);
      ship.updateMatrixWorld(true);
      if (OFF.has('coat')) f.setLayerVisible('outercoat', false);
      const eye = f.eye(), handC = handL.root.localToWorld(V3(0, -0.06, 0.0)).lerp(handR.root.localToWorld(patchLocal.clone()), 0.72);
      // start nearly frontal (15° to his left: the crossing left sleeve stays at the side), arc to the 50° three-quarter as it tilts up
      const tx = clamp((tl - 1.6) / 1.4), tilt = (1 - Math.pow(1 - tx, 3)) * sstep(0, 0.12, tx); // soft start, eased out by 3.0 s: eye in frame by 2.4 s
      const Fs = dirW(V3(-0.966, 0, 0.259)).setY(0).normalize(), Fe = dirW(V3(-0.643, 0, 0.766)).setY(0).normalize();
      const F = Fs.clone().lerp(Fe, tilt).normalize();
      const pS = THREE.MathUtils.degToRad(-31), pE = pitchForHorizon(camera, 0.465);
      const tgt = handC.clone().lerp(eyeL(f), tilt);
      frameAt(camera, tgt, lerp(0.45, 0.60, tilt), lerp(0.60, 0.44, tilt), lerp(1.8, 1.62, tilt), yawOf(F), lerp(pS, pE, tilt));
      cam.handheld(camera, T, 0.1, 45);
      if (Q.get('sdlog')) { const pr = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5).toFixed(3), (0.5 - p.y * 0.5).toFixed(3)]; }; console.log('S045 patch', pr(handR.root.localToWorld(patchLocal.clone())), 'tipL', pr(handL.tip('index', new THREE.Vector3())), 'thumbL', pr(handL.tip('thumb', new THREE.Vector3())), 'handL', pr(handL.root.localToWorld(V3(0, -0.06, 0))), 'wristR', pr(handR.root.getWorldPosition(V3(0,0,0))), 'elbowR', pr(f.worldPos('armR.lower')), 'elbowL', pr(f.worldPos('armL.lower'))); }
      const camAz = azOf(F), R = V3(-F.z, 0, F.x);
      for (const a of parts.lampArm) a.visible = false;
      placeShoreLight(shore, azOf(rayDir(camera, 0.40, 0.46)), 4, 11, 14);
      placeCoast(coastT, azOf(rayDir(camera, 0.33, 0.46)), 0.8);
      setMoon(azOf(Fs) + 112, 46, handC.clone().lerp(eye, 0.5), 1.25, 1.3); // hard moon from upper right, on the camera side: keys the hands' tops + the patch
      { const fw = fwdOf(f), lf = V3(fw.z, 0, -fw.x); lamp.object3D.position.copy(f.root.position.clone().addScaledVector(lf, 0.85).addScaledVector(fw, 0.38).setY(POOP_Y + 1.62)); } // hook: flame ≈ 1.3 m, at his left-front (frame right)
      catch1.object3D.visible = true; catch1.object3D.position.copy(eyeL(f)); catch1.set(0.9 * sstep(2.3, 2.5, tl));
      debugCam();
      envUpdate(T, T, { lampI: 1.3, seaLamp: 3, pose, swing: 0.6 });
      const rk = ease.inOutSine(clamp((tl - 1.6) / 0.8));
      const focus = lerp(depthOf(camera, handC), depthOf(camera, eye), rk);
      return post({ dof: { focus, fstop: 2.2, maxCoc: 1.5 }, exposure: 1.4, temp: -0.06, contrast: 1.06, bloom: { strength: 0.55, radius: 0.6, threshold: 0.55 }, vignette: 0.42, grain: 0.04 });
    },

    // ---------------------------------------------------------------- S067 MS 50 mm handheld: the coat unfurls over the boy (48→24 fps at 1.3 s)
    S067(tl, u, T, shot) {
      reset(); useSea(true);
      // time remap: 0–1.3 s at 50 % (48 fps capture), 1.3–1.5 s ramp, then real time
      const t0 = shot.in_frame / 24;
      const te = tl < 1.3 ? tl * 0.5 : tl < 1.5 ? 0.65 + 0.5 * (tl - 1.3) + 1.25 * (tl - 1.3) ** 2 : 0.65 + 0.15 + (tl - 1.5);
      const Te = t0 + te;
      const pose = poseShip(Te, 0.4);
      sky.set({ preset: 'night', cloudCover: 0.32, stars: 0.9 });
      cam.lens(camera, 50);
      // coat progress (screen time): shaken open 0.39 s, settles 1.04 s (214.25 surge)
      const pc = clamp((tl - 0.39) / 0.65);
      coat.visible = true; coatM.U.uP.value = pc; coatM.U.uT.value = Te; coatM.U.uFlut.value = 1.0; coatM.U.uLift.value = 0.14;
      const pull = ease.inOutSine(clamp((tl - 1.55) / 0.3));
      coatM.U.uPull.value = pull; coatM.U.uPullDir.value.copy(S67.pullDir);
      comp.root.visible = true; plat.visible = true; coil67.visible = true; boyPose(Te, pull, lerp(1.0, 0.2, sstep(1.0, 1.6, tl)));
      navJ.root.visible = true; navThrow(navJ, Te, tl);
      ship.updateMatrixWorld(true);
      // camera: handheld, slightly high; the lantern registers at (0.38, 0.36) on frame 0
      const pos = stabPos(S67.C, 0.6);
      // the operator frames on the lantern (world-level, no roll): its cage centre sits at (0.38, 0.36) — the light match from S066
      lamp.object3D.position.copy(S67.hook); ship.updateMatrixWorld(true);
      aimAt(camera, pos, WL(S67.hook.clone().add(V3(0, -0.28, 0))), 0.38, 0.36);
      cam.handheld(camera, Te, 0.9, 67);
      const camAz = azOf(dirW(S67.F));
      setMoon(camAz + 128, 38, WL(S67.boyC).lerp(WL(S67.nav), 0.5), 0.52, 2.8);
      for (const a of parts.lampArm) a.visible = false;
      lamp.object3D.position.copy(S67.hook); railHook.visible = true; railHook.position.copy(S67.hook); railHook.rotation.y = yawOf(S67.F); railHook.userData.post.scale.y = S67.hook.y - POOP_Y + 0.04;
      hatchLight.intensity = OFF.has('hatch') ? 0 : 0.9;
      mist.object3D.visible = true; const mw = WL(S67.boyC).add(V3(0, 1, 0)); mist.material.uniforms.uMin.value.set(mw.x - 6, mw.y - 1.5, mw.z - 6); mist.update(Te);
      debugCam();
      envUpdate(T, Te, { lampI: 3.2, seaLamp: 9, pose });
      if (Q.get('sdlog')) { camera.updateMatrixWorld(true); const p = lamp.flameWorld().project(camera); console.log('after env lamp', (p.x*0.5+0.5).toFixed(3), (0.5-p.y*0.5).toFixed(3), lamp.flameWorld().toArray().map((x)=>x.toFixed(2)), WL(S67.hook).toArray().map((x)=>x.toFixed(2))); }
      if (Q.get('sdlog')) { const pr = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5).toFixed(3), (0.5 - p.y * 0.5).toFixed(3)]; };
        console.log('S067 lamp', pr(lamp.flameWorld()), 'navChest', pr(WL(S67.navChest)), 'boy', pr(WL(S67.boyC)), 'cam', camera.position.toArray().map((x) => x.toFixed(2)), 'rot', camera.rotation.toArray().slice(0, 3).map((x) => (+x).toFixed(3)), 'fov', camera.fov.toFixed(2), camera.aspect.toFixed(3)); }
      const focus = depthOf(camera, WL(S67.boyC).lerp(WL(S67.nav).add(V3(0, 1.2, 0)), 0.3));
      return post({ dof: { focus, fstop: 2.8, maxCoc: 1.2 }, exposure: 1.4, temp: -0.04, contrast: 1.05, bloom: { strength: 0.55, radius: 0.6, threshold: 0.6 }, vignette: 0.4, grain: 0.04 });
    },

    // ---------------------------------------------------------------- S075 MCU 100 mm locked: pre-dawn, he turns to the first light (screen-right)
    S075(tl, u, T) {
      reset(); useSea(true);
      const pose = poseShip(T, 0.35);
      cam.lens(camera, 100);
      const f = navJ; f.root.visible = true;
      // at the PORT rail of the poop, facing aft (screen-left = home); camera on the poop looking to port
      f.root.position.set(-11.0, POOP_Y, -(innerBeam(-11.0, POOP_Y) - 0.32)); f.root.rotation.set(0, -Math.PI / 2, 0);
      const turn = ease.inOutSine(clamp((tl - 1.0) / 0.55));
      // locked-off: the camera is solved from the END pose so his eye lands at (0.33, 0.40) — the S076 dissolve anchor
      navTurn(f, T, 1); ship.updateMatrixWorld(true);
      const eyeEnd = f.eye();
      const F = dirW(V3(0, 0, -1)).setY(0).normalize();
      frameAt(camera, eyeEnd, 0.33, 0.40, 5.6, yawOf(F), pitchForHorizon(camera, 0.47));
      navTurn(f, T, turn);
      ship.updateMatrixWorld(true);
      const neck = f.worldPos('neck').add(V3(0, 0.12, 0));
      const camAz = azOf(F);
      const sAz = camAz + 34;
      sky.set({ preset: 'predawn', sunAz: sAz, sunElev: -4.5, moonAz: camAz - 150, moonElev: 12, cloudCover: 0.3, stars: 0.2 });
      setMoon(camAz - 150, 12, neck, 0.0, 1.5);
      sky.blend({ preset: 'night', sunAz: sAz, moonAz: camAz - 150, moonElev: 12, cloudCover: 0.3 }, { preset: 'predawn', sunAz: sAz, sunElev: -4.5, moonAz: camAz - 150, moonElev: 12, cloudCover: 0.3 }, 0.82 + 0.1 * clamp(u));
      lamp.object3D.visible = false; for (const a of parts.lampArm) a.visible = false;
      const kd = dirFromAz(camAz + 122, 11);
      glowLight.color.set(0xe0bcaa); glowLight.position.copy(neck).addScaledVector(kd, 30); glowLight.target.position.copy(neck); glowLight.target.updateMatrixWorld();
      glowLight.intensity = 1.0 + 1.8 * turn;
      hemi.color.set(0x5a6e90); hemi.groundColor.set(0x141a26); hemi.intensity = 0.8;
      debugCam();
      envUpdate(T, T, { lampI: 0, seaLamp: 0, pose });
      return post({ dof: { focus: depthOf(camera, neck), fstop: 2.0, maxCoc: 1.4 }, exposure: 1.45, temp: 0.03, contrast: 1.03, bloom: { strength: 0.45, radius: 0.6, threshold: 0.7 }, vignette: 0.34, grain: 0.036 });
    },

    // ---------------------------------------------------------------- named nested view: the swinging horn stern lamp over the night sea
    view_shiplamp(tl, u, T) {
      // from the poop deck just inboard of the starboard-quarter bracket, looking outboard-aft over the swaying horn lamp onto
      // the swell and the moon's silver road; a strip of the rail lower left. Robust to pane aspects ~0.8 … 2.4 (vertical fov fixed).
      reset(); useSea(false);
      const pose = poseShip(T, 1);
      sky.set({ preset: 'night', cloudCover: 0.35, stars: 0.9 });
      camera.userData.H = 420;
      camera.fov = 40; camera.updateProjectionMatrix();
      const lampW = W(parts.lampHook.x, parts.lampHook.y - 0.3, parts.lampHook.z);
      const local = V3(parts.lampHook.x + 1.9, parts.lampHook.y + 0.55, parts.lampHook.z - 2.1);
      const pos = stabPos(local, 0.55);
      const sx = clamp(0.5 - 0.17 * Math.min(1.6, camera.aspect), 0.2, 0.36);
      aimAt(camera, pos, lampW, sx, 0.3);
      cam.handheld(camera, T, 0.4, 5);
      const camAz = azOf(rayDir(camera, 0.5, 0.5));
      setMoon(camAz + 24, 20, W(-13, POOP_Y + 1, 2.5), 0.55, 4);
      helm.visible = true;
      envUpdate(T, T, { lampI: 5, seaLamp: 16, pose, swing: 1.7 });
      return { dof: null };
    },
  };
  setups.default = setups.view_shiplamp;
  const dirFromAz = (az, el) => { const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el); return V3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };

  // ------------------------------------------------------------------------------------------ figure performances
  // the figure's LEFT eye (camera side in the left-profile shots): head-bone space, left = +X
  const eyeL = (f) => { const b = f.bone('head'); b.updateWorldMatrix(true, false); const hu = f.P.hu; return V3(0.17 * hu, 0.33 * hu, 0.40 * hu).applyMatrix4(b.matrixWorld); };
  const fwdOf = (f) => V3(Math.sin(f.root.rotation.y), 0, Math.cos(f.root.rotation.y));          // ship-local facing
  const toW = (f, dx, y, dz) => { const fw = fwdOf(f), lf = V3(fw.z, 0, -fw.x); return WL(f.root.position.clone().addScaledVector(lf, dx).addScaledVector(fw, dz).setY(POOP_Y + y)); };
  // standing at the rail, forearms on the cap, looking out (S022 / view)
  function navLean(f, T, tl) {
    f.pose('stand', { weight: 0.3 });
    f.pose({ 'spine.x': 0.08, 'chest.x': 0.12, 'neck.x': -0.04, 'head.x': -0.06, 'head.y': 0.05 }, { add: true });
    f.root.updateMatrixWorld(true);
    const fw = fwdOf(f), lf = V3(fw.z, 0, -fw.x);
    const capY = sheerY(sOf(f.root.position.x)) + 0.09 - POOP_Y;
    const railD = Math.abs(innerBeam(f.root.position.x, POOP_Y)) + 0.04 - Math.abs(f.root.position.z);
    const down = dirW(V3(0, -1, 0));
    f.reach('L', toW(f, 0.2, capY + 0.07, railD - 0.06), { palm: down, fingers: dirW(fw.clone().addScaledVector(lf, -0.6).normalize()) });
    f.reach('R', toW(f, -0.19, capY + 0.07, railD - 0.04), { palm: down, fingers: dirW(fw.clone().addScaledVector(lf, 0.6).normalize()) });
    f.hands.L.pose('relaxed', { curl: 0.5 }); f.hands.R.pose('relaxed', { curl: 0.6 });
    f.breathe(T, 0.8 + 0.6 * sstep(2.2, 2.45, tl) * (1 - sstep(2.6, 3.1, tl)), 0.22);
  }
  // the patch (S045): right forearm palm-up across the front of the waist, the rolled cuff shows the patch on top;
  // the left hand comes from his body side, palm down, fingertips resting on the patch (bible lock: LEFT fingers on the RIGHT cuff)
  function navPatch(f, T, tl, lookUp) {
    f.pose('stand', { weight: 0.2 });
    f.pose({ 'chest.x': 0.08, 'neck.x': lerp(0.48, 0.02, lookUp), 'head.x': lerp(0.36, -0.08, lookUp), 'head.y': lerp(0.05, -0.32, lookUp), 'neck.y': lerp(0, -0.12, lookUp) }, { add: true });
    f.root.updateMatrixWorld(true);
    const fw = fwdOf(f), lf = V3(fw.z, 0, -fw.x), up = V3(0, 1, 0), dn = V3(0, -1, 0);
    f.reach('R', toW(f, -0.03, 1.12, 0.35), { pole: dirW(dn.clone().addScaledVector(lf, -0.8).addScaledVector(fw, -0.3).normalize()), palm: dirW(up.clone().multiplyScalar(0.6).addScaledVector(fw, 0.55).addScaledVector(lf, 0.25).normalize()), fingers: dirW(lf.clone().multiplyScalar(0.72).addScaledVector(fw, 0.45).addScaledVector(up, 0.4).normalize()) });
    f.hands.R.root.visible = false; f.hands.L.root.visible = false;
    attachHand(handR, f, 'R', 0.0);
    handR.pose('relaxed', { curl: 0.72 });
    handR.root.updateMatrixWorld(true);
    const rub = 0.008 * Math.sin(Math.PI * clamp((tl - 0.6) / 0.45));
    const patchC = handR.root.localToWorld(patchLocal.clone());
    const patch = handR.root.localToWorld(patchLocal.clone().add(V3(0.004, rub, 0)));
    // the left hand comes from his body side (behind the right forearm as seen from camera), fingers forward-down onto the cuff's far edge
    const wT = patch.clone().add(vecW(fw.clone().multiplyScalar(-0.115).addScaledVector(up, 0.07).addScaledVector(lf, 0.04)));
    for (let it = 0; it < 4; it++) {
      f.reach('L', wT, { pole: dirW(dn.clone().addScaledVector(lf, 0.9).addScaledVector(fw, -0.2).normalize()), palm: dirW(dn.clone().multiplyScalar(0.9).addScaledVector(fw, -0.25).normalize()), fingers: dirW(fw.clone().multiplyScalar(0.75).addScaledVector(dn, 0.55).addScaledVector(lf, -0.25).normalize()) });
      attachHand(handL, f, 'L', 0.0);
      handL.pose('touch');
      handL.root.updateMatrixWorld(true);
      const tip = handL.tip('index', new THREE.Vector3());
      wT.add(patch.clone().add(vecW(up.clone().multiplyScalar(0.007))).sub(tip));
    }
    handR.root.visible = handL.root.visible = true;
    f.breathe(T, 0.9, 0.22);
    setSleeveClip(f, true);
  }
  function attachHand(h, f, side, distal) {
    const fh = f.hands[side];
    fh.root.updateMatrixWorld(true);
    const p = new THREE.Vector3(), qq = new THREE.Quaternion(), s = new THREE.Vector3(); fh.root.matrixWorld.decompose(p, qq, s);
    p.addScaledVector(V3(0, -1, 0).applyQuaternion(qq), distal);
    h.root.parent.updateMatrixWorld(true);
    const lm = new THREE.Matrix4().compose(p, qq, V3(1, 1, 1)).premultiply(h.root.parent.matrixWorld.clone().invert());
    lm.decompose(h.root.position, h.root.quaternion, h.root.scale);
    h.root.updateMatrixWorld(true);
  }
  // the coat: gathered at the chest → shaken open and flung (0.39 s) → released → hands settle → left fingers to the right cuff (S067)
  function navThrow(f, Te, tl) {
    const step = sstep(0.3, 0.75, tl) * 0.32 * (1 - 0.4 * sstep(1.3, 2.0, tl));
    f.root.position.copy(S67.nav).addScaledVector(S67.navF, step); f.root.rotation.set(0, S67.navYaw, 0);
    const lean = sstep(0.25, 0.6, tl) * (1 - sstep(1.15, 1.9, tl));
    f.pose('stand', { weight: 0.5 * lean });
    f.pose({ 'spine.x': 0.12 * lean, 'chest.x': 0.18 * lean, 'neck.x': 0.2, 'head.x': 0.14, 'hips.x': 0.04 * lean }, { add: true });
    f.root.updateMatrixWorld(true);
    const fwL = S67.navF, lfL = S67.navL;
    const at = (dx, y, dz) => WL(f.root.position.clone().addScaledVector(lfL, dx).addScaledVector(fwL, dz).setY(POOP_Y + y));
    const A_L = WL(S67.cornerL.A), A_R = WL(S67.cornerR.A);
    const ph1 = sstep(0.3, 0.6, tl), ph2 = sstep(0.6, 1.0, tl), ph3 = sstep(1.1, 1.8, tl);
    const chest = at(0, 1.26, 0.3), fling = at(0, 1.55, 0.6), follow = at(0, 1.05, 0.58), rest = at(0, 0.98, 0.12);
    const centre = chest.clone().lerp(fling, ph1).lerp(follow, ph2).lerp(rest, ph3);
    const spread = lerp(0.17, 0.28, ph1) * (1 - 0.45 * ph3);
    const lfW = dirW(lfL);
    let hl = centre.clone().addScaledVector(lfW, spread), hr = centre.clone().addScaledVector(lfW, -spread);
    if (tl < 0.32) { hl = A_L.clone(); hr = A_R.clone(); }
    const cuff = sstep(1.88, 2.1, tl);
    f.reach('R', hr.lerp(at(-0.05, 1.03, 0.3), cuff), { pole: dirW(V3(0, -1, 0).addScaledVector(lfL, -0.7)) });
    f.reach('L', hl.lerp(at(-0.09, 1.05, 0.33), cuff), { pole: dirW(V3(0, -1, 0).addScaledVector(lfL, 0.7)) });
    f.hands.L.pose(tl < 0.62 ? 'grip' : cuff > 0.4 ? 'touch' : 'relaxed', { radius: 0.02, curl: 0.4 }); f.hands.R.pose(tl < 0.62 ? 'grip' : 'relaxed', { radius: 0.02, curl: 0.5 });
    const lookP = tl < 1.75 ? WL(S67.collarC).lerp(WL(S67.head), sstep(0.6, 1.3, tl)) : at(-0.06, 1.0, 0.33);
    f.lookAt(lookP, 0.85);
    f.breathe(Te, 1.0, 0.25);
  }
  // pre-dawn: from looking home (screen-left) to the first light (screen-right) (S075)
  function navTurn(f, T, turn) {
    // turns to his own LEFT (through the camera side): from his left profile (home, screen-left) to a right three-quarter (first light)
    f.root.rotation.y = -Math.PI / 2 + 0.55 * turn;
    f.pose('stand', { weight: lerp(-0.25, 0.2, turn) });
    f.pose({ 'chest.y': lerp(0.0, 0.3, turn), 'spine.y': lerp(0.0, 0.12, turn), 'neck.y': lerp(0.1, 0.45, turn), 'head.y': lerp(0.28, 0.72, turn), 'head.x': lerp(-0.06, -0.1, turn), 'neck.x': -0.03 }, { add: true });
    f.breathe(T, 0.8, 0.2);
  }

  // ------------------------------------------------------------------------------------------
  return {
    scene, camera,
    post: { exposure: 1.2, contrast: 1.05, saturation: 0.9, vignette: 0.38, grain: 0.04, shadowTint: [0.45, 0.5, 0.6], highTint: [0.57, 0.52, 0.46], bloom: { strength: 0.45, radius: 0.55, threshold: 0.75 } },
    setShot(shot, tl, u, T) {
      const fn = setups[shot.id] || setups.default;
      const r = fn(tl, u, T, shot) || {};
      // lights that contribute nothing are switched off (an unlit shadow-casting moon would still render its shadow map)
      for (const l of [moon, glowLight, hatchLight, hemi]) l.visible = l.intensity > 1e-3;
      clipDefine(sleeveU.uClipOn.value > 0.5); // flips only at S045's boundaries (no per-frame recompiles)
      // the dome is drawn first (renderOrder −1000) over the whole frame: skip it when no ray of the frame reaches the sky
      camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
      const top = Math.max(rayDir(camera, 0, 0).y, rayDir(camera, 0.5, 0).y, rayDir(camera, 1, 0).y);
      sky.object3D.visible = top > -0.004 || DBG;
      return r;
    },
  };
}
