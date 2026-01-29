# P17 — Energia strat (profil czasowy)

**STATUS: CANONICAL & BINDING**
**Version:** 1.0
**Reference:** P11_OVERVIEW.md, PROOF_SCHEMAS.md

---

## 1. Definicja P17

P17 definiuje formalny dowód matematyczny energii strat dla linii, kabli,
transformatorów lub agregatu strat. Dowód opiera się na profilu czasowym mocy
strat i zapewnia deterministyczną, audytowalną prezentację obliczeń.

Zakres obejmuje:
- dyskretną sumę energii strat na bazie profilu czasowego,
- wariant stały dla jednej wartości mocy strat i czasu trwania,
- weryfikację jednostek oraz pełną transparentność.

Nie obejmuje:
- modyfikacji solverów lub Result API,
- klasyfikacji PASS/FAIL,
- interpretacji normowej.

---

## 2. Kroki dowodu (BINDING)

Kolejność kroków jest stała i deterministyczna:

$$
\begin{array}{|c|l|l|l|}
\hline
\textbf{Nr} & \textbf{Krok} & \textbf{Równanie} & \textbf{Wynik} \\
\hline
1 & \text{Krok czasowy profilu} & \text{EQ\_LE\_001} & \Delta t_i \\
2 & \text{Energia w kroku} & \text{EQ\_LE\_002} & E_i \\
3 & \text{Suma energii strat} & \text{EQ\_LE\_003} & E_{loss} \\
4 & \text{Wariant stały} & \text{EQ\_LE\_004} & E_{loss} \\
\hline
\end{array}
$$

Uwagi:
- Dla profilu dyskretnego używa się kroków 1–3.
- Dla wariantu stałego używa się wyłącznie kroku 4.

---

## 3. Równania (FULL MATH)

Krok czasowy:

$$
\Delta t_i = t_{i} - t_{i-1}
$$

Energia w kroku:

$$
E_i = P_{loss,i}\cdot \Delta t_i
$$

Suma energii:

$$
E_{loss}=\sum_i E_i
$$

Wariant stały:

$$
E_{loss}=P_{loss}\cdot t
$$

---

## 4. Jednostki (BINDING)

Jednostki i derywacje:

$$
\begin{aligned}
&P_{loss} \; \text{kW}, \quad t \; \text{h}, \quad E \; \text{kWh} \\
&\text{kW} \cdot \text{h} = \text{kWh}
\end{aligned}
$$

---

## 5. Mapping Keys (BINDING)

Lista kluczy mapowania używanych w P17:

```
project_name
case_name
run_timestamp
solver_version
target_kind
target_id
t_h
p_loss_kw
delta_t_h
e_i_kwh
e_loss_kwh
```

---

## 6. Determinizm

Ten sam zestaw danych wejściowych musi generować identyczny rezultat w formatach
`proof.json` oraz `proof.tex`.
