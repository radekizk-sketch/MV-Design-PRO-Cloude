# CATALOG-FIRST SNAPSHOT CONTRACT

## Kontrakt minimalny obiektu krytycznego
- `catalog_namespace`
- `catalog_ref` / `catalog_item_id`
- `materialized_params` (R/X/uk itd. wg klasy)
- `source_mode` (`KATALOG`/`MIGRACJA`/`EKSPERCKI_RĘCZNY`)

## Reguła
Nowe obiekty krytyczne na głównej ścieżce UI muszą powstawać z `source_mode=KATALOG`.

## Audytowalność
Karta obiektu i inspektor muszą pokazywać pochodzenie katalogowe i kompletność danych.
