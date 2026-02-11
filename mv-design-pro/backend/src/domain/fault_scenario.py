"""
Fault Scenario Domain Model — PR-19

Canonical, deterministic model of a short-circuit fault scenario
as a first-class domain object.

INVARIANTS:
- FaultScenario is IMMUTABLE (frozen dataclass)
- content_hash = SHA-256 of canonical JSON (sorted keys)
- SC_1F requires z0_bus_data (not None)
- location_type="BRANCH" requires position in (0,1)
- location_type="BUS" requires position = None
- ZERO auto-completion — missing data means upstream gating failed
- ZERO randomness — identical input → identical content_hash
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from domain.execution import ExecutionAnalysisType


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class FaultType(str, Enum):
    """Short-circuit fault types (IEC 60909)."""

    SC_3F = "SC_3F"
    SC_2F = "SC_2F"
    SC_1F = "SC_1F"


# Mapping FaultType → ExecutionAnalysisType
FAULT_TYPE_TO_ANALYSIS: dict[FaultType, ExecutionAnalysisType] = {
    FaultType.SC_3F: ExecutionAnalysisType.SC_3F,
    FaultType.SC_2F: ExecutionAnalysisType.SC_2F,
    FaultType.SC_1F: ExecutionAnalysisType.SC_1F,
}


# ---------------------------------------------------------------------------
# Value Objects
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FaultLocation:
    """
    Location of a fault in the network.

    INVARIANTS:
    - location_type="BUS" → position must be None
    - location_type="BRANCH" → position must be in (0.0, 1.0)
    """

    element_ref: str
    location_type: Literal["BUS", "BRANCH"]
    position: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "element_ref": self.element_ref,
            "location_type": self.location_type,
            "position": self.position,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FaultLocation:
        return cls(
            element_ref=data["element_ref"],
            location_type=data["location_type"],
            position=data.get("position"),
        )


@dataclass(frozen=True)
class ShortCircuitConfig:
    """
    Short-circuit calculation configuration.

    Extracted from StudyCaseConfig — only SC-relevant parameters.
    Immutable, deterministic.
    """

    c_factor: float = 1.10
    thermal_time_seconds: float = 1.0
    include_branch_contributions: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "c_factor": self.c_factor,
            "thermal_time_seconds": self.thermal_time_seconds,
            "include_branch_contributions": self.include_branch_contributions,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ShortCircuitConfig:
        return cls(
            c_factor=data.get("c_factor", 1.10),
            thermal_time_seconds=data.get("thermal_time_seconds", 1.0),
            include_branch_contributions=data.get(
                "include_branch_contributions", False
            ),
        )


# ---------------------------------------------------------------------------
# FaultScenario (Aggregate Root)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FaultScenario:
    """
    Fault Scenario — a canonical, deterministic definition of a short-circuit
    fault scenario as a first-class domain object (PR-19).

    INVARIANTS:
    - Immutable (frozen dataclass)
    - content_hash = SHA-256 of canonical JSON (sorted keys)
    - SC_1F → z0_bus_data is required
    - location validated at construction
    - ZERO auto-completion
    - ZERO randomness
    """

    scenario_id: UUID
    study_case_id: UUID
    fault_type: FaultType
    location: FaultLocation
    config: ShortCircuitConfig
    z0_bus_data: dict[str, Any] | None = None
    content_hash: str = ""

    @property
    def analysis_type(self) -> ExecutionAnalysisType:
        """Derived analysis type from fault_type."""
        return FAULT_TYPE_TO_ANALYSIS[self.fault_type]

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary for API responses."""
        return {
            "scenario_id": str(self.scenario_id),
            "study_case_id": str(self.study_case_id),
            "analysis_type": self.analysis_type.value,
            "fault_type": self.fault_type.value,
            "location": self.location.to_dict(),
            "config": self.config.to_dict(),
            "z0_bus_data": self.z0_bus_data,
            "content_hash": self.content_hash,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FaultScenario:
        """Deserialize from dictionary."""
        return cls(
            scenario_id=UUID(data["scenario_id"]),
            study_case_id=UUID(data["study_case_id"]),
            fault_type=FaultType(data["fault_type"]),
            location=FaultLocation.from_dict(data["location"]),
            config=ShortCircuitConfig.from_dict(data.get("config", {})),
            z0_bus_data=data.get("z0_bus_data"),
            content_hash=data.get("content_hash", ""),
        )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


class FaultScenarioValidationError(Exception):
    """Raised when FaultScenario invariants are violated."""

    pass


def validate_fault_scenario(scenario: FaultScenario) -> None:
    """
    Validate FaultScenario invariants. Raises on violation.

    Rules:
    - SC_1F requires z0_bus_data
    - location_type="BRANCH" requires position in (0,1)
    - location_type="BUS" requires position = None
    - c_factor > 0
    - thermal_time_seconds > 0
    """
    loc = scenario.location

    if loc.location_type == "BUS" and loc.position is not None:
        raise FaultScenarioValidationError(
            "Lokalizacja BUS nie może mieć pozycji (position musi być None)"
        )

    if loc.location_type == "BRANCH":
        if loc.position is None:
            raise FaultScenarioValidationError(
                "Lokalizacja BRANCH wymaga pozycji (position)"
            )
        if not (0.0 < loc.position < 1.0):
            raise FaultScenarioValidationError(
                f"Pozycja na gałęzi musi być w zakresie (0, 1), otrzymano: {loc.position}"
            )

    if scenario.fault_type == FaultType.SC_1F and scenario.z0_bus_data is None:
        raise FaultScenarioValidationError(
            "Zwarcie jednofazowe (SC_1F) wymaga danych impedancji zerowej (z0_bus_data)"
        )

    if scenario.config.c_factor <= 0:
        raise FaultScenarioValidationError(
            "Współczynnik napięciowy c_factor musi być > 0"
        )

    if scenario.config.thermal_time_seconds <= 0:
        raise FaultScenarioValidationError(
            "Czas cieplny thermal_time_seconds musi być > 0"
        )


# ---------------------------------------------------------------------------
# Factory Functions
# ---------------------------------------------------------------------------


def compute_scenario_content_hash(scenario: FaultScenario) -> str:
    """
    Compute deterministic SHA-256 of scenario content.

    Hash covers: fault_type, location, config, z0_bus_data, analysis_type.
    Sorted keys for determinism.
    """
    content = {
        "analysis_type": scenario.analysis_type.value,
        "fault_type": scenario.fault_type.value,
        "location": scenario.location.to_dict(),
        "config": scenario.config.to_dict(),
        "z0_bus_data": scenario.z0_bus_data,
    }
    payload = json.dumps(content, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def new_fault_scenario(
    *,
    study_case_id: UUID,
    fault_type: FaultType,
    location: FaultLocation,
    config: ShortCircuitConfig | None = None,
    z0_bus_data: dict[str, Any] | None = None,
) -> FaultScenario:
    """
    Create a new FaultScenario with computed content_hash.

    Validates invariants before returning.

    Args:
        study_case_id: UUID of the parent study case.
        fault_type: SC_3F, SC_2F, or SC_1F.
        location: Fault location (bus or branch).
        config: Short-circuit config (defaults to standard).
        z0_bus_data: Zero-sequence impedance data (required for SC_1F).

    Returns:
        Validated FaultScenario with computed content_hash.

    Raises:
        FaultScenarioValidationError: If invariants are violated.
    """
    cfg = config if config is not None else ShortCircuitConfig()

    # Build scenario without hash first
    scenario = FaultScenario(
        scenario_id=uuid4(),
        study_case_id=study_case_id,
        fault_type=fault_type,
        location=location,
        config=cfg,
        z0_bus_data=z0_bus_data,
        content_hash="",  # Placeholder
    )

    # Validate invariants
    validate_fault_scenario(scenario)

    # Compute content hash
    content_hash = compute_scenario_content_hash(scenario)

    # Return with hash (frozen → need new instance)
    return FaultScenario(
        scenario_id=scenario.scenario_id,
        study_case_id=scenario.study_case_id,
        fault_type=scenario.fault_type,
        location=scenario.location,
        config=scenario.config,
        z0_bus_data=scenario.z0_bus_data,
        content_hash=content_hash,
    )
