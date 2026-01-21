# Core Layer — Model Sieci Elektroenergetycznej

## 1. Lokalizacja

```
backend/src/network_model/core/
├── __init__.py
├── node.py          # Node, NodeType
├── branch.py        # Branch, LineBranch, TransformerBranch, BranchType
├── graph.py         # NetworkGraph
├── inverter.py      # InverterSource
└── ybus.py          # AdmittanceMatrixBuilder
```

## 2. Zasady Warstwy Core

### 2.1 Odpowiedzialność

- **Modelowanie topologii** sieci elektroenergetycznej
- **Przechowywanie parametrów fizycznych** (impedancje, napięcia, moce)
- **Analiza spójności** grafu (wyspy, komponenty)
- **Budowa macierzy admitancji** (Y-bus) dla solverów

### 2.2 Zakazy

- **Brak interpretacji** - Node nie wie czy napięcie jest "za wysokie"
- **Brak regulacji** - NetworkGraph nie wie o OSD ani kodeksach
- **Brak analiz** - Core nie wykonuje obliczeń rozpływu ani zwarć
- **Brak persystencji** - Core nie zna bazy danych

## 3. Komponenty

### 3.1 Node (`node.py`)

Reprezentacja węzła sieci elektroenergetycznej.

```python
class NodeType(Enum):
    SLACK = "SLACK"   # Węzeł bilansujący (referencyjny)
    PQ = "PQ"         # Węzeł obciążeniowy (moc P i Q zadane)
    PV = "PV"         # Węzeł generatorowy (P i |U| zadane)

@dataclass
class Node:
    id: str
    name: str
    node_type: NodeType
    voltage_level: float           # [kV] - napięcie znamionowe
    voltage_magnitude: float | None # [pu] - amplituda napięcia
    voltage_angle: float | None    # [rad] - kąt fazowy
    active_power: float | None     # [MW] - moc czynna
    reactive_power: float | None   # [MVAr] - moc bierna
```

**Walidacja wewnętrzna:**
- SLACK wymaga `voltage_magnitude` i `voltage_angle`
- PQ wymaga `active_power` i `reactive_power`
- PV wymaga `active_power` i `voltage_magnitude`

**Serializacja:**
- `to_dict()` / `from_dict()` - JSON-ready

### 3.2 Branch (`branch.py`)

Gałąź sieci - linia, kabel lub transformator.

```python
class BranchType(Enum):
    LINE = "LINE"
    CABLE = "CABLE"
    TRANSFORMER = "TRANSFORMER"

@dataclass
class Branch:
    id: str
    name: str
    branch_type: BranchType
    from_node_id: str
    to_node_id: str
    in_service: bool = True
```

#### LineBranch

Linia napowietrzna lub kabel z modelem PI.

```python
@dataclass
class LineBranch(Branch):
    r_ohm_per_km: float    # Rezystancja [Ω/km]
    x_ohm_per_km: float    # Reaktancja [Ω/km]
    b_us_per_km: float     # Susceptancja [μS/km]
    length_km: float       # Długość [km]
    rated_current_a: float # Prąd znamionowy [A]
```

**Metody obliczeniowe:**
- `get_total_impedance()` → `complex` [Ω]
- `get_series_admittance()` → `complex` [S]
- `get_shunt_admittance()` → `complex` [S]

#### TransformerBranch

Transformator dwuuzwojeniowy.

```python
@dataclass
class TransformerBranch(Branch):
    rated_power_mva: float   # Moc znamionowa [MVA]
    voltage_hv_kv: float     # Napięcie strony WN [kV]
    voltage_lv_kv: float     # Napięcie strony DN [kV]
    uk_percent: float        # Napięcie zwarciowe [%]
    pk_kw: float             # Straty zwarciowe [kW]
    i0_percent: float        # Prąd jałowy [%]
    p0_kw: float             # Straty jałowe [kW]
    vector_group: str        # Grupa połączeń (np. "Dyn11")
    tap_position: int        # Pozycja zaczepów
    tap_step_percent: float  # Krok zaczepów [%]
```

**Metody obliczeniowe (IEC 60909):**
- `get_short_circuit_impedance_pu()` → `complex`
- `get_short_circuit_impedance_ohm_lv()` → `complex`
- `get_ikss_lv_ka(c_factor)` → `float` [kA]
- `get_impedance_pu(base_mva)` → `complex`
- `get_turns_ratio()` → `float`
- `get_tap_ratio()` → `float`

### 3.3 NetworkGraph (`graph.py`)

Graf sieci elektroenergetycznej oparty na NetworkX.

```python
class NetworkGraph:
    nodes: Dict[str, Node]
    branches: Dict[str, Branch]
    inverter_sources: Dict[str, InverterSource]
    _graph: nx.MultiGraph  # Wewnętrzny graf NetworkX
```

**Operacje CRUD:**
- `add_node(node)`, `remove_node(node_id)`, `get_node(node_id)`
- `add_branch(branch)`, `remove_branch(branch_id)`, `get_branch(branch_id)`
- `add_inverter_source(source)`, `remove_inverter_source(source_id)`

**Analiza topologii:**
- `is_connected()` → `bool` - czy graf jest spójny
- `find_islands()` → `List[List[str]]` - komponenty spójności
- `get_connected_nodes(node_id)` → `List[Node]` - sąsiedzi węzła
- `get_slack_node()` → `Node` - jedyny węzeł SLACK

**Constrainty:**
- Maksymalnie 1 węzeł SLACK w sieci
- Gałąź nie może łączyć węzła samego ze sobą
- `from_node_id` i `to_node_id` muszą istnieć w `nodes`

### 3.4 InverterSource (`inverter.py`)

Źródło falownikowe OZE dla obliczeń IEC 60909.

```python
@dataclass
class InverterSource:
    id: str
    name: str
    node_id: str
    in_rated_a: float      # Prąd znamionowy [A]
    k_sc: float = 1.1      # Współczynnik zwarciowy
    contributes_negative_sequence: bool = False
    contributes_zero_sequence: bool = False
    in_service: bool = True

    @property
    def ik_sc_a(self) -> float:
        """Wkład prądowy do zwarcia: Ik = k_sc * In"""
        return self.k_sc * self.in_rated_a
```

### 3.5 AdmittanceMatrixBuilder (`ybus.py`)

Budowa macierzy admitancji nodowej (Y-bus).

```python
class AdmittanceMatrixBuilder:
    def __init__(self, graph: NetworkGraph): ...
    def build(self) -> np.ndarray: ...

    # Mapowania indeksów
    node_id_to_index: Dict[str, int]
```

## 4. Niemutowalność

### 4.1 Dataclasses

Większość klas core używa `@dataclass` z domyślną mutowalnością dla wygody operacji CRUD. Jednak:

- **Wyniki obliczeń** używają `@dataclass(frozen=True)` (np. ShortCircuitResult)
- **Encje domenowe** używają `frozen=True` (np. Project, AnalysisRun)

### 4.2 Snapshot Pattern

Dla obliczeń stosujemy wzorzec snapshot:
1. `NetworkWizardService` buduje `NetworkGraph` z persystencji
2. `NetworkGraph` jest przekazywany do solvera jako read-only snapshot
3. Solver nie modyfikuje grafu, tylko go czyta

## 5. Granice Odpowiedzialności

| Funkcjonalność           | Core (TAK)      | Core (NIE)          |
|--------------------------|-----------------|---------------------|
| Przechowywanie węzłów    | ✓               |                     |
| Przechowywanie gałęzi    | ✓               |                     |
| Analiza spójności        | ✓               |                     |
| Budowa Y-bus             | ✓               |                     |
| Serializacja JSON        | ✓               |                     |
| Walidacja parametrów     | ✓ (fizyczna)    | ✗ (biznesowa)       |
| Obliczenia rozpływu      |                 | ✗                   |
| Obliczenia zwarciowe     |                 | ✗                   |
| Sprawdzanie limitów      |                 | ✗                   |
| Logika OSD               |                 | ✗                   |

## 6. Przykłady Użycia

### 6.1 Tworzenie sieci

```python
from network_model.core import Node, NodeType, NetworkGraph
from network_model.core.branch import LineBranch, BranchType

# Tworzenie grafu
graph = NetworkGraph()

# Dodawanie węzłów
slack = Node(
    id="slack-1",
    name="GPZ Centrum",
    node_type=NodeType.SLACK,
    voltage_level=110.0,
    voltage_magnitude=1.0,
    voltage_angle=0.0
)
graph.add_node(slack)

pq = Node(
    id="pq-1",
    name="Odbiorca A",
    node_type=NodeType.PQ,
    voltage_level=110.0,
    active_power=-10.0,
    reactive_power=-5.0
)
graph.add_node(pq)

# Dodawanie gałęzi
line = LineBranch(
    id="line-1",
    name="Linia 110kV",
    branch_type=BranchType.LINE,
    from_node_id="slack-1",
    to_node_id="pq-1",
    r_ohm_per_km=0.05,
    x_ohm_per_km=0.4,
    b_us_per_km=2.7,
    length_km=50.0,
    rated_current_a=600.0
)
graph.add_branch(line)
```

### 6.2 Analiza topologii

```python
# Sprawdzenie spójności
if graph.is_connected():
    print("Sieć jest spójna")

# Znajdowanie wysp
islands = graph.find_islands()
for i, island in enumerate(islands):
    print(f"Wyspa {i}: {island}")

# Pobieranie węzła SLACK
slack = graph.get_slack_node()
```

## 7. Powiązane Dokumenty

- [00-System-Overview.md](./00-System-Overview.md) - architektura systemu
- [02-Solvers.md](./02-Solvers.md) - solvery korzystające z Core
- [ADR-001](./adr/ADR-001-power-flow-v2-overlay-vs-core.md) - overlay vs core
