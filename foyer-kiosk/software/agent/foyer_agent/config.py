"""Typed agent configuration loaded from YAML.

The same file doubles as the *site configuration* that the OS image places on
the boot partition: the top-level ``os`` section is consumed by the first-boot
provisioning script and ignored here. Secrets are never stored inline; values
such as ``vms.api_key`` are *references* resolved by :mod:`foyer_agent.credentials`.
"""

from __future__ import annotations

import dataclasses
import types
import typing
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

APP_DIR_DEFAULT = str(Path(__file__).resolve().parents[2] / "app")


@dataclass
class DeviceConfig:
    id: str = "foyer-dev"
    site: str = "Lobby"


@dataclass
class ServerConfig:
    host: str = "127.0.0.1"
    port: int = 8080
    app_dir: str = APP_DIR_DEFAULT
    branding_dir: str = "/etc/foyer/branding"


@dataclass
class BrandingConfig:
    company: str = "Northwind"
    welcome_location: str = "Northwind HQ"
    accent: str = "#4F46E5"
    logo: str = ""  # file name inside server.branding_dir, e.g. "logo.svg"


@dataclass
class UiConfig:
    languages: list[str] = field(default_factory=lambda: ["en", "de"])
    default_language: str = "en"
    theme: str = "light"  # light | dark | auto
    idle_timeout_s: int = 45
    idle_warning_s: int = 15
    done_timeout_s: int = 20
    invite_enabled: bool = True
    walkup_enabled: bool = True
    purposes: list[str] = field(default_factory=lambda: ["meeting", "interview", "delivery", "contractor", "other"])


@dataclass
class SessionConfig:
    hard_timeout_s: int = 120
    max_duration_s: int = 900
    scratch_dir: str = "/run/foyer/session"
    max_face_attempts: int = 3


@dataclass
class ConsentConfig:
    privacy_version: str = "2026-01"
    rules_version: str = "2026-01"


@dataclass
class QueueConfig:
    dir: str = "/var/lib/foyer/queue"
    key: str = "cred:foyer-queue-key"
    max_age_h: float = 24.0
    max_items: int = 500
    sync_interval_s: int = 30
    allow_provisional_badge: bool = True


@dataclass
class WebhookConfig:
    url: str = ""
    secret: str = ""  # credential reference used for the HMAC signature


@dataclass
class VmsConfig:
    adapter: str = "rest"
    base_url: str = "https://vms.example.com/api/v1"
    api_key: str = "cred:foyer-vms-api-key"
    auth_header: str = "Authorization"
    auth_scheme: str = "Bearer"
    timeout_s: float = 10.0
    ca_file: str = ""
    endpoints: dict[str, Any] = field(default_factory=dict)
    response_map: dict[str, Any] = field(default_factory=dict)
    webhook: WebhookConfig = field(default_factory=WebhookConfig)


@dataclass
class GpioConfig:
    chip: str = "/dev/gpiochip0"


@dataclass
class QrConfig:
    mode: str = "hid"  # hid | serial
    device: str = "/dev/foyer/qr-kbd"
    serial_port: str = "/dev/foyer/qr-tty"
    baud: int = 115200
    max_length: int = 512


@dataclass
class IdReaderConfig:
    adapter: str = "stub"
    timeout_s: float = 30.0
    options: dict[str, Any] = field(default_factory=dict)


@dataclass
class CameraConfig:
    adapter: str = "picamera2"
    rgb_index: int = 0
    ir_index: int = 1
    still_size: list[int] = field(default_factory=lambda: [1536, 1536])
    preview_size: list[int] = field(default_factory=lambda: [720, 720])
    preview_fps: int = 15
    jpeg_quality: int = 88


@dataclass
class LivenessConfig:
    adapter: str = "stub"
    threshold: float = 0.85
    ir_duty: float = 0.8
    options: dict[str, Any] = field(default_factory=dict)


@dataclass
class PrinterConfig:
    queue: str = "FoyerBadge"
    label: str = "62x100mm"  # 62x100mm | 2.25x4in
    lp_options: list[str] = field(default_factory=lambda: ["media=Custom.62x100mm"])
    slow_lp_options: list[str] = field(default_factory=lambda: ["print-speed=slow"])
    warmup_s: float = 4.0
    rail_hold_s: float = 30.0
    print_photo: bool = True
    font_dir: str = "/usr/share/fonts/opentype/inter"


@dataclass
class TofConfig:
    enter_mm: int = 1200
    exit_mm: int = 1600
    enter_samples: int = 3
    hold_s: float = 8.0
    roi: list[int] = field(default_factory=lambda: [8, 8])  # SPADs (4..16) - narrows the field of view
    roi_centre: int = 199
    timing_budget_ms: int = 50
    period_ms: int = 100


@dataclass
class LightbarConfig:
    device: str = "/dev/leds0"
    leds: int = 24
    max_brightness: float = 0.6
    fps: int = 30


@dataclass
class IrPwmConfig:
    # foyer-hw-setup.service exports RP1 PWM0 channel 0 (GPIO12) and links its chip here.
    chip: str = "/run/foyer-hw/ir-pwm"
    channel: int = 0
    period_ns: int = 50_000


@dataclass
class I2cConfig:
    bus: int = 1
    shunt_ohm: float = 0.005
    max_current_a: float = 8.0
    power_alert_w: float = 65.0
    undervolt_v: float = 10.8


@dataclass
class PowerConfig:
    # Voltage of the only STUSB4500 sink PDO allowed to request >= 3 A (carrier NVM).
    usbc_contract_volts: float = 20.0
    usbc_high_power_w: float = 60.0


@dataclass
class DisplayConfig:
    sleep_after_s: int = 600
    brightness: int = 100
    ddc_brightness: bool = True


@dataclass
class TtsConfig:
    engine: str = "espeak-ng"  # espeak-ng | browser | off
    voices: dict[str, str] = field(default_factory=lambda: {"en": "en-gb", "de": "de"})
    rate_wpm: int = 160


@dataclass
class HardwareConfig:
    sim: bool = False
    gpio: GpioConfig = field(default_factory=GpioConfig)
    qr: QrConfig = field(default_factory=QrConfig)
    id_reader: IdReaderConfig = field(default_factory=IdReaderConfig)
    camera: CameraConfig = field(default_factory=CameraConfig)
    liveness: LivenessConfig = field(default_factory=LivenessConfig)
    printer: PrinterConfig = field(default_factory=PrinterConfig)
    tof: TofConfig = field(default_factory=TofConfig)
    lightbar: LightbarConfig = field(default_factory=LightbarConfig)
    ir_pwm: IrPwmConfig = field(default_factory=IrPwmConfig)
    i2c: I2cConfig = field(default_factory=I2cConfig)
    display: DisplayConfig = field(default_factory=DisplayConfig)
    tts: TtsConfig = field(default_factory=TtsConfig)
    power: PowerConfig = field(default_factory=PowerConfig)


@dataclass
class IdentityConfig:
    """Client certificate for mTLS to the VMS and the fleet endpoint. On the
    kiosk the private key lives in the ATECC608B; ``client_key`` is then a PEM
    file wrapping its PKCS#11 URI, loaded by OpenSSL's pkcs11-provider."""

    client_cert: str = ""
    client_key: str = ""


@dataclass
class CallConfig:
    adapter: str = "stub"  # stub | webrtc
    url: str = ""  # webrtc: page opened in the call overlay; {device} is substituted


@dataclass
class MonitoringConfig:
    heartbeat_url: str = ""
    heartbeat_token: str = "cred:foyer-heartbeat-token"
    interval_s: int = 60
    metrics_listen: str = ""  # e.g. "0.0.0.0:9101" exposes /metrics and /healthz only


@dataclass
class OtaConfig:
    request_file: str = "/run/foyer-ota/request"
    state_file: str = "/var/lib/foyer-ota/state.json"


@dataclass
class Config:
    device: DeviceConfig = field(default_factory=DeviceConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    branding: BrandingConfig = field(default_factory=BrandingConfig)
    ui: UiConfig = field(default_factory=UiConfig)
    session: SessionConfig = field(default_factory=SessionConfig)
    consent: ConsentConfig = field(default_factory=ConsentConfig)
    queue: QueueConfig = field(default_factory=QueueConfig)
    vms: VmsConfig = field(default_factory=VmsConfig)
    hardware: HardwareConfig = field(default_factory=HardwareConfig)
    identity: IdentityConfig = field(default_factory=IdentityConfig)
    call: CallConfig = field(default_factory=CallConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    ota: OtaConfig = field(default_factory=OtaConfig)


IGNORED_SECTIONS = frozenset({"os"})


class ConfigError(ValueError):
    pass


def _coerce(tp: Any, value: Any, where: str) -> Any:
    origin = typing.get_origin(tp)
    if dataclasses.is_dataclass(tp):
        if not isinstance(value, dict):
            raise ConfigError(f"{where}: expected a mapping")
        return _build(tp, value, where)
    if origin is list:
        if not isinstance(value, list):
            raise ConfigError(f"{where}: expected a list")
        (item_tp,) = typing.get_args(tp)
        return [_coerce(item_tp, v, f"{where}[{i}]") for i, v in enumerate(value)]
    if origin is dict:
        if not isinstance(value, dict):
            raise ConfigError(f"{where}: expected a mapping")
        return dict(value)
    if origin in (typing.Union, types.UnionType):
        return value
    if tp is Any:
        return value
    if tp is float and isinstance(value, int) and not isinstance(value, bool):
        return float(value)
    if tp is bool and not isinstance(value, bool):
        raise ConfigError(f"{where}: expected true/false")
    if not isinstance(value, tp):
        raise ConfigError(f"{where}: expected {tp.__name__}, got {type(value).__name__}")
    return value


def _build(cls: type, data: dict[str, Any], where: str = "") -> Any:
    hints = typing.get_type_hints(cls)
    known = {f.name for f in dataclasses.fields(cls)}
    unknown = set(data) - known - (IGNORED_SECTIONS if cls is Config else set())
    if unknown:
        raise ConfigError(f"{where or 'config'}: unknown key(s) {sorted(unknown)}")
    kwargs = {
        name: _coerce(hints[name], value, f"{where}.{name}".lstrip("."))
        for name, value in data.items()
        if name in known
    }
    return cls(**kwargs)


def load_config(path: str | Path | None) -> Config:
    """Load and validate a YAML config; ``None`` yields the defaults."""
    if path is None:
        return Config()
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ConfigError("config root must be a mapping")
    cfg: Config = _build(Config, raw)
    _validate(cfg)
    return cfg


def _validate(cfg: Config) -> None:
    if cfg.ui.default_language not in cfg.ui.languages:
        raise ConfigError("ui.default_language must be one of ui.languages")
    if cfg.ui.theme not in {"light", "dark", "auto"}:
        raise ConfigError("ui.theme must be light, dark or auto")
    if not 0.0 < cfg.hardware.liveness.threshold <= 1.0:
        raise ConfigError("hardware.liveness.threshold must be in (0, 1]")
    if cfg.hardware.printer.label not in {"62x100mm", "2.25x4in"}:
        raise ConfigError("hardware.printer.label must be 62x100mm or 2.25x4in")
    if cfg.queue.max_age_h <= 0:
        raise ConfigError("queue.max_age_h must be positive")
