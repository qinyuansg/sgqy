#!/bin/bash
# Frames + mix -> the deliverable mp4 (H.264 high, yuv420p, 60 fps, 1080x1350, AAC 256k) and the 12-frame contact sheet.
#   director/finish.sh [frames_dir] [mix.wav] [out.mp4]
# Post chain (picture): Lanczos resize to 1080x1350 if the frames were rendered smaller, a mild motion-adaptive
# temporal filter against denoiser crawl, a light unsharp after the resize, fine grain against banding in the dark studio.
set -euo pipefail
cd "$(dirname "$0")/.."
FR=${1:-renders/final}; MIX=${2:-sound/out/mix.wav}; OUT=${3:-out/clear_passage.mp4}
TEMPORAL=${TEMPORAL:-atadenoise=0a=0.08:0b=0.16:1a=0.08:1b=0.16:2a=0.08:2b=0.16:s=7}
SHARP=${SHARP:-unsharp=5:5:0.35:5:5:0.0}
GRAIN=${GRAIN:-noise=c0s=2:c0f=t+u}
CRF=${CRF:-14}
mkdir -p out
ffmpeg -hide_banner -loglevel warning -y -framerate 60 -start_number 0 -i "$FR/f_%04d.png" -i "$MIX" \
  -vf "$TEMPORAL,scale=1080:1350:flags=lanczos,$SHARP,$GRAIN,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p" \
  -c:v libx264 -preset slow -crf $CRF -maxrate 24M -bufsize 48M -profile:v high -level 4.2 -g 60 -bf 2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 26 "$OUT"
/opt/blender-env/venv/bin/python director/contact_sheet.py "$FR" out/contact_sheet.jpg
ffprobe -hide_banner -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,bit_rate,nb_frames,sample_rate,channels -show_entries format=duration,size -of default=nw=1 "$OUT"
