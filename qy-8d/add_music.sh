#!/usr/bin/env bash
# 给无声视频配上音乐：音乐比视频短会自动循环，长则截断；首尾自动淡入淡出。
#   ./add_music.sh qy-8d-silent.mp4 你的音乐.mp3 输出.mp4 [音乐起始秒数]
set -euo pipefail
VIDEO=${1:?无声视频}; MUSIC=${2:?音乐文件}; OUT=${3:-qy-8d-with-music.mp4}; START=${4:-0}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
FADE_OUT_AT=$(awk "BEGIN{print $DUR-3.5}")
ffmpeg -y -loglevel error -i "$VIDEO" -stream_loop -1 -ss "$START" -i "$MUSIC" \
  -map 0:v -map 1:a -t "$DUR" -c:v copy -c:a aac -b:a 192k \
  -af "afade=t=in:d=1.5,afade=t=out:st=${FADE_OUT_AT}:d=3.5" -movflags +faststart "$OUT"
echo "→ $OUT"
