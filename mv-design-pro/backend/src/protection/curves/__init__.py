"""
Protection curves module.

Provides IEC 60255 and IEEE C37.112 curve calculations for overcurrent protection.
"""

from .iec_curves import (
    IECCurveType,
    IECCurveParams,
    calculate_iec_tripping_time,
    generate_iec_curve_points,
)
from .ieee_curves import (
    IEEECurveType,
    IEEECurveParams,
    calculate_ieee_tripping_time,
    generate_ieee_curve_points,
)
from .curve_calculator import (
    CurveDefinition,
    CurvePoint,
    FaultMarker,
    CoordinationResult,
    calculate_curve_points,
    check_coordination,
    calculate_grading_margin,
)

__all__ = [
    # IEC curves
    "IECCurveType",
    "IECCurveParams",
    "calculate_iec_tripping_time",
    "generate_iec_curve_points",
    # IEEE curves
    "IEEECurveType",
    "IEEECurveParams",
    "calculate_ieee_tripping_time",
    "generate_ieee_curve_points",
    # Calculator
    "CurveDefinition",
    "CurvePoint",
    "FaultMarker",
    "CoordinationResult",
    "calculate_curve_points",
    "check_coordination",
    "calculate_grading_margin",
]
