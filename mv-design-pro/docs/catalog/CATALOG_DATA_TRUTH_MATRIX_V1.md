# CATALOG DATA TRUTH MATRIX V1

Stan na `2026-04-03`.

## Zasada oceny

- `verified` - rekord jawnie oznaczony jako `ZWERYFIKOWANY`.
- `unverified` - rekord jawnie oznaczony jako `NIEWERYFIKOWANY`.
- `explicit metadata` - rekord serializuje `verification_status`, `source_reference`, `catalog_status`, `contract_version`.
- `industrial level` - poziom skali dla wspieranego zakresu produktu, nie obietnica pełnej kompletności rynku.

## Aktualna tabela prawdy

| Grupa | Zrodlo danych | Model | Rekordy | Producenci / vendorzy | Statusy jakosci | Poziom skali | Decyzja |
|---|---|---|---:|---:|---|---|---|
| `LINIA_SN` | `mv_cable_line_catalog.py` | `LineType` | `25 aktywnych / 26 total` | 0 | `CZESCIOWO_ZWERYFIKOWANY:25`, `TESTOWY:1`, `PRODUKCYJNY_V1:25` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `KEEP + META` |
| `KABEL_SN` | `mv_cable_line_catalog.py` | `CableType` | `50 aktywnych / 51 total` | 2 | `CZESCIOWO_ZWERYFIKOWANY:50`, `TESTOWY:1`, `PRODUKCYJNY_V1:50` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `KEEP + META` |
| `TRAFO_SN_NN` | `mv_transformer_catalog.py` | `TransformerType` | 34 | 3 | `ZWERYFIKOWANY:34`, `PRODUKCYJNY_V1:34` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `KEEP + META` |
| `APARAT_SN` | `mv_switch_catalog.py` | `SwitchEquipmentType` | 36 | 7 | `ZWERYFIKOWANY:33`, `CZESCIOWO_ZWERYFIKOWANY:3`, `PRODUKCYJNY_V1:33`, `REFERENCYJNY_V1:3` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `KEEP + META` |
| `ZRODLO_SN` | `mv_source_catalog.py` | `SourceSystemType` | 22 | 1 | `CZESCIOWO_ZWERYFIKOWANY:22`, `PRODUKCYJNY_V1:22` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `KEEP + META` |
| `CONVERTER` | `mv_converter_catalog.py` | `ConverterType` | 23 | 5 | `REFERENCYJNY:23`, `REFERENCYJNY_V1:23` | `KATALOG_REFERENCYJNY` | `MARK_AS_REFERENCE` |
| `FALOWNIK_PV` | `repository.py` + `mv_converter_catalog.py` | `PVInverterType` | 12 | 5 | `REFERENCYJNY:12`, `REFERENCYJNY_V1:12` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `EXPAND_DEDYKOWANY` |
| `FALOWNIK_BESS` | `repository.py` + `mv_converter_catalog.py` | `BESSInverterType` | 8 | 5 | `REFERENCYJNY:8`, `REFERENCYJNY_V1:8` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | `EXPAND_DEDYKOWANY` |
| `ZABEZPIECZENIE` | `mv_auxiliary_catalog.py` + `devices_v0.json` | `ProtectionDeviceType` | 9 | 2 | `REFERENCYJNY:9`, `ANALITYCZNY_V1:9` | `KATALOG_ANALITYCZNY` | `EXPAND + UNIFY + META` |
| `KRZYWA_ZABEZPIECZENIA` | `mv_auxiliary_catalog.py` | `ProtectionCurve` | 2 | 0 | `REFERENCYJNY:2`, `ANALITYCZNY_V1:2` | `KATALOG_ANALITYCZNY` | `EXPAND` |
| `SZABLON_NASTAW` | `mv_auxiliary_catalog.py` | `ProtectionSettingTemplate` | 2 | 0 | `REFERENCYJNY:2`, `ANALITYCZNY_V1:2` | `KATALOG_ANALITYCZNY` | `EXPAND` |
| `CT` | `mv_auxiliary_catalog.py` | `CTType` | 3 | 2 | `REFERENCYJNY:3`, `REFERENCYJNY_V1:3` | `KATALOG_REFERENCYJNY` | `EXPAND_SZEROKI` |
| `VT` | `mv_auxiliary_catalog.py` | `VTType` | 2 | 1 | `REFERENCYJNY:2`, `REFERENCYJNY_V1:2` | `KATALOG_REFERENCYJNY` | `EXPAND_SZEROKI` |
| `KABEL_NN` | `mv_auxiliary_catalog.py` | `LVCableType` | 17 | 2 | `REFERENCYJNY:17`, `REFERENCYJNY_V1:17` | `KATALOG_REFERENCYJNY` | `EXPAND` |
| `APARAT_NN` | `mv_auxiliary_catalog.py` | `LVApparatusType` | 3 | 2 | `REFERENCYJNY:3`, `REFERENCYJNY_V1:3` | `KATALOG_REFERENCYJNY` | `EXPAND` |
| `OBCIAZENIE` | `mv_auxiliary_catalog.py` | `LoadType` | 3 | 1 | `REFERENCYJNY:3`, `REFERENCYJNY_V1:3` | `KATALOG_REFERENCYJNY` | `KEEP` |

## Plan domkniecia

### 1. Metadane jakosci
W kazdym rekordzie wymagane sa:
- `verification_status`
- `source_reference`
- `catalog_status`
- `contract_version`

### 2. Grupy przemyslowe o szerokiej skali
- `LINIA_SN`
- `KABEL_SN`
- `TRAFO_SN_NN`
- `APARAT_SN`
- `ZRODLO_SN`

### 3. Grupy produkcyjne ograniczone
- `KABEL_NN`
- `APARAT_NN`
- `OBCIAZENIE`

### 4. Grupy referencyjne / analityczne
- `CONVERTER`
- `FALOWNIK_PV` - szeroki katalog referencyjny
- `FALOWNIK_BESS` - szeroki katalog referencyjny
- `CT`
- `VT`
- `ZABEZPIECZENIE`
- `KRZYWA_ZABEZPIECZENIA`
- `SZABLON_NASTAW`

## Wniosek

Repo zawiera juz uczciwe, jawnie oznaczone katalogi dla wszystkich wspieranych grup.
Nie wszystkie grupy maja pelny przemyslowy typoszereg, ale zadna z nich nie jest juz
ukryta w stanie poltechnicznym.
