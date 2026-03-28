# CODEX CLEANUP — SINGLE PRODUCTION PATH

## Cel
Zmniejszenie równoległych ścieżek dla operacji domenowych i napraw readiness.

## Zrobione
- `OperationFormRouter`:
  - usunięto zależność od placeholder fallback dla `assign_catalog_to_element` i `update_element_parameters`.
  - dodano dedykowane formularze wykonywalne.
- `ReadinessBar`:
  - dodano deterministyczny fallback `code -> operation`, by FixAction nie kończył się martwą ścieżką.
- Testy:
  - dodano testy routera potwierdzające realne formularze zamiast placeholder.

## Co zostało do pełnego single path
- Konsolidacja `CatalogBrowser` (mock) z produkcyjnym pickerem API.
- Dalsze odchudzenie starych modal-only flow i pełne domknięcie „panel-first” dla wszystkich operacji domenowych SN.

## Kryterium gotowości po tym etapie
- Dla dwóch krytycznych operacji (`assign_catalog_to_element`, `update_element_parameters`) istnieje jedna aktywna ścieżka panelowa bez placeholderów.
