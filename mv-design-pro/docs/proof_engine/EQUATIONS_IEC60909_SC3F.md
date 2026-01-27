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
  Z_Q = \frac{U_n^2}{S_k''_Q}
symbols:
  - symbol: "Z_Q"
    unit: "Ω"
    description_pl: "Impedancja źródła"
    mapping_key: "z_source_ohm"
  - symbol: "U_n"
    unit: "kV"
    description_pl: "Napięcie znamionowe"
    mapping_key: "u_n_kv"
  - symbol: "S_k''_Q"
    unit: "MVA"
    description_pl: "Moc zwarciowa źródła"
    mapping_key: "sk_source_mva"
unit_derivation: "kV² / MVA = kV² / (kV · kA) = kV / kA = Ω"
notes: |
  UWAGA: Współczynnik c NIE występuje w tym równaniu (Wariant A).
  c jest wprowadzany WYŁĄCZNIE w EQ_SC3F_004 (I_k'').
  Patrz sekcja 3a: Anti-Double-Counting.
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

### EQ_SC3F_008 — Prąd cieplny równoważny (OBOWIĄZKOWY)

```yaml
equation_id: EQ_SC3F_008
name_pl: "Prąd cieplny równoważny"
standard_ref: "IEC 60909-0:2016 eq. (100)–(105)"
status: MANDATORY
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
    description_pl: "Współczynnik dla składowej nieokresowej (DC)"
    mapping_key: "m_factor"
  - symbol: "n"
    unit: "—"
    description_pl: "Współczynnik dla składowej okresowej (AC decay)"
    mapping_key: "n_factor"
  - symbol: "t_k"
    unit: "s"
    description_pl: "Czas trwania zwarcia (parametr wejściowy OBOWIĄZKOWY)"
    mapping_key: "t_k_s"
unit_derivation: "kA · — = kA"
```

#### EQ_SC3F_008b — Pełny wzór na współczynnik m (BINDING)

$$
\boxed{
m = \frac{1}{2 \cdot f \cdot t_k \cdot \ln(\kappa - 1)} \cdot \left( e^{4 \cdot f \cdot t_k \cdot \ln(\kappa - 1)} - 1 \right)
}
$$

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Symbol} & \textbf{Jednostka} & \textbf{Opis} & \textbf{Mapping key} \\
\hline
f & \text{Hz} & \text{Częstotliwość sieci} & \texttt{f\_hz} \\
t_k & \text{s} & \text{Czas trwania zwarcia (OBOWIĄZKOWY)} & \texttt{t\_k\_s} \\
\kappa & — & \text{Współczynnik udaru} & \texttt{kappa} \\
\hline
\end{array}
$$

#### EQ_SC3F_008c — Pełny wzór na współczynnik n (BINDING)

$$
\boxed{
n = \frac{1}{t_k} \cdot \int_0^{t_k} \left( \frac{I_k''(t)}{I_k''} \right)^2 dt
}
$$

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Wymagane dane wejściowe} & \textbf{Mapping key} & \textbf{Opis} \\
\hline
I_k''(t) & \texttt{ikss\_decay\_curve} & \text{Przebieg czasowy prądu zwarciowego} \\
t_k & \texttt{t\_k\_s} & \text{Czas trwania zwarcia} \\
\hline
\end{array}
$$

#### EQ_SC3F_008d — Pełne obliczenie współczynników (OBOWIĄZKOWE)

$$
\boxed{
\begin{aligned}
&\textbf{PEŁNE OBLICZENIE WSPÓŁCZYNNIKÓW } m \textbf{ ORAZ } n \textbf{ JEST OBOWIĄZKOWE} \\[8pt]
&\textbf{Wymagane dane wejściowe:} \\[4pt]
&\quad t_k \quad \text{— czas trwania zwarcia (parametr wejściowy)} \\
&\quad f \quad \text{— częstotliwość sieci} \\
&\quad \kappa \quad \text{— współczynnik udaru (obliczony)} \\
&\quad I_k''(t) \quad \text{— przebieg czasowy prądu (jeśli dostępny)} \\[8pt]
&\textbf{BEZ UPROSZCZEŃ — solver MUSI obliczyć } m \textbf{ i } n \textbf{ z pełnych wzorów}
\end{aligned}
}
$$

---

### EQ_SC3F_008a — Prąd dynamiczny (OBOWIĄZKOWY)

```yaml
equation_id: EQ_SC3F_008a
name_pl: "Prąd dynamiczny"
standard_ref: "IEC 60909-0:2016 § 4.3.1.2"
status: MANDATORY
latex: |
  I_{dyn} = i_p
symbols:
  - symbol: "I_{dyn}"
    unit: "kA"
    description_pl: "Prąd dynamiczny (do wymiarowania wytrzymałości dynamicznej)"
    mapping_key: "idyn_ka"
  - symbol: "i_p"
    unit: "kA"
    description_pl: "Prąd udarowy (szczytowy)"
    mapping_key: "ip_ka"
unit_derivation: "kA = kA"
notes: |
  Prąd dynamiczny służy do wymiarowania aparatury na wytrzymałość elektrodynamiczną.
  Jest numerycznie równy prądowi udarowemu.
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

$$
\begin{array}{|l|l|l|l|l|}
\hline
\textbf{ID} & \textbf{Nazwa} & \textbf{Wzór} & \textbf{Wynik} & \textbf{Mapping key} \\
\hline
\text{EQ\_SC3F\_001} & \text{Napięcie z c} & U_{eq} = c \cdot U_n & \text{kV} & \text{u\_eq\_kv} \\
\text{EQ\_SC3F\_002} & \text{Impedancja źródła} & Z_Q = \frac{U_n^2}{S_k''_Q} \text{ (BEZ } c \text{)} & \Omega & \text{z\_source\_ohm} \\
\text{EQ\_SC3F\_002a} & \text{Rozkład R/X} & R_Q, X_Q & \Omega & \text{r/x\_source\_ohm} \\
\text{EQ\_SC3F\_003} & \text{Impedancja Thevenina} & Z_{th} = Z_Q + Z_T + Z_L & \Omega & \text{z\_thevenin\_ohm} \\
\text{EQ\_SC3F\_004} & \text{Prąd } I_k'' & I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|} \text{ (c TUTAJ)} & \text{kA} & \text{ikss\_ka} \\
\text{EQ\_SC3F\_005} & \text{Współczynnik } \kappa & \kappa = 1.02 + 0.98 \cdot e^{-3R/X} & — & \text{kappa} \\
\text{EQ\_SC3F\_006} & \text{Prąd udarowy } i_p & i_p = \kappa \cdot \sqrt{2} \cdot I_k'' & \text{kA} & \text{ip\_ka} \\
\text{EQ\_SC3F\_007} & \text{Moc } S_k'' & S_k'' = \sqrt{3} \cdot U_n \cdot I_k'' & \text{MVA} & \text{sk\_mva} \\
\text{EQ\_SC3F\_008} & \text{Prąd cieplny } I_{th} & I_{th} = I_k'' \cdot \sqrt{m+n} & \text{kA} & \text{ith\_ka} \\
\text{EQ\_SC3F\_008a} & \text{Prąd dynamiczny } I_{dyn} & I_{dyn} = i_p & \text{kA} & \text{idyn\_ka} \\
\text{EQ\_SC3F\_009} & \text{Impedancja transf.} & Z_T = \frac{u_k\% \cdot U_n^2}{100 \cdot S_r} & \Omega & \text{z\_transformer\_ohm} \\
\text{EQ\_SC3F\_010} & \text{Impedancja linii} & Z_L = (r + jx) \cdot l & \Omega & \text{z\_line\_ohm} \\
\hline
\end{array}
$$

---

## 3a. Reguła anti-double-counting dla współczynnika c (BINDING)

$$
\boxed{
\begin{aligned}
&\textbf{REGUŁA ANTI-DOUBLE-COUNTING} \\[8pt]
&\text{Współczynnik napięciowy } c \text{ musi być zastosowany} \\
&\textbf{dokładnie raz} \text{ w łańcuchu obliczeniowym.} \\[12pt]
&\textbf{Wariant A — } c \textbf{ w napięciu:} \\[4pt]
&\quad U_{eq} = c \cdot U_n \\
&\quad I_k'' = \frac{U_{eq}}{\sqrt{3} \cdot |Z_{th}|} = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|} \\
&\quad Z_Q = \frac{U_n^2}{S_k''_Q} \quad \text{(BEZ } c \text{)} \\[12pt]
&\textbf{Wariant B — } c \textbf{ w impedancji źródła:} \\[4pt]
&\quad Z_Q = \frac{c \cdot U_n^2}{S_k''_Q} \quad \text{(z } c \text{)} \\
&\quad I_k'' = \frac{U_n}{\sqrt{3} \cdot |Z_{th}|} \quad \text{(BEZ } c \text{)} \\[12pt]
&\textbf{ZAKAZ (double-counting):} \\[4pt]
&\quad Z_Q = \frac{c \cdot U_n^2}{S_k''_Q} \;\land\; I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|} \quad \text{❌ BŁĄD!}
\end{aligned}
}
$$

$$
\boxed{
\textbf{MV-DESIGN-PRO stosuje Wariant A (zgodny z IEC 60909-0:2016 eq. (29)):} \quad I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|}
}
$$

---

## 4. Mapping keys — pełna lista (BINDING)

### 4.1 Wejścia

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Mapping key} & \textbf{Typ} & \textbf{Jednostka} & \textbf{Opis} \\
\hline
\texttt{u\_n\_kv} & \text{float} & \text{kV} & \text{Napięcie znamionowe} \\
\texttt{c\_factor} & \text{float} & — & \text{Współczynnik napięciowy} \\
\texttt{sk\_source\_mva} & \text{float} & \text{MVA} & \text{Moc zwarciowa źródła} \\
\texttt{rx\_ratio} & \text{float} & — & \text{Stosunek X/R źródła} \\
\texttt{uk\_percent} & \text{float} & \% & \text{Napięcie zwarcia transformatora} \\
\texttt{s\_rated\_mva} & \text{float} & \text{MVA} & \text{Moc znamionowa transformatora} \\
\texttt{r\_ohm\_per\_km} & \text{float} & \Omega/\text{km} & \text{Rezystancja jednostkowa linii} \\
\texttt{x\_ohm\_per\_km} & \text{float} & \Omega/\text{km} & \text{Reaktancja jednostkowa linii} \\
\texttt{length\_km} & \text{float} & \text{km} & \text{Długość linii/kabla} \\
\texttt{t\_k\_s} & \text{float} & \text{s} & \text{Czas trwania zwarcia (OBOWIĄZKOWY)} \\
\texttt{f\_hz} & \text{float} & \text{Hz} & \text{Częstotliwość sieci} \\
\hline
\end{array}
$$

### 4.2 Wartości pośrednie

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Mapping key} & \textbf{Typ} & \textbf{Jednostka} & \textbf{Opis} \\
\hline
\texttt{u\_eq\_kv} & \text{float} & \text{kV} & \text{Napięcie równoważne źródła} \\
\texttt{z\_source\_ohm} & \text{complex} & \Omega & \text{Impedancja źródła} \\
\texttt{r\_source\_ohm} & \text{float} & \Omega & \text{Rezystancja źródła} \\
\texttt{x\_source\_ohm} & \text{float} & \Omega & \text{Reaktancja źródła} \\
\texttt{z\_transformer\_ohm} & \text{complex} & \Omega & \text{Impedancja transformatora} \\
\texttt{z\_line\_ohm} & \text{complex} & \Omega & \text{Impedancja linii} \\
\texttt{z\_thevenin\_ohm} & \text{complex} & \Omega & \text{Impedancja Thevenina} \\
\texttt{r\_thevenin\_ohm} & \text{float} & \Omega & \text{Rezystancja Thevenina} \\
\texttt{x\_thevenin\_ohm} & \text{float} & \Omega & \text{Reaktancja Thevenina} \\
\texttt{kappa} & \text{float} & — & \text{Współczynnik udaru } \kappa \\
\texttt{m\_factor} & \text{float} & — & \text{Współczynnik } m \text{ (cieplny)} \\
\texttt{n\_factor} & \text{float} & — & \text{Współczynnik } n \text{ (cieplny)} \\
\hline
\end{array}
$$

### 4.3 Wyniki (MANDATORY)

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Mapping key} & \textbf{Typ} & \textbf{Jednostka} & \textbf{Opis} \\
\hline
\text{ikss\_ka} & \text{float} & \text{kA} & \text{Początkowy prąd zwarciowy symetryczny} \\
\text{ip\_ka} & \text{float} & \text{kA} & \text{Prąd udarowy (szczytowy)} \\
\text{idyn\_ka} & \text{float} & \text{kA} & \text{Prąd dynamiczny (OBOWIĄZKOWY)} \\
\text{ith\_ka} & \text{float} & \text{kA} & \text{Prąd cieplny równoważny (OBOWIĄZKOWY)} \\
\text{sk\_mva} & \text{float} & \text{MVA} & \text{Moc zwarciowa początkowa} \\
\hline
\end{array}
$$

---

## 5. Warunki stosowalności wzoru na κ (BINDING)

$$
\boxed{
\begin{aligned}
&\textbf{Warunki dla } \kappa = 1{,}02 + 0{,}98 \cdot e^{-3 R_{th}/X_{th}}: \\[6pt]
&0{,}005 \leq \frac{R_{th}}{X_{th}} \leq 1{,}0 \\[4pt]
&\text{Dla } \frac{R_{th}}{X_{th}} > 1{,}0 \Rightarrow \kappa = 1{,}02 + 0{,}98 \cdot e^{-3} \approx 1{,}07 \\[4pt]
&\text{Dla } \frac{R_{th}}{X_{th}} \to 0 \Rightarrow \kappa \to 2{,}00 \\[6pt]
&\textbf{Zakres wartości: } 1{,}02 \leq \kappa \leq 2{,}00
\end{aligned}
}
$$

---

## 6. Anti-Double-Counting Audit (BINDING)

**Status: PASS**
**Audyt: 2026-01-27**
**Auditor: Opus 4.5 — Profesor Energetyki IEC 60909**

---

### 6.1 Audyt współczynnika c (KRYTYCZNY)

$$
\boxed{
\begin{aligned}
&\textbf{WYNIK AUDYTU: PASS (po korekcie)} \\[12pt]
&\textbf{Współczynnik } c \textbf{ wprowadzony DOKŁADNIE RAZ:} \\[8pt]
&\quad \text{EQ\_SC3F\_004: } I_k'' = \frac{\colorbox{yellow}{$c$} \cdot U_n}{\sqrt{3} \cdot |Z_{th}|} \quad \checkmark \\[12pt]
&\textbf{Współczynnik } c \textbf{ NIE występuje w:} \\[4pt]
&\quad \text{EQ\_SC3F\_002: } Z_Q = \frac{U_n^2}{S_k''_Q} \quad \text{(BEZ } c \text{)} \quad \checkmark \\
&\quad \text{EQ\_SC3F\_003: } Z_{th} = Z_Q + Z_T + Z_L \quad \checkmark \\
&\quad \text{EQ\_SC3F\_005: } \kappa = f(R_{th}/X_{th}) \quad \checkmark \\
&\quad \text{EQ\_SC3F\_006: } i_p = \kappa \cdot \sqrt{2} \cdot I_k'' \quad \checkmark \\
&\quad \text{EQ\_SC3F\_007: } S_k'' = \sqrt{3} \cdot U_n \cdot I_k'' \quad \checkmark \\
&\quad \text{EQ\_SC3F\_008: } I_{th} = I_k'' \cdot \sqrt{m+n} \quad \checkmark \\
&\quad \text{EQ\_SC3F\_009: } Z_T = \frac{u_k\% \cdot U_n^2}{100 \cdot S_r} \quad \checkmark \\
&\quad \text{EQ\_SC3F\_010: } Z_L = (r+jx) \cdot l \quad \checkmark
\end{aligned}
}
$$

### 6.2 Audyt wielkości pochodnych

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Wielkość} & \textbf{Wprowadzona w} & \textbf{Używana w} & \textbf{Status} \\
\hline
c & \text{(wejście)} & \text{EQ\_SC3F\_004 ONLY} & \checkmark \text{ PASS} \\
U_n & \text{(wejście)} & \text{EQ\_SC3F\_001,002,004,007,009} & \checkmark \text{ PASS (input)} \\
Z_Q & \text{EQ\_SC3F\_002} & \text{EQ\_SC3F\_003} & \checkmark \text{ PASS} \\
Z_{th} & \text{EQ\_SC3F\_003} & \text{EQ\_SC3F\_004,005} & \checkmark \text{ PASS} \\
I_k'' & \text{EQ\_SC3F\_004} & \text{EQ\_SC3F\_006,007,008} & \checkmark \text{ PASS} \\
\kappa & \text{EQ\_SC3F\_005} & \text{EQ\_SC3F\_006,008b} & \checkmark \text{ PASS} \\
i_p & \text{EQ\_SC3F\_006} & \text{EQ\_SC3F\_008a} & \checkmark \text{ PASS} \\
\hline
\end{array}
$$

### 6.3 Warianty A/B — mutually exclusive

$$
\boxed{
\begin{aligned}
&\textbf{MV-DESIGN-PRO stosuje WARIANT A (BINDING):} \\[8pt]
&\quad c \text{ w liczniku } I_k'' \quad \land \quad c \text{ BRAK w } Z_Q \\[12pt]
&\textbf{Wariant B (NIE UŻYWANY):} \\[4pt]
&\quad c \text{ w } Z_Q \quad \land \quad c \text{ BRAK w } I_k'' \\[12pt]
&\textbf{ZAKAZ (double-counting):} \\[4pt]
&\quad c \text{ w } Z_Q \;\land\; c \text{ w } I_k'' \quad \Rightarrow \quad I_k'' \text{ zawyżone o czynnik } c
\end{aligned}
}
$$

### 6.4 Łańcuch obliczeniowy (weryfikacja)

```
WEJŚCIA (pierwotne):
  U_n, S_k''_Q, X/R, u_k%, S_r, r, x, l, c, t_k, f
       │
       ▼
KROK 1: Z_Q = U_n² / S_k''_Q          [c NIE UŻYTE]
KROK 2: Z_T = u_k% · U_n² / (100·S_r)  [c NIE UŻYTE]
KROK 3: Z_L = (r+jx) · l               [c NIE UŻYTE]
KROK 4: Z_th = Z_Q + Z_T + Z_L         [c NIE UŻYTE]
       │
       ▼
KROK 5: I_k'' = c·U_n / (√3·|Z_th|)    [c WPROWADZONE TUTAJ — JEDYNY RAZ]
       │
       ▼
KROK 6: κ = f(R_th/X_th)               [c NIE UŻYTE, już wliczone w I_k'']
KROK 7: i_p = κ · √2 · I_k''           [c NIE UŻYTE, już wliczone w I_k'']
KROK 8: S_k'' = √3 · U_n · I_k''       [c NIE UŻYTE, już wliczone w I_k'']
KROK 9: I_th = I_k'' · √(m+n)          [c NIE UŻYTE, już wliczone w I_k'']
KROK 10: I_dyn = i_p                   [c NIE UŻYTE]
       │
       ▼
WYNIKI: I_k'', i_p, S_k'', I_th, I_dyn
        [c wpływa na wszystkie poprzez I_k'' — DOKŁADNIE RAZ]
```

### 6.5 Gwarancja formalna

$$
\boxed{
\textbf{GWARANCJA: Żadna wielkość fizyczna nie jest liczona podwójnie w rejestrze SC3F.}
}
$$

| Wielkość | Wprowadzona dokładnie raz | Weryfikacja |
|----------|---------------------------|-------------|
| c | EQ_SC3F_004 | ✓ |
| κ | EQ_SC3F_005 | ✓ |
| Z_th | EQ_SC3F_003 | ✓ |
| I_k'' | EQ_SC3F_004 | ✓ |
| i_p | EQ_SC3F_006 | ✓ |
| X/R | (wejście) | ✓ |

---

**END OF EQUATIONS SC3F**
