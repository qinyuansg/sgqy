"""Natural-sounding narration with Kokoro-82M (Apache-2.0), run offline via kokoro-onnx.

Usage: python3 tts_kokoro.py <model_dir> <voice> <speed> <jobs.json>
  model_dir: holds model.onnx and voices/<voice>.bin (from onnx-community/Kokoro-82M-v1.0-ONNX)
  jobs.json: [{"text": "...", "out": "/path/file.wav"}, ...]
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

model_dir, voice, speed, jobs_file = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]

# kokoro-onnx expects one .npz holding every voice; the HF repo ships one raw float32 .bin per voice.
vdir = os.path.join(model_dir, "voices")
npz = os.path.join(model_dir, "voices.npz")
bins = sorted(f for f in os.listdir(vdir) if f.endswith(".bin"))
np.savez(npz, **{f[:-4]: np.fromfile(os.path.join(vdir, f), dtype=np.float32).reshape(-1, 1, 256) for f in bins})

tts = Kokoro(os.path.join(model_dir, "model.onnx"), npz)
jobs = json.load(open(jobs_file))
for i, job in enumerate(jobs, 1):
    samples, sr = tts.create(job["text"], voice=voice, speed=speed, lang="en-us", sentence_pause=0.35, clause_pause=0.12)
    sf.write(job["out"], samples, sr)
    print(f"[{i}/{len(jobs)}] {os.path.basename(job['out'])}", flush=True)
