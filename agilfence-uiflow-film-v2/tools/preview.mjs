// Screenshot the film page at given times: node tools/preview.mjs --out dir t1 t2 ...
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const a = process.argv.slice(2); const oi = a.indexOf('--out'); const out = oi >= 0 ? a[oi + 1] : path.join(process.env.BUILD || path.join(ROOT, 'build'), 'check');
const times = a.filter((x, i) => i !== oi && i !== oi + 1).map(Number);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + path.join(ROOT, 'src', 'index.html') + '?cut=' + encodeURIComponent(process.env.CUT || 'operator')); await page.evaluate(() => document.fonts.ready);
for (const t of times) { await page.evaluate(tt => window.seek(tt), t); await page.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 85 }); }
await browser.close();
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(times.length, 'frames →', out);
