# CATALOG-FIRST MIGRATION AND CLEANUP

## Strategia migracji legacy
- Wykrywanie elementów bez `catalog_ref`.
- Oznaczanie jako `source_mode=MIGRACJA`.
- FixAction: przypisz katalog / wymień element.

## Cleanup ścieżek
- Usuwanie fallbacków tworzenia pustych elementów dla klas krytycznych.
- Jedna ścieżka produkcyjna: katalog-first + jawne operacje domenowe.
