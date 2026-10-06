# ship_cabin — 火长针房 (LOC_CABIN) · S005 S006 S007 S009 S010 S011 + `view_cabin`

Module: `previz/scenes/ship_cabin.js` (one scene build serves every shot; per-shot `setups`). Lab for the nested view:
`scenes/_lab_ship_cabin_nest.js` + `out/check/ship_cabin/nest_shots.json` (renders `view_cabin` into a portrait G3a pane
0.58 : 1 and a landscape pane, as the gallery will). Dev helper: `out/check/ship_cabin/rr.mjs` (frames with URL params;
`?dbg=1` prints positions/screen projections, `?far=1` pulls the S006/S011 camera back to inspect hand staging,
`?off=lampShadow,winShadow,win,shaft,dof,bloom,fill,env,fig` perf probes).

## The set (ship-local metres, floor y = 0, bow +z)
* Cabin 2.4 × 2.0 m, 1.65 m headroom, smoke-dark planking (`TX.mat('wood_smoke')`), two low beams, knees, a deck-head
  with the **70 × 70 cm hatch** above the chart table, stern wall with the **55 × 40 cm barred window** (vertical bars,
  sliding board pushed aside), the fold-down **chart table** hinged under it running fore-aft, the camphor **compass box**
  let into its port side, sea chest, scroll rack, water jar, straw mat, rope coils.
* **Chart** = `needleChart('then')` (exported; no text, no rose): cream #DCCDA6 handled mulberry paper, mountain-profile
  coast along the top, islands, reef dots, a black dotted route, illegible annotation marks, two soft creases. A
  0.60 × 0.32 m deformable sheet (73 × 41 grid; corners curl; the free lower-right corner lifts in the gust), a rolled
  remainder with dark roller knobs at its left end, **two brass bar weights (镇纸) exactly where S004's acrylic strips
  are** (rounded cast bars with a raised spine), a smooth grey sea pebble on the lower-left corner, a candle-wax drip at
  (0.30, 0.62).
* **Compass** (in-use state): lathe-turned brass body with raised rim lip, `TX.compassFace({state:'then'})` dial on a
  ring (the well is open), cream-tan lacquered well floor with the N–S double line, golden laminated mica, a blued-steel
  diamond-section needle (3.6 cm) with the red-lacquer south tip and brass cap, a soft contact shadow, white salt bloom on
  the rim at 午 (wiped by the thumb in S006). Dial south → world −z (aft).
* **Horn cabin lantern** (`FX.lantern('horn', size .45)`), hung from beam A, swinging with the roll (≈7 s): its own
  PointLight (unshadowed fill) + a shadow-casting SpotLight at the flame pointing down (the only figure shadows).
* **Stern window**: `FX.windowLight` (deep dusk blue through the `bars` cookie, shadowed far spot + visible bars) and a
  faint `FX.windowShaft`; outside a cheap gradient backdrop (dusk sky / faint warm horizon / dark sea), no sky dome.
* **Above deck (S007)**: deck planking with the hatch coaming and the lid standing open leaning aft, bulwarks, mizzen mast, a **battened junk
  sail** (10 panels bellied forward between bamboo battens, coarse rust-ochre cotton with seams and patches, panel
  translucency via the emissive map, a vertex-colour gradient warm head → cool foot), sheets fanning to a block, the `createSky('dusk')` dome; cool sky hemisphere +
  a low warm afterglow from forward.
* Characters: NAVIGATOR `hi` (S007, S010), NAVIGATOR `mid` (view_cabin), close-up NAVIGATOR hands: R (S006 thumb),
  R `cuffTurned` + L (S011), each with a sleeve tube continuing the cuff stub.
* Grade (base `post`): CT_NAV — strong warm/cool split, saturation .88, cool shadow tint / warm highs, grain .04
  (×1.15 of base), bloom .4 for halation round the lamp, lifted blacks.

## Per shot

### S005 · 31.67–34.50 s · INSERT 50 mm, 90° top-down, 48 fps — match cut from S004 (T03)
* Frame registration built from the shot list numbers (`T03` export): chart spans x 0.05–0.95, lower edge y 0.88,
  twin-peaked islet (0.62, 0.40), dotted route from (0.15, 0.70), bar 1 vertical at x ≈ 0.10 centred y 0.50, bar 2 along
  the top edge x 0.55–0.95 at y 0.06, stone (0.08, 0.85), free corner (0.95, 0.88), wax (0.30, 0.62). Camera 0.926 m
  above the sheet (inside the open hatch), up = world −x, so the stern window is at frame right.
* 48 fps: everything that moves runs on `Tq = T0 + tl/2` (lamp swing, flame flicker, ship sway ≤ 1 % of frame).
* Whole sheet sharp (shot list 全幅清晰: no DOF). Lamp pool from the upper left (spot narrowed to 0.66 rad so it stays on the
  left two-thirds), the cool barred window
  stripe on the right third (window #2F62B4 ×1.25; the bars' shadows run fore-aft, i.e. horizontal in frame, as they
  physically must from a vertical-barred stern window onto a horizontal table).
* **tl 1.10 (32.77 '蓝')**: the gust rolls the free lower-right corner up in a real page curl (fold line across the corner,
  paper wrapped on a cylinder then straight, ≈6 cm lift, pale back face, moving shadow on the table), it flutters and
  settles by 2.6 s. (Before the review a 6 cm vertical lift was invisible from straight above.)
* Props: the 镇纸 are rounded cast-brass bars with a raised spine (box-projected UVs; the stretched texture had drawn
  copper-pipe streaks); the stone is a smooth speckled grey sea pebble (the 'granite' block texture read as a wicker ball).

### S006 · 34.50–40.17 s · ECU 100 mm macro — glint along the star ring, thumb wipes the salt at 午
* Locked camera low over the dial's SE side (~0.26 m, ~36° down, T8, focus on the star ring; bearing glyphs in front are
  soft → illegible). The **light moves, not the camera**: the lantern is positioned each frame (out of frame) by solving
  the mirror geometry so its glint (+ a small glint sprite) walks the star ring from ESE to 午: over the star points at
  1.7 s (36.21 '星辰'), resting on 午 at 4.7 s (39.21 '盘').
* Thumb (review restage): the right hand rests **outside the dial beyond its south-west rim (screen left)**, fingers hooked
  over the box edge, the extended thumb lying along the rim at the dial's own focus distance (the whole hand is rotated
  about the pad until the distal thumb points E, dipping 10°). Enters at 2.5 s (36.99 '刻'), one slow ~0.85 s drag E → W
  across the salt at 午 (the salt band is alpha-wiped behind the pad), lifts away to the left by 4.0 s. Focus racks to the
  thumb's nail plane while it works and back to the star ring for 4.7 s. A cool twilight fill from the stern window
  (behind the lens) models the thumb's near side against the warm lamp rim; salt specks and nail cracks read.
* Deviations: the thumb enters from **screen left**, not lower right — any staging from the lens side puts the hand
  between lens and dial as a defocused dark shape over half the frame (that was the state before the review). Ring order:
  library dial has the star ring inside the bearings (lib/ISSUES.md), so the star band is the sharp middle band.

### S007 · 40.17–44.79 s · MCU 32 mm → crane rise through the hatch to the sail (T04)
* Navigator stooped under beam A over the table, face ≈ (0.58, 0.50) with beam A behind the head-cloth; warm lamp from frame
  left (practical at x 0.53 on beam A, just out of frame), a soft cool skylight term from the hatch on the head-cloth and
  shoulders, and a warm bounce off the lamp-lit chart below that softens the hard split down the nose. Skin balanced for the
  practical (≈2700 K camera: lamp #FFD7AD on skin) so P19 stays brown, not orange.
* 1.61 s (41.78 '你把半生'): he lifts his head to the hatch (lookAt); the camera (time-parameterised Hermite path — no
  velocity jumps at the knots, zero velocity at the start of the move) rises and tilts to ~45° past beam A; the hatch's
  forward coaming sweeps down through frame as a dark band with the sail and sky beyond (≈2.2–2.8 s, the dark-wood
  'hidden seam'); it rises through the opening at ~56° and tilts on up; **3.77 s (43.94 '帆') the battened sail fills
  ~80 % of frame**, still rising at the cut (→ S008). Focus face → near wood (0.45 m) → sail, T4; exposure ramps ×1.8 and
  the grade cools across the passage. The hatch lid stands open leaning AFT (forward it blocked the view with its black
  underside). The sail carries a vertex-colour gradient (warm head in the afterglow, cool foot, darker toward each batten).

### S009 · 48.29–50.00 s · ECU 100 mm top-down — needle settles exactly on 午
* Camera 0.40 m straight down, up vector solved so the **south tip points at screen 215° (lower left, as in S003)** and
  the **pivot sits at (0.46, 0.50)** (T05 A-frame); a 4° tilt puts the frame's left/right edges out of the focal plane
  (bearing glyphs soft); f/2.8 focused on the needle.
* Damped oscillation ±8° → ±4° (0.6 s) → ±1° (1.1 s), **dead stop at tl 1.455 so frame 1194 (49.77 '南') is at rest**
  on the N–S line; f1170 (48.75 '根针') still swinging.
* Light (review): the lantern is hung where its mirror image lands just beyond the frame's upper-left corner, so a warm
  sheen grades across the in-use brass from upper left (it read museum-chocolate before); a faint cool window light is
  solved into the needle's sloped top facet so a cool line runs along its north half at rest.

### S010 · 50.00–52.75 s · CU 100 mm — the eye, gaze to frame left (T05 B-frame)
* Navigator **seated** on the sea chest at the table's forward end, head turned to the stern window; camera at his
  front-left (his LEFT, scar side), ~0.97 m; the near-eye point (from the figure's own `eye()`, fig-2 head) at
  (0.46, 0.50) — measured (0.459, 0.499) — imperceptible push; T4 focused on that eye.
* Light (review, short-side chiaroscuro instead of an evenly lit orange mask): the stern window he looks at is a narrow cool
  key (#7AA2DA) on the front planes — brow, nose bridge, the rim of the eye socket; the lantern, cheated behind his left
  shoulder (the lamp's shadowed spot re-aimed at the head — the unshadowed point light lit the inside of the nostril through
  the head like an ember), rakes warm across the near cheek, jaw and ear and sweeps with the swing; a faint off-axis warm
  bounce off the chart keeps a trace of warmth in the cool side (bible §2.2); the socket stays in shadow (留白). Head-cloth
  stays indigo (the window spot no longer hits it).
* Deviations: faceless mannequin → **no eye, no blink at 51.39**, no eyebrow scar; the sync beat is a ≈0.7° head settle
  over ~5 frames centred on 51.43. The loose strands at the head-cloth edge were tried and removed (they read as cracks).

### S011 · 52.75–56.00 s · INSERT 100 mm — LEFT fingers turn back the RIGHT cuff, pads rest on the patch
* Close-up hands staged on the chart table (no full figure), ~0.9 m (fingertip ≈ 12 % of frame height): right forearm
  palm-up across the frame with the **turned cuff showing the patch on the RIGHT cuff** toward the lens; the left hand
  from the upper right, fingers pointing to screen lower-left **30° below horizontal** (→ S012), index + middle pads
  solved onto the cuff surface (roll about the finger axis + translation, both pads within 0.1 mm of each other, touching)
  at **tl 0.25 (53.0 vocal end)** — the cut-in mid-gesture is a short settle + inward wrist roll — then nothing moves; the
  lantern pool brightens on the patch 1.0–2.5 s. Pads ≈ (0.51, 0.43) / (0.55, 0.61) around the registered (0.50, 0.52).
* **PROP_PATCH hero decal** (review): a skinned copy of the cuff's outward cloth in the library patch window (same place
  and size, 3.3 × 3.8 cm), drawn with plain weave #7D9CBB, irregular hand running stitches #E9E4D6, the uneven corner with a
  double knot and thread tail (upper-left on screen so the fingers do not hide it), a frayed turned-under edge and a centre
  rubbed pale; the library's flat patch underneath is painted over in the cuff colour.
* Hands: dull work-darkened nails (the library whitens the free edge and lunula — patched in this module's materials
  only), salt at 0.45 (fine crystals in the creases, not white blotches); softer, folded sleeve tubes; the cream roller end
  behind the cuff (brightest blob in frame) is hidden in this shot; skin balanced for the practical as in S007.
* Deviation: the fold-back itself is not animated (the library's cuffTurned cuff is a static roll); the patch is the
  library's 3.3 × 3.8 cm (bible 4.5 × 6 cm), kept for continuity with S035/S045/S067.

### view_cabin (nested, gallery G3a / S024)
* Navigator (`mid`) on the port side of the compass box, bent over it in profile, facing starboard; the lamp hangs from the
  hatch's forward trimmer at x 0.13 (review: 45 cm clear of his head-cloth — it overlapped his head from this angle) over
  the compass box / chart, lighting his profile from the front (point light ×2.6, spot widened to 1.15 rad), swinging; the
  barred stern window glowing blue behind the table at frame right; dust in the window shaft; slow truck screen-right over
  `u` for parallax.
* Aspect-aware: landscape RTs use a 22 mm lens; portrait RTs (pane aspect < 1.2, e.g. 1.4 / 2.4) use a 60° vertical FOV
  aimed a little starboard (review) so the lamp, his head, the window and the dial all sit in the narrow pane. No post in
  nested renders — values are linear HDR at the same levels as the main shots.

## Timing (1280 × 536)
Measured after the review (`out/check/ship_cabin/review/perf/`). The machine was shared with 3–5 other rendering agents
(load average 5–16 on 4 cores), so wall times swing ±2× between identical frames; the review therefore also measured a
**load-independent cost: CPU-seconds of this run's Chromium process tree per frame** (`review/perf/cpuprof.mjs`, utime+stime
of every process / SwiftShader thread under the render's node process, 12 frames after a warm-up frame). Idle estimate =
CPU-s ÷ 3.3 (the parallelism SwiftShader reached on heavy frames here, e.g. S006: 4.63 CPU-s in 1.39 s wall at load 7.5);
calibration: EMPTY engine frame 0.44–0.48 CPU-s ↔ 0.34 s idle (README).

| shot | frames | CPU-s / frame | wall s/frame (load) | est. idle s/frame | main costs |
|---|---|---|---|---|---|
| EMPTY (`_lab_perf`) | 1–12 | 0.44 / 0.48 | 0.39 (5.4) / 0.45 (11.6) | 0.34 | engine post + JPEG |
| S005 | 771–782 | 3.05 | 1.74 (6.5); `--range` 766–790: 1.48 (4.5) | ≈ 0.95 | 2 shadowed spots (lamp + window bars), shaft, curl re-deform; no DOF now |
| S006 thumb | 887–898 | 4.63 | 1.39 (7.5); `--range` 880–904: 3.03 (5.9) | ≈ 1.4 | full-frame brass dial (normal + ORM + env), T8 DOF over most pixels, close-up hand skin, thumb shadow pass |
| S006 dial only | 841–852 | 3.58 | 1.89 (7.8) | ≈ 1.1 | as above without the hand |
| S007 | 1005–1016 | 4.17 | 2.45 (8.2); `--range` 1000–1024: 2.33 (14) | ≈ 1.3 | hi figure + deck + sky dome + sail, DOF |
| S009 | 1173–1184 | 3.41 | 2.14 (8.9); `--range` 1170–1194: 2.50 (10.9) | ≈ 1.05 | full-frame dial, f/2.8 + tilt DOF (most pixels blurred) |
| S010 | 1213–1224 | 2.69 | 2.14 (12.8); `--range` 1210–1234: 1.47 (8.7) | ≈ 0.8 | hi figure head CU, shadowed kicker, DOF |
| S011 | 1283–1294 | 5.36 | 4.71 (14.2); `--range` 1280–1304: 2.07 (8.4) | ≈ 1.6 (worst) | two close-up hands + cuffs + sleeves + patch decal, shadowed lamp spot, DOF (bloom off) |
| NEST_CABIN lab (2 nested `view_cabin` RTs + outer) | 1–12 | 3.09 | 2.09 (11.6) | ≈ 0.95 | mid figure, lamp spot shadow, window light + shaft + dust |

All shots are inside the 2.5 s worst-case budget even at a pessimistic parallelism of 2.5 (S011 ≈ 2.1, S006 ≈ 1.85); S011
is the only one a little over the 1.5 s typical target. Perf changes in the review: S005 drops its DOF (shot list 全幅清晰),
S006 casts the lamp shadow only while the thumb is in frame, unused lights stay invisible. The module grain quad costs
≈ 0.02 s. Startup (scene build incl. textures + 5 figure/hand loads from the bake) ≈ 20–30 s. Raw numbers:
`out/check/ship_cabin/review/perf/{timing,timing2,cpu}.txt` (+ `perf/timing.txt` from the first build).

## Contact sheet / checks
* `out/check/ship_cabin/sheet.jpg` — every shot at u = 0.05 / 0.5 / 0.95, `view_cabin` (landscape), the G3a portrait +
  landscape panes (NEST_CABIN lab), and S007 at the '帆' sync frame.
* `out/check/ship_cabin/S0*_u{0.05,0.50,0.95}_*.jpg` — start / mid / end of each shot (review renders).
* `out/check/ship_cabin/sync_final/` (+ `sheet_sync.jpg`) — sync frames f769 f786 f799 · f869 f888 f907 f941 · f964 f1003
  f1019 f1026 f1033 f1055 · f1170 f1194 f1199 · f1200 f1233 · f1266 f1272 f1332 f1343 and the nested views.
* Review rounds: `out/check/ship_cabin/review/` (r1 = state before the review, r2/r3*/final/final2 after; s005*…s011* =
  per-shot iterations; consec = 6-frame flicker strips; match = S011 → S012 overlay; grain = scan-line check).
* Match registrations verified on the renders: S005 first frame = T03 numbers (islet, bars, stone, wax, lower edge — camera
  and chart layout unchanged by the review); S009 last frame pivot (0.46, 0.50), south tip at lower left (= S003
  orientation); S010 near-eye point measured (0.459, 0.499); S011 end: fingers to screen lower-left 30°, pads around
  (0.50, 0.52).
* For the gallery (S004): use `needleChart('museum')` from this module on the same 0.60 × 0.32 m sheet layout (see
  lib/ISSUES.md) — the T03 match cut depends on both shots drawing the same chart.

## Known weaknesses
* S010 cannot show the eye, the blink or the scar on the faceless head; the moodier chiaroscuro makes it read as a
  profile in the window light, but it is still the weakest frame of the module.
* The library 'headcloth' reads as a flat beret in S007 / S010 / view_cabin (lib hair style; not changeable here).
* Skin under the 1950 K practical stays warm-orange even balanced for the lamp; the faces / hands are still mannequin
  smooth (lib look).
* S006: the thumb is big in a 100 mm macro (≈ 40 % of frame for ~1.5 s) and enters from screen left, not lower right.
* S007: ≈0.5 s of the rise (2.25–2.8 s) is mostly the dark coaming band (the intended dark-wood seam); the sail is a
  stylised quad with bellied panels (no luff rope / yard detail).
* S011: patch is the library's 3.3 × 3.8 cm (bible 4.5 × 6 cm); the cuff fold-back is not animated.
* S004 (museum_gallery) does not exist yet, so the T03 cut is verified against the shot-list numbers only; S012
  (restoration_lab) currently opens with the pinch at ≈ (0.72, 0.57), not at the registered (0.50, 0.52) that S011 ends on.

## Review (art director + DP pass, 2026-10-05)
Re-rendered every shot at u = 0.05 / 0.5 / 0.95, every sync frame, the nested view in both pane aspects, 6-frame
consecutive strips (S009 settle, S011 hold) and the neighbours' adjoining frames (S008 f1075, S012 f1344); compared with
the brief, shot list (`gen.keyframe_en / endframe_en / motion_en`), bible §5.3 / §6.1 / §6.2 / §6.4 / §6.14 / §7.3 and
`director_rulings.md`. Problems found and fixed in `ship_cabin.js` (no engine / lib edits):

**Whole module**
* **Film grain printed as regular scan-lines** (engine hash precision at f760+, lib/ISSUES.md [sea_deck]) — very visible
  over S007's sky and S005's paper. Fixed with the pier_waiting recipe: engine grain 0, integer-hash grain in the half-res
  additive layer after the DOF, luminance-weighted; none in nested renders.
* **Lamp flicker strobed** frame to frame on the macro inserts (±5 %, S009 brass jumped visibly): flicker depth halved
  (`flk()`), the candle now breathes.
* **Skin read saturated orange** (1950 K light × P19 albedo): close-ups of skin (S007, S010, S011) are balanced for the
  practical (lamp #FFD7AD on skin, ≈2700 K camera) with a slightly cooler grade; skin is brown, the lamp still amber.

**S005** — the gust lifted the corner 6 cm straight toward a top-down lens, i.e. invisibly: now a true page curl (fold line
across the corner, wraps up past vertical, pale back face, moving shadow) that reads at 32.77 '蓝'. The window stripe was
lavender (warm spill + blue on cream): lamp pool narrowed to the left two-thirds, window bluer. Brass bars were stretched-
texture "copper pipes" → rounded cast bars with a spine, metre-scaled UVs. The stone ("wicker ball": masonry texture) →
smooth speckled sea pebble. DOF removed (shot list 全幅清晰).

**S006** — the thumb was a defocused dark-red band across half the frame (hand between lens and dial). Restaged from
screen left at the dial's focal distance, the distal thumb laid along the rim, one slow E → W drag over the salt, focus rack
to the nail and back for the glint's rest on 午, cool window fill on its near side: salt specks, cracked nail, the drag all
read.

**S007** — the crane rise never showed the hatch: tilt too fast, opening wider than the frame, the lid's black underside
filling the frame. New time-parameterised path (no velocity kinks): beam → forward coaming sweeping down as a dark band
with sail and sky beyond → through the opening → sail fills at 43.94 '帆'. Hatch lid moved to lean aft. Face reframed to
(0.58, 0.50); cool hatch skylight on the head-cloth (a spot here drew an ugly pool on the deck-head → hemisphere term);
warm chart bounce softens the split down the nose; deck-head untinted (it was a dead black field); lamp kept just out of
frame left. Sail gets a warm-head / cool-foot / batten-shadow gradient.

**S009** — in-use brass read museum chocolate: lamp solved so its reflection grades a warm sheen across the dial from upper
left; the bible's cool line along the needle added (faint, solved into the needle's top facet).

**S010** — an evenly lit orange mask → short-side chiaroscuro: cool window key on the front planes, warm shadowed kicker
from behind his left shoulder raking cheek / jaw / ear and swinging, socket in shadow. Fixed an "ember" in the nostril (the
unshadowed point light lit it through the head → the kicker is the lamp's shadowed spot). Near eye from the figure's own
`eye()`: measured (0.459, 0.499). Head-cloth no longer lit royal blue. A ≈0.7° head settle marks 51.39 '回'.

**S011** — the index finger floated above the cuff, fingers pointed ~0°/45° instead of 30°, the patch target sat on the
cuff's inner wall, the frame was too tight (no readable right hand), the patch was a flat sticker, nails were manicure-white
with salt "blotches", the sleeve a stovepipe and the chart roller end the brightest blob behind the cuff. Now: camera 0.9 m
(fingertip ≈ 12 % of frame), fingers at 30° to lower left, both pads solved onto the outer cloth (touching), the outer-
surface patch centre, a hand-stitched patch decal with the double-knotted corner, dull nails / fine salt, folded sleeves,
roller hidden.

**view_cabin** — the lantern overlapped his head from the vitrine's angle: moved along the trimmer 45 cm clear, lighting
his profile; the portrait pane aimed a little starboard so lamp, head, window and dial all fit the G3a pane.

Checked and fine: T03 registration (camera / chart layout untouched), T05 pivot → eye, sync timings (curl at 1.10 s, thumb
2.5 / glint 4.7, look-up 1.61 / sail 3.77, needle dead at f1194, pads settle at f1272), no NaN / black frames, no
z-fighting (decal 0.4 mm proud + polygon offset), consecutive frames differ only by grain and the lamp's slow swing.
Cross-module: S012's opening pinch is off its registered position (see Known weaknesses) — for the restoration_lab owner.

## Integration fixes (integration QA pass, 2026-10-06)

Source: `previz/qa/findings_by_module.json` (ship_cabin + the shared grain findings), the director's notes for the navigator
group (faces never frontal pink masks, S007 legible all the way, S010 eye-line + catch-light). Verify renders:
`out/fix_ship_cabin_sea_deck/` (survey of S004–S012 / S021–S023 / S044–S046 / S066–S068 / S074–S076, 960 px) and the iteration
stills in `out/check/ship_cabin/integ/`. Lab: `out/check/ship_cabin/integ/lab_shots.json` (`LAB_HEAD`: the dressed head from 8
angles). Dev params (all default off): `?s5=bd:…`, `?s6=kd:…,wf:…,bo:…`, `?s7=lk:…,hs:…,lx:…,lz:…,yw:…,ex:…,bo:…`,
`?s10=th:…,d:…,pd:…,bk:…,wf:…,lk:…,ll:…,cl:…,ex:…`, `?s11=wf:…`, `?off=dress,nail,nailsm,macroL,ds,flatL` (A/B probes).

**Grain (all shots).** The module's half-res grain quad + luminance probe and the `grain: 0` override are gone. Every shot
returns the CT_NAV era grain through post (`grain: 0.042`) and the engine's integer-hash grain draws it; nested views
(`view_cabin`) get none from the engine.

**Shared NAVIGATOR dressing — `dressNavigator(fig, { ear })` (exported; sea_deck uses it too).** The library 'headcloth' is a
smooth shell high on the forehead and above the ears: in close-ups it read as a beret on a bald pink mannequin with a big crisp
ear. Built once per figure, module-side:
* a **wrapped indigo head-cloth**: a spherical max-radius map of the head mesh around the head centre (dilated ±3 bins and
  blurred so it drapes over the ear instead of following it), hem low on the forehead with the two wraps crossing over it (an X
  of folds and a slight dip at the centre), over ≈ 80 % of the ear, tilted wrap layers round the back, the **topknot bump at
  the crown-back**, a knot and two short tails at the occiput; parented to the head bone; the library hair layer is hidden;
* a **short salt-bleached beard**: a skinned overlay of the head layer's jaw / chin / upper-lip triangles, 0.5–2.4 mm proud,
  dark brown with lighter tips, feathered into the skin with stochastic alpha (lips and upper cheeks bare);
* **weathered skin** #8F6346 (less saturated, almost no pink sheen), a faded indigo jacket #283043 (it read royal blue under
  the cool hatch/moon light) and a darker **交领 collar band** #161D2B (the library cross-collar trim is cut in the jacket's own
  colour, so the jacket read as a crew-neck sweater).

**`buildCuffFlap(hand)` (exported; S011 + sea_deck S045).** Replaces the library's static `cuffTurned` roll (the patch printed on
its outside read as a laundry label): a sleeve tube + a 4.6 cm FLAP hinged 6 cm above the wrist; `setFold(α)` α = 0 hangs over
the wrist like a plain cuff (outside = faded indigo), α = π is turned back over the sleeve so the flap's INNER face — with the
hand-sewn PROP_PATCH (#7D9CBB plain weave, off-white running stitches, one uneven corner with the double knot, rubbed centre,
4.3 × 4.3 cm) — faces out. The pinched side leads the fold. The patch is drawn in the flap's shader on the inner face only, at
an angle set per shot so it faces the lens. **`smoothNailFolds(hand)`** (exported): the close-up salt hands' nail-plate border
is a jagged surface-nets edge whose normals flip under a grazing practical — the "black squiggles / insects" on the
fingertips; the normals (and a little of the positions) of the nail border are Laplacian-smoothed in place. Close-up hands:
skin #8F6346, nails close to the skin colour, `uDetail` 0.35 (creases as faint hairlines).

| shot | QA finding (severity) | fix |
|---|---|---|
| S010 | blocker: bald pink mask, no eye, T05 fails, no strands | **restaged as a low-key eye-line CU**: he leans in to the barred stern window (eye ≈ 0.45 m from it), camera three-quarter behind his LEFT shoulder (115° from his facing), 100 mm, ~1 m; the barred window — deep dusk sky over the sea horizon, three soft dark bars — fills frame left behind his profile, so brow, nose, beard read as a near-silhouette edge with a thin cool rim (the window is the key); the lantern is a faint warm graze on cheek / neck / head-cloth from behind-left; **the eye is the window's catch-light exactly at (0.46, 0.50)** (T05 = the needle pivot; measured 0.460, 0.50) and the 51.39 '回' blink is that catch-light going out for 4 frames (f1234–1237); nine loose hair strands escape the head-cloth hem at the temple and move in the draught against the window. Cheat (ruling 2): the window behind his profile is a defocused plate — the real 55 × 40 cm opening cannot sit behind a 100 mm three-quarter face |
| S007 | major (figure): frontal warm mask, beret + sweater | dressed (head-cloth / beard / 交领 / faded jacket); turned 18° toward the lantern, which is cheated behind-left of him just out of frame (short lighting: the near cheek and most of the face in shadow, warm on brow, nose ridge, cheekbone, head-cloth); a cool dusk top light from the open hatch on the head-cloth, shoulders and chart; camera 25 cm below his eye line looking up a little; 20 cm further from beam A (his head no longer clipped by it); the cream chart roller hidden |
| S007 | major (timing): near-black passage, sail early & static, starry royal-blue sky | new crane (Hermite on position + yaw/pitch, zero velocity at 1.6 s): from 1.61 s it tilts up hard while easing aft under the hatch, so the dusk opening enters the frame top at ≈ 1.9 s and fills it by 2.83 s (43.0); the lantern's bounce lights the coaming / trimmer undersides through the passage (the darkest passage frame now reads as warm wood around a blue opening); out on deck it tilts to the lower panels of the sail, which fills the frame on 3.77 s (43.94 '帆') and keeps sliding down as the crane rises to the cut; sky = S008's dusk without stars (P01 → P03) |
| S011 | major: grey label patch outside the cuff, no fold, insect cracks | the cuff is `buildCuffFlap`; cut in mid-gesture: 0–0.17 s the left thumb + index, pinching the cuff's top edge in frame (so the hand never hides the patch), turn it the last part of the way back — the pale-blue patch swings into view on its inside — 0.17–0.27 s they let go and the index + middle pads settle on the patch at 53.0, then nothing moves; a little cool window light keeps the patch #7D9CBB pale blue under the lantern; nails/cracks fixed (above); the camera is shifted so the pads' contact sits at the S012 registration (measured 0.501, 0.52), fingers to lower left ~30° |
| S006 | major: thumb a defocused pink blob over 40 % of the frame | camera 1.45× further back (the dial and star ring still fill the frame), the focus racks to the thumb by 2.6 s so it is sharp as it enters on '刻' and back to the ring for the glint's rest on 午 (4.7 s); brown salt skin, warm chart bounce instead of the cool fill. The thumb still enters from screen left (see below) |
| S005 | minor: emissive orange weight, blind-like window stripes, invisible corner lift | 镇纸 as dull cast brass #8E7348 (env 0.22, metalness 0.55); the barred-window spot replaced by ONE soft vertical dusk-blue band at frame right (x 0.78–0.95) with two thin bar shadows along it (light × albedo in the chart shader); the gust curl lifts ≈ 5 cm (fold 12.5 cm, 2.35 rad) and reads on 32.77 |
| S009 | minor: needle barely moves | 8° off south at frame 0, 2.5 damped cycles (±4° by 0.6 s, ±1.3° by 1.1 s), envelope → 0 with zero slope: dead still from f1194 (49.77 '南'); pivot (0.46, 0.50) unchanged |
| S005–S021 | minor: module grain | removed (above) |

**view_cabin** — the `mid` navigator is dressed too (head-cloth, beard); framing, lamp and window unchanged.

**Not fixed / deviations (and why)**
* S006: the thumb is ≈ 30–35 % of frame height, not ≤ 15 %: a 2 cm thumb in a 100 mm macro of a 15 cm dial cannot be smaller
  without losing the ECU; it still enters from screen left (staging from the lens side puts the hand between lens and dial).
* S007: kept the shot list's 32 mm MCU (head ≈ 50 % of frame height) rather than QA's 40 mm MS: the cabin is 2 m long and the
  camera is already at the stern wall; the hatch opening is not in frame at frame 0 (it is above the camera) — it enters as
  soon as the tilt starts.
* S010: the window behind his profile is a cheated plate (ruling 2); a faceless head has no eye, so the eye-line + catch-light
  carry the shot.
* S011: the patch is 4.3 × 4.3 cm on a 4.6 cm turn-back (bible 4.5 × 6 cm) — a 6 cm patch needs a 6 cm cuff turn-back.
