import { html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { head } from "./common.js";

export default {
  id: "start",
  step: null,
  back: "restart",

  render({ state, t }) {
    const { ui } = state.config;
    const option = (action, iconName, title, text) => html`
      <button class="card option" data-action="${action}">
        <span class="option__icon">${icon(iconName)}</span>
        <span><span class="option__title">${title}</span><span class="option__text">${text}</span></span>
        <span class="option__chev">${icon("chevronRight")}</span>
      </button>`;
    return html`<section class="screen screen--start">
      ${head({ eyebrow: t("start.eyebrow"), title: t("start.title") })}
      <div class="screen__body start__options">
        ${ui.inviteEnabled ? option("invite", "qr", t("start.invite"), t("start.inviteText")) : ""}
        ${ui.walkupEnabled ? option("walkup", "user", t("start.walkup"), t("start.walkupText")) : ""}
      </div>
    </section>`;
  },

  mount(root, { flow }) {
    return onAction(root, {
      invite: () => flow.begin("invite").catch((e) => flow.fail(e)),
      walkup: () => flow.begin("walkup").catch((e) => flow.fail(e)),
    });
  },
};
