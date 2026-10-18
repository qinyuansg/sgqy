# ISMS MVP — Figma SVG frames

Generator for the AGIL Secure ISMS · Co-pilot MVP front-end (17 frames, 1920×1080).
Every frame is a plain SVG that imports into Figma as an editable frame: named layer
groups, Inter text layers, vector UI; only the CCTV evidence frames are embedded images.

```bash
OUT=/path/to/out
node render-cctv.mjs $OUT/cctv   # stylised camera frames (Chromium via Playwright)
node build.mjs $OUT              # $OUT/svg/*.svg + $OUT/png previews
node make-pdf.mjs $OUT           # $OUT/ISMS_MVP_Figma_frames.pdf (vector, all frames)
```

- `lib/svg.mjs` – SVG primitives, Inter text measurement, icon set
- `lib/ui.mjs` – components (shell, cards, chips, buttons, player, plan, co-pilot)
- `lib/twin.mjs` – axonometric airport digital twin and small-site twin
- `lib/cctv.mjs` – stylised CCTV scenes (bounding boxes are drawn as vectors in the UI)
- `screens/*.mjs` – one module per frame; `screens/workspace.mjs` is the shared incident template

All names, people and data are illustrative.

## V11-fit frames (demo use cases in the current V11 UI)

Fits the seven demo use cases into the team's current V11 screens (1400×1069, Roboto),
reusing their panels, buttons and flows; new elements carry "NEW" in their layer names.

```bash
A=/path/to/assets   # logo_s.png + locate_door.jpg (from the team's Figma file), cctv/*.jpg + meta.json
python3 make-stars.py $A/stars.jpg
python3 make-lidar.py $A/cctv/lidar_clean.jpg
node build-v11.mjs $OUT $A                         # svg/, png/, thumb/ (+ hand-off pages)
node make-pdf.mjs $OUT ISMS_AI_Demo_fit_to_V11.pdf
```

- `lib/v11.mjs` – V11 component kit (header, Real Time Alerts, Active Alarms, tabs, SOP Flow, dialogs)
- `lib/clay.mjs` – airport twin in the V11 3D-viewer look
- `lib/roboto-widths.json` – Roboto advance widths for text layout
- `screens-v11/frames.mjs` – product frames; `screens-v11/spec.mjs` – delta map and click paths

## AgilFence end-to-end flow (V11 design)

Ten frames and a flow board that follow one climb on an AgilFence-protected airfield fence through the
current V11 UI: perimeter triggered (illustration) → system message and alarm → incident list → Locate
and nearest cameras → PTZ live view → command-centre video wall (1920×1080) → SOP → patrol on scene →
close and report. Clock times only, people decide, NEW layers are concepts; all data is illustrative.

```bash
A=/path/to/assets                                  # as for the V11-fit frames
node render-cctv.mjs $A/cctv fence_                # fence camera scenes (PTZ, wide, pre-alarm, auto-track, patrol)
node build-agilfence.mjs $OUT $A                   # svg/, png/, thumb/, anchors.json (+ AF-00b flow board)
node make-pdf.mjs $OUT AgilFence_End-to-End_V11.pdf
AF_FILM=1 node build-agilfence.mjs $OUT2 $A        # film variants: no baked pointer, in-between states, 2x PNG
```

- `screens-v11/agilfence.mjs` – the frames (and `ANCHORS`, the on-screen rects the film uses for callouts)
- `screens-v11/agilfence-illustration.mjs` – the fence bay, FBG cable, strain and climber illustration
- `screens-v11/agilfence-board.mjs` – the flow board (nine steps, who acts, scenario clock)
- `lib/fence.mjs` – scenario data, fence-site overlay for the 3D viewer, system toast, nearest cameras, video player

## Strategic areas 2 · 4 · 5: end-to-end flows and the multi-site governance frames (V11 design)

Answers the 16 October asks for the C-level deck in `../cag-strategic-areas-deck`: six new multi-site,
multi-brand governance frames (MS-01…06: estate overview, site drill-down with local autonomy, security
baseline with override approval, roles and access, systems and connectors with an onboarding dialog, estate
report), two flow boards (P2 for the AI-powered ISMS flow, P5 for multi-site) and one master board with all
three lanes (points 2, 4 and 5). Everything is graded In V11 today / Concept · designed / Roadmap, and every
date is a proposal to confirm with R&D. Sites, vendors (Vendor A–E), people and figures are illustrative.

```bash
A=/path/to/assets; OUT=/path/to/out
node build-v11.mjs $OUT $A                        # V11-01…12 (+ V11-00, V11-00b)
node build-agilfence.mjs $OUT $A                  # AF-00…09 + AF-00b flow board
node build-cpo-flows.mjs $OUT $A                  # MS-01…06 (svg, png, png2x, thumb, ms-anchors.json) + P2 / P5 / CPO master boards
node make-pdf.mjs $OUT CAG_Strategic_Areas_2-4-5_Figma_frames.pdf
```

- `screens-v11/multisite.mjs` – the six MS frames (`MS_FRAMES`, `ANCHORS`, `setFrame`)
- `screens-v11/cpo-boards.mjs` – the P2, P5 and master boards (`BOARDS`, `useThumbs`)
- `build-cpo-flows.mjs` – builds the frames, then the boards from the thumbs of all frames
