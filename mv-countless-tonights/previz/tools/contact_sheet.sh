#!/usr/bin/env bash
# One still per shot (mid-point) -> labelled contact sheets.  usage: tools/contact_sheet.sh out/sheets [w]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-out/sheets}; W=${2:-960}
mkdir -p "$OUT/frames"
IDS=$(python3 -c "import json,os;p='../shotlist/shots.json';p=p if os.path.exists(p) else '../shotlist/skeleton.json';print(','.join(s['id'] for s in json.load(open(p))))")
node render.mjs --w "$W" --shots "$IDS" --u 0.5 --stills "$OUT/frames" | tail -5
cd "$OUT/frames" && montage -label '%t' -font WenQuanYi-Zen-Hei -pointsize 14 -fill '#ccc' -background '#111' -tile 4x -geometry 480x+6+6 S*_u0.50_*.jpg ../contact_%02d.jpg && ls ../contact_*.jpg
