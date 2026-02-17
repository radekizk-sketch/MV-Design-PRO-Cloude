# UI/UX 10/10 --- Absolutna Specyfikacja Kanoniczna

**Status:** CANONICAL (BINDING)
**Wersja:** 1.0
**Data:** 2026-02-17
**Referencje:**
- `KONTRAKT_OPERACJI_ENM_OP.md` --- operacje domenowe (10 kanonicznych)
- `SLD_UI_CONTRACT.md` --- kontrakty UI (priorytet, gestosc, kolory, druk, interakcje)
- `CATALOG_BROWSER_CONTRACT.md` --- przegladarka katalogu
- `ELEMENT_INSPECTOR_CONTRACT.md` --- inspekcja elementow
- `RESULTS_BROWSER_CONTRACT.md` --- przegladarka wynikow
- `EXPERT_MODES_CONTRACT.md` --- tryby eksperckie
- `PROTECTION_ELEMENT_ASSIGNMENT_CONTRACT.md` --- przypisanie ochrony

---

## 1. Zasady UI (BINDING)

### 1.1 Klikalnosc kazdego obiektu

Kazdy obiekt widoczny na diagramie SLD jest klikalny. Nie istnieja elementy dekoracyjne
bez interakcji. Klikniecie otwiera menu kontekstowe dedykowane dla danego typu obiektu.

### 1.2 Menu kontekstowe --- struktura

Klikniecie prawym przyciskiem myszy (lub dlugim tapnieciem na urzadzeniach dotykowych)
otwiera menu kontekstowe z sekcjami pogrupowanymi tematycznie:

| Sekcja | Opis |
|--------|------|
| **Budowa** | Operacje tworzenia i rozbudowy (wstawianie stacji, segmentow, lacznikow) |
| **Katalog** | Przypisanie i zmiana pozycji katalogowej |
| **Parametry** | Edycja parametrow elementu |
| **Gotowosci** | Status gotowosci, blokery, akcje naprawcze |
| **Wyniki** | Wyniki analiz, White Box, porownania |
| **Historia** | Historia zmian, Snapshot, cofanie |
| **Eksport** | Eksport danych (JSON, PDF, DOCX) |
| **Widok** | Geometria widoku, siatka, reset |
| **Ochrona** | CT/VT, przekazniki, nastawy, selektywnosc |
| **Usuwanie** | Usuniecie elementu (z potwierdzeniem) |

### 1.3 Selekcja a URL (Selection-URL Binding)

Zaznaczenie elementu na SLD aktualizuje adres URL w przegladarce:

```
/project/{project_id}/sld?selected={element_ref}&type={element_type}
```

**Gwarancje:**
- Odswiezenie strony z URL przywraca selekcje (deep link).
- Kopiowanie URL pozwala innej osobie otworzyc ten sam element.
- Ctrl+Click (multi-select) aktualizuje URL: `?selected={ref1},{ref2},...`

### 1.4 Jezyk polski --- 100%

Wszystkie elementy UI widoczne dla uzytkownika sa w jezyku polskim:
- Etykiety, komunikaty, tooltip, menu kontekstowe, naglowki tabel.
- Komunikaty bledow i walidacji.
- Raporty eksportowane (PDF, DOCX).

**ZABRONIONE:** Mieszanie jezykow w jednym widoku. Komentarze techniczne w kodzie moga
byc po angielsku, ale UI jest wylacznie po polsku.

### 1.5 Brak kodow projektowych

Kody projektowe (P7, P11, P14, P17, P20 itp.) NIE MOGA pojawiac sie w:
- Etykietach UI,
- Menu kontekstowych,
- Eksportach (PDF, DOCX, JSON),
- Artefaktach testowych.

Zamiast kodow uzywa sie polskich etykiet opisowych.

---

## 2. Matryca UI --- OBIEKT --> OPCJE MENU

### Konwencja zapisu

Kazda opcja menu jest opisana w formacie:

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| N | Nazwa po polsku | `nazwa_operacji` lub `[WIDOK]` | Nazwa modala lub `---` |

- **Operacja ENM_OP** --- wywolanie jednej z 10 kanonicznych operacji domenowych.
- **[WIDOK]** --- operacja widokowa (nie mutuje modelu, zmienia prezentacje).
- **[NAWIGACJA]** --- nawigacja do innego widoku/panelu.
- **Modal** --- jesli opcja otwiera modal, podana jest jego nazwa.

---

### A) Segment magistrali SN (30 opcji)

**Typ obiektu:** `branch` (typ: `cable` | `line_overhead`) nalezacy do `corridor`
**Kontekst:** Odcinek kabla lub linii napowietrznej w magistrali SN

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Wstaw stacje SN/nN (A) | `insert_station_on_segment_sn` payload: `station_type="A"` | `StacjaWstawModal` |
| 2 | Wstaw stacje SN/nN (B) | `insert_station_on_segment_sn` payload: `station_type="B"` | `StacjaWstawModal` |
| 3 | Wstaw stacje SN/nN (C) | `insert_station_on_segment_sn` payload: `station_type="C"` | `StacjaWstawModal` |
| 4 | Wstaw stacje SN/nN (D) | `insert_station_on_segment_sn` payload: `station_type="D"` | `StacjaWstawModal` |
| 5 | Wstaw lacznik sekcyjny | `insert_section_switch_sn` payload: `switch_type="ROZLACZNIK"` | `LacznikWstawModal` |
| 6 | Wstaw rozlacznik | `insert_section_switch_sn` payload: `switch_type="ROZLACZNIK"` | `LacznikWstawModal` |
| 7 | Wstaw uziemnik | `insert_section_switch_sn` payload: `switch_type="UZIEMNIK"` | `LacznikWstawModal` |
| 8 | Dodaj pomiar pradu (CT) | `update_element_parameters` + dowiazanie CT | `CTDodajModal` |
| 9 | Dodaj pomiar napiecia (VT) | `update_element_parameters` + dowiazanie VT | `VTDodajModal` |
| 10 | Przypisz katalog do odcinka | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 11 | Zmien typ odcinka (linia/kabel) | `update_element_parameters` payload: `parameters.rodzaj` | `TypOdcinkaModal` |
| 12 | Zmien dlugosc odcinka | `update_element_parameters` payload: `parameters.dlugosc_m` | `DlugoscModal` |
| 13 | Dodaj opis techniczny | `update_element_parameters` payload: `parameters.opis_techniczny` | `OpisTechnicznyModal` |
| 14 | Ustaw oznaczenie odcinka | `update_element_parameters` payload: `parameters.oznaczenie` | `OznaczenieModal` |
| 15 | Zmien nazwe | `update_element_parameters` payload: `parameters.name` | `ZmienNazweModal` |
| 16 | Pokaz gotowosc odcinka | `[WIDOK]` panel gotowosci | --- |
| 17 | Napraw braki odcinka | `[NAWIGACJA]` do FixAction z readiness | --- |
| 18 | Pokaz wyniki (z ostatniej analizy) | `[NAWIGACJA]` Results Browser + filtr element_ref | --- |
| 19 | Pokaz porownanie wynikow | `[NAWIGACJA]` Case Comparison + filtr element_ref | --- |
| 20 | White Box dla odcinka | `[NAWIGACJA]` Proof Inspector + filtr element_ref | --- |
| 21 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 22 | Cofnij do poprzedniego Snapshot | `[WIDOK]` Snapshot rollback selector | `SnapshotCofnijModal` |
| 23 | Porownaj Snapshot | `[NAWIGACJA]` Snapshot Comparison + element_ref | --- |
| 24 | Eksportuj dane odcinka (JSON) | `[EKSPORT]` JSON fragment dla element_ref | --- |
| 25 | Eksportuj fragment raportu (PDF/DOCX) | `[EKSPORT]` raport czesciowy | `EksportRaportModal` |
| 26 | Edytuj geometrie widoku odcinka | `[WIDOK]` tryb edycji geometrii | --- |
| 27 | Wyrownaj do siatki | `[WIDOK]` snap-to-grid | --- |
| 28 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 29 | Usun odcinek (z potwierdzeniem) | `[USUWANIE]` kaskadowe z walidacja | `PotwierdzUsunieciModal` |
| 30 | Sprawdz kolizje i odstepy | `[WIDOK]` analiza kolizji geometrycznych | --- |

---

### B) Terminal magistrali SN (20 opcji)

**Typ obiektu:** `TerminalRef` --- punkt koncowy magistrali lub odgalezienia
**Kontekst:** Bus na koncu magistrali z okreslonym statusem (`OTWARTY`, `ZAJETY`, `ZAREZERWOWANY_DLA_RINGU`)

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Dodaj odcinek magistrali | `continue_trunk_segment_sn` payload: `from_terminal_id=<this>` | `OdcinekDodajModal` |
| 2 | Zarezerwuj do ring | `update_element_parameters` payload: status=`ZAREZERWOWANY_DLA_RINGU` | `RezerwacjaRingModal` |
| 3 | Zwolnij rezerwacje ring | `update_element_parameters` payload: status=`OTWARTY` | --- |
| 4 | Rozpocznij laczenie wtorne | `connect_secondary_ring_sn` payload: `from_bus_ref=<this>` | `LaczenieWtorneModal` |
| 5 | Ustaw jako kandydat NOP | `set_normal_open_point` payload: `switch_ref` (jesli dostepny) | `NOPKandydatModal` |
| 6 | Przypisz katalog do nastepnego odcinka | `assign_catalog_to_element` (pre-fill dla nowego segmentu) | `KatalogPrzegladarka` |
| 7 | Zmien oznaczenie terminala | `update_element_parameters` payload: `parameters.oznaczenie` | `OznaczenieModal` |
| 8 | Pokaz gotowosc | `[WIDOK]` panel gotowosci dla terminala i polaczonych elementow | --- |
| 9 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 10 | Pokaz wyniki w punkcie | `[NAWIGACJA]` Results Browser + filtr bus_ref | --- |
| 11 | White Box | `[NAWIGACJA]` Proof Inspector + filtr bus_ref | --- |
| 12 | Pokaz historie | `[WIDOK]` panel historii (audit_trail) | --- |
| 13 | Eksport | `[EKSPORT]` dane terminala (JSON) | --- |
| 14 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 15 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 16 | Pokaz informacje topologiczne | `[WIDOK]` panel topologii (polaczenia, magistrala, odgalezienia) | --- |
| 17 | Pokaz logiczne polaczenia wtorne | `[WIDOK]` panel secondary_connectors | --- |
| 18 | Sprawdz mozliwosc ring | `[WIDOK]` walidacja warunkow zamkniecia pierscienia | --- |
| 19 | Sprawdz mozliwosc NOP | `[WIDOK]` walidacja warunkow ustawienia NOP | --- |
| 20 | Usun terminal | `[USUWANIE]` kaskadowe z walidacja | `PotwierdzUsunieciModal` |

---

### C) Stacja SN/nN (30 opcji)

**Typ obiektu:** `substation` (typ: `mv_lv`)
**Kontekst:** Stacja transformatorowa SN/nN z pelnym blokiem rozdzielnic SN i nN

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Dodaj pole SN liniowe IN | `update_element_parameters` payload: rola `LINIA_IN` | `PoleSNDodajModal` |
| 2 | Dodaj pole SN liniowe OUT | `update_element_parameters` payload: rola `LINIA_OUT` | `PoleSNDodajModal` |
| 3 | Dodaj pole SN odgalezione | `update_element_parameters` payload: rola `LINIA_ODG` | `PoleSNDodajModal` |
| 4 | Dodaj pole transformatorowe | `update_element_parameters` payload: rola `TRANSFORMATOROWE` | `PoleSNDodajModal` |
| 5 | Dodaj sekcje szyn SN | `update_element_parameters` payload: dodanie sekcji szyn | `SekcjaSzynSNModal` |
| 6 | Dodaj sprzeglo SN | `update_element_parameters` payload: rola `SPRZEGLO` | `SprzegloSNModal` |
| 7 | Dodaj CT do pola | `update_element_parameters` + dowiazanie CT do pola | `CTDodajModal` |
| 8 | Dodaj VT do pola | `update_element_parameters` + dowiazanie VT do pola | `VTDodajModal` |
| 9 | Dodaj przekaznik do pola | `update_element_parameters` + dowiazanie przekaznika | `PrzekaznikDodajModal` |
| 10 | Edytuj nastawy przekaznika | `update_element_parameters` payload: nastawy | `NastawyPrzekaznikaModal` |
| 11 | Wylicz krzywe TCC | `[NAWIGACJA]` Protection Curves + filtr station_ref | --- |
| 12 | Sprawdz selektywnosc | `[NAWIGACJA]` Protection Insight + filtr station_ref | --- |
| 13 | Dodaj transformator SN/nN | `add_transformer_sn_nn` payload: `station_ref=<this>` | `TransformatorDodajModal` |
| 14 | Przypisz katalog transformatora | `assign_catalog_to_element` payload: `element_ref=<trafo_ref>` | `KatalogPrzegladarka` |
| 15 | Dodaj szyne nN | `update_element_parameters` payload: dodanie szyny nN | `SzynaNNDodajModal` |
| 16 | Dodaj pole glowne nN | `update_element_parameters` payload: pole glowne nN | `PoleNNDodajModal` |
| 17 | Dodaj odplyw nN | `update_element_parameters` payload: odplyw nN | `OdplywNNDodajModal` |
| 18 | Dodaj sekcje szyn nN | `update_element_parameters` payload: sekcja szyn nN | `SekcjaSzynNNModal` |
| 19 | Dodaj sprzeglo nN | `update_element_parameters` payload: sprzeglo nN | `SprzegloNNModal` |
| 20 | Dodaj odbior nN | `update_element_parameters` payload: odbior nN | `OdbiorNNDodajModal` |
| 21 | Dodaj zrodlo nN (pole zrodlowe) | `update_element_parameters` payload: pole zrodlowe nN | `ZrodloNNDodajModal` |
| 22 | Dodaj falownik PV | `update_element_parameters` payload: falownik PV | `FalownikPVModal` |
| 23 | Dodaj falownik BESS | `update_element_parameters` payload: falownik BESS | `FalownikBESSModal` |
| 24 | Dodaj BESS (energia) | `update_element_parameters` payload: magazyn energii BESS | `BESSModal` |
| 25 | Dodaj agregat | `update_element_parameters` payload: agregat pradotworczy | `AgregatModal` |
| 26 | Dodaj UPS | `update_element_parameters` payload: zasilacz UPS | `UPSModal` |
| 27 | Ustaw tryb pracy zrodel | `update_element_parameters` payload: tryb_pracy_zrodel | `TrybPracyZrodelModal` |
| 28 | Pokaz gotowosc stacji | `[WIDOK]` panel gotowosci stacji | --- |
| 29 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 30 | Wyniki + White Box + Eksport | `[NAWIGACJA]` Results Browser + Proof Inspector + Eksport | --- |

---

### D) Pole nN zrodlowe (20 opcji)

**Typ obiektu:** `bay` (rola: `ZRODLOWE_NN`)
**Kontekst:** Pole zrodlowe nN w stacji --- punkt przylaczenia zrodel rozproszonych (OZE)

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Dodaj falownik PV | `update_element_parameters` payload: falownik PV | `FalownikPVModal` |
| 2 | Dodaj falownik BESS | `update_element_parameters` payload: falownik BESS | `FalownikBESSModal` |
| 3 | Dodaj magazyn BESS | `update_element_parameters` payload: magazyn energii BESS | `BESSModal` |
| 4 | Dodaj agregat pradotworczy | `update_element_parameters` payload: agregat | `AgregatModal` |
| 5 | Dodaj UPS | `update_element_parameters` payload: UPS | `UPSModal` |
| 6 | Ustaw tryb pracy zrodla | `update_element_parameters` payload: tryb_pracy | `TrybPracyZrodlaModal` |
| 7 | Przypisz katalog do zrodla | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 8 | Edytuj parametry pola | `update_element_parameters` | `ParametryPolaModal` |
| 9 | Dodaj CT do pola | `update_element_parameters` + dowiazanie CT | `CTDodajModal` |
| 10 | Dodaj VT do pola | `update_element_parameters` + dowiazanie VT | `VTDodajModal` |
| 11 | Dodaj przekaznik do pola | `update_element_parameters` + dowiazanie przekaznika | `PrzekaznikDodajModal` |
| 12 | Edytuj nastawy przekaznika | `update_element_parameters` payload: nastawy | `NastawyPrzekaznikaModal` |
| 13 | Pokaz gotowosc pola | `[WIDOK]` panel gotowosci | --- |
| 14 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 15 | Pokaz wyniki w punkcie | `[NAWIGACJA]` Results Browser + filtr bay_ref | --- |
| 16 | White Box | `[NAWIGACJA]` Proof Inspector + filtr bay_ref | --- |
| 17 | Pokaz historie | `[WIDOK]` panel historii (audit_trail) | --- |
| 18 | Eksport danych pola (JSON) | `[EKSPORT]` JSON fragment | --- |
| 19 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 20 | Usun pole zrodlowe (z potwierdzeniem) | `[USUWANIE]` kaskadowe z walidacja | `PotwierdzUsunieciModal` |

---

### E) Zrodlo SN (GPZ) (20 opcji)

**Typ obiektu:** `source` + `bus` (szyna GPZ) + `substation` (typ: `gpz`)
**Kontekst:** Punkt zasilania sieciowego SN --- pierwszy element sieci

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Edytuj parametry zrodla | `update_element_parameters` payload: `sk3_mva`, `ik3_ka`, `rx_ratio` | `ParametryZrodlaModal` |
| 2 | Zmien napiecie szyny GPZ | `update_element_parameters` payload: `voltage_kv` | `NapiecieGPZModal` |
| 3 | Zmien nazwe zrodla | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 4 | Zmien nazwe szyny GPZ | `update_element_parameters` payload: `bus_name` | `ZmienNazweModal` |
| 5 | Dodaj magistrale z GPZ | `continue_trunk_segment_sn` | `OdcinekDodajModal` |
| 6 | Dodaj odgalezienie z GPZ | `start_branch_segment_sn` payload: `from_bus_ref=<gpz_bus>` | `OdgalezienieDodajModal` |
| 7 | Przypisz katalog szyny | `assign_catalog_to_element` payload: `element_ref=<gpz_bus>` | `KatalogPrzegladarka` |
| 8 | Dodaj CT do szyny GPZ | `update_element_parameters` + dowiazanie CT | `CTDodajModal` |
| 9 | Dodaj VT do szyny GPZ | `update_element_parameters` + dowiazanie VT | `VTDodajModal` |
| 10 | Pokaz gotowosc GPZ | `[WIDOK]` panel gotowosci | --- |
| 11 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 12 | Pokaz wyniki zwarciowe w GPZ | `[NAWIGACJA]` Results Browser + filtr source_ref | --- |
| 13 | White Box dla GPZ | `[NAWIGACJA]` Proof Inspector + filtr source_ref | --- |
| 14 | Pokaz wklady zwarciowe | `[NAWIGACJA]` Element Inspector zakladka Contributions | --- |
| 15 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 16 | Eksport danych GPZ (JSON) | `[EKSPORT]` JSON fragment | --- |
| 17 | Eksport raportu GPZ (PDF/DOCX) | `[EKSPORT]` raport czesciowy | `EksportRaportModal` |
| 18 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 19 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 20 | Pokaz topologie z GPZ | `[WIDOK]` panel topologii (polaczenia, magistrale, odgalezienia) | --- |

---

### F) Szyna SN (20 opcji)

**Typ obiektu:** `bus` (poziom napiecia SN)
**Kontekst:** Wezel elektryczny (single potential) na poziomie SN

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Dodaj odcinek magistrali | `continue_trunk_segment_sn` payload: `from_terminal_id` | `OdcinekDodajModal` |
| 2 | Dodaj odgalezienie | `start_branch_segment_sn` payload: `from_bus_ref=<this>` | `OdgalezienieDodajModal` |
| 3 | Zmien nazwe szyny | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 4 | Zmien napiecie szyny | `update_element_parameters` payload: `voltage_kv` | `NapiecieSzynyModal` |
| 5 | Przypisz katalog do szyny | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 6 | Dodaj CT | `update_element_parameters` + dowiazanie CT | `CTDodajModal` |
| 7 | Dodaj VT | `update_element_parameters` + dowiazanie VT | `VTDodajModal` |
| 8 | Pokaz gotowosc szyny | `[WIDOK]` panel gotowosci | --- |
| 9 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 10 | Pokaz wyniki zwarciowe | `[NAWIGACJA]` Results Browser + filtr bus_ref | --- |
| 11 | Pokaz wklady zwarciowe | `[NAWIGACJA]` Element Inspector zakladka Contributions | --- |
| 12 | White Box | `[NAWIGACJA]` Proof Inspector + filtr bus_ref | --- |
| 13 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 14 | Porownaj wyniki miedzy Case | `[NAWIGACJA]` Case Comparison + filtr bus_ref | --- |
| 15 | Eksport danych szyny (JSON) | `[EKSPORT]` JSON fragment | --- |
| 16 | Eksport raportu szyny (PDF/DOCX) | `[EKSPORT]` raport czesciowy | `EksportRaportModal` |
| 17 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 18 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 19 | Pokaz polaczenia topologiczne | `[WIDOK]` panel topologii | --- |
| 20 | Usun szyne (z potwierdzeniem) | `[USUWANIE]` kaskadowe z walidacja | `PotwierdzUsunieciModal` |

---

### G) Port BRANCH (20 opcji)

**Typ obiektu:** `TerminalRef` nalezacy do `branch` (odgalezienie)
**Kontekst:** Punkt koncowy odgalezienia --- szyna z portem `branch_start` lub `branch_end`

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Kontynuuj odgalezienie | `start_branch_segment_sn` payload: `from_bus_ref=<this>` | `OdgalezienieDodajModal` |
| 2 | Wstaw stacje na odgalezieniu | `insert_station_on_segment_sn` payload: kontekst branch | `StacjaWstawModal` |
| 3 | Wstaw lacznik na odgalezieniu | `insert_section_switch_sn` | `LacznikWstawModal` |
| 4 | Polacz z magistrala (ring) | `connect_secondary_ring_sn` payload: `from_bus_ref=<this>` | `LaczenieWtorneModal` |
| 5 | Zmien nazwe portu | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 6 | Przypisz katalog do segmentu | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 7 | Zmien dlugosc segmentu | `update_element_parameters` payload: `dlugosc_m` | `DlugoscModal` |
| 8 | Zmien typ segmentu (kabel/linia) | `update_element_parameters` payload: `rodzaj` | `TypOdcinkaModal` |
| 9 | Pokaz gotowosc | `[WIDOK]` panel gotowosci | --- |
| 10 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 11 | Pokaz wyniki w punkcie | `[NAWIGACJA]` Results Browser + filtr bus_ref | --- |
| 12 | White Box | `[NAWIGACJA]` Proof Inspector + filtr bus_ref | --- |
| 13 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 14 | Eksport danych portu (JSON) | `[EKSPORT]` JSON fragment | --- |
| 15 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 16 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 17 | Pokaz polaczenia topologiczne | `[WIDOK]` panel topologii | --- |
| 18 | Pokaz logiczne polaczenia wtorne | `[WIDOK]` panel secondary_connectors | --- |
| 19 | Sprawdz mozliwosc polaczenia ring | `[WIDOK]` walidacja ring | --- |
| 20 | Usun odgalezienie (z potwierdzeniem) | `[USUWANIE]` kaskadowe z walidacja | `PotwierdzUsunieciModal` |

---

### H) Aparat w polu SN (20 opcji)

**Typ obiektu:** `device` w `bay` (rola: rozlacznik, wylacznik, uziemnik w polu SN)
**Kontekst:** Aparatura laczeniowa zainstalowana w polu rozdzielnicy SN

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Zmien stan (otwarty/zamkniety) | `update_element_parameters` payload: `status` | --- |
| 2 | Zmien typ aparatu | `update_element_parameters` payload: `device_type` | `TypAparatuModal` |
| 3 | Przypisz katalog | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 4 | Edytuj parametry znamionowe | `update_element_parameters` payload: parametry znamionowe | `ParametryAparatuModal` |
| 5 | Zmien nazwe | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 6 | Dodaj CT do aparatu | `update_element_parameters` + dowiazanie CT | `CTDodajModal` |
| 7 | Dodaj VT do aparatu | `update_element_parameters` + dowiazanie VT | `VTDodajModal` |
| 8 | Dodaj przekaznik | `update_element_parameters` + dowiazanie przekaznika | `PrzekaznikDodajModal` |
| 9 | Edytuj nastawy przekaznika | `update_element_parameters` payload: nastawy | `NastawyPrzekaznikaModal` |
| 10 | Ustaw jako NOP | `set_normal_open_point` payload: `switch_ref=<this>` | --- |
| 11 | Pokaz gotowosc | `[WIDOK]` panel gotowosci | --- |
| 12 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 13 | Pokaz wyniki zwarciowe w punkcie | `[NAWIGACJA]` Results Browser | --- |
| 14 | White Box | `[NAWIGACJA]` Proof Inspector | --- |
| 15 | Pokaz krzywe TCC | `[NAWIGACJA]` Protection Curves + filtr device_ref | --- |
| 16 | Sprawdz selektywnosc | `[NAWIGACJA]` Protection Insight + filtr device_ref | --- |
| 17 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 18 | Eksport danych aparatu (JSON) | `[EKSPORT]` JSON fragment | --- |
| 19 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 20 | Usun aparat (z potwierdzeniem) | `[USUWANIE]` z walidacja | `PotwierdzUsunieciModal` |

---

### I) Przekaznik logiczny (20 opcji)

**Typ obiektu:** `relay` (przekaznik zabezpieczeniowy powiazany z polem)
**Kontekst:** Urzadzenie zabezpieczeniowe z nastawami i krzywymi TCC

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Edytuj nastawy przekaznika | `update_element_parameters` payload: nastawy | `NastawyPrzekaznikaModal` |
| 2 | Zmien typ przekaznika | `update_element_parameters` payload: `relay_type` | `TypPrzekaznikaModal` |
| 3 | Przypisz katalog | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 4 | Zmien nazwe | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 5 | Przypisz do CT | `update_element_parameters` payload: `ct_ref` | `CTWybierzModal` |
| 6 | Przypisz do VT | `update_element_parameters` payload: `vt_ref` | `VTWybierzModal` |
| 7 | Wylicz krzywe TCC | `[NAWIGACJA]` Protection Curves + filtr relay_ref | --- |
| 8 | Sprawdz selektywnosc | `[NAWIGACJA]` Protection Insight + filtr relay_ref | --- |
| 9 | Pokaz koordynacje z innymi przekaznikami | `[NAWIGACJA]` Protection Coordination View | --- |
| 10 | Pokaz stefe ochronna | `[WIDOK]` wizualizacja strefy ochronnej na SLD | --- |
| 11 | Pokaz gotowosc | `[WIDOK]` panel gotowosci | --- |
| 12 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 13 | Pokaz wyniki zwarciowe w punkcie ochrony | `[NAWIGACJA]` Results Browser + filtr | --- |
| 14 | White Box | `[NAWIGACJA]` Proof Inspector | --- |
| 15 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 16 | Eksport nastaw (JSON) | `[EKSPORT]` JSON fragment | --- |
| 17 | Eksport raportu ochrony (PDF/DOCX) | `[EKSPORT]` raport ochrony | `EksportRaportModal` |
| 18 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 19 | Kopiuj nastawy z innego przekaznika | `update_element_parameters` (kopiowanie) | `KopiujNastawyModal` |
| 20 | Usun przekaznik (z potwierdzeniem) | `[USUWANIE]` z walidacja | `PotwierdzUsunieciModal` |

---

### J) CT/VT --- Przekladnik pradowy/napieciowy (20 opcji)

**Typ obiektu:** `ct` (przekladnik pradowy) lub `vt` (przekladnik napieciowy)
**Kontekst:** Urzadzenie pomiarowe powiazane z polem lub szyna

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Edytuj parametry przekladnika | `update_element_parameters` payload: parametry | `ParametryCTVTModal` |
| 2 | Zmien przekladnie | `update_element_parameters` payload: `ratio` | `PrzekladniaModal` |
| 3 | Zmien klase dokladnosci | `update_element_parameters` payload: `accuracy_class` | `KlasaDokladnosciModal` |
| 4 | Przypisz katalog | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 5 | Zmien nazwe | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 6 | Przypisz do pola | `update_element_parameters` payload: `bay_ref` | `PoleWybierzModal` |
| 7 | Przypisz do szyny | `update_element_parameters` payload: `bus_ref` | `SzynaWybierzModal` |
| 8 | Przypisz przekaznik | `update_element_parameters` payload: `relay_ref` | `PrzekaznikWybierzModal` |
| 9 | Pokaz powiazane przekazniki | `[WIDOK]` lista przekaznikow podlaczonych do CT/VT | --- |
| 10 | Pokaz gotowosc | `[WIDOK]` panel gotowosci | --- |
| 11 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 12 | Sprawdz nasycenie CT | `[WIDOK]` analiza nasycenia (tylko CT) | --- |
| 13 | Sprawdz obciazenie CT/VT | `[WIDOK]` analiza obciazenia przekladnika | --- |
| 14 | White Box | `[NAWIGACJA]` Proof Inspector | --- |
| 15 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 16 | Eksport danych (JSON) | `[EKSPORT]` JSON fragment | --- |
| 17 | Eksport raportu przekladnika (PDF/DOCX) | `[EKSPORT]` raport czesciowy | `EksportRaportModal` |
| 18 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 19 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 20 | Usun przekladnik (z potwierdzeniem) | `[USUWANIE]` z walidacja | `PotwierdzUsunieciModal` |

---

### K) Szyna nN (20 opcji)

**Typ obiektu:** `bus` (poziom napiecia nN)
**Kontekst:** Wezel elektryczny na poziomie niskiego napiecia w stacji SN/nN

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Dodaj pole glowne nN | `update_element_parameters` payload: pole glowne nN | `PoleNNDodajModal` |
| 2 | Dodaj odplyw nN | `update_element_parameters` payload: odplyw nN | `OdplywNNDodajModal` |
| 3 | Dodaj sekcje szyn nN | `update_element_parameters` payload: sekcja szyn nN | `SekcjaSzynNNModal` |
| 4 | Dodaj sprzeglo nN | `update_element_parameters` payload: sprzeglo nN | `SprzegloNNModal` |
| 5 | Dodaj pole zrodlowe nN | `update_element_parameters` payload: pole zrodlowe nN | `ZrodloNNDodajModal` |
| 6 | Zmien nazwe szyny | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 7 | Zmien napiecie szyny | `update_element_parameters` payload: `voltage_kv` | `NapiecieSzynyModal` |
| 8 | Przypisz katalog do szyny | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 9 | Dodaj CT | `update_element_parameters` + dowiazanie CT | `CTDodajModal` |
| 10 | Dodaj VT | `update_element_parameters` + dowiazanie VT | `VTDodajModal` |
| 11 | Pokaz gotowosc szyny | `[WIDOK]` panel gotowosci | --- |
| 12 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 13 | Pokaz wyniki zwarciowe | `[NAWIGACJA]` Results Browser + filtr bus_ref | --- |
| 14 | Pokaz wklady zwarciowe | `[NAWIGACJA]` Element Inspector zakladka Contributions | --- |
| 15 | White Box | `[NAWIGACJA]` Proof Inspector + filtr bus_ref | --- |
| 16 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 17 | Eksport danych szyny nN (JSON) | `[EKSPORT]` JSON fragment | --- |
| 18 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 19 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 20 | Usun szyne nN (z potwierdzeniem) | `[USUWANIE]` kaskadowe z walidacja | `PotwierdzUsunieciModal` |

---

### L) Odbior nN (20 opcji)

**Typ obiektu:** `load` (odbior na poziomie nN)
**Kontekst:** Odbior koncowy przylaczony do szyny nN

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Edytuj parametry odbioru | `update_element_parameters` payload: parametry obciazenia | `ParametryOdbioruModal` |
| 2 | Zmien moc odbioru | `update_element_parameters` payload: `p_kw`, `q_kvar` | `MocOdbioruModal` |
| 3 | Zmien typ odbioru | `update_element_parameters` payload: `load_type` | `TypOdbioruModal` |
| 4 | Zmien wspolczynnik mocy (cos phi) | `update_element_parameters` payload: `cos_phi` | `CosPhiModal` |
| 5 | Zmien nazwe | `update_element_parameters` payload: `name` | `ZmienNazweModal` |
| 6 | Przypisz katalog | `assign_catalog_to_element` | `KatalogPrzegladarka` |
| 7 | Przypisz do szyny nN | `update_element_parameters` payload: `bus_ref` | `SzynaWybierzModal` |
| 8 | Ustaw profil obciazenia | `update_element_parameters` payload: `load_profile` | `ProfilObciazeniaModal` |
| 9 | Pokaz gotowosc | `[WIDOK]` panel gotowosci | --- |
| 10 | Napraw braki | `[NAWIGACJA]` do FixAction z readiness | --- |
| 11 | Pokaz wyniki (wplyw na rozplyw mocy) | `[NAWIGACJA]` Results Browser + filtr load_ref | --- |
| 12 | White Box | `[NAWIGACJA]` Proof Inspector + filtr load_ref | --- |
| 13 | Pokaz historie zmian | `[WIDOK]` panel historii (audit_trail) | --- |
| 14 | Porownaj wyniki miedzy Case | `[NAWIGACJA]` Case Comparison + filtr load_ref | --- |
| 15 | Eksport danych odbioru (JSON) | `[EKSPORT]` JSON fragment | --- |
| 16 | Eksport raportu odbioru (PDF/DOCX) | `[EKSPORT]` raport czesciowy | `EksportRaportModal` |
| 17 | Edytuj geometrie widoku | `[WIDOK]` tryb edycji geometrii | --- |
| 18 | Reset geometrii widoku | `[WIDOK]` przywrocenie layoutu automatycznego | --- |
| 19 | Kopiuj odbior (duplikacja) | `update_element_parameters` (tworzenie kopii) | `KopiujOdbiorModal` |
| 20 | Usun odbior (z potwierdzeniem) | `[USUWANIE]` z walidacja | `PotwierdzUsunieciModal` |

---

### M) StudyCase (20 opcji)

**Typ obiektu:** `case` (scenariusz obliczeniowy)
**Kontekst:** Scenariusz obliczeniowy referencujacy model (read-only). Case NIE mutuje NetworkModel.

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Aktywuj Case | `[WIDOK]` ustawienie Case jako aktywnego | --- |
| 2 | Edytuj parametry Case | `[WIDOK]` panel edycji parametrow obliczeniowych | `ParametryCaseModal` |
| 3 | Zmien nazwe Case | `[WIDOK]` zmiana nazwy | `ZmienNazweModal` |
| 4 | Zmien typ zwarcia | `[WIDOK]` panel: `3F`, `2F`, `1F`, `2FE` | `TypZwarciaModal` |
| 5 | Zmien scenariusz (MAX/MIN) | `[WIDOK]` panel: MAX, MIN, N-1 | `ScenariuszModal` |
| 6 | Ustaw parametry rozplywu mocy | `[WIDOK]` panel Newton-Raphson | `RozplywMocyModal` |
| 7 | Uruchom obliczenia zwarciowe | `[OBLICZENIA]` solver SC IEC 60909 | --- |
| 8 | Uruchom rozplyw mocy | `[OBLICZENIA]` solver PF Newton-Raphson | --- |
| 9 | Uruchom wszystkie analizy | `[OBLICZENIA]` SC + PF sekwencyjnie | --- |
| 10 | Pokaz wyniki | `[NAWIGACJA]` Results Browser + filtr case_id | --- |
| 11 | Pokaz porownanie z innym Case | `[NAWIGACJA]` Case Comparison | --- |
| 12 | Pokaz White Box (wszystkie wezly) | `[NAWIGACJA]` Proof Inspector | --- |
| 13 | Pokaz gotowosc modelu | `[WIDOK]` panel gotowosci (readiness) | --- |
| 14 | Napraw braki modelu | `[NAWIGACJA]` do FixAction z readiness | --- |
| 15 | Eksport wynikow Case (JSON) | `[EKSPORT]` JSON pelny | --- |
| 16 | Eksport raportu Case (PDF/DOCX) | `[EKSPORT]` raport pelny | `EksportRaportModal` |
| 17 | Klonuj Case | `[WIDOK]` tworzenie kopii Case (wyniki = NONE) | `KlonujCaseModal` |
| 18 | Pokaz historie obliczen | `[WIDOK]` panel historii uruchomien | --- |
| 19 | Pokaz metadane Case | `[WIDOK]` panel metadanych (snapshot_hash, solver_hash) | --- |
| 20 | Usun Case (z potwierdzeniem) | `[USUWANIE]` z walidacja | `PotwierdzUsunieciModal` |

**UWAGA:** Case NIE mutuje NetworkModel. Opcje 1--6 modyfikuja WYLACZNIE parametry obliczeniowe
Case (konfiguracje scenariusza), NIE elementy sieci.

---

### N) Wynik analizy (20 opcji)

**Typ obiektu:** `analysis_result` (wynik uruchomienia solvera)
**Kontekst:** Wynik obliczen (SC lub PF) powiazany z Case i Snapshot

| # | Nazwa opcji (PL) | Operacja ENM_OP / Widok | Modal |
|---|-------------------|-------------------------|-------|
| 1 | Pokaz wyniki tabelarycznie | `[NAWIGACJA]` Results Browser zakladka Table | --- |
| 2 | Pokaz wyniki na SLD (overlay) | `[NAWIGACJA]` SLD + SCADA overlay z wynikami | --- |
| 3 | Pokaz White Box (dowod obliczeniowy) | `[NAWIGACJA]` Proof Inspector | --- |
| 4 | Pokaz wklady zwarciowe | `[NAWIGACJA]` Element Inspector zakladka Contributions | --- |
| 5 | Pokaz profil napiec | `[NAWIGACJA]` Voltage Profile View | --- |
| 6 | Pokaz obciazalnosc termiczna | `[NAWIGACJA]` Thermal Analysis View | --- |
| 7 | Porownaj z innym wynikiem | `[NAWIGACJA]` Case Comparison + Batch Compare | --- |
| 8 | Pokaz delta overlay na SLD | `[NAWIGACJA]` SLD + Delta Overlay | --- |
| 9 | Filtruj wyniki (po typie elementu) | `[WIDOK]` filtr Results Browser | --- |
| 10 | Filtruj wyniki (po wartosci) | `[WIDOK]` filtr zakresu wartosci | --- |
| 11 | Sortuj wyniki | `[WIDOK]` sortowanie Results Browser | --- |
| 12 | Eksport wynikow (JSON) | `[EKSPORT]` JSON wynikow | --- |
| 13 | Eksport wynikow (CSV/Excel) | `[EKSPORT]` CSV lub Excel | --- |
| 14 | Eksport raportu wynikow (PDF/DOCX) | `[EKSPORT]` raport wynikow | `EksportRaportModal` |
| 15 | Eksport White Box (PDF) | `[EKSPORT]` dowod obliczeniowy PDF | --- |
| 16 | Pokaz metadane analizy | `[WIDOK]` panel: solver_hash, run_id, timestamp, norma | --- |
| 17 | Pokaz trace obliczeniowy | `[WIDOK]` TraceArtifact viewer | --- |
| 18 | Pokaz historie uruchomien | `[WIDOK]` panel historii uruchomien solvera | --- |
| 19 | Pokaz zaleznosci (Case + Snapshot) | `[WIDOK]` panel referencji | --- |
| 20 | Usun wynik (z potwierdzeniem) | `[USUWANIE]` z walidacja | `PotwierdzUsunieciModal` |

---

## 3. Tabela modali (BINDING)

Ponizej znajduje sie kanoniczna lista wszystkich modali referencjonowanych w matrycy UI.
Kazdy modal jest samodzielnym komponentem React z walidacja formularza (react-hook-form + zod).

| Nazwa modala | Cel | Pola kluczowe | Walidacja |
|--------------|-----|---------------|-----------|
| `StacjaWstawModal` | Wstawienie stacji SN/nN na segmencie | station_type, insert_at, sn_voltage_kv, nn_voltage_kv, sn_fields | station_type wymagany, nn_voltage_kv > 0 |
| `LacznikWstawModal` | Wstawienie lacznika sekcyjnego | switch_type, insert_at, normal_state | segment_id wymagany |
| `CTDodajModal` | Dodanie przekladnika pradowego | ratio, accuracy_class, bay_ref | ratio > 0 |
| `VTDodajModal` | Dodanie przekladnika napieciowego | ratio, accuracy_class, bay_ref | ratio > 0 |
| `KatalogPrzegladarka` | Wybor pozycji katalogowej | category, search, filters | catalog_item_id wymagany |
| `TypOdcinkaModal` | Zmiana typu odcinka | rodzaj (KABEL/LINIA_NAPOWIETRZNA) | rodzaj wymagany |
| `DlugoscModal` | Zmiana dlugosci odcinka | dlugosc_m | dlugosc_m > 0 |
| `OpisTechnicznyModal` | Dodanie opisu technicznego | opis_techniczny | tekst, max 2000 znakow |
| `OznaczenieModal` | Ustawienie oznaczenia | oznaczenie | tekst, max 50 znakow |
| `ZmienNazweModal` | Zmiana nazwy elementu | name | tekst, max 100 znakow, unikalnosc |
| `SnapshotCofnijModal` | Cofniecie do Snapshot | snapshot_hash, potwierdzenie | hash istniejacego Snapshot |
| `EksportRaportModal` | Konfiguracja eksportu raportu | format (PDF/DOCX), zakres, sekcje | format wymagany |
| `PotwierdzUsunieciModal` | Potwierdzenie usuwania | element_ref, kaskadowosc | jawne potwierdzenie |
| `OdcinekDodajModal` | Dodanie odcinka magistrali | rodzaj, dlugosc_m, catalog_ref | dlugosc_m > 0, rodzaj wymagany |
| `RezerwacjaRingModal` | Rezerwacja terminala do ring | potwierdzenie | terminal musi byc OTWARTY |
| `LaczenieWtorneModal` | Polaczenie wtorne (ring) | from_bus_ref, to_bus_ref, dlugosc_m | obie szyny musza istniec |
| `NOPKandydatModal` | Ustawienie NOP | switch_ref, corridor_ref | switch_ref musi istniec |
| `PoleSNDodajModal` | Dodanie pola SN | rola, nazwa, aparatura | rola wymagana |
| `PrzekaznikDodajModal` | Dodanie przekaznika | relay_type, ct_ref | relay_type wymagany |
| `NastawyPrzekaznikaModal` | Edycja nastaw przekaznika | I_pickup, time_dial, curve_type | I_pickup > 0 |
| `TransformatorDodajModal` | Dodanie transformatora | hv_bus_ref, lv_bus_ref, catalog_ref | szyny musza istniec |
| `SzynaNNDodajModal` | Dodanie szyny nN | voltage_kv, name | voltage_kv > 0 |
| `PoleNNDodajModal` | Dodanie pola glownego nN | nazwa, typ | --- |
| `OdplywNNDodajModal` | Dodanie odplywu nN | nazwa, typ, obciazenie | --- |
| `SekcjaSzynSNModal` | Dodanie sekcji szyn SN | nazwa, polaczenia | --- |
| `SekcjaSzynNNModal` | Dodanie sekcji szyn nN | nazwa, polaczenia | --- |
| `SprzegloSNModal` | Dodanie sprzegla SN | nazwa, normal_state | --- |
| `SprzegloNNModal` | Dodanie sprzegla nN | nazwa, normal_state | --- |
| `OdbiorNNDodajModal` | Dodanie odbioru nN | p_kw, q_kvar, cos_phi, load_type | p_kw >= 0 |
| `ZrodloNNDodajModal` | Dodanie zrodla nN | typ (PV/BESS/agregat/UPS) | typ wymagany |
| `FalownikPVModal` | Konfiguracja falownika PV | p_max_kw, cos_phi, tryb_pracy | p_max_kw > 0 |
| `FalownikBESSModal` | Konfiguracja falownika BESS | p_max_kw, tryb_pracy | p_max_kw > 0 |
| `BESSModal` | Konfiguracja magazynu BESS | capacity_kwh, soc_min, soc_max | capacity_kwh > 0 |
| `AgregatModal` | Konfiguracja agregatu | p_max_kw, typ_paliwa | p_max_kw > 0 |
| `UPSModal` | Konfiguracja UPS | p_max_kw, autonomia_min | p_max_kw > 0 |
| `TrybPracyZrodelModal` | Ustawienie trybu pracy zrodel | tryb (rownolegle/rezerwowe/wyspowe) | tryb wymagany |
| `TrybPracyZrodlaModal` | Ustawienie trybu pracy zrodla | tryb | tryb wymagany |
| `ParametryZrodlaModal` | Edycja parametrow GPZ | sk3_mva, ik3_ka, rx_ratio | sk3_mva > 0 |
| `NapiecieGPZModal` | Zmiana napiecia GPZ | voltage_kv | voltage_kv > 0 |
| `OdgalezienieDodajModal` | Dodanie odgalezienia | from_bus_ref, rodzaj, dlugosc_m | from_bus_ref wymagany, dlugosc_m > 0 |
| `NapiecieSzynyModal` | Zmiana napiecia szyny | voltage_kv | voltage_kv > 0 |
| `ParametryAparatuModal` | Edycja parametrow aparatu | In_a, Ik_ka, typ | In_a > 0 |
| `TypAparatuModal` | Zmiana typu aparatu | device_type | device_type wymagany |
| `TypPrzekaznikaModal` | Zmiana typu przekaznika | relay_type | relay_type wymagany |
| `CTWybierzModal` | Wybor CT do przypisania | ct_ref z listy | ct_ref wymagany |
| `VTWybierzModal` | Wybor VT do przypisania | vt_ref z listy | vt_ref wymagany |
| `PrzekaznikWybierzModal` | Wybor przekaznika | relay_ref z listy | relay_ref wymagany |
| `PoleWybierzModal` | Wybor pola | bay_ref z listy | bay_ref wymagany |
| `SzynaWybierzModal` | Wybor szyny | bus_ref z listy | bus_ref wymagany |
| `PrzekladniaModal` | Zmiana przekladni CT/VT | ratio_primary, ratio_secondary | oba > 0 |
| `KlasaDokladnosciModal` | Zmiana klasy dokladnosci | accuracy_class | wartosc z enum |
| `ParametryCTVTModal` | Edycja parametrow CT/VT | wszystkie parametry | zaleznie od typu |
| `ParametryCaseModal` | Edycja parametrow Case | fault_type, scenario, pf_params | fault_type wymagany |
| `TypZwarciaModal` | Zmiana typu zwarcia | fault_type (3F/2F/1F/2FE) | wartosc z enum |
| `ScenariuszModal` | Zmiana scenariusza | scenario (MAX/MIN/N-1) | wartosc z enum |
| `RozplywMocyModal` | Konfiguracja rozplywu mocy | max_iterations, tolerance | max_iterations > 0 |
| `KlonujCaseModal` | Klonowanie Case | new_name | nazwa unikalna |
| `ParametryOdbioruModal` | Edycja parametrow odbioru | p_kw, q_kvar, cos_phi, load_type | p_kw >= 0 |
| `MocOdbioruModal` | Zmiana mocy odbioru | p_kw, q_kvar | p_kw >= 0 |
| `TypOdbioruModal` | Zmiana typu odbioru | load_type | wartosc z enum |
| `CosPhiModal` | Zmiana cos phi | cos_phi | 0 < cos_phi <= 1 |
| `ProfilObciazeniaModal` | Ustawienie profilu obciazenia | load_profile | profil z listy |
| `KopiujNastawyModal` | Kopiowanie nastaw przekaznika | source_relay_ref | relay_ref istniejacy |
| `KopiujOdbiorModal` | Kopiowanie odbioru | source_load_ref, target_bus_ref | oba wymagane |
| `ParametryPolaModal` | Edycja parametrow pola | parametry zaleznie od roli pola | --- |

---

## 4. Gwarancje spojnosci

### 4.1 Kazda operacja ENM_OP zwraca pelny Snapshot

Po kazdej mutacji modelu frontend otrzymuje pelny Snapshot + readiness + logical_views.
Menu kontekstowe sa aktualizowane dynamicznie na podstawie nowego stanu.

### 4.2 Opcje menu zaleza od stanu elementu

Opcje menu sa filtrowane na podstawie:
- **Typu elementu** (branch, bus, substation, ...),
- **Stanu elementu** (OTWARTY/ZAJETY/ZAREZERWOWANY_DLA_RINGU),
- **Roli uzytkownika** (Expert Mode: Operator, Designer, Analyst, Auditor),
- **Stanu gotowosci** (blokery wplywaja na dostepnosc opcji obliczeniowych).

### 4.3 Hierarchia modulow UI

```
Menu kontekstowe
  |-- wywoluje --> ENM_OP (operacja domenowa)
  |-- otwiera --> Modal (formularz z walidacja)
  |-- nawiguje --> Results Browser / Proof Inspector / Protection Curves
  |-- pokazuje --> Panel widokowy (readiness, historia, topologia)
```

### 4.4 Numeracja opcji

Numeracja opcji w kazdej matrycy jest stabilna i nie zmienia sie miedzy wersjami.
Nowe opcje sa ZAWSZE dodawane na koncu listy.

---

## 5. Podsumowanie matrycy

| Obiekt | Liczba opcji | Sekcja |
|--------|--------------|--------|
| Segment magistrali SN | 30 | A |
| Terminal magistrali SN | 20 | B |
| Stacja SN/nN | 30 | C |
| Pole nN zrodlowe | 20 | D |
| Zrodlo SN (GPZ) | 20 | E |
| Szyna SN | 20 | F |
| Port BRANCH | 20 | G |
| Aparat w polu SN | 20 | H |
| Przekaznik logiczny | 20 | I |
| CT/VT | 20 | J |
| Szyna nN | 20 | K |
| Odbior nN | 20 | L |
| StudyCase | 20 | M |
| Wynik analizy | 20 | N |
| **SUMA** | **300** | |

---

**KONIEC DOKUMENTU UI_UX_10_10_ABSOLUTE_CANONICAL.md**
**Status:** CANONICAL (BINDING)
**Dokument jest zrodlem prawdy dla matrycy obiekt-menu-modal w MV-DESIGN-PRO.**
