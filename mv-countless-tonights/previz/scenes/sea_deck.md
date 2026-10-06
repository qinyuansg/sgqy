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
* **Coat cloth (S067, review)**: a 31×27-particle deterministic Verlet cloth (`scenes/_sea_deck_coat.js`, pure JS, node
  self-test) simulated once in `create()` (≈ 4 s): pinned in his hands (hold → shake → fling), the collar carried on an
  art-directed arc to the boy's shoulder, free body + hem with air drag, collisions with capsules from the boy's bones, his
  own legs/torso, the hatch cover, the coil and the deck; 48 fps states recorded and lerped per frame (position + normal
  attributes), collar pull added on the CPU. Undyed lining on the front faces (it lands on the boy), sleeves outside the coat
  outline discarded.
* **Film grain (review)**: drawn by the module in the engine's half-res additive layer (after DOF), engine grain 0.
* **Cheap background (review)**: Lambert stand-ins for the junk's standard materials, swapped in for S045 only.

## Shots

| shot | what is implemented | sync (abs s → local) |
|---|---|---|
| **S008** EWS 28 mm dusk | heavy-lift aerial, slow constant pull-back (292→352 m) and rise (30→41 m), horizon level; ship at (0.55, 0.64) on frame 0, bow screen-right, hull ≈ 9 % → 7.5 % of frame width; dusk sky (zenith P01, faint warm line left), cumulus cards with last light; heavy swell, bow wave/wake/spray; lit stern lantern + amber hatch square (+ halo) + a tiny helmsman under the lantern are the only human traces; low coast far left ending x ≈ 0.24, shore light at (0.10, 0.44) + a fainter second light; afterglow transmitted through the matting sails | 44.9 pull-out under way · **47.18 (f1132)** the shore light dips once (~6 frames) |
| **S022** CU 135 mm night | stabilised head: world-level horizon at y 0.58, his (left) eye locked at (0.70, 0.40) with a 7 s heave of ±0.4 %, 135→139 mm (≈ 3 % push); navigator in the brown night coat leaning on the starboard poop rail, left profile, looking screen-left; camera looks aft-starboard (shore astern, as S008); low coast across x 0–0.48 at y 0.58, shore light at **(0.30, 0.58)** = S021's village mark; **(review)** the moon is a hard silver kicker from upper right just behind the lens (cheekbone, ear, jaw, head-cloth), the stern lantern a weak warm glow low right; the catchlight sits ON the eye surface (measured from the head mesh) from 1.1 s | 80.3 focus on the shore · **81.62 (tl 1.33)** rack ∞ → eye complete (starts 0.3 s, > 1 beat) · 82.64 small inhale (breath amplitude swell) |
| **S045** CU 100 mm night | **(review: restaged)** 0–1.6 s high (31° down), 15° to his left of frontal: his right forearm lies across his waist (the S011 band across the frame, jacket sleeve + rolled cuff), the wrist rolled until the turned cuff's **PROP_PATCH decal** (ported from ship_cabin S011: #7D9CBB plain weave, off-white running stitches, double knot) faces the lens; his LEFT hand comes from upper frame right, index + middle pads resting on the patch's upper corner (pad contact solved ≤ 1 mm, the close-up hands are placed first and the figure's arms reach them); one rub at 0.8 s; the coat sleeves pushed up into bunched tubes; left fingers+patch registered at **(0.45, 0.60)**; 1.6–3.0 s tilt up + arc to the 50° three-quarter, follow focus patch → eye (2.4 s); end: eye at **(0.60, 0.44)**, shore light bokeh at **(0.40, 0.46)** (S046 anchor), catchlight on the eye; moon fixed in the ship from upper right (keys the hands, then a 3/4 key on his face), lantern low frame right | **145.14** fingertips on the patch (frame 1) · **146.7 (tl 1.62)** eyes lift / head turns slightly screen-left · **147.54 (tl 2.46)** catchlight appears |
| **S067** MS 50 mm handheld | **(review: rebuilt)** across the poop to the starboard rail, 1.75 m high, 7.5° down, breathing handheld; **48→24 fps ramp**: 0–1.3 s at 50 % (sea, lantern, wind, handheld, breathing, cloth all on the remapped clock), real time by 1.5 s; the operator frames on the lantern (world-level, no roll), cage centre at **(0.38, 0.36)** on frame 0 (light match from S066's reading lamp); navigator (indigo jacket) screen-left (4.9 m) holding the gathered coat, shakes it open, steps in and flings it left → right; the **coat is a build-time Verlet cloth** (`scenes/_sea_deck_coat.js`, 31×27 particles, collisions with capsules from the boy's bones, the hatch cover, the coil, the deck): the heavy collar is carried on an arc to his shoulders, body and hem fly free with air drag and settle over him (shoulders → hips, his shins, feet and head stay out); the boy (5.0 m, same depth as the navigator so the throw runs along his body) sleeps curled on his left side on a low hatch cover against a coil, head screen-right, grounded by his lowest torso point, shivering until the coat lands; he pulls the collar toward his chin; the navigator's left fingers go to his right cuff; lantern on a post just inboard of the rail, hatch spill as low warm fill, moon key from upper right behind the lens | **213.6 (tl 0.39)** coat shaken open · **214.25 (tl 1.04)** collar lands on his shoulder, the body settling · **214.9 (tl 1.69)** collar pull (1.55–1.85) · **215.3 (tl 2.09)** left fingers on the right cuff (1.88–2.1) |
| **S075** MCU 100 mm locked, pre-dawn | at the port poop rail facing aft (home = screen-left), camera on the poop looking to port: rail strip across the bottom, open deep-blue sea in the right half; **(review)** sky between P02 and P20 (night→predawn blend 0.62–0.72, sky exposure 0.62) with the first warm band low at frame right (narrow sun glow just inside the edge); no lantern; he turns to his own left through the camera side (~150°: feet pivot 60°, shoulders and head follow) into a right profile turned a little toward the lens; the first light rakes the front of his face from the right, the near cheek stays in the blue sky fill; camera solved from the end pose so the eye is at **(0.33, 0.40)** through the 12-frame dissolve into S076 (u > 1 held; checked against S076 f5658: the two eyes coincide) | 234.09 still, looking home · **235.0 (tl 1.08)** the turn (1.0–1.55 s) |
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
* **S045 camera arc.** The move starts nearly frontal (15° to his left) and arcs to the 50° three-quarter during the tilt-up.
  He is at the starboard rail facing forward (the port rail is crowded by the mizzen). (Review: a side-on start was tried so his
  left fingers would point up-frame like S044's flat palm; his left forearm then fills the foreground. The frontal start keeps
  S011's patch composition — forearm band across the frame, fingers from upper right — so S045 repeats the first reveal.)
* **S045 sleeves.** The baked outer coat has long wide sleeves that swallow close-up hands. The figure's forearms (all its
  sleeve layers + skin) are discarded in a wrist→elbow capsule (chained onto the figure's own materials, S045 only) and replaced
  by the close-up hands' own jacket cuffs + jacket sleeves (S011's tapered tubes) and a bunched coat-sleeve tube from 17 cm up the
  forearm to the elbow — "pushes up the wide sleeve".
* **S067 staging.** With a 50 mm lens the shot list's (0.70, 0.66) for a boy lying on the deck is incompatible with the
  navigator's chest at (0.26, 0.50) and the lantern at (0.38, 0.36). Solved staging (review): camera 1.75 m above the planks, 7.5°
  down; the boy sleeps on a low hatch cover (≈ 27 cm) at (0.69, 0.78), 5.0 m away — the same depth as the navigator (4.9 m, chest
  ≈ (0.24, 0.44)), so the coat flies along his body axis (from the boy's feet end toward his head, T21 left → right); the lantern
  hangs on a short iron hook on its own post just inboard of the starboard rail at (0.38, 0.36) for this shot (it lives on the
  quarter bracket elsewhere). He releases the coat at real time 0.23 s; the collar is art-directed to the boy's shoulder by 0.45 s
  and held until 0.8 s (so it cannot slide off), the rest is free cloth.
* **Barefoot on deck** (bible) is not used: only the sandal variants are baked; feet are out of frame or in darkness.
* **No moon shadow map** in any shot (costs ~30 % of a frame for a weak night key; `?sdon=shadow` restores it). The lantern,
  hatch and dawn lights were never shadowed.

## Review (art director + DP pass, 2026-10-05)

Re-rendered every shot at u = 0.05 / 0.5 / 0.95, every sync frame, the nested view (full frame + the three-pane nest lab), the
neighbours' adjoining frames (S007 f1074, S009 f1159, S021 f1926, S044 f3481, S046 f3568, S068 f5176, S074 f5613, S076
f5653–5664; museum_gallery S023 and corridor S066 have no module yet), 6 consecutive frames (S067 f5140–5145, S022
f1990–1995: RMSE between neighbours 0.020–0.029 / 0.0114, smooth, no pops, no NaN/black frames). Renders:
`out/check/sea_deck/r0` (before), `review_final/` (after, + `sync/`, `view/`), contact sheet `sheet.jpg`.

### Found (before) → fixed

| # | shot | problem | fix |
|---|---|---|---|
| 1 | all | engine grain stripes (vertical bars at S075's right edge, horizontal lines over S008's sky / S067) | module-side grain in the half-res additive layer after DOF (pier_waiting's method), engine grain 0; nested views get none |
| 2 | **S067** | after the fig-2 lib update the boy floated ~15 cm over the hatch cover with straight stilt legs; the 3-keyframe coat hung over him as a flat grey board with holes (his shirt poking through), then slid away; the lantern burned white right behind the navigator's head; stiff "zombie" throwing arm; bulwark / hatch wood showed metre-wide contour-map grain | staging re-solved (camera 1.75 m, 7.5° down; boy at the navigator's depth so the throw runs along his body); boy re-posed (curled, rolled 30° back, lower arm under the cheek) and grounded by his lowest torso vertex; **coat rebuilt as a deterministic build-time Verlet cloth** (`_sea_deck_coat.js`: hold → shake → fling, collar art-directed to his shoulder, free body + hem with air drag, collisions with bone capsules / hatch cover / coil / deck; 48 fps states lerped per frame, ≈ 4 s once at build) — outer brown up, lining down, collar pull on CPU; navigator's hands carry the sim's pins, then follow through with bent elbows; horn panes and hatch spill toned down; plank scale ×1.5–2.6 |
| 3 | **S045** | hands phase unreadable: patch invisible, wide coat-sleeve "bells" open to the lens, the jacket cuff a floating blue ring, mid-tilt frames broken; face end lit flat orange by the lantern, black mouth blotches | restaged on S011's proven composition (right forearm across the frame, wrist rolled until the turned cuff faces the lens, left pads solved onto the patch corner ≤ 1 mm, close-up hands placed first and the figure's arms reach them); **PROP_PATCH decal ported from ship_cabin S011** (same cloth, stitches, double knot → continuity S011 = S045); jacket sleeves (S011's tubes) + bunched coat-sleeve tubes; salt crust as fine crystals and dark work nails (S011's hand tweak); moon fixed in the ship from upper right (keys hands, then a 3/4 silver key on his face), lantern weak and low; cheap Lambert stand-ins for the defocused junk behind the hands (≈ −1 s/frame) |
| 4 | **S022** | the "catchlight" floated ~1 cm in front of his profile (a glow in the air beside the face); face a dark red mask, no moon edge | eye point measured on the head mesh (most forward vertex over the left eye, head-bone space) for focus + catchlight; moon as a hard silver kicker from upper right just behind the lens (cheekbone, ear, jaw, head-cloth), lantern a weak warm glow under the jaw |
| 5 | **S075** | turn ended almost frontal (S076 is a right profile); neck-only twist; sky a flat mauve with no first light; vertical grain bars | ~150° turn (feet 60°, shoulders + head follow) into a right profile turned a little to the lens; first light rakes the front of his face from the right; sky darkened toward P02–P20 with a narrow warm band just inside frame right (sunSharp 70 / sunElev −2.5 on both blend endpoints, see ISSUES.md); the S075→S076 dissolve now overlays two right profiles with the eyes coincident at (0.33, 0.40) |
| 6 | **S008** | the sea's mid-ground read as regular "corduroy" stripes; cumulus were blurred brown smudges | per-pixel short waves at 22 % height (long swell keeps the weight; lib note in ISSUES.md); cumulus cards re-painted crisper (190 puffs, 4 px blur, bluer bases, pinker crowns) |

Checked and kept: S008 registrations (ship (0.55, 0.64) → shrinking 9 → 7.5 % width, horizon 0.42, shore light (0.10, 0.44),
dip at f1132) · S022 shore light (0.30, 0.58) = S021's village mark, rack done at 81.62, catchlight (0.70, 0.40) → S023 ·
S045 left fingers + patch at (0.45, 0.60) (S044's palm), eye (0.60, 0.44), shore bokeh (0.40, 0.46) = S046's E1 lantern ·
S067 lantern cage (0.38, 0.36) on frame 0 (S066's reading lamp), coat left → right (T21 into S068) · view_shiplamp (lamp
upper left third, moon road right, rail lower left; three pane aspects). Continuity: patch inside the RIGHT cuff turned back by
the LEFT hand (S045, S067), night coat on in S022/S045, off (given away) in S067/S075, head-cloth, shore always screen-left.

### Cost after the review (1280×536, `render.mjs --range`, 24 frames after the first; machine shared, load 9–12 on 4 cores)

| shot | range | mean s/frame (raw) | max | EMPTY probe at the time |
|---|---|---|---|---|
| S008 | 1100–1124 | 0.92 | 1.22 | ≈ 0.2–0.5 (idle 0.34) |
| S022 | 1960–1984 | 0.93 | 2.22 | 0.39 → 0.18 |
| S045 hands | 3485–3509 | 1.91 (3.40 before the cheap-background swap) | 3.83 | 0.47 → 0.17 |
| S045 face | 3540–3564 | 1.19 | 1.93 | — |
| S067 | 5130–5154 | 1.43 (2.39–2.47 in the first run) | 2.75 | 0.17 → 0.39 |
| S075 | 5620–5644 | 1.02 | 1.25 | — |

All shots are under the 2.5 s worst-case on average; S045's hands phase (1.6 s of the shot) stays above the 1.5 s typical
(two close-up salt hands + the hi figure + DOF at f/2.2). Scene build ≈ 22–35 s per process (+ ≈ 4 s for the coat sim).

### Still weak (not fixed in this pass)

* S067's draped coat is a single stiff-ish sheet (bend 0.25; softer settings flipped the landing inside-out) — it reads as a
  covering, a little board-like at the front edge; one sleeve flap settles ~0.3 s after the surge.
* Faceless heads: warm-tan skin even under the silver moon; no beard / brow scar at previz scale.
* S045's left fingers point down-left (S011's direction) rather than up-frame like S044's palm (position, size and palm-down match).
* S045 hands phase cost (above).

## Measured cost — original build (before the review; kept for reference)

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

* Faceless mannequin heads read flat in CU (S022, S045 end, S075 end); the head-cloth's topknot tail sticks out like a horn;
  the skin stays warm-tan even under a silver moon key (the skin shader's hue lock), so night faces read warmer than CT_NAV.
* S045: at 1280 px the patch is a ~60×40 px pale square under the left fingertips (readable, small); the hands' phase is dark
  by design (moon key, 3 stops under the sky); the bunched coat-sleeve tubes are simple lathes. The left fingers point
  down-left (S011's direction), not up-frame like S044's palm: the match is position + size + palm-down (see deviations).
* S067: the coat is a single sheet (no padded thickness); with bend stiffness 0.25 it lies a little board-like over the boy;
  one sleeve flap is still settling at the 214.25 surge (tl 1.04) and is down by tl 1.35. The boy's curled pose is seen nearly
  side-on from the low lens, so his drawn-up thighs foreshorten (shins + feet read). The sim is tuned for this staging: moving
  the boy / navigator / lantern needs a re-check of the landing (orbit debug `?sddbg=orb:0:4.5:75`).
* S008: cumulus cards are flat billboards (no parallax worth noting at 7.6 km, no volumetric light); sails are static apart
  from a breath term; no rigging beyond sheets; the per-pixel short waves are held at 22 % height (full height reads as
  corduroy from 30–40 m up), so the fine chop is soft.
* Hull is a clean loft (no planking strakes in the geometry, wales, or gallery); the painted transom is generic; the wood
  texture's grain swirls still show on the bulwark in S067 at the new 0.25 m plank scale.
* The shore light flicker in S008 is a Gaussian dip of the point's intensity (≈ 6 frames) — subtle at 1280 px by design.
* Night readability relies on a fairly strong moon key from the camera side in S022/S045/S067 (more readable than "silhouette
  with a moon edge" the bible describes for wides).

## Debug / A-B switches (page URL, e.g. `tools/bench.mjs --q ...`)

`?sddbg=top|side|side2|flat|<metres>|orb:<deg>:<dist>[:<elev>]` (overview from above with the camera marked · orbit views · no DOF and
brighter · pull back · orbit around the shot's subject point; `&sdpiv=patch` pivots S045 on the patch) · `?sdcoat=dbg` (S067 coat lining
painted green) · `?sd8k=<0..1>` (S008 short-wave height) · `?sdoff=sea,dof,cloud,foam,hatch,coat` · `?sdon=shadow` (restore the moon shadow map) · `?sdlog=1` (projected
registration points to the console).

## Integration fixes (integration QA pass, 2026-10-06)

Source: `previz/qa/findings_by_module.json` (sea_deck + the three shared grain findings) and the director's notes for the
navigator group. Verify renders: `out/fix_ship_cabin_sea_deck/` (survey, 960 px) and the iteration stills in
`out/check/sea_deck/integ/`. Dev params (default off): `?s45k=…&s45r=…` (S045 cool key / rim), `?s67kx=…&s67kd=…` (kneel spot),
`?s67br=x,y,z` (boy roll), `?s67bend=…&s67wind=…` (coat sim), `?sdlegk=…`, `?s75d=…&s75a=…`, `?sdoff=dress`.

**Grain (all shots).** The module grain quad / probe (half-res additive layer) and every per-shot `grain` override are gone;
`setShot` returns the CT_NAV era grain `0.042` through post for every non-nested shot (the engine's integer-hash grain), nested
`view_shiplamp` gets none. One grain from S005 to S075, matching the corridor / lab cuts (S066 → S067, S045 | S046 | S050).

**Shared with ship_cabin** (`import { dressNavigator, buildCuffFlap, smoothNailFolds } from './ship_cabin.js'`): both navigator
variants (`navC` night coat, `navJ` jacket) wear the wrapped head-cloth over the skull and ears (ear 0.85), the short
salt-bleached beard, weathered skin, faded indigo jacket and dark 交领 band; the close-up right hand's cuff is the turned-back
flap with the patch on its INSIDE (= S011); the close-up salt hands have smoothed nail folds, `uSalt` 0.32 (fine glints, not
warts), `uDetail` 0.45, skin #8F6346, desaturated sleeve / cuff indigo.

| shot | QA finding (severity) | fix |
|---|---|---|
| S045 | blocker: nothing turns the cuff back or touches the patch; hands 13/255; tilt late, whipping through the coat; lit bald profile | 85 mm. 0–0.3 s: his LEFT index + middle fingertips are hooked under the edge of the RIGHT cuff (frame 0) and turn it back the last part of the way — the patch shows on its inside; 0.26–0.42 s they come over onto the patch and rest there with solved contact (pads ≤ 1 mm) to 0.92 s, the thumb rubbing once (0.55–0.9 s). The hands are keyed by a cool moonlight key from over the lens' right shoulder and kicked warm by the stern lantern from frame right (≈ 50/255; the patch the brightest mid-tone). The tilt starts at 145.9 (tl 0.82) with the arc leading, so the sea enters the frame early, a warm lantern lift on the coat mid-tilt, and arrives on his eye at 146.7 (tl 1.62) as his eyes lift; the camera drifts back so the end is an MCU (head ≈ 60 % of frame height): his face almost a silhouette against the deep-blue sea — head-cloth over skull and ear, beard edge, a thin cool sky rim from behind-left on brow / nose — the catch-light in the near eye from 2.46 s (depth-test off so the brow cannot hide it), the shore light at (0.40, 0.46) a soft round ≈ 4 %-of-frame-height bokeh (f/5.6 at the end), the brightest thing in frame (→ S046) |
| S067 | major: corpse-like boy, rigid board coat, no contact, upright slab | rebuilt as a laying, not a throw: he is going down onto his RIGHT knee beside the boy at frame 0 (kneeling by 213.6), holds the coat by the collar in both hands all the way (a sim pin path: gathered at his chest → over the boy's hips, opening → his top shoulder) and lowers the collar onto the boy's shoulder on 214.25 (te 0.52), lets go; the collar stays where it was laid (pinned in the sim, so the body cannot flip over — it did) and the softer cloth (bend 0.07, a little wind toward the hem) settles over him shoulder → hip with the brown outside to the lens, the lining a darker sliver; his hands come back to his raised left knee; 214.9 the boy's collar tug; 215.1–215.3 his right wrist comes up and the left fingertips go to the turned-back cuff, held to the cut, rim-lit by the lantern. The boy is curled on his left side, rolled back ~50° so the drawn-up knees, the bowed head and the hands tucked at his chin read as a curl from the low lens. Lantern cage (0.38, 0.36) on frame 0 unchanged (S066 light match) |
| S075 | minor: MS not MCU, black sea band, uniform lavender, turn late | 100 mm MCU (head ≈ 45 % of frame height), horizon at 0.55 with the deep-blue swell visible below it; sky blend pulled back toward P02 with a stronger narrow first light at frame right; he now turns AWAY from the lens (to his own right, ~180°: feet / shoulders / head) so mid-turn we see the back of his head, never a frontal mask, and ends in a true right profile (eye at (0.33, 0.40) for the S076 dissolve) with a cool-peach rim from the right horizon; the turn runs 234.6 → 235.0 so the face is round to the first light on 235.0 |
| S008 | minor: cumulus bases sit on the horizon like rock islands | bases lifted ≈ 3.5° (frame y ≈ 0.28–0.32, horizon 0.42), undersides feathered (no flat base), a thin stratus band with warm underlight low over the horizon; stars down to 0.05 (S007's sky has none) |
| S022 | minor: square halo round the shore light; module grain | the shore light is a camera-facing radial billboard of constant pixel size (was a GL point sprite); the square was the bloom of an 11× point: softer, larger core (4.2×, 19 px) and S022 bloom 0.32 / threshold 0.8 — a round glow; grain removed |
| S043–S076 (grain) | major/minor: module grain quads | removed (above) |

**Not fixed / deviations**
* S045: the left fingers still come from upper frame right pointing down-left (S011's composition) rather than S044's flat
  palm with the fingers up — the match is position + size; the patch is small at 85 mm (≈ 4 % of frame width).
* S067: the coat is still a single-layer sim sheet (no padding); over the drawn-up knees it can read a little flat. The
  navigator kneels a little right of the shot list's (0.26, 0.50) (≈ 0.45, 0.55, QA's ~(0.42, 0.55)). The boy's face is
  partly hidden by his arms rather than by the collar.
* S075: no rail strip at the bottom — with the horizon at 0.55 and the head at 45 % of frame height the rail cap (behind
  him) falls below the frame; the swell fills the bottom instead.
