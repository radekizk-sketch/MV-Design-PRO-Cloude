# MV-DESIGN PRO

Professional Medium Voltage Network Design System — narzędzie do projektowania i analizy sieci średniego napięcia.

**Canonical architecture:** see [SYSTEM_SPEC.md](./SYSTEM_SPEC.md).

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

## Przegląd funkcji (wysokopoziomowy)

### Network Model
- Modelowanie sieci SN, węzłów, gałęzi, transformatorów i źródeł.
- Budowa `NetworkGraph` oraz przygotowanie wejść solverów (bez uruchamiania solverów).

### Domain Layer
- Project/Network/OperatingCase/StudyCase/Scenario/StudyRun.
- System jednostek (`UnitSystem`, `BaseQuantities`).
- W dokumentacji i API konsekwentnie używamy terminu **„PCC – punkt wspólnego przyłączenia”**.

### Application Layer
- `NetworkWizardService` jako deterministyczny kreator sieci bez UI.
- CRUD projektów, węzłów i gałęzi, zarządzanie PCC, OperatingCase/StudyCase.
- Import/eksport modelu sieci (JSON/CSV) i budowa wejść solverów.

### Solvers
- **IEC 60909 Short Circuit** — solver fizyczny (Result API zamrożone).
- **Power Flow** — solver fizyczny; implementacja jest obecnie w `backend/src/analysis/power_flow/` (status zgodny z SYSTEM_SPEC).

### Analysis
- Warstwa interpretacji wyników solverów (limits/violations/normy).
- **Protection = Analysis, NOT IMPLEMENTED.**

## Technologie

### Backend
- FastAPI
- NumPy/SciPy
- NetworkX
- Pydantic
- SQLAlchemy
- Motor (MongoDB)

### Frontend
- React 18
- TypeScript 5
- Zustand
- TanStack Query
- Tailwind CSS

### Infrastructure
- PostgreSQL
- MongoDB
- Redis
- Celery

## Licencja

Proprietary — All rights reserved.
