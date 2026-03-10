# SLD Reset Canonical Status

## Inwentaryzacja pipeline (stan aktywny)

### Do usunięcia
- `useDemo=true` w `App.tsx` dla widoku edycji SLD (zastąpione przez realny pipeline danych).

### Do wygaszenia
- Mockowane E2E krytycznej ścieżki (`page.route(...)`) — wygaszone przez real-backend browser E2E.

### Do zastąpienia
- Browser test krytyczny oparty o atrapowane API frontendu został zastąpiony specem działającym na realnym backendzie.

### Do zachowania
- Deterministyczny kontrakt overlay wyników bez mutacji geometrii bazowej.
- Kanoniczna bramka `useCanCalculate` oparta o `snapshotStore.readiness`.

## Kanoniczny pipeline SLD (V1)
1. Operacje domenowe ENM (`/api/cases/{case_id}/enm/domain-ops`).
2. Snapshot ENM jako jedyne źródło prawdy dla geometrii bazowej.
3. Render SLD w trybie `MODEL_EDIT` i `RESULT_VIEW` bez przełączania na dane demo.
4. Overlay wyników jako warstwa prezentacyjna, bez zmiany hash snapshotu.

## Kryteria przemysłowe utrzymane w kodzie
- GPZ i trunk/branch/station budowane przez realne operacje domenowe.
- Readiness backendowa blokuje uruchomienie analizy do czasu usunięcia blockerów katalogowych.
- Run i wyniki pochodzą z realnego Execution API.
- Snapshot hash nie zmienia się po przejściu do wyników (brak mutacji geometrii bazowej).
