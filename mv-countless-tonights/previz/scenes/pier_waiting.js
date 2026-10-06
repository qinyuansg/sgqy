// pier_waiting — LOC_PIER: the 1920s–30s steamer waiting shed and quay (migrant era, CT_MIG), plus a small steamer-rail
// set at dawn for S076. Shots: S020 S031 S032 S033 S034 S036 S037 S038 S039 S043 S068 S076; named view: view_pier.
//
// World layout (metres, Y up). The shed runs along X (town / home at −X = screen-left in the −Z-facing set-ups; gate,
// end doors and gangway at +X = screen-right). Seaward long side +Z (open between cast-iron columns; the steamer is
// moored along it, z 16–28), landward wall at z −7.5. A waist-high timber railing along z = −3 separates travellers
// (z > −3) from the families seeing them off (z < −3); the stamp booth is built into that railing at x ≈ 3.7 and the
// passengers' gate is in a cross-railing at x = 8. Bulb lamps every 5 m along z = −0.6 (x −20 … 20; "third lamp" x = −10,
// her crate under it). Camera families: −Z (S020/S032/S037/S038/S043/view_pier: home screen-left, ship screen-right) and
// +X along the railing (S034/S036/S039/S068: families screen-left beyond the railing, steamer screen-right).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { createSea, createCoast } from '../lib/sea.js';
import { loadCharacter, loadCharacterHand, makeExtra, preloadCrowd } from '../lib/cast.js';
import { makeFigure } from '../lib/figure.js';
import { makeHand, handPose, blendHandChannels } from '../lib/hand.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const BULB = 0xffbb7c;            // 2400 K enamel-shaded incandescent (warm cream)
const BULB_C = new THREE.Color(BULB);
const LAMP_X = [-20, -15, -10, -5, 0, 5, 10, 15, 20], LAMP_Z = -0.6, LAMP_Y = 3.32;
const RAIL_Z = -3.0, GATE_X = 8.0, BOOTH_Z = -1.9; // booth: in the cross railing between the long railing and the gate
// her upturned crate under the third lamp, facing home (−X). (integration) placed so that lamp 3 (x −10) hangs at her LEFT
// (her local (0.85, 0.05)): a side key — rim on the hair crown, shoulder and cheek edge, raking light across the letter, her
// body's shadow falling off the lid — instead of the top light that made the brow a black 'blindfold' band. V2 (S031–S033) she sits on the same crate
// turned toward the railing and her family (rot π, SEAT_V2).
const SEAT = (() => { const rot = -Math.PI / 2 + 0.28, lx = 0.85, lz = 0.05, c = Math.cos(rot), s = Math.sin(rot);
  return { x: -10 - (lx * c + lz * s), z: -0.6 - (-lx * s + lz * c), rot }; })();
const SEAT_V2 = { x: SEAT.x + 0.15, z: SEAT.z + 0.35, rot: Math.PI };
const SEA_Y = -2.3;

export default async function create(ctx) {
  const { cam, util } = ctx;
  const { clamp, lerp, smoothstep, ease, keys } = util;
  const PZ0 = (new URLSearchParams(location.search).get('pz') || '').split(',').filter(Boolean); // perf A/B switches (+ window.__PZ)
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.03, 900);
  camera.userData.H = ctx.H;
  scene.background = new THREE.Color(0x05070b);
  const fog = new THREE.FogExp2(0x1a212d, 0.016);
  scene.fog = fog;

  // (integration) film grain: the engine's integer-hash grain (engine/post.js) is used everywhere; CT_MIG returns
  // grain 0.044 through the per-shot post (MIG_POST). The module-side half-res grain quad of the review pass is gone.

  // ---------------------------------------------------------------- small helpers
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, ...o });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; if (parent) parent.add(m); return m;
  };
  const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctex = (c, srgb = true, wrap = false) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.needsUpdate = true; return t; };
  const instanced = (geo, mat, mats, parent, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.castShadow = shadow; im.receiveShadow = true; if (parent) parent.add(im); return im;
  };
  const M4 = (x, y, z, ry = 0, s = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(s, s, s));
  const M4s = (x, y, z, ry, sx, sy, sz) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(sx, sy, sz));

  // ---------------------------------------------------------------- procedural textures (deterministic)
  // 蓝印花布 lining of the rattan case: indigo #3B5578, small white flowers #E6E0D2
  const liningMap = (() => {
    const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = util.rng(31);
    g.fillStyle = '#3B5578'; g.fillRect(0, 0, S, S);
    const N = TX.makeNoise(7), im = g.getImageData(0, 0, S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const n = N.fbm(x / S, y / S, 4, 3) * 0.5 + 0.5, i = (y * S + x) * 4; const k = 0.82 + 0.3 * n; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
    g.putImageData(im, 0, 0);
    const flower = (cx, cy, s) => { g.fillStyle = 'rgba(230,224,210,0.92)'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.ellipse(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55, s * 0.42, s * 0.24, a, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.arc(cx, cy, s * 0.16, 0, Math.PI * 2); g.fillStyle = '#3B5578'; g.fill(); };
    for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
      const cx = (i + 0.5 + (j % 2) * 0.5) * S / 10 + (r() - 0.5) * 4, cy = (j + 0.5) * S / 10 + (r() - 0.5) * 4;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { flower(cx + dx, cy + dy, 9 + r() * 2); g.fillStyle = 'rgba(230,224,210,0.85)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + dx + 22 + k * 5, cy + dy - 14 + k * 7, 1.8, 0, 7); g.fill(); } }
    }
    return ctex(c, true, true);
  })();
  // wet planks: roughness with puddles (G channel), 256²
  const puddleMap = (() => {
    const S = 256, c = canvas(S, S), g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data, N = TX.makeNoise(23);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S, n = N.fbm(u, v, 3, 4) * 0.5 + 0.5, f = N.fbm(u, v, 24, 2) * 0.5 + 0.5;
      const p = smoothstep(0.55, 0.63, n), rough = clamp(0.42 - 0.36 * p + 0.1 * f, 0.04, 1), i = (y * S + x) * 4;
      d[i] = 255 * (1 - 0.5 * p); d[i + 1] = rough * 255; d[i + 2] = 0; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); return ctex(c, false, true);
  })();
  // corrugated iron normal map (stripes along u)
  const corrugMap = (() => {
    const c = canvas(64, 4), g = c.getContext('2d'), im = g.createImageData(64, 4), d = im.data;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 64; x++) { const s = Math.sin(x / 64 * Math.PI * 2 * 2), nx = -0.7 * s, nz = 1, l = Math.hypot(nx, nz), i = (y * 64 + x) * 4; d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = 128; d[i + 2] = (nz / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
    g.putImageData(im, 0, 0); return ctex(c, false, true);
  })();
  // travel permit (PROP_PASS): opened folded card 24×18 cm, #E4DAC2, grey-green guilloche border, illegible rows, 4 photo corners + photo
  const permitMap = (() => {
    const W = 640, H = 480, c = canvas(W, H), g = c.getContext('2d'), r = util.rng(77), N = TX.makeNoise(17);
    const im = g.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = N.fbm(x / W, y / H, 5, 4) * 0.5 + 0.5, f = N.n(x / W * 240, y / H * 180, 240, 180), i = (y * W + x) * 4, k = 0.93 + 0.06 * n + 0.02 * f; d[i] = 228 * k; d[i + 1] = 218 * k; d[i + 2] = 194 * k; d[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    g.strokeStyle = 'rgba(124,139,126,0.9)'; g.lineWidth = 1.1;
    const band = (x0, y0, x1, y1) => { // twisted-rope guilloche along a straight band
      const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
      for (let k = 0; k < 4; k++) { g.beginPath(); for (let s = 0; s <= L; s += 1.5) { const o = 6 * Math.sin(s / 7 + k * Math.PI / 2) * Math.cos(s / 31 + k), px = x0 + ux * s + nx * o, py = y0 + uy * s + ny * o; s ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
    };
    const m = 22; band(m, m, W - m, m); band(W - m, m, W - m, H - m); band(W - m, H - m, m, H - m); band(m, H - m, m, m);
    g.strokeStyle = 'rgba(124,139,126,0.7)'; g.strokeRect(m + 12, m + 12, W - 2 * m - 24, H - 2 * m - 24);
    g.beginPath(); g.moveTo(W / 2, m + 14); g.lineTo(W / 2, H - m - 14); g.strokeStyle = 'rgba(150,140,118,0.5)'; g.stroke(); // centre fold
    g.strokeStyle = 'rgba(110,110,104,0.45)'; g.lineWidth = 0.8;
    for (let k = 0; k < 7; k++) { const y = 150 + k * 40; g.beginPath(); g.moveTo(W / 2 + 26, y); g.lineTo(W - m - 30, y); g.stroke(); g.beginPath(); g.moveTo(m + 34, y + 40); g.lineTo(W / 2 - 26, y + 40); g.stroke(); }
    g.strokeStyle = 'rgba(40,34,30,0.7)'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let k = 0; k < 9; k++) { const right = k < 6, y = (right ? 142 + k * 40 : 230 + (k - 6) * 40), x0 = right ? W / 2 + 70 + r() * 30 : m + 60; g.beginPath(); let x = x0; g.moveTo(x, y); for (let s = 0; s < 18 + r() * 14; s++) { x += 3 + r() * 4; g.lineTo(x, y - 2 - r() * 7 + (s % 2) * 6); } g.stroke(); }
    // photo + four corner mounts (top-left of the left leaf)
    const px = m + 40, py = m + 34, pw = 92, ph = 116;
    g.fillStyle = '#5d5650'; g.fillRect(px, py, pw, ph); g.fillStyle = 'rgba(150,140,128,0.5)'; g.fillRect(px + 6, py + 6, pw - 12, ph - 12);
    g.fillStyle = '#2c2a28'; for (const [cx, cy, sx, sy] of [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]]) { g.beginPath(); g.moveTo(cx - sx * 4, cy - sy * 4); g.lineTo(cx + sx * 22, cy - sy * 4); g.lineTo(cx - sx * 4, cy + sy * 22); g.closePath(); g.fill(); }
    return ctex(c);
  })();
  // stamp impression (PROP_STAMP, invented, no letters): double ring, simplified steamship, three waves, six-point star; aniline violet
  const stampMap = (() => {
    const S = 256, c = canvas(S, S), g = c.getContext('2d'), N = TX.makeNoise(5);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke(); g.lineWidth = 3.5; g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(58, 134); g.lineTo(198, 134); g.lineTo(184, 156); g.lineTo(72, 156); g.closePath(); g.fill(); // hull
    g.fillRect(96, 112, 64, 20); g.fillRect(118, 80, 16, 34); // superstructure, funnel
    g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 56; x <= 200; x += 2) { const y = 172 + k * 13 + 4 * Math.sin((x - 56) / 9); x === 56 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    g.beginPath(); for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + k * Math.PI / 6, rr = k % 2 ? 7 : 16; const x = 128 + Math.cos(a) * rr, y = 50 + Math.sin(a) * rr; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill();
    const im = g.getImageData(0, 0, S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4, n = N.fbm(x / S, y / S, 8, 3) * 0.5 + 0.5, a = d[i + 3] / 255 * clamp(0.55 + 0.7 * n, 0, 1) * (n < 0.3 ? 0.4 : 1); d[i] = 91; d[i + 1] = 74; d[i + 2] = 120; d[i + 3] = a * 235; }
    g.putImageData(im, 0, 0); return ctex(c);
  })();

  // ---------------------------------------------------------------- environment (custom PMREM of the shed: bulbs + blue seaward side)
  {
    const s = new THREE.Scene(), L = (r, g, b) => new THREE.Color(r, g, b), B = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    const room = new THREE.Mesh(boxG(50, 6, 15), [B(L(0.03, 0.02, 0.015)), B(L(0.02, 0.016, 0.012)), B(L(0.006, 0.006, 0.007)), B(L(0.02, 0.016, 0.013)), B(L(0.06, 0.08, 0.13)), B(L(0.02, 0.016, 0.012))]);
    room.position.y = 3; s.add(room);
    for (const x of LAMP_X) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), B(L(9, 5.2, 2.2))); b.position.set(x, 3.3, -0.6); s.add(b); }
    const open = new THREE.Mesh(new THREE.PlaneGeometry(48, 4), B(L(0.09, 0.13, 0.22))); open.position.set(0, 2.3, 7.45); s.add(open);
    const end = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.5), B(L(0.1, 0.14, 0.24))); end.position.set(24.9, 2.3, 0); end.rotation.y = -Math.PI / 2; s.add(end);
    const pm = new THREE.PMREMGenerator(ctx.renderer);
    scene.environment = pm.fromScene(s, 0.03, 0.05, 200).texture; pm.dispose();
    scene.environmentIntensity = 0.9;
  }

  // ================================================================ SKY + SEA (shared by the shed and the dawn deck)
  const sky = createSky({ preset: 'dusk' });
  sky.object3D.renderOrder = 6; // drawn after the opaque set: only the visible sky pixels are shaded
  scene.add(sky.object3D);
  const sea = createSea({ sky, swell: 'calm', windDir: 40, level: SEA_Y, cols: 96, rows: 72, foam: 0.2, defines: { NO_PPW: '' } });
  sea.object3D.renderOrder = 5;
  scene.add(sea.object3D);

  // ================================================================ THE SHED
  const shed = new THREE.Group(); shed.name = 'shed'; scene.add(shed);
  let townM = null;
  {
    // wet floor planks (planks across the shed, along Z), puddles in the roughness
    const ws = TX.wood({ tone: 'pale', planks: 6, seed: 41, wear: 0.7 });
    const wr = TX.withRepeat(ws, 44, 15);
    const pr = puddleMap.clone(); pr.repeat.set(5, 1.8); pr.needsUpdate = true;
    const floorM = std({ map: wr.map, normalMap: wr.normalMap, roughnessMap: pr, roughness: 1, color: 0x6e6862, envMapIntensity: 1.3 });
    floorM.normalScale = new THREE.Vector2(0.6, 0.6);
    const floor = mesh(new THREE.PlaneGeometry(52, 15.2), floorM, shed, 0, 0, 0, false); floor.rotation.x = -Math.PI / 2;
    // quay outside (wet granite setts): seaward strip and the quay head beyond the end doors
    const st = TX.withRepeat(TX.stone({ tone: 'dark', seed: 9 }), 30, 5);
    const pq = puddleMap.clone(); pq.repeat.set(4, 1); pq.needsUpdate = true;
    const quayM = std({ map: st.map, normalMap: st.normalMap, roughnessMap: pq, roughness: 1, color: 0x77746f });
    const q1 = mesh(new THREE.PlaneGeometry(96, 8.6), quayM, shed, 6, 0, 11.9, false); q1.rotation.x = -Math.PI / 2;
    const q2 = mesh(new THREE.PlaneGeometry(22, 20), quayM, shed, 36, 0, -2.2, false); q2.rotation.x = -Math.PI / 2;
    const qEdge = mesh(boxG(96, 2.6, 0.4), std({ color: 0x2a2826, roughness: 0.8 }), shed, 6, -1.3, 16.2, false);
    const qEdge2 = mesh(boxG(0.4, 2.6, 20), qEdge.material, shed, 47, -1.3, -2.2, false);
    // landward wall (lime-washed render, damp), clerestory openings onto the dusk sky
    const wallM = TX.mat('plaster', { repeat: [9, 1.1], tex: { tone: 'grey', damp: 0.7, flake: 0.4, seed: 5 }, color: 0x9c9a94 });
    mesh(new THREE.PlaneGeometry(50, 5.6), wallM, shed, 0, 2.8, -7.55, false);
    // tall windows in the landward wall: a soft blue-hour town beyond (shophouse roofs, warm windows, street lamps)
    const townTex = (() => {
      const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = util.rng(404);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16253f'); gr.addColorStop(0.55, '#2c4466'); gr.addColorStop(1, '#3b5274'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#0d131d';
      let x = 0; while (x < W) { const w = 40 + r() * 70, h = H * (0.32 + r() * 0.26); g.fillRect(x, H - h, w + 1, h); g.beginPath(); g.moveTo(x - 6, H - h); g.lineTo(x + w / 2, H - h - 14 - r() * 10); g.lineTo(x + w + 6, H - h); g.fill(); 
        for (let k = 0; k < 6; k++) if (r() < 0.38) { g.fillStyle = r() < 0.8 ? 'rgba(226,164,88,0.95)' : 'rgba(200,190,170,0.8)'; g.fillRect(x + 6 + r() * (w - 16), H - h + 14 + r() * (h - 40), 7, 9); } g.fillStyle = '#0d131d'; x += w; }
      for (let k = 0; k < 7; k++) { const lx = 60 + k * 140 + r() * 40, ly = H * 0.78 + r() * 20; const rg = g.createRadialGradient(lx, ly, 0, lx, ly, 26); rg.addColorStop(0, 'rgba(255,214,150,1)'); rg.addColorStop(0.25, 'rgba(240,170,90,0.5)'); rg.addColorStop(1, 'rgba(240,170,90,0)'); g.fillStyle = rg; g.fillRect(lx - 30, ly - 30, 60, 60); }
      return ctex(c);
    })();
    townM = new THREE.MeshBasicMaterial({ map: townTex, color: new THREE.Color(0.55, 0.55, 0.6) });
    const barM = std({ color: 0x1d1a17, roughness: 0.8 });
    const panes = [], bars = [];
    for (let k = 0; k < 10; k++) {
      const x = -22.5 + k * 5, pg = new THREE.PlaneGeometry(1.8, 2.7), uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (k * 0.1 + uv.getX(i) * 0.12) % 1);
      panes.push(pg.translate(x, 2.95, -7.53));
      bars.push(boxG(1.95, 0.1, 0.12).translate(x, 1.57, -7.5), boxG(1.95, 0.1, 0.12).translate(x, 4.33, -7.5));
      for (const dx of [-0.95, -0.32, 0.32, 0.95]) bars.push(boxG(0.05, 2.75, 0.06).translate(x + dx, 2.95, -7.5));
      for (const dy of [0.42, 1.32, 2.22]) bars.push(boxG(1.9, 0.04, 0.06).translate(x, 1.6 + dy, -7.5));
    }
    const wpane = mesh(mergeGeometries(panes), townM, shed, 0, 0, 0, false); wpane.renderOrder = 1;
    mesh(mergeGeometries(bars), barM, shed, 0, 0, 0, false);
    mesh(boxG(50, 1.1, 0.06), TX.mat('wood_beam', { repeat: [20, 1] }), shed, 0, 0.55, -7.5, false); // dado
    // town-end wall with a doorway glowing with street light
    const endW = mesh(new THREE.PlaneGeometry(15.2, 5.6), wallM, shed, -25.5, 2.8, 0, false); endW.rotation.y = Math.PI / 2;
    const door = mesh(new THREE.PlaneGeometry(2.4, 3.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.36, 0.18) }), shed, -25.45, 1.5, 1.8, false); door.rotation.y = Math.PI / 2;
    // roof: corrugated iron underside + trusses every 5 m
    const cm = corrugMap.clone(); cm.repeat.set(260, 1); cm.needsUpdate = true;
    const roof = mesh(new THREE.PlaneGeometry(52, 15.4), std({ color: 0x2b2e30, roughness: 0.55, metalness: 0.35, normalMap: cm }), shed, 0, 5.55, 0, false); roof.rotation.x = Math.PI / 2;
    const gz = [];
    gz.push(boxG(0.12, 0.2, 15.2).translate(0, 4.95, 0), boxG(0.1, 0.14, 15.2).translate(0, 5.45, 0));
    for (let k = -7; k <= 7; k++) { gz.push(boxG(0.07, 0.5, 0.07).translate(0, 5.2, k)); if (k < 7) { const dgl = boxG(0.05, 0.05, 1.12); dgl.rotateX(k % 2 ? 0.46 : -0.46); dgl.translate(0, 5.2, k + 0.5); gz.push(dgl); } }
    const ironM = std({ color: 0x272b2a, roughness: 0.5, metalness: 0.5 });
    instanced(mergeGeometries(gz), ironM, [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25].map((x) => M4(x, 0, 0)), shed, false);
    // cast-iron columns along the open seaward side, pilasters on the wall
    const colG = mergeGeometries([new THREE.CylinderGeometry(0.09, 0.11, 4.9, 14).translate(0, 2.45, 0), new THREE.CylinderGeometry(0.17, 0.2, 0.32, 14).translate(0, 0.16, 0), new THREE.CylinderGeometry(0.2, 0.1, 0.3, 14).translate(0, 4.9, 0), boxG(0.42, 0.08, 0.42).translate(0, 5.07, 0)]);
    const cols = [];
    for (let x = -25; x <= 25; x += 5) { cols.push(M4(x, 0, 7.45)); cols.push(M4(x, 0, -7.25)); }
    instanced(colG, ironM, cols, shed, false);
    mesh(boxG(52, 0.35, 0.25), ironM, shed, 0, 5.2, 7.45, false); // eave
    // end doors (+X): a big opening z −5.5…5.5, slid-open planked leaves, wall above
    const doorW = TX.mat('wood_beam', { repeat: [3, 2] });
    mesh(boxG(0.3, 0.9, 15.2), wallM, shed, 25.15, 5.1, 0, false);
    mesh(boxG(0.3, 4.65, 2.0), wallM, shed, 25.15, 2.32, -6.5, false);
    mesh(boxG(0.3, 4.65, 2.0), wallM, shed, 25.15, 2.32, 6.5, false);
    mesh(boxG(0.12, 4.5, 3.0), doorW, shed, 25.45, 2.25, -6.2, true);
    mesh(boxG(0.12, 4.5, 3.0), doorW, shed, 25.45, 2.25, 6.3, true);
    mesh(boxG(0.25, 0.25, 11.4), ironM, shed, 25.15, 4.62, 0, false); // lintel
  }

  // ---------------------------------------------------------------- lamps (enamel shades on cords) + glow + soft cones
  const lamps = [];
  {
    const shadeG = new THREE.LatheGeometry([[0.02, 0.0], [0.06, -0.02], [0.12, -0.07], [0.2, -0.15], [0.235, -0.2], [0.24, -0.215]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
    const shadeM = std({ color: 0xe9e5da, roughness: 0.35, side: THREE.DoubleSide, emissive: 0x4a3a28, emissiveIntensity: 0.0 });
    const shadeIn = std({ color: 0xffffff, roughness: 0.5, side: THREE.BackSide, emissive: BULB, emissiveIntensity: 0.55 });
    const cordG = new THREE.CylinderGeometry(0.006, 0.006, 1, 5).translate(0, 0.5, 0);
    const mats = LAMP_X.map((x) => M4(x, LAMP_Y + 0.1, LAMP_Z));
    instanced(shadeG, shadeM, mats, shed, false);
    instanced(shadeG, shadeIn, mats, shed, false);
    instanced(cordG, std({ color: 0x111111 }), LAMP_X.map((x) => M4s(x, LAMP_Y + 0.1, LAMP_Z, 0, 1, 5.0 - LAMP_Y - 0.1, 1)), shed, false);
    const bulbM = new THREE.MeshBasicMaterial({ color: BULB_C.clone().multiplyScalar(14), fog: false });
    instanced(new THREE.SphereGeometry(0.045, 12, 8), bulbM, LAMP_X.map((x) => M4(x, LAMP_Y, LAMP_Z)), shed, false);
    for (const x of LAMP_X) {
      const gl = FX.glow({ color: BULB, size: 0.9, intensity: 0.5, falloff: 3.0 }); gl.object3D.position.set(x, LAMP_Y - 0.02, LAMP_Z); shed.add(gl.object3D);
      const cone = FX.beamCone({ origin: [x, LAMP_Y - 0.05, LAMP_Z], dir: [0, -1, 0], angle: 0.72, length: 3.3, color: BULB, intensity: 0.05, noise: 0.5 }); shed.add(cone.object3D);
      // soft pool on the planks (stands in for the lamps that are not real lights in a given set-up)
      lamps.push({ x, glow: gl, cone });
    }
  }
  // a second row over the families' side (props + glow + floor pool only; not real lights)
  const LAMP2_X = [-22.5, -17.5, -12.5, -7.5, -2.5, 2.5], LAMP2_Z = -5.3;
  {
    const shadeG = new THREE.LatheGeometry([[0.02, 0.0], [0.06, -0.02], [0.12, -0.07], [0.2, -0.15], [0.235, -0.2], [0.24, -0.215]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
    const mats = LAMP2_X.map((x) => M4(x, LAMP_Y + 0.1, LAMP2_Z));
    instanced(shadeG, std({ color: 0xe9e5da, roughness: 0.35, side: THREE.DoubleSide }), mats, shed, false);
    instanced(new THREE.SphereGeometry(0.045, 10, 6), new THREE.MeshBasicMaterial({ color: BULB_C.clone().multiplyScalar(12), fog: false }), LAMP2_X.map((x) => M4(x, LAMP_Y, LAMP2_Z)), shed, false);
    for (const x of LAMP2_X) { const gl = FX.glow({ color: BULB, size: 0.8, intensity: 0.45, falloff: 3.0 }); gl.object3D.position.set(x, LAMP_Y - 0.02, LAMP2_Z); shed.add(gl.object3D); }
  }
  const poolTex = (() => { const S = 128, c = canvas(S, S), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); return ctex(c, false); })();
  const poolM = new THREE.MeshBasicMaterial({ map: poolTex, color: BULB_C.clone().multiplyScalar(0.11), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pools = instanced(new THREE.PlaneGeometry(5.2, 5.2).rotateX(-Math.PI / 2), poolM, [...LAMP_X.map((x) => M4(x, 0.004, LAMP_Z)), ...LAMP2_X.map((x) => M4(x, 0.004, LAMP2_Z, 0, 0.75))], shed, false);
  pools.receiveShadow = false; pools.renderOrder = 2;

  // ---------------------------------------------------------------- railing (families / travellers), cross railing + gate
  const railWood = TX.mat('wood_home', { repeat: [1, 6], tex: { seed: 4 }, color: 0x8a6a50, roughness: 1 });
  let gateL, gateR;
  {
    const postG = mergeGeometries([new THREE.CylinderGeometry(0.035, 0.04, 0.98, 8).translate(0, 0.49, 0), boxG(0.09, 0.08, 0.09).translate(0, 0.96, 0), boxG(0.1, 0.1, 0.1).translate(0, 0.05, 0)]);
    const posts = []; for (let x = -24; x <= GATE_X - 0.6; x += 1.25) posts.push(M4(x, 0, RAIL_Z));
    for (let z = 1.4; z <= 7.0; z += 1.1) posts.push(M4(GATE_X, 0, z));
    instanced(postG, railWood, posts, shed, true);
    const hr = mesh(boxG(GATE_X + 23.6, 0.06, 0.09), railWood, shed, (GATE_X - 24.4) / 2, 1.02, RAIL_Z, true);
    mesh(boxG(GATE_X + 23.6, 0.05, 0.04), railWood, shed, (GATE_X - 24.4) / 2, 0.52, RAIL_Z, true);
    mesh(boxG(0.09, 0.06, 5.7), railWood, shed, GATE_X, 1.02, 4.25, true);
    // gate leaves: hinged at z −0.75 and z 1.4, meeting at z 0.33; swing toward +X
    const leaf = (w) => { const gg = new THREE.Group(); mesh(boxG(0.05, 0.05, w), railWood, gg, 0, 0.98, -w / 2); mesh(boxG(0.05, 0.05, w), railWood, gg, 0, 0.3, -w / 2); for (let k = 0; k <= 4; k++) mesh(boxG(0.035, 0.7, 0.035), railWood, gg, 0, 0.64, -w * k / 4); return gg; };
    gateL = leaf(1.05); gateL.position.set(GATE_X, 0, -0.72); gateL.rotation.y = Math.PI; shed.add(gateL); // hinge at -0.72, leaf extends to +z
    gateR = leaf(1.05); gateR.position.set(GATE_X, 0, 1.4); shed.add(gateR);                             // hinge at 1.4, leaf extends to -z
  }
  // cross-railing filler where the booth stands (review: S036/S038 hide the booth so the gate, quay and steamer read behind her)
  const boothFill = new THREE.Group(); boothFill.visible = false; shed.add(boothFill);
  {
    const g = [];
    for (let z = -2.95; z <= -0.8; z += 0.72) g.push(new THREE.CylinderGeometry(0.035, 0.04, 0.98, 8).translate(GATE_X, 0.49, z), boxG(0.09, 0.08, 0.09).translate(GATE_X, 0.96, z));
    g.push(boxG(0.09, 0.06, 2.25).translate(GATE_X, 1.02, -1.88), boxG(0.04, 0.05, 2.25).translate(GATE_X, 0.52, -1.88));
    mesh(mergeGeometries(g), railWood, boothFill, 0, 0, 0, true);
  }
  // ---------------------------------------------------------------- stamp booth (high counter, brass rail, three glass partition windows)
  const booth = new THREE.Group(); booth.position.set(GATE_X, 0, BOOTH_Z); booth.rotation.y = -Math.PI / 2; shed.add(booth); // local +Z = passenger side (−X), local +X = world +Z
  let glassPane, permit, stampImp, stampTool, inkPad;
  {
    const counterM = TX.mat('wood_home', { repeat: [2, 1], tex: { seed: 9 }, color: 0x9a7456 });
    mesh(boxG(2.2, 1.06, 0.42), counterM, booth, 0, 0.53, 0.26);           // passenger-side counter front
    mesh(boxG(2.2, 0.05, 1.12), counterM, booth, 0, 1.085, -0.06);         // counter top through the slot
    mesh(boxG(2.2, 1.06, 0.5), counterM, booth, 0, 0.53, -0.45);           // clerk's desk
    const brass = TX.mat('brass', { tex: { tone: 'then', patina: 0.25, polish: 0.6 }, roughness: 1, metalness: 1, envMapIntensity: 1.6 });
    const br = mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.2, 10), brass, booth, 0, 1.0, 0.5); br.rotation.z = Math.PI / 2;
    for (const x of [-0.95, 0, 0.95]) mesh(boxG(0.03, 0.12, 0.03), brass, booth, x, 1.03, 0.5);
    // partition frame: mullions + header; glass at z = 0 (railing line), 6 cm slot at the counter
    const fr = TX.mat('wood_beam', { repeat: [1, 2] });
    for (const x of [-1.1, -0.37, 0.37, 1.1]) mesh(boxG(0.07, 0.95, 0.07), fr, booth, x, 1.6, 0);
    mesh(boxG(2.27, 0.1, 0.08), fr, booth, 0, 1.18, 0); mesh(boxG(2.27, 0.12, 0.09), fr, booth, 0, 2.1, 0);
    mesh(boxG(2.3, 0.6, 0.06), fr, booth, 0, 2.45, 0);
    mesh(boxG(2.3, 0.06, 1.0), fr, booth, 0, 2.75, -0.45);
    mesh(boxG(0.06, 1.7, 1.0), fr, booth, -1.12, 1.9, -0.45); mesh(boxG(0.06, 1.7, 1.0), fr, booth, 1.12, 1.9, -0.45);
    // (review) the partition glass barely read in S037: lib glass with a little haze, dust and finger smudges + env reflections
    // (perf: the lib glass cost ≈ 0.45 CPU-s full screen in S037; a plain pane with a slight warm-grey veil reads the same at
    // this scale together with the bulb reflection glow on it)
    const glassM = new THREE.MeshStandardMaterial({ color: 0xcfc8be, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.0, depthWrite: false, side: THREE.DoubleSide });
    glassPane = new THREE.Group(); booth.add(glassPane);
    for (const x of [-0.735, 0, 0.735]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.84), glassM); g.position.set(x, 1.65, 0); g.renderOrder = 30; glassPane.add(g); }
    // permit on the clerk's side of the glass, stamp impression decal, ink pad, stamp
    permit = mesh(new THREE.PlaneGeometry(0.24, 0.18), std({ map: permitMap, roughness: 0.85 }), booth, 0.02, 1.112, -0.2, false); permit.rotation.x = -Math.PI / 2; permit.rotation.z = 0.04;
    stampImp = mesh(new THREE.PlaneGeometry(0.044, 0.044), new THREE.MeshStandardMaterial({ map: stampMap, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), booth, 0.083, 1.1125, -0.15, false); stampImp.rotation.x = -Math.PI / 2; stampImp.rotation.z = 0.18;
    inkPad = new THREE.Group(); inkPad.position.set(0.3, 1.11, -0.33); booth.add(inkPad);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 24), std({ color: 0x3a3a3c, roughness: 0.35, metalness: 0.7 }), inkPad, 0, 0.009, 0);
    mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.004, 24), std({ color: 0x3c3150, roughness: 0.9 }), inkPad, 0, 0.019, 0);
    // the clerk's enamel desk lamp (practical; review: gives S034 its soft bulb bokeh behind the hands, and is the bulb the
    // S037 glass reflects) — glow + emissive only, no extra real light
    {
      const dl = new THREE.Group(); dl.position.set(0.78, 1.06, -0.56); booth.add(dl);
      const dark = std({ color: 0x1f2a24, roughness: 0.45, metalness: 0.4 });
      mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 20), dark, dl, 0, 0.01, 0, false);
      const stem = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.34, 8), dark, dl, 0, 0.18, 0, false);
      const sh = mesh(new THREE.LatheGeometry([[0.012, 0], [0.03, -0.012], [0.07, -0.05], [0.085, -0.075]].map(([r, y]) => new THREE.Vector2(r, y)), 20), std({ color: 0x2f4a3c, roughness: 0.4, side: THREE.DoubleSide, emissive: 0x3a2a18, emissiveIntensity: 0.3 }), dl, 0.02, 0.37, 0.05, false);
      sh.rotation.x = 0.35;
      const bulb = mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshBasicMaterial({ color: BULB_C.clone().multiplyScalar(10) }), dl, 0.02, 0.33, 0.065, false);
      const g = FX.glow({ color: BULB, size: 0.45, intensity: 0.55, falloff: 2.6 }); g.object3D.position.set(0.02, 0.32, 0.07); dl.add(g.object3D);
    }
    stampTool = new THREE.Group(); booth.add(stampTool);
    mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 24), brass, stampTool, 0, 0.006, 0);
    mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.05, 16), std({ color: 0x4E2E22, roughness: 0.45 }), stampTool, 0, 0.037, 0);
    mesh(new THREE.SphereGeometry(0.019, 16, 10), std({ color: 0x4E2E22, roughness: 0.45 }), stampTool, 0, 0.07, 0);
  }

  // ---------------------------------------------------------------- hurricane lanterns (review): the families' lamps hung on
  // the railing posts / set on a trunk — placed per shot (only where they give the warm bokeh the keyframes ask for: S032, S034)
  const lanterns = [];
  {
    const iron = std({ color: 0x1b1d1e, roughness: 0.5, metalness: 0.6 });
    const glassL = new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffb36c, emissiveIntensity: 1.6, roughness: 0.15, transparent: true, opacity: 0.85 });
    const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.28).multiplyScalar(9) });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); g.visible = false; shed.add(g);
      const body = new THREE.Group(); g.add(body);
      mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 16), std({ color: 0x6E5536, roughness: 0.4, metalness: 0.8 }), body, 0, 0.018, 0, false); // brass fount
      mesh(new THREE.SphereGeometry(0.05, 16, 10).scale(1, 1.3, 1), glassL, body, 0, 0.115, 0, false);     // globe
      mesh(new THREE.SphereGeometry(0.008, 8, 6), flameM, body, 0, 0.105, 0, false);
      mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.03, 14), iron, body, 0, 0.19, 0, false);            // cap
      const bail = mesh(new THREE.TorusGeometry(0.05, 0.003, 4, 16, Math.PI), iron, body, 0, 0.2, 0, false);
      for (const x of [-0.05, 0.05]) mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.17, 4), iron, body, x, 0.11, 0, false);
      const gl = FX.glow({ color: 0xffb46a, size: 0.62, intensity: 0.8, falloff: 2.2 }); gl.object3D.position.set(0, 0.11, 0); body.add(gl.object3D);
      const pole = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6).translate(0, 0.5, 0), iron, g, 0, 0, 0, false); // hook rod (scaled per shot)
      const arm = mesh(new THREE.BoxGeometry(0.12, 0.008, 0.008), iron, g, 0.06, 0, 0, false);
      const trunk = mesh(new THREE.BoxGeometry(0.62, 0.42, 0.4).translate(0, 0.21, 0), std({ color: 0x3e3026, roughness: 0.6 }), g, 0, 0, 0, false);
      lanterns.push({ g, body, pole, arm, trunk });
    }
  }
  // put lantern i with its body base at world p; rod from the railing top (y0) up to the hook, or none (standing on luggage)
  function lanternAt(i, p, { rod = true, y0 = 1.05, rotY = 0 } = {}) {
    const L = lanterns[i]; L.g.visible = true; L.g.position.set(p.x, 0, p.z); L.g.rotation.y = rotY;
    L.body.position.set(rod ? 0.12 : 0, p.y, 0);
    L.pole.visible = L.arm.visible = rod && p.y + 0.24 > y0; L.trunk.visible = !rod; if (!rod) L.trunk.position.y = p.y - 0.42;
    if (L.pole.visible) { L.pole.position.y = y0; L.pole.scale.y = p.y + 0.26 - y0; L.arm.position.y = p.y + 0.26; }
  }

  // ---------------------------------------------------------------- benches, luggage dressing
  const caseM = TX.mat('rattan', { repeat: [2.4, 1.6], tex: { seed: 13, age: 0.4 } });
  const bundleM = TX.mat('cotton', { repeat: [1, 1], tex: { tone: [150, 132, 104], seed: 3 } });
  const trunkM = std({ color: 0x3e3026, roughness: 0.6 });
  {
    const benchG = mergeGeometries([boxG(2.4, 0.05, 0.42).translate(0, 0.44, 0), boxG(0.06, 0.44, 0.36).translate(-1.05, 0.22, 0), boxG(0.06, 0.44, 0.36).translate(1.05, 0.22, 0), boxG(2.4, 0.3, 0.04).translate(0, 0.72, -0.2)]);
    const bm = [];
    for (const x of [-21, -16, -6.5, -1.5]) bm.push(M4(x, 0, -6.9));
    for (const x of [-18, -12, 2, 13]) bm.push(M4(x, 0, 6.6, Math.PI));
    instanced(benchG, railWood, bm, shed, false);
    const r = util.rng(91), cases = [], bundles = [], trunks = [];
    for (let i = 0; i < 26; i++) {
      const x = -23 + r() * 30, z = -2.2 + r() * 8.5;
      if (x > SEAT.x - 4.6 && x < SEAT.x + 2.4 && z > -2.9 && z < 1.6) continue;
      if (x > -3.2 && x < 2.4 && z > -2.0 && z < 1.8) continue;          // S068 bench
      if (z < -1.6 && x > -4 && x < 8.5) continue;                         // the walk along the railing (S036–S039)
      const k = r(); (k < 0.45 ? cases : k < 0.75 ? bundles : trunks).push(M4(x, 0, z, r() * 3));
    }
    instanced(boxG(0.56, 0.2, 0.36).translate(0, 0.1, 0), caseM, cases, shed, false);
    instanced(new THREE.SphereGeometry(0.22, 12, 8).scale(1.2, 0.7, 1).translate(0, 0.14, 0), bundleM, bundles, shed, false);
    instanced(boxG(0.8, 0.45, 0.48).translate(0, 0.225, 0), trunkM, trunks, shed, false);
  }

  // the S068 bench (along Z, they sit facing home −X, she at screen-left, the boy at screen-right)
  const bench68 = new THREE.Group(); bench68.position.set(0.66, 0, -0.1); shed.add(bench68);
  mesh(boxG(0.4, 0.05, 2.6), railWood, bench68, 0, 0.45, 0); mesh(boxG(0.36, 0.45, 0.06), railWood, bench68, 0, 0.225, -1.15); mesh(boxG(0.36, 0.45, 0.06), railWood, bench68, 0, 0.225, 1.15);
  mesh(boxG(0.04, 0.32, 2.6), railWood, bench68, 0.19, 0.74, 0); mesh(boxG(0.36, 0.04, 2.5), railWood, bench68, 0.0, 0.2, 0);

  // ================================================================ THE STEAMER (screen-right lock), moored along the seaward quay
  const steamer = new THREE.Group(); steamer.name = 'steamer'; steamer.position.x = 58; shed.add(steamer); // berth beyond the end doors (x 22…114)
  {
    // (integration) at dusk the steamer must read as a SHIP: a dark hull silhouette with one row of warm 2000 K portholes (the
    // brightest, warmest points of S036/S038), a sparse lit row on a superstructure in dusk shadow, the funnel and masts against
    // the sky (it read as a white office block with three rows of white windows)
    const hullM = std({ color: 0x141416, roughness: 0.55, metalness: 0.2 });
    const whiteM = std({ color: 0x6f7279, roughness: 0.6 });
    const sh = new THREE.Shape();
    const L0 = -36, L1 = 56, B = 6.2;
    sh.moveTo(L0 + 4, -B); sh.lineTo(L1 - 18, -B); sh.quadraticCurveTo(L1 - 4, -B * 0.8, L1, 0); sh.quadraticCurveTo(L1 - 4, B * 0.8, L1 - 18, B); sh.lineTo(L0 + 4, B); sh.quadraticCurveTo(L0, B * 0.7, L0, 0); sh.quadraticCurveTo(L0, -B * 0.7, L0 + 4, -B);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: 8.6, bevelEnabled: false, curveSegments: 10 }); hg.rotateX(-Math.PI / 2); // shape y -> -z
    const HZ = 22.6;
    const hull = mesh(hg, hullM, steamer, 0, SEA_Y - 3.6, HZ, false);
    const sheer = mesh(boxG(L1 - L0 - 22, 0.16, 0.05), whiteM, steamer, (L0 + L1) / 2 - 6, SEA_Y + 4.85, HZ - B - 0.02, false);
    const portM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.52, 0.2).multiplyScalar(6.0) });
    const darkPort = new THREE.MeshBasicMaterial({ color: 0x0a0b0d });
    const ports = [], dports = [], r = util.rng(5);
    for (let x = L0 + 8; x < L1 - 14; x += 1.9) { (r() < 0.82 ? ports : dports).push(M4(x, SEA_Y + 3.7, HZ - B - 0.03, Math.PI)); dports.push(M4(x + 0.95, SEA_Y + 2.1, HZ - B - 0.03, Math.PI)); }
    instanced(new THREE.CircleGeometry(0.21, 12), portM, ports, steamer, false);
    instanced(new THREE.CircleGeometry(0.17, 12), darkPort, dports, steamer, false);
    const deckY = SEA_Y + 5.0;
    mesh(boxG(36, 2.6, 9.6), whiteM, steamer, 12, deckY + 1.3, HZ, false);
    mesh(boxG(24, 2.4, 8.0), whiteM, steamer, 13, deckY + 3.9, HZ, false);
    mesh(boxG(7, 2.0, 7.0), whiteM, steamer, 22, deckY + 6.1, HZ, false);
    const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.3).multiplyScalar(1.5) });
    const wins = []; for (let x = -5; x < 30; x += 1.6) if (r() < 0.32) wins.push(M4(x, deckY + 1.5, HZ - 4.82, Math.PI));
    for (let x = 2; x < 25; x += 1.8) if (r() < 0.2) wins.push(M4(x, deckY + 4.0, HZ - 4.02, Math.PI));
    for (let x = 19; x < 25.5; x += 1.1) if (r() < 0.5) wins.push(M4(x, deckY + 6.3, HZ - 3.52, Math.PI));
    instanced(new THREE.PlaneGeometry(0.45, 0.4), winM, wins, steamer, false);
    // funnel: invented colours (ochre, slate band, black top), slight rake
    const fun = new THREE.Group(); fun.position.set(10, deckY + 5.1, HZ); fun.rotation.z = 0.07; steamer.add(fun);
    mesh(new THREE.CylinderGeometry(1.5, 1.6, 7.6, 24), std({ color: 0x8a6a3a, roughness: 0.6 }), fun, 0, 3.8, 0, false);
    mesh(new THREE.CylinderGeometry(1.52, 1.52, 1.1, 24), std({ color: 0x4E6273, roughness: 0.6 }), fun, 0, 5.4, 0, false);
    mesh(new THREE.CylinderGeometry(1.5, 1.51, 1.2, 24), std({ color: 0x111111, roughness: 0.7 }), fun, 0, 8.1, 0, false);
    for (const x of [-20, 44]) mesh(new THREE.CylinderGeometry(0.16, 0.22, 20, 8), std({ color: 0x2a2622 }), steamer, x, deckY + 10, HZ, false);
    const lineM = new THREE.LineBasicMaterial({ color: 0x15171a });
    const rig = [[-20, deckY + 20, HZ, -34, deckY + 1, HZ], [-20, deckY + 20, HZ, 10, deckY + 12, HZ], [44, deckY + 20, HZ, 10, deckY + 12, HZ], [44, deckY + 20, HZ, 56, deckY + 1, HZ], [-20, deckY + 20, HZ, -20, deckY, HZ - B + 0.2], [44, deckY + 20, HZ, 44, deckY, HZ - B + 0.2]];
    for (const p of rig) { const gg = new THREE.BufferGeometry().setFromPoints([V3(p[0], p[1], p[2]), V3(p[3], p[4], p[5])]); steamer.add(new THREE.Line(gg, lineM)); }
    // deck rail (white) along the near side, lifeboats
    mesh(boxG(L1 - L0 - 20, 0.05, 0.05), whiteM, steamer, (L0 + L1) / 2 - 6, deckY + 1.0, HZ - B + 0.15, false);
    for (const x of [0, 7, 18, 25]) mesh(new THREE.CapsuleGeometry(0.8, 4.4, 4, 10).rotateZ(Math.PI / 2).scale(1, 0.6, 1), whiteM, steamer, x, deckY + 5.6, 17.6, false);
    // gangway from the quay to the deck, beyond the gate
    const gw = mesh(boxG(1.1, 0.12, 6.2), std({ color: 0x5a4636, roughness: 0.8 }), steamer, -28, 1.35, 13.6, false); gw.rotation.x = -0.45;
    // deck lights
    for (const x of [-10, 4, 16, 30]) { const gl = FX.glow({ color: 0xffb060, size: 1.1, intensity: 0.4 }); gl.object3D.position.set(x, deckY + 3, 16.0); steamer.add(gl.object3D); }
  }

  // linear-time vertex-clustering decimation (far crowd LOD: ~17k → a few k triangles; position + normal only)
  function clusterDecimate(geo, cell) {
    const pos = geo.attributes.position, nrm = geo.attributes.normal, n = pos.count;
    const map = new Map(), P = [], Nn = [], C = [], remap = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = (Math.floor(x / cell) + 512) * 1048576 + (Math.floor(y / cell) + 512) * 1024 + (Math.floor(z / cell) + 512);
      let j = map.get(k);
      if (j === undefined) { j = C.length; map.set(k, j); P.push(0, 0, 0); Nn.push(0, 0, 0); C.push(0); }
      P[j * 3] += x; P[j * 3 + 1] += y; P[j * 3 + 2] += z;
      if (nrm) { Nn[j * 3] += nrm.getX(i); Nn[j * 3 + 1] += nrm.getY(i); Nn[j * 3 + 2] += nrm.getZ(i); }
      C[j]++; remap[i] = j;
    }
    for (let j = 0; j < C.length; j++) { // (review fix) clusters whose normals cancel (thin fingers, both cloth sides) got a zero normal → NaN shading → NaN pixels that the bloom smeared into black frames; fall back to +Y
      for (let a = 0; a < 3; a++) P[j * 3 + a] /= C[j];
      const l = Math.hypot(Nn[j * 3], Nn[j * 3 + 1], Nn[j * 3 + 2]);
      if (!(l > 1e-4)) { Nn[j * 3] = 0; Nn[j * 3 + 1] = 1; Nn[j * 3 + 2] = 0; } else for (let a = 0; a < 3; a++) Nn[j * 3 + a] /= l;
    }
    const src = geo.index ? geo.index.array : null, m = src ? src.length : n, out = [];
    for (let t = 0; t < m; t += 3) { const a = remap[src ? src[t] : t], b = remap[src ? src[t + 1] : t + 1], c = remap[src ? src[t + 2] : t + 2]; if (a !== b && b !== c && a !== c) out.push(a, b, c); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setIndex(out);
    return g;
  }
  // ================================================================ CROWD (instanced baked extras; walk-phase buckets)
  const crowd = new THREE.Group(); crowd.name = 'crowd'; shed.add(crowd);
  const CROWD_POSES = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'stand', 'standB', 'sit'];
  // (integration) a mixed 1920s–30s civilian crowd instead of six capped men in look-alike jackets (it read as police /
  // conscripts): women in 大襟 jackets, headscarves and print blouses, a student in a long gown, a porter with a shoulder pole,
  // an old man, children, a few men in flat caps; uniforms ONLY on the officials at the gate (khaki, invented, no insignia).
  // Four variants come from the baked cache (extras 101/103/104/105); the others are sculpted live at 'lo' (≈2 s each).
  const CROWD_SPECS = [
    { seed: 101 },                                                                                   // 0 young man, brown jacket, bare head
    { seed: 104 },                                                                                   // 1 woman 35, blue-grey blouse, low bun
    { seed: 105 },                                                                                   // 2 woman 22, dark blouse, low bun
    { seed: 103, recolor: { jacket: 0x55606e } },                                                    // 3 youth 18, lapel jacket, bare head
    { spec: { sex: 'f', height: 1.53, build: 0.45, age: 46, skin: 0xC99A78, hair: { style: 'headscarf', color: 0x3c4a63 },
      costume: [{ type: 'trousers', color: 0x2a2826, wide: 0.03 }, { type: 'side_jacket', color: 0x334766, length: 'hip' }, { type: 'shoes', shoe: 'cloth', color: 0x1f1e1f }] } }, // 4 woman, headscarf, indigo 大襟
    { spec: { sex: 'f', height: 1.58, build: 0.35, age: 26, skin: 0xDDB392, hair: { style: 'low_bun', color: 0x1a1512 },
      costume: [{ type: 'skirt', color: 0x2c2f3a, length: 'ankle' }, { type: 'blouse', color: 0xa98f7c, sleeve: 'long' }, { type: 'shoes', shoe: 'cloth', color: 0x1f1e1f }] }, print: true }, // 5 woman, faded print blouse, long skirt
    { spec: { sex: 'm', height: 1.74, build: 0.3, age: 20, skin: 0xD2A47F, hair: { style: 'short', color: 0x15110f },
      costume: [{ type: 'trousers', color: 0x24262c }, { type: 'robe', color: 0x56657a, collar: 'mandarin' }, { type: 'shoes', shoe: 'cloth', color: 0x1c1b1c }] } }, // 6 student, long gown 长衫
    { spec: { sex: 'm', height: 1.64, build: 0.62, age: 34, skin: 0xB88A66, hair: { style: 'headcloth', color: 0x6b5d4a },
      costume: [{ type: 'trousers', color: 0x3a3631, length: 'calf', rolled: true }, { type: 'side_jacket', color: 0x6a5641, length: 'hip' }, { type: 'shoes', shoe: 'sandal', color: 0x3a2e24 }] } }, // 7 porter (shoulder pole)
    { spec: { sex: 'm', height: 1.63, build: 0.35, age: 64, skin: 0xC99A78, hair: { style: 'short', color: 0x77736c },
      costume: [{ type: 'trousers', color: 0x2a2826 }, { type: 'robe', color: 0x5b4c3d, collar: 'mandarin' }, { type: 'shoes', shoe: 'cloth', color: 0x1c1b1c }] } }, // 8 old man, brown gown
    { spec: { sex: 'f', age: 8, build: 0.45, skin: 0xD2A47F, hair: { style: 'braid', color: 0x1a1512 },
      costume: [{ type: 'trousers', color: 0x2e3140 }, { type: 'blouse', color: 0xb7a48c, sleeve: 'long' }, { type: 'shoes', shoe: 'cloth', color: 0x1f1e1f }] }, print: true }, // 9 child
    { spec: { sex: 'm', height: 1.69, build: 0.5, age: 41, skin: 0xC99A78, hair: { style: 'cap', color: 0x4a4038 },
      costume: [{ type: 'trousers', color: 0x2f2b28 }, { type: 'jacket', color: 0x6a5a48, collar: 'mandarin', buttons: 0, length: 'hip' }, { type: 'shoes', shoe: 'cloth', color: 0x201d1b }] } }, // 10 man, flat cap, brown jacket
    { spec: { sex: 'm', height: 1.72, build: 0.55, age: 38, skin: 0xC99A78, hair: { style: 'cap', color: 0x6f6b56 },
      costume: [{ type: 'trousers', color: 0x5e5b4b }, { type: 'jacket', color: 0x8A8670, collar: 'lapel', buttons: 0, length: 'hip' }, { type: 'shoes', shoe: 'leather', color: 0x1c1a18 }] } }, // 11 OFFICIAL (gate only)
  ];
  const NVAR = CROWD_SPECS.length, CAP = 24, V_CHILD = 9, V_OFFICIAL = 11, V_PORTER = 7;
  const CIVILIANS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 1, 4, 5, 2];  // walker mix (women weighted up); child + officials placed separately
  const FEMALE = new Set([1, 2, 4, 5, 9]);
  const buckets = new Map();
  const crowdMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  await preloadCrowd('migrant', {});
  {
    const hsh = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
    for (let v = 0; v < NVAR; v++) {
      const S = CROWD_SPECS[v];
      const f = S.seed ? makeExtra('migrant', S.seed, { lod: 'lo' }) : makeFigure({ ...S.spec, lod: 'lo', name: 'pier_extra_' + v });
      const matName = new Map(); for (const [k, L] of Object.entries(f.layers)) if (L && L.material) matName.set(L.material, k);
      for (const p of CROWD_POSES) {
        if (p[0] === 'w') f.pose('walk', { phase: +p[1] / 6, stride: v === V_CHILD ? 0.75 : 0.9 });
        else if (p === 'sit') f.pose('sit_bench', { seat: v === V_CHILD ? 0.36 : 0.44, hands: 'lap' });
        else f.pose('stand', { weight: p === 'standB' ? 0.7 : -0.4 });
        const baked = f.bake();
        // one vertex-coloured geometry per baked pose (plain colours: the crowd is always soft, small or fogged) → 1 draw call per bucket;
        // cloth gets a little per-vertex mottling (and the print blouses a faded dot print) so it reads as cloth, not plastic
        const merged = (far) => mergeGeometries(baked.children.map((part) => {
          const g0 = far ? clusterDecimate(part.geometry, 0.028) : part.geometry, g = new THREE.BufferGeometry();
          g.setAttribute('position', g0.attributes.position); g.setAttribute('normal', g0.attributes.normal); g.setIndex(g0.index);
          const nm = matName.get(part.material) || '', rc = S.recolor && Object.entries(S.recolor).find(([k]) => nm.includes(k));
          const c = (rc ? new THREE.Color(rc[1]) : (part.material.color || new THREE.Color(0x777777)).clone()).multiplyScalar(0.92);
          const cloth = !/body|head|hair|skin|hand/.test(nm), pr = S.print && /blouse/.test(nm), pos = g0.attributes.position, n = pos.count, col = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            let k = 1;
            if (cloth) { const h = hsh(pos.getX(i) * 9, pos.getY(i) * 9, pos.getZ(i) * 9); k = 0.94 + 0.12 * h; if (pr && h > 0.8) k = 1.35; }
            col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * (pr && k > 1.2 ? 0.95 * k : k);
          }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
        }));
        const mk = (geo) => { const im = new THREE.InstancedMesh(geo, crowdMat, CAP); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.count = 0; im.visible = false; crowd.add(im); return im; };
        const gN = merged(false), gF = merged(true);
        for (const [nm, gg] of [['near', gN], ['far', gF]]) for (const an of ['position', 'normal', 'color']) { const arr = gg.attributes[an].array; for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) { console.warn('PWDBG NaN', v, p, nm, an, i); break; } }
        buckets.set(v + '|' + p, { ims: [mk(gN)], n: 0 });
        buckets.set(v + '|' + p + '|far', { ims: [mk(gF)], n: 0 });
      }
    }
  }
  // carried things: rattan cases, cloth bundles (held), sacks on the shoulder, porters' bamboo poles with two baskets,
  // women's arm baskets
  const basketM = TX.mat('rattan', { repeat: [1.5, 0.6], tex: { seed: 27, age: 0.6 }, color: 0xb9a27f });
  const poleM = std({ color: 0x9a8152, roughness: 0.6 });
  const sackM = TX.mat('cotton', { repeat: [1, 1], tex: { tone: [118, 106, 88], seed: 5 } });
  const luggage = {
    case: new THREE.InstancedMesh(boxG(0.5, 0.33, 0.17).translate(0, 0.0, 0), caseM, 64),
    bundle: new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8).scale(1.1, 0.8, 0.9), bundleM, 64),
    sack: new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8).scale(0.8, 1.25, 0.75), sackM, 32),
    pole: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 1.75, 6).rotateZ(Math.PI / 2), poleM, 16),
    basket: new THREE.InstancedMesh(mergeGeometries([new THREE.CylinderGeometry(0.21, 0.17, 0.3, 14, 1, true), new THREE.CircleGeometry(0.17, 14).rotateX(Math.PI / 2).translate(0, -0.15, 0), new THREE.CylinderGeometry(0.004, 0.004, 0.62, 3).translate(0, 0.46, 0)]), basketM, 40),
  };
  for (const im of Object.values(luggage)) { im.frustumCulled = false; im.count = 0; im.castShadow = false; crowd.add(im); }
  basketM.side = THREE.DoubleSide;
  // population (fixed; per shot filtered and timed)
  const POP = [];
  {
    const r = util.rng(2024);
    const lanes = [-2.42, -1.75, 0.35, 1.25, 2.3, 3.3, 4.3, 5.4];
    const lugFor = (v) => v === V_PORTER ? 'pole' : FEMALE.has(v) ? (r() < 0.45 ? 'bundle' : r() < 0.6 ? 'basketArm' : 'case') : (r() < 0.55 ? 'case' : r() < 0.6 ? 'sack' : 'bundle');
    for (let i = 0; i < 44; i++) {
      const v = CIVILIANS[i % CIVILIANS.length], z = lanes[i % lanes.length] + (r() - 0.5) * 0.4, f = r(), sp = 0.8 + r() * 0.5, ph = r();
      POP.push({ kind: 'walk', v, z, f, sp, ph, dx: 0, lug: r() < 0.82 ? lugFor(v) : null, s: 0.96 + r() * 0.08 });
      if (FEMALE.has(v) && v !== V_CHILD && r() < 0.4) POP.push({ kind: 'walk', v: V_CHILD, z: z - 0.42, f, sp, ph: ph + 0.3, dx: -0.22, lug: null, s: 0.9 + r() * 0.15 }); // a mother and her child
    }
    const FAM = [1, 4, 8, 2, 9, 5, 0, 4, 10, 1, 9, 8, 6, 2, 4];
    for (let i = 0; i < 30; i++) POP.push({ kind: 'family', v: FAM[i % FAM.length], x: -23 + r() * 30, z: -3.45 - r() * 3.6, rot: 0.2 + (r() - 0.5) * 1.6, pose: r() < 0.5 ? 'stand' : 'standB', s: 0.95 + r() * 0.1 });
    for (let i = 0; i < 26; i++) { const v = CIVILIANS[(i * 5 + 3) % CIVILIANS.length]; POP.push({ kind: 'wait', v, x: -23 + r() * 30.5, z: -1.8 + r() * 8.2, rot: r() * 6.28, pose: r() < 0.25 ? 'sit' : r() < 0.5 ? 'stand' : 'standB', lug: r() < 0.6 ? (v === V_PORTER ? 'pole' : 'case') : null, s: 0.95 + r() * 0.1 }); }
    const Q = [4, 0, 5, 6, 1, 7, 2, 10, 9, 8];
    for (let i = 0; i < 10; i++) POP.push({ kind: 'queue', v: Q[i], x: GATE_X - 0.6 - (i % 5) * 0.75 - r() * 0.2, z: -2.2 + Math.floor(i / 5) * 0.7 + 1.0 + r() * 0.3, rot: Math.PI / 2 + (r() - 0.5) * 0.4, pose: r() < 0.5 ? 'stand' : 'standB', lug: Q[i] === V_CHILD ? null : Q[i] === V_PORTER ? 'pole' : FEMALE.has(Q[i]) ? 'bundle' : 'case', s: 0.96 + r() * 0.08 });
    // the only uniforms: two officials at the gate posts (+ one beyond it on the quay)
    POP.push({ kind: 'official', v: V_OFFICIAL, x: GATE_X + 0.55, z: -0.95, rot: -Math.PI / 2 + 0.5, pose: 'stand', s: 1 });
    POP.push({ kind: 'official', v: V_OFFICIAL, x: GATE_X + 0.6, z: 1.75, rot: -Math.PI / 2 - 0.4, pose: 'standB', s: 1.02 });
    POP.push({ kind: 'official', v: V_OFFICIAL, x: GATE_X + 4.5, z: 2.9, rot: -Math.PI / 2 - 1.2, pose: 'stand', s: 0.98 });
  }
  const _d = new THREE.Object3D();
  // cfg: { t (s since shot start), speed, D (shot duration), keep(x,z)->bool, families, waits, queue, walkers, gateOpen 0..1 }
  let crowdCfg = null;
  const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
  function setCrowd(cfg) { crowdCfg = cfg; }
  function applyCrowd(cfg, cameraObj) {
    if (cameraObj) { cameraObj.updateMatrixWorld(true); cameraObj.updateProjectionMatrix(); _pm.multiplyMatrices(cameraObj.projectionMatrix, cameraObj.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm); }
    const inView = (x, z) => !cameraObj || _fr.intersectsSphere(_sph.set(_d.position.set(x, 0.85, z), 1.05));
    for (const b of buckets.values()) b.n = 0;
    const lug = Object.fromEntries(Object.keys(luggage).map((k) => [k, 0]));
    const farD2 = (cfg.farD ?? 9) ** 2, cp = cameraObj ? cameraObj.position : null;
    const put = (v, pose, x, z, rot, s) => {
      if (!inView(x, z)) return;
      if (cfg._log && cp && (x - cp.x) ** 2 + (z - cp.z) ** 2 < 64) console.log('PWDBG near cam', pose, v, x.toFixed(2), z.toFixed(2), 'cam', cp.x.toFixed(2), cp.z.toFixed(2), cfg._who);
      const far = cp && ((x - cp.x) ** 2 + (z - cp.z) ** 2) > farD2;
      const b = buckets.get(v + '|' + pose + (far ? '|far' : '')); if (!b || b.n >= CAP) return;
      _d.position.set(x, 0, z); _d.rotation.set(0, rot, 0); _d.scale.setScalar(s); _d.updateMatrix();
      for (const im of b.ims) im.setMatrixAt(b.n, _d.matrix); b.n++;
    };
    const putLug = (kind, x, y, z, rot) => { const im = luggage[kind]; if (!im || lug[kind] >= im.instanceMatrix.count || !inView(x, z)) return; _d.position.set(x, y, z); _d.rotation.set(0, rot, 0); _d.scale.setScalar(1); _d.updateMatrix(); im.setMatrixAt(lug[kind]++, _d.matrix); };
    // what a walker carries (walking +X: its right side is world −Z… +0.27 in z is the right hand side as before)
    const carry = (kind, x, z, s, sway) => {
      if (!kind) return;
      if (kind === 'case') putLug('case', x + 0.02, 0.42 * s, z + 0.27, Math.PI / 2);
      else if (kind === 'bundle') putLug('bundle', x + 0.02, 0.5 * s, z + 0.27, Math.PI / 2);
      else if (kind === 'basketArm') putLug('basket', x + 0.08, 0.86 * s - 0.46, z - 0.25, 0);
      else if (kind === 'sack') putLug('sack', x - 0.06, 1.42 * s, z + 0.13, Math.PI / 2);
      else if (kind === 'pole') { const y = 1.43 * s + 0.015 * sway; putLug('pole', x, y, z + 0.17, 0); putLug('basket', x + 0.78, y - 0.95, z + 0.17, 0); putLug('basket', x - 0.78, y - 0.95, z + 0.17, 0); }
    };
    const keep = cfg.keep || (() => true);
    const t = cfg.t || 0, D = cfg.D || 4, sp = cfg.speed ?? 1;
    for (const p of POP) {
      if (cfg._log) cfg._who = p.kind + ':' + POP.indexOf(p);
      if (p.kind === 'walk') {
        if (cfg.walkers === false) continue;
        const v = p.sp * sp, xa = -24, xb = (cfg.gateOpen ? 20 : GATE_X - 1.2) - v * D;
        const x = xa + p.f * (xb - xa) + v * t + (p.dx || 0);
        // (review) with the gate open the flow funnels through it (it used to pass straight through the cross railing)
        const fz = cfg.funnel ? lerp(p.z, clamp(p.z, -0.45, 1.15), smoothstep(GATE_X - 6, GATE_X - 0.5, x) * (1 - smoothstep(GATE_X + 1, GATE_X + 7, x))) : p.z;
        const head = cfg.funnel ? Math.PI / 2 - Math.atan2(fz - p.z, 6) * (x < GATE_X ? 1 : -1) * 0.6 : Math.PI / 2;
        if (!keep(x, fz)) continue;
        const stride = 1.1 * p.s, ph = (((p.ph + x / stride) % 1) + 1) % 1;
        put(p.v, 'w' + (Math.floor(ph * 6) % 6), x, fz, head, p.s);
        carry(p.lug, x, fz, p.s, Math.sin(ph * Math.PI * 4));
      } else {
        if (p.kind === 'family' && cfg.families === false) continue;
        if (p.kind === 'wait' && cfg.waits === false) continue;
        if (p.kind === 'queue' && cfg.queue === false) continue;
        if (p.kind === 'official' && cfg.officials === false) continue;
        let x = p.x, z = p.z;
        if (p.kind === 'queue' && cfg.gateOpen) x += cfg.gateOpen * 3.5;
        if (!keep(x, z)) continue;
        put(p.v, p.pose, x, z, p.rot, p.s);
        if (p.lug === 'pole') { putLug('basket', x + Math.cos(p.rot) * 0.4, 0.15, z - Math.sin(p.rot) * 0.4, 0); putLug('basket', x - Math.cos(p.rot) * 0.4, 0.15, z + Math.sin(p.rot) * 0.4, 0); }
        else if (p.lug) putLug(p.lug, x + Math.cos(p.rot) * 0.32, p.lug === 'case' ? 0.17 : 0.14, z - Math.sin(p.rot) * 0.32, p.rot + 0.3);
      }
    }
    for (const w of cfg.extra || []) { // shot-specific walkers (crossing the frame during the shot)
      const x = w.x0 + w.v * t, stride = 1.1, ph = (((w.ph || 0) + x / stride) % 1 + 1) % 1;
      put(w.vi ?? 0, 'w' + (Math.floor(ph * 6) % 6), x, w.z, w.rot ?? Math.PI / 2, w.s || 1);
      carry(w.lug, x, w.z, w.s || 1, Math.sin(ph * Math.PI * 4));
    }
    for (const b of buckets.values()) for (const im of b.ims) { im.count = b.n; im.visible = b.n > 0; im.instanceMatrix.needsUpdate = true; }
    for (const [k, im] of Object.entries(luggage)) { im.count = lug[k]; im.visible = lug[k] > 0; im.instanceMatrix.needsUpdate = true; }
  }

  // ================================================================ LIGHTS (constant set; repositioned per shot)
  const key = new THREE.SpotLight(BULB, 16, 14, 1.0, 0.75, 2);
  key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -0.0001; key.shadow.normalBias = 0.004; key.shadow.radius = 3;
  key.shadow.camera.near = 0.3; key.shadow.camera.far = 9;
  scene.add(key, key.target);
  const fillA = new THREE.PointLight(BULB, 9, 11, 2), fillB = new THREE.PointLight(BULB, 9, 11, 2);
  scene.add(fillA, fillB);
  const skyLight = new THREE.DirectionalLight(0x9fb2d2, 0.35); scene.add(skyLight, skyLight.target);
  const hemi = new THREE.HemisphereLight(0x2a3b5a, 0x2b2017, 0.35); scene.add(hemi);
  // which optional lights a set-up uses (fewer lit-pixel evaluations; each combination compiles once)
  function lights({ sky = false, fill1 = true, fill2 = false, cone = 0.62 } = {}) { skyLight.visible = sky; fillA.visible = fill1; fillB.visible = fill2; key.angle = cone; }
  // place the key at lamp i (bulb), the fills at two others
  function lampRig(i, a, b, { k = 16, f = 9, aim = null } = {}) {
    const x = LAMP_X[i];
    key.position.set(x, LAMP_Y - 0.03, LAMP_Z); key.target.position.copy(aim || V3(x, 0, LAMP_Z)); key.intensity = k;
    fillA.position.set(LAMP_X[a], LAMP_Y - 0.08, LAMP_Z); fillA.intensity = f;
    fillB.position.set(LAMP_X[b], LAMP_Y - 0.08, LAMP_Z); fillB.intensity = f;
    key.target.updateMatrixWorld();
  }

  // ================================================================ HERO: MIGRANT (+ close-up hands swapped onto her wrists)
  const mig = await loadCharacter('MIGRANT', { lod: 'hi' });
  scene.add(mig.root);
  const migHandL = await loadCharacterHand('MIGRANT', 'L', { lod: 'close' });
  const migHandR = await loadCharacterHand('MIGRANT', 'R', { lod: 'close' });
  for (const [s, h] of [['L', migHandL], ['R', migHandR]]) { // replace the figure-LOD hands by the close-up ones
    const old = mig.hands[s], bone = old.root.parent;
    h.root.position.copy(old.root.position); h.root.quaternion.copy(old.root.quaternion); h.root.scale.copy(old.root.scale);
    bone.remove(old.root); bone.add(h.root); mig.hands[s] = h;
  }

  // ---------------------------------------------------------------- the crate she sits on
  const crate = new THREE.Group(); scene.add(crate);
  {
    const cw = TX.mat('wood_pale', { repeat: [0.6, 0.6], tex: { seed: 12, planks: 4 }, color: 0xa79d90 }), cg = [];
    const b = (w, h, d, x, y, z) => cg.push(boxG(w, h, d).translate(x, y, z));
    for (let k = 0; k < 4; k++) { b(0.56, 0.1, 0.012, 0, 0.06 + k * 0.105, 0.19); b(0.56, 0.1, 0.012, 0, 0.06 + k * 0.105, -0.19); }
    for (let k = 0; k < 3; k++) { b(0.012, 0.1, 0.38, 0.28, 0.06 + k * 0.14, 0); b(0.012, 0.1, 0.38, -0.28, 0.06 + k * 0.14, 0); }
    for (let k = 0; k < 5; k++) b(0.1, 0.014, 0.4, -0.24 + k * 0.12, 0.413, 0); // bottom boards (now the top)
    for (const [x, z] of [[-0.27, -0.18], [0.27, -0.18], [-0.27, 0.18], [0.27, 0.18]]) b(0.04, 0.42, 0.04, x, 0.21, z);
    mesh(mergeGeometries(cg), cw, crate);
    crate.children[0].scale.x = 0.78; // (integration) a narrower upturned fruit crate: from the front it no longer shows as a pedestal either side of her shins
  }

  // ---------------------------------------------------------------- PROP_CASE (58×38×21 cm), lid hinged at the back, 蓝印花布 lining
  // local frame: origin = bottom centre, +Z = front (handle side), hinge along the back top edge (z −0.19, y 0.16)
  // (integration) the case is drawn at 0.9 × 0.86 × 0.9 of the bible's 58×38×21 cm (≈ 52×34×18): on her lap at the full size it
  // read as a lectern standing to her chest (QA); everything inside (lid, shirt, lining) scales with it
  const CASE_S = [0.9, 0.86, 0.9];
  const caseG = new THREE.Group(); caseG.scale.set(...CASE_S); scene.add(caseG);
  const lid = new THREE.Group(); lid.position.set(0, 0.16, -0.19); caseG.add(lid);
  const lining = std({ map: liningMap, roughness: 0.9 }); liningMap.repeat.set(1.6, 1.6);
  const leather = std({ color: 0x6A4A30, roughness: 0.55 });
  const buckleM = TX.mat('brass', { tex: { tone: 'then', patina: 0.2, polish: 0.7 }, roughness: 1, metalness: 1, envMapIntensity: 1.8, color: 0xc9b089 });
  const caseR = TX.mat('rattan', { repeat: [5, 1.6], tex: { seed: 13, age: 0.35 } });      // (review) finer split-rattan weave
  const caseRtop = TX.mat('rattan', { repeat: [5, 3.3], tex: { seed: 13, age: 0.35 } });
  {
    const W = 0.58, D = 0.38, H = 0.16, t = 0.012;
    mesh(boxG(W, t, D), caseRtop, caseG, 0, t / 2, 0);
    mesh(boxG(W, H, t), caseR, caseG, 0, H / 2, D / 2 - t / 2); mesh(boxG(W, H, t), caseR, caseG, 0, H / 2, -D / 2 + t / 2);
    mesh(boxG(t, H, D), caseR, caseG, W / 2 - t / 2, H / 2, 0); mesh(boxG(t, H, D), caseR, caseG, -W / 2 + t / 2, H / 2, 0);
    const lin = (w, h, x, y, z, rx, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), lining, caseG, x, y, z, false); m.rotation.set(rx, ry, 0); return m; };
    lin(W - 2 * t, D - 2 * t, 0, t + 0.001, 0, -Math.PI / 2, 0);
    lin(W - 2 * t, H - t, 0, H / 2 + t / 2, D / 2 - t - 0.001, 0, Math.PI); lin(W - 2 * t, H - t, 0, H / 2 + t / 2, -D / 2 + t + 0.001, 0, 0);
    lin(D - 2 * t, H - t, W / 2 - t - 0.001, H / 2 + t / 2, 0, 0, -Math.PI / 2); lin(D - 2 * t, H - t, -W / 2 + t + 0.001, H / 2 + t / 2, 0, 0, Math.PI / 2);
    // rim binding + corner leathers
    for (const z of [D / 2, -D / 2]) mesh(boxG(W + 0.006, 0.016, 0.016), leather, caseG, 0, H - 0.004, z);
    for (const x of [W / 2, -W / 2]) mesh(boxG(0.016, 0.016, D + 0.006), leather, caseG, x, H - 0.004, 0);
    for (const x of [W / 2, -W / 2]) for (const z of [D / 2, -D / 2]) mesh(boxG(0.05, 0.05, 0.05), leather, caseG, x * 0.97, 0.024, z * 0.95);
    // lid (closed: occupies y 0.16..0.21 in case space)
    const LH = 0.05;
    const lidBox = mesh(boxG(W, LH, D), [caseR, caseR, caseRtop, lining, caseR, caseR], lid, 0, LH / 2, D / 2);
    for (const x of [W / 2, -W / 2]) for (const z of [0.0, D]) mesh(boxG(0.05, 0.05, 0.05), leather, lid, x * 0.97, LH / 2, z === 0 ? 0.02 : D - 0.02);
    // straps over the lid, buckles at the front; handle on the front wall
    for (const x of [-0.17, 0.17]) {
      mesh(boxG(0.032, 0.004, D + 0.012), leather, lid, x, LH + 0.002, D / 2);
      mesh(boxG(0.032, 0.09, 0.004), leather, lid, x, LH - 0.04, D + 0.004);
      const bk = mesh(boxG(0.04, 0.032, 0.008), buckleM, lid, x, LH - 0.03, D + 0.008); bk.userData.buckle = true;
    }
    const handle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), std({ color: 0x7A5530, roughness: 0.6 }), caseG, 0, H - 0.03, D / 2 + 0.03); handle.rotation.z = Math.PI / 2;
    for (const x of [-0.085, 0.085]) mesh(boxG(0.02, 0.04, 0.035), leather, caseG, x, H - 0.03, D / 2 + 0.014);
  }
  // PROP_SHIRT folded (30×22 cm block, #6F7F8F), collar at one end, hem corner with the cut triangle; one hinged top flap
  const shirtG = new THREE.Group(); shirtG.name = 'shirt'; caseG.add(shirtG);
  let shirtFlap, cutNotch;
  const shirtM = TX.mat('shirt', { repeat: [3.2, 2.4], tex: { seed: 21, creases: 0.6 }, color: new THREE.Color(0.92, 1.12, 1.5) }); // (review) bluer + weave creases: it read as grey card under 2400 K
  {
    // the folded block: a soft slab (rounded, slightly lumpy top, bulging sides), front-up with the 对襟 placket and collar
    const bg = new THREE.BoxGeometry(0.3, 0.032, 0.22, 24, 3, 18), N = TX.makeNoise(61), bp = bg.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      let x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const e = Math.max(Math.abs(x) / 0.15, Math.abs(z) / 0.11), t = (y + 0.016) / 0.032;
      const bulge = 1 + 0.035 * Math.sin(Math.PI * t);
      x *= bulge; z *= bulge;
      if (y > 0) y -= 0.009 * smoothstep(0.7, 1.0, e) - 0.0016 * N.fbm(x * 3 + 0.5, z * 3 + 0.5, 2, 3);
      bp.setXYZ(i, x, y, z);
    }
    bg.computeVertexNormals();
    mesh(bg, shirtM, shirtG, 0, 0.016, 0);
    const dark = std({ color: 0x55667A, roughness: 0.9 }), seam = std({ color: 0x4d5b69, roughness: 0.95 });
    for (let k = 0; k < 3; k++) mesh(boxG(0.29, 0.0012, 0.003), seam, shirtG, 0, 0.006 + k * 0.009, 0.1125, false); // fold layers on the front face
    for (let k = 0; k < 3; k++) mesh(boxG(0.003, 0.0012, 0.2), seam, shirtG, 0.1525, 0.006 + k * 0.009, 0, false);
    // (integration) the collar and the 对襟 front, so the block reads as a FOLDED SHIRT (QA: the round collar tube read as a
    // briefcase handle). Same layout as before (collar left of centre near the top edge, placket down from it):
    //  * the mended stand collar #55667A as an open elliptical BAND (flat cross-section ≈ 2 cm, standing up and leaning out,
    //    taller at the back), split at the centre front where the placket starts;
    //  * the neck opening inside it, dark (the inside of the back panel);
    //  * a raised placket strip with its centre-front opening line, edge seams and four cloth knot buttons with loops;
    //  * shoulder seams running out from the collar to the top edge.
    const CX = -0.06, CZ = -0.07, RX = 0.046, RZ = 0.026;
    const collarM = TX.mat('shirt', { repeat: [0.8, 0.25], tex: { seed: 23, creases: 0.2 }, color: new THREE.Color(0.8, 0.97, 1.3), side: THREE.DoubleSide });
    {
      const segs = 44, rows = [0, 0.35, 0.7, 1], pos = [], idx = [], gap = 0.16;
      for (let i = 0; i <= segs; i++) {
        const th = gap + (2 * Math.PI - 2 * gap) * (i / segs), dx = Math.sin(th), dz = Math.cos(th); // θ = 0 → +z (centre front)
        const back = 0.5 - 0.5 * Math.cos(th), hh = 0.022 * (0.55 + 0.45 * back), lean = 0.95 + 0.25 * (1 - back);
        for (const t of rows) {
          const out = t * hh * Math.sin(lean) + 0.0025 * Math.sin(t * Math.PI), up = t * hh * Math.cos(lean) - 0.004 * t * t;
          pos.push(CX + dx * (RX + out), 0.0335 + up, CZ + dz * (RZ + out * RZ / RX));
        }
      }
      const R = rows.length;
      for (let i = 0; i < segs; i++) for (let j = 0; j < R - 1; j++) { const a0 = i * R + j, b0 = a0 + R; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx);
      const uv = []; for (let i = 0; i <= segs; i++) for (const t of rows) uv.push(i / segs * 4, t); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      cg.computeVertexNormals();
      mesh(cg, collarM, shirtG, 0, 0, 0, true);
      // the edge rolls of the band (soft rounded top edge)
      const top = []; for (let i = 0; i <= segs; i++) { const k = i * R + R - 1; top.push(V3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(top), 48, 0.0018, 5, false), collarM, shirtG, 0, 0, 0, false);
    }
    { // the neck opening: the inside of the back panel, in the collar's shadow toward the front (vertex-shaded), cloth texture
      const ng = new THREE.CircleGeometry(1, 32), np = ng.attributes.position, nc = new Float32Array(np.count * 3);
      for (let i = 0; i < np.count; i++) { const y = np.getY(i), r = Math.hypot(np.getX(i), y), k = 0.62 + 0.38 * (0.5 + 0.5 * y) * (1 - 0.35 * r); nc[i * 3] = nc[i * 3 + 1] = nc[i * 3 + 2] = k; }
      ng.setAttribute('color', new THREE.BufferAttribute(nc, 3));
      const neck = mesh(ng, std({ map: shirtM.map, color: new THREE.Color(0.78, 0.92, 1.2), vertexColors: true, roughness: 0.95 }), shirtG, CX, 0.0332, CZ, false); neck.rotation.x = -Math.PI / 2; neck.scale.set(RX * 0.98, RZ * 0.98, 1);
      neck.receiveShadow = false; // the inside of the back panel: in soft shade, not a black hole
    }
    // placket: raised strip from the collar's front split down to the bottom edge, centre-front opening, seams, knot buttons + loops
    const PL0 = CZ + RZ - 0.002, PL1 = 0.104, plM = TX.mat('shirt', { repeat: [0.3, 2.0], tex: { seed: 29, creases: 0.15 }, color: new THREE.Color(0.86, 1.04, 1.38) });
    mesh(new RoundedBoxGeometry(0.024, 0.004, PL1 - PL0, 2, 0.0015), plM, shirtG, CX, 0.0325, (PL0 + PL1) / 2, false);
    mesh(boxG(0.0012, 0.0012, PL1 - PL0), std({ color: 0x2c3540, roughness: 0.95 }), shirtG, CX, 0.0348, (PL0 + PL1) / 2, false); // the opening
    for (const sx of [-0.0115, 0.0115]) mesh(boxG(0.0007, 0.0008, PL1 - PL0), seam, shirtG, CX + sx, 0.0346, (PL0 + PL1) / 2, false);
    for (let k = 0; k < 4; k++) {
      const z = PL0 + 0.016 + k * 0.034;
      const kn = mesh(new THREE.SphereGeometry(0.0042, 10, 8), dark, shirtG, CX - 0.004, 0.0362, z, false); kn.scale.set(1, 0.7, 1);
      const lp = mesh(new THREE.TorusGeometry(0.0045, 0.0011, 5, 12, Math.PI * 1.3), dark, shirtG, CX + 0.003, 0.0352, z, false); lp.rotation.x = -Math.PI / 2;
    }
    // shoulder seams from the collar out to the top edge
    for (const sx of [-1, 1]) { const sg = mesh(boxG(0.075, 0.0008, 0.0011), seam, shirtG, CX + sx * (RX + 0.03), 0.0336, CZ - 0.022, false); sg.rotation.y = sx * 0.55; }
    // raised soft ridges: the sleeves folded back underneath, the body folded in half (cloth rolls on the top face)
    const ridge = (x0, z0, x1, z1, r = 0.0045) => { const c = new THREE.CatmullRomCurve3([V3(x0, 0, z0), V3((x0 + x1) / 2, 0.0015, (z0 + z1) / 2), V3(x1, 0, z1)]); const m = mesh(new THREE.TubeGeometry(c, 12, r, 8, false), shirtM, shirtG, 0, 0.031, 0, false); m.scale.y = 0.55; return m; };
    ridge(-0.14, -0.035, -0.095, -0.085); ridge(-0.02, -0.088, 0.03, -0.03); ridge(-0.145, 0.05, 0.03, 0.065, 0.0035);
    ridge(0.0, 0.02, 0.07, 0.085, 0.0022); ridge(-0.13, 0.0, -0.085, 0.09, 0.002); ridge(0.02, -0.02, 0.1, -0.06, 0.0018); // soft cloth wrinkles
    for (const [x, z, r] of [[-0.12, -0.05, 0.6], [0.0, -0.06, -0.55]]) { const c = mesh(boxG(0.07, 0.0012, 0.0025), seam, shirtG, x, 0.0318, z, false); c.rotation.y = r; }
    shirtFlap = new THREE.Group(); shirtFlap.position.set(0.15, 0.032, 0); shirtG.add(shirtFlap); // last third, hinged along the block's right edge
    mesh(boxG(0.1, 0.008, 0.214), shirtM, shirtFlap, -0.05, 0.004, 0, true);
    mesh(boxG(0.006, 0.01, 0.214), shirtM, shirtFlap, -0.002, -0.001, 0, true); // rounded fold edge
    // the cut triangle at the hem corner (shows the darker layer beneath) — rides on the flap
    cutNotch = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.04, 0), new THREE.Vector2(0, 0.03)])), std({ color: 0x3a4652, roughness: 0.95, side: THREE.DoubleSide }), shirtFlap, -0.004, 0.0085, 0.105, false);
    cutNotch.rotation.x = -Math.PI / 2; cutNotch.rotation.z = Math.PI;
  }
  shirtG.position.set(0.0, 0.013, 0.0);
  // PROP_KEEPSAKE: boxwood comb wrapped in faded red-brown cloth #8E4A3C (bundle 11×6×2.5 cm)
  const comb = new THREE.Group(); scene.add(comb);
  {
    const cm = TX.mat('cotton', { repeat: [0.4, 0.4], tex: { tone: [142, 74, 60], seed: 33, creases: 0.8 } });
    // (integration) a cloth-wrapped comb you can read: a flat wrapped bundle whose top shows the comb's arched spine and the
    // ridges of its teeth through the thin cotton (it was a soft red pebble, 80 % under her palm)
    const bg = new RoundedBoxGeometry(0.106, 0.02, 0.058, 3, 0.008), bp = bg.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      if (y > 0) { const spine = Math.exp(-(((z + 0.014) / 0.008) ** 2)) * 0.004 * (1 - (x / 0.053) ** 2), teeth = (z > -0.004 ? 0.0011 * Math.max(0, Math.sin(x * 2 * Math.PI / 0.0042)) * (1 - Math.abs(x) / 0.06) : 0);
        bp.setY(i, y + spine + teeth - 0.003 * (x / 0.053) ** 2); } }
    bg.computeVertexNormals();
    const b = mesh(bg, cm, comb, 0, 0.011, 0);
    const knot = mesh(new THREE.SphereGeometry(0.011, 10, 8), cm, comb, 0.03, 0.024, 0.0); knot.scale.set(1.2, 0.8, 1);
    const tail = mesh(boxG(0.03, 0.003, 0.014), cm, comb, 0.05, 0.022, 0.01); tail.rotation.y = 0.5;
  }

  // ---------------------------------------------------------------- PROP_LETTER: 8-column bamboo paper 17×25 cm, folds in thirds then in half
  // local: x = page right, −z = page top, +y = written face up. Panels: cols L/R × rows top/mid/bot.
  const letter = new THREE.Group(); scene.add(letter);
  const LW = 0.17, LH = 0.25, R3 = LH / 3;
  const letterFront = TX.mat('letter', { tex: { fill: 1, seed: 15 } }); letterFront.side = THREE.FrontSide;
  const letterBack = std({ color: 0xe0d4bb, roughness: 0.9, map: letterFront.map, side: THREE.BackSide });
  letterBack.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(vec3(0.76,0.70,0.59), vec3(0.80,0.74,0.62) * (0.92 + 0.08 * diffuseColor.r), 0.9) * mix(1.0, 0.93, step(diffuseColor.r, 0.3));'); };
  const panel = (x0, x1, z0, z1) => { // plane in XZ with UVs of that sub-rect, front (+y) and back (−y)
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const uv = geo.attributes.uv, p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + LW / 2) / LW, (-p.getZ(i) + LH / 2) / LH);
    const f = new THREE.Mesh(geo, letterFront); f.castShadow = f.receiveShadow = true; g.add(f);
    const b = new THREE.Mesh(geo, letterBack); b.receiveShadow = true; g.add(b);
    return g;
  };
  const cols = {};
  for (const [nm, x0, x1] of [['R', 0, LW / 2], ['L', -LW / 2, 0]]) {
    const c = new THREE.Group(); letter.add(c);
    const mid = panel(x0, x1, -R3 / 2, R3 / 2); c.add(mid);
    const bot = new THREE.Group(); bot.position.set(0, 0.0004, R3 / 2); c.add(bot); const bp = panel(x0, x1, 0, R3); bp.position.y = -0.0004; bot.add(bp);
    const top = new THREE.Group(); top.position.set(0, 0.0008, -R3 / 2); c.add(top); const tp = panel(x0, x1, -R3, 0); tp.position.y = -0.0008; top.add(tp);
    cols[nm] = { g: c, bot, top };
  }
  cols.L.g.position.y = 0.0012; cols.L.g.children.forEach((ch) => { ch.position.y -= 0.0012; });
  // the triangle of shirt cloth kept inside the half fold (CH2, S043)
  const clothTri = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.044, 0), new THREE.Vector2(0.0, 0.036)])), TX.mat('cotton', { repeat: [0.06, 0.06], tex: { tone: [134, 150, 168], seed: 21, creases: 0.3 }, roughness: 0.95, side: THREE.DoubleSide }), cols.R.g, 0.006, 0.0024, -0.006, false); // (integration) in the middle of the opened sheet // #6F7F8F cut from the shirt hem (review: the shirt map read black here)
  clothTri.rotation.x = -Math.PI / 2; clothTri.rotation.z = 0.35; clothTri.visible = false;
  // a1: bottom third over (0..π), a2: top third over (0..π), a3: left half over (0..π)
  function foldLetter(a1, a2, a3) {
    cols.R.bot.rotation.x = cols.L.bot.rotation.x = -a1;
    cols.R.top.rotation.x = cols.L.top.rotation.x = a2;
    cols.L.g.rotation.z = -a3;
    letter.updateMatrixWorld(true);
  }
  const _tmp = V3();
  const letterPt = (x, y, z) => letter.localToWorld(_tmp.set(x, y, z).clone());

  // ================================================================ placing her on the crate with the case on her knees
  function seatHer({ x = SEAT.x, z = SEAT.z, rot = SEAT.rot, lean = 0.12 } = {}) {
    mig.root.position.set(x, 0, z); mig.root.rotation.set(0, rot, 0);
    crate.position.set(x - Math.sin(rot) * 0.06, 0, z - Math.cos(rot) * 0.06); crate.rotation.y = rot;
    mig.pose('sit_chair', { seat: 0.43, feet: 0.06, lean, hands: 'none' });
    if (lean > 0.15) { mig.bone('spine').rotateX(0.5 * (lean - 0.12)); mig.bone('chest').rotateX(0.6 * (lean - 0.12)); } // hunched over the case
    // case across the thighs, handle toward her body (case +Z → her −Z)
    caseG.position.copy(mig.root.localToWorld(V3(0, 0.565, 0.25))); caseG.rotation.set(0, rot + Math.PI, 0);
    caseG.updateMatrixWorld(true); mig.root.updateMatrixWorld(true);
  }
  const herLocal = (x, y, z) => mig.root.localToWorld(V3(x, y, z));
  const hideLegs = () => { for (const k of ['trousers', 'shoes', 'shoes.sole']) mig.setLayerVisible(k, false); }; // legs hidden by the case / below frame
  const headCentre = (fig) => { const hb = fig.worldPos('head'), e = fig.eye(); return hb.lerp(e, 0.5).add(V3(0, 0.025, 0)); };
  const herDir = (x, y, z) => V3(x, y, z).applyQuaternion(mig.root.quaternion).normalize();
  // lid top in her local frame: y = 0.565 + 0.21; the lid's camera-facing (hinge) edge at her local z = 0.25 + 0.19
  const LID_Y = 0.565 + 0.21 * CASE_S[1] + 0.0015, LID_FRONT_Z = 0.25 + 0.19 * CASE_S[2];
  function placeLetter(lx, lz, rotExtra = 0) { // letter centre in her local frame (on the lid), page top toward the camera (her +Z)
    letter.position.copy(herLocal(lx, LID_Y, lz)); letter.rotation.set(0, mig.root.rotation.y + Math.PI + rotExtra, 0); letter.updateMatrixWorld(true);
  }
  // hand helpers: pinch / press at a world point, palm down, fingers along `fwd`
  const DOWN = V3(0, -1, 0);
  function handAt(side, pt, fwd, pose, lift = 0.03, back = 0.085, elbowOut = 0.3) {
    const h = side === 'L' ? migHandL : migHandR;
    const w = pt.clone().addScaledVector(fwd, -back).add(V3(0, lift, 0));
    mig.reach(side, w, { palm: DOWN, fingers: fwd.clone().add(V3(0, -0.25, 0)).normalize(), elbowOut });
    if (pose) h.pose(pose[0], pose[1] || {});
  }

  // the pinch socket (thumb / index tips) solved onto a world point: reach, measure, correct once
  function pinchAt(side, pt, fwd, w = 1) {
    const h = side === 'L' ? migHandL : migHandR;
    h.pose('pinch');
    handAt(side, pt, fwd, null, 0.02, 0.07, 0.5); mig.root.updateMatrixWorld(true);
    const err = pt.clone().sub(h.sockets.pinch.getWorldPosition(V3()));
    handAt(side, pt.clone().addScaledVector(err, w), fwd, null, 0.02, 0.07, 0.5);
  }

  // ================================================================ the elder (family member seeing her off): WIFE sculpt re-dressed, mid LOD
  const elder = await loadCharacter('WIFE', { lod: 'mid' });
  scene.add(elder.root);
  {
    for (const [k, m] of Object.entries(elder.materials)) {
      if (!m || !m.color) continue;
      if (k.startsWith('jacket')) m.color.set(0x2E3A52);
      else if (k.startsWith('skirt')) m.color.set(0x23252c);
      else if (k === 'hair') m.color.set(0x4a4642);
      else if (k === 'skin') m.color.set(0xC08F6E);   // the elder's older, sun-worn skin (bible §5.5a hand #C99A78), a touch darker
    }
    for (const a of Object.values(elder.accessories || {})) if (a) a.visible = false;
  }
  // elder's close-up right hand (bible 5.5a: knuckly, soft-skinned back, deep-blue cotton cuff #2E3A52), + a sleeve
  // (integration) older: darker, sun-worn, age 1 (deeper knuckle creases, tendons, looser skin) — beside her smooth, lighter hand
  const elderHand = makeHand({ side: 'R', lod: 'close', sex: 'f', age: 1.0, skin: 0xAE7C5C, width: 1.05, thick: 1.04, length: 0.172, forearmLen: 0.14, slender: 0.85,
    cuffs: [{ style: 'band', color: 0x2E3A52, fabric: 'cotton', radius: 0.043, edge: 0.03, len: 0.08 }] });
  scene.add(elderHand.root);
  const elderSleeve = mesh(new THREE.CylinderGeometry(0.049, 0.058, 0.56, 16, 1, true), std({ color: 0x2E3A52, roughness: 0.9, side: THREE.DoubleSide }), elderHand.byName.forearm || elderHand.root, 0, 0.33, 0);

  // ---------------------------------------------------------------- free close-up hands for the inserts (S034, S039)
  const migFreeL = await loadCharacterHand('MIGRANT', 'L', { lod: 'close', hand: { forearmLen: 0.2 } });
  const migFreeR = await loadCharacterHand('MIGRANT', 'R', { lod: 'close', hand: { forearmLen: 0.2 } });
  // (integration) the floral blouse sleeve (bible 褪色碎花布衫, ground #8FA1B3) with a hemmed edge, the print large enough to read as
  // flowers (at the old scale it read as a grey check / tweed in S037 / S039)
  const floralM = TX.mat('floral', { repeat: [0.22, 0.3], tex: { ground: [143, 161, 179], seed: 11 } });
  const floralMap = (() => { // the MIGRANT blouse print (cast.js MIGRANT: ground #8FA1B3, flowers #EDE6D8 / #C99A97, leaves #9AA7A6), faded
    const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = util.rng(612), N = TX.makeNoise(19);
    g.fillStyle = '#8FA1B3'; g.fillRect(0, 0, S, S);
    const im = g.getImageData(0, 0, S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4, n = 0.94 + 0.08 * (N.fbm(x / S, y / S, 6, 3) * 0.5 + 0.5) + 0.03 * ((x + y) % 3 === 0 ? 1 : 0); d[i] *= n; d[i + 1] *= n; d[i + 2] *= n; }
    g.putImageData(im, 0, 0);
    const flower = (cx, cy, rr, col) => { g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5 + r(); g.beginPath(); g.ellipse(cx + Math.cos(a) * rr * 0.55, cy + Math.sin(a) * rr * 0.55, rr * 0.48, rr * 0.3, a, 0, 7); g.fill(); } g.fillStyle = 'rgba(214,190,120,0.9)'; g.beginPath(); g.arc(cx, cy, rr * 0.2, 0, 7); g.fill(); };
    for (let k = 0; k < 46; k++) {
      const x = r() * S, y = r() * S, rr = 9 + r() * 6;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        g.fillStyle = 'rgba(154,167,166,0.85)'; g.beginPath(); g.ellipse(x + dx + rr * 1.1, y + dy + rr * 0.3, rr * 0.55, rr * 0.22, 0.6, 0, 7); g.fill();
        flower(x + dx, y + dy, rr, k % 3 === 1 ? 'rgba(201,154,151,0.9)' : 'rgba(237,230,216,0.92)');
      }
    }
    const t = ctex(c, true, true); t.repeat.set(1.2, 1.6); return t;
  })();
  const sleeveM = std({ map: floralMap, normalMap: floralM.normalMap, roughness: 0.9, side: THREE.DoubleSide });
  for (const h of [migFreeL, migFreeR]) {
    scene.add(h.root);
    const sl = mesh(new THREE.CylinderGeometry(0.047, 0.055, 0.4, 20, 1, true).translate(0, 0.2, 0), sleeveM, h.byName.forearm || h.root, 0, 0.1, 0); sl.name = 'sleeve';
    const hem = mesh(new THREE.TorusGeometry(0.0485, 0.0035, 6, 24), sleeveM, sl, 0, 0.002, 0, false); hem.rotation.x = Math.PI / 2;
  }
  // clerk's hands (invented khaki-grey uniform cuff, no insignia)
  const khaki = 0x8A8670;
  const clerkR = makeHand({ side: 'R', lod: 'close', sex: 'm', age: 0.45, skin: 0xC69C7C, forearmLen: 0.14, cuffs: [{ style: 'band', color: khaki, fabric: 'cotton', radius: 0.046, edge: 0.03, len: 0.07 }] });
  const clerkL = makeHand({ side: 'L', lod: 'close', sex: 'm', age: 0.45, skin: 0xC69C7C, forearmLen: 0.14, cuffs: [{ style: 'band', color: khaki, fabric: 'cotton', radius: 0.046, edge: 0.03, len: 0.07 }] });
  for (const h of [clerkR, clerkL]) { scene.add(h.root); mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.55, 16, 1, true), std({ color: khaki, roughness: 0.85, side: THREE.DoubleSide }), h.byName.forearm || h.root, 0, 0.4, 0); }
  // (integration) a working man's plain short nails: the shared nail shader whitens the free edge (it read as a French manicure
  // under the bulb in S037) — for the clerk's hands the free edge and lunula keep the nail-bed colour, the bed close to the skin
  for (const h of [clerkR, clerkL]) {
    const m = h.skinMat, prev = m.onBeforeCompile, key0 = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { prev.call(m, sh, r); sh.fragmentShader = sh.fragmentShader.replace('vec3(0.97, 0.92, 0.88)', 'uNail').replace('vec3(0.94, 0.9, 0.86)', 'uNail'); };
    m.customProgramCacheKey = () => (key0 ? key0.call(m) : '') + '|plainNails';
    if (m.userData.fzUniforms && m.userData.fzUniforms.uNail) m.userData.fzUniforms.uNail.value.set(0xc08f72);
  }
  // the stamp in the clerk's right hand (grip socket: +Y = handle axis across the palm)
  const stampHolder = new THREE.Group(); clerkR.hold(stampHolder, 'grip');
  // ---------------------------------------------------------------- the nervous young traveller (CH3, S068)
  const trav = await loadCharacter('TRAVELLER', { lod: 'hi' });
  scene.add(trav.root);
  // (review) a knotted cloth 包袱 instead of a ball: squashed lumpy body, the corners tied on top into a knot with two ears
  const travBundle = new THREE.Group(); scene.add(travBundle);
  {
    const bm = TX.mat("cotton", { repeat: [0.9, 0.9], tex: { tone: [88, 98, 112], seed: 8, creases: 0.25 } });
    const bg = new THREE.SphereGeometry(0.16, 24, 16), bp = bg.attributes.position, N = TX.makeNoise(88);
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i); const k = 1 + 0.07 * N.fbm(x * 4 + 1, z * 4 + y * 2 + 1, 3, 3) - (y < -0.08 ? 0.25 * (-0.08 - y) / 0.08 : 0); bp.setXYZ(i, x * k * 1.25, y * 0.72 * (1 + 0.04 * N.fbm(x * 6, z * 6, 2, 3)), z * k * 0.85); }
    bg.computeVertexNormals();
    mesh(bg, bm, travBundle, 0, 0, 0, true);
    const knot = mesh(new THREE.SphereGeometry(0.035, 12, 8), bm, travBundle, 0.0, 0.115, 0.0, true); knot.scale.set(1.3, 0.8, 1.0);
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.03, 0.09, 8), bm, travBundle, sx * 0.05, 0.14, 0.0, true); ear.rotation.z = -sx * 1.0; ear.scale.set(1, 1, 0.45); }
  }
  const ticket = mesh(new THREE.PlaneGeometry(0.075, 0.045), std({ color: 0xd9cfb4, roughness: 0.85, side: THREE.DoubleSide }), null);
  { const tg = new THREE.Group(); tg.add(ticket); ticket.position.set(0, 0.0, 0.03); ticket.rotation.set(0.3, 0, 0.2); trav.hold('L', tg, { socket: 'pinch' }); }
  // ---------------------------------------------------------------- PROP_SWEETS: tung-oil paper parcel 10×8 cm, red cotton string tied in a cross
  const oilMap = (() => { // PROP_SWEETS tung-oil paper #D8B57A: oil mottling, fibres, the folded end flaps, a few creases
    const W = 512, H = 256, c = canvas(W, H), g = c.getContext('2d'), N = TX.makeNoise(16), im = g.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / W, v = y / H, n = N.fbm(u, v, 4, 4) * 0.5 + 0.5, f = N.n(u * 300, v * 150, 300, 150), oil = smoothstep(0.52, 0.7, n), i = (y * W + x) * 4, k = 0.95 + 0.04 * f;
      d[i] = (216 - 30 * oil) * k; d[i + 1] = (181 - 34 * oil) * k; d[i + 2] = (122 - 36 * oil) * k; d[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    g.strokeStyle = 'rgba(120,84,40,0.35)'; g.lineWidth = 1.4;
    for (const [x0, y0, x1, y1] of [[0, 0, 90, 128], [0, 256, 90, 128], [512, 0, 422, 128], [512, 256, 422, 128], [90, 128, 422, 128], [150, 40, 210, 220], [330, 30, 300, 230]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    return ctex(c);
  })();
  const oilM = new THREE.MeshStandardMaterial({ map: oilMap, color: 0xffffff, roughness: 0.42, emissive: 0xffb36c, emissiveMap: oilMap, emissiveIntensity: 0.75, envMapIntensity: 0.8 });
  // (integration) the CLOSED packet as soft, crumpled, translucent paper: the light through it shows the darker shapes of the
  // brittle pieces and candied-melon strips inside; emission halved (it read as a glowing gold brick)
  const packMap = (() => {
    const W = 512, H = 400, c = canvas(W, H), g = c.getContext('2d'), r = util.rng(58);
    g.drawImage(oilMap.image, 0, 0, W, H);
    for (let k = 0; k < 7; k++) { // shadows of the sweets inside (soft, blurred by the paper)
      const x = 70 + r() * 360, y = 60 + r() * 260, w = 60 + r() * 70, h = 40 + r() * 30, a = (r() - 0.5) * 1.2, melon = k > 4;
      g.save(); g.translate(x, y); g.rotate(a); g.filter = 'blur(7px)'; g.fillStyle = melon ? 'rgba(230,215,180,0.45)' : 'rgba(110,64,24,0.55)';
      g.beginPath(); g.roundRect(-w / 2, -h / 2, melon ? w * 1.3 : w, melon ? h * 0.45 : h, 10); g.fill(); g.restore();
    }
    g.filter = 'none'; g.strokeStyle = 'rgba(255,240,205,0.5)'; g.lineWidth = 2; // crumple highlights
    for (let k = 0; k < 14; k++) { g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
    return ctex(c);
  })();
  const packM = new THREE.MeshStandardMaterial({ map: packMap, color: 0xffffff, roughness: 0.5, emissive: 0xffb36c, emissiveMap: packMap, emissiveIntensity: 0.36, envMapIntensity: 0.7, transparent: true, opacity: 0.94 });
  const brittleM = TX.mat('cotton', { repeat: [0.3, 0.3], tex: { tone: [200, 150, 79], seed: 44, creases: 0 }, roughness: 0.6 });
  const redM = std({ color: 0xA33A2E, roughness: 0.7 });
  function makeParcel(open = false) {
    const g = new THREE.Group();
    if (!open) {
      const pg = new RoundedBoxGeometry(0.1, 0.026, 0.08, 6, 0.008), pp = pg.attributes.position, N = TX.makeNoise(71);
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), n = N.fbm(x * 9 + 3, z * 9 + y * 5 + 3, 3, 4), m = N.fbm(z * 21 + 1, x * 21 + 1, 2, 4);
        const pinch = 1 - 0.18 * Math.exp(-(((Math.abs(x) - 0.05) / 0.012) ** 2)) * (Math.abs(y) / 0.013); // the twisted / folded ends
        pp.setXYZ(i, x * (1 + 0.04 * n), y * (1 + 0.25 * n) * pinch + 0.0012 * m, z * (1 + 0.05 * m) * pinch); }
      pg.computeVertexNormals();
      mesh(pg, packM, g, 0, 0.013, 0, false);
      // the thin red cotton string tied crosswise (P16), over the top and round the sides, and its knot + ends
      const str = (pts, r = 0.0016) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V3(...p))), 24, r, 5, false), redM, g, 0, 0, 0, false);
      str([[-0.052, 0.0, 0], [-0.052, 0.024, 0], [-0.03, 0.0285, 0.001], [0, 0.0292, 0], [0.03, 0.0285, -0.001], [0.052, 0.024, 0], [0.052, 0.0, 0]]);
      str([[0, 0.0, -0.042], [0, 0.024, -0.042], [0.001, 0.0285, -0.02], [0, 0.0292, 0], [-0.001, 0.0285, 0.02], [0, 0.024, 0.042], [0, 0.0, 0.042]]);
      const k = mesh(new THREE.SphereGeometry(0.0045, 8, 6), redM, g, 0.002, 0.0305, 0.001); k.scale.set(1.4, 0.7, 1);
      str([[0.003, 0.031, 0.002], [0.014, 0.029, 0.012], [0.022, 0.0275, 0.018]], 0.0011); str([[0.0, 0.031, 0.0], [-0.01, 0.029, 0.014], [-0.013, 0.0275, 0.024]], 0.0011);
    } else {
      const sheet = mesh(new THREE.PlaneGeometry(0.2, 0.17), oilM, g, 0, 0.0, 0, false); sheet.rotation.x = -Math.PI / 2;
      for (const [x, z, ry] of [[-0.02, -0.01, 0.1], [0.025, 0.015, -0.2], [0.0, 0.03, 0.4]]) { const b = mesh(boxG(0.03, 0.012, 0.02), brittleM, g, x, 0.03, z); b.rotation.y = ry; }
      const str = mesh(new THREE.TorusGeometry(0.03, 0.0012, 4, 24), redM, g, 0.06, 0.002, 0.04); str.rotation.x = Math.PI / 2;
    }
    return g;
  }
  const parcel = makeParcel(false); scene.add(parcel);
  const parcelOpen = makeParcel(true); scene.add(parcelOpen);
  const piece = mesh(boxG(0.03, 0.012, 0.02), brittleM, scene, 0, 0, 0);
  // ---------------------------------------------------------------- the carried case (closed clone, hangs from the handle in the grip socket)
  const caseCarry = new THREE.Group(); scene.add(caseCarry);
  { const cc = caseG.clone(true); const sc = cc.getObjectByName('shirt'); if (sc) sc.parent.remove(sc);
    cc.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, 0, 1), V3(1, 0, 0), V3(0, 1, 0))); // handle axis → her forward, body hangs down
    cc.position.copy(V3(0, 0.13 * CASE_S[1], 0.22 * CASE_S[2]).applyQuaternion(cc.quaternion).negate()); caseCarry.add(cc); }
  // hang it from her right hand's grip each frame (gravity keeps it vertical; swing follows the hand a little)
  function hangCase(swing = 0) {
    mig.root.updateMatrixWorld(true);
    const g = migHandR.sockets.grip.getWorldPosition(V3());
    caseCarry.position.copy(g); caseCarry.quaternion.copy(mig.root.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, swing)));
    caseCarry.updateMatrixWorld(true);
  }
  // ================================================================ DAWN DECK (S076): the steamer's side rail, white steel, mist and a new coastline
  const DECK_Y = SEA_Y + 7.6;
  const deck = new THREE.Group(); deck.name = 'deck'; scene.add(deck);
  let coast, mist;
  {
    const dk = mesh(new THREE.PlaneGeometry(14, 5), TX.mat('wood_ship', { repeat: [6, 2.2], tex: { salt: 0.15, seed: 6 }, color: 0x9a9088 }), deck, 0, DECK_Y, 1.6, false); dk.rotation.x = -Math.PI / 2;
    const white = std({ color: 0xD9D6CC, roughness: 0.45, metalness: 0.15 });
    const tr = mesh(new THREE.CylinderGeometry(0.03, 0.03, 14, 12), white, deck, 0, DECK_Y + 1.12, -0.4); tr.rotation.z = Math.PI / 2;
    for (const y of [0.42, 0.78]) { const w = mesh(new THREE.CylinderGeometry(0.008, 0.008, 14, 6), white, deck, 0, DECK_Y + y, -0.4); w.rotation.z = Math.PI / 2; }
    for (let x = -6.2; x <= 7; x += 1.6) mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.12, 10), white, deck, x, DECK_Y + 0.56, -0.4);
    mesh(boxG(14, 0.16, 0.08), white, deck, 0, DECK_Y + 0.08, -0.42); // toe board
    coast = createCoast({ sky, az0: -3, az1: 34, distance: 3200, height: 72, lights: 2, lightIntensity: 2.5, haze: 0.95, level: SEA_Y, seed: 12 });
    deck.add(coast.object3D);
    mist = FX.fogCards({ center: [700, SEA_Y + 10, -2300], size: [2600, 10, 900], count: 8, color: 0xa99f9c, opacity: 0.2, cardSize: [1900, 46], nearFade: 50, scroll: [0.004, 0] });
    deck.add(mist.object3D);
  }

  // ---------------------------------------------------------------- per-shot visibility
  const ALL = { shed, mig: mig.root, elder: elder.root, crate, caseG, letter, comb, elderHand: elderHand.root, crowd, migFreeL: migFreeL.root, migFreeR: migFreeR.root,
    clerkR: clerkR.root, clerkL: clerkL.root, trav: trav.root, travBundle, parcel, parcelOpen, piece, caseCarry, deck };
  function show(list) { for (const [k, o] of Object.entries(ALL)) o.visible = list.includes(k); }

  // ---------------------------------------------------------------- sky / grade presets per time of day
  function nightSky(T) { sky.set({ preset: 'night', moonAz: 160, moonElev: 22, stars: 0.5, cloudCover: 0.55, exposure: 0.8 }); sky.update(T); fog.color.setRGB(0.06, 0.07, 0.095); }
  function duskSky(T) { sky.set({ preset: 'dusk', moonAz: 120, moonElev: 12, cloudCover: 0.6, exposure: 1.0 }); sky.update(T); fog.color.setRGB(0.085, 0.1, 0.135); }
  const MIG_POST = { saturation: 0.78, temp: 0.0, contrast: 1.03, highTint: [0.57, 0.53, 0.46], shadowTint: [0.46, 0.49, 0.56], grain: 0.044, bloom: { strength: 0.42, radius: 0.6, threshold: 0.8 }, vignette: 0.36, lift: [0.012, 0.012, 0.016] };

  // ================================================================ SHOT SET-UPS
  // S020 / S043 shared camera (75 mm, slight high angle, push toward her hands); v = 0..1 push progress
  function letterCam(v, T, { d0 = 3.05, d1 = 2.05, sy0 = 0.5, yaw0 = -0.36, pitch0 = 0.37, pitch1 = 0.35 } = {}) {
    // 75 mm push from her lap + hands to the hands. (integration) it starts ≈ 20° off her right-front (she sits at frame left,
    // her right forearm reads coming down to the letter, the case reads as a flat case lying across her knees, the bulb at her
    // left-behind is upper right) and arcs square to the case by the end, so the lid edge lands as one horizontal line (T10)
    const yaw = yaw0 * (1 - ease.inOutSine(clamp(v)));
    const E = herLocal(0, LID_Y, LID_FRONT_Z), fwd = herDir(Math.sin(yaw), 0, Math.cos(yaw)), up = V3(0, 1, 0);
    // (integration) ≈ 21° down (was 10°): the lid surface and the letter on it read as a surface (the folds were a sliver), the
    // bowed head shows its crown and hair, not a face, and the case front wall no longer stands up like a lectern
    const d = lerp(d0, d1, v), h = d * Math.tan(lerp(pitch0, pitch1, v));
    const aim = lerp(0.23, d * 0.035, v);
    // (review) truck: she starts left of centre with the lamp side open at frame right (keyframe head ≈ 0.40), the push ends
    // centred on the folded line; a pure truck keeps the lid edge horizontal
    const side = herDir(1, 0, 0).multiplyScalar(0.15 * (yaw0 / -0.36) * (1 - ease.inOutSine(clamp(v))));
    // the lid's camera-side edge is solved onto y = 0.66 at the end of the push (T10 → S021, and S043 → S044)
    // (integration) the lid line starts at y ≈ 0.53 (knees + shins under the case at the bottom of frame: the case lies on her lap,
    // not on a lectern) and the frame top cuts her bowed face at the nose; the push keeps it near the same height
    aimAt(E.clone().addScaledVector(fwd, d).addScaledVector(up, h).add(side), E.clone().add(side), 0.5, lerp(sy0, 0.66, ease.inOutSine(clamp(v))), 75);
  }
  // warm bounce off the letter / rattan lid up into her bowed face (review: the top-only bulb left the brow sockets black,
  // reading as a blindfold); below the lid plane so the paper and hands are not lit by it
  function lidBounce(I = 0.45) {
    fillB.visible = true; fillB.color.set(0xffb27a); fillB.position.copy(herLocal(0, 0.7, LID_FRONT_Z + 0.3)); fillB.intensity = I; fillB.distance = 2.5;
  }
  // (integration) S020 / S043 / view_pier light: the bulb of lamp 3 at her left-behind is the key (rim on hair, cheek edge and
  // shoulder, raking light across the letter); a weak warm bounce off the paper keeps the bowed face a readable dark shape
  // (≈ 1.5–2 stops under the lit edge) — never the frontal mask
  function letterLight(bounce = 0) {
    lampRig(2, 1, 3, { k: 15, f: 8, aim: herLocal(0.05, 0.75, 0.3) }); lights({ fill1: false, cone: 0.7 });
    lidBounce(bounce); fillB.position.copy(herLocal(0.03, LID_Y + 0.03, 0.34)); fillB.distance = 0.8; fillB.visible = bounce > 0; // just above the paper (no light through the case)
    // the lamp's pool on the wet planks bounces up onto her knees and shins below the case (they read: the case is on her lap)
    fillA.visible = true; fillA.color.set(0xffb27a); fillA.position.copy(herLocal(-0.05, 0.08, 0.95)); fillA.intensity = 0.55; fillA.distance = 1.4;
  }
  const pressDir = () => herDir(0.95, 0, 0.3); // the palm press: fingers toward frame right along the lid edge (S043 endframe)
  // interior inserts that never see the sky or the sea: skip both (their projected grid / dome still cost rasterisation)
  function exteriorOff() { sky.object3D.visible = false; sea.object3D.visible = false; steamer.visible = false; }
  function pierBase(T, dusk = false) {
    show(['shed', 'mig', 'crate', 'caseG', 'letter', 'crowd']);
    (dusk ? duskSky : nightSky)(T);
    // blue-hour sky from the open seaward side, high (review: from +X at 6 m it glinted like a sun in the wet planks of S036/S038)
    skyLight.position.set(4, 14, 30); skyLight.target.position.set(0, 0, 0); skyLight.intensity = dusk ? 0.45 : 0.2;
    hemi.intensity = dusk ? 0.4 : 0.28;
    for (const l of lamps) { l.glow.set(0.5); l.cone.update(T, { intensity: 0.05 }); }
    lid.rotation.x = 0; shirtG.visible = false; clothTri.visible = false;
  }
  // crowd keep-out around her and the camera axis for the S020/S032/S043 set-ups
  const keepSeat = (x, z) => !(x > SEAT.x - 4.2 && x < SEAT.x + 2.2 && z > -2.6 && z < 0.9);

  const glassGlow = FX.glow({ color: BULB, size: 0.11, intensity: 0.5, falloff: 1.6 }); glassGlow.object3D.visible = false; scene.add(glassGlow.object3D);
  const dbgMark = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 })); dbgMark.visible = false; glassGlow.object3D.visible = false; scene.add(dbgMark);
  // place the camera at pos with lens mm so that world point P lands at frame (sx, sy) (0..1, y down); roll-free, 4 Newton steps
  const _pp = V3();
  function aimAt(pos, P, sx, sy, mm) {
    camera.position.copy(pos); cam.lens(camera, mm);
    const d = P.clone().sub(pos);
    let yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    const tH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tW = tH * camera.aspect;
    for (let k = 0; k < 4; k++) {
      camera.rotation.set(pitch, yaw, 0, 'YXZ'); camera.updateMatrixWorld(true);
      _pp.copy(P).project(camera);
      yaw -= Math.atan((_pp.x - (2 * sx - 1)) * tW) * 0.95;
      pitch += Math.atan((_pp.y - (1 - 2 * sy)) * tH) * 0.95;
    }
    camera.rotation.set(pitch, yaw, 0, 'YXZ'); camera.updateMatrixWorld(true);
  }
  // two hands holding across the railing: her LEFT (figure hand) reaches to C from her side, the elder's RIGHT hand meets it
  // palm to palm, fingers opposite (the pairHands geometry of lib/hand.js, solved with each figure's own 2-bone IK).
  // toElder: horizontal-ish direction from her hand toward the elder. Returns { her, eld } actual wrist positions.
  function claspHands(C, toElder, { give = 0, elderFig = elder } = {}) {
    const fA = toElder.clone().add(V3(0, -0.55, 0)).normalize();               // her fingers: toward the elder, downward
    const pA = toElder.clone().sub(fA.clone().multiplyScalar(toElder.dot(fA))).normalize(); // her palm faces the elder
    const Wa = C.clone().addScaledVector(fA, -0.06).addScaledVector(pA, -0.012);
    if (mig.hands.L.meshes.skinArm) mig.hands.L.meshes.skinArm.visible = false; // (integration) its stub stuck out of the clasp like a stick (bent wrist)
    mig.reach('L', Wa, { palm: pA, fingers: fA, elbowOut: 0.2 });
    mig.hands.L.setChannels(blendHandChannels(handPose('hold_hand', {}, mig.hands.L.dims), handPose('relaxed', { curl: 0.6 }, mig.hands.L.dims), give));
    mig.root.updateMatrixWorld(true);
    const wa = mig.hands.L.root.getWorldPosition(V3());
    const Wb = wa.clone().addScaledVector(pA, 0.03).addScaledVector(fA, 0.105 + 0.05 * give);
    elderFig.reach('R', Wb, { palm: pA.clone().negate(), fingers: fA.clone().negate(), elbowOut: 0.15 });
    elderFig.hands.R.setChannels(blendHandChannels(handPose('hold_hand', { radius: 0.014 }, elderFig.hands.R.dims), handPose('relaxed', { curl: 0.6 }, elderFig.hands.R.dims), give));
    elderFig.root.updateMatrixWorld(true);
    const res = { her: wa, eld: elderFig.hands.R.root.getWorldPosition(V3()), Wa, Wb };
    if (window.__PW) window.__PW.clasp = res;
    return res;
  }
  const S38_DMAX = 1.0;
  const S36 = { X0: -0.6, cam: V3(-2.95, 1.2, -2.42), shipX: 72 }; // (integration) 1.5 m closer along the railing: the clasp in the foreground
  const setups = {
    // ---- S020  CH1 75.04–77.04: refolds the letter (thirds, then half) and presses it flat; T10 line at y 0.66 → S021
    S020(tl, u, T) {
      pierBase(T); sea.object3D.visible = false; // the sea is never in this frame (its projected grid alone cost ≈ 0.75 CPU-s)
      seatHer({ lean: 0.3 }); // (integration) legs shown: knees and shins under the case say 'on her lap' (with them hidden it read as a lectern); leaning over it
      letterLight();
      setCrowd({ t: tl, D: 2.1, speed: 0.9, keep: keepSeat, farD: 5 });
      // fold timeline (sync: 75.44 → 0.40 start, 76.22 → 1.18 folded, 76.60 → 1.56 press)
      const a1 = Math.PI * ease.inOutSine(clamp((tl - 0.42) / 0.24)), a2 = Math.PI * ease.inOutSine(clamp((tl - 0.66) / 0.24)), a3 = Math.PI * ease.inOutSine(clamp((tl - 0.9) / 0.28));
      foldLetter(a1, a2, a3);
      const slide = ease.inOutSine(clamp((tl - 1.2) / 0.3));
      // open letter centred at her local (0.02, 0.24); folded packet (right column, middle row) slides so its front crease meets the lid front edge
      const lx = 0.055, lz = lerp(0.235, LID_FRONT_Z - R3 / 2 - 0.002, slide);
      placeLetter(lx, lz, 0.0);
      const fwd = herDir(0, 0, 1);
      mig.breathe(T, 0.8);
      // right hand (screen-left): settles 0–0.40, pinches the bottom third edge, then the top third edge, pushes, presses
      let rp, rpose = ['pinch'], rlift = 0.028;
      // (integration) the descent comes in from her right side with the elbow out, the forearm diagonal across the lid (it
      // used to hang in front of her chest, forearm hidden behind the hand)
      if (tl < 0.42) { const k = ease.outCubic(clamp(tl / 0.4)); rp = letterPt(0.05, 0, R3 * 1.45).add(V3(0, (1 - k) * 0.1, 0)).addScaledVector(herDir(-1, 0, 0), 0.07 * (1 - k)); rpose = ['relaxed', { curl: lerp(0.5, 0.8, k) }]; }
      else if (tl < 0.66) { rp = new THREE.Vector3().setFromMatrixPosition(cols.R.bot.matrixWorld).add(V3(0, 0, 0)); const e = cols.R.bot.localToWorld(V3(0.045, 0, R3 * 0.95)); rp = e; }
      else if (tl < 0.9) { const e = cols.R.top.localToWorld(V3(0.045, 0, -R3 * 0.95)); const k = clamp((tl - 0.66) / 0.08); rp = e.lerp(letterPt(0.045, 0, R3 * 0.4), 1 - k); }
      else if (tl < 1.5) { rp = letterPt(0.05, 0.004, -R3 * 0.15); rpose = ['flat', { spread: 0.1 }]; rlift = 0.026; }
      else { const k = ease.inOutSine(clamp((tl - 1.5) / 0.12)); rp = letterPt(0.03, 0.004, 0.028); rpose = ['flat', { spread: 0.2 }]; rlift = lerp(0.03, 0.021, k); }
      const diag = herDir(0.55, 0, 0.85), dk = ease.inOutSine(clamp((tl - 0.3) / 0.25));
      const rdir = tl < 1.5 ? diag.clone().lerp(fwd, dk).normalize() : fwd.clone().lerp(pressDir(), ease.inOutSine(clamp((tl - 1.4) / 0.2))).normalize();
      handAt('R', rp, rdir, rpose, rlift, 0.085, lerp(0.75, 0.3, dk));
      // left hand (screen-right): rests on the lid; folds the left half over 0.9–1.18; back to rest
      let lp, lpose = ['relaxed', { curl: 0.6 }], llift = 0.03;
      if (tl < 0.86 || tl > 1.3) lp = herLocal(0.2, LID_Y, 0.25);
      else if (tl < 1.18) { lp = cols.L.g.localToWorld(V3(-0.07, 0, 0.0)); lpose = ['pinch']; llift = 0.028; }
      else { const k = clamp((tl - 1.18) / 0.12); lp = letterPt(-0.02, 0.004, 0).lerp(herLocal(0.2, LID_Y, 0.25), k); }
      handAt('L', lp, fwd.clone().add(herDir(0.25, 0, 0)).normalize(), lpose, llift);
      mig.lookAt(letterPt(0.03, 0, 0), 0.9); mig.bone('neck').rotateX(0.12); // (integration) bowed over the letter: the face stays in its own shadow, the hair crown and cheek edge take the rim
      letterCam(ease.inOutSine(clamp(tl / 1.85)), T);
      const f = cam.distTo(camera, letterPt(0.04, 0, 0));
      return { ...MIG_POST, dof: { focus: f, fstop: 2.4 }, exposure: 1.05 };
    },
    // ---- S043  CH2 139.88–142.21: same set-up; opens the last half fold, the triangle of the old shirt inside; thumb; refolds; press
    S043(tl, u, T) {
      pierBase(T); sea.object3D.visible = false; // the sea is never in this frame (its projected grid alone cost ≈ 0.75 CPU-s)
      seatHer({ lean: 0.3 });
      letterLight();
      setCrowd({ t: tl + 7, D: 2.5, speed: 0.9, keep: keepSeat, farD: 5 });
      // (integration) the letter visibly opens — the half fold, then the top third (等沉默 140.22 → 0.345 s) — to a 17 × 17 cm
      // sheet with the grey-blue triangle of the old shirt in its middle; her right thumb lifts the triangle's corner into the
      // bulb's edge light on 听见 (141.18 → 1.305 s) and holds it; she lays it back, refolds on the old creases (top third
      // 1.56–1.74, the half 1.68–1.88, sliding the packet to the lid edge) and presses with the whole palm on 141.8 (1.925 s)
      const o3 = ease.outCubic(clamp(tl / 0.3)) * (1 - ease.inOutSine(clamp((tl - 1.68) / 0.2)));
      const o2 = ease.inOutSine(clamp((tl - 0.1) / 0.25)) * (1 - ease.inOutSine(clamp((tl - 1.56) / 0.18)));
      foldLetter(Math.PI, Math.PI * (1 - 0.985 * o2), Math.PI * (1 - 0.985 * o3));
      const slide = ease.inOutSine(clamp((tl - 1.66) / 0.24));
      placeLetter(0.055, lerp(0.29, LID_FRONT_Z - R3 / 2 - 0.002, slide), 0.0);
      clothTri.visible = o3 > 0.3;
      const lift = ease.inOutSine(clamp((tl - 1.1) / 0.2)) * (1 - ease.inOutSine(clamp((tl - 1.5) / 0.1)));
      // the cloth hinges on its right edge; its left corner (toward her right hand, screen left) rises ≈ 2 cm into the light
      clothTri.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.35)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -0.75 * lift)); clothTri.updateMatrixWorld(true);
      const corner = clothTri.localToWorld(V3(0.038, 0.002, 0.0));
      const fwd = herDir(0, 0, 1);
      mig.breathe(T, 0.8);
      const ph = (t0, t1) => ease.inOutSine(clamp((tl - t0) / (t1 - t0)));
      // left hand: opens the half (pinching the left half's outer edge), keeps it open, closes it 1.68–1.88, then rests
      const lRest = herLocal(0.2, LID_Y, 0.25), lEdge = cols.L.g.localToWorld(V3(-0.075, 0, 0.0));
      let lp = lEdge, lpose = ['pinch'], llift = 0.03;
      if (tl > 1.83) { lp = lEdge.clone().lerp(lRest, ph(1.83, 2.02)); lpose = ['relaxed', { curl: 0.6 }]; llift = 0.03 + 0.03 * Math.sin(ph(1.83, 2.02) * Math.PI); }
      handAt('L', lp, herDir(-0.75, 0, 0.55), lpose, llift, 0.07, 0.6); // from outside the sheet (screen right): the hand never lies on it
      // right hand: lifts the top third open (0.1–0.35), moves aside so the cloth reads (0.35–0.9), the thumb under the
      // triangle's corner (1.0–1.55), folds the top third back (1.56–1.74), whole-palm press (1.925)
      const rRest = herLocal(-0.17, LID_Y, 0.3), topEdge = cols.R.top.localToWorld(V3(0.045, 0, -R3 * 0.92));
      const press = letterPt(0.035, 0.004, 0.0);
      let rp, rpose = ['relaxed', { curl: 0.65 }], rdir = fwd, rlift = 0.03, rback = 0.085;
      if (tl < 0.1) { rp = rRest.clone().lerp(topEdge, ph(0.0, 0.1)); }
      else if (tl < 0.36) { rp = topEdge; rpose = ['pinch']; }
      else if (tl < 0.95) { rp = topEdge.clone().lerp(rRest, ph(0.36, 0.6)); }
      else if (tl < 1.56) { rp = null; }
      else if (tl < 1.76) { rp = corner.clone().lerp(topEdge, ph(1.56, 1.62)); rpose = ['pinch']; rdir = herDir(0.75, 0, 0.66).lerp(fwd, ph(1.56, 1.7)).normalize(); }
      else { const k = ph(1.76, 1.92); rp = topEdge.clone().lerp(press, k); rpose = k > 0.5 ? ['flat', { spread: 0.2 }] : ['relaxed', { curl: lerp(0.65, 0.3, k) }]; rdir = fwd.clone().lerp(pressDir(), k).normalize(); rlift = lerp(0.04, 0.022, ph(1.86, 1.93)); }
      if (rp) handAt('R', rp, rdir, rpose, rlift, rback, 0.5);
      else { // thumb + index pinch exactly at the cloth's lifting corner (the socket is solved onto it), the hand beside the cloth
        const k = ph(0.95, 1.1), tgt = corner.clone().add(V3(0, -0.002, 0)), pdir = herDir(0.85, 0, 0.4);
        pinchAt('R', rRest.clone().lerp(tgt, k), pdir, k);
      }
      mig.lookAt(letterPt(0.03, 0, 0.02), 0.9); mig.bone('neck').rotateX(0.12);
      // the same camera as S020, from its END framing (square, lid line y 0.66) pushing on to ≈ 1.4× (face never in frame)
      letterCam(ease.outSine(clamp(tl / 1.5)), T, { d0: 2.05, d1: 1.3, sy0: 0.66, yaw0: 0, pitch0: 0.35, pitch1: 0.37 });
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, letterPt(0.03, 0, 0)), fstop: 2.4 }, exposure: 1.05 };
    },
    // ---- S031  V2 109.88–111.92: fabric match from S030 (same top-down composition): palms finish pressing the collar, the last
    //      third settles (cloth fall, 48 fps feel), whole-palm press on the hem corner on 箱 (110.95 → 1.08 s), a second press at 1.6 s
    S031(tl, u, T) {
      pierBase(T, true); show(['shed', 'mig', 'crate', 'caseG', 'crowd']); exteriorOff();
      seatHer(); hideLegs(); lid.rotation.x = -1.95; shirtG.visible = true; shirtG.position.set(0.0, 0.013, -0.005);
      mig.setLayerVisible('head', false); mig.setLayerVisible('hair', false);
      lampRig(2, 1, 3, { k: 15, f: 8, aim: caseG.localToWorld(V3(0, 0.1, 0)) }); lights({ fill1: false });
      setCrowd({ t: tl, D: 2.1, speed: 0.5, keep: keepSeat });
      const fall = ease.outCubic(clamp((tl - 0.26) / 0.36));
      shirtFlap.rotation.z = -lerp(0.62, 0, fall) - 0.04 * Math.sin(clamp((tl - 0.62) / 0.28) * Math.PI) * (1 - clamp((tl - 0.62) / 0.28));
      const CL = (x, y, z) => caseG.localToWorld(V3(x, y, z).add(shirtG.position));
      const fwd = caseG.localToWorld(V3(0, 0, -1)).sub(caseG.localToWorld(V3(0, 0, 0))).normalize(); // her forward = image up
      const lift = (t0, t1) => ease.inOutSine(clamp((tl - t0) / (t1 - t0)));
      // both palms on the collar until 0.3 s, then lift (slow motion)
      const up1 = lift(0.28, 0.6);
      // right hand → hem corner press at 1.08 (hold half a beat), small lift, second press at 1.6
      const rDown = lift(0.62, 1.06) * (1 - 0.6 * lift(1.32, 1.45)) + 0.6 * lift(1.45, 1.6);
      const collarR = CL(0.035, 0.036, -0.03), corner = CL(0.115, 0.045, 0.07); // (integration) palms either side of the collar, not on it: the collar + placket read at the cut // (review) 2.4 cm back: fingertips poked out past the block's far edge
      const rIdle = collarR.clone().add(V3(0, 0.05, 0));
      const rp = (tl < 0.62 ? collarR.clone().add(V3(0, 0.045 * up1, 0)) : rIdle.clone().lerp(corner.clone().add(V3(0, 0.045, 0)), ease.inOutSine(clamp((tl - 0.62) / 0.3))).add(V3(0, -0.045 * rDown, 0)));
      const side = CL(1, 0, 0).sub(CL(0, 0, 0)).normalize(); // image right = her right
      handAt('R', rp, fwd.clone().addScaledVector(side, -0.15).normalize(), ['wipe'], 0.022, 0.075);
      const lp = CL(-0.135, 0.036, -0.005).add(V3(0, 0.038 * up1, 0));
      handAt('L', lp, fwd.clone().addScaledVector(side, 0.15).normalize(), ['wipe'], 0.022, 0.075);
      // camera: 80° top-down from over her shoulder, handle at the bottom edge
      const tgt = caseG.localToWorld(V3(0.0, 0.06, -0.012));
      cam.place(camera, tgt.clone().addScaledVector(fwd, -0.29).add(V3(0, 1.6, 0)), tgt); cam.lens(camera, 75);
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, tgt), fstop: 4 }, exposure: 1.08 };
    },
    // ---- S032  V2 111.92–114.54: MCU 100 mm handheld; she looks back screen-left over the flowing crowd, one silent word
    S032(tl, u, T) {
      // (integration) re-staged as a LOST PROFILE (QA blocker: the frontal, sharp, front-lit mask). She sits on the crate facing
      // the railing and her family (V2 seat), the camera ≈ 35° behind her LEFT shoulder (100 mm, head ≈ 35 % of frame height at
      // (0.62, 0.38)): we see the braid, the back of the head and — as she turns her head left toward home and the farewell party on
      // 乡音 — the cheek line and the nose tip, a dark shape with a warm 2400 K edge (the families' lamp beyond her, upper left)
      // against the brighter blue-hour windows and the lanterns. The silent word on 唇边 is two small jaw/chin movements plus a
      // breath (shoulders). Defocused travellers sweep left → right behind her for the whole shot.
      pierBase(T, true); show(['shed', 'mig', 'crate', 'caseG', 'crowd']); sea.object3D.visible = false; // never in this frame (perf)
      const O = window.__PW32 || {};
      seatHer({ ...SEAT_V2, rot: O.rot ?? SEAT_V2.rot }); hideLegs();
      lights({ fill1: false, cone: 0.32 }); hemi.intensity = 0.22;
      const bz = SEAT_V2.z;
      setCrowd({ t: tl, D: 2.7, speed: 1.0, farD: 3.5, families: true, waits: false, queue: false, officials: false, keep: (x, z) => z < bz - 1.3,
        extra: [{ x0: SEAT_V2.x - 3.2, z: bz - 1.35, v: 1.15, vi: 4, lug: 'bundle' }, { x0: SEAT_V2.x - 1.7, z: bz - 1.55, v: 1.05, vi: 6, ph: 0.4 },
          { x0: SEAT_V2.x - 4.4, z: bz - 1.45, v: 1.2, vi: 7, lug: 'pole', ph: 0.7 }, { x0: SEAT_V2.x - 0.6, z: bz - 1.75, v: 1.0, vi: 5, ph: 0.2, lug: 'basketArm' },
          { x0: SEAT_V2.x - 2.6, z: bz - 1.65, v: 1.1, vi: 1, ph: 0.55, lug: 'case' }, { x0: SEAT_V2.x - 3.0, z: bz - 1.9, v: 1.1, vi: 9, ph: 0.15, s: 0.95 },
          { x0: SEAT_V2.x - 5.4, z: bz - 1.4, v: 1.25, vi: 0, ph: 0.85, lug: 'case' }, { x0: SEAT_V2.x + 0.4, z: bz - 1.5, v: 1.0, vi: 10, ph: 0.3, lug: 'sack' }] });
      mig.breathe(T, 1.4);
      // hands resting on the closed case
      handAt('R', herLocal(-0.12, LID_Y, 0.3), herDir(0, 0, 1), ['relaxed', { curl: 0.7 }], 0.03);
      handAt('L', herLocal(0.14, LID_Y, 0.3), herDir(0, 0, 1), ['relaxed', { curl: 0.7 }], 0.03);
      // head turn on 乡音 (0.02–0.57 s): from 3/4 to her right (the gate, the ship: screen right) to her left-front (home, the family)
      const k = ease.inOutSine(clamp((tl - 0.02) / 0.6));
      const lookR = herLocal(-3.0, 1.2, 1.6), lookL = herLocal(2.6, 1.22, 2.3);
      mig.lookAt(lookR.lerp(lookL, k), 1);
      // the silent two-syllable word on 唇边 (112.33 → 0.41 s): two small jaw / chin movements
      const w = clamp((tl - 0.4) / 0.42); mig.bone('head').rotateX(0.05 * Math.sin(w * Math.PI * 2) * Math.sin(w * Math.PI));
      mig.root.updateMatrixWorld(true);
      const e = mig.eye(), hc = headCentre(mig);
      // key: the families' bulb beyond her, upper left — a 3/4 back rim on the hair, cheek edge and braid; nothing from the lens side
      // the families' own bulbs (second lamp row, z −5.3) light them from above: a textured, brighter background (warm heads and
      // shoulders, the blue windows between them) for her dark profile
      fillA.visible = fillB.visible = true; fillA.color.set(BULB); fillB.color.set(BULB);
      fillA.position.set(-12.5, LAMP_Y - 0.1, LAMP2_Z); fillB.position.set(-7.5, LAMP_Y - 0.1, LAMP2_Z); fillA.intensity = fillB.intensity = O.fam ?? 6; fillA.distance = fillB.distance = 6;
      const KL = O.key || [-1.0, 1.5, 2.4];
      key.position.copy(hc).add(herDir(KL[0], 0, KL[2]).multiplyScalar(Math.hypot(KL[0], KL[2]))).add(V3(0, KL[1], 0)); key.target.position.copy(hc); key.target.updateMatrixWorld();
      key.intensity = O.ki ?? 30; key.distance = 8; key.shadow.camera.far = 8;
      const camPos = hc.clone().add(herDir(0.574, 0, -0.819).multiplyScalar(4.3)).add(V3(0, O.ch ?? -0.35, 0)); // a little below her eye line: the lit windows rise behind the families' heads
      aimAt(camPos, hc, lerp(0.6, 0.63, k), 0.38, 100);
      { // the families' hurricane lanterns on the railing hooks: warm bokeh upper left (+ one right) behind her
        camera.updateMatrixWorld(true);
        const hit = (nx, ny, zp) => { const r = V3(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize(); return camera.position.clone().addScaledVector(r, (zp - camera.position.z) / r.z); };
        lanternAt(0, hit(-0.55, 0.45, -3.08)); lanternAt(1, hit(0.75, 0.3, -3.08));
      }
      cam.handheld(camera, T, 0.7, 7);
      townM.color.setRGB(...(O.town || [2.2, 2.2, 2.4])); // the blue-hour town through the landward windows: the brighter background she reads against
      if (String(window.__PZ).includes('mark') || PZ0.includes('mark')) { dbgMark.visible = true; dbgMark.position.copy(e); }
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, hc), fstop: 2.0, maxCoc: 2.4 }, exposure: 1.12 };
    },
    // ---- S033  V2 114.54–116.67: CU 70° high angle, locked; reopens the lid on 一颗心 (0.79 s), lays the cloth-wrapped comb on
    //      the shirt's top-right corner (registered (0.64, 0.34) = museum layout), palm press on 念 (1.75 s)
    S033(tl, u, T) {
      pierBase(T, true); show(['shed', 'mig', 'crate', 'caseG', 'comb', 'crowd']); exteriorOff();
      seatHer(); hideLegs(); shirtG.visible = true; shirtG.position.set(0.0, 0.013, -0.005); shirtFlap.rotation.z = 0;
      mig.setLayerVisible('head', false); mig.setLayerVisible('hair', false);
      lampRig(2, 1, 3, { k: 15, f: 8, aim: caseG.localToWorld(V3(0, 0.1, 0)) }); lights({ fill1: false });
      setCrowd({ t: tl, D: 2.2, speed: 0.5, keep: keepSeat });
      const open = ease.inOutSine(clamp((tl - 0.05) / 0.74));
      lid.rotation.x = -1.38 * open; // ≈ 80°: its raised front edge stands at the top of frame, in her left hand
      const CL = (x, y, z) => caseG.localToWorld(V3(x, y, z));
      const fwd = CL(0, 0, -1).sub(CL(0, 0, 0)).normalize();
      // left fingertips under the near edge of the lid: they lift it and (integration) keep holding its raised edge at the top of
      // frame from 一颗心 (0.79 s) — no hand floating beside the case
      const lidEdge = lid.localToWorld(V3(-0.24, 0.0, 0.38));
      const lk = clamp((tl - 0.45) / 0.3);
      handAt('L', lidEdge, fwd.clone().add(V3(0, -0.6 * open, 0)).normalize(), ['relaxed', { curl: lerp(0.9, 0.75, lk) }], 0.012 + 0.01 * open, 0.07, 0.85);
      // the comb: from her lap (bottom right, out of frame) to the shirt's top-right corner, placed at 1.4 s, pressed at 1.75 s
      const place = CL(0.105, 0.06, -0.044), start = CL(0.16, 0.34, 0.36);
      const c = ease.inOutSine(clamp((tl - 0.85) / 0.55));
      const combPos = start.clone().lerp(place, c).add(V3(0, 0.05 * Math.sin(c * Math.PI), 0));
      comb.position.copy(combPos); comb.rotation.set(0, caseG.rotation.y + 0.25, 0);
      const press = ease.inOutSine(clamp((tl - 1.55) / 0.2));
      // (integration) on 念 two fingertips press the bundle's near edge — the hand stays behind it, ≈ 70 % of the cloth (and the
      // comb's shape inside) in view
      const nearEdge = place.clone().addScaledVector(fwd, -0.03).add(V3(0, 0.022, 0));
      const rp = tl < 1.42 ? combPos.clone().add(V3(0, 0.03, 0)) : nearEdge.clone().add(V3(0, 0.025 * (1 - press) * clamp((tl - 1.42) / 0.1) - 0.003 * press, 0));
      handAt('R', rp, fwd, tl < 1.42 ? ['pinch'] : ['touch'], 0.016, tl < 1.42 ? 0.08 : 0.105);
      // (review) framed 5 cm toward her: the lid's near edge (and her lifting fingertips) now enter at the bottom of frame 0,
      // the shirt block is centred and the comb lands at ≈ (0.64, 0.32) — the museum layout position (S030/S049)
      const tgt = CL(0.0, 0.16, 0.04);
      cam.place(camera, tgt.clone().addScaledVector(fwd, -0.36).add(V3(0, 1.5, 0)), tgt); cam.lens(camera, 75); // ≈ 76° down: her headless neckline stays out of frame
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, tgt), fstop: 4 }, exposure: 1.08 };
    },
    // ---- S034  V2 116.67–118.33: INSERT 100 mm at the railing; the elder's hand presses the glowing oil-paper parcel into her
    //      hand on 哪味甜 (0.58 s) and folds her fingers over it on 甜 (1.24 s) → S035 fingers at (0.54, 0.58)
    S034(tl, u, T) {
      pierBase(T, true); show(['shed', 'crowd', 'migFreeL', 'migFreeR', 'elderHand', 'parcel']); exteriorOff();
      const Q = V3(-1.0, 1.1, -2.8);
      lampRig(4, 5, 3, { k: 9, f: 10, aim: Q });
      setCrowd({ t: tl, D: 1.8, speed: 0.6, farD: 3, keep: (x, z) => !(x < Q.x + 6.5 && x > Q.x - 3.5 && z > -4.2 && z < -0.8) });
      // her two hands side by side, palms up, cupped to receive (little fingers together), fingers toward the elder (screen-left)
      const close = ease.inOutSine(clamp((tl - 0.62) / 0.62));
      const cupTo = (h) => h.setChannels(blendHandChannels(handPose('cupped', {}, h.dims), handPose('grip', { radius: 0.024 }, h.dims), close));
      // (integration) elbows bent, cupped hands held toward her lap: the forearms come in diagonally from the bottom right (cropped
      // ≈ x 0.85) with the floral sleeve hems near the wrists, not two straight tubes along the frame
      migFreeL.placeWrist(Q.clone().add(V3(-0.042, -0.02, 0.122)), [0.0, 0.42, -1], [0.3, 1, 0.35]); cupTo(migFreeL);
      migFreeR.placeWrist(Q.clone().add(V3(0.038, -0.02, 0.122)), [0.0, 0.42, -1], [-0.3, 1, 0.35]); cupTo(migFreeR);
      // the elder's hand brings the parcel in from screen-left, sets it in her palms (0.50–0.58 s), then covers her closing fingers
      const inK = ease.outCubic(clamp((tl - 0.04) / 0.5)), wrap = ease.inOutSine(clamp((tl - 0.6) / 0.6)), sq = 0.004 * Math.sin(clamp((tl - 1.24) / 0.35) * Math.PI);
      const eStart = Q.clone().add(V3(0.0, 0.105, -0.106)), eSet = Q.clone().add(V3(0.0, 0.088, 0.0)), eWrap = Q.clone().add(V3(0.0, 0.078 - sq, -0.035));
      const ew = tl < 0.6 ? eStart.lerp(eSet, inK) : eSet.lerp(eWrap, wrap);
      elderHand.placeWrist(ew, V3(0.0, -0.32, 1).lerp(V3(0, -0.22, 1), tl < 0.6 ? 0 : wrap), V3(0, -1, 0.2));
      elderHand.setChannels(blendHandChannels(handPose('grip', { radius: 0.03 }, elderHand.dims), handPose('cupped', {}, elderHand.dims), tl < 0.6 ? 0 : 0.6 + 0.4 * wrap));
      // the parcel: under the elder's palm until set down, then in her joined palms
      const rest = migFreeL.sockets.palm.getWorldPosition(V3()).lerp(migFreeR.sockets.palm.getWorldPosition(V3()), 0.5).add(V3(0, -0.004, 0));
      const inElder = elderHand.sockets.palm.getWorldPosition(V3()).add(V3(0, -0.032, 0));
      parcel.position.copy(tl < 0.5 ? inElder : inElder.lerp(rest, ease.inOutSine(clamp((tl - 0.5) / 0.1)))); parcel.rotation.set(0, 0.06, 0.02);
      // (review) camera raised ~13° so the parcel lies readable in the joined palms, and solved so the closing hands land on
      // S035's pinch position (0.54, 0.58) at the cut; locked with a 3 % micro push
      const PE = Q.clone().add(V3(0.0, 0.0, 0.08));
      aimAt(PE.clone().add(V3(-1.22 + 0.04 * ease.inOutSine(u), 0.17, 0.06)), PE, 0.535, 0.57, 100);
      const tgt = PE;
      { // the warm bulb glow behind the hands (keyframe (0.60, 0.30)): a family's hurricane lantern on a trunk ~7 m down the shed
        camera.updateMatrixWorld(true);
        const r = V3(0.2, 0.4, 0.5).unproject(camera).sub(camera.position).normalize();
        lanternAt(0, camera.position.clone().addScaledVector(r, (0.47 - camera.position.y) / r.y), { rod: false, rotY: 0.4 });
      }
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, tgt), fstop: 2.8, maxCoc: 2.4 }, exposure: 1.15, bloom: { strength: 0.5, radius: 0.6, threshold: 0.75 } };
    },
    // ---- S036  V2 121.25–123.29: WS 32 mm locked, deep focus; the two hands clasped at the railing, steamer beyond the doors at
    //      screen-right; the clasp settles on 替谁 (0.16 s), one slow thumb stroke on 平安 (1.40 s)
    S036(tl, u, T) {
      // (review) re-staged: the hands really clasp over the railing (they were ~10 cm apart, arms out of reach), the booth is
      // hidden (filler railing) so the gate / end doors read, the steamer is re-berthed per shot so it fills the end-door
      // opening at frame (0.78, 0.40) with its rows of warm portholes, the foreground bench / standing extra are cleared.
      pierBase(T, true); show(['shed', 'mig', 'elder', 'crowd', 'caseCarry']);
      booth.visible = false; boothFill.visible = true; bench68.visible = false;
      lampRig(4, 5, 3, { k: 13, f: 2.5, aim: V3(S36.X0 + 0.1, 1.0, -2.4) }); lights({ sky: true, cone: 0.36 });
      key.position.set(S36.X0 + 1.4, LAMP_Y - 0.03, -0.9); key.target.updateMatrixWorld(); hemi.intensity = 0.3; // the elder stays in the falloff (留白)
      setCrowd({ t: tl + 3, D: 2.1, speed: 0.35, farD: 10, keep: (x, z) => !(x > -5.5 && x < 3.5 && z > -4.6 && z < 0.6) && !(x < 7 && z > 0.6 && x > -2 && z < 4.5) });
      const X0 = S36.X0;
      mig.root.position.set(X0, 0, -2.5); mig.root.rotation.set(0, Math.PI / 2 + 0.18, 0);
      mig.pose('stand', { weight: 0.4 }); mig.breathe(T, 1);
      mig.reach('R', mig.root.localToWorld(V3(-0.2, 0.74, 0.03)), { palm: herDir(1, 0, 0), fingers: V3(0, -1, 0.05) }); migHandR.pose('rattan'); hangCase();
      elder.root.position.set(X0 - 0.74, 0, -3.36); elder.root.rotation.set(0, 0.8, 0);
      elder.pose('stand', { weight: -0.3 }); elder.bone('chest').rotateX(0.1); elder.breathe(T + 1.3, 1); elder.root.updateMatrixWorld(true);
      const C = V3(X0 - 0.42, 1.1, -3.0);
      const settle = ease.outCubic(clamp(tl / 0.16));
      const toE = elder.worldPos('armR.upper').sub(C).setY(0).normalize();
      claspHands(C.clone().add(V3(0, 0.012 * (1 - settle), 0)), toE);
      // the thumb stroke on 平安 (1.40 s): the elder's thumb slides over the back of her hand once
      const th = 0.32 * Math.sin(clamp((tl - 1.25) / 0.5) * Math.PI);
      if (th) { const ch = elder.hands.R.channels; ch.thumb = ch.thumb.map((v, i) => (i === 2 ? v + th : i === 0 ? v - th * 0.5 : v)); elder.hands.R.setChannels(ch); }
      mig.lookAt(V3(X0 + 6, 1.45, -1.2), 0.45);
      elder.lookAt(mig.eye(), 0.7);
      gateL.rotation.y = Math.PI; gateR.rotation.y = 0;
      for (const i of [3, 4, 5]) lamps[i].glow.set(0.16); // the bulbs above the lens: halos small — the portholes stay the brightest, warmest points
      aimAt(S36.cam, C, 0.3, 0.62, 32);
      // the steamer broadside-on in the end-door opening (frame ≈ 0.72, 0.36), its porthole side toward the shed, 75 m out
      camera.updateMatrixWorld(true);
      const ray = V3(0.44, 0.28, 0.5).unproject(camera).sub(camera.position).normalize();
      const sp = camera.position.clone().addScaledVector(ray, (S36.shipX - camera.position.x) / ray.x);
      steamer.rotation.set(0, Math.PI / 2, 0); steamer.position.set(S36.shipX - 16.4, 0, sp.z + 10);
      return { ...MIG_POST, dof: { focus: 3.2, fstop: 8 }, exposure: 1.05 };
    },
    // ---- S037  V2 123.29–126.12: INSERT 45° down through the booth's glass partition (booth in the cross railing by the gate;
    //      camera looks +X); the stamp peaks on 印 (0.74 s), falls on 章 (1.29 s, 96 fps feel), lifts at 2.31 s; violet mark at
    //      (0.60, 0.50) for S040; her floral sleeve at the left edge, the arm still stretched back to the family at the railing
    S037(tl, u, T) {
      pierBase(T, true); show(['shed', 'clerkR', 'clerkL', 'migFreeL', 'crowd']); exteriorOff();
      booth.updateMatrixWorld(true);
      const B = (x, y, z) => booth.localToWorld(V3(x, y, z));
      lampRig(5, 6, 4, { k: 12, f: 9 }); lights({ fill1: false, cone: 0.9 });
      key.position.copy(B(0.35, 2.5, -0.5)); key.target.position.copy(B(0.0, 1.1, -0.2)); key.target.updateMatrixWorld(); key.intensity = 2.0; key.angle = 0.9;
      setCrowd({ t: tl, D: 3, speed: 0.6, keep: (x, z) => !(x > 4 && x < 10 && z > -3.2 && z < 0.4) });
      const permitC = V3(0.02, 1.112, -0.2), mark = permitC.clone().add(V3(0.033, 0.0005, -0.003));
      stampImp.position.copy(mark); stampImp.position.y = 1.1125;
      // (review) the peak is kept inside the frame (top right) for 印
      const pIn = V3(0.13, 1.19, -0.17), pk = mark.clone().add(V3(0.035, 0.07, 0.012)), hit = mark.clone().add(V3(0, 0.0005, 0)), out = mark.clone().add(V3(0.24, 0.3, -0.04)); // lift exits top right: its shadow clears the fresh mark
      let sp, sq = 0;
      if (tl < 0.74) sp = pIn.clone().lerp(pk, ease.inOutSine(tl / 0.74));
      else if (tl < 1.0) sp = pk.clone().add(V3(0, 0.004 * Math.sin((tl - 0.74) / 0.26 * Math.PI), 0));
      else if (tl < 1.29) sp = pk.clone().lerp(hit, ease.inCubic((tl - 1.0) / 0.29));
      // (integration) the lift starts at 2.06 s (125.35) and clears the mark by 2.31 (125.6): it holds ≥ 0.5 s before the cut
      else if (tl < 2.06) { sp = hit.clone(); sq = Math.min(1, (tl - 1.29) / 0.12) * (1 - clamp((tl - 1.85) / 0.2)); }
      else sp = hit.clone().lerp(out, ease.inOutSine(clamp((tl - 2.06) / 0.3)));
      stampImp.visible = tl >= 1.29; stampImp.material.opacity = 0.92;
      stampTool.position.copy(sp); stampTool.position.y -= 0.0015 * sq; stampTool.rotation.set(0, 0, 0); stampTool.scale.set(1, 1 - 0.03 * sq, 1);
      const toolW = B(sp.x, sp.y - 0.0015 * sq, sp.z);
      // the clerk's fist round the handle (thumb up), forearm off to the top-right
      clerkR.pose('grip', { radius: 0.016 });
      const rdir = B(-1, 0, 0).sub(B(0, 0, 0)), away = B(0, 0, -1).sub(B(0, 0, 0)); // booth −x (screen-left), booth −z (away)
      clerkR.placeWrist([0, 0, 0], rdir.clone().add(V3(0, -0.15, 0)).addScaledVector(away, -0.25).normalize(), away.clone().negate());
      clerkR.root.updateMatrixWorld(true);
      const gs = clerkR.sockets.grip.getWorldPosition(V3());
      clerkR.root.position.add(toolW.clone().add(V3(0, 0.04, 0)).sub(gs)); clerkR.root.updateMatrixWorld(true);
      // the clerk's left fingertips holding the photo corner of the permit
      const corner = B(permitC.x - 0.085, 1.114, permitC.z - 0.06);
      clerkL.pose('flat', { spread: 0.3 });
      clerkL.placeWrist(corner.clone().addScaledVector(away, 0.13).addScaledVector(rdir, 0.05).add(V3(0, 0.035, 0)), away.clone().negate().add(V3(0, -0.25, 0)).addScaledVector(rdir, -0.25).normalize(), [0, -1, 0]);
      // her left forearm and floral sleeve along the counter edge at the lower-left, stretched back toward the family (hand out of frame)
      migFreeL.placeWrist(B(-0.68, 1.3, 0.08), rdir.clone().add(V3(0, -0.04, 0)).normalize(), V3(0, -1, 0).addScaledVector(away, -0.4)); // (integration) floral sleeve, cropped at the left edge (x < 0.1)
      migFreeL.pose('hold_hand');
      const camT = B(permitC.x + 0.01, 1.112, permitC.z - 0.012);
      // (review) solved so the fresh violet mark sits on S040's registered spot (0.60, 0.50) (it was at 0.56, 0.53)
      aimAt(camT.clone().add(V3(0, 0.6, 0)).addScaledVector(away, -0.62), B(mark.x, mark.y, mark.z), 0.6, 0.5, 75);
      // the lamp behind her, reflected in the partition glass (placed on the pane where the reflection reads, frame (0.35, 0.25))
      camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
      const ray = V3(-0.3, 0.5, 0.5).unproject(camera).sub(camera.position).normalize(), gx = booth.localToWorld(V3(0, 0, 0));
      const tHit = (gx.x - camera.position.x) / ray.x; glassGlow.object3D.position.copy(camera.position).addScaledVector(ray, tHit); glassGlow.object3D.visible = true;
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, camT), fstop: 4 }, exposure: 1.12 };
    },
    // ---- S038  V2 126.12–129.75: MS 40 mm along the railing (+X), slow track right toward the gate / ship + light handheld; the
    //      gate opens on 许你 (0.07 s); she steps off from the booth toward the gate, the case in her right hand, her left arm held
    //      back by the hand over the railing; both arms straight on 一站 (2.11 s)
    S038(tl, u, T) {
      // (review) re-staged: the booth is hidden (filler railing) so the opening gate and the shed beyond read behind her;
      // the elder stands nearer the lens (soft shoulder at frame left by the end); the clasp is solved between the two
      // shoulders every frame so the hands never let go (they were 0.5 m apart); she can only gain ≈ 0.5 m before both
      // arms are straight — the walk decelerates into that tension on 一站 (2.11 s); the crowd funnels through the gate.
      pierBase(T, true); show(['shed', 'mig', 'elder', 'crowd', 'caseCarry']);
      booth.visible = false; boothFill.visible = true; bench68.visible = false;
      // key: a narrow spot from the lamp over the travellers' side onto her and the clasp; the elder stays in the falloff
      // (her face is never given: 留白 — only the hand and the sleeve read, bible §5.5a)
      lampRig(6, 5, 7, { k: 15, f: 2, aim: V3(6.5, 1.0, -2.1) }); lights({ sky: true, cone: 0.38 }); hemi.intensity = 0.3; skyLight.intensity = 0.28;
      key.position.set(6.9, LAMP_Y - 0.03, -1.1);
      const go = ease.inOutSine(clamp((tl - 0.07) / 1.1));
      gateL.rotation.y = Math.PI + 1.35 * go; gateR.rotation.y = -1.35 * go;
      setCrowd({ t: tl, D: 3.7, speed: 1.15, gateOpen: go, funnel: true, farD: 9, keep: (x, z) => !(x < 7.8 && z > -2.9 && z < 2.2) });
      // (integration) she really WALKS: from a step beside the railing (left elbow bent ≈ 90°, the clasp at chest height
      // ≈ 1.15 m) about 1.1 m toward the gate over 126.2–128.2, the case swinging in her right hand with air under it, until both
      // arms are straight EXACTLY on 一站 (128.23 → 2.11 s); she looks back from 127.6 (1.48 s); the camera tracks ≈ 0.8 m with her.
      elder.root.position.set(6.02, 0, -3.36); elder.root.rotation.set(0, 1.0, 0);
      const tense = ease.inOutSine(clamp((tl - 1.2) / 0.95));
      elder.pose('stand', { weight: 0.5 }); elder.bone('chest').rotateX(0.06 + 0.22 * tense); elder.bone('spine').rotateX(0.05 + 0.06 * tense); elder.root.updateMatrixWorld(true);
      const se = elder.worldPos('armR.upper');
      const P0 = V3(6.3, 0, -2.66), dir = V3(0.5, 0, 0.866), rotW = Math.atan2(dir.x, dir.z);
      const wk = clamp((tl - 0.08) / (2.11 - 0.08)), step = wk * wk * (3 - 2 * wk); // eases in from a standstill, decelerates into the pull
      // solve the walk length so that her left shoulder reaches S38_DMAX from the elder's right shoulder at step = 1
      const offL = V3(0.175, 1.27, 0.0).applyAxisAngle(V3(0, 1, 0), rotW), A0 = P0.clone().add(offL).sub(se); A0.y = 0;
      const bq = A0.dot(dir), cq = A0.lengthSq() - (S38_DMAX ** 2 - (1.27 + 0 - se.y) ** 2);
      const sStar = -bq + Math.sqrt(Math.max(0, bq * bq - cq));
      const walked = sStar * step;
      mig.root.position.copy(P0).addScaledVector(dir, walked); mig.root.rotation.set(0, rotW - 0.12 * (1 - step) + 0.1 * tense, 0);
      const stride = 0.12 + 0.68 * Math.sin(Math.PI * clamp(wk * 1.08));
      mig.pose('walk', { phase: (0.15 + walked / 1.05) % 1, stride }); mig.breathe(T, 1.2);
      mig.bone('chest').rotateY(0.22 * tense); mig.bone('spine').rotateY(0.1 * tense); // her upper body turns back toward the held hand
      const sw = Math.sin((0.15 + walked / 1.05) * Math.PI * 2) * stride;               // the case swings with her stride
      mig.reach('R', mig.root.localToWorld(V3(-0.21, 0.76, 0.03 + 0.06 * sw)), { palm: herDir(1, 0, 0), fingers: V3(0, -1, 0.05) }); migHandR.pose('rattan'); hangCase(0.07 * sw);
      mig.root.updateMatrixWorld(true);
      let sh = mig.worldPos('armL.upper');
      { // safety: never further than both arms allow
        const d = sh.distanceTo(se);
        if (d > S38_DMAX) { const pull = se.clone().sub(sh).setY(0).normalize().multiplyScalar(d - S38_DMAX); mig.root.position.add(pull); mig.root.updateMatrixWorld(true); sh = mig.worldPos('armL.upper'); }
        if (window.__PW) window.__PW.s38d = d;
      }
      // the clasp: near her chest at first (her elbow bent), drawn out to the midpoint of the straight arms
      const Cmid = sh.clone().lerp(se, 0.5), Cnear = sh.clone().lerp(se, 0.62).add(V3(0, -0.1, 0));
      const C = Cnear.lerp(Cmid, step); C.y = lerp(1.15, 1.1, step) + 0.03 * tense;
      claspHands(C, se.clone().sub(sh).setY(0).normalize());
      const look = ease.inOutSine(clamp((tl - 1.48) / 0.45));
      mig.lookAt(V3(9.5, 1.5, 2.0).lerp(V3(5.7, 1.35, -3.6), look), 0.95);
      elder.lookAt(mig.eye(), 0.45);
      const ck = ease.inOutSine(clamp((tl - 0.1) / 2.6));
      const tgt = C.clone().lerp(mig.worldPos('chest'), 0.55); tgt.y = 1.0;
      aimAt(V3(2.85, 1.22, lerp(-2.4, -1.6, ck)), tgt, 0.47, 0.5, 40);
      cam.handheld(camera, T, 0.6, 21);
      // the steamer broadside beyond the end doors at frame right (as in S036)
      camera.updateMatrixWorld(true);
      const ray = V3(0.62, 0.3, 0.5).unproject(camera).sub(camera.position).normalize();
      const sp = camera.position.clone().addScaledVector(ray, (S36.shipX - camera.position.x) / ray.x);
      steamer.rotation.set(0, Math.PI / 2, 0); steamer.position.set(S36.shipX - 16.4, 0, sp.z + 10);
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, mig.worldPos('chest')), fstop: 2.8 }, exposure: 1.1 };
    },
    // ---- S039  V2 129.75–133.79: ECU 100 mm over the elder's shoulder (family side), looking toward the gate and the open seaward
    //      side (backlight); the hands slide apart from 许你 (0.63 s), fingertips only on 离 (2.97 s), part on 别 (3.21 s); hers exits
    //      screen-right toward the ship; the elder's hand stays, still: T15 A-frame (0.36, 0.56) → S040
    S039(tl, u, T) {
      pierBase(T, true); show(['shed', 'migFreeL', 'elderHand', 'crowd']);
      gateL.rotation.y = Math.PI + 1.35; gateR.rotation.y = -1.35; // open since S038
      const H0 = V3(6.3, 1.16, -3.02);
      const F = V3(0.4, 0, 0.9165), R = V3(-0.9165, 0, 0.4), UP = V3(0, 1, 0);
      lampRig(5, 6, 4, { k: 0.0, f: 4 }); lights({ sky: true });
      // (review) cool backlight raised and pushed aside (its glint on the glossy nails read as white sparkles), softer; a warm
      // shed fill from behind the camera models the knuckles and the soft old skin instead of a muddy silhouette
      // (integration) the blue gate light BEHIND the hands (rim on the finger edges, light between the fingers), the warm shed
      // fill from the camera side ≈ 1 stop under it: the hands are modelled by the rim, not evenly front-lit terracotta
      key.position.copy(H0).addScaledVector(F, 2.6).addScaledVector(R, 0.55).add(V3(0, 1.1, 0)); key.target.position.copy(H0); key.target.updateMatrixWorld(); key.color.set(0xa9bedf); key.intensity = 16; key.angle = 0.3;
      skyLight.position.copy(H0).addScaledVector(F, 10).addScaledVector(R, -4).add(V3(0, 5, 0)); skyLight.target.position.copy(H0); skyLight.intensity = 0.55;
      fillA.color.set(0xffcf9e); fillA.position.copy(H0).addScaledVector(F, -1.3).addScaledVector(R, -0.6).add(V3(0, 0.9, 0)); fillA.intensity = 0.75; fillA.distance = 4;
      setCrowd({ t: tl, D: 4.2, speed: 1.0, gateOpen: 1, walkers: false, waits: false, queue: false, officials: false });
      // the elder's right hand: back to camera, palm toward the departing hand, fingers up and gently curled, thumb at screen-left
      elderHand.placeWrist(H0.clone().add(V3(0, -0.085, 0)).addScaledVector(F, -0.01), UP.clone().addScaledVector(F, 0.22), F.clone().add(V3(0, -0.1, 0)));
      elderHand.setChannels(blendHandChannels(handPose('relaxed', { curl: 0.72 }, elderHand.dims), handPose('hold_hand', {}, elderHand.dims), 0.2)); // four fingers gently curled (T15)
      // her left hand: fingers over the elder's palm edge from screen-right, slides off (palm → knuckles → fingertips) and away
      const s1 = ease.inOutSine(clamp((tl - 0.63) / (3.21 - 0.63)));
      const after = ease.inSine(clamp((tl - 3.21) / 0.6));
      const hw = H0.clone().addScaledVector(F, 0.035 + 0.034 * s1 + 0.12 * after).addScaledVector(R, 0.105 + 0.07 * s1 + 0.34 * after).add(V3(0, -0.03 * s1 - 0.04 * after, 0));
      migFreeL.placeWrist(hw, R.clone().negate().add(V3(0, 0.12 + 0.2 * s1, 0)), F.clone().negate().addScaledVector(R, 0.25 * s1));
      migFreeL.setChannels(blendHandChannels(handPose('hold_hand', { radius: 0.018 }, migFreeL.dims), handPose('relaxed', { curl: 0.55 }, migFreeL.dims), clamp(s1 * 1.1 + after)));
      migFreeL.root.visible = after < 0.999;
      const tgt = H0.clone().add(V3(0, 0.003, 0)).addScaledVector(R, 0.062);
      cam.place(camera, H0.clone().addScaledVector(F, -1.42).add(V3(0, -0.05, 0)).addScaledVector(R, 0.04), tgt); cam.lens(camera, 100);
      return { ...MIG_POST, noCones: true, dof: { focus: 1.42, fstop: 2.8, maxCoc: 2 }, exposure: 1.05, bloom: { strength: 0.45, radius: 0.7, threshold: 0.8 } };
    },
    // ---- S068  CH3 215.67–217.71: MS 50 mm locked; on the bench she gives a piece of the peanut-sesame sweet to the nervous boy
    //      (left → right, T21): it lands in his palm on 面 (0.27 s); her smile crosses 千 (0.93 s); his cheek loosens at 1.53 s
    S068(tl, u, T) {
      // (integration) re-staged as a small, tender gesture at LAP height (QA: two straight arms meeting at shoulder height read as a
      // handshake / arm-wrestle, two frontal masks). The bench sits just in front of lamp 5, so the bulb is behind them: rims on
      // hair and shoulders, the faces turned toward each other in 3/4 profile and in their own shadow, the oil paper glowing in her
      // lap. Her right hand travels low from the packet to his palm resting open on his bundle and leaves the piece of brittle
      // there on 面 (0.27 s); his hand stays low, cupped, and closes after it; her left hand stays on the packet; her smile is a
      // small head tilt across 千 (0.93 s); his head lifts and turns a little toward her at 1.53 s. The boy is smaller (≈ 0.9,
      // narrower shoulders), cap brim low.
      pierBase(T); show(['shed', 'mig', 'trav', 'travBundle', 'parcelOpen', 'piece', 'crowd']);
      const BX = -0.78;
      bench68.position.set(BX + 0.06, 0, -0.1);
      lampRig(4, 3, 5, { k: 17, f: 8, aim: V3(BX, 0.75, -0.1) }); lights({ fill1: false, fill2: true, cone: 0.7 }); hemi.intensity = 0.3;
      key.position.set(0.0, LAMP_Y - 0.03, -0.45);
      fillB.color.set(0xffb27a); fillB.position.set(BX - 1.0, 0.42, -0.1); fillB.intensity = 0.55; fillB.distance = 3.2; // warm bounce off the wet planks
      sea.object3D.visible = false; // never in this frame (perf)
      setCrowd({ t: tl + 30, D: 2.1, speed: 0.8, farD: 2.5, queue: false, waits: false, keep: (x, z) => !(x < BX + 2.0 && x > BX - 5.5 && z > -2.2 && z < 1.8) });
      mig.materials.hair && (mig.materials.hair.roughness = 0.9);
      mig.root.position.set(BX, 0, -0.42); mig.root.rotation.set(0, -Math.PI / 2 + 0.42, 0);
      mig.pose('sit_chair', { seat: 0.45, feet: 0.06, lean: 0.24, hands: 'none' });
      mig.bone('spine').rotateY(0.14); mig.bone('chest').rotateY(0.12); mig.breathe(T, 1);
      trav.root.position.set(BX + 0.05, 0, 0.3); trav.root.rotation.set(0, -Math.PI / 2 - 0.36, 0); trav.root.scale.set(0.84, 0.9, 0.9);
      trav.pose('sit_chair', { seat: 0.45 / 0.9, feet: 0.04, lean: 0.34, hands: 'none' }); trav.breathe(T + 0.7, 1.3);
      mig.root.updateMatrixWorld(true); trav.root.updateMatrixWorld(true);
      // the open parcel on her lap, her left hand on it
      const lap = mig.root.localToWorld(V3(0.05, 0.6, 0.22));
      parcelOpen.position.copy(lap); parcelOpen.rotation.set(0, mig.root.rotation.y, 0); parcelOpen.rotateX(0.28);
      mig.reach('L', lap.clone().add(V3(0, 0.04, 0)).add(herDir(0.07, 0, -0.06)), { palm: DOWN, fingers: herDir(-0.4, 0, 1) }); migHandL.pose('relaxed', { curl: 0.65 });
      // his bundle on his knees; his right palm rests open on its top, toward her
      const bun = trav.root.localToWorld(V3(0.02, 0.6, 0.2)); travBundle.position.copy(bun); travBundle.rotation.set(0, trav.root.rotation.y, 0); travBundle.scale.setScalar(0.9);
      const toHer = mig.worldPos('chest').sub(trav.worldPos('chest')).setY(0).normalize();
      const palmP = bun.clone().add(V3(0, 0.12, 0)).addScaledVector(toHer, 0.07).add(V3(-0.04, 0, 0));
      const fist = ease.inOutSine(clamp((tl - 0.34) / 0.5));
      const fDir = V3(-1, -0.08, 0.3).normalize(); // fingers toward the lens, a little away from her: the open palm faces up on the bundle
      trav.reach('R', palmP.clone().addScaledVector(fDir, -0.075).add(V3(0, -0.012, 0)), { palm: V3(0, 1, 0), fingers: fDir, elbowOut: 0.1 });
      trav.hands.R.setChannels(blendHandChannels(handPose('cupped', {}, trav.hands.R.dims), handPose('relaxed', { curl: 1.0 }, trav.hands.R.dims), fist * 0.8));
      trav.reach('L', bun.clone().add(V3(0.04, 0.05, 0.12)), { palm: V3(0, -0.4, -1), fingers: V3(-0.6, -0.5, -0.5) });
      trav.root.updateMatrixWorld(true);
      const boyPalm = trav.hands.R.sockets.palm.getWorldPosition(V3());
      // her right hand: low, from the packet to just above his palm (mid-move at the cut), back to the packet from 0.5 s
      const give = ease.outCubic(clamp(0.5 + tl / 0.27 * 0.5)), back = ease.inOutSine(clamp((tl - 0.5) / 0.85));
      const over = boyPalm.clone().addScaledVector(toHer, 0.035).add(V3(0, 0.045, 0));
      const startP = lap.clone().add(V3(0, 0.06, 0)), arc = 0.025 * Math.sin(Math.PI * give) * (1 - back);
      const handP = startP.clone().lerp(over, give).lerp(lap.clone().add(V3(0.0, 0.07, 0)), back).add(V3(0, arc, 0));
      mig.reach('R', handP, { palm: V3(0, -1, 0).addScaledVector(toHer, -0.35).normalize(), fingers: toHer.clone().negate().add(V3(0, -0.45, 0)).normalize(), elbowOut: 0.15 });
      migHandR.pose(tl < 0.3 ? 'pinch' : 'relaxed', { curl: 0.55 });
      mig.root.updateMatrixWorld(true);
      const pin = migHandR.sockets.pinch.getWorldPosition(V3());
      const drop = ease.inCubic(clamp((tl - 0.21) / 0.07));
      piece.position.copy(pin.add(V3(0, -0.007, 0)).lerp(boyPalm.clone().add(V3(0, 0.011, 0)), drop)); piece.rotation.set(0, 0.4, 0);
      if (window.__PW) window.__PW.s68 = { pin, boyPalm, over };
      // looks: 3/4 profiles toward each other — she at him (her smile a small head tilt across 千), he at the sweet, then toward her
      mig.lookAt(trav.eye().lerp(boyPalm, 0.45 * (1 - back)), 0.9);
      const smile = Math.sin(clamp((tl - 0.82) / 0.7) * Math.PI);
      mig.bone('head').rotateZ(-0.09 * smile); mig.bone('head').rotateX(0.05 * smile);
      const rel = ease.inOutSine(clamp((tl - 1.45) / 0.5));
      trav.lookAt(boyPalm.clone().lerp(mig.eye(), 0.6 * rel), 0.95);
      trav.bone('head').rotateX(0.1 * (1 - 0.5 * rel)); trav.bone('head').rotateZ(0.05 * rel); // cap brim low over his eyes
      // MS 50 mm locked, framed at chest height: faces in the top third, the hands and the sweet at lap height (frame y ≈ 0.66)
      const mid = mig.worldPos('chest').lerp(trav.worldPos('chest'), 0.5); mid.y = 0.84;
      aimAt(V3(BX - 3.15, 0.98, mid.z + 0.05), mid, 0.5, 0.45, 50);
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, palmP), fstop: 2.8, maxCoc: 1.6 }, exposure: 1.1 };
    },
    // ---- S076  OUTRO 235.54–237.08: dawn on the steamer's rail, MCU 100 mm locked; her right profile looks screen-right as a new
    //      coastline emerges from the mist (236.4 → 0.86 s); light from screen-right; dissolve-aligned eye (0.33, 0.40) with S075
    S076(tl, u, T) {
      show(['mig', 'deck', 'caseCarry']); lights({ sky: true });
      sky.object3D.renderOrder = -1000; // far coast at 3.2 km: the dome must draw first (its far-plane depth ties with the land)
      // (integration) still the blue hour before dawn (QA: a warm, high-key morning here pre-empted the film's last image and the
      // cut to S077 jumped 1.3 stops back into night): blue-grey P20 haze, only a thin cool-peach band low at screen right; she is a
      // profile in mist like S075 — the face plane ≈ 1 stop under the haze, the light from screen right a soft edge on her profile
      fog.density = 0.0005; fog.color.setRGB(0.3, 0.34, 0.41);
      sky.blend('predawn', 'dawn', 0.12, { sunAz: 34, sunElev: -3.0, moonAz: -120, moonElev: 8, cloudCover: 0.4 }); sky.update(T);
      for (const l of lamps) l.glow.set(0);
      lid.rotation.x = 0;
      key.position.set(60, DECK_Y + 4, -18); key.target.position.set(0, DECK_Y + 1.3, 0); key.target.updateMatrixWorld(); key.color.set(0xd9b6a6); key.intensity = 5200; key.angle = 0.06; key.distance = 0;
      fillB.intensity = 0;
      skyLight.position.set(-20, 30, 10); skyLight.target.position.set(0, DECK_Y, 0); skyLight.color.set(0x7d92b8); skyLight.intensity = 0.32;
      hemi.color.set(0x6b7fa3); hemi.groundColor.set(0x2c2a2c); hemi.intensity = 0.4;
      mig.root.position.set(0, DECK_Y, -0.02); mig.root.rotation.set(0, Math.PI / 2 - 0.08, 0);
      mig.pose('stand', { weight: -0.3 }); mig.breathe(T, 1.1);
      mig.reach('L', V3(0.13, DECK_Y + 1.135, -0.37), { palm: DOWN, fingers: V3(0.75, -0.1, -0.6) }); migHandL.pose('relaxed', { curl: 0.85 }); // elbow bent, the hand on the rail near her body
      mig.reach('R', mig.root.localToWorld(V3(-0.2, 0.74, 0.03)), { palm: herDir(1, 0, 0), fingers: V3(0, -1, 0.05) }); migHandR.pose('rattan'); hangCase();
      mig.lookAt(V3(500, DECK_Y + 1.6, -110), 1);
      const e = mig.eye();
      const haze = 0.97 - 0.27 * ease.inOutSine(clamp((tl - 0.45) / 0.85));
      coast.land.material.uniforms.uCoastHaze.value = haze; coast.update(T);
      mist.update(T, { opacity: 0.22 - 0.1 * ease.inOutSine(clamp((tl - 0.45) / 0.85)) });
      camera.far = 6000;
      // level camera (horizon ≈ 0.5), trucked so her eye sits on S075's end eye (0.33, 0.40) — the dissolve anchor
      cam.place(camera, [e.x + 0.231, e.y - 0.072, e.z + 4.0], [e.x + 0.231, e.y - 0.072 + 0.012, e.z]); cam.lens(camera, 100);
      // cool pre-dawn fill from the open sky behind the camera: the white rail reads white, the face's sockets are not holes
      fillA.visible = true; fillA.color.set(0x98a9c9); fillA.position.copy(camera.position).add(V3(-0.6, 0.5, 0)); fillA.intensity = 5; fillA.distance = 0;
      return { ...MIG_POST, temp: -0.1, saturation: 0.8, contrast: 1.04, dof: { focus: cam.distTo(camera, e), fstop: 2.8 }, exposure: 0.78, bloom: { strength: 0.3, radius: 0.6, threshold: 0.85 } };
    },
    // ---- view_pier (nested: G3c pane S024, corridor P3 S066): MS of her on the crate under the third lamp, letter on the case
    view_pier(tl, u, T) {
      pierBase(T); sea.object3D.visible = false; // the sea is never in this frame (its projected grid alone cost ≈ 0.75 CPU-s)
      seatHer();
      lampRig(2, 1, 3, { k: 18, f: 8, aim: herLocal(0, 0.6, 0.2) }); lights({ fill1: false }); lidBounce(0.35); // (review) brighter + bounce: it reads through hazy vitrine glass
      setCrowd({ t: clamp(tl, 0, 10), D: 10, speed: 0.8, waits: false, farD: 6, keep: (x, z) => !(x > SEAT.x - 6 && x < SEAT.x + 1.8 && z > -2.75 && z < 2.2) });
      foldLetter(0, 0, 0);
      placeLetter(0.02, 0.235, 0.0);
      const fwd = herDir(0, 0, 1);
      mig.breathe(T, 1);
      const s = 0.5 + 0.5 * Math.sin(T * 0.7);
      handAt('R', letterPt(0.05 - 0.03 * s, 0.003, 0.06 - 0.08 * s), fwd, ['flat', { spread: 0.15 }], 0.026);
      handAt('L', herLocal(0.2, LID_Y, 0.25), fwd, ['relaxed', { curl: 0.6 }], 0.03);
      mig.lookAt(letterPt(0.02, 0, 0), 0.6);
      const tgt = herLocal(0.0, 0.95, 0.15);
      cam.place(camera, tgt.clone().addScaledVector(herDir(-0.12, 0, 1), 3.1).add(V3(0, 0.3, 0)), tgt); cam.lens(camera, 50);
      cam.handheld(camera, T, 0.15, 4);
      return { ...MIG_POST, dof: null, exposure: 1.05 };
    },
  };
  // debug overview cameras (out/check/pier_waiting/dbg_shots.json)
  const dbg = (pos, tgt, mm, dusk) => (tl, u, T) => { pierBase(T, dusk); seatHer(); lampRig(2, 1, 3); setCrowd({ t: tl, D: 1, keep: keepSeat }); foldLetter(0, 0, 0); placeLetter(0.055, 0.235); cam.place(camera, pos, tgt); cam.lens(camera, mm); return { ...MIG_POST, dof: null }; };
  setups.DBG_A = dbg([-23, 1.7, -1.0], [10, 1.2, 0.5], 24, true);
  setups.DBG_B = dbg([-6, 1.6, -6.5], [-6, 1.0, 10], 24, true);
  setups.DBG_C = dbg([-30, 9, -40], [5, 0, 10], 24, true);
  setups.DBG_D = dbg([-12.5, 1.25, -1.2], [10, 1.0, -0.6], 40, false);
  setups.DBG_E = (tl, u, T) => { const r = setups.S076(1.5, 1, 236.9); cam.lens(camera, 24); camera.position.y += 0.5; camera.lookAt(camera.position.x + 0.5, camera.position.y - 0.4, camera.position.z - 3); coast.land.material.uniforms.uCoastHaze.value = 0.0; return { ...r, dof: null }; };
  setups.default = setups.view_pier;
  // debug access for the review probe (out/check/pier_waiting/review/probe.mjs --eval); never used by the render path
  window.__PW = { stampImp: null, THREE, scene, camera, mig, elder, trav, clothTri, cols, letterPt, migHandL, migHandR, elderHand, migFreeL, migFreeR, clerkR, clerkL, caseG, caseCarry, letter, comb, parcel, parcelOpen, piece, steamer, crowd, key, fillA, fillB, skyLight, hemi,
    getStamp: () => stampImp, proj: (v) => { const p = v.clone().project(camera); return [+(0.5 + 0.5 * p.x).toFixed(3), +(0.5 - 0.5 * p.y).toFixed(3)]; } };

  return {
    scene, camera,
    post: { ...MIG_POST },
    setShot(shot, tl, u, T) {
      camera.far = 900; camera.near = 0.03;
      for (const k of ['head', 'hair', 'trousers', 'shoes', 'shoes.sole']) mig.setLayerVisible(k, true); dbgMark.visible = false; glassGlow.object3D.visible = false;
      for (const h of [migHandL, migHandR]) if (h.meshes.skinArm) h.meshes.skinArm.visible = true;
      key.color.set(BULB); key.angle = 0.62; key.distance = 14; skyLight.color.set(0x9fb2d2); hemi.color.set(0x2a3b5a); hemi.groundColor.set(0x2b2017);
      sky.object3D.renderOrder = 6; fog.density = 0.016; stampTool.scale.set(1, 1, 1);
      stampTool.position.set(0.3, 1.13, -0.33); gateL.rotation.y = Math.PI; gateR.rotation.y = 0; stampImp.visible = false; fillA.distance = fillB.distance = 11; // rest states (pure per frame)
      key.castShadow = true; fillA.visible = true; skyLight.visible = false; fillB.visible = false; sky.object3D.visible = sea.object3D.visible = true; steamer.visible = true;
      booth.visible = true; boothFill.visible = false; bench68.visible = true; bench68.position.set(0.66, 0, -0.1); trav.root.scale.set(1, 1, 1); travBundle.scale.setScalar(1); for (const L of lanterns) L.g.visible = false; steamer.position.set(58, 0, 0); steamer.rotation.set(0, 0, 0);
      key.shadow.normalBias = 0.004; fillA.color.set(BULB); fillB.color.set(BULB); hemi.intensity = 0.35; key.shadow.camera.far = 9; townM.color.setRGB(0.55, 0.55, 0.6);
      for (const l of lamps) { l.cone.object3D.visible = true; l.glow.object3D.visible = true; }
      const fn = setups[shot.id] || setups.default;
      crowdCfg = null;
      const p = fn(tl, u, T, shot) || {};
      if (crowdCfg) { crowdCfg._log = String(window.__PZ || '').includes('crowdlog'); applyCrowd(crowdCfg, camera); } else crowd.visible = false;
      if (p.noCones) for (const l of lamps) l.cone.object3D.visible = false;
      for (const l of lamps) { const dx = camera.position.x - l.x, dz = camera.position.z - LAMP_Z; if (dx * dx + dz * dz < 2.2 * 2.2 && camera.position.y < LAMP_Y) l.cone.object3D.visible = false; }
      const PZ = new Set([...PZ0, ...String(window.__PZ || '').split(',').filter(Boolean)]);
      if (PZ.size) {
        if (PZ.has('nocrowd')) crowd.visible = false;
        if (PZ.has('nosky2')) skyLight.visible = false;
        if (PZ.has('nofillA')) fillA.visible = false;
        if (PZ.has('noenv')) scene.environmentIntensity = 0; else scene.environmentIntensity = 0.9;
        if (PZ.has('nopools')) pools.visible = false; else pools.visible = true;
        if (PZ.has('noglow')) for (const l of lamps) l.glow.object3D.visible = false;
        if (PZ.has('noshadowmap')) key.shadow.mapSize.set(512, 512); else key.shadow.mapSize.set(1536, 1536);
        if (PZ.has('noshadow')) key.castShadow = false;
        if (PZ.has('nofig')) mig.root.visible = false;
        if (PZ.has('nohair')) mig.setLayerVisible('hair', false);
        if (PZ.has('noglass')) glassPane.visible = false; else glassPane.visible = true;
        if (PZ.has('nograin')) p.grain = 0;
        if (PZ.has('nosky')) sky.object3D.visible = false;
        if (PZ.has('nosea')) sea.object3D.visible = false;
        if (PZ.has('nocone')) for (const l of lamps) l.cone.object3D.visible = false;
        if (PZ.has('nodof')) p.dof = null;
        if (PZ.has('nofill')) { fillA.visible = fillB.visible = false; }
        if (PZ.has('noshed')) shed.visible = false;
        if (PZ.has('nosteamer')) steamer.visible = false;
      }
      if (PZ.has('dbgcam') && window.__PWcam) { // review probe: inspect contacts from another angle (pos/tgt relative to a named anchor)
        const c = window.__PWcam, A = c.anchor === 'letter' ? letter.getWorldPosition(V3()) : c.anchor === 'case' ? caseG.getWorldPosition(V3()) : c.anchor === 'mig' ? mig.eye() : V3();
        cam.place(camera, A.clone().add(V3(...c.pos)), A.clone().add(V3(...(c.tgt || [0, 0, 0])))); cam.lens(camera, c.mm || 50); p.dof = null;
      }
      camera.updateMatrixWorld(true);
      sea.update(T, camera);
      if (PZ.has('info')) { // one main-pass render to count calls / triangles (perf diagnostics only)
        const r = ctx.renderer, ai = r.info.autoReset; r.info.autoReset = false; r.info.reset();
        const rt = ctx.makeRT(64, 32); r.setRenderTarget(rt); r.render(scene, camera); r.setRenderTarget(null); rt.dispose();
        let vis = 0, tri = 0; const per = {};
        scene.traverseVisible((o) => { if (!o.isMesh) return; vis++; const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); tri += n; let top = o; while (top.parent && top.parent !== scene) top = top.parent; const k = top.name || top.type; per[k] = (per[k] || 0) + n; });
        let nc = 0, nct = 0; for (const b of buckets.values()) { nc += b.n; for (const im of b.ims) nct += im.count * (im.geometry.index ? im.geometry.index.count : 0) / 3; }
        console.log('PZINFO crowd people', nc / 1, 'crowdTris', Math.round(nct));
        console.log('PZINFO', shot.id, 'calls', r.info.render.calls, 'tris', r.info.render.triangles, 'programs', r.info.programs.length, 'visibleMeshes', vis, 'sceneTris', Math.round(tri), JSON.stringify(Object.fromEntries(Object.entries(per).map(([k, v]) => [k, Math.round(v)]))));
        r.info.autoReset = ai;
      }
      return p;
    },
  };
}
