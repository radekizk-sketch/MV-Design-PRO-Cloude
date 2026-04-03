# SPEC_MODEL_SYSTEMOWY_SN

Status: wiazacy dla aktywnego modelu ENM.

Kod:
- `backend/src/enm/models.py`
- `backend/src/enm/domain_operations.py`
- `backend/src/enm/domain_operations_v2.py`
- `backend/src/api/enm.py`

Jedyna aktywna migawka zapisu:
- backend zapisuje i mutuje `EnergyNetworkModel`,
- kolekcje aktywne: `buses`, `branches`, `transformers`, `sources`, `loads`, `generators`, `substations`, `bays`, `junctions`, `corridors`, `measurements`, `protection_assignments`, `branch_points`.

Tozsamosc i dane techniczne:
- elementy sa identyfikowane przez `ref_id`,
- element techniczny moze przechowywac `catalog_ref`, `catalog_namespace`, `source_mode`, `parameter_source`, `materialized_params`,
- dla galezi i transformatorow pola solverowe sa trzymane rownolegle na instancji elementu.

Dane pochodne odpowiedzi:
- odpowiedz `domain-ops` zwraca `snapshot`,
- ta sama odpowiedz zwraca tez dane pochodne poza snapshotem: `readiness`, `fix_actions`, `selection_hint`, `materialized_params`, `layout`, `logical_views`, `audit_trail`, `domain_events`.

Rzeczywiste projekcje:
- SLD live w frontendzie jest budowany z `snapshot`,
- solver dostaje graf zbudowany z `snapshot` przez `backend/src/enm/mapping.py`,
- overlay wynikowy backendu jest nakladany osobno na istniejacy diagram SLD.

Poza aktywnym torem:
- `backend/src/network_model/core/snapshot.py` nie jest kanoniczna sciezka zapisu po PR #428,
- `backend/src/api/domain_operations.py` nie jest montowany w `backend/src/api/main.py`.
