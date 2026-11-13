"""Device-level logic that does not need hardware: MRZ, QR wedge decoding,
ToF presence, sensor conversions, log redaction, configuration."""

import datetime as dt
import logging
from pathlib import Path

import pytest

from foyer_agent.config import ConfigError, load_config
from foyer_agent.hal.mrz import MrzError, build_td3, check_digit, parse_mrz
from foyer_agent.hal.qr_scanner import EV_KEY, KEY_ENTER, KEY_LEFTSHIFT, KeyboardWedgeDecoder, sanitize
from foyer_agent.hal.sensors import Ina238Scale, rdo_operating_current_a, tmp1075_celsius
from foyer_agent.hal.tof import _DEFAULT_CONFIG, PresenceDetector
from foyer_agent.logging_setup import RedactingFilter, redact

from .conftest import Clock

EXAMPLE_CONFIG = Path(__file__).resolve().parents[1] / "config" / "foyer.example.yaml"

# ICAO 9303 part 5 TD1 specimen
TD1 = ["I<UTOD231458907<<<<<<<<<<<<<<<", "7408122F1204159UTO<<<<<<<<<<<6", "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"]


def test_mrz_td3_and_td1() -> None:
    lines = build_td3(
        issuing_state="UTO",
        surname="Eriksson",
        given_names="Anna Maria",
        document_number="L898902C3",
        nationality="UTO",
        birth="740812",
        sex="F",
        expiry="341231",
    )
    assert lines[1] == "L898902C36UTO7408122F3412318<<<<<<<<<<<<<<06"
    td3 = parse_mrz(lines, today=dt.date(2026, 11, 13))
    assert (td3.surname, td3.given_names, td3.document_type) == ("ERIKSSON", "ANNA MARIA", "P")
    assert td3.birth_date == dt.date(1974, 8, 12) and td3.expiry_date == dt.date(2034, 12, 31)
    td1 = parse_mrz(TD1, today=dt.date(2026, 11, 13))
    assert td1.document_number == "D23145890" and td1.expired(dt.date(2026, 11, 13))
    assert check_digit("D23145890") == "7"


def test_mrz_rejects_bad_check_digit() -> None:
    bad = TD1.copy()
    bad[1] = "7408123F1204159UTO<<<<<<<<<<<6"
    with pytest.raises(MrzError):
        parse_mrz(bad)


def test_keyboard_wedge_decoder_with_shift() -> None:
    decoder = KeyboardWedgeDecoder()
    out = []
    # "I" (shift+i), "n", "v", "-" then Enter, including key releases and autorepeat noise
    for code, value in [(KEY_LEFTSHIFT, 1), (23, 1), (23, 0), (KEY_LEFTSHIFT, 0), (49, 1), (49, 2), (47, 1), (12, 1)]:
        assert decoder.feed(EV_KEY, code, value) is None
    out.append(decoder.feed(EV_KEY, KEY_ENTER, 1))
    assert out == ["Inv-"]
    assert sanitize("  INV-7KQ2M9 ", 64) == "INV-7KQ2M9"
    assert sanitize("x" * 65, 64) is None and sanitize("bad\x07", 64) is None and sanitize("é", 64) is None


def test_presence_detector_hysteresis(clock: Clock) -> None:
    detector = PresenceDetector(enter_mm=1200, exit_mm=1600, enter_samples=3, hold_s=5, clock=clock)
    assert [detector.update(d) for d in (1000, None, 1100, 1150)] == [None, None, None, None]
    assert detector.update(1000) is True
    clock.advance(4)
    assert detector.update(1500) is None  # still within exit distance: refreshes hold
    clock.advance(4.9)
    assert detector.update(None) is None
    clock.advance(0.2)
    assert detector.update(2500) is False


def test_vl53l1x_default_config_is_patched_for_active_low_int() -> None:
    assert len(_DEFAULT_CONFIG) == 0x87 - 0x2D + 1
    assert _DEFAULT_CONFIG[0x30 - 0x2D] == 0x11  # GPIO_HV_MUX__CTRL: active-low data-ready
    assert _DEFAULT_CONFIG[0x46 - 0x2D] == 0x20  # interrupt on new sample


def test_sensor_conversions() -> None:
    assert tmp1075_celsius(0x1900) == 25.0
    assert tmp1075_celsius(0xFF00) == -1.0
    scale = Ina238Scale(shunt_ohm=0.005, max_current_a=8.0)
    assert scale.bus_volts(3840) == pytest.approx(12.0)
    assert scale.amps(0x4000) == pytest.approx(4.0)
    assert scale.amps(0xC000) == pytest.approx(-4.0)
    rdo = (3 << 28) | (300 << 10) | 300  # position 3, 3.00 A
    assert rdo_operating_current_a(rdo) == pytest.approx(3.0)
    assert rdo_operating_current_a(0) is None


def test_redaction() -> None:
    text = "visitor anna@example.com P<UTOERIKSSON<<ANNA<MARIA<<<<<<<< tel +49 170 1234567 " + "A" * 80
    out = redact(text)
    for leaked in ("anna@", "ERIKSSON", "1234567", "A" * 80):
        assert leaked not in out
    record = logging.LogRecord("x", logging.INFO, __file__, 1, "mail %s", ("x@y.org",), None)
    RedactingFilter().filter(record)
    assert record.getMessage() == "mail <email>"


def test_config_validation(tmp_path: Path) -> None:
    cfg = load_config(EXAMPLE_CONFIG)
    assert cfg.hardware.lightbar.device == "/dev/leds0" and cfg.vms.base_url.startswith("https://")
    bad = tmp_path / "bad.yaml"
    bad.write_text("ui:\n  thme: dark\n")
    with pytest.raises(ConfigError, match="thme"):
        load_config(bad)
    bad.write_text("hardware:\n  sim: 'yes'\n")
    with pytest.raises(ConfigError):
        load_config(bad)
