// night_window — LOC_WINDOW: the three-sided bay at the east end of the upper corridor (present day, ~04:00 → dawn).
// Shots: S059 S060 (guard alone, phone) · S062 S063 S064 S065 (tea, the two-shot, hands, the nod) · S072 S073 S074 (the call)
//        · S077 (refill at first light) · S079 (from behind, dawn) · S081 (the two cups — final shot of the film).
// Named view for nested renders: view_bay_back (the pair from behind, facing the east window: corridor S061 / S066).
//
// World: metres, Y up, +X = east, +Z = south (sky.js azimuths are compass bearings). Floor y = 0 (2nd floor; the harbour
// water is 8 m below). The corridor's glazed screen is x = 0; the bay room runs to x = 2.4 where the canted bay (bible:
// 1.6 m deep, 4.2 m wide, faces NE / E / SE at 45°) projects to the east pane at x = 4.0 (1.0 m wide, centre mullion).
// Built-in teak bench parallel to the east pane; GUARD sits on its south half (nearer the SE window), RESTORER on its north
// half, 62 cm centre to centre, both turned a little toward the SE window (where the dawn comes from). Cups on the east
// sill between them: his (chip at 2 o'clock) south = screen-right, hers 6 cm north of it. Reading lamp (2700 K floor lamp,
// arched arm) in the bay's north-east corner.
//
// Coverage (director ruling BAY_3Q): camera in the bay room's south-west part looking N-NNE along the bench — east window
// screen-right, GUARD nearer / screen-right, RESTORER beyond him screen-left. S079 / view_bay_back = the reverse (from the
// west, behind them). S073 is her side of the bench (NNE of him) — see night_window.md.
//
// Performance: the exterior (sky dome, sea, coasts, silhouettes) is ≥ 400 m away, so a sub-metre camera move gives it no
// parallax: it is rendered per frame with the shot camera into a reduced-resolution target (`extRT`) and drawn as the
// background; only the harbour light points stay in the main scene (crisp, depth-tested). One shadow light per shot.
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { createSea, createCoast } from '../lib/sea.js';
import { loadCharacter, loadCharacterHand } from '../lib/cast.js';
import { handPose, blendHandChannels } from '../lib/hand.js';
import { Figure } from '../lib/figure.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const hex = (h) => new THREE.Color(h);

// ---- bible colours (bible.json palette + LOC_WINDOW / PROP_TEA / PROP_PHONE / GUARD / RESTORER entries)
const C = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P06: '#EDF1EF', P07: '#2B4A8B', P13: '#E2A458',
  P20: '#5B6F8A', P21: '#EBB894', P22: '#F5E4C8', P28: '#0A0F17', P29: '#C9D8E6', P30: '#C9A55A',
  frame: '#E3DED3', bench: '#6A4A32', cushion: '#6B6C6A', glaze: '#E6ECEC', steel: '#8E9296', navyLid: '#26324A',
  phone: '#3A3D42', phoneCase: '#26324A', glove: '#F1EFE8', lampShade: '#E8DCC4', lampMetal: '#2A2622',
};
const K2700 = hex('#ffbf85'), K6500 = hex('#dce8ff'), MOONC = hex('#9fb4d8');

// ---- geometry constants (see header)
const SILL_Y = 0.72, GLASS_X = 4.0, EAST_HALF = 0.5, BAY_BASE_X = 2.4, BAY_HALF = 2.1, ROOM_HALF = 2.7, CEIL = 3.05, HEAD_Y = 2.62;
const SEAT_Y = 0.45;
// (integration) seats 0.68 m apart on a narrower bench (x 3.00–3.38): a small gap between the shoulders, and a 36 cm leg room
// in front of it where she can stand to set the cups down beside him before she sits (no reaching over/behind him)
const SEAT_G = V(3.19, 0, 0.34), SEAT_R = V(3.19, 0, -0.34);
const YAW_G = -0.22, YAW_R = -0.08;                         // turned a little toward the SE window (+ = toward north)
const CUP_G = V(3.875, SILL_Y, 0.071), CUP_R = V(3.875, SILL_Y, -0.071);  // 14.2 cm centre to centre = 6 cm gap, on the sill in front of the gap between them (his south = screen-right)
const THERMOS_POS = V(3.12, SEAT_Y, 0.86);
const GLOVES_POS = V(3.12, SEAT_Y, -0.71);
const LAMP_BASE = V(2.86, 0, -1.52), LAMP_HEAD = V(3.24, 1.66, -0.98);
const SEA_LEVEL = -8.2;

export default async function create(ctx) {
  const { util, cam } = ctx;
  const { clamp, lerp, smoothstep, ease, keys } = util;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.02, 9000);
  const q = new URLSearchParams(location.search);
  const rng = util.rng;

  // film grain: the engine's integer-hash grain (engine/post.js) at the CT_MODERN amount (post.grain 0.035); the old
  // module-side half-res grain quad is gone (integration pass). Nested views get none (no post chain).

  // ================================================================== helpers
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const box = (w, h, d, mat, x, y, z, ry = 0, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // horizontal prism from a plan polygon [[x,z],...], y0 → y1
  function prism(poly, y0, y1, mat, { sides = true, parent = scene } = {}) {
    const shape2 = poly.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(shape2, []);
    const pos = [], uv = [];
    const push = (x, y, z) => { pos.push(x, y, z); uv.push(x, z); };
    const cw = THREE.ShapeUtils.isClockWise(shape2);
    for (const [a, b, c] of tris) {
      const A = poly[a], B = poly[b], Cc = poly[c];
      if (!cw) { push(A[0], y1, A[1]); push(Cc[0], y1, Cc[1]); push(B[0], y1, B[1]); push(A[0], y0, A[1]); push(B[0], y0, B[1]); push(Cc[0], y0, Cc[1]); }
      else { push(A[0], y1, A[1]); push(B[0], y1, B[1]); push(Cc[0], y1, Cc[1]); push(A[0], y0, A[1]); push(Cc[0], y0, Cc[1]); push(B[0], y0, B[1]); }
    }
    if (sides) for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const [P, Q] = cw ? [A, B] : [B, A];
      pos.push(P[0], y0, P[1], Q[0], y0, Q[1], Q[0], y1, Q[1], P[0], y0, P[1], Q[0], y1, Q[1], P[0], y1, P[1]);
      const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
      uv.push(0, y0, L, y0, L, y1, 0, y0, L, y1, 0, y1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  // vertical wall quad between plan points a → b, front side facing the `inside` plan point
  function wallQuad(a, b, y0, y1, mat, inside = [1.5, 0], uvScale = 1) {
    { const nx = -(b[1] - a[1]), nz = b[0] - a[0]; if (nx * (inside[0] - a[0]) + nz * (inside[1] - a[1]) < 0) { const t = a; a = b; b = t; } }
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const g = new THREE.PlaneGeometry(L, y1 - y0);
    const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * L * uvScale, uvA.getY(i) * (y1 - y0) * uvScale);
    const m = new THREE.Mesh(g, mat);
    m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
    m.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    m.receiveShadow = true; m.castShadow = true; scene.add(m); return m;
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; }

  // ================================================================== materials
  const mPlaster = TX.mat('plaster_museum', { repeat: [0.6, 0.6], color: hex('#d2ccc0') });
  const mFrame = std({ color: hex(C.frame).multiplyScalar(0.86), roughness: 0.6, metalness: 0 });
  const FRAME_COL = mFrame.color.clone();
  const mSill = std({ color: hex('#e2ddd2'), roughness: 0.45, metalness: 0 });
  const mFloor = TX.mat('teak', { repeat: [0.45, 0.45], roughness: 1 });
  const mBench = TX.mat('teak', { repeat: [0.7, 0.7], color: hex('#c49a78'), tex: { seed: 9 } });
  const mCushion = std({ color: hex(C.cushion), roughness: 0.95 });
  const mCeil = std({ color: hex('#bdb6aa'), roughness: 0.95 });

  // ================================================================== exterior (its own scene → extRT background)
  const extScene = new THREE.Scene();
  const SKY_BASE = { moonAz: 238, moonElev: 34, stars: 0.22, cloudCover: 0.28, cloudScale: 0.09, sunAz: 112 };
  const sky = createSky({ preset: 'night', ...SKY_BASE, exposure: 1.0 });
  extScene.add(sky.object3D);
  const sea = createSea({ sky, swell: 'calm', windDir: 200, level: SEA_LEVEL, foam: 0.05, glitter: 0.8, cols: 96, rows: 72, fogDensity: 0.0004 });
  extScene.add(sea.object3D);
  const seaU = sea.object3D.material.uniforms;
  const coastN = createCoast({ sky, distance: 5200, az0: 8, az1: 78, height: 60, seed: 12, lights: 3, lightIntensity: 4.5, lightPx: 2.4, level: SEA_LEVEL, haze: 0.35 });
  const coastS = createCoast({ sky, distance: 6400, az0: 152, az1: 182, height: 34, seed: 4, lights: 1, lightIntensity: 3.5, lightPx: 2.2, level: SEA_LEVEL, haze: 0.45 });
  extScene.add(coastN.object3D, coastS.object3D);
  const coastPx = [coastN, coastS].map((c) => [c.lights.material.uniforms.uPx, c.lights.material.uniforms.uPx.value]);
  // silhouettes (breakwater, ships, cranes): dark, hazed toward the sky's horizon colour by distance
  const silMats = [];
  const silMat = (dist) => { const m = new THREE.MeshBasicMaterial({ color: 0x06080d, fog: false }); m.userData.dist = dist; silMats.push(m); return m; };
  const ext = new THREE.Group(); extScene.add(ext);
  const at = (bearing, dist) => [Math.sin(bearing * D2R) * dist, -Math.cos(bearing * D2R) * dist];
  {
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; const b = lerp(168, 118, t), d = lerp(430, 620, Math.pow(t, 0.8)); pts.push(at(b, d)); }
    const m = silMat(500);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; const L = Math.hypot(x1 - x0, z1 - z0);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(L + 0.5, 2.4, 6), m); seg.position.set((x0 + x1) / 2, SEA_LEVEL + 0.9, (z0 + z1) / 2); seg.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); ext.add(seg);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 9, 10), m); const [tx, tz] = at(118, 624); tower.position.set(tx, SEA_LEVEL + 5, tz); ext.add(tower);
  }
  const SHIPS = [[86, 1150, 120, 20], [101, 1900, 160, -15], [131, 2600, 140, 40], [72, 2900, 180, 5]];
  for (const [b, d, L, hd] of SHIPS) {
    const m = silMat(d); const g = new THREE.Group(); const [x, z] = at(b, d); g.position.set(x, SEA_LEVEL, z); g.rotation.y = hd * D2R;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(L, 9, L * 0.16), m); hull.position.y = 2.5; g.add(hull);
    const sup = new THREE.Mesh(new THREE.BoxGeometry(L * 0.16, 12, L * 0.13), m); sup.position.set(-L * 0.34, 12, 0); g.add(sup);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 1.2), m); mast.position.set(L * 0.3, 16, 0); g.add(mast);
    ext.add(g);
  }
  const CRANES = [[38, 2300], [44, 2350], [50, 2420], [57, 2500]];
  for (const [b, d] of CRANES) {
    const m = silMat(d); const g = new THREE.Group(); const [x, z] = at(b, d); g.position.set(x, SEA_LEVEL, z); g.rotation.y = (b + 90) * D2R;
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 48, 2), m); leg.position.set(s * 11, 24, 0); g.add(leg); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 3), m); beam.position.set(0, 46, 0); g.add(beam);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 70), m); boom.position.set(0, 50, 18); g.add(boom);
    ext.add(g);
  }
  // quay below the south facade (seen behind GUARD in S073): a dark low edge
  { const m = silMat(200); const q0 = new THREE.Mesh(new THREE.BoxGeometry(900, 1.2, 30), m); const [x, z] = at(200, 260); q0.position.set(x, SEA_LEVEL + 0.4, z); q0.rotation.y = -20 * D2R; ext.add(q0); }
  // harbour light points (main scene, constant pixel size, twinkle): [x, y, z, r, g, b, px]
  const LP = [];
  const lamp = (b, d, y, col, k, px, keepDawn = 0) => { const [x, z] = at(b, d); const c = hex(col).multiplyScalar(k); LP.push([x, SEA_LEVEL + y, z, c.r, c.g, c.b, px, keepDawn]); };
  lamp(118, 624, 10, C.P13, 7, 3.4, 1);                                  // harbour-mouth light (slow blink)
  for (let i = 0; i < 7; i++) lamp(lerp(160, 124, i / 6), lerp(450, 600, i / 6), 2.6, C.P13, 2.2, 2.0);   // mole lamps
  for (const [b, d, L] of SHIPS) {
    const r = rng(Math.round(b * 7 + d));
    for (let i = 0; i < 4; i++) lamp(b + (r() - 0.5) * L / d * 40, d + (r() - 0.5) * 20, 6 + r() * 10, C.P13, 2.8, 2.2);
    lamp(b + 0.3, d, 28, '#fff1d8', 4, 2.4);
  }
  for (const [b, d] of CRANES) { lamp(b, d, 50, C.P13, 3.5, 2.0); lamp(b + 0.6, d, 4, '#ffd9a0', 2.4, 2.4); }
  for (let i = 0; i < 26; i++) { const r = rng(300 + i); lamp(lerp(30, 66, r()), lerp(2150, 2600, r()), 3 + r() * 6, r() < 0.7 ? C.P13 : '#ffe6c0', 1.6 + r() * 1.5, 1.6 + r()); }
  for (let i = 0; i < 9; i++) { const r = rng(500 + i); lamp(lerp(176, 214, i / 8) + (r() - 0.5) * 2, lerp(230, 330, r()), 2 + r() * 4, r() < 0.6 ? C.P13 : '#ffd6a0', 2.2 + r(), 2.2 + r()); } // quay lamps (south)
  // (review) a few moored boats close in (70–120 m, ≈5–7° below eye level): points in the lower window panes, where the high
  // night angles (S059, S062–S065) only see water — the horizon lights are above those frames
  for (const [b, d, y, k] of [[103, 82, 1.3, 2.4], [109, 96, 1.0, 2.0], [117, 74, 1.6, 2.6], [124, 118, 1.2, 1.8], [96, 130, 1.1, 1.6], [62, 60, 1.5, 2.6], [54, 66, 1.2, 2.2], [49, 78, 1.0, 1.9], [70, 64, 1.1, 1.7]]) lamp(b, d, y, C.P13, k * 1.7, 2.3);
  // (integration) the north mole's lamp line and a few more moored boats, 50–260 m out to the NE/E: harbour points at varied
  // depth in the lower panes of the high night angles (S059 looked into an empty navy sea)
  for (let i = 0; i < 8; i++) lamp(lerp(36, 74, i / 7), lerp(170, 250, i / 7), 2.2, C.P13, 2.0, 1.9);
  for (const [b, d, y, k] of [[44, 52, 1.2, 2.2], [58, 88, 1.0, 1.8], [66, 140, 1.4, 2.0], [41, 120, 1.1, 1.6], [78, 105, 1.3, 2.2], [52, 210, 1.6, 1.5]]) lamp(b, d, y, '#ffd9a0', k * 1.6, 2.2);
  const FISH = [[97, 1450], [109, 2150], [124, 3300], [92, 3900]];         // the 3–4 lamps still lit at dawn (S079–S081)
  for (const [b, d] of FISH) lamp(b, d, 1.5, C.P13, 5, 2.6, 1);
  const lightPts = (() => {
    const n = LP.length, pa = new Float32Array(n * 3), ca = new Float32Array(n * 3), sa = new Float32Array(n * 3);
    LP.forEach((l, i) => { pa.set(l.slice(0, 3), i * 3); ca.set(l.slice(3, 6), i * 3); sa.set([l[6], (i * 0.6180339) % 1, l[7]], i * 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pa, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(ca, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sa, 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uPxK: { value: ctx.H / 536 }, uK: { value: 1 }, uDawn: { value: 0 } },
      vertexShader: /* glsl */ `attribute vec3 aCol; attribute vec3 aS; uniform float uT, uPxK, uK, uDawn; varying vec3 vC;
        void main(){ float tw = 0.85 + 0.15 * sin(uT * (2.0 + aS.y * 5.0) + aS.y * 50.0);
          float blink = gl_VertexID == 0 ? 0.25 + 0.75 * smoothstep(0.55, 0.75, fract(uT / 4.0)) * (1.0 - smoothstep(0.9, 1.0, fract(uT / 4.0))) : 1.0;
          float keep = mix(1.0 - uDawn, 1.0, aS.z);                       // at dawn only the 'keep' lamps stay on
          vC = aCol * tw * blink * uK * keep; gl_PointSize = aS.x * 4.0 * uPxK * mix(1.0, 1.15, aS.z * uDawn);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); if (keep < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`,
      fragmentShader: /* glsl */ `varying vec3 vC; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); float a = exp(-r2 * 12.0) + 0.1 * exp(-r2 * 2.5); gl_FragColor = vec4(vC * a, 1.0); }` });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -5; scene.add(p); return p;
  })();
  sea.setLamps([LP[0], LP[8], LP[LP.length - 4], LP[LP.length - 3]].map((l) => ({ position: V(l[0], l[1], l[2]), color: new THREE.Color(l[3], l[4], l[5]).multiplyScalar(1 / Math.max(l[3], l[4], l[5])), intensity: 3.5 })));
  // background quad (draws extRT behind everything; no depth write → DOF treats it as infinitely far)
  const bgMat = new THREE.ShaderMaterial({ uniforms: { tBg: { value: null } }, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform sampler2D tBg; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tBg, vUv).rgb, 1.0); }` });
  const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat); bgQuad.frustumCulled = false; bgQuad.renderOrder = -1e6; scene.add(bgQuad);
  const extRTs = {};
  const extRT = (k) => extRTs[k] || (extRTs[k] = new THREE.WebGLRenderTarget(Math.round(ctx.W * k), Math.round(ctx.H * k), { type: THREE.HalfFloatType, depthBuffer: true }));
  function renderExterior(T, k, nested) {
    const r = ctx.renderer, rt = extRT(k), prev = r.getRenderTarget();
    const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
    camera.updateMatrixWorld(true);
    sea.update(T, camera);
    const pxk = nested ? 0.55 : k;
    for (const [u, v0] of coastPx) u.value = v0 * pxk;
    r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(true, true, true);
    r.render(extScene, camera);
    r.setRenderTarget(prev); r.setClearColor(cc, ca);
    for (const [u, v0] of coastPx) u.value = v0;
    bgMat.uniforms.tBg.value = rt.texture;
  }

  // ================================================================== interior shell
  const SILL_D = 0.24;
  const bayPoly = [[0, -ROOM_HALF], [BAY_BASE_X, -ROOM_HALF], [BAY_BASE_X, -BAY_HALF], [GLASS_X, -EAST_HALF], [GLASS_X, EAST_HALF], [BAY_BASE_X, BAY_HALF], [BAY_BASE_X, ROOM_HALF], [0, ROOM_HALF]];
  const floorPoly = [[-6, -ROOM_HALF], ...bayPoly.slice(1, 7), [-6, ROOM_HALF]];
  prism(floorPoly, -0.05, 0, mFloor, { sides: false });
  const ceilMesh = prism(bayPoly, CEIL, CEIL + 0.05, mCeil, { sides: false });
  wallQuad([BAY_BASE_X, -ROOM_HALF], [0, -ROOM_HALF], 0, CEIL, mPlaster);
  wallQuad([0, ROOM_HALF], [BAY_BASE_X, ROOM_HALF], 0, CEIL, mPlaster);
  wallQuad([BAY_BASE_X, -BAY_HALF], [BAY_BASE_X, -ROOM_HALF], 0, CEIL, mPlaster);
  wallQuad([BAY_BASE_X, ROOM_HALF], [BAY_BASE_X, BAY_HALF], 0, CEIL, mPlaster);
  const FACES = [
    { name: 'NE', a: [BAY_BASE_X, -BAY_HALF], b: [GLASS_X, -EAST_HALF], lites: 3 },
    { name: 'E', a: [GLASS_X, -EAST_HALF], b: [GLASS_X, EAST_HALF], lites: 2 },
    { name: 'SE', a: [GLASS_X, EAST_HALF], b: [BAY_BASE_X, BAY_HALF], lites: 3 },
  ];
  const LOW0 = SILL_Y + 0.05, LOW1 = 1.76, UP0 = 1.84, UP1 = HEAD_Y - 0.06;
  const glassMeshes = [];
  for (const F of FACES) {
    const [ax, az] = F.a, [bx, bz] = F.b; const L = Math.hypot(bx - ax, bz - az);
    const dir = [(bx - ax) / L, (bz - az) / L], nIn = [-dir[1], dir[0]];
    F.L = L; F.dir = dir; F.nIn = nIn;
    const ry = Math.atan2(-dir[1], dir[0]);
    const P = (s, y, d = 0) => V(ax + dir[0] * s + nIn[0] * d, y, az + dir[1] * s + nIn[1] * d);
    const ap = box(L, SILL_Y - 0.04, 0.12, mPlaster, 0, 0, 0, ry); ap.position.copy(P(L / 2, (SILL_Y - 0.04) / 2, -0.08));
    const hd = box(L + 0.02, CEIL - HEAD_Y, 0.3, mPlaster, 0, 0, 0, ry); hd.position.copy(P(L / 2, (CEIL + HEAD_Y) / 2, 0.08));
    const fw = 0.055, fd = 0.1;
    const bar = (s0, s1, y0, y1, d0 = 0.0, dd = fd) => { const b = box(Math.max(0.01, s1 - s0), y1 - y0, dd, mFrame, 0, 0, 0, ry); b.position.copy(P((s0 + s1) / 2, (y0 + y1) / 2, d0)); return b; };
    bar(0, L, SILL_Y, LOW0, 0.0);
    bar(0, L, LOW1, UP0, 0.0);
    bar(0, L, UP1, HEAD_Y, 0.0);
    for (let i = 0; i <= F.lites; i++) { const s = (L * i) / F.lites; const w = i === 0 || i === F.lites ? 0.08 : fw; bar(clamp(s - w / 2, 0, L), clamp(s + w / 2, 0, L), SILL_Y, HEAD_Y, 0.0); }
    for (let i = 0; i < F.lites; i++) { const s0 = (L * i) / F.lites, s1 = (L * (i + 1)) / F.lites; bar(s0, s1, (UP0 + UP1) / 2 - 0.011, (UP0 + UP1) / 2 + 0.011, 0.01, 0.03); bar((s0 + s1) / 2 - 0.011, (s0 + s1) / 2 + 0.011, UP0, UP1, 0.01, 0.03); }
    for (let i = 0; i < F.lites; i++) {
      const s0 = (L * i) / F.lites, s1 = (L * (i + 1)) / F.lites;
      for (const [y0, y1, wavy] of [[LOW0, LOW1, 0], [UP0, UP1, 1]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(s1 - s0, y1 - y0), null); m.position.copy(P((s0 + s1) / 2, (y0 + y1) / 2, -0.02)); m.rotation.y = ry; m.renderOrder = 20;
        m.userData = { face: F.name, wavy, lite: i }; glassMeshes.push(m); scene.add(m);
      }
    }
    F.P = P; F.ry = ry;
  }
  for (const z of [-EAST_HALF, EAST_HALF]) box(0.1, HEAD_Y - SILL_Y, 0.1, mFrame, GLASS_X - 0.03, (HEAD_Y + SILL_Y) / 2, z, Math.PI / 4);
  {
    const outer = [[BAY_BASE_X - 0.02, -BAY_HALF - 0.02], [GLASS_X + 0.03, -EAST_HALF - 0.012], [GLASS_X + 0.03, EAST_HALF + 0.012], [BAY_BASE_X - 0.02, BAY_HALF + 0.02]];
    const off = SILL_D + 0.02, k = Math.tan(22.5 * D2R) * off;
    const inner = [[BAY_BASE_X - 0.02, BAY_HALF + 0.02 - off * Math.SQRT2], [GLASS_X - off, EAST_HALF - k], [GLASS_X - off, -EAST_HALF + k], [BAY_BASE_X - 0.02, -BAY_HALF - 0.02 + off * Math.SQRT2]];
    prism([...outer, ...inner], SILL_Y - 0.04, SILL_Y, mSill);
  }
  // glazed screen to the corridor (x = 0) + a short moonlit corridor stub beyond it
  {
    const mScr = std({ color: hex('#3f3226'), roughness: 0.55 });
    for (const z of [-2.7, -1.6, -0.8, 0, 0.8, 1.6, 2.7]) box(0.08, CEIL, 0.07, mScr, 0, CEIL / 2, z);
    for (const y of [0.05, 0.95, 2.2, CEIL - 0.03]) box(0.08, 0.07, 5.4, mScr, 0, y, 0);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(5.4, CEIL), new THREE.MeshBasicMaterial({ color: 0x0a0e14, transparent: true, opacity: 0.12, depthWrite: false })); sg.position.set(0, CEIL / 2, 0); sg.rotation.y = Math.PI / 2; scene.add(sg);
    wallQuad([-6, -ROOM_HALF], [0, -ROOM_HALF], 0, CEIL + 2, std({ color: hex('#8E8A84'), roughness: 0.9 }), [-3, 0]);
    wallQuad([0, ROOM_HALF], [-6, ROOM_HALF], 0, CEIL + 2, std({ color: hex('#77746e'), roughness: 0.9 }), [-3, 0]);
    const pm = new THREE.MeshBasicMaterial({ color: hex('#9fb0c8').multiplyScalar(0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const x of [-2.0, -6.0]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), pm); p.rotation.x = -Math.PI / 2; p.position.set(x + 0.4, 0.003, 0.6); scene.add(p); }
  }
  // built-in teak bench (trapezoid seat following the canted walls), thin grey cushion
  const BENCH_X0 = 3.00, BENCH_X1 = 3.38;
  {
    const zAt = (x) => EAST_HALF + (GLASS_X - x) - 0.03;
    prism([[BENCH_X0, -zAt(BENCH_X0)], [BENCH_X1, -zAt(BENCH_X1)], [BENCH_X1, zAt(BENCH_X1)], [BENCH_X0, zAt(BENCH_X0)]], SEAT_Y - 0.075, SEAT_Y - 0.03, mBench);
    prism([[BENCH_X0 + 0.04, -zAt(BENCH_X0 + 0.04)], [BENCH_X1 - 0.05, -zAt(BENCH_X1 - 0.05)], [BENCH_X1 - 0.05, zAt(BENCH_X1 - 0.05)], [BENCH_X0 + 0.04, zAt(BENCH_X0 + 0.04)]], 0, SEAT_Y - 0.075, mBench);
    const cz = zAt(BENCH_X1) - 0.12;
    prism([[BENCH_X0 + 0.03, -cz - 0.1], [BENCH_X1 - 0.02, -cz], [BENCH_X1 - 0.02, cz], [BENCH_X0 + 0.03, cz + 0.1]], SEAT_Y - 0.03, SEAT_Y, mCushion);
  }
  // reading lamp: floor lamp in the NE corner, arched arm, linen shade over the bench end
  const lampGrp = new THREE.Group(); scene.add(lampGrp);
  const mLampMetal = std({ color: hex(C.lampMetal), roughness: 0.35, metalness: 0.7 });
  const shadeMat = std({ color: hex(C.lampShade), roughness: 0.9, emissive: K2700.clone(), emissiveIntensity: 0.32, side: THREE.DoubleSide });
  {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.025, 32), mLampMetal); base.position.copy(LAMP_BASE).add(V(0, 0.012, 0)); lampGrp.add(base);
    const top = V(LAMP_BASE.x, 1.55, LAMP_BASE.z);
    const curve = new THREE.CatmullRomCurve3([V(LAMP_BASE.x, 0.02, LAMP_BASE.z), V(LAMP_BASE.x, 1.2, LAMP_BASE.z), top, V(lerp(top.x, LAMP_HEAD.x, 0.55), 1.82, lerp(top.z, LAMP_HEAD.z, 0.55)), LAMP_HEAD.clone().add(V(0, 0.1, 0))]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.009, 8, false), mLampMetal); stem.castShadow = true; lampGrp.add(stem);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.15, 0.17, 40, 1, true), shadeMat); shade.position.copy(LAMP_HEAD); lampGrp.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), new THREE.MeshBasicMaterial({ color: K2700.clone().multiplyScalar(5) })); bulb.position.copy(LAMP_HEAD).add(V(0, -0.02, 0)); lampGrp.add(bulb);
  }
  const lampGlow = FX.glow({ color: K2700, size: 0.5, intensity: 0.2, falloff: 2.6 }); lampGlow.object3D.position.copy(LAMP_HEAD).add(V(0, -0.04, 0)); scene.add(lampGlow.object3D);

  // ================================================================== props
  // --- tea cups (PROP_TEA): lathe, celadon-white glaze, one cobalt line 6 mm below the rim, his with a chip
  const CUP_PROFILE = [[0.0, 0.0025], [0.020, 0.0018], [0.0235, 0.0], [0.0268, 0.0012], [0.0272, 0.006], [0.0262, 0.0075], [0.030, 0.011], [0.0345, 0.022], [0.0378, 0.036], [0.0398, 0.050], [0.0408, 0.062], [0.0411, 0.0672],
    [0.0404, 0.068], [0.0390, 0.0668], [0.0384, 0.060], [0.0370, 0.046], [0.0338, 0.029], [0.0285, 0.0155], [0.019, 0.0098], [0.0, 0.0092]].map(([r, y]) => new THREE.Vector2(r, y));
  const envCups = makeCupEnv();
  const CHIP_PHI = 0;                                        // chip direction in cup space (+Z); cups are turned per shot
  function cupGeometry(chip) {
    const g = new THREE.LatheGeometry(CUP_PROFILE, 96);
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let k = 0;
      if (chip && y > 0.0625) { let dphi = Math.atan2(x, z) - CHIP_PHI; dphi = Math.atan2(Math.sin(dphi), Math.cos(dphi)); k = Math.exp(-(dphi * dphi) / (2 * 0.06 * 0.06)); pos.setY(i, y - 0.0032 * k * smoothstep(0.0625, 0.068, y)); }
      const c = new THREE.Color(1, 1, 1).lerp(hex('#c4b9a6'), clamp(k * 1.6, 0, 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  const glazeMat = new THREE.MeshPhysicalMaterial({ color: hex(C.glaze), roughness: 0.14, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.06, vertexColors: true, envMap: envCups, envMapIntensity: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: hex(C.P07), roughness: 0.2, envMap: envCups, envMapIntensity: 0.6 });
  const teaMat = new THREE.MeshStandardMaterial({ color: hex('#8f6a2a'), emissive: hex('#4a3412'), emissiveIntensity: 0.35, roughness: 0.12, metalness: 0, envMap: envCups, envMapIntensity: 0.12 });
  const leafMat = std({ color: hex('#5a5a2c'), roughness: 0.6 });
  function makeCup(chip) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(cupGeometry(chip), glazeMat); body.castShadow = body.receiveShadow = true; g.add(body);
    // the cobalt line: an open band (gap at the chip so the line is 'complete' on the visible side)
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.04099, 0.04091, 0.0021, 128, 1, true), lineMat); line.position.y = 0.062; g.add(line);   // (integration) 2.1 mm: the 1.3 mm line aliased into dots at S063 distances
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.0372, 48), teaMat); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.054; g.add(tea);
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), leafMat); leaf.scale.set(1, 0.45, 1); leaf.rotation.set(-Math.PI / 2, 0, 0.7); leaf.position.set(0.009, 0.0545, -0.006); g.add(leaf);
    g.userData.tea = tea;
    return g;
  }
  const cupG = makeCup(true), cupR = makeCup(false);
  scene.add(cupG, cupR);
  const steamG = FX.steam({ position: [0, 0.07, 0], count: 30, height: 0.28, width: 0.02, opacity: 0.13, size: 0.045, rate: 0.18, seed: 3 });
  const steamR = FX.steam({ position: [0, 0.07, 0], count: 30, height: 0.28, width: 0.02, opacity: 0.13, size: 0.045, rate: 0.18, seed: 7 });
  scene.add(steamG.object3D, steamR.object3D);

  // --- thermos (XREF_THERMOS): dull unbranded steel flask ~25 cm, a dent, scuffed navy cup-lid
  const thermos = new THREE.Group(); scene.add(thermos);
  const thermosLid = new THREE.Group(); thermos.add(thermosLid);
  {
    const prof = [[0, 0], [0.036, 0], [0.040, 0.006], [0.0405, 0.19], [0.037, 0.205], [0.026, 0.215], [0.026, 0.224], [0, 0.224]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 48);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const phi = Math.atan2(x, z); const d = Math.exp(-((phi - 2.4) ** 2) / 0.05 - ((y - 0.09) ** 2) / 0.0006); const r = Math.hypot(x, z); if (r > 0.001) { const s = (r - 0.004 * d) / r; p.setX(i, x * s); p.setZ(i, z * s); } }
    g.computeVertexNormals();
    const steel = new THREE.MeshStandardMaterial({ color: hex(C.steel), roughness: 0.42, metalness: 0.85, envMap: envCups, envMapIntensity: 1.0 });
    const body = new THREE.Mesh(g, steel); body.castShadow = body.receiveShadow = true; thermos.add(body);
    const cv = canvas(256, 64), gg = cv.getContext('2d'); gg.fillStyle = C.navyLid; gg.fillRect(0, 0, 256, 64); const r = rng(77);
    for (let i = 0; i < 90; i++) { gg.strokeStyle = `rgba(190,198,215,${0.08 + r() * 0.2})`; gg.lineWidth = 0.6 + r(); gg.beginPath(); const x = r() * 256, y = r() * 64; gg.moveTo(x, y); gg.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6); gg.stroke(); }
    const lidMat = new THREE.MeshStandardMaterial({ map: ctex(cv), roughness: 0.55, metalness: 0.1 });
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.0425, 0.072, 40), lidMat); lid.position.y = 0.036; lid.castShadow = true; thermosLid.add(lid);
    const lidTop = new THREE.Mesh(new THREE.SphereGeometry(0.044, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), lidMat); lidTop.scale.y = 0.18; lidTop.position.y = 0.072; thermosLid.add(lidTop);
    thermosLid.position.y = 0.19;
  }
  const streamMat = new THREE.MeshStandardMaterial({ color: hex(C.P30), roughness: 0.1, emissive: hex('#6a5228'), emissiveIntensity: 0.5, transparent: true, opacity: 0.85 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0032, 1, 8, 1, true), streamMat); stream.visible = false; scene.add(stream);

  // --- phone (PROP_PHONE): dark grey, worn navy flip case (cracked corner), soft unreadable UI
  const phone = new THREE.Group();
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  {
    const cv = canvas(256, 128), g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#5d6e86'); gr.addColorStop(0.5, '#3e4c62'); gr.addColorStop(1, '#2c3648'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.filter = 'blur(7px)';
    g.fillStyle = 'rgba(225,232,242,0.85)'; g.beginPath(); g.arc(70, 64, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(220,228,240,0.55)'; g.fillRect(108, 30, 10, 68);
    g.fillStyle = 'rgba(220,228,240,0.3)'; g.fillRect(128, 40, 7, 48);
    g.fillStyle = 'rgba(200,214,205,0.75)'; g.beginPath(); g.arc(212, 64, 17, 0, Math.PI * 2); g.fill();
    g.filter = 'none';
    phoneScreenMat.map = ctex(cv);
    // (integration) a worn navy flip case: matte case shell (no chrome bezel), the front cover hinged on the left long edge —
    // open flat beside the phone while he reads, closed over the screen as he lays it down (the light goes out with it);
    // the cracked corner is on the case back, which is what we see when it lies face down on his thigh
    const caseMat = new THREE.MeshStandardMaterial({ color: hex(C.phoneCase), roughness: 0.82 });
    const caseIn = new THREE.MeshStandardMaterial({ color: hex('#1c2333'), roughness: 0.9 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.012, 0.078), caseMat); back.castShadow = true; phone.add(back);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.146, 0.004, 0.071), new THREE.MeshStandardMaterial({ color: hex('#2c2f34'), roughness: 0.8, metalness: 0.0 })); body.position.y = 0.007; phone.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.134, 0.064), phoneScreenMat); scr.rotation.set(-Math.PI / 2, 0, 0); scr.position.y = 0.0092; phone.add(scr);
    {
      const cv = canvas(128, 64), g = cv.getContext('2d'); g.fillStyle = C.phoneCase; g.fillRect(0, 0, 128, 64);
      const r = rng(41);
      for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(150,160,180,${0.05 + r() * 0.12})`; g.lineWidth = 0.6; g.beginPath(); const x = r() * 128, y = r() * 64; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 4); g.stroke(); }
      g.strokeStyle = 'rgba(175,182,198,0.95)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(128, 9); g.lineTo(117, 13); g.lineTo(112, 21); g.lineTo(104, 24); g.moveTo(117, 13); g.lineTo(121, 22); g.stroke();
      g.fillStyle = 'rgba(160,168,186,0.55)'; g.beginPath(); g.moveTo(128, 0); g.lineTo(119, 0); g.lineTo(128, 8); g.fill();
      const backTex = ctex(cv);
      const bk = new THREE.Mesh(new THREE.PlaneGeometry(0.152, 0.078), new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.8 })); bk.rotation.set(Math.PI / 2, 0, 0); bk.position.y = -0.00605; phone.add(bk);
    }
    const coverPivot = new THREE.Group(); coverPivot.position.set(0, 0.0062, -0.039); phone.add(coverPivot);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.0035, 0.078), [caseMat, caseMat, caseMat, caseIn, caseMat, caseMat]); cover.position.set(0, 0.0048, 0.039); cover.castShadow = true; coverPivot.add(cover);
    phone.userData.cover = coverPivot;
    phone.userData.screen = scr;
  }
  scene.add(phone);
  const phoneLight = new THREE.PointLight(K6500, 0, 1.0, 2); scene.add(phoneLight);

  // --- folded gloves (PROP_GLOVES): a folded pair, warm white knit, ribbed cuffs
  const gloves = new THREE.Group();
  {
    const gm = new THREE.MeshStandardMaterial({ color: hex(C.glove), roughness: 0.95 });
    const shape = new THREE.Shape(); shape.moveTo(-0.04, -0.07); shape.lineTo(0.04, -0.07); shape.quadraticCurveTo(0.047, 0.04, 0.03, 0.075); shape.quadraticCurveTo(0, 0.085, -0.03, 0.075); shape.quadraticCurveTo(-0.047, 0.04, -0.04, -0.07);
    const eg = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }); eg.rotateX(-Math.PI / 2);
    const a = new THREE.Mesh(eg, gm); a.castShadow = a.receiveShadow = true; gloves.add(a);
    const b = new THREE.Mesh(eg, gm); b.position.set(0.004, 0.012, -0.006); b.rotation.y = 0.07; b.castShadow = b.receiveShadow = true; gloves.add(b);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.014, 0.028), new THREE.MeshStandardMaterial({ color: hex('#e6e2d6'), roughness: 1 })); cuff.position.set(0.002, 0.016, 0.062); gloves.add(cuff);
  }
  for (const c of gloves.children) { c.scale.multiplyScalar(0.74); c.position.multiplyScalar(0.74); }   // a folded pair ≈ 6 × 11 cm (review: read as a slab)
  scene.add(gloves);

  // ================================================================== figures + close-up hands
  const G = await loadCharacter('GUARD', { lod: 'hi' });
  const R = await loadCharacter('RESTORER', { lod: 'hi', gloves: false });
  const REF_LAYER = 3;                                        // S081 reflection pass: figures (+ lights) only
  for (const f of [G, R]) { f.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.layers.enable(REF_LAYER); } }); scene.add(f.root); }
  // S064 insert hands (lod close, sleeve cuffs; RESTORER LEFT cuff carries the worn spot)
  const hGL = await loadCharacterHand('GUARD', 'L', { lod: 'close', hand: { forearmLen: 0.3 } });
  const hGR = await loadCharacterHand('GUARD', 'R', { lod: 'close', hand: { forearmLen: 0.3 } });
  const hRL = await loadCharacterHand('RESTORER', 'L', { lod: 'close', gloves: false, hand: { forearmLen: 0.3 } });
  const insertHands = [hGL, hGR, hRL];
  // sleeves beyond the cuff stubs (the insert hands carry only a short cuff; the forearm would read bare)
  {
    // review: the tube starts inside the end of the library cuff stub (len 0.13) and has the stub's elliptical section (x 0.86)
    // — a round tube from y 0.03 cut visible notches through the elliptical stub
    const sleeve = (h, mat, r0, r1, y0, len) => { const g = new THREE.CylinderGeometry(r1, r0, len, 28, 1, true); g.translate(0, y0 + len / 2, 0); g.scale(0.88, 1, 1); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; h.byName.forearm.add(m); };
    const mJacket = TX.mat('wool_coat', { color: hex('#23304A'), repeat: [3, 3], side: THREE.DoubleSide });
    const mCoat = TX.mat('wool_coat', { color: hex('#3C4045'), repeat: [3, 3], side: THREE.DoubleSide });
    sleeve(hGL, mJacket, 0.054, 0.063, 0.10, 0.3); sleeve(hGR, mJacket, 0.054, 0.063, 0.10, 0.3);
    sleeve(hRL, mCoat, 0.052, 0.062, 0.10, 0.46);   // (integration) longer: its far end left the S064 frame at the lower-left corner
  }
  for (const h of insertHands) { h.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(h.root); h.root.visible = false; }
  // the worn spot (bible #5A5E62 on the #3C4045 melton) is ~1/3 stop lighter than the cloth: under the lamp at 100 mm it
  // vanished at 960 px. Lifted a touch for the insert (the abrasion's pilled fibres catch the light) — ?wornred=1 shows it red
  for (const c of hRL.meshes.cuffs || []) { const u = c.material.userData.fzUniforms; if (u && u.uWearColor) u.uWearColor.value.set(q.get('wornred') ? '#ff0000' : '#74787c'); }
  // reading glasses ON the face (S059–S060): a pair on the head bone; the library's hanging pair is the cord accessory
  const faceGlasses = new THREE.Group();
  {
    const fm = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.35 });
    const hu = G.P.hu;
    for (const sg of [1, -1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0205, 0.0017, 6, 24), fm); rim.scale.set(1.2, 0.78, 1); rim.position.set(sg * 0.031, 0, 0); faceGlasses.add(rim);
      const tmp = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0022, 0.1), fm); tmp.position.set(sg * 0.056, 0.004, -0.05); faceGlasses.add(tmp);
    }
    const br = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0015, 5, 10, Math.PI), fm); br.position.set(0, 0.004, 0); faceGlasses.add(br);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.057, 0.004, -0.1), V(0.06, -0.06, -0.12), V(0, -0.1, -0.13), V(-0.06, -0.06, -0.12), V(-0.057, 0.004, -0.1)]), 30, 0.0012, 5, false), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 }));
    faceGlasses.add(cord);
    faceGlasses.position.set(0, 0.33 * hu - 0.006, 0.42 * hu + 0.012);
    faceGlasses.rotation.x = 0.1;
    G.bone('head').add(faceGlasses);
  }
  const hangGlasses = G.accessories.glasses_cord;
  { const hm = G.materials.hair; if (hm) { hm.color.set('#2c2825'); if (hm.sheenColor) hm.sheenColor.set('#5a534c'); const u = hm.userData.fzUniforms; if (u && u.uGrey) u.uGrey.value = 0.5; } }   // (integration) salt-and-pepper, darker at the temples — not a pale cap
  // (integration) NaN guard for the figure materials: figure_mat's bump perturbation normalises a zero vector where a
  // sub-pixel sliver of a swept trim (coat.trim) has degenerate screen derivatives — one NaN pixel, spread by the bloom chain,
  // blacked out f4884 (S065) at 960 px. Fall back to the unperturbed normal there (no visible change elsewhere).
  function nanGuard(root) {
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      for (const m of [].concat(o.material)) {
        if (m.userData.nanGuard || !m.isMeshStandardMaterial) continue;
        m.userData.nanGuard = true;
        const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
        m.onBeforeCompile = function (sh, r) {
          if (prev) prev.call(this, sh, r);
          sh.fragmentShader = sh.fragmentShader.replace('#include <clearcoat_normal_fragment_begin>', 'if (!(dot(normal, normal) > 1e-8)) normal = nonPerturbedNormal;\n#include <clearcoat_normal_fragment_begin>');
        };
        m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|nanGuard'; };
        m.needsUpdate = true;
      }
    });
  }
  for (const f of [G.root, R.root, ...insertHands.map((h) => h.root)]) nanGuard(f);

  // ================================================================== lights
  // reading lamp: the key at night (2700 K) — the one shadow caster at night
  const lampKey = new THREE.SpotLight(K2700, 2.6, 0, 0.8, 0.9, 2);
  lampKey.position.copy(LAMP_HEAD).add(V(0, -0.06, 0)); lampKey.target.position.set(3.45, 0.40, -0.05);
  lampKey.castShadow = true; lampKey.shadow.mapSize.set(1024, 1024); lampKey.shadow.bias = -0.0001; lampKey.shadow.normalBias = 0.004; lampKey.shadow.radius = 3;
  lampKey.shadow.camera.near = 0.1; lampKey.shadow.camera.far = 4.5;
  scene.add(lampKey, lampKey.target);
  const lampUp = new THREE.PointLight(K2700, 0.12, 4.5, 2); lampUp.position.copy(LAMP_HEAD).add(V(0, 0.2, 0)); scene.add(lampUp);
  const bounce = new THREE.PointLight(hex('#ffcf9e'), 0.18, 3.0, 2); bounce.position.set(2.92, 0.16, -0.95); scene.add(bounce);   // the lamp's pool on the floor (integration: was behind his back → hot spot)
  // the window: night = faint cool harbour/sky light; dawn = the key (soft, big). Shadows only at dawn.
  const winLight = new THREE.SpotLight(hex('#9fb2d4'), 0, 0, 1.25, 1.0, 2);
  winLight.position.set(5.6, 1.9, 0.9); winLight.target.position.set(2.4, 0.9, -0.2);
  winLight.shadow.mapSize.set(1024, 1024); winLight.shadow.bias = -0.0002; winLight.shadow.normalBias = 0.006; winLight.shadow.radius = 6;
  winLight.shadow.camera.near = 0.5; winLight.shadow.camera.far = 9;
  scene.add(winLight, winLight.target);
  // thin cool edge from the corridor's moonlit arches (behind, west / south-west)
  const moonEdge = new THREE.SpotLight(MOONC, 0.3, 0, 0.5, 1.0, 2);
  moonEdge.position.set(-3.5, 3.4, 2.2); moonEdge.target.position.set(3.4, 1.0, 0); scene.add(moonEdge, moonEdge.target);
  // camera-side fill: the lamp's bounce off the white frames / plaster (aimed per shot)
  const fill = new THREE.SpotLight(hex('#ffd9b4'), 2.0, 0, 0.75, 1.0, 2);
  fill.position.set(1.7, 0.95, 1.9); fill.target.position.set(3.45, 0.95, -0.05); scene.add(fill, fill.target);
  // face kicker (per shot): a soft warm point, like lamp light off the white sill
  const kick = new THREE.PointLight(hex('#ffc890'), 0, 1.6, 2); scene.add(kick);
  const hemi = new THREE.HemisphereLight(hex('#4a5c7c'), hex('#2a2018'), 0.06); scene.add(hemi);
  // the morning ray (S081, last chord): a soft volumetric shaft through the SE window's lower lite
  const SE = FACES[2];
  // (review) a narrow beam at steam height, entering from the SE side (screen right) and crossing both steam columns against
  // the dark sea band and the mullion — the old prism sat above the frame top and was broad enough to fog half the frame
  const RAY_DIR = V(-0.06, -0.11, -0.64).normalize();               // from the upper right (SE side) down into the steam
  const rayShaft = FX.windowShaft({ center: [3.905, 0.895, 0.53], right: [0.03, 0, 0], up: [0, 0.022, 0],
    dir: RAY_DIR.toArray(), length: 0.72, color: 0xffe2bc, intensity: 0.0, noise: 0.45, soft: 0.6, steps: 8 });
  rayShaft.object3D.visible = false; scene.add(rayShaft.object3D);

  // ================================================================== window glass (reflections)
  // Static reflection of the lit interior: a cube capture from the bench (figures + exterior hidden) — the lamp and the
  // warm room in the night panes. S081 adds a reflection layer of the two seated people (approved through-view +
  // reflection layering cheat): an RT of the pair seen from the window side, mirrored, composited into a screen rect.
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.05, 50, cubeRT);
  cubeCam.position.set(3.0, 1.3, 0.0);
  const refRT = new THREE.WebGLRenderTarget(512, 384, { type: THREE.HalfFloatType });
  const REF_RECT = [0.0, 0.45, 0.392, 1.0];                    // S081: the left lite (screen x 0 … mullion, y from the bottom: glass bottom … top)
  const REF_RECT_ASPECT = (REF_RECT[2] - REF_RECT[0]) * ctx.W / ((REF_RECT[3] - REF_RECT[1]) * ctx.H);
  const refCam = new THREE.PerspectiveCamera(30, 512 / 384, 0.05, 30); refCam.layers.set(REF_LAYER);
  scene.traverse((o) => { if (o.isLight) o.layers.enable(REF_LAYER); });
  const glassUniforms = {
    uCube: { value: cubeRT.texture }, uRefl: { value: 1.0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uNoise: { value: TX.noiseTexture() },
    uRefTex: { value: refRT.texture }, uRefRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uRefK: { value: 0 }, uRes: { value: new THREE.Vector2(ctx.W, ctx.H) },
  };
  const glassMat = (wavy) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { ...glassUniforms, uWavy: { value: wavy } },
    vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform samplerCube uCube; uniform sampler2D uNoise, uRefTex; uniform float uRefl, uWavy, uRefK; uniform vec3 uTint; uniform vec4 uRefRect; uniform vec2 uRes;
      varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 V = normalize(vW - cameraPosition); vec3 N = normalize(vN); if (dot(N, V) > 0.0) N = -N;
        vec2 nz = texture2D(uNoise, vW.zy * vec2(0.9, 2.6) + vW.x * 0.3).rg - 0.5;
        vec2 nz2 = texture2D(uNoise, vW.zy * vec2(3.5, 7.0)).ba - 0.5;
        vec3 Np = normalize(N + vec3(nz.x, nz.y, nz.x) * (0.018 + 0.05 * uWavy) + vec3(nz2.x, nz2.y, 0.0) * 0.012 * uWavy);
        float c = clamp(dot(-V, Np), 0.0, 1.0);
        float F = 0.045 + 0.955 * pow(1.0 - c, 5.0);
        vec3 col = textureCube(uCube, reflect(V, Np)).rgb * F * uRefl * uTint;
        if (uRefK > 0.0) {
          vec2 s = gl_FragCoord.xy / uRes;
          vec2 r = (s - uRefRect.xy) / (uRefRect.zw - uRefRect.xy) + (Np.zy - N.zy) * vec2(0.6, 0.4);
          float m = smoothstep(0.0, 0.12, r.x) * smoothstep(1.0, 0.88, r.x) * smoothstep(0.0, 0.1, r.y) * smoothstep(1.0, 0.9, r.y);
          col += texture2D(uRefTex, vec2(1.0 - r.x, r.y)).rgb * uRefK * m;
        }
        gl_FragColor = vec4(col, 0.05 + 0.04 * uWavy);
      }`,
  });
  const gmCache = {};
  for (const m of glassMeshes) m.material = gmCache[m.userData.wavy] || (gmCache[m.userData.wavy] = glassMat(m.userData.wavy));
  // cube capture of the interior once (lamp on, night): figures, glass and props hidden
  {
    const hide = [G.root, R.root, bgQuad, lightPts, ...glassMeshes, cupG, cupR, thermos, phone, gloves, steamG.object3D, steamR.object3D, ...insertHands.map((h) => h.root)];
    const vis = hide.map((o) => o.visible);
    for (const o of hide) o.visible = false;
    scene.background = new THREE.Color(0x02040a);
    cubeCam.update(ctx.renderer, scene);
    scene.background = null;
    hide.forEach((o, i) => { o.visible = vis[i]; });
  }

  // ================================================================== time-of-night: sky / exterior / window light
  // dawn progress d: 0 = night … 1 = predawn (P20) … 2 = dawn (P21/P22); keyed to the song (bible §2.3 dawn table)
  const DAWN = [[186, 0], [215, 0], [226.3, 0.16], [233.9, 0.36], [237.1, 0.86], [240.0, 1.0], [242.0, 1.18], [246.0, 1.42], [249.3, 1.58], [256.9, 1.86]];
  const dawnAt = (T) => keys(DAWN, T, ease.linear);
  const SKY_N = { preset: 'night', ...SKY_BASE, exposure: 0.85 };
  const SKY_P = { preset: 'predawn', ...SKY_BASE, sunAz: 114, sunElev: -7, moonIntensity: 0, moonHalo: 0, stars: 0.12, exposure: 1.0, cloudCover: 0.3 };
  const SKY_D = { preset: 'dawn', ...SKY_BASE, sunAz: 116, sunElev: -1.2, sunDisc: 0, moonIntensity: 0, moonHalo: 0, stars: 0, exposure: 1.0, cloudCover: 0.32, sunGlow: 0.85, sunGlowWidth: 9 };
  const SKY_D81 = { ...SKY_D, horizon: [q.get('hz81') ? '#' + q.get('hz81') : '#6f7d9c', 0.55], haze: ['#8e98b0', 0.5], hazeAmt: 0.14, zenith: ['#4a6690', 0.62], sunColor: ['#EBB894', 1.0], sunGlow: +(q.get('sg81') || 1.8), sunSharp: +(q.get('ss81') || 140), sunGlowWidth: 9,
    cloudLit: ['#e9c2aa', 0.6], cloudDark: ['#687090', 0.36], cloudCover: 0.3 };
  let dNow = 0;
  function setTime(T, d = dawnAt(T)) {
    dNow = d;
    if (d <= 1) sky.blend(SKY_N, SKY_P, smoothstep(0, 1, d)); else sky.blend(SKY_P, SKY_D, smoothstep(0, 1, d - 1));
    sky.update(T); coastN.update(T); coastS.update(T);
    sky.uniforms.uSkyExposure.value = lerp(1.0, 0.62, smoothstep(1.0, 1.75, d));   // keep the dawn sky inside the latitude of the room
    const lu = lightPts.material.uniforms; lu.uT.value = T; lu.uK.value = lerp(1, 0.8, clamp(d - 1, 0, 1)); lu.uDawn.value = smoothstep(0.7, 1.3, d);
    const hz = sky.horizonColor(V(1, 0, 0.3));
    for (const m of silMats) { const k = clamp(m.userData.dist / 6000, 0, 1); m.color.setRGB(0.006, 0.008, 0.013).lerp(hz, clamp(0.12 + 0.55 * k, 0, 0.8) * (0.4 + 0.6 * smoothstep(0, 1.6, d))); }
    const wk = d <= 1 ? lerp(0.05, 0.9, smoothstep(0.1, 1, d)) : lerp(0.9, 3.4, smoothstep(0, 0.9, d - 1));
    const wc = d <= 1 ? hex('#8ea4cc').lerp(hex('#a9b6cc'), d) : hex('#a9b6cc').lerp(hex('#ffe2c4'), smoothstep(0, 0.85, d - 1));
    winLight.intensity = wk * 2.4; winLight.color.copy(wc);
    hemi.intensity = 0.06 + 0.25 * smoothstep(0.3, 1.8, d); hemi.color.copy(wc);
    moonEdge.intensity = 0.3 * (1 - smoothstep(0.6, 1.4, d));
    glassUniforms.uRefl.value = lerp(1.0, 0.35, smoothstep(0.6, 1.6, d));      // interior reflections fade as the outside brightens
    return d;
  }

  // ================================================================== figure + prop helpers
  const W = (fig, x, y, z) => fig.root.localToWorld(V(x, y, z));   // root-space → world
  const dirW = (fig, x, y, z) => fig.root.localToWorld(V(x, y, z)).sub(fig.root.position).normalize();
  const fwdOf = (fig) => dirW(fig, 0, 0, 1);
  const leftOf = (fig) => dirW(fig, 1, 0, 0);
  const easeIO = ease.inOutSine;
  const ramp = (t, a, b) => easeIO(clamp((t - a) / (b - a), 0, 1));
  const pulse = (t, a, b) => (t > a && t < b ? Math.sin(Math.PI * (t - a) / (b - a)) : 0);
  function seat(fig, at, yaw, o = {}) {
    fig.root.position.copy(at); fig.root.rotation.set(0, Math.PI / 2 + yaw, 0);
    fig.pose('sit_bench', { seat: SEAT_Y, lean: o.lean ?? 0.2, hands: 'none', feet: o.feet ?? -0.02 });
    if (o.add) fig.pose(o.add, { add: true });
    fig.root.updateMatrixWorld(true);
  }
  function putWorld(obj, pos, ry = 0) { if (obj.parent !== scene) scene.add(obj); obj.position.copy(pos); obj.rotation.set(0, ry, 0); obj.scale.setScalar(1); obj.updateMatrixWorld(true); }
  function putLocal(obj, parent, pos, rot) { if (obj.parent !== parent) parent.add(obj); obj.position.copy(pos); obj.rotation.copy(rot); obj.updateMatrixWorld(true); }
  // cup chip direction: turn the cup so the chip sits at the viewer's 2 o'clock (12 = away from camera, 3 = right)
  function chipYawFor(cupPos) {
    const f = cupPos.clone().sub(camera.position); f.y = 0; f.normalize();
    const r = V(-f.z, 0, f.x);                                // camera right in plan
    const d = f.multiplyScalar(Math.cos(60 * D2R)).add(r.multiplyScalar(Math.sin(60 * D2R)));
    return Math.atan2(d.x, d.z) - CHIP_PHI;
  }
  // hold a cup: socket 'cup' origin = gripped cylinder centre, +Y across the palm (toward the thumb) → cup axis along +Y
  const CUP_IN_SOCKET = { pos: V(0, -0.034, 0.0), rot: new THREE.Euler(0, 0, 0) };
  function holdCup(fig, side, cup, grip = 'hold_cup') { const h = fig.hands[side]; h.pose(grip, { radius: 0.036 }); putLocal(cup, h.sockets.cup, CUP_IN_SOCKET.pos, CUP_IN_SOCKET.rot); }
  // 2-pass IK so that a hand's socket lands on gripWorld
  function reachSocket(fig, side, gripWorld, opt, socket = 'cup') {
    const h = fig.hands[side]; const tgt = gripWorld.clone();
    for (let i = 0; i < 3; i++) { fig.reach(side, tgt, opt); const sw = h.sockets[socket].getWorldPosition(V(0, 0, 0)); tgt.add(gripWorld.clone().sub(sw)); }
    fig.reach(side, tgt, opt);
  }
  const CUP_GRIP = 0.034;
  const gripAt = (base) => base.clone().add(V(0, CUP_GRIP, 0));
  function resetProps() {
    faceGlasses.visible = false; if (hangGlasses) hangGlasses.visible = true;
    phone.visible = true; phoneLight.intensity = 0; phoneScreenMat.color.setScalar(0);
    gloves.visible = true; thermos.visible = true; thermosLid.position.set(0, 0.19, 0); thermosLid.rotation.set(0, 0, 0); if (thermosLid.parent !== thermos) thermos.add(thermosLid);
    stream.visible = false; cupG.visible = cupR.visible = true; steamG.object3D.visible = steamR.object3D.visible = true;
    G.root.visible = R.root.visible = true; for (const h of insertHands) h.root.visible = false;
    glassUniforms.uRefK.value = 0; rayShaft.object3D.visible = false;
    lampGrp.visible = true; lampGlow.object3D.visible = true; ceilMesh.visible = true;
    lampKey.castShadow = true; winLight.castShadow = false;
    lampKey.intensity = 2.6; lampKey.angle = 0.8; lampKey.color.copy(K2700); shadeMat.emissiveIntensity = 0.32; lampGlow.set(0.2); fill.intensity = 2.0; kick.intensity = 0; kick.distance = 1.6; bounce.intensity = 0.18;
    fill.position.set(1.7, 0.95, 1.9); fill.target.position.set(3.45, 0.95, -0.05); fill.angle = 0.75; fill.penumbra = 1.0; fill.color.set('#ffd9b4');
    lampKey.target.position.set(3.45, 0.40, -0.05); lampUp.intensity = 0.12;
    moonEdge.position.set(-3.5, 3.4, 2.2); moonEdge.target.position.set(3.4, 1.0, 0); moonEdge.angle = 0.5; moonEdge.penumbra = 1.0;
    for (const g of glassMeshes) g.visible = true;
    lightPts.material.uniforms.uPxK.value = ctx.H / 536;
    mFrame.color.copy(FRAME_COL); mSill.color.set('#e2ddd2'); seaU.uReflect.value = 1;
    phone.userData.cover.rotation.x = 0;
  }
  function steamUpdate(T, kG, kR, light, wind = [0.012, -0.004]) {
    steamG.object3D.position.copy(cupG.getWorldPosition(V(0, 0, 0))).add(V(0, 0.062, 0)); steamR.object3D.position.copy(cupR.getWorldPosition(V(0, 0, 0))).add(V(0, 0.062, 0));
    steamG.update(T, { light: light * kG, wind }); steamR.update(T + 3.7, { light: light * kR, wind });
    steamG.material.uniforms.uOp.value = 0.13 * Math.min(1, kG * 1.5); steamR.material.uniforms.uOp.value = 0.13 * Math.min(1, kR * 1.5);
    steamG.object3D.visible = kG > 0.001 && cupG.visible; steamR.object3D.visible = kR > 0.001 && cupR.visible;
  }
  function phoneGlow(k) {
    phoneScreenMat.color.setScalar(0.42 * k);
    const sn = V(0, 1, 0).transformDirection(phone.matrixWorld);
    phone.userData.screen.getWorldPosition(phoneLight.position); phoneLight.position.addScaledVector(sn, 0.10);
    phoneLight.intensity = 0.03 * k;
  }
  // camera: aim so that `subj` lands at screen (sx, sy) (0..1, y down)
  function aim(pos, subj, sx, sy, mm, roll = 0) {
    cam.lens(camera, mm); cam.place(camera, pos, subj, roll);
    const hf = Math.atan(18 / mm), vf = Math.atan(18 / mm / camera.aspect);
    camera.rotateY(Math.atan((sx - 0.5) * 2 * Math.tan(hf)));
    camera.rotateX(Math.atan((sy - 0.5) * 2 * Math.tan(vf)));
    camera.updateMatrixWorld(true);
  }
  const dist = (p) => camera.position.distanceTo(p);
  // debug: how a figure's face points relative to the lens (?pts=1): dot(face, toCam) and the sideways component (+ = screen-right)
  function logFace(tag, fig) {
    if (!q.get('pts')) return;
    const hb = fig.bone('head'); hb.updateWorldMatrix(true, false); camera.updateMatrixWorld(true);
    const e = fig.eye(V(0, 0, 0)), fw = V(0, 0, 1).transformDirection(hb.matrixWorld), tc = camera.position.clone().sub(e).normalize();
    const cr = V(1, 0, 0).transformDirection(camera.matrixWorld);
    console.log('FACE', tag, 'toCam', fw.dot(tc).toFixed(2), 'right', fw.dot(cr).toFixed(2), 'down', (-fw.y).toFixed(2));
  }
  // debug: projected screen positions of named points (?pts=1, printed by tools/bench.mjs --verbose)
  let dbgPts = null;
  const scr = (p) => { const v = p.clone().project(camera); return [+((v.x + 1) / 2).toFixed(3), +((1 - v.y) / 2).toFixed(3)]; };

  // ------------------------------------------------------------------ standard poses
  const PHONE_GRIP = (() => { const a = handPose('grip', { radius: +(q.get('pgr') || 0.02) }); return { ...a, thumb: [0.1, 0.25, 0.05, 0.1, 0.2] }; })();
  function guardBase({ lean = 0.42, bow = 0.25, turn = 0, tilt = 0, yaw = 0 } = {}) {
    seat(G, SEAT_G, YAW_G + yaw, { lean, add: { 'neck.x': bow * 0.5, 'head.x': bow * 0.6, 'head.y': turn * 0.65, 'neck.y': turn * 0.35, 'head.z': tilt } });
  }
  function guardHandsOnThighs(lp = 0) {
    G.reach('R', W(G, -0.115, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) });
    G.reach('L', W(G, 0.115, 0.6, 0.30 + lp), { palm: V(0, -1, 0), fingers: fwdOf(G) });
    G.hands.R.pose('relaxed', { curl: 0.8 }); G.hands.L.pose('relaxed', { curl: 0.8 });
  }
  function restBase({ lean = 0.16, turn = 0, bow = 0, tilt = 0, shoulders = 0, yaw = 0 } = {}) {
    seat(R, SEAT_R, YAW_R + yaw, { lean, add: { 'head.y': turn * 0.6, 'neck.y': turn * 0.4, 'head.x': bow, 'head.z': tilt, 'armL.clav.z': -shoulders, 'armR.clav.z': -shoulders } });
  }
  function restHandsLap() {
    R.reach('R', W(R, -0.04, 0.6, 0.27), { palm: V(0, -1, 0.2).normalize(), fingers: fwdOf(R) });
    R.reach('L', W(R, 0.05, 0.6, 0.25), { palm: V(0, -1, -0.2).normalize(), fingers: fwdOf(R) });
    R.hands.R.pose('relaxed', { curl: 0.9 }); R.hands.L.pose('relaxed', { curl: 0.9 });
  }
  // phone lying face down on his right thigh
  const PHONE_THIGH = () => W(G, -0.12, SEAT_Y + 0.16, 0.36);
  function phoneOnThigh() { putWorld(phone, PHONE_THIGH(), Math.PI / 2 + YAW_G + 0.25); phone.rotation.x = Math.PI; phone.updateMatrixWorld(true); }
  const PH_OFF = V(+(q.get('pox') || 0.035), +(q.get('poy') || 0.008), +(q.get('poz') || 0.02)), PH_ROT = +(q.get('por') || 1.5708);
  function phoneInHand(off = PH_OFF) { putLocal(phone, G.hands.R.sockets.palm, off, new THREE.Euler(0, PH_ROT, 0)); }
  function guardPhoneLap() {
    G.reach('R', W(G, -0.07, 0.68, 0.34), { palm: dirW(G, 0.15, 0.8, -0.6), fingers: dirW(G, 0.45, 0.1, 1) });
    G.hands.R.setChannels(PHONE_GRIP); phoneInHand();
  }
  function seatedPair(o = {}) {
    guardBase({ lean: o.gLean ?? 0.36, bow: o.gBow ?? 0.12, turn: o.gTurn ?? 0, tilt: o.gTilt ?? 0, yaw: o.gYaw ?? 0 });
    restBase({ lean: o.rLean ?? 0.16, turn: o.rTurn ?? 0, bow: o.rBow ?? 0, tilt: o.rTilt ?? 0, shoulders: 0.03 });
    putWorld(gloves, GLOVES_POS, 0.5); putWorld(thermos, THERMOS_POS, 0.4);
  }

  // ================================================================== setups
  const setups = {};
  setups.default = (tl, u, T) => setups.view_bay_back(tl, u, T, { id: 'view_bay_back', nested: true });

  // ================================================================== return
  function makeCupEnv() {
    const s = new THREE.Scene();
    const basic = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide });
    s.add(new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), basic(new THREE.Color(0.02, 0.016, 0.012))));
    const lampD = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1.4) })); lampD.position.set(-0.6, 1.0, -1.4); s.add(lampD);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.17, 0.3), side: THREE.DoubleSide })); win.position.set(2.5, 0.6, 0); win.rotation.y = -Math.PI / 2; s.add(win);
    const pm = new THREE.PMREMGenerator(ctx.renderer); const t = pm.fromScene(s, 0.03).texture; pm.dispose(); return t;
  }

  // ================================================================== per-shot setups (+ debug views)
  // ---------------- debug views (out/check/night_window/dbg_shots.json)
  const dbgState = (T) => {
    setTime(T); resetProps();
    seatedPair({}); guardHandsOnThighs(); restHandsLap();
    putWorld(cupG, CUP_G); putWorld(cupR, CUP_R); phoneOnThigh();
    steamUpdate(T, 1, 1, 1);
  };
  setups.DBG_PLAN = (tl, u, T) => { dbgState(T); ceilMesh.visible = false; cam.lens(camera, 18); cam.place(camera, [2.2, 9.0, 0.01], [2.2, 0, 0]); return { dof: null, exposure: 1.6 }; };
  setups.DBG_WIDE = (tl, u, T) => { dbgState(T); cam.lens(camera, 20); cam.place(camera, [0.3, 1.6, 2.5], [3.4, 1.0, -0.6]); return { dof: null, exposure: 1.3 }; };
  setups.DBG_BACK = (tl, u, T) => { dbgState(T); cam.lens(camera, 28); cam.place(camera, [0.4, 1.45, 0.0], [3.6, 1.1, 0]); return { dof: null, exposure: 1.3 }; };
  setups.DBG_SW = (tl, u, T) => { dbgState(T); cam.lens(camera, 35); cam.place(camera, [2.25, 1.3, 2.3], [3.3, 0.95, -0.2]); return { dof: null, exposure: 1.3 }; };
  setups.DBG_N = (tl, u, T) => { dbgState(T); R.root.visible = false; cam.lens(camera, 35); cam.place(camera, [3.7, 1.2, -1.2], [3.45, 1.0, 0.4]); return { dof: null, exposure: 1.3 }; };

  // ---------------- S059: MATCH CUT from S058 — his bent back at (0.665,0.50), right rear 45°, slightly high;
  // 0.42–1.02 s his left hand touches the glasses; 187.3 (tl 1.21 → 1.6) the phone wakes in his lap: its cold light rims his
  // right cheek, ear and the glasses from below (the screen itself never faces the lens)
  // (integration) 65 mm from 3.3 m (was 75 mm / 3.1 m: his shoulders read 25 % wider than the mother's in S058); the window
  // frames flagged down to dark timber and the lamp spill cut so frame 0 sits near S058's level; the thermos in frame low right.
  setups.S059 = (tl, u, T) => {
    setTime(T); resetProps();
    faceGlasses.visible = true; if (hangGlasses) hangGlasses.visible = false;
    R.root.visible = false; cupG.visible = cupR.visible = false; gloves.visible = false;
    const glowK = smoothstep(1.208, 1.6, tl);
    guardBase({ lean: 0.5, bow: 0.36 + 0.03 * glowK });
    guardPhoneLap(); phone.userData.cover.rotation.x = COVER_OPEN;
    const adj = smoothstep(0.42, 0.62, tl) * (1 - smoothstep(0.82, 1.02, tl));
    const lh = W(G, 0.115, 0.62, 0.30).lerp(G.eye(V(0, 0, 0)).add(leftOf(G).multiplyScalar(0.075)).add(V(0, -0.015, 0)), adj);
    G.reach('L', lh, { palm: V(0, -1, 0).lerp(leftOf(G).negate(), adj).normalize(), fingers: fwdOf(G).lerp(V(0, 1, 0), adj * 0.6).normalize() });
    G.hands.L.pose(adj > 0.3 ? 'pinch' : 'relaxed', { curl: 0.8 });
    G.lookAt(phone.getWorldPosition(V(0, 0, 0)), 0.5 + 0.1 * glowK);
    G.breathe(T, 1.0);
    putWorld(thermos, THERMOS_POS, 0.4);
    phoneGlow(glowK);
    phoneLight.intensity = 0.16 * glowK; phoneLight.distance = 0.9;             // the screen's cold light up onto his face
    steamUpdate(T, 0, 0, 1);
    const shM = G.worldPos('armL.upper').lerp(G.worldPos('armR.upper'), 0.5);
    const face = Math.atan2(Math.sin(Math.PI / 2 + YAW_G), -Math.cos(Math.PI / 2 + YAW_G)) / D2R;   // his facing bearing (≈103°)
    const bearing = (face + 135) * D2R;                        // his right rear 45°
    const cp = SEAT_G.clone().add(V(Math.sin(bearing) * 3.3, 1.62, -Math.cos(bearing) * 3.3));
    aim(cp, shM, 0.665, 0.50, 65);
    // the cool blue-hour air on his shoulders (rhymes with the cool light on her shoulders at the end of S058): moonlight
    // from the corridor arches behind the camera, kept off his head (it read as a white cap)
    fill.color.set('#8fa8d4'); fill.intensity = 19.0; fill.angle = 0.3; fill.penumbra = 1; fill.position.copy(cp).add(V(-0.6, 0.3, 0.5)); fill.target.position.copy(shM).add(V(0, -0.3, 0));
    lampKey.intensity = 0.8; lampKey.target.position.set(3.45, 0.45, -0.45); lampUp.intensity = 0.06; bounce.intensity = 0.08;
    mFrame.color.copy(FRAME_COL).multiplyScalar(0.42);                      // the frames read as dark timber against the night
    dbgPts = { shM, shL: G.worldPos('armL.upper'), shR: G.worldPos('armR.upper'), head: G.eye(V(0, 0, 0)), thermos: THERMOS_POS.clone().add(V(0, 0.12, 0)), lamp: LAMP_HEAD, phone: phone.getWorldPosition(V(0, 0, 0)) };
    return { dof: { focus: dist(shM), fstop: 2.8 } };
  };

  // ---------------- S060: over his right shoulder, high, 100 mm, slow ~20 cm push: thumb hovers over the dial key (188.71 =
  // tl 0.50), draws back (190.03 = 1.82); he closes the flip cover and lays the phone face down on his right thigh — the
  // light goes out with the cover at 190.6 (2.39); the camera tilts down with it, so the shot ends on the shot list's end
  // frame: the closed navy case on his thigh under his resting hand, lit only by the lamp's warm edge and the harbour —
  // the darkness S061 sees from the corridor. 2.45–2.75 his left hand takes off the glasses (onto the cord).
  // (integration) before: the phone dropped out of the frame bottom and the shot ended on a bright warm sill.
  const S60 = { cx: +(q.get('c60x') || -0.75), cy: +(q.get('c60y') || 1.5), cz: +(q.get('c60z') || -0.35), ry: +(q.get('por') || 1.5708), dk: +(q.get('dk60') || 0.58) };
  const PH60_OFF = V(+(q.get('pox') || 0.02), +(q.get('poy') || 0.009), +(q.get('poz') || 0.0));
  const COVER_OPEN = -2.75;
  setups.S060 = (tl, u, T) => {
    setTime(T); resetProps();
    R.root.visible = false; cupG.visible = cupR.visible = false; gloves.visible = false;
    const off = ramp(tl, 2.45, 2.62);
    faceGlasses.visible = off < 0.5; if (hangGlasses) hangGlasses.visible = off >= 0.5;
    const back = easeIO(ramp(tl, 2.0, 2.65));                                 // he gives up and sits back a little
    guardBase({ lean: lerp(0.46, 0.3, back), bow: lerp(0.34, 0.3, back) });
    const flip = ramp(tl, 2.0, 2.36);
    const eye = G.eye(V(0, 0, 0));
    const read = W(G, -0.05, 0.95, 0.44);                                   // ~33 cm below/in front of his eyes
    const thighP = PHONE_THIGH().add(V(0, 0.035, 0));
    const ph = read.clone().lerp(thighP, flip);
    const toEye = eye.clone().sub(read).normalize();
    const palm = toEye.clone().lerp(V(0, -1, 0), flip).normalize();         // screen (out of the palm) toward his eyes … then face down
    const fing = dirW(G, 1, 0.35, 0.15).lerp(dirW(G, 0.2, -0.1, 1), flip).normalize();   // across the phone's back, toward his left (thumb up)
    reachSocket(G, 'R', ph, { palm, fingers: fing, pole: dirW(G, -0.5, -0.8, -0.1).lerp(dirW(G, -0.2, -0.75, -0.65), flip).normalize() }, 'palm');   // (integration) the elbow tucks in back by his side as the hand goes down (it swung out across the lens)
    // the thumb: rises to hover ~6 mm over the dial key (never touching), a small tremor, draws back; then the hand lies on the case
    const hov = ramp(tl, 0.3, 0.5) * (1 - ramp(tl, 1.82, 2.02));
    const trem = hov * 0.025 * Math.sin(T * 29) * (0.6 + 0.4 * Math.sin(T * 7.3));
    const GR60 = handPose('grip', { radius: +(q.get('pgr') || 0.024) });
    const rest = ramp(tl, 2.3, 2.5);
    const hold = { ...GR60, thumb: [lerp(0.15, +(q.get('th0') || 0.42), hov) + trem, lerp(0.35, +(q.get('th1') || 0.05), hov), lerp(0.05, +(q.get('th2') || 0.05), hov), lerp(0.1, +(q.get('th3') || 0.12), hov) + trem, 0.2] };
    G.hands.R.setChannels(rest > 0 ? blendHandChannels(hold, handPose('relaxed', { curl: 0.55 }), rest) : hold);
    putLocal(phone, G.hands.R.sockets.palm, PH60_OFF, new THREE.Euler(0, S60.ry, 0));
    phone.userData.cover.rotation.x = lerp(COVER_OPEN, 0, easeIO(ramp(tl, 2.06, 2.392)));   // the cover closes over the screen as it goes down
    const gl = ramp(tl, 2.38, 2.55) * (1 - ramp(tl, 2.6, 2.85));
    G.reach('L', W(G, 0.115, 0.62, 0.30).lerp(G.eye(V(0, 0, 0)).add(leftOf(G).multiplyScalar(0.06)), gl), { palm: V(0, -1, 0).lerp(leftOf(G).negate(), gl).normalize(), fingers: fwdOf(G) });
    G.hands.L.pose(gl > 0.3 ? 'pinch' : 'relaxed', { curl: 0.8 });
    G.lookAt(phone.getWorldPosition(V(0, 0, 0)), 0.55 * (1 - 0.6 * flip));
    G.breathe(T, 1.0);
    putWorld(thermos, THERMOS_POS, 0.4);
    const glow = 1 - smoothstep(2.225, 2.392, tl);                            // out over 4 frames, dark exactly at 190.6
    phoneGlow(glow);
    const thumbTip = G.hands.R.tip('thumb', V(0, 0, 0));
    const P0 = W(G, S60.cx, S60.cy, S60.cz), P1 = P0.clone().lerp(read, 0.2 / P0.distanceTo(read));
    const camP = P0.lerp(P1, ramp(tl, 0, 2.0));                               // ~20 cm push
    // the frame follows the phone down (≈12–15° tilt, 1.82–2.5 s): it never leaves the frame and lands at (0.56, 0.70)
    const down = easeIO(ramp(tl, 1.82, 2.5));
    const aimAt = read.clone().lerp(thighP, down);
    aim(camP, aimAt, lerp(0.58, 0.56, down), lerp(0.60, 0.70, down), 100);
    lampKey.intensity = lerp(1.3, 0.9, down); lampKey.angle = 0.42; lampKey.target.position.copy(W(G, 0.0, 0.7, 0.4)); fill.intensity = 0.0; bounce.intensity = 0.05; lampUp.intensity = 0.04;
    mFrame.color.copy(FRAME_COL).multiplyScalar(0.45); mSill.color.set('#e2ddd2').multiplyScalar(0.55);   // the sill / jamb flagged down (they were the brightest things at the end)
    phoneLight.intensity *= 2.2;
    // the lamp's warm edge on his hand and the case from the left (the reading lamp is at his front-left)
    // (the lamp's own, shadowed light is blocked by his body here: an unshadowed warm source on the lamp's bearing stands in for it)
    { const toLamp = LAMP_HEAD.clone().sub(thighP).normalize(); kick.color.set('#ffc08a'); kick.intensity = +(q.get('kk60') || 0.22) * down; kick.distance = 1.1; kick.position.copy(thighP).addScaledVector(toLamp, 0.5); }
    dbgPts = { phone: phone.getWorldPosition(V(0, 0, 0)), thumb: thumbTip, head: G.eye(V(0, 0, 0)), thigh: thighP, shR: G.worldPos('armR.upper'), elR: G.worldPos('armR.lower'), wrR: G.worldPos('armR.hand') };
    const dark = smoothstep(2.392, 2.75, tl);                                  // the eye adjusts to the darkness the screen leaves
    return { dof: { focus: dist(flip > 0.5 ? phone.getWorldPosition(V(0, 0, 0)) : thumbTip), fstop: 2.8 }, exposure: 1.15 * lerp(1, S60.dk, dark) };
  };

  // ---------------- S062–S065 (integration restage). She comes in with the two cups, steps over the low bench into the leg
  // room in front of HER seat — beside him, at his depth, never behind or over him — sets his cup on the sill in front of the
  // gap between them, then hers, and sits down beside him. Coverage from the room side behind them, ~20° off the window
  // normal from the north-west (≈70° to the window plane): both in one focal plane, she screen-left, he screen-right, the
  // lamp at the left edge, the E / SE panes and the harbour behind them. (Replaces the BAY_3Q NNE angle, which looked
  // along the bench and stacked them in depth.)
  const R_ENTER = V(2.03, 0, -0.92), R_BEHIND = V(2.76, 0, -0.40), R_LEG = V(3.555, 0, -0.30);
  const R_LEG_HEAD = Math.PI / 2 - 0.2;                             // in the leg room facing the window, a little toward him
  const W_HEAD = Math.atan2(R_BEHIND.x - R_ENTER.x, R_BEHIND.z - R_ENTER.z);
  const C62 = { a: V(0.42, 1.44, -0.66), b: V(0.46, 1.42, -0.20), la: V(3.42, 1.14, -0.20), lb: V(3.45, 1.10, -0.03), mm: 35 };   // truck L→R 0.46 m: 98° → 93° bearing
  for (const [k, n] of [['a', 'c62a'], ['b', 'c62b'], ['la', 'c62la'], ['lb', 'c62lb']]) if (q.get(n)) C62[k].fromArray(q.get(n).split(',').map(Number));
  if (q.get('c62mm')) C62.mm = +q.get('c62mm');
  function restCarry(sides = 'LR') {
    if (sides.includes('R')) { holdCup(R, 'R', cupG); reachSocket(R, 'R', W(R, -0.17, 0.93, 0.30), { palm: dirW(R, 1, 0, 0), fingers: dirW(R, 0, 0, 1) }); }
    if (sides.includes('L')) {
      holdCup(R, 'L', cupR); reachSocket(R, 'L', W(R, 0.16, 0.93, 0.28), { palm: dirW(R, -1, 0, 0), fingers: dirW(R, 0, 0, 1) });
      putLocal(gloves, R.hands.L.sockets.cup, V(0.0, 0.052, -0.012), new THREE.Euler(Math.PI / 2, 0, Math.PI / 2 + 0.15));
    }
  }
  function standAt(fig, pos, heading, o = {}) {
    fig.root.position.copy(pos); fig.root.rotation.set(0, heading, 0);
    if (o.walk !== undefined) fig.pose('walk', { phase: o.walk, stride: o.stride ?? 0.85 }); else fig.pose('stand', { weight: o.weight ?? 0 });
    if (o.lean) fig.pose({ 'hips.x': o.lean * 0.35, 'spine.x': o.lean * 0.35, 'chest.x': o.lean * 0.3, 'neck.x': -o.lean * 0.25, 'head.x': o.lean * 0.15 }, { add: true });
    if (o.add) fig.pose(o.add, { add: true });
    fig.root.updateMatrixWorld(true);
  }
  // her path in S062: last strides (0–0.75 s), the careful step over the bench (0.75–1.40 s, left leg then right, the cups
  // held level), then standing in the leg room. Returns the stand state at tl.
  function restEnter(tl, lean) {
    const P = R.P, hipH = P.hipJY;
    if (tl < 0.75) {
      const k = tl / 0.75, e = 1 - Math.pow(1 - k, 1.6);                       // ~1.2 m/s, slowing into the bench
      standAt(R, R_ENTER.clone().lerp(R_BEHIND, e), lerp(W_HEAD, Math.PI / 2, ramp(tl, 0.3, 0.75)), { walk: 0.32 + e * 1.1, stride: 0.7 * (1 - 0.6 * k), lean: 0.06 });
      return;
    }
    const p = clamp((tl - 0.75) / 0.65, 0, 1), e = easeIO(p);
    const pos = R_BEHIND.clone().lerp(R_LEG, e);
    const fwd = V(1, 0, 0);
    const sL = Math.sin(Math.PI * clamp(p / 0.56, 0, 1)), sR = Math.sin(Math.PI * clamp((p - 0.44) / 0.56, 0, 1));
    // planted legs angle back/forward toward the planted foot (the root = between the feet moves on)
    const dBack = pos.clone().sub(R_BEHIND).dot(fwd), dFwd = R_LEG.clone().sub(pos).dot(fwd);
    const plantR = p < 0.5 ? -Math.atan2(dBack, hipH) * (1 - sR) : 0, plantL = p > 0.5 ? Math.atan2(dFwd, hipH) * (1 - sL) : 0;
    standAt(R, pos, lerp(Math.PI / 2, R_LEG_HEAD, e), { lean: lean + 0.12 * Math.max(sL, sR), weight: 0,
      add: { 'legL.upper.x': 1.35 * sL + plantL, 'legL.lower.x': 1.95 * sL, 'legL.foot.x': 0.3 * sL, 'legR.upper.x': 1.35 * sR + plantR, 'legR.lower.x': 1.95 * sR, 'legR.foot.x': 0.3 * sR,
        'hips.py': 0.035 * Math.max(sL, sR), 'hips.z': 0.05 * (sL - sR), 'chest.z': -0.04 * (sL - sR) } });
  }

  // ---------------- S062: she enters from screen-left with the two cups; 195.57 (tl 0.57) her right hand goes out with his
  // cup; 197.15 (2.15) its foot meets the sill in front of the gap, beside him
  setups.S062 = (tl, u, T) => {
    setTime(T); resetProps();
    guardBase({ lean: 0.38, bow: 0.2, turn: 0.18 * ramp(tl, 1.55, 2.1) });
    guardHandsOnThighs(); phoneOnThigh();
    putWorld(thermos, THERMOS_POS, 0.4);
    const lean = 0.30 * ramp(tl, 1.3, 1.95) * (1 - 0.5 * ramp(tl, 2.18, 2.42));
    restEnter(tl, lean);
    restCarry('L');
    holdCup(R, 'R', cupG);
    const r = ramp(tl, 0.57, 2.15);
    if (tl < 2.15) {
      const carry = W(R, -0.17, 0.93, 0.30);
      const over = CUP_G.clone().add(V(-0.07, 0.13, -0.03));                 // out over the sill on her side of him …
      const p = r < 0.62 ? carry.lerp(over, easeIO(r / 0.62)) : over.lerp(gripAt(CUP_G).add(V(0, 0.002, 0)), easeIO((r - 0.62) / 0.38));   // … then gently down
      reachSocket(R, 'R', p, { palm: dirW(R, 1, 0, 0).lerp(V(0.25, 0, -1), r).normalize(), fingers: dirW(R, 0, 0, 1).lerp(V(1, -0.25, 0.2), r).normalize() });
    } else {
      putWorld(cupG, CUP_G, chipYawFor(CUP_G));
      const rel = ramp(tl, 2.15, 2.42);
      R.hands.R.pose('relaxed', { curl: lerp(0.35, 0.6, rel) });
      R.reach('R', gripAt(CUP_G).add(V(-0.05, 0.03, -0.06)).lerp(W(R, -0.16, 0.86, 0.22), easeIO(rel)), { palm: V(0.2, -0.4, -1).normalize(), fingers: V(1, -0.4, 0.15).normalize() });
    }
    R.lookAt(tl < 1.0 ? R_LEG.clone().add(V(0.6, 1.0, 0.1)) : CUP_G.clone().add(V(0, 0.05, 0)), lerp(0.25, 0.6, ramp(tl, 0.8, 1.4)));
    G.lookAt(R.eye(V(0, 0, 0)), 0.32 * ramp(tl, 1.55, 2.1));
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 1, 1, 1.2);
    const k = ease.outSine(clamp(tl / 2.0, 0, 1));
    cam.lens(camera, C62.mm); cam.place(camera, C62.a.clone().lerp(C62.b, k), C62.la.clone().lerp(C62.lb, k));
    // the moonlit corridor behind her (through the glazed screen): a cool edge on her back and shoulder as she comes in
    moonEdge.position.set(-2.4, 3.1, -2.2); moonEdge.target.position.copy(R.worldPos('chest')); moonEdge.angle = 0.32; moonEdge.penumbra = 1;
    moonEdge.intensity = lerp(60.0, 14.0, ramp(tl, 0.6, 1.7));
    fill.intensity = 2.4;
    const fp = cupG.getWorldPosition(V(0, 0, 0));
    dbgPts = { Rh: R.eye(V(0, 0, 0)), ge: G.eye(V(0, 0, 0)), cupG: fp, lamp: LAMP_HEAD, R: R.worldPos('chest'), G: G.worldPos('chest') };
    if (q.get('pts')) console.log('S062 reach', tl.toFixed(2), 'shoulder→cupG', R.worldPos('armR.upper').distanceTo(gripAt(CUP_G)).toFixed(3), 'cup err', fp.distanceTo(tl < 2.15 ? fp : CUP_G).toFixed(3));
    return { dof: { focus: lerp(dist(R.worldPos('chest')), (dist(fp) + dist(G.eye(V(0, 0, 0)))) / 2, ramp(tl, 1.0, 2.0)), fstop: 4 } };
  };

  // ---------------- S063: the hold. Her cup 6 cm left of his (197.45 = tl 0.03–0.33); she sits down beside him (0.36–0.80,
  // seated on the band entry 198.22), laying the gloves on the bench at her side; 199.3 (1.88) the middle button; 2.1 his eyes
  // to the cup; 200.15 (2.73) both shoulders drop on one out-breath; then stillness, the steam between them
  function restSitDown(k) {
    // k 0 = standing in the leg room (end of S062) … 1 = seated at SEAT_R; the feet stay near where she stood
    seat(R, SEAT_R, YAW_R, { lean: 0.15, feet: -0.03 }); const sit = { ...R.ch };
    standAt(R, R_LEG, R_LEG_HEAD, { lean: 0.15, weight: 0 }); const stand = { ...R.ch };
    const e = easeIO(k), lb = Math.sin(Math.PI * clamp(e * 1.08, 0, 1));
    const ch = Figure.blend(stand, sit, e);
    ch['hips.x'] = (ch['hips.x'] || 0) + 0.22 * lb; ch['spine.x'] = (ch['spine.x'] || 0) + 0.12 * lb; ch['chest.x'] = (ch['chest.x'] || 0) + 0.08 * lb; ch['neck.x'] = (ch['neck.x'] || 0) - 0.12 * lb;
    R.root.position.copy(R_LEG).lerp(SEAT_R, e);
    R.root.rotation.set(0, lerp(R_LEG_HEAD, Math.PI / 2 + YAW_R, e), 0);
    R.pose(ch);
    R.root.updateMatrixWorld(true);
  }
  setups.S063 = (tl, u, T) => {
    setTime(T); resetProps();
    const relax = ramp(tl, 2.62, 2.95);
    guardBase({ lean: 0.38 + 0.03 * relax, bow: 0.2 + 0.1 * ramp(tl, 2.0, 2.4), turn: 0.18 * (1 - ramp(tl, 1.0, 1.6)) });
    G.pose({ 'armL.clav.z': -0.06 * relax, 'armR.clav.z': -0.06 * relax, 'chest.x': 0.03 * relax }, { add: true });
    guardHandsOnThighs(); phoneOnThigh();
    putWorld(thermos, THERMOS_POS, 0.4);
    putWorld(cupG, CUP_G, chipYawFor(CUP_G));
    const sitK = clamp((tl - 0.36) / (0.80 - 0.36), 0, 1);
    if (sitK <= 0) standAt(R, R_LEG, R_LEG_HEAD, { lean: lerp(0.15, 0.24, ramp(tl, 0, 0.2)) * (1 - 0.4 * ramp(tl, 0.26, 0.36)), weight: 0 });
    else restSitDown(sitK);
    if (sitK >= 1) R.pose({ 'armL.clav.z': -0.07 * relax, 'armR.clav.z': -0.07 * relax, 'chest.x': 0.03 * relax, 'head.x': 0.03 * relax }, { add: true });
    // left hand: her cup down beside his (0.03–0.33), then the gloves to the bench at her side as she sits (0.36–0.80)
    holdCup(R, 'L', cupR);
    const c = ramp(tl, 0.03, 0.33);
    if (tl < 0.33) {
      reachSocket(R, 'L', W(R, 0.16, 0.93, 0.28).lerp(gripAt(CUP_R).add(V(0, 0.002, 0)), c), { palm: dirW(R, -1, 0, 0).lerp(V(0.15, 0, 1), c).normalize(), fingers: dirW(R, 0, 0, 1).lerp(V(1, -0.2, -0.15), c).normalize() });
      putLocal(gloves, R.hands.L.sockets.cup, V(0.0, 0.052, -0.012), new THREE.Euler(Math.PI / 2, 0, Math.PI / 2 + 0.15));
    } else {
      putWorld(cupR, CUP_R, 0);
      R.hands.L.pose('relaxed', { curl: 0.6 });
      const gk = ramp(tl, 0.36, 0.82);
      if (tl < 0.82) {
        const from = gripAt(CUP_R).add(V(-0.08, 0.05, -0.02)), to = GLOVES_POS.clone().add(V(0.0, 0.06, 0));
        R.reach('L', from.lerp(to, gk), { palm: V(0, -1, 0), fingers: V(0.6, -0.5, -0.3).normalize() });
        putLocal(gloves, R.hands.L.sockets.palm, V(0.0, 0.02, -0.04), new THREE.Euler(0, 0, 0));
      } else {
        putWorld(gloves, GLOVES_POS, 0.5);
        const lk = ramp(tl, 0.82, 1.2);
        R.reach('L', GLOVES_POS.clone().add(V(0.02, 0.06, 0.02)).lerp(W(R, 0.05, 0.6, 0.25), lk), { palm: V(0, -1, 0), fingers: fwdOf(R) });
      }
    }
    // right hand: back from his cup to her side, rests on her lap; 1.62–1.88 to the coat's middle button (a visible lift of
    // the elbow, fingers at the button), 2.15–2.5 back to the lap
    const bt = ramp(tl, 1.62, 1.88) * (1 - ramp(tl, 2.15, 2.5));
    const back = ramp(tl, 0.0, 0.45);
    R.hands.R.pose(bt > 0.4 ? 'pinch' : 'relaxed', { curl: lerp(0.5, 0.9, back) });
    const lapR = W(R, -0.04, 0.6, 0.27).lerp(W(R, -0.03, 0.86, 0.16), bt);
    R.reach('R', back < 1 ? W(R, -0.16, 0.86, 0.22).lerp(lapR, back) : lapR, { palm: V(0, -1, 0).lerp(dirW(R, 0, 0, -1), bt).normalize(), fingers: fwdOf(R).lerp(dirW(R, 1, 0.3, 0), bt).normalize(), elbowOut: 0.45 + 0.35 * bt });
    const look = tl < 0.36 ? CUP_R.clone().add(V(0, 0.05, 0)) : tl < 0.85 ? GLOVES_POS : tl < 1.6 ? G.eye(V(0, 0, 0)) : tl < 2.5 ? W(R, -0.02, 0.86, 0.3) : CUP_R.clone().add(V(0, 0.1, 0));
    R.lookAt(look, tl < 0.85 ? 0.45 : tl < 1.6 ? 0.3 : 0.4);
    G.lookAt(tl > 2.1 ? CUP_G : R.eye(V(0, 0, 0)), tl > 2.1 ? 0.45 : 0.25 * (1 - ramp(tl, 1.0, 1.6)));
    G.breathe(T, 1 + relax); R.breathe(T + 0.7, 1 + relax);
    steamUpdate(T, 1, 1, 1.2);
    cam.lens(camera, C62.mm); cam.place(camera, C62.b, C62.lb);
    moonEdge.position.set(-2.4, 3.1, -2.2); moonEdge.target.position.copy(SEAT_R).add(V(0, 1.0, 0)); moonEdge.angle = 0.32; moonEdge.penumbra = 1; moonEdge.intensity = 14.0;
    fill.intensity = 2.4;
    dbgPts = { Rh: R.eye(V(0, 0, 0)), ge: G.eye(V(0, 0, 0)), cupR: CUP_R, cupG: CUP_G, gloves: GLOVES_POS, lamp: LAMP_HEAD };
    return { dof: { focus: (dist(R.eye(V(0, 0, 0))) + dist(G.eye(V(0, 0, 0)))) / 2, fstop: 4 } };
  };

  // ---------------- S064: insert 100 mm — his hands lift the chipped cup to his lap; her bare left hand by her cup on the
  // sill, the worn LEFT cuff spot registered at (0.42,0.62). Close-up hands (the full figures are hidden: insert cheat).
  const _m4a = new THREE.Matrix4(), _m4b = new THREE.Matrix4();
  function placeHandBySocket(h, sock, pos, yAxis, zAxis) {
    // put the hand so that socket `sock` sits at pos with its +Y along yAxis and +Z along zAxis (world)
    h.root.updateMatrixWorld(true);
    const s = h.sockets[sock]; s.updateMatrixWorld(true);
    const local = _m4a.copy(h.root.matrixWorld).invert().multiply(s.matrixWorld);       // socket in root space
    const Y = yAxis.clone().normalize(), Z = zAxis.clone().sub(Y.clone().multiplyScalar(zAxis.dot(Y))).normalize(), X = new THREE.Vector3().crossVectors(Y, Z);
    const want = _m4b.makeBasis(X, Y, Z).setPosition(pos);
    const rootW = want.multiply(local.invert());
    rootW.decompose(h.root.position, h.root.quaternion, h.root.scale); h.root.scale.setScalar(1);
    h.root.updateMatrixWorld(true);
  }
  // Integration rebuild. Camera from the NW between/behind them (their side), slightly high, 100 mm. His two hands cradle the
  // chipped cup from his side and lift it down and back toward his lap, out of frame low right. Her bare LEFT hand RESTS beside
  // her cup: palm up (that is what turns the little-finger side of the cuff — the worn spot — toward a lens on their side),
  // the back of the hand on the sill's edge, the fingers softly half-closed ~5 cm from the cup, the forearm angled in from
  // lower left with the elbow off the sill (the old forearm laid flat along the sill, fingers splayed, read as begging).
  // A grazing warm kick off the sill lifts the worn spot from the dark melton; the focus breathes onto it at 201.6.
  const S64 = { bear: +(q.get('b64') || 298), d: +(q.get('d64') || 2.05), h: +(q.get('h64') || 0.25), wx: +(q.get('wx64') || 3.77), wz: +(q.get('wz64') || -0.235), fa: +(q.get('fa64') || 150), roll: +(q.get('rl64') || 0.15), fy: +(q.get('fy64') || 0.16), curl: +(q.get('cu64') || 1.8), wf: +(q.get('wf64') || -0.32) };
  setups.S064 = (tl, u, T) => {
    setTime(T); resetProps();
    seatedPair({ gLean: 0.42, gBow: 0.3 });
    G.root.visible = R.root.visible = false; phone.visible = false; gloves.visible = false; thermos.visible = false;
    for (const h of insertHands) h.root.visible = true;
    putWorld(cupR, CUP_R, 0);
    // her left hand at rest: palm up, a soft half-closed hand, the back of the hand on the sill edge, forearm sloping down-back
    { const hp = handPose('relaxed', { curl: S64.curl }); hp.wrist = [S64.wf, 0.04]; hRL.setChannels(hp); }   // the wrist bent back: the hand lies on the sill, the forearm slopes down to the elbow below its edge
    const fa = S64.fa * D2R;
    const Fh = V(Math.sin(fa), S64.fy, -Math.cos(fa)).normalize();                          // forearm axis ≈ SSE toward her cup, rising to the wrist on the sill edge
    const Nh = V(0, 1, 0).applyAxisAngle(Fh, S64.roll).normalize();                         // palm up, rolled a little so the cuff's ulnar side turns up toward the lens
    const wrist = V(S64.wx, SILL_Y + 0.024 + 0.0015 * util.noise1(T * 0.3, 4), S64.wz);      // + a breath
    hRL.placeWrist(wrist, Fh, Nh);
    const wornP = hRL.root.localToWorld(V(0, 0.024, -0.047));                              // cuff: worn spot 1 cm above the edge, ulnar side
    // camera: from the NW, slightly high; the worn spot registered at (0.42, 0.62)
    const mid = CUP_G.clone().lerp(CUP_R, 0.5).add(V(0, 0.03, 0));
    const bb = S64.bear * D2R, dir = V(Math.sin(bb), 0, -Math.cos(bb));
    const cpos = mid.clone().addScaledVector(dir, S64.d); cpos.y += S64.h;
    aim(cpos, wornP, 0.42, 0.62, 100);
    // his two hands close around the cup (0–0.42 s), lift it a little and carry it down and back toward his lap — out of
    // frame low right by 202.3 (tl 1.48)
    const close = ramp(tl, 0.0, 0.42), lift = ramp(tl, 0.42, 1.6);
    const lap = SEAT_G.clone().add(V(0.30, 0.66, 0.02));
    const cupPos = CUP_G.clone().lerp(lap, easeIO(lift)); cupPos.y += 0.035 * Math.sin(Math.PI * Math.min(1, lift * 1.6));
    putWorld(cupG, cupPos, chipYawFor(CUP_G));
    const towardHim = lap.clone().sub(CUP_G); towardHim.y = 0; towardHim.normalize();
    const f = towardHim.clone().negate();                                                  // his reach direction (toward the window)
    const rgt = V(-f.z, 0, f.x);                                                            // his right
    const g = gripAt(cupPos);
    const open = 1 - close;
    hGR.pose('hold_cup', { radius: 0.037 + 0.016 * open });
    placeHandBySocket(hGR, 'cup', g.clone().addScaledVector(rgt, 0.022 * open).addScaledVector(f, -0.01 * open), V(0, 1, 0), f.clone().addScaledVector(rgt, -0.55).normalize());
    hGL.pose('hold_cup', { radius: 0.037 + 0.016 * open });
    placeHandBySocket(hGL, 'cup', g.clone().addScaledVector(rgt, -0.022 * open).add(V(0, -0.004, 0)).addScaledVector(f, -0.012 - 0.01 * open), V(0, 1, 0), f.clone().addScaledVector(rgt, 0.55).normalize());
    steamUpdate(T, 1, 1, 1.3);
    lampKey.castShadow = true; lampKey.intensity = 1.5; lampKey.target.position.copy(mid);
    fill.intensity = 0.3; fill.position.copy(cpos).add(V(0, 0.45, 0.3)); fill.target.position.copy(mid);
    mFrame.color.copy(FRAME_COL).multiplyScalar(0.4);                        // a flagged, dark muntin behind the steam (shot list)
    // the lamp's light off the white sill, grazing across the cuff from the north: the abrasion reads lighter than the cloth
    kick.color.set('#ffd2a0'); kick.intensity = +(q.get('k64') || 0.16); kick.distance = 0.6; kick.position.copy(wornP).add(V(-0.16, 0.05, -0.1));
    dbgPts = { cupR: CUP_R.clone().add(V(0, 0.035, 0)), cupG: cupPos.clone().add(V(0, 0.035, 0)), worn: wornP, wrist };
    const fb = ramp(tl, 0.6, 0.93);
    return { dof: { focus: lerp(dist(g), dist(wornP), fb), fstop: 4 }, aa: 'msaa' };
  };

  // two seated, guard holding his cup in the lap (after S064)
  function guardCupLap(lapLift = 0) {
    holdCup(G, 'R', cupG);
    const lap = W(G, -0.03, 0.73 + lapLift, 0.29);
    reachSocket(G, 'R', lap, { palm: dirW(G, -0.6, 0, 0.3), fingers: dirW(G, 0.5, 0, 0.7) });
    G.hands.L.pose('hold_cup', { radius: 0.036 });
    // (integration fix) the left hand's target was lap + a UNIT vector (dirW normalises): the arm shot 1 m out to his left
    reachSocket(G, 'L', W(G, -0.01, 0.73 + lapLift, 0.28), { palm: dirW(G, 0.6, 0, 0.3), fingers: dirW(G, -0.5, 0, 0.7) });
  }

  // ---------------- S065: the profile two-shot against the window (integration rebuild): from behind them, eye level, 75 mm.
  // He lifts his head from the cup in his lap and turns to her (202.9 = tl 0.19 → 0.65): his face turns into the lamp, a warm
  // profile edge and a lit brow/cheek seen from the side, never frontal. She is already turned to him; she nods (203.5 = 0.79,
  // ~7° chin dip, 0.4 s down / 0.5 s up) — a soft profile rimmed by the lamp behind her and the lamp-lit sill in front of her.
  // Both breathe out (203.9 = 1.19): a visible drop of the shoulders. Then stillness over '千年啊'. Her cup's steam between them.
  const C65 = { p: V(+(q.get('c65x') || 0.42), +(q.get('c65y') || 1.24), +(q.get('c65z') || -0.04)), mm: +(q.get('c65mm') || 75) };
  setups.S065 = (tl, u, T) => {
    setTime(T); resetProps();
    const look = ramp(tl, 0.19, 0.65), ex = ramp(tl, 1.19, 1.55);
    seatedPair({ gLean: 0.40 - 0.12 * look - 0.03 * ex, gBow: 0.34 * (1 - look), gYaw: 0.24 * look, rTurn: 0, rBow: 0.0, rLean: 0.13 });
    restBase({ lean: 0.13, yaw: -0.30, shoulders: 0.03 });
    const nod = tl < 0.79 ? easeIO(clamp((tl - 0.39) / 0.4, 0, 1)) : 1 - easeIO(clamp((tl - 0.79) / 0.5, 0, 1));   // ~8° chin dip: 0.4 s down to the 203.5 beat, 0.5 s up
    R.pose({ 'armL.clav.z': -0.06 * ex, 'armR.clav.z': -0.06 * ex, 'chest.x': 0.025 * ex }, { add: true });
    G.pose({ 'armL.clav.z': -0.06 * ex, 'armR.clav.z': -0.06 * ex, 'chest.x': 0.025 * ex }, { add: true });
    phoneOnThigh(); guardCupLap(); putWorld(cupR, CUP_R, 0); putWorld(gloves, GLOVES_POS, 0.5); putWorld(thermos, THERMOS_POS, 0.4);
    restHandsLap();
    const re0 = R.eye(V(0, 0, 0)), ge0 = G.eye(V(0, 0, 0));
    G.lookAt(look < 0.02 ? cupG.getWorldPosition(V(0, 0, 0)) : re0, look < 0.02 ? 0.4 : 0.9 * look);
    R.lookAt(ge0.clone().add(V(0, -0.06 * (1 - look), 0)), 0.88);
    // the nod on top of the look (head pitch only)
    { const hb = R.bone('head'); hb.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15 * nod, 0, 0))); const nb = R.bone('neck'); nb.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.07 * nod, 0, 0))); R.root.updateMatrixWorld(true); }
    G.breathe(T, 1 + 1.3 * pulse(tl, 1.1, 1.9)); R.breathe(T + 0.7, 1 + 1.3 * pulse(tl, 1.1, 1.9));
    steamUpdate(T, 1, 1, 1.2);
    steamG.material.uniforms.uOp.value = 0.07;                                 // his cup is in his lap: a thin wisp
    const ge = G.eye(V(0, 0, 0)), re = R.eye(V(0, 0, 0));
    aim(C65.p, ge.clone().lerp(re, 0.5), 0.50, 0.44, C65.mm);
    // her face: the lamp-lit sill in front of her lifts the edge of her profile (a soft warm side light, not a key)
    kick.color.set('#ffcf9c'); kick.intensity = +(q.get('k65') || 0.032); kick.distance = 1.0; kick.position.set(3.74, 0.98, -0.16);
    lampKey.intensity = +(q.get('l65') || 1.25); lampKey.target.position.set(3.25, 1.05, 0.15);    // the lamp onto his turned face — seen from the side, a warm edge with the near cheek in shadow
    fill.intensity = 0.6;
    moonEdge.position.set(-2.4, 3.1, -0.4); moonEdge.target.position.set(3.2, 1.1, 0); moonEdge.angle = 0.3; moonEdge.intensity = 3.0;   // a cool corridor edge on both backs
    dbgPts = { ge, re, cupR: CUP_R, mid: ge.clone().lerp(re, 0.5) };
    logFace('S065 G', G); logFace('S065 R', R);
    if (q.get('nan')) { const bad = []; R.root.traverse((o) => { if (o.isBone) { const e = o.matrixWorld.elements; if (e.some((x) => !Number.isFinite(x))) bad.push(o.name); } }); console.log('NAN bones', tl.toFixed(3), bad.join(','), 'hands', JSON.stringify(R.hands.R.channels || {}).slice(0, 200)); }
    return { dof: { focus: (dist(ge) + dist(re)) / 2, fstop: 2.8 }, saturation: 0.85, exposure: +(q.get('e65') || 1.1) };
  };

  // ---------------- the call (S072–S074): phone from the right thigh to the right ear
  // the phone at his RIGHT ear, built from the head sculpt's landmarks (figure.js head space, hu units: ear (±0.33, 0.285,
  // −0.06), outer rim x ±0.356, mouth y 0.04 / z ≈0.36): speaker end at the ear canal, the long axis running down-forward
  // toward the mouth (≈38° below the head's horizontal), screen toward the cheek; his palm on the case back, fingers up-back.
  // (Review fix: the old target put the wrist under the skull and the phone's long axis along the fingers, so the phone
  // stood up behind his head like a slab.)
  const EAR_GRIP = (() => { const a = handPose('relaxed', { curl: 0.55 }); return { ...a, thumb: [0.35, 0.3, 0.15, 0.2, 0.1] }; })();
  const _mEar = new THREE.Matrix4(), _mS = new THREE.Matrix4(), _qE = new THREE.Quaternion(), _qF = new THREE.Quaternion(), _pE = V(0, 0, 0), _pF = V(0, 0, 0), _sc = V(1, 1, 1);
  function earTargets() {
    const hb = G.bone('head'); hb.updateWorldMatrix(true, false);
    const hu = G.P.hu;
    const d = V(0, -0.9, 0.44).normalize();                            // ear → down along the jaw line, head space
    const Xp = d.clone().negate(), Yp = V(1, 0, 0), Zp = new THREE.Vector3().crossVectors(Xp, Yp);
    const c = V(-(0.356 * hu + 0.0072), 0.31 * hu, -0.075 * hu).addScaledVector(d, 0.04);
    const Mphone = hb.matrixWorld.clone().multiply(_mEar.makeBasis(Xp, Yp, Zp).setPosition(c));
    const palmPos = c.clone().add(V(-0.0165, 0, 0)).addScaledVector(d, 0.045).applyMatrix4(hb.matrixWorld);
    return { Mphone, palmPos, palmN: V(1, 0, 0.12).normalize().transformDirection(hb.matrixWorld), fing: V(0, 0.3, -0.95).normalize().transformDirection(hb.matrixWorld) };
  }
  function guardPhoneEar(k) {
    // k: 0 = face down on the thigh … 0.45 = up in front of him, screen up … 1 = at his right ear
    const thigh = PHONE_THIGH().add(V(0, 0.035, 0)), front = W(G, -0.07, 0.80, 0.33);
    const a = easeIO(clamp(k / 0.45, 0, 1)), b = easeIO(clamp((k - 0.45) / 0.55, 0, 1));
    const palmF = dirW(G, 0.15, 0.8, -0.6).normalize(), fingF = dirW(G, 0.45, 0.1, 1).normalize();
    const poleF = dirW(G, -0.45, -0.85, 0.35).normalize(), poleE = dirW(G, -0.2, -1, 0.3).normalize();
    if (k < 0.45) {
      G.reach('R', thigh.lerp(front, a), { palm: V(0, -1, 0).lerp(palmF, a).normalize(), fingers: fingF, pole: poleF });
      G.hands.R.setChannels(PHONE_GRIP); phoneInHand(PH_OFF);
      return;
    }
    // the ear pose (exact): hand on the phone back; the phone's offset in the palm socket at that pose
    const E = earTargets();
    reachSocket(G, 'R', E.palmPos, { palm: E.palmN, fingers: E.fing, pole: poleE }, 'palm');
    G.hands.R.setChannels(EAR_GRIP);
    const wEar = G.worldPos('armR.hand');
    const sock = G.hands.R.sockets.palm; sock.updateWorldMatrix(true, false);
    _mS.copy(sock.matrixWorld).invert().multiply(E.Mphone).decompose(_pE, _qE, _sc);
    if (b < 1) {
      // travel: wrist front → ear on a small outward arc, the phone blending from its in-hand offset to its ear offset
      const out = dirW(G, -1, 0.2, 0).multiplyScalar(0.06 * Math.sin(Math.PI * b));
      G.reach('R', front.clone().lerp(wEar, b).add(out), { palm: palmF.clone().lerp(E.palmN, b).normalize(), fingers: fingF.clone().lerp(E.fing, b).normalize(), pole: poleF.clone().lerp(poleE, b).normalize() });
      G.hands.R.setChannels(blendHandChannels(PHONE_GRIP, EAR_GRIP, b));
      _qF.setFromEuler(new THREE.Euler(0, PH_ROT, 0)); _pF.copy(PH_OFF);
      putLocal(phone, sock, _pF.clone().lerp(_pE, b), new THREE.Euler().setFromQuaternion(_qF.clone().slerp(_qE, b)));
    } else putLocal(phone, sock, _pE, new THREE.Euler().setFromQuaternion(_qE));
  }
  // ---------------- S072: cold tea (no steam): phone rises (226.32 = tl 0.03), thumb press (226.98 = 0.69), at the right ear (227.46 = 1.17)
  setups.S072 = (tl, u, T) => {
    setTime(T); resetProps();
    const inb = pulse(tl, 0.42, 0.95);
    // review: the phone now really sits at his right ear (it stood up behind his skull like a slab); he settles a little to his
    // right as he waits — from BAY_3Q the call reads as hand + phone on the near ear against the window (a right-ear call
    // always puts the arm between his face and this lens; his face is S073's)
    const away = ramp(tl, 0.8, 1.75);
    seatedPair({ gLean: lerp(0.38, 0.36, away), gBow: lerp(0.30, CALL_POSE.gBow, ramp(tl, 0.8, 1.4)), gTurn: CALL_POSE.gTurn * away, gTilt: CALL_POSE.gTilt * away, gYaw: CALL_POSE.gYaw * away, rTurn: 0.1, rBow: -0.03 });
    putWorld(cupG, CUP_G, chipYawFor(CUP_G)); putWorld(cupR, CUP_R, 0);
    const k = tl < 0.03 ? 0 : tl < 0.6 ? 0.45 * ramp(tl, 0.03, 0.6) : tl < 0.8 ? 0.45 : 0.45 + 0.55 * ramp(tl, 0.8, 1.17);
    G.lookAt(k < 0.6 ? phone.getWorldPosition(V(0, 0, 0)) : W(G, -0.3, 0.55, 0.9), k < 0.6 ? 0.5 * (1 - away) : 0.3);
    guardPhoneEar(k);
    const press = pulse(tl, 0.6, 0.8);
    if (k <= 0.45) G.hands.R.setChannels({ ...PHONE_GRIP, thumb: [0.1 + 0.5 * press, 0.25 - 0.15 * press, 0.05, 0.1 + 0.1 * press, 0.2] });
    G.reach('L', W(G, 0.115, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 });
    restHandsLap();
    R.lookAt(V(8, 1.1, 0.9), 0.6);
    G.breathe(T, 1 + 1.6 * inb); R.breathe(T + 0.7);
    steamUpdate(T, 0, 0, 1);
    phoneGlow(smoothstep(0.25, 0.42, tl) * (1 - smoothstep(1.0, 1.2, tl)));
    const ge = G.eye(V(0, 0, 0));
    const cp = V(+(q.get("c72x") || 2.32), 1.30, +(q.get("c72z") || 2.0)).lerp(ge, 0.02 * ramp(tl, 0, 2.75));
    aim(cp, ge, 0.64, 0.45, 75);
    faceBounce(ge, 0.06);
    logFace('S072', G);
    dbgPts = { ge, re: R.eye(V(0, 0, 0)), phone: phone.getWorldPosition(V(0, 0, 0)) };
    return { dof: { focus: dist(ge), fstop: 2.8 }, saturation: 0.8 };
  };

  // the lamp's light bounced off the white SE frames and sill beside him: a soft warm fill for his face when he is turned
  // away from the lamp (the call, S072–S074); position = most of the way from his face toward the SE window corner
  function faceBounce(face, k, from = V(3.86, 1.02, 0.86)) { kick.color.set('#ffcf9c'); kick.intensity = k; kick.distance = 1.8; kick.position.copy(face).lerp(from, 0.85); }
  const CALL_POSE = { gLean: 0.37, gBow: 0.14, gTurn: +(q.get('ct') || -0.22), gTilt: -0.03, gYaw: +(q.get('cy') || 0) };   // = S072's end pose (turned away, phone at the right ear)

  // ---------------- S073: CU 100 mm, his eyes, waiting through the full-band stop (229.1); held breath (229.82).
  // From her side of the bench (she is out of frame), as the shot list frames it: his face 3/4 toward camera-left, the phone
  // at his right ear on the FAR side (case edge just showing beyond his head), the lamp from screen-right, the SE window's
  // harbour points soft behind him. (Review: the phone used to fall off the ear at 229.82 — a pose() after the reach reset
  // the arm — and the eyes sat high under a cropped crown.)
  setups.S073 = (tl, u, T) => {
    setTime(T); resetProps();
    R.root.visible = false;
    const held = tl > 0.78;
    seatedPair({ ...CALL_POSE, gLean: 0.32, gBow: 0.02, gTurn: 0.78, gTilt: -0.05 });
    if (held) G.pose({ 'neck.x': 0.012 * smoothstep(0.78, 1.0, tl) }, { add: true });   // (pose() resets the IK: before the reach)
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    G.lookAt(W(G, 0.3, 0.8, 1.0), 0.3);
    guardPhoneEar(1);
    G.reach('L', W(G, 0.115, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 });
    G.breathe(held ? 229.82 : T, held ? 0.4 : 1);
    steamUpdate(T, 0, 0, 1);
    const ge = G.eye(V(0, 0, 0));
    aim(V(3.62, 1.24, -0.98), ge, 0.52, 0.42, 100);
    lampKey.color.set('#ffd8b0'); lampKey.intensity = 1.5; lampKey.target.position.copy(ge);
    kick.intensity = 0.02; kick.distance = 1.2; kick.position.copy(ge).add(V(0.25, 0.12, -0.3));
    logFace('S073', G);
    dbgPts = { ge, phone: phone.getWorldPosition(V(0, 0, 0)) };
    return { dof: { focus: dist(ge), fstop: 2.4 }, saturation: 0.76, temp: -0.1, exposure: 1.2 };
  };

  // ---------------- S074: answered on 这人间 (230.63): his face eases; her smile (232.27 = tl 1.64); she looks out (233.07 = 2.44)
  setups.S074 = (tl, u, T) => {
    setTime(T); resetProps();
    const e1 = ramp(tl, 0.0, 1.2), smile = ramp(tl, 1.5, 1.9), out = ramp(tl, 2.44, 3.0);
    seatedPair({ ...CALL_POSE, gLean: 0.37 - 0.06 * e1, gBow: CALL_POSE.gBow - 0.16 * e1, gTurn: CALL_POSE.gTurn - 0.12 * e1, gTilt: CALL_POSE.gTilt + 0.03 * e1, rTurn: lerp(-0.62, 0.12, out), rBow: lerp(0.05, -0.03, out) });
    const mur = tl > 1.0 && tl < 1.6 ? 0.015 * Math.sin((tl - 1.0) * 21) : 0;
    G.pose({ 'head.x': mur, 'armL.clav.z': -0.03 * e1, 'armR.clav.z': -0.03 * e1 }, { add: true });
    R.pose({ 'head.z': -0.05 * smile * (1 - out), 'head.x': -0.02 * smile }, { add: true });
    putWorld(cupG, CUP_G, chipYawFor(CUP_G)); putWorld(cupR, CUP_R, 0);
    G.lookAt(W(G, -0.3, 0.55 + 0.45 * e1, 0.9), 0.3);
    guardPhoneEar(1);
    G.reach('L', W(G, 0.115, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 });
    restHandsLap();
    R.lookAt(out > 0.5 ? V(8, 1.1, 0.9) : G.eye(V(0, 0, 0)), 0.6);
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 0, 0, 1);
    const mid = G.eye(V(0, 0, 0)).lerp(R.eye(V(0, 0, 0)), 0.5);
    const cp = V(2.42, 1.30, 1.52).lerp(mid, 0.02 * ramp(tl, 0, 3.29));
    aim(cp, mid, 0.50, 0.45, 50);
    faceBounce(G.eye(V(0, 0, 0)), 0.05); logFace('S074', G);
    dbgPts = { ge: G.eye(V(0, 0, 0)), re: R.eye(V(0, 0, 0)), gloves: GLOVES_POS, cupG: CUP_G };
    return { dof: { focus: dist(mid), fstop: 5.6 }, saturation: 0.82 };
  };

  // ---------------- S077: first light — cap off (237.54 = tl 0.46), pour hers (238.26 = 1.18), his (238.97 = 1.89), heads to the window (239.6 = 2.52)
  setups.S077 = (tl, u, T) => {
    setTime(T); resetProps();
    winLight.castShadow = true; lampKey.castShadow = false;
    const look = ramp(tl, 2.45, 2.95);
    seatedPair({ gLean: 0.38, gBow: 0.16 * (1 - look), gTurn: 0.3 * (1 - look) - 0.05, rTurn: lerp(-0.45, 0.12, look), rBow: 0.03 * (1 - look) });
    putWorld(cupG, CUP_G, chipYawFor(CUP_G)); putWorld(cupR, CUP_R, 0);
    putWorld(phone, W(G, -0.12, SEAT_Y + 0.17, 0.2), Math.PI / 2 + YAW_G); phone.rotation.x = Math.PI;
    // thermos in his right hand: pick up (0–0.3), cap off by the left hand (0.2–0.46), pour hers (1.18–1.6), his (1.89–2.15), cap on (2.2), down (2.5)
    const pick = ramp(tl, 0.0, 0.3) * (1 - ramp(tl, 2.25, 2.6));
    const capOff = ramp(tl, 0.2, 0.46) * (1 - ramp(tl, 2.05, 2.25));
    const toHer = ramp(tl, 0.55, 1.1) * (1 - ramp(tl, 1.6, 1.85)), toHis = ramp(tl, 1.6, 1.85) * (1 - ramp(tl, 2.15, 2.3));
    const tiltHer = ramp(tl, 1.0, 1.18) * (1 - ramp(tl, 1.52, 1.62)), tiltHis = ramp(tl, 1.75, 1.89) * (1 - ramp(tl, 2.08, 2.18));
    const up = W(G, -0.12, 0.92, 0.32);
    const overHer = CUP_R.clone().add(V(-0.07, 0.17, 0.10)), overHis = CUP_G.clone().add(V(-0.07, 0.17, 0.10));
    const tp = THERMOS_POS.clone().lerp(up, pick); tp.lerp(overHer, toHer); tp.lerp(overHis, toHis);
    const tilt = Math.max(tiltHer, tiltHis);
    if (thermos.parent !== scene) scene.add(thermos);
    thermos.position.copy(tp); thermos.rotation.set(0, 0.4, 0);
    thermos.rotateOnWorldAxis(V(-0.45, 0, 0.9).normalize(), -1.75 * tilt);
    thermos.updateMatrixWorld(true);
    const grip = thermos.localToWorld(V(-0.045, 0.11, 0.0));
    if (pick > 0.02) { G.hands.R.pose('grip', { radius: 0.04 }); G.reach('R', grip, { palm: thermos.localToWorld(V(1, 0.11, 0)).sub(grip).normalize(), fingers: V(0.2, 0, -1).normalize(), elbowOut: 0.6 }); }
    else { G.reach('R', W(G, -0.115, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.R.pose('relaxed', { curl: 0.8 }); }
    if (capOff > 0.02) {
      const lidW = thermos.localToWorld(V(0, 0.19, 0)).lerp(W(G, 0.12, 0.72, 0.36), easeIO(capOff)).add(V(0, 0.06 * Math.sin(Math.PI * capOff), 0));
      putWorld(thermosLid, lidW, capOff * 2.5);
      G.hands.L.pose('grip', { radius: 0.044 });
      G.reach('L', lidW.clone().add(V(0, 0.035, 0)), { palm: V(0, -1, 0), fingers: dirW(G, 0.3, -0.3, 1) });
    } else { G.reach('L', W(G, 0.115, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 }); }
    restHandsLap();
    const pourHer = tl > 1.18 && tl < 1.6, pourHis = tl > 1.89 && tl < 2.15;
    if (pourHer || pourHis) {
      const spout = thermos.localToWorld(V(0, 0.225, 0)), dst = (pourHer ? CUP_R : CUP_G).clone().add(V(0, 0.055, 0));
      stream.visible = true; stream.position.copy(spout).lerp(dst, 0.5); stream.scale.set(1, spout.distanceTo(dst), 1);
      stream.quaternion.setFromUnitVectors(V(0, 1, 0), spout.clone().sub(dst).normalize());
    }
    G.lookAt(tl < 2.45 ? (toHis > 0.5 ? CUP_G : CUP_R) : V(8, 1.1, 1.6), tl < 2.45 ? 0.55 : 0.6);
    R.lookAt(tl < 2.45 ? thermos.getWorldPosition(V(0, 0, 0)) : V(8, 1.15, 1.2), 0.6);
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, smoothstep(1.89, 2.5, tl), smoothstep(1.18, 1.8, tl), 1.5);
    const re = R.eye(V(0, 0, 0));
    const cp = V(1.95, +(q.get("c77y") || 1.38), 2.15).lerp(re, 0.03 * ramp(tl, 0, 2.92));   // (review) 1.56 lifted the cups but lost the dawn sky: kept low
    aim(cp, re, 0.33, 0.40, 50);
    fill.intensity = 1.2;
    dbgPts = { re, ge: G.eye(V(0, 0, 0)), cupR: CUP_R, cupG: CUP_G };
    return { dof: { focus: (dist(re) + dist(G.eye(V(0, 0, 0)))) / 2, fstop: 5.6 } };
  };

  // ---------------- S079: from behind, WS 32 mm, slow pull back ~0.8 m (12-frame ease-in); dawn warms from 243.56; deep focus
  setups.S079 = (tl, u, T) => {
    setTime(T); resetProps();
    winLight.castShadow = true; lampKey.castShadow = false;
    seatedPair({ gLean: 0.30, gBow: 0.04, gTurn: 0.1, rTurn: 0.06, rBow: -0.02 });
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    putWorld(phone, W(G, -0.12, SEAT_Y + 0.17, 0.2), Math.PI / 2 + YAW_G); phone.rotation.x = Math.PI;
    guardHandsOnThighs(); restHandsLap();
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 0.8, 0.8, 1.6);
    const k = clamp(tl / 4.0, 0, 1), kk = k < 0.125 ? 4 * k * k : k - 0.0625;   // 12-frame ease-in then constant
    const x = lerp(1.35, 0.55, kk / 0.9375);
    const cp = V(x, 1.43, 0.06);
    cam.lens(camera, 32); cam.place(camera, cp, cp.clone().add(V(1, -0.03, -0.008)));
    lampKey.intensity = 1.1; fill.intensity = 0.4; shadeMat.emissiveIntensity = 0.12; lampGlow.set(0.08);
    dbgPts = { G: G.worldPos('chest'), R: R.worldPos('chest'), cups: CUP_G.clone().lerp(CUP_R, 0.5), ge: G.eye(V(0, 0, 0)) };
    const warm = smoothstep(1.52, 4.0, tl);                              // 243.56: the sky begins to warm
    return { dof: null, exposure: 1.0, temp: lerp(-0.08, 0.02, warm), saturation: 0.95, contrast: 1.08, _ext: 0.75 };
  };

  // ---------------- S081: FINAL — the two cups on the sill, fresh steam, the brightening SE window, the pair reflected in
  // the darker pane (approved through-view + reflection layering); a ray of morning light enters the steam on the last chord
  const S81 = { bear: +(q.get('b81') || 102), d: +(q.get('d81') || 1.06), h: +(q.get('h81') || 0.07), ex: +(q.get('e81') || 0.7) };
  setups.S081 = (tl, u, T) => {
    setTime(T); resetProps();
    winLight.castShadow = true; lampKey.castShadow = false;
    seatedPair({ gLean: 0.30, gBow: 0.06, gTurn: 0.12, rTurn: 0.06 });
    guardHandsOnThighs(); restHandsLap();
    G.breathe(T, 0.4); R.breathe(T + 0.7, 0.4);
    putWorld(phone, W(G, -0.12, SEAT_Y + 0.17, 0.2), Math.PI / 2 + YAW_G); phone.rotation.x = Math.PI;
    // tripod, locked: sill height, 75 mm, ~20° off the east pane's normal (chip at 2 o'clock, line level)
    const mid = CUP_G.clone().lerp(CUP_R, 0.5).add(V(0, 0.036, 0));
    const bb = S81.bear * D2R, dir = V(Math.sin(bb), 0, -Math.cos(bb));
    const cp = mid.clone().addScaledVector(dir, -S81.d); cp.y += S81.h;
    aim(cp, mid, 0.51, 0.63, 75);
    putWorld(cupG, CUP_G, chipYawFor(CUP_G)); putWorld(cupR, CUP_R, 0.9);
    // reflection layer: the seated pair seen from the window side (mirrored in the glass shader) → the darker left pane
    const vis = [cupG.visible, cupR.visible, phone.visible];
    cupG.visible = cupR.visible = false; steamG.object3D.visible = steamR.object3D.visible = false; bgQuad.visible = false; lightPts.visible = false;
    for (const g of glassMeshes) g.visible = false;
    // (review) both people small and soft inside the left lite: a mirror-side camera 2.2 m out, the RT drawn at the rect's aspect
    refCam.position.set(5.45, 1.02, -0.06); refCam.lookAt(3.25, 1.12, -0.06); refCam.fov = 21; refCam.aspect = REF_RECT_ASPECT; refCam.updateProjectionMatrix();
    const r = ctx.renderer, prev = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
    const lc = [lampKey.castShadow, winLight.castShadow]; lampKey.castShadow = winLight.castShadow = false;
    r.setRenderTarget(refRT); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, refCam);
    r.setRenderTarget(prev); r.setClearColor(cc, ca);
    [lampKey.castShadow, winLight.castShadow] = lc;
    for (const g of glassMeshes) g.visible = true;
    bgQuad.visible = true; lightPts.visible = true; [cupG.visible, cupR.visible, phone.visible] = vis;
    G.root.visible = R.root.visible = false;                  // the people are beside / behind the camera
    glassUniforms.uRefK.value = +(q.get('rk81') || 0.2); glassUniforms.uRefRect.value.set(REF_RECT[0], REF_RECT[1], REF_RECT[2], REF_RECT[3]);
    mFrame.color.copy(FRAME_COL).multiplyScalar(0.5);                         // the muntins read dark against the morning (backlit)
    // daylight now leads: the lamp is still on but small; cool sky fill from the darker NE/E panes, 4300 K window key
    lampKey.intensity = 0.7; lampUp.intensity = 0.05; hemi.color.set('#9aaac4'); hemi.intensity = +(q.get('hm81') || 0.1); glassUniforms.uRefl.value = 0.15;
    fill.color.set('#c4cfe0'); fill.intensity = +(q.get('f81') || 6.0); fill.angle = 0.13; fill.penumbra = 0.6; fill.position.copy(cp).add(V(0.1, 0.45, -0.6)); fill.target.position.copy(mid);
    // (review) S081's own dawn: blue-grey P20 horizon away from the sun, the P21 peach glow gathered toward the SE (frame right),
    // continuing S080's lavender morning — the generic dawn preset's uniform peach horizon + haze read as a beige wall at sill height
    sky.blend(SKY_P, SKY_D81, smoothstep(0, 1, dNow - 1));
    seaU.uReflect.value = +(q.get('sr81') || 0.5);                            // a darker sea band under the morning sky (structure behind the steam)
    sky.uniforms.uSkyExposure.value = +(q.get('sx81') || 0.62);
    // the morning ray on the last chord (252.55 = tl 3.26): from the SE pane, screen-right, into the steam
    const ray = smoothstep(3.2, 3.95, tl);
    rayShaft.object3D.visible = ray > 0.001; rayShaft.material.uniforms.uInt.value = +(q.get('ry81') || 14) * ray; rayShaft.update(T);
    steamUpdate(T, 1, 1, 1.1 + 1.5 * ray, [0.004, -0.002]);
    steamG.material.uniforms.uOp.value = steamR.material.uniforms.uOp.value = 0.13 + 0.05 * ray;
    dbgPts = { cupG: CUP_G.clone().add(V(0, 0.034, 0)), cupR: CUP_R.clone().add(V(0, 0.034, 0)), cupGtop: CUP_G.clone().add(V(0, 0.068, 0)), cupGbot: CUP_G.clone(), sillEdge: V(3.76, SILL_Y, 0.23), corner: V(3.97, 1.0, 0.5), mull: V(4.0, 1.0, 0.0) };
    const warm = smoothstep(0, 7.54, tl);
    return { dof: { focus: dist(mid), fstop: +(q.get('fs81') || 4.5) }, exposure: S81.ex, temp: lerp(-0.06, 0.04, warm), saturation: 0.96, contrast: 1.12, bloom: { strength: 0.35, threshold: 0.8 }, _ext: 0.75 };
  };

  // ---------------- view_bay_back: the pair (or GUARD alone, before 195 s) from behind, facing the east window; time-aware
  setups.view_bay_back = (tl, u, T) => {
    setTime(T); resetProps();
    const both = T >= 197.0;
    guardBase({ lean: both ? 0.36 : 0.5, bow: both ? 0.12 : 0.35 });
    guardHandsOnThighs();
    putWorld(thermos, THERMOS_POS, 0.4);
    if (T < 190.6) { guardPhoneLap(); phone.userData.cover.rotation.x = COVER_OPEN; phoneGlow(T > 187.3 ? 1 : 0); faceGlasses.visible = true; if (hangGlasses) hangGlasses.visible = false; }
    else phoneOnThigh();
    if (both) { restBase({}); restHandsLap(); putWorld(cupG, CUP_G); putWorld(cupR, CUP_R); putWorld(gloves, GLOVES_POS, 0.5); }
    else { R.root.visible = false; cupG.visible = cupR.visible = false; gloves.visible = false; }
    G.breathe(T); R.breathe(T + 1.3);
    const hot = T < 224 ? 1 : T > 237.6 ? 1 : 0;                   // tea cold in CH4 until the refill
    steamUpdate(T, both ? hot : 0, both ? hot : 0, 1.2);
    lampKey.castShadow = false;                                   // nested: no shadow pass
    aim(V(0.35, 1.45, 0.02), V(3.5, 1.05, 0.0), 0.5, 0.55, 40);
    return { dof: null };
  };

  const OFF = new Set((q.get('nw') || '').split(',').filter(Boolean));
  return {
    scene, camera,
    post: { exposure: 1.15, contrast: 1.06, saturation: 0.9, temp: -0.06, shadowTint: [0.45, 0.49, 0.58], highTint: [0.56, 0.52, 0.47], grain: 0.035, vignette: 0.34, aberration: 0.45,
      bloom: { strength: 0.42, radius: 0.6, threshold: 0.75 } },
    setShot(shot, tl, u, T) {
      const f = setups[shot.id] || setups.default;
      dbgPts = null;
      const p = f(tl, u, T, shot) || {};
      const extK = p._ext ?? 0.5; delete p._ext;
      if (q.get('cam')) { const c = q.get('cam').split(',').map(Number); cam.lens(camera, c[6] || 50); cam.place(camera, c.slice(0, 3), c.slice(3, 6)); if (p.dof) p.dof.focus = camera.position.distanceTo(V(c[3], c[4], c[5])); }
      if (shot.nested) lightPts.material.uniforms.uPxK.value = 0.55;
      if (OFF.has('noshadow')) { lampKey.castShadow = false; winLight.castShadow = false; }
      if (OFF.has('noglass')) for (const g of glassMeshes) g.visible = false;
      if (OFF.has('nofig')) G.root.visible = R.root.visible = false;
      if (OFF.has('nog')) G.root.visible = false;
      if (OFF.has('nor')) R.root.visible = false;
      if (q.get('rhide')) for (const k of q.get('rhide').split('~')) R.setLayerVisible(k, false);
      if (q.get('rlayers')) console.log('R layers', Object.keys(R.layers).join(','));
      if (q.get('gmats')) console.log('G mats', Object.keys(G.materials).join(','), 'G layers', Object.keys(G.layers).join(','), 'acc', Object.keys(G.accessories).join(','));
      if (OFF.has('norhands')) { R.hands.L.root.visible = false; R.hands.R.root.visible = false; }
      if (q.get('rlist')) { const out = []; R.root.traverseVisible((o) => { if (o.isMesh || o.isPoints || o.isLine) out.push((o.name || o.type) + ':' + (o.material && o.material.type) + ':' + (o.geometry && o.geometry.attributes.position.count)); }); console.log('R visible', out.join(' | ')); }
      if (OFF.has('norL')) R.hands.L.root.visible = false;
      if (OFF.has('norR')) R.hands.R.root.visible = false;
      renderExterior(T, shot.nested ? 0.5 : extK, !!shot.nested);
      if (OFF.has('noext')) bgMat.uniforms.tBg.value = null;
      if (OFF.has('nodof')) p.dof = null;
      if (q.get('pts') && dbgPts) { const o = {}; for (const [k, v] of Object.entries(dbgPts)) o[k] = scr(v); console.log('PTS', shot.id, tl.toFixed(2), JSON.stringify(o), 'cam', camera.position.toArray().map((x) => +x.toFixed(3)).join(',')); }
      return p;
    },
  };
}
