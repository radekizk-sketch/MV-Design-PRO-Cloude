# UI/UX 10/10 ABSOLUTE++ — Kanoniczny dokument wiazacy A-AZ

## Status: BINDING (KANON)

Data: 2026-02-16
Wersja: 1.0.0
Faza: 11/12

---

## 1. Zasady nadrzedne

| # | Zasada | Status |
|---|--------|--------|
| Z1 | Snapshot = jedyna prawda, niemutowalny | WIAZACE |
| Z2 | LogicalViews = f(snapshot) deterministycznie | WIAZACE |
| Z3 | Kazda zmiana = operacja domenowa | WIAZACE |
| Z4 | Brak domyslnych wartosci liczbowych | WIAZACE |
| Z5 | Katalogi: id + wersja + materializacja do Snapshot | WIAZACE |
| Z6 | Brak terminu PCC (grep-zero) | WIAZACE |
| Z7 | 100% PL w etykietach UI | WIAZACE |
| Z8 | Brak lokalnego grafu w kreatorze | WIAZACE |
| Z9 | Determinizm: powtorz 100x, permutacje 50x, golden networks | WIAZACE |

---

## 2. Macierz obiektow klikalnych A-AZ

### SN (Srednie napiecie)

| ID | Typ obiektu | ElementType | Builder | Min opcji | Modal |
|----|------------|-------------|---------|-----------|-------|
| A | GPZ / Zrodlo SN | Source | buildSourceSNContextMenu | 15 | NodeModal |
| B | Szyna SN | Bus | buildBusSNContextMenu | 20 | NodeModal |
| C | Stacja (kontener) | Station | buildStationContextMenu | 20 | TransformerStationModal |
| D | Pole SN | BaySN | buildBaySNContextMenu | 15 | NodeModal |
| E | Lacznik SN (wylacznik/rozlacznik) | Switch | buildSwitchSNContextMenu | 18 | BranchModal |
| F | Transformator 2-uzw. | TransformerBranch | buildTransformerContextMenu | 14 | BranchModal |
| G | Segment SN (linia/kabel) | LineBranch | buildSegmentSNContextMenu | 16 | BranchModal |
| H | Przekaznik SN | Relay | buildRelaySNContextMenu | 14 | ProtectionModal |
| I | Przekladnik SN (CT/VT) | Measurement | buildMeasurementSNContextMenu | 12 | MeasurementModal |
| J | NOP (punkt normalnie otwarty) | NOP | buildNOPContextMenu | 10 | NodeModal |

### nN (Niskie napiecie)

| ID | Typ obiektu | ElementType | Builder | Min opcji | Modal |
|----|------------|-------------|---------|-----------|-------|
| M | Szyna nN | BusNN | buildBusNNContextMenu | 25 | NodeModal |
| O | Odplyw nN | FeederNN | buildFeederNNContextMenu | 25 | BranchModal |
| S | Odbior nN | LoadNN | buildLoadNNContextMenu | 12 | LoadDERModal |
| U | Pole zrodlowe nN | SourceFieldNN | buildSourceFieldNNContextMenu | 15 | NodeModal |
| V | Falownik PV | PVInverter | buildPVInverterContextMenu | 18 | PVInverterModal |
| W | Falownik BESS | BESSInverter | buildBESSInverterContextMenu | 18 | BESSInverterModal |
| X | Magazyn energii | EnergyStorage | buildEnergyStorageContextMenu | 13 | NodeModal |
| Y | Agregat | Genset | buildGensetContextMenu | 16 | GensetModal |
| Z | UPS | UPS | buildUPSContextMenu | 14 | UPSModal |
| AA | Licznik energii | EnergyMeter | buildEnergyMeterContextMenu | 11 | MeasurementModal |
| AH | Lacznik nN | SwitchNN | buildSwitchNNContextMenu | 13 | BranchModal |

---

## 3. Operacje domenowe nN

| CanonicalOpName | Opis PL | Payload | Backend handler |
|-----------------|---------|---------|----------------|
| add_nn_source_field | Dodaj pole zrodlowe nN | AddNNSourceFieldPayload | handle_add_nn_source_field |
| add_pv_inverter_nn | Dodaj falownik PV | AddPVInverterNNPayload | handle_add_pv_inverter_nn |
| add_bess_inverter_nn | Dodaj falownik BESS | AddBESSInverterNNPayload | handle_add_bess_inverter_nn |
| add_genset_nn | Dodaj agregat | AddGensetNNPayload | handle_add_genset_nn |
| add_ups_nn | Dodaj UPS | AddUPSNNPayload | handle_add_ups_nn |
| add_nn_load | Dodaj odbior nN | AddNNLoadPayload | handle_add_nn_load |

---

## 4. Model danych SourceNN (kanoniczny)

```typescript
interface SourceNN {
  element_id: string;               // UUID
  source_type: NNSourceType;        // PV_INVERTER | BESS_INVERTER | GENSET | UPS
  field_id: string;                 // ref do pola zrodlowego
  switch_id: string;                // ref do aparatu laczeniowego
  catalog_item_id: string;          // ref do katalogu
  materialized_params: MaterializedSourceParams;
  operation_mode: string;           // specyficzny dla typu
  constraints: Record<string, unknown>;
}
```

### Typy zrodel nN

| NNSourceType | Modal | Wymagane pola |
|-------------|-------|---------------|
| PV_INVERTER | PVInverterModal | rated_power_ac_kw, control_mode, cos_phi |
| BESS_INVERTER | BESSInverterModal | usable_capacity_kwh, charge_power_kw, discharge_power_kw, operation_mode, control_strategy |
| GENSET | GensetModal | rated_power_kw, rated_voltage_kv, power_factor, operation_mode |
| UPS | UPSModal | rated_power_kw, backup_time_min, operation_mode |

---

## 5. Kody gotowosci nN (FAZA 7)

### Blokujace (BLOCKER)

| Kod | Priorytet | Komunikat PL | FixAction |
|-----|-----------|-------------|-----------|
| nn.source.field_missing | 1 | Zrodlo nN nie jest przypiete do pola zrodlowego | OPEN_MODAL: source_field_nn |
| nn.source.switch_missing | 2 | Pole zrodlowe nN nie posiada aparatu laczeniowego | ADD_MISSING_DEVICE: source_field_nn |
| nn.source.catalog_missing | 3 | Zrodlo nN nie ma przypisanego katalogu urzadzenia | SELECT_CATALOG: source_catalog |
| nn.source.parameters_missing | 4 | Zrodlo nN nie ma wymaganych parametrow elektrycznych | OPEN_MODAL: source_params |
| nn.voltage_missing | 5 | Napiecie szyny nN nie jest okreslone | OPEN_MODAL: bus_nn_properties |
| pv.control_mode_missing | 6 | Falownik PV nie ma okreslonego trybu regulacji | OPEN_MODAL: pv_inverter_edit |
| bess.energy_module_missing | 7 | Falownik BESS nie ma przypisanego modulu magazynu energii | SELECT_CATALOG: bess_storage_catalog |
| bess.soc_limits_invalid | 8 | Ograniczenia SOC magazynu BESS sa nieprawidlowe | OPEN_MODAL: bess_inverter_edit |
| ups.backup_time_invalid | 9 | Czas podtrzymania UPS jest nieprawidlowy (musi byc > 0) | OPEN_MODAL: ups_edit |

### Ostrzezenia (IMPORTANT / INFO)

| Kod | Priorytet | Poziom | Komunikat PL |
|-----|-----------|--------|-------------|
| nn.switch.catalog_ref_missing | 20 | IMPORTANT | Aparat laczeniowy pola nN nie ma przypisanego katalogu |
| nn.measurement.required_missing | 21 | IMPORTANT | Zrodlo nN nie ma przypisanego punktu pomiaru energii |
| genset.fuel_type_missing | 30 | INFO | Agregat nie ma okreslonego rodzaju paliwa |

---

## 6. Skroty klawiaturowe (FAZA 10)

### Nawigacja

| Skrot | Akcja PL |
|-------|---------|
| Ctrl+Home | Dopasuj widok do zawartosci |
| Ctrl+0 | Resetuj powiekszenie |
| + | Powieksz |
| - | Pomniejsz |
| Ctrl+F | Szukaj elementu... |
| Escape | Zamknij menu / anuluj |

### Edycja modelu (wymaga MODEL_EDIT)

| Skrot | Akcja PL |
|-------|---------|
| Ctrl+N | Dodaj element (szybkie dodawanie)... |
| Delete | Usun zaznaczony element... |
| Enter | Otworz wlasciwosci zaznaczonego elementu |
| Ctrl+D | Powiel zaznaczony element... |
| F2 | Zmien nazwe elementu |
| Space | Przelacz stan lacznika (otworz/zamknij) |

### Dodawanie zrodel nN (wymaga MODEL_EDIT)

| Skrot | Akcja PL |
|-------|---------|
| Ctrl+Shift+P | Dodaj falownik PV... |
| Ctrl+Shift+B | Dodaj falownik BESS... |
| Ctrl+Shift+G | Dodaj agregat... |
| Ctrl+Shift+U | Dodaj UPS... |

### Widoki i tryby

| Skrot | Akcja PL |
|-------|---------|
| Ctrl+1 | Tryb: Edycja modelu |
| Ctrl+2 | Tryb: Konfiguracja przypadku |
| Ctrl+3 | Tryb: Wyniki (tylko odczyt) |
| Ctrl+G | Tryb: Tylko gotowosc (podswietl blokery) |
| Ctrl+Shift+S | Tryb: Tylko zrodla (filtr wizualny) |
| F5 | Odswiez widok |
| Ctrl+I | Otworz / zamknij panel inspektora |
| Ctrl+T | Otworz / zamknij drzewo projektu |

### Analiza (wymaga RESULT_VIEW)

| Skrot | Akcja PL |
|-------|---------|
| Ctrl+R | Uruchom obliczenia... |
| Ctrl+W | Otworz White Box... |
| Ctrl+E | Eksportuj wyniki... |

### Narzedzia

| Skrot | Akcja PL |
|-------|---------|
| Ctrl+V | Waliduj model sieci |
| F1 | Pomoc — lista skrotow klawiaturowych |
| Ctrl+Shift+E | Eksportuj schemat SLD... |

---

## 7. Tryby filtrowania wizualnego

| Tryb | Etykieta PL | Skrot | Opis |
|------|------------|-------|------|
| ALL | Wszystkie elementy | - | Brak filtra |
| READINESS_ONLY | Tylko gotowosc | Ctrl+G | Podswietl elementy z blockerami |
| SOURCES_ONLY | Tylko zrodla | Ctrl+Shift+S | Pokaz tylko zrodla energii |
| NN_ONLY | Tylko nN | - | Pokaz tylko elementy nN |
| PROTECTION_ONLY | Tylko zabezpieczenia | - | Pokaz tylko zabezpieczenia |

---

## 8. Straznicy CI

| Straznik | Plik | Weryfikuje |
|----------|------|------------|
| nn-source-menu-guard | scripts/nn_source_menu_guard.py | Kompletnosc menu, etykiety PL, modale nN |
| pcc-zero-guard | scripts/pcc_zero_guard.py | Brak terminu PCC w kodzie |
| no-codenames-guard | scripts/no_codenames_guard.py | Brak kodow projektowych w UI |
| sld-determinism-guards | scripts/sld_determinism_guards.py | Determinizm renderingu SLD |

---

## 9. Pliki implementacji

### Nowe pliki

| Plik | Rozmiar | Zawartosc |
|------|---------|-----------|
| frontend/src/ui/context-menu/actionMenuBuilders.ts | ~50 KB | 21 builderow menu A-AZ |
| frontend/src/ui/topology/modals/PVInverterModal.tsx | ~23 KB | Modal PV z walidacja |
| frontend/src/ui/topology/modals/BESSInverterModal.tsx | ~20 KB | Modal BESS z walidacja |
| frontend/src/ui/topology/modals/GensetModal.tsx | ~15 KB | Modal agregat z walidacja |
| frontend/src/ui/topology/modals/UPSModal.tsx | ~14 KB | Modal UPS z walidacja |
| frontend/src/ui/engineering-readiness/nnSourceReadinessCodes.ts | ~7 KB | 12 kodow gotowosci nN |
| frontend/src/ui/sld/core/keyboardShortcuts.ts | ~8 KB | 30 skrotow + 5 filtrow |
| scripts/nn_source_menu_guard.py | ~10 KB | Straznik CI menu nN |
| frontend/src/ui/context-menu/__tests__/actionMenuBuilders.test.ts | ~28 KB | Testy kompletnosci menu |
| frontend/src/ui/context-menu/__tests__/nnSourceReadiness.test.ts | ~11 KB | Testy kodow gotowosci |

### Zmodyfikowane pliki

| Plik | Zmiana |
|------|--------|
| frontend/src/ui/types.ts | Rozszerzenie ElementType do 52 typow A-AZ |
| frontend/src/ui/context-menu/actions.ts | Rozszerzenie typeLabels i deleteLabels |
| frontend/src/ui/context-menu/index.ts | Eksporty 22 nowych builderow |
| frontend/src/ui/topology/modals/index.ts | Eksporty 4 nowych modali |
| frontend/src/types/domainOps.ts | 6 nowych operacji + typy SourceNN |
| backend/src/enm/domain_operations.py | 6 nowych operacji w CANONICAL_OPS |
| backend/src/enm/domain_ops_models.py | Modele Pydantic SourceNN |

---

## 10. Weryfikacja determinizmu

Kazdy builder musi spelniac:
- Identyczne wywolanie (ten sam mode) = identyczny wynik (tablica akcji)
- Brak losowych ID, brak Date.now() w logice
- Brak efektow ubocznych (pure functions)

Test: `powtorz 100x buildXxxContextMenu(mode) => deepEqual(result_0, result_i)` dla kazdego i.

---

## 11. Zgodnoscz architektura

- Prezentacja: BRAK fizyki, BRAK mutacji modelu
- Aplikacja: Wizard/SLD/Walidacja — BRAK fizyki
- Domena: NetworkModel — mutacja TYLKO tutaj
- Solver: Fizyka TYLKO tutaj, WHITE BOX wymagany
- Analiza: Interpretacja TYLKO, BRAK fizyki

---

*Koniec dokumentu wiszacego.*
