from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


class GUID(TypeDecorator[UUID]):
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID

            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value: UUID | None, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value: str | None, dialect):
        if value is None:
            return None
        return UUID(value)


def _canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _canonicalize(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    return value


class DeterministicJSON(TypeDecorator[Any]):
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect):
        if value is None:
            return None
        canonical = _canonicalize(value)
        if dialect.name == "postgresql":
            return canonical
        return json.dumps(canonical, sort_keys=True, separators=(",", ":"))

    def process_result_value(self, value: Any, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.loads(value)


class ProjectORM(Base):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    schema_version: Mapped[str] = mapped_column(String(50), nullable=False)
    pcc_node_id: Mapped[UUID | None] = mapped_column(
        GUID(), ForeignKey("network_nodes.id", use_alter=True, name="fk_projects_pcc_node")
    )
    sources_jsonb: Mapped[list[dict[str, Any]]] = mapped_column(
        DeterministicJSON(), nullable=False, default=list
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProjectSettingsORM(Base):
    __tablename__ = "project_settings"

    project_id: Mapped[UUID] = mapped_column(
        GUID(), ForeignKey("projects.id"), primary_key=True
    )
    pcc_node_id: Mapped[UUID | None] = mapped_column(
        GUID(), ForeignKey("network_nodes.id", use_alter=True, name="fk_settings_pcc_node")
    )
    grounding_jsonb: Mapped[dict[str, Any]] = mapped_column(
        DeterministicJSON(), nullable=False, default=dict
    )
    limits_jsonb: Mapped[dict[str, Any]] = mapped_column(
        DeterministicJSON(), nullable=False, default=dict
    )


class NetworkNodeORM(Base):
    __tablename__ = "network_nodes"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    node_type: Mapped[str] = mapped_column(String(100), nullable=False)
    base_kv: Mapped[float] = mapped_column(Float, nullable=False)
    attrs_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)


class NetworkBranchORM(Base):
    __tablename__ = "network_branches"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch_type: Mapped[str] = mapped_column(String(100), nullable=False)
    from_node_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("network_nodes.id"))
    to_node_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("network_nodes.id"))
    in_service: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    params_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)


class NetworkSourceORM(Base):
    __tablename__ = "network_sources"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    node_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("network_nodes.id"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    in_service: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class NetworkLoadORM(Base):
    __tablename__ = "network_loads"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    node_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("network_nodes.id"), nullable=False)
    payload_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    in_service: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class LineTypeORM(Base):
    __tablename__ = "line_types"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    params_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)


class CableTypeORM(Base):
    __tablename__ = "cable_types"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    params_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)


class TransformerTypeORM(Base):
    __tablename__ = "transformer_types"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    params_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)


class SwitchingStateORM(Base):
    __tablename__ = "network_switching_states"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    case_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("operating_cases.id"))
    element_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    element_type: Mapped[str] = mapped_column(String(50), nullable=False)
    in_service: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class OperatingCaseORM(Base):
    __tablename__ = "operating_cases"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    case_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StudyCaseORM(Base):
    __tablename__ = "study_cases"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    study_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ScenarioORM(Base):
    __tablename__ = "scenarios"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AnalysisRunORM(Base):
    __tablename__ = "analysis_runs"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "operating_case_id",
            "analysis_type",
            "input_hash",
            name="uq_analysis_runs_deterministic",
        ),
        Index("ix_analysis_runs_input_hash", "input_hash"),
    )

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    operating_case_id: Mapped[UUID] = mapped_column(
        GUID(), ForeignKey("operating_cases.id"), nullable=False
    )
    analysis_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    input_snapshot: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    result_summary: Mapped[dict[str, Any]] = mapped_column(
        DeterministicJSON(), nullable=False, default=dict
    )
    error_message: Mapped[str | None] = mapped_column(Text)


class StudyRunORM(Base):
    __tablename__ = "study_runs"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    case_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("study_cases.id"), nullable=False)
    analysis_type: Mapped[str] = mapped_column(String(100), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StudyResultORM(Base):
    __tablename__ = "study_results"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    run_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("study_runs.id"), nullable=False)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    result_type: Mapped[str] = mapped_column(String(100), nullable=False)
    result_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SldDiagramORM(Base):
    __tablename__ = "sld_diagrams"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sld_jsonb: Mapped[dict[str, Any]] = mapped_column(DeterministicJSON(), nullable=False)
    dirty_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SldNodeSymbolORM(Base):
    __tablename__ = "sld_node_symbols"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    diagram_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("sld_diagrams.id"))
    node_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    label: Mapped[str | None] = mapped_column(String(255))
    is_pcc: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class SldBranchSymbolORM(Base):
    __tablename__ = "sld_branch_symbols"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    diagram_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("sld_diagrams.id"))
    branch_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    from_node_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    to_node_id: Mapped[UUID] = mapped_column(GUID(), nullable=False)
    points_jsonb: Mapped[list[dict[str, Any]]] = mapped_column(
        DeterministicJSON(), nullable=False, default=list
    )


class SldAnnotationORM(Base):
    __tablename__ = "sld_annotations"

    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True)
    diagram_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("sld_diagrams.id"))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
