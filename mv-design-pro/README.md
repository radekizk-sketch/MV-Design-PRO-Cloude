# MV-DESIGN PRO

Professional Medium Voltage Network Design System - kompleksowe narzędzie do projektowania i analizy sieci średniego napięcia.

## Struktura projektu

```
mv-design-pro/
├── backend/                    # Backend API (Python/FastAPI)
│   ├── src/
│   │   ├── analysis/           # Moduły analityczne (Power Flow v1)
│   │   ├── network_model/      # Model sieci elektrycznej
│   │   │   ├── core/           # Podstawowe klasy i struktury
│   │   │   ├── elements/       # Elementy sieci (transformatory, linie, etc.)
│   │   │   └── validation/     # Walidacja modelu sieci
│   │   ├── solvers/            # Solvery obliczeniowe (np. IEC 60909)
│   │   ├── whitebox/           # Transparentne obliczenia
│   │   ├── compliance/         # Zgodność z normami
│   │   └── api/                # REST API endpoints
│   ├── tests/                  # Testy jednostkowe i integracyjne
│   └── pyproject.toml          # Konfiguracja Poetry
├── frontend/                   # Frontend (React/TypeScript)
│   ├── src/
│   │   ├── components/         # Komponenty React
│   │   ├── stores/             # Zustand stores
│   │   └── api/                # Klient API
│   └── package.json
├── docker-compose.yml          # Konfiguracja Docker
└── README.md
```

## Wymagania

### Backend
- Python 3.11+
- Poetry

### Frontend
- Node.js 18+
- npm lub yarn

## Szybki start

### Uruchomienie z Docker Compose

```bash
docker-compose up -d
```

Serwisy będą dostępne pod adresami:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379

### Uruchomienie lokalne

#### Backend

```bash
cd backend
poetry install
poetry run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Główne moduły

### Network Model
Modelowanie sieci średniego napięcia z obsługą:
- Transformatorów SN/nn
- Linii kablowych i napowietrznych
- Rozdzielnic i pól rozdzielczych
- Zabezpieczeń

### Solvers
- **Short Circuit** - obliczenia zwarciowe wg IEC 60909

### Analysis (Power Flow Solver v1 + v2)
Power Flow v1/v2 jest osobnym komponentem analitycznym w `backend/src/analysis/power_flow`.
Stanowi fundament pod kolejne funkcje PF, ale **nie zmienia fizyki** obliczeń IEC 60909.
Łańcuch analiz jest logicznie uporządkowany: Power Flow → Short Circuit → Protection
(zależność wyników, nie refaktoryzacja istniejących solverów).

#### Publiczne API (stabilne w v1)
- `PowerFlowInput`
- `PowerFlowOptions`
- `PowerFlowResult`
- `PowerFlowSolver`
- `solve_power_flow`

#### Result API (PowerFactory-ready)
- `to_dict()` zwraca JSON-ready output z deterministycznym sortowaniem kluczy.
- `white_box_trace` zawiera pełny ślad iteracji, walidacji, wysp oraz Y-bus mapowań.
- Bilans mocy raportuje `slack_power_pu` i `sum_pq_spec_pu` wraz z notą kontrolną.
- Obsługa wysp: liczona jest wyłącznie wyspa slack, reszta raportowana w trace.

#### PF v2 (rozszerzenie v1)
- PV z ograniczeniami Q (Qmin/Qmax) i automatycznym PV↔PQ.
- Off-nominal tap dla transformatorów (core lub overlay).
- Shunty/kompensacja jako overlay specyfikacji.
- Raportowanie limitów napięciowych/prądowych/mocy z rankingiem naruszeń.
- Raportowanie jednostek rzeczywistych kV/kA, gdy `voltage_level` jest dostępne.
- Brak wpływu na solver IEC 60909 (API + obliczenia + raporty pozostają nietknięte).

### Opcje przyszłego rozwoju systemu (Roadmap)
Poniższe opcje opisują **świadomie niezaimplementowane** funkcje i kierunki rozwoju.
Sekcja ma charakter architektoniczny: **funkcje planowane ≠ funkcje dostępne**.
Aktualny zakres obejmuje Power Flow v2 i IEC 60909; poniższe elementy nie są
częścią obecnej funkcjonalności.

#### 3.1. Protection (kolejny etap funkcjonalny)
Planowany jest moduł zabezpieczeń, działający jako **konsument wyników** analitycznych:
- zabezpieczenia nadprądowe 50/51 oraz 50N/51N,
- selektywność czasowa na poziomie nastaw i porównań czasowych,
- wykorzystanie wyników Power Flow (Ib, kierunki) oraz IEC 60909 (Ik min/max, Ip, Ith),
- brak ingerencji w fizykę PF i SC — brak zmian w solverach, jedynie warstwa interpretacji.

#### 3.2. Rozszerzenia Power Flow ponad v2
PF v2 osiąga **PowerFactory parity minimum**. Poniższe elementy są
rozszerzeniem klasy narzędzia, a nie poprawką błędów:
- automatyczna regulacja transformatorów (OLTC),
- modele obciążeń zależne od napięcia (ZIP),
- alternatywne solwery i stabilizacja (FDLF, line-search),
- scenariusze i analiza N-1.

#### 3.3. Model danych (core model v2 – opcjonalnie)
Opcjonalnie rozważana jest konsolidacja danych w modelu core:
- ratingów,
- zakresów tapów,
- poziomów napięć.
Obecnie obowiązuje **overlay specyfikacji** (zob. ADR-001: overlay vs core).
Decyzja o rozbudowie core wymaga osobnego ADR i nie jest częścią bieżącego zakresu.

#### 3.4. Analizy zaawansowane
Długoterminowo rozważane są opcje:
- sieci niesymetryczne (3-fazowe),
- stabilność dynamiczna,
- symulacje czasowe.

### Whitebox
Transparentne obliczenia z pełną dokumentacją kroków pośrednich.

### Compliance
Sprawdzanie zgodności projektu z normami:
- PN-EN 61936
- PN-HD 60364
- SEP-E-004

## Technologie

### Backend
- FastAPI - framework REST API
- NumPy/SciPy - obliczenia numeryczne
- NetworkX - analiza grafów sieci
- Pydantic - walidacja danych
- SQLAlchemy - ORM dla PostgreSQL
- Motor - async driver dla MongoDB

### Frontend
- React 18 - biblioteka UI
- TypeScript 5 - typowanie statyczne
- Zustand - zarządzanie stanem
- TanStack Query - cache i synchronizacja danych
- Tailwind CSS - stylowanie

### Infrastructure
- PostgreSQL - dane relacyjne
- MongoDB - dokumenty projektów
- Redis - cache i sesje
- Celery - zadania asynchroniczne

## Licencja

Proprietary - All rights reserved
