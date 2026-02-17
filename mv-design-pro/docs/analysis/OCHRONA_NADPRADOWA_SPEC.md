# Ochrona nadpradowa — specyfikacja analizy

| Pole           | Wartosc                                      |
|----------------|----------------------------------------------|
| **Status**     | BINDING                                      |
| **Wersja**     | 1.0                                          |
| **Data**       | 2026-02-17                                   |
| **Wlasciciel** | MV-Design-PRO — warstwa analizy              |
| **Dokument**   | OCHRONA_NADPRADOWA_SPEC.md                   |

---

## 1. Zasada nadrzdna: ochrona jako odrebna warstwa analizy

Ochrona nadpradowa jest czescia **warstwy analizy** (Analysis Layer).
Nie nalezy do warstwy solwera ani do warstwy fizyki.

```
SOLVER (IEC 60909, Newton-Raphson)
        |
        v  wyniki obliczen (tylko odczyt)
ANALIZA OCHRONY NADPRADOWEJ
        |
        v  raporty, nakladki SLD, ocena selektywnosci
PREZENTACJA
```

**Reguly bezwzgledne:**

- Warstwa ochrony **NIE WYKONUJE** obliczen fizycznych (zwarciowych, przeplywowych).
- Warstwa ochrony **ODCZYTUJE** wyniki z solwerow jako dane wejsciowe (read-only).
- Warstwa ochrony **NIE MODYFIKUJE** modelu sieci (NetworkModel).
- Warstwa ochrony **NIE NALEZY** do solwera — to interpretacja wynikow.

---

## 2. Dane wejsciowe

### 2.1. Wyniki zwarciowe (read-only)

Warstwa ochrony pobiera wyniki obliczen zwarciowych z solwera IEC 60909:

| Wielkosc                          | Symbol       | Jednostka | Zrodlo               |
|-----------------------------------|--------------|-----------|----------------------|
| Prad zwarciowy poczatkowy         | I''k         | kA        | Solwer SC3F / SC1F   |
| Prad zwarciowy ustalony           | Ik           | kA        | Solwer SC3F / SC1F   |
| Prad udarowy                      | ip (I_dyn)   | kA        | Solwer SC3F          |
| Prad cieplny                      | Ith (I_th)   | kA        | Solwer SC3F          |
| Moc zwarciowa                     | Sk''         | MVA       | Solwer SC3F          |
| Impedancja zasteprcza Thevenina   | Zth          | Ohm       | Solwer SC3F          |

### 2.2. Konfiguracja urzadzen ochronnych

Konfiguracja urzadzen ochronnych jest czescia modelu domenowego i obejmuje:
przekladniki pradowe (CT), przekladniki napieciowe (VT) oraz przekazniki (Relay).

---

## 3. Model urzadzen ochronnych

### 3.1. Przekladnik pradowy (CT)

| Parametr                  | Typ         | Opis                                                   | Przyklad           |
|---------------------------|-------------|--------------------------------------------------------|--------------------|
| `przekladnia`             | string      | Przekladnia pradowa (strona pierwotna / wtorna)        | "400/5"            |
| `klasa_dokladnosci`       | enum        | Klasa dokladnosci wg IEC 61869                         | 0.5, 0.5S, 1, 3, 5P, 10P |
| `obciazenie_znamionowe`   | float [VA]  | Obciazenie znamionowe uzwojenia wtornego               | 15.0               |
| `nasycenie_Kssc`          | float       | Wspolczynnik nasycenia zwarciowego                     | 20.0               |
| `napiecie_nasycenia`      | float [V]   | Napiecie kolanowe krzywej nasycenia                    | 120.0              |
| `prad_znamionowy_ciagly`  | float [A]   | Prad ciagly znamionowy strony pierwotnej               | 400.0              |
| `prad_znamionowy_krotkotrwaly` | float [kA] | Prad znamionowy krotkotrwaly (1s / 3s)            | 25.0               |
| `typ_rdzenia`             | enum        | Typ rdzenia: pomiarowy, zabezpieczeniowy               | "zabezpieczeniowy" |

### 3.2. Przekladnik napieciowy (VT)

| Parametr                  | Typ         | Opis                                                   | Przyklad           |
|---------------------------|-------------|--------------------------------------------------------|--------------------|
| `przekladnia`             | string      | Przekladnia napieciowa (strona pierwotna / wtorna)     | "15000/100"        |
| `klasa_dokladnosci`       | enum        | Klasa dokladnosci wg IEC 61869                         | 0.2, 0.5, 1.0, 3P |
| `obciazenie_znamionowe`   | float [VA]  | Obciazenie znamionowe                                  | 50.0               |
| `schemat_polaczen`        | enum        | Schemat: gwiazda, trojkat otwarty, jednofazowy         | "gwiazda"          |
| `napiecie_znamionowe_pierwotne` | float [kV] | Napiecie znamionowe strony pierwotnej             | 15.0               |
| `napiecie_znamionowe_wtorne`    | float [V]  | Napiecie znamionowe strony wtornej                | 100.0              |

### 3.3. Przekaznik (Relay)

| Parametr                  | Typ         | Opis                                                   | Przyklad              |
|---------------------------|-------------|--------------------------------------------------------|-----------------------|
| `typ_przekaznika`         | enum        | Typ: IDMT, czas staly, roznicowy                       | "IDMT"                |
| `producent`               | string      | Producent urzadzenia                                   | "Siemens"             |
| `model`                   | string      | Model urzadzenia                                       | "7SJ82"               |
| `wersja_oprogramowania`   | string      | Wersja firmware                                        | "V4.80"               |
| `nastawy`                 | object      | Obiekt nastaw — patrz sekcja 4                         | —                     |
| `powiazany_ct_id`         | UUID        | Identyfikator powiazanego przekladnika pradowego       | —                     |
| `powiazany_vt_id`         | UUID | null | Identyfikator powiazanego przekladnika napieciowego    | —                     |
| `powiazane_pole_id`       | UUID        | Identyfikator pola rozdzielczego                       | —                     |

---

## 4. Nastawy przekaznikow

### 4.1. Stopien nadpradowy I> (IDMT)

| Nastawa                   | Symbol | Typ        | Jednostka | Opis                                          |
|---------------------------|--------|------------|-----------|-----------------------------------------------|
| Prad nastawczy             | Is     | float      | A         | Prog pobudzenia (pickup)                      |
| Mnoznik czasowy            | TMS    | float      | —         | Time Multiplier Setting                       |
| Typ charakterystyki        | —      | enum       | —         | SI, VI, EI, LTI (wg IEC 60255)               |
| Kierunkowosc              | —      | enum       | —         | bezkierunkowy, w przod, wstecz                |

### 4.2. Stopien nadpradowy I>> (bezzwloczny)

| Nastawa                   | Symbol | Typ        | Jednostka | Opis                                          |
|---------------------------|--------|------------|-----------|-----------------------------------------------|
| Prad nastawczy             | I>>    | float      | A         | Prog pobudzenia wysokiego stopnia             |
| Opoznienie czasowe         | t>>    | float      | s         | Opoznienie dzialania                          |

### 4.3. Stopien nadpradowy I>>> (czas staly)

| Nastawa                   | Symbol | Typ        | Jednostka | Opis                                          |
|---------------------------|--------|------------|-----------|-----------------------------------------------|
| Prad nastawczy             | I>>>   | float      | A         | Prog pobudzenia najwyzszego stopnia           |
| Opoznienie czasowe         | t>>>   | float      | s         | Opoznienie dzialania                          |

---

## 5. Obliczanie krzywych TCC (charakterystyk czasowo-pradowych)

### 5.1. Wzor IEC 60255

Czas dzialania zabezpieczenia IDMT oblicza sie wedlug normy IEC 60255:

$$
t = TMS \cdot \frac{k}{\left(\frac{I}{I_s}\right)^{\alpha} - 1}
$$

gdzie:

| Symbol | Opis                                          |
|--------|-----------------------------------------------|
| t      | Czas dzialania [s]                            |
| TMS    | Mnoznik czasowy (Time Multiplier Setting)     |
| k      | Stala charakterystyki                         |
| I      | Prad zwarciowy plynacy przez zabezpieczenie   |
| Is     | Prad nastawczy (pickup)                       |
| alpha  | Wykladnik charakterystyki                     |

### 5.2. Charakterystyki normowe IEC 60255

| Nazwa                              | Skrot | alpha | k      |
|------------------------------------|-------|-------|--------|
| Normalnie odwrotna (Standard Inverse) | SI    | 0.02  | 0.14   |
| Bardzo odwrotna (Very Inverse)     | VI    | 1.0   | 13.5   |
| Nadzwyczaj odwrotna (Extremely Inverse) | EI | 2.0   | 80.0   |
| Dlugotrwale odwrotna (Long Time Inverse) | LTI | 1.0  | 120.0  |

### 5.3. Generowanie punktow krzywej TCC

Krzywa TCC generowana jest deterministycznie:

1. Zakres pradowy: od `1.05 * Is` do `Imax` (prad zwarciowy maksymalny w punkcie).
2. Liczba punktow: **50 punktow** rownomiernie rozlozonych w skali logarytmicznej.
3. Dla kazdego punktu oblicza sie czas `t` wedlug wzoru z sekcji 5.1.
4. Punkty z `t < 0` lub `t > t_max` (np. 100 s) sa odrzucane.
5. Wynik: tablica `[(I_1, t_1), (I_2, t_2), ..., (I_50, t_50)]`.

**Determinizm**: identyczne dane wejsciowe (Is, TMS, krzywa, Imax) daja identyczna tablice wynikowa.

### 5.4. Stopnie I>> i I>>>

Dla stopni o stalym czasie dzialania krzywa TCC jest linia pozioma:

- Stopien I>>: linia pozioma na `t = t>>` od `I = I>>` do `I = Imax`.
- Stopien I>>>: linia pozioma na `t = t>>>` od `I = I>>>` do `I = Imax`.

Krzywa wynikowa zabezpieczenia jest **suma (dolna obwiednia)** wszystkich stopni.

---

## 6. Analiza selektywnosci

### 6.1. Zasada selektywnosci

Selektywnosc oznacza, ze zabezpieczenie **blizsze miejscu zwarcia** (downstream) zadziala
**wczesniej** niz zabezpieczenie dalsze (upstream).

### 6.2. Pary urzadzen

Analiza selektywnosci wykonywana jest dla **par urzadzen** (upstream, downstream):

- Para definiowana jest topologicznie na podstawie polozenia w sieci.
- Dla kazdej pary porownywane sa krzywe TCC w calym zakresie pradowym.

### 6.3. Wymaganie minimalnego odstupu czasowego

$$
\Delta t = t_{upstream}(I) - t_{downstream}(I) \geq 0.3 \text{ s}
$$

dla kazdego pradu `I` w zakresie od `I_s(downstream)` do `I''_k(max)` w punkcie zwarcia.

**Wartosc 0.3 s** obejmuje:

| Skladnik                          | Wartosc typowa |
|-----------------------------------|----------------|
| Czas wylaczania wylacznika        | 0.05 – 0.08 s |
| Czas powrotu przekaznika upstream | 0.05 – 0.10 s |
| Margines bezpieczenstwa           | 0.10 – 0.15 s |
| **Suma**                          | **>= 0.30 s** |

### 6.4. Wykrywanie konfliktow

Konflikt selektywnosci wystepuje gdy:

- `delta_t < 0.3 s` dla dowolnego pradu w zakresie analizy.
- Krzywe TCC sie przecinaja (zmiana kolejnosci dzialania).
- Zabezpieczenie upstream nie pobudza sie dla zwarcia w strefie downstream.

### 6.5. Akcje naprawcze

Dla kazdego konfliktu system generuje sugestie naprawcze:

| Typ konfliktu                       | Sugerowana akcja                                        |
|-------------------------------------|---------------------------------------------------------|
| Niedostateczny odstep czasowy       | Zwiekszyc TMS upstream lub zmniejszyc TMS downstream    |
| Przeciecie krzywych                  | Zmienic typ charakterystyki jednego z urzadzen          |
| Brak pobudzenia upstream            | Zmniejszyc prog Is upstream                             |
| Przekroczenie czasu dopuszczalnego  | Sprawdzic odpornosc cieplna elementow                   |

---

## 7. Raport ochrony nadpradowej

### 7.1. Tabela nastaw

Tabela zestawiajaca wszystkie zabezpieczenia w sieci:

| Pole       | Zabezpieczenie | Typ   | Is [A] | TMS  | Krzywa | I>> [A] | t>> [s] | I>>> [A] | t>>> [s] |
|------------|----------------|-------|--------|------|--------|---------|---------|----------|----------|
| Pole 1     | F1-REL         | IDMT  | 200    | 0.15 | SI     | 2000    | 0.10    | —        | —        |
| Pole 2     | F2-REL         | IDMT  | 150    | 0.10 | SI     | 1500    | 0.10    | —        | —        |

### 7.2. Nakladka krzywych TCC

Wykres czasowo-pradowy (log-log) przedstawiajacy:

- Osie: prad [A] (os X, skala logarytmiczna), czas [s] (os Y, skala logarytmiczna).
- Krzywe wszystkich zabezpieczen nalozone na wspolnym wykresie.
- Oznaczenie pradow zwarciowych w kluczowych punktach sieci.
- Kolorystyka: kazde zabezpieczenie ma unikalny kolor.

### 7.3. Macierz selektywnosci

Macierz NxN (N = liczba zabezpieczen) z ocena selektywnosci:

| —      | F1-REL      | F2-REL      | F3-REL      |
|--------|-------------|-------------|-------------|
| F1-REL | —           | SELEKTYWNE  | SELEKTYWNE  |
| F2-REL | SELEKTYWNE  | —           | KONFLIKT    |
| F3-REL | SELEKTYWNE  | KONFLIKT    | —           |

### 7.4. Lista konfliktow z akcjami naprawczymi

Dla kazdego konfliktu:

- Identyfikator pary (upstream, downstream).
- Zakres pradowy konfliktu.
- Minimalny zmierzony `delta_t`.
- Sugerowana akcja naprawcza (z sekcji 6.5).

---

## 8. Nakladka SLD (schemat jednokreskowy)

### 8.1. Plakietki ochrony

Na schemacie jednokreskowym kazde zabezpieczenie oznaczone jest plakietka:

```
┌──────────────┐
│ F1-REL       │
│ SI  TMS=0.15 │
│ Is=200 A     │
│ [SELEKTYWNE] │
└──────────────┘
```

### 8.2. Lacza do krzywych TCC

Klikniecie plakietki otwiera inspektora TCC z krzywa danego zabezpieczenia.

### 8.3. Status selektywnosci na urzadzeniu

Kolorystyka plakietki:

| Status        | Kolor    | Opis                                      |
|---------------|----------|-------------------------------------------|
| SELEKTYWNE    | zielony  | Selektywnosc zachowana ze wszystkimi parami |
| KONFLIKT      | czerwony | Przynajmniej jeden konflikt selektywnosci  |
| NIEOKRESLONE  | szary    | Brak danych (analiza nie wykonana)         |

---

## 9. Kody gotowosci

Kody gotowosci informuja uzytkownika o brakujacych elementach konfiguracji:

| Kod                                | Opis                                                    | Blokuje analize? |
|------------------------------------|---------------------------------------------------------|-------------------|
| `protection.ct_required`           | Brak przypisanego przekladnika pradowego do pola        | TAK               |
| `protection.vt_required`           | Brak przypisanego przekladnika napieciowego (gdy wymagany) | Zalezne        |
| `protection.settings_incomplete`   | Niekompletne nastawy przekaznika                        | TAK               |
| `protection.relay_not_linked`      | Przekaznik nie powiazany z polem rozdzielczym           | TAK               |
| `protection.sc_results_missing`    | Brak wynikow zwarciowych (solwer nie uruchomiony)       | TAK               |
| `protection.sc_results_outdated`   | Wyniki zwarciowe nieaktualne (model zmieniony)          | OSTRZEZENIE       |

---

## 10. Operacje domenowe

### 10.1. Zarzadzanie przekladnikami

| Operacja       | Sygnatura                                              | Opis                                      |
|----------------|--------------------------------------------------------|-------------------------------------------|
| `add_ct`       | `add_ct(pole_id, parametry_ct) -> CT`                  | Dodaj przekladnik pradowy do pola         |
| `add_vt`       | `add_vt(pole_id, parametry_vt) -> VT`                  | Dodaj przekladnik napieciowy do pola      |
| `remove_ct`    | `remove_ct(ct_id) -> void`                             | Usun przekladnik pradowy                  |
| `remove_vt`    | `remove_vt(vt_id) -> void`                             | Usun przekladnik napieciowy               |

### 10.2. Zarzadzanie przekaznikami

| Operacja                  | Sygnatura                                                         | Opis                                           |
|---------------------------|-------------------------------------------------------------------|-------------------------------------------------|
| `add_relay`               | `add_relay(typ, producent, model) -> Relay`                       | Dodaj przekaznik do projektu                   |
| `update_relay_settings`   | `update_relay_settings(relay_id, nastawy) -> Relay`               | Zaktualizuj nastawy przekaznika                |
| `link_relay_to_field`     | `link_relay_to_field(relay_id, pole_id, ct_id, vt_id?) -> void`  | Powiaz przekaznik z polem i przekladnikami     |
| `unlink_relay`            | `unlink_relay(relay_id) -> void`                                  | Odlacz przekaznik od pola                      |

### 10.3. Obliczenia i analiza

| Operacja                  | Sygnatura                                                         | Opis                                           |
|---------------------------|-------------------------------------------------------------------|-------------------------------------------------|
| `calculate_tcc_curve`     | `calculate_tcc_curve(relay_id) -> TccCurve`                       | Oblicz krzywa TCC dla przekaznika              |
| `validate_selectivity`    | `validate_selectivity(case_id) -> SelectivityReport`              | Wykonaj analize selektywnosci                  |
| `generate_protection_report` | `generate_protection_report(case_id) -> ProtectionReport`      | Generuj pelny raport ochrony                   |

---

## 11. Powiazania z innymi warstwami

| Warstwa        | Relacja                                                              |
|----------------|----------------------------------------------------------------------|
| Solwer SC      | Odczyt wynikow zwarciowych (I''k, ip, Ith, Sk'') — tylko odczyt     |
| Model sieci    | Odczyt topologii (polozenie pol, polaczenia) — tylko odczyt          |
| SLD            | Nakladka plakietek ochrony, lacza TCC, status selektywnosci         |
| Eksport        | Sekcja raportu ochrony w pakiecie projektu                           |
| Inspektor sladu| Slad obliczen TCC dostepny w inspektorze                             |

---

## 12. Ograniczenia i zalozenia

1. Analiza ochrony obejmuje wylacznie **siec sredniего napiecia** (SN).
2. Charakterystyki IDMT zgodne z **IEC 60255** (nie ANSI/IEEE).
3. Minimalny odstep selektywnosci: **0.3 s** (konfigurowalny per projekt).
4. System nie modeluje automatyki SPZ (samoczynne ponowne zalaczenie) — osobna specyfikacja.
5. Przekladniki modelowane sa w zakresie wymaganym do analizy ochrony (nie jako pelne modele fizyczne).

---

*Koniec dokumentu. Status: BINDING. Wersja: 1.0. Data: 2026-02-17.*
