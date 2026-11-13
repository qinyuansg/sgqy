"""GPIO map from foyer-kiosk/hardware/interface-contract.md (rev B, carrier FYR-CB-01).

Only lines the agent drives or watches through libgpiod are listed. Lines
owned by kernel drivers are not: GPIO0/1 (camera 1 I2C), GPIO2/3 (I2C1),
GPIO12 (``IR_PWM``, PWM0), GPIO13 (``LED_DATA``, RP1 PIO) and GPIO18-21 (I2S).
Boot-critical outputs are also set by firmware (``gpio=`` lines in
config.txt) so the display, USB hubs and ToF come up without the agent.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Direction(Enum):
    IN = "in"
    OUT = "out"


class Edge(Enum):
    NONE = "none"
    RISING = "rising"
    FALLING = "falling"
    BOTH = "both"


@dataclass(frozen=True)
class Pin:
    name: str
    offset: int
    direction: Direction
    initial: int = 0  # outputs: level at request time; inputs: idle level (simulator)
    pull_up: bool = False
    edge: Edge = Edge.NONE
    debounce_ms: int = 0


POE_HIPWR_N = Pin("POE_HIPWR_n", 4, Direction.IN, initial=0, edge=Edge.BOTH, debounce_ms=50)
AMP_SD = Pin("AMP_SD", 5, Direction.OUT, initial=0)
USBC_ATTACH = Pin("USBC_ATTACH", 6, Direction.IN, initial=1, pull_up=True, edge=Edge.BOTH, debounce_ms=50)
PRN_PWR_EN = Pin("PRN_PWR_EN", 16, Direction.OUT, initial=0)
TOF_INT_N = Pin("TOF_INT_n", 17, Direction.IN, initial=1, pull_up=True, edge=Edge.FALLING)
HUB_RESET_N = Pin("HUB_RESET_n", 22, Direction.OUT, initial=1)
DOOR_OPEN = Pin("DOOR_OPEN", 23, Direction.IN, initial=0, pull_up=True, edge=Edge.BOTH, debounce_ms=30)
PD_ALERT_N = Pin("PD_ALERT_n", 24, Direction.IN, initial=1, edge=Edge.FALLING)
PWR_ALERT_N = Pin("PWR_ALERT_n", 25, Direction.IN, initial=1, edge=Edge.BOTH, debounce_ms=10)
DISP_PWR_EN = Pin("DISP_PWR_EN", 26, Direction.OUT, initial=1)
TOF_XSHUT = Pin("TOF_XSHUT", 27, Direction.OUT, initial=1)

ALL_PINS: tuple[Pin, ...] = (
    POE_HIPWR_N,
    AMP_SD,
    USBC_ATTACH,
    PRN_PWR_EN,
    TOF_INT_N,
    HUB_RESET_N,
    DOOR_OPEN,
    PD_ALERT_N,
    PWR_ALERT_N,
    DISP_PWR_EN,
    TOF_XSHUT,
)
