// Inline stroke icons (24px grid, 1.75 stroke), drawn for Foyer.
import { raw } from "./dom.js";

const paths = {
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  phone: '<path d="M5 4h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 6 6l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14.2a6.5 6.5 0 0 1 3 5.3"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
  package: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.3l8 4.4"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L21 13l-1.5 1.5-1.4-1.4-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6-1.4-1.4L15 7Z"/><path d="M14.7 4.2a4 4 0 0 1 5 5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  accessibility: '<circle cx="12" cy="4.5" r="1.6"/><path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1"/><path d="M12 9.5v4.5m0 0-3 6.5m3-6.5 3 6.5"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 19.5h1.5M19.5 14v2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  idCard: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.4 1.7-2.1 3-2.1s2.4.7 3 2.1M14.5 10h4M14.5 13.5h3"/>',
  printer: '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  backspace: '<path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7Z"/><path d="m12 9.5 5 5m0-5-5 5"/>',
  shift: '<path d="M12 4 4 12h4.5v7h7v-7H20Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  building: '<path d="M4 20.5V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5v15M15 10h3.5a1.5 1.5 0 0 1 1.5 1.5v9M2.5 20.5h19M8 8h3M8 12h3M8 16h3"/>',
  shield: '<path d="M12 3.5 19.5 6v5.6c0 4.4-3.1 8-7.5 9-4.4-1-7.5-4.6-7.5-9V6Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  sparkle: '<path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15a2 2 0 0 0-1.2-1.2L3.5 12 9 10.2A2 2 0 0 0 10.2 9Z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5M20 20v-4.5h-4.5"/>',
};

export function icon(name, cls = "") {
  return raw(
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ` +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`,
  );
}
