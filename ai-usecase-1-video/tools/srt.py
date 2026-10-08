#!/usr/bin/env python3
"""Subtitle deliverables from the measured timeline.

Writes $BUILD/subs/{EN,ZH,EN-ZH}.srt and $BUILD/subs/cues.json (for the
burned-in overlay). Optionally (--fonts PKG_DIR) copies just the Noto Sans SC
woff2 slices the Chinese subtitles need into src/fonts/notosc/ + src/css/notosc.css.
"""
import argparse, json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get("BUILD", os.path.join(ROOT, "build"))


def zh_flat(z):
    """Remove `/` line-break hints; keep a space only between a CJK ideograph and Latin text/digits."""
    out = []
    for i, ch in enumerate(z):
        if ch != "/":
            out.append(ch); continue
        a = z[i - 1] if i else ""
        b = z[i + 1] if i + 1 < len(z) else ""
        latin = lambda c: c.isascii() and (c.isalnum() or c in "®)") or c == "®"
        cjk = lambda c: "\u4e00" <= c <= "\u9fff"
        if (latin(a) and cjk(b)) or (cjk(a) and latin(b)):
            out.append(" ")
    return "".join(out)


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


def wrap_zh(s, width=18):
    """Two-line wrap that only breaks between words (jieba), preferring punctuation/spaces near the middle."""
    if len(s) <= width:
        return [s]
    try:
        import jieba
        jieba.setLogLevel(60)
        bounds, i = set(), 0
        for tok in jieba.cut(s):
            i += len(tok); bounds.add(i)
    except ImportError:
        bounds = {i for i in range(1, len(s)) if s[i - 1] in "，、：；。 " or s[i] == " "}
    cands = [i for i in sorted(bounds) if 3 <= i <= len(s) - 3]
    def cost(i):
        a, b = s[:i].rstrip(), s[i:].lstrip()
        over = max(0, len(a) - width) + max(0, len(b) - width)
        bonus = 4 if s[i - 1] in "，、：；" else 2 if (s[i - 1] == " " or s[i] == " ") else 0
        return over * 10 + abs(len(a) - len(b)) / 2 - bonus
    k = min(cands, key=cost) if cands else len(s) // 2
    return [s[:k].rstrip(), s[k:].lstrip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts", default="")
    args = ap.parse_args()
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    cues = [c for l in tl["lines"] for c in l["cues"]]
    # extend each cue slightly for readability, never into the next one
    for i, c in enumerate(cues):
        nxt = cues[i + 1]["start"] if i + 1 < len(cues) else c["end"] + 2
        c["show_end"] = round(min(nxt - 0.04, max(c["end"] + 0.35, c["start"] + 1.2)), 3)
    os.makedirs(os.path.join(BUILD, "subs"), exist_ok=True)
    def write(name, fn):
        with open(os.path.join(BUILD, "subs", name), "w", encoding="utf-8") as f:
            for i, c in enumerate(cues, 1):
                f.write(f"{i}\n{ts(c['start'])} --> {ts(c['show_end'])}\n{fn(c)}\n\n")
    # "/" in a Chinese cue is a hand-placed line break for the two-line ZH SRT
    zh_lines = lambda z: [x.strip() for x in z.split("/")] if "/" in z else wrap_zh(z)
    write("EN.srt", lambda c: "\n".join(wrap_en(c["en"])))
    write("ZH.srt", lambda c: "\n".join(zh_lines(c["zh"])))
    for c in cues:
        c["zh"] = zh_flat(c["zh"])
    write("EN-ZH.srt", lambda c: c["en"] + "\n" + c["zh"])
    json.dump(cues, open(os.path.join(BUILD, "subs", "cues.json"), "w"), ensure_ascii=False, indent=1)
    print(len(cues), "cues; max EN len", max(len(c["en"]) for c in cues), "; max ZH len", max(len(c["zh"]) for c in cues))

    if args.fonts:
        chars = set("".join(c["zh"] for c in cues))
        css = open(os.path.join(args.fonts, "500.css"), encoding="utf-8").read()
        out_dir = os.path.join(ROOT, "src", "fonts", "notosc"); os.makedirs(out_dir, exist_ok=True)
        rules = []
        for block in re.findall(r"@font-face \{.*?\}", css, flags=re.S):
            fname = re.search(r"url\(\./files/([^)]+\.woff2)\)", block).group(1)
            ranges = re.search(r"unicode-range: ([^;]+);", block).group(1)
            spans = []
            for r in ranges.split(","):
                r = r.strip()[2:]
                a, _, b = r.partition("-")
                spans.append((int(a, 16), int(b or a, 16)))
            if any(any(a <= ord(ch) <= b for a, b in spans) for ch in chars):
                shutil.copy(os.path.join(args.fonts, "files", fname), os.path.join(out_dir, fname))
                rules.append(f"@font-face {{ font-family: 'NotoSC'; font-weight: 500; font-display: block; src: url(../fonts/notosc/{fname}) format('woff2'); unicode-range: {ranges}; }}")
        open(os.path.join(ROOT, "src", "css", "notosc.css"), "w").write("/* Noto Sans SC (OFL) — only the slices the Chinese subtitles use. Generated by tools/srt.py. */\n" + "\n".join(rules) + "\n")
        print(f"Noto Sans SC: {len(rules)} slices for {len(chars)} distinct characters")


if __name__ == "__main__":
    main()
