# ONTOLOGIA I RELACJE SIECI TERENOWEJ SN

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY

---

## 1. DIAGRAM ONTOLOGICZNY

```
                    +-------------+
                    |  SIEC SN    |
                    +------+------+
                           | posiada 1+
                    +------+------+
                    |    GPZ      |
                    | (SLACK Bus) |
                    +------+------+
                           | posiada 1+
                    +------+------+
                    | SEKCJA GPZ  |
                    | (Bus SN)    |
                    +------+------+
                           | wychodzi 1+
                    +------+------+
                    | POLE SN     |---- posiada: CB, DS, ES, CT, VT, RELAY
                    | (Bay)       |
                    +------+------+
                           | laczy z
                    +------+------------------+
                    | MAGISTRALA GLÓWNA       |
                    | (MainTrunk)             |
                    | = uporzadkowany ciag    |
                    |   odcinków             |
                    +------+------------------+
                           | sklada sie z 1+
              +------------+----------------+
              |            |                |
     +--------+--+  +-----+-----+  +-------+--------+
     | ODCINEK   |  | PUNKT     |  | STACJA         |
     | (Segment) |  | ODGALEZ.  |  | (Station)      |
     | Line/Cable|  | (Junction)|  |                |
     +-----------+  +-----+-----+  +---+------------+
                          |            | typ:
                          |    +-------+--------+----------+-----------+
                          |    |       |        |          |           |
                   +------+-+  |PRZELO-|  ODGA- | SEKCYJ-  | KONCO-   |
                   |ODGALEZ. | |TOWA   |  LEZNA | NA       | WA       |
                   |(Branch  | |       |        |          |           |
                   | Path)   | | IN->  |  IN    | 2xBus   | IN       |
                   +----+----+ | szyna |  <-br. | +coupler| brak OUT |
                        |      | ->OUT |        | +NOP    |           |
                        |      +-------+        +----------+          |
                        | dalsze stacje...                            |
                        +---------------------------------------------+
```

---

## 2. BYTY BAZOWE (w modelu)

| Byt | Klasa backend | Plik | Status |
|-----|--------------|------|--------|
| Node (Bus) | `Node` | `core/node.py` | OK |
| LineBranch | `LineBranch` | `core/branch.py` | OK |
| TransformerBranch | `TransformerBranch` | `core/branch.py` | OK |
| Switch | `Switch` | `core/switch.py` | OK |
| Station | `Station` | `core/station.py` | WYMAGA ROZSZERZENIA |
| InverterSource | `InverterSource` | `core/inverter.py` | OK |
| NetworkGraph | `NetworkGraph` | `core/graph.py` | OK |
| NetworkSnapshot | `NetworkSnapshot` | `core/snapshot.py` | WYMAGA ROZSZERZENIA |

---

## 3. BYTY NOWE (wymagane do modelu ogólnego)

### 3.1 Rozszerzona typologia stacji

```python
class StationTopologyKind(str, Enum):
    """Typ topologiczny stacji — wyprowadzany z segmentacji magistrali.

    Typ topologiczny jest JAWNY i WALIDOWALNY — nie jest inferowany
    w rendererze ani w frontendowym adapterze ad hoc.
    """
    INLINE = "INLINE"                   # Przelotowa: 2 trunk, 0 branch
    BRANCH_STATION = "BRANCH_STATION"   # Odgalezna: 0 trunk, >=1 branch
    SECTIONAL = "SECTIONAL"             # Sekcyjna: 2+ szyny + coupler
    TERMINAL = "TERMINAL"               # Koncowa: 1 edge, brak OUT
    OZE_CLUSTER = "OZE_CLUSTER"         # Klaster OZE/BESS z polami generatorowymi
    GPZ = "GPZ"                         # Glówny Punkt Zasilajacy
```

### 3.2 Model pola (Bay)

```python
class BayRole(str, Enum):
    """Rola pola w stacji."""
    LINE_IN = "LINE_IN"
    LINE_OUT = "LINE_OUT"
    TRANSFORMER = "TRANSFORMER"
    BRANCH = "BRANCH"
    COUPLER = "COUPLER"
    PV = "PV"
    BESS = "BESS"
    WIND = "WIND"
    MEASUREMENT = "MEASUREMENT"
    SUPPLY = "SUPPLY"

@dataclass
class Bay:
    """Pole w stacji SN.

    Pole jest jednostka organizacyjna zawierajaca urzadzenia laczeniowe
    i zabezpieczeniowe podlaczone do sekcji szyny stacji.
    """
    id: str
    station_id: str
    bus_section_id: str
    bay_role: BayRole
    device_ids: list[str]           # CB, DS, CT, ES, RELAY, FUSE
    connected_branch_id: str | None  # galaz podlaczona do pola
    connected_generator_id: str | None  # generator podlaczony do pola
    connected_transformer_id: str | None  # transformator podlaczony
    label: str = ""
    catalog_ref: str | None = None
```

### 3.3 Segmentacja magistrali

```python
@dataclass(frozen=True)
class TrunkSegmentation:
    """Jawna segmentacja trunk/branch/secondary.

    Segmentacja jest wynikiem algorytmu BFS (deterministycznego)
    lub pochodzi z jawnych logicalViews w ENM.
    """
    trunk_segment_ids: tuple[str, ...]
    branch_segment_ids: tuple[str, ...]
    secondary_segment_ids: tuple[str, ...]
    branch_point_node_ids: tuple[str, ...]

@dataclass(frozen=True)
class MainTrunk:
    """Magistrala glówna — uporzadkowany ciag odcinków od GPZ."""
    id: str
    source_field_id: str
    source_node_id: str
    ordered_segment_ids: tuple[str, ...]
    branch_point_ids: tuple[str, ...]
    inline_station_ids: tuple[str, ...]
    terminal_node_id: str | None

@dataclass(frozen=True)
class BranchPath:
    """Odgalezienie od magistrali (lub od innego odgalezienia)."""
    id: str
    parent_path_id: str  # trunk_id lub branch_id nadrzednego
    junction_node_id: str
    ordered_segment_ids: tuple[str, ...]
    station_ids: tuple[str, ...]
    sub_branch_ids: tuple[str, ...]
    nesting_depth: int  # 0 = z magistrali
```

### 3.4 Punkt odgalezienia

```python
@dataclass(frozen=True)
class JunctionPoint:
    """Punkt odgalezienia na magistrali.

    Wezel z degree >= 3, z którego odchodzi odgalezienie.
    """
    node_id: str
    trunk_id: str
    position_on_trunk: int  # indeks segmentu
    branch_path_ids: tuple[str, ...]
```

### 3.5 Polaczenie rezerwowe

```python
@dataclass(frozen=True)
class ReserveLink:
    """Polaczenie rezerwowe / ring."""
    id: str
    branch_id: str
    node_a_id: str
    node_b_id: str
    is_normally_open: bool
    nop_switch_id: str | None
    link_type: Literal["RING", "RESERVE_FEED", "TIE"]
```

---

## 4. RELACJE KLUCZOWE

### 4.1 Zródlo -> Pole -> Magistrala

```
GPZ.slack_node -> GPZ.bus_sn -> Bay(LINE_OUT) -> Branch(trunk_segment) -> ...
```

### 4.2 Magistrala -> Stacja przelotowa

```
... -> Branch(seg_N) -> [Bay(LINE_IN)] -> Station.bus_sn -> [Bay(LINE_OUT)] -> Branch(seg_N+1)
```

Magistrala WCHODZI i WYCHODZI przez stacje. NIE obok.

### 4.3 Magistrala -> Punkt odgalezienia -> Odgalezienie

```
... -> Branch(seg_N) -> [Node(junction)] -> Branch(seg_N+1)
                            +-> Branch(branch_seg_1) -> Station(odgalezna)
```

### 4.4 Odgalezienie -> Podgalezienie (rekurencja)

```
Branch(branch_seg_1) -> Station(odgalezna) -> ...
                            +-> Branch(sub_branch_seg_1) -> Station(sub_branch)
```

System obsluguje dowolna glebokosc zagniezdzenia odgalezien.

### 4.5 Stacja sekcyjna

```
Station {
  bus_section_A -> [Bay(LINE_IN)] <- magistrala_1
  bus_section_B -> [Bay(LINE_IN)] <- magistrala_2 / rezerwa
  [Bay(COUPLER)] -> Switch(coupler) laczy A<->B
  NOP = Switch(is_normally_open=true) na jednym z zasilan
}
```

### 4.6 Ring / NOP

```
GPZ.pole_1 -> magistrala_1 -> ... -> st_koncowa_A
                                         |
                                        NOP
                                         |
GPZ.pole_2 -> magistrala_2 -> ... -> st_koncowa_B
```

---

## 5. WALIDACJA MODELU OGOLNEGO

### 5.1 Walidacja spójnosci topologicznej

```
REGULY:
  R1: Kazda magistrala zaczyna sie od pola GPZ
  R2: Kazda stacja przelotowa ma pole IN i pole OUT
  R3: Punkt odgalezienia ma >=3 incydentne krawedzie aktywne
  R4: NOP laczy dwa punkty z róznych magistrali (nie wewnatrz jednej)
  R5: Stacja sekcyjna ma >=2 sekcje szyny
  R6: Stacja koncowa ma pole IN, brak pola OUT na tor glówny
  R7: Kazda stacja ma >=1 pole
  R8: Kazde pole ma >=1 urzadzenie (minimum CB lub LS)
  R9: Odgalezienie zaczyna sie od junction node
  R10: Brak cykli w spanning tree
```

### 5.2 Walidacja kontraktów obliczeniowych

```
REGULY:
  C1: Kazdy Node ma typ (SLACK/PQ/PV)
  C2: Dokladnie 1 SLACK
  C3: Branch: from_node_id != to_node_id
  C4: Branch(LINE/CABLE): R+X > 0
  C5: TransformerBranch: Sn > 0, uk% > 0
```

---

## 6. ZWIAZEK Z SNAPSHOT

### 6.1 Snapshot MUSI zawierac

```
OBOWIAZKOWE:
  - nodes (z typami SLACK/PQ/PV i parametrami)
  - branches (LINE/CABLE/TRANSFORMER z parametrami)
  - switches (z typem i stanem)
  - inverter_sources (z moca i wezlem)
  - stations (z typem, bus_ids, bay_ids) <- NOWE
  - fingerprint (SHA-256)

OPCJONALNE (z ENM):
  - trunk_segmentation
  - logical_views
  - station_topology_kinds
```

### 6.2 Snapshot NIE MOZE zawierac

```
ZABRONIONE:
  - Geometria SLD (pozycje x/y)
  - Wyniki obliczen
  - Stany case'ów
  - BoundaryNode
  - PCC
```

---

## 7. MAPA KONTRAKTÓW -> PLIKI

| Kontrakt | Plik docelowy | Status |
|----------|--------------|--------|
| StationTopologyKind | `backend/src/network_model/core/station.py` | DO ROZSZERZENIA |
| Bay, BayRole | `backend/src/network_model/core/bay.py` | NOWY |
| TrunkSegmentation | `backend/src/network_model/core/trunk.py` | NOWY |
| MainTrunk | `backend/src/network_model/core/trunk.py` | NOWY |
| BranchPath | `backend/src/network_model/core/trunk.py` | NOWY |
| JunctionPoint | `backend/src/network_model/core/trunk.py` | NOWY |
| ReserveLink | `backend/src/network_model/core/trunk.py` | NOWY |
| SldSemanticModelV1 | `frontend/src/ui/sld/core/sldSemanticModel.ts` | NOWY |
| buildSldSemanticModel() | `frontend/src/ui/sld/core/sldSemanticAdapter.ts` | NOWY |
| validateSldSemanticModel() | `frontend/src/ui/sld/core/sldSemanticValidator.ts` | NOWY |
