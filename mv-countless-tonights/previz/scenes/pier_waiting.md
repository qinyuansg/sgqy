# pier_waiting — LOC_PIER (1920s–30s waiting shed & quay, CT_MIG) + the steamer rail at dawn

Module: `previz/scenes/pier_waiting.js` · shots **S020 S031 S032 S033 S034 S036 S037 S038 S039 S043 S068 S076** · named view
**`view_pier`** (G3c pane in S024, corridor pane P3 in S066). Checks: `out/check/pier_waiting/` (`sheet.jpg` = all shots at u = 0.5,
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
  noenv nopools noglow noshadowmap info mark`), overview cameras DBG_A–E via `out/check/pier_waiting/dbg_shots.json`.

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

### S068 · CH3 215.67–217.71 · MS 50 mm locked · she gives the boy a piece of the sweet (left → right, T21)
* The bench under lamp 5 facing home (camera +X): she at screen-left, the TRAVELLER at screen-right (oversized coat, bundle hugged,
  ticket in his left fingers); the opened oil-paper parcel glows in her lap; her right hand (already moving at the cut) sets the
  piece in his palm on 面 (215.94 → 0.27 s), he hesitates and closes his fingers 0.3–0.7, her head tilt/nod ("smile") across 千
  (216.6), his head lifts/turns toward her at 1.5 s (半边脸松开); crowd soft behind toward the gate; warm bounce from the planks.
* Weakness: faceless heads cannot show the smile or the "half smile" — they are carried by head tilts only; faces read as masks.

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
