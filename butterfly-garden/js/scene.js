/* The Butterfly Garden — scene renderer. render(t) draws one frame; it depends only on t. */
'use strict';

let ctx;                       // main 2D context (set by main.js)
const GY = 905;                // ground line of the main plane
const DX = 200, DS = 0.8;      // dinosaur feet x, scale
const WX = 1000, WS = 0.82;    // ice wall centre, scale
const FACE = WX - A.wall.base[0] * WS + 8;   // x where the fire splashes on the wall
const IX = 1180, IS = 0.95;    // Ice Man
const CX = 1440, CY = 975, CS = 1.0;          // police car (front lane)
const REFX = 1100, REFY = 540;
const PS = 1920 / 2530;        // drawing-page → screen scale
const BEAT = 0.5;

let CAMX = 0, CAMY = 0, CAMZ = 1, SHX = 0, SHY = 0;

// ------------------------------------------------------------------ CAMERA
const CAM = [
  [10.0, [2050, 560, 1.0]],
  [16.0, [1990, 540, 1.08], 'sine'],
  [17.6, [1830, 470, 1.55]],
  [21.0, [1980, 520, 1.5], 'sine'],
  [22.8, [2150, 690, 1.85]],
  [26.0, [2160, 690, 1.95], 'sine'],
  [26.7, [2080, 600, 1.2], 'out'],
  [29.0, [1880, 560, 1.05], 'sine'],
  [31.0, [470, 520, 1.0]],
  [33.6, [450, 540, 0.95], 'sine'],
  [34.4, [600, 360, 1.85], 'out'],
  [36.3, [610, 350, 1.95], 'lin'],
  [37.6, [680, 520, 0.95]],
  [39.5, [760, 500, 0.95], 'sine'],
  [41.4, [1160, 540, 0.82]],
  [44.0, [1350, 560, 0.85], 'sine'],
  [45.6, [1950, 580, 1.15]],
  [47.6, [2000, 560, 1.1], 'sine'],
  [48.8, [2250, 680, 1.15]],
  [50.6, [1300, 690, 1.15]],
  [51.5, [1185, 735, 2.05], 'out'],
  [52.9, [1185, 725, 2.2], 'lin'],
  [53.5, [920, 560, 0.8], 'out'],
  [56.2, [880, 540, 0.82], 'sine'],
  [58.6, [960, 520, 0.9], 'sine'],
  [60.6, [1060, 540, 0.86], 'sine'],
  [62.0, [1560, 610, 1.0]],
  [64.5, [1470, 650, 1.05], 'sine'],
  [65.8, [1440, 770, 1.55]],
  [69.6, [1430, 780, 1.8], 'sine'],
  [70.4, [1250, 580, 0.95], 'out'],
  [72.3, [660, 420, 0.82]],
  [73.4, [340, 500, 0.98]],
  [75.6, [380, 500, 1.05], 'sine'],
  [77.0, [820, 540, 0.82]],
  [79.2, [700, 520, 0.92], 'sine'],
  [80.7, [610, 350, 1.6]],
  [83.8, [630, 360, 1.7], 'sine'],
  [85.0, [600, 420, 1.2]],
  [87.8, [640, 380, 1.4], 'sine'],
  [90.4, [660, 390, 1.5], 'sine'],
  [93.0, [1100, 480, 0.76]],
  [100.0, [1150, 510, 0.76], 'sine'],
  [104.0, [1250, 500, 0.8], 'sine'],
  [108.4, [1150, 500, 0.75], 'sine'],
];
const SHAKES = [
  [26.8, 9, 5], [27.8, 12, 5], [28.8, 16, 5], [29.6, 16, 5], [30.4, 18, 5], [31.2, 18, 5], [32.0, 20, 5],
  [33.0, 10, 6], [53.3, 26, 5], [55.0, 6, 3], [70.0, 10, 7], [73.4, 22, 4.5], [60.9, 9, 6], [61.7, 9, 6],
];
function camera(t) {
  let [x, y, z] = kf(CAM, t);
  const fi = env(t, C.skateA, C.skateB + 0.3, 0.4, 0.5);            // follow Ice Man skating in
  if (fi > 0) { x = lerp(x, iceState(t).x + 80, fi); y = lerp(y, 700, fi); z = lerp(z, 1.2, fi); }
  const fc = env(t, C.carA + 0.3, C.carB + 0.5, 0.5, 0.6);          // follow the police car
  if (fc > 0) { x = lerp(x, carState(t).x + 60, fc); }
  const fb = env(t, C.flyToCam - 9, C.flyToCam, 1.5, 1.0) * 0.35;   // drift with the butterfly in the party
  if (fb > 0) { const b = path(BF, t); x = lerp(x, b[0], fb); }
  let sx = 0, sy = 0;
  for (const [t0, amp, dec] of SHAKES) {
    const a = t - t0; if (a < 0 || a > 1.6) continue;
    const k = amp * Math.exp(-a * dec);
    sx += k * noise1(t * 31 + t0 * 7); sy += k * noise1(t * 29 + t0 * 3 + 50);
  }
  const rr = env(t, C.roarA + 0.2, C.roarB - 0.3, 0.2, 0.3) * 7;               // roar rumble
  const fr = (fireI(t, C.fire1) + fireI(t, C.fire2) + fireI(t, C.fire3)) * 2.5;  // fire rumble
  sx += (rr + fr) * noise1(t * 40); sy += (rr + fr) * noise1(t * 37 + 9);
  CAMX = x; CAMY = y; CAMZ = z; SHX = sx; SHY = sy;
}
function setLayer(d) {
  const x = REFX + (CAMX - REFX) * d, y = REFY + (CAMY - REFY) * d, z = 1 + (CAMZ - 1) * d;
  ctx.setTransform(z, 0, 0, z, W / 2 - x * z + SHX * d, H / 2 - y * z + SHY * d);
}
function toScreen(wx, wy) { return [(wx - CAMX) * CAMZ + W / 2 + SHX, (wy - CAMY) * CAMZ + H / 2 + SHY]; }

// ------------------------------------------------------------------ MOODS
function storm(t) { return Math.min(E.sine(inv(C.darkA, C.darkB, t)), 1 - E.sine(inv(C.sunBack - 0.4, C.partyA, t))); }
function party(t) { return inv(C.partyA, C.partyA + 0.6, t); }
function fireI(t, [a, b]) { return env(t, a, b, 0.15, 0.45); }
const beatHop = t => Math.abs(Math.sin(Math.PI * (t - C.partyA) / BEAT));

// ------------------------------------------------------------------ CHARACTERS: state as a function of t
function dinoState(t) {
  const st = { vis: t >= C.walkA, x: DX, y: 0, rot: 0, sx: 1, sy: 1, head: 0, dark: 0, ice: 0, eye: 0, blush: 0, flag: 0 };
  if (!st.vis) return st;
  // walking in, one stomp at a time
  const steps = C.stomps.filter(s => s >= 28.8);
  let x = -560, bob = 0;
  steps.forEach((s, i) => {
    const p = inv(s - 0.55, s, t); x += 152 * E.io(p);
    if (p > 0 && p < 1) { bob = -26 * Math.sin(Math.PI * p); st.rot = (i % 2 ? 1 : -1) * 0.035 * Math.sin(Math.PI * p); }
  });
  st.x = x; st.y = bob;
  st.sy = 1 + 0.012 * Math.sin(t * 2.2); st.sx = 1 - 0.006 * Math.sin(t * 2.2);
  // stomp squash on landing
  for (const s of steps) { const a = t - s; if (a > 0 && a < 0.3) { st.sy -= 0.05 * Math.sin(Math.PI * a / 0.3); st.sx += 0.03 * Math.sin(Math.PI * a / 0.3); } }
  st.dark = t < C.lightning ? 1 : lerp(0.32, 0, inv(C.netLand, 80, t));
  st.eye = env(t, C.walkA, C.lightning + 0.4, 0.4, 0.4) * (0.85 + 0.15 * Math.sin(t * 9));
  // roar
  const roar = env(t, C.roarA, C.roarB, 0.28, 0.45);
  st.head -= roar * (0.27 + 0.02 * Math.sin(t * 46)); st.sy += roar * 0.03;
  st.eye += roar * 0.5;
  // inhale + fire breaths
  for (const [[ia, ib], fw] of [[C.inhale1, C.fire1], [C.inhale2, C.fire2], [[67.3, 68.4], C.fire3]]) {
    const pin = env(t, ia, ib + 0.12, 0.6, 0.15);
    st.sx += pin * 0.045; st.sy += pin * 0.06; st.head += pin * 0.07;
    const f = fireI(t, fw); st.head -= f * (0.17 + 0.02 * Math.sin(t * 9));
    st.eye += f * 0.35;
  }
  // angry huffing between fires
  const huff = env(t, C.huff[0], C.huff[1], 0.2, 0.3) + env(t, 60.6, 62.4, 0.2, 0.4);
  st.head += huff * 0.03 * Math.sin(t * 13); st.y -= huff * 10 * Math.abs(Math.sin(t * 6));
  // caught in the net
  const land = t - C.netLand;
  if (land > 0 && land < 0.8) { st.sy -= 0.08 * Math.exp(-land * 4) * Math.cos(land * 22); st.sx += 0.04 * Math.exp(-land * 4) * Math.cos(land * 22); }
  st.ice = land > 0 ? Math.min(inv(0, 1.2, land) * 0.8, lerp(0.8, 0.3, inv(1.4, 7, land))) : 0;
  const struggle = env(t, 75.8, 79.4, 0.3, 0.6);
  st.rot += struggle * 0.045 * Math.sin(t * 15);
  // crying: head down, sobbing bounces
  const cry = Math.min(inv(C.cryA, C.cryA + 0.5, t), 1 - inv(C.blush, C.blush + 1, t));
  st.head += cry * (0.09 + 0.035 * Math.sin(t * 12));
  st.sy += cry * 0.03 * Math.abs(Math.sin(t * 6)); st.y -= cry * 6 * Math.abs(Math.sin(t * 6));
  st.flag = t > C.flag && t < C.partyA + 1 ? Math.min(pop(t, C.flag, 0.7), 1 - inv(C.partyA + 0.6, C.partyA + 1, t)) : 0;
  st.blush = E.out(inv(C.blush, C.blush + 0.6, t));
  // happy dance
  const pa = party(t);
  if (pa > 0) { st.rot += pa * 0.035 * Math.sin(Math.PI * (t - C.partyA) / 1.0); st.y -= pa * 10 * beatHop(t); st.head -= pa * 0.05 * beatHop(t); }
  return st;
}
// a point inside the dino sprite → world
function dinoW(st, lx, ly, inHead) {
  if (inHead) [lx, ly] = rotP([lx, ly], A.dino.pivot, st.head);
  const vx = (lx - A.dino.foot[0]) * DS * st.sx, vy = (ly - A.dino.foot[1]) * DS * st.sy, c = Math.cos(st.rot), s = Math.sin(st.rot);
  return [st.x + vx * c - vy * s, GY + st.y + vx * s + vy * c];
}
function rotP([x, y], [cx, cy], a) { const c = Math.cos(a), s = Math.sin(a); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; }

function iceState(t) {
  const st = { vis: t >= C.skateA, x: IX, y: 0, rot: 0, sx: 1, sy: 1, wand: 0, aura: 0 };
  if (!st.vis) return st;
  const p = inv(C.skateA, C.skateB, t);
  st.x = lerp(2750, IX, E.out(p));
  if (p < 1) { st.y = -8 * Math.abs(Math.sin(t * 7)); st.rot = -0.14 * (1 - p); st.wand = 0.25 * Math.sin(t * 7); }
  const spin = inv(50.55, 51.0, t); if (spin > 0 && spin < 1) st.sx = Math.cos(TAU * E.io(spin));
  st.sy = 1 + 0.015 * Math.sin(t * 3);
  // hero pose
  const hero = env(t, C.heroA, C.slam, 0.4, 0.15);
  st.wand += hero * (0.55 + 0.06 * Math.sin(t * 8)); st.aura = env(t, C.heroA, C.slam + 1.2, 0.3, 0.8);
  // jump + slam
  const j = inv(C.slam - 0.32, C.slam, t);
  if (j > 0 && j < 1) { st.y -= 90 * Math.sin(Math.PI * Math.pow(j, 0.8)); st.wand = lerp(0.6, -1.25, E.in(j)); }
  const after = t - C.slam;
  if (after >= 0) { st.wand = lerp(-1.25, 0, E.io(inv(0.4, 1.4, after))); if (after < 0.35) { st.sy -= 0.12 * Math.sin(Math.PI * after / 0.35); st.sx *= 1 + 0.08 * Math.sin(Math.PI * after / 0.35); } }
  // little cheers
  for (const c0 of [56.4, 75.9]) { const c = inv(c0, c0 + 1.6, t); if (c > 0 && c < 1) { st.y -= 40 * Math.abs(Math.sin(c * Math.PI * 3)) * (1 - c * 0.5); st.wand += 0.4 * Math.sin(c * Math.PI * 3); } }
  const pa = party(t);
  if (pa > 0) { st.y -= pa * 46 * beatHop(t); st.wand += pa * 0.5 * Math.sin(Math.PI * (t - C.partyA) / 1.0); st.rot = pa * 0.08 * Math.sin(Math.PI * (t - C.partyA) / 1.0); }
  return st;
}

function carState(t) {
  const st = { vis: t >= C.carA, x: CX, y: 0, rot: 0, sx: 1, sy: 1, wheel: 0, turret: 0, aim: -Math.PI / 2, recoil: 0 };
  if (!st.vis) return st;
  const p = inv(C.carA, C.carB, t), e = E.out(p);
  st.x = lerp(160, CX, e); st.wheel = (st.x - 160) / A.car.wr;
  if (p < 1) st.y = -4 * Math.abs(Math.sin(t * 19));
  const brake = env(t, C.carB - 0.7, C.carB + 0.5, 0.2, 0.5); st.rot = brake * 0.05 * Math.sin(Math.PI * inv(C.carB - 0.7, C.carB + 0.5, t));
  st.turret = pop(t, C.turret, 0.8);
  st.aim = lerp(-Math.PI / 2, -2.42, E.io(inv(C.aim[0], C.aim[1], t)));
  for (const c of C.count) { const a = t - c; if (a > 0 && a < 0.4) { st.sy -= 0.06 * Math.sin(Math.PI * a / 0.4); st.sx += 0.03 * Math.sin(Math.PI * a / 0.4); } }
  const l = t - C.launch; if (l > 0 && l < 0.6) { st.recoil = Math.exp(-l * 7) * Math.cos(l * 30); st.sy -= 0.1 * Math.exp(-l * 6); st.sx += 0.05 * Math.exp(-l * 6); }
  for (const c0 of [75.7]) { const c = inv(c0, c0 + 1.8, t); if (c > 0 && c < 1) st.y -= 22 * Math.abs(Math.sin(c * Math.PI * 4)) * (1 - c); }
  const pa = party(t); if (pa > 0) { st.y -= pa * 22 * beatHop(t); st.rot += pa * 0.04 * Math.sin(Math.PI * (t - C.partyA) / 1.0); }
  return st;
}

// butterfly flight
const BF = [
  [10.6, 3200, 380], [11.6, 2760, 320], [12.6, 2430, 470], [13.6, 2150, 360], [14.6, 1910, 450],
  [15.6, 1710, 380], [16.4, 1650, 520], [17.0, 1790, 560], [17.6, 1900, 450], [18.1, 1820, 330], [18.6, 1680, 380], [19.4, 1800, 480],
  [20.4, 1980, 430], [21.4, 2100, 540], [22.3, 2158, 650], [23.0, 2162, 712],
  [26.0, 2162, 712], [26.5, 2140, 600], [27.6, 2060, 520], [29.0, 2010, 560], [33.0, 2000, 550], [38.6, 2000, 560],
  [39.9, 2060, 520], [41.0, 2300, 470], [44.0, 2320, 480], [47.0, 2290, 500], [52.0, 2280, 480], [54.6, 2250, 470],
  [56.0, 2060, 380], [57.5, 1880, 330], [59.0, 2040, 360], [62.0, 2150, 430], [70.0, 2120, 430], [74.0, 2000, 380],
  [77.0, 1700, 360], [80.0, 1650, 380], [85.4, 1600, 370], [86.6, 1450, 300], [87.6, 1080, 190], [88.5, 690, 300], [89.0, 662, 330],
  [91.0, 700, 300], [94.0, 800, 250],
  [95.5, 1300, 200], [97.0, 1800, 330], [98.5, 1500, 520], [100.0, 1000, 330], [101.5, 600, 200], [103.0, 300, 330],
  [104.5, 700, 480], [106.0, 1200, 300], [107.5, 1500, 380], [108.4, 1300, 420], [112, 1100, 300],
];
function bflyState(t) {
  const [x, y] = path(BF, t), [x2, y2] = path(BF, t + 0.05);
  const vx = (x2 - x) / 0.05, vy = (y2 - y) / 0.05;
  const resting = t > 23.0 && t < 26.0;
  const st = { x, y, s: 0.3, rot: clamp(vx / 2500, -0.35, 0.35) + clamp(vy / 3000, -0.15, 0.15), flap: 0, vis: t >= 10.6 };
  st.flap = resting ? 0.5 + 0.5 * Math.sin(t * 2.6) : 0.5 + 0.5 * Math.sin(t * TAU * 6.5);
  if (resting) st.flap *= 0.6;
  const scared = env(t, 26.0, 27.2, 0.05, 0.3) + env(t, 39.8, 47.0, 0.2, 0.6);
  st.x += scared * 4 * Math.sin(t * 70); st.y += scared * 3 * Math.cos(t * 63);
  st.scared = scared;
  if (t > 26.0 && t < 26.7) st.flap = 0.5 + 0.5 * Math.sin(t * TAU * 11);
  st.s = 0.34 + 0.05 * party(t) + 0.06 * env(t, 16.8, 22.6, 0.8, 0.8);
  return st;
}

// ------------------------------------------------------------------ DRAW CHARACTERS (in sprite-local space)
function drawDinoLocal(st) {
  ctx.drawImage(S.dinoBody, 0, 0);
  if (st.ice > 0.01) { ctx.globalAlpha = st.ice; ctx.drawImage(S.dinoBodyIce, 0, 0); ctx.globalAlpha = 1; }
  if (st.dark > 0.01) { ctx.globalAlpha = st.dark; ctx.drawImage(S.dinoBodyDark, 0, 0); ctx.globalAlpha = 1; }
  const a = st.head, P = A.dino.pivot;
  if (a < -0.004) {          // open mouth: dark red wedge between the jaws
    const cut = A.dino.cut, rc = cut.map(p => rotP(p, P, a));
    ctx.beginPath(); cut.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = rc.length - 1; i >= 0; i--) ctx.lineTo(rc[i][0], rc[i][1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(700, 100, 1000, 200); g.addColorStop(0, '#3a0614'); g.addColorStop(1, '#8c1430');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#e8577a'; ctx.beginPath(); ctx.ellipse(800, 172 + a * 70, 52, 10, a * 0.5, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a); ctx.translate(-P[0], -P[1]);
  ctx.drawImage(S.dinoHead, 0, 0);
  if (st.ice > 0.01) { ctx.globalAlpha = st.ice; ctx.drawImage(S.dinoHeadIce, 0, 0); ctx.globalAlpha = 1; }
  if (st.dark > 0.01) { ctx.globalAlpha = st.dark; ctx.drawImage(S.dinoHeadDark, 0, 0); ctx.globalAlpha = 1; }
  if (st.blush > 0) {
    ctx.globalAlpha = st.blush * 0.75; ctx.fillStyle = '#ff7fae';
    ctx.beginPath(); ctx.ellipse(A.dino.blush[0], A.dino.blush[1], 34 * st.blush, 15 * st.blush, -0.1, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawFlag(st, t) {
  if (st.flag <= 0.01) return;
  const [cx, cy] = A.dino.claw;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.15 + 0.12 * Math.sin(t * 4)); ctx.scale(st.flag * 1.3, st.flag * 1.3);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(TEX.dotW, 0, -260, 170, 150); ctx.globalCompositeOperation = 'source-over';
  crayon(ctx, [[0, 30], [0, -190]], '#8a5a2b', 10, 3);
  const pts = []; const fw = 150, fh = 95;
  for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([u * fw, -190 + Math.sin(u * 5 - t * 9) * 10 * u]); }
  for (let i = 12; i >= 0; i--) { const u = i / 12; pts.push([u * fw, -190 + fh + Math.sin(u * 5 - t * 9 + 0.4) * 10 * u]); }
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill();
  crayon(ctx, pts, '#7a8aa8', 5, 9, 1, true);
  ctx.restore();
}
function drawButterflyLocal(flap, shadow = 0) {     // flap 0 = open, 1 = closed
  const { hl, hr } = A.bfly;
  const k = 1 - 0.78 * flap;
  const piece = (n, h, sh) => {
    ctx.save(); ctx.translate(h, 0); ctx.scale(k, 1); ctx.translate(-h, 0);
    if (sh) ctx.drawImage(S[n].sh, -S[n].sh.pad + 26, -S[n].sh.pad + 40); else ctx.drawImage(S[n].c, 0, 0);
    ctx.restore();
  };
  if (shadow > 0) {
    ctx.globalAlpha = shadow; piece('bfly_left', hl, true); piece('bfly_right', hr, true);
    ctx.drawImage(S.bfly_body.sh, -S.bfly_body.sh.pad + 26, -S.bfly_body.sh.pad + 40); ctx.globalAlpha = 1;
  }
  piece('bfly_left', hl); piece('bfly_right', hr);
  ctx.drawImage(S.bfly_body.c, 0, 0);
}
function drawButterfly(st, shadow = true) {
  ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.rot); ctx.scale(st.s, st.s); ctx.translate(-A.bfly.c[0], -A.bfly.c[1]);
  drawButterflyLocal(st.flap, shadow ? 0.22 : 0);
  ctx.restore();
}
function drawIceLocal(st) {
  const P = A.ice.pivot;
  ctx.drawImage(S.iceman_body.c, 0, 0);
  ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(st.wand); ctx.translate(-P[0], -P[1]); ctx.drawImage(S.iceman_wand.c, 0, 0); ctx.restore();
}
function iceW(st, lx, ly) {
  const vx = (lx - A.ice.foot[0]) * IS * st.sx, vy = (ly - A.ice.foot[1]) * IS * st.sy, c = Math.cos(st.rot), s = Math.sin(st.rot);
  return [st.x + vx * c - vy * s, GY + st.y + vx * s + vy * c];
}
function wandTipW(st) { const p = rotP(A.ice.tip, A.ice.pivot, st.wand); return iceW(st, p[0], p[1]); }
function drawCarLocal(st) {
  // net cannon on the roof (behind the car body)
  if (st.turret > 0.01) {
    const [tx, ty] = A.car.turret;
    ctx.save(); ctx.translate(tx, ty + 8); ctx.scale(st.turret, st.turret);
    ctx.save(); ctx.rotate(st.aim); ctx.translate(-14 * st.recoil, 0);
    ctx.fillStyle = '#cfefff'; ctx.strokeStyle = '#1f4fa8'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(0, -16, 92, 32, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8fdcff'; ctx.beginPath(); ctx.roundRect(78, -21, 22, 42, 8); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#9fc8ff'; ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.drawImage(TEX.flake, -16, -24, 32, 32);
    ctx.restore();
  }
  ctx.drawImage(S.police.c, 0, 0);
  const r = A.car.wr;
  for (const [wx, wy] of A.car.wheels) {
    ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, r, 0, TAU); ctx.clip();
    ctx.translate(wx, wy); ctx.rotate(st.wheel); ctx.translate(-wx, -wy); ctx.drawImage(S.police.c, 0, 0); ctx.restore();
  }
}
function carW(st, lx, ly) {
  const vx = (lx - A.car.base[0]) * CS * st.sx, vy = (ly - A.car.base[1]) * CS * st.sy, c = Math.cos(st.rot), s = Math.sin(st.rot);
  return [st.x + vx * c - vy * s, CY + st.y + vx * s + vy * c];
}
let shimmerC;
function drawWallLocal(rowsF, t, glow = 0) {
  const { base, top, rows } = A.wall, full = base[1] - top;
  const vis = clamp(rowsF / rows, 0, 1.06);
  const y0 = base[1] - vis * full - (vis >= 1 ? top : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(-80, y0, 440, 1000); ctx.clip();
  ctx.drawImage(S.icewall.c, 0, 0);
  // travelling shimmer
  if (!shimmerC) shimmerC = mk(S.icewall.w, S.icewall.h);
  const g = shimmerC.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, shimmerC.width, shimmerC.height);
  const ph = ((t * 0.55) % 1.6) * 1400 - 400;
  const gr = g.createLinearGradient(0, ph, 268, ph - 260);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, shimmerC.width, shimmerC.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(S.icewall.c, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + glow * 0.3; ctx.drawImage(shimmerC, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  return y0;
}
function wallRows(t) {
  let r = 0;
  for (let i = 0; i < A.wall.rows; i++) r += E.back(clamp((t - (C.wallA + i * C.wallRow)) / 0.16));
  return r;
}
function wallTopW(t) { const vis = clamp(wallRows(t) / A.wall.rows); return GY - vis * (A.wall.base[1] - A.wall.top) * WS; }

// ------------------------------------------------------------------ SCENERY
let GROUND, HILL_FAR, HILL_MID, FLOWERS, TREES, TUFTS;
const groundTop = x => GY - 6 + 5 * Math.sin(x / 260) + 3 * Math.sin(x / 91 + 1);
const farHill = x => 610 + 55 * Math.sin(x / 420 + 0.6) + 30 * Math.sin(x / 180 + 2);
const midHill = x => 730 + 45 * Math.sin(x / 330 + 2.1) + 22 * Math.sin(x / 140);
function buildScenery() {
  const pat = c => c.getContext('2d').createPattern(TEX.crayon, 'repeat');
  const hillCanvas = (x0, x1, y0, y1, fn, cTop, cBot, seed) => {
    const c = mk(x1 - x0, y1 - y0), g = c.getContext('2d');
    g.beginPath(); g.moveTo(0, y1 - y0);
    for (let x = x0; x <= x1; x += 8) g.lineTo(x - x0, fn(x) - y0);
    g.lineTo(x1 - x0, y1 - y0); g.closePath();
    const gr = g.createLinearGradient(0, 0, 0, y1 - y0); gr.addColorStop(0, cTop); gr.addColorStop(1, cBot);
    g.fillStyle = gr; g.fill(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = pat(c); g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    const pts = []; for (let x = x0; x <= x1; x += 24) pts.push([x - x0, fn(x) - y0 + 2]);
    crayon(g, pts, 'rgba(60,120,50,0.55)', 6, seed);
    c.x0 = x0; c.y0 = y0; return c;
  };
  HILL_FAR = hillCanvas(-900, 3500, 520, 1500, farHill, '#bfe8a6', '#9fd68a', 3);
  HILL_MID = hillCanvas(-1100, 3900, 650, 1550, midHill, '#9ad97a', '#7cc461', 4);
  // main ground
  const x0 = -1300, x1 = 3800, y0 = GY - 40, y1 = GY + 700;
  const c = mk(x1 - x0, y1 - y0), g = c.getContext('2d');
  g.beginPath(); g.moveTo(0, y1 - y0);
  for (let x = x0; x <= x1; x += 8) g.lineTo(x - x0, groundTop(x) - y0);
  g.lineTo(x1 - x0, y1 - y0); g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, 500); gr.addColorStop(0, '#86d462'); gr.addColorStop(0.5, '#69bd4f'); gr.addColorStop(1, '#4f9d3e');
  g.fillStyle = gr; g.fill(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = pat(c); g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  const r = rng(99);
  for (let i = 0; i < 520; i++) {            // grass tufts
    const x = x0 + r() * (x1 - x0), yy = groundTop(x) + 6 + Math.pow(r(), 1.6) * 600, s = 0.6 + (yy - GY) / 600 * 1.2;
    const col = r() < 0.5 ? '#3f9a3a' : '#5bb84a';
    for (let k = -1; k <= 1; k++) crayon(g, [[x - x0 + k * 5 * s, yy - y0], [x - x0 + k * 9 * s + (r() - 0.5) * 4, yy - y0 - (12 + r() * 12) * s]], col, 3 * s, i * 3 + k);
  }
  for (let i = 0; i < 90; i++) {             // tiny dots of colour (her crayon flowers in the grass)
    const x = x0 + r() * (x1 - x0), yy = groundTop(x) + 30 + r() * 500;
    g.fillStyle = ['#ffd84a', '#ff9ccf', '#ffffff', '#ffb04a'][i % 4]; g.globalAlpha = 0.8;
    g.beginPath(); g.arc(x - x0, yy - y0, 3 + r() * 3, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  const edge = []; for (let x = x0; x <= x1; x += 20) edge.push([x - x0, groundTop(x) - y0 + 3]);
  crayon(g, edge, '#3c8f34', 8, 77);
  c.x0 = x0; c.y0 = y0; GROUND = c;

  // trees in the garden (her tree, reused at different sizes)
  TREES = [
    { x: 1700, y: GY + 4, s: 0.62, flip: true, ph: 1 }, { x: 1960, y: GY + 10, s: 1.0, flip: false, ph: 2 },
    { x: 2470, y: GY + 6, s: 0.82, flip: true, ph: 3 }, { x: 2930, y: GY + 8, s: 0.92, flip: false, ph: 4 },
    { x: -330, y: GY + 4, s: 0.7, flip: false, ph: 5 },
  ];
  // flowers
  const fr = rng(42), types = ['flower_pink', 'flower_red', 'flower_orange', 'flower_orange2'];
  FLOWERS = [];
  const garden = [];
  for (let i = 0; i < 30; i++) {
    const x = 1150 + i * 68 + (fr() - 0.5) * 40; if (Math.abs(x - 2162) < 40) continue;
    const depth = fr();
    garden.push({ x, y: GY + 4 + depth * 46, s: 0.55 + depth * 0.4, stem: 45 + fr() * 75, type: types[Math.floor(fr() * 4)], ph: fr() * 6, wilt: x < 1640, front: false });
  }
  garden.sort((a, b) => a.x - b.x).forEach((f, i) => (f.pop = 10.35 + i * 0.125));
  FLOWERS.push(...garden);
  FLOWERS.push({ x: 2162, y: GY + 20, s: 1.3, stem: 165, type: 'flower_pink', ph: 0, pop: 12.0, hero: true, front: false });
  for (let i = 0; i < 18; i++) {            // left side: bloom in the finale wave
    const x = 1080 - i * 82 + (fr() - 0.5) * 30, depth = fr();
    FLOWERS.push({ x, y: GY + 4 + depth * 46, s: 0.55 + depth * 0.4, stem: 45 + fr() * 70, type: types[Math.floor(fr() * 4)], ph: fr() * 6, pop: 94.5 + i * 0.125, front: false });
  }
  for (const [x, p] of [[1660, 10.6], [1890, 11.2], [2350, 11.8], [2620, 12.4], [2860, 13.0], [3080, 13.6], [-200, 96.9], [60, 97.2], [560, 97.5], [820, 97.8]]) {
    FLOWERS.push({ x, y: GY + 110 + fr() * 50, s: 1.15 + fr() * 0.3, stem: 70 + fr() * 50, type: types[Math.floor(fr() * 4)], ph: fr() * 6, pop: p, front: true, wilt: x > 1500 && x < 1700 });
  }
  FLOWERS.sort((a, b) => a.y - b.y);
  TEX.flowerDry = {}; for (const ty of types) TEX.flowerDry[ty] = tint(S[ty].c, '#7a5a3a', 0.55);
}

function drawSky(t) {
  const st = storm(t), pa = party(t);
  const day = ['#79c4ff', '#b9e3ff', '#fff3da'], dark = ['#3a2160', '#5b3b7d', '#8a6a8f'], gold = ['#7fcfff', '#ffd2ea', '#fff0b8'];
  const col = i => { const a = hex(day[i]), b = hex(dark[i]), c = hex(gold[i]); return rgb(mixv(mixv(a, b, st), c, pa * 0.85)); };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, col(0)); gr.addColorStop(0.55, col(1)); gr.addColorStop(1, col(2));
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}
function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgb(a, al = 1) { return `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`; }

function drawSun(t) {
  const st = storm(t);
  const sink = st * 260, x = 1760, y = 170 + sink;
  setLayer(0.06);
  const rays = 14, rot = t * 0.25, pulse = 1 + 0.06 * Math.sin(t * 3);
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 1 - st * 0.8;
  ctx.drawImage(TEX.dotY, -260 * pulse, -260 * pulse, 520 * pulse, 520 * pulse);
  ctx.rotate(rot);
  for (let i = 0; i < rays; i++) {
    ctx.save(); ctx.rotate(i * TAU / rays); ctx.fillStyle = i % 2 ? '#ffc93a' : '#ffa62e';
    ctx.beginPath(); ctx.moveTo(-16, -128); ctx.lineTo(0, -185 - (i % 2) * 22 - 10 * Math.sin(t * 4 + i)); ctx.lineTo(16, -128); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.rotate(-rot + 0.05 * Math.sin(t * 1.5));
  ctx.drawImage(TEX.sun, -TEX.sun.width / 2, -TEX.sun.height / 2);
  ctx.restore();
}
function drawClouds(t) {
  const st = storm(t);
  setLayer(0.12);
  const day = [[200, 190, 0], [900, 120, 1], [1500, 260, 2], [2300, 150, 3], [2900, 230, 0], [-500, 230, 2]];
  ctx.globalAlpha = 1 - st * 0.7;
  for (const [x, y, k] of day) { const c = TEX.clouds[k]; const xx = ((x + t * 9 + 900) % 4400) - 900; ctx.drawImage(c, xx, y); }
  ctx.globalAlpha = 1;
  if (st > 0.001) {   // storm clouds roll in from the left and leave to the right
    const inP = E.out(inv(C.darkA, C.darkB + 1, t)), outP = E.in(inv(C.sunBack - 0.5, C.partyA, t));
    const base = [[-200, 60, 0], [450, 10, 1], [1100, 70, 2], [1750, 0, 3], [2400, 60, 1], [3000, 20, 0], [150, 200, 2], [1400, 210, 1], [2700, 190, 3]];
    base.forEach(([x, y, k], i) => {
      const c = TEX.storm[k];
      const xx = x - (1 - inP) * (2600 + i * 120) + outP * (3200 + i * 100) + 14 * Math.sin(t * 0.5 + i);
      ctx.drawImage(c, xx, y - 40 + 8 * Math.sin(t * 0.7 + i));
    });
  }
}
function drawRainbow(t) {
  const p = E.io(inv(C.partyA + 0.5, C.partyA + 2.6, t)); if (p <= 0) return;
  setLayer(0.1);
  const cols = ['#ff5a5a', '#ffa23a', '#ffe14a', '#6ad66a', '#4ab4ff', '#9a6aff'];
  ctx.save(); ctx.globalAlpha = 0.82; ctx.lineCap = 'round';
  cols.forEach((c, i) => {
    const r = 1000 - i * 40;
    ctx.strokeStyle = c; ctx.lineWidth = 42; ctx.beginPath(); ctx.arc(1100, 1250, r, Math.PI, Math.PI + Math.PI * p); ctx.stroke();
  });
  ctx.restore();
}
function drawFireworks(t) {
  const times = [95.0, 96.2, 97.6, 99.0, 100.4, 101.6, 103.0, 104.6, 106.0, 107.2, 108.4, 109.4];
  const cols = ['y', 'p', 'c', 'w'];
  setLayer(0.12);
  ctx.globalCompositeOperation = 'lighter';
  times.forEach((t0, i) => {
    const a = t - t0; if (a < 0 || a > 1.8) return;
    const cx = 300 + hash(i * 3.1) * 1700, cy = 80 + hash(i * 5.7) * 230;
    const n = 30, col = TEX.star[cols[i % 4]];
    for (let k = 0; k < n; k++) {
      const ang = k / n * TAU + i, sp = 260 + 90 * hash(k + i * 50);
      const d = sp * (1 - Math.exp(-a * 2.6)) / 2.6 * 2.2;
      const x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d + 60 * a * a;
      const al = (1 - a / 1.8) * (0.7 + 0.3 * Math.sin(a * 30 + k));
      const s = 30 * (1 - a / 2.2);
      ctx.globalAlpha = clamp(al); ctx.drawImage(col, x - s / 2, y - s / 2, s, s);
    }
    if (a < 0.25) { ctx.globalAlpha = 1 - a / 0.25; ctx.drawImage(TEX.dotW, cx - 120, cy - 120, 240, 240); }
  });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawHills(t) {
  setLayer(0.3); ctx.drawImage(HILL_FAR, HILL_FAR.x0, HILL_FAR.y0);
  setLayer(0.6);
  // little hazy trees on the mid hills
  for (const [x, k] of [[-500, 0], [250, 1], [880, 0], [1420, 1], [2050, 0], [2680, 1], [3250, 0]]) {
    const s = 0.4 + 0.06 * k, y = midHill(x) + 14, sway = 0.01 * Math.sin(t + x) + storm(t) * 0.03 * Math.sin(t * 2.2 + x);
    ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -sway, 1, 0, 0); ctx.scale(k ? -s : s, s);
    ctx.drawImage(S.treeHaze, -A.tree.base[0], -A.tree.base[1]); ctx.restore();
  }
  ctx.drawImage(HILL_MID, HILL_MID.x0, HILL_MID.y0);
}
function stompKick(t) { let k = 0; for (const s of C.stomps) { const a = t - s; if (a > 0 && a < 1) k += Math.exp(-a * 5) * Math.sin(a * 40); } return k; }
function drawTree(tr, t) {
  const sway = 0.012 * Math.sin(t * 1.1 + tr.ph) + storm(t) * 0.035 * Math.sin(t * 2.3 + tr.ph) + 0.05 * stompKick(t) + party(t) * 0.04 * Math.sin(Math.PI * (t - C.partyA) / 1.0 + tr.ph);
  ctx.save(); ctx.translate(tr.x, tr.y);
  ctx.fillStyle = 'rgba(20,60,20,0.22)'; ctx.beginPath(); ctx.ellipse(0, 4, 200 * tr.s, 22 * tr.s, 0, 0, TAU); ctx.fill();
  ctx.transform(1, 0, -sway, 1, 0, 0); ctx.scale(tr.flip ? -tr.s : tr.s, tr.s);
  ctx.globalAlpha = 0.22; ctx.drawImage(S.tree.sh, -A.tree.base[0] - S.tree.sh.pad + 14, -A.tree.base[1] - S.tree.sh.pad + 10); ctx.globalAlpha = 1;
  ctx.drawImage(S.tree.c, -A.tree.base[0], -A.tree.base[1]);
  ctx.restore();
}
function flowerWilt(f, t) { return f.wilt ? Math.min(E.io(inv(40.6 + (1640 - f.x) * -0.002, 43.0, t)), 1 - E.out(inv(94.6 + (f.x - 1100) * 0.0008, 95.6, t))) : 0; }
function drawFlower(f, t) {
  const p = t < f.pop ? 0 : clamp((t - f.pop) / 0.55); if (p <= 0) return;
  const sc = E.elastic(p), grow = E.out(clamp(p * 1.6));
  const w = flowerWilt(f, t), pa = party(t);
  const sway = 0.06 * Math.sin(t * 1.6 + f.ph) + storm(t) * 0.1 * Math.sin(t * 3 + f.ph) + pa * 0.18 * Math.sin(Math.PI * (t - C.partyA) / BEAT + f.ph);
  const hgt = f.stem * grow * (1 - 0.45 * w) * (f.front ? 1.2 : 1);
  const tipX = f.x + Math.sin(sway) * hgt + w * hgt * 0.65, tipY = f.y - hgt * Math.cos(sway * 0.5) + w * 18;
  const lw = 6 * Math.max(f.s, 0.7);
  ctx.strokeStyle = '#3b9a3a'; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + (tipX - f.x) * 0.2, f.y - hgt * 0.6, tipX, tipY); ctx.stroke();
  ctx.fillStyle = '#56b947';
  ctx.beginPath(); ctx.ellipse(f.x + 10 * f.s, f.y - hgt * 0.35, 16 * f.s * grow, 7 * f.s * grow, -0.6, 0, TAU); ctx.fill();
  const img = S[f.type].c, s = f.s * sc * (1 - 0.15 * w) * (1 + 0.06 * pa * beatHop(t));
  ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(sway * 0.6 + w * 1.9 + (f.hero ? 0.05 * Math.sin(t * 2) : 0)); ctx.scale(s, s);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  if (w > 0.01) { ctx.globalAlpha = w; ctx.drawImage(TEX.flowerDry[f.type], -img.width / 2, -img.height / 2); ctx.globalAlpha = 1; }
  ctx.restore();
}

// ------------------------------------------------------------------ PARTICLES (stateless)
function stamp(img, x, y, s, a = 1) { if (a <= 0.003) return; ctx.globalAlpha = Math.min(a, 1); ctx.drawImage(img, x - s / 2, y - s / 2, s, s); }
function sparkleBurst(t, t0, x, y, n, speed, life, col = 'w', seed = 1, size = 40) {
  const a = t - t0; if (a < 0 || a > life) return;
  for (let k = 0; k < n; k++) {
    const ang = hash(k * 1.7 + seed) * TAU, sp = speed * (0.4 + 0.6 * hash(k * 3.3 + seed));
    const d = sp * a * (1 - 0.45 * a / life), p = a / life;
    const tw = 0.6 + 0.4 * Math.sin(a * 25 + k);
    stamp(TEX.star[col], x + Math.cos(ang) * d, y + Math.sin(ang) * d + 40 * a * a, size * (1 - p * 0.6) * (0.6 + 0.6 * hash(k + seed)), (1 - p) * tw);
  }
}
function trail(t, posFn, from, to, rate, life, col, size, spread = 20) {
  const k1 = Math.floor((Math.min(t, to) - from) * rate), k0 = Math.max(0, Math.floor((t - life - from) * rate));
  for (let k = k0; k <= k1; k++) {
    const b = from + k / rate, a = t - b; if (a < 0 || a > life) continue;
    const [x, y] = posFn(b), p = a / life;
    stamp(TEX.star[col], x + (hash(k * 1.3) - 0.5) * spread + (hash(k * 7.1) - 0.5) * 40 * a, y + (hash(k * 2.9) - 0.5) * spread + 50 * a,
      size * (1 - p) * (0.6 + 0.5 * hash(k)), (1 - p) * (0.6 + 0.4 * Math.sin(a * 30 + k)));
  }
}
function heartsUp(t, t0, t1, x, y, rate, seed = 1, scale = 0.6, spreadX = 60) {
  const k1 = Math.floor((Math.min(t, t1) - t0) * rate), k0 = Math.max(0, Math.floor((t - 2 - t0) * rate));
  for (let k = k0; k <= k1; k++) {
    const b = t0 + k / rate, a = t - b; if (a < 0 || a > 2) continue;
    const img = k % 2 ? S.heart.c : S.heart2.c, s = scale * (0.7 + 0.6 * hash(k + seed)) * E.back(clamp(a / 0.3));
    ctx.save(); ctx.globalAlpha = clamp(1 - (a - 1.4) / 0.6);
    ctx.translate(x + (hash(k * 2.1 + seed) - 0.5) * spreadX + 20 * Math.sin(a * 4 + k), y - a * 110); ctx.rotate(0.3 * Math.sin(a * 3 + k));
    ctx.scale(s, s); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
  }
}
function heartBurst(t, t0, x, y, n, seed = 3) {
  const a = t - t0; if (a < 0 || a > 2.2) return;
  for (let k = 0; k < n; k++) {
    const ang = k / n * TAU + seed, d = 260 * (1 - Math.exp(-a * 3));
    const img = k % 2 ? S.heart.c : S.heart2.c, s = 0.9 * E.back(clamp(a / 0.35)) * (1 - inv(1.4, 2.2, a));
    ctx.save(); ctx.translate(x + Math.cos(ang) * d, y + Math.sin(ang) * d - 30 * a); ctx.rotate(Math.sin(a * 5 + k) * 0.3); ctx.scale(s, s);
    ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
  }
}

function fireOrigin(st) {
  const o = dinoW(st, A.dino.mouth[0], A.dino.mouth[1], true);
  return { x: o[0], y: o[1], dir: 0.2 + st.head * 0.55 };
}
function drawFire(t, win, blocked, fizzle) {
  const I = fireI(t, win); const [a, b] = win;
  if (t < a || t > b + 1.2) return;
  const st = dinoState(t), O = fireOrigin(st);
  const fz = fizzle ? 1 - inv(fizzle[0], fizzle[1], t) : 1;
  const rate = 150, L = 0.95, speed = 1250 * (0.55 + 0.45 * fz);
  const k0 = Math.max(0, Math.floor((t - L - a) * rate)), k1 = Math.floor((Math.min(t, b) - a) * rate);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = k0; k <= k1; k++) {
    const birth = a + k / rate, age = t - birth; if (age < 0 || age > L) continue;
    const h1 = hash(k * 1.31 + a), h2 = hash(k * 2.77 + a), h3 = hash(k * 4.13 + a);
    const bi = fireI(birth, win) * (fizzle ? 1 - inv(fizzle[0], fizzle[1], birth) : 1);
    if (bi <= 0.02) continue;
    const ang = O.dir + (h2 - 0.5) * 0.32 * (1 + age), d = speed * (0.85 + 0.3 * h1) * age * (1 - 0.2 * age) * bi;
    let x = O.x + Math.cos(ang) * d, y = O.y + Math.sin(ang) * d - 80 * age * age;
    let size = (46 + 300 * age) * (0.75 + 0.5 * h3) * (0.5 + 0.5 * bi);
    let steamy = 0;
    if (blocked && x > FACE && y > wallTopW(t) - 20) { const e = x - FACE; x = FACE - e * 0.3; y += (h3 < 0.5 ? -1 : 1) * e * 1.05; size *= 1.15; steamy = clamp(e / 260); }
    const p = age / L;
    const tex = p < 0.18 ? TEX.dotY : p < 0.45 ? TEX.dotO : p < 0.75 ? TEX.dotR : null;
    const al = Math.pow(1 - p, 0.7) * I * (1 - steamy * 0.6) * 0.85;
    if (tex) stamp(tex, x, y, size, al);
    if (p < 0.3) stamp(TEX.dotW, x, y, size * 0.35, al * 0.6);
  }
  ctx.globalCompositeOperation = 'source-over';
  // her drawn flames at the mouth
  if (I > 0.02) {
    const fl = 1 + 0.13 * Math.sin(t * 23) + 0.07 * Math.sin(t * 37);
    ctx.save(); ctx.translate(O.x, O.y); ctx.rotate(O.dir - 0.05); const s = 1.6 * I * fz;
    ctx.scale(s * fl, s * (1.05 + 0.1 * Math.sin(t * 17)));
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(S.fireGlow, -A.fire.o[0] - S.fireGlow.pad, -A.fire.o[1] - S.fireGlow.pad);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(S.fire, -A.fire.o[0], -A.fire.o[1]);
    ctx.restore();
  }
  // warm light
  ctx.globalCompositeOperation = 'lighter';
  stamp(TEX.dotO, O.x + 120, O.y, 900 * I, 0.35 * I);
  if (blocked) { const iy = O.y + Math.tan(O.dir) * (FACE - O.x); stamp(TEX.dotO, FACE - 60, iy, 800 * I, 0.4 * I * fz); }
  else stamp(TEX.dotO, O.x + 700, O.y + 130, 900 * I, 0.25 * I);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // steam where fire meets ice
  if (blocked) {
    const iy = O.y + Math.tan(O.dir) * (FACE - O.x), r2 = 26, L2 = 1.7;
    const s0 = Math.max(0, Math.floor((t - L2 - a - 0.2) * r2)), s1 = Math.floor((Math.min(t, b + 0.6) - a - 0.2) * r2);
    for (let k = s0; k <= s1; k++) {
      const birth = a + 0.2 + k / r2, age = t - birth; if (age < 0 || age > L2) continue;
      const bi = fireI(birth, win); if (bi < 0.05) continue;
      const h = hash(k * 3.7 + a), h2 = hash(k * 5.3 + a), p = age / L2;
      const x = FACE - 20 - h * 70 - 80 * age * h2, y = iy + (h2 - 0.5) * 300 - 160 * age - 50 * age * age;
      stamp(TEX.steam, x, y, 70 + 230 * age, (1 - p) * 0.8 * bi);
    }
  }
}

function drawNet(t) {
  if (t < C.launch) return;
  const car = carState(t);
  const [tx, ty] = A.car.turret, m = carW(car, tx + Math.cos(car.aim) * 100, ty + 8 + Math.sin(car.aim) * 100);
  const end = [300, 360], ctrl = [760, -420];
  const fp = E.sine(inv(C.launch, C.netLand - 0.5, t));
  const bez = p => [(1 - p) * (1 - p) * m[0] + 2 * (1 - p) * p * ctrl[0] + p * p * end[0], (1 - p) * (1 - p) * m[1] + 2 * (1 - p) * p * ctrl[1] + p * p * end[1]];
  const ball = bez(fp);
  const open = E.out(inv(C.netOpen, C.netLand, t));
  // sparkle trail of the flying net
  if (t < C.netLand + 1.2) trail(t, b => bez(E.sine(inv(C.launch, C.netLand - 0.5, b))), C.launch, C.netLand, 40, 0.9, 'c', 46, 30);
  if (open <= 0.001) {           // folded net ball, spinning
    ctx.save(); ctx.translate(ball[0], ball[1]); ctx.rotate((t - C.launch) * 9);
    ctx.globalCompositeOperation = 'lighter'; stamp(TEX.dotC, 0, 0, 200, 0.8); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#2a7fd0'; ctx.lineWidth = 8; ctx.fillStyle = 'rgba(210,245,255,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#e8fcff'; ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 15, -42); ctx.lineTo(i * 15, 42); ctx.moveTo(-42, i * 15); ctx.lineTo(42, i * 15); ctx.stroke(); }
    ctx.restore(); return;
  }
  // the dome-shaped ice net
  const cx = 300, base = GY + 12, R = 540, Hh = 840, M = 12, P = 8;
  const land = t - C.netLand, jig = land > 0 ? Math.exp(-land * 3.5) * Math.sin(land * 18) : 0;
  const vtx = (i, j) => {
    const lam = -Math.PI / 2 + Math.PI * i / (M - 1), phi = (Math.PI / 2) * j / P;
    let x = cx + R * Math.cos(phi) * Math.sin(lam), y = base - Hh * Math.sin(phi) + R * 0.13 * Math.cos(phi) * Math.cos(lam);
    x += (hash2(i, j) - 0.5) * 18; y += (hash2(j + 9, i) - 0.5) * 14 + jig * 26 * Math.sin(phi * 2);
    return [lerp(ball[0] + (x - cx) * 0.06, x, open), lerp(ball[1] + (y - (base - Hh / 2)) * 0.06, y, open)];
  };
  const lines = [];
  for (let i = 0; i < M; i++) { const l = []; for (let j = 0; j <= P; j++) l.push(vtx(i, j)); lines.push(l); }
  for (let j = 0; j < P; j++) { const l = []; for (let i = 0; i < M; i++) l.push(vtx(i, j)); lines.push(l); }
  const glow = 0.5 + 0.5 * env(t, C.netLand, C.netLand + 2.4, 0.1, 1.5) + 0.15 * Math.sin(t * 3);
  ctx.globalAlpha = lerp(1, 0.55, inv(76, 80, t));
  const stroke = (col, w, comp) => {
    ctx.globalCompositeOperation = comp; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const l of lines) { ctx.beginPath(); l.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
  };
  const na = ctx.globalAlpha;
  stroke(`rgba(110,210,255,${0.28 * glow})`, 22, 'lighter');
  stroke('#2a74c8', 9, 'source-over');
  stroke('#eafcff', 4.5, 'source-over');
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < M; i++) for (let j = 0; j <= P; j += 1) {
    const [x, y] = vtx(i, j), tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.3 + j * 2.1);
    stamp(TEX.star.c, x, y, 26 + 20 * tw * glow, (0.55 + 0.45 * tw) * na);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (land > 0) {               // icy stakes pin the net to the ground
    for (const sx of [cx - R + 10, cx + R - 10]) {
      const h = 70 * E.back(clamp((land - 0.05) / 0.3));
      ctx.fillStyle = '#c9f1ff'; ctx.strokeStyle = '#2a74c8'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(sx - 26, base + 10); ctx.lineTo(sx, base + 10 - h); ctx.lineTo(sx + 26, base + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    sparkleBurst(t, C.netLand, cx, base - 300, 60, 900, 1.6, 'c', 7, 60);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawTears(t, st) {
  const a0 = C.cryA + 0.6, a1 = C.tearsEnd;
  if (t < a0 || t > a1 + 2) return;
  const eye = dinoW(st, A.dino.eye[0], A.dino.eye[1] + 22, true);
  const rate = 16, g = 1500;
  const k0 = Math.max(0, Math.floor((t - 1.6 - a0) * rate)), k1 = Math.floor((Math.min(t, a1) - a0) * rate);
  for (let k = k0; k <= k1; k++) {
    const b = a0 + k / rate, age = t - b; if (age < 0) continue;
    const side = k % 2 ? 1 : -1, vx = side * (230 + 120 * hash(k)), vy = -380 - 160 * hash(k * 2.3);
    const ex = eye[0] + side * 18, ey = eye[1];
    const tHit = (-vy + Math.sqrt(vy * vy + 2 * g * (GY + 10 - ey))) / g;
    if (age < tHit) {
      const x = ex + vx * age, y = ey + vy * age + 0.5 * g * age * age, ang = Math.atan2(vy + g * age, vx) - Math.PI / 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const s = 0.75 * E.out(clamp(age / 0.15)); ctx.scale(s, s);
      ctx.drawImage(TEX.tear, -30, -58); ctx.restore();
    } else if (age < tHit + 0.35) {   // splash
      const sa = (age - tHit) / 0.35, x = ex + vx * tHit;
      ctx.strokeStyle = `rgba(90,190,255,${1 - sa})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x, GY + 12, 10 + 40 * sa, 4 + 10 * sa, 0, 0, TAU); ctx.stroke();
    }
  }
}
function drawPuddle(t) {
  const g = E.out(inv(C.cryA + 1, C.tearsEnd, t)) * (1 - inv(C.partyA + 2, C.partyA + 6, t));
  if (g <= 0) return;
  const shim = 0.06 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(110,200,255,${0.55 * g})`; ctx.strokeStyle = `rgba(40,120,220,${0.6 * g})`; ctx.lineWidth = 4;
  for (const [x, rx] of [[DX + 120, 300], [DX + 560, 120]]) { ctx.beginPath(); ctx.ellipse(x, GY + 16, rx * g * (1 + shim), 22 * g, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = `rgba(255,255,255,${0.5 * g})`; ctx.beginPath(); ctx.ellipse(DX + 60, GY + 10, 60 * g, 5 * g, 0, 0, TAU); ctx.fill();
}

function drawBubble(t, x, y, text) {
  const p = pop(t, C.sorry, 0.6), out = 1 - inv(C.comfort[1] - 0.4, C.comfort[1] + 0.2, t);
  const s = p * out; if (s <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(0.05 * Math.sin(t * 3));
  const w = 360, h = 150;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#3a2a5a'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 70); ctx.moveTo(-90, h / 2 - 6); ctx.lineTo(-150, h / 2 + 60); ctx.lineTo(-30, h / 2 - 4);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-88, h / 2 - 14, 54, 12);
  ctx.font = '86px Chewy'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ff5a8a';
  ctx.fillText(text, -20, 4);
  const hs = 1.9 + 0.2 * Math.sin(t * 8); ctx.translate(132, 0); ctx.scale(hs, hs); ctx.drawImage(S.heart.c, -S.heart.w / 2, -S.heart.h / 2);
  ctx.restore();
}

// ------------------------------------------------------------------ WORLD FRAME
function drawWorld(t) {
  camera(t);
  const st = storm(t);
  drawSky(t);
  drawSun(t);
  drawRainbow(t);
  drawClouds(t);
  drawFireworks(t);
  drawHills(t);
  setLayer(1);
  ctx.drawImage(GROUND, GROUND.x0, GROUND.y0);
  // ice skating trail
  if (t > C.skateA && t < C.slam + 6) {
    const ice = iceState(t), fade = 1 - inv(C.skateB + 2, C.slam + 6, t);
    const g = ctx.createLinearGradient(ice.x, 0, 2750, 0); g.addColorStop(0, `rgba(220,250,255,${0.85 * fade})`); g.addColorStop(1, 'rgba(220,250,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(ice.x - 20, GY + 2, 2750 - ice.x, 16, 8); ctx.fill();
  }
  drawPuddle(t);
  for (const f of FLOWERS) if (!f.front && f.y < GY + 20) drawFlower(f, t);
  for (const tr of TREES) drawTree(tr, t);
  for (const f of FLOWERS) if (!f.front && f.y >= GY + 20) drawFlower(f, t);

  // dinosaur
  const dn = dinoState(t);
  if (dn.vis) {
    ctx.fillStyle = 'rgba(20,40,10,0.28)'; ctx.beginPath(); ctx.ellipse(dn.x - 10, GY + 10, 380, 34, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(dn.x, GY + dn.y); ctx.rotate(dn.rot); ctx.scale(DS * dn.sx, DS * dn.sy); ctx.translate(-A.dino.foot[0], -A.dino.foot[1]);
    ctx.globalAlpha = 0.25; ctx.drawImage(S.dino.sh, -S.dino.sh.pad + 16, -S.dino.sh.pad + 18); ctx.globalAlpha = 1;
    drawDinoLocal(dn);
    ctx.restore();
  }
  // ice wall
  if (t >= C.wallA) {
    ctx.fillStyle = 'rgba(40,90,140,0.25)'; ctx.beginPath(); ctx.ellipse(WX, GY + 8, 140, 18, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(WX, GY); const jig = Math.sin((t - C.wallA) * 30) * Math.exp(-(t - C.wallA) * 3) * 0.04; ctx.scale(WS * (1 + jig), WS);
    ctx.translate(-A.wall.base[0], -A.wall.base[1]);
    drawWallLocal(wallRows(t), t, fireI(t, C.fire2) + fireI(t, C.fire3));
    ctx.restore();
  }
  // Ice Man
  const ice = iceState(t);
  if (ice.vis) {
    ctx.fillStyle = 'rgba(20,40,60,0.25)'; ctx.beginPath(); ctx.ellipse(ice.x, GY + 6, 80 * (1 + ice.y / 300), 12, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(ice.x, GY + ice.y); ctx.rotate(ice.rot); ctx.scale(IS * ice.sx, IS * ice.sy); ctx.translate(-A.ice.foot[0], -A.ice.foot[1]);
    ctx.globalAlpha = 0.25; ctx.drawImage(S.iceman_body.sh, -S.iceman_body.sh.pad + 10, -S.iceman_body.sh.pad + 12); ctx.globalAlpha = 1;
    drawIceLocal(ice); ctx.restore();
  }
  // police car
  const car = carState(t);
  if (car.vis) {
    ctx.fillStyle = 'rgba(20,40,10,0.3)'; ctx.beginPath(); ctx.ellipse(car.x, CY + 4, 170, 16, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(car.x, CY + car.y); ctx.rotate(car.rot); ctx.scale(CS * car.sx, CS * car.sy); ctx.translate(-A.car.base[0], -A.car.base[1]);
    ctx.globalAlpha = 0.25; ctx.drawImage(S.police.sh, -S.police.sh.pad + 10, -S.police.sh.pad + 10); ctx.globalAlpha = 1;
    drawCarLocal(car); ctx.restore();
    if (t < C.carB + 0.4) {                 // speed lines + dust
      const sp = 1 - inv(C.carB - 0.6, C.carB + 0.4, t);
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * sp})`; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { ctx.lineWidth = 6 + 4 * hash(i); const y = CY - 30 - i * 24, l = 140 + 160 * hash(i + 3), x = car.x - 210 - 60 * hash(i + 8) - ((t * 900 + i * 90) % 120);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l, y); ctx.stroke(); }
      for (let i = 0; i < 10; i++) { const a = ((t * 3 + i / 10) % 1); stamp(TEX.dust, car.x - 160 - a * 260, CY - 10 - a * 50 + hash(i) * 20, 60 + a * 140, (1 - a) * 0.8 * sp); }
      ctx.globalAlpha = 1;
    }
  }
  for (const f of FLOWERS) if (f.front) drawFlower(f, t);

  // stomp dust
  for (const s of C.stomps.filter(s => s >= 28.8)) {
    const a = t - s; if (a < 0 || a > 1.2) continue;
    const dn2 = dinoState(s);
    for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1, d = (90 + 160 * hash(i + s)) * E.out(a / 1.2);
      stamp(TEX.dust, dn2.x + 30 + side * (200 + d), GY - 10 - 70 * a * hash(i * 3 + s), 90 + 160 * a, (1 - a / 1.2) * 0.9); }
    ctx.globalAlpha = 1;
  }
  // leaves shaken off the trees by stomps
  for (const s of C.stomps) {
    const a = t - s; if (a < 0 || a > 3) continue;
    for (let i = 0; i < 10; i++) {
      const tr = TREES[1 + (i % 3)], x = tr.x + (hash(i * 3 + s) - 0.5) * 300 * tr.s + 40 * Math.sin(a * 3 + i), y = tr.y - 420 * tr.s + a * 160 + (hash(i + s) - 0.3) * 160;
      ctx.save(); ctx.globalAlpha = clamp(1 - a / 3); ctx.translate(x, y); ctx.rotate(a * 3 + i); ctx.fillStyle = i % 3 ? '#4fb447' : '#ff8fc6';
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }

  // butterfly (+ its sparkle trail and hearts)
  const bf = bflyState(t);
  const inFlyCam = t > C.flyToCam;
  if (bf.vis && !inFlyCam) {
    trail(t, b => { const s = bflyState(b); return [s.x, s.y + 20]; }, 10.6, Math.min(t, C.flyToCam), 22, 1.0, (Math.floor(t) % 2 ? 'p' : 'y'), 34, 30);
    ctx.globalAlpha = 1;
    drawButterfly(bf);
    if (t > 18.0 && t < 23.5) heartsUp(t, 18.0, 21.6, bf.x, bf.y - 30, 4, 11, 0.55);
    if (bf.scared > 0.2) drawExclaim(bf.x + 40, bf.y - 90, bf.scared, t);
  }
  drawNetAndFx(t, dn, ice, car, bf);

  // storm darkening (multiply) then everything that glows
  setLayer(1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (st > 0.01) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgb(mixv([255, 255, 255], [176, 156, 214], st)); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  setLayer(1);
  drawGlows(t, dn, ice, car);
  drawFire(t, C.fire1, false);
  drawFire(t, C.fire2, true);
  drawFire(t, C.fire3, true, C.fizzle);
  drawNet(t);
  drawLateFx(t, dn, ice, car, bf);
  if (inFlyCam) drawFlyToCam(t);
}
function drawExclaim(x, y, a, t) {
  ctx.save(); ctx.translate(x, y); const s = E.back(clamp(a)) * (1 + 0.1 * Math.sin(t * 20)); ctx.scale(s, s);
  ctx.font = '90px Chewy'; ctx.textAlign = 'center'; ctx.lineWidth = 12; ctx.strokeStyle = '#3a2a5a'; ctx.strokeText('!', 0, 0);
  ctx.fillStyle = '#ffde3a'; ctx.fillText('!', 0, 0); ctx.restore();
}
function drawNetAndFx(t, dn, ice, car, bf) {
  // smoke ring cough
  const a = t - C.smokeRing;
  if (a > 0 && a < 2.2 && dn.vis) {
    const o = dinoW(dn, 1000, 200, true);
    ctx.strokeStyle = `rgba(90,90,100,${0.75 * (1 - a / 2.2)})`; ctx.lineWidth = 16 * (1 - a / 3);
    ctx.beginPath(); ctx.ellipse(o[0] + 120 * a, o[1] - 120 * a, 30 + 50 * a, 18 + 30 * a, 0, 0, TAU); ctx.stroke();
  }
  // nostril huffs
  for (const [h0, h1] of [C.huff, [60.6, 62.4], [C.fizzle[1], C.fizzle[1] + 1.4]]) {
    if (t < h0 || t > h1 + 1.5 || !dn.vis) continue;
    const n = dinoW(dn, A.dino.nostril[0], A.dino.nostril[1], true);
    for (let k = 0; k < 8; k++) { const b = h0 + k * (h1 - h0) / 8, age = t - b; if (age < 0 || age > 1.4) continue;
      stamp(TEX.smoke, n[0] + 60 * age + 30, n[1] - 90 * age, 50 + 120 * age, (1 - age / 1.4) * 0.9); }
    ctx.globalAlpha = 1;
  }
}
function drawGlows(t, dn, ice, car) {
  ctx.globalCompositeOperation = 'lighter';
  // dino's glowing eye in the dark
  if (dn.vis && dn.eye > 0.02) {
    const e = dinoW(dn, A.dino.eye[0], A.dino.eye[1], true);
    stamp(TEX.dotR, e[0], e[1], 220 * (0.8 + 0.4 * dn.eye), dn.eye);
    stamp(TEX.dotY, e[0], e[1], 70, dn.eye * 0.9);
  }
  // ice wall cold glow
  if (t >= C.wallA) {
    const g = 0.45 + 0.35 * (fireI(t, C.fire2) + fireI(t, C.fire3)) + 0.2 * Math.sin(t * 2.5);
    ctx.save(); ctx.translate(WX, GY); ctx.scale(WS, WS); ctx.translate(-A.wall.base[0], -A.wall.base[1]);
    const top = (A.wall.base[1]) - clamp(wallRows(t) / A.wall.rows) * (A.wall.base[1] - A.wall.top);
    ctx.beginPath(); ctx.rect(-200, top - 80, 700, 1200); ctx.clip();
    ctx.globalAlpha = clamp(g * 0.7); ctx.drawImage(S.wallGlow, -S.wallGlow.pad, -S.wallGlow.pad); ctx.restore();
    // ice shards bursting as each row pops up
    for (let i = 0; i < A.wall.rows; i++) {
      const t0 = C.wallA + i * C.wallRow, y = GY - (i + 1) / A.wall.rows * (A.wall.base[1] - A.wall.top) * WS;
      sparkleBurst(t, t0, WX, y, 8, 380, 0.7, i % 2 ? 'c' : 'w', i * 9, 44);
    }
  }
  // Ice Man hero aura & rays
  if (ice.vis && ice.aura > 0.01) {
    const c = iceW(ice, 140, 120);
    ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(t * 0.6);
    for (let i = 0; i < 14; i++) {
      ctx.rotate(TAU / 14); ctx.fillStyle = i % 2 ? `rgba(160,235,255,${0.16 * ice.aura})` : `rgba(255,255,255,${0.12 * ice.aura})`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -1100); ctx.lineTo(60, -1100); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    stamp(TEX.dotC, c[0], c[1], 460, ice.aura * 0.45);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(ice.x, GY + ice.y); ctx.rotate(ice.rot); ctx.scale(IS * ice.sx, IS * ice.sy); ctx.translate(-A.ice.foot[0], -A.ice.foot[1]);
    ctx.globalAlpha = ice.aura; drawIceLocal(ice); ctx.restore(); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    const tip = wandTipW(ice); stamp(TEX.star.w, tip[0], tip[1], 120 + 30 * Math.sin(t * 12), ice.aura);
    trail(t, b => wandTipW(iceState(b)), C.heroA, Math.min(t, C.slam + 0.5), 30, 0.8, 'c', 40, 24);
  }
  // slam shockwave of ice
  const sa = t - C.slam;
  if (sa > 0 && sa < 1.4) {
    ctx.strokeStyle = `rgba(200,245,255,${1 - sa / 1.4})`; ctx.lineWidth = 10 * (1 - sa / 1.4);
    ctx.beginPath(); ctx.ellipse(IX - 60, GY + 6, 60 + 700 * E.out(sa / 1.4), 18 + 60 * E.out(sa / 1.4), 0, 0, TAU); ctx.stroke();
    sparkleBurst(t, C.slam, IX - 80, GY - 20, 30, 700, 1.2, 'c', 3, 60);
  }
  // police siren
  if (car.vis) {
    const s = carW(car, A.car.siren[0], A.car.siren[1]), red = Math.floor(t * 6) % 2 === 0, pa = party(t);
    const tex = pa > 0.5 ? [TEX.dotP, TEX.dotY, TEX.dotC][Math.floor(t * 6) % 3] : red ? TEX.dotR : TEX.dotC;
    stamp(tex, s[0], s[1], 300 + 60 * Math.sin(t * 24), 0.95);
    stamp(TEX.dotW, s[0], s[1], 44, 0.5);
    ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(t * 7);
    ctx.fillStyle = red ? 'rgba(255,80,80,0.12)' : 'rgba(80,170,255,0.12)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1300, -0.18, 0.18); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawLateFx(t, dn, ice, car, bf) {
  if (dn.vis && dn.flag > 0.01) {     // the white flag stays bright white, in front of the net
    ctx.save(); ctx.translate(dn.x, GY + dn.y); ctx.rotate(dn.rot); ctx.scale(DS * dn.sx, DS * dn.sy); ctx.translate(-A.dino.foot[0], -A.dino.foot[1]);
    drawFlag(dn, t); ctx.restore();
  }
  drawTears(t, dn);
  if (dn.vis) { const b = dinoW(dn, 900, -40, true); drawBubble(t, b[0] + 120, b[1], 'Sorry!'); }
  ctx.globalCompositeOperation = 'lighter';
  // magic sparkle on landing & when the butterfly touches the dino's nose
  sparkleBurst(t, C.land, 2162, 712, 26, 420, 1.2, 'y', 2, 50);
  sparkleBurst(t, C.blush, 640, 340, 40, 600, 1.6, 'p', 4, 60);
  // ice man arrival glitter + snow
  if (ice.vis && t < C.skateB + 0.3) trail(t, b => iceW(iceState(b), 140, 230), C.skateA, Math.min(t, C.skateB), 40, 1.0, 'c', 40, 40);
  // finale sparkles everywhere
  if (party(t) > 0) for (let i = 0; i < 6; i++) sparkleBurst(t, C.partyA + 0.4 + i * 2.2, 300 + hash(i * 4) * 1700, 250 + hash(i * 9) * 400, 24, 520, 1.6, ['y', 'p', 'c'][i % 3], i * 13, 54);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // heart burst when the butterfly kisses the dino's nose
  heartBurst(t, C.blush, 640, 330, 12, 2);
  if (t > C.blush && t < C.partyA + 6) heartsUp(t, C.blush + 0.4, C.partyA + 4, dinoW(dn, 700, -60, true)[0], dinoW(dn, 700, -60, true)[1], 2.2, 5, 0.9, 120);
  // snow (screen space) while Ice Man is around
  const sn = env(t, C.iceA, 79.0, 1.0, 2.0);
  if (sn > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 70; i++) {
      const d = 0.5 + hash(i * 3.3) * 0.8, x = ((hash(i) * W * 1.2 + Math.sin(t * 0.8 + i) * 40 - CAMX * 0.25 * d) % (W + 80) + W + 80) % (W + 80) - 40;
      const y = ((hash(i * 7.7) * H + t * 90 * d) % (H + 80)) - 40;
      stamp(TEX.flake, x, y, 26 * d, sn * 0.85);
    }
    ctx.globalAlpha = 1;
  }
  // confetti of her hearts & flowers
  const cf = env(t, C.partyA + 0.2, C.outroA + 0.5, 0.3, 1.0);
  if (cf > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const imgs = [S.heart.c, S.heart2.c, S.flower_pink.c, S.flower_orange.c, S.flower_red.c, S.flower_orange2.c];
    for (let i = 0; i < 64; i++) {
      const t0 = C.partyA + hash(i * 1.9) * 3, a = t - t0; if (a < 0) continue;
      const sp = 140 + 120 * hash(i * 4.4), y = -80 + ((a * sp) % (H + 160)), x = hash(i * 8.8) * W + 60 * Math.sin(a * 1.5 + i);
      const img = imgs[i % imgs.length], s = (i % imgs.length < 2 ? 0.9 : 0.55) * (0.8 + 0.4 * hash(i));
      ctx.save(); ctx.globalAlpha = cf; ctx.translate(x, y); ctx.rotate(a * (1 + hash(i)) * 2); ctx.scale(s * Math.cos(a * 3 + i), s);
      ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
    }
  }
  // lightning
  const lt = [[30.2, 0.4], [C.lightning, 1], [36.0, 0.5], [45.4, 0.35]];
  for (const [t0, k] of lt) {
    const a = t - t0; if (a < 0 || a > 0.45) continue;
    const fl = k * (a < 0.06 ? 1 : a < 0.12 ? 0.3 : a < 0.18 ? 0.8 : Math.max(0, 1 - (a - 0.18) / 0.27) * 0.5);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (k >= 1) {
      const pts = []; let x = 520, y = -40; const r = rng(5);
      while (y < 560) { pts.push([x, y]); x += (r() - 0.45) * 120; y += 50 + r() * 50; }
      ctx.globalCompositeOperation = 'lighter';
      crayon(ctx, pts, `rgba(255,250,200,${fl})`, 22, 3); crayon(ctx, pts, `rgba(255,255,255,${fl})`, 8, 4);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = `rgba(255,255,240,${0.75 * fl})`; ctx.fillRect(0, 0, W, H);
  }
}
function drawFlyToCam(t) {
  const p = inv(C.flyToCam, C.outroA, t);
  const st = bflyState(C.flyToCam);
  setLayer(1);
  const [sx, sy] = toScreen(st.x, st.y);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const e = E.in(p);
  const x = lerp(sx, W / 2, E.io(clamp(p * 1.4))), y = lerp(sy, H / 2, E.io(clamp(p * 1.4)));
  const s = st.s * CAMZ * (1 + e * 28);
  drawButterfly({ x, y, s, rot: 0.15 * Math.sin(t * 3) * (1 - e), flap: 0.5 + 0.5 * Math.sin(t * TAU * (6 - 3 * e)) }, false);
}

// ------------------------------------------------------------------ INTRO & OUTRO (on the real drawing)
const PAGE_CHARS = ['tree', 'icewall', 'police', 'iceman', 'butterfly', 'dino'];
function pageXY(name) { const s = S[name === 'iceman' ? 'iceman_body' : name]; return [(s.ox - 30) * PS, (s.oy - 300) * PS + 0.5]; }
function drawPageChar(name, t, lift, idle, x, y, scl, spin = 0, colour = null) {
  const s = S[name === 'iceman' ? 'iceman_body' : name], w = s.w, h = s.h;
  ctx.save(); ctx.translate(x + w * PS / 2, y + h * PS / 2); ctx.rotate(spin); ctx.scale(PS * scl * (1 + 0.07 * lift), PS * scl * (1 + 0.07 * lift)); ctx.translate(-w / 2, -h / 2 - 14 * lift);
  if (lift > 0.01) {
    const sh = name === 'iceman' ? S.iceman_body.sh : S[name].sh;
    if (name !== 'butterfly') { ctx.globalAlpha = 0.4 * clamp(lift); ctx.drawImage(sh, -sh.pad + 8 + 10 * lift, -sh.pad + 14 + 16 * lift); ctx.globalAlpha = 1; }
  }
  const raw = { dino: 'dino_raw', butterfly: 'butterfly_raw', tree: 'tree_raw' }[name];
  const col = colour ?? clamp(lift);
  if (raw && col < 1) { ctx.drawImage(S[raw].c, 0, 0); if (col <= 0) { ctx.restore(); return; } ctx.globalAlpha = col; }
  if (name === 'dino') {
    drawDinoLocal({ head: -0.04 * idle * (0.5 + 0.5 * Math.sin(t * 3)), dark: 0, ice: 0, blush: 0 });
  } else if (name === 'butterfly') drawButterflyLocal(idle * (0.5 + 0.5 * Math.sin(t * 9)));
  else if (name === 'iceman') drawIceLocal({ wand: idle * 0.2 * Math.sin(t * 4) });
  else if (name === 'police') {
    drawCarLocal({ turret: 0, wheel: 0 });
    if (idle > 0) { ctx.globalCompositeOperation = 'lighter'; stamp(Math.floor(t * 6) % 2 ? TEX.dotR : TEX.dotC, A.car.siren[0], A.car.siren[1], 110, idle * 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  } else if (name === 'icewall') drawWallLocal(A.wall.rows, t, 0);
  else if (name === 'tree') { ctx.translate(A.tree.base[0], A.tree.base[1]); ctx.transform(1, 0, -0.03 * idle * Math.sin(t * 2), 1, 0, 0); ctx.translate(-A.tree.base[0], -A.tree.base[1]); ctx.drawImage(S.tree.c, 0, 0); }
  ctx.globalAlpha = 1;
  ctx.restore();
}
let maskC;
function drawIntro(t) {
  // gentle push-in, then a dive into the butterfly
  const bc = [(S.butterfly.ox - 30 + A.bfly.c[0]) * PS, (S.butterfly.oy - 300 + A.bfly.c[1]) * PS];
  const dive = E.in(inv(C.diveA, C.world, t));
  const z = (1 + 0.05 * E.sine(inv(0, C.diveA, t))) * (1 + dive * 7);
  const f = mixv([W / 2, H / 2], bc, E.io(inv(C.diveA - 0.4, C.diveA + 0.9, t)));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(z, 0, 0, z, W / 2 - f[0] * z, H / 2 - f[1] * z);
  const allLift = t >= C.lift.tree - 0.1;
  if (!allLift) {
    ctx.drawImage(IMG.photo, 0, 0);
    // a magic star sweeps across and "cleans up" the page as it goes
    if (t > C.starA) {
      if (!maskC) maskC = mk(W, H);
      const g = maskC.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      for (let b = C.starA; b <= Math.min(t, C.starB + 0.3); b += 0.02) { const [x, y] = starPath(b); g.drawImage(TEX.dotW, x - 380, y - 380, 760, 760); }
      if (t > C.starB) { g.globalAlpha = E.io(inv(C.starB, C.starB + 0.3, t)); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      g.globalCompositeOperation = 'source-in'; g.drawImage(IMG.page, 0, 0);
      ctx.drawImage(maskC, 0, 0);
    }
  } else {
    ctx.drawImage(IMG.page_blank, 0, 0);
    for (const n of PAGE_CHARS) {
      const L = C.lift[n], lift = E.back(inv(L, L + 0.5, t)), idle = inv(L + 0.3, L + 1.0, t);
      const [x, y] = pageXY(n);
      drawPageChar(n, t, lift, idle, x, y, 1);
      if (n === 'dino') {   // her flames flicker at the dino's mouth
        const fo = [(S.fire_fill.ox - 30) * PS, (S.fire_fill.oy - 300) * PS];
        ctx.save(); ctx.translate(fo[0], fo[1] + A.fire.o[1] * PS); ctx.scale(PS * (1 + 0.08 * idle * Math.sin(t * 20)), PS * (1 + 0.06 * idle * Math.sin(t * 15)));
        ctx.drawImage(S.fire, 0, -A.fire.o[1]); ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const n of PAGE_CHARS) { const [x, y] = pageXY(n), s = S[n === 'iceman' ? 'iceman_body' : n]; sparkleBurst(t, C.lift[n], x + s.w * PS / 2, y + s.h * PS / 2, 18, 420, 1.0, ['y', 'p', 'c', 'w'][PAGE_CHARS.indexOf(n) % 4], 5 + PAGE_CHARS.indexOf(n), 40); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  if (t > C.starA && t < C.starB + 0.8) {      // the star itself
    ctx.globalCompositeOperation = 'lighter';
    trail(t, starPath, C.starA, Math.min(t, C.starB), 60, 0.9, 'y', 50, 50);
    if (t < C.starB) { const [x, y] = starPath(t); stamp(TEX.dotY, x, y, 320, 0.9); stamp(TEX.star.w, x, y, 150 + 20 * Math.sin(t * 30), 1); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // fade from black
  if (t < 0.9) { ctx.fillStyle = `rgba(0,0,0,${1 - E.sine(t / 0.9)})`; ctx.fillRect(0, 0, W, H); }
}
function starPath(t) { return path([[C.starA, -150, 420], [2.0, 420, 220], [2.5, 900, 640], [2.9, 1400, 260], [C.starB, 2100, 520]], t); }
function drawOutro(t) {
  const z = 1.06 - 0.06 * E.out(inv(C.outroA, C.outroA + 3, t));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(z, 0, 0, z, W / 2 - W / 2 * z, H / 2 - H / 2 * z);
  ctx.drawImage(IMG.page_blank, 0, 0);
  PAGE_CHARS.forEach((n, i) => {
    const land = C.outroA + 0.6 + i * 0.28, p = E.out(inv(C.outroA, land, t));
    const [x, y] = pageXY(n), ang = hash(i * 5.5) * TAU, d = 1500 * (1 - p);
    const lift = 1 - E.back(inv(land, land + 0.5, t)) * 0.6;
    drawPageChar(n, t, lift, 1, x + Math.cos(ang) * d, y + Math.sin(ang) * d - 300 * Math.sin(Math.PI * p), 1 + (1 - p) * 0.6, (1 - p) * 2.5 * (i % 2 ? 1 : -1), 1);
    ctx.globalCompositeOperation = 'lighter'; const s = S[n === 'iceman' ? 'iceman_body' : n];
    sparkleBurst(t, land, x + s.w * PS / 2, y + s.h * PS / 2, 16, 380, 1.0, ['y', 'p', 'c', 'w'][i % 4], 30 + i, 40);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  });
  // where the fire used to be, hearts float up instead
  const fx = (S.fire_fill.ox - 30) * PS + 60, fy = (S.fire_fill.oy - 300) * PS + 80;
  heartsUp(t, C.outroA + 2.4, C.END, fx, fy, 2.5, 21, 0.45, 80);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ------------------------------------------------------------------ TEXT (screen space)
const SUB = ARTIST ? `Drawn by ${ARTIST}` : 'From a drawing by our little artist';
const TEXTS = [
  { s: 'The Butterfly Garden', a: C.title, b: C.diveA + 0.6, x: 960, y: 120, size: 124, style: 'title' },
  { s: SUB, a: C.title + 0.8, b: C.diveA + 0.4, x: 960, y: 1012, size: 50, style: 'sub', heart: true },
  { s: 'Uh-oh!', a: 26.15, b: 27.5, x: 1300, y: 260, size: 120, style: 'boom' },
  { s: 'BOOM!', a: 27.8, b: 28.7, x: 560, y: 240, size: 150, style: 'boom' },
  { s: 'BOOM!', a: 29.6, b: 30.5, x: 1380, y: 230, size: 170, style: 'boom' },
  { s: 'ROAR!', a: 34.15, b: 36.6, x: 960, y: 200, size: 250, style: 'boom', shake: 1 },
  { s: 'WHOOSH!', a: 39.7, b: 41.9, x: 1220, y: 210, size: 180, style: 'fire' },
  { s: 'Oh no!', a: 42.4, b: 44.2, x: 1500, y: 250, size: 120, style: 'boom' },
  { s: 'ICE MAN!', a: 51.3, b: 53.1, x: 960, y: 170, size: 190, style: 'ice' },
  { s: 'SIZZLE!', a: 54.15, b: 56.2, x: 820, y: 190, size: 160, style: 'ice', shake: 0.5 },
  { s: 'Wee-woo! Wee-woo!', a: 61.6, b: 63.8, x: 960, y: 170, size: 130, style: 'siren' },
  { s: '3', a: C.count[0], b: C.count[0] + 0.75, x: 960, y: 330, size: 300, style: 'count' },
  { s: '2', a: C.count[1], b: C.count[1] + 0.75, x: 960, y: 330, size: 300, style: 'count' },
  { s: '1', a: C.count[2], b: C.count[2] + 0.75, x: 960, y: 330, size: 300, style: 'count' },
  { s: 'GO!', a: C.launch, b: C.launch + 1.2, x: 960, y: 260, size: 240, style: 'boom' },
  { s: 'GOTCHA!', a: C.netLand + 0.05, b: C.netLand + 2.3, x: 960, y: 190, size: 220, style: 'ice', shake: 0.6 },
  { s: 'Waaah!', a: 80.8, b: 83.4, x: 1300, y: 210, size: 180, style: 'cry' },
  { s: 'HOORAY!', a: C.partyA + 0.1, b: C.partyA + 3.2, x: 960, y: 190, size: 240, style: 'happy' },
  { s: 'The End', a: C.theEnd, b: C.END + 1, x: 960, y: 128, size: 150, style: 'title' },
  { s: SUB, a: C.theEnd + 0.8, b: C.END + 1, x: 960, y: 1012, size: 50, style: 'sub', heart: true },
];
const STYLE = {
  title: { fill: ['#ff7ac3', '#ffb24a'], line: '#ffffff', edge: '#5a2a7a', font: 'Chewy' },
  boom: { fill: ['#fff26a', '#ff9a2a'], line: '#ffffff', edge: '#4a1f6a', font: 'Chewy' },
  fire: { fill: ['#ffe45a', '#ff4a2a'], line: '#fff6d8', edge: '#5a1010', font: 'Chewy' },
  ice: { fill: ['#ffffff', '#7fd8ff'], line: '#ffffff', edge: '#1a4aa8', font: 'Chewy' },
  siren: { fill: ['#ff5a5a', '#5aaaff'], line: '#ffffff', edge: '#1a1a4a', font: 'Chewy' },
  count: { fill: ['#ffffff', '#ffd84a'], line: '#ffffff', edge: '#d0306a', font: 'Chewy' },
  cry: { fill: ['#e6f8ff', '#6ac8ff'], line: '#ffffff', edge: '#2a4a9a', font: 'Chewy' },
  happy: { fill: null, line: '#ffffff', edge: '#5a2a7a', font: 'Chewy' },
  sub: { fill: ['#ffffff', '#fff2fa'], line: null, edge: '#5a2a7a', font: 'Fredoka' },
};
const RAINBOW = ['#ff5a5a', '#ffa23a', '#ffd23a', '#5ad66a', '#4ab4ff', '#9a6aff', '#ff6ac8'];
function drawTexts(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const tx of TEXTS) {
    if (t < tx.a || t > tx.b) continue;
    const st = STYLE[tx.style], age = t - tx.a, out = 1 - E.in(inv(tx.b - 0.35, tx.b, t));
    ctx.font = `${tx.style === 'sub' ? '600 ' : ''}${tx.size}px ${st.font}`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    const chars = [...tx.s], widths = chars.map(c => ctx.measureText(c).width), total = widths.reduce((a, b) => a + b, 0);
    let x = tx.x - total / 2 - (tx.heart ? 36 : 0);
    chars.forEach((ch, i) => {
      const d = tx.style === 'sub' ? 0 : i * 0.045, p = clamp((age - d) / 0.55);
      if (p <= 0) { x += widths[i]; return; }
      const sc = (tx.style === 'sub' ? E.out(p) : E.elastic(p)) * out;
      const wob = tx.style === 'sub' ? 0 : Math.sin(t * 5 + i * 0.7) * tx.size * 0.04;
      let sx = 0, sy = 0; if (tx.shake) { sx = noise1(t * 30 + i * 10) * 9 * tx.shake; sy = noise1(t * 33 + i * 7) * 9 * tx.shake; }
      const cx = x + widths[i] / 2 + sx, cy = tx.y + wob + sy;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 4 + i) * 0.06 * (tx.style === 'sub' ? 0 : 1)); ctx.scale(sc, sc);
      const fill = st.fill ? (() => { const g = ctx.createLinearGradient(0, -tx.size / 2, 0, tx.size / 2); g.addColorStop(0, st.fill[0]); g.addColorStop(1, st.fill[1]); return g; })() : RAINBOW[i % RAINBOW.length];
      const fillUse = tx.style === 'siren' ? (Math.floor(t * 6) % 2 ? '#ff5a5a' : '#5aaaff') : fill;
      ctx.lineWidth = tx.size * 0.2; ctx.strokeStyle = st.edge; ctx.strokeText(ch, -widths[i] / 2 + tx.size * 0.03, tx.size * 0.06);
      ctx.strokeText(ch, -widths[i] / 2, 0);
      if (st.line) { ctx.lineWidth = tx.size * 0.09; ctx.strokeStyle = st.line; ctx.strokeText(ch, -widths[i] / 2, 0); }
      ctx.fillStyle = fillUse; ctx.fillText(ch, -widths[i] / 2, 0);
      ctx.restore();
      x += widths[i];
    });
    if (tx.heart) {
      const s = E.back(clamp((age - 0.6) / 0.5)) * out * (1 + 0.1 * Math.sin(t * 6));
      ctx.save(); ctx.translate(x + 56, tx.y); ctx.scale(s * 2.0, s * 2.0); ctx.drawImage(S.heart.c, -S.heart.w / 2, -S.heart.h / 2); ctx.restore();
    }
  }
}

// ------------------------------------------------------------------ FRAME
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (t < C.world) drawIntro(t);
  else if (t < C.outroA) drawWorld(t);
  else drawOutro(t);
  drawTexts(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // white flashes between the drawing and the world
  const fl = Math.max(env(t, C.world - 0.45, C.world + 0.55, 0.45, 0.55), env(t, C.outroA - 0.7, C.outroA + 0.6, 0.7, 0.6));
  if (fl > 0) { ctx.fillStyle = `rgba(255,252,240,${fl})`; ctx.fillRect(0, 0, W, H); }
  // storybook paper grain + vignette
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55; ctx.drawImage(TEX.grain, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(TEX.vignette, 0, 0);
  const end = inv(C.fadeOut, C.END - 0.2, t);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${E.sine(end)})`; ctx.fillRect(0, 0, W, H); }
}
