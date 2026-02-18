# UX FLOW V1 — Budowa sieci SN od GPZ z SLD na żywo

**Wersja:** 1.0
**Data:** 2026-02-16
**Status:** WIĄŻĄCY (BINDING)
**Warstwa:** Application + Domain + Presentation

---

## 1. DEFINICJE PRECYZYJNE

### 1.1 Snapshot (Snapshot domenowy)
Niezmienny obraz domeny (`EnergyNetworkModel`). Każda operacja tworzy nowy Snapshot.
Hash SHA-256 gwarantuje determinizm. Snapshot jest **jedynym źródłem prawdy** — kreator
NIE przechowuje niezależnego modelu.

### 1.2 Operacja domenowa
Atomowa zmiana topologii sieci. Jedno wywołanie = jeden nowy Snapshot.
Kontrakt: `POST /enm/domain-ops` z envelope. Operacja jest deterministyczna — ten sam
Snapshot wejściowy + ten sam payload = identyczny Snapshot wyjściowy.

### 1.3 ElementId (ref_id)
Unikalny identyfikator elementu. Stabilny, deterministyczny, niezależny od UUID.
Format: `<prefix>/<seed>/<local_path>`.

### 1.4 Port
Punkt połączenia stacji: `SN_IN`, `SN_OUT`, `SN_BRANCH`, `NN_BUS`, `NN_OUT`.
Rola portu wynika z typu stacji (A/B/C/D).

### 1.5 Gotowość (Readiness)
Stan kompletności danych modelu sieci.
- `BLOKUJACE` — blokada analiz, użytkownik MUSI uzupełnić dane.
- `OSTRZEZENIE` — analizy mogą być ograniczone.

### 1.6 FixAction
Deklaratywna sugestia naprawcza. Prowadzi użytkownika do konkretnego elementu,
panelu i kroku. NIE wykonuje mutacji modelu.

### 1.7 Katalog
Biblioteka typów (linie, transformatory, łączniki). Wybór z katalogu materializuje
parametry do Snapshot. Brak katalogu **nie blokuje** rysowania SLD, ale **blokuje** analizy.

---

## 2. KANON NAZW OPERACJI (API)

| Nazwa kanoniczna (API) | Aliasy zgodności | Opis |
|------------------------|------------------|------|
| `add_grid_source_sn` | — | Dodaj źródło zasilania (GPZ) |
| `continue_trunk_segment_sn` | `add_trunk_segment_sn` | Kontynuuj magistralę SN |
| `insert_station_on_segment_sn` | `insert_station_on_trunk_segment_sn`, `insert_station_on_trunk_segment` | Wstaw stację SN/nN w odcinek |
| `start_branch_segment_sn` | `add_branch_segment_sn`, `start_branch_from_port` | Dodaj odgałęzienie SN |
| `insert_section_switch_sn` | — | Wstaw łącznik sekcyjny |
| `connect_secondary_ring_sn` | `connect_ring_sn`, `connect_secondary_ring` | Zamknij pierścień |
| `set_normal_open_point` | — | Ustaw punkt normalnie otwarty (NOP) |
| `add_transformer_sn_nn` | — | Dodaj transformator SN/nN |
| `assign_catalog_to_element` | — | Przypisz katalog do elementu |
| `update_element_parameters` | — | Aktualizuj parametry elementu |

**Zasada:** Frontend wysyła WYŁĄCZNIE kanoniczne nazwy. Aliasy tłumaczone w jednym
miejscu (warstwa zgodności w `ALIAS_MAP`).

---

## 3. KANONICZNA DEFINICJA insert_at

```json
{
  "mode": "RATIO | ODLEGLOSC_OD_POCZATKU_M | ANCHOR",
  "value": "<zależne od mode>"
}
```

| Mode | Typ wartości | Opis |
|------|-------------|------|
| `RATIO` | `float 0.0..1.0` | Współczynnik podziału odcinka |
| `ODLEGLOSC_OD_POCZATKU_M` | `float >= 0` | Odległość w metrach od początku |
| `ANCHOR` | `{anchor_id, offset_m}` | Punkt kotwicy z offsetem |

### Mapowanie etykiet UI

| Etykieta UI | insert_at API |
|------------|---------------|
| `SRODEK_ODCINKA` | `{"mode":"RATIO","value":0.5}` |
| `PODZIAL_WSPOLCZYNNIKIEM` | `{"mode":"RATIO","value":x}` |
| `ODLEGLOSC_OD_POCZATKU` | `{"mode":"ODLEGLOSC_OD_POCZATKU_M","value":m}` |

**WORLD_POINT** dozwolone WYŁĄCZNIE w warstwie UI jako wejście interakcji,
NIE jako kontrakt operacji.

---

## 4. WSPÓLNY ENVELOPE OPERACJI

### Żądanie
```
POST /api/cases/{case_id}/enm/domain-ops
```
```json
{
  "project_id": "prj_0001",
  "snapshot_base_hash": "sha256:...",
  "operation": {
    "name": "<KANONICZNA_NAZWA>",
    "idempotency_key": "op:<name>:<stable_seed>",
    "payload": { ... }
  }
}
```

### Odpowiedź
```json
{
  "snapshot": { ... },
  "logical_views": { "trunks": [...] },
  "readiness": {
    "ready": false,
    "blockers": [{"code": "...", "severity": "BLOKUJACE", "message_pl": "..."}],
    "warnings": [{"code": "...", "severity": "OSTRZEZENIE", "message_pl": "..."}]
  },
  "fix_actions": [
    {"code": "...", "action_type": "SELECT_CATALOG", "element_ref": "...", "panel": "...", "message_pl": "..."}
  ],
  "changes": {
    "created_element_ids": ["..."],
    "updated_element_ids": ["..."],
    "deleted_element_ids": ["..."]
  },
  "selection_hint": {"element_id": "...", "element_type": "...", "zoom_to": true},
  "audit_trail": [{"step": 1, "action": "...", "element_id": "..."}],
  "domain_events": [{"event_seq": 1, "event_type": "...", "element_id": "..."}]
}
```

---

## 5. SEKWENCJA V1 — KLIK PO KLIKU

### Krok 1: Dodaj GPZ (źródło SN)

- **Akcja UI:** Kliknij „Dodaj GPZ"
- **Operacja:** `add_grid_source_sn`
- **Payload:**
```json
{
  "voltage_kv": 15.0,
  "sk3_mva": 250,
  "source_name": "GPZ Główny"
}
```
- **Wymagane:** `voltage_kv`
- **Efekt SLD:** Pojawia się symbol GPZ z szyną SN
- **Blokery:** Brak parametrów zwarciowych (E008)
- **FixAction:** Otwórz modal źródła → uzupełnij Sk''

### Krok 2: Dodaj pierwszy odcinek magistrali SN

- **Akcja UI:** Kliknij końcówkę szyny GPZ → „Kontynuuj magistralę"
- **Operacja:** `continue_trunk_segment_sn`
- **Payload:**
```json
{
  "trunk_id": "gpz/<seed>/corridor_01",
  "from_terminal_id": "gpz/<seed>/bus_sn",
  "segment": {
    "rodzaj": "KABEL",
    "dlugosc_m": 500.0,
    "catalog_ref": null
  }
}
```
- **Wymagane:** `trunk_id`, `from_terminal_id`, `segment.dlugosc_m`
- **Efekt SLD:** Nowy odcinek kabla rysuje się od GPZ
- **Blokery:** `line.catalog_ref_missing` (brak katalogu kabla)
- **FixAction:** „Wybierz kabel z katalogu" → otwarcie przeglądarki katalogu

### Krok 3: Kontynuuj magistralę SN

- Identyczny jak Krok 2, ale `from_terminal_id` wskazuje na ostatnią szynę.

### Krok 4: Wstaw stację SN/nN (typ B — przelotowa)

- **Akcja UI:** Kliknij na odcinek → „Wstaw stację"
- **Operacja:** `insert_station_on_segment_sn`
- **Payload:** Patrz sekcja 6 (przykład typ B)
- **Efekt SLD:** Odcinek rozcięty, blok stacji wstawiony, magistrala ciągła
- **Blokery:** `catalog.transformer_missing`, `catalog.line_missing`
- **FixAction:** „Wybierz transformator z katalogu"

### Krok 5: Dodaj odgałęzienie z portu

- **Akcja UI:** Kliknij szynę → „Dodaj odgałęzienie"
- **Operacja:** `start_branch_segment_sn`
- **Payload:**
```json
{
  "from_bus_ref": "stn/<seed>/sn_bus",
  "segment": {"rodzaj": "KABEL", "dlugosc_m": 300.0}
}
```
- **Efekt SLD:** Odgałęzienie rysuje się od szyny stacji

### Krok 6: Wstaw łącznik sekcyjny

- **Akcja UI:** Kliknij na odcinek → „Wstaw łącznik"
- **Operacja:** `insert_section_switch_sn`
- **Payload:**
```json
{
  "segment_id": "seg/<seed>/segment",
  "insert_at": {"mode": "RATIO", "value": 0.5},
  "switch_type": "ROZLACZNIK",
  "normal_state": "closed"
}
```
- **Efekt SLD:** Łącznik wstawiony w odcinek

### Krok 7: Zamknij pierścień i wskaż NOP

- **Operacja 1:** `connect_secondary_ring_sn`
```json
{
  "from_bus_ref": "bus/<seed>/downstream",
  "to_bus_ref": "bus/<seed2>/downstream",
  "segment": {"rodzaj": "KABEL", "dlugosc_m": 200.0}
}
```
- **Operacja 2:** `set_normal_open_point`
```json
{
  "switch_ref": "sw/<seed>/switch",
  "corridor_ref": "gpz/<seed>/corridor_01"
}
```
- **Efekt SLD:** Pierścień zamknięty, NOP zaznaczony

### Krok 8: Dodaj transformator SN/nN

- **Operacja:** `add_transformer_sn_nn`
- **Payload:**
```json
{
  "hv_bus_ref": "stn/<seed>/sn_bus",
  "lv_bus_ref": "stn/<seed>/nn_bus",
  "transformer_catalog_ref": "TR-160kVA-Dyn11",
  "station_ref": "stn/<seed>/station"
}
```

---

## 6. OPERACJA KRYTYCZNA: insert_station_on_segment_sn

### 6.1 Algorytm domenowy

**Krok 0 — Walidacja wejścia:**
- Segment istnieje i jest typu SN (`cable`/`line_overhead`)
- `insert_at` w zakresie
- `station_type` w {A, B, C, D}

**Krok 1 — Topologia segmentu:**
- Odczytaj `from_bus_ref`, `to_bus_ref`, `length_km`, `catalog_ref`

**Krok 2 — Rozdzielenie segmentu:**
- Usuń stary segment
- Utwórz szynę SN stacji (`sn_bus`)
- Utwórz lewy odcinek: `from_bus` → `sn_bus`
- Utwórz prawy odcinek: `sn_bus` → `to_bus`
- Zachowaj `catalog_ref` jeśli istniał

**Krok 3 — Blok stacji (podgraf):**
- Utwórz `Substation`
- Utwórz pola SN (`Bay`) wg `sn_fields`
- Utwórz transformator SN/nN
- Utwórz szynę nN
- Utwórz wyłącznik główny nN
- Utwórz odpływy nN

**Krok 4 — Podłączenie:**
- Typ B: IN→OUT (ciągłość magistrali)
- Typ C: IN→OUT + BRANCH
- Typ D: 2 sekcje szyn + sprzęgło

**Krok 5 — Gotowość:**
- Brak katalogu → BLOKER
- Brak parametrów TR → BLOKER
- FixActions wskazują elementy i panele

### 6.2 Identyfikatory deterministyczne

```
station_seed = sha256(canonical_json({
  segment_id, insert_at, station_type
}))[:32]

Element IDs:
  stn/<seed>/station
  stn/<seed>/sn_bus
  stn/<seed>/sn_field/000
  stn/<seed>/sn_field/001
  stn/<seed>/transformer
  stn/<seed>/nn_bus
  stn/<seed>/nn_main_breaker
  stn/<seed>/nn_feeder/000
```

### 6.3 Przykład 1: Typ B (przelotowa)

```json
{
  "segment_id": "seg/abc123/segment",
  "insert_at": {"mode": "RATIO", "value": 0.5},
  "station": {
    "station_type": "B",
    "station_role": "STACJA_SN_NN",
    "station_name": "Stacja B-01",
    "sn_voltage_kv": 15.0,
    "nn_voltage_kv": 0.4
  },
  "sn_fields": [
    {"field_role": "LINIA_IN", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "LINIA_OUT", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "TRANSFORMATOROWE", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "PRZEKLADNIK_PRADOWY"], "catalog_bindings": null}
  ],
  "transformer": {"create": true, "transformer_catalog_ref": null, "model_type": "DWU_UZWOJENIOWY", "tap_changer_present": false},
  "nn_block": {
    "create_nn_bus": true,
    "main_breaker_nn": true,
    "outgoing_feeders_nn_count": 1,
    "outgoing_feeders_nn": [
      {"feeder_role": "ODPLYW_NN", "catalog_bindings": null}
    ]
  },
  "options": {"create_transformer_field": true, "create_default_fields": true, "create_nn_bus": true}
}
```

### 6.4 Przykład 2: Typ C (odgałęźna)

```json
{
  "segment_id": "seg/def456/segment",
  "insert_at": {"mode": "ODLEGLOSC_OD_POCZATKU_M", "value": 250.0},
  "station": {
    "station_type": "C",
    "station_role": "STACJA_SN_NN",
    "sn_voltage_kv": 15.0,
    "nn_voltage_kv": 0.4
  },
  "sn_fields": [
    {"field_role": "LINIA_IN", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "LINIA_OUT", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "LINIA_ODG", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "TRANSFORMATOROWE", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "PRZEKLADNIK_PRADOWY"], "catalog_bindings": null}
  ],
  "transformer": {"create": true, "transformer_catalog_ref": null, "model_type": "DWU_UZWOJENIOWY", "tap_changer_present": false},
  "nn_block": {
    "create_nn_bus": true,
    "main_breaker_nn": true,
    "outgoing_feeders_nn_count": 2,
    "outgoing_feeders_nn": [
      {"feeder_role": "ODPLYW_NN", "catalog_bindings": null},
      {"feeder_role": "ODPLYW_NN", "catalog_bindings": null}
    ]
  },
  "options": {"create_transformer_field": true, "create_default_fields": true, "create_nn_bus": true}
}
```

### 6.5 Przykład 3: Typ D (sekcyjna)

```json
{
  "segment_id": "seg/ghi789/segment",
  "insert_at": {"mode": "RATIO", "value": 0.4},
  "station": {
    "station_type": "D",
    "station_role": "STACJA_SN_NN",
    "sn_voltage_kv": 15.0,
    "nn_voltage_kv": 0.4
  },
  "sn_fields": [
    {"field_role": "LINIA_IN", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "LINIA_OUT", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "GLOWICA_KABLOWA"], "catalog_bindings": null},
    {"field_role": "SPRZEGLO", "apparatus_plan": ["LACZNIK_GLOWNY_SN"], "catalog_bindings": null},
    {"field_role": "TRANSFORMATOROWE", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "PRZEKLADNIK_PRADOWY"], "catalog_bindings": null},
    {"field_role": "TRANSFORMATOROWE", "apparatus_plan": ["LACZNIK_GLOWNY_SN", "PRZEKLADNIK_PRADOWY"], "catalog_bindings": null}
  ],
  "transformer": {"create": true, "transformer_catalog_ref": null, "model_type": "DWU_UZWOJENIOWY", "tap_changer_present": true},
  "nn_block": {
    "create_nn_bus": true,
    "main_breaker_nn": true,
    "outgoing_feeders_nn_count": 2,
    "outgoing_feeders_nn": [
      {"feeder_role": "ODPLYW_NN", "catalog_bindings": null},
      {"feeder_role": "ODPLYW_REZERWOWY", "catalog_bindings": null}
    ]
  },
  "options": {"create_transformer_field": true, "create_default_fields": true, "create_nn_bus": true}
}
```

---

## 7. CONTINUE_TRUNK_SEGMENT_SN — PEŁNY JSON

```json
{
  "project_id": "prj_0001",
  "snapshot_base_hash": "sha256:abc123def456...",
  "operation": {
    "name": "continue_trunk_segment_sn",
    "idempotency_key": "op:continue_trunk:trunk_01/bus_03/cable_01",
    "payload": {
      "trunk_id": "gpz/abc123/corridor_01",
      "from_terminal_id": "gpz/abc123/bus_sn",
      "segment": {
        "rodzaj": "KABEL",
        "dlugosc_m": 450.0,
        "catalog_ref": null,
        "name": null
      },
      "parametry_jawne": {},
      "pozycja_widokowa": {"x": 500, "y": 200}
    }
  }
}
```

---

## 8. WALIDACJE — PEŁNA TABELA

| Kod | Poziom | Warunek | FixAction | Pierwszeństwo |
|-----|--------|---------|-----------|--------------|
| `station.insert.segment_missing` | BLOKUJACE | Segment nie istnieje | Wskaż segment na SLD | 1 |
| `station.insert.insert_at_invalid` | BLOKUJACE | Parametr poza zakresem | Popraw pozycję wstawienia | 2 |
| `station.insert.station_type_invalid` | BLOKUJACE | Typ nie w {A,B,C,D} | Wybierz prawidłowy typ | 3 |
| `topology.segment_not_sn` | BLOKUJACE | Segment nie jest SN | Wybierz segment SN | 4 |
| `topology.segment_already_split` | BLOKUJACE | Segment już podzielony | Wybierz inny segment | 5 |
| `catalog.line_missing` | BLOKUJACE | Brak katalogu linii | Wybierz z katalogu linii | 10 |
| `catalog.transformer_missing` | BLOKUJACE | Brak katalogu TR | Wybierz z katalogu TR | 11 |
| `nn.outgoing_feeder_min_1` | BLOKUJACE | Brak odpływu nN | Dodaj odpływ nN | 12 |
| `pv_bess.transformer_required` | BLOKUJACE | PV/BESS bez TR | Dodaj transformator | 13 |
| `line.catalog_ref_missing` | BLOKUJACE | Brak referencji | Przypisz katalog | 20 |
| `transformer.catalog_ref_missing` | BLOKUJACE | Brak katalogu TR | Przypisz katalog TR | 21 |
| `ring.nop_required` | OSTRZEZENIE | Pierścień bez NOP | Ustaw NOP | 30 |

---

## 9. KANONIZACJA (Determinizm)

### 9.1 JSON kanoniczny
- `sort_keys=True`
- `separators=(",", ":")`
- Brak spacji
- Stała reprezentacja liczb (bez notacji naukowej)
- Unicode NFC normalizacja

### 9.2 Kwantyzacja
- `quantum = 1e-6`
- `rounding_mode = HALF_EVEN`
- Dotyczy: RATIO w `insert_at`

### 9.3 Seed identyfikatorów
- **Zawiera:** `trunk_id`, `segment_id`, `cut`(insert_at), `station_type`
- **Wyklucza:** `ui.click_id`, `timestamp`, `world_point`

### 9.4 Format hash
- SHA-256 na kanonicznym JSON
- Pierwsze 16 bajtów w base16 (hex, 32 znaki)

---

## 10. ZDARZENIA DOMENOWE (insert_station_on_segment_sn)

| # | event_type | Opis |
|---|-----------|------|
| 1 | `SEGMENT_SPLIT` | Usunięcie starego segmentu |
| 2 | `CUT_NODE_CREATED` | Utworzenie szyny SN stacji |
| 3 | `STATION_CREATED` | Utworzenie stacji (podgraf) |
| 4 | `PORTS_CREATED` | Przypisanie portów |
| 5 | `FIELDS_CREATED_SN` | Utworzenie pól SN |
| 6 | `DEVICES_CREATED_SN` | Utworzenie aparatów SN |
| 7 | `TR_CREATED` | Utworzenie transformatora |
| 8 | `BUS_NN_CREATED` | Utworzenie szyny nN |
| 9 | `FIELDS_CREATED_NN` | Utworzenie pól nN |
| 10 | `DEVICES_CREATED_NN` | Utworzenie aparatów nN |
| 11 | `RECONNECTED_GRAPH` | Podłączenie stacji do grafu |
| 12 | `LOGICAL_VIEWS_UPDATED` | Aktualizacja magistrali |

---

## 11. MATERIALIZACJA KATALOGU

```json
{
  "materialized_params": {
    "lines_sn": {
      "<segment_id>": {
        "catalog_item_id": "...",
        "catalog_item_version": "...",
        "r_ohm_per_km": 0.32,
        "x_ohm_per_km": 0.08,
        "i_max_a": 275
      }
    },
    "transformers_sn_nn": {
      "<transformer_id>": {
        "catalog_item_id": "...",
        "catalog_item_version": "...",
        "u_k_percent": 4.5,
        "p0_kw": 0.32,
        "pk_kw": 2.15,
        "s_n_kva": 160
      }
    }
  }
}
```

**Zasada:** Aktualizacja katalogu NIE zmienia wyników dla istniejącego Snapshot.
Parametry zamrożone (materialized) w momencie przypisania.

---

## 12. POWIĄZANIE Z SLD

### SLD natychmiastowy render zawiera:
- Blok stacji (symbol + obramowanie)
- Pola SN zgodnie z `sn_fields` (kolejność z payloadu)
- Aparaty SN (CB/CT/głowica) jeśli zadeklarowane
- Transformator SN/nN
- Szyna nN + pole główne + odpływy nN

### Hash układu
- `layout_hash_policy: DERIVED_FROM_SNAPSHOT_HASH`
- Ten sam Snapshot → ten sam hash układu
- Nakładki (overlay) NIE modyfikują geometrii

---

## 13. TESTY

| Test | Opis |
|------|------|
| `test_deterministic_ids` | 100x — identyczne ID dla identycznych wejść |
| `test_station_structure_created` | Pełna struktura: sn_bus, pola, TR, nn_bus, nn_main, feeder |
| `test_readiness_blockers_for_missing_catalogs` | Blokery przy braku katalogu |
| `test_permutation_invariance` | 50x — permutacja sn_fields/feeders |
| `test_pv_bess_transformer_gate` | PV/BESS bez TR = BLOKER |
| `test_golden_network_v1_sequence` | Pełna sekwencja V1 |
| `test_snapshot_hash_stability` | Dwa identyczne buildy = identyczny hash |

---

## 14. STRAŻNICY CI

1. Istnienie dokumentu UX (`docs/ui/UX_FLOW_SN_V1_GPZ_LIVE_SLD.md`)
2. Istnienie testów V1 (`tests/enm/test_domain_operations.py`)
3. Brak lokalnej prawdy kreatora (frontend nie trzyma modelu)
4. Twardy wymóg katalogu dla linii i TR (E009)
5. Twarda walidacja PV/BESS
6. Brak TODO w krytycznych ścieżkach
7. Brak PCC w całym repo (grep-zero)
8. Kanon nazw operacji w API

Skrypt: `scripts/guard_ux_flow_v1.py`

---

## 15. PLIKI IMPLEMENTACJI

### Backend
| Plik | Opis |
|------|------|
| `backend/src/enm/domain_operations.py` | 10 operacji domenowych + dispatcher |
| `backend/src/enm/domain_ops_models.py` | Modele Pydantic dla operacji |
| `backend/src/enm/models.py` | Model ENM (istniejący) |
| `backend/src/enm/topology_ops.py` | CRUD operacje (istniejący) |
| `backend/src/enm/validator.py` | Walidator ENM (istniejący) |
| `backend/src/enm/fix_actions.py` | Model FixAction (istniejący) |
| `backend/src/enm/hash.py` | Hash deterministyczny (istniejący) |
| `backend/src/api/enm.py` | Endpoint `/enm/domain-ops` |

### Frontend
| Plik | Opis |
|------|------|
| `frontend/src/types/domainOps.ts` | Typy TypeScript operacji |
| `frontend/src/ui/sld/useEnmStore.ts` | Zustand store (jedyna prawda) |
| `frontend/src/ui/sld/domainOpsClient.ts` | Klient API operacji |

### Testy
| Plik | Opis |
|------|------|
| `backend/tests/enm/test_domain_operations.py` | 20+ testów operacji |

### CI
| Plik | Opis |
|------|------|
| `scripts/guard_ux_flow_v1.py` | Strażnik CI |
