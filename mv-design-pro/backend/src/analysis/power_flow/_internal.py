from __future__ import annotations

from dataclasses import asdict
from typing import Any, Iterable, Tuple

import numpy as np

from network_model.core.branch import Branch, LineBranch, TransformerBranch
from network_model.core.graph import NetworkGraph
from network_model.core.ybus import AdmittanceMatrixBuilder

from .types import PowerFlowInput, PowerFlowOptions, PQSpec


def validate_input(pf_input: PowerFlowInput) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    errors: list[str] = []

    if pf_input.base_mva <= 0:
        errors.append("base_mva must be > 0")

    graph = pf_input.typed_graph()
    if pf_input.slack.node_id not in graph.nodes:
        errors.append(f"slack node '{pf_input.slack.node_id}' not in graph")

    seen = set()
    duplicates = set()
    for spec in pf_input.pq:
        if spec.node_id in seen:
            duplicates.add(spec.node_id)
        seen.add(spec.node_id)
    if duplicates:
        errors.append(
            "duplicate PQSpec.node_id entries: " + ", ".join(sorted(duplicates))
        )

    if pf_input.slack.u_pu < 0.8 or pf_input.slack.u_pu > 1.2:
        warnings.append(
            "slack.u_pu outside typical range [0.8, 1.2]"
        )

    return warnings, errors


def build_slack_island(
    graph: NetworkGraph, slack_node_id: str
) -> tuple[list[str], list[str]]:
    islands = graph.find_islands()
    slack_island: list[str] = []
    for island in islands:
        if slack_node_id in island:
            slack_island = island
            break
    if not slack_island:
        return [], sorted(graph.nodes.keys())

    slack_island_set = set(slack_island)
    not_solved = sorted([node_id for node_id in graph.nodes if node_id not in slack_island_set])
    return sorted(slack_island), not_solved


def build_ybus_pu(
    graph: NetworkGraph,
    slack_island_nodes: Iterable[str],
    base_mva: float,
    slack_node_id: str,
) -> tuple[np.ndarray, dict[str, int], dict[str, Any]]:
    builder = AdmittanceMatrixBuilder(graph)
    ybus_ohm = builder.build()
    node_id_to_index_full = builder.node_id_to_index

    slack_voltage_kv = graph.nodes[slack_node_id].voltage_level
    ybus_note = ""
    ybus_source = "network_model.core.AdmittanceMatrixBuilder"

    if slack_voltage_kv and slack_voltage_kv > 0:
        z_base = (slack_voltage_kv ** 2) / base_mva
        ybus_pu_full = ybus_ohm * z_base
    else:
        ybus_note = "Slack node voltage_level missing or zero; Ybus treated as per-unit."
        ybus_pu_full = ybus_ohm

    island_nodes_sorted = sorted(slack_island_nodes)
    island_indices = [node_id_to_index_full[node_id] for node_id in island_nodes_sorted]
    ybus_pu = ybus_pu_full[np.ix_(island_indices, island_indices)]
    node_id_to_index = {
        node_id: idx for idx, node_id in enumerate(island_nodes_sorted)
    }

    trace_info = {
        "source": ybus_source,
        "n": int(len(island_nodes_sorted)),
        "node_index_map": node_id_to_index,
        "note": ybus_note,
    }

    return ybus_pu, node_id_to_index, trace_info


def build_power_spec(
    island_nodes: Iterable[str],
    base_mva: float,
    pq_specs: Iterable[PQSpec],
) -> tuple[np.ndarray, np.ndarray]:
    node_list = list(island_nodes)
    p_spec = np.zeros(len(node_list), dtype=float)
    q_spec = np.zeros(len(node_list), dtype=float)
    node_index_map = {node_id: idx for idx, node_id in enumerate(node_list)}

    for spec in pq_specs:
        if spec.node_id not in node_index_map:
            continue
        idx = node_index_map[spec.node_id]
        p_spec[idx] = -spec.p_mw / base_mva
        q_spec[idx] = -spec.q_mvar / base_mva

    return p_spec, q_spec


def build_initial_voltage(
    nodes: Iterable[str],
    slack_node_id: str,
    slack_u_pu: float,
    slack_angle_rad: float,
    options: PowerFlowOptions,
    graph: NetworkGraph,
) -> np.ndarray:
    node_list = list(nodes)
    size = len(node_list)
    v = np.ones(size, dtype=complex)
    node_index_map = {node_id: idx for idx, node_id in enumerate(node_list)}

    if not options.flat_start:
        for node_id, idx in node_index_map.items():
            node = graph.nodes[node_id]
            mag = node.voltage_magnitude if node.voltage_magnitude is not None else 1.0
            angle = node.voltage_angle if node.voltage_angle is not None else 0.0
            v[idx] = mag * np.exp(1j * angle)

    slack_idx = node_index_map[slack_node_id]
    v[slack_idx] = slack_u_pu * np.exp(1j * slack_angle_rad)
    return v


def compute_power_injections(ybus: np.ndarray, v: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    i_inj = ybus @ v
    s_inj = v * np.conj(i_inj)
    return s_inj.real, s_inj.imag


def build_jacobian(
    ybus: np.ndarray,
    v: np.ndarray,
    pq_indices: list[int],
    p_calc: np.ndarray,
    q_calc: np.ndarray,
) -> np.ndarray:
    g = ybus.real
    b = ybus.imag
    n_pq = len(pq_indices)
    j11 = np.zeros((n_pq, n_pq))
    j12 = np.zeros((n_pq, n_pq))
    j21 = np.zeros((n_pq, n_pq))
    j22 = np.zeros((n_pq, n_pq))

    v_mag = np.abs(v)
    v_ang = np.angle(v)

    for row, i in enumerate(pq_indices):
        for col, k in enumerate(pq_indices):
            theta = v_ang[i] - v_ang[k]
            if i == k:
                j11[row, col] = -q_calc[i] - b[i, i] * v_mag[i] ** 2
                j21[row, col] = p_calc[i] - g[i, i] * v_mag[i] ** 2
                j12[row, col] = p_calc[i] / v_mag[i] + g[i, i] * v_mag[i]
                j22[row, col] = q_calc[i] / v_mag[i] - b[i, i] * v_mag[i]
            else:
                sin_t = np.sin(theta)
                cos_t = np.cos(theta)
                j11[row, col] = v_mag[i] * v_mag[k] * (
                    g[i, k] * sin_t - b[i, k] * cos_t
                )
                j21[row, col] = -v_mag[i] * v_mag[k] * (
                    g[i, k] * cos_t + b[i, k] * sin_t
                )
                j12[row, col] = v_mag[i] * (
                    g[i, k] * cos_t + b[i, k] * sin_t
                )
                j22[row, col] = v_mag[i] * (
                    g[i, k] * sin_t - b[i, k] * cos_t
                )

    top = np.hstack([j11, j12])
    bottom = np.hstack([j21, j22])
    return np.vstack([top, bottom])


def newton_raphson_solve(
    ybus: np.ndarray,
    slack_index: int,
    pq_indices: list[int],
    p_spec: np.ndarray,
    q_spec: np.ndarray,
    v0: np.ndarray,
    options: PowerFlowOptions,
) -> tuple[np.ndarray, bool, int, float, list[dict[str, Any]]]:
    v = v0.copy()
    trace: list[dict[str, Any]] = []
    converged = False
    max_mismatch = 0.0

    for iteration in range(1, options.max_iter + 1):
        p_calc, q_calc = compute_power_injections(ybus, v)
        d_p = p_spec[pq_indices] - p_calc[pq_indices]
        d_q = q_spec[pq_indices] - q_calc[pq_indices]

        max_mismatch = float(np.max(np.abs(np.concatenate([d_p, d_q]))))
        mismatch_norm = float(np.linalg.norm(np.concatenate([d_p, d_q])))

        if max_mismatch < options.tolerance:
            converged = True
            trace.append(
                {
                    "iter": iteration,
                    "max_mismatch_pu": max_mismatch,
                    "mismatch_norm": mismatch_norm,
                    "step_norm": 0.0,
                    "damping_used": float(options.damping),
                }
            )
            break

        jacobian = build_jacobian(ybus, v, pq_indices, p_calc, q_calc)
        try:
            step = np.linalg.solve(jacobian, np.concatenate([d_p, d_q]))
        except np.linalg.LinAlgError:
            trace.append(
                {
                    "iter": iteration,
                    "max_mismatch_pu": max_mismatch,
                    "mismatch_norm": mismatch_norm,
                    "step_norm": 0.0,
                    "damping_used": float(options.damping),
                    "cause_if_failed_optional": "singular_jacobian",
                }
            )
            break

        step *= options.damping
        step_norm = float(np.linalg.norm(step))

        v_mag = np.abs(v)
        v_ang = np.angle(v)
        n_pq = len(pq_indices)
        v_ang[pq_indices] += step[:n_pq]
        v_mag[pq_indices] += step[n_pq:]

        for idx in pq_indices:
            v[idx] = v_mag[idx] * np.exp(1j * v_ang[idx])
        v[slack_index] = v0[slack_index]

        trace.append(
            {
                "iter": iteration,
                "max_mismatch_pu": max_mismatch,
                "mismatch_norm": mismatch_norm,
                "step_norm": step_norm,
                "damping_used": float(options.damping),
            }
        )

    return v, converged, iteration, max_mismatch, trace


def compute_branch_flows(
    graph: NetworkGraph,
    node_voltage: dict[str, complex],
    base_mva: float,
    slack_voltage_kv: float,
) -> tuple[dict[str, complex], dict[str, complex], dict[str, complex], complex, str]:
    branch_current_pu: dict[str, complex] = {}
    branch_s_from_pu: dict[str, complex] = {}
    branch_s_to_pu: dict[str, complex] = {}
    losses_total_pu = 0.0 + 0.0j

    if not node_voltage:
        return branch_current_pu, branch_s_from_pu, branch_s_to_pu, losses_total_pu, ""

    if slack_voltage_kv <= 0:
        note = "Branch flow calculation skipped: slack voltage_level missing."
        return branch_current_pu, branch_s_from_pu, branch_s_to_pu, losses_total_pu, note

    z_base = (slack_voltage_kv ** 2) / base_mva

    for branch_id, branch in graph.branches.items():
        if not branch.in_service:
            continue
        if branch.from_node_id not in node_voltage:
            continue
        if branch.to_node_id not in node_voltage:
            continue

        y_series, y_shunt = _branch_admittance_pu(branch, z_base)
        if y_series is None:
            continue

        v_from = node_voltage[branch.from_node_id]
        v_to = node_voltage[branch.to_node_id]

        i_from = (v_from - v_to) * y_series + v_from * y_shunt
        i_to = (v_to - v_from) * y_series + v_to * y_shunt

        s_from = v_from * np.conj(i_from)
        s_to = v_to * np.conj(i_to)

        branch_current_pu[branch_id] = i_from
        branch_s_from_pu[branch_id] = s_from
        branch_s_to_pu[branch_id] = s_to
        losses_total_pu += s_from + s_to

    return branch_current_pu, branch_s_from_pu, branch_s_to_pu, losses_total_pu, ""


def _branch_admittance_pu(
    branch: Branch, z_base: float
) -> tuple[complex | None, complex | None]:
    if isinstance(branch, LineBranch):
        y_series = branch.get_series_admittance() * z_base
        y_shunt = branch.get_shunt_admittance_per_end() * z_base
        return y_series, y_shunt
    if isinstance(branch, TransformerBranch):
        impedance = branch.get_short_circuit_impedance_ohm_lv()
        if impedance == 0:
            return None, None
        y_series = (1.0 / impedance) * z_base
        return y_series, 0.0 + 0.0j
    return None, None


def options_to_trace(options: PowerFlowOptions) -> dict[str, Any]:
    return asdict(options)
