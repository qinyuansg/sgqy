// Tiny templating: `html` escapes every interpolation unless it is wrapped in raw().

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

class Raw {
  constructor(value) { this.value = value; }
}

export const raw = (value) => new Raw(String(value));

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function render(value) {
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === false || value === null || value === undefined) return "";
  return escape(value);
}

/** Tagged template returning a Raw fragment so templates compose. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += render(value) + strings[i + 1]; });
  return new Raw(out);
}

/** Build a DOM element from a template fragment. */
export function el(fragment) {
  const tpl = document.createElement("template");
  tpl.innerHTML = fragment instanceof Raw ? fragment.value : escape(fragment);
  return tpl.content.firstElementChild;
}

export const $ = (root, selector) => root.querySelector(selector);

/** Delegated tap handler on elements with data-action. Returns a disposer. */
export function onAction(root, handlers) {
  const listener = (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !root.contains(target) || target.disabled) return;
    const handler = handlers[target.dataset.action];
    if (handler) handler(target, event);
  };
  root.addEventListener("click", listener);
  return () => root.removeEventListener("click", listener);
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
