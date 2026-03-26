# MACIERZ TESTÓW SLD — PELNA

**Data:** 2026-03-14
**Wersja:** 2.0
**Status:** WIAZACY

---

## 1. TESTY SYSTEMOWE — MODEL OGÓLNY

| ID | Opis testu | Plik testowy | Status |
|----|-----------|-------------|--------|
| SYS01 | Model opisuje siec promieniowa prosta | sldSemanticAdapter.test.ts | NOWY |
| SYS02 | Model opisuje siec z odgalezieniami | sldSemanticAdapter.test.ts | NOWY |
| SYS03 | Model opisuje siec pierscieniowa (ring + NOP) | sldSemanticAdapter.test.ts | NOWY |
| SYS04 | Model opisuje siec wielomagistralowa | sldSemanticAdapter.test.ts | NOWY |
| SYS05 | Model opisuje siec z podgalezieniami (rekurencja) | sldSemanticAdapter.test.ts | NOWY |
| SYS06 | Model opisuje siec z OZE (PV, BESS, Wind) | sldSemanticAdapter.test.ts | NOWY |
| SYS07 | Model opisuje siec sekcyjna | sldSemanticAdapter.test.ts | NOWY |
| SYS08 | Model opisuje siec mieszana (terrain) | sldSemanticAdapter.test.ts | NOWY |
| SYS09 | Snapshot niesie komplet informacji | snapshotCompleteness.test.ts | NOWY |
| SYS10 | Adapter nie gubi semantyki | sldSemanticAdapter.test.ts | NOWY |

---

## 2. TESTY TOPOLOGICZNE — KONTRAKTY STACJI

| ID | Opis testu | Plik testowy | Status |
|----|-----------|-------------|--------|
| TOP01 | Stacja przelotowa ma IN + OUT bays | stationContracts.test.ts | NOWY |
| TOP02 | Stacja przelotowa: IN i OUT to rózne segmenty | stationContracts.test.ts | NOWY |
| TOP03 | Stacja przelotowa: brak obejscia równoleglego | stationContracts.test.ts | NOWY |
| TOP04 | Stacja przelotowa: OUT kontynuuje magistrale | stationContracts.test.ts | NOWY |
| TOP05 | Stacja odgalezna: brak toru glównego | stationContracts.test.ts | NOWY |
| TOP06 | Stacja sekcyjna: 2 sekcje + tie | stationContracts.test.ts | NOWY |
| TOP07 | Stacja koncowa: IN bez OUT | stationContracts.test.ts | NOWY |
| TOP08 | NOP laczy dwa rózne trunki/sekcje | stationContracts.test.ts | NOWY |
| TOP09 | Punkt odgalezienia ma degree >= 3 | stationContracts.test.ts | NOWY |
| TOP10 | Brak cykli w spanning tree | stationContracts.test.ts | NOWY |

---

## 3. TESTY GEOMETRYCZNE

| ID | Opis testu | Plik testowy | Status |
|----|-----------|-------------|--------|
| GEO01 | Jedna dominujaca os magistrali (pionowa) | layoutPipeline.test.ts | OK |
| GEO02 | Odgalezienia w bok (L-shape) | layoutPipeline.test.ts | OK |
| GEO03 | Ring w osobnym kanale geometrycznym | layoutPipeline.test.ts | NOWY |
| GEO04 | Etykiety nie koliduja z symbolami | labelCollision.test.ts | NOWY |
| GEO05 | Obrysy stacji nie koliduja | layoutPipeline.test.ts | OK |
| GEO06 | Geometria deterministyczna (100x) | determinism.test.ts | OK |
| GEO07 | Permutation invariance (50x) | determinism.test.ts | OK |
| GEO08 | Grid-snap 20px | layoutPipeline.test.ts | OK |
| GEO09 | Y-only collision resolution | layoutPipeline.test.ts | OK |
| GEO10 | Performance budget (<=200 symbols: <200ms) | layoutPipeline.test.ts | OK |

---

## 4. TESTY SYMBOLIKI

| ID | Opis testu | Plik testowy | Status |
|----|-----------|-------------|--------|
| SYM01 | Kazdy DeviceType ma dokladnie 1 renderer | symbolConsistency.test.ts | NOWY |
| SYM02 | Brak duplikatów rendererów | symbolConsistency.test.ts | NOWY |
| SYM03 | Zgodnosc symbolu z rola aparatu | symbolConsistency.test.ts | NOWY |
| SYM04 | Kolejnosc urzadzen w polu: CT->CB->DS->ES | symbolConsistency.test.ts | NOWY |
| SYM05 | Symbole IEC 60617 zgodne wizualnie | visual regression | MANUALNY |

---

## 5. TESTY REGRESYJNE — PRZYPADKI ZAKAZANE

| ID | Opis regresji | Plik testowy | Status |
|----|--------------|-------------|--------|
| REG01 | Stacja przelotowa doklejona OBOK magistrali | stationRegressions.test.ts | NOWY |
| REG02 | Pole OUT wisi w powietrzu | stationRegressions.test.ts | NOWY |
| REG03 | Magistrala za stacja I przez stacje | stationRegressions.test.ts | NOWY |
| REG04 | Odgalezienie z niewlasciwego miejsca | stationRegressions.test.ts | NOWY |
| REG05 | Stacja odgalezna udaje przelotowa | stationRegressions.test.ts | NOWY |
| REG06 | Ring przecina logike magistrali | stationRegressions.test.ts | NOWY |
| REG07 | Tekst przecinany przez linie | stationRegressions.test.ts | NOWY |

---

## 6. ZLOTE UKLADY OBOWIAZKOWE

| ID | Opis | Stacje | Specjalne elementy | Plik testowy |
|----|------|--------|-------------------|-------------|
| GOLD01 | GPZ -> przelotowa -> koncowa | 2 | Minimalna siec | goldenLayouts.test.ts |
| GOLD02 | GPZ -> przelotowa + branch | 3 | Odgalezienie | goldenLayouts.test.ts |
| GOLD03 | GPZ -> sekcyjna + NOP | 2 | Sekcjonowanie | goldenLayouts.test.ts |
| GOLD04 | GPZ -> branch -> przemysl | 3 | Odbiór przemyslowy | goldenLayouts.test.ts |
| GOLD05 | GPZ -> branch -> PV | 3 | Generator PV | goldenLayouts.test.ts |
| GOLD06 | GPZ -> branch -> PV/BESS/odbiór | 3 | Stacja mieszana | goldenLayouts.test.ts |
| GOLD07 | Uklad mieszany wielostacyjny (terrain) | 12 | Ring, NOP, PV, sekcyjna, sub-branch | goldenLayouts.test.ts |

---

## 7. TESTY WALIDACJI SEMANTYCZNEJ

| ID | Opis testu | Regula | Plik testowy | Status |
|----|-----------|--------|-------------|--------|
| VAL01 | Inline station bez LINE_IN -> ERROR | SV01 | sldSemanticValidator.test.ts | NOWY |
| VAL02 | Inline station bez LINE_OUT -> ERROR | SV01 | sldSemanticValidator.test.ts | NOWY |
| VAL03 | Inline station IN == OUT segment -> ERROR | SV02 | sldSemanticValidator.test.ts | NOWY |
| VAL04 | Branch station z trunk path -> ERROR | SV03 | sldSemanticValidator.test.ts | NOWY |
| VAL05 | Sectional station bez tie -> ERROR | SV04 | sldSemanticValidator.test.ts | NOWY |
| VAL06 | Terminal station z OUT -> ERROR | SV05 | sldSemanticValidator.test.ts | NOWY |
| VAL07 | Bay bez urzadzen -> ERROR | SV06 | sldSemanticValidator.test.ts | NOWY |
| VAL08 | NOP wewnatrz jednej magistrali -> ERROR | SV07 | sldSemanticValidator.test.ts | NOWY |
| VAL09 | Magistrala bez pola GPZ -> ERROR | SV08 | sldSemanticValidator.test.ts | NOWY |
| VAL10 | Junction z degree < 3 -> WARNING | SV09 | sldSemanticValidator.test.ts | NOWY |

---

## 8. TESTY ISTNIEJACE (ZACHOWANE)

### 8.1 Frontend SLD

| Plik testowy | Pokrycie | Status |
|-------------|----------|--------|
| visualGraph.test.ts | VisualGraph contract V1 | OK |
| topologyAdapterV2.test.ts | BFS segmentacja, klasyfikacja stacji | OK |
| stationBlockBuilder.test.ts | Budowa pól, derivacja ról | OK |
| layoutPipeline.test.ts | 6-fazowy layout, determinizm | OK |
| determinism.test.ts | 100x, 50x permutacja, hash stability | OK |
| switchgearConfig.test.ts | Konfiguracja pól (CB, DS, relay) | OK |
| switchgearConfig.hashParity.test.ts | Hash parytet switchgear | OK |
| referenceTopologies.test.ts | 7 scenariuszy referencyjnych | OK |
| industrialAesthetics.test.ts | Estetyka przemyslowa | OK |
| goldenNetworkE2E.test.ts | Zlota siec 20-stacyjna E2E | OK |
| sldCanonicalHygiene.test.ts | Higiena kanoniczna | OK |
| powerFlowOverlayGeometryInvariant.test.tsx | Overlay nie mutuje geometrii | OK |

### 8.2 Backend

| Plik testowy | Pokrycie | Status |
|-------------|----------|--------|
| test_topology_guardians_step1.py | Radial 10, ring 8, multi-source, split+insert | OK |
| test_topology_links.py | Connectivity links | OK |
| test_topology_ops_determinism.py | Operations determinism | OK |
| tests/golden/ | Golden network fixtures | OK |
| tests/enm/ | ENM model, topology, validation | OK |
| tests/e2e/ | E2E workflows, export stability | OK |

### 8.3 E2E

| Plik testowy | Pokrycie | Status |
|-------------|----------|--------|
| e2e/create-first-case.spec.ts | Smoke test | OK |
| e2e/critical-run-flow.spec.ts | Real backend critical path | OK |

---

## 9. CI GATES

| Gate | Workflow | Co sprawdza |
|------|---------|-------------|
| SLD Determinism | sld-determinism.yml | Hash stability, collision, topology hash |
| Frontend Checks | frontend-checks.yml | Type-check, lint, vitest, codenames |
| Python Tests | python-tests.yml | Backend tests, guards |
| Docs Guard | docs-guard.yml | Documentation integrity |

---

## 10. PRIORYTET IMPLEMENTACJI TESTÓW

### Priorytet 1 (Krytyczny)
- TOP01-TOP04: Kontrakty stacji przelotowej
- TOP05: Stacja odgalezna brak toru glównego
- TOP06: Stacja sekcyjna dwie sekcje
- REG01-REG03: Regresje stacji przelotowej
- GOLD07: Zloty uklad terrain

### Priorytet 2 (Wazny)
- SYS01-SYS08: Testy modelu ogólnego
- VAL01-VAL10: Walidacja semantyczna
- GEO03: Ring w osobnym kanale
- GEO04: Kolizje etykiet

### Priorytet 3 (Porzadkowy)
- SYM01-SYM04: Spójnosc symboli
- GOLD01-GOLD06: Zlote uklady proste
- REG04-REG07: Pozostale regresje
