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
import { makeHand, handPose, blendHandChannels } from '../lib/hand.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const BULB = 0xffbb7c;            // 2400 K enamel-shaded incandescent (warm cream)
const BULB_C = new THREE.Color(BULB);
const LAMP_X = [-20, -15, -10, -5, 0, 5, 10, 15, 20], LAMP_Z = -0.6, LAMP_Y = 3.32;
const RAIL_Z = -3.0, GATE_X = 8.0, BOOTH_Z = -1.9; // booth: in the cross railing between the long railing and the gate
const SEAT = { x: -9.55, z: -1.3, rot: -Math.PI / 2 + 0.28 };  // her upturned crate under the third lamp, facing home (−X)
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
    const townM = new THREE.MeshBasicMaterial({ map: townTex, color: new THREE.Color(0.55, 0.55, 0.6) });
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
    const glassM = new THREE.MeshStandardMaterial({ color: 0xdfe8ea, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide });
    glassPane = new THREE.Group(); booth.add(glassPane);
    for (const x of [-0.735, 0, 0.735]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.84), glassM); g.position.set(x, 1.65, 0); g.renderOrder = 30; glassPane.add(g); }
    // permit on the clerk's side of the glass, stamp impression decal, ink pad, stamp
    permit = mesh(new THREE.PlaneGeometry(0.24, 0.18), std({ map: permitMap, roughness: 0.85 }), booth, 0.02, 1.112, -0.2, false); permit.rotation.x = -Math.PI / 2; permit.rotation.z = 0.04;
    stampImp = mesh(new THREE.PlaneGeometry(0.044, 0.044), new THREE.MeshStandardMaterial({ map: stampMap, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), booth, 0.083, 1.1125, -0.15, false); stampImp.rotation.x = -Math.PI / 2; stampImp.rotation.z = 0.18;
    inkPad = new THREE.Group(); inkPad.position.set(0.3, 1.11, -0.33); booth.add(inkPad);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 24), std({ color: 0x3a3a3c, roughness: 0.35, metalness: 0.7 }), inkPad, 0, 0.009, 0);
    mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.004, 24), std({ color: 0x3c3150, roughness: 0.9 }), inkPad, 0, 0.019, 0);
    stampTool = new THREE.Group(); booth.add(stampTool);
    mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 24), brass, stampTool, 0, 0.006, 0);
    mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.05, 16), std({ color: 0x4E2E22, roughness: 0.45 }), stampTool, 0, 0.037, 0);
    mesh(new THREE.SphereGeometry(0.019, 16, 10), std({ color: 0x4E2E22, roughness: 0.45 }), stampTool, 0, 0.07, 0);
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
    const hullM = std({ color: 0x1C1C1E, roughness: 0.55, metalness: 0.2 });
    const whiteM = std({ color: 0xD9D6CC, roughness: 0.6 });
    const sh = new THREE.Shape();
    const L0 = -36, L1 = 56, B = 6.2;
    sh.moveTo(L0 + 4, -B); sh.lineTo(L1 - 18, -B); sh.quadraticCurveTo(L1 - 4, -B * 0.8, L1, 0); sh.quadraticCurveTo(L1 - 4, B * 0.8, L1 - 18, B); sh.lineTo(L0 + 4, B); sh.quadraticCurveTo(L0, B * 0.7, L0, 0); sh.quadraticCurveTo(L0, -B * 0.7, L0 + 4, -B);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: 8.6, bevelEnabled: false, curveSegments: 10 }); hg.rotateX(-Math.PI / 2); // shape y -> -z
    const HZ = 22.6;
    const hull = mesh(hg, hullM, steamer, 0, SEA_Y - 3.6, HZ, false);
    const sheer = mesh(boxG(L1 - L0 - 22, 0.16, 0.05), whiteM, steamer, (L0 + L1) / 2 - 6, SEA_Y + 4.85, HZ - B - 0.02, false);
    const portM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(2.4) });
    const darkPort = new THREE.MeshBasicMaterial({ color: 0x0a0b0d });
    const ports = [], dports = [], r = util.rng(5);
    for (let x = L0 + 8; x < L1 - 14; x += 1.9) for (const y of [SEA_Y + 2.1, SEA_Y + 3.7]) (r() < 0.7 ? ports : dports).push(M4(x, y, HZ - B - 0.03, Math.PI));
    instanced(new THREE.CircleGeometry(0.17, 12), portM, ports, steamer, false);
    instanced(new THREE.CircleGeometry(0.17, 12), darkPort, dports, steamer, false);
    const deckY = SEA_Y + 5.0;
    mesh(boxG(36, 2.6, 9.6), whiteM, steamer, 12, deckY + 1.3, HZ, false);
    mesh(boxG(24, 2.4, 8.0), whiteM, steamer, 13, deckY + 3.9, HZ, false);
    mesh(boxG(7, 2.0, 7.0), whiteM, steamer, 22, deckY + 6.1, HZ, false);
    const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.7, 0.4).multiplyScalar(0.9) });
    const wins = []; for (let x = -5; x < 30; x += 1.6) if (r() < 0.75) wins.push(M4(x, deckY + 1.5, HZ - 4.82, Math.PI));
    for (let x = 2; x < 25; x += 1.8) if (r() < 0.6) wins.push(M4(x, deckY + 4.0, HZ - 4.02, Math.PI));
    for (let x = 19; x < 25.5; x += 1.1) wins.push(M4(x, deckY + 6.3, HZ - 3.52, Math.PI));
    instanced(new THREE.PlaneGeometry(0.45, 0.4), winM, wins, steamer, false);
    // funnel: invented colours (ochre, slate band, black top), slight rake
    const fun = new THREE.Group(); fun.position.set(10, deckY + 5.1, HZ); fun.rotation.z = 0.07; steamer.add(fun);
    mesh(new THREE.CylinderGeometry(1.5, 1.6, 7.6, 24), std({ color: 0xB58B4A, roughness: 0.6 }), fun, 0, 3.8, 0, false);
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
    for (const x of [-10, 4, 16, 30]) { const gl = FX.glow({ color: 0xffc078, size: 1.4, intensity: 0.7 }); gl.object3D.position.set(x, deckY + 3, 16.0); steamer.add(gl.object3D); }
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
    for (let j = 0; j < C.length; j++) { for (let a = 0; a < 3; a++) P[j * 3 + a] /= C[j]; const l = Math.hypot(Nn[j * 3], Nn[j * 3 + 1], Nn[j * 3 + 2]) || 1; for (let a = 0; a < 3; a++) Nn[j * 3 + a] /= l; }
    const src = geo.index ? geo.index.array : null, m = src ? src.length : n, out = [];
    for (let t = 0; t < m; t += 3) { const a = remap[src ? src[t] : t], b = remap[src ? src[t + 1] : t + 1], c = remap[src ? src[t + 2] : t + 2]; if (a !== b && b !== c && a !== c) out.push(a, b, c); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setIndex(out);
    return g;
  }
  // ================================================================ CROWD (instanced baked extras; walk-phase buckets)
  const crowd = new THREE.Group(); crowd.name = 'crowd'; shed.add(crowd);
  const CROWD_POSES = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'stand', 'standB', 'sit'];
  const NVAR = 6, CAP = 24;
  const buckets = new Map();
  const plainCache = new Map();
  const plainOf = (m) => { // soft-focus extras: plain lit colour instead of the procedural cloth / skin shaders
    if (!plainCache.has(m)) plainCache.set(m, new THREE.MeshLambertMaterial({ color: (m.color || new THREE.Color(0x777777)).clone().multiplyScalar(0.92) }));
    return plainCache.get(m);
  };
  const crowdMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  await preloadCrowd('migrant', {});
  {
    for (let v = 0; v < NVAR; v++) {
      const f = makeExtra('migrant', 101 + v, { lod: 'lo' });
      for (const p of CROWD_POSES) {
        if (p[0] === 'w') f.pose('walk', { phase: +p[1] / 6, stride: 0.9 });
        else if (p === 'sit') f.pose('sit_bench', { seat: 0.44, hands: 'lap' });
        else f.pose('stand', { weight: p === 'standB' ? 0.7 : -0.4 });
        const baked = f.bake();
        // one vertex-coloured geometry per baked pose (plain colours: the crowd is always soft, small or fogged) → 1 draw call per bucket
        const merged = (far) => mergeGeometries(baked.children.map((part) => {
          const g0 = far ? clusterDecimate(part.geometry, 0.028) : part.geometry, g = new THREE.BufferGeometry();
          g.setAttribute('position', g0.attributes.position); g.setAttribute('normal', g0.attributes.normal); g.setIndex(g0.index);
          const c = (part.material.color || new THREE.Color(0x777777)).clone().multiplyScalar(0.92), n = g0.attributes.position.count, col = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
        }));
        const mk = (geo) => { const im = new THREE.InstancedMesh(geo, crowdMat, CAP); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.count = 0; im.visible = false; crowd.add(im); return im; };
        buckets.set(v + '|' + p, { ims: [mk(merged(false))], n: 0 });
        buckets.set(v + '|' + p + '|far', { ims: [mk(merged(true))], n: 0 });
      }
    }
  }
  const luggage = {
    case: new THREE.InstancedMesh(boxG(0.5, 0.33, 0.17).translate(0, 0.0, 0), caseM, 64),
    bundle: new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8).scale(1.1, 0.8, 0.9), bundleM, 64),
  };
  for (const im of Object.values(luggage)) { im.frustumCulled = false; im.count = 0; im.castShadow = false; crowd.add(im); }
  // population (fixed; per shot filtered and timed)
  const POP = [];
  {
    const r = util.rng(2024);
    const lanes = [-2.42, -1.75, 0.35, 1.25, 2.3, 3.3, 4.3, 5.4];
    for (let i = 0; i < 44; i++) POP.push({ kind: 'walk', v: i % NVAR, z: lanes[i % lanes.length] + (r() - 0.5) * 0.4, f: r(), sp: 0.95 + r() * 0.4, ph: r(), lug: r() < 0.7 ? (r() < 0.6 ? 'case' : 'bundle') : null, s: 0.97 + r() * 0.06 });
    for (let i = 0; i < 30; i++) POP.push({ kind: 'family', v: (i * 5) % NVAR, x: -23 + r() * 30, z: -3.45 - r() * 3.6, rot: 0.2 + (r() - 0.5) * 1.6, pose: r() < 0.5 ? 'stand' : 'standB', s: 0.96 + r() * 0.08 });
    for (let i = 0; i < 26; i++) POP.push({ kind: 'wait', v: (i * 7) % NVAR, x: -23 + r() * 30.5, z: -1.8 + r() * 8.2, rot: r() * 6.28, pose: r() < 0.25 ? 'sit' : r() < 0.5 ? 'stand' : 'standB', lug: r() < 0.6 ? 'case' : null, s: 0.96 + r() * 0.08 });
    for (let i = 0; i < 10; i++) POP.push({ kind: 'queue', v: (i * 4 + 1) % NVAR, x: GATE_X - 0.6 - (i % 5) * 0.75 - r() * 0.2, z: -2.2 + Math.floor(i / 5) * 0.7 + 1.0 + r() * 0.3, rot: Math.PI / 2 + (r() - 0.5) * 0.4, pose: r() < 0.5 ? 'stand' : 'standB', lug: 'case', s: 0.97 + r() * 0.06 });
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
    const lug = { case: 0, bundle: 0 };
    const farD2 = (cfg.farD ?? 9) ** 2, cp = cameraObj ? cameraObj.position : null;
    const put = (v, pose, x, z, rot, s) => {
      if (!inView(x, z)) return;
      const far = cp && ((x - cp.x) ** 2 + (z - cp.z) ** 2) > farD2;
      const b = buckets.get(v + '|' + pose + (far ? '|far' : '')); if (!b || b.n >= CAP) return;
      _d.position.set(x, 0, z); _d.rotation.set(0, rot, 0); _d.scale.setScalar(s); _d.updateMatrix();
      for (const im of b.ims) im.setMatrixAt(b.n, _d.matrix); b.n++;
    };
    const putLug = (kind, x, y, z, rot) => { const im = luggage[kind]; if (!im || lug[kind] >= 64 || !inView(x, z)) return; _d.position.set(x, y, z); _d.rotation.set(0, rot, 0); _d.scale.setScalar(1); _d.updateMatrix(); im.setMatrixAt(lug[kind]++, _d.matrix); };
    const keep = cfg.keep || (() => true);
    const t = cfg.t || 0, D = cfg.D || 4, sp = cfg.speed ?? 1;
    for (const p of POP) {
      if (p.kind === 'walk') {
        if (cfg.walkers === false) continue;
        const v = p.sp * sp, xa = -24, xb = (cfg.gateOpen ? 20 : GATE_X - 1.2) - v * D;
        const x = xa + p.f * (xb - xa) + v * t;
        if (!keep(x, p.z)) continue;
        const stride = 1.1 * p.s, ph = (((p.ph + x / stride) % 1) + 1) % 1;
        put(p.v, 'w' + (Math.floor(ph * 6) % 6), x, p.z, Math.PI / 2, p.s);
        if (p.lug) putLug(p.lug, x + 0.02, p.lug === 'case' ? 0.42 : 0.5, p.z + 0.27, Math.PI / 2);
      } else {
        if (p.kind === 'family' && cfg.families === false) continue;
        if (p.kind === 'wait' && cfg.waits === false) continue;
        if (p.kind === 'queue' && cfg.queue === false) continue;
        let x = p.x, z = p.z;
        if (p.kind === 'queue' && cfg.gateOpen) x += cfg.gateOpen * 3.5;
        if (!keep(x, z)) continue;
        put(p.v, p.pose, x, z, p.rot, p.s);
        if (p.lug) putLug(p.lug, x + Math.cos(p.rot) * 0.32, p.lug === 'case' ? 0.17 : 0.14, z - Math.sin(p.rot) * 0.32, p.rot + 0.3);
      }
    }
    for (const w of cfg.extra || []) { // shot-specific walkers (crossing the frame during the shot)
      const x = w.x0 + w.v * t, stride = 1.1, ph = (((w.ph || 0) + x / stride) % 1 + 1) % 1;
      put(w.vi ?? 0, 'w' + (Math.floor(ph * 6) % 6), x, w.z, w.rot ?? Math.PI / 2, w.s || 1);
      if (w.lug) putLug(w.lug, x + 0.02, w.lug === 'case' ? 0.42 : 0.5, w.z + 0.27, Math.PI / 2);
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
  }

  // ---------------------------------------------------------------- PROP_CASE (58×38×21 cm), lid hinged at the back, 蓝印花布 lining
  // local frame: origin = bottom centre, +Z = front (handle side), hinge along the back top edge (z −0.19, y 0.16)
  const caseG = new THREE.Group(); scene.add(caseG);
  const lid = new THREE.Group(); lid.position.set(0, 0.16, -0.19); caseG.add(lid);
  const lining = std({ map: liningMap, roughness: 0.9 }); liningMap.repeat.set(1.6, 1.6);
  const leather = std({ color: 0x6A4A30, roughness: 0.55 });
  const buckleM = TX.mat('brass', { tex: { tone: 'then', patina: 0.2, polish: 0.7 }, roughness: 1, metalness: 1, envMapIntensity: 1.8, color: 0xc9b089 });
  const caseR = TX.mat('rattan', { repeat: [3, 1], tex: { seed: 13, age: 0.35 } });
  const caseRtop = TX.mat('rattan', { repeat: [3, 2], tex: { seed: 13, age: 0.35 } });
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
  const shirtM = TX.mat('shirt', { repeat: [3.2, 2.4], tex: { seed: 21, creases: 0.0 }, color: new THREE.Color(1.02, 1.1, 1.24) });
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
    // collar (patched, #55667A): a flat stand-collar band round the neck opening, near the top edge, left of centre
    const cpts = []; for (let k = 0; k <= 24; k++) { const a = Math.PI * (k / 24); cpts.push(V3(-0.06 + Math.cos(a) * 0.05, 0.0, -0.075 + Math.sin(a) * 0.028 * -1)); }
    const collar = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts), 32, 0.0075, 8, false), std({ color: 0x66788c, roughness: 0.85 }), shirtG, 0, 0.034, 0, false); collar.scale.y = 0.8;
    const neck = mesh(new THREE.CircleGeometry(0.044, 24, 0, Math.PI), std({ color: 0x5f6f80, roughness: 0.95 }), shirtG, -0.06, 0.0322, -0.075, false); neck.rotation.x = -Math.PI / 2; neck.scale.set(1, 0.6, 1);
    // placket down the centre front with cloth knot buttons
    mesh(boxG(0.016, 0.002, 0.15), seam, shirtG, -0.06, 0.033, 0.03, false);
    for (let k = 0; k < 4; k++) { const b = mesh(new THREE.SphereGeometry(0.0042, 8, 6), dark, shirtG, -0.06, 0.035, -0.035 + k * 0.037, false); b.scale.y = 0.6; }
    // raised soft ridges: the sleeves folded back underneath, the body folded in half (cloth rolls on the top face)
    const ridge = (x0, z0, x1, z1, r = 0.0045) => { const c = new THREE.CatmullRomCurve3([V3(x0, 0, z0), V3((x0 + x1) / 2, 0.0015, (z0 + z1) / 2), V3(x1, 0, z1)]); const m = mesh(new THREE.TubeGeometry(c, 12, r, 8, false), shirtM, shirtG, 0, 0.031, 0, false); m.scale.y = 0.55; return m; };
    ridge(-0.14, -0.035, -0.095, -0.085); ridge(-0.02, -0.088, 0.03, -0.03); ridge(-0.145, 0.05, 0.03, 0.065, 0.0035);
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
    const b = mesh(new THREE.SphereGeometry(0.05, 18, 12), cm, comb, 0, 0.012, 0); b.scale.set(1.1, 0.26, 0.62);
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
  const clothTri = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.042, 0), new THREE.Vector2(0.0, 0.034)])), std({ map: shirtM.map, normalMap: shirtM.normalMap, color: 0xa8b4c2, roughness: 0.9, side: THREE.DoubleSide }), cols.R.g, 0.012, 0.0024, 0.022, false);
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
  function seatHer({ x = SEAT.x, z = SEAT.z, rot = SEAT.rot } = {}) {
    mig.root.position.set(x, 0, z); mig.root.rotation.set(0, rot, 0);
    crate.position.set(x - Math.sin(rot) * 0.06, 0, z - Math.cos(rot) * 0.06); crate.rotation.y = rot;
    mig.pose('sit_chair', { seat: 0.43, feet: 0.06, lean: 0.12, hands: 'none' });
    // case across the thighs, handle toward her body (case +Z → her −Z)
    caseG.position.copy(mig.root.localToWorld(V3(0, 0.565, 0.25))); caseG.rotation.set(0, rot + Math.PI, 0);
    caseG.updateMatrixWorld(true); mig.root.updateMatrixWorld(true);
  }
  const herLocal = (x, y, z) => mig.root.localToWorld(V3(x, y, z));
  const hideLegs = () => { for (const k of ['trousers', 'shoes', 'shoes.sole']) mig.setLayerVisible(k, false); }; // legs hidden by the case / below frame
  const headCentre = (fig) => { const hb = fig.worldPos('head'), e = fig.eye(); return hb.lerp(e, 0.5).add(V3(0, 0.025, 0)); };
  const herDir = (x, y, z) => V3(x, y, z).applyQuaternion(mig.root.quaternion).normalize();
  // lid top in her local frame: y = 0.565 + 0.21; the lid's camera-facing (hinge) edge at her local z = 0.25 + 0.19
  const LID_Y = 0.565 + 0.21 + 0.0015, LID_FRONT_Z = 0.25 + 0.19;
  function placeLetter(lx, lz, rotExtra = 0) { // letter centre in her local frame (on the lid), page top toward the camera (her +Z)
    letter.position.copy(herLocal(lx, LID_Y, lz)); letter.rotation.set(0, mig.root.rotation.y + Math.PI + rotExtra, 0); letter.updateMatrixWorld(true);
  }
  // hand helpers: pinch / press at a world point, palm down, fingers along `fwd`
  const DOWN = V3(0, -1, 0);
  function handAt(side, pt, fwd, pose, lift = 0.03, back = 0.085) {
    const h = side === 'L' ? migHandL : migHandR;
    const w = pt.clone().addScaledVector(fwd, -back).add(V3(0, lift, 0));
    mig.reach(side, w, { palm: DOWN, fingers: fwd.clone().add(V3(0, -0.25, 0)).normalize(), elbowOut: 0.3 });
    if (pose) h.pose(pose[0], pose[1] || {});
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
    }
    for (const a of Object.values(elder.accessories || {})) if (a) a.visible = false;
  }
  // elder's close-up right hand (bible 5.5a: knuckly, soft-skinned back, deep-blue cotton cuff #2E3A52), + a sleeve
  const elderHand = makeHand({ side: 'R', lod: 'close', sex: 'f', age: 0.88, skin: 0xC99A78, width: 1.04, thick: 1.06, length: 0.172, forearmLen: 0.14,
    cuffs: [{ style: 'band', color: 0x2E3A52, fabric: 'cotton', radius: 0.043, edge: 0.03, len: 0.08 }] });
  scene.add(elderHand.root);
  const elderSleeve = mesh(new THREE.CylinderGeometry(0.049, 0.058, 0.56, 16, 1, true), std({ color: 0x2E3A52, roughness: 0.9, side: THREE.DoubleSide }), elderHand.byName.forearm || elderHand.root, 0, 0.33, 0);

  // ---------------------------------------------------------------- free close-up hands for the inserts (S034, S039)
  const migFreeL = await loadCharacterHand('MIGRANT', 'L', { lod: 'close', hand: { forearmLen: 0.2 } });
  const migFreeR = await loadCharacterHand('MIGRANT', 'R', { lod: 'close', hand: { forearmLen: 0.2 } });
  const floralM = TX.mat('floral', { repeat: [0.5, 0.5], tex: { ground: [143, 161, 179], seed: 11 } });
  for (const h of [migFreeL, migFreeR]) { scene.add(h.root); const sl = mesh(new THREE.CylinderGeometry(0.047, 0.052, 0.34, 18, 1, true), std({ map: floralM.map, normalMap: floralM.normalMap, roughness: 0.9, side: THREE.DoubleSide }), h.byName.forearm || h.root, 0, 0.32, 0); sl.name = 'sleeve'; }
  // clerk's hands (invented khaki-grey uniform cuff, no insignia)
  const khaki = 0x8A8670;
  const clerkR = makeHand({ side: 'R', lod: 'close', sex: 'm', age: 0.45, skin: 0xC69C7C, forearmLen: 0.14, cuffs: [{ style: 'band', color: khaki, fabric: 'cotton', radius: 0.046, edge: 0.03, len: 0.07 }] });
  const clerkL = makeHand({ side: 'L', lod: 'close', sex: 'm', age: 0.45, skin: 0xC69C7C, forearmLen: 0.14, cuffs: [{ style: 'band', color: khaki, fabric: 'cotton', radius: 0.046, edge: 0.03, len: 0.07 }] });
  for (const h of [clerkR, clerkL]) { scene.add(h.root); mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.55, 16, 1, true), std({ color: khaki, roughness: 0.85, side: THREE.DoubleSide }), h.byName.forearm || h.root, 0, 0.4, 0); }
  // the stamp in the clerk's right hand (grip socket: +Y = handle axis across the palm)
  const stampHolder = new THREE.Group(); clerkR.hold(stampHolder, 'grip');
  // ---------------------------------------------------------------- the nervous young traveller (CH3, S068)
  const trav = await loadCharacter('TRAVELLER', { lod: 'hi' });
  scene.add(trav.root);
  const travBundle = mesh(new THREE.SphereGeometry(0.16, 16, 12), TX.mat('cotton', { repeat: [0.6, 0.6], tex: { tone: [88, 98, 112], seed: 8 } }), scene, 0, 0, 0); travBundle.scale.set(1.2, 0.85, 0.8);
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
  const brittleM = TX.mat('cotton', { repeat: [0.3, 0.3], tex: { tone: [200, 150, 79], seed: 44, creases: 0 }, roughness: 0.6 });
  const redM = std({ color: 0xA33A2E, roughness: 0.7 });
  function makeParcel(open = false) {
    const g = new THREE.Group();
    if (!open) {
      mesh(new RoundedBoxGeometry(0.1, 0.026, 0.08, 3, 0.007), oilM, g, 0, 0.013, 0, false);
      mesh(boxG(0.102, 0.003, 0.004), redM, g, 0, 0.027, 0); mesh(boxG(0.004, 0.003, 0.082), redM, g, 0, 0.027, 0);
      mesh(boxG(0.004, 0.026, 0.084), redM, g, 0.051, 0.013, 0, false); mesh(boxG(0.104, 0.026, 0.004), redM, g, 0, 0.013, 0.041, false);
      const k = mesh(new THREE.SphereGeometry(0.005, 8, 6), redM, g, 0, 0.03, 0); k.scale.set(1.3, 0.7, 1);
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
    cc.position.copy(V3(0, 0.13, 0.22).applyQuaternion(cc.quaternion).negate()); caseCarry.add(cc); }
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
  function letterCam(v, T, dEnd = 2.05) {
    // square to the case (the lid edge stays a horizontal line); 75 mm push from her face+hands to the hands
    const E = herLocal(0, LID_Y, LID_FRONT_Z), fwd = herDir(0, 0, 1), up = V3(0, 1, 0);
    const d = lerp(3.05, dEnd, v), h = lerp(0.66, 0.43 * dEnd / 2.05, v);
    const aim = lerp(0.23, d * 0.035, v);
    cam.place(camera, E.clone().addScaledVector(fwd, d).addScaledVector(up, h), E.clone().addScaledVector(up, aim)); cam.lens(camera, 75);
  }
  function pierBase(T, dusk = false) {
    show(['shed', 'mig', 'crate', 'caseG', 'letter', 'crowd']);
    (dusk ? duskSky : nightSky)(T);
    skyLight.position.set(30, 6, 3); skyLight.target.position.set(0, 0, 0); skyLight.intensity = dusk ? 0.45 : 0.2;
    hemi.intensity = dusk ? 0.4 : 0.28;
    for (const l of lamps) { l.glow.set(0.5); l.cone.update(T, { intensity: 0.05 }); }
    lid.rotation.x = 0; shirtG.visible = false; clothTri.visible = false;
  }
  // crowd keep-out around her and the camera axis for the S020/S032/S043 set-ups
  const keepSeat = (x, z) => !(x > SEAT.x - 4.2 && x < SEAT.x + 2.2 && z > -2.6 && z < 0.9);

  const glassGlow = FX.glow({ color: BULB, size: 0.07, intensity: 0.35, falloff: 2.0 }); glassGlow.object3D.visible = false; scene.add(glassGlow.object3D);
  const dbgMark = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 })); dbgMark.visible = false; glassGlow.object3D.visible = false; scene.add(dbgMark);
  const setups = {
    // ---- S020  CH1 75.04–77.04: refolds the letter (thirds, then half) and presses it flat; T10 line at y 0.66 → S021
    S020(tl, u, T) {
      pierBase(T);
      seatHer(); hideLegs();
      lampRig(2, 1, 3, { k: 15, f: 8, aim: herLocal(0.05, 0.6, 0.3) }); lights({ fill1: false });
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
      if (tl < 0.42) { const k = ease.outCubic(clamp(tl / 0.4)); rp = letterPt(0.05, 0, R3 * 1.45).add(V3(0, (1 - k) * 0.12, 0)); rpose = ['relaxed', { curl: lerp(0.5, 0.8, k) }]; }
      else if (tl < 0.66) { rp = new THREE.Vector3().setFromMatrixPosition(cols.R.bot.matrixWorld).add(V3(0, 0, 0)); const e = cols.R.bot.localToWorld(V3(0.045, 0, R3 * 0.95)); rp = e; }
      else if (tl < 0.9) { const e = cols.R.top.localToWorld(V3(0.045, 0, -R3 * 0.95)); const k = clamp((tl - 0.66) / 0.08); rp = e.lerp(letterPt(0.045, 0, R3 * 0.4), 1 - k); }
      else if (tl < 1.5) { rp = letterPt(0.05, 0.004, -R3 * 0.15); rpose = ['flat', { spread: 0.1 }]; rlift = 0.026; }
      else { const k = ease.inOutSine(clamp((tl - 1.5) / 0.12)); rp = letterPt(0.042, 0.004, 0.0); rpose = ['flat', { spread: 0.25 }]; rlift = lerp(0.03, 0.021, k); }
      handAt('R', rp, fwd, rpose, rlift);
      // left hand (screen-right): rests on the lid; folds the left half over 0.9–1.18; back to rest
      let lp, lpose = ['relaxed', { curl: 0.6 }], llift = 0.03;
      if (tl < 0.86 || tl > 1.3) lp = herLocal(0.2, LID_Y, 0.25);
      else if (tl < 1.18) { lp = cols.L.g.localToWorld(V3(-0.07, 0, 0.0)); lpose = ['pinch']; llift = 0.028; }
      else { const k = clamp((tl - 1.18) / 0.12); lp = letterPt(-0.02, 0.004, 0).lerp(herLocal(0.2, LID_Y, 0.25), k); }
      handAt('L', lp, fwd.clone().add(herDir(0.25, 0, 0)).normalize(), lpose, llift);
      mig.lookAt(letterPt(0.03, 0, 0), 0.9);
      letterCam(ease.inOutSine(clamp(tl / 1.85)), T);
      const f = cam.distTo(camera, letterPt(0.04, 0, 0));
      return { ...MIG_POST, dof: { focus: f, fstop: 2.4 }, exposure: 1.05 };
    },
    // ---- S043  CH2 139.88–142.21: same set-up; opens the last half fold, the triangle of the old shirt inside; thumb; refolds; press
    S043(tl, u, T) {
      pierBase(T);
      seatHer(); hideLegs();
      lampRig(2, 1, 3, { k: 15, f: 8, aim: herLocal(0.05, 0.6, 0.3) }); lights({ fill1: false });
      setCrowd({ t: tl + 7, D: 2.5, speed: 0.9, keep: keepSeat, farD: 5 });
      clothTri.visible = true;
      // 0–0.35 open the half fold; hold; 1.30 thumb stroke; 1.5–1.9 close; 1.93 press
      const open = ease.outCubic(clamp(tl / 0.35)) * (1 - ease.inOutSine(clamp((tl - 1.5) / 0.4)));
      const a3 = Math.PI * (1 - 0.86 * open);
      foldLetter(Math.PI, Math.PI, a3);
      placeLetter(0.055, LID_FRONT_Z - R3 / 2 - 0.002, 0.0);
      const fwd = herDir(0, 0, 1);
      mig.breathe(T, 0.8);
      // left hand lifts/holds the opened half; right thumb strokes the cloth at 1.30
      const lp = cols.L.g.localToWorld(V3(-0.07, 0, 0.0));
      handAt('L', lp, fwd.clone().add(herDir(0.3, 0, 0)).normalize(), ['pinch'], 0.03);
      let rp, rpose;
      if (tl < 1.9) { const st = Math.sin(clamp((tl - 1.2) / 0.32) * Math.PI); rp = letterPt(0.135 - 0.1 * st, 0.003, 0.02 - 0.012 * st); rpose = st > 0.05 ? ['touch'] : ['relaxed', { curl: 0.7 }]; }
      else { rp = letterPt(0.042, 0.004, 0.0); rpose = ['flat', { spread: 0.25 }]; }
      handAt('R', rp, fwd, rpose, tl < 1.9 ? 0.04 : 0.022);
      mig.lookAt(letterPt(0.03, 0, 0.02), 0.9);
      letterCam(0.2 + 0.8 * ease.inOutSine(clamp(tl / 2.2)), T, 1.5);
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, letterPt(0.03, 0, 0)), fstop: 2.4 }, exposure: 1.05 };
    },
    // ---- S031  V2 109.88–111.92: fabric match from S030 (same top-down composition): palms finish pressing the collar, the last
    //      third settles (cloth fall, 48 fps feel), whole-palm press on the hem corner on 箱 (110.95 → 1.08 s), a second press at 1.6 s
    S031(tl, u, T) {
      pierBase(T, true); show(['shed', 'mig', 'crate', 'caseG', 'crowd']);
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
      const collarR = CL(0.035, 0.036, -0.04), corner = CL(0.115, 0.045, 0.07);
      const rIdle = collarR.clone().add(V3(0, 0.05, 0));
      const rp = (tl < 0.62 ? collarR.clone().add(V3(0, 0.045 * up1, 0)) : rIdle.clone().lerp(corner.clone().add(V3(0, 0.045, 0)), ease.inOutSine(clamp((tl - 0.62) / 0.3))).add(V3(0, -0.045 * rDown, 0)));
      const side = CL(1, 0, 0).sub(CL(0, 0, 0)).normalize(); // image right = her right
      handAt('R', rp, fwd.clone().addScaledVector(side, -0.15).normalize(), ['wipe'], 0.022, 0.075);
      const lp = CL(-0.075, 0.036, -0.045).add(V3(0, 0.038 * up1, 0));
      handAt('L', lp, fwd.clone().addScaledVector(side, 0.15).normalize(), ['wipe'], 0.022, 0.075);
      // camera: 80° top-down from over her shoulder, handle at the bottom edge
      const tgt = caseG.localToWorld(V3(0.0, 0.06, -0.012));
      cam.place(camera, tgt.clone().addScaledVector(fwd, -0.29).add(V3(0, 1.6, 0)), tgt); cam.lens(camera, 75);
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, tgt), fstop: 4 }, exposure: 1.08 };
    },
    // ---- S032  V2 111.92–114.54: MCU 100 mm handheld; she looks back screen-left over the flowing crowd, one silent word
    S032(tl, u, T) {
      pierBase(T, true); show(['shed', 'mig', 'crate', 'caseG', 'crowd']);
      seatHer({ rot: 0.12 }); hideLegs();
      lampRig(2, 1, 3, { k: 15, f: 7, aim: herLocal(0, 1.0, 0.2) }); lights({ sky: true, fill2: true });
      setCrowd({ t: tl, D: 2.7, speed: 1.0, farD: 4.5, keep: (x, z) => !(Math.abs(x - SEAT.x) < 1.0 && z > -2.05 && z < -0.5) && !(z > -0.6 && Math.abs(x - SEAT.x) < 3.2) && !(z > -3 && z < -2.0 && Math.abs(x - SEAT.x) < 4), families: true,
        extra: [{ x0: SEAT.x - 2.3, z: -2.45, v: 1.25, vi: 1, lug: 'case' }, { x0: SEAT.x - 0.7, z: -2.3, v: 1.05, vi: 3, ph: 0.4 }, { x0: SEAT.x - 3.9, z: -2.6, v: 1.3, vi: 4, lug: 'bundle', ph: 0.7 }, { x0: SEAT.x + 0.9, z: -2.4, v: 0.95, vi: 5, ph: 0.2 }] });
      mig.breathe(T, 1.1);
      // hands resting on the closed case
      handAt('R', herLocal(-0.12, LID_Y, 0.3), herDir(0, 0, 1), ['relaxed', { curl: 0.7 }], 0.03);
      handAt('L', herLocal(0.14, LID_Y, 0.3), herDir(0, 0, 1), ['relaxed', { curl: 0.7 }], 0.03);
      // head turn: 3/4 to screen-right (ship) → back to screen-left (home, the family at the railing) on 乡音 (0.0–0.55 s)
      const k = ease.inOutSine(clamp((tl - 0.02) / 0.55));
      const eye = mig.eye();
      const lookR = V3(SEAT.x + 12, eye.y + 0.1, SEAT.z + 4.0), lookL = V3(SEAT.x - 12, eye.y + 0.15, SEAT.z + 1.4);
      mig.lookAt(lookR.lerp(lookL, k), 1);
      // the silent two-syllable word on 唇边 (112.33 → 0.41 s): two tiny nods of the chin
      const w = clamp((tl - 0.4) / 0.42); mig.bone('head').rotateX(0.035 * Math.sin(w * Math.PI * 2) * Math.sin(w * Math.PI));
      mig.root.updateMatrixWorld(true);
      const e = mig.eye();
      const hc = headCentre(mig);
      const camPos = V3(hc.x + 0.05, hc.y + 0.02, hc.z + 2.6);
      const tgt = hc.clone().add(V3(-lerp(0.075, 0.02, k), -lerp(0.04, 0.03, k), 0));
      fillB.position.copy(e).add(V3(0.1, -0.5, 0.65)); fillB.intensity = 0.7; fillB.distance = 3;   // warm bounce off the case lid
      skyLight.position.set(SEAT.x + 12, 2.5, SEAT.z - 3); skyLight.target.position.copy(e); skyLight.intensity = 1.2; // cool rim from the far end doors
      cam.place(camera, camPos, tgt); cam.lens(camera, 100);
      cam.handheld(camera, T, 0.7, 7);
      if (String(window.__PZ).includes('mark') || PZ0.includes('mark')) { dbgMark.visible = true; dbgMark.position.copy(e); }
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, e), fstop: 2.0 }, exposure: 1.1 };
    },
    // ---- S033  V2 114.54–116.67: CU 70° high angle, locked; reopens the lid on 一颗心 (0.79 s), lays the cloth-wrapped comb on
    //      the shirt's top-right corner (registered (0.64, 0.34) = museum layout), palm press on 念 (1.75 s)
    S033(tl, u, T) {
      pierBase(T, true); show(['shed', 'mig', 'crate', 'caseG', 'comb', 'crowd']);
      seatHer(); hideLegs(); shirtG.visible = true; shirtG.position.set(0.0, 0.013, -0.005); shirtFlap.rotation.z = 0;
      mig.setLayerVisible('head', false); mig.setLayerVisible('hair', false);
      lampRig(2, 1, 3, { k: 15, f: 8, aim: caseG.localToWorld(V3(0, 0.1, 0)) }); lights({ fill1: false });
      setCrowd({ t: tl, D: 2.2, speed: 0.5, keep: keepSeat });
      const open = ease.inOutSine(clamp((tl - 0.05) / 0.74));
      lid.rotation.x = -1.95 * open;
      const CL = (x, y, z) => caseG.localToWorld(V3(x, y, z));
      const fwd = CL(0, 0, -1).sub(CL(0, 0, 0)).normalize();
      // left fingertips under the near edge of the lid (lifting), let go at ~60°
      const lidEdge = lid.localToWorld(V3(-0.15, 0.0, 0.38));
      const lk = clamp((tl - 0.45) / 0.3);
      const lp = lidEdge.clone().lerp(CL(-0.2, 0.22, 0.12), ease.inOutSine(lk));
      handAt('L', lp, fwd, ['relaxed', { curl: lerp(0.9, 0.6, lk) }], 0.018, 0.07);
      // the comb: from her lap (bottom right, out of frame) to the shirt's top-right corner, placed at 1.4 s, pressed at 1.75 s
      const place = CL(0.105, 0.06, -0.06), start = CL(0.16, 0.34, 0.36);
      const c = ease.inOutSine(clamp((tl - 0.85) / 0.55));
      const combPos = start.clone().lerp(place, c).add(V3(0, 0.05 * Math.sin(c * Math.PI), 0));
      comb.position.copy(combPos); comb.rotation.set(0, caseG.rotation.y + 0.25, 0);
      const press = ease.inOutSine(clamp((tl - 1.55) / 0.2));
      const rp = tl < 1.42 ? combPos.clone().add(V3(0, 0.022, 0)) : place.clone().add(V3(0, 0.02 + 0.035 * (1 - press) * clamp((tl - 1.42) / 0.1) - 0.006 * press, 0));
      handAt('R', rp, fwd, tl < 1.42 ? ['pinch'] : ['flat', { spread: 0.2 }], 0.02, 0.08);
      const tgt = CL(0.0, 0.16, -0.01);
      cam.place(camera, tgt.clone().addScaledVector(fwd, -0.52).add(V3(0, 1.42, 0)), tgt); cam.lens(camera, 75);
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, tgt), fstop: 4 }, exposure: 1.08 };
    },
    // ---- S034  V2 116.67–118.33: INSERT 100 mm at the railing; the elder's hand presses the glowing oil-paper parcel into her
    //      hand on 哪味甜 (0.58 s) and folds her fingers over it on 甜 (1.24 s) → S035 fingers at (0.54, 0.58)
    S034(tl, u, T) {
      pierBase(T, true); show(['shed', 'crowd', 'migFreeL', 'migFreeR', 'elderHand', 'parcel']);
      const Q = V3(-1.0, 1.1, -2.8);
      lampRig(4, 5, 3, { k: 9, f: 10, aim: Q });
      setCrowd({ t: tl, D: 1.8, speed: 0.6, farD: 3, keep: (x, z) => !(x < Q.x + 2.5 && x > Q.x - 3.5 && z > -3.6 && z < -1.6) });
      // her two hands side by side, palms up, cupped to receive (little fingers together), fingers toward the elder (screen-left)
      const close = ease.inOutSine(clamp((tl - 0.62) / 0.62));
      const cupTo = (h) => h.setChannels(blendHandChannels(handPose('cupped', {}, h.dims), handPose('grip', { radius: 0.024 }, h.dims), close));
      migFreeL.placeWrist(Q.clone().add(V3(-0.04, -0.012, 0.125)), [0.0, 0.12, -1], [0.3, 1, 0]); cupTo(migFreeL);
      migFreeR.placeWrist(Q.clone().add(V3(0.04, -0.012, 0.125)), [0.0, 0.12, -1], [-0.3, 1, 0]); cupTo(migFreeR);
      // the elder's hand brings the parcel in from screen-left, sets it in her palms (0.50–0.58 s), then covers her closing fingers
      const inK = ease.outCubic(clamp((tl - 0.04) / 0.5)), wrap = ease.inOutSine(clamp((tl - 0.6) / 0.6)), sq = 0.004 * Math.sin(clamp((tl - 1.24) / 0.35) * Math.PI);
      const eStart = Q.clone().add(V3(0.0, 0.1, -0.29)), eSet = Q.clone().add(V3(0.0, 0.085, -0.13)), eWrap = Q.clone().add(V3(0.0, 0.078 - sq, -0.035));
      const ew = tl < 0.6 ? eStart.lerp(eSet, inK) : eSet.lerp(eWrap, wrap);
      elderHand.placeWrist(ew, V3(0.0, -0.32, 1).lerp(V3(0, -0.22, 1), tl < 0.6 ? 0 : wrap), V3(0, -1, 0.2));
      elderHand.setChannels(blendHandChannels(handPose('grip', { radius: 0.03 }, elderHand.dims), handPose('cupped', {}, elderHand.dims), tl < 0.6 ? 0 : 0.6 + 0.4 * wrap));
      // the parcel: under the elder's palm until set down, then in her joined palms
      const rest = migFreeL.sockets.palm.getWorldPosition(V3()).lerp(migFreeR.sockets.palm.getWorldPosition(V3()), 0.5).add(V3(0, -0.004, 0));
      const inElder = elderHand.sockets.palm.getWorldPosition(V3()).add(V3(0, -0.032, 0));
      parcel.position.copy(tl < 0.5 ? inElder : inElder.lerp(rest, ease.inOutSine(clamp((tl - 0.5) / 0.1)))); parcel.rotation.set(0, 0.06, 0.02);
      const tgt = Q.clone().add(V3(0.0, 0.025, 0.02));
      cam.place(camera, tgt.clone().add(V3(-1.24 + 0.04 * ease.inOutSine(u), 0.06, 0.0)), tgt); cam.lens(camera, 100);
      return { ...MIG_POST, noCones: true, dof: { focus: cam.distTo(camera, tgt), fstop: 2.8 }, exposure: 1.15, bloom: { strength: 0.5, radius: 0.6, threshold: 0.75 } };
    },
    // ---- S036  V2 121.25–123.29: WS 32 mm locked, deep focus; the two hands clasped at the railing, steamer beyond the doors at
    //      screen-right; the clasp settles on 替谁 (0.16 s), one slow thumb stroke on 平安 (1.40 s)
    S036(tl, u, T) {
      pierBase(T, true); show(['shed', 'mig', 'elder', 'crowd', 'caseCarry']);
      lampRig(5, 4, 6, { k: 14, f: 9 }); lights({ sky: true, cone: 0.8 });
      setCrowd({ t: tl, D: 2.1, speed: 0.35, keep: (x, z) => !(x > -4.5 && x < 1.2 && z > -4.3 && z < -1.2) });
      const C0 = V3(-1.15, 1.08, -3.0);
      mig.root.position.set(-0.55, 0, -2.42); mig.root.rotation.set(0, Math.PI / 2 + 0.12, 0);
      mig.pose('stand', { weight: 0.4 }); mig.breathe(T, 1);
      mig.reach('R', mig.root.localToWorld(V3(-0.2, 0.74, 0.03)), { palm: herDir(1, 0, 0), fingers: V3(0, -1, 0.05) }); migHandR.pose('rattan'); hangCase();
      mig.reach('L', C0.clone().add(V3(0.02, -0.01, 0.07)), { palm: V3(0, -0.2, -1), fingers: V3(-0.6, -0.2, -0.75) });
      migHandL.pose('hold_hand');
      mig.lookAt(V3(-1.6, 1.3, -3.4), 0.5);
      elder.root.position.set(-1.65, 0, -3.48); elder.root.rotation.set(0, 0.55, 0);
      elder.pose('stand', { weight: -0.3 }); elder.breathe(T + 1.3, 1);
      elder.reach('R', C0.clone().add(V3(-0.05, 0.0, -0.08)), { palm: V3(0.2, -0.2, 1), fingers: V3(0.7, -0.2, 0.6) });
      const th = 0.25 * Math.sin(clamp((tl - 1.25) / 0.5) * Math.PI);
      elder.hands.R.setChannels(blendHandChannels(handPose('hold_hand', {}, elder.hands.R.dims), {}, 0));
      if (th) { const ch = elder.hands.R.channels; ch.thumb = ch.thumb.map((v, i) => (i === 2 ? v + th : i === 0 ? v - th * 0.5 : v)); elder.hands.R.setChannels(ch); }
      gateL.rotation.y = Math.PI; gateR.rotation.y = 0;
      cam.place(camera, [-3.75, 1.32, -2.62], [12, 1.5, 1.15]); cam.lens(camera, 32);
      return { ...MIG_POST, dof: { focus: 2.6, fstop: 8 }, exposure: 1.05 };
    },
    // ---- S037  V2 123.29–126.12: INSERT 45° down through the booth's glass partition (booth in the cross railing by the gate;
    //      camera looks +X); the stamp peaks on 印 (0.74 s), falls on 章 (1.29 s, 96 fps feel), lifts at 2.31 s; violet mark at
    //      (0.60, 0.50) for S040; her floral sleeve at the left edge, the arm still stretched back to the family at the railing
    S037(tl, u, T) {
      pierBase(T, true); show(['shed', 'clerkR', 'clerkL', 'migFreeL', 'crowd']);
      booth.updateMatrixWorld(true);
      const B = (x, y, z) => booth.localToWorld(V3(x, y, z));
      lampRig(5, 6, 4, { k: 12, f: 9 });
      key.position.copy(B(0.35, 2.5, -0.5)); key.target.position.copy(B(0.0, 1.1, -0.2)); key.target.updateMatrixWorld(); key.intensity = 2.0; key.angle = 0.9;
      setCrowd({ t: tl, D: 3, speed: 0.6, keep: (x, z) => !(x > 4 && x < 10 && z > -3.2 && z < 0.4) });
      const permitC = V3(0.02, 1.112, -0.2), mark = permitC.clone().add(V3(0.033, 0.0005, -0.003));
      stampImp.position.copy(mark); stampImp.position.y = 1.1125;
      const pIn = V3(0.11, 1.17, -0.2), pk = mark.clone().add(V3(0.05, 0.2, -0.05)), hit = mark.clone().add(V3(0, 0.0005, 0)), out = mark.clone().add(V3(0.1, 0.34, -0.12));
      let sp, sq = 0;
      if (tl < 0.74) sp = pIn.clone().lerp(pk, ease.inOutSine(tl / 0.74));
      else if (tl < 1.0) sp = pk.clone().add(V3(0, 0.004 * Math.sin((tl - 0.74) / 0.26 * Math.PI), 0));
      else if (tl < 1.29) sp = pk.clone().lerp(hit, ease.inCubic((tl - 1.0) / 0.29));
      else if (tl < 2.31) { sp = hit.clone(); sq = Math.min(1, (tl - 1.29) / 0.12) * (1 - clamp((tl - 2.0) / 0.3)); }
      else sp = hit.clone().lerp(out, ease.inOutSine(clamp((tl - 2.31) / 0.5)));
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
      migFreeL.placeWrist(B(-0.56, 1.3, 0.05), rdir.clone().add(V3(0, -0.04, 0)).normalize(), V3(0, -1, 0).addScaledVector(away, -0.4));
      migFreeL.pose('hold_hand');
      const camT = B(permitC.x + 0.01, 1.112, permitC.z - 0.012);
      cam.place(camera, camT.clone().add(V3(0, 0.6, 0)).addScaledVector(away, -0.62), camT); cam.lens(camera, 75);
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
      pierBase(T, true); show(['shed', 'mig', 'elder', 'crowd', 'caseCarry']);
      lampRig(6, 5, 7, { k: 13, f: 9 }); lights({ sky: true, cone: 0.8 });
      const go = ease.inOutSine(clamp((tl - 0.07) / 1.1));
      gateL.rotation.y = Math.PI + 1.35 * go; gateR.rotation.y = -1.35 * go;
      setCrowd({ t: tl, D: 3.7, speed: 1.15, gateOpen: go, farD: 8, keep: (x, z) => !(x < 7.2 && x > 0.5 && z > -2.9 && z < 2.5) });
      const step = ease.outSine(clamp(tl / 2.1));
      const hz = -2.42 + 0.62 * step;
      mig.root.position.set(7.22 + 0.05 * step, 0, hz); mig.root.rotation.set(0, lerp(1.1, 0.12, ease.inOutSine(clamp(tl / 0.7))), 0);
      const stride = 0.75 * (1 - clamp((tl - 1.7) / 0.5));
      mig.pose('walk', { phase: ((0.62 * step) / 0.9 + 0.1) % 1, stride: Math.max(0.05, stride) }); mig.breathe(T, 1.2);
      mig.reach('R', mig.root.localToWorld(V3(-0.21, 0.74, 0.02 + 0.05 * Math.sin(T * 5.5) * stride)), { palm: herDir(1, 0, 0), fingers: V3(0, -1, 0.05) }); migHandR.pose('rattan'); hangCase(0.04 * Math.sin(T * 5.5 + 0.6) * stride);
      elder.root.position.set(6.95 + 0.12 * ease.outSine(clamp(tl / 1.4)), 0, -3.42); elder.root.rotation.set(0, 0.25, 0);
      elder.pose('stand', { weight: 0.5 }); elder.bone('chest').rotateX(0.18); elder.root.updateMatrixWorld(true);
      const C = V3(7.12, 1.1, lerp(-2.95, -2.82, step));
      mig.reach('L', C.clone().add(V3(0.02, 0, 0.06)), { palm: V3(0, -0.2, -1), fingers: V3(-0.25, -0.15, -1) }); migHandL.pose('hold_hand');
      elder.reach('R', C.clone().add(V3(-0.02, 0, -0.06)), { palm: V3(0, -0.2, 1), fingers: V3(0.25, -0.15, 1) }); elder.hands.R.pose('hold_hand');
      const look = ease.inOutSine(clamp((tl - 1.3) / 0.5));
      mig.lookAt(V3(9, 1.5, 3).lerp(V3(6.6, 1.35, -3.6), look), 0.95);
      elder.lookAt(mig.eye(), 0.8);
      const cz = -2.05 + 0.45 * ease.inOutSine(clamp(tl / 3.6));
      cam.place(camera, [2.65, 1.18, cz], [12, 0.92, cz + 0.32]); cam.lens(camera, 40);
      cam.handheld(camera, T, 0.6, 21);
      return { ...MIG_POST, dof: { focus: cam.distTo(camera, mig.root.position.clone().add(V3(0, 1.1, 0))), fstop: 2.8 }, exposure: 1.1 };
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
      key.position.copy(H0).addScaledVector(F, 3.5).add(V3(0, 1.2, 0)); key.target.position.copy(H0); key.target.updateMatrixWorld(); key.color.set(0xb8c8e0); key.intensity = 18; key.angle = 0.3;
      skyLight.position.copy(H0).addScaledVector(F, 10).add(V3(0, 2, 0)); skyLight.target.position.copy(H0); skyLight.intensity = 0.8;
      fillA.position.copy(H0).addScaledVector(F, -2.2).add(V3(0.3, 1.6, 0)); fillA.intensity = 1.6; fillA.distance = 5;
      setCrowd({ t: tl, D: 4.2, speed: 1.0, gateOpen: 1, walkers: false, waits: false, queue: false });
      // the elder's right hand: back to camera, palm toward the departing hand, fingers up and gently curled, thumb at screen-left
      elderHand.placeWrist(H0.clone().add(V3(0, -0.085, 0)).addScaledVector(F, -0.01), UP.clone().addScaledVector(F, 0.22), F.clone().add(V3(0, -0.1, 0)));
      elderHand.setChannels(blendHandChannels(handPose('relaxed', { curl: 0.55 }, elderHand.dims), handPose('hold_hand', {}, elderHand.dims), 0.2));
      // her left hand: fingers over the elder's palm edge from screen-right, slides off (palm → knuckles → fingertips) and away
      const s1 = ease.inOutSine(clamp((tl - 0.63) / (3.21 - 0.63)));
      const after = ease.inSine(clamp((tl - 3.21) / 0.6));
      const hw = H0.clone().addScaledVector(F, 0.035 + 0.04 * s1 + 0.12 * after).addScaledVector(R, 0.105 + 0.085 * s1 + 0.34 * after).add(V3(0, -0.03 * s1 - 0.04 * after, 0));
      migFreeL.placeWrist(hw, R.clone().negate().add(V3(0, 0.12 + 0.2 * s1, 0)), F.clone().negate().addScaledVector(R, 0.25 * s1));
      migFreeL.setChannels(blendHandChannels(handPose('hold_hand', { radius: 0.018 }, migFreeL.dims), handPose('relaxed', { curl: 0.55 }, migFreeL.dims), clamp(s1 * 1.1 + after)));
      migFreeL.root.visible = after < 0.999;
      const tgt = H0.clone().add(V3(0, 0.003, 0)).addScaledVector(R, 0.062);
      cam.place(camera, H0.clone().addScaledVector(F, -1.42).add(V3(0, -0.05, 0)).addScaledVector(R, 0.04), tgt); cam.lens(camera, 100);
      return { ...MIG_POST, noCones: true, dof: { focus: 1.42, fstop: 2.8 }, exposure: 1.0, bloom: { strength: 0.5, radius: 0.7, threshold: 0.7 } };
    },
    // ---- S068  CH3 215.67–217.71: MS 50 mm locked; on the bench she gives a piece of the peanut-sesame sweet to the nervous boy
    //      (left → right, T21): it lands in his palm on 面 (0.27 s); her smile crosses 千 (0.93 s); his cheek loosens at 1.53 s
    S068(tl, u, T) {
      pierBase(T); show(['shed', 'mig', 'trav', 'travBundle', 'parcelOpen', 'piece', 'crowd']);
      lampRig(4, 3, 5, { k: 24, f: 8, aim: V3(0.6, 0.8, -0.2) }); lights({ fill2: true });
      key.position.set(-0.45, LAMP_Y - 0.03, -0.25);
      fillB.position.set(-0.6, 0.35, -0.1); fillB.intensity = 0.9; fillB.distance = 3.5; // warm bounce off the wet planks / the parcel
      setCrowd({ t: tl + 30, D: 2.1, speed: 0.8, farD: 6.5, keep: (x, z) => !(x < 2.6 && x > -5 && z > -2.2 && z < 1.8) });
      const BX = 0.6;
      // bench (reuse a crate-less seat: the S068 bench is the dressing bench at x 0.6 along Z)
      mig.root.position.set(BX, 0, -0.62); mig.root.rotation.set(0, -Math.PI / 2 + 0.35, 0);
      mig.pose('sit_chair', { seat: 0.45, feet: 0.06, lean: 0.14, hands: 'none' }); mig.breathe(T, 1);
      trav.root.position.set(BX + 0.05, 0, 0.42); trav.root.rotation.set(0, -Math.PI / 2 - 0.3, 0);
      trav.pose('sit_chair', { seat: 0.45, feet: 0.04, lean: 0.3, hands: 'none' }); trav.breathe(T + 0.7, 1.3);
      // the open parcel on her lap (left hand holds it)
      const lap = mig.root.localToWorld(V3(0.04, 0.58, 0.2));
      parcelOpen.position.copy(lap); parcelOpen.rotation.set(0, mig.root.rotation.y, 0);
      mig.reach('L', lap.clone().add(V3(0, 0.04, 0)).add(herDir(0.06, 0, -0.07)), { palm: DOWN, fingers: herDir(-0.4, 0, 1) }); migHandL.pose('relaxed', { curl: 0.7 });
      // the give: her right hand crosses toward him (already moving at the cut) and sets the piece in his palm at 0.27 s
      const palmP = V3(BX - 0.32, 0.86, -0.02);
      const give = clamp(0.62 + tl / 0.27 * 0.38), back = ease.inOutSine(clamp((tl - 0.45) / 0.9));
      const reachP = mig.root.localToWorld(V3(-0.1, 0.82, 0.32)).lerp(palmP.clone().add(V3(0, 0.035, 0)), ease.outCubic(give));
      const handP = reachP.lerp(lap.clone().add(V3(0.0, 0.08, 0)), back);
      mig.reach('R', handP.clone().add(V3(0.0, 0.03, -0.05)), { palm: V3(0.1, -1, 0.2), fingers: V3(0.2, -0.2, 1) }); migHandR.pose(tl < 0.3 ? 'pinch' : 'relaxed', { curl: 0.6 });
      const pin = migHandR.sockets.pinch.getWorldPosition(V3());
      piece.position.copy(tl < 0.27 ? pin.add(V3(0, -0.006, 0)) : palmP.clone().add(V3(0, 0.012, 0))); piece.rotation.set(0, 0.4, 0);
      // his right hand palm up waiting, closes 0.3–0.7 s; left arm hugs the bundle; ticket in the left fingers
      const fist = ease.inOutSine(clamp((tl - 0.32) / 0.4));
      trav.reach('R', palmP.clone().add(V3(0.075, -0.012, 0.02)), { palm: V3(0, 1, 0), fingers: V3(-0.9, 0.1, -0.35) });
      trav.hands.R.setChannels(blendHandChannels(handPose('cupped', {}, trav.hands.R.dims), handPose('fist', {}, trav.hands.R.dims), fist * 0.8));
      const bun = trav.root.localToWorld(V3(0.05, 0.62, 0.22)); travBundle.position.copy(bun);
      trav.reach('L', bun.clone().add(V3(0.0, 0.08, 0.1)), { palm: V3(0, -0.5, -1), fingers: V3(-0.5, -0.4, -0.6) });
      // looks: she at him, smiling (a small head tilt on 0.93 s); he at the sweet, then half-relaxes toward her (1.53 s)
      mig.lookAt(trav.eye().lerp(palmP, 0.35 * (1 - back)), 0.85);
      const smile = Math.sin(clamp((tl - 0.85) / 0.6) * Math.PI);
      mig.bone('head').rotateZ(-0.06 * smile); mig.bone('head').rotateX(0.03 * smile);
      const rel = ease.inOutSine(clamp((tl - 1.45) / 0.5));
      trav.lookAt(palmP.clone().lerp(mig.eye(), 0.65 * rel), 0.9);
      trav.bone('head').rotateZ(0.05 * rel);
      cam.place(camera, [BX - 4.15, 1.08, -0.08], [BX, 0.88, -0.08]); cam.lens(camera, 50);
      return { ...MIG_POST, dof: { focus: 4.0, fstop: 2.8 }, exposure: 1.08 };
    },
    // ---- S076  OUTRO 235.54–237.08: dawn on the steamer's rail, MCU 100 mm locked; her right profile looks screen-right as a new
    //      coastline emerges from the mist (236.4 → 0.86 s); light from screen-right; dissolve-aligned eye (0.33, 0.40) with S075
    S076(tl, u, T) {
      show(['mig', 'deck', 'caseCarry']); lights({ sky: true });
      sky.object3D.renderOrder = -1000; // far coast at 3.2 km: the dome must draw first (its far-plane depth ties with the land)
      fog.density = 0.0004; fog.color.setRGB(0.55, 0.52, 0.52);
      sky.blend('predawn', 'dawn', 0.4, { sunAz: 34, sunElev: -1.2, moonAz: -120, moonElev: 8, cloudCover: 0.32 }); sky.update(T);
      for (const l of lamps) l.glow.set(0);
      lid.rotation.x = 0;
      key.position.set(60, DECK_Y + 6, -14); key.target.position.set(0, DECK_Y + 1.3, 0); key.target.updateMatrixWorld(); key.color.set(0xf2c39c); key.intensity = 14000; key.angle = 0.06; key.distance = 0;
      fillA.intensity = fillB.intensity = 0;
      skyLight.position.set(-20, 30, 10); skyLight.target.position.set(0, DECK_Y, 0); skyLight.color.set(0x8ea2c4); skyLight.intensity = 0.55;
      hemi.color.set(0x7d8fae); hemi.groundColor.set(0x3a3330); hemi.intensity = 0.55;
      mig.root.position.set(0, DECK_Y, -0.02); mig.root.rotation.set(0, Math.PI / 2 - 0.08, 0);
      mig.pose('stand', { weight: -0.3 }); mig.breathe(T, 1.1);
      mig.reach('L', V3(0.28, DECK_Y + 1.13, -0.36), { palm: DOWN, fingers: V3(0.7, -0.1, -0.7) }); migHandL.pose('relaxed', { curl: 0.85 });
      mig.reach('R', mig.root.localToWorld(V3(-0.2, 0.74, 0.03)), { palm: herDir(1, 0, 0), fingers: V3(0, -1, 0.05) }); migHandR.pose('rattan'); hangCase();
      mig.lookAt(V3(500, DECK_Y + 1.6, -110), 1);
      const e = mig.eye();
      const haze = 0.97 - 0.27 * ease.inOutSine(clamp((tl - 0.45) / 0.85));
      coast.land.material.uniforms.uCoastHaze.value = haze; coast.update(T);
      mist.update(T, { opacity: 0.22 - 0.1 * ease.inOutSine(clamp((tl - 0.45) / 0.85)) });
      cam.place(camera, [e.x + 0.245, e.y - 0.06, e.z + 4.0], [e.x + 0.245, e.y - 0.06 + 0.012, e.z]); cam.lens(camera, 100);
      camera.far = 6000;
      return { ...MIG_POST, temp: -0.04, saturation: 0.86, contrast: 1.06, dof: { focus: cam.distTo(camera, e), fstop: 2.8 }, exposure: 0.95, bloom: { strength: 0.35, radius: 0.6, threshold: 0.85 } };
    },
    // ---- view_pier (nested: G3c pane S024, corridor P3 S066): MS of her on the crate under the third lamp, letter on the case
    view_pier(tl, u, T) {
      pierBase(T);
      seatHer();
      lampRig(2, 1, 3, { k: 15, f: 8, aim: herLocal(0, 0.6, 0.2) }); lights({ fill1: false });
      setCrowd({ t: clamp(tl, 0, 10), D: 10, speed: 0.8, waits: false, farD: 6, keep: (x, z) => !(x > SEAT.x - 6 && x < SEAT.x + 1.8 && z > -2.75 && z < 2.2) });
      foldLetter(0, 0, 0);
      placeLetter(0.02, 0.235, 0.0);
      const fwd = herDir(0, 0, 1);
      mig.breathe(T, 1);
      const s = 0.5 + 0.5 * Math.sin(T * 0.7);
      handAt('R', letterPt(0.05 - 0.03 * s, 0.003, 0.06 - 0.08 * s), fwd, ['flat', { spread: 0.15 }], 0.026);
      handAt('L', herLocal(0.2, LID_Y, 0.25), fwd, ['relaxed', { curl: 0.6 }], 0.03);
      mig.lookAt(letterPt(0.02, 0, 0), 0.9);
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

  return {
    scene, camera,
    post: { ...MIG_POST },
    setShot(shot, tl, u, T) {
      camera.far = 900; camera.near = 0.03;
      for (const k of ['head', 'hair', 'trousers', 'shoes', 'shoes.sole']) mig.setLayerVisible(k, true); dbgMark.visible = false; glassGlow.object3D.visible = false;
      key.color.set(BULB); key.angle = 0.62; key.distance = 14; skyLight.color.set(0x9fb2d2); hemi.color.set(0x2a3b5a); hemi.groundColor.set(0x2b2017);
      sky.object3D.renderOrder = 6; fog.density = 0.016; stampTool.scale.set(1, 1, 1);
      stampTool.position.set(0.3, 1.13, -0.33); gateL.rotation.y = Math.PI; gateR.rotation.y = 0; stampImp.visible = false; fillA.distance = fillB.distance = 11; // rest states (pure per frame)
      key.castShadow = true; fillA.visible = true; skyLight.visible = false; fillB.visible = false; sky.object3D.visible = sea.object3D.visible = true; steamer.visible = true;
      for (const l of lamps) { l.cone.object3D.visible = true; l.glow.object3D.visible = true; }
      const fn = setups[shot.id] || setups.default;
      crowdCfg = null;
      const p = fn(tl, u, T, shot) || {};
      if (crowdCfg) applyCrowd(crowdCfg, camera); else crowd.visible = false;
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
        if (PZ.has('nosky')) sky.object3D.visible = false;
        if (PZ.has('nosea')) sea.object3D.visible = false;
        if (PZ.has('nocone')) for (const l of lamps) l.cone.object3D.visible = false;
        if (PZ.has('nodof')) p.dof = null;
        if (PZ.has('nofill')) { fillA.visible = fillB.visible = false; }
        if (PZ.has('noshed')) shed.visible = false;
        if (PZ.has('nosteamer')) steamer.visible = false;
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
