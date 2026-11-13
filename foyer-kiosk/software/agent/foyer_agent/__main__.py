"""Entry point: ``python -m foyer_agent [--config FILE] [--sim]``."""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import dataclasses
import logging
import signal
import tempfile
from pathlib import Path

from aiohttp import web

from . import __version__
from .config import Config, load_config
from .credentials import resolve_secret
from .events import EventBus
from .hal import build_devices
from .kiosk import Kiosk
from .logging_setup import setup_logging
from .monitoring import Heartbeat
from .offline_queue import OfflineQueue
from .ota import OtaClient
from .reception import build_call
from .sdnotify import notify, watchdog_loop
from .server import create_app, create_metrics_app
from .sim import SimController, ensure_sim_secrets, sim_config, start_mock_vms
from .vms import build_vms

log = logging.getLogger("foyer_agent")

DEFAULT_CONFIG = Path("/etc/foyer/foyer.yaml")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="foyer_agent", description="Foyer VK-1 device agent")
    parser.add_argument("--config", type=Path, help=f"YAML config (default {DEFAULT_CONFIG} if present)")
    parser.add_argument("--sim", action="store_true", help="simulate all hardware and start a mock VMS")
    parser.add_argument("--workdir", type=Path, help="simulation state directory (default: a temp dir)")
    parser.add_argument("--port", type=int, help="override server.port")
    parser.add_argument("--log-level", default="INFO")
    parser.add_argument("--version", action="version", version=__version__)
    return parser.parse_args(argv)


async def _serve(app: web.Application, host: str, port: int) -> web.AppRunner:
    runner = web.AppRunner(app, access_log=None)
    await runner.setup()
    await web.TCPSite(runner, host, port).start()
    return runner


async def run(args: argparse.Namespace) -> None:
    config_path = args.config or (DEFAULT_CONFIG if DEFAULT_CONFIG.exists() else None)
    cfg: Config = load_config(config_path)
    if args.port:
        cfg = dataclasses.replace(cfg, server=dataclasses.replace(cfg.server, port=args.port))

    runners: list[web.AppRunner] = []
    sim_controller: SimController | None = None
    mock_state = None
    if args.sim:
        ensure_sim_secrets()
        mock_runner, vms_port, mock_state = await start_mock_vms()
        runners.append(mock_runner)
        workdir = args.workdir or Path(tempfile.mkdtemp(prefix="foyer-sim-"))
        cfg = sim_config(cfg, workdir, vms_port)

    queue_key = resolve_secret(cfg.queue.key)
    if queue_key is None:
        raise SystemExit("queue.key must reference the offline queue key")

    bus = EventBus()
    devices = build_devices(cfg.hardware, cfg.branding.accent, Path(cfg.session.scratch_dir))
    kiosk = Kiosk(
        cfg,
        devices,
        build_vms(cfg.vms, cfg.identity),
        OfflineQueue(Path(cfg.queue.dir), queue_key, cfg.queue.max_age_h * 3600, cfg.queue.max_items),
        bus,
        OtaClient(cfg.ota.request_file, cfg.ota.state_file),
        build_call(cfg.call, cfg.device.id, bus),
    )
    del queue_key
    if mock_state is not None:
        sim_controller = SimController(devices, mock_state)

    runners.append(await _serve(create_app(kiosk, sim_controller), cfg.server.host, cfg.server.port))
    if cfg.monitoring.metrics_listen:
        host, _, port = cfg.monitoring.metrics_listen.rpartition(":")
        runners.append(await _serve(create_metrics_app(kiosk), host, int(port)))

    jobs = [kiosk.run(), watchdog_loop()]
    if cfg.monitoring.heartbeat_url:
        jobs.append(Heartbeat(cfg.monitoring, cfg.identity, kiosk).run())
    main = asyncio.ensure_future(asyncio.gather(*jobs))

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, stop.set)

    url = f"http://{cfg.server.host}:{cfg.server.port}/"
    log.info("foyer-agent %s ready on %s%s", __version__, url, " (simulation)" if args.sim else "")
    if args.sim:
        log.info("simulator controls: %s?simpanel=1", url)
    notify("READY=1")
    try:
        stopper = asyncio.ensure_future(stop.wait())
        await asyncio.wait({main, stopper}, return_when=asyncio.FIRST_COMPLETED)
        if main.done():
            main.result()  # surface a crashed subsystem (systemd restarts us)
    finally:
        notify("STOPPING=1")
        main.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await main
        await kiosk.close()  # wipes any open session
        for runner in reversed(runners):
            await runner.cleanup()


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    setup_logging(args.log_level)
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
