from __future__ import annotations

from typing import Any

from analysis.power_flow._internal import build_slack_island, options_to_trace, validate_input
from analysis.power_flow.result import PowerFlowResult
from analysis.power_flow.types import PowerFlowInput

from .pv_limits_checks import collect_pv_to_pq_switches


def build_white_box_trace(
    *,
    pf_input: PowerFlowInput,
    result: PowerFlowResult,
    violations: list[dict[str, Any]],
    violations_summary: dict[str, Any],
) -> dict[str, Any]:
    graph = pf_input.typed_graph()
    solver_trace = result.solver_trace or {}
    islands = solver_trace.get("islands") or {}

    slack_island_nodes = islands.get("slack_island_nodes")
    not_solved_nodes = islands.get("not_solved_island_nodes")
    if slack_island_nodes is None or not_solved_nodes is None:
        slack_island_nodes, not_solved_nodes = build_slack_island(
            graph, pf_input.slack.node_id
        )

    if pf_input.options.validate:
        validation_warnings, validation_errors = validate_input(pf_input)
    else:
        validation_warnings, validation_errors = [], []

    applied_taps = solver_trace.get("applied_taps", [])
    applied_shunts = solver_trace.get("applied_shunts", [])
    pv_to_pq_switches = collect_pv_to_pq_switches(result.pv_to_pq_switches)

    power_balance = solver_trace.get("power_balance", {})
    sum_pq_spec = power_balance.get("sum_pq_spec_pu", 0.0 + 0.0j)
    slack_power = power_balance.get("slack_power_pu", 0.0 + 0.0j)
    losses_total = power_balance.get("losses_total_pu", 0.0 + 0.0j)
    branch_flow_note = power_balance.get("branch_flow_note", "")

    if branch_flow_note:
        balance_note = (
            "Power balance uses slack and PQ specs only; branch losses not computed."
        )
    else:
        balance_error = (slack_power + sum_pq_spec) - losses_total
        balance_note = (
            "Balance check: slack + PQ specs - losses = "
            f"{balance_error.real:.6g}+j{balance_error.imag:.6g} pu."
        )

    white_box_trace: dict[str, Any] = {
        "options": options_to_trace(pf_input.options),
        "validation": {
            "warnings": sorted(validation_warnings),
            "errors": sorted(validation_errors),
        },
        "islands": {
            "slack_island_nodes": sorted(slack_island_nodes),
            "not_solved_island_nodes": sorted(not_solved_nodes),
        },
        "ybus": solver_trace.get("ybus", {}),
        "nr_iterations": solver_trace.get("nr_iterations", []),
        "v2_functions_used": [
            "build_power_spec_v2" if pf_input.pv else "build_power_spec",
            "newton_raphson_solve_v2" if pf_input.pv else "newton_raphson_solve",
            "build_ybus_pu",
            "apply_shunts_pu",
            "apply_tap_ratio",
            "compute_branch_flows",
            "build_violations",
        ],
        "v2_feature_flags": {
            "pv_enabled": bool(pf_input.pv),
            "q_limits": bool(pf_input.pv),
            "tap_enabled": bool(applied_taps),
            "shunts_enabled": bool(applied_shunts),
            "violations_enabled": bool(pf_input.bus_limits or pf_input.branch_limits),
            "units_enabled": any(
                graph.nodes[node_id].voltage_level > 0 for node_id in slack_island_nodes
            ),
        },
        "source_of_data": {
            "p_spec": "overlay.pq + overlay.pv",
            "q_spec": "overlay.pq",
            "pv_voltage_setpoints": "overlay.pv",
            "pv_q_limits": "overlay.pv",
            "shunts": "overlay.shunts",
            "taps": "core.transformer.tap_position when non-zero; overlay.taps otherwise",
            "bus_limits": "overlay.bus_limits",
            "branch_limits": "overlay.branch_limits + core.ratings",
            "voltage_base": "core.node.voltage_level",
        },
        "pv_to_pq_switches": pv_to_pq_switches,
        "applied_taps": applied_taps,
        "applied_shunts": applied_shunts,
        "power_balance": {
            "sum_pq_spec_pu": sum_pq_spec,
            "slack_power_pu": slack_power,
            "losses_total_pu": losses_total,
            "balance_check_note": balance_note,
        },
        "violations_summary": violations_summary,
    }

    if branch_flow_note:
        white_box_trace["power_balance"]["balance_check_note"] = (
            balance_note + " " + branch_flow_note
        )

    missing_voltage_base_nodes = [
        node_id
        for node_id in slack_island_nodes
        if not graph.nodes[node_id].voltage_level
        or graph.nodes[node_id].voltage_level <= 0
    ]
    if missing_voltage_base_nodes:
        white_box_trace["units"] = {
            "missing_voltage_level_nodes": sorted(missing_voltage_base_nodes),
            "note": "kV/kA conversions unavailable where voltage_level is missing or zero.",
        }

    return white_box_trace
