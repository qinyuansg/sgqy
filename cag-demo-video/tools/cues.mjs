// Dump the picture-locked sound cues registered by the scenes (E.cue) to JSON.
// node tools/cues.mjs [--out build/cues.json]
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = process.env.BUILD || path.join(ROOT, 'build');
const i = process.argv.indexOf('--out');
const out = i > 0 ? process.argv[i + 1] : path.join(BUILD, 'cues.json');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + path.join(ROOT, 'src', 'index.html'));
const cues = await page.evaluate(() => E.sfx.slice().sort((a, b) => a.t - b.t));
await browser.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(cues, null, 1));
const byType = {};
cues.forEach(c => (byType[c.type] = (byType[c.type] || 0) + 1));
console.log(cues.length, 'cues →', out, JSON.stringify(byType));
