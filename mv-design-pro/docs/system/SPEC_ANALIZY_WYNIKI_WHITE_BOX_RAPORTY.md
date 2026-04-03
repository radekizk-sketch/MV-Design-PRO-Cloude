# SPEC_ANALIZY_WYNIKI_WHITE_BOX_RAPORTY

Status: wiazacy dla aktywnego toru canonical-only.

Kod:
- `backend/src/enm/mapping.py`
- `backend/src/enm/canonical_analysis.py`
- `backend/src/api/analysis_runs.py`
- `backend/src/api/power_flow_runs.py`
- `backend/src/api/canonical_run_views.py`
- `backend/src/api/sld.py`
- `frontend/src/ui/proof/TraceMetadataPanel.tsx`
- `frontend/src/ui/proof/export/exportTraceJsonl.ts`
- `frontend/src/ui/proof/export/exportTracePdf.ts`

Aktywny przeplyw:
- `snapshot` ENM jest mapowany do solvera przez `backend/src/enm/mapping.py`,
- wykonanie analizy prowadzi `backend/src/enm/canonical_analysis.py`,
- wynik kanoniczny przechowuje `snapshot_hash`, `input_hash`, `validation`, `readiness`, `white_box_trace`; dla rozplywu rowniez `power_flow_trace`,
- rozszerzony trace budowany przez `build_extended_trace()` zwraca `catalog_context` wyprowadzony ze snapshot: `element_id`, `catalog_binding`, `materialized_params`, `parameter_origin` i `manual_overrides`, jesli sa dostepne.

Reguly aktualne:
- solver czyta pola instancyjne galezi i transformatorow, nie czyta bezposrednio koperty odpowiedzi `materialized_params`,
- katalog dociera do solvera tylko tam, gdzie operacja domenowa skopiowala dane katalogowe na pola instancyjne elementu,
- `GET /api/analysis-runs/{run_id}/results/trace` zwraca rozszerzony White Box z `catalog_context`,
- `build_run_trace_payload()` zwraca trace z `CanonicalRun`, a frontendowy White Box czyta kontekst katalogowy z `trace.catalog_context`,
- eksporty sladu po stronie frontendu (`JSONL`, `PDF`) przenosza ten sam `catalog_context` bez domyslania danych poza snapshot,
- backendowy overlay SLD czyta tylko wynik `CanonicalRun` i nie modyfikuje geometrii.

API i eksport:
- aktywne trace: `GET /api/analysis-runs/{run_id}/trace`, `GET /api/analysis-runs/{run_id}/trace/summary` oraz `GET /api/analysis-runs/{run_id}/results/trace`,
- aktywne eksporty rozplywu: `GET /api/power-flow-runs/{run_id}/export/json|docx|pdf`,
- ogolne `analysis-runs/.../export/docx|pdf` zwracaja `410 Gone`.

Granice aktualnego stanu:
- backendowe eksporty `power-flow-runs/{run_id}/export/json|docx|pdf` pozostaja osobnym torem raportowym i nie przenosza jeszcze pelnego `catalog_context` z rozszerzonego White Box,
- wynikowe `element_ref` sa czesto identyfikatorami solvera (`bus_id`, `fault_node_id`), a nie zawsze bezposrednio `ref_id` elementu ENM.
