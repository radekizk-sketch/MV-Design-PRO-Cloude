# ETAP Symbol Sourcing - Audyt repozytoriów OSS

**Data audytu:** 2026-01-31
**Wersja:** 1.0
**Autor:** MV-Design-PRO Team
**Cel:** Weryfikacja gotowych bibliotek symboli SLD (OSS) pod kątem ETAP-parity

---

## Podsumowanie wykonawcze

Przeprowadzono audyt **6 repozytoriów OSS** zawierających symbole elektryczne/SLD.
Żadne z repozytoriów **NIE spełnia** wymagań ETAP-parity 1:1.

**DECYZJA: REJECT wszystkich repo → własna biblioteka ETAP-parity**

---

## Tabela audytu repozytoriów

| Repozytorium | Licencja | Format | Status | Powód |
|--------------|----------|--------|--------|-------|
| [nicorikken/power-system-shapes](https://github.com/nicorikken/power-system-shapes) | GPLv2 | Dia sheets | **REJECT** | Licencja copyleft + brak SVG + repo zarchiwizowane |
| [powsybl/powsybl-diagram](https://github.com/powsybl/powsybl-diagram) | MPL-2.0 | Java generator | **REJECT** | Generator w Java, brak statycznych symboli SVG do ekstrakcji |
| [upb-lea/Inkscape_electric_Symbols](https://github.com/upb-lea/Inkscape_electric_Symbols) | CC0-1.0 | SVG | **REJECT** | Symbole dla elektroniki/power electronics, brak typowych symboli SLD |
| [danyill/inkscape-symbols-power](https://github.com/danyill/inkscape-symbols-power) | Apache-2.0 | SVG | **REJECT** | Brak weryfikowalnej zgodności ETAP-parity, nieznana geometria |
| [chille/electricalsymbols](https://github.com/chille/electricalsymbols) | CC BY-SA 3.0 | SVG | **REJECT** | Licencja share-alike + symbole dla automatyki, nie SLD |
| [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_electrical_symbols) | Mixed (CC/PD) | SVG | **REJECT** | Brak spójności, mieszane style, brak portów |

---

## Szczegółowy audyt każdego repozytorium

### 1. nicorikken/power-system-shapes

**URL:** https://github.com/nicorikken/power-system-shapes

#### Audyt licencji
- **Typ licencji:** GPLv2 (GNU General Public License v2)
- **Użycie komercyjne:** TAK, ale z ograniczeniami copyleft
- **Modyfikacja:** TAK, ale wymaga udostępnienia źródeł
- **Dystrybucja:** TAK, ale pod tą samą licencją
- **OCENA:** ⛔ **PROBLEMATYCZNA** - copyleft wymaga udostępnienia kodu źródłowego

#### Audyt techniczny
- **Format:** Dia sheets (NIE SVG)
- **Spójność stroke/scale:** N/A
- **Porty przyłączeniowe:** Brak definicji
- **Obroty 0/90/180/270:** N/A
- **OCENA:** ⛔ **NIEZGODNY** - brak formatu SVG

#### ETAP-parity gate
- **Geometria:** Nie można zweryfikować (format Dia)
- **Proporcje:** N/A
- **Orientacja:** N/A
- **Semantyka:** Bazuje na IEC-60617, ale brak 1:1 z ETAP
- **OCENA:** ⛔ **NIE MOŻNA ZWERYFIKOWAĆ**

#### Dodatkowe informacje
- Repozytorium zarchiwizowane (sierpień 2025)
- Brak aktywnego developmentu

**STATUS: REJECT**

---

### 2. powsybl/powsybl-diagram

**URL:** https://github.com/powsybl/powsybl-diagram

#### Audyt licencji
- **Typ licencji:** MPL-2.0 (Mozilla Public License 2.0)
- **Użycie komercyjne:** TAK
- **Modyfikacja:** TAK (z zachowaniem MPL dla zmodyfikowanych plików)
- **Dystrybucja:** TAK
- **OCENA:** ✅ **OK** - licencja permisywna

#### Audyt techniczny
- **Format:** SVG (generowane przez kod Java)
- **Spójność stroke/scale:** Kontrolowana programowo
- **Porty przyłączeniowe:** Definiowane w kodzie Java
- **Obroty 0/90/180/270:** Obsługiwane programowo
- **OCENA:** ⛔ **NIEZGODNY** - to generator, nie biblioteka symboli

#### ETAP-parity gate
- **Geometria:** Własna (PowSyBl style)
- **Proporcje:** Własne
- **Orientacja:** Własna
- **Semantyka:** IEC-based, ale NIE ETAP-compatible
- **OCENA:** ⛔ **BRAK ETAP-PARITY**

#### Dodatkowe informacje
- Projekt LF Energy Foundation
- Wymagałby ekstrakcji symboli z kodu Java
- Symbole są generowane runtime, nie są statyczne

**STATUS: REJECT**

---

### 3. upb-lea/Inkscape_electric_Symbols

**URL:** https://github.com/upb-lea/Inkscape_electric_Symbols

#### Audyt licencji
- **Typ licencji:** CC0-1.0 (Creative Commons Zero - Public Domain)
- **Użycie komercyjne:** TAK (bez ograniczeń)
- **Modyfikacja:** TAK (bez ograniczeń)
- **Dystrybucja:** TAK (bez ograniczeń)
- **OCENA:** ✅ **IDEALNA** - public domain

#### Audyt techniczny
- **Format:** SVG ✅
- **Spójność stroke/scale:** Dobra
- **Porty przyłączeniowe:** Brak formalnej definicji
- **Obroty 0/90/180/270:** Możliwe, ale bez optymalizacji
- **OCENA:** ⚠️ **CZĘŚCIOWO ZGODNY**

#### ETAP-parity gate
- **Geometria:** Symbole dla elektroniki mocy (boost converters, active bridges)
- **Proporcje:** Niezgodne z ETAP
- **Orientacja:** Własna
- **Semantyka:** Power electronics, NIE power systems SLD
- **OCENA:** ⛔ **BRAK ETAP-PARITY** - inne przeznaczenie

#### Zawartość biblioteki (przykłady)
- Bloki diagramów
- Konwertery boost/buck
- Active bridge converters
- Switching elements
- Wiring components

**Brakujące symbole SLD:**
- Wyłączniki mocy (circuit breakers)
- Rozłączniki (disconnectors)
- Szyny zbiorcze (busbars)
- Generatory
- Transformatory SN/WN

**STATUS: REJECT**

---

### 4. danyill/inkscape-symbols-power

**URL:** https://github.com/danyill/inkscape-symbols-power

#### Audyt licencji
- **Typ licencji:** Apache-2.0
- **Użycie komercyjne:** TAK
- **Modyfikacja:** TAK
- **Dystrybucja:** TAK
- **OCENA:** ✅ **OK** - licencja permisywna

#### Audyt techniczny
- **Format:** SVG ✅
- **Spójność stroke/scale:** Nieznana (wymaga weryfikacji każdego pliku)
- **Porty przyłączeniowe:** Brak formalnej definicji w SVG
- **Obroty 0/90/180/270:** Nieprzetestowane
- **OCENA:** ⚠️ **WYMAGA WERYFIKACJI**

#### Zawartość biblioteki
| Plik SVG | Zawartość |
|----------|-----------|
| Switchgear_SLD.svg | Aparatura łączeniowa |
| Transformers.svg | Transformatory |
| Bays_and_SLD Items.svg | Elementy pól |
| Simple_SLD_Drawings.svg | Proste schematy |
| Relays.svg | Przekaźniki |
| LogicSymbols.svg | Symbole logiczne |

#### ETAP-parity gate
- **Geometria:** Nieznana - brak dostępu do plików źródłowych
- **Proporcje:** Nieweryfikowalne bez porównania z ETAP
- **Orientacja:** Nieznana
- **Semantyka:** Prawdopodobnie IEC/ANSI, ale NIE ETAP-specific
- **OCENA:** ⛔ **NIE MOŻNA ZAGWARANTOWAĆ ETAP-PARITY**

#### Powód odrzucenia
1. Brak dokumentacji geometrii symboli
2. Brak definicji portów przyłączeniowych
3. Brak gwarancji zgodności z ETAP
4. Mieszanie z własnymi symbolami wymagałoby "zgadywania" geometrii

**STATUS: REJECT**

---

### 5. chille/electricalsymbols

**URL:** https://github.com/chille/electricalsymbols

#### Audyt licencji
- **Typ licencji:** CC BY-SA 3.0 (Creative Commons Attribution-ShareAlike)
- **Użycie komercyjne:** TAK
- **Modyfikacja:** TAK
- **Dystrybucja:** TAK, ale pod tą samą licencją
- **OCENA:** ⚠️ **PROBLEMATYCZNA** - wymaga share-alike

#### Audyt techniczny
- **Format:** SVG ✅
- **Spójność stroke/scale:** Spójna (IEC 60617)
- **Porty przyłączeniowe:** Brak formalnej definicji
- **Obroty 0/90/180/270:** Nieprzetestowane
- **OCENA:** ⚠️ **CZĘŚCIOWO ZGODNY**

#### Zawartość biblioteki (33 symbole)
- Silniki (1-fazowe, 3-fazowe)
- Cewki przekaźników
- Przyciski (różne typy)
- Wyłączniki automatyczne
- Transformatory (1-fazowe, 3-fazowe Dyn)
- Czujniki zbliżeniowe

#### ETAP-parity gate
- **Geometria:** IEC 60617, ale NIE ETAP-specific
- **Proporcje:** IEC standard
- **Orientacja:** IEC standard
- **Semantyka:** Automatyka przemysłowa, NIE SLD power systems
- **OCENA:** ⛔ **BRAK ETAP-PARITY** - inne przeznaczenie

**STATUS: REJECT**

---

### 6. Wikimedia Commons - SVG electrical symbols

**URL:** https://commons.wikimedia.org/wiki/Category:SVG_electrical_symbols

#### Audyt licencji
- **Typ licencji:** Mieszane (CC-BY, CC-BY-SA, Public Domain)
- **Użycie komercyjne:** Zależy od konkretnego pliku
- **Modyfikacja:** Zależy od konkretnego pliku
- **Dystrybucja:** Zależy od konkretnego pliku
- **OCENA:** ⚠️ **PROBLEMATYCZNA** - wymaga audytu każdego pliku

#### Audyt techniczny
- **Format:** SVG ✅
- **Spójność stroke/scale:** ⛔ BRAK - różni autorzy, różne style
- **Porty przyłączeniowe:** ⛔ BRAK
- **Obroty 0/90/180/270:** Nieprzetestowane
- **OCENA:** ⛔ **NIEZGODNY** - brak spójności

#### ETAP-parity gate
- **Geometria:** Niespójna
- **Proporcje:** Niespójne
- **Orientacja:** Niespójna
- **Semantyka:** Mieszane standardy
- **OCENA:** ⛔ **NIEMOŻLIWE DO OSIĄGNIĘCIA ETAP-PARITY**

**STATUS: REJECT**

---

## DECISION (BINDING)

### Decyzja końcowa

**⛔ REJECT wszystkich repozytoriów OSS**

**Uzasadnienie:**

1. **Brak ETAP-parity:** Żadne z repozytoriów nie oferuje symboli zgodnych 1:1 z ETAP. Wszystkie bazują na IEC 60617 lub własnych stylach, które różnią się od stylu ETAP.

2. **Problemy licencyjne:**
   - GPLv2 (power-system-shapes) - copyleft
   - CC BY-SA 3.0 (electricalsymbols) - share-alike

3. **Problemy techniczne:**
   - Brak definicji portów przyłączeniowych
   - Brak specyfikacji obrotów
   - Niespójna geometria między źródłami

4. **Reguła BINDING:**
   > "Jeżeli symbole nie pozwalają na ETAP-parity 1:1, WÓWCZAS NATYCHMIAST PRZERWIJ IMPORT"

### Plan działania

**→ Własna biblioteka ETAP-parity**

Konieczne jest utworzenie własnej biblioteki symboli SLD spełniającej następujące wymagania:

1. **Zgodność z ETAP:** Geometria, proporcje i orientacja 1:1 z ETAP
2. **Format:** SVG z czystą strukturą
3. **Porty:** Formalna definicja portów przyłączeniowych
4. **Obroty:** Obsługa 0°, 90°, 180°, 270° bez artefaktów
5. **Licencja:** Własność projektu MV-Design-PRO

### Następne kroki

1. Zdefiniować listę wymaganych symboli (busbar, circuit breaker, transformer, generator, motor, cable, switch, etc.)
2. Opracować specyfikację geometrii zgodną z ETAP
3. Utworzyć bazowe SVG z portami i obsługą rotacji
4. Zintegrować z rendererem SLD (osobny PR)

---

## Appendix A: Wymagane symbole ETAP-parity

Lista symboli do implementacji w przyszłym PR:

### Szyny zbiorcze (Busbars)
- [ ] Szyna pozioma
- [ ] Szyna pionowa
- [ ] Węzeł połączeniowy

### Aparatura łączeniowa
- [ ] Wyłącznik mocy (Circuit Breaker) - CB
- [ ] Rozłącznik (Disconnector) - DS
- [ ] Uziemnik (Earthing Switch) - ES
- [ ] Odłącznik izolacyjny
- [ ] Wyłącznik obciążenia (Load Break Switch)

### Transformatory
- [ ] Transformator 2-uzwojeniowy
- [ ] Transformator 3-uzwojeniowy
- [ ] Autotransformator
- [ ] Transformator z regulacją (OLTC)

### Generatory i silniki
- [ ] Generator synchroniczny
- [ ] Silnik asynchroniczny
- [ ] Silnik synchroniczny

### Linie i kable
- [ ] Linia napowietrzna
- [ ] Kabel
- [ ] PCC (Punkt Wspólnego Przyłączenia)

### Elementy pomocnicze
- [ ] Przekładnik prądowy (CT)
- [ ] Przekładnik napięciowy (VT)
- [ ] Odgromnik
- [ ] Kondensator
- [ ] Reaktor

---

## Appendix B: Specyfikacja portów i rotacji (szablon)

```typescript
interface SymbolPort {
  id: string;
  position: { x: number; y: number };
  direction: 'north' | 'south' | 'east' | 'west';
  type: 'electrical' | 'control';
}

interface SymbolSpec {
  id: string;
  name: string;
  category: string;
  viewBox: string;
  defaultSize: { width: number; height: number };
  ports: SymbolPort[];
  rotations: [0, 90, 180, 270];
  svgPath: string;
}
```

---

## Appendix C: Źródła (Sources)

- [nicorikken/power-system-shapes](https://github.com/nicorikken/power-system-shapes)
- [powsybl/powsybl-diagram](https://github.com/powsybl/powsybl-diagram)
- [upb-lea/Inkscape_electric_Symbols](https://github.com/upb-lea/Inkscape_electric_Symbols)
- [danyill/inkscape-symbols-power](https://github.com/danyill/inkscape-symbols-power)
- [chille/electricalsymbols](https://github.com/chille/electricalsymbols)
- [Wikimedia Commons - SVG electrical symbols](https://commons.wikimedia.org/wiki/Category:SVG_electrical_symbols)
- [IEC 60617 Standard](https://std.iec.ch/iec60617)
- [ETAP Single-Line Diagram](https://etap.com/product/electrical-single-line)
