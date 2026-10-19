#!/usr/bin/env bash
# Full pipeline: frames → sound cues → picture → score/SFX → mix → mux → deliverables.
# Needs: python3 (numpy scipy soundfile pyloudnorm), node + playwright (chromium), ffmpeg.
# Env: BUILD (default ./build), UIFLOW_FRAMES (png2x/UC*.png + demo-anchors.json), AF_FRAMES (png/AF-*.png + anchors.json),
#      FIGMA_ASSETS (V11 asset dir, only when the UC2/UC5 anchors have to be regenerated), WORKERS (render workers, default 3).
set -euo pipefail
cd "$(dirname "$0")"
export BUILD="${BUILD:-$PWD/build}"
mkdir -p "$BUILD" "$BUILD/dist"
tools/assets.sh "${UIFLOW_FRAMES:?set UIFLOW_FRAMES}" "${AF_FRAMES:?set AF_FRAMES}"   # frames (2x) + src/js/geo.js
node tools/cues.mjs                               # picture-locked sound cues + timeline.json
node tools/render.mjs --workers "${WORKERS:-3}" --out "$BUILD/video.mp4"
python3 tools/music.py                            # score + SFX stems
python3 tools/mix.py                              # −14 LUFS mix, −3 dBTP ceiling (no voiceover)
ffmpeg -y -loglevel error -i "$BUILD/video.mp4" -i "$BUILD/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -movflags +faststart -shortest "$BUILD/master.mp4"
D="$BUILD/dist"; N="AgilFence_UI_Flow_1080p"; T="AgilFence UI flow — AGIL Secure V11"
cp "$BUILD/master.mp4" "$D/${N}_clean_MASTER.mp4"
tools/deliver.sh "$BUILD/master.mp4" "$D/${N}_share.mp4" "$T"
ffmpeg -y -loglevel error -ss "${THUMB_T:-24.5}" -i "$BUILD/master.mp4" -frames:v 1 -q:v 2 "$D/${N}_thumbnail.jpg"
ls -la "$D"
