"""Energy validation (physical constraints) view builder."""

from analysis.energy_validation.models import (
    EnergyCheckType,
    EnergyValidationConfig,
    EnergyValidationContext,
    EnergyValidationItem,
    EnergyValidationStatus,
    EnergyValidationSummary,
    EnergyValidationView,
)

__all__ = [
    "EnergyCheckType",
    "EnergyValidationBuilder",
    "EnergyValidationConfig",
    "EnergyValidationContext",
    "EnergyValidationItem",
    "EnergyValidationStatus",
    "EnergyValidationSummary",
    "EnergyValidationView",
]


def __getattr__(name: str):
    if name == "EnergyValidationBuilder":
        from analysis.energy_validation.builder import EnergyValidationBuilder

        return EnergyValidationBuilder
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
