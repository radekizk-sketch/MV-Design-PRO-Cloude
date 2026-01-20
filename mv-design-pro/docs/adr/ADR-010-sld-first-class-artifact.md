# ADR-010: SLD as a first-class persisted artifact (mapping-only, no electrical params)

## Status
Accepted

## Context
PR4 introduces SLD management in the backend. The SLD must be a persisted artifact
linked to a project, but it cannot carry electrical parameters because those remain
owned by the network model and solver inputs. UI should only render geometry/mapping.

## Decision
We persist SLD diagrams and symbols in dedicated tables (`sld_diagrams`,
`sld_node_symbols`, `sld_branch_symbols`, `sld_annotations`). The SLD domain models
contain only geometry, styling metadata, and mapping (`network_node_id` /
`network_branch_id`) to the network. Electrical parameters stay in the network model
and analysis results.

## Consequences
- SLD can be independently versioned and exported/imported without affecting solver
  physics or network data.
- UI receives mapping-only JSON and uses it for rendering.
- Backend remains the source of truth for network data and analysis inputs.
