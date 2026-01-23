from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class TraceStep:
    name: str
    version: str
    inputs: dict[str, Any]
    outputs: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "inputs": self.inputs,
            "outputs": self.outputs,
        }


@dataclass(frozen=True)
class DesignSynthTrace:
    steps: tuple[TraceStep, ...]

    def to_dict(self) -> dict[str, Any]:
        return {"steps": [step.to_dict() for step in self.steps]}
