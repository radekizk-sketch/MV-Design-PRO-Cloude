# Equation Registry — SC3F IEC 60909

**STATUS: CANONICAL & BINDING**
**Version:** 1.0
**Reference:** IEC 60909-0:2016, P11_1a_MVP_SC3F_AND_VDROP.md

---

## 1. Przeznaczenie

Ten dokument zawiera **rejestr równań** dla obliczeń zwarciowych trójfazowych (SC3F) zgodnie z IEC 60909.

**Agent MUSI używać tych równań literalnie bez interpretacji.**

---

## 2. Rejestr równań

### EQ_SC3F_001 — Napięcie z współczynnikiem c

```yaml
equation_id: EQ_SC3F_001
name_pl: "Napięcie znamionowe z współczynnikiem napięciowym"
standard_ref: "IEC 60909-0:2016 Table 1"
latex: |
  U_{eq} = c \cdot U_n
symbols:
  - symbol: "U_{eq}"
    unit: "kV"
    description_pl: "Napięcie równoważne źródła"
    mapping_key: "u_eq_kv"
  - symbol: "c"
    unit: "—"
    description_pl: "Współczynnik napięciowy (c_max lub c_min)"
    mapping_key: "c_factor"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
unit_derivation: "— · kV = kV"
```

---

### EQ_SC3F_002 — Impedancja źródła (sieci zasilającej)

```yaml
equation_id: EQ_SC3F_002
name_pl: "Impedancja źródła (sieci zasilającej)"
standard_ref: "IEC 60909-0:2016 eq. (10)"
latex: |
  Z_Q = \frac{c \cdot U_n^2}{S_k''_Q}
symbols:
  - symbol: "Z_Q"
    unit: "Ω"
    description_pl: "Impedancja źródła"
    mapping_key: "z_source_ohm"
  - symbol: "c"
    unit: "—"
    description_pl: "Współczynnik napięciowy"
    mapping_key: "c_factor"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
  - symbol: "S_k''_Q"
    unit: "MVA"
    description_pl: "Moc zwarciowa źródła"
    mapping_key: "sk_source_mva"
unit_derivation: "kV² / MVA = kV² / (kV · kA) = kV / kA = Ω"
```

---

### EQ_SC3F_002a — Rozkład impedancji źródła na R i X

```yaml
equation_id: EQ_SC3F_002a
name_pl: "Rozkład impedancji źródła na składowe R i X"
standard_ref: "IEC 60909-0:2016 Table 2"
latex: |
  R_Q = \frac{Z_Q}{\sqrt{1 + (X/R)^2}}, \quad X_Q = R_Q \cdot (X/R)
symbols:
  - symbol: "R_Q"
    unit: "Ω"
    description_pl: "Rezystancja źródła"
    mapping_key: "r_source_ohm"
  - symbol: "X_Q"
    unit: "Ω"
    description_pl: "Reaktancja źródła"
    mapping_key: "x_source_ohm"
  - symbol: "Z_Q"
    unit: "Ω"
    description_pl: "Impedancja źródła"
    mapping_key: "z_source_ohm"
  - symbol: "X/R"
    unit: "—"
    description_pl: "Stosunek reaktancji do rezystancji"
    mapping_key: "rx_ratio"
unit_derivation: "Ω / — = Ω"
```

---

### EQ_SC3F_003 — Impedancja Thevenina

```yaml
equation_id: EQ_SC3F_003
name_pl: "Impedancja zastępcza Thevenina w miejscu zwarcia"
standard_ref: "IEC 60909-0:2016 § 4.2"
latex: |
  Z_{th} = Z_Q + Z_T + Z_L
symbols:
  - symbol: "Z_{th}"
    unit: "Ω"
    description_pl: "Impedancja zastępcza Thevenina"
    mapping_key: "z_thevenin_ohm"
  - symbol: "Z_Q"
    unit: "Ω"
    description_pl: "Impedancja źródła"
    mapping_key: "z_source_ohm"
  - symbol: "Z_T"
    unit: "Ω"
    description_pl: "Impedancja transformatora (przeliczona)"
    mapping_key: "z_transformer_ohm"
  - symbol: "Z_L"
    unit: "Ω"
    description_pl: "Impedancja linii/kabla"
    mapping_key: "z_line_ohm"
unit_derivation: "Ω + Ω + Ω = Ω"
notes: |
  Dla sieci promieniowych suma szeregowa.
  Dla sieci złożonych: redukcja metodą Thevenina.
```

---

### EQ_SC3F_004 — Początkowy prąd zwarciowy symetryczny

```yaml
equation_id: EQ_SC3F_004
name_pl: "Początkowy prąd zwarciowy symetryczny"
standard_ref: "IEC 60909-0:2016 eq. (29)"
latex: |
  I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|}
symbols:
  - symbol: "I_k''"
    unit: "kA"
    description_pl: "Początkowy prąd zwarciowy symetryczny"
    mapping_key: "ikss_ka"
  - symbol: "c"
    unit: "—"
    description_pl: "Współczynnik napięciowy"
    mapping_key: "c_factor"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
  - symbol: "Z_{th}"
    unit: "Ω"
    description_pl: "Impedancja zastępcza Thevenina"
    mapping_key: "z_thevenin_ohm"
unit_derivation: "kV / Ω = kV / (kV/kA) = kA"
```

---

### EQ_SC3F_005 — Współczynnik udaru κ

```yaml
equation_id: EQ_SC3F_005
name_pl: "Współczynnik udaru"
standard_ref: "IEC 60909-0:2016 eq. (55)"
latex: |
  \kappa = 1.02 + 0.98 \cdot e^{-3 \cdot R_{th}/X_{th}}
symbols:
  - symbol: "\\kappa"
    unit: "—"
    description_pl: "Współczynnik udaru"
    mapping_key: "kappa"
  - symbol: "R_{th}"
    unit: "Ω"
    description_pl: "Rezystancja zastępcza Thevenina"
    mapping_key: "r_thevenin_ohm"
  - symbol: "X_{th}"
    unit: "Ω"
    description_pl: "Reaktancja zastępcza Thevenina"
    mapping_key: "x_thevenin_ohm"
unit_derivation: "— (bezwymiarowy)"
notes: |
  Wartość κ mieści się w zakresie 1.02 ≤ κ ≤ 2.00.
  Dla R/X → 0: κ → 2.00
  Dla R/X → ∞: κ → 1.02
```

---

### EQ_SC3F_006 — Prąd udarowy (szczytowy)

```yaml
equation_id: EQ_SC3F_006
name_pl: "Prąd udarowy (szczytowy)"
standard_ref: "IEC 60909-0:2016 eq. (54)"
latex: |
  i_p = \kappa \cdot \sqrt{2} \cdot I_k''
symbols:
  - symbol: "i_p"
    unit: "kA"
    description_pl: "Prąd udarowy (wartość szczytowa)"
    mapping_key: "ip_ka"
  - symbol: "\\kappa"
    unit: "—"
    description_pl: "Współczynnik udaru"
    mapping_key: "kappa"
  - symbol: "I_k''"
    unit: "kA"
    description_pl: "Początkowy prąd zwarciowy symetryczny"
    mapping_key: "ikss_ka"
unit_derivation: "— · — · kA = kA"
```

---

### EQ_SC3F_007 — Moc zwarciowa początkowa

```yaml
equation_id: EQ_SC3F_007
name_pl: "Moc zwarciowa początkowa"
standard_ref: "IEC 60909-0:2016 eq. (33)"
latex: |
  S_k'' = \sqrt{3} \cdot U_n \cdot I_k''
symbols:
  - symbol: "S_k''"
    unit: "MVA"
    description_pl: "Moc zwarciowa początkowa"
    mapping_key: "sk_mva"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
  - symbol: "I_k''"
    unit: "kA"
    description_pl: "Początkowy prąd zwarciowy symetryczny"
    mapping_key: "ikss_ka"
unit_derivation: "kV · kA = MVA"
```

---

### EQ_SC3F_008 — Prąd cieplny równoważny (opcjonalnie)

```yaml
equation_id: EQ_SC3F_008
name_pl: "Prąd cieplny równoważny"
standard_ref: "IEC 60909-0:2016 eq. (100)"
latex: |
  I_{th} = I_k'' \cdot \sqrt{m + n}
symbols:
  - symbol: "I_{th}"
    unit: "kA"
    description_pl: "Prąd cieplny równoważny"
    mapping_key: "ith_ka"
  - symbol: "I_k''"
    unit: "kA"
    description_pl: "Początkowy prąd zwarciowy symetryczny"
    mapping_key: "ikss_ka"
  - symbol: "m"
    unit: "—"
    description_pl: "Współczynnik dla składowej nieokresowej"
    mapping_key: "m_factor"
  - symbol: "n"
    unit: "—"
    description_pl: "Współczynnik dla składowej okresowej"
    mapping_key: "n_factor"
unit_derivation: "kA · — = kA"
notes: |
  m i n zależą od czasu trwania zwarcia i typu źródła.
  Dla uproszczenia często przyjmuje się m + n ≈ 1.
```

---

### EQ_SC3F_009 — Impedancja transformatora

```yaml
equation_id: EQ_SC3F_009
name_pl: "Impedancja transformatora (przeliczona na stronę zwarcia)"
standard_ref: "IEC 60909-0:2016 eq. (7)"
latex: |
  Z_T = \frac{u_k\% \cdot U_n^2}{100 \cdot S_r}
symbols:
  - symbol: "Z_T"
    unit: "Ω"
    description_pl: "Impedancja transformatora"
    mapping_key: "z_transformer_ohm"
  - symbol: "u_k\\%"
    unit: "%"
    description_pl: "Napięcie zwarcia transformatora"
    mapping_key: "uk_percent"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe (strona zwarcia)"
    mapping_key: "u_n_kv"
  - symbol: "S_r"
    unit: "MVA"
    description_pl: "Moc znamionowa transformatora"
    mapping_key: "s_rated_mva"
unit_derivation: "(% · kV²) / (100 · MVA) = Ω"
```

---

### EQ_SC3F_010 — Impedancja linii/kabla

```yaml
equation_id: EQ_SC3F_010
name_pl: "Impedancja linii lub kabla"
standard_ref: "—"
latex: |
  Z_L = (r + jx) \cdot l
symbols:
  - symbol: "Z_L"
    unit: "Ω"
    description_pl: "Impedancja linii/kabla"
    mapping_key: "z_line_ohm"
  - symbol: "r"
    unit: "Ω/km"
    description_pl: "Rezystancja jednostkowa"
    mapping_key: "r_ohm_per_km"
  - symbol: "x"
    unit: "Ω/km"
    description_pl: "Reaktancja jednostkowa"
    mapping_key: "x_ohm_per_km"
  - symbol: "l"
    unit: "km"
    description_pl: "Długość linii/kabla"
    mapping_key: "length_km"
unit_derivation: "Ω/km · km = Ω"
```

---

## 3. Tabela podsumowująca

| ID | Nazwa | Wzór | Wynik | Mapping key |
|----|-------|------|-------|-------------|
| `EQ_SC3F_001` | Napięcie z c | $U_{eq} = c \cdot U_n$ | kV | `u_eq_kv` |
| `EQ_SC3F_002` | Impedancja źródła | $Z_Q = \frac{c \cdot U_n^2}{S_k''_Q}$ | Ω | `z_source_ohm` |
| `EQ_SC3F_002a` | Rozkład R/X źródła | $R_Q, X_Q$ | Ω | `r_source_ohm`, `x_source_ohm` |
| `EQ_SC3F_003` | Impedancja Thevenina | $Z_{th} = Z_Q + Z_T + Z_L$ | Ω | `z_thevenin_ohm` |
| `EQ_SC3F_004` | Prąd zwarciowy I_k'' | $I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot \|Z_{th}\|}$ | kA | `ikss_ka` |
| `EQ_SC3F_005` | Współczynnik κ | $\kappa = 1.02 + 0.98 \cdot e^{-3R/X}$ | — | `kappa` |
| `EQ_SC3F_006` | Prąd udarowy i_p | $i_p = \kappa \cdot \sqrt{2} \cdot I_k''$ | kA | `ip_ka` |
| `EQ_SC3F_007` | Moc zwarciowa S_k'' | $S_k'' = \sqrt{3} \cdot U_n \cdot I_k''$ | MVA | `sk_mva` |
| `EQ_SC3F_008` | Prąd cieplny I_th | $I_{th} = I_k'' \cdot \sqrt{m+n}$ | kA | `ith_ka` |
| `EQ_SC3F_009` | Impedancja transformatora | $Z_T = \frac{u_k\% \cdot U_n^2}{100 \cdot S_r}$ | Ω | `z_transformer_ohm` |
| `EQ_SC3F_010` | Impedancja linii | $Z_L = (r + jx) \cdot l$ | Ω | `z_line_ohm` |

---

## 4. Mapping keys — pełna lista (BINDING)

### 4.1 Wejścia

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `u_n_kv` | float | kV | Napięcie znamionowe |
| `c_factor` | float | — | Współczynnik napięciowy (c_max lub c_min) |
| `sk_source_mva` | float | MVA | Moc zwarciowa źródła |
| `rx_ratio` | float | — | Stosunek X/R źródła |
| `uk_percent` | float | % | Napięcie zwarcia transformatora |
| `s_rated_mva` | float | MVA | Moc znamionowa transformatora |
| `r_ohm_per_km` | float | Ω/km | Rezystancja jednostkowa linii |
| `x_ohm_per_km` | float | Ω/km | Reaktancja jednostkowa linii |
| `length_km` | float | km | Długość linii/kabla |

### 4.2 Wartości pośrednie

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `u_eq_kv` | float | kV | Napięcie równoważne źródła |
| `z_source_ohm` | complex | Ω | Impedancja źródła |
| `r_source_ohm` | float | Ω | Rezystancja źródła |
| `x_source_ohm` | float | Ω | Reaktancja źródła |
| `z_transformer_ohm` | complex | Ω | Impedancja transformatora |
| `z_line_ohm` | complex | Ω | Impedancja linii |
| `z_thevenin_ohm` | complex | Ω | Impedancja Thevenina |
| `r_thevenin_ohm` | float | Ω | Rezystancja Thevenina |
| `x_thevenin_ohm` | float | Ω | Reaktancja Thevenina |
| `kappa` | float | — | Współczynnik udaru |
| `m_factor` | float | — | Współczynnik m (cieplny) |
| `n_factor` | float | — | Współczynnik n (cieplny) |

### 4.3 Wyniki

| Mapping key | Typ | Jednostka | Opis |
|-------------|-----|-----------|------|
| `ikss_ka` | float | kA | Początkowy prąd zwarciowy symetryczny |
| `ip_ka` | float | kA | Prąd udarowy (szczytowy) |
| `sk_mva` | float | MVA | Moc zwarciowa początkowa |
| `ith_ka` | float | kA | Prąd cieplny równoważny |

---

**END OF EQUATIONS SC3F**
