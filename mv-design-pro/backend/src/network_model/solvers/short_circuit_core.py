from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum

import numpy as np

from network_model.core.graph import NetworkGraph
from network_model.core.ybus import AdmittanceMatrixBuilder


OMEGA_50HZ = 2.0 * math.pi * 50.0


@dataclass(frozen=True)
class ShortCircuitType(Enum):
    THREE_PHASE = "3F"
    SINGLE_PHASE_GROUND = "1F"
    TWO_PHASE = "2F"
    TWO_PHASE_GROUND = "2F+G"


@dataclass(frozen=True)
class ShortCircuitCoreResult:
    z_equiv: complex
    z1: complex
    z2: complex
    z0: complex | None


@dataclass(frozen=True)
class ShortCircuitPostProcessResult:
    rx_ratio: float
    kappa: float
    ip_a: float
    ith_a: float
    ib_a: float
    sk_mva: float


def build_zbus(graph: NetworkGraph) -> tuple[AdmittanceMatrixBuilder, np.ndarray]:
    builder = AdmittanceMatrixBuilder(graph)
    y_bus = builder.build()

    try:
        z_bus = np.linalg.inv(y_bus)
    except np.linalg.LinAlgError as exc:
        raise ValueError("Y-bus is singular; cannot compute Z-bus for short-circuit") from exc
    return builder, z_bus


def voltage_factor_for_fault(short_circuit_type: ShortCircuitType) -> float:
    if short_circuit_type == ShortCircuitType.THREE_PHASE:
        return 1.0 / math.sqrt(3.0)
    if short_circuit_type == ShortCircuitType.SINGLE_PHASE_GROUND:
        return math.sqrt(3.0)
    if short_circuit_type in {ShortCircuitType.TWO_PHASE, ShortCircuitType.TWO_PHASE_GROUND}:
        return 1.0
    raise ValueError(f"Unsupported short-circuit type: {short_circuit_type}")


def compute_equivalent_impedance(
    *,
    graph: NetworkGraph,
    fault_node_id: str,
    short_circuit_type: ShortCircuitType,
    z0_bus: np.ndarray | None = None,
    z2_bus: np.ndarray | None = None,
) -> ShortCircuitCoreResult:
    if fault_node_id not in graph.nodes:
        raise ValueError(f"Fault node '{fault_node_id}' does not exist in graph")

    builder, z1_bus = build_zbus(graph)
    node_index = builder.node_id_to_index[fault_node_id]
    z1 = z1_bus[node_index, node_index]
    z2 = z2_bus[node_index, node_index] if z2_bus is not None else z1

    z0: complex | None = None
    if short_circuit_type == ShortCircuitType.THREE_PHASE:
        z_equiv = z1
    elif short_circuit_type == ShortCircuitType.TWO_PHASE:
        z_equiv = z1 + z2
    elif short_circuit_type == ShortCircuitType.SINGLE_PHASE_GROUND:
        if z0_bus is None:
            raise ValueError("Z0 bus matrix is required for 1F fault computation")
        z0 = z0_bus[node_index, node_index]
        z_equiv = z1 + z2 + z0
    elif short_circuit_type == ShortCircuitType.TWO_PHASE_GROUND:
        if z0_bus is None:
            raise ValueError("Z0 bus matrix is required for 2F+G fault computation")
        z0 = z0_bus[node_index, node_index]
        denominator = z2 + z0
        if abs(denominator) == 0:
            raise ZeroDivisionError("Z2 + Z0 is zero; cannot compute Ik''")
        z_equiv = z1 + (z2 * z0) / denominator
    else:
        raise ValueError(f"Unsupported short-circuit type: {short_circuit_type}")

    if abs(z_equiv) == 0:
        raise ZeroDivisionError("Equivalent impedance is zero; cannot compute Ik''")

    return ShortCircuitCoreResult(z_equiv=z_equiv, z1=z1, z2=z2, z0=z0)


def compute_ikss(
    *,
    un_v: float,
    c_factor: float,
    short_circuit_type: ShortCircuitType,
    z_equiv: complex,
) -> float:
    voltage_factor = voltage_factor_for_fault(short_circuit_type)
    return (c_factor * un_v * voltage_factor) / abs(z_equiv)


def compute_post_fault_quantities(
    *,
    ikss: float,
    un_v: float,
    z_equiv: complex,
    tk_s: float,
    tb_s: float,
) -> ShortCircuitPostProcessResult:
    if z_equiv.imag == 0:
        rx_ratio = math.inf
    else:
        rx_ratio = z_equiv.real / z_equiv.imag
    kappa = 1.02 + 0.98 * math.exp(-3.0 * rx_ratio)
    ip_a = kappa * math.sqrt(2.0) * ikss
    ith_a = ikss * math.sqrt(tk_s)
    sk_mva = (math.sqrt(3.0) * un_v * ikss) / 1_000_000.0

    r_ohm = z_equiv.real
    x_ohm = z_equiv.imag
    if r_ohm <= 0 or x_ohm <= 0:
        ta_s = 0.0
    else:
        ta_s = x_ohm / (OMEGA_50HZ * r_ohm)
    exp_factor = 0.0 if ta_s <= 0 else math.exp(-tb_s / ta_s)
    ib_a = ikss * math.sqrt(1.0 + ((kappa - 1.0) * exp_factor) ** 2)

    return ShortCircuitPostProcessResult(
        rx_ratio=rx_ratio,
        kappa=kappa,
        ip_a=ip_a,
        ith_a=ith_a,
        ib_a=ib_a,
        sk_mva=sk_mva,
    )
