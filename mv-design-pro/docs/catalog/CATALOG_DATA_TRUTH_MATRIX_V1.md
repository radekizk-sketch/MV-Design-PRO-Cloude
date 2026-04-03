# CATALOG DATA TRUTH MATRIX V1

Stan na `2026-04-03`. Wersja po commicie recon-freeze-and-industrial-matrix.

## Zasada oceny

- `verified`: tylko rekordy jawnie oznaczone jako ZWERYFIKOWANY.
- `unverified`: tylko rekordy jawnie oznaczone jako NIEWERYFIKOWANY.
- `Braki pól technicznych`: brak minimalnych pól wymaganych przez aktywny model danej grupy.
- `Wystarczające dla V1`: ocena uczciwego V1, nie tylko istnienia modelu i endpointu.

## Aktualna tabela prawdy

| Grupa | Ścieżka danych | Model | Rekordy | Producenci | Explicit metadata | Skala domenowa | Gotowość | Decyzja |
|---|---|---|---:|---:|---|---|---|---|
| `LINIA_SN` | `mv_cable_line_catalog.py` | `LineType` | 15 | 0 | domyślne (types.py) | ŚREDNIA | CZĘŚCIOWO | `EXPAND + META` |
| `KABEL_SN` | `mv_cable_line_catalog.py` | `CableType` | 51 | 2 | domyślne (types.py) | WYSOKA | TAK* | `META` |
| `TRAFO_SN_NN` | `mv_transformer_catalog.py` | `TransformerType` | 22 | 2 | domyślne (types.py) | WYSOKA | TAK* | `META` |
| `APARAT_SN` | `mv_switch_catalog.py` | `SwitchEquipmentType` | 22 | 6 | domyślne (types.py) | ŚREDNIA | CZĘŚCIOWO | `EXPAND + META` |
| `ZRODLO_SN` | `mv_source_catalog.py` | `SourceSystemType` | 14 | 1 | domyślne (types.py) | ŚREDNIA | CZĘŚCIOWO | `META + EXPAND` |
| `CONVERTER` | `mv_converter_catalog.py` | `ConverterType` | 11 | 2 | domyślne (types.py) | NISKA | NIE | `MARK_AS_REFERENCE` |
| `FALOWNIK_PV` | pochodne z CONVERTER przez repository.py | `PVInverterType` | 4 | 0 | brak | NISKA | NIE | `EXPAND_DEDYKOWANY` |
| `FALOWNIK_BESS` | pochodne z CONVERTER przez repository.py | `BESSInverterType` | 4 | 0 | brak | NISKA | NIE | `EXPAND_DEDYKOWANY` |
| `ZABEZPIECZENIE` | `mv_auxiliary_catalog.py` + `devices_v0.json` | `ProtectionDeviceType` | 9 | 2 | brak explicit | NISKA | NIE | `EXPAND + UNIFY + META` |
| `KRZYWA_ZABEZPIECZENIA` | `mv_auxiliary_catalog.py` | `ProtectionCurve` | 2 | 0 | brak explicit | SZCZĄTKOWA | NIE | `EXPAND` |
| `SZABLON_NASTAW` | `mv_auxiliary_catalog.py` | `ProtectionSettingTemplate` | 2 | 0 | brak explicit | SZCZĄTKOWA | NIE | `EXPAND` |
| `CT` | `mv_auxiliary_catalog.py` | `CTType` | 3 | 2 | brak explicit | SZCZĄTKOWA | NIE | `EXPAND_SZEROKI` |
| `VT` | `mv_auxiliary_catalog.py` | `VTType` | 2 | 1 | brak explicit | SZCZĄTKOWA | NIE | `EXPAND_SZEROKI` |
| `KABEL_NN` | `mv_auxiliary_catalog.py` | `LVCableType` | 3 | 2 | brak explicit | SZCZĄTKOWA | NIE | `EXPAND` |
| `APARAT_NN` | `mv_auxiliary_catalog.py` | `LVApparatusType` | 3 | 2 | brak explicit | SZCZĄTKOWA | NIE | `EXPAND` |
| `OBCIAZENIE` | `mv_auxiliary_catalog.py` | `LoadType` | 3 | 1 | brak explicit | SZCZĄTKOWA | NIE | `MARK_AS_REFERENCE` |

(*) po uzupełnieniu explicit metadanych weryfikacji i źródeł.

## Plan domknięcia — priorytety globalne

### Priorytet 1 — Metadane jawne
Wszystkie rekordy mają mieć **explicit** `verification_status`, `catalog_status`, `source_reference`
w samych słownikach danych, nie tylko jako default w `from_dict`.
- Dotyczy: LINIA_SN, KABEL_SN, TRAFO_SN_NN, APARAT_SN, ZRODLO_SN, CONVERTER i wszystkich pomocniczych.

### Priorytet 2 — CT i VT
- CT: 3 → 30+ rekordów. Szerokie przekładnie (50/5 do 3000/5), klasy pomiarowe i zabezpieczeniowe, role.
- VT: 2 → 15+ rekordów. 15 kV, 20 kV, warianty burden, wykonania.

### Priorytet 3 — LINIA_SN
- 15 → 25+ rekordów. Rodziny: AFL 6, AFL 2, AAL, ACSR/AFL, ASS. Pełne przekroje 16-240 mm².

### Priorytet 4 — KABEL_NN
- 3 → 15+ rekordów. YAKY (Al-4C-PVC), YKY (Cu-4C-PVC), YKXS (Cu-XLPE-4C), YDY 3C.

### Priorytet 5 — APARAT_SN i APARAT_NN
- APARAT_SN: 22 → 35+ (dodać EARTH_SWITCH, szerszy zakres prądowy, SGbc 20 kV)
- APARAT_NN: 3 → 12+ (MCCB, MCB, ACB, przełączniki)

### Priorytet 6 — Ochrona (ZABEZPIECZENIE + KRZYWA + SZABLON)
- ZABEZPIECZENIE: 9 → 20+ (dodać Schneider Sepam, SIPROTEC, GE Multilin)
- KRZYWA: 2 → 12+ (IEC NI/VI/EI, ANSI/IEEE NI/VI/EI, własne producenci)
- SZABLON: 2 → 10+ (szersze zastosowania)

### Priorytet 7 — PV i BESS dedykowane
- FALOWNIK_PV: 4 pochodne → 15+ dedykowanych (SMA, Sungrow, Huawei, ABB)
- FALOWNIK_BESS: 4 pochodne → 10+ dedykowanych (Sungrow, BYD, Tesla, Nidec)

## Najważniejsze braki systemowe

1. **Brak explicit metadanych w danych**: Prawie każda grupa polega na defaults z `from_dict`.
   Testy w `test_catalog_first_repo_hygiene.py` mogą to weryfikować — sprawdź.

2. **Katalog ochrony rozdwojony**: `devices_v0.json` (analityczny) vs `mv_auxiliary_catalog.py` (systemowy).
   Należy ujednolicić pod jednym źródłem z jawnym statusem.

3. **FALOWNIK_PV i FALOWNIK_BESS**: Pochodne z CONVERTER bez producenta.
   Potrzeba dedykowanych plików katalogowych.

4. **CT i VT**: Poprawna architektura, katastrofalnie mała liczba rekordów.

5. **KABEL_NN i APARAT_NN**: Poprawna architektura, szczątkowe dane.

## Definicja minimalna V1 per grupa

| Grupa | Min. rekordy | Min. producenci | Min. osie | Status po domknięciu |
|-------|---:|---:|---|---|
| LINIA_SN | 25 | 1 (normy IEC) | material, przekrój, R/X/B, I, termal | KATALOG_PRODUKCYJNY_OGRANICZONY |
| KABEL_SN | 51 (spełnione) | 2 (spełnione) | mat, przekrój, napiecie, izol, R/X/C, I, termal | SZEROKI_TYPOSZEREG_PRZEMYSLOWY |
| TRAFO_SN_NN | 22 (spełnione) | 2 (spełnione) | moc, napiecia, uk%, straty, grupa | SZEROKI_TYPOSZEREG_PRZEMYSLOWY |
| APARAT_SN | 30 | 4 | typ, napiecie, prad, zdolnosc, medium | KATALOG_PRODUKCYJNY_OGRANICZONY |
| ZRODLO_SN | 14 (spełnione) | 1 (OSD) | napiecie, Sk3, RX, uziemienie | KATALOG_PRODUKCYJNY_OGRANICZONY |
| CT | 24 | 2 | przekladnia, klasa, burden, rola | KATALOG_REFERENCYJNY |
| VT | 12 | 2 | przekladnia, klasa, burden, wykonanie | KATALOG_REFERENCYJNY |
| KABEL_NN | 15 | 2 | mat, przekroj, R/X, I | KATALOG_REFERENCYJNY |
| APARAT_NN | 10 | 2 | typ, napiecie, prad, zdolnosc | KATALOG_REFERENCYJNY |
| FALOWNIK_PV | 12 | 3 | producent, rodzina, moc, S, Q | KATALOG_REFERENCYJNY |
| FALOWNIK_BESS | 8 | 2 | producent, rodzina, moc, e_kwh, S | KATALOG_REFERENCYJNY |
| ZABEZPIECZENIE | 18 | 3 | vendor, seria, funkcje, status | KATALOG_ANALITYCZNY |
| KRZYWA | 10 | 0 | standard, rodzina, parametry | KATALOG_REFERENCYJNY |
| SZABLON | 8 | 0 | urzadzenie, krzywa, pola nastaw | KATALOG_REFERENCYJNY |
| OBCIAZENIE | 3 (spełnione) | 1 | model, P, cos_phi | KATALOG_REFERENCYJNY |
