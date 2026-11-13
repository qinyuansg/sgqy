// Render the soundtrack to WAV:  node tools/render_audio.cjs <url> <out.wav>
const { chromium } = require('playwright'); const fs = require('node:fs');
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('pageerror:', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await p.goto(url + '?t=0.5'); await p.evaluate(() => window.__ready);
  const t0 = Date.now();
  const b64 = await p.evaluate(() => window.__audio());
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('audio rendered in', (Date.now() - t0) / 1000, 's');
  await b.close();
})();
