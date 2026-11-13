import { html, onAction, raw } from "../dom.js";
import { icon } from "../icons.js";
import { firstName } from "./common.js";

export default {
  id: "done",
  step: 5,
  back: false,

  render({ state, t }) {
    const { result } = state.visit;
    const host = result.hostName;
    const message = {
      approved: t("done.notified", { host }),
      pending: t("done.pending"),
      queued: t("done.queued", { host }),
    }[result.status] ?? t("done.pending");
    const number = result.badgeNumber;
    let badgeText = t("done.badgeCollectText", { number });
    if (result.status === "queued") badgeText = t("done.badgeTextProvisional", { number });
    else if (result.validUntil) badgeText = t("done.badgeText", { number, until: result.validUntil });
    return html`<section class="screen screen--done">
      <div class="done__mark" aria-hidden="true">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><path d="m38 62 15 15 30-33"/></svg>
      </div>
      <div class="screen__head">
        <h1 class="title">${t("done.title", { name: firstName(state.visit.firstName) })}</h1>
        <p class="lede">${message}</p>
      </div>
      <div class="screen__body">
        <div class="done__cards">
          <div class="card done__card">
            <span class="done__icon">${icon("printer")}</span>
            <div>
              <div class="done__card-title">${result.printed ? t("done.badgePrinting") : t("done.badgeCollect")}</div>
              <div class="done__card-text">${result.printed ? badgeText : t("done.badgeCollectText", { number })}</div>
            </div>
          </div>
          ${result.passQrSvg ? html`<div class="card done__card done__card--pass">
            <div class="done__qr">${raw(result.passQrSvg)}</div>
            <div>
              <div class="done__card-title">${t("done.passTitle")}</div>
              <div class="done__card-text">${t("done.passText")}</div>
            </div>
          </div>` : ""}
        </div>
        <div class="spacer"></div>
        <div class="done__footer">
          <span class="done__closing" data-closing>${t("done.closing", { s: state.config.ui.doneTimeoutS })}</span>
          <button class="btn btn--primary" data-action="finish">${t("done.finish")}</button>
        </div>
      </div>
    </section>`;
  },

  mount(root, { flow, state, t }) {
    let left = state.config.ui.doneTimeoutS;
    const label = root.querySelector("[data-closing]");
    const timer = setInterval(() => {
      left -= 1;
      label.textContent = t("done.closing", { s: left });
      if (left <= 0) flow.restart({ silent: true });
    }, 1000);
    const dispose = onAction(root, { finish: () => flow.restart({ silent: true }) });
    return () => {
      clearInterval(timer);
      dispose();
    };
  },
};
