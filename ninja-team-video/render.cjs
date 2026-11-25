// Renders scenes.html frame-by-frame (deterministic time, no real-time capture)
// and pipes the frames into ffmpeg.
//
//   node render.cjs --prepare                         -> build/index.html only
//   node render.cjs --stills 12.5,40,s3.pm4$+0.5      -> build/stills/*.png
//   node render.cjs --from 0 --to 900 --out seg.mp4   -> frames [from, to) as H.264
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { once } = require('events');
const { chromium } = require('playwright');

const HERE = __dirname;
const BUILD = path.join(HERE, 'build');
const FPS = 30;

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? def : (process.argv[i + 1] ?? true);
}

function prepare() {
  const timeline = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));
  let html = fs.readFileSync(path.join(HERE, 'scenes.html'), 'utf8');
  html = html.replace(/<i data-icon="([a-z0-9-]+)"([^>]*)><\/i>/g, (_, name, rest) => {
    let svg = fs.readFileSync(path.join(HERE, 'icons', name + '.svg'), 'utf8');
    svg = svg.replace(/<!--[\s\S]*?-->/g, '').trim();
    const cls = (rest.match(/class="([^"]*)"/) || [])[1] || '';
    const style = (rest.match(/style="([^"]*)"/) || [])[1] || '';
    // only touch the root <svg> tag: child shapes (rect, circle) keep their own width/height
    svg = svg.replace(/<svg[^>]*>/, tag => tag
      .replace(/class="[^"]*"/, `class="i ${cls}"` + (style ? ` style="${style}"` : ''))
      .replace(/\s(width|height|stroke-width)="[^"]*"/g, ''));
    return svg.replace(/\n\s*/g, ' ');
  });
  html = html.replace('/*TIMELINE*/', `window.TIMELINE = ${JSON.stringify(timeline)};`);
  const out = path.join(BUILD, 'index.html');
  fs.writeFileSync(out, html);
  return { out, timeline };
}

async function openPage(file) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + file);
  await page.evaluate(() => window.__ready);
  if (errors.length) throw new Error(errors.join('\n'));
  return { browser, page };
}

function resolveTime(spec, timeline) {
  // number (seconds) or beat ref like "s3.pm4$+0.5" / "@s5+1"
  if (/^-?\d+(\.\d+)?$/.test(spec)) return parseFloat(spec);
  const m = spec.match(/^(@?[A-Za-z0-9.]+?)(\$?)([+-]\d*\.?\d+)?$/);
  if (!m) throw new Error('bad time ' + spec);
  let t;
  if (m[1][0] === '@') {
    const sc = timeline.scenes.find(s => s.id === m[1].slice(1));
    t = m[2] ? sc.end : sc.start;
  } else {
    const b = timeline.beats[m[1]];
    if (!b) throw new Error('no beat ' + m[1]);
    t = m[2] ? b.end : b.start;
  }
  return t + (m[3] ? parseFloat(m[3]) : 0);
}

(async () => {
  const { out: file, timeline } = prepare();
  if (arg('prepare')) { console.log('prepared', file); return; }

  const stills = arg('stills');
  if (stills) {
    const dir = path.join(BUILD, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const { browser, page } = await openPage(file);
    for (const spec of String(stills).split(',')) {
      const t = resolveTime(spec, timeline);
      await page.evaluate(t => window.seek(t), t);
      const name = spec.replace(/[^A-Za-z0-9.+-]/g, '_') + '.png';
      await page.screenshot({ path: path.join(dir, name) });
      console.log(`${spec} -> t=${t.toFixed(2)} ${name}`);
    }
    await browser.close();
    return;
  }

  const total = Math.ceil(timeline.duration * FPS);
  const from = parseInt(arg('from', 0), 10);
  const to = Math.min(parseInt(arg('to', total), 10), total);
  const outFile = arg('out', path.join(BUILD, 'video.mp4'));
  const { browser, page } = await openPage(file);
  const cdp = await page.context().newCDPSession(page);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
    '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), outFile], { stdio: ['pipe', 'inherit', 'inherit'] });

  let prevSig = null, prevBuf = null, shots = 0;
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const sig = await page.evaluate(t => window.seek(t), f / FPS);
    if (sig !== prevSig) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true });
      prevBuf = Buffer.from(r.data, 'base64');
      prevSig = sig;
      shots++;
    }
    if (!ff.stdin.write(prevBuf)) await once(ff.stdin, 'drain');
    if ((f - from) % 900 === 0) {
      console.log(`[${path.basename(outFile)}] frame ${f - from}/${to - from} shots=${shots} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  await browser.close();
  if (code !== 0) throw new Error('ffmpeg failed ' + code);
  console.log(`[${path.basename(outFile)}] done: ${to - from} frames, ${shots} captured, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch(e => { console.error(e); process.exit(1); });
