// Decorative art for the deck, rendered with Chromium. No text is baked into any of it:
// every label, number and pin that sits on these visuals is a native, editable PowerPoint object.
//   node make_visuals.mjs <assetsDir>
// Writes v2 backgrounds and hero visuals into <assetsDir>, plus visuals.json with the
// geometry the deck needs to place native objects on top (pins, nodes, layers).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { Frame } from '../isms-mvp-figma/lib/svg.mjs';
import { camera, clayAirport } from '../isms-mvp-figma/lib/clay.mjs';
import { TERMINALS } from '../isms-mvp-figma/lib/twin.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'assets');
fs.mkdirSync(OUT, { recursive: true });
const GEO = {};

const browser = await chromium.launch();
async function shoot(html, file, w = 2560, h = 1440, o = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: o.dsf || 1 });
  const tmp = path.join(OUT, '_visual.html');
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.waitForTimeout(o.wait || 300);
  const png = file.endsWith('.png');
  await page.screenshot({ path: file, type: png ? 'png' : 'jpeg', quality: png ? undefined : (o.q || 90), omitBackground: !!o.transparent });
  await page.close();
  console.log('visual', path.basename(file));
}
const fileUrl = p => 'file://' + path.resolve(p);
// seeded random so every build is identical
const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// film grain so large gradients don't band in JPEG
const NOISE = (op = 0.06) => `<canvas id="n" style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:overlay;opacity:${op}"></canvas>
<script>{const c=document.getElementById('n');c.width=innerWidth;c.height=innerHeight;const x=c.getContext('2d'),d=x.createImageData(c.width,c.height);let s=97;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<d.data.length;i+=4){const v=128+(r()-.5)*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0)}</script>`;
const doc = (body, o = {}) => `<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${o.transparent ? 'transparent' : '#04060C'}}.f{position:absolute;inset:0}</style></head><body>${body}${o.noise === false ? '' : NOISE(o.noiseOp)}</body></html>`;

// ---------- building blocks ----------
const BASE = 'linear-gradient(180deg,#060A15 0%,#04060C 60%,#03050A 100%)';
// perspective floor grid that fades into the horizon (y = horizon in px, 2560x1440 canvas)
function floor(horizon = 1010, op = 0.10, col = '120,160,255') {
  let s = `<svg class="f" viewBox="0 0 2560 1440" preserveAspectRatio="none"><defs>
    <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
    <mask id="fm"><rect x="0" y="${horizon}" width="2560" height="${1440 - horizon}" fill="url(#fl)"/></mask></defs><g mask="url(#fm)" stroke="rgb(${col})" stroke-opacity="${op}" stroke-width="1.5" fill="none">`;
  const vx = 1280;
  for (let i = -40; i <= 40; i++) s += `<line x1="${vx + i * 18}" y1="${horizon}" x2="${vx + i * 260}" y2="1440"/>`;
  for (let k = 1; k <= 18; k++) { const t = Math.pow(k / 18, 2.2); const y = horizon + t * (1440 - horizon); s += `<line x1="0" y1="${y.toFixed(1)}" x2="2560" y2="${y.toFixed(1)}"/>`; }
  return s + '</g></svg>';
}
// soft glow blobs: [x, y, w, h, colour, opacity]
const glows = (list, blur = 160) => `<div class="f" style="filter:blur(${blur}px)">${list.map(([x, y, w, h, c, o]) =>
  `<div style="position:absolute;left:${x - w / 2}px;top:${y - h / 2}px;width:${w}px;height:${h}px;border-radius:50%;background:${c};opacity:${o}"></div>`).join('')}</div>`;
// a thin horizon light line
const horizonLine = (y, x0 = 0, x1 = 2560, c = '182,156,255', o = 0.5) => `<div style="position:absolute;left:${x0}px;top:${y}px;width:${x1 - x0}px;height:2px;background:linear-gradient(90deg,rgba(${c},0),rgba(${c},${o}) 50%,rgba(${c},0));box-shadow:0 0 24px 4px rgba(${c},${o * 0.5})"></div>`;
// faint HUD frame: L-ticks in the four corners, like a camera viewfinder
const hud = (op = 0.16) => { const i = 58, a = 40; const c = [[i, i, 1, 1], [2560 - i, i, -1, 1], [i, 1440 - i, 1, -1], [2560 - i, 1440 - i, -1, -1]];
  return `<svg class="f" viewBox="0 0 2560 1440"><g stroke="#FFFFFF" stroke-opacity="${op}" stroke-width="2.5" fill="none">${c.map(([x, y, sx, sy]) => `<path d="M${x} ${y + sy * a}V${y}H${x + sx * a}"/>`).join('')}</g></svg>`; };
const vignette = (o = 0.55) => `<div class="f" style="background:radial-gradient(ellipse 85% 85% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,${o}) 100%)"></div>`;

// ---------- 1) backgrounds ----------
// content slides: quiet, glow top-left behind the title, violet low right, dot matrix on the right edge
await shoot(doc(`<div class="f" style="background:${BASE}"></div>
  ${glows([[300, -120, 1900, 900, '#2D5BFF', 0.30], [2350, 1500, 1700, 1000, '#7C4DFF', 0.26], [1500, 1600, 1600, 500, '#2D5BFF', 0.12]])}
  ${floor(1230, 0.06)}${vignette(0.5)}${hud()}`), path.join(OUT, 'bg2_content.jpg'));
// scene slides: a pool of light behind the product screen
for (const [name, cx] of [['bg2_scene_r', 1840], ['bg2_scene_l', 720]]) {
  await shoot(doc(`<div class="f" style="background:${BASE}"></div>
    ${glows([[cx, 760, 2000, 1250, '#2D5BFF', 0.24], [cx + (cx > 1280 ? 500 : -500), 260, 1000, 700, '#8A5CF6', 0.22], [2560 - cx, 1500, 1500, 700, '#2D5BFF', 0.10]])}
    ${floor(1180, 0.07)}${vignette(0.5)}${hud()}`), path.join(OUT, name + '.jpg'));
}
// section divider: cinematic aurora over a perspective floor and a horizon line
await shoot(doc(`<div class="f" style="background:${BASE}"></div>
  ${glows([[1700, 1040, 1900, 900, '#2D5BFF', 0.55], [2050, 760, 1300, 820, '#8A5CF6', 0.50], [2350, 470, 900, 620, '#B69CFF', 0.26]], 170)}
  ${floor(1010, 0.16)}${horizonLine(1009, 300, 2560, '200,185,255', 0.55)}
  <div class="f" style="background:linear-gradient(90deg,rgba(4,6,12,.94) 0%,rgba(4,6,12,.6) 40%,rgba(4,6,12,0) 70%)"></div>${vignette(0.45)}`), path.join(OUT, 'bg3_section.jpg'));
// cover: aurora only (the alarms-to-answer beam sits on the slide as viz_cover.png)
await shoot(doc(`<div class="f" style="background:${BASE}"></div>
  ${glows([[290, 150, 2300, 1300, '#2D5BFF', 0.20], [2230, 710, 1700, 1500, '#8A5CF6', 0.18], [2320, 720, 770, 770, '#B69CFF', 0.10]], 150)}
  ${floor(1095, 0.06)}${horizonLine(1075, 900, 2560, '182,156,255', 0.25)}
  <div class="f" style="background:linear-gradient(90deg,rgba(4,6,12,.85) 0%,rgba(4,6,12,.5) 30%,rgba(4,6,12,0) 50%)"></div>${vignette(0.45)}${hud()}`), path.join(OUT, 'bg3_cover.jpg'));
// map slide: glow where the airport sits
await shoot(doc(`<div class="f" style="background:${BASE}"></div>
  ${glows([[1720, 840, 2000, 1100, '#2D5BFF', 0.26], [2400, 120, 1000, 700, '#8A5CF6', 0.20], [300, 1400, 1300, 600, '#2D5BFF', 0.10]])}
  ${vignette(0.5)}${hud()}`), path.join(OUT, 'bg2_map.jpg'));

// photo backgrounds from the previous deck: defocused (cinematic depth of field, and no legible
// on-screen words or numbers left), with a scrim where the slide's text sits
const OLD = path.join(OUT, 'old');
const photo = (img, blur, scrim, filter = 'brightness(.78) saturate(.9)', fog = []) => doc(`
  <img class="f" src="${fileUrl(path.join(OLD, img))}" style="width:100%;height:100%;object-fit:cover;transform:scale(1.04);filter:${filter} blur(${blur}px)">
  ${fog.map(([x, y, w, h]) => `<div style="position:absolute;left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%;backdrop-filter:blur(34px) brightness(.85);-webkit-mask-image:radial-gradient(ellipse 50% 50% at 50% 50%,#000 60%,transparent 100%)"></div>`).join('')}
  <div class="f" style="background:${scrim}"></div>${vignette(0.45)}`);
await shoot(photo('image1.jpg', 6,
  'linear-gradient(90deg,rgba(4,6,12,.97) 0%,rgba(4,6,12,.9) 32%,rgba(4,6,12,.5) 62%,rgba(4,6,12,.28) 100%),linear-gradient(0deg,rgba(4,6,12,.9) 0%,rgba(4,6,12,0) 40%),radial-gradient(1400px 900px at 85% 30%,rgba(124,77,255,.18),rgba(124,77,255,0) 70%)', undefined,
  [[0.86, 0.06, 0.15, 0.25], [0.62, 0.18, 0.26, 0.17], [0.7, 0.01, 0.17, 0.11]]), path.join(OUT, 'bg2_cover.jpg'));
await shoot(photo('image9.jpg', 8,
  'linear-gradient(90deg,rgba(4,6,12,.97) 0%,rgba(4,6,12,.9) 36%,rgba(4,6,12,.45) 60%,rgba(4,6,12,.4) 100%),linear-gradient(0deg,rgba(4,6,12,.85) 0%,rgba(4,6,12,0) 30%),radial-gradient(1100px 800px at 80% 45%,rgba(215,45,48,.16),rgba(215,45,48,0) 70%)', 'brightness(.8) saturate(.9)',
  [[0.79, 0.08, 0.22, 0.3], [0.55, 0.06, 0.3, 0.32]]), path.join(OUT, 'bg2_problem.jpg'));
await shoot(photo('image28.jpg', 7,
  'linear-gradient(0deg,rgba(4,6,12,.98) 0%,rgba(4,6,12,.9) 38%,rgba(4,6,12,.35) 72%,rgba(4,6,12,.5) 100%),linear-gradient(90deg,rgba(4,6,12,.75) 0%,rgba(4,6,12,0) 65%)', undefined,
  [[0.62, 0.2, 0.26, 0.15], [0.7, 0.01, 0.17, 0.11]]), path.join(OUT, 'bg2_close.jpg'));

// ---------- 2) airport twin: transparent, text-free; pins and labels go on as native objects ----------
{
  const W = 1600, H = 900, P = camera(1000, 470, 9.6, 50, 29);
  const F = new Frame('Twin', W, H);
  let svg = F.render(clayAirport(F, P, { markers: [], grid: false, labels: false, lidar: true, alarmFence: true }));
  const gridF = new Frame('Grid', W, H);
  const gridSvg = gridF.render(clayAirport(gridF, P, { markers: [], grid: true, labels: false, lidar: false, alarmFence: false }).replace(/<g id="Site plate">[\s\S]*$/, '</g>'));
  fs.writeFileSync(path.join(OUT, '_twin.svg'), svg);
  fs.writeFileSync(path.join(OUT, '_twin_grid.svg'), gridSvg);
  await shoot(doc(`<img class="f" src="${fileUrl(path.join(OUT, '_twin_grid.svg'))}" style="width:100%;height:100%;opacity:.5;-webkit-mask-image:radial-gradient(ellipse 46% 50% at 63% 56%,#000 25%,transparent 100%)">
    <img class="f" src="${fileUrl(path.join(OUT, '_twin.svg'))}" style="width:100%;height:100%;filter:drop-shadow(0 30px 60px rgba(45,91,255,.35))">`, { transparent: true, noise: false }),
  path.join(OUT, 'viz_twin.png'), W, H, { dsf: 2, transparent: true });
  // pin geometry, in fractions of the image (so the deck can place it at any size)
  const PINS = [[1, 50, 30.5, 4.5, 'Critical'], [2, 63, 1, 3.6, 'Critical'], [3, 34, 39, 4.5, 'Warning'], [4, 31, 28, 4.5, 'Warning'],
    [5, 19, 36, 4.5, 'Warning'], [6, 66, 29.5, 4.5, 'Info'], [7, 15, 29, 4.5, 'Warning']];
  GEO.twin = {
    aspect: W / H,
    ring: { rx: 1.6 * P.sc / W, ry: 1.6 * P.sc * 0.56 / H },
    pins: PINS.map(([n, X, Y, h, sev]) => { const [bx, by] = P(X, Y, 0), [hx, hy] = P(X, Y, h); return { n, sev, base: [bx / W, by / H], head: [hx / W, hy / H] }; }),
    labels: TERMINALS.map(t => { const [lx, ly] = P(t.labLeft ? t.x1 + 0.5 : t.x2 - 2.5, t.y1, t.h + 0.4); return { id: t.id, at: [(lx + 14) / W, (ly - 18) / H] }; }),
  };
}

// ---------- 3) alarm field: 1,248 raw alarms on the left condense into 7 incidents on the right ----------
{
  const W = 2400, H = 1100, R = rng(4242);
  const nodes = [[0.86, 0.12, '#D72D30'], [0.86, 0.24, '#D72D30'], [0.86, 0.38, '#D4B741'], [0.86, 0.50, '#D4B741'], [0.86, 0.62, '#D4B741'], [0.86, 0.75, '#4DAFBE'], [0.86, 0.88, '#D4B741']];
  const pts = [];
  for (let i = 0; i < 1248; i++) {
    // gaussian-ish cloud centred left
    const u = (R() + R() + R()) / 3, v = (R() + R() + R()) / 3;
    const x = 0.04 + u * 0.52, y = 0.06 + v * 0.88;
    const k = R();
    const col = k < 0.05 ? '#D72D30' : k < 0.17 ? '#D4B741' : k < 0.25 ? '#4DAFBE' : '#7F8CA8';
    pts.push([x, y, col, R()]);
  }
  const js = `const W=${W},H=${H},P=${JSON.stringify(pts)},N=${JSON.stringify(nodes)};
  const c=document.getElementById('c');c.width=W;c.height=H;const x=c.getContext('2d');
  // streams: a share of the alarms flow to their incident
  x.lineCap='round';
  P.forEach((p,i)=>{ if(p[3]>0.16) return; const n=N[i%N.length]; const sx=p[0]*W, sy=p[1]*H, ex=n[0]*W, ey=n[1]*H;
    const g=x.createLinearGradient(sx,sy,ex,ey); g.addColorStop(0,'rgba(140,160,220,0)'); g.addColorStop(.55,'rgba(150,140,255,.16)'); g.addColorStop(1,n[2]+'77');
    x.strokeStyle=g; x.lineWidth=1.8; x.beginPath(); x.moveTo(sx,sy); x.bezierCurveTo(sx+(ex-sx)*.55,sy,ex-(ex-sx)*.35,ey,ex,ey); x.stroke(); });
  // the alarm dots
  P.forEach(p=>{ x.beginPath(); x.fillStyle=p[2]; x.globalAlpha=p[2]==='#7F8CA8'?0.6:0.95; x.arc(p[0]*W,p[1]*H,p[2]==='#7F8CA8'?5:6.5,0,7); x.fill(); });
  x.globalAlpha=1;
  // incident nodes: glow, ring, core
  N.forEach(n=>{ const cx=n[0]*W, cy=n[1]*H; const g=x.createRadialGradient(cx,cy,0,cx,cy,84); g.addColorStop(0,n[2]+'AA'); g.addColorStop(1,n[2]+'00');
    x.fillStyle=g; x.beginPath(); x.arc(cx,cy,84,0,7); x.fill();
    x.strokeStyle=n[2]; x.lineWidth=4; x.beginPath(); x.arc(cx,cy,38,0,7); x.stroke();
    x.fillStyle=n[2]; x.beginPath(); x.arc(cx,cy,24,0,7); x.fill(); });`;
  await shoot(doc(`<canvas id="c" style="position:absolute;inset:0;width:100%;height:100%"></canvas><script>${js}</script>`, { transparent: true, noise: false }),
    path.join(OUT, 'viz_alarms.png'), W, H, { transparent: true });
  GEO.alarms = { aspect: W / H, nodes: nodes.map(([x, y, c]) => [x, y]) };
}

// ---------- 4) full-slide overlays in slide coordinates (2560x1440 = 13.333x7.5 in, 192 px/in) ----------
const IN = 192;
const slideSvg = inner => `<svg class="f" viewBox="0 0 2560 1440" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

// platform: four isometric glass plates, data rising from the systems to the people who use them
{
  const cx = 3.3 * IN, a = 2.1 * IN, b = 0.5 * IN, th = 10;
  const LAYERS = [[2.2, '#4D8DFF'], [3.15, '#B69CFF'], [4.1, '#8FB4FF'], [5.05, '#8C97B3']]; // top → bottom
  const R = rng(777);
  let defs = '', body = '';
  // light beams through the stack
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9, x = cx - a * 0.55 + t * a * 1.1 + (R() - 0.5) * 30;
    body += `<line x1="${x}" y1="${2.2 * IN}" x2="${x}" y2="${5.05 * IN}" stroke="url(#beam)" stroke-width="${2 + R() * 2.5}" opacity="${0.45 + R() * 0.45}"/>`;
  }
  defs += `<linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="0" y1="${5.05 * IN}" x2="0" y2="${2.2 * IN}"><stop offset="0" stop-color="#8C97B3" stop-opacity="0"/><stop offset=".5" stop-color="#B69CFF" stop-opacity=".9"/><stop offset="1" stop-color="#4D8DFF" stop-opacity="0"/></linearGradient>`;
  // draw bottom plate first
  [...LAYERS].reverse().forEach(([yIn, col], k) => {
    const cy = yIn * IN, id = 'p' + k;
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".34"/><stop offset="1" stop-color="${col}" stop-opacity=".06"/></linearGradient>
      <filter id="g${k}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>`;
    const top = `${cx - a},${cy} ${cx},${cy - b} ${cx + a},${cy} ${cx},${cy + b}`;
    // glow under the plate, side faces, top face, edge highlight
    body += `<polygon points="${top}" fill="${col}" opacity=".35" filter="url(#g${k})"/>`;
    body += `<polygon points="${cx - a},${cy} ${cx},${cy + b} ${cx},${cy + b + th} ${cx - a},${cy + th}" fill="${col}" opacity=".45"/>`;
    body += `<polygon points="${cx},${cy + b} ${cx + a},${cy} ${cx + a},${cy + th} ${cx},${cy + b + th}" fill="${col}" opacity=".3"/>`;
    body += `<polygon points="${top}" fill="url(#${id})" stroke="${col}" stroke-opacity=".9" stroke-width="2.2"/>`;
    // surface grid
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      body += `<line x1="${cx - a + t * a}" y1="${cy - t * b}" x2="${cx + t * a}" y2="${cy + b - t * b}" stroke="${col}" stroke-opacity=".18" stroke-width="1.2"/>`;
      body += `<line x1="${cx - a + t * a}" y1="${cy + t * b}" x2="${cx + t * a}" y2="${cy - b + t * b}" stroke="${col}" stroke-opacity=".18" stroke-width="1.2"/>`;
    }
    // nodes on the surface
    for (let i = 0; i < 7; i++) {
      const u = 0.2 + R() * 0.6, v = 0.2 + R() * 0.6;
      const px = cx - a + (u + v) * a, py = cy + (v - u) * b;
      body += `<circle cx="${px}" cy="${py}" r="16" fill="${col}" opacity=".25"/><circle cx="${px}" cy="${py}" r="6.5" fill="#FFFFFF" opacity=".9"/>`;
    }
  });
  await shoot(doc(slideSvg(`<defs>${defs}</defs>${body}`), { transparent: true, noise: false }), path.join(OUT, 'viz_stack.png'), 2560, 1440, { transparent: true });
  GEO.stack = { cx: cx / IN, a: a / IN, b: b / IN, layers: LAYERS.map(l => l[0]) };
}

// how it works: a signal path through the six steps, HUD rings behind each step, green once a person approves
{
  const y = 2.75 * IN, xs = [0, 1, 2, 3, 4, 5].map(i => (1.55 + i * 2.0466) * IN), R = rng(99);
  let b = `<defs><linearGradient id="sig" gradientUnits="userSpaceOnUse" x1="${xs[0]}" y1="0" x2="${xs[4]}" y2="0"><stop offset="0" stop-color="#4D8DFF" stop-opacity=".45"/><stop offset=".6" stop-color="#7C8CFF"/><stop offset="1" stop-color="#B69CFF"/></linearGradient>
    <filter id="bl" filterUnits="userSpaceOnUse" x="0" y="0" width="2560" height="1440"><feGaussianBlur stdDeviation="9"/></filter>
    <radialGradient id="hal"><stop offset="0" stop-color="#B69CFF" stop-opacity=".5"/><stop offset="1" stop-color="#B69CFF" stop-opacity="0"/></radialGradient></defs>`;
  const seg = (x0, x1, stroke) => `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${stroke}" stroke-width="12" stroke-opacity=".5" filter="url(#bl)"/><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${stroke}" stroke-width="3.5"/>`;
  b += seg(xs[0], xs[4], 'url(#sig)') + seg(xs[4], xs[5], '#2ED47A');
  // HUD ring behind each disc: tick ring plus two bright arcs at seeded angles
  for (const [k, cx] of xs.entries()) {
    const r = 0.72 * IN;
    b += `<circle cx="${cx}" cy="${y}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="1.5"/>`;
    for (let a = 0; a < 72; a++) {
      const t = a / 72 * Math.PI * 2, l = a % 6 === 0 ? 10 : 5;
      b += `<line x1="${cx + Math.cos(t) * r}" y1="${y + Math.sin(t) * r}" x2="${cx + Math.cos(t) * (r - l)}" y2="${y + Math.sin(t) * (r - l)}" stroke="#FFFFFF" stroke-opacity="${a % 6 === 0 ? 0.22 : 0.14}" stroke-width="1.5"/>`;
    }
    for (let j = 0; j < 2; j++) {
      const a0 = R() * Math.PI * 2, a1 = a0 + 0.61, p = a => [cx + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      b += `<path d="M${x0} ${y0} A${r + 6} ${r + 6} 0 0 1 ${x1} ${y1}" fill="none" stroke="${k === 5 ? '#2ED47A' : '#B69CFF'}" stroke-opacity=".75" stroke-width="2.5" stroke-linecap="round"/>`;
    }
  }
  // packets travelling along the path
  for (let i = 0; i < 12; i++) {
    const x = xs[0] + 0.9 * IN + R() * (xs[5] - xs[0] - 1.8 * IN), len = 26;
    b += `<line x1="${x - len}" y1="${y}" x2="${x}" y2="${y}" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"/>`;
  }
  // the human step: halo and ripples
  b += `<circle cx="${xs[4]}" cy="${y}" r="${1.05 * IN}" fill="url(#hal)"/>`;
  for (const [r, o] of [[0.85, 0.4], [1.05, 0.24], [1.3, 0.12]]) b += `<circle cx="${xs[4]}" cy="${y}" r="${r * IN}" fill="none" stroke="#B69CFF" stroke-opacity="${o}" stroke-width="2"/>`;
  await shoot(doc(slideSvg(b), { transparent: true, noise: false }), path.join(OUT, 'viz_flow.png'), 2560, 1440, { transparent: true });
}

// trust: a governed core, rings with HUD ticks, links out to the six guarantees
{
  const cx = 6.667 * IN, cy = 4.3 * IN, r0 = 1.45 * IN, R = rng(31);
  let b = `<defs><radialGradient id="core"><stop offset="0" stop-color="#B69CFF" stop-opacity=".45"/><stop offset=".55" stop-color="#4D8DFF" stop-opacity=".12"/><stop offset="1" stop-color="#4D8DFF" stop-opacity="0"/></radialGradient>
    <filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter></defs>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${r0 * 1.5}" fill="url(#core)"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="none" stroke="#B69CFF" stroke-opacity=".55" stroke-width="2.5"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${r0 * 0.78}" fill="none" stroke="#4D8DFF" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="4 10"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${r0 * 1.17}" fill="none" stroke="#B69CFF" stroke-opacity=".18" stroke-width="1.5"/>`;
  for (let i = 0; i < 120; i++) {
    const t = i / 120 * Math.PI * 2, l = i % 10 === 0 ? 22 : 10;
    b += `<line x1="${cx + Math.cos(t) * (r0 * 1.17)}" y1="${cy + Math.sin(t) * (r0 * 1.17)}" x2="${cx + Math.cos(t) * (r0 * 1.17 - l)}" y2="${cy + Math.sin(t) * (r0 * 1.17 - l)}" stroke="#C9BBFF" stroke-opacity="${i % 10 === 0 ? 0.6 : 0.25}" stroke-width="2"/>`;
  }
  // glowing arcs on the main ring
  const arc = (a0, a1, col, w) => { const p = a => [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]; const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `<path d="M${x0} ${y0} A${r0} ${r0} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
  for (const [a0, a1, col] of [[-2.6, -1.5, '#B69CFF'], [0.2, 1.1, '#4D8DFF'], [2.0, 2.6, '#B69CFF']]) b += `<g filter="url(#gl)">${arc(a0, a1, col, 10)}</g>${arc(a0, a1, col, 4)}`;
  // links to the six guarantees (left and right columns)
  const ends = [];
  for (const yy of [2.33, 3.98, 5.63]) { ends.push([4.62, yy]); ends.push([8.7, yy]); }
  for (const [ex, ey] of ends) {
    const X = ex * IN, Y = ey * IN, ang = Math.atan2(Y - cy, X - cx), px = cx + Math.cos(ang) * r0 * 1.17, py = cy + Math.sin(ang) * r0 * 1.17;
    b += `<line x1="${X}" y1="${Y}" x2="${px}" y2="${py}" stroke="#B69CFF" stroke-opacity=".45" stroke-width="2"/><circle cx="${px}" cy="${py}" r="5" fill="#B69CFF" opacity=".8"/>`;
  }
  await shoot(doc(slideSvg(b), { transparent: true, noise: false }), path.join(OUT, 'viz_trust.png'), 2560, 1440, { transparent: true });
  GEO.trust = { cx: 6.667, cy: 4.3, r: 1.45, rows: [2.33, 3.98, 5.63], left: 4.31, right: 9.01, d: 0.62 };
}

// roadmap: a luminous timeline from today to the vision
{
  const y = 2.2 * IN, x0 = 0.95 * IN, x1 = 12.73 * IN;
  const b = `<defs><linearGradient id="tl" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".4" stop-color="#4D8DFF"/><stop offset=".78" stop-color="#B69CFF"/><stop offset="1" stop-color="#B69CFF" stop-opacity="0"/></linearGradient>
    <filter id="bl" filterUnits="userSpaceOnUse" x="0" y="0" width="2560" height="1440"><feGaussianBlur stdDeviation="12"/></filter>
    <radialGradient id="vg"><stop offset="0" stop-color="#B69CFF" stop-opacity=".5"/><stop offset="1" stop-color="#B69CFF" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="${10.2 * IN}" cy="${y}" rx="${2.6 * IN}" ry="${0.9 * IN}" fill="url(#vg)"/>
    <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="url(#tl)" stroke-width="16" stroke-opacity=".7" filter="url(#bl)"/>
    <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="url(#tl)" stroke-width="3.5"/>
    ${[[0.32, 0.4], [0.46, 0.24], [0.6, 0.12]].map(([r, o]) => `<circle cx="${0.97 * IN}" cy="${y}" r="${r * IN}" fill="none" stroke="#FFFFFF" stroke-opacity="${o}" stroke-width="2"/>`).join('')}
    ${(() => { const R = rng(503); return Array.from({ length: 40 }, () => { const px = (10.6 + R() * 2.1) * IN, py = y + (R() - 0.5) * 0.5 * IN; return `<circle cx="${px}" cy="${py}" r="${2 + R() * 3}" fill="#B69CFF" opacity="${0.25 + R() * 0.5}"/>`; }).join(''); })()}`;
  await shoot(doc(slideSvg(b), { transparent: true, noise: false }), path.join(OUT, 'viz_timeline.png'), 2560, 1440, { transparent: true });
}

// cover: a drifting field of alarms narrows into one beam that ends in a single answer
{
  const R = rng(2026), ex = 12.15 * IN, ey = 3.45 * IN;
  let dotsSvg = '', streams = '';
  for (let i = 0; i < 640; i++) {
    const u = (R() + R()) / 2, v = (R() + R() + R()) / 3;
    const x = (6.6 + u * 4.4) * IN, y = (1.0 + v * 4.9) * IN, k = R();
    const col = k < 0.05 ? '#D72D30' : k < 0.17 ? '#D4B741' : k < 0.25 ? '#4DAFBE' : '#7F8CA8';
    const pull = Math.max(0, (x / IN - 8.6) / 2.4); // dots near the funnel lean towards the beam
    const yy = y + (ey - y) * pull * pull * 0.7;
    dotsSvg += `<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="${col === '#7F8CA8' ? 4.2 : 5.4}" fill="${col}" opacity="${col === '#7F8CA8' ? 0.5 : 0.9}"/>`;
    if (R() < 0.12) streams += `<path d="M${x.toFixed(1)} ${yy.toFixed(1)} C ${(x + (ex - x) * 0.55).toFixed(1)} ${yy.toFixed(1)}, ${(ex - (ex - x) * 0.3).toFixed(1)} ${ey}, ${ex} ${ey}" stroke="url(#st)" stroke-width="1.6" fill="none"/>`;
  }
  const b = `<defs><linearGradient id="st" gradientUnits="userSpaceOnUse" x1="${8 * IN}" y1="0" x2="${ex}" y2="0"><stop offset="0" stop-color="#8FB4FF" stop-opacity="0"/><stop offset=".6" stop-color="#8FB4FF" stop-opacity=".18"/><stop offset="1" stop-color="#B69CFF" stop-opacity=".6"/></linearGradient>
    <radialGradient id="core"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".3" stop-color="#B69CFF" stop-opacity=".9"/><stop offset="1" stop-color="#B69CFF" stop-opacity="0"/></radialGradient>
    <filter id="bl" filterUnits="userSpaceOnUse" x="0" y="0" width="2560" height="1440"><feGaussianBlur stdDeviation="14"/></filter></defs>
    ${streams}${dotsSvg}
    <circle cx="${ex}" cy="${ey}" r="${0.75 * IN}" fill="url(#core)" opacity=".55"/>
    ${[[0.3, 0.6], [0.5, 0.35], [0.72, 0.18]].map(([r, o]) => `<circle cx="${ex}" cy="${ey}" r="${r * IN}" fill="none" stroke="#B69CFF" stroke-opacity="${o}" stroke-width="2.5"/>`).join('')}
    <circle cx="${ex}" cy="${ey}" r="16" fill="#FFFFFF"/>`;
  await shoot(doc(slideSvg(b), { transparent: true, noise: false }), path.join(OUT, 'viz_cover.png'), 2560, 1440, { transparent: true });
}

fs.writeFileSync(path.join(OUT, 'visuals.json'), JSON.stringify(GEO, null, 1));
await browser.close();
console.log('visuals →', OUT);
