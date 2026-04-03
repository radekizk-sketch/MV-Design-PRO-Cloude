# CATALOG SOURCES AND CONVERTERS V1

Stan na `2026-04-03`.

## Zakres

Dokument opisuje katalogi:
- `ZRODLO_SN`
- `CONVERTER`
- `FALOWNIK_PV`
- `FALOWNIK_BESS`

## ZRODLO_SN

- 22 rekordy
- 2 napiecia: 15 kV, 20 kV
- 11 poziomow Sk3
- status wszystkich rekordow: `CZESCIOWO_ZWERYFIKOWANY`
- status katalogowy wszystkich rekordow: `PRODUKCYJNY_V1`
- zrodlo: warunki przylaczenia / standard OSD / matryca katalogowa MV-DESIGN-PRO

## CONVERTER

- 23 rekordy
- podzial: PV, WIND, BESS
- status wszystkich rekordow: `REFERENCYJNY`
- status katalogowy wszystkich rekordow: `REFERENCYJNY_V1`
- zrodlo: katalog referencyjny MV-DESIGN-PRO / profil przemyslowy V1

## Inwarianty

- kazdy rekord zawiera jawne: `verification_status`, `source_reference`, `catalog_status`, `contract_version`
- `PV` i `BESS` sa wyprowadzane z katalogu `CONVERTER`, ale zachowuja status i zrodlo
- dane nie udaja pelnej weryfikacji rynku; status referencyjny jest jawny
