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
