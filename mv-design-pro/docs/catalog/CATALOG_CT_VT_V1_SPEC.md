# CATALOG_CT_VT_V1_SPEC

## Zakres
- `CT`: przekładniki prądowe
- `VT`: przekładniki napięciowe

## Stan danych
- CT: 12 rekordów
- VT: 8 rekordów

## Status danych
- CT: `REFERENCYJNY_V1`
- VT: `REFERENCYJNY_V1`

## Weryfikacja
- Rekordy są referencyjne, nie produkcyjnie zweryfikowane
- Każdy rekord ma jawny:
  - `verification_status`
  - `source_reference`
  - `catalog_status`
  - `contract_version`
  - `verification_note`

## Charakter danych
- Katalog służy do doboru i modelowania w aktywnym torze produktu.
- Dane mają szeroki typoszereg referencyjny, ale nie udają pełnej bazy producenta.
- Każdy rekord ma jawny zakres przekładni, klasy dokładności i burden.

## Zasada użycia
- CT/VT są widoczne w katalogu jako wspierany zakres referencyjny.
- Jeśli rekord wymaga potwierdzenia u producenta, ma to być widoczne w `verification_note`.
