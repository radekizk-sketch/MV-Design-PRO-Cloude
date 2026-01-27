# P11 — White Box / Trace Inspector (dowodowy)

**STATUS: CANONICAL & BINDING**
**Version:** 1.0
**Reference:** SYSTEM_SPEC.md § 5, ARCHITECTURE.md § 6

---

## 1. Cel i zakres

### 1.1 Definicja

**Trace Inspector** (pol. „Ślad obliczeń") to komponent warstwy interpretacji, który:
- Prezentuje użytkownikowi pełny ślad obliczeń solvera
- Umożliwia ręczną weryfikację każdego kroku
- Generuje formalny dowód matematyczny (ProofDocument)

### 1.2 Czym NIE jest Trace Inspector

| NIE jest | Uzasadnienie |
|----------|--------------|
| Solverem | Nie wykonuje obliczeń fizycznych |
| Modyfikatorem wyników | Nie zmienia wartości z WhiteBoxTrace |
| Walidatorem normatywnym | Nie ocenia zgodności z limitami (to Analysis) |

---

## 2. TraceArtifact — definicja

### 2.1 Struktura

```python
@dataclass(frozen=True)
class TraceArtifact:
    """
    Niezmienialny artefakt śladu obliczeń.
    Przypięty do konkretnego uruchomienia solvera.
    """
    # Identyfikacja
    artifact_id: UUID
    project_id: UUID
    case_id: UUID
    run_id: UUID
    snapshot_id: UUID

    # Metadane
    solver_type: str          # "IEC60909_SC3F" | "POWER_FLOW_NR" | ...
    created_at: datetime
    solver_version: str

    # Zawartość
    input_snapshot: NetworkSnapshot    # zamrożony stan sieci
    solver_config: Dict[str, Any]      # parametry solvera (c_max, fault_type, ...)
    intermediate_values: Dict[str, Any]  # wartości pośrednie z WhiteBoxTrace
    output_results: Dict[str, Any]     # wyniki końcowe

    # Dowód (OBOWIĄZKOWY dla pełnego audytu, generowany przez ProofEngine)
    proof_document: ProofDocument
```

### 2.2 Inwarianty TraceArtifact

| Inwariant | Opis |
|-----------|------|
| **IMMUTABLE** | Po utworzeniu TraceArtifact nie może być modyfikowany |
| **DETERMINISTIC** | Ten sam run_id zawsze produkuje identyczny artifact |
| **COMPLETE** | Zawiera WSZYSTKIE wartości pośrednie z solvera |
| **TRACEABLE** | Każda wartość ma jednoznaczny klucz (mapping key) |

### 2.3 Mapping keys (BINDING)

Nazwy kluczy w `intermediate_values` i `output_results` są literalne i niezmienne:

```python
# Przykład dla IEC 60909 SC3F
intermediate_values = {
    "z_source_ohm": complex,           # impedancja źródła
    "z_thevenin_ohm": complex,         # impedancja Thevenina
    "c_factor": float,                 # współczynnik napięciowy
    "kappa": float,                    # współczynnik udaru
    "m_n": float,                      # współczynnik termiczny
}

output_results = {
    "ikss_ka": float,                  # prąd zwarciowy początkowy
    "ip_ka": float,                    # prąd udarowy
    "ith_ka": float,                   # prąd cieplny
    "sk_mva": float,                   # moc zwarciowa
}
```

---

## 3. Minimalny zakres trace (BINDING)

### 3.1 Wymagane kategorie danych

| Kategoria | Opis | Przykład |
|-----------|------|----------|
| **Wejścia** | Dane wejściowe solvera | `u_n_kv`, `s_rated_mva`, `r_ohm_per_km` |
| **Wartości pośrednie** | Wyniki kroków pośrednich | `z_thevenin_ohm`, `y_bus_matrix` |
| **Przepływy** | Moce i prądy w gałęziach | `p_mw`, `q_mvar`, `i_ka` |
| **Ścieżki** | Topologia użyta w obliczeniach | `fault_path_buses`, `contributing_sources` |
| **Limity** | Wartości odniesienia (jeśli dotyczy) | `i_rated_ka`, `u_min_pu`, `u_max_pu` |

### 3.2 Obowiązkowe pola dla SC3F

| Pole | Typ | Jednostka | Opis |
|------|-----|-----------|------|
| `fault_bus_id` | UUID | — | Szyna miejsca zwarcia |
| `u_n_kv` | float | kV | Napięcie znamionowe |
| `c_factor` | float | — | Współczynnik napięciowy (c_max lub c_min) |
| `z_source_ohm` | complex | Ω | Impedancja źródła |
| `z_thevenin_ohm` | complex | Ω | Impedancja zastępcza Thevenina |
| `ikss_ka` | float | kA | Początkowy prąd zwarciowy symetryczny |
| `ip_ka` | float | kA | Prąd udarowy (szczytowy) |
| `ith_ka` | float | kA | Prąd cieplny równoważny |
| `sk_mva` | float | MVA | Moc zwarciowa |
| `kappa` | float | — | Współczynnik udaru |

### 3.3 Obowiązkowe pola dla VDROP (spadki napięć)

| Pole | Typ | Jednostka | Opis |
|------|-----|-----------|------|
| `from_bus_id` | UUID | — | Szyna początkowa odcinka |
| `to_bus_id` | UUID | — | Szyna końcowa odcinka |
| `r_ohm` | float | Ω | Rezystancja odcinka |
| `x_ohm` | float | Ω | Reaktancja odcinka |
| `p_mw` | float | MW | Moc czynna przepływająca |
| `q_mvar` | float | Mvar | Moc bierna przepływająca |
| `delta_u_percent` | float | % | Spadek napięcia na odcinku |
| `delta_u_total_percent` | float | % | Sumaryczny spadek napięcia od źródła |

---

## 4. Przypięcie do struktury projektu

### 4.1 Hierarchia

```
Project
  └── StudyCase
        └── CalculationRun
              ├── NetworkSnapshot (input)
              ├── SolverResult (output)
              └── TraceArtifact (audit)
                    └── ProofDocument (optional)
```

### 4.2 Relacje (BINDING)

| Relacja | Kardynalność | Opis |
|---------|--------------|------|
| Project → StudyCase | 1:N | Projekt ma wiele przypadków |
| StudyCase → CalculationRun | 1:N | Przypadek ma wiele uruchomień |
| CalculationRun → TraceArtifact | 1:1 | Uruchomienie ma dokładnie jeden artefakt |
| TraceArtifact → ProofDocument | 1:0..1 | Artefakt może mieć wygenerowany dowód |

---

## 5. UX: „Ślad obliczeń" w interfejsie

### 5.1 Lokalizacja w UI

```
Results (Wyniki)
  └── [Wybrany Case]
        └── [Wybrany Run]
              ├── Wyniki (tabela)
              ├── Ślad obliczeń (read-only)  ← TUTAJ
              └── Dowód matematyczny (read-only, jeśli wygenerowany)
```

### 5.2 Widok „Ślad obliczeń"

| Sekcja | Zawartość |
|--------|-----------|
| **Nagłówek** | Run ID, Data, Solver, Wersja |
| **Dane wejściowe** | Parametry sieci i solvera (read-only) |
| **Kroki obliczeń** | Lista kroków z wartościami pośrednimi |
| **Wyniki** | Wartości końcowe |

### 5.3 Tryb read-only (BINDING)

**Widok „Ślad obliczeń" jest ZAWSZE read-only.**

| Akcja | Dozwolona |
|-------|-----------|
| Przeglądanie wartości | TAK |
| Kopiowanie wartości | TAK |
| Eksport (JSON/CSV) | TAK |
| Edycja wartości | **NIE** |
| Ponowne obliczenie | **NIE** (wymaga nowego Run) |

---

## 6. Integracja z Proof Engine

### 6.1 Pipeline generowania dowodu

```
TraceArtifact
      │
      ▼
ProofEngine.generate(artifact)
      │
      ├── 1. Pobierz równania z Equation Registry
      ├── 2. Mapuj wartości z trace na symbole
      ├── 3. Wygeneruj podstawienia
      ├── 4. Oblicz weryfikację jednostek
      ├── 5. Zbuduj ProofDocument
      │
      ▼
ProofDocument (JSON + LaTeX)
```

### 6.2 Trigger generowania

| Trigger | Opis |
|---------|------|
| **Automatyczny** | Po każdym pomyślnym CalculationRun (ZALECANY) |
| **Na żądanie** | Użytkownik klika „Wygeneruj dowód" |
| **Batch** | Administrator generuje dowody dla wielu Run |

---

## 7. Definition of Done (DoD)

### 7.1 P11 Overview — DoD

| Kryterium | Status |
|-----------|--------|
| TraceArtifact zdefiniowany jako frozen dataclass | SPEC |
| Mapping keys dla SC3F i VDROP udokumentowane | SPEC |
| UI „Ślad obliczeń" opisany (read-only) | SPEC |
| Pipeline integracji z ProofEngine opisany | SPEC |
| Hierarchia Project → Case → Run → Artifact opisana | SPEC |

---

## 8. Testy determinism (BINDING)

### 8.1 Test identyczności TraceArtifact

```python
def test_trace_artifact_determinism():
    """
    Ten sam NetworkSnapshot + SolverConfig → identyczny TraceArtifact.
    """
    snapshot = create_test_snapshot()
    config = {"fault_type": "THREE_PHASE", "c_max": 1.1}

    artifact_1 = run_solver_and_get_artifact(snapshot, config)
    artifact_2 = run_solver_and_get_artifact(snapshot, config)

    assert artifact_1.intermediate_values == artifact_2.intermediate_values
    assert artifact_1.output_results == artifact_2.output_results
```

### 8.2 Test stabilności mapping keys

```python
def test_mapping_keys_stable():
    """
    Nazwy kluczy w trace są stabilne między wersjami.
    """
    artifact = run_solver_and_get_artifact(...)

    # Klucze MUSZĄ istnieć
    assert "z_thevenin_ohm" in artifact.intermediate_values
    assert "ikss_ka" in artifact.output_results
    assert "kappa" in artifact.intermediate_values
```

---

**END OF P11 OVERVIEW**
