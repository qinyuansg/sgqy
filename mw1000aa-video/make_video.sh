#!/usr/bin/env bash
# Full pipeline: (optional) TTS -> parallel frame render -> concat -> mux narration + music.
# Usage: ./make_video.sh [segments=4] [fps=30]
set -euo pipefail
cd "$(dirname "$0")"
SEGS=${1:-4}; FPS=${2:-30}
TOTAL=$(node -e "global.window={};require('./timeline.js');console.log(window.TIMELINE.total)")
FRAMES=$(python3 -c "print(round($TOTAL*$FPS))")
mkdir -p build/seg
rm -f build/seg/seg_*.mp4 build/seg/list.txt
for ((k=0;k<SEGS;k++)); do
  F0=$(( FRAMES*k/SEGS )); F1=$(( FRAMES*(k+1)/SEGS ))
  T0=$(python3 -c "print($F0/$FPS)"); T1=$(python3 -c "print($F1/$FPS)")
  node render.js video build/seg/seg_$k.mp4 "$T0" "$T1" "$FPS" > build/seg/seg_$k.log 2>&1 &
  echo "file 'seg_$k.mp4'" >> build/seg/list.txt
done
wait
ffmpeg -y -loglevel error -f concat -safe 0 -i build/seg/list.txt -c copy build/video_noaudio.mp4
ffmpeg -y -loglevel error -i build/video_noaudio.mp4 -i build/narration.wav -i build/music.wav \
  -filter_complex "[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0[v];[2:a]aresample=48000[m];[v][m]amix=inputs=2:normalize=0:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest NUCTECH_MW1000AA_Product_Ecosystem_Explainer.mp4
echo done
