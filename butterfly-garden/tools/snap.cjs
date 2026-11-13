// Render selected frames to PNG for review:  node tools/snap.mjs <url> <outdir> t1 t2 ...
(async () => {
const { chromium } = require('playwright');
const fs = require('node:fs');
const [url, out, ...times] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(url + '?t=0.5');
await page.evaluate(() => window.__ready);
for (const t of times) {
  const t0 = Date.now();
  const data = await page.evaluate(tt => window.__frame(tt, 0.85), parseFloat(t));
  fs.writeFileSync(`${out}/f_${String(t).padStart(6, '0')}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
  console.log(t, Date.now() - t0, 'ms');
}
await browser.close();
})();
