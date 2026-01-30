"""
Protection Comparison Module — P15b SELECTIVITY (A/B)

Backend-only protection comparison service.
Compares two ProtectionAnalysisRun results to generate
deterministic ranking of differences.

INVARIANTS:
- Read-only: Zero physics calculations
- Deterministic: Same inputs → identical outputs
- Same project required for both runs
- Both runs must be FINISHED
"""

from application.protection_comparison.service import (
    ProtectionComparisonService,
)

__all__ = [
    "ProtectionComparisonService",
]
