#!/usr/bin/env bash
# Measure an audio/video file's loudness with ffmpeg's EBU R128 meter (true peak, 4x oversampled).
# usage: tools/truepeak.sh <file>   → prints "<integrated LUFS> <true peak dBTP>"
set -euo pipefail
ffmpeg -nostats -hide_banner -i "$1" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 | python3 -c '
import sys, re
t = sys.stdin.read().split("Summary:")[-1]
i = re.search(r"I:\s+(-?[0-9.]+) LUFS", t).group(1)
p = re.search(r"True peak:\s+Peak:\s+(-?[0-9.inf]+) dBFS", t).group(1)
print(i, p)'
