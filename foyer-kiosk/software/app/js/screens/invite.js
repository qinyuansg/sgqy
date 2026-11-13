import { html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { firstName, head, initials } from "./common.js";

export default {
  id: "invite",
  step: 0,
  back: true,

  render({ state, t }) {
    const invite = state.visit.invite;
    const row = (label, value, extra = "") => html`<div class="detail-row">
      <span class="detail-row__label">${label}</span><span class="detail-row__value">${value}${extra}</span></div>`;
    return html`<section class="screen screen--invite">
      ${head({ eyebrow: t("invite.eyebrow"), title: t("invite.title", { name: firstName(invite.firstName) }), lede: t("invite.lede") })}
      <div class="screen__body">
        <div class="card details">
          <div class="host-chip">
            <span class="avatar">${initials(invite.host.name)}</span>
            <span><span class="host-chip__label">${t("invite.visiting")}</span>
              <span class="host-chip__name">${invite.host.name}</span>
              <span class="host-chip__dept">${invite.host.department}</span></span>
          </div>
          ${invite.time ? row(t("invite.time"), invite.time) : ""}
          ${invite.company ? row(t("invite.company"), invite.company) : ""}
        </div>
        <div class="spacer"></div>
        <div class="actions">
          <button class="btn" data-action="notme">${t("invite.notMe")}</button>
          <button class="btn btn--primary" data-action="confirm">${t("invite.confirm")}${icon("arrowRight")}</button>
        </div>
      </div>
    </section>`;
  },

  mount(root, { flow, state }) {
    return onAction(root, {
      notme: () => {
        state.visit.invite = null;
        flow.back();
      },
      confirm: () => {
        const { invite } = state.visit;
        Object.assign(state.visit, { firstName: invite.firstName, lastName: invite.lastName, company: invite.company });
        flow.go("document");
      },
    });
  },
};
