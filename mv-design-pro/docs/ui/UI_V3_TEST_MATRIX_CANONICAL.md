# UI V3 — MATRYCA TESTÓW (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: Kanoniczne wymagania testowe dla UI V3

---

## 1. TESTY DETERMINISTYCZNOŚCI UKŁADU SLD

### 1.1 Test powtórzalności 100×
| ID | Opis | Powtórzenia | Kryterium PASS |
|----|------|-------------|----------------|
| DET-001 | Ten sam Snapshot → identyczny VisualGraphV1 hash | 100 | hash(i) = hash(j) ∀ i,j |
| DET-002 | Ten sam Snapshot → identyczny LayoutResultV1 hash | 100 | hash(i) = hash(j) ∀ i,j |
| DET-003 | Ten sam Snapshot → identyczna kolejność węzłów | 100 | order(i) = order(j) ∀ i,j |
| DET-004 | Ten sam Snapshot → identyczne współrzędne (x,y) | 100 | pos(i) = pos(j) ∀ i,j, ε=0 |
| DET-005 | Ten sam Snapshot → identyczne trasy krawędzi | 100 | routes(i) = routes(j) ∀ i,j |

**Pliki testów**:
- `frontend/src/ui/sld/core/__tests__/determinism.test.ts`
- `frontend/src/engine/sld-layout/__tests__/determinism.test.ts`

**Sieci referencyjne**:
- Sieć promieniowa 3-odcinkowa (10 elementów)
- Sieć z pierścieniem i NOP (25 elementów)
- Sieć z odgałęzieniami i stacjami B/C (50 elementów)
- Sieć z OZE (PV + BESS) i transformatorami (40 elementów)
- Sieć wieloodejściowa z 3 odejściami (80 elementów)

### 1.2 Test niezmienniczości permutacyjnej 50×
| ID | Opis | Powtórzenia | Kryterium PASS |
|----|------|-------------|----------------|
| PERM-001 | Permutacja kolejności elementów w Snapshot → ten sam układ | 50 | hash(perm(S)) = hash(S) ∀ perm |
| PERM-002 | Permutacja kolejności pól w stacji → ten sam blok stacji | 50 | block(perm(fields)) = block(fields) |
| PERM-003 | Permutacja kolejności krawędzi → te same trasy | 50 | routes(perm(edges)) = routes(edges) |
| PERM-004 | Permutacja kolejności stacji → ten sam układ globalny | 50 | layout(perm(stations)) = layout(stations) |
| PERM-005 | Permutacja overlay elements → ten sam render | 50 | overlay(perm(elems)) = overlay(elems) |

**Implementacja**: Losowe permutacje z ustalonego seeda (np. seed=42 dla pierwszej, seed=42+i dla i-tej).

---

## 2. GOLDEN NETWORKS

### 2.1 Wymagane sieci referencyjne (minimum 5)
| ID | Nazwa | Topologia | Elementy | Cel testu |
|----|-------|-----------|----------|-----------|
| GN-001 | Sieć promieniowa SN | GPZ → 5 odcinków magistrali → 2 stacje | 20 | Pipeline bazowy |
| GN-002 | Sieć pierścieniowa SN | GPZ → magistrala → ring + NOP | 30 | Pierścień i NOP |
| GN-003 | Sieć z odgałęzieniami | GPZ → magistrala → 3 odgałęzienia → stacje C | 50 | Odgałęzienia |
| GN-004 | Sieć z OZE | Jak GN-003 + PV + BESS przez transformatory nN | 60 | Źródła OZE |
| GN-005 | Sieć wieloodejściowa | GPZ z 3 odejściami → stacje → ring | 100 | Wydajność i złożoność |

### 2.2 Golden render artefacts
Dla każdej golden network zamrożone:
- `golden/<id>/snapshot.json` — Migawka (hash)
- `golden/<id>/visual_graph.json` — VisualGraphV1 (hash)
- `golden/<id>/layout_result.json` — LayoutResultV1 (hash)
- `golden/<id>/render.svg` — Wyrenderowany SLD (hash)
- `golden/<id>/hashes.json` — Wszystkie hashe do weryfikacji

### 2.3 Testy golden
| ID | Opis | Kryterium PASS |
|----|------|----------------|
| GOLD-001 | Snapshot hash stabilny | hash(snapshot) = golden_hash |
| GOLD-002 | VisualGraph hash stabilny | hash(vg) = golden_hash |
| GOLD-003 | LayoutResult hash stabilny | hash(lr) = golden_hash |
| GOLD-004 | Render SVG hash stabilny | hash(svg) = golden_hash |
| GOLD-005 | Pipeline end-to-end stabilny | Wszystkie hashe zgodne |

**Pliki testów**:
- `frontend/src/ui/sld/core/__tests__/goldenNetworkE2E.test.ts`
- `backend/tests/golden/test_golden_network_sn.py`

---

## 3. GREP-ZERO

### 3.1 Reguły grep-zero
| ID | Termin | Zakres | Strażnik |
|----|--------|--------|----------|
| GZ-001 | `PCC` | `frontend/src/`, `backend/src/network_model/` | `pcc_zero_guard.py` |
| GZ-002 | `BoundaryNode` | `frontend/src/`, `backend/src/network_model/` | `pcc_zero_guard.py` |
| GZ-003 | `P7\|P11\|P14\|P17\|P20` (ciągi UI) | `frontend/src/` | `no_codenames_guard.py` |
| GZ-004 | `draft_graph\|draftGraph` | `frontend/src/` | `no_draft_graph_guard.py` (NOWY) |
| GZ-005 | `featureFlag` (ścieżka krytyczna) | `frontend/src/ui/sld/core/`, `frontend/src/engine/` | `no_feature_flag_critical_guard.py` (NOWY) |
| GZ-006 | Fizyka w overlay | `frontend/src/ui/sld-overlay/` | `overlay_no_physics_guard.py` |
| GZ-007 | Fizyka w UI | `frontend/src/ui/` (bez `sld-overlay/`) | `arch_guard.py` |

### 3.2 Test grep-zero
```bash
# Uruchomienie lokalne
cd mv-design-pro
python scripts/pcc_zero_guard.py
python scripts/no_codenames_guard.py
python scripts/overlay_no_physics_guard.py
python scripts/arch_guard.py
```

---

## 4. TESTY E2E (PLAYWRIGHT)

### 4.1 Pełny przepływ GPZ → ring → analiza → raport
| ID | Krok | Weryfikacja |
|----|------|-------------|
| E2E-001 | Utwórz projekt | Strona projektu widoczna |
| E2E-002 | Dodaj GPZ | Symbol GPZ na SLD |
| E2E-003 | Dodaj 3 odcinki magistrali | 3 odcinki widoczne na SLD |
| E2E-004 | Wstaw stację B w odcinek | Blok stacji widoczny |
| E2E-005 | Dodaj odgałęzienie + stacja C | Odgałęzienie i stacja widoczne |
| E2E-006 | Zamknij ring | Odcinek pierścienia widoczny |
| E2E-007 | Ustaw NOP | Łącznik NOP widoczny |
| E2E-008 | Przypisz katalogi | Blokery gotowości usunięte |
| E2E-009 | Utwórz przypadek zwarciowy | Przypadek aktywny |
| E2E-010 | Uruchom analizę | Status wyników: FRESH |
| E2E-011 | Pokaż overlay | Overlay widoczny na SLD |
| E2E-012 | Eksportuj raport PDF | Plik PDF pobrany |

**Plik testu**: `frontend/e2e/happy-path.spec.ts` (rozszerzenie)

### 4.2 Przepływ gotowości i FixAction
| ID | Krok | Weryfikacja |
|----|------|-------------|
| E2E-FA-001 | Otwórz panel gotowości | Lista braków widoczna |
| E2E-FA-002 | Klik na FixAction (SELECT_CATALOG) | Przeglądarka katalogu otwarta |
| E2E-FA-003 | Wybierz typ i zastosuj | Bloker usunięty z listy |
| E2E-FA-004 | Klik na FixAction (OPEN_MODAL) | Dialog edycji otwarty |
| E2E-FA-005 | Klik na FixAction (NAVIGATE_TO_ELEMENT) | Element zaznaczony na SLD |

### 4.3 Przepływ porównania wyników
| ID | Krok | Weryfikacja |
|----|------|-------------|
| E2E-CMP-001 | Uruchom 2 przypadki obliczeniowe | 2 przebiegi w historii |
| E2E-CMP-002 | Otwórz porównanie | Tabela różnic widoczna |
| E2E-CMP-003 | Włącz overlay delta | Kolory delta na SLD |

---

## 5. TESTY WYDAJNOŚCI

### 5.1 Budżety wydajności
| ID | Operacja | Budżet (ms) | Sieć | Narzędzie |
|----|----------|-------------|------|-----------|
| PERF-001 | TopologyAdapterV2 | ≤ 10 | 200 elementów | Vitest + performance.now() |
| PERF-002 | LayoutPipeline (5 faz) | ≤ 50 | 200 elementów | Vitest + performance.now() |
| PERF-003 | StationBlockBuilder | ≤ 10 | 20 stacji | Vitest + performance.now() |
| PERF-004 | Renderer (pełny) | ≤ 100 | 200 elementów | Vitest + performance.now() |
| PERF-005 | ResultJoin (overlay) | ≤ 30 | 200 elementów | Vitest + performance.now() |
| PERF-006 | Eksport PNG | ≤ 500 | 200 elementów | Playwright timing |
| PERF-007 | Operacja domenowa (roundtrip) | ≤ 200 | Dowolna | Playwright timing |

**Plik testu**: `frontend/src/ui/__tests__/ux-performance-budget.test.ts`

### 5.2 Regresja wydajności
- Każdy PR z UI V3 musi uruchomić testy wydajności.
- Przekroczenie budżetu o >20% = FAIL.
- Budżety są zamrożone — zmiana wymaga przeglądu architektonicznego.

---

## 6. TESTY KONTRAKTOWE

### 6.1 Istniejące testy kontraktowe SLD (24 testy)
Wszystkie w `frontend/src/ui/sld/core/__tests__/`:

| Test | Kontrakt |
|------|----------|
| `visualGraph.test.ts` | Struktura VisualGraphV1 |
| `determinism.test.ts` | Powtórzalność 100× |
| `layoutPipeline.test.ts` | Pipeline 5-fazowy |
| `topologyAdapterV2.test.ts` | Mapowanie domenowe |
| `stationBlockBuilder.test.ts` | Budowa bloków stacji |
| `topologyInputReader.test.ts` | Odczyt ENM |
| `elementRef.test.ts` | Tożsamość elementu |
| `exportManifest.test.ts` | Deterministyczność eksportu |
| `geometryOverrides.test.ts` | Nadpisania geometrii |
| `applyOverrides.test.ts` | Kompozycja układu |
| `overridesCiRender.test.ts` | CI render artefacts |
| `dragOverrides.integration.test.ts` | Przeciąganie CAD |
| `switchgearConfig.test.ts` | Konfiguracja rozdzielnicy |
| `switchgearConfigGolden.test.ts` | Golden E2E |
| `switchgearConfig.hashParity.test.ts` | Parytet hashy FE↔BE |
| `switchgearE2E.test.ts` | E2E konfiguracji |
| `switchgearRenderer.test.ts` | Renderowanie pól |
| `goldenNetworkE2E.test.ts` | Golden network pełny pipeline |
| `readinessGates.test.ts` | Bramki gotowości |
| `canonicalSld.test.ts` | Kanoniczny SLD |
| `catalogContract.test.ts` | Kontrakt katalogu |
| `fieldDevicePolish.test.ts` | Polskie etykiety pól |
| `industrialAestheticsLayout.test.ts` | Styl przemysłowy |
| `pvBessValidation.test.ts` | Walidacja PV/BESS |

### 6.2 Nowe testy kontraktowe do dodania (UI V3)
| Test | Kontrakt | PR |
|------|----------|----|
| `domainOpsClient.test.ts` | Idempotentność klienta operacji | PR-UIV3-01 |
| `domainOpsRetry.test.ts` | Retry z exponential backoff | PR-UIV3-01 |
| `snapshotStore.test.ts` | Niezmienność migawki w Zustand | PR-UIV3-02 |
| `readinessStore.test.ts` | Aktualizacja gotowości po operacji | PR-UIV3-02 |
| `fixActionNavigation.test.ts` | Nawigacja FixAction → dialog/element | PR-UIV3-05 |
| `overlayDeterminism.test.ts` | Deterministyczność overlay | PR-UIV3-06 |
| `urlStateSync.test.ts` | Synchronizacja URL ↔ stan | PR-UIV3-02 |

---

## 7. TESTY BACKEND

### 7.1 Istniejące testy deterministyczne (10 plików)
| Test | Plik |
|------|------|
| E2E determinizm | `backend/tests/test_e2e_determinism.py` |
| Scenariusz zwarciowy | `backend/tests/test_fault_scenario_v2_determinism.py` |
| Rozpływ mocy | `backend/tests/test_load_flow_determinism.py` |
| Rozpływ mocy P20a | `backend/tests/test_p20a_power_flow_determinism.py` |
| Zabezpieczenia | `backend/tests/test_protection_determinism_guards.py` |
| Sieci referencyjne | `backend/tests/test_reference_networks_determinism.py` |
| Wejście solvera | `backend/tests/test_solver_input_determinism.py` |
| Operacje topologiczne | `backend/tests/test_topology_ops_determinism.py` |
| PF workflow | `backend/tests/e2e/test_pf_determinism_workflow.py` |
| (Narzędzia) | `backend/tests/utils/determinism.py` |

### 7.2 Nowe testy backend do dodania (UI V3)
| Test | Zakres | PR |
|------|--------|----|
| `test_domain_ops_idempotency.py` | Idempotentność operacji domenowych | PR-UIV3-01 |
| `test_readiness_after_ops.py` | Gotowość po każdej operacji | PR-UIV3-01 |
| `test_fix_action_completeness.py` | Kompletność FixAction | PR-UIV3-01 |
| `test_snapshot_fingerprint_stability.py` | Stabilność odcisku migawki | PR-UIV3-02 |

---

## 8. KOMENDY TESTOWE

### 8.1 Frontend
```bash
cd mv-design-pro/frontend

# Wszystkie testy (z flagą --no-file-parallelism — WYMAGANE)
npm test

# Testy SLD core (kontrakty + deterministyczność)
npx vitest run --no-file-parallelism src/ui/sld/core/__tests__/

# Testy silnika układu
npx vitest run --no-file-parallelism src/engine/sld-layout/__tests__/

# Testy overlay
npx vitest run --no-file-parallelism src/ui/sld-overlay/__tests__/

# Testy E2E (Playwright)
npm run test:e2e

# Sprawdzenie typów
npm run type-check

# Linting
npm run lint

# Strażnik nazw kodowych
npm run guard:codenames
```

### 8.2 Backend
```bash
cd mv-design-pro/backend

# Wszystkie testy
poetry run pytest -q

# Testy deterministyczności
poetry run pytest -q -k "determinism"

# Testy golden network
poetry run pytest -q tests/golden/

# Testy E2E
poetry run pytest -q tests/e2e/

# Testy API
poetry run pytest -q tests/api/

# Formatowanie
poetry run black src tests
poetry run ruff check src tests
poetry run mypy src
```

### 8.3 Strażnicy CI (lokalne uruchomienie)
```bash
cd mv-design-pro

# Strażnicy krytyczne
python scripts/pcc_zero_guard.py
python scripts/no_codenames_guard.py
python scripts/sld_determinism_guards.py
python scripts/arch_guard.py
python scripts/docs_guard.py
python scripts/overlay_no_physics_guard.py
python scripts/solver_boundary_guard.py
python scripts/domain_no_guessing_guard.py
python scripts/canonical_ops_guard.py
python scripts/readiness_codes_guard.py
```

---

*Dokument wiążący. Matryca testów jest minimalna — rozszerzanie dozwolone, usuwanie zakazane.*
