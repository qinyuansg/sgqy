"""SK6812MINI RGB status light bar (24 LEDs) on GPIO13, driven by the RP1 PIO.

``dtoverlay=ws2812-pio,gpio=13,num_leds=24`` binds the kernel ``ws2812-pio-rp1``
driver, which exposes ``/dev/leds0``. Its write protocol (drivers/misc/
ws2812-pio-rp1.c):

* a frame is ``num_leds`` little-endian 32-bit words written at offset 0; the
  bytes of each word are ``R, G, B, W`` (W is ignored for RGB parts);
* writing a *single byte* at offset 0 sets the global brightness (1-255; 0
  would switch the driver to raw pass-through, so it is never written);
* the driver applies gamma correction itself, so pixel values are linear.

If the overlay cannot be used, the same frames can be pushed with Raspberry
Pi's userspace ``piolib`` (see the OS image README); only the writer changes.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import math
import os
from abc import ABC, abstractmethod
from enum import Enum

log = logging.getLogger(__name__)

RGB = tuple[int, int, int]


def pack_frame(pixels: list[RGB]) -> bytes:
    """Encode pixels in the ws2812-pio-rp1 format (R, G, B, W=0 per LED)."""
    out = bytearray()
    for r, g, b in pixels:
        out += bytes((r & 0xFF, g & 0xFF, b & 0xFF, 0))
    return bytes(out)


def brightness_byte(level: float) -> int:
    """Driver brightness for *level* in [0, 1]; never 0 (pass-through mode)."""
    return max(1, min(255, round(255 * level)))


class LightState(Enum):
    OFF = "off"
    IDLE = "idle"
    ATTENTION = "attention"
    BUSY = "busy"
    SUCCESS = "success"
    ERROR = "error"


def parse_hex_colour(value: str) -> RGB:
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError("expected #RRGGBB")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


IDLE_WHITE: RGB = (255, 236, 210)  # warm white from mixed RGB (no W die on SK6812MINI RGB)
SUCCESS_GREEN: RGB = (0, 200, 90)
ERROR_AMBER: RGB = (255, 110, 0)


def render(state: LightState, t: float, count: int, accent: RGB) -> list[RGB]:
    """Pixels for *state* at *t* seconds after entering it."""
    if state is LightState.OFF:
        return [(0, 0, 0)] * count
    centre = (count - 1) / 2
    pixels: list[RGB] = []
    for i in range(count):
        if state is LightState.IDLE:
            k = 0.10 + 0.06 * math.sin(2 * math.pi * t / 6.0)
            colour = IDLE_WHITE
        elif state is LightState.ATTENTION:
            phase = t * 0.8 - abs(i - centre) / count
            k = 0.35 + 0.65 * (0.5 + 0.5 * math.sin(2 * math.pi * phase))
            colour = accent
        elif state is LightState.BUSY:
            head = (t * 1.1 % 1.0) * count
            k = max(0.0, 1.0 - ((head - i) % count) / (count * 0.35))
            colour = accent
        elif state is LightState.SUCCESS:
            k = min(1.0, t / 0.3)
            colour = SUCCESS_GREEN
        else:  # ERROR: two quick blinks per second for 2 s, then steady
            k = 1.0 if t > 2.0 or (t * 4) % 2 < 1 else 0.15
            colour = ERROR_AMBER
        pixels.append((round(colour[0] * k), round(colour[1] * k), round(colour[2] * k)))
    return pixels


class LightbarWriter(ABC):
    @abstractmethod
    def write(self, frame: bytes) -> None: ...

    @abstractmethod
    def set_brightness(self, value: int) -> None: ...

    def close(self) -> None:
        """Release the device."""


class PioLedsWriter(LightbarWriter):
    def __init__(self, device: str) -> None:
        self._fd = os.open(device, os.O_WRONLY)

    def write(self, frame: bytes) -> None:
        os.pwrite(self._fd, frame, 0)

    def set_brightness(self, value: int) -> None:
        os.pwrite(self._fd, bytes((value,)), 0)

    def close(self) -> None:
        os.close(self._fd)


class SimWriter(LightbarWriter):
    def __init__(self) -> None:
        self.last_frame = b""
        self.brightness = 255

    def write(self, frame: bytes) -> None:
        self.last_frame = frame

    def set_brightness(self, value: int) -> None:
        self.brightness = value


class LightBar:
    """Animates the bar; ``max_brightness`` is capped by the power policy and
    ``ambient_factor`` follows the room light."""

    def __init__(self, writer: LightbarWriter, count: int, accent: str, max_brightness: float, fps: int) -> None:
        self._writer = writer
        self._count = count
        self._accent = parse_hex_colour(accent)
        self.max_brightness = max_brightness
        self.power_cap = 1.0
        self.ambient_factor = 1.0
        self._fps = fps
        self._state = LightState.IDLE
        self._entered = 0.0
        self._applied_brightness: int | None = None
        self.healthy = True

    @property
    def state(self) -> LightState:
        return self._state

    def set_state(self, state: LightState) -> None:
        if state is not self._state:
            self._state = state
            self._entered = asyncio.get_running_loop().time()

    def _frame(self, t: float) -> None:
        level = min(self.max_brightness, self.power_cap) * self.ambient_factor
        target = brightness_byte(level)
        if target != self._applied_brightness:
            self._writer.set_brightness(target)
            self._applied_brightness = target
        self._writer.write(pack_frame(render(self._state, t, self._count, self._accent)))

    async def run(self) -> None:
        loop = asyncio.get_running_loop()
        self._entered = loop.time()
        period = 1.0 / self._fps
        try:
            while True:
                try:
                    self._frame(loop.time() - self._entered)
                    self.healthy = True
                except OSError as exc:
                    if self.healthy:
                        log.warning("lightbar write failed: %s", exc.strerror)
                    self.healthy = False
                    self._applied_brightness = None
                await asyncio.sleep(period)
        finally:
            with contextlib.suppress(OSError):
                self._writer.write(pack_frame([(0, 0, 0)] * self._count))
            self._writer.close()
