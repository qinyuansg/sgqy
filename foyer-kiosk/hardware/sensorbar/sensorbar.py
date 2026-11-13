"""FYR-SB-01 — Foyer VK-1 sensor bar (top band behind the front glass).

Carries the approach (ToF) sensor, the two I2S microphones, the 850 nm IR
flood for the liveness camera, and the 24-LED status light bar. Connects to
carrier J16 with a 15-way JST GH cable (pinout in interface-contract.md).

Orientation: the board sits parallel to the front glass with its TOP side
facing the visitor. Microphones are bottom-port parts mounted on the BOTTOM
side so their acoustic port (through the PCB) faces the front grille.
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from eda.circuit import Circuit  # noqa: E402

GENERIC = "Any (to spec)"
N_LEDS = 24
SHEETS = {"sensors": "Approach sensor and microphones", "ir": "850 nm IR flood", "leds": "Status light bar"}


def build() -> Circuit:
    c = Circuit("sensorbar", "FYR-SB-01 Foyer VK-1 sensor bar")
    n = c.net
    GND, V5, V3 = n("GND", "Power"), n("+5V", "Power"), n("+3V3", "Power")

    c.group = "sensors"
    j = c.part("J", "TO CARRIER", "Connector_JST:JST_GH_SM15B-GHS-TB_1x15-1MP_P1.25mm_Horizontal",
               pins={i: f"P{i}" for i in range(1, 16)} | {"MP": "MP"}, ref="J1", mpn="SM15B-GHS-TB", mfr="JST",
               desc="Cable to carrier J16 (15-pin GH)")
    j.wire({"P1": V5, "P2": V5, "P3": GND, "P4": GND, "P5": V3, "P6": n("SDA"), "P7": n("SCL"),
            "P8": n("TOF_INT_n"), "P9": n("TOF_XSHUT"), "P10": n("IR_PWM"), "P11": n("LED_DIN"),
            "P12": n("BCLK"), "P13": n("LRCLK"), "P14": n("MIC_SD"), "P15": GND, "MP": GND})
    c.C("22u", V5, GND, size="0805", volt="10V", near=j, mfr=GENERIC)
    c.C("10u", V3, GND, size="0805", volt="10V", near=j, mfr=GENERIC)

    tof = c.part("U", "VL53L1X", "Sensor_Distance:ST_VL53L1x", symbol="K7:Sensor_Distance:VL53L1CXV0FY1", ref="U1",
                 mpn="VL53L1CXV0FY/1", mfr="STMicroelectronics", desc="ToF ranging sensor 4 m, I2C @0x29")
    tof.wire({"AVDDVCSEL": V3, "AVDD": V3, "AVSSVCSEL": GND, "GND": GND, "XSHUT": n("TOF_XSHUT"),
              "GPIO1": n("TOF_INT_n"), "SDA": n("SDA"), "SCL": n("SCL")}).nc("DNC")
    c.C("4.7u", V3, GND, size="0603", volt="10V", near=tof, mfr=GENERIC)
    c.C("100n", V3, GND, near=tof, mfr=GENERIC)

    for ref, lr in (("MK1", GND), ("MK2", V3)):
        mk = c.part("MK", "ICS-43434", "Sensor_Audio:InvenSense_ICS-43434-6_3.5x2.65mm", symbol="FY:ICS-43434",
                    ref=ref, mpn="ICS-43434", mfr="TDK InvenSense",
                    desc=f"I2S MEMS microphone, bottom port ({'left' if lr is GND else 'right'} channel)")
        mk.wire({"VDD": V3, "GND": GND, "SCK": n("BCLK"), "WS": n("LRCLK"), "SD": n("MIC_SD"), "LR": lr})
        c.C("100n", V3, GND, near=mk, mfr=GENERIC)
    c.R("100k", n("MIC_SD"), GND, near=tof, mfr=GENERIC, desc="Resistor 100k 0402 (I2S SD bus keeper)")

    c.group = "ir"
    drv = c.part("U", "AL8860", "Package_TO_SOT_SMD:TSOT-23-5", symbol="K7:Driver_LED:AL8860WT", ref="U2",
                 mpn="AL8860WT-7", mfr="Diodes Inc", desc="40 V 1.5 A buck LED driver (IR flood)")
    sw, setn, k1 = n("IR_SW", "Power"), n("IR_SET", "Power"), n("IR_K1", "Power")
    drv.wire({"VIN": V5, "GND": GND, "SW": sw, "SET": setn, "CTRL": n("IR_PWM")})
    c.part("R", "0.15", "Resistor_SMD:R_1206_3216Metric", pins={1: "1", 2: "2"}, near=drv, mpn="WSL1206R1500FEA",
           mfr="Vishay Dale", desc="Sense 0.15 Ω 1% 1206 (I_LED = 0.1 V / 0.15 Ω ≈ 670 mA)").wire({1: V5, 2: setn})
    c.R("10k", n("IR_PWM"), GND, near=drv, mfr=GENERIC, desc="Resistor 10k 0402 (IR off by default)")
    led_a = c.part("D", "SFH 4725AS", "Foyer:OSRAM_OSLON_Black_SFH4725AS_PROVISIONAL",
                   pins={1: "A", 2: "K", 3: "TH"}, ref="D1", mpn="SFH 4725AS A01", mfr="ams OSRAM",
                   desc="850 nm IR emitter, OSLON Black", near=drv,
                   provisional="Land pattern to be checked against the ams OSRAM drawing")
    led_a.wire({"A": setn, "K": k1, "TH": GND})
    led_b = c.part("D", "SFH 4725AS", "Foyer:OSRAM_OSLON_Black_SFH4725AS_PROVISIONAL",
                   pins={1: "A", 2: "K", 3: "TH"}, ref="D2", mpn="SFH 4725AS A01", mfr="ams OSRAM",
                   desc="850 nm IR emitter, OSLON Black", near=drv,
                   provisional="Land pattern to be checked against the ams OSRAM drawing")
    led_b.wire({"A": k1, "K": n("IR_LK", "Power"), "TH": GND})
    c.part("L", "33uH", "Inductor_SMD:L_Coilcraft_XAL5050-XXX", pins={1: "1", 2: "2"}, near=drv,
           mpn="XAL5050-333MEB", mfr="Coilcraft", desc="Power inductor 33 µH").wire({1: n("IR_LK"), 2: sw})
    c.part("D", "B240A", "Diode_SMD:D_SMA", pins={1: "K", 2: "A"}, near=drv, mpn="B240A-13-F", mfr="Diodes Inc",
           desc="Schottky 40 V 2 A (freewheel)").wire({"K": V5, "A": sw})
    c.C("4.7u", V5, GND, size="0805", volt="10V", near=drv, mfr=GENERIC)
    c.C("100n", V5, GND, near=drv, mfr=GENERIC)

    c.group = "leds"
    prev = n("LED_DIN")
    first = None
    for i in range(1, N_LEDS + 1):
        dout = n(f"LED_D{i}") if i < N_LEDS else None
        led = c.part("LED", "SK6812MINI", "LED_SMD:LED_SK6812MINI_PLCC4_3.5x3.5mm_P1.75mm", symbol="K7:LED:SK6812MINI",
                     ref=f"LED{i}", mpn="SK6812MINI", mfr="Opsco", desc="Addressable RGB LED 3.5x3.5 (status bar)",
                     near=first)
        w = {"VDD": V5, "VSS": GND, "DIN": prev}
        if dout is not None:
            w["DOUT"] = dout
        led.wire(w)
        if dout is None:
            led.nc("DOUT")
        c.C("100n", V5, GND, near=led, mfr=GENERIC)
        prev = dout
        first = first or led
    return c.finalize()


if __name__ == "__main__":
    circ = build()
    errs = circ.erc()
    print(f"{len(circ.parts)} parts, {len(circ.nets)} nets, {len(errs)} ERC issues")
    for e in errs:
        print("  ", e)
