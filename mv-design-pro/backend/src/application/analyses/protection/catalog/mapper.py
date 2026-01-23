from __future__ import annotations

from application.analyses.protection.catalog.models import (
    DeviceCapability,
    DeviceMappingResult,
    ProtectionRequirementV0,
)
from application.analyses.protection.catalog.validator import validate_requirement


def map_requirement_to_device(
    req: ProtectionRequirementV0, cap: DeviceCapability
) -> DeviceMappingResult:
    compatible, violations = validate_requirement(req, cap)
    if not compatible:
        return DeviceMappingResult(
            compatible=False,
            violations=violations,
            mapped_settings={},
            assumptions=("MAPPING_SKIPPED_INCOMPATIBLE",),
        )

    mapped_settings = {
        "I51": req.i_pickup_51_a,
        "TMS51": req.tms_51,
        "I50": req.i_inst_50_a,
        "I51N": req.i_pickup_51n_a,
        "TMS51N": req.tms_51n,
        "I50N": req.i_inst_50n_a,
        "CURVE": req.curve,
    }
    return DeviceMappingResult(
        compatible=True,
        violations=(),
        mapped_settings=mapped_settings,
        assumptions=("LOGICAL_MAPPING_ONLY", "NO_VENDOR_PARAM_IDS"),
    )
