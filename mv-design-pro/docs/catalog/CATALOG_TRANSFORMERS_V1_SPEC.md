# CATALOG_TRANSFORMERS_V1_SPEC

Zakres: katalog transformatorow SN/nN i WN/SN dla wspieranego zakresu MV-DESIGN-PRO.

## Status katalogu

- `catalog_status`: `PRODUKCYJNY_V1`
- `verification_status`: `ZWERYFIKOWANY`
- `contract_version`: `2.0`
- `source_reference`: jawne dla kazdego rekordu

## Zakres przemyslowy

Katalog obejmuje 34 rekordy:

- 10 rekordow WN/SN 110/15 kV i 110/20 kV
- 24 rekordy SN/nN 15/0.4 kV i 20/0.4 kV
- 3 jawnych producentow w statystykach katalogu

## Typoszereg wspierany

### WN/SN

- moce: 10, 16, 25, 40, 63 MVA
- grupa polaczen: `Yd11`
- chlodzenie: `ONAN`, `ONAN/ONAF`, `ONAF`

### SN/nN 15/0.4 kV

- moce: 63, 100, 160, 250, 400, 630, 1000, 1250, 1600, 2000, 2500 kVA
- grupy polaczen: `Dyn11`, `Yd11`

### SN/nN 20/0.4 kV

- moce: 63, 100, 160, 250, 400, 630, 1000, 1250, 1600 kVA
- grupy polaczen: `Dyn11`, `Yd11`

## Metadane jakosci

Kazdy rekord niesie:

- `verification_status`
- `catalog_status`
- `source_reference`
- `contract_version`

Wszystkie rekordy w tym katalogu sa obecnie jawnie zweryfikowane i oznaczone jako produkcyjne.

## Odczyt programistyczny

Do konsumpcji katalogu sluzy:

- `get_all_transformer_types()`
- `get_wn_sn_transformer_types()`
- `get_sn_nn_transformer_types()`
- `get_transformer_catalog_statistics()`
- `get_transformer_catalog_quality_summary()`

## Rozliczenie skali

Katalog jest szerokim przemyslowym typoszeregiem dla wspieranego zakresu produktu.
Nie udaje pelnego rynku transformatorow dla wszystkich mozliwych wariantow, ale pokrywa praktyczny zakres projektowy MV-DESIGN-PRO.
