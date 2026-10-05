#!/usr/bin/env node
// Headless previz renderer.
//
//   Stills for checking shots:   node render.mjs --shots S012,S013 --u 0.05,0.5,0.95 --stills out/check
//   Single frames:               node render.mjs --frame-list 0,120,360 --stills out/check
//   Video segment:               node render.mjs --range 0:6164 --out out/seg.mp4      (frames [a,b))
//   Options: --w 1280 (active width, height = w/2.39) --q 0.93 (jpeg quality) --shotsfile /shotlist/x.json
//
// Serves the project root (mv-countless-tonights/) over a local HTTP server and drives Chromium (SwiftShader).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const W = +(args.w || 1280);
const Q = +(args.q || 0.93);

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=8192'] });
const page = await browser.newPage({ viewport: { width: W, height: Math.round(W / 2.39 / 2) * 2 } });
const logs = [];
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning' || /ready|shots from/.test(t)) { if (!/GPU stall|GL Driver Message/.test(t)) { logs.push(`[${m.type()}] ${t}`); if (args.verbose) console.log(`[${m.type()}] ${t}`); } } });
page.on('pageerror', (e) => { logs.push('[pageerror] ' + e.message); console.log('[pageerror]', e.message); });
const url = `http://127.0.0.1:${port}/previz/index.html?w=${W}` + (args.shotsfile ? `&shots=${encodeURIComponent(args.shotsfile)}` : '');
await page.goto(url);
await page.waitForFunction(() => window.PREVIZ && window.PREVIZ.ready, null, { timeout: 120000 });
const info = await page.evaluate(() => ({ W: PREVIZ.W, H: PREVIZ.H, TOTAL: PREVIZ.TOTAL, n: PREVIZ.shots.length }));

async function grab(f) {
  const url = await page.evaluate(async ([f, q]) => { const r = await PREVIZ.renderFrame(f); return [r, document.querySelector('canvas').toDataURL('image/jpeg', q)]; }, [f, Q]);
  return { meta: url[0], buf: Buffer.from(url[1].split(',')[1], 'base64') };
}

const t0 = Date.now();
if (args.stills) {
  fs.mkdirSync(args.stills, { recursive: true });
  let jobs = [];
  if (args.shots) {
    const us = String(args.u || '0.1,0.5,0.9').split(',').map(Number);
    for (const id of String(args.shots).split(',')) for (const u of us) {
      const f = await page.evaluate(([id, u]) => PREVIZ.frameOf(id, u), [id, u]);
      jobs.push({ f, name: `${id}_u${u.toFixed(2)}_f${String(f).padStart(5, '0')}.jpg` });
    }
  }
  if (args['frame-list']) for (const f of String(args['frame-list']).split(',').map(Number)) jobs.push({ f, name: `f${String(f).padStart(5, '0')}.jpg` });
  if (args.every) { const step = +args.every; const [a, b] = String(args.range || `0:${info.TOTAL}`).split(':').map(Number); for (let f = a; f < b; f += step) jobs.push({ f, name: `f${String(f).padStart(5, '0')}.jpg` }); }
  for (const j of jobs) {
    const { meta, buf } = await grab(j.f);
    const out = path.join(args.stills, j.name.startsWith('f') ? `${j.name.slice(0, -4)}_${meta.shot}.jpg` : j.name);
    fs.writeFileSync(out, buf);
    console.log('wrote', out);
  }
} else if (args.out) {
  const [a, b] = String(args.range || `0:${info.TOTAL}`).split(':').map(Number);
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '24', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', String(args.crf || 16), '-tune', 'film', '-pix_fmt', 'yuv420p', '-r', '24', args.out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    const { buf } = await grab(f);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - a) % 48 === 47) { const el = (Date.now() - t0) / 1000; console.log(`frame ${f + 1}/${b}  ${((f - a + 1) / el).toFixed(2)} fps  eta ${((b - f - 1) / ((f - a + 1) / el) / 60).toFixed(1)} min`); }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', args.out);
}
const errs = await page.evaluate(() => PREVIZ.errors());
if (errs.length) { console.log('RENDER ERRORS:'); for (const e of [...new Set(errs)].slice(0, 40)) console.log('  ', e); }
const bad = logs.filter((l) => /error|pageerror/i.test(l));
if (bad.length) { console.log('CONSOLE ERRORS:'); for (const l of [...new Set(bad)].slice(0, 40)) console.log('  ', l.slice(0, 400)); }
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s  (${info.W}x${info.H}, ${info.n} shots, ${info.TOTAL} frames)`);
await browser.close();
server.close();
