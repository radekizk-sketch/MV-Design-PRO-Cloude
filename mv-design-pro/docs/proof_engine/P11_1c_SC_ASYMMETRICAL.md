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

## TODO — Proof Packs P14–P19 (FUTURE PACKS)

### TODO-P14-001 (PLANNED) — P14: Power Flow Proof Pack (audit wyników PF) [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult
- Output: ProofPack P14 (ProofDocument: Audit rozpływu mocy)
- DoD:
  - [ ] Dowód bilansu węzła dla mocy czynnej i biernej z mapowaniem do TraceArtifact.

    $$
    \sum P = 0,\quad \sum Q = 0
    $$

  - [ ] Bilans gałęzi dla mocy czynnej i biernej uwzględnia straty oraz spadek napięcia.

    $$
    P_{in} \rightarrow P_{out} + P_{loss},\quad Q_{in} \rightarrow Q_{out} + \Delta U
    $$

  - [ ] Straty linii liczone jawnie z prądu i rezystancji.

    $$
    P_{loss} = I^{2} \cdot R
    $$

  - [ ] Porównanie counterfactual Case A vs Case B z raportem różnic.

    $$
    \Delta P,\ \Delta Q,\ \Delta U
    $$

### TODO-P15-001 (PLANNED) — P15: Load Currents & Overload Proof Pack [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult, Catalog
- Output: ProofPack P15 (ProofDocument: Prądy robocze i przeciążenia)
- DoD:
  - [ ] Prądy obciążenia linii/kabli wyprowadzone z mocy pozornej.

    $$
    I = \frac{S}{\sqrt{3} \cdot U}
    $$

  - [ ] Porównanie do prądu znamionowego z marginesem procentowym i statusem PASS/FAIL.
  - [ ] Transformator: relacja obciążenia do mocy znamionowej i overload %.

    $$
    \frac{S}{S_n}
    $$

### TODO-P16-001 (PLANNED) — P16: Losses & Energy Proof Pack [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, PowerFlowResult, Catalog
- Output: ProofPack P16 (ProofDocument: Straty mocy i energii)
- DoD:
  - [ ] Straty linii wyprowadzone z prądu i rezystancji.

    $$
    P_{loss,line} = I^{2} \cdot R
    $$

  - [ ] Straty transformatora z danych katalogowych: suma P0 i Pk.

    $$
    P_{loss,trafo} = P_{0} + P_{k}
    $$

  - [ ] Energia strat z profilu obciążenia (integracja w czasie).

    $$
    E_{loss} = \int P_{loss} \, dt
    $$

### TODO-P19-001 (PLANNED) — P19: Earthing / Ground Fault Proof Pack (SN) [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, Catalog
- Output: ProofPack P19 (ProofDocument: Doziemienia / uziemienia SN)
- DoD:
  - [ ] Jeśli SN: prądy doziemne z uwzględnieniem impedancji uziemienia i rozdziału prądu.
  - [ ] Tryb uproszczonych napięć dotykowych z wyraźnymi zastrzeżeniami.
  - [ ] Terminologia w ProofDocument: 1F-Z, 2F, 2F-Z oraz PCC – punkt wspólnego przyłączenia.
