# corridor — LOC_CORRIDOR (the film's signature image)

Module `scenes/corridor.js` · shots **S027 · S061 · S066** · no named views exported.
`needs`: sea_deck, old_home, pier_waiting, chapel, night_window (their views are rendered nested).

## Set
World = night_window's frame (+X east, +Z south, y up; the end screen is x = 0, the bay is night_window's own set
beyond it). Corridor x ∈ [−44, 0], z ∈ [−2.7, 2.7], 5.2 m high.
- South wall: 11 arched windows (centres −2 … −42, 2.0 × 4.0 m, sill 0.6), extruded 0.5 m brick under worn lime
  render, slim steel glazing bars as an alpha-tested plane that **casts the moon pools' bar shadows**, glass with env
  reflections. North wall: five arched gallery doorways (x −34 … −10), the pantry door at x = −2 (warm crack of light),
  14 minor niches (both walls).
- Floor: waxed teak, planks along the corridor + a half-res planar reflection (three Reflector with a custom blurred,
  fresnel-weighted, plank-modulated additive shader).
- Minor niches ("countless nights"): shallow (0.16 m, bible 浅壁龛), a procedural glow card 7 cm behind each glass
  (fishing lamp / stove fire / lighthouse sweep / night-market window), all built from gaussians so they never resolve,
  reveals that catch the glow, + a soft warm glow billboard whose distance from the wall is set per shot (S027: 0.3 m, so
  the edge-on niches still read as warm bokeh).
- Moon: one shadowed DirectionalLight whose ortho frustum is fitted per shot to the region of interest (2048 map).
  S027 02:10 due south 60°; S061 04:00 SSW az 215 / 40° (see Review); S066 04:30 SW 42° (bible §3.3).
- End screen (x = 0; *integration: now a solid end wall with a 2.5 m glazed opening, see below*): dark timber screen with a low dado (0.46 m), clear glass to 2.2 m, wavy cylinder glass above,
  a pair of glazed doors on the north side, posts at z ±1.0 / ±1.85 / ±2.7 (a 2.0 m centre bay, no mullion on the axis).

## The five windows of the eras (*positions / cases superseded by "Integration fixes"*)
- **P1–P4 vitrines** (1.1 × 0.6 × 2.3 m glass on a 0.4 m plinth, velvet-lined, frameless), free-standing, staggered
  N/S: P1 (−7.3, z −1.0, N) old horn stern lantern · P2 (−5.1, +1.0, S) brass candlestick + stub (back corner of the deck) ·
  P3 (−2.9, −1.0, N) the waiting shed's enamel shade · P4 (−0.75, +1.2, S) PROP_GLASSPANEL on a dim lightbox. P1–P3 are
  turned 45° toward the approaching camera, P4 60° (S061's staging needs the room in front of its glass).
- Each era image = the other module's named view rendered into a 448 × 552 RT (P4 512 × 632; a half-res LOD RT when the
  pane is > 6.5 m away or still faint), only while the pane is in the frustum, drawn on a plate just inside the front glass
  with a **virtual-depth parallax**: per pixel the view ray is intersected with a plane 0.9–1.1 m behind the glass; the
  image is sized so that at its sync moment it fills the pane's middle, its subject placed on the ray from the camera
  position at the sync. Per-era grade (CT_NAV / CT_HOME / CT_MIG / CT_CHAPEL approximations), black crush (dark glass only
  shows the other night's light), a soft 9-tap disc blur (old glass, the other night at its own depth: gesture and light
  read, faces stay unresolved), a soft inner vignette, faded toward the deck. Strength envelope per pane: surfaces as the
  camera approaches, peaks on its lyric, eases as it leaves (+ a soft glow of its colour on the floor in front of it).
- **P2 zoom**: old_home's `view_home_rain` frames her full figure with the bowl tiny at lower right. corridor renders only
  the sub-rectangle [0.24, 0.26]–[0.96, 0.98] of that view at full RT resolution (the view camera's `setViewOffset`, set
  only around our call; the camera is captured once like night_window's): the warm doorway, her palm out under the eave,
  the beaded drip line and the bowl catching the drop; her face falls outside the crop (留白).
- **P5** = the end screen: not a reflection. night_window's scene is rendered **from this camera** (see "night_window
  camera override") into an RT covering only the screen's bounding box, with depth; a portal plane behind the
  screen glass shows it and writes the bay's true depth (gl_FragDepth) so the engine DOF focuses into the bay.

### night_window camera override (P5)
night_window only exposes `view_bay_back` with its own camera. On build the module renders that view once with the
renderer's `render` wrapped to capture night_window's scene + camera, then replaces that camera instance's
`updateMatrixWorld` with a guard that — **only while our renderNested call runs** — snaps it to our pose, fov and
a `setViewOffset` sub-frustum (their exterior pass and the final render both go through it). Their glazed screen +
corridor stub (x ≈ 0) are hidden in our render (we have our own); S027 also hides the two figures (the bench is
empty at 02:10; his flask stays on the bench). In S066 the reading lamp (stand group, glow, key and up-light, found by
position at build) is shifted (0, −0.10, +0.45) during our render only — the light-match cheat (see S066). No file of
night_window is touched; outside our call the camera and the lamp behave exactly as before. The portal RTs are an LRU of
six sizes (the bbox changes every frame of a dolly).

## Shots
### S027 — WS 135 mm from the west end (96.917–101.792, f 2326–2442)
- Camera (−44 + push, 1.45, 0) looking due east, level, on the centre line; motion control 0.3 m over 4.2 s from tl 0.70
  (12-frame ease-in, then constant). No pan, tilt or roll.
- 02:10 moon due south at 60°: a receding row of barred arched pools on the right half of the teak floor, their floor
  reflection, the four vitrines as dark glass with silver edges on both sides of the end screen, minor-niche glows on both
  walls as soft warm bokeh (T8, focus 40 m: they never resolve), three gallery doorways on the left with dim warm reveals;
  the last one (x = −10) is the warm field: its far reveal glows 3000 K, a warm spill lies on the corridor floor in front
  of it, the gallery light sits behind her (rim, no front fill).
- Her silhouette (hi RESTORER, gloved, walk cycle) crosses that doorway's glow tl 2.25 → 4.0 (x −11.0 → −9.3 just inside
  the threshold, walking east into depth), dark against the warm reveal on the 2.58 s sync. The doorway is empty again at
  the end frame.
- P5: night_window's bay from this camera through the screen's clear glass: empty bench (both figures hidden, the
  flask stays), harbour light points. Panes show no eras (plates hidden).
- Post: exposure 1.45, temp −0.12, lift (0.03, 0.034, 0.048) (deep blue blacks, never 0), DOF focus 40 m f/8, hemi 0.10.

### S061 — CU 100 mm at P4's stained glass (190.958–195.0, f 4583–4679)
- Staging solved from the mirror geometry: camera 2.0 m west of the clear diamond quarry (panel centre 1.70 m, diamond at
  1.45 m), turned so the diamond sits at (0.70, 0.45) and the bay 8.8° to its left; lens at the diamond's height, so her eyes
  reflect in it at 1.45 m (a 9 cm bow); she stands 0.6 m from the panel on the reflected ray, out of frame left, studying
  the panel just right of the diamond (her face three-quarter in the reflection).
- The quarry: mirror render of our own scene (her face, coat, the corridor behind her) into the diamond's screen box only
  (reflected camera, `setViewOffset`, clipping plane at the panel), the old hand-blown quarry slightly convex (the mirror
  sub-frustum ×1.55, so her eyes, brows and nose fit the 6 × 9 cm quarry), a soft 5-tap reflection at 26 % over a dark
  quarry (若隐若现). The diamond writes the mirror depth (2.6 m) so the DOF holds focus on her reflection; in this shot it is
  drawn after the opaque set with `depthFunc = Always` (2.6 m lies behind the vitrine's velvet back).
- 04:00 moon from behind right of the lens through the x = −2 window (az 215, 40° — at 45° the 0.5 m window reveal shaded
  her face): a cool side key on her reflected face and on her hands; the panel's dim lightbox a faint warm fill; the
  moon pool at her feet bounces up (point light at the floor).
- 191.88 (tl 0.92): her eyes lift to the bay (the face turns away in the quarry); 192.2: rack past the vitrine's edge to the
  guard's unlit bent back (≈ 5.8 m; night_window rendered through the override, phone face down: no phone light after
  190.6). From tl 1.78 the camera settles 3.4° down onto her hands (0.75 s) with the second rack (hands at ≈ 1.8 m).
- Hands: close-up hands (`lod: 'close'`, bare R/L + glove *shells*) on world anchors in her frame, hands at (0.35, 0.69)
  of the settled frame, 15 cm in front of the glass; coat-sleeve stubs carry the forearms out of the frame's lower left
  (the figure's own arms no longer reach the close-up wrists — see Review). Timeline: 1.70 the gloved hands rise · 1.98 /
  2.13 / 2.28 the left fingers tug the right glove's index, middle, ring tips (from behind) · 2.42–2.86 the left hand draws
  the right glove off (forward = screen right) while the right hand draws back · 2.88–3.04 the hands trade places, the
  dangling right glove handed to the right palm · 3.04–3.32 the right thumb and index hold the left glove's tip while the
  left hand pulls out of it · 3.34 the pair folded across the right palm, the left hand presses it · 3.64–4.01 the right fist
  closes round the soft bundle (empty fingers hang from it), the left hand drops away, her shoulder starts to turn.
- Scar: a small pale capsule on the dorso-radial side of the right index finger's middle phalanx, visible once the glove
  is off. Post: exposure 1.2, temp −0.1, f/2.8, focus mirror (2.6 m) → bay (≈ 5.8 m) → hands.

### S066 — signature dolly (204.667–213.208, f 4912–5116) — *superseded: see "Integration fixes" (32 mm, 1.15 m, x −17 → −1.9)*
- Camera at 1.45 m on the centre line, 1.43 m/s from x −12.5, constant to tl 7.25 (211.92), quadratic ease-out to rest
  at x −1.51 by 8.12 (212.79), then a 10-frame hold; 1.5° down (see Deviations). MSAA.
- 04:30 moon SW at 42° from behind right: one barred pool per window bay crossing the frame about once per bar.
- Panes: P1 sea_deck `view_shiplamp` (lamp + glittering night sea), brightest at 205.52 (tl 0.85); P2 old_home
  `view_home_rain` (zoomed: doorway, palm, drip line, bowl), surfaces 206.77, raindrop 207.07; P3 pier_waiting `view_pier`,
  208.57; P4 chapel `view_chapel`, her mother's shoulders 210.38. On their lines P1–P3 sit at ≈ 0.22 / 0.78 of the frame
  (P4 ≈ 0.86).
- Focus pulls to each pane's mirror depth (camera → glass + reflected depth) in turn, then from 6.1–6.9 s to the two
  backs in the bay (P5: night_window through the override, RESTORER screen-left, GUARD screen-right, cups steaming).
  The bay is seen at 55 % gain (through the screen glass and its reflections) while we travel and resolves to 100 %
  from 5.0 to 7.9 s as the dolly comes to rest (rendered at 0.62 → 1.0 resolution).
- End frame (f 5116): backs at ≈ (0.44, 0.55) / (0.56, 0.55); the cheated reading lamp at ≈ (0.37, 0.38) = S067's stern
  lantern (0.376, 0.381) — the light match.
- Post: exposure 1.3, temp −0.1, f/2.8.

## Deviations and why
- **Vitrine layout** — not the bible's x −10/−8/−6/−4 against the walls. With the locked path (x −12.5 → −1.5, 40 mm,
  1.45 m, level) a wall-side pane is only in frame more than ~4.5 m ahead, so P3/P4 could never be seen on their lyric
  lines. The four cases stand free, staggered ±1.0–1.2 m off the axis, at x −7.3 / −5.1 / −2.9 / −0.75, so each is at its
  largest on its own line. Left/right order (P1 N, P2 S, P3 N, P4 S) is kept. Toe 45° (P4 60°) instead of 20°.
- **The eras are "in the glass", not a mirror of the corridor**: virtual-depth parallax plates (each pane's view seen 0.9–
  1.1 m behind its glass), which is what the brief describes; nothing of an era leaves its pane.
- **S061 camera west of her** (mirror physics): her reflection at screen-right (0.70) with the bay 8.8° left of the
  diamond puts the camera west of the diamond and her north-west of it, out of frame left (the keyframe's "behind her left
  shoulder" cannot also show the bay). 100 mm on 2.39:1 is ±4.3° vertically: the diamond, the seated guard and her hands
  cannot share a locked frame, so the camera settles 3.4° down onto the hands. The convex quarry (×1.55) is a cheat on a
  true mirror: the reflection stays a correct mirror image, just minified, as old crown glass does.
- **S061 moon az 215 / el 40** (bible 04:00 SW ~45°): at 225 / 45 the window reveal shades her face and hands.
- **S066 tilt 1.5° down** (the shot list says no tilt): level, the two backs would sit at y ≈ 0.62 instead of 0.55 and
  the floor pools would only appear in the lower edge.
- **S066 → S067 light match by cheating the lamp**: night_window's lamp head (3.24, 1.66, −0.98) lands at (0.26, 0.24) from
  the S066 rest camera; the stern lantern of S067 is at (0.376, 0.381). Inside corridor's render only, the lamp (stand,
  shade, bulb, glow, key + up-light) moves 0.45 m south and 0.10 m down; it is never seen from S062–S065's angles.
- **S027 doorway** at screen x ≈ 0.20 rather than 0.30: with the 135 mm from x −44, the last doorway (x −10) on the north
  wall sits at 0.20; a north-wall doorway at 0.30 would have to be ≈ 50 m from the lens, beyond the end screen. Her
  silhouette is a hi figure, small but larger than "tiny" because the lit doorway is the nearest one that reads.
- **End screen**: corridor's own screen (low dado 0.46 m so the bay reads, clear glass to 2.2 m, wavy above, a 2.0 m
  centre bay); night_window's screen + corridor stub are hidden inside our nested render, so the screen design differs
  slightly from night_window's own shots (S059–S065 see it from the other side).

## Performance (1280 × 536, `render.mjs --every 1 --range`, 24 frames after the first; other agents' renders ran on the
same 4 cores (load 2–6), so these are pessimistic. Before the review: S027 0.85, S061 1.50, S066 3.58 / 2.57 / 1.46)
| shot | range | s/frame | max |
|---|---|---|---|
| S027 | 2400–2424 | 1.03 | 1.34 |
| S061 | 4640–4664 (hands) | 1.71 | 2.13 |
| S066 | 4914–4938 (P1 + P3 + P4 + bay) | 2.50 | 3.11 |
| S066 | 4995–5019 (P2/P3/P4 + bay) | 3.03 | 3.99 |
| S066 | 5070–5094 (P4 → bay at rest) | 1.82 | 2.62 |
Scene build (all nested modules) ≈ 75–90 s; the first frame of each shot in a run pays shader warm-up (≤ 15 s).
Heavy things are built once (Reflector, all RTs, glove shells, panel canvas); nested views render only when visible,
far / faint panes into half-res RTs.

## Known weaknesses
- S066 opening is the heaviest stretch (several nested modules at once); it stays inside the 4 s/frame allowance on average.
- The bay through the screen is night_window's set re-rendered from our camera via a camera-override hack, and P2's zoom
  and S066's lamp cheat use the same capture (fragile if night_window / old_home rename meshes or swap their camera
  objects; logged in lib/ISSUES.md).
- Era plates are flat images with parallax, not true volumes; at the extreme of a pass the plane can be read as a plane.
- S061: the glove shells stretch, swell and slide rather than turn inside out; the folded pair and the fist bundle are
  procedural cloth shapes; the puffed left glove shows its knit joint creases as dark bands for ~6 frames (≈ 194.0–194.3).
  The scar is ~15 px at 1280 and reads only on a still.
- S027 stays a dark frame (02:10, no fill); the far end bay is its brightest element by design.
- S066 end frame has no moon pool at lower right (the floor in front of the lens is out of the 40 mm frame at 1.5 m from the
  screen) and P4 is already out of frame at rest (list mentions both).

## Review (art director + DP pass, 2026-10-06)
Re-rendered every shot (u 0.05 / 0.5 / 0.95 + every sync frame: `out/check/corridor/final2`), the neighbours' adjoining
frames (`out/check/corridor/rv1/nb`, `cuts_review.jpg`), 25 consecutive frames per performance range (`out/check/corridor/
perf*/r*`), debug overviews (`rv2/dbg`) and the nested views as received (`rv8/views`).

### What was wrong
- **S061 was broken.** (a) The quarry showed a bright frontal nose-and-mouth: the reflected face was 1.6× the 9 cm quarry
  and lit by a frontal spot aimed at her eye — a mannequin mask, not "half-seen". (b) The hands phase was illegible: at
  1.2 m from a 100 mm lens the hands filled the frame, her right coat sleeve crossed the lens (f4654: a black tube with an
  empty cuff over 60 % of the frame), the folded gloves read as a plastic slab, the fist bundle's empty fingers stuck up
  like ears. (c) After the first restage the quarry went black: it writes the mirror depth (2.6 m), which lay behind the
  vitrine's velvet back, so it failed the depth test.
- **S066**: the light match into S067 was off by 0.11 (lamp (0.26, 0.24) vs lantern (0.376, 0.381)). On their lyric lines
  the panes sat at the frame edges (0.14 / 0.86) and P2 was cut by it. P1's sea read as a purple wall (glitter outside the
  crop, crushed blacks). P2's raindrop beat was unreadable (the bowl ~5 % of a full-figure view, the museum candlestick
  standing exactly on the bowl's image), and P2/P3 showed lit, resolved mannequin faces. The bay ran at full brightness
  from frame 0 and competed with every pane.
- **S027**: the x = −8.7 niche overlapped the x = −10 doorway — her head vanished behind its glass; she was lit grey, not a
  silhouette; the north-wall niches read as grey rectangles (their glow sat 0.25 m deep, invisible edge-on), then as LED
  strips once their reveals glowed; the upper right crushed to 0 (the base contrast ate the small lift).
- Memory: the portal RT cache allocated one RT per distinct bbox size (≈ every frame of the dolly).

### Fixes (all in scenes/corridor.js)
- S061 restaged (see the shot section): P4 toe 60°, camera 2.0 m from the diamond, she 0.6 m from the panel, convex quarry
  ×1.55, soft 26 % reflection, three-quarter gaze, moon az 215 / 40° + floor-pool bounce, diamond drawn last with
  `depthFunc Always`; glove choreography rebuilt on world anchors (hands at (0.35, 0.69), forearms leaving the lower left
  on coat-sleeve stubs), shells puffed while they slide and depth-biased over the bare hands, a soft two-layer folded
  pair with ribbed cuffs and folded-back finger ridges, a crumplier fist bundle whose empty fingers hang under gravity,
  the scar moved to the dorso-radial side of the middle phalanx; the end screen's centre bay widened to 2.0 m (its z 0.8
  post hid the guard).
- S066: the lamp cheat (light match now ≈ (0.37, 0.38) vs (0.376, 0.381)); P1–P3 brought to z ±1.0 (≈ 0.22 / 0.78 on
  their lines); P1 framed on lamp + glittering sea with less black crush; P2 zoomed onto doorway / palm / drip line /
  bowl, its candlestick moved to the deck's back corner; a 9-tap blur on every pane (faces unresolved); the bay at 55 %
  while travelling, resolving 5.0–7.9 s; pane LOD (half-res RT when far or faint) and a reduced-res bay while it is dim
  and small (perf).
- S027: niche → x −6.8, shallow niches with the glow behind the glass, faint reveals + glow billboards 0.3 m off the wall
  (soft warm bokeh on both walls), the doorway's far reveal at 1.5 emissive with a warm floor spill and the gallery light
  behind her (hemi 0.10): she reads dark against the warm field; exposure 1.45 and a lift that survives the contrast.
- Portal RT cache capped (LRU, 6 sizes).

### Cuts checked (adjoining frames rendered side by side)
- S026 → S027 (cut on the band's re-entry): warm candle insert → cold corridor; deliberate contrast, both exposed (means
  57 / 20).
- S027 → S028: corridor → the gallery at G3c (cut; same night, same floor); S028 is darker (mean 10) — its own module.
- S060 → S061: his hand on the phone (lamp-lit) → the quarry with the unlit bent back (the eye-line cut; no phone light).
- S061 → S062: her fist with the gloves → she enters the bay with two cups.
- S065 → S066: the two faces → the same pair from behind at the corridor's end (reverse; the bay visible from frame 0).
- S066 → S067 (light, 0 frames = a cut on the light point): reading lamp (0.37, 0.38) → stern lantern (0.376, 0.381).

### Verification
- Determinism: no Math.random / Date; every per-frame state (shell scales, lamp shift, view offsets, diamond render
  order, spills, portal gain, bay lamp) is reset in `hideFigure()` or restored in `finally`. Neighbour modules render
  identically with and without corridor in the same page (S062 f4700, S065 f4890, old_home S041 f3280: RMSE 0).
- Consecutive frames (perf ranges r2400 / r4640 / r4914 / r4995 / r5070): no flicker; one quick glove drop (2–3 frames,
  ≈ 193.8 s) and the hands' trade (≈ 193.9 s) are the fastest motions.
- Performance after the fixes: S027 1.03, S061 1.71, S066 2.50 / 3.03 / 1.82 s/frame (table above).

### Remaining weaknesses
See "Known weaknesses" above.

## Integration fixes (2026-10-06, whole-film QA pass — supersedes the numbers above where they differ)
Findings taken from `qa/findings_by_module.json` (module `corridor`): S066 blocker (spectacle reads as a dark cramped room),
S061 major (quarry face / hands over his back / glove clock), S027 minor (bench + harbour points, doorway). Continued from a
colleague's interrupted partial pass (a7b2a26: niches on both walls, spill shader, 35 mm / 1.15 m camera, wider panes);
everything was re-verified and most of it rebuilt. Survey: `out/fix_corridor/{shots,cuts}` (+ S026/S028/S060/S062/S065/S067),
dev renders `out/fix_corridor/w/`.

### Set (all three shots)
- **Roof shadow leak fixed.** The ceiling plane did not cast shadows: the moon came in over the south wall's top and lit the
  north wall's upper half and the end bulkhead as one flat grey veil (the real reason the old frames were murky). The ceiling now
  casts + a shadow-only roof slab; walls are lit by the moon pools / panes / niches / a deep-blue fill only.
- **End wall instead of a full-width screen** (director: the end bay small, warm and luminous at the vanishing point): solid
  panelled flanks (lime render, timber dado, framed panel, timber architrave) leave a 2.5 m glazed opening on the axis
  (`OPEN_HW` 1.25); the screen inside it keeps posts at ±0.62, the 0.46 dado, clear glass to 2.16 and wavy glass above. The
  bay portal covers only the opening. No night_window shot looks west at the screen, so nothing else changes.
- **Moon shafts**: every arched window has a volumetric shaft (`FX.windowShaft`, half-res layer, window cookie = the glazing
  bars, re-aimed per shot by `setShafts`): S066 0.036, S027 0.014, off in S061.
- **P1–P3 are see-through cases** (smoked glass back, opacity 0.62, instead of the velvet back; depth 0.36 m; glass 2.1 m on a
  0.36 m plinth): the corridor's perspective stays readable through them and each era floats in the glass as light. Museum
  objects re-fitted (lantern 0.8×, candlestick, enamel shade 0.7×). P4 (the S061 case) keeps its velvet + lightbox, moved to
  z = +1.45 (was 1.2) so it no longer sits on the vanishing point beside the opening; S061 re-solves from it.
- **Minor niches**: a soft warm point + halo (S066) or the long-lens bokeh disc (S027) — `nicheUpdate(..., disc)`; the points
  stand 0.14–0.22 m off the wall (they were half-clipped by it), their recess washes ×2.6 in S066; dozens recede on both walls.
- More warm harbour points (44, 18 of them due east, 1900–2400 K): S027's 135 mm sees 6–10 in the bay window near y 0.5.

### S066 — rebuilt as the spectacle
- **Long and grand**: 32 mm at 1.15 m on the centre line, tilt −1° → +0.4° at rest. **Deviation: the move starts at x −17**
  (shot list −12.5) at a constant **1.97 m/s** (ruling ≈1.4), the shot list's ease-out from 211.92 to rest at 212.79, rest x −1.9
  (posts frame the pair). From −12.5 a 32 mm lens at 1.15 m sees only ~7 m of corridor (the floor from 4.9 m, the end wall 38 %
  × 70 % of the frame — a room with a door); from −17 four arched bays, their pools and both walls of niches recede to an end
  bay ≈13 % of the frame wide. Tests from −20 / −28 read even longer but need > 2.4 m/s. One continuous, perfectly smooth move.
- **Moon pools on the beat**: moon 235° / 36° (bible SW ~42°, 6° lower so the pool crosses the axis from the window's arch); the
  pools pass under the lens at 206.34 / 208.37 / 210.41 (beats 206.356 / 208.376 / 210.419), the fourth settles just ahead of
  the lens at rest. Moon 9.0, hemi 4 (deep-blue fill), floor reflection 2.6.
- **Panes re-placed along the longer path** (bible order kept, now close to the bible's x): P1 (−10.9, N), P2 (−7.9, S), P3 (−4.9,
  N) at ±1.65 toed 38°, P4 (−0.75, +1.45, 60°); each ≈4.4 m ahead on its line, at ≈0.18 / 0.82 / 0.16 / 0.76 of the frame,
  sweeping through about a third of it as we pass. Strength envelope ×1.8 (surfaces, swells on its line, settles).
- **Era framings through our own lens** (`renderEra` / `eraCamFrom`): the other module's named view runs its setShot unchanged;
  only its final draw into our RT uses `eraCam`, posed relative to its own camera (or, for old_home's fixed set, absolute).
  P1 sea_deck `view_shiplamp` view offset [0.38, 0.44, 1.35] (lamp in the upper third, the moon road on the swell, less deck) +
  a soft highlight ceiling (no glitter "confetti"); P2 old_home `view_home_rain` from low south of the step: her profile
  silhouette under the eave against the warm doorway, the bowl on the step, + **3–5 cm backlit rain streaks** composited in
  the pane (three depth layers, lit by the image's own light and the door lamp); P3 pier_waiting `view_pier` orbited 25° and
  backed off to 5.5 m: she sits on her case under the shed's bulbs, the crowd beyond (no longer a "vendor at a counter"); P4
  chapel `view_chapel` widened (3.4 m, 30°): the mother's back on the pew under the window, pink → dove grey, petals ×1.0.
- **Light spill ×2** onto boards, walls and ceiling (P1 sea-blue shimmer + the swinging lamp, P2 candle amber + rain sparkle,
  P3 bulb pools, P4 petals): the floor changes colour pane by pane; the bay lamp spills warm onto the end (5.0, range 16 m).
- Exposure 1.35, bloom 0.5/0.7, FXAA (was MSAA: no figure in the corridor needs it; with the shafts' frustum culling it took the heaviest range from 4.41 to
  3.17 s/frame under the same load). Means (960 px): 19 % at frame 0, 18–25 % through the panes, 13 % at P4, 10 % at rest
  (S065 out 11.7 %, S067 in 11.3 %); < 10 % pixels 21–43 % while travelling.
- End at rest: the pair from behind through the opening's glass between the ±0.62 posts, the lamp and the harbour lights, and
  **a faint reflection of the corridor behind the lens on that glass** (a quarter-res planar mirror, 0 → 10 % over 210.5–211.9:
  the moonlit windows and warm niche points as a veil — they are seen THROUGH real glass); the
  S067 light match is recomputed for the new lens/rest: reading lamp measured at (0.38, 0.39) on f5116 vs the stern lantern
  (0.38, 0.37) on f5117.

### S061
- **Quarry reflection = a moonlit silhouette**: the clear quarry is ×1.3 larger (7.8 × 11.7 cm) with the mirror minified ×2.0, so
  her whole head fits; a second tiny render of her figure alone gives a mask: the quarry shows a cool sheen of the moonlit
  corridor behind her, her head a darker shape on it (face plane ≈ 2 stops under), only the moon's rim (rim spot 9.0 from
  behind-right) and the eye glint bright — it reads as a head in the glass, never as a lit mask. The lift of her eyes on 还
  is a larger head motion (she studies the panel 0.34 m low, then looks up to the bay at 1.58 m).
- **Hands under his silhouette**: the settle is 4.2° (was 3.4°) and the hands work 6 cm lower (H.y 1.215): his head rides at
  y ≈ 0.2 and his shoulders/back at ≈ 0.3–0.75; the gloves come off at y ≈ 0.75–0.97 in x 0.15–0.5 (the left glove's pull-off
  reaches 0.62 for ~6 frames at 194.2, over his lower back), the end fist at ≈ (0.32, 0.88). (At 8.5 cm lower the right glove's
  tug left the frame bottom.) (The QA's "lens 8 cm
  lower" was tried in the maths and rejected: the frame is anchored on the quarry 2 m away, so a lower lens re-pitches up and
  the far back drops.)
- Glove clock (colleague's WARP61, verified on frames): right glove 192.7–193.6 (three fingertip tugs, cuff slid off), left
  193.9–194.4, folded 194.6, grip + turn 194.97.

### S027
- Readable night: moon 7.0, hemi 6, exposure 1.85, faint haze 0.014 → mean ≈ 14 % (was 9.3 %); S026 out 9 %, S028 in 5.5 %
  (the gallery's own) — both cuts inside 1.5 stops. The bay's reading lamp is truly off (its shade/bulb emissive scaled with the lights inside our render);
  the bay window at the vanishing point carries 6–10 warm harbour points at y ≈ 0.5 over the empty bench / sill line.
- Her silhouette still crosses the x = −10 doorway's warm reveal on 99.5. **Not done: "small (10–12 % of frame height) at
  (0.30, 0.52)"** — at 135 mm from x −44 the frame is 3.8 m tall at the doorway (34 m), so a 1.65 m figure is ≥ 35 % anywhere
  in the corridor, and a north-wall opening at x 0.30 would lie beyond the end wall; seeing her deeper in the gallery is
  geometrically impossible through a side doorway at 4.5° (see Deviations).

### Grain, determinism, debug
- Grain only through post (modern 0.035 in all three shots; nested views get none); no module grain quads, no `grain: 0`.
- Pure per-frame state: shafts, pane visibility, lamp emissive, bay lamp range, niche wash are reset in `hideFigure()` or
  restored in `finally`. Debug-only setups: `shot.dbg.s66 / s27 = { tl, x, mm, eye, tilt, hemi, moon, shaft, pg, sg, expo, off: [...] }`
  and `DBG_ERA` (four framings of one era view side by side); `?cor=` switches unchanged.

### Performance (1280 × 536, `render.mjs --every 1 --range`, 24 frames after the first, corridor-only shot file)
Measured while three other fixers rendered on the same 4 cores (load average 7–8 throughout), so these are ~1.5–2× pessimistic.
| shot | range | s/frame | max |
|---|---|---|---|
| S066 | 4995–5019 (P2/P3/P4 + bay, the heaviest) | 3.17 | 5.95 |
| S066 | 4914–4938 (P1/P2 + far panes; MSAA build) | 3.73 | 6.12 |
| S066 | 5085–5109 (rest + glass reflection) | 2.28 | 3.48 |
| S061 | 4640–4664 (hands + quarry + bay) | 2.66 | 3.87 |
| S027 | 2400–2424 | 2.00 | 3.34 |
S061 is 2.66 under load 7.4 (the colleague measured 1.71 for the same staging at load 2–6; the new mask pass is a ≈50 × 75 px
render of one figure). Determinism: S061 f4631 renders bit-identical across runs (RMSE 0); S066 f5014 differs by RMSE 0.2 %
only because pier_waiting.js / old_home.js were saved by their fixers between the two runs (P3 / P2 are their views).


### Remaining weaknesses (integration)
- S066 P2: the bowl sits low in the pane (≈10 % of its height, not the QA's 25 % at the centre) — the profile framing was chosen
  so her silhouette, the warm doorway and the rain read together; the drop into the bowl at 207.07 is small at 960 px. Her
  coat reads pale through the moon shaft that crosses P2.
- S066 P4: the mother's blouse still reads lavender-pink with the petal colour on it (chapel's costume; our hue pull helps).
- S066 at rest: the screen's dado is below the 32 mm frame from x −1.9 (visible until ≈211.6); posts + glass reflection carry
  "through real glass". The start at x −17 / 1.97 m/s is a conscious deviation from the shot list's −12.5 / ≈1.4 m/s.
- S027: her silhouette is ≈35 % of frame height and the doorway sits at x ≈ 0.20 (geometry of a 135 mm from the west end).
- The era framings depend on the other modules' named views (relative orbit for pier/chapel, absolute pose for old_home's fixed
  set, view offset for sea_deck); a large restaging of those views would need the `PANES[].ov / rect` values retuned
  (`DBG_ERA` shows four candidates side by side).
