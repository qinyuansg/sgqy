import { el, html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { firstName, head } from "./common.js";

export default {
  id: "submit",
  step: 4,
  back: false,

  render({ state, t }) {
    const host = state.visit.host?.name ?? state.visit.invite?.host.name ?? "";
    return html`<section class="screen screen--submit">
      <div class="submit__spinner" aria-hidden="true"><span></span><span></span><span></span></div>
      ${head({ title: t("submit.title"), lede: t("submit.lede", { host: firstName(host) }) })}
      <div class="screen__body" data-body></div>
    </section>`;
  },

  mount(root, ctx) {
    this.send(root, ctx);
    return onAction(root, { retry: () => this.send(root, ctx) });
  },

  async send(root, { flow, state, api, t }) {
    root.querySelector("[data-body]").replaceChildren();
    root.classList.remove("failed");
    try {
      state.visit.result = await api.submit(state.sessionId);
      // The agent has handed the visit over and wiped the session.
      state.sessionId = null;
      flow.go("done", { replace: true });
    } catch (error) {
      if (flow.fail(error)) return;
      root.classList.add("failed");
      root.querySelector("[data-body]").replaceChildren(
        el(html`<button class="btn btn--primary btn--block" data-action="retry">${icon("refresh")}${t("submit.retry")}</button>`),
      );
    }
  },
};
