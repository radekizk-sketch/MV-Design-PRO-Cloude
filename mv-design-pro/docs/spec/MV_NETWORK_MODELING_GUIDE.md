# Jak modelować magistralę i odgałęzienia SN

**MV-DESIGN-PRO — PR-9 przewodnik modelowania**
**Status:** INFORMATIONAL
**Warstwa:** Application / UI

---

> **ZASADA KANONICZNA — CATALOG-FIRST**
>
> MV-DESIGN-PRO działa w trybie **CATALOG-FIRST**.
> Żaden parametr elektryczny NIE JEST edytowalny ręcznie w trybie standardowym.
> Wszystkie parametry techniczne pochodzą z katalogów typów.
> Przepływ danych: **TYPE (katalog) → INSTANCE (ilość, lokalizacja, status) → SOLVER INPUT**.

---

## 1. Wstęp

Niniejszy dokument opisuje sposób modelowania typowej sieci SN w MV-DESIGN-PRO:
magistrala (trunk/spine), odgałęzienia (laterals), stacje transformatorowe SN/nn,
aparatura łączeniowa, przekładniki pomiarowe, zabezpieczenia, odbiory i źródła OZE/BESS.

### 1.1 Konwencja opisu operacji

Operacje opisane w tym dokumencie (np. „dodaj szynę", „dodaj gałąź") są **pojęciowe** —
odpowiadają transakcyjnym akcjom w interfejsie użytkownika (UI).
Nie stanowią one kontraktu API, nie definiują nazw endpointów i nie gwarantują
sygnatury żadnej funkcji backendowej. Faktyczny interfejs programistyczny
może się różnić od opisów w guide.

### 1.2 Zakres PR-9 (Czego PR-9 nie robi)

PR-9 umożliwia zapisanie **topologii sieci** i **konfiguracji katalogowej** (oraz
ewentualnych override'ów eksperckich). PR-9 **nie wykonuje żadnych obliczeń**:

- nie liczy rozpływu mocy (PF),
- nie liczy zwarć (SC / IEC 60909),
- nie wykonuje koordynacji zabezpieczeń,
- nie wyprowadza nastaw zabezpieczeń,
- nie weryfikuje nastaw prądowo-czasowo,
- nie „zgaduje" ani nie interpoluje parametrów technicznych.

Zabezpieczenia, przekładniki i pozostałe elementy wprowadzone w PR-9 to
**konfiguracja wejściowa do przyszłych analiz**, nie wynik obliczeniowy.

---

## 2. TYPE vs INSTANCE

### 2.1 TYPE (Katalog typów)

Katalog typów zawiera **100% parametrów technicznych** każdego elementu.
Typy są wersjonowane i fingerprintowane (hash integralności).

Kategorie katalogowe:

| Kategoria katalogu | Przykładowe identyfikatory |
|---|---|
| LineType | `AFL_120`, `AFL_70` |
| CableType | `XRUHAKXS_120`, `XRUHAKXS_70` |
| TransformerType | `TRANS_SN_630kVA_15_0p4_Dyn11` |
| BreakerType | `WYL_SN_630A` |
| DisconnectorType | `ROZL_SN_400A` |
| FuseType | `BEZ_SN_63A` |
| CTType | `CT_200_5_5P20_15VA` |
| VTType | `VT_15000_100_05` |
| ProtectionType | `PROT_SEL_751A` |
| GeneratorType (OZE) | `PV_INV_100kW`, `BESS_250kWh` |
| LoadType | `LOAD_KOMUNALNY_300kW` |

Użytkownik **nie edytuje** parametrów w katalogu typów w ramach PR-9.
Parametry techniczne w katalogu są dostępne wyłącznie do podglądu.

### 2.2 INSTANCE (Element w modelu ENM)

Instancja to konkretne wystąpienie typu katalogowego w topologii sieci.
Instancja zawiera:

- `catalog_ref` — referencja do typu katalogowego (obowiązkowa),
- `quantity` / `n_parallel` — liczba identycznych egzemplarzy (mnożnik),
- topologię — szyny od/do, powiązania z innymi instancjami,
- status — `OPEN` / `CLOSED` / `IN_SERVICE`,
- `overrides[]` — **wyłącznie w trybie EKSPERT** (patrz §3.2).

Instancja **nie zawiera** parametrów technicznych — dziedziczy je z katalogu.

---

## 3. Tryby pracy

### 3.1 Tryb STANDARDOWY (domyślny)

W trybie standardowym użytkownik:
- wybiera typ z katalogu (`catalog_ref`),
- podaje topologię (szyny od/do, powiązania),
- podaje parametry geometryczne (długość odcinka) i status (stan łącznika),
- podaje ilość identycznych instancji (`quantity` / `n_parallel`),
- **nie wpisuje ręcznie żadnych wartości technicznych**.

Pola techniczne w UI są **READ-ONLY** — wyświetlają wartości pobrane z katalogu.

### 3.2 Tryb EKSPERT (opt-in, audytowany)

Tryb EKSPERT pozwala na nadpisanie **wybranych** parametrów na poziomie instancji
(nie modyfikuje katalogu). Wymagania:

- Tryb EKSPERT nie jest domyślny; wymaga **świadomej aktywacji** przez użytkownika
  i jest wizualnie oznaczony w UI (ikona, kolor pola).
- Override dotyczy wyłącznie instancji i obejmuje tylko parametry wyraźnie
  dopuszczone przez system — nie „dowolne".
- Każdy override jest:
  - jawnie zapisany jako lista `overrides` (parametr → wartość),
  - oznaczony źródłem `ParameterSource=OVERRIDE`,
  - audytowalny — zapis do śladu/raportu dostępnego w późniejszych analizach,
  - widoczny w SLD, Inspector i raportach.
- Parametry bez override zachowują wartość z `catalog_ref` (`ParameterSource=CATALOG`).
- Brak override → pełne dziedziczenie z katalogu.

### 3.3 Ilość / sztuki / n_parallel

`quantity` lub `n_parallel` opisuje liczbę identycznych instancji danego typu
katalogowego (mnożnik). Jest to parametr topologiczny, a nie elektryczny.
Użytkownik nie podaje wartości „sumarycznych" — system wyprowadza
agregaty dopiero w analizach (PF/SC), poza zakresem PR-9.

### 3.4 Zakaz self-loop (pętla własna)

Żadna gałąź ani element łączeniowy nie może łączyć szyny z tą samą szyną
(`from_bus == to_bus`). Aparatura łączeniowa jest modelowana między dwoma
**różnymi** szynami: `bus_in → device → bus_out`.

---

## 4. Pojęcia

| Pojęcie | Opis | ENM |
|---------|------|-----|
| Magistrala (spine) | Ciąg odcinków linii/kabli od GPZ do końca linii | Sekwencja Branch (line/cable) + Bus |
| Odgałęzienie (lateral) | Linia odchodząca od magistrali | Branch + Bus dołączony do węzła T |
| Węzeł T (T-node) | Punkt rozgałęzienia magistrali | Bus z ≥3 gałęziami |
| Stacja SN/nn | Transformator + szyny HV/LV | Transformer + 2×Bus |
| Punkt rozłącznikowy | Rozłącznik/wyłącznik na magistrali | Branch type=disconnector/breaker |
| Przekładnik CT | Przekładnik prądowy przy wyłączniku | Measurement type=CT |
| Przekładnik VT | Przekładnik napięciowy | Measurement type=VT |
| Zabezpieczenie | Konfiguracja zabezpieczenia przypisana do wyłącznika | ProtectionAssignment |

---

## 5. Krok po kroku: magistrala 3-odcinkowa

Poniższe operacje opisują logiczne kroki modelowania w UI.
Każdy element wskazuje `catalog_ref` — parametry techniczne nie są wprowadzane ręcznie.

### 5.1 Szyny (buses)

Dodaj 5 szyn — topologia wymaga osobnej szyny wewnętrznej GPZ dla wyłącznika:

```
Dodaj szyny × 5
────────────────
bus_gpz_in  (15 kV)  ← szyna wewnętrzna GPZ (przed wyłącznikiem)
bus_gpz     (15 kV)  ← szyna GPZ (za wyłącznikiem, początek magistrali)
bus_t1      (15 kV)  ← punkt na magistrali
bus_t2      (15 kV)  ← punkt rozgałęzienia (T-node)
bus_end     (15 kV)  ← koniec magistrali
```

### 5.2 Wyłącznik na GPZ

Wyłącznik łączy dwie **różne** szyny. Self-loop jest zabroniony.

```
Dodaj gałąź (breaker) × 1
──────────────────────────
brk_1:  bus_gpz_in → bus_gpz  (breaker, catalog_ref="WYL_SN_630A", state=CLOSED)
```

### 5.3 Odcinki magistrali

```
Dodaj gałąź (linia/kabel) × 3
──────────────────────────────
line_1:  bus_gpz → bus_t1   (line_overhead, length_km=3.5, catalog_ref="AFL_120")
line_2:  bus_t1  → bus_t2   (cable,         length_km=1.2, catalog_ref="XRUHAKXS_120")
line_3:  bus_t2  → bus_end  (line_overhead, length_km=4.0, catalog_ref="AFL_120")
```

Parametry techniczne odcinka są pobierane z katalogu i wyświetlane jako podgląd (READ-ONLY).
Użytkownik podaje wyłącznie: typ gałęzi, szyny od/do, `catalog_ref`, długość odcinka.

### 5.4 Odgałęzienie

```
Dodaj szynę + gałąź
────────────────────
bus_lat_1   (15 kV)  ← koniec odgałęzienia
line_lat:   bus_t2 → bus_lat_1  (cable, length_km=0.8, catalog_ref="XRUHAKXS_70")
```

### 5.5 Stacja transformatorowa SN/nn

```
Dodaj szynę + transformator
───────────────────────────
bus_lv  (0.4 kV)  ← szyna strony nn
tr_1:   hv_bus=bus_end, lv_bus=bus_lv, catalog_ref="TRANS_SN_630kVA_15_0p4_Dyn11"
```

Użytkownik podaje: szyny HV/LV, `catalog_ref`, `quantity`.
Parametry techniczne transformatora są wyświetlane jako podgląd (READ-ONLY).

Zapis JSON:
```json
{
  "type": "transformer",
  "catalog_ref": "TRANS_SN_630kVA_15_0p4_Dyn11",
  "hv_bus_ref": "bus_end",
  "lv_bus_ref": "bus_lv",
  "quantity": 1
}
```

### 5.6 Odbiory i OZE

```
Dodaj odbiór + generator
────────────────────────
load_1:   bus_ref=bus_lv, catalog_ref="LOAD_KOMUNALNY_300kW"
pv_1:     bus_ref=bus_lv, catalog_ref="PV_INV_100kW", quantity=3
```

Użytkownik podaje: szynę, `catalog_ref`, `quantity`.
Parametry techniczne są wyświetlane jako podgląd (READ-ONLY).

Zapis JSON (OZE z ilością):
```json
{
  "type": "generator",
  "catalog_ref": "PV_INV_100kW",
  "bus_ref": "bus_lv",
  "quantity": 3
}
```

Ilość (`quantity=3`) oznacza 3 identyczne instancje o parametrach z katalogu.

### 5.7 Przekładniki CT i VT

```
Dodaj przekładnik × 2
─────────────────────
ct_1:   bus_ref=bus_gpz, type=CT, catalog_ref="CT_200_5_5P20_15VA"
vt_1:   bus_ref=bus_gpz, type=VT, catalog_ref="VT_15000_100_05"
```

Użytkownik podaje: typ (CT/VT), szynę, `catalog_ref`.
Parametry techniczne przekładnika są wyświetlane jako podgląd (READ-ONLY).

Zapis JSON:
```json
{
  "type": "measurement",
  "measurement_type": "CT",
  "catalog_ref": "CT_200_5_5P20_15VA",
  "bus_ref": "bus_gpz"
}
```

### 5.8 Zabezpieczenie

```
Dodaj zabezpieczenie
────────────────────
pa_1:   breaker_ref=brk_1, ct_ref=ct_1, catalog_ref="PROT_SEL_751A"
```

Użytkownik podaje: `catalog_ref`, przypisanie do wyłącznika, powiązanie z CT/VT.
Parametry techniczne zabezpieczenia są wyświetlane jako podgląd (READ-ONLY).

PR-9 zapisuje konfigurację zabezpieczeń jako dane wejściowe.
Weryfikacja nastaw (koordynacja, selektywność) następuje w przyszłych analizach.

---

## 6. Topology Summary

Po zbudowaniu modelu system oblicza deterministyczne podsumowanie topologii:

```json
{
  "spine": [
    {"ref_id": "bus_gpz", "depth": 0, "is_source": true},
    {"ref_id": "bus_t1",  "depth": 1, "is_source": false},
    {"ref_id": "bus_t2",  "depth": 2, "is_source": false},
    {"ref_id": "bus_end", "depth": 3, "is_source": false}
  ],
  "laterals": ["bus_lat_1", "bus_lv"],
  "is_radial": true
}
```

Spine jest wyznaczany algorytmem BFS od szyn źródłowych (source).
Laterals to szyny poza magistralą, połączone z nią gałęziami.

---

## 7. Walidacje i ograniczenia

| Reguła | Opis |
|--------|------|
| Zakaz pętli własnej | Gałąź nie może łączyć szyny z tą samą szyną |
| CT wymagany | Zabezpieczenia nadprądowe / ziemnozwarciowe / kierunkowe wymagają CT |
| Wyłącznik wymagany | Zabezpieczenie wymaga wyłącznika (nie rozłącznika ani bezpiecznika) |
| Brak duplikatów | Jeden wyłącznik = maksymalnie jedno zabezpieczenie |
| Kaskada usuwania | Nie można usunąć wyłącznika z aktywnym zabezpieczeniem |
| CT w użyciu | Nie można usunąć CT przypisanego do zabezpieczenia |
| Sieć promieniowa | Ostrzeżenie przy wykryciu cyklu w topologii |

---

## 8. Deterministyczność

Wszystkie operacje topologiczne gwarantują:
- Identyczne wejście → identyczny wynik (JSON-serializable)
- Sortowanie wyników: adjacency po ref_id, spine po depth
- Copy-on-write: oryginalne ENM nie jest mutowane
- Atomowość: batch z rollback w przypadku błędu

---

## 9. Interfejs użytkownika

### 9.1 Panel topologii
- Toolbar z przyciskami: Szyna, Gałąź, Transformator, Odbiór/OZE, Przekładnik, Zabezpieczenie
- Drzewo topologii: podział na spine (magistrala) i laterals (odgałęzienia)
- Kliknięcie węzła → selekcja w SLD (dwukierunkowa synchronizacja)

### 9.2 Modale edycji

Każdy modal obsługuje tryb STANDARDOWY (katalog-only, pola techniczne READ-ONLY)
i tryb EKSPERT (jawna aktywacja, override z audytem).

- **NodeModal** — identyfikator, nazwa, napięcie nominalne (z siatki napięciowej sieci), strefa
- **BranchModal** — typ gałęzi, szyny od/do, `catalog_ref`, długość odcinka (linie/kable), stan łącznika; podgląd parametrów z katalogu (READ-ONLY)
- **TransformerStationModal** — szyny HV/LV, `catalog_ref`, `quantity`; podgląd parametrów z katalogu (READ-ONLY)
- **LoadDERModal** — szyna, `catalog_ref`, `quantity`; podgląd parametrów z katalogu (READ-ONLY)
- **MeasurementModal** — typ CT/VT, szyna, `catalog_ref`; podgląd parametrów z katalogu (READ-ONLY)
- **ProtectionModal** — `catalog_ref`, przypisanie do wyłącznika, powiązanie CT/VT; podgląd nastaw z katalogu (READ-ONLY); w trybie EKSPERT: override wybranych nastaw instancji z audytem

---

## 10. Zakaz interpretacji

Dokument nie może być interpretowany jako sugerujący:
- ręczne „dobieranie parametrów" technicznych,
- zgadywanie lub interpolowanie wartości,
- wpisywanie danych liczbowych w polach technicznych.

Jeśli parametr ma wartość w instancji, **musi** pochodzić z katalogu (`ParameterSource=CATALOG`)
albo z jawnego override w trybie EKSPERT (`ParameterSource=OVERRIDE`).

---

## 11. Przekazanie do solverów (handoff)

Model topologiczny i konfiguracja katalogowa (z ewentualnymi override'ami) stanowią
**wejście do analiz PF / SC / Protection** bez semantycznej transformacji.
Parametry techniczne elementów są pobierane z katalogu (`ParameterSource=CATALOG`)
lub z override'u instancji (`ParameterSource=OVERRIDE`).
Ilości (`quantity` / `n_parallel`) i override'y wpływają na wejście do analiz
dopiero na etapie ich uruchomienia, poza zakresem PR-9.
