#!/usr/bin/env node
// 逐帧渲染 index.html → MP4（Playwright 截图 → ffmpeg 管道编码 → 混入配乐）
// 用法: node render.js [--fps 30] [--out out.mp4] [--audio soundtrack.wav] [--start 0 --end 104] [--preview]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const FPS = parseInt(args.fps || 30);
const OUT = path.resolve(args.out || 'health-story.mp4');
const AUDIO = args.audio ? path.resolve(args.audio) : null;
const START = parseFloat(args.start || 0);
const PREVIEW = !!args.preview;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render', { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  const DUR = await page.evaluate(() => window.__DUR);
  const END = parseFloat(args.end || DUR);

  if (PREVIEW) {
    // 关键帧预览图，用于肉眼检查排版
    const dir = path.join(__dirname, 'preview'); fs.mkdirSync(dir, { recursive: true });
    const times = (args.times ? String(args.times).split(',').map(Number) : [2, 6, 12, 20, 26, 36, 46, 56, 60, 70, 80, 88, 94, 102]);
    for (const t of times) { await page.evaluate(t => window.__seek(t), t); await page.screenshot({ path: path.join(dir, `t${String(t).padStart(3, '0')}.png`) }); }
    console.log('previews in', dir); await browser.close(); return;
  }

  const total = Math.round((END - START) * FPS);
  const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
  if (AUDIO) ffArgs.push('-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ffArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-movflags', '+faststart', OUT);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const t = START + i / FPS;
    await page.evaluate(t => window.__seek(t), t);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (FPS * 5) === 0) console.log(`frame ${i}/${total}  t=${t.toFixed(1)}s  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  await browser.close();
  console.log('wrote', OUT);
})().catch(e => { console.error(e); process.exit(1); });
