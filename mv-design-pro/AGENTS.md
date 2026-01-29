# MV-DESIGN-PRO Agent Governance

**Version:** 2.0
**Status:** CANONICAL
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md

---

## 1. Authority & Scope

This repository is governed by strict architectural principles aligned with **DIgSILENT PowerFactory**.

### 1.1 Architectural Authority

- Only the **System Architect** defines solver boundaries and dependencies
- Changes must follow **SYSTEM_SPEC.md** (canonical)
- All agents (human or AI) must comply with PowerFactory alignment

### 1.2 Change Mechanism

- **ExecPlan is the only change mechanism**
- Update existing ExecPlan; do not create new ones
- See **PLANS.md** for current execution plan

---

## 2. Core Rules (Immutable)

### 2.1 NOT-A-SOLVER Rule

The following are **NOT solvers** and cannot contain physics calculations:

| Component | Status |
|-----------|--------|
| Protection | NOT a solver (Analysis layer) |
| Frontend | NOT a solver (Presentation layer) |
| Reporting | NOT a solver (Presentation layer) |
| Wizard | NOT a solver (Application layer) |
| SLD | NOT a solver (Visualization layer) |
| Validation | NOT a solver (Pre-check layer) |

**Only dedicated core solvers compute physics:**
- `network_model.solvers.short_circuit_iec60909`
- `network_model.solvers.power_flow_newton`

### 2.2 WHITE BOX Rule

All solvers **MUST**:
- Expose all calculation steps
- Provide intermediate values
- Allow numerical audit
- Document assumptions

**Forbidden:**
- Black-box solvers
- Hidden corrections
- Undocumented simplifications

### 2.3 Single Model Rule

- **ONE NetworkModel** per project
- Wizard and SLD edit **THE SAME** model
- No duplicate data stores
- No shadow models

### 2.4 Case Immutability Rule

- Case **CANNOT mutate** NetworkModel
- Case stores **ONLY** calculation parameters
- Multiple Cases → one Model (read-only view)

### 2.5 PCC Prohibition Rule

- **PCC is NOT in NetworkModel**
- PCC is identified in **interpretation layer**
- PCC is a business/legal concept, not physics

---

## 3. Layer Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  - Frontend                                              │
│  - Reports                                               │
│  - Export                                                │
│  NO physics, NO model mutation                           │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│  - Wizard (edit controller)                              │
│  - SLD (visualization)                                   │
│  - Validation (pre-check)                                │
│  NO physics calculations                                 │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                        │
│  - NetworkModel (Bus, Branch, Switch, Source, Load)     │
│  - Catalog (Type Library)                                │
│  - Case (Study Cases)                                    │
│  Model mutation allowed HERE ONLY (via Wizard/SLD)       │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                      SOLVER LAYER                        │
│  - IEC 60909 Short Circuit                               │
│  - Newton-Raphson Power Flow                             │
│  PHYSICS HERE ONLY                                       │
│  WHITE BOX REQUIRED                                      │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                     ANALYSIS LAYER                       │
│  - Protection Analysis                                   │
│  - Thermal Analysis                                      │
│  - Voltage Analysis                                      │
│  - Boundary Identification (PCC)                         │
│  INTERPRETATION ONLY, NO physics                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Execution Requirements

### 4.1 Before Implementation

1. Verify alignment with **SYSTEM_SPEC.md**
2. Check **PLANS.md** for current execution plan
3. Confirm no violation of layer boundaries

### 4.2 During Implementation

1. Preserve frozen Result APIs
2. Maintain deterministic behavior
3. Keep all changes auditable (WHITE BOX)
4. Do not add PCC to NetworkModel
5. Do not add physics to non-solver layers

### 4.3 After Implementation

1. Update **PLANS.md** with completed steps
2. Run validation tests
3. Verify WHITE BOX trace works
4. Create small, focused PRs

---

## 5. Deliverables Discipline

### 5.1 ExecPlan Requirements

All ExecPlans must be:
- Self-contained
- Novice-readable
- Restartable from zero context

Each ExecPlan must define:
- **WHAT IT IS** and **WHAT IT IS NOT**
- **NOW vs LATER** (scope)
- Maximal responsibility blocks for stage plans

### 5.2 Code Requirements

| Requirement | Description |
|-------------|-------------|
| Immutable Types | Catalog types are frozen |
| Result API Frozen | ShortCircuitResult, to_dict(), white_box_trace |
| Normative Language | IEC / PN-EN terminology |
| Determinism | Same input → same output |
| Auditability | All calculations traceable |

### 5.3 Documentation Requirements

| Document | Purpose | Authority |
|----------|---------|-----------|
| SYSTEM_SPEC.md | Canonical architecture | BINDING |
| ARCHITECTURE.md | Detailed design | REFERENCE |
| AGENTS.md | Governance rules | BINDING |
| PLANS.md | Execution plan | LIVING |

---

## 6. Prohibited Actions

### 6.1 Never Do

- Add PCC/boundary concepts to NetworkModel
- Add physics to non-solver components
- Create black-box calculations
- Modify frozen Result APIs without version bump
- Create shadow data models
- Bypass NetworkValidator

### 6.2 Always Ask Before

- Adding new solver types
- Modifying case structure
- Changing layer boundaries
- Adding new element types to NetworkModel

---

## 7. PowerFactory Alignment Checklist

Before any PR, verify:

### 7.1 Model Structure
- [ ] Single NetworkModel per project
- [ ] Bus (not Node) terminology
- [ ] Switch has no impedance
- [ ] Station is logical only (no physics)
- [ ] No PCC in model

### 7.2 Case Behavior
- [ ] Case cannot mutate model
- [ ] Case uses NetworkSnapshot (immutable)
- [ ] Results invalidated on model change

### 7.3 Solver Compliance
- [ ] WHITE BOX trace present
- [ ] All intermediate values accessible
- [ ] No hidden corrections
- [ ] Manual audit possible

### 7.4 Wizard/SLD Unity
- [ ] Both edit same NetworkModel
- [ ] No duplicate data stores
- [ ] Changes reflect in both views

---

## 8. Agent Communication

### 8.1 For Human Agents

When making changes:
1. Read SYSTEM_SPEC.md first
2. Check PLANS.md for context
3. Follow layer boundaries
4. Update PLANS.md after completion

### 8.2 For AI Agents (Codex, Claude, etc.)

**MUST follow these rules:**

1. **Do not invent scope** beyond the plan
2. **Do not add PCC** to NetworkModel
3. **Do not add physics** to non-solver code
4. **Preserve frozen APIs**
5. **Maintain WHITE BOX** in all solvers

**When uncertain:**
- Ask for clarification
- Reference SYSTEM_SPEC.md
- Default to "do not change"

---

## 9. Version Control

### 9.1 Branch Strategy

- `main` - stable, tested
- `develop` - integration
- `feature/*` - new features
- `refactor/*` - architectural changes
- `fix/*` - bug fixes

### 9.2 PR Requirements

- Small, focused changes
- Reference to ExecPlan step
- Verification of compliance checklist
- WHITE BOX tests included

---

## 10. Źródła kanoniczne — Proof Pack (BINDING)

### 10.1 Przeznaczenie

Ten pakiet zawiera **kanoniczne źródła wiedzy** dla Proof Engine (P11).
**Wszystkie agenty (Claude, Codex, inne LLM) MUSZĄ traktować zawartość tych dokumentów jako BINDING REFERENCE.**

### 10.2 Dokumenty BINDING

Pełna lista dokumentów kanonicznych:

- `docs/proof_engine/README.md` — Polityka LaTeX-only, inwarianty pakietu
- `docs/proof_engine/PROOF_SCHEMAS.md` — Schematy JSON (ProofDocument, ProofStep)
- `docs/proof_engine/EQUATIONS_IEC60909_SC3F.md` — Rejestr równań SC3F z mapping keys
- `docs/proof_engine/EQUATIONS_VDROP.md` — Rejestr równań VDROP z mapping keys
- `docs/proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md` — Specyfikacja MVP, kroki dowodu
- `docs/proof_engine/P11_1c_SC_ASYMMETRICAL.md` — P11.1c Proof Pack (structure-only, SKELETON)
- `docs/proof_engine/P11_OVERVIEW.md` — TraceArtifact, hierarchia, UX

### 10.3 Reguły dla agentów AI

1. **NIE INTERPRETUJ** — bierz dosłownie definicje, schematy JSON, równania LaTeX
2. **NIE MODYFIKUJ** solverów ani Result API IEC 60909
3. **UŻYWAJ mapping keys** literalnie przy implementacji
4. **ZACHOWAJ determinism** — identyczne wejścia → identyczne wyjścia
5. **FORMAT KROKU**: Wzór → Dane → Podstawienie → Wynik → Weryfikacja jednostek
6. **LaTeX BLOKOWY** — wyłącznie `$$...$$`, zakaz inline `$...$`

### 10.4 Inwarianty Proof Engine

- **Solver nietknięty** — Proof Engine NIE modyfikuje solverów ani Result API
- **Determinism** — ten sam `run_id` → identyczny `proof.json` i `proof.tex`
- **Czysta interpretacja** — dowód generowany z gotowych danych trace/result
- **Traceability** — każda wartość ma mapping key do źródła
- **LaTeX-only math** — WSZYSTKIE symbole/jednostki WYŁĄCZNIE w blokach `$$...$$`
- **Prąd dynamiczny OBOWIĄZKOWY** — obowiązkowy wynik SC3F
- **Prąd cieplny OBOWIĄZKOWY** — obowiązkowy wynik SC3F z pełnym obliczeniem
- **Anti-double-counting** — współczynnik c dokładnie raz w łańcuchu
- **BEZ UPROSZCZEŃ** — pełne wzory na m i n, brak przybliżeń

---

## 11. Escalation

If any rule conflict is detected:
1. Stop implementation
2. Document conflict in PLANS.md
3. Request architectural review
4. Do not proceed until resolved

---

**END OF AGENT GOVERNANCE**

## 12. Źródła kanoniczne — P14–P19 (doc-only)

Poniższe dokumenty zawierają **CANONICAL SOURCES** dla pakietów P14–P19
(doc-only, FUTURE PACKS):

- `PLANS.md` — TODO backlog P14–P19 (CANONICAL SOURCES)
- `SYSTEM_SPEC.md` — sekcje TODO P14–P19 (CANONICAL SOURCES)
- `ARCHITECTURE.md` — sekcje TODO P14–P19 (CANONICAL SOURCES)
- `POWERFACTORY_COMPLIANCE.md` — checklisty P14–P19 (CANONICAL SOURCES)
- `docs/INDEX.md` — indeks źródeł P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/README.md` — reguły Proof Engine + TODO P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/P11_OVERVIEW.md` — TODO P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/P11_1a_MVP_SC3F_AND_VDROP.md` — TODO P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/P11_1b_REGULATION_Q_U.md` — TODO P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/P11_1c_SC_ASYMMETRICAL.md` — TODO P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/P11_1d_PROOF_UI_EXPORT.md` — TODO P14–P19 (CANONICAL SOURCES)
- `docs/proof_engine/PROOF_SCHEMAS.md` — TODO P14–P19 (CANONICAL SOURCES)

## TODO — Proof Packs P14–P19 (FUTURE PACKS)

### TODO-P14-001 (PLANNED) — P14: Power Flow Proof Pack (audit wyników PF) [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult
- Output: ProofPack P14 (ProofDocument: Audit rozpływu mocy)
- DoD:
  - [ ] Dowód bilansu węzła dla mocy czynnej i biernej z mapowaniem do TraceArtifact.

    $$
    \sum P = 0,\quad \sum Q = 0
    $$

  - [ ] Bilans gałęzi dla mocy czynnej i biernej uwzględnia straty oraz spadek napięcia.

    $$
    P_{in} \rightarrow P_{out} + P_{loss},\quad Q_{in} \rightarrow Q_{out} + \Delta U
    $$

  - [ ] Straty linii liczone jawnie z prądu i rezystancji.

    $$
    P_{loss} = I^{2} \cdot R
    $$

  - [ ] Porównanie counterfactual Case A vs Case B z raportem różnic.

    $$
    \Delta P,\ \Delta Q,\ \Delta U
    $$

### TODO-P15-001 (PLANNED) — P15: Load Currents & Overload Proof Pack [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult, Catalog
- Output: ProofPack P15 (ProofDocument: Prądy robocze i przeciążenia)
- DoD:
  - [ ] Prądy obciążenia linii/kabli wyprowadzone z mocy pozornej.

    $$
    I = \frac{S}{\sqrt{3} \cdot U}
    $$

  - [ ] Porównanie do prądu znamionowego z marginesem procentowym i statusem PASS/FAIL.
  - [ ] Transformator: relacja obciążenia do mocy znamionowej i overload %.

    $$
    \frac{S}{S_n}
    $$

### TODO-P16-001 (PLANNED) — P16: Losses & Energy Proof Pack [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult, Catalog
- Output: ProofPack P16 (ProofDocument: Straty mocy i energii)
- DoD:
  - [ ] Straty linii wyprowadzone z prądu i rezystancji.

    $$
    P_{loss,line} = I^{2} \cdot R
    $$

  - [ ] Straty transformatora z danych katalogowych: suma P0 i Pk.

    $$
    P_{loss,trafo} = P_{0} + P_{k}
    $$

  - [ ] Energia strat z profilu obciążenia (integracja w czasie).

    $$
    E_{loss} = \int P_{loss} \, dt
    $$

### TODO-P19-001 (PLANNED) — P19: Earthing / Ground Fault Proof Pack (SN) [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, Catalog
- Output: ProofPack P19 (ProofDocument: Doziemienia / uziemienia SN)
- DoD:
  - [ ] Jeśli SN: prądy doziemne z uwzględnieniem impedancji uziemienia i rozdziału prądu.
  - [ ] Tryb uproszczonych napięć dotykowych z wyraźnymi zastrzeżeniami.
  - [ ] Terminologia w ProofDocument: 1F-Z, 2F, 2F-Z oraz PCC – punkt wspólnego przyłączenia.
