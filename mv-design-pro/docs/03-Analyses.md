# Analyses — Notes (Operational)

> **Canonical definitions live in** [`SYSTEM_SPEC.md`](../SYSTEM_SPEC.md).
> This document is operational and does not define architecture.

## 1. Analysis runs (operational)
- Analyses are executed through application services that orchestrate solver runs and store run metadata.
- API endpoints for analysis runs are exposed by the backend (see `backend/src/api/`).

## 2. Protection status
- **Protection is NOT IMPLEMENTED.**
- Any references to protection in other documentation should be treated as prospective or roadmap items.

## 3. Operational guidance
- Keep analysis-run orchestration deterministic and auditable.
- Use solver outputs verbatim and reference white-box traces where available.
