# ROZDZIAŁ 4 — LINIE I KABLE SN: MODELOWANIE, PARAMETRY, MAGISTRALE, RINGI

**Wersja:** 1.0 FINAL
**Data:** 2026-02-08
**Status:** AS-IS (1:1 z kodem) + TO-BE (sekcje oznaczone)
**Warstwa:** ENM Core + Catalog + Solver Contract
**Zależności:** Rozdział 2 (§2.3–§2.6, §2.19), Rozdział 3 (§3.6–§3.7), AUDIT §9 (Decyzje #15, #18, #26–#28)
**Autor:** System Architect + PhD Energetyki

---

## 4.1 Cel i zakres rozdziału

Niniejszy rozdział definiuje **kanoniczny model linii napowietrznych i kabli SN** w systemie MV-DESIGN-PRO. Obejmuje:

1. Definicję linii/kabla jako gałęzi (`Branch`) modelu ENM
2. Dyskryminację technologiczną: linia napowietrzna vs kabel podziemny
3. Typy katalogowe (READ-ONLY) i parametry zmienne instancji
4. Resolver parametrów z 3-poziomową precedencją
5. Schemat zastępczy π i wzory impedancyjne
6. Magistrale wielosegmentowe (multi-segment feeder)
7. Ringi SN (modelowanie, punkt NO)
8. Kontrakt solver — wejście do macierzy Y-bus
9. Walidacje specyficzne dla linii/kabli
10. Relacja z kreatorem (Wizard) i SLD

**Granica rozdziału:** Rozdział opisuje modelowanie elementu fizycznego (linia/kabel) od definicji ENM, przez katalog typów, po wejście do solvera. NIE opisuje:
- Solverów (→ SPEC_10, SPEC_11)
- Zabezpieczeń (→ Rozdział 2 §2.15–§2.21, SPEC_12)
- Topologii ogólnej (→ Rozdział 3)

---

## 4.2 Definicja: linia i kabel jako Branch ENM

### 4.2.1 Przynależność do modelu ENM

Linia napowietrzna (`OverheadLine`) i kabel podziemny (`Cable`) są **bytami obliczeniowymi** ENM — należą do zamkniętej listy 10 bytów obliczeniowych (Rozdział 2, §2.3, Decyzja #20).

Obie klasy dziedziczą po `BranchBase` i wchodzą w skład **dyskryminowanej unii** `Branch`:

```python
Branch = Annotated[
    OverheadLine | Cable | SwitchBranch | FuseBranch,
    Field(discriminator="type"),
]
```

**Plik źródłowy:** `enm/models.py:144–147`

### 4.2.2 Pola bazowe BranchBase

Każda linia/kabel dziedziczy następujące pola z `BranchBase(ENMElement)`:

| Pole | Typ | Opis | Źródło |
|------|-----|------|--------|
| `id` | `UUID` | Identyfikator unikalny | `ENMElement` |
| `ref_id` | `str` | Identyfikator referencyjny | `ENMElement` |
| `name` | `str` | Nazwa elementu | `ENMElement` |
| `from_bus_ref` | `str` | Referencja do szyny początkowej (Bus) | `BranchBase` |
| `to_bus_ref` | `str` | Referencja do szyny końcowej (Bus) | `BranchBase` |
| `status` | `"closed" \| "open"` | Stan łączeniowy (domyślnie: `"closed"`) | `BranchBase` |
| `catalog_ref` | `str \| None` | Referencja do typu katalogowego | `BranchBase` |
| `tags` | `list[str]` | Tagi użytkownika | `ENMElement` |
| `meta` | `dict` | Metadane dodatkowe | `ENMElement` |

**Plik źródłowy:** `enm/models.py:99–103`

### 4.2.3 Reguła połączenia

Linia/kabel łączy dokładnie dwa Bus SN (Rozdział 3, §3.3):

```
Bus SN (from_bus_ref) ←── OverheadLine/Cable ──→ Bus SN (to_bus_ref)
```

- Oba Bus MUSZĄ mieć to samo `voltage_kv` (reguła E-T08 z §3.3)
- Jedynym elementem łączącym Bus o **różnych** napięciach jest Transformer (Decyzja #26)
- Linia/kabel z `status="open"` jest wyłączony z topologii obliczeniowej

---

## 4.3 Dyskryminacja technologiczna: OverheadLine vs Cable

### 4.3.1 OverheadLine — linia napowietrzna

```python
class OverheadLine(BranchBase):
    type: Literal["line_overhead"] = "line_overhead"
    length_km: float
    r_ohm_per_km: float
    x_ohm_per_km: float
    b_siemens_per_km: float | None = None
    r0_ohm_per_km: float | None = None
    x0_ohm_per_km: float | None = None
    b0_siemens_per_km: float | None = None
    rating: BranchRating | None = None
```

**Plik źródłowy:** `enm/models.py:106–115`

### 4.3.2 Cable — kabel podziemny

```python
class Cable(BranchBase):
    type: Literal["cable"] = "cable"
    length_km: float
    r_ohm_per_km: float
    x_ohm_per_km: float
    b_siemens_per_km: float | None = None
    r0_ohm_per_km: float | None = None
    x0_ohm_per_km: float | None = None
    b0_siemens_per_km: float | None = None
    rating: BranchRating | None = None
    insulation: Literal["XLPE", "PVC", "PAPER"] | None = None
```

**Plik źródłowy:** `enm/models.py:118–128`

### 4.3.3 Różnice strukturalne

| Cecha | OverheadLine | Cable |
|-------|-------------|-------|
| Dyskryminator `type` | `"line_overhead"` | `"cable"` |
| Pole `insulation` | **Brak** | `XLPE \| PVC \| PAPER` |
| Susceptancja | `b_siemens_per_km` (mała, ~2–4 μS/km) | `b_siemens_per_km` (duża, ~30–180 μS/km) |
| Pojemność dominująca | Nie | Tak (efekt π-modelu istotny) |
| Parametry zerowe | `r0_ohm_per_km`, `x0_ohm_per_km`, `b0_siemens_per_km` | Identyczne pola |
| Obciążalność prądowa | `rating.in_a` (BranchRating) | `rating.in_a` (BranchRating) |
| Prąd zwarciowy cieplny | `rating.ith_ka`, `rating.idyn_ka` | `rating.ith_ka`, `rating.idyn_ka` |

### 4.3.4 Parametr BranchRating

```python
class BranchRating(BaseModel):
    in_a: float | None = None        # Obciążalność prądowa ciągła [A]
    ith_ka: float | None = None      # Prąd zwarciowy cieplny [kA]
    idyn_ka: float | None = None     # Prąd zwarciowy dynamiczny [kA]
```

**Plik źródłowy:** `enm/models.py:33–36`

### 4.3.5 Składowe zerowe (zero-sequence)

Parametry zerowe (`r0_ohm_per_km`, `x0_ohm_per_km`, `b0_siemens_per_km`) są opcjonalne. Obecne solvery ich **NIE przetwarzają** — pole `mapping.py` pomija te parametry (`enm/mapping.py:9`: „Zero-sequence fields are ignored by current solvers").

> Parametry zerowe są przechowywane w ENM dla przyszłych solverów zwarć 1F i 2F+G, ale w AS-IS nie wpływają na wyniki obliczeń.

### 4.3.6 Jednostki w ENM vs jednostki w solverze

| Parametr ENM | Jednostka ENM | Parametr Solver | Jednostka Solver | Konwersja |
|-------------|---------------|-----------------|------------------|-----------|
| `r_ohm_per_km` | Ω/km | `r_ohm_per_km` | Ω/km | 1:1 |
| `x_ohm_per_km` | Ω/km | `x_ohm_per_km` | Ω/km | 1:1 |
| `b_siemens_per_km` | S/km | `b_us_per_km` | μS/km | × 10⁶ |
| `length_km` | km | `length_km` | km | 1:1 |
| `rating.in_a` | A | `rated_current_a` | A | 1:1 |

**UWAGA:** Konwersja `b_siemens_per_km → b_us_per_km` jest wykonywana w `enm/mapping.py:107`:
```python
b_us_per_km = branch.b_siemens_per_km * 1e6  # S/km → μS/km
```

---

## 4.4 Typy katalogowe — parametry READ-ONLY

### 4.4.1 LineType — typ linii napowietrznej

```python
@dataclass(frozen=True)
class LineType:
    id: str
    name: str
    r_ohm_per_km: float          # R′ przy 20°C [Ω/km]
    x_ohm_per_km: float          # X′ przy 50 Hz [Ω/km]
    b_us_per_km: float = 0.0     # B′ [μS/km]
    rated_current_a: float = 0.0 # Obciążalność ciągła [A]
    manufacturer: str | None
    standard: str | None          # np. "PN-EN 50182"
    max_temperature_c: float = 70.0
    voltage_rating_kv: float
    conductor_material: str | None  # "AL", "AL_ST"
    cross_section_mm2: float
    ith_1s_a: float | None        # Prąd cieplny zwarciowy 1s [A]
    jth_1s_a_per_mm2: float | None # Gęstość prądu zwarciowego 1s [A/mm²]
    base_type_id: str | None      # Ref do typu bazowego (dla typów producenckich)
    trade_name: str | None        # Oznaczenie handlowe
```

**Plik źródłowy:** `network_model/catalog/types.py:33–75`

**Właściwości obliczane:**
- `dane_cieplne_kompletne` → `True` jeśli `ith_1s_a > 0` LUB (`jth_1s_a_per_mm2 > 0` AND `cross_section_mm2 > 0`)
- `get_ith_1s()` → `ith_1s_a` LUB `jth_1s_a_per_mm2 × cross_section_mm2`

### 4.4.2 CableType — typ kabla podziemnego

```python
@dataclass(frozen=True)
class CableType:
    id: str
    name: str
    r_ohm_per_km: float          # R′ przy 20°C [Ω/km]
    x_ohm_per_km: float          # X′ przy 50 Hz [Ω/km]
    c_nf_per_km: float = 0.0     # Pojemność C′ [nF/km]
    rated_current_a: float
    manufacturer: str | None
    voltage_rating_kv: float
    insulation_type: str | None   # "XLPE", "EPR"
    standard: str | None          # np. "IEC 60502-2"
    conductor_material: str | None  # "CU", "AL"
    cross_section_mm2: float
    max_temperature_c: float = 90.0
    number_of_cores: int = 1      # 1 lub 3
    ith_1s_a: float | None
    jth_1s_a_per_mm2: float | None
    base_type_id: str | None
    trade_name: str | None
```

**Plik źródłowy:** `network_model/catalog/types.py:165–211`

**Właściwości obliczane:**
- `b_us_per_km` → `2π × 50 × c_nf_per_km × 10⁻³` [μS/km]
- `dane_cieplne_kompletne` → jak w LineType
- `get_ith_1s()` → jak w LineType

### 4.4.3 Różnice kluczowe LineType vs CableType

| Parametr | LineType | CableType |
|----------|----------|-----------|
| Susceptancja | `b_us_per_km` (bezpośrednio) | `c_nf_per_km` (pojemność → przeliczana na B) |
| Izolacja | Brak pola | `insulation_type: XLPE \| EPR` |
| Liczba żył | Brak pola (zawsze 3×1) | `number_of_cores: 1 \| 3` |
| Temperatura max. | 70°C (domyślnie) | 90°C (domyślnie) |
| Materiał | `AL`, `AL_ST` | `CU`, `AL` |

### 4.4.4 Katalog typów — zawartość AS-IS

**Plik źródłowy:** `network_model/catalog/mv_cable_line_catalog.py` (~1384 linii)

#### Stałe materiałowe — gęstość prądu zwarciowego `jth` [A/mm²]

| Materiał + Izolacja | Stała | Wartość [A/mm²] | Norma |
|---------------------|-------|-----------------|-------|
| Miedź + XLPE | `JTH_CU_XLPE` | 143.0 | IEC 60949 |
| Aluminium + XLPE | `JTH_AL_XLPE` | 94.0 | IEC 60949 |
| Miedź + EPR | `JTH_CU_EPR` | 143.0 | IEC 60949 |
| Aluminium + EPR | `JTH_AL_EPR` | 94.0 | IEC 60949 |
| Aluminium (AAC) linia | `JTH_AL_OHL` | 94.0 | PN-EN 60865-1 |
| Aluminium-Stal (ACSR) linia | `JTH_AL_ST_OHL` | 88.0 | PN-EN 60865-1 |

#### Typy kabli (90+ typów)

| Kategoria | Materiał | Izolacja | Żyły | Przekroje [mm²] | Ilość typów |
|-----------|----------|----------|------|-----------------|-------------|
| Bazowe XLPE Cu 1c | CU | XLPE | 1 | 70, 120, 150, 185, 240, 300, 400 | 7 |
| Bazowe XLPE Al 1c | AL | XLPE | 1 | 70, 120, 150, 185, 240, 300, 400 | 7 |
| Bazowe XLPE Cu 3c | CU | XLPE | 3 | 70, 120, 150, 185, 240, 300, 400 | 7 |
| Bazowe XLPE Al 3c | AL | XLPE | 3 | 70, 120, 150, 185, 240, 300, 400 | 7 |
| Bazowe EPR Cu 1c | CU | EPR | 1 | 70, 120, 150, 185, 240 | 5 |
| Bazowe EPR Al 1c | AL | EPR | 1 | 70, 120, 150, 185, 240 | 5 |
| Bazowe EPR Cu 3c | CU | EPR | 3 | 70, 120, 150, 185, 240 | 5 |
| Bazowe EPR Al 3c | AL | EPR | 3 | 70, 120, 150, 185, 240 | 5 |
| NKT (producent) | CU/AL | XLPE | 1/3 | różne | ~20 |
| Tele-Fonika (producent) | CU/AL | XLPE | 1/3 | różne | ~20 |

#### Typy linii napowietrznych (14 typów)

| Kategoria | Materiał | Przekroje [mm²] | Ilość typów |
|-----------|----------|-----------------|-------------|
| Aluminium AAC | AL | 25, 35, 50, 70, 95, 120, 150 | 7 |
| Aluminium-Stal ACSR/AFL | AL_ST | 25, 35, 50, 70, 95, 120, 150 | 7 |

#### Typy producenckie

Typy producenckie (NKT, Tele-Fonika) posiadają pole `base_type_id` referencjonujące typ bazowy. Parametry elektryczne mogą się nieznacznie różnić od bazowych. Resolver rozpoznaje typy producenckie przez obecność `base_type_id`.

#### Funkcje agregujące

| Funkcja | Opis | Plik |
|---------|------|------|
| `get_all_cable_types()` | Zwraca 90+ typów w deterministycznej kolejności | `mv_cable_line_catalog.py` |
| `get_all_line_types()` | Zwraca 14+ typów w deterministycznej kolejności | `mv_cable_line_catalog.py` |
| `get_catalog_statistics()` | Statystyki katalogu (ilości per kategoria) | `mv_cable_line_catalog.py` |

---

## 4.5 Parametry zmienne instancji

### 4.5.1 Zasada kompozycji (Decyzja #18, Rozdział 2 §2.19)

```
instancja ENM = TYP(katalog) + parametry_zmienne(kreator) + [override(tryb_ekspert)]
```

### 4.5.2 Parametry TYP — z katalogu (READ-ONLY)

| Parametr | Źródło | Edytowalność |
|----------|--------|-------------|
| `r_ohm_per_km` (R′) | `LineType` / `CableType` | READ-ONLY w trybie standardowym |
| `x_ohm_per_km` (X′) | `LineType` / `CableType` | READ-ONLY w trybie standardowym |
| `b_us_per_km` (B′) / `c_nf_per_km` (C′) | `LineType` / `CableType` | READ-ONLY w trybie standardowym |
| `rated_current_a` (In) | `LineType` / `CableType` | READ-ONLY w trybie standardowym |
| `conductor_material` | `LineType` / `CableType` | READ-ONLY |
| `cross_section_mm2` | `LineType` / `CableType` | READ-ONLY |
| `jth_1s_a_per_mm2` | `LineType` / `CableType` | READ-ONLY |

### 4.5.3 Parametry ZMIENNE — z kreatora

| Parametr | Jednostka | Wprowadzany przez | Opis |
|----------|-----------|-------------------|------|
| `length_km` | km | Kreator K6 / K7 | Długość odcinka |
| `status` | `closed \| open` | Kreator / edycja | Stan łączeniowy |
| `from_bus_ref` | ref | Kreator / topologia | Szyna początkowa |
| `to_bus_ref` | ref | Kreator / topologia | Szyna końcowa |
| `insulation` | `XLPE \| PVC \| PAPER` | Kreator (Cable) | Typ izolacji |

### 4.5.4 Override — tryb EKSPERT (Decyzja #16)

`impedance_override` umożliwia nadpisanie parametrów impedancyjnych **na poziomie instancji**, bez modyfikacji katalogu:

```python
@dataclass(frozen=True)
class LineImpedanceOverride:
    r_total_ohm: float     # Całkowita R na pełnej długości [Ω]
    x_total_ohm: float     # Całkowita X na pełnej długości [Ω]
    b_total_us: float = 0.0  # Całkowita B na pełnej długości [μS]
```

**Plik źródłowy:** `network_model/core/branch.py:183–194`

**Reguły override (BINDING):**
1. Override JEST wartością **sumaryczną** (nie per km) — na pełną długość odcinka
2. Override NIE modyfikuje katalogu — dotyczy wyłącznie danej instancji
3. Override jest jawnie oznaczony i audytowalny w White Box (`ParameterSource.OVERRIDE`)
4. Override dezaktywuje przeliczenie `z′ × L` — solver używa wartości override bezpośrednio
5. Resolver przelicza override na per-km dzieląc przez `length_km` (dla spójności raportowania)

---

## 4.6 Resolver parametrów — precedencja kanonowa

### 4.6.1 ParameterSource — źródło parametrów

```python
class ParameterSource(Enum):
    OVERRIDE = "override"    # impedance_override (najwyższy priorytet)
    TYPE_REF = "type_ref"    # Referencja do typu katalogowego
    INSTANCE = "instance"    # Parametry instancji (fallback)
```

**Plik źródłowy:** `network_model/catalog/resolver.py:20–26`

### 4.6.2 Kanoniczna precedencja (3 poziomy)

```
impedance_override  >  type_ref  >  instance
     (OVERRIDE)        (TYPE_REF)   (INSTANCE)
```

| Poziom | Warunek aktywacji | Źródło R′, X′, B′ | Źródło In |
|--------|-------------------|-------------------|-----------|
| 1. OVERRIDE | `impedance_override is not None` | `r_total_ohm / length_km`, `x_total_ohm / length_km`, `b_total_us / length_km` | instancja `rated_current_a` |
| 2. TYPE_REF | `type_ref is not None AND catalog is not None` | `LineType.r_ohm_per_km`, `.x_ohm_per_km`, `.b_us_per_km` | `LineType.rated_current_a` |
| 3. INSTANCE | fallback | `OverheadLine.r_ohm_per_km`, `.x_ohm_per_km`, `.b_siemens_per_km × 1e6` | `rating.in_a` |

### 4.6.3 Funkcja resolve_line_params()

```python
def resolve_line_params(
    *,
    type_ref: str | None,
    is_cable: bool,
    impedance_override: dict | None,
    length_km: float,
    instance_r_ohm_per_km: float,
    instance_x_ohm_per_km: float,
    instance_b_us_per_km: float,
    instance_rated_current_a: float,
    catalog: CatalogRepository | None,
) -> ResolvedLineParams:
```

**Plik źródłowy:** `network_model/catalog/resolver.py:136–217`

**Wynik:**

```python
@dataclass(frozen=True)
class ResolvedLineParams:
    r_ohm_per_km: float
    x_ohm_per_km: float
    b_us_per_km: float
    rated_current_a: float
    source: ParameterSource    # Wskazuje, który poziom zadziałał
```

**Plik źródłowy:** `network_model/catalog/resolver.py:28–36`

### 4.6.4 Resolver termiczny — resolve_thermal_params()

Osobna funkcja resolwera dla parametrów cieplnych (używana w analizie zabezpieczeń, NIE w solverach mocy/zwarć):

```python
def resolve_thermal_params(
    *,
    type_ref: str | None,
    is_cable: bool,
    catalog: CatalogRepository | None,
) -> ResolvedThermalParams | None:
```

**Plik źródłowy:** `network_model/catalog/resolver.py:283–334`

**Wynik:**

```python
@dataclass(frozen=True)
class ResolvedThermalParams:
    ith_1s_a: float | None
    jth_1s_a_per_mm2: float | None
    cross_section_mm2: float
    conductor_material: str | None
    dane_cieplne_kompletne: bool
    source: ParameterSource
    type_id: str | None
    type_name: str | None
    is_manufacturer_type: bool
    base_type_id: str | None
```

**Metoda kluczowa:**

```
Ith(1s) [A] = jth × A
```

gdzie `jth` [A/mm²] — gęstość prądu zwarciowego, `A` [mm²] — przekrój przewodnika.

### 4.6.5 Obsługa błędu — TypeNotFoundError

```python
class TypeNotFoundError(ValueError):
    def __init__(self, type_ref: str, equipment_type: str):
        # "{equipment_type} type_ref '{type_ref}' not found in catalog."
```

**Plik źródłowy:** `network_model/catalog/resolver.py:116–125`

Rzucany, gdy `type_ref` wskazuje na nieistniejący wpis w katalogu. Blokuje uruchomienie solvera.

---

## 4.7 Schemat zastępczy π i wzory impedancyjne

### 4.7.1 Model π linii/kabla

Każda linia i kabel SN jest modelowana jako element π (PI-model):

```
    from_bus                                           to_bus
    ┌───┐     ┌────────────────────────────────┐     ┌───┐
    │   │─────┤  Z_series = R_total + jX_total  ├─────│   │
    │   │     └────────────────────────────────┘     │   │
    │   │              │                │              │   │
    │   │         ┌────┴────┐      ┌────┴────┐         │   │
    │   │         │ Y_sh/2  │      │ Y_sh/2  │         │   │
    │   │         │= jB·L/2 │      │= jB·L/2 │         │   │
    │   │         └────┬────┘      └────┬────┘         │   │
    └───┘              │                │              └───┘
                      GND              GND
```

### 4.7.2 Wzory impedancyjne (AS-IS)

**Impedancja całkowita seryjna:**

$$Z_{total} = (R' + jX') \cdot L \quad [\Omega]$$

gdzie:
- $R'$ = `r_ohm_per_km` [Ω/km] — rezystancja jednostkowa przy 20°C
- $X'$ = `x_ohm_per_km` [Ω/km] — reaktancja jednostkowa przy 50 Hz
- $L$ = `length_km` [km] — długość odcinka

**Implementacja:** `LineBranch.get_total_impedance()` — `network_model/core/branch.py:366–382`

```python
def get_total_impedance(self) -> complex:
    if self.impedance_override is not None:
        return complex(
            self.impedance_override.r_total_ohm,
            self.impedance_override.x_total_ohm,
        )
    r_total = self.r_ohm_per_km * self.length_km
    x_total = self.x_ohm_per_km * self.length_km
    return complex(r_total, x_total)
```

**Admitancja seryjna:**

$$Y_{series} = \frac{1}{Z_{total}} \quad [S]$$

**Implementacja:** `LineBranch.get_series_admittance()` — `network_model/core/branch.py:384–399`

**Admitancja bocznikowa (shunt):**

$$Y_{shunt} = j \cdot B' \cdot L \quad [S]$$

gdzie:
- $B'$ = `b_us_per_km × 10⁻⁶` [S/km] — susceptancja jednostkowa

**Admitancja bocznikowa na końcu (PI-model):**

$$Y_{shunt/end} = \frac{Y_{shunt}}{2} \quad [S]$$

**Implementacja:** `LineBranch.get_shunt_admittance()` i `get_shunt_admittance_per_end()` — `network_model/core/branch.py:401–430`

### 4.7.3 Szczególny przypadek: impedance_override

Gdy `impedance_override is not None`:
- `Z_total = r_total_ohm + j × x_total_ohm` (bezpośrednio, BEZ mnożenia przez długość)
- `Y_shunt = j × b_total_us × 10⁻⁶` (bezpośrednio)
- Solver nie korzysta z R′/X′/B′ per km

### 4.7.4 Wejście do macierzy Y-bus

Macierz admitancyjna Y-bus (`AdmittanceMatrixBuilder` w `network_model/core/ybus.py`) przetwarza LineBranch w następujący sposób:

1. Oblicz `Z_total [Ω]` → przelicz na per-unit: $Z_{pu} = Z_{total} / Z_{base}$, gdzie $Z_{base} = V_n^2 / S_{base}$
2. Admitancja seryjna per-unit: $Y_{series,pu} = 1 / Z_{pu}$
3. Admitancja bocznikowa per-unit: $Y_{shunt,pu} = Y_{shunt} \cdot Z_{base}$
4. PI-model per end: $Y_{shunt/end,pu} = Y_{shunt,pu} / 2$

**Wstawienie do macierzy Y-bus:**

$$Y_{bus}[i,i] \mathrel{+}= Y_{series,pu} + Y_{shunt/end,pu}$$
$$Y_{bus}[j,j] \mathrel{+}= Y_{series,pu} + Y_{shunt/end,pu}$$
$$Y_{bus}[i,j] \mathrel{-}= Y_{series,pu}$$
$$Y_{bus}[j,i] \mathrel{-}= Y_{series,pu}$$

**Układ per-unit:**
- $S_{base} = 100$ MVA
- $V_{base} = V_n$ [kV] (napięcie znamionowe szyny)
- $Z_{base} = V_n^2 / S_{base}$ [Ω]

---

## 4.8 Mapowanie ENM → Solver (kontrakt deterministyczny)

### 4.8.1 Reguły mapowania

| ENM | Solver | Typ | Warunek |
|-----|--------|-----|---------|
| `OverheadLine` | `LineBranch` | `BranchType.LINE` | `status == "closed"` → `in_service=True` |
| `Cable` | `LineBranch` | `BranchType.CABLE` | `status == "closed"` → `in_service=True` |

**Plik źródłowy:** `enm/mapping.py:104–127`

### 4.8.2 Proces mapowania (deterministyczny)

```python
# enm/mapping.py:104-127
if isinstance(branch, (OverheadLine, Cable)):
    b_us_per_km = 0.0
    if branch.b_siemens_per_km is not None:
        b_us_per_km = branch.b_siemens_per_km * 1e6  # S/km → μS/km

    rated_a = 0.0
    if branch.rating and branch.rating.in_a:
        rated_a = branch.rating.in_a

    bt = BranchType.CABLE if isinstance(branch, Cable) else BranchType.LINE
    lb = LineBranch(
        id=branch_id,
        name=branch.name,
        branch_type=bt,
        from_node_id=from_id,
        to_node_id=to_id,
        in_service=(branch.status == "closed"),
        r_ohm_per_km=branch.r_ohm_per_km,
        x_ohm_per_km=branch.x_ohm_per_km,
        b_us_per_km=b_us_per_km,
        length_km=branch.length_km,
        rated_current_a=rated_a if rated_a > 0 else 1.0,
    )
    graph.add_branch(lb)
```

### 4.8.3 Zasady mapowania (BINDING)

1. **Sortowanie:** elementy mapowane w kolejności `sorted(enm.branches, key=lambda b: b.ref_id)` — deterministyka
2. **Konwersja B:** `b_siemens_per_km` [S/km] → `b_us_per_km` [μS/km] (× 10⁶)
3. **Rating fallback:** jeśli `rating.in_a` brak lub 0, używana jest wartość `1.0` A (zabezpieczenie przed dzieleniem przez zero)
4. **Status:** `"closed"` → `in_service=True`, `"open"` → `in_service=False`
5. **Open branches:** gałąź z `in_service=False` NIE jest dodawana do macierzy Y-bus (wykluczona z topologii obliczeniowej)
6. **Brak ref:** jeśli `from_bus_ref` lub `to_bus_ref` nie ma odpowiednika w `ref_to_node_id` → gałąź jest **pomijana** (bez błędu)

---

## 4.9 Magistrale wielosegmentowe (multi-segment feeder)

### 4.9.1 Definicja

Magistrala SN (feeder) złożona z wielu odcinków linii/kabli jest modelowana jako **sekwencja osobnych Branch** połączonych przez Bus lub Junction (Rozdział 3, §3.7):

```
Bus SN (GPZ)
│
├── OverheadLine (segment 1, L₁=2.5 km, AFL 120)
│         │
│   Bus SN (stacja pośrednia) lub Junction (T_node)
│         │
├── Cable (segment 2, L₂=1.8 km, XLPE Al 240)
│         │
│   Bus SN (stacja pośrednia)
│         │
└── OverheadLine (segment 3, L₃=3.2 km, AFL 70)
          │
    Bus SN (stacja końcowa)
```

### 4.9.2 Reguły modelowania (BINDING)

1. **Każdy segment = osobny Branch** — system NIE posiada bytu „Feeder" ani „Multi-segment Line"
2. Segmenty MOGĄ mieć **różne typy katalogowe** (linia/kabel, różne przekroje)
3. Segmenty MOGĄ mieć **różne długości**
4. Punkt łączenia segmentów = Bus SN (stacja pośrednia) lub Junction (węzeł T)
5. Solver widzi każdy segment jako osobny element macierzy Y-bus
6. `Corridor` (ENM) agreguje segmenty w `ordered_segment_refs` — ale to jest warstwa SLD/meta, NIE solver

### 4.9.3 Konsekwencje obliczeniowe

| Aspekt | Segment osobno | Cały feeder |
|--------|---------------|-------------|
| Impedancja | $Z_i = (R'_i + jX'_i) \cdot L_i$ per segment | $Z_{total} = \sum Z_i$ (addytywna) |
| Admitancja bocznikowa | $Y_{sh,i}$ per segment (PI-model na segment) | $Y_{sh,total} = \sum Y_{sh,i}$ |
| Prąd zwarciowy | Różny w każdym punkcie trasy | Wzdłuż feedera maleje od GPZ |
| Obciążalność | Limitowana przez najsłabszy segment | `min(In_i)` |

### 4.9.4 Mieszane magistrale (linia + kabel)

Magistrala SN MOŻE składać się z odcinków linii napowietrznej i kabli podziemnych (typowe w praktyce OSD). Każdy odcinek jest osobnym Branch ENM z odpowiednim typem (`line_overhead` lub `cable`). Resolver działa niezależnie na każdy segment.

---

## 4.10 Ringi SN — modelowanie zamkniętych/otwartych pętli

### 4.10.1 Zasada fundamentalna (Decyzja #28, Rozdział 3 §3.6)

System NIE posiada bytu „Ring" ani „Loop". Ring SN jest modelowany **wyłącznie** przez kombinację:
- **Bus SN** (węzły)
- **Branch** (OverheadLine/Cable — odcinki)
- **SwitchBranch** lub **Branch z `status="open"`** (punkt normalnie otwarty — NO)

### 4.10.2 Punkt normalnie otwarty (NO point)

```
Bus SN (GPZ sekcja 1)        Bus SN (GPZ sekcja 2)
│                              │
├── Line (A→B)                ├── Line (E→F)
│                              │
Bus SN (B)                    Bus SN (F)
│                              │
├── Line (B→C)                ├── Line (F→C)
│                              │
Bus SN (C) ←── SwitchBranch(status="open") ──→ Bus SN (C')
                    (NO point)
```

Punkt NO MUSI spełniać:
- Element z `status="open"` → `in_service=False` w solverze → wyklucza połączenie z macierzy Y-bus
- `Corridor.no_point_ref` wskazuje na element NO (warstwa SLD/meta)
- Ring po otwarciu NO = dwa radialne feedery

### 4.10.3 Przełączenie ringu (zmiana punktu NO)

Zmiana punktu NO polega na:
1. Zamknięcie dotychczasowego NO: `SwitchBranch.status = "closed"` (lub `Branch.status = "closed"`)
2. Otwarcie nowego NO: inny element → `status = "open"`
3. Przeliczenie topologii (nowy `map_enm_to_network_graph()`)
4. Invalidacja wszystkich wyników obliczeniowych (Case immutability — Rozdział 2 §2.1)

### 4.10.4 Ring zamknięty (all closed)

Jeśli wszystkie elementy ringu mają `status="closed"`:
- Solver widzi zamkniętą pętlę
- Rozpływ mocy Newton-Raphson oblicza naturalny podział obciążeń
- Prądy zwarciowe mają wkłady z OBU stron ringu

> **UWAGA:** Ring zamknięty jest rzadkim stanem eksploatacyjnym w sieciach SN OSD. Typowy stan = ring otwarty z jednym punktem NO.

---

## 4.11 Walidacje specyficzne dla linii i kabli

### 4.11.1 Walidacje ENM (istniejące — AS-IS)

| Kod | Poziom | Opis | Plik |
|-----|--------|------|------|
| E005 | BLOCKER | Gałąź bez impedancji (R=0 AND X=0) — brak `impedance_override` i brak `type_ref` | `enm/validator.py` |
| E003 | BLOCKER | Graf niespójny — linia/kabel nie ma ścieżki do Source | `enm/validator.py` |
| W001 | IMPORTANT | Brak parametrów zerowych (`r0_ohm_per_km`, `x0_ohm_per_km`) na linii/kablu | `enm/validator.py` |
| I002 | INFO | Gałąź bez `catalog_ref` — parametry z ręcznego wprowadzenia | `enm/validator.py` |

### 4.11.2 Walidacje solvera (LineBranch.validate() — AS-IS)

| Warunek | Typ | Opis | Plik |
|---------|-----|------|------|
| `length_km > 0` | BLOCKER | Długość musi być dodatnia | `branch.py:307` |
| `r_ohm_per_km >= 0` | BLOCKER | Rezystancja nieujemna | `branch.py:309` |
| `x_ohm_per_km >= 0` | BLOCKER | Reaktancja nieujemna | `branch.py:311` |
| `b_us_per_km >= 0` | BLOCKER | Susceptancja nieujemna | `branch.py:313` |
| `R ≠ 0 OR X ≠ 0` | BLOCKER | Impedancja niezerowa (bez override i type_ref) | `branch.py:339` |
| `rated_current_a > 0` | BLOCKER | Obciążalność dodatnia (bez type_ref) | `branch.py:336` |
| `isfinite(R, X, B, L, In)` | BLOCKER | Wartości skończone (nie NaN, nie inf) | `branch.py:294–303` |
| Override: `R_total ≥ 0`, `X_total ≥ 0` | BLOCKER | Wartości override nieujemne | `branch.py:324–329` |
| Override: `R_total ≠ 0 OR X_total ≠ 0` | BLOCKER | Impedancja override niezerowa | `branch.py:330–334` |

### 4.11.3 Walidacje topologiczne (Rozdział 3)

| Kod | Opis | Odniesienie |
|-----|------|------------|
| E-T08 | Bus coupler łączący Bus o różnym `voltage_kv` | §3.3 |
| E-T03 | Branch z `from_bus_ref == to_bus_ref` (pętla własna) | §3.3 |

### 4.11.4 Walidacje specyficzne — TO-BE

> **TO-BE** — nie zaimplementowane. Wymaga osobnej decyzji.

| Kod | Poziom | Opis |
|-----|--------|------|
| E-L01 | BLOCKER | Linia/kabel bez typu i bez impedancji (brak `catalog_ref`, brak `r_ohm_per_km`/`x_ohm_per_km`, brak `impedance_override`) |
| E-L02 | BLOCKER | `length_km ≤ 0` na linii/kablu |
| W-L01 | IMPORTANT | Niezgodność `voltage_rating_kv` typu katalogowego z `voltage_kv` szyny |
| W-L02 | IMPORTANT | Ring bez aparatury łączeniowej na punkcie NO (brak SwitchBranch) |
| W-L03 | IMPORTANT | Segment magistrali z obciążalnością mniejszą niż poprzedni segment (wąskie gardło) |
| I-L01 | INFO | Linia/kabel z `impedance_override` — parametry nadpisane w trybie EKSPERT |

---

## 4.12 Relacja z kreatorem (Wizard)

### 4.12.1 Krok K6 — Magistrala SN

Kreator w kroku K6 tworzy magistralę SN:

1. Użytkownik wybiera **typ linii/kabla z katalogu** (`LineType` / `CableType`)
2. Użytkownik podaje **długość** (`length_km`)
3. Kreator tworzy `OverheadLine` lub `Cable` z `catalog_ref` i `length_km`
4. Kreator przypisuje `from_bus_ref` i `to_bus_ref` na podstawie topologii
5. Parametry R′, X′, B′ odczytywane z katalogu przez resolver (Decyzja #15, #18)

**Tryb EKSPERT (Decyzja #16 — AS-IS dla override):**
- Użytkownik może aktywować `impedance_override` na instancji
- Override pozwala na podanie własnych wartości R, X, B na całą długość
- Override NIE modyfikuje katalogu — `ParameterSource.OVERRIDE`
- White Box raportuje: parametr z katalogu vs parametr z override

### 4.12.2 Krok K7 — Stacje SN (odcinki do stacji)

Kreator w kroku K7 tworzy odcinki magistrali do stacji pośrednich/końcowych:

1. Użytkownik wybiera typ i długość każdego odcinka
2. Kreator tworzy Bus SN stacji i łączy segmenty
3. Każdy segment = osobny Branch ENM (§4.9)

### 4.12.3 Zakazy kreatora (BINDING)

- Kreator NIE MOŻE tworzyć linii/kabla bez `length_km > 0`
- Kreator NIE MOŻE tworzyć linii/kabla bez typu katalogowego (tryb standardowy)
- Kreator NIE MOŻE łączyć linii/kabla między Bus o różnych `voltage_kv`
- Kreator NIE MOŻE „cicho" modyfikować parametrów typu — zmiana wymaga jawnego trybu EKSPERT

---

## 4.13 Relacja z SLD

### 4.13.1 Symbole SLD

| ENM Element | Symbol SLD | Styl linii | ID symbolu |
|-------------|-----------|-----------|------------|
| `OverheadLine` | Linia ciągła | `strokeDasharray: none` | `line_overhead` |
| `Cable` | Linia przerywana | `strokeDasharray: 8,4` | `line_cable` |

**Plik źródłowy:** `frontend/src/ui/sld/SymbolResolver.ts`

### 4.13.2 Porty symbolu

Oba symbole posiadają dwa porty (left, right) w viewBox `0 0 100 100`:
- `left: {x: 0, y: 50}`
- `right: {x: 100, y: 50}`

### 4.13.3 Kolory i stany

| Stan | Kolor | Źródło |
|------|-------|--------|
| Domyślny | `ETAP_TYPOGRAPHY.labelColor` | `ConnectionRenderer.tsx` |
| Wyłączony | `ETAP_STATE_COLORS.deenergized` | `ConnectionRenderer.tsx` |
| Zaznaczony | `ETAP_STATE_COLORS.selected` | `ConnectionRenderer.tsx` |
| Hover | `ETAP_STATE_COLORS.info` | `ConnectionRenderer.tsx` |

### 4.13.4 Grubość linii

Linie/kable SN mają grubość `ETAP_STROKE.feeder` — cieńszą od szyny zbiorczej (busbar), zgodnie z hierarchią wizualną ETAP-style.

---

## 4.14 Definition of Done — Linie i Kable SN

### Kryteria akceptacji (ALL MUST PASS)

| # | Kryterium | Status |
|---|----------|--------|
| 1 | `OverheadLine` i `Cable` są bytami obliczeniowymi ENM z §2.3 | ✅ AS-IS |
| 2 | Oba dziedziczą po `BranchBase` z `from_bus_ref`/`to_bus_ref` | ✅ AS-IS |
| 3 | Dyskryminator `type`: `"line_overhead"` vs `"cable"` | ✅ AS-IS |
| 4 | `Cable` posiada pole `insulation: XLPE \| PVC \| PAPER` | ✅ AS-IS |
| 5 | `LineType` i `CableType` są frozen dataclasses w `catalog/types.py` | ✅ AS-IS |
| 6 | Katalog zawiera 90+ typów kabli i 14+ typów linii | ✅ AS-IS |
| 7 | Dane cieplne: `jth_1s_a_per_mm2`, `cross_section_mm2`, `get_ith_1s()` | ✅ AS-IS |
| 8 | Resolver `resolve_line_params()` implementuje 3-poziomową precedencję | ✅ AS-IS |
| 9 | `ParameterSource` (OVERRIDE, TYPE_REF, INSTANCE) identyfikuje źródło | ✅ AS-IS |
| 10 | `LineImpedanceOverride` pozwala na nadpisanie impedancji per instancja | ✅ AS-IS |
| 11 | Mapowanie ENM→Solver: `OverheadLine`→`LineBranch(LINE)`, `Cable`→`LineBranch(CABLE)` | ✅ AS-IS |
| 12 | Konwersja `b_siemens_per_km × 10⁶ → b_us_per_km` w `mapping.py` | ✅ AS-IS |
| 13 | PI-model: `Z = (R+jX)·L`, `Y_sh = jB·L`, `Y_sh/end = Y_sh/2` | ✅ AS-IS |
| 14 | Y-bus: per-unit z `Z_base = Vn²/S_base`, `S_base = 100 MVA` | ✅ AS-IS |
| 15 | Multi-segment feeder = sekwencja osobnych Branch (brak bytu „Feeder") | ✅ AS-IS |
| 16 | Ring SN = Bus + Branch + SwitchBranch(open), brak bytu „Ring" | ✅ AS-IS |
| 17 | SLD: linia = solid stroke, kabel = dashed (8,4) | ✅ AS-IS |
| 18 | Walidacje: E005, E003, W001, I002, `LineBranch.validate()` | ✅ AS-IS |
| 19 | Sortowanie deterministyczne po `ref_id` w `mapping.py` | ✅ AS-IS |
| 20 | Parametry zerowe (r0, x0, b0) przechowywane w ENM, pomijane przez solver | ✅ AS-IS |

### Zamknięcie domeny

**DOMENA LINII I KABLI SN W ROZDZIALE 4 JEST ZAMKNIĘTA.**

Sekcje §4.1–§4.14 definiują kompletny kanon modelowania linii napowietrznych i kabli podziemnych SN. Dalsze modyfikacje wymagają ADR i wpisu do Macierzy Decyzji (AUDIT §9).

---

**KONIEC ROZDZIAŁU 4**
