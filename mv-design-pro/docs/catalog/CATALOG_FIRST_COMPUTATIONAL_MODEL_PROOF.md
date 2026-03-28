# CATALOG-FIRST COMPUTATIONAL MODEL PROOF

## Teza
Model utworzony catalog-first musi być bezpośrednio gotowy do analiz (bez ręcznych poprawek create-first).

## Dowód bieżący
- operacje tworzenia krytycznych elementów mają aktywne bramki katalogowe.
- backend zapisuje pochodzenie katalogowe (`source_mode`, `catalog_namespace`) dla segmentów i transformatorów.

## Braki do pełnego dowodu
- pełne materialized_params per klasa krytyczna dla wszystkich namespace.
- dedykowane E2E 1..5 z asercją Snapshot -> analiza -> wyniki.
