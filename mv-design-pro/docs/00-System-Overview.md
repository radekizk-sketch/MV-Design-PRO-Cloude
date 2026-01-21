# MV-DESIGN-PRO — Przegląd Systemu

## 1. Cel Systemu

MV-DESIGN-PRO to system analizy i projektowania sieci średniego napięcia (SN) dla energetyki, z pełną integracją OZE, metodyką PCC (punkt wspólnego przyłączenia), budową schematów zastępczych i zgodnością z NC RfG oraz polskimi wymaganiami kodeksowymi.

## 2. Architektura Warstwowa

System składa się z czterech głównych warstw:

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│  NetworkWizardService, AnalysisRunService, SLD Layout           │
│  Orkiestracja, workflow, CRUD, import/export                    │
├─────────────────────────────────────────────────────────────────┤
│                      ANALYSIS LAYER                             │
│  Power Flow Solver (Newton-Raphson), Interpretacja wyników      │
│  Violations, Limits checking                                    │
├─────────────────────────────────────────────────────────────────┤
│                      SOLVERS LAYER                              │
│  IEC 60909 Short-Circuit (ZAMROŻONY, WZORZEC)                   │
│  Czyste obliczenia fizyczne, deterministyczne                   │
├─────────────────────────────────────────────────────────────────┤
│                      CORE LAYER                                 │
│  NetworkGraph, Node, Branch, Transformer, InverterSource        │
│  Model sieci + fakty fizyczne                                   │
├─────────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                               │
│  Project, Network, OperatingCase, StudyCase, AnalysisRun        │
│  Encje biznesowe, ValidationReport                              │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  Repositories, UnitOfWork, DB, Persistence                      │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Struktura Katalogów

```
mv-design-pro/
├── backend/src/
│   ├── network_model/              # CORE - model sieci elektroenergetycznej
│   │   ├── core/                   # Node, Branch, NetworkGraph, InverterSource, Ybus
│   │   ├── solvers/                # IEC 60909 (short_circuit_iec60909.py) - ZAMROŻONY
│   │   ├── validation/             # Walidacja modelu sieci
│   │   ├── reporting/              # Generowanie raportów PDF/DOCX
│   │   └── whitebox/               # WhiteBoxTracer - ślad obliczeń
│   │
│   ├── analysis/                   # ANALYSIS - solvery z interpretacją
│   │   └── power_flow/             # Power Flow Solver (Newton-Raphson)
│   │       ├── solver.py           # PowerFlowSolver
│   │       ├── types.py            # PowerFlowInput, PQSpec, PVSpec, etc.
│   │       ├── result.py           # PowerFlowResult
│   │       └── _internal.py        # Funkcje wewnętrzne NR
│   │
│   ├── domain/                     # DOMAIN - encje biznesowe
│   │   ├── models.py               # Project, Network, OperatingCase, StudyCase
│   │   ├── validation.py           # ValidationReport, ValidationIssue
│   │   ├── analysis_run.py         # AnalysisRun
│   │   ├── units.py                # UnitSystem, BaseQuantities
│   │   ├── sources.py              # Definicje źródeł
│   │   ├── limits.py               # Limity operacyjne
│   │   └── sld.py                  # SldDiagram, SldNodeSymbol
│   │
│   ├── application/                # APPLICATION - orkiestracja
│   │   ├── network_wizard/         # NetworkWizardService - CRUD, walidacja, import/export
│   │   ├── analysis_run/           # AnalysisRunService - wykonywanie analiz
│   │   └── sld/                    # Layout schematów SLD
│   │
│   ├── api/                        # API - FastAPI endpoints
│   │   ├── main.py                 # Główna aplikacja FastAPI
│   │   └── analysis_runs.py        # Endpointy dla AnalysisRun
│   │
│   ├── infrastructure/             # INFRASTRUCTURE - persystencja
│   │   ├── persistence/            # Repozytoria, UnitOfWork, DB
│   │   └── migrations/             # Migracje bazy danych
│   │
│   ├── solvers/                    # PLACEHOLDER - puste (do uporządkowania)
│   │   ├── power_flow/             # (puste)
│   │   └── short_circuit/          # (puste)
│   │
│   ├── compliance/                 # PLACEHOLDER - zgodność regulacyjna
│   └── whitebox/                   # PLACEHOLDER - whitebox utilities
│
├── docs/
│   ├── adr/                        # Architecture Decision Records
│   └── *.md                        # Dokumentacja systemowa
│
└── frontend/                       # Frontend (poza zakresem tego dokumentu)
```

## 4. Relacje między Warstwami

### 4.1 Przepływ Danych

```
User/API → Application → Domain → Core → Solvers
                ↑           ↑        ↑
                └── Infrastructure ──┘
```

### 4.2 Zasady Zależności

| Warstwa        | Może zależeć od              | NIE może zależeć od       |
|----------------|------------------------------|---------------------------|
| Application    | Domain, Core, Analysis       | Infrastructure (direct)   |
| Analysis       | Core                         | Domain, Application       |
| Solvers (Core) | Core (wewnętrzne)            | Domain, Application, API  |
| Domain         | (brak zależności)            | Core, Solvers, API        |
| Core           | (brak zależności)            | Domain, Solvers, API      |

## 5. Kluczowe Komponenty

### 5.1 Core Layer (`network_model/core/`)

- **NetworkGraph** - graf sieci elektroenergetycznej (węzły + gałęzie)
- **Node** - węzeł sieci (SLACK, PQ, PV)
- **Branch** - gałąź sieci (LineBranch, TransformerBranch)
- **InverterSource** - źródło falownikowe OZE

### 5.2 Solvers Layer (`network_model/solvers/`)

- **ShortCircuitIEC60909Solver** - obliczenia zwarciowe wg IEC 60909 (ZAMROŻONY)
- **ShortCircuitResult** - wynik obliczeń zwarciowych

### 5.3 Analysis Layer (`analysis/power_flow/`)

- **PowerFlowSolver** - rozpływ mocy metodą Newtona-Raphsona
- **PowerFlowResult** - wynik rozpływu z violations/limits

### 5.4 Application Layer (`application/`)

- **NetworkWizardService** - orkiestracja CRUD sieci, import/export
- **AnalysisRunService** - tworzenie i wykonywanie analiz

## 6. Filozofia Systemu

### 6.1 Zasady Obowiązujące

1. **CORE = model sieci + fakty fizyczne** - brak interpretacji
2. **SOLVERS = czyste obliczenia fizyczne** - deterministyczne, bez OSD
3. **ANALYSIS = interpretacja wyników** - violations, limits, ale NIE regulacje
4. **APPLICATION = orkiestracja** - workflow, bez obliczeń fizycznych

### 6.2 Zakazy

- **Brak regulacji OSD w solverach** - logika regulacyjna NIE w core/solvers
- **Brak interpretacji w core** - Node/Branch nie wiedzą o limitach
- **IEC 60909 = wzorzec** - solver zamrożony, nie modyfikować

## 7. Stan Aktualny (AS-IS)

### 7.1 Co Jest Gotowe

| Komponent                  | Status        | Uwagi                              |
|----------------------------|---------------|-------------------------------------|
| NetworkGraph, Node, Branch | Gotowe        | Core model stabilny                |
| IEC 60909 Solver           | ZAMROŻONY     | Wzorzec poprawnej separacji        |
| Power Flow Solver          | Gotowe        | W `analysis/`, nie w `solvers/`    |
| NetworkWizardService       | Gotowe        | CRUD, import/export, walidacja     |
| AnalysisRunService         | Gotowe        | Orkiestracja analiz                |
| Persistence Layer          | Gotowe        | Repositories, UnitOfWork           |

### 7.2 Znane Rozbieżności

1. **Lokalizacja Power Flow** - w `analysis/` zamiast `solvers/`
   - ADR-001 uzasadnia to overlay specs
   - Wymaga wyjaśnienia czy `violations` to solver czy analysis

2. **Puste katalogi `src/solvers/`** - placeholder do uporządkowania

3. **Granice analysis vs solver** - violations/limits w Power Flow

## 8. Powiązane Dokumenty

- [01-Core.md](./01-Core.md) - szczegóły warstwy Core
- [02-Solvers.md](./02-Solvers.md) - szczegóły warstwy Solvers
- [03-Analyses.md](./03-Analyses.md) - szczegóły warstwy Analysis
- [04-Application.md](./04-Application.md) - szczegóły warstwy Application
- [ROADMAP.md](./ROADMAP.md) - mapa drogowa do produkcji
- [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md) - checklista przed uruchomieniem

## 9. ADR (Architecture Decision Records)

- [ADR-001](./adr/ADR-001-power-flow-v2-overlay-vs-core.md) - Power Flow overlay specs
- [ADR-002](./adr/ADR-002-network-wizard-service.md) - Network Wizard jako Application Layer
- [ADR-003](./adr/ADR-003-domain-layer-boundaries.md) - Granice warstwy domenowej
- [ADR-004](./adr/ADR-004-network-import-export-contracts.md) - Kontrakty import/export
- [ADR-005](./adr/ADR-005-solver-input-dto-contracts.md) - Kontrakty DTO solverów
