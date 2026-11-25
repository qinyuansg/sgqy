"""Synthesize the narration with Kokoro (local neural TTS) and build the timeline.

Outputs (in build/):
  beats/<id>.wav      one clip per spoken line (cached by text+voice+speed)
  narration.wav       the full narration track, pauses included
  timeline.json       scene and beat start/end times, used by the renderer
  captions.srt        subtitles

Usage: python tts.py [--model-dir DIR] [--voice am_michael] [--speed 0.94]
"""
import argparse, hashlib, json, os, re, sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from script import SCENES, SAY_FIXES  # noqa: E402

SR = 24000
DEFAULT_PRE = 0.9    # silence after a scene appears, before the first line
DEFAULT_POST = 0.25  # silence after the last line of a scene


def spoken(beat):
    s = beat["say"] or beat["text"]
    if beat["say"]:
        return s
    for a, b in SAY_FIXES:
        s = re.sub(r"(?<![A-Za-z])" + re.escape(a.strip()) + r"(?![A-Za-z'])", b.strip(), s)
    return s


def fmt_ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def split_caption(text, limit=84):
    """Split a line into caption chunks at sentence boundaries."""
    sents = re.findall(r"[^.?!]+[.?!]+[\"']?|[^.?!]+$", text)
    sents = [s.strip() for s in sents if s.strip()]
    chunks, cur = [], ""
    for s in sents:
        if cur and len(cur) + 1 + len(s) > limit:
            chunks.append(cur)
            cur = s
        else:
            cur = (cur + " " + s).strip()
    if cur:
        chunks.append(cur)
    return chunks or [text]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default=os.environ.get("KOKORO_DIR", "."))
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--speed", type=float, default=0.94)
    ap.add_argument("--out", default=os.path.join(HERE, "build"))
    args = ap.parse_args()

    os.makedirs(os.path.join(args.out, "beats"), exist_ok=True)
    kokoro = None

    def synth(beat):
        nonlocal kokoro
        text = spoken(beat)
        key = hashlib.sha1(f"{text}|{args.voice}|{args.speed}".encode()).hexdigest()[:12]
        path = os.path.join(args.out, "beats", f"{beat['id']}.{key}.wav")
        if not os.path.exists(path):
            if kokoro is None:
                from kokoro_onnx import Kokoro
                kokoro = Kokoro(os.path.join(args.model_dir, "kokoro-v1.0.onnx"),
                                os.path.join(args.model_dir, "voices-v1.0.bin"))
            audio, sr = kokoro.create(text, voice=args.voice, speed=args.speed, lang="en-us")
            assert sr == SR
            audio = np.asarray(audio, dtype=np.float32)
            # 8 ms fades so clips never click
            f = int(0.008 * SR)
            audio[:f] *= np.linspace(0, 1, f)
            audio[-f:] *= np.linspace(1, 0, f)
            sf.write(path, audio, SR)
            print(f"  synth {beat['id']:8s} {len(audio)/SR:5.2f}s  {text}")
        audio, _ = sf.read(path, dtype="float32")
        return audio

    pieces, cursor = [], 0.0
    timeline = {"scenes": [], "beats": {}}
    captions = []

    def silence(sec):
        nonlocal cursor
        n = int(round(sec * SR))
        pieces.append(np.zeros(n, dtype=np.float32))
        cursor += n / SR

    for sc in SCENES:
        s_start = cursor
        silence(sc.get("pre", DEFAULT_PRE))
        for b in sc["beats"]:
            audio = synth(b)
            start = cursor
            pieces.append(audio)
            cursor += len(audio) / SR
            timeline["beats"][b["id"]] = {"start": round(start, 3), "end": round(cursor, 3)}
            # captions: split long lines proportionally by length
            chunks = split_caption(b["text"])
            total = sum(len(c) for c in chunks)
            t = start
            for c in chunks:
                d = (cursor - start) * len(c) / total
                captions.append((t, t + d, c))
                t += d
            silence(b["pause"])
        silence(sc.get("post", DEFAULT_POST))
        timeline["scenes"].append({"id": sc["id"], "start": round(s_start, 3), "end": round(cursor, 3)})

    timeline["duration"] = round(cursor, 3)
    audio = np.concatenate(pieces)
    sf.write(os.path.join(args.out, "narration.wav"), audio, SR)
    with open(os.path.join(args.out, "timeline.json"), "w") as f:
        json.dump(timeline, f, indent=1)
    with open(os.path.join(args.out, "captions.srt"), "w") as f:
        for i, (a, b, c) in enumerate(captions, 1):
            nxt = captions[i][0] if i < len(captions) else b + 1.0
            f.write(f"{i}\n{fmt_ts(a)} --> {fmt_ts(min(b + 0.4, nxt - 0.02))}\n{c}\n\n")
    # readable transcript, grouped by chapter, with timestamps
    with open(os.path.join(HERE, "NARRATION.md"), "w") as f:
        f.write("# The Ninja Team — Product Operating System\n\nNarration transcript "
                "(generated from `script.py` by `tts.py`).\n")
        for sc, st in zip(SCENES, timeline["scenes"]):
            m, s = divmod(int(st["start"]), 60)
            f.write(f"\n## {sc['chapter'] or 'Opening'}  `{m}:{s:02d}`\n\n")
            f.write(" ".join(b["text"] for b in sc["beats"]) + "\n")
    words = sum(len(b["text"].split()) for sc in SCENES for b in sc["beats"])
    print(f"duration {cursor/60:.2f} min, {words} words, {len(timeline['beats'])} beats")


if __name__ == "__main__":
    main()
