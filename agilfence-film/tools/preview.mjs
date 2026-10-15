// Render stills at chosen times (and an optional contact sheet) for review.
// node tools/preview.mjs --times 1.5,4,8.5 [--step 0.5 --from 10 --to 20] [--out DIR] [--sheet name] [--subs] [--scale 0.5]
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = process.env.BUILD || path.join(ROOT, 'build');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
  return acc;
}, []));
let times = [];
if (args.times) times = args.times.split(',').map(Number);
if (args.step) for (let t = +args.from; t <= +args.to + 1e-6; t += +args.step) times.push(+t.toFixed(3));
const out = args.out || path.join(BUILD, 'preview');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const url = 'file://' + path.join(ROOT, 'src', 'index.html') + (args.subs ? '?subs=1' : '');
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
const files = [];
for (const t of times) {
  await page.evaluate(tt => window.seek(tt), t);
  const f = path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
await browser.close();
if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
if (args.sheet && files.length) {
  const cols = +(args.cols || 4), sc = +(args.scale || 0.25);
  const rows = Math.ceil(files.length / cols);
  const inputs = files.flatMap(f => ['-i', f]);
  const w = Math.round(1920 * sc), h = Math.round(1080 * sc);
  const filt = files.map((_, i) => `[${i}:v]scale=${w}:${h},drawtext=text='${times[i].toFixed(2)}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';')
    + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=` +
    files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|') + `:fill=black[o]`;
  const sheet = path.join(out, args.sheet + '.png');
  if (files.length === 1) fs.copyFileSync(files[0], sheet);
  else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filt, '-map', '[o]', '-frames:v', '1', sheet]);
  console.log('sheet', sheet, `${cols}x${rows}`);
}
console.log(files.length, 'stills →', out);
