# Katalog — Wiązanie i Materializacja

## Cel

Dokument opisuje mechanizm wiązania elementów sieci z katalogiem typów
oraz materializację parametrów katalogowych do Snapshot.

## Jak działa wprowadzanie z katalogu

### 1. Otwarcie selektora katalogowego

- Kliknij prawym na element → „Zmień typ z katalogu" (MODAL_ZMIEN_TYP_Z_KATALOGU)
- Otwiera się CatalogPicker z listą dostępnych typów

### 2. Filtrowanie i wybór

- Lista elementów katalogu z filtrem + sortowaniem + wyszukiwarką
- Filtruj wg: producent, napięcie znamionowe, typ przewodu, przekrój
- Po wyborze pozycji: podgląd parametrów (MaterializationContract)

### 3. Podgląd parametrów

- Wyświetlane pola z jednostkami PL:
  - R [Ω/km], X [Ω/km] — impedancja
  - Imax [A] — prąd dopuszczalny
  - Sn [MVA] — moc znamionowa (transformator)
  - uk% — napięcie zwarcia (transformator)
- Read-only — nie edytujesz parametrów katalogowych

### 4. Zatwierdzenie (CatalogBinding)

- Po zatwierdzeniu: frontend wysyła operację `assign_catalog_to_element`
- Payload: `{ element_ref, catalog_ref, materialize: true }`

### 5. Materializacja do Snapshot

- Backend:
  1. Waliduje referencję katalogową
  2. Jeśli `materialize=true`: kopiuje solver_fields z katalogu do elementu
  3. Ustawia `parameter_source="CATALOG"` na elemencie
  4. Zwraca DomainOpResponseV1 z nowym Snapshot

- W Snapshot po materializacji:
  - `catalog_ref` wskazuje na pozycję katalogową
  - Pola solver: R, X, Imax, Sn, uk% — wypełnione z katalogu
  - `parameter_source = "CATALOG"` — oznaczenie źródła danych

### 6. Wyświetlanie w inspektorze

Po wiązaniu katalogowym inspektor pokazuje:
- (a) Powiązanie katalogowe: nazwa typu, producent, numer katalogowy
- (b) Zmaterializowane parametry (read-only): R, X, Imax itd.
- (c) Status źródła: „Katalog" / „Ręczne nadpisanie"

## Overrides (nadpisania)

- Użytkownik może nadpisać parametry katalogowe:
  1. Kliknij „Edytuj parametry" na elemencie
  2. Zmień wartość
  3. `parameter_source` zmienia się na `"OVERRIDE"`
  4. Readiness sprawdza E010: overrides bez OVERRIDE → BLOCKER

## Reguły walidacji

| Kod | Opis | FixAction |
|-----|------|-----------|
| E009 | Brak referencji katalogowej | SELECT_CATALOG → CatalogPicker |
| E010 | Overrides bez parameter_source=OVERRIDE | NAVIGATE_TO_ELEMENT |
| catalog.ref_missing | Generator/aparat bez katalogu | SELECT_CATALOG → CatalogPicker |

## Powiązane dokumenty

- [BRAKI_DANYCH_FIXACTIONS.md](./BRAKI_DANYCH_FIXACTIONS.md) — panel naprawy
- [URUCHOMIENIE_UX_SLD.md](./URUCHOMIENIE_UX_SLD.md) — scenariusz uruchomieniowy
