import { el, html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { art, firstName, head } from "./common.js";

const STAGES = ["detected", "mrz", "chip", "verified"];

export default {
  id: "document",
  step: 1,
  back: true,

  render({ t }) {
    return html`<section class="screen screen--document">
      <div data-head>${head({ eyebrow: t("document.eyebrow"), title: t("document.title"), lede: t("document.lede") })}</div>
      <div class="screen__body" data-body>
        <div class="doc__stage">${art.reader}</div>
        <ol class="checklist">
          ${STAGES.map((s) => html`<li data-stage="${s}"><span class="checklist__dot">${icon("check")}</span>${t(`document.stages.${s}`)}</li>`)}
        </ol>
      </div>
    </section>`;
  },

  mount(root, ctx) {
    this.root = root;
    const dispose = onAction(root, {
      retry: () => this.scan(ctx),
      next: () => ctx.flow.go("face"),
    });
    if (ctx.state.visit.document) this.showResult(ctx);
    else this.scan(ctx);
    return dispose;
  },

  onEvent(event) {
    if (event.type !== "document.progress") return;
    const index = STAGES.indexOf(event.stage);
    this.root?.querySelectorAll("[data-stage]").forEach((li, i) => {
      li.classList.toggle("done", i <= index);
      li.classList.toggle("active", i === index + 1);
    });
  },

  async scan(ctx) {
    const { api, state, flow, t } = ctx;
    const root = this.root;
    root.classList.remove("failed");
    root.classList.add("scanning");
    root.querySelectorAll("[data-stage]").forEach((li, i) => {
      li.classList.remove("done");
      li.classList.toggle("active", i === 0);
    });
    root.querySelector("[data-retry]")?.remove();
    try {
      const result = await api.scanDocument(state.sessionId);
      if (!root.isConnected) return;
      state.visit.document = result;
      Object.assign(state.visit, { firstName: result.firstName, lastName: result.lastName });
      this.showResult(ctx);
    } catch (error) {
      if (!root.isConnected || flow.fail(error)) return;
      root.classList.add("failed");
      root.querySelector("[data-body]").append(
        el(html`<button class="btn btn--primary btn--block" data-action="retry" data-retry>${icon("refresh")}${t("document.retry")}</button>`),
      );
    } finally {
      root.classList.remove("scanning");
    }
  },

  showResult({ state, t }) {
    const doc = state.visit.document;
    const root = this.root;
    root.classList.add("complete");
    root.querySelector("[data-head]").replaceChildren(
      el(head({ eyebrow: t("document.eyebrow"), title: t("document.doneTitle", { name: firstName(doc.firstName) }), lede: t("document.doneLede") })),
    );
    root.querySelector("[data-body]").replaceChildren(
      el(html`<div class="card idcard">
        <div class="idcard__icon">${icon("idCard")}</div>
        <div class="idcard__main">
          <div class="idcard__name">${doc.firstName} ${doc.lastName}</div>
          <div class="idcard__meta">${t(`document.${doc.documentType}`)} · ${doc.issuingState}</div>
        </div>
        ${doc.chipVerified ? html`<div class="badge-ok">${icon("shield")}${t("document.chipVerified")}</div>` : ""}
      </div>`),
      el(html`<div class="spacer"></div>`),
      el(html`<button class="btn btn--primary btn--block" data-action="next">${t("keyboard.next")}${icon("arrowRight")}</button>`),
    );
  },
};
