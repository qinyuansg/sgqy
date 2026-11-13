// Inactivity: after idleTimeoutS a "Still there?" sheet counts down idleWarningS,
// then the visit is cancelled and wiped.

import { el, html } from "./dom.js";
import { t } from "./i18n.js";
import { state } from "./store.js";

export class Idle {
  constructor(flow) {
    this.flow = flow;
    this.watching = false;
    this.warning = false;
    this.timer = null;
    this.ticker = null;
  }

  /** Start (or restart) watching for inactivity. */
  watch() {
    this.watching = true;
    this.poke();
  }

  stop() {
    this.watching = false;
    clearTimeout(this.timer);
    this.dismiss();
  }

  /** User activity: restart the countdown unless the warning is showing. */
  poke() {
    clearTimeout(this.timer);
    if (!this.watching || this.warning) return;
    this.timer = setTimeout(() => this.warn(), state.config.ui.idleTimeoutS * 1000);
  }

  warn() {
    this.warning = true;
    const total = state.config.ui.idleWarningS;
    let left = total;
    const layer = document.getElementById("layer");
    const sheet = el(html`<div class="sheet idle-sheet" role="alertdialog" aria-modal="true">
      <div class="idle-sheet__row">
        <div>
          <h2 class="sheet__title">${t("idle.title")}</h2>
          <p class="sheet__text">${t("idle.text")}</p>
        </div>
        <div class="ring"><span>${left}</span></div>
      </div>
      <div class="actions">
        <button class="btn" data-idle="restart">${t("idle.restart")}</button>
        <button class="btn btn--primary" data-idle="stay">${t("idle.stay")}</button>
      </div>
    </div>`);
    layer.replaceChildren(sheet);
    layer.hidden = false;
    layer.onclick = (event) => {
      const action = event.target.closest("[data-idle]")?.dataset.idle;
      if (action === "stay") {
        this.dismiss();
        this.flow.activity();
      } else if (action === "restart") {
        this.flow.restart();
      }
    };
    const ring = sheet.querySelector(".ring");
    this.ticker = setInterval(() => {
      left -= 1;
      ring.style.setProperty("--p", String(Math.max(left, 0) / total));
      ring.firstElementChild.textContent = String(Math.max(left, 0));
      if (left <= 0) this.flow.restart();
    }, 1000);
    if (state.a11y) this.flow.speak(t("idle.title"));
  }

  dismiss() {
    clearInterval(this.ticker);
    if (!this.warning) return;
    this.warning = false;
    const layer = document.getElementById("layer");
    layer.hidden = true;
    layer.replaceChildren();
    this.poke();
  }
}
