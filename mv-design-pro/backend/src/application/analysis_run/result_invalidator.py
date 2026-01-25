from __future__ import annotations

from uuid import UUID

from infrastructure.persistence.unit_of_work import UnitOfWork


class ResultInvalidator:
    def invalidate_project_results(self, uow: UnitOfWork, project_id: UUID) -> int:
        if uow.analysis_runs is None:
            return 0
        return uow.analysis_runs.mark_results_outdated(project_id, commit=False)
