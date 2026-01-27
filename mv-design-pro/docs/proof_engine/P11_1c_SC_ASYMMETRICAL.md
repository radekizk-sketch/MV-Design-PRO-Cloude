# P11.1c — Zwarcia niesymetryczne (składowe symetryczne)

**STATUS: REFERENCE (prospektywny)**
**Version:** 1.1
**Reference:** P11_OVERVIEW.md, PROOF_SCHEMAS.md, IEC 60909-0:2016

---

## 0. Relacja do Proof Pack P11

### 0.1 Pozycja w hierarchii

$$
\boxed{
\begin{aligned}
&\textbf{P11 (OVERVIEW)} \to \textbf{P11.1c (SC ASYMMETRICAL)} \\[6pt]
&\text{Dokument rozszerza zakres P11 o zwarcia niesymetryczne:} \\
&\quad \text{• SC1F — zwarcie jednofazowe (L-G)} \\
&\quad \text{• SC2F — zwarcie dwufazowe (L-L)} \\
&\quad \text{• SC2FG — zwarcie dwufazowe z ziemią (L-L-G)}
\end{aligned}
}
$$

### 0.2 Wejścia i wyjścia

| Kierunek | Źródło / Cel | Opis |
|----------|--------------|------|
| **Wejście** | `WhiteBoxTrace` | Impedancje składowych z solvera |
| **Wejście** | `SolverConfig` | Typ zwarcia, lokalizacja |
| **Wyjście** | `ProofDocument` | Dowód z krokami dla 1F/2F/2FG |
| **Rejestr** | `EQUATIONS_*.md` | Równania z ID (EQ_SC1F_*, EQ_SC2F_*, EQ_SC2FG_*) |

### 0.3 Relacja do solvera

$$
\boxed{
\textbf{INTERPRETATION-ONLY:} \quad \text{Ten dokument NIE zmienia solvera. Definiuje format dowodu.}
}
$$

---

## 1. Cel i zakres

### 1.1 Definicja

Dowód dla zwarć niesymetrycznych obejmuje:
- Transformację do składowych symetrycznych (Fortescue)
- Obliczenia impedancji składowej zgodnej, składowej przeciwnej i składowej zerowej
- Typy zwarć: 1F (jednofazowe), 2F (dwufazowe), 2FG (dwufazowe z ziemią)

### 1.2 Typy zwarć (BINDING)

| Typ | Symbol | Opis |
|-----|--------|------|
| **3F** | SC3F | Zwarcie trójfazowe symetryczne |
| **1F** | SC1F | Zwarcie jednofazowe (L-G) |
| **2F** | SC2F | Zwarcie dwufazowe (L-L) |
| **2FG** | SC2FG | Zwarcie dwufazowe z ziemią (L-L-G) |

---

## 1a. Tabela terminologiczna (EN → PL) — BINDING

$$
\boxed{
\begin{array}{|l|l|l|}
\hline
\textbf{Termin angielski} & \textbf{Termin polski (NORMOWY)} & \textbf{Symbol} \\
\hline
\text{positive sequence} & \textbf{składowa zgodna} & Z_1, I_1, U_1 \\
\text{negative sequence} & \textbf{składowa przeciwna} & Z_2, I_2, U_2 \\
\text{zero sequence} & \textbf{składowa zerowa} & Z_0, I_0, U_0 \\
\text{symmetrical components} & \text{składowe symetryczne} & — \\
\text{Fortescue transformation} & \text{transformacja Fortescue} & — \\
\text{sequence impedance} & \text{impedancja składowej} & Z_1, Z_2, Z_0 \\
\hline
\end{array}
}
$$

$$
\boxed{
\textbf{REGUŁA:} \quad \text{W całym Proof Pack używać WYŁĄCZNIE polskich nazw normowych.}
}
$$

---

## 2. Składowe symetryczne — definicja

### 2.1 Transformacja Fortescue

$$
\begin{bmatrix} I_0 \\ I_1 \\ I_2 \end{bmatrix} =
\frac{1}{3}
\begin{bmatrix}
1 & 1 & 1 \\
1 & a & a^2 \\
1 & a^2 & a
\end{bmatrix}
\begin{bmatrix} I_a \\ I_b \\ I_c \end{bmatrix}
$$

Gdzie:

$$
\begin{aligned}
&a = e^{j120°} = -0{,}5 + j\frac{\sqrt{3}}{2} \\[6pt]
&I_0 \text{ — składowa zerowa (zero sequence)} \\
&I_1 \text{ — składowa zgodna (positive sequence)} \\
&I_2 \text{ — składowa przeciwna (negative sequence)}
\end{aligned}
$$

### 2.2 Impedancje składowych (BINDING)

$$
\begin{array}{|c|l|l|}
\hline
\textbf{Symbol} & \textbf{Nazwa polska} & \textbf{Opis} \\
\hline
Z_1 & \text{Impedancja składowej zgodnej} & \text{Identyczna jak dla SC3F} \\
Z_2 & \text{Impedancja składowej przeciwnej} & Z_2 = Z_1 \text{ dla elementów statycznych} \\
Z_0 & \text{Impedancja składowej zerowej} & \text{Zależy od uziemienia, połączeń transformatorów} \\
\hline
\end{array}
$$

### 2.3 Mapping keys dla składowych

$$
\begin{array}{|c|l|l|l|}
\hline
\textbf{Symbol} & \textbf{Mapping key} & \textbf{Jednostka} & \textbf{Opis} \\
\hline
Z_1 & \texttt{z1\_ohm} & \Omega & \text{Impedancja składowej zgodnej} \\
Z_2 & \texttt{z2\_ohm} & \Omega & \text{Impedancja składowej przeciwnej} \\
Z_0 & \texttt{z0\_ohm} & \Omega & \text{Impedancja składowej zerowej} \\
I_0 & \texttt{i0\_ka} & \text{kA} & \text{Prąd składowej zerowej} \\
I_1 & \texttt{i1\_ka} & \text{kA} & \text{Prąd składowej zgodnej} \\
I_2 & \texttt{i2\_ka} & \text{kA} & \text{Prąd składowej przeciwnej} \\
\hline
\end{array}
$$

---

## 3. Zwarcie jednofazowe (1F) — równania

### 3.1 Schemat zastępczy

$$
\boxed{
\begin{array}{c}
\text{Źródło: } \frac{c \cdot U_n}{\sqrt{3}} \\[8pt]
\downarrow \\
[Z_1] \text{ — impedancja składowej zgodnej} \\
\downarrow \\
[Z_2] \text{ — impedancja składowej przeciwnej} \\
\downarrow \\
[Z_0] \text{ — impedancja składowej zerowej} \\
\downarrow \\
\text{GND (ziemia)}
\end{array}
}
$$

### 3.2 Równanie prądu zwarciowego 1F (BINDING)

**ID równania:** `EQ_SC1F_005`

$$
I_k^{''(1)} = \frac{\sqrt{3} \cdot c \cdot U_n}{|Z_1 + Z_2 + Z_0|}
$$

### 3.3 Równanie prądu w fazie zwarcia

**ID równania:** `EQ_SC1F_006`

$$
I_a = 3 \cdot I_1 = \frac{3 \cdot c \cdot U_n}{\sqrt{3} \cdot |Z_1 + Z_2 + Z_0|}
$$

### 3.4 Mapping keys dla 1F

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Krok} & \textbf{Input keys} & \textbf{Output key} \\
\hline
\text{Impedancja składowej zgodnej} & \texttt{z\_source\_z1, z\_trafo\_z1, z\_line\_z1} & \texttt{z1\_ohm} \\
\text{Impedancja składowej przeciwnej} & \texttt{z\_source\_z2, z\_trafo\_z2, z\_line\_z2} & \texttt{z2\_ohm} \\
\text{Impedancja składowej zerowej} & \texttt{z\_source\_z0, z\_trafo\_z0, z\_line\_z0} & \texttt{z0\_ohm} \\
\text{Prąd składowej zgodnej} & \texttt{c\_factor, u\_n\_kv, z1\_ohm, z2\_ohm, z0\_ohm} & \texttt{i1\_ka} \\
\text{Prąd w fazie} & \texttt{i1\_ka} & \texttt{ia\_1f\_ka} \\
\hline
\end{array}
$$

---

## 4. Zwarcie dwufazowe (2F) — równania

### 4.1 Schemat zastępczy

$$
\boxed{
\begin{array}{c}
\text{Źródło: } \frac{c \cdot U_n}{\sqrt{3}} \\[8pt]
\downarrow \\
[Z_1] \text{ — impedancja składowej zgodnej} \\
\downarrow \\
[Z_2] \text{ — impedancja składowej przeciwnej} \\
\downarrow \\
\text{ZWARCIE (L-L)}
\end{array}
}
$$

### 4.2 Równanie prądu zwarciowego 2F (BINDING)

**ID równania:** `EQ_SC2F_002`

$$
I_k^{''(2)} = \frac{c \cdot U_n}{|Z_1 + Z_2|}
$$

### 4.3 Relacja do prądu 3F

**ID równania:** `EQ_SC2F_003`

$$
I_k^{''(2)} = \frac{\sqrt{3}}{2} \cdot I_k^{''(3)} \approx 0{,}866 \cdot I_k^{''(3)}
$$

(przy założeniu impedancji składowej zgodnej równej składowej przeciwnej)

### 4.4 Mapping keys dla 2F

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Krok} & \textbf{Input keys} & \textbf{Output key} \\
\hline
\text{Impedancja składowej zgodnej} & \texttt{z1\_ohm} & — \\
\text{Impedancja składowej przeciwnej} & \texttt{z2\_ohm} & — \\
\text{Prąd zwarciowy 2F} & \texttt{c\_factor, u\_n\_kv, z1\_ohm, z2\_ohm} & \texttt{ikss\_2f\_ka} \\
\hline
\end{array}
$$

---

## 5. Zwarcie dwufazowe z ziemią (2FG) — równania

### 5.1 Schemat zastępczy

$$
\boxed{
\begin{array}{c}
\text{Źródło: } \frac{c \cdot U_n}{\sqrt{3}} \\[8pt]
\downarrow \\
[Z_1] \text{ — impedancja składowej zgodnej} \\[8pt]
\downarrow \\
\text{ROZGAŁĘZIENIE:} \\
[Z_2] \parallel [Z_0] \\
\text{(składowa przeciwna równolegle z zerową)} \\[8pt]
\downarrow \\
\text{GND (ziemia)}
\end{array}
}
$$

### 5.2 Równanie prądu zwarciowego 2FG (BINDING)

**ID równania:** `EQ_SC2FG_003`

$$
I_k^{''(2E)} = \frac{\sqrt{3} \cdot c \cdot U_n \cdot |Z_2|}{|Z_1 \cdot Z_2 + Z_1 \cdot Z_0 + Z_2 \cdot Z_0|}
$$

### 5.3 Składowa zerowa

**ID równania:** `EQ_SC2FG_004`

$$
I_0 = -\frac{c \cdot U_n / \sqrt{3}}{Z_1 + \frac{Z_2 \cdot Z_0}{Z_2 + Z_0}} \cdot \frac{Z_2}{Z_2 + Z_0}
$$

### 5.4 Mapping keys dla 2FG

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Krok} & \textbf{Input keys} & \textbf{Output key} \\
\hline
\text{Impedancja równoległa } Z_2 \parallel Z_0 & \texttt{z2\_ohm, z0\_ohm} & \texttt{z2\_parallel\_z0\_ohm} \\
\text{Prąd składowej zgodnej} & \texttt{c\_factor, u\_n\_kv, z1\_ohm, z2\_parallel\_z0\_ohm} & \texttt{i1\_2fg\_ka} \\
\text{Prąd składowej zerowej} & \texttt{i1\_2fg\_ka, z2\_ohm, z0\_ohm} & \texttt{i0\_2fg\_ka} \\
\text{Prąd zwarciowy 2FG} & \texttt{i1\_2fg\_ka, z2\_ohm, ...} & \texttt{ikss\_2fg\_ka} \\
\hline
\end{array}
$$

---

## 6. Impedancja składowej zerowej — źródła

### 6.1 Transformator (BINDING)

$$
\begin{array}{|l|c|c|}
\hline
\textbf{Połączenie} & \textbf{Z_0 strony WN} & \textbf{Z_0 strony SN/nN} \\
\hline
\text{Dyn} & \infty \text{ (brak)} & Z_T \\
\text{Yyn} & \infty \text{ (brak)} & \infty \text{ (brak)} \\
\text{YNyn} & Z_T & \infty \text{ (brak)} \\
\text{YNd} & Z_T & \infty \text{ (brak)} \\
\text{Dzn} & \infty \text{ (brak)} & Z_T \\
\hline
\end{array}
$$

### 6.2 Linia/Kabel

**ID równania:** `EQ_SC_Z0_001`

$$
Z_0 = Z_0' \cdot l
$$

Gdzie:

$$
\begin{aligned}
&Z_0' \text{ — impedancja jednostkowa składowej zerowej } [\Omega/\text{km}] \\
&\text{Zależy od: typu przewodu, uziemienia (cięgno powrotne, ziemia), konfiguracji geometrycznej} \\[6pt]
&\textbf{Typowe wartości:} \quad Z_0 \approx (2 \ldots 4) \cdot Z_1
\end{aligned}
$$

### 6.3 Mapping keys dla impedancji składowej zerowej

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Element} & \textbf{Mapping key} & \textbf{Opis} \\
\hline
\text{Transformator} & \texttt{z0\_trafo\_ohm} & Z_0 \text{ zależne od połączenia} \\
\text{Linia} & \texttt{z0\_line\_ohm} & Z_0' \times \text{długość} \\
\text{Źródło} & \texttt{z0\_source\_ohm} & Z_0 \text{ sieci zasilającej} \\
\hline
\end{array}
$$

---

## 7. Kroki dowodu dla 1F

### 7.1 Lista kroków

$$
\begin{array}{|c|l|l|l|}
\hline
\textbf{Nr} & \textbf{Krok} & \textbf{Równanie} & \textbf{Wynik} \\
\hline
1 & \text{Impedancja składowej zgodnej} & \texttt{EQ\_SC1F\_001} & Z_1 \\
2 & \text{Impedancja składowej przeciwnej} & \texttt{EQ\_SC1F\_002} & Z_2 \\
3 & \text{Impedancja składowej zerowej} & \texttt{EQ\_SC1F\_003} & Z_0 \\
4 & \text{Suma impedancji} & \texttt{EQ\_SC1F\_004} & Z_1 + Z_2 + Z_0 \\
5 & \text{Prąd składowej zgodnej} & \texttt{EQ\_SC1F\_005} & I_1 \\
6 & \text{Prąd w fazie zwarcia} & \texttt{EQ\_SC1F\_006} & I_a = 3 \cdot I_1 \\
\hline
\end{array}
$$

---

## 8. Rejestr równań (prospektywny)

### 8.1 Równania 1F

$$
\begin{array}{|l|l|l|}
\hline
\textbf{ID} & \textbf{Nazwa} & \textbf{Wzór} \\
\hline
\texttt{EQ\_SC1F\_001} & \text{Impedancja składowej zgodnej całkowita} & Z_1 = Z_{1,Q} + Z_{1,T} + Z_{1,L} \\
\texttt{EQ\_SC1F\_002} & \text{Impedancja składowej przeciwnej} & Z_2 = Z_{2,Q} + Z_{2,T} + Z_{2,L} \\
\texttt{EQ\_SC1F\_003} & \text{Impedancja składowej zerowej} & Z_0 = Z_{0,T} + Z_{0,L} \\
\texttt{EQ\_SC1F\_004} & \text{Suma impedancji} & Z_{sum} = Z_1 + Z_2 + Z_0 \\
\texttt{EQ\_SC1F\_005} & \text{Prąd składowej zgodnej} & I_1 = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{sum}|} \\
\texttt{EQ\_SC1F\_006} & \text{Prąd w fazie} & I_a = 3 \cdot I_1 \\
\hline
\end{array}
$$

### 8.2 Równania 2F

$$
\begin{array}{|l|l|l|}
\hline
\textbf{ID} & \textbf{Nazwa} & \textbf{Wzór} \\
\hline
\texttt{EQ\_SC2F\_001} & \text{Impedancja całkowita 2F} & Z_{2F} = Z_1 + Z_2 \\
\texttt{EQ\_SC2F\_002} & \text{Prąd zwarciowy 2F} & I_k^{''(2)} = \frac{c \cdot U_n}{|Z_1 + Z_2|} \\
\texttt{EQ\_SC2F\_003} & \text{Relacja do prądu 3F} & I_k^{''(2)} = \frac{\sqrt{3}}{2} \cdot I_k^{''(3)} \\
\hline
\end{array}
$$

### 8.3 Równania 2FG

$$
\begin{array}{|l|l|l|}
\hline
\textbf{ID} & \textbf{Nazwa} & \textbf{Wzór} \\
\hline
\texttt{EQ\_SC2FG\_001} & \text{Impedancja równoległa} & Z_{2\|0} = \frac{Z_2 \cdot Z_0}{Z_2 + Z_0} \\
\texttt{EQ\_SC2FG\_002} & \text{Prąd składowej zgodnej} & I_1 = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_1 + Z_{2\|0}|} \\
\texttt{EQ\_SC2FG\_003} & \text{Prąd zwarciowy 2FG} & I_k^{''(2E)} = \frac{\sqrt{3} \cdot c \cdot U_n \cdot |Z_2|}{|Z_1 Z_2 + Z_1 Z_0 + Z_2 Z_0|} \\
\texttt{EQ\_SC2FG\_004} & \text{Prąd składowej zerowej} & I_0 = -\frac{c \cdot U_n / \sqrt{3}}{Z_1 + Z_{2\|0}} \cdot \frac{Z_2}{Z_2 + Z_0} \\
\hline
\end{array}
$$

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
