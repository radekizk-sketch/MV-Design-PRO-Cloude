# PowerFactory UI/UX Parity Guidelines

**Version:** 1.0
**Status:** REFERENCE
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md

---

## 1. Purpose

This document defines UI/UX principles for MV-DESIGN-PRO that align with DIgSILENT PowerFactory user experience patterns. The goal is to provide users familiar with PowerFactory a consistent mental model when using MV-DESIGN-PRO.

**Scope:** Documentation and design guidelines ONLY. No implementation requirements.

---

## 2. UX Principles (PowerFactory-aligned)

### 2.1 Consistency Over Innovation

| Principle | Description |
|-----------|-------------|
| **Familiar patterns** | Use UI patterns that PowerFactory users already know |
| **Standard terminology** | Use PowerFactory/IEC terminology (Bus, Branch, Case) |
| **Predictable behavior** | Same action → same result, always |
| **No hidden magic** | All operations visible and auditable |

### 2.2 Explicit Over Implicit

| Avoid | Prefer | Rationale |
|-------|--------|-----------|
| Auto-correction of topology | Explicit user action | User must understand changes |
| Smart defaults that hide complexity | Visible defaults with explanation | Audit trail requirement |
| Implicit mode transitions | Explicit mode switching | User always knows context |
| Background calculations | User-triggered calculations | Results must be intentional |

### 2.3 Separation of Concerns (UI Level)

| Concern | UI Location | Editable |
|---------|-------------|----------|
| Network structure | Wizard / SLD (Edit Mode) | YES |
| Case parameters | Case Editor (Study Case Mode) | YES |
| Calculation results | Result Viewer (Result Mode) | NO |
| Analysis overlays | Result Viewer (Result Mode) | NO |

---

## 3. Terminology Consistency

### 3.1 Binding Terms (PowerFactory ↔ MV-DESIGN-PRO)

| PowerFactory | MV-DESIGN-PRO | IEC Standard |
|--------------|---------------|--------------|
| Terminal | Bus | Node / Terminal |
| Line | LineBranch (LINE) | Overhead line |
| Cable | LineBranch (CABLE) | Underground cable |
| 2-Winding Transformer | TransformerBranch | Two-winding transformer |
| Switch / Breaker | Switch | Switching device |
| External Grid | Source (EXTERNAL_GRID) | External network |
| Generator | Source (GENERATOR) | Synchronous machine |
| General Load | Load | Load |
| Study Case | Case | Study case |
| Type Library | Catalog | Type library |
| Substation | Station (logical) | Substation |

### 3.2 Forbidden UI Labels

Do NOT use these labels in user-facing UI:

| Forbidden | Use Instead | Reason |
|-----------|-------------|--------|
| Node | Bus | PowerFactory alignment |
| Connection Point | Bus | Clearer terminology |
| Scenario | Case / Study Case | Standard term |
| Virtual element | (none - don't create) | No virtual elements allowed |
| PCC object | PCC indicator (overlay) | PCC is interpretation |

---

## 4. Operational Modes (UI Implementation)

### 4.1 Edit Mode

**Purpose:** Modify NetworkModel structure

**Visual indicators:**
- Status bar: "EDIT MODE" or green indicator
- Toolbar: Edit tools active
- SLD: Full editing enabled

**Allowed actions:**
- Add / remove / modify Bus, Branch, Switch, Source, Load
- Modify element parameters via Property Grid
- Modify SLD layout

**Blocked actions:**
- Modify Case parameters
- View calculation results (must switch mode)

### 4.2 Study Case Mode

**Purpose:** Configure calculation scenarios

**Visual indicators:**
- Status bar: "STUDY CASE MODE" or blue indicator
- Toolbar: Case configuration tools active
- SLD: Read-only (network structure)

**Allowed actions:**
- Create / modify / delete Cases
- Set Case parameters (fault location, method, etc.)
- Select calculation options

**Blocked actions:**
- Modify NetworkModel structure
- View calculation results (must run calculation first)

### 4.3 Result Mode

**Purpose:** Inspect calculation results and analyses

**Visual indicators:**
- Status bar: "RESULT MODE" or gray indicator
- Toolbar: View/export tools only
- SLD: Read-only with result overlays

**Allowed actions:**
- View result details
- View analysis overlays (thermal, voltage)
- Export results

**Blocked actions:**
- Modify NetworkModel
- Modify Case parameters
- Re-run calculations (must switch to Case Mode)

---

## 5. Interaction Patterns

### 5.1 Property Grid Pattern

All object editing MUST use Property Grid:

```
User Action                     System Response
─────────────────────────────────────────────────
Double-click object      →      Open Property Grid
Edit field               →      Validate input
Click Apply/OK           →      Update NetworkModel
Click Cancel             →      Discard changes
```

**Property Grid structure:**
1. Header: Object type + name
2. Sections: Grouped by category (General, Electrical, etc.)
3. Fields: Label + input control
4. Footer: Apply / Cancel buttons

### 5.2 Context Menu Pattern

Right-click provides context-sensitive actions:

| Element Type | Menu Actions |
|--------------|--------------|
| Bus | Edit, Delete, Show Connected, Zoom To |
| Branch | Edit, Delete, Show Endpoints, View Parameters |
| Switch | Edit, Toggle State, Delete |
| Source | Edit, Delete |
| Load | Edit, Delete |
| Case | Edit, Run, Delete, Duplicate |
| Result | View, Export, Delete |

### 5.3 Drag-and-Drop (SLD Only)

| Action | Result |
|--------|--------|
| Drag Bus | Move Bus position (layout only) |
| Drag Branch endpoint | Reconnect to different Bus |
| Drag from palette | Create new element |

**Constraints:**
- Topology changes require confirmation
- No "smart" auto-connection
- Invalid drops rejected with explanation

---

## 6. SLD Conventions

### 6.1 Symbol Standards

| Element | Symbol | Notes |
|---------|--------|-------|
| Bus | Horizontal bar | Width indicates voltage level |
| Line | Solid line | With impedance indicator |
| Cable | Dashed line or marked | Distinguishable from Line |
| Transformer | Two circles | Standard IEC symbol |
| Switch (closed) | Connected bar | Solid connection |
| Switch (open) | Broken bar | Gap visible |
| Source | Circle with ~ | Or grid symbol |
| Load | Downward arrow | Or triangle |

### 6.2 Color Coding (Result Mode)

| Condition | Color | Meaning |
|-----------|-------|---------|
| Normal | Black/Default | Within limits |
| Warning | Yellow/Orange | Approaching limits |
| Violation | Red | Exceeds limits |
| Out of service | Gray | Disabled element |

### 6.3 Overlay Rules

| Overlay Type | Display Rule |
|--------------|--------------|
| PCC indicator | Shown at identified Bus (interpretation) |
| Thermal loading | % value on branches |
| Voltage | V value at buses |
| Fault current | Ik value at fault location |

**PCC overlay rule:** PCC is NOT a model object. It is displayed as an annotation/overlay based on BoundaryIdentifier heuristics.

---

## 7. Validation Feedback

### 7.1 Pre-Solver Validation

Before calculation, system displays validation status:

| Status | Visual | Action |
|--------|--------|--------|
| Valid | Green checkmark | Calculation enabled |
| Warning | Yellow triangle | Calculation enabled (with notice) |
| Error | Red X | Calculation blocked |

### 7.2 Validation Messages

| Category | Example Message |
|----------|-----------------|
| Connectivity | "Network is not connected. Island detected." |
| Source | "No source defined. Add External Grid or Generator." |
| Voltage | "Bus 'Bus_01' has invalid voltage (0 kV)." |
| Endpoints | "Line 'Line_01' has missing endpoint." |

---

## 8. UI Layer Constraints

### 8.1 What UI MUST NOT Do

| Constraint | Rationale |
|------------|-----------|
| NO physics calculations | Physics = Solver layer only |
| NO topology corrections | User must explicitly fix |
| NO hidden data stores | Single NetworkModel |
| NO implicit assumptions | All parameters visible |
| NO PCC creation in model | PCC = interpretation |

### 8.2 What UI MUST Do

| Requirement | Rationale |
|-------------|-----------|
| Display complete object state | Transparency |
| Provide Property Grid for all edits | Consistency |
| Show validation status | User awareness |
| Indicate current mode | Context clarity |
| Reflect NetworkModel changes immediately | Synchronization |

---

## 9. Compliance Checklist (UI)

| ID | Requirement | Verification |
|----|-------------|--------------|
| UI-001 | Property Grid for all edits | All edit paths use Property Grid |
| UI-002 | Context menu on right-click | Standard actions available |
| UI-003 | Mode indicator visible | Status bar shows current mode |
| UI-004 | Validation feedback before solver | Errors/warnings displayed |
| UI-005 | PowerFactory terminology | Bus, Branch, Case, Catalog |
| UI-006 | No PCC in model (UI level) | PCC shown as overlay only |
| UI-007 | SLD = NetworkModel view | 1:1 mapping, no virtual elements |

---

**END OF DOCUMENT**
