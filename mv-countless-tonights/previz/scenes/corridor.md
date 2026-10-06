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
- End screen (x = 0): dark timber screen with a low dado (0.46 m), clear glass to 2.2 m, wavy cylinder glass above,
  a pair of glazed doors on the north side, posts at z ±1.0 / ±1.85 / ±2.7 (a 2.0 m centre bay, no mullion on the axis).

## The five windows of the eras
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

### S066 — 40 mm signature dolly (204.667–213.208, f 4912–5116)
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
