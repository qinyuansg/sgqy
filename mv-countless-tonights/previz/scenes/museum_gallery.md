# museum_gallery — LOC_GALLERY (the night gallery of the old customs house, CT_MODERN) + its future variant (CT_FUTURE)

Module: `previz/scenes/museum_gallery.js` · shots **S001 S002 S003 S004 · S023 S024 S025 S026 · S028 S029 S030 · S040 · S070 S071
S078** · named views: none. Nested views used (`export const needs`): `sea_deck/view_shiplamp` (S002/S003, G1), `ship_cabin/view_cabin`
(S024 G3a), `old_home/view_home_candle` (S024 G3b, S025), `old_home/view_home_hand` (S026), `pier_waiting/view_pier` (S024 G3c).

Checks live in `out/check/museum_gallery/`: `sheet.jpg` (every shot at u = 0.5, after the review pass — see Review at the end; final
stills `final/`, `final_a.jpg` / `final_b.jpg`, sync and cut frames `sync2/`, timings `perf_rv.txt` / `ab_rv.txt`), before the review: `r12/` + `r12a/b.jpg` (final, u 0.05 / 0.5 / 0.95),
`sync1/` (every sync-point frame + the cut / dissolve frames), `pairs1.jpg` / `pairs2.jpg` (cut pairs against the neighbours in
`neigh/`), `perf_r12.txt` (render.mjs --range timings), older rounds `r1…r10`, `dbg*/` (debug cameras / textures).
Tools there: `q.mjs` (single frames with a URL query: `node q.mjs 412,497 outDir "nonest=1&off=pts"`), `cpuprof.mjs` (CPU-ms of the
Chromium process tree, variants via `window.__MGOFF`), `perf.sh` (the per-shot range timings).

## Set (built once in `create()`)

* **Gallery** 30 × 14 m, 6 m high (x −15…15, z −7…7): waxed teak floor (#5E4430, 25 cm boards), deep-blue night plaster
  (lime-wash #A9A296 in the future), exposed brick panels (lime-washed over in the future), timber ceiling beams, two rows of six
  lathe-turned cast-iron columns (#3B4540, merged) at 4.5 m, the south wall extruded with five arched doorways (it casts the
  moon's doorway shafts) onto the glazed verandah corridor (floor, ceiling, arched steel-barred glazing, a night-sky gradient —
  and a not-yet-dawn sky #5B6F8A with a faint peach band for the future). Statics merged per material.
* **G1** (free-standing, centre-south, the opening camera's vitrine): 95 cm dark plinth + frameless 60 × 60 × 50 cm hood (lib
  `vitrine`; front pane = full lib glass + this module's overlays, the other four panes a cheap additive env glass), faint
  pale-green polished glass edges, navy velvet deck, the 3000 K lib pin spot.
  * **Compass** (museum state): lathe brass body (#C2A47C, patina), `compass` face rotated so 午 sits lower-left in S003, blued
    needle with the red south tip, mica with the crack at 乾, 15° acrylic cradle (near-invisible).
  * **Future variant**: linen board (#D8D1C2) tilted 12°, the folded aged coat (#5B5853): one sculpted heightfield cushion
    (rounded edges, collar roll, lapels, the left sleeve folded diagonally, creases), three dull horn buttons, an open flattened
    cuff tube (dark lining, hem roll) with the 20 × 9.5 mm rubbed/pilled worn patch on its upper face ~1 cm from the edge; blank
    label card. The compass is gone.
* **G2** chart flat case 1.5 m east of G1: `needleChart('museum')` from `ship_cabin.js` on a 10° board (frame registry
  `fr2loc` shared with S005 for the T03 match), two acrylic strips, polarised glass (reflect 0.03).
* **G3a/b/c** tall framed wall cases on the north wall (bronze frames, light strip, a dim back-panel glow, deck pool), front panes
  as lib glass + overlays; G3c's pane is a door hinged on its east edge (opened to ~158° in S028–S030, back toward the wall).
  * G3a: needle-route book, sounding lead on its line, a folded chart.
  * G3b: the EMPTY acrylic mount at 1.42 m (ring, stem, shelf, arms) awaiting the bowl, blue-and-white sherds low.
  * G3c: the museum-state rattan case (pier_waiting geometry, 蓝印花布 lining, lid propped), the folded shirt block 30 × 22
    (#8392A0, collar, placket, pale fold lines, cut hem corner up), the boxwood comb on its untied red-brown cloth, the travel
    pass on an acrylic easel (guilloche border, four EMPTY photo corners, grey-violet #7A6E8C stamp: rings, steamer, waves,
    star — no letters; illegible scribbles only), the hooded inspection lamp on a gooseneck (bulb hidden in the hood).
* **Figures**: RESTORER hi (gloves toned to #F1EFE8-ish warm white), GUARD mid (torch moved into the right-hand grip), the
  RESTORER's close-up right glove + a coat-sleeve cylinder (inserts), and in a separate **era scene** (own lights): the
  NAVIGATOR's close left hand (salt), salt glints, FUTURE hi + FUTURE close left hand (the mirror of a raised right hand).
  At most one `hi` figure is ever in a frame.
* **Light**: the moon as one DirectionalLight (P04 #C8D2DB) with per-shot azimuth/elevation and shadow bounds fitted to the
  shot (1024² for the INTRO, 2048² otherwise), hemisphere fill, lib pin spot, G3 case spot, guard torch (SpotLight + half-res
  beam cone), inspection SpotLight, two per-shot fills (cold "moon-pool bounce", warm "case spill"), a broad top spot for the
  future gallery; volumetric doorway shafts (`FX.windowShaft`, two sets for the two moon directions) and dust motes (S023).
  Every shared light is snapshot at build time and restored on every frame (frames may render in any order).
* **Grade**: CT_MODERN base (temp −0.12, sat 0.86, contrast 1.05, cool shadows / silver highlights, grain 0.035, bloom 0.32);
  CT_FUTURE (`futurePost`: contrast 0.9, sat 0.8, lifted blacks, warm-silver highlights, grain 0.025, bloom 0.18).

## Glass, eras and reflections (how the cross-era panes are made)

The rule: **era images are composited as seen** (never mirrored), **reflections of the present are true mirrors**, faces of
the past never resolve. Each pane carries three overlay meshes (`paneOverlay`):

1. **'low' role** (engine LOWRES layer, merged *after* the DOF, additive): the era image on a *virtual image plane* behind the
   glass (ray–plane intersection per pixel → real parallax; soft vignette `uEraSoft`), the mirror reflection (a reflected
   camera with a Lengyel oblique near plane on the glass, layers 0 + L_MIR, rendered at 480 × 200 without the moon's shadow map,
   then blurred by its own circle of confusion), the dust film (texture LOD by CoC), salt glints. Pre-blurring each layer by its
   own CoC means the engine never blurs it by whatever depth happens to sit behind the glass (that was the original bug: the
   navigator's hand was cut to a rectangle by the far gallery depth).
2. **'main' role** (full res, L_OVL): a screen-space era layer `tEra2` — the navigator's hand / the future viewer rendered with
   the main camera into an RGBA RT (alpha = coverage), or a screen-mapped nested view (S026, with an optional reposition
   `uEra2Xf` and a vertical fade `uEra2Fade`).
3. **'depth' role**: writes the era layer's mirror depth where it covers (gain `uDepthK` so faint ~30 % layers still write), so the
   engine DOF blurs it at the right distance.

Nested views are rendered by `ctx.renderNested` into ≤ 640 px RTs, only for panes that are on screen. `?nonest=1` skips them
(fast staging).

## Shots

Timings are `render.mjs --range` over 24 frames (see the table at the end; the machine was shared, load 2–4).

### S001 — ECU 100 mm, 0–13.25 s (fade-in)
* MC push 2 % on the MC_OPEN camera (lens 1.18 m, 1.28 m off G1's south glass, focus on the glass). Her gloved right hand enters
  from the right, the fingertip touches at 1.23 s and wipes an arc to the left (1.2–4.5 s, decelerating) — the wipe is a mask
  in the pane overlay, so the dust film clears exactly along the fingertip path; salt glints (era scene) sparkle in the cleared
  band from 2.75 s; 6.6–9 s the focus racks through the glass; 8–11 s the navigator's salt-crusted left hand rises behind the
  glass at mirror depth and stops one finger short (his fingertips above hers, thumb pad at left, ~8 % larger); the pin spot
  lights the dust's upper edge; the compass glint soft low in frame. Last frame = S002 frame 0.
* Registration: the hand's palm socket sits near the heel, so the calibration puts the socket at y 0.65 → the whole hand is
  centred on (0.50, 0.55), her fingertips just under the frame top and his (larger) fingertips above them; S002 and S071 use the
  same registration.
* Deviations: none of substance. The glove reads silver-white under the P04 moon.
* Weakness: the salt crust on the navigator's hand is subtle at this scale; the glints are a little regular.

### S002 — ECU → MCU 100 mm, 13.25–21.125 s
* Residual push to 3.45 s; the hands nearly coincide on 千 (f363), her fingertip tremor on 年 (f373); 3.4–3.9 s her hand lifts
  and exits right; from 3.45 s a slow 1.2 m pull-back on the same axis; on 17.49 s the focus goes into mirror depth, his hand
  recedes ~40 cm and darkens as the night sea (`view_shiplamp`, virtual plane 20 m behind the glass) widens across the pane with
  the swinging stern lantern at upper left; her faint reflected silhouette (true mirror pass, she stands just right of the lens
  and steps back with it) at upper right; 19.5 s the guard's torch sweeps far away right → left. End frame: hood ~65 % of frame,
  compass small at (0.50, 0.62), lantern ≈ (0.36, 0.30).
* Deviations: the corridor sky is hidden in this mirror pass (it printed a hard blue doorway over the sea).
* Weakness: the torch sweep is faint at this exposure; her reflection is a soft dark silhouette with a pale collar.
* Library/engine note: rendering the hi RESTORER through the reflected camera at 3.9 s produced NaNs in the mirror RT that the
  bloom spread over half the frame; the overlay now discards non-finite mirror samples (not logged as a lib bug — the cause may be
  the oblique projection).

### S003 — CU 75 mm, 21.125–28.42 s
* From the retreat's momentum a rightward arc of 15° + push (1.95 → 0.98 m), settling at 4.9 s, frameAt keeps the compass at
  (0.5, 0.62 → 0.55); the sea (same far virtual plane) slides out of the pane purely by parallax/angle, gone by ~2.9 s; focus
  reflection → dial. End: compass ~60 % of frame height, red south tip lower left, crack at 乾, pin-spot highlight on the rim.
* (Review) the sea now slides toward frame LEFT and leaves past the hood's left edge by ~1.8 s, as the shot list lays it out
  (ruling 1: era images are composited as seen); frame 0 is S002's end framing on 75 mm. See Review.

### S004 — INSERT 50 mm overhead, 28.42–31.67 s
* Square to G2's 10° board through the glass, distance from FRAME_W; ~3 % push; frame 0 the gloved fingertip resting on the glass
  at (0.90, 0.82), lifting and withdrawing right 0.2–1.1 s; the T03 registry (chart x 0.05–0.95, lower edge 0.88, islet
  (0.62, 0.40), acrylic strips at x 0.10 and y 0.06) matches S005 frame 760 (`pairs1.jpg`).

### S023 — WS 32 mm tilt-down, 83.54–86.79 s
* Camera (0, 1.5, 1.55) (review; was 2.85). Frame 0: the reflected moon (a mirror-only sprite + a faint reflected arch) in G3c's upper glass at
  (0.70, 0.40) — the light-point match from S022's catchlight (`pairs1.jpg`); 0.12–2.52 s tilt from +5° to −3°, the moon riding
  up with the glass; the three cases G3a/b/c in a row (x ≈ 0.29 / 0.50 / 0.71, ~70 % of frame height) with the floor pools below;
  doorway shafts (0.07) and faint dust; she walks in from screen-left at 1.3 m/s (z −5.35), lit by G3a's dimmed glow, at x ≈ 0.17
  on the last frame.
* Deviation: the tilt is ~7°, not 35°: from 9.85 m with a 32 mm lens, a 35° tilt-down cannot start on the cases' upper glass
  and end with the whole cases in frame (the glass top is only 8.7° above the lens axis). The cases sit at 0.29/0.71 rather than
  0.25/0.75 (the 2.2 m spacing at a distance where they are 70 % of frame height).
* Weakness: the moon in the glass is a cheat sprite (as the shot list flags); the restorer is small and dark (a silhouette).

### S024 — MS 40 mm lateral track, 86.79–90.04 s
* Constant left → right dolly 3.55 m off the glass; G3a centred at 0.4 s, G3b at 1.49 s, G3c at 2.57 s; each pane holds its era
  (`view_cabin`, `view_home_candle`, `view_pier`) on a virtual plane 1.6 m behind its glass, strength ~10 % at entry → ~40 %
  centred; her dim reflection walks with us in the mirror pass.
* Deviation: dolly speed 2.03 m/s (spec 1.3 m/s) — the cases are 2.2 m apart and must centre on the three sung words 1.09 s
  apart.

### S025 — MCU 75 mm, 90.04–93.25 s
* She stops close to G3b and leans to ~15 cm from the glass (0.1–0.6 s); the camera arcs 42° → 75° around her (over the right
  shoulder → near right profile) with a slow ~10 cm/s push; her head angles to the right as she searches; her own dim reflection
  (true mirror pass, lit by the case's 3000 K spill) lands near the empty mount; deeper, the wife by the candle
  (`view_home_candle`) on a small soft-edged picture plane held 2.6 m behind the glass on the (0.70, 0.42) ray, blurred ≥ 8 px so
  the face never resolves; three focus hunts between the reflection depth and the home depth, nearest at 2.62 s. The light-box
  glow is off (the era sits over dark velvet).
* Deviation: the era picture is screen-locked (re-placed each frame) so the candle stays at (0.70, 0.42) through the 33° arc — a
  fixed virtual plane would have slid ~0.3 frame widths.
* Weakness: the reflection on the mount is faint (it is meant to be darker than the candle); the moon throws her head's shadow on
  the back panel at lower left.

### S026 — INSERT 100 mm locked, 93.25–96.917 s
* Through G3b: `view_home_hand` screen-mapped (main role) at ~32 % over dark velvet, repositioned so the candle sits upper left
  and the bowl centre right; pre-blur 5 → 0 px over 0.07–0.9 s (face blur → the hand sharp); her gloved fingertip (lit by the
  moon-pool bounce) approaches the glass at lower right, its true reflection approaching it and stopping ~1 cm short; dust film;
  a faint mirror of the gallery; the old_home view freezes the hand from 2.70 s.
* Deviation: from a near-square camera the real fingertip and its reflection overlap; both read as one soft lit fingertip at
  lower right.

### S028 — MS 50 mm locked, 101.79–104.625 s
* Re-staged in this round: the lens 0.3 m off G3a's glass line looking ESE along the north wall. G3c open at frame left (warm),
  her left shoulder/back soft in the foreground at ≈ (0.30, 0.52) — leaning into the case, the left forearm on the deck edge — with
  a cold moon edge on her back and hair; the guard 12 m out, between the north-row columns at x ≈ 0.63 (centre third so the nod
  reads), steps in from the right out of the dark (0.38–1.2 s), torch pool by his feet, stops, nods on 103.37 s; focus her → him
  0.6–1.4 s.
* Deviation: the shot list's "a few steps away" and "40 % of frame height" conflict at 50 mm; the frame numbers win (he is ~45 %).
* His free left hand is IK'd to the small of his back.
* Weakness: the lit column base at right reads like a post; the frame is very dark (night, motivated light only).

### S029 — MCU 75 mm, 104.625–107.875 s
* Same side, tighter: 2.3 m from her eye, the lens pushed to G3's glass line; her left profile at (0.32, 0.42), eyes down to the
  case, the shirt's warm bounce on her chin; eyes up 0.30, quick nod 0.62, eyes down 0.84; focus rack to him 0.98–1.78; he
  lingers, turns at 2.28 s and walks off right, the torch pool sliding away.
* Deviation: the guard is cheated ~1 m north across the S028/S029 cut so he holds background right (≈ 0.68–0.74) instead of
  falling at the frame edge (geometry of a same-axis tighter set-up).

### S030 — INSERT 75 mm top-down, 107.875–109.875 s
* 80° down into G3c: the open case, shirt block centred, comb on its cloth at upper right, ~8 % push; the hooded 3500 K
  inspection lamp swings in from frame right at 0.8 s (0.3 s); the gloved hand enters from bottom-left at 1.2 s and strokes flat
  along the collar fold left → right, palm centre at (0.42, 0.42) on the cut at 1.63 s. Composition = S031's first frame (case,
  shirt block, collar position — `pairs1.jpg`).
* Deviations: the permit is not at the frame's right edge (it stands on its easel beside the case, out of the S031 composition);
  the director ruling that she closes G3c's door at the end is not shown in this top-down insert (it would break the S031 match).

### S040 — ECU 100 mm, 133.79–135.42 s
* T15 match from S039: the back of her gloved right hand at (0.37, 0.55) (≈ 40 % of frame height), fingers gently curled, thumb at
  left, a finger-width from G3c's closed glass; the pass soft behind with the grey-violet stamp at (0.60, 0.50) and the empty photo
  corners; the focus breathes ~30 % toward the stamp at 0.81 s and back; 2 % MC pull-back; a faint glove reflection (mirror pass)
  and dust on the glass. Hand silhouette within ~2 % of S039's last frame (`pairs1.jpg`).

### S070 — INSERT 100 mm (future), 219.71–223.375 s
* Dissolve from S069's two sleeves into the aged left cuff with the worn patch at (0.42, 0.62) (cuff ≈ 35 % of frame height);
  locked to 1.69 s, then the MC pull-back (ease-in, ~1.4 m in ~1.25 s, then a 5 cm drift) to the full G1 vitrine frontal and
  centred on the S001 axis by 2.71 s; focus follows cuff → coat. Future gallery: lime-washed walls, soft high-key top light, the
  brick panels washed over.
* Deviation: the engine's dissolve starts on the cut (S069 100 % at f5273, 50 % at f5279) rather than centred on it.
* Weakness: the worn patch is a soft pale oval — at this scale the pilling does not read as texture.

### S071 — ECU 100 mm (future), 223.375–226.29 s
* The MC_OPEN camera exactly, focus on the glass: the future viewer's reflection fades up as they step in (0.13–0.6 s, ~27 %),
  the reflected right hand (rendered as the left hand of a virtual image) rises 0.79–2.29 s, palm to the glass, thumb at frame
  left, and stops at (0.50, 0.55) ≈ 45 % of frame height — registered on S002's T01 frame (`pairs2.jpg`). The face is above
  frame; the pale knit body soft at left; the reflection thins out low on the pane (over the bright linen).

### S078 — MCU 75 mm (future), 240.0–242.04 s
* Re-staged: the lens 0.85 m off G1's glass looking NW so the glass fills the frame. The future viewer's reflection in lost
  profile in the left third (eye at (0.33, 0.40), ~30 %, blurred), facing screen right, lit only from screen right; in the glass
  to the right the reflected doorway holds the not-yet-dawn sky with its peach line (mirror pass); the coat soft beyond at lower
  right. The reflection forms over 0–0.36 s, then only breath. Matches S077's profile position (`pairs2.jpg`).
* Weakness: the figure's features are softened but still faintly legible on a large screen.

## Match cuts / dissolves checked (`pairs1.jpg`, `pairs2.jpg`, `sync1/`)

| pair | check |
|---|---|
| S001 end = S002 frame 0 | same function/state at the seam (hidden cut) |
| S002 T01 (f363) ↔ S071 (f5416) | hand at (0.50, 0.55), ~45 % of frame height, palm to glass |
| S004 end → S005 (f760) | chart registry (T03) |
| S022 catchlight → S023 moon (0.70, 0.40) | moon sprite placed on the start ray |
| S030 end → S031 (f2637) | case / shirt block / collar composition, palm mid-stroke |
| S039 (f3210) → S040 | hand silhouette at (0.36, 0.56) |
| S069 → S070 dissolve | sleeves → worn cuff at (0.42, 0.62) |
| S077 → S078 dissolve, S078 → S079 | profile in the left third, light from the right; window light to window light |

## Performance (1280 × 536, `render.mjs --range`, 24 frames)

| shot | range | s/frame (mean) | max | notes |
|---|---|---|---|---|
| S001 | 250:274 | 1.31 | 1.61 | re-run (the first run, 2.41, overlapped another agent's render) |
| S002 | 470:494 | 1.08 | 1.17 | sea nested view + mirror pass + era layer |
| S003 | 520:544 | 0.84 | 0.89 | |
| S004 | 700:724 | 0.68 | 0.83 | |
| S023 | 2050:2074 | 0.95 | 1.21 | shafts + dust + mirror over three panes |
| S024 | 2110:2134 | 1.68 | 2.19 | three nested era views (budget ≤ 3 s) |
| S025 | 2190:2214 | 1.25 | 1.57 | nested home view + mirror |
| S026 | 2270:2294 | 1.50 | 1.78 | nested home view (wide RT) + mirror + close glove |
| S028 | 2470:2494 | 0.74 | 0.79 | |
| S029 | 2540:2564 | 0.76 | 0.81 | |
| S030 | 2610:2634 | 0.72 | 1.55 | |
| S040 | 3220:3244 | 0.80 | 0.86 | |
| S070 | 5320:5344 | 0.66 | 1.07 | |
| S071 | 5400:5424 | 0.94 | 1.02 | era pass (FUTURE hi) |
| S078 | 5770:5794 | 0.94 | 1.60 | era pass + mirror |

Load average during the runs 2–4 (other agents rendering); first frame incl. build 61–80 s. Raw log: `out/check/museum_gallery/perf_r12.txt`.

Budget: typical ≤ 1.5 s, worst ≤ 2.5 s (S002/S024 ≤ 3 s). The 2048² moon shadow map, the 2 hi-poly figures, the mirror passes
and the nested era views are the costs; the levers already pulled: velvet as standard material, merged shells, contents and
panes hidden when unseen, cheap glass on G1's secondary panes, the mirror pass without the moon at 480 × 200, a 480 × 360 sea RT,
1024² shadows for the INTRO, unused lights made invisible.

## Debug

URL query: `nonest=1` (no nested views), `off=` / `window.__MGOFF` (`mirror nested era low moonshadow shafts fig room g3 g2 g1 bloom
xlights glass lights dof info pts mirfig`), `dbgcam=px,py,pz,tx,ty,tz,mm` or `dbgcam=plan` (+ `dbgfill=`), `dbgtex=era|era2|mir|g3`
(`&i=` pane index).

## Known weaknesses (summary)

* S001/S002: at ECU scale the navigator's hand still reads mostly as warm skin around her glove (salt texture subtle).
* S023: a ~7° tilt instead of 35°; the restorer is a small silhouette.
* S025: her reflection on the mount is faint; the era picture is screen-locked through the arc.
* S028/S029: the guard is cheated ~1 m across the cut; S028 is very dark.
* S070: the worn patch is a soft oval without visible pilling.
* S078: the reflected profile is soft but not fully featureless.

## Review (art director + DP pass, 2026-10-06)

Looked at: every shot at u 0.05 / 0.5 / 0.95 before (`rv1/`) and after (`rv6/`), every sync-point and cut frame together with the
neighbours' adjoining frames (`sync2/`: S005, S022, S027, S031, S039, S041, S069, S072, S077, S079), targeted re-renders `rv2/`–`rv7/`,
debug frames (`dbg_s24/` no-mirror, `dbg_s25*/` reflection points + mirror texture, `dbg_s26/` no-DOF). Contact sheet `sheet.jpg`
regenerated from the final stills `final/`. The module before this pass: `museum_gallery.pre_review.js.bak`.

### Bugs found and fixed
1. **S024: all three panes showed the same era.** One blur RT pair was shared by the three panes, so every pane showed the last
   era rendered (G3a held the home at the start; G3b and G3c held the pier). Each pane now has its own pair: G3a the cabin, G3b the
   home, G3c the pier.
2. **S026: the whole insert was blurred.** The depth role placed the home plate 1.4 m behind the glass, which is behind G3b's back
   panel (0.68 m). The `gl_FragDepth` write failed the depth test, and the opaque plate at 0.32 never reached the 0.35 threshold
   anyway, so the DOF blurred everything by the back panel's depth. The plate depth is now 0.6 m (in front of the panel), with
   `uDepthK` 4, and the focus follows it. The hand, chopsticks and bowl are sharp; a screen band at the top keeps her face a
   7 px blur.
3. **S001/S002: things behind the navigator's hand came out sharp.** The depth proxy gave the pixels behind his hand his mirror
   depth, so the compass and the far G3 deck line were sharp inside a soft hand, and a hard horizontal line crossed his palm. The
   main role now composites premultiplied-over (`uEra2Over` 0.85, independent of the dust mask): his hand hides what lies behind
   the glass, and the DOF blurs it by its own depth.
4. **S071/S078: the same artefact** (room edges sharp inside the viewer's silhouette). The era layer was already pre-blurred at
   half resolution, so it now goes into the post-DOF low role (`uEra2Low`) with no depth proxy.
5. **S025/S026/S023/S024: the mirror pass rendered before the shot's lights were set,** so her reflection on the mount was black.
   The lights are now set first. `mirrorPass({ boost })` adds lights for the reflected side only: in S025 the case glow on her
   face front, in S026 the glass side of her glove. Her visible profile stays low-key.
6. **S001 → S002 hidden seam.** S002 frame 0 already had the sea at 35 % (the lantern and glitter popped in at the seam). S001 also
   used a small moon shadow box, so the far gallery outside it was fully moonlit and stepped darker at the seam. The sea now
   starts at 0 and opens with the pull-back from 2.9 s, and one shadow box (`INTRO_BOUNDS`) covers S001–S003. f317 and f318 are
   now identical.
7. **S002 → S003 hidden cut.** S002 ended with the compass at (0.50, 0.74). S003 opened with it at (0.50, 0.62) and the lantern
   0.17 frame heights higher. S002's pull-back now tilts to the specified end framing (`S2END`: compass (0.50, 0.62), lantern
   ≈ (0.39, 0.28)). S003 frame 0 is the same framing on 75 mm (distance × 0.75), and the sea plane is fitted from the S002 end
   camera. Her reflected silhouette is carried across the cut (S003 mirror pass up to 2.2 s) and leaves by angle.
8. **S024: a hot-pixel glint rode the bottom of the frame.** It was the specular of the under-floor bounce light in the glass; the
   light was moved deeper, out of the reflection's view.

### Look and staging
* **S003:** the sea and lantern now slide toward frame LEFT and leave past the hood's left edge by ~1.8 s, as the shot list lays
  it out (ruling 1). The compass needle was hidden under an opaque-white mica that washed the well to a beige plate. The mica is
  now a nearly clear sheet with the crack at 乾, the well floor is lighter, and the blued needle is wider: the red south tip reads
  at the lower left. The frameless hood's edges were four white neon posts in the pin spot; they are now dark and matte.
* **S001/S002:** the glove is toned down (0.62), so it reads as cotton instead of flat white. The noise sparkle printed a star
  field along the wipe band; it is off, and the 7 crystals behind the glass remain (几粒盐晶). His hand has a cool moon key, a
  dimmer ship-lamp glow and 12 salt sparkles in the finger gaps and along the finger edges, riding the hand. The torch sweep
  crosses the frame on 19.5 s (it used to cross later and faintly).
* **G3 cases (S023/S024/S028/S040):** the back-panel glow made the cases read as beige light boxes. The glow is now dim and
  top-weighted with a deck pool, so the interiors are dark velvet (bible §8.3) and the doorway reflections and era images read.
* **S023:** the camera is now 7.9 m from the glass (was 9.2), so G3a/b/c land on x 0.25 / 0.50 / 0.75 at ~72 % of frame height
  as the end frame asks. The tilt is +5° → −3°, and the moon still starts at (0.70, 0.40). She walks in with a cold moon edge
  (a narrow cheat spot; she had been a lost silhouette or flame-lit by the G3a spill). The dust glitter on G3b is reduced.
* **S025:** now an MCU (2.55 → 2.25 m, arc 42° → 68°); her head had been 70 % of frame height, a giant mask. The frontal moon is
  gone (0.55), and her edge comes from behind (SSW). Her head's moon shadow no longer prints a black disc on the back panel. The
  empty mount catches the case spot, and for this shot it sits where her reflected face lies (G3b contents offset, computed once
  from a fixed pose). Her reflection is darker than the candle and soft (≥ 3.5 px).
* **S026:** restaged with a 24° yaw from the west. The real fingertip (soft, lower right) and its true reflection now separate on
  screen: the reflection drifts from (0.80, 0.78) to (0.72, 0.70) and stops a sliver short. The plate is used as old_home solved
  it (candle (0.30, 0.35), bowl (0.62, 0.55), hand (0.56, 0.58)) instead of being shifted up by 0.15.
* **S028/S029:** the guard was already standing lit in the gap at frame 0. He now walks out of the dark from screen right, and
  the pool light comes up as he arrives; only the torch beam shows at frame 0, as the key frame asks. He is lit from the doorway
  side, half-lit instead of a pale front-lit mask. Her moon edge now comes from the doorways behind her (SE) instead of a front
  fill toward the west-side lens. The moon is 2.3, so the lit column base is less of a post.
* **S030:** the museum shirt blew to near white under the lamp. It is now faded grey-blue (#8392A0 family), with the lamp at 0.85.
* **S004:** exposure 1.3 (the chart was murky).
* **S070:** the end frame now holds the whole glass cover (0.97–1.47 m) and the plinth top; it used to end at 1.34 m, so no glass
  read. In the future look the 6 mm hood edges read as darker green-grey lines, the worn patch is paler (更亮, as the bible asks),
  and the future gallery is higher key (hemi 3.0).
* **S078:** the reflected profile has a 6.5 px blur; the face no longer resolves.

### Checked and OK (no change)
S004 → S005 chart registry (T03); S022 catchlight → S023 moon (0.70, 0.40); S030 → S031 case / shirt block / collar composition; S039 →
S040 hand silhouette (0.37, 0.55); S069 sleeves → S070 cuff (0.42, 0.62); S002 T01 ↔ S071 hand; S077 → S078 profile (0.33, 0.40) and
S078 → S079 window light; S040 → S041 (old_home picks up the glove at frame left); exposure continuity at every cut pair.

### Still weak / deviations kept
* S023: the tilt is ~8° rather than 35° (geometry, see S023 above).
* S024: the dolly runs at 2.03 m/s (the sung words set it).
* S026: the silver bangle sits at the very top edge of old_home's `view_home_hand` framing, so it does not read as a glint; the
  framing belongs to old_home.
* S029: the inspection lamp lights her lower face as written, and at MCU the sculpted face still reads a little as a mask.
* S030: the ruling's door closing is not shown, because this top-down insert must match S031. S070's dissolve starts on the cut
  (engine behaviour).
* The faces of the present (S025 reflection, S028/S029) are low-key but still faceless mannequins by design.

### Performance after the review (1280 × 536, `render.mjs --range`, 20 frames per shot; `perf_rv.txt`, A/B in `ab_rv.txt`)

Other agents were rendering throughout (load average 3–7 on 4 cores), so these absolute numbers run 1.3–2× the idle figures in
the table above. Interleaved A/B runs against the pre-review module under the same load show the review costs nothing measurable:
S002 470:484 new 1.14 / old 1.08 s, S024 new 1.77 / old 1.77 s, S026 new 1.53 / old 1.48 s.

| shot | range | mean | max | load | notes |
|---|---|---|---|---|---|
| S001 | 250:270 | 1.36 | 1.72 | 3.2 | |
| S002 | 470:490 | 2.33 | 5.18 | 5.3 | includes one shader recompile when the torch switches off (f484); 470:484 alone = 1.14 s at load 3 |
| S003 | 507:527 | 1.37 | 1.56 | 6.4 | + her mirror pass to 2.2 s (cut continuity) |
| S004 | 700:720 | 1.16 | 1.56 | 5.7 | (0.68 idle) |
| S023 | 2050:2070 | 1.16 | 1.44 | 7.2 | |
| S024 | 2110:2130 | 2.11 | 2.64 | 5.8 | three nested eras + three blur pairs (A/B 1.77 = old); budget 3 s |
| S025 | 2190:2210 | 1.57 | 2.31 | 5.3 | |
| S026 | 2270:2290 | 2.32 | 2.93 | 4.7 | A/B at load 3–4: 1.53 |
| S028 | 2470:2490 | 1.19 | 1.42 | 5.4 | |
| S029 | 2540:2560 | 1.54 | 2.01 | 6.3 | |
| S030 | 2610:2630 | 1.09 | 2.20 | 6.9 | |
| S040 | 3220:3240 | 1.22 | 1.54 | 6.6 | |
| S070 | 5320:5340 | 1.22 | 1.80 | 5.7 | |
| S071 | 5400:5420 | 1.32 | 1.69 | 5.6 | |
| S078 | 5770:5790 | 1.65 | 2.31 | 5.3 | |

Six consecutive frames of S002 (476–481), S024 (2116–2121) and S026 (2276–2281), taken from the perf clips (`consec/`), show no
flicker. The dolly, the lantern swing and the glove approach are all continuous.
