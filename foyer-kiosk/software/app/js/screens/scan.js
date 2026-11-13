import { html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { art, head } from "./common.js";

export default {
  id: "scan",
  step: 0,
  back: true,

  render({ t }) {
    return html`<section class="screen screen--scan">
      ${head({ eyebrow: t("scan.eyebrow"), title: t("scan.title"), lede: t("scan.lede") })}
      <div class="screen__body scan__body">
        <div class="spacer"></div>
        <div class="scan__stage">${art.qr}</div>
        <div class="status-pill" data-status><span class="status-pill__dot"></span><span data-status-text>${t("scan.waiting")}</span></div>
        <div class="scan__pointer" aria-hidden="true">${icon("arrowLeft")}</div>
        <div class="spacer"></div>
        <button class="btn btn--ghost" data-action="walkup">${t("scan.noInvite")}${icon("arrowRight")}</button>
      </div>
    </section>`;
  },

  mount(root, { flow, state }) {
    this.root = root;
    this.busy = false;
    return onAction(root, {
      walkup: () => {
        state.visit.mode = "walkup";
        flow.go("name", { replace: true });
      },
    });
  },

  async onEvent(event, { flow, state, api, t }) {
    if (event.type !== "qr" || this.busy) return;
    this.busy = true;
    const pill = this.root.querySelector("[data-status]");
    pill.classList.add("busy");
    pill.querySelector("[data-status-text]").textContent = t("scan.looking");
    try {
      state.visit.invite = await api.invitation(state.sessionId, event.code);
      state.visit.mode = "invite";
      flow.go("invite");
    } catch (error) {
      if (!flow.fail(error)) {
        pill.classList.remove("busy");
        pill.querySelector("[data-status-text]").textContent = t("scan.waiting");
      }
    } finally {
      this.busy = false;
    }
  },
};
