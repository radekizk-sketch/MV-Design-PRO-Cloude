# MV-DESIGN PRO

**Professional Medium Voltage Network Design System**

Narzędzie do projektowania i analizy sieci średniego napięcia zgodne z architekturą DIgSILENT PowerFactory.

---

## Architektura

**Canonical architecture:** see [SYSTEM_SPEC.md](./SYSTEM_SPEC.md)

System jest zbudowany zgodnie z zasadami PowerFactory:
- **Jeden jawny model sieci** (NetworkModel)
- **Wiele case'ów obliczeniowych** (Study Cases)
- **Brak bytów umownych w solverze**
- **Obliczenia WHITE BOX** - w pełni audytowalne

### Kluczowe koncepty

| Koncept | Opis |
|---------|------|
| **Bus** | Węzeł elektryczny (pojedynczy potencjał) |
| **Branch** | Gałąź fizyczna (Line, Cable, Transformer) |
| **Switch** | Aparatura łączeniowa (tylko OPEN/CLOSE, bez impedancji) |
| **Catalog** | Biblioteka typów (immutable) |
| **Case** | Scenariusz obliczeniowy (nie mutuje modelu) |
| **Solver** | Czysta fizyka + algorytm (WHITE BOX) |
| **Analysis** | Interpretacja wyników (violations, limits) |

### Architektura warstw

```
┌─────────────────────────────────────────────────┐
│                 Application Layer               │
│    ┌─────────────┐        ┌─────────────┐      │
│    │   Wizard    │        │    SLD      │      │
│    │  (editor)   │        │ (visualize) │      │
│    └──────┬──────┘        └──────┬──────┘      │
│           │                      │              │
│           └──────────┬───────────┘              │
│                      ▼                          │
│            ┌─────────────────┐                  │
│            │  NetworkModel   │◄── Single Model  │
│            └────────┬────────┘                  │
└─────────────────────┼───────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│                     ▼           Case Layer      │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ ShortCirc  │  │ PowerFlow  │  │Protection │ │
│  │   Case     │  │   Case     │  │   Case    │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘ │
└────────┼───────────────┼───────────────┼────────┘
         │               │               │
┌────────┼───────────────┼───────────────┼────────┐
│        ▼               ▼               ▼        │
│  ┌──────────────────────────────────────────┐  │
│  │           Solver Layer (WHITE BOX)        │  │
│  │  ┌─────────────┐    ┌─────────────────┐  │  │
│  │  │ IEC 60909   │    │ Newton-Raphson  │  │  │
│  │  │ Short Circ  │    │  Power Flow     │  │  │
│  │  └─────────────┘    └─────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Wymagania

### Backend
- Python 3.11+
- Poetry

### Frontend
- Node.js 18+
- npm lub yarn

---

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

---

## Struktura projektu

```
mv-design-pro/
├── backend/
│   └── src/
│       ├── network_model/       # Model sieci (Bus, Branch, Switch)
│       │   ├── core/            # Podstawowe elementy
│       │   ├── catalog/         # Biblioteki typów
│       │   ├── validation/      # NetworkValidator
│       │   ├── solvers/         # IEC 60909, Power Flow
│       │   └── whitebox/        # White-box trace
│       ├── cases/               # Study Cases
│       ├── analyses/            # Interpretacja wyników
│       └── application/
│           ├── wizard/          # Kreator sieci
│           └── sld/             # Single Line Diagram
├── frontend/
│   └── src/
│       └── designer/            # UI kreatora i SLD
├── docs/                        # Dokumentacja operacyjna
└── docs/audit/                  # Raporty audytowe i archiwalne ExecPlany
```

---

## Kluczowe zasady (PowerFactory Alignment)

### 1. Jeden model sieci
- NetworkModel jest jedynym źródłem prawdy
- Kreator i SLD edytują TEN SAM model
- Brak duplikacji stanu

### 2. Case nie mutuje modelu
- Case przechowuje TYLKO parametry obliczeń
- Wiele case'ów może odwoływać się do jednego modelu
- Zmiana modelu unieważnia wszystkie wyniki

### 3. Aparatura bez fizyki
- Switch/Breaker zmienia TYLKO topologię
- Brak impedancji w aparaturze
- Stan: OPEN/CLOSED

### 4. WHITE BOX (obowiązkowe)
- Wszystkie solvery ujawniają wartości pośrednie
- Możliwość ręcznego audytu obliczeń
- Brak ukrytych korekt

### 5. Walidacja przed obliczeniami
- NetworkValidator sprawdza spójność grafu
- Brak walidacji = brak uruchomienia solvera

---

## Dokumentacja

| Dokument | Opis |
|----------|------|
| [SYSTEM_SPEC.md](./SYSTEM_SPEC.md) | Specyfikacja kanoniczna (BINDING) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architektura szczegółowa |
| [AGENTS.md](./AGENTS.md) | Zasady governance |
| [PLANS.md](./PLANS.md) | Plan wykonawczy refaktoryzacji |
| [docs/audit/](./docs/audit/) | Raporty audytowe i materiały historyczne (non-canonical) |
| [docs/](./docs/) | Dokumentacja operacyjna |
| [docs/INDEX.md](./docs/INDEX.md) | Spis treści dokumentacji |

---

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

---

## Licencja

Proprietary — All rights reserved.
