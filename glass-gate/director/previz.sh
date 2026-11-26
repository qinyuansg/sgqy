#!/bin/bash
# Animatic: every Nth frame at low res/samples, muxed with the current mix, for timing and sync review.
#   director/previz.sh [blend] [step=3] [scale=25] [samples=4] [start] [end]
set -euo pipefail
cd "$(dirname "$0")/.."
BL=${1:-director/scene.blend}; STEP=${2:-3}; SCALE=${3:-25}; SPP=${4:-4}; A=${5:-0}; B=${6:-1559}
OUT=renders/previz; mkdir -p $OUT
/opt/blender-env/venv/bin/python director/render.py --blend "$BL" --out $OUT --start $A --end $B --step $STEP --preset test --samples $SPP --scale $SCALE --threads 4 --force 2>&1 | grep -E "\[done\]|Error|Traceback" || true
