#!/usr/bin/env node
// Smoke test for the environment kit: constructs every helper, updates it and renders once (shader compile check).
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'text/html' }); res.end(d); }); }).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage(); let errs = 0;
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { if (/GPU stall/.test(m.text())) return; errs++; console.log('[' + m.type() + ']', m.text().slice(0, 300)); } });
page.on('pageerror', (e) => { errs++; console.log('[pageerror]', e.message); });
await page.goto(`http://127.0.0.1:${server.address().port}/previz/index.html?w=320&shots=/previz/test_shots.json`);
await page.waitForFunction(() => window.PREVIZ && window.PREVIZ.ready);
const out = await page.evaluate(async () => {
  const THREE = await import('three');
  const TX = await import('/previz/lib/textures.js'), FX = await import('/previz/lib/fx.js'), SK = await import('/previz/lib/sky.js'), SE = await import('/previz/lib/sea.js'), GL = await import('/previz/lib/glass.js'), EN = await import('/previz/lib/env.js');
  const renderer = new THREE.WebGLRenderer(); renderer.setSize(320, 134); renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(40, 320 / 134, 0.05, 6000); cam.position.set(0, 1.6, 4); cam.lookAt(0, 1, 0);
  const log = [];
  const tryit = (name, fn) => { try { const r = fn(); log.push(name + ' ok'); return r; } catch (e) { log.push(name + ' FAIL ' + e.message); return null; } };
  const sky = tryit('sky', () => SK.createSky({ preset: 'night' })); scene.add(sky.object3D);
  tryit('sky.blend', () => sky.blend('predawn', 'dawn', 0.4)); tryit('sky.set', () => sky.set({ moonElev: 20 })); tryit('sky.lights', () => { const l = sky.makeLights({ castShadow: true }); scene.add(l.moon, l.hemi); });
  tryit('moonSprite', () => scene.add(SK.moonSprite({ size: 2 }).object3D));
  const sea = tryit('sea', () => SE.createSea({ sky, swell: 'storm' })); scene.add(sea.object3D);
  tryit('coast', () => scene.add(SE.createCoast({ sky }).object3D));
  tryit('sea.pose', () => sea.poseAt(1, 2, 0.3, 5));
  const fx = [];
  for (const [n, f] of Object.entries({
    glow: () => FX.glow(), shaft: () => FX.windowShaft({ cookie: TX.windowCookie().map }), wlight: () => FX.windowLight({ cookie: TX.windowCookie({ pattern: 'louvre' }).map }),
    wlightCol: () => FX.windowLight({ cookie: TX.stainedGlass().cookie, colored: true }), beam: () => FX.beamCone(), dust: () => FX.dustMotes({ beam: { cone: { origin: [0, 3, 0], dir: [0, -1, 0], angle: 0.4, length: 4 } } }),
    candle: () => FX.candle({ state: 'D' }), steam: () => FX.steam(), rain: () => FX.rain(), drips: () => FX.drips(), ripples: () => FX.ripples({ rainRate: 3 }),
    spray: () => FX.seaSpray({ burst: { origin: [0, 1, -3], dir: [0, 1, 1], count: 30 } }), fog: () => FX.fogCards(), lanternHorn: () => FX.lantern(), lanternPaper: () => FX.lantern({ style: 'paper' }),
    lanternGlass: () => FX.lantern({ style: 'glass' }), lanternShip: () => FX.lantern({ style: 'ship' }), oilLamp: () => FX.oilLamp(),
  })) { const o = tryit(n, f); if (o) { scene.add(o.object3D); fx.push(o); } }
  const v = tryit('vitrine', () => GL.vitrine({ front: { nested: TX.noiseTexture(), nestedMode: 'screen' } })); if (v) { scene.add(v.object3D); v.setWipe({ points: [[0.1, 0.5], [0.9, 0.5]], width: 0.1 }, 0.5); }
  tryit('vitrineStrip', () => scene.add(GL.vitrine({ light: 'strip', frame: 0.01, deck: 'natural' }).object3D));
  const K = tryit('shards', () => TX.bowlShards());
  for (const mode of ['shard', 'cracked', 'missing']) tryit('shard-' + mode, () => scene.add(new THREE.Mesh(K.geometry, K.material(mode === 'shard' ? 'A' : -1, { mode, hide: ['MISSING'] }))));
  for (const k of ['wood_ship', 'teak', 'camphor', 'wood_smoke', 'pew', 'lacquer', 'plaster', 'plaster_museum', 'stone', 'stone_dark', 'terrazzo', 'brick', 'brick_render', 'granite', 'tiles_clay', 'tiles_terracotta', 'chart', 'brass', 'bronze', 'compass', 'porcelain_bowl', 'porcelain_tile', 'cotton', 'linen_coat', 'floral', 'indigo', 'indigo_patch', 'rattan', 'letter', 'oilpaper', 'salt', 'stained_glass', 'velvet', 'wool_coat', 'shirt', 'linen'])
    tryit('mat:' + k, () => scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), TX.mat(k))));
  for (const p of EN.ENV_PRESETS) tryit('env:' + p, () => EN.envTexture(renderer, p));
  tryit('compassText', () => TX.compassFace({ bearings: 'text', state: 'then' }));
  for (const T of [0.5, 3.7]) { sky.update(T); sea.update(T, cam); fx.forEach((o) => o.update(T, { camera: cam })); renderer.render(scene, cam); }
  return { log: log.filter((l) => /FAIL/.test(l)), n: log.length, programs: renderer.info.programs.length };
});
console.log(JSON.stringify(out, null, 1)); console.log('console errors/warnings:', errs);
await browser.close(); server.close();
