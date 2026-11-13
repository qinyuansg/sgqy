"""Hardware abstraction layer: real drivers for the FYR-CB-01 carrier plus simulators."""

from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, TypeVar

from ..config import HardwareConfig
from .camera import Camera, Picamera2Camera, StubCamera
from .display import Display
from .gpio import GpioController, GpiodController, SimGpioController
from .id_reader import IdReader, StubIdReader
from .lightbar import LightBar, LightbarWriter, PioLedsWriter, SimWriter
from .liveness import LivenessChecker, StubLiveness
from .pins import ALL_PINS
from .printer import BadgePrinter, CupsPrinter, SimPrinter
from .pwm import IrIlluminator, SimIlluminator, SysfsPwmIlluminator
from .qr_scanner import HidWedgeScanner, QrScanner, SerialScanner, SimScanner
from .sensors import I2cSensorHub, SensorHub, SimSensorHub
from .tof import PresenceDetector, PresenceSensor, SimPresenceSensor, Vl53l1xPresenceSensor
from .tts import EspeakSpeaker, SilentSpeaker, Speaker

log = logging.getLogger(__name__)

T = TypeVar("T")

# Vendor adapters register here (see id_reader.py / liveness.py for the contracts).
ID_READERS: dict[str, Callable[[Path, dict[str, Any]], IdReader]] = {
    "stub": lambda scratch, _opts: StubIdReader(scratch),
}
LIVENESS: dict[str, Callable[[float, dict[str, Any]], LivenessChecker]] = {
    "stub": lambda threshold, _opts: StubLiveness(threshold),
}


class UnavailableCamera(Camera):
    """Stands in for a camera that failed to initialise; every capture fails."""

    def __init__(self) -> None:
        super().__init__(quality=0)
        self.healthy = False

    async def _grab(self, still: bool) -> Any:
        raise OSError("camera unavailable")


@dataclass
class Devices:
    gpio: GpioController
    lightbar: LightBar
    ir: IrIlluminator
    sensors: SensorHub
    presence: PresenceSensor
    qr: QrScanner
    id_reader: IdReader
    rgb_camera: Camera
    ir_camera: Camera
    liveness: LivenessChecker
    printer: BadgePrinter
    display: Display
    speaker: Speaker
    simulated: bool
    stub_adapters: list[str] = field(default_factory=list)

    def runners(self) -> list[Coroutine[Any, Any, None]]:
        return [self.lightbar.run(), self.presence.run(), self.qr.run()]

    def health(self) -> dict[str, bool]:
        return {
            "lightbar": self.lightbar.healthy,
            "tof": self.presence.healthy,
            "qr_scanner": self.qr.healthy,
            "id_reader": self.id_reader.healthy,
            "camera_rgb": self.rgb_camera.healthy,
            "camera_ir": self.ir_camera.healthy,
            "liveness": self.liveness.healthy,
            "printer": self.printer.healthy,
        }

    def close(self) -> None:
        for closer in (self.rgb_camera.close, self.ir_camera.close, self.sensors.close, self.gpio.close):
            try:
                closer()
            except Exception:
                log.exception("device close failed")


def _attempt(what: str, build: Callable[[], T], fallback: Callable[[], T]) -> T:
    try:
        return build()
    except Exception as exc:  # noqa: BLE001 - any driver failure degrades to the fallback
        log.error("%s unavailable (%s); continuing degraded", what, type(exc).__name__)
        return fallback()


def build_devices(cfg: HardwareConfig, accent: str, scratch_dir: Path) -> Devices:
    if cfg.sim:
        return build_sim_devices(cfg, accent, scratch_dir)

    gpio = GpiodController(cfg.gpio.chip, ALL_PINS)
    lb = cfg.lightbar
    writer: LightbarWriter = _attempt("lightbar", lambda: PioLedsWriter(lb.device), SimWriter)
    lightbar = LightBar(writer, lb.leds, accent, lb.max_brightness, lb.fps)
    lightbar.healthy = not isinstance(writer, SimWriter)

    ir = _attempt(
        "ir illuminator",
        lambda: SysfsPwmIlluminator(cfg.ir_pwm.chip, cfg.ir_pwm.channel, cfg.ir_pwm.period_ns),
        SimIlluminator,
    )
    t = cfg.tof
    presence = Vl53l1xPresenceSensor(
        gpio,
        cfg.i2c.bus,
        PresenceDetector(t.enter_mm, t.exit_mm, t.enter_samples, t.hold_s),
        (t.roi[0], t.roi[1]),
        t.roi_centre,
        t.timing_budget_ms,
        t.period_ms,
    )
    qr: QrScanner
    if cfg.qr.mode == "serial":
        qr = SerialScanner(cfg.qr.serial_port, cfg.qr.baud, cfg.qr.max_length)
    else:
        qr = HidWedgeScanner(cfg.qr.device, cfg.qr.max_length)

    c = cfg.camera
    rgb = _attempt(
        "camera 0",
        lambda: Picamera2Camera(c.rgb_index, c.still_size, c.preview_size, c.jpeg_quality),
        UnavailableCamera,
    )
    ir_cam = _attempt(
        "camera 1", lambda: Picamera2Camera(c.ir_index, c.still_size, c.preview_size, c.jpeg_quality), UnavailableCamera
    )
    stubs = [n for n, a in (("id_reader", cfg.id_reader.adapter), ("liveness", cfg.liveness.adapter)) if a == "stub"]
    for name in stubs:
        log.warning("%s uses the STUB adapter on real hardware - not for production", name)

    speaker: Speaker = (
        EspeakSpeaker(gpio, cfg.tts.voices, cfg.tts.rate_wpm) if cfg.tts.engine == "espeak-ng" else SilentSpeaker()
    )
    i2c = cfg.i2c
    return Devices(
        gpio=gpio,
        lightbar=lightbar,
        ir=ir,
        sensors=I2cSensorHub(i2c.bus, i2c.shunt_ohm, i2c.max_current_a, i2c.power_alert_w, i2c.undervolt_v),
        presence=presence,
        qr=qr,
        id_reader=ID_READERS[cfg.id_reader.adapter](scratch_dir, cfg.id_reader.options),
        rgb_camera=rgb,
        ir_camera=ir_cam,
        liveness=LIVENESS[cfg.liveness.adapter](cfg.liveness.threshold, cfg.liveness.options),
        printer=CupsPrinter(cfg.printer.queue, cfg.printer.lp_options, cfg.printer.slow_lp_options),
        display=Display(gpio, cfg.display.brightness, cfg.display.ddc_brightness),
        speaker=speaker,
        simulated=False,
        stub_adapters=stubs,
    )


def build_sim_devices(cfg: HardwareConfig, accent: str, scratch_dir: Path) -> Devices:
    gpio = SimGpioController(ALL_PINS)
    return Devices(
        gpio=gpio,
        lightbar=LightBar(SimWriter(), cfg.lightbar.leds, accent, cfg.lightbar.max_brightness, cfg.lightbar.fps),
        ir=SimIlluminator(),
        sensors=SimSensorHub(),
        presence=SimPresenceSensor(),
        qr=SimScanner(cfg.qr.max_length),
        id_reader=StubIdReader(scratch_dir),
        rgb_camera=StubCamera(),
        ir_camera=StubCamera(infrared=True),
        liveness=StubLiveness(cfg.liveness.threshold),
        printer=SimPrinter(),
        display=Display(gpio, cfg.display.brightness, use_ddc=False),
        speaker=SilentSpeaker(),
        simulated=True,
    )
