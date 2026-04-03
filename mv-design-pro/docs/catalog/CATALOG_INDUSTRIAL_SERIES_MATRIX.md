# CATALOG INDUSTRIAL SERIES MATRIX

Stan na `2026-04-03`.

## Zamrozone definicje

- `PELNY_TYPOSZEREG_PRZEMYSLOWY`:
  szeroka i uporzadkowana siatka rodzin, producentow, wariantow i osi technicznych
  dla calego wspieranego zakresu produktu, bez luk blokujacych typowe przypadki
  projektowe.
- `SZEROKI_TYPOSZEREG_PRZEMYSLOWY`:
  bardzo szerokie pokrycie osi technicznych z niewielka liczba jawnie opisanych luk,
  nadal uzywalne produkcyjnie dla zdecydowanej wiekszosci przypadkow wspieranego
  zakresu.
- `KATALOG_PRODUKCYJNY_OGRANICZONY`:
  katalog produkcyjnie uzywalny tylko dla czesci wspieranego zakresu; ograniczenia sa
  jawne i udokumentowane.
- `KATALOG_REFERENCYJNY`:
  katalog do odniesienia, demonstracji lub ograniczonej pracy projektowej; nie daje
  podstaw do tezy o szerokim typoszeregu przemyslowym.
- `KATALOG_ANALITYCZNY`:
  katalog wspierajacy analizy lub testy eksperckie, ale niepromowany do
  `PRODUKCYJNY_V1`.

## Kryteria per grupa

### LINIA_SN

- Osi techniczne:
  rodzina przewodu, material, przekroj, `r_ohm_per_km`, `x_ohm_per_km`,
  `b_us_per_km`, obciazalnosc, dane zwarciowe.
- Pelny typoszereg:
  szerokie pokrycie kilku rodzin przewodow i wielu przekrojow dla wspieranego zakresu
  SN.

### KABEL_SN

- Osi techniczne:
  rodzina konstrukcyjna, material zyl, przekroj, liczba zyl, poziom napiecia,
  izolacja, `r_ohm_per_km`, `x_ohm_per_km`, `c_nf_per_km`, obciazalnosc, dane
  zwarciowe.
- Pelny typoszereg:
  szeroka macierz rodzin i przekrojow, a nie pojedyncze punkty.

### TRAFO_SN_NN

- Osi techniczne:
  moc, napiecie gorne, napiecie dolne, `uk_percent`, `pk_kw`, `p0_kw`,
  `i0_percent`, grupa polaczen, chlodzenie.
- Pelny typoszereg:
  szeroki szereg mocy i wariantow pracy dla wspieranego zakresu stacji.

### APARAT_SN

- Osi techniczne:
  typ aparatu, napiecie, prad znamionowy, zdolnosc laczeniowa / zwarciowa,
  medium, producent, rodzina.
- Pelny typoszereg:
  szerokie rodziny aparatow i zakresow znamionowych dla pracy SN.

### ZRODLO_SN

- Osi techniczne:
  poziom napiecia, wariant mocy zwarciowej, `rx_ratio`, model zwarciowy,
  uziemienie, rola zasilania.
- Pelny typoszereg:
  szeroka siatka warunkow zasilania systemowego dla wspieranych poziomow SN.

### PRZEKSZTALTNIK

- Osi techniczne:
  rodzaj (`PV`, `WIND`, `BESS`), moc pozorna, moc czynna, zakres Q, energia,
  napiecie przy laczenia.
- Pelny typoszereg:
  szerokie rodziny techniczne, ale grupa moze pozostac bytem rdzeniowym, jesli
  jawnie oddziela sie od finalnych katalogow PV i BESS.

### FALOWNIK_PV

- Osi techniczne:
  producent, rodzina, model, moc, `s_n_kva`, zakres napieciowy, tryb sterowania,
  grid code.
- Pelny typoszereg:
  szeroki katalog producentow, rodzin i mocy, a nie pochodna z ogolnego
  przeksztaltnika.

### FALOWNIK_BESS

- Osi techniczne:
  producent, rodzina, model, moc ladowania/rozladowania, `e_kwh`, `s_n_kva`,
  zakres napieciowy.
- Pelny typoszereg:
  szeroki katalog producentow, rodzin i mocy/pojemnosci.

### CT

- Osi techniczne:
  prad pierwotny, prad wtorny, klasa, burden, rola pomiarowa / zabezpieczeniowa,
  producent.
- Pelny typoszereg:
  szeroka siatka przekladni i klas, nie kilka rekordow.

### VT

- Osi techniczne:
  napiecie pierwotne, napiecie wtore, klasa, burden, wykonanie, producent.
- Pelny typoszereg:
  szeroka siatka poziomow napiec i wykonania.

### ZABEZPIECZENIE

- Osi techniczne:
  producent, rodzina, model, funkcje wspierane, zakres zastosowania, status
  weryfikacji.
- Pelny typoszereg:
  szeroki katalog urzadzen dla wspieranego zakresu ochrony.

### KRZYWA_ZABEZPIECZENIA

- Osi techniczne:
  standard, rodzina krzywej, funkcja, parametry, status.
- Pelny typoszereg:
  szeroki zestaw krzywych wspieranego silnika i standardow.

### SZABLON_NASTAW

- Osi techniczne:
  rodzina urzadzen, funkcja, zakres zastosowania, komplet pol nastawczych, status.
- Pelny typoszereg:
  szeroki zestaw szablonow dla glownych zastosowan.

## Macierz skali domkniecia

| Grupa | Producenci | Rodziny | Modele/warianty | Osi pokryte | Osi brakujace | Skala domkniecia | Pelny typoszereg | Szeroki typoszereg | Status biezacy |
|---|---:|---|---:|---|---|---|---|---|---|
| `LINIA_SN` | 0 | ograniczone | 15 | material, przekroj, R/X/B, obciazalnosc, dane zwarciowe | producent, rodzina handlowa | srednia | NIE | NIE | `KATALOG_PRODUKCYJNY_OGRANICZONY` |
| `KABEL_SN` | 2 | czesciowe | 51 | material, przekroj, napiecie, izolacja, R/X/C, obciazalnosc | metadane jakosci, pelna mapa rodzin | wysoka | NIE | TAK | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` po uzupelnieniu metadanych |
| `TRAFO_SN_NN` | 2 | czesciowe | 22 | moc, napiecia, uk%, straty, grupa, chlodzenie | metadane jakosci, szersza macierz rodzin | wysoka | NIE | TAK | `SZEROKI_TYPOSZEREG_PRZEMYSLOWY` po uzupelnieniu metadanych |
| `APARAT_SN` | 6 | czesciowe | 22 | typ, napiecie, prad, zdolnosci zwarciowe, medium | metadane jakosci, rozdzial rodzin i rol | srednia | NIE | NIE | `KATALOG_PRODUKCYJNY_OGRANICZONY` |
| `ZRODLO_SN` | 1 | jedna rodzina | 14 | napiecie, Sk3, R/X, uziemienie, model | metadane jakosci, szersza klasyfikacja wariantow | srednia | NIE | NIE | `KATALOG_PRODUKCYJNY_OGRANICZONY` |
| `PRZEKSZTALTNIK` | 2 | ograniczone | 11 | rodzaj, moc, Q, energia, napiecie | metadane jakosci, rozdzial na katalogi finalne | srednia | NIE | NIE | `KATALOG_REFERENCYJNY` |
| `FALOWNIK_PV` | 0 | pochodne | 4 | moc, S, sterowanie | producent, rodzina, model, status jakosci | niska | NIE | NIE | `KATALOG_REFERENCYJNY` |
| `FALOWNIK_BESS` | 0 | pochodne | 4 | moc, energia, S | producent, rodzina, model, status jakosci | niska | NIE | NIE | `KATALOG_REFERENCYJNY` |
| `CT` | 2 | szczatkowe | 3 | przekladnia, klasa, burden | role, szeroka siatka przekladni, status jakosci | niska | NIE | NIE | `KATALOG_REFERENCYJNY` |
| `VT` | 1 | szczatkowe | 2 | przekladnia napieciowa, klasa | burden, wykonania, szeroka siatka napiec, status jakosci | niska | NIE | NIE | `KATALOG_REFERENCYJNY` |
| `ZABEZPIECZENIE` | 2 | szczatkowe | 9 | producent, model, funkcje, zakresy | szerokosc rodzin, statusy spiete systemowo | niska | NIE | NIE | `KATALOG_ANALITYCZNY` |
| `KRZYWA_ZABEZPIECZENIA` | 0 | szczatkowe | 2 | standard, parametry | szeroki zakres rodzin i funkcji | niska | NIE | NIE | `KATALOG_REFERENCYJNY` |
| `SZABLON_NASTAW` | 0 | szczatkowe | 2 | urzadzenie, krzywa, pola nastaw | szerokosc zastosowan, metadane jakosci | niska | NIE | NIE | `KATALOG_REFERENCYJNY` |

## Inwariant Commit 1

- Statusy jakosci i statusy katalogowe sa zamrozone i nie moga byc dowolnymi stringami.
- Dokument skali przemyslowej jest zrodlem prawdy dla testow szerokosci i dalszej rozbudowy danych.
- Samo istnienie katalogu nie oznacza domkniecia przemyslowego.
