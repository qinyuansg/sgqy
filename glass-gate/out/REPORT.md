# CLEAR PASSAGE — report

A crystal-glass speed gate ("HYALO G1", a made-up product) builds itself piece by piece, then comes alive with light.
26.0 s, 1560 frames at 60 fps, 1080×1350 (4:5), H.264 + AAC 256k, with music and part sounds.

| deliverable | file |
|---|---|
| the film | `out/clear_passage.mp4` |
| 12-frame contact sheet | `out/contact_sheet.jpg` |
| credits and licences | `out/CREDITS.txt` |
| this report | `out/REPORT.md` |
| build scripts | `shared/`, `hardware/`, `look/`, `sound/`, `director/` (pipeline at the end of this file) |

## Status

Finished and verified. `out/clear_passage.mp4` is 26.000 s, 1,560 frames, 1080×1350 at 60 fps, H.264 High@4.2
(yuv420p, BT.709, 11.6 Mbit/s, 38.6 MB) with AAC-LC stereo at 263 kbit/s. Audio and video both start at 0.

**This is the second full render.** The first one (6.6 hours) was made from a copy of the scene file whose texture
paths no longer resolved; Blender renders a missing texture as flat magenta without any error. The wing and lid
displays were plain pink, the circuit boards white, the badge blank. I found it while checking why the badge had
no lettering, after that film had already been encoded. That encode was set aside and is not part of the delivery; the cause
was fixed in the scripts (`director/freeze_scene.py` packs the textures into the frozen scene; `director/render.py`
refuses to start when a texture is missing), and 1,267 frames were rendered again (6.05 hours). Shots 2 and 3
(frames 108–377) show no textured part and were bit-identical in test frames, so they were kept.

## Background chosen, and why

**A dark studio**: near-black room, dark polished floor, soft light cards kept out of frame, two rim strips behind the
subject, one hard spot for sparkle.

The look helper built four backgrounds and rendered each as low-sample stills of the real gate from the same cameras
(`look/tests/ab_backgrounds.png`):

| option | verdict |
|---|---|
| A dark studio | **chosen.** Brightest, cleanest glass edges (dark-field lighting is how glass is photographed), the LED light reads at full saturation, the floor carries reflections and the light pool, and it was the cheapest to render |
| B blue-violet cyclorama | pretty, but it swallowed the idle-blue of the LEDs: the alive moment lost its colour contrast |
| C high-key white cyclorama | glass read as acrylic: grey edges, no sparkle, and the light wave had nothing dark to glow against |
| D HDRI studio (Poly Haven) | believable reflections but grey, busy edges and the weakest payoff |

## Who built what

**Helper A — hardware** (`hardware/`). The whole gate, procedurally, in real dimensions: 124 separately animated
parts, 138 mesh objects, 868,196 triangles, nothing downloaded. Steel base rails with anchor bolts and feet; per
pedestal a motor with finned can and end windings, brake, a planetary gearbox with true involute teeth (sun 18,
three planets 18, ring 54, positioned in mesh), output shaft, torsion spring, encoder; controller PCB, power supply,
sensor strips, cable looms; fluted glass posts (8 mm wall), side panels, a rotating glass column sleeve, a glass top lid
with countersunk screws; under the lid a card reader board, QR lens, LCD, speaker; LED strips with light-guide
bands; glass wing leaves in clamps with an edge light; the badge; the access card. All glass is closed, bevelled
solids with real thickness. Sent back once (round 2): continuous light-guide bands for the LED lines (single chips
read as a dotted thread), the access card prop, the column glow ring moved clear of the rail, wing leaf clearance.

**Helper B — look** (`look/`). Every material (crystal glass with a bounce guard so it never goes black, brushed and
polished metals, brass, PCB, LED and screen emitters, made-up badge/screen/PCB artwork), the four studio tests, the
soft-card rig that re-aims itself to every shot so no lamp is ever mirrored in a pane or in the floor, the alive
system (one set of keys drives the LED wave, edge-lit glass, floor glow, screens and house lights), bloom, and the
render-cost work. Sent back once (round 2), after my review stills showed white light-card rectangles in the glass,
a weak alive moment, wings that vanished against black and 26–36 s per frame: fixed the rig, made the wave carry the
frame, made the wings read, and cut 20–31 % of the render time at equal samples.

**Helper C — sound and music** (`sound/`). One music track ("Nowhere Land", Kevin MacLeod, incompetech, CC BY 4.0,
already at exactly 120 BPM) re-arranged on its own bar lines to the film's sections, and 21 sound effects
synthesised from scratch (modal synthesis for glass and metal, filtered noise for air and friction, one shared
room). The mix is rebuilt from the picture's timeline by one command and checks itself. Sent back once (round 2):
brighter and less harsh part sounds, new servo / screwdriver / spring, a real build from wave to wave, a heavier drop.

**Director (me)** (`director/`, `shared/`). The spec and contracts, the animation engine (snappy landings with
overshoot and settle, screws that drive in turning, a working gear train), the choreography of all 124 parts on a
120 BPM grid, 16 shots with rack focus and speed ramps, the hook and drop lighting, the access-card and wing
motion, collision checking, the resumable render, the glitch scanner, the edit and the encode.

## Timing

| time | what |
|---|---|
| 0.0 s | **hook.** Frame 0 is the whole gate exploded and hovering, LED lines already lit, a light streak passing behind the glass. No fade-in |
| 1.34–1.8 s | the parts scatter, the light dies, the camera dives to the floor |
| 2.0 s | first slam: the left base rail. From here every landing sits on the beat grid (120 BPM, sixteenths) |
| 2–4 s | wave 1, base: rails, anchor bolts, cables |
| 4–8 s | wave 2, drive: motor, brake, **macro hero shot of the planetary gearbox**, shaft, spring, encoder, glass column |
| 8–10 s | wave 3, electronics |
| 10–12 s | wave 4, glass body: fluted posts and panels |
| 12–14 s | wave 5, top rail: LED lines, reader, screen, lid, screws |
| 14–16 s | wave 6, wings, then the badge and a held breath (music and room pull back from 15.25 s) |
| **16.000 s (frame 960)** | **the drop.** A flash of the room, then darkness and a wave of light runs through the whole gate in three beats |
| 18.0 s | front view, the wing displays wake up |
| 20.0–24.0 s | in use: a card taps the reader (20.25 s), it beeps and turns green (20.5 s), the gears turn and the wings swing open (21.0–21.9 s), a light passes through the lane, the wings close (22.9–23.5 s) |
| 24.0–26.0 s | slow hero orbit, held 2 s, ends with the last chord |

## Glitch scan

Every one of the 1,560 final frames went through two scanners; every flagged run was then looked at as a strip of
consecutive frames. After the encode, the mp4 itself was decoded and scanned again.

| check | result |
|---|---|
| missing / black / blown-out frames | 0 / 0 / 0 |
| `glitch_scan.py`: flicker / global pop / block pop / camera hitch / denoiser boil | 29 / 51 / 155 / 10 / 0 flags on 172 distinct frames. All are intended events (below) |
| `shadow_flick_scan.py` (1–3 frame shadow dips) | 38 frames in 19 runs. All are dark parts passing in front of bright ones; the two real flicks (below) are gone |
| the encoded mp4, frame by frame | no flag further than 2 frames from a flag in the source frames; 0 missing, black or blown-out |
| parts passing through each other (`check_collisions.py`) | 0 part pairs intersect in flight |
| audio | −16.0 LUFS integrated, true peak −1.7 dBFS, loudness range 6.3 LU; worst landing-to-sound offset 1.1 ms |

What the flags are: the hook scatter and camera dive (frames 86–106, deliberate), the first slam with its camera
kick (110–121), part landings all through the build, the badge (913–914), the card flying in, the switch to green
and the card leaving (1210–1246), and the wing swinging behind the gear column (1272–1301).

**Found and fixed**

1. **Missing textures in the whole first render** (see Status). 1,267 frames rendered again.
2. **Shadow flick, frames 142–144.** The second base rail, in flight, threw the hard spot's shadow across the first
   rail for three frames. Fixed with a light-linking patch (`director/patches/base_rail_shadow.py`); 3 frames.
3. **Shadow flick, frames 722–724, and a thin shadow line at 727–729.** The right-hand top rail and its LED parts,
   in flight, darkened the left rail that had just landed. Frames 721–734 were rendered again with those flying
   parts casting no shadow; 14 frames. The frames just outside the patch differ from the unpatched render by under
   0.4 % of full scale on average, so the seams do not show.
4. **Temporal filter across cuts.** The post filter averages neighbouring frames, so it could have blended the last
   frame of a shot into the next. `director/finish.sh` now filters every shot separately; with the filters off the
   chain was checked to be frame-exact on both sides of all 15 cuts.

Not found: popping geometry, parts through each other, camera hitches other than the deliberate impact kicks, or
denoiser boiling above the scanner's threshold. Fine crawl below that threshold remains (next section).

## What is imperfect

- **Resolution.** Rendered at 864×1080 and enlarged to 1080×1350 with Lanczos and a light sharpen. A native render
  has 1.56 times the pixels and would have taken roughly that much longer on this machine (4 CPU cores, no GPU; the frames in the film took 6.9
  hours at a mean of 15.9 s each).
- **16 samples per pixel.** The denoiser leaves a fine crawl in the fluted glass and on the gears behind glass. The
  post filter lowers the frame-to-frame residual by 36–44 % in the four shots I measured (a figure that still
  includes real motion and the added grain). It is reduced, not removed.
- **No Pixabay sounds.** Pixabay answered every request with a Cloudflare challenge, which I did not try to get
  around. All 21 part sounds are synthesised from scratch instead. The music is the only downloaded audio.
- **Nobody listened to the mix.** It is verified by measurement only (loudness, peaks, sync, spectrum), not by ear.
- **"In use" has no person.** A card taps the reader and a light passes through the lane.
- **No motion blur.** Fast parts are sharp in every frame.
- **Floor caustics are an approximation**: a shader effect, not path-traced light (`look/NOTES.md`, "Floor caustics").
- **Lighting cheats.** A glow card behind the gate (`STUDIO_BACK`) lifts the glass edges; the light rig follows the
  camera in shots 7 and 11; the shadow patches make a few flying parts shadowless for 3 to 14 frames.
- **The green light follows the beep by 4 frames.** The displays switch to "WELCOME" on the beep (frame 1230); the
  LED band turns green at frame 1234 (67 ms later).
- **Frame 150 (2.5 s) is sparse**: two rails on a dark floor, before the build fills the frame.
- **Process:** one `pkill` of mine during look development may have cut short a helper's test render. The first
  full render was lost to the texture fault described under Status.

## Pipeline (how to rebuild)

    PY=/opt/blender-env/venv/bin/python        # Blender 5.3 as a Python module (bpy), no GPU needed
    CUTS=108,228,378,468,528,588,708,828,900,960,1080,1200,1254,1317,1440
    R="--blend renders/final/scene_final.blend --preset final --samples 16 --scale 80"
    $PY hardware/build_gate.py                                                   # -> hardware/gate.blend + manifest.json
    $PY look/apply_look.py --gate hardware/gate.blend --studio dark --out look/gate_look.blend
    $PY director/animate.py --gate look/gate_look.blend --out director/scene.blend   # also writes shared/timeline.json
    $PY director/check_collisions.py --blend director/scene.blend                # parts must not pass through each other
    $PY sound/mix.py                                                             # -> sound/out/mix.wav from the timeline
    $PY director/freeze_scene.py                                                 # -> renders/final/scene_final.blend, textures packed inside
    $PY director/render.py $R --out renders/final                                # resumable; refuses to start if a texture is missing
    # shadow patches: rendered to their own folders, checked against the neighbours, then copied over renders/final
    $PY director/render.py $R --out renders/patch_base --start 142 --end 144 --patch director/patches/base_rail_shadow.py
    $PY director/render.py $R --out renders/patch_rail --start 721 --end 727 \
        --no-shadow RAIL_spine_R,LED_colring_R,LED_colring_diffuser_R,RAIL_led_R,RAIL_led_diffuser_R
    $PY director/render.py $R --out renders/patch_rail --start 728 --end 734 --no-shadow RAIL_led_R,RAIL_led_diffuser_R
    $PY director/glitch_scan.py renders/final renders/final_scan --cuts $CUTS    # every frame: flicker, pops, hitches, boiling
    $PY director/shadow_flick_scan.py renders/final --cuts $CUTS                 # every frame: 1-3 frame shadow flicks
    director/finish.sh renders/final sound/out/mix.wav out/clear_passage.mp4     # per-shot temporal filter, encode, contact sheet

`shared/SPEC.md` is the contract between the four of us; each helper folder has its `BRIEF.md` and `NOTES.md`.
