from __future__ import annotations

from typing import Any

from analysis.power_flow.result import PowerFlowResult
from analysis.power_flow.types import PowerFlowInput

from .branch_loading_checks import build_branch_violations
from .trace_builder import build_white_box_trace
from .violations import merge_and_sort_violations, summarize_violations
from .voltage_checks import build_voltage_violations


def analyze_power_flow(
    pf_input: PowerFlowInput, result: PowerFlowResult
) -> dict[str, Any]:
    graph = pf_input.typed_graph()
    voltage_violations = build_voltage_violations(
        result.node_u_mag_pu,
        pf_input.bus_limits,
    )
    branch_violations = build_branch_violations(
        result.branch_s_from_mva,
        result.branch_s_to_mva,
        result.branch_current_ka,
        pf_input.branch_limits,
        graph,
    )
    violations = merge_and_sort_violations([voltage_violations, branch_violations])
    violations_summary = summarize_violations(violations)
    white_box_trace = build_white_box_trace(
        pf_input=pf_input,
        result=result,
        violations=violations,
        violations_summary=violations_summary,
    )
    return {
        "violations": violations,
        "white_box_trace": white_box_trace,
    }


__all__ = ["analyze_power_flow"]
