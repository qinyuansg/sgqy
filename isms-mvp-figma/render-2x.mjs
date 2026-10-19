// Render SVG frames to 2x PNGs (deck assets).
// Usage: node render-2x.mjs <svgDir> <outDir> [prefix]
//   Every <svgDir>/<prefix>*.svg is screenshotted with Playwright chromium at the frame's own size
//   (viewport = width x height from the SVG root) and deviceScaleFactor 2 into <outDir>/<name>.png,
//   the same way build-cpo-flows.mjs writes its png2x set.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const [svgDir, outDir, prefix = ''] = process.argv.slice(2).map((a, i) => (i < 2 ? path.resolve(a) : a));
if (!svgDir || !outDir) { console.error('usage: node render-2x.mjs <svgDir> <outDir> [prefix]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg') && f.startsWith(prefix)).sort();
if (!files.length) { console.error(`no ${prefix}*.svg in ${svgDir}`); process.exit(1); }
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();
try {
  for (const f of files) {
    const p = path.join(svgDir, f);
    const m = fs.readFileSync(p, 'utf8').match(/width="(\d+)" height="(\d+)"/);
    if (!m) { console.error('skip (no width/height):', f); continue; }
    const page = await browser.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: 2 });
    await page.goto('file://' + p);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, f.replace(/\.svg$/, '.png')) });
    await page.close();
    console.log('png2x', f.replace(/\.svg$/, ''), m[1] + 'x' + m[2]);
  }
} finally { await browser.close(); }
