"""Minimal sd_notify(3) client for Type=notify and the systemd watchdog."""

from __future__ import annotations

import asyncio
import os
import socket


def notify(message: str) -> bool:
    address = os.environ.get("NOTIFY_SOCKET")
    if not address:
        return False
    if address.startswith("@"):
        address = "\0" + address[1:]
    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as sock:
        sock.connect(address)
        sock.sendall(message.encode())
    return True


async def watchdog_loop() -> None:
    """Ping the watchdog at half the configured interval while the event loop is alive."""
    usec = int(os.environ.get("WATCHDOG_USEC", "0"))
    if not usec:
        return
    while True:
        notify("WATCHDOG=1")
        await asyncio.sleep(usec / 2_000_000)
