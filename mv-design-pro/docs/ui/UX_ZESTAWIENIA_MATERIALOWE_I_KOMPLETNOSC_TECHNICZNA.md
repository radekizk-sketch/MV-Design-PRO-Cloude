# UX_ZESTAWIENIA_MATERIALOWE_I_KOMPLETNOSC_TECHNICZNA

Status: wiazacy dla aktualnego zakresu produktu.

Kod:
- `frontend/src/ui/sld/SldEditorPage.tsx`
- `frontend/src/ui/sld/ReadinessLivePanel.tsx`
- `frontend/src/ui/topology/snapshotStore.ts`
- `backend/src/api/enm.py`
- `backend/src/enm/validator.py`

Stan aktywny:
- produkt ma odczyt gotowosci i akcji naprawczych,
- produkt ma widoczne `materialized_params` w odpowiedzi `domain-ops`,
- produkt ma inspekcje elementu na SLD i panel live readiness.

Brakujace ekrany:
- brak osobnego ekranu BOM,
- brak osobnego ekranu kompletosci technicznej calego projektu,
- brak osobnego ekranu decyzji projektowych i zbiorczych nadpisan katalogowych.

Regula wiazaca:
- dokumentacja i backlog nie moga twierdzic, ze zestawienia materialowe lub zbiorcza kompletosc techniczna sa juz gotowymi funkcjami UI,
- do czasu wdrozenia takich ekranow zrodlem prawdy pozostaja `snapshot`, `readiness`, `fix_actions` i inspektor elementu.
