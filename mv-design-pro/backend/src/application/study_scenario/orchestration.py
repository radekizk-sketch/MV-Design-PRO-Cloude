from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from application.study_scenario.models import (
    Run,
    RunStatus,
    Scenario,
    ScenarioType,
    Snapshot,
    Study,
    create_run,
    create_scenario,
    create_snapshot,
    create_study,
)
from application.study_scenario.repository import StudyScenarioRepository
from application.study_scenario.serializer import run_to_dict, scenario_to_dict, study_to_dict


class StudyScenarioOrchestrator:
    """Read-only orchestration layer for Study/Scenario/Run (P23)."""

    def __init__(self, repository: StudyScenarioRepository) -> None:
        self._repository = repository

    def create_study(
        self,
        *,
        name: str,
        description: str,
        created_by: str,
        assumptions: list[str] | None = None,
        normative_profile_id: str | None = None,
        created_at: datetime | None = None,
    ) -> Study:
        study = create_study(
            name=name,
            description=description,
            created_by=created_by,
            assumptions=assumptions,
            normative_profile_id=normative_profile_id,
            created_at=created_at,
        )
        return self._repository.add_study(study)

    def create_scenario(
        self,
        *,
        study_id: UUID,
        name: str,
        description: str,
        scenario_type: ScenarioType,
        switches_state_ref: Any,
        sources_state_ref: Any,
        loads_state_ref: Any,
        constraints_ref: Any,
        is_base: bool,
    ) -> Scenario:
        if self._repository.get_study(study_id) is None:
            raise ValueError("Study does not exist")
        if is_base:
            existing_base = list(self._repository.list_base_scenarios(study_id))
            if existing_base:
                raise ValueError("Base Scenario already exists for Study")
        scenario = create_scenario(
            study_id=study_id,
            name=name,
            description=description,
            scenario_type=scenario_type,
            switches_state_ref=switches_state_ref,
            sources_state_ref=sources_state_ref,
            loads_state_ref=loads_state_ref,
            constraints_ref=constraints_ref,
            is_base=is_base,
        )
        return self._repository.add_scenario(scenario)

    def register_snapshot(
        self,
        *,
        description: str,
        snapshot_hash: str,
        created_at: datetime | None = None,
    ) -> Snapshot:
        snapshot = create_snapshot(
            description=description,
            snapshot_hash=snapshot_hash,
            created_at=created_at,
        )
        return self._repository.add_snapshot(snapshot)

    def attach_run(
        self,
        *,
        scenario_id: UUID,
        created_at: datetime | None = None,
        input_snapshot_id: UUID | None,
        solver_versions: dict[str, str] | None = None,
        proof_set_ids: list[str] | None = None,
        normative_report_id: str | None = None,
        voltage_profile_view_id: str | None = None,
        protection_insight_view_id: str | None = None,
        protection_curves_it_view_id: str | None = None,
        report_p24_plus_id: str | None = None,
        status: RunStatus | None = None,
    ) -> Run:
        if self._repository.get_scenario(scenario_id) is None:
            raise ValueError("Scenario does not exist")
        resolved_status = self._resolve_run_status(input_snapshot_id, status)
        run = create_run(
            scenario_id=scenario_id,
            created_at=created_at,
            input_snapshot_id=input_snapshot_id,
            solver_versions=solver_versions,
            proof_set_ids=proof_set_ids,
            normative_report_id=normative_report_id,
            voltage_profile_view_id=voltage_profile_view_id,
            protection_insight_view_id=protection_insight_view_id,
            protection_curves_it_view_id=protection_curves_it_view_id,
            report_p24_plus_id=report_p24_plus_id,
            status=resolved_status,
        )
        return self._repository.add_run(run)

    def _resolve_run_status(
        self, input_snapshot_id: UUID | None, status: RunStatus | None
    ) -> RunStatus:
        if input_snapshot_id is None:
            return RunStatus.NOT_COMPUTED
        if self._repository.get_snapshot(input_snapshot_id) is None:
            return RunStatus.NOT_COMPUTED
        return status or RunStatus.COMPLETE

    def get_study_bundle(self, study_id: UUID) -> dict[str, Any]:
        study = self._repository.get_study(study_id)
        if study is None:
            raise ValueError("Study does not exist")
        scenarios = self._repository.list_scenarios(study_id)
        scenario_payloads = []
        for scenario in scenarios:
            runs = self._repository.list_runs(scenario.scenario_id)
            scenario_payloads.append(
                {
                    **scenario_to_dict(scenario),
                    "runs": [run_to_dict(run) for run in runs],
                }
            )
        return {
            "study": study_to_dict(study),
            "scenarios": scenario_payloads,
        }
