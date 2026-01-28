# SC NODE RESULTS CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **SC Node Results** — kontrakt prezentacji wyników zwarciowych w MV-DESIGN-PRO, który:

- **ustala, że wyniki zwarciowe są WYŁĄCZNIE per BUS** (węzłowo-centryczne),
- **zakazuje prezentacji wyników zwarcia „na linii" lub „na transformatorze"**,
- **definiuje kanoniczny format prezentacji wyników SC** zgodny z IEC 60909,
- **osiąga parity z ETAP / DIgSILENT PowerFactory w zakresie prezentacji wyników SC**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich widoków (Results Browser, Element Inspector, SLD Viewer),
- naruszenie kontraktu = regresja wymagająca hotfix,
- kontrakt jest **nadrzędny** wobec implementacji prezentacji wyników SC.

---

## 2. FUNDAMENTALNA ZASADA: BUS-CENTRIC SHORT-CIRCUIT RESULTS

### 2.1. Definicja (BINDING)

**Wyniki zwarciowe obliczane są WYŁĄCZNIE dla BUS (węzłów sieci).**

**INVARIANT:**
- **Wynik SC = wynik zwarcia w węźle (Bus)**,
- **NIE ISTNIEJE** pojęcie „wynik zwarcia na linii",
- **NIE ISTNIEJE** pojęcie „wynik zwarcia na transformatorze",
- **Linia i transformator** to **elementy impedancyjne**, które **wpływają** na wynik SC w Bus, ale **NIE MAJĄ** własnych wyników SC.

### 2.2. Uzasadnienie fizyczne

Zgodnie z IEC 60909:

- **zwarcie zachodzi w węźle sieci** (Bus),
- prąd zwarciowy **płynie z węzła do miejsca zwarcia**,
- **impedancja linii/transformatora** wpływa na wartość I_sc w Bus (zmniejsza prąd zwarciowy przez dodatkowy opór),
- **brak fizycznego uzasadnienia** dla „wyników zwarcia na linii" (linia nie ma potencjału, to impedancja).

---

## 3. WYNIKI ZWARCIOWE PER BUS (BINDING)

### 3.1. Struktura wyniku SC dla Bus

**ShortCircuitResult (per Bus)** **MUST** zawierać:

| Parametr              | Typ        | Jednostka | Wymagane | Opis                                      |
|-----------------------|------------|-----------|----------|-------------------------------------------|
| `Bus ID`              | UUID       | -         | MUST     | Identyfikator Bus                         |
| `Bus Name`            | string     | -         | MUST     | Nazwa Bus                                 |
| `Fault Type`          | enum       | -         | MUST     | THREE_PHASE, LINE_TO_GROUND, LINE_TO_LINE, etc. |
| `Ik_max [kA]`         | float      | kA        | MUST     | Prąd zwarciowy początkowy (maksymalny)    |
| `Ik_min [kA]`         | float      | kA        | MUST     | Prąd zwarciowy początkowy (minimalny)     |
| `ip [kA]`             | float      | kA        | MUST     | Prąd udarowy szczytowy                    |
| `Ith [kA]`            | float      | kA        | MUST     | Prąd cieplny równoważny                   |
| `Sk [MVA]`            | float      | MVA       | MUST     | Moc zwarciowa                             |
| `Z_th [Ω]`            | complex    | Ω         | MAY      | Impedancja Thevenina (dla audytu)         |
| `X/R Ratio`           | float      | -         | MAY      | Stosunek X/R                              |
| `Status`              | enum       | -         | MUST     | OK, WARNING, VIOLATION                    |

### 3.2. FaultSpec (specyfikacja zwarcia)

**FaultSpec** opisuje typ i lokalizację zwarcia:

| Parametr              | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Fault Location`      | UUID       | MUST     | Bus ID (lokalizacja zwarcia)              |
| `Fault Type`          | enum       | MUST     | THREE_PHASE, LINE_TO_GROUND, etc.         |
| `Fault Impedance`     | complex    | MAY      | Impedancja zwarcia (opcjonalnie, domyślnie 0) |
| `c_max`               | float      | MUST     | Współczynnik napięcia (maksymalny)        |
| `c_min`               | float      | MUST     | Współczynnik napięcia (minimalny)         |

---

## 4. PREZENTACJA WYNIKÓW SC W UI

### 4.1. Results Browser — Tabela SC (BINDING)

Results Browser **MUST** wyświetlać wyniki SC w tabeli z następującymi kolumnami:

| Kolumna               | Typ        | Wymagane | Opis                                      |
|-----------------------|------------|----------|-------------------------------------------|
| `Bus ID`              | string     | MUST     | Identyfikator Bus                         |
| `Bus Name`            | string     | MUST     | Nazwa Bus                                 |
| `Voltage [kV]`        | float      | MUST     | Napięcie znamionowe Bus                   |
| `Fault Type`          | enum       | MUST     | THREE_PHASE, LINE_TO_GROUND, etc.         |
| `Ik_max [kA]`         | float      | MUST     | Prąd zwarciowy początkowy (maksymalny)    |
| `Ik_min [kA]`         | float      | MUST     | Prąd zwarciowy początkowy (minimalny)     |
| `ip [kA]`             | float      | MUST     | Prąd udarowy szczytowy                    |
| `Ith [kA]`            | float      | MUST     | Prąd cieplny równoważny                   |
| `Sk [MVA]`            | float      | MUST     | Moc zwarciowa                             |
| `Status`              | enum       | MUST     | OK, WARNING, VIOLATION                    |

**FORBIDDEN:**
- Kolumna „Prąd zwarciowy na linii" — to NIE ISTNIEJE,
- Kolumna „Prąd zwarciowy na transformatorze" — to NIE ISTNIEJE.

---

### 4.2. Element Inspector — Zakładka: Results (Bus)

Element Inspector dla **Bus** **MUST** wyświetlać w zakładce "Results":

#### 4.2.1. Sekcja: Short-Circuit Results (BINDING)

| Parametr              | Wartość      | Jednostka | Status      |
|-----------------------|--------------|-----------|-------------|
| **Fault Type**        | THREE_PHASE  | -         | -           |
| **Ik_max**            | 25.3         | kA        | OK          |
| **Ik_min**            | 21.7         | kA        | OK          |
| **ip**                | 66.5         | kA        | OK          |
| **Ith**               | 25.8         | kA        | OK          |
| **Sk**                | 438.5        | MVA       | OK          |
| **X/R Ratio**         | 5.2          | -         | -           |

#### 4.2.2. Sekcja: Fault Specification (BINDING)

| Parametr              | Wartość      | Opis                                      |
|-----------------------|--------------|-------------------------------------------|
| **Fault Location**    | Bus 15-01    | Lokalizacja zwarcia                       |
| **Fault Impedance**   | 0 Ω          | Impedancja zwarcia (domyślnie 0)          |
| **c_max**             | 1.1          | Współczynnik napięcia (maksymalny)        |
| **c_min**             | 1.0          | Współczynnik napięcia (minimalny)         |

#### 4.2.3. Sekcja: Contributions (BINDING)

**Contributions** to **kontrybutorzy do prądu zwarciowego** w Bus:

| Contributor           | Type       | Ik [kA]    | % of Total | Angle [deg] |
|-----------------------|------------|------------|------------|-------------|
| Source Grid (110 kV)  | Grid       | 15.2       | 60%        | -85°        |
| Generator #2          | Generator  | 8.5        | 34%        | -82°        |
| Line #3 (backfeed)    | Line       | 1.6        | 6%         | -78°        |
| **TOTAL**             | —          | **25.3**   | **100%**   | **-84°**    |

**Wyjaśnienie:**
- "Line #3 (backfeed)" to **backfeed** z innego Bus przez Line #3,
- **NIE** oznacza „wynik zwarcia na linii",
- oznacza „prąd płynący z Bus połączonego Line #3 do miejsca zwarcia".

---

### 4.3. SLD Viewer — Nakładka SC (BINDING)

SLD **MUST** wyświetlać wyniki SC jako **nakładkę na Bus** (SCADA Layer):

| Element               | Nakładka SC                               | Lokalizacja             |
|-----------------------|-------------------------------------------|-------------------------|
| **Bus**               | Ik_max [kA], Status (kolor)               | Przy symbolu Bus        |
| **Line**              | **BRAK** (linia NIE MA wyników SC)        | -                       |
| **Transformer**       | **BRAK** (transformator NIE MA wyników SC) | -                       |

**Przykład wizualizacji:**

```
   Bus 15-01
   ⬤ 10.5 kV
   Ik_max: 25.3 kA (zielony - OK)
        │
        │ Line #1 (BRAK nakładki SC)
        │
   Bus 15-02
   ⬤ 10.3 kV
   Ik_max: 18.7 kA (żółty - WARNING)
```

**FORBIDDEN:**
- Nakładka „Ik na linii" — to NIE ISTNIEJE,
- Nakładka „Ik na transformatorze" — to NIE ISTNIEJE.

---

## 5. ZABRONIONA TERMINOLOGIA

### 5.1. FORBIDDEN Phrases

**ZAKAZANE** jest używanie następujących fraz w UI:

- ❌ „Prąd zwarciowy na linii",
- ❌ „Prąd zwarciowy na transformatorze",
- ❌ „Wynik SC dla Branch",
- ❌ „Short-circuit current in line",
- ❌ „Fault current at transformer".

### 5.2. ALLOWED Phrases

**DOZWOLONE** jest używanie następujących fraz:

- ✅ „Prąd zwarciowy w węźle (Bus)",
- ✅ „Wynik SC dla Bus",
- ✅ „Kontrybutor do prądu zwarciowego (backfeed przez linię)",
- ✅ „Short-circuit current at Bus",
- ✅ „Contribution from Line (backfeed)".

---

## 6. PARITY Z ETAP / DIGSILENT POWERFACTORY

### 6.1. PowerFactory Parity

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| Wyniki SC per Bus (węzłowo-centryczne) | ✓    | ✓            | ✓             | ✅ FULL      |
| Tabela SC (Bus ID, Ik_max, ip, Ith, Sk) | ✓   | ✓            | ✓             | ✅ FULL      |
| Contributions (kontrybutorzy do I_sc) | ✓     | ✓            | ✓             | ✅ FULL      |
| Nakładka SC na SLD (tylko Bus)   | ✓          | ✓            | ✓             | ✅ FULL      |
| **BRAK wyników SC „na linii"**   | ✓          | ✓            | ✓             | ✅ FULL      |
| **BRAK wyników SC „na transformatorze"** | ✓  | ✓            | ✓             | ✅ FULL      |

---

## 7. ACCESSIBILITY I UX

### 7.1. Keyboard Navigation

- **MUST** obsługiwać Tab (nawigacja między wierszami tabeli SC),
- **MUST** obsługiwać Enter (otwarcie Element Inspector dla zaznaczonego Bus),
- **MUST** obsługiwać Ctrl+F (wyszukiwanie Bus w tabeli SC).

### 7.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich kolumn tabeli SC,
- **MUST** ogłaszać wartości SC przez screen reader ("Bus 15-01, Ik max 25.3 kiloamperes, Status OK").

---

## 8. PERFORMANCE

### 8.1. Wymagania wydajnościowe (BINDING)

- Renderowanie tabeli SC dla 1000 Bus **MUST** zajmować < 1000 ms,
- Sortowanie tabeli SC **MUST** zajmować < 200 ms,
- Filtrowanie tabeli SC (violations only) **MUST** zajmować < 300 ms,
- **MUST** używać lazy loading (wirtualizacja tabeli dla > 500 Bus).

---

## 9. ZABRONIONE PRAKTYKI

### 9.1. FORBIDDEN

- **FORBIDDEN**: prezentacja wyników SC „na linii" (linia to impedancja, nie węzeł),
- **FORBIDDEN**: prezentacja wyników SC „na transformatorze" (transformator to impedancja, nie węzeł),
- **FORBIDDEN**: kolumna „Prąd zwarciowy na Branch" w Results Browser,
- **FORBIDDEN**: nakładka „Ik [kA]" na symbolu linii w SLD,
- **FORBIDDEN**: używanie terminologii „fault current in line" w UI.

---

## 10. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **RESULTS_BROWSER_CONTRACT.md**: tabela SC MUST być dostępna w Results Browser,
- **ELEMENT_INSPECTOR_CONTRACT.md**: zakładka Results (Bus) MUST zawierać sekcję Short-Circuit Results,
- **SLD_RENDER_LAYERS_CONTRACT.md**: nakładka SC MUST być w SCADA Layer (tylko Bus),
- **GLOBAL_CONTEXT_BAR.md**: nagłówek PDF MUST zawierać FaultSpec (Fault Type, c_max, c_min).

---

## 11. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
