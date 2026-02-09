# Rozdział 9 — System Zabezpieczeń (Protection System) — ETAP-Grade

**Wersja:** 1.0
**Status:** AS-IS (z sekcjami TO-BE jawnie oznaczonymi)
**Warstwa:** Domain (ProtectionDevice) + Analysis (Coordination, Comparison) + Presentation (TCC, Reports)
**Zależności:** Rozdział 2 (§2.15–§2.21 — kanon architektoniczny zabezpieczeń), Rozdział 6 (Solver Contracts), Rozdział 7 (Source/Generator/Load), Rozdział 8 (Katalogi Typów)
**Decision Matrix:** Decyzje #21, #22, #23, #24, #25 (AUDIT_SPEC_VS_CODE.md — Rozdział 2)
**Kod źródłowy:** `domain/protection_device.py`, `domain/protection_analysis.py`, `domain/protection_comparison.py`, `domain/protection_vendors.py`, `protection/curves/iec_curves.py`, `protection/curves/ieee_curves.py`, `application/analyses/protection/sanity_checks/`, `api/protection_runs.py`, `api/protection_coordination.py`, `api/protection_comparisons.py`

---

## §9.0 — Zakres i cel rozdziału

### §9.0.1 Cel

Niniejszy rozdział definiuje **kanoniczny system zabezpieczeń MV-DESIGN-PRO** na poziomie ETAP-grade, obejmujący:
- model danych zabezpieczeń (ProtectionDevice, nastawy, krzywe),
- podział na klasy: TECHNOLOGICZNE vs SIECIOWE,
- koordynację czasowo-prądową (czułość, selektywność, przeciążalność),
- koordynację z OZE / falownikami,
- punkty pomiarowe i aparaty wykonawcze,
- White Box Protection Trace (deterministyczny łańcuch przyczynowy),
- wykresy TCC (IEC 60255 + IEEE C37.112),
- porównanie scenariuszy A/B (selektywność),
- walidacje systemowe (sanity checks),
- eksport raportów (PDF, DOCX).

### §9.0.2 Zasada nadrzędna (BINDING — Decyzja #21)

> **Zabezpieczenie NIE jest elementem sieci obliczeniowej (ENM).**
>
> Zabezpieczenie jest **logiką decyzyjną** przypisaną do aparatu, pola i punktu pomiarowego,
> która **reaguje na wielkości z ENM / solverów**.

**NOT-A-SOLVER Rule:** Warstwa Protection NIE zawiera fizyki obliczeniowej. Zabezpieczenia operują na wynikach solverów (prądy zwarciowe, napięcia, częstotliwości) — nie obliczają ich samodzielnie.

### §9.0.3 Referencja do Rozdziału 2 (§2.15–§2.21)

Rozdział 2 definiuje **kompletny kanon architektoniczny zabezpieczeń** na poziomie modelu domenowego ENM. Niniejszy Rozdział 9 **implementuje ten kanon** na poziomie warstwy Analysis / Domain / Presentation. Decyzje #21–#25 z Rozdziału 2 są BINDING i NIE są powtarzane — jedynie referencowane.

| Decyzja | Temat | Referencja |
|---------|-------|-----------|
| #21 | Podział Technological vs Network | Rozdział 2 §2.15 |
| #22 | Koordynacja falownik ↔ sieć | Rozdział 2 §2.16 |
| #23 | White Box Protection | Rozdział 2 §2.17 |
| #24 | UI nastaw ETAP-style | Rozdział 2 §2.18 |
| #25 | ProtectionDevice jako byt logiczny | Rozdział 2 §2.20 |

---

## §9.1 — Podział zabezpieczeń: TECHNOLOGICZNE vs SIECIOWE

### §9.1.1 Dwie klasy (rozłączne) — BINDING

| Klasa | Opis | Czasy | Selektywność | Przykłady |
|-------|------|-------|-------------|-----------|
| **TECHNOLOGICAL** | Wbudowane w urządzenia (falowniki, przekształtniki) | ≤250 ms (czas własny) | Brak selektywności sieciowej | Anti-islanding, U/f falownika, LVRT/HVRT |
| **NETWORK** | Nadprądowe, ziemnozwarciowe, napięciowe, częstotliwościowe | Koordynowane czasowo | Pełna selektywność | 50/51, 50N/51N, 27, 59, 81U/81O, 79 |

### §9.1.2 Zakaz mieszania klas (BINDING — Decyzja #25)

> Jedno urządzenie logiczne (ProtectionDevice) NIE MOŻE zawierać funkcji obu klas jednocześnie. Falownik i przekaźnik sieciowy to OSOBNE byty.

### §9.1.3 Kolejność zadziałania (BINDING — Decyzja #22)

```
ZDARZENIE (zwarcie, przeciążenie, wyspa)
    │
    ▼ t ≤ 250 ms
FALOWNIK (TECHNOLOGICAL) → odłącza się PIERWSZY
    │
    ▼ t = t_nastawa (koordynacja)
SIEĆ (NETWORK) → reaguje PO falowniku
```

Zabezpieczenie technologiczne falownika **ZAWSZE odłącza się przed** zabezpieczeniem sieciowym. Falownik jest **warunkiem brzegowym**, nie uczestnikiem koordynacji selektywnej.

---

## §9.2 — Model danych: ProtectionDevice (AS-IS)

### §9.2.1 Kontrakt ProtectionDevice (frozen dataclass)

```python
# domain/protection_device.py:256
@dataclass(frozen=True)
class ProtectionDevice:
    id: UUID
    name: str
    device_type: ProtectionDeviceType    # RELAY | FUSE | RECLOSER | CIRCUIT_BREAKER
    location_element_id: str             # ID elementu chronionego (branch/bus)
    settings: OvercurrentProtectionSettings
    manufacturer: str | None = None
    model: str | None = None
    location_description: str | None = None
    ct_ratio: str | None = None          # np. "400/5"
    rated_current_a: float | None = None
    created_at: datetime
```

**Kod AS-IS:** `domain/protection_device.py:256–288`

### §9.2.2 ProtectionDeviceType (enum)

| Wartość | Opis (PL) | Odpowiednik |
|---------|-----------|-------------|
| `RELAY` | Przekaźnik nadprądowy | Sepam, MiCOM, SIPROTEC |
| `FUSE` | Bezpiecznik | Bezpiecznik SN |
| `RECLOSER` | Wyłącznik samoczynny | Reklozer liniowy |
| `CIRCUIT_BREAKER` | Wyłącznik z wyzwalaczem nadprądowym | Wyłącznik polowy |

**Kod AS-IS:** `domain/protection_device.py:40–46`

### §9.2.3 OvercurrentProtectionSettings — 5 stopni (AS-IS)

```python
# domain/protection_device.py:208
@dataclass(frozen=True)
class OvercurrentProtectionSettings:
    stage_51: OvercurrentStageSettings       # I>  (czas-zależny, ANSI 51)
    stage_50: OvercurrentStageSettings | None  # I>> (szybki, ANSI 50)
    stage_50_high: OvercurrentStageSettings | None  # I>>> (bardzo szybki)
    stage_51n: OvercurrentStageSettings | None  # I0> (ziemnozwarciowy, ANSI 51N)
    stage_50n: OvercurrentStageSettings | None  # I0>> (ziemnozwarciowy szybki, ANSI 50N)
```

### §9.2.4 OvercurrentStageSettings (AS-IS)

```python
# domain/protection_device.py:166
@dataclass(frozen=True)
class OvercurrentStageSettings:
    enabled: bool
    pickup_current_a: float                  # Prąd rozruchowy Is [A]
    time_s: float | None = None              # Czas niezależny [s] (None jeśli curve-based)
    curve_settings: ProtectionCurveSettings | None = None
    directional: bool = False                # Kierunkowość (placeholder TO-BE)
```

### §9.2.5 ProtectionCurveSettings (AS-IS)

```python
# domain/protection_device.py:105
@dataclass(frozen=True)
class ProtectionCurveSettings:
    standard: CurveStandard      # IEC | IEEE | FUSE
    variant: str                 # SI, VI, EI, LTI, DT
    pickup_current_a: float      # Prąd rozruchowy [A]
    time_multiplier: float       # TMS (IEC) / TD (IEEE), zakres 0.05–10.0
    definite_time_s: float | None = None
    reset_time_s: float = 0.0
```

**Walidacja __post_init__:**
- `pickup_current_a > 0` (prąd rozruchowy musi być dodatni)
- `0.05 ≤ time_multiplier ≤ 10.0`
- `definite_time_s ≥ 0` (jeśli podany)

---

## §9.3 — Funkcje zabezpieczeniowe (ANSI/IEC)

### §9.3.1 Mapa funkcji zaimplementowanych (AS-IS)

| ANSI | IEC | Nazwa PL | Model AS-IS | Status |
|------|-----|----------|-------------|--------|
| **51** | I> | Nadprądowe czas-zależne | `stage_51` (OvercurrentStageSettings) | ✅ AS-IS |
| **50** | I>> | Nadprądowe szybkie | `stage_50` | ✅ AS-IS |
| — | I>>> | Nadprądowe bardzo szybkie | `stage_50_high` | ✅ AS-IS |
| **51N** | I₀> | Ziemnozwarciowe czas-zależne | `stage_51n` | ✅ AS-IS |
| **50N** | I₀>> | Ziemnozwarciowe szybkie | `stage_50n` | ✅ AS-IS |
| **27** | U< | Podnapięciowe | Sanity checks (VOLT_*) | ✅ AS-IS (walidacja) |
| **59** | U> | Nadnapięciowe | Sanity checks (VOLT_*) | ✅ AS-IS (walidacja) |
| **81U** | f< | Podczęstotliwościowe | Sanity checks (FREQ_*) | ✅ AS-IS (walidacja) |
| **81O** | f> | Nadczęstotliwościowe | Sanity checks (FREQ_*) | ✅ AS-IS (walidacja) |
| **81R** | df/dt | ROCOF | Sanity checks (ROCOF_*) | ✅ AS-IS (walidacja) |
| **79** | SPZ | Samoczynne Ponowne Załączenie | `SPZFromInstantaneousCheck` | ✅ AS-IS |

### §9.3.2 Funkcje TO-BE

| ANSI | Nazwa | Status |
|------|-------|--------|
| **21** | Odległościowe (Distance) | TO-BE (enum zdefiniowany, brak implementacji) |
| **87** | Różnicowe (Differential) | TO-BE (enum zdefiniowany, brak implementacji) |

---

## §9.4 — Punkty pomiarowe (BINDING)

### §9.4.1 Zasada: jawny punkt pomiarowy

Każda funkcja zabezpieczeniowa MUSI mieć jawnie określony punkt pomiarowy:

| Wielkość mierzona | Punkt pomiarowy | Źródło danych |
|-------------------|----------------|---------------|
| Prąd (I) | Branch / Transformer (CT) | Solver SC: I''k, ip, Ith |
| Napięcie (U) | Bus (VT) | Solver PF: |V| [pu/kV] |
| Częstotliwość (f) | Bus systemowy | Solver PF / dynamiczny (TO-BE) |

### §9.4.2 Punkt pomiarowy na ProtectionDevice (AS-IS)

```python
# domain/protection_device.py:281
location_element_id: str   # ID elementu chronionego (branch/bus/transformer)
ct_ratio: str | None       # Przekładnia CT, np. "400/5"
```

### §9.4.3 Zakaz domyślnych punktów pomiarowych (BINDING)

> **BINDING:** System NIE MOŻE automatycznie przypisywać punktów pomiarowych. Użytkownik MUSI jawnie wybrać element (Branch/Bus/Transformer) i przekładnię CT.

### §9.4.4 CT/VT — stan AS-IS

**Stan AS-IS:** CT istnieje jako `ct_ratio: str` (np. "400/5") na ProtectionDevice. VT nie jest zaimplementowany. Brak dedykowanych klas CT/VT w domain layer.

> **TO-BE (Decyzja #40, Rozdział 5 §5.14.2):** Dedykowane klasy CTType i VTType w katalogu z pełnymi parametrami (przekładnia, klasa dokładności, obciążalność, nasycenie).

---

## §9.5 — Charakterystyki czasowo-prądowe (Krzywe)

### §9.5.1 Standard IEC 60255-151 (AS-IS)

**Formuła:**

$$t = TMS \cdot \frac{A}{M^B - 1} + C$$

gdzie:
- $t$ = czas zadziałania [s]
- $TMS$ = mnożnik czasowy (Time Multiplier Setting)
- $M = I / I_s$ = krotność prądu (prąd zwarciowy / prąd rozruchowy)
- $A, B, C$ = stałe krzywej (per wariant)

**Stałe krzywych IEC (AS-IS):**

| Wariant | A | B | C | Nazwa PL |
|---------|---|---|---|----------|
| SI | 0.14 | 0.02 | 0.0 | Normalna odwrotna |
| VI | 13.5 | 1.0 | 0.0 | Bardzo odwrotna |
| EI | 80.0 | 2.0 | 0.0 | Ekstremalnie odwrotna |
| LTI | 120.0 | 1.0 | 0.0 | Długoczasowa odwrotna |
| DT | — | — | — | Czas niezależny (t = const) |

**Kod AS-IS:** `protection/curves/iec_curves.py`

**Wynik obliczeń (White Box):**

```python
@dataclass(frozen=True)
class IECTrippingResult:
    tripping_time_s: float
    current_multiple: float      # M = I/Is
    time_multiplier: float       # TMS
    m_power_b: float            # M^B
    denominator: float          # M^B - 1
    base_time_s: float          # A / (M^B - 1)
    will_trip: bool             # M > 1.0
```

### §9.5.2 Standard IEEE C37.112 (AS-IS)

**Formuła:**

$$t = TD \cdot \left(\frac{A}{M^p - 1} + B\right)$$

**Warianty IEEE:**

| Wariant | Nazwa PL |
|---------|----------|
| MI | Umiarkowanie odwrotna |
| VI | Bardzo odwrotna |
| EI | Ekstremalnie odwrotna |
| STI | Krótkoczas. odwrotna |
| DT | Czas niezależny |

**Kod AS-IS:** `protection/curves/ieee_curves.py`

### §9.5.3 Krzywe producenckie (Vendor Curves) — AS-IS

```python
# domain/protection_vendors.py
class Manufacturer(str, Enum):
    ABB, SIEMENS, SCHNEIDER, ETANGO, EATON, GE, SEL, AREVA, ALSTOM,
    NOJA, ORMAZABAL, GENERIC, OTHER

class CurveOrigin(str, Enum):
    IEC_STANDARD      # Krzywa standardowa IEC
    DERIVED_VENDOR    # Krzywa producenta na bazie IEC
    VENDOR_NATIVE     # Krzywa natywna producenta
```

**Rejestr krzywych producenckich (AS-IS):**

| Kod | Producent | Wariant | Origin |
|-----|-----------|---------|--------|
| ABB_SI | ABB | SI | IEC_STANDARD |
| SIEMENS_VI | Siemens | VI | IEC_STANDARD |
| SCHNEIDER_EI | Schneider | EI | IEC_STANDARD |
| ETANGO_SI | Etango | SI | DERIVED_VENDOR |
| EATON_VI | Eaton | VI | IEC_STANDARD |
| GE_EI | GE | EI | IEC_STANDARD |
| SEL_SI | SEL | SI | IEC_STANDARD |
| IEC_SI/VI/EI/LTI | Generic | SI/VI/EI/LTI | IEC_STANDARD |

**Kod AS-IS:** `domain/protection_vendors.py`

### §9.5.4 Generowanie punktów TCC (AS-IS)

```python
generate_iec_curve_points(settings, n_points=50)  # logarithmic spacing 1.1×–20× pickup
generate_ieee_curve_points(settings, n_points=50)
```

Punkty TCC służą do renderowania wykresów Time-Current Characteristic w UI.

---

## §9.6 — Koordynacja zabezpieczeń (Analysis Layer)

### §9.6.1 Trzy kontrole kanoniczne (AS-IS)

| Kontrola | ANSI | Opis PL | Kryterium |
|----------|------|---------|-----------|
| **Czułość** (Sensitivity) | — | Czy zabezpieczenie zadziała przy minimalnym zwarciu? | $I_{fault,min} / I_{pickup} \geq 1.2$ (margines ≥20%) |
| **Selektywność** (Selectivity) | — | Czy zabezpieczenie dolne zadziała przed górnym? | $t_{upstream} - t_{downstream} \geq \Delta t_{wymagane}$ |
| **Przeciążalność** (Overload) | — | Czy zabezpieczenie NIE zadziała przy prądzie roboczym? | $I_{pickup} / I_{operating} \geq 1.2$ (margines ≥20%) |

### §9.6.2 SensitivityCheck (frozen dataclass, AS-IS)

```python
# domain/protection_device.py:372
@dataclass(frozen=True)
class SensitivityCheck:
    device_id: str
    i_fault_min_a: float         # Minimalny prąd zwarciowy [A]
    i_pickup_a: float            # Prąd rozruchowy [A]
    margin_percent: float        # (I_fault/I_pickup - 1) × 100
    verdict: CoordinationVerdict # PASS (≥20%) | MARGINAL (10–20%) | FAIL (<10%)
    notes_pl: str                # Deterministic Polish explanation
```

### §9.6.3 SelectivityCheck (frozen dataclass, AS-IS)

```python
# domain/protection_device.py:408
@dataclass(frozen=True)
class SelectivityCheck:
    upstream_device_id: str
    downstream_device_id: str
    analysis_current_a: float    # Prąd zwarciowy analizy [A]
    t_upstream_s: float          # Czas zadziałania zabezpieczenia górnego [s]
    t_downstream_s: float        # Czas zadziałania zabezpieczenia dolnego [s]
    margin_s: float              # t_upstream - t_downstream [s]
    required_margin_s: float     # Wymagany margines [s]
    verdict: CoordinationVerdict
    notes_pl: str
```

### §9.6.4 OverloadCheck (frozen dataclass, AS-IS)

```python
# domain/protection_device.py:453
@dataclass(frozen=True)
class OverloadCheck:
    device_id: str
    i_operating_a: float         # Prąd roboczy [A]
    i_pickup_a: float            # Prąd rozruchowy [A]
    margin_percent: float        # (I_pickup/I_operating - 1) × 100
    verdict: CoordinationVerdict
    notes_pl: str
```

### §9.6.5 CoordinationVerdict (enum, AS-IS)

| Wartość | Opis PL | Kryteria |
|---------|---------|----------|
| `PASS` | Prawidłowa | Margines ≥ wymagany |
| `MARGINAL` | Margines niski | Margines w zakresie tolerancji (ale akceptowalny) |
| `FAIL` | Nieskoordynowane | Margines poniżej wymaganego |
| `ERROR` | Błąd analizy | Brak danych wejściowych |

### §9.6.6 ProtectionCoordinationResult (frozen dataclass, AS-IS)

```python
# domain/protection_device.py:494
@dataclass(frozen=True)
class ProtectionCoordinationResult:
    run_id: str
    project_id: str
    devices: tuple[ProtectionDevice, ...]
    sensitivity_checks: tuple[SensitivityCheck, ...]
    selectivity_checks: tuple[SelectivityCheck, ...]
    overload_checks: tuple[OverloadCheck, ...]
    overall_verdict: CoordinationVerdict
    summary: dict[str, Any]
    created_at: datetime
```

### §9.6.7 Kontrole I>> (FIX-12D Integration) — AS-IS

System posiada dodatkowe kontrole dedykowane dla stopnia I>> (szybkiego):

| Kontrola | Opis | Kryterium |
|----------|------|-----------|
| `InstantaneousSelectivityCheck` | Selektywność I>> | $I_{nast} \geq k_b \cdot I_{k,max}^{next} / \theta_i$ |
| `InstantaneousSensitivityCheck` | Czułość I>> | $I_{k,min}^{busbars} / \theta_i \geq k_c \cdot I_{nast}$ |
| `InstantaneousThermalCheck` | Wytrzymałość cieplna I>> | $I_{nast} \leq k_{bth} \cdot I_{th,dop} / \theta_i$ |
| `SPZFromInstantaneousCheck` | Blokada SPZ od I>> | SPZ dozwolony/zablokowany |

**Kod AS-IS:** `domain/protection_device.py:592–774`

---

## §9.7 — Koordynacja z OZE / falownikami (BINDING — Decyzja #22)

### §9.7.1 Zasada: falownik = warunek brzegowy

Falownik **NIGDY** nie uczestniczy w selektywności sieciowej. Zabezpieczenia technologiczne falownika (anti-islanding, U/f, LVRT/HVRT) działają niezależnie od zabezpieczeń sieciowych.

### §9.7.2 Relacja czasowa (BINDING)

```
t_falownik ≤ 250 ms (czas własny, niekonfigurowalny)
t_sieć = t_nastawa (koordynowana, konfigurowana)

WYMAGANIE: t_falownik < t_sieć (ZAWSZE)
```

Jeśli $t_{sieć} < t_{falownik}$: system generuje **W-P01 WARNING** (konflikt czasowy).

### §9.7.3 Scenariusze kanoniczne (BINDING — Decyzja #22, Rozdział 2 §2.16.3)

| Scenariusz | Zdarzenie | Falownik | Sieć | Skutek |
|-----------|-----------|----------|------|--------|
| **SC_SN** | Zwarcie na szynie SN | Odłącza się (≤250ms) | I>> / I> zadziała | Wyłączenie pola |
| **SC_LINE** | Zwarcie na linii SN | Odłącza się | I>> linii zadziała | Wyłączenie odcinka |
| **ISLAND** | Wyspa (zanik zasilania) | Detekcja wyspy, odłączenie | — | Falownik wyłączony |
| **OVERLOAD** | Przeciążenie trafo nn/SN | Odłącza się (ograniczenie mocy) | I> trafo zadziała (z opóźnieniem) | Ograniczenie mocy lub wyłączenie |
| **VOLTAGE** | Zanik napięcia SN | 27 U< → odłączenie | 27 U< sieciowe | Wyłączenie sekcji |

### §9.7.4 Scenariusz dual „z OZE" / „bez OZE" (TO-BE — Decyzja #22)

> **TO-BE** — nie zaimplementowane. Wymaga osobnej decyzji.

Docelowo solver SC powinien uruchamiać dwa warianty:
- **z OZE**: wkład InverterSource ($I''_{k,inv} = k_{sc} \cdot I_n$) uwzględniony
- **bez OZE**: bez wkładu falownikowego (po odłączeniu)

Różnica prądów zwarciowych wpływa na nastawy i selektywność.

### §9.7.5 Normy referencyjne

| Norma | Zakres |
|-------|--------|
| IEC 60909-0 | Obliczenia zwarciowe |
| IEC 60255-151 | Charakterystyki czasowo-prądowe |
| IEEE C37.112 | Krzywe nadprądowe (alternatywny standard) |
| NC RfG (EU 2016/631) | Wymogi przyłączania generatorów |
| IRiESD | Instrukcja Ruchu i Eksploatacji Sieci Dystrybucyjnej |
| PN-EN 50549-1/2 | Wymogi dla instalacji wytwórczych (nn/SN) |
| IEC 62116 | Detekcja pracy wyspowej |

---

## §9.8 — Protection Analysis Pipeline (AS-IS)

### §9.8.1 ProtectionEvaluation — wynik per (urządzenie, zwarcie)

```python
# domain/protection_analysis.py
@dataclass(frozen=True)
class ProtectionEvaluation:
    device_id: str
    device_type_ref: str
    protected_element_ref: str
    fault_target_id: str
    i_fault_a: float              # Prąd zwarciowy [A]
    i_pickup_a: float             # Prąd rozruchowy [A]
    t_trip_s: float               # Czas zadziałania [s]
    trip_state: TripState         # TRIPS | NO_TRIP | INVALID
    curve_ref: str | None
    curve_kind: str | None
    margin_percent: float
    notes_pl: str                 # Deterministyczne notatki PL
```

### §9.8.2 TripState (enum)

| Wartość | Opis |
|---------|------|
| `TRIPS` | Zabezpieczenie zadziała |
| `NO_TRIP` | Zabezpieczenie NIE zadziała |
| `INVALID` | Brak danych do oceny |

### §9.8.3 ProtectionResult — kompletny wynik analizy

```python
@dataclass(frozen=True)
class ProtectionResult:
    evaluations: tuple[ProtectionEvaluation, ...]
    summary: ProtectionResultSummary
```

```python
@dataclass(frozen=True)
class ProtectionResultSummary:
    total_evaluations: int
    trips_count: int
    no_trip_count: int
    invalid_count: int
    min_trip_time_s: float | None
    max_trip_time_s: float | None
```

### §9.8.4 ProtectionRunStatus — cykl życia analizy

| Status | Opis |
|--------|------|
| `CREATED` | Run utworzony, nie uruchomiony |
| `RUNNING` | Analiza w toku |
| `FINISHED` | Analiza zakończona pomyślnie |
| `FAILED` | Analiza zakończona błędem |

### §9.8.5 ProtectionAnalysisRun (frozen dataclass)

```python
@dataclass(frozen=True)
class ProtectionAnalysisRun:
    id: UUID
    project_id: str
    sc_run_id: str               # Referencja do wyników SC
    protection_case_id: str
    status: ProtectionRunStatus
    input_hash: str              # SHA-256 danych wejściowych
    input_snapshot: dict
    result_summary: ProtectionResultSummary | None
    trace_json: str | None       # Serializowany ProtectionTrace
    error_message: str | None
```

---

## §9.9 — White Box Protection Trace (BINDING — Decyzja #23)

### §9.9.1 Łańcuch przyczynowy (9 kroków)

```
1. ENM → identyfikacja elementów (urządzenie, punkt pomiarowy)
2. Scenariusz → typ zwarcia, lokalizacja, c_factor
3. Wielkość → prąd zwarciowy z solvera SC (Ik'', ip, Ith)
4. Funkcja → typ funkcji zabezpieczeniowej (51, 50, 50N, ...)
5. Nastawa → I_pickup, TMS, t_def
6. Decyzja → TRIPS / NO_TRIP / INVALID (z uzasadnieniem)
7. Czas → t_trip [s] (obliczony z krzywej lub DT)
8. Aparat → identyfikacja aparatu wykonawczego
9. Skutek → co zostaje wyłączone, jaki odcinek sieci
```

### §9.9.2 ProtectionTraceStep (frozen dataclass, AS-IS)

```python
# domain/protection_analysis.py
@dataclass(frozen=True)
class ProtectionTraceStep:
    step: int                    # Numer kroku (1-9)
    description_pl: str          # Deterministyczny opis PL
    inputs: dict                 # Dane wejściowe kroku
    outputs: dict                # Dane wyjściowe kroku
```

### §9.9.3 ProtectionTrace (frozen dataclass, AS-IS)

```python
@dataclass(frozen=True)
class ProtectionTrace:
    run_id: str
    sc_run_id: str               # Referencja do SC run
    snapshot_id: str
    template_ref: str | None
    overrides: dict
    steps: tuple[ProtectionTraceStep, ...]  # Immutable audit trail
```

### §9.9.4 Raport „Kto zadziałał pierwszy" (BINDING — Decyzja #23)

White Box MUSI odpowiadać na pytanie:

> **„KTO zadziałał pierwszy i DLACZEGO?"**

Format raportu:
1. Sekwencja zadziałań posortowana chronologicznie (po $t_{trip}$)
2. Dla każdego zadziałania: urządzenie → funkcja → nastawa → czas → skutek
3. Rozróżnienie `event_class`: TECHNOLOGICAL vs NETWORK

> **TO-BE:** Pole `event_class` ∈ {TECHNOLOGICAL, NETWORK} oraz `event_scope` ∈ {LOCAL_DEVICE, NETWORK_SECTION} — nie zaimplementowane w obecnym `ProtectionTrace`.

---

## §9.10 — Porównanie scenariuszy A/B (Protection Comparison)

### §9.10.1 Cel

Porównanie dwóch przebiegów ochronnych (np. „stare nastawy" vs „nowe nastawy" lub „z OZE" vs „bez OZE") z automatyczną identyfikacją regresji i ulepszeń.

### §9.10.2 StateChange (enum)

| Wartość | Opis | Severity |
|---------|------|----------|
| `NO_CHANGE` | Brak zmiany | — |
| `TRIP_TO_NO_TRIP` | **REGRESJA** — utrata zadziałania | CRITICAL (5) |
| `NO_TRIP_TO_TRIP` | **ULEPSZENIE** — nowe zadziałanie | INFORMATIONAL (1) |
| `INVALID_CHANGE` | Zmiana stanu INVALID | MODERATE (3) |

### §9.10.3 IssueCode (enum)

| Kod | Severity | Opis |
|-----|----------|------|
| `TRIP_LOST` | CRITICAL (5) | Utrata zadziałania |
| `TRIP_GAINED` | INFORMATIONAL (1) | Nowe zadziałanie |
| `DELAY_INCREASED` | MODERATE (3) | Zwiększony czas zadziałania |
| `DELAY_DECREASED` | MINOR (2) | Zmniejszony czas zadziałania |
| `INVALID_STATE` | MAJOR (4) | Przejście do stanu INVALID |
| `MARGIN_DECREASED` | MODERATE (3) | Zmniejszenie marginesu |
| `MARGIN_INCREASED` | MINOR (2) | Zwiększenie marginesu |

### §9.10.4 ProtectionComparisonResult (frozen dataclass)

```python
# domain/protection_comparison.py
@dataclass(frozen=True)
class ProtectionComparisonResult:
    comparison_id: str
    run_a_id: str
    run_b_id: str
    project_id: str
    rows: tuple[ProtectionComparisonRow, ...]
    ranking: tuple[RankingIssue, ...]     # Posortowane per severity
    summary: ProtectionComparisonSummary
```

**Kod AS-IS:** `domain/protection_comparison.py`

---

## §9.11 — Walidacje systemowe (Sanity Checks)

### §9.11.1 Architektura sanity checks (AS-IS)

Sanity checks walidują **konfigurację zabezpieczeń** przed uruchomieniem analizy. Są niezależne od ENM Validator (Rozdział 6 §6.10).

**Kod AS-IS:** `application/analyses/protection/sanity_checks/`

### §9.11.2 Reguły walidacji per funkcja

#### Napięciowe (27/59):

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| `VOLT_MISSING_UN` | ERROR | Brak Un przy basis=UN | Brak napięcia bazowego |
| `VOLT_OVERLAP` | ERROR | U< ≥ U> | Próg U< wyższy niż U> — nakładanie |
| `VOLT_U_LT_TOO_LOW` | WARN | U< < 0.5 × Un | Próg U< podejrzanie niski |
| `VOLT_U_GT_TOO_HIGH` | WARN | U> > 1.2 × Un | Próg U> podejrzanie wysoki |

#### Częstotliwościowe (81U/81O):

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| `FREQ_OVERLAP` | ERROR | f< ≥ f> | Próg f< wyższy niż f> — nakładanie |
| `FREQ_F_LT_TOO_LOW` | WARN | f< < 45 Hz | Próg f< podejrzanie niski |
| `FREQ_F_GT_TOO_HIGH` | WARN | f> > 55 Hz | Próg f> podejrzanie wysoki |

#### ROCOF (81R):

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| `ROCOF_NON_POSITIVE` | WARN | df/dt ≤ 0 | ROCOF nieadditni |
| `ROCOF_TOO_HIGH` | WARN | df/dt > 10 Hz/s | ROCOF podejrzanie wysoki |

#### Nadprądowe (50/51):

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| `OC_MISSING_IN` | ERROR | Brak In przy basis=IN | Brak prądu bazowego |
| `OC_OVERLAP` | ERROR | I> ≥ I>> | Próg I> wyższy niż I>> — nakładanie |
| `OC_I_GT_TOO_LOW` | WARN | I> < 1.0 × In | Próg I> poniżej prądu znamionowego |
| `OC_I_INST_TOO_LOW` | WARN | I>> < 1.5 × In | Próg I>> podejrzanie niski |

#### SPZ (79):

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| `SPZ_NO_TRIP_FUNCTION` | WARN | SPZ bez funkcji zwarciowej | SPZ aktywny bez wyzwalacza |
| `SPZ_MISSING_CYCLE_DATA` | INFO | Brak danych cyklu SPZ | Brak parametrów cyklu SPZ |

#### Ogólne:

| Kod | Severity | Warunek | Komunikat |
|-----|----------|---------|-----------|
| `GEN_NEGATIVE_SETPOINT` | ERROR | Nastawa ujemna | Wartość nastawy ujemna — niefizyczna |
| `GEN_PARTIAL_ANALYSIS` | INFO | Brak wartości bazowych | Analiza częściowa — brak danych |

### §9.11.3 Walidacje architektoniczne (BINDING — Rozdział 2 §2.19)

| Kod | Severity | Warunek | Opis |
|-----|----------|---------|------|
| **E-P01** | ERROR | Brak punktu pomiarowego | ProtectionDevice bez location_element_id |
| **E-P02** | ERROR | Mieszanie klas | Funkcja TECHNOLOGICAL i NETWORK w jednym urządzeniu |
| **E-P03** | ERROR | Brak aparatu wykonawczego | Zabezpieczenie bez przypisanego łącznika/wyłącznika |
| **E-P04** | ERROR | Brak SC run | Analiza Protection bez wyników SC |
| **W-P01** | WARNING | Konflikt czasowy: sieć < falownik | t_sieć < t_falownik (≤250ms) |
| **W-P02** | WARNING | Brak White Box trace | Ewaluacja bez pełnego ProtectionTrace |
| **W-P03** | WARNING | I>> < Ik_min | Próg I>> poniżej minimalnego prądu zwarciowego |
| **W-P04** | WARNING | I> > In_trafo | Próg I> powyżej prądu znamionowego transformatora |
| **I-P01** | INFO | Zabezpieczenie technologiczne | Funkcja technologiczna nie uczestniczy w selektywności |
| **I-P02** | INFO | Scenariusz z/bez OZE | Różnica prądów po odłączeniu falownika |

---

## §9.12 — UI nastaw (ETAP-Style) — kontrakt prezentacyjny

### §9.12.1 Zasada: UI = projekcja ENM + Protection + Analysis (BINDING — Decyzja #24)

UI zabezpieczeń NIE posiada osobnego modelu danych. Jest **projekcją** danych z:
- ENM (topologia, elementy),
- Protection domain (urządzenia, nastawy),
- Analysis (wyniki koordynacji, TCC).

### §9.12.2 Tabela ETAP-style — 11 kolumn obowiązkowych (BINDING)

| # | Kolumna | Źródło danych |
|---|---------|---------------|
| 1 | Urządzenie (nazwa) | ProtectionDevice.name |
| 2 | Typ (przekaźnik/bezpiecznik/reklozer) | ProtectionDevice.device_type |
| 3 | Lokalizacja | ProtectionDevice.location_description |
| 4 | Producent / Model | ProtectionDevice.manufacturer, .model |
| 5 | CT ratio | ProtectionDevice.ct_ratio |
| 6 | Funkcja (I>, I>>, I0>) | OvercurrentProtectionSettings.stage_* |
| 7 | Nastawy (Is, TMS, t) | OvercurrentStageSettings.pickup_current_a, .time_multiplier |
| 8 | Krzywa (SI/VI/EI/DT) | ProtectionCurveSettings.variant |
| 9 | Czułość (verdict) | SensitivityCheck.verdict |
| 10 | Selektywność (verdict) | SelectivityCheck.verdict |
| 11 | Źródło sygnału (CT/VT) | ProtectionDevice.ct_ratio, Bay.protection_ref |

### §9.12.3 Tryby UI (BINDING — Decyzja #24)

| Tryb | Zakres | Edycja |
|------|--------|--------|
| **Standardowy** | Zabezpieczenia sieciowe | Pełna edycja nastaw |
| **Ekspercki** | Jak standardowy + podgląd technologicznych | Sieciowe: pełna edycja; Technologiczne: **READ-ONLY** |

### §9.12.4 Wykresy TCC (BINDING)

- Standard IEC 60255 (krzywe SI, VI, EI, LTI, DT)
- Standard IEEE C37.112 (krzywe MI, VI, EI, STI, DT)
- Skala logarytmiczna (prąd: 1–100× Is; czas: 0.01–100 s)
- Nakładanie wielu urządzeń na jednym wykresie
- Renderowanie krzywych producenckich (VendorCurveDefinition)

---

## §9.13 — API Protection (AS-IS)

### §9.13.1 Endpointy Protection Analysis Runs

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/projects/{id}/protection-runs` | Utworzenie nowego przebiegu ochronnego |
| POST | `/protection-runs/{id}/execute` | Uruchomienie analizy |
| GET | `/protection-runs/{id}` | Status i metadane przebiegu |
| GET | `/protection-runs/{id}/results` | Pełne wyniki (evaluations) |
| GET | `/protection-runs/{id}/trace` | White Box trace (audit trail) |
| GET | `/projects/{id}/sld/{diagram_id}/protection-overlay` | Nakładka Protection na SLD |

### §9.13.2 Endpointy Protection Coordination

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/projects/{id}/protection-coordination/run` | Uruchomienie koordynacji |
| GET | `/{run_id}` | Pełny wynik koordynacji |
| GET | `/{run_id}/tcc` | Dane TCC (Time-Current Characteristic) |
| GET | `/{run_id}/checks/sensitivity` | Wyniki czułości |
| GET | `/{run_id}/checks/selectivity` | Wyniki selektywności |
| GET | `/{run_id}/checks/overload` | Wyniki przeciążalności |

### §9.13.3 Endpointy Protection Comparison

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/protection-comparisons` | Utworzenie porównania A/B |
| GET | `/{comparison_id}` | Metadane porównania |
| GET | `/{comparison_id}/results` | Pełne wyniki porównania |
| GET | `/{comparison_id}/trace` | Trace porównania (audit) |

---

## §9.14 — Eksport raportów (AS-IS)

System generuje raporty zabezpieczeń w formatach:

| Format | Plik | Status |
|--------|------|--------|
| PDF | `reporting/protection_report_pdf.py` | ✅ AS-IS |
| DOCX | `reporting/protection_report_docx.py` | ✅ AS-IS |

Raporty zawierają:
- tabelę nastaw (ETAP-style),
- wykresy TCC,
- wyniki koordynacji (czułość, selektywność, przeciążalność),
- White Box trace (łańcuch przyczynowy).

---

## §9.15 — Zakazy i anty-wzorce (BINDING)

| ID | Zakaz | Uzasadnienie |
|----|-------|-------------|
| **Z-PROT-01** | Zabezpieczenie NIE MOŻE być elementem topologicznym ENM (Branch/Bus) | Decyzja #25: byt logiczny, nie obliczeniowy |
| **Z-PROT-02** | Zabezpieczenie NIE MOŻE posiadać własnego solvera | NOT-A-SOLVER rule: analiza = interpretacja wyników solverów |
| **Z-PROT-03** | Zakaz mieszania klas TECHNOLOGICAL/NETWORK w jednym urządzeniu | Decyzja #25: rozłączne klasy |
| **Z-PROT-04** | Zakaz domyślnych punktów pomiarowych (implicit measurement) | Punkt pomiarowy MUSI być jawny |
| **Z-PROT-05** | Zakaz edycji nastaw technologicznych falownika w UI | Decyzja #24: technologiczne = READ-ONLY |
| **Z-PROT-06** | Zakaz traktowania falownika jako uczestnika selektywności sieciowej | Decyzja #22: falownik = warunek brzegowy |
| **Z-PROT-07** | Zakaz niedeterministycznych wyników ochrony | Frozen dataclasses, sorted outputs, deterministic notes_pl |
| **Z-PROT-08** | Zakaz analizy Protection bez wyników SC | E-P04: SC run jest warunkiem wstępnym |

---

## §9.16 — Inwarianty systemu zabezpieczeń (BINDING)

| ID | Inwariant | Status |
|----|-----------|--------|
| **INV-PROT-01** | Wszystkie struktury danych Protection frozen=True (immutable) | AS-IS |
| **INV-PROT-02** | Polskie etykiety deterministyczne (DEVICE_TYPE_LABELS_PL, VERDICT_LABELS_PL) | AS-IS |
| **INV-PROT-03** | White Box trace: pełny łańcuch ENM→Scenariusz→Wielkość→Nastawa→Decyzja→Aparat→Skutek | AS-IS (ProtectionTrace) |
| **INV-PROT-04** | Deterministyczność: te same dane wejściowe → identyczne wyniki | AS-IS |
| **INV-PROT-05** | Koordynacja: 3 kontrole obowiązkowe (czułość + selektywność + przeciążalność) | AS-IS |
| **INV-PROT-06** | Falownik zawsze odłącza się pierwszy (t_tech ≤ 250ms < t_sieć) | BINDING (Decyzja #22) |
| **INV-PROT-07** | Porównanie A/B: severity ranking deterministyczny (ISSUE_SEVERITY_MAP) | AS-IS |
| **INV-PROT-08** | Krzywe IEC 60255 + IEEE C37.112: formuły zaimplementowane z parametrami White Box | AS-IS |

---

## §9.17 — Definition of Done (Rozdział 9)

### §9.17.1 Kryteria akceptacji

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | ProtectionDevice (frozen, 11 pól) opisany 1:1 z `protection_device.py:256–288` | ✅ |
| 2 | 5 stopni nadprądowych (51, 50, 50_high, 51n, 50n) opisanych 1:1 | ✅ |
| 3 | ProtectionCurveSettings (6 pól) opisany 1:1 | ✅ |
| 4 | Podział TECHNOLOGICAL vs NETWORK sformułowany (Decyzja #21) | ✅ |
| 5 | 11 funkcji zabezpieczeniowych (ANSI 27/50/50N/51/51N/59/79/81U/81O/81R + I>>>) | ✅ |
| 6 | Krzywe IEC (SI/VI/EI/LTI/DT) z formułami i stałymi | ✅ |
| 7 | Krzywe IEEE (MI/VI/EI/STI/DT) opisane | ✅ |
| 8 | Krzywe producenckie (ABB/Siemens/Schneider/Etango/Eaton/GE/SEL) | ✅ |
| 9 | 3 kontrole koordynacji (czułość, selektywność, przeciążalność) | ✅ |
| 10 | 4 kontrole I>> (FIX-12D: selectivity, sensitivity, thermal, SPZ) | ✅ |
| 11 | CoordinationVerdict (PASS/MARGINAL/FAIL/ERROR) | ✅ |
| 12 | ProtectionEvaluation + ProtectionResult (frozen) | ✅ |
| 13 | White Box: ProtectionTrace + ProtectionTraceStep (9 kroków) | ✅ |
| 14 | Porównanie A/B: StateChange, IssueCode, severity ranking | ✅ |
| 15 | Sanity checks: 16 reguł (VOLT/FREQ/ROCOF/OC/SPZ/GEN) | ✅ |
| 16 | Walidacje architektoniczne: E-P01..E-P04, W-P01..W-P04, I-P01..I-P02 | ✅ |
| 17 | Koordynacja OZE: falownik = warunek brzegowy, 5 scenariuszy | ✅ |
| 18 | UI ETAP-style: 11 kolumn, 2 tryby (standard/ekspercki), TCC | ✅ |
| 19 | API: 12 endpointów (runs, coordination, comparison) | ✅ |
| 20 | Eksport: PDF + DOCX | ✅ |
| 21 | 8 zakazów (Z-PROT-01..08) i 8 inwariantów (INV-PROT-01..08) | ✅ |
| 22 | Parytet ETAP w modelu zabezpieczeń | ✅ |
| 23 | Sekcje TO-BE NIE blokują zatwierdzenia | ✅ |

### §9.17.2 Zidentyfikowane GAP-y (TO-BE)

| GAP | Decision | Opis | Wpływ |
|-----|----------|------|-------|
| event_class w ProtectionTrace | #23 | Brak pola `event_class` ∈ {TECHNOLOGICAL, NETWORK} | White Box bez klasyfikacji klas |
| event_scope w ProtectionTrace | #23 | Brak pola `event_scope` ∈ {LOCAL_DEVICE, NETWORK_SECTION} | White Box bez zakresu skutku |
| Scenariusz dual z/bez OZE | #22 | SC solver nie uruchamia dwóch wariantów | Brak porównania prądów z/bez wkładu OZE |
| CT/VT w katalogu | #40 | Brak dedykowanych CTType/VTType | CT jako string "400/5", brak VT |
| Zabezpieczenia odległościowe (21) | — | Enum zdefiniowany, brak implementacji | Brak ochrony odległościowej |
| Zabezpieczenia różnicowe (87) | — | Enum zdefiniowany, brak implementacji | Brak ochrony różnicowej |
| Kierunkowość (directional) | — | Placeholder `directional: bool = False` | Brak logiki kierunkowej |

---

**DOMENA SYSTEMU ZABEZPIECZEŃ W ROZDZIALE 9 JEST ZAMKNIĘTA (v1.0).**

---

*Koniec Rozdziału 9*
