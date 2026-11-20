#!/usr/bin/env bash
# Full pipeline: data -> basemap -> tracks -> frames (4 parallel workers) -> audio -> final MP4
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p work/seg out
[ -f data/ne_10m_land.geojson ] || { echo "run sim/fetch_data.sh first"; exit 1; }
[ -f work/basemap.png ] || python3 sim/basemap.py
python3 sim/tracks.py
FRAMES=$(python3 -c "import sys; sys.path.insert(0,'sim'); import scene as S; print(int(S.DURATION*S.FPS))")
JOBS=${JOBS:-4}; CH=$(( (FRAMES + JOBS*3 - 1) / (JOBS*3) ))
rm -f work/seg/*.mp4 work/seg/list.txt
for ((a=0; a<FRAMES; a+=CH)); do
  b=$(( a+CH < FRAMES ? a+CH : FRAMES ))
  printf "%s %s work/seg/seg_%05d.mp4\n" $a $b $a
done | xargs -P "$JOBS" -L 1 sh -c 'python3 sim/render.py chunk "$0" "$1" "$2" 2>&1 | grep -v Warning | tail -1'
for f in work/seg/seg_*.mp4; do echo "file '$(basename "$f")'" >> work/seg/list.txt; done
python3 sim/audio.py
ffmpeg -y -loglevel error -f concat -safe 0 -i work/seg/list.txt -i work/soundtrack.wav \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest out/ukraine_air_attack_19-20_nov_2026.mp4
ls -lh out/
