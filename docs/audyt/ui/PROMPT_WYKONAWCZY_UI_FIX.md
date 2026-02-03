# PROMPT WYKONAWCZY: Naprawa UI na podstawie audytu

**Wersja**: 1.0
**Data**: 2026-02-03
**Cel**: Gotowy prompt do użycia w Claude Code do naprawy zidentyfikowanych problemów UI

---

## Kontekst

Przeprowadzono audyt UI repozytorium MV-DESIGN PRO.

Wyniki audytu znajdują się w plikach:
- `docs/audyt/ui/AUDYT_UI_DISCOVERY.md` — znalezione specyfikacje
- `docs/audyt/ui/AUDYT_UI_STAN_KODU.md` — stan kodu frontend
- `docs/audyt/ui/PLAN_NAPRAWCZY_UI.md` — plan napraw (priorytetyzowany)

---

## Zasady pracy (z SYSTEM_SPEC.md i AGENTS.md)

### 1. NOT-A-SOLVER Rule
**KATEGORYCZNIE ZAKAZANE** umieszczanie fizyki obliczeniowej w UI:
- Brak obliczeń impedancji w frontend
- Brak obliczeń prądów zwarciowych w frontend
- Brak interpretacji normowych w frontend (poza prezentacją)

UI tylko **PREZENTUJE** dane z Analysis Layer.

### 2. WHITE BOX Rule
Wszystkie wyniki muszą być **audytowalne**:
- Każda wartość ma źródło (trace)
- Brak ukrytych korekt
- Deterministyczne zachowanie

### 3. Single Global Focus
Selekcja musi być **zsynchronizowana** między:
- Navigation Panel (ProjectTree)
- SLD View
- Inspector Panel
- Results Table

### 4. NO SIMPLIFICATION Rule
**ZAKAZANE** ukrywanie danych "dla uproszczenia":
- Wszystkie kolumny dostępne
- Expert Modes zmieniają tylko **domyślne rozwinięcia**, nie ukrywają

### 5. VerdictBadge Pattern
Struktura werdyktu (z `protection-coordination/ResultsTables.tsx`):
```tsx
{
  status: 'PASS' | 'MARGINAL' | 'FAIL',
  przyczyna: string,  // "Napięcie poniżej dolnej granicy"
  skutek: string,     // "Możliwe problemy z działaniem urządzeń"
  zalecenie: string   // "Zwiększyć napięcie na szynie zasilającej"
}
```

---

## Zadania do wykonania

### BLOKERY (MUST FIX)

#### Zadanie M1: Werdykty w tabeli szyn (rozpływ mocy)

```
PROMPT:

Dodaj kolumnę "Status" z werdyktem do tabeli szyn rozpływu mocy.

LOKALIZACJA:
- Moduł: frontend/src/ui/power-flow-results/
- Szukaj plików: *Table*.tsx, *Bus*.tsx

WYMAGANIA:
1. Dodaj kolumnę "Status" z komponentem VerdictBadge
2. Logika werdyktu:
   - PASS: 0.95 ≤ U_pu ≤ 1.05
   - MARGINAL: 0.90 ≤ U_pu < 0.95 lub 1.05 < U_pu ≤ 1.10
   - FAIL: U_pu < 0.90 lub U_pu > 1.10
3. Tooltip z przyczyna/skutek/zalecenie
4. Kolorowanie wierszy (Tailwind: bg-emerald-50, bg-amber-50, bg-rose-50)

WZORZEC:
Użyj wzorca z protection-coordination/ResultsTables.tsx (SensitivityTable)

TESTY:
Dodaj test jednostkowy dla logiki werdyktu

COMMIT:
git commit -m "fix(ui): UI-01 dodaj werdykty do tabeli szyn rozpływu mocy"
```

---

#### Zadanie M2: Werdykty w tabeli gałęzi (rozpływ mocy)

```
PROMPT:

Dodaj kolumnę "Status" z werdyktem do tabeli gałęzi rozpływu mocy.

LOKALIZACJA:
- Moduł: frontend/src/ui/power-flow-results/
- Szukaj plików: *Branch*.tsx, *Line*.tsx

WYMAGANIA:
1. Dodaj kolumnę "Status" z komponentem VerdictBadge
2. Logika werdyktu:
   - PASS: obciążenie ≤ 80%
   - MARGINAL: 80% < obciążenie ≤ 100%
   - FAIL: obciążenie > 100%
3. Tooltip z przyczyna/skutek/zalecenie
4. Użyj tego samego VerdictBadge co w M1

WZORZEC:
Użyj wzorca z protection-coordination/ResultsTables.tsx (OverloadTable)

TESTY:
Dodaj test jednostkowy dla logiki werdyktu

COMMIT:
git commit -m "fix(ui): UI-02 dodaj werdykty do tabeli gałęzi rozpływu mocy"
```

---

#### Zadanie M3: Porównanie Ik vs Icu (wyniki zwarciowe)

```
PROMPT:

Dodaj porównanie prądu zwarciowego z zdolnością łączeniową urządzenia.

LOKALIZACJA:
- Moduł: frontend/src/ui/results-inspector/
- Szukaj plików: *ShortCircuit*.tsx, ResultsInspectorPage.tsx

WYMAGANIA:
1. Dodaj kolumny:
   - "Icu [kA]" — pobrane z katalogu (frontend/src/ui/catalog/api.ts)
   - "Margines [%]" = (Icu - Ik) / Icu × 100
   - "Werdykt" — VerdictBadge
2. Logika werdyktu:
   - PASS: margines > 15%
   - MARGINAL: 0% ≤ margines ≤ 15%
   - FAIL: margines < 0%
3. Obsługa brakujących danych: wyświetl "Brak danych" gdy Icu niedostępne

INTEGRACJA:
- Pobierz Icu z katalogu urządzeń (może wymagać rozszerzenia API)
- Jeśli API nie istnieje, stwórz stub z TODO

TESTY:
Dodaj test jednostkowy dla:
- Logiki werdyktu
- Obsługi brakujących danych

COMMIT:
git commit -m "fix(ui): UI-03 dodaj porównanie Ik vs Icu w wynikach zwarciowych"
```

---

#### Zadanie M4: Panel interpretacji wykresu TCC

```
PROMPT:

Dodaj panel tekstowej interpretacji do wykresu krzywych czasowo-prądowych.

LOKALIZACJA:
- Moduł: frontend/src/ui/protection-coordination/
- Pliki: TccChart.tsx, ProtectionCoordinationPage.tsx

WYMAGANIA:
1. Stwórz nowy komponent TccInterpretationPanel.tsx
2. Panel wyświetla:
   - Liczbę wykrytych konfliktów
   - Dla każdego konfliktu:
     * Para urządzeń (nazwa A ↔ nazwa B)
     * Zakres prądów konfliktu [A]
     * Skutek (np. "brak selektywności")
     * Zalecenie (np. "zwiększyć nastawę czasową")
3. Panel domyślnie widoczny, z przyciskiem zwijania
4. Umieść obok wykresu TCC (flex layout)

ALGORYTM WYKRYWANIA PRZECIĘĆ:
1. Dla każdej pary krzywych sprawdź czy mają wspólne punkty
2. Wspólny punkt = przecięcie = konflikt
3. Jeśli backend nie dostarcza tej analizy, użyj uproszczonej heurystyki:
   - Sprawdź czy krzywe mają nakładające się zakresy prądów i czasów

PRZYKŁAD TREŚCI PANELU:
```
INTERPRETACJA WYKRESU

Wykryto 2 pary urządzeń z potencjalnym konfliktem:

1. Wyłącznik Q1 ↔ Bezpiecznik F2
   • Zakres konfliktu: 800 - 1500 A
   • Skutek: Brak selektywności dla zwarć średnich
   • Zalecenie: Zwiększyć nastawę czasową Q1 o 0.1 s
```

TESTY:
Dodaj test jednostkowy dla panelu

COMMIT:
git commit -m "fix(ui): UI-04 dodaj panel interpretacji wykresu TCC"
```

---

### WAŻNE (SHOULD FIX)

#### Zadanie S1: Podsumowanie wykonawcze rozpływu mocy

```
PROMPT:

Dodaj sekcję "Werdykt ogólny" do podsumowania rozpływu mocy.

LOKALIZACJA:
- Moduł: frontend/src/ui/power-flow-results/
- Szukaj: *Summary*.tsx, PowerFlowResultsInspectorPage.tsx

WYMAGANIA:
1. Dodaj sekcję na górze podsumowania:
   - Status sieci: VerdictBadge (PASS/MARGINAL/FAIL)
   - Agregacja: FAIL jeśli jakikolwiek element FAIL, MARGINAL jeśli jakikolwiek MARGINAL
2. Dodaj sekcję "Wykryte problemy" (jeśli są):
   - Lista elementów z MARGINAL i FAIL
   - Format: "Szyna BUS-003: napięcie 0.89 p.u. (poniżej 0.90)"
3. Dodaj sekcję "Zalecane działania":
   - Automatyczne sugestie powiązane z problemami

ZALEŻNOŚCI:
- Wymaga M1 i M2 (werdykty per element)

COMMIT:
git commit -m "fix(ui): UI-05 dodaj podsumowanie wykonawcze rozpływu mocy"
```

---

#### Zadanie S4: Rozszerzenie Element Inspector do 6 zakładek

```
PROMPT:

Rozszerz Element Inspector z 4 do 6 zakładek zgodnie z ELEMENT_INSPECTOR_CONTRACT.md.

LOKALIZACJA:
- Moduł: frontend/src/ui/inspector/
- Plik: InspectorPanel.tsx

WYMAGANIA:
Zakładki (zgodnie ze specyfikacją):
1. Overview — identyfikacja + kluczowe wartości (ISTNIEJE)
2. Parameters — parametry elementu (ISTNIEJE)
3. Results — wyniki obliczeń (ISTNIEJE)
4. Contributions — kontrybutorzy (do prądu SC, obciążeń) (DODAĆ)
5. Limits — limity normatywne vs wartości (DODAĆ)
6. Proof — dowód P11 (audytowalny) (ISTNIEJE jako osobny ekran)

NOWE ZAKŁADKI:
- Contributions: tabela źródeł składających się na wartość (np. prąd zwarciowy = suma z gałęzi)
- Limits: porównanie wartości z limitami (Ik < Icu, U w zakresie, Loading < 100%)

SPECYFIKACJA:
Patrz: docs/ui/ELEMENT_INSPECTOR_CONTRACT.md

COMMIT:
git commit -m "fix(ui): UI-08 rozszerz Element Inspector do 6 zakładek"
```

---

## Procedura dla KAŻDEGO zadania

```bash
# 1. Przeczytaj powiązane pliki specyfikacji
cat docs/ui/ELEMENT_INSPECTOR_CONTRACT.md  # lub odpowiedni kontrakt

# 2. Znajdź pliki do modyfikacji
find frontend/src/ui -name "*.tsx" | xargs grep -l "SZUKANA_FRAZA"

# 3. Przeczytaj istniejący kod
# (użyj Read tool)

# 4. Zaimplementuj zmiany
# (użyj Edit tool)

# 5. Dodaj testy
# (użyj Write tool dla nowego pliku .test.tsx)

# 6. Zweryfikuj build
cd mv-design-pro/frontend && npm run build

# 7. Uruchom testy
npm run test

# 8. Commituj z odpowiednim message
git add .
git commit -m "fix(ui): [TASK_ID] opis zmiany"
```

---

## Po zakończeniu wszystkich zadań

```bash
# 1. Zweryfikuj pełny build
cd mv-design-pro/frontend
npm run build
npm run test

# 2. Sprawdź linting
npm run lint

# 3. Push na branch
git push -u origin claude/fix-ui-audit-XXXXX

# 4. Stwórz raport z wykonania
# (Opisz co zostało zrobione, ile zadań ukończonych, jakie problemy napotkano)
```

---

## Notatki dla wykonawcy

### Wzorzec VerdictBadge

Jeśli VerdictBadge nie istnieje jako współdzielony komponent, stwórz go:

```tsx
// frontend/src/ui/shared/VerdictBadge.tsx

import React from 'react';

type VerdictStatus = 'PASS' | 'MARGINAL' | 'FAIL';

interface VerdictData {
  status: VerdictStatus;
  przyczyna: string;
  skutek: string;
  zalecenie: string;
}

interface VerdictBadgeProps {
  verdict: VerdictData;
}

const statusConfig = {
  PASS: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    label: 'OK',
  },
  MARGINAL: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    label: 'Uwaga',
  },
  FAIL: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    label: 'Przekroczenie',
  },
};

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const config = statusConfig[verdict.status];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${config.bg} ${config.text}`}
      title={`Przyczyna: ${verdict.przyczyna}\nSkutek: ${verdict.skutek}\nZalecenie: ${verdict.zalecenie}`}
    >
      {config.label}
    </span>
  );
}
```

### Funkcja pomocnicza dla werdyktu napięcia

```typescript
// frontend/src/ui/power-flow-results/verdictHelpers.ts

export function getVoltageVerdict(u_pu: number): VerdictData {
  if (u_pu >= 0.95 && u_pu <= 1.05) {
    return {
      status: 'PASS',
      przyczyna: 'Napięcie w zakresie dopuszczalnym',
      skutek: 'Brak problemów',
      zalecenie: 'Brak działań wymaganych',
    };
  }

  if ((u_pu >= 0.90 && u_pu < 0.95) || (u_pu > 1.05 && u_pu <= 1.10)) {
    return {
      status: 'MARGINAL',
      przyczyna: u_pu < 0.95
        ? 'Napięcie blisko dolnej granicy'
        : 'Napięcie blisko górnej granicy',
      skutek: 'Możliwe problemy przy dalszym pogorszeniu',
      zalecenie: u_pu < 0.95
        ? 'Rozważyć zwiększenie napięcia zasilania'
        : 'Rozważyć zmniejszenie napięcia zasilania',
    };
  }

  return {
    status: 'FAIL',
    przyczyna: u_pu < 0.90
      ? 'Napięcie poniżej dolnej granicy (< 0.90 p.u.)'
      : 'Napięcie powyżej górnej granicy (> 1.10 p.u.)',
    skutek: 'Nieprawidłowe warunki pracy urządzeń',
    zalecenie: u_pu < 0.90
      ? 'WYMAGANE: Zwiększyć napięcie na szynie zasilającej'
      : 'WYMAGANE: Zmniejszyć napięcie na szynie zasilającej',
  };
}
```

---

## Checklist końcowa

- [ ] M1: Werdykty w tabeli szyn (PF) — BLOKER
- [ ] M2: Werdykty w tabeli gałęzi (PF) — BLOKER
- [ ] M3: Porównanie Ik vs Icu — BLOKER
- [ ] M4: Panel interpretacji TCC — BLOKER
- [ ] S1: Podsumowanie wykonawcze PF — WAŻNE
- [ ] S4: Element Inspector 6 zakładek — WAŻNE
- [ ] Build passing
- [ ] Tests passing
- [ ] Push na branch

---

*Prompt wykonawczy wygenerowany na podstawie audytu UI z dnia 2026-02-03*
