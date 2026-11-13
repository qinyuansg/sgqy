"""ID / passport reader (hub port P3) behind a vendor-neutral adapter.

Production readers ship closed SDKs, so the agent only defines the contract
and a stub. Integration notes for an adapter:

* **Regula** (e.g. 70x4M desktop readers): use Regula's Document Reader SDK for
  Linux arm64. Run its processing with the MRZ + RFID scenario, enable RFID
  passive authentication (needs the CSCA master list on the device), map the
  MRZ text result to :func:`~foyer_agent.hal.mrz.parse_mrz` and the DG2 portrait
  to :class:`IdDocument.portrait`. Configure the SDK so it does not persist
  images or logs to disk, or point its working directory at
  ``session.scratch_dir`` (tmpfs, wiped after each session).
* **HID** (former Access-IS ATOM / OCR readers): use HID's Linux SDK, which
  delivers MRZ lines and, on RFID models, chip data groups; same mapping.

Adapters must call *progress* with ``detected``, ``mrz``, ``chip``, ``verified``
so the UI can show what is happening, honour cancellation, and never write
document data outside the scratch directory.
"""

from __future__ import annotations

import asyncio
import io
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

from ..sensitive import SensitiveBytes
from .mrz import MrzData, build_td3, parse_mrz

Progress = Callable[[str], None]


class IdReadError(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason  # timeout | unreadable | unsupported | device


@dataclass
class IdDocument:
    mrz: MrzData
    chip_read: bool
    chip_verified: bool
    portrait: SensitiveBytes | None = None

    def wipe(self) -> None:
        if self.portrait is not None:
            self.portrait.wipe()


class IdReader(ABC):
    def __init__(self, scratch_dir: Path) -> None:
        self.scratch_dir = scratch_dir
        self.healthy = True

    @abstractmethod
    async def read(self, progress: Progress, timeout_s: float) -> IdDocument:
        """Wait for a document, read it and return the result; raises IdReadError."""


def _specimen_portrait() -> bytes:
    img = Image.new("RGB", (240, 320), (226, 230, 236))
    draw = ImageDraw.Draw(img)
    draw.ellipse((70, 60, 170, 180), fill=(176, 186, 200))
    draw.rounded_rectangle((40, 190, 200, 340), radius=60, fill=(176, 186, 200))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return buf.getvalue()


class StubIdReader(IdReader):
    """Simulated reader returning ICAO's fictitious 'Utopia' specimen holder."""

    MRZ = build_td3(
        issuing_state="UTO",
        surname="Eriksson",
        given_names="Anna Maria",
        document_number="L898902C3",
        nationality="UTO",
        birth="740812",
        sex="F",
        expiry="341231",
    )

    def __init__(self, scratch_dir: Path, step_s: float = 0.7) -> None:
        super().__init__(scratch_dir)
        self.step_s = step_s
        self.fail_next: str | None = None

    async def read(self, progress: Progress, timeout_s: float) -> IdDocument:
        await asyncio.sleep(self.step_s)
        progress("detected")
        if self.fail_next:
            reason, self.fail_next = self.fail_next, None
            raise IdReadError(reason)
        await asyncio.sleep(self.step_s)
        mrz = parse_mrz(self.MRZ)
        progress("mrz")
        await asyncio.sleep(self.step_s)
        progress("chip")
        await asyncio.sleep(self.step_s)
        progress("verified")
        return IdDocument(mrz=mrz, chip_read=True, chip_verified=True, portrait=SensitiveBytes(_specimen_portrait()))
