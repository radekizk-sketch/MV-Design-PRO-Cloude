# UI V3 — PLAN WDROŻENIOWY PR (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: 8 PR w kolejności wdrożeniowej z DoD, testami i zakazami

---

## KOLEJNOŚĆ PR

```
PR-UIV3-00 → PR-UIV3-01 → PR-UIV3-02 → PR-UIV3-03
                                            │
                                            ▼
                              PR-UIV3-04 → PR-UIV3-05 → PR-UIV3-06 → PR-UIV3-07
```

---

## PR-UIV3-00: Recon + dokumenty BINDING + strażnicy grep-zero

### Zakres
Dokumenty architektoniczne UI V3, mapa repozytorium, nowe strażnicy CI.

### Pliki dodawane
```
mv-design-pro/docs/ui/UI_V3_RECON_REPO_MAP.md
mv-design-pro/docs/ui/UI_V3_SYSTEM_SPEC_CANONICAL.md
mv-design-pro/docs/ui/UI_V3_WORKFLOWS_SN_GPZ_CANONICAL.md
mv-design-pro/docs/ui/UI_V3_STATE_MODEL_CANONICAL.md
mv-design-pro/docs/ui/UI_V3_SLD_ARCH_CANONICAL.md
mv-design-pro/docs/ui/UI_V3_REPO_HYGIENE_RULES.md
mv-design-pro/docs/ui/UI_V3_TEST_MATRIX_CANONICAL.md
mv-design-pro/docs/ui/UI_V3_INVARIANTS_OSD_30_PLUS.md
mv-design-pro/docs/ui/UI_V3_PR_ROADMAP.md
mv-design-pro/scripts/no_draft_graph_guard.py
mv-design-pro/scripts/no_feature_flag_critical_guard.py
```

### DoD (Definition of Done)
- [ ] 9 dokumentów BINDING utworzonych i spójnych wewnętrznie
- [ ] `no_draft_graph_guard.py` — działa, exit 0 na bieżącym repo
- [ ] `no_feature_flag_critical_guard.py` — działa, exit 0 na bieżącym repo
- [ ] Istniejące strażnicy nadal przechodzą (brak regresji)
- [ ] `docs_guard.py` PASS (brak martwych linków w nowych dokumentach)

### Testy obowiązkowe
```bash
python scripts/no_draft_graph_guard.py        # EXIT 0
python scripts/no_feature_flag_critical_guard.py  # EXIT 0
python scripts/docs_guard.py                  # EXIT 0
python scripts/pcc_zero_guard.py              # EXIT 0
python scripts/no_codenames_guard.py          # EXIT 0
```

### Zakazy
- NIE modyfikować istniejących dokumentów (oprócz INDEX.md jeśli konieczne)
- NIE modyfikować kodu źródłowego
- NIE modyfikować istniejących strażników
- NIE modyfikować przepływów CI (strażnicy dodani w późniejszym PR)

---

## PR-UIV3-01: Klient operacji domenowych

### Zakres
Moduł klienta operacji z idempotentności, retry, deterministycznym logiem.

### Pliki modyfikowane/dodawane
```
frontend/src/ui/sld/domainOpsClient.ts           — rozszerzenie o idempotency_key, retry
frontend/src/ui/topology/domainApi.ts             — ujednolicenie z domainOpsClient
frontend/src/modules/sld/cdse/operationExecutor.ts — integracja z nowym klientem
frontend/src/ui/sld/domainOpsClient.test.ts       — NOWY test idempotentności
frontend/src/ui/sld/domainOpsRetry.test.ts        — NOWY test retry
backend/tests/application/test_domain_ops_idempotency.py  — NOWY test BE
backend/tests/application/test_readiness_after_ops.py     — NOWY test BE
backend/tests/application/test_fix_action_completeness.py — NOWY test BE
```

### DoD
- [ ] Klient wysyła `DomainOpEnvelope` z `idempotency_key` (UUID)
- [ ] Retry z exponential backoff (max 3 próby) przy błędach sieciowych
- [ ] Odpowiedź `DomainOpResponse` zawsze parsowana na: snapshot + readiness + fixActions + delta
- [ ] Deterministyczny log operacji (konsola + opcjonalnie DevTools)
- [ ] Testy idempotentności: ta sama operacja z tym samym kluczem → ten sam wynik
- [ ] Testy retry: symulacja błędu sieciowego → retry → sukces
- [ ] Testy BE: readiness obliczany po każdej operacji
- [ ] Testy BE: FixAction kompletne dla każdego blokera

### Testy obowiązkowe
```bash
# Frontend
npx vitest run --no-file-parallelism src/ui/sld/domainOpsClient.test.ts
npx vitest run --no-file-parallelism src/ui/sld/domainOpsRetry.test.ts

# Backend
poetry run pytest tests/application/test_domain_ops_idempotency.py -v
poetry run pytest tests/application/test_readiness_after_ops.py -v
poetry run pytest tests/application/test_fix_action_completeness.py -v
```

### Zakazy
- NIE modyfikować solverów (`network_model/solvers/`)
- NIE modyfikować Result API (`domain/result_contract_v1.py`)
- NIE modyfikować istniejących testów kontraktowych SLD

---

## PR-UIV3-02: Magazyn stanu UI V3

### Zakres
Konsolidacja magazynów stanu, synchronizacja URL, niezmienniki stanu.

### Pliki modyfikowane/dodawane
```
frontend/src/ui/app-state/store.ts               — rozszerzenie o activeSnapshotId, synchronizację
frontend/src/ui/topology/snapshotStore.ts         — formalizacja kontraktu Snapshot
frontend/src/ui/engineering-readiness/store.ts    — integracja z DomainOpResponse
frontend/src/ui/selection/store.ts                — wymuszenie deterministycznego sortowania
frontend/src/ui/navigation/useUrlSelectionSync.ts — rozszerzenie parametrów URL
frontend/src/ui/navigation/urlState.ts            — nowe parametry (?case, ?run, ?overlay)
frontend/src/ui/__tests__/snapshotStore.test.ts   — NOWY test niezmienności
frontend/src/ui/__tests__/readinessStore.test.ts  — NOWY test aktualizacji
frontend/src/ui/__tests__/urlStateSync.test.ts    — NOWY test synchronizacji
backend/tests/test_snapshot_fingerprint_stability.py — NOWY test
```

### DoD
- [ ] `snapshotStore` przechowuje snapshot i hash — aktualizacja wyłącznie z DomainOpResponse
- [ ] `readinessStore` aktualizowany automatycznie po każdej operacji
- [ ] `selectedIds` zawsze posortowane deterministycznie
- [ ] URL synchronizacja: `?selected=`, `?case=`, `?run=`, `?overlay=`
- [ ] Test niezmienności: snapshot nie modyfikowany przez UI
- [ ] Test synchronizacji: zmiana URL → zmiana stanu i odwrotnie
- [ ] Test fingerprint BE: stabilność SHA-256

### Testy obowiązkowe
```bash
# Frontend
npx vitest run --no-file-parallelism src/ui/__tests__/snapshotStore.test.ts
npx vitest run --no-file-parallelism src/ui/__tests__/readinessStore.test.ts
npx vitest run --no-file-parallelism src/ui/__tests__/urlStateSync.test.ts
npx vitest run --no-file-parallelism src/ui/__tests__/selection-store.test.ts
npx vitest run --no-file-parallelism src/ui/__tests__/app-state-store.test.ts

# Backend
poetry run pytest tests/test_snapshot_fingerprint_stability.py -v
```

### Zakazy
- NIE usuwać istniejących magazynów (konsolidacja = dodanie fasady, nie kasowanie)
- NIE modyfikować logiki SLD core
- NIE modyfikować komponentów React (tylko hooki i magazyny)

---

## PR-UIV3-03: SLD pipeline V3

### Zakres
Formalizacja pipeline SLD z golden render artefacts i testami deterministyczności.

### Pliki modyfikowane/dodawane
```
frontend/src/ui/sld/core/topologyAdapterV2.ts     — upewnienie determinizmu (sortowanie)
frontend/src/engine/sld-layout/pipeline.ts         — dodanie hashowania wyniku
frontend/src/ui/sld/core/layoutResult.ts           — dodanie layoutHash do kontraktu
frontend/src/ui/sld/core/__tests__/goldenNetworkE2E.test.ts — rozszerzenie o 5 sieci
frontend/src/engine/sld-layout/__tests__/determinism.test.ts — rozszerzenie 100×
frontend/src/ui/sld/core/__tests__/permutation.test.ts — NOWY test permutacyjny 50×
scripts/sld_render_artifacts.ts                    — rozszerzenie o nowe golden
```

### DoD
- [ ] Pipeline produkuje `layoutHash` (SHA-256) w `LayoutResultV1`
- [ ] Test deterministyczności 100× PASS dla 5 golden networks
- [ ] Test permutacyjny 50× PASS
- [ ] Golden render artefacts wygenerowane i zamrożone
- [ ] Budżety wydajności: pipeline ≤ 50ms dla 200 elementów
- [ ] Istniejące 24 testy kontraktowe SLD nadal PASS

### Testy obowiązkowe
```bash
# Frontend
npx vitest run --no-file-parallelism src/ui/sld/core/__tests__/
npx vitest run --no-file-parallelism src/engine/sld-layout/__tests__/

# Strażnicy
python scripts/sld_determinism_guards.py
```

### Zakazy
- NIE zmieniać semantyki VisualGraphV1 (kontrakt zamrożony)
- NIE dodawać losowości (Math.random, Date.now) do pipeline
- NIE modyfikować faz 1-5 bez testu deterministyczności

---

## PR-UIV3-04: Kreator jako emiter operacji

### Zakres
Kreator sieci (wizard) emituje operacje domenowe przez klienta z PR-UIV3-01.

### Pliki modyfikowane/dodawane
```
frontend/src/ui/wizard/useWizardStore.ts           — odczyt ze Snapshot (nie lokalna prawda)
frontend/src/ui/wizard/switchgear/useSwitchgearOps.ts — emisja operacji domenowych
frontend/src/ui/topology/domainApi.ts              — integracja z klientem V3
frontend/src/ui/topology/modals/                   — modele emitujące operacje
frontend/src/ui/context-menu/actionMenuBuilders.ts — menu: GPZ, magistrala, stacja, odgałęzienie, ring, NOP
frontend/src/ui/wizard/__tests__/wizard-domain-ops.test.ts — NOWY test emisji
frontend/src/ui/wizard/__tests__/wizard-no-local-truth.test.ts — NOWY test
```

### DoD
- [ ] Kreator NIE przechowuje „lokalnej prawdy" — odczytuje ze Snapshot
- [ ] Każda akcja kreatora emituje operację domenową przez klienta V3
- [ ] Menu kontekstowe: GPZ, kontynuuj magistralę, wstaw stację, odgałęzienie, ring, NOP
- [ ] Podgląd SLD w kreatorze odzwierciedla bieżącą migawkę (nie draft)
- [ ] Test: brak lokalnej prawdy w wizard store
- [ ] Test: emisja operacji z poprawnymi payloadami

### Testy obowiązkowe
```bash
# Frontend
npx vitest run --no-file-parallelism src/ui/wizard/__tests__/
npx vitest run --no-file-parallelism src/ui/context-menu/__tests__/

# Strażnicy
python scripts/local_truth_guard.py
python scripts/canonical_ops_guard.py
```

### Zakazy
- NIE dodawać fizyki do kreatora
- NIE tworzyć lokalnego modelu sieci w kreatorze
- NIE modyfikować SLD pipeline (pipeline jest z PR-UIV3-03)

---

## PR-UIV3-05: Inspektor V3 + nawigacja FixAction

### Zakres
Inspektor elementu z 4 sekcjami + nawigacja FixAction → dialog/element.

### Pliki modyfikowane/dodawane
```
frontend/src/ui/property-grid/PropertyGrid.tsx          — 4 sekcje: katalog, dane, wyniki, gotowość
frontend/src/ui/property-grid/PropertyGridContainer.tsx  — integracja z readiness
frontend/src/ui/sld/SldFixActionsPanel.tsx               — panel FixAction
frontend/src/ui/engineering-readiness/EngineeringReadinessPanel.tsx — panel gotowości
frontend/src/ui/property-grid/__tests__/fixActionNavigation.test.ts — NOWY test
frontend/src/ui/engineering-readiness/__tests__/fixActionE2E.test.ts — NOWY test
```

### DoD
- [ ] Inspektor elementu wyświetla 4 sekcje: Dane katalogowe, Dane jawne, Wyniki, Gotowość
- [ ] FixAction OPEN_MODAL → otwiera konkretny dialog edycji
- [ ] FixAction NAVIGATE_TO_ELEMENT → zaznacza element na SLD + centruje kamerę
- [ ] FixAction SELECT_CATALOG → otwiera przeglądarkę katalogu z filtrem
- [ ] Panel gotowości grupuje braki wg obszarów (CATALOGS, TOPOLOGY, SOURCES, STATIONS)
- [ ] Test: nawigacja FixAction prowadzi do celu

### Testy obowiązkowe
```bash
# Frontend
npx vitest run --no-file-parallelism src/ui/property-grid/__tests__/
npx vitest run --no-file-parallelism src/ui/engineering-readiness/__tests__/
npx vitest run --no-file-parallelism src/ui/sld/core/__tests__/readinessGates.test.ts

# Strażnicy
python scripts/fix_action_completeness_guard.py
python scripts/dead_click_guard.py
```

### Zakazy
- NIE dodawać fizyki do inspektora
- NIE modyfikować Result API
- NIE modyfikować pipeline SLD

---

## PR-UIV3-06: Bramka gotowości analiz + overlay wyników

### Zakres
Bramka kwalifikacji analiz, integracja overlay wyników na SLD.

### Pliki modyfikowane/dodawane
```
frontend/src/ui/analysis-eligibility/AnalysisEligibilityPanel.tsx — rozszerzenie
frontend/src/ui/sld-overlay/OverlayEngine.ts          — integracja z ResultJoin
frontend/src/ui/sld-overlay/overlayStore.ts            — rozszerzenie o delta mode
frontend/src/ui/sld/core/resultJoin.ts                 — formalizacja kontraktu
frontend/src/ui/sld-overlay/__tests__/overlayDeterminism.test.ts — NOWY test
frontend/src/ui/analysis-eligibility/__tests__/eligibilityGate.test.ts — NOWY test
```

### DoD
- [ ] Bramka gotowości: przycisk „Oblicz" aktywny WYŁĄCZNIE gdy `blockerCount === 0`
- [ ] ResultJoin łączy LayoutResult + ResultSet → OverlayTokens deterministycznie
- [ ] Overlay delta: porównanie 2 przebiegów z kolorami zmiany
- [ ] Test: overlay deterministyczny (te same dane → ten sam wynik)
- [ ] Test: bramka blokuje obliczenia przy blokerach

### Testy obowiązkowe
```bash
# Frontend
npx vitest run --no-file-parallelism src/ui/sld-overlay/__tests__/
npx vitest run --no-file-parallelism src/ui/analysis-eligibility/__tests__/

# Strażnicy
python scripts/overlay_no_physics_guard.py
```

### Zakazy
- NIE dodawać fizyki do overlay
- NIE modyfikować solverów
- NIE modyfikować Result API

---

## PR-UIV3-07: E2E pełny scenariusz + determinism suite

### Zakres
Playwright E2E: pełny przepływ GPZ→ring→analiza→raport. Suita deterministyczna.

### Pliki modyfikowane/dodawane
```
frontend/e2e/ui-v3-full-flow.spec.ts                — NOWY test E2E
frontend/e2e/ui-v3-fix-actions.spec.ts              — NOWY test E2E FixAction
frontend/e2e/ui-v3-comparison.spec.ts               — NOWY test E2E porównania
frontend/src/ui/__tests__/ux-golden-scenario.test.ts — rozszerzenie golden scenariusza
frontend/src/ui/__tests__/ux-performance-budget.test.ts — rozszerzenie budżetów
```

### DoD
- [ ] E2E: GPZ → 3 odcinki → stacja B → odgałęzienie → stacja C → ring → NOP → katalogi → analiza → overlay → raport
- [ ] E2E: FixAction nawigacja (OPEN_MODAL, NAVIGATE_TO_ELEMENT, SELECT_CATALOG)
- [ ] E2E: Porównanie 2 przebiegów z overlay delta
- [ ] Budżety wydajności spełnione (tabela z UI_V3_TEST_MATRIX)
- [ ] Wszystkie 45 niezmienników OSD zweryfikowane
- [ ] Wszystkie strażnicy CI PASS

### Testy obowiązkowe
```bash
# E2E
npm run test:e2e

# Pełna suita frontend
npm test

# Pełna suita backend
cd ../backend && poetry run pytest -q

# Strażnicy
python scripts/pcc_zero_guard.py
python scripts/no_codenames_guard.py
python scripts/sld_determinism_guards.py
python scripts/arch_guard.py
python scripts/docs_guard.py
python scripts/overlay_no_physics_guard.py
```

### Zakazy
- NIE modyfikować żadnego kodu produkcyjnego w tym PR (tylko testy)
- NIE modyfikować strażników (mogą być dodane do CI)
- NIE pomijać żadnego kroku E2E

---

## PODSUMOWANIE KOLEJNOŚCI

| PR | Nazwa | Zależności | Główne pliki |
|----|-------|-----------|-------------|
| PR-UIV3-00 | Recon + dokumenty + strażnicy | Brak | `docs/ui/UI_V3_*.md`, `scripts/` |
| PR-UIV3-01 | Klient operacji | PR-00 | `domainOpsClient.ts`, `domainApi.ts` |
| PR-UIV3-02 | Magazyn stanu V3 | PR-01 | `store.ts`, `snapshotStore.ts`, `urlState.ts` |
| PR-UIV3-03 | SLD pipeline V3 | PR-02 | `pipeline.ts`, `layoutResult.ts`, golden tests |
| PR-UIV3-04 | Kreator jako emiter | PR-01, PR-03 | `wizard/`, `topology/modals/`, `context-menu/` |
| PR-UIV3-05 | Inspektor V3 + FixAction | PR-02 | `property-grid/`, `engineering-readiness/` |
| PR-UIV3-06 | Bramka + overlay | PR-03, PR-05 | `sld-overlay/`, `analysis-eligibility/` |
| PR-UIV3-07 | E2E + determinism | PR-04, PR-05, PR-06 | `e2e/`, `__tests__/` |

---

## KOMENDY TESTÓW PO KAŻDYM PR

```bash
# Frontend (wymagane po każdym PR z kodem FE)
cd mv-design-pro/frontend
npm test                          # vitest --no-file-parallelism
npm run type-check                # tsc --noEmit
npm run lint                      # eslint

# Backend (wymagane po każdym PR z kodem BE)
cd mv-design-pro/backend
poetry run pytest -q
poetry run black src tests --check
poetry run ruff check src tests
poetry run mypy src

# Strażnicy (wymagane po KAŻDYM PR)
cd mv-design-pro
python scripts/pcc_zero_guard.py
python scripts/no_codenames_guard.py
python scripts/sld_determinism_guards.py
python scripts/docs_guard.py
```

---

## NOWE STRAŻNICY CI DO DODANIA

| Strażnik | Dodawany w PR | Dołączony do workflow |
|----------|--------------|----------------------|
| `no_draft_graph_guard.py` | PR-UIV3-00 | frontend-checks.yml (w PR-UIV3-02) |
| `no_feature_flag_critical_guard.py` | PR-UIV3-00 | frontend-checks.yml (w PR-UIV3-02) |
| `ui_v3_state_invariants_guard.py` | PR-UIV3-02 | frontend-checks.yml |
| `ui_v3_polish_labels_guard.py` | PR-UIV3-04 | frontend-checks.yml |

---

*Dokument wiążący. Kolejność PR jest obligatoryjna — nie pomijać kroków.*
