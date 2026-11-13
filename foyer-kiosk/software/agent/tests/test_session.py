from pathlib import Path

import pytest

from foyer_agent.hal.id_reader import IdDocument, StubIdReader
from foyer_agent.hal.mrz import parse_mrz
from foyer_agent.sensitive import SensitiveBytes
from foyer_agent.session import Consent, EndReason, Session, SessionManager, SessionNotFound

from .conftest import Clock


def make(tmp_path: Path, clock: Clock, ended: list[EndReason]) -> SessionManager:
    return SessionManager(
        tmp_path / "scratch", idle_timeout_s=60, max_duration_s=300, clock=clock, on_end=lambda s, r: ended.append(r)
    )


def fill(session: Session) -> tuple[SensitiveBytes, SensitiveBytes, SensitiveBytes]:
    portrait, signature, chip = SensitiveBytes(b"\xff\xd8face"), SensitiveBytes(b"\x89PNGsig"), SensitiveBytes(b"dg2")
    session.first_name, session.last_name, session.company = "Anna", "Eriksson", "Utopia"
    session.portrait = portrait
    session.consent = Consent("v1", "v1", "2026-01-01T00:00:00+00:00", signature)
    session.document = IdDocument(parse_mrz(StubIdReader.MRZ), True, True, chip)
    return portrait, signature, chip


def test_wipe_zeroes_buffers_and_scratch(tmp_path: Path, clock: Clock) -> None:
    ended: list[EndReason] = []
    manager = make(tmp_path, clock, ended)
    session = manager.start("en")
    buffers = fill(session)
    (manager.scratch_dir / "sdk-image.jpg").write_bytes(b"vendor sdk temp file")
    (manager.scratch_dir / "nested").mkdir()
    (manager.scratch_dir / "nested" / "x").write_text("y")

    manager.end(session.id, EndReason.COMPLETED)

    assert all(buf.wiped for buf in buffers)
    assert session.wiped and session.first_name == "" and session.document is None and session.portrait is None
    assert list(manager.scratch_dir.iterdir()) == []
    assert manager.current is None and ended == [EndReason.COMPLETED]
    with pytest.raises(SessionNotFound):
        manager.get(session.id)


def test_new_session_replaces_and_wipes_previous(tmp_path: Path, clock: Clock) -> None:
    ended: list[EndReason] = []
    manager = make(tmp_path, clock, ended)
    first = manager.start("en")
    portrait, *_ = fill(first)
    second = manager.start("de")
    assert first.wiped and portrait.wiped
    assert manager.current is second and ended == [EndReason.REPLACED]


def test_idle_timeout_and_touch(tmp_path: Path, clock: Clock) -> None:
    ended: list[EndReason] = []
    manager = make(tmp_path, clock, ended)
    session = manager.start("en")
    clock.advance(50)
    manager.touch(session.id)
    clock.advance(50)
    assert manager.check_timeouts() is None
    clock.advance(11)
    assert manager.check_timeouts() is EndReason.IDLE_TIMEOUT
    assert session.wiped and ended == [EndReason.IDLE_TIMEOUT]


def test_max_duration_even_when_active(tmp_path: Path, clock: Clock) -> None:
    ended: list[EndReason] = []
    manager = make(tmp_path, clock, ended)
    session = manager.start("en")
    for _ in range(7):
        clock.advance(45)
        manager.touch(session.id)
    assert manager.check_timeouts() is EndReason.MAX_DURATION


def test_unknown_session_id_rejected(tmp_path: Path, clock: Clock) -> None:
    manager = make(tmp_path, clock, [])
    manager.start("en")
    with pytest.raises(SessionNotFound):
        manager.touch("not-the-id")


def test_shutdown_wipes(tmp_path: Path, clock: Clock) -> None:
    ended: list[EndReason] = []
    manager = make(tmp_path, clock, ended)
    portrait, *_ = fill(manager.start("en"))
    manager.shutdown()
    assert portrait.wiped and ended == [EndReason.SHUTDOWN]


def test_sensitive_bytes_never_reprs_content() -> None:
    buf = SensitiveBytes(b"secret-face")
    assert "secret" not in repr(buf)
    buf.wipe()
    with pytest.raises(ValueError):
        buf.view()
