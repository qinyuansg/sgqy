"""USB QR scanner on hub port P2, as HID keyboard wedge or CDC-ACM serial.

The HID device is grabbed exclusively (``EVIOCGRAB``) so scanned text is never
typed into the browser. A udev rule installed by the OS image links the
scanner's event node to ``/dev/foyer/qr-kbd`` (or its tty to ``/dev/foyer/qr-tty``).
"""

from __future__ import annotations

import asyncio
import contextlib
import fcntl
import glob
import logging
import os
import struct
import termios
import tty
from abc import ABC, abstractmethod
from collections.abc import Callable

log = logging.getLogger(__name__)

EV_KEY = 1
EVIOCGRAB = 0x4004_4590
_EVENT = struct.Struct("llHHi")  # struct input_event (64-bit timeval)

KEY_ENTER, KEY_KPENTER = 28, 96
KEY_LEFTSHIFT, KEY_RIGHTSHIFT = 42, 54

# US layout, the factory default of virtually all scanners.
_ROWS: tuple[tuple[int, str, str], ...] = (
    (2, "1234567890-=", "!@#$%^&*()_+"),
    (16, "qwertyuiop[]", "QWERTYUIOP{}"),
    (30, "asdfghjkl;'`", 'ASDFGHJKL:"~'),
    (43, "\\zxcvbnm,./", "|ZXCVBNM<>?"),
)
_PLAIN: dict[int, str] = {57: " "}
_SHIFTED: dict[int, str] = {57: " "}
for start, plain, shifted in _ROWS:
    for i, (p, s) in enumerate(zip(plain, shifted, strict=True)):
        _PLAIN[start + i] = p
        _SHIFTED[start + i] = s


def sanitize(code: str, max_length: int) -> str | None:
    code = code.strip()
    if not code or len(code) > max_length or not code.isprintable() or not code.isascii():
        return None
    return code


class KeyboardWedgeDecoder:
    """Turns EV_KEY events into scanned strings (terminated by Enter)."""

    def __init__(self) -> None:
        self._shift = False
        self._chars: list[str] = []

    def feed(self, ev_type: int, code: int, value: int) -> str | None:
        if ev_type != EV_KEY:
            return None
        if code in (KEY_LEFTSHIFT, KEY_RIGHTSHIFT):
            self._shift = value != 0
            return None
        if value != 1:  # only key presses; ignore release and autorepeat
            return None
        if code in (KEY_ENTER, KEY_KPENTER):
            text, self._chars = "".join(self._chars), []
            return text
        char = (_SHIFTED if self._shift else _PLAIN).get(code)
        if char is not None:
            self._chars.append(char)
        return None


class QrScanner(ABC):
    def __init__(self, max_length: int) -> None:
        self._max_length = max_length
        self._listeners: list[Callable[[str], None]] = []
        self.healthy = False

    def on_scan(self, listener: Callable[[str], None]) -> None:
        self._listeners.append(listener)

    def _deliver(self, raw: str) -> None:
        code = sanitize(raw, self._max_length)
        if code is None:
            log.info("qr: rejected malformed scan")
            return
        for listener in self._listeners:
            listener(code)

    @abstractmethod
    async def run(self) -> None: ...


class _FdScanner(QrScanner):
    """Common reconnect loop for scanners that are character devices."""

    def __init__(self, path: str, max_length: int) -> None:
        super().__init__(max_length)
        self._path = path

    @abstractmethod
    def _open(self, path: str) -> int: ...

    @abstractmethod
    def _on_readable(self, fd: int) -> None: ...

    async def run(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            matches = sorted(glob.glob(self._path))
            if not matches:
                self.healthy = False
                await asyncio.sleep(2)
                continue
            try:
                fd = self._open(matches[0])
            except OSError as exc:
                self.healthy = False
                log.warning("qr: cannot open scanner: %s", exc.strerror)
                await asyncio.sleep(5)
                continue
            closed = loop.create_future()

            def readable(fd: int = fd, closed: asyncio.Future[None] = closed) -> None:
                try:
                    self._on_readable(fd)
                except OSError:
                    if not closed.done():
                        closed.set_result(None)

            loop.add_reader(fd, readable)
            self.healthy = True
            log.info("qr: scanner connected")
            try:
                await closed  # unplugged / hub reset
            finally:
                loop.remove_reader(fd)
                os.close(fd)
                self.healthy = False
            log.warning("qr: scanner disconnected")


class HidWedgeScanner(_FdScanner):
    def __init__(self, path: str, max_length: int) -> None:
        super().__init__(path, max_length)
        self._decoder = KeyboardWedgeDecoder()

    def _open(self, path: str) -> int:
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
        fcntl.ioctl(fd, EVIOCGRAB, 1)
        self._decoder = KeyboardWedgeDecoder()
        return fd

    def _on_readable(self, fd: int) -> None:
        data = os.read(fd, _EVENT.size * 64)
        if not data:
            raise OSError("eof")
        for offset in range(0, len(data) - _EVENT.size + 1, _EVENT.size):
            _, _, ev_type, code, value = _EVENT.unpack_from(data, offset)
            text = self._decoder.feed(ev_type, code, value)
            if text is not None:
                self._deliver(text)


class SerialScanner(_FdScanner):
    def __init__(self, path: str, baud: int, max_length: int) -> None:
        super().__init__(path, max_length)
        self._baud = baud
        self._buffer = bytearray()

    def _open(self, path: str) -> int:
        fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        tty.setraw(fd)
        attrs = termios.tcgetattr(fd)
        speed = getattr(termios, f"B{self._baud}")
        attrs[4] = attrs[5] = speed
        termios.tcsetattr(fd, termios.TCSANOW, attrs)
        self._buffer.clear()
        return fd

    def _on_readable(self, fd: int) -> None:
        data = os.read(fd, 1024)
        if not data:
            raise OSError("eof")
        self._buffer += data
        while (end := next((i for i, b in enumerate(self._buffer) if b in b"\r\n"), -1)) >= 0:
            line, self._buffer = bytes(self._buffer[:end]), self._buffer[end + 1 :]
            if line:
                with contextlib.suppress(UnicodeDecodeError):
                    self._deliver(line.decode("ascii"))
        if len(self._buffer) > self._max_length:
            self._buffer.clear()


class SimScanner(QrScanner):
    def __init__(self, max_length: int) -> None:
        super().__init__(max_length)
        self.healthy = True

    def inject(self, code: str) -> None:
        self._deliver(code)

    async def run(self) -> None:
        await asyncio.Event().wait()
