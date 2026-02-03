# Plan naprawczy UI — MV-DESIGN PRO

**Wersja**: 1.0
**Data**: 2026-02-03
**Autor**: Claude AI / Audyt Architektury
**Status**: DO REALIZACJI

---

## 1. Diagnoza

### 1.1 Podsumowanie audytu

Na podstawie przeprowadzonego audytu (AUDYT_UI_DISCOVERY.md + AUDYT_UI_STAN_KODU.md) stwierdzono:

| Obszar | Ocena | Uzasadnienie |
|--------|-------|--------------|
| **Specyfikacja UI** | ✅ BARDZO DOBRA | 40+ dokumentów kontraktowych, hierarchiczna struktura |
| **Architektura kodu** | ✅ DOBRA | 41 modułów, zgodność z PowerFactory Layout |
| **Implementacja funkcji** | ⚠️ CZĘŚCIOWA | Blokery w obszarze werdyktów i porównań |
| **Testy** | ✅ DOBRA | 55 plików testowych, Vitest + Playwright |
| **Gotowość do odbioru** | ❌ NIEGOTOWE | 4 blokery do naprawienia |

### 1.2 Kluczowe rozbieżności (spec vs kod)

| # | Specyfikacja | Wymaganie | Stan kodu | Gap |
|---|--------------|-----------|-----------|-----|
| 1 | RESULTS_BROWSER_CONTRACT.md | Kolumna Status z VerdictBadge | Brak w PF results | BLOKER |
| 2 | ELEMENT_INSPECTOR_CONTRACT.md | 6 zakładek | 4 zakładki | WAŻNE |
| 3 | GLOBAL_CONTEXT_BAR.md | 8 poziomów hierarchii | 4 poziomy | WAŻNE |
| 4 | PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md | Panel interpretacji TCC | Brak | BLOKER |
| 5 | SC_NODE_RESULTS_CONTRACT.md | Porównanie Ik vs Icu | Brak | BLOKER |

---

## 2. Priorytety napraw (MoSCoW)

### 2.1 MUST HAVE — Blokery MVP

**Bez tych zmian system nie jest gotowy do odbioru zewnętrznego.**

| # | ID | Zadanie | Opis | Moduł | Złożoność | Zależności |
|---|----|---------|----- |-------|-----------|------------|
| M1 | UI-01 | Werdykty w tabeli szyn (PF) | Dodać kolumnę "Status" z VerdictBadge do tabeli szyn rozpływu mocy | `power-flow-results/` | Niska | - |
| M2 | UI-02 | Werdykty w tabeli gałęzi (PF) | Dodać kolumnę "Status" z VerdictBadge do tabeli gałęzi rozpływu mocy | `power-flow-results/` | Niska | M1 (wzorzec) |
| M3 | UI-03 | Porównanie Ik vs Icu | Dodać kolumny Icu, Margines, Werdykt do tabeli wyników zwarciowych | `results-inspector/` | Średnia | Integracja z katalogiem |
| M4 | UI-04 | Panel interpretacji TCC | Dodać panel tekstowej interpretacji do wykresu krzywych czasowo-prądowych | `protection-coordination/` | Średnia | - |

### 2.2 SHOULD HAVE — Ważne dla UX

**Znacząco poprawiają doświadczenie użytkownika i zgodność ze specyfikacją.**

| # | ID | Zadanie | Opis | Moduł | Złożoność | Zależności |
|---|----|---------|----- |-------|-----------|------------|
| S1 | UI-05 | Podsumowanie wykonawcze PF | Dodać sekcję "Werdykt ogólny" do podsumowania rozpływu mocy | `power-flow-results/` | Niska | M1, M2 |
| S2 | UI-06 | Widok porównawczy przypadków | Dodać pełny Delta View z klasyfikacją istotności zmian | `compare/`, `study-cases/` | Średnia | - |
| S3 | UI-07 | Werdykty w raporcie PDF | Dodać sekcję "Podsumowanie wykonawcze" do eksportów PDF | `export/`, `results-inspector/` | Średnia | M1, M2, M3, S1 |
| S4 | UI-08 | Rozszerzenie Element Inspector | Dodać zakładki: Contributions, Limits, Proof (z 4 do 6) | `inspector/` | Średnia | - |
| S5 | UI-09 | Rozszerzenie Global Context Bar | Dodać poziomy: Snapshot, Run, Analysis, Norma (z 4 do 8) | `active-case-bar/` | Średnia | - |

### 2.3 COULD HAVE — Nice-to-have

**Usprawnienia ergonomii i zgodności z najlepszymi praktykami.**

| # | ID | Zadanie | Opis | Moduł | Złożoność | Zależności |
|---|----|---------|----- |-------|-----------|------------|
| C1 | UI-10 | Odniesienie do normy w nagłówkach | Dodać "Zgodnie z IEC 60909" w nagłówkach koordynacji | `protection-coordination/` | Bardzo niska | - |
| C2 | UI-11 | Rozbudowane tooltips statusów | Rozbudować tooltips dla FRESH/OUTDATED/NONE | `study-cases/` | Bardzo niska | - |
| C3 | UI-12 | Podświetlenie CTA eksportu | Podświetlić przycisk "Eksportuj PDF" po wyniku PASS | `reference-patterns/` | Niska | - |
| C4 | UI-13 | Audyt WCAG 2.1 AA | Przeprowadzić audyt dostępności | Cały frontend | Średnia | - |
| C5 | UI-14 | Virtual scrolling audit | Zweryfikować implementację dla > 500 wierszy | `results-browser/` | Niska | - |

### 2.4 WON'T HAVE — Poza zakresem

**Zadania odłożone lub wykluczne z aktualnego planu.**

| # | Zadanie | Uzasadnienie |
|---|---------|--------------|
| W1 | Nowe kontrakty (DataManager, ContextMenu) | Niski priorytet, kod działa |
| W2 | Refaktor routing (React Router) | Obecny hash routing działa |
| W3 | Migracja do @tanstack/react-query | Zustand + fetch działa |

---

## 3. Szczegółowe specyfikacje napraw

### 3.1 M1: Werdykty w tabeli szyn (UI-01)

**Priorytet**: BLOKER
**Moduł**: `frontend/src/ui/power-flow-results/`
**Wzorzec**: `protection-coordination/ResultsTables.tsx`

**Wymagania funkcjonalne:**

1. Dodać kolumnę "Status" z komponentem VerdictBadge
2. Logika werdyktu:
   ```
   PASS:     0.95 ≤ U_pu ≤ 1.05
   MARGINAL: 0.90 ≤ U_pu < 0.95 lub 1.05 < U_pu ≤ 1.10
   FAIL:     U_pu < 0.90 lub U_pu > 1.10
   ```
3. Tooltip z przyczynę/skutek/zalecenie dla MARGINAL i FAIL
4. Kolorowanie wierszy odpowiednio do statusu

**Pliki do modyfikacji:**
- `power-flow-results/BusResultsTable.tsx` (lub odpowiednik)
- Dodać komponent `VerdictBadge` (lub użyć z protection-coordination)

**Akceptacja:**
- [ ] Kolumna "Status" widoczna w tabeli
- [ ] VerdictBadge z tooltipem
- [ ] Kolorowanie wierszy
- [ ] Testy jednostkowe

---

### 3.2 M2: Werdykty w tabeli gałęzi (UI-02)

**Priorytet**: BLOKER
**Moduł**: `frontend/src/ui/power-flow-results/`

**Wymagania funkcjonalne:**

1. Dodać kolumnę "Status" z VerdictBadge
2. Logika werdyktu:
   ```
   PASS:     obciążenie ≤ 80%
   MARGINAL: 80% < obciążenie ≤ 100%
   FAIL:     obciążenie > 100%
   ```
3. Tooltip z przyczynę/skutek/zalecenie

**Pliki do modyfikacji:**
- `power-flow-results/BranchResultsTable.tsx` (lub odpowiednik)

**Akceptacja:**
- [ ] Kolumna "Status" widoczna
- [ ] Logika werdyktu zgodna ze specyfikacją
- [ ] Testy jednostkowe

---

### 3.3 M3: Porównanie Ik vs Icu (UI-03)

**Priorytet**: BLOKER
**Moduł**: `frontend/src/ui/results-inspector/`
**Zależności**: Integracja z katalogiem urządzeń

**Wymagania funkcjonalne:**

1. Dodać kolumny:
   - `Icu [kA]` — z katalogu urządzenia
   - `Ics [kA]` — opcjonalnie
   - `Margines [%]` = (Icu - Ik) / Icu × 100
   - `Werdykt` — VerdictBadge
2. Logika werdyktu:
   ```
   PASS:     margines > 15%
   MARGINAL: 0% ≤ margines ≤ 15%
   FAIL:     margines < 0% (Ik > Icu)
   ```
3. Obsługa brakujących danych: "Brak danych"

**Pliki do modyfikacji:**
- `results-inspector/ShortCircuitTable.tsx` (lub odpowiednik)
- Integracja z `catalog/api.ts` dla Icu

**Akceptacja:**
- [ ] Kolumna Icu widoczna
- [ ] Kolumna Margines obliczana poprawnie
- [ ] Kolumna Werdykt z VerdictBadge
- [ ] Obsługa brakujących danych katalogowych
- [ ] Testy jednostkowe

---

### 3.4 M4: Panel interpretacji TCC (UI-04)

**Priorytet**: BLOKER
**Moduł**: `frontend/src/ui/protection-coordination/`

**Wymagania funkcjonalne:**

1. Dodać panel boczny "Interpretacja wykresu" obok TccChart
2. Automatyczne wykrywanie przecięć krzywych
3. Dla każdego konfliktu wyświetlić:
   - Para urządzeń (nazwa A, nazwa B)
   - Zakres prądów konfliktu [A]
   - Skutek (np. "brak selektywności")
   - Zalecenie (np. "zwiększyć nastawę czasową urządzenia B")
4. Panel domyślnie widoczny, można zwinąć

**Przykład treści panelu:**
```
INTERPRETACJA WYKRESU

Wykryto 2 pary urządzeń z potencjalnym konfliktem:

1. Wyłącznik Q1 ↔ Bezpiecznik F2
   • Zakres konfliktu: 800 - 1500 A
   • Skutek: Brak selektywności dla zwarć średnich
   • Zalecenie: Zwiększyć nastawę czasową Q1 o 0.1 s

2. Przekaźnik REL1 ↔ Wyłącznik Q2
   • Zakres konfliktu: 2000 - 3000 A
   • Skutek: Możliwe jednoczesne zadziałanie
   • Zalecenie: Zmienić charakterystykę REL1 na "very inverse"
```

**Pliki do modyfikacji:**
- `protection-coordination/TccChart.tsx` — dodać panel
- Nowy komponent `TccInterpretationPanel.tsx`
- Logika wykrywania przecięć (może wymagać wsparcia backend)

**Akceptacja:**
- [ ] Panel interpretacji widoczny obok wykresu
- [ ] Automatyczne wykrywanie przecięć krzywych
- [ ] Tekstowy opis każdego konfliktu
- [ ] Zalecenia naprawcze
- [ ] Testy jednostkowe

---

## 4. Sekwencja implementacji

### 4.1 Sprint 1: Blokery (tydzień 1-2)

```
Tydzień 1:
├── M1: Werdykty szyn (1-2 dni)
├── M2: Werdykty gałęzi (1 dzień)
└── M4: Panel TCC interpretacji (2-3 dni)

Tydzień 2:
├── M3: Porównanie Ik vs Icu (3-4 dni)
└── Testy integracyjne (1-2 dni)
```

**Kamień milowy**: Wszystkie blokery naprawione, gotowość do odbioru zewnętrznego.

### 4.2 Sprint 2: Ważne (tydzień 3-4)

```
Tydzień 3:
├── S1: Podsumowanie wykonawcze PF (1 dzień)
├── S4: Rozszerzenie Element Inspector (2-3 dni)
└── S5: Rozszerzenie Global Context Bar (2 dni)

Tydzień 4:
├── S2: Widok porównawczy przypadków (3-4 dni)
└── S3: Werdykty w raporcie PDF (2 dni)
```

**Kamień milowy**: Pełna zgodność ze specyfikacją UI Phase 1.z.

### 4.3 Sprint 3: Nice-to-have (tydzień 5-6)

```
Tydzień 5:
├── C1: Odniesienie do normy (0.5 dnia)
├── C2: Rozbudowane tooltips (0.5 dnia)
├── C3: Podświetlenie CTA eksportu (1 dzień)
└── C5: Virtual scrolling audit (1 dzień)

Tydzień 6:
└── C4: Audyt WCAG 2.1 AA (3-5 dni)
```

**Kamień milowy**: Produkcyjna jakość UI, zgodność z WCAG.

---

## 5. Zasady implementacji

### 5.1 Zgodność z dokumentami kanonicznymi

Każda implementacja MUSI być zgodna z:

1. **SYSTEM_SPEC.md** — NOT-A-SOLVER Rule (brak fizyki w UI)
2. **UI_CORE_ARCHITECTURE.md** — architektura fundamentalna
3. **AGENTS.md** — governance rules

### 5.2 Zasada "1 ekran = 1 decyzja"

Zgodnie z `docs/ui/audyt/AUDYT_UI_1_EKRAN_1_DECYZJA.md`:
- Każdy ekran prowadzi do jednej decyzji
- Wynik zrozumiały bez objaśnień ustnych
- Status → Przyczyna → Skutek → Zalecenie

### 5.3 VerdictBadge — wzorzec

Użyć istniejącego wzorca z `protection-coordination/ResultsTables.tsx`:

```tsx
interface VerdictData {
  status: 'PASS' | 'MARGINAL' | 'FAIL';
  przyczyna: string;
  skutek: string;
  zalecenie: string;
}

<VerdictBadge verdict={verdict} />
```

### 5.4 Testy

Dla każdej naprawy:
- [ ] Testy jednostkowe (Vitest)
- [ ] Testy integracyjne (jeśli dotyczy)
- [ ] Build check: `npm run build`

---

## 6. Metryki sukcesu

| Metryka | Cel |
|---------|-----|
| Blokery naprawione | 4/4 (100%) |
| Ekrany z werdyktem | 100% ekranów wynikowych |
| Gotowość do odbioru | 10/10 obszarów |
| Czas zrozumienia wyników | < 30 sekund bez pomocy |
| Testy passing | 100% |
| Build success | Tak |

---

## 7. Ryzyka i mitygacje

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| M3 wymaga nowego API dla Icu | Średnie | Wysoki | Sprawdzić dostępność danych w katalogu |
| M4 wykrywanie przecięć jest złożone | Średnie | Średni | Zacząć od prostej heurystyki, iterować |
| Regresje w istniejących testach | Niskie | Średni | Uruchamiać pełny suite testów |
| Brak danych katalogowych dla starszych projektów | Średnie | Niski | Wyświetlać "Brak danych" |

---

## 8. Załączniki

### 8.1 Powiązane dokumenty

- `AUDYT_UI_DISCOVERY.md` — wyniki przeszukania repo
- `AUDYT_UI_STAN_KODU.md` — inwentaryzacja kodu
- `docs/ui/audyt/CHECKLISTA_UI_KANONICZNA.md` — wcześniejszy audyt
- `docs/ui/audyt/PLAN_POPRAWEK_UI.md` — wcześniejszy plan (UI-01 do UI-10)

### 8.2 Kontrakty źródłowe

- `docs/ui/RESULTS_BROWSER_CONTRACT.md`
- `docs/ui/ELEMENT_INSPECTOR_CONTRACT.md`
- `docs/ui/GLOBAL_CONTEXT_BAR.md`
- `mv-design-pro/docs/ui/PROTECTION_CURVES_IT_SUPERIOR_CONTRACT.md`
- `mv-design-pro/docs/ui/SC_NODE_RESULTS_CONTRACT.md`

---

*Plan naprawczy wygenerowany na podstawie audytu UI z dnia 2026-02-03*
