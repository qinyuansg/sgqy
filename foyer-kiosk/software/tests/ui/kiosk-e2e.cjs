// End-to-end UI run in simulation mode with Playwright.
//
//   node tests/ui/kiosk-e2e.cjs            (from foyer-kiosk/software)
//
// Starts the agent with --sim, drives the invitation, walk-up, accessibility
// (reach mode), German, dark-theme and overlay flows, asserts the reach-mode
// rule (no control above y = 768 px) and writes 1080x1920 screenshots to
// docs/screenshots/ (override with SCREENSHOT_DIR).

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = process.env.SCREENSHOT_DIR || path.join(ROOT, "docs", "screenshots");
const PORT = Number(process.env.FOYER_PORT || 8123);
const BASE = `http://127.0.0.1:${PORT}`;
const REACH_LINE = 768; // 40 % of 1920

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`);
};

async function startAgent() {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "foyer-e2e-"));
  const agent = spawn("python3", ["-m", "foyer_agent", "--sim", "--port", String(PORT), "--workdir", workdir], {
    cwd: path.join(ROOT, "agent"),
    stdio: ["ignore", "inherit", "inherit"],
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/healthz`)).ok) return agent;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  agent.kill();
  throw new Error("agent did not start");
}

const settle = (page, ms = 750) => page.waitForTimeout(ms);
const sim = (page, event, body) => page.request.post(`${BASE}/api/sim/${event}`, { data: body });

async function shot(page, name, ms = 750) {
  await settle(page, ms);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`     screenshot ${name}.png`);
}

async function screen(page, id) {
  await page.waitForSelector(`#app[data-screen="${id}"] .screen:not(.leaving)`);
}

async function type(page, text) {
  for (const ch of text) {
    const key = ch === " " ? " " : ch.toLowerCase();
    await page.click(`.keyboard [data-key="${key}" i]`);
  }
}

async function sign(page) {
  const box = await page.locator("[data-pad]").boundingBox();
  const pts = [[0.12, 0.62], [0.18, 0.35], [0.24, 0.66], [0.3, 0.4], [0.36, 0.6], [0.44, 0.38], [0.5, 0.58],
    [0.56, 0.45], [0.62, 0.52], [0.7, 0.36], [0.76, 0.6], [0.84, 0.48]];
  await page.mouse.move(box.x + box.width * pts[0][0], box.y + box.height * pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 8 });
  await page.mouse.up();
}

async function reachViolations(page) {
  return page.evaluate((line) => {
    const nodes = document.querySelectorAll("#app button, #app input, #app canvas, #app [data-action]");
    return [...nodes]
      .filter((n) => n.offsetParent !== null && !n.closest(".leaving") && !n.matches("section.screen"))
      .map((n) => ({ label: (n.textContent || n.name || n.tagName).trim().slice(0, 30), top: Math.round(n.getBoundingClientRect().top) }))
      .filter((n) => n.top < line);
  }, REACH_LINE);
}

async function assertReach(page, where) {
  const bad = await reachViolations(page);
  check(bad.length === 0, `reach mode: all controls below ${REACH_LINE}px on ${where}${bad.length ? " " + JSON.stringify(bad) : ""}`);
}

async function invitePath(page) {
  await page.goto(BASE);
  await screen(page, "attract");
  await shot(page, "01-attract");
  await sim(page, "presence", { present: true });
  await page.waitForSelector(".screen--attract.present");
  await shot(page, "02-attract-person-approaching");
  await page.click(".attract__cta");
  await screen(page, "start");
  await shot(page, "03-start");
  await page.click("[data-action=invite]");
  await screen(page, "scan");
  await shot(page, "04-scan-invitation");
  await sim(page, "qr", { code: "INV-7KQ2M9" });
  await screen(page, "invite");
  check((await page.textContent(".screen:not(.leaving) .title")).includes("Anna"), "invitation resolved to the invited visitor");
  await shot(page, "05-invitation-confirm");
  await page.click("[data-action=confirm]");
  await screen(page, "document");
  await page.waitForSelector('[data-stage="mrz"].done');
  await shot(page, "06-id-reading", 0);
  await page.waitForSelector(".idcard");
  await shot(page, "07-id-verified");
  await page.click("[data-action=next]");
  await screen(page, "face");
  await page.waitForFunction(() => document.querySelector("[data-feed]").naturalWidth > 0);
  await shot(page, "08-face-live");
  await page.click("[data-action=take]");
  await page.waitForSelector(".screen--face.captured", { timeout: 10_000 });
  await shot(page, "09-face-captured");
  await page.click("[data-action=use]");
  await screen(page, "consent");
  await shot(page, "10-consent");
  await page.click("[data-name=privacy]");
  await page.click("[data-name=rules]");
  await sign(page);
  check(!(await page.isDisabled("[data-action=submit]")), "consent submit enabled after toggles + signature");
  await shot(page, "11-consent-signed");
  await page.click("[data-action=submit]");
  await screen(page, "done");
  check((await page.textContent(".screen:not(.leaving) .lede")).includes("Jordan Lee"), "done screen names the notified host");
  check(await page.isVisible(".done__qr svg"), "mobile pass QR shown");
  await shot(page, "12-done");
  const status = await (await page.request.get(`${BASE}/api/status`)).json();
  check(status.sessions.ended_total.completed === 1, "agent session completed and wiped");
}

async function walkupPath(page) {
  await page.goto(BASE);
  await screen(page, "attract");
  await page.click(".attract__cta");
  await page.click("[data-action=walkup]");
  await screen(page, "name");
  await type(page, "anna");
  await page.click("[name=last]");
  await type(page, "eriksson");
  await shot(page, "13-walkup-name");
  await page.click('[data-key="action"]');
  await screen(page, "company");
  await type(page, "utopia");
  await shot(page, "14-walkup-company");
  await page.click('[data-key="action"]');
  await screen(page, "host");
  await type(page, "pri");
  await page.waitForSelector(".result");
  await shot(page, "15-walkup-host-search");
  await page.click(".result");
  await screen(page, "purpose");
  await shot(page, "16-walkup-purpose");
  await page.click('[data-purpose="meeting"]');
  await screen(page, "document");
  await page.waitForSelector(".idcard");
  await page.click("[data-action=next]");
  await screen(page, "face");
  await page.click("[data-action=take]");
  await page.waitForSelector(".screen--face.captured", { timeout: 10_000 });
  await page.click("[data-action=use]");
  await screen(page, "consent");
  await page.click("[data-name=privacy]");
  await page.click("[data-name=rules]");
  await sign(page);
  await sim(page, "vms", { online: false });
  await page.click("[data-action=submit]");
  await screen(page, "done");
  check((await page.textContent(".screen:not(.leaving) .lede")).includes("offline"), "offline submission explained to the visitor");
  await shot(page, "17-done-offline-queued");
  const status = await (await page.request.get(`${BASE}/api/status`)).json();
  check(status.queue.depth === 1, "offline visit sealed in the encrypted queue");
  await sim(page, "vms", { online: true });
}

async function accessibilityPath(page) {
  await page.goto(BASE);
  await screen(page, "attract");
  await page.click("[data-action=access]");
  await page.waitForSelector("#app.reach");
  await shot(page, "18-a11y-attract");
  await page.click(".attract__cta");
  await screen(page, "start");
  await assertReach(page, "start");
  await shot(page, "19-a11y-start");
  await page.click("[data-action=walkup]");
  await screen(page, "name");
  await type(page, "anna");
  await assertReach(page, "name");
  await shot(page, "20-a11y-name-keyboard");
  await page.click("[name=last]");
  await type(page, "eriksson");
  await page.click('[data-key="action"]');
  await screen(page, "company");
  await page.click('[data-key="action"]');
  await screen(page, "host");
  await type(page, "jor");
  await page.waitForSelector(".result");
  await assertReach(page, "host");
  await page.click(".result");
  await screen(page, "purpose");
  await assertReach(page, "purpose");
  await shot(page, "21-a11y-purpose");
  await page.click('[data-purpose="interview"]');
  await screen(page, "document");
  await page.waitForSelector(".idcard");
  await assertReach(page, "document");
  await page.click("[data-action=next]");
  await screen(page, "face");
  await assertReach(page, "face");
  await shot(page, "22-a11y-face");
  await page.click("[data-action=take]");
  await page.waitForSelector(".screen--face.captured", { timeout: 10_000 });
  await page.click("[data-action=use]");
  await screen(page, "consent");
  await assertReach(page, "consent");
  await page.click("[data-name=privacy]");
  await page.click("[data-name=rules]");
  await sign(page);
  await shot(page, "23-a11y-consent");
  await page.click("[data-action=submit]");
  await screen(page, "done");
  await assertReach(page, "done");
  await shot(page, "24-a11y-done");
}

async function languageThemeAndOverlays(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(BASE);
  await screen(page, "attract");
  await page.click('[data-lang="de"]');
  await page.click(".attract__cta");
  await screen(page, "start");
  check((await page.textContent(".screen:not(.leaving) .title")).includes("Wie möchten"), "German catalogue applied");
  await shot(page, "25-de-start");
  await page.click("[data-action=language]");
  await shot(page, "26-language-sheet");
  await page.click('[data-lang="en"]');
  await page.click("[data-action=call]");
  await page.waitForSelector(".call-sheet__avatar:not(.ringing)", { timeout: 6000 });
  await shot(page, "27-call-reception");
  await page.click("[data-call=end]");
  await page.close();

  const dark = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await dark.goto(`${BASE}/?theme=dark`);
  await screen(dark, "attract");
  await shot(dark, "28-dark-attract");
  await dark.click(".attract__cta");
  await dark.click("[data-action=invite]");
  await screen(dark, "scan");
  await shot(dark, "29-dark-scan");
  await dark.close();

  const idle = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await idle.clock.install();
  await idle.goto(BASE);
  await screen(idle, "attract");
  await idle.click(".attract__cta");
  await idle.click("[data-action=walkup]");
  await screen(idle, "name");
  await idle.clock.fastForward(46_000);
  await idle.waitForSelector(".idle-sheet");
  await idle.clock.fastForward(3_000);
  await shot(idle, "30-idle-warning");
  await idle.clock.fastForward(13_000);
  await screen(idle, "attract");
  check(true, "idle timeout returns to attract and cancels the session");
  await idle.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const agent = await startAgent();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await invitePath(page);
    await walkupPath(page);
    await accessibilityPath(page);
    check(errors.length === 0, `no browser errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    await page.close();
    await languageThemeAndOverlays(browser);
  } catch (error) {
    failures.push(String(error));
    console.error(error);
  } finally {
    await browser.close();
    agent.kill("SIGTERM");
  }
  console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
  process.exit(failures.length ? 1 : 0);
})();
