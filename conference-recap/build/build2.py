# -*- coding: utf-8 -*-
"""Motion video builder: narration (Piper) -> timeline JSON -> HTML engine -> frame capture piped into ffmpeg -> mux."""
import json, os, re, subprocess, sys, wave
from pathlib import Path
HERE = Path(__file__).parent.resolve()
sys.path.insert(0, str(HERE))
from scenes2 import SCENES

OUT = (HERE / "out").resolve(); OUT.mkdir(exist_ok=True); (OUT / "audio").mkdir(exist_ok=True)
VOICE = HERE.parent / "dl" / "vits-piper-en_US-ryan-high" / "en_US-ryan-high.onnx"
PAD = 0.9; LEAD = 0.35; FPS = 25

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0a1222;color:#e8eefb;font-family:'DejaVu Sans','Liberation Sans','Noto Color Emoji',sans-serif}
body{--bx:50%;--by:30%;background:radial-gradient(1100px 700px at var(--bx) var(--by),#17356b 0%,rgba(23,53,107,0) 60%),radial-gradient(900px 600px at 10% 110%,#0f2a4c 0%,rgba(15,42,76,0) 60%),#0a1222}
#stage{position:absolute;inset:0}
.scene{position:absolute;inset:0;padding:110px 64px 60px 64px}
#chapter{position:absolute;left:64px;top:30px;font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:#8fb0e8}
#brand{position:absolute;right:64px;top:30px;font-size:18px;letter-spacing:.14em;color:#6f8ab8;text-transform:uppercase}
#progress{position:absolute;left:0;bottom:0;height:6px;background:linear-gradient(90deg,#4fa3ff,#7ed0ff)}
.hdr{margin-bottom:26px}
.hk{font-size:22px;letter-spacing:.06em;color:#8fb0e8;margin-bottom:10px;display:flex;align-items:center;gap:12px}
.hicon{font-size:30px}.hname{font-weight:800;text-transform:uppercase;letter-spacing:.12em}.hpersona{color:#b9cbea;letter-spacing:0}
.ht{font-size:46px;font-weight:800;line-height:1.12;color:#fff;letter-spacing:-.01em}
/* vignettes */
.vtitle{text-align:left;margin-bottom:30px}.vk{font-size:20px;letter-spacing:.2em;color:#4fa3ff;margin-bottom:10px}.vt{font-size:64px;font-weight:800;color:#fff}
.vrow{display:flex;gap:30px;justify-content:space-between}
.vpanel{width:572px;height:420px;background:rgba(255,255,255,.04);border:1px solid rgba(140,175,235,.25);border-radius:18px;padding:22px 26px;position:relative;transform-origin:50% 50%}
.vlab{font-size:22px;letter-spacing:.12em;color:#ffd166;text-transform:uppercase;margin-bottom:12px}
.vart{height:300px;position:relative}
.vq{position:absolute;right:26px;top:14px;font-size:64px;font-weight:900;color:#ffd166;opacity:0}
.qgrid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;font-size:40px;line-height:1}
.qp{opacity:.08;transition:none}
.qcount{position:absolute;left:0;bottom:-6px;font-size:22px;color:#ffd166}
.pp{display:flex;gap:30px;align-items:center;height:100%}
.ppbook{font-size:150px;position:relative;line-height:1}
.scanbar{position:absolute;left:0;right:0;height:5px;background:#4fa3ff;box-shadow:0 0 16px #4fa3ff;opacity:0}
.ppst{display:flex;flex-direction:column;gap:14px}
.pps{font-size:24px;color:#e8eefb;background:rgba(255,255,255,.06);padding:10px 16px;border-radius:10px;border-left:4px solid #ff8fa3;opacity:0}
.pps:first-child{border-left-color:#4fa3ff}
.vquestion{margin-top:40px;font-size:54px;font-weight:800;color:#fff;line-height:1.2;opacity:0}.vquestion span{color:#7ed0ff}
.vdate{margin-top:18px;font-size:26px;color:#b9cbea;opacity:0}
/* ring */
.ring{position:absolute;inset:0}.ringsvg{position:absolute;inset:0;width:1920px;height:1080px}
.core{position:absolute;width:300px;height:160px;border-radius:24px;z-index:2;background:linear-gradient(180deg,#2a5aa8,#17356b);border:2px solid rgba(126,208,255,.8);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:14px;opacity:0}
.core.big{width:380px}.corei{font-size:34px;font-weight:800;color:#fff}.cores{font-size:17px;color:#cfe0ff;margin-top:8px;line-height:1.3}
.badge,.spoke{position:absolute;width:300px;height:140px;border-radius:16px;background:#121c33;z-index:2;border:1px solid rgba(140,175,235,.3);padding:14px 18px;opacity:0;transform-origin:50% 50%}
.spoke{width:340px}
.bi{font-size:36px;line-height:1;float:left;margin-right:12px}.bn{font-size:24px;font-weight:800}.bl{font-size:18px;color:#c3d1ea;clear:both;padding-top:10px;line-height:1.3}
/* problem */
.pbody{display:grid;grid-template-columns:1.05fr 1fr;gap:34px;height:600px}
.day{background:rgba(0,0,0,.35);border:1px solid rgba(140,175,235,.25);border-radius:16px;padding:26px 30px;font-family:'DejaVu Sans Mono',monospace}
.daytitle{font-size:18px;letter-spacing:.2em;color:#8fb0e8;text-transform:uppercase;margin-bottom:18px}
.dayline{font-size:29px;line-height:1.45;margin:14px 0;opacity:0;color:#e8eefb}.dayb{color:var(--hue);margin-right:14px;font-weight:800}
.pgrid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:22px}
.pcard{border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(140,175,235,.3);padding:24px 26px;opacity:0;transform-origin:50% 50%}
.ph{font-size:28px;font-weight:800;color:var(--hue);margin-bottom:12px}.pt{font-size:25px;line-height:1.4;color:#dfe9ff}
.capq{position:absolute;left:64px;right:64px;bottom:60px;font-size:30px;font-weight:700;color:#fff;background:linear-gradient(90deg,rgba(79,163,255,.25),rgba(79,163,255,0));border-left:6px solid var(--hue);padding:16px 24px;border-radius:0 12px 12px 0;opacity:0}
/* flow */
.flowwrap{position:relative;height:260px;margin-top:20px}
.flowsvg{position:absolute;left:0;top:0;width:1792px;height:240px}
.fnode{position:absolute;top:10px;height:200px;border-radius:18px;background:rgba(255,255,255,.05);border:2px solid rgba(140,175,235,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:0;transform-origin:50% 50%;z-index:2;text-align:center;padding:10px}
.fnode.on{border-color:var(--hue);background:rgba(255,255,255,.08)}.fnode.latest{background:rgba(255,255,255,.14)}
.fi{font-size:58px;line-height:1}.fl{font-size:21px;line-height:1.25;color:#e8eefb;font-weight:700}
.facts{display:grid;grid-template-columns:repeat(5,1fr);gap:18px;margin-top:70px}
.fact{border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(140,175,235,.3);padding:22px 22px;opacity:0;min-height:300px}
.fact.latest{background:rgba(255,255,255,.12);border-color:var(--hue);box-shadow:0 0 24px var(--hue)33}
.flab{font-size:18px;letter-spacing:.16em;text-transform:uppercase;color:var(--hue);font-weight:800;margin-bottom:12px}.ftxt{font-size:24px;line-height:1.4;color:#e4ecfb}
/* split */
.splitcols{display:grid;grid-template-columns:1fr 56px 1fr;gap:14px 10px;align-items:stretch}
.sct{font-size:18px;letter-spacing:.18em;text-transform:uppercase;color:#8fb0e8;font-weight:800;padding:0 6px 8px 6px}
.scell{border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(140,175,235,.28);padding:18px 22px;font-size:23px;line-height:1.38;color:#e4ecfb;opacity:0}
.scell.left{border-left:5px solid rgba(255,255,255,.25)}.scell.right{border-left:5px solid var(--hue)}
.scell.latest{background:rgba(255,255,255,.12)}
.sarrow{font-size:40px;color:var(--hue);text-align:center;align-self:center;opacity:0;font-weight:800}
.prove{margin-top:26px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;opacity:0}
.provel{font-size:17px;letter-spacing:.2em;color:#ffd166;font-weight:800;margin-right:8px}
.chip{background:rgba(255,209,102,.14);border:1px solid rgba(255,209,102,.6);color:#ffe8a8;border-radius:30px;padding:10px 20px;font-size:20px;opacity:0;transform-origin:50% 50%}
/* timeline */
.tlwrap{margin-top:10px}.tlbar{height:10px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden;margin-bottom:26px}.tlfill{height:100%;width:0;background:linear-gradient(90deg,#4fa3ff,#7ed0ff)}
.tlcols{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.tlh{font-size:24px;font-weight:800;color:#fff;letter-spacing:.06em;margin-bottom:16px;opacity:0;border-bottom:2px solid rgba(126,208,255,.5);padding-bottom:10px}
.tlitem{display:flex;gap:12px;align-items:flex-start;font-size:23px;line-height:1.35;color:#e4ecfb;margin:12px 0;opacity:0}.tli{font-size:26px;line-height:1}
/* decisions */
.dgrid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:18px;height:600px}
.dcard{border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(140,175,235,.3);padding:20px 22px;opacity:0;transform-origin:50% 50%}
.dcard.latest{background:rgba(255,255,255,.12);border-color:#7ed0ff}
.dwho{font-size:30px;font-weight:900;color:#7ed0ff;margin-bottom:8px}.ddec{font-size:22px;line-height:1.38;color:#e4ecfb;margin-bottom:10px}.dev{font-size:21px;line-height:1.35;color:#ffe8a8}.dev span{color:#ffd166;font-weight:800;letter-spacing:.06em}
.crit{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:22px}
.critc{border-radius:14px;background:rgba(79,163,255,.12);border:1px solid rgba(126,208,255,.5);padding:14px 20px;opacity:0}.ch{font-size:18px;letter-spacing:.18em;color:#7ed0ff;font-weight:800}.ct{font-size:20px;line-height:1.35;color:#e4ecfb;margin-top:6px}
/* close */
.cbody{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;height:480px}
.clog{background:rgba(0,0,0,.35);border:1px solid rgba(140,175,235,.25);border-radius:16px;padding:26px 30px;font-family:'DejaVu Sans Mono',monospace}
.cline{font-size:28px;line-height:1.5;margin:10px 0;opacity:0}.cline.done .dayt{color:#7ed0a0;font-weight:800}
.clock{font-family:'DejaVu Sans Mono',monospace;font-size:150px;font-weight:800;color:#fff;align-self:center;justify-self:center;opacity:0;text-shadow:0 0 40px rgba(79,163,255,.6)}
.thesis{margin-top:50px;font-size:62px;font-weight:900;color:#fff;line-height:1.15;opacity:0;transform-origin:0 50%}
"""

HTML = """<!doctype html><html><head><meta charset="utf-8"><style>%s</style></head><body>
<div id="stage"></div><div id="chapter"></div><div id="brand">ST Engineering · Product Management</div><div id="progress"></div>
<script>window.DATA=%s;</script><script>%s</script></body></html>"""

def split_sentences_from(sc):
    return sc["sentences"]

def synth():
    from piper import PiperVoice
    voice = PiperVoice.load(str(VOICE), config_path=str(VOICE) + ".json")
    durs = []
    for i, sc in enumerate(SCENES, 1):
        raw = OUT / "audio" / f"raw_{i:02d}.wav"; fin = OUT / "audio" / f"nar_{i:02d}.wav"
        text = " ".join(sc["sentences"])
        key = OUT / "audio" / f"nar_{i:02d}.txt"
        if not fin.exists() or key.read_text() != text:
            with wave.open(str(raw), "wb") as w: voice.synthesize_wav(text, w)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", f"apad=pad_dur={PAD},adelay={int(LEAD*1000)}|{int(LEAD*1000)},loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "2", str(fin)], check=True)
            key.write_text(text)
        d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(fin)]).decode().strip())
        durs.append(d); print(f"scene {i:02d} {d:6.1f}s {sc['type']}", flush=True)
    return durs

def timeline(durs):
    scenes = []; start = 0.0
    for sc, d in zip(SCENES, durs):
        sents = sc["sentences"]; total = sum(len(s) for s in sents); speech = d - PAD - LEAD
        starts = []; acc = 0
        for s in sents:
            starts.append(LEAD + speech * acc / total); acc += len(s)
        beats = []; seen = {}
        for b in sc["beats"]:
            k = seen.get(b["s"], 0); seen[b["s"]] = k + 1
            bb = dict(b); bb["t"] = round(starts[b["s"]] + 0.35 * k, 3); beats.append(bb)
        s2 = {k: v for k, v in sc.items() if k != "beats"}; s2["beats"] = beats; s2["start"] = round(start, 3); s2["dur"] = round(d, 3); s2["sent_starts"] = starts
        scenes.append(s2); start += d
    return {"scenes": scenes, "total": round(start, 3)}

def write_html(tl):
    html = HTML % (CSS, json.dumps(tl, ensure_ascii=False), (HERE / "engine.js").read_text())
    (OUT / "timeline.html").write_text(html, encoding="utf-8")
    (OUT / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1))

def fmt_ts(s):
    h = int(s // 3600); m = int(s % 3600 // 60); sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}".replace(".", ",")

def write_srt(tl):
    lines = []; n = 1
    for sc in tl["scenes"]:
        st = sc["sent_starts"] + [sc["dur"] - PAD]
        for i, s in enumerate(sc["sentences"]):
            a = sc["start"] + st[i]; b = sc["start"] + st[i + 1] - 0.05
            lines.append(f"{n}\n{fmt_ts(a)} --> {fmt_ts(b)}\n{s}\n"); n += 1
    (OUT / "narration.srt").write_text("\n".join(lines), encoding="utf-8")

CAPTURE_JS = r"""
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const [html, outMp4, fpsS, startS, endS] = process.argv.slice(2);
  const fps = +fpsS;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto('file://' + html); await p.waitForTimeout(300);
  const total = await p.evaluate(() => window.DATA.total);
  const t0 = +startS, t1 = endS === 'end' ? total : +endS;
  const ff = spawn('ffmpeg', ['-v','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','-','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-g','250','-r',String(fps),outMp4]);
  ff.stderr.on('data', d => process.stderr.write(d));
  const n = Math.round((t1 - t0) * fps); const tStart = Date.now();
  for (let f = 0; f < n; f++) {
    const T = t0 + f / fps;
    await p.evaluate(t => window.seek(t), T);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 500 === 0) console.log(`frame ${f}/${n} T=${T.toFixed(1)} elapsed=${((Date.now()-tStart)/1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close(); console.log('done frames', n);
})();
"""

STILL_JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [html, outDir, ...times] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + html); await p.waitForTimeout(300);
  for (const t of times) { await p.evaluate(x => window.seek(x), +t); await p.screenshot({ path: `${outDir}/still_${(+t).toFixed(1).padStart(7,'0')}.png` }); }
  await b.close();
})();
"""

if __name__ == "__main__":
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    if stage == "audio":
        durs = synth(); (OUT / "durations.json").write_text(json.dumps(durs)); print("total", round(sum(durs), 1))
    if stage in ("html", "stills", "capture", "mux"):
        durs = json.loads((OUT / "durations.json").read_text())
        tl = timeline(durs); write_html(tl); write_srt(tl)
        (OUT / "capture.js").write_text(CAPTURE_JS); (OUT / "still.js").write_text(STILL_JS)
        if stage == "stills":
            times = sys.argv[2:]; (OUT / "stills").mkdir(exist_ok=True)
            subprocess.run(["node", str(OUT / "still.js"), str(OUT / "timeline.html"), str(OUT / "stills")] + times, check=True)
        if stage == "capture":
            a = sys.argv[2] if len(sys.argv) > 2 else "0"; b = sys.argv[3] if len(sys.argv) > 3 else "end"
            subprocess.run(["node", str(OUT / "capture.js"), str(OUT / "timeline.html"), str(OUT / "video_only.mp4"), str(FPS), a, b], check=True)
        if stage == "mux":
            lst = OUT / "alist.txt"; lst.write_text("".join(f"file '{OUT/'audio'/f'nar_{i:02d}.wav'}'\n" for i in range(1, len(SCENES) + 1)))
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c:a", "aac", "-b:a", "128k", str(OUT / "narration.m4a")], check=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(OUT / "video_only.mp4"), "-i", str(OUT / "narration.m4a"), "-i", str(OUT / "narration.srt"),
                            "-map", "0:v", "-map", "1:a", "-map", "2:s", "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text", "-metadata:s:s:0", "language=eng",
                            "-metadata", "title=Beijing 2026 - Customer-first recap", "-shortest", "-movflags", "+faststart", str(OUT / "Beijing_2026_Customer_Recap.mp4")], check=True)
            print("final", OUT / "Beijing_2026_Customer_Recap.mp4")
