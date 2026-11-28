#!/bin/bash
# Frames + mix -> the deliverable mp4 (H.264 high, yuv420p, 60 fps, 1080x1350, AAC 256k) and the 12-frame contact sheet.
#   director/finish.sh [frames_dir] [mix.wav] [out.mp4]
# Post chain (picture): a motion-adaptive temporal filter against denoiser crawl, run on every shot separately so
# nothing bleeds across a cut; Lanczos resize to 1080x1350 if the frames were rendered smaller; a light unsharp
# after the resize; fine grain against banding in the dark studio.
set -euo pipefail
cd "$(dirname "$0")/.."
FR=${1:-renders/final}; MIX=${2:-sound/out/mix.wav}; OUT=${3:-out/clear_passage.mp4}
CUTS=${CUTS:-0,108,228,378,468,528,588,708,828,900,960,1080,1200,1254,1317,1440}   # first frame of every shot
NF=${NF:-1560}
TEMPORAL=${TEMPORAL:-atadenoise=0a=0.08:0b=0.16:1a=0.08:1b=0.16:2a=0.08:2b=0.16:s=7}
SHARP=${SHARP:-unsharp=5:5:0.35:5:5:0.0}
GRAIN=${GRAIN:-noise=c0s=2:c0f=t+u}
CRF=${CRF:-14}
PRESET=${PRESET:-slow}
PICKS=${PICKS:-0,150,345,440,507,650,760,880,990,1160,1290,1530}
mkdir -p "$(dirname "$OUT")"

IFS=, read -ra C <<< "$CUTS"
n=${#C[@]}; IN=(); FG=""; LBL=""
for ((i = 0; i < n; i++)); do
  s=${C[i]}; if ((i + 1 < n)); then e=${C[i + 1]}; else e=$NF; fi
  IN+=(-thread_queue_size 64 -framerate 60 -start_number "$s" -i "$FR/f_%04d.png")
  FG+="[$i:v]trim=end_frame=$((e - s)),setpts=PTS-STARTPTS,$TEMPORAL[v$i];"
  LBL+="[v$i]"
done
FG+="${LBL}concat=n=$n:v=1:a=0,scale=1080:1350:flags=lanczos,$SHARP,$GRAIN,"
FG+="scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p[v]"

ffmpeg -hide_banner -loglevel warning -y "${IN[@]}" -i "$MIX" -filter_complex "$FG" -map "[v]" -map "$n:a" \
  -r 60 -c:v libx264 -preset "$PRESET" -crf "$CRF" -maxrate 24M -bufsize 48M -profile:v high -level 4.2 -g 60 -bf 2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 26 "$OUT"
/opt/blender-env/venv/bin/python director/contact_sheet.py "$FR" "$(dirname "$OUT")/contact_sheet.jpg" f_ "$PICKS"
ffprobe -hide_banner -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,bit_rate,nb_frames,sample_rate,channels -show_entries format=duration,size -of default=nw=1 "$OUT"
