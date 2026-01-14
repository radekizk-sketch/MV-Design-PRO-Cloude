"""Tests for IEC 60909 short-circuit solver (3-phase Ik'')."""

import math

import numpy as np
import pytest

from network_model.core.branch import BranchType, TransformerBranch
from network_model.core.graph import NetworkGraph
from network_model.core.node import Node, NodeType
from network_model.core.ybus import AdmittanceMatrixBuilder
from network_model.solvers.short_circuit_iec60909 import ShortCircuitIEC60909Solver


def create_pq_node(node_id: str, voltage_level: float) -> Node:
    return Node(
        id=node_id,
        name=f"Node {node_id}",
        node_type=NodeType.PQ,
        voltage_level=voltage_level,
        active_power=5.0,
        reactive_power=2.0,
    )


def create_transformer_branch(
    branch_id: str,
    from_node_id: str,
    to_node_id: str,
    rated_power_mva: float,
    voltage_hv_kv: float,
    voltage_lv_kv: float,
    uk_percent: float,
    pk_kw: float,
    in_service: bool = True,
) -> TransformerBranch:
    return TransformerBranch(
        id=branch_id,
        name=f"Transformer {branch_id}",
        branch_type=BranchType.TRANSFORMER,
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        in_service=in_service,
        rated_power_mva=rated_power_mva,
        voltage_hv_kv=voltage_hv_kv,
        voltage_lv_kv=voltage_lv_kv,
        uk_percent=uk_percent,
        pk_kw=pk_kw,
        i0_percent=0.0,
        p0_kw=0.0,
        vector_group="Dyn11",
        tap_position=0,
        tap_step_percent=2.5,
    )


def build_transformer_only_graph() -> NetworkGraph:
    graph = NetworkGraph()
    graph.add_node(create_pq_node("A", 110.0))
    graph.add_node(create_pq_node("B", 20.0))

    transformer = create_transformer_branch(
        "T1",
        "A",
        "B",
        rated_power_mva=25.0,
        voltage_hv_kv=110.0,
        voltage_lv_kv=20.0,
        uk_percent=10.0,
        pk_kw=120.0,
    )
    graph.add_branch(transformer)
    return graph


def test_ikss_3ph_transformer_only_matches_formula():
    graph = build_transformer_only_graph()
    c_factor = 1.1

    builder = AdmittanceMatrixBuilder(graph)
    y_bus = builder.build()
    z_bus = np.linalg.inv(y_bus)

    node_index = builder.node_id_to_index["B"]
    zkk = z_bus[node_index, node_index]
    un_v = graph.nodes["B"].voltage_level * 1000.0
    ikss_expected = (c_factor * un_v) / (math.sqrt(3.0) * abs(zkk))

    result = ShortCircuitIEC60909Solver.compute_ikss_3ph(
        graph=graph,
        fault_node_id="B",
        c_factor=c_factor,
    )

    assert np.isclose(result.ikss_a, ikss_expected)


def test_ikss_increases_with_c_factor():
    graph = build_transformer_only_graph()

    result_cmin = ShortCircuitIEC60909Solver.compute_ikss_3ph(
        graph=graph,
        fault_node_id="B",
        c_factor=0.95,
    )
    result_cmax = ShortCircuitIEC60909Solver.compute_ikss_3ph(
        graph=graph,
        fault_node_id="B",
        c_factor=1.10,
    )

    assert result_cmax.ikss_a > result_cmin.ikss_a


def test_invalid_fault_node_raises():
    graph = build_transformer_only_graph()

    with pytest.raises(ValueError, match="Fault node"):
        ShortCircuitIEC60909Solver.compute_ikss_3ph(
            graph=graph,
            fault_node_id="missing",
            c_factor=1.0,
        )


@pytest.mark.parametrize("c_factor", [0.0, -0.5])
def test_nonpositive_c_factor_raises(c_factor: float):
    graph = build_transformer_only_graph()

    with pytest.raises(ValueError, match="c_factor must be > 0"):
        ShortCircuitIEC60909Solver.compute_ikss_3ph(
            graph=graph,
            fault_node_id="B",
            c_factor=c_factor,
        )
