# sea_deck — LOC_DECK: the junk, the heavy sea, the shore light

Module: `previz/scenes/sea_deck.js` · shots **S008 · S022 · S045 · S067 · S075** · named nested view **`view_shiplamp`**.
Test lab for the nested view: `scenes/_lab_sea_deck_nest.js` (`out/check/sea_deck/nest_shots.json`, three pane aspects).
Stills / sync frames / contact sheet: `out/check/sea_deck/` (`sheet.jpg` = all shots at u = 0.5).

## Set (built once in `create()`)

* **The junk** (ship-local: +X bow, +Z starboard, waterline y = 0, ~30.5 m): lofted hull (superellipse sections, rocker, flared
  topsides, high stern castle), painted stern transom (abstract sun/cloud/wave panel, no text, plain planking inside), oculi on
  the bow, main deck + poop deck (planks along the ship, salt), poop front bulkhead with door, rail caps along the sheer and the
  transom, inner frames, three masts with **battened lug sails** (rust-ochre matting texture, darker bamboo battens, belly per
  panel, a uniform "breath"), sheets as line segments, rudder post + tiller, hatch over the navigator's cabin (amber from below),
  rope coils, glazed water jars, tubs. One horn stern lantern (`FX.lantern('horn')`, 1950 K) on an iron bracket on the starboard
  quarter (moved per shot where the shot list needs it, see deviations).
* **Sea**: `createSea` heavy swell (direction spread 2.1 so crests are irregular, not corduroy), a cheap second instance
  (80×56 grid, no per-pixel short waves) for defocused backgrounds; `setSwell(k)` scales height with constant steepness (S008 ×1.35).
  The ship floats on `sea.heightAt` (heave/pitch/roll, damped), sails at 2.4 m/s along world +X. **Bow wave + wake foam** is a
  mesh displaced by the sea's own Gerstner uniforms (sits on the surface), bow spray bursts (`FX.seaSpray`), low mist.
* **Sky**: `createSky` dusk / night / predawn (night→predawn blend for S075), moon placed per shot relative to the camera (upper
  screen-right, out of frame), **painted cumulus cards** (blurred puff masses with warm crowns) for S008.
* **Coast + shore light (M7)**: two `createCoast` silhouettes (wide arc for S008, short tele arc for S022/S045) placed around each
  shot's camera so the low black coast is always screen-LEFT; the shore light is a constant-pixel HDR point (1900 K `#E2A458`)
  that survives the engine DOF as a round bokeh.
* **Figures** (baked cache variants): NAVIGATOR `outerCoat` (night watch: S022, S045, view), NAVIGATOR plain (S067 after the coat
  is off, S075), COMPANION `lod:'mid'` (S067), close-up hands NAVIGATOR R `cuffTurned` + L (S045), one crowd-extra helmsman (S008).
* **Coat cloth (S067)**: a 30×26 sheet whose vertex shader blends three precomputed keyframes — A gathered in his hands,
  B flung and spread, C draped over the boy (C is a height field rasterised from the boy's baked pose + the coil + the hatch cover,
  dilated and blurred so the cloth bridges, with folds) — plus flutter in the air, hem lagging the collar, a collar-pull offset.
  Undyed lining on the back faces. Per frame only uniforms change.

## Shots

| shot | what is implemented | sync (abs s → local) |
|---|---|---|
| **S008** EWS 28 mm dusk | heavy-lift aerial, slow constant pull-back (292→352 m) and rise (30→41 m), horizon level; ship at (0.55, 0.64) on frame 0, bow screen-right, hull ≈ 9 % → 7.5 % of frame width; dusk sky (zenith P01, faint warm line left), cumulus cards with last light; heavy swell, bow wave/wake/spray; lit stern lantern + amber hatch square (+ halo) + a tiny helmsman under the lantern are the only human traces; low coast far left ending x ≈ 0.24, shore light at (0.10, 0.44) + a fainter second light; afterglow transmitted through the matting sails | 44.9 pull-out under way · **47.18 (f1132)** the shore light dips once (~6 frames) |
| **S022** CU 135 mm night | stabilised head: world-level horizon at y 0.58, his (left, catchlight) eye locked at (0.70, 0.40) with a 7 s heave of ±0.4 %, 135→139 mm (≈ 3 % push); navigator in the brown night coat leaning on the starboard poop rail, left profile, looking screen-left; camera looks aft-starboard (shore astern, as S008); low coast across x 0–0.48 at y 0.58, shore light at **(0.30, 0.58)** = S021's village mark; moon upper right behind him, lantern low right warms his cheek; catchlight glow on his eye from 1.1 s | 80.3 focus on the shore · **81.62 (tl 1.33)** rack ∞ → eye complete (starts 0.3 s, > 1 beat) · 82.64 small inhale (breath amplitude swell) |
| **S045** CU 100 mm night | 0–1.6 s high (31° down) on the hands at chest height: right forearm palm-up, rolled jacket cuff with the pale-blue patch, left (salt-crusted) fingertips folded onto it, one thumb rub at 0.8 s; coat sleeves "pushed up" (see below); 1.6–3.0 s tilt up + 15 cm push to his face, ease-out so the eye is in frame by 2.4 s; follow focus patch → eye (done 2.4 s); end: left-facing three-quarter, eye at **(0.60, 0.44)**, shore light bokeh at **(0.40, 0.46)** (S046 anchor), catchlight; moon from upper right on the camera side keys the salt on the knuckles, lantern low frame-right | **145.14** fingertips on the patch (frame 1) · **146.7 (tl 1.62)** eyes lift / head turns slightly screen-left · **147.54 (tl 2.46)** catchlight appears |
| **S067** MS 50 mm handheld | across the poop to the starboard rail, 9° down, breathing handheld; **48→24 fps ramp**: 0–1.3 s at 50 % (sea, lantern, wind, handheld, breathing all on the remapped clock), ramp to real time by 1.5 s; the operator frames on the lantern (world-level, no roll), so its cage centre is at **(0.38, 0.36)** on frame 0 (light match from S066's reading lamp); navigator (indigo jacket only) screen-left in profile holding the gathered coat, steps in and flings it left → right; the coat spreads and settles over the companion (curled on his left side on a hatch cover against a coil, head screen-right, shivering until the coat lands); the boy pulls the collar; the navigator's left fingers go to his right cuff; lantern on its hook at the rail, warm spill from the open hatch as low fill, moon key from upper right | **213.6 (tl 0.39)** coat shaken open · **214.25 (tl 1.04)** coat settles on the surge · **214.9 (tl 1.69)** collar pull (1.55–1.85) · **215.3 (tl 2.09)** left fingers on the right cuff (1.88–2.1) |
| **S075** MCU 100 mm locked, pre-dawn | at the port poop rail facing aft (home = screen-left), camera on the poop looking to port: rail strip across the bottom, open deep-blue sea in the right half; sky night→predawn (P20 blue-grey, faint warm band low at screen-right); no lantern; he turns to his own left through the camera side (~120°, shoulders follow) to a right three-quarter and the first light from screen-right catches his face; camera solved from the end pose so the eye is at **(0.33, 0.40)** through the 12-frame dissolve into S076 (u > 1 held) | 234.09 still, looking home · **235.0 (tl 1.08)** the turn (1.0–1.55 s) |
| **view_shiplamp** (nested) | from the poop deck just inboard of the starboard-quarter bracket, looking outboard-aft: the horn lamp swaying (swing ×1.7 of the roll) in the upper-left third over the heavy swell, the moon's silver road on the right, a warm strip of rail lower left, the helmsman far; vertical fov fixed (40°), lamp x adapts to the pane aspect (0.8 … 2.4); linear HDR, no DOF | — |

## Deviations from the shot list (and why)

* **S008 camera angle.** The keyframe text says "~35° down tilting to ~15° down", but also registers horizon y ≈ 0.42 and the
  ship at (0.55, 0.64). On a 28 mm 2.39:1 frame (vertical fov ≈ 30°) a 35° down-tilt cannot show the horizon at all; the
  registered positions win, so the camera sits ~6.6° above the ship line and looks almost level. The pull-back is ~17 m/s rather
  than ~3 m/s: at 300 m a 3 m/s move changes nothing on screen; this one shrinks the ship from ≈ 9 % to ≈ 7.5 % of frame width and
  still reads as slow and steady (no swoop, no bank). Cumulus are painted cards, not volumes.
* **Shore-light cheats (S022, S045).** He looks screen-left at the light while the light is in frame near the lens axis — the
  approved "camera tells the truth of feeling" cheat (ruling 2): his facing is ~75° (S022) / ~110° (S045) off the lens axis.
  The catchlight is a small 1900 K emissive point on the faceless head (the shot list's own post note).
* **S045 camera arc.** A pure tilt from his front-left puts his crossing left coat sleeve across the whole CU; the move starts
  nearly frontal (15° to his left) and arcs to the 50° three-quarter during the tilt-up. He is at the starboard rail facing
  forward (the port rail is crowded by the mizzen). The registered frame-0 point (0.45, 0.60) is placed between the left palm and
  the patch (the palm itself sits ~0.1 higher) so the patch is inside the registered area.
* **S045 sleeves.** The baked outer coat has long wide sleeves that swallow close-up hands. The figure's forearms (all its
  sleeve layers + skin) are discarded in a wrist→elbow capsule (chained onto the figure's own materials, S045 only) and replaced by
  the close-up hands' own jacket cuffs plus a bunched coat-sleeve tube from mid-forearm to the elbow — "pushes up the wide sleeve".
* **S067 staging.** With a 50 mm lens the shot list's (0.70, 0.66) for a boy lying on the deck is geometrically incompatible with
  the navigator's chest at (0.26, 0.50) and the lantern at (0.38, 0.36) (a lying body 0.75 m below a chest at the same depth is
  0.16 frame-heights lower only at ~15 m). Solved staging: the boy sleeps on a raised hatch cover at (0.70, 0.74), the navigator's
  chest at (0.23, 0.40), both ~4.7 m away so he is in profile facing right (giving direction left → right and downward, T21); the
  lantern hangs on a short iron hook just inboard of the starboard rail at (0.38, 0.36) for this shot (it lives on the quarter
  bracket elsewhere). He releases the coat mid-throw (it spreads and lands by itself).
* **Barefoot on deck** (bible) is not used: only the sandal variants are baked; feet are out of frame or in darkness.
* **No moon shadow map** in any shot (costs ~30 % of a frame for a weak night key; `?sdon=shadow` restores it). The lantern,
  hatch and dawn lights were never shadowed.

## Measured cost (1280×536, `render.mjs --range`, 23 frames after the first)

The machine was shared with 3–4 other render agents (load average 11–15 on 4 cores) during every run, so the raw numbers are
inflated 1.4–4×. Each run was followed by the engine EMPTY probe (`_lab_perf`, 0.34 s/frame idle); "idle-equivalent" = raw ×
0.34 / EMPTY-at-the-time.

Final method (`out/check/sea_deck/perf_shots.json` + `tools/bench.mjs`): one page renders the engine EMPTY probe and a shot
frame alternately, so each ratio is taken under the same load (render + readback, no JPEG encode).
"idle-equivalent" = shot frame ÷ the EMPTY frame just before it × 0.34 s (EMPTY at idle).

| shot | frames sampled | raw mean (loaded) | EMPTY mean (loaded) | **idle-equivalent mean** | worst single frame |
|---|---|---|---|---|---|
| S008 | 1096–1102 | 1.51 s | 0.66 s | **0.80 s** | 1.14 s |
| S022 | 1956–1962 | 3.57 s | 1.17 s | **1.08 s** | 1.54 s |
| S045 | 3491–3494 (hands) + 3545–3547 (face) | 4.73 s | 1.16 s | **1.54 s** (hands phase ≈ 2.4 s, face ≈ 1.0 s) | 2.89 s (hands) |
| S067 | 5136–5139 + 5160–5162 | 5.67 s | 1.07 s | **1.87 s** (repeat A/B runs 1.68–1.95 s) | 2.65 s |
| S075 | 5626–5629 + 5640–5642 | 3.54 s | 1.10 s | **1.13 s** | 1.67 s |

Plain `render.mjs --range` runs (23 frames after the first, raw, loaded; `out/check/sea_deck/perf_S0xx.mp4`) before the last two
optimisations: S008 1.73 s · S022 3.31 s · S045 6.76 s (hands phase) · S067 5.05 s · S075 2.88 s/frame, with EMPTY 0.4–1.3 s.

S067 (two figures, the coat, the lantern-lit bulwark) and S045's hands phase (two close-up salt hands whose procedural skin shader
fills a third of the frame: `?figmat=plain` drops it to ≈ 1.6 s) are above the 1.5 s typical budget but under the 2.5 s worst
case on average. Optimisations applied: no moon shadow map; lights with zero contribution switched off; the sky dome and the sea
drawn after the opaque set (renderOrder 100 / 50; the coast 40) so hidden pixels are depth-rejected (S022 1.27 → 0.91 s, S067
2.09 → 1.87 s in A/B); the sky skipped entirely when no frame ray reaches above the horizon; a cheap sea instance for defocused
backgrounds; the S045 sleeve-trim `discard` compiled in only during S045. Scene build ≈ 30–55 s per render process (textures,
figure cache, hands) — paid once.

## Known weaknesses

* **Film grain (engine bug, logged in `lib/ISSUES.md`)**: the grade pass's grain hash loses float precision at late frame numbers,
  producing regular vertical/horizontal stripes (visible in S008's sky, S067/S075 in mid-grey areas). Not fixable from a module.
* Faceless mannequin heads read flat in CU (S022, S045 end, S075 end); the head-cloth's topknot tail sticks out like a horn.
* S045: the patch reads only as a small pale-blue area beside the left fingertips at 1280 px; the left hand dominates. The
  forearm tubes are simple lathes (no cloth folds beyond a ripple); the close-up jacket cuffs' open ends can show inside the tube.
* S067: the coat is a single sheet (no padded thickness, no sleeves volume); the collar pull and the cuff touch are small at MS;
  the boy's curled pose is approximate (hand-tuned channels, no contact solve with the coil). The lantern sits near the
  navigator's shoulder on screen, as registered.
* S008: cumulus cards are flat billboards (no parallax worth noting at 7.6 km, but no volumetric light); sails are static apart
  from a breath term; no rigging beyond sheets.
* Hull is a clean loft (no planking strakes in the geometry, wales, or gallery); the painted transom is generic.
* The shore light flicker in S008 is a Gaussian dip of the point's intensity (≈ 6 frames) — subtle at 1280 px by design.
* Night readability relies on a fairly strong moon key from the camera side in S045/S067 (more readable than "silhouette with a
  moon edge" the bible describes for wides).

## Debug / A-B switches (page URL, e.g. `tools/bench.mjs --q ...`)

`?sddbg=top|side|side2|flat|<metres>` (overview from above with the camera marked · orbit views · no DOF and brighter ·
pull back) · `?sdoff=sea,dof,cloud,foam,hatch,coat` · `?sdon=shadow` (restore the moon shadow map) · `?sdlog=1` (projected
registration points to the console).
