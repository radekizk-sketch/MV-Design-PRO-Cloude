# UI V3 — REGUŁY HIGIENY REPOZYTORIUM (KANON)

**Status**: BINDING
**Data**: 2026-02-23
**Wersja**: 1.0.0
**Zakres**: Reguły czystości kodu, dokumentów i CI dla UI V3

---

## 1. REGUŁY GREP-ZERO

Następujące terminy MUSZĄ mieć zero trafień w kodzie UI i dokumentach wiążących:

| Termin | Zakres skanowania | Strażnik |
|--------|-------------------|----------|
| `PCC` | `frontend/src/`, `docs/ui/` | `pcc_zero_guard.py` |
| `BoundaryNode` | `frontend/src/`, `backend/src/network_model/` | `pcc_zero_guard.py` |
| `Connection Point` | `frontend/src/` (w ciągach użytkownika) | `pcc_zero_guard.py` |
| `Virtual Node` | `frontend/src/`, `backend/src/network_model/` | `pcc_zero_guard.py` |
| `Aggregated Element` | `frontend/src/`, `backend/src/network_model/` | `pcc_zero_guard.py` |
| `P7`, `P11`, `P14`, `P17`, `P20` (nazwy kodowe) | `frontend/src/` (ciągi UI) | `no_codenames_guard.py` |
| `draft_graph`, `draftGraph` | `frontend/src/` | nowy: `no_draft_graph_guard.py` |
| `local_truth`, `localTruth` | `frontend/src/ui/wizard/` | `local_truth_guard.py` |
| `feature_flag` na krytycznej ścieżce | `frontend/src/ui/sld/core/`, `frontend/src/engine/` | nowy: `no_feature_flag_critical_guard.py` |

### Reguła: Nowy strażnik `no_draft_graph_guard.py`
```python
# Skanuj frontend/src/ na obecność "draft_graph", "draftGraph", "DraftGraph"
# Dozwolone: komentarze z "// ZAKAZ: draft_graph" (dokumentacja zakazu)
# Wynik: 0 trafień = PASS, >0 = FAIL
```

### Reguła: Nowy strażnik `no_feature_flag_critical_guard.py`
```python
# Skanuj frontend/src/ui/sld/core/ i frontend/src/engine/sld-layout/
# na obecność: "featureFlag", "feature_flag", "FF_", "isEnabled("
# Dozwolone: brak
# Wynik: 0 trafień = PASS, >0 = FAIL
```

---

## 2. REGUŁY TERMINOLOGICZNE UI

### 2.1 Zakaz anglicyzmów
Ciągi widoczne w UI (etykiety, komunikaty, tooltips) MUSZĄ być w 100% po polsku.

| Zakazany anglicyzm | Wymagana polska etykieta |
|--------------------|------------------------|
| „Bus" | „Szyna" |
| „Branch" | „Odcinek" |
| „Switch" | „Łącznik" |
| „Breaker" | „Wyłącznik" |
| „Load" | „Obciążenie" |
| „Source" | „Źródło" |
| „Overlay" | „Nakładka" (lub „Nakładka wyników") |
| „Snapshot" | „Migawka" |
| „Readiness" | „Gotowość" |
| „Fix Action" | „Akcja naprawcza" |
| „Proof Pack" | „Paczka dowodowa" |
| „Study Case" | „Przypadek obliczeniowy" |
| „Run" | „Przebieg" (analizy) |
| „Catalog" | „Katalog" |
| „Type Library" | „Biblioteka typów" |
| „Power Flow" | „Rozpływ mocy" |
| „Short Circuit" | „Zwarcie" |

**Strażnik**: `no_codenames_guard.py` + `forbidden_ui_terms_guard.py`
**Kanoniczny słownik**: UI_V3_SYSTEM_SPEC_CANONICAL.md §6

### 2.2 Dozwolone terminy techniczne w kodzie
W nazwach zmiennych, typów i plików dozwolone są angielskie nazwy techniczne:
- `VisualGraphV1`, `LayoutResultV1`, `OverlayPayloadV1`
- `DomainOpEnvelope`, `ReadinessProfileV1`, `FixAction`
- `NetworkSnapshot`, `TopologyAdapterV2`

**Zasada**: Angielski w kodzie, polski w UI. Bez mieszania.

---

## 3. KATALOG DOCELOWY DOKUMENTÓW

### 3.1 Struktura docelowa
```
mv-design-pro/docs/ui/
├── UI_V3_SYSTEM_SPEC_CANONICAL.md        ← Specyfikacja systemu V3
├── UI_V3_WORKFLOWS_SN_GPZ_CANONICAL.md   ← Przepływy pracy klik-po-kliku
├── UI_V3_STATE_MODEL_CANONICAL.md        ← Model stanu UI
├── UI_V3_SLD_ARCH_CANONICAL.md           ← Architektura SLD
├── UI_V3_REPO_HYGIENE_RULES.md           ← Reguły higieny (ten dokument)
├── UI_V3_TEST_MATRIX_CANONICAL.md        ← Matryca testów
├── UI_V3_INVARIANTS_OSD_30_PLUS.md       ← Niezmienniki OSD
├── UI_V3_PR_ROADMAP.md                   ← Plan wdrożeniowy PR
├── UI_V3_RECON_REPO_MAP.md               ← Mapa repozytorium
│
├── (istniejące kontrakty UI — BEZ ZMIAN)
├── SLD_UI_CONTRACT.md
├── RESULTS_BROWSER_CONTRACT.md
├── ELEMENT_INSPECTOR_CONTRACT.md
├── ... (34 istniejące kontrakty)
```

### 3.2 Konwencja nazewnictwa dokumentów V3
- Prefiks: `UI_V3_`
- Sufiks statusu: `_CANONICAL` (wiążący) lub `_REFERENCE` (informacyjny)
- Format: `UI_V3_<ZAKRES>_CANONICAL.md`
- Język treści: polski (etykiety, opisy, komentarze)
- Język kodu w treści: angielski (nazwy typów, zmiennych)

---

## 4. PLAN CZYSZCZENIA

### 4.1 Identyfikacja duplikatów
| Istniejący dokument | Relacja z UI V3 | Akcja |
|---------------------|-----------------|-------|
| `FAZA_0_AUDYT_REPOZYTORIUM.md` | Zastąpiony przez `UI_V3_RECON_REPO_MAP.md` | Archiwizuj |
| `URUCHOMIENIE_UX_SLD.md` | Częściowo zastąpiony przez `UI_V3_SLD_ARCH_CANONICAL.md` | Zachowaj jako REFERENCE |
| `UX_FLOW_SN_V1_GPZ_LIVE_SLD.md` | Zastąpiony przez `UI_V3_WORKFLOWS_SN_GPZ_CANONICAL.md` | Archiwizuj |
| `powerfactory_ui_parity.md` | Nadal aktualny — uzupełnienie V3 | Zachowaj jako REFERENCE |
| `UI_ETAP_POWERFACTORY_PARITY.md` | Nadal aktualny — uzupełnienie V3 | Zachowaj jako REFERENCE |

### 4.2 Reguła archiwizacji
- Dokumenty zastąpione NIGDY nie są usuwane — przenoszone do `docs/ui/archive/`.
- Archiwizacja w PR z adnotacją: „Zastąpiony przez UI_V3_<DOKUMENT>".
- Archiwizowane dokumenty mają dodany nagłówek: `⚠️ ARCHIWUM — zastąpiony przez ...`.

### 4.3 Czyszczenie martwego kodu (frontend)
| Obszar | Kryterium martwego kodu | Akcja |
|--------|------------------------|-------|
| Nieużywane magazyny Zustand | Import count = 0 | Usunięcie w dedykowanym PR |
| Nieużywane komponenty | Import count = 0, brak referencji w routingu | Usunięcie w dedykowanym PR |
| Nieużywane typy | Brak importu poza plikiem definicji | Usunięcie |
| Nieużywane hooki | Import count = 0 | Usunięcie |

**ZAKAZ**: Usuwanie martwego kodu w PR z nowymi funkcjonalnościami — osobne PR.

---

## 5. REGUŁY COMMITÓW I PR

### 5.1 Rozmiar PR
- Maksymalnie 500 linii zmienionego kodu per PR (bez generowanego).
- Dokumenty BINDING mogą być większe (nielimitowane).
- Jeśli PR przekracza 500 linii — podziel na mniejsze.

### 5.2 Opis PR
```
## Podsumowanie
[1-3 zdania po polsku]

## Zakres zmian
- Pliki zmienione: [lista]
- Pliki dodane: [lista]
- Pliki usunięte: [lista]

## Plan testów
- [ ] [test 1]
- [ ] [test 2]

## Zgodność
- [ ] Brak PCC (grep-zero)
- [ ] Brak nazw kodowych
- [ ] Brak anglicyzmów w UI
- [ ] Testy deterministyczne PASS
- [ ] Strażnicy CI PASS
```

### 5.3 Nazewnictwo branchy
- `claude/ui-v3-<zakres>-<session_id>` — prace AI
- `feature/ui-v3-<zakres>` — prace manualne
- `fix/ui-v3-<opis>` — poprawki

---

## 6. REGUŁY CI

### 6.1 Istniejące strażnicy (nie modyfikować)
| Strażnik | Przepływ CI | Status |
|----------|------------|--------|
| `pcc_zero_guard.py` | python-tests.yml | AKTYWNY |
| `no_codenames_guard.py` | frontend-checks.yml | AKTYWNY |
| `sld_determinism_guards.py` | sld-determinism.yml | AKTYWNY |
| `docs_guard.py` | docs-guard.yml | AKTYWNY |
| Pozostałe 29 strażników | Różne | AKTYWNE |

### 6.2 Nowe strażnicy do dodania (UI V3)
| Strażnik | Przepływ CI | Cel |
|----------|------------|-----|
| `no_draft_graph_guard.py` | frontend-checks.yml | Zero „draft graph" w frontend |
| `no_feature_flag_critical_guard.py` | frontend-checks.yml | Zero feature flag na krytycznej ścieżce |
| `ui_v3_state_invariants_guard.py` | frontend-checks.yml | Sprawdzenie niezmienników stanu |
| `ui_v3_polish_labels_guard.py` | frontend-checks.yml | Walidacja polskich etykiet w UI |

### 6.3 Reguła dodawania strażnika
1. Strażnik to skrypt Python lub TypeScript.
2. Wyjście: `EXIT 0` = PASS, `EXIT 1` = FAIL + komunikat.
3. Strażnik MUSI mieć test jednostkowy (`tests/ci/test_<guard>.py`).
4. Strażnik dodawany do przepływu CI w osobnym PR.

---

## 7. REGUŁY IMPORTÓW (FRONTEND)

### 7.1 Granice importów
```
ui/sld/core/          → NIE importuje z: ui/wizard/, ui/results-*, ui/topology/modals/
ui/sld-overlay/       → IMPORTUJE z: ui/sld/core/ (LayoutResult), ui/contracts/ (ResultSet)
ui/wizard/            → IMPORTUJE z: ui/sld/core/ (podgląd SLD), ui/topology/ (domainApi)
ui/property-grid/     → NIE importuje z: ui/sld-editor/, ui/wizard/
engine/sld-layout/    → NIE importuje z: ui/ (zero zależności od React)
modules/sld/cdse/     → IMPORTUJE z: ui/sld/core/, ui/topology/, ui/selection/
```

### 7.2 Reguła warstw
- Warstwa niższa (engine/) NIE importuje z warstwy wyższej (ui/).
- Warstwa prezentacji (ui/sld/) NIE importuje z warstwy solverów (backend).
- Kontrakty (`ui/contracts/`) nie mają zależności od komponentów React.

---

## 8. REGUŁY DETERMINISTYCZNOŚCI

### 8.1 Sortowanie
- Wszystkie listy w renderingu sortowane deterministycznie (po ID lub nazwie).
- `Array.sort()` ZAWSZE z jawnym komparatorem (nie domyślny Unicode).
- `Map.entries()` iterowane w kolejności wstawiania — używać `Array.from().sort()`.

### 8.2 Identyfikatory
- ID elementów generowane deterministycznie (`ui/sld-editor/utils/deterministicId.ts`).
- Brak `Math.random()`, `Date.now()`, `crypto.randomUUID()` w logice SLD.
- UUID dozwolone WYŁĄCZNIE w: kluczu idempotentności operacji, ID sesji.

### 8.3 Hashe
- SHA-256 dla migawek, układów, eksportów.
- Hash obliczany z deterministycznie serializowanych danych (posortowane klucze JSON).

---

*Dokument wiążący. Reguły obowiązują od pierwszego PR UI V3.*
