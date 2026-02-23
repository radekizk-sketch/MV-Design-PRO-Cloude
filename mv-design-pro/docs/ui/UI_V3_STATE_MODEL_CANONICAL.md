# UI V3 — MODEL STANU (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: Kanoniczny minimalny model stanu UI V3 z mapą źródeł danych

---

## 1. ZASADA NADRZĘDNA

Stan UI V3 jest **minimalny**. UI przechowuje wyłącznie:
1. **Migawkę** (Snapshot) — jedyne źródło prawdy o sieci.
2. **Gotowość** (ReadinessProfile) — profil braków.
3. **Akcje naprawcze** (FixActions) — sugestie naprawy.
4. **Selekcję** — zaznaczone elementy.
5. **Kamerę** — pozycja i zoom SLD.
6. **Tryb** — bieżące narzędzie pracy.
7. **Kontekst przypadku** — aktywny przypadek i przebieg.
8. **Kontekst projektu** — identyfikator projektu.

Wszystko inne jest **derywowane** (obliczane) ze Snapshot lub pobierane z backendu na żądanie.

**ZAKAZ**: topologia w UI, „draft graph", kopia modelu, lokalna baza wyników, historia operacji w pamięci.

---

## 2. MAPA STANU

### 2.1 Grupa: KONTEKST GLOBALNY
**Magazyn**: `ui/app-state/store.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `activeProjectId` | `string \| null` | Wybór użytkownika | Identyfikator aktywnego projektu |
| `activeProjectName` | `string \| null` | Backend GET /api/projects | Nazwa projektu |
| `activeCaseId` | `string \| null` | Wybór użytkownika | Identyfikator aktywnego przypadku |
| `activeCaseName` | `string \| null` | Backend GET /api/cases | Nazwa przypadku |
| `activeCaseKind` | `'ShortCircuitCase' \| 'PowerFlowCase' \| null` | Backend | Rodzaj przypadku |
| `activeCaseResultStatus` | `'NONE' \| 'FRESH' \| 'OUTDATED'` | Backend | Status wyników |
| `activeMode` | `'MODEL_EDIT' \| 'CASE_CONFIG' \| 'RESULT_VIEW'` | Logika UI | Tryb pracy |
| `activeRunId` | `string \| null` | Backend | Bieżący przebieg analizy |
| `activeAnalysisType` | `'SHORT_CIRCUIT' \| 'LOAD_FLOW' \| 'PROTECTION' \| null` | Backend | Typ analizy |
| `activeSnapshotId` | `string \| null` | Backend | ID bieżącej migawki |

**Invarianty**:
- `activeMode = MODEL_EDIT` ⟹ `activeCaseId` może być null.
- `activeMode = CASE_CONFIG` ⟹ `activeCaseId` nie null.
- `activeMode = RESULT_VIEW` ⟹ `activeCaseId` nie null, `activeRunId` nie null.
- `activeCaseResultStatus = OUTDATED` ⟹ model zmieniony po ostatnim obliczeniu.

### 2.2 Grupa: MIGAWKA I MODEL
**Magazyny**: `ui/topology/snapshotStore.ts`, `ui/sld/useEnmStore.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `snapshot` | `NetworkSnapshot` | Backend DomainOpResponse | Niemutowalna migawka sieci |
| `snapshotHash` | `string` | Obliczany z snapshot | SHA-256 odcisk migawki |
| `enmModel` | `EnergyNetworkModel` | Backend GET /api/enm | Model energetyczny (read-only) |

**Invarianty**:
- `snapshot` zmienia się WYŁĄCZNIE po operacji domenowej lub odświeżeniu z backendu.
- `snapshotHash` = SHA-256(snapshot) — deterministyczny.
- `enmModel` jest funkcją `snapshot` — nie ma niezależnego cyklu życia.

### 2.3 Grupa: GOTOWOŚĆ
**Magazyny**: `ui/engineering-readiness/store.ts`, `ui/engineering-readiness/readinessLiveStore.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `readinessProfile` | `ReadinessProfileV1` | Backend DomainOpResponse | Profil gotowości |
| `fixActions` | `FixAction[]` | Backend DomainOpResponse | Lista akcji naprawczych |
| `blockerCount` | `number` | Derywowany | Liczba blokerów |
| `warningCount` | `number` | Derywowany | Liczba ostrzeżeń |
| `isReadyForAnalysis` | `boolean` | Derywowany | Czy gotowy do analiz |

**Invarianty**:
- `isReadyForAnalysis = (blockerCount === 0)`.
- `fixActions` odświeżane po każdej operacji domenowej.
- `readinessProfile.areas` obejmuje: CATALOGS, TOPOLOGY, SOURCES, STATIONS, GENERATORS, PROTECTION.

### 2.4 Grupa: SELEKCJA
**Magazyn**: `ui/selection/store.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `selectedIds` | `string[]` | Interakcja użytkownika | Zaznaczone elementy (posortowane) |
| `primaryId` | `string \| null` | Derywowany | Główny element selekcji |
| `selectionSource` | `'sld' \| 'tree' \| 'url' \| 'inspector'` | Logika UI | Źródło selekcji |

**Invarianty**:
- `selectedIds` ZAWSZE posortowane deterministycznie (stabilny porządek).
- Zmiana `selectedIds` synchronizuje URL (`?selected=<id>`).
- Zmiana URL synchronizuje `selectedIds`.

### 2.5 Grupa: KAMERA SLD
**Magazyny**: `ui/sld-editor/SldEditorStore.ts` (podstrzałka kamery)

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `cameraX` | `number` | Interakcja (pan) | Przesunięcie X |
| `cameraY` | `number` | Interakcja (pan) | Przesunięcie Y |
| `zoom` | `number` | Interakcja (scroll) | Poziom przybliżenia |
| `fitToContent` | `boolean` | Wyzwalacz | Dopasuj widok do treści |

**Invarianty**:
- Kamera NIE wpływa na układ SLD (layout jest niezależny od kamery).
- Zoom nie powoduje przeliczenia pipeline.
- `fitToContent` centruje widok — jednorazowy trigger.

### 2.6 Grupa: TRYB NARZĘDZIA SLD
**Magazyny**: `ui/sld/sldModeStore.ts`, `ui/sld/sldProjectModeStore.ts`, `ui/sld/operationalModeStore.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `sldMode` | `'view' \| 'edit' \| 'project'` | Przełącznik użytkownika | Tryb SLD |
| `projectModeActive` | `boolean` | Przełącznik | Tryb projektowy (geometria CAD) |
| `operationalMode` | `'normal' \| 'switching' \| 'fault'` | Przełącznik | Tryb operacyjny |
| `labelMode` | `'technical' \| 'minimal' \| 'none'` | Przełącznik | Tryb etykiet |

**Invarianty**:
- `sldMode = 'view'` ⟹ brak edycji, brak operacji domenowych z SLD.
- `projectModeActive = true` ⟹ geometria CAD aktywna (nadpisania pozycji).
- Zmiana trybu nie powoduje przeliczenia modelu.

### 2.7 Grupa: OVERLAY WYNIKÓW
**Magazyny**: `ui/sld-overlay/overlayStore.ts`, `ui/sld-overlay/variantStore.ts`, `ui/sld-overlay/sldDeltaOverlayStore.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `overlayRunId` | `string \| null` | Wybór użytkownika | ID przebiegu overlay |
| `overlayPayload` | `OverlayPayloadV1 \| null` | Backend GET /api/results | Dane overlay |
| `overlayEnabled` | `boolean` | Przełącznik | Czy overlay aktywny |
| `selectedVariant` | `string \| null` | Wybór użytkownika | Wariant do wyświetlenia |
| `deltaMode` | `boolean` | Przełącznik | Tryb porównania delta |
| `deltaRunIdA` | `string \| null` | Wybór | Przebieg A do porównania |
| `deltaRunIdB` | `string \| null` | Wybór | Przebieg B do porównania |

**Invarianty**:
- Overlay NIE modyfikuje geometrii SLD.
- Overlay jest czystą funkcją: g(LayoutResult, OverlayPayload).
- `deltaMode = true` ⟹ oba `deltaRunIdA` i `deltaRunIdB` nie null.
- Overlay odświeżany po zmianie `overlayRunId`.

### 2.8 Grupa: WYNIKI I PRZEBIEGI
**Magazyny**: `ui/results-workspace/store.ts`, `ui/results-browser/store.ts`, `ui/results-inspector/store.ts`

| Pole | Typ | Źródło | Opis |
|------|-----|--------|------|
| `runs` | `AnalysisRun[]` | Backend GET /api/analysis-runs | Lista przebiegów |
| `selectedRunId` | `string \| null` | Wybór użytkownika | Wybrany przebieg |
| `resultSet` | `ResultSetV1 \| null` | Backend GET /api/results | Zestaw wyników (ZAMROŻONE API) |
| `inspectedElementId` | `string \| null` | Selekcja | Element do inspekcji |

**Invarianty**:
- `resultSet` jest obiektem ZAMROŻONYM (Frozen Result API).
- UI konsumuje `resultSet` tylko do odczytu.
- Zmiana modelu → `activeCaseResultStatus = OUTDATED`.

---

## 3. DIAGRAM PRZEPŁYWU DANYCH

```
  Interakcja użytkownika (klik na SLD, formularz, menu)
           │
           ▼
  ┌────────────────────┐
  │  Warstwa prezentacji│ → emituje DomainOpEnvelope
  └────────┬───────────┘
           │
           ▼
  ┌────────────────────┐       ┌────────────────────┐
  │  Klient operacji   │──────►│  Backend API       │
  │  (idempotentność,  │  HTTP │  POST /api/domain- │
  │   retry, log)      │◄──────│  operations        │
  └────────┬───────────┘       └────────────────────┘
           │
           ▼ DomainOpResponse
  ┌────────────────────┐
  │  Aktualizacja stanu│
  │  snapshot ←─ nowa migawka
  │  readiness ←─ nowy profil
  │  fixActions ←─ nowe akcje
  └────────┬───────────┘
           │
           ▼ Derywacja (deterministyczna)
  ┌────────────────────┐
  │  TopologyAdapterV2 │→ VisualGraphV1
  │  LayoutPipeline    │→ LayoutResultV1
  │  StationBlockBuilder│→ bloki stacji
  └────────┬───────────┘
           │
           ▼
  ┌────────────────────┐
  │  Renderer SLD      │→ SVG/Canvas
  │  + OverlayRenderer │→ tokeny wyników
  └────────────────────┘
```

---

## 4. KONSOLIDACJA MAGAZYNÓW

### 4.1 Stan bieżący (~37 magazynów Zustand)
Rozproszone po ~37 plikach store.ts w różnych modułach UI.

### 4.2 Docelowa struktura (6 grup)

| Grupa | Magazyny docelowe | Odpowiedzialność |
|-------|-------------------|-----------------|
| **Globalna** | `app-state/store.ts` | Projekt, przypadek, tryb, sesja |
| **Model** | `topology/snapshotStore.ts`, `sld/useEnmStore.ts` | Migawka, model ENM |
| **Gotowość** | `engineering-readiness/store.ts` | Readiness, FixActions |
| **SLD** | `sld-editor/SldEditorStore.ts`, `sld/sldModeStore.ts` | Kamera, tryb, selekcja wizualna |
| **Overlay** | `sld-overlay/overlayStore.ts`, `sld-overlay/variantStore.ts` | Wyniki na SLD |
| **Wyniki** | `results-workspace/store.ts`, `results-inspector/store.ts` | Przebiegi, zbiory wyników |

### 4.3 Reguły zależności między grupami

```
  Globalna ──► Model ──► SLD
     │            │        │
     │            ▼        ▼
     │        Gotowość   Overlay
     │                     │
     └─────────────────► Wyniki
```

- Brak cyklicznych zależności.
- Grupa niższa może czytać z wyższej, nie odwrotnie.
- SLD czyta Model, nie odwrotnie.
- Overlay czyta Model + Wyniki, nie odwrotnie.

---

## 5. MAPA ŹRÓDEŁ DANYCH

| Dane | Źródło | Odświeżanie | Caching |
|------|--------|-------------|---------|
| Migawka (Snapshot) | `DomainOpResponse.snapshot` | Po każdej operacji domenowej | W pamięci (Zustand) |
| Model ENM | `GET /api/enm` | Po każdej operacji domenowej | W pamięci (Zustand) |
| Gotowość (Readiness) | `DomainOpResponse.readiness` | Po każdej operacji domenowej | W pamięci (Zustand) |
| FixActions | `DomainOpResponse.fix_actions` | Po każdej operacji domenowej | W pamięci (Zustand) |
| VisualGraph | Obliczany z Snapshot (TopologyAdapterV2) | Po zmianie Snapshot | Zapamiętany (useMemo) |
| LayoutResult | Obliczany z VisualGraph (LayoutPipeline) | Po zmianie VisualGraph | Zapamiętany (useMemo) |
| Katalog typów | `GET /api/catalog` | Na żądanie (react-query) | react-query staleTime |
| Przypadki | `GET /api/cases` | Na żądanie (react-query) | react-query staleTime |
| Przebiegi analiz | `GET /api/analysis-runs` | Na żądanie (react-query) | react-query staleTime |
| Zbiór wyników | `GET /api/results/{run_id}` | Na żądanie | react-query (per runId) |
| Paczka dowodowa | `GET /api/proof-pack/{run_id}` | Na żądanie | react-query (per runId) |

---

## 6. SYNCHRONIZACJA STANU Z URL

| Parametr URL | Pole stanu | Kierunek synchronizacji |
|-------------|-----------|------------------------|
| `#sld` / `#results` / `#wizard` | `activeRoute` | URL → UI |
| `?selected=<id>` | `selectedIds` | Dwukierunkowa |
| `?case=<id>` | `activeCaseId` | URL → UI |
| `?run=<id>` | `activeRunId` | URL → UI |
| `?mode=edit\|config\|view` | `activeMode` | URL → UI |
| `?overlay=on\|off` | `overlayEnabled` | URL → UI |

**Plik implementacji**: `frontend/src/ui/navigation/useUrlSelectionSync.ts`

---

## 7. TESTY MODELU STANU

| Test | Opis | Plik |
|------|------|------|
| Inicjalizacja stanu | Domyślne wartości po otwarciu | `ui/__tests__/app-state-store.test.ts` |
| Selekcja deterministyczna | `selectedIds` zawsze posortowane | `ui/__tests__/selection-store.test.ts` |
| Tryb bramkowania | MODEL_EDIT / CASE_CONFIG / RESULT_VIEW | `ui/__tests__/mode-permissions.test.ts` |
| Synchronizacja URL | URL → selekcja i odwrotnie | `ui/navigation/__tests__/` |
| Snapshot niezmienność | Snapshot nie modyfikowany przez UI | `ui/__tests__/operationSnapshotEnforcement.test.ts` |

---

*Dokument wiążący. Model stanu minimalny — brak rozszerzania bez przeglądu architektonicznego.*
