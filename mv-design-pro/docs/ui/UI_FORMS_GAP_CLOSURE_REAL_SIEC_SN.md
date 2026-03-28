# Przeglad formularzy -- domkniecie luk dla realnej sieci SN

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Data            | 2026-03-28                                                                   |
| Zakres          | 8 formularzy budowy sieci SN w `ui/network-build/forms/`                     |
| Metoda          | Analiza: jakie dane zbiera modal, czego nie zbiera i dlaczego                |
| Status dokumentu| **ZAMKNIETY**                                                                |

---

## Architektura formularzy

Formularze w `ui/network-build/forms/` sa **thin wrapperami** nad production-grade
modalami z `ui/topology/modals/`. Modaly zbieraja pelne dane inzynierskie (parametry
elektryczne, catalog_ref, powiazania topologiczne). Wrappery zapewniaja:

1. **Kontekst** -- pobieranie aktywnego elementu, stacji, trunk ID ze store'ow
   (`networkBuildStore`, `snapshotStore`, `selectionStore`).
2. **Routing** -- inline rendering w panelu inspektora zamiast overlay.
3. **Callback** -- po zapisie: `closeOperationForm()` + odswiezenie snapshota.

Kazdy wrapper deleguje cala logike zbierania danych do modala.

---

## Przeglad formularzy

### 1. AddGridSourceForm

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/AddGridSourceForm.tsx`                                                |
| Cel             | Dodanie zrodla zasilania (GPZ / External Grid) do sieci SN                   |
| Modal docelowy  | `MODAL_DODAJ_ZRODLO_SN`                                                     |
| Dane zbierane   | Nazwa zrodla, napiecie znamionowe U_n [kV], moc zwarciowa S_kQ [MVA], stosunek R/X, typ zrodla (grid/generator) |
| Czego NIE zbiera| `catalog_ref` -- Source nie ma referencji katalogowej. Parametry GPZ (S_kQ, R/X, U_n) definiowane sa bezposrednio, zgodnie z IEC 60909 (zrodlo zewnetrzne modelowane przez impedancje zastecza). To swiadoma decyzja architektoniczna, nie luka. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 2. ContinueTrunkForm

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/ContinueTrunkForm.tsx`                                                |
| Cel             | Kontynuacja magistrali SN -- dodanie kolejnego segmentu linii/kabla          |
| Modal docelowy  | `MODAL_KONTYNUUJ_MAGISTRALE`                                                |
| Dane zbierane   | Typ przewodu (linia napowietrzna / kabel), dlugosc [km], catalog_ref (typ z katalogu), bus docelowy, nazwa segmentu |
| Czego NIE zbiera| Impedancja bezposrednio -- pochodzi z catalog_ref po materializacji. Poprawne: unika duplikacji parametrow. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 3. InsertStationForm

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/InsertStationForm.tsx`                                                |
| Cel             | Wstawienie stacji transformatorowej SN/nN na magistrali                       |
| Modal docelowy  | `MODAL_WSTAW_STACJE_SN`                                                     |
| Dane zbierane   | Nazwa stacji, typ stacji (slupowa/wnektrzowa/kontenerowa), pozycja na magistrali (bus docelowy), konfiguracja pol SN |
| Czego NIE zbiera| Parametry transformatora -- dodawany osobnym krokiem (AddTransformerForm). Rozdzielnica nN -- tworzona automatycznie przy dodaniu trafo. Poprawna separacja krokow kreacji. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 4. StartBranchForm

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/StartBranchForm.tsx`                                                  |
| Cel             | Rozpoczecie odgalezienia SN od magistrali                                    |
| Modal docelowy  | `MODAL_DODAJ_ODGALEZIENIE_SN`                                               |
| Dane zbierane   | Punkt odgalezienia (bus na magistrali), typ przewodu, dlugosc [km], catalog_ref, nazwa odgalezienia |
| Czego NIE zbiera| Konfiguracja zabezpieczenia w punkcie odgalezienia -- dodawana przez FixAction po walidacji. Poprawne: zabezpieczenia nie sa czescia topologii. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 5. InsertSwitchForm (InsertSectionSwitchForm)

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/InsertSectionSwitchForm.tsx`                                          |
| Cel             | Wstawienie lacznika sekcyjnego (section switch / NOP) na magistrali          |
| Modal docelowy  | `MODAL_WSTAW_LACZNIK_SEKCYJNY`                                              |
| Dane zbierane   | Pozycja na magistrali (bus), typ lacznika (rozlacznik/wylacznik), stan poczatkowy (otwarty/zamkniety), oznaczenie NOP |
| Czego NIE zbiera| Parametry znamionowe lacznika (I_n, I_dyn) -- opcjonalne, pobierane z katalogu jesli przypisany. Dla NOP kluczowy jest stan (otwarty) a nie parametry znamionowe. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 6. AddPVForm (AddOzeSourceForm -- tryb PV)

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/AddOzeSourceForm.tsx` (tryb: photovoltaic)                            |
| Cel             | Dodanie zrodla fotowoltaicznego (PV) do sieci nN lub SN                      |
| Modal docelowy  | `MODAL_DODAJ_ZRODLO_OZE`                                                    |
| Dane zbierane   | Moc zainstalowana P_inst [kWp], moc znamionowa P_n [kW], typ falownika, cos(phi) lub Q regulowane, punkt przylaczenia (bus), nazwa |
| Czego NIE zbiera| Profil generacji godzinowej -- naleza do Study Case (parametry scenariusza), nie do modelu sieci. Zgodne z Case Immutability Rule. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 7. AddBESSForm (AddOzeSourceForm -- tryb BESS)

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/AddOzeSourceForm.tsx` (tryb: battery)                                 |
| Cel             | Dodanie magazynu energii (BESS) do sieci                                     |
| Modal docelowy  | `MODAL_DODAJ_ZRODLO_OZE`                                                    |
| Dane zbierane   | Pojemnosc E [kWh], moc P_max [kW], tryb pracy (ladowanie/rozladowanie/standby), punkt przylaczenia (bus), nazwa |
| Czego NIE zbiera| Strategia zarzadzania energia -- nalezy do warstwy Study Case / analiz, nie modelu topologicznego. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

### 8. SetNopForm (ConnectRingForm)

| Pole            | Wartosc                                                                      |
|-----------------|------------------------------------------------------------------------------|
| Plik            | `forms/ConnectRingForm.tsx`                                                  |
| Cel             | Zamkniecie pierscienia SN (ring) i wyznaczenie NOP (Normally Open Point)     |
| Modal docelowy  | `MODAL_ZAMKNIJ_PIERSCIEN`                                                   |
| Dane zbierane   | Lacznik NOP (wybor z istniejacych lacznikow sekcyjnych), bus koncowy do polaczenia, potwierdzenie zmiany topologii |
| Czego NIE zbiera| Automatyczne wyliczenie optymalnego NOP -- to jest zadanie analizy (power flow), nie formularza kreacji. Formularz ustala NOP manualnie. |
| Werdykt         | **WYSTARCZAJACY**                                                            |

---

## Podsumowanie

| Formularz                | Werdykt          | Uwagi                                        |
|--------------------------|------------------|----------------------------------------------|
| AddGridSourceForm        | WYSTARCZAJACY    | Source bez catalog_ref -- by design            |
| ContinueTrunkForm        | WYSTARCZAJACY    | Impedancja z katalogu                          |
| InsertStationForm        | WYSTARCZAJACY    | Trafo osobnym krokiem                          |
| StartBranchForm          | WYSTARCZAJACY    | Zabezpieczenia via FixAction                   |
| InsertSectionSwitchForm  | WYSTARCZAJACY    | NOP = stan, nie parametry                      |
| AddOzeSourceForm (PV)    | WYSTARCZAJACY    | Profil generacji w Study Case                  |
| AddOzeSourceForm (BESS)  | WYSTARCZAJACY    | Strategia w Study Case                         |
| ConnectRingForm          | WYSTARCZAJACY    | Optymalny NOP przez analize                    |

**Wszystkie 8 formularzy: WYSTARCZAJACE.**

Formularze sa thin wrapperami nad production-grade modalami z `ui/topology/modals/`.
Modaly zbieraja pelne dane inzynierskie. Wrappery zapewniaja integracje
(kontekst ze store'ow, routing formularzy, callback po zapisie).

**Status: ZAMKNIETY -- wszystkie 8 wystarczajace.**
