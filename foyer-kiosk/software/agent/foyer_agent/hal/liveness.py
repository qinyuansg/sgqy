"""Presentation-attack detection (liveness) behind an adapter interface.

The capture sequence is fixed by the agent: an RGB still from CAM0 plus an
IR still from CAM1 taken with the 850 nm flood on. Screens emit no 850 nm
light and printed photos reflect it very differently from skin, which is what
an IR-assisted PAD model exploits. Adapters wrap a certified PAD engine
(ISO/IEC 30107-3 tested) that runs on-device; the stub returns a configurable
score so the flow can be exercised end to end.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass

from ..sensitive import SensitiveBytes


@dataclass(frozen=True)
class LivenessResult:
    score: float  # 0..1, higher = more likely a live person
    passed: bool


class LivenessChecker(ABC):
    def __init__(self, threshold: float) -> None:
        self.threshold = threshold
        self.healthy = True

    async def evaluate(self, rgb: SensitiveBytes, ir: SensitiveBytes) -> LivenessResult:
        score = await self._score(rgb, ir)
        return LivenessResult(score=round(score, 3), passed=score >= self.threshold)

    @abstractmethod
    async def _score(self, rgb: SensitiveBytes, ir: SensitiveBytes) -> float: ...


class StubLiveness(LivenessChecker):
    def __init__(self, threshold: float, score: float = 0.97) -> None:
        super().__init__(threshold)
        self.score = score

    async def _score(self, rgb: SensitiveBytes, ir: SensitiveBytes) -> float:
        if rgb.wiped or ir.wiped:
            raise ValueError("frames missing")
        await asyncio.sleep(0.4)
        return self.score
