"""
FastAPI backend tests — uses TestClient with a mocked database session.
No running PostgreSQL instance required.
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

# Base.metadata.create_all(bind=engine) runs at import time in app/main.py.
# Patch it at the SQLAlchemy level before the import so no DB connection is
# attempted when the module is loaded.
with patch("sqlalchemy.schema.MetaData.create_all"):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database import get_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TASK_DICT = {
    "id": 1,
    "title": "Test Task",
    "description": "A test description",
    "completed": False,
    "priority": "medium",
    "category": "work",
    "due_date": None,
    "created_at": "2026-01-01T00:00:00+00:00",
    "updated_at": None,
}


def make_mock_task(**overrides):
    """Return a MagicMock that looks like a Task ORM object."""
    data = {**TASK_DICT, **overrides}
    task = MagicMock()
    for key, value in data.items():
        setattr(task, key, value)
    task.to_dict.return_value = data
    return task


def chainable_query(return_value):
    """
    Return a MagicMock that chains .filter() and .order_by() calls back to
    itself, so .all() and .first() can be configured regardless of how many
    filters the route applies.
    """
    q = MagicMock()
    q.filter.return_value = q
    q.order_by.return_value = q
    q.all.return_value = return_value if isinstance(return_value, list) else []
    q.first.return_value = return_value if not isinstance(return_value, list) else None
    return q


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    db = MagicMock()
    # db.execute used by the /health endpoint ("SELECT 1")
    db.execute.return_value = MagicMock()
    return db


@pytest.fixture
def client(mock_db):
    """TestClient with the real get_db dependency replaced by the mock."""
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as c:
        yield c, mock_db
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_200(self, client):
        c, _ = client
        response = c.get("/health")
        assert response.status_code == 200

    def test_health_response_body(self, client):
        c, _ = client
        body = c.get("/health").json()
        assert body["status"] == "healthy"
        assert "database_status" in body
        assert "version" in body


# ---------------------------------------------------------------------------
# GET /tasks
# ---------------------------------------------------------------------------

class TestGetTasks:
    def test_get_tasks_empty_list(self, client):
        c, db = client
        db.query.return_value = chainable_query([])
        response = c.get("/tasks")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tasks_returns_tasks(self, client):
        c, db = client
        task = make_mock_task()
        db.query.return_value = chainable_query([task])
        response = c.get("/tasks")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Task"
        assert data[0]["priority"] == "medium"


# ---------------------------------------------------------------------------
# POST /tasks
# ---------------------------------------------------------------------------

class TestCreateTask:
    def test_create_task_returns_201(self, client):
        c, _ = client
        response = c.post("/tasks", json={"title": "New Task"})
        assert response.status_code == 201

    def test_create_task_missing_title_returns_422(self, client):
        c, _ = client
        response = c.post("/tasks", json={"priority": "high"})
        assert response.status_code == 422

    def test_create_task_invalid_priority_returns_422(self, client):
        c, _ = client
        response = c.post("/tasks", json={"title": "Task", "priority": "urgent"})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /tasks/{task_id}
# ---------------------------------------------------------------------------

class TestGetTaskById:
    def test_get_task_returns_200(self, client):
        c, db = client
        task = make_mock_task()
        db.query.return_value = chainable_query(task)
        response = c.get("/tasks/1")
        assert response.status_code == 200
        assert response.json()["id"] == 1

    def test_get_task_not_found_returns_404(self, client):
        c, db = client
        db.query.return_value = chainable_query(None)
        response = c.get("/tasks/999")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# PUT /tasks/{task_id}
# ---------------------------------------------------------------------------

class TestReplaceTask:
    def test_put_task_returns_200(self, client):
        c, db = client
        task = make_mock_task(title="Updated Task")
        db.query.return_value = chainable_query(task)
        response = c.put("/tasks/1", json={"title": "Updated Task"})
        assert response.status_code == 200

    def test_put_task_not_found_returns_404(self, client):
        c, db = client
        db.query.return_value = chainable_query(None)
        response = c.put("/tasks/999", json={"title": "Updated Task"})
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /tasks/{task_id}
# ---------------------------------------------------------------------------

class TestDeleteTask:
    def test_delete_task_returns_204(self, client):
        c, db = client
        task = make_mock_task()
        db.query.return_value = chainable_query(task)
        response = c.delete("/tasks/1")
        assert response.status_code == 204

    def test_delete_task_not_found_returns_404(self, client):
        c, db = client
        db.query.return_value = chainable_query(None)
        response = c.delete("/tasks/999")
        assert response.status_code == 404
