"""Power-stage design calculations for the Foyer carrier board (FYR-CB-01).

Every value used by `carrier/carrier.py` comes from here, with the datasheet
equation it was derived from. Run this file to regenerate
`docs/power-design.md`.

Sources (TI datasheets, retrieved 2026-11-13):
  * TPS54560B  SLVSF00   — 5 A, 60 V non-synchronous buck (Eq. 25–51, design example §8.2)
  * LM5176     SNVSAI1D  — 4-switch buck-boost controller (Eq. 5, 11–26, 38–46)
  * LM74700-Q1 SNOSD17   — ideal-diode controller
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

E96 = [1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47,
       1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21,
       2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09, 3.16, 3.24, 3.32,
       3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99,
       5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50,
       7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76]
E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]


def nearest(x: float, series=E96) -> float:
    exp = math.floor(math.log10(x))
    cands = [v * 10 ** e for e in (exp - 1, exp, exp + 1) for v in series]
    return min(cands, key=lambda v: abs(v - x))


def fmt(v: float, unit: str) -> str:
    for k, s in ((1e6, "M"), (1e3, "k"), (1, ""), (1e-3, "m"), (1e-6, "µ"), (1e-9, "n"), (1e-12, "p")):
        if abs(v) >= k * 0.9999:
            return f"{v / k:.3g}{s}{unit}"
    return f"{v:.3g}{unit}"


@dataclass
class Stage:
    name: str
    values: dict = field(default_factory=dict)
    notes: list = field(default_factory=list)

    def set(self, key, value, why):
        self.values[key] = value
        self.notes.append((key, value, why))


# --------------------------------------------------------------- TPS54560B
def tps54560b(name: str, vin_nom: float, vin_max: float, vout: float, iout: float,
              fsw=400e3, kind=0.3, cout_derated=87.4e-6, v_start=6.5, v_stop=5.0) -> Stage:
    s = Stage(name)
    vref, gmea, gmps, i1, ih = 0.8, 350e-6, 17.0, 1.2e-6, 3.4e-6
    rt = 101756 / (fsw / 1e3) ** 1.008 * 1e3
    s.set("RT", nearest(rt), f"Eq.27 RT = 101756 / fsw^1.008 = {fmt(rt, 'Ω')} at {fmt(fsw, 'Hz')}")
    l = (vin_max - vout) / (iout * kind) * vout / (vin_max * fsw)
    s.set("L_min", l, f"Eq.28 L ≥ (Vin_max−Vout)/(Iout·K_IND)·Vout/(Vin_max·fsw) = {fmt(l, 'H')}")
    rfb_bot = 10.2e3
    rfb_top = rfb_bot * (vout / vref - 1)
    s.set("RFB_TOP", nearest(rfb_top), f"Eq.42 R_HS = R_LS·(Vout/0.8 V − 1) = {fmt(rfb_top, 'Ω')} (R_LS = 10.2 kΩ)")
    s.set("RFB_BOT", rfb_bot, "chosen per datasheet example")
    r1 = (v_start - v_stop) / ih
    r2 = 1.2 / ((v_start - 1.2) / nearest(r1) + i1)
    s.set("RUVLO1", nearest(r1), f"Eq.40 (V_START−V_STOP)/I_HYS = {fmt(r1, 'Ω')} (start {v_start} V, stop {v_stop} V)")
    s.set("RUVLO2", nearest(r2), f"Eq.41 V_ENA/((V_START−V_ENA)/R1 + I1) = {fmt(r2, 'Ω')}")
    fp = iout / (2 * math.pi * vout * cout_derated)
    fco = min(30e3, math.sqrt(fp * fsw / 2) * 1.4)
    r4 = (2 * math.pi * fco * cout_derated / gmps) * (vout / (vref * gmea))
    r4n = nearest(r4)
    c5 = 1 / (2 * math.pi * r4n * fp)
    c8 = 1 / (r4n * fsw * math.pi)
    s.set("RCOMP", r4n, f"Eq.48 with f_co = {fmt(fco, 'Hz')}, C_OUT(derated) = {fmt(cout_derated, 'F')}: {fmt(r4, 'Ω')}")
    s.set("CCOMP", nearest(c5, E12), f"Eq.49 1/(2π·R4·f_p(mod)) = {fmt(c5, 'F')}, f_p(mod) = {fmt(fp, 'Hz')}")
    s.set("CHF", nearest(c8, E12), f"Eq.51 1/(R4·fsw·π) = {fmt(c8, 'F')}")
    ripple = (vin_nom - vout) * vout / (vin_nom * 6.8e-6 * fsw) if vout < vin_nom else 0
    s.notes.append(("ripple@nom", ripple, f"inductor ripple at {vin_nom} V input ≈ {ripple:.2f} A"))
    return s


# ------------------------------------------------------------------ LM5176
def lm5176(vin_min=10.8, vin_max=13.2, vout=24.0, iout=3.0, fsw=300e3) -> Stage:
    s = Stage("LM5176 +24V_PRN (12 V → 24 V, 3 A)")
    gm_ea, gm_slope, acs, vref = 1.31e-3, 2e-6, 5, 0.8
    rt = (1 / fsw - 190e-9) / 116e-12
    s.set("RT", nearest(rt), f"Eq.5 RT = (1/fsw − 190 ns)/116 pF = {fmt(rt, 'Ω')}")
    rfb1 = 20e3
    rfb2 = rfb1 * (vout / vref - 1)
    s.set("RFB1", rfb1, "Eq.11 bottom resistor 20 kΩ")
    s.set("RFB2", nearest(rfb2), f"Eq.12 R_FB2 = (Vout−0.8)/0.8·R_FB1 = {fmt(rfb2, 'Ω')} → Vout = "
          f"{vref * (1 + nearest(rfb2) / rfb1):.2f} V")
    lb = vin_min ** 2 * (vout - vin_min) / (0.3 * iout * fsw * vout ** 2)
    s.set("L_boost_min", lb, f"Eq.14 boost-mode L for 30 % ripple at Vin_min: {fmt(lb, 'H')} → 10 µH chosen")
    L = 10e-6
    il_max = vout * iout / (0.9 * vin_min)
    il_pk = il_max + vin_min * (vout - vin_min) / (2 * L * fsw * vout)
    s.set("IL_peak", il_pk, f"Eq.15/16 I_L(max) = {il_max:.2f} A, I_L(peak) = {il_pk:.2f} A")
    rs = 0.120 / (1.25 * il_pk)
    s.set("RSENSE", 0.010, f"Eq.24 120 mV/(1.25·I_L(peak)) = {fmt(rs, 'Ω')} → 10 mΩ (limit {0.12 / 0.01:.0f} A peak)")
    p_rs = (0.120 / 0.010) ** 2 * 0.010 * (1 - vin_min / vout)
    s.set("P_RSENSE", p_rs, f"Eq.25 dissipation {p_rs:.2f} W → 3 W 2512 metal strip")
    cs = gm_slope * L / (0.010 * acs)
    s.set("CSLOPE", 330e-12, f"Eq.26 dead-beat value {fmt(cs, 'F')}; 330 pF chosen for transition-region noise margin")
    s.set("CSS", 0.1e-6, "Eq.27 0.1 µF → ≈16 ms soft start")
    s.set("RMODE", 93.1e3, "Pin table: 93.1 kΩ → CCM, hiccup protection enabled")
    rout = vout / iout
    cout = 120e-6
    dmax = 1 - vin_min / vout
    f_rhp = rout * (1 - dmax) ** 2 / (2 * math.pi * L)
    fp1 = 2 / (2 * math.pi * rout * cout)
    fbw = min(f_rhp / 3, fsw / 20, 5e3)
    fzc = 1.5 * fp1
    rc1 = (2 * math.pi * fbw / gm_ea) * ((rfb1 + nearest(rfb2)) / rfb1) * (acs * 0.010 * cout / (1 - dmax))
    rc1n = nearest(rc1)
    cc1 = 1 / (2 * math.pi * fzc * rc1n)
    cc2 = 1 / (2 * math.pi * 7 * fbw * rc1n)
    s.notes.append(("loop", None, f"Eq.38–43 f_RHP = {fmt(f_rhp, 'Hz')}, f_p1(boost) = {fmt(fp1, 'Hz')}, "
                                  f"f_bw = {fmt(fbw, 'Hz')}, f_zc = {fmt(fzc, 'Hz')} (C_OUT ≈ 120 µF effective)"))
    s.set("RC1", rc1n, f"Eq.44 {fmt(rc1, 'Ω')}")
    s.set("CC1", nearest(cc1, E12), f"Eq.45 {fmt(cc1, 'F')}")
    s.set("CC2", nearest(cc2, E12), f"Eq.46 pole at 7·f_bw: {fmt(cc2, 'F')}")
    s.set("RISNS", 0.015, "Output average-current limit: 50 mV / 15 mΩ = 3.3 A (ISNS± on output)")
    return s


def all_stages():
    return {
        "5V_CM": tps54560b("TPS54560B +5V_CM (12 V → 5.1 V, 5 A)", 12, 13.2, 5.0, 5.0, v_start=9.0, v_stop=8.0),
        "5V_AUX": tps54560b("TPS54560B +5V_AUX (12 V → 5.1 V, 5 A)", 12, 13.2, 5.0, 5.0, v_start=9.0, v_stop=8.0),
        "12V_USB": tps54560b("TPS54560B +12V_USB (USB-C 15–20 V → 12 V, 5 A)", 20, 21, 12.0, 5.0,
                             cout_derated=36e-6, v_start=13.5, v_stop=12.5),
        "24V": lm5176(),
    }


def write_doc(path: str):
    lines = ["# Power design calculations — FYR-CB-01", "",
             "Generated by `hardware/power/design_calcs.py`. Equation numbers refer to the TI datasheets "
             "(TPS54560B SLVSF00, LM5176 SNVSAI1D). Values are starting points that must be confirmed on the EVT "
             "build (loop gain/phase with a network analyser, thermal at full load).", ""]
    for key, st in all_stages().items():
        lines += [f"## {st.name}", "", "| Item | Value | Derivation |", "|---|---|---|"]
        for k, v, why in st.notes:
            if v is None or k in ("ripple@nom",):
                val = ""
            elif k.startswith(("R", "RT")) and isinstance(v, float) and v >= 1:
                val = fmt(v, "Ω")
            elif k.startswith("C"):
                val = fmt(v, "F")
            elif k.startswith("L"):
                val = fmt(v, "H")
            elif k.startswith("I"):
                val = f"{v:.2f} A"
            elif k.startswith("P"):
                val = f"{v:.2f} W"
            else:
                val = fmt(v, "Ω") if k.startswith("R") else str(v)
            lines.append(f"| {k} | {val} | {why} |")
        lines.append("")
    open(path, "w", encoding="utf-8").write("\n".join(lines))


if __name__ == "__main__":
    import os
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "docs", "power-design.md")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    write_doc(out)
    for k, st in all_stages().items():
        print(k, {kk: (round(v, 9) if isinstance(v, float) else v) for kk, v in st.values.items()})
