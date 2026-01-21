# Solvers Layer — Obliczenia Fizyczne

## 1. Lokalizacja

```
backend/src/
├── network_model/solvers/              # IEC 60909 (ZAMROŻONY)
│   ├── __init__.py
│   ├── short_circuit_iec60909.py       # ShortCircuitIEC60909Solver
│   ├── short_circuit_core.py           # Funkcje pomocnicze
│   └── short_circuit_contributions.py  # Wkłady źródeł
│
└── analysis/power_flow/                # Power Flow (w analysis/)
    ├── __init__.py
    ├── solver.py                       # PowerFlowSolver
    ├── types.py                        # PowerFlowInput, specs
    ├── result.py                       # PowerFlowResult
    └── _internal.py                    # Newton-Raphson
```

## 2. Zasady Warstwy Solvers

### 2.1 Odpowiedzialność

- **Obliczenia fizyczne** - rozpływ mocy, zwarcia
- **Implementacja norm** - IEC 60909
- **Determinizm** - te same dane wejściowe → te same wyniki
- **White-box trace** - ślad obliczeń do audytu

### 2.2 Zakazy

- **Brak regulacji OSD** - solver nie wie o kodeksach
- **Brak persystencji** - solver nie zna bazy danych
- **Brak UI/API** - solver nie wie o requestach HTTP
- **Brak case'ów biznesowych** - solver nie wie o "scenariuszach"

### 2.3 Granica: Solver ≠ Analiza

| Solver (TAK)                    | Analiza (NIE w solverze)        |
|---------------------------------|---------------------------------|
| Obliczenie Ik'' [A]             | Czy Ik'' przekracza limit?      |
| Obliczenie U [pu]               | Czy U jest za niskie?           |
| Newton-Raphson convergence      | Czy sieć jest "bezpieczna"?     |
| Y-bus, Z-bus                    | Rekomendacje dla operatora      |

## 3. IEC 60909 Short-Circuit Solver (ZAMROŻONY)

### 3.1 Status: ZAMROŻONY

Solver IEC 60909 jest **zamrożony** i stanowi **wzorzec poprawnej separacji**.
Nie wolno modyfikować bez jawnego ADR.

### 3.2 Lokalizacja

`backend/src/network_model/solvers/short_circuit_iec60909.py`

### 3.3 Klasa ShortCircuitIEC60909Solver

```python
class ShortCircuitIEC60909Solver:
    @staticmethod
    def compute_3ph_short_circuit(
        graph: NetworkGraph,
        fault_node_id: str,
        c_factor: float,
        tk_s: float,
        tb_s: float = 0.1,
        include_branch_contributions: bool = False,
    ) -> ShortCircuitResult: ...

    @staticmethod
    def compute_1ph_short_circuit(...) -> ShortCircuitResult: ...

    @staticmethod
    def compute_2ph_short_circuit(...) -> ShortCircuitResult: ...

    @staticmethod
    def compute_2ph_ground_short_circuit(...) -> ShortCircuitResult: ...
```

### 3.4 Typy Zwarć

```python
class ShortCircuitType(Enum):
    THREE_PHASE = "3F"           # Trójfazowe
    SINGLE_PHASE_GROUND = "1F"   # Jednofazowe doziemne
    TWO_PHASE = "2F"             # Dwufazowe
    TWO_PHASE_GROUND = "2F+G"    # Dwufazowe doziemne
```

### 3.5 Wynik: ShortCircuitResult

```python
@dataclass(frozen=True)
class ShortCircuitResult:
    short_circuit_type: ShortCircuitType
    fault_node_id: str
    c_factor: float
    un_v: float                  # Napięcie znamionowe [V]
    zkk_ohm: complex             # Impedancja zastępcza [Ω]
    rx_ratio: float              # R/X
    kappa: float                 # Współczynnik udaru
    tk_s: float                  # Czas zwarcia [s]
    tb_s: float                  # Czas do Ib [s]
    ikss_a: float                # Prąd początkowy Ik'' [A]
    ip_a: float                  # Prąd udarowy Ip [A]
    ith_a: float                 # Prąd cieplny Ith [A]
    ib_a: float                  # Prąd Ib [A]
    sk_mva: float                # Moc zwarciowa [MVA]
    ik_thevenin_a: float         # Wkład sieci
    ik_inverters_a: float        # Wkład falowników
    ik_total_a: float            # Całkowity prąd
    contributions: list[...]      # Wkłady źródeł
    branch_contributions: list[...] | None
    white_box_trace: list[dict]  # Ślad obliczeń
```

### 3.6 Formuły IEC 60909

```
Ik'' = (c * Un) / (√3 * |Zk|)      # 3F
Ik'' = (c * Un) / |Z1 + Z2 + Z0|   # 1F
κ = 1.02 + 0.98 * e^(-3 * R/X)     # Współczynnik udaru
Ip = κ * √2 * Ik''                  # Prąd udarowy
Ith = Ik'' * √tk                    # Prąd cieplny
Sk'' = √3 * Un * Ik''               # Moc zwarciowa
```

### 3.7 White-Box Trace

Każdy krok obliczeń jest rejestrowany:

```python
white_box_trace = [
    {
        "key": "Zk",
        "title": "Impedancja zastępcza w punkcie zwarcia",
        "formula_latex": "Z_k = Z_1",
        "inputs": {"z1_ohm": ..., "fault_node_id": ...},
        "substitution": "0.5+j2.0",
        "result": {"z_equiv_ohm": ...}
    },
    {
        "key": "Ikss",
        "title": "Prąd zwarciowy początkowy symetryczny",
        "formula_latex": "I_{k}'' = (c \\cdot U_n \\cdot k_U) / |Z_k|",
        "inputs": {...},
        "result": {"ikss_a": 15234.5}
    },
    ...
]
```

## 4. Power Flow Solver

### 4.1 Lokalizacja

`backend/src/analysis/power_flow/solver.py`

**Uwaga:** Power Flow jest w `analysis/` ze względu na overlay specs (ADR-001).
Zawiera elementy interpretacyjne (violations, limits) które wykraczają poza czysty solver.

### 4.2 Klasa PowerFlowSolver

```python
class PowerFlowSolver:
    def solve(self, pf_input: PowerFlowInput) -> PowerFlowResult: ...
```

### 4.3 Wejście: PowerFlowInput

```python
@dataclass
class PowerFlowInput:
    graph: NetworkGraph
    base_mva: float
    slack: SlackSpec
    pq: list[PQSpec]
    pv: list[PVSpec] = []
    shunts: list[ShuntSpec] = []
    taps: list[TransformerTapSpec] = []
    bus_limits: list[BusVoltageLimitSpec] = []      # Overlay
    branch_limits: list[BranchLimitSpec] = []       # Overlay
    options: PowerFlowOptions = ...
```

### 4.4 Specyfikacje (Overlay Pattern)

```python
@dataclass
class SlackSpec:
    node_id: str
    u_pu: float = 1.0
    angle_rad: float = 0.0

@dataclass
class PQSpec:
    node_id: str
    p_mw: float
    q_mvar: float

@dataclass
class PVSpec:
    node_id: str
    p_mw: float
    u_pu: float
    q_min_mvar: float
    q_max_mvar: float
```

### 4.5 Wynik: PowerFlowResult

```python
@dataclass
class PowerFlowResult:
    converged: bool
    iterations: int
    tolerance: float
    max_mismatch_pu: float
    base_mva: float
    slack_node_id: str

    # Wyniki w pu
    node_voltage_pu: dict[str, complex]
    node_u_mag_pu: dict[str, float]
    node_angle_rad: dict[str, float]
    branch_current_pu: dict[str, complex]
    branch_s_from_pu: dict[str, complex]
    branch_s_to_pu: dict[str, complex]

    # Wyniki w jednostkach SI
    node_voltage_kv: dict[str, float]
    branch_current_ka: dict[str, float]
    branch_s_from_mva: dict[str, complex]
    branch_s_to_mva: dict[str, complex]

    # Violations (interpretacja - overlay)
    violations: list[dict]
    pv_to_pq_switches: list[dict]

    # Balance
    losses_total_pu: complex
    slack_power_pu: complex

    # White-box
    white_box_trace: dict
```

### 4.6 Algorytm Newton-Raphson

1. Budowa Y-bus z grafu
2. Identyfikacja wysp (slack island)
3. Inicjalizacja wektora napięć
4. Iteracje NR z damping
5. Sprawdzenie zbieżności
6. Obliczenie przepływów w gałęziach
7. Sprawdzenie violations (overlay)

## 5. Różnice: IEC 60909 vs Power Flow

| Aspekt              | IEC 60909                    | Power Flow                    |
|---------------------|------------------------------|-------------------------------|
| Lokalizacja         | `network_model/solvers/`     | `analysis/power_flow/`        |
| Status              | ZAMROŻONY                    | Aktywny rozwój                |
| Violations/Limits   | NIE                          | TAK (overlay)                 |
| Overlay specs       | NIE                          | TAK (PV, shunts, taps)        |
| White-box           | TAK (lista kroków)           | TAK (dict złożony)            |
| Determinizm         | TAK                          | TAK (przy tych samych opcjach)|

## 6. Dodawanie Nowego Solvera

Jeśli trzeba dodać nowy solver:

1. **Lokalizacja:** `network_model/solvers/` dla czystych obliczeń fizycznych
2. **Input DTO:** Osobna klasa w `application/network_wizard/dtos.py`
3. **Wynik:** Frozen dataclass z `to_dict()`
4. **White-box:** Obowiązkowy ślad obliczeń
5. **Testy:** Pokrycie wzorcowymi przypadkami
6. **ADR:** Uzasadnienie decyzji architektonicznych

## 7. Powiązane Dokumenty

- [01-Core.md](./01-Core.md) - model sieci używany przez solvery
- [03-Analyses.md](./03-Analyses.md) - interpretacja wyników
- [ADR-001](./adr/ADR-001-power-flow-v2-overlay-vs-core.md) - overlay vs core
- [ADR-005](./adr/ADR-005-solver-input-dto-contracts.md) - kontrakty DTO
