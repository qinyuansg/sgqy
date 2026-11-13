"""Logging with a PII safety net.

The code base never logs personal data on purpose: log calls reference
sessions by their random id only. :class:`RedactingFilter` is a second line of
defence that scrubs anything that *looks* like personal data (e-mail
addresses, MRZ lines, long digit runs, base64 blobs) before a record reaches
journald, which itself is configured volatile on the kiosk.
"""

from __future__ import annotations

import logging
import re
import sys

_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "<email>"),
    (re.compile(r"[A-Z0-9<]{30,44}"), "<mrz>"),
    (re.compile(r"(?:data:[\w/+.-]+;base64,)?[A-Za-z0-9+/]{64,}={0,2}"), "<blob>"),
    (re.compile(r"\+?\d[\d \-]{7,}\d"), "<number>"),
)


def redact(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        record.msg = redact(message)
        record.args = None
        if record.exc_info and record.exc_info[1] is not None:
            # Exception messages can embed payloads (e.g. HTTP bodies); keep the type only.
            exc = record.exc_info[1]
            record.msg += f" [{type(exc).__name__}]"
            record.exc_info = None
            record.exc_text = None
        return True


def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
    handler.addFilter(RedactingFilter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    # aiohttp's access log contains query strings (host searches) - never emit it.
    logging.getLogger("aiohttp.access").disabled = True
