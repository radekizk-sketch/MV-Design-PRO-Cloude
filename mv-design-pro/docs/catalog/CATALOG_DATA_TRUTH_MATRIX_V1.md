# CATALOG DATA TRUTH MATRIX V1

Stan na `2026-04-03` — po domknieciu globalnym (PR catalog-industrial-series-clean-pr).

## Zasada oceny

- `verified` - rekord jawnie oznaczony jako `ZWERYFIKOWANY`.
- `unverified` - rekord jawnie oznaczony jako `NIEWERYFIKOWANY`.
- `explicit metadata` - rekord serializuje `verification_status`, `source_reference`, `catalog_status`, `contract_version`.
- `industrial level` - poziom skali dla wspieranego zakresu produktu, nie obietnica pelnej kompletnosci rynku.

## Aktualna tabela prawdy (po domknieciu)

| Grupa | Zrodlo danych | Model | Rekordy | Statusy jakosci | Poziom skali | Status |
|---|---|---|---:|---|---|---|
| `LINIA_SN` | `mv_cable_line_catalog.py` | `LineType` | 26 | `CZESCIOWO_ZWERYFIKOWANY:26`, `PRODUKCYJNY_V1:26` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `KABEL_SN` | `mv_cable_line_catalog.py` | `CableType` | 51 | `CZESCIOWO_ZWERYFIKOWANY:51`, `PRODUKCYJNY_V1:51` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `TRAFO_SN_NN` | `mv_transformer_catalog.py` | `TransformerType` | 34 | `ZWERYFIKOWANY:34`, `PRODUKCYJNY_V1:34` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `APARAT_SN` | `mv_switch_catalog.py` | `SwitchEquipmentType` | 36 | `ZWERYFIKOWANY:33`, `CZESCIOWO_ZWERYFIKOWANY:3`, `PRODUKCYJNY_V1:33`, `REFERENCYJNY_V1:3` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `ZRODLO_SN` | `mv_source_catalog.py` | `SourceSystemType` | 22 | `CZESCIOWO_ZWERYFIKOWANY:22`, `PRODUKCYJNY_V1:22` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `CONVERTER` | `mv_converter_catalog.py` | `ConverterType` | 23 | `REFERENCYJNY:23`, `REFERENCYJNY_V1:23` | `KATALOG_REFERENCYJNY` | ZAMKNIETY |
| `FALOWNIK_PV` | `repository.py` + `mv_converter_catalog.py` | `PVInverterType` | 12 | `REFERENCYJNY:12`, `REFERENCYJNY_V1:12` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `FALOWNIK_BESS` | `repository.py` + `mv_converter_catalog.py` | `BESSInverterType` | 8 | `REFERENCYJNY:8`, `REFERENCYJNY_V1:8` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `ZABEZPIECZENIE` | `mv_auxiliary_catalog.py` + `devices_v0.json` | `ProtectionDeviceType` | 12 | `CZESCIOWO_ZWERYFIKOWANY:12`, `ANALITYCZNY_V1:12` | `KATALOG_ANALITYCZNY` | ZAMKNIETY |
| `KRZYWA_ZABEZPIECZENIA` | `mv_auxiliary_catalog.py` | `ProtectionCurve` | 8 | `REFERENCYJNY:8`, `REFERENCYJNY_V1:8` | `KATALOG_ANALITYCZNY` | ZAMKNIETY |
| `SZABLON_NASTAW` | `mv_auxiliary_catalog.py` | `ProtectionSettingTemplate` | 8 | `REFERENCYJNY:8`, `REFERENCYJNY_V1:8` | `KATALOG_ANALITYCZNY` | ZAMKNIETY |
| `CT` | `mv_auxiliary_catalog.py` | `CTType` | 12 | `REFERENCYJNY:12`, `REFERENCYJNY_V1:12` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `VT` | `mv_auxiliary_catalog.py` | `VTType` | 9 | `REFERENCYJNY:9`, `REFERENCYJNY_V1:9` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `KABEL_NN` | `mv_auxiliary_catalog.py` | `LVCableType` | 17 | `ZWERYFIKOWANY:17`, `REFERENCYJNY_V1:17` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `APARAT_NN` | `mv_auxiliary_catalog.py` | `LVApparatusType` | 14 | `ZWERYFIKOWANY:14`, `PRODUKCYJNY_V1:14` | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` | ZAMKNIETY |
| `OBCIAZENIE` | `mv_auxiliary_catalog.py` | `LoadType` | 3 | `REFERENCYJNY:3`, `REFERENCYJNY_V1:3` | `KATALOG_REFERENCYJNY` | ZAMKNIETY |

**TOTAL: 331 rekordow katalogowych**

## Straz jakosci

Niezmienne ograniczenia katalogowe weryfikowane przez `catalog_metadata_guard.py` i testy CI:

1. Kazdy rekord musi miec jawne: `verification_status`, `source_reference`, `catalog_status`, `contract_version`
2. `PRODUKCYJNY_V1` + `NIEWERYFIKOWANY` = zabronione (naruszenie konwencji jakosci)
3. `ANALITYCZNY_V1` tylko dla grup: `ZABEZPIECZENIE`, `KRZYWA_ZABEZPIECZENIA`, `SZABLON_NASTAW`
4. `contract_version` zawsze rowna `CATALOG_CONTRACT_VERSION = "2.0"` (zamorzone)

## Wniosek

Wszystkie grupy katalogowe zostaly zamkniete:
- Jawne metadane we wszystkich 331 rekordach
- Brak naruszen PRODUKCYJNY_V1 + NIEWERYFIKOWANY
- Pelne typoszeregi przemyslowe dla: LINIA_SN, KABEL_SN, TRAFO_SN_NN, APARAT_SN, ZRODLO_SN, CT, VT, KABEL_NN, APARAT_NN
- Katalogi referencyjne/analityczne dla: CONVERTER, FALOWNIK_PV, FALOWNIK_BESS, ZABEZPIECZENIE, KRZYWA, SZABLON
