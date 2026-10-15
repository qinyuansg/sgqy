// Rasterise the stylised CCTV scenes into "camera-like" JPEGs (grain, softness, vignette, OSD).
// Usage: node render-cctv.mjs <outDir> [filter]   (filter: only scenes whose name contains it; meta.json is merged)
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { SCENES, portrait } from './lib/cctv.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');

const out = path.resolve(process.argv[2] || 'out/cctv');
fs.mkdirSync(out, { recursive: true });

const page_ = (svg, w, h, o) => `<!doctype html><html><head><style>
  html,body{margin:0;background:#000;width:${w}px;height:${h}px;overflow:hidden}
  #v{position:absolute;inset:0;filter:${o.mono ? 'grayscale(1) contrast(1.12) brightness(1.05)' : 'saturate(.72) contrast(1.06) brightness(1.04)'} blur(${o.blur ?? 0.55}px)}
  #v svg{width:${w}px;height:${h}px;display:block}
  canvas{position:absolute;inset:0;mix-blend-mode:overlay;opacity:${o.grain ?? 0.55}}
  #vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 48%,rgba(0,0,0,0) 55%,rgba(0,0,0,.5) 100%)}
  #osd{position:absolute;left:18px;top:auto;bottom:16px;font:600 ${Math.round(w / 64)}px 'DejaVu Sans Mono',monospace;color:rgba(238,244,255,.9);letter-spacing:1px;text-shadow:0 1px 2px rgba(0,0,0,.8);white-space:pre;background:rgba(0,0,0,.42);padding:6px 10px;border-radius:3px}
</style></head><body><div id="v">${svg}</div><canvas id="c" width="${w}" height="${h}"></canvas><div id="vig"></div>${o.osd ? `<div id="osd">${o.osd}\n${o.ts}</div>` : ''}
<script>
  const c=document.getElementById('c'),x=c.getContext('2d'),d=x.createImageData(c.width,c.height);
  let s=1234567;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<d.data.length;i+=4){const v=128+(r()-.5)*120;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
  x.putImageData(d,0,0);
</script></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const only = process.argv[3];
const metaPath = path.join(out, 'meta.json');
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
for (const [name, fn] of Object.entries(SCENES)) {
  if (only && !name.includes(only)) continue;
  const sc = fn();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(page_(sc.svg, 1280, 720, sc), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 });
  // clean variant (no burned-in OSD) for re-use under a different camera label
  await page.setContent(page_(sc.svg, 1280, 720, { ...sc, osd: '' }), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, name + '_clean.jpg'), type: 'jpeg', quality: 80 });
  meta[name] = { boxes: sc.boxes, osd: sc.osd, ts: sc.ts };
  console.log('scene', name);
}
for (const k of only ? [] : ['a17', 'c2', 'live', 'ref']) {
  const sc = portrait(k);
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(page_(sc.svg, 512, 512, { grain: k === 'ref' ? 0.15 : 0.6, blur: k === 'ref' ? 0.2 : 1.2 }), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, 'face_' + k + '.jpg'), type: 'jpeg', quality: 80 });
  console.log('portrait', k);
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
await browser.close();
