"""Cameras: CAM0 RGB (face capture) and CAM1 NoIR + 850 nm flood (liveness).

Frames are encoded to JPEG in memory and never written to disk.
"""

from __future__ import annotations

import asyncio
import io
import logging
import math
import time
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from PIL import Image, ImageDraw, ImageFilter

from ..sensitive import SensitiveBytes

log = logging.getLogger(__name__)


def encode_jpeg(image: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, "JPEG", quality=quality)
    return buf.getvalue()


class Camera(ABC):
    def __init__(self, quality: int) -> None:
        self.quality = quality
        self.healthy = True

    @abstractmethod
    async def _grab(self, still: bool) -> Image.Image: ...

    async def capture(self) -> SensitiveBytes:
        """Full-resolution still as JPEG."""
        return SensitiveBytes(encode_jpeg(await self._grab(still=True), self.quality))

    async def preview(self, fps: int) -> AsyncIterator[bytes]:
        period = 1.0 / fps
        while True:
            started = time.monotonic()
            yield encode_jpeg(await self._grab(still=False), 70)
            await asyncio.sleep(max(0.0, period - (time.monotonic() - started)))

    def close(self) -> None:
        """Release the sensor."""


class Picamera2Camera(Camera):
    """libcamera through picamera2 (Raspberry Pi OS package ``python3-picamera2``)."""

    def __init__(self, index: int, still_size: list[int], preview_size: list[int], quality: int) -> None:
        super().__init__(quality)
        from picamera2 import Picamera2  # only on the device

        self._cam: Any = Picamera2(camera_num=index)
        self._preview_cfg = self._cam.create_video_configuration(main={"size": tuple(preview_size), "format": "RGB888"})
        self._still_cfg = self._cam.create_still_configuration(main={"size": tuple(still_size), "format": "RGB888"})
        self._cam.configure(self._preview_cfg)
        self._lock = asyncio.Lock()
        self._started = False

    def _grab_sync(self, still: bool) -> Image.Image:
        if not self._started:
            self._cam.start()
            self._started = True
        if still:
            return self._cam.switch_mode_and_capture_image(self._still_cfg)
        return self._cam.capture_image("main")

    async def _grab(self, still: bool) -> Image.Image:
        async with self._lock:
            try:
                image = await asyncio.to_thread(self._grab_sync, still)
            except Exception:
                self.healthy = False
                raise
            self.healthy = True
            return image

    def close(self) -> None:
        if self._started:
            self._cam.stop()
        self._cam.close()


class StubCamera(Camera):
    """Synthetic portrait frames so the UI and pipeline run without sensors."""

    def __init__(self, size: int = 720, infrared: bool = False, quality: int = 85) -> None:
        super().__init__(quality)
        self._size = size
        self._infrared = infrared

    async def _grab(self, still: bool) -> Image.Image:
        return await asyncio.to_thread(self._render, time.monotonic())

    def _render(self, t: float) -> Image.Image:
        s = self._size
        top, bottom = ((40, 40, 40), (10, 10, 10)) if self._infrared else ((214, 222, 233), (164, 177, 196))
        img = Image.linear_gradient("L").resize((s, s)).convert("RGB")
        img = Image.composite(Image.new("RGB", (s, s), bottom), Image.new("RGB", (s, s), top), img.convert("L"))
        draw = ImageDraw.Draw(img)
        dx = math.sin(t * 0.9) * s * 0.015
        dy = math.sin(t * 0.6) * s * 0.01
        skin = (170, 170, 170) if self._infrared else (226, 189, 160)
        hair = (60, 60, 60) if self._infrared else (62, 44, 36)
        cloth = (90, 90, 90) if self._infrared else (54, 64, 92)
        cx, cy = s / 2 + dx, s * 0.44 + dy
        draw.ellipse((cx - s * 0.36, s * 0.8 + dy, cx + s * 0.36, s * 1.4 + dy), fill=cloth)
        draw.rounded_rectangle((cx - s * 0.075, cy + s * 0.1, cx + s * 0.075, cy + s * 0.33), s * 0.03, fill=skin)
        draw.ellipse((cx - s * 0.185, cy - s * 0.25, cx + s * 0.185, cy + s * 0.12), fill=hair)
        draw.ellipse((cx - s * 0.155, cy - s * 0.17, cx + s * 0.155, cy + s * 0.225), fill=skin)
        draw.chord((cx - s * 0.17, cy - s * 0.25, cx + s * 0.17, cy + s * 0.02), 190, 350, fill=hair)
        return img.filter(ImageFilter.GaussianBlur(1.6))
