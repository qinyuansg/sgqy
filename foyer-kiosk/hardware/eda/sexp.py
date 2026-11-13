"""Minimal S-expression reader/writer for KiCad files."""
from __future__ import annotations

import re

_TOKEN = re.compile(r'\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+')


def parse(text: str):
    stack: list[list] = [[]]
    for tok in _TOKEN.findall(text):
        if tok == "(":
            stack.append([])
        elif tok == ")":
            node = stack.pop()
            stack[-1].append(node)
        elif tok.startswith('"'):
            stack[-1].append(tok[1:-1].replace('\\"', '"'))
        else:
            stack[-1].append(tok)
    return stack[0][0]


def find(node, key):
    return [c for c in node if isinstance(c, list) and c and c[0] == key]


def get(node, key):
    found = find(node, key)
    return found[0] if found else None


def q(s: str) -> str:
    """Quote a string for KiCad s-expressions."""
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'
