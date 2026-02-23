# UI V3 — PRZEPŁYWY PRACY SN/GPZ (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: 6 kompletnych przepływów pracy „klik-po-kliku" dla sieci SN

---

## PRZEPŁYW 1: GPZ → 3 ODCINKI MAGISTRALI W DÓŁ

### Cel
Utworzenie punktu zasilania GPZ oraz 3 odcinków magistrali (trunk) schodzących w dół topologii.

### Kroki użytkownika

**Krok 1.1: Utwórz źródło GPZ**
- Użytkownik: Klik na pustym canvas SLD → Menu kontekstowe → „Dodaj zasilanie sieciowe (GPZ)"
- Operacja domenowa:
```json
{
  "operation": "add_grid_source_sn",
  "payload": {
    "name": "GPZ-1",
    "voltage_kv": 15.0,
    "short_circuit_power_mva": 500.0,
    "x_r_ratio": 10.0
  }
}
```
- Efekt na SLD: Pojawia się symbol GPZ (źródło sieciowe) z szyną SN 15 kV.
- Efekt w Snapshot: Nowy element `GridSource` + szyna `Bus` o napięciu 15 kV.

**Krok 1.2: Kontynuuj magistralę — odcinek 1**
- Użytkownik: Klik na szynie GPZ → Menu kontekstowe → „Kontynuuj magistralę"
- Operacja domenowa:
```json
{
  "operation": "continue_trunk_segment_sn",
  "payload": {
    "from_bus_id": "bus-gpz-1-sn",
    "segment_name": "Mag-1",
    "length_km": 2.5
  }
}
```
- Efekt na SLD: Odcinek linii/kabla w dół od GPZ z nową szyną końcową.
- Efekt w Snapshot: Nowy `Branch` + nowy `Bus` na końcu odcinka.

**Krok 1.3: Kontynuuj magistralę — odcinek 2**
- Użytkownik: Klik na nowej szynie końcowej → Menu kontekstowe → „Kontynuuj magistralę"
- Operacja domenowa:
```json
{
  "operation": "continue_trunk_segment_sn",
  "payload": {
    "from_bus_id": "bus-mag-1-end",
    "segment_name": "Mag-2",
    "length_km": 3.0
  }
}
```
- Efekt na SLD: Drugi odcinek w dół, SLD rośnie pionowo.

**Krok 1.4: Kontynuuj magistralę — odcinek 3**
- Użytkownik: Klik na końcowej szynie odcinka 2 → Menu kontekstowe → „Kontynuuj magistralę"
- Operacja domenowa:
```json
{
  "operation": "continue_trunk_segment_sn",
  "payload": {
    "from_bus_id": "bus-mag-2-end",
    "segment_name": "Mag-3",
    "length_km": 1.8
  }
}
```
- Efekt na SLD: Trzeci odcinek, pełna magistrala 3-odcinkowa widoczna.

### Typowe blokady gotowości po tym przepływie
| Kod | Komunikat | Priorytet |
|-----|----------|-----------|
| `CATALOG_MISSING_BRANCH` | Odcinek „Mag-1" nie ma przypisanego typu katalogowego | BLOCKER |
| `CATALOG_MISSING_BRANCH` | Odcinek „Mag-2" nie ma przypisanego typu katalogowego | BLOCKER |
| `CATALOG_MISSING_BRANCH` | Odcinek „Mag-3" nie ma przypisanego typu katalogowego | BLOCKER |
| `SOURCE_INCOMPLETE` | Brak pełnych danych źródła GPZ-1 (opcjonalnie) | WARNING |

### FixActions
| FixAction | Cel | Nawigacja |
|-----------|-----|-----------|
| `SELECT_CATALOG` dla Mag-1 | Przypisz typ kabla/linii | Otwiera przeglądarkę katalogu z filtrem na kable SN |
| `SELECT_CATALOG` dla Mag-2 | Przypisz typ kabla/linii | Otwiera przeglądarkę katalogu z filtrem na kable SN |
| `SELECT_CATALOG` dla Mag-3 | Przypisz typ kabla/linii | Otwiera przeglądarkę katalogu z filtrem na kable SN |

---

## PRZEPŁYW 2: WSTAW STACJĘ TYPU B W ODCINEK MAGISTRALI

### Cel
Wstawienie stacji pośredniej (typ B — przelotowa z rozdzielnicą SN) w istniejący odcinek magistrali.

### Warunek wstępny
Magistrala z Przepływu 1 istnieje. Odcinek „Mag-2" jest celem wstawienia.

### Kroki użytkownika

**Krok 2.1: Wstaw stację w odcinek**
- Użytkownik: Klik na odcinku Mag-2 na SLD → Menu kontekstowe → „Wstaw stację w odcinek"
- Operacja domenowa:
```json
{
  "operation": "insert_station_on_segment_sn",
  "payload": {
    "branch_id": "branch-mag-2",
    "station_name": "ST-B1",
    "station_type": "B",
    "position_ratio": 0.5,
    "switchgear_config": {
      "incoming_field": {"cb": true, "ds_line": true, "ds_bus": true},
      "outgoing_field": {"cb": true, "ds_line": true, "ds_bus": true},
      "bus_coupler": false
    }
  }
}
```
- Efekt na SLD: Odcinek Mag-2 dzieli się na dwa odcinki. Pomiędzy nimi pojawia się blok stacji ST-B1 z rozdzielnicą SN (2 pola liniowe: wejściowe i wyjściowe, szyna zbiorcza).
- Efekt w Snapshot:
  - Usunięty: `Branch` Mag-2
  - Dodane: `Station` ST-B1 + `Bus` (szyna zbiorcza SN stacji) + 2 pola (Field) + 2 nowe odcinki (Mag-2a od węzła Mag-1 do stacji, Mag-2b od stacji do węzła Mag-3)

**Krok 2.2: Konfiguracja rozdzielnicy (opcjonalnie)**
- Użytkownik: Klik na stacji ST-B1 → Inspektor → Zakładka „Konfiguracja rozdzielnicy" → Edytuj
- Operacja domenowa:
```json
{
  "operation": "update_switchgear_config",
  "payload": {
    "station_id": "station-st-b1",
    "config": {
      "incoming_field": {"cb": true, "ds_line": true, "ds_bus": true, "es": true},
      "outgoing_field": {"cb": true, "ds_line": true, "ds_bus": true},
      "measurement_field": {"vt": true, "ct_ratio": "200/5"}
    }
  }
}
```
- Efekt na SLD: Blok stacji aktualizowany z nowymi aparatami.

### Typowe blokady gotowości
| Kod | Komunikat | Priorytet |
|-----|----------|-----------|
| `CATALOG_MISSING_BRANCH` | Odcinek „Mag-2a" nie ma przypisanego typu katalogowego | BLOCKER |
| `CATALOG_MISSING_BRANCH` | Odcinek „Mag-2b" nie ma przypisanego typu katalogowego | BLOCKER |
| `STATION_NO_TRANSFORMER` | Stacja ST-B1 nie ma transformatora SN/nN (jeśli wymagany) | WARNING |

### FixActions
| FixAction | Cel | Nawigacja |
|-----------|-----|-----------|
| `SELECT_CATALOG` dla Mag-2a | Przypisz typ kabla/linii do nowego odcinka | Przeglądarka katalogu |
| `SELECT_CATALOG` dla Mag-2b | Przypisz typ kabla/linii do nowego odcinka | Przeglądarka katalogu |
| `OPEN_MODAL` dla ST-B1 | Konfiguruj transformator SN/nN | Dialog edycji stacji |

---

## PRZEPŁYW 3: ODGAŁĘZIENIE I STACJA TYPU C

### Cel
Utworzenie odgałęzienia (spur) od magistrali i wstawienie stacji typu C (końcowa z transformatorem SN/nN) na odgałęzieniu.

### Warunek wstępny
Magistrala z Przepływu 1, stacja ST-B1 z Przepływu 2.

### Kroki użytkownika

**Krok 3.1: Rozpocznij odgałęzienie**
- Użytkownik: Klik na szynie zbiorczej stacji ST-B1 → Menu kontekstowe → „Dodaj odgałęzienie"
- Operacja domenowa:
```json
{
  "operation": "start_branch_segment_sn",
  "payload": {
    "from_bus_id": "bus-st-b1-sn",
    "segment_name": "Odg-1",
    "length_km": 0.8,
    "direction": "spur"
  }
}
```
- Efekt na SLD: Nowy odcinek odchodzi bocznie od stacji ST-B1 (w prawo lub lewo, zależy od kierunku). Na końcu nowa szyna.

**Krok 3.2: Wstaw stację typu C na końcu odgałęzienia**
- Użytkownik: Klik na końcowej szynie odgałęzienia → Menu kontekstowe → „Dodaj stację końcową"
- Operacja domenowa:
```json
{
  "operation": "insert_station_on_segment_sn",
  "payload": {
    "branch_id": "branch-odg-1",
    "station_name": "ST-C1",
    "station_type": "C",
    "position_ratio": 1.0,
    "switchgear_config": {
      "incoming_field": {"cb": true, "ds_line": true},
      "transformer_field": {"cb": true}
    }
  }
}
```
- Efekt na SLD: Stacja ST-C1 pojawia się na końcu odgałęzienia z polem wejściowym i polem transformatorowym.

**Krok 3.3: Dodaj transformator SN/nN**
- Użytkownik: Klik na stacji ST-C1 → Inspektor → „Dodaj transformator SN/nN"
- Operacja domenowa:
```json
{
  "operation": "add_transformer_sn_nn",
  "payload": {
    "station_id": "station-st-c1",
    "transformer_name": "TR-1",
    "rated_power_kva": 630,
    "voltage_hv_kv": 15.0,
    "voltage_lv_kv": 0.4,
    "vector_group": "Dyn11"
  }
}
```
- Efekt na SLD: Blok transformatora w polu transformatorowym stacji. Szyna nN 0,4 kV pod transformatorem.

**Krok 3.4: Dodaj obciążenie nN**
- Użytkownik: Klik na szynie nN stacji ST-C1 → Menu kontekstowe → „Dodaj obciążenie"
- Operacja domenowa:
```json
{
  "operation": "add_nn_load",
  "payload": {
    "bus_id": "bus-st-c1-nn",
    "load_name": "Obc-1",
    "active_power_kw": 250,
    "reactive_power_kvar": 120,
    "cos_phi": 0.9
  }
}
```
- Efekt na SLD: Symbol obciążenia pod szyną nN.

### Typowe blokady gotowości
| Kod | Komunikat | Priorytet |
|-----|----------|-----------|
| `CATALOG_MISSING_BRANCH` | Odcinek „Odg-1" nie ma typu katalogowego | BLOCKER |
| `CATALOG_MISSING_TRANSFORMER` | Transformator TR-1 nie ma typu katalogowego | BLOCKER |
| `LOAD_INCOMPLETE` | Obciążenie Obc-1 — brak profilu obciążenia | WARNING |

### FixActions
| FixAction | Cel | Nawigacja |
|-----------|-----|-----------|
| `SELECT_CATALOG` dla Odg-1 | Przypisz typ kabla | Przeglądarka katalogu |
| `SELECT_CATALOG` dla TR-1 | Przypisz typ transformatora | Przeglądarka katalogu transformatorów |
| `OPEN_MODAL` dla Obc-1 | Uzupełnij profil obciążenia | Dialog edycji obciążenia |

---

## PRZEPŁYW 4: ZAMKNIJ RING I USTAW NOP

### Cel
Zamknięcie pierścienia (ring) między dwoma punktami magistrali oraz wyznaczenie punktu normalnie otwartego (NOP).

### Warunek wstępny
Magistrala z GPZ ma co najmniej 2 odgałęzienia lub 2 końce dostępne do połączenia.

### Kroki użytkownika

**Krok 4.1: Połącz pierścień (ring)**
- Użytkownik: Klik na końcowej szynie magistrali (Mag-3) → Menu kontekstowe → „Połącz pierścień"
- System: Wyświetla listę dostępnych szyn do połączenia (np. szyna GPZ lub szyna innego odejścia).
- Użytkownik: Wybiera szynę docelową → „Potwierdź"
- Operacja domenowa:
```json
{
  "operation": "connect_secondary_ring_sn",
  "payload": {
    "from_bus_id": "bus-mag-3-end",
    "to_bus_id": "bus-gpz-1-sn",
    "segment_name": "Ring-1",
    "length_km": 4.0
  }
}
```
- Efekt na SLD: Nowy odcinek łączący koniec magistrali z GPZ. SLD wyświetla pętlę. Odcinek rysowany jako „kanał wtórny" (secondary path) — linia przerywana lub inny styl wizualny.
- Efekt w Snapshot: Nowy `Branch` Ring-1 + topologia staje się pierścieniowa.

**Krok 4.2: Ustaw punkt normalnie otwarty (NOP)**
- Użytkownik: Klik na odcinku Ring-1 → Menu kontekstowe → „Wstaw łącznik sekcyjny"
- Operacja domenowa:
```json
{
  "operation": "insert_section_switch_sn",
  "payload": {
    "branch_id": "branch-ring-1",
    "switch_name": "LS-NOP-1",
    "position_ratio": 0.5
  }
}
```
- Efekt na SLD: Łącznik sekcyjny pojawia się na odcinku Ring-1.

**Krok 4.3: Oznacz NOP**
- Użytkownik: Klik na łączniku LS-NOP-1 → Menu kontekstowe → „Ustaw jako punkt normalnie otwarty"
- Operacja domenowa:
```json
{
  "operation": "set_normal_open_point",
  "payload": {
    "switch_id": "switch-ls-nop-1",
    "is_nop": true
  }
}
```
- Efekt na SLD: Łącznik wyświetlany z symbolem NOP (otwarty), odcinek Ring-1 podzielony na dwa z łącznikiem otwartym między nimi. Kanał wtórny zmienia styl — przerywany po stronie NOP.
- Efekt w Snapshot: `Switch` LS-NOP-1 z polem `normal_state: OPEN`.

### Typowe blokady gotowości
| Kod | Komunikat | Priorytet |
|-----|----------|-----------|
| `CATALOG_MISSING_BRANCH` | Odcinek „Ring-1" nie ma typu katalogowego | BLOCKER |
| `RING_NO_NOP` | Pierścień nie ma wyznaczonego NOP | BLOCKER |
| `SWITCH_NO_CATALOG` | Łącznik LS-NOP-1 nie ma typu katalogowego | WARNING |

### FixActions
| FixAction | Cel | Nawigacja |
|-----------|-----|-----------|
| `SELECT_CATALOG` dla Ring-1 | Przypisz typ kabla pierścienia | Przeglądarka katalogu |
| `NAVIGATE_TO_ELEMENT` dla LS-NOP-1 | Przejdź do łącznika NOP | Centrowanie kamery SLD na łączniku |

---

## PRZEPŁYW 5: UZUPEŁNIJ KATALOGI I OSIĄGNIJ GOTOWOŚĆ DO ANALIZ

### Cel
Uzupełnienie wszystkich brakujących danych katalogowych i jawnych, aby osiągnąć pełną gotowość do uruchomienia analiz.

### Warunek wstępny
Sieć z Przepływów 1-4 istnieje. Panel gotowości inżynierskiej wyświetla listę braków.

### Kroki użytkownika

**Krok 5.1: Otwórz panel gotowości**
- Użytkownik: Klik na ikonie „Gotowość" w pasku statusu (lub panel boczny „Gotowość inżynierska").
- Efekt: Wyświetlona lista braków pogrupowana wg obszarów (CATALOGS, TOPOLOGY, SOURCES, STATIONS).

**Krok 5.2: Przypisz typ katalogowy do odcinka (powtórz dla każdego)**
- Użytkownik: Klik na FixAction „Przypisz typ katalogowy" przy odcinku Mag-1.
- System: Otwiera przeglądarkę katalogu kabli SN z filtrem napięciowym 15 kV.
- Użytkownik: Wybiera kabel np. „XRUHAKXS 3×1×120 mm² 12/20 kV" → „Zastosuj"
- Operacja domenowa:
```json
{
  "operation": "assign_catalog_to_element",
  "payload": {
    "element_id": "branch-mag-1",
    "catalog_ref": {
      "catalog_id": "mv_cable_line",
      "type_id": "XRUHAKXS_3x1x120_12_20"
    }
  }
}
```
- Efekt na SLD: Odcinek Mag-1 zmienia styl (kolor, grubość) sygnalizując przypisany typ.
- Efekt w Readiness: Usunięty bloker `CATALOG_MISSING_BRANCH` dla Mag-1.

**Krok 5.3: Przypisz typ transformatora**
- Użytkownik: Klik na FixAction „Przypisz typ katalogowy" przy transformatorze TR-1.
- System: Przeglądarka katalogu transformatorów SN/nN.
- Użytkownik: Wybiera np. „ONAN 630 kVA 15/0.4 kV Dyn11" → „Zastosuj"
- Operacja domenowa:
```json
{
  "operation": "assign_catalog_to_element",
  "payload": {
    "element_id": "transformer-tr-1",
    "catalog_ref": {
      "catalog_id": "mv_transformer",
      "type_id": "ONAN_630_15_04_Dyn11"
    }
  }
}
```

**Krok 5.4: Uzupełnij dane źródła GPZ**
- Użytkownik: Klik na FixAction „Uzupełnij dane" przy GPZ-1.
- System: Otwiera dialog edycji źródła z zaznaczonymi brakującymi polami.
- Użytkownik: Wypełnia brakujące pola (np. kąt napięcia, impedancja zerowa).
- Operacja domenowa:
```json
{
  "operation": "update_element_parameters",
  "payload": {
    "element_id": "source-gpz-1",
    "parameters": {
      "voltage_angle_deg": 0.0,
      "z0_z1_ratio": 1.0,
      "x0_r0_ratio": 3.0
    }
  }
}
```

**Krok 5.5: Weryfikacja gotowości**
- Użytkownik: Panel gotowości → Odśwież.
- System: Readiness przeliczany. Jeśli wszystkie blokery usunięte → status „Gotowy do analiz".
- Efekt w UI: Przycisk „Uruchom analizę" staje się aktywny.

### Typowe blokady gotowości (przed uzupełnieniem)
| Obszar | Liczba braków | Typ |
|--------|--------------|-----|
| CATALOGS | 6 | BLOCKER (brak typów dla odcinków i transformatora) |
| SOURCES | 1 | WARNING (niekompletne dane GPZ) |
| TOPOLOGY | 0 | OK |
| STATIONS | 0 | OK (lub WARNING jeśli brak transformatora w stacji B) |

---

## PRZEPŁYW 6: URUCHOM ANALIZĘ + OVERLAY + RAPORT

### Cel
Uruchomienie analizy zwarciowej, wyświetlenie wyników na SLD (overlay), wygenerowanie raportu.

### Warunek wstępny
Gotowość do analiz osiągnięta (Przepływ 5).

### Kroki użytkownika

**Krok 6.1: Utwórz przypadek obliczeniowy**
- Użytkownik: Pasek statusu → „Menedżer przypadków" → „Nowy przypadek"
- Operacja (nie domenowa — zarządzanie przypadkami):
```json
{
  "endpoint": "POST /api/cases",
  "payload": {
    "name": "Zwarcie 3F — stan normalny",
    "kind": "ShortCircuitCase",
    "parameters": {
      "fault_type": "three_phase",
      "voltage_factor_c_max": 1.1,
      "voltage_factor_c_min": 1.0,
      "method": "IEC_60909"
    }
  }
}
```
- Efekt w UI: Przypadek aktywowany, tryb zmienia się na CASE_CONFIG.

**Krok 6.2: Uruchom analizę**
- Użytkownik: Klik „Oblicz" (przycisk na pasku narzędzi).
- Operacja:
```json
{
  "endpoint": "POST /api/analysis-runs",
  "payload": {
    "case_id": "case-zwarcie-3f",
    "analysis_kind": "SHORT_CIRCUIT"
  }
}
```
- Efekt: Backend uruchamia solver IEC 60909. Wyniki zapisane jako `AnalysisRun`.
- UI: Spinner → po zakończeniu tryb zmienia się na RESULT_VIEW.

**Krok 6.3: Wyświetl overlay wyników na SLD**
- Użytkownik: Klik „Pokaż wyniki na schemacie" (automatycznie po obliczeniu lub ręcznie).
- Mechanizm:
  1. UI pobiera `ResultSetV1` z backendu.
  2. `ResultJoin` łączy `LayoutResultV1` + `ResultSetV1` → `OverlayTokens`.
  3. `OverlayRenderer` rysuje tokeny na warstwach SLD.
- Efekt na SLD:
  - Na szynach: wartości prądów zwarciowych (Ik", Ip, Ith, Isk) w kolorach wg przekroczeń.
  - Na odcinkach: obciążenie termiczne (% Ith) z kolorowym gradientem.
  - Przy wyłącznikach: zdolność łączeniowa (PASS/FAIL).
- Legenda overlay widoczna w prawym dolnym rogu.

**Krok 6.4: Inspekcja wyników elementu**
- Użytkownik: Klik na szynie na SLD.
- Efekt: Inspektor wyświetla szczegóły:
  - Ik" (prąd zwarciowy początkowy) — wartość w kA
  - Ip (prąd udarowy) — wartość w kA
  - Ith (prąd cieplny) — wartość w kA
  - Isk (prąd zwarciowy ustalony) — wartość w kA
  - Werdykt: PASS / FAIL wg wytrzymałości aparatury

**Krok 6.5: Generuj raport**
- Użytkownik: Klik „Eksportuj raport" → Wybierz format (PDF).
- Operacja:
```json
{
  "endpoint": "POST /api/analysis-runs/{run_id}/export",
  "payload": {
    "format": "pdf",
    "include_sld_snapshot": true,
    "include_proof_pack": true,
    "language": "pl"
  }
}
```
- Efekt: Pobranie pliku PDF z:
  - Streszczeniem wyników (tabela)
  - Schematem jednokreskowym z overlay
  - Paczką dowodową (wzory, podstawienia, wyniki pośrednie)
  - Werdyktami per element

**Krok 6.6: Porównaj z innym scenariuszem (opcjonalnie)**
- Użytkownik: Menedżer przypadków → „Nowy przypadek" (np. „Zwarcie 3F — praca pierścieniowa") → Oblicz → „Porównaj z..."
- Operacja:
```json
{
  "endpoint": "POST /api/comparison",
  "payload": {
    "run_id_a": "run-stan-normalny",
    "run_id_b": "run-praca-pierscieniowa"
  }
}
```
- Efekt na SLD: Overlay delta — kolory zmiany (lepiej/gorzej) na elementach.
- Efekt w panelu: Tabela różnic wartości per element per parametr.

### Typowe blokady gotowości
| Kod | Komunikat | Priorytet |
|-----|----------|-----------|
| `ANALYSIS_NOT_ELIGIBLE` | Brak aktywnego przypadku obliczeniowego | BLOCKER |
| `RESULTS_OUTDATED` | Wyniki nieaktualne (model zmieniony po obliczeniu) | WARNING |
| `CASE_NO_FAULT_POINTS` | Brak zdefiniowanych punktów zwarciowych | BLOCKER (dla scenariuszy) |

### FixActions
| FixAction | Cel | Nawigacja |
|-----------|-----|-----------|
| `OPEN_MODAL` (menedżer przypadków) | Utwórz przypadek obliczeniowy | Otwiera dialog nowego przypadku |
| `NAVIGATE_TO_ELEMENT` (panel wyników) | Przejdź do elementu z przekroczeniem | Centrowanie kamery na elemencie |

---

## MAPOWANIE NA KOD

| Przepływ | Operacje domenowe (backend) | Pliki frontend |
|----------|---------------------------|---------------|
| 1 (GPZ + magistrala) | `add_grid_source_sn`, `continue_trunk_segment_sn` | `topology/domainApi.ts`, `sld/domainOpsClient.ts` |
| 2 (Stacja w odcinek) | `insert_station_on_segment_sn`, `update_switchgear_config` | `topology/modals/`, `sld/core/stationBlockBuilder.ts` |
| 3 (Odgałęzienie + stacja C) | `start_branch_segment_sn`, `add_transformer_sn_nn`, `add_nn_load` | `topology/domainApi.ts`, `topology/modals/` |
| 4 (Ring + NOP) | `connect_secondary_ring_sn`, `insert_section_switch_sn`, `set_normal_open_point` | `topology/domainApi.ts`, `topology/modals/` |
| 5 (Katalogi + gotowość) | `assign_catalog_to_element`, `update_element_parameters` | `catalog/api.ts`, `engineering-readiness/` |
| 6 (Analiza + overlay) | API: `POST /api/cases`, `POST /api/analysis-runs` | `results-workspace/`, `sld-overlay/`, `proof/` |

---

*Dokument wiążący. Każdy przepływ jest deterministyczny i testowalny end-to-end.*
