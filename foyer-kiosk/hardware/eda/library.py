"""Symbol pin-map loading from KiCad libraries.

Pin maps (number -> name) are read from KiCad's reviewed symbol libraries so
that part pinouts are not typed in by hand. Library references:

* ``K7:<Library>:<Symbol>`` — KiCad 7 system library (/usr/share/kicad/symbols)
* ``FY:<Symbol>``            — symbols vendored into ``hardware/lib/symbols``
                               (taken from the KiCad 9 library, CC-BY-SA 4.0)
"""
from __future__ import annotations

import functools
import os

from .sexp import find, get, parse

HW = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K7_SYMBOLS = "/usr/share/kicad/symbols"
K7_FOOTPRINTS = "/usr/share/kicad/footprints"
FY_SYMBOLS = os.path.join(HW, "lib", "symbols")
FY_FOOTPRINTS = os.path.join(HW, "lib", "footprints")


@functools.lru_cache(maxsize=None)
def _load(path: str):
    return {s[1]: s for s in find(parse(open(path, encoding="utf-8").read()), "symbol")}


def _pins_from(path: str, name: str) -> dict[str, tuple[str, str]]:
    syms = _load(path)
    sym = syms[name]
    out: dict[str, tuple[str, str]] = {}
    ext = get(sym, "extends")
    if ext:
        parent = ext[1]
        if parent in syms:
            out.update(_pins_from(path, parent))
        else:
            out.update(_pins_from(os.path.join(os.path.dirname(path), parent + ".kicad_sym"), parent))

    def walk(node):
        for child in node:
            if isinstance(child, list) and child:
                if child[0] == "pin":
                    out[get(child, "number")[1]] = (get(child, "name")[1], child[1])
                else:
                    walk(child)

    walk(sym)
    return out


def symbol_pins(ref: str) -> dict[str, tuple[str, str]]:
    """Return {pin_number: (pin_name, electrical_type)} for a library symbol."""
    parts = ref.split(":")
    if parts[0] == "K7":
        return _pins_from(os.path.join(K7_SYMBOLS, parts[1] + ".kicad_sym"), parts[2])
    if parts[0] == "FY":
        return _pins_from(os.path.join(FY_SYMBOLS, parts[1] + ".kicad_sym"), parts[1])
    raise ValueError(f"unknown symbol library reference {ref!r}")


def footprint_path(fp: str) -> tuple[str, str]:
    """Map ``Lib:Name`` to (library directory, footprint name)."""
    lib, name = fp.split(":", 1)
    if lib == "Foyer":
        return os.path.join(FY_FOOTPRINTS, "Foyer.pretty"), name
    return os.path.join(K7_FOOTPRINTS, lib + ".pretty"), name


@functools.lru_cache(maxsize=None)
def footprint_pads(fp: str) -> set[str]:
    """Pad numbers present in a footprint (used to cross-check pin maps)."""
    d, name = footprint_path(fp)
    node = parse(open(os.path.join(d, name + ".kicad_mod"), encoding="utf-8").read())
    return {p[1] for p in find(node, "pad") if p[1] not in ("",)}
