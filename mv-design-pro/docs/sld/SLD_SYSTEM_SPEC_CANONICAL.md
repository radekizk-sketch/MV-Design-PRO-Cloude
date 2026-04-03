# SLD_SYSTEM_SPEC_CANONICAL

Status: wiazacy dla aktualnego stosu SLD.

Kod:
- `backend/src/api/sld.py`
- `backend/src/api/canonical_run_views.py`
- `frontend/src/ui/sld/SldEditorPage.tsx`
- `frontend/src/ui/sld/SLDView.tsx`
- `frontend/src/ui/sld/enmSnapshotToSldSymbols.ts`

Dwie aktywne warstwy:
- live SLD w frontendzie jest budowany z `snapshot` ENM,
- backendowy endpoint SLD wystawia tylko read-only overlay wynikowy dla istniejacego diagramu.

Backend:
- aktywny endpoint to `GET /projects/{project_id}/sld/{diagram_id}/overlay?run_id=...`,
- overlay korzysta z `CanonicalRun` i helpera `build_sld_overlay()`,
- overlay nie liczy nowej geometrii i nie mutuje diagramu.

Frontend:
- `SldEditorPage.tsx` odswieza `snapshot` i `readiness`,
- `SLDView.tsx` utrzymuje selection, URL i przeplyw wyboru katalogu,
- symbole live sa budowane przez `enmSnapshotToSldSymbols(snapshot)`.

Reguly wiazace:
- nie wolno opisywac backendowego overlay jako live generatora geometrii,
- nie wolno mieszac overlay wynikowego z logika edycji ENM,
- stan katalogu, selection i readiness po stronie live wynikaja z odpowiedzi `domain-ops`.
