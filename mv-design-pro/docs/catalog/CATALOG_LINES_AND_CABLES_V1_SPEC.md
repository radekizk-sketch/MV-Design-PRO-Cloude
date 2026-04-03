# CATALOG LINES AND CABLES V1 SPEC

Stan na `2026-04-03`.

## Zakres

Ten dokument opisuje dwie grupy krytyczne dla aktywnego toru SN:
- `LINIA_SN`
- `KABEL_SN`

Obie grupy sa juz uzywane w materializacji Snapshot, readiness, analizach i eksporcie.

## Kontrakt danych

W kazdym rekordzie katalogowym musza byc widoczne co najmniej:
- `id`
- `name`
- `verification_status`
- `source_reference`
- `catalog_status`
- `contract_version`

Dla linii i kabli aktywny tor dodatkowo wymaga danych obliczeniowych:
- rezystancja
- reaktancja
- obciazalnosc
- parametry cieplne zwarciowe

## LINIA_SN

Aktualny stan:
- `25` aktywnych rekordow / `26` total
- 2 osie materialowe: `AL`, `AL_ST`
- 10 przekrojow: `16, 25, 35, 50, 70, 95, 120, 150, 185, 240 mm2`
- 3 rodziny modelowe: `AAL`, `AFL 6`, `AFL 2`
- wszystkie rekordy maja `PRODUKCYJNY_V1`
- wszystkie rekordy maja `CZESCIOWO_ZWERYFIKOWANY`

Interpretacja:
- katalog jest szerokim przemyslowym typoszeregiem dla wspieranego zakresu
- nie jest katalogiem producentocentrycznym
- ma byc uzywany jako rodzinny katalog techniczny linii napowietrznych SN

## KABEL_SN

Aktualny stan:
- `50` aktywnych rekordow / `51` total
- 2 materialy zyl: `CU`, `AL`
- 2 izolacje: `XLPE`, `EPR`
- 2 liczby zyl: `1`, `3`
- 7 przekrojow: `70, 120, 150, 185, 240, 300, 400 mm2`
- 2 producenci: `NKT`, `Tele-Fonika Kable`
- wszystkie rekordy maja `PRODUKCYJNY_V1`
- wszystkie rekordy maja `CZESCIOWO_ZWERYFIKOWANY`

Interpretacja:
- katalog jest szerokim przemyslowym typoszeregiem dla wspieranego zakresu SN
- ma pelne pokrycie osi: material, izolacja, przekroj, liczba zyl, producent
- nadaje sie do materializacji, readiness i solver input bez lokalnych fallbackow

## Minimalne osie przemyslowe

### LINIA_SN
- material przewodu
- przekroj
- R/X/B
- obciazalnosc dlugotrwala
- odpornosc cieplna zwarciowa

### KABEL_SN
- material zyly
- izolacja
- liczba zyl
- przekroj
- R/X/C
- obciazalnosc dlugotrwala
- odpornosc cieplna zwarciowa

## Ograniczenia jawne

- brak producentocentrycznego katalogu linii napowietrznych
- katalog kabli jest szeroki, ale nadal oparty o ograniczony zestaw rodzin wspieranych przez produkt
- oba katalogi maja byc oceniane przez `scripts/catalog_metadata_guard.py`

## Wniosek

`LINIA_SN` i `KABEL_SN` sa juz uzywalne produkcyjnie w aktywnym torze.
`KABEL_SN` ma szersza i bardziej zroznicowana baze niz `LINIA_SN`,
ale oba katalogi sa juz poza poziomem punktowym i sa gotowe do pracy inzynierskiej.
