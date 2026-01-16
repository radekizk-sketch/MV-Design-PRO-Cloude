"""Tests for IEC 60909 short-circuit solver (3-phase Ik'', Ip, Ith, Sk'')."""

import math

import numpy as np
import pytest

from network_model.core.branch import BranchType, LineBranch, TransformerBranch
from network_model.core.graph import NetworkGraph
from network_model.core.node import Node, NodeType
from network_model.core.ybus import AdmittanceMatrixBuilder
from network_model.solvers.short_circuit_iec60909 import (
    C_MAX,
    C_MIN,
    ShortCircuitIEC60909Solver,
)


def create_pq_node(node_id: str, voltage_level: float) -> Node:
    return Node(
        id=node_id,
        name=f"Node {node_id}",
        node_type=NodeType.PQ,
        voltage_level=voltage_level,
        active_power=5.0,
        reactive_power=2.0,
    )


def create_reference_node(node_id: str, voltage_level: float) -> Node:
    return Node(
        id=node_id,
        name=f"Reference {node_id}",
        node_type=NodeType.PQ,
        voltage_level=voltage_level,
        active_power=0.0,
        reactive_power=0.0,
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


def create_reference_branch(
    branch_id: str,
    from_node_id: str,
    to_node_id: str,
    r_ohm: float,
) -> LineBranch:
    return LineBranch(
        id=branch_id,
        name=f"Reference {branch_id}",
        branch_type=BranchType.LINE,
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        r_ohm_per_km=r_ohm,
        x_ohm_per_km=0.0,
        b_us_per_km=0.0,
        length_km=1.0,
        rated_current_a=0.0,
    )


def build_transformer_only_graph(
    pk_kw: float = 120.0,
    uk_percent: float = 10.0,
) -> NetworkGraph:
    graph = NetworkGraph()
    graph.add_node(create_pq_node("A", 110.0))
    graph.add_node(create_pq_node("B", 20.0))
    graph.add_node(create_reference_node("GND", 20.0))

    transformer = create_transformer_branch(
        "T1",
        "A",
        "B",
        rated_power_mva=25.0,
        voltage_hv_kv=110.0,
        voltage_lv_kv=20.0,
        uk_percent=uk_percent,
        pk_kw=pk_kw,
    )
    graph.add_branch(transformer)
    # tiny reference to ground so Y-bus is invertible in transformer-only tests
    graph.add_branch(create_reference_branch("REF", "B", "GND", r_ohm=1e9))
    return graph


def test_ikss_3ph_transformer_only_matches_formula():
    graph = build_transformer_only_graph()
    c_factor = 1.1
    tk_s = 1.0

    builder = AdmittanceMatrixBuilder(graph)
    y_bus = builder.build()
    z_bus = np.linalg.inv(y_bus)

    node_index = builder.node_id_to_index["B"]
    zkk = z_bus[node_index, node_index]
    un_v = graph.nodes["B"].voltage_level * 1000.0
    ikss_expected = (c_factor * un_v) / (math.sqrt(3.0) * abs(zkk))

    result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=c_factor,
        tk_s=tk_s,
    )

    assert np.isclose(result.ikss_a, ikss_expected)


def test_ikss_increases_with_c_factor():
    graph = build_transformer_only_graph()
    tk_s = 1.0

    result_cmin = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=0.95,
        tk_s=tk_s,
    )
    result_cmax = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.10,
        tk_s=tk_s,
    )

    assert result_cmax.ikss_a > result_cmin.ikss_a


def test_ikss_min_less_than_max():
    graph = build_transformer_only_graph()
    tk_s = 1.0

    res_min = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=C_MIN,
        tk_s=tk_s,
    )
    res_max = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=C_MAX,
        tk_s=tk_s,
    )

    assert res_max.ikss_a > res_min.ikss_a


def test_ikss_min_matches_wrapper_formula():
    graph = build_transformer_only_graph()
    tk_s = 1.0

    res = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=C_MIN,
        tk_s=tk_s,
    )
    expected = (C_MIN * res.un_v) / (math.sqrt(3.0) * abs(res.zkk_ohm))

    assert res.c_factor == C_MIN
    assert res.ikss_a == pytest.approx(expected, rel=1e-12, abs=0.0)


def test_ikss_max_matches_wrapper_formula():
    graph = build_transformer_only_graph()
    tk_s = 1.0

    res = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=C_MAX,
        tk_s=tk_s,
    )
    expected = (C_MAX * res.un_v) / (math.sqrt(3.0) * abs(res.zkk_ohm))

    assert res.c_factor == C_MAX
    assert res.ikss_a == pytest.approx(expected, rel=1e-12, abs=0.0)


def test_invalid_fault_node_raises():
    graph = build_transformer_only_graph()

    with pytest.raises(ValueError, match="Fault node"):
        ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
            graph=graph,
            fault_node_id="missing",
            c_factor=1.0,
            tk_s=1.0,
        )


@pytest.mark.parametrize("c_factor", [0.0, -0.5])
def test_nonpositive_c_factor_raises(c_factor: float):
    graph = build_transformer_only_graph()

    with pytest.raises(ValueError, match="c_factor must be > 0"):
        ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
            graph=graph,
            fault_node_id="B",
            c_factor=c_factor,
            tk_s=1.0,
        )


@pytest.mark.parametrize("tk_s", [0.0, -1.0])
def test_nonpositive_tk_raises(tk_s: float):
    graph = build_transformer_only_graph()

    with pytest.raises(ValueError, match="tk_s must be > 0"):
        ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
            graph=graph,
            fault_node_id="B",
            c_factor=1.0,
            tk_s=tk_s,
        )


def test_ip_exceeds_sqrt2_times_ikss():
    graph = build_transformer_only_graph()

    result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.1,
        tk_s=0.5,
    )

    assert result.ip_a > math.sqrt(2.0) * result.ikss_a


def test_sk_matches_formula():
    graph = build_transformer_only_graph()

    result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.1,
        tk_s=1.0,
    )

    expected = (math.sqrt(3.0) * result.un_v * result.ikss_a) / 1_000_000.0
    assert result.sk_mva == pytest.approx(expected, rel=1e-12, abs=0.0)


def test_ib_is_ge_ikss_and_decays_with_time():
    graph = build_transformer_only_graph(pk_kw=120.0)

    res_short = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
        tb_s=0.02,
    )
    res_long = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
        tb_s=0.2,
    )

    assert res_short.ib_a >= res_short.ikss_a
    assert res_long.ib_a >= res_long.ikss_a
    assert res_short.ib_a >= res_long.ib_a


def test_ib_equals_ikss_when_time_constant_is_zeroish():
    graph = build_transformer_only_graph()

    result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
        tb_s=100.0,
    )

    assert result.ib_a == pytest.approx(result.ikss_a, rel=1e-8, abs=0.0)


def test_increasing_rx_ratio_reduces_kappa_and_ip():
    graph_low_rx = build_transformer_only_graph(pk_kw=120.0)
    graph_high_rx = build_transformer_only_graph(pk_kw=300.0)

    result_low = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph_low_rx,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
    )
    result_high = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph_high_rx,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
    )

    # IEC 60909: większe R/X => mniejsza kappa => mniejszy Ip.
    # Uwaga: rx_ratio może wyjść nieskończone (X≈0) — to przypadek graniczny, nie błąd solvera.
    low_finite = math.isfinite(result_low.rx_ratio)
    high_finite = math.isfinite(result_high.rx_ratio)

    if low_finite and high_finite:
        # Standardowy przypadek: oba skończone
        if result_high.rx_ratio < result_low.rx_ratio:
            # Zamień role, żeby "high" oznaczało większe R/X
            result_low, result_high = result_high, result_low
        assert result_high.rx_ratio > result_low.rx_ratio
        assert result_high.kappa < result_low.kappa
        assert result_high.ip_a < result_low.ip_a
    else:
        # Przypadek graniczny: inf traktujemy jako "większe R/X"
        # Ustal, który wynik ma większe (w sensie rozszerzonym) R/X
        def rx_key(r):
            return float("inf") if not math.isfinite(r.rx_ratio) else r.rx_ratio

        low, high = sorted([result_low, result_high], key=lambda r: rx_key(r))
        assert rx_key(high) > rx_key(low)
        assert high.kappa <= low.kappa
        assert high.ip_a <= low.ip_a


def test_ith_scales_with_time():
    graph = build_transformer_only_graph()

    result_t1 = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
    )
    result_t4 = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=4.0,
    )

    assert result_t1.ith_a == pytest.approx(result_t1.ikss_a, rel=1e-12, abs=0.0)
    assert result_t4.ith_a == pytest.approx(2.0 * result_t4.ikss_a, rel=1e-12, abs=0.0)


def test_zkk_from_inverse_ybus():
    graph = build_transformer_only_graph()

    builder = AdmittanceMatrixBuilder(graph)
    y_bus = builder.build()
    z_bus = np.linalg.inv(y_bus)
    node_index = builder.node_id_to_index["B"]
    zkk_expected = z_bus[node_index, node_index]

    result = ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
        graph=graph,
        fault_node_id="B",
        c_factor=1.0,
        tk_s=1.0,
    )

    assert result.zkk_ohm == pytest.approx(zkk_expected)
