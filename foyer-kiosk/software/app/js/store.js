// In-memory state of the current visit. Nothing is ever written to browser storage.

export const state = {
  config: null,
  presence: false,
  a11y: false,
  sessionId: null,
  visit: emptyVisit(),
};

function emptyVisit() {
  return {
    mode: null, // invite | walkup
    invite: null,
    firstName: "",
    lastName: "",
    company: "",
    host: null,
    purpose: null,
    document: null,
    facePreview: null,
    result: null,
  };
}

/** Forget everything about the visitor (called on completion, cancel and timeout). */
export function clearVisit() {
  state.sessionId = null;
  state.visit = emptyVisit();
}
