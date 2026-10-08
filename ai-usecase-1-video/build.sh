#!/usr/bin/env bash
# Full pipeline: narration → timeline → picture → score/SFX → mix → subtitles → deliverables.
# Needs: python3 (kokoro-onnx soundfile scipy pyloudnorm fonttools brotli), node + playwright (chromium), ffmpeg.
# Env: BUILD (default ./build), KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin; default ./models),
#      NOTO_SC_PKG (optional: path to an unpacked @fontsource/noto-sans-sc package to refresh subtitle font slices).
set -euo pipefail
cd "$(dirname "$0")"
export BUILD="${BUILD:-$PWD/build}" KOKORO_DIR="${KOKORO_DIR:-$PWD/models}"
mkdir -p "$BUILD" "$BUILD/dist"
python3 tools/tts.py                              # voiceover + timeline (src/js/timeline.js)
node tools/cues.mjs                               # picture-locked sound cues
node tools/render.mjs --workers "${WORKERS:-3}" --out "$BUILD/video.mp4"
python3 tools/music.py                            # score + SFX stems
python3 tools/mix.py                              # −14 LUFS mix, −3 dBTP ceiling
ffmpeg -y -loglevel error -i "$BUILD/video.mp4" -i "$BUILD/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -movflags +faststart -shortest "$BUILD/master.mp4"
python3 tools/srt.py ${NOTO_SC_PKG:+--fonts "$NOTO_SC_PKG"}
node tools/subs.mjs --in "$BUILD/master.mp4" --out "$BUILD/master_subs.mp4"
D="$BUILD/dist"; N="AI-UseCase1_AGIL-Secure-ISMS"
tools/deliver.sh "$BUILD/master.mp4" "$D/${N}_1080p.mp4"
tools/deliver.sh "$BUILD/master_subs.mp4" "$D/${N}_1080p_EN-ZH-subs.mp4"
cp "$BUILD/subs/EN.srt" "$D/${N}_EN.srt"; cp "$BUILD/subs/ZH.srt" "$D/${N}_ZH.srt"; cp "$BUILD/subs/EN-ZH.srt" "$D/${N}_EN-ZH.srt"
ffmpeg -y -loglevel error -ss 48.2 -i "$BUILD/master.mp4" -frames:v 1 -q:v 2 "$D/${N}_thumbnail.jpg"
python3 tools/script_md.py
ls -la "$D"
