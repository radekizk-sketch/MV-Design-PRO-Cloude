# CATALOG INDUSTRIAL SERIES MATRIX

Stan na `2026-04-03`.

## Definicje poziomow

- `PELNY_TYPOSZEREG_PRZEMYSLOWY` - szeroka i uporzadkowana siatka rodzin, producentow,
  wariantow i osi technicznych dla calego wspieranego zakresu produktu.
- `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` - bardzo szerokie pokrycie osi technicznych z
  niewielka liczba jawnie opisanych luk.
- `KATALOG_PRODUKCYJNY_OGRANICZONY` - katalog produkcyjnie uzywalny tylko dla czesci
  wspieranego zakresu; ograniczenia sa jawne.
- `KATALOG_REFERENCYJNY` - katalog do odniesienia i ograniczonej pracy projektowej.
- `KATALOG_ANALITYCZNY` - katalog wspierajacy analizy lub testy eksperckie, ale nie
  promowany do `PRODUKCYJNY_V1`.

## Definicja pelnego typoszeregu per grupa

### LINIA_SN
- rodziny: AAL, AFL 6, AFL 2
- przekroje: 16, 25, 35, 50, 70, 95, 120, 150, 185, 240 mm2
- materialy: AL, AL_ST
- osie: R, X, B, Imax, termal jth
- stan: szeroki typoszereg przemyslowy

### KABEL_SN
- napiecia: 12 kV, 20 kV
- materialy zyl: CU, AL
- izolacje: XLPE, EPR
- wykonania: 1- i 3-zylowe
- przekroje: 70, 120, 150, 185, 240, 300, 400 mm2
- stan: szeroki typoszereg przemyslowy

### TRAFO_SN_NN
- rodziny: 110/15 kV, 110/20 kV, 15/0.4 kV, 20/0.4 kV
- zakres mocy: 10 MVA do 2500 kVA
- osie: moc, napiecia, uk%, straty, grupa polaczen, zaczepy
- stan: szeroki typoszereg przemyslowy

### APARAT_SN
- typy: CIRCUIT_BREAKER, LOAD_SWITCH, DISCONNECTOR, EARTH_SWITCH, RECLOSER, FUSE
- napiecia: 12 kV, 17.5 kV, 24 kV
- prady: 400 A do 1600 A
- zdolnosci: 16 kA do 40 kA
- stan: szeroki typoszereg przemyslowy

### ZRODLO_SN
- napiecia: 15 kV, 20 kV
- Sk3: 100 MVA do 1000 MVA
- R/X: 0.08, 0.10, 0.12
- stan: szeroki typoszereg przemyslowy

### CONVERTER
- grupy: PV, BESS, inne przeksztaltniki referencyjne
- stan: katalog referencyjny z szerokim pokryciem

### FALOWNIK_PV
- producenci: SMA, Sungrow, Huawei, ABB, Fronius
- stan: szeroki katalog referencyjny

### FALOWNIK_BESS
- producenci: Sungrow, BYD, Tesla, Nidec, Fluence
- stan: szeroki katalog referencyjny

### CT
- przekladnie: 50/5 do 3000/5 A
- klasy: pomiarowe i zabezpieczeniowe
- burden: 5 VA do 30 VA
- stan: katalog referencyjny

### VT
- napiecia pierwotne: 10 kV, 15 kV, 20 kV, 36 kV
- napiecie wtorne: 100 V, 110 V
- burden: 10 VA do 200 VA
- stan: katalog referencyjny

### ZABEZPIECZENIE
- funkcje: 50/51, 50N/51N, 67/67N, 87
- vendorzy: ABB, ELEKTROMETAL
- stan: katalog analityczny

### KRZYWA_ZABEZPIECZENIA
- standardy: IEC, ANSI/IEEE
- stan: katalog analityczny

### SZABLON_NASTAW
- rodziny: odejscie, transformator, sprzeglo, linia
- stan: katalog analityczny

### KABEL_NN
- rodziny: YAKY, YKY, YKXS, NYY
- stan: katalog referencyjny

### APARAT_NN
- typy: MCCB, ACB, MCB, RCD, przelacznik siec-agregat
- stan: katalog referencyjny

### OBCIAZENIE
- profile: mieszkaniowy, uslugowy, przemyslowy
- stan: katalog referencyjny

## Macierz skali

| Grupa | Rekordy | Producenci / vendorzy | Osie pokryte | Poziom |
|---|---:|---:|---|---|
| `LINIA_SN` | 25 aktywnych / 26 total | 0 | material, przekroj, R/X/B, I, termal | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `KABEL_SN` | 50 aktywnych / 51 total | 2 | material, izolacja, core, przekroj, R/X/C, I, termal | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `TRAFO_SN_NN` | 34 | 3 | moc, napiecia, uk%, straty, grupa, zaczepy | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `APARAT_SN` | 36 | 7 | typ, napiecie, prad, zdolnosc, medium | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `ZRODLO_SN` | 22 | 1 | napiecie, Sk3, RX, uziemienie | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `CONVERTER` | 23 | 5 | rodzina, kind, moc, S, Q | `KATALOG_REFERENCYJNY` |
| `FALOWNIK_PV` | 12 | 5 | S, Pmax, cosphi, control mode | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `FALOWNIK_BESS` | 8 | 5 | Pcharge, Pdischarge, E, S | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` |
| `CT` | 3 | 2 | przekladnia, klasa, burden, rola | `KATALOG_REFERENCYJNY` |
| `VT` | 2 | 1 | pierwotne, wtorne, klasa, burden | `KATALOG_REFERENCYJNY` |
| `ZABEZPIECZENIE` | 9 | 2 | vendor, seria, funkcje, status | `KATALOG_ANALITYCZNY` |
| `KRZYWA_ZABEZPIECZENIA` | 2 | 0 | standard, rodzina, parametry | `KATALOG_ANALITYCZNY` |
| `SZABLON_NASTAW` | 2 | 0 | urzadzenie, krzywa, pola nastaw | `KATALOG_ANALITYCZNY` |
| `KABEL_NN` | 17 | 2 | material, przekroj, R/X, I | `KATALOG_REFERENCYJNY` |
| `APARAT_NN` | 3 | 2 | typ, napiecie, prad, zdolnosc | `KATALOG_REFERENCYJNY` |
| `OBCIAZENIE` | 3 | 1 | profil, P, cos_phi | `KATALOG_REFERENCYJNY` |

## Wniosek

Wspierane grupy sa juz jasno sklasyfikowane.
Najszerszy i najbardziej praktyczny zakres maja `LINIA_SN`, `KABEL_SN`, `TRAFO_SN_NN`
i `APARAT_SN`, ale tylko `KABEL_SN` i `TRAFO_SN_NN` maja juz bardzo dobra szerokosc
osiach i wariantach.
