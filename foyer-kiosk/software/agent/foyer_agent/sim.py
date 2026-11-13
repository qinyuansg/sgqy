"""Simulation mode: simulated devices, an in-process mock VMS and event injection.

``python -m foyer_agent --sim`` runs the full stack on a desktop. The UI's
simulator panel (``/?simpanel=1``) and the Playwright suite drive devices via
``POST /api/sim/<event>``, which only exists in simulation mode.
"""

from __future__ import annotations

import dataclasses
import os
import secrets
import socket
from pathlib import Path
from typing import Any

from aiohttp import web

from .config import Config
from .hal import Devices
from .hal.gpio import SimGpioController
from .hal.id_reader import StubIdReader
from .hal.liveness import StubLiveness
from .hal.pins import DOOR_OPEN, PD_ALERT_N, POE_HIPWR_N, USBC_ATTACH
from .hal.qr_scanner import SimScanner
from .hal.sensors import SimSensorHub
from .hal.tof import SimPresenceSensor
from .vms.mock_server import STATE, MockState, create_app


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def ensure_sim_secrets() -> None:
    """Ephemeral credentials for the mock VMS and the simulated offline queue."""
    os.environ.setdefault("FOYER_SIM_VMS_KEY", secrets.token_urlsafe(16))
    os.environ.setdefault("FOYER_SIM_QUEUE_KEY", secrets.token_hex(32))


def sim_config(cfg: Config, workdir: Path, vms_port: int) -> Config:
    """Point every stateful path into *workdir* and every device at its simulator."""
    hw = dataclasses.replace(cfg.hardware, sim=True, tts=dataclasses.replace(cfg.hardware.tts, engine="browser"))
    return dataclasses.replace(
        cfg,
        hardware=hw,
        vms=dataclasses.replace(
            cfg.vms, adapter="rest", base_url=f"http://127.0.0.1:{vms_port}", api_key="env:FOYER_SIM_VMS_KEY"
        ),
        queue=dataclasses.replace(
            cfg.queue, dir=str(workdir / "queue"), key="env:FOYER_SIM_QUEUE_KEY", sync_interval_s=5
        ),
        session=dataclasses.replace(cfg.session, scratch_dir=str(workdir / "session")),
        monitoring=dataclasses.replace(cfg.monitoring, heartbeat_url=""),
        ota=dataclasses.replace(
            cfg.ota, request_file=str(workdir / "ota" / "request"), state_file=str(workdir / "ota" / "state.json")
        ),
    )


async def start_mock_vms() -> tuple[web.AppRunner, int, MockState]:
    app = create_app(os.environ["FOYER_SIM_VMS_KEY"])
    runner = web.AppRunner(app, access_log=None)
    await runner.setup()
    port = _free_port()
    await web.TCPSite(runner, "127.0.0.1", port).start()
    return runner, port, app[STATE]


class SimController:
    def __init__(self, devices: Devices, mock: MockState) -> None:
        self._dev = devices
        self._mock = mock

    def handle(self, event: str, body: dict[str, Any]) -> dict[str, Any]:
        dev = self._dev
        assert isinstance(dev.gpio, SimGpioController)
        if event == "presence":
            assert isinstance(dev.presence, SimPresenceSensor)
            dev.presence.inject(bool(body.get("present", True)))
        elif event == "qr":
            assert isinstance(dev.qr, SimScanner)
            dev.qr.inject(str(body.get("code", "")))
        elif event == "door":
            dev.gpio.inject(DOOR_OPEN.name, int(bool(body.get("open"))))
        elif event == "power":
            source = body.get("source", "poe")  # poe | usbc | limited
            assert isinstance(dev.sensors, SimSensorHub)
            dev.sensors.pd_contract_current_a = 3.0 if source == "usbc" else None
            dev.gpio.inject(USBC_ATTACH.name, 0 if source == "usbc" else 1)
            dev.gpio.inject(POE_HIPWR_N.name, 0 if source == "poe" else 1)
            dev.gpio.inject(PD_ALERT_N.name, 0)  # STUSB4500 signals the new contract
            dev.gpio.inject(PD_ALERT_N.name, 1)
        elif event == "vms":
            self._mock.fail_mode = "none" if body.get("online", True) else "503"
        elif event == "liveness":
            assert isinstance(dev.liveness, StubLiveness)
            dev.liveness.score = float(body.get("score", 0.97))
        elif event == "id-reader":
            assert isinstance(dev.id_reader, StubIdReader)
            dev.id_reader.fail_next = body.get("fail")
        else:
            raise web.HTTPNotFound()
        return {"ok": True}
