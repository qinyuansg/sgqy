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
