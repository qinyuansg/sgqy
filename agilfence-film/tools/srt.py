#!/usr/bin/env python3
"""English subtitle deliverables from the measured timeline.

Writes $BUILD/subs/EN.srt and $BUILD/subs/cues.json (for the burned-in overlay).
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))


def ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def wrap_en(s, width=42):
    if len(s) <= width:
        return [s]
    words, best = s.split(), None
    for i in range(1, len(words)):  # most balanced split that fits
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if len(a) <= width and len(b) <= width:
            score = abs(len(a) - len(b))
            if best is None or score < best[0]:
                best = (score, [a, b])
    return best[1] if best else [s]


def main():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    cues = [c for l in tl["lines"] for c in l["cues"]]
    # extend each cue slightly for readability, never into the next one
    for i, c in enumerate(cues):
        nxt = cues[i + 1]["start"] if i + 1 < len(cues) else c["end"] + 2
        c["show_end"] = round(min(nxt - 0.04, max(c["end"] + 0.35, c["start"] + 1.2)), 3)
        c["lines"] = wrap_en(c["en"])
    os.makedirs(os.path.join(BUILD, "subs"), exist_ok=True)
    with open(os.path.join(BUILD, "subs", "EN.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['show_end'])}\n" + "\n".join(c["lines"]) + "\n\n")
    json.dump(cues, open(os.path.join(BUILD, "subs", "cues.json"), "w"), ensure_ascii=False, indent=1)
    cps = max(len(c["en"]) / (c["show_end"] - c["start"]) for c in cues)
    print(len(cues), "cues; max line", max(len(x) for c in cues for x in c["lines"]), "chars; max", round(cps, 1), "chars/s")


if __name__ == "__main__":
    main()
