#!/usr/bin/env bash
# Cut C (story) assets, run by build.sh after tools/assets.sh when CUT=story: crops the two sensing illustrations
# (AF-01 fence bay + strain traces, AF-04 airfield map; 2x renders) into src/assets/af/ and scans each crop for lavender.
# Env: AF_ILLUS (dir with AF-01-perimeter-triggered.png and AF-04-locate-nearest-cameras.png;
#      default $BUILD/../../sa245/assets/af, the illustration renders next to the uiflow2 work folder).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${AF_ILLUS:-${BUILD:?BUILD}/../../sa245/assets/af}"
[ -f "$SRC/AF-01-perimeter-triggered.png" ] && [ -f "$SRC/AF-04-locate-nearest-cameras.png" ] \
  || { echo "AF-01/AF-04 illustrations not found in $SRC (set AF_ILLUS)" >&2; exit 1; }
python3 tools/af-crops.py "$SRC" src/assets/af
