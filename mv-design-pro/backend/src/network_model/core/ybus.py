"""
Builder macierzy admitancyjnej (Y-bus) dla sieci elektroenergetycznej.

Macierz Y-bus jest wyznaczana wyłącznie na podstawie danych z
NetworkGraph (nodes i branches). Gałęzie nieaktywne (in_service=False)
nie są uwzględniane.
"""

from __future__ import annotations

from typing import Dict, Tuple

import numpy as np

from .branch import Branch, LineBranch, TransformerBranch
from .graph import NetworkGraph


class AdmittanceMatrixBuilder:
    """
    Builder macierzy Y-bus.

    Zapewnia deterministyczne mapowanie node_id -> indeks macierzy
    (sortowanie alfabetyczne po node_id).
    """

    def __init__(self, graph: NetworkGraph) -> None:
        self._graph = graph
        self._node_id_to_index: Dict[str, int] = {}

    @property
    def node_id_to_index(self) -> Dict[str, int]:
        """Zwraca mapowanie node_id -> indeks w macierzy Y-bus."""
        return dict(self._node_id_to_index)

    def build(self) -> np.ndarray:
        """
        Buduje macierz Y-bus dla grafu.

        Returns:
            Numpy ndarray o dtype=complex i rozmiarze (n, n).
        """
        node_ids = sorted(self._graph.nodes.keys())
        self._node_id_to_index = {node_id: idx for idx, node_id in enumerate(node_ids)}

        size = len(node_ids)
        y_bus = np.zeros((size, size), dtype=complex)

        for branch in self._graph.branches.values():
            if not branch.in_service:
                continue

            from_idx = self._node_id_to_index[branch.from_node_id]
            to_idx = self._node_id_to_index[branch.to_node_id]

            y_series, y_shunt = self._get_branch_admittances(branch)

            y_bus[from_idx, to_idx] -= y_series
            y_bus[to_idx, from_idx] -= y_series

            y_bus[from_idx, from_idx] += y_series + y_shunt
            y_bus[to_idx, to_idx] += y_series + y_shunt

        return y_bus

    def _get_branch_admittances(self, branch: Branch) -> Tuple[complex, complex]:
        """
        Zwraca admitancję szeregową i admitancję poprzeczną na końcu gałęzi.

        Returns:
            Tuple (Y_series, Y_shunt_per_end).
        """
        if isinstance(branch, LineBranch):
            return branch.get_series_admittance(), branch.get_shunt_admittance_per_end()

        if isinstance(branch, TransformerBranch):
            z_series = branch.get_short_circuit_impedance_ohm_lv()
            if z_series == 0:
                raise ZeroDivisionError("Cannot compute transformer admittance: impedance is zero")
            return 1.0 / z_series, 0.0 + 0.0j

        raise ValueError(f"Unsupported branch type: {branch.branch_type}")
