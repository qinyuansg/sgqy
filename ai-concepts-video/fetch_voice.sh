#!/usr/bin/env bash
# Downloads the Kokoro-82M voice model (Apache-2.0, ~330 MB) into ./kokoro for build.js.
# Source: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p kokoro/voices
R=https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main
[ -s kokoro/model.onnx ] || curl -fL --retry 3 -o kokoro/model.onnx "$R/onnx/model.onnx"
for v in af_heart af_bella bf_emma am_michael bm_george; do
  [ -s "kokoro/voices/$v.bin" ] || curl -fL --retry 3 -o "kokoro/voices/$v.bin" "$R/voices/$v.bin"
done
pip install -q kokoro-onnx soundfile
ls -la kokoro kokoro/voices
