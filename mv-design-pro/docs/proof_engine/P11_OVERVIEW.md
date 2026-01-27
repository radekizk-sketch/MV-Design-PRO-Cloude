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

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Kategoria} & \textbf{Opis} & \textbf{Przykładowe mapping keys} \\
\hline
\textbf{Wejścia} & \text{Dane wejściowe solvera} & \texttt{u\_n\_kv}, \texttt{s\_rated\_mva} \\
\textbf{Wartości pośrednie} & \text{Wyniki kroków pośrednich} & \texttt{z\_thevenin\_ohm}, \texttt{y\_bus\_matrix} \\
\textbf{Przepływy} & \text{Moce i prądy w gałęziach} & \texttt{p\_mw}, \texttt{q\_mvar}, \texttt{i\_ka} \\
\textbf{Ścieżki} & \text{Topologia użyta w obliczeniach} & \texttt{fault\_path\_buses} \\
\textbf{Limity} & \text{Wartości odniesienia} & \texttt{i\_rated\_ka}, \texttt{u\_min\_pu} \\
\hline
\end{array}
$$

### 3.2 Obowiązkowe pola dla SC3F

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Pole (mapping key)} & \textbf{Typ} & \textbf{Jednostka} & \textbf{Opis} \\
\hline
\texttt{fault\_bus\_id} & \text{UUID} & — & \text{Szyna miejsca zwarcia} \\
\texttt{u\_n\_kv} & \text{float} & \text{kV} & \text{Napięcie znamionowe} \\
\texttt{c\_factor} & \text{float} & — & \text{Współczynnik napięciowy} \\
\texttt{z\_source\_ohm} & \text{complex} & \Omega & \text{Impedancja źródła} \\
\texttt{z\_thevenin\_ohm} & \text{complex} & \Omega & \text{Impedancja zastępcza Thevenina} \\
\texttt{ikss\_ka} & \text{float} & \text{kA} & \text{Początkowy prąd zwarciowy symetryczny } I_k'' \\
\texttt{ip\_ka} & \text{float} & \text{kA} & \text{Prąd udarowy (szczytowy) } i_p \\
\texttt{ith\_ka} & \text{float} & \text{kA} & \text{Prąd cieplny równoważny } I_{th} \\
\texttt{idyn\_ka} & \text{float} & \text{kA} & \text{Prąd dynamiczny } I_{dyn} \\
\texttt{sk\_mva} & \text{float} & \text{MVA} & \text{Moc zwarciowa } S_k'' \\
\texttt{kappa} & \text{float} & — & \text{Współczynnik udaru } \kappa \\
\hline
\end{array}
$$

### 3.3 Obowiązkowe pola dla VDROP (spadki napięć)

$$
\begin{array}{|l|l|l|l|}
\hline
\textbf{Pole (mapping key)} & \textbf{Typ} & \textbf{Jednostka} & \textbf{Opis} \\
\hline
\texttt{from\_bus\_id} & \text{UUID} & — & \text{Szyna początkowa odcinka} \\
\texttt{to\_bus\_id} & \text{UUID} & — & \text{Szyna końcowa odcinka} \\
\texttt{r\_ohm} & \text{float} & \Omega & \text{Rezystancja odcinka} \\
\texttt{x\_ohm} & \text{float} & \Omega & \text{Reaktancja odcinka} \\
\texttt{p\_mw} & \text{float} & \text{MW} & \text{Moc czynna przepływająca} \\
\texttt{q\_mvar} & \text{float} & \text{Mvar} & \text{Moc bierna przepływająca} \\
\texttt{delta\_u\_percent} & \text{float} & \% & \text{Spadek napięcia na odcinku} \\
\texttt{delta\_u\_total\_percent} & \text{float} & \% & \text{Sumaryczny spadek napięcia od źródła} \\
\hline
\end{array}
$$

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
                    └── ProofDocument (OBOWIĄZKOWY)
```

### 4.2 Relacje (BINDING)

$$
\begin{array}{|l|l|l|}
\hline
\textbf{Relacja} & \textbf{Kardynalność} & \textbf{Opis} \\
\hline
\text{Project} \to \text{StudyCase} & 1:N & \text{Projekt ma wiele przypadków} \\
\text{StudyCase} \to \text{CalculationRun} & 1:N & \text{Przypadek ma wiele uruchomień} \\
\text{CalculationRun} \to \text{TraceArtifact} & 1:1 & \text{Uruchomienie ma dokładnie jeden artefakt} \\
\text{TraceArtifact} \to \text{ProofDocument} & 1:1 & \text{Artefakt MA wygenerowany dowód} \\
\hline
\end{array}
$$

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
