# FAZA 0 — Audyt: Budowa Magistrali SN (domain_operations.py)

**Data audytu:** 2026-02-16
**Wersja:** 1.0
**Audytor:** Claude Opus 4.6 (Audyt Architektoniczny)
**Plik audytowany:** `mv-design-pro/backend/src/enm/domain_operations.py`
**Linie kodu:** 1459
**Standard referencyjny:** SYSTEM_SPEC.md, AGENTS.md, ARCHITECTURE.md

---

## PODSUMOWANIE WYKONAWCZE

Audyt pliku `domain_operations.py` ujawnił **11 naruszen krytycznych** polegajacych na
auto-zgadywaniu wartosci fizycznych i stosowaniu zakodowanych na sztywno domyslnych
parametrow, ktore powinny byc jawnie podane przez uzytkownika lub zmaterializowane
z katalogu. Dodatkowo zidentyfikowano **4 brakujace funkcjonalnosci** wymagane
przez kontrakt odpowiedzi operacji domenowych.

| Kategoria | Liczba | Poziom |
|-----------|--------|--------|
| Naruszenia krytyczne (auto-guessing / hardcoded defaults) | 11 | BLOKER |
| Brakujace funkcjonalnosci | 4 | BLOKER / WAZNE |
| Dozwolone rozstrzygniecia topologiczne | 2 | OK |

**Ocena ogolna:** Plik NIE jest gotowy do produkcji. Wymaga naprawy przed integracja
z solverami (IEC 60909, Newton-Raphson), poniewaz fikcyjne wartosci impedancji
(0.0 ohm/km) i mocy transformatora (0.001 MVA) spowoduja bledne wyniki obliczen.

---

## 1. NARUSZENIA KRYTYCZNE

Ponizsze naruszenia stanowia auto-zgadywanie wartosci fizycznych lub stosowanie
zakodowanych na sztywno wartosci domyslnych, co lamie zasade **WHITE BOX** oraz
**deterministycznosci** modelu sieciowego.

### NK-01: Domyslna dlugosc segmentu magistrali — 500 m

| Pole | Wartosc |
|------|---------|
| **Operacja** | `continue_trunk_segment_sn` |
| **Linie** | 434-437 |
| **Kod** | `dlugosc_m = segment.get("dlugosc_m") or payload.get("dlugosc_m") or 0` |
| | `if dlugosc_m <= 0: dlugosc_m = 500` |
| **Problem** | Gdy uzytkownik nie poda dlugosci, system wstawia fikcyjny odcinek 500 m. Dlugosc fizyczna nie moze byc zgadywana — bezposrednio wplywa na impedancje galezi, a wiec na wyniki zwarciowe i przeplywowe. |
| **Waga** | BLOKER |
| **Naprawa** | Zwrocic blad walidacji: `"Dlugosc odcinka musi byc podana i > 0."`, kod: `trunk.segment_length_missing` |

### NK-02: Fallback napiecia 15.0 kV

| Pole | Wartosc |
|------|---------|
| **Operacja** | `continue_trunk_segment_sn` |
| **Linia** | 459 |
| **Kod** | `voltage_kv = from_bus.get("voltage_kv", 15.0)` |
| **Problem** | Dziedziczenie napiecia z szyny zrodlowej jest poprawne (ciaglosc topologiczna), ale fallback `15.0` jest niebezpieczny — jesli szyna zrodlowa nie ma napiecia, system powinien zaglowac bledem, nie zgadywac. |
| **Waga** | WAZNE |
| **Naprawa** | Sprawdzic, czy `from_bus` ma klucz `voltage_kv`. Jesli brak: blad `"Szyna zrodlowa nie ma zdefiniowanego napiecia."`, kod: `trunk.source_voltage_undefined` |

### NK-03: Domyslna dlugosc segmentu odgalezienia — 500 m

| Pole | Wartosc |
|------|---------|
| **Operacja** | `start_branch_segment_sn` |
| **Linie** | 955-957 |
| **Kod** | `dlugosc_m = segment.get("dlugosc_m") or payload.get("dlugosc_m") or 0` |
| | `if dlugosc_m <= 0: dlugosc_m = 500` |
| **Problem** | Identyczny problem jak NK-01, ale w kontekscie odgalezien. Fikcyjna dlugosc 500 m zostanie uzyta do budowy modelu impedancyjnego. |
| **Waga** | BLOKER |
| **Naprawa** | Zwrocic blad: `"Dlugosc odcinka odgalezienia musi byc podana i > 0."`, kod: `branch.segment_length_missing` |

### NK-04: Auto-detekcja szyny zrodlowej odgalezienia

| Pole | Wartosc |
|------|---------|
| **Operacja** | `start_branch_segment_sn` |
| **Linie** | 934-941 |
| **Kod** | Skanowanie wszystkich szyn w odwrotnej kolejnosci, pomijajac szyny zrodlowe, i wybor pierwszej pasujacej |
| **Problem** | Wieloznacznosc. Gdy model ma wiele szyn, algorytm wybierze ostatnia dodana szyne nie-GPZ. Uzytkownik moze nie wiedziec, z ktorej szyny zaczyna sie odgalezienie. To narusza zasade jawnosci modelu. |
| **Waga** | BLOKER |
| **Naprawa** | Zwrocic blad: `"Nalezy jawnie wskazac szyne zrodlowa odgalezienia (from_bus_ref)."`, kod: `branch.from_bus_required` |

### NK-05: Fallback napiecia SN/nN przy wstawianiu stacji

| Pole | Wartosc |
|------|---------|
| **Operacja** | `insert_station_on_segment_sn` |
| **Linie** | 614-624 |
| **Kod** | `sn_voltage_kv = b.get("voltage_kv", 15.0)` (linia 618) |
| | `if not sn_voltage_kv or sn_voltage_kv <= 0: sn_voltage_kv = 15.0` (linie 620-621) |
| | `if not nn_voltage_kv or nn_voltage_kv <= 0: nn_voltage_kv = 0.4` (linie 623-624) |
| **Problem** | Podwojny fallback: najpierw z szyny (OK), potem sztywny 15.0 kV (NIE OK). Napiecie nN 0.4 kV jako hardcoded fallback — istnieja sieci nN o napieciu 0.23 kV lub 0.69 kV. |
| **Waga** | BLOKER |
| **Naprawa** | Napiecie SN: dziedziczyc z szyny, blad gdy brak. Napiecie nN: wymagac jawnie w payload `station.nn_voltage_kv`, blad gdy brak. |

### NK-06: Placeholder mocy i napiec zwarciowych transformatora (stacja)

| Pole | Wartosc |
|------|---------|
| **Operacja** | `insert_station_on_segment_sn` |
| **Linie** | 820-823 |
| **Kod** | `"sn_mva": 0.001` |
| | `"uk_percent": 0.01` |
| | `"pk_kw": 0.0` |
| **Problem** | Moc znamionowa 0.001 MVA (1 kVA) i napieciowa zwarciowa 0.01% sa fizycznie absurdalne dla transformatora SN/nN (typowe: 0.25-2.5 MVA, uk=4-6%). Wartosci te trafia do solvera i dadza calkowicie bledne wyniki pradu zwarciowego i przeplywu mocy. |
| **Waga** | BLOKER |
| **Naprawa** | Jesli brak `transformer_catalog_ref` i brak jawnych parametrow: zwrocic blad `"Transformator wymaga przypisania katalogu lub jawnych parametrow (sn_mva, uk_percent)."`, kod: `station.transformer_params_missing`. Wartosc placeholder NIGDY nie moze trafic do modelu. |

### NK-07: Hardcoded fallback napiecia 15.0 kV (lacznik sekcyjny)

| Pole | Wartosc |
|------|---------|
| **Operacja** | `insert_section_switch_sn` |
| **Linia** | 1064 |
| **Kod** | `voltage_kv = 15.0` (inicjalizacja przed petla szukajaca szyny) |
| **Problem** | Jesli szyna zrodlowa segmentu nie zostanie znaleziona, wartosc 15.0 kV zostaje uzyta bez zadnego ostrzezenia. |
| **Waga** | WAZNE |
| **Naprawa** | Ustawic `voltage_kv = None`, po petli sprawdzic czy znaleziono, jesli nie — zwrocic blad. |

### NK-08: Auto-detekcja koncowek pierscienia

| Pole | Wartosc |
|------|---------|
| **Operacja** | `connect_secondary_ring_sn` |
| **Linie** | 1178-1199 |
| **Kod** | Skanowanie szyn i korytarzy, przyjmowanie `buses[0]` jako GPZ i `buses[-1]` jako koniec magistrali |
| **Problem** | Heurystyka oparta na kolejnosci elementow na liscie. W zlozonym modelu (wiele korytarzy, wiele szyn dodanych w roznej kolejnosci) moze dac bledne wyniki. |
| **Waga** | BLOKER |
| **Naprawa** | Wymagac jawnego podania `from_bus_ref` i `to_bus_ref`. Blad: `"Zamkniecie pierscienia wymaga jawnego wskazania szyn poczatkowej i koncowej."`, kod: `ring.endpoints_required` |

### NK-09: Domyslna dlugosc zamkniecia pierscienia — 100 m

| Pole | Wartosc |
|------|---------|
| **Operacja** | `connect_secondary_ring_sn` |
| **Linia** | 1219 |
| **Kod** | `dlugosc_m = segment.get("dlugosc_m", 100)` |
| **Problem** | Wartosc domyslna 100 m zamiast bledu walidacji. Analogicznie do NK-01/NK-03. |
| **Waga** | BLOKER |
| **Naprawa** | Wymagac jawnej dlugosci. Blad: `"Dlugosc odcinka zamkniecia pierscienia musi byc podana."`, kod: `ring.segment_length_missing` |

### NK-10: Placeholder parametrow transformatora (samodzielny)

| Pole | Wartosc |
|------|---------|
| **Operacja** | `add_transformer_sn_nn` |
| **Linie** | 1327-1331 |
| **Kod** | `"sn_mva": payload.get("sn_mva") or 0.001` |
| | `"uhv_kv": payload.get("uhv_kv") or 15.0` |
| | `"ulv_kv": payload.get("ulv_kv") or 0.4` |
| | `"uk_percent": payload.get("uk_percent") or 0.01` |
| **Problem** | Identyczny problem jak NK-06. Operator `or` w Pythonie traktuje `0` i `None` jednakowo — jesli uzytkownik jawnie poda `0.0`, system podstawi placeholder. Fikcyjne parametry trafia do solvera. |
| **Waga** | BLOKER |
| **Naprawa** | Sprawdzic obecnosc kluczy w payload. Jesli brak katalogu I brak jawnych parametrow — blad. Uzywac `payload.get("sn_mva")` z `is not None` zamiast `or`. |

### NK-11: Zerowa impedancja galezi jako wartosc domyslna

| Pole | Wartosc |
|------|---------|
| **Operacje** | `continue_trunk_segment_sn` (l. 484-485), `start_branch_segment_sn` (l. 994-995), `connect_secondary_ring_sn` (l. 1229-1230) |
| **Kod** | `"r_ohm_per_km": 0.0, "x_ohm_per_km": 0.0` |
| **Problem** | Galaz o zerowej impedancji jest fizycznie nierealna (idealny przewodnik). W solverze zwarciowym doprowadzi do dzielenia przez zero lub nieskonczonego pradu zwarciowego. W Power Flow spowoduje osobliwosc macierzy Y-bus. |
| **Waga** | BLOKER |
| **Naprawa** | Impedancje powinny byc materializowane z katalogu (`catalog_ref`). Jesli brak katalogu — element powinien byc oznaczony flagą `parameter_source: "PENDING"` i zablokowany przed udzialem w obliczeniach. Walidator (ENMValidator) powinien zglosic BLOKER: `"Galaz nie ma przypisanych parametrow impedancyjnych."` |

---

## 2. BRAKUJACE FUNKCJONALNOSCI

### BF-01: LogicalViews — brak TerminalRef i klasyfikacji galezi

| Pole | Wartosc |
|------|---------|
| **Lokalizacja** | `_response()`, linie 236-248 |
| **Stan obecny** | `logical_views` zwraca jedynie podstawowe podsumowanie korytarzy: `corridor_ref`, `type`, `segments`, `no_point_ref` |
| **Brakuje** | |
| | **TerminalRef** — koncowki magistrali z ich statusem: `OTWARTY` / `ZAJETY` / `ZAREZERWOWANY_DLA_RINGU` |
| | **Klasyfikacja galezi** — podział na `trunk` / `branch` / `secondary_connector` |
| | **Obliczanie statusu terminali** — logika determinujaca, ktore koncowki sa wolne do dalszej rozbudowy |
| **Waga** | WAZNE |
| **Naprawa** | Rozszerzyc `_response()` o budowe pelnego `LogicalViews` zgodnie z kontraktem UI. Dodac helper `_compute_terminal_status()`. |

### BF-02: Brak materializacji parametrow katalogowych (materialized_params)

| Pole | Wartosc |
|------|---------|
| **Lokalizacja** | Caly plik — brak implementacji |
| **Stan obecny** | Operacje przypisuja `catalog_ref` do elementow, ale nigdy nie materializuja parametrow z katalogu do snapshotu |
| **Problem** | Frontend i solver nie wiedza jakie parametry ma element — widza tylko `r_ohm_per_km: 0.0` lub `sn_mva: 0.001` |
| **Waga** | BLOKER |
| **Naprawa** | Dodac krok materializacji po kazdej operacji: jesli element ma `catalog_ref`, pobrac parametry z katalogu i wpisac do snapshotu z oznaczeniem `parameter_source: "CATALOG"`. Alternatywnie: materializacja lazy w walidatorze/solverze (ale snapshot musi byc kompletny). |

### BF-03: Brak obliczania layout_hash

| Pole | Wartosc |
|------|---------|
| **Lokalizacja** | `_response()`, linie 250-267 |
| **Stan obecny** | Odpowiedz nie zawiera `layout_hash` |
| **Problem** | Frontend nie moze wykryc zmian topologicznych bez hasha. Brak hasha uniemozliwia optymistyczne cachowanie SLD. |
| **Waga** | WAZNE |
| **Naprawa** | Obliczyc SHA-256 z kanonicznej reprezentacji topologii (szyny + galezi + laczniki) i dodac do odpowiedzi jako `layout_hash`. Mozna uzyc istniejacego `_canonical_json()` + `_compute_seed()`. |

### BF-04: Brak kanonicznego typu TerminalRef

| Pole | Wartosc |
|------|---------|
| **Lokalizacja** | Brak definicji w calym module |
| **Stan obecny** | Nie istnieje typ danych `TerminalRef` opisujacy koncowki magistrali |
| **Problem** | Bez formalnej definicji TerminalRef nie mozna implementowac BF-01 |
| **Waga** | WAZNE |
| **Naprawa** | Zdefiniowac `TerminalRef` jako typ kanoniczny: `{"bus_ref": str, "status": Literal["OTWARTY", "ZAJETY", "ZAREZERWOWANY_DLA_RINGU"], "corridor_ref": str | None}` |

---

## 3. DOZWOLONE ROZSTRZYGNIECIA TOPOLOGICZNE

Ponizsze zachowania sa **poprawne** i zgodne z kanonem architektonicznym, poniewaz
opieraja sie na determinizmie topologicznym — wynik jest jednoznaczny dla danego stanu modelu.

### DT-01: Auto-detekcja konca magistrali (continue_trunk_segment_sn)

| Pole | Wartosc |
|------|---------|
| **Lokalizacja** | `_auto_detect_trunk_end()`, linie 117-146 |
| **Mechanizm** | Znalezienie korytarza (po `trunk_id` lub jedynego istniejacego), pobranie ostatniego segmentu, zwrocenie jego `to_bus_ref` |
| **Dlaczego OK** | Gdy istnieje dokladnie jeden korytarz z jasnym koncem, wynik jest deterministyczny. Kontynuacja magistrali z jej konca jest jedynym sensownym zachowaniem. |
| **Uwaga** | Fallback na `buses[0]` (linia 144-145) jest watpliwy — moze zwrocic szyne GPZ, co spowoduje cykl. Rozwazyc usunięcie tego fallbacku. |

### DT-02: Propagacja napiecia z podlaczonej szyny

| Pole | Wartosc |
|------|---------|
| **Lokalizacja** | Wiele operacji — `from_bus.get("voltage_kv", ...)` |
| **Mechanizm** | Nowa szyna dziedziczy napiecie z szyny, do ktorej jest podlaczana |
| **Dlaczego OK** | Ciaglosc napieciowa jest fizycznym wymaganiem sieci — szyny polaczone galezią bez transformatora musza miec to samo napiecie. To topologiczny invariant, nie zgadywanie. |
| **Uwaga** | Sam mechanizm jest poprawny, ale fallback `15.0` musi byc usuniety (patrz NK-02, NK-05, NK-07). |

---

## 4. PLAN NAPRAWCZY

### Faza 1: Eliminacja hardcoded defaults (PILNE)

| Krok | Opis | Dotyczy | Zlozonosc |
|------|------|---------|-----------|
| 1.1 | Zastapic `dlugosc_m = 500` bledem walidacji | NK-01, NK-03 | Niska |
| 1.2 | Zastapic `dlugosc_m = 100` bledem walidacji | NK-09 | Niska |
| 1.3 | Zastapic `sn_mva = 0.001`, `uk_percent = 0.01` bledem walidacji | NK-06, NK-10 | Niska |
| 1.4 | Zastapic `r_ohm_per_km: 0.0`, `x_ohm_per_km: 0.0` flaga `parameter_source: "PENDING"` | NK-11 | Srednia |
| 1.5 | Zamienic fallback `15.0 kV` na blad gdy szyna nie ma napiecia | NK-02, NK-05, NK-07 | Niska |
| 1.6 | Zamienic fallback `nn_voltage_kv = 0.4` na wymaganie jawne | NK-05 | Niska |
| 1.7 | Zastapic auto-detekcje `from_bus_ref` bledem walidacji | NK-04 | Niska |
| 1.8 | Wymagac jawnych `from_bus_ref` / `to_bus_ref` przy zamykaniu pierscienia | NK-08 | Niska |
| 1.9 | Uzyc `is not None` zamiast `or` przy parametrach transformatora | NK-10 | Niska |

### Faza 2: Brakujace funkcjonalnosci (PLANOWE)

| Krok | Opis | Dotyczy | Zlozonosc |
|------|------|---------|-----------|
| 2.1 | Zdefiniowac typ kanoniczny `TerminalRef` | BF-04 | Niska |
| 2.2 | Zaimplementowac `_compute_terminal_status()` | BF-01 | Srednia |
| 2.3 | Rozszerzyc `logical_views` o `TerminalRef` i klasyfikacje galezi | BF-01 | Srednia |
| 2.4 | Dodac `layout_hash` do odpowiedzi | BF-03 | Niska |
| 2.5 | Zaimplementowac materializacje parametrow katalogowych | BF-02 | Wysoka |

### Faza 3: Walidator (WSPARCIE)

| Krok | Opis | Zlozonosc |
|------|------|-----------|
| 3.1 | Dodac regule walidatora: galaz bez impedancji = BLOKER | Niska |
| 3.2 | Dodac regule walidatora: transformator bez parametrow = BLOKER | Niska |
| 3.3 | Dodac regule walidatora: szyna bez napiecia = BLOKER | Niska |

---

## INDEKS LINIOWY NARUSZEN

Szybkie odniesienie plik:linia dla kazdego naruszenia:

```
domain_operations.py:436-437   NK-01  dlugosc_m = 500 (trunk)
domain_operations.py:459       NK-02  voltage_kv fallback 15.0 (trunk)
domain_operations.py:484-485   NK-11  r_ohm_per_km: 0.0, x_ohm_per_km: 0.0 (trunk)
domain_operations.py:614-621   NK-05  sn_voltage_kv fallback 15.0 (station)
domain_operations.py:623-624   NK-05  nn_voltage_kv fallback 0.4 (station)
domain_operations.py:820-823   NK-06  sn_mva=0.001, uk_percent=0.01 (station trafo)
domain_operations.py:934-941   NK-04  auto-detect from_bus_ref (branch)
domain_operations.py:955-957   NK-03  dlugosc_m = 500 (branch)
domain_operations.py:994-995   NK-11  r_ohm_per_km: 0.0, x_ohm_per_km: 0.0 (branch)
domain_operations.py:1064      NK-07  voltage_kv = 15.0 (switch)
domain_operations.py:1178-1199 NK-08  auto-detect ring endpoints
domain_operations.py:1219      NK-09  dlugosc_m = 100 (ring)
domain_operations.py:1229-1230 NK-11  r_ohm_per_km: 0.0, x_ohm_per_km: 0.0 (ring)
domain_operations.py:1327-1331 NK-10  sn_mva=0.001, uhv_kv=15.0 etc. (standalone trafo)
```

---

## REFERENCJE

- `mv-design-pro/SYSTEM_SPEC.md` — Kanoniczny spec architektoniczny
- `mv-design-pro/AGENTS.md` — Reguly governance
- `mv-design-pro/ARCHITECTURE.md` — Architektura systemu
- `mv-design-pro/backend/src/enm/domain_operations.py` — Audytowany plik zrodlowy
- `mv-design-pro/backend/src/enm/validator.py` — ENMValidator
- `mv-design-pro/backend/src/enm/topology_ops.py` — Operacje topologiczne CRUD

---

*Koniec dokumentu. Nastepna rewizja po wdrozeniu Fazy 1 planu naprawczego.*
