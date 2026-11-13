"""In-process publish/subscribe used to fan device events out to WebSocket clients."""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator
from typing import Any

Event = dict[str, Any]


class EventBus:
    def __init__(self, max_queue: int = 64) -> None:
        self._subscribers: set[asyncio.Queue[Event]] = set()
        self._max_queue = max_queue

    def publish(self, type_: str, **data: Any) -> None:
        event: Event = {"type": type_, **data}
        for queue in self._subscribers:
            if queue.full():  # slow consumer: drop the oldest event rather than block devices
                queue.get_nowait()
            queue.put_nowait(event)

    @contextlib.asynccontextmanager
    async def subscribe(self) -> AsyncIterator[asyncio.Queue[Event]]:
        queue: asyncio.Queue[Event] = asyncio.Queue(self._max_queue)
        self._subscribers.add(queue)
        try:
            yield queue
        finally:
            self._subscribers.discard(queue)
