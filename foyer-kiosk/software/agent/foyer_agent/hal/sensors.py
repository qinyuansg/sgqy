"""Carrier monitoring over I2C1 (``/dev/i2c-1``), contract rev B.

* TMP1075 board temperature @0x48
* INA238 power monitor on ``+12V_BUS`` @0x40 (ALERT -> ``PWR_ALERT_n``)
* STUSB4500 USB-PD sink @0x28 (ALERT -> ``PD_ALERT_n``): negotiated contract
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import math
import time
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from .i2c import I2cDevice

log = logging.getLogger(__name__)

TMP1075_ADDR = 0x48
INA238_ADDR = 0x40
STUSB4500_ADDR = 0x28
CPU_THERMAL = Path("/sys/class/thermal/thermal_zone0/temp")

# INA238 registers
_INA_SHUNT_CAL, _INA_VBUS, _INA_CURRENT, _INA_POWER = 0x02, 0x05, 0x07, 0x08
_INA_DIAG_ALRT, _INA_BUVL, _INA_PWR_LIMIT = 0x0B, 0x0F, 0x11
# STUSB4500: RDO_REG_STATUS_0..3 (little endian), the active Request Data Object
_STUSB_RDO = 0x91


@dataclass(frozen=True)
class SensorReadings:
    cpu_temp_c: float | None
    board_temp_c: float | None
    bus_voltage_v: float | None
    bus_current_a: float | None
    bus_power_w: float | None
    pd_contract_current_a: float | None


def tmp1075_celsius(raw: int) -> float:
    """TMP1075 temperature register: 12-bit two's complement, left-justified, 0.0625 °C/LSB."""
    value = raw >> 4
    if value & 0x800:
        value -= 1 << 12
    return value * 0.0625


def rdo_operating_current_a(rdo: int) -> float | None:
    """Operating current of a fixed-supply RDO (bits 19:10, 10 mA units); None if no contract."""
    if (rdo >> 28) & 0x7 == 0:  # object position 0 = no explicit contract
        return None
    return ((rdo >> 10) & 0x3FF) * 0.01


class Ina238Scale:
    """INA238 scaling for ADCRANGE = 0 (±163.84 mV shunt range)."""

    def __init__(self, shunt_ohm: float, max_current_a: float) -> None:
        self.current_lsb = max_current_a / 2**15
        self.shunt_cal = round(819.2e6 * self.current_lsb * shunt_ohm)

    @staticmethod
    def bus_volts(raw: int) -> float:
        return raw * 3.125e-3

    @staticmethod
    def bus_raw(volts: float) -> int:
        return round(volts / 3.125e-3)

    def amps(self, raw: int) -> float:
        if raw & 0x8000:
            raw -= 1 << 16
        return raw * self.current_lsb

    def watts(self, raw24: int) -> float:
        return 0.2 * self.current_lsb * raw24

    def power_limit_raw(self, watts: float) -> int:
        """POWER_LIMIT compares against the 16 MSBs of the 24-bit POWER register."""
        return min(0xFFFF, round(watts / (0.2 * self.current_lsb) / 256))


def read_cpu_temp() -> float | None:
    try:
        return int(CPU_THERMAL.read_text()) / 1000
    except (OSError, ValueError):
        return None


class SensorHub(ABC):
    @abstractmethod
    async def read(self) -> SensorReadings: ...

    @abstractmethod
    async def power_alert_flags(self) -> int | None:
        """INA238 DIAG_ALRT flags after a ``PWR_ALERT_n`` edge."""

    def close(self) -> None:
        """Release devices."""


class I2cSensorHub(SensorHub):
    def __init__(self, bus: int, shunt_ohm: float, max_current_a: float, alert_w: float, undervolt_v: float) -> None:
        self._bus = bus
        self._scale = Ina238Scale(shunt_ohm, max_current_a)
        self._alert_w, self._undervolt_v = alert_w, undervolt_v
        self._devices: dict[int, I2cDevice] = {}

    def _device(self, address: int) -> I2cDevice:
        if address not in self._devices:
            device = I2cDevice(self._bus, address)
            if address == INA238_ADDR:
                device.write(_INA_SHUNT_CAL, self._scale.shunt_cal.to_bytes(2, "big"))
                device.write(_INA_PWR_LIMIT, self._scale.power_limit_raw(self._alert_w).to_bytes(2, "big"))
                device.write(_INA_BUVL, self._scale.bus_raw(self._undervolt_v).to_bytes(2, "big"))
            self._devices[address] = device
        return self._devices[address]

    def _guarded(self, address: int, fn: Callable[[I2cDevice], float | None]) -> float | None:
        try:
            return fn(self._device(address))
        except OSError:
            # Absent or NAKing: report None so health shows it; reconfigure on next success.
            device = self._devices.pop(address, None)
            if device is not None:
                device.close()
            return None

    def _read_sync(self) -> SensorReadings:
        s = self._scale
        return SensorReadings(
            cpu_temp_c=read_cpu_temp(),
            board_temp_c=self._guarded(TMP1075_ADDR, lambda d: tmp1075_celsius(d.read_uint(0x00, 2))),
            bus_voltage_v=self._guarded(INA238_ADDR, lambda d: s.bus_volts(d.read_uint(_INA_VBUS, 2))),
            bus_current_a=self._guarded(INA238_ADDR, lambda d: s.amps(d.read_uint(_INA_CURRENT, 2))),
            bus_power_w=self._guarded(INA238_ADDR, lambda d: s.watts(d.read_uint(_INA_POWER, 3))),
            pd_contract_current_a=self._guarded(
                STUSB4500_ADDR, lambda d: rdo_operating_current_a(d.read_uint(_STUSB_RDO, 4, "little"))
            ),
        )

    async def read(self) -> SensorReadings:
        return await asyncio.to_thread(self._read_sync)

    async def power_alert_flags(self) -> int | None:
        value = await asyncio.to_thread(self._guarded, INA238_ADDR, lambda d: float(d.read_uint(_INA_DIAG_ALRT, 2)))
        return int(value) if value is not None else None

    def close(self) -> None:
        for device in self._devices.values():
            with contextlib.suppress(OSError):
                device.close()
        self._devices.clear()


class SimSensorHub(SensorHub):
    def __init__(self) -> None:
        self.pd_contract_current_a: float | None = None

    async def read(self) -> SensorReadings:
        t = time.monotonic()
        power = 9.5 + 1.5 * math.sin(t / 30)
        return SensorReadings(
            cpu_temp_c=round(48 + 4 * math.sin(t / 90), 1),
            board_temp_c=round(36 + 2 * math.sin(t / 120), 2),
            bus_voltage_v=12.0,
            bus_current_a=round(power / 12.0, 3),
            bus_power_w=round(power, 2),
            pd_contract_current_a=self.pd_contract_current_a,
        )

    async def power_alert_flags(self) -> int | None:
        return 0
