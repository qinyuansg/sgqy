# pier_waiting — LOC_PIER (1920s–30s waiting shed & quay, CT_MIG) + the steamer rail at dawn

Module: `previz/scenes/pier_waiting.js` · shots **S020 S031 S032 S033 S034 S036 S037 S038 S039 S043 S068 S076** · named view
**`view_pier`** (G3c pane in S024, corridor pane P3 in S066). Checks: `out/check/pier_waiting/` (`sheet.jpg` = all shots at u = 0.05 / 0.5 / 0.95 after the review (`review/r4`, `review/make_sheet.sh`),
`full/` u = 0.05/0.5/0.95, `sync*/` exact sync-point frames, `dbg/` overview cameras via `dbg_shots.json`, `range_*.mp4` timing clips).

## The set (built once in `create()`)

* **Geography (one coherent set, two camera families).** Shed 50 × 15 m along X: town/home at −X, gate + end doors + steamer at +X;
  open seaward side +Z (cast-iron columns every 5 m), landward wall −Z with tall windows onto a soft blue-hour town backdrop (warm
  windows, street-lamp bokeh). A waist-high timber railing at z = −3 separates travellers (z > −3) from the families seeing them off
  (z < −3, their own prop lamp row). The stamp **booth** (high counter, brass rail, three glass partition windows, clerk's desk, ink tin,
  brass/rosewood stamp) is built into the cross railing at x = 8 between the long railing and the passengers' **gate** (two leaves that
  swing toward the quay). Bulb lamps every 5 m along z = −0.6; her upturned crate is under the **third lamp** (x = −10).
  * −Z-facing set-ups (home screen-left, ship screen-right): S032 (and the S037/S038 lateral logic via the booth).
  * +X-facing set-ups along the shed (families screen-left beyond the railing, steamer screen-right): S020/S043/view_pier, S034,
    S036, S037 (through the glass), S038, S068; S039 is shot from the family side diagonally toward the gate / seaward side.
* **Steamer (screen-right lock):** 90 m extruded black hull #1C1C1E with two rows of lit/unlit portholes, white sheer line and
  superstructure #D9D6CC with lit windows, invented funnel (ochre #B58B4A, slate band #4E6273, black top), masts + rigging lines,
  lifeboats, deck lamps, gangway. Moored beyond the end doors along the seaward quay (x 22…114) so oblique views still see open
  dusk sky/sea and the ship sits at screen-right in S036/S068.
* **Light (motivated only, 2400 K):** one shadow-casting SpotLight "key" re-hung per shot at the lamp nearest the action (1536²,
  cone 0.62 rad), one bulb PointLight fill, optional second fill (used as a warm bounce off the case / planks in S032, S068) and a
  cool blue-hour DirectionalLight from the open side (only S032 rim, S036, S038, S039 backlight, S076); hemisphere fill; custom
  PMREM environment of the shed (bulb row + blue openings) for the wet planks, brass and glass. Every lamp: enamel shade (inner
  emissive), HDR bulb (blooms), glow halo, a half-res `FX.beamCone` of humid air, an additive floor pool decal.
* **Wet floor after rain:** weathered planks with a procedural puddle roughness map (mirror-smooth puddles pick up the bulbs);
  wet granite quay. `FogExp2` humid air.
* **Crowd:** 6 baked migrant-era extras (cache seeds 101–106) × 9 pose buckets (6 walk phases, 2 stands, sit) as InstancedMeshes;
  110-person fixed population (walkers flowing +X toward the gate, families behind the railing, waiting passengers with luggage,
  a queue at the gate); per shot: keep-out boxes, flow speed, gate open, shot-specific extra walkers; **per-person frustum culling**
  after the camera is placed; each baked pose merged into one vertex-coloured Lambert geometry (soft focus / distance), plus a
  clustered far LOD beyond a per-shot distance; carried cases/bundles.
* **Props:** PROP_CASE 58×38×21 (rattan, leather binding/corners/straps, brass buckles, wrapped handle, **蓝印花布 lining**
  #3B5578, lid hinged at the back), PROP_SHIRT folded block 30×22 (#6F7F8F, patched collar band, 对襟 placket with knot buttons,
  sleeve-fold ridges, hinged last third, the cut hem triangle), PROP_KEEPSAKE (cloth bundle #8E4A3C), PROP_LETTER as a 6-panel
  fold rig (thirds then half; written face `TX.letter`, plain back), the triangle of shirt cloth inside the half fold (S043),
  PROP_SWEETS (rounded tung-oil paper parcel with its own texture, emissive "backlit" glow, red string cross P16; opened variant +
  broken piece for S068), PROP_PASS (guilloche border, illegible rows, photo + 4 corner mounts) and the invented PROP_STAMP mark
  (double ring, ship, three waves, six-point star, aniline violet; no text), crate, benches, dressing luggage.
* **Figures:** MIGRANT hi (close-up hands swapped onto her wrists; head/hair hidden for the over-the-shoulder top-downs), the
  elder seeing her off = WIFE mid sculpt re-dressed (deep-blue #2E3A52 jacket, grey hair, no accessories), TRAVELLER hi with
  bundle + ticket, free close-up hands for the inserts (migrant L/R with 3/4 floral sleeve, the elder's old right hand with deep-blue
  cuff + sleeve, the clerk's two hands with an invented khaki-grey cuff + sleeve).
* **Dawn deck (S076):** white steel rail/stanchions/wires, deck planks, `createSea` calm, sky blend predawn→dawn, `createCoast`
  hazed (haze animated), thin `FX.fogCards` mist band, low peach key from screen-right.
* **Grade (CT_MIG):** saturation 0.78, neutral temp, creamy highlight split-tone, cool shadows, slight lift, grain 0.044, bloom
  0.42; S076 slightly cooler.
* **Debug:** `?pz=` / `window.__PZ` switches (`nocrowd noshadow nofig nosky nosea nocone nodof nofill nofillA noshed nosteamer
  noenv nopools noglow noshadowmap info mark`; review added `crowdlog nohair noglass nograin dbgcam` — `dbgcam` uses
  `window.__PWcam = { anchor:'letter'|'case'|'mig', pos, tgt, mm }`), overview cameras DBG_A–E via `out/check/pier_waiting/dbg_shots.json`.

## Shots

Times are local (tl = T − in_frame/24). "Reg." = registered match positions checked in stills.

### S020 · CH1 75.04–77.04 · MCU 75 mm, push · refolds the letter, presses it flat
* Seated on the crate under the third lamp, facing home (−X), case across her knees (handle toward her), letter open on the lid.
  Camera square to the case so the lid edge stays a horizontal line; push from face + hands (d 3.05 m) to the hands (2.05 m).
* Sync: right hand settles 0–0.40; bottom third folds 0.42–0.66, top third 0.66–0.90 (right hand pinching the moving edges), left
  hand folds the left half over 0.90–1.18 (folded on 被听见 76.22); slide to the lid edge 1.2–1.5; whole-palm press 1.56 (76.60); hold.
* Reg.: end frame — folded crease collinear with the lid's camera-side edge, one horizontal line at y ≈ 0.62–0.66 spanning the case
  width (measured y = 0.664 in f1846) → S021 ruler line. Start: hand descending in the lower-middle region (gesture rhyme with S019's lifting palm).
* Deviations: the keyframe numbers (head at y 0.25 *and* lid edge at 0.66 in an MCU, "frame width 75 cm", "push 25 cm") are
  mutually inconsistent at 75 mm; I kept 75 mm / MCU / the y≈0.66 line and used a 1 m push (face top cropped at the end). The
  right hand reaches from screen-left (she faces the camera, so her right hand is on screen-left; the keyframe's "from upper
  right" is anatomically impossible with her facing camera). The crowd is kept out of the lens axis.

### S031 · V2 109.88–111.92 · INSERT 75 mm top-down, locked · the shirt into the case (fabric match from S030)
* 80° top-down over her shoulder (her head/hair hidden — they would intrude at the bottom edge), handle at the bottom edge, case
  interior ≈ 85 % of frame width, shirt block centred (≈0.50, 0.52), collar upper-left; palms mid-press on the collar at frame 0
  (≈(0.40, 0.38)), lift 0.28–0.6 (slow-motion pacing), the last third settles 0.26–0.62 (叠进 110.35), whole-palm press on the hem
  corner on 箱 (110.95 → 1.08 s) with a half-beat hold, second press 1.6 s.
* Deviation: S030's registration numbers (block 55 % of frame height *and* case interior 85 % of width with a 30×22 cm block) cannot
  all hold; I prioritised case width + block position + collar position. The museum module should frame S030 the same way
  (camera ~1.63 m above the block, 75 mm, handle at the bottom).

### S032 · V2 111.92–114.54 · MCU 100 mm, handheld · looks back screen-left, one silent word
* Seated, facing camera; head turns 0.02–0.57 s from 3/4 screen-right (the ship) to 3/4 screen-left (home / the family along the
  railing) on 乡音; the faceless head gives the "silent two-syllable word" as two tiny chin movements at 0.40–0.82 (唇边 112.33);
  still looking on 看见. Four shot-specific walkers cross behind her left → right (soft, f/2), families and windows behind.
  Warm bounce from the case lid as fill, cool rim from the far end doors.
* Reg.: face ≈ (0.58, 0.40) → (0.52, 0.42) using a head-centre aim; head ≈ 55 % of frame height.
* Weakness: no mouth on the mannequins (lip movement is implied); the "warm bulb bokeh upper left" is only the town windows.

### S033 · V2 114.54–116.67 · CU 70° high angle, locked · reopens the case, places the comb
* Lid lifts from the front edge by her left fingertips 0.05–0.79 (open on 一颗心 115.33), swings out of the top of frame; the cloth-
  wrapped comb rises from her chest, is set on the shirt's top-right corner at 1.4 s and pressed with the palm on 念 (116.29 → 1.75).
* Reg.: comb at ≈ (0.62, 0.38) — the museum layout position (0.64, 0.34).
* **Review:** camera ≈ 76° down and framed 5 cm toward her (the 70° view showed the hidden head's open neckline): shirt centred
  (0.50, 0.45), comb (0.63, 0.29); the palm now rests on the bundle (it sank 1–2 cm into it).
* Deviation: lid does not close (no time — as flagged in the shot list).

### S034 · V2 116.67–118.33 · INSERT 100 mm at the railing (camera +X) · the sweets parcel pressed into her hands
* Her two hands palms-up side by side (little fingers together) from screen-right; the elder's old hand enters from screen-left
  with the glowing oil-paper parcel (visible from frame 0), sets it in her palms 0.50–0.60 (哪味甜 117.25), her fingers close round it
  0.62–1.24 (甜 117.91) while the elder's hand slides over her curled fingers; a small squeeze; hold.
* Reg.: closing fingers ≈ (0.53, 0.55) → S035 needle fingers (0.54, 0.58).
* Weakness: the second (left) palm is mostly hidden behind the right one; parcel contents are not visible through the paper.

### S036 · V2 121.25–123.29 · WS 32 mm locked, deep focus · two hands clasped at the railing, the steamer beyond
* Looking along the shed toward the open end doors; her figure 3/4 from behind (braid), case in her right hand; her left arm back to
  the elder's hand over the railing (elder's arm from the frame-left edge, her face cropped out); crowd drifting slowly toward the
  closed gate and the booth; lamps receding with their haze cones; steamer superstructure/portholes at screen-right through the
  seaward side; the thumb stroke on 平安 (1.40 s) is animated but too small to read at WS.
* Reg.: clasp ≈ (0.35, 0.61) (asked 0.34, 0.60); railing line low-left.
* **Review re-stage:** the hands never touched (≈ 10 cm gap, both arms out of reach) — now `claspHands()` solves her left hand and
  the elder's right hand palm-to-palm (pairHands geometry) with each figure's IK, both within reach (IK error 0). The booth is
  hidden (filler railing) and the bench / standing extras are cleared so the gate and end doors read; the steamer is re-berthed
  per shot broadside in the end-door opening (porthole rows at frame ≈ (0.71, 0.38)); key narrowed onto her so the elder stays a
  dark, anonymous shape (留白, bible §5.5a). Measured: clasp (0.36, 0.60), her 0.46–0.55, case (0.54, 0.83).

### S037 · V2 123.29–126.12 · INSERT 45° down through the booth glass · the stamp falls on 章
* Booth in the cross railing; camera on the passenger side looking +X through the partition at the opened pass on the clerk's side.
  The clerk's fist (invented khaki-grey cuff) brings the stamp from the ink tin (top-right, visible at frame 0) to its peak at 0.74
  (印 124.03), a slow-motion hang, the fall with ease-in to impact at 1.29 (章 124.58), a tiny squash/hold, lift at 2.31 (125.6) revealing
  the violet mark; the clerk's left fingertips hold the photo corner (photo never frontal); her floral sleeve soft at the left edge in
  front of the glass (arm still stretched back to the family); the lamp's reflection on the pane at (0.35, 0.25).
* Reg.: violet mark ≈ (0.60, 0.48) → S040's faded mark (0.60, 0.50).
* Deviations: with the mark at the registered spot and the pass centred, the mark falls on the inner rows, not "half over the
  guilloche border"; the bulb reflection is a glow placed on the pane (a true mirror image would be outside a 45°-down frame).

### S038 · V2 126.12–129.75 · MS 40 mm, slow track right + handheld · gate opens, her arm held back
* Camera along the railing (+X, screen-right = seaward/ship); the gate leaves swing open from 0.07 s (许你 126.19); the queue and
  walkers pour through; she steps off from the booth window toward the gate carrying the case (hung vertically from her right grip),
  her left arm stretched back over the railing to the elder (frame-left, soft); the walk decelerates as the arms straighten on 一站
  (128.23 → 2.11 s); she looks back over her left shoulder from 1.3 s; the track moves right 0.45 m.
* Reg.: her ≈ 0.47 → 0.55 of frame width, clasp ≈ (0.18, 0.47) → (0.22, 0.45).
* Deviation: she can only move ≈ 0.6 m before both arms are straight (physically held back), so "walks forward" is a step and a half.
* **Review re-stage:** hands were 0.5 m apart and she stood against the booth's dark counter wall. Now: booth hidden (filler
  railing), she starts beside the railing and walks toward the gate (+Z = screen right), her shoulder is pulled back so it is never
  more than `S38_DMAX` (1.0 m) from the elder's — the clasp is the midpoint of the two shoulders, solved every frame (hands never
  part); the crowd funnels through the opening gate (it used to walk through the cross railing); the steamer broadside beyond the
  end doors at frame right; the sky light moved to the seaward side (from +X it glinted like a sun in the wet planks).

### S039 · V2 129.75–133.79 · ECU 100 mm, locked, backlit · the hands part on 别
* Over the elder's shoulder from the family side, looking diagonally toward the gate and the open seaward side (deep-blue dusk sea and
  sky behind; crowd removed so the end frame is empty); the elder's old right hand back to camera, fingers up and gently curled, thumb
  at screen-left; the migrant's hand from screen-right slides off — palm → knuckles → fingertips — from 0.63 s (许你 130.38), fingertips
  only at 2.97 (离 132.72), apart at 3.21 (别 132.96), then exits screen-right; the elder's hand is absolutely static for the last 20
  frames (no breathing / tremor on that hand). Cool backlight rim on the nail tips, warm shed fill from behind the camera.
* Reg.: T15 A-frame — elder's hand ≈ (0.37, 0.58), width ≈ 40 % of frame height → S040 (0.36, 0.56).

### S043 · CH2 139.88–142.21 · MCU 75 mm, push (S020's set-up) · the letter holds a triangle of the old shirt
* Same crate, lamp, camera family as S020: the folded letter on the lid; the last half fold opens 0–0.35 (等沉默 140.22) revealing the
  grey-blue triangle; her right thumb strokes it at 1.2–1.5 (听见 141.18); the fold closes 1.5–1.9; whole-palm press 1.93 (141.8); hold.
* Deviation: the push goes further than S020 (end frame width ≈ 0.7 m instead of ≈ 1 m) because the 3×4 cm cloth — the only news in
  the shot — does not read in the wider frame; the end still lands the horizontal lid/letter line (≈ y 0.6) for S044.
* **Review:** the lid edge is now solved onto y = 0.66 at the end of both S020 and S043 (`letterCam` → `aimAt`); S020 trucks from
  her head at (0.41, 0.28) (keyframe 0.40, 0.25) to the centred line (0.21–0.79); a warm bounce off the lid lifts her bowed face
  (the top-only bulb left a black "blindfold" band across the brow); the press is a whole palm with fingers toward frame right
  (no longer hanging over the lid edge); in S043 her right hand rests aside until the stroke so the cloth triangle (now a #6F7F8F
  cotton patch — the shirt map read black) stays visible 0.35–1.2 s, and the fold opens nearly flat so it does not shadow it.

### S068 · CH3 215.67–217.71 · MS 50 mm locked · she gives the boy a piece of the sweet (left → right, T21)
* The bench under lamp 5 facing home (camera +X): she at screen-left, the TRAVELLER at screen-right (oversized coat, bundle hugged,
  ticket in his left fingers); the opened oil-paper parcel glows in her lap; her right hand (already moving at the cut) sets the
  piece in his palm on 面 (215.94 → 0.27 s), he hesitates and closes his fingers 0.3–0.7, her head tilt/nod ("smile") across 千
  (216.6), his head lifts/turns toward her at 1.5 s (半边脸松开); crowd soft behind toward the gate; warm bounce from the planks.
* Weakness: faceless heads cannot show the smile or the "half smile" — they are carried by head tilts only; faces read as masks.
* **Review:** the give was 25 cm short of his palm (her right arm could not cross 1 m of bench). They now sit 0.8 m apart, she turns
  toward him, the meeting point is solved between the two right shoulders; his palm waits at it from frame 0 and the piece drops
  into it at 0.27 s (面). Camera 3.15 m, solved on the two heads (faces ≈ (0.39, 0.32) / (0.61, 0.36)); the parcel tilted on her knees
  so it reads; the boy's ball-shaped bundle replaced by a knotted cloth 包袱.

### S076 · OUTRO 235.54–237.08 · MCU 100 mm locked · dawn on the steamer's rail, a new coastline
* Separate deck set (white steel rail across the lower frame, deck, calm sea); her right profile at the left third looking
  screen-right, case in her right hand below frame, left hand on the rail; dawn key from screen-right; a thin mist band at the
  horizon and the new coastline (createCoast) at the right horizon emerging as its haze drops 0.45–1.3 s (236.4 → 0.86 s).
* Reg.: eye ≈ (0.33, 0.40) (dissolve anchor with S075, which already renders from sea_deck; checked in the dissolve frames),
  horizon ≈ y 0.52; profiles/light to screen-right for S077.
* Implementation note: the sky dome must draw first here (see lib/ISSUES.md) or it paints over the coast.

### view_pier (nested; G3c S024, corridor P3 S066)
* 50 mm MS from in front of her (camera +X family): on the crate under the third lamp, case on her knees, the letter open, her right
  palm slowly smoothing it (pure function of T), crowd behind but cleared from the foreground (nested renders have no DOF), lamps
  receding to the blue end doors. Reads at 480–640 px; aspect-agnostic (centred). Linear HDR, no post — the host module grades it.

## Performance

_Superseded by "Performance (after the review)" at the end of this file._

The machine was shared with several other render agents the whole session (load average 8–15 on 4 cores), so wall-clock numbers
are 2.5–4× slower than idle. Two measurements: `render.mjs --range` over 24 frames (as required), and an idle-equivalent estimate
from single frames interleaved with the engine's reference lab frames (`out/lab/perf_shots.json` EMPTY 0.34 s / DOF 0.51 s idle),
scaled by the measured reference slowdown (± ≈40 % — heavier frames suffer more from contention, so these lean pessimistic).

| shot | 24-frame `--range`, final (load ≈ 8–10) | same range before optimising | idle-equivalent estimate |
|---|---|---|---|
| S020 MCU + crowd | 5.17 s/frame (f1813–1837) | 5.97 | ≈ 1.3–1.7 s |
| S031 top-down insert | 4.05 (f2650–2674) | 7.34 | ≈ 1.3–2.2 |
| S036 WS 32 mm | 2.83 (f2922–2946) | 3.81 | ≈ 0.9–1.3 |
| S068 MS two figures + crowd | 4.50 (f5186–5210) | — | ≈ 1.5–2.0 |
| S039 ECU hands | — | 2.59 (f3150–3174) | ≈ 0.9 |
| S032 / S033 / S034 / S037 / S038 / S043 / S076 (single frames) | | | ≈ 1.1 / 2.0 / 1.8 / 2.1 / 1.6 / 1.5 / 0.7 |

Scene build (first frame) 45–60 s: textures + cached figures + a few close-up hands sculpted live (the free hands with longer
forearms, the elder's and the clerk's hands are not in the bake). Typical shots land around the 1.5 s target, the heaviest (the
close inserts S031/S033/S037 where hands and the hero figure fill the frame) near 2 s, under the 2.5 s worst case.

What was done for speed: per-person crowd frustum culling; crowd extras merged into one vertex-coloured geometry per baked pose
(1 draw call per bucket; S068 498 → 234 calls) with plain Lambert shading; a vertex-clustering far LOD for extras beyond a
per-shot distance (S068 crowd 970k → 372k triangles); shadow casting only for figures/props near the action, 1536² key map with a
tight cone; the optional sky light / second fill only where they carry the image; the bulb fill off in close-ups; beam cones hidden
in tight inserts and when the camera stands inside one; the sky dome drawn after the opaque set indoors; merged window/crate
geometry; booth glass as a standard material; hidden leg layers in set-ups where her legs cannot be seen.

## Known weaknesses

* Faceless mannequin heads read as masks in the MCUs (S032, S068, S076); lip movement / smiles are implied by head motion only.
* Bare forearms below the blouse's 3/4 sleeve, and a visible seam where the swapped close-up hands meet the figure forearm.
* The crowd extras are low-poly with frozen walk phases (6 buckets) — fine soft or distant, stiff when sharp (S036/S038 wides).
* The steamer is a simple extrusion — it reads as a dark ship with lit portholes/windows only at night distances.
* The folded shirt, letter fold and parcel are simplified geometry; the letter panels are flat (no paper curl).
* Some keyframe registrations in the shot list contradict each other (S020 head/line/width, S030/S031 block size vs case width,
  S037 mark position vs border); see each shot for the choice made.

## Review (art director + DP pass, 2026-10-05)

Re-rendered every shot at u = 0.05 / 0.5 / 0.95, every sync-point frame, the view, and the neighbouring frames (S019 end, S035 start,
S067 end, S069 start, S075 end + the S075→S076 dissolve, S077 start), looked at all of them against the brief, the shot list
(action, keyframe_en / endframe_en, registrations), the bible and the rulings. Module backup before the review:
`out/check/pier_waiting/review/pier_waiting.before_review.js`. Stills: `out/check/pier_waiting/review/r1` (before), `r3` +
`r3/sync` (after), probes in `review/probe*`. Probe tool: `out/check/pier_waiting/review/probe.mjs` (one page, many
`frame:pzflags` jobs, `--pre` / `--eval` JS, luma strips; the module exposes `window.__PW` and a `dbgcam` PZ flag for side views
of contacts). Lib-level findings are appended to `lib/ISSUES.md` ([pier_waiting review]).

### Broken → fixed
* **Black frames (S020 f1825, S038 f3031, intermittent elsewhere).** 70 % of the frame went black: the vertex-clustered far LOD
  of the crowd averaged opposite normals of thin parts to zero → NaN shading → NaN pixels smeared by bloom/DOF. Zero normals now
  fall back to +Y (`clusterDecimate`).
* **Film-grain stripes (S068, S076 and, weaker, every shot after f≈2100).** Engine grain hash precision (ISSUES [sea_deck]). The
  module now draws its own grain in the engine's half-res additive layer (merged after the DOF, so bokeh keeps grain), weighted
  by the scene luminance (captured scene target), engine `grain: 0`; nested views get none.
* **S036 / S038 — the hands never clasped** (10 cm and 50 cm apart: arms out of reach). New `claspHands()`: her left and the
  elder's right hand palm-to-palm (the pairHands geometry) solved with both IKs; S038 also limits her walk so the shoulders stay
  within reach (`S38_DMAX`) and puts the clasp at their midpoint — the hands never part before S039. IK error 0 on every frame.
* **S038 composition:** she stood against the booth's dark counter wall with two big queue men on the right. The booth is hidden in
  S036/S038 (a filler cross-railing stands in; the booth exists only for the S037 insert), the opening gate and the shed beyond
  read behind her, the crowd funnels through the gate (walkers used to pass through the cross railing), the elder sits in the
  key's falloff (her face is never given — bible §5.5a 留白).
* **S036 / S038 steamer invisible** (it lay along the seaward quay, hidden by the end wall, fogged to a flat grey). Re-berthed per
  shot broadside beyond the end doors so its porthole rows fill the opening at frame right ((0.71, 0.38) in S036).
* **S068 — the give missed** (her hand stopped 25 cm short of his palm). They sit closer, she turns to him, the meeting point is
  solved between the shoulders; the piece drops into his palm on 面 (0.27 s). Reframed on the two heads; parcel tilted to read;
  the boy's ball replaced by a knotted cloth bundle.
* **Hot glare in S036/S038:** the blue-hour DirectionalLight came from +X at 6 m and mirrored like a sun in the wet planks; it now
  comes high from the open seaward side.
* **S034:** one palm hidden behind the other and the parcel edge-on; camera raised ≈ 7°, solved so the closing hands land on S035's
  pinch (0.54, 0.57 vs 0.54, 0.58 at the cut); the elder's hand now enters from frame left with the glowing parcel at frame 0;
  a family's hurricane lantern on a trunk gives the keyframe's warm bulb bokeh at (0.60, 0.25) (larger `maxCoc`).
* **S020 / S043:** lid edge solved onto y = 0.66 at the end (T10 → S021, S043 → S044); S020 opens with her left of centre
  (head 0.41, 0.28; keyframe 0.40, 0.25) and trucks to the centred line; warm lid bounce removes the black "blindfold" band
  (brow sockets + fringe under a top-only bulb) and the head is less bowed; the palm press now has its fingers toward frame right
  instead of hanging over the lid edge; S043's cloth triangle is a real #6F7F8F cotton patch (the shirt map rendered it black), the
  right hand rests aside until the stroke on 听见 so the triangle reads 0.35–1.2 s, the fold opens nearly flat.
* **S033:** the 70° view showed the hidden head's open neckline; now ≈ 76° and framed 5 cm toward her — shirt centred, comb at
  (0.63, 0.29) (museum position 0.64, 0.34); the palm rests on the comb bundle (it sank 1–2 cm into it).
* **S031:** fingertips poked out past the far edge of the shirt block — press points moved back 2.4 cm.
* **S037:** the stamp's peak on 印 was out of frame (20 cm above the pass) — now 7 cm, top right in frame; the lift exits top right so
  the fist's shadow clears the fresh mark; camera solved so the violet mark sits exactly on S040's registered spot (0.60, 0.50) (it
  was at 0.56, 0.53); a warm-grey veil on the partition plus a brighter bulb reflection make the "through glass" read (the lib
  `glassMaterial` looked the same here and cost ≈ 0.45 CPU-s full screen, so a plain pane is used); the clerk's desk lamp exists.
* **S039:** white sparkles on the nail tips (narrow cool backlight glinting on glossy nails) — backlight raised/aside and softer, a
  warm shed fill models the old knuckles; fingers gently curled (T15); the fingertips now really touch until 别 (3.21 s): her
  fingertip pads 1.3–1.4 cm from the elder's finger joints at 离/别 (was 2.3–2.4 cm, a visible gap), 5.5 cm apart 9 frames later.
* **S032:** black background → the families' hurricane lanterns hung on the railing give warm bokeh at upper left (and right);
  face (0.62, 0.40) → (0.52, 0.42).
* **S076:** level camera trucked so her eye sits on S075's dissolve anchor (0.34, 0.40; horizon ≈ 0.5); a cool camera-side fill
  makes the steel rail read white.
* **view_pier:** brighter key + lid bounce, head less bowed (it reads through hazy vitrine glass).
* Small: finer split-rattan weave on the case, bluer shirt cloth, lighter placket, elder's skin darker (#C08F6E), S036 near-lamp
  halo reduced.

### Checked and OK
* Sync points land: S020 75.44 / 76.22 / 76.60; S031 叠进 / 箱; S032 乡音 / 唇边 / 看见; S033 一颗心 / 念; S034 哪味甜 / 甜;
  S036 替谁 / 平安; S037 印 / 章 / lift; S038 许你 / 一站; S039 许你 / 离 / 别 / held 20 f; S043 等沉默 / 听见 / press;
  S068 面 / 千 / 半边脸; S076 coast emerging at 236.4 (stills in `review/r3/sync`).
* Match cuts / dissolves: S019 lifted right hand (0.30, 0.74) → S020 descending right hand (0.40, 0.62) lower-middle (gesture
  rhyme); S020/S043 end line y 0.66; S034 → S035 hands; S039 T15 elder's hand (0.36, ≈0.5–0.56) for the (not yet built) S040;
  S037 violet mark (0.60, 0.50) for S040's faded mark; S067 coat left→right → S068 give left→right → S069 mother left→right;
  S075 → S076 faces overlap in the dissolve; S076 → S077 profile to screen right, light from the right.
* Continuity locks: right hand carries the case (S036, S038, S076); left hand held by the elder at frame left; ship screen
  right; crowd flows to the gate; sweets parcel (red string cross) S034 = S068; comb bundle #8E4A3C; floral blouse, braid.
* No NaNs / black frames in any rendered still after the fix. Consecutive frames (6 each: S036 f2930–35, S038 f3060–65, S068
  f5190–95, `review/r4/consec`): frame-to-frame MAE 0.63–0.66 % / 0.85–0.90 % / 0.97–1.2 %, smooth (grain + motion), no pops.

### Still weak (accepted)
* Faceless mannequin heads: masks in the MCUs (S032, S068, S076); right-profile dark patches at eye socket / temple are in the
  head sculpt itself (ISSUES). Stand collar stands off the neck in S032 (ISSUES). Nails read as French tips at insert scale.
* The crowd is six baked men in caps: in the sharp WS (S036) the queue reads uniformed.
* The keyframe numbers of S020 (head 0.25 and line 0.66 in one MCU), S030/S031 and S033 (near edge 0.70 and comb 0.34 in one
  locked 75 mm frame) contradict each other; the end-frame registrations were prioritised.
* The steamer is re-berthed per shot (broadside beyond the end doors in S036/S038, along the seaward quay elsewhere) — a
  cinematic cheat in the spirit of ruling 2.
* S076's sync "235.6 dissolve complete" vs the engine dissolving over 5653–5664 (ISSUES).

### Performance (after the review)
The machine was shared with 3–5 other render agents (load 8–15 on 4 cores) the whole time, so wall-clock is 2–4× idle.
* `render.mjs --range` over 24 frames (`review/perf/timing.txt`, mean after the first, mid-review, before the perf pass below):
  S020 1.77 · S031 1.76 · S036 3.69 (load 15) · S038 1.87 · S068 3.01 · S033 2.71 · S039 2.21 · S076 2.11 s/frame.
* Load-independent: CPU-seconds of the Chromium process tree per frame (`review/pw_cpuprof.mjs`, median of 3), calibrated the
  same way on the lib README's documented idle lab frames (K_MAT 1.21 s ↔ 2.38 CPU-s, SEA 0.68 ↔ 1.19, K_VIT 1.57 ↔ 3.13:
  idle wall ≈ 0.50 × CPU-s). Final (`review/perf/cpu_final.txt`):

| shot | CPU-s | ≈ idle s/frame | | shot | CPU-s | ≈ idle s/frame |
|---|---|---|---|---|---|---|
| S020 | 3.57 | 1.8 | | S036 | 3.59 | 1.8 |
| S031 | 3.24 | 1.6 | | S037 | 4.73 | 2.4 |
| S032 | 2.88 | 1.4 | | S038 | 3.90 | 1.9 |
| S033 | 3.44 | 1.7 | | S039 | 2.25 | 1.1 |
| S034 | 4.03 | 2.0 | | S043 | 3.43 | 1.7 |
| S068 | 4.50 | 2.3 | | S076 | 1.76 | 0.9 |

  Mean ≈ 1.7 s, worst S037 ≈ 2.4 s (< 2.5). The inserts are fill-bound: close-up hands' procedural skin over most of the frame.
* Perf pass of this review: the sea's projected grid is skipped where the sea is never in frame (S020/S032/S043/view_pier; it
  cost ≈ 0.75 CPU-s in S020), sky + sea + steamer off in the interior inserts (S031/S033/S034/S037), plain glass instead of the lib
  glass in S037 (−0.45), fill off in S037/S068, S068 crowd all far-LOD and without the queue/waiting extras behind the heads
  (−0.75, also a cleaner background). Added costs: module grain (≈ 0.05), lanterns (glow sprites, negligible), lid bounce light in
  S020/S043/view_pier (≈ 0.25), larger `maxCoc` (none measurable).

## Integration fixes (whole-film QA pass, 2026-10-06)

Source: `qa/findings_by_module.json` (pier_waiting + the multi-module grain findings) and the director's direction for V2.
Survey: `out/fix_pier_waiting/` (`shots/`, `cuts/`, `cuts_page_*.jpg`; `r0/` = the state found at the start of this pass,
`r1/` = mid-pass), sync-point frames `out/fix_pier_waiting/sync/` + `sync_sheet.jpg`, probes `out/fix_pier_waiting/p*/`
(`probe.mjs`, `probe_cpu.mjs`, `run.sh`: one page, many `frame:flags` jobs; `key_value` flags feed `window.__PWO` overrides that the
set-ups read for tuning — never set in a normal render). A colleague's partial edits (commit a7b2a26) were continued and re-verified.

### Global
* **Grain:** the module grain quad / probe and the `grain: 0` override are gone; CT_MIG returns `grain: 0.044` through the post
  (`MIG_POST`, S076 included); nested `view_pier` gets none (engine).
* **Black frames (S039, all three survey frames):** a family member of the crowd stood 0.37 m from S039's lens. Nobody is placed
  within 0.95 m of the camera any more (and what they carry is skipped with them); crowd normals are renormalised (zero → +Y).
* **Crowd = mixed 1920s–30s civilians:** 12 variants (4 baked + 8 sculpted live at `lo`): women in 大襟 jackets / headscarves /
  print blouses and long skirts, a student in a pale long gown, a porter with a carrying pole and two baskets, an old man in a
  faded gown, children (some walking with their mothers, two standing by women in the queue), a bare-headed man in a pale shirt;
  bundles tied on the back, arm baskets, sacks on the shoulder, cases. No caps on civilians (in silhouette they read as uniforms);
  the only uniforms are the two officials at the gate posts (the third, on the quay, removed). Cloth vertex colours ≈ 1.2× lighter
  so the queue is not one block of black coats; a short-reach lamp over the queue in S036/S038 shows their clothes in colour.
* **Steamer:** unfogged dark hull + superstructure, one row of warm 2000 K portholes (the brightest, warmest points), a sparse lit
  row above; re-berthed at 150 m for S036/S038 so hull, portholes, superstructure, funnel and rigging all sit inside the end-door
  opening against the dusk sky.
* **Case:** two scales — on her lap (S020/S043/S032/view_pier, also the carried clone) ≈ 45 × 15.5 × 30 cm (cheat; at the bible's
  58 × 21 × 38 it read as a lectern), the full bible size in the top-down inserts S031/S033 so they register with S030's museum case.
  The upturned crate is darker (it read as a pedestal under the case).

### Per shot
* **S020 (major):** new shared S020/S043 rig: it opens ≈ 50° off her right-front, looking down ≈ 13°, so the case lies across her
  thighs with her knees and shins under it (floor-bounce fill), her bowed head is a dark crown + braid with the 2400 K lamp at her
  left as a rim (no frontal light, no fringe "blindfold" band: the face is in its own shadow), the open seaward floor behind; the
  push arcs square to the case and ends on the lid-edge/letter-crease line at y 0.66 (measured 0.663 → S021 ruler 0.673). Her right
  hand descends onto the letter with a relaxed, straight wrist from frame 0 (forearm visible; the 90° bent wrist and its plank-like
  stub are gone; elbow kept low at her side).
* **S043 (blocker):** opens on S020's end framing and pushes on to ≈ 1.4× while tilting down (face never in frame). Only the last half
  fold opens (keyframe), flipped by her right hand on 等沉默 (0–0.34 s): a 17 × 8 cm sheet (≈ 28 % of frame width) with the 4 × 3 cm
  grey-blue scrap of the shirt lying in it — a frayed, slightly pillowed cotton triangle, not a flat grey blade. Her fingertips lift its
  far corner ≈ 1 cm into the light on 听见 (1.305 s), hold to 1.55, lay it down; the left hand flips the flap back on its crease
  1.6–1.84 and lifts clear; the whole right palm presses on 141.8 (1.925 s). A weak paper bounce opens the shadow her body threw on
  the lid. End line measured at y 0.658 (S044 ruler 0.673).
* **S031 (direction S030→S031):** the folded shirt reads as a Chinese shirt: the mended stand collar in the darker cloth (#55667A)
  with a lighter mend and running stitches, a throat knot button, the neck opening showing the back panel in the body cloth (no dark
  hole), the centre-front opening with facings and four horizontal knotted-cord frog buttons (盘扣), shoulder seams. Same layout as
  S030 (collar left of centre near the top edge, opening down from it, last third at the right); the last third settles from 0.3 rad
  (it stood up like a board at the cut). *For museum_gallery:* S030's collar band / frog buttons should follow this layout
  (`shirtG` in `create()`, collar centre (−0.06, −0.07) in the block's frame).
* **S032 (blocker):** a lost profile. Camera ≈ 35° behind her left shoulder, 100 mm, head ≈ 35 % of frame height at (0.62, 0.38);
  frame 0 she looks toward the gate (back of the head, braid), on 乡音 she turns back over her left shoulder to screen left and the
  face appears only as a dark profile with a warm 2400 K edge on brow, nose and lips (key beyond her, upper left; no light from the
  lens side, environment 0.45, hemi 0.08). Background: the blue-hour town windows (×8), the families lit by their own lamps (short
  reach), three hurricane lanterns as bokeh, nine defocused travellers (bundle, basket, carrying pole, a child …) crossing left →
  right for the whole shot. The silent word is a small chin movement in silhouette plus a breath.
* **S033 (minor):** the comb bundle shows its spine / teeth through the cloth and ≈ 70 % of it stays in view; her fingertips press its
  near edge on 念; the key moved to her right so her lifting arm no longer shadows the shirt and collar; exposure 0.86 (keeps the cut
  from S032 within ≈ 1.3 stops).
* **S034 (minor):** forearms come in diagonally from the lower right, the floral sleeve hems 7.5 cm above the wrists; the packet is
  soft crumpled translucent paper (emission halved, shapes of the sweets inside, red string cross with knot and ends).
* **S036 (major crowd / minor steamer):** the mixed crowd and the 150 m steamer (above); the clasp in the foreground at (0.23, 0.62);
  the elder at the frame edge in the key's falloff, looking down at the hands (fill / environment / sky light lowered on her side).
* **S037 (minor):** the stamp lifts 2.06–2.36 s; the violet mark holds 0.58 s (14 frames) before the cut; the clerk's nails are plain
  (no white free edge); the bulb's reflection on the glass moved to the upper left, clear of his fingers.
* **S038 (major):** she really walks: from right by the railing (left elbow bent, clasp at chest height) ≈ 0.85 m toward the gate,
  the shoulder distance growing 0.59 → 1.11 m so both arms reach full extension on 一站 (128.23); the case swings with air under it
  (frame lowered); the camera tracks 0.8 m right, panned so the left gate leaf swings at the right edge (projected x 0.89 → 0.82
  from 126.19); the elder's face turned down to the hands, in shadow; the "orange stick" was her bare forearm reading as a prop —
  it now reads as the arm of a clasp; no orphan luggage near the lens.
* **S039 (minor, was black):** renders again (crowd fix); the floral sleeve reads as print (the coarse normal map that drew checks is
  gone); the elder's hand is darker and older (age 1.0, #AE7C5C); a stronger cool backlight from the gate.
* **S068 (major):** the handover at lap height: they sit 0.58 m apart, her elbow stays down at her side, her right hand travels low
  from the opened packet on her lap to his palm resting open on his bundle (≈ y 0.62–0.67) and leaves the piece there on 面; no arm
  above shoulder height; the boy smaller (0.84 × 0.9), cap brim low. No bounce into the faces any more: the lamp behind them gives
  rims, a lantern on the planks in front (off screen, short reach) models the hands, the sweet and his coat; both faces are dark 3/4
  shapes turned to each other; her smile is a head tilt across 千. Hair roughness 0.9 (no hot spot).
* **S076 (major):** blue-grey pre-dawn haze with only a thin cool-peach band at the right horizon (mean ≈ 30 % vs 45 % before, 28 %
  for S075); she is a profile silhouette in the mist with a dawn edge on brow, nose, lips and chin from far beyond-right (the key had
  been accidentally commented out mid-pass — restored); the camera-side fill only lifts the white rail, the shed's bulb environment no
  longer lights her face; left hand on the rail near her body.
* **view_pier:** lid bounce halved (her bowed face stays a soft dark shape in the G3c pane and corridor P3); checked in S024 / S066.

### Sync points (frames in `out/fix_pier_waiting/sync/`)
S020 1811 / 1829 / 1838 · S031 2648 / 2663 · S032 2686 / 2696 / 2739 · S033 2768 / 2791 · S034 2814 / 2830 · S036 2914 / 2944 ·
S037 2977 / 2990 / 3014 · S038 3029 / 3078 · S039 3129 / 3185 / 3191 / 3210 · S043 3365 / 3388 / 3403 · S068 5183 / 5198 / 5213 ·
S076 5654 / 5674 — all land on their events.

### Performance (1280 × 536, one page, 8 consecutive frames per shot after the first; the machine was shared, load 4–12)
| shot | wall s/frame | CPU-s/frame | | shot | wall s/frame | CPU-s/frame |
|---|---|---|---|---|---|---|
| S020 | 1.49 | 3.25 | | S036 | 1.39 | 3.62 |
| S031 | 1.30 | 3.38 | | S037 | 2.33 | 4.50 |
| S032 | 1.10 | 2.88 | | S038 | 2.50 (load 8) / 1.8 | 3.75 |
| S033 | 1.57 | 3.25 | | S039 | 1.49 | 2.38 |
| S034 | 1.64 | 4.25 | | S043 | 1.4–1.7 (load 4) / 2.9 (load 10) | ≈ 5 |
| S068 | 1.86 | 4.50 | | S076 | 0.98 | 1.88 |

All ≤ 2.5 s/frame wall except under the heaviest contention. S043 is the heaviest (the lid + both close hands fill the frame); its haze
cone is skipped once the push is close and the floor-bounce light is off (knees never in frame); the case maps use 2× anisotropy.

### Still weak / not done
* Faceless heads: the faces are now kept as dark shapes with edges (S020, S032, S068, S076) — readable emotion is carried by head
  turn, posture and hands; the elder's face at the left edge of S036/S038 is dim but not fully hidden.
* The crowd is still 'lo' sculpts with mitten hands and frozen walk phases; at the sharpest (S038's queue) it reads as travellers
  with bundles rather than distinct individuals.
* S034's forearms remain long bare shapes (3/4 sleeves are the MIGRANT costume lock everywhere); S039's two hands are close in tone.
* S030 (museum_gallery) and S031 now share layout but not every detail of the collar (each module draws its own block).
