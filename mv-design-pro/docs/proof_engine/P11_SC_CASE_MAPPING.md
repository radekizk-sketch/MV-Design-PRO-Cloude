# P11: Mapowanie Case zwarciowych na ProofDocument (CANONICAL)

**Status:** CANONICAL (BINDING)
**Wersja:** 1.0
**Data:** 2026-01-28
**Referencje:**
- `P11_OVERVIEW.md` — podstawy systemu P11 (TraceArtifact, inwarianty)
- `P11_1a_MVP_SC3F_AND_VDROP.md` — MVP zwarć 3F
- `P11_1c_SC_ASYMMETRICAL.md` — zwarcia niesymetryczne (2F, 1F)
- `P11_1d_PROOF_UI_EXPORT.md` — Proof Inspector (viewer)
- `EQUATIONS_IEC60909_SC3F.md` — rejestr równań IEC 60909
- `SLD_SHORT_CIRCUIT_BUS_CENTRIC.md` — prezentacja wyników zwarciowych
- `SHORT_CIRCUIT_PANELS_AND_PRINTING.md` — panele i wydruk

---

## 1. Cel i zakres dokumentu

Niniejszy dokument definiuje **wiążący kontrakt** dla mapowania Case zwarciowych na system P11 (White Box).

**Zasada fundamentalna:**

> Każda para **(BUS, Case)** generuje **osobny ProofDocument**.
> Każda liczba (`Ik″`, `ip`, `Ith`, `Sk″`) ma **trace_id** wskazujący na równanie i dane wejściowe.

Dokument jest **BINDING** dla:
- warstwy Solver (obliczenia zwarciowe IEC 60909),
- warstwy Analysis (generowanie ProofDocument),
- warstwy P11 (Proof Engine, Proof Inspector),
- warstwy UI (wyświetlanie trace_id w wynikach).

---

## 2. Terminologia (BINDING)

| Termin | Definicja | Przykład |
|--------|-----------|----------|
| **Case** | Przypadek obliczeniowy zwarciowy zgodny z IEC/PN-EN 60909 | MAX / MIN / N-1 |
| **ProofDocument** | Dokument dowodowy P11 zawierający: równanie + dane wejściowe + wynik + trace | Dowód dla `Ik″` w BUS B-02, Case MAX |
| **Trace ID** | Unikalny identyfikator dowodu dla konkretnej wartości wynikowej | `IEC60909_Ik_B02_MAX_abc123` |
| **Snapshot** | Stan sieci (NetworkModel + konfiguracja) w momencie obliczeń | Snapshot ID: `20260128T123045` |
| **Współczynnik napięciowy** `c` | Współczynnik do obliczenia napięcia ekwiwalentnego źródła (IEC 60909, Tabela 1) | `cmax = 1.10` (SN), `cmin = 1.00` (SN) |
| **Anti-double-counting** | Zasada: współczynnik `c` jest używany **dokładnie raz** (nie wielokrotnie) | `c` stosowany tylko do `Ueq`, nie do impedancji elementów |
| **Wkład** (contribution) | Udział poszczególnych elementów w prądzie zwarciowym w danym BUS | Wkład transformatora T-01 do `Ik″` w BUS B-02: 3.5 kA |

---

## 3. Reguła podstawowa: jeden ProofDocument = jeden (BUS, Case)

### 3.1 Definicja

**CANONICAL:**

Każda para **(BUS, Case)** generuje **osobny ProofDocument** w systemie P11.

**Równanie:**

```
ProofDocument_ID = f(BUS_ID, Case_Name, Snapshot_ID)
```

Gdzie:
- `BUS_ID` — identyfikator szyny (np. `B-02`),
- `Case_Name` — nazwa Case (np. `MAX`, `MIN`, `N-1: T-01`),
- `Snapshot_ID` — identyfikator stanu sieci (np. `20260128T123045`).

### 3.2 Uzasadnienie

**Dlaczego osobny ProofDocument dla każdego (BUS, Case)?**

1. **Różne dane wejściowe:**
   - Case MAX: wszystkie źródła aktywne, `c = cmax`,
   - Case MIN: minimalna liczba źródeł, `c = cmin`,
   - Case N-1: jeden element wyłączony.

2. **Różne równania:**
   - Współczynnik `c` różny dla MAX i MIN,
   - Wkłady elementów różne dla każdego Case.

3. **Śledzalność:**
   - Użytkownik musi wiedzieć, z jakiego Case pochodzi wynik.
   - Proof Inspector pokazuje **dokładnie ten Case**, który był aktywny.

### 3.3 Przykład

**Sieć:**
- BUS: B-01, B-02, B-03
- Case: MAX, MIN, N-1

**ProofDocuments:**

| ProofDocument ID | BUS | Case | Wynik |
|------------------|-----|------|-------|
| `SC_B-01_MAX_20260128T123045` | B-01 | MAX | `Ik″ = 12.5 kA` |
| `SC_B-01_MIN_20260128T123045` | B-01 | MIN | `Ik″ = 8.2 kA` |
| `SC_B-01_N-1_20260128T123045` | B-01 | N-1 | `Ik″ = 10.3 kA` |
| `SC_B-02_MAX_20260128T123045` | B-02 | MAX | `Ik″ = 10.8 kA` |
| `SC_B-02_MIN_20260128T123045` | B-02 | MIN | `Ik″ = 6.5 kA` |
| `SC_B-02_N-1_20260128T123045` | B-02 | N-1 | `Ik″ = 9.1 kA` |
| `SC_B-03_MAX_20260128T123045` | B-03 | MAX | `Ik″ = 9.2 kA` |
| `SC_B-03_MIN_20260128T123045` | B-03 | MIN | `Ik″ = 5.1 kA` |
| `SC_B-03_N-1_20260128T123045` | B-03 | N-1 | `Ik″ = 7.8 kA` |

**Suma:** 9 ProofDocuments (3 BUS × 3 Case).

---

## 4. Struktura ProofDocument dla zwarcia

### 4.1 Schema JSON (CANONICAL)

**BINDING:**

ProofDocument dla zwarcia **musi** być zgodny z następującym schematem:

```json
{
  "proof_id": "SC_B-02_MAX_20260128T123045",
  "proof_type": "SHORT_CIRCUIT",
  "standard": "IEC60909-0:2016",
  "bus_id": "B-02",
  "bus_name": "Szyna SN-01",
  "case": {
    "name": "MAX",
    "description": "Maksymalny prąd zwarciowy (wszystkie źródła aktywne)",
    "fault_type": "3F",
    "voltage_factor_c": 1.10
  },
  "snapshot": {
    "snapshot_id": "20260128T123045",
    "network_hash": "abc123def456...",
    "timestamp": "2026-01-28T12:30:45Z"
  },
  "results": {
    "Ik_biprim": {
      "value": 12.5,
      "unit": "kA",
      "trace_id": "IEC60909_Ik_B02_MAX_abc123",
      "equation_ref": "EQUATIONS_IEC60909_SC3F.md#Ik_biprim"
    },
    "ip": {
      "value": 32.8,
      "unit": "kA",
      "trace_id": "IEC60909_ip_B02_MAX_def456",
      "equation_ref": "EQUATIONS_IEC60909_SC3F.md#ip"
    },
    "Ith": {
      "value": 11.2,
      "unit": "kA",
      "trace_id": "IEC60909_Ith_B02_MAX_ghi789",
      "equation_ref": "EQUATIONS_IEC60909_SC3F.md#Ith"
    },
    "Sk_biprim": {
      "value": 325.0,
      "unit": "MVA",
      "trace_id": "IEC60909_Sk_B02_MAX_jkl012",
      "equation_ref": "EQUATIONS_IEC60909_SC3F.md#Sk_biprim"
    }
  },
  "contributions": [
    {
      "element_id": "GRID-01",
      "element_type": "Source",
      "element_name": "Sieć zewnętrzna",
      "contribution_kA": 5.8,
      "contribution_percent": 46.4,
      "trace_id": "IEC60909_contrib_GRID01_B02_MAX_mno345"
    },
    {
      "element_id": "T-01",
      "element_type": "TransformerBranch",
      "element_name": "Transformator T-01",
      "contribution_kA": 3.5,
      "contribution_percent": 28.0,
      "trace_id": "IEC60909_contrib_T01_B02_MAX_pqr678"
    },
    {
      "element_id": "PV-01",
      "element_type": "Source",
      "element_name": "PV-01",
      "contribution_kA": 1.2,
      "contribution_percent": 9.6,
      "trace_id": "IEC60909_contrib_PV01_B02_MAX_stu901"
    }
  ],
  "input_data": {
    "Un_kV": 15.0,
    "c": 1.10,
    "Ueq_kV": 9.526,
    "impedances": [
      {
        "element_id": "GRID-01",
        "Z_ohm": 0.248,
        "R_ohm": 0.124,
        "X_ohm": 0.215
      },
      {
        "element_id": "T-01",
        "Z_ohm": 0.512,
        "R_ohm": 0.051,
        "X_ohm": 0.509
      }
    ]
  },
  "equations": [
    {
      "eq_id": "IEC60909_Ik_biprim",
      "eq_latex": "I_k'' = \\frac{c \\cdot U_n}{\\sqrt{3} \\cdot Z_{eq}}",
      "eq_ref": "EQUATIONS_IEC60909_SC3F.md#Ik_biprim"
    },
    {
      "eq_id": "IEC60909_ip",
      "eq_latex": "i_p = \\kappa \\cdot \\sqrt{2} \\cdot I_k''",
      "eq_ref": "EQUATIONS_IEC60909_SC3F.md#ip"
    }
  ],
  "metadata": {
    "computed_by": "MV-DESIGN-PRO v1.0",
    "computed_at": "2026-01-28T12:30:45Z",
    "user": "Jan Kowalski",
    "project_id": "Elektrownia_PV_XYZ"
  }
}
```

### 4.2 Pola obowiązkowe (MUST)

**BINDING:**

| Pole | Typ | Opis | Przykład |
|------|-----|------|----------|
| `proof_id` | string | Unikalny identyfikator ProofDocument | `SC_B-02_MAX_20260128T123045` |
| `proof_type` | string | Typ dowodu (zawsze `SHORT_CIRCUIT` dla zwarć) | `SHORT_CIRCUIT` |
| `standard` | string | Norma obliczeń | `IEC60909-0:2016` |
| `bus_id` | string | Identyfikator BUS | `B-02` |
| `case.name` | string | Nazwa Case | `MAX` / `MIN` / `N-1` |
| `case.fault_type` | string | Typ zwarcia | `3F` / `2F` / `1F` |
| `case.voltage_factor_c` | float | Współczynnik napięciowy `c` | `1.10` |
| `snapshot.snapshot_id` | string | Identyfikator snapshot | `20260128T123045` |
| `results.Ik_biprim.value` | float | Prąd zwarciowy początkowy [kA] | `12.5` |
| `results.Ik_biprim.trace_id` | string | Trace ID dla `Ik″` | `IEC60909_Ik_B02_MAX_abc123` |
| `contributions[]` | array | Tablica wkładów elementów | `[{...}, {...}]` |
| `input_data` | object | Dane wejściowe (Un, c, impedancje) | `{...}` |
| `equations[]` | array | Tablica równań użytych w obliczeniach | `[{...}, {...}]` |

### 4.3 Trace ID: format i generowanie

**CANONICAL:**

Format **trace_id**:

```
[standard]_[wielkość]_[bus_id]_[case]_[hash]
```

Przykład:

```
IEC60909_Ik_B02_MAX_abc123
```

Gdzie:
- `IEC60909` — norma,
- `Ik` — wielkość (Ik, ip, Ith, Sk),
- `B02` — identyfikator BUS,
- `MAX` — nazwa Case,
- `abc123` — hash (pierwsze 6 znaków hash snapshot + dane wejściowe).

**Generowanie hash:**

```python
import hashlib

def generate_trace_id(standard, quantity, bus_id, case_name, input_data):
    data_str = f"{standard}_{quantity}_{bus_id}_{case_name}_{input_data}"
    hash_hex = hashlib.sha256(data_str.encode()).hexdigest()
    short_hash = hash_hex[:6]
    return f"{standard}_{quantity}_{bus_id}_{case_name}_{short_hash}"
```

---

## 5. Współczynnik napięciowy `c`: anti-double-counting

### 5.1 Reguła podstawowa

**CANONICAL:**

Współczynnik napięciowy `c` jest używany **dokładnie raz** w obliczeniach zwarciowych:

```
Ueq = c · Un / √3
```

**FORBIDDEN:**

- Wielokrotne stosowanie `c` w różnych etapach obliczeń (błąd mnożenia).
- Stosowanie `c` do impedancji elementów sieci (linii, transformatorów).
- Stosowanie `c` do źródeł konwerterowych (PV, WIND, BESS) — te źródła mają ograniczony prąd zwarciowy niezależny od `c`.

### 5.2 Miejsce użycia `c` w ProofDocument

**MUST:**

W ProofDocument, pole `input_data.c` zawiera wartość współczynnika `c` **użytą dokładnie raz** do obliczenia `Ueq`:

```json
{
  "input_data": {
    "Un_kV": 15.0,
    "c": 1.10,
    "Ueq_kV": 9.526,  // Ueq = c · Un / √3 = 1.10 · 15.0 / √3 = 9.526 kV
    "impedances": [
      {
        "element_id": "GRID-01",
        "Z_ohm": 0.248,  // Z bez mnożenia przez c
        "R_ohm": 0.124,
        "X_ohm": 0.215
      }
    ]
  }
}
```

**INVARIANT:**

```
Ueq = c · Un / √3
Ik″ = Ueq / Zeq
```

**NEVER:**

```
Ik″ = c · Un / (√3 · Zeq)  // błąd: c stosowane bezpośrednio do Ik″
Ik″ = c · (Un / (√3 · c · Zeq))  // błąd: c dwukrotnie (double-counting)
```

### 5.3 Trace dla współczynnika `c`

**MUST:**

Współczynnik `c` **musi** mieć swój własny trace (dowód, że użyta wartość jest zgodna z IEC 60909):

```json
{
  "equations": [
    {
      "eq_id": "IEC60909_voltage_factor_c",
      "eq_latex": "c = c_{max} = 1.10 \\text{ (dla SN, IEC 60909 Tabela 1)}",
      "eq_ref": "EQUATIONS_IEC60909_SC3F.md#voltage_factor_c",
      "trace_id": "IEC60909_c_MAX_B02_xyz789"
    }
  ]
}
```

---

## 6. Wkłady do zwarcia (contributions)

### 6.1 Definicja wkładu w P11

**CANONICAL:**

Każdy element sieci (źródło, transformator, linia) wnosi swój **wkład** do prądu zwarciowego w danym BUS.

**Równanie:**

```
Ik″(BUS) = ∑ contributions(i)
           i=1..N
```

### 6.2 Struktura wkładu w ProofDocument

**MUST:**

Każdy wkład w ProofDocument **musi** zawierać:

| Pole | Typ | Opis | Przykład |
|------|-----|------|----------|
| `element_id` | string | Identyfikator elementu | `T-01` |
| `element_type` | string | Typ elementu | `TransformerBranch` |
| `element_name` | string | Nazwa elementu | `Transformator T-01` |
| `contribution_kA` | float | Wkład [kA] | `3.5` |
| `contribution_percent` | float | Udział [%] | `28.0` |
| `trace_id` | string | Trace ID dla wkładu | `IEC60909_contrib_T01_B02_MAX_pqr678` |

### 6.3 Suma wkładów = `Ik″`

**INVARIANT:**

```
∑ contributions[i].contribution_kA = results.Ik_biprim.value
```

**Przykład:**

```json
{
  "results": {
    "Ik_biprim": {
      "value": 12.5
    }
  },
  "contributions": [
    {"contribution_kA": 5.8},
    {"contribution_kA": 3.5},
    {"contribution_kA": 1.2},
    {"contribution_kA": 0.8},
    {"contribution_kA": 1.2}
  ]
}

// Suma: 5.8 + 3.5 + 1.2 + 0.8 + 1.2 = 12.5 ✓
```

**MUST:**

System **musi** weryfikować niezmiennik przy generowaniu ProofDocument. Jeśli suma ≠ `Ik″` → błąd generowania dowodu.

### 6.4 Trace dla wkładów

**MUST:**

Każdy wkład **musi** mieć swój własny trace (dowód, jak został obliczony):

```json
{
  "trace_id": "IEC60909_contrib_T01_B02_MAX_pqr678",
  "equation_ref": "EQUATIONS_IEC60909_SC3F.md#contribution_transformer",
  "input_data": {
    "transformer_id": "T-01",
    "Sn_MVA": 1.6,
    "uk_percent": 6.0,
    "Un1_kV": 15.0,
    "Un2_kV": 0.4,
    "Zt_ohm": 0.512
  },
  "result": {
    "contribution_kA": 3.5
  }
}
```

---

## 7. Snapshot: deterministyczność obliczeń

### 7.1 Definicja Snapshot

**CANONICAL:**

**Snapshot** to niezmutowalny stan sieci (NetworkModel + konfiguracja) w momencie obliczeń.

**MUST:**

Snapshot **musi** zawierać:

| Pole | Typ | Opis | Przykład |
|------|-----|------|----------|
| `snapshot_id` | string | Unikalny identyfikator snapshot | `20260128T123045` |
| `network_hash` | string | Hash sieci (SHA-256) | `abc123def456...` |
| `timestamp` | string (ISO 8601) | Data i godzina snapshot | `2026-01-28T12:30:45Z` |

### 7.2 Hash sieci (network_hash)

**CANONICAL:**

Hash sieci jest obliczany z:

1. **Topologia:** wszystkie BUS, LineBranch, TransformerBranch, Source, Load, Switch,
2. **Parametry:** R, X, B, Sn, Un, uk, długości, przekroje,
3. **Stan:** `in_service` dla każdego elementu,
4. **Konfiguracja Case:** nazwa Case, elementy wyłączone (N-1), wartość `c`.

**Algorytm:**

```python
import hashlib
import json

def compute_network_hash(network_model, case_config):
    data = {
        "buses": [bus.to_dict() for bus in network_model.buses],
        "branches": [branch.to_dict() for branch in network_model.branches],
        "sources": [source.to_dict() for source in network_model.sources],
        "case": case_config.to_dict()
    }
    json_str = json.dumps(data, sort_keys=True)
    hash_hex = hashlib.sha256(json_str.encode()).hexdigest()
    return hash_hex
```

### 7.3 Deterministyczność

**CANONICAL:**

> Identyczny snapshot (network_hash) + identyczny Case **MUSI** generować identyczny ProofDocument.

**INVARIANT:**

```
ProofDocument(snapshot_A, Case_X) = ProofDocument(snapshot_A, Case_X)
```

**MUST:**

- Kolejność elementów w snapshot jest deterministyczna (sortowanie alfabetyczne).
- Hash jest obliczany z pełnego stanu sieci (nie skrócony).
- Jeśli użytkownik zmieni choćby jeden parametr (np. długość linii) → nowy snapshot → nowy ProofDocument.

---

## 8. Integracja z Proof Inspector

### 8.1 Proof Inspector: viewer (read-only)

**Referencja:** `P11_1d_PROOF_UI_EXPORT.md`

**CANONICAL:**

**Proof Inspector** to narzędzie UI do przeglądania ProofDocument (read-only, nie edytor).

**Użytkownik może:**

1. **Kliknąć trace_id** w UI (np. w panelu wyników) → otworzyć Proof Inspector.
2. **Zobaczyć:**
   - Równanie (LaTeX),
   - Dane wejściowe,
   - Wynik,
   - Wkłady (contributions),
   - Snapshot ID.
3. **Eksportować:**
   - JSON (pełny ProofDocument),
   - LaTeX (równania + dane),
   - PDF (raport dowodu),
   - DOCX (edytowalny raport).

**Użytkownik NIE MOŻE:**

- Edytować ProofDocument (read-only).
- Zmienić wyników (wyniki są niezmienne).

### 8.2 Link do Proof Inspector w UI

**MUST:**

UI **musi** pokazywać link do Proof Inspector przy każdej wartości wynikowej:

```
┌───────────────────────────────────────────────────────────┐
│ BUS B-02 | Case MAX                                        │
│ ───────────────────────────────────────────────────────── │
│ Ik″ = 12.5 kA  [🔍 Dowód]                                 │
│ ip  = 32.8 kA  [🔍 Dowód]                                 │
│ Ith = 11.2 kA  [🔍 Dowód]                                 │
│ Sk″ = 325 MVA  [🔍 Dowód]                                 │
└───────────────────────────────────────────────────────────┘
```

**Kliknięcie [🔍 Dowód]:**

1. Otwiera Proof Inspector,
2. Pokazuje ProofDocument dla tego konkretnego (BUS, Case, wielkość).

### 8.3 Link do Proof Inspector w PDF

**ALLOWED:**

Wydruk (PDF/DOCX) **może** zawierać link do Proof Inspector:

```
┌───────────────────────────────────────────────────────────┐
│ Ik″ = 12.5 kA                                              │
│ Trace: IEC60909_Ik_B02_MAX_abc123                         │
│ [Link do dowodu: https://mv-design-pro.local/proof/...]   │
└───────────────────────────────────────────────────────────┘
```

**MUST:**

- Link jest **opcjonalny** (nie wszystkie projekty wymagają dowodów).
- Link jest **dostępny** tylko jeśli P11 jest aktywny (Proof Engine włączony).

---

## 9. Równania IEC 60909: rejestr kanoniczny

### 9.1 Referencja

**BINDING:**

Wszystkie równania użyte w obliczeniach zwarciowych **muszą** być zdefiniowane w:

- `EQUATIONS_IEC60909_SC3F.md` — równania dla zwarć 3F,
- `EQUATIONS_IEC60909_SC2F.md` — równania dla zwarć 2F (przyszłość),
- `EQUATIONS_IEC60909_SC1F.md` — równania dla zwarć 1F (przyszłość).

### 9.2 Przykład: równanie dla `Ik″`

**Referencja:** `EQUATIONS_IEC60909_SC3F.md#Ik_biprim`

**Równanie:**

```latex
I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot Z_{eq}}
```

Gdzie:
- `c` — współczynnik napięciowy (IEC 60909, Tabela 1),
- `Un` — napięcie znamionowe sieci [kV],
- `Zeq` — impedancja zastępcza w punkcie zwarcia [Ω].

**W ProofDocument:**

```json
{
  "equations": [
    {
      "eq_id": "IEC60909_Ik_biprim",
      "eq_latex": "I_k'' = \\frac{c \\cdot U_n}{\\sqrt{3} \\cdot Z_{eq}}",
      "eq_ref": "EQUATIONS_IEC60909_SC3F.md#Ik_biprim",
      "trace_id": "IEC60909_Ik_B02_MAX_abc123"
    }
  ]
}
```

### 9.3 Przykład: równanie dla `ip`

**Referencja:** `EQUATIONS_IEC60909_SC3F.md#ip`

**Równanie:**

```latex
i_p = \kappa \cdot \sqrt{2} \cdot I_k''
```

Gdzie:
- `κ` — współczynnik udarowy (zależy od R/X),
- `Ik″` — prąd zwarciowy początkowy [kA].

**W ProofDocument:**

```json
{
  "equations": [
    {
      "eq_id": "IEC60909_ip",
      "eq_latex": "i_p = \\kappa \\cdot \\sqrt{2} \\cdot I_k''",
      "eq_ref": "EQUATIONS_IEC60909_SC3F.md#ip",
      "trace_id": "IEC60909_ip_B02_MAX_def456"
    }
  ]
}
```

---

## 10. Przykład kompletny: ProofDocument dla BUS B-02, Case MAX

**Kompletny JSON (skrócony):**

```json
{
  "proof_id": "SC_B-02_MAX_20260128T123045",
  "proof_type": "SHORT_CIRCUIT",
  "standard": "IEC60909-0:2016",
  "bus_id": "B-02",
  "bus_name": "Szyna SN-01",
  "case": {
    "name": "MAX",
    "description": "Maksymalny prąd zwarciowy",
    "fault_type": "3F",
    "voltage_factor_c": 1.10
  },
  "snapshot": {
    "snapshot_id": "20260128T123045",
    "network_hash": "abc123def456789...",
    "timestamp": "2026-01-28T12:30:45Z"
  },
  "results": {
    "Ik_biprim": {
      "value": 12.5,
      "unit": "kA",
      "trace_id": "IEC60909_Ik_B02_MAX_abc123"
    },
    "ip": {
      "value": 32.8,
      "unit": "kA",
      "trace_id": "IEC60909_ip_B02_MAX_def456"
    },
    "Ith": {
      "value": 11.2,
      "unit": "kA",
      "trace_id": "IEC60909_Ith_B02_MAX_ghi789"
    },
    "Sk_biprim": {
      "value": 325.0,
      "unit": "MVA",
      "trace_id": "IEC60909_Sk_B02_MAX_jkl012"
    }
  },
  "contributions": [
    {
      "element_id": "GRID-01",
      "element_type": "Source",
      "contribution_kA": 5.8,
      "contribution_percent": 46.4,
      "trace_id": "IEC60909_contrib_GRID01_B02_MAX_mno345"
    },
    {
      "element_id": "T-01",
      "element_type": "TransformerBranch",
      "contribution_kA": 3.5,
      "contribution_percent": 28.0,
      "trace_id": "IEC60909_contrib_T01_B02_MAX_pqr678"
    }
  ],
  "input_data": {
    "Un_kV": 15.0,
    "c": 1.10,
    "Ueq_kV": 9.526,
    "impedances": [
      {"element_id": "GRID-01", "Z_ohm": 0.248},
      {"element_id": "T-01", "Z_ohm": 0.512}
    ]
  },
  "equations": [
    {
      "eq_id": "IEC60909_Ik_biprim",
      "eq_latex": "I_k'' = \\frac{c \\cdot U_n}{\\sqrt{3} \\cdot Z_{eq}}"
    },
    {
      "eq_id": "IEC60909_ip",
      "eq_latex": "i_p = \\kappa \\cdot \\sqrt{2} \\cdot I_k''"
    }
  ],
  "metadata": {
    "computed_by": "MV-DESIGN-PRO v1.0",
    "computed_at": "2026-01-28T12:30:45Z",
    "user": "Jan Kowalski"
  }
}
```

---

## 11. Podsumowanie reguł (checklist)

**Implementacja zgodna z P11_SC_CASE_MAPPING, jeśli:**

- [ ] Każda para **(BUS, Case)** generuje **osobny ProofDocument**.
- [ ] Każda wartość (`Ik″`, `ip`, `Ith`, `Sk″`) ma **trace_id**.
- [ ] Współczynnik `c` jest używany **dokładnie raz** (anti-double-counting).
- [ ] Wkłady (contributions) sumują się do `Ik″` (niezmiennik).
- [ ] Snapshot zawiera: `snapshot_id`, `network_hash`, `timestamp`.
- [ ] Hash sieci jest deterministyczny (identyczny stan → identyczny hash).
- [ ] Równania są referencyjne do `EQUATIONS_IEC60909_SC3F.md`.
- [ ] Proof Inspector pokazuje ProofDocument (read-only).
- [ ] Link do Proof Inspector jest dostępny w UI i PDF (opcjonalnie).

---

**KONIEC DOKUMENTU P11_SC_CASE_MAPPING.md**
**Status:** CANONICAL (BINDING)
**Dokument jest źródłem prawdy dla mapowania Case zwarciowych na P11 w MV-DESIGN-PRO.**
