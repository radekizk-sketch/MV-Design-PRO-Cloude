from __future__ import annotations

import numpy as np

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
    validate_input,
)
from .analysis import assemble_power_flow_result
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
            iterations = int(options.max_iter)
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

        return assemble_power_flow_result(
            converged=converged,
            iterations=iterations,
            max_mismatch=max_mismatch,
            node_voltage=node_voltage,
            node_u_mag=node_u_mag,
            node_angle=node_angle,
            node_voltage_kv=node_voltage_kv,
            branch_current=branch_current,
            branch_s_from=branch_s_from,
            branch_s_to=branch_s_to,
            branch_current_ka=branch_current_ka,
            branch_s_from_mva=branch_s_from_mva,
            branch_s_to_mva=branch_s_to_mva,
            losses_total=losses_total,
            slack_power=slack_power,
            sum_pq_spec=sum_pq_spec,
            branch_flow_note=branch_flow_note,
            missing_voltage_base_nodes=missing_voltage_base_nodes,
            pf_input=pf_input,
            graph=graph,
            options=options,
            validation_warnings=validation_warnings,
            validation_errors=validation_errors,
            slack_island_nodes=slack_island_nodes,
            not_solved_nodes=not_solved_nodes,
            ybus_trace=ybus_trace,
            nr_trace=nr_trace,
            applied_taps=applied_taps,
            applied_shunts=applied_shunts,
            pv_to_pq_switches=pv_to_pq_switches,
        )


def solve_power_flow(pf_input: PowerFlowInput) -> PowerFlowResult:
    return PowerFlowSolver().solve(pf_input)
