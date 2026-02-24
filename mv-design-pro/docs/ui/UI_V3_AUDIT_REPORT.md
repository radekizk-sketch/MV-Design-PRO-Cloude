# UI V3 — ZBIORCZY RAPORT AUDYTU (6 RÓL)

**Status**: BINDING
**Data**: 2026-02-24
**Wersja**: 1.0.0
**Zakres**: Audyt zgodności dokumentów UI V3 z kodem — wyniki 6 ról specjalistycznych

---

## PODSUMOWANIE WYKONAWCZE

6 agentów-specjalistów przeprowadziło równoległy audyt 9 dokumentów BINDING UI V3 wobec ~480 plików kodu źródłowego. Wynik: **architektura V3 poprawnie identyfikuje kierunek**, ale istnieje **18 krytycznych/ważnych rozbieżności** wymagających naprawy przed wdrożeniem.

| Rola | Raport | Znalezionych rozbieżności |
|------|--------|--------------------------|
| 1. Główny Architekt Systemu | Kontrakty DDD, warstwy, operacje | 10 (4 KRYTYCZNE) |
| 2. Architekt Interfejsu Użytkownika | Komponenty SLD, pipeline, store | 10 (1 KRYTYCZNY, 2 WYSOKIE) |
| 3. Architekt Domeny Backend | Operacje, snapshot, readiness | 10 (3 KRYTYCZNE) |
| 4. Inżynier Elektroenergetyk OSD | Topologia, niezmienniki C1-C10 | 5 niezaimplementowanych |
| 5. Audytor Determinizmu i Jakości | Strażnicy CI, testy | 26 strażników poza CI |
| 6. Redaktor Dokumentacji | Spójność, terminologia | 10 (3 KRYTYCZNE) |

---

## KRYTYCZNE ROZBIEŻNOŚCI (WYMAGAJĄ NATYCHMIASTOWEJ NAPRAWY)

### K1. Dwa konkurencyjne rejestry operacji kanonicznych
- **Opis**: `canonical_operations.py` (41 operacji) i `domain_ops_models.py` CANONICAL_OPS (39 operacji) definiują różne zbiory. Mapy aliasów rozłączne.
- **Źródło**: Rola 1 (R-B1)
- **Naprawa**: Wyznaczenie `canonical_operations.py` jako jedynego źródła prawdy. Generowanie CANONICAL_OPS w `domain_ops_models.py` z niego.
- **PR**: PR-UIV3-01

### K2. Brak implementacji idempotentności
- **Opis**: `idempotency_key` zadeklarowany w modelach, ale nigdzie nie weryfikowany. Brak cache, brak deduplikacji. Powtórzony request wykona operację ponownie.
- **Źródło**: Rola 1 (R-D2), Rola 3 (G3)
- **Naprawa**: Implementacja Redis-based idempotency cache z TTL. Sprawdzenie klucza przed wykonaniem operacji.
- **PR**: PR-UIV3-01

### K3. idempotency_key bazuje na Date.now() zamiast UUID
- **Opis**: Klient `domainOpsClient.ts` generuje klucz z `Date.now()` — niedeterministyczny, retry generuje nowy klucz.
- **Źródło**: Rola 1 (R-D1)
- **Naprawa**: Zamiana na `crypto.randomUUID()` generowany RAZ przy tworzeniu operacji, przekazywany do retry.
- **PR**: PR-UIV3-01

### K4. Brak snapshotHash w snapshotStore
- **Opis**: snapshotStore.ts nie przechowuje `snapshotHash` (SHA-256). Klient operacji wysyła pusty string `''` jako `snapshot_base_hash`. Optimistic concurrency niefunkcjonalny.
- **Źródło**: Rola 1 (R-C2)
- **Naprawa**: Dodanie pola `snapshotHash` do snapshotStore, obliczanie/przechowywanie po każdej operacji.
- **PR**: PR-UIV3-02

### K5. Dwa niespólne systemy Snapshot
- **Opis**: `NetworkSnapshot` (frozen dataclass, SHA-256) i ENM snapshot (`dict[str, Any]`) pracują równolegle. DomainOpResponse zwraca `dict`, nie `NetworkSnapshot`.
- **Źródło**: Rola 3 (G1)
- **Naprawa**: Unifikacja — DomainOpResponse powinien zwracać typowany Snapshot z fingerprint.
- **PR**: PR-UIV3-01

### K6. Dwa niespólne systemy Readiness
- **Opis**: `ReadinessProfileV1` (pełny, z areas, per-analysis flags) i `ReadinessInfo` (uproszczony, ready/blockers/warnings) nie są połączone. DomainOpResponse używa ReadinessInfo.
- **Źródło**: Rola 3 (G2)
- **Naprawa**: Integracja — DomainOpResponse powinien zwracać ReadinessProfileV1.
- **PR**: PR-UIV3-01

### K7. Rozbieżność formatu koperty operacji
- **Opis**: KONTRAKT_OPERACJI definiuje zagnieżdżoną strukturę (`operation.name`, `operation.idempotency_key`), V3 SYSTEM_SPEC definiuje płaską. Kod backend zgodny z zagnieżdżoną.
- **Źródło**: Rola 6 (G1)
- **Naprawa**: Aktualizacja V3 SYSTEM_SPEC §4.1 na format zagnieżdżony (zgodny z kodem i KONTRAKT_OPERACJI).
- **PR**: PR-UIV3-00 (poprawka dokumentu)

### K8. Rozbieżność endpointu API
- **Opis**: KONTRAKT_OPERACJI: `POST /enm/domain-ops`, V3: `POST /api/domain-operations`, kod: `POST /api/cases/{caseId}/enm/domain-ops`. Trzy różne ścieżki.
- **Źródło**: Rola 1 (R-D3), Rola 6 (G2)
- **Naprawa**: Aktualizacja V3 SYSTEM_SPEC na ścieżkę zgodną z kodem.
- **PR**: PR-UIV3-00 (poprawka dokumentu)

---

## WAŻNE ROZBIEŻNOŚCI (WYMAGAJĄ NAPRAWY W PLANOWANYCH PR)

### W1. Dwa konkurujące pipeline'y SLD
- **Opis**: `engine/sld-layout/pipeline.ts` (5-fazowy, zgodny z V3) i `ui/sld/core/layoutPipeline.ts` (7-fazowy, niezgodny). Nie jest jasne który jest produkcyjny.
- **Źródło**: Rola 2 (F1)
- **Naprawa**: Decyzja architektoniczna — wyznaczenie jednego pipeline jako kanonicznego. Aktualizacja V3 SLD_ARCH.
- **PR**: PR-UIV3-03

### W2. SldEditorStore trzyma pełny draft graph
- **Opis**: Store trzyma `symbols: Map<string, AnySldSymbol>` — pełna kopia modelu z topologią i pozycjami. Narusza zasadę V3 „SLD = f(Snapshot)".
- **Źródło**: Rola 2 (F2)
- **Naprawa**: Migracja do modelu gdzie symbole są derywowane z Snapshot → Adapter → VisualGraph.
- **PR**: PR-UIV3-03

### W3. VisualGraphV1 nie używa formalnego ElementRefV1
- **Opis**: V3 specyfikuje `elementRef: ElementRefV1` w VisualNodeV1. Kod używa `attributes.elementId`/`attributes.elementType` jako luźnych stringów.
- **Źródło**: Rola 2 (F3)
- **Naprawa**: Dodanie formalnego pola `elementRef: ElementRefV1` do VisualNodeV1.
- **PR**: PR-UIV3-03

### W4. DomainOpResponse pomija 4 pola już zaimplementowane
- **Opis**: V3 Response nie wymienia `logical_views`, `selection_hint`, `domain_events`, `materialized_params` — pola istniejące w kodzie i używane przez frontend.
- **Źródło**: Rola 1 (R-A4), Rola 6 (G3)
- **Naprawa**: Aktualizacja V3 SYSTEM_SPEC §4.1 o brakujące pola.
- **PR**: PR-UIV3-00 (poprawka dokumentu)

### W5. Tryby SLD kompletnie różne
- **Opis**: V3: `view|edit|project` + `normal|switching|fault` + `labelMode`. Kod: `EDYCJA|WYNIKI|ZABEZPIECZENIA`. 3 z 4 pól V3 nie istnieją.
- **Źródło**: Rola 1 (R-C5)
- **Naprawa**: Aktualizacja V3 STATE_MODEL na tryby zgodne z kodem, lub rozszerzenie kodu.
- **PR**: PR-UIV3-02

### W6. 5 z 10 niezmienników topologicznych niezaimplementowanych
- **Opis**: C1 (GPZ 1 szyna), C2 (magistrala bez odgałęzień), C3 (stacja ≥1 pole), C4 (ring 1 NOP), C8 (obciążenie na nN) — brak w `validator.py`.
- **Źródło**: Rola 4 (F)
- **Naprawa**: Dodanie reguł walidacyjnych do NetworkValidator. C1 wymaga doprecyzowania (GPZ z 2 sekcjami szyn).
- **PR**: PR-UIV3-04 (częściowo), dedykowany PR dla walidatora

### W7. BESS SN nie walidowany na obecność transformatora
- **Opis**: `oze_validators.py` waliduje PV SN na `transformer_ref`, ale NIE waliduje BESS SN. Golden network narusza C7 (InverterSource bezpośrednio na SN 15 kV).
- **Źródło**: Rola 4 (C)
- **Naprawa**: Rozszerzenie walidatora OZE o BESS SN. Naprawa golden network.
- **PR**: Dedykowany PR (nie UI V3 — dotyczy backendu)

### W8. 26 z 35 strażników nie jest w CI
- **Opis**: Tylko 9 z 35 strażników uruchamianych w CI. Nowe strażniki V3 (`no_draft_graph`, `no_feature_flag_critical`) również poza CI.
- **Źródło**: Rola 5 (D)
- **Naprawa**: Utworzenie piątego workflow `extended-guards.yml` lub rozszerzenie istniejących.
- **PR**: PR-UIV3-00 lub dedykowany PR

### W9. Brak sekcji „Gotowość" w inspektorze elementu
- **Opis**: PropertyGrid/EngineeringInspector nie ma dedykowanej sekcji readiness per-element. ReadinessLivePanel jest globalny.
- **Źródło**: Rola 2 (F5)
- **Naprawa**: Dodanie sekcji „Gotowość" do inspektora z per-element ReadinessIssues + FixAction.
- **PR**: PR-UIV3-05

### W10. Termin „Overlay" używany zamiast „Nakładka"
- **Opis**: Słownik kanoniczny definiuje „Nakładka", ale dokumenty V3 używają „Overlay" w treści polskojęzycznej.
- **Źródło**: Rola 6 (G7)
- **Naprawa**: Ujednolicenie na „Nakładka wyników" w treści PL, „Overlay" dozwolone w nazwie typu TS.
- **PR**: PR-UIV3-00 (poprawka dokumentów)

---

## MACIERZ STRAŻNIKÓW CI

### Stan bieżący
| Wynik | Liczba | Strażnicy |
|-------|--------|-----------|
| PASS | 16 | pcc_zero, no_codenames, no_draft_graph, no_feature_flag_critical, domain_no_guessing, canonical_ops, readiness_codes, sld_determinism (67 sub-guardów), arch, docs, overlay_no_physics, solver_boundary, dead_click, resultset_v1_schema, local_truth, dialog_completeness |
| FAIL | 2 | trace_determinism (brak pydantic), fix_action_completeness (brak pydantic) |

### Strażnicy w CI vs poza CI
| W CI | Poza CI |
|------|---------|
| 9 (26%) | 26 (74%) |

### Rekomendacja
Utworzenie `extended-guards.yml` z minimum 10 dodatkowymi strażnikami:
`arch_guard`, `solver_boundary_guard`, `overlay_no_physics_guard`, `resultset_v1_schema_guard`, `no_draft_graph_guard`, `no_feature_flag_critical_guard`, `fix_action_completeness_guard`, `trace_determinism_guard`, `forbidden_ui_terms_guard`, `dead_click_guard`

---

## NIEZMIENNIKI — POKRYCIE IMPLEMENTACJĄ

### Kategoria C (Topologia SN): 2/10 zaimplementowane
| # | Niezmiennik | Status |
|---|------------|--------|
| C1 | GPZ 1 szyna SN | NIEZAIMPLEMENTOWANY (wymaga doprecyzowania — GPZ z 2 sekcjami) |
| C2 | Magistrala bez odgałęzień | NIEZAIMPLEMENTOWANY (delegowany do frontendu) |
| C3 | Stacja ≥1 pole | NIEZAIMPLEMENTOWANY (model Station nie ma koncepcji pól) |
| C4 | Ring dokładnie 1 NOP | NIEZAIMPLEMENTOWANY (brak detekcji cykli) |
| C5 | Odcinek SN ma typ katalogowy | CZĘŚCIOWO (system Readiness, nie validator) |
| C6 | TR SN/nN w polu stacji | CZĘŚCIOWO (polarność TAK, przypisanie do pola w innej warstwie) |
| C7 | PV/BESS przez transformator | CZĘŚCIOWO (PV OK, BESS luka, InverterSource bez walidacji) |
| C8 | Obciążenie na nN | NIEZAIMPLEMENTOWANY |
| C9 | CB max 1 Relay | ZAIMPLEMENTOWANY |
| C10 | Zwarcie na Bus | ZAIMPLEMENTOWANY |

### Kategorie A-B, D-G: 87% pokryte testami, 51% pokryte strażnikami
- 5 niezmienników bez testu ani strażnika (B5, D5, D6, D7, A3 bez strażnika)
- 22 niezmienników (49%) bez strażnika CI

---

## DOKUMENTY — SPÓJNOŚĆ KRZYŻOWA

### Brakujące referencje (priorytet WYSOKI)
- SYSTEM_SPEC nie linkuje do 8 pozostałych dokumentów V3 (brak sekcji „Dokumenty powiązane")
- SYSTEM_SPEC nie referencuje INVARIANTS_OSD_30_PLUS

### Rozbieżności z istniejącymi kanonami
- Format koperty operacji: V3 (płaski) vs KONTRAKT_OPERACJI (zagnieżdżony) vs kod (zagnieżdżony)
- Endpoint API: 3 różne ścieżki w 3 źródłach
- Odpowiedź operacji: V3 (5 pól) vs KONTRAKT_OPERACJI (10 pól) vs kod (8 pól)
- Liczba faz pipeline SLD: V3 (5) vs UX_FLOW (6) vs kod core (7)
- Nazwy pól payload: `dlugosc_m` vs `length_km`, `sk3_mva` vs `short_circuit_power_mva`

---

## PLAN NAPRAWCZY (ZAKTUALIZOWANE PR)

| PR | Dodatkowy zakres z audytu |
|----|--------------------------|
| **PR-UIV3-00** | Poprawki dokumentów: format koperty (zagnieżdżony), endpoint (zgodny z kodem), odpowiedź (dodanie 4 brakujących pól), linki krzyżowe w SYSTEM_SPEC, „Nakładka" zamiast „Overlay" |
| **PR-UIV3-01** | Unifikacja rejestrów operacji, UUID zamiast Date.now(), implementacja idempotentności (Redis), unifikacja Snapshot i Readiness w DomainOpResponse |
| **PR-UIV3-02** | Dodanie snapshotHash, aktualizacja trybów SLD (zgodność z kodem), synchronizacja URL |
| **PR-UIV3-03** | Decyzja architektoniczna: 1 pipeline SLD. Migracja SldEditorStore (usunięcie draft graph). ElementRefV1 w VisualGraph |
| **PR-UIV3-05** | Sekcja „Gotowość" w inspektorze elementu |
| **Dodatkowy PR** | Walidator topologiczny: reguły C1, C3, C4, C8. Naprawa BESS SN w oze_validators. Naprawa golden network |
| **Dodatkowy PR** | Rozszerzenie CI: `extended-guards.yml` z 10+ strażnikami |

---

*Raport wiążący. Rozbieżności krytyczne (K1-K8) wymagają rozwiązania przed wdrożeniem PR-UIV3-01.*
