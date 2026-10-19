#!/usr/bin/env bash
# Full pipeline: frames → sound cues → picture → score/SFX → mix → mux → deliverables.
# Needs: python3 (numpy scipy soundfile pyloudnorm), node + playwright (chromium), ffmpeg.
# Env: CUT (film variant: operator (default) | highlight | story …; see README), BUILD (default ./build; one per cut),
#      AV_FRAMES (default $BUILD/../frames: png2x/AV-*.png + demo-anchors.json, the DEMO_CLEAN
#      renders of ../isms-mvp-figma/screens-v11/demo/av-autoview.mjs), WORKERS (render workers, default 3),
#      THUMB_T (thumbnail time; default the timeline's "thumb", else 13.0).
set -euo pipefail
cd "$(dirname "$0")"
export CUT="${CUT:-operator}"
export BUILD="${BUILD:-$PWD/build}"
[ "$CUT" = operator ] || [ -f "src/js/timeline-$CUT.js" ] || { echo "unknown CUT=$CUT (no src/js/timeline-$CUT.js)" >&2; exit 1; }
mkdir -p "$BUILD" "$BUILD/dist"
tools/assets.sh "${AV_FRAMES:-$BUILD/../frames}"   # frames (2x) + src/js/geo.js; default: a frames/ folder next to $BUILD
[ ! -x "tools/assets-$CUT.sh" ] || "tools/assets-$CUT.sh"   # a cut's own extra assets, if it has any
node tools/cues.mjs                               # picture-locked sound cues + timeline.json
node tools/render.mjs --workers "${WORKERS:-3}" --out "$BUILD/video.mp4"
python3 tools/music.py                            # score + SFX stems
python3 tools/mix.py                              # −14 LUFS mix, −4 dBTP limiter ceiling (no voiceover)
# mux; the AAC master is re-measured and its gain trimmed until it is at or below −3.0 dBTP
G=0
for k in 1 2 3 4; do
  ffmpeg -y -loglevel error -i "$BUILD/video.mp4" -i "$BUILD/mix.wav" -map 0:v -map 1:a -c:v copy -af "volume=${G}dB" -c:a aac -b:a 256k \
    -movflags +faststart -shortest "$BUILD/master.mp4"
  read -r LI TP < <(tools/truepeak.sh "$BUILD/master.mp4")
  echo "master: audio gain ${G} dB → ${LI} LUFS, ${TP} dBTP"
  G=$(python3 -c "tp=float('$TP'); g=float('$G'); print('ok' if tp <= -3.0 else round(g + (-3.15 - tp), 2))")
  [ "$G" = ok ] && break
done
[ "$G" = ok ] || { echo "master true peak still above −3.0 dBTP" >&2; exit 1; }
D="$BUILD/dist"
if [ "$CUT" = operator ]; then N="AgilFence_UI_Flow_v2_1080p"; T="AgilFence UI flow v2 — AGIL Secure V11"
else N="AgilFence_v2_${CUT^}_1080p"; T="AgilFence v2 ${CUT^} — AGIL Secure V11"; fi
cp "$BUILD/master.mp4" "$D/${N}_clean_MASTER.mp4"
tools/deliver.sh "$BUILD/master.mp4" "$D/${N}_share.mp4" "$T"
# thumbnail: the hero moment, PTZ 7-02 live with the person climbing (the alarm view opened itself)
TT="${THUMB_T:-$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('thumb', 13.0))" "$BUILD/timeline.json")}"
ffmpeg -y -loglevel error -ss "$TT" -i "$BUILD/master.mp4" -frames:v 1 -q:v 2 "$D/${N}_thumbnail.jpg"
ls -la "$D"
