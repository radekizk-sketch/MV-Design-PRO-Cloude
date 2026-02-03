"""
Projects API — zarządzanie projektami MV-DESIGN PRO.

Endpointy:
  GET  /api/projects           - lista projektów
  POST /api/projects           - utwórz projekt
  GET  /api/projects/{id}      - pobierz projekt

UWAGA: Tymczasowo używa in-memory storage.
Docelowo należy zintegrować z ProjectORM i SQLAlchemy session.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies import get_uow_factory

router = APIRouter(prefix="/api/projects", tags=["projects"])


# =============================================================================
# Pydantic Schemas
# =============================================================================


class ProjectCreate(BaseModel):
    """Request do tworzenia projektu."""
    name: str = Field(..., min_length=1, max_length=255, description="Nazwa projektu")
    description: str | None = Field(None, max_length=1000, description="Opis projektu")


class ProjectResponse(BaseModel):
    """Odpowiedź z danymi projektu."""
    id: str
    name: str
    description: str | None = None
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    """Lista projektów."""
    projects: list[ProjectResponse]
    total: int


# =============================================================================
# In-memory storage (tymczasowe rozwiązanie)
# =============================================================================

# UWAGA: To tymczasowe rozwiązanie. Docelowo użyj SQLAlchemy + ProjectORM.
# Słownik przechowuje projekty w pamięci - dane znikają po restarcie serwera.
_projects: dict[str, dict[str, Any]] = {}


# =============================================================================
# Endpointy
# =============================================================================


@router.get("", response_model=ProjectListResponse)
def list_projects() -> dict[str, Any]:
    """
    Zwraca listę wszystkich projektów.

    GET /api/projects
    """
    projects = [
        ProjectResponse(**p) for p in _projects.values()
    ]
    # Sortowanie po nazwie (deterministyczne)
    projects.sort(key=lambda p: (p.name.lower(), p.id))
    return {"projects": projects, "total": len(projects)}


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(request: ProjectCreate) -> dict[str, Any]:
    """
    Tworzy nowy projekt.

    POST /api/projects
    """
    now = datetime.now(timezone.utc).isoformat()
    project_id = str(uuid4())

    project = {
        "id": project_id,
        "name": request.name,
        "description": request.description,
        "created_at": now,
        "updated_at": now,
    }
    _projects[project_id] = project
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str) -> dict[str, Any]:
    """
    Pobiera projekt po ID.

    GET /api/projects/{project_id}
    """
    # Walidacja UUID
    try:
        UUID(project_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id musi być poprawnym UUID",
        ) from exc

    project = _projects.get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Projekt nie istnieje: {project_id}",
        )
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_project(project_id: str):
    """
    Usuwa projekt.

    DELETE /api/projects/{project_id}
    """
    # Walidacja UUID
    try:
        UUID(project_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id musi być poprawnym UUID",
        ) from exc

    if project_id not in _projects:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Projekt nie istnieje: {project_id}",
        )

    del _projects[project_id]
