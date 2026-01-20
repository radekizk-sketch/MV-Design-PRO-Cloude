from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Limits:
    voltage_limits: dict = field(default_factory=dict)
    thermal_limits: dict = field(default_factory=dict)
