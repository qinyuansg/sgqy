import { html } from "../dom.js";
import { language } from "../i18n.js";
import { attachKeyboard, keyboardTemplate } from "../keyboard.js";
import { head } from "./common.js";

export const field = (name, label, value, placeholder, capitalize = "words") => html`
  <label class="field">
    <span class="field__label">${label}</span>
    <input class="field__input" name="${name}" value="${value}" placeholder="${placeholder}" inputmode="none"
           autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" data-capitalize="${capitalize}">
  </label>`;

export default {
  id: "name",
  step: 0,
  back: true,

  render({ state, t }) {
    return html`<section class="screen screen--form">
      ${head({ eyebrow: t("name.eyebrow"), title: t("name.title") })}
      <div class="screen__body">
        <div class="form">
          ${field("first", t("name.first"), state.visit.firstName, t("name.firstPlaceholder"))}
          ${field("last", t("name.last"), state.visit.lastName, t("name.lastPlaceholder"))}
        </div>
        ${keyboardTemplate(language(), t("keyboard.next"))}
      </div>
    </section>`;
  },

  mount(root, { flow, state, t }) {
    const first = root.querySelector("[name=first]");
    const last = root.querySelector("[name=last]");
    return attachKeyboard(root, {
      lang: language(),
      actionLabel: t("keyboard.next"),
      onAction: () => {
        if (document.activeElement === first && !last.value.trim()) {
          last.focus();
          return;
        }
        const firstName = first.value.trim();
        const lastName = last.value.trim();
        if (!firstName || !lastName) {
          flow.toast(t(firstName ? "errors.invalid_last_name" : "errors.invalid_first_name"));
          return;
        }
        Object.assign(state.visit, { firstName, lastName });
        flow.go("company");
      },
    });
  },
};
