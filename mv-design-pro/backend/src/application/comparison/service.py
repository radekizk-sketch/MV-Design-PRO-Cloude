"""
P10b Comparison Service — Case A/B Result Comparison

CANONICAL ALIGNMENT:
- P10b: Result State + Case A/B Comparison (BACKEND ONLY)
- Read-only comparison between two Study Runs
- No physics, no mutations, no solver invocation

INVARIANTS (BINDING):
1. READ-ONLY: Zero physics calculations, zero state mutations
2. SAME PROJECT: Both runs must belong to the same project
3. DATA FROM RESULT API: Uses only stored result payloads
4. DETERMINISTIC: Same inputs produce identical comparison output

USAGE:
    service = ComparisonService(uow_factory)
    result = service.compare_runs(run_a_id, run_b_id)
"""

from __future__ import annotations

from typing import Any, Callable
from uuid import UUID

from domain.results import (
    AnalysisTypeMismatchError,
    BranchPowerComparison,
    ComplexDelta,
    NodeVoltageComparison,
    NumericDelta,
    PowerFlowComparison,
    ProjectMismatchError,
    ResultNotFoundError,
    RunComparisonResult,
    RunNotFoundError,
    ShortCircuitComparison,
)
from infrastructure.persistence.unit_of_work import UnitOfWork


class ComparisonService:
    """
    P10b Comparison Service — read-only comparison of two Study Runs.

    RESPONSIBILITIES:
    - Validate run compatibility (same project, same analysis type)
    - Fetch result payloads from Result API
    - Compute deterministic deltas (no physics, just arithmetic)
    - Return immutable comparison DTO

    DOES NOT:
    - Invoke solvers
    - Mutate any state
    - Interpret results normatively (no limits/thresholds)

    USAGE:
        service = ComparisonService(uow_factory)
        result = service.compare_runs(run_a_id, run_b_id)
    """

    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def compare_runs(
        self,
        run_a_id: UUID,
        run_b_id: UUID,
    ) -> RunComparisonResult:
        """
        Compare two Study Runs.

        P10b: Main entry point for run comparison.

        Args:
            run_a_id: UUID of first Run (baseline)
            run_b_id: UUID of second Run (comparison target)

        Returns:
            RunComparisonResult with all computed deltas

        Raises:
            RunNotFoundError: If either run doesn't exist
            ProjectMismatchError: If runs belong to different projects
            AnalysisTypeMismatchError: If runs have different analysis types
            ResultNotFoundError: If results aren't found for a run
        """
        with self._uow_factory() as uow:
            # 1. Fetch runs
            run_a = uow.study_runs.get(run_a_id)
            if run_a is None:
                raise RunNotFoundError(run_a_id)

            run_b = uow.study_runs.get(run_b_id)
            if run_b is None:
                raise RunNotFoundError(run_b_id)

            # 2. Validate same project
            if run_a.project_id != run_b.project_id:
                raise ProjectMismatchError(run_a.project_id, run_b.project_id)

            # 3. Validate same analysis type
            if run_a.analysis_type != run_b.analysis_type:
                raise AnalysisTypeMismatchError(run_a.analysis_type, run_b.analysis_type)

            # 4. Fetch results
            results_a = uow.results.list_results(run_a_id)
            results_b = uow.results.list_results(run_b_id)

            # 5. Build comparison based on analysis type
            short_circuit_comp = None
            power_flow_comp = None

            if run_a.analysis_type in ("short_circuit", "sc", "iec60909"):
                short_circuit_comp = self._compare_short_circuit(
                    results_a, results_b, run_a_id, run_b_id
                )
            elif run_a.analysis_type in ("power_flow", "pf", "load_flow"):
                power_flow_comp = self._compare_power_flow(
                    results_a, results_b, run_a_id, run_b_id
                )

            return RunComparisonResult(
                run_a_id=run_a_id,
                run_b_id=run_b_id,
                project_id=run_a.project_id,
                analysis_type=run_a.analysis_type,
                short_circuit=short_circuit_comp,
                power_flow=power_flow_comp,
            )

    def _compare_short_circuit(
        self,
        results_a: list[dict],
        results_b: list[dict],
        run_a_id: UUID,
        run_b_id: UUID,
    ) -> ShortCircuitComparison:
        """
        Compare Short Circuit results (IEC 60909).

        P10b: Compares Ik'', Sk'', Zth, Ip, Ith.

        INVARIANT: No normative interpretation, just arithmetic deltas.
        """
        payload_a = self._find_result_payload(results_a, "short_circuit", run_a_id)
        payload_b = self._find_result_payload(results_b, "short_circuit", run_b_id)

        # Extract values with safe defaults
        ikss_a = float(payload_a.get("ikss_a", 0.0))
        ikss_b = float(payload_b.get("ikss_a", 0.0))

        sk_a = float(payload_a.get("sk_mva", 0.0))
        sk_b = float(payload_b.get("sk_mva", 0.0))

        ip_a = float(payload_a.get("ip_a", 0.0))
        ip_b = float(payload_b.get("ip_a", 0.0))

        ith_a = float(payload_a.get("ith_a", 0.0))
        ith_b = float(payload_b.get("ith_a", 0.0))

        # Zth can be stored as complex dict {"re": x, "im": y}
        zth_a = self._parse_complex(payload_a.get("zkk_ohm", {"re": 0.0, "im": 0.0}))
        zth_b = self._parse_complex(payload_b.get("zkk_ohm", {"re": 0.0, "im": 0.0}))

        return ShortCircuitComparison(
            ikss_delta=NumericDelta.compute(ikss_a, ikss_b),
            sk_delta=NumericDelta.compute(sk_a, sk_b),
            zth_delta=ComplexDelta.compute(zth_a, zth_b),
            ip_delta=NumericDelta.compute(ip_a, ip_b),
            ith_delta=NumericDelta.compute(ith_a, ith_b),
        )

    def _compare_power_flow(
        self,
        results_a: list[dict],
        results_b: list[dict],
        run_a_id: UUID,
        run_b_id: UUID,
    ) -> PowerFlowComparison:
        """
        Compare Power Flow results.

        P10b: Compares delta_U, P, Q (aggregate + per-element).

        INVARIANT: No normative interpretation, just arithmetic deltas.
        """
        payload_a = self._find_result_payload(results_a, "power_flow", run_a_id)
        payload_b = self._find_result_payload(results_b, "power_flow", run_b_id)

        # Total losses (complex in pu)
        losses_a = self._parse_complex(payload_a.get("losses_total_pu", {"re": 0.0, "im": 0.0}))
        losses_b = self._parse_complex(payload_b.get("losses_total_pu", {"re": 0.0, "im": 0.0}))

        # Slack power (complex in pu)
        slack_a = self._parse_complex(payload_a.get("slack_power_pu", {"re": 0.0, "im": 0.0}))
        slack_b = self._parse_complex(payload_b.get("slack_power_pu", {"re": 0.0, "im": 0.0}))

        # Per-node voltages
        node_voltages = self._compare_node_voltages(
            payload_a.get("node_voltage_kv", {}),
            payload_b.get("node_voltage_kv", {}),
            payload_a.get("node_u_mag_pu", {}),
            payload_b.get("node_u_mag_pu", {}),
        )

        # Per-branch powers (from side)
        branch_powers = self._compare_branch_powers(
            payload_a.get("branch_s_from_mva", {}),
            payload_b.get("branch_s_from_mva", {}),
        )

        return PowerFlowComparison(
            total_losses_p_delta=NumericDelta.compute(losses_a.real, losses_b.real),
            total_losses_q_delta=NumericDelta.compute(losses_a.imag, losses_b.imag),
            slack_p_delta=NumericDelta.compute(slack_a.real, slack_b.real),
            slack_q_delta=NumericDelta.compute(slack_a.imag, slack_b.imag),
            node_voltages=tuple(node_voltages),
            branch_powers=tuple(branch_powers),
        )

    def _compare_node_voltages(
        self,
        kv_a: dict[str, float],
        kv_b: dict[str, float],
        pu_a: dict[str, float],
        pu_b: dict[str, float],
    ) -> list[NodeVoltageComparison]:
        """Compare per-node voltages."""
        all_nodes = sorted(set(kv_a.keys()) | set(kv_b.keys()))
        comparisons = []

        for node_id in all_nodes:
            u_kv_val_a = float(kv_a.get(node_id, 0.0))
            u_kv_val_b = float(kv_b.get(node_id, 0.0))
            u_pu_val_a = float(pu_a.get(node_id, 0.0))
            u_pu_val_b = float(pu_b.get(node_id, 0.0))

            comparisons.append(NodeVoltageComparison(
                node_id=node_id,
                u_kv_delta=NumericDelta.compute(u_kv_val_a, u_kv_val_b),
                u_pu_delta=NumericDelta.compute(u_pu_val_a, u_pu_val_b),
            ))

        return comparisons

    def _compare_branch_powers(
        self,
        s_from_a: dict[str, Any],
        s_from_b: dict[str, Any],
    ) -> list[BranchPowerComparison]:
        """Compare per-branch powers."""
        all_branches = sorted(set(s_from_a.keys()) | set(s_from_b.keys()))
        comparisons = []

        for branch_id in all_branches:
            s_a = self._parse_complex(s_from_a.get(branch_id, {"re": 0.0, "im": 0.0}))
            s_b = self._parse_complex(s_from_b.get(branch_id, {"re": 0.0, "im": 0.0}))

            comparisons.append(BranchPowerComparison(
                branch_id=branch_id,
                p_mw_delta=NumericDelta.compute(s_a.real, s_b.real),
                q_mvar_delta=NumericDelta.compute(s_a.imag, s_b.imag),
            ))

        return comparisons

    def _find_result_payload(
        self,
        results: list[dict],
        result_type: str,
        run_id: UUID,
    ) -> dict[str, Any]:
        """
        Find result payload by type.

        Searches through stored results for matching type.
        Falls back to checking payload structure.
        """
        # First, try exact type match
        for result in results:
            if result.get("result_type") == result_type:
                return result.get("payload", {})

        # Fallback: look for payload with expected keys
        if result_type == "short_circuit":
            for result in results:
                payload = result.get("payload", {})
                if "ikss_a" in payload or "sk_mva" in payload:
                    return payload

        if result_type == "power_flow":
            for result in results:
                payload = result.get("payload", {})
                if "converged" in payload or "node_voltage_pu" in payload:
                    return payload

        # If we have any results, return the first payload
        if results:
            return results[0].get("payload", {})

        raise ResultNotFoundError(run_id, result_type)

    @staticmethod
    def _parse_complex(value: Any) -> complex:
        """
        Parse complex value from dict or number.

        Handles:
        - {"re": x, "im": y}
        - Complex number
        - Float/int (imaginary = 0)
        """
        if isinstance(value, complex):
            return value
        if isinstance(value, (int, float)):
            return complex(value, 0.0)
        if isinstance(value, dict):
            return complex(
                float(value.get("re", 0.0)),
                float(value.get("im", 0.0)),
            )
        return complex(0.0, 0.0)
