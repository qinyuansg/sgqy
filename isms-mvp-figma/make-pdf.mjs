// One PDF page per SVG frame, each page sized to its frame (vector, fonts embedded).
// Pages are printed one by one, then merged (python3 + pypdfium2).
// Usage: node make-pdf.mjs <outDir> [pdfName]
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const dir = path.resolve(process.argv[2]);
const pdfName = process.argv[3] || 'ISMS_MVP_Figma_frames.pdf';
const files = fs.readdirSync(path.join(dir, 'svg')).filter(f => f.endsWith('.svg')).sort();
const tmp = path.join(dir, 'pdfpages'); fs.mkdirSync(tmp, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage();
const parts = [];
for (const f of files) {
  const head = fs.readFileSync(path.join(dir, 'svg', f), 'utf8').slice(0, 400);
  const w = +head.match(/width="(\d+)"/)[1], h = +head.match(/height="(\d+)"/)[1];
  fs.writeFileSync(path.join(dir, 'page.html'), `<!doctype html><html><head><style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0}img{display:block;width:${w}px;height:${h}px}</style></head><body><img src="svg/${f}"></body></html>`);
  await p.setViewportSize({ width: w, height: h });
  await p.goto('file://' + path.join(dir, 'page.html'), { waitUntil: 'networkidle' });
  const out = path.join(tmp, f.replace('.svg', '.pdf'));
  await p.pdf({ path: out, width: w + 'px', height: h + 'px', printBackground: true });
  parts.push(out);
}
await b.close();
execFileSync('python3', ['-c', `
import sys, pypdfium2 as p
out = p.PdfDocument.new()
for f in sys.argv[2:]:
    out.import_pages(p.PdfDocument(f))
out.save(sys.argv[1])
`, path.join(dir, pdfName), ...parts]);
console.log('pdf', pdfName, parts.length, 'pages');
