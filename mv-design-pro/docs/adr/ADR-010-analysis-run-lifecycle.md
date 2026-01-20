# ADR-010: AnalysisRun lifecycle as auditable execution unit

## Status
Accepted

## Context
Power Flow (PF) i Short Circuit (SC) są uruchamiane przez istniejące solvery.
Brakowało jednak audytowalnej, deterministycznej warstwy uruchomień z metadanymi,
która zapewniałaby spójny lifecycle, identyfikowalność wejść (input_hash) oraz
lekki zapis wyników bez ingerencji w fizykę solverów.

## Decision
Wprowadzamy encję `AnalysisRun` jako niezależny, deterministyczny lifecycle uruchomienia:

- Statusy: `REQUESTED` → `VALIDATED` → `RUNNING` → `FINISHED` / `FAILED`.
- Każdy run zapisuje:
  - `input_snapshot_json` (kanoniczny, deterministyczny snapshot wejść),
  - `input_hash` (SHA256 z canonical JSON),
  - `result_summary_json` (lekki podzbiór wyników),
  - metadane czasu (UTC, tz-aware) i błędy.

Warstwa aplikacyjna (NetworkWizardService) odpowiada za budowę snapshotu, hash,
uruchomienie solverów PF/SC oraz zapis summary. Solvery nie znają DB/UI.

## Consequences
- Każde uruchomienie jest audytowalne i powtarzalne (deterministyczny input_hash).
- Nie zapisujemy pełnych wyników do SLD ani do tabel wynikowych; tylko summary.
- PCC – punkt wspólnego przyłączenia pozostaje krytycznym elementem walidacji wejść
  dla PF/SC.
- Overlay SLD może być generowany opcjonalnie na żądanie, bez modyfikacji core SLD.
