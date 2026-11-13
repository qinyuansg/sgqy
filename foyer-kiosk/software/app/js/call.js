// "Call reception" overlay (stub ringing/connected states, or an embedded WebRTC page).

import { api } from "./api.js";
import { el, html } from "./dom.js";
import { t } from "./i18n.js";
import { icon } from "./icons.js";

let active = null;

function render(state, url) {
  const connected = state === "connected";
  return html`<div class="sheet call-sheet" role="dialog" aria-modal="true">
    <div class="call-sheet__avatar ${connected ? "" : "ringing"}">${icon("user")}</div>
    <h2 class="sheet__title">${connected ? t("call.connected") : t("call.calling")}</h2>
    <p class="sheet__text">${connected ? t("call.connectedText") : t("call.callingText")}</p>
    ${url ? html`<iframe class="call-sheet__frame" src="${url}" allow="microphone; camera; autoplay"></iframe>` : ""}
    <p class="call-sheet__timer" data-timer>${connected ? "0:00" : ""}</p>
    <button class="btn btn--danger btn--block" data-call="end">${icon("phone", "hangup")}${t("call.end")}</button>
  </div>`;
}

function show(state, url) {
  const layer = document.getElementById("layer");
  layer.replaceChildren(el(render(state, url)));
  layer.hidden = false;
  layer.onclick = (event) => {
    if (event.target.closest("[data-call='end']")) closeCall();
  };
  clearInterval(active?.timer);
  if (state === "connected") {
    const started = Date.now();
    const timerNode = layer.querySelector("[data-timer]");
    active.timer = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      timerNode.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }, 1000);
  }
}

export async function openCall(flow) {
  active = { flow, timer: null };
  flow.idle.stop(); // a call can last longer than the idle timeout
  show("ringing");
  try {
    const response = await api.call("start");
    if (response.state === "embedded") show("connected", response.url);
  } catch (error) {
    closeCall();
    flow.fail(error);
  }
}

export function onCallEvent(event) {
  if (!active) return;
  if (event.state === "connected") show("connected");
  if (event.state === "ended") closeCall(false);
}

export function closeCall(notify = true) {
  if (!active) return;
  clearInterval(active.timer);
  const { flow } = active;
  active = null;
  const layer = document.getElementById("layer");
  layer.hidden = true;
  layer.replaceChildren();
  if (notify) api.call("end").catch(() => {});
  flow.syncIdle();
}
