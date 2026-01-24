# Designer UI

Thin client for snapshot-based API. No interpretation. No wizards. No suggestions.

## Canonical Flow

```
project → case → snapshot → actions → run
```

**CRITICAL**: Actions are ONLY available when snapshot is active.

## Architecture

```
UI ─────────────────────────────────────────────────────────────────
  │
  ├── api.ts          → raw fetch calls to snapshot endpoints
  ├── types.ts        → mirrors backend snapshot contract
  ├── SnapshotView    → renders GET /snapshots/{id}
  ├── ActionsList     → renders POST /snapshots/{id}/actions (empty body)
  ├── ActionResult    → renders POST /run response
  └── DesignerPage    → composes views, requires snapshotId prop
```

## API Contract

### GET /snapshots/{snapshot_id}

Returns snapshot. UI renders 1:1.

```json
{
  "meta": {
    "snapshot_id": "abc123",
    "parent_snapshot_id": null,
    "schema_version": "1.0",
    "created_at": "2026-01-24T12:00:00Z"
  },
  "graph": { ... }
}
```

### POST /snapshots/{snapshot_id}/actions

With **empty body `{}`** to fetch available actions.
UI renders ALL actions. Never hides BLOCKED.

```json
[
  {
    "action_id": "action-001",
    "action_type": "run_short_circuit",
    "label": "Run Short-Circuit",
    "status": "ALLOWED",
    "blocked_reason": null
  },
  {
    "action_id": "action-002",
    "action_type": "run_analysis",
    "label": "Run Analysis",
    "status": "BLOCKED",
    "blocked_reason": {
      "code": "no_solver_results",
      "description": "Required solver results are not available."
    }
  }
]
```

### POST /snapshots/{snapshot_id}/actions/{action_id}/run

Executes action. UI shows result 1:1.

Success:
```json
{
  "action_id": "action-001",
  "status": "accepted",
  "new_snapshot_id": "xyz789"
}
```

Rejected:
```json
{
  "action_id": "action-001",
  "status": "rejected",
  "errors": [
    {
      "code": "network_incomplete",
      "message": "Network completeness flag is false.",
      "path": "network"
    }
  ]
}
```

## Error Handling

UI displays HTTP errors with:
- HTTP status code (404, 405, 500, etc.)
- `detail` from API response
- Endpoint that failed

**No error masking. No fallbacks. Show what API returns.**

## Rules

1. UI shows exactly what API returns (1:1 rendering)
2. UI never filters actions (all shown, including BLOCKED)
3. UI never suggests action order
4. UI never interprets blocked reasons
5. BLOCKED actions: visible, RUN disabled, show reason
6. ALLOWED actions: visible, RUN enabled
7. Actions visible ONLY when snapshot is active
8. After RUN success: refresh snapshot, refresh actions
9. API errors: display HTTP status and detail
