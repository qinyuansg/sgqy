// The closed Incident Management state without the Export menu: the exported UC5-S7 frame shows Export
// hovered with its dropdown open, which the film never motivates (nobody clicks Export). This strips the
// menu, its footnote, its caret and the Export hover from the frame's SVG and renders the result at 2x.
// node tools/closed-frame.mjs <uiflow frames dir> <out png>   (reads <dir>/svg/UC5-S7-govern-closed-export.svg)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const [dir, out] = process.argv.slice(2).map(p => path.resolve(p));
if (!dir || !out) { console.error('usage: node tools/closed-frame.mjs <uiflow frames dir> <out png>'); process.exit(2); }
const src = path.join(dir, 'svg', 'UC5-S7-govern-closed-export.svg');
let svg = fs.readFileSync(src, 'utf8');

// remove a <g id="…"> element with its nested groups
const strip = id => {
  const open = `<g id="${id}"`;
  const a = svg.indexOf(open);
  if (a < 0) { console.error('group not found:', id); process.exit(1); }
  let i = a, depth = 0;
  const re = /<g\b|<\/g>/g;
  re.lastIndex = a;
  for (let m; (m = re.exec(svg));) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (depth === 0) { i = m.index + m[0].length; break; }
  }
  svg = svg.slice(0, a) + svg.slice(i);
};
['Dropdown_NEW', 'Export_footnote_NEW', 'Menu_caret_NEW', 'Button_hover_NEW'].forEach(strip);
for (const s of ['PDF report', 'CSV list', 'Carries current filters']) if (svg.includes(s)) { console.error('still present:', s); process.exit(1); }

const tmp = path.join(path.dirname(out), 'UC5-S7-govern-closed.svg');
fs.writeFileSync(tmp, svg);
const m = svg.match(/width="(\d+)" height="(\d+)"/);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: 2 });
  await page.goto('file://' + tmp);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out });
} finally { await browser.close(); }
fs.unlinkSync(tmp);
console.log('closed frame', m[1] + 'x' + m[2], '→', out);
