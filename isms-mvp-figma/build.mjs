// Build the Figma-importable SVG frames + PNG previews.
// Usage: node build.mjs <outDir> [frameFilter]
//   1) node render-cctv.mjs <outDir>/cctv     (once; camera frames)
//   2) node build.mjs <outDir>                (SVG frames → <outDir>/svg, previews → <outDir>/png)
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { useCctv } from './lib/ui.mjs';

const require = createRequire(import.meta.url);
const out = path.resolve(process.argv[2] || 'out');
const only = process.argv[3];
useCctv(path.join(out, 'cctv'));

const FRAMES = [
  ['00-cover', './screens/cover.mjs'],
  ['01-design-foundations', './screens/foundations.mjs'],
  ['02-mvp-user-journeys', './screens/journeys.mjs'],
  ['03-operations-overview', './screens/overview.mjs'],
  ['04-alarm-correlation-inbox', './screens/inbox.mjs'],
  ['05-incident-tailgating-antipassback', './screens/tailgate.mjs'],
  ['06-incident-identity-spoofing', './screens/spoof.mjs'],
  ['07-incident-unattended-bag', './screens/bag.mjs'],
  ['08-incident-watchlist-loitering', './screens/watch.mjs'],
  ['09-incident-fight-detection', './screens/fight.mjs'],
  ['10-incident-overstay', './screens/overstay.mjs'],
  ['11-incident-perimeter-agilfence-lidar', './screens/fence.mjs'],
  ['12-copilot-natural-language-ops', './screens/copilot.mjs'],
  ['13-resolution-and-report', './screens/resolution.mjs'],
  ['14-access-insights', './screens/insights.mjs'],
  ['15-sites-federation', './screens/federation.mjs'],
  ['16-cto-architecture-feasibility', './screens/cto.mjs'],
];

fs.mkdirSync(path.join(out, 'svg'), { recursive: true });
fs.mkdirSync(path.join(out, 'png'), { recursive: true });
const built = [];
for (const [name, mod] of FRAMES) {
  if (only && !name.includes(only)) continue;
  if (!fs.existsSync(new URL(mod, import.meta.url))) { console.log('skip', name); continue; }
  const m = await import(mod);
  const svg = m.default();
  const p = path.join(out, 'svg', name + '.svg');
  fs.writeFileSync(p, svg);
  built.push([name, p]);
  console.log('svg', name, (svg.length / 1024).toFixed(0) + ' KB');
}

// previews
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [name, p] of built) {
  await page.goto('file://' + p);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, 'png', name + '.png') });
}
await browser.close();
console.log('previews done');
