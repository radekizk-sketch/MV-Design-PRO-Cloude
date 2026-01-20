# Analysis Runs Spec (PR5)

## Lifecycle
Statusy uruchomienia:
- REQUESTED → VALIDATED → RUNNING → FINISHED / FAILED

Każdy run zapisuje canonical `input_snapshot_json` i lekki `result_summary_json`.

## Model domenowy
`AnalysisRun(id, project_id, case_id, analysis_type, status, input_snapshot_json, result_summary_json, error_message, created_at, updated_at)`

## Tabela DB
`analysis_runs`:
- `input_snapshot_jsonb` – canonical input dla PF/SC
- `result_summary_jsonb` – minimalny podzbiór wyników (bez surowych trace)

Indeksy:
- `(project_id)`
- `(analysis_type, status)`
- `(created_at)`

## Relacje
OperatingCase → AnalysisRun → Result summary → SLD Overlay

## Integracja z SLD
Overlay generowany na żądanie na podstawie `AnalysisRun.result_summary_json` i mapowania
SLD. UI renderuje wyłącznie dane dostarczone przez backend.
