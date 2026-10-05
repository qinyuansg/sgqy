// night_window — LOC_WINDOW: the three-sided bay at the east end of the upper corridor (present day, ~04:00 → dawn).
// Shots: S059 S060 (guard alone, phone) · S062 S063 S064 S065 (tea, the two-shot, hands, the nod) · S072 S073 S074 (the call)
//        · S077 (refill at first light) · S079 (from behind, dawn) · S081 (the two cups — final shot of the film).
// Named view for nested renders: view_bay_back (the pair from behind through the corridor's glazed screen: S061, S066).
//
// World: metres, Y up, +X = east, +Z = south (sky.js azimuths are then compass bearings). Floor y = 0 (2nd floor; the
// harbour water is 8 m below). The corridor's glazed screen is x = 0; the bay room runs to x = 2.4 where the canted bay
// (bible: 1.6 m deep, 4.2 m wide, faces NE / E / SE at 45°) projects to the east pane at x = 4.0 (1.0 m wide, centre
// mullion). Built-in teak bench parallel to the east pane; GUARD sits on its south half (nearer the SE window, screen-right
// in the bay coverage), RESTORER on its north half, 62 cm centre to centre; both face east. Cups on the east sill between
// them, his (chip at 2 o'clock) south = screen-right, hers 6 cm north of it. Reading lamp (2700 K floor lamp) in the
// bay's north-east corner behind the bench end.
//
// Coverage (director ruling BAY_3Q): camera in the bay room's south-west part looking NNE/NE — east window screen-right,
// GUARD foreground-right, RESTORER beside him screen-left; S079 / view_bay_back = the reverse (from the west, behind them).
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { createSky } from '../lib/sky.js';
import { createSea, createCoast } from '../lib/sea.js';
import { loadCharacter } from '../lib/cast.js';
import { blendHandChannels, handPose } from '../lib/hand.js';
import { Figure } from '../lib/figure.js';
const Figure_blend = (a, b, t) => Figure.blend(a, b, t);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const hex = (h) => new THREE.Color(h);

// ---- bible colours
const C = {
  P01: '#0E1B30', P02: '#1A2D4A', P03: '#2E4A6E', P04: '#C8D2DB', P05: '#8F9EAD', P06: '#EDF1EF', P07: '#2B4A8B', P13: '#E2A458',
  P20: '#5B6F8A', P21: '#EBB894', P22: '#F5E4C8', P28: '#0A0F17', P29: '#C9D8E6', P30: '#C9A55A',
  frame: '#E3DED3', bench: '#6A4A32', cushion: '#6B6C6A', plaster: '#C9C3B7', glaze: '#E6ECEC', steel: '#8E9296', navyLid: '#26324A',
  phone: '#3A3D42', phoneCase: '#26324A', glove: '#F1EFE8', lampShade: '#E8DCC4', lampMetal: '#2A2622',
};
const K2700 = hex('#ffb46b'), K6500 = hex('#dce8ff'), MOONC = hex('#9fb4d8');

// ---- geometry constants (see header)
const SILL_Y = 0.72, GLASS_X = 4.0, EAST_HALF = 0.5, BAY_BASE_X = 2.4, BAY_HALF = 2.1, ROOM_HALF = 2.7, CEIL = 3.05, HEAD_Y = 2.62;
const SEAT_Y = 0.45, SEAT_X = 3.43;
const SEAT_G = V(SEAT_X, 0, 0.31), SEAT_R = V(SEAT_X, 0, -0.31);
const CUP_G = V(3.875, SILL_Y, 0.073), CUP_R = V(3.875, SILL_Y, -0.069);   // 14.2 cm centre to centre = 6 cm gap
const THERMOS_POS = V(3.40, SEAT_Y, 0.80);
const GLOVES_POS = V(3.30, SEAT_Y, -0.86);
const LAMP_BASE = V(3.02, 0, -1.30), LAMP_HEAD = V(3.42, 1.68, -0.90);
const SEA_LEVEL = -8.2;

export default async function create(ctx) {
  const { util, cam } = ctx;
  const { clamp, lerp, remap, smoothstep, ease, keys, noise1 } = util;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.02, 9000);
  camera.userData.H = ctx.H;
  const q = new URLSearchParams(location.search);

  // ================================================================== helpers
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const add = (m, parent = scene) => { parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // horizontal prism from a plan polygon [[x,z],...] (CCW or CW), y0 → y1
  function prism(poly, y0, y1, mat, { sides = true } = {}) {
    const shape2 = poly.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(shape2, []);
    const pos = [], uv = [];
    const push = (x, y, z) => { pos.push(x, y, z); uv.push(x, z); };
    const cw = THREE.ShapeUtils.isClockWise(shape2);
    for (const [a, b, c] of tris) { // top (normal +Y) and bottom
      const A = poly[a], B = poly[b], Cc = poly[c];
      if (!cw) { push(A[0], y1, A[1]); push(Cc[0], y1, Cc[1]); push(B[0], y1, B[1]); push(A[0], y0, A[1]); push(B[0], y0, B[1]); push(Cc[0], y0, Cc[1]); }
      else { push(A[0], y1, A[1]); push(B[0], y1, B[1]); push(Cc[0], y1, Cc[1]); push(A[0], y0, A[1]); push(Cc[0], y0, Cc[1]); push(B[0], y0, B[1]); }
    }
    if (sides) for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const p = cw ? [A, B] : [B, A];
      const [P, Q] = p;
      pos.push(P[0], y0, P[1], Q[0], y0, Q[1], Q[0], y1, Q[1], P[0], y0, P[1], Q[0], y1, Q[1], P[0], y1, P[1]);
      const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
      uv.push(0, y0, L, y0, L, y1, 0, y0, L, y1, 0, y1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
  }
  // a vertical wall quad between plan points a → b (inward normal = left of a→b when looking down), y0..y1
  function wallQuad(a, b, y0, y1, mat, inside = [1.5, 0], uvScale = 1) {
    // orient so the visible (front) side faces the `inside` plan point
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
  const rng = util.rng;

  // ================================================================== materials
  const mPlaster = TX.mat('plaster_museum', { repeat: [0.6, 0.6], color: hex('#d8d2c6') });
  const mFrame = std({ color: hex(C.frame), roughness: 0.55, metalness: 0 });
  const mSill = std({ color: hex('#e6e1d6'), roughness: 0.42, metalness: 0 });
  const mFloor = TX.mat('teak', { repeat: [0.45, 0.45], roughness: 1 });
  const mBench = TX.mat('teak', { repeat: [0.7, 0.7], color: hex('#c49a78'), tex: { seed: 9 } });
  const mCushion = std({ color: hex(C.cushion), roughness: 0.95 });
  const mCeil = std({ color: hex('#bdb6aa'), roughness: 0.95 });
  const mDark = std({ color: hex('#2a2724'), roughness: 0.8 });

  // ================================================================== exterior: sky, sea, harbour
  const SKY_BASE = { moonAz: 238, moonElev: 34, stars: 0.22, cloudCover: 0.28, cloudScale: 0.09, sunAz: 112 };
  const sky = createSky({ preset: 'night', ...SKY_BASE, exposure: 1.0 });
  sky.object3D.renderOrder = 1000;   // after the interior + sea: the dome only shades the pixels seen through the glass
  scene.add(sky.object3D);
  const sea = createSea({ sky, swell: 'calm', windDir: 200, level: SEA_LEVEL, foam: 0.05, glitter: 0.8, cols: 96, rows: 72, fogDensity: 0.0004 });
  sea.object3D.renderOrder = 900;  // after the opaque interior (early-z rejects the hidden water)
  scene.add(sea.object3D);
  const coastN = createCoast({ sky, distance: 5200, az0: 8, az1: 78, height: 60, seed: 12, lights: 3, lightIntensity: 4.5, lightPx: 2.4, level: SEA_LEVEL, haze: 0.35 });
  const coastS = createCoast({ sky, distance: 6400, az0: 152, az1: 182, height: 34, seed: 4, lights: 1, lightIntensity: 3.5, lightPx: 2.2, level: SEA_LEVEL, haze: 0.45 });
  scene.add(coastN.object3D, coastS.object3D);
  coastN.land.renderOrder = coastS.land.renderOrder = 1001;          // after the dome (the land sits beyond the dome's depth)
  // silhouettes (breakwater, ships, cranes): dark, hazed toward the sky's horizon colour by distance
  const silMats = [];
  const silMat = (dist) => { const m = new THREE.MeshBasicMaterial({ color: 0x06080d, fog: false }); m.userData.dist = dist; silMats.push(m); return m; };
  const ext = new THREE.Group(); scene.add(ext);
  const at = (bearing, dist) => [Math.sin(bearing * D2R) * dist, -Math.cos(bearing * D2R) * dist];
  // breakwater: a low mole from the south curving out to the harbour-mouth light at ~118°, 620 m
  {
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; const b = lerp(168, 118, t), d = lerp(430, 620, Math.pow(t, 0.8)); pts.push(at(b, d)); }
    const m = silMat(500);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; const L = Math.hypot(x1 - x0, z1 - z0);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(L + 0.5, 2.4, 6), m); seg.position.set((x0 + x1) / 2, SEA_LEVEL + 0.9, (z0 + z1) / 2); seg.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); ext.add(seg);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 9, 10), m); const [tx, tz] = at(118, 624); tower.position.set(tx, SEA_LEVEL + 5, tz); ext.add(tower);
  }
  // anchored ships: [bearing, dist, length, heading]
  const SHIPS = [[86, 1150, 120, 20], [101, 1900, 160, -15], [131, 2600, 140, 40], [72, 2900, 180, 5]];
  for (const [b, d, L, hd] of SHIPS) {
    const m = silMat(d); const g = new THREE.Group(); const [x, z] = at(b, d); g.position.set(x, SEA_LEVEL, z); g.rotation.y = hd * D2R;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(L, 9, L * 0.16), m); hull.position.y = 2.5; g.add(hull);
    const sup = new THREE.Mesh(new THREE.BoxGeometry(L * 0.16, 12, L * 0.13), m); sup.position.set(-L * 0.34, 12, 0); g.add(sup);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 1.2), m); mast.position.set(L * 0.3, 16, 0); g.add(mast);
    ext.add(g);
  }
  // container cranes on the far (north-east) side
  const CRANES = [[38, 2300], [44, 2350], [50, 2420], [57, 2500]];
  for (const [b, d] of CRANES) {
    const m = silMat(d); const g = new THREE.Group(); const [x, z] = at(b, d); g.position.set(x, SEA_LEVEL, z); g.rotation.y = (b + 90) * D2R;
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 48, 2), m); leg.position.set(s * 11, 24, 0); g.add(leg); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 3), m); beam.position.set(0, 46, 0); g.add(beam);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 70), m); boom.position.set(0, 50, 18); g.add(boom);
    ext.add(g);
  }
  // point lights of the harbour (constant pixel size, twinkle): [x, y, z, r, g, b, px, phase]
  const LP = [];
  const lamp = (b, d, y, col, k, px) => { const [x, z] = at(b, d); const c = hex(col).multiplyScalar(k); LP.push([x, SEA_LEVEL + y, z, c.r, c.g, c.b, px]); };
  lamp(118, 624, 10, C.P13, 7, 3.4);                                     // harbour-mouth light (slow blink)
  for (let i = 0; i < 7; i++) lamp(lerp(160, 124, i / 6), lerp(450, 600, i / 6), 2.6, C.P13, 2.2, 2.0);   // mole lamps
  for (const [b, d, L, hd] of SHIPS) {                                   // deck + masthead lights
    const r = rng(Math.round(b * 7 + d));
    for (let i = 0; i < 4; i++) lamp(b + (r() - 0.5) * L / d * 40, d + (r() - 0.5) * 20, 6 + r() * 10, C.P13, 2.8, 2.2);
    lamp(b + 0.3, d, 28, '#fff1d8', 4, 2.4);
  }
  for (const [b, d] of CRANES) { lamp(b, d, 50, C.P13, 3.5, 2.0); lamp(b + 0.6, d, 4, '#ffd9a0', 2.4, 2.4); }
  for (let i = 0; i < 26; i++) { const r = rng(300 + i); lamp(lerp(30, 66, r()), lerp(2150, 2600, r()), 3 + r() * 6, r() < 0.7 ? C.P13 : '#ffe6c0', 1.6 + r() * 1.5, 1.6 + r()); } // terminal
  const FISH = [[97, 1450], [109, 2150], [124, 3300], [92, 3900]];         // the lamps still lit at dawn
  for (const [b, d] of FISH) lamp(b, d, 1.5, C.P13, 5, 2.6);
  const lightPts = (() => {
    const n = LP.length, pa = new Float32Array(n * 3), ca = new Float32Array(n * 3), sa = new Float32Array(n * 2);
    LP.forEach((l, i) => { pa.set(l.slice(0, 3), i * 3); ca.set(l.slice(3, 6), i * 3); sa.set([l[6], i * 0.6180339 % 1], i * 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pa, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(ca, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sa, 2));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uPxK: { value: ctx.H / 536 }, uK: { value: 1 }, uBlink: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 aCol; attribute vec2 aS; uniform float uT, uPxK, uK, uBlink; varying vec3 vC;
        void main(){ float tw = 0.85 + 0.15 * sin(uT * (2.0 + aS.y * 5.0) + aS.y * 50.0);
          float blink = gl_VertexID == 0 ? mix(1.0, 0.25 + 0.75 * smoothstep(0.55, 0.75, fract(uT / 4.0)) * (1.0 - smoothstep(0.9, 1.0, fract(uT / 4.0))), uBlink) : 1.0;
          vC = aCol * tw * blink * uK; gl_PointSize = aS.x * 4.0 * uPxK; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `varying vec3 vC; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); float a = exp(-r2 * 12.0) + 0.1 * exp(-r2 * 2.5); gl_FragColor = vec4(vC * a, 1.0); }` });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -5; ext.add(p); return p;
  })();
  {
    const lamps = [LP[0], LP[8], LP[LP.length - 4], LP[LP.length - 3]].map((l) => ({ position: V(l[0], l[1], l[2]), color: new THREE.Color(l[3], l[4], l[5]).multiplyScalar(1 / Math.max(l[3], l[4], l[5])), intensity: 3.5 }));
    sea.setLamps(lamps);
  }

  // ================================================================== interior shell
  // plan outline of the bay interior (inner faces): room x 0..2.4, then the canted bay to the east pane
  const SILL_D = 0.24;
  const bayPoly = [[0, -ROOM_HALF], [BAY_BASE_X, -ROOM_HALF], [BAY_BASE_X, -BAY_HALF], [GLASS_X, -EAST_HALF], [GLASS_X, EAST_HALF], [BAY_BASE_X, BAY_HALF], [BAY_BASE_X, ROOM_HALF], [0, ROOM_HALF]];
  const floorPoly = [[-6, -ROOM_HALF], ...bayPoly.slice(1, 7), [-6, ROOM_HALF]];
  prism(floorPoly, -0.05, 0, mFloor, { sides: false });
  const ceilMesh = prism(bayPoly.map(([x, z]) => [x, z]), CEIL, CEIL + 0.05, mCeil, { sides: false });
  // room walls
  wallQuad([BAY_BASE_X, -ROOM_HALF], [0, -ROOM_HALF], 0, CEIL, mPlaster);           // north
  wallQuad([0, ROOM_HALF], [BAY_BASE_X, ROOM_HALF], 0, CEIL, mPlaster);            // south
  wallQuad([BAY_BASE_X, -BAY_HALF], [BAY_BASE_X, -ROOM_HALF], 0, CEIL, mPlaster);  // east returns
  wallQuad([BAY_BASE_X, ROOM_HALF], [BAY_BASE_X, BAY_HALF], 0, CEIL, mPlaster);
  // skirting
  const mSkirt = std({ color: hex('#4a3a2c'), roughness: 0.6 });
  // bay faces: [a, b] in plan with the room on the left of a→b (inward)
  const FACES = [
    { name: 'NE', a: [BAY_BASE_X, -BAY_HALF], b: [GLASS_X, -EAST_HALF], lites: 3 },
    { name: 'E', a: [GLASS_X, -EAST_HALF], b: [GLASS_X, EAST_HALF], lites: 2 },
    { name: 'SE', a: [GLASS_X, EAST_HALF], b: [BAY_BASE_X, BAY_HALF], lites: 3 },
  ];
  const LOW0 = SILL_Y + 0.05, LOW1 = 1.76, UP0 = 1.84, UP1 = HEAD_Y - 0.06;
  const glassMeshes = [];
  for (const F of FACES) {
    const [ax, az] = F.a, [bx, bz] = F.b; const L = Math.hypot(bx - ax, bz - az);
    const dir = [(bx - ax) / L, (bz - az) / L], nIn = [-dir[1], dir[0]];   // inward normal (room side)
    F.L = L; F.dir = dir; F.nIn = nIn; F.mid = [(ax + bx) / 2, (az + bz) / 2];
    const ry = Math.atan2(-dir[1], dir[0]);
    const P = (s, y, d = 0) => V(ax + dir[0] * s + nIn[0] * d, y, az + dir[1] * s + nIn[1] * d);
    // apron (below the sill, recessed 4 cm behind the glass line so seated feet tuck in), header above the window
    const ap = box(L, SILL_Y - 0.04, 0.12, mPlaster, 0, 0, 0, ry); ap.position.copy(P(L / 2, (SILL_Y - 0.04) / 2, -0.08));
    const hd = box(L + 0.02, CEIL - HEAD_Y, 0.3, mPlaster, 0, 0, 0, ry); hd.position.copy(P(L / 2, (CEIL + HEAD_Y) / 2, 0.08));
    // frame: jambs at the ends, mullions between lites, sill-rail, transom, head-rail
    const fw = 0.065, fd = 0.11;
    const bar = (s0, s1, y0, y1, d0 = 0.0, dd = fd) => { const b = box(Math.max(0.01, s1 - s0), y1 - y0, dd, mFrame, 0, 0, 0, ry); b.position.copy(P((s0 + s1) / 2, (y0 + y1) / 2, d0)); return b; };
    bar(0, L, SILL_Y + 0.0, LOW0, 0.0);
    bar(0, L, LOW1, UP0, 0.0);
    bar(0, L, UP1, HEAD_Y, 0.0);
    for (let i = 0; i <= F.lites; i++) { const s = (L * i) / F.lites; const w = i === 0 || i === F.lites ? 0.09 : fw; bar(clamp(s - w / 2, 0, L), clamp(s + w / 2, 0, L), SILL_Y, HEAD_Y, 0.0); }
    // upper lights: a glazing bar across each (old 2-pane top lights)
    for (let i = 0; i < F.lites; i++) { const s0 = (L * i) / F.lites, s1 = (L * (i + 1)) / F.lites; bar(s0, s1, (UP0 + UP1) / 2 - 0.012, (UP0 + UP1) / 2 + 0.012, 0.01, 0.03); bar((s0 + s1) / 2 - 0.012, (s0 + s1) / 2 + 0.012, UP0, UP1, 0.01, 0.03); }
    // glass: one pane per lite (lower clear / upper wavy)
    for (let i = 0; i < F.lites; i++) {
      const s0 = (L * i) / F.lites, s1 = (L * (i + 1)) / F.lites;
      for (const [y0, y1, wavy] of [[LOW0, LOW1, 0], [UP0, UP1, 1]]) {
        const g = new THREE.PlaneGeometry(s1 - s0, y1 - y0);
        const m = new THREE.Mesh(g, null); m.position.copy(P((s0 + s1) / 2, (y0 + y1) / 2, -0.02)); m.rotation.y = ry; m.renderOrder = 20;
        m.userData = { face: F.name, wavy, lite: i }; glassMeshes.push(m); scene.add(m);
      }
    }
    F.P = P; F.ry = ry;
  }
  // corner posts at the E/NE and E/SE junctions
  for (const z of [-EAST_HALF, EAST_HALF]) { const b = box(0.12, HEAD_Y - SILL_Y, 0.12, mFrame, GLASS_X - 0.03, (HEAD_Y + SILL_Y) / 2, z, Math.PI / 4); }
  // sill: one slab following the three faces, 24 cm deep from the glass, 4 cm thick, 2 cm nosing
  {
    const outer = [[BAY_BASE_X - 0.02, -BAY_HALF - 0.02], [GLASS_X + 0.03, -EAST_HALF - 0.012], [GLASS_X + 0.03, EAST_HALF + 0.012], [BAY_BASE_X - 0.02, BAY_HALF + 0.02]];
    const off = SILL_D + 0.02, k = Math.tan(22.5 * D2R) * off;
    const inner = [[BAY_BASE_X - 0.02, BAY_HALF + 0.02 - off * Math.SQRT2], [GLASS_X - off, EAST_HALF - k], [GLASS_X - off, -EAST_HALF + k], [BAY_BASE_X - 0.02, -BAY_HALF - 0.02 + off * Math.SQRT2]];
    prism([...outer, ...inner], SILL_Y - 0.04, SILL_Y, mSill);
  }
  // glazed screen to the corridor (x = 0): timber frame, double doors, glass; beyond it a short moonlit corridor stub
  {
    const sx = 0.0, mScr = std({ color: hex('#3f3226'), roughness: 0.55 });
    for (const z of [-2.7, -1.6, -0.8, 0, 0.8, 1.6, 2.7]) box(0.08, CEIL, 0.07, mScr, sx, CEIL / 2, z);
    for (const y of [0.05, 0.95, 2.2, CEIL - 0.03]) box(0.08, 0.07, 5.4, mScr, sx, y, 0);
    const gm = new THREE.MeshBasicMaterial({ color: 0x0a0e14, transparent: true, opacity: 0.12, depthWrite: false });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(5.4, CEIL), gm); sg.position.set(sx, CEIL / 2, 0); sg.rotation.y = Math.PI / 2; scene.add(sg);
    // corridor stub
    wallQuad([-6, -ROOM_HALF], [0, -ROOM_HALF], 0, CEIL + 2, std({ color: hex('#8E8A84'), roughness: 0.9 }), [-3, 0]);
    wallQuad([0, ROOM_HALF], [-6, ROOM_HALF], 0, CEIL + 2, std({ color: hex('#77746e'), roughness: 0.9 }), [-3, 0]);
    // moon pools on the corridor floor (cold, from the arched south windows)
    const pm = new THREE.MeshBasicMaterial({ color: hex('#9fb0c8').multiplyScalar(0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const x of [-2.0, -6.0]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), pm); p.rotation.x = -Math.PI / 2; p.position.set(x + 0.4, 0.003, 0.6); scene.add(p); }
  }
  // built-in teak bench (trapezoid seat following the canted walls), thin grey cushion
  const BENCH_X0 = 3.20, BENCH_X1 = 3.66;
  {
    const zAt = (x) => EAST_HALF + (GLASS_X - x) - 0.03;   // canted wall at x
    const seat = [[BENCH_X0, -zAt(BENCH_X0)], [BENCH_X1, -zAt(BENCH_X1)], [BENCH_X1, zAt(BENCH_X1)], [BENCH_X0, zAt(BENCH_X0)]];
    prism(seat, SEAT_Y - 0.075, SEAT_Y - 0.03, mBench);
    const base = [[BENCH_X0 + 0.04, -zAt(BENCH_X0 + 0.04)], [BENCH_X1 - 0.05, -zAt(BENCH_X1 - 0.05)], [BENCH_X1 - 0.05, zAt(BENCH_X1 - 0.05)], [BENCH_X0 + 0.04, zAt(BENCH_X0 + 0.04)]];
    prism(base, 0, SEAT_Y - 0.075, mBench);
    const cz = zAt(BENCH_X1) - 0.12;
    const cush = prism([[BENCH_X0 + 0.03, -cz - 0.1], [BENCH_X1 - 0.02, -cz], [BENCH_X1 - 0.02, cz], [BENCH_X0 + 0.03, cz + 0.1]], SEAT_Y - 0.03, SEAT_Y, mCushion);
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
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.15, 0.17, 40, 1, true), shadeMat); shade.position.copy(LAMP_HEAD); shade.castShadow = false; lampGrp.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 10), new THREE.MeshBasicMaterial({ color: K2700.clone().multiplyScalar(5) })); bulb.position.copy(LAMP_HEAD).add(V(0, -0.02, 0)); lampGrp.add(bulb);
    lampGrp.userData.shade = shade;
  }
  const lampGlow = FX.glow({ color: K2700, size: 0.5, intensity: 0.2, falloff: 2.6 }); lampGlow.object3D.position.copy(LAMP_HEAD).add(V(0, -0.04, 0)); scene.add(lampGlow.object3D);

  // ================================================================== props
  // --- tea cups (PROP_TEA): lathe, celadon-white glaze, one cobalt line 6 mm below the rim, his with a chip at 2 o'clock
  const CUP_PROFILE = [[0.0, 0.0025], [0.020, 0.0018], [0.0235, 0.0], [0.0268, 0.0012], [0.0272, 0.006], [0.0262, 0.0075], [0.030, 0.011], [0.0345, 0.022], [0.0378, 0.036], [0.0398, 0.050], [0.0408, 0.062], [0.0411, 0.0672],
    [0.0404, 0.068], [0.0390, 0.0668], [0.0384, 0.060], [0.0370, 0.046], [0.0338, 0.029], [0.0285, 0.0155], [0.019, 0.0098], [0.0, 0.0092]].map(([r, y]) => new THREE.Vector2(r, y));
  const envCups = makeCupEnv();
  function cupGeometry(chipPhi = null) {
    const g = new THREE.LatheGeometry(CUP_PROFILE, 72);
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let k = 0;
      if (chipPhi !== null && y > 0.0635) { let dphi = Math.atan2(x, z) - chipPhi; dphi = Math.atan2(Math.sin(dphi), Math.cos(dphi)); k = Math.exp(-(dphi * dphi) / (2 * 0.055 * 0.055)); pos.setY(i, y - 0.0028 * k * smoothstep(0.0635, 0.068, y)); }
      const c = new THREE.Color(1, 1, 1).lerp(hex('#c9bfae'), clamp(k * 1.6, 0, 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  const glazeMat = new THREE.MeshPhysicalMaterial({ color: hex(C.glaze), roughness: 0.14, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.06, vertexColors: true, envMap: envCups, envMapIntensity: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: hex(C.P07), roughness: 0.2, envMap: envCups, envMapIntensity: 0.6 });
  const teaMat = new THREE.MeshPhysicalMaterial({ color: hex('#b8913f'), roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMap: envCups, envMapIntensity: 1.0 });
  function makeCup(chip) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(cupGeometry(chip ? 15 * D2R : null), glazeMat); body.castShadow = body.receiveShadow = true; g.add(body);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.04105, 0.04105, 0.0012, 72, 1, true), lineMat); line.position.y = 0.062; g.add(line);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.0372, 48), teaMat); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.054; g.add(tea);
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), std({ color: hex('#5a5a2c'), roughness: 0.6 })); leaf.scale.set(1, 0.45, 1); leaf.rotation.set(-Math.PI / 2, 0, 0.7); leaf.position.set(0.009, 0.0545, -0.006); g.add(leaf);
    g.userData.tea = tea;
    return g;
  }
  const cupG = makeCup(true), cupR = makeCup(false);
  scene.add(cupG, cupR);
  const steamG = FX.steam({ position: [0, 0.07, 0], count: 18, height: 0.24, width: 0.022, opacity: 0.22, size: 0.03, seed: 3 });
  const steamR = FX.steam({ position: [0, 0.07, 0], count: 18, height: 0.24, width: 0.022, opacity: 0.22, size: 0.03, seed: 7 });
  scene.add(steamG.object3D, steamR.object3D);

  // --- thermos (XREF_THERMOS): dull unbranded steel flask ~25 cm, slight dent, scuffed navy cup-lid
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
  // tea stream for the refill (S077)
  const streamMat = new THREE.MeshStandardMaterial({ color: hex('#c9a55a'), roughness: 0.1, emissive: hex('#5a4520'), emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0032, 1, 8, 1, true), streamMat); stream.visible = false; scene.add(stream);

  // --- phone (PROP_PHONE): dark grey, worn navy flip case (cracked corner), soft unreadable UI
  const phone = new THREE.Group();
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  {
    // landscape canvas: x = along the phone's long axis (x 0 = top end, toward the fingertips), y = across
    const cv = canvas(256, 128), g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#5d6e86'); gr.addColorStop(0.5, '#3e4c62'); gr.addColorStop(1, '#2c3648'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.filter = 'blur(7px)';
    g.fillStyle = 'rgba(225,232,242,0.85)'; g.beginPath(); g.arc(70, 64, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(220,228,240,0.55)'; g.fillRect(108, 30, 10, 68);
    g.fillStyle = 'rgba(220,228,240,0.3)'; g.fillRect(128, 40, 7, 48);
    g.fillStyle = 'rgba(200,214,205,0.75)'; g.beginPath(); g.arc(212, 64, 17, 0, Math.PI * 2); g.fill();
    g.filter = 'none';
    phoneScreenMat.map = ctex(cv);
    const caseMat = new THREE.MeshStandardMaterial({ color: hex(C.phoneCase), roughness: 0.6 });
    const crackMat = new THREE.MeshStandardMaterial({ color: hex('#5a6276'), roughness: 0.7 });
    // phone local: long axis X (toward fingertips = −X when held), screen normal +Y
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.012, 0.078), caseMat); back.castShadow = true; phone.add(back);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0122, 0.003), crackMat); crack.position.set(0.07, 0, 0.034); crack.rotation.y = 0.8; phone.add(crack);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.146, 0.004, 0.071), new THREE.MeshStandardMaterial({ color: hex(C.phone), roughness: 0.3, metalness: 0.4 })); body.position.y = 0.007; phone.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.134, 0.064), phoneScreenMat); scr.rotation.set(-Math.PI / 2, 0, 0); scr.position.y = 0.0092; phone.add(scr);
    phone.userData.screen = scr;
  }
  scene.add(phone);
  const phoneLight = new THREE.PointLight(K6500, 0, 1.2, 2); scene.add(phoneLight);

  // --- folded gloves (PROP_GLOVES): a folded pair, warm white knit
  const gloves = new THREE.Group();
  {
    const gm = new THREE.MeshStandardMaterial({ color: hex(C.glove), roughness: 0.95 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.011, 0.15), gm); a.castShadow = true; gloves.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.13), gm); b.position.set(0.004, 0.0095, -0.01); b.rotation.y = 0.06; b.castShadow = true; gloves.add(b);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: hex('#e8e4d8'), roughness: 1 })); cuff.position.set(0, 0.012, 0.06); gloves.add(cuff);
  }
  scene.add(gloves);

  // ================================================================== figures
  const G = await loadCharacter('GUARD', { lod: 'hi' });
  const R = await loadCharacter('RESTORER', { lod: 'hi', gloves: false });
  for (const f of [G, R]) { f.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(f.root); }
  // reading glasses ON the face (S059–S060): my own pair on the head bone; the library's hanging pair is the cord accessory
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
    faceGlasses.position.set(0, 0.33 * hu - 0.004, 0.42 * hu + 0.012);
    faceGlasses.rotation.x = 0.08;
    G.bone('head').add(faceGlasses);
  }
  const hangGlasses = G.accessories.glasses_cord;

  // ================================================================== lights
  // reading lamp: the key at night (2700 K), the one shadow caster
  const lampKey = new THREE.SpotLight(K2700, 2.6, 0, 0.78, 0.9, 2);
  lampKey.position.copy(LAMP_HEAD).add(V(0, -0.06, 0)); lampKey.target.position.set(3.62, 0.40, -0.06);
  lampKey.castShadow = true; lampKey.shadow.mapSize.set(1536, 1536); lampKey.shadow.bias = -0.0001; lampKey.shadow.normalBias = 0.004; lampKey.shadow.radius = 3;
  lampKey.shadow.camera.near = 0.08; lampKey.shadow.camera.far = 6;
  scene.add(lampKey, lampKey.target);
  const lampUp = new THREE.PointLight(K2700, 0.12, 4.5, 2); lampUp.position.copy(LAMP_HEAD).add(V(0, 0.2, 0)); scene.add(lampUp);   // spill through the top of the shade
  // warm bounce from the lamp-lit sill / bench / floor (motivated fill, no shadow)
  const bounce = new THREE.PointLight(hex('#ffcf9e'), 0.18, 3.0, 2); bounce.position.set(3.15, 0.55, 0.15); scene.add(bounce);
  // the window: night = faint cool harbour/sky light; dawn = the key (soft, big). RectAreaLight-like via a wide SpotLight
  const winLight = new THREE.SpotLight(hex('#9fb2d4'), 0, 0, 1.25, 1.0, 2);
  winLight.position.set(5.6, 1.9, 0.3); winLight.target.position.set(2.4, 0.9, 0.1);
  winLight.castShadow = true; winLight.shadow.mapSize.set(1024, 1024); winLight.shadow.bias = -0.0002; winLight.shadow.normalBias = 0.006; winLight.shadow.radius = 6;
  winLight.shadow.camera.near = 0.5; winLight.shadow.camera.far = 9;
  scene.add(winLight, winLight.target);
  // thin cool edge from the corridor's moonlit arches (behind, west)
  const moonEdge = new THREE.SpotLight(MOONC, 0.3, 0, 0.5, 1.0, 2);
  moonEdge.position.set(-3.5, 3.4, 2.2); moonEdge.target.position.set(3.4, 1.0, 0); scene.add(moonEdge, moonEdge.target);
  // camera-side fill: the lamp's bounce off the white frames / plaster + the corridor's 4000 K floor-level night light
  const fill = new THREE.SpotLight(hex('#ffd9b4'), 2.2, 0, 0.75, 1.0, 2);
  fill.position.set(1.7, 0.95, 1.9); fill.target.position.set(3.45, 0.95, -0.05); scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(hex('#4a5c7c'), hex('#2a2018'), 0.06); scene.add(hemi);

  // ================================================================== window glass (reflections)
  // Static reflection of the lit interior: a cube capture from the bench (figures + exterior hidden) — the lamp and the
  // warm room in the night panes. The east pane can switch to a true planar mirror (S081: the two people reflected).
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.05, 50, cubeRT);
  cubeCam.position.set(3.2, 1.3, 0.0);
  const mirrorRT = new THREE.WebGLRenderTarget(Math.round(ctx.W * 0.5), Math.round(ctx.H * 0.5), { type: THREE.HalfFloatType });
  const mirrorCam = new THREE.PerspectiveCamera();
  const mirrorTexMat = new THREE.Matrix4();
  const glassUniforms = {
    uCube: { value: cubeRT.texture }, uMirror: { value: mirrorRT.texture }, uTexMat: { value: mirrorTexMat }, uUseMirror: { value: 0 },
    uRefl: { value: 1.0 }, uMirrorK: { value: 1.0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uNoise: { value: TX.noiseTexture() }, uT: { value: 0 },
  };
  const glassMat = (wavy, mirror) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { ...glassUniforms, uWavy: { value: wavy }, uIsMirror: { value: mirror ? 1 : 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform samplerCube uCube; uniform sampler2D uMirror, uNoise; uniform mat4 uTexMat; uniform float uUseMirror, uIsMirror, uRefl, uMirrorK, uWavy, uT; uniform vec3 uTint;
      varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main(){
        vec3 V = normalize(vW - cameraPosition); vec3 N = normalize(vN); if (dot(N, V) > 0.0) N = -N;
        // old cylinder glass: low-frequency waviness in the upper lights (reflections bend), a whisper in the lower
        vec2 nz = texture2D(uNoise, vW.zy * vec2(0.9, 2.6) + vW.x * 0.3).rg - 0.5;
        vec2 nz2 = texture2D(uNoise, vW.zy * vec2(3.5, 7.0)).ba - 0.5;
        vec3 Np = normalize(N + vec3(nz.x, nz.y, nz.x) * (0.018 + 0.05 * uWavy) + vec3(nz2.x, nz2.y, 0.0) * 0.012 * uWavy);
        float c = clamp(dot(-V, Np), 0.0, 1.0);
        float F = 0.045 + 0.955 * pow(1.0 - c, 5.0);
        vec3 R = reflect(V, Np);
        vec3 col = textureCube(uCube, R).rgb;
        if (uUseMirror * uIsMirror > 0.5) {
          vec4 pc = uTexMat * vec4(vW + Np * 0.0, 1.0);
          vec2 muv = pc.xy / pc.w + (Np.xy - N.xy) * 0.25;
          col = mix(col, texture2D(uMirror, muv).rgb, uMirrorK);
        }
        float absorb = 0.05 + 0.04 * uWavy;
        gl_FragColor = vec4(col * F * uRefl * uTint, absorb);
      }`,
  });
  const gmCache = {};
  for (const m of glassMeshes) { const key = `${m.userData.wavy}_${m.userData.face === 'E' ? 1 : 0}`; m.material = gmCache[key] || (gmCache[key] = glassMat(m.userData.wavy, m.userData.face === 'E')); }
  let mirrorOn = false;
  const mirrorPlaneMesh = glassMeshes.find((m) => m.userData.face === 'E' && !m.userData.wavy);
  // planar mirror render for the east pane (Reflector maths), triggered from that pane's onBeforeRender
  const _rp = V(0, 0, 0), _cp = V(0, 0, 0), _n = V(-1, 0, 0), _view = V(0, 0, 0), _tgt = V(0, 0, 0), _look = V(0, 0, 0), _rot = new THREE.Matrix4();
  const _plane = new THREE.Plane(), _clip = new THREE.Vector4(), _q4 = new THREE.Vector4();
  const mirrorHide = [];
  mirrorPlaneMesh.onBeforeRender = (renderer, sc, camIn) => {
    if (!mirrorOn || camIn !== camera) return;
    _rp.set(GLASS_X - 0.02, 1.2, 0); _cp.setFromMatrixPosition(camIn.matrixWorld);
    _view.subVectors(_rp, _cp); if (_view.dot(_n) > 0) return;
    _view.reflect(_n).negate().add(_rp);
    _rot.extractRotation(camIn.matrixWorld);
    _look.set(0, 0, -1).applyMatrix4(_rot).add(_cp);
    _tgt.subVectors(_rp, _look).reflect(_n).negate().add(_rp);
    mirrorCam.position.copy(_view); mirrorCam.up.set(0, 1, 0).applyMatrix4(_rot).reflect(_n); mirrorCam.lookAt(_tgt);
    mirrorCam.far = camIn.far; mirrorCam.near = camIn.near; mirrorCam.updateMatrixWorld(); mirrorCam.projectionMatrix.copy(camIn.projectionMatrix);
    mirrorTexMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    mirrorTexMat.multiply(mirrorCam.projectionMatrix); mirrorTexMat.multiply(mirrorCam.matrixWorldInverse);
    _plane.setFromNormalAndCoplanarPoint(_n, _rp); _plane.applyMatrix4(mirrorCam.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const pm = mirrorCam.projectionMatrix;
    _q4.x = (Math.sign(_clip.x) + pm.elements[8]) / pm.elements[0]; _q4.y = (Math.sign(_clip.y) + pm.elements[9]) / pm.elements[5]; _q4.z = -1; _q4.w = (1 + pm.elements[10]) / pm.elements[14];
    _clip.multiplyScalar(2 / _clip.dot(_q4));
    pm.elements[2] = _clip.x; pm.elements[6] = _clip.y; pm.elements[10] = _clip.z + 1 - 0.003; pm.elements[14] = _clip.w;
    const hidden = []; for (const o of mirrorHide) if (o.visible) { o.visible = false; hidden.push(o); }
    for (const g of glassMeshes) g.visible = false;
    const prevRT = renderer.getRenderTarget(), sau = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(mirrorRT); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
    renderer.render(sc, mirrorCam);
    renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate = sau;
    for (const g of glassMeshes) g.visible = true;
    for (const o of hidden) o.visible = true;
  };
  mirrorHide.push(sky.object3D, sea.object3D, coastN.object3D, coastS.object3D, ext, lampGlow.object3D);

  // cube capture of the interior once (lamp on, night): figures, exterior and glass hidden
  {
    const hide = [G.root, R.root, sky.object3D, sea.object3D, coastN.object3D, coastS.object3D, ext, ...glassMeshes, cupG, cupR, thermos, phone, gloves, steamG.object3D, steamR.object3D];
    for (const o of hide) o.visible = false;
    scene.background = new THREE.Color(0x02040a);
    cubeCam.update(ctx.renderer, scene);
    scene.background = null;
    for (const o of hide) o.visible = true;
  }

  // ================================================================== time-of-night: sky / exterior / window light
  // dawn progress d: 0 = night … 1 = predawn (P20) … 2 = dawn (P21/P22); keyed to the song (bible §2.3 dawn table)
  const DAWN = [[186, 0], [215, 0], [226.3, 0.16], [233.9, 0.36], [237.1, 0.86], [240.0, 1.0], [242.0, 1.18], [246.0, 1.42], [249.3, 1.58], [256.9, 1.86]];
  const dawnAt = (T) => keys(DAWN, T, ease.linear);
  const SKY_N = { preset: 'night', ...SKY_BASE, exposure: 0.85 };
  const SKY_P = { preset: 'predawn', ...SKY_BASE, sunAz: 114, sunElev: -7, moonIntensity: 0, moonHalo: 0, stars: 0.12, exposure: 1.0, cloudCover: 0.3 };
  const SKY_D = { preset: 'dawn', ...SKY_BASE, sunAz: 116, sunElev: -1.2, sunDisc: 0, moonIntensity: 0, moonHalo: 0, stars: 0, exposure: 1.0, cloudCover: 0.32, sunGlow: 0.85, sunGlowWidth: 9 };
  function setTime(T, d = dawnAt(T)) {
    if (d <= 1) sky.blend(SKY_N, SKY_P, smoothstep(0, 1, d)); else sky.blend(SKY_P, SKY_D, smoothstep(0, 1, d - 1));
    sky.update(T); coastN.update(T); coastS.update(T);
    lightPts.material.uniforms.uT.value = T;
    lightPts.material.uniforms.uK.value = lerp(1, 0.75, clamp(d - 1, 0, 1));
    // silhouettes: hazed toward the horizon colour by distance, more so as the sky brightens
    const hz = sky.horizonColor(V(1, 0, 0.3));
    for (const m of silMats) { const k = clamp(m.userData.dist / 6000, 0, 1); m.color.setRGB(0.006, 0.008, 0.013).lerp(hz, clamp(0.12 + 0.55 * k, 0, 0.8) * (0.4 + 0.6 * smoothstep(0, 1.6, d))); }
    // window light: night faint cool → dawn key (P20 blue-grey → 5000 K → 4300 K)
    const wk = d <= 1 ? lerp(0.05, 0.9, smoothstep(0.1, 1, d)) : lerp(0.9, 3.4, smoothstep(0, 0.9, d - 1));
    const wc = d <= 1 ? hex('#8ea4cc').lerp(hex('#a9b6cc'), d) : hex('#a9b6cc').lerp(hex('#ffe2c4'), smoothstep(0, 0.85, d - 1));
    winLight.intensity = wk * 2.4; winLight.color.copy(wc);
    hemi.intensity = 0.06 + 0.25 * smoothstep(0.3, 1.8, d); hemi.color.copy(wc);
    moonEdge.intensity = 0.3 * (1 - smoothstep(0.6, 1.4, d));
    return d;
  }

  // ================================================================== figure helpers
  const tmpV = V(0, 0, 0);
  const W = (fig, x, y, z) => fig.root.localToWorld(V(x, y, z));   // root-space → world
  function seat(fig, at, yaw = 0, o = {}) {
    fig.root.position.copy(at); fig.root.rotation.set(0, Math.PI / 2 + yaw, 0);
    fig.pose('sit_bench', { seat: SEAT_Y, lean: o.lean ?? 0.2, hands: 'none', feet: o.feet ?? -0.04 });
    if (o.add) fig.pose(o.add, { add: true });
    fig.root.updateMatrixWorld(true);
  }
  // put a prop in the world (detached from any hand)
  function putWorld(obj, pos, ry = 0) { if (obj.parent !== scene) scene.add(obj); obj.position.copy(pos); obj.rotation.set(0, ry, 0); obj.scale.setScalar(1); obj.updateMatrixWorld(true); }
  function putLocal(obj, parent, pos, rot) { if (obj.parent !== parent) parent.add(obj); obj.position.copy(pos); obj.rotation.copy(rot); obj.updateMatrixWorld(true); }
  // hold a cup in a hand: cup local origin = base centre; socket 'cup' origin = gripped cylinder centre, +Y across the palm,
  // +Z toward the fingertips → the cup axis must lie along socket +Y (thumb up = cup upright)
  const CUP_IN_SOCKET = { pos: V(0, -0.034, 0.0), rot: new THREE.Euler(0, 0, 0) };
  function holdCup(fig, side, cup, grip = 'hold_cup') {
    const h = fig.hands[side]; h.pose(grip, { radius: 0.036 });
    putLocal(cup, h.sockets.cup, CUP_IN_SOCKET.pos, CUP_IN_SOCKET.rot);
  }
  // visibility of everything per shot (defaults)
  function resetProps() {
    faceGlasses.visible = false; if (hangGlasses) hangGlasses.visible = true;
    phone.visible = true; phoneLight.intensity = 0; phoneScreenMat.color.setScalar(0);
    gloves.visible = true; thermos.visible = true; thermosLid.position.set(0, 0.19, 0); thermosLid.rotation.set(0, 0, 0); if (thermosLid.parent !== thermos) thermos.add(thermosLid);
    stream.visible = false; cupG.visible = cupR.visible = true; steamG.object3D.visible = steamR.object3D.visible = true;
    G.root.visible = R.root.visible = true; mirrorOn = false; glassUniforms.uUseMirror.value = 0; glassUniforms.uRefl.value = 1;
    lampGrp.visible = true; lampGlow.object3D.visible = true; ceilMesh.visible = true;
    winLight.shadow.autoUpdate = true; lampKey.shadow.autoUpdate = true;
  }
  // steam (always backlit by the lamp at night, by the window at dawn)
  function steamUpdate(T, kG, kR, light) {
    steamG.object3D.position.copy(cupG.getWorldPosition(tmpV)).add(V(0, 0.062, 0)); steamR.object3D.position.copy(cupR.getWorldPosition(tmpV)).add(V(0, 0.062, 0));
    steamG.update(T, { light: light * kG, wind: [0.012, -0.004] }); steamR.update(T, { light: light * kR, wind: [0.012, -0.004] });
    steamG.object3D.visible = kG > 0.001; steamR.object3D.visible = kR > 0.001;
  }
  // phone screen glow 0..1
  function phoneGlow(k) {
    phoneScreenMat.color.setScalar(0.42 * k);
    // the light sits a hand-width off the screen along its normal (lights the lower face, the fingers)
    const sn = V(0, 1, 0).transformDirection(phone.matrixWorld);
    phone.userData.screen.getWorldPosition(phoneLight.position); phoneLight.position.addScaledVector(sn, 0.12);
    phoneLight.intensity = 0.022 * k;
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
  const T0 = (id) => ctx.shotById(id).in_frame / 24;

  // ------------------------------------------------------------------ standard poses
  // GUARD seated, stooped: lean, head bow; phone in right hand on his lap (or face down on the right thigh)
  const PHONE_GRIP = (() => { const a = handPose('grip', { radius: 0.03 }); return { ...a, thumb: [0.1, 0.25, 0.05, 0.1, 0.2] }; })();
  function guardBase(T, { lean = 0.42, bow = 0.25, turn = 0, yaw = 0.0, breathe = 1 } = {}) {
    seat(G, SEAT_G, yaw, { lean, add: { 'neck.x': bow * 0.5, 'head.x': bow * 0.6, 'head.y': turn, 'neck.y': turn * 0.4 } });
  }
  function guardHandsOnThighs(lp = 0) {
    G.reach('R', W(G, -0.12, 0.6, 0.30), { palm: V(0, -1, 0), fingers: G.root.localToWorld(V(0, 0, 1)).sub(G.root.position).normalize() });
    G.reach('L', W(G, 0.12, 0.6, 0.30 + lp), { palm: V(0, -1, 0), fingers: G.root.localToWorld(V(0, 0, 1)).sub(G.root.position).normalize() });
    G.hands.R.pose('relaxed', { curl: 0.8 }); G.hands.L.pose('relaxed', { curl: 0.8 });
  }
  const fwdOf = (fig) => fig.root.localToWorld(V(0, 0, 1)).sub(fig.root.position).normalize();
  const leftOf = (fig) => fig.root.localToWorld(V(1, 0, 0)).sub(fig.root.position).normalize();

  // RESTORER seated beside him
  function restBase(T, { lean = 0.16, turn = 0, bow = 0, yaw = 0.12, shoulders = 0 } = {}) {
    seat(R, SEAT_R, yaw, { lean, add: { 'head.y': turn * 0.6, 'neck.y': turn * 0.4, 'head.x': bow, 'armL.clav.z': -shoulders, 'armR.clav.z': -shoulders } });
  }
  function restHandsLap() {
    R.reach('R', W(R, -0.05, 0.6, 0.27), { palm: V(0, -1, 0.2), fingers: fwdOf(R) });
    R.reach('L', W(R, 0.06, 0.6, 0.26), { palm: V(0, -1, -0.2), fingers: fwdOf(R) });
    R.hands.R.pose('relaxed', { curl: 0.9 }); R.hands.L.pose('relaxed', { curl: 0.9 });
  }

  // ================================================================== setups
  const setups = {};
  const dirW = (fig, x, y, z) => fig.root.localToWorld(V(x, y, z)).sub(fig.root.position).normalize();
  const easeIO = ease.inOutSine;
  const ramp = (t, a, b) => easeIO(clamp((t - a) / (b - a), 0, 1));
  // 2-pass IK so that a hand's `cup` socket (centre of the gripped cup) lands on gripWorld
  function reachSocket(fig, side, gripWorld, opt, socket = 'cup') {
    const h = fig.hands[side]; const tgt = gripWorld.clone();
    for (let i = 0; i < 3; i++) { fig.reach(side, tgt, opt); const sw = h.sockets[socket].getWorldPosition(V(0, 0, 0)); tgt.add(gripWorld.clone().sub(sw)); }
    fig.reach(side, tgt, opt);
  }
  const CUP_GRIP = 0.034;                     // socket origin above the cup base
  const gripAt = (base) => base.clone().add(V(0, CUP_GRIP, 0));
  // phone lying face down on his right thigh
  const PHONE_THIGH = () => W(G, -0.105, SEAT_Y + 0.165, 0.27);
  function phoneOnThigh() { putWorld(phone, PHONE_THIGH(), Math.PI / 2 + 0.25); phone.rotation.x = Math.PI; phone.updateMatrixWorld(true); }
  function phoneInHand(off = V(0.035, 0.012, -0.01)) { putLocal(phone, G.hands.R.sockets.palm, off, new THREE.Euler(0, 0, 0)); }
  // GUARD's right hand holding the phone up in his lap, screen toward his face
  function guardPhoneLap(k = 1) {
    const ph = W(G, -0.07, 0.68, 0.34);
    G.reach('R', ph, { palm: dirW(G, 0.15, 0.8, -0.6), fingers: dirW(G, 0.45, 0.1, 1) });
    G.hands.R.setChannels(PHONE_GRIP); phoneInHand();
  }
  // RESTORER standing (or walking) with both cups at the waist, gloves pinned under her left thumb
  function restCarry() {
    holdCup(R, 'R', cupG); holdCup(R, 'L', cupR);
    reachSocket(R, 'R', W(R, -0.17, 0.92, 0.30), { palm: dirW(R, 1, 0, 0), fingers: dirW(R, 0, 0, 1) });
    reachSocket(R, 'L', W(R, 0.16, 0.92, 0.28), { palm: dirW(R, -1, 0, 0), fingers: dirW(R, 0, 0, 1) });
    putLocal(gloves, R.hands.L.sockets.cup, V(0.0, 0.05, -0.03), new THREE.Euler(Math.PI / 2, 0, 0.2));
  }
  function standAt(fig, pos, heading, o = {}) {
    fig.root.position.copy(pos); fig.root.rotation.set(0, heading, 0);
    if (o.walk !== undefined) fig.pose('walk', { phase: o.walk, stride: o.stride ?? 0.85 }); else fig.pose('stand', { weight: o.weight ?? 0 });
    if (o.lean) fig.pose({ 'hips.x': o.lean * 0.35, 'spine.x': o.lean * 0.35, 'chest.x': o.lean * 0.3, 'neck.x': -o.lean * 0.25, 'head.x': o.lean * 0.15 }, { add: true });
    if (o.add) fig.pose(o.add, { add: true });
    fig.root.updateMatrixWorld(true);
  }
  // camera presets (BAY_3Q family). pos / subject points tuned on renders
  const BAY3Q_50 = { pos: V(0.62, 1.20, 2.30) };

  // ---------------- S059: match cut from S058 — his bent back (0.66,0.50), right rear 45°, 75 mm; phone glow at 187.3
  setups.S059 = (tl, u, T) => {
    setTime(T); resetProps();
    faceGlasses.visible = true; if (hangGlasses) hangGlasses.visible = false;
    R.root.visible = false; cupG.visible = cupR.visible = false; gloves.visible = false;
    const glowK = smoothstep(1.217, 1.217 + 0.25, tl);
    guardBase(T, { lean: 0.48, bow: 0.34 + 0.03 * glowK });
    guardPhoneLap();
    const adj = smoothstep(0.42, 0.62, tl) * (1 - smoothstep(0.82, 1.02, tl));     // 0.6 s: left hand touches the glasses
    const lh = W(G, 0.12, 0.62, 0.30).lerp(G.eye(V(0, 0, 0)).add(leftOf(G).multiplyScalar(0.075)).add(V(0, -0.015, 0)), adj);
    G.reach('L', lh, { palm: V(0, -1, 0).lerp(leftOf(G).negate(), adj).normalize(), fingers: fwdOf(G).lerp(V(0, 1, 0), adj * 0.6).normalize() });
    G.hands.L.pose(adj > 0.3 ? 'pinch' : 'relaxed', { curl: 0.8 });
    G.lookAt(phone.getWorldPosition(V(0, 0, 0)), 0.5);
    G.breathe(T, 1.0);
    putWorld(thermos, THERMOS_POS, 0.4);
    phoneGlow(glowK);
    steamUpdate(T, 0, 0, 1);
    const back = W(G, 0, 1.06, -0.1);
    aim(V(1.30, 1.40, 2.32), back, 0.66, 0.50, 75);
    return { dof: { focus: dist(back), fstop: 2.8 } };
  };

  // ---------------- S060: over-the-shoulder CU 100 mm: thumb hovers (188.71), draws back (190.03), face down + dark (190.6)
  setups.S060 = (tl, u, T) => {
    setTime(T); resetProps();
    R.root.visible = false; cupG.visible = cupR.visible = false; gloves.visible = false;
    const off = ramp(tl, 2.42, 2.62);                         // glasses off the face at ~2.55 s
    faceGlasses.visible = off < 0.5; if (hangGlasses) hangGlasses.visible = off >= 0.5;
    guardBase(T, { lean: 0.5, bow: 0.4 });
    const flip = ramp(tl, 2.0, 2.39);                         // turn the phone over onto the right thigh
    const ph = W(G, -0.07, 0.68, 0.34).lerp(PHONE_THIGH().add(V(0, 0.03, 0)), flip);
    const palm = dirW(G, 0.15, 0.8, -0.6).lerp(V(0, -1, 0), flip).normalize();
    G.reach('R', ph, { palm, fingers: dirW(G, 0.45, 0.1, 1) });
    // thumb: rests at the case side → rises over the call button (0.5 s) → tiny tremor → draws back (1.82 s)
    const hov = ramp(tl, 0.3, 0.5) * (1 - ramp(tl, 1.82, 2.02));
    const trem = hov * 0.025 * Math.sin(T * 29) * (0.6 + 0.4 * Math.sin(T * 7.3));
    const ch = { ...PHONE_GRIP, thumb: [lerp(0.1, 0.62, hov) + trem, lerp(0.25, 0.05, hov), lerp(0.05, 0.12, hov), lerp(0.1, 0.18, hov) + trem, 0.2] };
    G.hands.R.setChannels(ch); phoneInHand();
    // left hand: rests, then 2.45–2.75 slips the glasses off
    const gl = ramp(tl, 2.38, 2.55) * (1 - ramp(tl, 2.6, 2.85));
    G.reach('L', W(G, 0.12, 0.62, 0.30).lerp(G.eye(V(0, 0, 0)).add(leftOf(G).multiplyScalar(0.06)), gl), { palm: V(0, -1, 0).lerp(leftOf(G).negate(), gl).normalize(), fingers: fwdOf(G) });
    G.hands.L.pose(gl > 0.3 ? 'pinch' : 'relaxed', { curl: 0.8 });
    G.lookAt(phone.getWorldPosition(V(0, 0, 0)), 0.6 * (1 - flip));
    G.breathe(T, 1.0);
    putWorld(thermos, THERMOS_POS, 0.4);
    phoneGlow(1 - smoothstep(2.30, 2.39, tl));
    steamUpdate(T, 0, 0, 1);
    const k = ramp(tl, 0, 2.4);                                // ~20 cm push over the shoulder
    const tgt = W(G, -0.07, 0.68, 0.34);
    const p0 = W(G, -0.36, 1.46, -0.42), p1 = W(G, -0.30, 1.36, -0.26);
    aim(p0.lerp(p1, k), tgt, 0.58, 0.62, 100);
    const thumbTip = G.hands.R.tip('thumb', V(0, 0, 0));
    return { dof: { focus: dist(flip > 0.5 ? phone.getWorldPosition(V(0, 0, 0)) : thumbTip), fstop: 2.8 } };
  };

  // ---------------- S062: she enters from screen-left with two cups; 195.57 reach; 197.15 his cup down on the sill
  const R_P0 = V(2.12, 0, -0.62), R_P1 = V(2.96, 0, -0.16);
  const R_HEAD = Math.atan2(R_P1.x - R_P0.x, R_P1.z - R_P0.z);
  setups.S062 = (tl, u, T) => {
    setTime(T); resetProps();
    guardBase(T, { lean: 0.38, bow: 0.16, turn: 0.18 * ramp(tl, 1.5, 2.0) });
    guardHandsOnThighs(); phoneOnThigh();
    putWorld(thermos, THERMOS_POS, 0.4);
    // walk: last two steps over 0–0.9 s, then stand; turn to face the window as she arrives
    const wk = clamp(tl / 0.9, 0, 1), we = ease.outSine(wk);
    const pos = R_P0.clone().lerp(R_P1, we);
    const head = lerp(R_HEAD, Math.PI / 2 - 0.25, ramp(tl, 0.5, 1.2));
    const lean = 0.55 * ramp(tl, 0.6, 1.6) * (1 - 0.35 * ramp(tl, 2.2, 2.42));
    standAt(R, pos, head, wk < 1 ? { walk: 0.25 + wk * 0.95, stride: 0.75 * (1 - wk * 0.6), lean } : { lean, weight: 0.4 });
    restCarry();
    // right hand: reach (0.57 s) → set his cup on the sill (2.15 s)
    const r = ramp(tl, 0.57, 2.15);
    if (tl < 2.15) {
      const start = W(R, -0.17, 0.92, 0.30);
      const mid = CUP_G.clone().add(V(-0.25, 0.20, -0.08));
      const p = r < 0.5 ? start.lerp(mid, easeIO(r * 2)) : mid.lerp(gripAt(CUP_G).add(V(0, 0.004, 0)), easeIO((r - 0.5) * 2));
      reachSocket(R, 'R', p, { palm: dirW(R, 1, 0, 0).lerp(V(0, 0, -1), r).normalize(), fingers: dirW(R, 0, 0, 1).lerp(V(1, -0.2, 0.2), r).normalize() });
    } else {
      putWorld(cupG, CUP_G, 0);
      const rel = ramp(tl, 2.15, 2.42);
      R.hands.R.pose('relaxed', { curl: 0.5 });
      R.reach('R', gripAt(CUP_G).add(V(-0.05 - 0.12 * rel, 0.03 + 0.08 * rel, -0.06)), { palm: V(0, 0, -1), fingers: V(1, -0.3, 0.1).normalize() });
    }
    R.lookAt(CUP_G.clone().add(V(0, 0.05, 0)), 0.6 * ramp(tl, 0.4, 1.0));
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 1, 1, 1);
    // dolly left → right ~0.5 m over 2.0 s, 12-frame ease-out
    const k = ease.outSine(clamp(tl / 2.0, 0, 1));
    const cp = BAY3Q_50.pos.clone().add(V(0.36 * k, 0, -0.32 * k));
    const look = V(3.3, 0.95, -0.42).lerp(V(3.55, 0.92, -0.14), k);
    cam.lens(camera, 50); cam.place(camera, cp, look);
    const fp = cupG.getWorldPosition(V(0, 0, 0));
    return { dof: { focus: dist(fp), fstop: 4 } };
  };

  // ---------------- S063: her cup 6 cm left of his (197.45), gloves on the bench corner, sits on the band entry (198.22),
  // undoes the middle button (199.3), both shoulders drop (200.15)
  const S063_CAM = () => { const cp = BAY3Q_50.pos.clone().add(V(0.36, 0, -0.32)); cam.lens(camera, 50); cam.place(camera, cp, V(3.55, 0.92, -0.14)); };
  function restSit(tl, sitK, o = {}) {
    // stand (at R_P1, leaning over the bench) → seated; the legs swing over the bench seat mid-way
    const stand = (() => { standAt(R, R_P1, Math.PI / 2 - 0.25, { lean: o.lean ?? 0.4, weight: 0.4 }); return { ...R.ch }; })();
    seat(R, SEAT_R, 0.12, { lean: 0.16 });
    const sit = { ...R.ch };
    const k = easeIO(sitK);
    const ch = Figure_blend(stand, sit, k);
    const lift = Math.sin(Math.PI * k);
    ch['legL.upper.x'] = (ch['legL.upper.x'] || 0) + 0.7 * lift; ch['legR.upper.x'] = (ch['legR.upper.x'] || 0) + 0.9 * lift;
    ch['legL.lower.x'] = (ch['legL.lower.x'] || 0) + 0.6 * lift; ch['legR.lower.x'] = (ch['legR.lower.x'] || 0) + 0.8 * lift;
    R.root.position.copy(R_P1).lerp(SEAT_R, k);
    R.root.rotation.set(0, lerp(Math.PI / 2 - 0.25, Math.PI / 2 + 0.12, k) + 0.35 * lift, 0);
    R.pose(ch);
    R.root.updateMatrixWorld(true);
  }
  setups.S063 = (tl, u, T) => {
    setTime(T); resetProps();
    const relax = ramp(tl, 2.6, 2.95);                       // 200.15 shoulders fall
    guardBase(T, { lean: 0.38 + 0.04 * relax, bow: 0.16 + 0.18 * ramp(tl, 2.0, 2.4), turn: 0.18 * (1 - ramp(tl, 1.8, 2.3)) + 0.1 * ramp(tl, 2.0, 2.4) });
    G.pose({ 'armL.clav.z': -0.03 * relax, 'armR.clav.z': -0.03 * relax }, { add: true });
    guardHandsOnThighs(); phoneOnThigh();
    putWorld(thermos, THERMOS_POS, 0.4);
    putWorld(cupG, CUP_G, 0);
    const sitK = clamp((tl - 0.38) / (0.80 - 0.38), 0, 1);
    restSit(tl, sitK, { lean: 0.4 * (1 - ramp(tl, 0.0, 0.4)) + 0.15 });
    if (sitK >= 1) R.pose({ 'armL.clav.z': -0.035 * relax, 'armR.clav.z': -0.035 * relax, 'chest.x': 0.02 * relax }, { add: true });
    // her cup: left hand → sill at 0.03–0.35 s
    holdCup(R, 'L', cupR);
    const c = ramp(tl, 0.0, 0.33);
    if (tl < 0.33) {
      reachSocket(R, 'L', W(R, 0.16, 0.92, 0.28).lerp(gripAt(CUP_R).add(V(0, 0.004, 0)), c), { palm: dirW(R, -1, 0, 0).lerp(V(0, 0, 1), c).normalize(), fingers: dirW(R, 0, 0, 1).lerp(V(1, -0.2, 0), c).normalize() });
      putLocal(gloves, R.hands.L.sockets.cup, V(0.0, 0.05, -0.03), new THREE.Euler(Math.PI / 2, 0, 0.2));
    } else {
      putWorld(cupR, CUP_R, 0);
      // gloves to the bench corner 0.35–0.55 s, then the hand to her lap
      const gk = ramp(tl, 0.33, 0.55);
      R.hands.L.pose('relaxed', { curl: 0.6 });
      if (tl < 0.55) {
        const from = gripAt(CUP_R).add(V(-0.08, 0.06, 0)), to = GLOVES_POS.clone().add(V(0, 0.06, 0));
        R.reach('L', from.lerp(to, gk), { palm: V(0, -1, 0), fingers: V(0.6, -0.4, -0.2).normalize() });
        putLocal(gloves, R.hands.L.sockets.cup, V(0.0, 0.05, -0.03), new THREE.Euler(Math.PI / 2, 0, 0.2));
      } else {
        putWorld(gloves, GLOVES_POS, 0.3);
        R.reach('L', W(R, 0.06, 0.6, 0.26), { palm: V(0, -1, 0), fingers: fwdOf(R) });
      }
    }
    // right hand: rests on the lap; 1.88 s undoes the middle button (hand to the coat front)
    const bt = ramp(tl, 1.6, 1.88) * (1 - ramp(tl, 2.15, 2.5));
    R.hands.R.pose(bt > 0.4 ? 'pinch' : 'relaxed', { curl: 0.9 });
    R.reach('R', W(R, -0.05, 0.6, 0.27).lerp(W(R, -0.02, 0.86, 0.16), bt), { palm: V(0, -1, 0).lerp(dirW(R, 0, 0, -1), bt).normalize(), fingers: fwdOf(R).lerp(dirW(R, 1, 0.3, 0), bt).normalize() });
    R.lookAt(sitK < 1 ? GLOVES_POS : (tl < 1.7 ? G.eye(V(0, 0, 0)) : W(R, -0.02, 0.86, 0.3)), sitK < 1 ? 0.5 : 0.35);
    G.lookAt(tl > 2.0 ? CUP_G : R.eye(V(0, 0, 0)), 0.4);
    G.breathe(T, 1 + relax); R.breathe(T + 0.7, 1 + relax);
    steamUpdate(T, 1, 1, 1);
    S063_CAM();
    return { dof: { focus: dist(R.eye(V(0, 0, 0))) * 0.5 + dist(G.eye(V(0, 0, 0))) * 0.5, fstop: 4 } };
  };

  // two seated (state after S063) — shared by S064, S065, S072–S077
  function seatedPair(T, o = {}) {
    guardBase(T, { lean: o.gLean ?? 0.36, bow: o.gBow ?? 0.12, turn: o.gTurn ?? 0 });
    restBase(T, { lean: 0.16, yaw: 0.14, turn: o.rTurn ?? 0, bow: o.rBow ?? 0, shoulders: 0.03 });
    putWorld(gloves, GLOVES_POS, 0.3); putWorld(thermos, THERMOS_POS, 0.4);
  }

  // ---------------- S064: insert 100 mm — his hands lift the chipped cup to his lap; her bare left hand by her cup, worn cuff
  setups.S064 = (tl, u, T) => {
    setTime(T); resetProps();
    seatedPair(T, { gLean: 0.42, gBow: 0.3 });
    phoneOnThigh();
    putWorld(cupR, CUP_R, 0);
    // her left hand on the sill by her cup, ulnar edge down so the cuff's outer worn spot faces up-camera
    R.hands.L.pose('relaxed', { curl: 0.7 });
    R.reach('L', CUP_R.clone().add(V(-0.06, 0.045, -0.115)), { palm: V(0.15, -0.45, 1).normalize(), fingers: V(1, -0.15, 0.15).normalize() });
    restHandsLapR();
    // his hands: close around the cup (0–0.4 s), lift up/back toward his lap (0.4–1.9 s)
    holdCup(G, 'R', cupG);
    const lift = ramp(tl, 0.4, 1.9);
    const lap = W(G, -0.02, 0.74, 0.28);
    const grip = gripAt(CUP_G).lerp(lap, lift).add(V(0, 0.012 * Math.sin(Math.PI * lift), 0));
    const close = ramp(tl, 0.0, 0.4);
    reachSocket(G, 'R', grip.clone().add(V(-0.006 * (1 - close), 0, 0.012 * (1 - close))), { palm: V(-0.2, 0, -1).normalize(), fingers: V(1, 0, -0.35).normalize() });
    G.hands.L.pose('hold_cup', { radius: 0.036 });
    reachSocket(G, 'L', grip.clone().add(V(0.0, 0.0, -0.004)), { palm: V(0.1, 0, 1).normalize(), fingers: V(0.85, 0, 0.5).normalize() });
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 1, 1, 1);
    const fc = R.hands.L.root.getWorldPosition(V(0, 0, 0)).add(V(-0.02, 0.0, 0));
    aim(V(3.02, 1.02, 1.18), V(3.84, 0.78, -0.02), 0.5, 0.5, 100);
    const fb = ramp(tl, 0.6, 0.93);
    return { dof: { focus: lerp(dist(gripAt(CUP_G)), dist(fc), fb), fstop: 4 } };
  };
  function restHandsLapR() { R.hands.R.pose('relaxed', { curl: 0.9 }); R.reach('R', W(R, -0.05, 0.6, 0.27), { palm: V(0, -1, 0.2), fingers: fwdOf(R) }); }
  function guardCupLap() {
    holdCup(G, 'R', cupG);
    const lap = W(G, -0.02, 0.74, 0.28);
    reachSocket(G, 'R', lap, { palm: V(-0.2, 0, -1).normalize(), fingers: V(1, 0, -0.35).normalize() });
    G.hands.L.pose('hold_cup', { radius: 0.036 });
    reachSocket(G, 'L', lap.clone().add(V(0, 0, -0.004)), { palm: V(0.1, 0, 1).normalize(), fingers: V(0.85, 0, 0.5).normalize() });
  }

  // ---------------- S065: close two-shot, no glass between them: he looks up (202.9), she nods (203.5), both exhale (203.9)
  setups.S065 = (tl, u, T) => {
    setTime(T); resetProps();
    const look = ramp(tl, 0.19, 0.6), ex = ramp(tl, 1.19, 1.6);
    seatedPair(T, { gLean: 0.40 - 0.04 * ex, gBow: 0.30 - 0.24 * look, gTurn: 0.55 * look, rTurn: -0.75, rBow: 0.05 });
    const nod = tl > 0.79 ? Math.sin(Math.PI * clamp((tl - 0.79) / 0.4, 0, 1)) : 0;
    R.pose({ 'head.x': 0.12 * nod, 'neck.x': 0.05 * nod, 'armL.clav.z': -0.03 * ex, 'armR.clav.z': -0.03 * ex }, { add: true });
    G.pose({ 'armL.clav.z': -0.03 * ex, 'armR.clav.z': -0.03 * ex }, { add: true });
    phoneOnThigh(); guardCupLap(); putWorld(cupR, CUP_R, 0);
    restHandsLap();
    G.lookAt(R.eye(V(0, 0, 0)), 0.65 * look);
    R.lookAt(G.eye(V(0, 0, 0)), 0.7);
    G.breathe(T, 1 + 1.2 * ex * (1 - ramp(tl, 1.6, 1.96))); R.breathe(T + 0.7, 1 + 1.2 * ex);
    steamUpdate(T, 1, 1, 1);
    // from behind, in the open glazed doorway: both profiles turned to each other, the steam between them (no glass)
    const mid = G.eye(V(0, 0, 0)).lerp(R.eye(V(0, 0, 0)), 0.5);
    aim(V(0.10, 1.22, 0.02), mid, 0.5, 0.45, 75);
    return { dof: { focus: dist(mid), fstop: 4 } };
  };

  // ---------------- S072: cold tea (no steam); he picks up the phone (226.32), dials (226.98), to his right ear (227.46)
  function guardPhoneEar(k) {
    // k: 0 = phone face down on the thigh … 0.4 = up in front of him, screen up … 1 = at his right ear
    const thigh = PHONE_THIGH().add(V(0, 0.03, 0)), front = W(G, -0.06, 0.82, 0.33), ear = W(G, -0.115, 1.28, 0.02);
    const p = k < 0.45 ? thigh.lerp(front, easeIO(k / 0.45)) : front.lerp(ear, easeIO((k - 0.45) / 0.55));
    const palm = k < 0.45 ? V(0, -1, 0).lerp(dirW(G, 0.15, 0.8, -0.6), easeIO(k / 0.45)).normalize() : dirW(G, 0.15, 0.8, -0.6).lerp(dirW(G, 1, 0.1, 0), easeIO((k - 0.45) / 0.55)).normalize();
    const fing = k < 0.45 ? dirW(G, 0.45, 0.1, 1) : dirW(G, 0.45, 0.1, 1).lerp(dirW(G, 0.15, 1, 0.25), easeIO((k - 0.45) / 0.55)).normalize();
    G.reach('R', p, { palm, fingers: fing, elbowOut: 0.6 });
    G.hands.R.setChannels(PHONE_GRIP); phoneInHand();
  }
  setups.S072 = (tl, u, T) => {
    setTime(T); resetProps();
    const inb = Math.sin(Math.PI * clamp((tl - 0.45) / 0.5, 0, 1));
    seatedPair(T, { gLean: 0.36, gBow: 0.24 - 0.1 * ramp(tl, 0.8, 1.17), rTurn: 0.12, rBow: -0.02 });
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    const k = tl < 0.03 ? 0 : tl < 0.6 ? 0.45 * ramp(tl, 0.03, 0.6) : tl < 0.8 ? 0.45 : 0.45 + 0.55 * ramp(tl, 0.8, 1.17);
    guardPhoneEar(k);
    const press = Math.sin(Math.PI * clamp((tl - 0.6) / 0.2, 0, 1));
    G.hands.R.setChannels({ ...PHONE_GRIP, thumb: [0.1 + 0.5 * press, 0.25 - 0.15 * press, 0.05, 0.1 + 0.1 * press, 0.2] });
    G.reach('L', W(G, 0.12, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 });
    restHandsLap();
    G.lookAt(k < 0.6 ? phone.getWorldPosition(V(0, 0, 0)) : W(G, 0.25, 0.7, 1.0), 0.5);
    R.lookAt(V(8, 1.0, 0.6), 0.6);
    G.breathe(T, 1 + 1.5 * inb); R.breathe(T + 0.7);
    steamUpdate(T, 0, 0, 1);
    phoneGlow(smoothstep(0.3, 0.45, tl) * (1 - smoothstep(1.0, 1.2, tl)));
    const ge = G.eye(V(0, 0, 0));
    const pk = 0.02 * ramp(tl, 0, 2.75);
    const cp = V(1.70, 1.25, 2.05); const eyeAt = ge.clone(); cp.lerp(eyeAt, pk);
    aim(cp, eyeAt, 0.64, 0.45, 75);
    return { dof: { focus: dist(ge), fstop: 2.8 } };
  };

  // ---------------- S073: CU his eyes, waiting through the full-band stop (229.1); held breath (229.82)
  setups.S073 = (tl, u, T) => {
    setTime(T); resetProps();
    R.root.visible = false;
    seatedPair(T, { gLean: 0.34, gBow: 0.16, gTurn: 0.35 });
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    guardPhoneEar(1);
    G.reach('L', W(G, 0.12, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 });
    G.lookAt(W(G, 0.5, 0.55, 0.9), 0.55);
    const held = tl > 0.78;
    G.breathe(held ? 229.82 : T, held ? 0.6 : 1);
    steamUpdate(T, 0, 0, 1);
    const ge = G.eye(V(0, 0, 0));
    aim(ge.clone().add(V(0.25, 0.03, -0.97)), ge, 0.52, 0.42, 100);
    return { dof: { focus: dist(ge), fstop: 2.8 } };
  };

  // ---------------- S074: the call is answered on 这人间 (230.63) — his face eases; her smile (232.27); she looks out (233.07)
  setups.S074 = (tl, u, T) => {
    setTime(T); resetProps();
    const ease1 = ramp(tl, 0.0, 1.2), smile = ramp(tl, 1.6, 2.0), out = ramp(tl, 2.45, 3.0);
    seatedPair(T, { gLean: 0.36 - 0.06 * ease1, gBow: 0.18 - 0.14 * ease1, gTurn: 0.1, rTurn: lerp(-0.55, 0.15, out), rBow: lerp(0.04, -0.02, out) });
    const mur = tl > 1.0 && tl < 1.6 ? 0.02 * Math.sin((tl - 1.0) * 21) : 0;
    G.pose({ 'head.x': mur, 'armL.clav.z': -0.03 * ease1, 'armR.clav.z': -0.03 * ease1 }, { add: true });
    R.pose({ 'head.z': -0.06 * smile * (1 - out) }, { add: true });
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    guardPhoneEar(1);
    G.reach('L', W(G, 0.12, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 });
    restHandsLap();
    G.lookAt(W(G, 0.4, 0.9, 1.2), 0.4);
    R.lookAt(out > 0.5 ? V(8, 1.1, 0.4) : G.eye(V(0, 0, 0)), 0.6);
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 0, 0, 1);
    const pk = 0.02 * ramp(tl, 0, 3.29);
    const cp = BAY3Q_50.pos.clone().add(V(0.36, 0, -0.32)); const look = V(3.55, 0.92, -0.14); cp.lerp(look, pk);
    cam.lens(camera, 50); cam.place(camera, cp, look);
    return { dof: { focus: dist(G.eye(V(0, 0, 0))) * 0.5 + dist(R.eye(V(0, 0, 0))) * 0.5, fstop: 4 } };
  };

  // ---------------- S077: first light — he refills her cup (238.26) then his (238.97); both look to screen-right (239.6)
  setups.S077 = (tl, u, T) => {
    setTime(T); resetProps();
    const look = ramp(tl, 2.45, 2.9);
    seatedPair(T, { gLean: 0.38, gBow: 0.12 * (1 - look), gTurn: 0.25 * (1 - look) - 0.05, rTurn: lerp(-0.4, 0.2, look), rBow: 0.02 });
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    putWorld(phone, W(G, -0.12, SEAT_Y + 0.17, 0.2), Math.PI / 2); phone.rotation.x = Math.PI;
    // thermos in his right hand: pick up (0–0.3), cap off by the left hand (0.2–0.46), pour hers (1.18–1.6), his (1.89–2.15), cap on (2.2), down (2.5)
    const pick = ramp(tl, 0.0, 0.3) * (1 - ramp(tl, 2.25, 2.6));
    const capOff = ramp(tl, 0.2, 0.46) * (1 - ramp(tl, 2.05, 2.25));
    const toHer = ramp(tl, 0.55, 1.1) * (1 - ramp(tl, 1.6, 1.85)), toHis = ramp(tl, 1.6, 1.85) * (1 - ramp(tl, 2.15, 2.3));
    const tiltHer = ramp(tl, 1.0, 1.18) * (1 - ramp(tl, 1.52, 1.62)), tiltHis = ramp(tl, 1.75, 1.89) * (1 - ramp(tl, 2.08, 2.18));
    const rest = THERMOS_POS.clone();
    const up = W(G, -0.12, 0.92, 0.32);
    const overHer = CUP_R.clone().add(V(-0.07, 0.17, 0.10)), overHis = CUP_G.clone().add(V(-0.07, 0.17, 0.10));
    let tp = rest.clone().lerp(up, pick);
    tp.lerp(overHer, toHer); tp.lerp(overHis, toHis);
    const tilt = Math.max(tiltHer, tiltHis);
    thermos.position.copy(tp); thermos.rotation.set(0, 0.4, 0);
    thermos.rotateOnWorldAxis(V(0, 0, 1), 0);
    thermos.rotateOnWorldAxis(V(-0.45, 0, 0.9).normalize(), -1.75 * tilt);   // spout toward the cup (north-east)
    if (thermos.parent !== scene) scene.add(thermos);
    thermos.updateMatrixWorld(true);
    // right hand grips the thermos body
    const grip = thermos.localToWorld(V(-0.045, 0.11, 0.0));
    if (pick > 0.02) { G.hands.R.pose('grip', { radius: 0.04 }); G.reach('R', grip, { palm: thermos.localToWorld(V(1, 0.11, 0)).sub(grip).normalize(), fingers: V(0.2, 0, -1).normalize(), elbowOut: 0.6 }); }
    else { G.reach('R', W(G, -0.12, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.R.pose('relaxed', { curl: 0.8 }); }
    // the navy cup-lid: unscrewed into his left hand
    if (capOff > 0.02) {
      const lidW = thermos.localToWorld(V(0, 0.19, 0)).lerp(W(G, 0.12, 0.72, 0.36), easeIO(capOff)).add(V(0, 0.06 * Math.sin(Math.PI * capOff), 0));
      putWorld(thermosLid, lidW, capOff * 2.5);
      G.hands.L.pose('grip', { radius: 0.044 });
      G.reach('L', lidW.clone().add(V(0, 0.035, 0)), { palm: V(0, -1, 0), fingers: dirW(G, 0.3, -0.3, 1) });
    } else { G.reach('L', W(G, 0.12, 0.6, 0.30), { palm: V(0, -1, 0), fingers: fwdOf(G) }); G.hands.L.pose('relaxed', { curl: 0.8 }); }
    restHandsLap();
    // stream + new steam
    const pourHer = tl > 1.18 && tl < 1.6, pourHis = tl > 1.89 && tl < 2.15;
    if (pourHer || pourHis) {
      const spout = thermos.localToWorld(V(0, 0.225, 0)), dst = (pourHer ? CUP_R : CUP_G).clone().add(V(0, 0.055, 0));
      stream.visible = true; stream.position.copy(spout).lerp(dst, 0.5); stream.scale.set(1, spout.distanceTo(dst), 1);
      stream.quaternion.setFromUnitVectors(V(0, 1, 0), spout.clone().sub(dst).normalize());
    }
    G.lookAt(tl < 2.45 ? (toHis > 0.5 ? CUP_G : CUP_R) : V(8, 1.1, 1.2), tl < 2.45 ? 0.55 : 0.6);
    R.lookAt(tl < 2.45 ? thermos.getWorldPosition(V(0, 0, 0)) : V(8, 1.15, 0.6), 0.6);
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, smoothstep(1.89, 2.4, tl), smoothstep(1.18, 1.7, tl), 1.4);
    const pk = 0.03 * ramp(tl, 0, 2.92);
    const cp = V(1.55, 1.24, 2.15); const lk = V(3.62, 0.98, -0.30); cp.lerp(lk, pk);
    cam.lens(camera, 50); cam.place(camera, cp, lk);
    return { dof: { focus: dist(R.eye(V(0, 0, 0))) * 0.5 + dist(G.eye(V(0, 0, 0))) * 0.5, fstop: 4 } };
  };

  // ---------------- S079: from behind, WS 32 mm, slow pull back (~0.8 m); dawn warms from 243.56; deep focus
  setups.S079 = (tl, u, T) => {
    setTime(T); resetProps();
    seatedPair(T, { gLean: 0.30, gBow: 0.04, gTurn: 0.12, rTurn: 0.08, rBow: -0.02 });
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    putWorld(phone, W(G, -0.12, SEAT_Y + 0.17, 0.2), Math.PI / 2); phone.rotation.x = Math.PI;
    guardHandsOnThighs(); restHandsLap();
    G.breathe(T); R.breathe(T + 0.7);
    steamUpdate(T, 0.8, 0.8, 1.6);
    const k = easeIO(clamp(tl / 4.0, 0, 1));
    const cp = V(1.15, 1.42, 0.0).lerp(V(0.35, 1.44, 0.0), k);
    cam.lens(camera, 32); cam.place(camera, cp, cp.clone().add(V(1, -0.035, 0)));
    return { dof: null };
  };

  // ---------------- S081: FINAL — the two cups on the sill, fresh steam, the brightening window, the pair reflected
  setups.S081 = (tl, u, T) => {
    setTime(T); resetProps();
    seatedPair(T, { gLean: 0.30, gBow: 0.04, gTurn: 0.1, rTurn: 0.08 });
    guardHandsOnThighs(); restHandsLap();
    putWorld(cupG, CUP_G, 0); putWorld(cupR, CUP_R, 0);
    G.breathe(T, 0.5); R.breathe(T + 0.7, 0.5);
    // the people are beside / behind the camera: only their reflection is seen (approved cheat: through-view + reflection)
    mirrorOn = true; glassUniforms.uUseMirror.value = 1;
    G.root.visible = R.root.visible = false;
    const ray = smoothstep(3.1, 3.9, tl);
    steamUpdate(T, 1, 1, 1.5 + 1.5 * ray);
    aim(V(2.86, 0.86, -0.20), V(3.875, 0.755, 0.004), 0.51, 0.63, 75);
    return { dof: { focus: dist(V(3.875, 0.75, 0.0)), fstop: 2.8 } };
  };

  // ---------------- view_bay_back: the pair from behind (corridor end, S061 / S066); time-aware
  setups.view_bay_back = (tl, u, T) => {
    setTime(T); resetProps();
    const both = T >= 197.0;
    guardBase(T, { lean: both ? 0.35 : 0.5, bow: both ? 0.12 : 0.35 });
    guardHandsOnThighs();
    putWorld(thermos, THERMOS_POS, 0.4);
    if (T < 190.6) { guardPhoneLap(); phoneGlow(T > 187.3 ? 1 : 0); faceGlasses.visible = true; if (hangGlasses) hangGlasses.visible = false; }
    else phoneOnThigh();
    if (both) { restBase(T, { yaw: 0.12 }); restHandsLap(); putWorld(cupG, CUP_G); putWorld(cupR, CUP_R); putWorld(gloves, GLOVES_POS, 0.3); }
    else { R.root.visible = false; cupG.visible = cupR.visible = false; gloves.visible = false; }
    G.breathe(T); R.breathe(T + 1.3);
    steamUpdate(T, both ? 1 : 0, both ? 1 : 0, 1.0);
    aim(V(0.35, 1.45, 0.02), V(3.5, 1.05, 0.0), 0.5, 0.55, 40);
    return { dof: null };
  };

  setups.default = (tl, u, T) => setups.view_bay_back(tl, u, T);

  // ---------------- debug views (out/check/night_window/dbg_shots.json)
  const dbgState = (T) => {
    setTime(T); resetProps();
    guardBase(T, { lean: 0.35, bow: 0.15 }); guardHandsOnThighs();
    restBase(T, { yaw: 0.1 }); restHandsLap();
    putWorld(cupG, CUP_G); putWorld(cupR, CUP_R); putWorld(gloves, GLOVES_POS, 0.3); putWorld(thermos, THERMOS_POS, 0.4);
    putWorld(phone, W(G, -0.1, SEAT_Y + 0.16, 0.24), Math.PI / 2 + 0.2); phone.rotation.x = Math.PI;
    steamUpdate(T, 1, 1, 1);
  };
  setups.DBG_PLAN = (tl, u, T) => { dbgState(T); ceilMesh.visible = false; cam.lens(camera, 18); cam.place(camera, [2.2, 9.0, 0.01], [2.2, 0, 0]); camera.far = 9000; return { dof: null, exposure: 1.6 }; };
  setups.DBG_WIDE = (tl, u, T) => { dbgState(T); cam.lens(camera, 20); cam.place(camera, [0.3, 1.6, 2.5], [3.4, 1.0, -0.6]); return { dof: null, exposure: 1.3 }; };
  setups.DBG_BACK = (tl, u, T) => { dbgState(T); cam.lens(camera, 28); cam.place(camera, [0.4, 1.45, 0.0], [3.6, 1.1, 0]); return { dof: null, exposure: 1.3 }; };
  setups.DBG_FIG = (tl, u, T) => { dbgState(T); cam.lens(camera, 40); cam.place(camera, [3.5, 1.2, 2.0], [3.45, 0.85, 0]); return { dof: null, exposure: 1.5 }; };
  setups.DBG_EXT = (tl, u, T) => { dbgState(T); cam.lens(camera, 28); cam.place(camera, [3.3, 1.3, 0.0], [10, 1.3, 1]); return { dof: null, exposure: 1.0 }; };

  // ================================================================== return
  function makeCupEnv() {
    // tiny warm-room environment for the porcelain / steel: dark walls, the lamp (warm disc, NE), the window band (E)
    const s = new THREE.Scene();
    const basic = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide });
    s.add(new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), basic(new THREE.Color(0.02, 0.016, 0.012))));
    const lampD = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1.4) })); lampD.position.set(-0.6, 1.0, -1.4); s.add(lampD);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.17, 0.3), side: THREE.DoubleSide })); win.position.set(2.5, 0.6, 0); win.rotation.y = -Math.PI / 2; s.add(win);
    const pm = new THREE.PMREMGenerator(ctx.renderer); const t = pm.fromScene(s, 0.03).texture; pm.dispose(); return t;
  }

  // perf probes: ?nw=a,b (nosea, noshadow, noglass, nofig, nowinsh, nolampsh, nosky)
  const OFF = new Set((q.get('nw') || '').split(',').filter(Boolean));
  if (OFF.has('noshadow')) { lampKey.castShadow = false; winLight.castShadow = false; }
  if (OFF.has('nowinsh')) winLight.castShadow = false;
  if (OFF.has('nolampsh')) lampKey.castShadow = false;
  return {
    scene, camera,
    post: { exposure: 1.15, contrast: 1.06, saturation: 0.9, temp: -0.08, shadowTint: [0.45, 0.49, 0.58], highTint: [0.56, 0.52, 0.47], grain: 0.035, vignette: 0.34, aberration: 0.45,
      bloom: { strength: 0.42, radius: 0.6, threshold: 0.75 } },
    setShot(shot, tl, u, T) {
      const f = setups[shot.id] || setups.default;
      const p = f(tl, u, T, shot) || {};
      if (q.get('cam')) { const c = q.get('cam').split(',').map(Number); cam.lens(camera, c[6] || 50); cam.place(camera, c.slice(0, 3), c.slice(3, 6)); if (p.dof) p.dof.focus = camera.position.distanceTo(V(c[3], c[4], c[5])); }
      if (q.get('grain0')) p.grain = 0;
      sea.update(T, camera);
      if (OFF.has('nosea')) sea.object3D.visible = false;
      if (OFF.has('nosky')) sky.object3D.visible = false;
      if (OFF.has('noglass')) for (const g of glassMeshes) g.visible = false;
      if (OFF.has('nofig')) G.root.visible = R.root.visible = false;
      return p;
    },
  };
}
