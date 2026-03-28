# CATALOG-FIRST SNAPSHOT RUNTIME MODEL

## Kontrakt runtime obiektu krytycznego
- `catalog_ref`
- `catalog_namespace`
- `source_mode` (`KATALOG`/`MIGRACJA`/`EKSPERCKI_RĘCZNY`)
- `materialized_params` (docelowo pełne)
- `runtime_inputs` (np. długość, pozycja zaczepu)

## Stan bieżący
- Segmenty i transformatory tworzone catalog-first otrzymują metadata pochodzenia.
- `assign_catalog_to_element` oznacza ścieżkę migracyjną.
