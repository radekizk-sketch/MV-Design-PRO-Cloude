# CODEX UI/UX GAP FIXES — REALNA SIEĆ SN

## Naprawy wdrożone

### 1) Usunięcie placeholder path z OperationFormRouter
- Dodano realne formularze inline:
  - `AssignCatalogForm` — wykonuje `assign_catalog_to_element`.
  - `UpdateElementParametersForm` — wykonuje `update_element_parameters`.
- Router kieruje teraz jawnie do tych formularzy (brak fallback placeholder dla tych 2 operacji).

### 2) Wzmocnienie Readiness/FixAction fallback
- Dodano mapowanie `blocker code -> operation`.
- Gdy brak mapowania do modalu, FixAction prowadzi do operacji domenowej (`assign_catalog_to_element`, `update_element_parameters`, `add_transformer_sn_nn`, `set_normal_open_point`) zamiast martwej ścieżki.

### 3) Testy regresji
- Dodano test `operationFormRouter.test.tsx` potwierdzający brak fallback placeholder dla dwóch krytycznych operacji.

## Efekt UX dla inżyniera SN
- Klik „Napraw” częściej prowadzi do konkretnej operacji domenowej zamiast generycznego okna.
- Akcje „przypisz katalog” / „edytuj parametry” działają w panelu operacji end-to-end.

## Ograniczenia (otwarte)
- `CatalogBrowser` ma produkcyjne pobieranie dla części namespace (`LINE/CABLE/TRANSFORMER/SWITCH_EQUIPMENT`); pozostałe namespace wymagają rozszerzenia backendowego API i mapowania.
- Część formularzy domenowych nadal reużywa modal-core z topology i wymaga dalszego pogłębienia ergonomii specyficznej dla pracy SN.
