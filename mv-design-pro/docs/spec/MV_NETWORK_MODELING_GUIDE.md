# Jak modelować magistralę i odgałęzienia SN

**MV-DESIGN-PRO — PR-9 przewodnik modelowania**
**Status:** INFORMATIONAL
**Warstwa:** Application / UI

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

Zabezpieczenia, przekładniki, nastawy i parametry wprowadzone w PR-9 to
**konfiguracja wejściowa do przyszłych analiz**, nie wynik obliczeniowy.

---

## 2. Zasady modelowania

### 2.1 Tryb STANDARDOWY (domyślny): katalog-only

W trybie standardowym każdy element sieci posiada referencję do katalogu (`catalog_ref`).
Parametry techniczne (elektryczne, znamionowe, nastawy, klasy, krzywe) są
**pobierane z katalogu i wyświetlane jako tylko do odczytu**.

Użytkownik w trybie standardowym:
- wybiera typ z katalogu (`catalog_ref`),
- podaje topologię (szyny od/do, powiązania),
- podaje parametry geometryczne/topologiczne (długość odcinka, stan łącznika),
- podaje ilość identycznych instancji (`quantity` / `n_parallel`),
- **nie wpisuje ręcznie żadnych wartości technicznych** (R′, X′, Sn, uk, nastaw itp.).

### 2.2 Tryb EKSPERT (jawny, kontrolowany): override instancji

Tryb EKSPERT pozwala na nadpisanie **wybranych** parametrów na poziomie instancji
(nie modyfikuje katalogu). Wymagania:

- Tryb EKSPERT nie jest domyślny; wymaga **świadomej aktywacji** przez użytkownika
  i jest wizualnie oznaczony w UI (np. ikoną, kolorem pola).
- Override dotyczy wyłącznie instancji i obejmuje tylko parametry wyraźnie
  dopuszczone przez system — nie „dowolne".
- Każdy override jest:
  - jawnie zapisany jako lista `overrides` (parametr → wartość),
  - oznaczony źródłem `ParameterSource=OVERRIDE`,
  - audytowalny — zapis do śladu/raportu dostępnego w późniejszych analizach.
- Parametry bez override zachowują wartość z `catalog_ref` (`ParameterSource=CATALOG`).

### 2.3 Ilość / sztuki / n_parallel

`quantity` lub `n_parallel` opisuje liczbę identycznych instancji danego typu
katalogowego (mnożnik). Jest to parametr topologiczny, a nie elektryczny.
Użytkownik nie podaje mocy/napięcia/prądów „sumarycznych" — system wyprowadza
wartości zagregowane dopiero w analizach (PF/SC), poza zakresem PR-9.

Przykład zapisu JSON (catalog-first z ilością):
```json
{
  "catalog_ref": "PV_INVERTER_100kW_EN50549",
  "quantity": 5
}
```

### 2.4 Zakaz self-loop (pętla własna)

Żadna gałąź ani element łączeniowy nie może łączyć szyny z tą samą szyną
(`from_bus == to_bus`). Aparatura łączeniowa jest modelowana między dwoma
**różnymi** szynami: `bus_in → device → bus_out`.

### 2.5 Katalog obejmuje wszystkie elementy

W trybie standardowym `catalog_ref` jest wymagany dla:
- linii napowietrznych i kabli,
- transformatorów,
- aparatury łączeniowej (wyłącznik, rozłącznik, bezpiecznik),
- przekładników CT i VT,
- zabezpieczeń,
- generatorów OZE (PV, wiatr) i magazynów energii (BESS),
- odbiorów.

---

## 3. Pojęcia

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

## 4. Krok po kroku: magistrala 3-odcinkowa

Poniższe operacje opisują logiczne kroki modelowania w UI.

### 4.1 Szyny (buses)

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

### 4.2 Wyłącznik na GPZ

Wyłącznik łączy dwie **różne** szyny. Self-loop jest zabroniony.

```
Dodaj gałąź (breaker) × 1
──────────────────────────
brk_1:  bus_gpz_in → bus_gpz  (breaker, catalog_ref="WYL_SN_630A", state=CLOSED)
```

### 4.3 Odcinki magistrali

```
Dodaj gałąź (linia/kabel) × 3
──────────────────────────────
line_1:  bus_gpz → bus_t1   (line_overhead, length_km=3.5, catalog_ref="AFL_120")
line_2:  bus_t1  → bus_t2   (cable,         length_km=1.2, catalog_ref="XRUHAKXS_120")
line_3:  bus_t2  → bus_end  (line_overhead, length_km=4.0, catalog_ref="AFL_120")
```

**Tryb standardowy**: parametry elektryczne (R′, X′, B′, Imax) są pobierane
z katalogu i wyświetlane jako read-only.

**Tryb EKSPERT**: użytkownik może nadpisać wybrane parametry instancji
(np. długość skorygowaną, temperaturę odniesienia). Override jest zapisywany
jako `overrides: [{ param: "length_km", value: 3.7 }]` z `ParameterSource=OVERRIDE`.

### 4.4 Odgałęzienie

```
Dodaj szynę + gałąź
────────────────────
bus_lat_1   (15 kV)  ← koniec odgałęzienia
line_lat:   bus_t2 → bus_lat_1  (cable, length_km=0.8, catalog_ref="XRUHAKXS_70")
```

### 4.5 Stacja transformatorowa SN/nn

```
Dodaj szynę + transformator
───────────────────────────
bus_lv      (0.4 kV)  ← szyna strony nn
tr_1:       hv_bus=bus_end, lv_bus=bus_lv, catalog_ref="TR_630kVA_Dyn11"
```

**Tryb standardowy**: moc znamionowa (Sn), napięcie zwarcia (uk%), straty (Pk, P0),
grupa wektorowa, zaczepy — z katalogu, read-only.

**Tryb EKSPERT**: override wybranych parametrów instancji (np. pozycja zaczepu).

### 4.6 Odbiory i OZE

```
Dodaj odbiór + generator
────────────────────────
load_1:   bus_ref=bus_lv, catalog_ref="ODBIÓR_KOMUNALNY_300kW"
pv_1:     bus_ref=bus_lv, catalog_ref="PV_INVERTER_100kW_EN50549", quantity=3
```

**Tryb standardowy**: P, Q, cos φ, model odbioru, limity generatora — z katalogu.

**Tryb EKSPERT**: override wybranych parametrów (np. P operacyjne, cos φ ustawiony).

Ilość (`quantity=3`) oznacza 3 identyczne instancje falownika PV o parametrach
z katalogu. Moc sumaryczna jest wyprowadzana przez solver (poza zakresem PR-9).

### 4.7 Przekładniki CT i VT

```
Dodaj przekładnik × 2
─────────────────────
ct_1:   bus_ref=bus_gpz, type=CT, catalog_ref="CT_200_5A_5P20"
vt_1:   bus_ref=bus_gpz, type=VT, catalog_ref="VT_15000_100V_05"
```

**Tryb standardowy**: przekładnia, klasa dokładności, obciążenie VA, połączenie — z katalogu.

**Tryb EKSPERT**: override wybranych parametrów instancji (np. obciążenie znamionowe VA).

### 4.8 Zabezpieczenie

```
Dodaj zabezpieczenie
────────────────────
pa_1:   breaker_ref=brk_1, ct_ref=ct_1, catalog_ref="PROT_SEL_751A"
```

**Tryb standardowy**: typ zabezpieczenia, funkcje ochronne, krzywe, nastawy — z katalogu.

**Tryb EKSPERT**: override wybranych nastaw instancji. Każdy override jest
zapisywany z `ParameterSource=OVERRIDE` i audytowany.

Uwaga: PR-9 zapisuje konfigurację zabezpieczeń jako dane wejściowe.
Weryfikacja nastaw (koordynacja, selektywność) następuje w przyszłych analizach.

---

## 5. Topology Summary

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

## 6. Walidacje i ograniczenia

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

## 7. Deterministyczność

Wszystkie operacje topologiczne gwarantują:
- Identyczne wejście → identyczny wynik (JSON-serializable)
- Sortowanie wyników: adjacency po ref_id, spine po depth
- Copy-on-write: oryginalne ENM nie jest mutowane
- Atomowość: batch z rollback w przypadku błędu

---

## 8. Interfejs użytkownika

### 8.1 Panel topologii
- Toolbar z przyciskami: Szyna, Gałąź, Transformator, Odbiór/OZE, Przekładnik, Zabezpieczenie
- Drzewo topologii: podział na spine (magistrala) i laterals (odgałęzienia)
- Kliknięcie węzła → selekcja w SLD (dwukierunkowa synchronizacja)

### 8.2 Modale edycji

Każdy modal obsługuje tryb STANDARDOWY (katalog-only, pola techniczne read-only)
i tryb EKSPERT (jawna aktywacja, override z audytem):

- **NodeModal** — identyfikator, nazwa, napięcie [kV], strefa
- **BranchModal** — typ (7 wariantów), szyny od/do, `catalog_ref`, długość (dla linii/kabli), stan łącznika
- **TransformerStationModal** — szyny HV/LV, `catalog_ref`; parametry z katalogu (read-only) lub override (EKSPERT)
- **LoadDERModal** — szyna, `catalog_ref`, `quantity`; parametry z katalogu (read-only) lub override (EKSPERT)
- **MeasurementModal** — typ CT/VT, szyna, `catalog_ref`; parametry z katalogu (read-only) lub override (EKSPERT)
- **ProtectionModal** — wyłącznik, CT/VT, `catalog_ref`; nastawy z katalogu (read-only) lub override (EKSPERT)

---

## 9. Przekazanie do solverów (handoff)

Model topologiczny i konfiguracja katalogowa (z ewentualnymi override'ami) stanowią
**wejście do analiz PF / SC / Protection** bez semantycznej transformacji.
Parametry techniczne elementów są pobierane z katalogu (`ParameterSource=CATALOG`)
lub z override'u instancji (`ParameterSource=OVERRIDE`).
Ilości (`quantity` / `n_parallel`) i override'y wpływają na wejście do analiz
dopiero na etapie ich uruchomienia, poza zakresem PR-9.
