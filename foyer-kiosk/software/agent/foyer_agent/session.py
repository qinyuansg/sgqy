"""Visitor session lifecycle.

The kiosk serves one visitor at a time. All personal data captured during a
session lives in the :class:`Session` object (images as wipeable
:class:`SensitiveBytes`) and in the tmpfs scratch directory used by vendor
SDKs. :meth:`Session.wipe` erases both; it runs on completion, cancellation,
idle timeout, maximum duration and agent shutdown.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
import shutil
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

from .hal.id_reader import IdDocument
from .sensitive import SensitiveBytes, wipe_all
from .vms.base import Host, Invitation

log = logging.getLogger(__name__)


class EndReason(Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    IDLE_TIMEOUT = "idle_timeout"
    MAX_DURATION = "max_duration"
    REPLACED = "replaced"
    SHUTDOWN = "shutdown"


class SessionNotFound(LookupError):
    pass


@dataclass
class Consent:
    privacy_version: str
    rules_version: str
    accepted_at: str
    signature_png: SensitiveBytes


@dataclass
class Session:
    id: str
    language: str
    started: float
    last_activity: float
    mode: str | None = None
    invitation: Invitation | None = None
    first_name: str = ""
    last_name: str = ""
    company: str = ""
    host: Host | None = None
    purpose: str = ""
    document: IdDocument | None = None
    portrait: SensitiveBytes | None = None
    liveness_score: float | None = None
    face_attempts: int = 0
    consent: Consent | None = None
    submitted: bool = False
    wiped: bool = field(default=False, repr=False)

    def __repr__(self) -> str:
        return f"<Session {self.id}>"

    def wipe(self) -> None:
        wipe_all(self.portrait, self.consent.signature_png if self.consent else None)
        if self.document is not None:
            self.document.wipe()
        self.invitation = self.host = self.document = self.portrait = self.consent = None
        self.first_name = self.last_name = self.company = self.purpose = ""
        self.liveness_score = None
        self.wiped = True


def wipe_directory(directory: Path) -> None:
    """Delete everything inside *directory* (tmpfs), keeping the directory."""
    if not directory.exists():
        return
    for child in directory.iterdir():
        if child.is_dir() and not child.is_symlink():
            shutil.rmtree(child, ignore_errors=True)
        else:
            child.unlink(missing_ok=True)


class SessionManager:
    def __init__(
        self,
        scratch_dir: Path,
        idle_timeout_s: float,
        max_duration_s: float,
        on_end: Callable[[Session, EndReason], None] = lambda s, r: None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.scratch_dir = scratch_dir
        self._idle_timeout = idle_timeout_s
        self._max_duration = max_duration_s
        self._on_end = on_end
        self._clock = clock
        self._current: Session | None = None
        self.counters = {reason.value: 0 for reason in EndReason}
        self.started_total = 0
        scratch_dir.mkdir(mode=0o700, parents=True, exist_ok=True)

    @property
    def current(self) -> Session | None:
        return self._current

    def start(self, language: str) -> Session:
        if self._current is not None:
            self.end(self._current.id, EndReason.REPLACED)
        now = self._clock()
        session = Session(id=secrets.token_urlsafe(12), language=language, started=now, last_activity=now)
        self._current = session
        self.started_total += 1
        log.info("session %s started", session.id)
        return session

    def get(self, session_id: str) -> Session:
        session = self._current
        if session is None or not secrets.compare_digest(session.id, session_id):
            raise SessionNotFound(session_id)
        return session

    def touch(self, session_id: str) -> Session:
        session = self.get(session_id)
        session.last_activity = self._clock()
        return session

    def end(self, session_id: str, reason: EndReason) -> None:
        session = self.get(session_id)
        self._current = None
        session.wipe()
        wipe_directory(self.scratch_dir)
        self.counters[reason.value] += 1
        log.info("session %s ended: %s (%.0f s)", session.id, reason.value, self._clock() - session.started)
        self._on_end(session, reason)

    def check_timeouts(self) -> EndReason | None:
        session = self._current
        if session is None:
            return None
        now = self._clock()
        reason = None
        if now - session.started > self._max_duration:
            reason = EndReason.MAX_DURATION
        elif now - session.last_activity > self._idle_timeout:
            reason = EndReason.IDLE_TIMEOUT
        if reason is not None:
            self.end(session.id, reason)
        return reason

    async def run_reaper(self, interval_s: float = 1.0) -> None:
        while True:
            await asyncio.sleep(interval_s)
            self.check_timeouts()

    def shutdown(self) -> None:
        if self._current is not None:
            self.end(self._current.id, EndReason.SHUTDOWN)
        wipe_directory(self.scratch_dir)
