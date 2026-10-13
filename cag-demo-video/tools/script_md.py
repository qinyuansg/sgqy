#!/usr/bin/env python3
"""Refresh the timecoded narration table in SCRIPT.md from $BUILD/timeline.json."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))
tl = json.load(open(os.path.join(BUILD, "timeline.json")))
fmt = lambda t: f"{int(t // 60)}:{t % 60:05.2f}"
rows = ["| # | Time | Scene | Narration (= English subtitles) |", "|---|---|---|---|"]
for i, l in enumerate(tl["lines"], 1):
    rows.append(f"| {i} | {fmt(l['start'])}–{fmt(l['end'])} | {l['scene']} | {l['en']} |")
rows.append(f"\nTotal: **{fmt(tl['total'])}**")
p = os.path.join(ROOT, "SCRIPT.md")
s = open(p, encoding="utf-8").read()
s = re.sub(r"<!-- VO-TABLE:START -->.*?<!-- VO-TABLE:END -->", "<!-- VO-TABLE:START -->\n" + "\n".join(rows) + "\n<!-- VO-TABLE:END -->", s, flags=re.S)
open(p, "w", encoding="utf-8").write(s)
print(f"SCRIPT.md: {len(tl['lines'])} narration rows, total {fmt(tl['total'])}")
