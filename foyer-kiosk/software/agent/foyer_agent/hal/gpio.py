"""GPIO access through libgpiod v2 (``python3-libgpiod``) with a simulator."""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterable
from datetime import timedelta

from .pins import Direction, Edge, Pin

log = logging.getLogger(__name__)

Listener = Callable[[str, int], None]


class GpioController(ABC):
    """Named access to the contract's GPIO lines; values are physical levels (0/1)."""

    def __init__(self, pins: Iterable[Pin]) -> None:
        self._pins = {pin.name: pin for pin in pins}
        self._listeners: list[Listener] = []

    def on_change(self, listener: Listener) -> None:
        """Register *listener(name, level)* for edges on input lines."""
        self._listeners.append(listener)

    def _emit(self, name: str, level: int) -> None:
        for listener in self._listeners:
            listener(name, level)

    def _pin(self, name: str, direction: Direction | None = None) -> Pin:
        pin = self._pins[name]
        if direction is not None and pin.direction is not direction:
            raise ValueError(f"{name} is not an {direction.value}put line")
        return pin

    @abstractmethod
    def get(self, name: str) -> int: ...

    @abstractmethod
    def set(self, name: str, level: int) -> None: ...

    async def pulse(self, name: str, level: int, duration_s: float) -> None:
        """Drive *name* to *level* for *duration_s*, then restore the previous level."""
        previous = self.get(name)
        self.set(name, level)
        try:
            await asyncio.sleep(duration_s)
        finally:
            self.set(name, previous)

    def close(self) -> None:
        """Release hardware resources."""


class GpiodController(GpioController):
    def __init__(self, chip_path: str, pins: Iterable[Pin]) -> None:
        super().__init__(pins)
        import gpiod  # python3-libgpiod (v2 API); only present on the device
        from gpiod.line import Bias, Value
        from gpiod.line import Direction as LineDirection
        from gpiod.line import Edge as LineEdge

        self._gpiod = gpiod
        self._value = Value
        edges = {
            Edge.NONE: LineEdge.NONE,
            Edge.RISING: LineEdge.RISING,
            Edge.FALLING: LineEdge.FALLING,
            Edge.BOTH: LineEdge.BOTH,
        }
        config = {}
        for pin in self._pins.values():
            if pin.direction is Direction.OUT:
                config[pin.offset] = gpiod.LineSettings(
                    direction=LineDirection.OUTPUT,
                    output_value=Value.ACTIVE if pin.initial else Value.INACTIVE,
                )
            else:
                config[pin.offset] = gpiod.LineSettings(
                    direction=LineDirection.INPUT,
                    bias=Bias.PULL_UP if pin.pull_up else Bias.AS_IS,
                    edge_detection=edges[pin.edge],
                    debounce_period=timedelta(milliseconds=pin.debounce_ms),
                )
        self._names_by_offset = {pin.offset: pin.name for pin in self._pins.values()}
        self._request = gpiod.request_lines(chip_path, consumer="foyer-agent", config=config)
        asyncio.get_running_loop().add_reader(self._request.fd, self._on_edges)
        log.info("gpio: requested %d lines on %s", len(config), chip_path)

    def _on_edges(self) -> None:
        rising = self._gpiod.EdgeEvent.Type.RISING_EDGE
        for event in self._request.read_edge_events():
            name = self._names_by_offset[event.line_offset]
            self._emit(name, 1 if event.event_type is rising else 0)

    def get(self, name: str) -> int:
        value = self._request.get_value(self._pin(name).offset)
        return 1 if value == self._value.ACTIVE else 0

    def set(self, name: str, level: int) -> None:
        pin = self._pin(name, Direction.OUT)
        self._request.set_value(pin.offset, self._value.ACTIVE if level else self._value.INACTIVE)

    def close(self) -> None:
        asyncio.get_running_loop().remove_reader(self._request.fd)
        self._request.release()


class SimGpioController(GpioController):
    def __init__(self, pins: Iterable[Pin]) -> None:
        super().__init__(pins)
        self._levels = {pin.name: pin.initial for pin in self._pins.values()}

    def get(self, name: str) -> int:
        self._pin(name)
        return self._levels[name]

    def set(self, name: str, level: int) -> None:
        self._pin(name, Direction.OUT)
        self._levels[name] = 1 if level else 0

    def inject(self, name: str, level: int) -> None:
        """Simulate an external level change on an input line."""
        self._pin(name, Direction.IN)
        level = 1 if level else 0
        if self._levels[name] != level:
            self._levels[name] = level
            self._emit(name, level)
