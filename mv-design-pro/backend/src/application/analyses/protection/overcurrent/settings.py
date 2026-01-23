from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from application.analyses.design_synth.canonical import canonicalize_json


@dataclass(frozen=True)
class OvercurrentSettingsV0:
    curve: str
    i_pickup_51_a: float
    tms_51: float
    i_inst_50_a: float
    i_pickup_51n_a: float
    tms_51n: float
    i_inst_50n_a: float
    assumptions: tuple[str, ...]
    warnings: tuple[str, ...]
    computed_points: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "curve": self.curve,
            "i_pickup_51_a": self.i_pickup_51_a,
            "tms_51": self.tms_51,
            "i_inst_50_a": self.i_inst_50_a,
            "i_pickup_51n_a": self.i_pickup_51n_a,
            "tms_51n": self.tms_51n,
            "i_inst_50n_a": self.i_inst_50n_a,
            "assumptions": self.assumptions,
            "warnings": self.warnings,
            "computed_points": self.computed_points,
        }
        return canonicalize_json(payload)
