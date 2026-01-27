# P11.1d — Proof Inspector UI + Eksport

**STATUS: REFERENCE (prospektywny)**
**Version:** 1.0
**Reference:** P11_OVERVIEW.md, P11_1a_MVP_SC3F_AND_VDROP.md

---

## 1. Cel i zakres

### 1.1 Definicja

Proof Inspector UI to interfejs użytkownika do:
- Przeglądania dokumentów dowodowych (ProofDocument)
- Nawigacji po krokach dowodu
- Eksportu do formatów: LaTeX, PDF, DOCX, Markdown

### 1.2 Czym NIE jest Proof Inspector

| NIE jest | Uzasadnienie |
|----------|--------------|
| Edytorem | Dowód jest READ-ONLY |
| Kalkulatorem | Nie wykonuje obliczeń (tylko prezentuje) |
| Walidatorem | Nie sprawdza zgodności z normami |

---

## 2. Struktura UI — Proof Inspector

### 2.1 Lokalizacja w aplikacji

```
Results (Wyniki)
  └── [Wybrany Case]
        └── [Wybrany Run]
              ├── Wyniki (tabela)
              ├── Ślad obliczeń (TraceArtifact)
              └── Dowód matematyczny ← TUTAJ (Proof Inspector)
```

### 2.2 Layout główny

```
┌─────────────────────────────────────────────────────────────────┐
│ Dowód matematyczny: [Nazwa Case] / [Run timestamp]        [×]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────────────────────────────────┐ │
│ │ Spis kroków   │ │                                           │ │
│ │               │ │  KROK 4: Początkowy prąd zwarciowy        │ │
│ │ 1. Napięcie   │ │                                           │ │
│ │ 2. Z źródła   │ │  ┌─────────────────────────────────────┐  │ │
│ │ 3. Z Thevenin │ │  │ WZÓR                                │  │ │
│ │►4. I_k''      │ │  │                                     │  │ │
│ │ 5. κ          │ │  │       c · U_n                       │  │ │
│ │ 6. i_p        │ │  │ I_k'' = ─────────────               │  │ │
│ │ 7. S_k''      │ │  │        √3 · |Z_th|                  │  │ │
│ │               │ │  │                                     │  │ │
│ │               │ │  └─────────────────────────────────────┘  │ │
│ │               │ │                                           │ │
│ │               │ │  ┌─────────────────────────────────────┐  │ │
│ │               │ │  │ DANE                                │  │ │
│ │               │ │  │ c = 1.1                             │  │ │
│ │               │ │  │ U_n = 15.0 kV                       │  │ │
│ │               │ │  │ Z_th = 0.5 + j2.0 Ω                 │  │ │
│ │               │ │  │ |Z_th| = 2.06 Ω                     │  │ │
│ │               │ │  └─────────────────────────────────────┘  │ │
│ │               │ │                                           │ │
│ │               │ │  ┌─────────────────────────────────────┐  │ │
│ │               │ │  │ PODSTAWIENIE                        │  │ │
│ │               │ │  │         1.1 · 15.0                  │  │ │
│ │               │ │  │ I_k'' = ───────────── = 4.62 kA     │  │ │
│ │               │ │  │         √3 · 2.06                   │  │ │
│ │               │ │  └─────────────────────────────────────┘  │ │
│ │               │ │                                           │ │
│ │               │ │  ┌─────────────────────────────────────┐  │ │
│ │               │ │  │ WYNIK                               │  │ │
│ │               │ │  │ I_k'' = 4.62 kA                     │  │ │
│ │               │ │  └─────────────────────────────────────┘  │ │
│ │               │ │                                           │ │
│ │               │ │  ┌─────────────────────────────────────┐  │ │
│ │               │ │  │ WERYFIKACJA JEDNOSTEK           ✓  │  │ │
│ │               │ │  │ kV / Ω = kA                         │  │ │
│ │               │ │  └─────────────────────────────────────┘  │ │
│ └───────────────┘ └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [Eksportuj ▼]  [◄ Poprzedni]  [Następny ►]  [Podsumowanie]      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Sekcje kroku dowodu (BINDING)

| Sekcja | Zawartość | Styl |
|--------|-----------|------|
| **WZÓR** | Równanie w notacji matematycznej | LaTeX rendered |
| **DANE** | Lista wartości wejściowych z jednostkami | Tabela |
| **PODSTAWIENIE** | Wzór z podstawionymi wartościami | LaTeX rendered |
| **WYNIK** | Wartość końcowa z jednostką | Wyróżniony |
| **WERYFIKACJA JEDNOSTEK** | Status ✓/✗ + ścieżka derywacji | Mały tekst |

---

## 3. Nawigacja

### 3.1 Elementy nawigacji

| Element | Akcja |
|---------|-------|
| Spis kroków (lewy panel) | Kliknięcie → przejście do kroku |
| ◄ Poprzedni | Poprzedni krok |
| Następny ► | Następny krok |
| Podsumowanie | Widok zbiorczy wyników |

### 3.2 Stan aktywnego kroku

```typescript
interface ProofInspectorState {
  documentId: string;
  currentStepIndex: number;  // 0-based
  viewMode: "step" | "summary";
}
```

### 3.3 Skróty klawiszowe

| Skrót | Akcja |
|-------|-------|
| `←` / `→` | Poprzedni / następny krok |
| `Home` | Pierwszy krok |
| `End` | Podsumowanie |
| `Esc` | Zamknij Proof Inspector |

---

## 4. Widok podsumowania

### 4.1 Layout podsumowania

```
┌─────────────────────────────────────────────────────────────────┐
│ PODSUMOWANIE DOWODU                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Typ obliczenia:    Zwarcie trójfazowe IEC 60909                │
│  Miejsce zwarcia:   B2 (Szyna 15 kV)                            │
│  Współczynnik c:    1.1 (c_max)                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ WYNIKI GŁÓWNE                                             │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Wielkość          │ Symbol    │ Wartość   │ Jednostka     │  │
│  ├───────────────────┼───────────┼───────────┼───────────────┤  │
│  │ Prąd początkowy   │ I_k''     │ 4.62      │ kA            │  │
│  │ Prąd udarowy      │ i_p       │ 11.76     │ kA            │  │
│  │ Moc zwarciowa     │ S_k''     │ 120.0     │ MVA           │  │
│  │ Współczynnik κ    │ κ         │ 1.80      │ —             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ STATUS WERYFIKACJI                                        │  │
│  │ Wszystkie jednostki poprawne: ✓                           │  │
│  │ Liczba kroków: 7                                          │  │
│  │ Ostrzeżenia: brak                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Eksport — kontrakty

### 5.1 Formaty eksportu (BINDING)

| Format | Rozszerzenie | Opis |
|--------|--------------|------|
| **LaTeX** | `.tex` | Kod źródłowy LaTeX |
| **PDF** | `.pdf` | Dokument PDF (via LaTeX) |
| **DOCX** | `.docx` | Microsoft Word |
| **Markdown** | `.md` | Markdown z MathJax |

### 5.2 Kontrakt eksportu

```typescript
interface ExportRequest {
  documentId: string;
  format: "latex" | "pdf" | "docx" | "markdown";
  options: ExportOptions;
}

interface ExportOptions {
  includeHeader: boolean;      // nagłówek z metadanymi
  includeSteps: boolean;       // wszystkie kroki (domyślnie true)
  includeSummary: boolean;     // podsumowanie (domyślnie true)
  language: "pl" | "en";       // język (domyślnie "pl")
  paperSize: "a4" | "letter";  // rozmiar strony (domyślnie "a4")
}

interface ExportResponse {
  success: boolean;
  fileUrl: string | null;      // URL do pobrania
  error: string | null;
}
```

### 5.3 Endpoint API

```
POST /api/proofs/{document_id}/export
Content-Type: application/json

{
  "format": "pdf",
  "options": {
    "includeHeader": true,
    "includeSteps": true,
    "includeSummary": true,
    "language": "pl",
    "paperSize": "a4"
  }
}

Response:
{
  "success": true,
  "fileUrl": "/api/exports/abc123.pdf"
}
```

---

## 6. Tryb read-only (BINDING)

### 6.1 Dozwolone akcje

| Akcja | Dozwolona |
|-------|-----------|
| Przeglądanie kroków | TAK |
| Nawigacja między krokami | TAK |
| Kopiowanie wartości | TAK |
| Eksport do pliku | TAK |
| Drukowanie | TAK |

### 6.2 Niedozwolone akcje

| Akcja | Dozwolona | Uzasadnienie |
|-------|-----------|--------------|
| Edycja wartości | **NIE** | Dowód jest niemutowalny |
| Dodawanie kroków | **NIE** | Struktura z generatora |
| Usuwanie kroków | **NIE** | Struktura z generatora |
| Ponowne obliczenie | **NIE** | Wymaga nowego Run |

---

## 7. Komponenty UI (specyfikacja)

### 7.1 ProofInspector (główny komponent)

```typescript
interface ProofInspectorProps {
  documentId: string;
  onClose: () => void;
}

// Stan wewnętrzny
interface ProofInspectorState {
  document: ProofDocument | null;
  loading: boolean;
  error: string | null;
  currentStepIndex: number;
  viewMode: "step" | "summary";
}
```

### 7.2 StepView (widok kroku)

```typescript
interface StepViewProps {
  step: ProofStep;
  stepNumber: number;
  totalSteps: number;
}
```

### 7.3 SummaryView (widok podsumowania)

```typescript
interface SummaryViewProps {
  document: ProofDocument;
}
```

### 7.4 ExportMenu (menu eksportu)

```typescript
interface ExportMenuProps {
  documentId: string;
  onExportStart: () => void;
  onExportComplete: (result: ExportResponse) => void;
}
```

---

## 8. Dostępność (a11y)

### 8.1 Wymagania

| Wymaganie | Opis |
|-----------|------|
| Nawigacja klawiaturą | Pełna obsługa bez myszy |
| Screen reader | Opisy dla wzorów matematycznych |
| Kontrast | WCAG AA (min 4.5:1) |
| Focus visible | Widoczny fokus na elementach |

### 8.2 ARIA labels

```html
<div role="region" aria-label="Krok dowodu 4 z 7">
  <section aria-labelledby="formula-heading">
    <h3 id="formula-heading">Wzór</h3>
    <math aria-label="I k prim prim równa się c razy U n dzielone przez pierwiastek z 3 razy moduł Z th">
      ...
    </math>
  </section>
</div>
```

---

## 9. Definition of Done (DoD)

### 9.1 P11.1d — DoD

| Kryterium | Status |
|-----------|--------|
| Layout Proof Inspector zdefiniowany | SPEC |
| Sekcje kroku (Wzór/Dane/Podstawienie/Wynik/Weryfikacja) opisane | SPEC |
| Nawigacja (spis, przyciski, skróty) opisana | SPEC |
| Widok podsumowania opisany | SPEC |
| Kontrakty eksportu (LaTeX/PDF/DOCX/Markdown) zdefiniowane | SPEC |
| Tryb read-only udokumentowany | SPEC |
| Komponenty UI wyspecyfikowane | SPEC |
| Wymagania dostępności (a11y) opisane | SPEC |

---

**END OF P11.1d**
