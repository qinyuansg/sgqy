// Export the story to MP4:  node tools/render_video.cjs <url> <out.mp4> [workers] [fps]
// Frames are rendered by headless Chromium (render(t) is stateless), piped into ffmpeg as segments,
// then concatenated and muxed with the soundtrack (assets/soundtrack.wav, rendered if missing).
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
(async () => {
  const [url, out, nw = '3', fpsArg = '30'] = process.argv.slice(2);
  const workers = +nw, fps = +fpsArg;
  const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), '.render-'));
  const browser = await chromium.launch();
  const open = async () => { const p = await browser.newPage(); p.on('pageerror', e => console.log('pageerror:', e.message)); await p.goto(url); await p.evaluate(() => window.__ready); return p; };
  const first = await open();
  const dur = await first.evaluate(() => DUR), total = Math.round(Math.min(dur, +(process.env.LIMIT || dur)) * fps);
  const wav = path.join(__dirname, '..', 'assets', 'soundtrack.wav');
  let audio = path.resolve(process.env.SOUNDTRACK || wav);
  if (!fs.existsSync(audio) && fs.existsSync(wav.replace(/wav$/, 'm4a'))) audio = wav.replace(/wav$/, 'm4a');
  if (!fs.existsSync(audio)) {
    console.log('rendering soundtrack…');
    fs.writeFileSync(audio, Buffer.from(await first.evaluate(() => window.__audio()), 'base64'));
  }
  const per = Math.ceil(total / workers), t0 = Date.now();
  let done = 0;
  const pages = [first]; for (let i = 1; i < workers; i++) pages.push(await open());
  await Promise.all(pages.map(async (page, w) => {
    const a = w * per, b = Math.min(total, a + per);
    const seg = path.join(tmp, `seg${w}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2', '-g', String(fps * 2), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = a; i < b; i++) {
      const data = await page.evaluate(t => window.__frame(t, 0.95), i / fps);
      const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 150 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  }));
  await browser.close();
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, pages.map((_, w) => `file '${path.join(tmp, `seg${w}.mp4`)}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', audio,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.resolve(out)], { stdio: 'inherit' });
  for (const f of fs.readdirSync(tmp)) fs.unlinkSync(path.join(tmp, f));
  fs.rmdirSync(tmp);
  console.log('done:', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
