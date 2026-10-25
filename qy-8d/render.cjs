// 逐帧渲染 index.html → MP4（无音轨；用 add_music.sh 混入音乐）
//   node render.cjs [out.mp4]            完整视频
//   node render.cjs --stills 3,12,40     导出指定秒数的 PNG，用于检查画面
// 环境变量：FPS（默认 30）
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = +process.env.FPS || 30;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  // Google Fonts 经 curl 取回（curl 走沙箱代理与 CA）
  const cache = new Map();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
    const url = route.request().url();
    try {
      if (!cache.has(url)) cache.set(url, execFileSync('curl', ['-sS', '--fail', '-A', UA, url], { maxBuffer: 64e6 }));
      await route.fulfill({ status: 200, body: cache.get(url), headers: {
        'content-type': url.includes('googleapis') ? 'text/css; charset=utf-8' : 'font/woff2',
        'access-control-allow-origin': '*' } });
    } catch (e) { console.error('font fetch failed', url); await route.abort(); }
  });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render');
  await page.evaluate(() => window.__ready);
  const dur = await page.evaluate(() => window.DURATION);
  const grab = (t, type, q) => page.evaluate(([t, type, q]) => {
    window.renderAt(t); return document.getElementById('cv').toDataURL(type, q).split(',')[1];
  }, [t, type, q]);

  if (stillsIdx >= 0) {
    const dir = path.join(__dirname, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const t of args[stillsIdx + 1].split(',').map(Number)) {
      fs.writeFileSync(path.join(dir, `t${String(t).padStart(6, '0')}.png`), Buffer.from(await grab(t, 'image/png'), 'base64'));
    }
    await browser.close(); return;
  }

  const out = path.resolve(args[0] || path.join(__dirname, 'qy-8d-silent.mp4'));
  const N = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) {
    const buf = Buffer.from(await grab(i / FPS, 'image/jpeg', 0.94), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (FPS * 10) === 0) console.error(`frame ${i}/${N}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.error('done →', out);
})();
