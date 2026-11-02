#!/usr/bin/env node
/* Render scenes.html frame-by-frame with Playwright and pipe into ffmpeg.
   node render.js frames <outdir> t1 t2 ...       -> PNG stills (QA)
   node render.js video <out.mp4> <t0> <t1> [fps] -> H.264 segment (no audio) */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

async function open() {
  const browser = await chromium.launch({ args: ["--disable-gpu-vsync", "--force-color-profile=srgb"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const warnings = [];
  page.on("console", m => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  page.on("pageerror", e => warnings.push("PAGEERROR " + e.message));
  await page.goto("file://" + path.join(__dirname, "scenes.html") + "?render=1");
  await page.evaluate(() => window.__ready);
  await page.waitForTimeout(300);
  return { browser, page, warnings };
}

(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const { browser, page, warnings } = await open();
  if (mode === "frames") {
    fs.mkdirSync(out, { recursive: true });
    for (const t of rest.map(Number)) {
      await page.evaluate(t => window.renderAt(t), t);
      await page.screenshot({ path: path.join(out, `f_${t.toFixed(2).padStart(7, "0")}.png`) });
    }
  } else if (mode === "video") {
    const t0 = parseFloat(rest[0]), t1 = parseFloat(rest[1]), fps = parseFloat(rest[2] || "30");
    const n = Math.round((t1 - t0) * fps);
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(fps), out], { stdio: ["pipe", "inherit", "inherit"] });
    const started = Date.now();
    for (let i = 0; i < n; i++) {
      const t = t0 + i / fps;
      await page.evaluate(t => window.renderAt(t), t);
      const buf = await page.screenshot({ type: "jpeg", quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (i % 300 === 0) console.error(`[${path.basename(out)}] ${i}/${n} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on("close", r));
  }
  if (warnings.length) console.error("WARNINGS:\n" + [...new Set(warnings)].join("\n"));
  await browser.close();
})();
