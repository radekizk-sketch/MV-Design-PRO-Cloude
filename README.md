# MV-Design-PRO

**Professional Medium Voltage Network Design & Analysis System**

System do projektowania i analizy sieci SN (Srednie Napiecie) zgodny z architekturą DIgSILENT PowerFactory, z pełną integracją OZE i zgodnością z NC RfG oraz polskimi wymaganiami kodeksowymi.

---

## Quick Start

```bash
cd mv-design-pro
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Documentation

All project documentation lives in `mv-design-pro/`:

| Document | Purpose |
|----------|---------|
| [`mv-design-pro/SYSTEM_SPEC.md`](mv-design-pro/SYSTEM_SPEC.md) | System specification (executive overview + navigation) |
| [`mv-design-pro/docs/spec/`](mv-design-pro/docs/spec/) | **Detailed specification (18 chapters)** — source of truth |
| [`mv-design-pro/ARCHITECTURE.md`](mv-design-pro/ARCHITECTURE.md) | Architecture reference |
| [`mv-design-pro/AGENTS.md`](mv-design-pro/AGENTS.md) | Agent governance rules |
| [`mv-design-pro/PLANS.md`](mv-design-pro/PLANS.md) | Operational plan |
| [`mv-design-pro/README.md`](mv-design-pro/README.md) | How to run, test, develop |

## Running Tests

```bash
cd mv-design-pro/backend && poetry install --with dev
cd mv-design-pro/backend && poetry run pytest -q
```

## License

Proprietary — All rights reserved.
