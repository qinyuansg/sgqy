// Dump the UC2 / UC5 frame anchors (key UI rects in frame px) from the isms-mvp-figma frame modules.
// Run with DEMO_CLEAN=1 so the layout matches the clean film frames.
// node tools/anchors.mjs <isms-mvp-figma dir> <V11 assets dir> <out.json>
import path from 'path';
import fs from 'fs';
const [repo, assets, out] = process.argv.slice(2).map(p => path.resolve(p));
const { useFont } = await import(path.join(repo, 'lib/svg.mjs'));
const { useAssets } = await import(path.join(repo, 'lib/v11.mjs'));
useFont('Roboto', 'roboto-widths.json');   // resolved against the repo's lib/
useAssets(assets);
const anchors = {};
for (const m of ['screens-v11/demo/uc2-agilfence.mjs', 'screens-v11/demo/uc5-incidents.mjs']) {
  const mod = await import(path.join(repo, m));
  for (const [name, fn] of mod.FRAMES) { mod.setFrame(name); fn(); }
  mod.setFrame(null);
  Object.assign(anchors, mod.ANCHORS);
}
fs.writeFileSync(out, JSON.stringify(anchors, null, 1));
console.log(Object.keys(anchors).length, 'frames with anchors →', out);
