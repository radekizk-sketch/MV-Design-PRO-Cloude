# PLAN 10/10 GLOBAL SN — PLAN NAPRAWCZY

**Wejście:** `docs/audyt/AUDYT_10_10_GLOBAL_SN.md`  
**Tryb:** deterministyczny, white-box, brak regresji  
**Priorytety:** (1) topologia, (2) Load Flow, (3) white-box, (4) katalog, (5) UI integracja, (6) estetyka SLD

---

## KROK 1 — BLOKERY TOPOLOGII (PRIORYTET 1)

**Status realizacji: IN_PROGRESS**

**Cel mierzalny**
- System przechodzi testy: radial 10 stacji, ring 8 stacji, 2 ring + 2 źródła, split+insert (deterministycznie).
- Każdy przypadek działa z przełączaniem stanów łączników bez niszczenia grafu.

**Pliki do zmiany (obszary)**
- Backend: moduły wejścia topologii, walidacji gotowości i mapowania do solver input.
- Frontend: kreator/SLD dla operacji split+insert i kontroli stanów łączników.
- Testy: backend + frontend E2E dla scenariuszy topologicznych.

**Nowe testy**
- `topology_radial_10_stations_deterministic`
- `topology_ring_8_with_nop`
- `topology_two_rings_two_sources`
- `topology_split_insert_idempotent`

**Kryterium odbioru**
- Wszystkie 4 testy zielone w CI; hash snapshotu i wyników stabilny między uruchomieniami.

**Brak regresji**
- Dotychczasowe testy ENM/SLD/solver bez spadku pokrycia i bez zmian API.

---

## KROK 2 — LOAD FLOW NR E2E (PRIORYTET 2)

**Status realizacji: IN_PROGRESS**

**Cel mierzalny**
- NR działa dla radial/ring/multi-source w jednym kanonicznym run-contract.
- Identyczny snapshot daje identyczny wynik i identyczny trace.

**Pliki do zmiany (obszary)**
- Backend: wejścia LF, normalizacja snapshot→solver, wykonanie NR, serializacja wyników.
- API: endpoint uruchomienia LF i odczytu trace.
- Testy deterministyczności.

**Nowe testy**
- `lf_nr_radial_reference_case`
- `lf_nr_ring_reference_case`
- `lf_nr_multisource_reference_case`
- `lf_nr_repeatability_trace_identity`

**Kryterium odbioru**
- Wszystkie testy LF zielone; różnice JSON trace = 0 dla powtórnych uruchomień.

**Brak regresji**
- Zachowany frozen Result API i kompatybilność odczytu w UI/proof.

---

## KROK 3 — WHITE-BOX CROSS-ANALYSIS (PRIORYTET 3)

**Status realizacji: IN_PROGRESS**

**Cel mierzalny**
- Każda analiza (SC/LF/przeciążenia/spadki/straty) emituje pełny trace w jednym kanonicznym formacie.
- Trace zawiera dane wejściowe, kroki pośrednie, wynik końcowy i metadane deterministyczne.

**Pliki do zmiany (obszary)**
- Backend: trace emitters, model trace, eksport JSON/JSONL/PDF/DOCX.
- Frontend: viewer trace i powiązanie z elementami SLD.

**Nowe testy**
- `trace_schema_cross_analysis_contract`
- `trace_contains_intermediate_values_sc`
- `trace_contains_jacobian_and_dx_lf`
- `trace_hash_stability_golden_networks`

**Kryterium odbioru**
- 100% analiz zwraca trace zgodny ze schematem; brak pól opcjonalnych „ukrytych”.

**Brak regresji**
- Proof Engine czyta trace bez zmian kontraktowych wstecznie niezgodnych.

---

## KROK 4 — KATALOGI + MATERIALIZACJA (PRIORYTET 4)

**Status realizacji: IN_PROGRESS**

**Cel mierzalny**
- Brak katalogu lub brak materializacji blokuje analizę zawsze i wszędzie.
- Zmiana wersji katalogu tworzy nowy snapshot i unieważnia wyniki poprzednie.

**Pliki do zmiany (obszary)**
- Backend: katalog, readiness, materializacja parametrów LF/SC, fixActions.
- Frontend: workflow przypięcia katalogu i materializacji.

**Nowe testy**
- `catalog_missing_blocks_analysis`
- `catalog_bind_unblocks_analysis`
- `catalog_version_change_creates_new_snapshot`
- `materialization_report_contains_effective_params`

**Kryterium odbioru**
- Wszystkie testy katalogowe zielone; brak „implicit defaults” w parametrach solvera.

**Brak regresji**
- Dotychczasowe projekty migrują bez utraty danych i bez cichych zmian wyników.

---

## KROK 5 — INTEGRACJA UI ↔ API (PRIORYTET 5)

**Status realizacji: IN_PROGRESS**

**Cel mierzalny**
- Jeden kanoniczny run-flow: gotowość → uruchomienie → trace → overlay → eksport.
- Wszystkie komunikaty i etykiety użytkowe w języku polskim.

**Pliki do zmiany (obszary)**
- Frontend: panele analiz, walidacje gotowości, nawigacja FixActions.
- Backend API: ujednolicenie kontraktów uruchomienia i odpowiedzi.

**Nowe testy**
- `ui_readiness_fixaction_navigation`
- `ui_run_flow_single_contract`
- `ui_polish_labels_guard`
- `api_ui_contract_snapshot`

**Kryterium odbioru**
- Brak rozłączeń UI↔API w smoke E2E; wszystkie testy kontraktowe zielone.

**Brak regresji**
- Zachowana kompatybilność istniejących ekranów i endpointów objętych frozen contracts.

---

## KROK 6 — SLD KANON PRZEMYSŁOWY (PRIORYTET 6)

**Cel mierzalny**
- SLD budowane pionowo od GPZ, odgałęzienia boczne, brak reflow przy zoom.
- Overlay nie zmienia geometrii; relay logicznie nad CB; golden render stabilny.

**Pliki do zmiany (obszary)**
- Frontend: engine layout, warstwy render, reguły aparatury i zabezpieczeń.
- CI: golden screenshots/porównanie renderów.

**Nowe testy**
- `sld_vertical_build_from_gpz`
- `sld_overlay_geometry_immutability`
- `sld_relay_above_cb_rule`
- `sld_golden_render_deterministic`

**Kryterium odbioru**
- Różnica golden render = 0 (lub formalnie zaakceptowana zmiana baseline) i brak mutacji geometrii po overlay.

**Brak regresji**
- Utrzymana wydajność i czytelność SLD dla dużych sieci.

---

## BRAMKI KOŃCOWE (DEFINITION OF DONE 10/10)

1. Dowolna konfiguracja sieci SN (graf ogólny) działa E2E.
2. Katalogi + materializacja są wymagane i audytowalne.
3. LF NR i SC IEC 60909 działają z pełnym white-box trace.
4. Przeciążenia, spadki napięć, straty/bilans są raportowane i nakładane na SLD bez zmiany geometrii.
5. Eksport zawiera trace i metadane deterministyczne.
6. Testy CI „guardian” dla topologii, katalogów, solverów, UI i deterministyczności są zielone.

**Status:** PLAN gotowy do realizacji sekwencyjnej (Krok 1 → 6).
