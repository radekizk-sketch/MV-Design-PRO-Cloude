# P32 — Load Flow i spadki napięć (Proof Pack)

**STATUS: BINDING**

## 1. Cel

Pakiet P32 dostarcza deterministyczny dowód wartości wynikowych Load Flow oraz spadków napięć w trybie post-hoc, bez ingerencji w solvery i API wyników.

## 2. Zakres

### 2.1. Sekcja BUS

Dowód obejmuje wartości napięcia rzeczywistego, napięcia znamionowego oraz odchyłek dla każdego BUS.

### 2.2. Sekcja elementów

Dowód obejmuje spadki napięć dla elementów typu linia, kabel i transformator, w tym rozbicie na składową rezystancyjną i reaktancyjną.

### 2.3. Format kroku dowodu

Każdy krok dowodu zachowuje kolejność: wzór, dane, podstawienie, wynik, weryfikacja jednostek.

## 3. Wejścia (read-only)

- PowerFlowResult
- TraceArtifact, jeśli dostępny
- Catalog (parametry rezystancji i reaktancji)
- Kontekst uruchomienia: nazwa projektu, nazwa przypadku, znacznik czasu uruchomienia, wersja solvera

## 4. Równania minimalne

$$
S=\sqrt{P^{2}+Q^{2}}
$$

$$
I=\frac{S}{\sqrt{3}\,U_{LL}}
$$

$$
\Delta U_{R}=\frac{R\cdot P}{U_{n}},\quad \Delta U_{X}=\frac{X\cdot Q}{U_{n}},\quad \Delta U=\Delta U_{R}+\Delta U_{X}
$$

$$
U_{pu}=\frac{U}{U_{n}}
$$

$$
\delta_{U}[\%]=100\cdot\frac{U-U_{n}}{U_{n}}
$$

## 5. Jednostki

$$
\text{kV},\;\text{MW},\;\text{Mvar},\;\text{MVA},\;\text{kA},\;\Omega,\;\%,\;\text{p.u.}
$$

## 6. Equation Registry i kolejność kroków

Identyfikatory równań P32 są stabilne i oznaczone prefiksem `EQ_LF_*`.

Kolejność kroków jest deterministyczna i zgodna z rejestrem:

- EQ_LF_001
- EQ_LF_002
- EQ_LF_003
- EQ_LF_004
- EQ_LF_005
- EQ_LF_006
- EQ_LF_007

## 7. NOT COMPUTED (BINDING)

Jeśli brakuje danych wejściowych wymaganych do obliczeń, sekcja otrzymuje status NOT COMPUTED wraz z opisem przyczyny i listą brakujących pól.

## 8. Determinizm

Dla identycznych danych wejściowych dowód generuje identyczny wynik w formacie JSON oraz LaTeX. Identyfikatory kroków i kolejność kroków są stałe.
