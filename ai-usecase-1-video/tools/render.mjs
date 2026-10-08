// Frame-accurate render: N Chromium workers seek the film page frame by frame
// and pipe JPEG frames into ffmpeg; segments are joined losslessly.
// node tools/render.mjs [--out build/video.mp4] [--workers 3] [--from 0 --to 12.5] [--crf 16]
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawn, execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = process.env.BUILD || path.join(ROOT, 'build');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
  return acc;
}, []));

const TLsrc = fs.readFileSync(path.join(ROOT, 'src', 'js', 'timeline.js'), 'utf8');
const TL = JSON.parse(TLsrc.slice(TLsrc.indexOf('{'), TLsrc.lastIndexOf('}') + 1));
const FPS = TL.fps || 30;
const from = Math.round((+(args.from || 0)) * FPS);
const to = Math.round((+(args.to || TL.total)) * FPS);
const N = to - from;
const W = +(args.workers || 3);
const out = args.out || path.join(BUILD, 'video.mp4');
const crf = args.crf || '16';
const segDir = path.join(BUILD, 'segments');
fs.mkdirSync(segDir, { recursive: true });
const url = 'file://' + path.join(ROOT, 'src', 'index.html');

async function worker(k, a, b) {
  const seg = path.join(segDir, `seg${String(k).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-g', '60',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await page.evaluate(tt => window.seek(tt), f / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: false });
    const buf = Buffer.from(data, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 300 === 0) console.log(`  w${k} ${f - a}/${b - a} frames · ${((f - a) / Math.max(0.001, (Date.now() - t0) / 1000)).toFixed(1)} fps`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  if (errs.length) console.log(`w${k} page errors:\n` + errs.join('\n'));
  return seg;
}

const t0 = Date.now();
const per = Math.ceil(N / W);
const jobs = [];
for (let k = 0; k < W; k++) {
  const a = from + k * per, b = Math.min(to, a + per);
  if (a < b) jobs.push(worker(k, a, b));
}
const segs = await Promise.all(jobs);
const list = path.join(segDir, 'list.txt');
fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
console.log(`rendered ${N} frames (${(N / FPS).toFixed(2)} s) in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${out}`);
