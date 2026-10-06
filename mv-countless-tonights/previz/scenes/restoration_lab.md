# restoration_lab — conservation lab in the old customs house

Module: `scenes/restoration_lab.js`. Shots: **S012 S013 S014 S015** (PRE1, ~0:57–1:05) and **S049 S050 S051 S052 S053 S054** (BR1, ~2:35–2:55). There are no named views.

> **Review pass (art director + DP, 2026-10-05):** several shots were restaged after this was written. Where the per-shot
> notes below conflict with the **Review** section at the end of this file, the Review section is current.

Contact sheet (all ten shots at u 0.05 / 0.5 / 0.95, one row per shot): `out/check/restoration_lab/sheet.jpg`.

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

---

## Review — art director + DP pass (2026-10-05)

**Method.** Every shot re-rendered at u 0.05 / 0.5 / 0.95 plus every sync-point frame, the four cut pairs with the
neighbouring modules (S011→S012, S015→S016, S048→S049, S054→S055), six consecutive frames for flicker, and the module code
read end to end. The figure library had been re-baked (`fig-2`) after this module was finished, so all hand/prop contacts
were re-checked. Review renders: `out/check/restoration_lab/review/` (`r0` = state found, `r1…r10` = iterations,
`consec/`, `order/`, `zoom/`). Final stills: `out/check/restoration_lab/S0xx_u*.jpg`, `sync/`, `match/` (+ `match/pairs.jpg`),
contact sheet `out/check/restoration_lab/sheet.jpg`.

### What was wrong (state found)
| shot | problem |
|---|---|
| S012 | the coat-sleeve tube ended in frame as an **open pipe** (upper right); gloves over the bloom threshold → white halos everywhere; flat grey shadow side |
| S013 | opening frame: a hot point glint dead-centre on the **crescent-moon motif read as an eye**; end band too high (lip ≈0.2), lower 70 % plain glaze |
| S014 | camera faced a blank stretch of wall → **black void**; face rim-lit into a mask; shard read black |
| S015 | the **glue tube in frame** (negative: "tools in frame"); MISSING read as a 3 mm sliver (cell was a 1.5 cm-high strip); flat high-key sand |
| S049 | match-cut frame: a glove "blob" already on the bar (the matched element half hidden); mid-shot the sleeve filled half the frame; end: the letter lifted into the lens, **black holes at the "fingertips"** (open sleeve ends seen end-on); the sleeve poked through the case front wall (white strip); comb cloth saturated red over ~25 % of frame (P16 ≤ 0.5 %) |
| S050 | black void; the door was off the left edge, so **the torch sweep (160.5 s) was never seen** |
| S051 | the 300 px/cm macro patch started 1.6 cm **beyond the page edge** (paper rectangle hanging over the blotter), flat cream exposure |
| S052 | the **ledger filled the right half** of the CU; the tweezers lifted the wrong (east) edge and the hand hovered over the sheet; jasmine a 4 % star at the sheet edge |
| S053 | the foam cradle (an upright box) **swallowed the near half of the tilted ledger**; hand came from the left and never left frame; pencil hidden in the fist |
| S054 | unreadable: a giant soft mannequin face lying sideways from a paper-level lens, magnified *nose* in the glass, no jasmine, halo invisible |
| all | letter "writing" = free cursive squiggles (read as birds / AI pseudo-script); PRE1 shots never reset the moon direction that BR1 shots set (impure: frame order changed the light) |

### What was changed (all in `scenes/restoration_lab.js`)
- **Set:** east-wall door moved to z −0.86 (behind her in the profile MCUs; S050 pane registers at (0.146, 0.33) ≈ (0.15, 0.38));
  corridor beyond gets the bible's floor-level 4000 K night base light, so the pane reads before the torch passes; shelving +
  2700 K lamp moved next to it; a second harbour backdrop panel for the oblique views through the window's east half; a cool
  unshadowed `wallWash` (moonlit bay bouncing onto the SE corner) for S014/S050.
- **Hands:** `placeArm()` — close-up hands are oriented from her (seated) shoulders, so forearms enter from her side; sleeves
  0.36 m, tapered and **capped**; gloves toned ×0.74 (close-up) / ×0.72 (figure), once per material.
- **Letter:** glyphs rebuilt as small-regular-script structures (1–2 components of 2–4 brush strokes, still abstract);
  jasmine redrawn (two whorls of thin browned translucent petals, calyx, stem), 3.4 cm card, nudged off the edge; macro patch
  clamped inside the sheet, follows the fold relief, gains a fibre normal map.
- **Purity:** `state()` now resets every shared prop each frame (ledger + cradle, shirt, comb, letterInner offset/rotation,
  curl, moon direction, hemi, lamp shadow, shard env), so no shot depends on what rendered before it.
- **S012:** cool fill on the shadow side, lamp −15 %. Registration unchanged: pinch (0.501, 0.521).
- **S013:** band framed at y ≈ 0.42 under the lip at ≈ 0.33 (three whole blossoms across, end); the moon spot (a point source
  glinting on the moon disc) replaced by an equal cool hemisphere fill (diffuse only), env reflection on the two shards
  lowered, bench-bounce glint off; the raking lamp offset up-left in the start camera's frame → the glaze glint sits at
  frame upper left at the end and travels during the move. Lamp shadow, bench-bounce light and the DOF pass off (perf, below; at
  f/14 the DOF gave ≤ 1 px of blur).
- **S014 / S050:** camera yaw 8° / 4° → **18°** toward the SE corner (door + wall wash at left, the window's east jamb with
  harbour glints at the right edge); her body yawed −26° toward the ledger/lamp so the 18° camera sees a true profile (at the
  first try the "dark eye" was her ear: we were behind her profile); S014 key moved to her front-left at 1.2 m (frame upper
  left, 4:1, even across face / shard / glove). Torch peak now reads in the pane (sweep 2.5–2.9 s, peak f3857).
- **S015:** tube hidden, pool tightened (0.55 → 0.30 rad) so the sand falls off into the dark bench, exposure 0.84, sand
  relief ×1.9, cool fill; **MISSING weight −0.002 → −0.0015** (CPU replica of the weighted Voronoi: hole ≈ 2.4 cm along the wall,
  still ≥ 1.6 cm below the rim band; reads as a dark gap at 3 o'clock).
- **S049:** frame 0 = bar alone at y 0.66, x 0.28–0.72 (measured) with the open glove only entering lower right; closes
  0.09–0.45 s; tilt-up carries a slight crane back (0.71 → 0.95 m, a cheat) so the open case, lining, comb-on-cloth and shirt
  read; the sleeve sits inside the case (no wall poke-through), slides out from under the lifting shirt edge and is visibly
  coming out on 157.02; ends at (0.58, 0.45) at a modest height, not in the lens; lamp eased as the pale sheet rises; sleeve
  glint softened; cloth desaturated toward P16's muted family; bar albedo ×1.45 so the sweat-dark wrap reads.
- **S051:** lamp cone 0.30 → 0.15 rad (pool edge visible at the top), exposure 0.74 → 0.70, contrast 1.16, vignette.
- **S052:** POV high angle 16° off vertical at 0.66 m, ledger out of frame; the tweezer tips are solved onto the **west** edge
  and follow it up to ~70°, then withdraw to the right edge; the sheet rolls over its low edge (it used to rotate about its
  centre line, half of it through the table); left fingertips wait on the blotter beside the east edge (an arm to the far
  edge lay across the whole sheet); jasmine lands at (0.58, 0.46).
- **S053:** her POV (she is at the bottom); for this insert the ledger has been slid to her left, so the shot-list layout holds
  (ledger frame left, letter frame right, hand from lower right, tip to upper right); the cradle is a tilted slab under the
  book; the pencil is held near its top so the tip shows; the hand leaves frame by 1.45 s.
- **S054 — restaged.** The written frame (paper-plane lens, jasmine soft at the bottom *and* her eye through the glass in one
  100 mm 2.39:1 ECU) cannot exist: VFOV is 8.6°, so a flat flower and an eye 15–20 cm above it only share a frame from ≥ 1.4 m,
  and a paper-level lens then sees the sheet as a line. Now: CU from her front-right (WSW, 17° up, 2.0 → 1.95 m push), her
  bowed face upper centre-right facing frame right (as S014/S050); the magnifier in her LEFT hand (the right hand crossed the
  lens) tilted toward us between eye and flower; the glass shows **the magnified jasmine and the faint broken line** (a layer-2
  render from a virtual eye between glass and face; the real flower sits behind the glass); 0.3–0.6 it settles (170.82),
  rack flower-in-glass → her eye 1.93–2.71 (172.92); at 4.09 she tilts it 15° and the lamp focuses through it into a warm core
  with a soft prismatic fringe **on the sheet** ("落在信纸上") plus a small rim glint — the warm light event sits right of centre
  for the light-to-light cut onto S055's lancet (frame right).

### Checks after the fixes
- **Sync points:** all land — 57.20 joint closes; 58.64 band in focus / 60.26 settled on the rim; 62.28 foot ring turned to
  the loupe / 62.82 pencil down; 64.43 still; 155.34 open hand entering on the bar / 157.02 sleeve coming out; 158.52 tick /
  159.96 pencil stops / 160.5–160.9 torch across the pane (peak f3857) / 160.92 eyes start to lift; 162.75–164.30 slide
  settles on the broken stroke; 166.0 lift starts / 167.2 jasmine revealed; 168.72 pencil down / 169.38 fingers open;
  170.82 glass settles / 172.14–172.92 rack / 174.3 caustic + glint.
- **Cut pairs (single frames, `match/`):** S011→S012 gesture match holds (contact (0.50, 0.52), hand from upper right);
  S015→S016 rim centred (0.50, 0.51), Ø ≈ 77–78 % on both sides; S048→S049 bar centre y ≈ 0.65 / 0.66, x 0.27–0.73 / 0.28–0.72;
  S054→S055 warm light event right of centre → lancet at frame right (not the exact (0.72, 0.30) — see weaknesses).
- **Determinism / flicker:** S054 f4128–4133 consecutive: frame-to-frame RMSE 1.3–1.5 % (grain + rack), mean luminance
  monotonic; probe positions identical across runs and render orders (`review/order/`).

### Performance (idle-equivalent s/frame, `out/check/rl_bench3.mjs`, interleaved against the EMPTY engine frame, 3 rounds)
The box was shared (load 8–14 on 4 cores during this pass), so three measurements are given. **A/B** = interleaved
timing of the original module (git HEAD copy under a temporary scene key) against this one on the same frames, alternating
frame by frame (`review/ab.mjs`, 3–5 rounds, medians) — load cancels. **≈ idle** = the original module's idle-calibrated
figure (table above) × the A/B ratio. **raw** = median wall time per frame at load ≈ 9.5 (`review/perf2.log`). Geometry is
unchanged (S050: 235 → 251 draw calls, 225.1k → 225.4k tris).

| shot | raw @ load 9.5 | A/B new/orig | ≈ idle s/frame | note |
|---|---|---|---|---|
| S012 | 1.3–1.4 | 1.04 | ≈ 1.6 | cool fill added |
| S013 | 2.3–2.5 → trimmed | 1.10 → **0.51–0.92** | ≈ 1.2–2.1 | lamp shadow, bench-bounce light and the f/14 DOF pass removed (the full-screen glaze × soft-shadow taps dominated) |
| S014 | 2.0 | 1.10 | ≈ 1.45 | wall wash + lit background |
| S015 | 1.7–1.8 | 0.76 | ≈ 1.2–1.8 | tighter pool |
| S049 | 1.7–1.9 | 0.87 | ≈ 1.9 | |
| S050 | 1.5–1.8 | 1.09–1.31 | ≈ 1.9–2.25 | wall wash + door/corridor/window jamb now lit in frame |
| S051 | 1.2 | 0.91 | ≈ 1.1 | |
| S052 | 1.1 | 0.84 | ≈ 1.15 | |
| S053 | 0.8–1.1 | 0.92 | ≈ 1.2 | |
| S054 | 1.4–1.7 | 0.72 | ≈ 1.7 | the glass view renders layer 2 only (sheet, flower, lights) at 512² instead of a zoomed full-scene pass |

`render.mjs --range` (24 frames, incl. JPEG + ffmpeg): S013 2.07 s/frame at load 8–9 (before the final trim), S014
3.08 s/frame while the load rose 9 → 14. Nothing is over the 2.5 s worst case; S049, S050 and S054 stay above the 1.5 s
typical target (one close hi figure + shadowed key + DOF, or the second glass pass).

### Remaining weaknesses
- **S054** is a CU, not the written ECU, and the glass shows the *flower* (what she reads), not her magnified eye — a
  faceless head magnified only showed a nose. The halo is a caustic on the sheet right of centre, not a ring at (0.72, 0.30).
- **Faceless figure:** S014/S050/S054 performances (certainty at the mouth, the inward lift of the eyes, "she reads") are
  carried by head angle and timing only.
- **S014/S050 backgrounds** are deliberately dark (P02 air): door + pane at left, the window's east jamb and harbour glints at
  the right edge; the window itself is never more than a sliver from these profile angles (the bench faces it).
- **S049** keeps a heavy POV forearm during the comb lift (honest to the action) and uses a small crane-back cheat.
- **S051** fibre relief is subtle at the f/5.6 macro DOF; the read is light and the broken stroke, not paper texture.
- **S052/S053** hand entries follow the set geography (her POV); S053's ledger is slid to her left for this insert only.
- **S012** still omits her left forearm on the bench edge (it would sit at the far top of this framing, out of the CU).
- Lamp positions are per-shot cheats of the articulated arm (it is never in frame in BR1 / S012–S015).
- **Neighbours (not edited):** map_office's S048 end bar sits ≈ 0.65 (fine); no open issues found on the S011, S016 or
  S055 side of the cuts. Note for whoever reviews cut pairs: judge positions on single frames — `montage` tiles misled this
  review twice (apparent off-centre bowl in S016, apparent "jumping" glass in S054; both were fine on the frames).

## Integration fixes (whole-film QA, 2026-10-06)

Survey: `out/fix_restoration_lab_old_home_map_office/` (`shots/S012.jpg` …, `cuts/S011-S012.jpg` …); working renders in
`out/fix_rl_oh_mo_wip/rl0`–`rl7`. Director for this group: BR1's turn ("she starts reading the person") must land — S050 the
inward lift of her eyes, S052 the pressed jasmine reads as a flower, S054 a real rack toward her face/eye-line and the
rainbow halo placed for the S055 light cut; S012→S013 exposure/colour jump fixed; faces not masks (S014 low-key profile).

| finding | fix |
|---|---|
| **S054 blocker** — static high 3/4 wide, lit mask face, lollipop magnifier beside the face, jasmine invisible, no focus move, ring at (0.75, 0.69) | **Rebuilt.** 100 mm from her LEFT (east), near paper height, ≈ 1.9 m: an ECU of her bowed **lost profile** (face dark, keyed only from above/behind by the lowered lamp — it rakes the sheet and edges her hair, brow and nose line; no face fill, the sheet's warm up-bounce cut to 25 %), her eye-line down into the glass. The magnifier (≈ 28 % of frame height, lower centre) is lowered into place from above the frame on **170.82** and settles over the flower; the glass shows the **magnified pressed jasmine + the broken stroke** (what she reads; `magCam` from above the flower). **172.14 → 172.92** a real rack from the glass to her eye (f/2.2). **174.3** she tilts the glass 15° and a soft pastel ring (muted ruby / amber / cobalt, `haloRing`) lands at **(0.72, 0.30)** in the dark beyond her head and holds into the S055 cut (the lancet's brightest cluster upper right). Her right gloved fingertips hover above the sheet. |
| **S052** — jasmine read as an orange-brown burn; crisp pseudo-hanzi on the front; rigid board flip; blue-grey glove | Jasmine card 3.4 → 4.2 cm, petals 0.8–0.9 opaque with lighter edges and a soft drop shadow under them (raking lamp) — it reads as a pressed flower at (0.58, 0.46); the front's brushwork is a **soft, half-contrast** copy for this shot (`letterTexSoft`, illegible); the sheet **bends** as it turns (`uCurl` ×3, > 20°); a warm 2800 K bounce aimed at the right glove keeps it warm-white. |
| **S050** — she never lifts her eyes; plank arm to the ledger; letter out of frame | **160.92 → 161.6** the inward lift: the gaze rises ≈ 14° above her reading line and turns a little toward the window (frame right), held to the end, pencil frozen mid-air; the face stays in the low-key side light. The ledger lies beside her right hand (no 70 cm reach); the framing sits a little lower so the letter in the lamp pool reads at the bottom. |
| **S049** — the aged handle read NEWER than S048's (smooth dowel); flat slab contents | The aged bar now carries **the same helical rattan wrap** as S048's new handle (36 turns round the bar), sweat-darkened, polished where the fingers sat, frayed strip ends and a broken binding — "the same object, decades later". Comb: boxwood #C9A36A; shirt grey-blue with stronger creases, a folded collar and one horn button. |
| **S012→S013** grade jump (91 → 45 /255, warm → blue-grey) and a flare blob | S013 opens inside a warm raking pool (a second warm spot on the crack's first ≈ 0.6 s, fading as the move climbs into the lamp's own light; lamp 2.3 → 1.6, hemi 1.1 → 0.55): frame 0 is warm and within ≈ ⅓ stop of S012's end. Bloom threshold 1.25 / strength 0.22 and the shards' clearcoat roughness 0.08 → 0.32 for this shot (restored in `state()`), so the glaze highlight is a soft highlight, not a lens-flare blob or an 'eye' beside the crescent. |
| **S014** — fully lit pink profile mask; arm tube across 70 % of the frame | The 3500 K lamp is **behind the shard toward frame right**: the porcelain and the loupe glow, the face is a dark lost profile with a warm edge; no face fill; the ledger sits close by her right side (the writing arm stays low); focus on the shard. |
| **S011→S012** fingertip match loose (S012 glove ≈ 3× larger) | S012's frame 0 is on S011's scale (camera 1.32 m → eases in to the 0.84 m CU by 1.1 s, `ease.outCubic`), pinch at the frame centre on the same 30° diagonal from the upper right; shard C is held ≈ 3.5 cm off along the rim and lifted 12 mm so the join on **碎 57.2 s** reads, with a 2-frame settle. |
| **S015→S016** plum band invisible on both sides | Both sides now **24°** from vertical from the 6 o'clock side (old_home C16.a matches); old_home S016 frame 0's rim bloom cut. |
| **S050→S051** 3-stop flash on the cut | S051 opens with the lamp already 72 % lowered (contracted pool), finishing at 0.3 s. |

**Not fixed / deviations**
- S054: the QA keyframe (paper-level lens, jasmine in the bottom band AND the eye through the glass at 100 mm) is not a
  physically consistent frame at this bench (the VFOV is 8.6° and the bench stands against the window wall); the rebuild keeps
  every beat (glass in on 170.82, the flower read in the glass, the rack to her eye-line, the ring at (0.72, 0.30)) in a
  lost-profile ECU instead. The magnified eye "mole below the left eye" is not modelled (faceless figure).
- S012: the held piece is still rim shard C against the glued B+E half (the library shard layout); it now reads as a separate
  piece being seated, but the half-bowl remains the larger shape.
- S015/S016: the outer plum band is the library porcelain texture; at 24° it reads as a thin band on the near lip, not a bold one.
- S051: the faded vermilion column rule in the macro patch is unchanged (minor).
- S050: the ear (library head) still reads dark at 960 px.

Debug: `?off=pts` prints the registered points (now also `ring`, `lens`).

**Measured after the integration fixes** (1280×536, `out/check/map_office/mo_render.mjs`, 3 frames per shot at u ≈ 0.25/0.5/0.75, mean of the frames after each shot's first (shader compile), shared 4-core box, 1-min load ≈ 3–4):

| shot | s/frame |
|---|---|
| S012 | 0.95 |
| S013 | 0.93 |
| S014 | 0.93 |
| S015 | 0.81 |
| S049 | 1.05 |
| S050 | 0.83 |
| S051 | 0.53 |
| S052 | 0.71 |
| S053 | 0.55 |
| S054 | 0.75 |

All within the 2.5 s cap.
