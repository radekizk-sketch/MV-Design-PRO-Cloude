# ADR-011: Deterministic SLD auto-layout baseline (PCC-anchored BFS levels)

## Status
Accepted

## Context
SLD diagrams require an initial deterministic layout so that repeated exports are
stable and reproducible. The layout must be independent of UI and always anchor on
PCC – punkt wspólnego przyłączenia.

## Decision
We implement a baseline auto-layout that runs a BFS starting from PCC to assign
levels. The x-position is derived from the BFS level and y-position is derived from
the index of nodes within the level, both ordered deterministically by UUID string.
Branch routing is emitted as a simple two-point polyline.

## Consequences
- Layout results are reproducible for the same topology and PCC.
- The backend provides a stable baseline without UI-specific dependencies.
- UI can later enhance routing without affecting core mapping or persistence.
