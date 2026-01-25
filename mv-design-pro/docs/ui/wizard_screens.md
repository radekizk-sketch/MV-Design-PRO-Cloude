# Wizard Screens — Profesjonalna Edycja Inżynierska

**Status:** KANONICZNY
**Wersja:** 2.0
**Referencje:** SYSTEM_SPEC.md, ARCHITECTURE.md, PLANS.md, sld_rules.md
**Wzorzec:** DIgSILENT PowerFactory

---

## Spis Treści

1. [Globalna Koncepcja UI](#1-globalna-koncepcja-ui)
2. [Globalny Układ Paneli](#2-globalny-układ-paneli)
3. [Siatka Właściwości Obiektu](#3-siatka-właściwości-obiektu)
4. [Menu Kontekstowe](#4-menu-kontekstowe)
5. [Przebieg Kreatora — Pełny Cykl Inżynierski](#5-przebieg-kreatora--pełny-cykl-inżynierski)
6. [Szczegółowe Ekrany i Modale](#6-szczegółowe-ekrany-i-modale)
7. [Modale Zaawansowane](#7-modale-zaawansowane)
8. [Ekrany Przypadków Obliczeniowych](#8-ekrany-przypadków-obliczeniowych)
9. [Obliczenia i Diagnostyka](#9-obliczenia-i-diagnostyka)
10. [Tryb Wyników](#10-tryb-wyników)
11. [Filozofia Komunikatów](#11-filozofia-komunikatów)
12. [Odniesienia](#12-odniesienia)

---

## 1. Globalna Koncepcja UI

### 1.1 Rola Kreatora (Wizard)

Kreator (Wizard) w MV-DESIGN-PRO pełni rolę analogiczną do **Data Managera** oraz **dialogów edycyjnych obiektów** w DIgSILENT PowerFactory. Jest to **główny interfejs** do:

- Definiowania topologii sieci elektroenergetycznej
- Parametryzacji wszystkich elementów modelu
- Konfiguracji przypadków obliczeniowych
- Przeglądania wyników analiz

**ZASADA KARDYNALNA:** Kreator NIE JEST narzędziem do "szybkiego projektowania". Jest profesjonalnym środowiskiem inżynierskim wymagającym pełnej parametryzacji każdego elementu.

### 1.2 Tryby Pracy

System operuje w trzech rozłącznych trybach pracy:

#### 1.2.1 Tryb Edycji Modelu (MODEL_EDIT)

| Aspekt | Opis |
|--------|------|
| Stan modelu | MUTOWALNY |
| Stan wyników | NIEAKTYWNE (unieważnione przy każdej zmianie) |
| Dozwolone akcje | Dodawanie, edycja, usuwanie elementów |
| Nakładki wyników | UKRYTE |
| Walidacja | AKTYWNA (inline) |

#### 1.2.2 Tryb Konfiguracji Przypadku (CASE_CONFIG)

| Aspekt | Opis |
|--------|------|
| Stan modelu | TYLKO DO ODCZYTU |
| Stan przypadku | MUTOWALNY |
| Dozwolone akcje | Parametryzacja przypadku, wybór scenariusza |
| Nakładki wyników | UKRYTE |
| Obliczenia | DOZWOLONE |

#### 1.2.3 Tryb Wyników (RESULT_VIEW)

| Aspekt | Opis |
|--------|------|
| Stan modelu | TYLKO DO ODCZYTU |
| Stan przypadku | TYLKO DO ODCZYTU |
| Stan wyników | AKTYWNE |
| Dozwolone akcje | Przeglądanie, eksport, porównanie |
| Nakładki wyników | WIDOCZNE |
| Edycja | ZABLOKOWANA |

### 1.3 Świadomość Aktywnego Przypadku Obliczeniowego

System MUSI utrzymywać świadomość aktywnego przypadku obliczeniowego:

```
┌─────────────────────────────────────────────────────────────────┐
│ PASEK STANU PRZYPADKU (zawsze widoczny)                        │
├─────────────────────────────────────────────────────────────────┤
│ Aktywny przypadek: [SC-001: Zwarcie 3f na szynie SN]          │
│ Typ: ShortCircuitCase | Metoda: IEC 60909 | Stan: GOTOWY      │
│ [Zmień przypadek ▼] [Oblicz] [Wyniki]                         │
└─────────────────────────────────────────────────────────────────┘
```

**REGUŁA BLOKADY:** Brak aktywnego przypadku → przycisk [Oblicz] NIEAKTYWNY.

**REGUŁA SPÓJNOŚCI:** Zmiana modelu → stan wszystkich przypadków = NIEAKTUALNY (STALE).

### 1.4 Deterministyczne UI

#### 1.4.1 Sortowanie

| Kontekst | Reguła sortowania |
|----------|-------------------|
| Drzewo projektu | Alfabetycznie według nazwy |
| Lista elementów | Alfabetycznie według nazwy |
| Lista przypadków | Chronologicznie (data utworzenia) |
| Lista wyników | Chronologicznie (data obliczenia) |
| Pola w siatce właściwości | Według zdefiniowanej kolejności grup |

#### 1.4.2 Nazewnictwo Automatyczne

| Typ obiektu | Wzorzec nazwy | Przykład |
|-------------|---------------|----------|
| Szyna (Bus) | `SZ-{NR_STACJI}-{NR_SZYNY}` | SZ-ST01-01 |
| Linia (LineBranch) | `LN-{NAZWA_OD}-{NAZWA_DO}` | LN-ST01-ST02 |
| Transformator (TransformerBranch) | `TR-{STACJA}-{NR}` | TR-ST01-01 |
| Wyłącznik (CircuitBreaker) | `WŁ-{SZYNA}-{NR}` | WŁ-SZ01-01 |
| Źródło (ExternalGrid) | `ZR-{STACJA}` | ZR-ST01 |
| Odbiornik (Load) | `OD-{SZYNA}-{NR}` | OD-SZ01-01 |
| Przypadek zwarciowy | `SC-{NNN}` | SC-001 |
| Przypadek rozpływowy | `PF-{NNN}` | PF-001 |

#### 1.4.3 Jednostki (Deterministyczne)

| Wielkość | Jednostka wyświetlana | Jednostka wewnętrzna |
|----------|----------------------|---------------------|
| Napięcie znamionowe | kV | V |
| Prąd znamionowy | A | A |
| Moc czynna | MW | W |
| Moc bierna | Mvar | var |
| Moc pozorna | MVA | VA |
| Impedancja | Ω | Ω |
| Reaktancja | Ω | Ω |
| Rezystancja | Ω | Ω |
| Długość | km | m |
| Przekrój | mm² | mm² |
| Czas | ms | ms |
| Temperatura | °C | °C |
| Współczynnik mocy | - (bezwymiarowy) | - |

---

## 2. Globalny Układ Paneli

### 2.1 Struktura Głównego Okna

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASEK MENU                                                                  │
│ Plik | Edycja | Widok | Model | Przypadki | Obliczenia | Analiza | Pomoc   │
├─────────────────────────────────────────────────────────────────────────────┤
│ PASEK NARZĘDZI                                                              │
│ [Nowy] [Otwórz] [Zapisz] | [Cofnij] [Ponów] | [Tryb edycji] [Tryb wyników] │
├───────────────┬─────────────────────────────────────┬───────────────────────┤
│               │                                     │                       │
│  DRZEWO       │     WIDOK CENTRALNY                 │  SIATKA WŁAŚCIWOŚCI   │
│  PROJEKTU     │     (Schemat jednokreskowy /        │  (Prawy panel)        │
│               │      Fokus obiektu)                 │                       │
│  ▼ Projekt    │                                     │  ┌─────────────────┐  │
│    ▼ Model    │     ════╦══════════╦════            │  │ Identyfikacja   │  │
│      ▼ Stacje │         ║          ║                │  ├─────────────────┤  │
│        ST01   │        [TR]       [OD]              │  │ Stan            │  │
│        ST02   │         ║          ║                │  ├─────────────────┤  │
│      ▼ Linie  │     ════╩══════════╩════            │  │ Parametry       │  │
│        LN01   │                                     │  │ elektryczne     │  │
│      ▼ Źródła │                                     │  ├─────────────────┤  │
│        ZR01   │                                     │  │ Dane znamionowe │  │
│    ▼ Przypadki│                                     │  ├─────────────────┤  │
│      SC-001   │                                     │  │ Walidacja       │  │
│      PF-001   │                                     │  ├─────────────────┤  │
│    ▼ Wyniki   │                                     │  │ Metadane        │  │
│      SC-001-R │                                     │  └─────────────────┘  │
│               │                                     │                       │
├───────────────┴─────────────────────────────────────┴───────────────────────┤
│ PANEL KOMUNIKATÓW I DIAGNOSTYKI                                             │
│ [Błędy: 0] [Ostrzeżenia: 2] [Informacje: 5]                                │
│ ⚠ W-VAL-001 | Ostrzeżenie | TR-ST01-01 | Przekładnia poza zakresem normy  │
├─────────────────────────────────────────────────────────────────────────────┤
│ KONSOLA OBLICZEŃ                                                            │
│ > Solver: IEC60909ShortCircuitSolver                                        │
│ > Walidacja sieci: OK                                                       │
│ > Iteracja 1: zbieżność = 1.2e-4                                           │
│ > Obliczenia zakończone: 0.34s                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ PASEK STANU                                                                 │
│ Aktywny przypadek: SC-001 | Tryb: Edycja modelu | Zoom: 100%               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Drzewo Projektu (Struktura PowerFactory)

```
▼ 📁 Projekt: "Sieć SN Zakład Przemysłowy"
  │
  ├─▼ 📁 Model sieci
  │   │
  │   ├─▼ 📁 Stacje
  │   │   ├─ 🏭 GPZ Główny (110/15 kV)
  │   │   ├─ 🏭 Stacja A (15 kV)
  │   │   └─ 🏭 Stacja B (15 kV)
  │   │
  │   ├─▼ 📁 Szyny
  │   │   ├─ ═══ SZ-GPZ-WN (110 kV)
  │   │   ├─ ═══ SZ-GPZ-SN (15 kV)
  │   │   ├─ ═══ SZ-STA-01 (15 kV)
  │   │   └─ ═══ SZ-STB-01 (15 kV)
  │   │
  │   ├─▼ 📁 Linie i kable
  │   │   ├─ ─── LN-GPZ-STA (kabel XRUHAKXS 3x240)
  │   │   └─ ─── LN-GPZ-STB (linia napowietrzna AFL-6 120)
  │   │
  │   ├─▼ 📁 Transformatory
  │   │   ├─ ⊗ TR-GPZ-01 (110/15 kV, 25 MVA)
  │   │   └─ ⊗ TR-GPZ-02 (110/15 kV, 25 MVA)
  │   │
  │   ├─▼ 📁 Aparatura łączeniowa
  │   │   ├─ ◯ WŁ-GPZ-SN-01 (wyłącznik)
  │   │   ├─ ◯ WŁ-GPZ-SN-02 (wyłącznik)
  │   │   └─ ─ RZ-STA-01 (rozłącznik)
  │   │
  │   ├─▼ 📁 Źródła
  │   │   └─ ⚡ ZR-GPZ (sieć zewnętrzna 110 kV)
  │   │
  │   └─▼ 📁 Odbiorniki
  │       ├─ ▽ OD-STA-01 (P=2.5 MW, Q=1.2 Mvar)
  │       └─ ▽ OD-STB-01 (P=1.8 MW, Q=0.9 Mvar)
  │
  ├─▼ 📁 Przypadki obliczeniowe
  │   ├─▼ 📁 Analizy zwarciowe (ShortCircuitCase)
  │   │   ├─ ⚡ SC-001: Zwarcie 3f na szynie SN GPZ
  │   │   └─ ⚡ SC-002: Zwarcie 1f na szynie STA
  │   │
  │   └─▼ 📁 Rozpływy mocy (PowerFlowCase)
  │       └─ 🔄 PF-001: Stan normalny pracy
  │
  └─▼ 📁 Wyniki
      ├─ 📊 SC-001-R-2024-01-15-14:30
      └─ 📊 PF-001-R-2024-01-15-14:35
```

### 2.3 Widok Centralny (Schemat Jednokreskowy)

Schemat jednokreskowy (SLD) jest głównym widokiem graficznym sieci. Realizuje zasady zdefiniowane w `sld_rules.md`:

| Funkcja | Tryb Edycji | Tryb Wyników |
|---------|-------------|--------------|
| Wyświetlanie topologii | ✓ | ✓ |
| Przeciąganie symboli | ✓ | ✗ |
| Dodawanie elementów | ✓ | ✗ |
| Usuwanie elementów | ✓ | ✗ |
| Wyświetlanie nakładek wyników | ✗ | ✓ |
| Dymki z wartościami | Parametry | Wyniki |
| Menu kontekstowe | Pełne | Tylko do odczytu |

### 2.4 Siatka Właściwości (Prawy Panel)

Siatka właściwości jest **GŁÓWNYM INTERFEJSEM** edycji parametrów. Wyświetla właściwości aktualnie zaznaczonego obiektu w strukturze grup:

```
┌─────────────────────────────────────────┐
│ SIATKA WŁAŚCIWOŚCI                      │
│ Obiekt: TR-GPZ-01 (TransformerBranch)   │
├─────────────────────────────────────────┤
│ ▼ Identyfikacja                         │
│   ID:           tr-gpz-01-uuid          │
│   Nazwa:        TR-GPZ-01               │
│   UUID:         550e8400-e29b-41d4...   │
│   Typ obiektu:  TransformerBranch       │
├─────────────────────────────────────────┤
│ ▼ Stan                                  │
│   W eksploatacji: [✓]                   │
│   Stan cyklu:     Aktywny               │
├─────────────────────────────────────────┤
│ ▼ Parametry elektryczne                 │
│   Moc znamionowa:     [25.0    ] MVA    │
│   Napięcie GN:        [110.0   ] kV     │
│   Napięcie DN:        [15.0    ] kV     │
│   Grupa połączeń:     [Dyn11   ] ▼      │
│   uk%:                [10.5    ] %      │
│   Straty Cu (Pk):     [125.0   ] kW     │
│   Straty Fe (P0):     [25.0    ] kW     │
│   Prąd jałowy (i0%):  [0.5     ] %      │
├─────────────────────────────────────────┤
│ ▼ Dane znamionowe (tabliczka)           │
│   Producent:          [ABB         ]    │
│   Typ:                [RESIBLOC    ]    │
│   Rok produkcji:      [2018        ]    │
│   Numer seryjny:      [TR-2018-001 ]    │
├─────────────────────────────────────────┤
│ ▼ Wartości obliczeniowe (tylko odczyt)  │
│   Zk [Ω]:             0.726             │
│   Rk [Ω]:             0.0363            │
│   Xk [Ω]:             0.725             │
│   In_GN [A]:          131.2             │
│   In_DN [A]:          962.3             │
├─────────────────────────────────────────┤
│ ▼ Stan walidacji                        │
│   ✓ Wszystkie parametry poprawne        │
├─────────────────────────────────────────┤
│ ▼ Metadane audytowe (tylko odczyt)      │
│   Utworzono:      2024-01-10 09:15      │
│   Utworzył:       jan.kowalski          │
│   Zmodyfikowano:  2024-01-15 14:22      │
│   Zmodyfikował:   anna.nowak            │
└─────────────────────────────────────────┘
```

### 2.5 Panel Komunikatów i Diagnostyki

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PANEL KOMUNIKATÓW                                          [Błędy][Ostrz.][Info]│
├──────────┬──────────┬────────────────┬──────────────────────────────────────┤
│ KOD      │ POZIOM   │ ELEMENT        │ WYJAŚNIENIE                          │
├──────────┼──────────┼────────────────┼──────────────────────────────────────┤
│ E-TOP-001│ Błąd     │ Model sieci    │ Sieć niespójna: szyna SZ-STA-02     │
│          │          │                │ nie jest połączona z żadną gałęzią   │
├──────────┼──────────┼────────────────┼──────────────────────────────────────┤
│ W-VAL-001│Ostrzeżenie│ TR-GPZ-01     │ Przekładnia transformatora (7.33)    │
│          │          │                │ poza typowym zakresem (1.0-5.0)      │
├──────────┼──────────┼────────────────┼──────────────────────────────────────┤
│ I-SLV-001│ Info     │ SC-001         │ Obliczenia zakończone pomyślnie      │
│          │          │                │ w czasie 0.34s                       │
└──────────┴──────────┴────────────────┴──────────────────────────────────────┘
```

### 2.6 Konsola Obliczeń

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KONSOLA OBLICZEŃ                                                    [Wyczyść]│
├─────────────────────────────────────────────────────────────────────────────┤
│ [2024-01-15 14:30:01] Inicjalizacja solvera: IEC60909ShortCircuitSolver    │
│ [2024-01-15 14:30:01] Walidacja modelu sieci...                            │
│ [2024-01-15 14:30:01]   ✓ Topologia spójna                                 │
│ [2024-01-15 14:30:01]   ✓ Wszystkie parametry zdefiniowane                 │
│ [2024-01-15 14:30:01]   ✓ Źródło zdefiniowane                              │
│ [2024-01-15 14:30:02] Budowanie macierzy admitancyjnej...                  │
│ [2024-01-15 14:30:02] Obliczanie prądów zwarciowych...                     │
│ [2024-01-15 14:30:02]   Lokalizacja zwarcia: SZ-GPZ-SN                     │
│ [2024-01-15 14:30:02]   Typ zwarcia: trójfazowe symetryczne                │
│ [2024-01-15 14:30:02]   Ik" = 12.45 kA                                     │
│ [2024-01-15 14:30:02]   ip = 31.67 kA                                      │
│ [2024-01-15 14:30:02]   Ith = 12.89 kA (dla tk=1.0s)                       │
│ [2024-01-15 14:30:02] ✓ Obliczenia zakończone pomyślnie (0.34s)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Siatka Właściwości Obiektu (Standard Enterprise)

Dla KAŻDEGO typu obiektu w modelu definiuje się kompletną specyfikację siatki właściwości.

### 3.1 Szyna (Bus)

#### 3.1.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa wyświetlana (wzorzec: SZ-{STACJA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | Zawsze: Bus |

#### 3.1.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy szyna jest aktywna w obliczeniach |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.1.3 Grupa: Parametry elektryczne

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Napięcie znamionowe | float | kV | 0.4 - 400 | 15.0 | Wymagane, > 0 |
| Typ szyny | enum | - | ZBIORCZA / SEKCYJNA / ODCZEPOWA | ZBIORCZA | Wymagane |
| Prąd znamionowy | float | A | 100 - 10000 | 1000 | Wymagane, > 0 |

#### 3.1.4 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Producent | string | TAK | Nazwa producenta rozdzielnicy |
| Typ rozdzielnicy | string | TAK | Oznaczenie katalogowe |
| Rok instalacji | int | TAK | Rok oddania do eksploatacji |

#### 3.1.5 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| U obliczone | float | kV | PowerFlowResult | Napięcie z rozpływu mocy |
| Kąt napięcia | float | ° | PowerFlowResult | Kąt fazowy napięcia |
| Ik" | float | kA | ShortCircuitResult | Prąd zwarciowy początkowy |
| ip | float | kA | ShortCircuitResult | Prąd udarowy |

#### 3.1.6 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-BUS-001 | Błąd | Un ≤ 0 | Napięcie znamionowe musi być większe od zera |
| E-BUS-002 | Błąd | In ≤ 0 | Prąd znamionowy musi być większy od zera |
| W-BUS-001 | Ostrzeżenie | Brak połączeń | Szyna nie ma żadnych połączeń |

#### 3.1.7 Grupa: Metadane audytowe

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Data utworzenia | datetime | NIE | Znacznik czasu utworzenia |
| Utworzył | string | NIE | Identyfikator użytkownika |
| Data modyfikacji | datetime | NIE | Znacznik ostatniej modyfikacji |
| Zmodyfikował | string | NIE | Identyfikator użytkownika |

---

### 3.2 Linia / Kabel (LineBranch)

#### 3.2.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: LN-{OD}-{DO}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | Zawsze: LineBranch |

#### 3.2.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy linia jest aktywna |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.2.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna początkowa (from_bus) | ref:Bus | TAK | Wymagane | Referencja do szyny źródłowej |
| Szyna końcowa (to_bus) | ref:Bus | TAK | Wymagane | Referencja do szyny docelowej |

#### 3.2.4 Grupa: Parametry elektryczne

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Typ przewodu | enum | - | KABEL / NAPOWIETRZNA | KABEL | Wymagane |
| Długość | float | km | 0.001 - 1000 | 1.0 | Wymagane, > 0 |
| Rezystancja jednostkowa R' | float | Ω/km | 0.001 - 10 | 0.125 | Wymagane, > 0 |
| Reaktancja jednostkowa X' | float | Ω/km | 0.001 - 10 | 0.08 | Wymagane, > 0 |
| Susceptancja jednostkowa B' | float | µS/km | 0 - 1000 | 0 | ≥ 0 |
| Konduktancja jednostkowa G' | float | µS/km | 0 - 100 | 0 | ≥ 0 |
| Prąd dopuszczalny długotrwały | float | A | 10 - 5000 | 300 | Wymagane, > 0 |
| Przekrój przewodu | float | mm² | 1 - 2000 | 240 | Wymagane, > 0 |
| Liczba przewodów w wiązce | int | - | 1 - 4 | 1 | Wymagane, ≥ 1 |

#### 3.2.5 Grupa: Parametry kabla (tylko gdy Typ = KABEL)

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Typ kabla | string | - | - | XRUHAKXS | - |
| Napięcie znamionowe izolacji U0/U | string | kV | - | 8.7/15 | - |
| Sposób ułożenia | enum | - | ZIEMIA_BEZPOŚREDNIO / RURY / KANAŁ | ZIEMIA_BEZPOŚREDNIO | - |
| Głębokość ułożenia | float | m | 0.5 - 3.0 | 0.7 | - |
| Temperatura gruntu | float | °C | -20 - 50 | 20 | - |
| Rezystywność termiczna gruntu | float | K·m/W | 0.5 - 3.0 | 1.0 | - |

#### 3.2.6 Grupa: Parametry linii napowietrznej (tylko gdy Typ = NAPOWIETRZNA)

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Typ przewodu | string | - | - | AFL-6 | - |
| Średnia wysokość zawieszenia | float | m | 5 - 50 | 10 | - |
| Średnia rozpiętość przęsła | float | m | 30 - 500 | 150 | - |
| Temperatura przewodu | float | °C | -30 - 80 | 40 | - |

#### 3.2.7 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Producent | string | TAK | Producent kabla/przewodu |
| Oznaczenie katalogowe | string | TAK | Pełne oznaczenie |
| Rok instalacji | int | TAK | Rok oddania do eksploatacji |
| Numer ewidencyjny | string | TAK | Numer wewnętrzny |

#### 3.2.8 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| R całkowite | float | Ω | Obliczone | R' × długość |
| X całkowite | float | Ω | Obliczone | X' × długość |
| Z całkowite | float | Ω | Obliczone | √(R² + X²) |
| I obliczony | float | A | PowerFlowResult | Prąd z rozpływu |
| Obciążenie | float | % | PowerFlowResult | I/Idop × 100% |
| P strat | float | kW | PowerFlowResult | Straty mocy czynnej |

#### 3.2.9 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-LIN-001 | Błąd | from_bus == null | Szyna początkowa nie jest zdefiniowana |
| E-LIN-002 | Błąd | to_bus == null | Szyna końcowa nie jest zdefiniowana |
| E-LIN-003 | Błąd | from_bus == to_bus | Szyna początkowa i końcowa są identyczne |
| E-LIN-004 | Błąd | długość ≤ 0 | Długość linii musi być większa od zera |
| W-LIN-001 | Ostrzeżenie | Obciążenie > 80% | Linia obciążona powyżej 80% dopuszczalnego prądu |

#### 3.2.10 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.3 Transformator 2-uzwojeniowy (TransformerBranch)

#### 3.3.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: TR-{STACJA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | TransformerBranch |
| Podtyp | enum | NIE | DWUUZWOJENIOWY |

#### 3.3.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy transformator jest aktywny |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.3.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna GN (hv_bus) | ref:Bus | TAK | Wymagane | Strona górnego napięcia |
| Szyna DN (lv_bus) | ref:Bus | TAK | Wymagane | Strona dolnego napięcia |

#### 3.3.4 Grupa: Parametry znamionowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Moc znamionowa Sn | float | MVA | 0.05 - 1000 | 25.0 | Wymagane, > 0 |
| Napięcie znamionowe GN (Un_hv) | float | kV | 0.4 - 800 | 110.0 | Wymagane, > 0 |
| Napięcie znamionowe DN (Un_lv) | float | kV | 0.4 - 400 | 15.0 | Wymagane, > 0 |
| Grupa połączeń | enum | - | Dyn11 / Yyn0 / Dyn5 / Yd11 / ... | Dyn11 | Wymagane |
| Napięcie zwarcia uk% | float | % | 4 - 25 | 10.5 | Wymagane, 4 ≤ uk ≤ 25 |
| Składowa czynna napięcia zwarcia ur% | float | % | 0.1 - 5 | 1.0 | Opcjonalne |
| Straty obciążeniowe (Pk) | float | kW | 1 - 1000 | 125.0 | Wymagane, > 0 |
| Straty jałowe (P0) | float | kW | 0.1 - 200 | 25.0 | Wymagane, > 0 |
| Prąd jałowy (i0%) | float | % | 0.1 - 5 | 0.5 | Opcjonalne |

#### 3.3.5 Grupa: Podobciążeniowy przełącznik zaczepów (OLTC)

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| OLTC zainstalowany | boolean | - | - | false | - |
| Strona przełącznika | enum | - | GN / DN | GN | Gdy OLTC = true |
| Liczba zaczepów (góra) | int | - | 0 - 20 | 8 | Gdy OLTC = true |
| Liczba zaczepów (dół) | int | - | 0 - 20 | 8 | Gdy OLTC = true |
| Krok napięcia na zaczep | float | % | 0.5 - 5 | 1.25 | Gdy OLTC = true |
| Aktualny zaczep | int | - | -n_low ... +n_high | 0 | Zakres zgodny z liczbą zaczepów |

#### 3.3.6 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Producent | string | TAK | Nazwa producenta |
| Typ | string | TAK | Oznaczenie typu |
| Rok produkcji | int | TAK | Rok produkcji |
| Numer seryjny | string | TAK | Numer fabryczny |
| Klasa chłodzenia | enum | TAK | ONAN / ONAF / OFAF / ODAF |
| Masa oleju | float | TAK | kg |
| Masa całkowita | float | TAK | kg |

#### 3.3.7 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| Impedancja zwarcia Zk | float | Ω | Obliczone | uk% × Un²/Sn |
| Rezystancja zwarcia Rk | float | Ω | Obliczone | Pk × Un²/Sn² |
| Reaktancja zwarcia Xk | float | Ω | Obliczone | √(Zk² - Rk²) |
| Przekładnia nominalna | float | - | Obliczone | Un_hv / Un_lv |
| Przekładnia rzeczywista | float | - | Obliczone | Uwzględnia aktualny zaczep |
| Prąd znamionowy GN | float | A | Obliczone | Sn / (√3 × Un_hv) |
| Prąd znamionowy DN | float | A | Obliczone | Sn / (√3 × Un_lv) |
| Obciążenie | float | % | PowerFlowResult | S/Sn × 100% |
| Straty | float | kW | PowerFlowResult | Straty w transformatorze |

#### 3.3.8 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-TRF-001 | Błąd | hv_bus == null | Szyna GN nie jest zdefiniowana |
| E-TRF-002 | Błąd | lv_bus == null | Szyna DN nie jest zdefiniowana |
| E-TRF-003 | Błąd | Un_hv ≤ Un_lv | Napięcie GN musi być większe od napięcia DN |
| E-TRF-004 | Błąd | uk% < 4 lub uk% > 25 | Napięcie zwarcia poza dopuszczalnym zakresem |
| W-TRF-001 | Ostrzeżenie | Obciążenie > 100% | Transformator przeciążony |
| W-TRF-002 | Ostrzeżenie | Przekładnia > 5 | Nietypowa przekładnia transformatora |

#### 3.3.9 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.4 Transformator 3-uzwojeniowy (TransformerBranch3W)

#### 3.4.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: TR3-{STACJA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | TransformerBranch |
| Podtyp | enum | NIE | TRÓJUZWOJENIOWY |

#### 3.4.2 Grupa: Stan

(Struktura identyczna jak dla TransformerBranch)

#### 3.4.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna GN (hv_bus) | ref:Bus | TAK | Wymagane | Strona górnego napięcia |
| Szyna SN (mv_bus) | ref:Bus | TAK | Wymagane | Strona średniego napięcia |
| Szyna DN (lv_bus) | ref:Bus | TAK | Wymagane | Strona dolnego napięcia |

#### 3.4.4 Grupa: Parametry znamionowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Moc znamionowa GN-SN | float | MVA | 0.05 - 1000 | 40.0 | Wymagane, > 0 |
| Moc znamionowa GN-DN | float | MVA | 0.05 - 1000 | 25.0 | Wymagane, > 0 |
| Moc znamionowa SN-DN | float | MVA | 0.05 - 1000 | 25.0 | Wymagane, > 0 |
| Napięcie znamionowe GN | float | kV | 0.4 - 800 | 110.0 | Wymagane |
| Napięcie znamionowe SN | float | kV | 0.4 - 400 | 30.0 | Wymagane |
| Napięcie znamionowe DN | float | kV | 0.4 - 110 | 15.0 | Wymagane |
| Grupa połączeń | enum | - | YNyn0d11 / ... | YNyn0d11 | Wymagane |
| uk% GN-SN | float | % | 4 - 25 | 12.0 | Wymagane |
| uk% GN-DN | float | % | 4 - 25 | 18.0 | Wymagane |
| uk% SN-DN | float | % | 4 - 25 | 6.0 | Wymagane |
| Pk GN-SN | float | kW | 1 - 1000 | 200.0 | Wymagane |
| Pk GN-DN | float | kW | 1 - 1000 | 150.0 | Wymagane |
| Pk SN-DN | float | kW | 1 - 1000 | 100.0 | Wymagane |
| P0 | float | kW | 0.1 - 200 | 30.0 | Wymagane |

#### 3.4.5 Grupa: OLTC

(Struktura analogiczna do transformatora 2-uzwojeniowego)

#### 3.4.6 Grupa: Dane znamionowe (tabliczka)

(Struktura identyczna jak dla TransformerBranch)

#### 3.4.7 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| Zk GN | float | Ω | Obliczone | Impedancja gałęzi GN |
| Zk SN | float | Ω | Obliczone | Impedancja gałęzi SN |
| Zk DN | float | Ω | Obliczone | Impedancja gałęzi DN |
| In GN | float | A | Obliczone | Prąd znamionowy GN |
| In SN | float | A | Obliczone | Prąd znamionowy SN |
| In DN | float | A | Obliczone | Prąd znamionowy DN |

#### 3.4.8 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-T3W-001 | Błąd | Brak szyny GN | Szyna GN nie jest zdefiniowana |
| E-T3W-002 | Błąd | Brak szyny SN | Szyna SN nie jest zdefiniowana |
| E-T3W-003 | Błąd | Brak szyny DN | Szyna DN nie jest zdefiniowana |
| E-T3W-004 | Błąd | Un_hv ≤ Un_mv | Napięcie GN musi być większe od SN |
| E-T3W-005 | Błąd | Un_mv ≤ Un_lv | Napięcie SN musi być większe od DN |

#### 3.4.9 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.5 Wyłącznik (CircuitBreaker)

#### 3.5.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: WŁ-{SZYNA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | Switch |
| Podtyp | enum | NIE | WYŁĄCZNIK |

#### 3.5.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy wyłącznik jest zamontowany |
| Pozycja | enum | TAK | ZAMKNIĘTY | ZAMKNIĘTY / OTWARTY |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.5.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna | ref:Bus | TAK | Wymagane | Szyna, do której jest przyłączony |
| Gałąź | ref:Branch | TAK | Opcjonalne | Gałąź (linia/transformator) |

#### 3.5.4 Grupa: Parametry znamionowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Napięcie znamionowe Un | float | kV | 0.4 - 800 | 15.0 | Wymagane |
| Prąd znamionowy In | float | A | 100 - 10000 | 1250 | Wymagane |
| Znamionowy prąd wyłączalny Ik | float | kA | 5 - 100 | 25.0 | Wymagane |
| Znamionowy prąd załączalny Ima | float | kA | 10 - 250 | 63.0 | Wymagane |
| Znamionowy prąd zwarciowy krótkotrwały Icw | float | kA | 5 - 100 | 25.0 | Wymagane |
| Czas wytrzymywania zwarcia tcw | float | s | 0.5 - 3.0 | 1.0 | Wymagane |
| Czas własny wyłączenia | float | ms | 20 - 100 | 60 | Opcjonalne |
| Czas łukowy | float | ms | 5 - 50 | 15 | Opcjonalne |

#### 3.5.5 Grupa: Medium gaszące

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Typ medium | enum | TAK | PRÓŻNIOWY / SF6 / OLEJOWY / POWIETRZNY |
| Ciśnienie nominalne SF6 | float | TAK | bar (tylko dla SF6) |

#### 3.5.6 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Producent | string | TAK | Nazwa producenta |
| Typ | string | TAK | Oznaczenie typu |
| Rok produkcji | int | TAK | Rok produkcji |
| Numer seryjny | string | TAK | Numer fabryczny |
| Licznik operacji | int | TAK | Liczba wykonanych łączeń |
| Resursy mechaniczne | int | TAK | Dopuszczalna liczba łączeń |

#### 3.5.7 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| I obliczony | float | A | PowerFlowResult | Prąd płynący przez wyłącznik |
| Ik" w miejscu | float | kA | ShortCircuitResult | Prąd zwarciowy w miejscu wyłącznika |
| Współczynnik wykorzystania | float | % | Obliczone | Ik"/Ik_znamionowy × 100% |

#### 3.5.8 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-CBR-001 | Błąd | Brak szyny | Wyłącznik nie jest przyłączony do szyny |
| E-CBR-002 | Błąd | Ik" > Ik_znam | Znamionowy prąd wyłączalny niewystarczający dla prądu zwarciowego |
| E-CBR-003 | Błąd | ip > Ima | Znamionowy prąd załączalny niewystarczający dla prądu udarowego |
| W-CBR-001 | Ostrzeżenie | Wykorzystanie > 80% | Wyłącznik blisko granicy zdolności łączeniowej |
| W-CBR-002 | Ostrzeżenie | Licznik > 80% resursów | Wyłącznik bliski wyczerpania resursów mechanicznych |

#### 3.5.9 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.6 Rozłącznik (Disconnector)

#### 3.6.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: RZ-{SZYNA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | Switch |
| Podtyp | enum | NIE | ROZŁĄCZNIK |

#### 3.6.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy rozłącznik jest zamontowany |
| Pozycja | enum | TAK | ZAMKNIĘTY | ZAMKNIĘTY / OTWARTY |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.6.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna | ref:Bus | TAK | Wymagane | Szyna, do której jest przyłączony |
| Gałąź | ref:Branch | TAK | Opcjonalne | Gałąź (linia/transformator) |

#### 3.6.4 Grupa: Parametry znamionowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Napięcie znamionowe Un | float | kV | 0.4 - 800 | 15.0 | Wymagane |
| Prąd znamionowy In | float | A | 100 - 10000 | 630 | Wymagane |
| Znamionowy prąd zwarciowy krótkotrwały Icw | float | kA | 5 - 100 | 25.0 | Wymagane |
| Czas wytrzymywania zwarcia tcw | float | s | 0.5 - 3.0 | 1.0 | Wymagane |
| Zdolność załączania na zwarcie | boolean | - | - | false | - |
| Prąd załączalny zwarciowy (jeśli ma zdolność) | float | kA | 10 - 250 | 0 | Gdy zdolność = true |

#### 3.6.5 Grupa: Dane znamionowe (tabliczka)

(Struktura identyczna jak dla CircuitBreaker)

#### 3.6.6 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| I obliczony | float | A | PowerFlowResult | Prąd płynący przez rozłącznik |
| Icw w miejscu | float | kA | ShortCircuitResult | Prąd zwarciowy krótkotrwały |

#### 3.6.7 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-DSC-001 | Błąd | Brak szyny | Rozłącznik nie jest przyłączony do szyny |
| E-DSC-002 | Błąd | Pozycja OTWARTY podczas rozpływu | Rozłącznik otwarty powoduje przerwę w sieci |
| W-DSC-001 | Ostrzeżenie | Icw < Ik" | Prąd zwarciowy krótkotrwały przekracza zdolność rozłącznika |

#### 3.6.8 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.7 Sieć Zewnętrzna (ExternalGrid)

#### 3.7.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: ZR-{STACJA}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | ExternalGrid |

#### 3.7.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy źródło jest aktywne |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.7.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna przyłączenia | ref:Bus | TAK | Wymagane | Szyna, do której jest przyłączone źródło |

#### 3.7.4 Grupa: Parametry znamionowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Napięcie znamionowe Un | float | kV | 0.4 - 800 | 110.0 | Wymagane |
| Napięcie odniesienia (p.u.) | float | p.u. | 0.9 - 1.1 | 1.0 | Wymagane |
| Częstotliwość | float | Hz | 50 / 60 | 50 | Wymagane |

#### 3.7.5 Grupa: Parametry zwarciowe (zgodnie z IEC 60909)

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Metoda wprowadzania | enum | - | SK_IK / SK_XR / RX_BEZPOŚREDNIO | SK_IK | - |
| **Gdy SK_IK:** | | | | | |
| Moc zwarciowa Sk" | float | MVA | 100 - 100000 | 5000 | Wymagane |
| Stosunek Ik"/Ik | float | - | 1.0 - 2.0 | 1.1 | Opcjonalne |
| Stosunek R/X | float | - | 0.05 - 0.5 | 0.1 | Wymagane |
| **Gdy SK_XR:** | | | | | |
| Moc zwarciowa Sk" | float | MVA | 100 - 100000 | 5000 | Wymagane |
| Reaktancja X | float | Ω | 0.01 - 100 | - | Obliczone z Sk" |
| Stosunek R/X | float | - | 0.05 - 0.5 | 0.1 | Wymagane |
| **Gdy RX_BEZPOŚREDNIO:** | | | | | |
| Rezystancja R | float | Ω | 0.001 - 100 | 0.5 | Wymagane |
| Reaktancja X | float | Ω | 0.01 - 100 | 5.0 | Wymagane |

#### 3.7.6 Grupa: Parametry składowej zerowej

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Stosunek R0/R1 | float | - | 0.5 - 5.0 | 1.0 | Wymagane |
| Stosunek X0/X1 | float | - | 0.5 - 5.0 | 1.0 | Wymagane |

#### 3.7.7 Grupa: Parametry rozpływu mocy

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Typ węzła | enum | - | SLACK / PV | SLACK | Wymagane |
| Moc czynna (gdy PV) | float | MW | -1000 - 1000 | 0 | Gdy typ = PV |
| Napięcie zadane (gdy PV) | float | p.u. | 0.9 - 1.1 | 1.0 | Gdy typ = PV |

#### 3.7.8 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Operator sieci | string | TAK | Nazwa operatora sieci przesyłowej/dystrybucyjnej |
| Punkt przyłączenia | string | TAK | Oznaczenie punktu przyłączenia |
| Umowa przyłączeniowa | string | TAK | Numer umowy |

#### 3.7.9 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| Impedancja zwarciowa Zk | float | Ω | Obliczone | Impedancja zastępcza sieci |
| Rk | float | Ω | Obliczone | Rezystancja zastępcza |
| Xk | float | Ω | Obliczone | Reaktancja zastępcza |
| Ik" | float | kA | Obliczone | Prąd zwarciowy początkowy |
| P wpływające | float | MW | PowerFlowResult | Moc czynna z sieci |
| Q wpływające | float | Mvar | PowerFlowResult | Moc bierna z sieci |

#### 3.7.10 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-EXG-001 | Błąd | Brak szyny | Źródło nie jest przyłączone do szyny |
| E-EXG-002 | Błąd | Sk" ≤ 0 | Moc zwarciowa musi być większa od zera |
| E-EXG-003 | Błąd | R/X ≤ 0 | Stosunek R/X musi być większy od zera |
| W-EXG-001 | Ostrzeżenie | Un ≠ Un_szyny | Napięcie źródła różni się od napięcia szyny |

#### 3.7.11 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.8 Generator synchroniczny (SynchronousGenerator)

#### 3.8.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: GEN-{STACJA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | SynchronousGenerator |

#### 3.8.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy generator jest aktywny |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.8.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna przyłączenia | ref:Bus | TAK | Wymagane | Szyna, do której jest przyłączony |

#### 3.8.4 Grupa: Parametry znamionowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Moc znamionowa pozorna Sn | float | MVA | 0.1 - 1000 | 10.0 | Wymagane |
| Moc znamionowa czynna Pn | float | MW | 0.1 - 1000 | 8.0 | Wymagane |
| Napięcie znamionowe Un | float | kV | 0.4 - 36 | 6.3 | Wymagane |
| Współczynnik mocy cos φn | float | - | 0.7 - 1.0 | 0.8 | Wymagane |
| Prędkość obrotowa nn | float | obr/min | 300 - 3600 | 1500 | Wymagane |
| Częstotliwość | float | Hz | 50 / 60 | 50 | Wymagane |

#### 3.8.5 Grupa: Parametry zwarciowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Reaktancja synchroniczna Xd | float | p.u. | 0.5 - 3.0 | 1.8 | Wymagane |
| Reaktancja przejściowa X'd | float | p.u. | 0.1 - 0.5 | 0.25 | Wymagane |
| Reaktancja subtransientalna X"d | float | p.u. | 0.05 - 0.3 | 0.15 | Wymagane |
| Reaktancja zerowa X0 | float | p.u. | 0.01 - 0.2 | 0.08 | Wymagane |
| Reaktancja przeciwna X2 | float | p.u. | 0.05 - 0.3 | 0.18 | Wymagane |
| Stała czasowa przejściowa T'd | float | s | 0.5 - 5.0 | 1.5 | Opcjonalne |
| Stała czasowa subtrans. T"d | float | s | 0.01 - 0.1 | 0.035 | Opcjonalne |

#### 3.8.6 Grupa: Parametry rozpływu mocy

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Typ węzła | enum | - | PV / PQ | PV | Wymagane |
| Moc czynna zadana P | float | MW | 0 - Pn | 8.0 | Wymagane |
| Napięcie zadane (gdy PV) | float | p.u. | 0.9 - 1.1 | 1.0 | Gdy typ = PV |
| Moc bierna zadana (gdy PQ) | float | Mvar | -Qmax - Qmax | 0 | Gdy typ = PQ |
| Qmin | float | Mvar | -Sn - 0 | -6.0 | Ograniczenie |
| Qmax | float | Mvar | 0 - Sn | 6.0 | Ograniczenie |

#### 3.8.7 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Producent | string | TAK | Nazwa producenta |
| Typ | string | TAK | Oznaczenie typu |
| Rok produkcji | int | TAK | Rok produkcji |
| Numer seryjny | string | TAK | Numer fabryczny |
| Klasa izolacji | enum | TAK | B / F / H |
| Typ chłodzenia | enum | TAK | IC01 / IC11 / IC21 / ... |

#### 3.8.8 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| Prąd znamionowy In | float | A | Obliczone | Sn / (√3 × Un) |
| Ik" (wkład do zwarcia) | float | kA | ShortCircuitResult | Prąd zwarciowy początkowy |
| P generowane | float | MW | PowerFlowResult | Moc czynna |
| Q generowane | float | Mvar | PowerFlowResult | Moc bierna |
| Obciążenie | float | % | PowerFlowResult | S/Sn × 100% |

#### 3.8.9 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-GEN-001 | Błąd | Brak szyny | Generator nie jest przyłączony do szyny |
| E-GEN-002 | Błąd | Pn > Sn | Moc czynna większa od mocy pozornej |
| E-GEN-003 | Błąd | X"d ≤ 0 | Reaktancja subtransientalna musi być > 0 |
| W-GEN-001 | Ostrzeżenie | cos φn < 0.8 | Nietypowy współczynnik mocy |

#### 3.8.10 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.9 Odbiornik (Load)

#### 3.9.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa (wzorzec: OD-{SZYNA}-{NR}) |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | Load |

#### 3.9.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy odbiornik jest aktywny |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.9.3 Grupa: Topologia

| Pole | Typ | Edytowalne | Walidacja | Opis |
|------|-----|------------|-----------|------|
| Szyna przyłączenia | ref:Bus | TAK | Wymagane | Szyna, do której jest przyłączony |

#### 3.9.4 Grupa: Model obciążenia

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Typ modelu | enum | - | PQ / ZIP / SILNIK | PQ | Wymagane |

#### 3.9.5 Grupa: Parametry modelu PQ (podstawowy)

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Moc czynna P | float | MW | 0 - 1000 | 1.0 | Wymagane, ≥ 0 |
| Moc bierna Q | float | Mvar | -1000 - 1000 | 0.5 | Wymagane |
| Współczynnik mocy cos φ | float | - | 0.5 - 1.0 | - | Obliczony z P, Q |

#### 3.9.6 Grupa: Parametry modelu ZIP (zaawansowany)

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Moc bazowa P0 | float | MW | 0 - 1000 | 1.0 | Wymagane |
| Moc bazowa Q0 | float | Mvar | -1000 - 1000 | 0.5 | Wymagane |
| Napięcie bazowe U0 | float | kV | 0.4 - 400 | - | Z szyny |
| Wsp. impedancji ZIP (ap) | float | - | 0 - 1 | 0.4 | Suma = 1 |
| Wsp. prądu ZIP (bp) | float | - | 0 - 1 | 0.4 | Suma = 1 |
| Wsp. mocy ZIP (cp) | float | - | 0 - 1 | 0.2 | Suma = 1 |
| Wsp. impedancji ZIQ (aq) | float | - | 0 - 1 | 0.4 | Suma = 1 |
| Wsp. prądu ZIQ (bq) | float | - | 0 - 1 | 0.4 | Suma = 1 |
| Wsp. mocy ZIQ (cq) | float | - | 0 - 1 | 0.2 | Suma = 1 |

**Wzór ZIP:**
```
P = P0 × [ap×(U/U0)² + bp×(U/U0) + cp]
Q = Q0 × [aq×(U/U0)² + bq×(U/U0) + cq]
```

#### 3.9.7 Grupa: Parametry modelu silnikowego

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Moc znamionowa silnika Pn | float | kW | 0.1 - 10000 | 100 | Wymagane |
| Sprawność η | float | % | 70 - 98 | 95 | Wymagane |
| Współczynnik mocy cos φ | float | - | 0.7 - 0.95 | 0.85 | Wymagane |
| Prąd rozruchowy Ir/In | float | - | 4 - 8 | 6 | Wymagane |
| Współczynnik mocy rozruchowy cos φr | float | - | 0.1 - 0.4 | 0.2 | Wymagane |
| Stosunek Ik"/In | float | - | 4 - 10 | 6.5 | Dla obliczeń zwarciowych |

#### 3.9.8 Grupa: Parametry zwarciowe

| Pole | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|-----|-----------|--------|----------|-----------|
| Uwzględnij w zwarciu | boolean | - | - | true | Dla silników |
| Wkład do Ik" | enum | - | PEŁNY / ZREDUKOWANY / BRAK | PEŁNY | Zgodnie z IEC 60909 |

#### 3.9.9 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Opis odbiornika | string | TAK | Opis funkcjonalny |
| Numer ewidencyjny | string | TAK | Numer wewnętrzny |
| Lokalizacja | string | TAK | Miejsce instalacji |

#### 3.9.10 Grupa: Wartości obliczeniowe (tylko odczyt)

| Pole | Typ | Jednostka | Źródło | Opis |
|------|-----|-----------|--------|------|
| P obliczone | float | MW | PowerFlowResult | Moc czynna pobierana |
| Q obliczone | float | Mvar | PowerFlowResult | Moc bierna pobierana |
| S obliczone | float | MVA | PowerFlowResult | Moc pozorna |
| I obliczony | float | A | PowerFlowResult | Prąd pobierany |
| Ik" (wkład silników) | float | kA | ShortCircuitResult | Tylko dla modelu silnikowego |

#### 3.9.11 Grupa: Stan walidacji

| Kod | Poziom | Warunek | Komunikat |
|-----|--------|---------|-----------|
| E-LOD-001 | Błąd | Brak szyny | Odbiornik nie jest przyłączony do szyny |
| E-LOD-002 | Błąd | P < 0 | Moc czynna odbiornika nie może być ujemna |
| E-LOD-003 | Błąd | ZIP: suma ≠ 1 | Współczynniki ZIP muszą sumować się do 1 |
| W-LOD-001 | Ostrzeżenie | cos φ < 0.85 | Niski współczynnik mocy |

#### 3.9.12 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

### 3.10 Stacja (Substation) — obiekt grupujący

#### 3.10.1 Grupa: Identyfikacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| ID | string | NIE | Unikalny identyfikator systemowy |
| Nazwa | string | TAK | Nazwa stacji |
| UUID | UUID | NIE | Globalnie unikalny identyfikator |
| Typ obiektu | enum | NIE | Substation |

#### 3.10.2 Grupa: Stan

| Pole | Typ | Edytowalne | Domyślna | Opis |
|------|-----|------------|----------|------|
| W eksploatacji | boolean | TAK | true | Czy stacja jest aktywna |
| Stan cyklu życia | enum | TAK | AKTYWNY | PROJEKTOWANY / AKTYWNY / WYŁĄCZONY |

#### 3.10.3 Grupa: Lokalizacja

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Współrzędne GPS | (float, float) | TAK | Szerokość, długość geograficzna |
| Adres | string | TAK | Adres pocztowy |
| Działka | string | TAK | Numer działki ewidencyjnej |

#### 3.10.4 Grupa: Elementy stacji (tylko odczyt)

| Pole | Typ | Opis |
|------|-----|------|
| Szyny | list:Bus | Lista szyn należących do stacji |
| Transformatory | list:Transformer | Lista transformatorów |
| Pola rozdzielcze | int | Liczba pól |

#### 3.10.5 Grupa: Dane znamionowe (tabliczka)

| Pole | Typ | Edytowalne | Opis |
|------|-----|------------|------|
| Typ stacji | enum | TAK | GPZ / RPZ / STACJA_KOŃCOWA / ROZDZIELNIA |
| Poziomy napięć | string | TAK | np. "110/15 kV" |
| Moc zainstalowana | float | TAK | MVA |
| Właściciel | string | TAK | Operator/właściciel |
| Rok budowy | int | TAK | Rok oddania do eksploatacji |

#### 3.10.6 Grupa: Metadane audytowe

(Struktura identyczna jak dla Bus)

---

## 4. Menu Kontekstowe

Dla KAŻDEGO typu obiektu definiuje się pełne menu kontekstowe dostępne po kliknięciu prawym przyciskiem myszy. Menu MUSZĄ być w języku polskim.

### 4.1 Menu Kontekstowe: Projekt

```
┌─────────────────────────────────────────┐
│ 📁 Projekt: "Sieć SN Zakład"            │
├─────────────────────────────────────────┤
│ Nowy projekt...                         │
│ Otwórz projekt...                       │
│ Zapisz projekt                          │
│ Zapisz jako...                          │
│ ─────────────────────────────────────── │
│ Właściwości projektu...                 │
│ ─────────────────────────────────────── │
│ Eksportuj do PowerFactory...            │
│ Eksportuj do CIM...                     │
│ ─────────────────────────────────────── │
│ Zamknij projekt                         │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Nowy projekt... | ✓ | ✗ | Tworzy nowy projekt |
| Otwórz projekt... | ✓ | ✗ | Otwiera istniejący projekt |
| Zapisz projekt | ✓ | ✓ | Zapisuje stan projektu |
| Zapisz jako... | ✓ | ✓ | Zapisuje kopię projektu |
| Właściwości projektu... | ✓ | ✓ (RO) | Otwiera dialog właściwości |
| Eksportuj do PowerFactory... | ✓ | ✓ | Eksportuje model do formatu PF |
| Eksportuj do CIM... | ✓ | ✓ | Eksportuje do formatu CIM |
| Zamknij projekt | ✓ | ✓ | Zamyka projekt (z potwierdzeniem) |

### 4.2 Menu Kontekstowe: Model Sieci

```
┌─────────────────────────────────────────┐
│ 📁 Model sieci                          │
├─────────────────────────────────────────┤
│ ▶ Dodaj                                 │
│   ├─ Stację...                          │
│   ├─ Szynę...                           │
│   ├─ Linię/kabel...                     │
│   ├─ Transformator 2-uzwojeniowy...     │
│   ├─ Transformator 3-uzwojeniowy...     │
│   ├─ Wyłącznik...                       │
│   ├─ Rozłącznik...                      │
│   ├─ Źródło (sieć zewnętrzna)...        │
│   ├─ Generator...                       │
│   └─ Odbiornik...                       │
│ ─────────────────────────────────────── │
│ Waliduj model sieci                     │
│ ─────────────────────────────────────── │
│ Właściwości modelu...                   │
│ ─────────────────────────────────────── │
│ Usuń wszystkie elementy...              │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Dodaj > Stację... | ✓ | ✗ | Otwiera kreator stacji |
| Dodaj > Szynę... | ✓ | ✗ | Otwiera kreator szyny |
| Dodaj > Linię/kabel... | ✓ | ✗ | Otwiera kreator linii |
| Dodaj > Transformator... | ✓ | ✗ | Otwiera kreator transformatora |
| Dodaj > Wyłącznik... | ✓ | ✗ | Otwiera kreator wyłącznika |
| Dodaj > Rozłącznik... | ✓ | ✗ | Otwiera kreator rozłącznika |
| Dodaj > Źródło... | ✓ | ✗ | Otwiera kreator źródła |
| Dodaj > Generator... | ✓ | ✗ | Otwiera kreator generatora |
| Dodaj > Odbiornik... | ✓ | ✗ | Otwiera kreator odbiornika |
| Waliduj model sieci | ✓ | ✓ | Uruchamia NetworkValidator |
| Właściwości modelu... | ✓ | ✓ (RO) | Otwiera właściwości modelu |
| Usuń wszystkie elementy... | ✓ | ✗ | Usuwa z potwierdzeniem |

### 4.3 Menu Kontekstowe: Stacja

```
┌─────────────────────────────────────────┐
│ 🏭 Stacja: GPZ Główny                   │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ ▶ Dodaj do stacji                       │
│   ├─ Szynę...                           │
│   ├─ Transformator...                   │
│   ├─ Pole rozdzielcze...                │
│   └─ Wyposażenie pomocnicze...          │
│ ─────────────────────────────────────── │
│ Pokaż elementy stacji                   │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Kopiuj stację...                        │
│ ─────────────────────────────────────── │
│ Usuń stację...                          │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Dodaj do stacji > ... | ✓ | ✗ | Dodaje element do stacji |
| Pokaż elementy stacji | ✓ | ✓ | Filtruje drzewo do elementów stacji |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na stacji |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Kopiuj stację... | ✓ | ✗ | Tworzy kopię stacji z elementami |
| Usuń stację... | ✓ | ✗ | Usuwa stację (z potwierdzeniem) |

### 4.4 Menu Kontekstowe: Szyna

```
┌─────────────────────────────────────────┐
│ ═══ Szyna: SZ-GPZ-SN                    │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ ▶ Podłącz do szyny                      │
│   ├─ Linię/kabel...                     │
│   ├─ Transformator...                   │
│   ├─ Wyłącznik...                       │
│   ├─ Rozłącznik...                      │
│   ├─ Źródło...                          │
│   ├─ Generator...                       │
│   └─ Odbiornik...                       │
│ ─────────────────────────────────────── │
│ Pokaż połączone elementy                │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Ustaw jako lokalizację zwarcia          │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń szynę...                           │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Podłącz do szyny > ... | ✓ | ✗ | Tworzy nowy element połączony z szyną |
| Pokaż połączone elementy | ✓ | ✓ | Wyświetla listę połączonych elementów |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na szynie |
| Ustaw jako lokalizację zwarcia | ✓ | ✗ | Ustawia szynę jako fault_location w aktywnym przypadku |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń szynę... | ✓ | ✗ | Usuwa szynę (sprawdza połączenia) |

### 4.5 Menu Kontekstowe: Linia/Kabel

```
┌─────────────────────────────────────────┐
│ ─── Linia: LN-GPZ-STA                   │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Zmień szynę początkową...               │
│ Zmień szynę końcową...                  │
│ Zamień kierunek                         │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Edytor impedancji...                    │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Podziel linię...                        │
│ ─────────────────────────────────────── │
│ Usuń linię...                           │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Zmień szynę początkową... | ✓ | ✗ | Otwiera selektor szyny |
| Zmień szynę końcową... | ✓ | ✗ | Otwiera selektor szyny |
| Zamień kierunek | ✓ | ✗ | Zamienia from_bus i to_bus |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na linii |
| Edytor impedancji... | ✓ | ✗ | Otwiera zaawansowany edytor impedancji |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Podziel linię... | ✓ | ✗ | Dzieli linię na dwie części |
| Usuń linię... | ✓ | ✗ | Usuwa linię (z potwierdzeniem) |

### 4.6 Menu Kontekstowe: Transformator

```
┌─────────────────────────────────────────┐
│ ⊗ Transformator: TR-GPZ-01              │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Zmień szynę GN...                       │
│ Zmień szynę DN...                       │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Szczegółowy model transformatora...     │
│ Konfiguracja OLTC...                    │
│ ─────────────────────────────────────── │
│ Ustaw zaczep:  [▲] [0] [▼]              │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń transformator...                   │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Zmień szynę GN... | ✓ | ✗ | Otwiera selektor szyny |
| Zmień szynę DN... | ✓ | ✗ | Otwiera selektor szyny |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na transformatorze |
| Szczegółowy model transformatora... | ✓ | ✗ | Otwiera modal zaawansowany |
| Konfiguracja OLTC... | ✓ | ✗ | Otwiera konfigurację OLTC |
| Ustaw zaczep | ✓ | ✗ | Zmienia aktualny zaczep |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń transformator... | ✓ | ✗ | Usuwa transformator (z potwierdzeniem) |

### 4.7 Menu Kontekstowe: Wyłącznik

```
┌─────────────────────────────────────────┐
│ ◯ Wyłącznik: WŁ-GPZ-SN-01               │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Pozycja: ZAMKNIJ                        │
│ Pozycja: OTWÓRZ                         │
│ ─────────────────────────────────────── │
│ Zmień szynę...                          │
│ Zmień gałąź...                          │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Sprawdź zdolność łączeniową...          │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń wyłącznik...                       │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Pozycja: ZAMKNIJ | ✓ | ✗ | Ustawia pozycję = ZAMKNIĘTY |
| Pozycja: OTWÓRZ | ✓ | ✗ | Ustawia pozycję = OTWARTY |
| Zmień szynę... | ✓ | ✗ | Otwiera selektor szyny |
| Zmień gałąź... | ✓ | ✗ | Otwiera selektor gałęzi |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na wyłączniku |
| Sprawdź zdolność łączeniową... | ✓ | ✓ | Porównuje Ik" z parametrami znamionowymi |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń wyłącznik... | ✓ | ✗ | Usuwa wyłącznik (z potwierdzeniem) |

### 4.8 Menu Kontekstowe: Rozłącznik

```
┌─────────────────────────────────────────┐
│ ─ Rozłącznik: RZ-STA-01                 │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Pozycja: ZAMKNIJ                        │
│ Pozycja: OTWÓRZ                         │
│ ─────────────────────────────────────── │
│ Zmień szynę...                          │
│ Zmień gałąź...                          │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń rozłącznik...                      │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Pozycja: ZAMKNIJ | ✓ | ✗ | Ustawia pozycję = ZAMKNIĘTY |
| Pozycja: OTWÓRZ | ✓ | ✗ | Ustawia pozycję = OTWARTY |
| Zmień szynę... | ✓ | ✗ | Otwiera selektor szyny |
| Zmień gałąź... | ✓ | ✗ | Otwiera selektor gałęzi |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na rozłączniku |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń rozłącznik... | ✓ | ✗ | Usuwa rozłącznik (z potwierdzeniem) |

### 4.9 Menu Kontekstowe: Źródło (Sieć Zewnętrzna)

```
┌─────────────────────────────────────────┐
│ ⚡ Źródło: ZR-GPZ                        │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Zmień szynę przyłączenia...             │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Model zwarciowy źródła...               │
│ ─────────────────────────────────────── │
│ Ustaw jako węzeł bilansujący (SLACK)    │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń źródło...                          │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Zmień szynę przyłączenia... | ✓ | ✗ | Otwiera selektor szyny |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na źródle |
| Model zwarciowy źródła... | ✓ | ✗ | Otwiera modal modelu zwarciowego |
| Ustaw jako węzeł bilansujący | ✓ | ✗ | Ustawia typ węzła = SLACK |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń źródło... | ✓ | ✗ | Usuwa źródło (sprawdza czy nie jedyne) |

### 4.10 Menu Kontekstowe: Generator

```
┌─────────────────────────────────────────┐
│ ⚡ Generator: GEN-ST01-01                │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Zmień szynę przyłączenia...             │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Parametry zwarciowe generatora...       │
│ Krzywa zdolności (PQ diagram)...        │
│ ─────────────────────────────────────── │
│ Ustaw moc zadaną...                     │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń generator...                       │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Zmień szynę przyłączenia... | ✓ | ✗ | Otwiera selektor szyny |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na generatorze |
| Parametry zwarciowe generatora... | ✓ | ✗ | Otwiera modal parametrów zwarciowych |
| Krzywa zdolności... | ✓ | ✓ | Wyświetla diagram PQ generatora |
| Ustaw moc zadaną... | ✓ | ✗ | Otwiera dialog ustawienia mocy P, Q |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń generator... | ✓ | ✗ | Usuwa generator (z potwierdzeniem) |

### 4.11 Menu Kontekstowe: Odbiornik

```
┌─────────────────────────────────────────┐
│ ▽ Odbiornik: OD-STA-01                  │
├─────────────────────────────────────────┤
│ Właściwości...                          │
│ ─────────────────────────────────────── │
│ Zmień szynę przyłączenia...             │
│ ─────────────────────────────────────── │
│ Pokaż na schemacie                      │
│ ─────────────────────────────────────── │
│ Model obciążenia...                     │
│   ├─ Model PQ                           │
│   ├─ Model ZIP                          │
│   └─ Model silnikowy                    │
│ ─────────────────────────────────────── │
│ Ustaw moc zadaną...                     │
│ ─────────────────────────────────────── │
│ W eksploatacji                     [✓]  │
│ ─────────────────────────────────────── │
│ Usuń odbiornik...                       │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości... | ✓ | ✓ (RO) | Otwiera siatkę właściwości |
| Zmień szynę przyłączenia... | ✓ | ✗ | Otwiera selektor szyny |
| Pokaż na schemacie | ✓ | ✓ | Centruje widok na odbiorniku |
| Model obciążenia > Model PQ | ✓ | ✗ | Ustawia typ modelu = PQ |
| Model obciążenia > Model ZIP | ✓ | ✗ | Ustawia typ modelu = ZIP |
| Model obciążenia > Model silnikowy | ✓ | ✗ | Ustawia typ modelu = SILNIK |
| Ustaw moc zadaną... | ✓ | ✗ | Otwiera dialog ustawienia mocy P, Q |
| W eksploatacji | ✓ | ✗ | Przełącza stan in_service |
| Usuń odbiornik... | ✓ | ✗ | Usuwa odbiornik (z potwierdzeniem) |

### 4.12 Menu Kontekstowe: Przypadek Obliczeniowy

```
┌─────────────────────────────────────────┐
│ ⚡ Przypadek: SC-001                     │
├─────────────────────────────────────────┤
│ Właściwości przypadku...                │
│ ─────────────────────────────────────── │
│ Ustaw jako aktywny                      │
│ ─────────────────────────────────────── │
│ Oblicz                                  │
│ ─────────────────────────────────────── │
│ Pokaż wyniki                            │
│ ─────────────────────────────────────── │
│ Klonuj przypadek...                     │
│ Porównaj z przypadkiem...               │
│ ─────────────────────────────────────── │
│ Eksportuj wyniki...                     │
│ ─────────────────────────────────────── │
│ Usuń przypadek...                       │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Właściwości przypadku... | ✓ | ✓ (RO) | Otwiera parametry przypadku |
| Ustaw jako aktywny | ✓ | ✓ | Ustawia przypadek jako aktywny |
| Oblicz | ✓ | ✓ | Uruchamia solver dla przypadku |
| Pokaż wyniki | ✓ (gdy dostępne) | ✓ | Przełącza do trybu wyników |
| Klonuj przypadek... | ✓ | ✓ | Tworzy kopię przypadku z parametrami |
| Porównaj z przypadkiem... | ✓ | ✓ | Otwiera porównanie wyników |
| Eksportuj wyniki... | ✓ (gdy dostępne) | ✓ | Eksportuje wyniki do pliku |
| Usuń przypadek... | ✓ | ✗ | Usuwa przypadek (z potwierdzeniem) |

### 4.13 Menu Kontekstowe: Wynik

```
┌─────────────────────────────────────────┐
│ 📊 Wynik: SC-001-R-2024-01-15-14:30     │
├─────────────────────────────────────────┤
│ Pokaż wyniki                            │
│ ─────────────────────────────────────── │
│ Szczegóły wyniku...                     │
│ ─────────────────────────────────────── │
│ Eksportuj do CSV...                     │
│ Eksportuj do PDF...                     │
│ Eksportuj do Excel...                   │
│ ─────────────────────────────────────── │
│ Porównaj z innym wynikiem...            │
│ ─────────────────────────────────────── │
│ Usuń wynik...                           │
└─────────────────────────────────────────┘
```

| Akcja | Tryb Edycji | Tryb Wyników | Wpływ |
|-------|-------------|--------------|-------|
| Pokaż wyniki | ✓ | ✓ | Przełącza do trybu wyników |
| Szczegóły wyniku... | ✓ | ✓ | Otwiera pełny raport wyników |
| Eksportuj do CSV... | ✓ | ✓ | Eksportuje dane do CSV |
| Eksportuj do PDF... | ✓ | ✓ | Generuje raport PDF |
| Eksportuj do Excel... | ✓ | ✓ | Eksportuje do formatu XLSX |
| Porównaj z innym wynikiem... | ✓ | ✓ | Otwiera porównanie wyników |
| Usuń wynik... | ✓ | ✓ | Usuwa wynik (z potwierdzeniem) |

---

## 5. Przebieg Kreatora — Pełny Cykl Inżynierski

### 5.1 Obowiązkowa Kolejność Kroków

Kreator wymusza następującą sekwencję kroków dla pełnego cyklu projektowania i analizy sieci:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PEŁNY CYKL INŻYNIERSKI                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DEFINICJA PROJEKTU                                                      │
│     └─► 2. SZKIELET TOPOLOGII SIECI                                         │
│           └─► 3. POZIOMY NAPIĘĆ I SZYNY                                     │
│                 └─► 4. STACJE                                               │
│                       └─► 5. LINIE I KABLE                                  │
│                             └─► 6. TRANSFORMATORY (2W/3W)                   │
│                                   └─► 7. APARATURA ŁĄCZENIOWA               │
│                                         └─► 8. ŹRÓDŁA I GENERATORY          │
│                                               └─► 9. ODBIORY                │
│                                                     └─► 10. WALIDACJA SIECI │
│                                                           │                 │
│  ┌──────────────────────────────────────────────────────────┘               │
│  │                                                                          │
│  └─► 11. TWORZENIE PRZYPADKU OBLICZENIOWEGO                                 │
│         └─► 12. PARAMETRYZACJA PRZYPADKU                                    │
│               └─► 13. OBLICZENIA                                            │
│                     └─► 14. ANALIZA WYNIKÓW                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Faza I: Budowanie Modelu Sieci (Kroki 1-10)

| Krok | Identyfikator | Tytuł | Cel | Warunek Przejścia |
|------|---------------|-------|-----|-------------------|
| 1 | WZ-01 | Definicja projektu | Utworzenie lub wybór projektu | Projekt zapisany |
| 2 | WZ-02 | Szkielet topologii | Określenie struktury sieci | Minimum 1 szyna |
| 3 | WZ-03 | Poziomy napięć | Definicja poziomów napięć | Wszystkie szyny mają Un |
| 4 | WZ-04 | Stacje | Grupowanie elementów w stacje | Opcjonalne |
| 5 | WZ-05 | Linie i kable | Definicja gałęzi liniowych | Wszystkie linie mają R', X' |
| 6 | WZ-06 | Transformatory | Definicja transformatorów | Wszystkie TR mają uk%, Sn |
| 7 | WZ-07 | Aparatura łączeniowa | Definicja wyłączników i rozłączników | Wszystkie mają pozycję |
| 8 | WZ-08 | Źródła i generatory | Definicja źródeł zasilania | Minimum 1 źródło |
| 9 | WZ-09 | Odbiory | Definicja odbiorników | Wszystkie mają P, Q |
| 10 | WZ-10 | Walidacja sieci | Sprawdzenie poprawności modelu | Brak błędów krytycznych |

### 5.3 Faza II: Analiza (Kroki 11-14)

| Krok | Identyfikator | Tytuł | Cel | Warunek Przejścia |
|------|---------------|-------|-----|-------------------|
| 11 | WZ-11 | Tworzenie przypadku | Utworzenie przypadku obliczeniowego | Przypadek utworzony |
| 12 | WZ-12 | Parametryzacja przypadku | Konfiguracja parametrów solvera | Wszystkie parametry zdefiniowane |
| 13 | WZ-13 | Obliczenia | Wykonanie obliczeń | Solver zakończony bez błędów |
| 14 | WZ-14 | Analiza wyników | Przeglądanie i eksport wyników | N/A (krok końcowy) |

### 5.4 Reguły Nawigacji

| Przycisk | Akcja | Walidacja |
|----------|-------|-----------|
| ◀ Wstecz | Powrót do poprzedniego kroku | Brak (dane zachowane) |
| Dalej ▶ | Przejście do następnego kroku | Walidacja bieżącego kroku |
| Zapisz | Zapisuje model bez przejścia | Brak |
| Anuluj | Anuluje kreator | Potwierdzenie jeśli są zmiany |
| Zakończ | Kończy kreator (tylko z WZ-10 lub WZ-14) | Pełna walidacja modelu |

### 5.5 Walidacja Przed Solverem

**WYMÓG BEZWZGLĘDNY:** Krok 10 (Walidacja sieci) MUSI zakończyć się sukcesem przed przejściem do kroków obliczeniowych.

```
┌─────────────────────────────────────────────────────────────────┐
│ KROK 10: WALIDACJA SIECI                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ NetworkValidator.validate(model)                                │
│         │                                                       │
│         ├── BŁĘDY KRYTYCZNE → [Dalej ▶] ZABLOKOWANY             │
│         │                                                       │
│         ├── OSTRZEŻENIA → [Dalej ▶] AKTYWNY                     │
│         │                 (Użytkownik musi potwierdzić)          │
│         │                                                       │
│         └── BRAK PROBLEMÓW → [Dalej ▶] AKTYWNY                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Szczegółowe Ekrany i Modale

Dla KAŻDEGO ekranu kreatora definiuje się kompletną specyfikację.

### 6.1 Ekran WZ-01: Definicja Projektu

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-01 |
| **Tytuł** | Definicja projektu |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Uruchomienie kreatora / Menu: Plik > Nowy projekt |
| **Warunki wstępne** | Brak |

#### 6.1.1 Pola formularza

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| project_name | Nazwa projektu | string | - | 1-255 znaków | "Nowy projekt" | Wymagane, niepuste |
| project_description | Opis projektu | textarea | - | 0-2000 znaków | "" | Opcjonalne |
| client_name | Nazwa klienta | string | - | 0-255 znaków | "" | Opcjonalne |
| project_number | Numer projektu | string | - | 0-50 znaków | "" | Opcjonalne |
| project_date | Data projektu | date | - | - | Dzisiaj | Wymagane |
| author | Autor | string | - | 0-100 znaków | Zalogowany użytkownik | Opcjonalne |
| base_frequency | Częstotliwość bazowa | enum | Hz | 50 / 60 | 50 | Wymagane |
| base_voltage_levels | Poziomy napięć | multi-select | kV | 0.4, 6, 10, 15, 20, 30, 110, 220, 400 | [15, 110] | Minimum 1 |

#### 6.1.2 Zakładki

| Zakładka | Zawartość |
|----------|-----------|
| Ogólne | Pola podstawowe (nazwa, opis, klient) |
| Parametry systemu | Częstotliwość, poziomy napięć |
| Metadane | Autor, data, numer projektu |

#### 6.1.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| Dalej ▶ | Przejdź do WZ-02 | Nazwa projektu niepusta |
| Anuluj | Zamknij kreator | - |

#### 6.1.4 Wpływ na model

- Tworzy nowy obiekt Project
- Inicjalizuje pusty NetworkModel
- Ustawia parametry systemowe (częstotliwość, poziomy napięć)

---

### 6.2 Ekran WZ-02: Szkielet Topologii Sieci

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-02 |
| **Tytuł** | Szkielet topologii sieci |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-01 |
| **Warunki wstępne** | Projekt utworzony |

#### 6.2.1 Pola formularza

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| network_type | Typ sieci | enum | - | PROMIENIOWA / PIERŚCIENIOWA / MIESZANA | PROMIENIOWA | Wymagane |
| network_name | Nazwa sieci | string | - | 1-255 znaków | "Model sieci" | Wymagane |
| initial_buses_count | Liczba początkowych szyn | int | - | 1 - 100 | 3 | Wymagane, ≥ 1 |

#### 6.2.2 Widok graficzny

```
┌─────────────────────────────────────────────────────────────────┐
│ PODGLĄD TOPOLOGII                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ════════════════════════════════ Szyna 1 (Un = ? kV)       │
│              │                                                  │
│             [?]                                                 │
│              │                                                  │
│     ════════════════════════════════ Szyna 2 (Un = ? kV)       │
│              │                                                  │
│             [?]                                                 │
│              │                                                  │
│     ════════════════════════════════ Szyna 3 (Un = ? kV)       │
│                                                                 │
│ [+ Dodaj szynę] [- Usuń ostatnią]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj szynę | Dodaje nową szynę do listy | - |
| - Usuń ostatnią | Usuwa ostatnią szynę | Minimum 1 szyna pozostaje |
| ◀ Wstecz | Powrót do WZ-01 | - |
| Dalej ▶ | Przejdź do WZ-03 | Minimum 1 szyna |

#### 6.2.4 Wpływ na model

- Tworzy obiekty Bus dla każdej szyny
- Ustawia wstępną topologię

---

### 6.3 Ekran WZ-03: Poziomy Napięć i Szyny

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-03 |
| **Tytuł** | Poziomy napięć i parametry szyn |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-02 |
| **Warunki wstępne** | Minimum 1 szyna utworzona |

#### 6.3.1 Tabela edycyjna szyn

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARAMETRY SZYN                                                              │
├───────────────┬────────────────┬────────────┬─────────────┬─────────────────┤
│ Nazwa         │ Napięcie [kV]  │ Typ szyny  │ Prąd zn [A] │ Stacja          │
├───────────────┼────────────────┼────────────┼─────────────┼─────────────────┤
│ [SZ-GPZ-WN  ] │ [110.0     ] ▼ │ [ZBIORCZA] │ [1250     ] │ [GPZ Główny  ] ▼│
│ [SZ-GPZ-SN  ] │ [15.0      ] ▼ │ [ZBIORCZA] │ [2000     ] │ [GPZ Główny  ] ▼│
│ [SZ-STA-01  ] │ [15.0      ] ▼ │ [ZBIORCZA] │ [1000     ] │ [Stacja A    ] ▼│
├───────────────┴────────────────┴────────────┴─────────────┴─────────────────┤
│ [+ Dodaj szynę] [Importuj z listy...]                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.3.2 Pola dla każdej szyny

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa | string | - | 1-100 znaków | SZ-{NR} | Wymagane, unikalne |
| nominal_voltage | Napięcie znamionowe | select | kV | Z listy projektu | 15.0 | Wymagane |
| bus_type | Typ szyny | enum | - | ZBIORCZA / SEKCYJNA / ODCZEPOWA | ZBIORCZA | Wymagane |
| rated_current | Prąd znamionowy | float | A | 100 - 10000 | 1000 | Wymagane, > 0 |
| substation | Stacja | ref:Substation | - | Lista stacji | - | Opcjonalne |

#### 6.3.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj szynę | Dodaje nowy wiersz | - |
| Importuj z listy... | Importuje szyny z pliku CSV | - |
| ◀ Wstecz | Powrót do WZ-02 | - |
| Dalej ▶ | Przejdź do WZ-04 | Wszystkie szyny mają Un > 0 |

#### 6.3.4 Wpływ na model

- Aktualizuje parametry obiektów Bus
- Przypisuje szyny do stacji

---

### 6.4 Ekran WZ-04: Stacje

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-04 |
| **Tytuł** | Definicja stacji |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-03 |
| **Warunki wstępne** | Szyny zdefiniowane |

#### 6.4.1 Tabela edycyjna stacji

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STACJE                                                                      │
├───────────────┬────────────────┬───────────────────┬────────────────────────┤
│ Nazwa         │ Typ stacji     │ Poziomy napięć    │ Szyny                  │
├───────────────┼────────────────┼───────────────────┼────────────────────────┤
│ [GPZ Główny ] │ [GPZ        ] ▼│ 110/15 kV         │ SZ-GPZ-WN, SZ-GPZ-SN   │
│ [Stacja A   ] │ [ROZDZIELNIA] ▼│ 15 kV             │ SZ-STA-01              │
│ [Stacja B   ] │ [ROZDZIELNIA] ▼│ 15 kV             │ SZ-STB-01              │
├───────────────┴────────────────┴───────────────────┴────────────────────────┤
│ [+ Dodaj stację]                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.4.2 Pola dla każdej stacji

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa stacji | string | - | 1-100 znaków | "Stacja {NR}" | Wymagane, unikalne |
| station_type | Typ stacji | enum | - | GPZ / RPZ / STACJA_KOŃCOWA / ROZDZIELNIA | ROZDZIELNIA | Wymagane |
| voltage_levels | Poziomy napięć | calculated | kV | - | - | Z przypisanych szyn |
| buses | Szyny | multi-ref:Bus | - | - | - | Minimum 1 szyna |
| address | Adres | string | - | 0-255 znaków | "" | Opcjonalne |
| gps_lat | Szerokość GPS | float | ° | -90 - 90 | - | Opcjonalne |
| gps_lon | Długość GPS | float | ° | -180 - 180 | - | Opcjonalne |

#### 6.4.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj stację | Dodaje nową stację | - |
| ◀ Wstecz | Powrót do WZ-03 | - |
| Dalej ▶ | Przejdź do WZ-05 | - |
| Pomiń | Przejdź do WZ-05 bez definiowania stacji | - |

#### 6.4.4 Wpływ na model

- Tworzy obiekty Substation
- Przypisuje szyny do stacji

---

### 6.5 Ekran WZ-05: Linie i Kable

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-05 |
| **Tytuł** | Definicja linii i kabli |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-04 |
| **Warunki wstępne** | Minimum 2 szyny zdefiniowane |

#### 6.5.1 Tabela edycyjna linii

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ LINIE I KABLE                                                                           │
├────────────┬──────────┬──────────┬───────┬────────────┬──────────┬──────────┬───────────┤
│ Nazwa      │ Od szyny │ Do szyny │ Typ   │ Długość    │ R' [Ω/km]│ X' [Ω/km]│ Idop [A]  │
├────────────┼──────────┼──────────┼───────┼────────────┼──────────┼──────────┼───────────┤
│ [LN-GPZ-A ]│ [SZ-GPZ ]▼│ [SZ-STA]▼│[KABEL]▼│ [2.5     ]│ [0.125  ]│ [0.08   ]│ [350     ]│
│ [LN-GPZ-B ]│ [SZ-GPZ ]▼│ [SZ-STB]▼│[NAPOW]▼│ [5.0     ]│ [0.27   ]│ [0.35   ]│ [280     ]│
├────────────┴──────────┴──────────┴───────┴────────────┴──────────┴──────────┴───────────┤
│ [+ Dodaj linię] [Wybierz z katalogu...]                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.5.2 Pola dla każdej linii

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa | string | - | 1-100 znaków | LN-{OD}-{DO} | Wymagane, unikalne |
| from_bus | Szyna początkowa | ref:Bus | - | Lista szyn | - | Wymagane |
| to_bus | Szyna końcowa | ref:Bus | - | Lista szyn | - | Wymagane, ≠ from_bus |
| line_type | Typ przewodu | enum | - | KABEL / NAPOWIETRZNA | KABEL | Wymagane |
| length | Długość | float | km | 0.001 - 1000 | 1.0 | Wymagane, > 0 |
| r_per_km | Rezystancja R' | float | Ω/km | 0.001 - 10 | 0.125 | Wymagane, > 0 |
| x_per_km | Reaktancja X' | float | Ω/km | 0.001 - 10 | 0.08 | Wymagane, > 0 |
| b_per_km | Susceptancja B' | float | µS/km | 0 - 1000 | 0 | ≥ 0 |
| rated_current | Prąd dopuszczalny | float | A | 10 - 5000 | 300 | Wymagane, > 0 |
| cross_section | Przekrój | float | mm² | 1 - 2000 | 240 | Wymagane, > 0 |

#### 6.5.3 Przycisk "Wybierz z katalogu..."

Otwiera modal wyboru przewodu z predefiniowanego katalogu:

```
┌─────────────────────────────────────────────────────────────────┐
│ KATALOG PRZEWODÓW                                    [X]        │
├─────────────────────────────────────────────────────────────────┤
│ Filtr: [Wszystkie      ] ▼  Szukaj: [               ]          │
├─────────────────────────────────────────────────────────────────┤
│ ▼ KABLE SN                                                      │
│   ├─ XRUHAKXS 3x70    R'=0.443 X'=0.099 Idop=195A              │
│   ├─ XRUHAKXS 3x120   R'=0.253 X'=0.094 Idop=260A              │
│   ├─ XRUHAKXS 3x185   R'=0.164 X'=0.089 Idop=325A              │
│   ├─ XRUHAKXS 3x240   R'=0.125 X'=0.086 Idop=380A      [✓]     │
│   └─ XRUHAKXS 3x300   R'=0.100 X'=0.083 Idop=430A              │
│ ▼ LINIE NAPOWIETRZNE SN                                         │
│   ├─ AFL-6 35         R'=0.85  X'=0.38  Idop=135A              │
│   ├─ AFL-6 70         R'=0.44  X'=0.36  Idop=210A              │
│   └─ AFL-6 120        R'=0.27  X'=0.35  Idop=280A              │
├─────────────────────────────────────────────────────────────────┤
│                                    [Anuluj] [Wybierz]          │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.5.4 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj linię | Dodaje nowy wiersz | - |
| Wybierz z katalogu... | Otwiera katalog przewodów | - |
| ◀ Wstecz | Powrót do WZ-04 | - |
| Dalej ▶ | Przejdź do WZ-06 | Wszystkie linie mają R', X' > 0 |

#### 6.5.5 Wpływ na model

- Tworzy obiekty LineBranch
- Łączy szyny zgodnie z topologią

---

### 6.6 Ekran WZ-06: Transformatory

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-06 |
| **Tytuł** | Definicja transformatorów |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-05 |
| **Warunki wstępne** | Szyny o różnych poziomach napięć |

#### 6.6.1 Wybór typu transformatora

```
┌─────────────────────────────────────────────────────────────────┐
│ TYP TRANSFORMATORA                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │                     │    │                     │            │
│  │   ⊗                 │    │     ⊗               │            │
│  │  ╱ ╲                │    │    ╱│╲              │            │
│  │ ╱   ╲               │    │   ╱ │ ╲             │            │
│  │ GN   DN             │    │  GN SN DN           │            │
│  │                     │    │                     │            │
│  │  2-uzwojeniowy      │    │  3-uzwojeniowy      │            │
│  │                     │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  [○] Transformator 2-uzwojeniowy                               │
│  [ ] Transformator 3-uzwojeniowy                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.6.2 Tabela edycyjna transformatorów 2-uzwojeniowych

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATORY 2-UZWOJENIOWE                                                                    │
├──────────┬──────────┬──────────┬────────┬─────────┬─────────┬────────┬────────┬─────────────────┤
│ Nazwa    │ Szyna GN │ Szyna DN │ Sn[MVA]│ Un_GN   │ Un_DN   │ uk [%] │ Pk [kW]│ Grupa połączeń  │
├──────────┼──────────┼──────────┼────────┼─────────┼─────────┼────────┼────────┼─────────────────┤
│ [TR-01  ]│ [SZ-WN ]▼│ [SZ-SN ]▼│ [25.0 ]│ [110.0 ]│ [15.0  ]│ [10.5 ]│ [125  ]│ [Dyn11       ] ▼│
│ [TR-02  ]│ [SZ-WN ]▼│ [SZ-SN ]▼│ [25.0 ]│ [110.0 ]│ [15.0  ]│ [10.5 ]│ [125  ]│ [Dyn11       ] ▼│
├──────────┴──────────┴──────────┴────────┴─────────┴─────────┴────────┴────────┴─────────────────┤
│ [+ Dodaj transformator] [Wybierz z katalogu...] [Konfiguruj OLTC...]                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.6.3 Pola dla transformatora 2-uzwojeniowego

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa | string | - | 1-100 znaków | TR-{STACJA}-{NR} | Wymagane, unikalne |
| hv_bus | Szyna GN | ref:Bus | - | Lista szyn | - | Wymagane |
| lv_bus | Szyna DN | ref:Bus | - | Lista szyn | - | Wymagane, ≠ hv_bus |
| rated_power | Moc znamionowa Sn | float | MVA | 0.05 - 1000 | 25.0 | Wymagane, > 0 |
| hv_voltage | Napięcie GN | float | kV | 0.4 - 800 | 110.0 | Wymagane, > lv_voltage |
| lv_voltage | Napięcie DN | float | kV | 0.4 - 400 | 15.0 | Wymagane, > 0 |
| uk_percent | Napięcie zwarcia uk% | float | % | 4 - 25 | 10.5 | Wymagane, 4 ≤ uk ≤ 25 |
| pk | Straty obciążeniowe Pk | float | kW | 1 - 1000 | 125.0 | Wymagane, > 0 |
| p0 | Straty jałowe P0 | float | kW | 0.1 - 200 | 25.0 | Wymagane, > 0 |
| i0_percent | Prąd jałowy i0% | float | % | 0.1 - 5 | 0.5 | Opcjonalne |
| vector_group | Grupa połączeń | enum | - | Lista grup | Dyn11 | Wymagane |

#### 6.6.4 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj transformator | Dodaje nowy wiersz | - |
| Wybierz z katalogu... | Otwiera katalog transformatorów | - |
| Konfiguruj OLTC... | Otwiera modal OLTC | Transformator wybrany |
| ◀ Wstecz | Powrót do WZ-05 | - |
| Dalej ▶ | Przejdź do WZ-07 | Wszystkie TR mają uk%, Sn > 0 |

#### 6.6.5 Wpływ na model

- Tworzy obiekty TransformerBranch
- Łączy szyny o różnych poziomach napięć

---

### 6.7 Ekran WZ-07: Aparatura Łączeniowa

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-07 |
| **Tytuł** | Definicja aparatury łączeniowej |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-06 |
| **Warunki wstępne** | Szyny zdefiniowane |

#### 6.7.1 Tabela edycyjna wyłączników

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ WYŁĄCZNIKI                                                                              │
├──────────────┬──────────┬──────────┬───────────┬───────────┬───────────┬────────────────┤
│ Nazwa        │ Szyna    │ Gałąź    │ Un [kV]   │ In [A]    │ Ik [kA]   │ Pozycja        │
├──────────────┼──────────┼──────────┼───────────┼───────────┼───────────┼────────────────┤
│ [WŁ-GPZ-01 ]│ [SZ-SN ]▼│ [LN-01 ]▼│ [15.0    ]│ [1250    ]│ [25.0    ]│ [ZAMKNIĘTY  ] ▼│
│ [WŁ-GPZ-02 ]│ [SZ-SN ]▼│ [LN-02 ]▼│ [15.0    ]│ [1250    ]│ [25.0    ]│ [ZAMKNIĘTY  ] ▼│
├──────────────┴──────────┴──────────┴───────────┴───────────┴───────────┴────────────────┤
│ [+ Dodaj wyłącznik] [Wybierz z katalogu...]                                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.7.2 Tabela edycyjna rozłączników

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ ROZŁĄCZNIKI                                                                             │
├──────────────┬──────────┬──────────┬───────────┬───────────┬───────────┬────────────────┤
│ Nazwa        │ Szyna    │ Gałąź    │ Un [kV]   │ In [A]    │ Icw [kA]  │ Pozycja        │
├──────────────┼──────────┼──────────┼───────────┼───────────┼───────────┼────────────────┤
│ [RZ-STA-01 ]│ [SZ-STA]▼│ [LN-01 ]▼│ [15.0    ]│ [630     ]│ [25.0    ]│ [ZAMKNIĘTY  ] ▼│
├──────────────┴──────────┴──────────┴───────────┴───────────┴───────────┴────────────────┤
│ [+ Dodaj rozłącznik] [Wybierz z katalogu...]                                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.7.3 Pola dla wyłącznika

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa | string | - | 1-100 znaków | WŁ-{SZYNA}-{NR} | Wymagane, unikalne |
| bus | Szyna | ref:Bus | - | Lista szyn | - | Wymagane |
| branch | Gałąź | ref:Branch | - | Lista gałęzi | - | Opcjonalne |
| rated_voltage | Napięcie znamionowe Un | float | kV | 0.4 - 800 | 15.0 | Wymagane |
| rated_current | Prąd znamionowy In | float | A | 100 - 10000 | 1250 | Wymagane |
| breaking_current | Prąd wyłączalny Ik | float | kA | 5 - 100 | 25.0 | Wymagane |
| making_current | Prąd załączalny Ima | float | kA | 10 - 250 | 63.0 | Wymagane |
| position | Pozycja | enum | - | ZAMKNIĘTY / OTWARTY | ZAMKNIĘTY | Wymagane |

#### 6.7.4 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj wyłącznik | Dodaje nowy wyłącznik | - |
| + Dodaj rozłącznik | Dodaje nowy rozłącznik | - |
| Wybierz z katalogu... | Otwiera katalog aparatury | - |
| ◀ Wstecz | Powrót do WZ-06 | - |
| Dalej ▶ | Przejdź do WZ-08 | - |
| Pomiń | Przejdź do WZ-08 bez definiowania aparatury | - |

#### 6.7.5 Wpływ na model

- Tworzy obiekty Switch (typ: CircuitBreaker / Disconnector)
- Przypisuje do szyn i gałęzi

---

### 6.8 Ekran WZ-08: Źródła i Generatory

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-08 |
| **Tytuł** | Definicja źródeł zasilania |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-07 |
| **Warunki wstępne** | Szyny zdefiniowane |

#### 6.8.1 Tabela edycyjna sieci zewnętrznych

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIECI ZEWNĘTRZNE (EXTERNAL GRID)                                                        │
├────────────┬──────────┬───────────┬────────────┬───────────┬───────────┬────────────────┤
│ Nazwa      │ Szyna    │ Un [kV]   │ Sk" [MVA]  │ R/X       │ Typ węzła │ Operator       │
├────────────┼──────────┼───────────┼────────────┼───────────┼───────────┼────────────────┤
│ [ZR-GPZ   ]│ [SZ-WN ]▼│ [110.0   ]│ [5000     ]│ [0.1     ]│ [SLACK  ]▼│ [PGE Dystr.  ]│
├────────────┴──────────┴───────────┴────────────┴───────────┴───────────┴────────────────┤
│ [+ Dodaj sieć zewnętrzną] [Model zwarciowy...]                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.8.2 Tabela edycyjna generatorów

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ GENERATORY SYNCHRONICZNE                                                                │
├────────────┬──────────┬───────────┬────────────┬───────────┬───────────┬────────────────┤
│ Nazwa      │ Szyna    │ Un [kV]   │ Sn [MVA]   │ Pn [MW]   │ X"d [p.u.]│ Typ węzła      │
├────────────┼──────────┼───────────┼────────────┼───────────┼───────────┼────────────────┤
│ [GEN-01   ]│ [SZ-GEN]▼│ [6.3     ]│ [10.0     ]│ [8.0     ]│ [0.15    ]│ [PV         ] ▼│
├────────────┴──────────┴───────────┴────────────┴───────────┴───────────┴────────────────┤
│ [+ Dodaj generator] [Parametry zwarciowe...]                                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.8.3 Pola dla sieci zewnętrznej

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa | string | - | 1-100 znaków | ZR-{STACJA} | Wymagane, unikalne |
| bus | Szyna przyłączenia | ref:Bus | - | Lista szyn | - | Wymagane |
| rated_voltage | Napięcie znamionowe | float | kV | 0.4 - 800 | 110.0 | Wymagane |
| sk_3ph | Moc zwarciowa Sk" | float | MVA | 100 - 100000 | 5000 | Wymagane |
| rx_ratio | Stosunek R/X | float | - | 0.05 - 0.5 | 0.1 | Wymagane |
| node_type | Typ węzła | enum | - | SLACK / PV | SLACK | Wymagane |
| operator | Operator sieci | string | - | 0-100 znaków | "" | Opcjonalne |

#### 6.8.4 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj sieć zewnętrzną | Dodaje nowe źródło | - |
| + Dodaj generator | Dodaje nowy generator | - |
| Model zwarciowy... | Otwiera modal modelu zwarciowego | Źródło wybrane |
| Parametry zwarciowe... | Otwiera modal parametrów generatora | Generator wybrany |
| ◀ Wstecz | Powrót do WZ-07 | - |
| Dalej ▶ | Przejdź do WZ-09 | Minimum 1 źródło zdefiniowane |

#### 6.8.5 Wpływ na model

- Tworzy obiekty ExternalGrid i/lub SynchronousGenerator
- Definiuje punkt zasilania sieci

---

### 6.9 Ekran WZ-09: Odbiory

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-09 |
| **Tytuł** | Definicja odbiorników |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-08 |
| **Warunki wstępne** | Szyny zdefiniowane |

#### 6.9.1 Tabela edycyjna odbiorników

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ ODBIORNIKI                                                                              │
├────────────┬──────────┬───────────┬────────────┬───────────┬───────────┬────────────────┤
│ Nazwa      │ Szyna    │ Model     │ P [MW]     │ Q [Mvar]  │ cos φ     │ Opis           │
├────────────┼──────────┼───────────┼────────────┼───────────┼───────────┼────────────────┤
│ [OD-STA-01]│ [SZ-STA]▼│ [PQ     ]▼│ [2.5      ]│ [1.2     ]│ 0.90      │ [Hala produkcji]│
│ [OD-STB-01]│ [SZ-STB]▼│ [PQ     ]▼│ [1.8      ]│ [0.9     ]│ 0.89      │ [Biurowiec     ]│
│ [OD-SIL-01]│ [SZ-STA]▼│ [SILNIK ]▼│ [0.5      ]│ [0.3     ]│ 0.86      │ [Silnik wentyl.]│
├────────────┴──────────┴───────────┴────────────┴───────────┴───────────┴────────────────┤
│ [+ Dodaj odbiornik] [Model obciążenia...]                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.9.2 Pola dla odbiornika

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| name | Nazwa | string | - | 1-100 znaków | OD-{SZYNA}-{NR} | Wymagane, unikalne |
| bus | Szyna przyłączenia | ref:Bus | - | Lista szyn | - | Wymagane |
| load_model | Model obciążenia | enum | - | PQ / ZIP / SILNIK | PQ | Wymagane |
| active_power | Moc czynna P | float | MW | 0 - 1000 | 1.0 | Wymagane, ≥ 0 |
| reactive_power | Moc bierna Q | float | Mvar | -1000 - 1000 | 0.5 | Wymagane |
| power_factor | Współczynnik mocy | float | - | 0.5 - 1.0 | - | Obliczony automatycznie |
| description | Opis | string | - | 0-255 znaków | "" | Opcjonalne |

#### 6.9.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| + Dodaj odbiornik | Dodaje nowy odbiornik | - |
| Model obciążenia... | Otwiera modal modelu obciążenia | Odbiornik wybrany |
| ◀ Wstecz | Powrót do WZ-08 | - |
| Dalej ▶ | Przejdź do WZ-10 | Wszystkie odbiorniki mają P ≥ 0 |

#### 6.9.4 Wpływ na model

- Tworzy obiekty Load
- Definiuje pobór mocy w sieci

---

### 6.10 Ekran WZ-10: Walidacja Sieci

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-10 |
| **Tytuł** | Walidacja modelu sieci |
| **Tryb** | MODEL_EDIT |
| **Wyzwalacz** | Przejście z WZ-09 |
| **Warunki wstępne** | Model sieci zdefiniowany |

#### 6.10.1 Widok walidacji

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WALIDACJA MODELU SIECI                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ╔═══════════════════════════════════════════════════════════════════════╗  │
│ ║ PODSUMOWANIE WALIDACJI                                                 ║  │
│ ╠═══════════════════════════════════════════════════════════════════════╣  │
│ ║                                                                        ║  │
│ ║   Błędy krytyczne:    0  ✓                                            ║  │
│ ║   Ostrzeżenia:        2  ⚠                                            ║  │
│ ║   Informacje:         3  ℹ                                            ║  │
│ ║                                                                        ║  │
│ ║   Status:  ✓ SIEĆ GOTOWA DO OBLICZEŃ                                  ║  │
│ ║                                                                        ║  │
│ ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ SZCZEGÓŁY WALIDACJI                                                         │
├──────────┬──────────┬────────────────┬──────────────────────────────────────┤
│ KOD      │ POZIOM   │ ELEMENT        │ OPIS                                 │
├──────────┼──────────┼────────────────┼──────────────────────────────────────┤
│ W-TRF-002│Ostrzeżenie│ TR-GPZ-01     │ Przekładnia (7.33) poza typowym      │
│          │          │                │ zakresem (1.0-5.0)                   │
├──────────┼──────────┼────────────────┼──────────────────────────────────────┤
│ W-LOD-001│Ostrzeżenie│ OD-STA-01     │ Niski współczynnik mocy (cos φ=0.78) │
├──────────┼──────────┼────────────────┼──────────────────────────────────────┤
│ I-TOP-001│ Info     │ Model sieci    │ Sieć zawiera 4 szyny, 3 linie,       │
│          │          │                │ 2 transformatory, 1 źródło           │
├──────────┴──────────┴────────────────┴──────────────────────────────────────┤
│ [Waliduj ponownie] [Eksportuj raport...]                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.10.2 Kategorie walidacji

| Kategoria | Kod | Opis |
|-----------|-----|------|
| Topologia | TOP | Spójność sieci, izolowane elementy |
| Parametry | PAR | Kompletność i zakresy parametrów |
| Transformatory | TRF | Przekładnie, grupy połączeń |
| Linie | LIN | Impedancje, długości |
| Źródła | SRC | Obecność źródła, parametry zwarciowe |
| Odbiorniki | LOD | Moce, współczynniki mocy |
| Aparatura | SWT | Pozycje, parametry znamionowe |

#### 6.10.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| Waliduj ponownie | Uruchamia NetworkValidator | - |
| Eksportuj raport... | Eksportuje raport walidacji do PDF | - |
| ◀ Wstecz | Powrót do WZ-09 | - |
| Dalej ▶ | Przejdź do WZ-11 | Brak błędów krytycznych |
| Zakończ | Kończy kreator, zapisuje model | Brak błędów krytycznych |

#### 6.10.4 Reguła blokady

**JEŚLI** liczba błędów krytycznych > 0:
- Przycisk [Dalej ▶] = NIEAKTYWNY
- Przycisk [Zakończ] = NIEAKTYWNY
- Wyświetl komunikat: "Usuń błędy krytyczne przed kontynuacją"

---

### 6.11 Ekran WZ-11: Tworzenie Przypadku Obliczeniowego

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-11 |
| **Tytuł** | Tworzenie przypadku obliczeniowego |
| **Tryb** | CASE_CONFIG |
| **Wyzwalacz** | Przejście z WZ-10 |
| **Warunki wstępne** | Model sieci zwalidowany |

#### 6.11.1 Wybór typu przypadku

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TWORZENIE PRZYPADKU OBLICZENIOWEGO                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Wybierz typ analizy:                                                       │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                                 │  │                                 │  │
│  │         ⚡                       │  │         🔄                       │  │
│  │                                 │  │                                 │  │
│  │  ANALIZA ZWARCIOWA             │  │  ROZPŁYW MOCY                   │  │
│  │  (ShortCircuitCase)             │  │  (PowerFlowCase)                │  │
│  │                                 │  │                                 │  │
│  │  Obliczenia prądów zwarciowych │  │  Obliczenia stanu ustalonego    │  │
│  │  zgodnie z IEC 60909            │  │  Newton-Raphson                 │  │
│  │                                 │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  [●] Analiza zwarciowa (ShortCircuitCase)                                  │
│  [ ] Rozpływ mocy (PowerFlowCase)                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Nazwa przypadku: [SC-001: Zwarcie 3f na szynie SN GPZ                    ] │
│ Opis:            [Analiza zwarcia trójfazowego na szynie 15 kV           ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.11.2 Pola formularza

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| case_type | Typ przypadku | enum | - | ShortCircuitCase / PowerFlowCase | ShortCircuitCase | Wymagane |
| case_name | Nazwa przypadku | string | - | 1-255 znaków | SC-001 / PF-001 | Wymagane, unikalne |
| case_description | Opis | string | - | 0-1000 znaków | "" | Opcjonalne |

#### 6.11.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| ◀ Wstecz | Powrót do WZ-10 | - |
| Dalej ▶ | Przejdź do WZ-12 | Nazwa przypadku niepusta |

#### 6.11.4 Wpływ na model

- Tworzy nowy obiekt Case (ShortCircuitCase lub PowerFlowCase)
- Ustawia przypadek jako aktywny

---

### 6.12 Ekran WZ-12: Parametryzacja Przypadku

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-12 |
| **Tytuł** | Parametry przypadku obliczeniowego |
| **Tryb** | CASE_CONFIG |
| **Wyzwalacz** | Przejście z WZ-11 |
| **Warunki wstępne** | Przypadek utworzony |

#### 6.12.1 Parametry ShortCircuitCase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARAMETRY ANALIZY ZWARCIOWEJ                                                │
│ Przypadek: SC-001                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ▼ Lokalizacja zwarcia                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Szyna zwarcia:        [SZ-GPZ-SN                              ] ▼  │  │
│   │                                                                     │  │
│   │ Typ zwarcia:          [Trójfazowe symetryczne (3f)            ] ▼  │  │
│   │                                                                     │  │
│   │ Rezystancja łuku Rf:  [0.0                          ] Ω           │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ▼ Metoda obliczeniowa                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Standard:             [IEC 60909                              ] ▼  │  │
│   │                                                                     │  │
│   │ Metoda:               [Metoda B (dokładna)                    ] ▼  │  │
│   │                                                                     │  │
│   │ Współczynnik c_max:   [1.10                         ]              │  │
│   │ Współczynnik c_min:   [1.00                         ]              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ▼ Parametry termiczne                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Czas trwania zwarcia tk: [1.0                       ] s           │  │
│   │                                                                     │  │
│   │ Współczynnik m (DC):     [0.0                       ]              │  │
│   │ Współczynnik n (AC):     [1.0                       ]              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ▼ Wkład silników                                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Uwzględnij silniki:   [✓] Tak                                      │  │
│   │                                                                     │  │
│   │ Metoda:               [Zgodnie z IEC 60909                    ] ▼  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.12.2 Pola dla ShortCircuitCase

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| fault_location | Szyna zwarcia | ref:Bus | - | Lista szyn | - | Wymagane |
| fault_type | Typ zwarcia | enum | - | 3PH / 2PH / 1PH / 2PH_GND | 3PH | Wymagane |
| fault_resistance | Rezystancja łuku | float | Ω | 0 - 100 | 0 | ≥ 0 |
| standard | Standard | enum | - | IEC_60909 | IEC_60909 | Wymagane |
| method | Metoda | enum | - | METHOD_B / METHOD_C | METHOD_B | Wymagane |
| c_max | Współczynnik c_max | float | - | 1.0 - 1.2 | 1.10 | Wymagane |
| c_min | Współczynnik c_min | float | - | 0.9 - 1.1 | 1.00 | Wymagane |
| fault_duration | Czas trwania zwarcia | float | s | 0.1 - 5.0 | 1.0 | Wymagane |
| include_motors | Uwzględnij silniki | boolean | - | - | true | - |

#### 6.12.3 Parametry PowerFlowCase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARAMETRY ROZPŁYWU MOCY                                                     │
│ Przypadek: PF-001                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ▼ Metoda obliczeniowa                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Algorytm:             [Newton-Raphson                         ] ▼  │  │
│   │                                                                     │  │
│   │ Maks. liczba iteracji:[100                          ]              │  │
│   │                                                                     │  │
│   │ Tolerancja mocy:      [1e-6                         ] MW           │  │
│   │                                                                     │  │
│   │ Tolerancja napięcia:  [1e-6                         ] p.u.         │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ▼ Opcje obliczeń                                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ [✓] Uwzględnij straty w transformatorach                           │  │
│   │ [✓] Uwzględnij straty w liniach                                    │  │
│   │ [✓] Automatyczna regulacja zaczepów OLTC                           │  │
│   │ [ ] Ograniczenie mocy biernej generatorów                          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ ▼ Warunki początkowe                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ Napięcie startowe:    [1.0                          ] p.u.         │  │
│   │ Kąt startowy:         [0.0                          ] °            │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.12.4 Pola dla PowerFlowCase

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| algorithm | Algorytm | enum | - | NEWTON_RAPHSON / GAUSS_SEIDEL | NEWTON_RAPHSON | Wymagane |
| max_iterations | Maks. iteracji | int | - | 10 - 1000 | 100 | Wymagane |
| power_tolerance | Tolerancja mocy | float | MW | 1e-10 - 1e-3 | 1e-6 | Wymagane |
| voltage_tolerance | Tolerancja napięcia | float | p.u. | 1e-10 - 1e-3 | 1e-6 | Wymagane |
| include_transformer_losses | Straty w transformatorach | boolean | - | - | true | - |
| include_line_losses | Straty w liniach | boolean | - | - | true | - |
| auto_tap_control | Automatyczne zaczepy | boolean | - | - | true | - |
| initial_voltage | Napięcie startowe | float | p.u. | 0.8 - 1.2 | 1.0 | Wymagane |

#### 6.12.5 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| ◀ Wstecz | Powrót do WZ-11 | - |
| Dalej ▶ | Przejdź do WZ-13 | Wszystkie parametry zdefiniowane |
| Zapisz parametry | Zapisuje bez przejścia | - |

#### 6.12.6 Wpływ na model

- Aktualizuje parametry obiektu Case
- Przygotowuje przypadek do obliczeń

---

### 6.13 Ekran WZ-13: Obliczenia

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-13 |
| **Tytuł** | Wykonywanie obliczeń |
| **Tryb** | CASE_CONFIG |
| **Wyzwalacz** | Przejście z WZ-12 |
| **Warunki wstępne** | Przypadek sparametryzowany |

#### 6.13.1 Widok obliczeń

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WYKONYWANIE OBLICZEŃ                                                        │
│ Przypadek: SC-001 (ShortCircuitCase)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ╔═══════════════════════════════════════════════════════════════════════╗  │
│ ║ KONTROLA PRZEDOBLICZENIOWA                                             ║  │
│ ╠═══════════════════════════════════════════════════════════════════════╣  │
│ ║                                                                        ║  │
│ ║   [✓] Model sieci spójny                                              ║  │
│ ║   [✓] Wszystkie parametry zdefiniowane                                ║  │
│ ║   [✓] Źródło zasilania dostępne                                       ║  │
│ ║   [✓] Przypadek sparametryzowany                                      ║  │
│ ║                                                                        ║  │
│ ║   Status: GOTOWY DO OBLICZEŃ                                          ║  │
│ ║                                                                        ║  │
│ ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│                        ┌─────────────────────────┐                          │
│                        │                         │                          │
│                        │       [OBLICZ]          │                          │
│                        │                         │                          │
│                        └─────────────────────────┘                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ KONSOLA OBLICZEŃ                                                            │
│ ────────────────────────────────────────────────────────────────────────── │
│ Oczekiwanie na uruchomienie...                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
┌─────────────────────────────────────────────────────────────┐
│ Network Wizard                                    [X]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 3 of 10: Buses                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  [Property Grid / Form Content]                     │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────┐  ┌────────┐           ┌────────┐  ┌────────┐   │
│  │  Back  │  │  Next  │           │   OK   │  │ Cancel │   │
│  └────────┘  └────────┘           └────────┘  └────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WYKONYWANIE OBLICZEŃ                                                        │
│ Przypadek: SC-001 (ShortCircuitCase)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ╔═══════════════════════════════════════════════════════════════════════╗  │
│ ║ POSTĘP OBLICZEŃ                                                        ║  │
│ ╠═══════════════════════════════════════════════════════════════════════╣  │
│ ║                                                                        ║  │
│ ║   [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 65%              ║  │
│ ║                                                                        ║  │
│ ║   Etap: Obliczanie prądów zwarciowych...                              ║  │
│ ║   Czas: 0.23s                                                         ║  │
│ ║                                                                        ║  │
│ ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│                        ┌─────────────────────────┐                          │
│                        │                         │                          │
│                        │       [PRZERWIJ]        │                          │
│                        │                         │                          │
│                        └─────────────────────────┘                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ KONSOLA OBLICZEŃ                                                            │
│ ────────────────────────────────────────────────────────────────────────── │
│ [14:30:01] Inicjalizacja solvera: IEC60909ShortCircuitSolver               │
│ [14:30:01] Walidacja modelu sieci...                                        │
│ [14:30:01]   ✓ Topologia spójna                                            │
│ [14:30:01]   ✓ Wszystkie parametry zdefiniowane                            │
│ [14:30:02] Budowanie macierzy admitancyjnej...                              │
│ [14:30:02] Obliczanie prądów zwarciowych...                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.13.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| OBLICZ | Uruchamia solver | Kontrola przedobliczeniowa OK |
| PRZERWIJ | Przerywa obliczenia | Obliczenia w toku |
| ◀ Wstecz | Powrót do WZ-12 | Obliczenia zakończone lub nie rozpoczęte |
| Dalej ▶ | Przejdź do WZ-14 | Obliczenia zakończone sukcesem |

#### 6.13.4 Obsługa błędów

| Typ błędu | Komunikat | Akcja |
|-----------|-----------|-------|
| Brak zbieżności | Solver nie osiągnął zbieżności po {N} iteracjach | Wyświetl szczegóły, zaproponuj zmianę parametrów |
| Singularna macierz | Macierz admitancyjna singularna (sieć niespójna?) | Uruchom ponowną walidację topologii |
| Przekroczony czas | Obliczenia przekroczyły maksymalny czas | Zaproponuj uproszczenie modelu lub zwiększenie czasu |

#### 6.13.5 Wpływ na model

- Tworzy obiekt Result (ShortCircuitResult lub PowerFlowResult)
- Przypisuje wynik do przypadku
- Oznacza przypadek jako COMPUTED

---

### 6.14 Ekran WZ-14: Analiza Wyników

| Atrybut | Wartość |
|---------|---------|
| **Identyfikator** | WZ-14 |
| **Tytuł** | Analiza wyników |
| **Tryb** | RESULT_VIEW |
| **Wyzwalacz** | Przejście z WZ-13 |
| **Warunki wstępne** | Obliczenia zakończone sukcesem |

#### 6.14.1 Widok wyników zwarciowych

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WYNIKI ANALIZY ZWARCIOWEJ                                                   │
│ Przypadek: SC-001 | Wynik: SC-001-R-2024-01-15-14:30                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ▼ Podsumowanie                                                              │
│ ╔═══════════════════════════════════════════════════════════════════════╗  │
│ ║ Lokalizacja zwarcia:  SZ-GPZ-SN (15 kV)                               ║  │
│ ║ Typ zwarcia:          Trójfazowe symetryczne                          ║  │
│ ║ Standard:             IEC 60909, Metoda B                             ║  │
│ ╠═══════════════════════════════════════════════════════════════════════╣  │
│ ║                                                                        ║  │
│ ║   Ik" (początkowy prąd zwarciowy):     12.45 kA                       ║  │
│ ║   ip  (prąd udarowy):                  31.67 kA                       ║  │
│ ║   Ib  (prąd wyłączeniowy):             12.45 kA                       ║  │
│ ║   Ith (prąd cieplny, tk=1.0s):         12.89 kA                       ║  │
│ ║                                                                        ║  │
│ ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│ ▼ Wkłady do prądu zwarciowego                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ŹRÓDŁO           │ Ik" [kA]  │ ip [kA]   │ Udział [%]  │ Stan              │
├───────────────────┼───────────┼───────────┼─────────────┼───────────────────┤
│ ZR-GPZ (sieć)    │ 11.23     │ 28.54     │ 90.2%       │ ✓                 │
│ GEN-01 (generator)│ 1.22      │ 3.13      │ 9.8%        │ ✓                 │
├───────────────────┴───────────┴───────────┴─────────────┴───────────────────┤
│ SUMA             │ 12.45     │ 31.67     │ 100.0%      │                   │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│ ▼ Weryfikacja aparatury łączeniowej                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ WYŁĄCZNIK        │ Ik" [kA]  │ Ik_zn[kA] │ Margines    │ Status            │
├───────────────────┼───────────┼───────────┼─────────────┼───────────────────┤
│ WŁ-GPZ-SN-01     │ 12.45     │ 25.0      │ +50.2%      │ ✓ OK              │
│ WŁ-GPZ-SN-02     │ 12.45     │ 25.0      │ +50.2%      │ ✓ OK              │
│ WŁ-STA-01        │ 8.32      │ 16.0      │ +48.0%      │ ✓ OK              │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│ [Eksportuj do PDF...] [Eksportuj do CSV...] [Pokaż na schemacie]           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.14.2 Widok wyników rozpływu mocy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WYNIKI ROZPŁYWU MOCY                                                        │
│ Przypadek: PF-001 | Wynik: PF-001-R-2024-01-15-14:35                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ▼ Podsumowanie                                                              │
│ ╔═══════════════════════════════════════════════════════════════════════╗  │
│ ║ Algorytm:             Newton-Raphson                                  ║  │
│ ║ Iteracje:             4                                               ║  │
│ ║ Zbieżność:            1.2e-8 MW                                       ║  │
│ ║ Czas obliczeń:        0.12s                                           ║  │
│ ╠═══════════════════════════════════════════════════════════════════════╣  │
│ ║                                                                        ║  │
│ ║   Moc z sieci:            P = 4.52 MW,  Q = 2.34 Mvar                 ║  │
│ ║   Moc odbiorników:        P = 4.30 MW,  Q = 2.10 Mvar                 ║  │
│ ║   Straty w sieci:         P = 0.22 MW,  Q = 0.24 Mvar                 ║  │
│ ║                                                                        ║  │
│ ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│ ▼ Napięcia na szynach                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ SZYNA            │ Un [kV]   │ U [kV]    │ U [p.u.]  │ δ [°]    │ Status   │
├───────────────────┼───────────┼───────────┼───────────┼──────────┼──────────┤
│ SZ-GPZ-WN        │ 110.0     │ 110.0     │ 1.000     │ 0.0      │ SLACK    │
│ SZ-GPZ-SN        │ 15.0      │ 14.92     │ 0.995     │ -1.2     │ ✓        │
│ SZ-STA-01        │ 15.0      │ 14.78     │ 0.985     │ -2.5     │ ✓        │
│ SZ-STB-01        │ 15.0      │ 14.65     │ 0.977     │ -3.1     │ ⚠ <0.98  │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│ ▼ Obciążenie gałęzi                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ GAŁĄŹ            │ I [A]     │ Idop [A]  │ Obciążenie│ P_strat  │ Status   │
├───────────────────┼───────────┼───────────┼───────────┼──────────┼──────────┤
│ LN-GPZ-STA       │ 125.3     │ 380       │ 33.0%     │ 4.9 kW   │ ✓        │
│ LN-GPZ-STB       │ 98.2      │ 280       │ 35.1%     │ 6.8 kW   │ ✓        │
│ TR-GPZ-01        │ 174.2     │ 962       │ 18.1%     │ 3.8 kW   │ ✓        │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│ [Eksportuj do PDF...] [Eksportuj do CSV...] [Pokaż na schemacie]           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.14.3 Akcje

| Przycisk | Akcja | Warunek |
|----------|-------|---------|
| Eksportuj do PDF... | Generuje raport PDF | - |
| Eksportuj do CSV... | Eksportuje dane do CSV | - |
| Pokaż na schemacie | Przełącza do SLD z nakładkami wyników | - |
| Porównaj z... | Otwiera porównanie z innym wynikiem | - |
| ◀ Wstecz | Powrót do WZ-13 | - |
| Zakończ | Kończy kreator | - |
| Nowy przypadek | Tworzy nowy przypadek (→ WZ-11) | - |

#### 6.14.4 Wpływ na model

- Brak (tryb tylko do odczytu)
- Wynik zapisany w strukturze projektu

---

## 7. Modale Zaawansowane

### 7.1 Modal: Szczegółowy Model Transformatora (MOD-TRF-01)

**Wyzwalacz:** Menu kontekstowe transformatora > "Szczegółowy model transformatora..."

#### 7.1.1 Zakładka: Schemat zastępczy

| Pole | Etykieta (PL) | Typ | Jednostka | Źródło | Edytowalne |
|------|---------------|-----|-----------|--------|------------|
| Zk | Impedancja zwarcia | float | Ω | Obliczone z uk%, Sn, Un | NIE |
| Rk | Rezystancja zwarcia | float | Ω | Obliczone z Pk, Sn, Un | NIE |
| Xk | Reaktancja zwarcia | float | Ω | √(Zk² - Rk²) | NIE |
| Gm | Konduktancja magnetyzująca | float | S | P0 / Un² | NIE |
| Bm | Susceptancja magnetyzująca | float | S | i0% × Sn / Un² | NIE |
| uk% | Napięcie zwarcia | float | % | Dane wejściowe | TAK |
| ur% | Składowa czynna uk | float | % | Obliczone z Pk | NIE |
| ux% | Składowa bierna uk | float | % | √(uk%² - ur%²) | NIE |

#### 7.1.2 Zakładka: OLTC

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|------|---------------|-----|-----------|--------|----------|
| oltc_installed | OLTC zainstalowany | boolean | - | - | false |
| oltc_side | Strona przełącznika | enum | - | GN / DN | GN |
| tap_high | Liczba zaczepów (góra) | int | - | 0 - 20 | 8 |
| tap_low | Liczba zaczepów (dół) | int | - | 0 - 20 | 8 |
| tap_step | Krok napięcia | float | % | 0.5 - 5 | 1.25 |
| tap_position | Aktualny zaczep | int | - | -tap_low ... +tap_high | 0 |

#### 7.1.3 Zakładka: Dane katalogowe

| Pole | Etykieta (PL) | Typ | Jednostka |
|------|---------------|-----|-----------|
| manufacturer | Producent | string | - |
| type_designation | Oznaczenie typu | string | - |
| serial_number | Numer seryjny | string | - |
| year_of_manufacture | Rok produkcji | int | - |
| cooling_class | Klasa chłodzenia | enum | ONAN/ONAF/OFAF/ODAF |
| oil_mass | Masa oleju | float | kg |
| total_mass | Masa całkowita | float | kg |

---

### 7.2 Modal: Edytor Impedancji Linii/Kabla (MOD-LIN-01)

**Wyzwalacz:** Menu kontekstowe linii > "Edytor impedancji..."

#### 7.2.1 Parametry jednostkowe (składowa zgodna)

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|------|---------------|-----|-----------|--------|----------|
| r_per_km | Rezystancja R' | float | Ω/km | 0.001 - 10 | 0.125 |
| x_per_km | Reaktancja X' | float | Ω/km | 0.001 - 10 | 0.08 |
| b_per_km | Susceptancja B' | float | µS/km | 0 - 1000 | 0 |
| g_per_km | Konduktancja G' | float | µS/km | 0 - 100 | 0 |

#### 7.2.2 Parametry składowej zerowej

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|------|---------------|-----|-----------|--------|----------|
| r0_per_km | Rezystancja R0' | float | Ω/km | 0.001 - 50 | 3 × R' |
| x0_per_km | Reaktancja X0' | float | Ω/km | 0.001 - 50 | 3 × X' |
| r0_r1_ratio | Stosunek R0/R1 | float | - | 0.5 - 10 | 3.0 |
| x0_x1_ratio | Stosunek X0/X1 | float | - | 0.5 - 10 | 3.0 |

---

### 7.3 Modal: Model Zwarciowy Źródła (MOD-SRC-01)

**Wyzwalacz:** Menu kontekstowe źródła > "Model zwarciowy źródła..."

#### 7.3.1 Metody wprowadzania

| Metoda | Wymagane pola | Obliczane pola |
|--------|---------------|----------------|
| SK_IK | Sk", R/X | Rk, Xk, Zk |
| SK_XR | Sk", R/X | Rk, Xk z Sk" |
| RX_BEZPOŚREDNIO | R, X | Zk, Sk" |

#### 7.3.2 Pola formularza

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|------|---------------|-----|-----------|--------|----------|
| input_method | Metoda wprowadzania | enum | - | SK_IK / SK_XR / RX | SK_IK |
| sk_3ph | Moc zwarciowa Sk" | float | MVA | 100 - 100000 | 5000 |
| rx_ratio | Stosunek R/X | float | - | 0.05 - 0.5 | 0.1 |
| r_ohm | Rezystancja R | float | Ω | 0.001 - 100 | - |
| x_ohm | Reaktancja X | float | Ω | 0.01 - 100 | - |
| r0_r1_ratio | Stosunek R0/R1 | float | - | 0.5 - 5.0 | 1.0 |
| x0_x1_ratio | Stosunek X0/X1 | float | - | 0.5 - 5.0 | 1.0 |

---

### 7.4 Modal: Model Obciążenia (MOD-LOD-01)

**Wyzwalacz:** Menu kontekstowe odbiornika > "Model obciążenia..."

#### 7.4.1 Zakładka: Model ZIP

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna | Walidacja |
|------|---------------|-----|-----------|--------|----------|-----------|
| p0 | Moc bazowa P0 | float | MW | 0 - 1000 | 1.0 | Wymagane |
| q0 | Moc bazowa Q0 | float | Mvar | -1000 - 1000 | 0.5 | Wymagane |
| ap | Wsp. impedancji (P) | float | - | 0 - 1 | 0.4 | ap+bp+cp=1 |
| bp | Wsp. prądu (P) | float | - | 0 - 1 | 0.4 | ap+bp+cp=1 |
| cp | Wsp. mocy (P) | float | - | 0 - 1 | 0.2 | ap+bp+cp=1 |
| aq | Wsp. impedancji (Q) | float | - | 0 - 1 | 0.4 | aq+bq+cq=1 |
| bq | Wsp. prądu (Q) | float | - | 0 - 1 | 0.4 | aq+bq+cq=1 |
| cq | Wsp. mocy (Q) | float | - | 0 - 1 | 0.2 | aq+bq+cq=1 |

#### 7.4.2 Zakładka: Model silnikowy

| Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|------|---------------|-----|-----------|--------|----------|
| motor_pn | Moc znamionowa | float | kW | 0.1 - 10000 | 100 |
| motor_un | Napięcie znamionowe | float | kV | 0.4 - 36 | 6.0 |
| motor_eta | Sprawność | float | % | 70 - 98 | 95 |
| motor_cos_phi | Współczynnik mocy | float | - | 0.7 - 0.95 | 0.85 |
| motor_ir_in | Prąd rozruchowy | float | - | 4 - 8 | 6 |
| motor_cos_phi_start | Cos φ rozruchowy | float | - | 0.1 - 0.4 | 0.2 |
| motor_ik_in | Stosunek Ik"/In | float | - | 4 - 10 | 6.5 |
| include_in_sc | Uwzględnij w zwarciu | boolean | - | - | true |

---

### 7.5 Modal: Raport Walidacji (MOD-VAL-01)

**Wyzwalacz:** Krok WZ-10 / Menu: Model > Walidacja

#### 7.5.1 Struktura raportu

| Sekcja | Zawartość |
|--------|-----------|
| Podsumowanie | Liczba błędów, ostrzeżeń, informacji; status gotowości |
| Lista komunikatów | Tabela z KOD, POZIOM, ELEMENT, OPIS |
| Statystyki modelu | Liczba elementów każdego typu |
| Czas walidacji | Znacznik czasu i czas trwania |

#### 7.5.2 Akcje

| Przycisk | Akcja |
|----------|-------|
| Waliduj ponownie | Uruchamia NetworkValidator |
| Eksportuj do PDF... | Generuje raport PDF |
| Eksportuj do CSV... | Eksportuje komunikaty do CSV |
| Przejdź do elementu | Zaznacza element w drzewie i SLD |

---

### 7.6 Modal: Klonowanie Przypadku (MOD-CAS-01)

**Wyzwalacz:** Menu kontekstowe przypadku > "Klonuj przypadek..."

#### 7.6.1 Pola formularza

| Pole | Etykieta (PL) | Typ | Domyślna |
|------|---------------|-----|----------|
| new_name | Nazwa nowego przypadku | string | {STARY}-kopia |
| new_description | Opis | string | "" |
| copy_solver_params | Kopiuj parametry solvera | boolean | true |
| copy_fault_location | Kopiuj lokalizację zwarcia | boolean | false |
| copy_fault_type | Kopiuj typ zwarcia | boolean | false |
| copy_thermal_params | Kopiuj parametry termiczne | boolean | true |
| copy_motor_settings | Kopiuj ustawienia silników | boolean | true |

---

### 7.7 Modal: Porównanie Wyników (MOD-RES-01)

**Wyzwalacz:** Menu kontekstowe wyniku > "Porównaj z innym wynikiem..."

#### 7.7.1 Struktura porównania

| Sekcja | Zawartość |
|--------|-----------|
| Parametry przypadków | Tabela różnic w parametrach |
| Wyniki liczbowe | Tabela wartości z kolumnami A, B, Δ, Δ% |
| Wykres porównawczy | Wizualizacja różnic |

---

### 7.8 Modal: Opcje Obliczeń (MOD-OPT-01)

**Wyzwalacz:** Menu: Obliczenia > Opcje...

#### 7.8.1 Pola konfiguracyjne

| Grupa | Pole | Etykieta (PL) | Typ | Domyślna |
|-------|------|---------------|-----|----------|
| Walidacja | validate_before_calc | Waliduj przed obliczeniem | boolean | true |
| Walidacja | block_on_errors | Blokuj przy błędach | boolean | true |
| Walidacja | block_on_warnings | Blokuj przy ostrzeżeniach | boolean | false |
| Wydajność | max_calc_time | Maks. czas obliczeń | int (s) | 300 |
| Wydajność | log_level | Poziom logów | enum | NORMAL |
| Automatyzacja | auto_open_results | Otwórz wyniki automatycznie | boolean | false |
| Automatyzacja | auto_save_project | Zapisz projekt automatycznie | boolean | true |
| Automatyzacja | auto_export_pdf | Eksportuj PDF automatycznie | boolean | false |

---

## 8. Ekrany Przypadków Obliczeniowych

### 8.1 Menedżer Przypadków

#### 8.1.1 Struktura listy przypadków

| Kolumna | Opis |
|---------|------|
| ID | Unikalny identyfikator przypadku |
| Nazwa | Nazwa opisowa |
| Typ | ShortCircuitCase / PowerFlowCase |
| Stan | OBLICZONY / GOTOWY / NIEAKTUALNY / BŁĄD |
| Wynik główny | Ik" (zwarcie) / Zbieżność (rozpływ) |
| Data obliczenia | Znacznik czasu ostatniego obliczenia |

#### 8.1.2 Stany przypadków

| Stan | Symbol | Opis | Kolor |
|------|--------|------|-------|
| OBLICZONY | ● | Wyniki dostępne | Zielony |
| GOTOWY | ○ | Gotowy do obliczeń | Niebieski |
| NIEAKTUALNY | ◐ | Model zmieniony | Żółty |
| BŁĄD | ✗ | Ostatnie obliczenie błędne | Czerwony |

### 8.2 Reguła Blokady Obliczeń

**WYMÓG:** Przycisk [Oblicz] jest AKTYWNY tylko gdy:
1. Przypadek jest wybrany jako aktywny
2. Walidacja modelu wykonana
3. Brak błędów krytycznych w walidacji
4. Wszystkie parametry przypadku zdefiniowane

### 8.3 Parametry ShortCircuitCase

| Grupa | Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|-------|------|---------------|-----|-----------|--------|----------|
| Lokalizacja | fault_location | Szyna zwarcia | ref:Bus | - | - | Wymagane |
| Lokalizacja | fault_type | Typ zwarcia | enum | - | 3PH/2PH/1PH/2PH_GND | 3PH |
| Lokalizacja | fault_resistance | Rezystancja łuku | float | Ω | 0-100 | 0 |
| Metoda | standard | Standard | enum | - | IEC_60909 | IEC_60909 |
| Metoda | method | Metoda | enum | - | METHOD_B/METHOD_C | METHOD_B |
| Metoda | c_max | Współczynnik c_max | float | - | 1.0-1.2 | 1.10 |
| Metoda | c_min | Współczynnik c_min | float | - | 0.9-1.1 | 1.00 |
| Termiczne | fault_duration | Czas trwania tk | float | s | 0.1-5.0 | 1.0 |
| Silniki | include_motors | Uwzględnij silniki | boolean | - | - | true |

### 8.4 Parametry PowerFlowCase

| Grupa | Pole | Etykieta (PL) | Typ | Jednostka | Zakres | Domyślna |
|-------|------|---------------|-----|-----------|--------|----------|
| Algorytm | algorithm | Algorytm | enum | - | NR/GS | NR |
| Algorytm | max_iterations | Maks. iteracji | int | - | 10-1000 | 100 |
| Zbieżność | power_tolerance | Tolerancja mocy | float | MW | 1e-10-1e-3 | 1e-6 |
| Zbieżność | voltage_tolerance | Tolerancja napięcia | float | p.u. | 1e-10-1e-3 | 1e-6 |
| Opcje | transformer_losses | Straty w TR | boolean | - | - | true |
| Opcje | line_losses | Straty w liniach | boolean | - | - | true |
| Opcje | auto_tap | Automatyczne zaczepy | boolean | - | - | true |
| Start | initial_voltage | Napięcie startowe | float | p.u. | 0.8-1.2 | 1.0 |

---

## 9. Obliczenia i Diagnostyka

### 9.1 Kontrola Przedobliczeniowa

| Kontrola | Opis | Blokuje |
|----------|------|---------|
| Topologia spójna | Sieć nie zawiera izolowanych elementów | TAK |
| Źródło zdefiniowane | Istnieje co najmniej jedno aktywne źródło | TAK |
| Parametry kompletne | Wszystkie wymagane parametry zdefiniowane | TAK |
| Przypadek aktywny | Przypadek obliczeniowy jest wybrany | TAK |
| Model zwalidowany | NetworkValidator bez błędów | TAK |

### 9.2 Format Logów Konsoli

```
[TIMESTAMP] POZIOM | KOMPONENT | KOMUNIKAT

Poziomy: DEBUG, INFO, WARNING, ERROR, SUCCESS
```

### 9.3 Kody Błędów Solvera

| Kod | Opis | Przyczyna | Rozwiązanie |
|-----|------|-----------|-------------|
| E-SLV-001 | Singularna macierz | Sieć niespójna | Sprawdź topologię |
| E-SLV-002 | Brak zbieżności | Złe parametry | Sprawdź dane, zwiększ iteracje |
| E-SLV-003 | Brak źródła | Brak aktywnego źródła | Dodaj źródło |
| E-SLV-004 | Przekroczony czas | Obliczenia zbyt długie | Uprość model |
| E-SLV-005 | Błąd pamięci | Niewystarczająca pamięć | Zamknij inne aplikacje |
| E-SLV-006 | Niespójne napięcia | Różne Un bez TR | Sprawdź napięcia szyn |

---

## 10. Tryb Wyników

### 10.1 Zasady Trybu Wyników

| Zasada | Opis |
|--------|------|
| TYLKO DO ODCZYTU | Żadne modyfikacje nie są dozwolone |
| NAKŁADKI AKTYWNE | Wyniki wyświetlane na SLD |
| SELEKCJA INFORMACYJNA | Kliknięcie pokazuje wyniki, nie edycję |
| EKSPORT DOZWOLONY | Eksport do różnych formatów |

### 10.2 Warstwy Wyników na SLD

| Warstwa | Zawartość | Wizualizacja |
|---------|-----------|--------------|
| Prądy | Wartości prądów w gałęziach | Etykiety [I=xxx A] |
| Napięcia | Wartości napięć na szynach | Etykiety [U=xxx kV] |
| Obciążenie | Stopień obciążenia gałęzi | Kolor: zielony/żółty/czerwony |
| Naruszenia | Szyny z napięciem poza zakresem | Marker czerwony |
| Prądy zwarciowe | Wartości Ik" na szynach | Etykiety [Ik"=xxx kA] |

### 10.3 Formaty Eksportu

| Format | Zawartość | Zastosowanie |
|--------|-----------|--------------|
| PDF | Pełny raport z tabelami | Dokumentacja |
| CSV | Surowe dane tabelaryczne | Import do Excel |
| XLSX | Arkusz z formatowaniem | Raportowanie |
| JSON | Dane strukturalne | Integracja |
| DXF | Schemat SLD | Import do CAD |

---

## 11. Filozofia Komunikatów

### 11.1 Format Komunikatów

```
KOD | POZIOM | ELEMENT | WYJAŚNIENIE

Gdzie:
  KOD        = {KATEGORIA}-{TYP}-{NNN}
  POZIOM     = Błąd | Ostrzeżenie | Info
  ELEMENT    = Nazwa obiektu
  WYJAŚNIENIE = Pełny opis + sugestia rozwiązania
```

### 11.2 Kategorie Komunikatów

| Kategoria | Prefiks | Opis |
|-----------|---------|------|
| TOP | Topologia | Błędy struktury sieci |
| VAL | Walidacja | Błędy walidacji parametrów |
| TRF | Transformator | Błędy transformatorów |
| LIN | Linia | Błędy linii/kabli |
| SRC | Źródło | Błędy źródeł |
| LOD | Odbiornik | Błędy odbiorników |
| CBR | Wyłącznik | Błędy wyłączników |
| DSC | Rozłącznik | Błędy rozłączników |
| BUS | Szyna | Błędy szyn |
| CAS | Przypadek | Błędy przypadków |
| SLV | Solver | Błędy obliczeń |

### 11.3 Poziomy Komunikatów

| Poziom | Ikona | Znaczenie | Wpływ |
|--------|-------|-----------|-------|
| Błąd | ✗ | Problem krytyczny | BLOKUJE |
| Ostrzeżenie | ⚠ | Problem wymagający uwagi | NIE BLOKUJE |
| Info | ℹ | Informacja pomocnicza | NIE BLOKUJE |

### 11.4 Zasada Braku Komunikatów Ogólnych

**ZAKAZANE:**
- "Wystąpił błąd"
- "Operacja nie powiodła się"
- "Nieprawidłowe dane"

**WYMAGANE zawsze:**
- Konkretny kod błędu
- Nazwa elementu
- Pełny opis problemu
- Sugestia rozwiązania

---

## 12. Odniesienia

### 12.1 Dokumenty Wewnętrzne

| Dokument | Ścieżka | Opis |
|----------|---------|------|
| SYSTEM_SPEC.md | /docs/SYSTEM_SPEC.md | Specyfikacja systemu |
| ARCHITECTURE.md | /docs/ARCHITECTURE.md | Architektura aplikacji |
| PLANS.md | /docs/PLANS.md | Plany rozwoju |
| sld_rules.md | /docs/ui/sld_rules.md | Reguły SLD |
| POWERFACTORY_COMPLIANCE.md | /docs/POWERFACTORY_COMPLIANCE.md | Zgodność z PowerFactory |

### 12.2 Standardy Zewnętrzne

| Standard | Opis | Zastosowanie |
|----------|------|--------------|
| IEC 60909 | Obliczanie prądów zwarciowych | ShortCircuitSolver |
| IEC 60076 | Transformatory mocy | Parametry TR |
| IEC 60287 | Obciążalność prądowa kabli | Parametry kabli |
| EN 50160 | Charakterystyki napięcia | Walidacja napięć |

### 12.3 Wzorzec UI

| Oprogramowanie | Producent | Rola |
|----------------|-----------|------|
| DIgSILENT PowerFactory | DIgSILENT GmbH | Wzorzec UI/UX |

---

## Załącznik A: Słownik Terminów UI (PL/EN)

| Polski | Angielski |
|--------|-----------|
| Szyna | Bus |
| Linia | Line |
| Kabel | Cable |
| Transformator | Transformer |
| Wyłącznik | Circuit Breaker |
| Rozłącznik | Disconnector |
| Źródło | Source |
| Sieć zewnętrzna | External Grid |
| Generator | Generator |
| Odbiornik | Load |
| Przypadek obliczeniowy | Calculation Case |
| Analiza zwarciowa | Short Circuit Analysis |
| Rozpływ mocy | Power Flow |
| Wynik | Result |
| Schemat jednokreskowy | Single Line Diagram (SLD) |
| Siatka właściwości | Property Grid |
| Drzewo projektu | Project Tree |
| Kreator | Wizard |
| Walidacja | Validation |
| Napięcie znamionowe | Rated Voltage |
| Prąd znamionowy | Rated Current |
| Moc zwarciowa | Short Circuit Power |
| Prąd zwarciowy początkowy | Initial Short Circuit Current |
| Prąd udarowy | Peak Short Circuit Current |

---

## Załącznik B: Skróty Klawiszowe

| Skrót | Akcja |
|-------|-------|
| Ctrl+N | Nowy projekt |
| Ctrl+O | Otwórz projekt |
| Ctrl+S | Zapisz projekt |
| Ctrl+Z | Cofnij |
| Ctrl+Y | Ponów |
| F5 | Uruchom obliczenia |
| F6 | Waliduj model |
| F7 | Przełącz tryb |
| Delete | Usuń element |
| Escape | Anuluj operację |
| Ctrl+A | Zaznacz wszystko |
| Ctrl+F | Znajdź element |
| Ctrl+P | Drukuj/Eksportuj PDF |

---

**KONIEC DOKUMENTU**

**Wersja:** 2.0
**Status:** KANONICZNY
**Data:** 2024-01-15
**Wzorzec:** DIgSILENT PowerFactory
