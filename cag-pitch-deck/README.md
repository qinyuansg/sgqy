# CAG demo-day pitch deck

Editable PowerPoint for the CAG demo: the CMO presents, the CTO drives AGIL Secure V11 live.
Every live slide mirrors one V11 screen (the V11-fit frames in `../isms-mvp-figma/screens-v11`),
with numbered "watch for" markers that match the CTO's clicks. Speaker notes carry the CMO talk
track and the CTO click path; a hidden appendix holds the run sheet and Q&A prep.

```bash
npm install                                    # pptxgenjs, react-icons, sharp
OUT=/path/to/build
# product frames: node ../isms-mvp-figma/build-v11.mjs $OUT/v11 <v11 assets>
node make_assets.mjs <previous-deck.pptx> $OUT/v11/svg <mvp-svg-dir> $OUT/assets
python3 extract_anchors.py $OUT/v11/svg $OUT/assets/anchors.json
node build_deck.js $OUT/assets $OUT/CAG_AI_CoPilot_Live_Demo.pptx
```

- `make_assets.mjs` – backgrounds, photos from the previous deck, airport demo map, 2x V11 renders
- `extract_anchors.py` – on-screen text positions in the V11 frames, used to place the markers
- `build_deck.js` – theme, layouts, slides, speaker notes, hidden appendix (`SHOW_HIDDEN=1` shows it for QA)
- `arial-widths.json` – Arial-compatible metrics for text-fit checks

All names, IDs and figures are illustrative demo-scenario data.
