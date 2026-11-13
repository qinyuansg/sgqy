"""In-memory mock VMS implementing the default REST contract (demo and tests).

Run standalone::

    python -m foyer_agent.vms.mock_server --port 8099 --api-key demo-key
"""

from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import itertools
import secrets
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from aiohttp import web

HOSTS: tuple[dict[str, str], ...] = (
    {"id": "h-1001", "name": "Jordan Lee", "department": "Product Design"},
    {"id": "h-1002", "name": "Priya Raman", "department": "Engineering"},
    {"id": "h-1003", "name": "Marcus Chen", "department": "Finance"},
    {"id": "h-1004", "name": "Sofia Alvarez", "department": "People & Culture"},
    {"id": "h-1005", "name": "Daniel Okafor", "department": "Legal"},
    {"id": "h-1006", "name": "Hannah Becker", "department": "Sales"},
    {"id": "h-1007", "name": "Tomás Novak", "department": "Workplace"},
    {"id": "h-1008", "name": "Aiko Tanaka", "department": "Research"},
    {"id": "h-1009", "name": "Lena Fischer", "department": "Marketing"},
    {"id": "h-1010", "name": "Omar Haddad", "department": "Engineering"},
    {"id": "h-1011", "name": "Grace Kim", "department": "Executive Office"},
    {"id": "h-1012", "name": "Julian Weber", "department": "IT Services"},
)

DEMO_INVITATION_CODE = "INV-7KQ2M9"


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text.casefold()) if not unicodedata.combining(c))


@dataclass
class MockState:
    api_key: str
    fail_mode: str = "none"  # none | 503 | timeout
    visits: dict[str, dict[str, Any]] = field(default_factory=dict)
    invitations: dict[str, dict[str, Any]] = field(default_factory=dict)
    counter: itertools.count = field(default_factory=lambda: itertools.count(4021))

    def __post_init__(self) -> None:
        start = dt.datetime.now().replace(hour=10, minute=30, second=0, microsecond=0)
        self.invitations[DEMO_INVITATION_CODE] = {
            "code": DEMO_INVITATION_CODE,
            "visitor": {"firstName": "Anna Maria", "lastName": "Eriksson", "company": "Utopia Consulting"},
            "host": HOSTS[0],
            "purpose": "meeting",
            "startsAt": start.isoformat(timespec="minutes"),
        }


STATE = web.AppKey("state", MockState)


@web.middleware
async def _guard(request: web.Request, handler: Any) -> web.StreamResponse:
    state = request.app[STATE]
    if not request.path.startswith("/__admin"):
        if request.headers.get("Authorization") != f"Bearer {state.api_key}":
            return web.json_response({"error": "unauthorized"}, status=401)
        if state.fail_mode == "503":
            return web.json_response({"error": "maintenance"}, status=503)
        if state.fail_mode == "timeout":
            await asyncio.sleep(3600)
    return await handler(request)


async def health(_: web.Request) -> web.Response:
    return web.json_response({"ok": True})


async def hosts(request: web.Request) -> web.Response:
    query = _fold(request.query.get("q", "").strip())
    limit = min(int(request.query.get("limit", "8")), 50)
    items = [h for h in HOSTS if query and (query in _fold(h["name"]) or query in _fold(h["department"]))]
    return web.json_response({"items": items[:limit]})


async def invitation(request: web.Request) -> web.Response:
    found = request.app[STATE].invitations.get(request.match_info["code"].upper())
    if found is None:
        return web.json_response({"error": "not found"}, status=404)
    return web.json_response(found)


async def create_visit(request: web.Request) -> web.Response:
    state = request.app[STATE]
    body = await request.json()
    visitor = body.get("visitor") or {}
    host = next((h for h in HOSTS if h["id"] == body.get("hostId")), None)
    consent = body.get("consent") or {}
    if host is None or not visitor.get("lastName") or not consent.get("acceptedAt"):
        return web.json_response({"error": "invalid visit"}, status=422)
    status = "approved"
    code = body.get("invitationCode")
    if code:
        invite = state.invitations.get(code)
        if invite is None or _fold(invite["visitor"]["lastName"]) != _fold(visitor["lastName"]):
            status = "pending"
    elif body.get("document") is None:
        status = "pending"
    visit_id = f"V-{secrets.token_hex(4).upper()}"
    badge = f"{next(state.counter):05d}"
    valid_until = dt.datetime.now().replace(hour=19, minute=0, second=0, microsecond=0)
    state.visits[visit_id] = {"status": status, "hostId": host["id"], "hasPortrait": bool(body.get("portraitJpeg"))}
    return web.json_response(
        {
            "id": visit_id,
            "status": status,
            "host": {"id": host["id"], "name": host["name"]},
            "badge": {"number": badge},
            "mobilePass": {"url": f"https://pass.example.com/v/{visit_id}"},
            "validUntil": valid_until.isoformat(timespec="minutes"),
        },
        status=201,
    )


async def admin_mode(request: web.Request) -> web.Response:
    request.app[STATE].fail_mode = (await request.json()).get("fail", "none")
    return web.json_response({"fail": request.app[STATE].fail_mode})


async def admin_visits(request: web.Request) -> web.Response:
    return web.json_response(request.app[STATE].visits)


def create_app(api_key: str) -> web.Application:
    app = web.Application(middlewares=[_guard])
    app[STATE] = MockState(api_key=api_key)
    app.router.add_get("/health", health)
    app.router.add_get("/hosts", hosts)
    app.router.add_get("/invitations/{code}", invitation)
    app.router.add_post("/visits", create_visit)
    app.router.add_post("/__admin/mode", admin_mode)
    app.router.add_get("/__admin/visits", admin_visits)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Foyer mock VMS")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8099)
    parser.add_argument("--api-key", required=True)
    args = parser.parse_args()
    web.run_app(create_app(args.api_key), host=args.host, port=args.port, access_log=None)


if __name__ == "__main__":
    main()
