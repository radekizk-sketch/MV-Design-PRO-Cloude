# AUDYT TRUE CATALOG-FIRST GAPS

## Klasyfikacja obecna
- FAKE CATALOG-FIRST: ścieżki, gdzie tylko UI wymusza katalog.
- PARTIAL CATALOG-FIRST: backend dopuszcza legacy assign-after-create.
- TRUE CATALOG-FIRST: operacja tworzenia wymaga katalogu i materializacji.

## Główne luki
1. Brak pełnej unifikacji nazw operacji `_from_catalog` w warstwie domenowej.
2. Brak jednolitego kontraktu `source_mode/catalog_namespace` dla wszystkich klas krytycznych.
3. Niepełne pokrycie API listowania katalogowego dla CT/VT/relay/PV/BESS.
4. Readiness nadal obsługuje część blockerów „create-first legacy”.

## Priorytet napraw
- P1: wymuszenie katalogu w domenie + metadata źródła.
- P2: pełne namespace katalogowe i API.
- P3: migracja legacy do source_mode=MIGRACJA + fix actions.
