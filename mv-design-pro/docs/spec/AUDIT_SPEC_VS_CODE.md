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

**KONIEC AUDYTU**
