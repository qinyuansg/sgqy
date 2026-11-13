"""Approach detection with the VL53L1X ToF sensor (I2C1 @0x29, sensor bar).

The sensor ranges continuously in long-distance mode with a narrowed region
of interest (ROI) aimed at the approach zone in front of the kiosk, raising
``TOF_INT_n`` (GPIO17, configured active low) when a new sample is ready.
:class:`PresenceDetector` turns the distance stream into presence with
hysteresis. ``TOF_XSHUT`` (GPIO27) is pulsed to recover a wedged sensor.

The register-level initialisation is a port of Adafruit's MIT-licensed
CircuitPython VL53L1X driver (itself derived from ST's VL53L1X ULD):
Copyright (c) 2017 Scott Shawcroft, (c) 2021 Carter Nelson for Adafruit Industries.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from abc import ABC, abstractmethod
from collections.abc import Callable

from .gpio import GpioController
from .i2c import I2cDevice
from .pins import TOF_INT_N, TOF_XSHUT

log = logging.getLogger(__name__)

VL53L1X_ADDR = 0x29

# Default configuration for registers 0x2D..0x87 (ST ULD), with 0x30 = 0x11
# selecting an active-low GPIO1 interrupt to match the TOF_INT_n net.
_DEFAULT_CONFIG = bytes.fromhex(
    "0000001102000208000810010100000000ff000f0000000000200b00"
    "00020a2100000500000000c8000038ff010008000001cc0f01f10d01"
    "68008008b8000000000f8900000000000000010f0d0e0e000002c7ff"
    "9b000000010000"
)
_LONG_MODE = (  # register, value
    (0x004B, b"\x0a"),
    (0x0060, b"\x0f"),
    (0x0063, b"\x0d"),
    (0x0069, b"\xb8"),
    (0x0078, b"\x0f\x0d"),
    (0x007A, b"\x0e\x0e"),
)
# Long-mode timing budgets: ms -> (RANGE_CONFIG__TIMEOUT_MACROP_A_HI, _B_HI)
_TIMING_LONG = {
    20: (b"\x00\x1e", b"\x00\x22"),
    33: (b"\x00\x60", b"\x00\x6e"),
    50: (b"\x00\xad", b"\x00\xc6"),
    100: (b"\x01\xcc", b"\x01\xea"),
    200: (b"\x02\xd9", b"\x02\xf8"),
    500: (b"\x04\x8f", b"\x04\xa4"),
}
_REG_MODEL_ID = 0x010F
_REG_GPIO_TIO_HV_STATUS = 0x0031
_REG_INTERMEASUREMENT = 0x006C
_REG_OSC_CALIBRATE = 0x00DE
_REG_ROI_CENTRE = 0x007F
_REG_ROI_XY = 0x0080
_REG_INTERRUPT_CLEAR = 0x0086
_REG_MODE_START = 0x0087
_REG_RANGE_STATUS = 0x0089
_REG_RANGE_MM = 0x0096


class Vl53l1x:
    """Blocking driver; call from a worker thread."""

    def __init__(self, device: I2cDevice) -> None:
        self._dev = device

    def _ready(self) -> bool:
        return self._dev.read(_REG_GPIO_TIO_HV_STATUS, 1)[0] & 0x01 == 0  # active-low polarity

    def configure(self, roi: tuple[int, int], roi_centre: int, timing_budget_ms: int, period_ms: int) -> None:
        if self._dev.read(_REG_MODEL_ID, 3) != b"\xea\xcc\x10":
            raise OSError("not a VL53L1X")
        if timing_budget_ms not in _TIMING_LONG or period_ms < timing_budget_ms:
            raise ValueError("invalid timing budget / inter-measurement period")
        self._dev.write(0x002D, _DEFAULT_CONFIG)
        self._dev.write(_REG_MODE_START, b"\x40")
        deadline = time.monotonic() + 1.0
        while not self._ready():
            if time.monotonic() > deadline:
                raise OSError("VL53L1X did not complete its first measurement")
            time.sleep(0.01)
        self._dev.write(_REG_INTERRUPT_CLEAR, b"\x01")
        self._dev.write(_REG_MODE_START, b"\x00")
        self._dev.write(0x0008, b"\x09")  # VHV_CONFIG__TIMEOUT_MACROP_LOOP_BOUND
        self._dev.write(0x000B, b"\x00")
        for register, value in _LONG_MODE:
            self._dev.write(register, value)
        a_hi, b_hi = _TIMING_LONG[timing_budget_ms]
        self._dev.write(0x005E, a_hi)
        self._dev.write(0x0061, b_hi)
        width, height = (max(4, min(16, v)) for v in roi)
        self._dev.write(_REG_ROI_CENTRE, bytes((roi_centre if width <= 10 and height <= 10 else 199,)))
        self._dev.write(_REG_ROI_XY, bytes(((height - 1) << 4 | (width - 1),)))
        clock_pll = self._dev.read_uint(_REG_OSC_CALIBRATE, 2) & 0x3FF
        self._dev.write(_REG_INTERMEASUREMENT, int(clock_pll * period_ms * 1.075).to_bytes(4, "big"))
        self._dev.write(_REG_INTERRUPT_CLEAR, b"\x01")
        self._dev.write(_REG_MODE_START, b"\x40")

    def read_mm(self) -> int | bool | None:
        """Distance in mm, ``None`` when no valid target, ``False`` if no new sample."""
        if not self._ready():
            return False
        status = self._dev.read(_REG_RANGE_STATUS, 1)[0] & 0x1F
        distance = self._dev.read_uint(_REG_RANGE_MM, 2)
        self._dev.write(_REG_INTERRUPT_CLEAR, b"\x01")
        return distance if status == 0x09 else None  # 0x09 = range valid

    def stop(self) -> None:
        self._dev.write(_REG_MODE_START, b"\x00")


class PresenceDetector:
    """Hysteresis on distance: present after ``enter_samples`` consecutive
    samples closer than ``enter_mm``; absent once nothing has been within
    ``exit_mm`` for ``hold_s`` seconds."""

    def __init__(
        self,
        enter_mm: int,
        exit_mm: int,
        enter_samples: int,
        hold_s: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if exit_mm < enter_mm:
            raise ValueError("exit_mm must be >= enter_mm")
        self._enter_mm, self._exit_mm = enter_mm, exit_mm
        self._enter_samples, self._hold_s = enter_samples, hold_s
        self._clock = clock
        self.present = False
        self._streak = 0
        self._last_seen = 0.0

    def update(self, distance_mm: int | None) -> bool | None:
        """Feed one sample; returns the new state when it changes, else ``None``."""
        now = self._clock()
        if not self.present:
            near = distance_mm is not None and distance_mm < self._enter_mm
            self._streak = self._streak + 1 if near else 0
            if self._streak >= self._enter_samples:
                self.present, self._last_seen, self._streak = True, now, 0
                return True
            return None
        if distance_mm is not None and distance_mm < self._exit_mm:
            self._last_seen = now
        elif now - self._last_seen >= self._hold_s:
            self.present = False
            return False
        return None


class PresenceSensor(ABC):
    def __init__(self) -> None:
        self.present = False
        self.healthy = True
        self._listeners: list[Callable[[bool], None]] = []

    def on_change(self, listener: Callable[[bool], None]) -> None:
        self._listeners.append(listener)

    def _set(self, present: bool) -> None:
        if present != self.present:
            self.present = present
            for listener in self._listeners:
                listener(present)

    @abstractmethod
    async def run(self) -> None: ...


class Vl53l1xPresenceSensor(PresenceSensor):
    def __init__(
        self,
        gpio: GpioController,
        bus: int,
        detector: PresenceDetector,
        roi: tuple[int, int],
        roi_centre: int,
        timing_budget_ms: int,
        period_ms: int,
    ) -> None:
        super().__init__()
        self._gpio, self._bus, self._detector = gpio, bus, detector
        self._roi, self._roi_centre = roi, roi_centre
        self._budget, self._period = timing_budget_ms, period_ms
        self._sample = asyncio.Event()
        gpio.on_change(self._on_gpio)

    def _on_gpio(self, name: str, level: int) -> None:
        if name == TOF_INT_N.name and level == 0:
            self._sample.set()

    async def _reset(self) -> None:
        await self._gpio.pulse(TOF_XSHUT.name, 0, 0.01)
        await asyncio.sleep(0.01)  # boot time after XSHUT release (tBOOT 1.2 ms)

    async def run(self) -> None:
        backoff = 1.0
        while True:
            device: I2cDevice | None = None
            try:
                await self._reset()
                device = await asyncio.to_thread(I2cDevice, self._bus, VL53L1X_ADDR, wide_registers=True)
                sensor = Vl53l1x(device)
                await asyncio.to_thread(sensor.configure, self._roi, self._roi_centre, self._budget, self._period)
                self.healthy, backoff = True, 1.0
                log.info("tof: VL53L1X ranging")
                await self._sample_loop(sensor)
            except OSError as exc:
                if self.healthy:
                    log.warning("tof: sensor error (%s)", exc)
                self.healthy = False
            finally:
                if device is not None:
                    with contextlib.suppress(OSError):
                        device.close()
            await asyncio.sleep(min(backoff, 60))
            backoff *= 2

    async def _sample_loop(self, sensor: Vl53l1x) -> None:
        timeout = 2 * self._period / 1000
        while True:
            # The interrupt normally wakes us; the timeout keeps sampling if the line is missed.
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(self._sample.wait(), timeout)
            self._sample.clear()
            sample = await asyncio.to_thread(sensor.read_mm)
            if sample is False:
                continue
            change = self._detector.update(sample if isinstance(sample, int) else None)
            if change is not None:
                self._set(change)


class SimPresenceSensor(PresenceSensor):
    def inject(self, present: bool) -> None:
        self._set(present)

    async def run(self) -> None:
        await asyncio.Event().wait()
