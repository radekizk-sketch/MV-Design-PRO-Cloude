# P15 — Prądy robocze i przeciążenia (Load Currents & Overload)

**STATUS: CANONICAL & BINDING**
**Version:** 1.0
**Reference:** P11_OVERVIEW.md, PROOF_SCHEMAS.md

---

## 1. Definicja P15

P15 definiuje formalny dowód matematyczny prądów roboczych oraz obciążeń linii,
kabli i transformatorów na podstawie danych wejściowych z warstwy interpretacji.
Dowód ma charakter audytowalny i deterministyczny.

Zakres obejmuje:
- obliczenie mocy pozornej,
- obliczenie prądu roboczego w układzie trójfazowym,
- obciążenie prądowe i margines prądowy (linie/kable),
- obciążenie transformatora i margines (transformatory).

Nie obejmuje:
- oceny normowej,
- klasyfikacji PASS/FAIL,
- modyfikacji solverów.

---

## 2. Kroki dowodu (BINDING)

Kolejność kroków jest stała i deterministyczna:

$$
\begin{array}{|c|l|l|l|}
\hline
\textbf{Nr} & \textbf{Krok} & \textbf{Równanie} & \textbf{Wynik} \\
\hline
1 & \text{Moc pozorna} & \text{EQ\_LC\_001} & S \\
2 & \text{Prąd roboczy 3-f} & \text{EQ\_LC\_002} & I \\
3 & \text{Procent obciążenia prądowego} & \text{EQ\_LC\_003} & k_I \\
4 & \text{Margines prądowy} & \text{EQ\_LC\_004} & m_I \\
5 & \text{Obciążenie transformatora} & \text{EQ\_LC\_005} & k_S \\
6 & \text{Margines transformatora} & \text{EQ\_LC\_006} & m_S \\
\hline
\end{array}
$$

Uwagi:
- Dla linii/kabla wymagane są kroki 1–4.
- Dla transformatora wymagane są kroki 1, 5, 6.
- Krok 2 może być dodany opcjonalnie dla transformatora.

---

## 3. Równania (FULL MATH)

Moc pozorna:

$$
S = \sqrt{P^{2} + Q^{2}}
$$

Prąd roboczy trójfazowy:

$$
I = \frac{S}{\sqrt{3}\,U_{LL}}
$$

Procent obciążenia prądowego:

$$
k_I = 100\cdot\frac{I}{I_n}
$$

Margines prądowy:

$$
m_I = 100\cdot\left(\frac{I_n}{I}-1\right)
$$

Obciążenie transformatora:

$$
k_S = 100\cdot\frac{S}{S_n}
$$

Margines transformatora:

$$
m_S = 100\cdot\left(\frac{S_n}{S}-1\right)
$$

Uwaga deterministyczna:
- Dla przypadku zerowego prądu roboczego przyjmuje się wynik
  marginesu jako wartość dodatniej nieskończoności w formie tekstowej.

---

## 4. Jednostki (BINDING)

Jednostki i derywacje:

$$
\begin{aligned}
&P \; \text{MW}, \quad Q \; \text{Mvar}, \quad S \; \text{MVA} \\
&U_{LL} \; \text{kV}, \quad I \; \text{kA}, \quad I_n \; \text{A} \\
&k_I \; \%, \quad m_I \; \% \\
&S_n \; \text{MVA}, \quad k_S \; \%, \quad m_S \; \%
\end{aligned}
$$

Uwaga:
- Prąd znamionowy jest wejściowo w A i przeliczany na kA dla spójności
  w równaniach procentowych.

## 5. Mapping Keys (BINDING)

Lista kluczy mapowania używanych w P15:

```
project_name
case_name
run_timestamp
target_id
element_kind
u_ll_kv
p_mw
q_mvar
s_mva
i_ka
in_a
k_i_percent
m_i_percent
sn_mva
k_s_percent
m_s_percent
```

---

## 6. Zakazy interpretacji (BINDING)

- Brak oceny normowej i brak statusów PASS/FAIL.
- Brak modyfikacji solverów lub Result API.
- Brak ukrytych korekt lub heurystyk.

---

## 7. Determinizm

Ten sam zestaw danych wejściowych musi generować identyczny rezultat w formatach
`proof.json` oraz `proof.tex`.
