"""Encrypted store-and-forward queue for visits submitted while the VMS is unreachable.

Defence in depth on top of the LUKS2 (TPM-sealed) data partition: every item
is sealed with AES-256-GCM under a key delivered as a systemd credential, so a
copy of the file system alone reveals nothing. Items are purged as soon as the
VMS accepts or rejects them, and unconditionally after ``max_age``; the age
comes from the authenticated header, not from file timestamps.

File format: ``b"FQ1" | version (1) | created_ms (8, BE) | nonce (12) | ciphertext+tag``
with the first 12 bytes as associated data.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import secrets
import struct
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

log = logging.getLogger(__name__)

MAGIC = b"FQ1"
VERSION = 1
_HEADER = struct.Struct(">3sBQ")
_NONCE = 12
CLOCK_SKEW_S = 3600


class QueueFull(Exception):
    pass


class ItemRejected(Exception):
    """Raised by a submit callback when the VMS permanently refuses an item."""


def parse_key(raw: bytes) -> bytes:
    """Accept a raw 32-byte key or its hex / base64 text form."""
    if len(raw) == 32:
        return raw
    text = raw.decode("ascii", errors="strict").strip()
    if len(text) == 64:
        return bytes.fromhex(text)
    key = base64.b64decode(text, validate=True)
    if len(key) != 32:
        raise ValueError("queue key must be 32 bytes")
    return key


@dataclass(frozen=True)
class QueueItem:
    id: str
    created: float  # unix seconds


@dataclass(frozen=True)
class DrainResult:
    sent: int
    rejected: int
    remaining: int


class OfflineQueue:
    def __init__(
        self,
        directory: Path,
        key: bytes,
        max_age_s: float,
        max_items: int,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._dir = directory
        self._aead = AESGCM(parse_key(key))
        self._max_age = max_age_s
        self._max_items = max_items
        self._clock = clock
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)

    def _path(self, item_id: str) -> Path:
        return self._dir / f"{item_id}.fq"

    def put(self, payload: dict[str, Any]) -> str:
        if len(self) >= self._max_items:
            raise QueueFull()
        created_ms = int(self._clock() * 1000)
        item_id = f"{created_ms:013d}-{secrets.token_hex(8)}"
        header = _HEADER.pack(MAGIC, VERSION, created_ms)
        nonce = os.urandom(_NONCE)
        blob = header + nonce + self._aead.encrypt(nonce, json.dumps(payload).encode(), header)
        tmp = self._dir / f".{item_id}.tmp"
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            os.write(fd, blob)
            os.fsync(fd)
        finally:
            os.close(fd)
        os.replace(tmp, self._path(item_id))
        self._fsync_dir()
        return item_id

    def _fsync_dir(self) -> None:
        fd = os.open(self._dir, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)

    def _read_header(self, path: Path) -> float | None:
        try:
            with path.open("rb") as fh:
                magic, version, created_ms = _HEADER.unpack(fh.read(_HEADER.size))
        except (OSError, struct.error):
            return None
        if magic != MAGIC or version != VERSION:
            return None
        return created_ms / 1000

    def items(self) -> list[QueueItem]:
        found = []
        for path in sorted(self._dir.glob("*.fq")):
            created = self._read_header(path)
            if created is None:
                self.remove(path.stem)
                continue
            found.append(QueueItem(path.stem, created))
        return found

    def __len__(self) -> int:
        return sum(1 for _ in self._dir.glob("*.fq"))

    def get(self, item_id: str) -> dict[str, Any]:
        blob = self._path(item_id).read_bytes()
        header, nonce, ciphertext = (
            blob[: _HEADER.size],
            blob[_HEADER.size : _HEADER.size + _NONCE],
            blob[_HEADER.size + _NONCE :],
        )
        return json.loads(self._aead.decrypt(nonce, ciphertext, header))

    def remove(self, item_id: str) -> None:
        """Overwrite, then unlink. Flash wear-levelling means the overwrite is
        best effort; confidentiality rests on encryption (item + LUKS)."""
        path = self._path(item_id)
        try:
            size = path.stat().st_size
            fd = os.open(path, os.O_WRONLY)
            try:
                os.write(fd, bytes(size))
                os.fsync(fd)
            finally:
                os.close(fd)
            path.unlink()
        except FileNotFoundError:
            return

    def _expired(self, item: QueueItem, now: float) -> bool:
        age = now - item.created
        return age > self._max_age or age < -CLOCK_SKEW_S

    def purge_expired(self) -> int:
        now = self._clock()
        expired = [item for item in self.items() if self._expired(item, now)]
        for item in expired:
            self.remove(item.id)
        if expired:
            log.warning("offline queue: purged %d item(s) past max age", len(expired))
        for stale in self._dir.glob(".*.tmp"):  # interrupted writes
            stale.unlink(missing_ok=True)
        return len(expired)

    def oldest_age_s(self) -> float | None:
        items = self.items()
        return self._clock() - items[0].created if items else None

    async def drain(self, submit: Callable[[dict[str, Any]], Awaitable[None]]) -> DrainResult:
        """Submit items oldest first; stop at the first transient failure."""
        self.purge_expired()
        sent = rejected = 0
        for item in self.items():
            try:
                payload = self.get(item.id)
            except (InvalidTag, ValueError, OSError):
                log.error("offline queue: dropping unreadable item")
                self.remove(item.id)
                rejected += 1
                continue
            try:
                await submit(payload)
            except ItemRejected:
                rejected += 1
            except Exception:  # noqa: BLE001 - any other failure is transient: keep the item, retry later
                break
            else:
                sent += 1
            self.remove(item.id)
        return DrainResult(sent=sent, rejected=rejected, remaining=len(self))
