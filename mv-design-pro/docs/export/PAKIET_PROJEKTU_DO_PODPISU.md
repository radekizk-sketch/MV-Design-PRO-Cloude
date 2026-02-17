# Pakiet projektu do podpisu — specyfikacja eksportu

| Pole           | Wartosc                                      |
|----------------|----------------------------------------------|
| **Status**     | BINDING                                      |
| **Wersja**     | 1.0                                          |
| **Data**       | 2026-02-17                                   |
| **Wlasciciel** | MV-Design-PRO — warstwa eksportu             |
| **Dokument**   | PAKIET_PROJEKTU_DO_PODPISU.md                |

---

## 1. Definicja pakietu projektu

Pakiet projektu do podpisu to **archiwum ZIP** zawierajace wszystkie artefakty projektu
niezbedne do formalnego podpisania i archiwizacji dokumentacji projektowej.

**Cele pakietu:**

- Pelna dokumentacja projektu sieci SN w jednym archiwum.
- Deterministyczna identyfikacja zawartosci (skroty kryptograficzne).
- Gotowsc do podpisu (elektronicznego lub recznego).
- Odtwarzalnosc wynikow (pelne dane wejsciowe i slad obliczen).

---

## 2. Zawartosc pakietu

### 2.1. Schemat jednokreskowy (SLD)

| Plik                          | Format    | Opis                                          |
|-------------------------------|-----------|-----------------------------------------------|
| `sld/schemat_jednokreskowy.pdf` | PDF     | Schemat jednokreskowy do wydruku              |
| `sld/schemat_jednokreskowy.svg` | SVG     | Schemat jednokreskowy — grafika wektorowa     |
| `sld/schemat_jednokreskowy.png` | PNG     | Schemat jednokreskowy — grafika rastrowa      |

### 2.2. Zestawienia elementow

| Plik                              | Format    | Opis                                          |
|-----------------------------------|-----------|-----------------------------------------------|
| `zestawienia/linie_kablowe.json`  | JSON      | Zestawienie linii kablowych                   |
| `zestawienia/linie_kablowe.xlsx`  | XLSX      | Zestawienie linii kablowych (arkusz)          |
| `zestawienia/transformatory.json` | JSON      | Zestawienie transformatorow                   |
| `zestawienia/transformatory.xlsx` | XLSX      | Zestawienie transformatorow (arkusz)          |
| `zestawienia/aparatura.json`      | JSON      | Zestawienie aparatury laczeniowej             |
| `zestawienia/aparatura.xlsx`      | XLSX      | Zestawienie aparatury laczeniowej (arkusz)    |
| `zestawienia/przekladniki_ct.json`| JSON      | Zestawienie przekladnikow pradowych           |
| `zestawienia/przekladniki_ct.xlsx`| XLSX      | Zestawienie przekladnikow pradowych (arkusz)  |
| `zestawienia/przekladniki_vt.json`| JSON      | Zestawienie przekladnikow napieciowych        |
| `zestawienia/przekladniki_vt.xlsx`| XLSX      | Zestawienie przekladnikow napieciowych (arkusz)|
| `zestawienia/zabezpieczenia.json` | JSON      | Zestawienie urzadzen ochronnych               |
| `zestawienia/zabezpieczenia.xlsx` | XLSX      | Zestawienie urzadzen ochronnych (arkusz)      |

### 2.3. Raporty analityczne

| Plik                                      | Format | Opis                                          |
|-------------------------------------------|--------|-----------------------------------------------|
| `raporty/zwarcia_trojfazowe.pdf`          | PDF    | Raport obliczen zwarciowych trojfazowych      |
| `raporty/zwarcia_jednofazowe.pdf`         | PDF    | Raport obliczen zwarciowych jednofazowych     |
| `raporty/rozplyw_mocy.pdf`               | PDF    | Raport obliczen przeplywowych                 |
| `raporty/spadki_napiecia.pdf`             | PDF    | Raport spadkow napiecia                       |
| `raporty/ochrona_nadpradowa.pdf`         | PDF    | Raport ochrony nadpradowej                    |
| `raporty/selektywnosc.pdf`               | PDF    | Raport selektywnosci zabezpieczen             |
| `raporty/krzywe_tcc.pdf`                 | PDF    | Wykresy krzywych TCC                          |

### 2.4. Dowody obliczeniowe (White Box)

| Plik                                          | Format | Opis                                          |
|-----------------------------------------------|--------|-----------------------------------------------|
| `dowody/{wariant}_{element}_dowod.pdf`        | PDF    | Dowod obliczeniowy per element                |
| `dowody/{wariant}_{element}_dowod.tex`        | LaTeX  | Dowod w formacie LaTeX                        |
| `dowody/{wariant}_{element}_slad.json`        | JSON   | Pelny slad obliczen (TraceArtifact)           |

### 2.5. Raporty porownawcze (opcjonalne)

| Plik                                          | Format | Opis                                          |
|-----------------------------------------------|--------|-----------------------------------------------|
| `porownania/{wariant_A}_vs_{wariant_B}.pdf`   | PDF    | Raport porownawczy dwoch wariantow            |
| `porownania/{wariant_A}_vs_{wariant_B}.json`  | JSON   | Dane porownawcze (maszynowe)                  |

### 2.6. Manifest

| Plik                  | Format | Opis                                          |
|-----------------------|--------|-----------------------------------------------|
| `manifest.json`       | JSON   | Manifest pakietu — patrz sekcja 4             |

---

## 3. Metryki deterministyczne

### 3.1. Skroty kryptograficzne

| Metryka               | Algorytm | Dane wejsciowe                                | Opis                                          |
|-----------------------|----------|------------------------------------------------|-----------------------------------------------|
| `snapshot_hash`       | SHA-256  | Caly model sieci (topologia + parametry)       | Identyfikacja stanu modelu sieci              |
| `layout_hash`         | SHA-256  | Uklad SLD (pozycje elementow, polaczenia)      | Identyfikacja stanu schematu jednokreskowego  |
| `file_hash`           | SHA-256  | Zawartosc kazdego pliku w pakiecie             | Weryfikacja integralnosci plikow              |

### 3.2. Wersje katalogu

Dla kazdego elementu powiazanego z katalogiem typow:

| Pole                  | Opis                                                          |
|-----------------------|---------------------------------------------------------------|
| `catalog_item_id`     | Identyfikator pozycji katalogowej                             |
| `catalog_version`     | Wersja pozycji katalogowej w momencie eksportu                |
| `catalog_name`        | Nazwa pozycji katalogowej                                     |

### 3.3. Wersje algorytmow

| Pole                  | Opis                                                          |
|-----------------------|---------------------------------------------------------------|
| `solver_sc_version`   | Wersja solwera zwarciowego IEC 60909                          |
| `solver_pf_version`   | Wersja solwera przeplywowego Newton-Raphson                   |
| `math_spec_version`   | Wersja specyfikacji matematycznej                             |
| `proof_engine_version`| Wersja silnika dowodowego                                     |
| `export_tool_version` | Wersja narzedzia eksportu                                     |

---

## 4. Plik manifestu (manifest.json)

### 4.1. Schemat

```json
{
    "manifest_version": "1.0",
    "export_tool_version": "2.1.0",
    "created_at": "2026-02-17T14:30:00Z",

    "project": {
        "name": "Nazwa projektu",
        "author": "Jan Kowalski",
        "organization": "Firma Projektowa Sp. z o.o.",
        "snapshot_hash": "a1b2c3d4e5f6...",
        "layout_hash": "f6e5d4c3b2a1...",
        "description": "Projekt sieci SN 15 kV — rejon X"
    },

    "study_cases": [
        {
            "case_id": "550e8400-e29b-...",
            "name": "Wariant podstawowy",
            "status": "FRESH",
            "run_id": "sha256abc...",
            "analysis_types": ["SC3F", "POWER_FLOW"]
        }
    ],

    "catalog_versions": [
        {
            "catalog_item_id": "uuid-...",
            "catalog_name": "YAKY 3x240",
            "catalog_version": "1.2"
        }
    ],

    "algorithm_versions": {
        "solver_sc_version": "2.1.0",
        "solver_pf_version": "1.5.0",
        "math_spec_version": "1.0.0",
        "proof_engine_version": "1.3.0"
    },

    "files": [
        {
            "path": "sld/schemat_jednokreskowy.pdf",
            "sha256": "abc123def456...",
            "size_bytes": 1048576,
            "type": "sld"
        },
        {
            "path": "raporty/zwarcia_trojfazowe.pdf",
            "sha256": "def456abc123...",
            "size_bytes": 524288,
            "type": "report"
        }
    ],

    "manifest_hash": "sha256 calego manifestu (bez tego pola)"
}
```

### 4.2. Opis pol manifestu

| Pole                  | Typ        | Wymagane | Opis                                          |
|-----------------------|------------|----------|-----------------------------------------------|
| `manifest_version`    | string     | TAK      | Wersja formatu manifestu                      |
| `export_tool_version` | string     | TAK      | Wersja narzedzia eksportu                     |
| `created_at`          | datetime   | TAK      | Znacznik czasu utworzenia pakietu (ISO 8601)   |
| `project`             | object     | TAK      | Metadane projektu                             |
| `project.name`        | string     | TAK      | Nazwa projektu                                |
| `project.author`      | string     | TAK      | Autor / projektant                            |
| `project.organization`| string     | NIE      | Organizacja                                   |
| `project.snapshot_hash`| string    | TAK      | SHA-256 modelu sieci                          |
| `project.layout_hash` | string     | TAK      | SHA-256 ukladu SLD                            |
| `project.description` | string     | NIE      | Opis projektu                                 |
| `study_cases`         | array      | TAK      | Lista wariantow obliczeniowych w pakiecie     |
| `catalog_versions`    | array      | TAK      | Wersje uzytych pozycji katalogowych           |
| `algorithm_versions`  | object     | TAK      | Wersje algorytmow i solwerow                  |
| `files`               | array      | TAK      | Lista plikow z hashami SHA-256                |
| `manifest_hash`       | string     | TAK      | SHA-256 calego manifestu (bez tego pola)      |

---

## 5. Konwencja nazewnictwa

### 5.1. Nazwa archiwum ZIP

```
{nazwa_projektu}_{data}_{snapshot_hash_krotki}.zip
```

Gdzie:

| Skladnik                | Opis                                          | Przyklad              |
|-------------------------|-----------------------------------------------|-----------------------|
| `nazwa_projektu`        | Nazwa projektu (znaki alfanumeryczne + _)     | `Siec_SN_Rejon_X`    |
| `data`                  | Data eksportu (YYYY-MM-DD)                    | `2026-02-17`          |
| `snapshot_hash_krotki`  | Pierwsze 8 znakow snapshot_hash               | `a1b2c3d4`            |

Przyklad pelny:
```
Siec_SN_Rejon_X_2026-02-17_a1b2c3d4.zip
```

### 5.2. Nazwy plikow wewnetrznych

- Bez polskich znakow diakrytycznych w nazwach plikow (kompatybilnosc).
- Separatorem slow jest podkreslnik `_`.
- Rozszerzenia male litery.

---

## 6. Sekcje raportu glownego

Raport glowny (`raporty/raport_glowny.pdf`) zawiera nastepujace sekcje:

### 6.1. Strona tytulowa (strona 1)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              PROJEKT SIECI SREDNIEGO NAPIECIA               │
│                                                             │
│  Nazwa projektu:    [nazwa]                                 │
│  Autor:             [imie i nazwisko]                       │
│  Organizacja:       [firma]                                 │
│  Data:              [data eksportu]                         │
│  Migawka modelu:    [snapshot_hash]                         │
│  Wersja eksportu:   [export_tool_version]                   │
│                                                             │
│                                                             │
│  Podpis: _________________    Data: ______________          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2. Sekcja 1 — Topologia sieci i schemat jednokreskowy

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Opis struktury sieci                     | Liczba szyn, galezi, zrodel, odbiorcow        |
| Poziomy napiecia                         | Napiecia znamionowe uzyte w projekcie         |
| Schemat jednokreskowy (SLD)              | Osadzony schemat lub odniesienie do zalacznika |
| Legenda symboli                          | Objasnienie symboli uzytych na schemacie      |

### 6.3. Sekcja 2 — Zestawienie aparatury

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Tabela linii kablowych                   | Typ, dlугоsc, przekroj, impedancja            |
| Tabela transformatorow                   | Moc, przekladnia, napicie zwarcia, grupa pol. |
| Tabela aparatury laczeniowej             | Typ, prad znamionowy, zdolnosc laczeniowa     |
| Tabela przekladnikow                     | CT: przekladnia, klasa; VT: przekladnia, klasa|
| Zrodla katalogowe                        | Odniesienia do pozycji katalogowych           |

### 6.4. Sekcja 3 — Wyniki obliczen zwarciowych

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Parametry obliczen                       | Wspolczynnik c, moc bazowa, typ zwarcia       |
| Tabela wynikow per szyna                 | I''k, ip, Ik, Ith, Sk'' dla kazdej szyny     |
| Wartosci maksymalne i minimalne          | Podsumowanie wartosci skrajnych               |
| Odniesienie normatywne                   | IEC 60909-0:2016                              |

### 6.5. Sekcja 4 — Wyniki obliczen przeplywowych

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Parametry obliczen                       | Tolerancja, liczba iteracji, zbiезnosc        |
| Tabela napiec wezlowych                  | U [kV], U [p.u.], kat [deg] per szyna        |
| Tabela pradow galezi                     | I [A], P [kW], Q [kvar] per galaz            |
| Tabela strat mocy                        | dP [kW], dQ [kvar] per galaz                 |
| Tabela spadkow napiecia                  | dU [%] per galaz                             |

### 6.6. Sekcja 5 — Koordynacja ochrony

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Tabela nastaw zabezpieczen               | Is, TMS, krzywa, I>>, t>>, I>>>, t>>>        |
| Wykresy krzywych TCC                     | Nakladka krzywych wszystkich zabezpieczen     |
| Macierz selektywnosci                    | Ocena selektywnosci par urzadzen              |
| Lista konfliktow                         | Konflikty z sugerowanymi akcjami naprawczymi  |

### 6.7. Sekcja 6 — Dowod obliczeniowy White Box

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Wybrany element / szyna                  | Element, dla ktorego wygenerowano dowod       |
| Pelny slad obliczen                      | Kroki: wzor -> dane -> podstawienie -> wynik  |
| Weryfikacja jednostek                    | Analiza wymiarowa per krok                    |
| Odniesienia normatywne                   | IEC 60909, IEC 60255, inne                    |

### 6.8. Sekcja 7 — Porownanie wariantow (opcjonalna)

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Porownywane warianty                     | Nazwy, parametry, roznice konfiguracji        |
| Tabela porownawcza wynikow              | Wartosc A, wartosc B, delta, delta [%]        |
| Schemat roznicowy                        | SLD z kolorystyka roznicowa                   |
| Wnioski                                  | Podsumowanie roznic                           |

### 6.9. Dodatek — Pelne tabele danych

| Zawartosc                                | Opis                                          |
|------------------------------------------|-----------------------------------------------|
| Pelne tabele wynikow                     | Wszystkie wartosci dla wszystkich elementow   |
| Parametry elementow                      | Pelne dane techniczne z katalogu              |
| Konfiguracja wariantow                   | Pelne parametry obliczeniowe                  |

---

## 7. Operacja domenowa

### 7.1. export_project_artifacts

| Pole                  | Opis                                                          |
|-----------------------|---------------------------------------------------------------|
| **Sygnatura**         | `export_project_artifacts(project_id, opcje) -> ExportPackage`|
| **Dane wejsciowe**    | Identyfikator projektu + opcje eksportu                      |
| **Wynik**             | Archiwum ZIP z manifestem                                    |

### 7.2. Opcje eksportu

| Opcja                         | Typ      | Domyslnie | Opis                                          |
|-------------------------------|----------|-----------|-----------------------------------------------|
| `warianty`                    | UUID[]   | [aktywny] | Lista wariantow do uwzglednienia              |
| `typy_analiz`                 | enum[]   | wszystkie | Typy analiz: SC3F, SC1F, POWER_FLOW           |
| `dowody_elementy`             | UUID[]   | []        | Elementy, dla ktorych generowac dowody WB     |
| `format_dowodow`              | enum[]   | [PDF]     | Formaty dowodow: PDF, LaTeX, JSON, DOCX       |
| `porownanie`                  | bool     | false     | Czy dolaczac raport porownawczy               |
| `porownanie_warianty`         | UUID[2]  | null      | Para wariantow do porownania                  |
| `format_zestawien`            | enum[]   | [XLSX]    | Formaty zestawien: JSON, XLSX                  |
| `sld_formaty`                 | enum[]   | [PDF,SVG] | Formaty SLD: PDF, SVG, PNG                    |
| `jezyk`                       | enum     | PL        | Jezyk raportu: PL                             |

### 7.3. Walidacja przed eksportem

Przed wygenerowaniem pakietu system sprawdza:

1. **Warianty musza miec stan FRESH** — nie mozna eksportowac wynikow OUTDATED lub NONE.
2. **Model sieci musi przejsc walidacje** — NetworkValidator bez bledow.
3. **Wszystkie kody gotowosci spelnione** — brak blokujacych kodow gotowosci.
4. **Dostepnosc solwerow** — wersje solwerow musza byc zgodne z artefaktami.

---

## 8. Odniesienie

Szczegolowa specyfikacja systemu eksportu znajduje sie w:

- `docs/export/EXPORT_SYSTEM_CANONICAL.md` — kanoniczny dokument systemu eksportu

Niniejszy dokument definiuje **format pakietu projektu do podpisu** i jest komplementarny
z dokumentem kanonicznym systemu eksportu.

---

## 9. Integralnosc i weryfikacja

### 9.1. Weryfikacja integralnosci pakietu

Odbiorca pakietu moze zweryfikowac integralnosc:

1. Odczytac `manifest.json`.
2. Dla kazdego pliku w `files[]` obliczyc SHA-256 i porownac z `sha256` w manifescie.
3. Obliczyc SHA-256 manifestu (bez pola `manifest_hash`) i porownac z `manifest_hash`.
4. Sprawdzic `snapshot_hash` z naglowkiem raportu.

### 9.2. Weryfikacja reprodukowalnosci wynikow

1. Zaladowac model sieci z parametrami z pakietu.
2. Utworzyc wariant z parametrami z manifestu.
3. Uruchomil obliczenia.
4. Porownac `run_id` — jesli identyczny, wyniki sa identyczne.

---

## 10. Ograniczenia i zalozenia

1. Pakiet eksportowy jest **tylko do odczytu** — nie mozna go zaimportowac z powrotem.
2. Maksymalny rozmiar pakietu: **brak limitu** (ograniczenie techniczne: pamiec i dysk).
3. Format ZIP z kompresja DEFLATE.
4. Kodowanie tekstow: UTF-8.
5. Daty w formacie ISO 8601.
6. Nazwy plikow bez polskich znakow diakrytycznych (kompatybilnosc z systemami plikow).
7. Pakiet nie zawiera danych poufnych (hasla, tokeny) — jedynie dane techniczne projektu.

---

*Koniec dokumentu. Status: BINDING. Wersja: 1.0. Data: 2026-02-17.*
