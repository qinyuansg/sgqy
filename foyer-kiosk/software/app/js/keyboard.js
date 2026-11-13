// On-screen keyboard (the kiosk compositor has no system keyboard).
// Keys type into the focused .field__input; inputs keep inputmode="none".

import { html } from "./dom.js";
import { t } from "./i18n.js";
import { icon } from "./icons.js";

const LAYOUTS = {
  en: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
  de: ["qwertzuiopü", "asdfghjklöä", "yxcvbnmß"],
};
const SYMBOLS = ["1234567890", "-/:;()&@.,", "'+#!?"];

function letterRows(lang, symbols, shifted) {
  const rows = symbols ? SYMBOLS : LAYOUTS[lang] ?? LAYOUTS.en;
  return rows.map((row) => [...row].map((c) => (shifted && !symbols ? c.toUpperCase() : c)));
}

export function keyboardTemplate(lang, actionLabel, { symbols = false, shifted = false } = {}) {
  const rows = letterRows(lang, symbols, shifted);
  const key = (c) => html`<button class="key" data-key="${c}" type="button">${c}</button>`;
  return html`<div class="keyboard" role="group" aria-label="${t("keyboard.label")}">
    <div class="keyboard__row">${rows[0].map(key)}</div>
    <div class="keyboard__row">${rows[1].map(key)}</div>
    <div class="keyboard__row">
      <button class="key key--wide ${shifted ? "pressed" : ""}" data-key="shift" type="button" aria-label="shift">${icon("shift")}</button>
      ${rows[2].map(key)}
      <button class="key key--wide" data-key="backspace" type="button" aria-label="delete">${icon("backspace")}</button>
    </div>
    <div class="keyboard__row">
      <button class="key key--wide" data-key="symbols" type="button">${symbols ? "ABC" : "123"}</button>
      <button class="key" data-key="-" type="button">-</button>
      <button class="key key--space" data-key=" " type="button">${t("keyboard.space")}</button>
      <button class="key" data-key="'" type="button">'</button>
      <button class="key key--action" data-key="action" type="button">${actionLabel}</button>
    </div>
  </div>`;
}

/**
 * Wire a keyboard rendered by keyboardTemplate inside *root*.
 * onAction() is called for the action key; onChange(input) after each edit.
 */
export function attachKeyboard(root, { lang, actionLabel, onAction, onChange }) {
  let symbols = false;
  let shifted = false;
  let active = root.querySelector(".field__input");

  const capitalizeNext = () => {
    if (!active || active.dataset.capitalize !== "words") return false;
    return active.value === "" || /[\s\-']$/.test(active.value);
  };

  const redraw = () => {
    const holder = root.querySelector(".keyboard");
    const tpl = document.createElement("template");
    tpl.innerHTML = keyboardTemplate(lang, actionLabel, { symbols, shifted: shifted || capitalizeNext() }).value;
    holder.replaceWith(tpl.content.firstElementChild);
  };

  const focusField = (input) => {
    active = input;
    root.querySelectorAll(".field").forEach((f) => f.classList.toggle("focus", f.contains(input)));
    input.focus({ preventScroll: true });
    redraw();
  };

  const onFocus = (event) => {
    if (event.target.classList.contains("field__input")) focusField(event.target);
  };

  const onPress = (event) => {
    const button = event.target.closest(".keyboard [data-key]");
    if (!button) return;
    event.preventDefault(); // keep focus in the field
    const k = button.dataset.key;
    if (k === "action") {
      onAction();
      return;
    }
    if (k === "shift") shifted = !shifted;
    else if (k === "symbols") symbols = !symbols;
    else if (active) {
      if (k === "backspace") active.value = active.value.slice(0, -1);
      else if (active.value.length < (Number(active.maxLength) > 0 ? active.maxLength : 80)) {
        const upper = shifted || capitalizeNext();
        active.value += upper ? k.toUpperCase() : k;
        shifted = false;
      }
      active.dispatchEvent(new Event("input", { bubbles: true }));
      onChange?.(active);
    }
    redraw();
  };

  root.addEventListener("pointerdown", onPress);
  root.addEventListener("focusin", onFocus);
  if (active) focusField(active);
  return () => {
    root.removeEventListener("pointerdown", onPress);
    root.removeEventListener("focusin", onFocus);
  };
}
