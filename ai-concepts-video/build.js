// Builds ai-concepts-explained.mp4 from content.js.
// Needs: node + playwright (chromium), ffmpeg, festival + festvox-us-slt-hts (text2wave).
// Usage: node build.js [workdir]   (workdir defaults to ./build)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const C = require("./content");

const WORK = path.resolve(process.argv[2] || path.join(__dirname, "build"));
const OUT = path.join(__dirname, "ai-concepts-explained.mp4");
const FPS = 30;
const W = 1920, H = 1080;
fs.mkdirSync(WORK, { recursive: true });

// ---------- speech ----------
const SPEECH_FIXES = [
  [/\bAI\b/g, "ay-eye"],
  [/\bay P I's\b/g, "ay pee eyes"],
  [/\bQdrant\b/g, "quadrant"],
  [/\bWeaviate\b/g, "wee-vee-ate"],
  [/\bPostgres\b/g, "post-gress"],
  [/\bbehaviour\b/g, "behavior"],
  [/\bneighbourhood\b/g, "neighborhood"],
  [/\bkilometre\b/g, "kilometer"],
  [/\bpersonalisation\b/g, "personalization"],
  [/\bsummarise\b/g, "summarize"],
  [/\borganised\b/g, "organized"],
  [/\bmaths\b/g, "math"],
  [/\bClaude\b/g, "Clawd"],
];
const forSpeech = (t) => SPEECH_FIXES.reduce((s, [re, r]) => s.replace(re, r), t);

function tts(text, file) {
  const txt = file.replace(/\.wav$/, ".txt");
  fs.writeFileSync(txt, forSpeech(text) + "\n");
  const raw = file.replace(/\.wav$/, ".raw.wav");
  execFileSync("text2wave", ["-eval", "(voice_cmu_us_slt_arctic_hts)", txt, "-o", raw]);
  // normalise loudness a little and resample to 48k mono
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", "highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1", file]);
}
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

// ---------- slide HTML ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ball = (n, color, size) => `
  <div class="ball" style="--c:${color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${n}</div>`;

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{font-family:Inter,"Inter Display",sans-serif;background:#f7f7fb;color:#13132b;position:relative}
  body::before{content:"";position:absolute;inset:0;background:
     radial-gradient(900px 600px at 105% -10%, color-mix(in srgb,var(--accent) 16%, transparent), transparent 70%),
     radial-gradient(700px 500px at -10% 110%, #6d5dfc14, transparent 70%);}
  .ball{border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;flex:none;
    background:radial-gradient(circle at 32% 28%, color-mix(in srgb,var(--c) 45%, white) 0%, var(--c) 45%, color-mix(in srgb,var(--c) 70%, black) 100%);
    box-shadow:0 10px 24px color-mix(in srgb,var(--c) 40%, transparent), inset 0 -6px 14px #0003;text-shadow:0 2px 4px #0004}
  .top{position:absolute;left:80px;right:80px;top:48px;display:flex;align-items:center;justify-content:space-between}
  .brand{font-family:"Inter Display",Inter;font-weight:800;font-size:30px;letter-spacing:-.5px}
  .brand b{color:#5b4be0}
  .brand::after{content:"";display:block;width:90px;height:6px;border-radius:3px;background:#5b4be0;margin-top:10px}
  .prog{display:flex;align-items:center;gap:18px}
  .dots{display:flex;gap:7px}
  .dot{width:14px;height:14px;border-radius:50%;background:#dcdcea}
  .dot.on{background:var(--c)} .dot.cur{outline:3px solid var(--c);outline-offset:3px;background:var(--c)}
  .count{font-weight:800;font-size:26px;color:#5a5a78;font-variant-numeric:tabular-nums}
  .cap{position:absolute;left:50%;transform:translateX(-50%);bottom:34px;width:1640px;min-height:96px;
    background:#13132bea;color:#fff;border-radius:22px;padding:20px 34px;font-size:29px;line-height:1.38;font-weight:500;
    display:flex;align-items:center;justify-content:center;text-align:center}
  .cap:empty{display:none}
`;

function conceptSlide(c, step, caption) {
  const dots = C.concepts.map((k) => `<div class="dot ${k.n < c.n ? "on" : ""} ${k.n === c.n ? "cur" : ""}" style="--c:${k.color}"></div>`).join("");
  const pts = c.points.map((p, i) => {
    const shown = step >= i + 1;
    const fresh = step === i + 1;
    return `<div class="pt ${shown ? "" : "hide"} ${fresh ? "fresh" : ""}"><div class="pn">${i + 1}</div><div>${esc(p)}</div></div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
    body{--accent:${c.color}}
    .main{position:absolute;left:80px;right:80px;top:170px;bottom:170px;display:grid;grid-template-columns:690px 1fr;gap:64px}
    .left{display:flex;flex-direction:column;gap:34px;padding-top:10px}
    .kicker{font-weight:700;font-size:24px;letter-spacing:3px;text-transform:uppercase;color:${c.color}}
    h1{font-family:"Inter Display",Inter;font-weight:800;font-size:64px;line-height:1.05;letter-spacing:-1.5px}
    .an{background:#fff;border-radius:24px;padding:30px 34px 30px 34px;box-shadow:0 8px 30px #1b1b4010;border-left:10px solid ${c.color};
      font-size:31px;line-height:1.4;font-weight:600;color:#26264a}
    .an small{display:block;font-size:19px;letter-spacing:2.5px;text-transform:uppercase;color:#8a8aa6;font-weight:700;margin-bottom:10px}
    .right{display:flex;flex-direction:column;gap:22px;justify-content:center}
    .pt{display:flex;gap:24px;align-items:center;background:#fff;border-radius:20px;padding:24px 30px;font-size:29px;line-height:1.35;font-weight:500;
      box-shadow:0 6px 22px #1b1b400d;border:3px solid transparent}
    .pt.fresh{border-color:${c.color};box-shadow:0 10px 34px color-mix(in srgb,${c.color} 28%, transparent)}
    .pt.hide{visibility:hidden}
    .pn{flex:none;width:50px;height:50px;border-radius:14px;background:color-mix(in srgb,${c.color} 14%, white);color:${c.color};
      font-weight:800;font-size:26px;display:flex;align-items:center;justify-content:center}
    .tk{margin-top:8px;border-radius:22px;padding:26px 32px;background:linear-gradient(120deg,#1d1b4b,#3a2f9a);color:#fff;font-size:29px;line-height:1.38;font-weight:600;
      ${step >= 4 ? "box-shadow:0 14px 40px #3a2f9a55" : "visibility:hidden"}}
    .tk small{display:block;font-size:19px;letter-spacing:2.5px;text-transform:uppercase;color:#b9b2ff;font-weight:700;margin-bottom:8px}
  </style></head><body>
    <div class="top"><div class="brand">The main concepts of <b>AI</b></div>
      <div class="prog"><div class="dots">${dots}</div><div class="count">${String(c.n).padStart(2, "0")} / 22</div></div></div>
    <div class="main">
      <div class="left">
        ${ball(c.n, c.color, 150)}
        <div><div class="kicker">Concept ${c.n}</div><h1 style="margin-top:12px">${esc(c.title)}</h1></div>
        <div class="an"><small>In one line</small>${esc(c.analogy)}</div>
      </div>
      <div class="right">${pts}
        <div class="tk"><small>For you, as Chief AI Product Officer</small>${esc(c.takeaway)}</div>
      </div>
    </div>
    <div class="cap">${esc(caption)}</div>
  </body></html>`;
}

function introSlide(step, caption) {
  const grid = C.concepts.map((c) => `<div class="chip">${ball(c.n, c.color, 58)}<span>${esc(c.title.replace(/ \(.*\)/, ""))}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
    body{--accent:#5b4be0}
    .hero{position:absolute;left:80px;top:150px;right:80px}
    h1{font-family:"Inter Display",Inter;font-weight:800;font-size:78px;letter-spacing:-2px;line-height:1.05}
    h1 b{color:#5b4be0}
    .sub{font-size:32px;color:#4a4a6a;margin-top:18px;font-weight:500}
    .grid{position:absolute;left:80px;right:80px;top:390px;display:grid;grid-template-columns:repeat(6,1fr);gap:16px 18px}
    .chip{display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:12px 16px;box-shadow:0 4px 16px #1b1b400c;
      font-weight:650;font-size:21px;line-height:1.2;min-height:84px}
    .how{position:absolute;left:80px;right:80px;top:390px;display:${step >= 1 ? "flex" : "none"};gap:26px}
    .how div{flex:1;background:#fff;border-radius:24px;padding:34px;font-size:30px;font-weight:600;box-shadow:0 8px 30px #1b1b4012;line-height:1.35}
    .how small{display:block;color:#5b4be0;font-size:22px;letter-spacing:2.5px;text-transform:uppercase;font-weight:800;margin-bottom:12px}
  </style></head><body>
    <div class="top"><div class="brand">The main concepts of <b>AI</b></div><div class="count">Explained simply</div></div>
    <div class="hero"><h1>22 AI concepts, <b>explained simply</b></h1>
      <div class="sub">A briefing for the Chief AI Product Officer</div></div>
    ${step === 0 ? `<div class="grid">${grid}</div>` : `<div class="how">
      <div><small>1 · In one line</small>A simple analogy you can repeat in any meeting</div>
      <div><small>2 · Three key points</small>What it is and how it works, without the jargon</div>
      <div><small>3 · For you</small>What it means for your product, team and budget</div></div>`}
    <div class="cap">${esc(caption)}</div>
  </body></html>`;
}

function outroSlide(step, caption) {
  const pts = C.outroPoints.map((p, i) => `<div class="o">${ball(i + 1, ["#7c3aed", "#2f7fc1", "#2f9a55"][i], 76)}<span>${esc(p)}</span></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
    body{--accent:#5b4be0}
    h1{position:absolute;left:80px;top:170px;font-family:"Inter Display",Inter;font-weight:800;font-size:76px;letter-spacing:-2px}
    h1 b{color:#5b4be0}
    .list{position:absolute;left:80px;right:80px;top:330px;display:${step >= 1 ? "flex" : "none"};flex-direction:column;gap:26px}
    .o{display:flex;align-items:center;gap:30px;background:#fff;border-radius:24px;padding:24px 34px;font-size:40px;font-weight:700;box-shadow:0 8px 30px #1b1b4012}
  </style></head><body>
    <div class="top"><div class="brand">The main concepts of <b>AI</b></div><div class="count">Recap</div></div>
    <h1>Three things to <b>remember</b></h1>
    <div class="list">${pts}</div>
    <div class="cap">${esc(caption)}</div>
  </body></html>`;
}

// ---------- build segment list ----------
const segs = [];
C.intro.forEach((s, i) => segs.push({ id: `00_intro_${i}`, say: s.say, html: () => introSlide(i, s.say), gap: i === C.intro.length - 1 ? 0.9 : 0.5, xf: i === 0 ? 0 : 0.5 }));
for (const c of C.concepts) {
  c.say.forEach((say, step) => segs.push({
    id: `${String(c.n).padStart(2, "0")}_c_${step}`, say, html: () => conceptSlide(c, step, say),
    gap: step === c.say.length - 1 ? 1.0 : 0.45, xf: step === 0 ? 0.6 : 0.3,
  }));
}
C.outro.forEach((s, i) => segs.push({ id: `99_outro_${i}`, say: s.say, html: () => outroSlide(i, s.say), gap: i === C.outro.length - 1 ? 2.5 : 0.5, xf: 0.6 }));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  if (process.env.PREVIEW) { // PREVIEW=00_intro_0,07_c_4 node build.js dir  -> screenshots only
    for (const id of process.env.PREVIEW.split(",")) {
      const s = segs.find((x) => x.id === id);
      await page.setContent(s.html(), { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(WORK, id + ".png") });
    }
    await browser.close();
    return;
  }
  for (const s of segs) {
    s.png = path.join(WORK, s.id + ".png");
    s.wav = path.join(WORK, s.id + ".wav");
    if (fs.existsSync(s.png) && fs.existsSync(s.wav) && !process.env.FRESH) continue; // cached
    await page.setContent(s.html(), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: s.png });
    tts(s.say, s.wav);
  }
  await browser.close();
  console.log(`rendered ${segs.length} slides + narration`);

  // ---------- per-segment clips (frame-exact), crossfading from the previous slide ----------
  const lead = 0.4; // silence before the very first words
  const audioParts = [];
  const list = [];
  let total = 0;
  segs.forEach((s, i) => {
    const a = dur(s.wav);
    const pre = i === 0 ? lead : 0;
    const frames = Math.ceil((pre + a + s.gap) * FPS);
    const d = frames / FPS;
    total += d;
    // audio: pre-silence + speech, padded to exactly d seconds
    const seg = path.join(WORK, s.id + ".seg.wav");
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", s.wav, "-af", `adelay=${Math.round(pre * 1000)},apad=whole_dur=${d}`, "-t", String(d), "-ar", "48000", "-ac", "1", seg]);
    audioParts.push(seg);
    // video
    const mp4 = path.join(WORK, s.id + ".mp4");
    const prev = i > 0 ? segs[i - 1].png : s.png;
    const xf = i > 0 ? s.xf : 0.8;
    const loopIn = (png, secs) => ["-loop", "1", "-framerate", String(FPS), "-t", String(secs), "-i", png];
    const args = i > 0
      ? [...loopIn(prev, xf), ...loopIn(s.png, d), "-filter_complex", `[0:v][1:v]xfade=transition=fade:duration=${xf}:offset=0,format=yuv420p`]
      : [...loopIn(s.png, d), "-vf", `fade=t=in:st=0:d=${xf},format=yuv420p`];
    execFileSync("ffmpeg", ["-y", "-v", "error", ...args, "-frames:v", String(frames), "-r", String(FPS),
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "20", "-pix_fmt", "yuv420p", mp4]);
    list.push(`file '${mp4}'`);
  });
  fs.writeFileSync(path.join(WORK, "list.txt"), list.join("\n") + "\n");
  fs.writeFileSync(path.join(WORK, "alist.txt"), audioParts.map((p) => `file '${p}'`).join("\n") + "\n");
  const vid = path.join(WORK, "video.mp4"), aud = path.join(WORK, "audio.wav");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(WORK, "list.txt"), "-c", "copy", vid]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(WORK, "alist.txt"), "-c", "copy", aud]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", vid, "-i", aud, "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", OUT]);

  // chapter list for the README / video description
  let t = 0; const ch = [];
  segs.forEach((s, i) => {
    const m = s.id.match(/^(\d\d)_c_0$/);
    if (i === 0) ch.push(`0:00 Introduction`);
    if (m) { const c = C.concepts[+m[1] - 1]; ch.push(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} ${c.n}. ${c.title}`); }
    if (s.id === "99_outro_0") ch.push(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} Recap`);
    t += Math.ceil(((i === 0 ? lead : 0) + dur(s.wav) + s.gap) * FPS) / FPS;
  });
  fs.writeFileSync(path.join(__dirname, "chapters.txt"), ch.join("\n") + "\n");
  console.log(`done: ${OUT} (${(total / 60).toFixed(1)} min)`);
})();
