# Proof Pack: Protection Overcurrent Coordination

> **BINDING** — This document defines authoritative calculation rules.
>
> **UI-HIDDEN** — Internal engineering documentation. Not exposed in user interface.

---

## Document Information

| Property | Value |
|----------|-------|
| Module | Protection Overcurrent Coordination |
| Version | 1.0.0 |
| Standard | IEC 60255-151:2009, IEC 60909 |
| Status | CANONICAL |
| Visibility | INTERNAL (ui-hidden) |
| Layer | Analysis (NOT-A-SOLVER) |

---

## Scope

This Proof Pack:
- Documents the mathematical foundations for overcurrent protection coordination
- Provides WHITE-BOX calculation procedures (every intermediate value exposed)
- Defines formulas in **LaTeX-only** format
- Does NOT contain physics solver code (NOT-A-SOLVER rule)
- Serves as audit reference for protection analysis results

---

## Overview

All calculations are WHITE-BOX: every intermediate value is exposed for audit. This document uses IEC 60255-151:2009 standard formulas for inverse-time overcurrent characteristics.

---

## 1. IEC 60255-151 Inverse-Time Curves

### 1.1 Standard Curve Equation

The general inverse-time overcurrent characteristic is defined by:

$$
t = TMS \cdot \frac{A}{M^B - 1} + C
$$

where:
- $t$ = trip time [s]
- $TMS$ = Time Multiplier Setting (dial setting)
- $A$ = curve constant
- $B$ = curve exponent
- $C$ = additive constant (usually 0)
- $M = \frac{I_{fault}}{I_{pickup}}$ = current multiple

### 1.2 Standard Curve Parameters (IEC 60255-151:2009)

| Curve Type | Code | A | B | C |
|------------|------|---|---|---|
| Standard Inverse (Normalna odwrotna) | SI | 0.14 | 0.02 | 0 |
| Very Inverse (Bardzo odwrotna) | VI | 13.5 | 1.0 | 0 |
| Extremely Inverse (Ekstremalnie odwrotna) | EI | 80.0 | 2.0 | 0 |
| Long Time Inverse (Długoczasowa odwrotna) | LTI | 120.0 | 1.0 | 0 |
| Definite Time (Czas niezależny) | DT | - | - | - |

### 1.3 Example Calculation: SI Curve

**Given:**
- $I_{fault} = 2000$ A
- $I_{pickup} = 400$ A
- $TMS = 0.3$
- Curve: SI (A=0.14, B=0.02)

**Step 1:** Calculate current multiple

$$
M = \frac{I_{fault}}{I_{pickup}} = \frac{2000}{400} = 5.0
$$

**Step 2:** Calculate $M^B$

$$
M^B = 5.0^{0.02} = 1.0332
$$

**Step 3:** Calculate denominator

$$
M^B - 1 = 1.0332 - 1 = 0.0332
$$

**Step 4:** Calculate base time

$$
t_{base} = \frac{A}{M^B - 1} = \frac{0.14}{0.0332} = 4.217 \text{ s}
$$

**Step 5:** Apply TMS

$$
t = TMS \cdot t_{base} = 0.3 \times 4.217 = 1.265 \text{ s}
$$

**Result:** Trip time = **1.265 s** ✓

---

## 2. Sensitivity Check (Czułość)

### 2.1 Definition

Sensitivity ensures that protection will trip for minimum fault current at the protected zone end.

### 2.2 Formula

$$
k_s = \frac{I_{fault,min}}{I_{pickup}}
$$

### 2.3 Criteria

| Sensitivity Ratio $k_s$ | Verdict | Polish Label |
|------------------------|---------|--------------|
| $k_s \geq 1.5$ | PASS | Prawidłowa |
| $1.2 \leq k_s < 1.5$ | MARGINAL | Margines niski |
| $k_s < 1.2$ | FAIL | Niewystarczająca |

### 2.4 Proof Step

**Formula:**
$$
k_s = \frac{I_{k,min}^{"}}{I_{pickup}}
$$

**Data:**
- $I_{k,min}^{"} = 1200$ A (minimum 3-phase fault current from IEC 60909)
- $I_{pickup} = 400$ A

**Substitution:**
$$
k_s = \frac{1200}{400} = 3.0
$$

**Result:** $k_s = 3.0 \geq 1.5$ → **PASS** ✓

**Unit Verification:**
$$
\frac{[A]}{[A]} = [-] \checkmark
$$

---

## 3. Selectivity Check (Selektywność)

### 3.1 Definition

Selectivity ensures proper time grading between upstream (backup) and downstream (primary) protection devices. The downstream device must trip before the upstream device with sufficient margin.

### 3.2 Coordination Time Interval (CTI)

$$
CTI = t_{CB} + t_{OR} + t_{SF}
$$

where:
- $t_{CB}$ = circuit breaker operating time [s] (typical: 0.05 s)
- $t_{OR}$ = relay overtravel time [s] (0 for digital relays, 0.05 s for electromechanical)
- $t_{SF}$ = safety factor [s] (typical: 0.1 s)

**Typical CTI = 0.2 s** for modern digital relays

### 3.3 Time Margin Formula

$$
\Delta t = t_{upstream} - t_{downstream}
$$

### 3.4 Criteria

| Time Margin | Verdict | Polish Label |
|-------------|---------|--------------|
| $\Delta t \geq 1.2 \cdot CTI$ | PASS | Skoordynowane |
| $CTI \leq \Delta t < 1.2 \cdot CTI$ | MARGINAL | Margines niski |
| $\Delta t < CTI$ | FAIL | Nieskoordynowane |

### 3.5 Proof Step

**Formula:**
$$
\Delta t = t_{upstream} - t_{downstream} \geq CTI
$$

**Data:**
- $t_{upstream} = 0.85$ s (upstream device trip time at max fault)
- $t_{downstream} = 0.35$ s (downstream device trip time)
- $CTI = 0.2$ s

**Substitution:**
$$
\Delta t = 0.85 - 0.35 = 0.50 \text{ s}
$$

**Check:**
$$
\Delta t = 0.50 \text{ s} \geq 1.2 \times 0.2 = 0.24 \text{ s}
$$

**Result:** $\Delta t = 0.50$ s $\geq 0.24$ s → **PASS** ✓

**Unit Verification:**
$$
[s] - [s] = [s] \checkmark
$$

---

## 4. Overload Check (Przeciążalność)

### 4.1 Definition

Overload check ensures protection won't trip on normal operating current, providing a margin for inrush currents, cold load pickup, and measurement tolerances.

### 4.2 Formula

$$
k_o = \frac{I_{pickup}}{I_{operating}}
$$

### 4.3 Criteria

| Overload Ratio $k_o$ | Verdict | Polish Label |
|---------------------|---------|--------------|
| $k_o \geq 1.2$ | PASS | Prawidłowa |
| $1.1 \leq k_o < 1.2$ | MARGINAL | Margines niski |
| $k_o < 1.1$ | FAIL | Ryzyko fałszywego zadziałania |

### 4.4 Proof Step

**Formula:**
$$
k_o = \frac{I_{pickup}}{I_{rob}}
$$

**Data:**
- $I_{pickup} = 400$ A
- $I_{rob} = 280$ A (operating current from Power Flow)

**Substitution:**
$$
k_o = \frac{400}{280} = 1.43
$$

**Result:** $k_o = 1.43 \geq 1.2$ → **PASS** ✓

**Unit Verification:**
$$
\frac{[A]}{[A]} = [-] \checkmark
$$

---

## 5. Pickup Current Selection (Dobór I>)

### 5.1 Phase Overcurrent (51)

$$
I_{pickup,51} = k_{load} \cdot I_{n}
$$

where:
- $k_{load}$ = load factor (typical: 1.2–1.5)
- $I_n$ = rated/nominal current

### 5.2 Instantaneous Overcurrent (50)

$$
I_{pickup,50} = k_{SC} \cdot I_{k,min}^{"}
$$

where:
- $k_{SC}$ = short-circuit factor (typical: 0.8–1.0)
- $I_{k,min}^{"}$ = minimum short-circuit current at zone end

### 5.3 Earth Fault (51N)

$$
I_{pickup,51N} = k_{EF} \cdot I_{k,min,1ph}^{"}
$$

where:
- $k_{EF}$ = earth fault factor (typical: 0.1–0.3)
- $I_{k,min,1ph}^{"}$ = minimum single-phase fault current

---

## 6. TCC Visualization Data

### 6.1 Curve Point Generation

Points are generated at logarithmically spaced current multiples:

$$
M_i = M_{min} \cdot \left(\frac{M_{max}}{M_{min}}\right)^{\frac{i}{n-1}}
$$

For each $M_i$, calculate:

$$
I_i = M_i \cdot I_{pickup}
$$

$$
t_i = TMS \cdot \frac{A}{M_i^B - 1}
$$

### 6.2 Fault Markers

Fault currents from IEC 60909 are displayed as vertical markers:

- $I_{k,max}^{"}$ — Maximum initial short-circuit current (3-phase)
- $I_{k,min}^{"}$ — Minimum initial short-circuit current (3-phase)
- $I_{k,min,1ph}^{"}$ — Minimum single-phase fault current

---

## 7. WHITE BOX Trace Format

Every calculation produces a trace record with:

```json
{
  "step": "sensitivity_check",
  "description_pl": "Sprawdzenie czułości zabezpieczenia",
  "formula": "k_s = I_fault_min / I_pickup",
  "inputs": {
    "i_fault_min_a": 1200,
    "i_pickup_a": 400
  },
  "intermediate": {
    "ratio": 3.0
  },
  "outputs": {
    "k_s": 3.0,
    "verdict": "PASS"
  },
  "unit_verification": "A/A = dimensionless ✓"
}
```

---

## 8. References

1. IEC 60255-151:2009 — Measuring relays and protection equipment — Functional requirements for over/under current protection
2. IEC 60909-0:2016 — Short-circuit currents in three-phase a.c. systems
3. IEEE C37.112-2018 — Standard Inverse-Time Characteristic Equations for Overcurrent Relays

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-15 | MV-DESIGN-PRO | Initial Proof Pack |

---

*This document is part of the MV-DESIGN-PRO WHITE BOX verification system.*
