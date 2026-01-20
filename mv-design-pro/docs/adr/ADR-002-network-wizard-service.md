# ADR-002: Network Wizard Service as Application Layer

## Status
Accepted

## Context
PR3 requires a deterministic, transactional application layer for CRUD, validation, and
import/export of network models without UI concerns. The domain and persistence layers
from PR1/PR2 remain unchanged and solver physics must stay frozen.

## Decision
We introduce `NetworkWizardService` in `backend/src/application/network_wizard/` as the
application-layer entrypoint. It orchestrates repositories via a lightweight Unit of
Work, enforces industrial-grade validation, and prepares solver input DTOs without
invoking solvers.

## Consequences
- UI/API/CLI can reuse a single application service for network lifecycle operations.
- Transactions are handled consistently and deterministically.
- Domain and solver layers remain untouched.
