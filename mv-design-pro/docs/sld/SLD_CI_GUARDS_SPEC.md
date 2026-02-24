# SLD CI GUARDS — SPECYFIKACJA STRAŻNIKÓW

**Status**: BINDING
**Data**: 2026-02-24
**Wersja**: 1.0.0
**Zakres**: Dwa strażniki CI dla silnika SLD Hybrid Layout

---

## 1. CEL

Strażniki CI zapewniają integralność silnika layoutu SLD w pipeline CI/CD.
Każdy push i pull request jest sprawdzany pod kątem:
- **Determinizmu** — brak niedeterministycznych operacji w algorytmie layoutu
- **Ortogonalności** — brak diagonalnych linii, łuków, krzywych Beziera
- **Integralności hybrid** — poprawne importy bay classification + crossing minimization
- **Spójności geometrii** — stałe IndustrialAesthetics zgodne z kontraktem

---

## 2. STRAŻNIK 1: `sld_layout_hybrid_guard.py`

### Lokalizacja
`scripts/sld_layout_hybrid_guard.py`

### Sprawdzenia (5 kategorii)

| # | Kategoria | Opis | Kryterium PASS |
|---|-----------|------|----------------|
| 1 | Forbidden patterns | Math.random(), Date.now(), crypto.randomUUID(), React imports | 0 wystąpień w plikach layoutu |
| 2 | Hybrid imports | bayClassification + crossingMinimization w layoutPipeline.ts | Oba importy obecne |
| 3 | Pipeline phases | phase1 through phase6 functions exist | Wszystkie 6 faz zdefiniowanych |
| 4 | Aesthetics constants | GRID_BASE=20, GRID_SPACING_MAIN=280, Y_GPZ=60 | Wartości zgodne z kontraktem |
| 5 | Golden tests | goldenLayoutHybrid.test.ts z >= 12 golden networks | >= 12 builderów GN_HYB_XX |

### Pliki sprawdzane

**Core layout** (pełne sprawdzenie):
- `ui/sld/core/layoutPipeline.ts`
- `ui/sld/core/bayClassification.ts`
- `ui/sld/core/crossingMinimization.ts`
- `ui/sld/core/visualGraph.ts`
- `ui/sld/core/layoutResult.ts`

**Engine phases** (tylko forbidden patterns, bez pipeline.ts):
- `engine/sld-layout/phase1-voltage-bands.ts`
- `engine/sld-layout/phase2-bay-detection.ts`
- `engine/sld-layout/phase3-crossing-min.ts`
- `engine/sld-layout/phase4-coordinates.ts`
- `engine/sld-layout/phase5-routing.ts`

> **UWAGA**: `engine/sld-layout/pipeline.ts` jest wyłączony ze sprawdzenia `Date.now()`,
> ponieważ używa go do nadpisania timestampów użytkownika (nie w algorytmie layoutu).

### Wzorce zabronione

| Wzorzec | Powód |
|---------|-------|
| `Math.random()` | Niedeterministyczny — random w layout = różny wynik per run |
| `Date.now()` | Niedeterministyczny — zależność od czasu systemowego |
| `crypto.randomUUID()` | Niedeterministyczny — losowy UUID |
| `from 'react'` | Separacja warstw — silnik layoutu nie może zależeć od React |
| `from 'react-dom'` | Separacja warstw — silnik layoutu nie może zależeć od React |

### Wynik
- `EXIT 0` + `PASS: SLD Layout Hybrid — wszystkie warunki spełnione.`
- `EXIT 1` + lista naruszeń z numerem linii i opisem

---

## 3. STRAŻNIK 2: `sld_orthogonal_guard.py`

### Lokalizacja
`scripts/sld_orthogonal_guard.py`

### Sprawdzenia (2 kategorie)

| # | Kategoria | Opis | Kryterium PASS |
|---|-----------|------|----------------|
| 1 | Forbidden curves | arcTo, bezierCurveTo, quadraticCurveTo, Math.atan2 w routing | 0 wystąpień |
| 2 | Validation export | validateOrthogonalRouting() w IndustrialAesthetics.ts | Funkcja obecna |

### Pliki sprawdzane

**Routing files**:
- `ui/sld/core/layoutPipeline.ts`
- `engine/sld-layout/phase5-routing.ts`

**Aesthetics validation**:
- `ui/sld/IndustrialAesthetics.ts`

### Wzorce zabronione

| Wzorzec | Powód |
|---------|-------|
| `arcTo` | Łuki zabronione — SLD używa tylko segmentów 0°/90° |
| `bezierCurveTo` | Krzywe Beziera zabronione — ortogonalny routing only |
| `quadraticCurveTo` | Krzywe kwadratowe zabronione |
| `Math.atan2` | Sugeruje obliczanie kątów skośnych — brak diagonali w SLD |

### Wynik
- `EXIT 0` + `PASS: SLD Orthogonal Routing — brak skosów i łuków.`
- `EXIT 1` + lista naruszeń z plikiem, linią i opisem

---

## 4. INTEGRACJA Z CI

### Workflow: `.github/workflows/sld-determinism.yml`

Strażniki uruchamiane w następującej kolejności:

```yaml
steps:
  - name: Python SLD guards
    run: |
      python scripts/sld_layout_hybrid_guard.py
      python scripts/sld_orthogonal_guard.py
      python scripts/sld_determinism_guards.py

  - name: Vitest contract tests
    run: |
      cd frontend
      npx vitest run --no-file-parallelism \
        src/ui/sld/core/__tests__/goldenLayoutHybrid.test.ts \
        src/ui/sld/core/__tests__/determinism.test.ts \
        src/ui/sld/core/__tests__/layoutPipeline.test.ts
```

### Trigger
- `push` do dowolnej gałęzi
- `pull_request` do `main` i `develop`

### Wymagane do merge
Wszystkie 3 strażniki muszą zwrócić `EXIT 0`.

---

## 5. MATRYCA POKRYCIA

| Aspekt | hybrid_guard | orthogonal_guard | determinism tests |
|--------|:---:|:---:|:---:|
| Brak Math.random() | ✅ | — | — |
| Brak Date.now() w algorytmie | ✅ | — | — |
| Brak crypto.randomUUID() | ✅ | — | — |
| Brak React imports w silniku | ✅ | — | — |
| Importy bayClassification | ✅ | — | — |
| Importy crossingMinimization | ✅ | — | — |
| 6 faz pipeline | ✅ | — | — |
| GRID_BASE = 20 | ✅ | — | ✅ |
| GRID_SPACING_MAIN = 280 | ✅ | — | — |
| Y_GPZ = 60 | ✅ | — | — |
| 12+ golden networks | ✅ | — | ✅ |
| Brak arcTo/bezier | — | ✅ | — |
| Brak Math.atan2 | — | ✅ | — |
| validateOrthogonalRouting | — | ✅ | — |
| Hash stability 100× | — | — | ✅ |
| Permutation invariance 50× | — | — | ✅ |
| Grid alignment | — | — | ✅ |
| Orthogonal routing | — | — | ✅ |
| Zero overlaps | — | — | ✅ |
| Bounds coverage | — | — | ✅ |
| LayoutResultV1 contract | — | — | ✅ |
| Hash uniqueness | — | — | ✅ |

---

## 6. ROZSZERZANIE

### Dodawanie nowego strażnika
1. Utwórz `scripts/sld_<nazwa>_guard.py`
2. Dodaj do `.github/workflows/sld-determinism.yml`
3. Zaktualizuj tę dokumentację (nowa sekcja)
4. Dodaj do matrycy pokrycia (§5)

### Dodawanie nowego wzorca zabronionego
1. Dodaj tuple `(re.compile(...), "opis")` do odpowiedniej listy w strażniku
2. Zaktualizuj tabelę wzorców w tej dokumentacji
3. Uruchom strażnika lokalnie, napraw ewentualne naruszenia

---

*Dokument wiążący. Zmiana strażników wymaga aktualizacji tej specyfikacji.*
