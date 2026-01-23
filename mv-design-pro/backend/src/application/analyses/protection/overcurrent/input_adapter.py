from __future__ import annotations

from typing import Any

from application.analyses.protection.overcurrent.inputs import ProtectionInput
from network_model.solvers.short_circuit_core import ShortCircuitType
from network_model.solvers.short_circuit_iec60909 import ShortCircuitResult


def build_protection_input(
    sc_result: ShortCircuitResult,
    *,
    case_id: str | None,
    base_snapshot_id: str | None,
    pcc: dict[str, Any],
    topology_ref: dict[str, Any] | None,
) -> ProtectionInput:
    return ProtectionInput(
        case_id=case_id,
        base_snapshot_id=base_snapshot_id,
        pcc=pcc,
        fault_levels=_build_fault_levels(sc_result),
        topology_ref=topology_ref,
        source_run_id=_resolve_source_run_id(sc_result),
    )


def _build_fault_levels(sc_result: ShortCircuitResult) -> dict[str, Any]:
    fault_levels: dict[str, Any] = {
        "ik_max_3ph": None,
        "ik_min_1ph": None,
        "ip": sc_result.ip_a,
        "ith": sc_result.ith_a,
        "sk": sc_result.sk_mva,
    }
    if sc_result.short_circuit_type == ShortCircuitType.THREE_PHASE:
        fault_levels["ik_max_3ph"] = sc_result.ikss_a
    if sc_result.short_circuit_type == ShortCircuitType.SINGLE_PHASE_GROUND:
        fault_levels["ik_min_1ph"] = sc_result.ikss_a
    return fault_levels


def _resolve_source_run_id(sc_result: ShortCircuitResult) -> str:
    for attr in ("run_id", "analysis_id"):
        value = getattr(sc_result, attr, None)
        if value:
            return str(value)
    raise ValueError("ShortCircuitResult does not define a run_id")
