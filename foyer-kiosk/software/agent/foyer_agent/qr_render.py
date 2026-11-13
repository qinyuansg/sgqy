"""QR code rendering for the on-screen mobile pass (SVG) and the badge (bitmap)."""

from __future__ import annotations

import qrcode
from PIL import Image
from qrcode.constants import ERROR_CORRECT_M


def qr_matrix(data: str) -> list[list[bool]]:
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, border=0)
    qr.add_data(data)
    qr.make(fit=True)
    return qr.get_matrix()


def qr_svg(data: str, quiet: int = 2) -> str:
    """Compact SVG (one path, horizontal runs merged) that scales crisply."""
    matrix = qr_matrix(data)
    size = len(matrix) + 2 * quiet
    parts: list[str] = []
    for y, row in enumerate(matrix):
        x = 0
        while x < len(row):
            if row[x]:
                start = x
                while x < len(row) and row[x]:
                    x += 1
                parts.append(f"M{start + quiet} {y + quiet}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">'
        f'<rect width="{size}" height="{size}" fill="#fff"/><path fill="#000" d="{"".join(parts)}"/></svg>'
    )


def qr_image(data: str, box_px: int) -> Image.Image:
    matrix = qr_matrix(data)
    modules = len(matrix)
    img = Image.new("L", (modules, modules), 255)
    img.putdata([0 if cell else 255 for row in matrix for cell in row])
    scale = max(1, box_px // modules)
    return img.resize((modules * scale, modules * scale), Image.Resampling.NEAREST)
