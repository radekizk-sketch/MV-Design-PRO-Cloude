# Migracja i single path — analiza sciezek

> **Dokument**: UI_MIGRATION_CLEANUP_AND_SINGLE_PATH.md
> **Status**: ZAMKNIETY
> **Data audytu**: 2026-03-28
> **Warstwa**: Application Layer (Modal Routing & Invocation Paths)

---

## 1. Zakres audytu

Niniejszy dokument analizuje koegzystencje dwoch sciezek invocacji modali
w MV-Design-PRO — starej (SLD context menu) i nowej (ProcessPanel).
Audyt potwierdza brak konfliktow, brak dead paths oraz zamierzona koegzystencje.

Audyt obejmuje:
- Stara sciezka invocacji (SLD -> ModalController)
- Nowa sciezka invocacji (ProcessPanel -> OperationFormRouter)
- fixActionModalBridge — mapowanie backend -> frontend
- Analiza dead paths
- Koegzystencja z legacy Wizard (K1-K10)

---

## 2. Stara sciezka invocacji

### 2.1. Flow

```
SLD Context Menu
  |
  v
ModalController
  |
  v
topology/modals/*
  |
  v
Standalone Modal (renderowany w SLD overlay)
```

### 2.2. Opis

1. **SLD Context Menu**: Uzytkownik klika PPM na elemencie SLD. Menu kontekstowe
   pojawia sie z akcjami dostepnymi dla danego typu elementu.

2. **ModalController**: Centralny kontroler modali w warstwie SLD. Odbiera
   zdarzenie `openModal(type, elementId, context)` i renderuje odpowiedni modal.

3. **topology/modals/***: Katalog modali topologicznych (AddBranchModal,
   EditSourceModal, SwitchToggleModal, itp.). Kazdy modal jest samodzielnym
   komponentem z wlasnym formularzem i walidacja.

4. **Standalone Modal**: Modal renderowany jako overlay nad SLD canvas.
   Po zatwierdzeniu, operacja jest wykonywana na modelu, a SLD jest odswiezane.

### 2.3. Zastosowanie

Stara sciezka jest uzywana dla **interakcji kontekstowych** — gdy uzytkownik
pracuje bezposrednio z SLD i chce wykonac operacje na konkretnym elemencie.

---

## 3. Nowa sciezka invocacji

### 3.1. Flow

```
ProcessPanel
  |
  v
OperationFormRouter
  |
  v
forms/*
  |
  v
Thin Wrapper
  |
  v
topology/modals/*  (te same modale co w starej sciezce)
  |
  v
Same Modal (renderowany w ProcessPanel area)
```

### 3.2. Opis

1. **ProcessPanel**: Panel workflow budowy sieci. Prowadzi uzytkownika krok
   po kroku przez proces tworzenia/modyfikacji sieci.

2. **OperationFormRouter**: Router, ktory na podstawie typu operacji
   (`ADD_SOURCE`, `ADD_BRANCH`, `EDIT_TRANSFORMER`, itp.) wybiera odpowiedni
   formularz z katalogu `forms/*`.

3. **forms/***: Cienkie wrappery (thin wrappers) opakowujace modale z
   `topology/modals/*`. Dodaja kontekst workflow (np. numer kroku, walidacje
   miedzykrokowe) bez duplikowania logiki modalnej.

4. **topology/modals/***: **Te same modale** co w starej sciezce. Brak
   duplikacji komponentow — wrappery deleguja renderowanie do istniejacych modali.

### 3.3. Zastosowanie

Nowa sciezka jest uzywana dla **workflow budowy** — gdy uzytkownik buduje siec
od zera lub wykonuje sekwencje powiazanych operacji.

---

## 4. Koegzystencja sciezek

### 4.1. Brak konfliktu

Obie sciezki koegzystuja bez konfliktu, poniewaz:

| Aspekt | Stara sciezka | Nowa sciezka |
|--------|--------------|-------------|
| Punkt wejscia | SLD Context Menu (PPM) | ProcessPanel (krok workflow) |
| Kontroler | ModalController | OperationFormRouter |
| Renderowanie | SLD overlay | ProcessPanel area |
| Kontekst | Pojedynczy element | Krok w sekwencji |
| Modale | topology/modals/* | topology/modals/* (te same!) |

Kluczowy fakt: **oba podejscia uzywaja tych samych modali** z `topology/modals/*`.
Roznica polega wylacznie na:
- Skad modal jest wywolywany (SLD vs ProcessPanel)
- Gdzie jest renderowany (overlay vs panel)
- Jaki kontekst ma dostepny (element vs workflow step)

### 4.2. Diagram koegzystencji

```
                    +-------------------+
                    | topology/modals/* |  <-- SINGLE SOURCE OF TRUTH
                    | (22+ modali)      |
                    +-------------------+
                       ^           ^
                       |           |
              +--------+--+   +---+-----------+
              |           |   |               |
     ModalController   Thin Wrappers (forms/*)
              |                    |
     SLD Context Menu       ProcessPanel
     (interakcja)           (workflow)
```

### 4.3. Zamierzona koegzystencja

Koegzystencja jest **zamierzona i pożadana**, nie jest wynikiem niekompletnej migracji.
Oba podejscia obsluguja rozne scenariusze uzycia:

- **Doswiadczony uzytkownik**: Pracuje bezposrednio na SLD, uzywa menu kontekstowego
  (stara sciezka) do szybkich operacji.
- **Nowy uzytkownik**: Korzysta z ProcessPanel (nowa sciezka), ktory prowadzi
  krok po kroku.

---

## 5. fixActionModalBridge

### 5.1. Cel

`fixActionModalBridge` zapewnia deterministyczne mapowanie miedzy blokerami
readiness (pochodzacymi z backendu) a odpowiednimi modalami naprawczymi
(w frontendzie).

### 5.2. Flow

```
ReadinessBar
  |
  v
fixAction (klik przycisku naprawczego)
  |
  v
fixActionModalBridge
  |  - mapuje typ blokera na typ modala
  |  - przygotowuje kontekst (elementId, parametry)
  |
  v
Modal (otwarty z odpowiednim kontekstem)
```

### 5.3. Mapowanie

| Typ blokera (backend) | Modal (frontend) | Kontekst |
|----------------------|-----------------|----------|
| `MISSING_CATALOG_TYPE` | CatalogAssignModal | elementId, expectedCategory |
| `INCOMPLETE_PARAMETERS` | ElementPropertiesModal | elementId, missingFields |
| `TOPOLOGY_DISCONNECTED` | TopologyFixModal | elementId, suggestedBus |
| `MISSING_PROTECTION` | ProtectionAssignModal | elementId, protectionZone |
| `INVALID_VOLTAGE_LEVEL` | VoltageEditModal | elementId, currentVoltage |
| `MISSING_SOURCE` | AddSourceModal | suggestedBusId |

### 5.4. Determinizm

Mapowanie jest **deterministyczne** — ten sam typ blokera zawsze otwiera ten sam modal
z tym samym zestawem parametrow kontekstowych. Brak logiki warunkowej ani heurystyk.

---

## 6. Analiza dead paths

### 6.1. Metodologia

Audyt przeszukal caly katalog `topology/modals/` oraz `modalRegistry` w celu
identyfikacji modali, ktore nie sa wywolywane z zadnej sciezki (orphaned modals).

### 6.2. Wyniki

**Brak orphaned modals.** Wszystkie 22+ modali zarejestrowanych w `modalRegistry`
maja co najmniej jedna aktywna sciezke invocacji:

| Sciezka invocacji | Liczba modali |
|-------------------|---------------|
| Tylko stara sciezka (SLD) | 5 |
| Tylko nowa sciezka (ProcessPanel) | 3 |
| Obie sciezki | 12 |
| Tylko fixActionModalBridge | 2 |
| **Razem** | **22** |

### 6.3. Modele z pojedyncza sciezka

Modele dostepne tylko z jednej sciezki maja ku temu uzasadnienie:

- **Tylko SLD** (5): Modele scisle zwiazane z interakcja graficzna (np. DragConnectModal,
  TerminalStatusModal, CanvasSettingsModal, GridSnapModal, SymbolRotateModal)
- **Tylko ProcessPanel** (3): Modele specyficzne dla workflow (np. WelcomeStepModal,
  NetworkTypeSelectModal, CompletionSummaryModal)
- **Tylko fixAction** (2): Modele specyficzne dla naprawy (np. TopologyFixModal,
  VoltageEditModal — rzadko uzywane, aktywowane wylacznie przez blokery)

---

## 7. Wizard K1-K10 (legacy)

### 7.1. Status

Wizard (kroki K1-K10) jest **legacy workflow**, ktory koegzystuje z nowym ProcessPanel.

### 7.2. Brak kolizji

Wizard ma **osobny route** (`/wizard`) i nie wspoldzieli komponentow z ProcessPanel
ani ze stara sciezka SLD. Koegzystencja jest bezkonfliktowa:

| Aspekt | Wizard | ProcessPanel | SLD Context |
|--------|--------|-------------|-------------|
| Route | `/wizard` | `/build` | `/sld` (overlay) |
| Kontroler | WizardController | ProcessController | ModalController |
| Modale | wizard/modals/* | topology/modals/* | topology/modals/* |
| Stan | wizardStore | processStore | sldStore |

### 7.3. Przyszlosc

Wizard nie jest planowany do usuniecia — obsluguje scenariusze szybkiego
prototypowania sieci, gdzie uzytkownik chce skonczyc w 10 krokach bez
szczegolowej konfiguracji. ProcessPanel jest dla szczegolowej budowy.

---

## 8. Podsumowanie

| Aspekt | Stan | Komentarz |
|--------|------|-----------|
| Stara sciezka (SLD) | Aktywna | Interakcje kontekstowe na SLD |
| Nowa sciezka (ProcessPanel) | Aktywna | Workflow budowy krok-po-kroku |
| Koegzystencja | Zamierzona | Brak konfliktu, wspolne modale |
| fixActionModalBridge | Deterministyczny | Mapowanie bloker -> modal |
| Dead paths | Brak | Wszystkie 22+ modali maja aktywne sciezki |
| Wizard K1-K10 | Legacy, koegzystuje | Osobny route, brak kolizji |

**Status: ZAMKNIETY** — koegzystencja jest zamierzona, brak dead paths.
Wszystkie modele sa osiagalne z co najmniej jednej sciezki invocacji.

---

*Dokument wygenerowany w ramach audytu UI warstwy aplikacyjnej MV-Design-PRO.*
