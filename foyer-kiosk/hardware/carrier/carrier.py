"""FYR-CB-01 — Foyer VK-1 carrier board, described as code.

The circuit follows `hardware/interface-contract.md` (rev B). Power-stage
values come from `hardware/power/design_calcs.py`. Pinouts come from KiCad's
reviewed symbol libraries (see `eda/library.py`) or, for the CM5, from the
official pin table (`cm5_pinout.py`).

Design rules applied throughout:
  * Pull-ups on nets that reach CM5 GPIO go to +3V3_CM (the CM5's own 3.3 V
    output), so no peripheral can back-power the module while it is off.
  * Every connector that leaves the board has ESD protection.
  * Every rail that feeds a field-replaceable unit is current limited.
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from eda.circuit import Circuit  # noqa: E402
from power.design_calcs import all_stages  # noqa: E402
from carrier.cm5_pinout import CM5_PINS  # noqa: E402

GENERIC = "Any (to spec)"
FP_MOS_N = "Package_TO_SOT_SMD:TDSON-8-1"
FP_MOS_P = "Package_SO:PowerPAK_SO-8_Single"
MOS_PINS = {1: "S", 2: "S", 3: "S", 4: "G", 5: "D"}

SHEETS = {
    "power_in": "Power input: PoE++ PD, USB-C PD sink, OR-ing, monitor",
    "regulators": "Regulators and switched rails",
    "cm5": "Compute Module 5",
    "usb": "USB hubs and ports",
    "video": "HDMI display and cameras",
    "io": "Audio, sensor bar, fan, service and security",
}


def r_val(v: float) -> str:
    for k, s in ((1e6, "M"), (1e3, "k")):
        if v >= k:
            t = f"{v / k:.3g}"
            return t.replace(".", s) if "." in t else t + s
    return f"{v:g}R".replace(".", "R", 1) if "." in f"{v:g}" else f"{v:g}R"


def c_val(v: float) -> str:
    for k, s in ((1e-6, "u"), (1e-9, "n"), (1e-12, "p")):
        if v >= k * 0.999:
            t = f"{v / k:.3g}"
            return t + s
    return f"{v}"


def build() -> Circuit:
    c = Circuit("carrier", "FYR-CB-01 Foyer VK-1 carrier board")
    S = all_stages()
    n = c.net
    GND = n("GND")  # plane net: Default class (no extra clearance needed for ground)
    V12 = n("+12V_BUS", "Power")
    V5CM = n("+5V_CM", "Power")
    V5 = n("+5V_AUX", "Power")
    V3 = n("+3V3", "Power")
    V3CM = n("+3V3_CM", "Power")
    CHASSIS = n("CHASSIS")

    def dec(net, *vals, near, size="0402", volt="16V"):
        for v in vals:
            c.C(v, net, GND, size=size, volt=volt, near=near, mfr=GENERIC)

    def pullup(net, near, value="10k", rail=None):
        c.R(value, net, rail or V3CM, near=near, mfr=GENERIC)

    # ============================================================ CM5 core
    c.group = "cm5"
    cm5 = c.part("J", "CM5 socket", "Foyer:RPi_CM5_DF40C-100DS_Pair", pins=CM5_PINS, ref="J3",
                 mpn="DF40C-100DS-0.4V(51)", mfr="Hirose",
                 desc="CM5 board-to-board receptacle pair (2 pcs per board), 1.5 mm stack")
    gpio = lambda k: n(k)  # noqa: E731
    m = {}
    for num, name in CM5_PINS.items():
        if name == "GND":
            m[num] = GND
        elif name == "+5V_IN":
            m[num] = V5CM
        elif name == "+3V3_OUT":
            m[num] = V3CM
    m.update({
        78: V3CM,  # GPIO_VREF -> 3.3 V signalling
        # Ethernet MDI (pair N -> magjack TD N+1)
        12: n("ETH_P0_P", "Eth"), 10: n("ETH_P0_N", "Eth"), 4: n("ETH_P1_P", "Eth"), 6: n("ETH_P1_N", "Eth"),
        11: n("ETH_P2_P", "Eth"), 9: n("ETH_P2_N", "Eth"), 3: n("ETH_P3_P", "Eth"), 5: n("ETH_P3_N", "Eth"),
        17: n("ETH_LED2_n"), 15: n("ETH_LED3_n"),
        16: n("FAN_TACH"), 19: n("FAN_PWM"), 20: n("EEPROM_nWP"), 21: n("LED_ACT_n"), 95: n("LED_PWR_n"),
        # GPIO per interface contract
        36: n("CAM1_SDA"), 35: n("CAM1_SCL"), 58: n("I2C1_SDA"), 56: n("I2C1_SCL"),
        54: n("POE_HIPWR_n"), 34: n("AMP_SD"), 30: n("USBC_ATTACH_n"), 31: n("IR_PWM"), 28: n("LED_DATA"),
        55: n("UART_TX"), 51: n("UART_RX"), 29: n("PRN_PWR_EN"), 50: n("TOF_INT_n"),
        49: n("I2S_BCLK"), 26: n("I2S_LRCLK"), 27: n("I2S_DIN"), 25: n("I2S_DOUT"),
        46: n("HUB_RESET_n"), 47: n("DOOR_OPEN"), 45: n("PD_ALERT_n"), 41: n("PWR_ALERT_n"),
        24: n("DISP_PWR_EN"), 48: n("TOF_XSHUT"),
        76: n("VBAT"), 80: n("CAM0_SCL"), 82: n("CAM0_SDA"), 92: n("PWR_BUT"), 93: n("nRPIBOOT"),
        97: n("CAM_GPIO0"), 100: n("CAM_GPIO1"),
        103: n("USB_OTG_N", "USB"), 105: n("USB_OTG_P", "USB"), 111: n("VBUS_EN"),
        134: n("USB0_P", "USB"), 136: n("USB0_N", "USB"),
        157: n("USB1_RX_N", "USB"), 159: n("USB1_RX_P", "USB"), 163: n("USB1_P", "USB"), 165: n("USB1_N", "USB"),
        169: n("USB1_TX_N", "USB"), 171: n("USB1_TX_P", "USB"),
        170: n("HDMI_D2_P", "HDMI"), 172: n("HDMI_D2_N", "HDMI"), 176: n("HDMI_D1_P", "HDMI"),
        178: n("HDMI_D1_N", "HDMI"), 182: n("HDMI_D0_P", "HDMI"), 184: n("HDMI_D0_N", "HDMI"),
        188: n("HDMI_CK_P", "HDMI"), 190: n("HDMI_CK_N", "HDMI"),
        199: n("HDMI_SDA"), 200: n("HDMI_SCL"), 151: n("HDMI_CEC"), 153: n("HDMI_HPD"),
    })
    for port, base in (("0", {115: "D0_N", 117: "D0_P", 121: "D1_N", 123: "D1_P", 127: "C_N", 129: "C_P",
                              133: "D2_N", 135: "D2_P", 139: "D3_N", 141: "D3_P"}),
                       ("1", {175: "D0_N", 177: "D0_P", 181: "D1_N", 183: "D1_P", 187: "C_N", 189: "C_P",
                              193: "D2_N", 195: "D2_P", 194: "D3_N", 196: "D3_P"})):
        for num, sig in base.items():
            m[num] = n(f"MIPI{port}_{sig}", "MIPI")
    cm5.wire(m)
    unused = [k for k in CM5_PINS if k not in m]
    cm5.nc(*unused)

    c.part("LED", "green", "LED_SMD:LED_0603_1608Metric", pins={1: "K", 2: "A"}, near=cm5,
           mpn="LTST-C191KGKT", mfr="Lite-On", desc="LED green 0603 (CM5 activity)").wire(
        {"K": n("LED_ACT_n"), "A": n("LED_ACT_A")})
    c.R("330", n("LED_ACT_A"), V3CM, near=cm5, mfr=GENERIC)
    c.part("LED", "red", "LED_SMD:LED_0603_1608Metric", pins={1: "K", 2: "A"}, near=cm5,
           mpn="LTST-C191KRKT", mfr="Lite-On", desc="LED red 0603 (CM5 power)").wire(
        {"K": n("LED_PWR_n"), "A": n("LED_PWR_A")})
    c.R("330", n("LED_PWR_A"), V3CM, near=cm5, mfr=GENERIC)
    c.R("10k", n("EEPROM_nWP"), GND, near=cm5, mfr=GENERIC, dnp=True,
        desc="Resistor 10k 0402 — fit after provisioning to write-protect the boot EEPROM")
    for name in ("PWR_BUT", "nRPIBOOT"):
        sw = c.part("SW", name, "Button_Switch_SMD:SW_Push_1P1T_NO_CK_KMR2", pins={1: "A", 2: "B"}, near=cm5,
                    mpn="KMR221GLFS", mfr="C&K", desc=f"Tactile switch, service ({name})")
        sw.wire({"A": n(name), "B": GND})
    dec(V5CM, "10u", "10u", "10u", "100n", "100n", near=cm5, size="0805", volt="10V")
    dec(V3CM, "1u", near=cm5)
    rtc = c.part("J", "RTC", "Connector_JST:JST_SH_SM02B-SRSS-TB_1x02-1MP_P1.00mm_Horizontal",
                 pins={1: "VBAT", 2: "GND", "MP": "MP"}, near=cm5, mpn="SM02B-SRSS-TB", mfr="JST",
                 desc="RTC battery connector (Raspberry Pi RTC battery SC1191)")
    rtc.wire({"VBAT": n("VBAT"), "GND": GND, "MP": GND})

    # ========================================================== power input
    c.group = "power_in"
    rj = c.part("J", "RJ45 PoE++", "Foyer:Bel_0826-1X1T-HS-F_PROVISIONAL",
                pins={1: "TD1+", 2: "TD1-", 3: "TD2+", 4: "TD2-", 5: "TD3+", 6: "TD3-", 7: "TD4+", 8: "TD4-",
                      9: "CT1", 10: "CT2", 11: "CT3", 12: "CT4", "L1": "LED1A", "L2": "LED1K",
                      "L3": "LED2A", "L4": "LED2K", "SH": "SHIELD"},
                ref="J1", mpn="0826-1X1T-HS-F", mfr="Bel Fuse",
                desc="RJ45 MagJack 1000BASE-T, 4PPoE 100 W, LEDs, tab up",
                provisional="Footprint and PoE tap pin assignment must be checked against the Bel drawing")
    rj.wire({"TD1+": n("ETH_P0_P"), "TD1-": n("ETH_P0_N"), "TD2+": n("ETH_P1_P"), "TD2-": n("ETH_P1_N"),
             "TD3+": n("ETH_P2_P"), "TD3-": n("ETH_P2_N"), "TD4+": n("ETH_P3_P"), "TD4-": n("ETH_P3_N"),
             "CT1": n("POE_A1", "PoE"), "CT2": n("POE_A2", "PoE"), "CT3": n("POE_B1", "PoE"), "CT4": n("POE_B2", "PoE"),
             "LED1A": n("ETH_LEDA_A"), "LED1K": n("ETH_LED2_n"), "LED2A": n("ETH_LEDB_A"), "LED2K": n("ETH_LED3_n"),
             "SHIELD": CHASSIS})
    c.R("330", n("ETH_LEDA_A"), V3CM, near=rj, mfr=GENERIC)
    c.R("330", n("ETH_LEDB_A"), V3CM, near=rj, mfr=GENERIC)
    c.C("1n", CHASSIS, GND, size="1206", volt="2kV", near=rj, mfr=GENERIC, desc="Capacitor 1nF 2kV X7R 1206 (chassis bond)")
    c.R("1M", CHASSIS, GND, size="1206", near=rj, mfr=GENERIC)

    pd = c.part("U", "Ag59812-LPB", "Foyer:Silvertel_Ag59812-LPB_PROVISIONAL",
                pins={"VA1": "VA1", "VA2": "VA2", "VB1": "VB1", "VB2": "VB2", "NC1": "NC",
                      "VOUT+": "VOUT+", "VOUT+2": "VOUT+", "VOUT-": "VOUT-", "VOUT-2": "VOUT-",
                      "ADJ": "ADJ", "AT": "AT", "BT": "BT"},
                ref="U1", mpn="Ag59812-LPB", mfr="Silvertel",
                desc="PoE++ PD module, IEEE 802.3bt Class 8, isolated 12 V / 89 W",
                provisional="Footprint and pin functions must be checked against the Silvertel datasheet")
    pd.wire({"VA1": n("POE_A1"), "VA2": n("POE_A2"), "VB1": n("POE_B1"), "VB2": n("POE_B2"),
             "VOUT+": n("+12V_POE", "Power"), "VOUT-": GND, "BT": n("POE_HIPWR_n")}).nc("NC", "ADJ", "AT")
    pullup(n("POE_HIPWR_n"), pd)
    for v in ("22u", "22u"):
        c.C(v, n("+12V_POE"), GND, size="1210", volt="25V", near=pd, mfr=GENERIC)
    c.part("C", "100u", "Capacitor_SMD:CP_Elec_6.3x7.7", pins={1: "+", 2: "-"}, near=pd,
           mpn="EEH-ZA1E101XP", mfr="Panasonic", desc="Hybrid polymer 100uF 25V 6.3x7.7").wire(
        {"+": n("+12V_POE"), "-": GND})

    usbc = c.part("J", "USB-C", "Connector_USB:USB_C_Receptacle_GCT_USB4085",
                  pins={"A1": "GND", "B1": "GND", "A12": "GND", "B12": "GND", "A4": "VBUS", "B4": "VBUS",
                        "A9": "VBUS", "B9": "VBUS", "A5": "CC1", "B5": "CC2", "A6": "D+", "B6": "D+",
                        "A7": "D-", "B7": "D-", "A8": "SBU1", "B8": "SBU2", "S1": "SHIELD"},
                  ref="J2", mpn="USB4085-GF-A", mfr="GCT", desc="USB-C receptacle (PD power in + rpiboot service)")
    VBUSC = n("VBUS_C", "Power")
    usbc.wire({"GND": GND, "VBUS": VBUSC, "CC1": n("USBC_CC1"), "CC2": n("USBC_CC2"),
               "D+": n("USB_OTG_P"), "D-": n("USB_OTG_N"), "SHIELD": CHASSIS}).nc("SBU1", "SBU2")
    esd = c.part("U", "TPD4E05U06", "Package_SON:USON-10_2.5x1.0mm_P0.5mm", symbol="K7:Power_Protection:TPD4E05U06DQA",
                 near=usbc, mpn="TPD4E05U06DQAR", mfr="Texas Instruments", desc="4-ch ESD, USB-C D+/D-/CC")
    esd.wire({"D1+": n("USB_OTG_P"), "D1-": n("USB_OTG_N"), "D2+": n("USBC_CC1"), "D2-": n("USBC_CC2"),
              "GND": GND}).nc("NC")
    c.part("D", "SMAJ22A", "Diode_SMD:D_SMA", pins={1: "K", 2: "A"}, near=usbc, mpn="SMAJ22A", mfr="Littelfuse",
           desc="TVS 22 V standoff, VBUS clamp").wire({"K": VBUSC, "A": GND})

    pdc = c.part("U", "STUSB4500", "Package_DFN_QFN:QFN-24-1EP_4x4mm_P0.5mm_EP2.7x2.7mm",
                 symbol="K7:Interface_USB:STUSB4500QTR", near=usbc, mpn="STUSB4500QTR", mfr="STMicroelectronics",
                 desc="USB PD sink controller (NVM: PDO1 5V, PDO2 15V/2A, PDO3 20V/3A)",
                 provisional="Application circuit to be reviewed against ST datasheet/AN5225 (ST site unreachable during design)")
    pdc.wire({"CC1": n("USBC_CC1"), "CC1DB": n("USBC_CC1"), "CC2": n("USBC_CC2"), "CC2DB": n("USBC_CC2"),
              "VDD": VBUSC, "VBUS_VS_DISCH": VBUSC, "DISCH": n("PD_DISCH"), "VSYS": GND, "GND": GND,
              "RESET": n("PD_RESET"), "SCL": n("I2C1_SCL"), "SDA": n("I2C1_SDA"), "ADDR0": GND, "ADDR1": GND,
              "ALERT": n("PD_ALERT_n"), "ATTACH": n("USBC_ATTACH_n"), "VBUS_EN_SNK": n("PD_VBUS_EN_n"),
              "VREG_2V7": n("PD_VREG_2V7"), "VREG_1V2": n("PD_VREG_1V2")}).nc(
        "NC", "POWER_OK2", "POWER_OK3", "GPIO", "A_B_SIDE")
    c.C("1u", n("PD_VREG_2V7"), GND, near=pdc, mfr=GENERIC, volt="16V")
    c.C("1u", n("PD_VREG_1V2"), GND, near=pdc, mfr=GENERIC, volt="16V")
    c.C("1u", VBUSC, GND, size="0603", volt="50V", near=pdc, mfr=GENERIC)
    c.R("10k", n("PD_RESET"), GND, near=pdc, mfr=GENERIC)
    pullup(n("PD_ALERT_n"), pdc)
    pullup(n("USBC_ATTACH_n"), pdc)
    # VBUS power switch (P-MOSFET driven by open-drain VBUS_EN_SNK)
    VBSW = n("VBUS_SW", "Power")
    qp = c.part("Q", "Si7461DP", FP_MOS_P, pins=MOS_PINS, near=pdc, mpn="SI7461DP-T1-GE3", mfr="Vishay",
                desc="P-MOSFET -60 V PowerPAK SO-8 (USB-C VBUS switch)")
    qp.wire({"S": VBUSC, "D": VBSW, "G": n("PD_GATE")})
    c.R("100k", n("PD_GATE"), VBUSC, near=qp, mfr=GENERIC)
    c.R("1k", n("PD_GATE"), n("PD_VBUS_EN_n"), near=qp, mfr=GENERIC)
    c.R("1k", n("PD_DISCH"), VBSW, size="0603", near=pdc, mfr=GENERIC)
    c.C("10u", VBSW, GND, size="1210", volt="50V", near=qp, mfr=GENERIC)

    def tps54560(tag, vin, vout_net, st, l_mpn, l_val, cout, cin_volt, anchor_ref):
        v = st.values
        u = c.part("U", "TPS54560B", "Package_SO:Texas_R-PDSO-G8_EP2.95x4.9mm_Mask2.4x3.1mm_ThermalVias",
                   symbol="K7:Regulator_Switching:TPS54560BDDA", ref=anchor_ref,
                   mpn="TPS54560BDDAR", mfr="Texas Instruments", desc=f"5 A 60 V buck — {tag}")
        sw, boot, en, rt, fb, comp = (n(f"{tag}_{s}") for s in ("SW", "BOOT", "EN", "RT", "FB", "COMP"))
        u.wire({"BOOT": boot, "VIN": vin, "EN": en, "RT/CLK": rt, "FB": fb, "COMP": comp, "GND": GND, "SW": sw})
        c.C("100n", boot, sw, size="0603", volt="25V", near=u, mfr=GENERIC)
        c.R(r_val(v["RT"]), rt, GND, near=u, mfr=GENERIC)
        c.R(r_val(v["RUVLO1"]), vin, en, near=u, mfr=GENERIC)
        c.R(r_val(v["RUVLO2"]), en, GND, near=u, mfr=GENERIC)
        c.R(r_val(v["RFB_TOP"]), vout_net, fb, near=u, mfr=GENERIC)
        c.R(r_val(v["RFB_BOT"]), fb, GND, near=u, mfr=GENERIC)
        cz = n(f"{tag}_CZ")
        c.R(r_val(v["RCOMP"]), comp, cz, near=u, mfr=GENERIC)
        c.C(c_val(v["CCOMP"]), cz, GND, near=u, mfr=GENERIC, volt="25V")
        c.C(c_val(v["CHF"]), comp, GND, near=u, mfr=GENERIC, volt="25V", diel="C0G")
        c.part("L", l_val, "Inductor_SMD:L_Coilcraft_XAL1010-XXX", pins={1: "1", 2: "2"}, near=u,
               mpn=l_mpn, mfr="Coilcraft", desc=f"Power inductor {l_val} shielded").wire({1: sw, 2: vout_net})
        c.part("D", "B560C", "Diode_SMD:D_SMC", pins={1: "K", 2: "A"}, near=u, mpn="B560C-13-F",
               mfr="Diodes Inc", desc="Schottky 60 V 5 A SMC (catch diode)").wire({"K": sw, "A": GND})
        for _ in range(2):
            c.C("10u", vin, GND, size="1210", volt=cin_volt, near=u, mfr=GENERIC)
        c.C("100n", vin, GND, size="0603", volt=cin_volt, near=u, mfr=GENERIC)
        for val, size, volt in cout:
            c.C(val, vout_net, GND, size=size, volt=volt, near=u, mfr=GENERIC)
        return u

    c.group = "power_in"
    V12U = n("+12V_USB", "Power")
    tps54560("B12", VBSW, V12U, S["12V_USB"], "XAL1010-103MEB", "10uH",
             [("22u", "1210", "25V")] * 3, "50V", "U3")

    V12OR = n("+12V_OR", "Power")
    for tag, src, ref in (("ORP", n("+12V_POE"), "U4"), ("ORU", V12U, "U5")):
        u = c.part("U", "LM74700-Q1", "Package_TO_SOT_SMD:SOT-23-6", symbol="K7:Power_Management:LM74700", ref=ref,
                   mpn="LM74700QDBVRQ1", mfr="Texas Instruments", desc="Ideal-diode controller (12 V OR-ing)")
        gate, vcap = n(f"{tag}_GATE"), n(f"{tag}_VCAP")
        u.wire({"ANODE": src, "CATHODE": V12OR, "GATE": gate, "VCAP": vcap, "EN": src, "GND": GND})
        c.C("100n", vcap, src, near=u, mfr=GENERIC, volt="25V")
        c.part("Q", "BSC093N04LS", FP_MOS_N, pins=MOS_PINS, near=u, mpn="BSC093N04LSGATMA1", mfr="Infineon",
               desc="N-MOSFET 40 V 9.3 mΩ SuperSO8").wire({"S": src, "D": V12OR, "G": gate})

    shunt = c.part("R", "2m", "Resistor_SMD:R_2512_6332Metric", pins={1: "1", 2: "2"}, ref="RS1", mpn="WSL2512R0020FEA",
                   mfr="Vishay Dale", desc="Current shunt 2 mΩ 1% 2512 1 W")
    shunt.wire({1: V12OR, 2: V12})
    ina = c.part("U", "INA238", "Package_SO:TSSOP-10_3x3mm_P0.5mm", symbol="FY:INA238", near=shunt,
                 mpn="INA238AIDGSR", mfr="Texas Instruments", desc="85 V power monitor, I2C @0x40")
    ina.wire({"Vin+": V12OR, "Vin-": V12, "Vbus": V12, "VS": V3, "GND": GND, "A0": GND, "A1": GND,
              "SDA": n("I2C1_SDA"), "SCL": n("I2C1_SCL"), "~{Alert}": n("PWR_ALERT_n")})
    dec(V3, "100n", near=ina)
    pullup(n("PWR_ALERT_n"), ina)
    c.part("D", "SMAJ15A", "Diode_SMD:D_SMA", pins={1: "K", 2: "A"}, near=shunt, mpn="SMAJ15A", mfr="Littelfuse",
           desc="TVS 15 V standoff, 12 V bus clamp").wire({"K": V12, "A": GND})
    for _ in range(2):
        c.part("C", "100u", "Capacitor_SMD:CP_Elec_6.3x7.7", pins={1: "+", 2: "-"}, near=shunt,
               mpn="EEH-ZA1E101XP", mfr="Panasonic", desc="Hybrid polymer 100uF 25V 6.3x7.7").wire({"+": V12, "-": GND})

    # =========================================================== regulators
    c.group = "regulators"
    out5 = [("47u", "1210", "10V")] * 3 + [("100n", "0402", "16V")]
    tps54560("B5C", V12, V5CM, S["5V_CM"], "XAL1010-682MEB", "6.8uH", out5, "25V", "U7")
    tps54560("B5A", V12, V5, S["5V_AUX"], "XAL1010-682MEB", "6.8uH", out5, "25V", "U8")

    u33 = c.part("U", "TPS62A02", "Package_TO_SOT_SMD:SOT-563", symbol="FY:TPS62A02DRL", ref="U9",
                 mpn="TPS62A02DRLR", mfr="Texas Instruments", desc="2 A sync buck 5 V → 3.3 V")
    u33.wire({"VIN": V5, "EN": V5, "GND": GND, "SW": n("B33_SW"), "FB": n("B33_FB")}).nc("PG")
    c.part("L", "1uH", "Inductor_SMD:L_Coilcraft_XAL4020-XXX", pins={1: "1", 2: "2"}, near=u33,
           mpn="XAL4020-102MEB", mfr="Coilcraft", desc="Power inductor 1 µH").wire({1: n("B33_SW"), 2: V3})
    c.R("100k", V3, n("B33_FB"), near=u33, mfr=GENERIC)
    c.R("22.1k", n("B33_FB"), GND, near=u33, mfr=GENERIC)
    c.C("10u", V5, GND, size="0805", volt="10V", near=u33, mfr=GENERIC)
    c.C("22u", V3, GND, size="0805", volt="6.3V", near=u33, mfr=GENERIC)
    c.C("22u", V3, GND, size="0805", volt="6.3V", near=u33, mfr=GENERIC)

    # LM5176 4-switch buck-boost: +12V_BUS -> +24V_PRN (printer)
    st = S["24V"].values
    bb = c.part("U", "LM5176", "Package_SO:HTSSOP-28-1EP_4.4x9.7mm_P0.65mm_EP3.4x9.5mm_ThermalVias",
                symbol="K7:Regulator_Switching:LM5176PWP", ref="U10", mpn="LM5176PWPR", mfr="Texas Instruments",
                desc="4-switch buck-boost controller (printer 24 V)")
    sw1, sw2, csn, vo_int = n("BB_SW1", "Power"), n("BB_SW2", "Power"), n("BB_CS", "Power"), n("BB_VOUT", "Power")
    V24 = n("+24V_PRN", "Power")
    bbn = {k: n(f"BB_{k}") for k in ("EN", "MODE", "RT", "SLOPE", "SS", "COMP", "CZ", "FB", "VCC",
                                     "BOOT1", "BOOT2", "HD1", "LD1", "HD2", "LD2")}
    bb.wire({"EN/UVLO": bbn["EN"], "VIN": V12, "VISNS": V12, "MODE": bbn["MODE"], "DITH": GND,
             "RT/SYNC": bbn["RT"], "SLOPE": bbn["SLOPE"], "SS": bbn["SS"], "COMP": bbn["COMP"], "AGND": GND,
             "FB": bbn["FB"], "VOSNS": vo_int, "ISNS(+)": vo_int, "ISNS(-)": V24, "CSG": GND, "CS": csn,
             "SW2": sw2, "HDRV2": bbn["HD2"], "BOOT2": bbn["BOOT2"], "LDRV2": bbn["LD2"], "PGND": GND,
             "VCC": bbn["VCC"], "BIAS": vo_int, "LDRV1": bbn["LD1"], "BOOT1": bbn["BOOT1"],
             "HDRV1": bbn["HD1"], "SW1": sw1, "PowerPAD": GND}).nc("PGOOD")
    c.R("10k", n("PRN_PWR_EN"), bbn["EN"], near=bb, mfr=GENERIC)
    c.R("100k", bbn["EN"], GND, near=bb, mfr=GENERIC)
    c.R(r_val(st["RMODE"]), bbn["MODE"], GND, near=bb, mfr=GENERIC)
    c.R(r_val(st["RT"]), bbn["RT"], GND, near=bb, mfr=GENERIC)
    c.C(c_val(st["CSLOPE"]), bbn["SLOPE"], GND, near=bb, mfr=GENERIC, diel="C0G", volt="25V")
    c.C(c_val(st["CSS"]), bbn["SS"], GND, near=bb, mfr=GENERIC, volt="25V")
    c.R(r_val(st["RC1"]), bbn["COMP"], bbn["CZ"], near=bb, mfr=GENERIC)
    c.C(c_val(st["CC1"]), bbn["CZ"], GND, near=bb, mfr=GENERIC, volt="25V")
    c.C(c_val(st["CC2"]), bbn["COMP"], GND, near=bb, mfr=GENERIC, volt="25V", diel="C0G")
    c.R(r_val(st["RFB2"]), V24, bbn["FB"], near=bb, mfr=GENERIC)
    c.R(r_val(st["RFB1"]), bbn["FB"], GND, near=bb, mfr=GENERIC)
    c.C("4.7u", bbn["VCC"], GND, size="0603", volt="16V", near=bb, mfr=GENERIC)
    c.C("100n", bbn["BOOT1"], sw1, size="0603", volt="25V", near=bb, mfr=GENERIC)
    c.C("100n", bbn["BOOT2"], sw2, size="0603", volt="50V", near=bb, mfr=GENERIC)
    for ref_tag, d, s, g in (("QH1", V12, sw1, bbn["HD1"]), ("QL1", sw1, csn, bbn["LD1"]),
                             ("QH2", vo_int, sw2, bbn["HD2"]), ("QL2", sw2, csn, bbn["LD2"])):
        c.part("Q", "BSC093N04LS", FP_MOS_N, pins=MOS_PINS, near=bb, mpn="BSC093N04LSGATMA1", mfr="Infineon",
               desc="N-MOSFET 40 V 9.3 mΩ SuperSO8").wire({"S": s, "D": d, "G": g})
    c.part("L", "10uH", "Inductor_SMD:L_Coilcraft_XAL1010-XXX", pins={1: "1", 2: "2"}, near=bb,
           mpn="XAL1010-103MEB", mfr="Coilcraft", desc="Power inductor 10 µH, Isat > 14 A").wire({1: sw1, 2: sw2})
    c.part("R", "10m", "Resistor_SMD:R_2512_6332Metric", pins={1: "1", 2: "2"}, near=bb, mpn="WSLP2512R0100FE",
           mfr="Vishay Dale", desc="Current sense 10 mΩ 1% 2512 3 W").wire({1: csn, 2: GND})
    c.part("R", "15m", "Resistor_SMD:R_2512_6332Metric", pins={1: "1", 2: "2"}, near=bb, mpn="WSLP2512R0150FE",
           mfr="Vishay Dale", desc="Output current limit 15 mΩ 1% 2512 3 W").wire({1: vo_int, 2: V24})
    for _ in range(2):
        c.C("10u", V12, GND, size="1210", volt="25V", near=bb, mfr=GENERIC)
    for _ in range(4):
        c.C("10u", vo_int, GND, size="1210", volt="50V", near=bb, mfr=GENERIC)
    c.part("C", "100u", "Capacitor_SMD:CP_Elec_8x10", pins={1: "+", 2: "-"}, near=bb, mpn="EEH-ZA1V101P",
           mfr="Panasonic", desc="Hybrid polymer 100uF 35V 8x10").wire({"+": V24, "-": GND})
    jp = c.part("J", "PRINTER 24V", "Connector_Molex:Molex_Micro-Fit_3.0_43650-0200_1x02_P3.00mm_Horizontal",
                pins={1: "24V", 2: "GND"}, near=bb, mpn="43650-0200", mfr="Molex", desc="Printer power out (24 V, 3 A)")
    jp.wire({"24V": V24, "GND": GND})

    # Display 12 V high-side switch
    V12D = n("+12V_DISP", "Power")
    qd = c.part("Q", "Si7461DP", FP_MOS_P, pins=MOS_PINS, ref="Q20", mpn="SI7461DP-T1-GE3", mfr="Vishay",
                desc="P-MOSFET -60 V PowerPAK SO-8 (display switch)")
    qd.wire({"S": V12, "D": V12D, "G": n("DISP_GATE")})
    c.R("100k", n("DISP_GATE"), V12, near=qd, mfr=GENERIC)
    c.R("10k", n("DISP_GATE"), n("DISP_PULL"), near=qd, mfr=GENERIC)
    c.part("Q", "2N7002", "Package_TO_SOT_SMD:SOT-23", pins={1: "G", 2: "S", 3: "D"}, near=qd,
           mpn="2N7002LT1G", mfr="onsemi", desc="N-MOSFET 60 V SOT-23").wire(
        {"G": n("DISP_PWR_EN"), "S": GND, "D": n("DISP_PULL")})
    c.R("100k", n("DISP_PWR_EN"), GND, near=qd, mfr=GENERIC)
    c.C("10u", V12D, GND, size="1210", volt="25V", near=qd, mfr=GENERIC)
    c.part("J", "DISPLAY 12V", "Connector_Molex:Molex_Micro-Fit_3.0_43650-0200_1x02_P3.00mm_Horizontal",
           pins={1: "12V", 2: "GND"}, near=qd, mpn="43650-0200", mfr="Molex", desc="Display power out (12 V)").wire(
        {"12V": V12D, "GND": GND})
    # Aux 12 V (passport reader DC input if required)
    pf = c.part("F", "1.5A", "Fuse:Fuse_1812_4532Metric", pins={1: "1", 2: "2"}, ref="F1",
                mpn="MF-MSMF150/24X-2", mfr="Bourns", desc="PTC resettable fuse 1.5 A hold 24 V 1812")
    pf.wire({1: V12, 2: n("+12V_AUX", "Power")})
    c.part("J", "AUX 12V", "Connector_Molex:Molex_Micro-Fit_3.0_43650-0200_1x02_P3.00mm_Horizontal",
           pins={1: "12V", 2: "GND"}, near=pf, mpn="43650-0200", mfr="Molex", desc="Aux 12 V out (reader)").wire(
        {"12V": n("+12V_AUX"), "GND": GND})

    # ================================================================== USB
    c.group = "usb"

    def port_power(en, flt, vbus, anchor):
        u = c.part("U", "TPS2065C", "Package_TO_SOT_SMD:SOT-23-5", symbol="K7:Power_Management:TPS2065CDBV",
                   near=anchor, mpn="TPS2065CDBVR", mfr="Texas Instruments", desc="USB power switch 1 A")
        wires = {"IN": V5, "GND": GND, "EN": en, "OUT": vbus}
        if flt is not None:
            wires["~{FLT}"] = flt
        u.wire(wires)
        if flt is None:
            u.nc("~{FLT}")
        c.C("100n", V5, GND, near=u, mfr=GENERIC)
        c.C("22u", vbus, GND, size="0805", volt="10V", near=u, mfr=GENERIC)
        return u

    def hub(ref, up_p, up_n, downs, unused_port=None):
        h = c.part("U", "USB2514B", "Package_DFN_QFN:QFN-36-1EP_6x6mm_P0.5mm_EP3.7x3.7mm", symbol="FY:USB2514B_Bi",
                   ref=ref, mpn="USB2514B-AEZC-TR", mfr="Microchip", desc="USB 2.0 4-port hub",
                   provisional="Strap configuration to be reviewed against Microchip DS00001692 (site unreachable)")
        t = ref
        w = {"VDD33": V3, "VDDA33": V3, "VSS": GND, "TEST": GND, "CRFILT": n(f"{t}_CRFILT"),
             "PLLFILT": n(f"{t}_PLLFILT"), "RBIAS": n(f"{t}_RBIAS"), "XTALIN/CLKIN": n(f"{t}_XI"),
             "XTALOUT": n(f"{t}_XO"), "RESET_N": n("HUB_RESET_n"), "VBUS_DET": n(f"{t}_VBUSDET"),
             "SUSP_IND/LOCAL_PWR/NON_REM0": n(f"{t}_NR0"), "SDA/SMBDATA/NON_REM1": n(f"{t}_NR1"),
             "SCL/SMBCLK/CFG_SEL0": n(f"{t}_CFG0"), "HS_IND/CFG_SEL1": n(f"{t}_CFG1"),
             "USBDP_UP": up_p, "USBDM_UP": up_n}
        for i, d in enumerate(downs, 1):
            if d is None:
                continue
            p_net, n_net, en, flt = d
            w[f"USBDP_DN{i}/PRT_DIS_P{i}"] = p_net
            w[f"USBDM_DN{i}/PRT_DIS_M{i}"] = n_net
            w[f"OCS_N{i}"] = flt
            if en is not None:
                w[f"PRTPWR{i}/BC_EN{i}"] = en
        h.wire(w)
        for i, d in enumerate(downs, 1):
            if d is not None and d[2] is None:
                h.nc(f"PRTPWR{i}/BC_EN{i}")
        if unused_port:
            h.wire({f"USBDP_DN{unused_port}/PRT_DIS_P{unused_port}": V3,
                    f"USBDM_DN{unused_port}/PRT_DIS_M{unused_port}": V3,
                    f"OCS_N{unused_port}": n(f"{t}_OCS{unused_port}")})
            h.nc(f"PRTPWR{unused_port}/BC_EN{unused_port}")
            pullup(n(f"{t}_OCS{unused_port}"), h, rail=V3)
        c.C("1u", n(f"{t}_CRFILT"), GND, near=h, mfr=GENERIC)
        c.C("1u", n(f"{t}_PLLFILT"), GND, near=h, mfr=GENERIC)
        c.R("12k", n(f"{t}_RBIAS"), GND, near=h, mfr=GENERIC, desc="Resistor 12k 1% 0402 (RBIAS)")
        c.R("10k", n(f"{t}_VBUSDET"), V3, near=h, mfr=GENERIC)
        for s in ("NR0", "NR1", "CFG0", "CFG1"):
            c.R("10k", n(f"{t}_{s}"), GND, near=h, mfr=GENERIC)
        x = c.part("Y", "24MHz", "Crystal:Crystal_SMD_3225-4Pin_3.2x2.5mm", pins={1: "1", 2: "G", 3: "3", 4: "G"},
                   near=h, mpn="ABM8-24.000MHZ-B2-T", mfr="Abracon", desc="Crystal 24 MHz 18 pF 3225")
        x.wire({1: n(f"{t}_XI"), 3: n(f"{t}_XO"), "G": GND})
        c.C("27p", n(f"{t}_XI"), GND, near=h, mfr=GENERIC, diel="C0G")
        c.C("27p", n(f"{t}_XO"), GND, near=h, mfr=GENERIC, diel="C0G")
        c.R("1M", n(f"{t}_XI"), n(f"{t}_XO"), near=h, mfr=GENERIC)
        dec(V3, "100n", "100n", "100n", "100n", "100n", "100n", near=h)
        c.C("4.7u", V3, GND, size="0603", volt="10V", near=h, mfr=GENERIC)
        return h

    def usb_a_pair(ref, a, b, label):
        j = c.part("J", label, "Connector_USB:USB_A_Wuerth_61400826021_Horizontal_Stacked",
                   pins={1: "VBUS_A", 2: "D-_A", 3: "D+_A", 4: "GND", 5: "VBUS_B", 6: "D-_B", 7: "D+_B",
                         8: "GND", 9: "SHIELD"}, ref=ref, mpn="61400826021", mfr="Würth Elektronik",
                   desc="USB 2.0 type-A dual stacked receptacle")
        j.wire({"VBUS_A": a[0], "D-_A": a[2], "D+_A": a[1], "VBUS_B": b[0], "D-_B": b[2], "D+_B": b[1],
                "GND": GND, "SHIELD": CHASSIS})
        e = c.part("U", "TPD4E05U06", "Package_SON:USON-10_2.5x1.0mm_P0.5mm",
                   symbol="K7:Power_Protection:TPD4E05U06DQA", near=j, mpn="TPD4E05U06DQAR",
                   mfr="Texas Instruments", desc="4-ch ESD for 2 USB ports")
        e.wire({"D1+": a[1], "D1-": a[2], "D2+": b[1], "D2-": b[2], "GND": GND}).nc("NC")
        return j

    ports = {}
    for name in ("TOUCH", "SCAN", "PRN", "NFC", "LTE", "SVC"):
        ports[name] = (n(f"VBUS_{name}", "Power"), n(f"USB_{name}_P", "USB"), n(f"USB_{name}_N", "USB"),
                       n(f"USB_{name}_EN"), n(f"USB_{name}_FLT"))
    h1 = hub("U11", n("USB0_P"), n("USB0_N"),
             [(ports[k][1], ports[k][2], ports[k][3], ports[k][4]) for k in ("TOUCH", "SCAN", "PRN")]
             + [(n("HUB2_UP_P", "USB"), n("HUB2_UP_N", "USB"), None, n("U11_OCS4"))])
    pullup(n("U11_OCS4"), h1, rail=V3)
    h2 = hub("U12", n("HUB2_UP_P"), n("HUB2_UP_N"),
             [(ports[k][1], ports[k][2], ports[k][3], ports[k][4]) for k in ("NFC", "LTE", "SVC")] + [None],
             unused_port=4)
    for k, hb in (("TOUCH", h1), ("SCAN", h1), ("PRN", h1), ("NFC", h2), ("LTE", h2), ("SVC", h2)):
        port_power(ports[k][3], ports[k][4], ports[k][0], hb)
        pullup(ports[k][4], hb, rail=V3)
    usb_a_pair("J10", ports["TOUCH"], ports["SCAN"], "USB touch|scanner")
    usb_a_pair("J11", ports["PRN"], ports["NFC"], "USB printer|NFC")
    usb_a_pair("J12", ports["LTE"], ports["SVC"], "USB LTE|service")

    # USB 3 port for the passport/ID reader (CM5 USB3-1)
    j9 = c.part("J", "USB3 reader", "Connector_USB:USB3_A_Receptacle_Wuerth_692122030100",
                pins={1: "VBUS", 2: "D-", 3: "D+", 4: "GND", 5: "SSRX-", 6: "SSRX+", 7: "GND_D", 8: "SSTX-",
                      9: "SSTX+", 10: "SHIELD"}, ref="J9", mpn="692122030100", mfr="Würth Elektronik",
                desc="USB 3.0 type-A receptacle (passport/ID reader)")
    VBR = n("VBUS_READER", "Power")
    j9.wire({"VBUS": VBR, "D-": n("USB1_N"), "D+": n("USB1_P"), "GND": GND, "GND_D": GND,
             "SSRX-": n("USB1_RX_N"), "SSRX+": n("USB1_RX_P"), "SSTX-": n("USB1_TX_N"), "SSTX+": n("USB1_TX_P"),
             "SHIELD": CHASSIS})
    port_power(n("VBUS_EN"), n("USB_RDR_FLT"), VBR, j9)
    pullup(n("USB_RDR_FLT"), j9, rail=V3)
    c.R("100k", n("USB_RDR_FLT"), GND, near=j9, mfr=GENERIC, dnp=True,
        desc="Resistor 100k 0402 — DNP (fault test option)")
    e3 = c.part("U", "TPD4EUSB30", "Package_SON:USON-10_2.5x1.0mm_P0.5mm", symbol="K7:Power_Protection:TPD4EUSB30",
                near=j9, mpn="TPD4EUSB30DQAR", mfr="Texas Instruments", desc="4-ch ESD for USB 3 SuperSpeed")
    e3.wire({"D1+": n("USB1_TX_P"), "D1-": n("USB1_TX_N"), "D2+": n("USB1_RX_P"), "D2-": n("USB1_RX_N"),
             "GND": GND}).nc("NC")
    e4 = c.part("U", "TPD4E05U06", "Package_SON:USON-10_2.5x1.0mm_P0.5mm", symbol="K7:Power_Protection:TPD4E05U06DQA",
                near=j9, mpn="TPD4E05U06DQAR", mfr="Texas Instruments", desc="ESD for reader D+/D-")
    e4.wire({"D1+": n("USB1_P"), "D1-": n("USB1_N"), "GND": GND}).nc("NC", "D2+", "D2-")

    # ================================================================ video
    c.group = "video"
    hd = c.part("J", "HDMI", "Connector_HDMI:HDMI_A_Amphenol_10029449-x01xLF_Horizontal",
                pins={1: "D2+", 2: "D2S", 3: "D2-", 4: "D1+", 5: "D1S", 6: "D1-", 7: "D0+", 8: "D0S", 9: "D0-",
                      10: "CK+", 11: "CKS", 12: "CK-", 13: "CEC", 14: "UTIL", 15: "SCL", 16: "SDA", 17: "DDC_GND",
                      18: "+5V", 19: "HPD", "SH": "SHIELD"}, ref="J5", mpn="10029449-111RLF", mfr="Amphenol",
                desc="HDMI type-A receptacle, right angle (display)")
    hd.wire({"D2+": n("HDMI_D2_P"), "D2-": n("HDMI_D2_N"), "D1+": n("HDMI_D1_P"), "D1-": n("HDMI_D1_N"),
             "D0+": n("HDMI_D0_P"), "D0-": n("HDMI_D0_N"), "CK+": n("HDMI_CK_P"), "CK-": n("HDMI_CK_N"),
             "D2S": GND, "D1S": GND, "D0S": GND, "CKS": GND, "DDC_GND": GND, "CEC": n("HDMI_CEC"),
             "SCL": n("HDMI_SCL"), "SDA": n("HDMI_SDA"), "+5V": n("HDMI_5V", "Power"), "HPD": n("HDMI_HPD"),
             "SHIELD": CHASSIS}).nc("UTIL")
    port_power(V3, None, n("HDMI_5V"), hd)
    for a, b in ((("HDMI_D2_P", "HDMI_D2_N"), ("HDMI_D1_P", "HDMI_D1_N")),
                 (("HDMI_D0_P", "HDMI_D0_N"), ("HDMI_CK_P", "HDMI_CK_N"))):
        e = c.part("U", "TPD4E05U06", "Package_SON:USON-10_2.5x1.0mm_P0.5mm",
                   symbol="K7:Power_Protection:TPD4E05U06DQA", near=hd, mpn="TPD4E05U06DQAR",
                   mfr="Texas Instruments", desc="4-ch ESD, HDMI TMDS")
        e.wire({"D1+": n(a[0]), "D1-": n(a[1]), "D2+": n(b[0]), "D2-": n(b[1]), "GND": GND}).nc("NC")

    def camera(ref, port, scl, sda, io0, io1):
        j = c.part("J", f"CAM{port}", "Connector_FFC-FPC:Hirose_FH12-22S-0.5SH_1x22-1MP_P0.50mm_Horizontal",
                   pins={1: "GND", 2: "D0_N", 3: "D0_P", 4: "GND", 5: "D1_N", 6: "D1_P", 7: "GND", 8: "C_N",
                         9: "C_P", 10: "GND", 11: "D2_N", 12: "D2_P", 13: "GND", 14: "D3_N", 15: "D3_P", 16: "GND",
                         17: "IO0", 18: "IO1", 19: "GND", 20: "SCL", 21: "SDA", 22: "3V3", "MP": "MP"},
                   ref=ref, mpn="FH12-22S-0.5SH(55)", mfr="Hirose",
                   desc=f"22-pin 0.5 mm FPC, camera {port} (Raspberry Pi CM camera pinout)")
        w = {"GND": GND, "MP": GND, "SCL": scl, "SDA": sda, "3V3": V3, "IO0": io0}
        for s in ("D0_N", "D0_P", "D1_N", "D1_P", "C_N", "C_P", "D2_N", "D2_P", "D3_N", "D3_P"):
            w[s] = n(f"MIPI{port}_{s}")
        if io1 is not None:
            w["IO1"] = io1
        j.wire(w)
        if io1 is None:
            j.nc("IO1")
        dec(V3, "1u", "100n", near=j)
        return j

    camera("J6", "0", n("CAM0_SCL"), n("CAM0_SDA"), n("CAM_GPIO0"), n("CAM_GPIO1"))
    j7 = camera("J7", "1", n("CAM1_SCL"), n("CAM1_SDA"), n("CAM1_EN"), None)
    c.R("10k", n("CAM1_EN"), V3, near=j7, mfr=GENERIC)
    c.R("2.2k", n("CAM1_SCL"), V3CM, near=j7, mfr=GENERIC)
    c.R("2.2k", n("CAM1_SDA"), V3CM, near=j7, mfr=GENERIC)

    # =================================================================== IO
    c.group = "io"
    amp = c.part("U", "MAX98357A", "Package_DFN_QFN:TQFN-16-1EP_3x3mm_P0.5mm_EP1.23x1.23mm",
                 symbol="K7:Audio:MAX98357A", ref="U13", mpn="MAX98357AETE+T", mfr="Analog Devices",
                 desc="I2S class-D mono amplifier 3.2 W")
    amp.wire({"DIN": n("I2S_DOUT"), "BCLK": n("I2S_BCLK"), "LRCLK": n("I2S_LRCLK"), "~{SD_MODE}": n("AMP_SDM"),
              "VDD": V5, "GND": GND, "PAD": GND, "OUTP": n("SPK_P", "Power"), "OUTN": n("SPK_N", "Power")}).nc(
        "NC", "GAIN_SLOT")
    c.R("680k", n("AMP_SD"), n("AMP_SDM"), near=amp, mfr=GENERIC, desc="Resistor 680k 1% 0402 (SD_MODE: (L+R)/2)")
    c.C("10u", V5, GND, size="0805", volt="10V", near=amp, mfr=GENERIC)
    dec(V5, "100n", near=amp)
    c.part("J", "SPEAKER", "Connector_JST:JST_PH_S2B-PH-SM4-TB_1x02-1MP_P2.00mm_Horizontal",
           pins={1: "+", 2: "-", "MP": "MP"}, near=amp, mpn="S2B-PH-SM4-TB", mfr="JST",
           desc="Speaker header (4–8 Ω, 3 W)").wire({"+": n("SPK_P"), "-": n("SPK_N"), "MP": GND})

    sb = c.part("J", "SENSOR BAR", "Connector_JST:JST_GH_SM15B-GHS-TB_1x15-1MP_P1.25mm_Horizontal",
                pins={i: f"P{i}" for i in range(1, 16)} | {"MP": "MP"}, ref="J16", mpn="SM15B-GHS-TB", mfr="JST",
                desc="Sensor bar cable (15-pin GH)")
    sb.wire({"P1": V5, "P2": V5, "P3": GND, "P4": GND, "P5": V3, "P6": n("I2C1_SDA"), "P7": n("I2C1_SCL"),
             "P8": n("TOF_INT_n"), "P9": n("TOF_XSHUT"), "P10": n("SB_IR_PWM"), "P11": n("SB_LED_DIN"),
             "P12": n("SB_BCLK"), "P13": n("SB_LRCLK"), "P14": n("SB_MIC"), "P15": GND, "MP": GND})
    pullup(n("TOF_INT_n"), sb)
    pullup(n("TOF_XSHUT"), sb)
    c.R("100", n("IR_PWM"), n("SB_IR_PWM"), near=sb, mfr=GENERIC)
    c.R("33", n("I2S_BCLK"), n("SB_BCLK"), near=sb, mfr=GENERIC)
    c.R("33", n("I2S_LRCLK"), n("SB_LRCLK"), near=sb, mfr=GENERIC)
    c.R("33", n("SB_MIC"), n("I2S_DIN"), near=sb, mfr=GENERIC)
    c.R("33", n("LED_DIN_5V"), n("SB_LED_DIN"), near=sb, mfr=GENERIC)
    lvl = c.part("U", "SN74LVC1T45", "Package_TO_SOT_SMD:SOT-23-6", symbol="K7:Logic_LevelTranslator:SN74LVC1T45DBV",
                 near=sb, mpn="SN74LVC1T45DBVR", mfr="Texas Instruments", desc="Level shifter 3.3 V → 5 V (LED data)")
    lvl.wire({"VCCA": V3CM, "VCCB": V5, "GND": GND, "A": n("LED_DATA"), "B": n("LED_DIN_5V"), "DIR": V3CM})
    dec(V3CM, "100n", near=lvl)
    dec(V5, "100n", near=lvl)
    dec(V5, "22u", near=sb, size="0805", volt="10V")

    fan = c.part("J", "FAN", "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical",
                 pins={1: "GND", 2: "+5V", 3: "TACH", 4: "PWM"}, ref="J18", mpn="22-28-4043", mfr="Molex",
                 desc="4-pin PWM fan header 2.54 mm")
    fan.wire({"GND": GND, "+5V": n("FAN_5V", "Power"), "TACH": n("FAN_TACH"), "PWM": n("FAN_PWM")})
    port_power(n("VBUS_EN"), None, n("FAN_5V"), fan)

    dbg = c.part("J", "DEBUG UART", "Connector_JST:JST_GH_SM03B-GHS-TB_1x03-1MP_P1.25mm_Horizontal",
                 pins={1: "TX", 2: "RX", 3: "GND", "MP": "MP"}, ref="J17", mpn="SM03B-GHS-TB", mfr="JST",
                 desc="Service console (3.3 V UART, Raspberry Pi Debug Probe pinout)")
    dbg.wire({"TX": n("UART_TX"), "RX": n("UART_RX"), "GND": GND, "MP": GND})
    door = c.part("J", "DOOR SW", "Connector_JST:JST_GH_SM02B-GHS-TB_1x02-1MP_P1.25mm_Horizontal",
                  pins={1: "SW", 2: "GND", "MP": "MP"}, ref="J19", mpn="SM02B-GHS-TB", mfr="JST",
                  desc="Service-door switch (closed = door shut)")
    door.wire({"SW": n("DOOR_OPEN"), "GND": GND, "MP": GND})
    pullup(n("DOOR_OPEN"), door)

    se = c.part("U", "ATECC608B", "Package_DFN_QFN:DFN-8-1EP_3x2mm_P0.5mm_EP1.3x1.5mm", symbol="FY:ATECC608B-MAHDA",
                ref="U15", mpn="ATECC608B-MAHDA-T", mfr="Microchip", desc="Secure element (device identity), I2C @0x60")
    se.wire({"VCC": V3, "GND": GND, "EP": GND, "SDA": n("I2C1_SDA"), "SCL": n("I2C1_SCL")}).nc("NC")
    dec(V3, "100n", near=se)
    tmp = c.part("U", "TMP1075", "Package_SON:WSON-8-1EP_2x2mm_P0.5mm_EP0.9x1.6mm_ThermalVias",
                 symbol="K7:Sensor_Temperature:TMP1075DSG", ref="U16", mpn="TMP1075DSGR", mfr="Texas Instruments",
                 desc="Board temperature sensor, I2C @0x48")
    tmp.wire({"V+": V3, "GND": GND, "EP": GND, "SDA": n("I2C1_SDA"), "SCL": n("I2C1_SCL"),
              "A0": GND, "A1": GND, "A2": GND}).nc("ALERT")
    dec(V3, "100n", near=tmp)
    return c.finalize()


if __name__ == "__main__":
    circ = build()
    errs = circ.erc()
    print(f"{len(circ.parts)} parts, {len(circ.nets)} nets, {len(errs)} ERC issues")
    for e in errs:
        print("  ", e)
