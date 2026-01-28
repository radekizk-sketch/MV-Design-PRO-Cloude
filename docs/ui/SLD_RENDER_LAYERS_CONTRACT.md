# SLD RENDER LAYERS CONTRACT

**Status**: BINDING
**Wersja**: 1.0
**Data**: 2026-01-28
**Typ**: UI Contract — Normatywny

---

## 1. CEL I ZAKRES

### 1.1. Cel dokumentu

Niniejszy dokument definiuje **SLD Render Layers** — architekturę dwuwarstwową diagramu SLD w MV-DESIGN-PRO, która:

- **rozdziela semantyki CAD (statyczny schemat) od SCADA (runtime monitoring)**,
- **zapewnia pełną kontrolę nad drukowalnością i eksportem zgodnie z normami**,
- **umożliwia prezentację stanów runtime bez naruszania kompletności schematów technicznych**,
- **osiąga parity z ETAP / DIgSILENT PowerFactory w zakresie prezentacji wyników**.

### 1.2. Zakres obowiązywania

- **BINDING** dla implementacji UI MV-DESIGN-PRO,
- aplikuje się do wszystkich widoków SLD (CAD Mode, SCADA Mode, Hybrid Mode),
- naruszenie kontraktu = regresja wymagająca hotfix,
- kontrakt jest **nadrzędny** wobec implementacji renderingu SLD.

---

## 2. DEFINICJE WARSTW

### 2.1. SLD_CAD_LAYER (Warstwa CAD)

#### 2.1.1. Definicja

**SLD_CAD_LAYER** to warstwa **statyczna, techniczna, normatywna**, której celem jest:

- prezentacja **kompletnego, drukowanego schematu elektrycznego** zgodnego z normami IEC 61082, IEEE 315,
- zawieranie **wszystkich danych technicznych**: napięcia znamionowe, prądy, przekroje przewodów, typy aparatów,
- **brak kolorowania statusów runtime** (brak czerwony/zielony/żółty dla alarmów),
- **gotowość do eksportu PDF/DWG/SVG** bez utraty jakości i kompletności.

#### 2.1.2. Elementy warstwy CAD (BINDING)

| Element               | Zawartość CAD                              | Kolory                     | Drukowanie           |
|-----------------------|--------------------------------------------|----------------------------|----------------------|
| **Bus**               | ID, Name, V_nom [kV], Bus Type             | Czarny (symbol zgodny IEC) | MUST (zawsze)        |
| **Line**              | ID, Name, Length [km], R/X/B, I_nom [A]    | Czarny (linia ciągła)      | MUST (zawsze)        |
| **Transformer**       | ID, Name, S_nom [MVA], u_k [%], Vector Group | Czarny (symbol zgodny IEC) | MUST (zawsze)        |
| **Switch/Breaker**    | ID, Name, Type (CB, DS, LS), I_nom [A]     | Czarny (symbol zgodny IEC) | MUST (zawsze)        |
| **Source**            | ID, Name, Type (Grid, Gen, PV), P_max [MW] | Czarny (symbol zgodny IEC) | MUST (zawsze)        |
| **Load**              | ID, Name, P [MW], Q [MVAr]                 | Czarny (symbol zgodny IEC) | MUST (zawsze)        |

#### 2.1.3. Funkcje warstwy CAD

**MUST:**
- Renderować wszystkie elementy zgodnie z symboliką IEC 61082 (Single Line Diagram symbols),
- Wyświetlać parametry katalogowe (R, X, B, I_nom, S_nom) dla wszystkich elementów,
- Eksportować do PDF/DWG/SVG z pełną czytelnością (min. 300 DPI dla PDF),
- Zachować jednolity schemat kolorów: czarny (linie i symbole), niebieski (Bus bars), czerwony (granice stacji).

**FORBIDDEN:**
- Kolorowanie elementów na podstawie statusów runtime (OK/VIOLATION/WARNING),
- Ukrywanie elementów "out of service" (wszystkie elementy widoczne w CAD),
- Animacje przepływu mocy (to SCADA),
- Dynamiczne zmiany grubości linii na podstawie obciążenia (to SCADA).

---

### 2.2. SLD_SCADA_LAYER (Warstwa SCADA)

#### 2.2.1. Definicja

**SLD_SCADA_LAYER** to warstwa **dynamiczna, monitoringowa, operacyjna**, której celem jest:

- prezentacja **stanów runtime**: napięcia, prądy, moce, stany OPEN/CLOSED, alarmy,
- **kolorowanie semantyczne** zgodne z **SEMANTIC_COLOR_CONTRACT.md** (czerwony = błąd, żółty = ostrzeżenie, zielony = OK),
- **animacje przepływu mocy** (opcjonalnie),
- **brak danych katalogowych** (tylko wartości obliczone, nie parametry techniczne).

#### 2.2.2. Elementy warstwy SCADA (BINDING)

| Element               | Zawartość SCADA                          | Kolory                     | Drukowanie           |
|-----------------------|------------------------------------------|----------------------------|----------------------|
| **Bus**               | V [kV], V [%], Status (OK/VIOLATION)     | Zielony (OK), Czerwony (VIOLATION), Żółty (WARNING) | MAY (opcjonalnie)    |
| **Line**              | I [A], I [%], P [MW], Q [MVAr], Losses [kW] | Zielony/Żółty/Czerwony (obciążenie) | MAY (opcjonalnie)    |
| **Transformer**       | S [MVA], S [%], Tap Position, Losses [kW] | Zielony/Żółty/Czerwony (obciążenie) | MAY (opcjonalnie)    |
| **Switch/Breaker**    | State (OPEN/CLOSED), I [A] (dla CLOSED)  | Zielony (CLOSED), Szary (OPEN) | MAY (opcjonalnie)    |
| **Source**            | P_gen [MW], Q_gen [MVAr], PF             | Niebieski (generacja)      | MAY (opcjonalnie)    |
| **Load**              | P [MW], Q [MVAr], Status                 | Czarny (obciążenie)        | MAY (opcjonalnie)    |

#### 2.2.3. Funkcje warstwy SCADA

**MUST:**
- Renderować wyniki obliczeń (LF, SC) jako overlay na elementach,
- Kolorować elementy zgodnie z **SEMANTIC_COLOR_CONTRACT.md**: czerwony (VIOLATION), żółty (WARNING), zielony (OK),
- Aktualizować wyniki w czasie rzeczywistym przy zmianie Case/Snapshot,
- Wyświetlać stany OPEN/CLOSED przełączników z wyraźną wizualizacją (szara kreska dla OPEN).

**SHOULD:**
- Animować przepływ mocy (strzałki pokazujące kierunek P/Q),
- Wyświetlać heatmap obciążeń (kolory od zielonego do czerwonego dla I [%]).

**FORBIDDEN:**
- Wyświetlanie parametrów katalogowych (R, X, B, I_nom) — to CAD,
- Eksport SCADA bez CAD (wyniki bez schematów są bezsensowne),
- Brak legendy kolorów przy eksporcie PDF (legenda MUST być zawsze widoczna).

---

## 3. TRYBY PRACY SLD

### 3.1. CAD MODE (Tryb CAD)

#### 3.1.1. Definicja

**CAD MODE** wyświetla wyłącznie warstwę CAD (statyczny schemat techniczny).

#### 3.1.2. Właściwości (BINDING)

| Właściwość            | Wartość                                  |
|-----------------------|------------------------------------------|
| **Warstwa CAD**       | Widoczna                                 |
| **Warstwa SCADA**     | Ukryta                                   |
| **Kolory**            | Czarny/Niebieski (statyczne)             |
| **Animacje**          | Brak                                     |
| **Drukowanie**        | MUST (pełna czytelność)                  |
| **Eksport**           | PDF/DWG/SVG (zgodny z normami)           |

#### 3.1.3. Przypadki użycia

- Przygotowanie dokumentacji projektowej zgodnej z normami (PN-EN, IEC),
- Eksport schematów do zgłoszeń przyłączeniowych,
- Archiwizacja projektów (bez wyników obliczeń).

---

### 3.2. SCADA MODE (Tryb SCADA)

#### 3.2.1. Definicja

**SCADA MODE** wyświetla warstwę CAD **+** nakładkę SCADA (schemat + wyniki runtime).

#### 3.2.2. Właściwości (BINDING)

| Właściwość            | Wartość                                  |
|-----------------------|------------------------------------------|
| **Warstwa CAD**       | Widoczna (symbole + topologia)           |
| **Warstwa SCADA**     | Widoczna (wyniki + kolory)               |
| **Kolory**            | Semantyczne (zielony/żółty/czerwony)     |
| **Animacje**          | Włączone (przepływ mocy)                 |
| **Drukowanie**        | MAY (opcjonalnie z legendą kolorów)      |
| **Eksport**           | PDF (schemat + wyniki + legenda)         |

#### 3.2.3. Przypadki użycia

- Analiza wyników obliczeń (LF, SC),
- Porównanie wariantów (Case comparison),
- Monitoring stanu sieci (runtime dashboard).

---

### 3.3. HYBRID MODE (Tryb hybrydowy)

#### 3.3.1. Definicja

**HYBRID MODE** wyświetla warstwę CAD z **selektywnymi** nakładkami SCADA (użytkownik decyduje, które dane pokazać).

#### 3.3.2. Opcje konfiguracji (BINDING)

Użytkownik **MUST** mieć możliwość włączenia/wyłączenia poszczególnych nakładek SCADA:

| Nakładka SCADA         | Domyślnie    | Możliwość zmiany |
|------------------------|--------------|------------------|
| **Napięcia Bus [kV]**  | Włączona     | ✓                |
| **Prądy Line [A]**     | Włączona     | ✓                |
| **Moce Line [MW]**     | Wyłączona    | ✓                |
| **Straty [kW]**        | Wyłączona    | ✓                |
| **Stany OPEN/CLOSED**  | Włączona     | ✓                |
| **Kolory statusów**    | Włączona     | ✓                |
| **Animacje przepływu** | Wyłączona    | ✓                |

#### 3.3.3. Przypadki użycia

- Prezentacje dla klientów (wyniki bez zbędnych detali),
- Raporty audytowe (pełne dane CAD + wybrane wyniki SCADA).

---

## 4. PRZEŁĄCZANIE TRYBÓW

### 4.1. UI Selector (BINDING)

SLD **MUST** posiadać **Layer Mode Selector**:

- umiejscowienie: **prawy górny róg widoku SLD** (obok kontrolek zoom),
- format: przyciski z ikonami:
  - 📐 **CAD** (statyczny schemat),
  - 📊 **SCADA** (schemat + wyniki),
  - ⚙️ **HYBRID** (konfigurowalny).

### 4.2. Zachowanie stanu przy przełączaniu

Przełączenie trybu **MUST**:

- zachować pozycję widoku SLD (zoom, pan),
- zachować zaznaczone elementy,
- **NIE** resetować kontekstu (aktywny Case, Snapshot, Analysis).

---

## 5. SEMANTYKA KOLORÓW (INTEGRACJA Z SEMANTIC_COLOR_CONTRACT.md)

### 5.1. Warstwa CAD (BINDING)

| Element               | Kolor                    | Uzasadnienie                     |
|-----------------------|--------------------------|----------------------------------|
| Bus                   | Czarny (obramowanie), Biały (wypełnienie) | Standard IEC 61082               |
| Line                  | Czarny (linia ciągła)    | Standard IEC 61082               |
| Transformer           | Czarny (symbol)          | Standard IEC 61082               |
| Switch/Breaker        | Czarny (symbol)          | Standard IEC 61082               |
| Boundaries            | Czerwony (linia kropkowana) | Oznaczenie granic stacji/PCC     |

### 5.2. Warstwa SCADA (BINDING)

**Kolory semantyczne zgodne z SEMANTIC_COLOR_CONTRACT.md:**

| Stan                  | Kolor                    | Zastosowanie                     |
|-----------------------|--------------------------|----------------------------------|
| **OK**                | Zielony (#28a745)        | V% w zakresie, I% < 100%, Status OK |
| **WARNING**           | Żółty (#ffc107)          | V% blisko limitu (±5%), I% 90-100% |
| **VIOLATION**         | Czerwony (#dc3545)       | V% poza zakresem, I% > 100%, Status VIOLATION |
| **OUT_OF_SERVICE**    | Szary (#6c757d)          | Element out of service, Switch OPEN |
| **GENERATION**        | Niebieski (#007bff)      | Source (P_gen > 0)               |

---

## 6. DRUKOWANIE I EKSPORT

### 6.1. Eksport warstwy CAD (BINDING)

**MUST:**
- Eksportować do PDF z rozdzielczością min. 300 DPI,
- Zachować czcionki wektorowe (bez rasteryzacji tekstu),
- Eksportować do DWG (AutoCAD format) z warstwami: SYMBOLS, LINES, TEXT, BORDERS,
- Eksportować do SVG (skalowalny wektor) z metadanymi (title, description, author).

**FORBIDDEN:**
- Rasteryzacja symboli (symbole MUST być wektorowe),
- Brak skali (schemat MUST zawierać skalę metrową lub legendę),
- Brak nagłówka (MUST zawierać Global Context Bar).

### 6.2. Eksport warstwy SCADA (BINDING)

**MUST:**
- Eksportować do PDF z legendą kolorów (obowiązkowa sekcja "Legenda kolorów" na dole strony),
- Zawierać timestamp obliczeń (Global Context Bar w nagłówku),
- Zawierać informację o Case, Snapshot, Analysis (Global Context Bar).

**MAY:**
- Eksportować do PNG (raster) dla prezentacji,
- Eksportować do HTML (interaktywny schemat z tooltipami).

---

## 7. PARITY Z ETAP / DIGSILENT POWERFACTORY

### 7.1. ETAP Parity

| Feature                          | ETAP       | PowerFactory | MV-DESIGN-PRO | Status       |
|----------------------------------|------------|--------------|---------------|--------------|
| Warstwa CAD (statyczna)          | ✓          | ✓            | ✓             | ✅ FULL      |
| Warstwa SCADA (runtime)          | ✓          | ✓            | ✓             | ✅ FULL      |
| Przełączanie CAD ↔ SCADA         | ✗          | ✓            | ✓             | ✅ FULL      |
| Eksport PDF (CAD + SCADA)        | ✓          | ✓            | ✓             | ✅ FULL      |
| Kolory semantyczne (status)      | ✓          | ✓            | ✓             | ✅ FULL      |
| Animacje przepływu mocy          | ✗          | ✓            | ✓             | ✅ FULL      |
| Hybrid Mode (konfigurowalne nakładki) | ✗    | ✗            | ✓             | ➕ SUPERIOR  |

---

## 8. ACCESSIBILITY I UX

### 8.1. Keyboard Navigation

- **MUST** obsługiwać Ctrl+1 (CAD Mode), Ctrl+2 (SCADA Mode), Ctrl+3 (Hybrid Mode),
- **MUST** obsługiwać Tab (przełączanie między elementami SLD),
- **MUST** obsługiwać Ctrl+P (drukowanie / eksport PDF).

### 8.2. Screen Readers

- **MUST** zawierać ARIA labels dla wszystkich symboli SLD,
- **MUST** ogłaszać zmianę trybu przez screen reader ("Switched to SCADA Mode").

---

## 9. PERFORMANCE

### 9.1. Wymagania wydajnościowe (BINDING)

- Renderowanie SLD (CAD + SCADA) dla sieci 1000 elementów **MUST** zajmować < 1000 ms,
- Przełączanie trybów (CAD ↔ SCADA) **MUST** zajmować < 300 ms,
- Eksport PDF (A3, 300 DPI) **MUST** zajmować < 3000 ms.

---

## 10. ZABRONIONE PRAKTYKI

### 10.1. FORBIDDEN

- **FORBIDDEN**: mieszanie semantyk warstw (parametry katalogowe w SCADA, wyniki runtime w CAD),
- **FORBIDDEN**: eksport SCADA bez warstwy CAD (wyniki bez schematów),
- **FORBIDDEN**: brak legendy kolorów przy eksporcie SCADA do PDF,
- **FORBIDDEN**: ukrywanie elementów "out of service" w trybie CAD (wszystkie elementy widoczne),
- **FORBIDDEN**: kolorowanie elementów CAD na podstawie statusów runtime.

---

## 11. ZALEŻNOŚCI OD INNYCH KONTRAKTÓW

- **SEMANTIC_COLOR_CONTRACT.md**: warstwa SCADA MUST używać kolorów semantycznych,
- **GLOBAL_CONTEXT_BAR.md**: nagłówek PDF MUST zawierać Global Context Bar,
- **ELEMENT_INSPECTOR_CONTRACT.md**: kliknięcie elementu SLD MUST otworzyć Inspector,
- **UI_ETAP_POWERFACTORY_PARITY.md**: SLD MUST spełniać parity z ETAP/PowerFactory.

---

## 12. WERSJONOWANIE I ZMIANY

- Wersja 1.0: definicja bazowa (2026-01-28),
- Zmiany w kontrakcie wymagają aktualizacji wersji i code review,
- Breaking changes wymagają migracji UI i aktualizacji testów E2E.

---

**KONIEC KONTRAKTU**
