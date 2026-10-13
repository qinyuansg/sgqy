// Assets for the CAG demo pitch deck.
//   node make_assets.mjs <oldDeck.pptx> <v11SvgDir> <mvpSvgDir> <outDir>
// - 2x renders of the V11 product frames (the screens the CTO clicks on demo day)
// - dark "aurora" backgrounds, photo backgrounds from the previous deck (darkened; stale
//   on-screen numbers blurred), the airport demo map with numbered scenario pins
// - reversed (white) logo, persona portraits, the concept frame for the roadmap slide
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { Frame } from '../isms-mvp-figma/lib/svg.mjs';
import { camera, clayAirport } from '../isms-mvp-figma/lib/clay.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const [oldDeck, v11Dir, mvpDir, outArg] = process.argv.slice(2);
const OUT = path.resolve(outArg || 'assets');
for (const d of ['', 'v11', 'old']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

// ---------- 1) photos and logo from the previous deck ----------
const oldDir = path.join(OUT, 'old');
execFileSync('python3', ['-c', `
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
for n in z.namelist():
    if n.startswith('ppt/media/'):
        open(sys.argv[2] + '/' + n.split('/')[-1], 'wb').write(z.read(n))
`, oldDeck, oldDir]);
// image1 wide ops room · image9 overloaded operator · image28 end of shift · image5-8 personas · image4 logo
execFileSync('python3', ['-c', `
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
# reversed logo: grey wordmark -> white, red symbol kept
lg = Image.open(src + '/image4.png').convert('RGBA')
px = lg.load()
for y in range(lg.size[1]):
    for x in range(lg.size[0]):
        r, g, b, a = px[x, y]
        if a and abs(r - g) < 28 and abs(g - b) < 28:
            px[x, y] = (255, 255, 255, a)
lg.save(out + '/logo_white.png')
for i, n in [(5, 'nurul'), (6, 'daniel'), (7, 'arjun'), (8, 'grace')]:
    im = Image.open(src + '/image%d.jpg' % i).convert('RGB')
    w, h = im.size
    im.crop((0, 0, w, int(w * 1.15))).save(out + '/persona_%s.jpg' % n, quality=86)
`, oldDir, OUT]);

// ---------- 2) render helpers ----------
const browser = await chromium.launch();
async function shoot(html, file, w = 2560, h = 1440, o = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: o.dsf || 1 });
  // load from disk (not setContent) so file:// images and SVGs are allowed
  const tmp = path.join(OUT, '_page.html');
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.waitForTimeout(o.wait || 300);
  await page.screenshot({ path: file, type: file.endsWith('.png') ? 'png' : 'jpeg', quality: file.endsWith('.png') ? undefined : (o.q || 88), omitBackground: !!o.transparent });
  await page.close();
}
async function renderSvg(svgFile, outFile, dsf) {
  const head = fs.readFileSync(svgFile, 'utf8').slice(0, 400);
  const w = +head.match(/width="(\d+)"/)[1], h = +head.match(/height="(\d+)"/)[1];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  await page.goto('file://' + svgFile);
  await page.waitForTimeout(400);
  await page.screenshot({ path: outFile, type: outFile.endsWith('.png') ? 'png' : 'jpeg', quality: outFile.endsWith('.png') ? undefined : 88 });
  await page.close();
}
const fileUrl = p => 'file://' + path.resolve(p);
// film grain so large gradients don't band in JPEG
const NOISE = `<canvas id="n" style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:overlay;opacity:.07"></canvas>
<script>const c=document.getElementById('n');c.width=innerWidth;c.height=innerHeight;const x=c.getContext('2d'),d=x.createImageData(c.width,c.height);let s=97;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<d.data.length;i+=4){const v=128+(r()-.5)*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0)</script>`;
const page = (body, css = '') => `<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#05070D}.f{position:absolute;inset:0}${css}</style></head><body>${body}${NOISE}</body></html>`;
// faint HUD grid fading out from one corner
const grid = (at, op = 0.05) => `<div class="f" style="background-image:linear-gradient(rgba(143,180,255,${op}) 1px,transparent 1px),linear-gradient(90deg,rgba(143,180,255,${op}) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(ellipse 55% 60% at ${at},#000 0%,transparent 100%)"></div>`;
const BASE = 'linear-gradient(180deg,#070B16 0%,#05070D 100%)';

// ---------- 3) backgrounds ----------
await shoot(page(`<div class="f" style="background:
  radial-gradient(1500px 900px at 6% -12%,rgba(45,91,255,.24),rgba(45,91,255,0) 70%),
  radial-gradient(1300px 1000px at 108% 112%,rgba(138,92,246,.20),rgba(138,92,246,0) 70%),${BASE}"></div>${grid('100% 0%')}`), path.join(OUT, 'bg_base.jpg'));
for (const [name, gx] of [['bg_scene_r', 70], ['bg_scene_l', 30]]) {
  await shoot(page(`<div class="f" style="background:
    radial-gradient(1500px 1100px at ${gx}% 52%,rgba(77,141,255,.17),rgba(77,141,255,0) 66%),
    radial-gradient(900px 700px at ${gx > 50 ? 98 : 2}% 4%,rgba(182,156,255,.16),rgba(182,156,255,0) 70%),
    radial-gradient(1200px 800px at ${gx > 50 ? 0 : 100}% 110%,rgba(45,91,255,.10),rgba(45,91,255,0) 70%),${BASE}"></div>${grid(gx > 50 ? '100% 100%' : '0% 100%', 0.04)}`), path.join(OUT, name + '.jpg'));
}
// aurora: the Co-pilot gradient (blue → violet → pink → amber) as light, with orbit lines
const orbit = `<svg class="f" viewBox="0 0 2560 1440" preserveAspectRatio="none"><g fill="none" stroke="#C9D6FF">
  <ellipse cx="1900" cy="1500" rx="1500" ry="620" stroke-opacity=".10" stroke-width="2"/>
  <ellipse cx="1900" cy="1500" rx="1900" ry="820" stroke-opacity=".07" stroke-width="2"/>
  <ellipse cx="1900" cy="1500" rx="2300" ry="1020" stroke-opacity=".05" stroke-width="2"/></g></svg>`;
await shoot(page(`<div class="f" style="background:${BASE}"></div>
  <div class="f" style="filter:blur(150px)">
    <div style="position:absolute;left:1050px;top:780px;width:1500px;height:900px;border-radius:50%;background:#2D5BFF;opacity:.50"></div>
    <div style="position:absolute;left:1650px;top:520px;width:1100px;height:800px;border-radius:50%;background:#8A5CF6;opacity:.45"></div>
    <div style="position:absolute;left:2050px;top:260px;width:800px;height:600px;border-radius:50%;background:#FF5A9E;opacity:.26"></div>
    <div style="position:absolute;left:1500px;top:1180px;width:900px;height:420px;border-radius:50%;background:#FFB020;opacity:.16"></div>
  </div>${orbit}
  <div class="f" style="background:linear-gradient(90deg,rgba(5,7,13,.92) 0%,rgba(5,7,13,.55) 45%,rgba(5,7,13,0) 75%)"></div>`), path.join(OUT, 'bg_section.jpg'));

// photo backgrounds: blur stale on-screen numbers (old storyline), darken for text
const photo = (img, blurs, overlay, filter = 'brightness(.72) saturate(.95)') => page(`
  <img class="f" src="${fileUrl(path.join(oldDir, img))}" style="width:100%;height:100%;object-fit:cover;filter:${filter}">
  ${blurs.map(([x, y, w, h]) => `<div style="position:absolute;left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);border-radius:12px"></div>`).join('')}
  <div class="f" style="background:${overlay}"></div>`);
await shoot(photo('image1.jpg', [[0.635, 0.245, 0.24, 0.115]],
  'linear-gradient(90deg,rgba(5,7,13,.97) 0%,rgba(5,7,13,.88) 30%,rgba(5,7,13,.45) 62%,rgba(5,7,13,.25) 100%),linear-gradient(0deg,rgba(5,7,13,.85) 0%,rgba(5,7,13,0) 35%)'), path.join(OUT, 'bg_cover.jpg'));
await shoot(photo('image9.jpg', [],
  'linear-gradient(90deg,rgba(5,7,13,.97) 0%,rgba(5,7,13,.86) 34%,rgba(5,7,13,.30) 66%,rgba(5,7,13,.30) 100%),linear-gradient(0deg,rgba(5,7,13,.80) 0%,rgba(5,7,13,0) 30%)', 'brightness(.80) saturate(.95)'), path.join(OUT, 'bg_problem.jpg'));
await shoot(photo('image28.jpg', [[0.615, 0.225, 0.25, 0.14]],
  'linear-gradient(0deg,rgba(5,7,13,.97) 0%,rgba(5,7,13,.80) 34%,rgba(5,7,13,.25) 70%,rgba(5,7,13,.45) 100%)'), path.join(OUT, 'bg_close.jpg'));

// ---------- 4) demo map: airport twin with the seven scenario pins ----------
const PINS = [
  { num: 1, X: 50, Y: 30.5, sev: 'Critical' }, { num: 2, X: 63, Y: 1, sev: 'Critical', h: 3.6 },
  { num: 3, X: 34, Y: 39, sev: 'Warning' }, { num: 4, X: 31, Y: 28, sev: 'Warning' },
  { num: 5, X: 19, Y: 36, sev: 'Warning' }, { num: 6, X: 66, Y: 29.5, sev: 'Info' },
  { num: 7, X: 15, Y: 29, sev: 'Warning' },
].map(p => ({ ...p, scale: 1.25, numCol: p.sev === 'Critical' ? '#FFFFFF' : '#0A0F1A' }));
function mapSvg(grid) {
  const F = new Frame('Demo map', 1600, 900);
  const P = camera(1085, 520, 7.6, 50, 29);
  return F.render(clayAirport(F, P, { markers: grid ? [] : PINS, grid, labels: !grid, lidar: !grid, alarmFence: true }));
}
fs.writeFileSync(path.join(OUT, 'map_grid.svg'), mapSvg(true));
fs.writeFileSync(path.join(OUT, 'map_twin.svg'), mapSvg(false).replace(/<g id="Grid">[\s\S]*?<\/g>/, ''));
await shoot(page(`<div class="f" style="background:
    radial-gradient(1300px 900px at 68% 58%,rgba(77,141,255,.15),rgba(77,141,255,0) 66%),
    radial-gradient(900px 700px at 100% 0%,rgba(182,156,255,.14),rgba(182,156,255,0) 70%),${BASE}"></div>
  <img class="f" src="${fileUrl(path.join(OUT, 'map_grid.svg'))}" style="width:100%;height:100%;opacity:.55;-webkit-mask-image:radial-gradient(ellipse 42% 46% at 68% 58%,#000 20%,transparent 100%)">
  <img class="f" src="${fileUrl(path.join(OUT, 'map_twin.svg'))}" style="width:100%;height:100%">
  <div class="f" style="background:linear-gradient(90deg,rgba(5,7,13,.92) 0%,rgba(5,7,13,.6) 30%,rgba(5,7,13,0) 48%)"></div>`, ''), path.join(OUT, 'bg_map.jpg'), 1600, 900, { dsf: 1.6 });

// ---------- 5) product screens ----------
for (const f of fs.readdirSync(v11Dir).filter(f => /^V11-(0[1-9]|1[0-2])-.*\.svg$/.test(f))) {
  await renderSvg(path.join(v11Dir, f), path.join(OUT, 'v11', f.replace('.svg', '.png')), 2);
  console.log('v11', f);
}
await renderSvg(path.join(mvpDir, '03-operations-overview.svg'), path.join(OUT, 'concept_overview.jpg'), 1.5);
await browser.close();
console.log('assets →', OUT);
