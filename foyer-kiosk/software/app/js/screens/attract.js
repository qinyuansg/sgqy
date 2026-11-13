import { html, onAction } from "../dom.js";
import { language, languages, nativeName } from "../i18n.js";
import { icon } from "../icons.js";

function clock(lang) {
  const now = new Date();
  return {
    time: now.toLocaleTimeString(lang, { hour: "numeric", minute: "2-digit" }),
    date: now.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" }),
  };
}

export default {
  id: "attract",
  step: null,

  render({ state, t }) {
    const { time, date } = clock(language());
    return html`<section class="screen screen--attract ${state.presence ? "present" : ""}" data-action="begin">
      <div class="attract__clock">
        <span class="attract__time" data-time>${time}</span>
        <span class="attract__date" data-date>${date}</span>
      </div>
      <div class="screen__head attract__hero">
        <p class="eyebrow">${state.config.branding.welcomeLocation}</p>
        <h1 class="attract__title">
          <span class="attract__greeting" data-greeting>${state.presence ? t("attract.greetingPresent") : t("attract.greeting")}</span>
          <span>${t("attract.title")}</span>
        </h1>
        <p class="lede">${t("attract.lede")}</p>
      </div>
      <div class="screen__body attract__body">
        <button class="btn btn--primary attract__cta" data-action="begin">${t("attract.cta")}${icon("arrowRight")}</button>
        <div class="attract__hint">${icon("qr")}<span>${t("attract.invitationHint")}</span></div>
        <div class="attract__options">
          ${languages().map(
            (lang) => html`<button class="btn btn--chip ${lang === language() ? "selected" : ""}" data-action="lang" data-lang="${lang}">${nativeName(lang)}</button>`,
          )}
          <button class="btn btn--chip ${state.a11y ? "selected" : ""}" data-action="access">${icon("accessibility")}${t("attract.accessibility")}</button>
        </div>
      </div>
    </section>`;
  },

  mount(root, { flow, state, t }) {
    const dispose = onAction(root, {
      begin: () => flow.go("start"),
      lang: (button) => flow.setLanguage(button.dataset.lang),
      access: () => flow.toggleA11y(),
    });
    const tick = setInterval(() => {
      const { time, date } = clock(language());
      root.querySelector("[data-time]").textContent = time;
      root.querySelector("[data-date]").textContent = date;
    }, 10_000);
    this.greet = () => {
      root.classList.toggle("present", state.presence);
      root.querySelector("[data-greeting]").textContent = state.presence ? t("attract.greetingPresent") : t("attract.greeting");
    };
    return () => {
      dispose();
      clearInterval(tick);
    };
  },

  onEvent(event, { flow }) {
    if (event.type === "presence" || event.type === "hello") this.greet?.();
    if (event.type === "qr") {
      // Scanning an invitation straight from the welcome screen skips the chooser.
      flow.begin("invite").then(() => flow.current.onEvent?.(event, flow.ctx())).catch((e) => flow.fail(e));
    }
  },
};
