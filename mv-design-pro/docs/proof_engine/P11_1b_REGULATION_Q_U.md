# P11.1b — Dowód algorytmu regulatora Q(U), cosφ(P)

**STATUS: REFERENCE (prospektywny)**
**Version:** 1.1
**Reference:** P11_OVERVIEW.md, PROOF_SCHEMAS.md

---

## 0. Relacja do Proof Pack P11

### 0.1 Pozycja w hierarchii

$$
\boxed{
\begin{aligned}
&\textbf{P11 (OVERVIEW)} \to \textbf{P11.1b (REGULATION Q\_U)} \\[6pt]
&\text{Dokument rozszerza zakres P11 o dowody regulacji napięcia:} \\
&\quad \text{• Q(U) — regulacja mocy biernej w funkcji napięcia} \\
&\quad \text{• cosφ(P) — regulacja współczynnika mocy w funkcji mocy czynnej} \\
&\quad \text{• Counterfactual Proof — porównanie Case A vs Case B}
\end{aligned}
}
$$

### 0.2 Wejścia i wyjścia

| Kierunek | Źródło / Cel | Opis |
|----------|--------------|------|
| **Wejście** | `WhiteBoxTrace` | Wyniki power flow (U, P, Q) |
| **Wejście** | `SolverConfig` | Charakterystyki Q(U), cosφ(P) |
| **Wejście** | `NetworkSnapshot` | Impedancje sieci (X, R) |
| **Wyjście** | `ProofDocument` | Dowód regulacji z krokami |
| **Wyjście** | `CounterfactualProof` | Dowód porównawczy Case A vs B |

### 0.3 Relacja do solvera

$$
\boxed{
\textbf{INTERPRETATION-ONLY:} \quad \text{Ten dokument NIE zmienia solvera. Definiuje format dowodu regulacji.}
}
$$

---

## 1. Cel i zakres

### 1.1 Definicja

Dowód algorytmu regulatora obejmuje formalną prezentację:
- Charakterystyki Q(U) — regulacja mocy biernej w funkcji napięcia
- Charakterystyki cosφ(P) — regulacja współczynnika mocy w funkcji mocy czynnej
- Wpływu regulacji na spadki/wzrosty napięć w sieci

### 1.2 Zastosowanie

| Przypadek użycia | Opis |
|------------------|------|
| **Źródła PV/BESS** | Inwertory z funkcją regulacji napięcia |
| **Regulatory Q(U)** | Kompensacja mocy biernej zależna od napięcia |
| **Counterfactual** | Porównanie Case A vs Case B (różna nastawa) |

---

## 2. Charakterystyka Q(U) — definicja

### 2.1 Parametry charakterystyki

```python
@dataclass(frozen=True)
class QUCharacteristic:
    """
    Charakterystyka Q(U) regulatora.
    """
    # Punkty charakterystyki
    u1_pu: float    # dolna granica martwej strefy (np. 0.97)
    u2_pu: float    # górna granica martwej strefy (np. 1.03)
    u_min_pu: float # napięcie przy Q_max (indukcyjne, np. 0.92)
    u_max_pu: float # napięcie przy Q_min (pojemnościowe, np. 1.08)

    # Limity mocy biernej
    q_max_ind_pu: float  # max moc bierna indukcyjna (dodatnia, np. 0.44)
    q_max_cap_pu: float  # max moc bierna pojemnościowa (ujemna, np. -0.44)

    # Baza
    s_rated_mva: float   # moc znamionowa inwertora

    def compute_q(self, u_pu: float) -> float:
        """
        Oblicz Q dla danego napięcia U.
        """
        ...
```

### 2.2 Równanie Q(U) (BINDING)

**ID równania:** `EQ_QU_001`

$$
Q(U) = \begin{cases}
Q_{max,ind} & \text{dla } U \leq U_{min} \\
Q_{max,ind} \cdot \frac{U_1 - U}{U_1 - U_{min}} & \text{dla } U_{min} < U < U_1 \\
0 & \text{dla } U_1 \leq U \leq U_2 \\
Q_{max,cap} \cdot \frac{U - U_2}{U_{max} - U_2} & \text{dla } U_2 < U < U_{max} \\
Q_{max,cap} & \text{dla } U \geq U_{max}
\end{cases}
$$

### 2.3 Mapping keys dla Q(U)

| Symbol | Mapping key | Jednostka | Opis |
|--------|-------------|-----------|------|
| $U$ | `u_pu` | p.u. | Napięcie w punkcie przyłączenia |
| $U_1$ | `u1_pu` | p.u. | Dolna granica martwej strefy |
| $U_2$ | `u2_pu` | p.u. | Górna granica martwej strefy |
| $U_{min}$ | `u_min_pu` | p.u. | Napięcie przy Q_max indukcyjne |
| $U_{max}$ | `u_max_pu` | p.u. | Napięcie przy Q_max pojemnościowe |
| $Q_{max,ind}$ | `q_max_ind_pu` | p.u. | Max Q indukcyjne |
| $Q_{max,cap}$ | `q_max_cap_pu` | p.u. | Max Q pojemnościowe |
| $Q$ | `q_regulated_pu` | p.u. | Wynikowa moc bierna |

---

## 3. Charakterystyka cosφ(P) — definicja

### 3.1 Parametry charakterystyki

```python
@dataclass(frozen=True)
class CosPhi_PCharacteristic:
    """
    Charakterystyka cosφ(P) regulatora.
    """
    # Punkty charakterystyki
    p_start_pu: float    # początek regulacji (np. 0.5)
    p_rated_pu: float    # moc znamionowa (1.0)

    # Limity cosφ
    cos_phi_min: float   # min cosφ (np. 0.9 indukcyjny)
    cos_phi_rated: float # cosφ przy P=0 (np. 1.0)

    # Baza
    s_rated_mva: float   # moc znamionowa inwertora
```

### 3.2 Równanie cosφ(P) (BINDING)

**ID równania:** `EQ_COSPHI_001`

$$
\cos\varphi(P) = \begin{cases}
1{,}0 & \text{dla } P \leq P_{start} \\
1{,}0 - (1{,}0 - \cos\varphi_{min}) \cdot \frac{P - P_{start}}{P_{rated} - P_{start}} & \text{dla } P > P_{start}
\end{cases}
$$

### 3.3 Mapping keys dla cosφ(P)

| Symbol | Mapping key | Jednostka | Opis |
|--------|-------------|-----------|------|
| $P$ | `p_pu` | p.u. | Moc czynna generowana |
| $P_{start}$ | `p_start_pu` | p.u. | Początek regulacji |
| $P_{rated}$ | `p_rated_pu` | p.u. | Moc znamionowa |
| $\cos\varphi_{min}$ | `cos_phi_min` | — | Minimalny cosφ |
| $\cos\varphi$ | `cos_phi_regulated` | — | Wynikowy cosφ |

---

## 4. Wpływ regulacji na ΔU

### 4.1 Równanie wpływu Q na ΔU (BINDING)

**ID równania:** `EQ_QU_003`

$$
\Delta U_Q = \frac{X \cdot Q}{U_n^2} \cdot 100\%
$$

Gdzie:

$$
\begin{aligned}
&X \text{ — reaktancja linii/transformatora } [\Omega] \\
&Q \text{ — moc bierna (dodatnia = indukcyjna, ujemna = pojemnościowa) } [\text{Mvar}] \\
&U_n \text{ — napięcie znamionowe } [\text{kV}]
\end{aligned}
$$

### 4.2 Mapping keys dla wpływu na ΔU

| Symbol | Mapping key | Jednostka | Opis |
|--------|-------------|-----------|------|
| $X$ | `x_ohm` | Ω | Reaktancja do BoundaryNode |
| $Q$ | `q_regulated_mvar` | Mvar | Moc bierna po regulacji |
| $U_n$ | `u_n_kv` | kV | Napięcie znamionowe |
| $\Delta U_Q$ | `delta_u_q_percent` | % | Zmiana napięcia od Q |

---

## 5. Counterfactual Proof (Case A vs Case B)

### 5.1 Definicja

**Counterfactual Proof** porównuje dwa przypadki różniące się JEDNYM parametrem:

```python
@dataclass(frozen=True)
class CounterfactualProof:
    """
    Dowód porównawczy Case A vs Case B.
    """
    case_a: ProofDocument
    case_b: ProofDocument

    # Różnica w konfiguracji
    diff_parameter: str         # np. "u2_pu"
    diff_value_a: float         # wartość w Case A
    diff_value_b: float         # wartość w Case B

    # Różnica w wynikach
    result_diff: Dict[str, float]  # np. {"delta_u_percent": -0.5}

    # Wniosek
    conclusion_pl: str          # "Zmiana U2 z 1.03 na 1.05 zmniejszyła ΔU o 0.5%"
```

### 5.2 Kroki dowodu counterfactual

| Nr | Krok | Opis |
|----|------|------|
| 1 | Identyfikacja różnicy | Który parametr się różni? |
| 2 | Obliczenie Case A | Pełny dowód dla Case A |
| 3 | Obliczenie Case B | Pełny dowód dla Case B |
| 4 | Porównanie wyników | Różnica w ΔU, Q, cosφ |
| 5 | Wniosek | Interpretacja wpływu zmiany |

### 5.3 Przykład counterfactual

```yaml
scenario: "Wpływ zmiany U2 na napięcie w sieci"
case_a:
  name: "Nastawa domyślna"
  u2_pu: 1.03
  result:
    u_connection_node_pu: 1.045
    delta_u_percent: 4.5

case_b:
  name: "Nastawa rozszerzona"
  u2_pu: 1.05
  result:
    u_connection_node_pu: 1.040
    delta_u_percent: 4.0

conclusion_pl: |
  Rozszerzenie martwej strefy Q(U) z U2=1.03 do U2=1.05
  spowodowało wcześniejsze włączenie regulacji pojemnościowej,
  co obniżyło napięcie w BoundaryNode o 0.5% (z 104.5% do 104.0%).
```

---

## 6. Kroki dowodu regulacji Q(U)

### 6.1 Lista kroków

| Nr | Krok | Równanie | Wynik |
|----|------|----------|-------|
| 1 | Odczyt napięcia U | — | $U$ [p.u.] |
| 2 | Określenie strefy pracy | — | DEAD_ZONE / INDUCTIVE / CAPACITIVE |
| 3 | Obliczenie Q z charakterystyki | `EQ_QU_001` | $Q$ [p.u.] |
| 4 | Przeliczenie Q na Mvar | `EQ_QU_002` | $Q$ [Mvar] |
| 5 | Obliczenie wpływu na ΔU | `EQ_QU_003` | $\Delta U_Q$ [%] |
| 6 | Nowe napięcie po regulacji | `EQ_QU_004` | $U'$ [p.u.] |

### 6.2 Mapping keys dla dowodu Q(U)

| Krok | Input keys | Output key |
|------|------------|------------|
| 1 | `u_pu` | — |
| 2 | `u1_pu`, `u2_pu`, `u_min_pu`, `u_max_pu` | `regulation_zone` |
| 3 | `u_pu`, `q_max_ind_pu`, `q_max_cap_pu` | `q_regulated_pu` |
| 4 | `q_regulated_pu`, `s_rated_mva` | `q_regulated_mvar` |
| 5 | `x_ohm`, `q_regulated_mvar`, `u_n_kv` | `delta_u_q_percent` |
| 6 | `u_pu`, `delta_u_q_percent` | `u_new_pu` |

---

## 7. Definition of Done (DoD)

### 7.1 P11.1b — DoD

| Kryterium | Status |
|-----------|--------|
| Charakterystyka Q(U) zdefiniowana z wszystkimi parametrami | SPEC |
| Charakterystyka cosφ(P) zdefiniowana z wszystkimi parametrami | SPEC |
| Równanie wpływu Q na ΔU udokumentowane | SPEC |
| Counterfactual Proof zdefiniowany | SPEC |
| Kroki dowodu Q(U) z mapping keys | SPEC |
| Przykład counterfactual udokumentowany | SPEC |

---

## 8. Rejestr równań (prospektywny)

| ID | Nazwa | LaTeX | Status |
|----|-------|-------|--------|
| `EQ_QU_001` | Q z charakterystyki Q(U) | (patrz § 2.2) | SPEC |
| `EQ_QU_002` | Przeliczenie Q [p.u.] → [Mvar] | $Q_{Mvar} = Q_{pu} \cdot S_{rated}$ | SPEC |
| `EQ_QU_003` | Wpływ Q na ΔU | $\Delta U_Q = \frac{X \cdot Q}{U_n^2}$ | SPEC |
| `EQ_QU_004` | Nowe napięcie po regulacji | $U' = U + \Delta U_Q$ | SPEC |
| `EQ_COSPHI_001` | cosφ z charakterystyki | (patrz § 3.2) | SPEC |

---

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
  - [ ] Terminologia w ProofDocument: 1F-Z, 2F, 2F-Z oraz BoundaryNode – węzeł przyłączenia.

**END OF P11.1b**
