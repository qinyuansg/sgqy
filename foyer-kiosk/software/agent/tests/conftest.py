from __future__ import annotations

import dataclasses
import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path

import pytest
from aiohttp.test_utils import TestClient, TestServer

from foyer_agent.config import Config
from foyer_agent.events import EventBus
from foyer_agent.hal import Devices, build_sim_devices
from foyer_agent.kiosk import Kiosk
from foyer_agent.offline_queue import OfflineQueue
from foyer_agent.ota import OtaClient
from foyer_agent.reception import build_call
from foyer_agent.server import create_app
from foyer_agent.sim import SimController, ensure_sim_secrets, sim_config
from foyer_agent.vms import build_vms
from foyer_agent.vms.mock_server import STATE, MockState
from foyer_agent.vms.mock_server import create_app as create_mock_app

QUEUE_KEY = bytes(range(32))


class Clock:
    def __init__(self, now: float = 1_000_000.0) -> None:
        self.now = now

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
async def mock_vms() -> AsyncIterator[tuple[TestServer, MockState]]:
    ensure_sim_secrets()
    server = TestServer(create_mock_app(os.environ["FOYER_SIM_VMS_KEY"]))
    await server.start_server()
    yield server, server.app[STATE]
    await server.close()


@dataclass
class Stack:
    kiosk: Kiosk
    client: TestClient
    devices: Devices
    mock: MockState
    queue_dir: Path


@pytest.fixture
async def stack(tmp_path: Path, mock_vms: tuple[TestServer, MockState]) -> AsyncIterator[Stack]:
    server, mock = mock_vms
    cfg = sim_config(Config(), tmp_path, server.port)
    cfg = dataclasses.replace(
        cfg,
        hardware=dataclasses.replace(
            cfg.hardware, printer=dataclasses.replace(cfg.hardware.printer, warmup_s=0.0, rail_hold_s=0.05)
        ),
    )
    bus = EventBus()
    devices = build_sim_devices(cfg.hardware, cfg.branding.accent, Path(cfg.session.scratch_dir))
    devices.id_reader.step_s = 0.0  # type: ignore[attr-defined]
    devices.printer.job_s = 0.0  # type: ignore[attr-defined]
    queue = OfflineQueue(Path(cfg.queue.dir), QUEUE_KEY, cfg.queue.max_age_h * 3600, cfg.queue.max_items)
    kiosk = Kiosk(
        cfg,
        devices,
        build_vms(cfg.vms, cfg.identity),
        queue,
        bus,
        OtaClient(cfg.ota.request_file, cfg.ota.state_file),
        build_call(cfg.call, cfg.device.id, bus),
    )
    client = TestClient(TestServer(create_app(kiosk, SimController(devices, mock))))
    await client.start_server()
    yield Stack(kiosk, client, devices, mock, Path(cfg.queue.dir))
    await client.close()
    await kiosk.close()
