from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from network_model.core.graph import NetworkGraph
from network_model.solvers.short_circuit_core import (
    ShortCircuitType,
    compute_equivalent_impedance,
    compute_ikss,
    compute_post_fault_quantities,
)


C_MIN: float = 0.95
C_MAX: float = 1.10


@dataclass(frozen=True)
class ShortCircuitResult:
    short_circuit_type: ShortCircuitType
    fault_node_id: str
    c_factor: float
    un_v: float
    zkk_ohm: complex
    ikss_a: float
    ip_a: float
    ith_a: float
    sk_mva: float
    rx_ratio: float
    kappa: float
    tk_s: float
    ib_a: float
    tb_s: float

    @property
    def ik_a(self) -> float:
        return self.ikss_a

    @property
    def ip(self) -> float:
        return self.ip_a

    @property
    def ith(self) -> float:
        return self.ith_a

    @property
    def ib(self) -> float:
        return self.ib_a

    @property
    def sk(self) -> float:
        return self.sk_mva


class ShortCircuitIEC60909Solver:
    @staticmethod
    def _compute_fault_result(
        *,
        short_circuit_type: ShortCircuitType,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float,
        un_v: float,
        z_equiv: complex,
        ikss: float,
    ) -> ShortCircuitResult:
        post = compute_post_fault_quantities(
            ikss=ikss,
            un_v=un_v,
            z_equiv=z_equiv,
            tk_s=tk_s,
            tb_s=tb_s,
        )

        return ShortCircuitResult(
            short_circuit_type=short_circuit_type,
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            un_v=un_v,
            zkk_ohm=z_equiv,
            ikss_a=ikss,
            ip_a=post.ip_a,
            ith_a=post.ith_a,
            sk_mva=post.sk_mva,
            rx_ratio=post.rx_ratio,
            kappa=post.kappa,
            tk_s=tk_s,
            ib_a=post.ib_a,
            tb_s=tb_s,
        )

    @staticmethod
    def compute_3ph_short_circuit(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float = 0.1,
    ) -> ShortCircuitResult:
        """
        IEC 60909: 3-phase short-circuit currents (Ik'', Ip, Ith) and Sk''.

        Ik'' = (c * Un) / (sqrt(3) * |Zkk|)
        where Zkk is diagonal element of Zbus = inv(Ybus).

        kappa = 1.02 + 0.98 * exp(-3 * R/X)
        Ip = kappa * sqrt(2) * Ik''
        Ith = Ik'' * sqrt(tk)
        Sk'' = sqrt(3) * Un * Ik''
        """
        if fault_node_id not in graph.nodes:
            raise ValueError(f"Fault node '{fault_node_id}' does not exist in graph")
        if c_factor <= 0:
            raise ValueError("c_factor must be > 0")
        if tk_s <= 0:
            raise ValueError("tk_s must be > 0")
        if tb_s <= 0:
            raise ValueError("tb_s must be > 0")

        core = compute_equivalent_impedance(
            graph=graph,
            fault_node_id=fault_node_id,
            short_circuit_type=ShortCircuitType.THREE_PHASE,
        )
        un_v = graph.nodes[fault_node_id].voltage_level * 1000.0
        ikss = compute_ikss(
            un_v=un_v,
            c_factor=c_factor,
            short_circuit_type=ShortCircuitType.THREE_PHASE,
            z_equiv=core.z_equiv,
        )
        return ShortCircuitIEC60909Solver._compute_fault_result(
            short_circuit_type=ShortCircuitType.THREE_PHASE,
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            tk_s=tk_s,
            tb_s=tb_s,
            un_v=un_v,
            z_equiv=core.z_equiv,
            ikss=ikss,
        )

    @staticmethod
    def compute_ikss_3ph(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
    ) -> ShortCircuitResult:
        """
        IEC 60909: initial symmetrical short-circuit current Ik'' for 3-phase fault.

        Ik'' = (c * Un) / (sqrt(3) * |Zkk|)
        where Zkk is diagonal element of Zbus = inv(Ybus).
        """
        return ShortCircuitIEC60909Solver.compute_3ph_short_circuit(
            graph=graph,
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            tk_s=1.0,
        )

    @staticmethod
    def compute_ikss_3ph_min(
        graph: NetworkGraph, fault_node_id: str
    ) -> ShortCircuitResult:
        return ShortCircuitIEC60909Solver.compute_ikss_3ph(
            graph, fault_node_id, C_MIN
        )

    @staticmethod
    def compute_ikss_3ph_max(
        graph: NetworkGraph, fault_node_id: str
    ) -> ShortCircuitResult:
        return ShortCircuitIEC60909Solver.compute_ikss_3ph(
            graph, fault_node_id, C_MAX
        )

    @staticmethod
    def compute_1ph_short_circuit(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float = 0.1,
        z0_bus: np.ndarray | None = None,
    ) -> ShortCircuitResult:
        """
        IEC 60909: single-phase-to-ground fault using Z1, Z2, Z0.

        Ik'' = (c * Un) / |Z1 + Z2 + Z0|
        """
        if z0_bus is None:
            raise ValueError("Z0 bus matrix is required for 1F fault computation")
        if fault_node_id not in graph.nodes:
            raise ValueError(f"Fault node '{fault_node_id}' does not exist in graph")
        if c_factor <= 0:
            raise ValueError("c_factor must be > 0")
        if tk_s <= 0:
            raise ValueError("tk_s must be > 0")
        if tb_s <= 0:
            raise ValueError("tb_s must be > 0")

        core = compute_equivalent_impedance(
            graph=graph,
            fault_node_id=fault_node_id,
            short_circuit_type=ShortCircuitType.SINGLE_PHASE_GROUND,
            z0_bus=z0_bus,
        )
        un_v = graph.nodes[fault_node_id].voltage_level * 1000.0
        ikss = compute_ikss(
            un_v=un_v,
            c_factor=c_factor,
            short_circuit_type=ShortCircuitType.SINGLE_PHASE_GROUND,
            z_equiv=core.z_equiv,
        )
        return ShortCircuitIEC60909Solver._compute_fault_result(
            short_circuit_type=ShortCircuitType.SINGLE_PHASE_GROUND,
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            tk_s=tk_s,
            tb_s=tb_s,
            un_v=un_v,
            z_equiv=core.z_equiv,
            ikss=ikss,
        )

    @staticmethod
    def compute_2ph_short_circuit(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float = 0.1,
    ) -> ShortCircuitResult:
        """
        IEC 60909: two-phase fault using Z1 and Z2.

        Ik'' = (c * Un) / |Z1 + Z2|
        """
        if fault_node_id not in graph.nodes:
            raise ValueError(f"Fault node '{fault_node_id}' does not exist in graph")
        if c_factor <= 0:
            raise ValueError("c_factor must be > 0")
        if tk_s <= 0:
            raise ValueError("tk_s must be > 0")
        if tb_s <= 0:
            raise ValueError("tb_s must be > 0")

        core = compute_equivalent_impedance(
            graph=graph,
            fault_node_id=fault_node_id,
            short_circuit_type=ShortCircuitType.TWO_PHASE,
        )
        un_v = graph.nodes[fault_node_id].voltage_level * 1000.0
        ikss = compute_ikss(
            un_v=un_v,
            c_factor=c_factor,
            short_circuit_type=ShortCircuitType.TWO_PHASE,
            z_equiv=core.z_equiv,
        )
        return ShortCircuitIEC60909Solver._compute_fault_result(
            short_circuit_type=ShortCircuitType.TWO_PHASE,
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            tk_s=tk_s,
            tb_s=tb_s,
            un_v=un_v,
            z_equiv=core.z_equiv,
            ikss=ikss,
        )

    @staticmethod
    def compute_2ph_ground_short_circuit(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float = 0.1,
        z0_bus: np.ndarray | None = None,
    ) -> ShortCircuitResult:
        """
        IEC 60909: two-phase-to-ground fault using Z1, Z2, Z0.

        Ik'' = (c * Un) / |Z1 + Z2 + Z0|
        """
        if z0_bus is None:
            raise ValueError("Z0 bus matrix is required for 2F+G fault computation")
        if fault_node_id not in graph.nodes:
            raise ValueError(f"Fault node '{fault_node_id}' does not exist in graph")
        if c_factor <= 0:
            raise ValueError("c_factor must be > 0")
        if tk_s <= 0:
            raise ValueError("tk_s must be > 0")
        if tb_s <= 0:
            raise ValueError("tb_s must be > 0")

        core = compute_equivalent_impedance(
            graph=graph,
            fault_node_id=fault_node_id,
            short_circuit_type=ShortCircuitType.TWO_PHASE_GROUND,
            z0_bus=z0_bus,
        )
        un_v = graph.nodes[fault_node_id].voltage_level * 1000.0
        ikss = compute_ikss(
            un_v=un_v,
            c_factor=c_factor,
            short_circuit_type=ShortCircuitType.TWO_PHASE_GROUND,
            z_equiv=core.z_equiv,
        )
        return ShortCircuitIEC60909Solver._compute_fault_result(
            short_circuit_type=ShortCircuitType.TWO_PHASE_GROUND,
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            tk_s=tk_s,
            tb_s=tb_s,
            un_v=un_v,
            z_equiv=core.z_equiv,
            ikss=ikss,
        )


ShortCircuitResult3PH = ShortCircuitResult
