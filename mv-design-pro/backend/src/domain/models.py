from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from domain.project_design_mode import ProjectDesignMode

@dataclass(frozen=True)
class Project:
    id: UUID
    name: str
    description: str | None = None
    schema_version: str = "1.0"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class Network:
    id: UUID
    project_id: UUID
    name: str
    revision: int = 1
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class OperatingCase:
    id: UUID
    project_id: UUID
    name: str
    case_payload: dict
    project_design_mode: ProjectDesignMode | None = None
    revision: int = 1
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class StudyCase:
    id: UUID
    project_id: UUID
    name: str
    study_payload: dict
    revision: int = 1
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class Scenario:
    id: UUID
    project_id: UUID
    name: str
    metadata: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class StudyRun:
    id: UUID
    project_id: UUID
    case_id: UUID
    analysis_type: str
    input_hash: str
    status: str = "pending"
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: datetime | None = None


def new_project(name: str, description: str | None = None) -> Project:
    return Project(id=uuid4(), name=name, description=description)


def new_network(project_id: UUID, name: str) -> Network:
    return Network(id=uuid4(), project_id=project_id, name=name)


def new_operating_case(
    project_id: UUID,
    name: str,
    case_payload: dict,
    project_design_mode: ProjectDesignMode | None = None,
) -> OperatingCase:
    return OperatingCase(
        id=uuid4(),
        project_id=project_id,
        name=name,
        case_payload=case_payload,
        project_design_mode=project_design_mode,
    )


def new_study_case(project_id: UUID, name: str, study_payload: dict) -> StudyCase:
    return StudyCase(id=uuid4(), project_id=project_id, name=name, study_payload=study_payload)


def new_scenario(project_id: UUID, name: str, metadata: dict | None = None) -> Scenario:
    return Scenario(id=uuid4(), project_id=project_id, name=name, metadata=metadata or {})


def new_study_run(
    project_id: UUID,
    case_id: UUID,
    analysis_type: str,
    input_hash: str,
) -> StudyRun:
    return StudyRun(
        id=uuid4(),
        project_id=project_id,
        case_id=case_id,
        analysis_type=analysis_type,
        input_hash=input_hash,
    )
