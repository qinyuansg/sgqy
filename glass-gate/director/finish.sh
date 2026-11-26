#!/bin/bash
# Mux the final frames and the mix into the deliverable mp4 (H.264 high, yuv420p, 60 fps, AAC 256k) + contact sheet.
#   director/finish.sh [frames_dir] [mix.wav] [out.mp4]
set -euo pipefail
cd "$(dirname "$0")/.."
FR=${1:-renders/final}; MIX=${2:-sound/out/mix.wav}; OUT=${3:-out/clear_passage.mp4}
mkdir -p out
ffmpeg -hide_banner -loglevel warning -y -framerate 60 -start_number 0 -i "$FR/f_%04d.png" -i "$MIX" \
  -vf "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 14 -maxrate 24M -bufsize 48M -profile:v high -level 4.2 -g 60 -bf 2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 26 "$OUT"
/opt/blender-env/venv/bin/python director/contact_sheet.py "$FR" out/contact_sheet.jpg
ffprobe -hide_banner -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,bit_rate,nb_frames,sample_rate,channels -show_entries format=duration,size -of default=nw=1 "$OUT"
