# UX_KATALOG_FIRST_DLA_INZYNIERA_SIECI_SN

Status: wiazacy dla aktywnego frontendu.

Kod:
- `frontend/src/ui/topology/domainApi.ts`
- `frontend/src/ui/topology/snapshotStore.ts`
- `frontend/src/ui/sld/SLDView.tsx`
- `frontend/src/ui/sld/SldEditorPage.tsx`
- `frontend/src/ui/network-build/forms/*`

Aktywna prawda klienta:
- frontend zapisuje model tylko przez `POST /api/cases/{caseId}/enm/domain-ops`,
- `snapshotStore` przechowuje odpowiedz domenowa: `snapshot`, `readiness`, `fixActions`, `materializedParams`, `selectionHint`, `layout`, `logicalViews`,
- SLD live i formularze czytaja te dane ze store; klient nie ma osobnej lokalnej migawki topologii.

Wejscie katalog-first:
- formularze dla GPZ, odcinkow, stacji, odgalezien, lacznikow, transformatorow, PV i BESS podaja `catalog_binding`,
- `SLDView.tsx` ma aktywny przeplyw `TypePicker -> modal operacji`,
- inspektor i menu kontekstowe pozwalaja tez na `assign_catalog_to_element`.

Reguly aktualne:
- klient traktuje katalog jako wymagany tam, gdzie backend zwraca bramke katalogowa,
- po operacji UI odswieza selection, readiness i materialized params z odpowiedzi backendu,
- dla GPZ frontend przechodzi przez te sama polityke katalog-first co glowny tor SN,
- komunikacja po stronie operatora jest po polsku.

Granice aktualnego stanu:
- `SldEditorPage.tsx` nadal ma akcje zmiany katalogu; proba jego usuniecia z elementu technicznego jest odrzucana po stronie backendu przez `catalog.clear_forbidden`,
- brak osobnego, domknietego widoku kompletosci katalogowej wszystkich klas elementow.
