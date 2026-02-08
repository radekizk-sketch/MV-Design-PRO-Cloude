# PLAN ROZBUDOWY SPECYFIKACJI MV-DESIGN-PRO

**Data:** 2026-02-08
**Wersja docelowa:** 3.0 (rozbudowa z v2.0/v3.0)
**Bazowy audyt:** `AUDIT_SPEC_VS_CODE.md`
**Język:** Polski (nazwy techniczne angielskie w kodzie)

---

## 1. STRUKTURA DOCELOWA

```
docs/spec/
├── SPEC_INDEX.md                    ← Indeks główny
├── AUDIT_SPEC_VS_CODE.md            ← Audyt (już istnieje)
├── SPEC_EXPANSION_PLAN.md           ← Ten dokument
├── SPEC_00_META.md                  ← Aksjomaty, zakazy, status
├── SPEC_01_ARCHITEKTURA.md          ← Architektura pojęciowa
├── SPEC_02_ENM_MODEL.md             ← Model ENM (fundament)
├── SPEC_03_TOPOLOGIA.md             ← Topologia sieci, wyspy, Y-bus
├── SPEC_04_STACJE.md                ← Stacje SN, GPZ, rozdzielnice
├── SPEC_05_LINIE_KABLE.md           ← Modele linii i kabli
├── SPEC_06_TRANSFORMATORY.md        ← Modele transformatorów
├── SPEC_07_LACZNIKI.md              ← Łączniki, pola rozdzielcze
├── SPEC_08_ZRODLA_ODBIORY.md        ← Source, Load, Generator
├── SPEC_09_SOLVER_ZWARCIA.md        ← Solver zwarciowy IEC 60909
├── SPEC_10_SOLVER_ROZPLYW.md        ← Solver rozpływowy Newton-Raphson
├── SPEC_11_ZABEZPIECZENIA.md        ← Koordynacja zabezpieczeń
├── SPEC_12_WHITE_BOX.md             ← System dowodów obliczeń
├── SPEC_13_KREATOR.md               ← Kreator (wizard) K1-K10
├── SPEC_14_DRZEWO_SLD.md            ← Drzewo ENM i SLD
├── SPEC_15_API_KONTRAKTY.md         ← Kontrakty API REST
├── SPEC_16_WALIDACJE.md             ← Kompletny system walidacji
├── SPEC_17_BAZA_DANYCH.md           ← Persystencja, snapshoty
└── SPEC_18_TESTY.md                 ← Kryteria akceptacji, test plan
```

---

## 2. PLAN SZCZEGÓŁOWY DLA KAŻDEGO PLIKU

---

### SPEC_00_META.md — Status, zakazy, aksjomaty

**Rozdziały:**
- §0.1 — Status dokumentu (~30 linii)
- §0.2 — Aksjomaty systemu (10 immutable invariants) (~60 linii)
- §0.3 — Zakazy globalne (NOT-A-SOLVER, PCC prohibition, codenames) (~40 linii)
- §0.4 — Terminologia wiążąca (PowerFactory mapping) (~40 linii)
- §0.5 — Terminy zakazane w modelu rdzeniowym (~20 linii)
- §0.6 — Procedura eskalacji (~20 linii)

**Źródła:**
- Istniejąca spec: §1, §11, §13
- Kod: brak (dokument regulacyjny)
- Normy: PN-EN 60909, PN-EN 60255

**Szacowana długość:** ~210 linii

---

### SPEC_01_ARCHITEKTURA.md — Architektura pojęciowa

**Rozdziały:**
- §1.1 — Model warstwowy (5 warstw: Presentation → Application → Domain → Solver → Analysis) (~80 linii)
- §1.2 — Architektura PowerFactory vs MV-DESIGN-PRO (~60 linii)
- §1.3 — Warstwy danych: ENM (edytowalny) vs Solver Model (read-only) vs Results (frozen) (~80 linii)
- §1.4 — Flow danych: Kreator → ENM → Mapping → Solver → Result → Analysis → Proof → Export (~60 linii)
- §1.5 — Study Case architecture (Case ≠ Model, singleton, invalidation) (~80 linii)
- §1.6 — Mapowanie ENM → NetworkGraph (deterministyczne, reguły) (~80 linii)
- §1.7 — Diagram architektury (Mermaid) (~40 linii)

**Źródła:**
- Istniejąca spec: §1, §4, §9, §10
- Kod: `enm/mapping.py`, `application/study_case/`, `application/active_case/`
- Architektura: `ARCHITECTURE.md`, `AGENTS.md`

**Szacowana długość:** ~480 linii

---

### SPEC_02_ENM_MODEL.md — Model ENM (FUNDAMENT)

**Rozdziały:**
- §2.1 — EnergyNetworkModel root (ENMHeader, ENMDefaults, listy elementów) (~80 linii)
- §2.2 — ENMElement — klasa bazowa (id, ref_id, name, tags, meta) (~40 linii)
- §2.3 — Bus — węzeł sieci (voltage_kv, grounding, limits) (~120 linii)
  - Definicja normowa, Pydantic v2, TypeScript, walidacje, przykład JSON
- §2.4 — Branch — typ bazowy (discriminated union na `type`) (~60 linii)
- §2.5 — OverheadLine — linia napowietrzna (R/X/B per km, length, rating) (~120 linii)
- §2.6 — Cable — kabel (jak linia + insulation) (~100 linii)
- §2.7 — SwitchBranch — łącznik (switch/breaker/disconnector/bus_coupler) (~80 linii)
- §2.8 — FuseBranch — bezpiecznik (rated_current_a, rated_voltage_kv) (~60 linii)
- §2.9 — Transformer — transformator 2W (sn, uhv, ulv, uk%, pk, vector_group, tap) (~150 linii)
- §2.10 — Source — źródło zasilania (Sk'', R/X, Z₀, c_max/c_min) (~120 linii)
- §2.11 — Load — odbiór (P, Q, model PQ/ZIP) (~60 linii)
- §2.12 — Generator — generacja (P, Q, gen_type, limits) (~80 linii)
- §2.13 — Supporting types (GroundingConfig, BusLimits, BranchRating, GenLimits) (~80 linii)
- §2.14 — Inwarianty modelu ENM (~40 linii)
- §2.15 — Przykład kompletny ENM (JSON) (~100 linii)

**Źródła:**
- Istniejąca spec: §2
- Kod: `enm/models.py` (291 linii), `types/enm.ts` (370 linii)
- Normy: PN-EN 60909-0

**Szacowana długość:** ~1270 linii

---

### SPEC_03_TOPOLOGIA.md — Topologia sieci

**Rozdziały:**
- §3.1 — Graf topologiczny (definicja, węzły, krawędzie, multigraf) (~60 linii)
- §3.2 — Macierz admitancyjna Y-bus (budowa, wzory Yii, Yij, właściwości) (~120 linii)
- §3.3 — Macierz impedancyjna Z-bus (Z = Y⁻¹, impedancja zwarciowa Zkk) (~60 linii)
- §3.4 — Detekcja wysp (algorytm BFS/DFS, walidacja źródeł) (~80 linii)
- §3.5 — Topologia efektywna (uwzględnienie stanu łączników) (~60 linii)
- §3.6 — Magistrala SN (Corridor, trunk BFS, T-node identification) (~80 linii)
- §3.7 — Topologia rozdzielni (BUSBAR, sekcjonowanie, konfiguracje) (~60 linii)
- §3.8 — TopologyGraph — kontrakt danych (~80 linii)
- §3.9 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §2.4
- Kod: `enm/topology.py`, `network_model/core/graph.py`, `network_model/core/ybus.py`
- Normy: teoria obwodów, metoda węzłowa

**Szacowana długość:** ~640 linii

---

### SPEC_04_STACJE.md — Stacje SN, GPZ, rozdzielnice

**Rozdziały:**
- §4.1 — Substation — kontener logiczny (gpz, mv_lv, switching, customer) (~80 linii)
- §4.2 — GPZ — Główny Punkt Zasilający (szyny WN/SN, trafo, pola) (~80 linii)
- §4.3 — Stacja SN/nN (szyny SN, trafo SN/nN, pola, odbiory) (~60 linii)
- §4.4 — Bay — pole rozdzielcze (IN, OUT, TR, COUPLER, FEEDER, MEASUREMENT, OZE) (~100 linii)
- §4.5 — Sekwencja normowa pola SN (odłącznik → wyłącznik → transformator CT → szyna) (~80 linii)
- §4.6 — Relacje topologiczne: Substation → Bay → Bus → Branch (~60 linii)
- §4.7 — Walidacje stacji (W005, W006, I003) (~60 linii)
- §4.8 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §2.2 (ogólne)
- Kod: `enm/models.py` (Substation, Bay)
- Normy: IRiESD ENEA, PN-EN 61936

**Szacowana długość:** ~560 linii

---

### SPEC_05_LINIE_KABLE.md — Modele linii i kabli

**Rozdziały:**
- §5.1 — OverheadLine definicja normowa (~40 linii)
- §5.2 — Schemat zastępczy π linii (R+jX, B/2, ASCII art) (~80 linii)
- §5.3 — Obliczenie R, X, B z danych katalogowych (wzory, przykład) (~80 linii)
- §5.4 — Składowe zerowe (R₀, X₀, B₀) (~60 linii)
- §5.5 — Katalog przewodów SN (AFL-6, ACSR, parametry typowe) (~60 linii)
- §5.6 — Cable definicja normowa (~40 linii)
- §5.7 — Schemat zastępczy kabla (jak linia + wyższa susceptancja) (~60 linii)
- §5.8 — Katalog kabli (XRUHAKXS, YHAKXS, parametry) (~60 linii)
- §5.9 — Obciążalność prądowa (In, Ith, Idyn) (~60 linii)
- §5.10 — BranchRating — kontrakt danych (~40 linii)
- §5.11 — Walidacje (E005, I002) (~40 linii)
- §5.12 — Przykład obliczeniowy White Box (~80 linii)
- §5.13 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §2.3 (LineBranch)
- Kod: `enm/models.py` (OverheadLine, Cable)
- Normy: PN-EN 60909-0, dane katalogowe

**Szacowana długość:** ~740 linii

---

### SPEC_06_TRANSFORMATORY.md — Modele transformatorów

**Rozdziały:**
- §6.1 — Transformer2W definicja normowa (~40 linii)
- §6.2 — Schemat zastępczy transformatora (RT+jXT, gałąź magnesująca, ASCII art) (~80 linii)
- §6.3 — Obliczenie ZT, RT, XT z danych katalogowych (wzory) (~80 linii)
- §6.4 — Korekta impedancji wg PN-EN 60909 (KT = 0.95·cmax/(1+0.6·xT)) (~80 linii)
- §6.5 — Dane tabliczkowe (Sn, Un, uk%, Pk, P₀, I₀%) (~60 linii)
- §6.6 — Grupa połączeń (vector_group: Dyn11, YNd5, ...) (~60 linii)
- §6.7 — Przełącznik zaczepów (tap_position, tap_step_percent) (~60 linii)
- §6.8 — Uziemienie neutralne (GroundingConfig) (~40 linii)
- §6.9 — Przykład obliczeniowy (trafo 25 MVA 110/15 kV) (~100 linii)
- §6.10 — Transformer3W — status PLANNED (~30 linii)
- §6.11 — Walidacje (E006, E007, W004) (~40 linii)
- §6.12 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §2.3 (TransformerBranch)
- Kod: `enm/models.py` (Transformer), `enm/mapping.py` (TransformerBranch)
- Normy: PN-EN 60909-0 §3.3, PN-EN 60076

**Szacowana długość:** ~710 linii

---

### SPEC_07_LACZNIKI.md — Łączniki, pola rozdzielcze

**Rozdziały:**
- §7.1 — SwitchBranch definicja normowa (~40 linii)
- §7.2 — Typy łączników: switch, breaker, bus_coupler, disconnector (~80 linii)
- §7.3 — FuseBranch — bezpiecznik (~60 linii)
- §7.4 — Model topologiczny (status: open/closed → wpływ na graf) (~60 linii)
- §7.5 — Impedancja łączników (pomijana: R≈0, X≈0) (~30 linii)
- §7.6 — Sekwencja normowa pola SN (odłącznik-wyłącznik-szyna) (~80 linii)
- §7.7 — Sprzęgło szyn (bus_coupler) (~40 linii)
- §7.8 — Walidacje (I001) (~30 linii)
- §7.9 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §2.1 (Switch/Breaker)
- Kod: `enm/models.py` (SwitchBranch, FuseBranch), `network_model/core/switch.py`
- Normy: PN-EN 62271

**Szacowana długość:** ~460 linii

---

### SPEC_08_ZRODLA_ODBIORY.md — Source, Load, Generator

**Rozdziały:**
- §8.1 — Source definicja normowa (sieć zewnętrzna, Thevenin) (~60 linii)
- §8.2 — Moc zwarciowa Sk'' i impedancja zastępcza Zk (~80 linii)
- §8.3 — Współczynnik napięciowy c (tabela cmin/cmax wg PN-EN 60909) (~60 linii)
- §8.4 — Składowa zerowa źródła (Z₀/Z₁, R₀/X₀) (~40 linii)
- §8.5 — Load definicja normowa (~40 linii)
- §8.6 — Model odbioru: PQ (stałomocowy) vs ZIP (~60 linii)
- §8.7 — Generator definicja normowa (~60 linii)
- §8.8 — Typy generatorów: synchronous, pv_inverter, wind_inverter, bess (~60 linii)
- §8.9 — InverterSource — model falownikowy w solverze (~80 linii)
- §8.10 — Korekta impedancji generatora KG wg PN-EN 60909 (~60 linii)
- §8.11 — GenLimits — ograniczenia mocy (~40 linii)
- §8.12 — Mapowanie na węzły solvera (PQ, PV, SLACK) (~60 linii)
- §8.13 — Walidacje (E001, E008, W002, W003) (~60 linii)
- §8.14 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §2.3 (Source, Load)
- Kod: `enm/models.py` (Source, Load, Generator), `enm/mapping.py`, `network_model/core/inverter.py`
- Normy: PN-EN 60909-0 §3.8, NC RfG (dla OZE)

**Szacowana długość:** ~800 linii

---

### SPEC_09_SOLVER_ZWARCIA.md — Solver zwarciowy IEC 60909

**Rozdziały:**
- §9.1 — Założenia upraszczające (7 założeń wg §1.5.2 normy) (~80 linii)
- §9.2 — Napięcie źródła zastępczego Eth = c·Un/√3 (~60 linii)
- §9.3 — Tabela współczynników c (cmin, cmax) wg PN-EN 60909 (~40 linii)
- §9.4 — Budowa Y-bus i Z-bus (macierz, inwersja, Zkk) (~100 linii)
- §9.5 — Impedancja zastępcza w punkcie zwarcia Zk (~80 linii)
- §9.6 — Typy zwarć: 3F, 2F, 1F, 2F+G (wzory, schematy) (~120 linii)
- §9.7 — Prąd zwarciowy początkowy Ik'' = c·Un·kU/|Zk| (~60 linii)
- §9.8 — Prąd udarowy ip = κ·√2·Ik'' (κ = 1.02+0.98·e^(-3R/X)) (~80 linii)
- §9.9 — Prąd zastępczy cieplny Ith = Ik''·√(m+n) (~60 linii)
- §9.10 — Prąd wyłączeniowy Ib (~60 linii)
- §9.11 — Moc zwarciowa Sk'' = √3·Un·Ik'' (~40 linii)
- §9.12 — Korekcje impedancji: KT (transformator), KG (generator), KS (elektrownia) (~80 linii)
- §9.13 — Wkłady źródeł falownikowych (~60 linii)
- §9.14 — ShortCircuitResult — frozen API contract (20+ pól) (~120 linii)
- §9.15 — White Box trace (pełny przykład ABCD) (~120 linii)
- §9.16 — Przykład obliczeniowy krok po kroku (~120 linii)
- §9.17 — Mapowanie na kod (~60 linii)
- §9.18 — Testy akceptacyjne (~60 linii)

**Źródła:**
- Istniejąca spec: §5
- Kod: `network_model/solvers/short_circuit_iec60909.py` (1008 linii), `short_circuit_core.py` (158 linii), `short_circuit_contributions.py`
- Normy: PN-EN 60909-0:2016 (pełna)

**Szacowana długość:** ~1400 linii

---

### SPEC_10_SOLVER_ROZPLYW.md — Solver rozpływowy Newton-Raphson

**Rozdziały:**
- §10.1 — Równania mocowo-napięciowe (forma biegunowa P-Q) (~80 linii)
- §10.2 — Typy węzłów solvera (PQ, PV, SLACK) i mapowanie z ENM (~80 linii)
- §10.3 — Macierz Jacobiego J = [H N; K L] (~100 linii)
- §10.4 — Algorytm Newton-Raphson (schemat blokowy) (~80 linii)
- §10.5 — Kryterium zbieżności max(|ΔP|, |ΔQ|) < ε (~40 linii)
- §10.6 — Opcje solvera (max_iter, tolerance, damping, trace_level) (~60 linii)
- §10.7 — Przepływy mocy w gałęziach (Pij, Qij, straty) (~80 linii)
- §10.8 — Obciążenie gałęzi (I/In × 100%) (~40 linii)
- §10.9 — Bilans mocy (ΔP, ΔQ — straty systemowe) (~40 linii)
- §10.10 — PowerFlowNewtonSolution — kontrakt danych (30+ pól) (~120 linii)
- §10.11 — Gauss-Seidel i Fast-Decoupled (warianty) (~60 linii)
- §10.12 — White Box trace PF (ybus_trace, nr_trace, init_state) (~80 linii)
- §10.13 — Przykład obliczeniowy (~100 linii)
- §10.14 — Mapowanie na kod (~40 linii)
- §10.15 — Testy akceptacyjne (~60 linii)

**Źródła:**
- Istniejąca spec: §5
- Kod: `power_flow_newton.py` (270 linii), `power_flow_newton_internal.py`, `power_flow_types.py`
- Normy: teoria obwodów, metoda węzłowa

**Szacowana długość:** ~1060 linii

---

### SPEC_11_ZABEZPIECZENIA.md — Koordynacja zabezpieczeń

**Rozdziały:**
- §11.1 — Funkcje zabezpieczeniowe: I>, I>>, Ie> (~80 linii)
- §11.2 — Model ProtectionDevice (Pydantic, TS) (~80 linii)
- §11.3 — ProtectionFunction (type, pickup, delay, characteristic) (~60 linii)
- §11.4 — Charakterystyki czasowe: DT, NI (IDMT), VI, EI (~80 linii)
- §11.5 — Dobór nastaw I>> (selektywność, czułość, cieplność) (~100 linii)
- §11.6 — Dobór nastaw I> (zwłoczne) (~60 linii)
- §11.7 — Przekładniki CT (przekładnia, klasa dokładności, ALF) (~60 linii)
- §11.8 — Koordynacja czasowa (stopniowanie Δt = 0.3/0.5 s) (~60 linii)
- §11.9 — SPZ — samoczynne powtórne załączenie (~60 linii)
- §11.10 — Ochrona ziemnozwarciowa Ie> (~60 linii)
- §11.11 — Mapowanie na kod (~40 linii)
- §11.12 — Testy akceptacyjne (~40 linii)

**Źródła:**
- Istniejąca spec: §6 (Analysis Layer — ogólne)
- Kod: `application/analyses/protection/`, `protection/curves/`
- Normy: PN-EN 60255-151, PN-EN 60909 (prądy zwarciowe na potrzeby nastaw)

**Szacowana długość:** ~780 linii

---

### SPEC_12_WHITE_BOX.md — System dowodów obliczeń

**Rozdziały:**
- §12.1 — Zasada White Box (każda wartość audytowalna) (~60 linii)
- §12.2 — Format ABCD (Teoria → Dane → Podstawienie → Wynik) (~80 linii)
- §12.3 — WhiteBoxTracer — mechanizm śladu (~60 linii)
- §12.4 — TraceArtifact — immutable artefakt obliczeniowy (~60 linii)
- §12.5 — ProofDocument — formalny dowód matematyczny (~80 linii)
- §12.6 — ProofStep — krok dowodu (formula, data, substitution, result, unit) (~60 linii)
- §12.7 — Pakiety dowodowe (SC3F, VDROP, Equipment, PF, Losses, Protection) (~80 linii)
- §12.8 — Rejestry równań (EQ_SC3F_001..010, EQ_VDROP_001..009) (~60 linii)
- §12.9 — Deterministyka (ten sam ENM → identyczny White Box) (~40 linii)
- §12.10 — Formaty eksportu (JSON, LaTeX, PDF, DOCX) (~40 linii)
- §12.11 — Pełny przykład White Box trace SC3F (~120 linii)
- §12.12 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §7
- Kod: `network_model/whitebox/tracer.py`, `application/proof_engine/`
- Docs: `docs/proof_engine/`

**Szacowana długość:** ~780 linii

---

### SPEC_13_KREATOR.md — Kreator (wizard) K1-K10

**Rozdziały:**
- §13.1 — Architektura kreatora (sekwencyjny kontroler, nie osobny model) (~60 linii)
- §13.2 — K1: Parametry systemu (częstotliwość, typ sieci, poziomy napięć) (~60 linii)
- §13.3 — K2: Źródło zasilania (Source: Sk'', Un, c) (~60 linii)
- §13.4 — K3: Szyny zbiorcze GPZ (Bus BUSBAR WN/SN) (~60 linii)
- §13.5 — K4: Transformator WN/SN (Transformer) (~60 linii)
- §13.6 — K5: Pola rozdzielcze GPZ (SwitchBranch) (~60 linii)
- §13.7 — K6: Magistrala SN (LineBranch[] + Junction[]) (~60 linii)
- §13.8 — K7: Stacje SN (Substation + Bay) (~60 linii)
- §13.9 — K8: Transformatory SN/nN (Transformer) (~60 linii)
- §13.10 — K9: Odbiory i generacja (Load[], Generator[]) (~60 linii)
- §13.11 — K10: Walidacja i gotowość (ENMValidator) (~60 linii)
- §13.12 — Reguły przejścia (preconditions per krok) (~60 linii)
- §13.13 — Relacja kreator → ENM → SLD (event flow) (~60 linii)
- §13.14 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §9.1
- Kod: `application/network_wizard/`, `application/wizard_actions/`, `application/wizard_runtime/`
- Docs: `docs/designer-wizard/`, `docs/spec/WIZARD_FLOW.md`

**Szacowana długość:** ~820 linii

---

### SPEC_14_DRZEWO_SLD.md — Drzewo ENM i SLD

**Rozdziały:**
- §14.1 — Drzewo ENM — struktura hierarchiczna (~80 linii)
- §14.2 — SLD — zasady projekcji (1:1 bijekcja ENM ↔ SLD symbol) (~60 linii)
- §14.3 — Auto-layout 5-fazowy (voltage-bands, bay-detection, crossing-min, coordinates, routing) (~120 linii)
- §14.4 — Symbole SLD (mapowanie element → symbol graficzny) (~80 linii)
- §14.5 — Synchronizacja selekcji (SLD ↔ Drzewo ↔ Inspektor) (~80 linii)
- §14.6 — SelectionRef — kontrakt selekcji (~40 linii)
- §14.7 — Overlays wynikowe (SC, PF, Protection na diagramie) (~60 linii)
- §14.8 — Eksport SLD (PNG, PDF, SVG) (~30 linii)
- §14.9 — Tryby geometrii (AUTO, CAD, HYBRID) (~40 linii)
- §14.10 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §9.2
- Kod: `frontend/src/engine/sld-layout/`, `frontend/src/ui/sld-editor/`, `application/sld/`
- Docs: `docs/spec/SLD_TOPOLOGICAL_ENGINE.md`, `docs/ui/`

**Szacowana długość:** ~630 linii

---

### SPEC_15_API_KONTRAKTY.md — Kontrakty API REST

**Rozdziały:**
- §15.1 — Architektura API (FastAPI, prefixes, middleware) (~60 linii)
- §15.2 — ENM Endpoints (GET/PUT /enm, validate, topology, readiness) (~120 linii)
- §15.3 — Projects Endpoints (CRUD) (~60 linii)
- §15.4 — Study Cases Endpoints (~60 linii)
- §15.5 — Analysis Runs Endpoints (SC, PF, dispatch) (~100 linii)
- §15.6 — Proof Pack Endpoints (~60 linii)
- §15.7 — SLD Endpoints (~40 linii)
- §15.8 — Catalog Endpoints (~40 linii)
- §15.9 — Protection Endpoints (~60 linii)
- §15.10 — Snapshot Endpoints (~40 linii)
- §15.11 — Error handling (exception_handlers, HTTP codes) (~60 linii)
- §15.12 — Request/Response types (Pydantic DTOs) (~80 linii)
- §15.13 — Pełna tabela endpointów (~80 linii)

**Źródła:**
- Istniejąca spec: brak
- Kod: `api/*.py` (32 pliki)

**Szacowana długość:** ~860 linii

---

### SPEC_16_WALIDACJE.md — Kompletny system walidacji

**Rozdziały:**
- §16.1 — Architektura walidacji (ENMValidator, pre-solver gate) (~60 linii)
- §16.2 — Kody błędów BLOCKER (E001-E008) (~120 linii)
- §16.3 — Kody ostrzeżeń IMPORTANT (W001-W008) (~120 linii)
- §16.4 — Kody informacyjne INFO (I001-I005) (~80 linii)
- §16.5 — Gotowość do analiz (AnalysisAvailability) (~60 linii)
- §16.6 — Walidacja topologiczna (connectivity, islands) (~60 linii)
- §16.7 — ValidationResult — kontrakt danych (~40 linii)
- §16.8 — Komunikaty po polsku (wzorce, suggested_fix) (~60 linii)
- §16.9 — wizard_step_hint (mapowanie na krok kreatora) (~40 linii)
- §16.10 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: §8
- Kod: `enm/validator.py` (513 linii)

**Szacowana długość:** ~680 linii

---

### SPEC_17_BAZA_DANYCH.md — Persystencja, snapshoty, historia

**Rozdziały:**
- §17.1 — Architektura persystencji (in-memory → DB docelowo) (~60 linii)
- §17.2 — In-memory store (aktualny stan) (~40 linii)
- §17.3 — Snapshoty ENM (immutable, hash SHA256) (~80 linii)
- §17.4 — Revision tracking (header.revision, updated_at) (~40 linii)
- §17.5 — Cache wyników (enm_hash → result) (~40 linii)
- §17.6 — Project Archive (ZIP import/export) (~60 linii)
- §17.7 — Docelowa architektura PostgreSQL/MongoDB (~60 linii)
- §17.8 — Mapowanie na kod (~40 linii)

**Źródła:**
- Istniejąca spec: brak
- Kod: `api/enm.py` (_enm_store, _run_cache), `infrastructure/persistence/`, `application/snapshots/`, `application/project_archive/`

**Szacowana długość:** ~420 linii

---

### SPEC_18_TESTY.md — Kryteria akceptacji i test plan

**Rozdziały:**
- §18.1 — Strategia testowania (unit, integration, e2e, golden) (~60 linii)
- §18.2 — Tolerancje numeryczne solverów (~60 linii)
- §18.3 — Golden tests — dane referencyjne SC (~80 linii)
- §18.4 — Testy regresji frozen API (~60 linii)
- §18.5 — Testy walidacji ENM (~60 linii)
- §18.6 — Testy topologii (~40 linii)
- §18.7 — Testy kreatorka K1-K10 (~40 linii)
- §18.8 — Testy SLD (unit + e2e Playwright) (~40 linii)
- §18.9 — Testy Proof Engine (~40 linii)
- §18.10 — Testy API (contract tests) (~40 linii)
- §18.11 — CI Pipeline (GitHub Actions) (~40 linii)
- §18.12 — Mapa plików testowych → funkcjonalność (~60 linii)

**Źródła:**
- Istniejąca spec: brak
- Kod: `tests/` (100+ plików)

**Szacowana długość:** ~620 linii

---

### SPEC_INDEX.md — Indeks główny

**Rozdziały:**
- Tabela plików z linkami
- Status każdego pliku
- Zależności między plikami
- Legenda statusów
- Changelog

**Szacowana długość:** ~150 linii

---

## 3. PODSUMOWANIE PLANU

| Plik | Rozdziały | Szacowane linie |
|---|---|---|
| SPEC_00_META.md | 6 | ~210 |
| SPEC_01_ARCHITEKTURA.md | 7 | ~480 |
| SPEC_02_ENM_MODEL.md | 15 | ~1270 |
| SPEC_03_TOPOLOGIA.md | 9 | ~640 |
| SPEC_04_STACJE.md | 8 | ~560 |
| SPEC_05_LINIE_KABLE.md | 13 | ~740 |
| SPEC_06_TRANSFORMATORY.md | 12 | ~710 |
| SPEC_07_LACZNIKI.md | 9 | ~460 |
| SPEC_08_ZRODLA_ODBIORY.md | 14 | ~800 |
| SPEC_09_SOLVER_ZWARCIA.md | 18 | ~1400 |
| SPEC_10_SOLVER_ROZPLYW.md | 15 | ~1060 |
| SPEC_11_ZABEZPIECZENIA.md | 12 | ~780 |
| SPEC_12_WHITE_BOX.md | 12 | ~780 |
| SPEC_13_KREATOR.md | 14 | ~820 |
| SPEC_14_DRZEWO_SLD.md | 10 | ~630 |
| SPEC_15_API_KONTRAKTY.md | 13 | ~860 |
| SPEC_16_WALIDACJE.md | 10 | ~680 |
| SPEC_17_BAZA_DANYCH.md | 8 | ~420 |
| SPEC_18_TESTY.md | 12 | ~620 |
| SPEC_INDEX.md | 5 | ~150 |
| **RAZEM** | **222** | **~12 870** |

### Porównanie z istniejącą specyfikacją:
- **SYSTEM_SPEC.md v3.0:** ~487 linii
- **Nowa specyfikacja:** ~12 870 linii (20 plików)
- **Wzrost:** ~26× (2600%)

---

## 4. KOLEJNOŚĆ PISANIA

```
Faza A (Fundament):     SPEC_00 → SPEC_01 → SPEC_02
Faza B (Elementy):      SPEC_05 → SPEC_06 → SPEC_07 → SPEC_08
Faza C (Topologia):     SPEC_03 → SPEC_04
Faza D (Solvery):       SPEC_09 → SPEC_10
Faza E (Analiza):       SPEC_11 → SPEC_12
Faza F (Aplikacja):     SPEC_13 → SPEC_14
Faza G (Kontrakty):     SPEC_15 → SPEC_16
Faza H (Infrastruktura): SPEC_17 → SPEC_18
Faza I (Finalizacja):   SPEC_INDEX
```

---

## 5. ZASADY PISANIA

1. **Każdy plik** zawiera nagłówek: tytuł, wersja, status BINDING, autor, zależności
2. **Każdy byt ENM** ma: definicję normową, Pydantic v2, TypeScript, walidacje, przykład, testy
3. **Każdy wzór** ma: oznaczenia, jednostki, źródło normowe, przykład liczbowy
4. **Każda walidacja** ma: unikalny kod, severity, message_pl, suggested_fix
5. **Każde mapowanie** na kod ma: pełną ścieżkę pliku, nazwę klasy/funkcji, status implementacji
6. **Język:** Polski (nazwy techniczne angielskie w kodzie)
7. **Format:** Markdown z ASCII art/Mermaid dla diagramów
8. **Zakaz PCC** w całej specyfikacji
9. **Zakaz skracania** istniejącej treści

---

**KONIEC PLANU — CZEKAM NA ZATWIERDZENIE**
