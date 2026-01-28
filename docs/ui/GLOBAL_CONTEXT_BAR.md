# GLOBAL CONTEXT BAR CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **Global Context Bar** — komponent UI MV-DESIGN-PRO, który:

- **wyświetla aktywny kontekst pracy** (Case, Snapshot, Analysis, Norma, Expert Mode, Element),
- **jest zawsze widoczny** w każdym widoku aplikacji,
- **jest drukowany w nagłówku PDF** przy eksporcie raportów i dowodów P11,
- **umożliwia szybkie przełączanie kontekstu** bez opuszczania bieżącego widoku.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich widoków (Results Browser, Element Inspector, SLD Viewer),
- komponent MUST być widoczny w 100% czasu pracy aplikacji,
- naruszenie kontraktu = regresja wymagająca hotfix.

---

## 2. POZYCJONOWANIE I LAYOUT

### 2.1. Umiejscowienie

Global Context Bar **MUST**:

- znajdować się na **górze ekranu** (top bar),
- być **sticky** (pozostaje widoczny przy scrollowaniu),
- mieć **wysokość stałą** (48-64px, w zależności od rozdzielczości),
- być **widoczny w 100% przypadków** (nigdy ukryty).

### 2.2. Z-index

- **MUST** mieć wyższy `z-index` niż wszystkie inne komponenty UI (z wyjątkiem modali),
- **MUST** być widoczny nawet przy otwartym Element Inspector lub Results Browser.

---

## 3. STRUKTURA KONTEKSTU (BINDING)

Global Context Bar **MUST** zawierać następujące sekcje (w tej kolejności, od lewej do prawej):

1. **Project Name** (nazwa projektu),
2. **Active Case** (aktywny Case),
3. **Active Snapshot** (aktywny Snapshot),
4. **Active Analysis** (aktywna analiza),
5. **Active Norma** (norma bazowa),
6. **Expert Mode** (tryb ekspercki),
7. **Active Element** (fokus na element, opcjonalnie),
8. **Timestamp** (data i czas ostatniego obliczenia).

### 3.1. Sekcja: Project Name

#### 3.1.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Project Name`        | string     | MUST     | Nazwa projektu (max 30 znaków)            |
| `Project Icon`        | icon       | MAY      | Ikona projektu (logo)                     |

#### 3.1.2. Interakcja

- Kliknięcie w `Project Name` **MAY** otworzyć menu:
  - Open Project,
  - Project Settings,
  - Recent Projects.

---

### 3.2. Sekcja: Active Case

#### 3.2.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Case Name`           | string     | MUST     | Nazwa aktywnego Case (max 25 znaków)      |
| `Case Icon`           | icon       | MUST     | 📁 (ikona Case)                           |
| `Case Color`          | color      | MAY      | Kolor identyfikacyjny Case (label)        |

#### 3.2.2. Interakcja

- Kliknięcie w `Case Name` **MUST** otworzyć **dropdown menu** z listą wszystkich Case'ów,
- Wybór Case z menu **MUST** przełączyć aktywny Case (reload Results Browser + Inspector),
- **MUST** wyświetlać wskaźnik liczby Case'ów (np. "Case 1 of 5").

---

### 3.3. Sekcja: Active Snapshot

#### 3.3.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Snapshot Name`       | string     | MUST     | Nazwa aktywnego Snapshot (max 25 znaków)  |
| `Snapshot Icon`       | icon       | MUST     | 📸 (ikona Snapshot)                       |
| `Snapshot Tag`        | enum       | MAY      | Tag: "baseline", "variant", "scenario"    |

#### 3.3.2. Interakcja

- Kliknięcie w `Snapshot Name` **MUST** otworzyć **dropdown menu** z listą Snapshot'ów dla aktywnego Case,
- Wybór Snapshot z menu **MUST** przełączyć aktywny Snapshot (reload Results Browser + Inspector),
- **MUST** wyświetlać timestamp Snapshot (data utworzenia).

---

### 3.4. Sekcja: Active Analysis

#### 3.4.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Analysis Type`       | enum       | MUST     | LF, SC, Proof, Sensitivity, Contingency   |
| `Analysis Icon`       | icon       | MUST     | Ikona zależna od typu analizy             |
| `Analysis Status`     | enum       | MUST     | Success, Warning, Error, Partial          |

#### 3.4.2. Ikony analiz (BINDING)

| Analysis Type         | Ikona      |
|-----------------------|------------|
| Load Flow (LF)        | ⚡          |
| Short-Circuit (SC)    | ⚠️          |
| Proof (P11)           | 📋          |
| Sensitivity Analysis  | 📊          |
| Contingency (N-1)     | 🔀          |

#### 3.4.3. Interakcja

- Kliknięcie w `Analysis Type` **MUST** otworzyć **dropdown menu** z listą dostępnych analiz,
- Wybór analizy z menu **MUST** przełączyć aktywną analizę (reload Results Browser),
- **MUST** wyświetlać timestamp ostatniego uruchomienia analizy.

---

### 3.5. Sekcja: Active Norma

#### 3.5.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Norma Name`          | enum       | MUST     | PN-EN 50160, NEC 2023, IEC 60909, etc.    |
| `Norma Icon`          | icon       | MUST     | 📖 (ikona normy)                          |
| `Norma Version`       | string     | MAY      | Wersja normy (np. "2021")                 |

#### 3.5.2. Interakcja

- Kliknięcie w `Norma Name` **MUST** otworzyć **dropdown menu** z listą dostępnych norm,
- Wybór normy z menu **MUST** przełączyć aktywną normę (reload Limits w Inspector),
- **MUST** wyświetlać tooltip z pełną nazwą normy i wersją.

---

### 3.6. Sekcja: Expert Mode

#### 3.6.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Mode Name`           | enum       | MUST     | Operator, Designer, Analyst, Auditor      |
| `Mode Icon`           | icon       | MUST     | 🔧, 📐, 📊, 🔍 (zależne od trybu)         |

#### 3.6.2. Interakcja

- Kliknięcie w `Mode Name` **MUST** otworzyć **dropdown menu** z listą trybów eksperckich,
- Wybór trybu z menu **MUST** przełączyć Expert Mode (zmiana domyślnych rozwinięć, widoczności sekcji),
- **MUST** wyświetlać tooltip z opisem trybu (np. "Designer: full access to parameters, editing enabled").

---

### 3.7. Sekcja: Active Element (opcjonalna)

#### 3.7.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Element ID`          | string     | MAY      | ID elementu (np. "BUS-123")               |
| `Element Name`        | string     | MAY      | Nazwa elementu (max 20 znaków)            |
| `Element Type`        | enum       | MAY      | BUS, LINE, TRAFO, SOURCE, PROTECTION      |
| `Element Icon`        | icon       | MAY      | Ikona zależna od typu elementu            |

#### 3.7.2. Widoczność

- **MUST** być widoczna **tylko** gdy Element Inspector jest otwarty,
- **MUST** być ukryta, gdy Element Inspector jest zamknięty.

#### 3.7.3. Interakcja

- Kliknięcie w `Element Name` **SHOULD** podświetlić element na SLD (jeśli widoczny),
- Kliknięcie ikony "❌" **MUST** zamknąć Element Inspector (ukrycie sekcji Active Element).

---

### 3.8. Sekcja: Timestamp

#### 3.8.1. Wyświetlanie

| Element               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Last Calculation`    | datetime   | MUST     | Data i czas ostatniego obliczenia         |
| `Time Elapsed`        | duration   | MAY      | Czas od ostatniego obliczenia (np. "2h ago") |

#### 3.8.2. Formatowanie

- **MUST** wyświetlać timestamp w formacie ISO 8601 (YYYY-MM-DD HH:MM:SS),
- **SHOULD** wyświetlać tooltip z pełnym timestampem i compute time.

---

## 4. SYNCHRONIZACJA Z KOMPONENTAMI UI

### 4.1. Results Browser

Zmiana kontekstu w Results Browser (kliknięcie w Case, Snapshot, Analysis) **MUST**:

- automatycznie zaktualizować odpowiednią sekcję w Global Context Bar,
- **NIE** powodować przeładowania całego UI (tylko aktualizacja kontekstu).

### 4.2. Element Inspector

Otwarcie Element Inspector **MUST**:

- dodać sekcję **Active Element** do Global Context Bar,
- wyświetlić nazwę i typ elementu w Context Bar.

Zamknięcie Element Inspector **MUST**:

- ukryć sekcję **Active Element** w Context Bar.

### 4.3. SLD Viewer

Kliknięcie elementu na SLD **MUST**:

- otworzyć Element Inspector,
- zaktualizować sekcję **Active Element** w Context Bar.

---

## 5. EKSPORT DO PDF — NAGŁÓWEK

### 5.1. Wymagania (BINDING)

Global Context Bar **MUST** być drukowany w nagłówku PDF przy eksporcie:

- raportów wyników (Results Browser → Export to PDF),
- dowodów P11 (Element Inspector → Proof tab → Export to PDF),
- raportów porównawczych (Case comparison → Export to PDF).

### 5.2. Format nagłówka PDF

Nagłówek PDF **MUST** zawierać:

```
─────────────────────────────────────────────────────────────────────
MV-DESIGN-PRO — Analysis Report
─────────────────────────────────────────────────────────────────────
Project:       [Project Name]
Case:          [Case Name]
Snapshot:      [Snapshot Name] (Timestamp: [YYYY-MM-DD HH:MM:SS])
Analysis:      [Analysis Type] (Status: [Success/Warning/Error])
Norma:         [Norma Name] ([Version])
Expert Mode:   [Mode Name]
Generated:     [YYYY-MM-DD HH:MM:SS]
User:          [Username]
─────────────────────────────────────────────────────────────────────
```

### 5.3. Lokalizacja nagłówka

- **MUST** pojawić się na **pierwszej stronie** raportu PDF,
- **SHOULD** pojawić się jako **footer** na każdej stronie (skrócona wersja):
  - `Project: [Name] | Case: [Name] | Analysis: [Type] | Page [X] of [Y]`.

---

## 6. RESPONSIVE DESIGN

### 6.1. Desktop (≥ 1280px)

- Wszystkie sekcje widoczne,
- Pełne nazwy (max 30 znaków),
- Ikony + tekst.

### 6.2. Tablet (768px – 1279px)

- Wszystkie sekcje widoczne,
- Skrócone nazwy (max 20 znaków),
- Ikony + tekst (mniejsza czcionka).

### 6.3. Mobile (< 768px)

- **MUST** wyświetlać Context Bar jako **collapsible drawer** (domyślnie zwinięty),
- Kliknięcie ikony hamburgera **MUST** rozwinąć Context Bar,
- Widoczne tylko najważniejsze sekcje:
  - Case,
  - Snapshot,
  - Analysis,
  - Expert Mode.

---

## 7. ACCESSIBILITY I UX

### 7.1. Keyboard Navigation

- **MUST** obsługiwać Tab (nawigacja między sekcjami),
- **MUST** obsługiwać Enter (otwarcie dropdown menu),
- **MUST** obsługiwać Arrow keys (nawigacja w dropdown menu),
- **MUST** obsługiwać Esc (zamknięcie dropdown menu).

### 7.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich sekcji,
- **MUST** ogłaszać zmiany kontekstu przez screen reader (np. "Case changed to Case 2").

### 7.3. Visual Feedback

- **MUST** podświetlać aktywną sekcję przy interakcji (hover, focus),
- **MUST** wyświetlać tooltip z pełnymi informacjami przy hover,
- **SHOULD** wyświetlać animację przy zmianie kontekstu (fade-in/out, max 200ms).

---

## 8. PERFORMANCE

### 8.1. Wymagania wydajnościowe (BINDING)

- Zmiana kontekstu (Case, Snapshot, Analysis) **MUST** zajmować < 300 ms,
- Aktualizacja Context Bar **MUST** być synchroniczna z interakcją użytkownika,
- **FORBIDDEN**: opóźnienie > 100 ms między kliknięciem a zmianą kontekstu w Context Bar.

### 8.2. Cachowanie

- **MUST** cachować listę Case'ów, Snapshot'ów, Analiz w pamięci,
- **MUST** aktualizować cache tylko przy zmianie projektu lub nowym obliczeniu.

---

## 9. ZABRONIONE PRAKTYKI

### 9.1. FORBIDDEN

- **FORBIDDEN**: ukrywanie Context Bar "dla uproszczenia" — zawsze widoczny,
- **FORBIDDEN**: pomijanie sekcji kontekstu w eksporcie PDF,
- **FORBIDDEN**: brak synchronizacji Context Bar z Results Browser / Inspector,
- **FORBIDDEN**: hard-coded wartości kontekstu — wszystkie dane z modelu.

---

## 10. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **RESULTS_BROWSER_CONTRACT.md**: Context Bar musi być synchronizowany z Results Browser,
- **ELEMENT_INSPECTOR_CONTRACT.md**: Context Bar musi wyświetlać Active Element przy otwartym Inspector,
- **EXPERT_MODES_CONTRACT.md**: Context Bar musi wyświetlać aktywny Expert Mode,
- **UI_ETAP_POWERFACTORY_PARITY.md**: Context Bar musi spełniać parity z ETAP/PowerFactory.

---

## 11. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
