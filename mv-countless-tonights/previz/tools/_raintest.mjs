import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = '/home/user/sgqy/mv-countless-tonights';
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'text/html' }); res.end(d); }); }).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[' + m.type() + ']', m.text().slice(0, 500)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/previz/index.html?w=320&shots=/previz/out/lab/rain_shots.json`);
await page.waitForFunction(() => window.PREVIZ && window.PREVIZ.ready);
const r = await page.evaluate(async () => {
  const THREE = await import('three'); const FX = await import('/previz/lib/fx.js');
  const renderer = new THREE.WebGLRenderer(); renderer.setSize(320, 134);
  const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(40, 320 / 134, 0.05, 100); cam.position.set(0, 1.5, 4); cam.lookAt(0, 1.5, 0);
  const rr = FX.rain({ center: [0, 1.6, 0], size: [4, 3, 4], count: 3000, intensity: 1.0, width: 0.02 }); scene.add(rr.object3D); rr.update(1.0);
  const out = {};
  for (const mode of ['orig', 'frag1', 'pos']) {
    const m = rr.material;
    if (mode === 'frag1') { m.fragmentShader = 'void main(){ gl_FragColor = vec4(1.0); }'; m.needsUpdate = true; }
    if (mode === 'pos') { m.vertexShader = m.vertexShader.replace('gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);', 'gl_Position = projectionMatrix * viewMatrix * vec4(p + vec3(position.xy * 0.05, 0.0), 1.0);'); m.needsUpdate = true; }
    renderer.render(scene, cam);
    const gl = renderer.getContext(); const px = new Uint8Array(320 * 134 * 4); gl.readPixels(0, 0, 320, 134, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i]; out[mode] = s;
  }
  out.u = Object.fromEntries(Object.entries(rr.material.uniforms).map(([k, v]) => [k, v.value && v.value.toArray ? v.value.toArray() : v.value]));
  return out;
  renderer.render(scene, cam);
  const gl = renderer.getContext(); const px = new Uint8Array(320 * 134 * 4); gl.readPixels(0, 0, 320, 134, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i];
  const prog = renderer.info.programs.map((p) => p.name || p.cacheKey.slice(0, 40));
  return { sum: s, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, prog };
});
console.log(JSON.stringify(r));
await browser.close(); server.close();
