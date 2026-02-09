# ROZDZIAŁ 5 — KONTRAKTY KANONICZNE SYSTEMU: KREATOR, KATALOGI, STACJE, ZABEZPIECZENIA, MODELE NIEDOZWOLONE

**Wersja:** 1.0 FINAL
**Data:** 2026-02-09
**Status:** AS-IS (1:1 z kodem) + TO-BE (sekcje oznaczone)
**Warstwa:** Application + Catalog + ENM Meta + Validation + White Box
**Zależności:** Rozdział 2 (§2.3–§2.21), Rozdział 3 (§3.1–§3.11), Rozdział 4 (§4.1–§4.19), AUDIT §9 (Decyzje #15–#33, #34–#38)
**Autor:** System Architect + PhD Energetyki

---

## 5.1 Cel i zakres rozdziału

Niniejszy rozdział definiuje **kontrakty kanoniczne na poziomie całego systemu** MV-DESIGN-PRO. Obejmuje:

1. Zasadę kompozycji: TYP × parametry zmienne × ilość × override = obiekt ENM
2. Kreator (Wizard) jako jedyną ścieżkę tworzenia modelu
3. Katalog typów jako jedyne źródło parametrów znamionowych
4. Parametry zmienne i tryb EKSPERT (override)
5. Źródła, odbiory, falowniki — kanon fizyczny
6. Stacje SN/nn i stacje zasilane liniowo
7. Powiązanie zabezpieczeń z ENM (Bay → Protection → Branch)
8. Study Case — architektura scenariuszy obliczeniowych
9. Modele niedozwolone (illegal models) — reguły blokujące
10. Spójność ENM → Solver → White Box → Raporty

**Granica rozdziału:** Rozdział definiuje kontrakty systemowe integrujące wszystkie warstwy. NIE powtarza treści z Rozdziałów 1–4 — referencuje je. NIE opisuje solverów (→ SPEC_10, SPEC_11).

---

## 5.2 Zasada kompozycji — kanon systemu (Decyzja #18, Rozdział 2 §2.19)

### 5.2.1 Reguła fundamentalna (BINDING)

Każdy element sieciowy w MV-DESIGN-PRO jest wynikiem relacji:

```
TYP (katalog, READ-ONLY)
+ PARAMETRY ZMIENNE (instancja, kreator)
+ ILOŚĆ (jeżeli dotyczy)
+ OVERRIDE EKSPERT (jeżeli użyty, audytowalny)
= OBIEKT ENM
```

### 5.2.2 Priorytet danych (3-poziomowa precedencja)

```
OVERRIDE EKSPERT (najwyższy priorytet)
> TYP (katalog)
> PARAMETR INSTANCJI (fallback — backward compatibility)
```

**Implementacja:** `ParameterSource` enum + `resolve_line_params()` / `resolve_transformer_params()` w `catalog/resolver.py` (AS-IS, Rozdział 4 §4.6).

### 5.2.3 Tabela kompozycji per element (BINDING)

| Element ENM | Typ katalogowy | Parametry zmienne (kreator) | Override (EKSPERT) | Ilość | Status |
|-------------|---------------|----------------------------|-------------------|-------|--------|
| OverheadLine | `LineType` | `length_km`, `status` | `impedance_override` | — | AS-IS |
| Cable | `CableType` | `length_km`, `status`, `insulation` | `impedance_override` | — | AS-IS |
| Transformer | `TransformerType` | `tap_position`, `hv_neutral`, `lv_neutral` | `uk_percent`, `pk_kw` (TO-BE) | — | AS-IS (resolver) |
| SwitchBranch | `SwitchEquipmentType` | `status` (open/closed) | — | — | AS-IS (typ), TO-BE (resolver) |
| FuseBranch | — (brak typu) | `rated_current_a`, `rated_voltage_kv` | — | — | AS-IS |
| Generator (falownik) | `ConverterType` / `InverterType` | `p_mw`, `q_mvar`, tryb pracy | limity, `k_sc` (TO-BE) | `n_parallel` (TO-BE) | AS-IS (typy w katalogu), TO-BE (resolver, `catalog_ref`) |
| Generator (synchroniczny) | — (brak typu) | `p_mw`, `q_mvar` | — | — | AS-IS |
| Load | — (brak typu) | `p_mw`, `q_mvar`, `model` | — | — | AS-IS |
| Source | — (brak typu) | `sk3_mva`, `r_ohm`/`x_ohm`, `rx_ratio` | — | — | AS-IS |
| ProtectionDevice | `ProtectionDeviceType` + `ProtectionCurve` + `ProtectionSettingTemplate` | nastawy, `location_element_id` | override nastaw (TO-BE) | — | AS-IS (typy), TO-BE (template binding) |

### 5.2.4 Zakazy (BINDING)

- **ZAKAZ** ręcznego wpisywania parametrów znamionowych w trybie standardowym — kreator wymusza wybór z katalogu
- **ZAKAZ** tworzenia obiektów ENM bez referencji do katalogu (tryb standardowy; backward compatibility: `ParameterSource.INSTANCE` dozwolony jako fallback, ale raportowany jako WARNING I002)
- **ZAKAZ** tworzenia obiektów „wiszących" poza topologią (walidacja E003: connectivity)
- **ZAKAZ** niejawnych/cichych modyfikacji parametrów typu — zmiana wymaga jawnego trybu EKSPERT

---

## 5.3 Kreator (Wizard) — kontrakt kanoniczny (Decyzja #34)

### 5.3.1 Rola kreatora (BINDING)

Kreator:
- **JEST** prowadzącym mechanizmem modelowania — sekwencyjnym kontrolerem edycji ENM
- **JEST** jedyną dozwoloną ścieżką tworzenia kompletnego modelu sieci (pierwsza sesja)
- **NIE JEST** edytorem dowolnym — wymusza kompletność danych per krok
- **NIE JEST** osobnym modelem danych — operuje BEZPOŚREDNIO na ENM
- **NIE JEST** drzewem ENM — drzewo ENM umożliwia pełną edycję po zakończeniu kreatora

Kreator:
- wymusza kompletność danych,
- blokuje przejście dalej przy brakach,
- gwarantuje fizyczną poprawność modelu.

**Plik źródłowy (frontend):** `frontend/src/ui/wizard/WizardPage.tsx`
**Plik źródłowy (backend):** `application/wizard_runtime/service.py`, `application/wizard_actions/service.py`

### 5.3.2 Architektura: frontend = kroki, backend = akcje

| Warstwa | Mechanizm | Opis |
|---------|-----------|------|
| **Frontend** | 10 kroków K1–K10 (`WizardPage.tsx`) | Sekwencja wizualna z walidacją per krok |
| **Backend** | Action-based (`wizard_runtime/service.py`) | Sesja → akcje → snapshot → commit/abort |

**Backend NIE definiuje** jawnych kroków K1–K10 — jest action-based. Frontend mapuje wizualną sekwencję na atomowe akcje backendowe.

### 5.3.3 Sekwencja kanoniczna — 10 kroków (AS-IS)

| Krok | ID | Nazwa (PL) | Tworzy w ENM | Status kroku |
|------|----|-----------|-------------|-------------|
| 1 | K1 | Parametry modelu | ENMHeader (nazwa, częstotliwość, opis) | `empty \| partial \| complete` |
| 2 | K2 | Punkt zasilania | Bus SN (główny) + Source (sieć zasilająca) | `empty \| partial \| complete \| error` |
| 3 | K3 | Struktura szyn i sekcji | Dodatkowe Bus SN, SwitchBranch(bus_coupler) | `empty \| partial \| complete` |
| 4 | K4 | Gałęzie (linie / kable) | OverheadLine, Cable (z `catalog_ref`, `length_km`) | `empty \| partial \| complete \| error` |
| 5 | K5 | Transformatory | Transformer (z `catalog_ref` lub parametrami) | `empty \| partial \| complete \| error` |
| 6 | K6 | Odbiory i generacja | Load, Generator (w tym OZE/falowniki) | `empty \| partial \| complete` |
| 7 | K7 | Uziemienia i składowe zerowe | Przegląd i uzupełnienie Z₀ (r0, x0, grounding) | `empty \| partial \| complete` |
| 8 | K8 | Walidacja | — (brama walidacyjna, wyświetla issues) | `empty \| blocked \| ready` |
| 9 | K9 | Schemat jednokreskowy | — (podgląd SLD z referencjami ENM) | — |
| 10 | K10 | Uruchom analizy | — (uruchomienie SC 3F / Power Flow) | — |

**Plik źródłowy:** `frontend/src/ui/wizard/WizardPage.tsx` (StepK1–StepK10)

### 5.3.4 Maszyna stanów kreatora (AS-IS)

```python
# frontend/src/ui/wizard/wizardStateMachine.ts
computeWizardState(enm) → WizardState  # Deterministyczny: ten sam ENM = ten sam stan
getStepForElement(enm, elementRefId) → step_id  # Mapuje kliknięcie SLD → krok kreatora
```

| Stan kroku | Znaczenie |
|-----------|-----------|
| `empty` | Brak danych w kroku |
| `partial` | Dane niekompletne |
| `complete` | Dane kompletne |
| `error` | Dane błędne (walidacja negatywna) |

| Stan globalny | Znaczenie |
|--------------|-----------|
| `empty` | Brak danych w modelu |
| `incomplete` | Dane niekompletne |
| `ready` | Model gotowy do analiz |
| `blocked` | BLOCKER(y) uniemożliwiają analizy |

### 5.3.5 Backend: sesja → akcje → snapshot (AS-IS)

**WizardSession** (`application/wizard_runtime/session.py`):

| Pole | Typ | Opis |
|------|-----|------|
| `wizard_session_id` | UUID | Identyfikator sesji |
| `project_id` | UUID | Projekt |
| `base_snapshot_id` | str | Snapshot bazowy |
| `working_snapshot_id` | str \| None | Snapshot roboczy |
| `status` | `OPEN \| COMMITTED \| ABORTED` | Status sesji |
| `action_ids` | list[str] | Lista zaakceptowanych akcji |

**Cykl życia sesji:**

```
start_session(project_id) → WizardSession(status=OPEN)
    │
    ├── submit_action(session_id, action) → walidacja + zastosowanie
    ├── submit_batch(session_id, actions) → atomowy batch (fail-fast)
    ├── preview(session_id) → snapshot roboczy
    │
    ├── commit(session_id) → nowy snapshot (uuid5 deterministyczny) → status=COMMITTED
    └── abort(session_id) → reset → status=OPEN
```

**Akcje ENM** (`network_model/core/action_envelope.py`):

| Typ akcji | Payload | Opis |
|-----------|---------|------|
| `create_node` | `node_type: SLACK\|PQ\|PV` | Tworzenie Bus/Source |
| `create_branch` | `from_node_id, to_node_id, branch_kind: LINE\|CABLE\|TRANSFORMER\|SWITCH` | Tworzenie gałęzi |
| `set_in_service` | `entity_id, in_service: bool` | Przełączenie stanu |

**Invalidacja wyników:** Po zatwierdzeniu batch akcji, `ResultInvalidator` oznacza wszystkie wyniki projektu jako OUTDATED.

### 5.3.6 Powiązanie kreator → SLD (BINDING)

SLD:
- jest **wyłącznie wizualizacją** ENM (Rozdział 2 §2.1; `docs/ui/SLD_UI_ARCHITECTURE.md`)
- **NIE może** tworzyć relacji nieistniejących w ENM
- każda zmiana w kreatorze **natychmiast** odzwierciedla się w SLD
- bijekcja 1:1: jeden element ENM = jeden symbol SLD

### 5.3.7 Zakazy kreatora (BINDING — konsolidacja)

| Zakaz | Uzasadnienie | Ref |
|-------|-------------|-----|
| Kreator NIE MOŻE pozwolić na `Generator(falownik) → Bus SN` | Falownik = nn (Decyzja #11) | §2.17, §5.6.1 |
| Kreator NIE MOŻE tworzyć linii/kabla bez `length_km > 0` | Impedancja zerowa = BLOCKER | §4.12.3 |
| Kreator NIE MOŻE tworzyć linii/kabla bez Bay | Bay = punkt pomiarowy + zabezpieczenia | §4.15, §4.19.3 |
| Kreator NIE MOŻE tworzyć odbioru bez pola odpływowego | Kompletność toru (Decyzja #13) | §2.18 |
| Kreator NIE MOŻE „cicho" modyfikować parametrów typu | Override = tryb EKSPERT (Decyzja #16) | §5.5 |
| Kreator NIE MOŻE pomijać etapów | Sekwencja K1→K10 jest obowiązkowa | §5.3.3 |
| Kreator NIE MOŻE tworzyć transformatorów z `hv_bus == lv_bus` | BLOCKER E007 | §5.10 |

---

## 5.4 Katalog typów — jedyne źródło parametrów znamionowych (Decyzja #35)

### 5.4.1 Katalog typów — 9 klas (AS-IS)

Wszystkie typy katalogowe są **frozen dataclasses** (immutable). Zdefiniowane w `network_model/catalog/types.py`:

| # | Klasa | Warstwa | Parametry kluczowe | AS-IS |
|---|-------|---------|-------------------|-------|
| 1 | `LineType` | ENM Core | R′, X′, B′, In, jth, materiał, przekrój | ✅ |
| 2 | `CableType` | ENM Core | R′, X′, C′, In, jth, izolacja, żyły | ✅ |
| 3 | `TransformerType` | ENM Core | Sn, Uhv, Ulv, uk%, Pk, i0%, P0, grupa | ✅ |
| 4 | `SwitchEquipmentType` | ENM Core | Un, In, Ik (łamanie), Icw, medium | ✅ |
| 5 | `ConverterType` | ENM Core | kind(PV/WIND/BESS), Un, Sn, Pmax, Q limits, E(kWh) | ✅ |
| 6 | `InverterType` | ENM Core | Un, Sn, Pmax, Q limits (bez kind, bez E) | ✅ |
| 7 | `ProtectionDeviceType` | Protection | name_pl, vendor, seria, In, notes_pl | ✅ |
| 8 | `ProtectionCurve` | Protection | name_pl, standard, curve_kind, parameters | ✅ |
| 9 | `ProtectionSettingTemplate` | Protection | device_type_ref, curve_ref, setting_fields | ✅ |

**Plik źródłowy:** `network_model/catalog/types.py` (~800 linii)

### 5.4.2 CatalogRepository — repozytorium typów (AS-IS)

```python
@dataclass(frozen=True)
class CatalogRepository:
    line_types: dict[str, LineType]
    cable_types: dict[str, CableType]
    transformer_types: dict[str, TransformerType]
    switch_equipment_types: dict[str, SwitchEquipmentType]
    converter_types: dict[str, ConverterType]
    inverter_types: dict[str, InverterType]
    protection_device_types: dict[str, ProtectionDeviceType]
    protection_curves: dict[str, ProtectionCurve]
    protection_setting_templates: dict[str, ProtectionSettingTemplate]
```

**Plik źródłowy:** `network_model/catalog/repository.py:20–234`

**Metody lookup:** `get_line_type(id)`, `get_cable_type(id)`, `get_transformer_type(id)`, `get_switch_equipment_type(id)`, `get_converter_type(id)`, `get_inverter_type(id)`, `get_protection_device_type(id)`, `get_protection_curve(id)`, `get_protection_setting_template(id)`

**Metody list:** deterministyczne sortowanie per typ; `list_converter_types(kind)` z filtrem PV/WIND/BESS.

**Factory:** `get_default_mv_catalog()` — wbudowany katalog zawierający:
- Kable bazowe (XLPE/EPR, Cu/Al, 1c/3c, 70–400mm²) + NKT + Tele-Fonika
- Linie napowietrzne (Al/Al-St, 25–150mm²)
- Transformatory mocy (110/15kV, 110/20kV, 16–63MVA)
- Transformatory rozdzielcze (15/0.4kV, 20/0.4kV, 63–1000kVA)
- Aparaty łączeniowe (wyłączniki, rozłączniki, odłączniki, reklozery, bezpieczniki)
- Przetwornice (PV, wiatr, BESS)

### 5.4.3 Frontend — UI katalogu (AS-IS)

| Komponent | Plik | Funkcja |
|-----------|------|---------|
| `TypePicker` | `ui/catalog/TypePicker.tsx` | Modal wyboru typu (szukanie, parametry, selekcja) |
| `TypeLibraryBrowser` | `ui/catalog/TypeLibraryBrowser.tsx` | Przeglądarka katalogu (4 zakładki: LINE, CABLE, TRANSFORMER, SWITCH) |

**API katalogu** (`ui/catalog/api.ts`):

| Endpoint | Opis |
|----------|------|
| `GET /api/catalog/line-types` | Lista typów linii |
| `GET /api/catalog/cable-types` | Lista typów kabli |
| `GET /api/catalog/transformer-types` | Lista typów transformatorów |
| `GET /api/catalog/switch-equipment-types` | Lista typów aparatów |
| `assignTypeToBranch(projectId, branchId, typeId)` | Przypisanie typu do gałęzi |
| `assignTypeToTransformer(projectId, transformerId, typeId)` | Przypisanie typu do transformatora |
| `clearTypeFromBranch(projectId, branchId)` | Usunięcie przypisania typu |
| `exportTypeLibrary()` / `importTypeLibrary(data, mode)` | Eksport/import katalogu |

### 5.4.4 Zasada READ-ONLY (BINDING)

Parametry katalogowe są **READ-ONLY** w trybie standardowym:
- Użytkownik wybiera typ z katalogu przez `TypePicker`
- `catalog_ref` na elemencie ENM wskazuje wybrany typ
- Resolver odczytuje parametry z katalogu (`ParameterSource.TYPE_REF`)
- Edycja parametrów typu wymaga trybu EKSPERT (§5.5)

---

## 5.5 Tryb EKSPERT — override kontrolowany (Decyzja #16)

### 5.5.1 Definicja trybu (BINDING)

Tryb EKSPERT:
- pozwala nadpisać **WYBRANE** parametry typu katalogowego na poziomie instancji
- **NIE zmienia** typu katalogowego w repozytorium
- **NIE usuwa** relacji z katalogiem (`catalog_ref` pozostaje)
- wymaga **jawnego potwierdzenia** przez użytkownika

### 5.5.2 Priorytet danych (identyczny z §5.2.2)

```
OVERRIDE EKSPERT (ParameterSource.OVERRIDE)
> TYP (ParameterSource.TYPE_REF)
> PARAMETR INSTANCJI (ParameterSource.INSTANCE — fallback)
```

### 5.5.3 Implementacja AS-IS

| Element | Override AS-IS | Mechanizm |
|---------|--------------|-----------|
| OverheadLine / Cable | `impedance_override: LineImpedanceOverride` | `r_total_ohm, x_total_ohm, b_total_us` — wartości sumaryczne |
| Transformer | Brak override (TO-BE) | — |
| Generator (falownik) | Brak override (TO-BE) | — |
| ProtectionDevice | `ProtectionConfig.overrides: dict` | Nadpisanie nastaw per pole |

### 5.5.4 Audyt override (BINDING)

Każdy override:
1. Jest jawnie oznaczony w modelu ENM
2. Jest raportowany w White Box z identyfikatorem `ParameterSource.OVERRIDE`
3. White Box odtwarza: `TYP(snapshot) → OVERRIDE(delta) → parametry finalne → model solvera → wynik`
4. Raport eksportu (LaTeX, PDF, DOCX) wyświetla override z jawnym oznaczeniem

### 5.5.5 Zakazy (BINDING)

- **ZAKAZ** niejawnego override — użytkownik MUSI świadomie aktywować tryb EKSPERT
- **ZAKAZ** modyfikacji katalogu przez override — override dotyczy wyłącznie instancji
- **ZAKAZ** override bez snapshotu typu — brak możliwości audytu odstępstwa → WARNING W010 (TO-BE)
- **ZAKAZ** automatycznego override przez system — override MUSI pochodzić od użytkownika

---

## 5.6 Źródła, odbiory, falowniki — kanon fizyczny

### 5.6.1 Falownik — zasady fizyczne (Decyzja #11, #12, #14)

**Reguły (BINDING — Rozdział 2 §2.17):**
1. Falownik (`Generator.gen_type ∈ {pv_inverter, wind_inverter, bess}`) jest **zawsze** urządzeniem nn
2. Falownik **NIE zna** poziomu SN — SN osiągane wyłącznie przez transformator nn/SN
3. Napięcie znamionowe falownika wynika z **typu katalogowego** (`ConverterType.un_kv` / `InverterType.un_kv`)
4. Integracja z SN: `N × Generator(nn) → Bus nn → Transformer nn/SN → Bus SN`
5. Zakaz `Generator(falownik) → Bus(voltage_kv > 1 kV)` — walidacja E009 (TO-BE)

### 5.6.2 Ilość falowników (Decyzja #17)

Kreator MUSI umożliwiać:
1. Wybór typu falownika z katalogu (`ConverterType` / `InverterType`)
2. Podanie liczby falowników równoległych (`n_parallel`)

**Mapowanie na solver** (Decyzja #14 — TO-BE):
- Wariant A: N instancji Generator → N instancji InverterSource w solverze
- Wariant B: 1 Generator z `n_parallel=N` → 1 InverterSource z `in_rated_a × N`

> **Stan AS-IS:** Generator nie posiada pola `n_parallel` ani `catalog_ref`. ConverterType i InverterType istnieją w katalogu ale nie są powiązane z Generator przez resolver. GAP: pola TO-BE.

### 5.6.3 Transformator nn/SN (BINDING)

- Napięcie dolnej strony transformatora pochodzi z `TransformerType.voltage_lv_kv`
- Musi być spójne z napięciem Bus nn źródła (determinowanym przez typ falownika)
- **ZAKAZ** ręcznego wpisywania napięć — napięcia z katalogów typów
- Kreator WYMUSZA dodanie transformatora nn/SN przy integracji OZE z SN (§5.3.7)

### 5.6.4 Odbiory (Decyzja #13)

| Reguła | Opis | Ref |
|--------|------|-----|
| Odbiór ma `bus_ref` | Load przypisany do konkretnego Bus | `enm/models.py:201` |
| Odbiór wymaga pola odpływowego | Bay(FEEDER) + SwitchBranch/FuseBranch | Rozdział 2 §2.18 |
| Parametry zmienne z kreatora | `p_mw`, `q_mvar`, `model` (pq/zip) | K6 |
| Brak katalogu typów (AS-IS) | Load nie posiada `catalog_ref` | GAP |
| **ZAKAZ** odbioru „wiszącego" | Load bez toru do Source = BLOCKER E003 | `validator.py` |

### 5.6.5 Source — punkt zasilania (AS-IS)

Source modeluje sieć zasilającą (grid equivalent):
- Nie posiada `catalog_ref` — parametry (`sk3_mva`, `r_ohm`/`x_ohm`, `rx_ratio`) wprowadzane bezpośrednio w K2
- Mapowanie: Source → virtual ground node + impedance branch (`mapping.py:191–248`)
- Brak Source w modelu = BLOCKER E001

---

## 5.7 Stacje — model logiczny (Decyzja #36)

### 5.7.1 Substation w ENM (AS-IS)

```python
class Substation(ENMElement):
    station_type: Literal["gpz", "mv_lv", "switching", "customer"]
    bus_refs: list[str] = []
    transformer_refs: list[str] = []
    entry_point_ref: str | None = None
```

**Plik źródłowy:** `enm/models.py:225–231`

### 5.7.2 Station w solverze (AS-IS)

```python
class Station:
    id: str
    name: str
    station_type: StationType  # GPZ | RPZ | TRAFO | SWITCHING
    voltage_level_kv: float = 0.0  # Informacyjne
    bus_ids: List[str]
    branch_ids: List[str]
    switch_ids: List[str]
```

**Plik źródłowy:** `network_model/core/station.py:36–262`

**KLUCZOWE:** Station jest **WYŁĄCZNIE logiczna** — NIE ma wpływu na obliczenia. Odpowiednik PowerFactory Substation folder.

### 5.7.3 Typy stacji (BINDING)

| Typ | ENM `station_type` | Solver `StationType` | Opis |
|-----|-------|------|------|
| GPZ | `"gpz"` | `GPZ` | Główny Punkt Zasilający — zawiera Source, Bus WN/SN, Trafo WN/SN |
| Stacja rozdzielcza | — (TO-BE) | `RPZ` | Rozdzielnia SN (bez transformacji) |
| Stacja SN/nn | `"mv_lv"` | `TRAFO` | Stacja transformatorowa z Trafo SN/nn |
| Punkt rozłącznikowy | `"switching"` | `SWITCHING` | Stacja bez transformacji (SwitchBranch) |
| Stacja klienta | `"customer"` | — | Stacja odbiorcza |

### 5.7.4 Stacja SN/nn — wzorzec kanoniczny

```
Bus SN (z magistrali)
│
Bay SN (IN) — łącznik + zabezpieczenia
│
Bus SN stacji
│
Bay SN (TR) — pole transformatorowe
│
Transformer SN/nn (catalog_ref → TransformerType)
│
Bus nn stacji
│
Bay nn (FEEDER) — pola odpływowe nn
│
Load (odbiory) / Generator (OZE nn)
```

### 5.7.5 Stacja zasilana liniowo — stacja oddziałowa (Decyzja #28)

**Reguły (BINDING — Rozdział 3 §3.6):**
1. Stacja oddziałowa **NIE posiada Source** — zasilanie z linii SN z GPZ/stacji nadrzędnej
2. `Bus SN` stacji oddziałowej jest **niezależnym węzłem** obliczeniowym (własne `voltage_kv`)
3. Stacja oddziałowa MOŻE posiadać:
   - lokalne sekcjonowanie (Bus SN sekcji + SwitchBranch bus_coupler)
   - transformatory SN/nn
   - odbiory nn / źródła OZE nn
4. Stacja oddziałowa MOŻE być elementem ringu SN (NO point na jednym z feedów)

### 5.7.6 Solver — stacja NIE wpływa na obliczenia (BINDING)

Solver widzi wyłącznie:
- **Bus** (węzły) z `voltage_kv`
- **Branch** (gałęzie) z impedancjami
- **Switch** (łączniki) ze stanem
- **Transformer** z parametrami znamionowymi

Solver **NIE widzi** Substation, Bay, Corridor, Station — to byty warstwy meta/organizacyjnej.

---

## 5.8 Powiązanie zabezpieczeń z ENM (Rozdział 2 §2.15–§2.21, Rozdział 4 §4.15–§4.16)

### 5.8.1 Schemat kanoniczny (BINDING — konsolidacja)

```
Bay (bay_role="OUT" / "FEEDER")
├── SwitchBranch (łącznik — w equipment_refs)
├── CT / VT (punkt pomiarowy — TO-BE)
├── ProtectionDevice (Bay.protection_ref → PD.id)
│       └── location_element_id → Branch.ref_id (obiekt chroniony)
│       └── settings: OvercurrentProtectionSettings
│       └── device_type: RELAY | FUSE | RECLOSER | CIRCUIT_BREAKER
│
Branch (OverheadLine / Cable — w equipment_refs)
```

### 5.8.2 Stan AS-IS vs TO-BE

| Aspekt | AS-IS | TO-BE |
|--------|-------|-------|
| `ProtectionDevice.location_element_id` → Branch | ✅ Bezpośrednia referencja | Referencja przez Bay |
| `Bay.protection_ref` | Flaga readiness | Pełny link do PD |
| `Bay.equipment_refs` → Branch | Pole istnieje, brak walidacji | Walidowany kontrakt 1:1 |
| White Box: Bay identyfikacja | Brak | Pełny łańcuch Bay→Branch→PD |
| Kreator: wymuszanie zabezpieczeń | Brak | Blokada braku konfiguracji |

### 5.8.3 Kreator → zabezpieczenia (TO-BE — Decyzja #37)

> **TO-BE** — nie zaimplementowane. Wymaga osobnej decyzji implementacyjnej.

Kreator POWINIEN:
1. Wymuszać dobór zabezpieczenia przy tworzeniu pola liniowego (Bay OUT/FEEDER)
2. Oferować wybór z katalogu `ProtectionDeviceType` + `ProtectionCurve`
3. Blokować brak konfiguracji zabezpieczeń (lub jawnie raportować jako ograniczenie)
4. Zapewniać komplet danych pomiarowych (CT/VT — TO-BE)

> **Stan AS-IS:** Zabezpieczenia są konfigurowane **po** kreatorze, w dedykowanym module Protection Coordination (`ui/protection-coordination/`). Kreator NIE wymusza konfiguracji zabezpieczeń — model bez zabezpieczeń jest dozwolony.

---

## 5.9 Study Case — architektura scenariuszy obliczeniowych

### 5.9.1 Definicja (AS-IS)

Study Case (scenariusz obliczeniowy) przechowuje **WYŁĄCZNIE** parametry obliczeń — **NIE** dane modelu.

```python
@dataclass(frozen=True)
class StudyCase:
    id: UUID
    project_id: UUID
    name: str
    network_snapshot_id: str | None  # Referencja do snapshotu ENM
    config: StudyCaseConfig           # Parametry obliczeń
    protection_config: ProtectionConfig  # Konfiguracja zabezpieczeń
    result_status: StudyCaseResultStatus  # NONE | FRESH | OUTDATED
    is_active: bool                   # Jeden aktywny per projekt
    result_refs: tuple[StudyCaseResult, ...]  # Metadane wyników
```

**Plik źródłowy:** `domain/study_case.py:173–488`

### 5.9.2 StudyCaseConfig — parametry obliczeń (AS-IS)

| Parametr | Typ | Domyślnie | Opis |
|----------|-----|-----------|------|
| `c_factor_max` | float | 1.10 | Współczynnik napięciowy cmax (IEC 60909) |
| `c_factor_min` | float | 0.95 | Współczynnik napięciowy cmin |
| `base_mva` | float | 100.0 | Baza MVA per-unit |
| `max_iterations` | int | 50 | Iteracje Newton-Raphson |
| `tolerance` | float | 1e-6 | Kryterium zbieżności |
| `include_motor_contribution` | bool | True | Wkład silników |
| `include_inverter_contribution` | bool | True | Wkład falowników |
| `thermal_time_seconds` | float | 1.0 | Czas dla Ith |

### 5.9.3 Cykl życia wyników (BINDING)

```
NONE ──(obliczenia)──→ FRESH ──(zmiana modelu/config)──→ OUTDATED
                         │                                    │
                         └──────── (re-run) ───────────────→ FRESH
```

| Status | Znaczenie |
|--------|-----------|
| `NONE` | Brak obliczeń (po utworzeniu lub klonowaniu) |
| `FRESH` | Wyniki aktualne (obliczone po ostatniej zmianie) |
| `OUTDATED` | Wyniki nieaktualne (model lub config zmieniony) |

### 5.9.4 Reguły immutability (BINDING)

1. **Case NIE mutuje ENM** — Case przechowuje WYŁĄCZNIE konfigurację obliczeń
2. **Zmiana modelu** (nowy snapshot) → status OUTDATED na WSZYSTKICH Case'ach
3. **Zmiana config** → status OUTDATED (jeśli był FRESH)
4. **Clone** → kopiuje config i `network_snapshot_id`, **status=NONE**, **is_active=False**
5. **Jeden aktywny** Case per projekt w danym momencie
6. Case zwraca **nową instancję** przy każdej modyfikacji (frozen dataclass)

---

## 5.10 Modele niedozwolone (Illegal Models) — reguły blokujące (Decyzja #38)

### 5.10.1 Istniejące BLOCKERy (AS-IS)

| Kod | Opis | Krok kreatora | Plik |
|-----|------|--------------|------|
| E001 | Brak Source w modelu | K2 | `validator.py:87` |
| E002 | Brak Bus w modelu | K3 | `validator.py:96` |
| E003 | Graf niespójny (wyspa bez Source) | K4 | `validator.py:142` |
| E004 | Bus z `voltage_kv ≤ 0` | K3 | `validator.py:105` |
| E005 | Branch z impedancją zerową (R=0 AND X=0) | K4 | `validator.py:115` |
| E006 | Transformer z `uk_percent ≤ 0` | K5 | `validator.py:123` |
| E007 | Transformer z `hv_bus == lv_bus` | K5 | `validator.py:131` |
| E008 | Source bez parametrów zwarciowych | K2 | `validator.py:139` |

### 5.10.2 AnalysisAvailability — brama obliczeniowa (AS-IS)

```python
# validator.py:489-512
if has_blockers:
    → SC_3F=False, SC_1F=False, LF=False  (WSZYSTKO zablokowane)

SC_1F = not has_z0_warnings  # Wymaga Z₀ na wszystkich liniach i źródłach
LF = has_loads or has_generators  # Wymaga co najmniej 1 load/generator
SC_3F = True  # Dostępne jeśli brak blockerów
```

### 5.10.3 Modele niedozwolone — konsolidacja systemowa (BINDING)

| Model niedozwolony | Blokada | Walidacja | Status |
|-------------------|---------|-----------|--------|
| Falownik na szynie SN | Kreator + walidacja | E009 (TO-BE) | TO-BE |
| Falownik bez transformatora nn/SN | Kreator + walidacja | E010 (TO-BE) | TO-BE |
| Branch bez Bay | Kreator (TO-BE) | W-BAY-01 (TO-BE) | TO-BE |
| Odbiór bez pola odpływowego | Kreator (TO-BE) | W009 (TO-BE) | TO-BE |
| Override bez śladu audytowego | System | W010 (TO-BE) | TO-BE |
| SLD nieizomorficzne z ENM | System (bijekcja 1:1) | Gwarancja architektoniczna | AS-IS |
| Graf niespójny | Walidacja | E003 (AS-IS) | AS-IS |
| Source brak parametrów | Walidacja | E008 (AS-IS) | AS-IS |
| Transformer hv=lv | Walidacja | E007 (AS-IS) | AS-IS |
| Branch impedancja zerowa | Walidacja | E005 (AS-IS) | AS-IS |

### 5.10.4 Zakaz obejścia (BINDING)

- Walidacja ENM jest **bramą pre-solver** — solver NIE może być uruchomiony przy obecności BLOCKER
- `AnalysisAvailability` jest **deterministyczna** — ten sam ENM → te same dostępne analizy
- Kreator blokuje przejście dalej przy stanach `error` / `blocked`
- **ZAKAZ** wyłączania walidacji, pomijania blockerów, lub uruchamiania solvera na modelu z E-issues

---

## 5.11 Spójność systemu — ENM → Solver → White Box → Raporty

### 5.11.1 Łańcuch deterministyczny (BINDING)

```
ENM (edytowalny)
    │
    ├── Kreator → atomowe akcje → snapshot
    │
    ↓
Resolver (catalog + override + instance)
    │
    ↓
map_enm_to_network_graph() — deterministyczny
    │
    ↓
NetworkGraph (read-only)
    │
    ├── Solver SC (IEC 60909) → ShortCircuitResult (frozen)
    ├── Solver PF (Newton-Raphson) → PowerFlowNewtonSolution (frozen)
    │
    ↓
White Box Trace (immutable)
    │
    ├── TraceArtifact → ProofDocument → ProofStep
    ├── ProtectionTrace → ProtectionTraceStep
    │
    ↓
Raporty (LaTeX, PDF, DOCX, JSON)
```

### 5.11.2 Gwarancje deterministyczne (BINDING)

| Gwarancja | Opis |
|-----------|------|
| Ten sam ENM → ten sam NetworkGraph | `mapping.py` sortuje po `ref_id` |
| Ten sam NetworkGraph → te same wyniki | Solvery są deterministyczne |
| Ten sam wynik → ten sam White Box | Trace jest immutable |
| Ten sam White Box → ten sam raport | Eksport jest deterministyczny |
| Ten sam ENM → ten sam stan kreatora | `computeWizardState()` jest pure function |
| Ten sam ENM → ten sam SLD | Layout jest deterministyczny |

### 5.11.3 White Box — pełny ślad per obiekt (BINDING)

Każdy obiekt ENM uczestniczący w obliczeniach MUSI mieć pełny ślad w White Box:

```
TYP (snapshot parametrów z katalogu, identyfikator typu)
→ OVERRIDE (delta: parametr → wartość, jeśli tryb EKSPERT)
→ PARAMETRY ZMIENNE (z kreatora: długość, tap, P/Q, n_parallel)
→ ILOŚĆ (jeśli dotyczy)
→ MODEL SOLVERA (parametry finalne po resolwerze + mapowaniu)
→ WYNIK OBLICZENIOWY (ikss, ip, ith, napięcia, przepływy)
```

Każdy parametr MUSI być oznaczony: `ParameterSource.TYPE_REF` / `ParameterSource.OVERRIDE` / `ParameterSource.INSTANCE`.

### 5.11.4 Invalidacja wyników (BINDING)

| Zdarzenie | Skutek |
|-----------|--------|
| Zmiana ENM (nowy snapshot) | WSZYSTKIE Case'y → OUTDATED |
| Zmiana StudyCaseConfig | Dany Case → OUTDATED |
| Zmiana ProtectionConfig | Dany Case → OUTDATED (ochrona) |
| Clone Case | Nowy Case → NONE |
| Commit sesji Wizard | `ResultInvalidator` → wszystkie wyniki projektu |

---

## 5.12 Definition of Done — Kontrakty Kanoniczne Systemu

### Kryteria akceptacji (ALL MUST PASS)

| # | Kryterium | Status |
|---|----------|--------|
| 1 | Zasada kompozycji: TYP × parametry zmienne × ilość × override = obiekt ENM | ✅ Dokumentacja (§5.2) |
| 2 | Kreator K1–K10 zdefiniowany z sekwencją, rolą per krok, stanami | ✅ AS-IS (§5.3) |
| 3 | Backend: action-based z sesją, snapshotem, commit/abort | ✅ AS-IS (§5.3.5) |
| 4 | Katalog typów: 9 klas frozen w `types.py`, CatalogRepository | ✅ AS-IS (§5.4) |
| 5 | Frontend: TypePicker + TypeLibraryBrowser + API assign/clear | ✅ AS-IS (§5.4.3) |
| 6 | Resolver: 3-poziomowa precedencja (OVERRIDE > TYPE_REF > INSTANCE) | ✅ AS-IS (§5.2.2) |
| 7 | Falownik = nn, transformator nn/SN obowiązkowy przy integracji z SN | ✅ Dokumentacja (§5.6.1) |
| 8 | Stacja: Substation (ENM) + Station (solver) = logiczne kontenery, brak wpływu na obliczenia | ✅ AS-IS (§5.7) |
| 9 | Stacja oddziałowa: bez Source, zasilanie liniowe, niezależne Bus SN | ✅ Dokumentacja (§5.7.5) |
| 10 | Study Case: config only, NONE→FRESH→OUTDATED, 1 active per project | ✅ AS-IS (§5.9) |
| 11 | BLOCKERy E001-E008: brama pre-solver, AnalysisAvailability | ✅ AS-IS (§5.10) |
| 12 | Modele niedozwolone: konsolidacja systemowa (9 reguł AS-IS + 5 TO-BE) | ✅ Dokumentacja (§5.10.3) |
| 13 | Łańcuch deterministyczny: ENM→Resolver→Mapping→Solver→WhiteBox→Raport | ✅ AS-IS (§5.11) |
| 14 | Invalidacja wyników: zmiana ENM → OUTDATED na wszystkich Case | ✅ AS-IS (§5.11.4) |
| 15 | White Box: pełny ślad per obiekt (TYP→OVERRIDE→PARAMS→SOLVER→WYNIK) | ✅ Dokumentacja (§5.11.3) |

### Zamknięcie domeny

**DOMENA KONTRAKTÓW KANONICZNYCH SYSTEMU W ROZDZIALE 5 JEST ZAMKNIĘTA.**

Sekcje §5.1–§5.12 definiują kompletny kanon kontraktów systemowych MV-DESIGN-PRO na poziomie ETAP/PowerFactory. Dalsze modyfikacje wymagają ADR i wpisu do Macierzy Decyzji (AUDIT §9).

---

**KONIEC ROZDZIAŁU 5**
