// Render every image the scenario deck needs into one folder:
//   backgrounds (2560×1440 JPEG), product panels (transparent PNG + mark boxes), the AI orb,
//   the pointer, the team portraits and the noise→clarity split.
//   node deck/scenes/build_assets.mjs <outDir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { renderAll } from './render.mjs';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const OUT = path.resolve(process.argv[2] || 'build/scenario-assets');
fs.mkdirSync(OUT, { recursive: true });
const o = f => path.join(OUT, f);
const BG = 4 / 3, PAN = 1.6;

const kpisNight = [['312', 'alarms / hour', '#FF6B81'], ['3', 'incidents', '#FFCB6B'], ['14', 'departures', '#8FB4FF']];
const kpisMorning = [['3', 'incidents · closed', '#2ED47A'], ['0', 'open', '#8FB4FF'], ['1', 'work order', '#FFCB6B']];
const scenes = [
  ['bg_title', 'overlook', { who: 'none', time: '02:14', kpis: kpisNight, bandH: 560, bandStop: 40 }],
  ['bg_pain', 'pov', { mood: 'stress', time: '02:14' }],
  ['bg_calm_right', 'pov', { mood: 'calm', time: '02:14', px: 1250 }],
  ['bg_brief', 'pov', { mood: 'calm', time: '22:00', kpis: [['0', 'open alarms', '#2ED47A'], ['2', 'carried over', '#FFCB6B'], ['14', 'departures', '#8FB4FF']] }],
  ['bg_0214', 'pov', { mood: 'calm', time: '02:14' }],
  ['bg_0215', 'pov', { mood: 'calm', time: '02:15' }],
  ['bg_0216', 'pov', { mood: 'calm', time: '02:16' }],
  ['bg_daniel', 'overlook', { who: 'daniel', time: '02:15', kpis: kpisNight }],
  ['bg_daniel510', 'overlook', { who: 'daniel', time: '05:10', kpis: [['11', 'min · CP3 peak', '#2ED47A'], ['2', 'lanes opened', '#8FB4FF'], ['1', 'work order', '#FFCB6B']] }],
  ['bg_grace', 'overlook', { who: 'grace', time: '07:00', date: 'Fri, 9 Oct 2026', wx: '26°C · Clear', kpis: kpisMorning }],
  ['bg_vision', 'overlook', { who: 'none', time: '07:05', date: 'Fri, 9 Oct 2026', wx: '26°C · Clear', kpis: kpisMorning }],
  ['bg_terminal', 'terminal', {}],
];
const panels = ['briefing', 'triage', 'situation', 'response', 'monitor', 'investigate', 'dispatch', 'forecast', 'report', 'orb', 'cursor'];

await renderAll([
  ...scenes.map(([n, s, opts]) => ({ kind: 'scene', name: s, opts, out: o(n + '.png'), scale: BG })),
  ...panels.map(n => ({ kind: 'panel', name: n, opts: n === 'cursor' ? { tight: true } : {}, out: o('p_' + n + '.png'), scale: n === 'cursor' ? 2 : PAN })),
]);
// the split frame needs the two rendered halves
await renderAll([{ kind: 'scene', name: 'split', opts: { left: 'file://' + o('bg_pain.png'), right: 'file://' + o('bg_calm_right.png') }, out: o('bg_split.png'), scale: BG }]);

// backgrounds → JPEG; panels → palette PNG (much smaller, alpha kept)
for (const [n] of [...scenes, ['bg_split']]) {
  await sharp(o(n + '.png')).jpeg({ quality: 86, mozjpeg: true }).toFile(o(n + '.jpg'));
}
for (const n of panels) {
  const src = o('p_' + n + '.png'), tmp = src + '.tmp';
  await sharp(src).png({ palette: true, quality: 92, effort: 9, dither: 0.6 }).toFile(tmp);
  fs.renameSync(tmp, src);
}
// team portraits: 3:4 crops around each person (frame px at 1920 scale)
const tiles = [['t_nurul', 'bg_0214', [225, 300, 600, 780]], ['t_daniel', 'bg_daniel', [250, 300, 600, 780]], ['t_arjun', 'bg_terminal', [90, 300, 600, 780]], ['t_grace', 'bg_grace', [300, 300, 600, 780]]];
for (const [n, src, [x, y, w, h]] of tiles) {
  await sharp(o(src + '.png')).extract({ left: Math.round(x * BG), top: Math.round(y * BG), width: Math.round(w * BG), height: Math.round(h * BG) }).jpeg({ quality: 86, mozjpeg: true }).toFile(o(n + '.jpg'));
}
for (const [n] of [...scenes, ['bg_split']]) fs.rmSync(o(n + '.png'));
console.log('assets →', OUT);
