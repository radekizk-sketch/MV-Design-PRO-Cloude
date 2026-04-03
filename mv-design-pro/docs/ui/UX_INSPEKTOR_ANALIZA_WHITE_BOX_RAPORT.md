# UX_INSPEKTOR_ANALIZA_WHITE_BOX_RAPORT

Status: wiazacy dla aktywnego interfejsu odczytu.

Kod:
- `frontend/src/ui/sld/SldEditorPage.tsx`
- `frontend/src/ui/topology/snapshotStore.ts`
- `frontend/src/ui/sld/ReadinessLivePanel.tsx`
- `backend/src/api/analysis_runs.py`
- `backend/src/api/power_flow_runs.py`
- `frontend/src/ui/proof/TraceMetadataPanel.tsx`
- `frontend/src/ui/proof/export/exportTraceJsonl.ts`
- `frontend/src/ui/proof/export/exportTracePdf.ts`

Inspektor elementu:
- pokazuje tozsamosc elementu z `snapshot`,
- pokazuje `catalog_ref`, namespace i wersje, jesli sa dostepne,
- pokazuje `readiness` i `fix_actions`,
- udostepnia akcje zmiany katalogu dla wybranych elementow.

Analiza i White Box:
- frontend korzysta z kanonicznych endpointow run i trace,
- backend zwraca `white_box_trace`, a dla rozplywu rowniez `power_flow_trace`,
- rozszerzony White Box pod `analysis-runs/{run_id}/results/trace` zawiera `catalog_context` z `element_id`, `catalog_binding`, `materialized_params`, `parameter_origin` i `manual_overrides`, jesli takie dane sa w snapshot,
- panel metadanych White Box pokazuje ten kontekst bez pobierania danych poza aktywnym snapshot,
- overlay wynikowy SLD jest odczytem, nie edycja.

Raport:
- aktywne eksporty rozplywu sa po stronie backendu,
- frontend moze odwolac sie do eksportu JSON, DOCX i PDF dla `power-flow-runs`,
- frontendowy eksport sladu White Box do `JSONL` i `PDF` zawiera ten sam `catalog_context`, co widok trace.

Granice aktualnego stanu:
- inspektor nie pokazuje jeszcze pelnego pochodzenia kazdego parametru solverowego,
- backendowe raporty `power-flow-runs/{run_id}/export/json|docx|pdf` nie przenosza jeszcze pelnego `catalog_context` z rozszerzonego White Box,
- kompletna nawigacja `wynik -> element -> katalog -> raport` nie jest jeszcze osobnym, jednym ekranem.
