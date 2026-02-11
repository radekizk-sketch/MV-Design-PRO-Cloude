"""
Execution Engine Service — PR-14

Application service implementing the canonical execution pipeline:
    StudyCase → Readiness Check → Eligibility Check → Run → ResultSet

INVARIANTS:
- Solver is NEVER called directly — always via Run
- Run blocked if readiness.ready == false
- Run blocked if eligibility.blockers for analysis_type
- Validation != Readiness (separate semantics)
- solver_input frozen (deep copy) before execution
- Hash generated from sorted JSON without transient fields
- ZERO changes to existing solvers, catalogs, or physics

ARCHITECTURE:
- This service lives in the APPLICATION layer
- It orchestrates domain models (Run, ResultSet) and solver-input builder
- NO physics calculations here — delegates to existing solvers
"""

from __future__ import annotations

import copy
import logging
from typing import Any, Callable
from uuid import UUID

import numpy as np

from domain.execution import (
    ExecutionAnalysisType,
    Run,
    RunStatus,
    ResultSet,
    ElementResult,
    build_result_set,
    compute_solver_input_hash,
    new_run,
)
from domain.study_case import StudyCase as DomainStudyCase, StudyCaseConfig

from application.solvers.short_circuit_binding import (
    ShortCircuitBindingError,
    execute_short_circuit,
)
from application.result_mapping.short_circuit_to_resultset_v1 import (
    map_short_circuit_to_resultset_v1,
)

from .errors import (
    RunBlockedError,
    RunNotFoundError,
    RunNotReadyError,
    ResultSetNotFoundError,
    StudyCaseNotFoundError,
)

logger = logging.getLogger(__name__)


class ExecutionEngineService:
    """
    Canonical execution engine for StudyCase → Run → ResultSet pipeline.

    Responsibilities:
    - Create Run records with deterministic solver_input_hash
    - Gate execution on readiness and eligibility
    - Store ResultSet after successful execution
    - Provide Run and ResultSet retrieval
    """

    def __init__(self) -> None:
        # In-memory stores for PR-14 (no DB persistence yet)
        self._runs: dict[UUID, Run] = {}
        self._result_sets: dict[UUID, ResultSet] = {}
        self._study_cases: dict[UUID, DomainStudyCase] = {}
        # Run history per study case (study_case_id → list of run_ids)
        self._case_runs: dict[UUID, list[UUID]] = {}

    # =========================================================================
    # Study Case Management (thin wrapper for execution context)
    # =========================================================================

    def register_study_case(self, case: DomainStudyCase) -> None:
        """Register a study case for execution tracking."""
        self._study_cases[case.id] = case

    def get_study_case(self, case_id: UUID) -> DomainStudyCase:
        """Get a registered study case."""
        case = self._study_cases.get(case_id)
        if case is None:
            raise StudyCaseNotFoundError(str(case_id))
        return case

    def list_study_cases_for_project(
        self, project_id: UUID
    ) -> list[DomainStudyCase]:
        """List all study cases for a project."""
        return [
            case
            for case in self._study_cases.values()
            if case.project_id == project_id
        ]

    # =========================================================================
    # Run Creation
    # =========================================================================

    def create_run(
        self,
        *,
        study_case_id: UUID,
        analysis_type: ExecutionAnalysisType,
        solver_input: dict[str, Any],
        readiness: dict[str, Any] | None = None,
        eligibility: dict[str, Any] | None = None,
    ) -> Run:
        """
        Create a new Run with deterministic solver_input_hash.

        GATING:
        1. readiness.ready must be True (if provided)
        2. eligibility.eligible must be True (if provided)
        3. solver_input is frozen (deep copy) before hashing

        Args:
            study_case_id: ID of the study case
            analysis_type: Type of analysis to run
            solver_input: Solver input dict (will be deep-copied and hashed)
            readiness: Optional readiness check result
            eligibility: Optional eligibility check result

        Returns:
            Created Run in PENDING status

        Raises:
            StudyCaseNotFoundError: If study case not found
            RunNotReadyError: If readiness check fails
            RunBlockedError: If eligibility check fails
        """
        # Verify study case exists
        if study_case_id not in self._study_cases:
            raise StudyCaseNotFoundError(str(study_case_id))

        # Gate 1: Readiness check
        if readiness is not None and not readiness.get("ready", False):
            issues = readiness.get("issues", [])
            reason = "; ".join(
                issue.get("message_pl", issue.get("message", "Nieznany problem"))
                for issue in issues
                if issue.get("severity") == "BLOCKER"
            ) or "Sieć nie jest gotowa"
            raise RunNotReadyError(reason)

        # Gate 2: Eligibility check (PR-17: AnalysisEligibilityResult dict)
        if eligibility is not None:
            elig_status = eligibility.get("status", "ELIGIBLE")
            is_eligible = (
                eligibility.get("eligible", True)
                if "eligible" in eligibility
                else elig_status == "ELIGIBLE"
            )
            if not is_eligible:
                blockers = [
                    b.get("message_pl", b.get("message", "Nieznany bloker"))
                    for b in eligibility.get("blockers", [])
                ]
                if not blockers:
                    blockers = [
                        f"Analiza zablokowana (status: {elig_status})"
                    ]
                raise RunBlockedError(blockers)

        # Freeze solver input (deep copy) and compute hash
        frozen_input = copy.deepcopy(solver_input)
        solver_input_hash = compute_solver_input_hash(frozen_input)

        # Create run
        run = new_run(
            study_case_id=study_case_id,
            analysis_type=analysis_type,
            solver_input_hash=solver_input_hash,
        )

        # Store
        self._runs[run.id] = run
        if study_case_id not in self._case_runs:
            self._case_runs[study_case_id] = []
        self._case_runs[study_case_id].append(run.id)

        logger.info(
            "Created run %s for study_case %s, analysis=%s, hash=%s",
            run.id,
            study_case_id,
            analysis_type.value,
            solver_input_hash[:16],
        )

        return run

    # =========================================================================
    # Run Lifecycle
    # =========================================================================

    def start_run(self, run_id: UUID) -> Run:
        """Mark a run as RUNNING."""
        run = self._get_run(run_id)
        if run.status != RunStatus.PENDING:
            return run
        updated = run.mark_running()
        self._runs[run_id] = updated
        return updated

    def complete_run(
        self,
        run_id: UUID,
        *,
        validation_snapshot: dict[str, Any],
        readiness_snapshot: dict[str, Any],
        element_results: list[ElementResult],
        global_results: dict[str, Any],
    ) -> tuple[Run, ResultSet]:
        """
        Complete a run with results.

        Creates a ResultSet with deterministic signature and marks run as DONE.

        Returns:
            Tuple of (updated Run, created ResultSet)
        """
        run = self._get_run(run_id)
        if run.status == RunStatus.DONE:
            result_set = self._result_sets.get(run_id)
            if result_set is not None:
                return run, result_set

        # Build ResultSet
        result_set = build_result_set(
            run_id=run_id,
            analysis_type=run.analysis_type,
            validation_snapshot=validation_snapshot,
            readiness_snapshot=readiness_snapshot,
            element_results=element_results,
            global_results=global_results,
        )

        # Update run status
        updated_run = run.mark_done()
        self._runs[run_id] = updated_run
        self._result_sets[run_id] = result_set

        logger.info(
            "Completed run %s with signature=%s",
            run_id,
            result_set.deterministic_signature[:16],
        )

        return updated_run, result_set

    def fail_run(self, run_id: UUID, error_message: str) -> Run:
        """Mark a run as FAILED."""
        run = self._get_run(run_id)
        if run.status == RunStatus.FAILED:
            return run
        updated = run.mark_failed(error_message)
        self._runs[run_id] = updated
        logger.warning("Failed run %s: %s", run_id, error_message)
        return updated

    # =========================================================================
    # Short-Circuit Execution (PR-18)
    # =========================================================================

    _SC_ANALYSIS_TYPES = {
        ExecutionAnalysisType.SC_3F,
        ExecutionAnalysisType.SC_1F,
        ExecutionAnalysisType.SC_2F,
    }

    def execute_run_sc(
        self,
        run_id: UUID,
        *,
        graph: Any,
        config: StudyCaseConfig,
        fault_node_id: str,
        readiness_snapshot: dict[str, Any],
        validation_snapshot: dict[str, Any],
        z0_bus: np.ndarray | None = None,
    ) -> tuple[Run, ResultSet]:
        """
        Execute a short-circuit run end-to-end (PR-18 binding).

        FLOW:
        1. Get Run (must be PENDING)
        2. Mark as RUNNING
        3. Call short_circuit_binding with the correct SC variant
        4. Map solver result → ResultSet v1
        5. Store ResultSet, mark as DONE
        6. On error → mark as FAILED

        Args:
            run_id: ID of a PENDING run.
            graph: NetworkGraph to compute on.
            config: StudyCaseConfig with c_factor, thermal_time, etc.
            fault_node_id: Node where the fault occurs.
            readiness_snapshot: Readiness state at run time.
            validation_snapshot: Validation state at run time.
            z0_bus: Zero-sequence bus matrix (required for SC_1F).

        Returns:
            Tuple of (completed Run in DONE status, ResultSet v1).

        Raises:
            RunNotFoundError: If run doesn't exist.
            RunBlockedError: If analysis_type is not a short-circuit type.
            ShortCircuitBindingError: If the solver fails.
        """
        run = self._get_run(run_id)

        if run.analysis_type not in self._SC_ANALYSIS_TYPES:
            raise RunBlockedError(
                [f"Typ analizy {run.analysis_type.value} nie jest obsługiwany przez solver zwarciowy"]
            )

        # Transition PENDING → RUNNING
        run = self.start_run(run_id)

        try:
            # Call the solver binding
            binding_result = execute_short_circuit(
                graph=graph,
                analysis_type=run.analysis_type,
                config=config,
                fault_node_id=fault_node_id,
                z0_bus=z0_bus,
            )

            # Map to ResultSet v1
            result_set = map_short_circuit_to_resultset_v1(
                binding_result=binding_result,
                run_id=run.id,
                graph=graph,
                validation_snapshot=validation_snapshot,
                readiness_snapshot=readiness_snapshot,
            )

            # Store ResultSet and mark DONE
            updated_run = run.mark_done()
            self._runs[run_id] = updated_run
            self._result_sets[run_id] = result_set

            logger.info(
                "SC run %s completed: type=%s, Ik''=%.2f A, sig=%s",
                run_id,
                run.analysis_type.value,
                binding_result.solver_result.ikss_a,
                result_set.deterministic_signature[:16],
            )

            return updated_run, result_set

        except (ShortCircuitBindingError, Exception) as exc:
            error_msg = str(exc)
            failed_run = self.fail_run(run_id, error_msg)
            raise

    # =========================================================================
    # Query Operations
    # =========================================================================

    def get_run(self, run_id: UUID) -> Run:
        """Get a run by ID."""
        return self._get_run(run_id)

    def get_result_set(self, run_id: UUID) -> ResultSet:
        """Get the result set for a run."""
        result_set = self._result_sets.get(run_id)
        if result_set is None:
            raise ResultSetNotFoundError(str(run_id))
        return result_set

    def list_runs_for_case(self, study_case_id: UUID) -> list[Run]:
        """List all runs for a study case, ordered by creation (newest first)."""
        run_ids = self._case_runs.get(study_case_id, [])
        runs = [self._runs[rid] for rid in run_ids if rid in self._runs]
        # Reverse to get newest first
        return list(reversed(runs))

    def get_latest_run(self, study_case_id: UUID) -> Run | None:
        """Get the latest run for a study case."""
        runs = self.list_runs_for_case(study_case_id)
        return runs[0] if runs else None

    def get_latest_successful_run(
        self, study_case_id: UUID
    ) -> tuple[Run, ResultSet] | None:
        """Get the latest successful run and its result set."""
        for run in self.list_runs_for_case(study_case_id):
            if run.status == RunStatus.DONE:
                result_set = self._result_sets.get(run.id)
                if result_set is not None:
                    return run, result_set
        return None

    # =========================================================================
    # Hash Verification
    # =========================================================================

    def verify_hash_determinism(
        self,
        solver_input_a: dict[str, Any],
        solver_input_b: dict[str, Any],
    ) -> bool:
        """
        Verify that two solver inputs produce the same hash.

        Used for testing determinism invariant.
        """
        hash_a = compute_solver_input_hash(solver_input_a)
        hash_b = compute_solver_input_hash(solver_input_b)
        return hash_a == hash_b

    # =========================================================================
    # Internal Helpers
    # =========================================================================

    def _get_run(self, run_id: UUID) -> Run:
        """Get a run or raise RunNotFoundError."""
        run = self._runs.get(run_id)
        if run is None:
            raise RunNotFoundError(str(run_id))
        return run
