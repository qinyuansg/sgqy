import { el, html } from "../dom.js";
import { language } from "../i18n.js";
import { icon } from "../icons.js";
import { attachKeyboard, keyboardTemplate } from "../keyboard.js";
import { head, initials } from "./common.js";

export default {
  id: "host",
  step: 0,
  back: true,

  render({ t }) {
    return html`<section class="screen screen--form screen--host">
      ${head({ eyebrow: t("host.eyebrow"), title: t("host.title") })}
      <div class="screen__body">
        <label class="field field--search">
          <span class="field__label">${t("host.label")}</span>
          <input class="field__input" name="host" placeholder="${t("host.placeholder")}" inputmode="none"
                 autocomplete="off" spellcheck="false" maxlength="60" data-capitalize="none">
          <span class="field__icon">${icon("search")}</span>
        </label>
        <div class="results" data-results><p class="results__hint">${t("host.hint")}</p></div>
        ${keyboardTemplate(language(), t("keyboard.done"))}
      </div>
    </section>`;
  },

  mount(root, { flow, state, api, t }) {
    const input = root.querySelector("[name=host]");
    const results = root.querySelector("[data-results]");
    let hosts = [];
    let seq = 0;
    let debounce;

    const show = (items, query) => {
      hosts = items;
      if (query.length < 2) {
        results.replaceChildren(el(html`<p class="results__hint">${t("host.hint")}</p>`));
        return;
      }
      if (!items.length) {
        results.replaceChildren(el(html`<p class="results__hint">${t("host.empty")}</p>`));
        return;
      }
      results.replaceChildren(
        ...items.slice(0, 3).map((h) =>
          el(html`<button class="card result ${state.visit.host?.id === h.id ? "selected" : ""}" data-host="${h.id}">
            <span class="avatar">${initials(h.name)}</span>
            <span><span class="result__name">${h.name}</span><span class="result__dept">${h.department}</span></span>
            <span class="result__check">${icon("check")}</span>
          </button>`),
        ),
      );
    };

    const search = () => {
      const query = input.value.trim();
      const mine = ++seq;
      clearTimeout(debounce);
      if (query.length < 2) {
        show([], query);
        return;
      }
      debounce = setTimeout(async () => {
        try {
          const items = await api.hosts(state.sessionId, query);
          if (mine === seq) show(items, query);
        } catch (error) {
          flow.fail(error);
        }
      }, 180);
    };

    const choose = (host) => {
      state.visit.host = host;
      flow.go("purpose");
    };

    results.addEventListener("click", (event) => {
      const button = event.target.closest("[data-host]");
      if (!button) return;
      button.classList.add("selected");
      setTimeout(() => choose(hosts.find((h) => h.id === button.dataset.host)), 220);
    });

    return attachKeyboard(root, {
      lang: language(),
      actionLabel: t("keyboard.done"),
      onChange: search,
      onAction: () => (hosts.length === 1 ? choose(hosts[0]) : flow.toast(t("errors.invalid_host"))),
    });
  },
};
