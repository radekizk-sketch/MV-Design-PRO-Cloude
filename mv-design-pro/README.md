# MV-DESIGN PRO

**Professional Medium Voltage Network Design System**

Narzedzie do projektowania i analizy sieci sredniego napiecia zgodne z architektura DIgSILENT PowerFactory.

---

## Architektura

**Canonical specification:** see [`SYSTEM_SPEC.md`](./SYSTEM_SPEC.md) (executive overview) and [`docs/spec/`](./docs/spec/) (18 detailed chapters).

System jest zbudowany zgodnie z zasadami PowerFactory:
- **Jeden jawny model sieci** (NetworkModel)
- **Wiele case'ow obliczeniowych** (Study Cases)
- **Brak bytow umownych w solverze**
- **Obliczenia WHITE BOX** - w pelni audytowalne

### Warstwy

```
PRESENTATION  -- Frontend, Reports (NO physics)
APPLICATION   -- Wizard, SLD, Validation (NO physics)
DOMAIN        -- NetworkModel, Catalog, Case (model mutation HERE ONLY)
SOLVER        -- IEC 60909, Newton-Raphson (PHYSICS HERE ONLY, WHITE BOX)
INTERPRETATION -- Analysis, Proof Engine (NO physics, NO mutation)
```

---

## Wymagania

### Backend
- Python 3.11+
- Poetry

### Frontend
- Node.js 18+
- npm

---

## Szybki start

### Docker Compose

```bash
docker-compose up -d
```

Serwisy:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379

### Lokalne uruchomienie

#### Backend

```bash
cd backend
poetry install --with dev
poetry run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Testy

**Uwaga:** repo root nie zawiera `pyproject.toml`; uruchamianie `pytest` z root jest **nieautorytatywne**. Testy backendu uruchamiaj wylacznie z katalogu `mv-design-pro/backend`.

```bash
# Backend (canonical)
cd mv-design-pro/backend && poetry install --with dev
cd mv-design-pro/backend && poetry run pytest -q

# Frontend
cd mv-design-pro/frontend && npm install
cd mv-design-pro/frontend && npm test

# Frontend e2e
cd mv-design-pro/frontend && npm run test:e2e

# Linting
cd mv-design-pro/backend && poetry run ruff check src
cd mv-design-pro/frontend && npm run lint
cd mv-design-pro/frontend && npm run type-check

# No-codenames guard
python mv-design-pro/scripts/no_codenames_guard.py
```

---

## Struktura projektu

```
mv-design-pro/
├── backend/
│   └── src/
│       ├── network_model/       # Model sieci (Bus, Branch, Switch)
│       │   ├── core/            # Podstawowe elementy
│       │   ├── catalog/         # Biblioteki typow
│       │   ├── validation/      # NetworkValidator
│       │   ├── solvers/         # IEC 60909, Power Flow
│       │   └── whitebox/        # White-box trace
│       ├── enm/                 # Energy Network Model (ENM)
│       ├── analysis/            # Interpretacja wynikow (Protection, Voltage, ...)
│       ├── application/         # Wizard, SLD, Cases, Proof Engine, ...
│       ├── api/                 # FastAPI endpoints
│       └── infrastructure/      # Persistence (PostgreSQL, MongoDB)
├── frontend/
│   └── src/
│       ├── ui/                  # Komponenty React (SLD, Results, Cases, ...)
│       ├── designer/            # Wizard UI
│       ├── engine/sld-layout/   # Auto-layout pipeline
│       └── proof-inspector/     # Proof Inspector UI
├── docs/
│   ├── spec/                    # *** SPECYFIKACJA SZCZEGOLOWA (18 rozdzialow) ***
│   ├── ui/                      # Kontrakty UI
│   ├── proof_engine/            # Specyfikacje Proof Engine
│   ├── adr/                     # Architecture Decision Records
│   ├── audit/                   # Raporty audytowe
│   └── INDEX.md                 # Indeks dokumentacji
├── scripts/                     # CI guardy i narzedzia
└── docker-compose.yml
```

---

## Dokumentacja

| Dokument | Opis |
|----------|------|
| [`SYSTEM_SPEC.md`](./SYSTEM_SPEC.md) | Specyfikacja kanoniczna — przeglad + nawigacja (BINDING) |
| [`docs/spec/`](./docs/spec/) | **Specyfikacja szczegolowa (18 rozdzialow)** — zrodlo prawdy |
| [`docs/spec/AUDIT_SPEC_VS_CODE.md`](./docs/spec/AUDIT_SPEC_VS_CODE.md) | Audyt spec vs kod — macierz decyzji (BINDING) |
| [`docs/spec/SPEC_EXPANSION_PLAN.md`](./docs/spec/SPEC_EXPANSION_PLAN.md) | Plan rozbudowy specyfikacji |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architektura szczegolowa |
| [`AGENTS.md`](./AGENTS.md) | Zasady governance |
| [`PLANS.md`](./PLANS.md) | Plan wykonawczy (LIVING) |
| [`docs/INDEX.md`](./docs/INDEX.md) | Indeks dokumentacji |
| [`docs/ui/`](./docs/ui/) | Kontrakty UI (CANONICAL) |
| [`docs/proof_engine/`](./docs/proof_engine/) | Specyfikacje Proof Engine |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records |
| [`docs/audit/`](./docs/audit/) | Raporty audytowe (non-canonical) |

---

## Technologie

### Backend
- FastAPI, NumPy/SciPy, NetworkX, Pydantic, SQLAlchemy, Motor (MongoDB)

### Frontend
- React 18, TypeScript 5, Zustand, TanStack Query, Tailwind CSS, KaTeX

### Infrastructure
- PostgreSQL, MongoDB, Redis, Celery

---

## Licencja

Proprietary — All rights reserved.
