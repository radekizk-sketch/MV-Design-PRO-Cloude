# ADR-012: Results overlay pipeline (Result -> Overlay -> UI)

## Status
Accepted

## Context
Power Flow and Short Circuit solvers must keep their APIs stable and free of UI
concerns. The frontend needs UI-ready overlays keyed by network IDs for SLD
visualization, but the backend must not persist overlays in the SLD database.

## Decision
We add an internal `ResultSldOverlayBuilder` that accepts canonical result payloads
(via `to_dict()`), maps them to `node_id` / `branch_id`, and emits overlay dictionaries
for UI consumption. Overlays are generated on demand and are not stored in the SLD
tables.

## Consequences
- Solver result contracts stay intact and free of UI logic.
- UI receives a stable mapping layer with simple status flags.
- Overlay data can evolve without database migrations.
