"""Display power (``DISP_PWR_EN`` 12 V rail) and backlight brightness.

Brightness is set over DDC/CI with ``ddcutil`` (VCP 0x10) when the panel's
controller supports it; the power policy caps the maximum.
"""

from __future__ import annotations

import asyncio
import logging

from .gpio import GpioController
from .pins import DISP_PWR_EN

log = logging.getLogger(__name__)


class Display:
    def __init__(self, gpio: GpioController, brightness: int, use_ddc: bool) -> None:
        self._gpio = gpio
        self._use_ddc = use_ddc
        self.requested_brightness = brightness
        self.max_brightness = 100
        self.applied_brightness: int | None = None

    @property
    def powered(self) -> bool:
        return bool(self._gpio.get(DISP_PWR_EN.name))

    def set_power(self, on: bool) -> None:
        if on != self.powered:
            log.info("display %s", "on" if on else "off")
            self._gpio.set(DISP_PWR_EN.name, int(on))
            self.applied_brightness = None  # panel forgets its DDC state when unpowered

    async def apply_brightness(self) -> None:
        target = min(self.requested_brightness, self.max_brightness)
        if target == self.applied_brightness or not self.powered:
            return
        if self._use_ddc:
            try:
                proc = await asyncio.create_subprocess_exec(
                    "ddcutil",
                    "--noverify",
                    "setvcp",
                    "10",
                    str(target),
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                if await proc.wait() != 0:
                    return
            except OSError:
                return
        self.applied_brightness = target
