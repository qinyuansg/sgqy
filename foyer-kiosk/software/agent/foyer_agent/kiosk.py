"""Wires devices, sessions, power policy and the offline queue together."""

from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from typing import Any

from .config import Config
from .enrolment import EnrolmentService
from .events import EventBus
from .hal import Devices
from .hal.lightbar import LightState
from .hal.pins import DOOR_OPEN
from .hal.sensors import SensorReadings
from .offline_queue import ItemRejected, OfflineQueue
from .ota import OtaClient
from .power import PowerManager
from .reception import CallAdapter
from .session import EndReason, Session, SessionManager
from .vms.base import VisitSubmission, VmsAdapter, VmsRejected

log = logging.getLogger(__name__)

SUCCESS_LIGHT_S = 6.0


class Kiosk:
    def __init__(
        self,
        cfg: Config,
        devices: Devices,
        vms: VmsAdapter,
        queue: OfflineQueue,
        bus: EventBus,
        ota: OtaClient,
        call: CallAdapter,
    ) -> None:
        self.cfg, self.devices, self.vms, self.queue, self.bus, self.ota, self.call = (
            cfg,
            devices,
            vms,
            queue,
            bus,
            ota,
            call,
        )
        self.started = time.monotonic()
        self.readings: SensorReadings | None = None
        self.vms_reachable: bool | None = None
        self.queue_sent = 0
        self.queue_rejected = 0
        self.queue_expired = 0
        self._last_presence = time.monotonic()
        self._light_reset: asyncio.TimerHandle | None = None
        self.sessions = SessionManager(
            Path(cfg.session.scratch_dir),
            cfg.session.hard_timeout_s,
            cfg.session.max_duration_s,
            on_end=self._on_session_end,
        )
        hw = cfg.hardware
        self.power = PowerManager(
            hw.power,
            devices.gpio,
            devices.sensors,
            devices.display,
            devices.ir,
            devices.lightbar,
            devices.printer,
            bus,
            hw.printer.warmup_s,
            hw.printer.rail_hold_s,
        )
        self.enrolment = EnrolmentService(cfg, devices, self.sessions, vms, queue, self.power, bus)
        devices.presence.on_change(self._on_presence)
        devices.qr.on_scan(lambda code: bus.publish("qr", code=code))
        devices.gpio.on_change(self._on_gpio)

    @property
    def door_open(self) -> bool:
        return bool(self.devices.gpio.get(DOOR_OPEN.name))

    def _resting_light(self) -> LightState:
        if not self.devices.display.powered:
            return LightState.OFF
        return LightState.ATTENTION if self.devices.presence.present else LightState.IDLE

    def _on_presence(self, present: bool) -> None:
        self.bus.publish("presence", present=present)
        if present:
            self._last_presence = time.monotonic()
            self.devices.display.set_power(True)
        if self.sessions.current is None and self._light_reset is None:
            self.devices.lightbar.set_state(self._resting_light())

    def _on_gpio(self, name: str, level: int) -> None:
        if name == DOOR_OPEN.name:
            log.warning("service door %s", "opened" if level else "closed")
            self.bus.publish("door", open=bool(level))

    def _on_session_end(self, session: Session, reason: EndReason) -> None:
        self.enrolment.forget(session.id)
        self.bus.publish("session.ended", reason=reason.value)
        if reason is EndReason.COMPLETED:
            # Keep the success/attention colour briefly, then settle.
            loop = asyncio.get_running_loop()
            if self._light_reset is not None:
                self._light_reset.cancel()
            self._light_reset = loop.call_later(SUCCESS_LIGHT_S, self._settle_light)
        else:
            self.devices.lightbar.set_state(self._resting_light())

    def _settle_light(self) -> None:
        self._light_reset = None
        if self.sessions.current is None:
            self.devices.lightbar.set_state(self._resting_light())

    def activity(self) -> None:
        """UI interaction: keeps the display awake."""
        self._last_presence = time.monotonic()
        self.devices.display.set_power(True)

    async def _submit_queued(self, payload: dict[str, Any]) -> None:
        try:
            await self.vms.submit_visit(VisitSubmission.from_payload(payload))
        except VmsRejected:
            raise ItemRejected() from None

    async def sync_once(self) -> None:
        self.queue_expired += self.queue.purge_expired()
        reachable = await self.vms.ping()
        if reachable != self.vms_reachable:
            log.info("vms %s", "reachable" if reachable else "unreachable")
            self.bus.publish("vms", reachable=reachable)
        self.vms_reachable = reachable
        if reachable and len(self.queue):
            result = await self.queue.drain(self._submit_queued)
            self.queue_sent += result.sent
            self.queue_rejected += result.rejected
            if result.sent or result.rejected:
                log.info("offline queue: %d sent, %d rejected, %d left", result.sent, result.rejected, result.remaining)

    async def _sync_loop(self) -> None:
        while True:
            try:
                await self.sync_once()
            except Exception:
                log.exception("offline queue sync failed")
            await asyncio.sleep(self.cfg.queue.sync_interval_s)

    async def _sensor_loop(self) -> None:
        while True:
            self.readings = await self.devices.sensors.read()
            self.power.update_pd_contract(self.readings.pd_contract_current_a)
            await asyncio.sleep(10)

    async def _display_loop(self) -> None:
        display = self.devices.display
        while True:
            idle_for = time.monotonic() - self._last_presence
            asleep = (
                self.sessions.current is None
                and not self.devices.presence.present
                and idle_for > self.cfg.hardware.display.sleep_after_s
            )
            if asleep and display.powered:
                display.set_power(False)
                self.devices.lightbar.set_state(LightState.OFF)
            await display.apply_brightness()
            await asyncio.sleep(5)

    async def _printer_health_loop(self) -> None:
        while True:
            await self.devices.printer.refresh_health()
            await asyncio.sleep(60)

    async def run(self) -> None:
        await asyncio.gather(
            *self.devices.runners(),
            self.sessions.run_reaper(),
            self._sync_loop(),
            self._sensor_loop(),
            self._display_loop(),
            self._printer_health_loop(),
        )

    async def close(self) -> None:
        self.sessions.shutdown()
        await self.power.close()
        await self.vms.close()
        self.devices.close()
