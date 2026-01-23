from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from domain.models import OperatingCase, StudyCase
from domain.project_design_mode import ProjectDesignMode
from infrastructure.persistence.models import OperatingCaseORM, StudyCaseORM


class CaseRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add_operating_case(self, case: OperatingCase, *, commit: bool = True) -> None:
        self._session.add(
            OperatingCaseORM(
                id=case.id,
                project_id=case.project_id,
                name=case.name,
                case_jsonb=case.case_payload,
                project_design_mode=case.project_design_mode.value
                if case.project_design_mode is not None
                else None,
                created_at=case.created_at,
                updated_at=case.updated_at,
            )
        )
        if commit:
            self._session.commit()

    def get_operating_case(self, case_id: UUID) -> OperatingCase | None:
        stmt = select(OperatingCaseORM).where(OperatingCaseORM.id == case_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return OperatingCase(
            id=row.id,
            project_id=row.project_id,
            name=row.name,
            case_payload=row.case_jsonb,
            project_design_mode=ProjectDesignMode(row.project_design_mode)
            if row.project_design_mode
            else None,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def list_operating_cases(self, project_id: UUID) -> list[OperatingCase]:
        stmt = select(OperatingCaseORM).where(OperatingCaseORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            OperatingCase(
                id=row.id,
                project_id=row.project_id,
                name=row.name,
                case_payload=row.case_jsonb,
                project_design_mode=ProjectDesignMode(row.project_design_mode)
                if row.project_design_mode
                else None,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]

    def update_operating_case(self, case: OperatingCase, *, commit: bool = True) -> None:
        stmt = select(OperatingCaseORM).where(OperatingCaseORM.id == case.id)
        row = self._session.execute(stmt).scalar_one()
        row.name = case.name
        row.case_jsonb = case.case_payload
        row.project_design_mode = (
            case.project_design_mode.value if case.project_design_mode is not None else None
        )
        row.updated_at = case.updated_at
        if commit:
            self._session.commit()

    def add_study_case(self, case: StudyCase, *, commit: bool = True) -> None:
        self._session.add(
            StudyCaseORM(
                id=case.id,
                project_id=case.project_id,
                name=case.name,
                study_jsonb=case.study_payload,
                created_at=case.created_at,
                updated_at=case.updated_at,
            )
        )
        if commit:
            self._session.commit()

    def update_study_case(self, case: StudyCase, *, commit: bool = True) -> None:
        stmt = select(StudyCaseORM).where(StudyCaseORM.id == case.id)
        row = self._session.execute(stmt).scalar_one()
        row.name = case.name
        row.study_jsonb = case.study_payload
        row.updated_at = case.updated_at
        if commit:
            self._session.commit()

    def delete_operating_cases_by_project(self, project_id: UUID, *, commit: bool = True) -> None:
        self._session.query(OperatingCaseORM).filter(
            OperatingCaseORM.project_id == project_id
        ).delete()
        if commit:
            self._session.commit()

    def delete_study_cases_by_project(self, project_id: UUID, *, commit: bool = True) -> None:
        self._session.query(StudyCaseORM).filter(
            StudyCaseORM.project_id == project_id
        ).delete()
        if commit:
            self._session.commit()

    def get_study_case(self, case_id: UUID) -> StudyCase | None:
        stmt = select(StudyCaseORM).where(StudyCaseORM.id == case_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return StudyCase(
            id=row.id,
            project_id=row.project_id,
            name=row.name,
            study_payload=row.study_jsonb,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def list_study_cases(self, project_id: UUID) -> list[StudyCase]:
        stmt = select(StudyCaseORM).where(StudyCaseORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [
            StudyCase(
                id=row.id,
                project_id=row.project_id,
                name=row.name,
                study_payload=row.study_jsonb,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]
