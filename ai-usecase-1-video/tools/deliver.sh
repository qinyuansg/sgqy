#!/usr/bin/env bash
# Two-pass H.264 delivery encodes sized for messaging (≤ 28 MiB each) + thumbnail.
# usage: tools/deliver.sh <master.mp4> <out.mp4> [title]
set -euo pipefail
IN="$1"; OUT="$2"; TITLE="${3:-AI Use Case 1 — AI-powered AGIL Secure ISMS for Airports}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
# total budget 28 MiB, minus 128 kb/s audio and ~2.5 % container overhead
VK=$(python3 -c "d=float('$DUR'); print(int((28*1024*1024*8/d/1000 - 128) * 0.975))")
LOG=$(mktemp -d)/x264
ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -tune animation -b:v ${VK}k -maxrate $((VK*3))k -bufsize $((VK*6))k \
  -pix_fmt yuv420p -g 60 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -pass 1 -passlogfile "$LOG" -an -f null /dev/null
ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -tune animation -b:v ${VK}k -maxrate $((VK*3))k -bufsize $((VK*6))k \
  -pix_fmt yuv420p -g 60 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -pass 2 -passlogfile "$LOG" \
  -c:a aac -b:a 128k -ar 48000 -movflags +faststart -metadata title="$TITLE" "$OUT"
echo "$(basename "$OUT"): ${VK} kb/s video, $(du -h "$OUT" | cut -f1)"
