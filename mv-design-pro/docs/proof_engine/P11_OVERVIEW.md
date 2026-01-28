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

## TODO — Proof Packs P14–P17 (FUTURE PACKS)

### P14 — Proof Audit & Coverage (DOC ONLY, META)

P14 definiuje **kanoniczną warstwę audytu** kompletności i pokrycia Proof Packów
oraz stanowi **prerequisite** dla P15–P17. Dokument P14 nie dodaje obliczeń
i nie zmienia solverów ani Proof Engine.

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

### TODO-P17-001 (PLANNED) — P17: Earthing / Ground Fault Proof Pack (SN) [FUTURE PACK]
- Priority: MUST
- Inputs: TraceArtifact, Catalog
- Output: ProofPack P17 (ProofDocument: Doziemienia / uziemienia SN)
- DoD:
  - [ ] Jeśli SN: prądy doziemne z uwzględnieniem impedancji uziemienia i rozdziału prądu.
  - [ ] Tryb uproszczonych napięć dotykowych z wyraźnymi zastrzeżeniami.
  - [ ] Terminologia w ProofDocument: 1F-Z, 2F, 2F-Z oraz PCC – punkt wspólnego przyłączenia.

**END OF P11 OVERVIEW**
