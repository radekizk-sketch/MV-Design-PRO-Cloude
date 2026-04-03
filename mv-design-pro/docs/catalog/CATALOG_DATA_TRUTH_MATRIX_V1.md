# CATALOG DATA TRUTH MATRIX V1

Stan na `2026-04-03`.

## Zasada oceny

- `verified`: tylko rekordy jawnie oznaczone jako zweryfikowane.
- `unverified`: tylko rekordy jawnie oznaczone jako nieweryfikowane.
- `braki pól technicznych`: brak minimalnych pól wymaganych przez aktywny model danej grupy.
- `wystarczające dla V1`: ocena uczciwego V1, nie tylko istnienia modelu i endpointu.

## Tabela prawdy

| Grupa | Ścieżka danych | Model | Rekordy | Producenci | `verified` | `unverified` | Braki pól technicznych | Gotowość | Analizy | Wystarczające dla V1 | Decyzja |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| `LINIA_SN` | `backend/src/network_model/catalog/mv_cable_line_catalog.py` | `LineType` | 15 | 0 | 0 | 0 | 0 | TAK | TAK | TAK | `KEEP` |
| `KABEL_SN` | `backend/src/network_model/catalog/mv_cable_line_catalog.py` | `CableType` | 51 | 2 | 0 | 0 | 0 | TAK | TAK | TAK | `KEEP` |
| `TRAFO_SN_NN` | `backend/src/network_model/catalog/mv_transformer_catalog.py` | `TransformerType` | 22 | 2 | 0 | 0 | 0 | TAK | TAK | TAK | `KEEP` |
| `APARAT_SN` | `backend/src/network_model/catalog/mv_switch_catalog.py` | `SwitchEquipmentType` + pochodny `MVApparatusType` | 22 | 6 | 0 | 0 | 0 | NIE | CZĘŚCIOWO | NIE | `SPLIT` |
| `PRZEKSZTALTNIK` | `backend/src/network_model/catalog/mv_converter_catalog.py` | `ConverterType` | 11 | 2 | 0 | 0 | 0 | NIE | CZĘŚCIOWO | NIE | `MARK_AS_REFERENCE` |
| `FALOWNIK_PV` | pochodne z `mv_converter_catalog.py` przez `repository.py` | `PVInverterType` | 4 | 0 | 0 | 0 | 0 | CZĘŚCIOWO | CZĘŚCIOWO | NIE | `EXPAND` |
| `FALOWNIK_BESS` | pochodne z `mv_converter_catalog.py` przez `repository.py` | `BESSInverterType` | 4 | 0 | 0 | 0 | 0 | CZĘŚCIOWO | CZĘŚCIOWO | NIE | `EXPAND` |
| `ZRODLO_SN` | `backend/src/network_model/catalog/mv_source_catalog.py` | `SourceSystemType` | 14 | 1 | 0 | 0 | 0 | CZĘŚCIOWO | TAK | CZĘŚCIOWO | `EXPAND` |
| `ZABEZPIECZENIE` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` + `backend/src/application/analyses/protection/catalog/data/devices_v0.json` | `ProtectionDeviceType` | 9 | 2 | 0 | 7 w katalogu analitycznym | 0 w modelu obecnym | NIE | CZĘŚCIOWO | NIE | `SPLIT` + `VERIFY` |
| `KRZYWA_ZABEZPIECZENIA` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `ProtectionCurve` | 2 | 0 | 0 | 0 | 0 | NIE | CZĘŚCIOWO | NIE | `EXPAND` |
| `SZABLON_NASTAW` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `ProtectionSettingTemplate` | 2 | 0 | 0 | 0 | 0 | NIE | CZĘŚCIOWO | NIE | `EXPAND` |
| `CT` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `CTType` | 3 | 2 | 0 | 0 | 0 | NIE | NIE | NIE | `VERIFY` |
| `VT` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `VTType` | 2 | 1 | 0 | 0 | 0 | NIE | NIE | NIE | `VERIFY` |
| `KABEL_NN` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `LVCableType` | 3 | 2 | 0 | 0 | 0 | NIE | NIE | NIE | `MARK_AS_REFERENCE` |
| `APARAT_NN` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `LVApparatusType` | 3 | 2 | 0 | 0 | 0 | NIE | NIE | NIE | `MARK_AS_REFERENCE` |
| `OBCIAZENIE` | `backend/src/network_model/catalog/mv_auxiliary_catalog.py` | `LoadType` | 3 | 1 | 0 | 0 | 0 | NIE | CZĘŚCIOWO | NIE | `MARK_AS_REFERENCE` |

## Priorytety tego etapu

### Priorytet 1

- `ZABEZPIECZENIE`: 9 rekordów, ale 7 rekordów analitycznych ma jawne `meta.unverified=true`.
- `KRZYWA_ZABEZPIECZENIA`: tylko 2 rekordy.
- `SZABLON_NASTAW`: tylko 2 rekordy.
- Wymagane: rozdział urządzeń, krzywych i szablonów oraz jednolite metadane weryfikacji i źródeł.

### Priorytet 2

- `CT`: tylko 3 rekordy, brak metadanych weryfikacji i źródeł.
- `VT`: tylko 2 rekordy, brak metadanych weryfikacji i źródeł.

### Priorytet 3

- `FALOWNIK_PV`: 4 rekordy pochodne, bez producenta i bez własnych metadanych katalogowych.
- `FALOWNIK_BESS`: 4 rekordy pochodne, bez producenta i bez własnych metadanych katalogowych.

### Priorytet 4

- `APARAT_SN`: realny rozszczep `SwitchEquipmentType` / `MVApparatusType`.
- `PRZEKSZTALTNIK`: grupa referencyjna, dziś źródło pochodne dla PV/BESS.
- `ZRODLO_SN`: funkcjonalnie blisko V1, ale bez pełnej warstwy statusów i weryfikacji rekordów.

## Najważniejsze braki

1. Prawie żadna grupa nie ma jawnych pól:
   - `verification_status`
   - `source_reference`
   - `catalog_status`
   - `contract_version`

2. Katalog ochrony jest rozdwojony:
   - katalog analityczny capability w `devices_v0.json`
   - katalog systemowy w `mv_auxiliary_catalog.py`

3. `FALOWNIK_PV` i `FALOWNIK_BESS` nie mają własnego źródła danych katalogowych; są derywowane z ogólnego `CONVERTER`.

4. `CT` i `VT` mają poprawne minimum techniczne modelu, ale nie mają jeszcze uczciwego V1 danych katalogowych.

## Minimalne V1 per grupa

- `ZABEZPIECZENIE`: co najmniej 2-3 producentów, jawny status każdego rekordu, komplet capability podstawowych funkcji i jawne źródło danych.
- `KRZYWA_ZABEZPIECZENIA`: co najmniej podstawowy zestaw krzywych wspieranych przez aktywny silnik.
- `SZABLON_NASTAW`: kilka szablonów referencyjnych z powiązaniem do urządzeń i krzywych.
- `CT`: kilka typowych przekładni SN i co najmniej 2 producentów z metadanymi źródła i weryfikacji.
- `VT`: minimalny sensowny zestaw napięciowy SN z metadanymi źródła i weryfikacji.
- `FALOWNIK_PV`: odseparowane rekordy katalogowe, bez derywacji udającej katalog produkcyjny.
- `FALOWNIK_BESS`: odseparowane rekordy katalogowe, bez derywacji udającej katalog produkcyjny.
