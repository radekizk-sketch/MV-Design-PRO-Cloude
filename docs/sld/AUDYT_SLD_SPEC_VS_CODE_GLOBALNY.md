# AUDYT SLD — SPECYFIKACJA VS KOD (GLOBALNY)

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY

---

## 1. ARCHITEKTURA SLD — STAN OBECNY

### Pipeline (poprawny, deterministyczny)

```
TopologyInputV1 (ENM lub SLD symbols)
  | topologyAdapterV2.ts
VisualGraphV1 (nodes + edges + segmentation)
  + StationBlockDetails (pola/urzadzenia/embedding)
  + VisualTopologyContract (trunk/branch/station binding)
  + ExtendedLogicalViews (ordered stations per trunk/branch)
  | layoutPipeline.ts (6-fazowy)
LayoutResultV1 (pozycje + routing + hash)
  | Renderery SVG
TrunkSpineRenderer / StationFieldRenderer / BranchRenderer / EtapSymbolRenderer
```

### Ocena pipeline

| Komponent | Ocena | Uwagi |
|-----------|-------|-------|
| TopologyInputReader | OK | Kanoniczny, deterministyczny, z FixActions |
| TopologyAdapterV2 | OK | BFS deterministyczny, brak heurystyk |
| StationBlockBuilder | OK | Formalna derivacja ról, deterministyczny |
| LayoutPipeline | OK | 6-fazowy, determinizm, kolizje Y-only |
| VisualGraph contract | OK | Zamroznony V1, walidacja, hash |
| TrunkSpineRenderer | SREDNI | Poprawny, ale monolityczny |
| StationFieldRenderer | SREDNI | Poprawny, ale nie rozróznia typów stacji formalnie |
| BranchRenderer | SREDNI | IEC CB poprawiony, L-shape lokalna |
| EtapSymbolRenderer | OK | IEC 60617, kanoniczny |
| sldEtapStyle | DO PODZIALU | 1939 linii — za duze |

---

## 2. LUKI KRYTYCZNE (T1)

| ID | Opis | Lokalizacja | Spec | Kod | Status |
|----|------|-------------|------|-----|--------|
| T1.1 | Stacja przelotowa bez jawnego kontraktu IN->OUT | StationFieldRenderer | SLD_TYPY_STACJI_KANONICZNE.md | Brak kontraktu | LUKA KRYTYCZNA |
| T1.2 | Punkt odgalezienia nie jest jawnym bytem | topologyAdapterV2 | SPEC_ONTOLOGIA | Inferowany z BFS | LUKA WAZNA |
| T1.3 | Stacja sekcyjna — logika sekcji ukryta | stationBlockBuilder | SLD_TYPY_STACJI_KANONICZNE.md | Brak walidacji 2-sekcyjnosci | LUKA WAZNA |
| T1.4 | NOP moze nie trafic na ring | topologyAdapterV2 | SPEC_MODEL_OGOLNY | Brak walidacji | LUKA PORZADKOWA |
| T1.5 | OUT nie tworzy dalszej magistrali — brak kontraktu | StationFieldRenderer | SLD_STACJA_PRZELOTOWA_KONTRAKT | Brak kontraktu | LUKA KRYTYCZNA |
| A1.1 | Brak SldSemanticModel — 4 osobne obiekty | AdapterResultV1 | SPEC_KONTRAKTY_SYSTEMOWE | 4 obiekty | LUKA KRYTYCZNA |

---

## 3. LUKI GEOMETRYCZNE (G1)

| ID | Opis | Spec | Kod | Status |
|----|------|------|-----|--------|
| G1.1 | Os magistrali | SLD_GEOMETRIA_KANONICZNA GK01 | layoutPipeline.phase2 | OK |
| G1.2 | Odgalezienia w bok | SLD_GEOMETRIA_KANONICZNA GK03 | BranchRenderer L-shape | OK |
| G1.3 | Ring w osobnym kanale | SLD_GEOMETRIA_KANONICZNA GK06 | SECONDARY_CONNECTOR routing | CZESCIOWE |
| G1.4 | Kolizje etykiet | SLD_GEOMETRIA_KANONICZNA GK07 | phase5, .sld-param-box | CZESCIOWE |
| G1.5 | Determinizm | SLD_GEOMETRIA_KANONICZNA GK09 | SHA-256 fingerprint | OK |

---

## 4. LUKI ARCHITEKTONICZNE (A1)

| ID | Opis | Spec | Kod | Status |
|----|------|------|-----|--------|
| A1.1 | SldSemanticModel | SPEC_KONTRAKTY_SYSTEMOWE | Brak — 4 obiekty | LUKA KRYTYCZNA |
| A1.2 | Stary topologyAdapter.ts V1 | SLD_REPO_HYGIENE | Istnieje obok V2 | DO USUNIECIA |
| A1.3 | sldEtapStyle za duzy | SLD_REPO_HYGIENE | 1939 linii | DO PODZIALU |
| A1.4 | Renderery nie rozrózniaja typów formalnie | SLD_TYPY_STACJI | Inferowany typ | LUKA WAZNA |

---

## 5. TESTY — POKRYCIE SPEC VS KOD

| Spec | Reguła | Test | Status |
|------|--------|------|--------|
| SLD_TYPY_STACJI TOP01 | Inline has IN+OUT | stationContracts.test.ts | BRAK |
| SLD_TYPY_STACJI TOP02 | IN != OUT segment | stationContracts.test.ts | BRAK |
| SLD_TYPY_STACJI TOP03 | No bypass | stationContracts.test.ts | BRAK |
| SLD_TYPY_STACJI TOP04 | OUT continues trunk | stationContracts.test.ts | BRAK |
| SLD_TYPY_STACJI TOP05 | Branch no main | stationContracts.test.ts | BRAK |
| SLD_TYPY_STACJI TOP06 | Sectional 2 sections | stationContracts.test.ts | BRAK |
| SLD_TYPY_STACJI TOP07 | Terminal no OUT | stationContracts.test.ts | BRAK |
| SLD_GEOMETRIA GK01 | Dominant trunk axis | layoutPipeline.test.ts | OK |
| SLD_GEOMETRIA GK03 | Branch L-shape | layoutPipeline.test.ts | OK |
| SLD_GEOMETRIA GK06 | Ring separate channel | - | BRAK |
| SLD_GEOMETRIA GK07 | Label collision | - | BRAK |
| SLD_GEOMETRIA GK09 | Determinism | determinism.test.ts | OK |
| SPEC_KONTRAKTY SV01 | Inline IN+OUT validation | sldSemanticValidator.test.ts | BRAK |
| SPEC_KONTRAKTY SV04 | Sectional tie validation | sldSemanticValidator.test.ts | BRAK |
| SPEC_KONTRAKTY SV05 | Terminal no OUT validation | sldSemanticValidator.test.ts | BRAK |

---

## 6. REKOMENDACJE — KOLEJNOSC WDRAZANIA

### Priorytet 1 (Zamkniecie luk krytycznych)
1. Zdefiniowac SldSemanticModelV1 (plik typów)
2. Zbudowac adapter buildSldSemanticModel()
3. Zbudowac walidator validateSldSemanticModel()
4. Testy kontraktów stacji (TOP01-TOP07)
5. Testy walidacji (VAL01-VAL10)

### Priorytet 2 (Czyszczenie i konsolidacja)
6. Usunac stary topologyAdapter.ts V1
7. Podzielic sldEtapStyle.ts
8. Skonsolidowac stale geometryczne
9. Skanonizowac dokumentacje (usunac stare pliki)

### Priorytet 3 (Testy uzupelniajace)
10. Zlote uklady (GOLD01-GOLD07)
11. Regresje (REG01-REG07)
12. Ring w osobnym kanale (GEO03)
13. Kolizje etykiet (GEO04)
