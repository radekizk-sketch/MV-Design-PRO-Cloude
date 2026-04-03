# AUDYT_KATALOG_FIRST_END_TO_END

Status: wiazacy audyt stanu po aktualnych zmianach.

Aktywny lancuch:
- katalog i kontrakty: `backend/src/network_model/catalog/*`,
- bramka API: `backend/src/api/domain_ops_policy.py`,
- zapis ENM: `backend/src/api/enm.py` + `backend/src/enm/domain_operations*.py`,
- gotowosc: `backend/src/enm/validator.py` + `backend/src/enm/fix_actions.py`,
- solver: `backend/src/enm/mapping.py` + `backend/src/enm/canonical_analysis.py`,
- wynik i trace: `backend/src/api/analysis_runs.py`, `backend/src/api/power_flow_runs.py`, `backend/src/api/canonical_run_views.py`,
- overlay wynikowy: `backend/src/api/sld.py`.

Co jest domkniete:
- kanoniczny zapis ENM przez `domain-ops`,
- utrwalanie `materialized_params` dla glownych odcinkow SN, transformatorow, zrodel GPZ oraz PV/BESS,
- bramka katalog-first obejmuje rowniez `add_grid_source_sn`,
- gotowosc i fix actions zwracane po operacji,
- proba usuniecia katalogu z elementu technicznego jest odrzucana przez `catalog.clear_forbidden`,
- rozszerzony White Box i frontendowe eksporty sladu (`JSONL`, `PDF`) pokazuja jawna proweniencje katalogowa ze snapshot,
- canonical-only dla aktywnych odczytow wynikow i eksportow rozplywu.

Co pozostaje rozjazdem:
- `insert_section_switch_sn` nie utrwala materializacji tak samo jak odcinki i transformatory,
- solver czyta pola instancyjne, nie koperty `materialized_params`,
- `branch_points`, `CT`, `VT` i `relay` nie maja tak samo domknietej sciezki materializacji,
- backendowe raporty `power-flow-runs/{run_id}/export/json|docx|pdf` nie przenosza jeszcze pelnego `catalog_context` z rozszerzonego White Box,
- wynikowe identyfikatory solvera nie sa wszedzie rowne `ref_id` elementu ENM,
- aktywne typy FE i czesc scenariuszy `frontend/e2e` nadal trzymaja aliasy kontraktowe `catalog_ref`, `transformer_catalog_ref` i `from_bus_ref`; nowy guard repo hygiene wykrywa je jako otwarty dlug migracyjny.

Obejscia nadal aktywne:
- `backend/src/api/catalog.py` nadal wystawia mutujace endpointy `type-ref` i `equipment-type`,
- `backend/src/application/network_wizard/service.py` pozostaje backendem dla tych mutacji,
- po stronie FE i E2E pozostaja payloady zgodnosciowe starego kontraktu, mimo ze jedyny aktywny backendowy zapis idzie przez `domain-ops`.
