"""End-to-end flows through the HTTP API with simulated devices and the mock VMS."""

import base64
import io
import logging

import pytest
from PIL import Image

from foyer_agent.hal.pins import PRN_PWR_EN
from foyer_agent.vms.mock_server import DEMO_INVITATION_CODE

from .conftest import Stack

PII = ("Eriksson", "ERIKSSON", "Anna", "L898902C3", "Utopia", "1974-08-12")


def signature() -> str:
    image = Image.new("RGBA", (300, 120), (0, 0, 0, 0))
    image.putpixel((10, 10), (0, 0, 0, 255))
    buf = io.BytesIO()
    image.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


async def enrol_until_consent(stack: Stack, mode: str = "invite") -> str:
    c = stack.client
    sid = (await (await c.post("/api/session", json={"language": "en"})).json())["id"]
    if mode == "invite":
        resp = await c.post(f"/api/session/{sid}/invitation", json={"code": DEMO_INVITATION_CODE})
        assert resp.status == 200
        assert (await resp.json())["host"]["name"] == "Jordan Lee"
    else:
        hosts = await (await c.get(f"/api/session/{sid}/hosts", params={"q": "pri"})).json()
        assert hosts[0]["name"] == "Priya Raman"
        resp = await c.post(
            f"/api/session/{sid}/visitor",
            json={
                "firstName": "Anna",
                "lastName": "Eriksson",
                "company": "Utopia",
                "hostId": hosts[0]["id"],
                "purpose": "meeting",
            },
        )
        assert resp.status == 204
    doc = await (await c.post(f"/api/session/{sid}/document")).json()
    assert doc == {
        "firstName": "Anna Maria",
        "lastName": "Eriksson",
        "documentType": "passport",
        "issuingState": "UTO",
        "chipVerified": True,
    }
    face = await (await c.post(f"/api/session/{sid}/face")).json()
    assert face["passed"] and face["preview"].startswith("data:image/jpeg;base64,")
    resp = await c.post(
        f"/api/session/{sid}/consent",
        json={
            "privacyAccepted": True,
            "rulesAccepted": True,
            "privacyVersion": "2026-01",
            "rulesVersion": "2026-01",
            "signature": signature(),
        },
    )
    assert resp.status == 204
    return sid


@pytest.mark.parametrize("mode", ["invite", "walkup"])
async def test_happy_path_prints_wipes_and_logs_no_pii(
    stack: Stack, mode: str, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    sid = await enrol_until_consent(stack, mode)
    session = stack.kiosk.sessions.current
    assert session is not None
    portrait, signature_buf = session.portrait, session.consent.signature_png  # type: ignore[union-attr]

    result = await (await stack.client.post(f"/api/session/{sid}/submit")).json()

    assert result["status"] == "approved" and result["printed"] is True
    assert result["hostName"] == ("Jordan Lee" if mode == "invite" else "Priya Raman")
    assert result["passQrSvg"].startswith("<svg")
    assert stack.kiosk.sessions.current is None and session.wiped
    assert portrait is not None and portrait.wiped and signature_buf.wiped
    assert stack.devices.gpio.get(PRN_PWR_EN.name) == 1
    assert len(stack.mock.visits) == 1 and len(stack.kiosk.queue) == 0
    assert (await stack.client.post(f"/api/session/{sid}/touch")).status == 404
    for leaked in PII:
        assert leaked not in caplog.text


async def test_offline_submission_is_queued_encrypted_then_synced(stack: Stack) -> None:
    sid = await enrol_until_consent(stack)
    stack.mock.fail_mode = "503"
    result = await (await stack.client.post(f"/api/session/{sid}/submit")).json()
    assert result["status"] == "queued" and result["badgeNumber"].startswith("P-")
    assert result["printed"] is True and result["passQrSvg"] is None
    assert stack.kiosk.sessions.current is None
    files = list(stack.queue_dir.glob("*.fq"))
    assert len(files) == 1
    assert not any(p.encode() in files[0].read_bytes() for p in PII)

    await stack.kiosk.sync_once()
    assert stack.kiosk.vms_reachable is False and len(stack.kiosk.queue) == 1
    stack.mock.fail_mode = "none"
    await stack.kiosk.sync_once()
    assert len(stack.kiosk.queue) == 0 and stack.kiosk.queue_sent == 1 and len(stack.mock.visits) == 1
    assert list(stack.queue_dir.iterdir()) == []


async def test_liveness_failure_limits_attempts(stack: Stack) -> None:
    c = stack.client
    sid = (await (await c.post("/api/session", json={})).json())["id"]
    await c.post("/api/sim/liveness", json={"score": 0.2})
    first = await (await c.post(f"/api/session/{sid}/face")).json()
    assert first == {"passed": False, "attemptsLeft": 2}
    await c.post(f"/api/session/{sid}/face")
    await c.post(f"/api/session/{sid}/face")
    resp = await c.post(f"/api/session/{sid}/face")
    assert resp.status == 429 and (await resp.json())["error"] == "face_attempts_exhausted"
    assert stack.kiosk.sessions.current is not None and stack.kiosk.sessions.current.portrait is None


async def test_submit_requires_every_step(stack: Stack) -> None:
    c = stack.client
    sid = (await (await c.post("/api/session", json={})).json())["id"]
    await c.post(f"/api/session/{sid}/invitation", json={"code": DEMO_INVITATION_CODE})
    resp = await c.post(f"/api/session/{sid}/submit")
    assert resp.status == 422 and (await resp.json())["error"] == "document_missing"
    resp = await c.post(
        f"/api/session/{sid}/visitor",
        json={"firstName": "A", "lastName": "B", "hostId": "h-1001", "purpose": "meeting"},
    )
    assert (await resp.json())["error"] == "invalid_host"  # hosts must come from a search in this session
    resp = await c.post(f"/api/session/{sid}/invitation", json={"code": "INV-UNKNOWN"})
    assert resp.status == 404


async def test_cancel_wipes_and_expired_document_rejected(stack: Stack) -> None:
    c = stack.client
    sid = (await (await c.post("/api/session", json={})).json())["id"]
    await c.post("/api/sim/id-reader", json={"fail": "unreadable"})
    resp = await c.post(f"/api/session/{sid}/document")
    assert resp.status == 422 and (await resp.json())["error"] == "document_unreadable"
    assert (await c.delete(f"/api/session/{sid}")).status == 204
    assert stack.kiosk.sessions.current is None


async def test_cross_origin_requests_blocked(stack: Stack) -> None:
    resp = await stack.client.post("/api/session", json={}, headers={"Origin": "https://evil.example"})
    assert resp.status == 403
    resp = await stack.client.post("/api/session", json={}, headers={"Origin": "http://127.0.0.1:8080"})
    assert resp.status == 201
    assert "default-src 'self'" in resp.headers["Content-Security-Policy"]


async def test_events_health_and_metrics(stack: Stack) -> None:
    c = stack.client
    ws = await c.ws_connect("/ws")
    hello = await ws.receive_json()
    assert hello["type"] == "hello" and hello["power"]["full"] is True
    await c.post("/api/sim/presence", json={"present": True})
    assert (await ws.receive_json()) == {"type": "presence", "present": True}
    await c.post("/api/sim/qr", json={"code": "INV-7KQ2M9"})
    assert (await ws.receive_json()) == {"type": "qr", "code": "INV-7KQ2M9"}
    await c.post("/api/sim/door", json={"open": True})
    assert (await ws.receive_json()) == {"type": "door", "open": True}
    await c.post("/api/sim/power", json={"source": "limited"})
    power = await ws.receive_json()
    assert power["type"] == "power" and power["full"] is False
    await ws.close()

    health = await (await c.get("/healthz")).json()
    assert health["status"] == "degraded" and "door_open" in health["problems"]
    metrics = await (await c.get("/metrics")).text()
    assert 'foyer_peripheral_up{peripheral="printer"} 1' in metrics
    assert "foyer_door_open 1" in metrics and 'foyer_power_budget_full{source="limited"} 0' in metrics
    assert "foyer_offline_queue_depth 0" in metrics
