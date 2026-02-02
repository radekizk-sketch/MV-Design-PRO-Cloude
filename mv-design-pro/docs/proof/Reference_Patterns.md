# Wzorce odniesienia — Reference Patterns

> **BINDING** — This document defines authoritative calculation rules.
>
> **UI-HIDDEN** — Internal engineering documentation. Not exposed in user interface.

---

## Document Information

| Property | Value |
|----------|-------|
| Module | Reference Patterns (Wzorce odniesienia) |
| Version | 1.0.0 |
| Standard | IEC 60909, PN-EN 60909 |
| Status | CANONICAL |
| Visibility | INTERNAL (ui-hidden) |
| Layer | Analysis (NOT-A-SOLVER) |

---

## Scope

This document defines Reference Patterns — engineering benchmark cases that validate
the coherence of protection methodology. Patterns:

- Consume analysis results (e.g., from FIX-12D I>> Setting Analysis)
- Validate methodology against known-good cases
- Provide WHITE-BOX trace of validation steps
- Ensure DETERMINISM (2× run → identical result)

**NOT-A-SOLVER Rule**: Reference patterns do NOT compute physics. They interpret
pre-computed results to verify methodology coherence.

---

## Wzorzec A — Dobór I>> dla linii SN

### Pattern Identification

| Property | Value |
|----------|-------|
| Pattern ID | `RP-LINE-I2-THERMAL-SPZ` |
| Name (PL) | Dobór I>> dla linii SN: selektywność, czułość, cieplne, SPZ |
| Input Source | FIX-12D (LineOvercurrentSettingInput) |
| Output | ReferencePatternResult |
| Verdict Values | ZGODNE / GRANICZNE / NIEZGODNE |

---

### 1. Methodology Overview

The pattern validates four criteria for I>> (instantaneous overcurrent, ANSI 50)
protection settings on MV lines:

1. **Selektywność (Selectivity)** — coordination with downstream protection
2. **Czułość (Sensitivity)** — reliable trip for minimum fault at busbar
3. **Kryterium cieplne (Thermal)** — conductor thermal protection
4. **Blokada SPZ (SPZ Blocking)** — auto-reclose blocking decision

---

### 2. Mathematical Formulation

#### 2.1 Selectivity Criterion

**Requirement:** The protection setting must be above the maximum fault current seen
by the downstream protection, with safety margin.

$$
I_{nast} \geq k_b \times \frac{I''_{k,max}^{(next)}}{\theta_i}
$$

**Variables:**
- $I_{nast}$ — protection setting [A]
- $k_b$ — selectivity coefficient (1.1 - 1.3, typical 1.2)
- $I''_{k,max}^{(next)}$ — max fault current at next protection point [A]
- $\theta_i$ — CT ratio (primary/secondary)

**Minimum setting (primary):**
$$
I_{min,sel}^{(prim)} = k_b \times I''_{k,max}^{(next)}
$$

**Minimum setting (secondary):**
$$
I_{min,sel}^{(sec)} = \frac{I_{min,sel}^{(prim)}}{\theta_i}
$$

#### 2.2 Sensitivity Criterion

**Requirement:** The protection must reliably detect minimum fault current at busbar.

$$
I_{nast} \leq \frac{I''_{k,min}}{k_c \times \theta_i}
$$

**Variables:**
- $I''_{k,min}$ — minimum fault current at busbars [A] (typically 2-phase)
- $k_c$ — sensitivity coefficient (1.2 - 1.5, typical 1.5)

**Maximum setting (primary):**
$$
I_{max,sens}^{(prim)} = \frac{I''_{k,min}}{k_c}
$$

**Maximum setting (secondary):**
$$
I_{max,sens}^{(sec)} = \frac{I_{max,sens}^{(prim)}}{\theta_i}
$$

#### 2.3 Thermal Criterion

**Requirement:** The protection must operate before thermal damage to conductor.

$$
I_{nast} \leq k_{bth} \times \frac{I_{th,dop}}{\theta_i}
$$

where permissible thermal current:

$$
I_{th,dop} = \frac{I_{th,n}}{\sqrt{t_k}}
$$

**Variables:**
- $I_{th,n}$ — rated short-time current for 1s [A]
- $t_k$ — total fault duration including SPZ cycles [s]
- $k_{bth}$ — thermal safety coefficient (0.8 - 1.0, typical 0.9)

**Thermal capacity from cross-section:**
$$
I_{th,n} = S \times j_{th,n}
$$

where:
- $S$ — conductor cross-section [mm²]
- $j_{th,n}$ — rated short-time current density [A/mm²] (94 A/mm² for Al, 143 A/mm² for Cu)

**Maximum setting (primary):**
$$
I_{max,th}^{(prim)} = k_{bth} \times I_{th,dop}
$$

**Maximum setting (secondary):**
$$
I_{max,th}^{(sec)} = \frac{I_{max,th}^{(prim)}}{\theta_i}
$$

#### 2.4 Total Fault Time with SPZ

$$
t_k = n_{cycles} \times (t_{fault} + t_{breaker})
$$

where:
- $n_{cycles} = 1$ for SPZ disabled
- $n_{cycles} = 2$ for SPZ single (jednokrotne)
- $n_{cycles} = 3$ for SPZ double (dwukrotne)

---

### 3. Setting Window

The allowable setting window is:

$$
I_{nast} \in [I_{min}, I_{max}]
$$

where:

$$
I_{min} = I_{min,sel} = k_b \times I''_{k,max}^{(next)}
$$

$$
I_{max} = \min(I_{max,sens}, I_{max,th})
$$

**Window validity condition:**
$$
I_{max} > I_{min}
$$

**Narrow window threshold:**
$$
\frac{I_{max} - I_{min}}{I_{min}} < 0.05 \quad (5\%)
$$

---

### 4. Verdict Logic

| Condition | Verdict |
|-----------|---------|
| $I_{min} > I_{max}$ (window invalid) | NIEZGODNE |
| Any criterion FAIL | NIEZGODNE |
| Window valid AND narrow ($< 5\%$) | GRANICZNE |
| Window valid AND SPZ blocked | GRANICZNE |
| All criteria PASS, window valid, not narrow | ZGODNE |

---

### 5. Reference Data (Case A)

The following reference case produces verdict **ZGODNE**:

| Parameter | Symbol | Value | Unit |
|-----------|--------|-------|------|
| Line name | — | Linia SN 15kV Stacja A - Stacja B | — |
| CT ratio | $\theta_i$ | 80 | — |
| Conductor material | — | XLPE Al | — |
| Cross-section | $S$ | 150 | mm² |
| Thermal density | $j_{th,n}$ | 94 | A/mm² |
| Max fault at busbars | $I''_{k,max}$ | 3500 | A |
| Min fault at busbars | $I''_{k,min}$ | 3000 | A |
| Max fault at next prot. | $I''_{k,max}^{(next)}$ | 1200 | A |
| Selectivity coeff. | $k_b$ | 1.2 | — |
| Sensitivity coeff. | $k_c$ | 1.5 | — |
| Thermal coeff. | $k_{bth}$ | 0.9 | — |
| SPZ mode | — | Jednokrotne (SINGLE) | — |
| Fault time | $t_{fault}$ | 0.5 | s |
| Breaker time | $t_{breaker}$ | 0.05 | s |

**Expected intermediate values:**

| Quantity | Formula | Value | Unit |
|----------|---------|-------|------|
| $I_{th,n}$ | $150 \times 94$ | 14100 | A |
| $t_k$ | $2 \times (0.5 + 0.05)$ | 1.1 | s |
| $I_{th,dop}$ | $14100 / \sqrt{1.1}$ | 13442 | A |
| $I_{min,sel}$ | $1.2 \times 1200$ | 1440 | A |
| $I_{max,sens}$ | $3000 / 1.5$ | 2000 | A |
| $I_{max,th}$ | $0.9 \times 13442$ | 12098 | A |
| $I_{max}$ | $\min(2000, 12098)$ | 2000 | A |
| Window | $[1440, 2000]$ | valid | A |
| Verdict | — | ZGODNE | — |

---

### 6. WHITE-BOX Trace Structure

Each validation produces a trace with the following steps:

```json
[
  {
    "step": "load_fixture",
    "description_pl": "Wczytanie danych referencyjnych z pliku fixture"
  },
  {
    "step": "run_analysis",
    "description_pl": "Uruchomienie analizy doboru nastaw I>> (FIX-12D)"
  },
  {
    "step": "extract_values",
    "description_pl": "Ekstrakcja kluczowych wartości z analizy"
  },
  {
    "step": "check_selectivity",
    "description_pl": "Sprawdzenie kryterium selektywności I>>",
    "formula": "I_{nast} >= k_b × I''_{k,max}^{(next)} / θi"
  },
  {
    "step": "check_sensitivity",
    "description_pl": "Sprawdzenie kryterium czułości I>>",
    "formula": "I_{nast} <= I''_{k,min} / (k_c × θi)"
  },
  {
    "step": "check_thermal",
    "description_pl": "Sprawdzenie kryterium wytrzymałości cieplnej",
    "formula": "I_{nast} <= k_{bth} × I_{th,dop} / θi, I_{th,dop} = I_{th,n} / √t_k"
  },
  {
    "step": "check_window",
    "description_pl": "Sprawdzenie okna nastaw [I_min, I_max]"
  },
  {
    "step": "check_spz",
    "description_pl": "Sprawdzenie decyzji blokady SPZ od I>>"
  },
  {
    "step": "determine_verdict",
    "description_pl": "Wyznaczenie werdyktu końcowego wzorca"
  }
]
```

---

### 7. Check Results Structure

Each check produces:

```json
{
  "name_pl": "Selektywność I>>",
  "status": "PASS",
  "status_pl": "Spełnione",
  "description_pl": "Selektywność spełniona: I_nast,min = 1440.0 A (kb=1.2, Ik_max_next=1200.0 A)",
  "details": {
    "i_min_primary_a": 1440.0,
    "i_min_secondary_a": 18.0,
    "kb": 1.2,
    "ik_max_next_a": 1200.0
  }
}
```

Status values:
- `PASS` — Spełnione
- `FAIL` — Niespełnione
- `WARN` — Ostrzeżenie
- `INFO` — Informacja

---

### 8. Result Artifacts

The `artifacts` dictionary contains key engineering values:

| Key | Description | Unit |
|-----|-------------|------|
| `tk_total_s` | Total fault duration | s |
| `ithn_a` | Rated short-time current (1s) | A |
| `ithdop_a` | Permissible thermal current | A |
| `i_min_sel_primary_a` | Min setting from selectivity | A |
| `i_max_sens_primary_a` | Max setting from sensitivity | A |
| `i_max_th_primary_a` | Max setting from thermal | A |
| `window_i_min_primary_a` | Window minimum (primary) | A |
| `window_i_max_primary_a` | Window maximum (primary) | A |
| `window_valid` | Window validity flag | bool |
| `recommended_setting_secondary_a` | Recommended setting (secondary) | A |

---

### 9. Determinism Guarantee

The pattern guarantees deterministic output:

- No system timestamps in computational trace
- All collections sorted by deterministic keys
- Stable JSON serialization with sorted keys
- 2× run with same input → identical output

Test verification:
```python
result1 = run_pattern_a(input_data=...)
result2 = run_pattern_a(input_data=...)
assert stable_json(result1.to_dict()) == stable_json(result2.to_dict())
```

---

### 10. Usage Example

```python
from application.reference_patterns import run_pattern_a

# From fixture file
result = run_pattern_a(fixture_file="line_i_doubleprime_case_a.json")

# From input data
from application.analyses.protection.line_overcurrent_setting import (
    LineOvercurrentSettingInput, ConductorData, ConductorMaterial, SPZConfig, SPZMode
)

input_data = LineOvercurrentSettingInput(
    line_id="line-001",
    line_name="Linia SN 15kV",
    ct_ratio=80.0,
    conductor=ConductorData(
        material=ConductorMaterial.XLPE_AL,
        cross_section_mm2=150.0,
        jthn_a_mm2=94.0,
    ),
    spz_config=SPZConfig(mode=SPZMode.SINGLE),
    ik_max_busbars_a=3500.0,
    ik_min_busbars_a=3000.0,
    ik_max_next_protection_a=1200.0,
    kb=1.2, kc=1.5, kbth=0.9,
)

result = run_pattern_a(input_data=input_data)

print(result.verdict)  # "ZGODNE"
print(result.summary_pl)  # Polish summary
```

---

## References

- IEC 60909:2016 — Short-circuit currents in three-phase a.c. systems
- IEC 60255-151:2009 — Measuring relays and protection equipment
- PN-EN 60909-0:2016-09 — Prądy zwarciowe w sieciach trójfazowych prądu przemiennego
- FIX-12D — Line Overcurrent Setting Analysis Module (MV-DESIGN-PRO)

---

*Document generated for MV-DESIGN-PRO Reference Patterns Module.*
