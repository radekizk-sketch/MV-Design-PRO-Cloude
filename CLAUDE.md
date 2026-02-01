# CLAUDE.md - AI Assistant Guidelines for MV-DESIGN-PRO

## Project Overview

MV-DESIGN-PRO is a professional Medium Voltage (MV) network design and analysis system for the power industry. It provides tools for network modeling, short circuit calculations (IEC 60909), power flow analysis, and protection coordination with full OZE (renewable energy) integration.

The system is architecturally aligned with **DIgSILENT PowerFactory** principles:
- One explicit Network Model per project
- Multiple Study Cases (calculation scenarios)
- WHITE BOX calculations (all intermediate values auditable)
- No fictional entities in solvers
- Strict layer separation (Solver vs Analysis vs Presentation)

## Technology Stack

### Backend (Python 3.11+)
- **Framework**: FastAPI
- **Package Manager**: Poetry
- **Dependencies**: numpy, scipy, networkx, pydantic, pandas
- **Databases**: PostgreSQL, MongoDB, Redis
- **Task Queue**: Celery
- **Testing**: pytest, pytest-asyncio
- **Linting**: black, ruff, mypy

### Frontend (TypeScript/React)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Fetching**: @tanstack/react-query
- **Forms**: react-hook-form with zod validation
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **Testing**: Vitest, Playwright (e2e)

## Project Structure

```
MV-Design-PRO-Cloude/
├── .github/workflows/         # CI/CD pipelines
├── docs/                      # Root-level documentation index
│   └── ui/                    # UI contract documents
├── mv-design-pro/             # Main application
│   ├── backend/
│   │   ├── src/
│   │   │   ├── analysis/      # Interpretation layer (no physics)
│   │   │   ├── api/           # FastAPI endpoints
│   │   │   ├── application/   # Application layer (Wizard, SLD)
│   │   │   ├── compliance/    # Normative compliance checks
│   │   │   ├── domain/        # Domain models
│   │   │   ├── infrastructure/# Persistence, external services
│   │   │   ├── network_model/ # Core network model
│   │   │   │   ├── core/      # Bus, Branch, Switch, Source, Load
│   │   │   │   ├── catalog/   # Type library
│   │   │   │   ├── solvers/   # Physics calculations
│   │   │   │   ├── validation/# NetworkValidator
│   │   │   │   └── whitebox/  # Calculation trace utilities
│   │   │   ├── solvers/       # Top-level solver wrappers
│   │   │   └── whitebox/      # White-box trace utilities
│   │   └── tests/             # Backend tests
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── ui/            # React components
│   │   │   │   ├── sld/       # Single Line Diagram
│   │   │   │   ├── proof/     # Proof Inspector
│   │   │   │   ├── results/   # Results browser
│   │   │   │   ├── inspector/ # Element inspector
│   │   │   │   └── ...        # Other UI modules
│   │   │   ├── designer/      # Designer module
│   │   │   └── proof-inspector/
│   │   └── e2e/               # Playwright e2e tests
│   ├── scripts/               # CI/CD and utility scripts
│   └── docs/                  # Detailed documentation
│       ├── proof_engine/      # Proof Pack specifications
│       ├── adr/               # Architecture Decision Records
│       └── ui/                # UI contracts
```

## Canonical Documents (BINDING)

These documents define authoritative rules - always consult before making changes:

| Document | Purpose |
|----------|---------|
| `mv-design-pro/SYSTEM_SPEC.md` | **Canonical architecture spec** - single source of truth |
| `mv-design-pro/AGENTS.md` | Governance rules for all agents (human & AI) |
| `mv-design-pro/ARCHITECTURE.md` | Detailed design reference |
| `mv-design-pro/PLANS.md` | Current execution plan (living document) |
| `docs/INDEX.md` | UI contracts index |

## Architecture Layer Boundaries (CRITICAL)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  - Frontend, Reports, Export                                 │
│  NO physics, NO model mutation                               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  - Wizard (edit controller)                                  │
│  - SLD (visualization)                                       │
│  - Validation (pre-check)                                    │
│  NO physics calculations                                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  - NetworkModel (Bus, Branch, Switch, Source, Load)          │
│  - Catalog (Type Library)                                    │
│  - Case (Study Cases)                                        │
│  Model mutation allowed HERE ONLY                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      SOLVER LAYER                            │
│  - IEC 60909 Short Circuit                                   │
│  - Newton-Raphson Power Flow                                 │
│  PHYSICS HERE ONLY, WHITE BOX REQUIRED                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     ANALYSIS LAYER                           │
│  - Protection Analysis                                       │
│  - Thermal/Voltage Analysis                                  │
│  - Boundary Identification (PCC)                             │
│  INTERPRETATION ONLY, NO physics                             │
└─────────────────────────────────────────────────────────────┘
```

## Core Rules (IMMUTABLE)

### 1. NOT-A-SOLVER Rule
These components **CANNOT** contain physics calculations:
- Protection, Frontend, Reporting, Wizard, SLD, Validation

Only dedicated solvers compute physics:
- `network_model.solvers.short_circuit_iec60909`
- `network_model.solvers.power_flow_newton`

### 2. WHITE BOX Rule
All solvers **MUST**:
- Expose all calculation steps
- Provide intermediate values (Y-bus matrix, Z-thevenin, etc.)
- Allow numerical audit
- Document assumptions

**Forbidden**: Black-box solvers, hidden corrections, undocumented simplifications

### 3. Single Model Rule
- **ONE NetworkModel** per project
- Wizard and SLD edit **THE SAME** model
- No duplicate data stores

### 4. Case Immutability Rule
- Case **CANNOT mutate** NetworkModel
- Case stores **ONLY** calculation parameters
- Multiple Cases reference one Model (read-only view)

### 5. PCC Prohibition Rule
- **PCC is NOT in NetworkModel** (it's a business concept, not physics)
- PCC belongs in the interpretation/analysis layer only

### 6. No Codenames in UI
Project codenames (P7, P11, P14, P17, P20, etc.) must **NEVER** appear in:
- UI-visible strings
- Exports
- Test artifacts

Use Polish labels instead. Enforced by `scripts/no_codenames_guard.py`.

## Development Commands

### Backend
```bash
cd mv-design-pro/backend

# Install dependencies
poetry install --with dev

# Run tests
poetry run pytest -q

# Run specific test
poetry run pytest tests/test_short_circuit_iec60909.py -v

# Run linting
poetry run black src tests
poetry run ruff check src tests
poetry run mypy src

# Run server (development)
poetry run uvicorn src.api.main:app --reload --port 8000
```

### Frontend
```bash
cd mv-design-pro/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build

# No-codenames guard check
npm run guard:codenames
```

### Docker
```bash
cd mv-design-pro

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Code Style & Conventions

### Python
- Line length: 100 characters
- Formatter: black
- Linter: ruff (rules: E, F, W, I, N, UP, B, C4)
- Type hints required (mypy strict mode)
- Use frozen dataclasses for immutable result types

### TypeScript
- Strict mode enabled
- Use explicit typing
- ESLint with React hooks plugin
- Prefer zustand for state management

### Terminology
| Term | Definition | PowerFactory Equivalent |
|------|------------|------------------------|
| Bus | Electrical node (single potential) | Terminal |
| Branch | Physical connection with impedance | Line/Cable/Trafo |
| Switch | Switching apparatus (no impedance) | Switch/Breaker |
| Station | Logical container (no physics) | Substation folder |
| Case | Calculation scenario | Study Case |
| Catalog | Type library | Type Library |

**Forbidden Terms in Core Model**: PCC, Connection Point, Virtual Node, Aggregated Element

## Testing Guidelines

### Backend Tests
- Located in `mv-design-pro/backend/tests/`
- Use pytest with asyncio mode auto
- Mark integration tests with `@pytest.mark.integration`
- Key test files:
  - `test_short_circuit_iec60909.py` - Short circuit solver
  - `test_power_flow_v2.py` - Power flow solver
  - `test_result_api_contract.py` - Frozen Result API
  - `test_protection_analysis.py` - Protection layer

### Frontend Tests
- Unit tests with Vitest in `src/ui/**/__tests__/`
- E2E tests with Playwright in `e2e/`
- Component tests use @testing-library/react

## Git Workflow

### Branch Naming
- `main` - stable, tested
- `develop` - integration
- `feature/*` - new features
- `refactor/*` - architectural changes
- `fix/*` - bug fixes
- `claude/*` - AI assistant branches

### PR Requirements
- Small, focused changes
- Reference to ExecPlan step (if applicable)
- Verification of compliance checklist
- WHITE BOX tests included for solver changes

### CI Pipeline
- GitHub Actions workflow: `.github/workflows/python-tests.yml`
- Runs pytest on push and PR
- Uses Python 3.11, Poetry for dependency management

## Proof Engine (P11)

The Proof Engine generates mathematical proofs from solver results:

### Key Concepts
- **TraceArtifact**: Immutable calculation trace
- **ProofDocument**: Formal mathematical proof
- **ProofStep**: Formula → Data → Substitution → Result → Unit verification

### Invariants
- Solver untouched - Proof Engine does NOT modify solvers
- Determinism - same `run_id` produces identical output
- Pure interpretation - proofs generated from existing trace/result data
- LaTeX-only math - all formulas in block LaTeX `$$...$$`
- I_dyn and I_th mandatory in SC3F proofs

### Export Formats
- JSON (`proof.json`)
- LaTeX (`proof.tex`)
- PDF (`proof.pdf`)
- DOCX

## Common Tasks

### Adding a New Element Type
1. Check SYSTEM_SPEC.md for allowed element types
2. Add to `network_model/core/`
3. Update NetworkValidator
4. Add SLD symbol mapping
5. Write tests

### Modifying Solver Output
1. **STOP** - Result APIs are FROZEN
2. Check if change requires version bump
3. Ensure WHITE BOX trace is maintained
4. Update ProofDocument mapping if needed

### Adding UI Feature
1. Review UI contracts in `docs/ui/`
2. Follow layer boundaries (no physics in UI)
3. Use Polish labels, no project codenames
4. Add tests (Vitest for unit, Playwright for e2e)

### Working with Study Cases
- Cases store config only, not model data
- Model changes invalidate ALL case results
- Clone creates new case with NONE status (no results copied)
- Only ONE case active at a time

## Important Warnings

1. **NEVER** add PCC/boundary concepts to NetworkModel
2. **NEVER** add physics calculations to non-solver components
3. **NEVER** modify frozen Result APIs without version bump
4. **NEVER** create shadow/duplicate data models
5. **NEVER** bypass NetworkValidator before solver execution
6. **NEVER** use project codenames (P11, P14, etc.) in UI strings
7. **ALWAYS** maintain WHITE BOX traceability in solvers
8. **ALWAYS** preserve deterministic behavior (same input = same output)

## Escalation

If any rule conflict is detected:
1. Stop implementation
2. Document conflict in PLANS.md
3. Request architectural review
4. Do not proceed until resolved

## Quick Reference

| Action | Command |
|--------|---------|
| Run backend tests | `cd mv-design-pro/backend && poetry run pytest -q` |
| Run frontend tests | `cd mv-design-pro/frontend && npm test` |
| Check codenames | `cd mv-design-pro/frontend && npm run guard:codenames` |
| Start dev servers | `cd mv-design-pro && docker-compose up -d` |
| Type check frontend | `cd mv-design-pro/frontend && npm run type-check` |
| Lint Python | `cd mv-design-pro/backend && poetry run ruff check src` |
