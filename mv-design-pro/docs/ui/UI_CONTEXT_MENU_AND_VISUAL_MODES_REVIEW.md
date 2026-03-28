# Menu kontekstowe i tryby wizualne — przegląd

> **Dokument**: UI_CONTEXT_MENU_AND_VISUAL_MODES_REVIEW.md
> **Status**: ZAMKNIETY
> **Data audytu**: 2026-03-28
> **Warstwa**: Presentation Layer (SLD Context Menu + Visual Modes)

---

## 1. Zakres audytu

Niniejszy dokument opisuje aktualny stan integracji menu kontekstowego w SLD
oraz system trybów wizualnych (visual filter modes). Audyt obejmuje:

- Pokrycie typów elementow w `contextMenuIntegration.ts`
- Sygnatury builderow dla specjalnych typow
- Tryby wizualne i ich aktywacja
- Braki i uzasadnienie wykluczonych typow

---

## 2. contextMenuIntegration.ts — pokrycie ElementTypes

### 2.1. Obslugiwane typy (21/59)

Modul `contextMenuIntegration.ts` obsluguje nastepujace 21 typow elementow:

| # | ElementType | Kategoria | Uwagi |
|---|-------------|-----------|-------|
| 1 | `Bus` | Infrastruktura | Standardowe menu: properties, delete, connect |
| 2 | `LineBranch` | Galaz | Menu z opcjami: split, insert node, properties |
| 3 | `TransformerBranch` | Galaz | Menu z parametrami katalogowymi |
| 4 | `Switch` | Lacznik | Open/Close toggle, properties |
| 5 | `Source` | Zrodlo | External grid — menu z parametrami mocy |
| 6 | `Load` | Odbiory | Load profile, properties |
| 7 | `Generator` | Zrodlo | Generator synchroniczny — parametry |
| 8 | `Station` | Kontener | Station-level operations, add bay |
| 9 | `BaySN` | Pole SN | Pole w rozdzielnicy SN |
| 10 | `PVInverter` | OZE | Inwerter PV — parametry mocy, cos(phi) |
| 11 | `BESSInverter` | OZE/Magazyn | Battery Energy Storage System |
| 12 | `SwitchSN` | Lacznik SN | Dedykowany builder (patrz 2.2) |
| 13 | `SwitchNN` | Lacznik NN | Dedykowany builder (patrz 2.2) |
| 14 | `LineSN` | Linia SN | Linia napowietrzna SN |
| 15 | `CableSN` | Kabel SN | Kabel podziemny SN |
| 16 | `BusCoupler` | Lacznik szyn | Sprzeglo szyn — open/close |
| 17 | `Disconnector` | Odlacznik | Odlacznik — open/close, no breaking capacity |
| 18 | `Fuse` | Bezpiecznik | Bezpiecznik — replace, properties |
| 19 | `BayNN` | Pole NN | Pole w rozdzielnicy NN |
| 20 | `LoadNN` | Odbiory NN | Odbiory strony NN |
| 21 | `GeneratorSync` | Generator | Generator synchroniczny (dedykowany typ) |

### 2.2. Specjalne sygnatury builderow

Dwa typy lacznikow posiadaja dedykowane buildery z rozszerzonym interfejsem:

```typescript
// SwitchSN — builder z trojargumentowa sygnatura
buildSwitchSNContextMenu(
  mode: VisualMode,
  switchState: SwitchState,    // OPEN | CLOSED | UNKNOWN
  handlers: SwitchSNHandlers   // onToggle, onProperties, onDelete, onReplace
): ContextMenuItem[]

// SwitchNN — analogiczny builder dla strony NN
buildSwitchNNContextMenu(
  mode: VisualMode,
  switchState: SwitchState,
  handlers: SwitchNNHandlers
): ContextMenuItem[]
```

Uzasadnienie dedykowanych builderow:
- Stan lacznika (`switchState`) wplywa na dostepne akcje (np. nie mozna otworzyc juz otwartego)
- Tryb wizualny (`mode`) filtruje widoczne opcje (np. w PROTECTION_ONLY ukrywane sa opcje edycji topologii)
- Handlery sa typowane per-typ, co zapobiega blednym wywolaniom

### 2.3. Wykluczony typ: Terminal

**Terminal** jest swiadomie wykluczony z `contextMenuIntegration.ts`.

**Uzasadnienie**: Terminal wymaga kontekstu SLD (pozycja graficzna, stan polaczenia,
orientacja symbolu) do poprawnego zbudowania menu. W obecnej architekturze Terminal
jest obslugiwany bezposrednio przez `SLDInteractionHandler`, ktory posiada pelny
kontekst renderingu.

Konkretnie, Terminal potrzebuje informacji `terminalStatus` (connected/disconnected/floating),
ktora jest dostepna wylacznie w warstwie SLD renderer, a nie w warstwie modelu topologicznego.

### 2.4. Pokrycie vs calkowita liczba typow

- **Pokryte**: 21 z 59 zdefiniowanych ElementTypes
- **Ocena**: Wystarczajace dla workflow SN (srednie napiecie)
- Pozostale 38 typow to glownie:
  - Typy WN (wysokie napiecie) — poza zakresem MVP
  - Typy pomiarowe (CT, VT, Meter) — brak interakcji kontekstowej
  - Typy abstrakcyjne (TopologyNode, GraphEdge) — nie sa renderowane w SLD

---

## 3. Tryby wizualne (Visual Modes)

### 3.1. Definicja trybów

System definiuje 5 trybów wizualnych kontrolujacych widocznosc i stylowanie elementow na SLD:

| # | Tryb | Opis | Zastosowanie |
|---|------|------|-------------|
| 1 | `ALL` | Domyslny — wszystkie elementy widoczne | Normalny tryb pracy |
| 2 | `READINESS_ONLY` | Podswietlenie elementow z blokerami readiness | Diagnostyka gotowosci do analizy |
| 3 | `SOURCES_ONLY` | Podswietlenie zrodel (Source, Generator, PV, BESS) | Przeglad infrastruktury zrodlowej |
| 4 | `NN_ONLY` | Podswietlenie elementow strony NN | Analiza strony niskiego napiecia |
| 5 | `PROTECTION_ONLY` | Podswietlenie elementow z przypisana ochrona | Koordynacja zabezpieczen |

### 3.2. Skroty klawiaturowe

| Skrot | Akcja | Tryb docelowy |
|-------|-------|---------------|
| `Ctrl+G` | Toggle READINESS_ONLY | Przelacz miedzy ALL a READINESS_ONLY |
| `Ctrl+Shift+S` | Toggle SOURCES_ONLY | Przelacz miedzy ALL a SOURCES_ONLY |

Pozostale tryby (`NN_ONLY`, `PROTECTION_ONLY`) aktywowane sa z paska narzedzi lub menu glownego.

### 3.3. Mechanizm dystrybucji zmiany trybu

Zmiana trybu wizualnego jest propagowana przez `CustomEvent`:

```typescript
// Dispatch
window.dispatchEvent(new CustomEvent('sld:visual-filter-change', {
  detail: { mode: VisualMode }
}));

// Listen (w komponentach SLD)
window.addEventListener('sld:visual-filter-change', (e: CustomEvent) => {
  const { mode } = e.detail;
  applyVisualFilter(mode);
});
```

Zastosowanie `CustomEvent` zamiast Zustand store jest zamierzone — tryb wizualny
jest efemerydalny (nie persystowany) i musi byc dostepny rowniez w komponentach
poza drzewem React (np. w canvas renderer).

### 3.4. Wplyw trybu na menu kontekstowe

Tryb wizualny wplywa na zawartosc menu kontekstowego:

- **ALL**: Pelne menu ze wszystkimi akcjami
- **READINESS_ONLY**: Tylko akcje naprawcze (Fix Actions) + Properties
- **SOURCES_ONLY**: Akcje zrodlowe (parametry mocy, profil generacji) + Properties
- **NN_ONLY**: Pelne menu dla elementow NN, zredukowane dla elementow SN
- **PROTECTION_ONLY**: Akcje ochrony (assign device, edit curve, coordination) + Properties

---

## 4. Podsumowanie i status

| Aspekt | Stan | Komentarz |
|--------|------|-----------|
| Pokrycie typow | 21/59 | Wystarczajace dla SN workflow |
| Terminal | Wykluczony | Wymaga kontekstu SLD (terminalStatus) |
| Buildery specjalne | 2 (SwitchSN, SwitchNN) | Trojargumentowa sygnatura z mode + switchState |
| Tryby wizualne | 5 | ALL, READINESS_ONLY, SOURCES_ONLY, NN_ONLY, PROTECTION_ONLY |
| Skroty klawiaturowe | 2 | Ctrl+G, Ctrl+Shift+S |
| Event dispatch | CustomEvent | sld:visual-filter-change |

**Status: ZAMKNIETY** — 21/59 typow pokrytych (wystarczajace dla SN workflow), Terminal wymaga kontekstu SLD.

---

*Dokument wygenerowany w ramach audytu UI warstwy prezentacyjnej MV-Design-PRO.*
