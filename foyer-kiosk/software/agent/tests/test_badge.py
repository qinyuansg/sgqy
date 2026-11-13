import xml.etree.ElementTree as ET

import pytest
from PIL import Image

from foyer_agent.badge import LABEL_SIZES, BadgeData, badge_pdf, render_badge
from foyer_agent.hal.camera import encode_jpeg
from foyer_agent.qr_render import qr_image, qr_matrix, qr_svg

FONT_DIR = "/usr/share/fonts/opentype/inter"


def data(**overrides: object) -> BadgeData:
    photo = encode_jpeg(Image.new("RGB", (400, 400), (200, 160, 140)), 80)
    base = dict(
        first_name="Anna Maria",
        last_name="Eriksson",
        company="Utopia Consulting",
        host_name="Jordan Lee",
        badge_number="04021",
        valid_until="19:00",
        organisation="Northwind HQ",
        qr_data="https://pass.example.com/v/V-1",
        photo_jpeg=photo,
    )
    base.update(overrides)
    return BadgeData(**base)  # type: ignore[arg-type]


@pytest.mark.parametrize("label", sorted(LABEL_SIZES))
def test_badge_sizes_and_content(label: str) -> None:
    image = render_badge(data(), label, FONT_DIR)
    assert image.size == LABEL_SIZES[label]
    assert image.mode == "L"
    histogram = image.histogram()
    dark = sum(histogram[:64]) / (image.width * image.height)
    assert 0.08 < dark < 0.6  # header band, text, photo and QR are present but not a black slab


def test_label_dimensions_at_300_dpi() -> None:
    assert LABEL_SIZES["62x100mm"] == (732, 1181)
    assert LABEL_SIZES["2.25x4in"] == (675, 1200)


def test_long_names_and_missing_photo_render() -> None:
    image = render_badge(
        data(first_name="Maximiliana-Kunigunde Theodora", photo_jpeg=None, provisional=True), "2.25x4in", "/nonexistent"
    )  # falls back to DejaVu / default font
    assert image.size == LABEL_SIZES["2.25x4in"]


def test_pdf_output() -> None:
    pdf = badge_pdf(render_badge(data(), "62x100mm", FONT_DIR))
    assert pdf.startswith(b"%PDF") and len(pdf) < 2_000_000
    assert b"Eriksson" not in pdf  # rasterised: no extractable text in the spool file


def test_qr_svg_and_bitmap() -> None:
    svg = qr_svg("https://pass.example.com/v/V-1")
    root = ET.fromstring(svg)
    assert root.tag.endswith("svg") and "viewBox" in root.attrib
    modules = len(qr_matrix("https://pass.example.com/v/V-1"))
    image = qr_image("https://pass.example.com/v/V-1", 200)
    assert image.width % modules == 0 and image.width <= 200
