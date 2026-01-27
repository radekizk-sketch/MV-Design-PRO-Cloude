# Equation Registry — VDROP (Spadki/Wzrosty Napięć)

**STATUS: CANONICAL & BINDING**
**Version:** 1.0
**Reference:** P11_1a_MVP_SC3F_AND_VDROP.md

---

## 1. Przeznaczenie

Ten dokument zawiera **rejestr równań** dla obliczeń spadków i wzrostów napięć (VDROP) w sieciach SN/nN.

**Agent MUSI używać tych równań literalnie bez interpretacji.**

---

## 2. Rejestr równań

### EQ_VDROP_001 — Rezystancja odcinka

```yaml
equation_id: EQ_VDROP_001
name_pl: "Rezystancja odcinka linii lub kabla"
standard_ref: "—"
latex: |
  R = r \cdot l
symbols:
  - symbol: "R"
    unit: "Ω"
    description_pl: "Rezystancja odcinka"
    mapping_key: "r_ohm"
  - symbol: "r"
    unit: "Ω/km"
    description_pl: "Rezystancja jednostkowa"
    mapping_key: "r_ohm_per_km"
  - symbol: "l"
    unit: "km"
    description_pl: "Długość odcinka"
    mapping_key: "length_km"
unit_derivation: "Ω/km · km = Ω"
```

---

### EQ_VDROP_002 — Reaktancja odcinka

```yaml
equation_id: EQ_VDROP_002
name_pl: "Reaktancja odcinka linii lub kabla"
standard_ref: "—"
latex: |
  X = x \cdot l
symbols:
  - symbol: "X"
    unit: "Ω"
    description_pl: "Reaktancja odcinka"
    mapping_key: "x_ohm"
  - symbol: "x"
    unit: "Ω/km"
    description_pl: "Reaktancja jednostkowa"
    mapping_key: "x_ohm_per_km"
  - symbol: "l"
    unit: "km"
    description_pl: "Długość odcinka"
    mapping_key: "length_km"
unit_derivation: "Ω/km · km = Ω"
```

---

### EQ_VDROP_003 — Składowa czynna spadku napięcia

```yaml
equation_id: EQ_VDROP_003
name_pl: "Składowa czynna spadku napięcia (R·P)"
standard_ref: "—"
latex: |
  \Delta U_R = \frac{R \cdot P}{U_n^2} \cdot 100\%
symbols:
  - symbol: "\\Delta U_R"
    unit: "%"
    description_pl: "Składowa czynna spadku napięcia"
    mapping_key: "delta_u_r_percent"
  - symbol: "R"
    unit: "Ω"
    description_pl: "Rezystancja odcinka"
    mapping_key: "r_ohm"
  - symbol: "P"
    unit: "MW"
    description_pl: "Moc czynna przepływająca"
    mapping_key: "p_mw"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
unit_derivation: "(Ω · MW) / kV² = (Ω · MW) / kV² × 100% = %"
notes: |
  Dla sieci trójfazowej: P to moc trójfazowa.
  Wzór uproszczony dla cos(δ) ≈ 1.
```

---

### EQ_VDROP_004 — Składowa bierna spadku napięcia

```yaml
equation_id: EQ_VDROP_004
name_pl: "Składowa bierna spadku napięcia (X·Q)"
standard_ref: "—"
latex: |
  \Delta U_X = \frac{X \cdot Q}{U_n^2} \cdot 100\%
symbols:
  - symbol: "\\Delta U_X"
    unit: "%"
    description_pl: "Składowa bierna spadku napięcia"
    mapping_key: "delta_u_x_percent"
  - symbol: "X"
    unit: "Ω"
    description_pl: "Reaktancja odcinka"
    mapping_key: "x_ohm"
  - symbol: "Q"
    unit: "Mvar"
    description_pl: "Moc bierna przepływająca"
    mapping_key: "q_mvar"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
unit_derivation: "(Ω · Mvar) / kV² = %"
notes: |
  Q dodatnie = indukcyjna (pobór), Q ujemne = pojemnościowa (generacja).
  Wzrost napięcia gdy Q < 0.
```

---

### EQ_VDROP_005 — Całkowity spadek napięcia na odcinku

```yaml
equation_id: EQ_VDROP_005
name_pl: "Całkowity spadek napięcia na odcinku"
standard_ref: "—"
latex: |
  \Delta U = \Delta U_R + \Delta U_X
symbols:
  - symbol: "\\Delta U"
    unit: "%"
    description_pl: "Spadek napięcia na odcinku"
    mapping_key: "delta_u_percent"
  - symbol: "\\Delta U_R"
    unit: "%"
    description_pl: "Składowa czynna spadku"
    mapping_key: "delta_u_r_percent"
  - symbol: "\\Delta U_X"
    unit: "%"
    description_pl: "Składowa bierna spadku"
    mapping_key: "delta_u_x_percent"
unit_derivation: "% + % = %"
notes: |
  Suma algebraiczna — ΔU_X może być ujemne (wzrost napięcia).
  Wynik może być ujemny = wzrost napięcia.
```

---

### EQ_VDROP_006 — Sumaryczny spadek napięcia od źródła

```yaml
equation_id: EQ_VDROP_006
name_pl: "Sumaryczny spadek napięcia od źródła do punktu"
standard_ref: "—"
latex: |
  \Delta U_{total} = \sum_{i=1}^{n} \Delta U_i
symbols:
  - symbol: "\\Delta U_{total}"
    unit: "%"
    description_pl: "Sumaryczny spadek napięcia"
    mapping_key: "delta_u_total_percent"
  - symbol: "\\Delta U_i"
    unit: "%"
    description_pl: "Spadek napięcia na i-tym odcinku"
    mapping_key: "delta_u_segments"
  - symbol: "n"
    unit: "—"
    description_pl: "Liczba odcinków na ścieżce"
    mapping_key: "segment_count"
unit_derivation: "Σ % = %"
notes: |
  Suma po wszystkich odcinkach od źródła do punktu.
  Ścieżka wyznaczana algorytmem najkrótszej drogi.
```

---

### EQ_VDROP_007 — Napięcie w punkcie

```yaml
equation_id: EQ_VDROP_007
name_pl: "Napięcie w punkcie po uwzględnieniu spadku"
standard_ref: "—"
latex: |
  U = U_{source} \cdot \left(1 - \frac{\Delta U_{total}}{100}\right)
symbols:
  - symbol: "U"
    unit: "kV"
    description_pl: "Napięcie w punkcie"
    mapping_key: "u_kv"
  - symbol: "U_{source}"
    unit: "kV"
    description_pl: "Napięcie źródła"
    mapping_key: "u_source_kv"
  - symbol: "\\Delta U_{total}"
    unit: "%"
    description_pl: "Sumaryczny spadek napięcia"
    mapping_key: "delta_u_total_percent"
unit_derivation: "kV · — = kV"
```

---

### EQ_VDROP_008 — Napięcie w jednostkach względnych

```yaml
equation_id: EQ_VDROP_008
name_pl: "Napięcie w jednostkach względnych (p.u.)"
standard_ref: "—"
latex: |
  U_{pu} = \frac{U}{U_n}
symbols:
  - symbol: "U_{pu}"
    unit: "p.u."
    description_pl: "Napięcie w jednostkach względnych"
    mapping_key: "u_pu"
  - symbol: "U"
    unit: "kV"
    description_pl: "Napięcie rzeczywiste"
    mapping_key: "u_kv"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
unit_derivation: "kV / kV = p.u. (bezwymiarowe)"
```

---

### EQ_VDROP_009 — Wzór dokładny (pełny)

```yaml
equation_id: EQ_VDROP_009
name_pl: "Dokładny wzór na spadek napięcia"
standard_ref: "—"
latex: |
  \Delta U = \frac{R \cdot P + X \cdot Q}{U_n^2} + \frac{(X \cdot P - R \cdot Q)^2}{2 \cdot U_n^4}
symbols:
  - symbol: "\\Delta U"
    unit: "%"
    description_pl: "Spadek napięcia (dokładny)"
    mapping_key: "delta_u_exact_percent"
  - symbol: "R"
    unit: "Ω"
    description_pl: "Rezystancja"
    mapping_key: "r_ohm"
  - symbol: "X"
    unit: "Ω"
    description_pl: "Reaktancja"
    mapping_key: "x_ohm"
  - symbol: "P"
    unit: "MW"
    description_pl: "Moc czynna"
    mapping_key: "p_mw"
  - symbol: "Q"
    unit: "Mvar"
    description_pl: "Moc bierna"
    mapping_key: "q_mvar"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
unit_derivation: "% (po normalizacji)"
notes: |
  Drugi człon jest zwykle pomijalnie mały.
  Używać gdy wymagana wysoka dokładność.
```

---

## 3. Tabela podsumowująca

| ID | Nazwa | Wzór | Wynik | Mapping key |
|----|-------|------|-------|-------------|
| `EQ_VDROP_001` | Rezystancja | $R = r \cdot l$ | Ω | `r_ohm` |
| `EQ_VDROP_002` | Reaktancja | $X = x \cdot l$ | Ω | `x_ohm` |
| `EQ_VDROP_003` | Składowa R·P | $\Delta U_R = \frac{R \cdot P}{U_n^2}$ | % | `delta_u_r_percent` |
| `EQ_VDROP_004` | Składowa X·Q | $\Delta U_X = \frac{X \cdot Q}{U_n^2}$ | % | `delta_u_x_percent` |
| `EQ_VDROP_005` | Spadek na odcinku | $\Delta U = \Delta U_R + \Delta U_X$ | % | `delta_u_percent` |
| `EQ_VDROP_006` | Suma spadków | $\Delta U_{total} = \sum \Delta U_i$ | % | `delta_u_total_percent` |
| `EQ_VDROP_007` | Napięcie w punkcie | $U = U_{src} \cdot (1 - \Delta U/100)$ | kV | `u_kv` |
| `EQ_VDROP_008` | Napięcie p.u. | $U_{pu} = U / U_n$ | p.u. | `u_pu` |
| `EQ_VDROP_009` | Wzór dokładny | (patrz wyżej) | % | `delta_u_exact_percent` |

---

## 4. Mapping keys — pełna lista (BINDING)

### 4.1 Wejścia (parametry elementów)

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `r_ohm_per_km` | float | Ω/km | Rezystancja jednostkowa |
| `x_ohm_per_km` | float | Ω/km | Reaktancja jednostkowa |
| `length_km` | float | km | Długość odcinka |
| `u_n_kv` | float | kV | Napięcie znamionowe |
| `u_source_kv` | float | kV | Napięcie źródła |

### 4.2 Wejścia (przepływy mocy)

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `p_mw` | float | MW | Moc czynna przepływająca przez odcinek |
| `q_mvar` | float | Mvar | Moc bierna przepływająca przez odcinek |

### 4.3 Wartości pośrednie

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `r_ohm` | float | Ω | Rezystancja odcinka |
| `x_ohm` | float | Ω | Reaktancja odcinka |
| `delta_u_r_percent` | float | % | Składowa czynna spadku |
| `delta_u_x_percent` | float | % | Składowa bierna spadku |
| `delta_u_percent` | float | % | Spadek na pojedynczym odcinku |
| `delta_u_segments` | list[float] | % | Lista spadków na odcinkach |
| `segment_count` | int | — | Liczba odcinków na ścieżce |

### 4.4 Wyniki

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `delta_u_total_percent` | float | % | Sumaryczny spadek napięcia |
| `u_kv` | float | kV | Napięcie w punkcie |
| `u_pu` | float | p.u. | Napięcie względne |
| `delta_u_exact_percent` | float | % | Spadek (wzór dokładny) |

---

## 5. Struktura danych dla wielu odcinków

### 5.1 Segment (pojedynczy odcinek)

```json
{
  "segment_id": "uuid",
  "from_bus_id": "uuid",
  "to_bus_id": "uuid",
  "branch_id": "uuid",
  "r_ohm": 0.5,
  "x_ohm": 0.3,
  "p_mw": 2.5,
  "q_mvar": 1.2,
  "delta_u_r_percent": 0.25,
  "delta_u_x_percent": 0.15,
  "delta_u_percent": 0.40
}
```

### 5.2 Path (ścieżka od źródła)

```json
{
  "path_id": "uuid",
  "source_bus_id": "uuid",
  "target_bus_id": "uuid",
  "segments": [
    { "segment_id": "...", "delta_u_percent": 0.40 },
    { "segment_id": "...", "delta_u_percent": 0.35 },
    { "segment_id": "...", "delta_u_percent": 0.55 }
  ],
  "delta_u_total_percent": 1.30,
  "u_target_kv": 14.805,
  "u_target_pu": 0.987
}
```

---

## 6. Interpretacja wyników

### 6.1 Spadek vs wzrost

| Wartość ΔU | Interpretacja |
|------------|---------------|
| ΔU > 0 | Spadek napięcia (U maleje wzdłuż linii) |
| ΔU < 0 | Wzrost napięcia (U rośnie — typowe dla generacji Q pojemnościowej) |
| ΔU = 0 | Brak zmiany napięcia |

### 6.2 Limity normatywne (przykładowe)

| Sieć | Limit ΔU | Źródło |
|------|----------|--------|
| SN (15/20 kV) | ±5% | PN-EN 50160 |
| nN (0.4 kV) | ±10% | PN-EN 50160 |
| Przyłączenie OZE | ≤2% | IRiESD |

---

**END OF EQUATIONS VDROP**
