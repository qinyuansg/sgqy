"""ICAO 9303 machine readable zone parsing (TD1 ID cards, TD3 passports)."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

_WEIGHTS = (7, 3, 1)


class MrzError(ValueError):
    pass


def _char_value(char: str) -> int:
    if char.isdigit():
        return int(char)
    if "A" <= char <= "Z":
        return ord(char) - ord("A") + 10
    if char == "<":
        return 0
    raise MrzError("invalid MRZ character")


def check_digit(field: str) -> str:
    return str(sum(_char_value(c) * _WEIGHTS[i % 3] for i, c in enumerate(field)) % 10)


@dataclass(frozen=True)
class MrzData:
    document_type: str
    issuing_state: str
    surname: str
    given_names: str
    document_number: str
    nationality: str
    birth_date: dt.date
    sex: str
    expiry_date: dt.date

    def expired(self, today: dt.date | None = None) -> bool:
        return self.expiry_date < (today or dt.date.today())


def _date(yymmdd: str, *, future: bool, today: dt.date) -> dt.date:
    yy, mm, dd = int(yymmdd[:2]), int(yymmdd[2:4]), int(yymmdd[4:6])
    century = today.year // 100 * 100
    year = century + yy
    if future and year < today.year - 50:
        year += 100
    if not future and year > today.year:
        year -= 100
    return dt.date(year, mm, dd)


def _names(field: str) -> tuple[str, str]:
    surname, _, given = field.partition("<<")
    return surname.replace("<", " ").strip(), given.replace("<", " ").strip()


def _verify(field: str, digit: str, what: str) -> None:
    if check_digit(field) != digit:
        raise MrzError(f"check digit mismatch: {what}")


def parse_mrz(lines: list[str], today: dt.date | None = None) -> MrzData:
    today = today or dt.date.today()
    lines = [line.strip().upper() for line in lines]
    if len(lines) == 2 and all(len(line) == 44 for line in lines):
        return _parse_td3(*lines, today=today)
    if len(lines) == 3 and all(len(line) == 30 for line in lines):
        return _parse_td1(*lines, today=today)
    raise MrzError("unsupported MRZ format")


def _parse_td3(l1: str, l2: str, *, today: dt.date) -> MrzData:
    _verify(l2[0:9], l2[9], "document number")
    _verify(l2[13:19], l2[19], "birth date")
    _verify(l2[21:27], l2[27], "expiry date")
    _verify(l2[0:10] + l2[13:20] + l2[21:43], l2[43], "composite")
    surname, given = _names(l1[5:44])
    return MrzData(
        document_type=l1[0:2].replace("<", ""),
        issuing_state=l1[2:5].replace("<", ""),
        surname=surname,
        given_names=given,
        document_number=l2[0:9].replace("<", ""),
        nationality=l2[10:13].replace("<", ""),
        birth_date=_date(l2[13:19], future=False, today=today),
        sex=l2[20],
        expiry_date=_date(l2[21:27], future=True, today=today),
    )


def _parse_td1(l1: str, l2: str, l3: str, *, today: dt.date) -> MrzData:
    _verify(l1[5:14], l1[14], "document number")
    _verify(l2[0:6], l2[6], "birth date")
    _verify(l2[8:14], l2[14], "expiry date")
    _verify(l1[5:30] + l2[0:7] + l2[8:15] + l2[18:29], l2[29], "composite")
    surname, given = _names(l3)
    return MrzData(
        document_type=l1[0:2].replace("<", ""),
        issuing_state=l1[2:5].replace("<", ""),
        surname=surname,
        given_names=given,
        document_number=l1[5:14].replace("<", ""),
        nationality=l2[15:18].replace("<", ""),
        birth_date=_date(l2[0:6], future=False, today=today),
        sex=l2[7],
        expiry_date=_date(l2[8:14], future=True, today=today),
    )


def build_td3(
    *,
    issuing_state: str,
    surname: str,
    given_names: str,
    document_number: str,
    nationality: str,
    birth: str,
    sex: str,
    expiry: str,
) -> list[str]:
    """Build a valid TD3 MRZ (used by the simulator and tests)."""
    name = (surname.replace(" ", "<") + "<<" + given_names.replace(" ", "<")).upper()
    l1 = f"P<{issuing_state:<<3}{name}".ljust(44, "<")[:44]
    number = document_number.ljust(9, "<")
    optional = "".ljust(14, "<")
    l2 = (
        f"{number}{check_digit(number)}{nationality:<<3}{birth}{check_digit(birth)}"
        f"{sex}{expiry}{check_digit(expiry)}{optional}{check_digit(optional)}"
    )
    l2 += check_digit(l2[0:10] + l2[13:20] + l2[21:43])
    return [l1, l2]
