# CATALOG-FIRST LEGACY EXECUTION PLAN

## Wykonane
- `assign_catalog_to_element` oznacza obiekt jako `source_mode=MIGRACJA`.

## Plan egzekucyjny
1. skan snapshotu: krytyczne elementy bez `catalog_ref`.
2. oznaczenie `source_mode=MIGRACJA`.
3. readiness migracyjny + fix action.
4. przypisanie katalogu / wymiana elementu.
