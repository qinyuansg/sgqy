import attract from "./attract.js";
import company from "./company.js";
import consent from "./consent.js";
import documentScreen from "./document.js";
import done from "./done.js";
import face from "./face.js";
import host from "./host.js";
import invite from "./invite.js";
import name from "./name.js";
import purpose from "./purpose.js";
import scan from "./scan.js";
import start from "./start.js";
import submit from "./submit.js";

export const screens = Object.fromEntries(
  [attract, start, scan, invite, name, company, host, purpose, documentScreen, face, consent, submit, done].map((s) => [s.id, s]),
);
