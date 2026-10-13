# CAG demo-day pitch deck

Editable PowerPoint for the CAG demo: one person presents the slides while a colleague drives
AGIL Secure V11 live. Every demo slide mirrors one V11 screen (the V11-fit frames in
`../isms-mvp-figma/screens-v11`), with numbered tags that match the "Watch for" list and the clicks
on screen. Speaker notes are the spoken presentation script only.

```bash
npm install                                    # pptxgenjs, react-icons, sharp
OUT=/path/to/build
# product frames: node ../isms-mvp-figma/build-v11.mjs $OUT/v11 <v11 assets>
node make_assets.mjs <previous-deck.pptx> $OUT/v11/svg <mvp-svg-dir> $OUT/assets
node make_visuals.mjs $OUT/assets
python3 extract_anchors.py $OUT/v11/svg $OUT/assets/anchors.json
node build_deck.js $OUT/assets $OUT/CAG_AI_CoPilot_Presenter.pptx            # 28 slides, appendix hidden
DECK=client node build_deck.js $OUT/assets $OUT/CAG_AI_CoPilot_Live_Demo.pptx  # 25 slides, no appendix
```

- `make_assets.mjs`: photos and portraits from the previous deck, 2x V11 renders, concept frame
- `make_visuals.mjs`: text-free rendered art (backgrounds, airport twin, alarm field, signal flow,
  platform stack, trust ring, timeline, cover funnel) plus `visuals.json`, the geometry the deck uses
  to place native, editable pins, labels and numbers on top
- `extract_anchors.py`: on-screen text positions in the V11 frames, used to place the tags
- `build_deck.js`: theme, layouts, slides, speaker scripts, presenter appendix (`SHOW_HIDDEN=1` shows it for QA)
- `arial-widths.json`: Arial-compatible metrics for text-fit checks

Layouts carry only a background and placeholders: no footer text, logo or slide number. The build
fails if a slide, layout or note contains role labels (CMO/CTO), timings or the old footer line.
All names, IDs and figures are illustrative demo-scenario data.
