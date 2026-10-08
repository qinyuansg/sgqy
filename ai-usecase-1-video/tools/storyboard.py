#!/usr/bin/env python3
"""One-page storyboard: a captioned key frame per scene, for quick review on a phone.

usage: python3 tools/storyboard.py <video.mp4> <out.jpg>
"""
import json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))
FONT = os.environ.get("SB_FONT", "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf")
LABELS = {
    "s01": "01 Cold open", "s02": "01 Alarm storm", "s03": "01 Six pain points", "s04": "01 Cost of doubt",
    "s05": "02 Solution", "s06": "03 Design principles", "s07": "04 One night shift",
    "m1": "04 02:14 Triage", "m2": "04 02:15 Respond", "m3": "04 02:16 Investigate", "m4": "04 05:10 Anticipate",
    "m5": "04 07:00 Report", "s13": "05 Capabilities", "s14": "06 Core value", "s15": "End card",
}


def main(video, out):
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    picks = []
    for sid in tl["order"]:
        lines = [l for l in tl["lines"] if l["scene"] == sid]
        t = lines[-1]["end"] - 0.2 if sid != "s15" else tl["total"] - 0.3
        picks.append((sid, t))
    tmp = tempfile.mkdtemp()
    files = []
    for i, (sid, t) in enumerate(picks):
        f = os.path.join(tmp, f"{i:02d}.png")
        label = LABELS.get(sid, sid).replace(":", r"\:")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1", "-vf",
                        f"scale=640:360,drawbox=x=0:y=0:w=iw:h=34:color=black@0.72:t=fill,"
                        f"drawtext=fontfile={FONT}:text='{label}':x=12:y=9:fontsize=17:fontcolor=white", f], check=True)
        files.append(f)
    cols, rows = 3, (len(files) + 2) // 3
    inputs = sum((["-i", f] for f in files), [])
    layout = "|".join(f"{(i % cols) * 640}_{(i // cols) * 360}" for i in range(len(files)))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex",
                    f"xstack=inputs={len(files)}:layout={layout}:fill=black", "-frames:v", "1", "-q:v", "3", out], check=True)
    print(f"storyboard {cols}x{rows} → {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
