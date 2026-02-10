# Jak modelować magistralę i odgałęzienia SN

**MV-DESIGN-PRO — PR-9 przewodnik modelowania**
**Status:** INFORMATIONAL
**Warstwa:** Application / UI

---

## 1. Wstęp

Niniejszy dokument opisuje sposób modelowania typowej sieci SN w MV-DESIGN-PRO:
magistrala (trunk/spine), odgałęzienia (laterals), stacje transformatorowe SN/nn,
aparatura łączeniowa, przekładniki pomiarowe i zabezpieczenia.

## 2. Pojęcia

| Pojęcie | Opis | ENM |
|---------|------|-----|
| Magistrala (spine) | Ciąg odcinków linii/kabli od GPZ do końca linii | Sekwencja Branch (line/cable) + Bus |
| Odgałęzienie (lateral) | Linia odchodząca od magistrali | Branch + Bus dołączony do Junction |
| Węzeł T (T-node) | Punkt rozgałęzienia magistrali | Bus z ≥3 gałęziami |
| Stacja SN/nn | Transformator + szyny HV/LV | Transformer + 2×Bus |
| Punkt rozłącznikowy | Rozłącznik/wyłącznik na magistrali | Branch type=disconnector/breaker |
| Przekładnik CT | Przekładnik prądowy przy wyłączniku | Measurement type=CT |
| Zabezpieczenie | Przypisanie zabezpieczenia do wyłącznika | ProtectionAssignment |

## 3. Krok po kroku: magistrala 3-odcinkowa

### 3.1 Szyny (buses)

```
Operacja: create_node × 4
─────────────────────────
bus_gpz    (15 kV)  ← szyna GPZ
bus_t1     (15 kV)  ← punkt na magistrali
bus_t2     (15 kV)  ← punkt rozgałęzienia (T-node)
bus_end    (15 kV)  ← koniec magistrali
```

### 3.2 Odcinki linii

```
Operacja: create_branch × 3
────────────────────────────
line_1:  bus_gpz → bus_t1   (line_overhead, 3.5 km, R'=0.2, X'=0.4)
line_2:  bus_t1  → bus_t2   (cable,         1.2 km, R'=0.12, X'=0.08)
line_3:  bus_t2  → bus_end  (line_overhead, 4.0 km, R'=0.2, X'=0.4)
```

### 3.3 Wyłącznik na GPZ

```
Operacja: create_branch × 1
────────────────────────────
brk_1:  bus_gpz → bus_gpz  (breaker, status=closed)
  Uwaga: wyłącznik na początku magistrali
  W praktyce: dodaj osobną szynę bus_gpz_in → brk → bus_gpz
```

### 3.4 Odgałęzienie

```
Operacja: create_node + create_branch
──────────────────────────────────────
bus_lat_1  (15 kV)  ← koniec odgałęzienia
line_lat:  bus_t2 → bus_lat_1  (cable, 0.8 km)
```

### 3.5 Stacja transformatorowa

```
Operacja: create_node + create_device(transformer)
───────────────────────────────────────────────────
bus_lv     (0.4 kV) ← szyna strony nn
tr_1:      hv=bus_end, lv=bus_lv, Sn=0.63 MVA, uk=6%, Dyn11
```

### 3.6 Odbiory i OZE

```
Operacja: create_device(load) + create_device(generator)
────────────────────────────────────────────────────────
load_1:   bus_lv, P=0.3 MW, Q=0.1 Mvar, model=PQ
pv_1:     bus_lv, P=0.1 MW, gen_type=pv_inverter
```

### 3.7 Przekładnik CT i zabezpieczenie

```
Operacja: create_measurement + attach_protection
─────────────────────────────────────────────────
ct_1:     bus_gpz, CT, 200/5 A, 5P20, 15 VA
pa_1:     breaker=brk_1, ct=ct_1, overcurrent
          settings: [50: 1000A/0s/DT, 51: 200A/0.5s/IEC_SI]
```

## 4. Topology Summary

Po wykonaniu powyższych operacji, `compute_topology_summary` zwraca:

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

## 5. Walidacje i ograniczenia

| Reguła | Kod błędu | Opis |
|--------|-----------|------|
| CT wymagany | OP_CT_REQUIRED | Overcurrent/earth_fault/directional wymaga CT |
| Wyłącznik wymagany | OP_BREAKER_NOT_FOUND | Zabezpieczenie wymaga wyłącznika (nie rozłącznika) |
| Brak duplikatów | OP_BREAKER_HAS_PROTECTION | Jeden wyłącznik = jedno zabezpieczenie |
| Kaskada usuwania | OP_HAS_PROTECTION | Nie można usunąć wyłącznika z zabezpieczeniem |
| CT w użyciu | OP_CT_IN_USE | Nie można usunąć CT przypisanego do zabezpieczenia |
| Sieć promieniowa | OP_CYCLE_WARNING | Ostrzeżenie (WARNING) przy wykryciu cyklu |
| Pętla własna | OP_SELF_LOOP | Gałąź nie może łączyć szyny samej z sobą |

## 6. Deterministyczność

Wszystkie operacje topologiczne gwarantują:
- Identyczne wejście → identyczny wynik (JSON-serializable)
- Sortowanie wyników: adjacency po ref_id, spine po depth
- Copy-on-write: oryginalne ENM nie jest mutowane
- Atomowość: batch z rollback w przypadku błędu

## 7. Interfejs użytkownika

### Panel topologii
- Toolbar z przyciskami: Szyna, Gałąź, Transformator, Odbiór/OZE, Przekładnik, Zabezpieczenie
- Drzewo topologii: podział na spine (magistrala) i laterals (odgałęzienia)
- Kliknięcie węzła → selekcja w SLD (dwukierunkowa synchronizacja)

### Modale edycji
- **NodeModal** — identyfikator, nazwa, napięcie [kV], strefa
- **BranchModal** — typ (7 wariantów), parametry zależne od typu, szyny od/do
- **TransformerStationModal** — parametry Sn/Uhv/Ulv/uk/Pk, grupa wektorowa, zaczepy
- **LoadDERModal** — P/Q, model odbioru lub typ generatora z limitami
- **MeasurementModal** — typ CT/VT, przekładnia, klasa dokładności, obciążenie
- **ProtectionModal** — typ zabezpieczenia, wyłącznik, CT, VT, nastawy (lista)
