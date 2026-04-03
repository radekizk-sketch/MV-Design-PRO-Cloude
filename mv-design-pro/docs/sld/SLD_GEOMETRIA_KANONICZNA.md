# SLD_GEOMETRIA_KANONICZNA

Status: wiazacy dla aktualnej geometrii live SLD.

Kod:
- `frontend/src/ui/sld/enmSnapshotToSldSymbols.ts`
- `frontend/src/ui/sld-editor/utils/topological-layout/index.ts`
- `frontend/src/ui/sld-editor/utils/topological-layout/topologicalLayoutEngine.ts`
- `frontend/src/ui/sld-editor/utils/topological-layout/__tests__/*`

Aktywny przebieg:
- frontend buduje symbole z `snapshot`,
- nastepnie uruchamia `computeTopologicalLayout(...)`,
- wynik geometrii jest wykorzystywany do renderu live SLD.

Reguly:
- geometria live jest deterministyczna dla tego samego zestawu symboli wejsciowych,
- overlay wynikowy backendu jest warstwa osobna i nie zmienia tej geometrii,
- testy geometrii i zlote uklady sa utrzymywane w `frontend/src/ui/sld-editor/utils/topological-layout/__tests__`.

Granice aktualnego stanu:
- nie istnieje jeden wspolny runtime geometrii dla live SLD i backendowego overlay,
- dokumentacja nie moze twierdzic, ze cala geometria SLD jest obecnie liczona po stronie backendu.
