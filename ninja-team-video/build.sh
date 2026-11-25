#!/usr/bin/env bash
# Builds NinjaTeam_Product_OS.mp4 from script.py + scenes.html.
#
# Needs: ffmpeg, node + playwright (chromium), and a Python with
#   kokoro-onnx soundfile numpy   (pip install kokoro-onnx soundfile)
# plus the Kokoro model files in $KOKORO_DIR:
#   kokoro-v1.0.onnx, voices-v1.0.bin  (https://huggingface.co/fastrtc/kokoro-onnx)
set -euo pipefail
cd "$(dirname "$0")"
PY=${PY:-python3}
KOKORO_DIR=${KOKORO_DIR:?set KOKORO_DIR to the folder holding kokoro-v1.0.onnx and voices-v1.0.bin}
JOBS=${JOBS:-4}
FPS=30
OUT=${OUT:-NinjaTeam_Product_OS.mp4}

echo "== narration"
"$PY" tts.py --model-dir "$KOKORO_DIR"
echo "== music bed + mix"
"$PY" music.py

echo "== audio mastering (-16 LUFS)"
CHAIN="acompressor=threshold=0.1:ratio=2.5:attack=8:release=150:makeup=1.25"
ffmpeg -hide_banner -nostats -i build/mix.wav -af "$CHAIN,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2> build/loudnorm.txt
LN=$(python3 - <<'EOF'
import json, re
txt = open("build/loudnorm.txt").read()
j = json.loads(re.findall(r"\{[^{}]*\}", txt)[-1])
print(f"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
      f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}")
EOF
)
ffmpeg -hide_banner -loglevel error -y -i build/mix.wav \
  -af "$CHAIN,loudnorm=I=-16:TP=-1.5:LRA=11:$LN:linear=true,aresample=48000" \
  -c:a aac -b:a 192k build/audio.m4a

echo "== video frames ($JOBS parallel renderers)"
TOTAL=$(python3 -c "import json,math;print(math.ceil(json.load(open('build/timeline.json'))['duration']*$FPS))")
PER=$(( (TOTAL + JOBS - 1) / JOBS ))
PIDS=()
: > build/segs.txt
for i in $(seq 0 $((JOBS - 1))); do
  FROM=$((i * PER)); TO=$(( (i + 1) * PER )); [ $TO -gt $TOTAL ] && TO=$TOTAL
  node render.cjs --from $FROM --to $TO --out build/seg$i.mp4 &
  PIDS+=($!)
  echo "file 'seg$i.mp4'" >> build/segs.txt
done
for p in "${PIDS[@]}"; do wait "$p"; done

echo "== mux"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i build/segs.txt -i build/audio.m4a -i build/captions.srt \
  -map 0:v -map 1:a -map 2:s -c:v copy -c:a copy -c:s mov_text \
  -metadata title="Ninja Team — Product Operating System" -metadata:s:s:0 language=eng \
  -movflags +faststart "$OUT"
cp build/captions.srt "${OUT%.mp4}.srt"
ffprobe -hide_banner -v error -show_entries format=duration,size -of default=nw=1 "$OUT"
echo "done -> $OUT"
