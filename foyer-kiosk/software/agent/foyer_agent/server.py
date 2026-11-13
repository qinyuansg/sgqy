"""Local HTTP + WebSocket API for the kiosk UI (bound to 127.0.0.1)."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from aiohttp import WSMsgType, web

from .enrolment import EnrolmentError
from .hal.lightbar import LightState
from .kiosk import Kiosk
from .monitoring import render_prometheus, snapshot
from .session import EndReason, Session, SessionNotFound
from .sim import SimController

log = logging.getLogger(__name__)

KIOSK = web.AppKey("kiosk", Kiosk)
SIM = web.AppKey("sim", SimController)
ORIGINS = web.AppKey("origins", frozenset)
CSP = web.AppKey("csp", str)
TASKS = web.AppKey("tasks", set)
MAX_BODY = 2 * 1024 * 1024
BRANDING_TYPES = {".svg": "image/svg+xml", ".png": "image/png"}


def _csp(frame_src: str) -> str:
    return (
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
        f"connect-src 'self'; frame-src {frame_src}; media-src 'self'; base-uri 'none'; "
        "form-action 'none'; frame-ancestors 'none'"
    )


def _allowed_origins(host: str, port: int) -> frozenset[str]:
    return frozenset(f"http://{h}:{port}" for h in {host, "127.0.0.1", "localhost"})


@web.middleware
async def _guard(request: web.Request, handler: Any) -> web.StreamResponse:
    origin = request.headers.get("Origin")
    is_ws = request.headers.get("Upgrade", "").lower() == "websocket"
    if origin and (request.method not in ("GET", "HEAD") or is_ws) and origin not in request.app[ORIGINS]:
        return web.json_response({"error": "forbidden_origin"}, status=403)
    try:
        response = await handler(request)
    except SessionNotFound:
        response = web.json_response({"error": "session_not_found"}, status=404)
    except EnrolmentError as exc:
        response = web.json_response({"error": exc.code}, status=exc.status)
    if not response.prepared:
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Content-Security-Policy", request.app[CSP])
        if request.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
    return response


async def _json(request: web.Request) -> dict[str, Any]:
    if not request.can_read_body:
        return {}
    try:
        body = await request.json()
    except ValueError:
        raise web.HTTPBadRequest(text="invalid json") from None
    if not isinstance(body, dict):
        raise web.HTTPBadRequest(text="expected an object")
    return body


def _session(request: web.Request) -> Session:
    kiosk = request.app[KIOSK]
    session = kiosk.sessions.touch(request.match_info["sid"])
    kiosk.activity()
    return session


# -- UI bootstrap ------------------------------------------------------------------------


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(Path(request.app[KIOSK].cfg.server.app_dir) / "index.html")


async def ui_config(request: web.Request) -> web.Response:
    kiosk = request.app[KIOSK]
    cfg = kiosk.cfg
    logo = cfg.branding.logo
    return web.json_response(
        {
            "simulated": kiosk.devices.simulated,
            "branding": {
                "company": cfg.branding.company,
                "welcomeLocation": cfg.branding.welcome_location,
                "accent": cfg.branding.accent,
                "logo": f"/branding/{logo}" if logo else None,
            },
            "ui": {
                "languages": cfg.ui.languages,
                "defaultLanguage": cfg.ui.default_language,
                "theme": cfg.ui.theme,
                "idleTimeoutS": cfg.ui.idle_timeout_s,
                "idleWarningS": cfg.ui.idle_warning_s,
                "doneTimeoutS": cfg.ui.done_timeout_s,
                "inviteEnabled": cfg.ui.invite_enabled,
                "walkupEnabled": cfg.ui.walkup_enabled,
                "purposes": cfg.ui.purposes,
                "tts": cfg.hardware.tts.engine,
            },
            "consent": {"privacyVersion": cfg.consent.privacy_version, "rulesVersion": cfg.consent.rules_version},
        }
    )


async def branding(request: web.Request) -> web.FileResponse:
    name = request.match_info["name"]
    root = Path(request.app[KIOSK].cfg.server.branding_dir)
    path = (root / name).resolve()
    if path.parent != root.resolve() or path.suffix not in BRANDING_TYPES or not path.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={"Content-Type": BRANDING_TYPES[path.suffix]})


# -- session -----------------------------------------------------------------------------


async def start_session(request: web.Request) -> web.Response:
    kiosk = request.app[KIOSK]
    body = await _json(request)
    language = body.get("language")
    if language not in kiosk.cfg.ui.languages:
        language = kiosk.cfg.ui.default_language
    session = kiosk.sessions.start(language)
    kiosk.activity()
    kiosk.devices.lightbar.set_state(LightState.ATTENTION)
    return web.json_response({"id": session.id}, status=201)


async def end_session(request: web.Request) -> web.Response:
    kiosk = request.app[KIOSK]
    with contextlib.suppress(SessionNotFound):
        kiosk.sessions.end(request.match_info["sid"], EndReason.CANCELLED)
    return web.Response(status=204)


async def touch(request: web.Request) -> web.Response:
    _session(request)
    return web.Response(status=204)


async def set_language(request: web.Request) -> web.Response:
    session = _session(request)
    language = (await _json(request)).get("language")
    if language in request.app[KIOSK].cfg.ui.languages:
        session.language = language
    return web.Response(status=204)


async def invitation(request: web.Request) -> web.Response:
    session = _session(request)
    code = str((await _json(request)).get("code", ""))
    return web.json_response(await request.app[KIOSK].enrolment.lookup_invitation(session, code))


async def hosts(request: web.Request) -> web.Response:
    session = _session(request)
    return web.json_response(await request.app[KIOSK].enrolment.search_hosts(session, request.query.get("q", "")))


async def visitor(request: web.Request) -> web.Response:
    session = _session(request)
    request.app[KIOSK].enrolment.set_visitor(session, await _json(request))
    return web.Response(status=204)


async def document(request: web.Request) -> web.Response:
    session = _session(request)
    return web.json_response(await request.app[KIOSK].enrolment.scan_document(session))


async def face(request: web.Request) -> web.Response:
    session = _session(request)
    return web.json_response(await request.app[KIOSK].enrolment.capture_face(session))


async def consent(request: web.Request) -> web.Response:
    session = _session(request)
    request.app[KIOSK].enrolment.record_consent(session, await _json(request))
    return web.Response(status=204)


async def submit(request: web.Request) -> web.Response:
    session = _session(request)
    return web.json_response(await request.app[KIOSK].enrolment.submit(session))


async def camera_stream(request: web.Request) -> web.StreamResponse:
    kiosk = request.app[KIOSK]
    session = kiosk.sessions.get(request.match_info["sid"])
    response = web.StreamResponse(
        headers={"Content-Type": "multipart/x-mixed-replace; boundary=frame", "Cache-Control": "no-store"}
    )
    response.headers["Content-Security-Policy"] = request.app[CSP]
    await response.prepare(request)
    with contextlib.suppress(ConnectionResetError):
        async for frame in kiosk.devices.rgb_camera.preview(kiosk.cfg.hardware.camera.preview_fps):
            if kiosk.sessions.current is not session or request.transport is None or request.transport.is_closing():
                break
            await response.write(
                b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n" % len(frame) + frame + b"\r\n"
            )
    return response


# -- accessories -------------------------------------------------------------------------


async def tts(request: web.Request) -> web.Response:
    kiosk = request.app[KIOSK]
    body = await _json(request)
    text, language = str(body.get("text", "")), str(body.get("language", kiosk.cfg.ui.default_language))
    if text:
        task = asyncio.get_running_loop().create_task(kiosk.devices.speaker.say(text, language))
        request.app[TASKS].add(task)
        task.add_done_callback(request.app[TASKS].discard)
    return web.Response(status=204)


async def call(request: web.Request) -> web.Response:
    kiosk = request.app[KIOSK]
    action = (await _json(request)).get("action")
    kiosk.activity()
    if action == "start":
        return web.json_response(await kiosk.call.start())
    await kiosk.call.end()
    return web.json_response({"state": "ended"})


async def sim_event(request: web.Request) -> web.Response:
    controller = request.app.get(SIM)
    if controller is None:
        raise web.HTTPNotFound()
    return web.json_response(controller.handle(request.match_info["event"], await _json(request)))


# -- monitoring --------------------------------------------------------------------------


async def healthz(request: web.Request) -> web.Response:
    snap = snapshot(request.app[KIOSK])
    return web.json_response({k: snap[k] for k in ("status", "problems", "version", "simulated", "peripherals")})


async def metrics(request: web.Request) -> web.Response:
    return web.Response(
        text=render_prometheus(snapshot(request.app[KIOSK])), content_type="text/plain", charset="utf-8"
    )


async def status(request: web.Request) -> web.Response:
    return web.json_response(snapshot(request.app[KIOSK]))


async def websocket(request: web.Request) -> web.WebSocketResponse:
    kiosk = request.app[KIOSK]
    ws = web.WebSocketResponse(heartbeat=20, max_msg_size=4096)
    await ws.prepare(request)
    await ws.send_json(
        {
            "type": "hello",
            "presence": kiosk.devices.presence.present,
            "door": kiosk.door_open,
            "vms": kiosk.vms_reachable,
            "power": asdict(kiosk.power.budget),
        }
    )

    async def drain_incoming() -> None:
        async for msg in ws:  # the UI only listens; anything it sends is ignored
            if msg.type is WSMsgType.ERROR:
                break

    async with kiosk.bus.subscribe() as queue:
        reader = asyncio.ensure_future(drain_incoming())
        try:
            while not ws.closed:
                getter = asyncio.ensure_future(queue.get())
                done, _ = await asyncio.wait({getter, reader}, return_when=asyncio.FIRST_COMPLETED)
                if getter not in done:
                    getter.cancel()
                    break
                await ws.send_json(getter.result())
        finally:
            reader.cancel()
    return ws


def create_app(kiosk: Kiosk, sim: SimController | None = None) -> web.Application:
    app = web.Application(middlewares=[_guard], client_max_size=MAX_BODY)
    cfg = kiosk.cfg
    app[KIOSK] = kiosk
    if sim is not None:
        app[SIM] = sim
    app[TASKS] = set()
    app[ORIGINS] = _allowed_origins(cfg.server.host, cfg.server.port)
    call_origin = ""
    if cfg.call.adapter == "webrtc" and cfg.call.url:
        parts = urlsplit(cfg.call.url)
        call_origin = f"{parts.scheme}://{parts.netloc}"
    app[CSP] = _csp(call_origin or "'none'")

    r = app.router
    r.add_get("/", index)
    r.add_get("/api/config", ui_config)
    r.add_post("/api/session", start_session)
    r.add_delete("/api/session/{sid}", end_session)
    r.add_post("/api/session/{sid}/touch", touch)
    r.add_post("/api/session/{sid}/language", set_language)
    r.add_post("/api/session/{sid}/invitation", invitation)
    r.add_get("/api/session/{sid}/hosts", hosts)
    r.add_post("/api/session/{sid}/visitor", visitor)
    r.add_post("/api/session/{sid}/document", document)
    r.add_post("/api/session/{sid}/face", face)
    r.add_get("/api/session/{sid}/camera.mjpg", camera_stream)
    r.add_post("/api/session/{sid}/consent", consent)
    r.add_post("/api/session/{sid}/submit", submit)
    r.add_post("/api/tts", tts)
    r.add_post("/api/call", call)
    r.add_post("/api/sim/{event}", sim_event)
    r.add_get("/api/status", status)
    r.add_get("/healthz", healthz)
    r.add_get("/metrics", metrics)
    r.add_get("/ws", websocket)
    r.add_get("/branding/{name}", branding)
    r.add_static("/", cfg.server.app_dir, follow_symlinks=False)
    return app


def create_metrics_app(kiosk: Kiosk) -> web.Application:
    """Read-only listener for remote scraping (``monitoring.metrics_listen``)."""
    app = web.Application()
    app[KIOSK] = kiosk
    app.router.add_get("/healthz", healthz)
    app.router.add_get("/metrics", metrics)
    return app
