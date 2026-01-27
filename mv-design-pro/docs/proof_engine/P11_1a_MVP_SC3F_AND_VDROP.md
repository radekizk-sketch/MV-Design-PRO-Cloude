# P11.1a (MVP) — SC3F IEC60909 + Spadki/Wzrosty Napięć (VDROP)

**STATUS: CANONICAL & BINDING**
**Version:** 1.0
**Reference:** P11_OVERVIEW.md, PROOF_SCHEMAS.md, EQUATIONS_IEC60909_SC3F.md, EQUATIONS_VDROP.md

---

## 1. Cel MVP

### 1.1 Zakres P11.1a

| W zakresie | Poza zakresem |
|------------|---------------|
| SC3F (zwarcie trójfazowe) IEC 60909 | Zwarcia niesymetryczne (1F, 2F, 2FG) |
| Spadki/wzrosty napięć (VDROP) | Regulatory Q(U), cosφ(P) |
| ProofDocument JSON + LaTeX | UI Proof Inspector (tylko kontrakt) |
| Weryfikacja jednostek | Eksport PDF/DOCX |

### 1.2 Cel biznesowy

Umożliwienie generowania **formalnego dowodu matematycznego** dla:
1. Obliczeń zwarciowych trójfazowych wg IEC 60909
2. Obliczeń spadków napięć w sieci SN/nN

Dowód musi być:
- **Kompletny** — każdy krok ma wzór, dane, podstawienie, wynik
- **Weryfikowalny** — jednostki sprawdzone automatycznie
- **Deterministyczny** — ten sam run → identyczny dowód

---

## 2. ProofDocument — definicja

### 2.1 Struktura główna

```python
@dataclass(frozen=True)
class ProofDocument:
    """
    Dokument dowodowy dla pojedynczego uruchomienia solvera.
    """
    # Identyfikacja
    document_id: UUID
    artifact_id: UUID          # powiązanie z TraceArtifact
    created_at: datetime

    # Metadane
    proof_type: str            # "SC3F_IEC60909" | "VDROP" | ...
    title_pl: str              # "Dowód obliczeń zwarciowych IEC 60909"

    # Zawartość
    header: ProofHeader
    steps: Tuple[ProofStep, ...]
    summary: ProofSummary

    # Eksport
    json_representation: str   # serializacja JSON
    latex_representation: str  # kod LaTeX
```

### 2.2 ProofHeader

```python
@dataclass(frozen=True)
class ProofHeader:
    """
    Nagłówek dokumentu dowodowego.
    """
    project_name: str
    case_name: str
    run_timestamp: datetime
    solver_version: str

    # Parametry główne (zależne od typu dowodu)
    fault_location: str | None      # dla SC3F
    fault_type: str | None          # dla SC3F
    voltage_factor: float | None    # dla SC3F
    source_bus: str | None          # dla VDROP
    target_bus: str | None          # dla VDROP
```

### 2.3 ProofSummary

```python
@dataclass(frozen=True)
class ProofSummary:
    """
    Podsumowanie wyników dowodu.
    """
    key_results: Dict[str, ProofValue]  # główne wyniki z jednostkami
    unit_check_passed: bool             # czy wszystkie jednostki OK
    total_steps: int
    warnings: Tuple[str, ...]           # ostrzeżenia (jeśli są)
```

---

## 3. ProofStep — definicja

### 3.1 Struktura kroku dowodu

```python
@dataclass(frozen=True)
class ProofStep:
    """
    Pojedynczy krok w łańcuchu dowodowym.
    Format: Wzór → Dane → Podstawienie → Wynik → Weryfikacja jednostek
    """
    step_id: str                    # unikalny identyfikator kroku
    step_number: int                # numer porządkowy (1, 2, 3, ...)
    title_pl: str                   # tytuł po polsku

    # Wzór
    equation: EquationDefinition    # definicja równania z rejestru

    # Dane wejściowe
    input_values: Tuple[ProofValue, ...]

    # Podstawienie
    substitution_latex: str         # wzór z podstawionymi wartościami

    # Wynik
    result: ProofValue

    # Weryfikacja jednostek
    unit_check: UnitCheckResult

    # Mapping do źródła
    source_keys: Dict[str, str]     # mapping: symbol → klucz w trace/result
```

### 3.2 ProofValue

```python
@dataclass(frozen=True)
class ProofValue:
    """
    Wartość z jednostką i formatowaniem.
    """
    symbol: str                 # symbol matematyczny (np. "I_k''")
    value: float | complex      # wartość numeryczna
    unit: str                   # jednostka (np. "kA")
    formatted: str              # sformatowana wartość (np. "12.45 kA")
    source_key: str             # klucz w trace/result (np. "ikss_ka")
```

### 3.3 UnitCheckResult

```python
@dataclass(frozen=True)
class UnitCheckResult:
    """
    Wynik weryfikacji spójności jednostek.
    """
    passed: bool
    expected_unit: str
    computed_unit: str
    input_units: Dict[str, str]    # jednostki wejść
    derivation: str                # ścieżka derywacji (np. "V / Ω = A")
```

---

## 4. Kroki dowodu SC3F (BINDING)

### 4.1 Lista kroków

| Nr | Krok | Równanie | Wynik |
|----|------|----------|-------|
| 1 | Napięcie znamionowe z współczynnikiem c | `EQ_SC3F_001` | $c \cdot U_n$ |
| 2 | Impedancja źródła | `EQ_SC3F_002` | $Z_Q$ |
| 3 | Impedancja Thevenina | `EQ_SC3F_003` | $Z_{th}$ |
| 4 | Początkowy prąd zwarciowy | `EQ_SC3F_004` | $I_k''$ |
| 5 | Współczynnik udaru κ | `EQ_SC3F_005` | $\kappa$ |
| 6 | Prąd udarowy | `EQ_SC3F_006` | $i_p$ |
| 7 | Moc zwarciowa | `EQ_SC3F_007` | $S_k''$ |
| 8 | (Opcjonalnie) Prąd cieplny | `EQ_SC3F_008` | $I_{th}$ |

### 4.2 Szczegóły kroków

#### Krok 1: Napięcie znamionowe z współczynnikiem c

```yaml
step_id: SC3F_STEP_001
title_pl: "Napięcie znamionowe z współczynnikiem napięciowym"
equation_id: EQ_SC3F_001
input_values:
  - symbol: "c"
    source_key: "c_factor"
  - symbol: "U_n"
    source_key: "u_n_kv"
result:
  symbol: "c·U_n"
  unit: "kV"
```

#### Krok 2: Impedancja źródła

```yaml
step_id: SC3F_STEP_002
title_pl: "Impedancja źródła (sieć zasilająca)"
equation_id: EQ_SC3F_002
input_values:
  - symbol: "U_n"
    source_key: "u_n_kv"
  - symbol: "S_k''"
    source_key: "sk_source_mva"
  - symbol: "R/X"
    source_key: "rx_ratio"
result:
  symbol: "Z_Q"
  unit: "Ω"
```

#### Krok 3: Impedancja Thevenina

```yaml
step_id: SC3F_STEP_003
title_pl: "Impedancja zastępcza Thevenina w miejscu zwarcia"
equation_id: EQ_SC3F_003
input_values:
  - symbol: "Z_Q"
    source_key: "z_source_ohm"
  - symbol: "Z_T"
    source_key: "z_transformer_ohm"
  - symbol: "Z_L"
    source_key: "z_line_ohm"
result:
  symbol: "Z_th"
  unit: "Ω"
```

#### Krok 4: Początkowy prąd zwarciowy

```yaml
step_id: SC3F_STEP_004
title_pl: "Początkowy prąd zwarciowy symetryczny"
equation_id: EQ_SC3F_004
input_values:
  - symbol: "c"
    source_key: "c_factor"
  - symbol: "U_n"
    source_key: "u_n_kv"
  - symbol: "Z_th"
    source_key: "z_thevenin_ohm"
result:
  symbol: "I_k''"
  unit: "kA"
  source_key: "ikss_ka"
```

#### Krok 5: Współczynnik udaru

```yaml
step_id: SC3F_STEP_005
title_pl: "Współczynnik udaru κ"
equation_id: EQ_SC3F_005
input_values:
  - symbol: "R_th"
    source_key: "r_thevenin_ohm"
  - symbol: "X_th"
    source_key: "x_thevenin_ohm"
result:
  symbol: "κ"
  unit: "—"
  source_key: "kappa"
```

#### Krok 6: Prąd udarowy

```yaml
step_id: SC3F_STEP_006
title_pl: "Prąd udarowy (szczytowy)"
equation_id: EQ_SC3F_006
input_values:
  - symbol: "κ"
    source_key: "kappa"
  - symbol: "I_k''"
    source_key: "ikss_ka"
result:
  symbol: "i_p"
  unit: "kA"
  source_key: "ip_ka"
```

#### Krok 7: Moc zwarciowa

```yaml
step_id: SC3F_STEP_007
title_pl: "Moc zwarciowa początkowa"
equation_id: EQ_SC3F_007
input_values:
  - symbol: "U_n"
    source_key: "u_n_kv"
  - symbol: "I_k''"
    source_key: "ikss_ka"
result:
  symbol: "S_k''"
  unit: "MVA"
  source_key: "sk_mva"
```

---

## 5. Kroki dowodu VDROP (BINDING)

### 5.1 Lista kroków

| Nr | Krok | Równanie | Wynik |
|----|------|----------|-------|
| 1 | Rezystancja odcinka | `EQ_VDROP_001` | $R$ |
| 2 | Reaktancja odcinka | `EQ_VDROP_002` | $X$ |
| 3 | Składowa czynna spadku | `EQ_VDROP_003` | $\Delta U_R$ |
| 4 | Składowa bierna spadku | `EQ_VDROP_004` | $\Delta U_X$ |
| 5 | Spadek napięcia na odcinku | `EQ_VDROP_005` | $\Delta U$ |
| 6 | Suma spadków (od źródła) | `EQ_VDROP_006` | $\Delta U_{total}$ |

### 5.2 Szczegóły kroków

#### Krok 1: Rezystancja odcinka

```yaml
step_id: VDROP_STEP_001
title_pl: "Rezystancja odcinka linii/kabla"
equation_id: EQ_VDROP_001
input_values:
  - symbol: "r"
    source_key: "r_ohm_per_km"
  - symbol: "l"
    source_key: "length_km"
result:
  symbol: "R"
  unit: "Ω"
  source_key: "r_ohm"
```

#### Krok 2: Reaktancja odcinka

```yaml
step_id: VDROP_STEP_002
title_pl: "Reaktancja odcinka linii/kabla"
equation_id: EQ_VDROP_002
input_values:
  - symbol: "x"
    source_key: "x_ohm_per_km"
  - symbol: "l"
    source_key: "length_km"
result:
  symbol: "X"
  unit: "Ω"
  source_key: "x_ohm"
```

#### Krok 3: Składowa czynna spadku

```yaml
step_id: VDROP_STEP_003
title_pl: "Składowa czynna spadku napięcia (R·P)"
equation_id: EQ_VDROP_003
input_values:
  - symbol: "R"
    source_key: "r_ohm"
  - symbol: "P"
    source_key: "p_mw"
  - symbol: "U_n"
    source_key: "u_n_kv"
result:
  symbol: "ΔU_R"
  unit: "%"
```

#### Krok 4: Składowa bierna spadku

```yaml
step_id: VDROP_STEP_004
title_pl: "Składowa bierna spadku napięcia (X·Q)"
equation_id: EQ_VDROP_004
input_values:
  - symbol: "X"
    source_key: "x_ohm"
  - symbol: "Q"
    source_key: "q_mvar"
  - symbol: "U_n"
    source_key: "u_n_kv"
result:
  symbol: "ΔU_X"
  unit: "%"
```

#### Krok 5: Spadek napięcia na odcinku

```yaml
step_id: VDROP_STEP_005
title_pl: "Całkowity spadek napięcia na odcinku"
equation_id: EQ_VDROP_005
input_values:
  - symbol: "ΔU_R"
    source_key: "delta_u_r_percent"
  - symbol: "ΔU_X"
    source_key: "delta_u_x_percent"
result:
  symbol: "ΔU"
  unit: "%"
  source_key: "delta_u_percent"
```

#### Krok 6: Suma spadków od źródła

```yaml
step_id: VDROP_STEP_006
title_pl: "Sumaryczny spadek napięcia od źródła do punktu"
equation_id: EQ_VDROP_006
input_values:
  - symbol: "ΔU_i"
    source_key: "delta_u_segments"  # lista spadków na odcinkach
result:
  symbol: "ΔU_total"
  unit: "%"
  source_key: "delta_u_total_percent"
```

---

## 6. Format wyjściowy

### 6.1 JSON (proof.json)

```json
{
  "document_id": "uuid",
  "artifact_id": "uuid",
  "proof_type": "SC3F_IEC60909",
  "title_pl": "Dowód obliczeń zwarciowych IEC 60909",
  "header": {
    "project_name": "Projekt SN-01",
    "case_name": "Zwarcie na szynie B2",
    "fault_location": "B2",
    "voltage_factor": 1.1
  },
  "steps": [
    {
      "step_id": "SC3F_STEP_004",
      "step_number": 4,
      "title_pl": "Początkowy prąd zwarciowy symetryczny",
      "equation": {
        "equation_id": "EQ_SC3F_004",
        "latex": "I_k'' = \\frac{c \\cdot U_n}{\\sqrt{3} \\cdot |Z_{th}|}"
      },
      "input_values": [
        {"symbol": "c", "value": 1.1, "unit": "—", "source_key": "c_factor"},
        {"symbol": "U_n", "value": 15.0, "unit": "kV", "source_key": "u_n_kv"},
        {"symbol": "Z_th", "value": "0.5+j2.0", "unit": "Ω", "source_key": "z_thevenin_ohm"}
      ],
      "substitution_latex": "I_k'' = \\frac{1.1 \\cdot 15.0}{\\sqrt{3} \\cdot 2.06}",
      "result": {
        "symbol": "I_k''",
        "value": 4.62,
        "unit": "kA",
        "source_key": "ikss_ka"
      },
      "unit_check": {
        "passed": true,
        "expected_unit": "kA",
        "computed_unit": "kA",
        "derivation": "kV / Ω = kA"
      }
    }
  ],
  "summary": {
    "key_results": {
      "ikss_ka": {"symbol": "I_k''", "value": 4.62, "unit": "kA"},
      "ip_ka": {"symbol": "i_p", "value": 11.76, "unit": "kA"},
      "sk_mva": {"symbol": "S_k''", "value": 120.0, "unit": "MVA"}
    },
    "unit_check_passed": true,
    "total_steps": 7
  }
}
```

### 6.2 LaTeX (proof.tex)

```latex
\documentclass{article}
\usepackage{amsmath}
\usepackage[polish]{babel}
\usepackage[utf8]{inputenc}

\title{Dowód obliczeń zwarciowych IEC 60909}
\author{MV-DESIGN-PRO}
\date{\today}

\begin{document}
\maketitle

\section{Dane wejściowe}
\begin{itemize}
  \item Miejsce zwarcia: B2
  \item Współczynnik napięciowy: $c = 1.1$
  \item Napięcie znamionowe: $U_n = 15.0\,\text{kV}$
\end{itemize}

\section{Krok 4: Początkowy prąd zwarciowy symetryczny}

\textbf{Wzór:}
\begin{equation}
I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_{th}|}
\end{equation}

\textbf{Dane:}
\begin{itemize}
  \item $c = 1.1$
  \item $U_n = 15.0\,\text{kV}$
  \item $Z_{th} = 0.5 + j2.0\,\Omega$, $|Z_{th}| = 2.06\,\Omega$
\end{itemize}

\textbf{Podstawienie:}
\begin{equation}
I_k'' = \frac{1.1 \cdot 15.0}{\sqrt{3} \cdot 2.06} = 4.62\,\text{kA}
\end{equation}

\textbf{Weryfikacja jednostek:}
$\frac{\text{kV}}{\Omega} = \text{kA}$ \checkmark

\section{Podsumowanie wyników}
\begin{tabular}{lll}
\hline
Wielkość & Wartość & Jednostka \\
\hline
$I_k''$ & 4.62 & kA \\
$i_p$ & 11.76 & kA \\
$S_k''$ & 120.0 & MVA \\
\hline
\end{tabular}

\end{document}
```

---

## 7. Determinism — testy (BINDING)

### 7.1 Test identyczności proof.json

```python
def test_proof_json_determinism():
    """
    Ten sam TraceArtifact → identyczny proof.json.
    """
    artifact = create_test_artifact()

    proof_1 = ProofEngine.generate(artifact)
    proof_2 = ProofEngine.generate(artifact)

    assert proof_1.json_representation == proof_2.json_representation
```

### 7.2 Test identyczności proof.tex

```python
def test_proof_tex_determinism():
    """
    Ten sam TraceArtifact → identyczny proof.tex.
    """
    artifact = create_test_artifact()

    proof_1 = ProofEngine.generate(artifact)
    proof_2 = ProofEngine.generate(artifact)

    assert proof_1.latex_representation == proof_2.latex_representation
```

### 7.3 Test stabilności kolejności kroków

```python
def test_proof_step_order_stable():
    """
    Kolejność kroków jest zawsze taka sama.
    """
    artifact = create_test_artifact()
    proof = ProofEngine.generate(artifact)

    step_ids = [s.step_id for s in proof.steps]
    expected = [
        "SC3F_STEP_001", "SC3F_STEP_002", "SC3F_STEP_003",
        "SC3F_STEP_004", "SC3F_STEP_005", "SC3F_STEP_006",
        "SC3F_STEP_007"
    ]

    assert step_ids == expected
```

---

## 8. Definition of Done (DoD)

### 8.1 P11.1a MVP — DoD

| Kryterium | Status |
|-----------|--------|
| ProofDocument zdefiniowany z wszystkimi polami | SPEC |
| ProofStep z formatem Wzór→Dane→Podstawienie→Wynik→Jednostki | SPEC |
| SC3F: 7-8 kroków dowodu z mapping keys | SPEC |
| VDROP: 6 kroków dowodu z mapping keys | SPEC |
| Format JSON (proof.json) udokumentowany | SPEC |
| Format LaTeX (proof.tex) udokumentowany | SPEC |
| Testy determinism zdefiniowane | SPEC |

---

**END OF P11.1a MVP**
