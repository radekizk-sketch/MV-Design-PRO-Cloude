from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from api.main import app
from infrastructure.persistence.db import (
    create_engine_from_url,
    create_session_factory,
    init_db,
)
from infrastructure.persistence.models import NetworkSnapshotORM
from infrastructure.persistence.repositories import SnapshotRepository
from infrastructure.persistence.unit_of_work import build_uow_factory
from network_model.core import Branch, BranchType, NetworkGraph, Node, NodeType
from network_model.core.snapshot import NetworkSnapshot, SnapshotMeta

NETWORK_MODEL_ID = "model-1"


def _build_snapshot(snapshot_id: str) -> NetworkSnapshot:
    graph = NetworkGraph(network_model_id=NETWORK_MODEL_ID)
    graph.add_node(
        Node(
            id="node-1",
            name="Node 1",
            node_type=NodeType.SLACK,
            voltage_level=15.0,
            voltage_magnitude=1.0,
            voltage_angle=0.0,
        )
    )
    graph.add_node(
        Node(
            id="node-2",
            name="Node 2",
            node_type=NodeType.PQ,
            voltage_level=15.0,
            active_power=1.0,
            reactive_power=0.5,
        )
    )
    graph.add_branch(
        Branch(
            id="branch-1",
            name="Line 1",
            branch_type=BranchType.LINE,
            from_node_id="node-1",
            to_node_id="node-2",
            in_service=True,
        )
    )
    meta = SnapshotMeta.create(
        snapshot_id=snapshot_id,
        created_at="2024-01-01T00:00:00+00:00",
        schema_version="v1",
        network_model_id=NETWORK_MODEL_ID,
    )
    return NetworkSnapshot(meta=meta, graph=graph)


@pytest.fixture()
def api_client(tmp_path):
    db_path = tmp_path / "snapshot_api.db"
    engine = create_engine_from_url(f"sqlite+pysqlite:///{db_path}")
    init_db(engine)
    session_factory = create_session_factory(engine)
    app.state.uow_factory = build_uow_factory(session_factory)

    session = session_factory()
    repo = SnapshotRepository(session)
    snapshot = _build_snapshot("snap-1")
    repo.add_snapshot(snapshot)
    session.close()

    client = TestClient(app)
    return client, snapshot, session_factory


def test_get_snapshot_returns_persisted_snapshot(api_client):
    client, snapshot, _session_factory = api_client

    response = client.get(f"/snapshots/{snapshot.meta.snapshot_id}")

    assert response.status_code == 200
    expected = NetworkSnapshot.from_dict(snapshot.to_dict()).to_dict()
    assert response.json() == expected


def test_submit_action_accepts_and_creates_snapshot(api_client):
    client, snapshot, _session_factory = api_client
    action_payload = {
        "action_id": "action-1",
        "parent_snapshot_id": snapshot.meta.snapshot_id,
        "action_type": "create_node",
        "payload": {
            "id": "node-3",
            "name": "Node 3",
            "node_type": "PQ",
            "voltage_level": 15.0,
            "active_power": 2.0,
            "reactive_power": 1.0,
        },
        "created_at": "2024-01-02T00:00:00+00:00",
        "actor": "api",
    }

    response = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions", json=action_payload
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["result"]["status"] == "accepted"
    assert payload["new_snapshot_id"] == "action-1"

    snapshot_response = client.get("/snapshots/action-1")
    assert snapshot_response.status_code == 200
    assert "node-3" in {
        node["id"] for node in snapshot_response.json()["graph"]["nodes"]
    }


def test_submit_action_rejects_invalid_reference(api_client):
    client, snapshot, _session_factory = api_client
    action_payload = {
        "action_id": "action-2",
        "parent_snapshot_id": snapshot.meta.snapshot_id,
        "action_type": "set_in_service",
        "payload": {"entity_id": "missing", "in_service": True},
        "created_at": "2024-01-02T00:00:00+00:00",
    }

    response = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions", json=action_payload
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["result"]["status"] == "rejected"
    assert payload["result"]["errors"][0]["code"] == "unknown_entity"
    assert payload["result"]["errors"][0]["path"] == "payload.entity_id"
    assert "new_snapshot_id" not in payload

    missing_snapshot = client.get("/snapshots/action-2")
    assert missing_snapshot.status_code == 404


def test_submit_action_is_deterministic_on_same_parent(api_client):
    client, snapshot, _session_factory = api_client
    created_at = datetime(2024, 1, 2, tzinfo=timezone.utc).isoformat()
    base_payload = {
        "parent_snapshot_id": snapshot.meta.snapshot_id,
        "action_type": "create_node",
        "payload": {
            "id": "node-4",
            "name": "Node 4",
            "node_type": "PQ",
            "voltage_level": 15.0,
            "active_power": 2.5,
            "reactive_power": 1.25,
        },
        "created_at": created_at,
    }

    first = dict(base_payload)
    first["action_id"] = "action-3"
    second = dict(base_payload)
    second["action_id"] = "action-4"

    response_first = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions", json=first
    )
    response_second = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions", json=second
    )

    assert response_first.status_code == 200
    assert response_second.status_code == 200

    snapshot_first = client.get("/snapshots/action-3").json()
    snapshot_second = client.get("/snapshots/action-4").json()

    assert snapshot_first["graph"] == snapshot_second["graph"]


def test_submit_batch_actions_accepts_and_creates_snapshot(api_client):
    client, snapshot, _session_factory = api_client
    # NOTE: set_pcc action was removed. PCC – punkt wspólnego przyłączenia
    # is interpretation, not a model property stored in NetworkGraph.
    action_payload = [
        {
            "action_id": "batch-action-1",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_node",
            "payload": {
                "id": "node-3",
                "name": "Node 3",
                "node_type": "PQ",
                "voltage_level": 15.0,
                "active_power": 2.0,
                "reactive_power": 1.0,
            },
            "created_at": "2024-01-02T00:00:00+00:00",
        },
        {
            "action_id": "batch-action-2",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_node",
            "payload": {
                "id": "node-4",
                "name": "Node 4",
                "node_type": "PQ",
                "voltage_level": 15.0,
                "active_power": 1.5,
                "reactive_power": 0.75,
            },
            "created_at": "2024-01-02T00:01:00+00:00",
        },
        {
            "action_id": "batch-action-3",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_branch",
            "payload": {
                "id": "branch-2",
                "from_node_id": "node-3",
                "to_node_id": "node-4",
                "branch_kind": "LINE",
                "in_service": True,
            },
            "created_at": "2024-01-02T00:02:00+00:00",
        },
    ]

    response = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions:batch",
        json={"actions": action_payload},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "accepted"
    assert payload["new_snapshot_id"]
    assert len(payload["action_results"]) == 3
    assert all(result["status"] == "accepted" for result in payload["action_results"])

    new_snapshot_id = payload["new_snapshot_id"]
    snapshot_response = client.get(f"/snapshots/{new_snapshot_id}")
    assert snapshot_response.status_code == 200
    graph = snapshot_response.json()["graph"]
    assert {"node-3", "node-4"}.issubset({node["id"] for node in graph["nodes"]})
    assert "branch-2" in {branch["id"] for branch in graph["branches"]}
    # pcc_node_id is no longer stored in graph

    parent_response = client.get(f"/snapshots/{snapshot.meta.snapshot_id}")
    assert parent_response.status_code == 200
    parent_graph = parent_response.json()["graph"]
    assert "node-3" not in {node["id"] for node in parent_graph["nodes"]}


def test_submit_batch_actions_rejects_invalid_reference(api_client):
    client, snapshot, session_factory = api_client
    action_payload = [
        {
            "action_id": "batch-action-5",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_node",
            "payload": {
                "id": "node-5",
                "name": "Node 5",
                "node_type": "PQ",
                "voltage_level": 15.0,
                "active_power": 2.0,
                "reactive_power": 1.0,
            },
            "created_at": "2024-01-03T00:00:00+00:00",
        },
        {
            "action_id": "batch-action-6",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_branch",
            "payload": {
                "id": "branch-3",
                "from_node_id": "missing-node",
                "to_node_id": "node-5",
                "branch_kind": "LINE",
                "in_service": True,
            },
            "created_at": "2024-01-03T00:01:00+00:00",
        },
    ]

    response = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions:batch",
        json={"actions": action_payload},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "rejected"
    assert payload["new_snapshot_id"] is None
    assert len(payload["action_results"]) == 2
    assert payload["action_results"][0]["errors"][0]["code"] == "batch_aborted"
    assert payload["action_results"][1]["errors"][0]["code"] == "unknown_node"
    assert payload["action_results"][1]["errors"][0]["path"] == "payload.from_node_id"

    session = session_factory()
    count = session.query(NetworkSnapshotORM).count()
    session.close()
    assert count == 1


def test_submit_batch_actions_is_deterministic_on_same_parent(api_client):
    client, snapshot, _session_factory = api_client
    actions = [
        {
            "action_id": "batch-action-7",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_node",
            "payload": {
                "id": "node-6",
                "name": "Node 6",
                "node_type": "PQ",
                "voltage_level": 15.0,
                "active_power": 1.0,
                "reactive_power": 0.5,
            },
            "created_at": "2024-01-04T00:00:00+00:00",
        },
        {
            "action_id": "batch-action-8",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_branch",
            "payload": {
                "id": "branch-4",
                "from_node_id": "node-6",
                "to_node_id": "node-1",
                "branch_kind": "LINE",
                "in_service": True,
            },
            "created_at": "2024-01-04T00:01:00+00:00",
        },
    ]

    response_first = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions:batch",
        json={"actions": actions},
    )
    response_second = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions:batch",
        json={"actions": actions},
    )

    assert response_first.status_code == 200
    assert response_second.status_code == 200

    snapshot_first = client.get(
        f"/snapshots/{response_first.json()['new_snapshot_id']}"
    ).json()
    snapshot_second = client.get(
        f"/snapshots/{response_second.json()['new_snapshot_id']}"
    ).json()

    assert snapshot_first["graph"] == snapshot_second["graph"]


def test_submit_batch_actions_rejected_is_atomic(api_client):
    client, snapshot, session_factory = api_client
    actions = [
        {
            "action_id": "batch-action-9",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_node",
            "payload": {
                "id": "node-7",
                "name": "Node 7",
                "node_type": "PQ",
                "voltage_level": 15.0,
                "active_power": 1.0,
                "reactive_power": 0.5,
            },
            "created_at": "2024-01-05T00:00:00+00:00",
        },
        {
            "action_id": "batch-action-10",
            "parent_snapshot_id": snapshot.meta.snapshot_id,
            "action_type": "create_branch",
            "payload": {
                "id": "branch-5",
                "from_node_id": "node-7",
                "to_node_id": "missing-node",
                "branch_kind": "LINE",
                "in_service": True,
            },
            "created_at": "2024-01-05T00:01:00+00:00",
        },
    ]

    response = client.post(
        f"/snapshots/{snapshot.meta.snapshot_id}/actions:batch",
        json={"actions": actions},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "rejected"
    assert payload["new_snapshot_id"] is None

    parent_snapshot = client.get(f"/snapshots/{snapshot.meta.snapshot_id}").json()
    assert "node-7" not in {node["id"] for node in parent_snapshot["graph"]["nodes"]}

    session = session_factory()
    count = session.query(NetworkSnapshotORM).count()
    session.close()
    assert count == 1
