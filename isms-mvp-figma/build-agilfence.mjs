// Build the AgilFence end-to-end flow frames (V11 design) and the flow board.
// Usage: node build-agilfence.mjs <outDir> <assetsDir> [filter]
//   assetsDir is the V11 asset folder (logo_s.png, stars.jpg, cctv/*.jpg incl. the fence_* scenes
//   from `node render-cctv.mjs <assetsDir>/cctv fence_`).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { useFont } from './lib/svg.mjs';
import { useAssets } from './lib/v11.mjs';

const require = createRequire(import.meta.url);
const out = path.resolve(process.argv[2] || 'out-agilfence');
const assets = path.resolve(process.argv[3] || 'assets');
const only = process.argv[4];
useFont('Roboto', 'roboto-widths.json');
useAssets(assets);
const { AF_FRAMES, AF_FILM_FRAMES, ANCHORS, setFrame } = await import('./screens-v11/agilfence.mjs');
// AF_FILM=1: frames for the film (no baked pointer, plus the in-between states), 2x PNG
const FRAMES = process.env.AF_FILM ? [...AF_FRAMES, ...AF_FILM_FRAMES] : AF_FRAMES;
const DPR = process.env.AF_FILM ? 2 : 1;

for (const d of ['svg', 'png', 'thumb']) fs.mkdirSync(path.join(out, d), { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();
async function preview(list) {
  for (const [name, p, w, h] of list) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: DPR });
    await page.goto('file://' + p);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, 'png', name + '.png') });
    await page.screenshot({ path: path.join(out, 'thumb', name + '.jpg'), type: 'jpeg', quality: 80 });
    await page.close();
  }
}
const write = (name, svg) => {
  const p = path.join(out, 'svg', name + '.svg');
  fs.writeFileSync(p, svg);
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  console.log('svg', name, (svg.length / 1024).toFixed(0) + ' KB');
  return [name, p, +m[1], +m[2]];
};
const built = [];
for (const [name, fn] of FRAMES) if (!only || name.includes(only)) { setFrame(name); built.push(write(name, fn())); }
setFrame(null);
fs.writeFileSync(path.join(out, 'anchors.json'), JSON.stringify(ANCHORS, null, 1));
await preview(built);
// pass 2: the flow board embeds previews of the frames
if ((!only || only === 'board') && !process.env.AF_FILM) {
  const board = await import('./screens-v11/agilfence-board.mjs');
  board.useThumbs(path.join(out, 'thumb'));
  await preview([write('AF-00b-flow-board', board.flowBoard())]);
}
await browser.close();
console.log('previews done');
