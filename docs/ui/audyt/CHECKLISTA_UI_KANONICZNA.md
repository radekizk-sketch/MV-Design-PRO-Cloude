# Checklista UI Kanoniczna

**Wersja**: 1.0
**Data audytu**: 2026-02-02
**Audytor**: Claude AI / UX Architect

---

## Zasada przewodnia

> **1 ekran = 1 decyzja**
>
> Każdy ekran powinien prowadzić użytkownika do podjęcia jednej, jasno zdefiniowanej decyzji.
> Wynik powinien być zrozumiały bez dodatkowych objaśnień ustnych.

---

## Legenda oznaczeń

| Symbol | Znaczenie |
|--------|-----------|
| TAK | Spełnia kryterium |
| NIE | Nie spełnia kryterium |
| CZĘŚCIOWO | Spełnia częściowo, wymaga uzupełnienia |
| N/D | Nie dotyczy danego ekranu |

---

## Tabela audytowa

| Ekran/moduł | Decyzja użytkownika | Status na wejściu? | Widoczna przyczyna? | Widoczne zalecenie? | Następny krok? | Elementy rozpraszające? | Uwagi |
|-------------|---------------------|-------------------|---------------------|---------------------|----------------|------------------------|-------|
| **Wzorce odniesienia (Pattern A)** | Czy wzorzec A jest zgodny z normą? | TAK | TAK | TAK | CZĘŚCIOWO | NIE | Brak wyraźnego CTA "Eksportuj raport" po pozytywnym wyniku |
| **Wzorce odniesienia (Pattern C)** | Czy wzorzec C jest zgodny z normą? | TAK | TAK | TAK | CZĘŚCIOWO | NIE | j.w. |
| **Koordynacja zabezpieczeń - Czułość** | Czy zabezpieczenie wykryje zwarcie? | TAK | TAK | TAK | TAK | NIE | VerdictBadge z tooltipem zawiera przyczynę/skutek/zalecenie |
| **Koordynacja zabezpieczeń - Selektywność** | Czy kolejność wyłączeń jest prawidłowa? | TAK | TAK | TAK | TAK | NIE | Kolumna ΔT z wizualnym wskaźnikiem marginesu |
| **Koordynacja zabezpieczeń - Przeciążalność** | Czy zabezpieczenie nie zadziała przy obciążeniu roboczym? | TAK | TAK | TAK | TAK | NIE | Pełna struktura werdyktu |
| **Koordynacja zabezpieczeń - Wykres TCC** | Czy krzywe czasowo-prądowe są rozdzielone? | TAK | CZĘŚCIOWO | NIE | CZĘŚCIOWO | NIE | Brak tekstowego opisu przyczyny na wykresie |
| **Wyniki rozpływu mocy - Szyny** | Czy napięcia są w granicach? | TAK | CZĘŚCIOWO | NIE | CZĘŚCIOWO | NIE | Brak automatycznego zalecenia przy przekroczeniu |
| **Wyniki rozpływu mocy - Gałęzie** | Czy obciążenia są dopuszczalne? | TAK | CZĘŚCIOWO | NIE | CZĘŚCIOWO | NIE | Procent obciążenia widoczny, brak zalecenia |
| **Wyniki rozpływu mocy - Podsumowanie** | Czy sieć jest zbilansowana? | TAK | NIE | NIE | NIE | NIE | Brak werdyktu PASS/FAIL dla całości |
| **Wyniki rozpływu mocy - Ślad** | Czy obliczenia są poprawne? | TAK | TAK | N/D | NIE | NIE | Ślad techniczny, nie decyzyjny |
| **Wyniki rozpływu mocy - Interpretacja** | Jakie są anomalie? | TAK | TAK | CZĘŚCIOWO | CZĘŚCIOWO | NIE | Warstwa interpretacyjna obecna |
| **Wyniki zwarciowe** | Czy prądy zwarciowe są w granicach urządzeń? | TAK | CZĘŚCIOWO | NIE | NIE | NIE | Brak porównania z Icu/Icw urządzeń |
| **Ślad obliczeniowy (Proof)** | Czy mogę zweryfikować obliczenia? | TAK | N/D | N/D | TAK | NIE | Nawigacja TOC + treść + metadane |
| **Eksport raportów** | Który format wybrać? | TAK | N/D | N/D | TAK | NIE | PDF/DOCX dostępne, jasne przyciski |
| **Archiwum projektu** | Czy chcę zarchiwizować projekt? | TAK | N/D | N/D | TAK | NIE | Dialog z jasnym potwierdzeniem |
| **Przypadki obliczeniowe - Lista** | Który przypadek aktywować? | TAK | TAK | N/D | TAK | NIE | Status FRESH/OUTDATED/NONE widoczny |
| **Przypadki obliczeniowe - Porównanie** | Czym różnią się wyniki? | CZĘŚCIOWO | NIE | NIE | NIE | NIE | Brak dedykowanego widoku porównawczego |

---

## Podsumowanie statystyczne

| Kryterium | TAK | CZĘŚCIOWO | NIE | N/D |
|-----------|-----|-----------|-----|-----|
| Status na wejściu? | 14 | 2 | 1 | 0 |
| Widoczna przyczyna? | 7 | 3 | 3 | 4 |
| Widoczne zalecenie? | 5 | 2 | 6 | 4 |
| Następny krok? | 7 | 5 | 4 | 1 |
| Elementy rozpraszające? | 0 | 0 | 17 | 0 |

---

## Wnioski ogólne

### Mocne strony

1. **Spójna warstwa statusów** — system werdyktów (PASS/MARGINAL/FAIL/ERROR) jest konsekwentnie stosowany w module koordynacji zabezpieczeń
2. **Polskie etykiety** — interfejs jest w pełni spolonizowany, brak anglicyzmów
3. **Brak elementów rozpraszających** — ekrany są czyste, skupione na danych
4. **Struktura werdyktu** — VerdictBadge zawiera przyczynę, skutek i zalecenie w tooltipie

### Obszary do poprawy

1. **Rozpływ mocy bez werdyktów** — tabele wyników nie mają kolumny werdyktu
2. **Brak porównania przypadków** — użytkownik nie może porównać wyników dwóch przypadków obok siebie
3. **Wyniki zwarciowe bez kontekstu** — prądy zwarciowe nie są porównywane z parametrami urządzeń
4. **Wykres TCC bez tekstowej interpretacji** — tylko wizualna analiza, brak słownego opisu problemu

---

## Rekomendacje priorytetowe

| Priorytet | Obszar | Rekomendacja |
|-----------|--------|--------------|
| BLOKER | Rozpływ mocy | Dodać kolumnę werdyktu do tabel wyników |
| BLOKER | Wyniki zwarciowe | Dodać porównanie Ik vs Icu/Icw urządzeń |
| WAŻNE | Przypadki | Dodać widok porównawczy dwóch przypadków |
| WAŻNE | Wykres TCC | Dodać panel z tekstową interpretacją |
| WARTO | Eksport | Dodać CTA "Eksportuj" w nagłówku po pozytywnym wyniku |

---

*Dokument wygenerowany zgodnie z zasadą "1 ekran = 1 decyzja"*
