# AUDYT GLOBALNY MV-DESIGN-PRO — MODEL OGOLNY SIECI TERENOWEJ SN

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY
**Autor:** Zespol architektow systemowych

---

## 1. ODPOWIEDZ BINARNA

**NIE** — obecna architektura MV-DESIGN-PRO NIE jest w pelni zdolna do zbudowania, zwalidowania, policzenia i wyrenderowania **dowolnej** praktycznej prawdziwej sieci terenowej SN mieszcsacej sie w domenie produktu.

System ma solidne fundamenty obliczeniowe (4 solvery WHITE BOX, 8+ proof packów, determinizm) i dobrze zaprojektowany pipeline SLD (6-fazowy, deterministyczny). Jednak **model domenowy jest zbyt plaski** — kluczowe pojecia (typ stacji, pola, segmentacja magistrali, punkt odgalezienia) sa wyprowadzane ad hoc w frontendzie zamiast byc jawnie modelowane w backendzie.

**Gdzie system dziala poprawnie:**
- Obliczenia IEC 60909, Newton-Raphson, Gauss-Seidel, Fast Decoupled
- Pipeline SLD: TopologyInputReader -> TopologyAdapterV2 -> LayoutPipeline -> Renderery
- Segmentacja BFS trunk/branch/secondary (deterministyczna)
- 7 scenariuszy referencyjnych (leaf, pass, branch, ring, multi, terrain, sectional)
- Determinizm SLD (100x powtorzalnosc, 50x permutacja)
- Proof Engine (8+ proof packów)
- ENM v1.0 (EnergyNetworkModel)

**Gdzie system zawodzi:**
- Model domenowy nie niesie semantyki typów stacji
- Brak modelu pól (bay) w backendzie
- Segmentacja magistrali istnieje WYLACZNIE w frontendzie
- Snapshot nie serializuje stacji
- Rozjazd miedzy modelem obliczeniowym a renderujacym
- Brak jawnego SldSemanticModel — 4 osobne obiekty zamiast jednego

---

## 2. LUKI KRYTYCZNE

### K1. Brak jawnej typologii stacji w modelu domenowym (backend)

**Plik:** `backend/src/network_model/core/station.py`
**Problem:** `StationType` ma tylko 4 wartosci: `GPZ`, `RPZ`, `TRAFO`, `SWITCHING`.
Brak rozroznienia na:
- stacja przelotowa (inline) — na torze glównym, wejscie + wyjscie magistrali
- stacja odgalezna (branch) — na odgalezieniu od magistrali
- stacja sekcyjna (sectional) — 2+ szyny, sprzeglo, NOP
- stacja koncowa (terminal) — koniec toru, brak wyjscia
- stacja OZE/BESS/klaster — z polami generatorowymi

**Konsekwencja:** Typ stacji jest wyprowadzany w **frontendzie** (stationBlockBuilder.ts:deriveEmbeddingRole) z topologii grafu. Model domenowy nie niesie tej semantyki. Backend nie moze walidowac ani raportowac typów stacji.

**Lokalizacja problemu:**
- Backend `station.py` — brak StationTopologyKind
- Frontend `stationBlockBuilder.ts:deriveEmbeddingRole()` linia ~86-165 — tam jest logika derivacji
- Frontend `topologyAdapterV2.ts:classifyStationType()` linia ~113-156 — typ A/B/C/D

### K2. Brak modelu pól (bay) w backendzie

**Problem:** W backendzie `Station` to plaski kontener z listami `bus_ids`, `branch_ids`, `switch_ids`. Brak jawnego pojecia **pola** (bay): pole liniowe IN, pole liniowe OUT, pole transformatorowe, pole odgalezieniowe, pole sprzegla, pole OZE.

**Gdzie istnieje:** Pola budowane sa wylacznie w frontendzie (`stationBlockBuilder.ts:buildFieldsForStation`) na podstawie topologii. To oznacza, ze:
- Backend nie zna struktury pól stacji
- Snapshot nie niesie informacji o polach
- Obliczenia i SLD moga miec rózne rozumienie struktury stacji

**Wplyw na aksjomat modelu ogólnego:** Dowolna praktyczna siec terenowa SN ma stacje z konkretnymi polami (liniowe, transformatorowe, sprzeglowe, pomiarowe). Bez jawnego modelu pól w backendzie, system nie moze:
- Walidowac kompletnosci pól per typ stacji
- Raportowac struktury stacji w wynikach
- Zagwarantowac zgodnosci miedzy SLD a modelem obliczeniowym

### K3. Brak segmentacji magistrali w modelu domenowym

**Problem:** Model `NetworkGraph` traktuje wszystkie galezi jednakowo. Pojecie "magistrali glównej" (trunk) vs "odgalezienia" (branch) vs "polaczenia rezerwowego" (secondary) istnieje WYLACZNIE w frontendowym `topologyAdapterV2.ts:segmentTopology()`.

**Lokalizacja:**
- `topologyAdapterV2.ts` linia ~272-413 — cala segmentacja trunk/branch/secondary
- `topologyInputReader.ts` — budowanie logicalViews z ENM

**Konsekwencja:** Backend nie moze:
- Walidowac, czy stacja przelotowa jest naprawde na torze glównym
- Raportowac segmentacji magistrali w wynikach obliczen
- Weryfikowac, czy NOP jest na wlasciwym polaczeniu
- Weryfikowac, ze punkt odgalezienia ma >= 3 incydentne krawedzie aktywne

### K4. Brak modelu punktu odgalezienia w backendzie

**Problem:** Punkt odgalezienia (junction point) nie jest jawnym bytem w modelu. Jest wyprowadzany w frontendzie z topologii grafu (wezly z degree >= 3 po BFS). Backend nie wie, ze dany wezel jest rozwidleniem magistrali.

**Wplyw:** Brak walidacji, ze punkt odgalezienia:
- Lezy na torze glównym (trunk)
- Ma >=3 incydentne krawedzie aktywne
- Nie jest wezlem stacyjnym (stacja odgalezna to cos innego niz junction)

### K5. Rozjazd miedzy modelem obliczeniowym a renderujacym

**Problem:** Solvery operuja na `NetworkGraph` (nodes + branches + switches), a SLD operuje na `VisualGraphV1` zbudowanym przez `topologyAdapterV2`. Segmentacja trunk/branch/secondary, typy stacji, pola — istnieja TYLKO po stronie frontendu.

**Ryzyko:**
- Stacja moze byc wyrenderowana jako przelotowa, ale obliczeniowo nie byc na torze glównym
- Segmentacja BFS moze nie odpowiadac rzeczywistemu zasilaniu
- Zmiana stanu przelacznika moze zmieniac typ stacji wizualnie, ale nie w modelu obliczeniowym
- Overlay wyników moze nakladac wartosci na elementy, które w SLD maja inna semantyke niz w solverze

### K6. Brak jawnego SldSemanticModel

**Problem:** Nie istnieje jeden jawny typ `SldSemanticModel` z:
- trunks (ordered segments + inline stations)
- branchStations (per branch)
- sectionalStations (2 sekcje + tie)
- reserveLinks (NOP + ring connections)
- diagnostics

Zamiast tego: `AdapterResultV1` zawiera `graph + stationBlockDetails + visualTopology + extendedLogicalViews` — 4 osobne obiekty zamiast jednego spójnego modelu semantycznego. Renderery musza laczyc te 4 obiekty, rekonstruujac semantyke.

---

## 3. LUKI WAZNE

### W1. Snapshot nie serializuje stacji

**Plik:** `backend/src/network_model/core/snapshot.py:_graph_to_dict()`
**Problem:** Funkcja serializuje `nodes`, `branches`, `inverter_sources`, `switches` — ale **NIE** serializuje `stations`. Stacje w grafie istnieja w pamieci, ale nie sa w Snapshot.

**Konsekwencja:** Po deserializacji Snapshot stacje sa tracone. Frontendowy adapter musi je odtwarzac z ENM lub SLD symbols.

### W2. Brak jawnego modelu NOP (Normally Open Point)

**Problem:** NOP jest modelowany jako galaz z `isNormallyOpen: true` w TopologyInput, ale:
- W backendzie brak atrybutu `is_normally_open` na Branch
- Switch moze miec stan OPEN, ale to nie to samo co NOP
- Brak jawnego bytu "polaczenie rezerwowe" w modelu
- Brak walidacji, ze NOP laczy dwa konce sieci (nie jest w srodku magistrali)

### W3. Brak modelu generatora w NetworkGraph

**Problem:** `NetworkGraph` ma `inverter_sources` (InverterSource), ale:
- InverterSource to specyficzny typ (falownikowy)
- Generatory synchroniczne nie maja oddzielnego bytu
- Model nie rozróznia PV/BESS/Wind na poziomie grafu — to robione jest w ENM

### W4. Brak modelu obciazenia w NetworkGraph

**Problem:** Obciazenia (loads) nie sa jawnym bytem w `NetworkGraph`. Modelowane jako wezly PQ z moca czynna/bierna. Brak oddzielnego bytu `Load` z parametrami (cos phi, profil, kategoria).

### W5. Topologia logiczna ukryta w frontendowych logicalViews

**Problem:** `TopologyInputV1.logicalViews` (trunks/branches/rings) to jedyne miejsce jawnej segmentacji magistrali. Ale te views:
- Budowane z ENM w `topologyInputReader.ts`
- Nie maja walidacji w backendzie
- Brak ich w Snapshot
- Sa ustalane niezaleznie od backendu

### W6. Dwa adaptery topologii (V1 + V2)

**Pliki:** `topologyAdapter.ts` + `topologyAdapterV2.ts`
**Problem:** Stary adapter V1 nadal istnieje obok kanonicznego V2. Martwy kod, potencjalne zamieszanie.

### W7. sldEtapStyle.ts zbyt duzy (1939 linii)

**Problem:** Jeden plik z setkami stalych, kolorów, geometrii, helperów. Powinien byc podzielony na moduly: colors, geometry, typography, helpers. Relacja z IndustrialAesthetics.ts niejawna.

---

## 4. PROBLEMY PORZADKOWE

### P1. Rozproszona dokumentacja SLD

**Problem:** 14+ dokumentów SLD w `mv-design-pro/docs/sld/`, czesc eksperymentalnych, czesc kanoniczna. Brak jasnej hierarchii.
- EXEC_PROMPT_CANONICAL_SLD_ETAP.md — prompt, nie spec
- SLD_RUN3B_ROADMAP.md — roadmap (stary)
- SLD_REPO_GAP_AUDIT.md — audyt luk (stary)
- SLD_PIPELINE_CANONICAL_STATUS.md — status (stary)

### P2. Duplikaty ADR

**Problem:** ADR-003, ADR-005, ADR-006, ADR-007, ADR-008 maja duplikaty numerów. Nie sa sprzeczne w tresci, ale stwarzaja zamieszanie.

### P3. Spec rozdzialy 11 i 13

**Problem:** SPEC_CHAPTER_11_REPORTING_AND_EXPORT.md i SPEC_CHAPTER_13_REPORTING_AND_EXPORTS.md — mozliwy duplikat. Wymaga weryfikacji.

### P4. Stale geometryczne w dwóch miejscach

**Pliki:** `IndustrialAesthetics.ts` (stale makro) + `sldEtapStyle.ts` (stale detailowe)
**Problem:** Oba definiuja geometrie, ale na róznych poziomach. Relacja nie jest jawna.

---

## 5. MAPA ODPOWIEDZIALNOSCI

```
MODEL (backend)                    -> WALIDACJA (backend)
  NetworkGraph                       NetworkValidator
  Node/Branch/Switch/Station         oze_validators
  InverterSource                     validator.py
  Snapshot (bez stacji!)
                                   -> OBLICZENIA (backend)
                                     IEC60909 (short circuit)
                                     Newton-Raphson (power flow)
                                     Gauss-Seidel (power flow)
                                     Fast Decoupled (power flow)
                                     fault_scenario_executor

MODEL (frontend/ENM)              -> ADAPTER (frontend)
  TopologyInputReader                topologyAdapterV2 (BFS segm.)
  EnergyNetworkModel                 stationBlockBuilder (pola)
  logicalViews (trunk/branch/ring)   visualTopologyContract

                                   -> GEOMETRIA (frontend)
                                     layoutPipeline (6-fazowy)
                                     IndustrialAesthetics
                                     sldEtapStyle

                                   -> RENDER (frontend)
                                     TrunkSpineRenderer
                                     StationFieldRenderer
                                     BranchRenderer
                                     EtapSymbolRenderer
                                     sld-canonical.css
```

---

## 6. MIEJSCA UKRYWANIA TOPOLOGII

| Plik | Lokalizacja | Co jest ukryte |
|------|-------------|---------------|
| `topologyAdapterV2.ts:segmentTopology()` | ~272-413 | Cala segmentacja trunk/branch/secondary |
| `topologyAdapterV2.ts:classifyStationType()` | ~113-156 | Typ stacji A/B/C/D wyprowadzany z topologii |
| `stationBlockBuilder.ts:deriveEmbeddingRole()` | ~86-165 | Rola embeddingowa (inline/leaf/branch/sectional) |
| `stationBlockBuilder.ts:buildFieldsForStation()` | ~212-487 | Pola stacji budowane z topologii |
| `layoutPipeline.ts:phase2` | ~200-400 | Trunk topology rekonstruowana w geometrii |
| `layoutPipeline.ts:phase3` | ~400-700 | Station placement z topologii |
| `BranchRenderer.tsx` | - | Rendering odgalezien z lokalna logika L-shape |
| `StationFieldRenderer.tsx` | - | Rendering stacji z inferowanym typem |

---

## 7. OCENA PER WARSTWA

### A. MODEL DOMENOWY

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Reprezentacja GPZ | OK | Station(type=GPZ) + Node(type=SLACK) |
| Reprezentacja pól SN | BRAK | Brak bytu Bay w backendzie |
| Reprezentacja magistrali | CZESCIOWE | Brak segmentacji trunk/branch/secondary w backendzie |
| Rozróznienie typów stacji | BRAK | StationType ma tylko GPZ/RPZ/TRAFO/SWITCHING |
| Punkt odgalezienia | BRAK | Nie jest jawnym bytem |
| NOP | CZESCIOWE | Switch OPEN ≠ NOP semantycznie |
| OZE (PV/BESS/Wind) | OK | InverterSource + ENM.generators |
| Polaczenie rezerwowe | BRAK | Brak jawnego bytu |
| Sprzeglo sekcyjne | CZESCIOWE | Switch z typem coupler, ale brak kontraktu sekcyjnego |
| Ogólnosc modelu | CZESCIOWE | Graf jest ogólny, ale brak semantyki nadrzednej |

### B. SNAPSHOT I WARSTWA DANYCH

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Serializacja wezlów | OK | nodes w Snapshot |
| Serializacja galezi | OK | branches w Snapshot |
| Serializacja przelaczników | OK | switches w Snapshot |
| Serializacja stacji | BRAK | stations NIE sa w Snapshot |
| Serializacja pól | BRAK | bays NIE istnieja |
| Segmentacja magistrali | BRAK | logicalViews NIE sa w Snapshot |
| Fingerprint | OK | SHA-256 deterministyczny |

### C. WALIDACJA

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Walidacja grafu (E001-E008) | OK | NetworkValidator sprawdza graph integrity |
| Walidacja typów stacji | BRAK | Backend nie waliduje typów topologicznych |
| Walidacja pól | BRAK | Backend nie zna pól |
| Walidacja segmentacji | BRAK | Backend nie zna trunk/branch |
| Walidacja NOP | BRAK | Backend nie waliduje NOP na ring |
| Walidacja kontraktów stacyjnych | BRAK | Brak: przelotowa ma IN+OUT, sekcyjna ma 2 szyny |

### D. MODEL OBLICZENIOWY

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Topologia do obliczen | OK | NetworkGraph nodes+branches+switches |
| Zgodnosc z topologia SLD | CZESCIOWE | Solvery nie znaja segmentacji |
| Obliczenia IEC 60909 | OK | Pelny solver WHITE BOX |
| Power flow (3 metody) | OK | NR, GS, FD |
| Proof engine | OK | 8+ proof packów |

### E. WIDOKI LOGICZNE / ADAPTERY

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| TopologyAdapterV2 | DOBRY | BFS deterministyczny, brak heurystyk |
| StationBlockBuilder | DOBRY | Formalna derivacja ról |
| VisualTopologyContract | OK | Zamroznony V1, walidacja, hash |
| SldSemanticModel | BRAK | Nie istnieje — 4 osobne obiekty |
| Walidacja semantyczna | BRAK | Brak walidatora SldSemanticModel |

### F. GEOMETRIA

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Jedna dominujaca os magistrali | OK | layoutPipeline.phase2 trunk pionowo |
| Rozwój sieci w dól | OK | GPZ u góry, siec w dól |
| Odgalezienia w bok | OK | BranchRenderer L-shape |
| Stacja przelotowa przejmuje tor | CZESCIOWE | Poprawne wizualnie, ale bez kontraktu |
| Ring/NOP w osobnym kanale | CZESCIOWE | SECONDARY_CONNECTOR routing, ale brak dedykowanego kanalu |
| Etykiety z buforem | CZESCIOWE | .sld-param-box dodane, ale brak algorytmu antykolizyjnego |
| Determinizm | OK | SHA-256 fingerprint, 100x test |

### G. SLD I SYMBOLIKA

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Symbole IEC 60617 | OK | EtapSymbolRenderer kanoniczny |
| Jednolita symbolika | OK | Jeden zestaw symboli |
| Style kanoniczne | CZESCIOWE | sldEtapStyle.ts za duzy, brak modularyzacji |
| Stacje per typ | CZESCIOWE | StationFieldRenderer nie rozróznia typów stacji formalnie |

### H. TESTY

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Testy modelu ogólnego | BRAK | Brak testów walidujacych aksjomat ogólnosci |
| Testy regresyjne topologiczne | CZESCIOWE | 7 scenariuszy referencyjnych, ale brak testów kontraktów stacji |
| Testy deterministyczne | OK | 100x, 50x permutacja, golden E2E |
| Testy backend (1600+) | OK | Solvery, proof, API |
| Testy frontend (190+) | OK | SLD pipeline, layout, symbole |

### I. DOKUMENTACJA

| Aspekt | Ocena | Uzasadnienie |
|--------|-------|-------------|
| Spec (18 rozdziałów) | OK | BINDING, source of truth |
| Dokumentacja SLD | ROZPROSZONA | 14+ dokumentów, brak hierarchii |
| Dokumentacja modelu ogólnego | NOWA | Wersja 1.0 z 2026-03-13 (ten audyt ja uzupelnia) |
| ADR | CZESCIOWE | Duplikaty numerów, ale tresci poprawne |
| Spójnosc doc-code | CZESCIOWE | Dokumenty kanoniczne vs as-is |

---

## 8. KLASY BLEDÓW ZIDENTYFIKOWANE

### T1 — Bledy topologiczne

| ID | Opis | Lokalizacja | Status |
|----|------|-------------|--------|
| T1.1 | Stacja przelotowa nie ma jawnego kontraktu "tor glówny" IN->OUT | stationBlockBuilder.ts | LUKA KRYTYCZNA |
| T1.2 | Punkt odgalezienia nie jest jawnym bytem | topologyAdapterV2.ts | LUKA WAZNA |
| T1.3 | Stacja sekcyjna — logika sekcji ukryta | stationBlockBuilder.ts | LUKA WAZNA |
| T1.4 | NOP moze nie trafic na ring — brak walidacji | topologyAdapterV2.ts | LUKA PORZADKOWA |
| T1.5 | Brak kontraktu: OUT pola tworzy dalsza magistrale | StationFieldRenderer | LUKA KRYTYCZNA |
| T1.6 | Odgalezienie moze wychodzic z przypadkowego miejsca — brak walidacji | topologyAdapterV2.ts | LUKA WAZNA |

### G1 — Bledy geometryczne

| ID | Opis | Lokalizacja | Status |
|----|------|-------------|--------|
| G1.1 | Brak osobnego kanalu geometrycznego dla ring/NOP/rezerwy | layoutPipeline.ts | LUKA WAZNA |
| G1.2 | Brak algorytmu antykolizyjnego etykiet | layoutPipeline.ts phase5 | LUKA WAZNA |
| G1.3 | Brak formalnego kontraktu buforu ochronnego symboli | CollisionGuard | LUKA PORZADKOWA |

### A1 — Bledy architektoniczne

| ID | Opis | Lokalizacja | Status |
|----|------|-------------|--------|
| A1.1 | Brak jawnego SldSemanticModel — 4 osobne obiekty | AdapterResultV1 | LUKA KRYTYCZNA |
| A1.2 | Stary topologyAdapter.ts (V1) nadal istnieje | core/topologyAdapter.ts | DO USUNIECIA |
| A1.3 | sldEtapStyle.ts za duzy (1939 linii) | sldEtapStyle.ts | DO PODZIALU |
| A1.4 | StationFieldRenderer nie rozróznia formalnie typów stacji | StationFieldRenderer.tsx | LUKA WAZNA |

### D1 — Bledy dokumentacyjne

| ID | Opis | Lokalizacja | Status |
|----|------|-------------|--------|
| D1.1 | 14+ dokumentów SLD bez jasnej hierarchii | docs/sld/ | DO KANONIZACJI |
| D1.2 | Duplikaty ADR numerów | docs/adr/ | DO UPORZADKOWANIA |
| D1.3 | Mozliwy duplikat Spec 11 vs 13 | docs/spec/ | DO WERYFIKACJI |
| D1.4 | Dokumenty eksperymentalne obok kanonicznych | docs/sld/ | DO OCZYSZCZENIA |

---

## 9. PLAN GLOBALNEJ PRZEBUDOWY

### Faza 1: Wzbogacenie modelu domenowego (Backend)

1. **Rozszerzyc StationType** o: `INLINE`, `BRANCH_STATION`, `SECTIONAL`, `TERMINAL`, `OZE_CLUSTER`
2. **Dodac model Bay (pole)** do Station: `Bay` z `BayRole` (LINE_IN, LINE_OUT, TRANSFORMER, BRANCH, COUPLER, OZE)
3. **Dodac segmentacje magistrali** do NetworkGraph/Snapshot: `trunk_segment_ids`, `branch_segment_ids`, `secondary_ids`
4. **Serializowac stacje w Snapshot** — dodac `stations` do `_graph_to_dict()`
5. **Dodac BranchPoint** jako jawny byt topologiczny
6. **Dodac `is_normally_open`** do Branch
7. **Walidowac typy stacji** w NetworkValidator

### Faza 2: Jawny SldSemanticModel (Frontend)

8. **Zdefiniowac SldSemanticModelV1** z: trunks, inlineStations, branchStations, sectionalStations, terminalStations, reserveLinks, diagnostics
9. **Zbudowac adapter** Snapshot -> SldSemanticModelV1
10. **Zbudowac walidator** SldSemanticModelV1 (kontrakty per typ stacji)
11. **Przeniesc semantyke stacji** z 4 osobnych obiektów do jednego modelu

### Faza 3: Typologia stacji (Frontend + Backend)

12. **Kontrakty per typ stacji**: InlineStationContract, BranchStationContract, SectionalStationContract, TerminalStationContract
13. **Renderery per typ stacji**: jawne, nie inferowane
14. **Testy kontraktów stacyjnych** — IN+OUT, brak toru glównego, 2 sekcje+tie, brak OUT

### Faza 4: Geometria i symbolika

15. **Skonsolidowac stale geometryczne** (IndustrialAesthetics + sldEtapStyle)
16. **Osobny kanal geometryczny dla ring/NOP/rezerwy**
17. **Algorytm antykolizyjny etykiet**
18. **Podzial sldEtapStyle.ts** na moduly

### Faza 5: Czyszczenie i dokumentacja

19. **Usunac stary topologyAdapter.ts (V1)**
20. **Kanonizowac dokumentacje SLD** do ~5 wiazacych dokumentów
21. **Usunac dokumenty eksperymentalne** (prompts, roadmapy, gap audyty stare)
22. **Pelny pakiet testów regresyjnych** — kontrakty stacji, NOP, ring, multi-trunk

### Faza 6: Testy modelu ogólnego

23. **Test aksjomatu ogólnosci** — czy model opisuje dowolna praktyczna siec terenowa SN
24. **Zlote uklady obowiazkowe** — per typ stacji, per topologia
25. **Testy regresyjne** — zakaz obejscia, magistrala przez stacje, NOP na ring
26. **Testy E2E** — Snapshot -> adapter -> SldSemanticModel -> layout -> render

---

## 10. PODSUMOWANIE

System MV-DESIGN-PRO ma solidne fundamenty:
- 4 solvery WHITE BOX (IEC 60909, NR, GS, FD)
- Deterministyczny pipeline SLD (6 faz, SHA-256)
- 1600+ testów backend, 190+ testów frontend
- 8+ proof packów z equation registries
- ENM v1.0 z pelna walidacja

Jednak **model domenowy jest zbyt plaski** — nie niesie semantyki wymaganej do obslugi dowolnej praktycznej sieci terenowej SN. Kluczowe pojecia (typ stacji, pola, segmentacja magistrali, punkt odgalezienia) sa wyprowadzane ad hoc w frontendzie zamiast byc jawnie modelowane w backendzie.

Przebudowa wymaga **wzbogacenia modelu domenowego** o brakujace byty i relacje, a nastepnie **uproszczenia frontendu** — który dzis musi sam odkrywac semantyke, której backend nie dostarcza. Koniec z ukrywaniem topologii w JSX — jeden jawny SldSemanticModel zamiast 4 osobnych obiektów.
