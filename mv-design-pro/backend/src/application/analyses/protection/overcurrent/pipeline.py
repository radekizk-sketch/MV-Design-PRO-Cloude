from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from application.analyses.design_synth.canonical import canonicalize_json
from application.analyses.design_synth.fingerprint import fingerprint_json
from application.analyses.protection.overcurrent.envelope_adapter import to_run_envelope
from application.analyses.protection.overcurrent.input_adapter import build_protection_input
from application.analyses.protection.overcurrent.inputs import ProtectionInput
from application.analyses.run_envelope import AnalysisRunEnvelope
from application.analyses.run_index import index_run
from infrastructure.persistence.unit_of_work import UnitOfWork
from network_model.solvers.short_circuit_core import ShortCircuitType
from network_model.solvers.short_circuit_iec60909 import ShortCircuitResult


def run_overcurrent_skeleton(
    *,
    sc_run_id: str,
    pcc: dict[str, Any],
    topology_ref: dict[str, Any] | None,
    uow_factory: Callable[[], UnitOfWork],
) -> AnalysisRunEnvelope:
    entry = _read_short_circuit_index_entry(sc_run_id, uow_factory=uow_factory)
    sc_payload = _extract_short_circuit_payload(entry.meta_json)
    sc_result = _build_short_circuit_result(sc_payload)
    object.__setattr__(sc_result, "run_id", sc_run_id)

    protection_input = build_protection_input(
        sc_result,
        case_id=entry.case_id,
        base_snapshot_id=entry.base_snapshot_id,
        pcc=pcc,
        topology_ref=topology_ref,
    )
    outputs = {"status": "NOT_COMPUTED", "note": "Skeleton run"}
    trace_inline = _build_trace_inline()
    run_id = _build_deterministic_run_id(protection_input, outputs)

    envelope = to_run_envelope(
        protection_input,
        outputs=outputs,
        run_id=run_id,
        case_id=entry.case_id,
        base_snapshot_id=entry.base_snapshot_id,
        trace_inline=trace_inline,
        created_at_utc=datetime.now(timezone.utc).isoformat(),
    )
    _persist_run_index(envelope, protection_input, uow_factory=uow_factory)
    return envelope


def _read_short_circuit_index_entry(sc_run_id: str, *, uow_factory) -> Any:
    with uow_factory() as uow:
        entry = uow.analysis_runs_index.get(sc_run_id)
    if entry is None:
        raise ValueError("Short circuit run not found")
    if entry.analysis_type != "short_circuit.iec60909":
        raise ValueError("Unsupported short circuit run type")
    return entry


def _extract_short_circuit_payload(meta_json: dict[str, Any] | None) -> dict[str, Any]:
    if isinstance(meta_json, dict):
        payload = meta_json.get("short_circuit_result")
        if isinstance(payload, dict):
            return payload
    raise ValueError("Short circuit result payload not available")


def _build_short_circuit_result(payload: dict[str, Any]) -> ShortCircuitResult:
    sc_type = payload.get("short_circuit_type")
    if isinstance(sc_type, ShortCircuitType):
        resolved_type = sc_type
    else:
        resolved_type = ShortCircuitType(str(sc_type))
    zkk_payload = payload.get("zkk_ohm") or {}
    zkk_ohm = complex(
        float(zkk_payload.get("re", 0.0)),
        float(zkk_payload.get("im", 0.0)),
    )
    return ShortCircuitResult(
        short_circuit_type=resolved_type,
        fault_node_id=str(payload.get("fault_node_id", "")),
        c_factor=float(payload.get("c_factor", 0.0)),
        un_v=float(payload.get("un_v", 0.0)),
        zkk_ohm=zkk_ohm,
        ikss_a=float(payload.get("ikss_a", 0.0)),
        ip_a=float(payload.get("ip_a", 0.0)),
        ith_a=float(payload.get("ith_a", 0.0)),
        sk_mva=float(payload.get("sk_mva", 0.0)),
        rx_ratio=float(payload.get("rx_ratio", 0.0)),
        kappa=float(payload.get("kappa", 0.0)),
        tk_s=float(payload.get("tk_s", 0.0)),
        ib_a=float(payload.get("ib_a", 0.0)),
        tb_s=float(payload.get("tb_s", 0.0)),
        ik_thevenin_a=float(payload.get("ik_thevenin_a", 0.0)),
        ik_inverters_a=float(payload.get("ik_inverters_a", 0.0)),
        ik_total_a=float(payload.get("ik_total_a", 0.0)),
        contributions=[],
        branch_contributions=None,
        white_box_trace=list(payload.get("white_box_trace") or []),
    )


def _build_trace_inline() -> dict[str, Any]:
    steps = [
        {"step": "read_short_circuit_run"},
        {"step": "build_protection_input"},
        {"step": "persist_skeleton_run"},
    ]
    return {"steps": steps}


def _build_deterministic_run_id(
    protection_input: ProtectionInput, outputs: dict[str, Any]
) -> str:
    payload = {
        "analysis_type": "protection.overcurrent.v0",
        "inputs": protection_input.to_dict(),
        "outputs": canonicalize_json(outputs),
    }
    fingerprint = fingerprint_json(payload)
    return f"protection.overcurrent.v0:{fingerprint}"


def _persist_run_index(
    envelope: AnalysisRunEnvelope,
    protection_input: ProtectionInput,
    *,
    uow_factory,
) -> None:
    entry = index_run(
        envelope,
        primary_artifact_type="protection_input",
        primary_artifact_id=envelope.artifacts[0].id,
        base_snapshot_id=protection_input.base_snapshot_id,
        case_id=protection_input.case_id,
        status="SKELETON",
        meta={"source_run_id": protection_input.source_run_id},
    )
    with uow_factory() as uow:
        if uow.analysis_runs_index.get(entry.run_id) is None:
            uow.analysis_runs_index.add(entry)
