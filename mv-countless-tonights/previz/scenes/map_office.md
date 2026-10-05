# map_office — the 1890s survey-office desk + the customs-hall threshold

Module `scenes/map_office.js`. Shots **S021** (CH1), **S044** (CH2), **S047** and **S048** (BR1). There are no named views.

> **Review pass (art director + DP, 2026-10-05):** the light, the map drawing, the pen grip, the moths, S044's push and
> S048's handle and staging changed after the notes below were written. Where they conflict with the **Review** section at
> the end of this file, the Review section is current.

Contact sheet (all shots at u = 0.5): `out/check/map_office/sheet.jpg`.

Other check renders:
- u 0.05/0.5/0.95: `out/check/map_office/final/` (and `final/sheet_all.jpg`)
- Sync-point frames: `out/check/map_office/sync/`
- Cut pairs with the neighbouring modules (S020|S021, S021|S022, S043|S044, S044|S045, S046|S047, S047|S048, S048|S049):
  `out/check/map_office/match/pairs.jpg`
- Motion clips: `out/check/map_office/perf_*.mp4`

## Sets

### Desk (S021, S044, S047)
Every desk shot is a 90° top-down with frame-up = −Z, so map-x is frame-right. The official sits at frame bottom: his right
hand is at frame right and his left hand at frame left.

- **PROP_MAP:** a 90 × 70 cm linen-backed sheet. Its 3600 × 2800 canvas (40 px/cm) is drawn from one deterministic vector list:
  - the coastline with waterlining, the sea left blank;
  - hachured hills (strokes start on contour lines and run downhill, weighted by slope) and a meandering river;
  - a dashed coast road and a double neatline;
  - the S021 harbour-village mark (blocks, a jetty and a harbour-light ring);
  - the S044 fishing village (4 rows of hatched house outlines, boats drawn up on a stippled beach);
  - no text of any kind.
  
  For S047 the same list is redrawn at 100 px/cm on a 24 × 14 cm patch with visible fibres. Fibre relief comes from a
  tiling 6.4 cm normal tile.
- **Coastline:** one spline with a hand wobble, the same coast as the chart. Here it runs top → bottom, so the cut to S022
  rests on the point (village mark → shore light), as the shot list notes.
- **Ruler:** ebony, 62 × 3.2 cm, with brass edges and a 15° polished bevel. The drawing edge is the −Z (frame-up) edge.
- **Ruling pen:** two steel blades, an adjusting screw and nut, a ferrule and an ebony handle, with an ink bead between the
  blades.
- **Brass corner weights** and an ink bottle sit on the desk.
- **Kerosene lamp:** a brass font and glass chimney at frame **upper right**, out of frame.
- **Wet iron-gall ink:** a procedural strip shader on MeshStandard. It has:
  - a growing end with a round cap and pooled bead at the nib;
  - an irregular, fibre-bleed edge and a darker rim (iron-gall);
  - meniscus and bead normals, so it glints in the lamp and moon (blue-black `#1E2230`, never red);
  - per-line widths: 2.4 / 2.2 / 2.0 mm (S021 / S044 / S047).
- **Hands:** MAPHAND close-up hands from `loadCharacterHand` (the white band cuff, the frock-coat cuff and the plain brass
  cufflink), plus my own tapered, creased frock-coat sleeve that runs to the elbow on each forearm bone.
  - **Placement** uses one generic solver: rotate the hand so two reference directions match, then translate a reference
    point onto its target.
  - **Pen hand:** the reference is the pen frame (nib point, pen axis, blade axis). The pen's roll in the fingers is solved
    once per set-up so the back of the hand is up.
  - **Left hand:** the reference is the middle fingertip while it holds the ruler, then the palm socket for the sweep and the
    press (interpolated, so there is no jump when the reference changes).
- **Light:**
  - **Lamp:** a 2200 K SpotLight (1024 shadow). It is at the upper right so the hands' shadows fall onto the ruler and the
    fresh line stays lit.
  - **Moon:** comes through tall, half-closed vertical louvre boards: a far SpotLight with a vertical-bar cookie (1024
    shadow). Vertical boards make stripes that run in the light's direction, so the stripes run upper-right → lower-left
    and come from the upper right, as the shot list asks.
  - **Fill:** a faint hemisphere light.
  - **Moths:** two or three circle the lamp. They are never in frame; their soft shadow is a projected multiply decal
    (flame ~2 cm, magnification ~2.3) that wanders over S021's upper right.
- **Grade (CT_MAP):** contrast 1.26, saturation 0.70, cool temp, grey-green shadow tint. S047 is greyer still (saturation
  0.6, BR1).
- **Grain:** an in-scene film-grain quad (harbor_eras recipe); the engine grain is 0 because of the grain bug logged in
  ISSUES.md.

### Threshold (S048) — its own group at x = 40 m
- **Threshold:** a granite sill (4.5 cm high, 37 cm deep) capped on its outer edge by an iron L-angle with a worn bright top
  edge and rivets. Granite flags lie on both sides.
- **Gateway:** a rendered wall with a 2.2 m opening, the quay outside and a deep blue-hour sky band.
- **Queue:** a `loadCrowd('migrant')` queue outside (plain Lambert, soft in DOF) that shuffles on.
- **MIGRANT:** `lod:'mid'`. She has the close-up right hand on her wrist (as in pier_waiting). She stands side-on on the sill
  facing +X (toes to frame right), with a small stance split so both shoes read.
- **PROP_CASE, new state:** honey rattan, buckled leather straps with bright buckles, and a fresh wrap on the handle. The
  handle matches restoration_lab's museum case exactly: bar Ø23 × 150 mm, leather tabs at ±68 mm.
  - It hangs from the grip socket.
  - The wrist sits 25 cm out from her centre line so the case clears her right thigh.
- **Light:**
  - a 2400 K enamel-shade bulb, keyed from above-front (1536 shadow);
  - a cool blue-hour directional from the doorway (rim);
  - a hemisphere light and a warm floor bounce.
- **Grade:** CT_MIG (saturation 0.72, creamy highs, not sepia), DOF f/4 follow focus.

## Per shot

### S021 — INSERT 50 mm top-down, locked + 3 % push (77.04–80.29 s)
**Implemented**
- **Frame:** 0.80 m wide at the paper. The map fills the frame.
- **Ruler:** the drawing edge is at **y 0.66**, spanning x 0.06–0.84. S020's lid and letter edge sits at the same height.
- **Pen:** sits on the paper at x 0.12 from frame 0. It travels with a monotone spline through
  0.2 s → x 0.12, 1.278 s → 0.30 and 2.9 s → 0.62.
  - **Measured at 78.32 "山河":** nib (0.300, 0.656), coast (0.298).
- **Left hand:**
  - It holds the ruler's left end.
  - It lifts at 1.98 s, sweeps up-right over the wet line in an arc, and spreads and presses on **79.64 "掌"**.
  - **Palm measured at (0.621, 0.449).**
- **End frame:** the harbour-village mark is uncovered at **(0.295, 0.581)**. S022's shore light is at (0.30, 0.58).
- **Moth shadow:** passes over the upper right.
- **Post:** no DOF ("全幅清晰").

**Deviations**
- **Left hand start:** it starts at the ruler's far-left end, not at (0.40, 0.76). With the official at frame bottom, the
  right hand starting at x 0.12 and the left hand at 0.40 would cross the forearms.
- **Pen lean:** the pen leans into the stroke and toward the body. The right fingertips ride on the ruler and the pen shaft
  reads as a dark diagonal at the nib. See ISSUES: the library `write` grip hides the nib from above.
- **Arm covers the line:** the left forearm crosses the line's right part at the end. This is physically unavoidable with
  the palm at (0.62, 0.45) and the pen at (0.64, 0.70).

**Timing:** 0.79 s/frame, measured with render.mjs --range 1870:1894 at load ≈ 5. The ratio estimate after the final
optimisation is ≈ 0.9–1.4 s idle.

### S044 — INSERT 75 mm top-down, closer, push 30 cm drifting up-frame (142.21–145.08 s)
**Implemented**
- **Push:** frame width 0.557 → 0.413 m (1.35×). The line moves from **y 0.66** at the start to ≈ 0.89 at the end.
- **Village:** centred at x 0.5, y ≈ 0.56 at the start, cut by the line through its **lowest row of houses** and a boat on
  the beach.
- **Pen:** lowers 0–0.3 s.
  - **Reaches the village's lowest row on 142.92 "山河"** (tl 0.712).
  - Lifts at 1.7 s and leaves to frame right.
- **Left hand:**
  - It holds the ruler left of the pen.
  - It rises over the wet line in an arc (never touching it) and spreads flat above it on **144.48 "掌"**.
  - **Palm measured at (0.450, 0.599).** The hand is about 43 % of frame height across the knuckles, which matches S045's
    first frame (the navigator's left hand at the same place and scale).
  - The heel stays ≥ 1.5 cm clear of the wet ink.
- **Post:** f/8, with focus easing from the paper to the back of the hand at the end.

**Deviations**
- **Left hand start:** it starts on the ruler left of the pen, not at the ruler's right end (0.82, 0.72). That would be a
  full forearm cross.
- **Push and line position:** the push is ≈ 30 cm, not 25 cm, and the line ends at y ≈ 0.89, not ~0.84. Both serve the
  S045 hand scale and the "heel clear of the wet ink" rule.

**Timing:** 1.21 s/frame (3440:3464, load ≈ 5). The ratio estimate is ≈ 1.2 s idle.

### S047 — MACRO 100 mm top-down, locked (151.63–152.83 s)
**Implemented**
- **Frame:** 18 cm wide, with the hachured south flank of the inland hill on the 100 px/cm patch.
- **Ruler:** the brass edge is a gold line just below **y 0.66**. The ebony body fills the lower third.
- **Nib:** **down at (0.30, 0.66) on 151.64**. One stroke runs to x 0.92, and the **nib lifts on 152.6** and leaves to frame
  right.
- **Ink:** bleeds a hair into the fibres, with a pooled bead at the nib and glints from the lamp and moon. A moon stripe
  crosses the frame diagonally.
- **Post:** f/8 at the paper.
- **Perf:** the full map under the patch is hidden here (2× overdraw saved).

**Deviations**
- **Hand in frame:** a soft out-of-focus fingertip and the steel blades show at the nib over the ruler, not "only the cuff
  and cufflink at the lower-left corner". The cuff is ≥ 13 cm from the nib, and the frame is 7.5 cm tall.

**Timing:** 1.70 s/frame before hiding the hidden map (3640:3664, load ≈ 5, max 2.9 s on a first-frame compile). The ratio
estimate after the fix is ≈ 0.9–1.2 s idle.

### S048 — CU 50 mm, threshold → pedestal rise → hand (152.83–155.25 s)
**Implemented**
- **Cut-in (MATCH CUT):** the iron strip sits at **y 0.66** (measured), held still 0–0.567 s (13.6 frames ≥ 12). The two
  black cloth shoes stand side-on behind it, toes to frame right, at ≈ (0.5, 0.55). Beyond are the soft queue legs and the
  blue doorway.
- **Rise:** on **153.4** an eased pedestal rise (+60 cm) with a dolly-in and tilt carries the camera past her trouser legs
  and the case face.
- **Hand framed:** it lands on **153.86 "一道"** on her RIGHT hand on the handle.
  - **Bar measured at y 0.659, x 0.279–0.721.** This is exactly S049's first frame, where the aged bar sits at the same
    place and size.
  - The blouse hem is soft at upper left.
- **Grip:** on **154.4 "关"** the grip tightens: rattan radius 12.4 → 9.4 mm, wrist flex, and the skin blanches toward pale.
- **Focus:** follows strip → shoes → hand (f/4).

**Deviations**
- **Staging:** side-on per the director ruling. A horizontal threshold line with her facing frame right means she stands
  *along* the gate sill, waiting at the line. This is staged as a waiting queue at the gate line.
- **Camera move:** the "~60 cm pedestal rise" also needs a ≈ 30 cm dolly-in to reach the CU scale the S049 match requires.
- **Knuckle whitening:** it is a whole-hand blanch plus a tighter curl. There is no per-knuckle mask (the skin shader is
  library code).

**Timing:** 0.71 s/frame for the low part and 1.21 s/frame for the hand CU (3670:3694 / 3700:3724, load ≈ 5). The ratio
estimate is ≈ 1.15–1.57 s idle with MIGRANT at mid LOD.

## Frame-time summary (1280 × 536)

| shot | render.mjs --range, load ≈ 5 | ratio estimate, idle |
|---|---|---|
| S021 | 0.79 s | 0.9–1.4 s |
| S044 | 1.21 s | ≈ 1.2 s |
| S047 | 1.70 s (before fix) | 0.9–1.2 s |
| S048 | 0.71 / 1.21 s | 1.15–1.57 s |

All shots are within the 2.5 s worst case. S048's hand CU is at the 1.5 s typical target. A second run at load 10–12
inflated everything to 1.15–1.93 s.

Scene build is ≈ 15–17 s: the map canvas and hachure field, the patch and fibre tile, the cached hands and figure.

## Known weaknesses
- **Hands:** the close-up library hands read as mannequin hands (smooth, rather orange under 2200/2400 K, slightly mitten-like
  around the bar). The pen grip from above is a compromise (see ISSUES.md).
- **Hachures:** at S021/S044 distance they read as banded rows (contour-start strokes). At macro they read well but form
  arcs near the hill.
- **Ruled line at S021:** at 0.8 m frame width the line is ~4 px next to the black ruler. It reads, but only just; the wet
  glints help.
- **Left-hand sweeps:** S021 and S044 are fast (≈ 45 cm in 0.6 s, as the timings require). The S021 forearm and sleeve cover
  the right end of the fresh line at the end.
- **S048 lighting:** the warm bulb and blue doorway are a warm/cool split. It is kept soft and desaturated, but sits near
  the teal-orange the bible warns against.
- **S048 staging:** the shoes and trouser hems are figure-library geometry. The white layered soles barely read on the near
  shoe. Her geography (standing *along* the sill) is a poetic, not literal, gate.
- **Moth shadow:** a soft multiply decal, not a real shadow. It also darkens the moon stripe it crosses.

## Debug probes
These are URL query parameters; they are inert in production.
- `mopts=1` prints the registration measurements (nib, coast, mark, palm, strip, bar ends).
- `mcam=x,z,h,mm` (top-down) or `mcam=x,z,y,mm,tx,ty,tz` sets a debug camera.
- `inkdbg=1` draws the ink red and 4× wide.
- `mothdbg=1` prints and solidifies the moth shadow.
- `moff=dof,hand,lshadow,mshadow,patch,ink` switches features off for perf probes.
- `mdump=1` with `out/check/map_office/mo_dump.mjs` dumps the map canvases.

Debug renderer: `out/check/map_office/mo_render.mjs --frames … [--q …]`.

## Review — art director + DP pass (2026-10-05)

I re-rendered every shot at u 0.05 / 0.5 / 0.95 and every sync-point frame, rendered the adjoining frames of all six
neighbours (S020, S022, S043, S045, S046, S049) fresh from their current modules, rendered 6 consecutive frames in S021 and
S048, and read the code. Review renders are in `out/check/map_office/rv1` (the state I found) and `rv2`–`rv6` (iterations).
The final stills are in `final/`, the sync frames in `sync/`, the cut pairs in `match/pairs.jpg`, the contact sheet in
`sheet.jpg`, and the motion and perf clips in `perf_*.mp4`.

### What I found

| area | problem (state found, `rv1`) |
|---|---|
| Light (S021/S044/S047) | The 2200 K lamp was the key and flooded the paper amber/orange. The moon stripes were weak, the grade read as a warm sepia insert rather than CT_MAP's "hardest, coldest" look, and the hands were orange. |
| Map drawing | The hachures were contour-start rows: at S021/S044 they read as banded rings ("doughnut" hills); in the S047 macro they merged into fur. The river ran against its own valley. |
| Pen (S021/S044) | The library `write` grip + `pen` socket put the pen through the midpoint of thumb and index pads, which sit ≈ 6 cm apart. The pen floated in the gap, and from above the index finger covered the nib, so no steel showed. |
| Ruler | Read as a dead black slab, with the brass edges sunk below its top. |
| Ink | In the S047 macro the line read as a glossy black rod: uniform edge, periodic bead glints, no fibre bleed. Cause: the bleed noise was sampled at ~1 texel per 0.1 mm, and the spike threshold sat above the noise texture's actual range (its channels sit at 0.5 ± 0.12). |
| Left press (S021/S044) | The thumb lay closed along the index, so four fingers showed, not "五指张开". |
| Moths | The multiply decal was too faint to see. When forced visible, it also darkened the moon stripes. |
| S044 | The end hand (S045's A-frame) was cropped at the fingertips, and the push was 1.35×. |
| S048 handle | It read as a varnished wooden dowel on two wooden blocks: bands ran along the bar, not round it, and the tabs were blocks. It looked nothing like a rattan-wrapped handle, nor like S049's aged one. The straps and buckles were hidden below frame. |
| S048 shoes | The extra leg and foot channels de-registered the library sole from the upper, leaving a grey blade under the far shoe. Side-on, the far shoe was hidden behind the near one. |
| S048 focus | Focus sat on the bar behind the knuckles, so the hand (the subject of 指节发白) was soft at f/4. |
| Perf | S048 hand CU 1.59 s at load 3.4, max 2.3 s. Everything else was within budget. |

### What I changed (all in `scenes/map_office.js`)

**Desk light and grade (CT_MAP).**
- The moon is now the key. It comes through the louvres as a soft-edged pool of stripes on the action (spot angle 0.09, penumbra 0.8). The stripe period is ≈ 4 cm (the shot list's "about 4 cm apart"), with a 2.5 px cookie blur, so the edges stay hard.
- The kerosene lamp moved to frame right, low and raking: (0.62, TY + 0.27, −0.28). It now runs at 0.15 instead of 1.15, with a narrower cone (0.95 rad, penumbra 0.85). It warms the upper right and the hands' lamp-side flanks but no longer floods the sheet.
- The fill is a cold grey-green hemisphere light (#56666a / #2a2a24, 0.85), standing in for the moonlit lime-wash walls.
- Grade: exposure 1.7, temp −0.2 (S047 −0.28), saturation 0.7 (S047 0.6), contrast 1.26.
- Result: silver stripes on cool paper, warmth kept to the lamp side, hands no longer orange. Measured on the final S021 frame: gaps ≈ 53 and stripes ≈ 190 / 255 (p5/p95 down a column), a hard look in the spirit of the bible's 10:1 (display-referred, after ACES).

**Map drawing.**
- New terrain: a coastal escarpment, peaks, and a sharpened ridged-noise network of spurs and ravines running down to the coast. The plain widens behind both villages, and a river valley follows the drawn river.
- New hachures (`hach2`): jittered fall-line pen dashes on a 1 mm stratified grid (≈ 266 k strokes), tapered from the uphill end. Width, alpha and density are mapped to the slope distribution (p15/p30/p95, computed once), so steep ground is dark and crests and plain stay white, as in a Lehmann-style relief. They are drawn in a lighter brown than the coastline.
- At macro (S047), every other dash is dropped at 80 % alpha, so single strokes read on the fibres.
- Waterlining is stronger (five lines). There is still no text anywhere. The registrations are unchanged: coast x 0.30 on the S021 line, village mark (0.295, 0.581).

**Ruling-pen grip.**
- A module-side `socket_rulingpen` on the wrist: the shaft runs from just beyond the index pad (pad on the shaft) back into the thumb web.
- The thumb channels are solved once so the thumb pad meets the shaft 1.5 cm behind the index pad. The middle finger sits under the shaft, and the ring and little fingers tuck.
- The pen is held 4.8 cm up the shaft (was 7.2), and the steel is brushed (metalness 0.55).
- Result: from above, the two steel blades and nut read at the nib, beyond the index fingertip, in S021, S044 and S047.

**Ruler.** The ebony has a visible figure (brown streaks and pores on #4a3e35 under a white material colour), so stripes and lamp read across it. The brass edges are flush with the top and slightly polished.

**Ink.**
- Fibre bleed: worley noise at ≈ 1 mm cells, plus elongated fibre runs at ≈ 0.25 mm with the threshold set to the noise texture's real range. At macro the edge now feathers into the paper.
- The wet surface is a shallow dome (bump 0.4). Irregular pooling glints along the line replace the periodic beads.
- Program cache key: `inkStrip6`.

**Left press.** The thumb is now spread with `cmcFlex` −0.55, which is how the library spreads a thumb (cf. `flat_on_glass`); `cmcAdd` only rotates it under the index. All five fingers are spread on 掌 in S021 and S044.

**Moths.**
- The shadows are now real lamp shadows. A 256² per-frame cookie on the kerosene spot (`lampL.map`) projects two moths through the spot's own frustum, so they only remove lamp light and never touch the moon stripes.
- The moths sit ≈ 30 % of the way from the flame, giving ×3.3 magnification and a penumbra of ≈ half the shadow width. The result is large, soft, cool patches drifting over S021's upper right. They are subtle, as specified ("moths only as soft passing shadows").
- Cost is within noise (interleaved A/B). Debug: `mothdbg=1`; switch off with `moff=moth`.

**S044.**
- The frame is 0.64 → 0.52 m wide (a 1.23× push; was 0.557 → 0.413).
- The end hand fits whole: palm at **(0.450, 0.600)** (measured), all five fingertips inside the frame, about 45 % of frame height. The ruler is at the bottom edge, and the fresh line is visible under the heel without being touched.
- The nib reaches the village's lowest row on 142.92, as before.

**S048.**
- **Handle:**
  - Two taut leather loops at ±68 mm (the museum case's tab positions) rise from brass foot plates, with brass rivets, and wrap over the bar.
  - The cane bar (Ø23 × 150 mm) has a helical honey rattan wrap of ≈ 36 turns.
  - The straps moved to ±13.5 cm, buckled just below the top edge, with keepers.
  - The new handle reads as new rattan and leather, and as the same object as S049's aged one.
- **Bar registration:** **y 0.659, x 0.279–0.721** (measured) against S049's bar at y ≈ 0.66, x 0.28–0.72.
- **Staging:**
  - She stays side-on, per the ruling, but turned 17° toward the gate opening. The far shoe now steps out from behind the near one, and both black cloth shoes with their pale soles read.
  - The extra leg channels are dropped, so the soles stay registered.
  - Her left forearm lies across her waist, out of the hand CU.
- **Focus** ends between the knuckle row and the bar, at f/5.6, so the clenched hand is the sharp subject.
- **Grip on 关 (154.4):** the rattan radius goes 12.4 → 9 mm, wrist flex 0.14, and the blanch is stronger (0.72 toward #f2e4dc).
- **Bulb:** creamier (#ffdcb6), with a warm floor bounce of 0.42.
- **Perf:** the head and hair layers are hidden (never in frame) and the bulb shadow map is 1024.

### Registrations (measured with `mopts=1`, final)

| shot | measured | target |
|---|---|---|
| S021 78.32 山河 | nib (0.300, 0.652), coast 0.298 | nib crosses the coast at x 0.30 |
| S021 79.64 掌 | palm (0.621, 0.449) | (0.62, 0.45) |
| S021 end | village mark (0.295, 0.581), uncovered | S022 shore light (0.30, 0.58) |
| S044 end | palm (0.450, 0.600) | S045 register (0.45, 0.60) |
| S047 | nib down (0.30, 0.66) at f3639, up at f3662 | 151.64 / 152.6 |
| S048 start | iron strip y 0.660, held 0–0.567 s | y 0.66, ≥ 12 frames |
| S048 end | bar y 0.659, x 0.279–0.721 | S049 bar y 0.66, x 0.28–0.72 |

### Cut pairs (`match/pairs.jpg`, neighbours rendered from their current modules)

| cut | result |
|---|---|
| S020→S021 | Horizontal line at the same height, read left → right. |
| S021→S022 | The village mark sits where S022's shore light is. |
| S043→S044 | Line match, as in CH1. |
| S044→S045 | My palm is on the register. **S045 (sea_deck, not edited) frames the navigator's left hand ≈ 0.15 frame-width right of (0.45, 0.60) on its first frame. That is for its owner to check.** |
| S046→S047 | The E4 threshold line becomes the ink line at y 0.66. |
| S047→S048 | Ink line → iron strip at y 0.66. |
| S048→S049 | New handle → aged handle, same bar position and size. |

### Continuity and artefacts
- Cuff and cufflink: the plain starched band cuff and charcoal sleeve are unchanged. There is no ring and no text. The ink is blue-black (#1E2230), never red.
- She holds the case in her RIGHT hand; the case is new (bright buckles, unworn wrap) and the sill is granite with an iron edge.
- Six consecutive frames show no flicker. S021 f1890–1895 (final module, moths moving): mean luminance 78.1–79.1 / 255, frame-to-frame steps ≤ 0.5 from the pen, hand and moth motion. S048 f3700–3705: steps ≤ 0.2 (`consec/`, `rv6/consec.jpg`).
- No NaNs, no black frames, no render errors in any log.

### Performance (1280×536, `render.mjs --range` over 23 frames, mean after the first)

| shot / range | idle-ish (load ≈ 3.4) | loaded (load 7.7–9.2) | max single frame |
|---|---|---|---|
| S021 1870:1894 | 0.48 s | 1.20 s | 1.80 s |
| S044 3440:3464 | 0.78 s | 0.77 s | 1.05 s |
| S047 3640:3664 | 1.01 s | 0.93 s | 1.31 s |
| S048 low 3670:3694 | 0.79 s* | 1.01 s | 1.50 s |
| S048 hand CU 3700:3724 | 0.97 s* | 1.41 s | 1.65 s |

\* After the S048 optimisation, at load ≈ 7. All shots are within the 1.5 s typical target even under load, and no frame
exceeds the 2.5 s worst case. Scene build is ≈ 16–19 s (map canvas with ≈ 266 k hachures, the macro patch, fibres, the
cached hands and figure).

### Still weak (honest list)
- **Hands:** the library close-up hands are still a little smooth and mannequin-like at S048's CU. The MIGRANT blanch is a whole-hand tint (no per-knuckle mask in the library skin shader).
- **S047 hand:** S047 shows the pen's steel blades at the lower right over the ruler, not the spec's "cuff and cufflink at the lower-left corner". A right hand drawing left → right sits lower right of the nib, and the cuff is ≥ 13 cm away in a 7.5 cm-tall frame. This is kept as a documented deviation.
- **S021 end:** the left forearm still crosses the right end of the fresh line. Physics: palm at (0.62, 0.45) with the pen at (0.64, 0.70).
- **Sweeps:** the left-hand sweeps in S021 and S044 stay fast (≈ 45 cm in 0.6 s), as the sync points require.
- **S048 staging:** side-on along the sill is still the poetic, not literal, gate.
- **Ink sheen:** the ink sheen at S021 distance is small (the line is ≈ 4 px wide). It reads as a dark wet line with a few glints.

### Debug probes added
URL knobs, all inert by default:
- `mlamp` (lamp intensity), `mlx` (lamp x), `mhemi` (fill), `mexp` / `mtemp` / `msat` / `mst` (CT_MAP grade), `mpen` (moon pool penumbra)
- `moff=lamp,moon,nrm,moth` (in addition to the existing switches)
