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

### Analysis (Power Flow Solver v1)
Power Flow v1 jest osobnym komponentem analitycznym w `backend/src/analysis/power_flow`.
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

#### Ograniczenia PF v1
- Brak węzłów PV i automatycznego przełączania PV↔PQ.
- Brak limitów Q (Qmin/Qmax).
- Brak OLTC i sterowania zaczepem (tap control).
- Brak shuntów sterowanych i kompensacji jako elementów jawnych.
- Brak raportowania limitów napięciowych/prądowych (U/I/S).

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
