"""Containers for personal data that must be wiped after use."""

from __future__ import annotations


class SensitiveBytes:
    """A mutable byte buffer that is zeroed on :meth:`wipe`.

    CPython cannot guarantee that no other copy of the data exists (e.g. in
    socket buffers or intermediate ``bytes`` objects), but keeping the canonical
    copy in a ``bytearray`` and zeroing it removes the long-lived one and makes
    any use-after-wipe visible. ``repr`` never shows the content.
    """

    __slots__ = ("_buf",)

    def __init__(self, data: bytes | bytearray | memoryview) -> None:
        self._buf = bytearray(data)

    def __len__(self) -> int:
        return len(self._buf)

    def __repr__(self) -> str:
        return f"<SensitiveBytes len={len(self._buf)}>"

    @property
    def wiped(self) -> bool:
        return not self._buf

    def view(self) -> memoryview:
        if self.wiped:
            raise ValueError("buffer has been wiped")
        return memoryview(self._buf)

    def wipe(self) -> None:
        self._buf[:] = bytes(len(self._buf))
        self._buf.clear()


def wipe_all(*items: SensitiveBytes | None) -> None:
    for item in items:
        if item is not None:
            item.wipe()
