// usage: node render_par.cjs <svgDir> <pngDir> <workers>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [inDir, outDir, nw = '4'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(inDir).filter(f => f.endsWith('.svg')).sort();
  const browser = await chromium.launch();
  let next = 0;
  const worker = async () => {
    const page = await (await browser.newContext({ viewport: { width: 1040, height: 1765 }, deviceScaleFactor: 1 })).newPage();
    while (next < files.length) {
      const f = files[next++];
      await page.goto('file://' + path.resolve(inDir, f));
      await page.screenshot({ path: path.join(outDir, f.replace('.svg', '.png')) });
    }
  };
  await Promise.all(Array.from({ length: +nw }, worker));
  await browser.close();
  console.log('rendered', files.length);
})().catch(e => { console.error(e); process.exit(1); });
