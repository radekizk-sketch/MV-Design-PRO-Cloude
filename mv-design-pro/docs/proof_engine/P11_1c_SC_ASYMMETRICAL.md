# P11.1c — Zwarcia niesymetryczne (składowe symetryczne)

**STATUS: REFERENCE (prospektywny)**
**Version:** 1.0
**Reference:** P11_OVERVIEW.md, PROOF_SCHEMAS.md, IEC 60909

---

## 1. Cel i zakres

### 1.1 Definicja

Dowód dla zwarć niesymetrycznych obejmuje:
- Transformację do składowych symetrycznych (Fortescue)
- Obliczenia impedancji kolejności zgodnej, przeciwnej i zerowej
- Typy zwarć: 1F (jednofazowe), 2F (dwufazowe), 2FG (dwufazowe z ziemią)

### 1.2 Typy zwarć (BINDING)

| Typ | Symbol | Opis |
|-----|--------|------|
| **3F** | SC3F | Zwarcie trójfazowe symetryczne |
| **1F** | SC1F | Zwarcie jednofazowe (L-G) |
| **2F** | SC2F | Zwarcie dwufazowe (L-L) |
| **2FG** | SC2FG | Zwarcie dwufazowe z ziemią (L-L-G) |

---

## 2. Składowe symetryczne — definicja

### 2.1 Transformacja Fortescue

```latex
\begin{bmatrix} I_0 \\ I_1 \\ I_2 \end{bmatrix} =
\frac{1}{3}
\begin{bmatrix}
1 & 1 & 1 \\
1 & a & a^2 \\
1 & a^2 & a
\end{bmatrix}
\begin{bmatrix} I_a \\ I_b \\ I_c \end{bmatrix}
```

Gdzie:
- $a = e^{j120°} = -0.5 + j\frac{\sqrt{3}}{2}$
- $I_0$ — składowa zerowa
- $I_1$ — składowa zgodna (positive sequence)
- $I_2$ — składowa przeciwna (negative sequence)

### 2.2 Impedancje składowych (BINDING)

| Symbol | Nazwa | Opis |
|--------|-------|------|
| $Z_1$ | Impedancja zgodna | Identyczna jak dla 3F |
| $Z_2$ | Impedancja przeciwna | Zazwyczaj $Z_2 = Z_1$ dla elementów statycznych |
| $Z_0$ | Impedancja zerowa | Zależy od uziemienia, połączeń transformatorów |

### 2.3 Mapping keys dla składowych

| Symbol | Mapping key | Jednostka | Opis |
|--------|-------------|-----------|------|
| $Z_1$ | `z1_ohm` | Ω | Impedancja składowej zgodnej |
| $Z_2$ | `z2_ohm` | Ω | Impedancja składowej przeciwnej |
| $Z_0$ | `z0_ohm` | Ω | Impedancja składowej zerowej |
| $I_0$ | `i0_ka` | kA | Prąd składowej zerowej |
| $I_1$ | `i1_ka` | kA | Prąd składowej zgodnej |
| $I_2$ | `i2_ka` | kA | Prąd składowej przeciwnej |

---

## 3. Zwarcie jednofazowe (1F) — równania

### 3.1 Schemat zastępczy

```
    c·U_n/(√3)
        │
       [Z_1]
        │
       [Z_2]
        │
       [Z_0]
        │
       ═══ (GND)
```

### 3.2 Równanie prądu zwarciowego 1F (BINDING)

```latex
I_k^{''(1)} = \frac{\sqrt{3} \cdot c \cdot U_n}{|Z_1 + Z_2 + Z_0|}
```

### 3.3 Równanie prądu w fazie zwarcia

```latex
I_a = 3 \cdot I_1 = \frac{3 \cdot c \cdot U_n}{\sqrt{3} \cdot |Z_1 + Z_2 + Z_0|}
```

### 3.4 Mapping keys dla 1F

| Krok | Input keys | Output key |
|------|------------|------------|
| Impedancja zgodna | `z_source_z1`, `z_trafo_z1`, `z_line_z1` | `z1_ohm` |
| Impedancja przeciwna | `z_source_z2`, `z_trafo_z2`, `z_line_z2` | `z2_ohm` |
| Impedancja zerowa | `z_source_z0`, `z_trafo_z0`, `z_line_z0` | `z0_ohm` |
| Prąd składowej zgodnej | `c_factor`, `u_n_kv`, `z1_ohm`, `z2_ohm`, `z0_ohm` | `i1_ka` |
| Prąd w fazie | `i1_ka` | `ia_1f_ka` |

---

## 4. Zwarcie dwufazowe (2F) — równania

### 4.1 Schemat zastępczy

```
    c·U_n/(√3)
        │
       [Z_1]
        ├────[Z_2]────┐
        │             │
       ═══           ═══
```

### 4.2 Równanie prądu zwarciowego 2F (BINDING)

```latex
I_k^{''(2)} = \frac{c \cdot U_n}{|Z_1 + Z_2|}
```

### 4.3 Relacja do prądu 3F

```latex
I_k^{''(2)} = \frac{\sqrt{3}}{2} \cdot I_k^{''(3)} \approx 0.866 \cdot I_k^{''(3)}
```

(przy założeniu $Z_1 = Z_2$)

### 4.4 Mapping keys dla 2F

| Krok | Input keys | Output key |
|------|------------|------------|
| Impedancja zgodna | `z1_ohm` | — |
| Impedancja przeciwna | `z2_ohm` | — |
| Prąd zwarciowy 2F | `c_factor`, `u_n_kv`, `z1_ohm`, `z2_ohm` | `ikss_2f_ka` |

---

## 5. Zwarcie dwufazowe z ziemią (2FG) — równania

### 5.1 Schemat zastępczy

```
    c·U_n/(√3)
        │
       [Z_1]
        │
       ─┼─
      /   \
   [Z_2] [Z_0]
     │     │
    ═══   ═══
```

### 5.2 Równanie prądu zwarciowego 2FG (BINDING)

```latex
I_k^{''(2E)} = \frac{\sqrt{3} \cdot c \cdot U_n \cdot |Z_2|}{|Z_1 \cdot Z_2 + Z_1 \cdot Z_0 + Z_2 \cdot Z_0|}
```

### 5.3 Składowa zerowa

```latex
I_0 = -\frac{c \cdot U_n / \sqrt{3}}{Z_1 + \frac{Z_2 \cdot Z_0}{Z_2 + Z_0}} \cdot \frac{Z_2}{Z_2 + Z_0}
```

### 5.4 Mapping keys dla 2FG

| Krok | Input keys | Output key |
|------|------------|------------|
| Impedancja równoległa Z2||Z0 | `z2_ohm`, `z0_ohm` | `z2_parallel_z0_ohm` |
| Prąd składowej zgodnej | `c_factor`, `u_n_kv`, `z1_ohm`, `z2_parallel_z0_ohm` | `i1_2fg_ka` |
| Prąd składowej zerowej | `i1_2fg_ka`, `z2_ohm`, `z0_ohm` | `i0_2fg_ka` |
| Prąd zwarciowy 2FG | `i1_2fg_ka`, `z2_ohm`, ... | `ikss_2fg_ka` |

---

## 6. Impedancja zerowa — źródła

### 6.1 Transformator (BINDING)

| Połączenie | Z0 strony HV | Z0 strony LV |
|------------|--------------|--------------|
| Dyn | ∞ (brak) | Z_T |
| Yyn | ∞ (brak) | ∞ (brak) |
| YNyn | Z_T | ∞ (brak) |
| YNd | Z_T | ∞ (brak) |
| Dzn | ∞ (brak) | Z_T |

### 6.2 Linia/Kabel

```latex
Z_0 = Z_0' \cdot l
```

Gdzie $Z_0'$ [Ω/km] zależy od:
- Typu przewodu
- Uziemienia (cięgno powrotne, ziemia)
- Konfiguracji geometrycznej

Typowe wartości: $Z_0 \approx (2...4) \cdot Z_1$

### 6.3 Mapping keys dla Z0

| Element | Mapping key | Opis |
|---------|-------------|------|
| Transformator | `z0_trafo_ohm` | Z0 zależne od połączenia |
| Linia | `z0_line_ohm` | Z0' × długość |
| Źródło | `z0_source_ohm` | Z0 sieci zasilającej |

---

## 7. Kroki dowodu dla 1F

### 7.1 Lista kroków

| Nr | Krok | Równanie | Wynik |
|----|------|----------|-------|
| 1 | Impedancja zgodna Z1 | `EQ_SC1F_001` | $Z_1$ |
| 2 | Impedancja przeciwna Z2 | `EQ_SC1F_002` | $Z_2$ |
| 3 | Impedancja zerowa Z0 | `EQ_SC1F_003` | $Z_0$ |
| 4 | Suma impedancji | `EQ_SC1F_004` | $Z_1 + Z_2 + Z_0$ |
| 5 | Prąd składowej zgodnej | `EQ_SC1F_005` | $I_1$ |
| 6 | Prąd w fazie zwarcia | `EQ_SC1F_006` | $I_a = 3 \cdot I_1$ |

---

## 8. Rejestr równań (prospektywny)

### 8.1 Równania 1F

| ID | Nazwa | LaTeX |
|----|-------|-------|
| `EQ_SC1F_001` | Impedancja zgodna całkowita | $Z_1 = Z_{1,Q} + Z_{1,T} + Z_{1,L}$ |
| `EQ_SC1F_002` | Impedancja przeciwna | $Z_2 = Z_{2,Q} + Z_{2,T} + Z_{2,L}$ |
| `EQ_SC1F_003` | Impedancja zerowa | $Z_0 = Z_{0,T} + Z_{0,L}$ (zależnie od połączenia) |
| `EQ_SC1F_004` | Suma impedancji | $Z_{sum} = Z_1 + Z_2 + Z_0$ |
| `EQ_SC1F_005` | Prąd składowej zgodnej | $I_1 = \frac{c \cdot U_n}{\sqrt{3} \cdot \|Z_{sum}\|}$ |
| `EQ_SC1F_006` | Prąd w fazie | $I_a = 3 \cdot I_1$ |

### 8.2 Równania 2F

| ID | Nazwa | LaTeX |
|----|-------|-------|
| `EQ_SC2F_001` | Impedancja całkowita 2F | $Z_{2F} = Z_1 + Z_2$ |
| `EQ_SC2F_002` | Prąd zwarciowy 2F | $I_k^{''(2)} = \frac{c \cdot U_n}{\|Z_1 + Z_2\|}$ |

### 8.3 Równania 2FG

| ID | Nazwa | LaTeX |
|----|-------|-------|
| `EQ_SC2FG_001` | Impedancja równoległa | $Z_{2\|0} = \frac{Z_2 \cdot Z_0}{Z_2 + Z_0}$ |
| `EQ_SC2FG_002` | Prąd składowej zgodnej | $I_1 = \frac{c \cdot U_n}{\sqrt{3} \cdot \|Z_1 + Z_{2\|0}\|}$ |
| `EQ_SC2FG_003` | Prąd zwarciowy 2FG | $I_k^{''(2E)} = ...$ (patrz § 5.2) |

---

## 9. Definition of Done (DoD)

### 9.1 P11.1c — DoD

| Kryterium | Status |
|-----------|--------|
| Transformacja Fortescue udokumentowana | SPEC |
| Impedancje Z1, Z2, Z0 zdefiniowane z mapping keys | SPEC |
| Równania 1F z krokami dowodu | SPEC |
| Równania 2F z krokami dowodu | SPEC |
| Równania 2FG z krokami dowodu | SPEC |
| Tabela połączeń transformatorów i ich wpływu na Z0 | SPEC |
| Rejestr równań dla wszystkich typów zwarć | SPEC |

---

**END OF P11.1c**
