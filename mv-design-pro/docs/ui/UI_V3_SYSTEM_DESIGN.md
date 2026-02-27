# UI V3 System Design — Propozycja ulepszeń MV-Design-PRO

**Wersja:** 1.0
**Status:** TO-BE (propozycja architektoniczna)
**Data:** 2026-02-27
**Perspektywa:** Inżynier projektant sieci SN / OSD
**Referencje:** `docs/spec/` (18 rozdziałów), `SYSTEM_SPEC.md`, `ARCHITECTURE.md`

---

## Autorzy konceptualni

| Rola | Zakres odpowiedzialności |
|------|--------------------------|
| Architekt Systemu (DDD) | Kontrakty, warstwy, determinizm, spójność end-to-end |
| Architekt UI (React/TS) | Ergonomia narzędzia przemysłowego, PowerFactory/ETAP parity |
| Architekt Backend (FastAPI) | Snapshot immutable, operacje domenowe, solvery WHITE BOX |
| Inżynier Elektroenergetyczny / OSD | Realne sieci SN, logika GPZ, magistrale, ring/NOP, stacje |
| Audytor Determinizmu i Jakości | Hash, permutacje, golden networks, strażnicy CI |

---

## 1. STRESZCZENIE WYKONAWCZE

### 1.1 Stan obecny (AS-IS)

MV-Design-PRO jest produkcyjnie dojrzałym systemem z:

| Obszar | Stan | Szczegóły |
|--------|------|-----------|
| **Model sieciowy (ENM)** | 10 typów elementów | Bus, OverheadLine, Cable, Transformer, Source, Generator, Load, SwitchBranch, FuseBranch, Junction |
| **Solvery** | 4 solvery produkcyjne | IEC 60909 SC, Newton-Raphson PF, Gauss-Seidel PF, Fast Decoupled PF |
| **Proof Engine** | 8+ proof packs | SC3F, VDROP, Equipment, PF, Losses, Protection, Earthing, LF Voltage |
| **Zabezpieczenia** | Nadpradowe 50/51/50N/51N | IEC 60255 + IEEE C37.112 + FUSE, TCC chart, koordynacja |
| **Frontend** | 59 modułów UI | SLD Editor (CAD), Wizard K1-K10, Results Browser, Case Manager |
| **Testy** | 1600+ backend, ~138 frontend | pytest + Vitest + Playwright, 4 pipeline CI |
| **Eksport** | 8 formatów | PDF, DOCX, JSON, JSONL, CSV, LaTeX, PNG, SVG |

### 1.2 Zidentyfikowane luki (GAP)

Z perspektywy inżyniera projektanta sieci SN brakuje:

| Kategoria | Luka | Priorytet |
|-----------|------|-----------|
| **Model ENM** | Bateria kondensatorów (ShuntCapacitor), dławik (Reactor), trafo 3-uzwojeniowy, silnik | CRITICAL / HIGH |
| **Solvery** | Analiza harmoniczna, rozruch silnika, niezawodność | HIGH / MEDIUM |
| **Zabezpieczenia** | Odległościowe (21), różnicowe (87), auto-koordynacja nastaw | HIGH / CRITICAL |
| **Workflow** | Dobór kabli, kompensacja mocy biernej, bilans mocy | CRITICAL |
| **Raportowanie** | BOM, tabela kablowa, protokół nastaw, raport projektowy | HIGH |
| **UI/UX** | Dashboard projektu, szybki pasek obliczeń, tryb ciemny | CRITICAL / MEDIUM |
| **Integracje** | Import PowerFactory/ETAP, CIM export, GIS | MEDIUM / LOW |
| **Walidacja** | R/X ratio check, impedancja zerowa, kompletność danych | CRITICAL |

### 1.3 Priorytety (MoSCoW)

| Priorytet | Znaczenie | Elementy |
|-----------|-----------|----------|
| **MUST** | Bez tego inżynier nie może pracować produkcyjnie | ShuntCapacitor, OLTC, Cable Sizing, Power Balance, Dashboard, Auto-coordination, BOM |
| **SHOULD** | Znacząco podnosi wartość narzędzia | Harmonic Analysis, Reactor, Transformer3W, Dark Mode, PN-EN 50160 |
| **COULD** | Przewaga konkurencyjna nad PowerFactory/ETAP | CIM Export, GIS, Distance Relay, Reliability |
| **WONT** (ten cykl) | Wymaga osobnego projektu badawczego | Dynamic Simulation (RMS), Stability Analysis |

---

## 2. MODEL SIECIOWY — nowe elementy ENM

> **Referencje:** `docs/spec/SPEC_CHAPTER_02_ENM_DOMAIN_MODEL.md`, `enm/models.py`
>
> **Zasada:** Nowe elementy dodawane do zamkniętej listy ENM (sekcja 2.2.1 specyfikacji).
> Każdy element wymaga: kontrakt Pydantic, mapping na solver, symbol SLD, krok Wizard, testy.

### 2.1 ShuntCapacitor (bateria kondensatorów) — MUST

**Rola fizyczna:** Kompensacja mocy biernej w sieci SN. Kluczowa dla sieci z OZE (poprawa cos(phi), redukcja strat, stabilizacja napięcia).

**Kontrakt ENM:**

```python
class ShuntCapacitor(ENMElement):
    """Bateria kondensatorów bocznikowych (kompensacja mocy biernej)."""
    bus_ref: str
    q_mvar: float                    # Moc bierna znamionowa [Mvar]
    n_steps: int = 1                 # Liczba stopni (1 = stała, >1 = regulowana)
    q_per_step_mvar: float | None = None  # Moc na stopień [Mvar]
    active_steps: int | None = None  # Aktualnie włączone stopnie
    voltage_kv: float | None = None  # Napięcie znamionowe [kV]
    connection: Literal["star", "delta"] = "star"
    catalog_ref: str | None = None
    parameter_source: Literal["CATALOG", "OVERRIDE"] | None = None
    overrides: list[ParameterOverride] = []
```

**Mapping na solver (Y-bus):**
```
B_shunt = Q_mvar / (U_kv^2) [S]
Y_bus[i,i] += j * B_shunt  (admitancja bocznikowa na szynie)
```

**Wpływ na solver:**
- Power Flow: zmiana profilu napięcia (Q injection na szynie)
- Short Circuit: zaniedbywalne (admitancja bocznikowa pomijana w IEC 60909)

**Symbol SLD:** Dwie równoległe kreski z łukiem (standard IEC)

**Krok Wizard:** K6 (Odbiory i generacja) — nowa sekcja "Kompensacja"

### 2.2 Reactor (dławik) — SHOULD

**Rola fizyczna:** Ograniczanie prądów zwarciowych, filtracja harmonicznych, kompensacja pojemnościowa kabli.

**Kontrakt ENM:**

```python
class Reactor(ENMElement):
    """Dławik szeregowy lub bocznikowy."""
    reactor_type: Literal["series", "shunt"]
    # Dla series: podłączony jako branch
    from_bus_ref: str | None = None
    to_bus_ref: str | None = None
    # Dla shunt: podłączony do szyny
    bus_ref: str | None = None
    x_ohm: float                     # Reaktancja [Ohm]
    r_ohm: float = 0.0              # Rezystancja [Ohm]
    rated_current_a: float | None = None
    rated_voltage_kv: float | None = None
    catalog_ref: str | None = None
    parameter_source: Literal["CATALOG", "OVERRIDE"] | None = None
    overrides: list[ParameterOverride] = []
```

**Mapping na solver:**
- Series: `LineBranch(r_ohm_per_km=r_ohm, x_ohm_per_km=x_ohm, length_km=1.0)`
- Shunt: `Y_bus[i,i] += 1/(R + jX)` (admitancja bocznikowa)

### 2.3 Transformer3W (transformator trójuzwojeniowy) — SHOULD

**Rola fizyczna:** Typowy element GPZ (110/15/6 kV). Modelowany jako 3 dwójniki w układzie gwiazdowym (star equivalent).

**Kontrakt ENM:**

```python
class Transformer3W(ENMElement):
    """Transformator trójuzwojeniowy (GPZ)."""
    hv_bus_ref: str                  # Uzwojenie WN
    mv_bus_ref: str                  # Uzwojenie SN
    lv_bus_ref: str                  # Uzwojenie nN
    sn_mva: float                    # Moc znamionowa [MVA]
    uhv_kv: float                    # Napięcie WN [kV]
    umv_kv: float                    # Napięcie SN [kV]
    ulv_kv: float                    # Napięcie nN [kV]
    uk_hv_mv_percent: float          # Napięcie zwarcia WN-SN [%]
    uk_hv_lv_percent: float          # Napięcie zwarcia WN-nN [%]
    uk_mv_lv_percent: float          # Napięcie zwarcia SN-nN [%]
    pk_hv_mv_kw: float              # Straty zwarcia WN-SN [kW]
    pk_hv_lv_kw: float              # Straty zwarcia WN-nN [kW]
    pk_mv_lv_kw: float              # Straty zwarcia SN-nN [kW]
    vector_group_hv_mv: str | None = None
    vector_group_hv_lv: str | None = None
    catalog_ref: str | None = None
    parameter_source: Literal["CATALOG", "OVERRIDE"] | None = None
    overrides: list[ParameterOverride] = []
```

**Mapping na solver:** Dekompozycja na 3 TransformerBranch (star equivalent z wirtualnym węzłem centralnym):
```
Z_H = (Z_HM + Z_HL - Z_ML) / 2
Z_M = (Z_HM + Z_ML - Z_HL) / 2
Z_L = (Z_HL + Z_ML - Z_HM) / 2
```

### 2.4 Motor (silnik) — COULD

**Rola fizyczna:** Prąd rozruchowy (5-8x In), wkład do prądu zwarciowego (IEC 60909 Table 1).

**Kontrakt ENM:**

```python
class Motor(ENMElement):
    """Silnik asynchroniczny SN."""
    bus_ref: str
    p_mw: float                      # Moc znamionowa [MW]
    cos_phi: float = 0.85            # Współczynnik mocy [-]
    eta: float = 0.95                # Sprawność [-]
    i_lr_ratio: float = 6.0          # Stosunek prądu rozruchowego do znamionowego
    voltage_kv: float | None = None
    motor_type: Literal["induction", "synchronous"] = "induction"
    catalog_ref: str | None = None
    parameter_source: Literal["CATALOG", "OVERRIDE"] | None = None
    overrides: list[ParameterOverride] = []
```

### 2.5 OLTC Logic (logika przełącznika zaczepów) — MUST

**Stan AS-IS:** `Transformer.tap_position` istnieje w ENM, mapowany na `TransformerBranch.tap_position`. Brak logiki automatycznej zmiany zaczepów podczas iteracji Power Flow.

**Propozycja:** Dodanie logiki OLTC do solvera PF Newton-Raphson:

```python
# W power_flow_newton.py — nowa opcja w PowerFlowOptions:
class PowerFlowOptions:
    # ... istniejące pola ...
    oltc_enabled: bool = False
    oltc_target_voltage_pu: float = 1.0
    oltc_deadband_pu: float = 0.01    # +/- 1% deadband
    oltc_max_iterations: int = 10
```

**Algorytm:** Po zbieżności PF sprawdź napięcie na szynie regulowanej. Jeśli |V - V_target| > deadband, zmień tap_position o 1 stopień i powtórz PF. Maksymalnie `oltc_max_iterations` cykli.

**Warstwa:** Solver (power_flow_newton.py) — WHITE BOX trace zawiera historię zmian tapów.

### 2.6 Aktualizacja EnergyNetworkModel (ROOT)

```python
class EnergyNetworkModel(BaseModel):
    header: ENMHeader
    buses: list[Bus] = []
    branches: list[Branch] = []
    transformers: list[Transformer] = []
    transformers_3w: list[Transformer3W] = []          # NOWE
    sources: list[Source] = []
    loads: list[Load] = []
    generators: list[Generator] = []
    motors: list[Motor] = []                            # NOWE
    shunt_capacitors: list[ShuntCapacitor] = []         # NOWE
    reactors: list[Reactor] = []                        # NOWE
    substations: list[Substation] = []
    bays: list[Bay] = []
    junctions: list[Junction] = []
    corridors: list[Corridor] = []
    measurements: list[Measurement] = []
    protection_assignments: list[ProtectionAssignment] = []
```

### 2.7 Nowe typy katalogowe

```python
# W catalog/types.py — nowe typy:

class CapacitorType(CatalogType):
    """Typ baterii kondensatorów."""
    q_mvar: float
    voltage_kv: float
    n_steps: int = 1
    q_per_step_mvar: float | None = None
    connection: str = "star"
    manufacturer: str | None = None

class ReactorType(CatalogType):
    """Typ dławika."""
    x_ohm: float
    r_ohm: float = 0.0
    rated_current_a: float
    rated_voltage_kv: float
    reactor_type: str = "series"  # series | shunt

class MotorType(CatalogType):
    """Typ silnika SN."""
    p_mw: float
    cos_phi: float = 0.85
    eta: float = 0.95
    i_lr_ratio: float = 6.0
    voltage_kv: float
```

### 2.8 CatalogNamespace — rozszerzenie

```python
class CatalogNamespace(Enum):
    # ... istniejące ...
    KONDENSATOR_SN = "KONDENSATOR_SN"    # NOWE
    DLAWIK_SN = "DLAWIK_SN"              # NOWE
    SILNIK_SN = "SILNIK_SN"              # NOWE
```

---

## 3. NOWE SOLVERY — rozszerzenie warstwy obliczeniowej

> **Referencje:** `docs/spec/SPEC_CHAPTER_06_SOLVER_CONTRACTS_AND_MAPPING.md`
>
> **Zasada:** Każdy nowy solver MUSI: (1) być w `network_model/solvers/`, (2) produkować WHITE BOX trace,
> (3) mieć frozen Result API, (4) być deterministyczny (ten sam input = ten sam output).

### 3.1 Harmonic Analysis Solver — SHOULD

**Norma referencyjna:** IEEE 519 / IEC 61000-3-6

**Kontrakt wejściowy:**
```python
@dataclass(frozen=True)
class HarmonicAnalysisInput:
    graph: NetworkGraph
    harmonic_sources: list[HarmonicSource]  # Elementy emitujące harmoniczne
    harmonics_to_analyze: list[int]          # Rzędy harmonicznych [3, 5, 7, 11, 13...]
    base_frequency_hz: float = 50.0
```

**Kontrakt wyjściowy (frozen):**
```python
@dataclass(frozen=True)
class HarmonicAnalysisResult:
    bus_thd_percent: dict[str, float]         # THD na każdej szynie [%]
    bus_harmonics: dict[str, dict[int, complex]]  # Napięcie harmoniczne per szyna per rząd
    branch_harmonics: dict[str, dict[int, complex]]  # Prąd harmoniczny per gałąź per rząd
    thd_limit_violations: list[str]           # Szyny przekraczające limit THD
    white_box_trace: WhiteBoxTrace
```

**Algorytm:** Dla każdego rzędu harmonicznej h:
1. Zbuduj Y-bus(h) = Y-bus z impedancjami przeskalowanymi: `Z(h) = R + j*h*X` dla gałęzi, `Z(h) = R + j*X/h` dla kondensatorów
2. Rozwiąż `V(h) = Y-bus(h)^(-1) * I(h)` gdzie I(h) to wstrzyknięcia harmoniczne
3. Oblicz THD = sqrt(sum(|V(h)|^2 for h > 1)) / |V(1)| * 100%

### 3.2 Motor Starting Solver — COULD

**Norma referencyjna:** IEC 60034 / IEEE 399

**Kontrakt wyjściowy (frozen):**
```python
@dataclass(frozen=True)
class MotorStartingResult:
    voltage_dip_percent: float               # Spadek napięcia przy rozruchu [%]
    starting_current_ka: float               # Prąd rozruchowy [kA]
    starting_time_s: float                   # Czas rozruchu [s]
    voltage_recovery_time_s: float           # Czas powrotu napięcia [s]
    bus_voltages_during_start: dict[str, float]  # Napięcia na szynach podczas rozruchu
    acceptable: bool                         # Czy spadek < 15% (typowy limit)
    white_box_trace: WhiteBoxTrace
```

### 3.3 Reliability Analysis — WONT (ten cykl)

**Norma referencyjna:** IEEE 1366

Wymaga danych o awaryjności elementów (failure rate, repair time) — osobna faza gromadzenia danych.

---

## 4. ZABEZPIECZENIA — rozszerzenia Protection System

> **Referencje:** `docs/spec/SPEC_CHAPTER_09_PROTECTION_SYSTEM.md` (sekcja 9.3.2 — TO-BE)
>
> **Zasada:** Protection NIE jest solverem (NOT-A-SOLVER). Operuje na wynikach solverów.

### 4.1 Auto-koordynacja nastaw — MUST

**Problem:** Inżynier musi ręcznie dobierać TMS dla każdego przekaźnika w łańcuchu.

**Propozycja:** Algorytm automatycznego doboru nastaw wzdłuż ciągu zasilania (feeder chain):

```python
# W application/analyses/protection/ — nowy moduł:

@dataclass(frozen=True)
class AutoCoordinationInput:
    feeder_chain: list[str]               # Uporządkowana lista device_id (od GPZ do końca)
    fault_currents: dict[str, float]       # Prądy zwarciowe na każdym punkcie [A]
    min_grading_margin_s: float = 0.3     # Minimalny margines selektywności [s]
    target_clearing_time_s: float = 0.5   # Docelowy czas wyłączenia na końcu [s]

@dataclass(frozen=True)
class AutoCoordinationResult:
    device_settings: list[DeviceSettingProposal]  # Proponowane nastawy
    coordination_verified: bool                    # Czy selektywność zachowana
    grading_margins: list[GradingMargin]           # Marginesy między parami
    warnings: list[str]                            # Ostrzeżenia
```

**Algorytm:**
1. Zacznij od najdalszego urządzenia (koniec feedera) — ustaw pickup na 1.25 * I_load, TMS na minimalny
2. Dla każdego urządzenia w górę feedera: oblicz czas zadziałania downstream, dodaj grading margin, wyznacz TMS
3. Sprawdź czułość (I_sc_min / I_pickup > 1.5) i selektywność (delta_t > grading_margin) na każdym odcinku
4. Raportuj wynik z pełnym śladem WHITE BOX

### 4.2 Distance Relay (21/21N) — COULD

**Stan AS-IS:** Enum `DISTANCE` zdefiniowany w `ProtectionDeviceType` (code), brak implementacji.

**Propozycja kontraktu:**

```python
@dataclass(frozen=True)
class DistanceZoneSettings:
    zone: Literal["Z1", "Z2", "Z3", "Z4"]
    reach_ohm: float                     # Zasięg impedancyjny [Ohm]
    reach_percent: float                 # Zasięg jako % impedancji linii
    time_s: float                        # Czas zadziałania [s]
    direction: Literal["forward", "reverse", "non_directional"] = "forward"
    characteristic: Literal["mho", "quadrilateral"] = "mho"

@dataclass(frozen=True)
class DistanceProtectionSettings:
    zones: list[DistanceZoneSettings]
    ct_ratio: str                        # np. "400/5"
    vt_ratio: str                        # np. "15000/100"
    line_impedance_ohm: complex          # Impedancja chronionej linii
```

### 4.3 Arc Flash Analysis — SHOULD

**Norma referencyjna:** IEEE 1584-2018

**Kontrakt:**

```python
@dataclass(frozen=True)
class ArcFlashResult:
    incident_energy_cal_per_cm2: float   # Energia incydentalna [cal/cm2]
    arc_flash_boundary_mm: float         # Granica łuku [mm]
    hazard_category: int                 # Kategoria zagrożenia (0-4)
    required_ppe: str                    # Wymagane środki ochrony
    clearing_time_s: float               # Czas wyłączenia zwarcia [s]
    bolted_fault_current_ka: float       # Prąd zwarciowy [kA]
    arcing_current_ka: float             # Prąd łuku [kA]
    working_distance_mm: float           # Odległość robocza [mm]
    white_box_trace: WhiteBoxTrace
```

**Warstwa:** Analysis (NIE solver) — operuje na wynikach SC + protection settings.

### 4.4 Rozszerzony SPZ (79) — COULD

**Stan AS-IS:** `SPZFromInstantaneousCheck` w sanity checks.

**Propozycja:** Pełna logika sekwencji SPZ:
- Szybki SPZ (t1 = 0.3-0.5s) → pauza (0.5-1.0s) → wolny SPZ (t2 = 0.5-1.5s) → blokada
- Konfigurowalna liczba prób (1-3)
- Dead-time settings

---

## 5. WORKFLOW INŻYNIERSKI — nowe przepływy pracy

> **Perspektywa OSD:** Inżynier projektant sieci SN oczekuje narzędzi do codziennej pracy projektowej.

### 5.1 Dobór kabli (Cable Sizing Wizard) — MUST

**Problem:** Inżynier musi ręcznie weryfikować 3 kryteria dla każdego kabla.

**Algorytm 3-krokowy:**

| Krok | Kryterium | Norma | Wzór |
|------|-----------|-------|------|
| 1 | Obciążalność prądowa | IEC 60287 | `I_load <= I_z * k_derating` |
| 2 | Spadek napięcia | PN-EN 50160 | `delta_U = (P*R + Q*X) / (U_n * cos_phi) < 5%` |
| 3 | Wytrzymałość zwarciowa | IEC 60949 | `S_min = I_th * sqrt(t_off) / k_material` |

**UI:** Dialog "Dobór przekroju" dostępny z kontekstowego menu kabla na SLD:
1. Wybierz kabel na SLD → prawy klik → "Dobierz przekrój"
2. System oblicza minimalny przekrój z 3 kryteriów
3. Proponuje typ z katalogu (najbliższy większy przekrój)
4. Generuje raport z uzasadnieniem (proof step)

**Integracja z SLD:** Kabel z niedobranym przekrojem oznaczony kolorem ostrzegawczym.

### 5.2 Bilans mocy (Power Balance Report) — MUST

**Problem:** Brak zestawienia P/Q/S na poziomie stacji/obwodu/sieci.

**Kontrakt:**

```python
@dataclass(frozen=True)
class PowerBalanceReport:
    total_generation_mw: float
    total_generation_mvar: float
    total_load_mw: float
    total_load_mvar: float
    total_losses_mw: float
    total_losses_mvar: float
    compensation_mvar: float              # Moc baterii kondensatorów
    cos_phi_network: float                # Współczynnik mocy sieci
    per_station: list[StationBalance]     # Bilans per stacja
    per_feeder: list[FeederBalance]       # Bilans per magistrala
    balance_check: bool                   # P_gen = P_load + P_losses?
```

**UI:** Nowa zakładka "Bilans mocy" w Results Inspector + widoczna w Dashboard.

### 5.3 Dobór kompensacji (Compensation Sizing) — SHOULD

**Problem:** Inżynier musi ręcznie obliczać moc baterii kondensatorów.

**Algorytm:**
1. Zmierz cos(phi) na szynie GPZ z wyników PF
2. Oblicz Q_c = P * (tan(phi_1) - tan(phi_2)) [Mvar] dla docelowego cos(phi)
3. Zaproponuj baterie z katalogu (n_steps, q_per_step)
4. Sprawdź wpływ na profil napięcia (re-run PF z dodaną kompensacją)

### 5.4 Sprawdzenie PN-EN 50160 — SHOULD

**Problem:** Brak automatycznej weryfikacji jakości napięcia.

**Kryteria:**
- Odchylenie napięcia: U_n +/- 10% (95% czasu)
- Migotanie: P_lt <= 1.0
- Asymetria: u_2/u_1 <= 2%
- THD: <= 8% (gdy solver harmoniczny dostępny)

**Wynik:** Tablica z flagami PASS/FAIL per szyna + raport normatywny.

---

## 6. RAPORTOWANIE — nowe formaty eksportu

> **Referencje:** `docs/spec/SPEC_CHAPTER_11_REPORTING_AND_EXPORT.md`, `docs/spec/SPEC_CHAPTER_13_REPORTING_AND_EXPORTS.md`
>
> **Zasada:** Każdy raport musi być deterministyczny (Determinism Rule).

### 6.1 Raport projektowy sieci SN — MUST

**Struktura PDF (50+ stron):**

| Sekcja | Zawartość | Źródło danych |
|--------|-----------|---------------|
| 1. Strona tytułowa | Nazwa projektu, data, autor, wersja ENM | ENMHeader |
| 2. Opis techniczny | Topologia, napięcia, zasilanie | ENM + Substations |
| 3. Schemat jednokreskowy | SLD eksport (PNG/SVG) | SLD snapshot |
| 4. Tabela kablowa | ID, typ, trasa, długość, przekrój | Branches + Catalog |
| 5. Specyfikacja transformatorów | Sn, uk%, Pk, grupa połączeń | Transformers + Catalog |
| 6. Bilans mocy | P/Q/S per stacja/feeder | PowerBalanceReport |
| 7. Wyniki zwarciowe | Ik'', ip, Ith per szyna | ShortCircuitResult |
| 8. Wyniki rozpływu | U, I, loading% per element | PowerFlowResult |
| 9. Koordynacja zabezpieczeń | TCC chart, nastawy, selektywność | ProtectionAnalysis |
| 10. Dobór kabli | Uzasadnienie przekrojów (3 kryteria) | CableSizingResult |
| 11. Raport normatywny | Zgodność z IEC 60909, PN-EN 50160 | NormativeCheck |
| 12. Zestawienie materiałowe (BOM) | Materiały, ilości, typy | Catalog + Quantities |

**Implementacja:** `analysis/reporting/project_report_generator.py` — orchestrator zbierający dane ze wszystkich modułów.

### 6.2 Zestawienie materiałowe (BOM) — SHOULD

**Kolumny:**

| Lp. | Typ elementu | Nazwa katalogowa | Producent | Ilość | Jednostka | Uwagi |
|-----|-------------|-----------------|-----------|-------|-----------|-------|
| 1 | Kabel SN | XRUHAKXS 12/20kV 3x240mm2 | ... | 2.35 | km | Magistrala A |
| 2 | Transformator | ONAN 630kVA 15/0.4kV | ... | 3 | szt. | Stacje S1-S3 |

**Źródło:** ENM elements + catalog_ref → CatalogType → quantity aggregation.

**Format:** PDF + XLSX (z formułami do edycji).

### 6.3 Tabela kablowa — SHOULD

**Kolumny:**

| ID kabla | Typ | Od | Do | Długość [km] | Przekrój [mm2] | In [A] | Ith [kA] | Uwagi |
|----------|-----|----|----|-------------|---------------|--------|----------|-------|

**Źródło:** ENM branches (type=cable) + catalog + mapping to bus names.

### 6.4 Protokół nastaw zabezpieczeń — SHOULD

**Kolumny:**

| Pole | Wyłącznik | Przekaźnik | I> [A] | t> [s] | I>> [A] | t>> [s] | I0> [A] | t0> [s] | TMS | Krzywa |
|------|-----------|-----------|--------|--------|---------|---------|---------|---------|-----|--------|

**Źródło:** ProtectionDevice settings + ProtectionAssignment → Bay → Substation mapping.

**Format:** PDF/DOCX — gotowy do wydruku dla służb eksploatacyjnych.

---

## 7. INTERFEJS UŻYTKOWNIKA — ulepszenia UX

> **Referencje:** `docs/ui/UI_ETAP_POWERFACTORY_PARITY.md`, `docs/ui/powerfactory_ui_parity.md`
>
> **Zasada PowerFactory:** Layout narzędziowy ZAWSZE jest renderowany. Brak danych = komunikat, NIE brak UI.

### 7.1 Dashboard projektu — MUST

**Route:** `#dashboard`

**Mockup:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  DASHBOARD PROJEKTU: Sieć SN Miejska Zachód                         │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│  TOPOLOGIA       │  BILANS MOCY     │  GOTOWOŚĆ        │  WYNIKI      │
│  ──────────────  │  ──────────────  │  ──────────────  │  ──────────  │
│  Szyny: 24       │  P_gen: 12.5 MW  │  SC 3F: READY    │  SC: FRESH   │
│  Kable: 18       │  P_load: 11.8 MW │  PF NR: READY    │  PF: FRESH   │
│  Trafo: 6        │  Straty: 0.7 MW  │  Protection:     │  Prot: NONE  │
│  Źródła: 2       │  cos(phi): 0.92  │    READY         │              │
│  OZE: 3x PV      │  Q_comp: 2.1 Mvar│  Harmonics: N/A  │              │
│  Odbiory: 15     │                  │                  │              │
├─────────────────┴─────────────────┴─────────────────┴───────────────┤
│  OSTATNIE AKCJE                                                       │
│  ──────────────────────────────────────────────────────────────────── │
│  [14:32] Obliczenia zwarciowe zakończone (run_id: abc123)             │
│  [14:28] Dodano kabel K-12 (XRUHAKXS 3x240mm2, 0.85 km)             │
│  [14:15] Zmieniono nastawę I> przekaźnika REL-GPZ na 450A             │
├─────────────────────────────────────────────────────────────────────┤
│  SZYBKIE AKCJE                                                        │
│  [Oblicz zwarcie] [Oblicz rozpływ] [Eksportuj raport] [Kreator]      │
└─────────────────────────────────────────────────────────────────────┘
```

**Komponenty React:**

```typescript
// ui/dashboard/DashboardPage.tsx
export function DashboardPage() {
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const resultStatus = useAppStateStore((s) => s.activeCaseResultStatus);

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      <TopologyCard snapshot={snapshot} />
      <PowerBalanceCard snapshot={snapshot} />
      <ReadinessCard />
      <ResultsStatusCard status={resultStatus} />
      <RecentActionsPanel />
      <QuickActionsBar />
    </div>
  );
}
```

### 7.2 Szybki pasek obliczeń (Quick Calc Bar) — SHOULD

**Problem:** Inżynier musi przechodzić przez menu/wizard żeby uruchomić obliczenia.

**Propozycja:** Sticky bar na dole SLD Editor:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Oblicz SC 3F ▼] [Oblicz PF NR ▼] │ Status: FRESH │ Ostatni: 14:32 │
└─────────────────────────────────────────────────────────────────────┘
```

**Funkcjonalność:**
- 1-click obliczenia zwarciowe / rozpływowe
- Dropdown z opcjami (typ zwarcia: 3F/1F/2F, metoda PF: NR/GS/FD)
- Status ostatniego przebiegu
- Po zakończeniu — automatyczny overlay wyników na SLD

### 7.3 Inline SLD Element Addition — SHOULD

**Problem:** Nowe elementy można dodawać TYLKO przez Wizard K1-K10.

**Propozycja:** Toolbar na canvas SLD z ikonami elementów:

```
┌──────────────────────────────────────┐
│ [Bus] [Cable] [Trafo] [Load] [Gen]  │  ← Toolbar
│ [Switch] [Source] [Capacitor] [Fuse] │
└──────────────────────────────────────┘
```

**Flow:** Kliknij ikonę → kliknij na canvas → element dodany z domyślnymi parametrami → otwarty PropertyGrid do edycji.

**Implementacja:** Nowy command w `SldEditorStore`: `addElementAtPosition(type, x, y)` → emituje operację domenową → odświeża snapshot.

### 7.4 Dark Mode — COULD

**Problem:** Brak trybu ciemnego dla długich sesji projektowych.

**Propozycja:** CSS custom properties + ThemeStore (Zustand):

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #111827;
  --border: #d1d5db;
  --accent: #2563eb;
}

[data-theme="dark"] {
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --text-primary: #f9fafb;
  --border: #374151;
  --accent: #3b82f6;
}
```

**Store:** `ui/theme/themeStore.ts` z persist (localStorage).

### 7.5 ENM Version Diff — COULD

**Problem:** Brak widoczności co się zmieniło między wersjami modelu.

**Propozycja:** Porównanie dwóch snapshotów ENM pole-po-polu:

```typescript
interface EnmDiffEntry {
  element_ref: string;
  field: string;
  old_value: string | number | null;
  new_value: string | number | null;
  change_type: 'added' | 'removed' | 'modified';
}
```

**UI:** Tabela zmian z kolorowaniem (zielone = dodane, czerwone = usunięte, żółte = zmienione).

---

## 8. INTEGRACJE ZEWNĘTRZNE

> **Referencje:** `docs/spec/SPEC_CHAPTER_16_EXTERNAL_INTEGRATIONS.md`

### 8.1 XLSX Enhanced Export — SHOULD

**Problem:** Obecny eksport XLSX jest jednowarstwowy.

**Propozycja:** Multi-sheet workbook:

| Arkusz | Zawartość |
|--------|-----------|
| Szyny | ref_id, name, voltage_kv, zone |
| Kable | ref_id, name, from, to, length, R, X, catalog_ref |
| Transformatory | ref_id, name, Sn, Uk%, Pk, vector_group |
| Źródła | ref_id, name, Sk3, R/X |
| Odbiory | ref_id, name, P, Q, model |
| Generatory | ref_id, name, P, Q, type |
| Wyniki SC | bus, Ik'', ip, Ith |
| Wyniki PF | bus, U[pu], angle, P, Q |

**Implementacja:** `analysis/reporting/xlsx_export.py` z openpyxl.

### 8.2 PowerFactory .dgs Import — COULD

**Kontrakt parsera:**

```python
class DgsParser:
    def parse(self, file_path: str) -> EnergyNetworkModel:
        """Parse DIgSILENT .dgs file → ENM."""
        # .dgs = JSON-like format with ElmTerm, ElmLne, ElmTr2, ElmXnet, ElmLod
        # Mapping: ElmTerm → Bus, ElmLne → OverheadLine/Cable, etc.
```

### 8.3 CIM IEC 61970 Export — COULD

**Kontrakt:**

```python
class CimExporter:
    def export(self, enm: EnergyNetworkModel) -> str:
        """Export ENM → CIM XML (IEC 61970-452)."""
        # Bus → cim:ConnectivityNode
        # Cable → cim:ACLineSegment
        # Transformer → cim:PowerTransformer
```

---

## 9. WYDAJNOŚĆ I SKALOWALNOŚĆ

### 9.1 Sparse Y-bus Matrix — SHOULD

**Problem:** Obecna macierz Y-bus jest gęsta (numpy dense). Dla sieci >100 szyn staje się nieefektywna.

**Propozycja:** Zastąpienie `numpy.ndarray` przez `scipy.sparse.csc_matrix` w `network_model/core/ybus.py`.

**Wpływ:** O(n) pamięci zamiast O(n^2). Faktoryzacja LU z scipy.sparse.linalg.

### 9.2 Batch Execution Engine — COULD

**Problem:** Brak masowego wykonywania obliczeń (np. sensitivity analysis na 100 scenariuszy).

**Propozycja:**

```python
@dataclass(frozen=True)
class BatchExecutionRequest:
    base_case_id: str
    parameter_variations: list[ParameterVariation]  # Co zmieniać
    analysis_types: list[str]                        # Jakie analizy uruchomić

@dataclass(frozen=True)
class BatchExecutionResult:
    runs: list[AnalysisRun]
    summary: BatchSummary   # Min/Max/Avg per bus/branch
```

**Implementacja:** Celery task z równoległym wykonywaniem wariantów.

---

## 10. WALIDACJA I JAKOŚĆ DANYCH

> **Referencje:** `docs/spec/SPEC_CHAPTER_12_VALIDATION_AND_QA.md`, `enm/validator.py`

### 10.1 Nowe reguły walidacyjne — MUST

| Kod | Severity | Walidacja | Opis PL |
|-----|----------|-----------|---------|
| W009 | IMPORTANT | R/X ratio | Stosunek R/X kabla powinien być w zakresie 0.1-3.0 dla typowych kabli SN |
| W010 | IMPORTANT | Zero-sequence | Impedancja zerowa r0/x0 powinna być zdefiniowana dla obliczeń 1F |
| W011 | IMPORTANT | Transformer tap | Pozycja zaczepów tap_position powinna być w zakresie [tap_min, tap_max] |
| W012 | INFO | Catalog completeness | Element bez catalog_ref — parametry ręczne, brak weryfikacji katalogowej |
| W013 | IMPORTANT | Cable length | Długość kabla SN > 50 km jest nierealistyczna — sprawdź dane |
| W014 | IMPORTANT | Load magnitude | Obciążenie P > 50 MW na jednej szynie SN jest nierealistyczne |
| E009 | BLOCKER | Capacitor Q | Moc bierna baterii kondensatorów q_mvar musi być > 0 |
| E010 | BLOCKER | Reactor X | Reaktancja dławika x_ohm musi być > 0 |

### 10.2 Data Completeness Score — COULD

**Kontrakt:**

```python
@dataclass(frozen=True)
class CompletenessScore:
    overall_percent: float               # % wypełnienia danych
    per_element_type: dict[str, float]   # % per typ elementu
    missing_fields: list[MissingField]   # Lista brakujących pól
    minimum_for_sc: float                # Minimum do obliczeń SC
    minimum_for_pf: float                # Minimum do obliczeń PF
```

---

## 11. OZE — rozszerzenia

> **Referencje:** `docs/spec/SPEC_CHAPTER_07_SOURCES_GENERATORS_LOADS.md` (TO-BE)

### 11.1 Generation Profile P(t) — SHOULD

**Problem:** Generator ma stałe P/Q. Brak profilu czasowego generacji PV/wiatr.

**Propozycja:**

```python
class GenerationProfile(BaseModel):
    """Profil generacji OZE (15-minutowy lub godzinowy)."""
    generator_ref: str
    interval_minutes: int = 60           # 15 lub 60 minut
    timestamps: list[datetime]
    p_mw_values: list[float]
    q_mvar_values: list[float] | None = None  # Opcjonalnie Q
```

**UI:** Wykres profilu generacji w PropertyGrid generatora + import z CSV.

### 11.2 Hosting Capacity — WONT (ten cykl)

**Problem:** Ile OZE można podłączyć do danej szyny bez naruszenia ograniczeń?

**Algorytm:** Iteracyjne zwiększanie P_gen na szynie i sprawdzanie: napięcie < U_max, prąd < I_n, THD < limit.

---

## 12. FAZY IMPLEMENTACJI

### 12.1 Roadmap 10 faz

```
                    ┌─── V3.1: MUST ────────────────────────────┐
                    │ ShuntCapacitor + OLTC + Cable Sizing       │
                    │ + Power Balance + Dashboard                │
Faza 1 (MUST)       │ ~25 backend + ~15 frontend files           │
                    └────────────────────────────────────────────┘
                              │
                    ┌─── V3.2: MUST ────────────────────────────┐
                    │ Auto-coordination + Protection Wizard      │
Faza 2 (MUST)       │ + Arc Flash + Protection Report            │
                    │ ~20 backend + ~10 frontend files           │
                    └────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
    ┌─── V3.3 ─────┐  ┌─── V3.4 ─────┐  ┌─── V3.5 ─────┐
    │ Harmonic      │  │ Project Report│  │ Quick Calc    │
    │ Solver + THD  │  │ + BOM + Cable │  │ + Inline SLD  │
    │ + PN-EN 50160 │  │ Schedule      │  │ + Dark Mode   │
    │ SHOULD        │  │ MUST          │  │ SHOULD        │
    └───────────────┘  └───────────────┘  └───────────────┘
              │                │                 │
    ┌─── V3.6 ─────┐  ┌─── V3.7 ─────┐  ┌─── V3.8 ─────┐
    │ Reactor +     │  │ CIM Export +  │  │ Reliability + │
    │ Transformer3W │  │ PowerFactory  │  │ Hosting Cap + │
    │ + Motor Start │  │ Import        │  │ Distance (21) │
    │ SHOULD        │  │ COULD         │  │ COULD         │
    └───────────────┘  └───────────────┘  └───────────────┘
              │                │
    ┌─── V3.9 ─────┐  ┌─── V3.10 ────┐
    │ GIS + SCADA + │  │ Dynamic Sim  │
    │ ENM Diff      │  │ (RMS)        │
    │ COULD         │  │ WONT         │
    └───────────────┘  └──────────────┘
```

### 12.2 Szczegóły implementacyjne per faza

#### Faza V3.1 (MUST — fundament)

**Backend:**

| Plik | Akcja | Opis |
|------|-------|------|
| `enm/models.py` | EDIT | Dodaj ShuntCapacitor, aktualizuj EnergyNetworkModel |
| `enm/mapping.py` | EDIT | Mapping ShuntCapacitor → Y-bus shunt admittance |
| `enm/validator.py` | EDIT | Reguły E009, W009-W014 |
| `network_model/catalog/types.py` | EDIT | Dodaj CapacitorType |
| `network_model/catalog/mv_capacitor_catalog.py` | CREATE | Katalog baterii kondensatorów SN |
| `network_model/solvers/power_flow_newton.py` | EDIT | OLTC logic (tap stepping) |
| `application/analyses/cable_sizing/` | CREATE | Moduł doboru kabli |
| `application/analyses/power_balance/` | CREATE | Moduł bilansu mocy |
| `analysis/reporting/project_report_generator.py` | CREATE | Generator raportu projektowego |

**Frontend:**

| Plik | Akcja | Opis |
|------|-------|------|
| `ui/dashboard/DashboardPage.tsx` | CREATE | Strona Dashboard |
| `ui/dashboard/TopologyCard.tsx` | CREATE | Karta topologii |
| `ui/dashboard/PowerBalanceCard.tsx` | CREATE | Karta bilansu mocy |
| `ui/dashboard/ReadinessCard.tsx` | CREATE | Karta gotowości |
| `ui/dashboard/QuickActionsBar.tsx` | CREATE | Szybkie akcje |
| `App.tsx` | EDIT | Dodaj route #dashboard |
| `types/enm.ts` | EDIT | Dodaj ShuntCapacitor type |
| `ui/sld/symbols/` | EDIT | Symbol baterii kondensatorów |

**Testy:**

| Plik | Opis |
|------|------|
| `tests/enm/test_shunt_capacitor.py` | Walidacja ShuntCapacitor w ENM |
| `tests/network_model/test_ybus_capacitor.py` | Test Y-bus z admitancją bocznikową |
| `tests/application/test_cable_sizing.py` | Test doboru kabli (3 kryteria) |
| `tests/application/test_power_balance.py` | Test bilansu mocy |

#### Faza V3.2 (MUST — zabezpieczenia)

**Backend:**

| Plik | Akcja | Opis |
|------|-------|------|
| `application/analyses/protection/auto_coordination.py` | CREATE | Auto-koordynacja nastaw |
| `application/analyses/protection/arc_flash.py` | CREATE | Arc flash IEEE 1584 |
| `analysis/reporting/protection_report.py` | CREATE | Protokół nastaw |
| `domain/protection_device.py` | EDIT | Dodaj DistanceProtectionSettings |

**Frontend:**

| Plik | Akcja | Opis |
|------|-------|------|
| `ui/protection-coordination/AutoCoordinationPanel.tsx` | CREATE | Panel auto-koordynacji |
| `ui/protection-coordination/ArcFlashResultPanel.tsx` | CREATE | Wyniki arc flash |

#### Faza V3.4 (MUST — raportowanie)

**Backend:**

| Plik | Akcja | Opis |
|------|-------|------|
| `analysis/reporting/bom_generator.py` | CREATE | Generator BOM |
| `analysis/reporting/cable_schedule.py` | CREATE | Tabela kablowa |
| `analysis/reporting/xlsx_export.py` | CREATE | Multi-sheet XLSX |
| `analysis/reporting/normative_report.py` | CREATE | Raport normatywny |

### 12.3 Macierz zależności

```
                    ShuntCapacitor ──→ PowerBalance ──→ Dashboard
                         │                                 │
                         ▼                                 ▼
                    Mapping (Y-bus) ──→ PF with OLTC ──→ CableSizing
                                                           │
                                                           ▼
                                                      ProjectReport ──→ BOM + CableSchedule
                                                           │
                    AutoCoordination ──→ ProtectionReport ──┘
                         │
                         ▼
                    ArcFlash (IEEE 1584)
```

### 12.4 Kryteria akceptacji per faza

| Faza | Definition of Done |
|------|-------------------|
| V3.1 | ShuntCapacitor w ENM + mapping + validator + katalog + OLTC w PF + Cable Sizing wizard + Power Balance report + Dashboard page + 20+ nowych testów |
| V3.2 | Auto-coordination algorithm + Arc Flash analysis + Protection settings protocol + 15+ testów |
| V3.3 | Harmonic solver + THD overlay na SLD + PN-EN 50160 check + 10+ testów |
| V3.4 | Project Report PDF + BOM XLSX + Cable Schedule + Normative Report + 10+ testów |
| V3.5 | Quick Calc Bar + Inline SLD add + Dark Mode + 8+ testów |

---

## 13. NIEZMIENNIKI ARCHITEKTONICZNE (BINDING)

Każda zmiana z tego dokumentu MUSI respektować:

| # | Niezmiennik | Weryfikacja |
|---|-------------|-------------|
| 1 | NOT-A-SOLVER: Fizyka TYLKO w `network_model/solvers/` | `scripts/arch_guard.py` |
| 2 | WHITE BOX: Każdy solver produkuje `white_box_trace` | Testy unit |
| 3 | SINGLE MODEL: Jeden ENM per projekt (singleton) | `scripts/pcc_zero_guard.py` |
| 4 | FROZEN RESULT API: Wyniki immutable po utworzeniu | mypy strict |
| 5 | DETERMINISM: Ten sam input = ten sam output | SHA-256 fingerprint tests |
| 6 | NO CODENAMES: Brak P11/P14 etc. w UI strings | `scripts/no_codenames_guard.py` |
| 7 | POLISH UI: Etykiety po polsku, kod po angielsku | Manual review |
| 8 | CASE IMMUTABILITY: Case nie mutuje ENM | Domain tests |
| 9 | CATALOG IMMUTABLE: Typy katalogowe frozen | Catalog governance |
| 10 | LAYER BOUNDARIES: Warstwa X nie importuje z warstwy Y | `scripts/solver_boundary_guard.py` |

---

## 14. ZAKAZY (BINDING)

1. **ZAKAZANE** dodawanie fizyki do Protection, Frontend, Reporting, Wizard, SLD, Validation, Proof Engine, Analysis
2. **ZAKAZANE** tworzenie shadow/duplicate data models (ENM jest jedynym modelem)
3. **ZAKAZANE** modyfikowanie Frozen Result API bez major version bump
4. **ZAKAZANE** stosowanie heurystyk / auto-selekcji w Protection (dobór ręczny lub na żądanie)
5. **ZAKAZANE** dodawanie BoundaryNode / PCC do ENM
6. **ZAKAZANE** stosowanie codenames (P11, P14, P17, P20) w UI strings
7. **ZAKAZANE** pomijanie WHITE BOX trace w nowych solverach
8. **ZAKAZANE** niedeterministyczne sortowanie (zawsze `sorted(key=lambda x: x.ref_id)`)
9. **ZAKAZANE** używanie `random`, `uuid4()` w solverach i proof engine (tylko `uuid5` deterministyczny)

---

## 15. SCENARIUSZE TESTOWE (Golden Paths)

### 15.1 Minimalna sieć z kompensacją

```
Source(GPZ) → Bus(15kV) → Cable(3x240, 5km) → Bus(15kV) → Load(2MW, 1.2Mvar)
                                                          → ShuntCapacitor(0.5Mvar)
```

**Oczekiwane:**
- PF: napięcie na szynie odbiorczej wyższe z kompensacją niż bez
- cos(phi) na GPZ bliższy 1.0
- Power Balance: P_gen = P_load + P_losses

### 15.2 Sieć z auto-koordynacją

```
GPZ → REL-1(I>/I>>) → Cable → REL-2(I>/I>>) → Cable → REL-3(I>) → Load
```

**Oczekiwane:**
- Auto-coordination: TMS_1 > TMS_2 > TMS_3
- Grading margins >= 0.3s na każdej parze
- Sensitivity: I_sc_min / I_pickup > 1.5 na każdym przekaźniku

### 15.3 Sieć z OZE i harmonicznymi

```
Source → Bus → Cable → Bus → PV_Inverter(1MW)
                            → Load(0.8MW, cos_phi=0.9)
                            → ShuntCapacitor(0.3Mvar)
```

**Oczekiwane (gdy Harmonic Solver dostępny):**
- THD < 8% (limit PN-EN 50160)
- Napięcie 5. harmonicznej < 6% (limit IEEE 519)
- Brak rezonansu kondensator-sieć

### 15.4 Dobór kabla — weryfikacja 3 kryteriów

```
Source → Bus(15kV) → Cable(?) → Bus(15kV) → Load(3MW, 2Mvar)
```

**Oczekiwane:**
- Cable Sizing Wizard proponuje kabel spełniający WSZYSTKIE 3 kryteria
- Kryterium 1 (ampacity): S >= I_load / I_z
- Kryterium 2 (voltage drop): delta_U < 5%
- Kryterium 3 (SC withstand): S >= I_th * sqrt(t) / k

---

**KONIEC DOKUMENTU**

**Następne kroki:**
1. Architektoniczna recenzja kontraktów (§2, §3, §4) przez zespół solverowy
2. Implementacja Fazy V3.1 (MUST) — ShuntCapacitor + OLTC + Cable Sizing + Dashboard
3. Aktualizacja `docs/spec/` z nowymi kontraktami (AS-IS po implementacji)
4. Rozszerzenie CI guards o nowe elementy ENM
