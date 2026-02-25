# UI V3 — MASTER AGENT PROMPT (EXECUTABLE IMPLEMENTATION BLUEPRINT)

**Status**: BINDING
**Data**: 2026-02-25
**Wersja**: 1.0.0
**Zakres**: Kompletny plan powiązania frontendu z backendem — od pustego ekranu do działających obliczeń zwarciowych i rozpływowych na dowolnie skonfigurowanej sieci SN

---

## PODSUMOWANIE WYKONAWCZE

MV-Design-PRO posiada:
- **Frontend**: 85% strukturalnie gotowy (698 plików TS/TSX, 59 modułów UI), ale **40% funkcjonalny** — SLD pokazuje demo, drzewo projektu puste, kreator nie zapisuje, obliczenia nie działają
- **Backend**: W pełni działający (200+ endpointów, 33 routery, 1600+ testów, solvery IEC 60909 + Newton-Raphson)
- **Katalog**: Gotowy (kable XLPE Cu/Al 70-300mm², linie napowietrzne, transformatory WN/SN i SN/nN, rozdzielnice)
- **Operacje domenowe**: 41 kanonicznych operacji z pełnym trace
- **Sieci referencyjne**: 5 golden networks (promieniowa, odgałęzienie, pierścień, OZE, ochrona)

**Problem**: Frontend NIE jest podłączony do backendu. UI to fasada bez instalacji hydraulicznej.

**Cel**: Powiązać cały system tak, aby inżynier mógł:
1. Utworzyć projekt i przypadek obliczeniowy
2. Zbudować dowolną sieć SN (GPZ → magistrala → stacje → odgałęzienia → pierścień)
3. Automatycznie przypisać dane katalogowe do każdego elementu
4. Uruchomić obliczenia zwarciowe (IEC 60909) i rozpływowe (Newton-Raphson)
5. Zobaczyć wyniki na SLD, w tabelach i w paczkach dowodowych

---

## §1. DIAGNOZA — CO JEST ZEPSUTE I DLACZEGO

### 1.1 SLD Editor — DEMO ONLY

**Objaw**: Schemat jednokreskowy pokazuje hardcoded demo symbole zamiast rzeczywistej topologii sieci.

**Przyczyna źródłowa**:
```
frontend/src/ui/sld/SldEditorPage.tsx:
  <SldEditorPage useDemo={true} />  ← HARDCODED w App.tsx linia 292
```
`SldEditorStore` trzyma `symbols: Map<string, AnySldSymbol>` z DEMO_SYMBOLS — pełna kopia modelu z topologią i pozycjami. Narusza zasadę V3 „SLD = f(Snapshot)".

**API które już istnieje**:
```
GET /api/cases/{case_id}/enm/topology          → topologia sieci
GET /api/cases/{case_id}/enm/topology/summary   → statystyki (Sbus, Sbranch...)
GET /api/study-cases/{case_id}/sld-overrides    → nadpisania geometrii
GET /projects/{project_id}/sld/{diagram_id}/overlay → SLD z nakładką wyników
```

**Naprawa**:
1. Usunąć `useDemo={true}` z `App.tsx`
2. `SldEditorPage` pobiera snapshot z `snapshotStore` (zasilany z `GET /enm/topology`)
3. Snapshot → `TopologyAdapterV2` → `VisualGraphV1` → `LayoutPipeline` → render
4. Brak draft graph — symbole derywowane ze Snapshot

### 1.2 Drzewo projektu — PUSTE TABLICE

**Objaw**: Panel nawigacji (Project Tree) nie pokazuje żadnych elementów sieci.

**Przyczyna źródłowa**:
```typescript
// App.tsx linia 165-173
const treeElements = useMemo(() => ({
  buses: [],      // ← HARDCODED EMPTY
  lines: [],
  cables: [],
  transformers: [],
  switches: [],
  sources: [],
  loads: [],
}), []);
```

**API które już istnieje**:
```
GET /api/cases/{case_id}/enm                    → pełny model ENM
GET /api/cases/{case_id}/enm/topology/summary   → podsumowanie topologii
```

**Naprawa**:
1. Hook `useNetworkElements(caseId)` pobiera ENM z backendu
2. Mapuje ENM.buses/branches/transformers/sources/loads na format `TreeNode[]`
3. Aktualizuje się po każdej operacji domenowej (snapshot change)

### 1.3 Przycisk „Oblicz" — NO-OP

**Objaw**: Kliknięcie przycisku obliczeniowego nic nie robi.

**Przyczyna źródłowa**:
```typescript
// App.tsx linia 118-124
const handleCalculate = useCallback(() => {
  // TODO: Calculation requires an active case configured
  // Silent no-op until case management flow is complete
  if (import.meta.env.DEV) {
    console.debug('[handleCalculate] No active case - calculation skipped');
  }
}, []);
```

**API które już istnieje**:
```
POST /runs/short-circuit    → uruchom obliczenia zwarciowe
POST /runs/power-flow       → uruchom obliczenia rozpływowe
POST /runs/protection       → uruchom obliczenia zabezpieczeń
```

**Naprawa**:
1. `handleCalculate` sprawdza `activeCaseId` + `analysisType`
2. Sprawdza eligibility: `GET /cases/{id}/analysis-eligibility`
3. Jeśli eligible: `POST /runs/{analysisType}` z parametrami przypadku
4. Polling/callback na status: `GET /analysis-runs/{runId}`
5. Gdy COMPLETED: załaduj wyniki do `resultsStore`

### 1.4 Kreator sieci — NIEPODŁĄCZONY

**Objaw**: Wizard K1-K10 wyświetla formularze, ale zmiany nie są zapisywane do modelu.

**Przyczyna źródłowa**: `useWizardStore` trzyma lokalną prawdę (draft ENM) zamiast emitować operacje domenowe.

**API które już istnieje**:
```
POST /api/cases/{case_id}/enm/domain-ops         → wykonaj operację domenową
POST /api/cases/{case_id}/enm/ops/batch           → operacje wsadowe
POST /api/cases/{case_id}/wizard/apply-step       → zastosuj krok kreatora
GET  /api/cases/{case_id}/wizard/state            → stan kreatora
GET  /api/cases/{case_id}/wizard/can-proceed      → sprawdź nawigację
```

**Operacje domenowe do emisji z kreatora**:
```python
# K2: Punkt zasilania (GPZ)
add_grid_source_sn(voltage_kv=15.0, source_name="GPZ", sk3_mva=250.0, rx_ratio=0.1)

# K3-K4: Magistrala
continue_trunk_segment_sn(segment={rodzaj="KABEL", dlugosc_m=300, catalog_ref="YAKXS_3x120"})

# K5: Stacja
insert_station_on_segment_sn(segment_id=..., station={station_type="B", ...}, transformer={...})

# K6: Odgałęzienie
start_branch_segment_sn(from_bus_ref=..., segment={...})

# K7: Pierścień + NOP
connect_secondary_ring_sn(from_bus_ref=..., to_bus_ref=..., segment={...})
set_normal_open_point(switch_ref=...)

# K8: OZE
add_pv_inverter_nn(bus_nn_ref=..., pv_spec={rated_power_ac_kw=50.0, ...})
add_bess_inverter_nn(bus_nn_ref=..., bess_spec={charge_power_kw=30.0, ...})
```

### 1.5 Przypadki obliczeniowe — BRAK SYNCHRONIZACJI

**Objaw**: Status wyników zawsze NONE. Zmiana modelu nie unieważnia wyników.

**Przyczyna źródłowa**: Store `studyCasesStore` ma API calls, ale brak polling i brak invalidation po operacjach domenowych.

**API które już istnieje**:
```
POST /api/study-cases                                → utwórz przypadek
GET  /api/study-cases/project/{projectId}            → lista przypadków
POST /api/study-cases/activate                       → aktywuj przypadek
GET  /api/study-cases/{caseId}/can-calculate          → sprawdź kwalifikację
POST /api/study-cases/project/{projectId}/invalidate-all → unieważnij wyniki
GET  /api/study-cases/{caseId}                        → status (w tym resultStatus)
```

### 1.6 Wyniki — DZIAŁAJĄ ALE BEZ ŹRÓDŁA DANYCH

**Objaw**: Tabele wyników, inspektor dowodowy i nakładki SLD DZIAŁAJĄ poprawnie — ale nie ma ścieżki do uruchomienia obliczeń z UI.

**API które już istnieje**:
```
GET /analysis-runs/{runId}/results/buses              → wyniki na szynach
GET /analysis-runs/{runId}/results/branches            → wyniki na odcinkach
GET /analysis-runs/{runId}/results/short-circuit       → wyniki zwarciowe
GET /analysis-runs/{runId}/trace                       → ślad obliczeniowy
GET /api/proof/{projectId}/{caseId}/{runId}/pack       → paczka dowodowa
```

---

## §2. MAPA POWIĄZAŃ API (FRONTEND STORE → BACKEND ENDPOINT)

### 2.1 Architektura przepływu danych

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/TypeScript)                       │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ snapshotStore │    │readinessStore│    │ resultsStore  │              │
│  │   (ENM+hash)  │    │(issues+fixes)│    │ (run results) │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│  ┌──────▼───────────────────▼───────────────────▼──────────────────┐   │
│  │              domainOpsClient.ts (CQRS-lite)                      │   │
│  │  • DomainOpEnvelope (idempotency_key UUID)                       │   │
│  │  • Retry z exponential backoff (max 3)                           │   │
│  │  • Response: snapshot + readiness + fixActions + delta            │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                             │ HTTP                                      │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────────────┐
│                        BACKEND (FastAPI/Python)                         │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  ENM + Domain │    │   Solver     │    │   Results    │              │
│  │  Operations   │    │   Pipeline   │    │   + Proof    │              │
│  │  41 canonical │    │  IEC 60909   │    │   + Export   │              │
│  │  operations   │    │  Newton-R.   │    │              │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│  ┌──────▼───────────────────▼───────────────────▼──────────────────┐   │
│  │                    NetworkGraph + Catalog                         │   │
│  │  • CatalogRepository (resolver, drift_detection, governance)     │   │
│  │  • SolverInputBuilder (ENM → SolverInputEnvelope)                │   │
│  │  • EligibilityCheck (blockers, warnings, infos)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Kompletna mapa Store → API

| Frontend Store | Endpoint (GET) | Endpoint (POST/PUT) | Częstotliwość |
|---|---|---|---|
| `appStateStore` | — (lokalny) | — | Na zmianę trybu |
| `snapshotStore` | `GET /cases/{id}/enm` | `POST /cases/{id}/enm/domain-ops` | Po każdej operacji |
| `readinessStore` | `GET /cases/{id}/enm/readiness` | — (z DomainOpResponse) | Po każdej operacji |
| `studyCasesStore` | `GET /study-cases/project/{id}` | `POST /study-cases` | CRUD + polling |
| `sldEditorStore` | — (derywowany ze snapshot) | `PUT /study-cases/{id}/sld-overrides` | Derywacja |
| `resultsInspectorStore` | `GET /analysis-runs/{id}/results/*` | — | Po obliczeniu |
| `catalogStore` | `GET /catalog/*` | `POST /catalog/.../type-ref` | Przy starcie + binding |
| `selectionStore` | — (lokalny) | — | Na klik |
| `proofStore` | `GET /proof/{p}/{c}/{r}/pack` | — | Na żądanie |
| `powerFlowStore` | `GET /power-flow-runs/{id}/results` | `POST /runs/power-flow` | Po obliczeniu |
| `protectionStore` | `GET /protection-runs/{id}/results` | `POST /runs/protection` | Po obliczeniu |

---

## §3. KATALOG — AUTOMATYCZNE DANE KATALOGOWE

### 3.1 Dostępne typy w katalogu

Katalog jest predefiniowany w kodzie backendowym i zawiera kompletne dane elektryczne zgodne z IEC/PN-EN.

#### Kable XLPE miedziowe (1-żyłowe, 20 kV)
| ID | Nazwa | Przekrój | R [Ω/km] | X [Ω/km] | Ith [A] |
|---|---|---|---|---|---|
| cable-base-xlpe-cu-1c-70 | Kabel XLPE Cu 1×70 mm² | 70 | 0.268 | 0.123 | 245 |
| cable-base-xlpe-cu-1c-120 | Kabel XLPE Cu 1×120 mm² | 120 | 0.153 | 0.112 | 340 |
| cable-base-xlpe-cu-1c-150 | Kabel XLPE Cu 1×150 mm² | 150 | 0.124 | 0.108 | 395 |
| cable-base-xlpe-cu-1c-185 | Kabel XLPE Cu 1×185 mm² | 185 | 0.099 | 0.104 | 450 |
| cable-base-xlpe-cu-1c-240 | Kabel XLPE Cu 1×240 mm² | 240 | 0.0754 | 0.099 | 530 |
| cable-base-xlpe-cu-1c-300 | Kabel XLPE Cu 1×300 mm² | 300 | 0.0601 | 0.095 | 615 |

#### Kable XLPE aluminiowe
Pełna gama 50-400 mm² (analogiczne parametry z jth_AL_XLPE = 94 A/mm²).

#### Linie napowietrzne (AFL/ACSR)
Pełna gama standardowa.

#### Transformatory WN/SN (110/15 kV i 110/20 kV, Yd11)
| ID | Nazwa | Moc | uk% | Straty pk | Grupa |
|---|---|---|---|---|---|
| tr-wn-sn-110-15-16mva | TR 110/15 kV 16 MVA | 16 MVA | 10.5% | 85 kW | Yd11 |
| tr-wn-sn-110-15-25mva | TR 110/15 kV 25 MVA | 25 MVA | 11.0% | 120 kW | Yd11 |
| tr-wn-sn-110-15-40mva | TR 110/15 kV 40 MVA | 40 MVA | 11.5% | 175 kW | Yd11 |
| tr-wn-sn-110-15-63mva | TR 110/15 kV 63 MVA | 63 MVA | 12.0% | 260 kW | Yd11 |

#### Transformatory SN/nN (15/0.4 kV i 20/0.4 kV, Dyn11)
| ID | Nazwa | Moc | uk% | Straty pk |
|---|---|---|---|---|
| ONAN_100 | TR SN/nN 100 kVA | 100 kVA | 4.0% | 2.15 kW |
| ONAN_160 | TR SN/nN 160 kVA | 160 kVA | 4.0% | 3.10 kW |
| ONAN_250 | TR SN/nN 250 kVA | 250 kVA | 4.0% | 4.20 kW |
| ONAN_400 | TR SN/nN 400 kVA | 400 kVA | 4.0% | 5.75 kW |
| ONAN_630 | TR SN/nN 630 kVA | 630 kVA | 6.0% | 7.10 kW |
| ONAN_1000 | TR SN/nN 1000 kVA | 1000 kVA | 6.0% | 10.5 kW |

### 3.2 Automatyczne wiązanie katalogowe

Każdy element tworzony w kreatorze MUSI mieć `catalog_ref`:

```
REGUŁA: Żaden element nie może istnieć bez danych katalogowych.

Mechanizm:
1. Kreator (wizard) przy tworzeniu elementu WYMAGA wyboru typu z katalogu
2. Operacja domenowa zawiera pole `catalog_ref` w payload
3. Backend resolver wiąże catalog_ref → parametry fizyczne (R, X, Ith, uk%, ...)
4. SolverInputBuilder używa rozwiązanych parametrów (CATALOG > OVERRIDE > DERIVED)
5. Jeśli brak catalog_ref → BLOCKER (solver nie uruchomi się)
```

**Domyślne przypisania (automatyczne)**:
- Nowy odcinek kablowy SN → `YAKXS_3x120` (kabel AL XLPE 120mm²)
- Nowy transformator SN/nN → `ONAN_630` (630 kVA Dyn11)
- Nowy transformator WN/SN → `tr-wn-sn-110-15-25mva` (25 MVA Yd11)
- Wyłącznik SN → domyślny typ z katalogu rozdzielnic

Inżynier może zmienić typ z katalogu w inspektorze elementu (PropertyGrid → TypePicker).

---

## §4. PEŁNY PRZEPŁYW OBLICZENIOWY (END-TO-END)

### 4.1 Krok po kroku: od pustego ekranu do wyników

```
[1. UTWÓRZ PROJEKT]
    POST /api/projects
    → {id: "proj-001", name: "Sieć SN Rejon X"}

[2. UTWÓRZ PRZYPADEK OBLICZENIOWY]
    POST /api/study-cases
    → {id: "case-001", kind: "ShortCircuitCase", result_status: "NONE"}

[3. AKTYWUJ PRZYPADEK]
    POST /api/study-cases/activate
    → case-001 jest teraz aktywny

[4. BUDUJ SIEĆ (operacje domenowe)]
    POST /api/cases/{case-001}/enm/domain-ops

    4a. add_grid_source_sn
        → GPZ (szyna SN 15kV, źródło Sk3=250MVA)

    4b. continue_trunk_segment_sn × N
        → odcinki magistrali (auto catalog_ref=YAKXS_3x120)

    4c. insert_station_on_segment_sn
        → stacja B/C z transformatorem SN/nN (auto ONAN_630)

    4d. start_branch_segment_sn (opcjonalnie)
        → odgałęzienie

    4e. connect_secondary_ring_sn + set_normal_open_point (opcjonalnie)
        → pierścień z NOP

    4f. add_pv_inverter_nn / add_bess_inverter_nn (opcjonalnie)
        → OZE na nN

    Każda operacja zwraca:
    → snapshot (nowa migawka)
    → readiness (profil gotowości)
    → fixActions (co jeszcze brakuje)
    → delta (co się zmieniło)

[5. SPRAWDŹ GOTOWOŚĆ DO OBLICZEŃ]
    GET /api/cases/{case-001}/analysis-eligibility
    → {eligible: true, blockers: [], warnings: [...]}

    Wymagania minimalne:
    - Co najmniej 1 węzeł SLACK (GPZ)
    - Wszystkie odcinki mają catalog_ref LUB impedance_override
    - Sieć jest spójna (connected graph)

[6. URUCHOM OBLICZENIA]
    POST /runs/short-circuit
    body: {case_id: "case-001", config: {fault_type: "3F"}}
    → {run_id: "run-001", status: "EXECUTING"}

    LUB:
    POST /runs/power-flow
    body: {case_id: "case-001", config: {method: "NEWTON_RAPHSON"}}
    → {run_id: "run-002", status: "EXECUTING"}

[7. POLLING STATUS]
    GET /analysis-runs/{run_id}
    → {status: "COMPLETED" | "FAILED" | "EXECUTING"}

[8. POBIERZ WYNIKI]
    GET /analysis-runs/{run-001}/results/buses
    → [{ref_id: "bus-001", ik3_ka: 8.54, sk3_mva: 221.8, ...}]

    GET /analysis-runs/{run-001}/results/branches
    → [{ref_id: "branch-001", ik3_ka: 4.27, loading_percent: 67.3, ...}]

    GET /analysis-runs/{run-001}/trace
    → [trace artifacts z pełnym śladem obliczeniowym]

[9. WYŚWIETL NA SLD]
    GET /analysis-runs/{run-001}/overlay
    → overlay tokens do nałożenia na SLD (prądy, napięcia, obciążenia)

[10. EKSPORTUJ]
    GET /projects/{proj-001}/analysis-runs/{run-001}/export/pdf
    GET /projects/{proj-001}/analysis-runs/{run-001}/export/docx
    GET /api/proof/{proj-001}/{case-001}/{run-001}/pack
```

### 4.2 Pipeline obliczeń wewnątrz backendu

```
ENM (snapshot dict)
  │
  ▼
NetworkGraph (core model)
  │ CatalogRepository.resolve()
  ▼
SolverInputBuilder
  │ check_eligibility()
  │ build_bus_payloads()
  │ build_branch_payloads()
  │ build_transformer_payloads()
  ▼
SolverInputEnvelope (frozen, deterministic, with provenance)
  │
  ├──▶ ShortCircuitIEC60909 solver
  │     → Y-bus → Z-Thevenin → Ik3, Sk3, ip, Ith per bus
  │     → TraceArtifact (WHITE BOX: wszystkie kroki jawne)
  │
  └──▶ PowerFlowNewton solver
        → Y-bus → Jacobian → Newton-Raphson iterations
        → V, theta, P, Q, losses per bus/branch
        → TraceArtifact

SolverResult (frozen)
  │
  ├──▶ ShortCircuitResult → ResultSet V1 API (FROZEN)
  ├──▶ PowerFlowResult → ResultSet V1 API (FROZEN)
  ├──▶ ProofDocument (LaTeX, PDF, DOCX, JSON)
  └──▶ AnalysisInterpretation (voltage profile, sensitivity, etc.)
```

### 4.3 Minimalna sieć obliczalna

**Zwarcia (IEC 60909)**:
```
Minimum: 1 źródło SLACK + 1 szyna + 1 odcinek z parametrami
Przykład: GPZ (Sk3=250MVA) → kabel 300m YAKXS 3x120
```

**Rozpływ mocy (Newton-Raphson)**:
```
Minimum: 1 źródło SLACK + 1 szyna PQ z obciążeniem + 1 odcinek
Przykład: GPZ → kabel 300m → stacja B (obciążenie 400kW)
```

---

## §5. OPERACJE DOMENOWE — KOMPLETNA LISTA

### 5.1 Operacje kanoniczne do budowy sieci SN

| # | Operacja | Opis | Automatyczny catalog_ref |
|---|---|---|---|
| 1 | `add_grid_source_sn` | Dodaj GPZ (źródło sieciowe) | — (parametry: Sk3, R/X) |
| 2 | `continue_trunk_segment_sn` | Kontynuuj magistralę | `YAKXS_3x120` |
| 3 | `insert_station_on_segment_sn` | Wstaw stację B/C na odcinku | `ONAN_630` (TR) |
| 4 | `start_branch_segment_sn` | Rozpocznij odgałęzienie | `YAKXS_3x120` |
| 5 | `connect_secondary_ring_sn` | Zamknij pierścień | `YAKXS_3x120` |
| 6 | `set_normal_open_point` | Ustaw NOP na łączniku | — |
| 7 | `insert_section_switch_sn` | Wstaw łącznik sekcyjny | domyślny rozdzielniczy |
| 8 | `add_pv_inverter_nn` | Dodaj falownik PV na nN | — (parametry mocy) |
| 9 | `add_bess_inverter_nn` | Dodaj BESS na nN | — (parametry mocy) |
| 10 | `add_load_nn` | Dodaj obciążenie nN | — (P, Q) |
| 11 | `add_ct` | Dodaj przekładnik prądowy | — (przekładnia) |
| 12 | `add_vt` | Dodaj przekładnik napięciowy | — (przekładnia) |
| 13 | `add_relay` | Dodaj zabezpieczenie | — (typ) |
| 14 | `change_catalog_ref` | Zmień typ katalogowy | wybrany przez inżyniera |
| 15 | `remove_element` | Usuń element | — |
| 16 | `rename_element` | Zmień nazwę | — |

### 5.2 Format koperty operacji (CANONICAL)

```typescript
interface DomainOpEnvelope {
  operation: {
    name: string;                    // np. "continue_trunk_segment_sn"
    idempotency_key: string;         // crypto.randomUUID()
    payload: Record<string, unknown>;
  };
  snapshot_base_hash: string;        // SHA-256 bieżącej migawki
  project_id: string;
}

// Odpowiedź:
interface DomainOpResponse {
  snapshot: NetworkSnapshot;          // nowa migawka
  readiness: ReadinessProfileV1;      // profil gotowości
  fix_actions: FixAction[];           // sugestie naprawy
  delta: DomainOpDelta;              // lista zmian
  logical_views: LogicalViews;       // widoki logiczne
  selection_hint: string | null;     // podpowiedź selekcji
}
```

### 5.3 Endpoint API

```
POST /api/cases/{caseId}/enm/domain-ops

Request body: DomainOpEnvelope
Response: DomainOpResponse
```

---

## §6. PLAN IMPLEMENTACJI — 10 FAZY

### FAZA 0: Infrastruktura komunikacji (FUNDAMENT)

**Cel**: Pojedynczy punkt komunikacji frontend↔backend

**Pliki do stworzenia/modyfikacji**:
```
frontend/src/api/client.ts                    — NOWY: bazowy klient HTTP (fetch wrapper)
frontend/src/api/domainOpsClient.ts           — NOWY: klient operacji domenowych
frontend/src/api/projectsApi.ts               — NOWY: API projektów
frontend/src/api/studyCasesApi.ts             — NOWY: API przypadków
frontend/src/api/enmApi.ts                    — NOWY: API modelu ENM
frontend/src/api/analysisApi.ts               — NOWY: API obliczeń
frontend/src/api/resultsApi.ts                — NOWY: API wyników
frontend/src/api/catalogApi.ts                — NOWY: API katalogu
```

**Kontrakt klienta bazowego**:
```typescript
// client.ts
const API_BASE = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

**Kontrakt klienta operacji domenowych**:
```typescript
// domainOpsClient.ts
export async function executeDomainOp(
  caseId: string,
  operationName: string,
  payload: Record<string, unknown>,
  snapshotBaseHash: string,
): Promise<DomainOpResponse> {
  const envelope: DomainOpEnvelope = {
    operation: {
      name: operationName,
      idempotency_key: crypto.randomUUID(),
      payload,
    },
    snapshot_base_hash: snapshotBaseHash,
    project_id: useAppStateStore.getState().activeProjectId ?? '',
  };

  return apiPost(`/cases/${caseId}/enm/domain-ops`, envelope);
}
```

### FAZA 1: Projekty i przypadki obliczeniowe

**Cel**: Pełny cykl życia projektu i przypadku (CRUD + aktywacja)

**Pliki do modyfikacji**:
```
frontend/src/ui/app-state/store.ts            — dodać: loadProject, loadCases
frontend/src/ui/study-cases/store.ts          — podłączyć API zamiast mocków
frontend/src/App.tsx                          — inicjalizacja projektu przy starcie
```

**Flow**:
1. `App.tsx` → przy starcie: `GET /api/projects` → jeśli brak → `POST /api/projects`
2. `studyCasesStore.loadCases(projectId)` → `GET /study-cases/project/{id}`
3. Jeśli brak przypadku → automatycznie `POST /study-cases` (ShortCircuitCase)
4. `POST /study-cases/activate` → ustaw aktywny
5. Store aktualizuje: `activeProjectId`, `activeCaseId`, `activeMode`

### FAZA 2: Snapshot Store (jedyne źródło prawdy)

**Cel**: ENM snapshot jako single source of truth dla całego UI

**Pliki do stworzenia/modyfikacji**:
```
frontend/src/stores/snapshotStore.ts          — NOWY: centralny store migawki
frontend/src/stores/readinessStore.ts         — NOWY: store gotowości
frontend/src/stores/fixActionsStore.ts        — NOWY: store akcji naprawczych
```

**Kontrakt snapshotStore**:
```typescript
interface SnapshotState {
  snapshot: NetworkSnapshot | null;
  snapshotHash: string;
  isLoading: boolean;
  error: string | null;

  // Akcje:
  loadSnapshot(caseId: string): Promise<void>;
  applyDomainOp(caseId: string, op: string, payload: Record<string, unknown>): Promise<void>;
}

// loadSnapshot:
//   GET /api/cases/{caseId}/enm → snapshot
//   compute SHA-256 hash
//   set snapshot + hash

// applyDomainOp:
//   POST /api/cases/{caseId}/enm/domain-ops
//   update snapshot, readiness, fixActions from response
//   invalidate case results
```

### FAZA 3: Drzewo topologii (Project Tree)

**Cel**: Drzewo projektu wyświetla rzeczywiste elementy sieci ze snapshot

**Pliki do modyfikacji**:
```
frontend/src/App.tsx                          — zastąpić puste tablice danymi ze snapshot
frontend/src/ui/topology/TopologyPanel.tsx    — zasilanie z snapshotStore
frontend/src/ui/topology/TopologyTreeView.tsx — mapowanie snapshot → TreeNode[]
```

**Mapowanie**:
```typescript
function snapshotToTreeElements(snapshot: NetworkSnapshot) {
  return {
    buses: snapshot.buses.map(b => ({ id: b.ref_id, name: b.name, voltage_kv: b.voltage_kv })),
    lines: snapshot.branches.filter(b => b.type === 'line_overhead').map(...),
    cables: snapshot.branches.filter(b => b.type === 'cable').map(...),
    transformers: snapshot.transformers.map(...),
    switches: snapshot.branches.filter(b => b.type === 'switch' || b.type === 'breaker').map(...),
    sources: snapshot.sources.map(...),
    loads: snapshot.loads.map(...),
  };
}
```

### FAZA 4: SLD z rzeczywistych danych

**Cel**: SLD renderuje schemat jednokreskowy z rzeczywistego snapshot (nie demo)

**Pliki do modyfikacji**:
```
frontend/src/App.tsx                          — usunąć useDemo={true}
frontend/src/ui/sld/SldEditorPage.tsx         — zasilanie z snapshotStore
frontend/src/ui/sld/core/topologyAdapterV2.ts — adapter snapshot → VisualGraph (już istnieje!)
frontend/src/ui/sld/core/layoutPipeline.ts    — pipeline layout (już istnieje!)
```

**Flow**:
```
snapshotStore.snapshot
  → TopologyAdapterV2.toVisualGraph(snapshot)
  → LayoutPipeline.execute(visualGraph)
  → LayoutResult (pozycje elementów)
  → applyOverrides(layoutResult, sldOverrides)  [z GET /sld-overrides]
  → Renderer (SVG)
```

**KRYTYCZNE**: Usunąć `SldEditorStore.symbols` (draft graph). Symbole MUSZĄ być derywowane ze snapshot.

### FAZA 5: Kreator jako emiter operacji

**Cel**: Wizard K1-K10 emituje operacje domenowe (nie lokalną prawdę)

**Pliki do modyfikacji**:
```
frontend/src/ui/wizard/WizardPage.tsx         — emisja operacji przez domainOpsClient
frontend/src/ui/wizard/useWizardStore.ts      — odczyt ze snapshotStore (nie lokalna kopia)
frontend/src/ui/wizard/steps/                 — formularze emitują operacje
```

**Mapowanie kroków kreatora → operacje domenowe**:
```
K1 (Parametry modelu) → header update (nie operacja — metadata)
K2 (GPZ)              → add_grid_source_sn
K3 (Magistrala)       → continue_trunk_segment_sn × N
K4 (Stacje)           → insert_station_on_segment_sn
K5 (Odgałęzienia)     → start_branch_segment_sn
K6 (Pierścień)        → connect_secondary_ring_sn + set_normal_open_point
K7 (OZE)              → add_pv_inverter_nn / add_bess_inverter_nn
K8 (Katalogi)         → change_catalog_ref (weryfikacja kompletności)
K9 (Podgląd SLD)      → BRAK OPERACJI (odczyt snapshot → SLD preview)
K10 (Obliczenia)      → POST /runs/short-circuit LUB /runs/power-flow
```

### FAZA 6: Obliczenia (Calculate)

**Cel**: Przycisk „Oblicz" uruchamia solver i wyświetla wyniki

**Pliki do modyfikacji**:
```
frontend/src/App.tsx                          — handleCalculate podłączony do API
frontend/src/ui/app-state/store.ts            — status obliczeń + polling
frontend/src/stores/analysisRunStore.ts       — NOWY: zarządzanie przebiegami
```

**Flow**:
```typescript
async function handleCalculate() {
  const { activeCaseId, analysisType } = useAppStateStore.getState();
  if (!activeCaseId) return;

  // 1. Sprawdź kwalifikację
  const eligibility = await apiGet(`/cases/${activeCaseId}/analysis-eligibility`);
  if (!eligibility.eligible) {
    showBlockers(eligibility.blockers);
    return;
  }

  // 2. Uruchom obliczenia
  const analysisEndpoint = analysisType === 'LOAD_FLOW' ? 'power-flow' : 'short-circuit';
  const { run_id } = await apiPost(`/runs/${analysisEndpoint}`, {
    case_id: activeCaseId,
    config: getAnalysisConfig(analysisType),
  });

  // 3. Polling status
  await pollUntilComplete(run_id);

  // 4. Załaduj wyniki
  const results = await apiGet(`/analysis-runs/${run_id}/results`);
  resultsStore.setResults(results);

  // 5. Przejdź do widoku wyników
  window.location.hash = '#results';
}
```

### FAZA 7: Wyniki i nakładki SLD

**Cel**: Tabele wyników + nakładka na SLD + ślad obliczeniowy

**Pliki do modyfikacji**:
```
frontend/src/ui/results-inspector/ResultsInspectorPage.tsx  — zasilanie z resultsStore
frontend/src/ui/sld-overlay/OverlayEngine.ts                — nakładka z GET /overlay
frontend/src/ui/sld-overlay/overlayStore.ts                 — zasilanie z API
```

Wyniki JUŻ DZIAŁAJĄ w tabelach — potrzeba tylko podłączyć `run_id` z fazy 6.

### FAZA 8: Inspektor elementu + FixActions

**Cel**: PropertyGrid wyświetla dane ze snapshot + nawigacja FixAction

**Pliki do modyfikacji**:
```
frontend/src/ui/property-grid/PropertyGridContainer.tsx — zasilanie ze snapshotStore
frontend/src/ui/property-grid/PropertyGrid.tsx          — 4 sekcje (katalog, dane, wyniki, gotowość)
frontend/src/ui/engineering-readiness/                   — panel gotowości z FixAction
```

**4 sekcje inspektora**:
1. **Dane katalogowe** — typ, producent, norma (z catalog_ref)
2. **Dane jawne** — nazwa, impedancja, długość, napięcie
3. **Wyniki** — prądy zwarciowe, spadki napięć (z ostatniego run)
4. **Gotowość** — braki + FixAction (OPEN_MODAL, NAVIGATE_TO_ELEMENT, SELECT_CATALOG)

### FAZA 9: Eksport i dowody

**Cel**: PDF/DOCX raporty + paczki dowodowe

**Pliki do modyfikacji**:
```
frontend/src/ui/results-inspector/ResultsExport.tsx — podłączyć export endpoints
frontend/src/proof-inspector/ProofInspectorPage.tsx — zasilanie z GET /proof/pack
```

**Endpointy eksportu** (GOTOWE na backendzie):
```
GET /projects/{id}/analysis-runs/{id}/export/pdf
GET /projects/{id}/analysis-runs/{id}/export/docx
GET /power-flow-runs/{id}/export/json
GET /power-flow-runs/{id}/export/proof/json
GET /power-flow-runs/{id}/export/proof/latex
GET /power-flow-runs/{id}/export/proof/pdf
```

### FAZA 10: Testy E2E + determinizm

**Cel**: Pełny test od GPZ do raportu + weryfikacja determinizmu

**Testy**:
```
frontend/e2e/full-flow-sc.spec.ts             — zwarcie 3F: GPZ → magistrala → oblicz → wynik
frontend/e2e/full-flow-lf.spec.ts             — rozpływ: GPZ → stacja → obciążenie → oblicz
frontend/e2e/full-flow-ring.spec.ts           — pierścień: GPZ → 3 odcinki → ring → NOP → oblicz
frontend/e2e/catalog-auto-binding.spec.ts     — automatyczne wiązanie katalogowe
frontend/e2e/determinism-sld.spec.ts          — ten sam snapshot → identyczny SLD
```

---

## §7. TOPOLOGIE SIECI SN — CO SYSTEM MUSI OBSŁUŻYĆ

### 7.1 Sieć promieniowa (najczęstsza)
```
[GPZ] ──kabel── [S1] ──kabel── [S2] ──kabel── [S3]
                  │              │              │
                 TR              TR             TR
                  │              │              │
                [nN]           [nN]           [nN]
```

### 7.2 Sieć z odgałęzieniami
```
[GPZ] ──kabel── [S1] ──kabel── [S2] ──kabel── [S3]
                  │
                kabel
                  │
                [S4] (odgałęzienie)
```

### 7.3 Sieć pierścieniowa (z NOP)
```
[GPZ] ──kabel── [S1] ──kabel── [S2] ──kabel── [S3]
  │                                              │
  └────────── kabel_ring (NOP=open) ─────────────┘
```

### 7.4 Sieć z OZE
```
[GPZ] ──kabel── [S1] ──kabel── [S2]
                  │
                 TR SN/nN
                  │
                [nN] ── PV 50kW
                     ── BESS 30kW
                     ── Obciążenie 200kW
```

### 7.5 Sieć wieloodejściowa (rozdzielnica GPZ)
```
              [GPZ]
         ┌──────┼──────┐
      odejście1  odejście2  odejście3
         │        │        │
       [S1]     [S4]     [S7]
         │        │        │
       [S2]     [S5]     [S8]
         │        │        │
       [S3]     [S6]     [S9]
```

---

## §8. GOTOWOŚĆ DO OBLICZEŃ (ELIGIBILITY)

### 8.1 Wymagania minimalne

| Warunek | Kod | Solver | Opis |
|---|---|---|---|
| Węzeł SLACK (GPZ) | E-D01 | SC + LF | Co najmniej 1 źródło |
| Parametry impedancji | SI-001 | SC + LF | Odcinki z catalog_ref lub override |
| Catalog_ref resolves | SI-003 | SC + LF | Typ istnieje w katalogu |
| Spójny graf | SI-010 | SC + LF | Wszystkie szyny połączone |
| Obciążenie PQ | LF-001 | LF | Przynajmniej 1 obciążenie (Power Flow) |

### 8.2 Profil gotowości (ReadinessProfile)

```
CATALOGS    → czy wszystkie elementy mają typy katalogowe?
TOPOLOGY    → czy graf jest spójny? Czy GPZ istnieje?
SOURCES     → czy jest źródło? Czy Sk3 > 0?
STATIONS    → czy stacje mają pola? Czy TR są kompletne?
LOADS       → czy obciążenia mają P, Q?
PROTECTION  → czy zabezpieczenia mają nastawy? (opcjonalne)
```

Każdy obszar ma status: `COMPLETE | INCOMPLETE | BLOCKER`
Każdy `INCOMPLETE` ma `FixAction` prowadzący do dialogu naprawy.

---

## §9. NIEZMIENNIKI ARCHITEKTONICZNE (BEZWZGLĘDNE)

1. **Snapshot = jedyne źródło prawdy** — UI nie trzyma kopii topologii
2. **Operacja domenowa = jedyny sposób mutacji** — brak bezpośredniej edycji modelu
3. **SLD = deterministyczna funkcja snapshot** — `render(S) = render(S)` zawsze
4. **Solver = jedyne miejsce fizyki** — UI, kreator, inspektor NIE liczą
5. **Katalog = niemutowalny** — typy z katalogu nie zmieniają się w runtime
6. **Result API = zamrożone** — `ShortCircuitResult`, `PowerFlowResult` nie zmieniają schematu
7. **Brak PCC/BoundaryNode w NetworkModel** — interpretacja, nie fizyka
8. **Etykiety polskie** — zgodne ze słownikiem kanonicznym §6 SYSTEM_SPEC
9. **Brak nazw kodowych** — P7, P11, P14 itp. NIGDY w UI
10. **Determinizm** — ten sam input → identyczny output (SHA-256 stabilny)

---

## §10. ZABRONIONE AKCJE (BEZWZGLĘDNE)

| Zakazane | Dlaczego | Alternatywa |
|---|---|---|
| Fizyka w UI | NOT-A-SOLVER rule | Wyświetlaj wyniki z solvera |
| Draft graph w SLD | Snapshot = prawda | Derywuj symbole ze snapshot |
| Lokalna prawda w kreatorze | Single Model rule | Emituj operacje domenowe |
| Math.random/Date.now w pipeline | Determinism rule | crypto.randomUUID() raz |
| Modyfikacja Result API | Frozen API rule | Wersja major bump |
| PCC w NetworkModel | BoundaryNode prohibition | Analiza/interpretacja |
| Codenames w UI | Codename prohibition | Polskie etykiety |
| useDemo={true} w produkcji | Demo mode | Dane z backendu |
| Hardcoded empty arrays | Dead data | Dane ze snapshotStore |

---

## §11. SCENARIUSZE TESTOWE (ZŁOTE ŚCIEŻKI)

### Test 1: Minimalna sieć zwarciowa
```
1. Utwórz projekt
2. Utwórz przypadek (ShortCircuitCase)
3. add_grid_source_sn (GPZ, 15kV, Sk3=250MVA)
4. continue_trunk_segment_sn (kabel 300m, YAKXS_3x120)
5. Sprawdź eligibility → eligible=true
6. POST /runs/short-circuit
7. Wynik: Ik3 na szynie końcowej
```

### Test 2: Sieć z transformatorem i obciążeniem (power flow)
```
1. Utwórz projekt + przypadek (PowerFlowCase)
2. add_grid_source_sn (GPZ)
3. continue_trunk_segment_sn × 2
4. insert_station_on_segment_sn (stacja B, TR ONAN_630)
5. add_load_nn (bus_nn, P=400kW, Q=120kvar)
6. POST /runs/power-flow
7. Wynik: V, theta, P, Q na każdej szynie; straty
```

### Test 3: Sieć pierścieniowa z NOP
```
1. Jak test 2
2. + connect_secondary_ring_sn
3. + set_normal_open_point
4. POST /runs/short-circuit
5. Wynik: Ik3 na każdej szynie pierścienia
```

### Test 4: Sieć z OZE
```
1. Jak test 2
2. + add_pv_inverter_nn (50kW)
3. + add_bess_inverter_nn (30kW)
4. POST /runs/power-flow
5. Wynik: rozpływ z generacją rozproszoną
```

### Test 5: Automatyczne wiązanie katalogowe
```
1. Utwórz odcinek BEZ catalog_ref
2. Eligibility → BLOCKER SI-001
3. Automatycznie przypisz YAKXS_3x120
4. Eligibility → eligible=true
5. Oblicz → sukces
```

---

## §12. REFERENCJE DO ISTNIEJĄCYCH DOKUMENTÓW

| Dokument | Rola w tym planie |
|---|---|
| `UI_V3_SYSTEM_SPEC_CANONICAL.md` | Architektura warstw, niezmienniki |
| `UI_V3_PR_ROADMAP.md` | Kolejność PR (8 kroków) |
| `UI_V3_AUDIT_REPORT.md` | 18 rozbieżności K1-K8, W1-W10 |
| `UI_V3_INVARIANTS_OSD_30_PLUS.md` | 40+ testowalnych niezmienników |
| `UI_V3_STATE_MODEL_CANONICAL.md` | Model stanu runtime |
| `UI_V3_SLD_ARCH_CANONICAL.md` | Architektura pipeline SLD |
| `UI_V3_WORKFLOWS_SN_GPZ_CANONICAL.md` | Przepływy budowy sieci SN |
| `KONTRAKT_OPERACJI_ENM_OP.md` | Format koperty operacji domenowych |
| `MACIERZ_OKIEN_DIALOGOWYCH_I_AKCJI.md` | Macierz dialogów i akcji |
| `docs/spec/SPEC_CHAPTER_06_SOLVER_CONTRACTS_AND_MAPPING.md` | Kontrakty solverów |
| `docs/spec/SPEC_CHAPTER_08_TYPE_VS_INSTANCE_AND_CATALOGS.md` | System katalogowy |

---

## §13. SEKWENCJA WDROŻENIA (KOLEJNOŚĆ OBLIGATORYJNA)

```
FAZA 0: Infrastruktura API (client.ts, domainOpsClient.ts)
  ↓
FAZA 1: Projekty + przypadki (CRUD, aktywacja)
  ↓
FAZA 2: Snapshot Store (jedyne źródło prawdy)
  ↓
FAZA 3: Drzewo topologii (TreeNode z snapshot)
  ├→ FAZA 4: SLD z danych (usunąć demo)
  └→ FAZA 5: Kreator jako emiter operacji
       ↓
  FAZA 6: Obliczenia (eligibility → solver → results)
       ↓
  FAZA 7: Wyniki + nakładki SLD
       ↓
  FAZA 8: Inspektor + FixActions
       ↓
  FAZA 9: Eksport (PDF, DOCX, Proof)
       ↓
  FAZA 10: Testy E2E + determinizm
```

Fazy 3-5 mogą być równoległe (niezależne). Faza 6 wymaga 2+5. Faza 7 wymaga 6.

---

*Dokument wiążący. Kolejność faz jest obligatoryjna (z wyjątkiem faz równoległych 3-5). Każda faza zamyka się testem weryfikacyjnym przed przejściem do następnej.*
