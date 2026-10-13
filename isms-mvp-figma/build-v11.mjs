// Build the "fit to current V11 UI" frames.
// Usage: node build-v11.mjs <outDir> <assetsDir> [filter]
//   assetsDir holds: logo_s.png, locate_door.jpg (exported from the team's Figma),
//   stars.jpg (make-stars.py) and cctv/*.jpg (render-cctv.mjs).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { useFont } from './lib/svg.mjs';
import { useAssets } from './lib/v11.mjs';

const require = createRequire(import.meta.url);
const out = path.resolve(process.argv[2] || 'out-v11');
const assets = path.resolve(process.argv[3] || 'assets');
const only = process.argv[4];
useFont('Roboto', 'roboto-widths.json');
useAssets(assets);
const { FRAMES } = await import('./screens-v11/frames.mjs');

fs.mkdirSync(path.join(out, 'svg'), { recursive: true });
fs.mkdirSync(path.join(out, 'png'), { recursive: true });
const built = [];
for (const [name, fn] of FRAMES) {
  if (only && !name.includes(only)) continue;
  const svg = fn();
  const p = path.join(out, 'svg', name + '.svg');
  fs.writeFileSync(p, svg);
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  built.push([name, p, +m[1], +m[2]]);
  console.log('svg', name, (svg.length / 1024).toFixed(0) + ' KB');
}
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();
fs.mkdirSync(path.join(out, 'thumb'), { recursive: true });
async function preview(list) {
  for (const [name, p, w, h] of list) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('file://' + p);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, 'png', name + '.png') });
    await page.screenshot({ path: path.join(out, 'thumb', name + '.jpg'), type: 'jpeg', quality: 72 });
    await page.close();
  }
}
await preview(built);
// pass 2: hand-off frames that embed previews of the product frames
if (!only || only === 'spec') {
  const spec = await import('./screens-v11/spec.mjs');
  spec.useThumbs(path.join(out, 'thumb'));
  const sb = [];
  for (const [name, fn] of [['V11-00-delta-to-v11', spec.deltaMap], ['V11-00b-demo-click-paths', spec.clickPaths]]) {
    const svg = fn(), p = path.join(out, 'svg', name + '.svg');
    fs.writeFileSync(p, svg); sb.push([name, p, 1600, 1069]);
    console.log('svg', name, (svg.length / 1024).toFixed(0) + ' KB');
  }
  await preview(sb);
}
await browser.close();
console.log('previews done');
