"""IR flood illuminator dimming via sysfs PWM (GPIO12 = PWM0_CH0, ``IR_PWM``).

config.txt enables the channel with ``dtoverlay=pwm,pin=12,func=4``; the root
``foyer-hw-setup.service`` exports channel 0 and grants the agent write access,
so the unprivileged agent only writes ``period``, ``duty_cycle`` and ``enable``.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from pathlib import Path

log = logging.getLogger(__name__)


class IrIlluminator(ABC):
    """Duty cycle in [0, 1]; the power policy clamps it via :attr:`max_duty`."""

    def __init__(self) -> None:
        self.max_duty = 1.0
        self.duty = 0.0

    def set_duty(self, duty: float) -> None:
        self.duty = max(0.0, min(duty, self.max_duty))
        self._apply(self.duty)

    def off(self) -> None:
        self.set_duty(0.0)

    @abstractmethod
    def _apply(self, duty: float) -> None: ...


class SysfsPwmIlluminator(IrIlluminator):
    def __init__(self, chip: str, channel: int, period_ns: int) -> None:
        super().__init__()
        self._chip = Path(chip)
        self._dir = self._chip / f"pwm{channel}"
        self._period = period_ns
        (self._dir / "period").write_text(str(period_ns))
        (self._dir / "duty_cycle").write_text("0")
        (self._dir / "enable").write_text("1")

    def _apply(self, duty: float) -> None:
        (self._dir / "duty_cycle").write_text(str(int(self._period * duty)))


class SimIlluminator(IrIlluminator):
    def _apply(self, duty: float) -> None:
        log.debug("sim ir duty=%.2f", duty)
