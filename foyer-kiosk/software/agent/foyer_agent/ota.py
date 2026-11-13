"""OTA hooks. The privileged updater (``foyer-ota``, a systemd oneshot from the
OS image) does the work; the unprivileged agent only reports state and asks
for an update by creating a request file that a ``.path`` unit watches."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any


class OtaClient:
    def __init__(self, request_file: str, state_file: str) -> None:
        self._request = Path(request_file)
        self._state = Path(state_file)

    def state(self) -> dict[str, Any]:
        try:
            data = json.loads(self._state.read_text())
        except (OSError, ValueError):
            return {}
        return data if isinstance(data, dict) else {}

    def request_update(self, reason: str) -> None:
        self._request.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._request.with_suffix(".tmp")
        tmp.write_text(json.dumps({"reason": reason[:64], "at": int(time.time())}))
        os.replace(tmp, self._request)

    @property
    def pending(self) -> bool:
        return self._request.exists()
