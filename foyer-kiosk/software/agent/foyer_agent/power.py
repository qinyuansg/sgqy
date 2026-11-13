"""Power policy from the interface contract (rev B).

High power is available when ``POE_HIPWR_n`` is low (PoE Type 3/4, >= 51 W)
or a USB-C source is attached (``USBC_ATTACH`` low) with a negotiated
STUSB4500 contract of at least 60 W. Otherwise the budget is reduced:
slow printing, display <= 70 %, IR flood <= 50 % duty, LED bar <= 30 %.

The 24 V printer rail (``PRN_PWR_EN``) is on only while a badge job is
queued, plus a 30 s hold, keeping idle power below 12 W. INA238 alerts
(``PWR_ALERT_n``) are counted and published for remote monitoring.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Coroutine
from dataclasses import asdict, dataclass
from typing import Any

from .config import PowerConfig
from .events import EventBus
from .hal.display import Display
from .hal.gpio import GpioController
from .hal.lightbar import LightBar
from .hal.pins import PD_ALERT_N, POE_HIPWR_N, PRN_PWR_EN, PWR_ALERT_N, USBC_ATTACH
from .hal.printer import BadgePrinter
from .hal.pwm import IrIlluminator
from .hal.sensors import SensorHub

log = logging.getLogger(__name__)

REDUCED_DISPLAY_MAX = 70
REDUCED_IR_MAX = 0.5
REDUCED_LIGHTBAR_MAX = 0.3


@dataclass(frozen=True)
class PowerBudget:
    full: bool
    source: str  # poe | usbc | limited
    display_max_brightness: int
    ir_max_duty: float
    lightbar_max: float
    printer_slow: bool


def budget_for(poe_hipwr_n: int, usbc_attach: int, pd_contract_w: float | None, cfg: PowerConfig) -> PowerBudget:
    if poe_hipwr_n == 0:
        source = "poe"
    elif usbc_attach == 0 and pd_contract_w is not None and pd_contract_w >= cfg.usbc_high_power_w:
        source = "usbc"
    else:
        source = "limited"
    full = source != "limited"
    return PowerBudget(
        full=full,
        source=source,
        display_max_brightness=100 if full else REDUCED_DISPLAY_MAX,
        ir_max_duty=1.0 if full else REDUCED_IR_MAX,
        lightbar_max=1.0 if full else REDUCED_LIGHTBAR_MAX,
        printer_slow=not full,
    )


class PowerManager:
    def __init__(
        self,
        cfg: PowerConfig,
        gpio: GpioController,
        sensors: SensorHub,
        display: Display,
        ir: IrIlluminator,
        lightbar: LightBar,
        printer: BadgePrinter,
        bus: EventBus,
        warmup_s: float,
        hold_s: float,
        poll_s: float = 1.0,
    ) -> None:
        self._cfg = cfg
        self._gpio, self._sensors, self._bus = gpio, sensors, bus
        self._display, self._ir, self._lightbar, self._printer = display, ir, lightbar, printer
        self._warmup_s, self._hold_s, self._poll_s = warmup_s, hold_s, poll_s
        self._print_lock = asyncio.Lock()
        self._rail_off: asyncio.Task[None] | None = None
        self._tasks: set[asyncio.Task[Any]] = set()
        self.pd_contract_w: float | None = None
        self.power_alerts = 0
        self.budget = self._evaluate()
        gpio.on_change(self._on_gpio)
        self._apply()

    @property
    def printer_rail_on(self) -> bool:
        return bool(self._gpio.get(PRN_PWR_EN.name))

    def _evaluate(self) -> PowerBudget:
        return budget_for(
            self._gpio.get(POE_HIPWR_N.name), self._gpio.get(USBC_ATTACH.name), self.pd_contract_w, self._cfg
        )

    def update_pd_contract(self, current_a: float | None) -> None:
        """Feed the STUSB4500 RDO operating current (from the sensor poll or a PD alert)."""
        self.pd_contract_w = None if current_a is None else current_a * self._cfg.usbc_contract_volts
        self._reevaluate()

    def _reevaluate(self) -> None:
        budget = self._evaluate()
        if budget != self.budget:
            self.budget = budget
            log.info("power budget: %s (%s)", "full" if budget.full else "reduced", budget.source)
            self._apply()
            self._bus.publish("power", **asdict(budget))

    def _on_gpio(self, name: str, level: int) -> None:
        if name in (POE_HIPWR_N.name, USBC_ATTACH.name):
            self._reevaluate()
        elif name == PD_ALERT_N.name:
            self._spawn(self._refresh_contract())
        elif name == PWR_ALERT_N.name and level == 0:
            self.power_alerts += 1
            self._spawn(self._report_power_alert())

    async def _refresh_contract(self) -> None:
        self.update_pd_contract((await self._sensors.read()).pd_contract_current_a)

    async def _report_power_alert(self) -> None:
        flags = await self._sensors.power_alert_flags()
        log.warning("INA238 power alert (flags=%s)", f"0x{flags:04x}" if flags is not None else "n/a")
        self._bus.publish("power.alert", flags=flags)

    def _apply(self) -> None:
        self._display.max_brightness = self.budget.display_max_brightness
        self._ir.max_duty = self.budget.ir_max_duty
        self._ir.set_duty(self._ir.duty)  # re-clamp a running flood
        self._lightbar.power_cap = self.budget.lightbar_max
        self._spawn(self._display.apply_brightness())

    def _spawn(self, coro: Coroutine[Any, Any, Any]) -> None:
        task = asyncio.get_running_loop().create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def print_badge(self, pdf: bytes) -> None:
        async with self._print_lock:
            if self._rail_off is not None:
                self._rail_off.cancel()
                self._rail_off = None
            if not self.printer_rail_on:
                self._gpio.set(PRN_PWR_EN.name, 1)
                await asyncio.sleep(self._warmup_s)  # printer boots and enumerates on hub U13 P3
            try:
                await self._printer.submit(pdf, slow=self.budget.printer_slow)
            finally:
                self._rail_off = asyncio.get_running_loop().create_task(self._rail_off_when_idle())

    async def _rail_off_when_idle(self) -> None:
        while await self._printer.pending_jobs() > 0:
            await asyncio.sleep(self._poll_s)
        await asyncio.sleep(self._hold_s)
        self._gpio.set(PRN_PWR_EN.name, 0)

    async def close(self) -> None:
        if self._rail_off is not None:
            self._rail_off.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._rail_off
        self._gpio.set(PRN_PWR_EN.name, 0)
