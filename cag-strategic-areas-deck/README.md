# Strategic areas 2 · 4 · 5 — the product answer deck

Internal, C-level PowerPoint (for the CMO, CSO and CCO, written from the Chief Product Officer's seat)
that answers the 16 October asks: is Weili's AI deck good to commit to CAG (area 2), and is there a
ready in-built module in V11 for AgilFence integration (area 4) and multi-site governance (area 5).
For each area it shows the demo use cases on V11 screens, what is **in V11 today**, what is **designed**
(concept frames, films) and what is **roadmap**, plus the release timeline, the commitment list, the
risks and the decisions. `BRIEF.md` is the source of truth for the storyline and every fact.

`build_deck.js` reuses the deck v2 generator (`../cag-pitch-deck/build_deck.js`): same theme, layouts,
measuring and components (card, brackets, device, lens, highlight markers, pills), plus a readiness
**grade tag** (`grade(s, x, y, kind, text)`) that sits on every visual and every table row that states
readiness. Node modules are resolved from the sibling project; nothing is installed here.

## Build

```bash
# 1 frames (V11-fit, AgilFence, multi-site + boards)   2 deck assets   3 deck
./build.sh <V11 assets dir> <deck assets dir> <out dir>
```

`build.sh` runs `../isms-mvp-figma/build-v11.mjs`, `build-agilfence.mjs` and `build-cpo-flows.mjs` into
`<out dir>/frames`, renders the V11 frames at 2× to `<deck assets>/v11/` (`../isms-mvp-figma/render-2x.mjs`:
Playwright chromium, viewport = frame size, deviceScaleFactor 2) and rewrites `<deck assets>/anchors.json` from
their SVGs (`../cag-pitch-deck/extract_anchors.py`), copies the 2× multi-site PNGs to `<deck assets>/ms/`, the flow boards and the AgilFence
board to `<deck assets>/boards/`, `ms-anchors.json` and `anchors.json` (as `af-anchors.json`) to
`<deck assets>/`, makes the frames PDF, zips all SVGs (flat) to `<out dir>/CAG_Strategic_Areas_2-4-5_Figma_SVG.zip`, copies the
frames PDF and `CPO-master-board.png` to `<out dir>`, builds the deck to `<out dir>/AGIL_Secure_V11_CAG_Strategic_Areas_2-4-5_CPO.pptx` and runs the pptx validator.

The deck alone:

```bash
node build_deck.js <assetsDir> <out.pptx>
DRAFT=1 node build_deck.js <assetsDir> <out.pptx>      # missing images become labelled placeholders (listed at the end)
DECK=client node build_deck.js <assetsDir> <out.pptx>  # leaves the appendix (A1–A3) out; default: visible, this deck is internal
PPTX_APPLY_THEME=<pptx skill>/scripts/apply_theme.js node build_deck.js …   # use the skill's theme writer instead of the inline one
```

`<assetsDir>` is the deck v2 assets folder (backgrounds `bg2_*.jpg`, `bg3_*.jpg`, art `viz_*.png`,
`persona_*.jpg`, `visuals.json`, `anchors.json`, `v11/*.png` at 2×) plus `af/` (AgilFence 2× PNGs),
`ms/` (multi-site 2× PNGs), `boards/` (flow boards at 1×), `af-anchors.json` and `ms-anchors.json`.
Without the anchor files the generator falls back to the AF build values copied into the script and to
estimates for the multi-site frames, and says so.

QA after a build:

```bash
python3 <pptx skill>/scripts/office/validate.py out.pptx
python3 <pptx skill>/scripts/office/soffice.py --headless --convert-to pdf --outdir qa out.pptx
pdftoppm -r 60 -png qa/out.pdf qa/s
```

The build prints `FIT WARNINGS` (text that would not fit its box, margin crossings, tag overflows); keep it
empty. Nothing on a slide is below 12 pt.

## Where things are

- `build_deck.js`: `TRAINS` (the proposed release trains and their contents per area; **every date on every
  slide comes from here** and carries "proposed · confirm with R&D" or a footnote saying so), `GRADES`
  (the four readiness grades and colours), `CAL` (near-term calendar), the layouts, the components, the
  32 main slides, the three appendix slides and the speaker notes (spoken script only).
- `BRIEF.md`: the asks, the facts and guardrails, the readiness tables, the verdict on Weili's deck, the
  release trains, the slide-by-slide storyline and the Figma frame spec.
- `build.sh`: frames → boards → assets → deck, as above.
- Outputs (pptx, pdf, slide PNGs, zip) go to the out directory you name; nothing generated lives in the repo.

## Guardrails built in

Readiness is always labelled (grade tags). Dates are proposals until R&D confirms them (by 30 Oct 2026).
People decide: no autonomous closure, no facial recognition, no invented performance numbers. Third-party
systems are Vendor A–E with a protocol. Sites, names and figures are illustrative and say so. The build
fails if a slide or note contains a role acronym, "iPAM" without the S, or a model identifier.
