# UI V3 — NIEZMIENNIKI OSD (30+) (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: 40 niezmienników klasy OSD, deterministycznych i testowalnych

---

## KATEGORIA A: JEDNOPRAWDA (SNAPSHOT)

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| A1 | Snapshot jest jedynym źródłem prawdy o stanie sieci. UI nie przechowuje kopii modelu, topologii, grafu ani „draft graph". | `operationSnapshotEnforcement.test.ts` | `no_draft_graph_guard.py` |
| A2 | Każda modyfikacja sieci przechodzi wyłącznie przez operację domenową (DomainOpEnvelope → DomainOpResponse z nową migawką). | `operationSnapshotEnforcement.test.ts` | `canonical_ops_guard.py` |
| A3 | Snapshot jest niemutowalny (frozen). Żaden kod UI nie modyfikuje pól migawki po jej otrzymaniu. | `operationSnapshotEnforcement.test.ts` | — |
| A4 | Snapshot.fingerprint = SHA-256 deterministyczny. Ten sam model → ten sam hash. | `test_snapshot_fingerprint_stability.py` | — |
| A5 | Zmiana modelu (nowa migawka) unieważnia wyniki WSZYSTKICH przypadków obliczeniowych (activeCaseResultStatus → OUTDATED). | `app-state-store.test.ts` | — |
| A6 | Przypadek obliczeniowy (StudyCase) NIE mutuje modelu sieci. Przechowuje wyłącznie parametry konfiguracyjne. | `test_study_case_immutability.py` | — |

---

## KATEGORIA B: DETERMINIZM SLD

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| B1 | Ten sam Snapshot → identyczny VisualGraphV1 (hash). Powtórzenia 100×. | `determinism.test.ts` | `sld_determinism_guards.py` |
| B2 | Ten sam Snapshot → identyczny LayoutResultV1 (hash). Powtórzenia 100×. | `determinism.test.ts` | `sld_determinism_guards.py` |
| B3 | Permutacja kolejności elementów w Snapshot NIE zmienia wyniku układu SLD (hash). Powtórzenia 50×. | `determinism.test.ts` | — |
| B4 | Kamera (pan, zoom) NIE wpływa na układ SLD. Zmiana kamery nie wyzwala przeliczenia pipeline. | `ux-performance-budget.test.ts` | — |
| B5 | Brak `Math.random()`, `Date.now()`, `crypto.randomUUID()` w logice SLD core i engine. | — | `sld_determinism_guards.py` |
| B6 | Identyfikatory elementów SLD generowane deterministycznie (z danych domenowych, nie losowo). | `deterministicId.test.ts` | — |
| B7 | Sortowanie list w renderingu ZAWSZE z jawnym komparatorem (nie domyślny Unicode). | `professional-invariants.test.ts` | — |
| B8 | Golden render artefacts: hash SVG stabilny między wersjami dla 5 sieci referencyjnych. | `goldenNetworkE2E.test.ts` | `sld_render_artifacts.ts` |

---

## KATEGORIA C: TOPOLOGIA SIECI SN

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| C1 | GPZ ma dokładnie jedną szynę zasilającą SN (jeden Bus o napięciu SN). | `test_golden_network_sn.py` | — |
| C2 | Magistrala (trunk) to ciąg odcinków bez odgałęzień — linia prosta topologicznie od GPZ w dół. | `topologyAdapterV2.test.ts` | — |
| C3 | Stacja ma co najmniej jedno pole rozdzielnicze (Field/Bay). | `stationBlockBuilder.test.ts` | — |
| C4 | Pierścień (ring) wymaga dokładnie jednego punktu normalnie otwartego (NOP) na swoim obwodzie. | `test_topology_ops_determinism.py` | — |
| C5 | Każdy odcinek SN ma deterministyczny typ: linia napowietrzna lub kabel. Typ wynika z katalogu. | `catalogContract.test.ts` | `catalog_gate_guard.py` |
| C6 | Transformator SN/nN przyłączony do pola stacji po stronie SN. Połączenie SN→trafo→nN. | `switchgearConfig.test.ts` | — |
| C7 | Źródło OZE (PV/BESS) przyłączone WYŁĄCZNIE przez transformator nN/SN. Zakaz przyłączenia bezpośrednio do SN. | `pvBessValidation.test.ts` | `pcc_zero_guard.py` |
| C8 | Obciążenie przyłączone do szyny nN stacji (nie bezpośrednio do szyny SN). | `test_golden_network_sn.py` | — |
| C9 | Wyłącznik (CB) ma dokładnie jedno zabezpieczenie nadprądowe (Relay) lub brak. Relay nad CB w osi pola. | `fieldDevicePolish.test.ts` | — |
| C10 | Scenariusz zwarciowy definiowany na szynie (Bus), nie na odcinku (Branch). | `test_fault_scenario_v2_determinism.py` | — |

---

## KATEGORIA D: GOTOWOŚĆ I FIXACTION

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| D1 | Gotowość (ReadinessProfile) obliczana po KAŻDEJ operacji domenowej. Odpowiedź operacji zawsze zawiera aktualny profil. | `readinessGates.test.ts` | `readiness_codes_guard.py` |
| D2 | Brak katalogu (CATALOG_MISSING) nie blokuje rysowania SLD, ale BLOKUJE uruchomienie analiz. | `readinessGates.test.ts` | — |
| D3 | Każdy bloker (BLOCKER) ma przypisany co najmniej jeden FixAction. Brak „martwych" blokerów. | `fixActionCompleteness.test.ts` | `fix_action_completeness_guard.py` |
| D4 | FixAction OPEN_MODAL prowadzi do konkretnego dialogu edycji elementu. | `fixActionModalBridge.test.ts` | — |
| D5 | FixAction NAVIGATE_TO_ELEMENT zaznacza element na SLD i centruje kamerę. | — (E2E) | — |
| D6 | FixAction SELECT_CATALOG otwiera przeglądarkę katalogu z filtrem na odpowiedni typ i napięcie. | — (E2E) | — |
| D7 | FixAction NIE mutuje modelu. FixAction TYLKO nawiguje UI do miejsca naprawy. | — | `overlay_no_physics_guard.py` |

---

## KATEGORIA E: OVERLAY WYNIKÓW

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| E1 | Overlay NIE modyfikuje geometrii SLD. Overlay jest warstwą wizualną NAD SLD. | `overlayEngine.test.ts` | `overlay_no_physics_guard.py` |
| E2 | Overlay NIE zawiera obliczeń fizycznych. Overlay renderuje dane z ResultSetV1 (ZAMROŻONE API). | `overlayEngine.test.ts` | `overlay_no_physics_guard.py` |
| E3 | Overlay jest deterministyczny: te same dane wejściowe → ten sam wynik wizualny. | `overlayEngine.test.ts` | — |
| E4 | Overlay delta (porównanie 2 przebiegów) wymaga obu runId nie-null. | `sldDeltaOverlayStore.test.ts` | — |

---

## KATEGORIA F: TERMINOLOGIA I UI

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| F1 | Zero wystąpień PCC, BoundaryNode, Connection Point, Virtual Node, Aggregated Element w kodzie UI i modelu sieci. | — | `pcc_zero_guard.py` |
| F2 | Zero wystąpień nazw kodowych (P7, P11, P14, P17, P20) w ciągach widocznych w UI. | `canon-codenames-global.test.ts` | `no_codenames_guard.py` |
| F3 | Etykiety w UI wyłącznie po polsku, zgodne ze słownikiem kanonicznym (UI_V3_SYSTEM_SPEC_CANONICAL.md §6). | `canon-polish-labels.test.ts` | `forbidden_ui_terms_guard.py` |
| F4 | Brak anglicyzmów w komunikatach użytkownika (tooltips, etykiety, komunikaty błędów). | `ui-terminology-guard.test.ts` | `forbidden_ui_terms_guard.py` |

---

## KATEGORIA G: ARCHITEKTURA WARSTW

| # | Niezmiennik | Test | Strażnik |
|---|------------|------|----------|
| G1 | Warstwa prezentacji (frontend/src/ui/) NIE zawiera obliczeń fizycznych. | — | `arch_guard.py` |
| G2 | Warstwa SLD (frontend/src/engine/sld-layout/) NIE importuje z React (zero zależności od UI). | — | `arch_guard.py` |
| G3 | Warstwa overlay (frontend/src/ui/sld-overlay/) NIE zawiera obliczeń fizycznych. | — | `overlay_no_physics_guard.py` |
| G4 | Kreator (frontend/src/ui/wizard/) NIE przechowuje „lokalnej prawdy" — odczytuje ze Snapshot. | `wizard-sld-unity.test.ts` | `local_truth_guard.py` |
| G5 | Result API (ResultSetV1) jest ZAMROŻONE — zmiana wymaga podniesienia wersji głównej. | `results.test.ts` | `resultset_v1_schema_guard.py` |
| G6 | Brak feature flag na krytycznej ścieżce (SLD pipeline, operacje domenowe). | — | `no_feature_flag_critical_guard.py` (NOWY) |

---

## PODSUMOWANIE

| Kategoria | Liczba | Zakres |
|-----------|--------|--------|
| A: Jednoprawda | 6 | Snapshot, operacje, przypadki |
| B: Determinizm SLD | 8 | Powtórzalność, permutacje, golden |
| C: Topologia SN | 10 | GPZ, magistrala, stacje, ring, OZE |
| D: Gotowość i FixAction | 7 | Readiness, blokery, nawigacja |
| E: Overlay | 4 | Wyniki, delta, fizyka |
| F: Terminologia | 4 | PCC-zero, kodenames, polski |
| G: Architektura | 6 | Warstwy, import, zamrożone API |
| **RAZEM** | **45** | |

Każdy niezmiennik ma:
- Identyfikator (np. A1, B3, C7)
- Opis precyzyjny (bez wieloznaczności)
- Przypisany test (istniejący lub nowy)
- Przypisany strażnik CI (jeśli dotyczy)

---

*Dokument wiążący. Niezmienniki są „twarde" — złamanie wymaga przeglądu architektonicznego i jawnej decyzji.*
