"""Minimal blocking I2C register access through the kernel i2c-dev interface.

Each transaction is a register-pointer write followed by a read (with a stop
in between), which all devices on I2C1 (INA238, TMP1075, STUSB4500,
VL53L1X) accept. Call from a worker thread (``asyncio.to_thread``).
"""

from __future__ import annotations

import fcntl
import os
import threading
from typing import Literal

I2C_SLAVE = 0x0703

_bus_locks: dict[int, threading.Lock] = {}


class I2cDevice:
    def __init__(self, bus: int, address: int, *, wide_registers: bool = False) -> None:
        self._fd = os.open(f"/dev/i2c-{bus}", os.O_RDWR)
        fcntl.ioctl(self._fd, I2C_SLAVE, address)
        self._wide = wide_registers
        self._lock = _bus_locks.setdefault(bus, threading.Lock())

    def _pointer(self, register: int) -> bytes:
        return register.to_bytes(2 if self._wide else 1, "big")

    def read(self, register: int, length: int) -> bytes:
        with self._lock:
            os.write(self._fd, self._pointer(register))
            data = os.read(self._fd, length)
        if len(data) != length:
            raise OSError("short i2c read")
        return data

    def read_uint(self, register: int, length: int, byteorder: Literal["big", "little"] = "big") -> int:
        return int.from_bytes(self.read(register, length), byteorder)

    def write(self, register: int, data: bytes) -> None:
        with self._lock:
            os.write(self._fd, self._pointer(register) + data)

    def close(self) -> None:
        os.close(self._fd)
