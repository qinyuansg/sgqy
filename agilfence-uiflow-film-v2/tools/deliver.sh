#!/usr/bin/env bash
# Two-pass H.264 delivery encode sized for messaging (≤ 28 MiB); the AAC audio is re-measured after
# encoding and its gain trimmed until the file is at or below −3.0 dBTP.
# usage: tools/deliver.sh <master.mp4> <out.mp4> [title]
set -euo pipefail
IN="$1"; OUT="$2"; TITLE="${3:-AgilFence UI flow — AGIL Secure V11}"
HERE="$(cd "$(dirname "$0")" && pwd)"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
# total budget 28 MiB, minus 128 kb/s audio and a 0.975 container-overhead factor; never above 12 Mb/s
VK=$(python3 -c "d=float('$DUR'); print(min(12000, int((28*1024*1024*8/d/1000 - 128) * 0.975)))")
TMP=$(mktemp -d); LOG=$TMP/x264
ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -tune animation -b:v ${VK}k -maxrate $((VK*3))k -bufsize $((VK*6))k \
  -pix_fmt yuv420p -g 60 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -pass 1 -passlogfile "$LOG" -an -f null /dev/null
ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -tune animation -b:v ${VK}k -maxrate $((VK*3))k -bufsize $((VK*6))k \
  -pix_fmt yuv420p -g 60 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -pass 2 -passlogfile "$LOG" -an "$TMP/v.mp4"
G=0
for k in 1 2 3 4; do
  ffmpeg -y -loglevel error -i "$TMP/v.mp4" -i "$IN" -map 0:v -map 1:a -c:v copy -af "volume=${G}dB" -c:a aac -b:a 128k -ar 48000 \
    -movflags +faststart -metadata title="$TITLE" "$OUT"
  read -r LI TP < <("$HERE/truepeak.sh" "$OUT")
  echo "  audio gain ${G} dB → ${LI} LUFS, ${TP} dBTP"
  G=$(python3 -c "tp=float('$TP'); g=float('$G'); print('ok' if tp <= -3.0 else round(g + (-3.15 - tp), 2))")
  [ "$G" = ok ] && break
done
[ "$G" = ok ] || { echo "true peak still above −3.0 dBTP" >&2; exit 1; }
echo "$(basename "$OUT"): ${VK} kb/s video, $(du -h "$OUT" | cut -f1)"
