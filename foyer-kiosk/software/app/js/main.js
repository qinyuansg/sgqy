// Boot: load config and catalogues, fit the 1080x1920 canvas, connect to the agent.

import { api, connectEvents } from "./api.js";
import { flow } from "./flow.js";
import { loadLanguages, setLanguage } from "./i18n.js";
import { mountSimPanel } from "./simpanel.js";
import { state } from "./store.js";

const app = document.getElementById("app");

function fit() {
  // The kiosk renders at exactly 1080x1920; desktop browsers (simulation) get a scaled preview.
  const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  app.style.transform = Math.abs(scale - 1) < 0.001 ? "" : `scale(${scale})`;
}

function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

async function boot() {
  fit();
  window.addEventListener("resize", fit);
  let config;
  for (let attempt = 0; ; attempt++) {
    try {
      config = await api.config();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** attempt, 5000))); // agent still starting
    }
  }
  state.config = config;
  const params = new URLSearchParams(location.search);
  applyTheme(params.get("theme") ?? config.ui.theme);
  document.documentElement.style.setProperty("--accent", config.branding.accent);
  document.documentElement.style.setProperty("--brand-accent", config.branding.accent);
  await loadLanguages(config.ui.languages, config.ui.defaultLanguage);
  setLanguage(config.ui.defaultLanguage);
  if (config.simulated && params.get("simpanel") === "1") mountSimPanel(app);
  if (config.simulated) document.body.classList.add("pointer");

  connectEvents(
    (event) => flow.onEvent(event),
    (online) => app.classList.toggle("agent-offline", !online),
  );
  flow.go("attract", { replace: true });
}

// Kiosk hardening inside the page: no context menu, no pinch/drag gestures.
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("dragstart", (e) => e.preventDefault());
window.addEventListener("gesturestart", (e) => e.preventDefault());

boot();
