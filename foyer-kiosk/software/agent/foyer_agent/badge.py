"""Visitor badge label rendering (300 dpi, monochrome-friendly) to PDF for CUPS.

Supported die-cut/continuous sizes: 62 x 100 mm (Brother QL 62 mm tape) and
2.25" x 4" (Zebra/Dymo style). Rendering happens in memory only.

``python -m foyer_agent.badge --out badge.png`` renders a sample for review.
"""

from __future__ import annotations

import argparse
import io
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from .qr_render import qr_image

DPI = 300
LABEL_SIZES = {
    "62x100mm": (round(62 / 25.4 * DPI), round(100 / 25.4 * DPI)),
    "2.25x4in": (round(2.25 * DPI), round(4 * DPI)),
}
FALLBACK_FONTS = Path("/usr/share/fonts/truetype/dejavu")

Font = ImageFont.FreeTypeFont | ImageFont.ImageFont


@dataclass(frozen=True)
class BadgeData:
    first_name: str
    last_name: str
    company: str
    host_name: str
    badge_number: str
    valid_until: str
    organisation: str
    qr_data: str | None = None
    photo_jpeg: bytes | None = None
    provisional: bool = False

    def __repr__(self) -> str:
        return f"<BadgeData {self.badge_number}>"


@lru_cache(maxsize=64)
def _font(font_dir: str, weight: str, size: int) -> Font:
    candidates = [
        Path(font_dir) / f"Inter-{weight}.otf",
        Path(font_dir) / f"Inter-{weight}.ttf",
        FALLBACK_FONTS / ("DejaVuSans-Bold.ttf" if weight in {"Bold", "SemiBold"} else "DejaVuSans.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def _fit(
    draw: ImageDraw.ImageDraw, text: str, font_dir: str, weight: str, size: int, max_w: int, min_size: int
) -> Font:
    while size > min_size:
        font = _font(font_dir, weight, size)
        if draw.textlength(text, font=font) <= max_w:
            return font
        size -= 4
    return _font(font_dir, weight, min_size)


def _ellipsize(draw: ImageDraw.ImageDraw, text: str, font: Font, max_w: int) -> str:
    if draw.textlength(text, font=font) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=font) > max_w:
        text = text[:-1]
    return text.rstrip() + "…"


def _line_height(font: Font, factor: float) -> int:
    size = font.size if isinstance(font, ImageFont.FreeTypeFont) else 11
    return round(size * factor)


def render_badge(data: BadgeData, label: str, font_dir: str) -> Image.Image:
    """Top-down layout: header band, organisation, photo, names, company;
    footer anchored at the bottom (host, badge number, validity, QR). The
    photo shrinks (or is dropped) so the name block never reaches the footer."""
    width, height = LABEL_SIZES[label]
    img = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(img)
    margin = round(width * 0.075)
    inner = width - 2 * margin

    band_h = round(height * 0.11)
    draw.rectangle((0, 0, width, band_h), fill=0)
    title = "VISITOR · PROVISIONAL" if data.provisional else "VISITOR"
    title_font = _fit(draw, title, font_dir, "Bold", round(band_h * 0.42), inner, 24)
    draw.text((margin, band_h / 2), title, font=title_font, fill=255, anchor="lm")

    y = band_h + round(height * 0.035)
    org_font = _font(font_dir, "Medium", round(height * 0.026))
    draw.text((margin, y), _ellipsize(draw, data.organisation.upper(), org_font, inner), font=org_font, fill=90)
    y += round(height * 0.05)

    qr_size = round(width * 0.28)
    footer_top = height - margin - qr_size
    divider_y = footer_top - round(height * 0.03)

    first_font = _fit(draw, data.first_name, font_dir, "Bold", round(height * 0.08), inner, 40)
    last_font = _fit(draw, data.last_name, font_dir, "SemiBold", round(height * 0.048), inner, 32)
    company_font = _font(font_dir, "Regular", round(height * 0.03))
    names_h = _line_height(first_font, 1.15) + _line_height(last_font, 1.3)
    names_h += _line_height(company_font, 1.4) if data.company else 0

    if data.photo_jpeg:
        gap = round(height * 0.03)
        photo_h = min(round(width * 0.42 * 1.2), divider_y - round(height * 0.02) - names_h - gap - y)
        if photo_h >= round(height * 0.15):
            photo_w = round(photo_h / 1.2)
            photo = Image.open(io.BytesIO(data.photo_jpeg)).convert("L")
            photo = ImageOps.autocontrast(ImageOps.fit(photo, (photo_w, photo_h), centering=(0.5, 0.4)), cutoff=1)
            mask = Image.new("L", (photo_w, photo_h), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo_w, photo_h), radius=round(photo_w * 0.08), fill=255)
            img.paste(photo, (margin, y), mask)
            y += photo_h + gap

    draw.text((margin, y), _ellipsize(draw, data.first_name, first_font, inner), font=first_font, fill=0)
    y += _line_height(first_font, 1.15)
    draw.text((margin, y), _ellipsize(draw, data.last_name, last_font, inner), font=last_font, fill=0)
    y += _line_height(last_font, 1.3)
    if data.company:
        draw.text((margin, y), _ellipsize(draw, data.company, company_font, inner), font=company_font, fill=60)

    draw.line((margin, divider_y, width - margin, divider_y), fill=0, width=3)
    text_w = inner - qr_size - round(width * 0.05)
    small = _font(font_dir, "Medium", round(height * 0.022))
    host_font = _fit(draw, data.host_name, font_dir, "SemiBold", round(height * 0.034), text_w, 26)
    draw.text((margin, footer_top), "VISITING", font=small, fill=90)
    host = _ellipsize(draw, data.host_name, host_font, text_w)
    draw.text((margin, footer_top + round(height * 0.03)), host, font=host_font, fill=0)
    draw.text((margin, footer_top + round(height * 0.085)), f"Badge {data.badge_number}", font=small, fill=0)
    draw.text((margin, footer_top + round(height * 0.115)), f"Valid until {data.valid_until}", font=small, fill=60)
    if data.qr_data:
        code = qr_image(data.qr_data, qr_size)
        img.paste(code, (width - margin - code.width, height - margin - code.height))
    return img


def badge_pdf(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, "PDF", resolution=DPI)
    return buf.getvalue()


def _sample() -> BadgeData:
    return BadgeData(
        first_name="Anna Maria",
        last_name="Eriksson",
        company="Utopia Consulting",
        host_name="Jordan Lee",
        badge_number="04021",
        valid_until="19:00",
        organisation="Northwind HQ",
        qr_data="https://pass.example.com/v/SAMPLE",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a sample visitor badge")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--label", choices=sorted(LABEL_SIZES), default="62x100mm")
    parser.add_argument("--font-dir", default="/usr/share/fonts/opentype/inter")
    args = parser.parse_args()
    image = render_badge(_sample(), args.label, args.font_dir)
    if args.out.suffix == ".pdf":
        args.out.write_bytes(badge_pdf(image))
    else:
        image.save(args.out)


if __name__ == "__main__":
    main()
