# Roadmap (Non-Architectural)

> **Canonical architecture is defined in** [`SYSTEM_SPEC.md`](../SYSTEM_SPEC.md).
> This roadmap lists prospective work items and must not be used as a source of architectural truth.

## 1. Short-Term (Operational)
- Expand operational checklists and runbooks.
- Improve solver test coverage and deterministic trace validation.
- Add reference cases for Power Flow and IEC 60909.

## 2. Medium-Term (Prospective)
- Build out analysis-run visibility (auditable run history, trace linking).
- Improve import/export tooling and data validation UX.

## 3. Long-Term (Prospective)
- **Protection analysis (NOT IMPLEMENTED)** — future interpretive layer consuming solver outputs.
- Advanced studies (e.g., asymmetrical networks, dynamic stability) as separate solver paths.

## 4. Risks / Dependencies
- **Power Flow location vs semantics:** implementation currently under `analysis/` while semantics define it as a solver (see SYSTEM_SPEC).
- **Frozen Result APIs:** any change requires a separate ExecPlan and explicit approval.
