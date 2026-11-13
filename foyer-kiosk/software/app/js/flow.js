// Screen controller: navigation, chrome (top bar, dock), language, accessibility,
// idle handling and session lifecycle.

import { api, ApiError } from "./api.js";
import { $, el, html, onAction } from "./dom.js";
import { language, languages, nativeName, setLanguage, t } from "./i18n.js";
import { icon } from "./icons.js";
import { Idle } from "./idle.js";
import { onCallEvent, openCall } from "./call.js";
import { clearVisit, state } from "./store.js";
import { screens } from "./screens/index.js";

const STEPS = 5;
const NO_IDLE = new Set(["attract", "done", "submit"]);

class Flow {
  constructor() {
    this.root = document.getElementById("app");
    this.stage = document.getElementById("stage");
    this.current = null;
    this.cleanup = null;
    this.history = [];
    this.idle = new Idle(this);
    this.lastTouch = 0;
    onAction(this.root, {
      back: () => this.back(),
      call: () => openCall(this),
      language: () => this.languageSheet(),
      a11y: () => this.toggleA11y(),
    });
    this.root.addEventListener("pointerdown", () => this.activity(), { capture: true });
    this.root.addEventListener("keydown", () => this.activity(), { capture: true });
  }

  // ---- navigation ------------------------------------------------------------

  go(id, { back = false, replace = false } = {}) {
    const screen = screens[id];
    if (!screen) throw new Error(`unknown screen ${id}`);
    if (this.current && !back && !replace) this.history.push(this.current.id);
    this.cleanup?.();
    this.cleanup = null;
    const previous = this.stage.querySelector(".screen:not(.leaving)");
    if (previous) {
      previous.classList.add("leaving");
      if (back) previous.classList.add("back");
      previous.addEventListener("animationend", () => previous.remove(), { once: true });
      setTimeout(() => previous.remove(), 600);
    }
    this.current = screen;
    this.root.dataset.screen = id;
    const node = el(screen.render(this.ctx()));
    if (back) node.classList.add("back");
    this.stage.append(node);
    this.cleanup = screen.mount?.(node, this.ctx()) ?? null;
    this.renderChrome();
    this.syncIdle();
    this.announce();
  }

  syncIdle() {
    if (!this.current || NO_IDLE.has(this.current.id)) this.idle.stop();
    else this.idle.watch();
  }

  back() {
    if (this.current?.back === "restart") {
      this.restart();
      return;
    }
    const previous = this.history.pop();
    if (previous) this.go(previous, { back: true });
  }

  ctx() {
    return { flow: this, state, t, api };
  }

  // ---- session ---------------------------------------------------------------

  async begin(mode) {
    await this.ensureSession();
    state.visit.mode = mode;
    this.history = ["start"];
    this.go(mode === "invite" ? "scan" : "name", { replace: true });
  }

  async ensureSession() {
    if (!state.sessionId) {
      const { id } = await api.startSession(language());
      state.sessionId = id;
    }
    return state.sessionId;
  }

  /** End the visit everywhere and return to the attract screen. */
  async restart({ silent = false } = {}) {
    const id = state.sessionId;
    clearVisit();
    this.history = [];
    this.idle.stop();
    document.getElementById("layer").hidden = true;
    if (id && !silent) await api.endSession(id).catch(() => {});
    if (state.a11y) this.setA11y(false); // the next visitor starts with the standard layout
    setLanguage(state.config.ui.defaultLanguage);
    this.go("attract", { replace: true });
  }

  activity() {
    this.idle.poke();
    const now = Date.now();
    if (state.sessionId && now - this.lastTouch > 10_000) {
      this.lastTouch = now;
      api.touch(state.sessionId).catch((error) => this.handleSessionLoss(error));
    }
  }

  handleSessionLoss(error) {
    if (error instanceof ApiError && error.code === "session_not_found") this.restart({ silent: true });
  }

  /** Show a translated error; returns true if the session is gone. */
  fail(error) {
    const code = error instanceof ApiError ? error.code : "generic";
    if (code === "session_not_found") {
      this.restart({ silent: true });
      return true;
    }
    this.toast(t(`errors.${code}`) === `errors.${code}` ? t("errors.generic") : t(`errors.${code}`));
    return false;
  }

  // ---- agent events ------------------------------------------------------------

  onEvent(event) {
    if (event.type === "hello") {
      state.presence = event.presence;
    } else if (event.type === "presence") {
      state.presence = event.present;
    } else if (event.type === "call") {
      onCallEvent(event);
    } else if (event.type === "session.ended" && state.sessionId && this.current?.id !== "done") {
      // The agent wiped the session (idle timeout / max duration): follow it.
      if (event.reason !== "completed") this.restart({ silent: true });
      return;
    }
    this.root.classList.toggle("presence", state.presence);
    this.current?.onEvent?.(event, this.ctx());
  }

  // ---- chrome ------------------------------------------------------------------

  renderChrome() {
    const screen = this.current;
    const { branding } = state.config;
    const brand = document.getElementById("brand");
    brand.replaceChildren(
      el(
        branding.logo
          ? html`<img src="${branding.logo}" alt="${branding.company}">`
          : html`<span class="brand__mark">${branding.company.slice(0, 1)}</span>`,
      ),
      document.createTextNode(branding.logo ? "" : branding.company),
    );

    const progress = document.getElementById("progress");
    progress.classList.toggle("visible", screen.step != null);
    progress.setAttribute("aria-label", t("a11y.progress"));
    progress.replaceChildren(
      ...Array.from({ length: STEPS }, (_, i) =>
        el(html`<li class="${i < screen.step ? "done" : i === screen.step ? "current" : ""}"></li>`),
      ),
    );

    const actions = html`
      <button class="icon-btn" data-action="language" aria-label="${t("chrome.language")}">
        ${icon("globe")}<span>${language().toUpperCase()}</span>
      </button>
      <button class="icon-btn ${state.a11y ? "on" : ""}" data-action="a11y" aria-pressed="${state.a11y}"
              aria-label="${t("chrome.accessibility")}">${icon("accessibility")}</button>`;
    const reach = state.a11y;
    document.getElementById("topbar-actions").replaceChildren(...(reach ? [] : fragmentNodes(actions)));
    document.getElementById("dock-reach").replaceChildren(...(reach ? fragmentNodes(actions) : []));

    const canGoBack = screen.back === "restart" || (screen.back && this.history.length > 0);
    document.getElementById("dock-start").replaceChildren(
      ...(canGoBack
        ? [el(html`<button class="btn btn--ghost" data-action="back">${icon("arrowLeft")}${
            screen.back === "restart" ? t("chrome.cancel") : t("chrome.back")}</button>`)]
        : []),
    );
    document.getElementById("dock-end").replaceChildren(
      el(html`<button class="call-btn" data-action="call">
        <span class="call-btn__icon">${icon("phone")}</span>${t("chrome.callReception")}</button>`),
    );
  }

  refresh() {
    // Re-render the current screen in place (language or accessibility change).
    if (!this.current) return;
    this.cleanup?.();
    const node = el(this.current.render(this.ctx()));
    node.style.animation = "none";
    this.stage.replaceChildren(node);
    this.cleanup = this.current.mount?.(node, this.ctx()) ?? null;
    this.renderChrome();
    this.announce();
  }

  // ---- language & accessibility -------------------------------------------------

  languageSheet() {
    const layer = document.getElementById("layer");
    layer.replaceChildren(
      el(html`<div class="sheet" role="dialog" aria-modal="true">
        <h2 class="sheet__title">${t("chrome.chooseLanguage")}</h2>
        <div class="lang-list">
          ${languages().map(
            (lang) => html`<button class="btn ${lang === language() ? "btn--primary" : ""}" data-lang="${lang}">
              <span>${nativeName(lang)}</span>${lang === language() ? icon("check") : ""}</button>`,
          )}
        </div>
      </div>`),
    );
    layer.hidden = false;
    layer.onclick = (event) => {
      const button = event.target.closest("[data-lang]");
      if (button) this.setLanguage(button.dataset.lang);
      if (button || event.target === layer) layer.hidden = true;
    };
  }

  setLanguage(lang) {
    setLanguage(lang);
    if (state.sessionId) api.setLanguage(state.sessionId, lang).catch(() => {});
    this.refresh();
  }

  toggleA11y() {
    this.setA11y(!state.a11y);
    this.refresh();
  }

  setA11y(on) {
    state.a11y = on;
    this.root.classList.toggle("a11y", on);
    this.root.classList.toggle("reach", on);
  }

  /** Speak the screen's prompt in accessibility mode. */
  announce() {
    if (!state.a11y || !this.current) return;
    const text = this.current.speech?.(this.ctx()) ?? [$(this.stage, ".title")?.textContent, $(this.stage, ".lede")?.textContent]
      .filter(Boolean)
      .join(". ");
    if (text) this.speak(text);
  }

  speak(text) {
    if (state.config.ui.tts === "browser" && "speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language();
      speechSynthesis.speak(utterance);
    } else if (state.config.ui.tts !== "off") {
      api.speak(text, language()).catch(() => {});
    }
  }

  toast(message, ms = 4200) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
    if (state.a11y) this.speak(message);
  }
}

function fragmentNodes(fragment) {
  const tpl = document.createElement("template");
  tpl.innerHTML = fragment.value;
  return [...tpl.content.children];
}

export const flow = new Flow();
