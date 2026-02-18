# System Eksportu --- Absolutna Specyfikacja Kanoniczna

**Status:** CANONICAL (BINDING)
**Wersja:** 2.0
**Data:** 2026-02-17
**Referencje:**
- `docs/ui/UI_UX_10_10_ABSOLUTE_CANONICAL.md` --- matryca obiekt-menu-modal
- `docs/ui/SLD_UI_CONTRACT.md` --- kontrakt Print-First
- `docs/ui/KONTRAKT_OPERACJI_ENM_OP.md` --- operacje domenowe i format Snapshot
- `docs/ui/RESULTS_BROWSER_CONTRACT.md` --- przegladarka wynikow
- `docs/proof_engine/` --- specyfikacja Proof Engine

---

## 1. Formaty eksportu (BINDING)

System MV-DESIGN-PRO obsluguje nastepujace formaty eksportu. Kazdy format ma scisle
zdefiniowany zakres danych i kontekst uzycia.

### 1.1 PDF --- Raport projektu, raport analiz, White Box

| Parametr | Wartosc |
|----------|---------|
| **Format strony** | A4 (210 x 297 mm), orientacja: pionowa (domyslnie) lub pozioma (SLD) |
| **Silnik renderowania** | WeasyPrint lub Puppeteer (headless Chrome) |
| **Rozdzielczosc grafik** | minimum 300 DPI |
| **Czcionka** | Roboto (tekst), Roboto Mono (kod/wartosci liczbowe), KaTeX (formuly) |
| **Metadane PDF** | Title, Author, Subject, CreationDate, snapshot_hash, export_version |
| **Jezyk** | 100% polski (etykiety, naglowki, komunikaty) |

**Typy raportow PDF:**

| Typ raportu | Zawartosc | Sekcje |
|-------------|-----------|--------|
| **Raport projektu** | Topologia, katalogi, gotowosc, wykazy elementow | SS 3.1 |
| **Raport analiz** | Wyniki zwarc + rozplyw mocy + White Box | SS 3.2 |
| **Raport ochrony** | CT/VT + przekazniki + krzywe TCC + selektywnosc | SS 3.3 |
| **White Box (dowod)** | Pelny dowod obliczeniowy z formulami LaTeX | SS 3.2 sekcja 11 |
| **Raport czesciowy** | Fragment raportu dla wybranego elementu/sekcji | konfigurowalny |

**Wymagania PDF:**
- Layout deterministyczny (bez metadanych zaleznych od czasu w tresci dokumentu).
- Czcionki osadzone (embedded fonts).
- Naglowek metadanych eksportu na pierwszej stronie.
- Print-First Contract: wszystko widoczne na ekranie jest widoczne w PDF.

**ZABRONIONE:**
- Auto-hide wynikow na wydruku (Print-First Contract).
- Eksport bez snapshot_hash (kazdy PDF musi byc powiazany z konkretnym Snapshot).
- Uzycie kodow projektowych (P7, P11, P14 itd.) w tresci raportu.

---

### 1.2 DOCX --- Odpowiedniki PDF

| Parametr | Wartosc |
|----------|---------|
| **Silnik renderowania** | python-docx |
| **Szablon** | `templates/report_template.docx` (korporacyjny) |
| **Czcionka** | Calibri (tekst), Consolas (kod/wartosci), Unicode Math (formuly) |
| **Metadane DOCX** | Title, Author, Subject, Created, Custom: snapshot_hash, export_version |
| **Jezyk** | 100% polski |
| **Kompatybilnosc** | Microsoft Word 2016+ |

**Gwarancje DOCX:**
- Kazdy raport PDF ma swoj odpowiednik DOCX (1:1 zawartosc).
- Tabele wynikow sa edytowalne w formacie natywnym Word (nie jako obrazy).
- Formuly White Box sa renderowane jako obrazy PNG (fallback z LaTeX) + tekst alternatywny.
- Numeracja stron i naglowki powtarzane na kazdej stronie.

**Roznice PDF vs DOCX:**

| Aspekt | PDF | DOCX |
|--------|-----|------|
| Edytowalnosc | NIE | TAK |
| Wiernosc wizualna | 100% | ~95% (zalezna od czcionek systemu) |
| Formuly LaTeX | Renderowane natywnie | Obrazy PNG + tekst alternatywny |
| Diagramy SLD | Wektorowe (SVG wewnatrz PDF) | Obrazy PNG (300 DPI) |
| Podpis cyfrowy | Obslugiwany | Nie obslugiwany |

---

### 1.3 JSON --- Pelny Snapshot + StudyCase + Wyniki

| Parametr | Wartosc |
|----------|---------|
| **Format** | JSON (UTF-8, 2-space indent) |
| **Schema** | JSON Schema v2024-12 |
| **Kodowanie** | UTF-8 BOM-less |
| **Klucze** | Sortowane alfabetycznie (`sort_keys=True`) |
| **Precyzja float** | 10 cyfr znaczacych |
| **Rozmiar max** | brak limitu (streaming dla duzych modeli) |

**Struktura JSON eksportu:**

```json
{
  "export_meta": {
    "export_version": "2.0.0",
    "export_timestamp": "2026-02-17T12:00:00Z",
    "snapshot_hash": "sha256:<64-znakowy-hex>",
    "layout_hash": "sha256:<64-znakowy-hex>",
    "solver_hash": "sha256:<64-znakowy-hex>",
    "project_id": "<identyfikator-projektu>",
    "project_name": "<nazwa-projektu>",
    "exported_by": "<user_id>",
    "deterministic": true
  },
  "snapshot": {
    "buses": [ ],
    "branches": [ ],
    "substations": [ ],
    "transformers": [ ],
    "sources": [ ],
    "loads": [ ],
    "switches": [ ],
    "corridors": [ ],
    "catalog_refs": { }
  },
  "study_cases": [
    {
      "case_id": "<id>",
      "case_name": "<nazwa>",
      "case_type": "SC_3F | SC_2F | SC_1F | SC_2FE | PF",
      "scenario": "MAX | MIN | N-1",
      "parameters": { },
      "status": "COMPUTED | NONE | STALE"
    }
  ],
  "results": {
    "<case_id>": {
      "solver_type": "IEC_60909 | NEWTON_RAPHSON",
      "solver_hash": "sha256:<64-znakowy-hex>",
      "run_id": "<uuid>",
      "computed_at": "2026-02-17T12:00:00Z",
      "bus_results": { },
      "branch_results": { },
      "contributions": { },
      "trace_artifacts": [ ]
    }
  },
  "readiness": {
    "ready": true,
    "blockers": [ ],
    "warnings": [ ]
  },
  "logical_views": {
    "trunks": [ ],
    "branches": [ ],
    "secondary_connectors": [ ],
    "terminals": [ ]
  },
  "materialized_params": {
    "lines_sn": { },
    "transformers_sn_nn": { }
  }
}
```

**Gwarancje JSON:**
- Eksport JSON jest **deterministyczny** --- ten sam Snapshot produkuje identyczny JSON
  (klucze sortowane alfabetycznie, floaty z precyzja 10 cyfr).
- Pole `snapshot_hash` pozwala zweryfikowac integralnosc danych.
- JSON jest kompatybilny z importem (round-trip: eksport --> import zachowuje hash).
- Brak komentarzy (standard JSON).
- Walidacja schematu przed zapisem.

---

### 1.4 JSONL --- Seria uruchomien

| Parametr | Wartosc |
|----------|---------|
| **Format** | JSON Lines (jeden obiekt JSON na linie) |
| **Kodowanie** | UTF-8 BOM-less |
| **Separator linii** | `\n` (LF) |
| **Uzycie** | Eksport historii uruchomien obliczen (audit trail) |

**Struktura JSONL:**

```jsonl
{"type":"export_meta","export_version":"2.0.0","export_timestamp":"2026-02-17T12:00:00Z","snapshot_hash":"sha256:...","project_id":"..."}
{"run_seq":1,"run_id":"<uuid>","case_id":"<id>","solver":"IEC_60909","computed_at":"2026-02-17T12:00:00Z","snapshot_hash":"sha256:...","status":"SUCCESS","duration_ms":1234}
{"run_seq":2,"run_id":"<uuid>","case_id":"<id>","solver":"NEWTON_RAPHSON","computed_at":"2026-02-17T12:01:00Z","snapshot_hash":"sha256:...","status":"SUCCESS","duration_ms":567}
{"run_seq":3,"run_id":"<uuid>","case_id":"<id>","solver":"IEC_60909","computed_at":"2026-02-17T12:05:00Z","snapshot_hash":"sha256:...","status":"FAILED","error":"Brak katalogu dla segmentu seg/abc123/segment"}
```

**Kazda linia danych JSONL zawiera:**

| Pole | Typ | Opis |
|------|-----|------|
| `run_seq` | `int` | Numer sekwencyjny uruchomienia (monotoniczny) |
| `run_id` | `string` | UUID uruchomienia |
| `case_id` | `string` | Identyfikator Case |
| `solver` | `string` | Nazwa solvera (`IEC_60909` / `NEWTON_RAPHSON`) |
| `computed_at` | `string` | Timestamp ISO 8601 |
| `snapshot_hash` | `string` | Hash Snapshot w momencie uruchomienia |
| `status` | `string` | `SUCCESS` / `FAILED` / `CANCELLED` |
| `duration_ms` | `int` | Czas trwania obliczen [ms] |
| `error` | `string?` | Komunikat bledu (jesli `status=FAILED`) |

**Wymagania JSONL:**
- Kazda linia stanowi poprawny obiekt JSON.
- Brak trailing comma, brak pustych linii miedzy rekordami.
- Kolejnosc linii odpowiada chronologii uruchomien.
- Pierwsza linia to ZAWSZE obiekt metadanych (`type: "export_meta"`).

**Zastosowania JSONL:**
- Audyt obliczen (kto, kiedy, co liczyl, jaki wynik).
- Analiza wydajnosci solverow.
- Reprodukcja obliczen (run_id + snapshot_hash pozwala odtworzyc wynik).
- Import do narzedzi analizy danych (pandas, jq, grep).

---

### 1.5 SVG/PNG --- Artefakty renderu SLD

| Parametr | SVG | PNG |
|----------|-----|-----|
| **Format** | SVG 1.1 (XML) | PNG (32-bit RGBA) |
| **Rozdzielczosc** | wektorowa (skalowalna) | 300 DPI (domyslnie), konfigurowalne |
| **Rozmiar strony** | dynamiczny (auto-fit) lub A4/A3/A2/A1 | jak SVG, rasteryzowany |
| **Warstwy** | CAD + SCADA (konfigurowalne) | jak SVG, splaszczone |
| **Czcionki** | Embedded (base64) | Rasteryzowane |
| **Uzycie** | Diagramy SLD w raportach, edycja w narzedziach wektorowych | Podglad, thumbnails, osadzanie w DOCX |

**Struktura eksportu SVG:**

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 {width} {height}"
     data-snapshot-hash="{snapshot_hash}"
     data-layout-hash="{layout_hash}"
     data-export-version="{export_version}"
     data-export-timestamp="{export_timestamp}">

  <!-- Warstwa CAD (statyczna) -->
  <g id="layer-cad" class="sld-layer-cad">
    <!-- Szyny, linie, transformatory, aparaty -->
  </g>

  <!-- Warstwa SCADA (wyniki, stany) -->
  <g id="layer-scada" class="sld-layer-scada">
    <!-- Kolory semantyczne, etykiety wynikow, strzalki przeplywu -->
  </g>

  <!-- Warstwa etykiet -->
  <g id="layer-labels" class="sld-layer-labels">
    <!-- Etykiety INLINE, OFFSET z leader lines, referencje SIDE STACK -->
  </g>

  <!-- Metadane (nie renderowane) -->
  <metadata>
    <export-info snapshot-hash="{snapshot_hash}"
                 layout-hash="{layout_hash}"
                 export-version="{export_version}"
                 export-timestamp="{export_timestamp}" />
  </metadata>
</svg>
```

**Gwarancje SVG/PNG:**
- SVG jest deterministyczny --- ten sam Snapshot + Layout produkuje identyczny SVG.
- PNG jest rasteryzacja SVG --- ta sama rozdzielczosc produkuje identyczny PNG.
- Warstwy SVG sa konfigurowalne (CAD only, SCADA only, obie).
- Metadane sa osadzone w SVG (`data-*` atrybuty + `<metadata>`).
- Metadane w PNG jako chunk `tEXt` (klucze: SnapshotHash, LayoutHash, ExportVersion, ExportTimestamp).

---

## 2. Metadane eksportu (BINDING)

Kazdy artefakt eksportu (PDF, DOCX, JSON, JSONL, SVG, PNG) MUSI zawierac nastepujace
metadane. Metadane zapewniaja audytowalnosc i powtarzalnosc.

### 2.1 Wymagane metadane

| Pole | Typ | Opis | Przyklad |
|------|-----|------|----------|
| `snapshot_hash` | `string` | SHA-256 hash Snapshot w momencie eksportu | `sha256:a1b2c3d4e5f6...` (71 znakow: `sha256:` + 64 hex) |
| `layout_hash` | `string` | SHA-256 hash layoutu geometrycznego SLD | `sha256:f6e5d4c3b2a1...` |
| `solver_hash` | `string` | SHA-256 hash kodu solvera (wersja algorytmu) | `sha256:1a2b3c4d5e6f...` |
| `export_timestamp` | `string` | Timestamp ISO 8601 z timezone UTC | `2026-02-17T12:00:00Z` |
| `export_version` | `string` | Wersja formatu eksportu (semver) | `2.0.0` |

### 2.2 Opcjonalne metadane

| Pole | Typ | Opis | Przyklad |
|------|-----|------|----------|
| `project_id` | `string` | Identyfikator projektu | `proj_abc123` |
| `project_name` | `string` | Nazwa projektu (polska) | `Stacja SN-01 Krakow` |
| `exported_by` | `string` | Identyfikator uzytkownika | `user_xyz789` |
| `case_id` | `string` | Identyfikator Case (jesli eksport dotyczy Case) | `case_max_3f` |
| `case_name` | `string` | Nazwa Case | `Zwarcie 3F MAX` |
| `run_id` | `string` | UUID uruchomienia solvera (jesli eksport wynikow) | `550e8400-e29b-41d4-a716-446655440000` |
| `norma` | `string` | Norma obliczeniowa | `IEC 60909:2016` |
| `scope` | `string` | Zakres eksportu | `FULL` / `PARTIAL` / `ELEMENT` |
| `element_refs` | `list[string]` | Lista referencji eksportowanych elementow (jesli PARTIAL/ELEMENT) | `["bus/a1b2/sn01", "seg/c3d4/seg01"]` |
| `deterministic` | `boolean` | Flaga deterministycznosci | `true` |

### 2.3 Umiejscowienie metadanych w formatach

| Format | Lokalizacja metadanych |
|--------|------------------------|
| **PDF** | Metadane dokumentu (Document Properties) + XMP metadata + naglowek/stopka kazdej strony |
| **DOCX** | Core Properties (Title, Author, Subject, Created) + Custom Properties (snapshot_hash, export_version) + pierwsza sekcja dokumentu |
| **JSON** | Obiekt `export_meta` na poczatku struktury |
| **JSONL** | Pierwszy wiersz: obiekt `{"type":"export_meta", ...}` |
| **SVG** | Atrybuty `data-*` na elemencie `<svg>` + element `<metadata>` |
| **PNG** | Metadane chunk `tEXt` (klucze: SnapshotHash, LayoutHash, ExportVersion, ExportTimestamp) |

### 2.4 Walidacja metadanych

System eksportu MUSI walidowac metadane przed zapisem artefaktu:

```python
def validate_export_metadata(meta: ExportMeta) -> None:
    """Walidacja metadanych eksportu --- BINDING."""
    assert meta.snapshot_hash.startswith("sha256:"), (
        "snapshot_hash musi zaczynac sie od 'sha256:'"
    )
    assert len(meta.snapshot_hash) == 71, (
        "snapshot_hash musi miec 71 znakow (sha256: + 64 hex)"
    )
    assert meta.layout_hash.startswith("sha256:"), (
        "layout_hash musi zaczynac sie od 'sha256:'"
    )
    assert len(meta.layout_hash) == 71, (
        "layout_hash musi miec 71 znakow"
    )
    assert meta.export_timestamp, "export_timestamp jest wymagany"
    assert meta.export_version, "export_version jest wymagany"
    # solver_hash moze byc pusty, jesli eksport nie dotyczy wynikow
    if meta.solver_hash:
        assert meta.solver_hash.startswith("sha256:"), (
            "solver_hash musi zaczynac sie od 'sha256:'"
        )
        assert len(meta.solver_hash) == 71, (
            "solver_hash musi miec 71 znakow"
        )
```

---

## 3. Struktura raportow (BINDING)

### 3.1 Raport projektu

**Cel:** Kompletna dokumentacja topologii sieci, przypisanych katalogow, stanu gotowosci
i wykazow elementow. Raport projektu NIE zawiera wynikow obliczen.

**Sekcje:**

| # | Sekcja | Zawartosc | Zrodlo danych |
|---|--------|-----------|---------------|
| 1 | **Strona tytulowa** | Nazwa projektu, data, autor, snapshot_hash | export_meta |
| 2 | **Spis tresci** | Automatyczny, z numeracja stron | --- |
| 3 | **Topologia sieci** | Schemat SLD (SVG w PDF, PNG w DOCX), opis magistral, odgalezien, stacji | snapshot.corridors, snapshot.substations |
| 4 | **Wykaz szyn SN** | Tabela: ID, Nazwa, Napiecie [kV], Typ, Stacja | snapshot.buses (filtr: SN) |
| 5 | **Wykaz szyn nN** | Tabela: ID, Nazwa, Napiecie [kV], Stacja | snapshot.buses (filtr: nN) |
| 6 | **Wykaz segmentow (linii/kabli)** | Tabela: ID, Nazwa, Typ, Dlugosc [m], Katalog, R [Ohm/km], X [Ohm/km], Imax [A] | snapshot.branches + materialized_params.lines_sn |
| 7 | **Wykaz transformatorow SN/nN** | Tabela: ID, Nazwa, Sn [kVA], Uk [%], Pk [kW], P0 [kW], Katalog | snapshot.transformers + materialized_params.transformers_sn_nn |
| 8 | **Wykaz stacji** | Tabela: ID, Nazwa, Typ (A/B/C/D), Pola SN, Pola nN, Transformatory | snapshot.substations |
| 9 | **Wykaz zrodel** | Tabela: ID, Nazwa, Typ (GPZ/PV/BESS/agregat/UPS), Parametry | snapshot.sources |
| 10 | **Wykaz odbiorow** | Tabela: ID, Nazwa, P [kW], Q [kvar], cos phi, Typ | snapshot.loads |
| 11 | **Wykaz lacznikow** | Tabela: ID, Nazwa, Typ, Stan (otwarty/zamkniety), Stacja, Pole | snapshot.switches |
| 12 | **Katalogi i wersje** | Tabela: Katalog ID, Nazwa, Wersja, Liczba przypisanych elementow, Data ostatniej modyfikacji | catalog_refs |
| 13 | **Gotowosc** | Status gotowosci (READY/NOT_READY), lista blokerow (BLOKUJACE), lista ostrzezen (OSTRZEZENIE) | readiness |
| 14 | **Wykaz dzialan naprawczych** | Tabela: bloker/ostrzezenie, opis, sugerowane dzialanie naprawcze (FixAction), priorytet | readiness.fix_actions |
| 15 | **Legenda symboli SLD** | Legenda symboli uzytych na diagramie SLD | --- |

**Gwarancje:**
- Kazdy element z modelu pojawia sie dokladnie RAZ w odpowiednim wykazie.
- Tabele sa sortowane wg ID (alfabetycznie).
- Puste wykazy sa wyswietlane z komunikatem "Brak elementow tego typu".
- Schemat SLD jest renderowany w pelni (Print-First Contract).

---

### 3.2 Raport analiz

**Cel:** Prezentacja wynikow obliczen zwarciowych (IEC 60909) i rozplywu mocy
(Newton-Raphson) wraz z dowodami White Box.

**Sekcje:**

| # | Sekcja | Zawartosc | Zrodlo danych |
|---|--------|-----------|---------------|
| 1 | **Strona tytulowa** | Nazwa projektu, Case, norma, data, snapshot_hash, solver_hash | export_meta |
| 2 | **Spis tresci** | Automatyczny | --- |
| 3 | **Parametry Case** | Typ zwarcia (3F/2F/1F/2FE), scenariusz (MAX/MIN/N-1), parametry solvera (c_max, c_min, temp_ref) | study_cases |
| 4 | **Schemat SLD z wynikami** | Diagram SLD z nalozona warstwa SCADA (wyniki zwarciowe + rozplyw mocy) | SVG + SCADA overlay |
| 5 | **Wyniki zwarciowe --- tabela zbiorcza** | Tabela: Bus ID, Bus Name, Ik'' [kA], ip [kA], Ith [kA], I_dyn [kA], Sk'' [MVA], Status | results.bus_results |
| 6 | **Wyniki zwarciowe --- wklady** | Tabela: Bus ID, Zrodlo wkladu, Ik'' [kA], Udzial [%] | results.contributions |
| 7 | **Prady dynamiczne i termiczne** | Tabela: Bus ID, I_dyn [kA], I_th [kA], t_k [s] | results.bus_results |
| 8 | **Wyniki rozplywu mocy --- tabela szyn** | Tabela: Bus ID, U [kV], U [pu], delta [deg], P_gen [kW], Q_gen [kvar] | results.bus_results (PF) |
| 9 | **Wyniki rozplywu mocy --- tabela galezi** | Tabela: Branch ID, I [A], P [kW], Q [kvar], Loading [%], Straty [kW] | results.branch_results (PF) |
| 10 | **Profil napiec** | Wykres: U [pu] vs pozycja na magistrali | wyniki PF |
| 11 | **White Box --- dowody obliczeniowe** | Pelny dowod dla kazdego wezla: Formula --> Dane --> Podstawienie --> Wynik --> Jednostka | trace_artifacts + ProofDocument |
| 12 | **Porownanie Study Cases** | Tabela porownawcza: element_id, parametr, Case_A, Case_B, delta, delta_% | jesli eksport wielu Case |
| 13 | **Metadane obliczen** | run_id, computed_at, solver_hash, czas obliczen [ms], norma IEC 60909 | results.meta |

**Format White Box (sekcja 11):**

Kazdy dowod obliczeniowy sklada sie z sekwencji krokow (ProofStep):

```
Krok N: <Nazwa kroku>
--------------------------------------------------
Formula:
  $$ <formula LaTeX> $$

Dane wejsciowe:
  | Symbol | Wartosc | Jednostka | Zrodlo |
  |--------|---------|-----------|--------|
  | ...    | ...     | ...       | ...    |

Podstawienie:
  $$ <formula z podstawionymi wartosciami> $$

Wynik:
  <wartosc> <jednostka>

Weryfikacja jednostek:
  <analiza wymiarowa>
--------------------------------------------------
```

**Gwarancje White Box:**
- Zawiera WSZYSTKIE kroki posrednie (Y-bus, Z-Thevenin, przeliczenia impedancji).
- Kazdy ProofStep ma weryfikacje jednostek (analiza wymiarowa).
- I_dyn i I_th sa OBOWIAZKOWE w dowodach zwarciowych 3F.
- Formuly sa renderowane w LaTeX (blokowy `$$...$$`).
- White Box jest deterministyczny --- ten sam run_id produkuje identyczny dowod.

---

### 3.3 Raport ochrony

**Cel:** Dokumentacja ukladow zabezpieczen: przekladniki CT/VT, przekazniki,
krzywe TCC (Time-Current Characteristics) i analiza selektywnosci.

**Sekcje:**

| # | Sekcja | Zawartosc | Zrodlo danych |
|---|--------|-----------|---------------|
| 1 | **Strona tytulowa** | Nazwa projektu, data, autor, snapshot_hash | export_meta |
| 2 | **Spis tresci** | Automatyczny | --- |
| 3 | **Wykaz przekladnikow CT** | Tabela: ID, Nazwa, Przekladnia, Klasa dokladnosci, Moc znamionowa, Pole, Stacja | snapshot (CT) |
| 4 | **Wykaz przekladnikow VT** | Tabela: ID, Nazwa, Przekladnia, Klasa dokladnosci, Moc znamionowa, Pole, Stacja | snapshot (VT) |
| 5 | **Wykaz przekaznikow z nastawami** | Tabela: ID, Nazwa, Typ, Producent, Funkcje ochronne, CT_ref, VT_ref, Pole, Stacja | snapshot (relays) |
| 6 | **Nastawy przekaznikow --- szczegoly** | Dla kazdego przekaznika: I_pickup [A], I>> [A], t> [s], t>> [s], Time Dial, Curve Type, Trip Time | snapshot (relays) |
| 7 | **Krzywe TCC** | Wykresy Time-Current Characteristic: os X = prad [A] (log), os Y = czas [s] (log). Nalozone krzywe elementow chronionych (kable, transformatory) | obliczone z nastaw |
| 8 | **Analiza selektywnosci** | Macierz selektywnosci: Przekaznik_upstream vs Przekaznik_downstream, wartosci: SELEKTYWNY / NIESELEKTYWNY / WARUNKOWO_SELEKTYWNY, marginesy czasowe i pradowe | analiza ochrony |
| 9 | **Strefy ochronne** | Schemat SLD z naniesionymi strefami ochronnymi kazdego przekaznika (kolorowe obszary + legenda) | SLD + overlay |
| 10 | **White Box ochrony** | Pelne obliczenia nastaw w formacie LaTeX, weryfikacja selektywnosci krok po kroku | trace_artifacts |
| 11 | **Podsumowanie** | Status selektywnosci (OK/NARUSZENIE), lista naruszen, rekomendacje | analiza ochrony |

**Gwarancje:**
- Krzywe TCC sa renderowane jako wykresy wektorowe (SVG w PDF, PNG w DOCX).
- Macierz selektywnosci jest pelna (kazda para przekaznikow w sciezce zwarciowej).
- Strefy ochronne sa wizualizowane na SLD (kolorowe obszary + legenda).
- Komunikaty o naruszeniach selektywnosci sa w jezyku polskim.

---

## 4. Podpisy i sciezki (BINDING)

### 4.1 Podpis eksportu

Kazdy artefakt eksportu zawiera podpis identyfikujacy zrodlo danych:

```
---
Eksport MV-DESIGN-PRO
Snapshot: sha256:<64-znakowy-hex>
Wersja eksportu: <export_version>
Data: <export_timestamp>
---
```

### 4.2 Umiejscowienie podpisu

| Format | Lokalizacja podpisu |
|--------|---------------------|
| **PDF** | Stopka kazdej strony (lewa strona: Snapshot hash skrocony, prawa strona: wersja + data) |
| **DOCX** | Stopka kazdej strony (jak PDF) |
| **JSON** | Obiekt `export_meta` na poczatku pliku |
| **JSONL** | Pierwszy wiersz (`type: "export_meta"`) |
| **SVG** | Atrybuty `data-*` + element `<metadata>` + komentarz XML |
| **PNG** | Metadane chunk `tEXt` |

### 4.3 Sciezki plikow eksportu

System eksportu zapisuje artefakty w deterministycznej strukturze katalogow:

```
exports/
  {project_id}/
    {export_timestamp_compact}/
      export_manifest.json
      report_project.pdf
      report_project.docx
      report_analysis_{case_id}.pdf
      report_analysis_{case_id}.docx
      report_protection.pdf
      report_protection.docx
      snapshot.json
      run_history.jsonl
      sld_full.svg
      sld_full.png
      sld_section_{section_id}.svg
      sld_section_{section_id}.png
      whitebox_{case_id}_{bus_ref}.pdf
      whitebox_{case_id}_{bus_ref}.docx
```

Gdzie `{export_timestamp_compact}` ma format: `YYYYMMDD_HHmmss` (np. `20260217_120000`).

### 4.4 Manifest eksportu

Kazdy katalog eksportu zawiera plik `export_manifest.json` z pelna lista artefaktow:

```json
{
  "export_meta": {
    "snapshot_hash": "sha256:<64-znakowy-hex>",
    "layout_hash": "sha256:<64-znakowy-hex>",
    "solver_hash": "sha256:<64-znakowy-hex>",
    "export_timestamp": "2026-02-17T12:00:00Z",
    "export_version": "2.0.0",
    "project_id": "<identyfikator-projektu>",
    "project_name": "<nazwa-projektu>",
    "exported_by": "<user_id>"
  },
  "artifacts": [
    {
      "filename": "report_project.pdf",
      "type": "REPORT_PROJECT",
      "format": "PDF",
      "size_bytes": 1234567,
      "sha256": "sha256:<hash-pliku>",
      "scope": "FULL"
    },
    {
      "filename": "snapshot.json",
      "type": "SNAPSHOT",
      "format": "JSON",
      "size_bytes": 234567,
      "sha256": "sha256:<hash-pliku>",
      "scope": "FULL"
    }
  ],
  "integrity": {
    "total_artifacts": 12,
    "manifest_hash": "sha256:<hash-manifestu>"
  }
}
```

### 4.5 Weryfikacja integralnosci

System eksportu obsluguje weryfikacje integralnosci artefaktow:

```python
def verify_export_integrity(export_dir: Path) -> bool:
    """Weryfikacja integralnosci eksportu na podstawie manifestu."""
    manifest = load_manifest(export_dir / "export_manifest.json")

    for artifact in manifest["artifacts"]:
        filepath = export_dir / artifact["filename"]
        if not filepath.exists():
            raise ExportIntegrityError(
                f"Brak artefaktu: {artifact['filename']}"
            )
        actual_hash = compute_sha256(filepath)
        if actual_hash != artifact["sha256"]:
            raise ExportIntegrityError(
                f"Niezgodnosc hash dla {artifact['filename']}: "
                f"oczekiwany {artifact['sha256']}, aktualny {actual_hash}"
            )

    return True
```

### 4.6 Gwarancje integralnosci

| Gwarancja | Opis |
|-----------|------|
| **Deterministycznosc** | Ten sam Snapshot + Layout + Case + Wyniki = identyczne artefakty eksportu |
| **Kompletnosc** | Manifest zawiera WSZYSTKIE artefakty w katalogu eksportu |
| **Weryfikowalnosc** | Kazdy artefakt ma hash SHA-256 zapisany w manifescie |
| **Powtarzalnosc** | Eksport z tym samym snapshot_hash produkuje identyczne pliki |
| **Audytowalnosc** | Manifest + metadane pozwalaja odtworzyc kontekst eksportu |

---

## 5. Deterministycznosc eksportu (BINDING)

### 5.1 Zasada ogolna

**Ten sam Snapshot + te same parametry eksportu = identyczny artefakt (identyczny hash SHA-256).**

### 5.2 Wymagania per format

| Format | Wymaganie deterministycznosci | Metoda weryfikacji |
|--------|-------------------------------|---------------------|
| JSON | Sortowane klucze, stale wciecia, brak losowych identyfikatorow | Porownanie bajtowe |
| JSONL | Stala kolejnosc pol w kazdej linii | Porownanie bajtowe |
| SVG | Stale identyfikatory elementow, brak losowych atrybutow | Porownanie bajtowe |
| PNG | Deterministyczny renderer, staly seed dla algorytmow | Porownanie pikselowe |
| PDF | Brak metadanych zaleznych od czasu w strumieniu tresci | Porownanie tresci (z pomieciem metadanych systemowych) |
| DOCX | Stale identyfikatory relacji, brak losowych identyfikatorow w XML | Porownanie tresci XML |

### 5.3 Elementy wylaczone z porownania deterministycznego

Nastepujace elementy NIE podlegaja porownaniu deterministycznemu:
- `export_timestamp` --- z natury zmienny.
- Metadane systemowe pliku (data utworzenia, data modyfikacji w systemie plikow).
- Identyfikatory sesji eksportu (unikalne per wywolanie).

### 5.4 Test deterministycznosci w CI

Test `test_export_determinism` w pipeline CI weryfikuje deterministycznosc:
1. Generuje artefakt eksportu dwukrotnie z identycznymi parametrami.
2. Porownuje hashe SHA-256 artefaktow (z wylaczeniem elementow z sekcji 5.3).
3. Test FAIL jesli hashe sie roznia.

---

## 6. API eksportu (BINDING)

### 6.1 Endpoint eksportu

```
POST /api/v1/export
```

**Payload:**

```json
{
  "project_id": "<identyfikator-projektu>",
  "snapshot_hash": "<sha256-hash>",
  "export_config": {
    "formats": ["PDF", "DOCX", "JSON", "SVG", "PNG"],
    "reports": ["PROJECT", "ANALYSIS", "PROTECTION"],
    "case_ids": ["<case_id_1>", "<case_id_2>"],
    "scope": "FULL | PARTIAL | ELEMENT",
    "element_refs": ["<ref_1>", "<ref_2>"],
    "sld_config": {
      "layers": ["CAD", "SCADA"],
      "resolution_dpi": 300,
      "page_size": "A4"
    },
    "whitebox": {
      "include": true,
      "bus_refs": ["<bus_ref_1>", "<bus_ref_2>"]
    },
    "language": "pl"
  }
}
```

**Odpowiedz (202 Accepted):**

```json
{
  "export_id": "<uuid>",
  "status": "PENDING",
  "estimated_duration_ms": 5000,
  "download_url": "/api/v1/export/<export_id>/download"
}
```

### 6.2 Endpointy dedykowane

| Metoda | Endpoint | Opis |
|--------|----------|------|
| `POST` | `/api/v1/export` | Eksport ogolny (konfigurowalny) |
| `POST` | `/api/v1/export/project` | Eksport raportu projektu (PDF/DOCX) |
| `POST` | `/api/v1/export/analysis` | Eksport wynikow analiz (PDF/DOCX/JSON) |
| `POST` | `/api/v1/export/protection` | Eksport raportu ochrony (PDF/DOCX) |
| `POST` | `/api/v1/export/whitebox` | Eksport White Box (PDF/JSON) |
| `POST` | `/api/v1/export/sld` | Eksport SLD (SVG/PNG) |
| `POST` | `/api/v1/export/snapshot` | Eksport Snapshot (JSON) |
| `POST` | `/api/v1/export/run-history` | Eksport historii uruchomien (JSONL) |
| `GET` | `/api/v1/export/{export_id}/status` | Status eksportu + progress |
| `GET` | `/api/v1/export/{export_id}/download` | Pobranie wygenerowanego artefaktu |
| `GET` | `/api/v1/export/{export_id}/download/{filename}` | Pobranie konkretnego pliku |
| `GET` | `/api/v1/export/{export_id}/manifest` | Pobranie manifestu eksportu |

### 6.3 Eksport asynchroniczny

Dla duzych projektow eksport jest wykonywany asynchronicznie (Celery task):

```
POST /api/v1/export --> 202 Accepted + export_id
GET /api/v1/export/{export_id}/status --> status + progress
GET /api/v1/export/{export_id}/download/{filename} --> plik
```

### 6.4 Statusy eksportu

| Status | Opis |
|--------|------|
| `PENDING` | Eksport w kolejce |
| `PROCESSING` | Generowanie artefaktu w toku |
| `COMPLETED` | Artefakt gotowy do pobrania |
| `FAILED` | Blad generowania (szczegoly w `error_detail`) |

### 6.5 Obsluga bledow

| Kod HTTP | Scenariusz |
|----------|------------|
| `400` | Nieprawidlowe parametry zadania |
| `404` | Projekt lub Study Case nie istnieje |
| `409` | Study Case nie ma wynikow (status NONE) lub niezgodnosc snapshot_hash |
| `422` | Walidacja modelu nie powiodla sie (blockers) |
| `500` | Blad wewnetrzny generowania artefaktu |

### 6.6 Naglowki odpowiedzi

| Naglowek | Wartosc |
|----------|---------|
| `Content-Type` | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/json`, `image/svg+xml`, `image/png` |
| `Content-Disposition` | `attachment; filename="<project_name>_<report_type>_<timestamp>.<ext>"` |
| `X-Export-Meta` | JSON metadanych eksportu (zakodowany) |
| `X-Snapshot-Hash` | Hash Snapshot |
| `X-Export-Version` | Wersja formatu eksportu |

---

## 7. Zakazy (BINDING)

| # | Zakaz | Opis |
|---|-------|------|
| 1 | Eksport bez snapshot_hash | Kazdy artefakt MUSI byc powiazany z hashowanym Snapshot |
| 2 | Eksport z kodami projektowymi | Kody P7, P11, P14 itd. NIE MOGA pojawiac sie w artefaktach |
| 3 | Auto-hide wynikow na wydruku | Print-First Contract --- wszystko widoczne na ekranie jest widoczne w eksporcie |
| 4 | Modyfikacja modelu przez eksport | Eksport jest operacja READ-ONLY --- nie mutuje Snapshot |
| 5 | Uruchamianie solverow przez eksport | Eksport korzysta WYLACZNIE z istniejacych wynikow |
| 6 | Eksport bez walidacji metadanych | Metadane sa walidowane przed zapisem kazdego artefaktu |
| 7 | Eksport SCADA bez warstwy CAD | SVG/PNG z warstwa SCADA MUSI zawierac rowniez warstwe CAD |
| 8 | Niezgodnosc hash w manifescie | Manifest MUSI byc spojny z artefaktami (weryfikacja SHA-256) |
| 9 | Pominicie White Box w raporcie analiz | White Box jest OBOWIAZKOWY w raporcie analiz (domyslnie `include_whitebox=true`) |
| 10 | Zmiana kolejnosci sekcji w raportach | Kolejnosc sekcji jest stala --- zdefiniowana w sekcji 3 |

---

**KONIEC DOKUMENTU EXPORT_SYSTEM_CANONICAL.md**
**Status:** CANONICAL (BINDING)
**Dokument jest zrodlem prawdy dla systemu eksportu w MV-DESIGN-PRO.**
