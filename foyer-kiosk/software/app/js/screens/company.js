import { html } from "../dom.js";
import { language } from "../i18n.js";
import { attachKeyboard, keyboardTemplate } from "../keyboard.js";
import { head } from "./common.js";
import { field } from "./name.js";

export default {
  id: "company",
  step: 0,
  back: true,

  render({ state, t }) {
    return html`<section class="screen screen--form">
      ${head({ eyebrow: t("company.eyebrow"), title: t("company.title"), lede: t("company.lede") })}
      <div class="screen__body">
        <div class="form">${field("company", t("company.label"), state.visit.company, t("company.placeholder"), "none")}</div>
        ${keyboardTemplate(language(), t("keyboard.next"))}
      </div>
    </section>`;
  },

  mount(root, { flow, state, t }) {
    const input = root.querySelector("[name=company]");
    return attachKeyboard(root, {
      lang: language(),
      actionLabel: t("keyboard.next"),
      onAction: () => {
        state.visit.company = input.value.trim();
        flow.go("host");
      },
    });
  },
};
