// Building blocks shared by screens.

import { html, raw } from "../dom.js";

export function head({ eyebrow, title, lede }) {
  return html`<div class="screen__head">
    ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ""}
    <h1 class="title">${title}</h1>
    ${lede ? html`<p class="lede">${lede}</p>` : ""}
  </div>`;
}

export const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const firstName = (full) => (full || "").split(/\s+/)[0];

// Line illustrations (accent strokes on neutral shapes).
export const art = {
  qr: raw(`<svg class="art art--qr" viewBox="0 0 520 340" aria-hidden="true">
    <rect x="150" y="10" width="220" height="300" rx="40" class="art-fill"/>
    <rect x="150" y="10" width="220" height="300" rx="40" class="art-line"/>
    <rect x="232" y="28" width="56" height="9" rx="4.5" class="art-muted"/>
    <g class="art-accent-fill" transform="translate(196 76)">
      <path fill-rule="evenodd" d="M0 8a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8Zm10 2v24h24V10Z"/>
      <rect x="15" y="15" width="14" height="14" rx="3"/>
      <path fill-rule="evenodd" d="M84 8a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H92a8 8 0 0 1-8-8Zm10 2v24h24V10Z"/>
      <rect x="99" y="15" width="14" height="14" rx="3"/>
      <path fill-rule="evenodd" d="M0 92a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8Zm10 2v24h24V94Z"/>
      <rect x="15" y="99" width="14" height="14" rx="3"/>
      <rect x="56" y="2" width="12" height="12" rx="3"/><rect x="56" y="26" width="12" height="12" rx="3"/>
      <rect x="56" y="56" width="12" height="12" rx="3"/><rect x="2" y="56" width="12" height="12" rx="3"/>
      <rect x="28" y="56" width="12" height="12" rx="3"/><rect x="86" y="56" width="12" height="12" rx="3"/>
      <rect x="112" y="56" width="16" height="12" rx="3"/><rect x="56" y="84" width="12" height="12" rx="3"/>
      <rect x="84" y="84" width="20" height="20" rx="4"/><rect x="114" y="88" width="12" height="12" rx="3"/>
      <rect x="56" y="112" width="24" height="12" rx="3"/><rect x="92" y="114" width="12" height="12" rx="3"/>
      <rect x="114" y="112" width="14" height="14" rx="3"/>
    </g>
    <rect class="scanline" x="180" y="70" width="160" height="5" rx="2.5"/>
    <rect x="236" y="262" width="48" height="8" rx="4" class="art-muted"/>
    <path d="M70 330h380" class="art-line art-line--thick"/>
  </svg>`),
  reader: raw(`<svg class="art art--reader" viewBox="0 0 520 300" aria-hidden="true">
    <rect x="70" y="140" width="380" height="120" rx="28" class="art-fill"/>
    <rect x="70" y="140" width="380" height="120" rx="28" class="art-line"/>
    <rect x="100" y="160" width="320" height="64" rx="14" class="art-glass"/>
    <g class="doc">
      <rect x="150" y="40" width="220" height="150" rx="16" class="art-fill"/>
      <rect x="150" y="40" width="220" height="150" rx="16" class="art-line"/>
      <rect x="172" y="66" width="54" height="68" rx="10" class="art-accent-soft"/>
      <rect x="244" y="72" width="100" height="10" rx="5" class="art-muted"/>
      <rect x="244" y="94" width="70" height="10" rx="5" class="art-muted"/>
      <rect x="172" y="152" width="172" height="8" rx="4" class="art-muted"/>
      <rect x="172" y="168" width="150" height="8" rx="4" class="art-muted"/>
    </g>
    <rect class="sweep" x="100" y="160" width="12" height="64" rx="6"/>
  </svg>`),
};
