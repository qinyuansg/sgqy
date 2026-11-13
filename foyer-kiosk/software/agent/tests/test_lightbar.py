import asyncio

from foyer_agent.hal.lightbar import (
    LightBar,
    LightState,
    SimWriter,
    brightness_byte,
    pack_frame,
    parse_hex_colour,
    render,
)


def test_pack_frame_matches_ws2812_pio_rp1_layout() -> None:
    # The driver reads little-endian u32 per LED with R in bits 0-7, G 8-15, B 16-23, W 24-31.
    frame = pack_frame([(0x11, 0x22, 0x33), (0xFF, 0x00, 0x80)])
    assert frame == bytes([0x11, 0x22, 0x33, 0x00, 0xFF, 0x00, 0x80, 0x00])
    word = int.from_bytes(frame[:4], "little")
    assert (word & 0xFF, word >> 8 & 0xFF, word >> 16 & 0xFF, word >> 24) == (0x11, 0x22, 0x33, 0)


def test_brightness_never_selects_passthrough() -> None:
    assert brightness_byte(0.0) == 1  # 0 would disable gamma/brightness in the driver
    assert brightness_byte(0.3) == 76
    assert brightness_byte(1.5) == 255


def test_render_states() -> None:
    accent = parse_hex_colour("#4F46E5")
    for state in LightState:
        for t in (0.0, 0.5, 2.5):
            pixels = render(state, t, 24, accent)
            assert len(pixels) == 24
            assert all(0 <= c <= 255 for px in pixels for c in px)
    assert render(LightState.OFF, 1, 24, accent) == [(0, 0, 0)] * 24
    assert render(LightState.SUCCESS, 1.0, 24, accent)[0] == (0, 200, 90)
    busy = render(LightState.BUSY, 0.3, 24, accent)
    assert len({px for px in busy}) > 3  # a moving comet, not a flat fill


async def test_lightbar_applies_power_cap_once() -> None:
    writer = SimWriter()
    bar = LightBar(writer, 24, "#4F46E5", max_brightness=0.6, fps=50)
    bar.power_cap = 0.3
    task = asyncio.create_task(bar.run())
    bar.set_state(LightState.SUCCESS)
    await asyncio.sleep(0.1)
    assert writer.brightness == brightness_byte(0.3)
    assert len(writer.last_frame) == 24 * 4
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert writer.last_frame == bytes(24 * 4)  # switched off on shutdown
