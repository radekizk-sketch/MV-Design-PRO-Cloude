# EXPERT MODES CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Expert Modes** — system trybów pracy UI MV-DESIGN-PRO, umożliwiający:

- **dostosowanie interfejsu do roli użytkownika** (Operator, Designer, Analyst, Auditor),
- **zmianę domyślnych rozwinięć, widoczności sekcji i preferencji wyświetlania**,
- **zachowanie pełnego dostępu do wszystkich danych niezależnie od trybu**,
- **eliminację „basic / lite UI" na rzecz jednego UI z opcjami**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich komponentów UI (Results Browser, Element Inspector, SLD Viewer),
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. ZASADA FUNDAMENTALNA: NO SIMPLIFICATION RULE

### 2.1. Nie ukrywamy danych (BINDING)

**ZABRONIONE** jest tworzenie „uproszczonych" wersji UI, które ukrywają dane lub funkcjonalność:

- **FORBIDDEN**: tworzenie „basic UI" i „advanced UI",
- **FORBIDDEN**: ukrywanie kolumn, zakładek, parametrów "dla uproszczenia",
- **FORBIDDEN**: traktowanie Expert Mode jako „poziom dostępu" (access control).

### 2.2. Jedno UI, wiele preferencji

Expert Mode **MUST**:

- zmieniać tylko **domyślne rozwinięcia** (expand/collapse),
- zmieniać tylko **domyślne widoczne kolumny**,
- zmieniać tylko **domyślne zakładki** (w Inspector),
- **zawsze** umożliwiać użytkownikowi rozwinięcie / włączenie ukrytych sekcji.

**Przykład (POPRAWNY)**:

- **Tryb Operator**: domyślnie zwija sekcję „Advanced Parameters" w Inspector,
- użytkownik może ją rozwinąć kliknięciem (sekcja jest **collapsed**, nie **hidden**).

**Przykład (BŁĘDNY, ZABRONIONY)**:

- **Tryb Operator**: ukrywa sekcję „Advanced Parameters" (brak możliwości rozwinięcia).

---

## 3. DEFINICJE TRYBÓW EKSPERCKICH

### 3.1. OPERATOR MODE

#### 3.1.1. Profil użytkownika

- **Rola**: operator sieci, dyspozytor,
- **Zadania**: monitoring stanu sieci, reakcja na alarmy, sprawdzanie violations,
- **Priorytet**: szybki dostęp do statusu, minimalizacja rozpraszaczy.

#### 3.1.2. UI Preferences (BINDING)

##### Results Browser

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Rozwinięcie drzewa       | Case → Snapshot   | ✓ (Expand All)   |
| Widoczne kolumny         | Name, Status, Voltage, Violation | ✓ (Add Columns) |
| Ukryte kolumny           | Angle, Losses, Impedance | ✓ (Show Hidden) |
| Filtr violations         | Włączony          | ✓                |

##### Element Inspector

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Domyślna zakładka        | Overview          | ✓ (Switch Tab)   |
| Zakładka Parameters      | Zwinięta          | ✓ (Expand)       |
| Zakładka Contributions   | Zwinięta          | ✓ (Expand)       |
| Zakładka Proof (P11)     | Zwinięta          | ✓ (Expand)       |

##### SLD Viewer

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Labels                   | Name, Status      | ✓ (Show All)     |
| Color Scheme             | Status-based      | ✓                |
| Hidden Elements          | Out-of-service    | ✓ (Show)         |

#### 3.1.3. Kluczowe funkcje dostępne

- Monitoring violations w czasie rzeczywistym,
- Szybki dostęp do statusu elementów,
- Filtrowanie po violations,
- Eksport raportu violations do PDF.

---

### 3.2. DESIGNER MODE

#### 3.2.1. Profil użytkownika

- **Rola**: projektant sieci, inżynier elektryk,
- **Zadania**: projektowanie sieci, dobór elementów, optymalizacja topologii,
- **Priorytet**: dostęp do parametrów technicznych, edycja, porównania wariantów.

#### 3.2.2. UI Preferences (BINDING)

##### Results Browser

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Rozwinięcie drzewa       | Case → Snapshot → Analysis Run | ✓ (Expand All) |
| Widoczne kolumny         | Name, Type, Voltage, I, P, Q, Losses | ✓ (Add Columns) |
| Ukryte kolumny           | Angle, Impedance | ✓ (Show Hidden) |
| Filtr violations         | Wyłączony (widać wszystko) | ✓          |

##### Element Inspector

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Domyślna zakładka        | Parameters        | ✓ (Switch Tab)   |
| Zakładka Parameters      | Rozwinięta (edycja włączona) | ✓       |
| Zakładka Results         | Rozwinięta        | ✓ (Collapse)     |
| Zakładka Contributions   | Zwinięta          | ✓ (Expand)       |
| Zakładka Proof (P11)     | Zwinięta          | ✓ (Expand)       |

##### SLD Viewer

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Labels                   | Name, Voltage, Type | ✓ (Show All)   |
| Color Scheme             | Voltage-level     | ✓                |
| Hidden Elements          | None (wszystko widoczne) | ✓           |

#### 3.2.3. Kluczowe funkcje dostępne

- Edycja parametrów elementów,
- Porównanie wariantów (Case comparison),
- Optymalizacja topologii,
- Eksport parametrów do Excel.

---

### 3.3. ANALYST MODE

#### 3.3.1. Profil użytkownika

- **Rola**: analityk sieciowy, inżynier ds. analiz,
- **Zadania**: zaawansowane analizy (LF, SC, Sensitivity, Contingency), audyt wyników,
- **Priorytet**: dostęp do wszystkich danych, wykresy, contributions, marginsy.

#### 3.3.2. UI Preferences (BINDING)

##### Results Browser

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Rozwinięcie drzewa       | Wszystkie poziomy | ✓ (Collapse)     |
| Widoczne kolumny         | Wszystkie podstawowe + Angle, Contributions, Margins | ✓ (Add/Hide) |
| Ukryte kolumny           | Brak (wszystko widoczne domyślnie) | ✓ (Hide)     |
| Filtr violations         | Wyłączony (widać wszystko) | ✓          |

##### Element Inspector

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Domyślna zakładka        | Results           | ✓ (Switch Tab)   |
| Zakładka Parameters      | Rozwinięta (tylko odczyt) | ✓ (Collapse) |
| Zakładka Results         | Rozwinięta (multi-case view) | ✓       |
| Zakładka Contributions   | Rozwinięta (z wykresami) | ✓ (Collapse) |
| Zakładka Limits          | Rozwinięta (wszystkie marginsy) | ✓    |
| Zakładka Proof (P11)     | Zwinięta          | ✓ (Expand)       |

##### SLD Viewer

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Labels                   | All (Name, Voltage, I, P, Q, Angle) | ✓ (Hide) |
| Color Scheme             | Heatmap (obciążenia) | ✓             |
| Hidden Elements          | None (wszystko widoczne) | ✓           |

#### 3.3.3. Kluczowe funkcje dostępne

- Zaawansowane analizy (Sensitivity, Contingency),
- Wykresy contributions (pie charts, bar charts),
- Multi-case comparisons (time-series),
- Eksport wyników do CSV/Excel z wykresami.

---

### 3.4. AUDITOR MODE

#### 3.4.1. Profil użytkownika

- **Rola**: audytor, inspektor, regulatorpracownik nadzoru,
- **Zadania**: audyt zgodności, weryfikacja P11, porównania before/after, audit trail,
- **Priorytet**: pełny dostęp do wszystkich danych, metadanych, historii zmian.

#### 3.4.2. UI Preferences (BINDING)

##### Results Browser

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Rozwinięcie drzewa       | Wszystkie poziomy | ✓ (Collapse)     |
| Widoczne kolumny         | Wszystkie + Timestamp, User, Diff | ✓ (Add/Hide) |
| Ukryte kolumny           | Brak (wszystko widoczne domyślnie) | ✓ (Hide)     |
| Filtr violations         | Wyłączony (widać wszystko) | ✓          |
| Multi-case view          | Włączony domyślnie | ✓               |

##### Element Inspector

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Domyślna zakładka        | Proof (P11)       | ✓ (Switch Tab)   |
| Zakładka Parameters      | Rozwinięta (tylko odczyt + audit trail) | ✓ |
| Zakładka Results         | Rozwinięta (multi-case view + diff) | ✓ |
| Zakładka Contributions   | Rozwinięta        | ✓ (Collapse)     |
| Zakładka Limits          | Rozwinięta (wszystkie marginsy + norma) | ✓ |
| Zakładka Proof (P11)     | Rozwinięta (compliance summary) | ✓     |

##### SLD Viewer

| Element                  | Domyślny stan     | Możliwość zmiany |
|--------------------------|-------------------|------------------|
| Labels                   | All (+ Compliance status) | ✓ (Hide)   |
| Color Scheme             | Compliance-based (OK/VIOLATION) | ✓   |
| Hidden Elements          | None (wszystko widoczne) | ✓           |

#### 3.4.3. Kluczowe funkcje dostępne

- Audyt zgodności (compliance audit),
- Porównanie Case'ów (before/after),
- Eksport Proof (P11) do PDF (z podpisem audytora),
- Audit trail (historia zmian parametrów),
- Multi-case diff view.

---

## 4. PRZEŁĄCZANIE TRYBÓW

### 4.1. UI Selector (BINDING)

MV-DESIGN-PRO **MUST** posiadać **Expert Mode Selector**:

- umiejscowienie: **Global Context Bar** (prawy górny róg),
- format: dropdown menu z ikonami:
  - 🔧 Operator,
  - 📐 Designer,
  - 📊 Analyst,
  - 🔍 Auditor.

### 4.2. Zachowanie stanu przy przełączaniu

Przełączenie trybu **MUST**:

- zachować otwarte elementy (Inspector, Results Browser),
- zmienić domyślne rozwinięcia / widoczność sekcji,
- **NIE** zamykać otwartych widoków,
- **NIE** tracić kontekstu (aktywny Case, Snapshot, Element).

**Przykład**:

- użytkownik w trybie Operator otwiera Element Inspector (zakładka Overview),
- przełącza na tryb Designer,
- Inspector pozostaje otwarty, **ale** domyślna zakładka zmienia się na Parameters.

### 4.3. Zapisywanie preferencji

- **MUST** zapisywać wybrany tryb w profilu użytkownika,
- **MUST** przywracać tryb przy ponownym otwarciu aplikacji,
- **MAY** umożliwiać różne tryby dla różnych projektów.

---

## 5. WPŁYW NA KOMPONENTY UI

### 5.1. Results Browser

#### 5.1.1. Domyślne rozwinięcia

| Tryb       | Domyślne rozwinięcie                     |
|------------|------------------------------------------|
| Operator   | Case → Snapshot                          |
| Designer   | Case → Snapshot → Analysis Run           |
| Analyst    | Wszystkie poziomy                        |
| Auditor    | Wszystkie poziomy                        |

#### 5.1.2. Domyślne kolumny

| Tryb       | Domyślne kolumny                                          |
|------------|-----------------------------------------------------------|
| Operator   | Name, Status, Voltage, Violation                          |
| Designer   | Name, Type, Voltage, I, P, Q, Losses                      |
| Analyst    | Wszystkie podstawowe + Angle, Contributions, Margins      |
| Auditor    | Wszystkie + Timestamp, User, Diff                         |

### 5.2. Element Inspector

#### 5.2.1. Domyślne zakładki

| Tryb       | Domyślna zakładka |
|------------|-------------------|
| Operator   | Overview          |
| Designer   | Parameters        |
| Analyst    | Results           |
| Auditor    | Proof (P11)       |

#### 5.2.2. Edycja parametrów

| Tryb       | Edycja Parameters |
|------------|-------------------|
| Operator   | Wyłączona         |
| Designer   | **Włączona**      |
| Analyst    | Wyłączona         |
| Auditor    | Wyłączona         |

### 5.3. SLD Viewer

#### 5.3.1. Domyślne labels

| Tryb       | Domyślne labels                      |
|------------|--------------------------------------|
| Operator   | Name, Status                         |
| Designer   | Name, Voltage, Type                  |
| Analyst    | All (Name, Voltage, I, P, Q, Angle)  |
| Auditor    | All + Compliance status              |

#### 5.3.2. Color Scheme

| Tryb       | Domyślny schemat kolorów          |
|------------|-----------------------------------|
| Operator   | Status-based (OK/VIOLATION)       |
| Designer   | Voltage-level (kolor = napięcie)  |
| Analyst    | Heatmap (kolor = obciążenie)      |
| Auditor    | Compliance-based (OK/VIOLATION)   |

---

## 6. CUSTOMIZACJA TRYBÓW (OPCJONALNA, SHOULD)

### 6.1. Custom Expert Mode

MV-DESIGN-PRO **SHOULD** umożliwiać tworzenie **Custom Expert Mode**:

- użytkownik wybiera:
  - domyślne rozwinięcia,
  - domyślne kolumny,
  - domyślne zakładki,
  - domyślny schemat kolorów,
- zapisuje jako "My Custom Mode",
- Custom Mode pojawia się w Expert Mode Selector.

### 6.2. Eksport / Import trybów

- **SHOULD** umożliwiać eksport Custom Mode do JSON,
- **SHOULD** umożliwiać import Custom Mode (np. standard firmy).

---

## 7. ZABRONIONE PRAKTYKI

### 7.1. FORBIDDEN

- **FORBIDDEN**: tworzenie „basic UI" i „advanced UI" (dwa osobne interfejsy),
- **FORBIDDEN**: ukrywanie danych w trybach (sekcje muszą być **collapsed**, nie **hidden**),
- **FORBIDDEN**: traktowanie Expert Mode jako access control (wszyscy użytkownicy mają dostęp do wszystkich trybów),
- **FORBIDDEN**: hard-coded preferencje trybów (muszą być konfigurowalne),
- **FORBIDDEN**: utrata kontekstu przy przełączaniu trybów (aktywny Case, Snapshot, Element muszą być zachowane).

---

## 8. ACCESSIBILITY I UX

### 8.1. Keyboard Navigation

- **MUST** obsługiwać Ctrl+Shift+1/2/3/4 (przełączanie trybów: Operator, Designer, Analyst, Auditor),
- **MUST** ogłaszać zmianę trybu przez screen reader.

### 8.2. Visual Feedback

- **MUST** wyświetlać aktywny tryb w Global Context Bar (ikona + nazwa),
- **SHOULD** wyświetlać toast notification przy przełączeniu trybu ("Switched to Designer Mode").

---

## 9. PERFORMANCE

- Przełączenie trybu **MUST** zajmować < 200 ms,
- Zmiana domyślnych rozwinięć **MUST** być płynna (animacja < 300 ms),
- **FORBIDDEN**: przeładowanie całego UI przy przełączeniu trybu.

---

## 10. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **RESULTS_BROWSER_CONTRACT.md**: Results Browser musi reagować na zmianę Expert Mode,
- **ELEMENT_INSPECTOR_CONTRACT.md**: Element Inspector musi reagować na zmianę Expert Mode,
- **GLOBAL_CONTEXT_BAR.md**: Global Context Bar musi wyświetlać aktywny Expert Mode,
- **UI_ETAP_POWERFACTORY_PARITY.md**: Expert Modes muszą spełniać parity z ETAP/PowerFactory.

---

## 11. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
