// Render scenario-deck scenes and panels from index.html with Playwright.
//   node render.mjs scene pov '{"mood":"calm"}' out.png [scale]
//   node render.mjs panel briefing '{}' out.png [scale]      (transparent PNG + out.json with highlight boxes)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));

export async function renderAll(jobs) {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--disable-gpu'] });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: j.scale || 1 });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    const url = 'file://' + path.join(HERE, 'index.html') + `?${j.kind}=${j.name}&opts=${encodeURIComponent(JSON.stringify(j.opts || {}))}`;
    await page.goto(url);
    await page.waitForFunction(() => window.READY === true);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    if (errs.length) throw new Error(j.name + ': ' + errs.join('\n'));
    if (j.kind === 'scene') {
      const clip = j.clip ? { x: j.clip[0], y: j.clip[1], width: j.clip[2], height: j.clip[3] } : { x: 0, y: 0, width: 1920, height: 1080 };
      await page.screenshot({ path: j.out, clip, type: j.out.endsWith('.jpg') ? 'jpeg' : 'png', quality: j.out.endsWith('.jpg') ? 90 : undefined });
      const marks = await page.evaluate(() => Array.from(document.querySelectorAll('[data-mark]')).map(n => { const r = n.getBoundingClientRect(); return { id: n.dataset.mark, x: r.left / 1920, y: r.top / 1080, w: r.width / 1920, h: r.height / 1080 }; }));
      if (marks.length) fs.writeFileSync(j.out.replace(/\.(png|jpg)$/, '.json'), JSON.stringify({ marks }, null, 1));
    } else {
      const el = await page.$('#panel');
      const box = await el.boundingBox();
      await page.setViewportSize({ width: Math.ceil(box.width), height: Math.max(1080, Math.ceil(box.height)) });
      const b2 = await el.boundingBox();
      // highlight / anchor boxes, relative to the panel image (0..1)
      const marks = await page.evaluate(() => {
        const r0 = document.getElementById('panel').getBoundingClientRect();
        return Array.from(document.querySelectorAll('[data-mark]')).map(n => {
          const r = n.getBoundingClientRect();
          return { id: n.dataset.mark, x: (r.left - r0.left) / r0.width, y: (r.top - r0.top) / r0.height, w: r.width / r0.width, h: r.height / r0.height };
        });
      });
      await el.screenshot({ path: j.out, omitBackground: true });
      fs.writeFileSync(j.out.replace(/\.png$/, '.json'), JSON.stringify({ w: b2.width, h: b2.height, marks }, null, 1));
    }
    await page.close();
    console.log('rendered', path.basename(j.out));
  }
  await browser.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [kind, name, opts, out, scale] = process.argv.slice(2);
  await renderAll([{ kind, name, opts: JSON.parse(opts || '{}'), out, scale: +(scale || 1) }]);
}
