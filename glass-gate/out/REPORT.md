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

@@STATUS@@

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

@@GLITCH@@

@@IMPERFECT@@

## Pipeline (how to rebuild)

    PY=/opt/blender-env/venv/bin/python        # Blender 5.3 as a Python module (bpy), no GPU needed
    $PY hardware/build_gate.py                                                   # -> hardware/gate.blend + manifest.json
    $PY look/apply_look.py --gate hardware/gate.blend --studio dark --out look/gate_look.blend
    $PY director/animate.py --gate look/gate_look.blend --out director/scene.blend   # also writes shared/timeline.json
    $PY director/check_collisions.py --blend director/scene.blend                # parts must not pass through each other
    $PY sound/mix.py                                                             # -> sound/out/mix.wav from the timeline
    $PY director/render.py --blend director/scene.blend --out renders/final --preset final --samples 16 --scale 80
    $PY director/glitch_scan.py renders/final renders/final_scan --cuts 108,228,378,468,528,588,708,828,900,960,1080,1200,1254,1317,1440
    director/finish.sh renders/final sound/out/mix.wav out/clear_passage.mp4     # post, encode, contact sheet

`shared/SPEC.md` is the contract between the four of us; each helper folder has its `BRIEF.md` and `NOTES.md`.
