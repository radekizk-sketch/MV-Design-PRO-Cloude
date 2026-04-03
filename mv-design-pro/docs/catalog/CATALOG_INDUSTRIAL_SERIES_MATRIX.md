# CATALOG INDUSTRIAL SERIES MATRIX

Stan na `2026-04-03`. Zamrożone po commicie recon-freeze-and-industrial-matrix.

## Definicje poziomów domknięcia (ZAMROŻONE)

- `PELNY_TYPOSZEREG_PRZEMYSLOWY`:
  szeroka i uporządkowana siatka rodzin, producentów, wariantów i osi technicznych
  dla całego wspieranego zakresu produktu, bez luk blokujących typowe przypadki
  projektowe.

- `SZEROKI_TYPOSZEREG_PRZEMYSLOWY`:
  bardzo szerokie pokrycie osi technicznych z niewielką liczbą jawnie opisanych luk,
  nadal używalne produkcyjnie dla zdecydowanej większości przypadków wspieranego
  zakresu.

- `KATALOG_PRODUKCYJNY_OGRANICZONY`:
  katalog produkcyjnie używalny tylko dla części wspieranego zakresu; ograniczenia są
  jawne i udokumentowane.

- `KATALOG_REFERENCYJNY`:
  katalog do odniesienia, demonstracji lub ograniczonej pracy projektowej; nie daje
  podstaw do tezy o szerokim typoszeregu przemysłowym.

- `KATALOG_ANALITYCZNY`:
  katalog wspierający analizy lub testy eksperckie, ale niepromowany do
  `PRODUKCYJNY_V1`.

## Definicja pełnego typoszeregu per grupa (ZAMROŻONA)

### LINIA_SN
Pełny typoszereg przemysłowy wymaga:
- rodziny: AFL 6 (ACSR 6/1), AFL 2 (ACSR 2/1), AAL (AAC), ACSS, ewentualnie ACSR custom
- przekroje: 16, 25, 35, 50, 70, 95, 120, 150, 185, 240 mm² dla każdej rodziny
- materiały: AL, AL_ST
- osie: R [Ω/km], X [Ω/km], B [µS/km], I_max [A], termal j_th
- producenci/norma: PN-EN 50182, IEC 61089 lub producent (np. Tele-Fonika, NKT)
- brak katalogu punktowego < 10 rekordów na rodzinę

Bieżący stan: 15 rekordów — brak pełnej rodziny AFL 6 dla wszystkich przekrojów, brak AFL 2.

### KABEL_SN
Pełny typoszereg przemysłowy wymaga:
- napięcia: 12 kV (8.7/15 kV), 20 kV (12/20 kV)
- materiały żył: CU, AL
- izolacje: XLPE, EPR
- wykonania: 1-żyłowe (typowe SN), 3-żyłowe (GPZ, linie SN w niektórych zastosowaniach)
- przekroje: 70, 95, 120, 150, 185, 240, 300, 400 mm²
- osie: R [Ω/km], X [Ω/km], C [nF/km], I_max [A], j_th
- producenci: min. 2 (NKT, Tele-Fonika lub Nexans, Prysmian)

Bieżący stan: 51 rekordów — WYSOKA skala. Spełniony warunek szerokich typoszeregów.

### TRAFO_SN_NN
Pełny typoszereg przemysłowy wymaga:
- rodziny: WN/SN (110/15 kV, 110/20 kV), SN/nN (15/0.4, 20/0.4 kV)
- moce WN/SN: 16, 25, 40, 63 MVA
- moce SN/nN: 63, 100, 160, 250, 400, 630, 1000, 1600, 2000, 2500 kVA
- uk%: typowe 6% (SN/nN), 10-12% (WN/SN)
- straty: P0, Pk zgodne z normą PN-EN 50464-1
- grupy połączeń: Dyn11 (SN/nN), Yd11 (WN/SN), YNd11 (WN/SN z uziemionym neutralem)
- producenci: min. 2 (ZREW, ABB, Schneider, Trafo-Brak)

Bieżący stan: 22 rekordów — WYSOKA skala. Spełniony warunek szerokich typoszeregów.

### APARAT_SN
Pełny typoszereg przemysłowy wymaga:
- typy: CIRCUIT_BREAKER, LOAD_SWITCH, DISCONNECTOR, EARTH_SWITCH, RECLOSER, FUSE
- napięcia: 12 kV, 17.5 kV, 24 kV (dla 20 kV sieci)
- prądy: 400, 630, 1000, 1250, 1600 A
- zdolności: 16, 20, 25, 31.5, 40 kA
- media: VACUUM, SF6
- producenci: ABB, Siemens, Eaton, Schneider Electric, NOJA Power
- brak katalogu bez EARTH_SWITCH (uziemnik)

Bieżący stan: 22 rekordów — brak EARTH_SWITCH, wąski zakres 24 kV.

### ZRODLO_SN
Pełny typoszereg dla zakresu OSD wymaga:
- napięcia: 15 kV, 20 kV (i ew. 110 kV jako zasilanie GPZ)
- Sk3: 100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 750, 1000 MVA
- R/X: 0.08, 0.10, 0.12 (typowe dla GPZ sieci dystrybucyjnej)
- model zwarciowy: short_circuit_power (dominujący), ew. Thevenin
- uziemienie: PUNKT_NEUTRALNY_UZIEMIONY, PUNKT_NEUTRALNY_NIEUZIEMIONY, SKOMPENSOWANY

Bieżący stan: 14 rekordów (15 kV i 20 kV) — ŚREDNIA skala, wystarczająca dla typowych zastosowań.

### PRZEKSZTALTNIK (CONVERTER)
Grupa rdzeniowa — nie musi być katalogiem końcowym jeśli:
- jawnie zadeklarowana jako REFERENCYJNY_V1
- separuje PV, WIND, BESS logicznie
- służy jako baza dla derive do FALOWNIK_PV i FALOWNIK_BESS

Bieżący stan: 11 rekordów — KATALOG_REFERENCYJNY — docelowo utrzymany jako baza.

### FALOWNIK_PV
Pełny typoszereg wymaga:
- producenci: SMA, Sungrow, Huawei, ABB/Fimer, Fronius, Growatt (min. 3)
- rodziny: string, centralne, hybridowe
- moce: 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10 MW (zakres farm SN)
- osie: S_n [MVA], P_max [MW], Q_min/max [MVAr], cos_phi zakres, napięcie SN
- status: REFERENCYJNY_V1 z metadanymi producenta

Bieżący stan: 4 pochodne (brak producenta) — NIE spełniony.

### FALOWNIK_BESS
Pełny typoszereg wymaga:
- producenci: Sungrow, BYD, Tesla Megapack, Nidec, Fluence (min. 2-3)
- rodziny: rack-mounted, kontenerowe, utility-scale
- moce: 0.5, 1, 2, 5, 10 MW
- pojemność: 1, 2, 4, 10, 20 MWh
- osie: P_max [MW], e_kwh [kWh], S_n [MVA], Q, napięcie SN
- status: REFERENCYJNY_V1 z metadanymi producenta

Bieżący stan: 4 pochodne (brak producenta) — NIE spełniony.

### CT
Pełny typoszereg wymaga:
- przekładnie pierwotne: 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1200, 1500, 2000, 3000 A
- prąd wtórny: 5 A (dominujący), 1 A (alternatywny)
- klasy: 5P10, 5P20, 10P10, 10P20 (zabezpieczeniowe); 0.1, 0.2, 0.5, 1, 3 (pomiarowe)
- burden: 5, 10, 15, 20, 30 VA
- rola: POMIAROWY, ZABEZPIECZENIOWY, COMBO
- producenci: ABB, Arteche, Schneider, Siemens, RITZ (min. 2)
- napięcie: 12 kV, 17.5 kV, 24 kV

Bieżący stan: 3 rekordy — SZCZĄTKOWE, nie spełnione.

### VT
Pełny typoszereg wymaga:
- napięcia pierwotne: 10 kV, 15 kV, 20 kV, 36 kV (zakres SN)
- napięcia wtórne: 100 V (standard SN), 110 V
- klasy: 0.1, 0.2, 0.5, 1, 3P (pomiarowe i zabezpieczeniowe)
- burden: 10, 25, 50, 100, 200 VA
- wykonania: monofazowe, trójfazowe (V-V), kaskadowe
- producenci: ABB, Arteche, Schneider, Siemens (min. 2)

Bieżący stan: 2 rekordy — SZCZĄTKOWE, nie spełnione.

### ZABEZPIECZENIE
Pełny typoszereg wymaga:
- producenci: ABB/Hitachi (REF615, REX615), Schneider (Sepam), Siemens (SIPROTEC), GE Multilin (ELEKTROMETAL jako uzupełnienie) — min. 3
- rodziny: przekaźniki wielofunkcyjne SN, nadprądowe, ziemnozwarciowe, różnicowe
- funkcje: 50/51 (nadprądowy), 50N/51N (ziemnozwarciowy), 87 (różnicowy), 67/67N (kierunkowy)
- status: ANALITYCZNY_V1 (wszystkie nieweryfikowane dopóki nie ma potwierdzenia prod.)

Bieżący stan: 9 rekordów, 2 producenci — NISKA skala.

### KRZYWA_ZABEZPIECZENIA
Pełny typoszereg wymaga:
- standard IEC: Normal Inverse, Very Inverse, Extremely Inverse, Long Time Inverse
- standard ANSI/IEEE: Moderate Inverse, Very Inverse, Extremely Inverse
- własne producentów: Schneider Sepam, ABB REF, Siemens SIPROTEC (jeśli różne od IEC)
- parametry: A, B (lub C, α) zgodne ze standardem
- funkcje: 50/51, 50N/51N (oddzielne krzywe dla każdej funkcji)

Bieżący stan: 2 rekordy — SZCZĄTKOWE, nie spełnione.

### SZABLON_NASTAW
Pełny typoszereg wymaga:
- szablony dla każdej głównej rodziny urządzeń × każdej głównej funkcji
- pola nastaw: I>, I>>, t>, TMS lub Dial, ew. kierunek
- powiązanie z urządzeniem i krzywą
- zakresy min/max dla walidacji nastawy
- zastosowania: odejście SN, zasilanie transformatora, sprzęgło, linia SN

Bieżący stan: 2 szablony — SZCZĄTKOWE, nie spełnione.

### KABEL_NN
Pełny typoszereg wymaga:
- rodziny: YAKY (Al, 4-żyłowy, PVC), YKY (Cu, 4-żyłowy, PVC), YKXS (Cu, XLPE), NYY (Cu)
- przekroje: 16, 25, 35, 50, 70, 95, 120, 150, 185, 240 mm²
- napięcie: 0.6/1 kV
- osie: R [Ω/km], X [Ω/km], I_max [A]
- producenci: Tele-Fonika, NKT (min. 1-2)

Bieżący stan: 3 rekordy — SZCZĄTKOWE, nie spełnione.

### APARAT_NN
Pełny typoszereg wymaga:
- typy: MCCB (wyłącznik nadprądowy formowany), ACB (wyłącznik powietrzny), MCB (bezpiecznikowy), RCD, przełącznik sieć-agregat
- prądy: 16, 25, 32, 63, 100, 160, 250, 400, 630, 800, 1000, 1250, 1600 A
- zdolności zwarciowe: 10, 16, 25, 36, 50 kA (zależnie od typu)
- producenci: ABB, Siemens, Schneider (min. 2)

Bieżący stan: 3 rekordy — SZCZĄTKOWE, nie spełnione.

### OBCIAZENIE
Katalog referencyjny — nie wymaga pełnego typoszeregu.
Wymagane minimum: 3 profile (mieszkaniowy, usługowy, przemysłowy).

Bieżący stan: 3 rekordy — SPEŁNIONE dla KATALOG_REFERENCYJNY.

## Macierz skali domknięcia — stan bieżący i docelowy

| Grupa | Rek. bieżące | Rek. docelowe | Prod. bieżący | Prod. docelowy | Skala bieżąca | Skala docelowa | Domknięty? |
|---|---:|---:|---:|---:|---|---|---|
| LINIA_SN | 15 | 25+ | 0 | 1+ | ŚREDNIA | KATALOG_PRODUKCYJNY_OGRANICZONY | NIE |
| KABEL_SN | 51 | 51 (ok) | 2 | 2 | WYSOKA | SZEROKI_TYPOSZEREG_PRZEMYSLOWY | NIE* |
| TRAFO_SN_NN | 22 | 22 (ok) | 2 | 2 | WYSOKA | SZEROKI_TYPOSZEREG_PRZEMYSLOWY | NIE* |
| APARAT_SN | 22 | 35+ | 6 | 6+ | ŚREDNIA | KATALOG_PRODUKCYJNY_OGRANICZONY | NIE |
| ZRODLO_SN | 14 | 14 (ok) | 1 | 1 | ŚREDNIA | KATALOG_PRODUKCYJNY_OGRANICZONY | NIE* |
| CONVERTER | 11 | 11 (ok) | 2 | 2 | NISKA | KATALOG_REFERENCYJNY | NIE* |
| FALOWNIK_PV | 4 | 15+ | 0 | 3+ | NISKA | KATALOG_REFERENCYJNY | NIE |
| FALOWNIK_BESS | 4 | 10+ | 0 | 2+ | NISKA | KATALOG_REFERENCYJNY | NIE |
| CT | 3 | 24+ | 2 | 2+ | SZCZĄTKOWA | KATALOG_REFERENCYJNY | NIE |
| VT | 2 | 12+ | 1 | 2+ | SZCZĄTKOWA | KATALOG_REFERENCYJNY | NIE |
| ZABEZPIECZENIE | 9 | 18+ | 2 | 3+ | NISKA | KATALOG_ANALITYCZNY | NIE |
| KRZYWA | 2 | 10+ | 0 | 0 | SZCZĄTKOWA | KATALOG_REFERENCYJNY | NIE |
| SZABLON | 2 | 8+ | 0 | 0 | SZCZĄTKOWA | KATALOG_REFERENCYJNY | NIE |
| KABEL_NN | 3 | 15+ | 2 | 2 | SZCZĄTKOWA | KATALOG_REFERENCYJNY | NIE |
| APARAT_NN | 3 | 10+ | 2 | 2+ | SZCZĄTKOWA | KATALOG_REFERENCYJNY | NIE |
| OBCIAZENIE | 3 | 3 (ok) | 1 | 1 | SZCZĄTKOWA | KATALOG_REFERENCYJNY | TAK |

(*) NIE — brak explicit metadanych w rekordach, wymagane uzupełnienie.

## Inwarianty tej matrycy (ZAMROŻONE)

1. Statusy weryfikacji i statusy katalogowe są zamrożone:
   `ZWERYFIKOWANY | NIEWERYFIKOWANY | CZESCIOWO_ZWERYFIKOWANY | REFERENCYJNY`
   `PRODUKCYJNY_V1 | REFERENCYJNY_V1 | ANALITYCZNY_V1 | TESTOWY`

2. PRODUKCYJNY_V1 nie może być NIEWERYFIKOWANY — kombinacja niedopuszczalna.

3. Rekord bez źródła (`source_reference`) nie może być ZWERYFIKOWANY.

4. Każdy rekord PRODUKCYJNY_V1 musi mieć explicit `source_reference` w danych.

5. Samo istnienie katalogu nie oznacza domknięcia przemysłowego.

6. Testy szerokości muszą odzwierciedlać tę macierz (minimalna liczba rekordów per grupa).
