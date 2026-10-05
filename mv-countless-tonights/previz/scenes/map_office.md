# map_office — the 1890s survey-office desk + the customs-hall threshold

Module `scenes/map_office.js`. Shots **S021** (CH1), **S044** (CH2), **S047** and **S048** (BR1). There are no named views.

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
