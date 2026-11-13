import asyncio

from foyer_agent.config import PowerConfig
from foyer_agent.events import EventBus
from foyer_agent.hal.display import Display
from foyer_agent.hal.gpio import SimGpioController
from foyer_agent.hal.lightbar import LightBar, SimWriter
from foyer_agent.hal.pins import ALL_PINS, PD_ALERT_N, POE_HIPWR_N, PRN_PWR_EN, PWR_ALERT_N, USBC_ATTACH
from foyer_agent.hal.printer import SimPrinter
from foyer_agent.hal.pwm import SimIlluminator
from foyer_agent.hal.sensors import SimSensorHub
from foyer_agent.power import PowerManager, budget_for

CFG = PowerConfig()


def test_budget_matrix() -> None:
    poe = budget_for(0, 1, None, CFG)
    assert poe.full and poe.source == "poe" and not poe.printer_slow
    assert (poe.display_max_brightness, poe.ir_max_duty, poe.lightbar_max) == (100, 1.0, 1.0)
    usbc = budget_for(1, 0, 60.0, CFG)
    assert usbc.full and usbc.source == "usbc"
    weak_usbc = budget_for(1, 0, 45.0, CFG)  # 15 V / 3 A
    limited = budget_for(1, 1, None, CFG)  # e.g. PoE Type 2
    for budget in (weak_usbc, limited):
        assert not budget.full and budget.printer_slow
        assert (budget.display_max_brightness, budget.ir_max_duty, budget.lightbar_max) == (70, 0.5, 0.3)


def make_manager(hold_s: float = 0.05) -> tuple[PowerManager, SimGpioController, SimPrinter, dict]:
    gpio = SimGpioController(ALL_PINS)
    sensors = SimSensorHub()
    printer = SimPrinter(job_s=0.05)
    parts = {
        "display": Display(gpio, 100, use_ddc=False),
        "ir": SimIlluminator(),
        "lightbar": LightBar(SimWriter(), 24, "#4F46E5", 0.6, 30),
        "bus": EventBus(),
        "sensors": sensors,
    }
    manager = PowerManager(
        CFG,
        gpio,
        sensors,
        parts["display"],
        parts["ir"],
        parts["lightbar"],
        printer,
        parts["bus"],
        warmup_s=0.0,
        hold_s=hold_s,
        poll_s=0.01,
    )
    return manager, gpio, printer, parts


async def test_reduced_power_caps_peripherals() -> None:
    manager, gpio, _, parts = make_manager()
    parts["ir"].set_duty(0.9)
    assert manager.budget.full
    gpio.inject(POE_HIPWR_N.name, 1)  # PoE class drops to Type 1/2
    assert not manager.budget.full
    assert parts["display"].max_brightness == 70
    assert parts["ir"].duty == 0.5 and parts["lightbar"].power_cap == 0.3
    gpio.inject(POE_HIPWR_N.name, 0)
    assert manager.budget.full and parts["display"].max_brightness == 100
    await asyncio.sleep(0)


async def test_usb_pd_contract_from_stusb4500() -> None:
    manager, gpio, _, parts = make_manager()
    gpio.inject(POE_HIPWR_N.name, 1)
    gpio.inject(USBC_ATTACH.name, 0)
    assert not manager.budget.full  # attached but no contract read yet
    parts["sensors"].pd_contract_current_a = 3.0
    gpio.inject(PD_ALERT_N.name, 0)  # STUSB4500 alert triggers a re-read
    await asyncio.sleep(0.01)
    assert manager.budget.full and manager.budget.source == "usbc" and manager.pd_contract_w == 60.0


async def test_power_alert_is_counted_and_published() -> None:
    manager, gpio, _, parts = make_manager()
    async with parts["bus"].subscribe() as events:
        gpio.inject(PWR_ALERT_N.name, 0)
        event = await asyncio.wait_for(events.get(), 1)
    assert manager.power_alerts == 1 and event["type"] == "power.alert"


async def test_printer_rail_only_while_printing() -> None:
    manager, gpio, printer, _ = make_manager(hold_s=0.05)
    assert gpio.get(PRN_PWR_EN.name) == 0
    await manager.print_badge(b"%PDF-1.4 test")
    assert gpio.get(PRN_PWR_EN.name) == 1
    await asyncio.sleep(0.03)
    assert gpio.get(PRN_PWR_EN.name) == 1  # job still printing
    await asyncio.sleep(0.2)
    assert gpio.get(PRN_PWR_EN.name) == 0  # job done + hold elapsed
    assert printer.jobs == [(len(b"%PDF-1.4 test"), False)]


async def test_slow_printing_on_reduced_power_and_hold_extension() -> None:
    manager, gpio, printer, _ = make_manager(hold_s=0.1)
    gpio.inject(POE_HIPWR_N.name, 1)
    await manager.print_badge(b"%PDF-a")
    await asyncio.sleep(0.12)
    await manager.print_badge(b"%PDF-b")  # second job re-arms the hold timer
    assert gpio.get(PRN_PWR_EN.name) == 1
    assert [slow for _, slow in printer.jobs] == [True, True]
    await manager.close()
    assert gpio.get(PRN_PWR_EN.name) == 0
