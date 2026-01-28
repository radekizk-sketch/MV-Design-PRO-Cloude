# SLD UI CONTRACT: Zasady priorytetów i renderowania (CANONICAL)

**Status:** CANONICAL (BINDING)
**Wersja:** 1.0
**Data:** 2026-01-28
**Referencje:**
- `SLD_SCADA_CAD_CONTRACT.md` — kontrakt widoku SLD
- `SLD_SHORT_CIRCUIT_BUS_CENTRIC.md` — wyniki zwarciowe
- `SHORT_CIRCUIT_PANELS_AND_PRINTING.md` — wydruk
- `sld_rules.md` — podstawowe reguły SLD

---

## 1. Cel i zakres dokumentu

Niniejszy dokument definiuje **wiążące kontrakty UI** dla warstwy prezentacji wyników i danych na diagramie SLD (Single Line Diagram).

**Problemy rozwiązywane przez ten dokument:**
1. Konflikty priorytetów między danymi CAD, wynikami analiz i stanem operacyjnym,
2. Zasady renderowania w warunkach dużej gęstości elementów,
3. Semantyka kolorów (co oznacza kolor, a co element),
4. Gwarancje drukowalności (print-first),
5. Kontrakty interakcji (hover, click, ESC).

**Dokument jest BINDING dla:**
- implementacji SLD renderer (frontend),
- logiki overlay wyników,
- logiki wydruku (PDF/DOCX),
- wszystkich dokumentów UI referencyjnych.

---

## 2. Terminologia (BINDING)

| Termin | Definicja | Przykład |
|--------|-----------|----------|
| **UI Priority Stack** | Hierarchia ważności wizualnej danych: BUS > LINIA > CAD | Wyniki BUS zawsze na wierzchu |
| **Dense SLD** | Diagram o wysokiej gęstości elementów (>10 elementów/ekran) | Typowa stacja 110/15 kV |
| **INLINE label** | Etykieta umieszczona bezpośrednio na elemencie | Domyślny tryb |
| **OFFSET label** | Etykieta z leader line (linia wiodąca) | Automatyczny fallback przy kolizji |
| **SIDE STACK** | Tabela boczna z etykietami, numery na diagramie | Tryb audytu/wydruku |
| **Semantic Color** | Kolor oznacza znaczenie (przeciążenie, błąd), nie typ elementu | Czerwony = alarm |
| **Print-first** | Zasada: to, co w UI, musi być drukowalne bez utraty informacji | Ekran = PDF = prawda |
| **Interaction Contract** | Gwarancje zachowania UI przy hover/click/ESC | Hover nie zmienia stanu |

---

## 3. Kontrakt #1: UI Priority Stack

### 3.1 Definicja

**CANONICAL:**

> W przypadku konfliktu wizualnego między warstwami danych obowiązuje następująca hierarchia priorytetów:
>
> **BUS (wyniki zwarciowe, stan) > LINIA (prąd roboczy) > CAD (parametry katalogowe)**

### 3.2 Reguły aplikacji

**MUST:**

| Priorytet | Element | Co ZAWSZE widoczne | Nie można ukryć |
|-----------|---------|-------------------|----------------|
| **1. BUS** | Wyniki zwarciowe (`Ik″`, `ip`, `Ith`, `Sk″`) | ✓ | ✓ (absolutny priorytet) |
| | Stan operacyjny (U, f, kolor loading) | ✓ | ✓ |
| **2. LINIA** | Prąd roboczy `I` [A] | ✓ | ✓ |
| | Kierunek przepływu (strzałka) | ✓ | Można ukryć w trybie MODEL_EDIT |
| **3. CAD** | Typ, długość, R/X/B | ✓ w RESULT_VIEW | Może być ukryty w MODEL_EDIT |
| | Przekrój, materiał | ✓ w RESULT_VIEW | Fallback: SIDE STACK |

**FORBIDDEN:**

- Ukrywanie wyników BUS w trybie RESULT_VIEW (zawsze widoczne).
- Przesuwanie wyników BUS do SIDE STACK (tylko INLINE/OFFSET dozwolone).
- Ukrywanie prądu roboczego linii w RESULT_VIEW.
- Kolizja etykiet CAD z wynikami BUS (CAD ustępuje miejsca).

### 3.3 Rozstrzyganie konfliktów wizualnych

**BINDING:**

Jeśli na diagramie występuje kolizja (nakładanie się etykiet):

```
┌─────────────────────────────────────────────────────┐
│ 1. Sprawdź priorytet (BUS > LINIA > CAD)            │
│    ↓                                                 │
│ 2. Element o wyższym priorytecie ZAWSZE widoczny    │
│    ↓                                                 │
│ 3. Element o niższym priorytecie:                   │
│    - Przesuń (OFFSET leader)                        │
│    - Jeśli nadal kolizja → SIDE STACK               │
└─────────────────────────────────────────────────────┘
```

### 3.4 Przykład: Kolizja BUS + CAD

**Scenariusz:** Wyniki zwarciowe `Ik″` nakładają się na etykietę CAD (typ szyny).

**Rozwiązanie:**

```
════════════════════════════════════════════════════════════
   Szyna SN-01 | 15 kV                         [SCADA]
   ───────────────────────────────────────────────────────
   Ik″ = 12.5 kA  │  ip = 32.8 kA  │  Sk″ = 325 MVA
   ───────────────────────────────────────────────────────
   ↑ PRIORYTET 1: Wyniki BUS (ZAWSZE widoczne)

                     ┌─────────────────────┐
          ╭─ ─ ─ ─ ─ │ Typ: Główna         │
          │          │ Izolowana           │
══════════┴══════════┴─────────────────────┴══════════════
                     ↑ PRIORYTET 3: CAD (przesunięty OFFSET)
```

---

## 4. Kontrakt #2: Dense SLD Rules

### 4.1 Definicja Dense SLD

**CANONICAL:**

> Dense SLD to diagram o gęstości elementów przekraczającej próg czytelności:
>
> **Gęstość = liczba elementów / powierzchnia ekranu > 0.10 elem/cm²**

### 4.2 Strategia renderowania

**BINDING:**

System automatycznie dostosowuje strategię renderowania do gęstości diagramu:

| Gęstość | Próg | Strategia etykiet CAD | Strategia wyników BUS |
|---------|------|-----------------------|----------------------|
| **Niska** | < 0.05 | INLINE (domyślnie) | INLINE |
| **Średnia** | 0.05 – 0.10 | INLINE → OFFSET (auto) | INLINE |
| **Wysoka** | 0.10 – 0.20 | OFFSET (auto) | INLINE (priorytet) |
| **Ekstremalna** | > 0.20 | SIDE STACK (wymuszony) | INLINE (priorytet absolutny) |

### 4.3 Automatyczne przełączanie trybów

**MUST:**

System oblicza `collision_ratio` (procent etykiet nakładających się) i przełącza tryby:

```python
def select_rendering_strategy(diagram):
    density = calculate_density(diagram)  # elem/cm²
    collision_ratio = calculate_collision_ratio(diagram)

    if density < 0.05 and collision_ratio < 0.30:
        return RenderStrategy.INLINE
    elif density < 0.10 and collision_ratio < 0.50:
        return RenderStrategy.OFFSET
    else:
        return RenderStrategy.SIDE_STACK
```

**FORBIDDEN:**

- Ukrywanie wyników BUS niezależnie od gęstości (zawsze widoczne).
- Zmiana strategii dla wyników BUS (zawsze INLINE lub OFFSET, nigdy SIDE STACK).

### 4.4 Przykład: Dense SLD z SIDE STACK

```
┌───────────────────────────────────┬─────────────────────────┐
│ Diagram (gęstość: 0.25 elem/cm²) │ Tabela CAD parametrów   │
│                                   │                         │
│   ════╦════════════════╦════      │ ID  │ Element │ L [km] │
│       ║                ║          │ ────┼─────────┼────────│
│     [L-12]          [L-15]        │ L-12│ Linia   │ 3.2    │
│       ║                ║          │     │ R=0.124 │        │
│    Ik″=12.5 kA    Ik″=8.3 kA      │ L-15│ Linia   │ 1.8    │
│       ↑                ↑          │     │ R=0.206 │        │
│     BUS-01          BUS-02        │     │         │        │
│   (priorytet 1)   (priorytet 1)   │     │         │        │
└───────────────────────────────────┴─────────────────────────┘
```

---

## 5. Kontrakt #3: Semantic Color Contract

### 5.1 Zasada fundamentalna

**CANONICAL:**

> Kolor w SLD oznacza **znaczenie** (stan, wynik, alarm), a nie **typ elementu**.

**MUST:**

- Kolor czerwony = przeciążenie, błąd, alarm (niezależnie od typu elementu).
- Kolor zielony = stan normalny, w zakresie dopuszczalnym.
- Kolor żółty = ostrzeżenie, zbliżenie się do limitu.
- Kolor szary = `in_service=False` (element wyłączony).

**FORBIDDEN:**

- Kolorowanie typu elementu (np. "linie zawsze niebieskie, transformatory zawsze czerwone").
- Używanie kolorów bez semantyki (np. "niebieski bo ładnie wygląda").
- Mieszanie semantyk kolorów (np. czerwony = przeciążenie + typ transformatora).

### 5.2 Mapa kolorów semantycznych (BINDING)

#### 5.2.1 CAD (warstwa techniczna)

| Element | Kolor domyślny | Semantyka |
|---------|----------------|-----------|
| Szyna | Neutralny (czarny/ciemny) | Brak stanu operacyjnego |
| Linia | Neutralny (czarny/ciemny) | Brak stanu operacyjnego |
| Transformator | Neutralny (czarny/ciemny) | Brak stanu operacyjnego |
| Tekst CAD | Neutralny (czarny) | Parametry katalogowe |

#### 5.2.2 Wyniki (warstwa SCADA)

| Wynik | Kolor | Semantyka |
|-------|-------|-----------|
| **Loading < 80%** | **Zielony** | Stan normalny |
| **80% ≤ Loading < 100%** | **Żółty** | Ostrzeżenie (zbliżenie do limitu) |
| **Loading ≥ 100%** | **Czerwony** | Przeciążenie (błąd) |
| **Napięcie poza zakresem** | **Czerwony** | Naruszenie limitu napięcia |
| **Ik″ > 25 kA** | **Czerwony** | Wysoki prąd zwarciowy |
| **Ik″ < 5 kA** | **Zielony** | Niski prąd zwarciowy |

#### 5.2.3 Stany operacyjne

| Stan | Kolor | Semantyka |
|------|-------|-----------|
| `in_service=True` | Normalny (kolorowy) | Element aktywny |
| `in_service=False` | **Szary** | Element wyłączony |
| Wysoki kontrast (wyniki) | Wysokokontrastowy (np. żółty tekst na czarnym) | Czytelność wyników |

### 5.3 Reguły aplikacji kolorów

**MUST:**

1. **Priorytet semantyczny:** Jeśli element ma jednocześnie kolor CAD i kolor wyniku → **kolor wyniku ma priorytet**.
2. **Konsystencja:** Ten sam stan = ten sam kolor (np. loading 85% zawsze żółty, niezależnie od typu elementu).
3. **Wysoki kontrast:** Wyniki muszą być czytelne na wydruku monochromatycznym (zastępowanie kolorów wzorami).

**FORBIDDEN:**

- Kolor czerwony dla elementu w stanie normalnym.
- Kolor zielony dla elementu przeciążonego.
- Użycie kolorów dekoracyjnych bez semantyki.

### 5.4 Przykład: Semantyka kolorów w praktyce

```
════════════════════════════════════════════════════════════
   Szyna SN-01 | 15 kV | U = 14.85 kV
   [KOLOR: Zielony] ← Stan normalny (U w zakresie)
────────────────────────────────────────────────────────────
             │
             │  Linia L-12
             │  I = 125 A → [KOLOR: Żółty] ← Loading 85%
             │
════════════════════════════════════════════════════════════
   Szyna SN-02 | 15 kV | U = 13.2 kV
   [KOLOR: Czerwony] ← Naruszenie limitu (U < 0.9 Un)
════════════════════════════════════════════════════════════
```

### 5.5 Alarmy i limity (definicje)

**BINDING:**

| Wielkość | Limit ostrzeżenia (żółty) | Limit błędu (czerwony) |
|----------|---------------------------|------------------------|
| **Loading linii** | 80% ≤ L < 100% | L ≥ 100% |
| **Loading transformatora** | 80% ≤ L < 100% | L ≥ 100% |
| **Napięcie BUS** | 0.9 Un ≤ U < 0.95 Un lub 1.05 Un < U ≤ 1.10 Un | U < 0.9 Un lub U > 1.10 Un |
| **Prąd zwarciowy** | 15 kA ≤ Ik″ < 25 kA | Ik″ ≥ 25 kA |

---

## 6. Kontrakt #4: Print-First Contract

### 6.1 Zasada fundamentalna

**CANONICAL:**

> To, co widoczne w UI, **MUSI być drukowalne** na PDF/DOCX bez utraty informacji.
>
> **Ekran = PDF = prawda projektu**

### 6.2 Gwarancje drukowalności

**MUST:**

1. **Wszystkie wyniki BUS** widoczne na ekranie → widoczne w PDF (żadne auto-hide).
2. **Wszystkie prądy robocze linii** widoczne na ekranie → widoczne w PDF.
3. **Wszystkie etykiety CAD** widoczne na ekranie → widoczne w PDF (tryb INLINE/OFFSET/SIDE STACK zachowany).
4. **Kolory semantyczne** → zachowane w PDF (lub zastąpione wzorami, jeśli drukarka monochromatyczna).
5. **Tabele boczne** (SIDE STACK) → pełne w PDF (nie obcięte).

**FORBIDDEN:**

- Auto-hide wyników na wydruku (np. "ukryj szczegóły w PDF").
- Zmiana trybów etykiet przy wydruku (np. INLINE → SIDE STACK bez zgody użytkownika).
- Pomijanie elementów "zbyt małych" (wszystko musi być widoczne).
- Ukrywanie wyników BUS na wydruku (absolutny zakaz).

### 6.3 Format wydruku (BINDING)

**Strona PDF zawiera (MUST):**

```
┌─────────────────────────────────────────────────────────┐
│ NAGŁÓWEK (powtarzany na każdej stronie)                 │
│ - Tytuł projektu                                        │
│ - Data wygenerowania                                    │
│ - Autor                                                 │
│ - Case (jeśli wyniki zwarciowe: MAX / MIN / N-1)       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ DIAGRAM SLD                                              │
│ - Fragment SLD (jeśli duży → podział na strony)         │
│ - SCADA + CAD overlay (zgodnie z ekranem)               │
│ - Legenda kolorów i symboli                             │
│ - Wyniki BUS: ZAWSZE widoczne (inline/offset)           │
│ - Prądy linii: ZAWSZE widoczne                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ TABELA WYNIKÓW (jeśli RESULT_VIEW)                      │
│ - Tabela BUS → Ik″ / ip / Ith / Sk″                     │
│ - Tabela wkładów (contributions)                        │
│ - Metadane (norma IEC 60909, snapshot ID, trace_id)    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ STOPKA (powtarzana na każdej stronie)                   │
│ - Numer strony                                          │
│ - Link do trace (opcjonalnie)                           │
└─────────────────────────────────────────────────────────┘
```

### 6.4 Wielostronicowość

**MUST:**

- Podział na strony według **logicznych sekcji** (np. jedna strona = jeden poziom napięcia).
- Oznaczenie kontynuacji (strzałki "→ ciąg dalszy na stronie X").
- Powtórzenie nagłówka na każdej stronie.

**FORBIDDEN:**

- Cięcie elementów w połowie (np. transformator na dwóch stronach).
- Brak informacji o kontynuacji (użytkownik nie wie, że jest strona 2).

### 6.5 Druk monochromatyczny

**MUST:**

Jeśli drukarka nie obsługuje kolorów:

| Kolor UI | Zastąpienie monochromatyczne |
|----------|------------------------------|
| Zielony | Biały/jasny z obramowaniem |
| Żółty | Przekreślenie ukośne (///) |
| Czerwony | Wzór kratka (###) |
| Szary | Szary (poziom jasności) |

### 6.6 Przykład: Wydruk BUS z wynikami (MUST be readable)

```
PDF (A4, monochromatyczny):

┌─────────────────────────────────────────────────────────┐
│ Projekt: Stacja SN-01        Data: 2026-01-28 12:30:45 │
│ Case: MAX (3F)                                          │
└─────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════
   Szyna SN-01 | 15 kV
   ───────────────────────────────────────────────────────
   Ik″ = 12.5 kA  │  ip = 32.8 kA  │  Sk″ = 325 MVA
   ───────────────────────────────────────────────────────
   [###] ← Wzór kratka (kolor czerwony w UI = wysoki Ik″)
════════════════════════════════════════════════════════════
```

---

## 7. Kontrakt #5: Interaction Contract

### 7.1 Zasada fundamentalna

**CANONICAL:**

> Interakcja użytkownika z UI **MUSI być przewidywalna i deterministyczna**.
>
> **Hover = informacja (bez zmiany stanu)**
> **Click = fokus BUS + panel**
> **ESC = powrót**

### 7.2 Hover (podświetlenie)

**MUST:**

- Hover nad BUS → podświetlenie BUS + wyświetlenie tooltip z pełnymi danymi (CAD + wyniki).
- Hover nad linią → podświetlenie linii + tooltip z prądem roboczym + parametrami CAD.
- Hover nad transformatorem → podświetlenie transformatora + tooltip z loading + parametrami CAD.

**FORBIDDEN:**

- Hover powodujący zmianę stanu (np. hover otwiera panel, hover zmienia kolor na stałe).
- Hover ukrywający inne elementy (wszystko pozostaje widoczne).
- Hover zmieniający layout diagramu (pozycje elementów niezmienne).

**Tooltip (format BINDING):**

```
┌─────────────────────────────────────────────┐
│ Szyna SN-01                                 │
├─────────────────────────────────────────────┤
│ [SCADA]                                     │
│ Napięcie: U = 14.85 kV (0.99 pu)           │
│ Stan: In Service                            │
├─────────────────────────────────────────────┤
│ [WYNIKI - Case MAX]                         │
│ Ik″ = 12.5 kA                               │
│ ip  = 32.8 kA                               │
│ Ith = 11.2 kA                               │
│ Sk″ = 325 MVA                               │
├─────────────────────────────────────────────┤
│ [CAD]                                       │
│ Typ: Główna izolowana                       │
│ Un = 15 kV                                  │
└─────────────────────────────────────────────┘
```

### 7.3 Click (fokus + panel)

**MUST:**

- Click na BUS → fokus na BUS + otwarcie panelu bocznego z pełnymi danymi + podświetlenie wszystkich linii podłączonych do BUS.
- Click na linii → fokus na linii + otwarcie panelu bocznego z danymi linii + podświetlenie BUS początkowego i końcowego.
- Click na transformatorze → fokus + otwarcie panelu + podświetlenie obu BUS (HV i LV).

**FORBIDDEN:**

- Click powodujący zmianę stanu elementu (zmiana `in_service` tylko przez panel właściwości, nie przez click na diagramie).
- Click otwierający wiele paneli jednocześnie (jeden panel naraz).
- Click bez wizualnej informacji zwrotnej (brak podświetlenia, brak otwarcia panelu).

**Panel boczny (format BINDING):**

```
┌─────────────────────────────────────────────┐
│ PANEL: Szyna SN-01                          │
├─────────────────────────────────────────────┤
│ [ZAKŁADKA: Podstawowe]                      │
│ Nazwa:         [SN-01              ]        │
│ Napięcie:      [15.0               ] kV     │
│ In Service:    [✓]                          │
├─────────────────────────────────────────────┤
│ [ZAKŁADKA: Wyniki]                          │
│ Case:          [MAX (3F)          ▼]        │
│ Ik″:           12.5 kA                      │
│ ip:            32.8 kA                      │
│ Ith:           11.2 kA                      │
│ Sk″:           325 MVA                      │
├─────────────────────────────────────────────┤
│ [ZAKŁADKA: Wkłady]                          │
│ GRID:          5.8 kA  (46.4%)              │
│ T-01:          3.5 kA  (28.0%)              │
│ PV-01:         1.2 kA  (9.6%)               │
├─────────────────────────────────────────────┤
│ [AKCJE]                                     │
│ [Pokaż dowód P11]  [Eksport wyników]       │
└─────────────────────────────────────────────┘
```

### 7.4 ESC (powrót)

**MUST:**

- ESC zamyka aktywny panel boczny (jeśli otwarty).
- ESC anuluje fokus na elemencie (powrót do widoku ogólnego).
- ESC przerywa edycję (bez zapisywania zmian).

**FORBIDDEN:**

- ESC zamykający cały UI (ESC nie zamyka aplikacji, tylko panel).
- ESC kasujący dane (dane zapisywane tylko przez jawne "Zapisz").

### 7.5 Multi-select (Ctrl+Click)

**ALLOWED:**

- Ctrl+Click na wielu elementach → multi-select.
- Multi-select + akcja grupowa (np. "Wyłącz wszystkie" → `in_service=False`).

**MUST:**

- Multi-select wizualnie oznaczony (ramka, podświetlenie, licznik "3 elementy wybrane").
- Multi-select + Click na tle → anulowanie multi-select.

### 7.6 Drag (przesuwanie)

**ALLOWED:**

- Drag elementu na diagramie → zmiana pozycji (tylko layout, nie topologia).
- Drag z zaznaczonym multi-select → przesuwanie wszystkich zaznaczonych elementów.

**FORBIDDEN:**

- Drag zmieniający topologię (np. przeciągnięcie linii zmienia `from_bus_id` — to musi być przez panel właściwości).
- Drag bez snap-to-grid (elementy muszą się "przyklejać" do siatki).

---

## 8. Integracja z istniejącymi dokumentami

### 8.1 Powiązania kanoniczne

| Dokument | Co definiuje | Powiązanie z SLD_UI_CONTRACT |
|----------|--------------|------------------------------|
| `SLD_SCADA_CAD_CONTRACT.md` | SCADA SLD + CAD overlay | UI Priority Stack rozszerza § 3.3 (integracja SCADA + CAD) |
| `SLD_SHORT_CIRCUIT_BUS_CENTRIC.md` | Prezentacja wyników zwarciowych | UI Priority Stack § 3 (BUS ma absolutny priorytet) |
| `SHORT_CIRCUIT_PANELS_AND_PRINTING.md` | Panele i wydruk | Print-First Contract § 6 (ekran = PDF = prawda) |
| `sld_rules.md` | Podstawowe reguły SLD | Interaction Contract § 7 (hover, click, ESC) |
| `wizard_screens.md` | Tryby pracy systemu | Semantic Color Contract § 5 (kolory w trybach) |

### 8.2 Rozstrzyganie konfliktów

**BINDING:**

W przypadku konfliktu między dokumentami:

1. **SLD_UI_CONTRACT.md** (ten dokument) definiuje kontrakty UI (binding).
2. **SLD_SCADA_CAD_CONTRACT.md** definiuje warstwy SCADA + CAD.
3. **SLD_SHORT_CIRCUIT_BUS_CENTRIC.md** definiuje wyniki zwarciowe (BUS-centric).

Jeśli konflikt pozostaje nierozstrzygnięty → **zgłoś jako Issue** (REPOSITORY-HYGIENE.md).

---

## 9. Przykłady (ilustracje kanoniczne)

### 9.1 Przykład: UI Priority Stack w praktyce

**Scenariusz:** Diagram Dense SLD z kolizją CAD + wyniki BUS.

```
════════════════════════════════════════════════════════════
   Szyna SN-01 | 15 kV                         [PRIORYTET 1]
   ───────────────────────────────────────────────────────
   Ik″ = 12.5 kA  │  ip = 32.8 kA  │  Sk″ = 325 MVA
   ───────────────────────────────────────────────────────
   ↑ Wyniki BUS: absolutny priorytet (INLINE)

                     ┌─────────────────────┐
          ╭─ ─ ─ ─ ─ │ Typ: Główna         │
          │          │ Izolowana           │
══════════┴══════════┴─────────────────────┴══════════════
                     ↑ CAD: przesunięty OFFSET (priorytet 3)

             │
             │  I = 125 A → [PRIORYTET 2: LINIA]
             │
```

### 9.2 Przykład: Semantic Color Contract

```
════════════════════════════════════════════════════════════
   Szyna SN-01 | 15 kV | U = 14.85 kV
   [ZIELONY] ← Stan normalny (U w zakresie)
────────────────────────────────────────────────────────────
             │
             │  Linia L-12
             │  I = 125 A → [ŻÓŁTY] ← Loading 85%
             │
════════════════════════════════════════════════════════════
   Szyna SN-02 | 15 kV | U = 13.2 kV
   [CZERWONY] ← Naruszenie limitu (U < 0.9 Un)
════════════════════════════════════════════════════════════
```

### 9.3 Przykład: Print-First Contract (PDF)

```
PDF (A4, strona 1/2):

┌─────────────────────────────────────────────────────────┐
│ Projekt: Stacja SN-01        Data: 2026-01-28 12:30:45 │
│ Case: MAX (3F)               Autor: Inż. Jan Kowalski  │
└─────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════
   Szyna SN-01 | 15 kV
   Ik″ = 12.5 kA  │  ip = 32.8 kA  │  Sk″ = 325 MVA
════════════════════════════════════════════════════════════
             │
             │  Linia L-12 | I = 125 A
             │  L = 2.5 km | 3×150 mm² Cu
             │
════════════════════════════════════════════════════════════
   Szyna SN-02 | 15 kV
   Ik″ = 10.8 kA  │  ip = 28.3 kA  │  Sk″ = 280 MVA
════════════════════════════════════════════════════════════

[Legenda kolorów]
█ Zielony = Stan normalny
█ Żółty = Ostrzeżenie (80-100% loading)
█ Czerwony = Błąd (loading > 100% lub U poza zakresem)

──────────────────────────────────────────────────────────
Strona 1/2        https://claude.ai/code/session_NLhJs
```

---

## 10. Podsumowanie kontraktów (checklist)

**Implementacja zgodna z SLD_UI_CONTRACT, jeśli:**

### 10.1 Kontrakt #1: UI Priority Stack

- [ ] BUS (wyniki zwarciowe) ma absolutny priorytet wizualny.
- [ ] LINIA (prąd roboczy) ma priorytet 2.
- [ ] CAD (parametry katalogowe) ma najniższy priorytet (fallback OFFSET/SIDE STACK).
- [ ] Wyniki BUS **nigdy nie są ukryte** ani przesuwane do SIDE STACK.

### 10.2 Kontrakt #2: Dense SLD Rules

- [ ] System automatycznie wykrywa gęstość diagramu (`density > 0.10 elem/cm²`).
- [ ] Etykiety CAD przełączają się INLINE → OFFSET → SIDE STACK (automatycznie).
- [ ] Wyniki BUS pozostają INLINE/OFFSET niezależnie od gęstości.
- [ ] Użytkownik może wymusić SIDE STACK (tryb audytu).

### 10.3 Kontrakt #3: Semantic Color Contract

- [ ] Kolor oznacza **znaczenie** (stan, alarm), nie typ elementu.
- [ ] Czerwony = przeciążenie, błąd, alarm.
- [ ] Zielony = stan normalny.
- [ ] Żółty = ostrzeżenie.
- [ ] Szary = `in_service=False`.
- [ ] Kolory są **konsystentne** (ten sam stan = ten sam kolor).

### 10.4 Kontrakt #4: Print-First Contract

- [ ] Wszystko widoczne na ekranie → widoczne w PDF (żadne auto-hide).
- [ ] Wyniki BUS i prądy linii **zawsze widoczne** na wydruku.
- [ ] Kolory zachowane w PDF (lub zastąpione wzorami w mono).
- [ ] Wielostronicowość: podział na logiczne sekcje + oznaczenie kontynuacji.

### 10.5 Kontrakt #5: Interaction Contract

- [ ] Hover = informacja (tooltip), nie zmienia stanu.
- [ ] Click = fokus + panel boczny (jeden panel naraz).
- [ ] ESC = zamknięcie panelu / anulowanie fokusa.
- [ ] Multi-select (Ctrl+Click) wspierany + wizualnie oznaczony.
- [ ] Drag = zmiana pozycji (layout), nie topologii.

---

**KONIEC DOKUMENTU SLD_UI_CONTRACT.md**
**Status:** CANONICAL (BINDING)
**Dokument jest źródłem prawdy dla kontraktów UI w MV-DESIGN-PRO.**
