# -*- coding: utf-8 -*-
"""Render scenes -> PNG (Playwright), narration -> WAV (Piper), assemble -> MP4 (ffmpeg) with soft subtitles."""
import json, os, re, subprocess, sys, wave, html
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from scenes import SCENES

OUT = (Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "out").resolve()
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "frames").mkdir(exist_ok=True)
(OUT / "audio").mkdir(exist_ok=True)
(OUT / "slides").mkdir(exist_ok=True)
(OUT / "segs").mkdir(exist_ok=True)

VOICE_DIR = HERE.parent / "dl" / "vits-piper-en_US-ryan-high"
VOICE = VOICE_DIR / "en_US-ryan-high.onnx"
PAD_SEC = 0.9  # silence after each narration

CSS = """
@font-face{font-family:'ZH';src:local('WenQuanYi Zen Hei');}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0b1326;color:#e8eefb;
 font-family:'DejaVu Sans','Liberation Sans','WenQuanYi Zen Hei',sans-serif;-webkit-font-smoothing:antialiased}
body{background:radial-gradient(1200px 700px at 85% -10%,#15305e 0%,rgba(21,48,94,0) 60%),
 radial-gradient(900px 600px at -5% 110%,#102a4a 0%,rgba(16,42,74,0) 60%),#0b1326}
body{display:flex;flex-direction:column}
.top{flex:0 0 72px;display:flex;align-items:center;justify-content:space-between;
 padding:0 64px;border-bottom:1px solid rgba(120,160,230,.18);font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#8fb0e8}
.top .brand{font-weight:700;color:#cfe0ff}
.top .brand span{color:#4fa3ff}
.head{flex:0 0 auto;padding:22px 64px 0 64px}
.head .kicker{font-size:21px;letter-spacing:.08em;text-transform:uppercase;color:#4fa3ff;margin-bottom:10px}
.head h1{font-size:46px;line-height:1.1;font-weight:700;color:#ffffff;letter-spacing:-.01em}
.content{flex:1 1 auto;min-height:0;margin:26px 64px 20px 64px;display:flex;flex-direction:column;gap:22px}
.content > *{flex:0 0 auto}
.bottom{flex:0 0 56px;display:flex;align-items:center;justify-content:space-between;
 padding:0 64px;font-size:18px;color:#6f8ab8;border-top:1px solid rgba(120,160,230,.12)}
.progress{position:absolute;left:0;bottom:0;height:5px;background:linear-gradient(90deg,#4fa3ff,#7ed0ff)}
.accent{color:#4fa3ff}
b{color:#ffffff;font-weight:700}

/* cards */
.cards{display:grid;gap:20px;width:100%}
.cols1{grid-template-columns:1fr}.cols2{grid-template-columns:1fr 1fr}.cols3{grid-template-columns:repeat(3,1fr)}
.cols4{grid-template-columns:repeat(4,1fr)}.cols5{grid-template-columns:repeat(5,1fr)}
.card{background:rgba(255,255,255,.045);border:1px solid rgba(140,175,235,.22);border-radius:14px;padding:22px 24px;position:relative}
.card h3{font-size:25px;color:#dfe9ff;margin-bottom:10px;line-height:1.2}
.card .body{font-size:21px;line-height:1.42;color:#c3d1ea}
.card .tag{display:inline-block;margin-bottom:10px;font-size:14px;letter-spacing:.14em;color:#0b1326;background:#7ed0ff;border-radius:6px;padding:3px 9px;font-weight:700}
ul{list-style:none}
li{position:relative;padding-left:24px;margin:7px 0;line-height:1.38}
li:before{content:"";position:absolute;left:0;top:.56em;width:10px;height:10px;border-radius:50%;background:#4fa3ff}
.card .body ul li{font-size:20px}

/* flow */
.flow{display:flex;align-items:stretch;gap:10px;width:100%}
.flow .step{flex:1;background:linear-gradient(180deg,rgba(79,163,255,.22),rgba(79,163,255,.08));border:1px solid rgba(126,208,255,.45);border-radius:14px;padding:18px 20px}
.flow .step .main{font-size:27px;font-weight:700;color:#fff;margin-bottom:8px}
.flow .step .sub{font-size:19px;line-height:1.38;color:#c9d8f3}
.flow .arrow{align-self:center;font-size:54px;color:#4fa3ff;line-height:1;padding:0 2px}

/* tables */
.tbl{width:100%;border-collapse:collapse;font-size:21px;line-height:1.35}
.tbl th{text-align:left;font-size:17px;letter-spacing:.1em;text-transform:uppercase;color:#8fb0e8;padding:8px 14px;border-bottom:2px solid rgba(126,208,255,.45)}
.tbl td{padding:11px 14px;vertical-align:top;border-bottom:1px solid rgba(140,175,235,.16);color:#cfdbf2}
.tbl td:first-child{color:#fff;font-weight:700}
.tbl.small{font-size:18px}.tbl.small th{font-size:15px}.tbl.small td{padding:8px 12px}
.tbl.mid{font-size:20px}.tbl.mid td{padding:12px 14px}
.card .tbl{font-size:17px}.card .tbl td{padding:6px 8px}.card .tbl th{font-size:14px;padding:4px 8px}

/* w5 */
.w5{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;width:100%}
.w5c{background:rgba(255,255,255,.045);border:1px solid rgba(140,175,235,.22);border-radius:14px;padding:18px 20px}
.w5l{font-size:16px;letter-spacing:.2em;color:#4fa3ff;font-weight:700;margin-bottom:8px}
.w5b{font-size:19px;line-height:1.4;color:#cfdbf2}
.content > .w5 .w5b{font-size:24px;line-height:1.45}.content > .w5 .w5c{padding:24px 26px}.content > .w5{flex:1 1 auto}
.two .w5{grid-template-columns:repeat(2,1fr)}

.two{display:grid;gap:22px;width:100%}
.note{font-size:18px;color:#8fb0e8;border-left:3px solid #4fa3ff;padding:8px 16px;line-height:1.4;background:rgba(79,163,255,.06);border-radius:0 10px 10px 0}

/* hero */
.hero{display:flex;flex-direction:column;justify-content:center;height:100%;gap:26px}
.hero-kicker{font-size:22px;letter-spacing:.2em;color:#4fa3ff}
.hero-title{font-size:92px;line-height:1.02;font-weight:800;color:#fff;letter-spacing:-.02em}
.hero-sub{font-size:30px;color:#b9cbea;max-width:1400px;line-height:1.35}
.hero-cards{margin-top:20px}
.hero-cards .card h3{font-size:30px;color:#7ed0ff}

/* layers */
.layers{display:flex;flex-direction:column;gap:12px;height:100%;justify-content:center}
.layer{display:grid;grid-template-columns:330px 1fr;align-items:center;border-radius:14px;padding:20px 26px;border:1px solid rgba(140,175,235,.25)}
.layer .ln{font-size:22px;letter-spacing:.14em;font-weight:800;color:#fff}
.layer .lb{font-size:22px;line-height:1.4;color:#dfe9ff}
.l1{background:linear-gradient(90deg,rgba(79,163,255,.35),rgba(79,163,255,.1))}
.l2{background:linear-gradient(90deg,rgba(126,208,255,.3),rgba(126,208,255,.08))}
.l3{background:linear-gradient(90deg,rgba(255,196,87,.35),rgba(255,196,87,.1));border-color:rgba(255,196,87,.6)}
.l3 .ln{color:#ffd98a}
.l4{background:linear-gradient(90deg,rgba(170,140,255,.3),rgba(170,140,255,.08))}
.l5{background:linear-gradient(90deg,rgba(255,255,255,.12),rgba(255,255,255,.03))}
.l5 .ln{color:#b9cbea}

/* matrix */
.matrix{display:grid;grid-template-columns:44px 1fr 1fr;grid-template-rows:1fr 1fr 40px;gap:16px;height:100%}
.axis-y{grid-column:1;grid-row:1/3;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-size:17px;letter-spacing:.18em;color:#8fb0e8;align-self:center;justify-self:center}
.axis-x{grid-column:2/4;grid-row:3;text-align:center;font-size:17px;letter-spacing:.18em;color:#8fb0e8;align-self:end}
.quad{border-radius:14px;padding:18px 22px;border:1px solid rgba(140,175,235,.25);background:rgba(255,255,255,.04)}
.q-tl{grid-column:2;grid-row:1;background:linear-gradient(180deg,rgba(255,196,87,.22),rgba(255,196,87,.06));border-color:rgba(255,196,87,.5)}
.q-tr{grid-column:3;grid-row:1;background:linear-gradient(180deg,rgba(79,163,255,.3),rgba(79,163,255,.1));border-color:rgba(126,208,255,.6)}
.q-bl{grid-column:2;grid-row:2}.q-br{grid-column:3;grid-row:2}
.qn{font-size:16px;letter-spacing:.14em;color:#dfe9ff;font-weight:700;margin-bottom:12px}
.dot{font-size:24px;color:#e8eefb;padding:9px 0 9px 28px;position:relative;line-height:1.3}
.dot:before{content:"";position:absolute;left:0;top:.68em;width:13px;height:13px;border-radius:50%;background:#7ed0ff}
.dot.hot:before{background:#ffd98a;box-shadow:0 0 0 5px rgba(255,217,138,.25)}
.dot.cold:before{background:#6f8ab8}
.content > .matrix,.content > .layers{flex:1 1 auto;min-height:0}
.content.center{justify-content:center}
.two{align-items:stretch}.two > div{display:flex;flex-direction:column}.two > div > .cards{flex:1 1 auto}.two > div > .w5{flex:1 1 auto}
.card .body{font-size:22px}
.card .tbl{font-size:18px}.card .tbl td{padding:7px 8px}
/* stack */
.stack{display:flex;flex-direction:column;gap:12px}
.srow{display:grid;grid-template-columns:300px 1fr;gap:22px;align-items:center;border-radius:14px;padding:16px 24px;border:1px solid rgba(140,175,235,.25)}
.sl{font-size:20px;letter-spacing:.14em;font-weight:800;color:#fff}
.sb{font-size:20px;line-height:1.4;color:#dfe9ff}
.own{background:linear-gradient(90deg,rgba(255,196,87,.32),rgba(255,196,87,.08));border-color:rgba(255,196,87,.6)}
.cfg{background:linear-gradient(90deg,rgba(79,163,255,.32),rgba(79,163,255,.08))}
.adp{background:linear-gradient(90deg,rgba(126,208,255,.2),rgba(126,208,255,.05))}
.adp-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;font-size:17px;line-height:1.35;color:#cfdbf2}

.bigq{font-size:56px;font-weight:800;line-height:1.15;color:#fff;letter-spacing:-.01em;max-width:1600px}
.bigsub{font-size:25px;line-height:1.45;color:#b9cbea;max-width:1650px;margin-top:-6px}
"""

TEMPLATE = """<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><style>{css}</style></head>
<body>
<div class="top"><div class="brand">ST ENGINEERING <span>·</span> PRODUCT MANAGEMENT</div><div>{section}</div></div>
<div class="head"><div class="kicker">{kicker}</div><h1>{title}</h1></div>
<div class="content">{body}</div>
<div class="bottom"><div>Beijing conference recap · 3–4 Nov 2026 · CPO view for CEO · CTO · CMO · COO · CFO · CCO</div><div>{idx:02d} / {total:02d}</div></div>
<div class="progress" style="width:{pct:.1f}%"></div>
</body></html>"""

def write_slides():
    total = len(SCENES)
    paths = []
    for i, sc in enumerate(SCENES, 1):
        hero = "hero" in sc["html"][:200]
        head = "" if hero else f'<div class="head"><div class="kicker">{sc["kicker"]}</div><h1>{sc["title"]}</h1></div>'
        content_style = 'style="margin-top:0"' if hero else ""
        page = TEMPLATE.replace('<div class="head"><div class="kicker">{kicker}</div><h1>{title}</h1></div>', head)
        page = page.replace('<div class="content">', f'<div class="content" {content_style}>')
        page = page.format(title=html.escape(sc["title"]), css=CSS, section=sc["section"], kicker=sc["kicker"],
                           body=sc["html"], idx=i, total=total, pct=100.0 * i / total)
        p = OUT / "slides" / f"slide_{i:02d}.html"
        p.write_text(page, encoding="utf-8")
        paths.append(p)
    return paths

def render_frames(paths):
    script = OUT / "render.js"
    script.write_text("""
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const files = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const overflow = [];
  for (const [src, dst] of files) {
    await p.goto('file://' + src);
    await p.waitForTimeout(80);
    await p.evaluate(() => {
      const c = document.querySelector('.content');
      if (c.querySelector('.hero')) return;
      const avail = c.getBoundingClientRect().height;
      const w = document.createElement('div');
      w.className = 'fit';
      while (c.firstChild) w.appendChild(c.firstChild);
      c.appendChild(w);
      c.style.position = 'relative';
      Object.assign(w.style, { position: 'absolute', left: '0', top: '0', display: 'flex', flexDirection: 'column', gap: '22px', transformOrigin: '0 0' });
      const fixed = c.querySelector('.matrix') || c.querySelector('.layers');
      let z = 1, h = avail;
      if (fixed) {
        w.style.width = '1792px'; w.style.height = avail + 'px';
      } else {
        w.style.width = '1792px';
        const nat = w.offsetHeight;
        z = Math.min(1.3, 0.94 * avail / nat);
        for (let i = 0; i < 14; i++) {
          w.style.width = (1792 / z) + 'px';
          h = w.offsetHeight;
          if (h * z <= avail * 0.985 || z < 0.6) break;
          z *= 0.97;
        }
        w.style.transform = 'scale(' + z + ')';
        w.style.top = Math.max(0, (avail - h * z) / 2) + 'px';
      }
      c.dataset.zoom = z.toFixed(3); c.dataset.used = Math.round(h * z); c.dataset.avail = Math.round(avail);
    });
    await p.waitForTimeout(50);
    const ov = await p.evaluate(() => {
      const c = document.querySelector('.content');
      return { z: c.dataset.zoom, used: +c.dataset.used, avail: +c.dataset.avail };
    });
    if (ov.used > ov.avail * 1.01) overflow.push([src, ov]);
    console.log(require('path').basename(src), JSON.stringify(ov));
    await p.screenshot({ path: dst });
  }
  await b.close();
  fs.writeFileSync(process.argv[3], JSON.stringify(overflow, null, 1));
})();
""")
    pairs = [[str(p), str(OUT / "frames" / f"frame_{i:02d}.png")] for i, p in enumerate(paths, 1)]
    (OUT / "pairs.json").write_text(json.dumps(pairs))
    subprocess.run(["node", str(script), str(OUT / "pairs.json"), str(OUT / "overflow.json")], check=True)
    ov = json.loads((OUT / "overflow.json").read_text())
    for src, o in ov:
        print("OVERFLOW:", Path(src).name, o)
    return ov

def synth_audio():
    from piper import PiperVoice
    voice = PiperVoice.load(str(VOICE), config_path=str(VOICE) + ".json")
    durations = []
    for i, sc in enumerate(SCENES, 1):
        raw = OUT / "audio" / f"raw_{i:02d}.wav"
        final = OUT / "audio" / f"nar_{i:02d}.wav"
        if not final.exists():
            text = re.sub(r"\s+", " ", sc["narration"]).strip()
            with wave.open(str(raw), "wb") as w:
                voice.synthesize_wav(text, w)
            # pad with silence, normalise to 48k stereo
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                            f"apad=pad_dur={PAD_SEC},adelay=350|350,loudnorm=I=-16:TP=-1.5:LRA=11",
                            "-ar", "48000", "-ac", "2", str(final)], check=True)
        d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                           "-of", "csv=p=0", str(final)]).decode().strip())
        durations.append(d)
    return durations

def split_sentences(t):
    t = re.sub(r"\s+", " ", t).strip()
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9“\"'])", t)
    out = []
    for p in parts:
        # further split overly long sentences at ", and " / "; " / ": "
        if len(p) > 170:
            sub = re.split(r"(?<=[,;:])\s+", p)
            cur = ""
            for s in sub:
                if len(cur) + len(s) > 150 and cur:
                    out.append(cur.strip()); cur = s
                else:
                    cur = (cur + " " + s).strip()
            if cur: out.append(cur.strip())
        else:
            out.append(p)
    return [x for x in out if x]

def fmt_ts(s):
    h = int(s // 3600); m = int(s % 3600 // 60); sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}".replace(".", ",")

def write_srt(durations):
    lines = []; n = 1; t0 = 0.0
    for sc, d in zip(SCENES, durations):
        sents = split_sentences(sc["narration"])
        speech = d - PAD_SEC - 0.35
        total_chars = sum(len(s) for s in sents)
        t = t0 + 0.35
        for s in sents:
            dur = speech * len(s) / total_chars
            lines.append(f"{n}\n{fmt_ts(t)} --> {fmt_ts(t + dur - 0.05)}\n{s}\n")
            n += 1; t += dur
        t0 += d
    (OUT / "narration.srt").write_text("\n".join(lines), encoding="utf-8")

def assemble(durations, final_path):
    seg_list = OUT / "segs.txt"
    seg_paths = []
    for i, d in enumerate(durations, 1):
        seg = OUT / "segs" / f"seg_{i:02d}.mp4"
        if not seg.exists():
            vf = "format=yuv420p"
            if i == 1: vf += ",fade=t=in:st=0:d=0.8"
            if i == len(durations): vf += f",fade=t=out:st={max(d-1.0,0):.2f}:d=1.0"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "30",
                            "-i", str(OUT / "frames" / f"frame_{i:02d}.png"),
                            "-i", str(OUT / "audio" / f"nar_{i:02d}.wav"),
                            "-t", f"{d:.3f}", "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                            "-tune", "stillimage", "-r", "30", "-g", "60",
                            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-shortest", str(seg)], check=True)
        seg_paths.append(seg)
    seg_list.write_text("".join(f"file '{p}'\n" for p in seg_paths))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(seg_list),
                    "-i", str(OUT / "narration.srt"), "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
                    "-metadata:s:s:0", "language=eng", "-metadata", "title=Beijing Conference 2026 - CPO Recap",
                    "-movflags", "+faststart", str(final_path)], check=True)

if __name__ == "__main__":
    stage = sys.argv[2] if len(sys.argv) > 2 else "all"
    paths = write_slides()
    if stage in ("slides", "all"):
        render_frames(paths)
    if stage in ("audio", "all"):
        durations = synth_audio()
        (OUT / "durations.json").write_text(json.dumps(durations))
        print("total seconds:", round(sum(durations), 1), "scenes:", len(durations))
    if stage == "all":
        durations = json.loads((OUT / "durations.json").read_text())
        write_srt(durations)
        final = OUT / "Beijing_Conference_2026_CPO_Recap.mp4"
        assemble(durations, final)
        print("final:", final)
