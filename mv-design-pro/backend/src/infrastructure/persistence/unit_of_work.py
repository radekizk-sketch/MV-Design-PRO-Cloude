from __future__ import annotations

from contextlib import AbstractContextManager
from typing import Callable

from sqlalchemy.orm import Session, sessionmaker

from infrastructure.persistence.repositories import (
    CaseRepository,
    NetworkRepository,
    NetworkWizardRepository,
    ProjectRepository,
)


class UnitOfWork(AbstractContextManager["UnitOfWork"]):
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory
        self.session: Session | None = None
        self.projects: ProjectRepository | None = None
        self.network: NetworkRepository | None = None
        self.cases: CaseRepository | None = None
        self.wizard: NetworkWizardRepository | None = None

    def __enter__(self) -> "UnitOfWork":
        self.session = self._session_factory()
        self.projects = ProjectRepository(self.session)
        self.network = NetworkRepository(self.session)
        self.cases = CaseRepository(self.session)
        self.wizard = NetworkWizardRepository(self.session)
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        if self.session is None:
            return False
        if exc_type is None:
            self.session.commit()
        else:
            self.session.rollback()
        self.session.close()
        return False


def build_uow_factory(
    session_factory: sessionmaker[Session],
) -> Callable[[], UnitOfWork]:
    return lambda: UnitOfWork(session_factory)
