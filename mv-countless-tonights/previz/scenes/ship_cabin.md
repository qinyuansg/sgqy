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
  are**, a round grey stone on the lower-left corner, a candle-wax drip at (0.30, 0.62).
* **Compass** (in-use state): lathe-turned brass body with raised rim lip, `TX.compassFace({state:'then'})` dial on a
  ring (the well is open), cream-tan lacquered well floor with the N–S double line, golden laminated mica, a blued-steel
  diamond-section needle (3.6 cm) with the red-lacquer south tip and brass cap, a soft contact shadow, white salt bloom on
  the rim at 午 (wiped by the thumb in S006). Dial south → world −z (aft).
* **Horn cabin lantern** (`FX.lantern('horn', size .45)`), hung from beam A, swinging with the roll (≈7 s): its own
  PointLight (unshadowed fill) + a shadow-casting SpotLight at the flame pointing down (the only figure shadows).
* **Stern window**: `FX.windowLight` (deep dusk blue through the `bars` cookie, shadowed far spot + visible bars) and a
  faint `FX.windowShaft`; outside a cheap gradient backdrop (dusk sky / faint warm horizon / dark sea), no sky dome.
* **Above deck (S007)**: deck planking with the hatch coaming and propped lid, bulwarks, mizzen mast, a **battened junk
  sail** (10 panels bellied forward between bamboo battens, coarse rust-ochre cotton with seams and patches, panel
  translucency via the emissive map), sheets fanning to a block, the `createSky('dusk')` dome; cool sky hemisphere +
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
* Lamp pool from the upper left, cool barred window stripe on the right third; at **tl 1.10 (32.77 '蓝') the gust lifts the
  free lower-right corner ~6 cm, it flutters and settles by 2.6 s**.
* Deviation: the cool stripe reads as a desaturated grey-blue on the cream paper (it adds to the warm lamp light) rather
  than a saturated P03.

### S006 · 34.50–40.17 s · ECU 100 mm macro — glint along the star ring, thumb wipes the salt at 午
* Locked camera low over the dial's SE side (~0.28 m, ~36° down, f/5.6, focus on the star ring; bearing glyphs in front are soft
  → illegible). The **light moves, not the camera**: the lantern is positioned each frame (out of frame) by solving the
  mirror geometry so its specular glint (+ a small glint sprite) walks the star ring from ESE to 午: over the star points at
  1.7 s (36.21 '星辰'), resting on 午 at 4.7 s (39.21 '盘').
* Thumb: enters at 2.5 s (36.99 '刻'), one ~1 s push stroke across the salt at 午 (the salt band on the rim is
  alpha-wiped behind it), withdraws by 4.0 s. Bounce fill from the lens side so the near thumb is not a pure silhouette.
* Deviations: the camera sits ~36° above the dial at ~0.28 m (a touch steeper than "grazing", so the star ring, the well
  with the needle and the south rim all read); the thumb, coming from his side, enters from the **upper right** as a long
  soft warm-dark shape whose pad lands on the rim at lower left — not from the lower right (every lower-right staging put
  the forearm in front of the lens). The salt wipe is small in frame. Ring order: library dial has the star ring inside
  the bearings (see lib/ISSUES.md), so the star band is the sharp middle band with the glyph ring soft in front.

### S007 · 40.17–44.79 s · MCU 32 mm → crane rise through the hatch to the sail (T04)
* Navigator stooped under beam A over the table, face at ≈ (0.58, 0.55) with beam A behind the head-cloth, warm lamp from the left (practical cheated to the
  starboard end of beam A so it is out of frame and ≥ 40 cm from him), cool skylight from the hatch on the head-cloth.
* 1.61 s (41.78 '你把半生'): he lifts his head to the hatch (lookAt); the camera starts rising (ease-in) along his
  eyeline, tilting up past beam A, through the hatch (≈2.9–3.1 s), out above the coaming; 3.77 s (43.94 '帆') the
  battened sail fills ~80 % of frame, still rising to the end. Focus pulls face → beam → sail; exposure ramps ×1.9 and
  the grade cools across the hatch passage.
* Deviation: no momentary all-black "hatch wood fills frame" seam (CG needs no hidden cut); the sky is visible through the
  opening slightly before the passage.

### S009 · 48.29–50.00 s · ECU 100 mm top-down — needle settles exactly on 午
* Camera 0.40 m straight down, up vector solved so the **south tip points at screen 215° (lower left, as in S003)** and
  the **pivot sits at (0.46, 0.50)** (T05 A-frame); a 4° tilt puts the frame's left/right edges out of the focal plane
  (bearing glyphs soft); f/2.8 focused on the needle.
* Damped oscillation ±8° → ±4° (0.6 s) → ±1° (1.1 s), **dead stop at tl 1.455 so frame 1194 (49.77 '南') is at rest**
  on the N–S line; f1170 (48.75 '根针') still swinging. Cool window fill gives the line along the needle.

### S010 · 50.00–52.75 s · CU 100 mm — the eye, gaze to frame left (T05 B-frame)
* Navigator **seated** on the sea chest at the table's forward end (the shot text says he sits), head turned to the
  stern window; camera at his front-left (his LEFT, scar side), ~0.97 m, the near-eye point placed at (0.46, 0.50),
  imperceptible push. Warm lantern (cheated to his left) on the cheek, cool window key on the front planes (brow, nose).
* Deviations: faceless mannequin → **no eye, no blink at 51.39**, no eyebrow scar; the loose strands at the head-cloth
  edge were tried and removed (on the sculpted head they read as cracks). The shot reads as a profile fragment of the
  head; the T05 match is by position only.

### S011 · 52.75–56.00 s · INSERT 100 mm — LEFT fingers turn back the RIGHT cuff, pads rest on the patch
* Close-up hands staged on the table (no full figure): right forearm palm-up across the lower frame with the **turned
  cuff showing the pale-blue patch (#7D9CBB, stitched border) on the RIGHT cuff**; left hand from the upper right,
  index + middle pads land on the patch's far edge at **tl 0.25 (53.0 vocal end)** — the cut-in mid-gesture is a short
  settle + inward wrist roll — then nothing moves; the lantern pool brightens on the patch 1.0–2.5 s. Patch centre is
  measured from the cuff geometry's patch mask each frame; contact ≈ (0.50, 0.52).
* Deviation: the fold-back itself is not animated (the library's cuffTurned cuff is a static roll); fingers point
  ≈ 45° rather than 30° below horizontal.

### view_cabin (nested, gallery G3a / S024)
* Navigator (`mid`) on the port side of the compass box, bent over it in profile, facing starboard; lamp hanging from the
  hatch's forward trimmer right above the dial and swinging; the barred stern window glowing blue behind the table at
  frame right (moonlight upper right); dust in the window shaft; slow truck screen-right over `u` for parallax.
* Aspect-aware: landscape RTs use a 22 mm lens; portrait RTs (pane aspect < 1.2, e.g. 1.4 / 2.4) use a 60° vertical FOV
  so the lamp, his head and the dial stack vertically. No post in nested renders — values are linear HDR at the same
  levels as the main shots.

## Timing (1280 × 536, `render.mjs --range`, 24 frames from each shot)
See the table below; measured while 3–4 other agents were rendering (load average 10–19 on 4 cores). The engine's empty
frame (`_lab_perf` EMPTY via tools/bench.mjs) measured 0.65–1.7 s in the same windows (0.34–0.37 s idle), i.e. a load
factor of ≈ 2.5–4.5×; the idle estimates divide by the factor measured next to each run.

| shot | frames timed | measured mean (max) s/frame | load avg | est. idle s/frame | main costs |
|---|---|---|---|---|---|
| S005 | 760–784 | 3.24 (6.56) | 13.7 | ≈ 1.0 | 2 shadowed spots (lamp + window bars), window shaft, DOF f/5.6 |
| S006 | 860–884 | 4.64 (6.24) | 10.8 | ≈ 1.4 | full-frame brass dial (normal + ORM + env), DOF; thumb frames 888–950 ≈ +0.2 |
| S007 | 1000–1024 | 5.20 (9.77) | 11.1 | ≈ 1.6 (max ≈ 3 on the first rise frames) | hi figure + sky dome + sail, DOF |
| S009 | 1170–1194 | 6.18 (8.25) → 5.27 after light pruning | 12.8 | ≈ 1.5 | full-frame dial, DOF f/2.8 + tilt (most pixels blurred) |
| S010 | 1210–1234 | 4.54 (7.83) | 15.1 | ≈ 1.2 | hi figure head CU (procedural skin), DOF |
| S011 | 1280–1304 | 10.36 (12.6); 6.85 re-run (EMPTY 0.9 s) | 14.9 | ≈ 2.4–2.8 (worst) | two close-up hands + cuffs: the lib's procedural skin/cloth shaders cover ~70 % of frame (`?figmat=plain` → 4.0 s ≈ 1.5 s idle) |
| NEST_CABIN lab (2 nested `view_cabin` renders 420×720 + 640×400 + outer) | 0–12 | 4.60 (7.22) | 19.0 | ≈ 1.2 (the nested view itself ≈ 0.4–0.5) | mid figure, lamp spot shadow, window light + shaft + dust |

After the timing run: zero-intensity / unused lights are made invisible (they leave every material's light loop), the
chart sheet is only re-deformed when its lift changes, S009 has no lamp shadow pass, structure meshes no longer cast
shadows, and S011 skips bloom. Startup (scene build incl. textures + 5 figure/hand loads from the bake) ≈ 45–60 s under
the same load. Raw numbers: `out/check/ship_cabin/perf/timing.txt`.

## Contact sheet / checks
* `out/check/ship_cabin/sheet.jpg` — every shot at u = 0.5 + `view_cabin` (landscape) and the G3a portrait/landscape panes.
* `out/check/ship_cabin/S0*_u{0.05,0.50,0.95}_*.jpg`, `all_u.jpg` — start / mid / end of each shot.
* `out/check/ship_cabin/v3/` — sync frames f769 f786 · f869 f888 f941 · f1003 f1030 f1055 · f1170 f1194 · f1200 f1233 ·
  f1266 f1272 f1332.
* Match registrations verified on the renders: S005 first frame = T03 numbers (islet, bars, stone, wax, lower edge);
  S009 last frame pivot (0.46, 0.50), south tip at lower left (= S003 orientation); S010 near-eye point (0.46, 0.50);
  S011 end contact ≈ (0.50, 0.52), fingers to lower left (→ S012).
* For the gallery (S004): use `needleChart('museum')` from this module on the same 0.60 × 0.32 m sheet layout (see
  lib/ISSUES.md) — the T03 match cut depends on both shots drawing the same chart.

## Known weaknesses
* S010 cannot show the eye, the blink or the scar on the faceless head; it is the weakest frame of the module.
* S006 thumb is a big soft shape from the upper right that covers half the frame for ~1 s; salt wipe small.
* S005's window stripe is a pale grey-blue rather than the bible's P03.
* S011 is the heaviest shot (≈ 2.4–2.8 s idle estimate), at or slightly over the 2.5 s worst-case budget; the cost is the
  library's procedural skin/cloth shading of two frame-filling close-up hands.
* The sail is a stylised quad with bellied panels; no luff rope, no yard detail; rigging is minimal.
* Cabin interior is lit only by the lantern + window: deep blacks in S007's background.
* Practical cheats: the lantern hangs at a different point of beam A per shot (S005/S009/S011 default, S007 starboard,
  S010 port, view_cabin from the hatch trimmer, S006 solved off-frame for the glint) — never two of these in one frame.
