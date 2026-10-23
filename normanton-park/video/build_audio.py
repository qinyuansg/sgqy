"""Synthesize narration per scene with Kokoro (sherpa-onnx), build timing.js + narration.wav.
Usage: python3 build_audio.py [sid] [speed]   (needs ttslib.py on PYTHONPATH)"""
import json, re, sys, os, numpy as np, wave
sys.path.insert(0, os.environ.get('TTSLIB_DIR', '.'))
import ttslib
HERE = os.path.dirname(os.path.abspath(__file__))
SID = int(sys.argv[1]) if len(sys.argv) > 1 else 59
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
LEAD, GAP, TAIL = 0.9, 0.35, 1.3
src = open(os.path.join(HERE, 'scenes.js'), encoding='utf-8').read()
# scenes.js is JS; extract narration via a tiny node eval for robustness
import subprocess
scenes = json.loads(subprocess.check_output(['node', '-e', "const fs=require('fs');const w={};new Function('window',fs.readFileSync(process.argv[1],'utf8'))(w);console.log(JSON.stringify(w.SCENES.map(s=>({id:s.id,narration:s.narration||[],minDuration:s.minDuration||0,duration:s.duration||0}))))", os.path.join(HERE, 'scenes.js')]))
os.makedirs(os.path.join(HERE, 'audio'), exist_ok=True)
sr = None; track = []; timing = {}; t = 0.0
cache_dir = os.path.join(HERE, 'audio', 'cache'); os.makedirs(cache_dir, exist_ok=True)
import hashlib
for sc in scenes:
    caps = []; parts = []; local = LEAD
    for sent in sc['narration']:
        key = hashlib.md5(f"{SID}|{SPEED}|{sent}".encode()).hexdigest()
        cp = os.path.join(cache_dir, key + '.npy')
        if os.path.exists(cp): s = np.load(cp); sr = sr or 24000
        else:
            s, sr = ttslib.synth(sent, SID, SPEED); np.save(cp, s)
        # trim leading/trailing silence
        idx = np.where(np.abs(s) > 0.01)[0]
        if len(idx): s = s[max(0, idx[0] - int(0.05*sr)): idx[-1] + int(0.12*sr)]
        caps.append({'start': round(local, 3), 'end': round(local + len(s)/sr, 3), 'text': sent})
        parts.append((local, s)); local += len(s)/sr + GAP
    dur = max(local - GAP + TAIL, sc['minDuration'] or 0, sc['duration'] or 0)
    timing[sc['id']] = {'duration': round(dur, 3), 'captions': caps}
    buf = np.zeros(int(dur * sr), dtype=np.float32)
    for st, s in parts:
        i = int(st * sr); n = min(len(s), len(buf) - i); buf[i:i+n] += s[:n]
    track.append(buf); t += dur
    print(f"{sc['id']:>14} {dur:6.1f}s  sentences={len(caps)}")
full = np.concatenate(track)
# gentle fades per sentence are inherent; normalize peak to -1 dBFS
peak = np.abs(full).max(); full = full / peak * 0.89 if peak > 0 else full
ttslib.save_wav(os.path.join(HERE, 'audio', 'narration.wav'), full, sr)
open(os.path.join(HERE, 'timing.js'), 'w', encoding='utf-8').write('window.TIMING=' + json.dumps(timing, ensure_ascii=False) + ';\n')
print(f"total {t:.1f}s -> audio/narration.wav, timing.js")
