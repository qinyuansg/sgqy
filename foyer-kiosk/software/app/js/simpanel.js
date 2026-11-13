// Developer panel for simulation mode (?simpanel=1): drives the simulated devices.

import { api } from "./api.js";
import { el, html } from "./dom.js";

const CONTROLS = [
  ["Person approaches", "presence", { present: true }],
  ["Person leaves", "presence", { present: false }],
  ["Scan invitation QR", "qr", { code: "INV-7KQ2M9" }],
  ["Scan unknown QR", "qr", { code: "INV-UNKNOWN" }],
  ["Next ID read fails", "id-reader", { fail: "unreadable" }],
  ["Spoof face (low liveness)", "liveness", { score: 0.2 }],
  ["Live face", "liveness", { score: 0.97 }],
  ["VMS offline", "vms", { online: false }],
  ["VMS online", "vms", { online: true }],
  ["Power: PoE high", "power", { source: "poe" }],
  ["Power: limited", "power", { source: "limited" }],
  ["Door open", "door", { open: true }],
  ["Door closed", "door", { open: false }],
];

export function mountSimPanel(root) {
  const panel = el(html`<div class="simpanel"><strong>Simulator</strong>
    ${CONTROLS.map(([label], i) => html`<button data-sim="${i}">${label}</button>`)}</div>`);
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sim]");
    if (!button) return;
    const [, name, body] = CONTROLS[Number(button.dataset.sim)];
    api.sim(name, body).catch(() => {});
  });
  root.append(panel);
  document.body.classList.add("pointer");
}
