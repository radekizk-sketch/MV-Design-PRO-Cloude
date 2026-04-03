# CATALOG_SWITCHGEAR_V1_SPEC

## Zakres

Ten katalog opisuje aparature laczeniowa SN/NN uzywana w aktywnym torze produktu:
`CIRCUIT_BREAKER`, `LOAD_SWITCH`, `DISCONNECTOR`, `RECLOSER`, `FUSE`, `EARTH_SWITCH`.

## Zasady danych

Kazdy rekord musi miec jawnie:
- `verification_status`
- `catalog_status`
- `source_reference`
- `contract_version`

Statusy dopuszczone w tym katalogu:
- `verification_status`: `ZWERYFIKOWANY`, `CZESCIOWO_ZWERYFIKOWANY`
- `catalog_status`: `PRODUKCYJNY_V1`, `REFERENCYJNY_V1`

Rekordy produkcyjne nie moga byc nieweryfikowane. Rekordy referencyjne zostaja jawnie oznaczone i nie udaja produkcyjnego katalogu.

## Skala przemyslowa

Stan katalogu w repo:
- `36` rekordow lacznie
- `12` wylacznikow
- `7` rozlacznikow
- `4` odlaczniki
- `4` reklozery
- `7` bezpiecznikow
- `2` uziemniki
- `7` producentow
- `4` poziomy napieciowe: `12.0`, `15.0`, `17.5`, `24.0` kV

Rozklad statusow:
- `33` rekordy `ZWERYFIKOWANY`
- `3` rekordy `CZESCIOWO_ZWERYFIKOWANY`
- `33` rekordy `PRODUKCYJNY_V1`
- `3` rekordy `REFERENCYJNY_V1`

## Producenci i zrodla

Obecne zrodla obejmuja:
- `ABB VD4 katalog 1VCP000015`
- `Siemens 3AH5 karta katalogowa`
- `Eaton W-VACi katalog ETN008001EN`
- `ABB NAL katalog 1VCL100001`
- `Schneider katalog LVPED304049`
- `ABB OJS karta katalogowa`
- `ABB product guide 1MRS756379`
- `NOJA Power OSP katalog DP-0035`
- `Schneider ADVC U20 karta katalogowa`
- `ETI VV topikowy katalog`
- `PN-EN 62271-100:2021 / PN-EN 62271-102:2018`

## Materializacja

Wszystkie rekordy przechodza przez ten sam kontrakt materializacji co pozostale katalogi:
- dane znamionowe `un_kv`, `in_a`, `ik_ka`, `icw_ka`
- `manufacturer`
- metadane jakosci i zrodla

## Uzasadnienie zakresu

Katalog jest szerokim, przemyslowo wiarygodnym zbiorem dla wspieranego zakresu produktu. Rekordy referencyjne sa zachowane osobno i jawnie, zamiast byc maskowane jako produkcyjne.

