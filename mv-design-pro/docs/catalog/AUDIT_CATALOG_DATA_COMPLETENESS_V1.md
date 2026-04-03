# AUDIT CATALOG DATA COMPLETENESS V1

Stan na `2026-04-03` — domkniecie globalne warstwy katalogow technicznych.

## Rozliczenie grup

| Grupa | Rekordy | Metadane jawne | Naruszenia | Status |
|---|---:|:---:|:---:|---|
| `LINIA_SN` | 26 | TAK | 0 | ZAMKNIETY |
| `KABEL_SN` | 51 | TAK | 0 | ZAMKNIETY |
| `TRAFO_SN_NN` | 34 | TAK | 0 | ZAMKNIETY |
| `APARAT_SN` | 36 | TAK | 0 | ZAMKNIETY |
| `APARAT_NN` | 14 | TAK | 0 | ZAMKNIETY |
| `KABEL_NN` | 17 | TAK | 0 | ZAMKNIETY |
| `ZRODLO_SN` | 22 | TAK | 0 | ZAMKNIETY |
| `CONVERTER` | 23 | TAK | 0 | ZAMKNIETY |
| `FALOWNIK_PV` | 12 | TAK | 0 | ZAMKNIETY |
| `FALOWNIK_BESS` | 8 | TAK | 0 | ZAMKNIETY |
| `CT` | 12 | TAK | 0 | ZAMKNIETY |
| `VT` | 9 | TAK | 0 | ZAMKNIETY |
| `ZABEZPIECZENIE` | 12 | TAK | 0 | ZAMKNIETY |
| `KRZYWA_ZABEZPIECZENIA` | 8 | TAK | 0 | ZAMKNIETY |
| `SZABLON_NASTAW` | 8 | TAK | 0 | ZAMKNIETY |
| `OBCIAZENIE` | 3 | TAK | 0 | ZAMKNIETY |
| **SUMA** | **331** | **TAK** | **0** | **ZAMKNIETY** |

## Straznicy CI

Testy weryfikujace katalog w CI (`python-tests.yml`):

- `catalog_metadata_guard.py` — metadane we wszystkich rekordach
- `catalog_binding_guard.py` — powiazania z katalogiem
- `catalog_enforcement_guard.py` — egzekwowanie uzywania katalogu
- `test_catalog_metadata_contract.py` — kontrakt metadanych (16 grup)
- `test_catalog_industrial_series_width.py` — szerokosc typoszeregu (PV/BESS/APARAT)
- `test_protection_ct_vt_v1_completeness.py` — CT/VT/ochrona
- `test_cable_line_catalog_width.py` — LINIA_SN/KABEL_SN
- `test_switchgear_catalog_width.py` — APARAT_SN
- `test_transformer_catalog_width.py` — TRAFO_SN_NN
- `test_source_converter_industrial_series.py` — ZRODLO_SN/CONVERTER

## Uwaga

To nie jest deklaracja pelnej weryfikacji rynku.
To jest uczciwy, jawnie oznaczony zakres V1 dla wspieranego produktu.

Wszystkie rekordy maja jawne `verification_status` — tzn. zaden rekord nie jest
ukryty w domniemanym stanie "nie wiadomo czy sprawdzony".
