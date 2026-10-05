#!/usr/bin/env python3
"""ASS subtitles for the REVIEW copy only: shot id/timecode (top-left, in the letterbox bar) and sung lyric (bottom bar)."""
import json, os
R = os.path.join(os.path.dirname(__file__), '..', '..')
shots_path = os.path.join(R, 'shotlist', 'shots.json')
if not os.path.exists(shots_path): shots_path = os.path.join(R, 'shotlist', 'skeleton.json')
shots = json.load(open(shots_path)); timing = json.load(open(os.path.join(R, 'timing', 'timing.json')))
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"
print("""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Shot,WenQuanYi Zen Hei,26,&H0090B8D0,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,40,40,50,1
Style: Lyric,WenQuanYi Zen Hei,44,&H00F0F0F0,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,2,0,1,0,0,2,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text""")
for s in shots:
    a, b = s['in_frame'] / 24, s['out_frame'] / 24
    f = s['in_frame']; tc = f"{f//24//60:02d}:{f//24%60:02d}:{f%24:02d}"
    desc = (s.get('shot_size') or '') + ' ' + (f"{s['lens_mm']}mm" if s.get('lens_mm') else '')
    print(f"Dialogue: 0,{ts(a)},{ts(b)},Shot,,0,0,0,,{s['id']}  {tc}  {s.get('section','')}  {s.get('scene','')}  {desc}")
for l in timing['lines']:
    print(f"Dialogue: 0,{ts(l['start'])},{ts(l['end'])},Lyric,,0,0,0,,{l['text']}")
