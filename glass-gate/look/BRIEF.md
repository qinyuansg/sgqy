# Helper B — look

You own the materials, the studio and its background tests, the rim lighting and the **alive moment**
(the light wave that travels through the whole gate — the payoff of the video). Read `../shared/SPEC.md` first and
look at the reference photos (LED line colours, the glow ring on the column, the reader screens).

The one thing that must never happen: glass that reads as grey plastic. It has to look like thick, heavy, expensive
crystal: bright polished bevels, real refraction of the parts behind it, clean reflections of the lights, a faint blue-violet
tint where the glass is thick, and caustic light on the floor.

## Deliver

- `look/materials.py` — `apply_materials()` fills **every** material name in the spec contract (find by name, rebuild the node tree);
  any unknown material name gets a sensible fallback and is printed.
- `look/studio.py` — `build_studio(variant)` with **at least 3** clearly different options (for example: dark studio with a glossy floor
  and hard rim lights; a deep blue-violet gradient cyc; a light high-key cyc; a Poly Haven studio HDRI variant). Each builds floor, backdrop,
  world and lights, and returns a dict of the objects it made (the director will move the camera a lot and may re-aim lights).
  The gate is shot from many angles (any azimuth, elevation 5–45°, lots of macro), so the studio has to hold up all the way round.
- `look/alive.py` — the alive system, driven by a handful of animated values the director keys:
  `key_alive(scene, frame, power=None, wave=None, grant=None, screens=None, ir=None)` inserts keyframes; anything left None is not touched.
    - `power`   0…1 master. 0 = every emissive is dark (the whole build is unlit), 1 = alive.
    - `wave`    −0.1…1.1 position of the wave front in `wave_u` space: an LED lights when the front passes its `wave_u`, with a hot bright head and a short tail settling to the steady glow.
    - `grant`   0 = idle colour (blue-violet like the photos), 1 = access-granted green. It should also be able to travel as a wave (key `wave` again while `grant` blends), your call how.
    - `screens` 0…1 boot of the LCD and the transparent wing displays (off = clear glass).
    - `ir`      0…1 the face-camera IR dots.
  The LEDs must really light the scene (glass edges catch it, floor picks up colour) at a sane cost. If emissive meshes alone are too noisy at 16 spp,
  add a few real lights tied to the same values. Document exactly what the director has to key.
- UI textures made from scratch (pillow): LCD screen (made-up UI, e.g. a face outline + "LOOK HERE", then a check mark), wing displays
  (a big arrow / check, "WELCOME"), badge plate ("HYALO" + "G1"). No real brands. Look at them before using them.
- `look/apply_look.py --gate <blend> --studio <variant> --out look/gate_look.blend` — opens the gate, applies materials, builds the studio, saves.
- `look/tests/` — the A/B stills, plus one side-by-side sheet `ab_backgrounds.png`: every studio option from the same two cameras
  (a 3/4 hero of the whole gate, and a macro on the column/gearbox), 'test' preset. Add stills of the alive moment (wave mid-way, fully alive idle, granted green).
- `look/NOTES.md` — which background you recommend and why (be critical: which one makes the glass edges pop, which one hides the inner parts,
  which one costs most), measured render times, the bounce settings you recommend, how the floor caustics are done, and anything imperfect.

## Requirements

- Glass: IOR ≈ 1.52, zero or near-zero roughness, slight volume absorption or tint so thick edges go blue-violet, shadows that let light
  through (inner parts must be lit through the glass). No black faces at the bounce limits you recommend.
- Caustics on the floor: find the cheapest thing that looks right and stays stable in animation (options: Cycles shadow caustics/MNEE on one key light;
  coloured transparent shadows plus a subtle procedural caustic pattern; a light gobo). Measure the cost.
- Rim lighting: every polished glass edge should carry a highlight; the gears and the PCB must stay readable through the glass.
- Metals: brushed aluminium with anisotropy, polished steel, warm brass gears, copper windings. PCB: solder mask with procedural traces,
  gold pads; it should look manufactured, not flat green. Add tiny imperfections (micro-roughness variation), no heavy dirt.
- Render cost matters. Final animation settings are 1080x1350, 16 spp, OIDN, 4 threads, about 1560 frames on a 4-core CPU with no GPU.
  Target ≤ 20 s per frame for a typical shot. Avoid volumetrics, heavy SSS and anything that needs hundreds of samples.
  Check that 16 spp + denoise does not boil: render the same frame with two different seeds and compare.
- Until `hardware/gate.blend` and `hardware/manifest.json` exist, work on your own proxy (`look/proxy_gate.py`: glass slabs, tubes, a fluted post,
  a few brass gears, a PCB, an LED line with `wave_u`, same material names, spec envelope). Check for the real gate from time to time and switch
  to it as soon as it is there; re-run your tests on it. If it is still missing when the rest is done, finish on the proxy and say so.
- Poly Haven downloads (HDRIs/textures only, CC0) are allowed: list each URL in `look/CREDITS_look.txt`. Keep them small (1k–2k HDRI).
