import base64
import hashlib
import hmac
import json
import os
from typing import Any

import pytest
from aiohttp import web
from aiohttp.test_utils import TestServer

from foyer_agent.config import IdentityConfig, VmsConfig, WebhookConfig
from foyer_agent.vms.base import DocumentSummary, VisitSubmission, VmsRejected, VmsUnavailable
from foyer_agent.vms.mock_server import DEMO_INVITATION_CODE, MockState
from foyer_agent.vms.rest import RestVmsAdapter, get_path, require_tls, sign_webhook


def adapter_for(server: TestServer, **overrides: Any) -> RestVmsAdapter:
    cfg = VmsConfig(**{"base_url": f"http://127.0.0.1:{server.port}", "api_key": "env:FOYER_SIM_VMS_KEY", **overrides})
    return RestVmsAdapter(cfg, IdentityConfig())


def visit(**overrides: Any) -> VisitSubmission:
    data: dict[str, Any] = dict(
        session_id="s1",
        device_id="vk1",
        created_at="2026-11-13T09:00:00+00:00",
        language="en",
        mode="invite",
        invitation_code=DEMO_INVITATION_CODE,
        first_name="Anna Maria",
        last_name="Eriksson",
        company="Utopia",
        host_id="h-1001",
        purpose="meeting",
        document=DocumentSummary("P", "UTO", "L898902C3", "UTO", "1974-08-12", "2034-12-31", True, True),
        portrait_jpeg=b"\xff\xd8jpeg",
        liveness_score=0.97,
        privacy_version="2026-01",
        rules_version="2026-01",
        consent_at="2026-11-13T09:00:00+00:00",
        signature_png=b"\x89PNG",
    )
    data.update(overrides)
    return VisitSubmission(**data)


async def test_invitation_lookup(mock_vms: tuple[TestServer, MockState]) -> None:
    adapter = adapter_for(mock_vms[0])
    invitation = await adapter.lookup_invitation(DEMO_INVITATION_CODE)
    assert invitation is not None
    assert invitation.visitor_last_name == "Eriksson" and invitation.host.name == "Jordan Lee"
    assert await adapter.lookup_invitation("INV-NOPE") is None
    await adapter.close()


async def test_host_search_folds_accents(mock_vms: tuple[TestServer, MockState]) -> None:
    adapter = adapter_for(mock_vms[0])
    assert [h.name for h in await adapter.search_hosts("tomas")] == ["Tomás Novak"]
    assert {h.name for h in await adapter.search_hosts("engineering")} == {"Priya Raman", "Omar Haddad"}
    await adapter.close()


async def test_submit_visit_and_payload_roundtrip(mock_vms: tuple[TestServer, MockState]) -> None:
    server, state = mock_vms
    adapter = adapter_for(server)
    result = await adapter.submit_visit(visit())
    assert result.status == "approved" and result.host_name == "Jordan Lee"
    assert result.badge_number and result.pass_url and result.pass_url.startswith("https://")
    assert state.visits[result.visit_id]["hasPortrait"] is True
    mismatch = await adapter.submit_visit(visit(last_name="Someone"))
    assert mismatch.status == "pending"
    original = visit()
    assert VisitSubmission.from_payload(json.loads(json.dumps(original.to_payload()))) == original
    assert "Eriksson" not in repr(original)
    await adapter.close()


async def test_errors_are_classified(mock_vms: tuple[TestServer, MockState]) -> None:
    server, state = mock_vms
    adapter = adapter_for(server)
    state.fail_mode = "503"
    with pytest.raises(VmsUnavailable):
        await adapter.submit_visit(visit())
    assert await adapter.ping() is False
    state.fail_mode = "none"
    with pytest.raises(VmsRejected):
        await adapter.submit_visit(visit(host_id="h-unknown"))
    await adapter.close()

    os.environ["FOYER_TEST_BAD_KEY"] = "wrong"
    bad = RestVmsAdapter(
        VmsConfig(base_url=f"http://127.0.0.1:{server.port}", api_key="env:FOYER_TEST_BAD_KEY"), IdentityConfig()
    )
    with pytest.raises(VmsRejected):
        await bad.search_hosts("jordan")
    await bad.close()


async def test_unreachable_is_unavailable() -> None:
    adapter = RestVmsAdapter(VmsConfig(base_url="http://127.0.0.1:9", api_key="", timeout_s=2), IdentityConfig())
    with pytest.raises(VmsUnavailable):
        await adapter.search_hosts("anyone")
    await adapter.close()


async def test_custom_mapping_and_signed_webhook() -> None:
    received: list[tuple[bytes, str]] = []

    async def people(request: web.Request) -> web.Response:
        assert request.query["search"] == "lee" and request.headers["X-Api-Key"] == "k-123"
        return web.json_response({"value": [{"personId": 7, "displayName": "Jordan Lee", "org": {"unit": "Design"}}]})

    async def visits(request: web.Request) -> web.Response:
        body = await request.json()
        assert body["visitor"]["lastName"] == "Eriksson"
        return web.json_response({"visitId": "X1", "state": "approved", "badge": "B7"})

    async def hook(request: web.Request) -> web.Response:
        received.append((await request.read(), request.headers["X-Foyer-Signature"]))
        return web.Response(status=204)

    app = web.Application()
    app.router.add_get("/people", people)
    app.router.add_post("/v2/visits", visits)
    app.router.add_post("/hook", hook)
    server = TestServer(app)
    await server.start_server()
    os.environ["FOYER_TEST_KEY"], os.environ["FOYER_TEST_HOOK"] = "k-123", "hook-secret"
    adapter = adapter_for(
        server,
        api_key="env:FOYER_TEST_KEY",
        auth_header="X-Api-Key",
        auth_scheme="",
        endpoints={
            "hosts": {"path": "/people", "query": {"search": "{query}"}},
            "visit": {"method": "POST", "path": "/v2/visits"},
        },
        response_map={
            "hosts_list": "value",
            "host": {"id": "personId", "name": "displayName", "department": "org.unit"},
            "visit": {
                "visit_id": "visitId",
                "status": "state",
                "badge_number": "badge",
                "host_name": "x",
                "pass_url": "y",
                "valid_until": "z",
            },
        },
        webhook=WebhookConfig(url=f"http://127.0.0.1:{server.port}/hook", secret="env:FOYER_TEST_HOOK"),
    )
    hosts = await adapter.search_hosts("lee")
    assert hosts[0].id == "7" and hosts[0].department == "Design"
    result = await adapter.submit_visit(visit())
    assert (result.visit_id, result.status, result.badge_number) == ("X1", "approved", "B7")
    body, signature = received[0]
    assert signature == "sha256=" + hmac.new(b"hook-secret", body, hashlib.sha256).hexdigest()
    assert b"Eriksson" not in body and b"portrait" not in body  # webhook carries no personal data
    await adapter.close()
    await server.close()


def test_tls_required_except_localhost() -> None:
    require_tls("https://vms.example.com", "x")
    require_tls("http://127.0.0.1:8099", "x")
    with pytest.raises(ValueError):
        require_tls("http://vms.example.com", "x")


def test_helpers() -> None:
    assert get_path({"a": {"b": [{"c": 1}]}}, "a.b.0.c") == 1
    assert get_path({"a": 1}, "a.b") is None
    assert sign_webhook(b"k", b"x").startswith("sha256=")
    assert base64.b64decode(visit().to_payload()["portraitJpeg"]) == b"\xff\xd8jpeg"
