# Wizard Screens Specification (PowerFactory Data Manager Style)

**Version:** 1.0
**Status:** REFERENCE
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md

---

## 1. Purpose

This document specifies the canonical workflow and screen structure for the MV-DESIGN-PRO Wizard, aligned with DIgSILENT PowerFactory Data Manager patterns.

**Scope:** Documentation and design guidelines ONLY. No implementation requirements.

---

## 2. Wizard Definition

### 2.1 What Wizard Is

| Aspect | Description |
|--------|-------------|
| Role | Sequential controller for NetworkModel creation |
| Equivalent | PowerFactory Data Manager |
| Data store | NetworkModel (shared with SLD) |
| Output | Valid NetworkModel ready for calculations |

### 2.2 What Wizard Is NOT

| Avoid | Rationale |
|-------|-----------|
| Separate model | Single NetworkModel principle |
| Physics engine | Solvers handle physics |
| Auto-correction system | User must understand all changes |
| Intelligent shortcut provider | Explicit steps required |

---

## 3. Canonical Step Sequence

### 3.1 Step Overview

| Step | Name | Model Object | Mandatory |
|------|------|--------------|-----------|
| 1 | Project Setup | Project | YES |
| 2 | Type Library | Catalog | YES (selection) |
| 3 | Buses (Nodes) | Bus | YES (min 1) |
| 4 | Lines / Cables | LineBranch | NO |
| 5 | Transformers | TransformerBranch | NO |
| 6 | Sources | Source | YES (min 1) |
| 7 | Loads | Load | NO |
| 8 | Switching Apparatus | Switch | NO |
| 9 | Model Validation | NetworkValidator | YES |
| 10 | Study Cases | Case | NO |

### 3.2 Step Flow Diagram

```
┌─────────────┐
│ Step 1:     │
│ Project     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 2:     │
│ Type Library│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 3:     │
│ Buses       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 4:     │
│ Lines/Cables│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 5:     │
│ Transformers│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 6:     │
│ Sources     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 7:     │
│ Loads       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 8:     │
│ Switches    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 9:     │
│ Validation  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Step 10:    │
│ Study Cases │
└─────────────┘
```

---

## 4. Screen Specifications

### 4.1 General Screen Structure

Every Wizard screen MUST follow this layout:

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Step Title + Progress Indicator                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONTENT AREA:                                              │
│  - List of existing items (left panel)                      │
│  - Property Grid / Form (right panel)                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: Navigation (Back | Next) + Validation Status        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Step 1: Project Setup

**Purpose:** Create or select project

**Screen elements:**
- Project name input
- Project description (optional)
- Voltage system selection (MV/HV)
- Frequency (50 Hz / 60 Hz)

**Validation before Next:**
- Project name is not empty
- Voltage system selected

**Model impact:**
- Creates Project object
- Sets global parameters

### 4.3 Step 2: Type Library (Catalog)

**Purpose:** Select types for network elements

**Screen elements:**
- Line types list (filterable)
- Cable types list (filterable)
- Transformer types list (filterable)
- "Add to Project" selection

**Validation before Next:**
- At least one type selected (warning only)

**Model impact:**
- Marks selected types as available for project
- No NetworkModel changes

### 4.4 Step 3: Buses

**Purpose:** Define electrical nodes

**Screen elements:**
- Bus list (left panel)
- Add / Edit / Delete buttons
- Property Grid (right panel):
  - Name
  - Voltage level (kV)
  - Node type (PQ, PV, SLACK)

**Validation before Next:**
- At least one Bus defined (blocking)
- All buses have valid voltage > 0

**Model impact:**
- Adds Bus objects to NetworkModel

### 4.5 Step 4: Lines / Cables

**Purpose:** Define physical connections (branches)

**Screen elements:**
- Branch list (left panel)
- Add Line / Add Cable buttons
- Property Grid (right panel):
  - Name
  - Type (dropdown from Catalog)
  - From Bus (dropdown)
  - To Bus (dropdown)
  - Length (km)

**Validation before Next:**
- All branches have valid endpoints
- No duplicate branches between same buses (warning)

**Model impact:**
- Adds LineBranch objects to NetworkModel

### 4.6 Step 5: Transformers

**Purpose:** Define transformer branches

**Screen elements:**
- Transformer list (left panel)
- Add 2W Transformer button
- Property Grid (right panel):
  - Name
  - Type (dropdown from Catalog)
  - HV Bus (dropdown)
  - LV Bus (dropdown)
  - Tap position

**Validation before Next:**
- HV and LV buses are different
- HV voltage > LV voltage

**Model impact:**
- Adds TransformerBranch objects to NetworkModel

### 4.7 Step 6: Sources

**Purpose:** Define power injections

**Screen elements:**
- Source list (left panel)
- Add External Grid / Add Generator buttons
- Property Grid (right panel):
  - Name
  - Source type
  - Connected Bus (dropdown)
  - Sk'' (MVA) - for external grid
  - R/X ratio

**Validation before Next:**
- At least one Source defined (blocking)
- Source connected to existing Bus

**Model impact:**
- Adds Source objects to NetworkModel

### 4.8 Step 7: Loads

**Purpose:** Define power consumption

**Screen elements:**
- Load list (left panel)
- Add Load button
- Property Grid (right panel):
  - Name
  - Connected Bus (dropdown)
  - P (MW)
  - Q (Mvar)

**Validation before Next:**
- Loads connected to existing Buses

**Model impact:**
- Adds Load objects to NetworkModel

### 4.9 Step 8: Switching Apparatus

**Purpose:** Define topology switches

**Screen elements:**
- Switch list (left panel)
- Add Switch button
- Property Grid (right panel):
  - Name
  - Switch type (Breaker, Disconnector, Load Switch, Fuse)
  - From Bus (dropdown)
  - To Bus (dropdown)
  - Initial state (Open / Closed)

**Validation before Next:**
- Switches connected to existing Buses

**Model impact:**
- Adds Switch objects to NetworkModel
- NO impedance data (switches have zero impedance)

### 4.10 Step 9: Model Validation

**Purpose:** Verify NetworkModel before calculations

**Screen elements:**
- Validation results list
- Error details panel
- "Re-validate" button
- Network summary statistics

**Validation rules:**
| Rule | Severity | Description |
|------|----------|-------------|
| Connectivity | ERROR | Network must be connected |
| Source present | ERROR | At least one source required |
| No dangling | ERROR | All elements must be connected |
| Voltage valid | ERROR | All buses must have V > 0 |
| Endpoints exist | ERROR | All branch endpoints must exist |

**Blocking behavior:**
- Cannot proceed to Study Cases if ERROR exists
- Warnings allow proceed

**Model impact:**
- No changes (read-only validation)

### 4.11 Step 10: Study Cases

**Purpose:** Create calculation scenarios

**Screen elements:**
- Case list (left panel)
- Add Short Circuit Case / Add Power Flow Case buttons
- Property Grid (right panel):
  - Case name
  - Case type
  - Case-specific parameters

**For Short Circuit Case:**
- Fault location (Bus or Branch + position)
- Fault type (3-phase, L-G, etc.)
- Voltage factor c_max / c_min
- Calculation method (IEC 60909)

**For Power Flow Case:**
- Max iterations
- Tolerance
- Slack bus override (optional)

**Validation before Finish:**
- Cases have valid parameters

**Model impact:**
- Creates Case objects (reference NetworkSnapshot)

---

## 5. Property Grid Standard

### 5.1 Field Types

| Field Type | Control | Example |
|------------|---------|---------|
| Text | Text input | Name |
| Number | Number input with unit | Voltage (kV) |
| Dropdown | Select list | Node type |
| Checkbox | Toggle | In service |
| Reference | Dropdown with search | From Bus |

### 5.2 Property Grid Layout

```
┌─────────────────────────────────────────┐
│ Properties: [Object Type] "[Name]"       │
├─────────────────────────────────────────┤
│ ▼ General                               │
│   Name:           [_______________]     │
│   In Service:     [✓]                   │
├─────────────────────────────────────────┤
│ ▼ Electrical                            │
│   Voltage (kV):   [15.0          ]      │
│   Node Type:      [PQ            ▼]     │
├─────────────────────────────────────────┤
│ ▼ Short Circuit                         │
│   (derived values shown read-only)      │
├─────────────────────────────────────────┤
│        [Apply]         [Cancel]         │
└─────────────────────────────────────────┘
```

### 5.3 Validation Feedback

| State | Visual | Action |
|-------|--------|--------|
| Valid | Normal border | Allow Apply |
| Warning | Yellow border + icon | Allow Apply (with notice) |
| Error | Red border + icon | Block Apply |

---

## 6. Modal Dialogs

### 6.1 Add Element Modal

```
┌─────────────────────────────────────────┐
│ Add New [Element Type]                   │
├─────────────────────────────────────────┤
│                                         │
│  [Property Grid for new element]        │
│                                         │
├─────────────────────────────────────────┤
│        [Add]           [Cancel]         │
└─────────────────────────────────────────┘
```

### 6.2 Delete Confirmation Modal

```
┌─────────────────────────────────────────┐
│ Confirm Delete                           │
├─────────────────────────────────────────┤
│                                         │
│  Are you sure you want to delete        │
│  [Element Type] "[Name]"?               │
│                                         │
│  This will also remove:                 │
│  - [dependent items list]               │
│                                         │
├─────────────────────────────────────────┤
│        [Delete]        [Cancel]         │
└─────────────────────────────────────────┘
```

---

## 7. Wizard Rules (Non-Negotiable)

### 7.1 Data Rules

| Rule | Description |
|------|-------------|
| Single source | Wizard edits NetworkModel directly |
| No caching | All data from NetworkModel |
| No special objects | Only standard model objects |
| No hidden fields | All parameters visible |

### 7.2 Behavior Rules

| Rule | Description |
|------|-------------|
| Deterministic lists | Same order, same content every time |
| No intelligent shortcuts | User must explicitly create each element |
| Validation before solver | Cannot skip validation step |
| Explicit confirmation | Destructive actions require confirmation |

### 7.3 Forbidden Behaviors

| Forbidden | Rationale |
|-----------|-----------|
| Auto-create missing elements | User must understand model |
| Auto-correct topology | No hidden modifications |
| Skip validation | Safety requirement |
| Create virtual elements | 1:1 model mapping |
| Hide parameters | Transparency requirement |

---

## 8. Navigation Rules

### 8.1 Forward Navigation

- "Next" validates current step
- Blocking errors prevent navigation
- Warnings show notice but allow navigation

### 8.2 Backward Navigation

- "Back" preserves all entered data
- No confirmation required
- Changes persist in NetworkModel

### 8.3 Direct Step Access

- Step indicators clickable for completed steps
- Cannot skip ahead past validation errors
- Current step always highlighted

---

## 9. Compliance Checklist (Wizard)

| ID | Requirement | Verification |
|----|-------------|--------------|
| WZ-001 | Step sequence as specified | All 10 steps in order |
| WZ-002 | Property Grid for all edits | No inline editing |
| WZ-003 | Validation before Step 9 | Errors block navigation |
| WZ-004 | Deterministic lists | Consistent ordering |
| WZ-005 | No intelligent shortcuts | Explicit element creation |
| WZ-006 | No virtual objects | 1:1 model mapping |
| WZ-007 | NetworkModel as data source | No separate store |
| WZ-008 | Confirmation for delete | Modal required |

---

**END OF DOCUMENT**
