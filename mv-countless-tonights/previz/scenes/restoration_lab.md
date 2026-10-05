# restoration_lab — conservation lab in the old customs house

Module: `scenes/restoration_lab.js`. Shots: **S012 S013 S014 S015** (PRE1, ~0:57–1:05) and **S049 S050 S051 S052 S053 S054** (BR1, ~2:35–2:55). There are no named views.

Contact sheet (all shots at u=0.5): `out/check/restoration_lab/sheet.jpg`.

Other check frames:
- Stills at u 0.05/0.5/0.95: `out/check/restoration_lab/S0xx_u*.jpg`
- Sync-point frames: `out/check/restoration_lab/sync/`
- Cut pairs with the neighbouring modules: `out/check/restoration_lab/match/`

## Set (shared by all shots)

### Room
- **Walls:** plaster walls on terrazzo, south wall with a deep arched sash window.
- **Window:** sash bars come from the `TX.windowCookie('sash')` alpha. A painted harbour night backdrop (2048×1024 canvas) sits 60 m out, with 16 small quay glows.
- **East-wall door:** the door leaf has a glazed pane at y 1.39 m. A dark corridor box sits behind it. The corridor has a ShaderMaterial "torch spot" that S050 sweeps across the pane.
- **Furniture:** oak bench (straight-grain canvas texture), stool, shelving, and a small 2700 K shelf lamp.

### Light
- **Task lamp:** an articulated head with a 2700 K spot that casts shadows. `setLampE()` sets it by target illuminance (I = E·d²), so exposure stays consistent when the lamp moves or is lowered (S051).
- **Moonlight:** `FX.windowLight` through the sash with no bounce; its shadow is off by default for performance.
- **Fill:** a weak hemisphere light, a bench bounce and a face fill.
- Reflective materials get the `night_museum` envMap one by one. A global `scene.environment` cost too much on SwiftShader.

### Props
- Foam pad, sand tray, brushes, scalpel, ledger on a grey foam cradle, and pencils.
- **Rattan case:** woven body, leather corners, one broken corner, straps and buckles, a worn **handle bar** and a lined interior. Inside are a folded shirt, a comb on a cloth, and the **sleeved letter**.
- **Letter workstation (BR1):** bamboo tweezers, a blotter and a hand magnifier with a magnified lens view.

### The bowl and its shards
These follow the bible PROP_SHARDS locks: the canonical plum rim band, cracks that never cross a blossom, and **one piece missing**.

`TX.bowlShards()`'s default layout breaks those locks, so the module builds its own layout. See `lib/ISSUES.md` for the details.
- **Layout:** weighted Voronoi seeds `SHARD_LAYOUT`, with pieces A–G plus MISSING.
- **Placement checks:** the seeds were solved offline so that every rim-band crossing falls between blossoms. MISSING is a lower-body piece at 3 o'clock when seen from above, and the foot-ring piece A can come loose.
- **Geometry:** each shard is its own subset of the bowl geometry, built per cell (`subGeo`), rather than the whole bowl drawn with a discard. That change alone cut S012/S013 from ~6.9 s to ~1.3 s per frame.
- **Restored bowl (S015):** uses `mode: 'cracked'` with the gap left by MISSING. The `noA` variant shows the foot ring lifted out.

### RESTORER
- **Body:** `loadCharacter('RESTORER')`, the hi model. Low ponytail, dark-grey wool coat with the worn LEFT cuff, and warm-white gloves.
- **Pose:** `poseSeated()` wraps lean, hip bend, spine/chest/neck/head and yaw, so the seated pose is consistent across the four medium shots.
- **Head magnifier (S014):** a custom loupe (band, visor, twin lenses) parented to the head bone, because the library has no head loupe.
- **Close-ups:** they use `loadCharacterHand('RESTORER', 'R'|'L', {lod:'close'})` with a wool coat-sleeve cylinder (glove colour ×0.84 in shadow). The body is hidden in those shots. **At most one hi figure is ever in frame.**

### Letter
- **Paper:** a single double-sided `letterM` (`gl_FrontFacing` picks the back map). It has fold valleys in the geometry and a `uCurl` uniform for the flip.
- **Front texture:** 150 px/cm, with procedural cursive "running-hand" strokes. The marks are abstract and illegible: no characters, no numerals.
- **Back texture:** 90 px/cm, with the front mirrored through as faint show-through.
- **S051 macro:** uses a separate 300 px/cm patch.
- **Last column:** ends in a dry-brush **broken stroke**.
- **Jasmine:** a 2.6 cm pressed-jasmine alpha card is mounted on the back of the sheet.

### Determinism
- No `Math.random` and no `Date`. Paper fibres, grain, stroke jitter and the rattan come from `ctx.util.rng(seed)`, `noise1` and `fbm1`. Lamp and torch flicker use `ctx.util.flicker`.
- `setShot` is pure. Every shot calls `state({...})` to set all visibility and prop placement, and calls `pose()` before any hand placement.

### Debug probes
These are URL query parameters; they are inert in production renders.
- `?off=pts` prints the screen-space positions of registration points. It was used for every registry check below.
- `?off=tris`, `info` and `door` print geometry and render statistics.
- `?off=dof,lshadow,moon,bloom,…` switches features off for performance bisection.
- `?camd=` and `?camf=` dolly the camera out for set inspection.

## Per shot

Timing columns:
- **Measured** = median wall-clock time per frame on this shared 4-core box at load ~9–10.
- **≈ idle** = the measured time divided by the cost ratio of an EMPTY engine frame rendered next to it (0.34 s on an idle box).

The method and its reason are in `lib/ISSUES.md`. The bench script is `out/check/rl_bench3.mjs`.

### S012 — ECU 75 mm, MATCH CUT from S011 — "碎": two shards interlock (57.20 s)

**Implemented**
- **Registration:** the gloved right index/thumb pinch holds the fingertip at **(0.501, 0.521)** for the whole shot, measured by projection.
- **Hand:**
  - Fingers run upper-right → lower-left at ~30°. A swing angle about the thumb axis is solved once and cached as `setups._s012beta`, because the wrist sat directly above the fingers at 72°.
  - The fingertip is about 12% of frame height.
  - The camera was pushed in from 1.04 m to 0.86→0.83 m so the finger scale matches S011's salt-crusted fingers at the cut.
- **Action:**
  - The joined B+E section is propped arch-like on the foam.
  - Shard C slides in on keys [0 → 0.55 s → 1.2 s] and interlocks at the "碎" beat (57.20 s).
  - Side A's moon/boat motif and the plum band read across the joint.
- **Light:** the task lamp is high to the SW, so the hand does not shadow the joint.
- **Post:** f/4.5 with focus on the joint, exposure 0.85, light handheld (0.1).

**Deviations**
- The partner shard comes in from the upper-left/left, not the lower-left. Coming from below, it would sit under the registered fingertip and the hand.
- The worn LEFT cuff is not in frame: only the right hand is in shot.

**Timing:** measured 1.79–4.06 s; ≈ idle 1.32–1.67 s, typical ≈1.5 s.

### S013 — macro 100 mm along the crack to the intact plum band (58.64 / 60.26 s)

**Implemented**
- **Move:** a surface-hugging move with camera up = surface normal. It climbs the crack, reaches the plum band at 58.64 s ("春色"), then tracks along the band (φ 63° → 30.5°) and settles on an intact rim at 60.26 s ("沿").
- **Post:** f/14 with maxCoc 0.6 so the band stays readable.
- **Lamp specular:** the glaze specular travels with the move.

**Deviations:** none of note.

**Timing:** ≈ idle 2.3 s, the worst of the PRE1 shots. The whole near-field bowl at macro magnification means many glaze/clearcoat pixels plus the lamp shadow. This is under the 2.5 s cap but above the 1.5 s typical target.

### S014 — MCU 75 mm, reads the foot-ring shard under the head magnifier and writes the date (62.28 / 62.82 s)

**Implemented**
- **Framing:** 8° yaw on the seated restorer, pushing 2.45 → 2.40 m.
- **Action:**
  - She wears the head loupe.
  - From 0.85 to 1.2 s she lifts piece A, the loose foot ring, and turns it over. That is the 62.28 s beat ("读懂").
  - The pencil lands on the ledger at 1.57 s (62.82 s, "年代"). The writing is abstract.
- **Post:** f/2.8 with focus on the eye, exposure 1.15.

**Deviations**
- The window is not in frame from this angle. Its cool light reads only as a rim on her back.
- Her face is the library's faceless mannequin, so the "reading" is carried by head angle and the loupe.

**Timing:** ≈ idle 1.31 s.

### S015 — CU 100 mm, ~15° overhead of the restored bowl in the sand tray; MATCH CUT to S016 (64.43 s)

**Implemented**
- **Rim:** the rim circle is centred at **(0.50, 0.52)**, Ø ≈ **79–80% of frame height**, with the camera 15° from vertical.
- **Orientation:** frame-up is NW, which puts side A at 12 o'clock and the MISSING gap at 3 o'clock.
- **Light:** the lamp sits at (−0.02, bench + 0.5, −0.70) at 1.0 lx·eq, and env intensity is 0.25.
- **Camera:** locked off, still on the long "代" (64.43 s).
- **Post:** f/8, exposure 0.92, vignette 0.42.

**Deviations**
- **The specular highlight sits at about (0.50, 0.30), not (0.36, 0.24).** On a glazed hemisphere seen nearly from above, the reflected lamp stays close to the centre-top. Pushing the lamp far enough to move it left also moved the hot spot into the bowl's well and underexposed the rim. Trying several lamp positions, none got both, so I kept the well-exposed version.
- The outer near-lip band is barely visible at a 15° tilt. The inner band and the cracked glaze carry the read.

**Cross-module check (S016, old_home.js)**
- At the cut (f01565 → f01566), S016's first frame has its bowl rim centred at about **x ≈ 0.66**, Ø ≈ 75%.
- The comment in `old_home.js` claims (0.50, 0.52) at 78%. **The match cut will jump unless old_home re-centres S016.**
- I did not edit `old_home.js`. Its iteration task is still open.

**Timing:** ≈ idle 1.6–2.4 s, depending on how much of the clearcoat bowl the lamp shadow covers. A long locked-off shot of a hemisphere on SwiftShader is costly.

### S049 — CU 75 mm, MATCH CUT from S048 — opens the case, lifts the comb, takes out the sleeved letter (155.34 / 157.02 s)

**Implemented**
- **Registration:** the worn rattan **handle bar sits at y 0.661 and spans x 0.28–0.72** at the cut, measured from its two end points.
- **Camera:** 62° elevation, 10° tilt, 0.71 m.
- **Action:**
  - The gloved right hand is on the bar from the cut, at 155.34 s ("你的明天"), and opens the lid on its pivot (0–1.1 s).
  - The same hand moves the comb and cloth aside (1.1–1.6 s).
  - From 1.6 s it takes the sleeve's edge and draws the sleeved letter out from under the shirt and up toward the lamp, by 157.02 s ("我的从前").
  - Focus racks from the bar to the sleeve between 1.6 and 2.6 s.
- **Post:** f/4, exposure 1.0.

**Deviations**
- I used a **10° tilt instead of ~15°**: at 75 mm, 15° pushed the bar out of the registered band.
- During the comb lift the wool sleeve fills much of frame right. It is honest to the action, but heavy.

**Timing:** ≈ idle 2.22 s. Rattan and lining canvases plus the shadowed lid make this the worst BR1 shot after S054, still under 2.5 s.

### S050 — MS 75 mm, pencil tick in the ledger; torch through the door glass behind her (158.52–160.92 s)

**Implemented**
- **Framing:** the seated restorer sits at about (0.44, 0.48). The camera is yawed 4° and creeps 2.95 → 2.75 m.
- **Action:**
  - She ticks the ledger row at 0.52 s (158.52 s, "读过年月"). The page swaps to the ticked canvas.
  - The pencil follows her reading and stops in the air at 1.96 s (159.96 s, "把你").
  - She lifts her gaze inward from 2.85 to 3.25 s (160.92 s, "看穿").
- **Torch:** a **single torch sweep crosses the door glass** right → left from 2.5 to 2.9 s (160.5 s), with the sin^0.5 envelope. The door pane sits at about (0.15, 0.38).
- **Post:** f/2.4 with focus on the eye, exposure 1.12.

**Deviations**
- The worn left cuff sits low against the bench and is barely readable.
- The window appears only as a sliver.
- The ledger sits on a foam cradle, an invention that keeps it readable at this height.

**Timing:** ≈ idle 1.72 s.

### S051 — ECU 100 mm macro, lamp lowered, along the unfinished last line; stop on the broken stroke (162.75–164.30 s)

**Implemented**
- **Lamp:** lowered over 0–0.4 s, so the pool shrinks to the sheet and rakes across it.
- **Move:** a low grazing slide from 0.17 to 1.72 s along the last column of strokes, settling on the dry-brush **broken stroke at (0.61, 0.50)**.
- **Paper:** the 300 px/cm macro patch gives the fibre.
- **Post:** f/5.6, exposure 0.78 → 0.82, contrast 1.1, slightly warmer temp −0.04.

**Deviations:** the stop sits 0.01 left of (0.62, 0.50).

**Timing:** ≈ idle 1.22 s.

### S052 — CU 75 mm overhead, bamboo tweezers flip the sheet; pressed jasmine revealed (166.0 / 167.2 s)

**Implemented**
- **Action:** the tweezers lift the edge, and the sheet curls through the `uCurl` hinge and turns over at 166.0 s ("翻"). The back, with mirrored show-through, settles.
- **Jasmine:** it reads at about **(0.558, 0.435)** by 167.2 s ("这段").
- **Post:** f/5.6, exposure 1.05.

**Deviations:** the jasmine is 0.02 left of and 0.025 above (0.58, 0.46). The sheet's fold geometry limits where the card can go.

**Timing:** ≈ idle 1.38 s.

### S053 — CU 75 mm overhead, pencil laid down beside the year (168.72 / 169.38 s)

**Implemented**
- **Framing:** frame-up = north, so the ledger is left and the letter is right, as the spec asks, and her hand comes from the top of frame.
- **Action:**
  - The pencil is laid down at 168.72 s ("别只读").
  - It comes to rest beside the ledger's year entry, an abstract mark at **(0.495, 0.467)**, at 169.38 s ("年份").
- **Post:** f/4, exposure 1.05.

**Deviations:** the hand comes in from the top rather than the side, which follows from the left/right placement the spec requires.

**Timing:** ≈ idle 1.31 s.

### S054 — CU 100 mm, magnifier; focus flower → eye; spectral halo upper right; light-anchor into S055 (170.82–174.30 s)

**Implemented**
- **Camera:** low at the paper plane, WSW of her, at (−1.70, bench + 0.075, −0.36), with a slow 5 cm push. Her eye is framed at (0.52, 0.42).
- **Magnifier action:** she bows low over the flower. The magnifier, in her **left** hand, descends between 0.3 and 0.6 s (170.82 s, "没说完").
- **Lens view:** a magnified render-to-texture sub-window of the main camera (`setViewOffset`). It writes `gl_FragDepth` at the eye's depth, so the engine DOF focuses through the glass.
- **Rack focus:** flower → eye, starting at 1.93 s (172.14 s) and landing at 2.71 s (172.92 s, "欢").
- **Halo:** from 4.09 s (174.30 s) she turns the glass about 15°. The rim catches the lamp, and a **spectral halo ring** blooms on the screen-upper-right side of the rim, with a caustic on the paper.
- The S055 transition is a 0-frame "light" cut, so the halo is lit before the last frame.
- **Post:** f/2.4, exposure 1.05.

**Deviations**
- **The lens is in front of her eye, not over the flower.** A right-hand hold crossed her face from this camera side, so the magnifier moved to the left hand. Over the flower, the lens would have shown only hair from this angle.
- The "eye through glass" read is limited by the faceless head.
- **The halo lands at about (0.60, 0.38), not (0.72, 0.30).** The halo is tied to the lens rim, and the lens is tied to the eye registration.
- It is a CU, not an ECU: a 100 mm lens at 1.7 m is the closest the bench and ledger geometry allow at paper height. The ledger and cradle are hidden (`noLedger`) because they blocked this low camera.

**Timing:** ≈ idle 2.30–2.45 s, the worst in the module. The lens render-to-texture is a second partial scene pass, under the 2.5 s cap.

## Summary of frame times (≈ idle-equivalent s/frame)

| shot | s/frame | | shot | s/frame |
|---|---|---|---|---|
| S012 | 1.5 | | S050 | 1.72 |
| S013 | 2.3 | | S051 | 1.22 |
| S014 | 1.31 | | S052 | 1.38 |
| S015 | 1.6–2.4 | | S053 | 1.31 |
| S049 | 2.22 | | S054 | 2.3–2.45 |

All shots are under the 2.5 s worst case. S013, S015, S049 and S054 are over the 1.5 s typical target, for the reasons given above.

Raw renders on this box at load 9–10 run 3.5–5 s/frame, because the box is shared with the other module agents.

## Known weaknesses (module-wide)
- **Faceless figure:** the library's faceless head limits the S014, S050 and S054 performances (reading, the lifted gaze, the eye in focus).
- **Cross-module match cuts:**
  - **S011 → S012** reads well: the fingertip registers and the scale matches after the push-in.
  - **S015 → S016** will jump until old_home re-centres its bowl.
- **S015 specular** is at the top centre, not upper-left.
- **S054 halo position and lens placement** differ from the spec (see above).
- **Moonlight shadows are off by default** for performance, so the sash pattern is a light cookie, not a cast shadow on the bench.
- **The S012 sleeve** is a plain cylinder: no cuff wear is visible on the right sleeve, which is correct, since the wear is on the LEFT cuff.
- **Library issues** are logged in `lib/ISSUES.md`:
  - The `bowlShards` default layout violates the PROP_SHARDS locks, so a custom layout is used.
  - Benchmarking on a shared machine needs the ratio method.
