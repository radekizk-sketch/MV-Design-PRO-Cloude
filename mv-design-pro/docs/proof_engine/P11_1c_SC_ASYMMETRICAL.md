# P11.1c — Zwarcia asymetryczne (składowe symetryczne)

**STATUS: FULL / BINDING**

## Cel i zakres

P11.1c definiuje pełny dowód matematyczny zwarć asymetrycznych w ujęciu
składowych symetrycznych, generowany w Proof Engine zgodnie z zasadą
registry-first. Dokument opisuje jedynie strukturę i matematykę dowodu,
bez interpretacji normowej.

Zakres obejmuje:
- strukturę kroków dowodowych dla 1F–Z, 2F, 2F–Z,
- definicje równań i symboli (registry-first),
- deterministyczne kroki oraz weryfikację jednostek,
- terminologię PN-EN w wersji polskiej.

## Terminologia PN-EN (PL)

- składowa zgodna (dodatnia),
- składowa przeciwna (ujemna),
- składowa zerowa.

Definicje symboli i zależności są wyrażone wyłącznie w blokach LaTeX:

$$
\begin{aligned}
&Z_1,\ Z_2,\ Z_0 &&\text{impedancje składowe} \\
&I_1,\ I_2,\ I_0 &&\text{prądy składowe} \\
&I_a,\ I_b,\ I_c &&\text{prądy fazowe} \\
&a = e^{j 120^\circ} &&\text{operator Fortescue}
\end{aligned}
$$

## Dane wejściowe (mapping keys)

Dowód wykorzystuje wyłącznie wartości pochodzące z trace/result oraz
przeniesione do wejścia Proof Engine. Klucze mapping są literalne:

- z1_ohm, z2_ohm, z0_ohm
- z_equiv_ohm
- u_prefault_kv
- i1_ka, i2_ka, i0_ka
- ia_ka, ib_ka, ic_ka
- a_operator
- u_n_kv, c_factor

## Rejestr równań (SC1)

**EQ_SC1_001 — Impedancje składowych**

$$
\begin{aligned}
Z_1 &= Z_{1,\mathrm{th}} \\
Z_2 &= Z_{2,\mathrm{th}} \\
Z_0 &= Z_{0,\mathrm{th}}
\end{aligned}
$$

**EQ_SC1_002 — Operator a i macierz Fortescue**

$$
a = e^{j 120^\circ}, \quad a^2 = e^{j 240^\circ}
$$

$$
\begin{bmatrix} I_a \\ I_b \\ I_c \end{bmatrix} =
\begin{bmatrix} 1 & 1 & 1 \\ 1 & a^2 & a \\ 1 & a & a^2 \end{bmatrix}
\begin{bmatrix} I_0 \\ I_1 \\ I_2 \end{bmatrix}
$$

**EQ_SC1_003 — Sieć składowych dla 1F–Z**

$$
Z_k = Z_1 + Z_2 + Z_0
$$

**EQ_SC1_004 — Sieć składowych dla 2F**

$$
Z_k = Z_1 + Z_2
$$

**EQ_SC1_005 — Sieć składowych dla 2F–Z**

$$
Z_k = Z_1 + \frac{Z_2 \cdot Z_0}{Z_2 + Z_0}
$$

**EQ_SC1_006 — Prądy składowe**

$$
\begin{aligned}
\text{1F–Z:}\quad & I_1 = I_2 = I_0 = \frac{U_f}{Z_k} \\
\text{2F:}\quad & I_1 = \frac{U_f}{Z_k},\quad I_2 = -I_1,\quad I_0 = 0 \\
\text{2F–Z:}\quad & I_1 = \frac{U_f}{Z_k},\quad
I_2 = -\frac{Z_0}{Z_2 + Z_0} I_1,\quad
I_0 = -\frac{Z_2}{Z_2 + Z_0} I_1
\end{aligned}
$$

**EQ_SC1_007 — Rekonstrukcja prądów fazowych**

$$
\begin{bmatrix} I_a \\ I_b \\ I_c \end{bmatrix} =
\begin{bmatrix} 1 & 1 & 1 \\ 1 & a^2 & a \\ 1 & a & a^2 \end{bmatrix}
\begin{bmatrix} I_0 \\ I_1 \\ I_2 \end{bmatrix}
$$

## Kroki dowodu (SC1)

### Zwarcie 1F–Z

1. EQ_SC1_001 — impedancje składowe.
2. EQ_SC1_002 — operator a i macierz Fortescue.
3. EQ_SC1_003 — sieć składowych dla 1F–Z.
4. EQ_SC1_006 — prądy składowe.
5. EQ_SC1_007 — rekonstrukcja prądów fazowych.

### Zwarcie 2F

1. EQ_SC1_001 — impedancje składowe.
2. EQ_SC1_002 — operator a i macierz Fortescue.
3. EQ_SC1_004 — sieć składowych dla 2F.
4. EQ_SC1_006 — prądy składowe.
5. EQ_SC1_007 — rekonstrukcja prądów fazowych.

### Zwarcie 2F–Z

1. EQ_SC1_001 — impedancje składowe.
2. EQ_SC1_002 — operator a i macierz Fortescue.
3. EQ_SC1_005 — sieć składowych dla 2F–Z.
4. EQ_SC1_006 — prądy składowe.
5. EQ_SC1_007 — rekonstrukcja prądów fazowych.

## Inwarianty

- determinism: identyczne wejście daje identyczny dowód,
- registry-first: matematyka wyłącznie z rejestru równań,
- LaTeX-only: cała matematyka w blokach LaTeX.
