// Deterministic frame renderer: seeks a paused GSAP timeline frame-by-frame
// and pipes JPEG screenshots into ffmpeg. Usage:
//   NODE_PATH=/opt/node-tools/node_modules node render.js <page.html> <out.mp4> [fps] [startSec] [endSec]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [,, pageFile, outFile, fpsArg, startArg, endArg] = process.argv;
  const fps = Number(fpsArg || 30);
  const url = 'file://' + path.resolve(pageFile);
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-gpu', '--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const duration = await page.evaluate(() => window.__duration());
  const start = Number(startArg || 0);
  const end = endArg ? Math.min(Number(endArg), duration) : duration;
  const total = Math.ceil((end - start) * fps);
  console.log(`duration=${duration.toFixed(2)}s fps=${fps} frames=${total}`);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
  ff.stderr.on('data', d => process.stderr.write(d));
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const t = start + i / fps;
    await page.evaluate(t => window.__seek(t), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${total} t=${t.toFixed(1)}s elapsed=${((Date.now()-t0)/1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', outFile, `${((Date.now()-t0)/1000).toFixed(0)}s`);
})().catch(e => { console.error(e); process.exit(1); });
