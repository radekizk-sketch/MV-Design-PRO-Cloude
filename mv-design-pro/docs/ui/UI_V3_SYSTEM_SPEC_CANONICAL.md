# UI V3 — SPECYFIKACJA SYSTEMU (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: Kanoniczna architektura UI V3 — „system operacyjny inżyniera sieci SN"

---

## 1. CEL

UI V3 to architektura interfejsu użytkownika systemu MV-DESIGN-PRO, zaprojektowana jako **system operacyjny inżyniera sieci średniego napięcia**. Nie jest to zestaw ekranów — to spójna platforma narzędziowa, w której każdy widok jest deterministyczną funkcją jednego stanu prawdy (Snapshot).

---

## 2. ZASADY NADRZĘDNE

### 2.1 Jedna prawda (Single Source of Truth)
- **Snapshot** jest jedynym źródłem prawdy o stanie sieci.
- UI nie przechowuje topologii, nie ma „draft graph", nie ma kopii modelu.
- Każda zmiana w sieci przechodzi wyłącznie przez **operację domenową** → nowy Snapshot.
- Widoki logiczne = deterministyczna funkcja Snapshot.

### 2.2 Operacyjność
- Interfejs zorganizowany wokół **zadań inżyniera**, nie abstrakcji programistycznych.
- Każdy etap pracy ma: status gotowości + wskazanie braków + FixAction.
- Przepływ: GPZ → magistrala → stacje → odgałęzienia → ring/NOP → katalogi → analizy → raporty.

### 2.3 Determinizm
- Ten sam Snapshot → identyczny SLD (geometria, układ, symbole, kolejności).
- Brak reflow przy zoomie; kamera nie wpływa na układ.
- Wszystkie wyjścia (SLD, eksport, overlay) deterministyczne i weryfikowalne hashami.

### 2.4 Ergonomia przemysłowa
- Klasa narzędziowa DIgSILENT PowerFactory / ETAP.
- Inspektor elementu: dane katalogowe + dane jawne + wyniki + gotowość w jednym miejscu.
- Drzewo projektu i wyniki: organizacja jak w narzędziach klasy przemysłowej.

---

## 3. ARCHITEKTURA WARSTWOWA UI V3

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WARSTWA PREZENTACJI                             │
│  React 18 + TypeScript 5 + Tailwind CSS                            │
│  Odpowiedzialność: renderowanie, obsługa zdarzeń użytkownika       │
│  ZAKAZ: fizyka, mutacja modelu, lokalna prawda topologiczna        │
│  Pliki: frontend/src/ui/sld/, frontend/src/ui/wizard/,             │
│         frontend/src/ui/property-grid/, frontend/src/ui/topology/  │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ emituje operacje domenowe
┌─────────────────▼───────────────────────────────────────────────────┐
│               WARSTWA KLIENTA OPERACJI                              │
│  Odpowiedzialność: wysyłka DomainOpEnvelope do backendu,           │
│  idempotentność, retry, log deterministyczny                       │
│  Pliki: frontend/src/ui/sld/domainOpsClient.ts,                    │
│         frontend/src/ui/topology/domainApi.ts,                     │
│         frontend/src/modules/sld/cdse/operationExecutor.ts         │
│  Kontrakt wejścia: DomainOpEnvelope                                │
│  Kontrakt wyjścia: DomainOpResponse (snapshot + readiness +        │
│                     fixActions + delta)                             │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ HTTP POST /api/domain-operations
┌─────────────────▼───────────────────────────────────────────────────┐
│            WARSTWA STANU URUCHOMIENIOWEGO UI                        │
│  Odpowiedzialność: przechowywanie minimalnego stanu sesji          │
│  Zawartość:                                                        │
│    (a) snapshot (bieżąca migawka)                                  │
│    (b) readiness (profil gotowości)                                │
│    (c) fixActions (sugestie naprawy)                               │
│    (d) selection (selekcja elementów)                               │
│    (e) camera (pozycja kamery SLD)                                 │
│    (f) mode (tryb narzędzia: MODEL_EDIT|CASE_CONFIG|RESULT_VIEW)   │
│    (g) activeCase (bieżący przypadek obliczeniowy)                 │
│    (h) activeRunId (bieżący przebieg)                              │
│  ZAKAZ: topologia, graf, wyniki obliczeń, historia operacji        │
│  Pliki: frontend/src/ui/app-state/store.ts,                       │
│         frontend/src/ui/selection/store.ts,                        │
│         frontend/src/ui/topology/snapshotStore.ts                  │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ deterministyczna transformacja
┌─────────────────▼───────────────────────────────────────────────────┐
│               WARSTWA WIDOKÓW LOGICZNYCH                            │
│  Odpowiedzialność: deterministyczna transformacja Snapshot na       │
│  struktury renderowalne (VisualGraph, drzewo topologii,            │
│  siatka właściwości, tabele wyników)                               │
│  ZAKAZ: obliczenia domenowe, fizyka, mutacja stanu                 │
│  Kontrakt: Snapshot → VisualGraphV1 → LayoutResultV1               │
│  Pliki: frontend/src/ui/sld/core/topologyAdapterV2.ts,            │
│         frontend/src/ui/sld/core/layoutPipeline.ts,                │
│         frontend/src/ui/sld/core/stationBlockBuilder.ts            │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ render-ready dane
┌─────────────────▼───────────────────────────────────────────────────┐
│                   WARSTWA SLD                                       │
│  Odpowiedzialność: deterministyczny render schematu jednokreskowego│
│  Pipeline: TopologyAdapter → VisualGraph → LayoutPipeline →        │
│            StationBlockBuilder → Renderer                          │
│  Overlay: g(G, S(t)) — nałożenie wyników bez modyfikacji geometrii │
│  ZAKAZ: mutacja modelu, fizyka, decyzje domenowe                   │
│  Pliki: frontend/src/engine/sld-layout/,                           │
│         frontend/src/ui/sld/core/,                                 │
│         frontend/src/ui/sld/EtapSymbolRenderer.tsx,                │
│         frontend/src/ui/sld/BranchRenderer.tsx                     │
└─────────────────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────┐
│           WARSTWA INSPEKTORA I FORMULARZY                           │
│  Odpowiedzialność: wyświetlanie danych elementu,                   │
│  emisja operacji domenowych (nie mutacji bezpośredniej)             │
│  Zawartość: dane katalogowe, dane jawne, wyniki, gotowość          │
│  Pliki: frontend/src/ui/property-grid/,                            │
│         frontend/src/ui/sld/inspector/,                            │
│         frontend/src/ui/engineering-readiness/                     │
└─────────────────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────┐
│           WARSTWA ANALIZ I PORÓWNAŃ                                 │
│  Odpowiedzialność: wyświetlanie wyników obliczeń,                  │
│  porównanie wariantów, overlay delta, raporty                      │
│  ZAKAZ: fizyka                                                     │
│  Pliki: frontend/src/ui/results-workspace/,                        │
│         frontend/src/ui/comparisons/,                              │
│         frontend/src/ui/sld-overlay/,                              │
│         frontend/src/ui/proof/                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. KONTRAKTY WEJŚĆ/WYJŚĆ

### 4.1 Kontrakt operacji domenowej
```
Wejście (FE → BE):
  DomainOpEnvelope {
    project_id: string
    snapshot_base_hash: string       // hash migawki bazowej (optimistic concurrency)
    operation: string                // np. "continue_trunk_segment_sn"
    payload: Record<string, unknown> // parametry operacji (jawne, deterministyczne)
    idempotency_key: string          // UUID generowany przez klienta
  }

Wyjście (BE → FE):
  DomainOpResponse {
    snapshot: NetworkSnapshot         // nowa migawka (niemutowalna)
    readiness: ReadinessProfileV1     // profil gotowości po operacji
    fix_actions: FixAction[]          // sugestie naprawy braków
    delta: DomainOpDelta              // lista zmienionych elementów
    operation_log_entry: LogEntry     // wpis do dziennika operacji
  }
```

### 4.2 Kontrakt SLD pipeline
```
Wejście:
  NetworkSnapshot (lub EnergyNetworkModel) → TopologyAdapterV2

Transformacja:
  TopologyAdapterV2 → VisualGraphV1
  VisualGraphV1 → LayoutPipeline (5 faz)
  LayoutPipeline → LayoutResultV1
  LayoutResultV1 + GeometryOverrides → EffectiveLayout (applyOverrides)

Wyjście:
  EffectiveLayout → Renderer (SVG/Canvas)

Overlay (niezależna ścieżka):
  ResultSetV1 + LayoutResultV1 → ResultJoin → OverlayTokens → OverlayRenderer
```

### 4.3 Kontrakt gotowości/FixActions → nawigacja UI
```
ReadinessProfileV1 {
  areas: ReadinessAreaV1[]   // CATALOGS, TOPOLOGY, SOURCES, STATIONS, ...
  issues: ReadinessIssueV1[] // kod, komunikat_pl, element_id, priorytet
}

FixAction {
  action_type: "OPEN_MODAL" | "NAVIGATE_TO_ELEMENT" | "SELECT_CATALOG" | "ADD_MISSING_DEVICE"
  target_element_id: string
  target_modal?: string
  description_pl: string
}

Nawigacja UI:
  FixAction.OPEN_MODAL → otwarcie dialogu edycji elementu
  FixAction.NAVIGATE_TO_ELEMENT → selekcja elementu na SLD + centrowanie kamery
  FixAction.SELECT_CATALOG → otwarcie przeglądarki katalogu z filtrem
  FixAction.ADD_MISSING_DEVICE → otwarcie kreatora dodawania urządzenia
```

---

## 5. MODEL NAWIGACJI I STANU URL

### 5.1 URL jako deterministyczna reprezentacja
```
Schemat URL (hash-based routing):
  /#sld                          — edytor SLD (tryb MODEL_EDIT)
  /#sld?selected=<element_id>    — edytor z zaznaczonym elementem
  /#sld-view                     — podgląd SLD (tylko odczyt)
  /#results                      — inspektor wyników
  /#results-workspace            — przestrzeń robocza wyników
  /#proof                        — paczka dowodowa
  /#wizard                       — kreator sieci
  /#protection-results           — wyniki zabezpieczeń
  /#power-flow-results           — wyniki rozpływu mocy
  /#reference-patterns           — wzorce referencyjne
  /#enm-inspector                — inspektor modelu energetycznego
  /#fault-scenarios              — scenariusze zwarciowe
```

### 5.2 Synchronizacja selekcji ↔ URL
- Selekcja elementu na SLD aktualizuje parametr `selected` w URL.
- Zmiana URL (np. z drzewa topologii) centruje kamerę na wybranym elemencie.
- Synchronizacja: `frontend/src/ui/navigation/useUrlSelectionSync.ts`.

### 5.3 Tryby pracy
| Tryb | Opis | Dozwolone operacje |
|------|------|-------------------|
| MODEL_EDIT | Edycja modelu sieci | Pełne operacje domenowe |
| CASE_CONFIG | Konfiguracja przypadku | Zmiana parametrów przypadku |
| RESULT_VIEW | Podgląd wyników | Tylko odczyt, overlay, eksport |

---

## 6. KANONICZNY SŁOWNIK ETYKIET POLSKICH

| Termin techniczny | Etykieta polska w UI |
|-------------------|---------------------|
| Bus | Szyna |
| Branch | Odcinek |
| Line | Linia napowietrzna |
| Cable | Kabel |
| Transformer2W | Transformator dwuuzwojeniowy |
| Switch | Łącznik |
| Breaker / CB | Wyłącznik |
| Disconnector / DS | Odłącznik |
| Source | Źródło |
| External Grid | Zasilanie sieciowe (GPZ) |
| Generator | Generator |
| Inverter | Falownik |
| Load | Obciążenie |
| Station | Stacja |
| Substation | Stacja elektroenergetyczna |
| Field / Bay | Pole rozdzielnicze |
| Relay | Zabezpieczenie (przekaźnik) |
| Study Case | Przypadek obliczeniowy |
| Analysis Run | Przebieg analizy |
| Snapshot | Migawka |
| Readiness | Gotowość |
| Fix Action | Akcja naprawcza |
| Trunk | Magistrala |
| Feeder | Odejście |
| Spur / Tap | Odgałęzienie |
| Ring | Pierścień |
| NOP (Normal Open Point) | Punkt normalnie otwarty |
| SLD | Schemat jednokreskowy |
| Overlay | Nakładka wyników |
| Proof Pack | Paczka dowodowa |
| Type Library / Catalog | Biblioteka typów / Katalog |
| Catalog Ref | Odwołanie katalogowe |
| Materialization | Materializacja (typu) |
| Power Flow | Rozpływ mocy |
| Short Circuit | Zwarcie |
| Protection Coordination | Koordynacja zabezpieczeń |
| TCC | Charakterystyka czasowo-prądowa |
| Voltage Profile | Profil napięciowy |
| Sensitivity | Analiza wrażliwości |
| Boundary | Granica (interpretacyjna) |
| Eligibility | Kwalifikacja (do analiz) |
| Batch | Obliczenia wsadowe |

---

## 7. WYNIKI RÓL

### 7.1 Główny Architekt Systemu

**Decyzje architektoniczne:**
1. UI V3 oparte na wzorcu CQRS-lite: operacje domenowe (komendy) oddzielone od widoków (zapytania).
2. Snapshot jako jedyne źródło prawdy — brak „draft graph" w UI.
3. Warstwa klienta operacji z idempotentności opartą na kluczu UUID.
4. Optimistic concurrency przez `snapshot_base_hash` w kopercie operacji.
5. Deterministyczna transformacja Snapshot → VisualGraph — bez stanów pośrednich.
6. URL jako kanoniczny nośnik stanu nawigacyjnego (selekcja, tryb, panel).
7. Brak feature flag na krytycznej ścieżce (SLD pipeline, operacje domenowe).
8. Overlay jako czysta funkcja g(Layout, Results) bez modyfikacji geometrii.
9. FixAction jako jedyny mechanizm nawigacji naprawczej (nie toast, nie alert).
10. Zamrożone API wyników (ResultSetV1) — UI konsumuje, nie interpretuje fizycznie.
11. Magazyny Zustand pogrupowane na: globalny, SLD, overlay, wyniki — bez cyklicznych zależności.
12. Tryby pracy (MODEL_EDIT, CASE_CONFIG, RESULT_VIEW) bramkują UI widocznością, nie kodem.

**Niezmienniki:**
1. `∀ snapshot S: render(S) = render(S)` — ten sam Snapshot → identyczny SLD.
2. `∀ operacja O: response(O).snapshot ≠ request(O).snapshot` — operacja zawsze daje nową migawkę.
3. `∀ element E: E.readiness ∈ ReadinessProfileV1` — każdy element ma profil gotowości.
4. `∀ FixAction FA: FA prowadzi do dialogu lub nawigacji` — brak martwych FixAction.
5. Klient operacji nie przechowuje stanu między wywołaniami (bezstanowy).
6. URL deterministycznie odwzorowuje stan widoku.
7. Brak fizyki w warstwie prezentacji i widoków logicznych.
8. Overlay nie modyfikuje geometrii SLD.
9. Brak PCC w całym kodzie UI (grep-zero).
10. Brak nazw kodowych (Pxx) w ciągach widocznych w UI.

**Ryzyka i mitigacje:**
| Ryzyko | Mitigacja |
|--------|----------|
| Race condition przy równoczesnych operacjach | Optimistic concurrency + snapshot_base_hash |
| Rozjazd stanu UI i backendu | Odświeżanie snapshot po każdej operacji |
| Nadmiar magazynów Zustand | Konsolidacja wg domeny (max 6 grup) |
| Złożoność pipeline SLD | Golden render artefacts + testy deterministyczne 100× |

### 7.2 Architekt Interfejsu Użytkownika

**Decyzje architektoniczne:**
1. POWERFACTORY_LAYOUT jako kanoniczny układ strony (toolbar + sidebar + canvas + inspektor).
2. Drzewo topologii zawsze widoczne w sidebarze (jak w PowerFactory).
3. Inspektor elementu: 4 sekcje (Dane katalogowe, Dane jawne, Wyniki, Gotowość).
4. Kontekstowe menu prawego przycisku: operacje zależne od typu elementu i trybu.
5. Panel gotowości inżynierskiej: lista braków z FixAction (jeden klik do celu).
6. Kreator sieci jako emiter operacji domenowych (nie lokalna baza danych).
7. Porównywanie wyników: overlay delta na SLD + tabela różnic obok.
8. Eksport SLD: deterministyczny PNG/SVG z metadanymi.
9. Pasek statusu: tryb, aktywny przypadek, status wyników — zawsze widoczny.
10. Brak modali blokujących bez akcji naprawczej.

**Niezmienniki:**
1. Każdy dialog ma przycisk „Zapisz" emitujący operację domenową.
2. Żaden dialog nie mutuje stanu UI poza selekcją.
3. Kreator nie przechowuje „lokalnej prawdy" — odczytuje ze Snapshot.
4. Drzewo topologii odzwierciedla Snapshot, nie „pamięć podręczną".
5. Inspektor wyświetla dane bezpośrednio ze Snapshot (+ wyników jeśli dostępne).
6. Etykiety w UI wyłącznie po polsku (słownik kanoniczny §6).
7. Brak ukrytych stanów poza URL i wymienionymi magazynami.
8. FixAction zawsze nawiguje do konkretnego elementu lub dialogu.
9. Zoom i przesunięcie kamery nie powodują przeliczenia układu.
10. Kolejność elementów w listach deterministyczna (sortowanie po ID lub nazwie).

### 7.3 Architekt Domeny Backend

**Decyzje architektoniczne:**
1. 39 operacji kanonicznych z jawnym payload JSON.
2. Koperta operacji (DomainOpEnvelope) zawiera hash bazowy dla optimistic concurrency.
3. Odpowiedź operacji zawsze zawiera: snapshot + readiness + fixActions + delta.
4. Snapshot niemutowalny (frozen dataclass) z odciskiem SHA-256.
5. ReadinessProfileV1 obliczany po każdej operacji.
6. FixAction mapowany z kodu gotowości (resolve_fix_action).
7. Walidacja ENM przed emisją nowej migawki.
8. Brak „lokalnej prawdy" w kreatorze — kreator czyta ze Snapshot.
9. Katalog typów niemutowalny — materializacja jako osobna operacja.
10. Result API zamrożone — brak zmian bez podniesienia wersji głównej.

**Niezmienniki:**
1. Operacja domenowa jest atomowa (albo sukces z nową migawką, albo błąd).
2. Snapshot.fingerprint = SHA-256 deterministyczny.
3. Readiness obliczany synchronicznie po każdej operacji.
4. FixAction nie mutuje modelu — tylko nawiguje UI.
5. Walidator ENM nie przepuszcza nieprawidłowych migawek.
6. Brak PV/BESS na SN bez transformatora w torze.
7. Stacja jest kontenerem logicznym (brak impedancji).
8. Przypadek obliczeniowy nie mutuje modelu sieci.
9. Zmiana modelu unieważnia wyniki wszystkich przypadków.
10. Katalog typów wersjonowany — drift detection aktywny.

### 7.4 Inżynier Systemów Elektroenergetycznych

**Decyzje architektoniczne:**
1. Topologia: GPZ → magistrala → stacje → odgałęzienia → ring/NOP.
2. Zabezpieczenie (Relay) przypięte do wyłącznika, nad nim w osi pola.
3. PV/BESS: zakaz przyłączenia do SN bez transformatora (walidacja twarda).
4. NOP: punkt normalnie otwarty na pierścieniu — wyłącznik w pozycji rozłączonej.
5. Konfiguracja rozdzielnicy: CB + DS w standardowych kombinacjach.
6. Gotowość do analiz: bramka wielopoziomowa (CATALOGS → TOPOLOGY → SOURCES → ...).
7. Overlay wyników: prądy zwarciowe, spadki napięć, obciążenia — na odcinkach i szynach.
8. Profil napięciowy: wizualizacja wzdłuż magistrali od GPZ.
9. Koordynacja zabezpieczeń: TCC na wspólnym wykresie.
10. Raporty: format zgodny z wymogami OSD (tabele, schematy, dowody).

**Niezmienniki:**
1. GPZ ma dokładnie jedną szynę zasilającą SN.
2. Magistrala to ciąg odcinków bez odgałęzień (linia prosta topologicznie).
3. Stacja ma co najmniej jedno pole rozdzielnicze.
4. Ring wymaga dokładnie jednego NOP.
5. Każdy odcinek SN ma przypisany typ katalogowy (linia lub kabel).
6. Transformator SN/nN przyłączony do pola stacji po stronie SN.
7. Źródło OZE (PV/BESS) przyłączone przez transformator nN/SN.
8. Wyłącznik ma dokładnie jeden zabezpieczenie nadprądowe (lub brak).
9. Obciążenie przyłączone do szyny nN stacji.
10. Scenariusz zwarciowy definiowany na szynie (nie na odcinku).

### 7.5 Audytor Determinizmu i Jakości

**Decyzje architektoniczne:**
1. Golden render artefacts: 5 sieci referencyjnych z zamrożonym hashem SLD.
2. Test deterministyczny 100×: ten sam Snapshot → identyczny hash VisualGraph.
3. Test permutacyjny 50×: zmiana kolejności wejść nie zmienia wyniku.
4. Test budżetu wydajności: układ SLD < 50ms dla sieci 200 elementów.
5. Grep-zero: PCC, BoundaryNode, zakazane terminy — 0 trafień w kodzie UI.
6. Strażnicy CI: minimum 16 strażników w 4 przepływach pracy.
7. Snapshot fingerprint: SHA-256 deterministyczny, weryfikowany w testach.
8. Eksport: ten sam Snapshot → identyczny PNG (piksel po pikselu).
9. Proof Pack: ten sam run_id → identyczny dokument.
10. Brak feature flag na krytycznej ścieżce.

**Niezmienniki:**
1. `hash(render(S, i)) = hash(render(S, j))` dla dowolnych i, j (powtórzeń).
2. `render(shuffle(elements(S))) = render(elements(S))` — niezmienniczość permutacyjna.
3. `pcc_zero_guard.py` → 0 trafień w każdym PR.
4. `no_codenames_guard.py` → 0 trafień w ciągach UI.
5. `sld_determinism_guards.py` → PASS dla każdego PR.
6. `resultset_v1_schema_guard.py` → zgodność schematu w każdym PR.
7. Czas layoutu SLD ≤ 50ms dla sieci 200 elementów.
8. Czas renderowania SLD ≤ 100ms dla sieci 200 elementów.
9. Golden networks: hash stabilny między wersjami.
10. E2E: pełny przepływ GPZ→ring→analiza→raport bezbłędny.

### 7.6 Redaktor Dokumentacji

**Decyzje architektoniczne:**
1. Dokumenty BINDING w `mv-design-pro/docs/ui/` z prefiksem `UI_V3_`.
2. Każdy dokument ma: Status, Zakres, Kontrakty, Mapowanie na kod, Testy.
3. Słownik kanoniczny PL jako jedyne źródło etykiet UI.
4. Dokumenty specyfikacji (`docs/spec/`) jako najwyższy autorytet.
5. INDEX.md aktualizowany przy każdym nowym dokumencie.
6. Brak anglicyzmów w treści UI i dokumentów wiążących.
7. Repo hygiene: czyszczenie martwego kodu, konsolidacja duplikatów.
8. Plan PR z dokładnymi ścieżkami plików i DoD.
9. Changelog per dokument BINDING.
10. Weryfikacja krzyżowa: każdy dokument referencuje powiązane kanony.

**Niezmienniki:**
1. `docs/spec/` ma najwyższy priorytet w hierarchii.
2. Każdy dokument BINDING ma datę i wersję.
3. Etykiety UI zgodne ze słownikiem kanonicznym.
4. Brak dokumentów-sierot (bez referencji z INDEX).
5. Brak martwych linków w dokumentacji (docs_guard).
6. Nazwy plików dokumentów deterministyczne (bez losowych sufiksów).
7. Każdy kontrakt UI mapowany na konkretne pliki kodu.
8. Historia zmian śledzona przez git (nie wewnętrzne changelog).
9. Brak duplikacji treści między dokumentami BINDING.
10. Każdy nowy dokument referencuje istniejące kanony.

---

## 8. ZGODNOŚĆ Z ISTNIEJĄCĄ ARCHITEKTURĄ

UI V3 nie zmienia:
- Solverów (`network_model/solvers/`) — bez dotykania.
- Zamrożonego Result API (`domain/result_contract_v1.py`) — bez dotykania.
- Pipeline dowodowego (`application/proof_engine/`) — bez dotykania.
- Strażników CI — UI V3 dodaje nowe, nie modyfikuje istniejących.

UI V3 rozszerza:
- Klienta operacji domenowych (nowy moduł idempotentności).
- Magazyny stanu (konsolidacja istniejących ~37 na ~6 grup).
- Nawigację URL (rozszerzenie parametrów).
- Testowe artefakty golden render (nowe sieci referencyjne).

---

*Dokument wiążący. Zmiany wymagają przeglądu architektonicznego.*
