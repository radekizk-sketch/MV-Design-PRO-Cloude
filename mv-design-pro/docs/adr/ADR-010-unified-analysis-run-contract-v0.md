# ADR-010: Unified Analysis Run Contract (v0)

## Status
Accepted

## Context / Problem
Analyses in MV-DESIGN-PRO currently emit run outputs in multiple, analysis-specific formats. This makes it harder to audit, compare, or build consistent evidence packages across IEC 60909, DesignSynth, and future studies (PF, protection). A unified “run envelope” is needed to standardize the metadata and references around analysis executions without changing solver outputs.

## Decision
Introduce `AnalysisRunEnvelope v0` as a minimal, stable contract that wraps analysis runs with consistent metadata, artifacts, and trace references.

## Non-goals
- Do **not** change solver result APIs or physics outputs.
- Do **not** refactor existing persistence models or storage.
- Do **not** change API routing or analysis execution flows.

## Contract (v0)
`AnalysisRunEnvelope` contains:
- `schema_version` ("v0")
- `run_id` (UUID as string)
- `analysis_type` (e.g., "design_synth.connection_study")
- `case_id` (optional)
- `inputs`:
  - `base_snapshot_id`
  - `spec_ref` (artifact reference to the analysis specification)
  - `inline` (optional input data for v0)
- `artifacts`: list of `ArtifactRef` (type/id/label)
- `trace`: optional `TraceRef` (type/id/inline)
- `created_at_utc` (ISO8601)
- `fingerprint` (SHA-256 of the canonical, stable envelope view)

BoundaryNode – węzeł przyłączenia is a required element of inputs for connection studies and must be present in the DesignSynth specification inputs referenced by `inputs.spec_ref`.

## Versioning
- `schema_version` is a required field.
- v0 changes must be backward-compatible within the same major version. Incompatible changes require a new major version (v1+).

## Mapping Strategy
Each analysis provides a dedicated adapter to map its native result container to the v0 envelope. DesignSynth is the first adapter and reuses the evidence UUID as the `run_id` for deterministic correlation.

## Determinism
- Envelope fingerprints are computed using canonical JSON.
- `created_at_utc` is excluded from the fingerprint stable view to avoid time variance.
- Timestamps are stored in UTC ISO8601.

## Consequences
- A unified envelope exists without disrupting existing analysis outputs.
- Future analyses can plug into the same run contract via adapters.
