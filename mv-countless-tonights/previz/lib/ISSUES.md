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

## [chapel] fx.js `windowShaft` disappears while the camera is inside the prism
`mesh.onBeforeRender` switches `mat.side` FrontSide ↔ BackSide from the camera's position in prism space. In the chapel
crane move (S055/S056: one shaft prism over three west lancets, the camera descends from above the prism into it) the shaft
vanishes completely on every frame where the camera is inside (checked frame 4226/4238: nothing drawn; same frames with
`side = DoubleSide` and a no-op `onBeforeRender` show the shafts correctly). Probably the side switch is not picked up by
the program/state for the low-res pass (three r169 keys `flipSided`/`doubleSided` into the program parameters).
Workaround in `scenes/chapel.js`: `shaft.object3D.onBeforeRender = () => {}; shaft.material.side = THREE.DoubleSide;`
(the shader's `inside == gl_FrontFacing` test discards the wrong faces; cost difference not measurable here).
Suggested lib fix: DoubleSide by default (keep the shader test), or set `mat.needsUpdate` when the side changes.

## [harbor_eras] notes (worked around in scenes/harbor_eras.js; not blockers)
- **Grain stripes (see [sea_deck] above) also hit f1693–f5995.** Workaround usable by any module: set the engine `grain: 0` and
  add a full-screen multiplicative grain quad to the scene (ShaderMaterial, `blending: CustomBlending, blendSrc: DstColorFactor,
  blendDst: OneFactor`, output `vec3(g * amt)`, integer hash of `uvec2(gl_FragCoord.xy)` + `frame % 977` seed, `renderOrder 1e9`,
  `depthTest false`). ~0.04 s; result is `dst · (1 + g·amt)` on the linear HDR frame (amt ≈ 0.13–0.18 ≈ the engine's 0.035).
- **Sky dome / sea draw order.** With camera near ≥ 1 m and far 9000 there is no depth tie between the dome (0.99999·w) and
  geometry at ≤ 5.4 km, so `sky.object3D.renderOrder = 100` and `sea.object3D.renderOrder = 50` (after the opaque set) are safe
  and avoid shading hidden dome pixels. The projected sea grid still cost ~0.5 CPU-s per frame even as a thin far strip;
  a second `createSea({ cols: 96, rows: 40, defines: { NO_PPW: '', NO_VFOG: '' } })` for distant water halves that.
- **Many small static meshes.** Hundreds of boxes (quoins, bands, posts, props) were a large share of the frame on SwiftShader;
  merging untouched MeshStandardMaterial meshes per (material, shadow flags) per group at build time (BufferGeometryUtils
  `mergeGeometries`, non-indexed, position/normal/uv only) saved 428 draw calls. Suggestion for the env kit: a shared helper.
- **Perf measurement under heavy load (8–13 on 4 cores).** Wall-clock ratios against the EMPTY frame drift with load, and CPU
  time inflates too (SwiftShader worker threads spin). Calibrating CPU-seconds of the Chromium process tree against the lib
  README's documented idle lab frames (SEA 0.68 s, K_MAT 1.21, K_VIT 1.57, K_CHAPEL 1.08) gives idle wall ≈ 0.47 × CPU-s for
  heavy frames. Tool: `out/check/harbor_eras/he_cpuprof2.mjs` (component on/off profile via `window.__HX` in harbor_eras).

## [night_window] notes, not blockers (worked around in scenes/night_window.js)
- **`loadCharacterHand()` forearms are bare skin beyond the short cuff stub** (`forearmLen` extends skin, not sleeve). For a
  100 mm insert where the forearms cross the frame (S064) they read as rolled-up sleeves. Workaround: a tapered open
  cylinder (`TX.mat('wool_coat')`, jacket / coat colour) parented to `hand.byName.forearm`, y 0.03–0.35. Suggestion: a
  `sleeve: { len, color, fabric }` option on the cuff spec.
- **`sky.blend(a, b, t)` ignores `exposure`** (only `sky.set()` writes `uSkyExposure`), so a dawn blend keeps the creation
  exposure. Workaround: set `sky.uniforms.uSkyExposure.value` per frame. Not a bug if intended; worth a line in the README.
- **Worn-cuff spot orientation.** The RESTORER worn patch sits at hand-local −Z (little-finger side), i.e. its normal is
  `fingers × palmNormal` for `placeWrist()`. To show it to a lens, solve `palmNormal = normalize(c⊥ × fingers)` with c⊥ the
  camera direction orthogonalised against the fingers (see S064). Documenting this would save the next scene an hour.

## [old_home] figure.js `reach()` — `pole` is an elbow DIRECTION, not a point (README doesn't say)
`reach(side, target, { pole })` normalises `opt.pole` and uses it as the bend direction of the elbow (figure.js
`const pole = (opt.pole ? opt.pole.clone() : …).normalize()`). Passing a world POINT (e.g. a hip position) silently turns
into "toward the world origin", which in old_home S035 swung both elbows up and in front of the face. Workaround: pass a
direction, e.g. `V3(±0.35, -1, -0.25).applyQuaternion(fig.root.quaternion)` (down, out, back). Suggest one line in the
README's `reach()` entry ("pole: world direction the elbow points to; default = out/down/back from elbowOut").

## [restoration_lab review] notes, not blockers (worked around in scenes/restoration_lab.js)
- **RESTORER cotton gloves bloom under a close practical.** Warm-white `#F1EFE8` cotton (`clothMaterial`, sheen 0.5) under a
  3500 K bench lamp 0.4–1 m away sits ~1 stop above the paper it handles and crosses the bloom threshold (0.9), so every
  gloved hand got a white halo (S012/S014/S049/S052). Workaround: glove colour ×0.74 on the close-up hands and ×0.72 on the
  figure's hands, each material toned once (cached hands can share a material — toning per hand would square the factor).
  Suggestion: an energy/luminance cap like the dark-cloth sheen fix, or a slightly lower default glove albedo.
- **`loadCharacterHand()` shells are open at the forearm end.** With the forearm pointing at the lens (POV inserts, S049) the
  open glove/cuff end reads as a black hole "at the fingertip". Workaround: a capped, tapered coat-sleeve cylinder (0.36 m)
  parented to the hand. Suggestion (same as [night_window]): a `sleeve: { len, color, fabric }` cuff option with a closed end.

## [pier_waiting review] notes (worked around or accepted in scenes/pier_waiting.js; not blockers)
- **Film grain stripes, module-side fix that keeps DOF bokeh grainy.** (see [sea_deck] / [harbor_eras]) An in-scene grain quad
  is blurred away by the DOF in defocused areas. pier_waiting draws the grain in the engine's half-res additive layer instead
  (`LOWRES_LAYER`, merged *after* the DOF, half-float so signed values work): a full-screen quad that samples the main scene
  target (grabbed in a 1e-4 m probe mesh's `onBeforeRender` via `renderer.getRenderTarget()`), weights an integer-hash grain by
  `pow(L·exposure, 0.55)`, engine `grain: 0`. Hide it for nested renders (they draw layer 1 inline). Engine fix still preferred.
- **NaN from vertex-clustered crowd LOD.** Merging thin parts (fingers, both sides of a cloth shell) into one cluster can cancel
  the summed normal to 0 → `normalize(0)` = NaN in the shader → NaN pixels that bloom/DOF smear into a mostly black frame
  (S020 f1825, S038 f3031 were black). Any module decimating `bake()` output must guard zero normals.
- **fig-2 head sculpt, right profile (MIGRANT S076, NAVIGATOR S075):** two dark round patches (eye socket and the temple in front
  of the ear) read as holes in a profile MCU. They stay with `?figmat=plain`, without the hair layer and under a strong fill;
  `computeVertexNormals()` on the head geometry produces NaNs (degenerate triangles), so the module cannot repair them.
- **MIGRANT stand collar** stands ≈ 1 cm off the slim neck in a 100 mm MCU (S032). A radial pull of `blouse.trim` above the
  neckline either still shows the gap (k 0.965, with skin poking through) or sinks the band into the neck (k 0.9): left as is.
- **Nails at insert scale** (clerk S037, migrant S031) read as white French tips with a dark crescent (free-edge whitening is
  hard-coded in `skinMaterial`, no `nailColor` pass-through in `makeHand`).
- **Migrant-era crowd variants** (6 baked extras) are all men in caps and grey jackets: in sharp wides (S036) the queue reads as a
  uniformed column; families, women, porters, students (bible §7.6) would need a few more baked variants.
- **Dissolve placement vs. shot list:** S076's transition says "centred on the cut, 5647–5659" and its sync point 235.6 s is
  "dissolve complete", but `engine/main.js` runs the dissolve over the incoming shot's first n frames (5653–5664).

## [map_office] notes (worked around in scenes/map_office.js; not blockers)
- **hand.js `write` pose + `pen` socket hides the nib from above.** The index finger lies along the pen, so in a 90° top-down
  the index fingertip sits on the nib whatever offset the pen gets in the socket (tried 3.6–7.2 cm). For a ruling pen
  (S021/S044/S047) the pen is leaned into the stroke and toward the body (axis ≈ (0.40, 0.70, 0.60)) and held 7 cm up its
  length; then the steel blades read at the nib. Suggestion: a `ruling` hand preset (pen upright between thumb and index pads,
  index tip ~3 cm above the nib).
- **Figure.reach() clamps silently** when the wrist target is beyond arm length (MIGRANT, wrist asked at 0.755 m with a 25 cm
  side offset → lands at 0.809 m). Attach hung props to the hand's socket *after* reach (as done) rather than to the target.
- Engine grain stripes ([sea_deck] above) also affect f1849–f3726: map_office uses the in-scene grain quad (harbor_eras recipe).

## [ship_cabin review] hand skin: nail free edge / lunula are hard-coded near-white (manicured look on working hands)
`skinMaterial` (figure_mat.js) mixes the nail toward `vec3(0.97, 0.92, 0.88)` at the lunula (0.55) and `vec3(0.94, 0.9, 0.86)`
at the free edge; on the NAVIGATOR's salt hands in a 100 mm insert (S011) and the S006 thumb macro the nails read as clean
white plates (bible §5.3: short nails with dark edges). Worked around in `scenes/ship_cabin.js` only, by wrapping the
close-up hands' `onBeforeCompile` (string-replacing those two terms with `uNail`-based colours, own program cache key) and
setting `uNail` / `uSalt` (0.45: at 1.0 the salt reads as white blotches). Suggested lib fix: `nailEdge` / `lunula` options
(uniforms) per character, darker defaults for NAVIGATOR / COMPANION. Also noted: an unshadowed point light behind a head lights
the inside of the nostril through the head (warm "ember") — use a shadowed spot for kickers on faces.

## [sea_deck review] notes (worked around in scenes/sea_deck.js; not blockers)
- **sea.js per-pixel short waves read as regular "corduroy" from aerial heights.** In S008 (28 mm, camera 30–40 m up,
  ship at 250–350 m) the six per-pixel Gerstner components (wavelengths ≈ 14 → 2.4 m) are near-parallel long-crested sinusoids;
  in perspective they become evenly spaced horizontal stripes across the mid-ground (the detail normal map is not the cause:
  `uDetailStr = 0` keeps them; `NO_PPW` removes them). Workaround: S008 scales only waves 6..11 to 22 % height (the long swell
  keeps the weight). Suggestion: more directional spread / random phase per short component, or fade them by footprint harder.
- **`sky.blend('night', …)` carries the night preset's sun (elev −25°, sunSharp default 7).** A night→predawn blend therefore
  puts the dawn glow far below the horizon and spreads it ±40° in azimuth (the whole frame turns mauve). S075 passes
  `sunElev`, `sunGlowWidth` and `sunSharp: 70` in BOTH blend endpoints to get a narrow first-light band at frame right.
- **fig-2 changed staged poses/contacts** (as CHANGES.md warns): S067's boy (bounding-box placement) floated ~15 cm over the
  hatch cover and the old height-field coat no longer fitted him. sea_deck now grounds lying figures by their lowest TORSO
  vertex (bake, distance to the hips→neck segment < 24 cm) and simulates the coat against capsules built from the bones.

## [harbor_eras review] notes (module-side; not blockers)
- **three r169 sorts opaque meshes by material id before depth** (`painterSortStable`), i.e. by material creation order, so a
  big ground plane or terrain whose material was created early is shaded under everything that later covers it. Setting
  `renderOrder` on the large occludees (paving 15, city 20–22, hill terrain 40; sky/sea already 50/100) restores occluder-first
  drawing. Instance order inside one InstancedMesh is draw order too: sort instances front-to-back for the main lens.
- **The cheap sea instance (`NO_PPW`, `NO_VFOG`, 96×40) is indistinguishable from the full one for a low, near view at night**
  (A/B on S018 f1700: same moon-glitter path and window reflection) and costs ≈ 0.4 s less wall time there.
- **A PointLight that only matters inside one small room is paid by every lit fragment of the frame** (S018 lab lamp ≈ 0.2 CPU-s).
  For a far window view, additive radial cards on the room's walls/bench read the same.
- **A/B under load:** `out/check/harbor_eras/he_ab.mjs` renders the same frame alternately in two pages of one browser (baseline
  module vs current) and prints the CPU / wall ratio — robust to the shared machine's load swings where single-run timings
  are not (±30 % between identical runs at load 8–15).

## [night_window review] notes (worked around in scenes/night_window.js; not blockers)
- **Engine grain stripes ([sea_deck] above) hit every night_window frame (f4466–f6163).** Worked around with the
  pier_waiting recipe (module grain in the half-res layer, engine `grain: 0`). Engine fix still preferred.
- **`fig.pose({...}, { add: true })` after `reach()` resets the IK arm** (pose re-applies every channel). The README's
  "call in this order" covers it, but it is easy to trip on in a branch (S073: a held-breath neck tweak at 229.82 dropped
  the phone off the ear for the rest of the shot). Suggestion: say it in the README next to `reach`, or make `pose(add)`
  keep IK-driven bones.
- **Phone at the ear: no socket for it.** Built from the head sculpt's landmarks (figure.js head space, hu units: ear
  (±0.33, 0.285, −0.06), outer rim x ±0.356, eye line 0.325, mouth y 0.04): phone placed in head space, the hand solved onto
  it with `reachSocket(…, 'palm')`. An `ear` socket / landmark accessor on Figure would save the next scene this.
- **`FX.windowShaft` visibility scales with the path length through the prism.** A narrow beam (6 × 4 cm cross-section)
  needs `intensity` ≈ 10–15 to read where a window-sized shaft reads at 0.3; worth a line in the README.

## [chapel review] notes (worked around in scenes/chapel.js; not blockers)
- **Pulled-back / short hair shells leave the lower back of the head bare** (fig-2, `low_bun` and `short`): the shell ends at
  about the bun's lower edge, so the occiput down to the nape is skin. From behind (S056/S058/S069) MOTHER read as a bald head
  with the bun stuck on top, and LONELY's short white shell read as a white skull cap. chapel adds a conforming overlay: the
  head-layer triangles of a back-of-head region (head-local elevation/azimuth around the head centre), the same skin weights,
  pushed 2–2.5 mm out along the normal and drawn with the figure's own hair material (aux.w feathers the edge). It also
  soft-selects MOTHER's bun in head space and slides it 3.4 cm down to the nape. Note: on these sculpts the neck column and
  occiput belong to the **head** layer, not `body`.
- **The cheongsam's mandarin collar trim sits on the neckline shelf and is skinned like the chest.** When the neck flexes
  (bowed head) the neck column, which is the head layer, covers it, so no collar shows from behind and the qipao reads as a
  T-shirt. chapel builds its own collar ring sampled on the bind-pose neck surface. Each vertex copies the weights of its
  nearest neck-skin vertex, the top hugs the neck and the bottom covers the flare. The library ring is folded into the neck.
- **`fx.windowShaft` jitter is interleaved gradient noise with a fixed seed**, static per pixel. At half resolution it prints a
  regular diagonal weave inside the beams, a "screen-door" look. One prism over an opening whose cookie is mostly black also
  spends most of its samples in the dark gaps, which raises the variance. chapel patches the shader text to an integer-hash
  jitter re-seeded every frame (`uSeed` = frame mod 61) and builds one prism per lancet. Suggestion for the kit: a per-frame
  seed and a "one prism per opening" note in the README.
- **The same `fx.windowShaft` as `dustMotes({ beam: { shaft } })`:** the dust only needs the matrix and cookie, so a shaft that
  is never added to the scene works as the dust's beam mask (chapel keeps the old combined prism for that).

## [director] Engine grain fixed (engine/post.js)
The grade pass now hashes grain with an integer PCG hash on (pixel, frame) — no more vertical stripes past f≈2100.
Modules that set engine `grain: 0` and drew their own grain (pier_waiting, night_window) should switch back to the
engine grain (default 0.035, or a per-shot value) so the film's grain is uniform; the integration QA pass will do this.

## [old_home review] notes (worked around in scenes/old_home.js; not blockers)
- **Close-up hand swapped onto a figure: the 12 cm default forearm stub rides with the HAND bone.** `loadCharacterHand(code, side,
  { lod:'close' })` builds `forearmLen` 0.12 (hand.js default) while the figure's own hands use 0.03. Parented to the figure's
  hand bone, the stub follows the wrist flex, so on any bent wrist it sticks out of the sleeve as a bare-skin "plank" at the hand's
  angle (old_home S016 end frame, view_home_hand, the wife's folded hands read as upright sticks). Workaround: pass
  `hand: { forearmLen: 0.03 }`. Suggestion: default the stub to 0.03 when a close hand is meant for a figure, or document it.
- **sky.js under a dense deck: a bright band of clear sky just above the horizon.** `skyCloud()` fades cover out below ~6°
  (`smoothstep(0, 0.1, d.y)`) and thin cloud gets a moon silver-lining term, so with cloudCover ≈ 0.93 the only "thin" cloud is the
  faded horizon strip, which lights up toward a low moon (old_home S041 CH2). Worked around by string-patching THIS module's sky +
  sea shader instances (uniform `uLowCloud`: cover runs to the horizon, the moon becomes a diffuse in-cloud glow). Suggestion: a
  `lowCloud` / `horizonFade` preset field.
- **Additive "reflection" materials on a figure show inner garment layers through outer ones** (no occlusion between additive
  layers): the RESTORER's cream knit showed through her charcoal coat and the dark hair added nothing (bald head). Rendered the
  figure normally into its own RT and added that image onto the glass instead (old_home S017 `ghostPlate`).
- **CHILD (barefoot) feet have no toes** — a single smooth toe mass reads as a sock in a ground-level insert. old_home adds five
  small toe digits per foot (skin material, parented to the foot bones) for S042's "toes curl and wiggle".

## [map_office review] notes (worked around in scenes/map_office.js; not blockers)
- **hand.js `write` + `pen` socket (update to the [map_office] note above):** the socket sits at the midpoint of the thumb and index
  pads, which are ≈ 6 cm apart in the `write` preset, so a pen in it floats between the fingers. map_office now uses its own wrist
  socket. The shaft runs from just beyond the index pad back to the thumb web, and the thumb channels are solved once so the thumb
  pad meets the shaft 1.5 cm behind the index pad. Suggestion: a `ruling` / `tripod` preset whose `pen` socket lies on the
  index pad's shaft line.
- **Thumb spread:** in `setChannels` the radial spread of the thumb comes from a negative `cmcFlex` (thumb[0]), as `flat_on_glass`
  uses. `cmcAdd` (thumb[1]) negative only rotates it under the index. Worth a line in README's channel table: "−cmcFlex = spread".
- **`TX.noiseTexture()` channels are narrow:** R/G/B/A sit at about 0.5 ± 0.12, not 0…1. Thresholds such as `smoothstep(0.6, 0.86, n)`
  almost never fire. Remap in the shader (e.g. `(n − 0.5) * 4 + 0.5`) or document the range.
- **Neighbour observation (sea_deck, not edited):** S045's first frame frames the navigator's left hand ≈ 0.15 frame-width right of the
  shot list's register (0.45, 0.60). map_office's S044 end palm sits on the register (0.450, 0.600).
