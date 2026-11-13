"""Badge label printer (hub port P4) through CUPS.

Jobs are piped to ``lp`` on stdin so the rendered badge never touches the
agent's filesystem; the OS image keeps the CUPS spool on tmpfs and disables
job-file and job-history preservation. The job title is the constant
``badge`` so no visitor name ends up in CUPS metadata.
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod

log = logging.getLogger(__name__)


class PrintError(Exception):
    pass


class BadgePrinter(ABC):
    def __init__(self) -> None:
        self.healthy = True

    @abstractmethod
    async def submit(self, pdf: bytes, slow: bool) -> None: ...

    @abstractmethod
    async def pending_jobs(self) -> int: ...

    async def refresh_health(self) -> bool:
        return self.healthy


async def _run(*args: str, stdin: bytes | None = None) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdin=asyncio.subprocess.PIPE if stdin is not None else asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate(stdin)
    return proc.returncode or 0, out.decode(errors="replace")


class CupsPrinter(BadgePrinter):
    def __init__(self, queue: str, lp_options: list[str], slow_lp_options: list[str]) -> None:
        super().__init__()
        self._queue = queue
        self._options = lp_options
        self._slow_options = slow_lp_options

    async def submit(self, pdf: bytes, slow: bool) -> None:
        args = ["lp", "-d", self._queue, "-t", "badge"]
        for option in self._options + (self._slow_options if slow else []):
            args += ["-o", option]
        try:
            code, _ = await _run(*args, "-", stdin=pdf)
        except OSError as exc:
            self.healthy = False
            raise PrintError(f"lp unavailable: {exc.strerror}") from None
        if code != 0:
            self.healthy = False
            raise PrintError(f"lp exited with {code}")

    async def pending_jobs(self) -> int:
        try:
            code, out = await _run("lpstat", "-o", self._queue)
        except OSError:
            return 0
        return sum(1 for line in out.splitlines() if line.strip()) if code == 0 else 0

    async def refresh_health(self) -> bool:
        try:
            code, out = await _run("lpstat", "-p", self._queue)
        except OSError:
            self.healthy = False
            return False
        self.healthy = code == 0 and "disabled" not in out
        return self.healthy


class SimPrinter(BadgePrinter):
    def __init__(self, job_s: float = 2.0) -> None:
        super().__init__()
        self.job_s = job_s
        self.jobs: list[tuple[int, bool]] = []  # (pdf size, slow) - never the content
        self._busy_until = 0.0

    async def submit(self, pdf: bytes, slow: bool) -> None:
        if not pdf.startswith(b"%PDF"):
            raise PrintError("not a PDF")
        self.jobs.append((len(pdf), slow))
        loop = asyncio.get_running_loop()
        self._busy_until = max(self._busy_until, loop.time()) + self.job_s * (2 if slow else 1)

    async def pending_jobs(self) -> int:
        return 1 if asyncio.get_running_loop().time() < self._busy_until else 0
