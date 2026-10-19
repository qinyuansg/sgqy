# AgilFence image flow deck

A picture-led PowerPoint for an airport audience: how AgilFence protects the airfield perimeter,
feature by feature, from a touch on the fence to a confirmed response. AgilFence features only;
no assistant features and no lavender anywhere (the build fails if they appear in the slide XML).
Sixteen slides: cover, the perimeter challenge, FBG sensing, pinpointing the segment, built for an
airfield, signature classification, zones and maintenance mode, alarm to picture, thermal and
visible, map and video wall, self-diagnostics, the workflow chain, proven at Changi, the flow on
one page, close, and an appendix with the picture sources and the labelling rule. Slides 6, 7, 11
and 12 are native, editable diagrams (shapes and text). Speaker notes on every slide.

## Build

```bash
# dependencies resolve from ../cag-pitch-deck/node_modules (pptxgenjs, sharp, react-icons)
node build_deck.js <assetsDir> <out.pptx>
```

`<assetsDir>` holds the V11 AgilFence frames at 2x under `af/`, the rendered scenes under `cctv/`
(1280x720), the `bg2_*.jpg` / `bg3_*.jpg` backgrounds and `af-anchors.json`. The build prints
`FIT WARNINGS` (must be empty) and fails on any banned word. QA: run the pptx validator on the
output, convert it to PDF with LibreOffice and look at every page.

## Photo policy

Every picture is a stand-in (rendered scene or V11 frame crop) tagged "Stand-in · replace with approved photo", captioned "Illustration" or "Rendered scene", with the owner-verified source to swap in named in the speaker notes.
No picture is labelled an actual Changi deployment unless CAG or the AgilFence product team confirms it; the appendix lists the sources and the rule.
