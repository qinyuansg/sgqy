#!/usr/bin/env bash
# Downloads the full Noto Sans SC / Inter TTFs from Google Fonts (the repo only ships subsets).
set -e; cd "$(dirname "$0")"
for w in 400 500 700 900; do
  url=$(curl -sSL -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@$w" | grep -o "https://[^)]*\.ttf" | head -1)
  curl -sSL -o "NotoSansSC-$w.ttf" "$url"
done
for w in 400 600 800; do
  url=$(curl -sSL -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Inter:wght@$w" | grep -o "https://[^)]*\.ttf" | head -1)
  curl -sSL -o "Inter-$w.ttf" "$url"
done
ls -la *.ttf
