// Screenshot every scene in its fully-built state for layout review.
// NODE_PATH=/opt/node-tools/node_modules node snap.js <page.html> <outdir>
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [,, pageFile, outDir] = process.argv; fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto('file://' + path.resolve(pageFile), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const starts = await page.evaluate(() => window.__sceneStart);
  const dur = await page.evaluate(() => window.__duration());
  const ids = Object.keys(starts);
  for (let i = 0; i < ids.length; i++) {
    const next = i + 1 < ids.length ? starts[ids[i + 1]] : dur;
    const t = next - 1.0; // just before fade-out: everything built
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: path.join(outDir, `${String(i).padStart(2, '0')}_${ids[i]}.jpg`), type: 'jpeg', quality: 85 });
  }
  console.log('snapped', ids.length, 'scenes; total', dur.toFixed(1), 's'); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
