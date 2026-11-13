import { html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { head, initials } from "./common.js";

const ICONS = { meeting: "users", interview: "briefcase", delivery: "package", contractor: "wrench" };

export default {
  id: "purpose",
  step: 0,
  back: true,

  render({ state, t }) {
    const { host } = state.visit;
    return html`<section class="screen screen--purpose">
      ${head({ eyebrow: t("purpose.eyebrow"), title: t("purpose.title") })}
      <div class="screen__body">
        <div class="host-chip host-chip--compact">
          <span class="avatar">${initials(host.name)}</span>
          <span><span class="host-chip__name">${host.name}</span><span class="host-chip__dept">${host.department}</span></span>
        </div>
        <div class="purpose-grid">
          ${state.config.ui.purposes.map(
            (p) => html`<button class="card purpose ${state.visit.purpose === p ? "selected" : ""}" data-action="pick" data-purpose="${p}">
              <span class="purpose__icon">${icon(ICONS[p] ?? "sparkle")}</span>
              <span class="purpose__label">${t(`purpose.${p}`)}</span>
              <span class="purpose__check">${icon("check")}</span></button>`,
          )}
        </div>
      </div>
    </section>`;
  },

  mount(root, { flow, state, api }) {
    let busy = false;
    return onAction(root, {
      pick: async (button) => {
        if (busy) return;
        busy = true;
        root.querySelectorAll(".purpose").forEach((b) => b.classList.toggle("selected", b === button));
        state.visit.purpose = button.dataset.purpose;
        const v = state.visit;
        try {
          await api.visitor(state.sessionId, {
            firstName: v.firstName, lastName: v.lastName, company: v.company, hostId: v.host.id, purpose: v.purpose,
          });
          flow.go("document");
        } catch (error) {
          flow.fail(error);
        } finally {
          busy = false;
        }
      },
    });
  },
};
