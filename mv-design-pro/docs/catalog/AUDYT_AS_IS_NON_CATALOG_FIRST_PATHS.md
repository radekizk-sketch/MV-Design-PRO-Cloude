# AUDYT AS-IS — NON-CATALOG-FIRST PATHS

## Macierz pokrycia katalogowego (stan bieżący)
| Klasa | Katalog | API listowania | UI picker | Materializacja do Snapshot | Testy |
|---|---|---|---|---|---|
| Linie SN | TAK | TAK (`LINE`) | TAK | TAK (`assign_catalog_to_element`) | TAK |
| Kable SN | TAK | TAK (`CABLE`) | TAK | TAK | TAK |
| Transformatory SN/nN | TAK | TAK (`TRANSFORMER`) | TAK | TAK | TAK |
| Aparaty SN/nN | CZĘŚCIOWO | TAK (`SWITCH_EQUIPMENT`) | TAK | TAK | CZĘŚCIOWO |
| CT/VT | CZĘŚCIOWO | NIE (w CatalogBrowser) | CZĘŚCIOWO | CZĘŚCIOWO | CZĘŚCIOWO |
| Relay/Zabezpieczenia | CZĘŚCIOWO | NIE (w CatalogBrowser) | CZĘŚCIOWO | CZĘŚCIOWO | CZĘŚCIOWO |
| PV/BESS | CZĘŚCIOWO | NIE (w CatalogBrowser) | TAK (formularze) | TAK | CZĘŚCIOWO |

## Ścieżki non-catalog-first (wykryte)
- Operacje tworzenia elementów krytycznych z opcjonalnym `catalog_ref`.
- Stare payloady dopuszczające brak `catalog_binding`/`catalog_ref`.
- Namespace bez mapowania API listowania w `CatalogBrowser`.

## Klasyfikacja
- **KRYTYCZNE (natychmiast)**: segmenty SN, transformatory, aparaty sekcyjne, PV/BESS.
- **WAŻNE**: CT/VT/relay (pełne listowanie i walidacja zgodności).
- **MIGRACYJNE**: legacy snapshoty bez catalog_ref.
