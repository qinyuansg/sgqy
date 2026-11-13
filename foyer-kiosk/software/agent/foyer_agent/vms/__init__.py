"""Visitor management system integration."""

from __future__ import annotations

from ..config import IdentityConfig, VmsConfig
from .base import VmsAdapter
from .rest import RestVmsAdapter


def build_vms(cfg: VmsConfig, identity: IdentityConfig) -> VmsAdapter:
    if cfg.adapter == "rest":
        return RestVmsAdapter(cfg, identity)
    raise ValueError(f"unknown vms.adapter {cfg.adapter!r}")
