# previz — shared issue log (append only)

## [sea_deck] engine/post.js film-grain hash loses float precision at late frame numbers
`hash(uv * res + frame * 17.13)` feeds values of ~2e4 (f1079) … ~1e5 (f5000+) into `fract(p * 443.897)`: past ~1.6e7 the
float32 product has no fractional bits left, so the grain degenerates into a visible regular grid of horizontal/vertical
stripes (clearly visible in the sky of S008 at f1079) and, at frames > ~4000, into an almost constant offset (no grain).
Every module is affected in proportion to its frame number. Suggested fix (engine owner): wrap the frame term, e.g.
`hash(uv * res + mod(frame, 97.0) * 17.13)` / `mod(frame, 89.0) * 3.7`, or hash `floor(gl_FragCoord.xy)` with an integer
frame seed. sea_deck does not work around it (it can only lower `grain`).

## [ship_cabin] textures.js `chart()` draws a European compass rose + rhumb-line network (not a 针路图)
`TX.chart()` always draws a 16/8/4-point rose at `p.rose` plus a portolan-style rhumb network from 9 roses; S004's
continuity explicitly says "针路图不画欧式罗盘玫瑰", and the T03 registration needs a twin-peaked islet at frame
(0.62, 0.40), a dotted route from (0.15, 0.70) and the coast along the top — none of which `chart()` can place.
Workaround: `scenes/ship_cabin.js` exports `needleChart('then' | 'museum')` (2048×1092 card, mountain-profile coast,
islands, reef dots, black dotted route, illegible annotation marks; 'museum' adds foxing #A8875A, toned tissue repairs,
faded ink) and `T03` (the frame registration). **museum_gallery S004 should use `needleChart('museum')` on a
0.60 × 0.32 m plane laid out like ship_cabin's `chartGrp`** (chart x 0.05–0.95 of frame, lower edge at y 0.88,
50 mm top-down at 0.926 m) so the S004→S005 match cut lines up exactly. Suggested lib fix: a `rose:false, rhumbs:false`
option or move needleChart into textures.js.

## [ship_cabin] textures.js `compassFace()` ring order differs from the bible (PROP_COMPASS)
Bible §6.2: well → trigrams → 24 bearings → **outermost** ring of 28 star marks. `compassFace()` draws trigrams (r .21),
**stars (r .26–.32) inside** the 24-bearing ring (r .34–.43). S006's text ("outer ring of star points sharp in the
foreground, bearing ring beyond") assumes the bible order. ship_cabin keeps the library face (so the in-use and museum
compasses in S003/S006/S009 are the same object) and frames S006 so the star ring is the sharp band with the bearing glyphs
soft in front. If the order is fixed in the lib, S006 needs no change (it targets the dial region, not the ring radius).

## [ship_cabin] figure cloth sheen blows out to white under a close practical
With the horn lantern (PointLight/SpotLight ~0.2–0.8 cd) 15–25 cm from the NAVIGATOR's indigo jacket, the
MeshPhysicalMaterial sheen term of the garments reads near-white across the whole sleeve/chest (seen in early S007 tests),
while the face skin is fine. Workaround in ship_cabin: practicals are cheated ≥ 40 cm from the figure per shot.
Suggested lib fix: clamp/scale `sheen` (or sheenColor) for dark fabrics, or make it energy-limited.

## pier_waiting (scene agent) — notes, not blockers (worked around in scenes/pier_waiting.js)
- **sky.js dome vs. far geometry.** The dome writes `p.z = 0.99999·w`. If a module raises `sky.object3D.renderOrder` to draw the
  dome *after* the opaque set (saves shading sky pixels that are hidden indoors), a `createCoast` silhouette at ≥ 3 km ties with
  the dome's depth (near 0.03, far 6000) and the dome paints over the land. Workaround: keep `renderOrder = -1000` (default) in
  shots that show a coast; pier_waiting switches it per shot. Suggestion: write the dome at `w * 0.999999` or document the order.
- **makeCrowd / makeExtra extras use the full procedural cloth/skin materials.** For soft-focus or distant crowds this is most of
  the crowd's per-pixel cost. pier_waiting swaps each baked part to a plain `MeshLambertMaterial` of the same colour (visually
  identical at crowd sizes / under DOF). Suggestion: a `makeCrowd(era, people, { plain: true })` option.

## [restoration_lab] textures.js `bowlShards()` default layout breaks the PROP_SHARDS locks
Measured on the outer surface (CPU replica of the shader's weighted Voronoi, without the jag): the default seeds make
**MISSING a ~6 × 5 cm hole that reaches the lip** (φ ≈ 318°–352°, s 0.056 → rim), so the restored bowl loses part of the
plum band (bible §6.3: missing piece 2.5 × 3 cm in the plain zone, rim band continuous); and the band crossings at
φ 118.5°, 283.5° and 352.5° fall 1.8–3° from blossom centres (blossoms at 4.5° + 23.4°·k, ≈3 mm radius + 2.2 mm jag) →
**cracks through blossoms**. Workaround in `scenes/restoration_lab.js` (`SHARD_LAYOUT`): rim seeds B/C/D placed near the
axis above the rim (ρ 3.4 cm, y 11.6 cm, w 0.00594) so their mutual cracks are radial planes landing exactly on bud
positions (63.0°, 180.0°, 320.4°); E/F side seeds at f 0.375 (w 0.0015) keep side A (boat + moon) and side B (window) whole;
MISSING at (0°, f 0.61, w −0.002) ≈ 1.5 × 3 cm in the plain +Z zone. Suggest adopting it as the default layout.
Also: every shard mesh rasterises the WHOLE bowl and discards the other cells (8 shard meshes in one CU ≈ 8× the
fragment work) and the shadow pass ignores the discard (each shard casts a full-bowl shadow). restoration_lab splits
the lathe index per cell on the CPU (generous margin; the shader still cuts the jagged edge). Suggest doing that in
`bowlShards()` (`pieces[i].geometry`) plus a matching `customDepthMaterial`.

## [restoration_lab] perf measurement on a shared machine
`render.mjs` s/frame swings 2–3× with other agents rendering (load 6–11 on 4 cores). Wall time per frame divided by an
adjacent engine EMPTY frame (`out/lab/perf_shots.json` frame 0, 0.34 s idle) is a usable load-independent estimate:
`node out/check/rl_bench3.mjs --frames … --rounds 3` (interleaved, median of the ratios).

## [character kit] RESOLVED in fig-2 (2026-10-05): cloth sheen blow-out under a close practical ([ship_cabin] above)
`clothMaterial` sheen is now tinted by the fabric's own colour and its strength is capped by the fabric's luminance, so
indigo / black cloth next to a practical stays indigo / black (lab check: `_lab_polish` SHEEN, NAVIGATOR jacket with a
0.5 cd point light 15–20 cm from the cloth). The "≥ 40 cm" cheat in ship_cabin is no longer needed but harmless. Library re-baked; see
`previz/lib/CHANGES.md` for everything else that changed in the character kit (no API changes).
