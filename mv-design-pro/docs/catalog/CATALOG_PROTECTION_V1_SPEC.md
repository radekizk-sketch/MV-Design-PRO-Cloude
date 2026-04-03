# CATALOG_PROTECTION_V1_SPEC

## Zakres
- `ZABEZPIECZENIE`: urządzenia ochronne
- `KRZYWA_ZABEZPIECZENIA`: krzywe czasowo-pradowe
- `SZABLON_NASTAW`: szablony nastaw

## Stan danych
- Urządzenia: 12 rekordów
- Krzywe: 8 rekordów
- Szablony: 8 rekordów

## Status danych
- Urządzenia ochrony: `ANALITYCZNY_V1`
- Krzywe: `REFERENCYJNY_V1`
- Szablony: `REFERENCYJNY_V1`

## Weryfikacja
- ABB: rekordy częściowo zweryfikowane
- Elektrometal e2TANGO: rekordy nieweryfikowane
- Krzywe i szablony: rekordy referencyjne, bez deklaracji pełnej weryfikacji produkcyjnej

## Kontrakt
Każdy rekord ma obowiązkowo:
- `verification_status`
- `source_reference`
- `catalog_status`
- `contract_version`
- `verification_note`

## Rozdział semantyczny
- urządzenie ochrony nie jest krzywą
- krzywa nie jest szablonem
- szablon wskazuje `device_type_ref` i `curve_ref`
- dane analityczne nie są przedstawiane jako produkcyjnie zweryfikowane

## Zasada użycia
- Katalog ochrony służy do doboru, mapowania i prezentacji zakresów.
- Brak pełnej weryfikacji ma być jawnie widoczny w danych i interfejsie.
