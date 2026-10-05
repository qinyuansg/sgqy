#!/usr/bin/env node
// Dump procedural textures from lib/textures.js to PNG/JPG for inspection.
//   node tools/texdump.mjs --out out/lab/tex --calls 'wood({tone:"ship"})' 'chart()' ...
// Each call is evaluated as T.<call> inside the page; every THREE.Texture found in the result is saved.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const oi = argv.indexOf('--out'); const out = oi >= 0 ? argv[oi + 1] : 'out/lab/tex';
const ci = argv.indexOf('--calls'); const calls = ci >= 0 ? argv.slice(ci + 1) : [];
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[' + m.type() + ']', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/previz/index.html?w=64&shots=/previz/test_shots.json`);
await page.waitForFunction(() => window.PREVIZ && window.PREVIZ.ready, null, { timeout: 60000 });
fs.mkdirSync(out, { recursive: true });
for (const call of calls) {
  const res = await page.evaluate(async (call) => {
    const T = await import('/previz/lib/textures.js');
    const t0 = performance.now();
    const r = eval('T.' + call);
    const ms = performance.now() - t0;
    const outs = [];
    const add = (k, t) => { if (t && t.isTexture && t.image && t.image.toDataURL) outs.push([k, t.image.toDataURL('image/png')]); };
    if (r && r.isTexture) add('map', r); else if (r) for (const [k, v] of Object.entries(r)) add(k, v);
    return { ms, outs };
  }, call);
  const base = call.replace(/[^a-z0-9]+/gi, '_').replace(/_+$/, '');
  for (const [k, url] of res.outs) { const f = path.join(out, `${base}__${k}.png`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', f); }
  console.log(call, res.ms.toFixed(0), 'ms');
}
await browser.close(); server.close();
