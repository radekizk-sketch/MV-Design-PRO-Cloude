"""
Protection Analysis Module — P15a FOUNDATION

Backend-only protection analysis as interpretation layer.
Consumes SC results + ProtectionCase config + Protection Library
to produce deterministic ProtectionResult + ProtectionTrace.
"""

from application.protection_analysis.engine import (
    FaultPoint,
    ProtectionDevice,
    ProtectionEvaluationEngine,
    ProtectionEvaluationInput,
    build_device_from_template,
    build_fault_from_sc_result,
    compute_definite_time,
    compute_iec_inverse_time,
    compute_margin_percent,
)
from application.protection_analysis.service import (
    ProtectionAnalysisService,
)

__all__ = [
    # Engine
    "FaultPoint",
    "ProtectionDevice",
    "ProtectionEvaluationEngine",
    "ProtectionEvaluationInput",
    "build_device_from_template",
    "build_fault_from_sc_result",
    "compute_definite_time",
    "compute_iec_inverse_time",
    "compute_margin_percent",
    # Service
    "ProtectionAnalysisService",
]
