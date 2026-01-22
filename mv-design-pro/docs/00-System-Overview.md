# MV-DESIGN-PRO — Przegląd Systemu

## 1. Cel Systemu

MV-DESIGN-PRO to system analizy i projektowania sieci średniego napięcia (SN) dla energetyki, z pełną integracją OZE, metodyką PCC (punkt wspólnego przyłączenia), budową schematów zastępczych i zgodnością z NC RfG oraz polskimi wymaganiami kodeksowymi.•	
MV-DESIGN-PRO przeznaczony do kompleksowej analizy sieci elektroenergetycznych średniego napięcia (SN) w zakresie SN i nn. System realizuje funkcje narzędzia klasy ETAP / DIgSILENT PowerFactory / PLANS, z unikalną przewagą konkurencyjną: pełną transparentnością obliczeń w Trybie Obliczeń Jawnych (White Box).
Każde obliczenie, każde sprawdzenie normowe i każde rozstrzygnięcie decyzyjne musi być przedstawione w czterech krokach:
A	Definicja teoretyczna	Wzór ogólny w LaTeX, opis symboli, wskazanie podstawy (norma/instrukcja operatora/wykład)
B	Ekstrakcja danych	Wylistowanie danych z modelu sieci i bazy typoszeregów, zapis w LaTeX z jednostkami i źródłem (model/baza)
C	Jawne podstawienie	Podstawienie liczb w LaTeX, jawne działania arytmetyczne (bez skrótów)
D	Wynik i interpretacja	Wynik w LaTeX z jednostką, weryfikacja warunku, jednoznaczny wniosek: spełniony/niespełniony
JĘZYK, STYL, ZAKAZY TERMINOLOGICZNE, NOTACJA (BEZWZGLĘDNE)
Język i styl
•	Styl formalny i normowy (instrukcje, wymagania, warunki, weryfikacje)
Notacja matematyczna
Wszystkie zależności, równania, przekształcenia i podstawienia wyłącznie w pełnym LaTeX w trybie blokowym. Zakazuje się zapisu 'pół-matematycznego' w tekście.
Przykład poprawny: $$I_k'' = \frac{c \cdot U_n}{\sqrt{3} \cdot |Z_k|}$$
Przykład niepoprawny: 'Ik=8 kA'
Wymagania formalne dla każdego wywodu
•	Jednostki przy każdej wielkości fizycznej
•	Kontrola wymiaru (co najmniej w punktach krytycznych)
•	Jawne zaokrąglenia i reguła zaokrągleń
TRYB OBLICZEŃ JAWNYCH (WHITE BOX) — FUNDAMENT SYSTEMU
System nie może zwrócić żadnego wyniku końcowego bez wykazania: definicji, danych, podstawienia i rozstrzygnięcia.
Struktura dowodu obliczeniowego (obowiązkowa dla każdej operacji)
Każde obliczenie, przedstawione w czterech krokach:
KROK	NAZWA	ZAWARTOŚĆ
A	Definicja teoretyczna	Wzór ogólny w LaTeX, opis symboli, wskazanie podstawy 
B	Ekstrakcja danych	Wylistowanie danych z modelu sieci i bazy typoszeregów, zapis w LaTeX z jednostkami 
C	Jawne podstawienie	Podstawienie liczb w LaTeX, jawne działania arytmetyczne (bez skrótów)
D	Wynik i interpretacja	Wynik w LaTeX z jednostką,  

Renderowanie równań
•	System musi zawierać mechanizm składu i renderowania równań LaTeX (MathJax)
•	Mechanizm aktualizacji wywodu po każdej zmianie modelu sieci lub danych typoszeregu
•	Eksport wywodów do formatu PDF i DOCX z pełną dokumentacją obliczeń
BAZA DANYCH TYPOSZEREGÓW (OBOWIĄZKOWA, ROZBUDOWYWALNA)
System działa na rozbudowywalnej bazie danych obejmującej pełne typoszeregi. 
 Kable SN — obowiązkowe pola
•	Napięcie znamionowe, konstrukcja żył, materiał żyły (Al/Cu)
•	Przekrój żył fazowych
•	Parametry jednostkowe składowej zgodnej: R', X'
•	Parametry jednostkowe składowej zerowej: R'₀, X'₀
•	Parametry pojemnościowe: C'
•	Obciążalność długotrwała: Iz
•	Ekran/żyła powrotna: przekrój, materiał
•	Sposób uziemienia ekranów: jednostronny / obustronny / przez rezystancję
•	Dopuszczalne temperatury (praca / zwarcie)
•	Współczynnik adiabatyczny k (zależny od materiału i izolacji)
Linie napowietrzne SN — obowiązkowe pola
•	Przewód: materiał, przekrój, konstrukcja (AFL, PAS, AsXSn)
•	Parametry jednostkowe: R', X'
•	Obciążalność długotrwała: Iz
•	Średni promień geometryczny (GMR)
•	Parametry geometryczne i wpływ ziemi (jeżeli modelowane)
Transformatory — obowiązkowe pola
•	Moce znamionowe: Sn [kVA lub MVA]
•	Napięcia znamionowe: Un1/Un2 [kV]
•	Napięcie zwarcia: uk [%]
•	Straty zwarciowe: ΔPk [kW]
•	Straty jałowe: ΔPo [kW]
•	Prąd jałowy: Io [%]
•	Grupa połączeń: Dyn11, Yyn0, Dd0, YNd5 itd.
•	Impedancja w jednostkach względnych i bezwzględnych
•	Model składowych: Z₁, Z₂, Z₀ (z uwzględnieniem grupy połączeń)
Aparatura łączeniowa i przekładniki
•	Wyłączniki: zdolność wyłączania Ik [kA], prąd krótkotrwały Ith [kA], prąd udarowy ip [kA]
•	Przekładniki prądowe: przekładnia, klasa dokładności, obciążenie
•	Przekładniki napięciowe: przekładnia, klasa, obciążenie
Zabezpieczenia
•	Dostępne funkcje (ANSI): 50, 51, 50N, 51N, 67, 67N, 27, 59, 81, 81R, 87T
•	Zakresy nastaw (prądowe, napięciowe, czasowe)
•	Charakterystyki czasowe: zależne (IEC) i niezależne
•	Minimalne czasy, stopnie, zwłoki
•	Wymagane sygnały i blokady (telemechanika)
Źródła OZE (falowniki, magazyny)
•	Producent, model, typ (stringowy / centralny)
•	Moc znamionowa AC: Pn [kW]
•	Prąd znamionowy AC: In [A]
•	Zakres współczynnika mocy: cosφ
•	Sprawność: η [%]
•	Charakterystyka zwarciowa: k·In, czas wsparcia
•	Dla magazynów: pojemność E [kWh], cykle, technologia


ALGORYTM BUDOWANIA SCHEMATU (KREATOR- do wypełnininia przez profesjonlalne i funkcjonalne modale)
KROK 1 — Źródło zasilania (GPZ)
TRYB UPROSZCZONY (domyślny):
•	Podanie parametrów zwarciowych bezpośrednio na szynach SN
•	Sk'' [MVA] + R/X lub Ik'' [kA] + R/X lub Rs, Xs [Ω]
•	Współczynniki c (cmax, cmin wg PN-EN 60909)
•	Automatyczny podgląd impedancji źródła: Zs = Un²/Sk''
TRYB PEŁNY:
•	Modelowanie sieci WN (Un, Sk''(WN), R/X)
•	Transformator WN/SN (wybór z bazy: Sn, uk%, ΔPk, grupa połączeń)
•	Wynikowa moc zwarciowa na SN: Sk''(SN) = Un²/Zc
KROK 2 — Linia SN
LINIA KABLOWA:
•	Wybór z bazy: napięcie, izolacja, materiał (Al/Cu), przekrój
•	Parametry: długość, liczba kabli, sposób ułożenia, temperatura gruntu
•	Obliczone: R, X, Z, Iz (skorygowana)
LINIA NAPOWIETRZNA:
•	Typ konstrukcji (jednotorowa, dwutorowa, izolowana)
•	Wybór przewodu z bazy (AFL, PAS)
•	Układ geometryczny, średnia odległość faz
3. KROK 3 — następny element
3.1 Przedłużenie linii
3.2	Stacja transformatorowa SN/nN
3.3 Złącze kablowe SN (ZKSN)
3.4 Słup rozgałęźny SN
3.5 Punkt przyłączenia OZE (PCC)

KROK 3.2.1 — Stacja transformatorowa
wybór tryb uproszczony czy kreator
TRYB uproszcziny:
•	Stacja z jednym transformatorem
•	Typ: słupowa, wnętrzowa, w budynku
•	Konfiguracja: końcowa, przelotowa, węzłowa
•	Wybór transformatora z bazy
tryb KREATOR STACJI:
•	Krok 1: Dane podstawowe (typ konstrukcji, producent rozdzielnicy)
•	Krok 2: Pola rozdzielnicy SN (liniowe, transformatorowe, pomiarowe, sprzęgła - należy zbudować bazę)
  modal dodania zabezpieczenia do pola SN
  ZABEZPIECZENIA ELEKTROENERGETYCZNE .
katalog funkcji zabezpieczeniowych 
ANSI	    NAZWA	                        OPIS
50/51	    Nadprądowe fazowe	            I>, I>>, I>>> (zależne IEC i niezależne)
50N/51N	  Ziemnozwarciowe	              I0>, I0>>, wattmetryczne, admitancyjne
67/67N	  Kierunkowe                  	Kierunek mocy/prądu (fazowe i ziemnozwarciowe)
27/59	    Napięciowe	                  U<, U> (podnapięciowe, nadnapięciowe)
81/81R	  Częstotliwościowe	            f<, f>, ROCOF (df/dt)
87T	      Różnicowe	Transformatorowe,   liniowe
Model działania zabezpieczeń
Każde zabezpieczenie jest przypisane do elementu sieci (pole sn) i posiada:
•	Nastawy (prądowe, napięciowe, czasowe)
•	Charakterystykę czasową (IEC zależna / niezależna)
•	Warunki blokady (od napięcia, kierunku, stanu wyłącznika


•	Krok 3: Transformatory (wybór z bazy, impedancje)
•	Krok 4: Rozdzielnica nN (szyna, odpływy)
  KROK 5 — Odbiory i źródła na szynie nN
  •	 Obciążenie (P, Q, model: moc stała/impedancja stała/prąd stały/ZIP)
  •	Instalacja PV (wybór falownika z bazy xilość sz)
  •	Magazyn energii BESS (wybór z bazy, tryb: ładowanie/rozładowanie/standby)
  •	Silnik/napęd


## 2. Architektura Warstwowa

System składa się z czterech głównych warstw:

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│  NetworkWizardService, AnalysisRunService, SLD Layout           │
│  Orkiestracja, workflow, CRUD, import/export                    │
├─────────────────────────────────────────────────────────────────┤
│                      ANALYSIS LAYER                             │
│  Power Flow Solver (Newton-Raphson), Interpretacja wyników      │
│  Violations, Limits checking                                    │
├─────────────────────────────────────────────────────────────────┤
│                      SOLVERS LAYER                              │
│  IEC 60909 Short-Circuit (ZAMROŻONY, WZORZEC)                   │
│  Czyste obliczenia fizyczne, deterministyczne                   │
├─────────────────────────────────────────────────────────────────┤
│                      CORE LAYER                                 │
│  NetworkGraph, Node, Branch, Transformer, InverterSource        │
│  Model sieci + fakty fizyczne                                   │
├─────────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                               │
│  Project, Network, OperatingCase, StudyCase, AnalysisRun        │
│  Encje biznesowe, ValidationReport                              │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  Repositories, UnitOfWork, DB, Persistence                      │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Struktura Katalogów

```
mv-design-pro/
├── backend/src/
│   ├── network_model/              # CORE - model sieci elektroenergetycznej
│   │   ├── core/                   # Node, Branch, NetworkGraph, InverterSource, Ybus
│   │   ├── solvers/                # IEC 60909 (short_circuit_iec60909.py) - ZAMROŻONY
│   │   ├── validation/             # Walidacja modelu sieci
│   │   ├── reporting/              # Generowanie raportów PDF/DOCX
│   │   └── whitebox/               # WhiteBoxTracer - ślad obliczeń
│   │
│   ├── analysis/                   # ANALYSIS - solvery z interpretacją
│   │   └── power_flow/             # Power Flow Solver (Newton-Raphson)
│   │       ├── solver.py           # PowerFlowSolver
│   │       ├── types.py            # PowerFlowInput, PQSpec, PVSpec, etc.
│   │       ├── result.py           # PowerFlowResult
│   │       └── _internal.py        # Funkcje wewnętrzne NR
│   │
│   ├── domain/                     # DOMAIN - encje biznesowe
│   │   ├── models.py               # Project, Network, OperatingCase, StudyCase
│   │   ├── validation.py           # ValidationReport, ValidationIssue
│   │   ├── analysis_run.py         # AnalysisRun
│   │   ├── units.py                # UnitSystem, BaseQuantities
│   │   ├── sources.py              # Definicje źródeł
│   │   ├── limits.py               # Limity operacyjne
│   │   └── sld.py                  # SldDiagram, SldNodeSymbol
│   │
│   ├── application/                # APPLICATION - orkiestracja
│   │   ├── network_wizard/         # NetworkWizardService - CRUD, walidacja, import/export
│   │   ├── analysis_run/           # AnalysisRunService - wykonywanie analiz
│   │   └── sld/                    # Layout schematów SLD
│   │
│   ├── api/                        # API - FastAPI endpoints
│   │   ├── main.py                 # Główna aplikacja FastAPI
│   │   └── analysis_runs.py        # Endpointy dla AnalysisRun
│   │
│   ├── infrastructure/             # INFRASTRUCTURE - persystencja
│   │   ├── persistence/            # Repozytoria, UnitOfWork, DB
│   │   └── migrations/             # Migracje bazy danych
│   │
│   ├── solvers/                    # PLACEHOLDER - puste (do uporządkowania)
│   │   ├── power_flow/             # (puste)
│   │   └── short_circuit/          # (puste)
│   │
│   ├── compliance/                 # PLACEHOLDER - zgodność regulacyjna
│   └── whitebox/                   # PLACEHOLDER - whitebox utilities
│
├── docs/
│   ├── adr/                        # Architecture Decision Records
│   └── *.md                        # Dokumentacja systemowa
│
└── frontend/                       # Frontend (poza zakresem tego dokumentu)
```

## 4. Relacje między Warstwami

### 4.1 Przepływ Danych

```
User/API → Application → Domain → Core → Solvers
                ↑           ↑        ↑
                └── Infrastructure ──┘
```

### 4.2 Zasady Zależności

| Warstwa        | Może zależeć od              | NIE może zależeć od       |
|----------------|------------------------------|---------------------------|
| Application    | Domain, Core, Analysis       | Infrastructure (direct)   |
| Analysis       | Core                         | Domain, Application       |
| Solvers (Core) | Core (wewnętrzne)            | Domain, Application, API  |
| Domain         | (brak zależności)            | Core, Solvers, API        |
| Core           | (brak zależności)            | Domain, Solvers, API      |

## 5. Kluczowe Komponenty

### 5.1 Core Layer (`network_model/core/`)

- **NetworkGraph** - graf sieci elektroenergetycznej (węzły + gałęzie)
- **Node** - węzeł sieci (SLACK, PQ, PV)
- **Branch** - gałąź sieci (LineBranch, TransformerBranch)
- **InverterSource** - źródło falownikowe OZE

### 5.2 Solvers Layer (`network_model/solvers/`)

- **ShortCircuitIEC60909Solver** - obliczenia zwarciowe wg IEC 60909 (ZAMROŻONY)
- **ShortCircuitResult** - wynik obliczeń zwarciowych

### 5.3 Analysis Layer (`analysis/power_flow/`)

- **PowerFlowSolver** - rozpływ mocy metodą Newtona-Raphsona
- **PowerFlowResult** - wynik rozpływu z violations/limits

### 5.4 Application Layer (`application/`)

- **NetworkWizardService** - orkiestracja CRUD sieci, import/export
- **AnalysisRunService** - tworzenie i wykonywanie analiz

## 6. Filozofia Systemu

### 6.1 Zasady Obowiązujące

1. **CORE = model sieci + fakty fizyczne** - brak interpretacji
2. **SOLVERS = czyste obliczenia fizyczne** - deterministyczne, bez OSD
3. **ANALYSIS = interpretacja wyników** - violations, limits, ale NIE regulacje
4. **APPLICATION = orkiestracja** - workflow, bez obliczeń fizycznych

### 6.2 Zakazy

- **Brak regulacji OSD w solverach** - logika regulacyjna NIE w core/solvers
- **Brak interpretacji w core** - Node/Branch nie wiedzą o limitach
- **IEC 60909 = wzorzec** - solver zamrożony, nie modyfikować

## 7. Stan Aktualny (AS-IS)

### 7.1 Co Jest Gotowe

| Komponent                  | Status        | Uwagi                              |
|----------------------------|---------------|-------------------------------------|
| NetworkGraph, Node, Branch | Gotowe        | Core model stabilny                |
| IEC 60909 Solver           | ZAMROŻONY     | Wzorzec poprawnej separacji        |
| Power Flow Solver          | Gotowe        | W `analysis/`, nie w `solvers/`    |
| NetworkWizardService       | Gotowe        | CRUD, import/export, walidacja     |
| AnalysisRunService         | Gotowe        | Orkiestracja analiz                |
| Persistence Layer          | Gotowe        | Repositories, UnitOfWork           |

### 7.2 Znane Rozbieżności

1. **Lokalizacja Power Flow** - w `analysis/` zamiast `solvers/`
   - ADR-001 uzasadnia to overlay specs
   - Wymaga wyjaśnienia czy `violations` to solver czy analysis

2. **Puste katalogi `src/solvers/`** - placeholder do uporządkowania

3. **Granice analysis vs solver** - violations/limits w Power Flow

## 8. Powiązane Dokumenty

- [01-Core.md](./01-Core.md) - szczegóły warstwy Core
- [02-Solvers.md](./02-Solvers.md) - szczegóły warstwy Solvers
- [03-Analyses.md](./03-Analyses.md) - szczegóły warstwy Analysis
- [04-Application.md](./04-Application.md) - szczegóły warstwy Application
- [ROADMAP.md](./ROADMAP.md) - mapa drogowa do produkcji
- [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md) - checklista przed uruchomieniem

## 9. ADR (Architecture Decision Records)

- [ADR-001](./adr/ADR-001-power-flow-v2-overlay-vs-core.md) - Power Flow overlay specs
- [ADR-002](./adr/ADR-002-network-wizard-service.md) - Network Wizard jako Application Layer
- [ADR-003](./adr/ADR-003-domain-layer-boundaries.md) - Granice warstwy domenowej
- [ADR-004](./adr/ADR-004-network-import-export-contracts.md) - Kontrakty import/export
- [ADR-005](./adr/ADR-005-solver-input-dto-contracts.md) - Kontrakty DTO solverów
