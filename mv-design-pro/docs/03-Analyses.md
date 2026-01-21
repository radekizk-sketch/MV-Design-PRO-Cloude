# Analyses Layer — Interpretacja Wyników

## 1. Zakres

Warstwa Analyses odpowiada za:
- **Interpretację wyników** z solverów
- **Sprawdzanie limitów** (violations)
- **Case'y biznesowe** (scenariusze analityczne)
- **Zabezpieczenia** jako logika analityczna (nie OSD)

## 2. Lokalizacja

```
backend/src/
├── analysis/                           # Analyses layer
│   └── power_flow/                     # Power Flow (solver + interpretacja)
│       ├── solver.py                   # PowerFlowSolver
│       ├── types.py                    # Input types + limits specs
│       └── result.py                   # PowerFlowResult + violations
│
├── domain/                             # Encje analityczne
│   ├── analysis_run.py                 # AnalysisRun
│   ├── validation.py                   # ValidationReport
│   └── limits.py                       # Definicje limitów
│
└── application/analysis_run/           # Orkiestracja analiz
    └── service.py                      # AnalysisRunService
```

## 3. Zasady Warstwy Analyses

### 3.1 Odpowiedzialność

- **Interpretacja wyników fizycznych** - czy wartość przekracza limit
- **Agregacja danych** - zbieranie wyników z wielu solverów
- **Walidacja case'ów** - czy dane wejściowe są kompletne
- **Raportowanie** - formatowanie wyników dla użytkownika

### 3.2 Zakazy

- **Brak obliczeń fizycznych** - te są w solverach
- **Brak regulacji OSD** - logika operatora nie tutaj
- **Brak persystencji bezpośredniej** - przez UnitOfWork

### 3.3 Granica: Solver vs Analysis

| Aspekt               | Solver (obliczenia)       | Analysis (interpretacja)    |
|----------------------|---------------------------|-----------------------------|
| I = 500 A            | ✓ Oblicza                 |                             |
| I > I_max?           |                           | ✓ Sprawdza                  |
| U = 0.95 pu          | ✓ Oblicza                 |                             |
| "Napięcie za niskie" |                           | ✓ Interpretuje              |
| Ik'' = 15 kA         | ✓ Oblicza                 |                             |
| Dobór zabezpieczeń   |                           | ✓ (bez OSD)                 |

## 4. Violations w Power Flow

### 4.1 Struktura Violation

```python
{
    "type": "bus_voltage",       # Typ naruszenia
    "id": "node-123",           # ID elementu
    "value": 0.89,              # Zmierzona wartość
    "limit": 0.95,              # Limit
    "severity": 0.94,           # value/limit
    "direction": "under"        # "under" lub "over"
}
```

### 4.2 Typy Violations

| Typ               | Opis                              | Jednostka  |
|-------------------|-----------------------------------|------------|
| `bus_voltage`     | Napięcie węzłowe poza zakresem    | pu         |
| `branch_loading`  | Przeciążenie gałęzi (S)           | MVA        |
| `branch_current`  | Przekroczenie prądu               | kA         |

### 4.3 Źródła Limitów

Limity pochodzą z overlay specs (nie z core):

```python
@dataclass
class BusVoltageLimitSpec:
    node_id: str
    u_min_pu: float    # np. 0.95
    u_max_pu: float    # np. 1.05

@dataclass
class BranchLimitSpec:
    branch_id: str
    s_max_mva: float | None
    i_max_ka: float | None
```

Dodatkowo limity mogą pochodzić z parametrów core:
- `TransformerBranch.rated_power_mva`
- `LineBranch.rated_current_a`

## 5. Case'y Analityczne

### 5.1 AnalysisRun

```python
@dataclass(frozen=True)
class AnalysisRun:
    id: UUID
    project_id: UUID
    operating_case_id: UUID
    analysis_type: Literal["PF", "SC"]  # Power Flow lub Short Circuit
    status: Literal["CREATED", "VALIDATED", "RUNNING", "FINISHED", "FAILED"]
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    input_snapshot: dict              # Deterministyczny snapshot danych wejściowych
    input_hash: str                   # SHA256 dla cache'owania
    result_summary: dict
    trace_json: dict | list | None
    white_box_trace: list[dict] | None
    error_message: str | None
```

### 5.2 Cykl Życia AnalysisRun

```
CREATED → VALIDATED → RUNNING → FINISHED
                           ↓
                        FAILED
```

1. **CREATED** - run zarejestrowany, snapshot zapisany
2. **VALIDATED** - dane wejściowe zwalidowane
3. **RUNNING** - solver w trakcie wykonania
4. **FINISHED** - wyniki dostępne
5. **FAILED** - błąd (error_message wypełniony)

### 5.3 Determinizm (Input Hash)

Każdy AnalysisRun ma `input_hash` obliczany z kanonizowanego snapshotu:

```python
def compute_input_hash(snapshot: dict) -> str:
    canonical = canonicalize(snapshot)
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
```

Jeśli dla tego samego `(project_id, case_id, analysis_type, input_hash)` istnieje już run - zwracamy istniejący.

## 6. Typy Analiz

### 6.1 Power Flow (PF)

**Wejście:**
- NetworkGraph (z persystencji)
- Operating Case (scenariusz przełączeń)
- Overlay specs (limity, PV, shunts)

**Wyjście:**
- Napięcia węzłowe (pu, kV)
- Przepływy mocy w gałęziach
- Straty
- Violations

### 6.2 Short Circuit (SC)

**Wejście:**
- NetworkGraph
- Fault spec (lokalizacja zwarcia, typ)
- Sources (wkłady źródeł)

**Wyjście:**
- Prądy zwarciowe (Ik'', Ip, Ith)
- Moc zwarciowa
- Wkłady poszczególnych źródeł
- White-box trace

## 7. Zabezpieczenia (Protection Analysis)

### 7.1 Stan Aktualny

Logika zabezpieczeń **nie jest jeszcze zaimplementowana** jako osobna warstwa analityczna.

### 7.2 Planowana Architektura (FAZA 2)

```
ProtectionAnalysis/
├── overcurrent_check.py      # Sprawdzenie przekładników i nastawień
├── selectivity_check.py      # Analiza selektywności
└── protection_coordination.py # Koordynacja zabezpieczeń
```

**Zasada:** Protection Analysis używa wyników solverów (Ik'', I_load) do interpretacji, ale **nie implementuje logiki OSD**.

## 8. Raporty

### 8.1 Eksport Wyników

Wyniki AnalysisRun mogą być eksportowane do:
- PDF (via `network_model/reporting/`)
- DOCX (via `network_model/reporting/`)
- JSON (natywnie)

### 8.2 SLD Overlay

Wyniki analiz mogą być nałożone na schemat SLD:

```python
class ResultSldOverlayBuilder:
    def build_short_circuit_overlay(
        self,
        diagram_payload: dict,
        result_payload: dict
    ) -> dict[str, list[dict]]:
        ...
```

## 9. Granice Odpowiedzialności

| Funkcjonalność               | Analysis (TAK)      | Analysis (NIE)        |
|------------------------------|---------------------|----------------------|
| Sprawdzanie violations       | ✓                   |                      |
| Formatowanie wyników         | ✓                   |                      |
| Agregacja z wielu solverów   | ✓                   |                      |
| Walidacja danych wejściowych | ✓                   |                      |
| Obliczenia fizyczne          |                     | ✗ (Solvers)          |
| Regulacje OSD                |                     | ✗ (przyszłość)       |
| Persystencja                 |                     | ✗ (Infrastructure)   |
| API HTTP                     |                     | ✗ (API layer)        |

## 10. Gdzie Dodać Nową Analizę

1. **Nowy typ AnalysisRun** - dodaj do `domain/analysis_run.py`:
   ```python
   AnalysisType = Literal["PF", "SC", "PR"]  # PR = Protection
   ```

2. **Logika wykonania** - dodaj metodę w `AnalysisRunService`:
   ```python
   def _execute_protection(self, uow, run) -> AnalysisRun:
       ...
   ```

3. **Wynik** - dodaj dataclass w odpowiednim module

4. **Violations** - jeśli trzeba, dodaj nowe typy do `_build_violations()`

## 11. Powiązane Dokumenty

- [02-Solvers.md](./02-Solvers.md) - solvery dostarczające dane
- [04-Application.md](./04-Application.md) - orkiestracja analiz
- [ADR-001](./adr/ADR-001-power-flow-v2-overlay-vs-core.md) - overlay specs
