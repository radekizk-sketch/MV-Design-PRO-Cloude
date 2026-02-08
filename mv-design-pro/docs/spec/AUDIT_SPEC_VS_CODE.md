# AUDYT SPÓJNOŚCI: SYSTEM_SPEC.md vs KOD ŹRÓDŁOWY

**Data audytu:** 2026-02-08
**Wersja specyfikacji:** SYSTEM_SPEC.md v3.0
**Repozytorium:** MV-Design-PRO (commit HEAD)
**Audytor:** System Architect + PhD Energetyki

---

## 1. TABELA ZGODNOŚCI — BYTY ENM (Spec §2 vs Kod)

### 1.1 Byty zdefiniowane w specyfikacji vs implementacja

| Byt (Spec) | Klasa Python (Backend) | Interfejs TypeScript (Frontend) | Plik Python | Plik TS | Zgodność |
|---|---|---|---|---|---|
| Bus | `Bus(ENMElement)` | `Bus extends ENMElement` | `enm/models.py:85` | `types/enm.ts:72` | ✅ Zgodne |
| LineBranch (Line) | `OverheadLine(BranchBase)` | `OverheadLine extends BranchBase` | `enm/models.py:106` | `types/enm.ts:92` | ⚠️ Nazewnictwo |
| Cable | `Cable(BranchBase)` | `Cable extends BranchBase` | `enm/models.py:118` | `types/enm.ts:104` | ✅ Zgodne |
| Transformer2W | `Transformer(ENMElement)` | `Transformer extends ENMElement` | `enm/models.py:155` | `types/enm.ts:135` | ⚠️ Nazewnictwo |
| Transformer3W | ❌ Brak | ❌ Brak | — | — | ❌ Brak impl. |
| Switch/Breaker | `SwitchBranch(BranchBase)` | `SwitchBranch extends BranchBase` | `enm/models.py:131` | `types/enm.ts:117` | ✅ Zgodne |
| Source | `Source(ENMElement)` | `Source extends ENMElement` | `enm/models.py:180` | `types/enm.ts:159` | ✅ Zgodne |
| Load | `Load(ENMElement)` | `Load extends ENMElement` | `enm/models.py:200` | `types/enm.ts:178` | ✅ Zgodne |
| Station | `Substation(ENMElement)` | `Substation extends ENMElement` | `enm/models.py:225` | `types/enm.ts:201` | ✅ Zgodne |

### 1.2 Byty obecne w kodzie, BRAK w specyfikacji

| Byt (Kod) | Klasa/Interfejs | Plik | Status w Spec |
|---|---|---|---|
| **FuseBranch** | `FuseBranch(BranchBase)` | `enm/models.py:138` | ❌ Brak w SYSTEM_SPEC §2 |
| **Generator** | `Generator(ENMElement)` | `enm/models.py:212` | ⚠️ Wymieniony ogólnie w Source, brak dedykowanego opisu |
| **Bay** | `Bay(ENMElement)` | `enm/models.py:239` | ❌ Brak w SYSTEM_SPEC §2 |
| **Junction** | `Junction(ENMElement)` | `enm/models.py:254` | ❌ Brak w SYSTEM_SPEC §2 |
| **Corridor** | `Corridor(ENMElement)` | `enm/models.py:266` | ❌ Brak w SYSTEM_SPEC §2 |
| **GroundingConfig** | `GroundingConfig(BaseModel)` | `enm/models.py:22` | ❌ Brak w SYSTEM_SPEC |
| **BusLimits** | `BusLimits(BaseModel)` | `enm/models.py:28` | ❌ Brak w SYSTEM_SPEC |
| **BranchRating** | `BranchRating(BaseModel)` | `enm/models.py:33` | ❌ Brak w SYSTEM_SPEC |
| **GenLimits** | `GenLimits(BaseModel)` | `enm/models.py:39` | ❌ Brak w SYSTEM_SPEC |
| **ENMHeader** | `ENMHeader(BaseModel)` | `enm/models.py:69` | ❌ Brak w SYSTEM_SPEC |
| **ENMDefaults** | `ENMDefaults(BaseModel)` | `enm/models.py:64` | ❌ Brak w SYSTEM_SPEC |
| **InverterSource** | `InverterSource` | `network_model/core/inverter.py` | ❌ Brak w SYSTEM_SPEC |

### 1.3 Byty warstwy solverowej (network_model.core vs Spec)

| Byt Solver | Klasa | Plik | Spec §2 | Uwagi |
|---|---|---|---|---|
| Node | `Node(id, name, node_type, voltage_level, ...)` | `network_model/core/node.py` | ⚠️ Opisane jako Bus | ENM Bus mapowane na solver Node |
| LineBranch | `LineBranch(id, r_ohm_per_km, x_ohm_per_km, ...)` | `network_model/core/branch.py` | ✅ | Solver-level gałąź |
| TransformerBranch | `TransformerBranch(id, rated_power_mva, ...)` | `network_model/core/branch.py` | ✅ | Solver-level transformator |
| Switch | `Switch(id, switch_type, state)` | `network_model/core/switch.py` | ✅ | Solver-level łącznik |
| NetworkGraph | `NetworkGraph(nodes, branches, switches)` | `network_model/core/graph.py` | §2.4 | Częściowy opis |
| AdmittanceMatrixBuilder | `AdmittanceMatrixBuilder` | `network_model/core/ybus.py` | ❌ Brak | Kluczowy byt solvera |
| InverterSource | `InverterSource(id, ik_sc_a, ...)` | `network_model/core/inverter.py` | ❌ Brak | Źródła falownikowe |

---

## 2. ROZBIEŻNOŚCI KRYTYCZNE

### ROZBIEŻNOŚĆ #1: Transformer3W brak implementacji
- **Spec mówi:** §2.1 — "Transformer3W | Three-winding transformer | Yes"
- **Kod robi:** Brak klasy Transformer3W — ani w ENM, ani w solver
- **Wpływ:** P1 (ważne, ale nie blokujące — 3W trafo rzadkie w SN)
- **Rozwiązanie:** Usunąć z Spec lub oznaczyć jako PLANNED

### ROZBIEŻNOŚĆ #2: Spec opisuje Bus z polami solvera
- **Spec mówi:** §2.3 — "Bus: node_type: SLACK|PQ|PV, voltage_magnitude_pu, voltage_angle_rad, active_power_mw, reactive_power_mvar"
- **Kod robi:** ENM `Bus` NIE ma tych pól. To pola solvera `Node`, a nie modelu ENM. Mapowanie odbywa się w `enm/mapping.py`.
- **Wpływ:** P0 (krytyczne — mylące dla implementatorów)
- **Rozwiązanie:** Rozdzielić w specyfikacji byty ENM od bytów solvera. Bus ENM = `voltage_kv, grounding, zone`. Node Solver = `node_type, voltage_magnitude, ...`

### ROZBIEŻNOŚĆ #3: Spec nie rozróżnia warstw modelu
- **Spec mówi:** §2.3 — opisuje elementy jednolicie
- **Kod robi:** Dwie odrębne warstwy: ENM (`enm/models.py`) i Solver (`network_model/core/`), z deterministycznym mapowaniem (`enm/mapping.py`)
- **Wpływ:** P0 (architektura krytyczna)
- **Rozwiązanie:** Specyfikacja musi jasno definiować: (1) ENM model, (2) Solver model, (3) Mapowanie ENM→Solver

### ROZBIEŻNOŚĆ #4: Brak FuseBranch w spec
- **Spec mówi:** §2.1 — "Switch/Breaker" jako typ łącznika, brak "Fuse"
- **Kod robi:** `FuseBranch(BranchBase)` z `type="fuse"`, mapowany na `Switch(FUSE)` w solverze
- **Wpływ:** P1 (bezpiecznik to powszechny element SN)
- **Rozwiązanie:** Dodać FuseBranch do specyfikacji

### ROZBIEŻNOŚĆ #5: Generator jako osobny byt
- **Spec mówi:** §2.1 — Generator wymieniony pod "Source"
- **Kod robi:** `Generator` jest osobnym bytem ENM (osobna lista w `EnergyNetworkModel.generators`), niezależnym od `Source`
- **Wpływ:** P0 (architektura modelu)
- **Rozwiązanie:** Specyfikacja musi odzwierciedlać: Source ≠ Generator w ENM

### ROZBIEŻNOŚĆ #6: Brak elementów topologicznych w spec
- **Spec mówi:** §2.2 — "Station containers store no physics (logical grouping only)"
- **Kod robi:** Istnieją Bay, Junction, Corridor jako pełne byty ENM z walidacjami (W005-W008, I003-I005)
- **Wpływ:** P1 (te byty są zaimplementowane i używane)
- **Rozwiązanie:** Dodać pełne definicje Bay, Junction, Corridor do specyfikacji

### ROZBIEŻNOŚĆ #7: Brak opisu macierzy admitancyjnej (Y-bus)
- **Spec mówi:** §5.3 — "Expose calculation steps (Y-bus, Z-thevenin, Jacobian)"
- **Kod robi:** `AdmittanceMatrixBuilder` w `network_model/core/ybus.py` — pełna implementacja budowy Y-bus
- **Wpływ:** P1 (kluczowy element solvera, brak opisu matematycznego)
- **Rozwiązanie:** Dodać pełny opis budowy Y-bus z wzorami

### ROZBIEŻNOŚĆ #8: Spec nie opisuje mapowania ENM → NetworkGraph
- **Spec mówi:** Brak wzmianki o mapowaniu
- **Kod robi:** `enm/mapping.py` — deterministyczna funkcja `map_enm_to_network_graph(enm) → NetworkGraph`
- **Wpływ:** P0 (kluczowy komponent architektury)
- **Rozwiązanie:** Dodać pełny opis mapowania: reguły, kolejność, deterministyka

### ROZBIEŻNOŚĆ #9: ShortCircuitResult API rozbudowane vs Spec
- **Spec mówi:** §5.4 — `ShortCircuitResult: ikss_ka, ip_ka, ith_ka, white_box_trace`
- **Kod robi:** 20+ pól: `ikss_a, ip_a, ith_a, ib_a, sk_mva, kappa, rx_ratio, tk_s, tb_s, c_factor, un_v, zkk_ohm, contributions, branch_contributions, ik_thevenin_a, ik_inverters_a, ik_total_a, ...` (jednostki w A, nie kA)
- **Wpływ:** P0 (frozen API nie odpowiada specyfikacji)
- **Rozwiązanie:** Zaktualizować spec do aktualnego kontraktu API

### ROZBIEŻNOŚĆ #10: PowerFlowResult API rozbudowane vs Spec
- **Spec mówi:** §5.4 — `PowerFlowResult: bus_voltages, branch_flows, losses, white_box_trace`
- **Kod robi:** `PowerFlowNewtonSolution` z 30+ polami: `converged, iterations, max_mismatch, node_voltage, node_u_mag, node_angle, node_voltage_kv, branch_current, branch_s_from, branch_s_to, losses_total, slack_power, ybus_trace, nr_trace, applied_taps, applied_shunts, pv_to_pq_switches, init_state, solver_method, fallback_info, ...`
- **Wpływ:** P0 (frozen API nie odpowiada specyfikacji)
- **Rozwiązanie:** Zaktualizować spec do aktualnego kontraktu API

---

## 3. ROZBIEŻNOŚCI TERMINOLOGICZNE

| Spec | Kod Python | Kod TypeScript | Uwagi |
|---|---|---|---|
| LineBranch | OverheadLine | OverheadLine | Spec używa "LineBranch", kod "OverheadLine" |
| Transformer2W | Transformer | Transformer | Spec mówi "Transformer2W", kod "Transformer" |
| Bus.node_type | Brak w ENM | Brak w ENM | Pole solvera, nie ENM |
| Bus.voltage_level_kv | Bus.voltage_kv | Bus.voltage_kv | Spec: `voltage_level_kv`, kod: `voltage_kv` |
| Branch.from_bus_id | Branch.from_bus_ref | Branch.from_bus_ref | Spec: `_id`, kod: `_ref` |
| Source.p_mw, q_mvar | Brak w ENM Source | Brak w ENM Source | Spec dodaje p/q do Source, kod ich nie ma |
| Source.sk_mva | Source.sk3_mva | Source.sk3_mva | Spec: `sk_mva`, kod: `sk3_mva` |
| Switch.state: OPEN/CLOSED | Branch.status: open/closed | Branch.status: 'open'/'closed' | Case różni się, wartości małe litery |
| Station.elements | Substation.bus_refs + transformer_refs | Substation.bus_refs + transformer_refs | Różna struktura |

---

## 4. WALIDACJE — SPEC vs KOD

### 4.1 Walidacje zaimplementowane (ENMValidator)

| Kod | Poziom | Opis | W Spec §8? |
|---|---|---|---|
| E001 | BLOCKER | Brak źródła zasilania | ✅ (network.source_present) |
| E002 | BLOCKER | Brak szyn | ⚠️ Częściowo |
| E003 | BLOCKER | Graf niespójny (wyspy bez źródła) | ✅ (network.connected) |
| E004 | BLOCKER | Szyna bez napięcia znamionowego | ✅ (bus.voltage_valid) |
| E005 | BLOCKER | Gałąź bez impedancji (R=0, X=0) | ❌ Brak w spec |
| E006 | BLOCKER | Transformator bez uk% | ❌ Brak w spec |
| E007 | BLOCKER | Transformator HV=LV | ✅ (transformer.hv_lv_different) |
| E008 | BLOCKER | Źródło bez parametrów zwarciowych | ❌ Brak w spec |
| W001 | IMPORTANT | Brak Z₀ na linii | ❌ Brak w spec |
| W002 | IMPORTANT | Brak Z₀ źródła | ❌ Brak w spec |
| W003 | IMPORTANT | Brak odbiorów i generatorów | ❌ Brak w spec |
| W004 | IMPORTANT | Transformator bez grupy połączeń | ❌ Brak w spec |
| W005 | IMPORTANT | Stacja — referencja do nieistniejącego elementu | ❌ Brak w spec |
| W006 | IMPORTANT | Pole — referencja do nieistniejącej stacji/szyny | ❌ Brak w spec |
| W007 | IMPORTANT | Junction z <3 gałęziami | ❌ Brak w spec |
| W008 | IMPORTANT | Corridor z nieistniejącymi segmentami | ❌ Brak w spec |
| I001 | INFO | Łącznik otwarty | ❌ Brak w spec |
| I002 | INFO | Gałąź bez katalogu | ❌ Brak w spec |
| I003 | INFO | Stacja bez pól | ❌ Brak w spec |
| I004 | INFO | Pusta magistrala | ❌ Brak w spec |
| I005 | INFO | Pierścień bez punktu NO | ❌ Brak w spec |

**Wniosek:** Spec opisuje 6 reguł walidacyjnych, kod implementuje **21 reguł** (8 BLOCKER, 8 IMPORTANT, 5 INFO).

### 4.2 Walidacje w Spec, BRAK w kodzie

| Reguła Spec | Status implementacji |
|---|---|
| network.no_dangling | ❌ Brak osobnej reguły (częściowo pokryte przez E003 connectivity) |
| branch.endpoints_exist | ❌ Brak explicit walidacji (mapping.py pomija brakujące) |

---

## 5. API ENDPOINTS — SPEC vs KOD

### 5.1 Endpointy ENM

| Spec | Kod | Plik | Status |
|---|---|---|---|
| Brak | `GET /api/cases/{id}/enm` | `api/enm.py:71` | ✅ Impl, ❌ brak w spec |
| Brak | `PUT /api/cases/{id}/enm` | `api/enm.py:78` | ✅ Impl, ❌ brak w spec |
| Brak | `GET /api/cases/{id}/enm/validate` | `api/enm.py:85` | ✅ Impl, ❌ brak w spec |
| Brak | `GET /api/cases/{id}/enm/topology` | `api/enm.py:94` | ✅ Impl, ❌ brak w spec |
| Brak | `GET /api/cases/{id}/enm/readiness` | `api/enm.py:110` | ✅ Impl, ❌ brak w spec |
| Brak | `POST /api/cases/{id}/runs/short-circuit` | `api/enm.py:160` | ✅ Impl, ❌ brak w spec |

### 5.2 Inne endpointy (w kodzie, brak w spec)

| Endpoint | Plik | Opis |
|---|---|---|
| `/api/projects/*` | `api/projects.py` | CRUD projektów |
| `/api/study-cases/*` | `api/study_cases.py` | Study Cases |
| `/api/cases/*` | `api/cases.py` | Cases legacy |
| `/api/analysis-runs/*` | `api/analysis_runs.py` | Analiza uruchomienia |
| `/api/power-flow-runs/*` | `api/power_flow_runs.py` | Rozpływ mocy |
| `/api/protection-runs/*` | `api/protection_runs.py` | Zabezpieczenia |
| `/api/proof-packs/*` | `api/proof_pack.py` | Pakiety dowodowe |
| `/api/catalog/*` | `api/catalog.py` | Katalog typów |
| `/api/snapshots/*` | `api/snapshots.py` | Snapshoty |
| `/api/sld/*` | `api/sld.py` | SLD |
| `/api/design-synth/*` | `api/design_synth.py` | Synteza projektu |
| `/api/diagnostics/*` | `api/diagnostics.py` | Diagnostyka |
| `/api/comparison/*` | `api/comparison.py` | Porównania |
| `/api/reference-patterns/*` | `api/reference_patterns.py` | Wzorce referencyjne |
| `/api/equipment-proof-packs/*` | `api/equipment_proof_pack.py` | Dowody wyposażenia |
| `/api/xlsx-import/*` | `api/xlsx_import.py` | Import XLSX |

**Wniosek:** Spec NIE opisuje żadnych konkretnych endpointów API. Kod implementuje **30+ endpointów**.

---

## 6. SOLVERY — SPEC vs KOD

### 6.1 Short Circuit IEC 60909

| Aspekt | Spec | Kod | Zgodność |
|---|---|---|---|
| Lokalizacja | `network_model.solvers.short_circuit_iec60909` | `network_model/solvers/short_circuit_iec60909.py` | ✅ |
| Typy zwarć | Brak specyfikacji | 3F, 2F, 1F, 2F+G (`ShortCircuitType` enum) | ❌ Brak w spec |
| Wzory Ik'' | Brak | `Ik'' = c·Un·kU / |Zk|` | ❌ Brak w spec |
| Wzory ip | Brak | `ip = κ·√2·Ik'', κ = 1.02 + 0.98·e^(-3R/X)` | ❌ Brak w spec |
| Wzory Ith | Brak | `Ith = Ik''·√tk` | ❌ Brak w spec |
| Wzory Ib | Brak | `Ib = Ik''·√(1 + ((κ-1)·e^(-tb/ta))²)` | ❌ Brak w spec |
| Wzory Sk | Brak | `Sk = √3·Un·Ik'' / 10⁶` | ❌ Brak w spec |
| White Box trace | "Expose calculation steps" | Pełny tracer: Zk, Ikss, kappa, Ip, Ib, Ith, Sk | ✅ |
| Wkłady falowników | Brak | `_compute_inverter_contribution()` | ❌ Brak w spec |
| Wkłady źródeł | Brak | `ShortCircuitSourceContribution` | ❌ Brak w spec |
| Wkłady gałęzi | Brak | `ShortCircuitBranchContribution` | ❌ Brak w spec |
| Macierz Z-bus | Wymieniona ogólnie | `build_zbus(graph) → (builder, z_bus)` | ⚠️ Brak szczegółów |

### 6.2 Power Flow Newton-Raphson

| Aspekt | Spec | Kod | Zgodność |
|---|---|---|---|
| Lokalizacja | `network_model.solvers.power_flow_newton` | `network_model/solvers/power_flow_newton.py` | ✅ |
| Równania mocy | Brak | `compute_power_injections(ybus, v)` | ❌ Brak w spec |
| Macierz Jacobiego | Wymieniona ogólnie | `newton_raphson_solve()` w internal | ⚠️ Brak szczegółów |
| Typy węzłów | Brak opisu mapowania | PQ → Load, PV → Generator, SLACK → Source bus | ❌ Brak w spec |
| Zbieżność | Brak | `max(|ΔP|, |ΔQ|) < ε` | ❌ Brak w spec |
| Opcje solvera | Brak | `max_iter, tolerance, damping, trace_level` | ❌ Brak w spec |

### 6.3 Dodatkowe solvery

| Solver | Spec | Kod | Status |
|---|---|---|---|
| Gauss-Seidel PF | ✅ Wymieniony | `power_flow_gauss_seidel.py` | ✅ Impl |
| Fast-Decoupled PF | ✅ Wymieniony | `power_flow_fast_decoupled.py` | ✅ Impl |

---

## 7. ELEMENTY BRAKUJĄCE W SPECYFIKACJI

### 7.1 Brakujące opisy modeli matematycznych
- [ ] Składowe symetryczne (Z₁, Z₂, Z₀) — parametry zerowe linii/kabli/trafo
- [ ] Budowa macierzy admitancyjnej Y-bus (wzory Yii, Yij)
- [ ] Budowa macierzy impedancyjnej Z-bus (Z = Y⁻¹)
- [ ] Schemat zastępczy π linii/kabla (R+jX, B/2)
- [ ] Schemat zastępczy transformatora (RT+jXT, gałąź magnesująca)
- [ ] Korekta impedancji transformatora wg PN-EN 60909 (KT)
- [ ] Korekta impedancji generatora wg PN-EN 60909 (KG)
- [ ] Tabela współczynników napięciowych c (cmin, cmax) wg PN-EN 60909
- [ ] Napięcie źródła zastępczego c·Un/√3
- [ ] Równania mocowo-napięciowe (P-Q) w formie biegunowej
- [ ] Macierz Jacobiego (H, N, K, L)
- [ ] Kryterium zbieżności Newton-Raphson
- [ ] Model ZIP odbioru (stałomocowy, stałoprądowy, stałoimpedancyjny)

### 7.2 Brakujące opisy funkcjonalności
- [ ] Kreator K1-K10 — kroki, walidacje, przejścia
- [ ] Drzewo ENM — struktura, nawigacja, selekcja
- [ ] SLD auto-layout — algorytm 5-fazowy, konfiguracja
- [ ] Synchronizacja selekcji (SLD ↔ Drzewo ↔ Inspektor)
- [ ] Proof Engine — format ABCD, pakiety dowodowe
- [ ] Zabezpieczenia — funkcje I>/I>>, model ProtectionDevice
- [ ] Przekładniki CT/VT — model, klasy dokładności
- [ ] SPZ (samoczynne powtórne załączenie)
- [ ] Topologia wysp — algorytm detekcji BFS/DFS
- [ ] Snapshoty i wersjonowanie — immutable run storage
- [ ] Katalog typów — struktura, resolver, precendencja parametrów
- [ ] Uziemienie — typy (izolowany, Petersena, rezystor, bezpośredni)
- [ ] Persystencja — in-memory store → PostgreSQL/MongoDB

### 7.3 Brakujące kontrakty API
- [ ] Pełna tabela endpointów REST z request/response
- [ ] Kontrakty WebSocket (jeśli istnieją)
- [ ] Kody błędów HTTP (422, 404, 500)
- [ ] Format odpowiedzi (envelope, pagination)

### 7.4 Brakujące opisy testów
- [ ] Kryteria akceptacyjne per byt ENM
- [ ] Tolerancje numeryczne solverów
- [ ] Golden tests — dane referencyjne
- [ ] Testy regresji frozen API

---

## 8. PODSUMOWANIE AUDYTU

### 8.1 Statystyki zgodności

| Kategoria | Spec | Kod | Pokrycie |
|---|---|---|---|
| Byty ENM | 8 typów | 13 typów + 6 supporting | **62%** |
| Walidacje | 6 reguł | 21 reguł | **29%** |
| Solvery | 4 wymienione | 4 zaimplementowane | **100%** (nazwy) / **~10%** (szczegóły) |
| API Endpoints | 0 opisanych | 30+ zaimplementowanych | **0%** |
| Modele matematyczne | 0 wzorów | Pełne impl. w kodzie | **0%** |
| Testy | Brak opisu | 100+ plików testowych | **0%** |

### 8.2 Priorytetyzacja rozbieżności

| Priorytet | Opis | Ilość |
|---|---|---|
| **P0 — Krytyczne** | Architektura, frozen API, warstwa ENM vs Solver | **5** |
| **P1 — Ważne** | Brakujące byty, nazewnictwo, walidacje | **5** |
| **P2 — Kosmetyczne** | Nazewnictwo, formatowanie | **~10** |

### 8.3 Rekomendacja

Specyfikacja SYSTEM_SPEC.md v3.0 pokrywa ~**15-20%** rzeczywistego systemu. Konieczna jest:

1. **Pełna rozbudowa** specyfikacji do ≥18 plików modułowych
2. **Rozdzielenie** warstwy ENM i warstwy Solver
3. **Dodanie** modeli matematycznych z wzorami i przykładami
4. **Dodanie** pełnych kontraktów API
5. **Dodanie** walidacji z kodami błędów
6. **Dodanie** testów akceptacyjnych z danymi referencyjnymi
7. **Aktualizacja** frozen API do aktualnego stanu kodu

---

## 9. DECISION MATRIX (BINDING)

Poniższe decyzje architektoniczne są **wiążące** dla całego procesu rozbudowy specyfikacji.
Każda rozbieżność z §2 otrzymuje jednoznaczną dyspozycję.

### 9.1 Klasyfikacja decyzji

| Status | Znaczenie |
|---|---|
| **BINDING** | Decyzja podjęta — MUSI być odzwierciedlona w specyfikacji AS-IS |
| **DO-NOT-SPECIFY** | Celowo pominięte — NIE podlega specyfikacji w danej warstwie |
| **REQUIRES-DECISION** | Wymaga osobnej decyzji architektonicznej przed specyfikacją |

### 9.2 Macierz decyzji

| # | Rozbieżność | Decyzja | Warstwa | Plik docelowy | Uzasadnienie |
|---|---|---|---|---|---|
| 1 | Pola solverowe (`node_type`, `voltage_magnitude_pu`) opisane jako atrybuty Bus ENM | **DO-NOT-SPECIFY** | Solver | — | To nie jest fizyka ENM, lecz warstwa obliczeniowa. Bus ENM = `voltage_kv, grounding, zone`. Node solvera = `node_type, voltage_magnitude, ...`. Specyfikacja ENM MUSI opisywać wyłącznie kontrakt `enm/models.py`. Pola solvera należą do warstwy Solver i są produkowane przez deterministyczne mapowanie `map_enm_to_network_graph()`. |
| 2 | Brak rozróżnienia ENM vs Solver w specyfikacji | **BINDING** | Architecture | `SPEC_00_LAYERING.md` | System operuje na trzech odrębnych warstwach danych: (1) ENM — edytowalny model fizyczny, (2) NetworkGraph — read-only model solverowy, (3) Results — frozen wyniki obliczeń. Specyfikacja MUSI definiować granice warstw i kontrakt mapowania ENM→NetworkGraph. |
| 3 | `Generator` traktowany jak `Source` w spec | **BINDING** | ENM Core | `SPEC_02_ENM_CORE.md` | Generator ≠ Source. Różne warunki brzegowe (PV vs SLACK), różne parametry (`p_mw, q_mvar, gen_type, limits` vs `sk3_mva, r_ohm, x_ohm, c_max`), osobne listy w `EnergyNetworkModel`. Specyfikacja MUSI traktować Generator jako osobny byt ENM. |
| 4 | `ShortCircuitResult` (Frozen API) nieopisany — 20+ pól w kodzie, 4 w spec | **BINDING** | Results API | `SPEC_06_RESULTS_API.md` | Frozen API jest kontraktem publicznym. Specyfikacja MUSI zawierać kompletną listę pól 1:1 z `ShortCircuitResult` w `short_circuit_iec60909.py` oraz `EXPECTED_SHORT_CIRCUIT_RESULT_KEYS`. |
| 5 | `PowerFlowNewtonSolution` nieopisany — 30+ pól w kodzie, 4 w spec | **BINDING** | Results API | `SPEC_06_RESULTS_API.md` | Jak #4. Specyfikacja MUSI zawierać kompletną listę pól 1:1 z `PowerFlowNewtonSolution` w `power_flow_newton.py`. |
| 6 | `Transformer3W` w spec, brak implementacji | **REQUIRES-DECISION** | Future / Planned | — | Transformer3W nie istnieje w kodzie (ani ENM, ani solver). Nie implementować w specyfikacji AS-IS. Jeśli decyzja o implementacji zapadnie, powstanie osobny dokument TO-BE. W obecnej specyfikacji: usunąć z listy elementów rdzeniowych lub oznaczyć jawnie jako PLANNED/NOT-IMPLEMENTED. |
| 7 | `FuseBranch` zaimplementowany w kodzie, brak w spec | **BINDING** | ENM Core | `SPEC_02_ENM_CORE.md` | FuseBranch (`type="fuse"`) istnieje w `enm/models.py`, mapowany na `Switch(FUSE)` w solverze. Specyfikacja MUSI go opisywać jako element dyskryminowanej unii `Branch`. |
| 8a | `Bay` — pole rozdzielcze | **BINDING** | ENM Meta | `SPEC_03_ENM_META.md` | Bay jest bytem organizacyjnym ENM (logiczna struktura rozdzielni). Nie wpływa na solver. Specyfikacja MUSI go opisywać jako element ENM warstwy meta (organizacja, nie fizyka). |
| 8b | `Junction` — węzeł T | **BINDING** | ENM Core | `SPEC_02_ENM_CORE.md` | Junction modeluje rozgałęzienie magistrali — jest częścią topologii fizycznej ENM. Bus kind=JUNCTION w kontekście routingu. Specyfikacja MUSI go opisywać. |
| 8c | `Corridor` — magistrala | **DO-NOT-SPECIFY** w ENM Core | SLD Layout / Route | `SPEC_05_SLD_LAYOUT_ROUTE.md` | Corridor jest konceptem routingu SLD i organizacji wizualnej, NIE elementem fizycznym sieci. Nie wpływa na solver. Specyfikacja ENM Core NIE powinna go zawierać. Corridor należy do warstwy SLD Layout. |
| 9 | Walidacje (21 reguł w kodzie vs 6 w spec) | **BINDING** | Validation | `SPEC_07_VALIDATION.md` | Wszystkie 21 reguł ENMValidator (E001-E008, W001-W008, I001-I005) MUSZĄ być opisane w specyfikacji walidacji AS-IS, 1:1 z `enm/validator.py`. |
| 10 | API Endpoints (30+ w kodzie vs 0 w spec) | **BINDING** | Public API | `SPEC_08_PUBLIC_API.md` | Wszystkie publiczne endpointy z `api/*.py` MUSZĄ być opisane z kontraktami request/response. |
| 11 | Generator energoelektroniczny (falownik) — brak walidacji poziomu napięcia | **BINDING** | ENM Core + Validation | `SPEC_02_ENM_CORE.md`, `SPEC_07_VALIDATION.md` | Generator z `gen_type ∈ {pv_inverter, wind_inverter, bess}` jest ZAWSZE elementem niskonapięciowym (nn). Napięcie znamionowe falownika wynika wyłącznie z wybranego typu w katalogu — specyfikacja NIE definiuje sztywnych wartości napięć. W kodzie (`enm/models.py:216`) `gen_type` zawiera te wartości, ale brak walidacji w `enm/validator.py`: falownik może być przypisany do Bus SN (`voltage_kv > 1 kV`). Specyfikacja MUSI jawnie zakazać bezpośredniego przyłączenia generatora energoelektronicznego do szyny SN i opisać wymaganą walidację. |
| 12 | Brak wymuszenia transformatora przy integracji OZE z SN | **BINDING** | ENM Core + Wizard | `SPEC_02_ENM_CORE.md`, `SPEC_13_WIZARD.md` | Każda integracja źródła OZE (falownika nn) z siecią SN wymaga obecności transformatora nn/SN w ENM jako osobnego, jawnego elementu. Obecny kod tego nie wymusza — `mapping.py` mapuje Generator na P/Q adjustment bez sprawdzenia toru napięciowego. Specyfikacja MUSI definiować kanoniczną topologię: `Generator(nn) → Bus(nn) → Łącznik/Zabezpieczenie → Bus(nn stacji) → Transformator(nn/SN) → Bus(SN)`. Kreator MUSI wymuszać tę sekwencję. |
| 13 | Odbiory — brak wymuszenia kompletnego toru przyłączenia | **BINDING** | ENM Core + Wizard | `SPEC_02_ENM_CORE.md`, `SPEC_13_WIZARD.md` | Load jest przyłączany do Bus przez `bus_ref` (`enm/models.py:201`), ale brak wymuszenia kompletnego toru fizycznego (szyna → łącznik/zabezpieczenie → pole odpływowe → odbiór). Specyfikacja MUSI opisywać normową topologię przyłączenia odbioru. |
| 14 | InverterSource w solverze — brak mapowania z ENM Generator | **BINDING** | Layering + Solver | `SPEC_00_LAYERING.md`, `SPEC_10_SOLVER_SC_IEC60909.md` | `InverterSource` istnieje w warstwie solvera (`network_model/core/inverter.py`) i jest używany w SC solver (`_compute_inverter_contribution()` w `short_circuit_iec60909.py`), ale NIE jest mapowany z ENM `Generator(gen_type=pv_inverter|wind_inverter|bess)` w `enm/mapping.py`. Katalog zawiera `ConverterType` i `InverterType` (`catalog/types.py`). Specyfikacja MUSI opisać kontrakt mapowania Generator(falownik) → InverterSource. |
| 15 | Katalog typów — resolver istnieje, ale brak catalog_ref na Generator i Load | **BINDING** | ENM Core + Catalog | `SPEC_02_ENM_CORE.md`, `SPEC_00_LAYERING.md` | System posiada `catalog/resolver.py` z 3-poziomową precedencją (`impedance_override > type_ref > instance`) i typami `ParameterSource` (OVERRIDE, TYPE_REF, INSTANCE). `OverheadLine`, `Cable`, `Transformer` mają `catalog_ref` (AS-IS). `Generator` i `Load` NIE mają `catalog_ref` (GAP). Katalog zawiera `ConverterType`, `InverterType` (`catalog/types.py`), ale Generator ich nie referencjonuje. Specyfikacja MUSI opisać zasadę: katalog jest domyślnym i preferowanym źródłem parametrów znamionowych dla WSZYSTKICH elementów sieciowych, oraz zaplanować rozszerzenie `catalog_ref` na Generator (TO-BE). |
| 16 | Brak trybu EKSPERT — kontrolowana edycja parametrów typu | **BINDING** | Application + ENM | `SPEC_02_ENM_CORE.md`, `SPEC_13_WIZARD.md` | System NIE posiada trybu ekspert w kodzie. UI ma 3 tryby SLD: EDYCJA, WYNIKI, ZABEZPIECZENIA — żaden nie dotyczy parametrów typu. Istnieje `impedance_override` na `LineBranch` (`resolve_line_params()` w `resolver.py`), ale TYLKO dla linii/kabli. Specyfikacja MUSI zdefiniować jawny TRYB EKSPERT: (1) wyraźnie oznaczony w UI, (2) świadomie aktywowany, (3) override NIE modyfikuje katalogu, (4) override zapisywany per instancja, (5) audytowalny w White Box. Status: TO-BE. |
| 17 | Brak liczby instancji równoległych na Generator/InverterSource | **BINDING** | ENM Core + Solver | `SPEC_02_ENM_CORE.md`, `SPEC_10_SOLVER_SC_IEC60909.md` | `Generator` (`enm/models.py:212`) nie ma pola `n_parallel` ani `count`. `InverterSource` (`inverter.py`) również nie ma. Solver SC sumuje wkłady N osobnych obiektów `InverterSource`, ale kreator nie oferuje „N identycznych falowników równolegle". Specyfikacja MUSI zdefiniować obsługę wielu identycznych falowników: użytkownik podaje TYP + LICZBĘ → kreator tworzy N instancji w ENM (lub jedno pole `n_parallel` z rozwinięciem przy mapowaniu na solver). Status: TO-BE. |
| 18 | Zasada kompozycji: instancja = TYP × parametry zmienne × ilość | **BINDING** | Architecture | `SPEC_00_LAYERING.md`, `SPEC_02_ENM_CORE.md` | Specyfikacja MUSI definiować kanoniczną zasadę kompozycji elementów ENM: `instancja = TYP(katalog) + parametry_zmienne(kreator) + [override(tryb_ekspert)] + ilość`. Dotyczy wszystkich elementów: linia (LineType × długość), transformator (TransformerType × pozycja zaczepu × uziemienie), falownik (ConverterType × parametry eksploatacyjne × n_parallel), odbiór (LoadType × P,Q,cosφ). Zasada ta jest częściowo zaimplementowana (AS-IS: resolver.py, catalog_ref na Branch/Trafo) i częściowo planowana (TO-BE: catalog_ref na Generator, n_parallel, tryb ekspert). |
| 19 | Napięcie falownika = parametr typu katalogowego, nie reguła specyfikacji | **BINDING** | ENM Core + Catalog + Wizard | `SPEC_02_ENM_CORE.md`, `SPEC_13_WIZARD.md` | Specyfikacja NIE MOŻE definiować sztywnych wartości napięć falowników. Napięcie znamionowe falownika wynika WYŁĄCZNIE z wybranego typu w katalogu (`ConverterType` / `InverterType`). Bus nn źródła ma napięcie determinowane przez typ przyłączonego falownika — nie przez regułę systemową, nie przez decyzję użytkownika w kreatorze. Kreator odczytuje napięcie z katalogu i przypisuje je do Bus nn automatycznie. Specyfikacja zachowuje jedynie zasadę: falownik jest elementem nn, bezpośrednie przyłączenie do SN jest niedozwolone. |
| 20 | Granica ENM: zamknięta lista bytów obliczeniowych, zakaz danych solverowych | **BINDING** | ENM Core | `SPEC_CHAPTER_02_ENM_DOMAIN_MODEL.md` | ENM posiada zamkniętą listę 10 bytów obliczeniowych: Bus, Junction, OverheadLine, Cable, SwitchBranch, FuseBranch, Transformer, Source, Generator, Load. Solver widzi WYŁĄCZNIE te byty (po mapowaniu). Substation, Bay, Corridor NIE SĄ bytami obliczeniowymi — solver ich nie przetwarza (`mapping.py` ich nie importuje). ENM NIE MOŻE przechowywać danych solverowych (node_type, voltage_magnitude_pu, active_power_mw) ani wyników obliczeń. Dodanie nowego bytu obliczeniowego wymaga ADR. |
| 21 | Klasyfikacja funkcji zabezpieczeniowych: Technologiczne vs Sieciowe | **BINDING** | ENM Core + Protection + WhiteBox | `SPEC_CHAPTER_02_ENM_DOMAIN_MODEL.md`, `SPEC_12_PROTECTION.md` | ProtectionFunction dzieli się na dwie rozłączne klasy: (1) **Technologiczne** — wbudowane w falownik (LVRT, HVRT, 81U/81O/81R, anti-islanding), autonomiczne, ≤250 ms, BEZ koordynacji selektywnej, modelowane jako warunki brzegowe NC RfG / IRiESD; (2) **Sieciowe** — klasyczne IEC/ETAP (50, 51, 50N, 51N, 27, 59, 21, 67, 87, 79), nastawiane, selektywne, podlegające koordynacji. Klasy te NIE SĄ zamienne i NIE podlegają wzajemnej koordynacji — solver zabezpieczeń przetwarza WYŁĄCZNIE klasę Sieciowe, klasa Technologiczne jest warunkiem brzegowym. Każda ProtectionFunction MUSI mieć punkt pomiarowy (miejsce, źródło sygnału, aparatura sterowana). White Box MUSI rozróżniać zdarzenia TECHNOLOGICAL i NETWORK w `event_type`. Kod AS-IS (`sanity_checks/rules.py`) NIE klasyfikuje funkcji — wszystkie traktowane jednorodnie (GAP do usunięcia w SPEC_12). |

### 9.3 Konsekwencje architektoniczne

**Z decyzji #1 i #2 wynika:**
- Specyfikacja ENM (SPEC_02) opisuje WYŁĄCZNIE kontrakt `enm/models.py` (Pydantic v2) i `types/enm.ts` (TypeScript mirror).
- Pola solverowe (`node_type`, `voltage_magnitude_pu`, `active_power_mw`) NIE pojawiają się w specyfikacji ENM.
- Mapowanie ENM→Solver (`enm/mapping.py`) jest opisane w SPEC_00_LAYERING jako kontrakt warstwy.

**Z decyzji #3 wynika:**
- `EnergyNetworkModel.generators` jest osobną listą, a nie częścią `sources`.
- Generator ma osobne warunki brzegowe solvera (PV node) vs Source (SLACK node).

**Z decyzji #8a–8c wynika:**
- Bay i Substation → warstwa ENM Meta (organizacja logiczna).
- Junction → warstwa ENM Core (topologia fizyczna).
- Corridor → warstwa SLD Layout (wizualizacja, routing).
- Solver NIE widzi Bay, Substation, Corridor — widzi tylko Bus, Branch, Transformer, Switch, Source.

**Z decyzji #11 i #12 wynika (źródła OZE — BINDING):**
- Generator energoelektroniczny (falownik) z `gen_type ∈ {pv_inverter, wind_inverter, bess}` jest ZAWSZE elementem niskonapięciowym (nn). Napięcie znamionowe falownika wynika wyłącznie z wybranego typu w katalogu — specyfikacja NIE definiuje sztywnych wartości napięć.
- Bezpośrednie przyłączenie falownika do szyny SN (Bus z `voltage_kv > 1 kV`) jest **NIEDOZWOLONE**.
- Jedyna dopuszczalna topologia fizyczna OZE → SN:
  ```
  N × Generator (falownik, nn)
  │
  Bus nn źródła (napięcie z typu katalogowego falownika)
  │
  Pole źródłowe nn (łączniki + zabezpieczenia)
  │
  Bus nn stacji
  │
  Transformator nn/SN
  │
  Bus SN stacji
  ```
- Bus nn źródła: napięcie determinowane przez typ przyłączonego falownika z katalogu, NIE przez regułę systemową ani decyzję użytkownika.
- Generator **nie zna** poziomu SN — poziom SN osiągany WYŁĄCZNIE przez transformator.
- Każdy element toru jest jawny w ENM — brak domyślnych/ukrytych transformatorów.
- Kreator MUSI wymuszać obecność transformatora nn/SN przy integracji OZE z SN.
- Walidator MUSI blokować uruchomienie solvera przy falowniku na szynie SN.

**Z decyzji #13 wynika (odbiory — BINDING):**
- Load jest przyłączany do konkretnego Bus przez `bus_ref`.
- Każdy odbiór powinien mieć kompletny tor fizyczny (szyna → łącznik/zabezpieczenie → pole odpływowe → odbiór).
- Kreator MUSI prowadzić użytkownika przez kompletne przyłączanie odbioru z polem odpływowym.
- System MUSI weryfikować, czy każdy Load ma pełny tor do źródła zasilania.

**Z decyzji #14 wynika (InverterSource — BINDING):**
- `InverterSource` (solver, `network_model/core/inverter.py`) MUSI być mapowany z ENM `Generator(gen_type=pv_inverter|wind_inverter|bess)`.
- Mapowanie w `enm/mapping.py` MUSI uwzględniać konwersję parametrów: `Generator.p_mw` → `InverterSource.in_rated_a` (przez napięcie szyny nn i konwersję mocy na prąd).
- Solver SC widzi wkład falownikowy TYLKO przez `InverterSource` (ograniczone źródło prądowe `Ik = k_sc · In`), NIE przez P/Q adjustment na węźle.
- Katalogowy `ConverterType` / `InverterType` (`catalog/types.py`) dostarcza parametry: `un_kv`, `sn_mva`, `pmax_mw`, `k_sc`.

**Z decyzji #15 i #18 wynika (katalog typów — BINDING):**
- Katalog typów (`catalog/types.py`) jest **domyślnym i preferowanym źródłem** parametrów znamionowych.
- Resolver (`catalog/resolver.py`) implementuje 3-poziomową precedencję: `impedance_override > type_ref > instance` (AS-IS).
- Każdy element sieciowy ENM POWINIEN posiadać `catalog_ref` referencjonujący typ katalogowy.
- AS-IS: `OverheadLine.catalog_ref`, `Cable.catalog_ref`, `Transformer.catalog_ref` — zaimplementowane.
- TO-BE: `Generator.catalog_ref` → `ConverterType` / `InverterType` — wymagane rozszerzenie.
- Parametry odczytane z katalogu są **tylko do odczytu** w trybie standardowym.
- `ParameterSource` (OVERRIDE, TYPE_REF, INSTANCE) jednoznacznie identyfikuje pochodzenie każdego parametru.

**Z decyzji #16 wynika (tryb EKSPERT — BINDING, TO-BE):**
- System MUSI przewidywać jawny **TRYB EKSPERT**, umożliwiający kontrolowaną edycję wybranych parametrów typu na poziomie instancji.
- Tryb EKSPERT: (1) wyraźnie oznaczony w UI, (2) świadomie aktywowany przez użytkownika, (3) każdy override NIE modyfikuje katalogu — dotyczy wyłącznie danej instancji.
- Override jest zapisywany jako **odstępstwo od danych katalogowych**: `{parameter_name: overridden_value}`.
- ENM MUSI przechowywać per instancja: `type_id`, snapshot parametrów typu, listę override'ów.
- White Box MUSI jednoznacznie wskazywać: które parametry pochodzą z katalogu, a które zostały nadpisane w trybie ekspert.
- Zakaz niejawnych modyfikacji: NIEDOZWOLONE jest automatyczne lub „ciche" zmienianie parametrów typu bez wiedzy użytkownika.

**Z decyzji #21 wynika (klasyfikacja zabezpieczeń — BINDING):**
- `ProtectionFunction` posiada dwie rozłączne klasy: **Technologiczne** i **Sieciowe**.
- Klasa **Technologiczne**: funkcje wbudowane w falownik (LVRT, HVRT, 81U/81O/81R, anti-islanding, ograniczenie prądu), autonomiczne (≤250 ms), NIE podlegają koordynacji selektywnej, modelowane jako warunki brzegowe NC RfG / IRiESD.
- Klasa **Sieciowe**: klasyczne funkcje IEC/ETAP (50, 51, 50N, 51N, 27, 59, 21, 67, 87, 79), nastawiane, selektywne, podlegające koordynacji — to jest wejście solvera zabezpieczeń.
- Solver zabezpieczeń przetwarza WYŁĄCZNIE klasę Sieciowe; klasę Technologiczne traktuje jako warunki brzegowe (czas działania, zachowanie przy zwarciu).
- Każda `ProtectionFunction` MUSI posiadać punkt pomiarowy: miejsce, źródło sygnału (CT/VT/bezpośredni), aparatura sterowana (CB/LS/fuse).
- White Box MUSI rozróżniać typ zdarzenia: `event_type ∈ {TECHNOLOGICAL, NETWORK}`.
- Kod AS-IS (`sanity_checks/rules.py`, `ProtectionFunctionSummary`) NIE posiada klasyfikacji — wszystkie 17 reguł sanity checks traktuje jednorodnie. To jest GAP opisany w SPEC_12 TO-BE.

**Z decyzji #17 wynika (falowniki równoległe — BINDING, TO-BE):**
- Kreator MUSI umożliwiać podanie **liczby identycznych falowników pracujących równolegle** przy dodawaniu źródła OZE.
- Podejście implementacyjne (do decyzji): albo (A) kreator tworzy N osobnych instancji Generator w ENM, albo (B) Generator posiada pole `n_parallel` z rozwinięciem przy mapowaniu na solver.
- Solver SC MUSI uwzględniać sumaryczny wkład wszystkich falowników równoległych: `Ik_total = N × k_sc × In_rated`.
- White Box MUSI odtwarzać: typ katalogowy → ilość → parametry per instancja → wkład sumaryczny.

---

**KONIEC AUDYTU**
