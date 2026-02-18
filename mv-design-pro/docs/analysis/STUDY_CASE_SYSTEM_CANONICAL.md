# StudyCase System - Specyfikacja Kanoniczna

> **Status**: BINDING
> **Warstwa**: Domain / Application
> **Data**: 2026-02-17
> **Powiazania**: SYSTEM_SPEC.md, ARCHITECTURE.md

---

## 1. Model StudyCase (rozszerzony)

StudyCase przechowuje **wylacznie konfiguracje obliczeniowa** - nigdy nie mutuje NetworkModel.
Kazdy StudyCase operuje na jednym, wspoldzielonym NetworkModel w trybie tylko-do-odczytu.

```yaml
study_case:
  case_id: deterministyczny (z nazwy i indeksu)
  label_pl: string
  switch_states: map[element_id] -> OTWARTY/ZAMKNIETY/UZGODNIONY
  normal_states: map[element_id] -> state_normal
  source_modes: map[source_element_id] -> SIEC/LOKALNE/REZERWA/WYSPA
  time_profile_ref: optional string
  analysis_settings:
    standard: IEC_60909
    temperature_policy: KANON_REPO
    voltage_factor_policy: KANON_REPO
    fault_resistance_policy: JAWNA
    c_factor_max: 1.10
    c_factor_min: 0.95
    thermal_time_s: 1.0
```

### Invarianty modelu

| Pole | Typ | Ograniczenia |
|------|-----|-------------|
| `case_id` | `str` | Deterministyczny - generowany z `label_pl` + indeksu sekwencyjnego. Niezmienny po utworzeniu. |
| `label_pl` | `str` | Etykieta po polsku. Unikalna w obrebie projektu. Bez kodowych nazw projektowych (P7, P11 itp.). |
| `switch_states` | `Map[str, Enum]` | Klucz = `element_id` lacznika. Wartosc: `OTWARTY`, `ZAMKNIETY`, `UZGODNIONY`. Tylko elementy typu Switch/Breaker. |
| `normal_states` | `Map[str, Enum]` | Stan normalny lacznika - punkt odniesienia dla trybu awaryjnego. |
| `source_modes` | `Map[str, Enum]` | Tryb pracy zrodla: `SIEC` (zasilanie z GPZ), `LOKALNE` (generator/OZE), `REZERWA` (standby), `WYSPA` (odciete od GPZ). |
| `time_profile_ref` | `Optional[str]` | Referencja do profilu czasowego (patrz sekcja 2). Jezeli brak - obliczenia statyczne. |
| `analysis_settings` | `AnalysisSettings` | Parametry obliczeniowe. Niezmienne w trakcie pojedynczego uruchomienia solvera. |

### Reguly `analysis_settings`

- `standard`: Obecnie jedyna dopuszczalna wartosc to `IEC_60909`. Rozszerzenie o inne normy wymaga rewizji architektonicznej.
- `temperature_policy: KANON_REPO` - temperatura przewodnikow pobierana z katalogu (Catalog). Brak wartosci ad-hoc.
- `voltage_factor_policy: KANON_REPO` - wspolczynniki napiecia c wg normy IEC 60909, wartosc z repozytorium kanonicznego.
- `fault_resistance_policy: JAWNA` - rezystancja zwarcia (Rf) musi byc podana jawnie przez uzytkownika. Brak wartosci domyslnych.
- `c_factor_max` / `c_factor_min` - wspolczynniki napiecia wg IEC 60909 Tabela 1.
- `thermal_time_s` - czas trwania zwarcia do obliczenia pradu termicznego I_th. Domyslnie 1.0 s.

---

## 2. Profile czasowe

Profile czasowe umozliwiaja symulacje zmiennosci obciazen i generacji w czasie (time-series power flow).

```yaml
dynamic_profile:
  profile_id: string
  time_unit: "h" | "min"
  points: [{t, p_kw, q_kvar}]
  applies_to_element_id: string
  interpolation: "HOLD" | "LINEAR"
  validation: monotonic_t, bounded_values
```

### Specyfikacja pol

| Pole | Typ | Ograniczenia |
|------|-----|-------------|
| `profile_id` | `str` | Unikalny identyfikator profilu w obrebie projektu. |
| `time_unit` | `Enum` | Jednostka czasu: `"h"` (godziny) lub `"min"` (minuty). |
| `points` | `List[TimePoint]` | Lista punktow czasowych. Minimum 2 punkty. |
| `applies_to_element_id` | `str` | Identyfikator elementu NetworkModel, do ktorego profil jest przypisany. Element musi istniec w modelu. |
| `interpolation` | `Enum` | `"HOLD"` - wartosc stala do nastepnego punktu (schodkowa). `"LINEAR"` - interpolacja liniowa miedzy punktami. |

### Walidacja profilu

1. **Monotonicznosc czasu** (`monotonic_t`): wartosci `t` musza byc scisle rosnace.
2. **Ograniczone wartosci** (`bounded_values`):
   - `p_kw >= 0` dla obciazen (Load)
   - `p_kw` moze byc ujemne dla zrodel (PV, BESS w trybie ladowania)
   - `q_kvar` moze byc ujemne (pojemnosciowe) lub dodatnie (indukcyjne)
3. **Element istnieje**: `applies_to_element_id` musi wskazywac na istniejacy element w NetworkModel.
4. **Typ elementu zgodny**: profil mocy moze byc przypisany tylko do elementow typu Load, Source (PV/BESS/Generator).

---

## 3. Konfiguracje pracy

StudyCase definiuje konfiguracje pracy sieci poprzez kombinacje stanow lacznikow i trybow zrodel.

### 3.1 Tryb normalny

Wszystkie laczniki w stanie normalnym (`normal_states`). Wszystkie zrodla w trybie `SIEC`.

```
switch_states = {sw_id: normal_states[sw_id] for sw_id in all_switches}
source_modes  = {src_id: SIEC for src_id in all_sources}
```

- Reprezentuje standardowe warunki eksploatacyjne.
- Punkt odniesienia dla porownania z innymi konfiguracjami.

### 3.2 Tryb awaryjny

Wybrane laczniki zmienione wzgledem stanu normalnego. Zrodla moga byc w trybie `REZERWA`.

```
switch_states = {
    sw_01: ZAMKNIETY,      # normalnie OTWARTY - zamkniety awaryjnie
    sw_02: OTWARTY,        # normalnie ZAMKNIETY - otwarty awaryjnie (izolacja uszkodzenia)
    ...pozostale: normal_states[sw_id]
}
source_modes = {
    src_backup: REZERWA,   # zrodlo rezerwowe aktywowane
    ...pozostale: SIEC
}
```

- Symulacja stanow poawaryjnych (np. wylaczenie odcinka, przelaczenie zasilania).
- Walidacja: solver sprawdza spojnosc topologii po zmianie stanow.

### 3.3 Tryb wyspowy

Odciecie od GPZ. Lokalne zrodla (OZE, generator) aktywne jako jedyne zasilanie.

```
switch_states = {
    sw_gpz: OTWARTY,       # odciecie od GPZ
    ...pozostale: wg konfiguracji wyspy
}
source_modes = {
    src_gpz: WYSPA,        # GPZ odciete
    src_pv:  LOKALNE,      # PV aktywne lokalnie
    src_bess: LOKALNE,     # BESS aktywne lokalnie
}
```

- Wymaga co najmniej jednego zrodla w trybie `LOKALNE` z wystarczajaca moca.
- Walidacja: solver weryfikuje bilans mocy w wyspie.

---

## 4. Porownania StudyCase

Mechanizm porownywania dwoch StudyCase w celu identyfikacji roznic w wynikach obliczen.

### Wejscie

```
Input:
  case_a: StudyCase  # pierwszy przypadek (referencyjny)
  case_b: StudyCase  # drugi przypadek (porownywany)
```

### Wyjscie

```
Output:
  delta_results: Map[element_id, DeltaResult]
  delta_overlay_tokens: List[OverlayToken]
```

### Struktura DeltaResult

```yaml
delta_result:
  element_id: string
  metric: string              # np. "I_k3F_kA", "U_bus_pu", "P_flow_kW"
  value_a: float              # wartosc w case_a
  value_b: float              # wartosc w case_b
  delta_abs: float            # |value_b - value_a|
  delta_rel_pct: float        # (delta_abs / |value_a|) * 100, jezeli value_a != 0
  severity: NONE | LOW | MEDIUM | HIGH | CRITICAL
```

### Struktura OverlayToken

```yaml
overlay_token:
  element_id: string
  token_type: COLOR | LABEL | ARROW
  value: string               # np. "#FF0000", "+12.3%", "UP"
  layer: "delta_overlay"
```

### Gwarancja determinizmu

- **Deterministyczne**: te same `case_a` i `case_b` (z tymi samymi wynikami obliczen) produkuja **identyczny** wynik porownania.
- Kolejnosc elementow w `delta_results` jest sortowana po `element_id` (porzdek leksykograficzny).
- `delta_overlay_tokens` sa sortowane po `(element_id, token_type)`.
- Brak zaleznosci od czasu wykonania, watku, ani stanu globalnego.

---

## 5. Operacje domenowe StudyCase

Wszystkie operacje domenowe sa zdefiniowane na warstwie Application/Domain.
Zadna operacja **nie mutuje** NetworkModel.

### 5.1 `create_study_case`

```
create_study_case(label_pl: str, base_case: Optional[StudyCase] = None) -> StudyCase
```

- Tworzy nowy StudyCase z deterministycznym `case_id`.
- Jezeli `base_case` podany - kopiuje konfiguracje (switch_states, source_modes, analysis_settings).
- Wyniki: zawsze `NONE` (nigdy nie sa kopiowane z base_case).

### 5.2 `set_case_switch_state`

```
set_case_switch_state(case: StudyCase, element_id: str, state: SwitchState) -> StudyCase
```

- Ustawia stan lacznika w kontekscie danego StudyCase.
- Walidacja: `element_id` musi wskazywac na element typu Switch/Breaker w NetworkModel.
- Efekt uboczny: wyniki tego case -> `OUTDATED`.

### 5.3 `set_case_normal_state`

```
set_case_normal_state(case: StudyCase, element_id: str, state: SwitchState) -> StudyCase
```

- Ustawia stan normalny lacznika (punkt odniesienia).
- Walidacja: `element_id` musi wskazywac na element typu Switch/Breaker.
- Efekt uboczny: wyniki tego case -> `OUTDATED`.

### 5.4 `set_case_source_mode`

```
set_case_source_mode(case: StudyCase, source_element_id: str, mode: SourceMode) -> StudyCase
```

- Ustawia tryb pracy zrodla.
- Walidacja: `source_element_id` musi wskazywac na element typu Source.
- Efekt uboczny: wyniki tego case -> `OUTDATED`.

### 5.5 `set_case_time_profile`

```
set_case_time_profile(case: StudyCase, profile_ref: str) -> StudyCase
```

- Przypisuje profil czasowy do StudyCase.
- Walidacja: profil o podanym `profile_ref` musi istniec.
- Efekt uboczny: wyniki tego case -> `OUTDATED`.

### 5.6 `run_short_circuit`

```
run_short_circuit(
    case: StudyCase,
    fault_type: SC3F | SC2F | SC1F,
    fault_bus_id: str,
    Rf_ohm: Optional[float] = None
) -> ShortCircuitResult
```

- Uruchamia solver zwarciowy IEC 60909.
- `fault_type`: typ zwarcia (trojfazowe / dwufazowe / jednofazowe).
- `Rf_ohm`: opcjonalna rezystancja zwarcia (wymagana gdy `fault_resistance_policy: JAWNA`).
- Wynik zawiera: I_k, I_p, I_th, I_dyn + pelny WHITE BOX trace.
- Po zakonczeniu: wyniki case -> `FRESH`.

### 5.7 `run_power_flow`

```
run_power_flow(case: StudyCase) -> PowerFlowResult
```

- Uruchamia solver rozplywu mocy (Newton-Raphson).
- Wynik zawiera: napiecia wezlowe, przeplywy mocy, straty + WHITE BOX trace.
- Po zakonczeniu: wyniki case -> `FRESH`.

### 5.8 `run_time_series_power_flow`

```
run_time_series_power_flow(case: StudyCase) -> TimeSeriesResult
```

- Uruchamia serie obliczen rozplywu mocy wg profilu czasowego.
- Wymaga: `time_profile_ref` ustawione w StudyCase.
- Dla kazdego punktu czasowego: aktualizacja obciazen/generacji -> power flow.
- Wynik: seria PowerFlowResult + agregacje (max/min/avg).
- Po zakonczeniu: wyniki case -> `FRESH`.

### 5.9 `compare_study_cases`

```
compare_study_cases(case_a: StudyCase, case_b: StudyCase) -> ComparisonResult
```

- Porownuje wyniki dwoch StudyCase (patrz sekcja 4).
- Wymaga: oba case musza miec status wynikow `FRESH`.
- Wynik: `delta_results` + `delta_overlay_tokens`.
- Operacja czysto odczytowa - nie zmienia zadnego case.

---

## 6. Cykl zycia wynikow

Wyniki obliczen StudyCase podlegaja scislemu cyklowi zycia zapewniajacemu spojnosc danych.

### Diagram stanow

```
    create / clone
         |
         v
      [NONE] ---------> brak wynikow, case nowo utworzony
         |
         | run_*()
         v
      [FRESH] --------> wyniki aktualne, zgodne z konfiguracja i modelem
         |
         | zmiana config TEGO case
         | LUB zmiana NetworkModel
         v
      [OUTDATED] ------> wyniki nieaktualne, wymagaja ponownego obliczenia
         |
         | run_*()
         v
      [FRESH] --------> wyniki ponownie aktualne
```

### Reguly przejsc

| Zdarzenie | Efekt na wyniki |
|-----------|----------------|
| Zmiana NetworkModel (dodanie/usuniecie/modyfikacja elementu) | **WSZYSTKIE** StudyCase -> `OUTDATED` |
| Zmiana konfiguracji danego case (switch_state, source_mode, analysis_settings, time_profile) | **TYLKO TEN** StudyCase -> `OUTDATED` |
| Klonowanie StudyCase (`create_study_case` z `base_case`) | Nowy case -> `NONE` (wyniki nigdy nie sa kopiowane) |
| Pomyslne zakonczenie `run_*()` | Ten case -> `FRESH` |
| Blad w trakcie `run_*()` | Ten case -> `NONE` (czesciowe wyniki sa odrzucane) |

### Invarianty cyklu zycia

1. **Solver nie uruchomi sie** na case ze statusem `FRESH` bez jawnego zadania ponownego obliczenia.
2. **Porownanie wymaga FRESH**: `compare_study_cases` odrzuca case ze statusem innym niz `FRESH`.
3. **Brak czesciowych wynikow**: jezeli solver zakonczy sie bledem, wyniki wracaja do `NONE` (nie `OUTDATED`).
4. **Determinizm**: ten sam NetworkModel + ten sam StudyCase config + ten sam solver -> identyczny wynik. Gwarantowane przez WHITE BOX trace i frozen Result API.

---

## Zgodnosc z architektura

| Regula | Zgodnosc |
|--------|----------|
| Case Immutability Rule | StudyCase **nie mutuje** NetworkModel. Przechowuje tylko konfiguracje. |
| Single Model Rule | Wszystkie StudyCase referencuja **ten sam** NetworkModel. |
| NOT-A-SOLVER Rule | Operacje domenowe deleguja obliczenia do dedykowanych solverow. |
| WHITE BOX Rule | Kazdy wynik solvera zawiera pelny trace z wartosciami posrednimi. |
| PCC Prohibition Rule | Brak koncepcji PCC w StudyCase. Granice sieci w warstwie analizy. |
