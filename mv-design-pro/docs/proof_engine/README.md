# Proof Engine — Pakiet Kanoniczny

**STATUS: CANONICAL & BINDING**
**Reference:** SYSTEM_SPEC.md, ARCHITECTURE.md

---

## Przeznaczenie

Ten pakiet zawiera **kanoniczne źródła wiedzy** dla systemu dowodów matematycznych (Mathematical Proof Engine, MPE) w MV-DESIGN-PRO.

**Wszystkie agenty (Claude, Codex, inne LLM) MUSZĄ traktować zawartość tego pakietu jako BINDING REFERENCE.**

---

## Zawartość pakietu

| Dokument | Opis | Priorytet |
|----------|------|-----------|
| `P11_OVERVIEW.md` | Definicja TraceArtifact, inwarianty, przypięcie do Project/Case/Run | **BINDING** |
| `P11_1a_MVP_SC3F_AND_VDROP.md` | MVP: SC3F IEC60909 + spadki napięć (VDROP) | **BINDING** |
| `P11_1b_REGULATION_Q_U.md` | Dowód regulatora Q(U), cosφ(P) | REFERENCE |
| `P11_1c_SC_ASYMMETRICAL.md` | Składowe symetryczne, zwarcia niesymetryczne | REFERENCE |
| `P11_1d_PROOF_UI_EXPORT.md` | Proof Inspector UI, eksport LaTeX/PDF/DOCX | REFERENCE |
| `PROOF_SCHEMAS.md` | Kanoniczne schematy JSON (ProofDocument, ProofStep) | **BINDING** |
| `EQUATIONS_IEC60909_SC3F.md` | Rejestr równań SC3F z mapping keys | **BINDING** |
| `EQUATIONS_VDROP.md` | Rejestr równań VDROP z mapping keys | **BINDING** |

---

## Zasady użycia

### Dla agentów AI

1. **NIE INTERPRETUJ** — bierz dosłownie definicje, schematy JSON, równania LaTeX
2. **NIE MODYFIKUJ** solverów ani Result API IEC 60909
3. **UŻYWAJ mapping keys** literalnie przy implementacji
4. **ZACHOWAJ determinism** — identyczne wejścia → identyczne wyjścia

### Dla programistów

1. Proof Engine jest warstwą **interpretacji**, nie fizyki
2. Dane wejściowe: `WhiteBoxTrace` + `SolverResult`
3. Dane wyjściowe: `ProofDocument` (JSON + LaTeX)
4. Solver pozostaje niezmieniony — dowód jest generowany POST-HOC

---

## Terminologia (BINDING)

| Termin polski | Termin angielski | Definicja |
|---------------|------------------|-----------|
| Ślad obliczeń | Trace | Zapis kroków obliczeniowych z wartościami pośrednimi |
| Dowód matematyczny | Mathematical Proof | Formalna prezentacja: wzór → dane → podstawienie → wynik |
| Weryfikacja jednostek | Unit Check | Automatyczne sprawdzenie spójności wymiarowej |
| Krok dowodu | Proof Step | Pojedyncza operacja w łańcuchu dowodowym |
| Dokument dowodowy | Proof Document | Pełny artefakt dowodu dla danego uruchomienia |

---

## Powiązania z architekturą

```
┌─────────────────────────────────────────────────────────────┐
│                      SOLVER LAYER                            │
│  - IEC 60909 Short Circuit                                   │
│  - Newton-Raphson Power Flow                                 │
│  - WhiteBoxTrace (intermediate values)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ trace + result
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 INTERPRETATION LAYER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           PROOF ENGINE (P11)                         │    │
│  │  - ProofDocument generator                           │    │
│  │  - Equation Registry (SC3F, VDROP)                   │    │
│  │  - Unit verification                                 │    │
│  │  - LaTeX/JSON export                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│  - BoundaryIdentifier (PCC)                                  │
│  - Thermal Analysis                                          │
│  - Voltage Analysis                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Inwarianty (BINDING)

1. **Solver nietknięty** — Proof Engine NIE modyfikuje solverów ani Result API
2. **Determinism** — ten sam `run_id` → identyczny `proof.json` i `proof.tex`
3. **Czysta interpretacja** — dowód jest generowany z gotowych danych trace/result
4. **Kompletność** — każdy krok dowodu ma: wzór, dane, podstawienie, wynik, weryfikację jednostek
5. **Traceability** — każdy wynik w dowodzie ma mapping key do źródła w trace/result
6. **LaTeX-only math** — WSZYSTKIE symbole matematyczne, jednostki i liczby WYŁĄCZNIE w blokach `$$...$$`
7. **Prąd dynamiczny OBOWIĄZKOWY** — obowiązkowy wynik obliczeń zwarciowych
8. **Prąd cieplny OBOWIĄZKOWY** — obowiązkowy wynik z pełnym obliczeniem współczynników

---

## Polityka LaTeX-only (BINDING)

$$
\boxed{
\begin{aligned}
&\textbf{REGUŁA: ZERO MATEMATYKI POZA BLOKAMI } \texttt{\$\$...\$\$} \\[8pt]
&\textbf{DOZWOLONE:} \\[4pt]
&\quad \text{Blokowy LaTeX: } \texttt{\$\$...formuła...\$\$} \\[4pt]
&\textbf{ZABRONIONE:} \\[4pt]
&\quad \text{Inline LaTeX: } \texttt{\$...\$} \\
&\quad \text{Symbole w tekście: } I_k'', \kappa, \Omega, \text{kV}, \text{kA} \\
&\quad \text{Liczby z jednostkami w tekście: } 15{,}0\,\text{kV}, 20\,\text{kA} \\[8pt]
&\textbf{BEZ WYJĄTKÓW — dotyczy również JSON/YAML w dokumentacji}
\end{aligned}
}
$$

---

**END OF README**
