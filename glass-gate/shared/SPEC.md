# CLEAR PASSAGE — shared spec (director's contract)

A 26 s, 60 fps, 1080x1350 (4:5) hyper-realistic Blender/Cycles video for X.
A premium **speed gate** (access-control swing-barrier lane, see the reference photos)
made entirely of **clear crystal glass** builds itself piece by piece, then comes alive with light, with music.
Because every housing is glass, the hidden parts stay visible: servo motor, planetary gearbox,
brake, springs, controller PCB, power supply, sensor strips, LED strips, reader modules, wiring, screws.

Everything is modelled from scratch in Python. **No downloaded models.** No real brand names:
the made-up brand is **HYALO** (model "G1"). All text is invented.

Reference photos of the real product (look at them with the Read tool; do not copy them into the repo,
do not reproduce any logo or brand that appears in them):

    /root/.claude/uploads/ce010976-8733-5e34-8631-135237b30dc9/aa22f69d-image.jpg   lane from above, display wings closed
    /root/.claude/uploads/ce010976-8733-5e34-8631-135237b30dc9/4682dfb4-image.jpg   pedestal end, reader top, clear wings
    /root/.claude/uploads/ce010976-8733-5e34-8631-135237b30dc9/fd23c158-image.jpg   lane view, both pedestals, columns
    /root/.claude/uploads/ce010976-8733-5e34-8631-135237b30dc9/a9bf6793-image.jpg   reader top: face camera pod, LCD, QR window, card icon
    /root/.claude/uploads/ce010976-8733-5e34-8631-135237b30dc9/075ba807-image.jpg   macro of the face camera pod (2 lenses, 2x3 IR LEDs)
    /root/.claude/uploads/ce010976-8733-5e34-8631-135237b30dc9/02b87c9c-image.jpg   display wings, LED rail, reader top

What to take from the photos: the long slim top rail with rounded (stadium) ends; the vertically fluted
end posts; the round centre column with a glowing ring where it meets the rail; the LED line running round
the rail; the swing wings held by a clamp on the column; the reader end with camera pod, portrait LCD,
recessed QR window and card-tap icon. The photos' blue-violet anodised colourway survives only as a faint
blue-violet tint in the thick glass edges and as the idle LED colour.

## Team and folders

    glass-gate/shared/     this spec, gg_common.py, timeline.json           (director)
    glass-gate/hardware/   Helper A — every part of the gate                 
    glass-gate/look/       Helper B — materials, studio, rim light, alive moment
    glass-gate/sound/      Helper C — sound effects and the one music track
    glass-gate/director/   shot list, timing, cameras, animation, render     (director)
    glass-gate/renders/    scratch renders (git-ignored)
    glass-gate/out/        final deliverables                                (director)

Stay inside your own folder (read anything, write only yours and `renders/<yours>/`).
Do not git commit or push; the director does that. Do not ask questions; nobody will answer — decide and note
the decision in your `NOTES.md`.

## Tools

- Blender 5.3 as a Python module: `/opt/blender-env/venv/bin/python script.py`. No `blender` binary, no GPU, **4 CPU cores shared by everyone**.
- `shared/gg_common.py`: `reset_scene()`, `setup_cycles(scene, 'test')`, `render_still(scene, path)`.
- Test renders: use the `'test'` preset (540x675, 24 spp, 2 threads). Never more than one render running per helper.
  No full-quality or animation renders — the director does those, one at a time.
- numpy, scipy, soundfile, pyloudnorm, pillow are in the same venv. `uv pip install --python /opt/blender-env/venv/bin/python <pkg>` for more (PyPI only).
- ffmpeg/ffprobe are installed.
- Network: only incompetech.com and Poly Haven (api.polyhaven.com, dl.polyhaven.org) are usable for assets.
  pixabay.com answers with a Cloudflare bot challenge: do not try to get round it.
- Look at your own renders with the Read tool and criticise them before you call anything done.

## Coordinates and envelope (metres, Z up)

- Origin: floor, centre of the lane. People walk along **+Y** (entry at −Y, exit at +Y).
- Two mirrored pedestals, `L` at x<0 and `R` at x>0. Pedestal centre plane x = ±0.38, width 0.14, length 1.40
  (y −0.70…+0.70, stadium ends r=0.07), top of rail z = 1.00. Clear lane width 0.62.
- Centre column axis: (±0.38, 0). Column Ø 0.12.
- Wings: hinge on the column axis, leaf reaches to x = ±0.012 (24 mm gap at the centre), z 0.22…0.92, 12 mm glass, corner radius 0.03.
  Closed = leaf in the plane y=0. Open = rotated 90° about Z so the free edge points to +Y.
- Overall bounding box of the assembled gate: X ±0.46, Y ±0.71, Z 0…1.03 (camera pod may stick up a little).

## Pipeline (each stage is a build script; the director chains them)

1. `hardware/build_gate.py` → builds every part in its **assembled** pose, saves `hardware/gate.blend` and `hardware/manifest.json`.
2. `look/apply_look.py` → opens a gate .blend, replaces the placeholder materials by name, builds the chosen studio, saves `look/gate_look.blend`.
3. `director/animate.py` → assembly animation, cameras, alive-moment keys, exports `shared/timeline.json`.
4. `sound/mix.py` → reads `shared/timeline.json`, writes `sound/out/mix.wav`.
5. `director/render.py` + mux → `out/clear_passage.mp4`.

## Material names (the A ↔ B contract)

Helper A assigns materials **by exact name** (create an empty placeholder with a viewport colour); Helper B fills them in.
A may add a name if really needed (list it in `hardware/manifest.json` → `materials`); B must give every unknown name a sensible fallback.

    GLASS_BODY        clear crystal: rail lid/tray, end posts, column tubes, side panels
    GLASS_WING        the swing leaves (same crystal, may differ slightly)
    GLASS_LENS        camera/scanner lens elements, light pipes
    METAL_STEEL       polished stainless: shafts, clamps, screws, bolts
    METAL_ALU         brushed/anodised aluminium: base rail, spine, heat sinks, motor can
    METAL_DARK        dark anodised / black oxide parts
    BRASS             gears, bushings, standoffs
    COPPER            motor windings, RFID antenna coil, bus bars
    SPRING_STEEL      springs
    PCB_GREEN         circuit board substrate (B may render it any solder-mask colour)
    PCB_GOLD          pads, traces, edge fingers
    CHIP_BLACK        IC packages, connectors, relays
    CAP_ALU           electrolytic capacitor cans
    PLASTIC_WHITE     QR funnel, connectors, light diffusers
    PLASTIC_BLACK     camera pod body, housings, cable ties
    RUBBER            feet, gaskets, cable jackets (black)
    CABLE_RED / CABLE_BLUE / CABLE_YELLOW / CABLE_WHITE   wiring
    LED_STRIP         the emissive LED line (rail perimeter, column ring, post accents) — needs attribute `wave_u`
    LED_IR            the face-camera IR dots (pink-red when alive)
    LED_STATUS        tiny PCB status LEDs
    SCREEN_LCD        reader LCD in the rail (emissive UI when alive) — UV 0..1 over the screen face
    SCREEN_WING       the transparent display layer inside each wing — UV 0..1 over the layer
    BADGE             the HYALO badge plate (B supplies text/texture; UV 0..1 over the front face)
    PRINT_WHITE       printed icons/silkscreen

`wave_u`: a float point attribute (0…1) on every LED_STRIP mesh giving the order in which the light wave
travels: 0 at the entry end (−Y) of the rails, rising toward +Y, column rings in the middle (~0.5), with the
wing-display edges last. B's shader lights each point when the animated wave front passes its `wave_u`.

## Timing

`shared/timeline.json` is the single source of truth (fps 60, 120 BPM: 1 beat = 0.5 s = 30 frames, 1 bar = 2 s).
26.0 s, 1560 frames, 13 bars. A v1 is in place now; the director regenerates it from the real animation, so
anything that depends on timing must **read the file**, never hard-code times.

    bar 1        0–2 s    HOOK: frame 0 already shows the exploded gate hovering, light streaking through the edges
    bars 2–8     2–16 s   THE BUILD in six waves (base → drive → electronics → glass body → top rail → wings), getting faster
    bar 9        16.0 s   THE DROP = alive moment: a light wave travels through the whole gate (16–20 s)
    bars 11–12   20–24 s  IN USE: card tap → beep → green → wings swing open, light passes, wings close
    bar 13       24–26 s  slow hero orbit held ~2 s, clean ending on the last frame
