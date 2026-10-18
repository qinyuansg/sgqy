// Build the CPO flow frames: the multi-site governance frames MS-01…06 (V11 design) and, when the
// boards module is present, the CPO boards (P2 / P5 flow boards, master board) that embed previews of
// the V11-*, AF-* and MS-* frames.
// Usage: node build-cpo-flows.mjs <outDir> <assetsDir> [filter]
//   assetsDir is the V11 asset folder (logo_s.png, stars.jpg, cctv/*.jpg incl. the fence_* scenes).
//   filter: build only the frames whose id contains it; 'board' skips the frames and builds the boards.
// Writes <out>/svg, <out>/png (1x), <out>/png2x (2x, frames only), <out>/thumb (jpeg) and <out>/ms-anchors.json.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { useFont } from './lib/svg.mjs';
import { useAssets } from './lib/v11.mjs';

const require = createRequire(import.meta.url);
const out = path.resolve(process.argv[2] || 'out-cpo');
const assets = path.resolve(process.argv[3] || 'assets');
const only = process.argv[4];
useFont('Roboto', 'roboto-widths.json');
useAssets(assets);

for (const d of ['svg', 'png', 'png2x', 'thumb']) fs.mkdirSync(path.join(out, d), { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();

const fail = (what, e) => { console.error(`FAILED ${what}:`, e && e.stack || e); process.exitCode = 1; browser.close().finally(() => process.exit(1)); throw e; };
const write = (name, svg) => {
  const p = path.join(out, 'svg', name + '.svg');
  fs.writeFileSync(p, svg);
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  console.log('svg', name, (svg.length / 1024).toFixed(0) + ' KB');
  return [name, p, +m[1], +m[2]];
};
async function preview(list, o = {}) {
  for (const [name, p, w, h] of list) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file://' + p);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, 'png', name + '.png') });
    await page.screenshot({ path: path.join(out, 'thumb', name + '.jpg'), type: 'jpeg', quality: 80 });
    await page.close();
    if (o.twoX) {
      const p2 = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
      await p2.goto('file://' + p);
      await p2.waitForTimeout(200);
      await p2.screenshot({ path: path.join(out, 'png2x', name + '.png') });
      await p2.close();
    }
    console.log('png', name);
  }
}

// pass 1: the frames
const { MS_FRAMES, ANCHORS, setFrame } = await import('./screens-v11/multisite.mjs');
const built = [];
if (only !== 'board') {
  for (const [name, fn] of MS_FRAMES) {
    if (only && !name.includes(only)) continue;
    setFrame(name);
    let svg;
    try { svg = fn(); } catch (e) { fail('frame ' + name, e); }
    built.push(write(name, svg));
  }
  setFrame(null);
  // a filtered run keeps the anchors of the frames it did not rebuild
  const ap = path.join(out, 'ms-anchors.json');
  const prev = only && fs.existsSync(ap) ? JSON.parse(fs.readFileSync(ap, 'utf8')) : {};
  fs.writeFileSync(ap, JSON.stringify({ ...prev, ...ANCHORS }, null, 1));
  await preview(built, { twoX: true });
}

// pass 2: the boards embed previews of the frames (V11-*, AF-* and MS-* thumbs must exist in <out>/thumb)
if (!only || only === 'board') {
  const boardsPath = new URL('./screens-v11/cpo-boards.mjs', import.meta.url);
  if (!fs.existsSync(boardsPath)) console.log('boards module not present, skipped');
  else {
    const boards = await import(boardsPath.href);
    boards.useThumbs(path.join(out, 'thumb'));
    for (const [name, fn] of boards.BOARDS) {
      let svg;
      try { svg = fn(); } catch (e) { fail('board ' + name, e); }
      await preview([write(name, svg)]);
    }
  }
}
await browser.close();
console.log('previews done');
