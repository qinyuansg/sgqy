"""Spoken prompts for accessibility mode.

Speech is synthesised on-device (espeak-ng; swap in Piper voices for a more
natural sound) and played on the I2S sound card (MAX98357A, ALSA card from
``dtoverlay=googlevoicehat-soundcard``). The amplifier is taken out of
shutdown with ``AMP_SD`` only while speaking. Only UI prompt strings are spoken, never
personal data.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from abc import ABC, abstractmethod

from .gpio import GpioController
from .pins import AMP_SD

log = logging.getLogger(__name__)

MAX_TEXT = 600


class Speaker(ABC):
    @abstractmethod
    async def say(self, text: str, language: str) -> None: ...


class EspeakSpeaker(Speaker):
    def __init__(self, gpio: GpioController, voices: dict[str, str], rate_wpm: int) -> None:
        self._gpio = gpio
        self._voices = voices
        self._rate = rate_wpm
        self._proc: asyncio.subprocess.Process | None = None
        self._lock = asyncio.Lock()

    async def say(self, text: str, language: str) -> None:
        # A new prompt interrupts the current one (the user moved on).
        if self._proc is not None and self._proc.returncode is None:
            with contextlib.suppress(ProcessLookupError):
                self._proc.kill()
        async with self._lock:
            voice = self._voices.get(language, language)
            self._gpio.set(AMP_SD.name, 1)
            try:
                self._proc = await asyncio.create_subprocess_exec(
                    "espeak-ng",
                    "-v",
                    voice,
                    "-s",
                    str(self._rate),
                    "--",
                    text[:MAX_TEXT],
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await self._proc.wait()
            except OSError as exc:
                log.warning("tts unavailable: %s", exc.strerror)
            finally:
                self._gpio.set(AMP_SD.name, 0)


class SilentSpeaker(Speaker):
    """Used when speech is off or rendered by the browser (simulation)."""

    async def say(self, text: str, language: str) -> None:
        return None
