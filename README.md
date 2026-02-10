# MV-Design-PRO

**Professional Medium Voltage Network Design & Analysis System**

System do projektowania i analizy sieci SN (Srednie Napiecie) zgodny z architekturą DIgSILENT PowerFactory, z pełną integracją OZE i zgodnością z NC RfG oraz polskimi wymaganiami kodeksowymi.

---

## Start Here

| Entry Point | What It Is |
|-------------|-----------|
| [`mv-design-pro/docs/spec/`](mv-design-pro/docs/spec/) | **Detailed specification (18 chapters)** — the source of truth |
| [`mv-design-pro/SYSTEM_SPEC.md`](mv-design-pro/SYSTEM_SPEC.md) | Executive overview + navigation hub to spec chapters |
| [`mv-design-pro/ARCHITECTURE.md`](mv-design-pro/ARCHITECTURE.md) | Architecture reference (layers, flows, file map) |
| [`mv-design-pro/docs/INDEX.md`](mv-design-pro/docs/INDEX.md) | Full documentation index (spec, UI contracts, proof engine, ADRs) |

## Other Documentation

| Document | Purpose |
|----------|---------|
| [`mv-design-pro/AGENTS.md`](mv-design-pro/AGENTS.md) | Agent governance rules |
| [`mv-design-pro/PLANS.md`](mv-design-pro/PLANS.md) | Operational plan (living document) |
| [`mv-design-pro/README.md`](mv-design-pro/README.md) | How to run, test, develop |
| [`docs/INDEX.md`](docs/INDEX.md) | UI contracts index (Polish) |

---

## Quick Start

```bash
cd mv-design-pro
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Running Tests

```bash
cd mv-design-pro/backend && poetry install --with dev
cd mv-design-pro/backend && poetry run pytest -q
```

## License

Proprietary — All rights reserved.
