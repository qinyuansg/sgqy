#!/usr/bin/env bash
# Full pipeline: frames + art → narration → timeline → picture → score/SFX → mix → English subtitles → deliverables.
# Needs: python3 (kokoro-onnx soundfile scipy pyloudnorm), node + playwright (chromium), ffmpeg.
# Env: BUILD (default ./build), KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin; default ./models),
#      V11_ASSETS (V11 asset folder, see ../isms-mvp-figma/README.md), DECK_ASSETS (../cag-pitch-deck assets: persona photos).
set -euo pipefail
cd "$(dirname "$0")"
export BUILD="${BUILD:-$PWD/build}" KOKORO_DIR="${KOKORO_DIR:-$PWD/models}"
mkdir -p "$BUILD" "$BUILD/dist"
tools/assets.sh "${V11_ASSETS:?set V11_ASSETS}" "${DECK_ASSETS:?set DECK_ASSETS}"   # AgilFence V11 frames (2x), camera scenes, anchors
python3 tools/tts.py                              # voiceover + timeline (src/js/timeline.js)
node tools/cues.mjs                               # picture-locked sound cues
node tools/render.mjs --workers "${WORKERS:-3}" --out "$BUILD/video.mp4"
python3 tools/music.py                            # score + SFX stems
python3 tools/mix.py                              # −14 LUFS mix, −3 dBTP ceiling
ffmpeg -y -loglevel error -i "$BUILD/video.mp4" -i "$BUILD/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -movflags +faststart -shortest "$BUILD/master.mp4"
python3 tools/srt.py                              # EN.srt + cues for the burn-in
node tools/subs.mjs --in "$BUILD/master.mp4" --out "$BUILD/master_subs.mp4"
D="$BUILD/dist"; N="AgilFence_End-to-End_Film"; T="First touch — AgilFence × AGIL Secure V11"
cp "$BUILD/master_subs.mp4" "$D/${N}_1080p_EN-subs_MASTER.mp4"   # play this one at the demo
cp "$BUILD/master.mp4" "$D/${N}_1080p_clean_MASTER.mp4"          # no burned-in subtitles
tools/deliver.sh "$BUILD/master_subs.mp4" "$D/${N}_1080p_EN-subs_share.mp4" "$T"
tools/deliver.sh "$BUILD/master.mp4" "$D/${N}_1080p_clean_share.mp4" "$T"
cp "$BUILD/subs/EN.srt" "$D/${N}_EN.srt"
ffmpeg -y -loglevel error -ss "${THUMB_T:-38.6}" -i "$BUILD/master.mp4" -frames:v 1 -q:v 2 "$D/${N}_thumbnail.jpg"
python3 tools/script_md.py                         # timecoded narration table in SCRIPT.md
ls -la "$D"
