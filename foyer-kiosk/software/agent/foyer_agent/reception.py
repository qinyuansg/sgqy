"""'Call reception' adapters, reachable from every screen.

* ``stub``   - simulated ringing/connected states (demo, tests).
* ``webrtc`` - the UI opens the configured URL (a SIP-over-WebRTC gateway or
  video-desk page) in a call overlay; audio uses the I2S mics and speaker via
  the browser. ``{device}`` in the URL is replaced with the device id.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from typing import Any
from urllib.parse import quote

from .config import CallConfig
from .events import EventBus
from .vms.rest import require_tls


class CallAdapter(ABC):
    @abstractmethod
    async def start(self) -> dict[str, Any]: ...

    @abstractmethod
    async def end(self) -> None: ...


class StubCall(CallAdapter):
    def __init__(self, bus: EventBus, answer_after_s: float = 3.0) -> None:
        self._bus = bus
        self._answer_after = answer_after_s
        self._task: asyncio.Task[None] | None = None

    async def _answer(self) -> None:
        await asyncio.sleep(self._answer_after)
        self._bus.publish("call", state="connected")

    async def start(self) -> dict[str, Any]:
        await self.end()
        self._task = asyncio.get_running_loop().create_task(self._answer())
        return {"state": "ringing"}

    async def end(self) -> None:
        if self._task is not None:
            self._task.cancel()
            self._task = None
            self._bus.publish("call", state="ended")


class WebRtcCall(CallAdapter):
    def __init__(self, url_template: str, device_id: str) -> None:
        require_tls(url_template.replace("{device}", "x"), "call.url")
        self._url = url_template.replace("{device}", quote(device_id, safe=""))

    async def start(self) -> dict[str, Any]:
        return {"state": "embedded", "url": self._url}

    async def end(self) -> None:
        return None


def build_call(cfg: CallConfig, device_id: str, bus: EventBus) -> CallAdapter:
    if cfg.adapter == "webrtc":
        return WebRtcCall(cfg.url, device_id)
    if cfg.adapter == "stub":
        return StubCall(bus)
    raise ValueError(f"unknown call.adapter {cfg.adapter!r}")
