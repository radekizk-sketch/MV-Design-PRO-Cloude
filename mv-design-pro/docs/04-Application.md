# Application Layer — Orkiestracja i Workflow

## 1. Lokalizacja

```
backend/src/application/
├── network_wizard/
│   ├── service.py              # NetworkWizardService
│   ├── dtos.py                 # DTO (payloads, inputs)
│   ├── errors.py               # NotFound, Conflict, ValidationFailed
│   ├── importers/              # JSON/CSV importers
│   └── exporters/              # JSON exporter
│
├── analysis_run/
│   └── service.py              # AnalysisRunService
│
└── sld/
    ├── layout.py               # Auto-layout SLD
    └── overlay.py              # Result overlay builder
```

## 2. Zasady Warstwy Application

### 2.1 Odpowiedzialność

- **Orkiestracja** - koordynacja operacji między warstwami
- **Workflow** - sekwencje operacji biznesowych
- **CRUD** - tworzenie, odczyt, aktualizacja, usuwanie encji
- **Import/Export** - wymiana danych z zewnętrznymi systemami
- **Walidacja biznesowa** - sprawdzenie kompletności danych

### 2.2 Zakazy

- **Brak obliczeń fizycznych** - delegowane do solverów
- **Brak bezpośredniego SQL** - przez UnitOfWork/Repositories
- **Brak logiki HTTP** - to należy do API layer

## 3. NetworkWizardService

### 3.1 Rola

`NetworkWizardService` to główny serwis orkiestracyjny dla zarządzania siecią elektroenergetyczną.

### 3.2 Operacje CRUD

#### Projekty
```python
create_project(name, description) -> Project
get_project(project_id) -> Project
list_projects() -> list[Project]
update_project(project_id, patch) -> Project
delete_project(project_id) -> None
```

#### Węzły
```python
add_node(project_id, payload) -> dict
update_node(project_id, node_id, patch) -> dict
remove_node(project_id, node_id) -> None
```

#### Gałęzie
```python
add_branch(project_id, payload) -> dict
update_branch(project_id, branch_id, patch) -> dict
remove_branch(project_id, branch_id) -> None
```

#### Sources (Źródła)
```python
add_source(project_id, payload) -> dict
update_source(project_id, source_id, patch) -> dict
remove_source(project_id, source_id) -> None
get_sources(project_id) -> list[SourcePayload]
set_sources(project_id, sources) -> None
```

#### Loads (Obciążenia)
```python
add_load(project_id, payload) -> dict
update_load(project_id, load_id, patch) -> dict
remove_load(project_id, load_id) -> None
list_loads(project_id) -> list[LoadPayload]
```

#### Cases (Scenariusze)
```python
create_operating_case(project_id, name, payload) -> OperatingCase
update_operating_case(project_id, case_id, patch) -> OperatingCase
list_operating_cases(project_id) -> list[OperatingCase]
clone_operating_case(project_id, case_id, new_name) -> OperatingCase
create_study_case(project_id, name, payload) -> StudyCase
list_study_cases(project_id) -> list[StudyCase]
```

#### Konfiguracja (Application-Layer Settings)
```python
set_pcc(project_id, node_id) -> None
get_pcc(project_id) -> UUID | None
set_grounding(project_id, payload) -> None
get_grounding(project_id) -> GroundingPayload
set_limits(project_id, payload) -> None
get_limits(project_id) -> LimitsPayload
```

> **IMPORTANT (PowerFactory Alignment):** `set_pcc()` and `get_pcc()` manage a user **hint**
> stored in application/project settings. PCC (punkt wspólnego przyłączenia) is **NOT**
> stored in NetworkModel/NetworkGraph. The actual PCC identification is performed by
> BoundaryIdentifier in the analysis layer, which may use this hint as input.
> See SYSTEM_SPEC.md Section 18.3.4.

### 3.3 Walidacja

```python
validate_network(project_id, case_id=None) -> ValidationReport
```

Sprawdza:
- Istnienie węzłów i gałęzi
- Poprawność PCC hint (czy wskazany węzeł istnieje w projekcie)
- Kompletność sources
- Kompletność loads
- Poprawność parametrów gałęzi
- Istnienie węzła SLACK

### 3.4 Budowanie Modelu

```python
build_network_graph(project_id, case_id=None) -> NetworkGraph
build_power_flow_input(project_id, case_id, options) -> PowerFlowInput
build_short_circuit_input(project_id, case_id, fault_spec, options) -> ShortCircuitInput
```

Metody te:
1. Walidują sieć
2. Pobierają dane z persystencji
3. Tworzą obiekty core (NetworkGraph)
4. Stosują overlay specs (switching states, limits)

### 3.5 Import/Export

#### Export
```python
export_network(project_id) -> dict  # JSON payload
```

#### Import
```python
import_network(project_id, payload, mode="merge") -> ImportReport
import_nodes_branches_from_csv(project_id, nodes_csv, branches_csv, mode) -> ImportReport
```

**Tryby importu:**
- `merge` - łączy z istniejącymi danymi
- `replace` - zastępuje wszystkie dane

### 3.6 SLD

```python
create_sld(project_id, name, mode="auto") -> UUID
auto_layout_sld(project_id, diagram_id) -> dict
bind_sld(project_id, diagram_id) -> dict
export_sld(project_id, diagram_id) -> dict
import_sld(project_id, payload) -> UUID
```

## 4. AnalysisRunService

### 4.1 Rola

Orkiestracja tworzenia i wykonywania analiz (Power Flow, Short Circuit).

### 4.2 Tworzenie Runów

```python
create_power_flow_run(project_id, operating_case_id, options) -> AnalysisRun
create_short_circuit_run(project_id, operating_case_id, fault_spec, options) -> AnalysisRun
```

**Determinizm:** Jeśli run z tym samym `input_hash` już istnieje, zwracany jest istniejący.

### 4.3 Wykonywanie

```python
execute_run(run_id) -> AnalysisRun
```

Logika:
1. Sprawdź status (nie wykonuj jeśli już RUNNING/FINISHED/FAILED)
2. Zwaliduj dane wejściowe
3. Ustaw status RUNNING
4. Wywołaj odpowiedni solver
5. Zapisz wyniki
6. Ustaw status FINISHED lub FAILED

### 4.4 Odczyt Wyników

```python
get_run(run_id) -> AnalysisRun
list_runs(project_id, filters) -> list[AnalysisRun]
get_results(run_id) -> list[dict]
get_sld_overlay_for_run(project_id, diagram_id, run_id) -> dict
```

## 5. DTO (Data Transfer Objects)

### 5.1 Lokalizacja

`application/network_wizard/dtos.py`

### 5.2 Kluczowe DTO

```python
@dataclass
class NodePayload:
    name: str
    node_type: str
    base_kv: float
    attrs: dict = field(default_factory=dict)
    id: UUID | None = None

@dataclass
class BranchPayload:
    name: str
    branch_type: str
    from_node_id: UUID
    to_node_id: UUID
    in_service: bool = True
    params: dict = field(default_factory=dict)
    id: UUID | None = None

@dataclass
class SourcePayload:
    node_id: UUID
    source_type: str
    name: str = ""
    payload: dict = field(default_factory=dict)
    in_service: bool = True
    id: UUID | None = None

@dataclass
class LoadPayload:
    node_id: UUID
    name: str = ""
    payload: dict = field(default_factory=dict)
    in_service: bool = True
    id: UUID | None = None

@dataclass
class ShortCircuitInput:
    graph: NetworkGraph
    base_mva: float
    pcc_node_id: str  # Application-layer hint, NOT from NetworkGraph
    sources: list[dict]
    loads: list[dict]
    grounding: dict
    limits: dict
    fault_spec: dict
    options: dict
```

> **Note:** `pcc_node_id` in ShortCircuitInput is an application-layer parameter
> (user hint from project settings), NOT a field from NetworkGraph.
> NetworkGraph does NOT contain PCC - see SYSTEM_SPEC.md Section 18.3.4.

## 6. Błędy

### 6.1 Lokalizacja

`application/network_wizard/errors.py`

### 6.2 Typy Błędów

```python
class NotFound(Exception):
    """Zasób nie znaleziony"""
    pass

class Conflict(Exception):
    """Konflikt operacji (np. usuwanie węzła z gałęziami)"""
    pass

class ValidationFailed(Exception):
    """Walidacja nie powiodła się"""
    def __init__(self, report: ValidationReport):
        self.report = report
```

## 7. Workflow - Przykłady

### 7.1 Tworzenie Sieci

```python
# 1. Utwórz projekt
project = service.create_project("Sieć SN Centrum")

# 2. Dodaj węzły
slack = service.add_node(project.id, NodePayload(
    name="GPZ",
    node_type="SLACK",
    base_kv=110.0,
    attrs={"voltage_magnitude_pu": 1.0, "voltage_angle_rad": 0.0}
))

# 3. Dodaj gałęzie
line = service.add_branch(project.id, BranchPayload(
    name="Linia 110kV",
    branch_type="LINE",
    from_node_id=slack["id"],
    to_node_id=pq["id"],
    params={"r_ohm_per_km": 0.05, "x_ohm_per_km": 0.4, "length_km": 50}
))

# 4. Ustaw PCC hint (application-layer, NOT in NetworkModel)
service.set_pcc(project.id, slack["id"])  # Stores hint in project settings

# 5. Dodaj source
service.add_source(project.id, SourcePayload(
    node_id=slack["id"],
    source_type="GRID",
    payload={"skss_mva": 5000}
))

# 6. Waliduj
report = service.validate_network(project.id)
```

### 7.2 Wykonanie Analizy

```python
# 1. Utwórz operating case
case = service.create_operating_case(project.id, "Przypadek bazowy", {
    "base_mva": 100.0
})

# 2. Utwórz run
run = analysis_service.create_power_flow_run(
    project.id,
    case.id,
    options={"tolerance": 1e-8}
)

# 3. Wykonaj
run = analysis_service.execute_run(run.id)

# 4. Pobierz wyniki
results = analysis_service.get_results(run.id)
```

## 8. Granice Odpowiedzialności

| Funkcjonalność           | Application (TAK)    | Application (NIE)       |
|--------------------------|----------------------|------------------------|
| CRUD encji               | ✓                    |                        |
| Walidacja biznesowa      | ✓                    |                        |
| Orkiestracja workflow    | ✓                    |                        |
| Import/Export            | ✓                    |                        |
| Budowanie NetworkGraph   | ✓                    |                        |
| Obliczenia fizyczne      |                      | ✗ (Solvers)            |
| SQL/ORM                  |                      | ✗ (Infrastructure)     |
| HTTP/REST                |                      | ✗ (API)                |
| Logika OSD               |                      | ✗ (nie zaimplementowane)|

## 9. Powiązane Dokumenty

- [01-Core.md](./01-Core.md) - model budowany przez application
- [02-Solvers.md](./02-Solvers.md) - solvery wywoływane przez application
- [03-Analyses.md](./03-Analyses.md) - logika analityczna
- [ADR-002](./adr/ADR-002-network-wizard-service.md) - uzasadnienie architektury
