# Designer UI

Thin client for Designer API. No interpretation. No wizards. No suggestions.

## Architecture

```
UI ─────────────────────────────────────────────────────────────────
  │
  ├── api.ts          → raw fetch calls
  ├── types.ts        → mirrors backend contract
  ├── ProjectStateView → renders GET /designer/state
  ├── ActionsList      → renders GET /designer/actions
  ├── ActionResult     → renders POST /run response
  └── DesignerPage     → composes views
```

## API Contract

### GET /api/designer/state

Returns project state. UI renders 1:1.

```json
{
  "available_results": ["run_short_circuit"],
  "last_run_timestamps": { "run_short_circuit": "2026-01-24T12:00:00Z" },
  "completeness_flags": { "network_complete": true }
}
```

### GET /api/designer/actions

Returns actions with status. UI renders ALL actions. Never hides BLOCKED.

```json
[
  {
    "action_type": "run_short_circuit",
    "label": "Run Short-Circuit",
    "status": "ALLOWED",
    "blocked_reason": null
  },
  {
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

### POST /api/designer/actions/{action_type}/run

Executes action. UI shows result 1:1.

Success:
```json
{
  "action_type": "run_short_circuit",
  "status": "REQUESTED",
  "message": "Action accepted; execution is delegated to the solver layer."
}
```

Rejected:
```json
{
  "action_type": "run_short_circuit",
  "status": "REJECTED",
  "reason": {
    "code": "network_incomplete",
    "description": "Network completeness flag is false."
  }
}
```

## Rules

1. UI shows exactly what API returns
2. UI never filters actions
3. UI never suggests order
4. UI never interprets blocked reasons
5. RUN button only if status === 'ALLOWED'
6. All blocked reasons visible
