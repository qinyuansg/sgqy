import base64
from pathlib import Path

import pytest
from cryptography.exceptions import InvalidTag

from foyer_agent.offline_queue import ItemRejected, OfflineQueue, QueueFull, parse_key

from .conftest import QUEUE_KEY, Clock

PAYLOAD = {"visitor": {"firstName": "Anna Maria", "lastName": "Eriksson"}, "portraitJpeg": "/9j/AAAA"}


def make(tmp_path: Path, clock: Clock, max_items: int = 10) -> OfflineQueue:
    return OfflineQueue(tmp_path / "q", QUEUE_KEY, max_age_s=24 * 3600, max_items=max_items, clock=clock)


def test_roundtrip_and_ciphertext_at_rest(tmp_path: Path, clock: Clock) -> None:
    queue = make(tmp_path, clock)
    item_id = queue.put(PAYLOAD)
    raw = (tmp_path / "q" / f"{item_id}.fq").read_bytes()
    assert raw.startswith(b"FQ1")
    assert b"Eriksson" not in raw and b"Anna" not in raw
    assert (tmp_path / "q" / f"{item_id}.fq").stat().st_mode & 0o777 == 0o600
    assert queue.get(item_id) == PAYLOAD


def test_wrong_key_cannot_decrypt(tmp_path: Path, clock: Clock) -> None:
    item_id = make(tmp_path, clock).put(PAYLOAD)
    other = OfflineQueue(tmp_path / "q", bytes(32), 3600, 10, clock=clock)
    with pytest.raises(InvalidTag):
        other.get(item_id)


async def test_tampered_header_is_detected_and_dropped(tmp_path: Path, clock: Clock) -> None:
    queue = make(tmp_path, clock)
    item_id = queue.put(PAYLOAD)
    path = tmp_path / "q" / f"{item_id}.fq"
    blob = bytearray(path.read_bytes())
    blob[11] ^= 0x01  # nudge the authenticated creation time by 1 ms
    path.write_bytes(bytes(blob))

    async def submit(_: dict) -> None:
        raise AssertionError("must not submit a tampered item")

    result = await queue.drain(submit)
    assert result.rejected == 1 and len(queue) == 0


def test_items_expire_after_max_age(tmp_path: Path, clock: Clock) -> None:
    queue = make(tmp_path, clock)
    queue.put(PAYLOAD)
    clock.advance(23 * 3600)
    queue.put(PAYLOAD)
    assert queue.purge_expired() == 0
    clock.advance(1.5 * 3600)
    assert queue.purge_expired() == 1
    assert len(queue) == 1
    clock.advance(24 * 3600)
    assert queue.purge_expired() == 1
    assert list((tmp_path / "q").iterdir()) == []


def test_clock_jump_back_purges(tmp_path: Path, clock: Clock) -> None:
    queue = make(tmp_path, clock)
    queue.put(PAYLOAD)
    clock.advance(-2 * 3600)
    assert queue.purge_expired() == 1


def test_capacity_limit(tmp_path: Path, clock: Clock) -> None:
    queue = make(tmp_path, clock, max_items=2)
    queue.put(PAYLOAD)
    queue.put(PAYLOAD)
    with pytest.raises(QueueFull):
        queue.put(PAYLOAD)


async def test_drain_order_rejection_and_transient_stop(tmp_path: Path, clock: Clock) -> None:
    queue = make(tmp_path, clock)
    for i in range(4):
        queue.put({"n": i})
        clock.advance(1)
    seen: list[int] = []

    async def submit(payload: dict) -> None:
        seen.append(payload["n"])
        if payload["n"] == 1:
            raise ItemRejected()
        if payload["n"] == 2:
            raise ConnectionError("vms down")

    result = await queue.drain(submit)
    assert seen == [0, 1, 2]
    assert (result.sent, result.rejected, result.remaining) == (1, 1, 2)

    async def ok(payload: dict) -> None:
        seen.append(payload["n"])

    result = await queue.drain(ok)
    assert seen[-2:] == [2, 3] and result.remaining == 0
    assert list((tmp_path / "q").iterdir()) == []


def test_key_formats() -> None:
    assert parse_key(QUEUE_KEY) == QUEUE_KEY
    assert parse_key(QUEUE_KEY.hex().encode()) == QUEUE_KEY
    assert parse_key(base64.b64encode(QUEUE_KEY)) == QUEUE_KEY
    with pytest.raises(ValueError):
        parse_key(base64.b64encode(b"short"))
