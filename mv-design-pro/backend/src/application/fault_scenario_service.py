"""
Fault Scenario Service — PR-19

Application service for managing fault scenarios.
Handles CRUD, validation, and content hash computation.

INVARIANTS:
- ZERO auto-completion of missing data
- ZERO heuristics
- Deterministic content_hash (SHA-256)
- All scenarios sorted deterministically
- Polish error messages
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from domain.fault_scenario import (
    FaultLocation,
    FaultScenario,
    FaultScenarioValidationError,
    FaultType,
    ShortCircuitConfig,
    compute_scenario_content_hash,
    new_fault_scenario,
    validate_fault_scenario,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class FaultScenarioServiceError(Exception):
    """Base error for fault scenario service."""

    pass


class FaultScenarioNotFoundError(FaultScenarioServiceError):
    """Raised when a fault scenario does not exist."""

    def __init__(self, scenario_id: str) -> None:
        super().__init__(f"Scenariusz zwarcia nie istnieje: {scenario_id}")
        self.scenario_id = scenario_id


class FaultScenarioDuplicateError(FaultScenarioServiceError):
    """Raised when a duplicate scenario (same content_hash) exists."""

    def __init__(self, content_hash: str) -> None:
        super().__init__(
            f"Scenariusz o identycznym content_hash już istnieje: {content_hash[:16]}..."
        )
        self.content_hash = content_hash


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class FaultScenarioService:
    """
    Application service for fault scenario management.

    Responsibilities:
    - Create validated fault scenarios
    - List scenarios for a study case (sorted deterministically)
    - Delete scenarios
    - Validate scenario invariants
    - Compute content hash
    """

    def __init__(self) -> None:
        # In-memory store (no DB persistence yet)
        self._scenarios: dict[UUID, FaultScenario] = {}
        # Index: study_case_id → list of scenario_ids
        self._case_scenarios: dict[UUID, list[UUID]] = {}

    def create_scenario(
        self,
        *,
        study_case_id: UUID,
        fault_type: str,
        location: dict[str, Any],
        config: dict[str, Any] | None = None,
        z0_bus_data: dict[str, Any] | None = None,
    ) -> FaultScenario:
        """
        Create a new fault scenario with validation and content hash.

        Args:
            study_case_id: Parent study case UUID.
            fault_type: "SC_3F", "SC_2F", or "SC_1F".
            location: {"element_ref": str, "location_type": "BUS"|"BRANCH", "position": float|None}
            config: Optional short-circuit config overrides.
            z0_bus_data: Zero-sequence impedance data (required for SC_1F).

        Returns:
            Validated FaultScenario with content_hash.

        Raises:
            FaultScenarioValidationError: If invariants are violated.
            FaultScenarioDuplicateError: If identical scenario already exists.
        """
        ft = FaultType(fault_type)
        loc = FaultLocation.from_dict(location)
        cfg = ShortCircuitConfig.from_dict(config) if config else ShortCircuitConfig()

        scenario = new_fault_scenario(
            study_case_id=study_case_id,
            fault_type=ft,
            location=loc,
            config=cfg,
            z0_bus_data=z0_bus_data,
        )

        # Check for duplicate content_hash
        for existing in self._scenarios.values():
            if (
                existing.study_case_id == study_case_id
                and existing.content_hash == scenario.content_hash
            ):
                raise FaultScenarioDuplicateError(scenario.content_hash)

        # Store
        self._scenarios[scenario.scenario_id] = scenario
        if study_case_id not in self._case_scenarios:
            self._case_scenarios[study_case_id] = []
        self._case_scenarios[study_case_id].append(scenario.scenario_id)

        logger.info(
            "Created fault scenario %s: type=%s, location=%s, hash=%s",
            scenario.scenario_id,
            scenario.fault_type.value,
            scenario.location.element_ref,
            scenario.content_hash[:16],
        )

        return scenario

    def get_scenario(self, scenario_id: UUID) -> FaultScenario:
        """Get a fault scenario by ID."""
        scenario = self._scenarios.get(scenario_id)
        if scenario is None:
            raise FaultScenarioNotFoundError(str(scenario_id))
        return scenario

    def list_scenarios(self, study_case_id: UUID) -> list[FaultScenario]:
        """
        List all fault scenarios for a study case.

        Sorted deterministically by (fault_type, element_ref).
        """
        scenario_ids = self._case_scenarios.get(study_case_id, [])
        scenarios = [
            self._scenarios[sid]
            for sid in scenario_ids
            if sid in self._scenarios
        ]
        scenarios.sort(
            key=lambda s: (s.fault_type.value, s.location.element_ref)
        )
        return scenarios

    def delete_scenario(self, scenario_id: UUID) -> None:
        """
        Delete a fault scenario.

        Raises:
            FaultScenarioNotFoundError: If scenario does not exist.
        """
        scenario = self._scenarios.get(scenario_id)
        if scenario is None:
            raise FaultScenarioNotFoundError(str(scenario_id))

        # Remove from index
        case_ids = self._case_scenarios.get(scenario.study_case_id, [])
        if scenario_id in case_ids:
            case_ids.remove(scenario_id)

        # Remove from store
        del self._scenarios[scenario_id]

        logger.info("Deleted fault scenario %s", scenario_id)

    def validate_scenario(self, scenario_id: UUID) -> None:
        """
        Re-validate an existing scenario's invariants.

        Raises:
            FaultScenarioNotFoundError: If scenario does not exist.
            FaultScenarioValidationError: If invariants are violated.
        """
        scenario = self.get_scenario(scenario_id)
        validate_fault_scenario(scenario)

    def compute_hash(self, scenario_id: UUID) -> str:
        """
        Recompute content hash for a scenario (for verification).

        Returns:
            SHA-256 content hash.
        """
        scenario = self.get_scenario(scenario_id)
        return compute_scenario_content_hash(scenario)
