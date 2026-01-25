# Wizard Screens Specification

**Reference:** SYSTEM_SPEC.md Section 8, Section 18
**Status:** CANONICAL

---

## A. Workflow kreatora (Wizard Workflow)

### A.1 Step-by-Step Navigation (PF-style)

The Wizard follows PowerFactory Data Manager paradigm:

```
┌─────────────────────────────────────────────────────────────┐
│ Network Wizard                                    [X]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 3 of 10: Buses (Nodes)                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Property Grid / Form Content]                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────┐  ┌────────┐           ┌────────┐  ┌────────┐   │
│  │  Back  │  │  Next  │           │   OK   │  │ Cancel │   │
│  └────────┘  └────────┘           └────────┘  └────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### A.2 Button Behaviors

| Button | Action | Validation |
|--------|--------|------------|
| **Back** | Return to previous step | None (preserves data) |
| **Next** | Proceed to next step | Step-level validation |
| **OK** | Complete wizard, apply changes | Full model validation |
| **Cancel** | Abort wizard, discard changes | Confirmation if changes exist |

### A.3 Canonical Step Sequence

| Step | Name | Purpose | Model Object |
|------|------|---------|--------------|
| 1 | Project | Create/select project | Project |
| 2 | Type Library | Select equipment types | Catalog |
| 3 | Buses | Define electrical nodes | Bus |
| 4 | Lines/Cables | Define branch connections | LineBranch |
| 5 | Transformers | Define power transformers | TransformerBranch |
| 6 | Sources | Define power sources | Source |
| 7 | Loads | Define electrical loads | Load |
| 8 | Switches | Define switching apparatus | Switch |
| 9 | Validation | Pre-solver network check | NetworkValidator |
| 10 | Study Cases | Configure calculation scenarios | Case |

### A.4 Validation Before Solver

**MANDATORY:** Step 9 (Validation) MUST complete before any solver execution:

```
Step 9: Validation
        │
        ▼
NetworkValidator.validate()
        │
        ├── ERRORS present → Display errors, BLOCK "OK"
        │
        └── No ERRORS (warnings OK) → Allow "OK"
```

---

## B. Zasady UX (UX Rules)

### B.1 Property Grid First Principle

Every element edit MUST use Property Grid as primary interface:

| User Intent | UI Pattern |
|-------------|------------|
| Add element | Empty Property Grid → Fill → Add |
| Edit element | Populated Property Grid → Modify → Apply |
| View element | Read-only Property Grid |

### B.2 No Intelligent Shortcuts

**FORBIDDEN:**
- Auto-completing connections based on "likely" topology
- Suggesting element values based on heuristics
- Auto-creating elements based on partial input
- "Smart defaults" that hide user choices

**REQUIRED:**
- User explicitly specifies every value
- Defaults are visible and documented
- All auto-filled values are clearly marked

### B.3 Deterministic Lists

All dropdown lists and selection controls MUST be deterministic:

| List Type | Sort Order |
|-----------|------------|
| Buses | Alphabetical by name |
| Types (Catalog) | Alphabetical by name |
| Elements | Creation order (oldest first) |
| Enum values | Definition order (fixed) |

### B.4 Explicit Parameters

**MANDATORY:** All solver-relevant parameters MUST be explicitly shown:

```
┌─────────────────────────────────────────────────┐
│ Short Circuit Case Parameters                   │
├─────────────────────────────────────────────────┤
│ Fault Location:    [Bus_003           ▼]        │
│ Fault Type:        [Three-Phase       ▼]        │
│ c_max:             [1.10              ]         │
│ c_min:             [1.00              ]         │
│ Calculation:       [IEC 60909 Method B▼]        │
└─────────────────────────────────────────────────┘
```

**FORBIDDEN:**
- Hidden default values
- Implicit parameter selection
- "Advanced" sections that hide critical parameters

---

## C. Zakazy (Prohibitions)

### C.1 No Physics in Wizard

The Wizard MUST NOT perform any physics calculations:

| Forbidden | Correct Approach |
|-----------|------------------|
| Calculate impedance from geometry | User enters impedance OR selects Type |
| Calculate voltage drop | Solver calculates, Analysis interprets |
| Estimate load from building type | User enters load value directly |
| Calculate short circuit current | Solver calculates on explicit request |

### C.2 No Result Interpretation in Wizard

The Wizard MUST NOT interpret or display solver results:

| Forbidden | Correct Approach |
|-----------|------------------|
| Show "OVERLOAD" warning in Wizard | Analysis layer shows violations |
| Display calculated currents | Result Mode shows solver output |
| Show PCC marker | Analysis layer identifies PCC |
| Color-code by loading | Result overlay in SLD |

### C.3 No PCC in Wizard

**BINDING:** PCC MUST NOT appear in Wizard data entry:

| Forbidden | Correct Approach |
|-----------|------------------|
| "Select PCC Bus" step | BoundaryIdentifier in Analysis layer |
| PCC checkbox on Bus | Analysis identifies PCC from Source connection |
| PCC as required field | PCC is interpretation, not model data |

**Exception:** PCC hint MAY be stored in application settings (not NetworkModel) for user preference, but MUST NOT affect model structure.

### C.4 No Aggregation

**FORBIDDEN:**
- "Add Feeder" (aggregates multiple elements)
- "Add Substation" (creates complex structure)
- "Import from template" (creates multiple elements at once without explicit confirmation)

**REQUIRED:**
- Each element added individually
- User explicitly confirms each addition
- No batch creation without element-by-element review

---

## D. Form Validation Patterns

### D.1 Field-Level Validation

| Field Type | Validation | Error Display |
|------------|------------|---------------|
| Numeric | Range check, >0 where required | Red border + tooltip |
| Selection | Required selection | Red border + "Required" |
| Reference (UUID) | Target must exist | Red border + "Invalid reference" |
| Text | Non-empty where required | Red border + "Required" |

### D.2 Step-Level Validation

Before "Next" button proceeds:

1. All required fields filled
2. All field-level validations pass
3. Referential integrity (e.g., from_bus exists)

### D.3 Model-Level Validation

Before "OK" button completes wizard:

1. NetworkValidator.validate() called
2. No ERROR-level issues
3. User acknowledged WARNING-level issues (if any)

---

**END OF WIZARD SCREENS SPECIFICATION**
