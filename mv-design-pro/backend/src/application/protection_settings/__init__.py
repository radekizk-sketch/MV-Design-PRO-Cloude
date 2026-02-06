"""Protection Settings Engine — automatyczny dobór nastaw zabezpieczeń nadprądowych."""
from .engine import (
    ProtectionSettingsEngine,
    ProtectionSettingsInput,
    ProtectionSettingsResult,
    DelayedSettings,
    InstantaneousSettings,
    ThermalWithstandResult,
    SPZAnalysisResult,
)

__all__ = [
    "ProtectionSettingsEngine",
    "ProtectionSettingsInput",
    "ProtectionSettingsResult",
    "DelayedSettings",
    "InstantaneousSettings",
    "ThermalWithstandResult",
    "SPZAnalysisResult",
]
