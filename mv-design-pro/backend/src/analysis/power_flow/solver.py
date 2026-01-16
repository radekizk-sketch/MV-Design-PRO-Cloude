from __future__ import annotations

from typing import Any

import numpy as np

from network_model.core.branch import LineBranch, TransformerBranch
from network_model.core.graph import NetworkGraph

from ._internal import (
    build_initial_voltage,
    build_power_spec,
    build_power_spec_v2,
    build_slack_island,
    build_ybus_pu,
    compute_branch_flows,
    compute_power_injections,
    newton_raphson_solve,
    newton_raphson_solve_v2,
    options_to_trace,
    validate_input,
)
from .result import PowerFlowResult
from .types import PowerFlowInput


class PowerFlowSolver:
    def solve(self, pf_input: PowerFlowInput) -> PowerFlowResult:
        graph: NetworkGraph = pf_input.typed_graph()
        options = pf_input.options

        validation_warnings: list[str] = []
        validation_errors: list[str] = []

        if options.validate:
            validation_warnings, validation_errors = validate_input(pf_input)
            if validation_errors:
                raise ValueError("; ".join(validation_errors))

        slack_island_nodes, not_solved_nodes = build_slack_island(
            graph, pf_input.slack.node_id
        )

        if not slack_island_nodes:
            raise ValueError("Slack island could not be determined.")

        tap_ratios = {
            spec.branch_id: spec.tap_ratio for spec in pf_input.taps
        }

        ybus_pu, node_index_map, ybus_trace, applied_taps, applied_shunts = build_ybus_pu(
            graph,
            slack_island_nodes,
            pf_input.base_mva,
            pf_input.slack.node_id,
            pf_input.shunts,
            tap_ratios,
        )

        slack_index = node_index_map[pf_input.slack.node_id]
        node_index_to_id = {idx: node_id for node_id, idx in node_index_map.items()}

        pq_node_ids = [spec.node_id for spec in pf_input.pq if spec.node_id in node_index_map]
        pv_node_ids = [spec.node_id for spec in pf_input.pv if spec.node_id in node_index_map]
        pq_indices = sorted([node_index_map[node_id] for node_id in pq_node_ids])
        pv_indices = sorted([node_index_map[node_id] for node_id in pv_node_ids])

        v0 = build_initial_voltage(
            slack_island_nodes,
            pf_input.slack.node_id,
            pf_input.slack.u_pu,
            pf_input.slack.angle_rad,
            options,
            graph,
        )

        if pv_indices:
            p_spec, q_spec, pv_setpoints, pv_q_limits = build_power_spec_v2(
                slack_island_nodes, pf_input.base_mva, pf_input.pq, pf_input.pv
            )
            for idx, u_pu in pv_setpoints.items():
                v0[idx] = u_pu * np.exp(1j * np.angle(v0[idx]))
            (
                v,
                converged,
                iterations,
                max_mismatch,
                nr_trace,
                pv_to_pq_switches,
            ) = newton_raphson_solve_v2(
                ybus_pu,
                slack_index,
                pq_indices,
                pv_indices,
                p_spec,
                q_spec,
                pv_setpoints,
                pv_q_limits,
                v0,
                options,
                pf_input.base_mva,
                node_index_to_id,
            )
        else:
            p_spec, q_spec = build_power_spec(
                slack_island_nodes, pf_input.base_mva, pf_input.pq
            )
            pv_to_pq_switches = []
            if pq_indices:
                v, converged, iterations, max_mismatch, nr_trace = newton_raphson_solve(
                    ybus_pu,
                    slack_index,
                    pq_indices,
                    p_spec,
                    q_spec,
                    v0,
                    options,
                )
            else:
                v = v0
                converged = True
                iterations = 0
                max_mismatch = 0.0
                nr_trace = []

        if not converged:
            if nr_trace:
                if "cause_if_failed_optional" not in nr_trace[-1]:
                    nr_trace[-1]["cause_if_failed_optional"] = "max_iter"
            else:
                nr_trace.append(
                    {
                        "iter": iterations,
                        "max_mismatch_pu": max_mismatch,
                        "mismatch_norm": 0.0,
                        "step_norm": 0.0,
                        "damping_used": float(options.damping),
                        "cause_if_failed_optional": "max_iter",
                    }
                )

        node_voltage = {
            node_id: v[node_index_map[node_id]]
            for node_id in slack_island_nodes
        }
        node_u_mag = {node_id: float(abs(voltage)) for node_id, voltage in node_voltage.items()}
        node_angle = {node_id: float(np.angle(voltage)) for node_id, voltage in node_voltage.items()}

        slack_voltage_kv = graph.nodes[pf_input.slack.node_id].voltage_level
        (
            branch_current,
            branch_s_from,
            branch_s_to,
            losses_total,
            branch_flow_note,
        ) = compute_branch_flows(
            graph,
            node_voltage,
            pf_input.base_mva,
            slack_voltage_kv,
            {entry["branch_id"]: entry["tap_ratio"] for entry in applied_taps},
        )

        node_voltage_kv: dict[str, float] = {}
        missing_voltage_base_nodes: list[str] = []
        for node_id, voltage in node_voltage.items():
            voltage_level = graph.nodes[node_id].voltage_level
            if voltage_level and voltage_level > 0:
                node_voltage_kv[node_id] = float(abs(voltage) * voltage_level)
            else:
                missing_voltage_base_nodes.append(node_id)

        branch_current_ka: dict[str, float] = {}
        for branch_id, current_pu in branch_current.items():
            branch = graph.branches[branch_id]
            voltage_level = graph.nodes[branch.from_node_id].voltage_level
            if voltage_level and voltage_level > 0:
                i_base_ka = pf_input.base_mva / (np.sqrt(3) * voltage_level)
                branch_current_ka[branch_id] = float(abs(current_pu) * i_base_ka)

        branch_s_from_mva = {
            branch_id: value * pf_input.base_mva
            for branch_id, value in branch_s_from.items()
        }
        branch_s_to_mva = {
            branch_id: value * pf_input.base_mva
            for branch_id, value in branch_s_to.items()
        }

        p_calc, q_calc = compute_power_injections(ybus_pu, v)
        slack_power = complex(p_calc[slack_index], q_calc[slack_index])
        sum_pq_spec = complex(float(np.sum(p_spec)), float(np.sum(q_spec)))

        if branch_flow_note:
            balance_note = (
                "Power balance uses slack and PQ specs only; branch losses not computed."
            )
            losses_total = 0.0 + 0.0j
        else:
            balance_error = (slack_power + sum_pq_spec) - losses_total
            balance_note = (
                "Balance check: slack + PQ specs - losses = "
                f"{balance_error.real:.6g}+j{balance_error.imag:.6g} pu."
            )

        white_box_trace: dict[str, Any] = {
            "options": options_to_trace(options),
            "validation": {
                "warnings": sorted(validation_warnings),
                "errors": sorted(validation_errors),
            },
            "islands": {
                "slack_island_nodes": sorted(slack_island_nodes),
                "not_solved_island_nodes": sorted(not_solved_nodes),
            },
            "ybus": ybus_trace,
            "nr_iterations": nr_trace,
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
        }

        if branch_flow_note:
            white_box_trace["power_balance"]["balance_check_note"] = (
                balance_note + " " + branch_flow_note
            )

        violations = _build_violations(
            node_u_mag,
            pf_input.bus_limits,
            branch_s_from_mva,
            branch_s_to_mva,
            branch_current_ka,
            pf_input.branch_limits,
            graph,
        )

        white_box_trace["violations_summary"] = _summarize_violations(violations)
        if missing_voltage_base_nodes:
            white_box_trace["units"] = {
                "missing_voltage_level_nodes": sorted(missing_voltage_base_nodes),
                "note": "kV/kA conversions unavailable where voltage_level is missing or zero.",
            }

        return PowerFlowResult(
            converged=converged,
            iterations=iterations,
            tolerance=options.tolerance,
            max_mismatch_pu=max_mismatch,
            base_mva=pf_input.base_mva,
            slack_node_id=pf_input.slack.node_id,
            node_voltage_pu=node_voltage,
            node_u_mag_pu=node_u_mag,
            node_angle_rad=node_angle,
            branch_current_pu=branch_current,
            branch_s_from_pu=branch_s_from,
            branch_s_to_pu=branch_s_to,
            node_voltage_kv=node_voltage_kv,
            branch_current_ka=branch_current_ka,
            branch_s_from_mva=branch_s_from_mva,
            branch_s_to_mva=branch_s_to_mva,
            violations=violations,
            pv_to_pq_switches=pv_to_pq_switches,
            losses_total_pu=losses_total,
            slack_power_pu=slack_power,
            white_box_trace=white_box_trace,
        )


def solve_power_flow(pf_input: PowerFlowInput) -> PowerFlowResult:
    return PowerFlowSolver().solve(pf_input)


def _build_violations(
    node_u_mag_pu: dict[str, float],
    bus_limits: list[Any],
    branch_s_from_mva: dict[str, complex],
    branch_s_to_mva: dict[str, complex],
    branch_current_ka: dict[str, float],
    branch_limits: list[Any],
    graph: NetworkGraph,
) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []

    for limit in bus_limits:
        if limit.node_id not in node_u_mag_pu:
            continue
        value = node_u_mag_pu[limit.node_id]
        if value < limit.u_min_pu:
            violations.append(
                {
                    "type": "bus_voltage",
                    "id": limit.node_id,
                    "value": float(value),
                    "limit": float(limit.u_min_pu),
                    "severity": float(value / limit.u_min_pu),
                    "direction": "under",
                }
            )
        if value > limit.u_max_pu:
            violations.append(
                {
                    "type": "bus_voltage",
                    "id": limit.node_id,
                    "value": float(value),
                    "limit": float(limit.u_max_pu),
                    "severity": float(value / limit.u_max_pu),
                    "direction": "over",
                }
            )

    branch_limit_map = {limit.branch_id: limit for limit in branch_limits}

    for branch_id, branch in graph.branches.items():
        if not branch.in_service:
            continue
        if branch_id not in branch_s_from_mva and branch_id not in branch_s_to_mva:
            continue
        s_limit = None
        i_limit = None

        if branch_id in branch_limit_map:
            spec = branch_limit_map[branch_id]
            s_limit = spec.s_max_mva
            i_limit = spec.i_max_ka
        else:
            if isinstance(branch, TransformerBranch) and branch.rated_power_mva > 0:
                s_limit = branch.rated_power_mva
            if isinstance(branch, LineBranch) and branch.rated_current_a > 0:
                i_limit = branch.rated_current_a / 1000.0

        if s_limit is not None:
            s_from = abs(branch_s_from_mva.get(branch_id, 0.0 + 0.0j))
            s_to = abs(branch_s_to_mva.get(branch_id, 0.0 + 0.0j))
            s_value = max(s_from, s_to)
            if s_value > s_limit:
                violations.append(
                    {
                        "type": "branch_loading",
                        "id": branch_id,
                        "value": float(s_value),
                        "limit": float(s_limit),
                        "severity": float(s_value / s_limit),
                        "direction": "over",
                    }
                )

        if i_limit is not None and branch_id in branch_current_ka:
            i_value = branch_current_ka[branch_id]
            if i_value > i_limit:
                violations.append(
                    {
                        "type": "branch_current",
                        "id": branch_id,
                        "value": float(i_value),
                        "limit": float(i_limit),
                        "severity": float(i_value / i_limit),
                        "direction": "over",
                    }
                )

    violations.sort(key=lambda item: item["severity"], reverse=True)
    return violations


def _summarize_violations(violations: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {"count": len(violations), "by_type": {}}
    for violation in violations:
        summary["by_type"].setdefault(violation["type"], 0)
        summary["by_type"][violation["type"]] += 1
    summary["top"] = violations[:3]
    return summary
