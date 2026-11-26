# HYALO G1 — hardware notes (Helper A)

## What exists

    build_gate.py        one command -> gate.blend + manifest.json   (about 5 s)
    gg_mesh.py           the procedural mesh toolkit (loops, prisms with holes/pockets/bevels, lathe, sweeps, involute gears, screws)
    parts_base.py        wave 1   base rail, 4 anchor bolts, 4 levelling feet
    parts_drive.py       wave 2   motor, brake, planetary gearbox, shaft, spring, encoder, cage
    parts_elec.py        wave 3   controller PCB, PSU, 2 IR sensor strips, 4 cables
    parts_glass.py       all GLASS_BODY / GLASS_WING solids (column, sleeve, posts, panels, lid, leaf)
    parts_rail.py        wave 5   spine, LED strips, RFID, QR, LCD, speaker, harness, screws, camera pod, badge
    parts_wing.py        wave 6   clamps, edge LED bar, display layer, sleeve hubs
    validate.py          glass validity + clearance checks -> validation.json
    render_previews.py   test stills -> preview/*.png
    gate.blend, manifest.json, validation.json, preview/

Rebuild:  `/opt/blender-env/venv/bin/python hardware/build_gate.py`
Check:    `/opt/blender-env/venv/bin/python hardware/validate.py [--all-pairs]`
Previews: `/opt/blender-env/venv/bin/python hardware/render_previews.py clay exploded gearbox reader_top glass ...`

Everything is modelled in pedestal-local millimetres with **+x = lane side**. The L pedestal is built as modelled,
the R pedestal is the mirror image (mesh data mirrored, normals recalculated; object scale is always 1, rotation 0).

## Layout decisions (all inside the spec envelope)

- z stack: feet 0–4, base rail 4–30, glass posts/column 30.5–933, LED seam 934–940, spine plate 933.4–936.4, glass lid 940.3–1000,
  camera pod on top of the lid up to z = 1.028.
- The side infill panels sit on the **outer** side of the pedestal (local x −60…−50), like the photos, so the wing can swing 90° towards +Y
  through the open lane side without touching anything. Checked: leaf, clamps and edge-LED sweep only through free space.
- Column: fixed lower glass tube (z 30.5–400) with the drive inside; rotating upper glass sleeve (403–920) carried by two aluminium hubs on the shaft;
  LED ring + top bearing (921.6–932.4) under the spine.
- Drive stack, bottom to top: motor flange, rear bell with cable gland, copper end windings in the gap, finned can with nameplate, front bell,
  brake (magnet body with copper coil, armature, friction disc, end plate), gearbox base plate on three legs, ring gear, planets/sun (20 mm face,
  9 mm proud of the ring so they show from the side), 3-arm carrier, output shaft with two keyways, torsion spring, encoder disc + read head,
  bearing plate hanging on three tie rods (the "cage").
- Gears: module 1.5, 20° involute, sun 18 / planets 18 / ring 54, centre distance 27 mm, 0.08 mm backlash, positioned in mesh (no triangle intersections).
  **The ring gear is steel, sun and planets are brass** (contrast reads better through glass than brass on brass); pins and carrier steel.
- Rotation is done with two pivot Empties per side on the column axis: `DRV_out_<s>` (children: carrier plate, 3 planets, output shaft, encoder disc)
  and `WING_<s>` (children: sleeve, hubs, clamps, edge LED, leaf → display). The pivots stay at rest during the build, so a child's `location`
  offset equals a world offset. This replaces "planets children of the carrier": planets and carrier are siblings under the pivot, so each can
  fly in on its own. Keys for motion (a = output angle about +Z): `DRV_out.rz = a`, `WING.rz = a`, `DRV_sun.rz = 4a`, each `DRV_planet_i.rz = −3a` (local).
  Wing open: **a = +90° for L, −90° for R**. Motor shaft and brake are rotationally plain, so they need no keys. The torsion spring is static.
- Entry post (−Y): controller PCB on a two-rail frame, component side to the lane. Exit post (+Y): PSU with perforated cover, finned back, terminal block, label.
  Sensor strips and LED accent bars stand on the base against the lane-side wall of each post (accent bars are lowered into the posts in wave 5).
- Reader end (−Y), all under the glass lid: RFID board on brass standoffs (copper spiral + white card-tap icon as silkscreen), QR funnel with lens and camera
  board, LCD module (bezel, SCREEN_LCD slab, back plate, driver PCB, FPC ribbon), speaker, a small harness to a grommet in the spine.
  The camera pod sits **on top of** the glass lid (so it is placed after the lid), tilted 25° towards the user.
- Lid screws: 6 countersunk socket screws through real countersunk holes in the glass lid into aluminium pillars on the spine.
- LED: flexible strip round the spine edge in the seam between posts and lid, about 520 SMD chips per pedestal (5.6 mm pitch, 4.2 mm emitting window); the emitting window of each chip is LED_STRIP.
  No diffuser: the chips read as a line from a distance and as LEDs in macro. Column ring (64 chips), post accent bars (LED_STRIP capsule) and a wing
  edge-light bar between the clamps (shines into the leaf's hinge edge) complete the set. `wave_u`: rail 0.02→0.88 along +Y, entry accent 0.03–0.06,
  column ring 0.47, exit accent 0.89–0.92, wing edge 0.92→1.0 (bottom to top).
- UVs: SCREEN_LCD (v towards +Y, u to the user's right), SCREEN_WING (u right / v up seen from the entry side), BADGE, PCB_GREEN boards (0..1 planar).
  On the mirrored side u is flipped so textures still read the right way round.

## Numbers (current build)

- 126 mesh objects + 4 pivot Empties, collections `GATE_L` / `GATE_R`, 27 materials (contract names only, none added).
- 124 manifest parts (62 per side; `WING_display_<s>` is listed as a child of `WING_leaf_<s>`).
- **844,296 triangles** (budget 1.5 M). Biggest: motor 2 x 58 k, PCB 2 x 60 k, rail LED strip 2 x 50 k.
- Bounding box X +-0.45, Y +-0.70, Z 0...1.028.
- Build time about 4 s; validate 4 s; motion check 20 s.

## Animation helpers in the manifest

- `parts[]`: wave, order, kind, insert_dir (world; mirrored for R), screw flag, children, parent (pivot or parent object), origin, bbox, triangles.
- `gear`, `pivots`, `wing_open_angle_deg`: see above.
- `wave_u` (LED_STRIP meshes) and `grow_t` (cables: 0..1 along the run, so a cable can be "laid" along its path instead of dropped in -
  the two power cables and the motor signal cable run under the column in the base channel, so a straight drop in wave 3 would pass through the column).
- `check_motion.py` rotates output/sun/planets/wing through 0-90 deg in 11 steps on both sides: no gear tooth ever intersects another gear or the ring,
  and the wing assembly touches nothing. The only overlaps reported are the two intended ones (motor shaft inside the sun gear).
- Assembly order sanity: every part can physically arrive along its insert_dir in its wave/order, except the cables noted above. The spring carries its own
  retaining collar and the encoder disc carries the feather key, so both slide down the shaft cleanly.

## Glass rules, how they are met

- 8 glass objects per pedestal (column, sleeve, 2 posts, 2 panels, lid, leaf), each ONE closed manifold shell, only GLASS_* material.
- Build-time: every shell gets normals recalculated and then checked by signed volume; non-manifold edges are counted (0).
- `validate.py`: manifold / boundary / inverted shells, triangle-triangle intersection of each glass object against every neighbour (0),
  minimum air gap vertex↔surface both ways (worst 0.35 mm, lid ↔ badge), wall thickness by inward rays.
- Shading: smooth with sharp edges > 35°, then weighted normals (face area, weight 100) baked as custom normals. Caps that have to be triangulated
  (lid top and ceiling, post rims) get a 0.5–0.6 mm support loop, so the big flats keep their exact normal (measured 0.00° deviation on the lid top).
- Bevels: lid top edge 7 mm in 7 segments, other glass edges 1.5–3 mm in 2–3 segments. Flutes: 18 concave flutes on each post's curved face, 1.7 mm deep,
  16 points per flute (wall 6.3–8 mm there).

## Imperfect / unfinished (honest list)

- Small GLASS_LENS elements (QR lens, 2 pod lenses, 48 IR sensor domes) are sunk 0.2 mm into their opaque mounts instead of keeping an air gap; the pod's front
  window does keep 0.3 mm. They live in mixed-material objects.
- Opaque parts overlap on purpose where real parts would be pressed together or plugged in (motor shaft inside the sun gear, key inside the encoder hub,
  cable ends inside connectors, brake leads into the motor bell). `validate.py --all-pairs` lists them. Nothing overlaps glass.
- The camera pod has no visible cable (it sits on the glass). The harness cable up the entry post ends in a grommet under the spine.
- The torsion spring (and the plain collar above it) does not wind or turn when the shaft turns. The leg rests against a stop collar on a tie rod.
- Screw threads are ridged (lathe), not helical. Knurling, engraving and PCB traces are left to the look helper's shaders.
- The card-tap hand icon is stylised (finger, palm, thumb as rounded bars).
- PCB_GREEN boards other than the controller, RFID, QR and LCD driver have no UV map.
- No bevel on the tiniest SMD parts (0603 passives, IC pins, LED pads): they are plain boxes.
- Feet are assembled first (wave 1, order 0) and the base is lowered onto their studs; anchors follow.
