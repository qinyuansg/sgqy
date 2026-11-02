#!/usr/bin/env python3
"""Write subtitles (SRT) from timeline.js caption chunks."""
import json, os, sys
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = open(os.path.join(here, "timeline.js")).read()
tl = json.loads(src[src.index("{"): src.rindex("}") + 1])
chunks = [c for ch in tl["chapters"] for b in ch["beats"] for c in b["chunks"]]
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
out = []
for i, c in enumerate(chunks):
    nxt = chunks[i + 1]["t0"] if i + 1 < len(chunks) else c["t1"] + 0.35
    end = nxt if nxt - c["t1"] < 0.8 else c["t1"] + 0.35
    out.append(f"{i + 1}\n{ts(c['t0'])} --> {ts(end)}\n{c['text']}\n")
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "NUCTECH_MW1000AA_Product_Ecosystem_Explainer.srt")
open(path, "w").write("\n".join(out))
print(len(chunks), "cues ->", path)
