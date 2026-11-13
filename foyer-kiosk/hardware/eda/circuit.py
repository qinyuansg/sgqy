"""Circuit model: parts, pins, nets, electrical rule checks and BOM.

A board is described in Python as a ``Circuit``. The same object drives the
schematic generator, the PCB builder and the BOM, so the three can never
disagree.
"""
from __future__ import annotations

import csv
import re
from collections import defaultdict
from dataclasses import dataclass, field

from .library import footprint_pads, symbol_pins

PASSIVE_FP = {
    "R": "Resistor_SMD:R_{s}_{m}Metric",
    "C": "Capacitor_SMD:C_{s}_{m}Metric",
}
METRIC = {"0402": "1005", "0603": "1608", "0805": "2012", "1206": "3216", "1210": "3225", "1812": "4532", "2512": "6332"}


class Net:
    def __init__(self, name: str, cls: str = "Default"):
        self.name = name
        self.cls = cls
        self.nodes: list[tuple[Part, str]] = []

    def __repr__(self):
        return f"Net({self.name})"


@dataclass
class Part:
    ref: str
    value: str
    footprint: str
    pins: dict[str, tuple[str, str]]
    mpn: str = ""
    mfr: str = ""
    desc: str = ""
    group: str = "misc"
    near: "Part | None" = None
    dnp: bool = False
    provisional: str = ""  # non-empty: footprint/pinout must be verified before fab
    auto: bool = False
    fields: dict[str, str] = field(default_factory=dict)
    conn: dict[str, Net] = field(default_factory=dict)
    nc_pins: set[str] = field(default_factory=set)

    def numbers(self, key) -> list[str]:
        key = str(key)
        nums = [n for n, (name, _) in self.pins.items() if name == key]
        if key in self.pins and key not in nums:
            nums.append(key)
        if not nums:
            raise KeyError(f"{self.ref}: no pin named or numbered {key!r} (have {sorted({v[0] for v in self.pins.values()})})")
        return nums

    def wire(self, mapping: dict, circuit: "Circuit | None" = None):
        for key, net in mapping.items():
            for num in self.numbers(key):
                if num in self.conn:
                    raise ValueError(f"{self.ref}.{num} already connected to {self.conn[num].name}")
                self.conn[num] = net
                net.nodes.append((self, num))
        return self

    def nc(self, *keys):
        for key in keys:
            self.nc_pins.update(self.numbers(key))
        return self


class Circuit:
    def __init__(self, name: str, title: str):
        self.name = name
        self.title = title
        self.parts: list[Part] = []
        self.nets: dict[str, Net] = {}
        self._counters: dict[str, int] = defaultdict(int)
        self.group = "misc"

    # ----------------------------------------------------------------- nets
    def net(self, name: str, cls: str | None = None) -> Net:
        if name not in self.nets:
            self.nets[name] = Net(name, cls or "Default")
        elif cls:
            self.nets[name].cls = cls
        return self.nets[name]

    def _auto(self, prefix: str) -> str:
        self._counters[prefix] += 1
        return f"{prefix}{self._counters[prefix]}"

    # ---------------------------------------------------------------- parts
    def part(self, prefix: str, value: str, footprint: str, symbol: str | None = None,
             pins: dict | None = None, ref: str | None = None, **kw) -> Part:
        if symbol:
            pinmap = symbol_pins(symbol)
        else:
            pinmap = {str(k): (v if isinstance(v, tuple) else (v, "passive")) for k, v in (pins or {}).items()}
        kw.setdefault("group", self.group)
        p = Part(ref or self._auto("?" + prefix), value, footprint, pinmap, auto=ref is None, **kw)
        self.parts.append(p)
        return p

    def _two(self, prefix, value, fp, a, b, **kw):
        p = self.part(prefix, value, fp, pins={"1": "1", "2": "2"}, **kw)
        p.wire({"1": a, "2": b})
        return p

    def R(self, value, a, b, size="0402", mpn="", **kw):
        fp = PASSIVE_FP["R"].format(s=size, m=METRIC[size])
        kw.setdefault("desc", f"Resistor {value} 1% {size}")
        return self._two("R", value, fp, a, b, mpn=mpn, **kw)

    def C(self, value, a, b, size="0402", volt="", diel="X7R", mpn="", **kw):
        fp = PASSIVE_FP["C"].format(s=size, m=METRIC[size])
        kw.setdefault("desc", f"Capacitor {value} {volt} {diel} {size}".replace("  ", " "))
        return self._two("C", value, fp, a, b, mpn=mpn, **kw)

    def finalize(self):
        """Give auto-numbered parts final references, skipping explicitly reserved ones."""
        reserved = {p.ref for p in self.parts if not p.auto}
        counters: dict[str, int] = defaultdict(int)
        for p in self.parts:
            if not p.auto:
                continue
            prefix = p.ref.lstrip("?").rstrip("0123456789")
            while True:
                counters[prefix] += 1
                ref = f"{prefix}{counters[prefix]}"
                if ref not in reserved:
                    break
            p.ref = ref
            p.auto = False
        return self

    # ------------------------------------------------------------------ ERC
    def erc(self) -> list[str]:
        errors = []
        for p in self.parts:
            pads = footprint_pads(p.footprint)
            for num in p.pins:
                if num not in pads:
                    errors.append(f"{p.ref}: pin {num} ({p.pins[num][0]}) has no pad in {p.footprint}")
            for num, (name, etype) in p.pins.items():
                if num not in p.conn and num not in p.nc_pins and etype != "no_connect":
                    errors.append(f"{p.ref}: pin {num} ({name}) unconnected")
        for net in self.nets.values():
            if len(net.nodes) == 0:
                errors.append(f"net {net.name}: unused")
            elif len(net.nodes) == 1:
                p, n = net.nodes[0]
                errors.append(f"net {net.name}: single connection ({p.ref}.{n})")
        refs = [p.ref for p in self.parts]
        dup = {r for r in refs if refs.count(r) > 1}
        if dup:
            errors.append(f"duplicate references {sorted(dup)}")
        return errors

    # ------------------------------------------------------------------ BOM
    def bom_rows(self):
        groups: dict[tuple, list[Part]] = defaultdict(list)
        for p in self.parts:
            key = (p.value, p.footprint, p.mpn, p.mfr, p.desc, p.dnp)
            groups[key].append(p)

        def natkey(ref):
            m = re.match(r"([A-Z_]+)(\d+)", ref)
            return (m.group(1), int(m.group(2))) if m else (ref, 0)

        rows = []
        for (value, fp, mpn, mfr, desc, dnp), ps in groups.items():
            refs = sorted((p.ref for p in ps), key=natkey)
            rows.append({
                "Designators": ",".join(refs), "Qty": len(refs), "Value": value,
                "Description": desc, "Manufacturer": mfr, "MPN": mpn,
                "Footprint": fp.split(":", 1)[1], "DNP": "DNP" if dnp else "",
                "Provisional": "; ".join(sorted({p.provisional for p in ps if p.provisional})),
            })
        rows.sort(key=lambda r: natkey(r["Designators"].split(",")[0]))
        return rows

    def write_bom(self, path):
        rows = self.bom_rows()
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        return rows

    def write_netlist(self, path):
        """Plain, diff-friendly netlist: one net per line, sorted."""
        with open(path, "w", encoding="utf-8") as f:
            for name in sorted(self.nets):
                nodes = sorted(f"{p.ref}.{n}" for p, n in self.nets[name].nodes)
                f.write(f"{name} [{self.nets[name].cls}]: {' '.join(nodes)}\n")
