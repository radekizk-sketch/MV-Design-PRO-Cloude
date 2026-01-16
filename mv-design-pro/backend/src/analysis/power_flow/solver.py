from __future__ import annotations

from typing import Any

import numpy as np

from network_model.core.graph import NetworkGraph

from ._internal import (
    build_initial_voltage,
    build_power_spec,
    build_slack_island,
    build_ybus_pu,
    compute_branch_flows,
    compute_power_injections,
    newton_raphson_solve,
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

        ybus_pu, node_index_map, ybus_trace = build_ybus_pu(
            graph,
            slack_island_nodes,
            pf_input.base_mva,
            pf_input.slack.node_id,
        )

        p_spec, q_spec = build_power_spec(
            slack_island_nodes, pf_input.base_mva, pf_input.pq
        )

        slack_index = node_index_map[pf_input.slack.node_id]
        pq_node_ids = [
            node_id for node_id in slack_island_nodes if node_id != pf_input.slack.node_id
        ]
        pq_indices = [node_index_map[node_id] for node_id in pq_node_ids]

        v0 = build_initial_voltage(
            slack_island_nodes,
            pf_input.slack.node_id,
            pf_input.slack.u_pu,
            pf_input.slack.angle_rad,
            options,
            graph,
        )

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
        )

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
            losses_total_pu=losses_total,
            slack_power_pu=slack_power,
            white_box_trace=white_box_trace,
        )


def solve_power_flow(pf_input: PowerFlowInput) -> PowerFlowResult:
    return PowerFlowSolver().solve(pf_input)
