import { html, onAction } from "../dom.js";
import { icon } from "../icons.js";
import { SignaturePad } from "../signature.js";
import { head } from "./common.js";

export default {
  id: "consent",
  step: 3,
  back: true,

  render({ state, t }) {
    const company = state.config.branding.company;
    const toggle = (name, label) => html`<button class="check" role="switch" aria-checked="false" data-action="toggle" data-name="${name}">
      <span>${label}</span><span class="switch"></span></button>`;
    return html`<section class="screen screen--consent">
      ${head({ eyebrow: t("consent.eyebrow"), title: t("consent.title") })}
      <div class="screen__body">
        <div class="card terms">
          <h2 class="terms__title">${icon("shield")}${t("consent.privacyTitle")}</h2>
          <p>${t("consent.privacyText", { company })}</p>
          <h2 class="terms__title">${icon("building")}${t("consent.rulesTitle")}</h2>
          <p>${t("consent.rulesText")}</p>
        </div>
        ${toggle("privacy", t("consent.acceptPrivacy"))}
        ${toggle("rules", t("consent.acceptRules"))}
        <div class="signature">
          <canvas class="signature__pad" data-pad></canvas>
          <div class="signature__hint" data-hint>${t("consent.sign")}</div>
          <div class="signature__line"></div>
          <button class="btn btn--ghost signature__clear" data-action="clear">${t("consent.clear")}</button>
        </div>
        <button class="btn btn--primary btn--block" data-action="submit" disabled>${t("consent.continue")}${icon("arrowRight")}</button>
      </div>
    </section>`;
  },

  mount(root, { flow, state, api }) {
    const accepted = { privacy: false, rules: false };
    let signed = false;
    const submit = root.querySelector("[data-action='submit']");
    const hint = root.querySelector("[data-hint]");
    const update = () => {
      submit.disabled = !(accepted.privacy && accepted.rules && signed);
      hint.hidden = signed;
    };
    const pad = new SignaturePad(root.querySelector("[data-pad]"), (hasInk) => {
      signed = hasInk;
      update();
    });
    const dispose = onAction(root, {
      toggle: (button) => {
        accepted[button.dataset.name] = !accepted[button.dataset.name];
        button.setAttribute("aria-checked", String(accepted[button.dataset.name]));
        update();
      },
      clear: () => pad.clear(),
      submit: async () => {
        submit.disabled = true;
        try {
          await api.consent(state.sessionId, {
            privacyAccepted: accepted.privacy,
            rulesAccepted: accepted.rules,
            privacyVersion: state.config.consent.privacyVersion,
            rulesVersion: state.config.consent.rulesVersion,
            signature: pad.toDataURL(),
          });
          flow.go("submit");
        } catch (error) {
          flow.fail(error);
          update();
        }
      },
    });
    return () => {
      dispose();
      pad.destroy();
    };
  },
};
