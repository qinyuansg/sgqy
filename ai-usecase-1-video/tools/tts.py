#!/usr/bin/env python3
"""Voiceover + master timeline.

Reads script/vo.json, synthesises every line with Kokoro (offline), trims it,
lays the lines end-to-end using each line's `pre` gap, snaps subtitle cue
boundaries to real pauses in the audio, and writes:

  $BUILD/vo/<id>.wav        48 kHz mono PCM_24, trimmed
  $BUILD/timeline.json      lines, cues, total duration
  src/js/timeline.js        the same data for the film page (window.TL)

Usage: python3 tools/tts.py [--only v01,v02] [--phonemes]
Env:   KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin), BUILD
"""
import argparse, json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))
KOKORO_DIR = os.environ.get("KOKORO_DIR", os.path.join(ROOT, "models"))
SR_OUT = 48000


def trim(audio, sr, thresh_db=-48.0, pad=0.03):
    """Trim leading/trailing silence, keeping a short pad."""
    win = int(0.01 * sr)
    n = len(audio) // win
    if n == 0:
        return audio
    rms = np.sqrt(np.mean(audio[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    voiced = np.where(db > thresh_db)[0]
    if len(voiced) == 0:
        return audio
    a = max(0, voiced[0] * win - int(pad * sr))
    b = min(len(audio), (voiced[-1] + 1) * win + int(pad * sr))
    return audio[a:b]


def pauses(audio, sr, min_len=0.09, thresh_db=-38.0):
    """Return centres (s) of low-energy gaps longer than min_len."""
    hop = int(0.005 * sr)
    n = len(audio) // hop
    rms = np.sqrt(np.mean(audio[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    quiet = db < thresh_db
    out, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) * hop / sr >= min_len and i > 0 and j < n:
                out.append(((i + j) / 2) * hop / sr)
            i = j
        else:
            i += 1
    return out


def cue_bounds(chunks, dur, gaps):
    """Split [0,dur] into len(chunks) spans, snapping to the nearest pause."""
    if len(chunks) == 1:
        return [(0.0, dur)]
    weights = np.array([max(len(c), 1) for c in chunks], dtype=float)
    cum = np.cumsum(weights) / weights.sum()
    bounds, last = [0.0], 0.0
    for k in range(len(chunks) - 1):
        target = cum[k] * dur
        cands = [g for g in gaps if g > last + 0.4 and g < dur - 0.4]
        if cands:
            g = min(cands, key=lambda x: abs(x - target))
            if abs(g - target) > 0.9:  # no pause near: fall back to proportional
                g = target
        else:
            g = target
        bounds.append(g)
        last = g
    bounds.append(dur)
    return [(bounds[i], bounds[i + 1]) for i in range(len(chunks))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--phonemes", action="store_true")
    args = ap.parse_args()

    from kokoro_onnx import Kokoro

    vo = json.load(open(os.path.join(ROOT, "script", "vo.json")))
    k = Kokoro(os.path.join(KOKORO_DIR, "kokoro-v1.0.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    if args.phonemes:
        for ln in vo["lines"]:
            print(ln["id"], k.tokenizer.phonemize(ln["say"], lang=vo["lang"]))
        return

    only = set(filter(None, args.only.split(",")))
    os.makedirs(os.path.join(BUILD, "vo"), exist_ok=True)
    t = 0.0
    lines = []
    for ln in vo["lines"]:
        path = os.path.join(BUILD, "vo", ln["id"] + ".wav")
        if not only or ln["id"] in only or not os.path.exists(path):
            audio, sr = k.create(ln["say"], voice=vo["voice"], speed=vo["speed"], lang=vo["lang"])
            audio = trim(np.asarray(audio, dtype=np.float32), sr)
            audio = resample_poly(audio, SR_OUT, sr).astype(np.float32)
            sf.write(path, audio, SR_OUT, subtype="PCM_24")
            print(f"  synth {ln['id']}: {len(audio)/SR_OUT:5.2f}s  {ln['say'][:60]}")
        audio, sr = sf.read(path, dtype="float32")
        dur = len(audio) / sr
        start = t + ln["pre"]
        en_chunks = ln["en"].split("|")
        zh_chunks = ln["zh"].split("|")
        if len(en_chunks) != len(zh_chunks):
            sys.exit(f"{ln['id']}: EN has {len(en_chunks)} cues, ZH has {len(zh_chunks)}")
        spans = cue_bounds(en_chunks, dur, pauses(audio, sr))
        cues = [
            {"en": e.strip(), "zh": z.strip(), "start": round(start + a, 3), "end": round(start + b, 3), "burn_en": ln.get("burn_en", True)}
            for (a, b), e, z in zip(spans, en_chunks, zh_chunks)
        ]
        lines.append({
            "id": ln["id"], "scene": ln["scene"], "start": round(start, 3), "end": round(start + dur, 3),
            "dur": round(dur, 3), "en": ln["en"].replace("|", " "), "zh": ln["zh"].replace("|", ""), "cues": cues,
        })
        t = start + dur
    total = round(t + vo["tail"], 3)

    # scene windows: a scene opens 0.6 s before its first line (or at 0)
    scenes = {}
    for ln in lines:
        s = scenes.setdefault(ln["scene"], {"first": ln["start"], "last": ln["end"]})
        s["last"] = ln["end"]
    order = list(scenes.keys())
    first_pre = {}
    for ln in vo["lines"]:
        first_pre.setdefault(ln["scene"], ln["pre"])
    for i, sid in enumerate(order):
        lead = 0.0 if i == 0 else min(0.9, max(0.5, first_pre[sid] - 0.15))
        scenes[sid]["start"] = 0.0 if i == 0 else round(max(0.0, scenes[sid]["first"] - lead), 3)
    for i, sid in enumerate(order):
        scenes[sid]["end"] = scenes[order[i + 1]]["start"] if i + 1 < len(order) else total

    tl = {"fps": 30, "total": total, "lines": lines, "scenes": scenes, "order": order}
    json.dump(tl, open(os.path.join(BUILD, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "src", "js", "timeline.js"), "w") as f:
        f.write("// Generated by tools/tts.py from script/vo.json + measured voiceover. Do not edit.\n")
        f.write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
    print(f"total {total:.2f}s  ({len(lines)} lines)")
    for sid in order:
        s = scenes[sid]
        print(f"  {sid:4s} {s['start']:7.2f} → {s['end']:7.2f}  ({s['end']-s['start']:5.2f}s)")


if __name__ == "__main__":
    main()
