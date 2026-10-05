#!/usr/bin/env node
// Per-frame render timing:  node tools/bench.mjs --shotsfile /previz/out/lab/x_shots.json --frames 0,1,2,3 [--w 1280]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const W = +(args.w || 1280);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: Math.round(W / 2.39 / 2) * 2 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:${server.address().port}/previz/index.html?w=${W}&shots=${encodeURIComponent(args.shotsfile)}${args.q ? '&' + args.q : ''}`);
await page.waitForFunction(() => window.PREVIZ && window.PREVIZ.ready, null, { timeout: 120000 });
const frames = String(args.frames || '0,1,2,3').split(',').map(Number);
page.on('console', (m) => { if (args.verbose && m.type() === 'log') console.log('[log]', m.text().slice(0, 300)); });
if (args.out) fs.mkdirSync(args.out, { recursive: true });
for (const f of frames) {
  const [ms, url] = await page.evaluate(async ([f, save]) => { const t0 = performance.now(); await PREVIZ.renderFrame(f); const c = document.querySelector('canvas'); const gl = c.getContext('webgl2'); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const ms = performance.now() - t0; return [ms, save ? c.toDataURL('image/jpeg', 0.92) : null]; }, [f, !!args.out]);
  console.log(`frame ${f}: ${ms.toFixed(0)} ms`);
  if (url) fs.writeFileSync(path.join(args.out, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
}
const errs = await page.evaluate(() => PREVIZ.errors()); if (errs.length) console.log('RENDER ERRORS', errs.slice(0, 5));
await browser.close(); server.close();
