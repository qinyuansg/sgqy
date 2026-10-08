// Burn bilingual subtitles: render each cue as a transparent PNG (Chromium, real
// fonts incl. Noto Sans SC), assemble a timed overlay track, composite it.
// node tools/subs.mjs --in build/master.mp4 --out build/master_subs.mp4
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD = process.env.BUILD || path.join(ROOT, 'build');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const input = arg('in'), output = arg('out');
const cues = JSON.parse(fs.readFileSync(path.join(BUILD, 'subs', 'cues.json'), 'utf8'));
const dir = path.join(BUILD, 'subs', 'png');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(ROOT, 'src', 'subs.html'));
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => window.showCue('', ''));
await page.screenshot({ path: path.join(dir, 'blank.png'), omitBackground: true });
for (let i = 0; i < cues.length; i++) {
  await page.evaluate(([en, zh]) => window.showCue(en, zh), [cues[i].en, cues[i].zh]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dir, `c${String(i).padStart(3, '0')}.png`), omitBackground: true });
}
await browser.close();

const total = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input]).toString();
const lines = ['ffconcat version 1.0'];
let t = 0;
const push = (f, d) => { if (d > 0.0005) { lines.push(`file '${f}'`, `duration ${d.toFixed(3)}`); t += d; } };
cues.forEach((c, i) => {
  push('blank.png', c.start - t);
  push(`c${String(i).padStart(3, '0')}.png`, c.show_end - c.start);
});
push('blank.png', total - t);
lines.push(`file 'blank.png'`);
fs.writeFileSync(path.join(dir, 'list.ffconcat'), lines.join('\n') + '\n');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.ffconcat'),
  '-filter_complex', '[1:v]fps=30,format=rgba[s];[0:v][s]overlay=0:0:format=auto:shortest=1,format=yuv420p[v]',
  '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '60',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'copy', '-movflags', '+faststart', output]);
console.log(`${cues.length} cues burned → ${output}`);
