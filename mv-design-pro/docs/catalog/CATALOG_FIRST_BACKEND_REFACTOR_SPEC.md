# CATALOG-FIRST BACKEND REFACTOR SPEC

## Założenie
Operacja tworząca element krytyczny = katalog + dane runtime + materializacja.

## Wdrożone w tej iteracji
- Aliasy operacji catalog-first:
  - `continue_trunk_segment_sn_from_catalog`
  - `add_branch_segment_sn_from_catalog`
  - `add_transformer_sn_nn_from_catalog`
  - `add_switch_from_catalog`
- Tworzone segmenty/transformator otrzymują:
  - `source_mode=KATALOG`
  - `catalog_namespace`
- `assign_catalog_to_element` ustawia domyślnie:
  - `source_mode=MIGRACJA`
  - opcjonalnie `catalog_namespace`

## Następne kroki
- Rozszerzyć analogiczny kontrakt na CT/VT/relay/PV/BESS.
