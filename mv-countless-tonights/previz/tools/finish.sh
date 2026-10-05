#!/usr/bin/env bash
# Letterbox to 1920x1080 (2.39:1 active 1920x804), mux the original song, and make a review copy with
# shot ids + lyrics burned in.   usage: tools/finish.sh out/film/previz_raw.mp4 out/film/countless_tonights_previz
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=$1; BASE=$2; SONG=../audio/song.mp3
python3 tools/make_review_ass.py > "${BASE}_review.ass"
ffmpeg -hide_banner -loglevel error -y -i "$RAW" -i "$SONG" -map 0:v -map 1:a \
  -vf "scale=1920:804:flags=lanczos,pad=1920:1080:0:138:black,setsar=1" \
  -c:v libx264 -preset slow -crf 19 -tune film -pix_fmt yuv420p -r 24 \
  -c:a aac -b:a 320k -t 256.824 -movflags +faststart "${BASE}.mp4"
ffmpeg -hide_banner -loglevel error -y -i "${BASE}.mp4" -map 0 \
  -vf "ass=${BASE}_review.ass" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -c:a copy -movflags +faststart "${BASE}_review.mp4"
for f in "${BASE}.mp4" "${BASE}_review.mp4"; do
  echo "$f: $(ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$f" | tr '\n' ' ')"
done
