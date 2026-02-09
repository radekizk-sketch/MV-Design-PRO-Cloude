# Rozdział 10 — Scenariusze Obliczeniowe & Study Cases (ETAP-Grade)

**Wersja:** 1.0
**Status:** AS-IS (z sekcjami TO-BE jawnie oznaczonymi)
**Warstwa:** Domain (StudyCase, AnalysisRun) + Application (Service, DTO) + Infrastructure (Persistence, Snapshot)
**Zależności:** Rozdział 2 (ENM Domain), Rozdział 5 (§5.9 — Study Case architektura), Rozdział 6 (Solver Contracts), Rozdział 7 (§7.A.4 — StudyCaseContext), Rozdział 8 (§8.A.3 — Macierz zmian)
**Decision Matrix:** Decyzje #68 (StudyCaseContext), #71 (Macierz zmian), nowe decyzje #72–#79
**Kod źródłowy:** `domain/study_case.py`, `domain/analysis_run.py`, `domain/models.py`, `application/study_case/service.py`, `application/analysis_run/service.py`, `application/analysis_run/dtos.py`, `application/study_scenario/models.py`, `infrastructure/persistence/models.py`, `api/study_cases.py`, `api/analysis_runs.py`, `api/case_runs.py`

---

## §10.0 — Zakres i cel rozdziału

### §10.0.1 Cel

Niniejszy rozdział definiuje **kanoniczny system scenariuszy obliczeniowych MV-DESIGN-PRO** na poziomie ETAP-grade, obejmujący:
- hierarchię Project → ENM → StudyCase → AnalysisRun → Result + WhiteBoxTrace,
- model danych StudyCase (frozen, config-only, immutable per ENM),
- model danych AnalysisRun (frozen, jednorazowe wykonanie, state machine),
- cykl życia wyników (NONE → FRESH → OUTDATED),
- mechanizm snapshotów sieci (NetworkSnapshot, fingerprint),
- deterministyczną kanonicalizację danych wejściowych (input_hash SHA-256),
- deduplikację wyników (P20a),
- porównanie scenariuszy (StudyCaseComparison),
- hierarchię P10 (Study → Scenario → Run → Snapshot),
- opcje solverów (PowerFlowOptions, ShortCircuitOptions),
- API i kontrakt UI.

### §10.0.2 Zasada nadrzędna (BINDING — Decyzja #72)

> **Study Case = zestaw warunków brzegowych + konfiguracja analiz
> zastosowana do NIEZMIENNEGO ENM.**

Study Case:
- **NIE jest** kopią ENM,
- **NIE jest** wariantem topologii,
- **NIE zawiera** bytów obliczeniowych (Bus, Branch, Source, etc.),
- **NIE modyfikuje** katalogów typów,
- **NIE przechowuje** wyników obliczeń (tylko referencje do wyników).

Study Case jest **kontraktem sterującym solverami**.

### §10.0.3 Referencja do Rozdziału 5 (§5.9)

Rozdział 5 §5.9 definiuje **podstawowy kontrakt architektoniczny** Study Case (immutability, cykl życia, invalidacja). Niniejszy Rozdział 10 **implementuje i rozszerza** ten kontrakt na poziomie ETAP-grade. Ustalenia z §5.9 są BINDING i NIE są powtarzane — jedynie referencowane.

---

## §10.1 — Hierarchia bytów (BINDING — Decyzja #72)

### §10.1.1 Kanoniczny diagram hierarchii

```
Project
  └── EnergyNetworkModel (ENM)
        │
        ├── NetworkSnapshot (immutable, fingerprint SHA-256)
        │     └── snapshot_json: frozen dict
        │
        └── StudyCase [1..N] (config-only, frozen)
              │
              ├── StudyCaseConfig (parametry obliczeń)
              ├── ProtectionConfig (konfiguracja zabezpieczeń)
              │
              └── AnalysisRun [0..M] (jednorazowe wykonanie, frozen)
                    │
                    ├── input_snapshot (kanonicalizowany JSON)
                    ├── input_hash (SHA-256)
                    │
                    └── Result + WhiteBoxTrace (frozen, immutable)
```

### §10.1.2 Reguły hierarchii (BINDING)

| Reguła | Opis | Kod AS-IS |
|--------|------|-----------|
| Jeden ENM → wiele StudyCase | Case nie tworzy kopii modelu | `StudyCase.project_id` → Project → ENM |
| Jeden StudyCase → wiele AnalysisRun | Każdy run = jednorazowe wykonanie | `AnalysisRun.operating_case_id` |
| AnalysisRun jest jednorazowy | Po FINISHED/FAILED — immutable, nowy run = nowy UUID | `new_analysis_run()` factory |
| Wynik NIE jest w StudyCase | Case przechowuje `result_refs` (metadane), nie wyniki | `StudyCaseResult` = referencja |
| Jeden aktywny Case per projekt | `is_active: bool`, enforced by service | `set_active_case()` deaktywuje inne |

### §10.1.3 Zakazy hierarchii (BINDING)

| ID | Zakaz | Uzasadnienie |
|----|-------|-------------|
| **Z-SC-01** | Zakaz edycji ENM z poziomu StudyCase | Case = config-only, model = read-only |
| **Z-SC-02** | Zakaz przechowywania wyników w StudyCase | Case przechowuje referencje, nie dane |
| **Z-SC-03** | Zakaz modyfikacji AnalysisRun po FINISHED/FAILED | Run = event, immutable po zakończeniu |
| **Z-SC-04** | Zakaz więcej niż jednego aktywnego Case per projekt | Spójność UI i obliczeń |

---

## §10.2 — StudyCase — model domenowy (AS-IS)

### §10.2.1 Kontrakt StudyCase (frozen dataclass)

```python
# domain/study_case.py:173–488
@dataclass(frozen=True)
class StudyCase:
    id: UUID
    project_id: UUID
    name: str
    description: str = ""
    network_snapshot_id: str | None = None      # P10a: referencja do snapshotu ENM
    config: StudyCaseConfig                     # Parametry obliczeń (jedyna zmienna v1)
    protection_config: ProtectionConfig         # P14c: konfiguracja zabezpieczeń
    result_status: StudyCaseResultStatus         # NONE | FRESH | OUTDATED
    is_active: bool                             # Jeden aktywny per projekt
    result_refs: tuple[StudyCaseResult, ...]    # Metadane wyników (referencje)
    revision: int = 1
    created_at: datetime
    updated_at: datetime
    study_payload: dict[str, Any]               # Backward compatibility
```

**Kod AS-IS:** `domain/study_case.py:173–488`

### §10.2.2 StudyCaseResultStatus (enum)

| Wartość | Opis PL | Przejścia |
|---------|---------|-----------|
| `NONE` | Brak obliczeń (po utworzeniu lub klonowaniu) | → FRESH (po obliczeniach) |
| `FRESH` | Wyniki aktualne (obliczone po ostatniej zmianie) | → OUTDATED (zmiana modelu/config) |
| `OUTDATED` | Wyniki nieaktualne (model lub config zmieniony) | → FRESH (po ponownych obliczeniach) |

**Diagram cyklu życia:**

```
         ┌─── (re-run) ───┐
         │                 │
NONE ──(obliczenia)──→ FRESH ──(zmiana modelu/config)──→ OUTDATED
                                                            │
                                                      (re-run)
                                                            │
                                                         FRESH
```

### §10.2.3 StudyCaseConfig — parametry obliczeń (frozen dataclass, AS-IS)

```python
# domain/study_case.py:20–80
@dataclass(frozen=True)
class StudyCaseConfig:
    c_factor_max: float = 1.10          # Współczynnik napięciowy cmax (IEC 60909)
    c_factor_min: float = 0.95          # Współczynnik napięciowy cmin
    base_mva: float = 100.0             # Baza MVA per-unit
    max_iterations: int = 50            # Max iteracji Newton-Raphson
    tolerance: float = 1e-6             # Kryterium zbieżności
    include_motor_contribution: bool = True    # Wkład silników w SC
    include_inverter_contribution: bool = True # Wkład falowników w SC
    thermal_time_seconds: float = 1.0   # Czas dla prądu cieplnego Ith [s]
```

**Kod AS-IS:** `domain/study_case.py:20–80`

### §10.2.4 ProtectionConfig (frozen dataclass, AS-IS — P14c)

```python
# domain/study_case.py:82–130
@dataclass(frozen=True)
class ProtectionConfig:
    template_ref: str | None = None              # ID ProtectionSettingTemplate z katalogu
    template_fingerprint: str | None = None      # Fingerprint SHA-256 szablonu (audit)
    library_manifest_ref: dict | None = None     # Referencja do manifestu biblioteki
    overrides: dict[str, Any] = field(default_factory=dict)  # Override nastaw per Case
    bound_at: datetime | None = None             # Timestamp powiązania szablonu
```

**Kod AS-IS:** `domain/study_case.py:82–130`

### §10.2.5 StudyCaseResult — referencja do wyników (frozen)

```python
# domain/study_case.py:132–168
@dataclass(frozen=True)
class StudyCaseResult:
    analysis_run_id: UUID       # Identyfikator AnalysisRun
    analysis_type: str          # "PF" | "short_circuit_sn" | "fault_loop_nn"
    calculated_at: datetime     # Timestamp obliczenia
    input_hash: str             # SHA-256 danych wejściowych (cache invalidation)
```

**BINDING:** StudyCaseResult jest **referencją** — NIE przechowuje wyników. Wyniki są w AnalysisRun.

### §10.2.6 Metody mutacji (immutable pattern)

StudyCase jest frozen — każda zmiana zwraca **nową instancję**:

| Metoda | Zwraca | Efekt na result_status |
|--------|--------|----------------------|
| `with_updated_config(config)` | nowy StudyCase | Jeśli FRESH → OUTDATED |
| `with_protection_config(protection_config)` | nowy StudyCase | Jeśli FRESH → OUTDATED (gdy changed) |
| `with_name(name)` | nowy StudyCase | Bez zmiany |
| `with_description(description)` | nowy StudyCase | Bez zmiany |
| `mark_as_active()` | nowy StudyCase | `is_active=True` |
| `mark_as_inactive()` | nowy StudyCase | `is_active=False` |
| `mark_as_outdated()` | nowy StudyCase | `result_status=OUTDATED` |
| `mark_as_fresh(result_ref)` | nowy StudyCase | `result_status=FRESH`, dodaje result_ref |
| `with_network_snapshot_id(id)` | nowy StudyCase | Jeśli FRESH i zmiana → OUTDATED |
| `clone(new_name)` | nowy StudyCase | **NONE** (wyniki NIE kopiowane) |

**Reguła clone (BINDING):**
- Config kopiowany.
- ProtectionConfig kopiowany.
- network_snapshot_id kopiowany.
- `result_status = NONE` (wyniki NIGDY kopiowane).
- `is_active = False`.
- Nowy UUID, nowa `revision = 1`.

---

## §10.3 — Typy Study Case (kanoniczne)

### §10.3.1 Klasy Study Case — stan AS-IS

W v1 Study Case NIE posiada jawnego pola `case_type`. Różnicowanie scenariuszy odbywa się przez:
- parametry `StudyCaseConfig` (c_factor_max/min, include_inverter_contribution),
- pole `study_payload: dict` (backward compatibility, klucz–wartość),
- nazwę Case (konwencja użytkownika).

### §10.3.2 Scenariusze kanoniczne — macierz docelowa (BINDING — Decyzja #73)

System MUSI wspierać co najmniej następujące klasy scenariuszy:

#### Stan pracy (Power Flow)

| Scenariusz | StudyCaseConfig | Opis |
|-----------|----------------|------|
| **Normalny** | default | Warunki normalne eksploatacji |
| **Minimalne obciążenie** | `study_payload: {load_factor: 0.3}` | 30% obciążenia znamionowego |
| **Maksymalne obciążenie** | `study_payload: {load_factor: 1.0}` | 100% obciążenia znamionowego |
| **Noc / OZE=0** | `include_inverter_contribution=False` | Brak generacji OZE |
| **Dzień / OZE=100%** | `include_inverter_contribution=True` | Pełna generacja OZE |

#### Zwarcia (Short Circuit)

| Scenariusz | Parametry | Opis |
|-----------|-----------|------|
| **3-fazowe max** | `c_factor_max=1.10`, fault_type=3F | IEC 60909 — prąd max (dobór aparatów) |
| **3-fazowe min** | `c_factor_min=0.95`, fault_type=3F | IEC 60909 — prąd min (czułość zabezpieczeń) |
| **2-fazowe** | fault_type=2F | IEC 60909 — zwarcie 2-fazowe |
| **1-fazowe doziemne** | fault_type=1F | IEC 60909 — zwarcie 1F (wymaga Z₀) |
| **Z udziałem OZE** | `include_inverter_contribution=True` | Wkład InverterSource w Ik |
| **Bez udziału OZE** | `include_inverter_contribution=False` | Brak wkładu falownikowego |

#### Napięcie i parametry

| Scenariusz | Parametry | Opis |
|-----------|-----------|------|
| **Umin** | `c_factor_min=0.95` | Minimalne napięcie sieci |
| **Umax** | `c_factor_max=1.10` | Maksymalne napięcie sieci |

#### Konfiguracje operacyjne (TO-BE)

| Scenariusz | Wymaga | Status |
|-----------|--------|--------|
| **Normalna** | Stany łączników z ENM | AS-IS (z ENM) |
| **Awaryjna (N-1)** | Nakładka Case (switch_overrides) | TO-BE (§8.A.3.4) |
| **Rekonfiguracja** | Nakładka Case (switch_overrides) | TO-BE (§8.A.3.4) |

### §10.3.3 ScenarioType — hierarchia P10 (AS-IS)

```python
# application/study_scenario/models.py
class ScenarioType(str, Enum):
    NORMAL = "normal"
    N_1 = "n_1"             # N-1 contingency
    MAINTENANCE = "maintenance"
    EMERGENCY = "emergency"
    USER_DEFINED = "user_defined"
```

**Kod AS-IS:** `application/study_scenario/models.py`

---

## §10.4 — Warunki brzegowe (BINDING — Decyzja #74)

### §10.4.1 Zasada

> **Study Case MUSI jawnie definiować warunki brzegowe obliczeń.
> Zakaz warunków domyślnych i „dziedziczenia niejawnego".**

### §10.4.2 Warunki brzegowe — stan AS-IS (v1)

| Warunek | Źródło v1 | Jawność | Opis |
|---------|-----------|---------|------|
| Źródła aktywne/nieaktywne | ENM (Source.in_service) | ✅ Jawny | Status w modelu ENM |
| Statusy łączników | ENM (Switch/Branch.status) | ✅ Jawny | OPEN/CLOSED w modelu ENM |
| Parametry obliczeń | StudyCaseConfig | ✅ Jawny | c_factor, base_mva, tolerance |
| Wkład falowników | StudyCaseConfig.include_inverter_contribution | ✅ Jawny | true/false per Case |
| Wkład silników | StudyCaseConfig.include_motor_contribution | ✅ Jawny | true/false per Case |
| Profile obciążeń | ENM (Load.p_mw, q_mvar) | ⚠️ Z ENM | Jeden profil per snapshot (TO-BE: per Case) |
| Profile generacji | ENM (Generator.p_mw, q_mvar) | ⚠️ Z ENM | Jeden profil per snapshot (TO-BE: per Case) |
| Warunki sieci zewnętrznej | ENM (Source.sk3_mva, r_ohm, x_ohm) | ✅ Jawny | Parametry OSD |
| Typ zwarcia | FaultSpec (parametr run) | ✅ Jawny | 3F/2F/1F — per AnalysisRun |
| Lokalizacja zwarcia | FaultSpec (parametr run) | ✅ Jawny | Bus ID — per AnalysisRun |

### §10.4.3 Zakaz warunków domyślnych (BINDING)

| ID | Zakaz | Uzasadnienie |
|----|-------|-------------|
| **Z-WB-01** | Zakaz niejawnego dziedziczenia warunków z innego Case | Deterministyczność |
| **Z-WB-02** | Zakaz domyślnego stanu „wszystko aktywne" bez jawnej definicji | Audytowalność |
| **Z-WB-03** | Zakaz warunków brzegowych per solver (warunki na poziomie Case, nie solvera) | Separation of concerns |

---

## §10.5 — AnalysisRun — model wykonania (AS-IS)

### §10.5.1 Kontrakt AnalysisRun (frozen dataclass)

```python
# domain/analysis_run.py
@dataclass(frozen=True)
class AnalysisRun:
    id: UUID
    project_id: UUID
    operating_case_id: UUID             # Binding do Case
    analysis_type: AnalysisType         # "PF" | "short_circuit_sn" | "fault_loop_nn"
    status: AnalysisRunStatus           # CREATED | VALIDATED | RUNNING | FINISHED | FAILED
    result_status: ResultStatus         # VALID | OUTDATED
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    input_snapshot: dict                # Kanonicalizowany JSON danych wejściowych
    input_hash: str                     # SHA-256 danych wejściowych
    result_summary: dict                # Podsumowanie wyników
    trace_json: dict | list[dict] | None   # Trace data (Proof Pack)
    white_box_trace: list[dict] | None  # White Box trace (audit trail)
    error_message: str | None           # Komunikat błędu (jeśli FAILED)
```

**Kod AS-IS:** `domain/analysis_run.py:1–51`

### §10.5.2 AnalysisType

| Wartość | Solver | Opis PL |
|---------|--------|---------|
| `"PF"` | Newton-Raphson Power Flow | Rozpływ mocy |
| `"short_circuit_sn"` | IEC 60909 Short Circuit (SN) | Zwarcie SN (3F/2F/1F) |
| `"fault_loop_nn"` | Fault Loop (nn network) | Pętla zwarciowa nn |

### §10.5.3 AnalysisRunStatus — maszyna stanów (BINDING)

```
CREATED ──(walidacja)──→ VALIDATED ──(solver start)──→ RUNNING ──(sukces)──→ FINISHED
    │                        │                           │
    └──────── (błąd) ────────┴──────── (błąd) ──────────┘──────────────→ FAILED
```

| Status | Opis | Przejścia dozwolone |
|--------|------|---------------------|
| `CREATED` | Run utworzony, oczekuje na wykonanie | → VALIDATED, → FAILED |
| `VALIDATED` | Walidacja pre-execution przeszła | → RUNNING, → FAILED |
| `RUNNING` | Solver wykonuje obliczenia | → FINISHED, → FAILED |
| `FINISHED` | Obliczenia zakończone pomyślnie | (terminal) |
| `FAILED` | Obliczenia zakończone błędem | (terminal) |

**BINDING:** FINISHED i FAILED są stanami terminalnymi — AnalysisRun NIE MOŻE być zmodyfikowany po osiągnięciu tych stanów.

### §10.5.4 ResultStatus

| Wartość | Opis |
|---------|------|
| `VALID` | Wyniki aktualne dla bieżącego modelu/inputów |
| `OUTDATED` | Wyniki nieaktualne (model zmieniony po obliczeniach) |

### §10.5.5 Factory function

```python
def new_analysis_run(
    project_id: UUID,
    operating_case_id: UUID,
    analysis_type: AnalysisType,
    input_snapshot: dict,
    input_hash: str,
) -> AnalysisRun:
    """Tworzy nowy AnalysisRun ze statusem CREATED."""
```

**Reguła:** Każdy nowy run = nowy UUID. Run jest zdarzeniem (event), nie zasobem.

---

## §10.6 — Deterministyczna kanonicalizacja danych wejściowych (BINDING — Decyzja #75)

### §10.6.1 Algorytm kanonicalizacji

```
input_snapshot: dict (surowe dane wejściowe)
    │
    ▼
canonicalize(value, current_key) — rekursywne sortowanie
    │
    ├── dict → sortowanie kluczy (sorted keys)
    ├── list → deterministyczne sortowanie (per key: nodes, branches, sources, loads)
    ├── UUID → str
    ├── datetime → ISO 8601 str
    ├── Enum → str value
    ├── complex → {"re": float, "im": float}
    ├── numpy → Python native (float, int)
    │
    ▼
json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    │
    ▼
SHA-256(canonical_json) → input_hash: str
```

**Kod AS-IS:** `application/analysis_run/service.py` — `canonicalize()`, `compute_input_hash()`

### §10.6.2 Gwarancje deterministyczne (BINDING)

| Gwarancja | Opis |
|-----------|------|
| Ten sam ENM + ten sam Config → ten sam input_snapshot | Kanonicalizacja jest deterministyczna |
| Ten sam input_snapshot → ten sam input_hash | SHA-256 jest deterministyczny |
| Ten sam input_hash → te same wyniki | Solvery są deterministyczne |
| input_hash służy do deduplikacji | P20a — jeśli FINISHED run z tym samym hash istnieje, wyniki kopiowane |

### §10.6.3 Deduplikacja wyników (P20a — AS-IS)

```
Nowy AnalysisRun(input_hash=H)
    │
    ├── Szukaj: FINISHED run z input_hash == H ?
    │     │
    │     ├── TAK → Kopiuj wyniki, status=FINISHED (bez ponownego uruchomienia solvera)
    │     │
    │     └── NIE → status=CREATED, czekaj na execute_run()
    │
    ▼
AnalysisRun(status=FINISHED, results=...)
```

**BINDING:** Deduplikacja jest optymalizacją — NIE zmienia semantyki. Wyniki deduplikowane MUSZĄ być identyczne z wynikami solvera.

---

## §10.7 — Network Snapshot (P10a — AS-IS)

### §10.7.1 NetworkSnapshotORM

```python
# infrastructure/persistence/models.py
class NetworkSnapshotORM:
    snapshot_id: str                 # PK
    parent_snapshot_id: str | None   # Wersjonowanie (poprzedni snapshot)
    created_at: datetime
    schema_version: str | None
    network_model_id: str | None
    fingerprint: str | None          # SHA-256 for change detection
    snapshot_json: DeterministicJSON  # Pełny graf sieci (frozen)
```

### §10.7.2 Relacja Snapshot ↔ StudyCase ↔ Project

```
Project.active_network_snapshot_id → aktualny snapshot
StudyCase.network_snapshot_id → snapshot, na którym Case był skonfigurowany
AnalysisRun.input_snapshot → kanonicalizowany JSON z danymi ze snapshotu
```

### §10.7.3 Invalidacja przy zmianie snapshotu (BINDING)

```
Model Changes Detected
    │
    ▼
New NetworkSnapshot Created (snapshot_v2)
    │
    ├── Project.active_network_snapshot_id = snapshot_v2
    │
    ├── StudyCaseService.mark_all_outdated(project_id)
    │     │
    │     └── Każdy Case z result_status=FRESH → OUTDATED
    │
    └── Case.with_network_snapshot_id(snapshot_v2)
          │
          └── Jeśli FRESH → OUTDATED (snapshot changed)
```

---

## §10.8 — Invalidacja wyników (BINDING — Decyzja #76)

### §10.8.1 Macierz invalidacji

| Zdarzenie | Zakres | Nowy status | Mechanizm AS-IS |
|-----------|--------|-------------|-----------------|
| **Zmiana ENM** (nowy snapshot) | WSZYSTKIE Case'y projektu | OUTDATED | `StudyCaseService.mark_all_outdated(project_id)` |
| **Zmiana StudyCaseConfig** | Dany Case | OUTDATED | `case.with_updated_config()` |
| **Zmiana ProtectionConfig** | Dany Case | OUTDATED | `case.with_protection_config()` |
| **Clone Case** | Nowy Case | NONE | `case.clone(new_name)` |
| **Commit sesji Wizard** | WSZYSTKIE Case'y projektu | OUTDATED | `ResultInvalidator` |
| **Pomyślne obliczenie** | Dany Case | FRESH | `StudyCaseService.mark_case_fresh()` |

### §10.8.2 Reguły invalidacji (BINDING)

1. **Zmiana modelu = globalna invalidacja.** Każda zmiana ENM (nowy snapshot) invaliduje WSZYSTKIE Case'y.
2. **Zmiana config = lokalna invalidacja.** Zmiana StudyCaseConfig/ProtectionConfig invaliduje TYLKO dany Case.
3. **Clone = brak wyników.** Klonowanie kopiuje config, ale `result_status=NONE`.
4. **Wynik nie jest w Case.** Case przechowuje `result_refs` (metadane), wyniki w AnalysisRun.
5. **Solver na OUTDATED Case dozwolony.** Użytkownik MOŻE uruchomić obliczenia na OUTDATED Case — wynik nadpisze status → FRESH.

---

## §10.9 — Relacja Study Case ↔ Solver (BINDING — Decyzja #77)

### §10.9.1 Zasada

> **Study Case wybiera solver i przekazuje parametry wejściowe.
> Study Case NIE ingeruje w algorytmy solvera.**

### §10.9.2 Przepływ danych Case → Solver

```
StudyCase.config
    │
    ├── c_factor_max/min → ShortCircuitOptions.c_factor
    ├── base_mva → PowerFlowInput.base_mva
    ├── max_iterations → PowerFlowOptions.max_iter
    ├── tolerance → PowerFlowOptions.tolerance
    ├── include_inverter_contribution → filtr InverterSource
    ├── include_motor_contribution → (TO-BE: filtr motor contribution)
    ├── thermal_time_seconds → ShortCircuitOptions.thermal_time
    │
    ▼
AnalysisRunService._build_*_snapshot()
    │
    ▼
Solver(input=kanonicalizowany snapshot, options=solver_options)
    │
    ▼
Result + WhiteBoxTrace
```

### §10.9.3 PowerFlowOptions (AS-IS)

```python
# network_model/solvers/power_flow_types.py
@dataclass
class PowerFlowOptions:
    tolerance: float = 1e-8       # Kryterium zbieżności NR
    max_iter: int = 30            # Max iteracji
    damping: float = 1.0          # Współczynnik tłumienia
    flat_start: bool = True       # Start płaski (U=1.0, θ=0.0)
    validate: bool = True         # Walidacja pre-solver
    trace_level: str = "summary"  # P20a: "summary" | "full"
```

### §10.9.4 Solver Input Specs (Power Flow, AS-IS)

| Spec | Pola | Opis |
|------|------|------|
| `SlackSpec` | node_id, u_pu, angle_rad | Węzeł referencyjny (Source → SLACK) |
| `PQSpec` | node_id, p_mw, q_mvar | Stałe obciążenie PQ (Load) |
| `PVSpec` | node_id, p_mw, u_pu, q_min/max | Generator z regulacją napięcia |
| `ShuntSpec` | node_id, g_pu, b_pu | Admitancja bocznikowa |
| `TransformerTapSpec` | branch_id, tap_ratio | Pozycja zaczepów transformatora |
| `BusVoltageLimitSpec` | node_id, u_min_pu, u_max_pu | Limity napięciowe |
| `BranchLimitSpec` | branch_id, s_max_mva, i_max_ka | Limity obciążalności |

---

## §10.10 — White Box Trace dla Study Case (BINDING — Decyzja #78)

### §10.10.1 Łańcuch deterministyczny

Dla każdego AnalysisRun White Box MUSI odtworzyć:

```
ENM snapshot (wersja, fingerprint)
    │
    ▼
StudyCase (warunki: config, protection_config)
    │
    ▼
Solver input (kanonicalizowany snapshot, input_hash)
    │
    ▼
Algorytm (NR / IEC 60909 — wersja, parametry)
    │
    ▼
Wynik cząstkowy (Y-bus, Z-thevenin, napięcia iteracyjne)
    │
    ▼
Wynik końcowy (Ik, ip, Ith / U, P, Q, loading)
```

### §10.10.2 Trace na AnalysisRun (AS-IS)

| Pole | Typ | Opis |
|------|-----|------|
| `input_snapshot` | dict | Pełny kanonicalizowany JSON danych wejściowych |
| `input_hash` | str | SHA-256 — identyfikator deterministyczny |
| `trace_json` | dict / list[dict] | Trace data dla Proof Pack (P11) |
| `white_box_trace` | list[dict] | White Box trace — audytowalny ślad obliczeń |

### §10.10.3 Zakaz wyników bez scenariusza (BINDING)

| ID | Zakaz | Uzasadnienie |
|----|-------|-------------|
| **Z-WB-04** | Zakaz wyników bez AnalysisRun (każdy wynik powiązany z run) | Traceability |
| **Z-WB-05** | Zakaz AnalysisRun bez input_snapshot i input_hash | Reprodukowalność |
| **Z-WB-06** | Zakaz scenariusza bez White Box trace | Audytowalność |

---

## §10.11 — Porównanie scenariuszy (StudyCaseComparison, AS-IS)

### §10.11.1 StudyCaseComparison (frozen dataclass)

```python
# domain/study_case.py
@dataclass(frozen=True)
class StudyCaseComparison:
    case_a_id: UUID
    case_b_id: UUID
    case_a_name: str
    case_b_name: str
    config_differences: tuple[tuple[str, Any, Any], ...]  # (pole, wartość_A, wartość_B)
    status_a: StudyCaseResultStatus
    status_b: StudyCaseResultStatus
```

**Kod AS-IS:** `domain/study_case.py` — `compare_study_cases(case_a, case_b)`

### §10.11.2 Reguły porównania (BINDING)

| Reguła | Opis |
|--------|------|
| Porównanie AnalysisRun w obrębie jednego Case | ✅ AS-IS (lista runs per case) |
| Porównanie StudyCase na tym samym ENM | ✅ AS-IS (StudyCaseComparison) |
| Różnice config (ΔConfig) | ✅ AS-IS (`config_differences: tuple[tuple[str, Any, Any], ...]`) |
| Różnice wyników (ΔU, ΔI, ΔP, ΔIk) | ⚠️ TO-BE (wymaga porównania result_refs) |
| Porównanie między różnymi ENM | ❌ **ZABRONIONE** (BINDING) |

### §10.11.3 Zakaz porównań między ENM (BINDING)

> **BINDING (Decyzja #72):** Porównanie Study Case'ów jest dozwolone WYŁĄCZNIE na tym samym ENM (projekt).
> Porównanie między różnymi projektami / różnymi wersjami ENM jest ZABRONIONE,
> ponieważ topologia i parametry bazowe mogą się różnić.

---

## §10.12 — Hierarchia P10: Study → Scenario → Run → Snapshot (AS-IS)

### §10.12.1 Cel hierarchii P10

Hierarchia P10 rozszerza operacyjny model (StudyCase + AnalysisRun) o pełną strukturę planistyczną:

```
Study (badanie)
  └── Scenario (scenariusz)
        └── Run (przebieg obliczeniowy)
              └── Snapshot (zamrożony stan)
```

### §10.12.2 Study (frozen dataclass, P10)

```python
# application/study_scenario/models.py
@dataclass(frozen=True)
class Study:
    study_id: UUID
    name: str
    description: str
    created_at: datetime
    created_by: str
    assumptions: tuple[str, ...]       # Normalizowane, posortowane
    normative_profile_id: str | None
    hash: str                          # Deterministyczny SHA-256
```

### §10.12.3 Scenario (frozen dataclass, P10)

```python
@dataclass(frozen=True)
class Scenario:
    scenario_id: UUID
    study_id: UUID                     # FK do Study
    name: str
    description: str
    scenario_type: ScenarioType        # NORMAL | N_1 | MAINTENANCE | EMERGENCY | USER_DEFINED
    switches_state_ref: Any            # Referencja do stanu łączników
    sources_state_ref: Any             # Referencja do stanu źródeł
    loads_state_ref: Any               # Referencja do stanu obciążeń
    constraints_ref: Any               # Referencja do ograniczeń
    is_base: bool                      # Scenariusz bazowy
    hash: str                          # Deterministyczny SHA-256
```

### §10.12.4 Run (frozen dataclass, P10)

```python
@dataclass(frozen=True)
class Run:
    run_id: UUID
    scenario_id: UUID                  # FK do Scenario
    created_at: datetime
    input_snapshot_id: UUID | None
    solver_versions: dict[str, str]    # Sorted — wersje solverów
    proof_set_ids: tuple[str, ...]     # Sorted — identyfikatory Proof Pack
    normative_report_id: str | None
    voltage_profile_view_id: str | None
    protection_insight_view_id: str | None
    protection_curves_it_view_id: str | None
    report_p24_plus_id: str | None
    status: RunStatus                  # COMPLETE | NOT_COMPUTED
```

### §10.12.5 Snapshot (frozen dataclass, P10)

```python
@dataclass(frozen=True)
class Snapshot:
    snapshot_id: UUID
    hash: str                          # SHA-256
    description: str
    created_at: datetime
```

### §10.12.6 Hashing strategy (deterministyczny)

Wszystkie byty P10 używają deterministycznego hashowania:

| Element | Namespace UUID5 | Payload |
|---------|----------------|---------|
| Study | `NAMESPACE_STUDY` | canonical JSON (sorted keys) |
| Scenario | `NAMESPACE_SCENARIO` | canonical JSON (sorted keys) |
| Run | `NAMESPACE_RUN` | canonical JSON (sorted keys) |
| Snapshot | `NAMESPACE_SNAPSHOT` | hash content |

**BINDING:** Ten sam payload → ten sam hash → ten sam UUID5. Deterministyczność gwarantowana.

---

## §10.13 — StudyCaseService — warstwa aplikacji (AS-IS)

### §10.13.1 Operacje CRUD

| Metoda | Opis | Efekt |
|--------|------|-------|
| `create_case(project_id, name, description, config, set_active)` | Tworzenie Case | Nowy StudyCase, opcjonalnie aktywny |
| `get_case(case_id)` | Odczyt | StudyCase lub `StudyCaseNotFoundError` |
| `list_cases(project_id)` | Lista | `list[StudyCaseListItem]` (summary) |
| `update_case(case_id, name, description, config)` | Aktualizacja | Config change → OUTDATED |
| `delete_case(case_id)` | Usunięcie | Kasowanie Case i powiązań |

### §10.13.2 Operacje specjalne

| Metoda | Opis | Efekt |
|--------|------|-------|
| `clone_case(case_id, new_name)` | Klonowanie | Config kopiowany, `result_status=NONE` |
| `set_active_case(project_id, case_id)` | Aktywacja | Deaktywuje wszystkie inne, aktywuje wybrany |
| `get_active_case(project_id)` | Aktywny Case | `StudyCase \| None` |
| `require_active_case(project_id)` | Wymagany aktywny | `ActiveCaseRequiredError` jeśli brak |
| `compare_cases(case_a_id, case_b_id)` | Porównanie | `StudyCaseComparison` (read-only) |

### §10.13.3 Zarządzanie statusem wyników

| Metoda | Opis | Efekt |
|--------|------|-------|
| `mark_all_outdated(project_id)` | Globalna invalidacja | Wszystkie FRESH → OUTDATED (zwraca count) |
| `mark_case_outdated(case_id)` | Lokalna invalidacja | Dany Case → OUTDATED |
| `mark_case_fresh(case_id, run_id, type, hash)` | Oznacz jako aktualny | Case → FRESH + dodaj result_ref |
| `can_calculate(case_id)` | Sprawdzenie gotowości | `tuple[bool, str \| None]` |

### §10.13.4 Protection Config (P14c)

| Metoda | Opis |
|--------|------|
| `update_protection_config(case_id, template_ref, fingerprint, manifest_ref, overrides)` | Aktualizacja konfiguracji zabezpieczeń per Case |

**Kod AS-IS:** `application/study_case/service.py:1–544`

---

## §10.14 — AnalysisRunService — warstwa wykonania (AS-IS)

### §10.14.1 Tworzenie runów

| Metoda | Solver | Opis |
|--------|--------|------|
| `create_power_flow_run(project_id, case_id, options)` | PF (Newton-Raphson) | Buduje snapshot, hash, opcjonalnie deduplikuje (P20a) |
| `create_short_circuit_run(project_id, case_id, fault_spec, options)` | SC (IEC 60909) | Buduje snapshot z fault_spec |
| `create_fault_loop_run(project_id, case_id, options)` | Fault Loop (nn) | Buduje snapshot pętli zwarciowej |

### §10.14.2 Wykonanie

```python
def execute_run(run_id: UUID) -> AnalysisRun:
    """
    State machine: CREATED → VALIDATED → RUNNING → FINISHED | FAILED
    1. Walidacja pre-execution (design mode check)
    2. Dispatching do solver
    3. Zapis wyników + trace
    4. mark_case_fresh()
    """
```

### §10.14.3 Budowanie snapshotu wejściowego

| Metoda | Skład snapshotu |
|--------|----------------|
| `_build_power_flow_snapshot()` | ENM graph + PQ specs + PV specs + slack + options |
| `_build_short_circuit_snapshot()` | ENM graph + fault_spec + c_factor + inverter sources |
| `_build_fault_loop_snapshot()` | ENM graph (nn) + fault_spec + options |

**Kod AS-IS:** `application/analysis_run/service.py:1–1322`

---

## §10.15 — Results Inspector DTOs (P11a — AS-IS)

### §10.15.1 Struktura DTOs

| DTO | Pola kluczowe | Opis |
|-----|---------------|------|
| `RunHeaderDTO` | run_id, project_id, case_id, snapshot_id, status, solver_kind, input_hash | Nagłówek run |
| `ResultColumnDTO` | key, label_pl, unit | Kolumna tabeli wyników |
| `ResultTableMetaDTO` | table_id, label_pl, row_count, columns | Metadane tabeli |
| `ResultsIndexDTO` | run_header, tables | Indeks dostępnych tabel per run |
| `BusResultsRowDTO` | bus_id, name, un_kv, u_kv, u_pu, angle_deg, flags | Wynik per bus (PF) |
| `BranchResultsRowDTO` | branch_id, name, from_bus, to_bus, i_a, s_mva, p_mw, q_mvar, loading_pct, flags | Wynik per branch (PF) |
| `ShortCircuitRowDTO` | target_id, target_name, fault_type, ikss_ka, ip_ka, ith_ka, sk_mva, flags | Wynik per target (SC) |
| `SldOverlayBusDTO` | symbol_id, bus_id, u_pu, u_kv, angle_deg, ikss_ka, sk_mva | Nakładka SLD per bus |
| `SldOverlayBranchDTO` | symbol_id, branch_id, p_mw, q_mvar, i_a, loading_pct | Nakładka SLD per branch |
| `ExtendedTraceDTO` | run_id, snapshot_id, input_hash, white_box_trace | White Box trace z kontekstem |

**Kod AS-IS:** `application/analysis_run/dtos.py:1–497`

---

## §10.16 — API Study Cases & Analysis Runs (AS-IS)

### §10.16.1 Endpointy Study Cases

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/study-cases` | Tworzenie Case |
| GET | `/api/study-cases/{case_id}` | Odczyt Case |
| GET | `/api/study-cases?project_id={id}` | Lista Cases per projekt |
| PUT | `/api/study-cases/{case_id}` | Aktualizacja (config, name) |
| DELETE | `/api/study-cases/{case_id}` | Usunięcie Case |
| POST | `/api/study-cases/{case_id}/clone` | Klonowanie |
| POST | `/api/study-cases/{case_id}/activate` | Aktywacja |
| GET | `/api/study-cases/active?project_id={id}` | Aktywny Case |
| POST | `/api/study-cases/compare` | Porównanie dwóch Cases |
| PUT | `/api/study-cases/{case_id}/protection-config` | Protection Config (P14c) |

**Kod AS-IS:** `api/study_cases.py`

### §10.16.2 Endpointy Analysis Runs

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/projects/{id}/analysis-runs` | Lista runs (filtry: analysis_type, status) |
| GET | `/analysis-runs/{run_id}` | Szczegóły run |
| GET | `/analysis-runs/{run_id}/results` | Pełne wyniki |
| GET | `/analysis-runs/{run_id}/results/index` | Indeks tabel wyników (P11a) |
| GET | `/analysis-runs/{run_id}/results/buses` | Wyniki per bus (P11a) |
| GET | `/analysis-runs/{run_id}/results/branches` | Wyniki per branch (P11a) |
| GET | `/analysis-runs/{run_id}/results/short-circuit` | Wyniki SC (P11a) |
| GET | `/analysis-runs/{run_id}/trace` | White Box trace |

**Kod AS-IS:** `api/analysis_runs.py`

### §10.16.3 Endpointy Case-bound Runs

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/cases/{case_id}/runs/short-circuit` | SC run per Case |
| POST | `/api/cases/{case_id}/runs/loadflow` | PF run per Case |
| GET | `/api/cases/{case_id}/runs` | Lista runs per Case |

**Kod AS-IS:** `api/case_runs.py`

---

## §10.17 — UI Study Case (ETAP-style, kontrakt prezentacyjny)

### §10.17.1 Zasada (BINDING)

> **UI Study Case jest projekcją danych z domain layer — NIE posiada osobnego modelu.**

### §10.17.2 Elementy UI (BINDING)

| Element | Źródło danych | Opis |
|---------|---------------|------|
| Lista Study Cases | `StudyCaseService.list_cases()` | Panel boczny z listą Cases per projekt |
| Badge statusu | `StudyCaseResultStatus` | NONE (szary), FRESH (zielony), OUTDATED (pomarańczowy) |
| Podgląd warunków brzegowych | `StudyCaseConfig` + `ProtectionConfig` | Tabela parametrów Case (read-only view) |
| Blokada edycji ENM | `StudyCase.is_active` | Aktywny Case NIE blokuje edycji ENM — edycja → OUTDATED |
| Tryb porównawczy | `StudyCaseComparison` | Tabela + overlay SLD: diff między dwoma Cases |
| Run history | `AnalysisRunService.list_runs()` | Lista przebiegów z statusem i timestampem |
| Result Inspector | P11a DTOs | Tabele wyników (buses, branches, SC) per run |
| SLD Overlay | `SldOverlayBusDTO` + `SldOverlayBranchDTO` | Nakładka wyników na SLD per run |

### §10.17.3 Tryb porównawczy (BINDING)

| Widok | Opis |
|-------|------|
| Table diff | Tabela z `config_differences` — pole, wartość A, wartość B |
| SLD overlay | Nakładka dwóch runów na jednym SLD — ΔU, ΔI kolorami |
| Status diff | Porównanie `result_status` obu Cases |

---

## §10.18 — Walidacje (BINDING — Decyzja #79)

### §10.18.1 Walidacje pre-calculation

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| **E-SC-01** | ERROR | Brak StudyCaseConfig (config=None) | Brak warunków brzegowych |
| **E-SC-02** | ERROR | c_factor_max ≤ 0 lub c_factor_min ≤ 0 | Nieprawidłowy współczynnik napięciowy |
| **E-SC-03** | ERROR | tolerance ≤ 0 lub max_iterations ≤ 0 | Nieprawidłowe parametry NR |
| **E-SC-04** | ERROR | Brak aktywnego Case przy próbie obliczeń | Brak aktywnego scenariusza |
| **E-SC-05** | ERROR | ENMValidator.has_blockers = True | Model ENM zawiera blokery (E001–E008) |
| **W-SC-01** | WARNING | result_status = OUTDATED | Wyniki nieaktualne — zalecane ponowne obliczenie |
| **W-SC-02** | WARNING | Brak White Box trace na FINISHED run | Brak śladu audytowego |
| **B-SC-01** | BLOCKER | Brak White Box trace na FINISHED run (tryb strict) | White Box jest obowiązkowy |

### §10.18.2 Walidacje spójności (BINDING)

| Warunek | Efekt | Opis |
|---------|-------|------|
| Sprzeczne warunki (c_max < c_min) | ERROR | Sprzeczność parametrów |
| Brak solvera dla danego analysis_type | ERROR | Nieznany typ analizy |
| Brak ENM snapshot | ERROR | Case bez danych modelu |
| Dwa aktywne Cases | INVARIANT VIOLATION | Naruszenie reguły jednego aktywnego Case |

---

## §10.19 — Persistence (Infrastructure Layer, AS-IS)

### §10.19.1 ORM Models

| ORM | Tabela | Klucz główny | Opis |
|-----|--------|-------------|------|
| `StudyCaseORM` | `study_cases` | UUID | Case z config, status, refs |
| `AnalysisRunORM` | `analysis_runs` | UUID | Run z snapshot, hash, trace |
| `AnalysisRunIndexORM` | `analysis_runs_index` | str (run_id) | Indeks szybkiego wyszukiwania |
| `OperatingCaseORM` | `operating_cases` | UUID | Legacy Case (bridge) |
| `StudyRunORM` | `study_runs` | UUID | P10a run z network_snapshot_id |
| `NetworkSnapshotORM` | `network_snapshots` | str (snapshot_id) | Snapshot z fingerprint |
| `ProjectORM` | `projects` | UUID | Projekt z active_network_snapshot_id |

### §10.19.2 Indeksy

| Indeks | Tabela | Kolumna | Cel |
|--------|--------|---------|-----|
| `ix_analysis_runs_input_hash` | analysis_runs | input_hash | Deduplikacja P20a |
| `ix_analysis_runs_index_analysis_type` | analysis_runs_index | analysis_type | Filtrowanie per typ |
| `ix_analysis_runs_index_case_id` | analysis_runs_index | case_id | Wyszukiwanie per case |
| `ix_analysis_runs_index_fingerprint` | analysis_runs_index | fingerprint | Wyszukiwanie per hash |
| `ix_analysis_runs_index_created_at_utc` | analysis_runs_index | created_at_utc | Sortowanie chronologiczne |

### §10.19.3 DeterministicJSON

Wszystkie pola `*_jsonb` w ORM używają `DeterministicJSON` — custom SQLAlchemy type z:
- `sort_keys=True`,
- `separators=(",", ":")`,
- deterministyczną serializacją.

**Gwarancja:** Ten sam dict → ten sam JSON → ten sam hash.

---

## §10.20 — Zakazy i anty-wzorce (BINDING)

| ID | Zakaz | Uzasadnienie |
|----|-------|-------------|
| **Z-SC-01** | Zakaz edycji ENM z poziomu StudyCase | Case = config-only |
| **Z-SC-02** | Zakaz przechowywania wyników w StudyCase | Case ≠ kontener wyników |
| **Z-SC-03** | Zakaz modyfikacji AnalysisRun po FINISHED/FAILED | Run = event, immutable |
| **Z-SC-04** | Zakaz więcej niż jednego aktywnego Case per projekt | Spójność |
| **Z-SC-05** | Zakaz kopiowania wyników przy clone | Clone → NONE |
| **Z-SC-06** | Zakaz porównań między różnymi ENM | Brak sensu fizycznego |
| **Z-SC-07** | Zakaz uruchomienia solvera bez input_snapshot i input_hash | Reprodukowalność |
| **Z-SC-08** | Zakaz niedeterministycznej kanonicalizacji | SHA-256 musi być identyczny |
| **Z-SC-09** | Zakaz warunków brzegowych „domyślnych" (implicit) | Jawność |

---

## §10.21 — Inwarianty systemu Study Case (BINDING)

| ID | Inwariant | Status |
|----|-----------|--------|
| **INV-SC-01** | StudyCase jest frozen=True (immutable) — każda zmiana zwraca nową instancję | AS-IS |
| **INV-SC-02** | AnalysisRun jest frozen=True — jednorazowy, niezmienny po wykonaniu | AS-IS |
| **INV-SC-03** | Dokładnie jeden aktywny Case per projekt w danym momencie | AS-IS |
| **INV-SC-04** | Zmiana ENM → ALL Cases OUTDATED (globalna invalidacja) | AS-IS |
| **INV-SC-05** | Ten sam input_hash → identyczne wyniki (deterministyczność) | AS-IS |
| **INV-SC-06** | Clone kopiuje config, NIE kopiuje wyników (result_status=NONE) | AS-IS |
| **INV-SC-07** | Kanonicalizacja JSON jest deterministyczna (sorted keys, stable list order) | AS-IS |
| **INV-SC-08** | White Box trace jest powiązany z AnalysisRun (run_id + snapshot_id + input_hash) | AS-IS |
| **INV-SC-09** | Deduplikacja P20a nie zmienia semantyki — wyniki identyczne z solverem | AS-IS |

---

## §10.22 — Definition of Done (Rozdział 10)

### §10.22.1 Kryteria akceptacji

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | Hierarchia Project → ENM → StudyCase → AnalysisRun opisana 1:1 z kodem | ✅ |
| 2 | StudyCase (frozen, 13 pól) opisany 1:1 z `domain/study_case.py:173–488` | ✅ |
| 3 | StudyCaseConfig (8 parametrów) opisany 1:1 z `domain/study_case.py:20–80` | ✅ |
| 4 | ProtectionConfig (P14c, 5 pól) opisany 1:1 z `domain/study_case.py:82–130` | ✅ |
| 5 | StudyCaseResultStatus cykl życia (NONE→FRESH→OUTDATED) opisany 1:1 | ✅ |
| 6 | AnalysisRun (frozen, 14 pól) opisany 1:1 z `domain/analysis_run.py` | ✅ |
| 7 | AnalysisRunStatus state machine (CREATED→VALIDATED→RUNNING→FINISHED/FAILED) | ✅ |
| 8 | Kanonicalizacja + SHA-256 input_hash opisane 1:1 z `analysis_run/service.py` | ✅ |
| 9 | Deduplikacja P20a opisana | ✅ |
| 10 | NetworkSnapshot (P10a) z fingerprint opisany | ✅ |
| 11 | Macierz invalidacji (6 zdarzeń → efekty) kompletna | ✅ |
| 12 | StudyCaseComparison opisana 1:1 z `domain/study_case.py` | ✅ |
| 13 | Hierarchia P10 (Study → Scenario → Run → Snapshot) opisana 1:1 | ✅ |
| 14 | ScenarioType enum (5 wartości) opisany 1:1 | ✅ |
| 15 | PowerFlowOptions (6 pól) opisany 1:1 z `power_flow_types.py` | ✅ |
| 16 | Solver Input Specs (7 typów) opisane | ✅ |
| 17 | StudyCaseService (14 metod) opisany 1:1 z `application/study_case/service.py` | ✅ |
| 18 | AnalysisRunService (3 create + execute) opisany | ✅ |
| 19 | Results Inspector DTOs (P11a, 10 DTO) opisane | ✅ |
| 20 | API: 10 endpointów study-cases + 8 analysis-runs + 3 case-runs | ✅ |
| 21 | Persistence ORM (7 modeli) opisana | ✅ |
| 22 | DeterministicJSON type opisany | ✅ |
| 23 | Walidacje (E-SC-01..05, W-SC-01..02, B-SC-01) sformułowane | ✅ |
| 24 | Zakazy Z-SC-01..09 sformułowane | ✅ |
| 25 | Inwarianty INV-SC-01..09 sformułowane | ✅ |
| 26 | Scenariusze kanoniczne (PF: 5 + SC: 6 + U: 2 + operacyjne: 3 TO-BE) | ✅ |
| 27 | Parytet ETAP w scenariuszach (jedyna zmienna v1 = Config) | ✅ |
| 28 | Deterministyczny White Box (snapshot → config → solver → wynik) | ✅ |
| 29 | Brak mutacji ENM z poziomu Case (BINDING) | ✅ |
| 30 | Sekcje TO-BE NIE blokują zatwierdzenia | ✅ |

### §10.22.2 Zidentyfikowane GAP-y (TO-BE)

| GAP | Decision | Opis | Wpływ |
|-----|----------|------|-------|
| StudyCaseOverlay (nakładka Case) | #71 | Brak możliwości zmiany stanów łączników, profili P/Q per Case | Scenariusze N-1 wymagają nowego ENM snapshot |
| Porównanie wyników ΔU, ΔI, ΔP | #72 | Brak automatycznego diff wyników między Cases | Porównanie ograniczone do config |
| Load/Gen profiles per Case | #71 | Brak profili obciążeń/generacji per Case | Jeden profil per snapshot |
| BESS mode per Case | #67 | Brak jawnego trybu BESS per Case | Tryb implicit z p_mw |
| OperatingCase → StudyCase migration | — | Dwa byty Case (legacy OperatingCase + nowy StudyCase) | Dualność API |
| Scenario switches_state_ref | #73 | P10 Scenario ma pole switches_state_ref ale = Any | Brak typowanego kontraktu |
| ResultStatus on AnalysisRun | — | result_status na run-level redundancja z case-level | Potencjalna niespójność |

---

**DOMENA SCENARIUSZY OBLICZENIOWYCH & STUDY CASES W ROZDZIALE 10 JEST ZAMKNIĘTA (v1.0).**

---

*Koniec Rozdziału 10*
