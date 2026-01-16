from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from network_model.core.graph import NetworkGraph
from network_model.core.ybus import AdmittanceMatrixBuilder


C_MIN: float = 0.95
C_MAX: float = 1.10


@dataclass(frozen=True)
class ShortCircuitResult3PH:
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


class ShortCircuitIEC60909Solver:
    @staticmethod
    def compute_3ph_short_circuit(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float = 0.1,
    ) -> ShortCircuitResult3PH:
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

        builder = AdmittanceMatrixBuilder(graph)
        y_bus = builder.build()

        try:
            z_bus = np.linalg.inv(y_bus)
        except np.linalg.LinAlgError as exc:
            raise ValueError(
                "Y-bus is singular; cannot compute Z-bus for short-circuit"
            ) from exc

        node_index = builder.node_id_to_index[fault_node_id]
        zkk = z_bus[node_index, node_index]
        if abs(zkk) == 0:
            raise ZeroDivisionError("Zkk is zero; cannot compute Ik''")

        un_v = graph.nodes[fault_node_id].voltage_level * 1000.0
        ikss = (c_factor * un_v) / (math.sqrt(3.0) * abs(zkk))
        if zkk.imag == 0:
            rx_ratio = math.inf
        else:
            rx_ratio = zkk.real / zkk.imag
        kappa = 1.02 + 0.98 * math.exp(-3.0 * rx_ratio)
        ip_a = kappa * math.sqrt(2.0) * ikss
        ith_a = ikss * math.sqrt(tk_s)
        sk_mva = (math.sqrt(3.0) * un_v * ikss) / 1_000_000.0
        omega = 2.0 * math.pi * 50.0
        r_ohm = zkk.real
        x_ohm = zkk.imag
        if r_ohm <= 0 or x_ohm <= 0:
            ta_s = 0.0
        else:
            ta_s = x_ohm / (omega * r_ohm)
        # Uproszczony IEC 60909: Ib jako RMS symetryczny w chwili tb,
        # zanik składowej nieokresowej opisany wykładniczo przez Ta.
        # Granice: tb -> inf oraz Ta -> 0 prowadzą do Ib -> Ik''.
        exp_factor = 0.0 if ta_s <= 0 else math.exp(-tb_s / ta_s)
        ib_a = ikss * math.sqrt(1.0 + ((kappa - 1.0) * exp_factor) ** 2)

        return ShortCircuitResult3PH(
            fault_node_id=fault_node_id,
            c_factor=c_factor,
            un_v=un_v,
            zkk_ohm=zkk,
            ikss_a=ikss,
            ip_a=ip_a,
            ith_a=ith_a,
            sk_mva=sk_mva,
            rx_ratio=rx_ratio,
            kappa=kappa,
            tk_s=tk_s,
            ib_a=ib_a,
            tb_s=tb_s,
        )

    @staticmethod
    def compute_ikss_3ph(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
    ) -> ShortCircuitResult3PH:
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
    ) -> ShortCircuitResult3PH:
        return ShortCircuitIEC60909Solver.compute_ikss_3ph(
            graph, fault_node_id, C_MIN
        )

    @staticmethod
    def compute_ikss_3ph_max(
        graph: NetworkGraph, fault_node_id: str
    ) -> ShortCircuitResult3PH:
        return ShortCircuitIEC60909Solver.compute_ikss_3ph(
            graph, fault_node_id, C_MAX
        )
