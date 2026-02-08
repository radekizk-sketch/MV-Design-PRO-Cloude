# SPECYFIKACJA KANONICZNA MV-DESIGN-PRO
# ROZDZIAŁ 2: MODEL DOMENOWY ENM — BYTY, GRANICE, SEMANTYKA

**Wersja:** 1.0
**Status:** CANONICAL & BINDING
**Data:** 2026-02-08
**Bazowy dokument:** Rozdział 1 (nadrzędny), `SYSTEM_SPEC.md` v3.0, `AUDIT_SPEC_VS_CODE.md` §9
**Kod referencyjny:** `enm/models.py` (291 linii), `enm/mapping.py` (250 linii), `enm/validator.py` (513 linii)

---

## 2.1 Zasada nadrzędna ENM (POTWIERDZENIE)

> **ENM (EnergyNetworkModel) opisuje WYŁĄCZNIE fizyczną topologię i parametry elektryczne sieci elektroenergetycznej.
> ENM nie przechowuje decyzji wizualnych, organizacyjnych ani algorytmicznych solverów.**

Konsekwencje bezpośrednie:
- ENM ≠ SLD — SLD jest projekcją wizualną ENM, nie odwrotnie.
- ENM ≠ Kreator — Kreator jest kontrolerem budowy ENM, nie modelem danych.
- ENM ≠ Konfiguracja solvera — współczynniki normowe (c_min, c_max), typ zwarcia, metoda iteracyjna należą do Case, nie do ENM.
- ENM ≠ Wyniki obliczeń — node_type, voltage_magnitude_pu, active_power_mw są parametrami solverowymi przypisywanymi po mapowaniu, NIE polami ENM.

**Źródło AS-IS:** `enm/models.py` — żaden byt ENM nie zawiera pól obliczeniowych solvera. Pola solverowe istnieją wyłącznie w `network_model/core/node.py` (Node) po mapowaniu.

---

## 2.2 Warstwy i granice odpowiedzialności

### 2.2.1 Co NALEŻY do ENM (zamknięta lista)

ENM przechowuje WYŁĄCZNIE następujące kategorie danych:

| Kategoria | Przykłady | Źródło w kodzie |
|---|---|---|
| Węzły obliczeniowe | Bus, Junction | `models.py:85`, `models.py:254` |
| Gałęzie energetyczne | OverheadLine, Cable | `models.py:106`, `models.py:118` |
| Aparaty łączeniowe | SwitchBranch, FuseBranch | `models.py:131`, `models.py:138` |
| Transformatory | Transformer | `models.py:155` |
| Źródła zasilania | Source | `models.py:180` |
| Generatory | Generator | `models.py:212` |
| Odbiory | Load | `models.py:200` |
| Rozgałęzienia topologiczne | Junction | `models.py:254` |
| Parametry znamionowe elementów | r_ohm_per_km, sn_mva, uk_percent | z `catalog_ref` → Type |
| Parametry zmienne instancji | length_km, tap_position, p_mw | z kreatora |
| Referencje do katalogu typów | catalog_ref | `models.py:103`, `models.py:172` |
| Nagłówek i metadane projektu | ENMHeader, ENMDefaults | `models.py:69`, `models.py:64` |
| Typy wspierające | GroundingConfig, BusLimits, BranchRating, GenLimits | `models.py:22-43` |

### 2.2.2 Co NIE NALEŻY do ENM (BINDING)

Poniższe kategorie danych **NIE SĄ i NIE MOGĄ BYĆ** częścią ENM:

| Kategoria wykluczona | Uzasadnienie | Warstwa docelowa |
|---|---|---|
| Substation, Bay | Byty organizacyjne — logiczne grupowanie, nie fizyka | ENM Meta (SPEC_03) |
| Corridor | Byt layoutowy — trasowanie wizualne magistrali | SLD Layout (SPEC_05) |
| Współczynniki normowe solverów (c_min, c_max) | Parametry obliczeniowe normy IEC 60909 | Case (Study Case) |
| Scenariusze obliczeniowe | Konfiguracja obliczeń | Case (Study Case) |
| Dane wizualne (pozycje, style, kolory) | Prezentacja | SLD / UI |
| node_type (SLACK, PQ, PV) | Klasyfikacja solverowa węzła | NetworkGraph (po mapowaniu) |
| voltage_magnitude_pu, voltage_angle_rad | Wyniki obliczeniowe | Solver Results |
| active_power_mw (bilans na węźle) | Wartość obliczeniowa | Solver (mapowanie P/Q z Load/Generator) |
| Wyniki analiz i śladów obliczeniowych | Dane wyjściowe solverów | Results / White Box |

**Zasada weryfikacji:** Jeśli pole nie wpływa na fizyczną topologię lub parametry elektryczne sieci, NIE NALEŻY do ENM.

### 2.2.3 Byty obecne w `enm/models.py` ale NIEBĘDĄCE bytami obliczeniowymi ENM

W kodzie `enm/models.py` istnieją byty, które formalnie są częścią struktury `EnergyNetworkModel`, ale **NIE SĄ widoczne dla solvera** i NIE wpływają na obliczenia:

| Byt | Klasa | Warstwa logiczna | Widoczny dla solvera |
|---|---|---|---|
| Substation | `Substation(ENMElement)` | ENM Meta (organizacja) | **NIE** |
| Bay | `Bay(ENMElement)` | ENM Meta (organizacja) | **NIE** |
| Corridor | `Corridor(ENMElement)` | SLD Layout (wizualizacja) | **NIE** |

**Weryfikacja AS-IS:** `enm/mapping.py` — funkcja `map_enm_to_network_graph()` nie importuje i nie przetwarza `Substation`, `Bay` ani `Corridor`. Solver ich nie widzi.

**Status specyfikacyjny:** Byty te zostaną opisane w odrębnych rozdziałach:
- Substation, Bay → SPEC_03_ENM_META.md (organizacja logiczna)
- Corridor → SPEC_05_SLD_LAYOUT_ROUTE.md (wizualizacja)

Niniejszy rozdział opisuje WYŁĄCZNIE byty obliczeniowe ENM.

---

## 2.3 Byty ENM — lista kanoniczna (ZAMKNIĘTA)

### 2.3.1 Definicja zamknięcia

Poniższa lista jest **zamknięta i wyczerpująca**. Solver widzi WYŁĄCZNIE byty z tej listy (po mapowaniu ENM → NetworkGraph). Dodanie nowego bytu obliczeniowego do ENM wymaga:
1. Formalnego ADR (Architecture Decision Record).
2. Aktualizacji niniejszego rozdziału.
3. Aktualizacji `enm/mapping.py`.
4. Aktualizacji `enm/validator.py`.
5. Aktualizacji testów.

### 2.3.2 Lista bytów obliczeniowych ENM

| # | Byt ENM | Klasa Python | Wpływ na solver | Mapowanie na NetworkGraph |
|---|---|---|---|---|
| 1 | **Bus** | `Bus(ENMElement)` | TAK — węzeł obliczeniowy | Bus → Node |
| 2 | **Junction** | `Junction(ENMElement)` | TAK — rozgałęzienie topologiczne | Junction → topologia (Bus kind) |
| 3 | **OverheadLine** | `OverheadLine(BranchBase)` | TAK — impedancja R/X/B | OverheadLine → LineBranch |
| 4 | **Cable** | `Cable(BranchBase)` | TAK — impedancja R/X/C | Cable → LineBranch |
| 5 | **SwitchBranch** | `SwitchBranch(BranchBase)` | TAK — topologia (OPEN/CLOSED) | SwitchBranch → Switch |
| 6 | **FuseBranch** | `FuseBranch(BranchBase)` | TAK — topologia + prąd znamionowy | FuseBranch → Switch (typ FUSE) |
| 7 | **Transformer** | `Transformer(ENMElement)` | TAK — transformacja impedancji | Transformer → TransformerBranch |
| 8 | **Source** | `Source(ENMElement)` | TAK — iniekcja mocy / impedancja zastępcza | Source → virtual GND + LineBranch (impedancja) |
| 9 | **Generator** | `Generator(ENMElement)` | TAK — iniekcja mocy / źródło prądowe | Generator → P/Q na Node (AS-IS) / InverterSource (TO-BE) |
| 10 | **Load** | `Load(ENMElement)` | TAK — pobór mocy | Load → ujemne P/Q na Node |

### 2.3.3 Inwariant: solver nie widzi bytów spoza listy

Mapowanie `map_enm_to_network_graph()` (`enm/mapping.py`) przetwarza WYŁĄCZNIE:
- `enm.buses` → Node
- `enm.branches` (OverheadLine, Cable, SwitchBranch, FuseBranch) → LineBranch / Switch
- `enm.transformers` → TransformerBranch
- `enm.sources` → virtual GND Node + impedance LineBranch
- `enm.loads` → P/Q adjustments na Node
- `enm.generators` → P/Q adjustments na Node

Pola `enm.substations`, `enm.bays`, `enm.junctions`, `enm.corridors` **NIE SĄ przetwarzane** przez mapper. Junction jest częścią topologii logicznej ENM, ale w obecnym mapowaniu realizowany jest jako Bus z odpowiednimi połączeniami Branch.

---

## 2.4 Semantyka węzłów

### 2.4.1 Bus — węzeł obliczeniowy

**Definicja:** Punkt w sieci elektroenergetycznej o jednym potencjale elektrycznym. Podstawowy element topologiczny, na którym solver wykonuje bilans mocy i oblicza napięcia.

**Kontrakt AS-IS** (`enm/models.py:85-91`):

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `id` | UUID | ENMElement (auto) | Identyfikator unikatowy |
| `ref_id` | str | ENMElement (kreator) | Identyfikator referencyjny |
| `name` | str | ENMElement (kreator) | Nazwa czytelna |
| `voltage_kv` | float | Kreator / typ przyłączonych elementów | Napięcie znamionowe szyny [kV] |
| `frequency_hz` | float \| None | ENMDefaults (50.0) | Częstotliwość znamionowa [Hz] |
| `phase_system` | Literal["3ph"] | Stała | System fazowy |
| `zone` | str \| None | Kreator | Strefa napięciowa |
| `grounding` | GroundingConfig \| None | Kreator | Konfiguracja uziemienia |
| `nominal_limits` | BusLimits \| None | Kreator | Dopuszczalne zakresy napięcia |
| `tags` | list[str] | ENMElement | Tagi użytkownika |
| `meta` | dict | ENMElement | Metadane dowolne |

**Inwarianty Bus:**
- Bus MUSI mieć `voltage_kv > 0` (walidacja E004).
- Bus NIE zawiera `node_type` — to pole solverowe, przypisywane w `mapping.py:74-91`.
- Bus NIE zawiera `voltage_magnitude_pu` ani `voltage_angle_rad` — to wyniki solvera.
- Bus NIE zawiera `active_power_mw` ani `reactive_power_mvar` — bilans mocy obliczany z Load/Generator w `mapping.py:54-59`.
- Napięcie znamionowe Bus jest parametrem fizycznym (projektowym), NIE parametrem obliczeniowym.

**Napięcie Bus strony generatora (Decision #19):** Jeśli Bus jest szyną niskonapięciową źródła OZE, jego napięcie znamionowe jest determinowane przez typ przyłączonego falownika z katalogu — nie jest wartością sztywną w specyfikacji, nie jest ręcznie wprowadzane przez użytkownika.

### 2.4.2 Junction — punkt rozgałęzienia

**Definicja:** Element topologiczny ENM modelujący punkt rozgałęzienia magistrali — miejsce, w którym magistrala dzieli się na odgałęzienia.

**Kontrakt AS-IS** (`enm/models.py:254-258`):

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `id` | UUID | ENMElement (auto) | Identyfikator unikatowy |
| `ref_id` | str | ENMElement (kreator) | Identyfikator referencyjny |
| `connected_branch_refs` | list[str] | Kreator | Referencje do gałęzi zbiegających się w punkcie |
| `junction_type` | Literal[...] | Kreator | Typ: T_node, sectionalizer, recloser_point, NO_point |

**Inwarianty Junction:**
- Junction NIE jest Bus — nie posiada własnego bilansu mocy ani napięcia znamionowego.
- Junction NIE posiada parametrów elektrycznych — jest wyłącznie oznaczeniem topologicznym.
- Junction MUSI mieć minimum 3 przyłączone gałęzie (walidacja W007).
- Junction nie pojawia się jako samodzielny Node w solverze — w mapowaniu jest realizowany przez Bus i Branch.

**Semantyczna różnica Bus vs Junction:**

| Cecha | Bus | Junction |
|---|---|---|
| Napięcie znamionowe | TAK (`voltage_kv`) | NIE |
| Bilans mocy | TAK (Load/Generator) | NIE |
| Mapowany na Node solvera | TAK (bezpośrednio) | NIE (przez Bus + Branch) |
| Przyłączanie źródeł/odbiorów | TAK | NIE |
| Punkt rozgałęzienia magistrali | NIE (węzeł ogólny) | TAK (wyłącznie) |

**Zakaz:** Traktowanie Junction jak Bus (przypisywanie napięcia, źródeł, odbiorów do Junction). Junction jest punktem topologicznym, nie obliczeniowym.

---

## 2.5 Gałęzie i aparaty (Branch)

### 2.5.1 Definicja gałęzi

**Branch** reprezentuje fizyczny tor przepływu energii elektrycznej między dwoma węzłami (Bus). Każda gałąź posiada dokładnie dwa końce (`from_bus_ref`, `to_bus_ref`) i stan (`status`: closed/open).

**Kontrakt bazowy AS-IS** (`enm/models.py:99-103`):

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `from_bus_ref` | str | Kreator | Referencja do Bus początkowego |
| `to_bus_ref` | str | Kreator | Referencja do Bus końcowego |
| `status` | Literal["closed", "open"] | Kreator / eksploatacja | Stan łączeniowy |
| `catalog_ref` | str \| None | Kreator | Referencja do typu w katalogu |

**Discriminated union** (`models.py:144-147`):
```
Branch = OverheadLine | Cable | SwitchBranch | FuseBranch
```

Dyskryminator: pole `type` — jednoznacznie identyfikuje rodzaj gałęzi.

### 2.5.2 OverheadLine — linia napowietrzna

**Definicja:** Gałąź energetyczna modelująca linię napowietrzną z impedancją rozłożoną (R, X, B per km).

**Kontrakt AS-IS** (`enm/models.py:106-115`):

| Pole | Typ | Źródło parametru | Opis |
|---|---|---|---|
| `type` | Literal["line_overhead"] | Stała | Dyskryminator |
| `length_km` | float | **Parametr zmienny** (kreator) | Długość linii [km] |
| `r_ohm_per_km` | float | **Parametr znamionowy** (typ / instancja) | Rezystancja jednostkowa [Ohm/km] |
| `x_ohm_per_km` | float | **Parametr znamionowy** (typ / instancja) | Reaktancja jednostkowa [Ohm/km] |
| `b_siemens_per_km` | float \| None | **Parametr znamionowy** (typ / instancja) | Susceptancja jednostkowa [S/km] |
| `r0_ohm_per_km` | float \| None | **Parametr znamionowy** | Rezystancja zerowa [Ohm/km] |
| `x0_ohm_per_km` | float \| None | **Parametr znamionowy** | Reaktancja zerowa [Ohm/km] |
| `b0_siemens_per_km` | float \| None | **Parametr znamionowy** | Susceptancja zerowa [S/km] |
| `rating` | BranchRating \| None | **Parametr znamionowy** | Obciążalność (In, Ith, Idyn) |

**Kompozycja (Decision #18):**
```
OverheadLine = LineType(catalog_ref) × length_km(kreator) [× impedance_override(ekspert)]
```

**Resolver AS-IS** (`catalog/resolver.py:136-217`):
Precedencja: `impedance_override > type_ref > instance`. Źródło parametru oznaczane przez `ParameterSource`.

### 2.5.3 Cable — kabel

**Definicja:** Gałąź energetyczna modelująca kabel podziemny z impedancją rozłożoną.

**Kontrakt AS-IS** (`enm/models.py:118-128`):
Identyczny z OverheadLine, z dodatkowym polem:

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `type` | Literal["cable"] | Stała | Dyskryminator |
| `insulation` | Literal["XLPE", "PVC", "PAPER"] \| None | Typ / instancja | Rodzaj izolacji |

**Kompozycja:** `Cable = CableType(catalog_ref) × length_km(kreator) [× impedance_override(ekspert)]`

### 2.5.4 SwitchBranch — łącznik

**Definicja:** Aparat łączeniowy modelowany jako gałąź bez istotnej impedancji. Wpływa na topologię obliczeniową: stan OPEN wyklucza gałąź z grafu solvera.

**Kontrakt AS-IS** (`enm/models.py:131-135`):

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `type` | Literal["switch", "breaker", "bus_coupler", "disconnector"] | Kreator | Rodzaj łącznika |
| `r_ohm` | float \| None | Typ / instancja | Rezystancja (zwykle pomijalna) |
| `x_ohm` | float \| None | Typ / instancja | Reaktancja (zwykle pomijalna) |

**Mapowanie AS-IS** (`mapping.py:129-145`): SwitchBranch → Switch (obiekt solvera). Stan `open` → `SwitchState.OPEN` (wyłączony z topologii solvera).

**Inwariant:** SwitchBranch nie jest gałęzią impedancyjną — nie wnosi istotnej impedancji do macierzy admitancji. Jego rola jest wyłącznie topologiczna (odcinanie torów).

### 2.5.5 FuseBranch — bezpiecznik

**Definicja:** Zabezpieczenie topikowe modelowane jako gałąź. Posiada prąd znamionowy. Wpływa na topologię (jak SwitchBranch).

**Kontrakt AS-IS** (`enm/models.py:138-141`):

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `type` | Literal["fuse"] | Stała | Dyskryminator |
| `rated_current_a` | float \| None | Typ / instancja | Prąd znamionowy bezpiecznika [A] |
| `rated_voltage_kv` | float \| None | Typ / instancja | Napięcie znamionowe [kV] |

**Mapowanie AS-IS** (`mapping.py:147-159`): FuseBranch → Switch (typ FUSE). Solver traktuje bezpiecznik jak łącznik z dodatkowymi parametrami znamionowymi.

### 2.5.6 Inwarianty gałęzi (BINDING)

1. Każda gałąź MUSI mieć `from_bus_ref` i `to_bus_ref` wskazujące na istniejące Bus (walidacja E003 — connectivity).
2. Gałąź impedancyjna (OverheadLine, Cable) MUSI mieć niezerową impedancję `r_ohm_per_km > 0 || x_ohm_per_km > 0` (walidacja E005).
3. Gałąź NIE MOŻE być pętlą (`from_bus_ref == to_bus_ref`).
4. Nie istnieją „wirtualne" gałęzie bez fizycznego odpowiednika — każda gałąź w ENM reprezentuje fizyczny element sieci.

**Zakaz:** Tworzenie gałęzi pomocniczych, tymczasowych, „obliczeniowych" lub „layoutowych" w ENM. Jeśli solver potrzebuje dodatkowych gałęzi (np. impedancja zastępcza źródła), tworzy je w NetworkGraph podczas mapowania — NIE w ENM.

---

## 2.6 Źródła i odbiory

### 2.6.1 Source — źródło zasilania (sieć zewnętrzna)

**Definicja:** Punkt zasilania sieci — modeluje sieć zewnętrzną (upstream) jako impedancję zastępczą Thevenina lub jako moc zwarciową.

**Kontrakt AS-IS** (`enm/models.py:180-192`):

| Pole | Typ | Źródło | Opis |
|---|---|---|---|
| `bus_ref` | str | Kreator | Szyna przyłączenia |
| `model` | Literal["thevenin", "short_circuit_power", "external_grid"] | Kreator | Model źródła |
| `sk3_mva` | float \| None | Kreator | Moc zwarciowa trójfazowa [MVA] |
| `ik3_ka` | float \| None | Kreator | Prąd zwarciowy trójfazowy [kA] |
| `r_ohm` | float \| None | Kreator | Rezystancja zastępcza [Ohm] |
| `x_ohm` | float \| None | Kreator | Reaktancja zastępcza [Ohm] |
| `rx_ratio` | float \| None | Kreator | Stosunek R/X |
| `r0_ohm`, `x0_ohm` | float \| None | Kreator | Składowe zerowe |
| `z0_z1_ratio` | float \| None | Kreator | Stosunek Z0/Z1 |
| `c_max`, `c_min` | float \| None | Kreator | Współczynniki napięciowe IEC 60909 |

**Source ≠ Generator (Decision #3):** Source modeluje sieć zewnętrzną (upstream system). Generator modeluje źródło wewnętrzne (maszynę lub falownik). Są to osobne byty ENM z osobnymi listami (`enm.sources`, `enm.generators`).

**Mapowanie AS-IS** (`mapping.py:188-248`): Source → virtual GND Node + impedancja LineBranch. Szyna źródła → Node typu SLACK z `voltage_magnitude = 1.0 pu`.

### 2.6.2 Generator — źródło wewnętrzne

**Definicja:** Źródło energii elektrycznej wewnątrz modelowanej sieci — maszyna synchroniczna lub generator energoelektroniczny (falownik PV, BESS, turbina wiatrowa).

**Kontrakt AS-IS** (`enm/models.py:212-217`):

| Pole | Typ | Źródło parametru | Opis |
|---|---|---|---|
| `bus_ref` | str | Kreator | Szyna przyłączenia |
| `p_mw` | float | **Parametr zmienny** (kreator) | Moc czynna [MW] |
| `q_mvar` | float \| None | **Parametr zmienny** (kreator) | Moc bierna [Mvar] |
| `gen_type` | Literal["synchronous", "pv_inverter", "wind_inverter", "bess"] \| None | Kreator / typ | Rodzaj generatora |
| `limits` | GenLimits \| None | Typ / kreator | Limity mocy |

**Generator NIE ma w AS-IS:**
- `catalog_ref` — **GAP** (Decision #15, TO-BE)
- `n_parallel` — **GAP** (Decision #17, TO-BE)

**Zasady modelowania generatora (BINDING):**
1. Generator jest elementem końcowym — przyłączany do Bus, nie jest węzłem.
2. Generator energoelektroniczny (`gen_type ∈ {pv_inverter, wind_inverter, bess}`) jest ZAWSZE elementem niskonapięciowym (nn). Napięcie znamionowe wynika z typu katalogowego (Decision #19).
3. Generator energoelektroniczny NIE MOŻE być przyłączony bezpośrednio do Bus SN (`voltage_kv > 1 kV`) — Decision #11.
4. Przyłączenie generatora do sieci SN wymaga jawnego transformatora nn/SN w ENM (Decision #12).
5. Ilość instancji równoległych (Decision #17, TO-BE): użytkownik podaje typ + liczbę (`n_parallel`). Solver oblicza łączny wkład: `Ik_total = N × k_sc × In_rated`.

**Mapowanie AS-IS** (`mapping.py:57-59`): Generator → P/Q adjustment na Node (sumowanie mocy czynnej i biernej na szynie przyłączenia).

**Mapowanie TO-BE** (Decision #14): Generator(`gen_type ∈ {pv_inverter, wind_inverter, bess}`) → InverterSource (`network_model/core/inverter.py`). InverterSource jest ograniczonym źródłem prądowym: `Ik = k_sc × In_rated`.

### 2.6.3 Load — odbiór

**Definicja:** Pobór mocy czynnej i biernej w punkcie sieci.

**Kontrakt AS-IS** (`enm/models.py:200-204`):

| Pole | Typ | Źródło parametru | Opis |
|---|---|---|---|
| `bus_ref` | str | Kreator | Szyna przyłączenia |
| `p_mw` | float | **Parametr zmienny** (kreator) | Moc czynna [MW] |
| `q_mvar` | float | **Parametr zmienny** (kreator) | Moc bierna [Mvar] |
| `model` | Literal["pq", "zip"] | **Parametr zmienny** (kreator) | Model odbioru |

**Mapowanie AS-IS** (`mapping.py:54-56`): Load → ujemne P/Q na Node (`bus_p -= load.p_mw`, `bus_q -= load.q_mvar`).

### 2.6.4 Zasady wspólne dla źródeł i odbiorów (BINDING)

1. Generator i Load są elementami końcowymi — nie są węzłami, nie mają własnego potencjału.
2. Generator i Load są przyłączane WYŁĄCZNIE do Bus (przez `bus_ref`).
3. W pełnej topologii fizycznej: Generator/Load powinien być przyłączany przez pole (feeder) — Decision #17 (zasada pisania). Kreator MUSI to wymuszać (K9a, K9b).
4. ENM nie przechowuje semantyki wizualnej — Generator/Load nie ma pozycji, koloru, stylu.
5. Przy N instancjach równoległych (TO-BE): solver sumuje efekty elektryczne. White Box odtwarza relację: typ × ilość → parametry solvera.

---

## 2.7 Transformatory

### 2.7.1 Definicja

**Transformer** jest bytem ENM zmieniającym poziom napięcia między dwoma szynami (Bus). Transformator dwuuzwojeniowy łączy stronę WN (high voltage) ze stroną nn/SN (low voltage).

### 2.7.2 Kontrakt AS-IS (`enm/models.py:155-172`)

| Pole | Typ | Źródło parametru | Opis |
|---|---|---|---|
| `hv_bus_ref` | str | Kreator | Szyna strony WN |
| `lv_bus_ref` | str | Kreator | Szyna strony nn/SN |
| `sn_mva` | float | **Parametr znamionowy** (typ) | Moc znamionowa [MVA] |
| `uhv_kv` | float | **Parametr znamionowy** (typ) | Napięcie znamionowe WN [kV] |
| `ulv_kv` | float | **Parametr znamionowy** (typ) | Napięcie znamionowe nn/SN [kV] |
| `uk_percent` | float | **Parametr znamionowy** (typ) | Napięcie zwarcia [%] |
| `pk_kw` | float | **Parametr znamionowy** (typ) | Straty zwarciowe [kW] |
| `p0_kw` | float \| None | **Parametr znamionowy** (typ) | Straty biegu jałowego [kW] |
| `i0_percent` | float \| None | **Parametr znamionowy** (typ) | Prąd biegu jałowego [%] |
| `vector_group` | str \| None | **Parametr znamionowy** (typ) | Grupa połączeń (np. Dyn11) |
| `hv_neutral` | GroundingConfig \| None | **Parametr zmienny** (kreator) | Uziemienie punktu neutralnego WN |
| `lv_neutral` | GroundingConfig \| None | **Parametr zmienny** (kreator) | Uziemienie punktu neutralnego nn/SN |
| `tap_position` | int \| None | **Parametr zmienny** (kreator) | Pozycja zaczepu |
| `tap_min`, `tap_max` | int \| None | **Parametr znamionowy** (typ) | Zakres zaczepów |
| `tap_step_percent` | float \| None | **Parametr znamionowy** (typ) | Krok zaczepu [%] |
| `catalog_ref` | str \| None | Kreator | Referencja do TransformerType |

### 2.7.3 Kompozycja (Decision #18)

```
Transformer = TransformerType(catalog_ref) × tap_position(kreator) × uziemienie(kreator) [× override(ekspert)]
```

### 2.7.4 Inwarianty transformatora (BINDING)

1. `hv_bus_ref ≠ lv_bus_ref` — strony WN i nn/SN MUSZĄ być na różnych szynach (walidacja E007).
2. `uk_percent > 0` — napięcie zwarcia MUSI być podane (walidacja E006).
3. Napięcia znamionowe transformatora (`uhv_kv`, `ulv_kv`) są parametrami typu, NIE parametrami obliczeniowymi.
4. Minimalne/maksymalne napięcia do obliczeń (np. napięcie probiercze, dopuszczalny zakres regulacji) NIE SĄ parametrem transformatora w ENM — są domeną solvera i normy.
5. Pozycja zaczepu (`tap_position`) jest parametrem zmiennym instancji — ustawiany przez użytkownika w kreatorze.

### 2.7.5 Transformer3W (REQUIRES-DECISION)

Transformator trójuzwojeniowy (`Transformer3W`) NIE jest zaimplementowany w kodzie. Status: **NOT-IMPLEMENTED**.
Wymagana decyzja architektoniczna (ADR) przed specyfikacją.

---

## 2.8 Parametry: typ vs instancja (FORMALIZACJA)

### 2.8.1 Zasada fundamentalna (Decision #18)

Każdy element ENM jest kompozycją:
```
instancja ENM = TYP(katalog) + parametry_zmienne(kreator) + [override(tryb_ekspert)] + ilość
```

### 2.8.2 Klasyfikacja parametrów

| Parametr | Klasyfikacja | Źródło | Przykład |
|---|---|---|---|
| Impedancja jednostkowa (R, X, B per km) | **Znamionowy** | Typ katalogowy (LineType / CableType) | `r_ohm_per_km = 0.2` |
| Moc znamionowa transformatora | **Znamionowy** | Typ katalogowy (TransformerType) | `sn_mva = 10.0` |
| Napięcie zwarcia | **Znamionowy** | Typ katalogowy (TransformerType) | `uk_percent = 6.0` |
| Prąd znamionowy falownika | **Znamionowy** | Typ katalogowy (ConverterType) | `in_rated_a = 720.0` |
| Długość linii / kabla | **Zmienny** | Kreator | `length_km = 3.5` |
| Pozycja zaczepu transformatora | **Zmienny** | Kreator | `tap_position = -2` |
| Moc czynna odbioru | **Zmienny** | Kreator | `p_mw = 0.5` |
| Moc czynna generatora | **Zmienny** | Kreator | `p_mw = 2.0` |
| Konfiguracja uziemienia | **Zmienny** | Kreator | `hv_neutral = GroundingConfig(...)` |
| Liczba falowników równoległych | **Zmienny** | Kreator | `n_parallel = 4` (TO-BE) |
| Impedancja override | **Override** | Tryb EKSPERT | `impedance_override = {r_total_ohm: ...}` |

### 2.8.3 Resolver — mechanizm precedencji (AS-IS)

**Lokalizacja:** `catalog/resolver.py`

| Element | Precedencja | Status |
|---|---|---|
| OverheadLine / Cable | `impedance_override > type_ref > instance` | AS-IS |
| Transformer | `type_ref > instance` | AS-IS |
| Generator | brak (Generator nie ma `catalog_ref`) | TO-BE: `type_ref > instance` |
| Load | brak (Load nie ma `catalog_ref`) | TO-BE: brak katalogu, wszystko z instancji |

**Rezultat resolvera:** `ResolvedLineParams` / `ResolvedTransformerParams` — frozen dataclass z polem `source: ParameterSource` jednoznacznie wskazującym źródło parametrów.

### 2.8.4 Zakaz pól hybrydowych

Żadne pole ENM NIE MOŻE być jednocześnie „częściowo parametrem typu" i „częściowo parametrem solvera". Każde pole ma jednoznaczną klasyfikację:
- parametr znamionowy (z katalogu) — read-only w trybie standardowym,
- parametr zmienny (z kreatora) — edytowalny,
- parametr override (tryb ekspert) — edytowalny, audytowalny,
- parametr obliczeniowy — **NIE istnieje w ENM**, istnieje wyłącznie w solverze.

---

## 2.9 Relacja ENM → Solvery (KONTRAKT)

### 2.9.1 Kierunek przepływu danych

```
ENM (edytowalny)
    │
    ▼  map_enm_to_network_graph()  [deterministyczny, czysty]
NetworkGraph (read-only snapshot)
    │
    ▼  solver.solve(snapshot, case_config)
Results (frozen) + WhiteBoxTrace (immutable)
```

### 2.9.2 Gwarancje ENM dla solvera (BINDING)

ENM MUSI dostarczyć komplet danych fizycznych wymaganych przez solver:

| Wymaganie | Walidacja | Bloker solvera |
|---|---|---|
| Przynajmniej jeden Bus | E002 | TAK |
| Przynajmniej jedno Source | E001 | TAK |
| Spójna topologia (brak wysp bez źródła) | E003 | TAK |
| Napięcie znamionowe na każdym Bus > 0 | E004 | TAK |
| Impedancja niezerowa na liniach/kablach | E005 | TAK |
| Napięcie zwarcia transformatora > 0 | E006 | TAK |
| Różne szyny HV/LV transformatora | E007 | TAK |
| Parametry zwarciowe źródła | E008 | TAK |

### 2.9.3 Gwarancje solvera wobec ENM (BINDING)

1. Solver **NIGDY nie modyfikuje ENM** — ENM jest read-only dla solvera.
2. Solver **NIGDY nie uzupełnia braków** w ENM — jeśli dane są niekompletne, walidacja blokuje solver.
3. Solver **produkuje wyniki jako frozen dataclass** — wyniki nie wracają do ENM.
4. Solver **operuje deterministycznie** — ten sam ENM + ten sam Case = te same wyniki.

---

## 2.10 Relacja ENM → White Box (KONTRAKT)

### 2.10.1 Odtwarzalność

White Box MUSI umożliwiać pełne odtworzenie:
- **JAKIE** dane ENM zostały użyte w obliczeniach,
- **SKĄD** pochodzi każdy parametr (typ katalogowy / override / instancja),
- **JAK** dane ENM zostały przetransformowane na dane solvera (mapowanie),
- **CO** solver obliczył na podstawie tych danych (wartości pośrednie i końcowe).

### 2.10.2 Łańcuch parametrów (Decision #15, #16, #18)

Dla każdego parametru użytego w obliczeniach White Box odtwarza:
```
1. Typ katalogowy (snapshot wartości) → ParameterSource.TYPE_REF
2. Override (jeśli tryb ekspert) → ParameterSource.OVERRIDE
3. Parametry zmienne instancji (kreator) → ParameterSource.INSTANCE
4. Ilość instancji równoległych (n_parallel)
5. Parametry finalne po resolwerze (wejście solvera)
6. Wynik obliczeniowy
```

### 2.10.3 Determinizm

Ten sam ENM → identyczny White Box → identyczny hash. Zmiana jakiegokolwiek parametru ENM powoduje zmianę White Box. White Box jest niemutowalny po wygenerowaniu.

---

## 2.11 Walidacje ENM (OBOWIĄZKOWE)

### 2.11.1 Reguły blokujące solver (E-class)

| Kod | Reguła | Blokuje |
|---|---|---|
| E001 | Brak źródła zasilania (`enm.sources` puste) | Wszystkie analizy |
| E002 | Brak szyn (`enm.buses` puste) | Wszystkie analizy |
| E003 | Graf niespójny — wyspa bez źródła | Wszystkie analizy |
| E004 | Bus z `voltage_kv ≤ 0` | Wszystkie analizy |
| E005 | OverheadLine/Cable z `r=0` i `x=0` | Wszystkie analizy |
| E006 | Transformer z `uk_percent ≤ 0` | Wszystkie analizy |
| E007 | Transformer z `hv_bus_ref == lv_bus_ref` | Wszystkie analizy |
| E008 | Source bez parametrów zwarciowych | Wszystkie analizy |

### 2.11.2 Reguły ostrzegawcze (W-class)

| Kod | Reguła | Konsekwencja |
|---|---|---|
| W001 | Brak Z₀ na linii/kablu | SC 1F/2F-Z niedostępne |
| W002 | Brak Z₀ źródła | SC 1F/2F-Z niedostępne |
| W003 | Brak odbiorów i generatorów | Power flow pusty |
| W004 | Transformer bez vector_group | Domyślne Dyn11 |
| W005 | Stacja z referencją do nieistniejącego bytu | Niespójność modelu |
| W006 | Pole z referencją do nieistniejącej stacji/szyny | Niespójność modelu |
| W007 | Junction z mniej niż 3 gałęziami | Nieuzasadniony Junction |

### 2.11.3 Reguły informacyjne (I-class)

| Kod | Reguła | Informacja |
|---|---|---|
| I001 | Łącznik w stanie OPEN | Część sieci odcięta |
| I002 | OverheadLine/Cable bez `catalog_ref` | Parametry z ręcznego wprowadzenia |
| I003 | Stacja bez pól | Potencjalnie niekompletna |
| I004 | Magistrala (Corridor) bez segmentów | Pusta magistrala |
| I005 | Pierścień bez punktu NO | Brak definicji stanu normalnego |

### 2.11.4 Inwariant walidacji

Solver NIE MOŻE zostać uruchomiony, jeśli istnieje choć jedna reguła E-class (BLOCKER). Walidacja jest bramką wejściową (`readiness gate`) — poprzedza każde wywołanie solvera.

---

## 2.12 Zakazy i anty-wzorce ENM (BINDING)

### 2.12.1 Zakaz bytów organizacyjnych w modelu obliczeniowym

Byty organizacyjne (Substation, Bay) i wizualne (Corridor) NIE MOGĄ wpływać na wyniki obliczeniowe. Solver ich nie widzi. Mapowanie (`mapping.py`) ich nie przetwarza.

### 2.12.2 Zakaz danych solvera w ENM

ENM NIE MOŻE przechowywać:
- `node_type` (SLACK, PQ, PV) — przypisywane w mapowaniu,
- `voltage_magnitude_pu` — wynik solvera,
- `active_power_mw` (bilans na szynie) — obliczany z Load/Generator w mapowaniu,
- jakichkolwiek wyników obliczeń.

### 2.12.3 Zakaz flag napięciowych i skrótów obliczeniowych

ENM NIE MOŻE zawierać pól typu:
- `is_slack_bus`, `is_pv_bus` — to decyzja mapowania, nie cecha szyny,
- `calculated_impedance_ohm` — to wynik resolvera, nie pole ENM,
- `solver_hint`, `analysis_flag` — solver interpretuje ENM, nie odczytuje flag.

### 2.12.4 Zakaz bytów wirtualnych

ENM NIE MOŻE zawierać:
- wirtualnych węzłów (np. „Bus obliczeniowy"),
- wirtualnych gałęzi (np. „impedancja zastępcza"),
- agregowanych elementów (np. „N generatorów jako jeden"),
- bytów logicznych bez fizycznego odpowiednika.

Jeśli solver potrzebuje dodatkowych bytów (np. virtual GND Node dla Source), tworzy je w `mapping.py` — NIE w ENM.

### 2.12.5 Zakaz duplikacji modelu

ENM jest jedynym źródłem prawdy fizycznej. NIE WOLNO tworzyć:
- kopii modelu „do obliczeń",
- modelu „do wizualizacji",
- modelu „do eksportu".

Każdy komponent (solver, SLD, eksport) odczytuje TEN SAM obiekt ENM lub jego deterministyczny snapshot.

---

## 2.13 Typy wspierające (Supporting Types)

### 2.13.1 GroundingConfig (`models.py:22-25`)

| Pole | Typ | Opis |
|---|---|---|
| `type` | Literal["isolated", "petersen_coil", "directly_grounded", "resistor_grounded"] | Rodzaj uziemienia |
| `r_ohm` | float \| None | Rezystancja uziemienia [Ohm] |
| `x_ohm` | float \| None | Reaktancja uziemienia [Ohm] |

### 2.13.2 BusLimits (`models.py:28-30`)

| Pole | Typ | Opis |
|---|---|---|
| `u_min_pu` | float \| None | Minimalne dopuszczalne napięcie [p.u.] |
| `u_max_pu` | float \| None | Maksymalne dopuszczalne napięcie [p.u.] |

### 2.13.3 BranchRating (`models.py:33-36`)

| Pole | Typ | Opis |
|---|---|---|
| `in_a` | float \| None | Prąd znamionowy ciągły [A] |
| `ith_ka` | float \| None | Prąd cieplny krótkotrwały [kA] |
| `idyn_ka` | float \| None | Prąd dynamiczny szczytowy [kA] |

### 2.13.4 GenLimits (`models.py:39-43`)

| Pole | Typ | Opis |
|---|---|---|
| `p_min_mw` | float \| None | Minimalna moc czynna [MW] |
| `p_max_mw` | float \| None | Maksymalna moc czynna [MW] |
| `q_min_mvar` | float \| None | Minimalna moc bierna [Mvar] |
| `q_max_mvar` | float \| None | Maksymalna moc bierna [Mvar] |

---

## 2.14 Korzeń modelu (EnergyNetworkModel)

### 2.14.1 Kontrakt AS-IS (`models.py:279-290`)

```python
class EnergyNetworkModel(BaseModel):
    header: ENMHeader
    buses: list[Bus] = []
    branches: list[Branch] = []           # OverheadLine | Cable | SwitchBranch | FuseBranch
    transformers: list[Transformer] = []
    sources: list[Source] = []
    loads: list[Load] = []
    generators: list[Generator] = []
    substations: list[Substation] = []    # ENM Meta (organizacja)
    bays: list[Bay] = []                  # ENM Meta (organizacja)
    junctions: list[Junction] = []
    corridors: list[Corridor] = []        # SLD Layout (wizualizacja)
```

### 2.14.2 Singleton per projekt

Dokładnie JEDEN obiekt `EnergyNetworkModel` istnieje per projekt. Kreator (Wizard) i SLD edytują TEN SAM obiekt. Brak kopii, brak buforów, brak modeli tymczasowych.

### 2.14.3 Nagłówek (ENMHeader)

| Pole | Typ | Opis |
|---|---|---|
| `enm_version` | Literal["1.0"] | Wersja formatu ENM |
| `name` | str | Nazwa projektu |
| `description` | str \| None | Opis projektu |
| `created_at` | datetime | Data utworzenia |
| `updated_at` | datetime | Data ostatniej modyfikacji |
| `revision` | int | Numer rewizji |
| `hash_sha256` | str | Hash integralności |
| `defaults` | ENMDefaults | Wartości domyślne (50 Hz, SI) |

---

## 2.15 Zabezpieczenia — klasyfikacja i punkt pomiaru (BINDING)

### 2.15.1 Dwie klasy ProtectionFunction

System MV-DESIGN-PRO rozróżnia dwie odrębne klasy funkcji zabezpieczeniowych. Klasy te NIE SĄ wymienne, NIE konkurują ze sobą i NIE podlegają wspólnej koordynacji selektywnej.

#### A. ProtectionFunction.Technological (zabezpieczenia technologiczne falownika)

**Definicja:** Wbudowane funkcje ochronne generatora energoelektronicznego (falownika), działające autonomicznie na poziomie urządzenia. Realizowane przez sterownik falownika, nie przez zewnętrzny przekaźnik.

**Właściwości:**
- Działają **autonomicznie** — niezależnie od systemu zabezpieczeń sieciowych.
- Czas działania **≤ 250 ms** (determinowany przez firmware falownika).
- **NIE podlegają koordynacji selektywnej** — nie uczestniczą w stopniowaniu Δt z zabezpieczeniami sieciowymi.
- Parametry wynikają z wymagań normatywnych przyłączeniowych (NC RfG, IRiESD), nie z analizy zwarciowej sieci.

**Funkcje technologiczne falownika:**

| Funkcja | ANSI | Opis | Źródło nastawy |
|---|---|---|---|
| I> (technologiczne) | — | Ograniczenie prądowe falownika | Parametr urządzenia |
| I>> (technologiczne) | — | Wyłączenie awaryjne falownika | Parametr urządzenia |
| U< | 27 | Podnapięciowe (LVRT/wyłączenie) | NC RfG / IRiESD |
| U> | 59 | Nadnapięciowe | NC RfG / IRiESD |
| U>> | 59 (high) | Nadnapięciowe szybkie | NC RfG / IRiESD |
| f< | 81U | Podczęstotliwościowe | NC RfG / IRiESD |
| f> | 81O | Nadczęstotliwościowe | NC RfG / IRiESD |
| df/dt | 81R | ROCOF (rate of change of frequency) | NC RfG / IRiESD |

**Reguły (BINDING):**
1. Funkcje technologiczne **NIE SĄ wejściem** do solvera zabezpieczeń (`protection analysis`).
2. Funkcje technologiczne **NIE konkurują** z zabezpieczeniami sieciowymi — ich nastawy nie są koordynowane z I>>/I> pola SN.
3. Funkcje technologiczne są **dokumentowane w White Box** jako warunki brzegowe normowe (NC RfG / IRiESD).
4. Punkt pomiaru: **strona nn falownika** — pomiar wewnętrzny urządzenia.

#### B. ProtectionFunction.Network (zabezpieczenia sieciowe)

**Definicja:** Klasyczne zabezpieczenia sieciowe IEC / ETAP, realizowane przez zewnętrzne przekaźniki zabezpieczeniowe, nastawialne, selektywne, koordynowane w ramach sieci SN.

**Właściwości:**
- **Nastawialne** — nastawy wynikają z analizy zwarciowej i rozpływowej sieci.
- **Selektywne** — koordynowane czasowo i prądowo z innymi zabezpieczeniami sieciowymi (stopniowanie Δt).
- **Koordynowane** — uczestniczą w pełnej koordynacji zabezpieczeń sieci SN.
- Sterują aparatem łączeniowym (wyłącznik, rozłącznik).

**Minimalny kanon funkcji sieciowych (AS-IS):**

| Funkcja | ANSI | Opis | Status w kodzie |
|---|---|---|---|
| Zabezpieczenie nadprądowe bezzwłoczne | 50 | I>> (instantaneous) | AS-IS (`OVERCURRENT_INST`) |
| Zabezpieczenie nadprądowe zwłoczne | 51 | I> (time-delayed, IDMT) | AS-IS (`OVERCURRENT_TIME`) |
| Zabezpieczenie ziemnozwarciowe bezzwłoczne | 50N | Ie>> (earth fault inst.) | AS-IS (`EARTH_FAULT_INST`) |
| Zabezpieczenie ziemnozwarciowe zwłoczne | 51N | Ie> (earth fault time) | AS-IS (`EARTH_FAULT_TIME`) |
| Zabezpieczenie podnapięciowe | 27 | U< | AS-IS (`UNDERVOLTAGE`) |
| Zabezpieczenie nadnapięciowe | 59 | U> | AS-IS (`OVERVOLTAGE`) |
| Zabezpieczenie podczęstotliwościowe | 81U | f< | AS-IS (`UNDERFREQUENCY`) |
| Zabezpieczenie nadczęstotliwościowe | 81O | f> | AS-IS (`OVERFREQUENCY`) |
| ROCOF | 81R | df/dt | AS-IS (`ROCOF`) |
| SPZ (samoczynne ponowne załączenie) | 79 | Reclosing | AS-IS (`RECLOSING`) |
| Zabezpieczenie kierunkowe | 67 / 67N | Directional I> / Ie> | PLANNED |
| Zabezpieczenie odległościowe | 21 | Distance / impedance | PLANNED |
| Zabezpieczenie różnicowe | 87 | Differential | PLANNED |
| Blokada łączeniowa | 86 | Lockout | PLANNED |

**Dodatkowe sygnały sieciowe (warunki ziemnozwarciowe):**
- 3U0 — napięcie zerowe (pomiar z przekładnika napięciowego)
- 3I0 — prąd zerowy (pomiar z przekładnika prądowego)
- Go> — konduktancja zerowa (admitancja doziemna)

**Reguły (BINDING):**
1. Funkcje sieciowe **SĄ wejściem** do solvera zabezpieczeń.
2. Funkcje sieciowe **korzystają z wyników** analiz zwarciowych (SC) i rozpływowych (PF).
3. Funkcje sieciowe **sterują aparatem łączeniowym** — każda funkcja jest przypisana do konkretnego wyłącznika/rozłącznika.
4. Punkt pomiaru: **strona SN** — przekładniki prądowe (CT) i napięciowe (VT) w polu rozdzielczym.

### 2.15.2 Punkt pomiaru (OBOWIĄZKOWE)

Każda ProtectionFunction — zarówno technologiczna, jak i sieciowa — MUSI jawnie określać:

| Atrybut | Opis | Przykład |
|---|---|---|
| **Miejsce pomiaru** | Poziom napięcia, na którym funkcja wykonuje pomiar | nn (strona falownika) / SN (pole rozdzielcze) |
| **Źródło sygnału** | Typ przetwornika pomiarowego dostarczającego sygnał | CT (przekładnik prądowy) / VT (przekładnik napięciowy) / wewnętrzny (firmware) |
| **Sterowany aparat** | Aparat łączeniowy, który funkcja wyłącza | QN1 (wyłącznik nn), 3Q1 (wyłącznik SN), brak (tylko alarm) |

**Przykład — przyłączenie OZE:**

```
Tor: Falownik(nn) → Bus nn → [Q_nn] → Trafo nn/SN → Bus SN → [3Q1_SN]

Zabezpieczenia technologiczne falownika:
  I>, U<, U>, f<, f>, df/dt
  Punkt pomiaru: nn (wewnętrzny falownika)
  Źródło sygnału: wewnętrzny (firmware)
  Sterowany aparat: Q_nn (wyłącznik nn) lub wewnętrzne odłączenie

Zabezpieczenia sieciowe pola SN:
  50 (I>>), 51 (I>), 50N (Ie>>), 51N (Ie>)
  Punkt pomiaru: SN (pole rozdzielcze)
  Źródło sygnału: CT/VT w polu transformatorowym SN
  Sterowany aparat: 3Q1 (wyłącznik SN)
```

### 2.15.3 White Box — rozróżnienie zadziałań (BINDING)

White Box MUSI umieć odróżnić i raportować osobno:

| Zdarzenie | Klasa | Raport White Box |
|---|---|---|
| Zadziałanie technologiczne falownika (np. U< LVRT → wyłączenie) | Technological | `protection_event.class = TECHNOLOGICAL`, źródło: parametry urządzenia / NC RfG |
| Zadziałanie zabezpieczenia sieciowego (np. 51 I> → trip 3Q1) | Network | `protection_event.class = NETWORK`, źródło: analiza zwarciowa + nastawy |

**Inwariant:** Zadziałanie technologiczne i sieciowe NIE MOGĄ być raportowane jako jedno zdarzenie. Są to odrębne mechanizmy z odrębnymi źródłami parametrów, odrębnymi punktami pomiaru i odrębnymi sterowanymi aparatami.

### 2.15.4 Relacja do warstwy Analysis (SPEC_12)

Niniejsza sekcja definiuje **klasyfikację** funkcji zabezpieczeniowych w kontekście modelu ENM.

Szczegółowa specyfikacja:
- koordynacji selektywnej (stopniowanie Δt),
- doboru nastaw (I>>, I>, Ie>),
- charakterystyk czasowych (DT, NI, VI, EI),
- solvera zabezpieczeń (protection analysis pipeline),
- katalogu urządzeń (vendor curves)

— jest opisana w **SPEC_12_PROTECTION.md** (warstwa Analysis / Interpretation).

### 2.15.5 Zakazy (BINDING)

1. **ZAKAZ koordynowania** zabezpieczeń technologicznych falownika z zabezpieczeniami sieciowymi SN w ramach jednego solvera selektywności.
2. **ZAKAZ traktowania** nastaw technologicznych falownika jako nastaw solvera zabezpieczeń.
3. **ZAKAZ łączenia** zdarzenia technologicznego i sieciowego w jeden raport zadziałania.
4. **ZAKAZ pomijania** punktu pomiaru i sterowanego aparatu w definicji funkcji zabezpieczeniowej.

---

**KONIEC ROZDZIAŁU 2**

---

*Dokument kanoniczny. Wersja 1.1. Zaktualizowany o §2.15 Zabezpieczenia.*
