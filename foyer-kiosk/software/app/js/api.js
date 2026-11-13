// REST + WebSocket client for the local device agent.

export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("agent_unreachable", 0);
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || `http_${response.status}`, response.status);
  return data;
}

export const api = {
  config: () => request("GET", "/api/config"),
  startSession: (language) => request("POST", "/api/session", { language }),
  endSession: (id) => request("DELETE", `/api/session/${id}`),
  touch: (id) => request("POST", `/api/session/${id}/touch`),
  setLanguage: (id, language) => request("POST", `/api/session/${id}/language`, { language }),
  invitation: (id, code) => request("POST", `/api/session/${id}/invitation`, { code }),
  hosts: (id, q) => request("GET", `/api/session/${id}/hosts?q=${encodeURIComponent(q)}`),
  visitor: (id, details) => request("POST", `/api/session/${id}/visitor`, details),
  scanDocument: (id) => request("POST", `/api/session/${id}/document`),
  captureFace: (id) => request("POST", `/api/session/${id}/face`),
  consent: (id, data) => request("POST", `/api/session/${id}/consent`, data),
  submit: (id) => request("POST", `/api/session/${id}/submit`),
  cameraUrl: (id) => `/api/session/${id}/camera.mjpg`,
  speak: (text, language) => request("POST", "/api/tts", { text, language }),
  call: (action) => request("POST", "/api/call", { action }),
  sim: (event, body = {}) => request("POST", `/api/sim/${event}`, body),
};

/** Reconnecting event stream; *onEvent* receives every agent event object. */
export function connectEvents(onEvent, onStatus) {
  let socket;
  let delay = 500;
  const open = () => {
    socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    socket.onopen = () => { delay = 500; onStatus(true); };
    socket.onmessage = (message) => {
      try { onEvent(JSON.parse(message.data)); } catch { /* ignore malformed frames */ }
    };
    socket.onclose = () => {
      onStatus(false);
      setTimeout(open, delay);
      delay = Math.min(delay * 2, 8000);
    };
  };
  open();
}
