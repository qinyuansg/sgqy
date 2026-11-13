import { el, html, onAction, sleep } from "../dom.js";
import { icon } from "../icons.js";
import { head } from "./common.js";

export default {
  id: "face",
  step: 2,
  back: true,

  render({ state, t }) {
    const captured = state.visit.facePreview;
    return html`<section class="screen screen--face ${captured ? "captured" : ""}">
      <div data-head>${captured
        ? head({ eyebrow: t("face.eyebrow"), title: t("face.goodTitle"), lede: t("face.goodLede") })
        : head({ eyebrow: t("face.eyebrow"), title: t("face.title"), lede: t("face.lede") })}</div>
      <div class="screen__body">
        <div class="camera">
          <svg class="camera__ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48.5"/></svg>
          <div class="camera__lens">
            <img class="camera__feed" data-feed alt="" src="${captured || ""}">
            <div class="camera__count" data-count></div>
          </div>
          <div class="camera__badge">${icon("check")}</div>
        </div>
        <div class="spacer"></div>
        <div class="actions" data-actions>${this.buttons(Boolean(captured), t)}</div>
      </div>
    </section>`;
  },

  buttons(captured, t) {
    return captured
      ? html`<button class="btn" data-action="retake">${icon("refresh")}${t("face.retake")}</button>
             <button class="btn btn--primary" data-action="use">${t("face.use")}${icon("arrowRight")}</button>`
      : html`<button class="btn btn--primary btn--block" data-action="take">${t("face.take")}</button>`;
  },

  mount(root, ctx) {
    const { state, api } = ctx;
    this.root = root;
    if (!state.visit.facePreview) root.querySelector("[data-feed]").src = api.cameraUrl(state.sessionId);
    const dispose = onAction(root, {
      take: () => this.capture(ctx),
      retake: () => {
        state.visit.facePreview = null;
        ctx.flow.refresh();
      },
      use: () => ctx.flow.go("consent"),
    });
    return () => {
      dispose();
      root.querySelector("[data-feed]").src = ""; // closes the MJPEG stream
    };
  },

  async capture({ flow, state, api, t }) {
    const root = this.root;
    const count = root.querySelector("[data-count]");
    const actions = root.querySelector("[data-actions]");
    actions.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    root.classList.add("counting");
    for (const n of [3, 2, 1]) {
      count.textContent = String(n);
      count.classList.remove("pop");
      void count.offsetWidth;
      count.classList.add("pop");
      await sleep(800);
      if (!root.isConnected) return;
    }
    count.textContent = "";
    root.classList.replace("counting", "checking");
    try {
      const result = await api.captureFace(state.sessionId);
      if (!root.isConnected) return;
      if (result.passed) {
        state.visit.facePreview = result.preview;
        flow.refresh();
        return;
      }
      root.querySelector("[data-head]").replaceChildren(
        el(head({ eyebrow: t("face.eyebrow"), title: t("face.failTitle"), lede: t("face.failLede", { left: result.attemptsLeft }) })),
      );
      if (result.attemptsLeft <= 0) {
        actions.replaceChildren(el(html`<p class="notice">${t("face.exhausted")}</p>`));
        return;
      }
    } catch (error) {
      if (flow.fail(error)) return;
    } finally {
      root.classList.remove("checking", "counting");
    }
    actions.querySelectorAll("button").forEach((b) => { b.disabled = false; });
  },
};
