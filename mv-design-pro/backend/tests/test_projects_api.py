"""Smoke testy Projects API."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Test client dla API."""
    import sys
    sys.path.insert(0, 'src')
    from api.main import app
    return TestClient(app)


def test_list_projects_empty(client):
    """Test listy projektów - pusta."""
    res = client.get("/api/projects")
    assert res.status_code == 200
    data = res.json()
    assert "projects" in data
    assert "total" in data


def test_create_project(client):
    """Test tworzenia projektu."""
    res = client.post("/api/projects", json={"name": "Test Projekt"})
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Test Projekt"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_project_with_description(client):
    """Test tworzenia projektu z opisem."""
    res = client.post(
        "/api/projects",
        json={"name": "Projekt z opisem", "description": "Opis testowy"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Projekt z opisem"
    assert data["description"] == "Opis testowy"


def test_get_project(client):
    """Test pobierania projektu."""
    # Utwórz projekt
    res = client.post("/api/projects", json={"name": "Do pobrania"})
    assert res.status_code == 201
    project_id = res.json()["id"]

    # Pobierz projekt
    res2 = client.get(f"/api/projects/{project_id}")
    assert res2.status_code == 200
    assert res2.json()["name"] == "Do pobrania"


def test_get_nonexistent_project(client):
    """Test pobierania nieistniejącego projektu."""
    res = client.get("/api/projects/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


def test_get_project_invalid_uuid(client):
    """Test pobierania projektu z niepoprawnym UUID."""
    res = client.get("/api/projects/invalid-uuid")
    assert res.status_code == 400


def test_create_project_empty_name(client):
    """Test tworzenia projektu z pustą nazwą."""
    res = client.post("/api/projects", json={"name": ""})
    assert res.status_code == 422  # Validation error


def test_delete_project(client):
    """Test usuwania projektu."""
    # Utwórz projekt
    res = client.post("/api/projects", json={"name": "Do usunięcia"})
    assert res.status_code == 201
    project_id = res.json()["id"]

    # Usuń projekt
    res2 = client.delete(f"/api/projects/{project_id}")
    assert res2.status_code == 204

    # Sprawdź że nie istnieje
    res3 = client.get(f"/api/projects/{project_id}")
    assert res3.status_code == 404


def test_delete_nonexistent_project(client):
    """Test usuwania nieistniejącego projektu."""
    res = client.delete("/api/projects/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404
