# Plan Poprawek UI

**Wersja**: 1.0
**Data**: 2026-02-02
**Autor**: Claude AI / UX Architect
**Status**: Do realizacji

---

## Wprowadzenie

Niniejszy dokument zawiera uporządkowany plan poprawek interfejsu użytkownika wynikający z audytu:
- `CHECKLISTA_UI_KANONICZNA.md`
- `AUDYT_UI_1_EKRAN_1_DECYZJA.md`
- `AUDYT_UI_ODBIOR_ZEWNETRZNY.md`

### Kategorie priorytetów

| Priorytet | Znaczenie | Kryterium |
|-----------|-----------|-----------|
| **BLOKER** | Blokuje odbiór zewnętrzny | Bez tej zmiany użytkownik zewnętrzny nie zrozumie wyników |
| **WAŻNE** | Znacząco poprawia UX | Istotne usprawnienie doświadczenia użytkownika |
| **WARTO** | Drobne usprawnienia | Poprawa ergonomii, nie wpływa na funkcjonalność |

---

## BLOKERY

### UI-01: Werdykty w tabeli szyn (rozpływ mocy)

**Priorytet**: BLOKER
**Moduł**: `ui/power-flow-results/`
**Pliki do zmiany**: Komponent tabeli szyn

**Opis problemu**:
Tabela wyników rozpływu mocy dla szyn pokazuje tylko wartości liczbowe (U, P, Q) bez kolumny werdyktu. Użytkownik nie wie, czy napięcie jest w granicach dopuszczalnych.

**Wymagane zmiany**:

1. Dodać kolumnę "Status" z VerdictBadge
2. Implementować logikę werdyktu:
   ```
   PASS: 0.95 ≤ U_pu ≤ 1.05
   MARGINAL: 0.90 ≤ U_pu < 0.95 lub 1.05 < U_pu ≤ 1.10
   FAIL: U_pu < 0.90 lub U_pu > 1.10
   ```
3. Dodać kolumnę "Granica" pokazującą dopuszczalny zakres
4. Kolorować wiersze odpowiednio do statusu

**Wzorzec implementacji**: `ui/protection-coordination/ResultsTables.tsx` — SensitivityTable

**Akceptacja**:
- [ ] Kolumna "Status" widoczna w tabeli
- [ ] VerdictBadge z tooltipem (przyczyna/skutek/zalecenie)
- [ ] Wiersze kolorowane zgodnie ze statusem
- [ ] Testy jednostkowe dla logiki werdyktu

---

### UI-02: Werdykty w tabeli gałęzi (rozpływ mocy)

**Priorytet**: BLOKER
**Moduł**: `ui/power-flow-results/`
**Pliki do zmiany**: Komponent tabeli gałęzi

**Opis problemu**:
Tabela gałęzi pokazuje procent obciążenia bez werdyktu. Użytkownik nie wie, czy obciążenie jest dopuszczalne.

**Wymagane zmiany**:

1. Dodać kolumnę "Status" z VerdictBadge
2. Implementować logikę werdyktu:
   ```
   PASS: obciążenie ≤ 80%
   MARGINAL: 80% < obciążenie ≤ 100%
   FAIL: obciążenie > 100%
   ```
3. Dodać tooltip z przyczynę/skutek/zalecenie dla MARGINAL i FAIL

**Wzorzec implementacji**: `ui/protection-coordination/ResultsTables.tsx` — OverloadTable

**Akceptacja**:
- [ ] Kolumna "Status" widoczna w tabeli
- [ ] Logika werdyktu zgodna ze specyfikacją
- [ ] Tooltip z pełną strukturą werdyktu

---

### UI-03: Porównanie prądów zwarciowych z parametrami urządzeń

**Priorytet**: BLOKER
**Moduł**: `ui/short-circuit-results/` (lub odpowiednik)
**Zależności**: Integracja z katalogiem urządzeń

**Opis problemu**:
Tabela wyników zwarciowych pokazuje Ik, Ip, itp. bez porównania z zdolnością łączeniową urządzeń (Icu, Ics). Audytor OSD wymaga takiego porównania do zatwierdzenia projektu.

**Wymagane zmiany**:

1. Dodać kolumny z parametrami urządzenia z katalogu:
   - Icu [kA] — znamionowa zdolność łączeniowa
   - Ics [kA] — zdolność łączeniowa eksploatacyjna (opcjonalnie)
2. Dodać kolumnę "Margines Icu [%]":
   ```
   margines = (Icu - Ik) / Icu × 100
   ```
3. Dodać kolumnę "Werdykt":
   ```
   PASS: margines > 15%
   MARGINAL: 0% ≤ margines ≤ 15%
   FAIL: margines < 0% (Ik > Icu)
   ```
4. Dodać tooltip z przyczynę/skutek/zalecenie

**Uwagi implementacyjne**:
- Wymaga pobrania Icu z katalogu urządzeń
- Jeśli urządzenie nie ma Icu w katalogu → wyświetlić "Brak danych"

**Akceptacja**:
- [ ] Kolumna Icu widoczna (z katalogu)
- [ ] Kolumna Margines obliczana poprawnie
- [ ] Kolumna Werdykt z VerdictBadge
- [ ] Obsługa brakujących danych katalogowych

---

### UI-04: Panel interpretacji wykresu TCC

**Priorytet**: BLOKER
**Moduł**: `ui/protection-coordination/`
**Pliki do zmiany**: ProtectionCoordinationPage.tsx lub nowy komponent

**Opis problemu**:
Wykres TCC (charakterystyki czasowo-prądowe) jest czytelny tylko dla eksperta. Brak tekstowej interpretacji utrudnia zrozumienie użytkownikom nietechnicznym.

**Wymagane zmiany**:

1. Dodać panel boczny "Interpretacja wykresu"
2. Panel zawiera automatycznie generowane opisy:
   - Liczba wykrytych konfliktów
   - Dla każdego konfliktu:
     - Para urządzeń (nazwa A, nazwa B)
     - Zakres prądów konfliktu [A]
     - Zakres czasów konfliktu [s]
     - Skutek (np. "brak selektywności")
     - Zalecenie (np. "zwiększyć nastawę czasową urządzenia B")
3. Panel jest widoczny domyślnie, można zwinąć

**Przykład treści panelu**:
```
INTERPRETACJA WYKRESU

Wykryto 2 pary urządzeń z potencjalnym konfliktem:

1. Wyłącznik Q1 ↔ Bezpiecznik F2
   • Zakres konfliktu: 800 - 1500 A
   • Skutek: Brak selektywności dla zwarć średnich
   • Zalecenie: Zwiększyć nastawę czasową Q1 o 0.1 s

2. Przekaźnik REL1 ↔ Wyłącznik Q2
   • Zakres konfliktu: 2000 - 3000 A
   • Skutek: Możliwe jednoczesne zadziałanie
   • Zalecenie: Zmienić charakterystykę REL1 na "very inverse"
```

**Akceptacja**:
- [ ] Panel interpretacji widoczny obok wykresu
- [ ] Automatyczne wykrywanie przecięć krzywych
- [ ] Tekstowy opis każdego konfliktu
- [ ] Zalecenia naprawcze

---

## WAŻNE

### UI-05: Podsumowanie wykonawcze rozpływu mocy

**Priorytet**: WAŻNE
**Moduł**: `ui/power-flow-results/`
**Pliki do zmiany**: Zakładka Podsumowanie

**Opis problemu**:
Zakładka "Podsumowanie" pokazuje tylko bilans mocy bez ogólnego werdyktu. Kierownik/inwestor nie dostaje odpowiedzi na pytanie "Czy jest OK?".

**Wymagane zmiany**:

1. Dodać sekcję "Werdykt ogólny" na górze podsumowania:
   ```
   Status sieci: [VerdictBadge]

   PASS: Wszystkie szyny i gałęzie w granicach
   MARGINAL: Są elementy na granicy, ale brak przekroczeń
   FAIL: Są przekroczenia granic
   ```

2. Dodać sekcję "Wykryte problemy" (jeśli są):
   ```
   • Szyna BUS-003: napięcie 0.89 p.u. (poniżej 0.90)
   • Gałąź L-007: obciążenie 112% (powyżej 100%)
   ```

3. Dodać sekcję "Zalecane działania":
   ```
   • Zwiększyć poziom napięcia na szynie zasilającej
   • Rozważyć wzmocnienie linii L-007
   ```

**Akceptacja**:
- [ ] Sekcja werdyktu ogólnego widoczna
- [ ] Lista problemów generowana automatycznie
- [ ] Zalecenia powiązane z problemami

---

### UI-06: Widok porównawczy przypadków obliczeniowych

**Priorytet**: WAŻNE
**Moduł**: `ui/study-cases/`
**Pliki do zmiany**: Nowy komponent StudyCaseComparison

**Opis problemu**:
Użytkownik nie może porównać wyników dwóch przypadków obliczeniowych obok siebie. Musi ręcznie przełączać się między przypadkami.

**Wymagane zmiany**:

1. Dodać przycisk "Porównaj" w liście przypadków (gdy zaznaczone 2 przypadki)
2. Utworzyć nowy widok porównawczy:
   - Dwie kolumny obok siebie
   - Nagłówki: Przypadek A | Przypadek B
   - Tabela różnic z podświetleniem
3. Dodać werdykt różnicy:
   ```
   ISTOTNA: Różnica wpływa na werdykty
   KOSMETYCZNA: Różnica liczbowa bez wpływu na werdykty
   BRAK: Wyniki identyczne
   ```

**Akceptacja**:
- [ ] Możliwość wyboru 2 przypadków do porównania
- [ ] Widok side-by-side
- [ ] Podświetlenie różnic
- [ ] Klasyfikacja istotności różnic

---

### UI-07: Werdykty w raporcie eksportowym

**Priorytet**: WAŻNE
**Moduł**: Eksport raportów
**Zależności**: UI-01, UI-02, UI-03, UI-05

**Opis problemu**:
Raport PDF/DOCX zawiera tylko dane surowe bez werdyktów. Użytkownik zewnętrzny otrzymuje raport bez podsumowania.

**Wymagane zmiany**:

1. Dodać sekcję "Podsumowanie wykonawcze" na początku raportu:
   ```
   PODSUMOWANIE WYKONAWCZE

   Status projektu: [PASS/MARGINAL/FAIL]

   Rozpływ mocy: PASS (wszystkie szyny i gałęzie OK)
   Wyniki zwarciowe: MARGINAL (2 urządzenia na granicy)
   Koordynacja zabezpieczeń: PASS (pełna selektywność)

   Wykryte problemy: 2
   Zalecane działania: 3
   ```

2. Przy każdej tabeli dodać kolumnę werdyktu (analogicznie do UI)

**Akceptacja**:
- [ ] Sekcja podsumowania wykonawczego w raporcie
- [ ] Werdykty przy tabelach
- [ ] Spójność z widokiem UI

---

## WARTO

### UI-08: Odniesienie do normy w nagłówkach koordynacji

**Priorytet**: WARTO
**Moduł**: `ui/protection-coordination/`
**Pliki do zmiany**: ResultsTables.tsx

**Opis problemu**:
Tabele koordynacji zabezpieczeń nie zawierają odniesienia do normy. Audytor może mieć wątpliwości co do podstawy obliczeń.

**Wymagane zmiany**:

1. W nagłówku sekcji dodać:
   ```
   Analiza czułości (zgodnie z IEC 60909)
   ```
2. Opcjonalnie: dodać ikonkę info z tooltipem wyjaśniającym metodę

**Akceptacja**:
- [ ] Odniesienie do normy widoczne w nagłówku
- [ ] Tooltip z opisem metody (opcjonalnie)

---

### UI-09: Rozbudowane tooltips statusów przypadków

**Priorytet**: WARTO
**Moduł**: `ui/study-cases/`
**Pliki do zmiany**: StudyCaseList.tsx

**Opis problemu**:
Tooltips dla statusów FRESH/OUTDATED/NONE są zbyt skrótowe. Użytkownik nie rozumie co oznacza OUTDATED.

**Wymagane zmiany**:

1. Rozbudować tooltips:
   ```
   FRESH: "Wyniki aktualne — obliczenia wykonane po ostatniej zmianie modelu"
   OUTDATED: "Wyniki nieaktualne — model został zmieniony po ostatnim obliczeniu. Zalecenie: Uruchom ponownie obliczenia."
   NONE: "Brak wyników — obliczenia nie zostały jeszcze wykonane"
   ```

**Akceptacja**:
- [ ] Tooltips z pełnym opisem
- [ ] Zalecenie dla OUTDATED

---

### UI-10: Podświetlenie CTA eksportu po sukcesie

**Priorytet**: WARTO
**Moduł**: `ui/reference-patterns/` i inne
**Pliki do zmiany**: ReferencePatternsPage.tsx

**Opis problemu**:
Po otrzymaniu wyniku PASS użytkownik nie jest zachęcany do eksportu raportu. Przycisk eksportu nie jest wyróżniony.

**Wymagane zmiany**:

1. Gdy ogólny werdykt = PASS:
   - Podświetlić przycisk "Eksportuj PDF" (np. zielona obwódka, pulsowanie)
   - Dodać tekst "Zalecamy eksport raportu"

**Akceptacja**:
- [ ] Przycisk eksportu wyróżniony po sukcesie
- [ ] Zachęta tekstowa

---

## Harmonogram realizacji

### Faza 1: Blokery (przed odbiorem zewnętrznym)

| Zadanie | Zależności | Szacowana złożoność |
|---------|------------|---------------------|
| UI-01 | - | Niska |
| UI-02 | - | Niska |
| UI-03 | Katalog urządzeń | Średnia |
| UI-04 | - | Średnia |

### Faza 2: Ważne (po odbiorze zewnętrznym)

| Zadanie | Zależności | Szacowana złożoność |
|---------|------------|---------------------|
| UI-05 | UI-01, UI-02 | Niska |
| UI-06 | - | Średnia |
| UI-07 | UI-01, UI-02, UI-03, UI-05 | Średnia |

### Faza 3: Warto (w miarę możliwości)

| Zadanie | Zależności | Szacowana złożoność |
|---------|------------|---------------------|
| UI-08 | - | Bardzo niska |
| UI-09 | - | Bardzo niska |
| UI-10 | - | Niska |

---

## Metryki sukcesu

Po wdrożeniu wszystkich poprawek:

| Metryka | Cel |
|---------|-----|
| Ekrany z werdyktem | 100% ekranów wynikowych |
| Gotowość do odbioru | 10/10 obszarów "GOTOWE" |
| Czas zrozumienia wyników | < 30 sekund bez pomocy |
| Pytania od użytkowników zewnętrznych | Redukcja o 80% |

---

## Załączniki

- `CHECKLISTA_UI_KANONICZNA.md` — tabela audytowa
- `AUDYT_UI_1_EKRAN_1_DECYZJA.md` — szczegółowa analiza ekranów
- `AUDYT_UI_ODBIOR_ZEWNETRZNY.md` — ocena gotowości do odbioru

---

*Plan poprawek wygenerowany na podstawie audytu UI z dnia 2026-02-02*
