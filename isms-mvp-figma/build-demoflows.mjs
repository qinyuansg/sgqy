// Build the airport demo click flows (five use cases, every state a frame) and their boards.
// Usage: node build-demoflows.mjs <outDir> <assetsDir> [filter]   (filter 'board' = boards only)
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { useFont } from './lib/svg.mjs';
import { useAssets } from './lib/v11.mjs';

const require = createRequire(import.meta.url);
const out = path.resolve(process.argv[2] || 'out-demo');
const assets = path.resolve(process.argv[3] || 'assets');
const only = process.argv[4];
useFont('Roboto', 'roboto-widths.json');
useAssets(assets);
for (const d of ['svg', 'png', 'png2x', 'thumb']) fs.mkdirSync(path.join(out, d), { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();
async function preview(list, twoX) {
  for (const [name, p, w, h] of list) {
    for (const [dir, dpr] of twoX ? [['png', 1], ['png2x', 2]] : [['png', 1]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      await page.goto('file://' + p); await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(out, dir, name + '.png') });
      if (dpr === 1) await page.screenshot({ path: path.join(out, 'thumb', name + '.jpg'), type: 'jpeg', quality: 80 });
      await page.close();
    }
  }
}
const write = (name, svg) => {
  const p = path.join(out, 'svg', name + '.svg'); fs.writeFileSync(p, svg);
  const m = svg.match(/width="(\d+)" height="(\d+)"/); console.log('svg', name, (svg.length / 1024).toFixed(0) + ' KB');
  return [name, p, +m[1], +m[2]];
};
// frames: one module per use case, each exporting FRAMES = [[id, fn], ...] and optional ANCHORS/setFrame
const MODULES = ['./screens-v11/demo/uc1-overstay.mjs', './screens-v11/demo/uc2-agilfence.mjs', './screens-v11/demo/uc3-spoofing.mjs', './screens-v11/demo/uc4-ask.mjs', './screens-v11/demo/uc5-incidents.mjs'];
const anchors = {};
if (only !== 'board') {
  const built = [];
  for (const m of MODULES) {
    if (!fs.existsSync(path.join(path.dirname(new URL(import.meta.url).pathname), m))) { console.log('missing module, skipped:', m); continue; }
    const mod = await import(m);
    for (const [name, fn] of mod.FRAMES) {
      if (only && !name.includes(only)) continue;
      if (mod.setFrame) mod.setFrame(name);
      built.push(write(name, fn()));
    }
    if (mod.setFrame) mod.setFrame(null);
    if (mod.ANCHORS) Object.assign(anchors, mod.ANCHORS);
  }
  fs.writeFileSync(path.join(out, 'demo-anchors.json'), JSON.stringify(anchors, null, 1));
  await preview(built, true);
}
// boards embed the thumbs
if (!only || only === 'board') {
  try {
    const boards = await import('./screens-v11/demo/boards.mjs');
    boards.useThumbs(path.join(out, 'thumb'));
    const bb = [];
    for (const [name, fn] of boards.BOARDS) bb.push(write(name, fn()));
    await preview(bb, false);
  } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND') console.log('boards module not present, skipped'); else throw e; }
}
await browser.close();
console.log('previews done');
