# Helper A — hardware

You build **every part** of the HYALO G1 glass speed gate, from scratch, in Python (bmesh / mesh ops), with
real thicknesses and real bevels. Read `../shared/SPEC.md` first, then look at all six reference photos.

The video is a build video shot in macro. Parts are seen very close, through glass. Flat boxes and
zero-thickness sheets will be noticed. The glass must be a real solid so it refracts properly.

## Deliver

- `hardware/build_gate.py` (helper modules in `hardware/` welcome). One command builds everything in the
  **assembled** pose and writes `hardware/gate.blend` and `hardware/manifest.json`. Should run in about 2 minutes or less.
- `hardware/preview/` — test stills you rendered and checked yourself (clay overview, exploded view, gearbox macro,
  reader-end macro, and one with a plain Glass BSDF on the glass parts to prove the refraction is clean: no black faces, no inverted normals).
- `hardware/NOTES.md` — what you built, decisions, triangle count, anything imperfect.

## The gate (per pedestal; L and R are mirror images)

Use the envelope in the spec. You may adjust inner dimensions sensibly; keep the bounding box, the column axis and the wing geometry.

Wave 1 — base
- Base rail: machined aluminium plinth, full stadium footprint, ~30 mm high, chamfered, cable channel, 4 counterbored anchor holes.
- 4 anchor bolts (hex socket cap screws with washers), 4 small levelling feet.

Wave 2 — drive unit in the centre column (**the macro hero part: make it beautiful**)
- Servo motor: finned aluminium can Ø≈80 mm, end bell, visible copper windings through slots, cable gland.
- Electromagnetic brake disc with friction ring.
- Planetary gearbox, open-topped so the gears show: internal ring gear, 3 planet gears on a carrier, sun gear,
  real tooth profiles (involute-ish, chamfered), bearings, carrier plate with 3 pins. Brass gears, steel pins.
  Tooth counts must mesh (e.g. sun 18, planets 18, ring 54) and the gears must be positioned in mesh.
- Output shaft (polished steel, keyway), torsion return spring coiled round it, encoder disc with slots + small read-head PCB.
- Lower column tube: glass, Ø120, wall 8 mm, houses motor + gearbox (z ≈ 0.03…0.40).
- Upper sleeve: glass tube round the shaft up to the rail (z ≈ 0.40…0.92), rotates with the wing.

Wave 3 — electronics (inside the end posts)
- Power supply (exit-end post): perforated/finned metal box, terminal block with screws, label area.
- Main controller PCB (entry-end post, standing vertical, visible from the lane and from outside): substrate with real thickness,
  a big chip with heat sink, several ICs with pin rows, electrolytic caps, connectors, relay blocks, status LEDs, mounting standoffs. UV 0..1 on the board faces.
- 2 IR sensor strips per pedestal (thin vertical PCB bars with a row of emitter domes, lane side of each end post).
- Wiring harness: 3–4 curved cable runs (tube meshes) from PSU/PCB along the base to the column and up to the rail, with connectors at the ends.

Wave 4 — glass body
- 2 end posts: hollow glass shells, half-stadium outer profile, **vertically fluted** on the curved face like the photos, wall ≈ 8 mm, polished chamfers.
- 2 side infill panels: 10 mm glass sheets between posts and column, polished bevelled edges, small steel clips at the bottom.

Wave 5 — top rail (reader end is at −Y)
- Rail spine/tray: slim aluminium carrier, full length, that everything in the rail sits on.
- LED strip: flexible PCB running round the rail perimeter with individual SMD LED chips (material LED_STRIP on the chips or on a
  diffuser line — your call, but the lit surface needs the `wave_u` attribute). Plus the LED ring at the top of the column and one slim accent bar low on each end post.
- RFID antenna: flat copper spiral coil on a small PCB, under the card-tap icon (model the icon as a thin PRINT_WHITE decal like the photo: brackets, card, hand/waves, stylised).
- QR scanner module: white recessed funnel window with a lens at the bottom, small PCB behind.
- LCD module: portrait display ≈ 90×160 mm with bezel, SCREEN_LCD face with UV 0..1, driver PCB + ribbon cable.
- Face camera pod: the small raised bar on top of the rail, tilted toward the user: 2 lenses (real lens rings + GLASS_LENS elements), 2 columns of 3 IR LEDs (LED_IR), glass front window.
- Small speaker.
- Glass lid/shell of the rail: stadium outline, ≈ 60 mm high body with 8 mm walls and a generous polished bevel, closes the rail.
- 6 lid screws (polished, countersunk or cap head) + the HYALO badge plate (thin steel plate, BADGE material, UV 0..1) on the lane-side face near the entry end.

Wave 6 — wings
- 2 polished steel clamp brackets on the upper sleeve holding each wing (with small screws).
- Wing leaf: 12 mm glass, rounded corners, polished bevel all round. Inside it (or on its rear face with a 0.3 mm gap): a thin
  SCREEN_WING display layer ≈ 200×360 mm with UV 0..1, as a child of the wing.
- Root objects `WING_L`, `WING_R` with their origin **on the column axis**; clamps, upper sleeve and display layer are children, so that
  rotating the root about Z opens the wing. Tell me the sign of the opening angle for each side.

## Rules

- Glass parts: closed manifold solids, outward normals, wall 8–12 mm, chamfer/bevel 1.5–3 mm with ≥ 2 segments. No coplanar or
  intersecting faces between different parts: keep ≥ 0.3 mm air gap between glass and glass, and between glass and anything inside it.
  Nothing may poke through glass.
- Every metal/plastic part gets a small bevel too (0.3–1 mm). No razor-sharp CG edges. Smooth shading with sensible sharp edges.
- Each **animatable part is one root object** (join details into it, or parent them as children). Origin at a sensible pivot
  (centre of the part; axis for anything that turns). Scale 1, no negative scale (mirror the mesh, then fix normals). Apply modifiers before saving.
- Gears must be able to turn: sun, each planet, carrier/output shaft as separate objects with origins on their axes
  (planets children of the carrier). Give the ratio in the manifest.
- Assign materials only by the contract names in the spec (placeholder materials with distinct viewport colours).
- Budget: ≤ 1.5 M triangles for the whole gate. Spend them where the camera will be: gearbox, reader end, PCB, glass bevels, flutes.
- Use collections `GATE_L`, `GATE_R`.

## manifest.json

```json
{
 "units": "m",
 "wing_open_angle_deg": {"WING_L": 90, "WING_R": -90},
 "gear": {"sun": ["DRV_sun_L", "DRV_sun_R"], "carrier": [...], "planets": [...], "ratio": 4.0, "teeth": {"sun": 18, "planet": 18, "ring": 54}},
 "materials": ["GLASS_BODY", ...],
 "triangles": 0,
 "parts": [
  {"name": "BASE_rail_L", "side": "L", "wave": 1, "order": 0,
   "kind": "metal_heavy",          // metal_heavy | metal_small | glass | pcb | screw | gear | spring | cable | plastic | wing | led
   "insert_dir": [0, 0, 1],        // unit vector the part arrives FROM (screws: along their axis, head side)
   "screw": false,
   "children": [],
   "bbox_min": [x, y, z], "bbox_max": [x, y, z]}
 ]
}
```

`parts` lists only the animatable root objects, in the order they would really be assembled (wave, then order).
`order` may repeat for things that go in together.
