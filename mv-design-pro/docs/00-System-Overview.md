# MV-DESIGN-PRO — Overview (Operational)

> **Architecture & definitions are canonical in** [`SYSTEM_SPEC.md`](../SYSTEM_SPEC.md).
> This document is intentionally non-normative and focuses on operational orientation.

## 1. Dokumenty bazowe
- **SYSTEM_SPEC.md** — architektura, definicje solver/case/analysis, stan AS-IS.
- **README.md** — szybki start i opis wysokopoziomowy.
- **docs/** — instrukcje operacyjne i checklisty.

## 2. Szybki orientacyjny przegląd repozytorium

```
mv-design-pro/
├── backend/          # Backend API + moduły obliczeniowe
├── frontend/         # UI
├── docs/             # How-to / guide / checklisty
├── docs/audit/       # Audyty i notatki historyczne
├── PLANS.md          # Aktywny ExecPlan (aktualizować, nie tworzyć nowego)
└── SYSTEM_SPEC.md    # Specyfikacja kanoniczna
```

## 3. Operacyjne punkty startowe
- **Backend:** `backend/src/api/main.py` (FastAPI)
- **Frontend:** `frontend/` (React)
- **Docker Compose:** `docker-compose.yml`

## 4. White-Box Trace (operacyjnie)
- White-Box Trace to wymagane artefakty śledzenia obliczeń solverów.
- Szczegóły definicyjne znajdują się w `SYSTEM_SPEC.md`.

## 5. Linki pomocnicze
- [GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)
- [REPOSITORY-HYGIENE.md](./REPOSITORY-HYGIENE.md)
- [ROADMAP.md](./ROADMAP.md)
- [INDEX.md](./INDEX.md) — spis treści dokumentacji
- [docs/audit/](./audit/) — raporty audytowe i archiwalne ExecPlany (non-canonical)
