from __future__ import annotations

from dataclasses import replace
from typing import Any, Callable

from infrastructure.persistence.unit_of_work import UnitOfWork
from network_model.core import (
    ActionEnvelope,
    ActionIssue,
    ActionResult,
    NetworkSnapshot,
    apply_action_to_snapshot,
    validate_action_envelope,
)


class SnapshotService:
    def __init__(self, uow_factory: Callable[[], UnitOfWork]) -> None:
        self._uow_factory = uow_factory

    def get_snapshot(self, snapshot_id: str) -> NetworkSnapshot:
        with self._uow_factory() as uow:
            snapshot = uow.snapshots.get_snapshot(snapshot_id)
        if snapshot is None:
            raise ValueError(f"Snapshot {snapshot_id} not found")
        return snapshot

    def submit_action(
        self, parent_snapshot_id: str, action_payload: dict[str, Any]
    ) -> tuple[ActionResult, str | None]:
        with self._uow_factory() as uow:
            snapshot = uow.snapshots.get_snapshot(parent_snapshot_id)
            if snapshot is None:
                raise ValueError(f"Snapshot {parent_snapshot_id} not found")
            envelope = _build_envelope(action_payload)
            result = validate_action_envelope(envelope, snapshot)
            result = _enforce_parent_snapshot_match(result, envelope, parent_snapshot_id)
            if result.status != "accepted":
                return result, None
            accepted_action = replace(envelope, status="accepted")
            new_snapshot = apply_action_to_snapshot(snapshot, accepted_action)
            uow.snapshots.add_snapshot(new_snapshot, commit=False)
            return result, new_snapshot.meta.snapshot_id


def _build_envelope(payload: dict[str, Any]) -> ActionEnvelope:
    return ActionEnvelope(
        action_id=_string_or_none(payload.get("action_id")),
        parent_snapshot_id=_string_or_none(payload.get("parent_snapshot_id")),
        action_type=_string_or_none(payload.get("action_type")),
        payload=payload.get("payload", {}),
        created_at=_string_or_none(payload.get("created_at")),
        status=_string_or_none(payload.get("status")),
        actor=_string_or_none(payload.get("actor")),
        schema_version=payload.get("schema_version"),
    )


def _string_or_none(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _enforce_parent_snapshot_match(
    result: ActionResult,
    envelope: ActionEnvelope,
    parent_snapshot_id: str,
) -> ActionResult:
    errors = list(result.errors)
    if (
        envelope.parent_snapshot_id is not None
        and envelope.parent_snapshot_id != parent_snapshot_id
    ):
        errors.append(
            ActionIssue(
                code="parent_snapshot_mismatch",
                message="Action parent_snapshot_id does not match requested snapshot.",
                path="parent_snapshot_id",
            )
        )
    status = result.status
    if errors:
        status = "rejected"
    return ActionResult(
        status=status,
        action_id=envelope.action_id,
        parent_snapshot_id=parent_snapshot_id,
        errors=errors,
        warnings=list(result.warnings),
    )
