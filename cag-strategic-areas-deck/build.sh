#!/usr/bin/env bash
# Frames → boards → deck assets → deck, for strategic areas 2 · 4 · 5.
#   ./build.sh <V11 assets dir> <deck assets dir> <out dir>
# <V11 assets dir>: logo_s.png, stars.jpg, cctv/*.jpg + meta.json (incl. fence_* scenes)
# <deck assets dir>: the deck v2 assets (bg2_*.jpg, bg3_*.jpg, viz_*.png, persona_*.jpg, visuals.json, anchors.json, v11/, af/)
# <out dir>: everything generated (frames/, the SVG zip, the frames PDF, the master board PNG, the pptx);
#            nothing is written into the repository.
set -euo pipefail
if [ $# -ne 3 ]; then echo "usage: $0 <V11 assets dir> <deck assets dir> <out dir>" >&2; exit 2; fi
A=$(cd "$1" && pwd)
DECK=$(cd "$2" && pwd)
OUT=$(mkdir -p "$3" && cd "$3" && pwd)
HERE=$(cd "$(dirname "$0")" && pwd)
FIG="$HERE/../isms-mvp-figma"
FRAMES="$OUT/frames"
mkdir -p "$FRAMES" "$DECK/ms" "$DECK/boards" "$DECK/af"

echo "== frames: V11-fit (V11-01…12, V11-00, V11-00b)"
node "$FIG/build-v11.mjs" "$FRAMES" "$A"
echo "== frames: AgilFence (AF-00…09, AF-00b)"
node "$FIG/build-agilfence.mjs" "$FRAMES" "$A"
echo "== frames: multi-site MS-01…06, P2 / P5 boards, master board"
node "$FIG/build-cpo-flows.mjs" "$FRAMES" "$A"

echo "== deck assets"
cp "$FRAMES"/png2x/MS-*.png "$DECK/ms/"
for b in P2-flow-board P5-flow-board CPO-master-board AF-00b-flow-board; do
  if [ -f "$FRAMES/png/$b.png" ]; then cp "$FRAMES/png/$b.png" "$DECK/boards/"; fi
done
if [ -f "$FRAMES/ms-anchors.json" ]; then cp "$FRAMES/ms-anchors.json" "$DECK/ms-anchors.json"; fi
if [ -f "$FRAMES/anchors.json" ]; then cp "$FRAMES/anchors.json" "$DECK/af-anchors.json"; fi

echo "== frames PDF, SVG package, master board PNG"
node "$FIG/make-pdf.mjs" "$FRAMES" CAG_Strategic_Areas_2-4-5_Figma_frames.pdf
ZIP="$OUT/CAG_Strategic_Areas_2-4-5_Figma_SVG.zip"
rm -f "$ZIP"
# flat zip: the V11, AgilFence and multi-site frames plus the four boards (no folder prefix)
( cd "$FRAMES/svg" && zip -q "$ZIP" V11-*.svg AF-*.svg MS-*.svg P2-flow-board.svg P5-flow-board.svg CPO-master-board.svg )
cp "$FRAMES/CAG_Strategic_Areas_2-4-5_Figma_frames.pdf" "$FRAMES/png/CPO-master-board.png" "$OUT/"

echo "== deck"
PPTX="$OUT/AGIL_Secure_V11_CAG_Strategic_Areas_2-4-5_CPO.pptx"
node "$HERE/build_deck.js" "$DECK" "$PPTX"
SKILL=${PPTX_SKILL:-$(ls -d "$HOME"/.claude/skills/synced/*/pptx 2>/dev/null | head -1 || true)}
if [ -n "$SKILL" ] && [ -f "$SKILL/scripts/office/validate.py" ]; then
  python3 "$SKILL/scripts/office/validate.py" "$PPTX"
else
  echo "validate.py not found (set PPTX_SKILL to the pptx skill directory); skipping validation" >&2
fi
echo "done → $PPTX"
echo "        $ZIP"
echo "        $OUT/CAG_Strategic_Areas_2-4-5_Figma_frames.pdf"
echo "        $OUT/CPO-master-board.png"
