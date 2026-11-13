"""Health snapshot, Prometheus exposition and the outbound heartbeat.

Nothing here contains personal data: only device health, counters and versions.
"""

from __future__ import annotations

import asyncio
import logging
import random
import shutil
import time
from pathlib import Path
from typing import Any

import aiohttp

from . import __version__
from .config import IdentityConfig, MonitoringConfig
from .credentials import resolve_text
from .kiosk import Kiosk
from .vms.rest import client_ssl_context, require_tls

log = logging.getLogger(__name__)

# Written by OS provisioning: fde-otp | luks-otp | keyfile.
STORAGE_PROTECTION = Path("/etc/foyer/storage-protection")


def _storage_protection() -> str | None:
    try:
        return STORAGE_PROTECTION.read_text().strip() or None
    except OSError:
        return None


def _system_uptime() -> float | None:
    try:
        with open("/proc/uptime", encoding="ascii") as fh:
            return float(fh.read().split()[0])
    except (OSError, ValueError, IndexError):
        return None


def snapshot(kiosk: Kiosk) -> dict[str, Any]:
    dev = kiosk.devices
    peripherals = dev.health()
    readings = kiosk.readings
    queue_dir = kiosk.cfg.queue.dir
    try:
        data_free = shutil.disk_usage(queue_dir).free
    except OSError:
        data_free = None
    problems = sorted(name for name, ok in peripherals.items() if not ok)
    if kiosk.door_open:
        problems.append("door_open")
    if dev.stub_adapters:
        problems.append("stub_adapters")
    if kiosk.vms_reachable is False:
        problems.append("vms_unreachable")
    budget = kiosk.power.budget
    return {
        "device": {"id": kiosk.cfg.device.id, "site": kiosk.cfg.device.site},
        "version": __version__,
        "status": "degraded" if problems else "ok",
        "problems": problems,
        "simulated": dev.simulated,
        "uptime_s": {"system": _system_uptime(), "agent": round(time.monotonic() - kiosk.started, 1)},
        "temperatures_c": {
            "cpu": readings.cpu_temp_c if readings else None,
            "board": readings.board_temp_c if readings else None,
        },
        "power": {
            "budget": "full" if budget.full else "reduced",
            "source": budget.source,
            "bus_voltage_v": readings.bus_voltage_v if readings else None,
            "bus_current_a": readings.bus_current_a if readings else None,
            "bus_power_w": readings.bus_power_w if readings else None,
            "usb_pd_contract_w": kiosk.power.pd_contract_w,
            "printer_rail_on": kiosk.power.printer_rail_on,
            "alerts_total": kiosk.power.power_alerts,
        },
        "display_on": dev.display.powered,
        "presence": dev.presence.present,
        "door_open": kiosk.door_open,
        "peripherals": peripherals,
        "stub_adapters": dev.stub_adapters,
        "vms_reachable": kiosk.vms_reachable,
        "queue": {
            "depth": len(kiosk.queue),
            "oldest_age_s": kiosk.queue.oldest_age_s(),
            "sent_total": kiosk.queue_sent,
            "rejected_total": kiosk.queue_rejected,
            "expired_total": kiosk.queue_expired,
        },
        "sessions": {"started_total": kiosk.sessions.started_total, "ended_total": dict(kiosk.sessions.counters)},
        "storage": {"data_free_bytes": data_free, "protection": _storage_protection()},
        "ota": {**kiosk.ota.state(), "requested": kiosk.ota.pending},
    }


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def render_prometheus(snap: dict[str, Any]) -> str:
    lines: list[str] = []

    def metric(name: str, kind: str, help_: str, samples: list[tuple[dict[str, str], Any]]) -> None:
        values = [(labels, v) for labels, v in samples if v is not None]
        if not values:
            return
        lines.append(f"# HELP {name} {help_}")
        lines.append(f"# TYPE {name} {kind}")
        for labels, value in values:
            label_txt = ",".join(f'{k}="{_escape(v)}"' for k, v in labels.items())
            lines.append(f"{name}{{{label_txt}}} {float(value):g}" if label_txt else f"{name} {float(value):g}")

    power, queue = snap["power"], snap["queue"]
    metric(
        "foyer_info",
        "gauge",
        "Agent build information.",
        [({"version": snap["version"], "device": snap["device"]["id"]}, 1)],
    )
    metric("foyer_up", "gauge", "1 when all checks pass, 0 when degraded.", [({}, snap["status"] == "ok")])
    metric("foyer_agent_uptime_seconds", "gauge", "Agent uptime.", [({}, snap["uptime_s"]["agent"])])
    metric("foyer_system_uptime_seconds", "gauge", "System uptime.", [({}, snap["uptime_s"]["system"])])
    metric(
        "foyer_temperature_celsius",
        "gauge",
        "Temperatures.",
        [({"sensor": k}, v) for k, v in snap["temperatures_c"].items()],
    )
    metric("foyer_bus_voltage_volts", "gauge", "12 V bus voltage (INA238).", [({}, power["bus_voltage_v"])])
    metric("foyer_bus_current_amperes", "gauge", "12 V bus current (INA238).", [({}, power["bus_current_a"])])
    metric("foyer_bus_power_watts", "gauge", "12 V bus power (INA238).", [({}, power["bus_power_w"])])
    metric("foyer_usb_pd_contract_watts", "gauge", "Negotiated USB-PD contract.", [({}, power["usb_pd_contract_w"])])
    metric(
        "foyer_power_budget_full",
        "gauge",
        "1 when the high-power budget is available.",
        [({"source": power["source"]}, power["budget"] == "full")],
    )
    metric("foyer_printer_rail_on", "gauge", "24 V printer rail state.", [({}, power["printer_rail_on"])])
    metric("foyer_power_alerts_total", "counter", "INA238 alerts.", [({}, power["alerts_total"])])
    metric("foyer_display_on", "gauge", "Display rail state.", [({}, snap["display_on"])])
    metric("foyer_door_open", "gauge", "Service door open.", [({}, snap["door_open"])])
    metric(
        "foyer_peripheral_up",
        "gauge",
        "Peripheral health.",
        [({"peripheral": k}, v) for k, v in snap["peripherals"].items()],
    )
    metric("foyer_vms_reachable", "gauge", "VMS reachable.", [({}, snap["vms_reachable"])])
    metric("foyer_offline_queue_depth", "gauge", "Visits waiting in the offline queue.", [({}, queue["depth"])])
    metric(
        "foyer_offline_queue_oldest_age_seconds",
        "gauge",
        "Age of the oldest queued visit.",
        [({}, queue["oldest_age_s"])],
    )
    metric(
        "foyer_offline_queue_items_total",
        "counter",
        "Offline queue outcomes.",
        [
            ({"outcome": "sent"}, queue["sent_total"]),
            ({"outcome": "rejected"}, queue["rejected_total"]),
            ({"outcome": "expired"}, queue["expired_total"]),
        ],
    )
    metric("foyer_sessions_started_total", "counter", "Sessions started.", [({}, snap["sessions"]["started_total"])])
    metric(
        "foyer_sessions_ended_total",
        "counter",
        "Sessions ended by reason.",
        [({"reason": k}, v) for k, v in snap["sessions"]["ended_total"].items()],
    )
    metric(
        "foyer_data_free_bytes", "gauge", "Free space on the data volume.", [({}, snap["storage"]["data_free_bytes"])]
    )
    return "\n".join(lines) + "\n"


class Heartbeat:
    """POSTs the snapshot to the fleet endpoint; the response may carry commands
    (currently ``{"commands": [{"type": "ota_check"}]}``)."""

    def __init__(self, cfg: MonitoringConfig, identity: IdentityConfig, kiosk: Kiosk) -> None:
        require_tls(cfg.heartbeat_url, "monitoring.heartbeat_url")
        self._cfg, self._kiosk = cfg, kiosk
        self._ssl = client_ssl_context(identity)
        token = resolve_text(cfg.heartbeat_token) if cfg.heartbeat_token else None
        self._headers = {"Authorization": f"Bearer {token}"} if token else {}

    async def beat(self, session: aiohttp.ClientSession) -> None:
        async with session.post(self._cfg.heartbeat_url, json=snapshot(self._kiosk), headers=self._headers) as resp:
            if resp.status >= 300:
                log.warning("heartbeat answered HTTP %d", resp.status)
                return
            body = await resp.json(content_type=None) if resp.content_length else None
        for command in (body or {}).get("commands", []) if isinstance(body, dict) else []:
            if isinstance(command, dict) and command.get("type") == "ota_check":
                log.info("heartbeat: update check requested")
                self._kiosk.ota.request_update("fleet")

    async def run(self) -> None:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout, connector=aiohttp.TCPConnector(ssl=self._ssl)) as session:
            while True:
                try:
                    await self.beat(session)
                except (TimeoutError, aiohttp.ClientError, ValueError) as exc:
                    log.warning("heartbeat failed: %s", type(exc).__name__)
                # Jitter so a fleet does not phone home in lockstep.
                await asyncio.sleep(self._cfg.interval_s * random.uniform(0.9, 1.1))
