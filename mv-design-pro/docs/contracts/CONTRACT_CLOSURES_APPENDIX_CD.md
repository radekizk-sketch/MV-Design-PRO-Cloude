# DODATEK C+D — DOMKNIĘCIA KONTRAKTOWE

**Status:** KANONICZNY (BINDING)
**Wersja:** 1.0
**Data:** 2026-02-16
**Referencje:** SYSTEM_SPEC.md, SPEC_CHAPTER_05, SPEC_CHAPTER_14, wizard_screens.md
**Warstwa:** Application + ENM + Catalog + Validation + White Box

> Niniejszy dokument zamyka wszystkie niejednoznaczności kontraktowe w systemie MV-DESIGN-PRO.
> Jeden kanon, jedno mapowanie, zero duplikacji semantyki.

---

## SPIS TREŚCI

1. [Kanoniczna tabela nazw operacji (API) + Aliasy](#1-kanoniczna-tabela-nazw-operacji-api--aliasy)
2. [Kanoniczna definicja insert_at + Mapowanie etykiet UI](#2-kanoniczna-definicja-insert_at--mapowanie-etykiet-ui)
3. [Kanonizacja JSON (Determinizm, Idempotency)](#3-kanonizacja-json-determinizm-idempotency)
4. [Pełny JSON „bez uproszczeń" — continue_trunk_segment_sn](#4-pełny-json-bez-uproszczeń--continue_trunk_segment_sn)
5. [Pełny JSON „bez uproszczeń" — insert_station_on_segment_sn](#5-pełny-json-bez-uproszczeń--insert_station_on_segment_sn)
6. [JSON Schema — insert_station_on_segment_sn](#6-json-schema--insert_station_on_segment_sn)
7. [Trzy przykłady payload (B, C, D)](#7-trzy-przykłady-payload-b-c-d)
8. [Walidacje — tabela kodów (PL) + FixActions](#8-walidacje--tabela-kodów-pl--fixactions)
9. [Testy (unit + E2E) + Strażnicy CI](#9-testy-unit--e2e--strażnicy-ci)
10. [Dodatek D — Uzupełnienia kontraktowe](#10-dodatek-d--uzupełnienia-kontraktowe)

---

## 1. KANONICZNA TABELA NAZW OPERACJI (API) + ALIASY

### 1.1 Kanon (API) — JEDYNE dozwolone nazwy

| # | Canonical (API) | Opis |
|---|---|---|
| 1 | `add_grid_source_sn` | Dodanie źródła zasilania SN |
| 2 | `continue_trunk_segment_sn` | Kontynuacja magistrali SN (nowy odcinek) |
| 3 | `insert_station_on_segment_sn` | Wstawienie stacji na istniejącym odcinku SN |
| 4 | `start_branch_segment_sn` | Rozpoczęcie odnogi SN z portu |
| 5 | `connect_secondary_ring_sn` | Zamknięcie pierścienia wtórnego SN |
| 6 | `set_normal_open_point` | Ustawienie punktu normalnie otwartego |
| 7 | `add_transformer_sn_nn` | Dodanie transformatora SN/nN |
| 8 | `assign_catalog_to_element` | Przypisanie wpisu katalogowego do elementu |
| 9 | `update_element_parameters` | Aktualizacja jawnych parametrów elementu |

### 1.2 Aliasy → Kanon (mapowanie w JEDNYM miejscu)

| Alias (stary / UI) | → Canonical |
|---|---|
| `add_trunk_segment_sn` | `continue_trunk_segment_sn` |
| `insert_station_on_trunk_segment_sn` | `insert_station_on_segment_sn` |
| `insert_station_on_trunk_segment` | `insert_station_on_segment_sn` |
| `add_branch_segment_sn` | `start_branch_segment_sn` |
| `start_branch_from_port` | `start_branch_segment_sn` |
| `connect_ring_sn` | `connect_secondary_ring_sn` |
| `connect_secondary_ring` | `connect_secondary_ring_sn` |

### 1.3 Lokalizacja mapowania

| Warstwa | Plik | Rola |
|---|---|---|
| Backend | `backend/src/application/wizard_actions/canonical_ops.py` | Registry + alias resolution + utilities |
| Frontend | `frontend/src/ui/wizard/canonicalOps.ts` | FE registry + alias layer |
| CI Guard | `scripts/canonical_ops_guard.py` | Skan kodu pod kątem aliasów poza warstwą zgodności |

**REGUŁA:** Frontend MUSI wysyłać WYŁĄCZNIE kanoniczne nazwy. Aliasy dozwolone TYLKO w plikach mapowania.

---

## 2. KANONICZNA DEFINICJA `insert_at` + MAPOWANIE ETYKIET UI

### 2.1 Definicja API (JEDYNA obowiązująca)

```typescript
interface InsertAt {
  mode: "RATIO" | "ODLEGLOSC_OD_POCZATKU_M" | "ANCHOR";
  value: number | { anchor_id: string; offset_m: number };
}
```

| Mode | Typ value | Zakres |
|---|---|---|
| `RATIO` | `number` | `[0.0, 1.0]` |
| `ODLEGLOSC_OD_POCZATKU_M` | `number` | `>= 0` |
| `ANCHOR` | `{ anchor_id: string, offset_m: number }` | dowolny istniejący anchor |

### 2.2 Mapowanie etykiet UI → Canonical

| Etykieta UI | Mapowanie kanoniczne |
|---|---|
| `SRODEK` / `SRODEK_ODCINKA` | `{ "mode": "RATIO", "value": 0.5 }` |
| `PODZIAL_WSPOLCZYNNIKIEM` / `FRACTION` | `{ "mode": "RATIO", "value": x }` (x z UI) |
| `ODLEGLOSC_OD_POCZATKU` | `{ "mode": "ODLEGLOSC_OD_POCZATKU_M", "value": m }` |
| `ANCHOR` | `{ "mode": "ANCHOR", "value": { "anchor_id": "...", "offset_m": ... } }` |

**ZAKAZ:** Utrzymywania dwóch równoległych kontraktów `insert_at` w różnych miejscach specyfikacji.

---

## 3. KANONIZACJA JSON (DETERMINIZM, IDEMPOTENCY)

### 3.1 Reguły kanonizacji

| Aspekt | Specyfikacja |
|---|---|
| Sortowanie kluczy | `sort_keys=True` (rekursywnie) |
| Separatory | `(",", ":")` — brak spacji |
| Notacja naukowa | ZABRONIONA (np. `1e-3` → `0.001`) |
| Kwantyzacja | `quantum = 1e-6`, `rounding_mode = HALF_EVEN` |
| Unicode | NFC normalization + trim |
| Null | `None` → `null` (standard JSON) |
| Encoding | UTF-8 |

### 3.2 Pole `numeric_stability` (w meta payloadu)

```json
{
  "numeric_stability": {
    "quantum": 1e-6,
    "rounding_mode": "HALF_EVEN"
  }
}
```

### 3.3 Idempotency key

- Obliczany z SHA-256 kanonicznego JSON (bez pól UI: `click_id`, `timestamp_utc`, `pozycja_widokowa`)
- Format: pierwsze 16 bajtów w hex32 (32 znaki)
- Stabilność gwarantowana: te same dane domenowe → identyczny klucz

### 3.4 Wymagane testy

| Test | Opis |
|---|---|
| Powtórzenia 100× | Identyczny wynik kanonizacji |
| Permutacje 50× | Losowa kolejność kluczy → identyczny wynik |
| Stabilność idempotency_key | Te same dane wejściowe → ten sam klucz |

---

## 4. PEŁNY JSON „BEZ UPROSZCZEŃ" — `continue_trunk_segment_sn`

```json
{
  "meta": {
    "snapshot_in": "snap-abc123def456",
    "idempotency_key": "7f3a9b2c4e1d8a6f0123456789abcdef",
    "ui": {
      "click_id": "click-9182-fe",
      "timestamp_utc": "2026-02-16T10:30:00.000Z"
    },
    "schema_version": "1.0.0",
    "numeric_stability": {
      "quantum": 1e-6,
      "rounding_mode": "HALF_EVEN"
    }
  },
  "trunk_ref": {
    "trunk_id": "trunk-001",
    "terminal_id": "term-end-001"
  },
  "segment": {
    "rodzaj": "KABEL",
    "dlugosc_m": 350.0,
    "catalog_ref": {
      "catalog_item_id": "YAKXS-120",
      "catalog_item_version": "2.1"
    },
    "readiness": {
      "blocker": null,
      "status": "READY"
    }
  },
  "parametry_jawne": {
    "r_ohm_per_km": 0.253,
    "x_ohm_per_km": 0.082,
    "i_max_a": 275
  },
  "pozycja_widokowa": {
    "x": 450,
    "y": 200,
    "unit": "PX"
  },
  "expected_response_contract": {
    "required_fields": [
      "new_segment_id",
      "new_terminal_id",
      "snapshot_out",
      "audit_trail"
    ]
  }
}
```

### Opis pól

| Pole | Wymagane | Opis |
|---|---|---|
| `meta.snapshot_in` | TAK | ID snapshotu bazowego |
| `meta.idempotency_key` | TAK | Klucz idempotentny (SHA-256 hex32) |
| `meta.ui.click_id` | NIE (UI-only) | ID kliknięcia w UI |
| `meta.ui.timestamp_utc` | NIE (UI-only) | Timestamp akcji |
| `meta.schema_version` | TAK | Wersja schematu payload |
| `trunk_ref.trunk_id` | TAK | ID magistrali do kontynuacji |
| `trunk_ref.terminal_id` | TAK | Terminal końcowy magistrali |
| `segment.rodzaj` | TAK | `KABEL` / `LINIA_NAPOWIETRZNA` |
| `segment.dlugosc_m` | TAK | Długość w metrach (> 0) |
| `segment.catalog_ref` | TAK* | Referencja katalogowa (*lub parametry jawne) |
| `segment.readiness` | TAK | Status gotowości z blokerem |
| `parametry_jawne` | TAK* | Jawne parametry (*jeśli brak katalogu) |
| `pozycja_widokowa` | NIE | Pozycja na SLD (UI-only) |
| `expected_response_contract` | TAK | Wymagane pola w odpowiedzi |

---

## 5. PEŁNY JSON „BEZ UPROSZCZEŃ" — `insert_station_on_segment_sn`

```json
{
  "meta": {
    "snapshot_in": "snap-def789abc012",
    "idempotency_key": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "ui": {
      "click_id": "click-4521-fe",
      "timestamp_utc": "2026-02-16T11:15:00.000Z"
    },
    "schema_version": "1.0.0",
    "numeric_stability": {
      "quantum": 1e-6,
      "rounding_mode": "HALF_EVEN"
    }
  },
  "trunk_ref": {
    "trunk_id": "trunk-001",
    "terminal_from_id": "term-start-001",
    "terminal_to_id": "term-end-001",
    "segment_order_index_expected": 0
  },
  "embedding_intent": {
    "continuity": "CIAGLOSC_IN_OUT",
    "branch_ports_allowed": false
  },
  "segment_target": {
    "segment_id": "seg-001",
    "insert_at": {
      "mode": "RATIO",
      "value": 0.5
    },
    "cut": {
      "mode": "FRACTION",
      "fraction_0_1": 0.5
    },
    "segment_length": {
      "value": 500.0,
      "unit": "m"
    },
    "cut_resolution_policy": {
      "snap_to_existing_node_threshold_m": 0.01,
      "if_within_threshold": "SNAP_TO_NODE",
      "if_hits_port_exactly": "SNAP_TO_PORT",
      "deterministic_tie_breaker": "SORT_BY_ELEMENT_ID_THEN_PORT_ID"
    }
  },
  "station_spec": {
    "station_type": "B",
    "station_name": null,
    "port_plan": {
      "ports_declared": [
        { "port_id": "p-sn-in", "role": "SN_IN", "required": true, "field_binding": "field-sn-in" },
        { "port_id": "p-sn-out", "role": "SN_OUT", "required": true, "field_binding": "field-sn-out" },
        { "port_id": "p-nn-bus", "role": "NN_BUS", "required": true, "field_binding": "field-nn-main" },
        { "port_id": "p-nn-out-01", "role": "NN_OUT_01", "required": true, "field_binding": "field-nn-out-01" }
      ]
    },
    "sn_bus_sections": 1,
    "coupler_required": false
  },
  "nn_block_spec": {
    "nn_bus": {
      "bus_nn_id": "bus-nn-001"
    },
    "nn_main": {
      "main_field_id": "field-nn-main",
      "main_device_id": "dev-nn-main-cb"
    },
    "outgoing": {
      "count_required_min": 1,
      "outgoing_fields": [
        {
          "field_id": "field-nn-out-01",
          "port_id": "p-nn-out-01",
          "device_id": "dev-nn-out-01-cb",
          "creates_nn_segment": true,
          "nn_segment_id": "seg-nn-001",
          "nn_segment_length_placeholder": null
        }
      ]
    },
    "nn_voltage_kv": 0.4,
    "odbiory_nn_moga_byc_puste": true
  },
  "catalog_bindings": [
    {
      "element_role": "transformer_sn_nn",
      "catalog_item_id": "TMR-630-15/0.4",
      "catalog_item_version": "3.0",
      "policy": {
        "store_ref_only": false,
        "store_materialized_params": true
      },
      "materialized_params": {
        "u_k_percent": 6.0,
        "p0_kw": 1.1,
        "pk_kw": 6.5,
        "s_n_kva": 630
      }
    }
  ],
  "pozycja_widokowa": {
    "x": 300,
    "y": 150,
    "unit": "PX"
  },
  "expected_response_contract": {
    "required_fields": [
      "new_station_id",
      "new_bus_sn_id",
      "new_bus_nn_id",
      "new_transformer_id",
      "split_segments",
      "snapshot_out",
      "audit_trail",
      "domain_events"
    ],
    "expected_domain_events": [
      "SEGMENT_SPLIT",
      "CUT_NODE_CREATED",
      "STATION_CREATED",
      "PORTS_CREATED",
      "FIELDS_CREATED_SN",
      "DEVICES_CREATED_SN",
      "TR_CREATED",
      "BUS_NN_CREATED",
      "FIELDS_CREATED_NN",
      "DEVICES_CREATED_NN",
      "RECONNECTED_GRAPH",
      "LOGICAL_VIEWS_UPDATED"
    ]
  }
}
```

---

## 6. JSON SCHEMA — `insert_station_on_segment_sn`

**Plik:** `backend/schemas/insert_station_on_segment_sn_v1.json`

Schema obejmuje definicje:
- `Meta` — snapshot_in, idempotency_key, schema_version, numeric_stability
- `TrunkRef` — trunk_id, terminal_from_id, terminal_to_id, segment_order_index_expected
- `EmbeddingIntent` — continuity (CIAGLOSC_IN_OUT | ODNOGA), branch_ports_allowed
- `InsertAt` — oneOf: RATIO, ODLEGLOSC_OD_POCZATKU_M, ANCHOR
- `CutVariant` — oneOf: FRACTION, DISTANCE_M, WORLD_POINT
- `CutResolutionPolicy` — snap, threshold, tie-breaker
- `SegmentTarget` — segment_id, insert_at, cut, segment_length, policy
- `StationSpec` — station_type (A|B|C|D), port_plan, sn_bus_sections, coupler
- `PortDeclaration` — port_id, role, required, field_binding
- `NnBlockSpec` — nn_bus, nn_main, outgoing, nn_voltage_kv
- `CatalogBinding` — element_role, catalog_item_id, version, policy, materialized_params
- `ViewPosition` — x, y, unit (PX|M)
- `ExpectedResponseContract` — required_fields, expected_domain_events

---

## 7. TRZY PRZYKŁADY PAYLOAD (B, C, D)

### 7.1 Przykład B — Stacja typ B, RATIO 0.5 (środek)

```json
{
  "meta": {
    "snapshot_in": "snap-example-b",
    "idempotency_key": "b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1",
    "schema_version": "1.0.0",
    "numeric_stability": { "quantum": 1e-6, "rounding_mode": "HALF_EVEN" }
  },
  "trunk_ref": {
    "trunk_id": "trunk-main",
    "terminal_from_id": "term-gpz",
    "terminal_to_id": "term-end",
    "segment_order_index_expected": 0
  },
  "embedding_intent": {
    "continuity": "CIAGLOSC_IN_OUT",
    "branch_ports_allowed": false
  },
  "segment_target": {
    "segment_id": "seg-main-001",
    "insert_at": { "mode": "RATIO", "value": 0.5 },
    "cut": { "mode": "FRACTION", "fraction_0_1": 0.5 },
    "segment_length": { "value": 1200.0, "unit": "m" },
    "cut_resolution_policy": {
      "snap_to_existing_node_threshold_m": 0.01,
      "if_within_threshold": "SNAP_TO_NODE",
      "if_hits_port_exactly": "SNAP_TO_PORT",
      "deterministic_tie_breaker": "SORT_BY_ELEMENT_ID_THEN_PORT_ID"
    }
  },
  "station_spec": {
    "station_type": "B",
    "port_plan": {
      "ports_declared": [
        { "port_id": "p-sn-in", "role": "SN_IN", "required": true, "field_binding": "f-sn-in" },
        { "port_id": "p-sn-out", "role": "SN_OUT", "required": true, "field_binding": "f-sn-out" },
        { "port_id": "p-nn-bus", "role": "NN_BUS", "required": true, "field_binding": "f-nn-main" },
        { "port_id": "p-nn-01", "role": "NN_OUT_01", "required": true, "field_binding": "f-nn-01" }
      ]
    },
    "sn_bus_sections": 1,
    "coupler_required": false
  },
  "nn_block_spec": {
    "nn_bus": { "bus_nn_id": "bus-nn-b" },
    "nn_main": { "main_field_id": "f-nn-main", "main_device_id": "dev-nn-main" },
    "outgoing": {
      "count_required_min": 1,
      "outgoing_fields": [
        { "field_id": "f-nn-01", "port_id": "p-nn-01", "device_id": "dev-nn-01", "creates_nn_segment": false }
      ]
    },
    "nn_voltage_kv": 0.4,
    "odbiory_nn_moga_byc_puste": true
  },
  "catalog_bindings": [
    {
      "element_role": "transformer_sn_nn",
      "catalog_item_id": "TMR-400-15/0.4",
      "catalog_item_version": "2.0",
      "policy": { "store_ref_only": false, "store_materialized_params": true },
      "materialized_params": { "u_k_percent": 4.5, "p0_kw": 0.93, "pk_kw": 4.6, "s_n_kva": 400 }
    }
  ]
}
```

### 7.2 Przykład C — Stacja typ C, ODLEGLOSC_OD_POCZATKU_M

```json
{
  "meta": {
    "snapshot_in": "snap-example-c",
    "idempotency_key": "c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2",
    "schema_version": "1.0.0",
    "numeric_stability": { "quantum": 1e-6, "rounding_mode": "HALF_EVEN" }
  },
  "trunk_ref": {
    "trunk_id": "trunk-main",
    "terminal_from_id": "term-gpz",
    "terminal_to_id": "term-end",
    "segment_order_index_expected": 1
  },
  "embedding_intent": {
    "continuity": "CIAGLOSC_IN_OUT",
    "branch_ports_allowed": true
  },
  "segment_target": {
    "segment_id": "seg-main-002",
    "insert_at": { "mode": "ODLEGLOSC_OD_POCZATKU_M", "value": 200.0 },
    "cut": { "mode": "DISTANCE_M", "distance_m": 200.0 },
    "segment_length": { "value": 800.0, "unit": "m" },
    "cut_resolution_policy": {
      "snap_to_existing_node_threshold_m": 0.01,
      "if_within_threshold": "SNAP_TO_NODE",
      "if_hits_port_exactly": "SNAP_TO_PORT",
      "deterministic_tie_breaker": "SORT_BY_ELEMENT_ID_THEN_PORT_ID"
    }
  },
  "station_spec": {
    "station_type": "C",
    "port_plan": {
      "ports_declared": [
        { "port_id": "p-sn-in", "role": "SN_IN", "required": true, "field_binding": "f-sn-in" },
        { "port_id": "p-sn-out", "role": "SN_OUT", "required": true, "field_binding": "f-sn-out" },
        { "port_id": "p-sn-br", "role": "SN_BRANCH_01", "required": true, "field_binding": "f-sn-branch" },
        { "port_id": "p-nn-bus", "role": "NN_BUS", "required": true, "field_binding": "f-nn-main" },
        { "port_id": "p-nn-01", "role": "NN_OUT_01", "required": true, "field_binding": "f-nn-01" },
        { "port_id": "p-nn-02", "role": "NN_OUT_02", "required": true, "field_binding": "f-nn-02" }
      ]
    },
    "sn_bus_sections": 1,
    "coupler_required": false
  },
  "nn_block_spec": {
    "nn_bus": { "bus_nn_id": "bus-nn-c" },
    "nn_main": { "main_field_id": "f-nn-main", "main_device_id": "dev-nn-main" },
    "outgoing": {
      "count_required_min": 2,
      "outgoing_fields": [
        { "field_id": "f-nn-01", "port_id": "p-nn-01", "device_id": "dev-nn-01", "creates_nn_segment": true, "nn_segment_id": "seg-nn-c-01" },
        { "field_id": "f-nn-02", "port_id": "p-nn-02", "device_id": "dev-nn-02", "creates_nn_segment": true, "nn_segment_id": "seg-nn-c-02" }
      ]
    },
    "nn_voltage_kv": 0.4,
    "odbiory_nn_moga_byc_puste": true
  },
  "catalog_bindings": [
    {
      "element_role": "transformer_sn_nn",
      "catalog_item_id": "TMR-630-15/0.4",
      "catalog_item_version": "3.0",
      "policy": { "store_ref_only": false, "store_materialized_params": true },
      "materialized_params": { "u_k_percent": 6.0, "p0_kw": 1.1, "pk_kw": 6.5, "s_n_kva": 630 }
    }
  ]
}
```

### 7.3 Przykład D — Stacja typ D, ANCHOR mode (2 sekcje + sprzęgło)

```json
{
  "meta": {
    "snapshot_in": "snap-example-d",
    "idempotency_key": "d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3",
    "schema_version": "1.0.0",
    "numeric_stability": { "quantum": 1e-6, "rounding_mode": "HALF_EVEN" }
  },
  "trunk_ref": {
    "trunk_id": "trunk-main",
    "terminal_from_id": "term-st-a",
    "terminal_to_id": "term-end",
    "segment_order_index_expected": 2
  },
  "embedding_intent": {
    "continuity": "CIAGLOSC_IN_OUT",
    "branch_ports_allowed": true
  },
  "segment_target": {
    "segment_id": "seg-main-003",
    "insert_at": {
      "mode": "ANCHOR",
      "value": { "anchor_id": "node-junction-42", "offset_m": 15.5 }
    },
    "cut": { "mode": "DISTANCE_M", "distance_m": 315.5 },
    "segment_length": { "value": 600.0, "unit": "m" },
    "cut_resolution_policy": {
      "snap_to_existing_node_threshold_m": 0.01,
      "if_within_threshold": "REJECT_WITH_ERROR",
      "if_hits_port_exactly": "SNAP_TO_PORT",
      "deterministic_tie_breaker": "SORT_BY_ELEMENT_ID_THEN_PORT_ID"
    }
  },
  "station_spec": {
    "station_type": "D",
    "port_plan": {
      "ports_declared": [
        { "port_id": "p-sn-in", "role": "SN_IN", "required": true, "field_binding": "f-sn-in" },
        { "port_id": "p-sn-out", "role": "SN_OUT", "required": true, "field_binding": "f-sn-out" },
        { "port_id": "p-sn-br-01", "role": "SN_BRANCH_01", "required": false, "field_binding": "f-sn-br-01" },
        { "port_id": "p-nn-bus", "role": "NN_BUS", "required": true, "field_binding": "f-nn-main" },
        { "port_id": "p-nn-01", "role": "NN_OUT_01", "required": true, "field_binding": "f-nn-01" },
        { "port_id": "p-nn-02", "role": "NN_OUT_02", "required": true, "field_binding": "f-nn-02" },
        { "port_id": "p-nn-03", "role": "NN_OUT_03", "required": true, "field_binding": "f-nn-03" }
      ]
    },
    "sn_bus_sections": 2,
    "coupler_required": true
  },
  "nn_block_spec": {
    "nn_bus": { "bus_nn_id": "bus-nn-d" },
    "nn_main": { "main_field_id": "f-nn-main", "main_device_id": "dev-nn-main" },
    "outgoing": {
      "count_required_min": 3,
      "outgoing_fields": [
        { "field_id": "f-nn-01", "port_id": "p-nn-01", "device_id": "dev-nn-01", "creates_nn_segment": true, "nn_segment_id": "seg-nn-d-01" },
        { "field_id": "f-nn-02", "port_id": "p-nn-02", "device_id": "dev-nn-02", "creates_nn_segment": true, "nn_segment_id": "seg-nn-d-02" },
        { "field_id": "f-nn-03", "port_id": "p-nn-03", "device_id": "dev-nn-03", "creates_nn_segment": true, "nn_segment_id": "seg-nn-d-03" }
      ]
    },
    "nn_voltage_kv": 0.4,
    "odbiory_nn_moga_byc_puste": true
  },
  "catalog_bindings": [
    {
      "element_role": "transformer_sn_nn",
      "catalog_item_id": "TMR-1000-15/0.4",
      "catalog_item_version": "1.5",
      "policy": { "store_ref_only": false, "store_materialized_params": true },
      "materialized_params": { "u_k_percent": 6.0, "p0_kw": 1.7, "pk_kw": 10.5, "s_n_kva": 1000 }
    }
  ]
}
```

---

## 8. WALIDACJE — TABELA KODÓW (PL) + FixActions

| Kod | Poziom | Warunek (PL) | FixAction | Cel (element) | Nawigacja | Pierwszeństwo |
|---|---|---|---|---|---|---|
| `W-ISS-001` | BLOKUJACE | Brak `trunk_id` w payload | `FOCUS_FIELD` | `trunk_ref.trunk_id` | Kreator/K4 | 1 |
| `W-ISS-002` | BLOKUJACE | `cut.fraction_0_1` poza `[0, 1]` | `RESET_VALUE` | `segment_target.cut.fraction_0_1` | Kreator/K4/cut | 2 |
| `W-ISS-003` | BLOKUJACE | Brak `station_type` w `station_spec` | `FOCUS_FIELD` | `station_spec.station_type` | Kreator/K4 | 3 |
| `W-ISS-004` | BLOKUJACE | `catalog_ref` null i brak `parametry_jawne` | `OPEN_PANEL` | `catalog_bindings` | Kreator/K5/CatalogBrowser | 4 |
| `W-ISS-005` | BLOKUJACE | `nn_voltage_kv <= 0` lub brak | `FOCUS_FIELD` | `nn_block_spec.nn_voltage_kv` | Kreator/K5 | 5 |
| `W-ISS-006` | OSTRZEZENIE | `pozycja_widokowa` jest null | `AUTO_CALCULATE` | `pozycja_widokowa` | SLD | 10 |
| `W-ISS-007` | BLOKUJACE | Duplikat `idempotency_key` w sesji | `REGENERATE` | `meta.idempotency_key` | meta | 6 |
| `W-ISS-008` | OSTRZEZENIE | `segment_length.value` null przy mode ≠ WORLD_POINT | `FOCUS_FIELD` | `segment_target.segment_length.value` | Kreator/K4 | 11 |
| `W-ISS-009` | BLOKUJACE | Punkt cięcia pokrywa się z istniejącym węzłem (w progu snap) | `APPLY_POLICY` | `segment_target.cut` | Kreator/K4 | 7 |
| `W-ISS-010` | BLOKUJACE | `port_plan` nie zawiera wymaganych portów dla `station_type` | `ADD_PORTS` | `station_spec.port_plan` | Kreator/K4 | 8 |

**Reguła:** Zwracany jest deterministyczny zestaw błędów posortowany wg pierwszeństwa (mniejszy numer = wyższy priorytet).

---

## 9. TESTY (unit + E2E) + STRAŻNICY CI

### 9.1 Testy unit — Backend (`backend/tests/test_canonical_ops.py`)

| Test ID | Opis |
|---|---|
| `test_canonical_names_completeness` | Wszystkie 9 operacji kanonicznych zarejestrowanych |
| `test_alias_resolution` | Każdy alias rozwiązywany do poprawnej kanonicznej nazwy |
| `test_unknown_alias_rejected` | Nieznany alias → `ValueError` |
| `test_insert_at_ratio_mapping` | UI label SRODEK → RATIO 0.5 |
| `test_insert_at_distance_mapping` | UI label ODLEGLOSC → poprawny mode |
| `test_insert_at_anchor_mapping` | ANCHOR mode walidowany |
| `test_json_canonicalization_determinism_100x` | 100× powtórzeń → identyczny wynik |
| `test_json_canonicalization_permutations_50x` | 50× permutacji kluczy → identyczny wynik |
| `test_idempotency_key_stability` | Te same dane → ten sam klucz |
| `test_payload_schema_validation` | Poprawne payloady przechodzą schema |
| `test_payload_schema_rejection` | Błędne payloady odrzucone |
| `test_domain_events_order` | 12 zdarzeń w poprawnej kolejności |
| `test_validation_codes_completeness` | Wszystkie kody W-ISS obecne |
| `test_validation_priority_order` | Kolejność priorytetów respektowana |

### 9.2 Testy unit — Frontend (`frontend/src/ui/wizard/__tests__/canonicalOps.test.ts`)

| Test ID | Opis |
|---|---|
| `test_only_canonical_names_sent` | FE wysyła wyłącznie kanoniczne nazwy |
| `test_alias_compatibility_layer` | Aliasy tłumaczone przed wysłaniem |
| `test_insert_at_ui_mapping` | Etykiety UI mapowane poprawnie |

### 9.3 Testy E2E (`frontend/e2e/canonical-ops.spec.ts`)

| Test ID | Opis |
|---|---|
| `e2e_insert_station_full_flow` | Pełny przepływ wstawiania stacji |
| `e2e_continue_trunk_full_flow` | Pełny przepływ kontynuacji magistrali |
| `e2e_canonical_names_network` | Wszystkie operacje używają nazw kanonicznych |

### 9.4 Strażnicy CI

| Strażnik | Plik | Opis |
|---|---|---|
| `canonical_ops_guard.py` | `scripts/canonical_ops_guard.py` | Skanuje FE+BE pod kątem aliasów poza warstwą zgodności |

**Integracja CI:** Dodać do `.github/workflows/python-tests.yml`:
```yaml
- name: Canonical ops guard
  run: python scripts/canonical_ops_guard.py
```

---

## 10. DODATEK D — UZUPEŁNIENIA KONTRAKTOWE

### 10.1 Kontrakt „Magistrala jako obiekt" (`trunk_ref`)

```typescript
interface TrunkRef {
  trunk_id: string;                        // wymagane
  terminal_from_id: string | null;         // jeśli znane z UI
  terminal_to_id: string | null;           // jeśli znane z UI
  segment_order_index_expected: number | null; // jeśli kliknięto segment
}

interface EmbeddingIntent {
  continuity: "CIAGLOSC_IN_OUT" | "ODNOGA";  // wymagane
  branch_ports_allowed: boolean;              // wymagane
}
```

**Zasada:** Jeśli `trunk_ref.*` jest null, domena MUSI wyznaczyć magistralę deterministycznie z LogicalViews i zwrócić to w `audit_trail`.

### 10.2 Pełny model cięcia odcinka

Trzy warianty cięcia (bez domysłów):

| Wariant | Pola |
|---|---|
| **FRACTION** | `mode: "FRACTION"`, `fraction_0_1: 0..1` |
| **DISTANCE_M** | `mode: "DISTANCE_M"`, `distance_m: number >= 0` |
| **WORLD_POINT** | `mode: "WORLD_POINT"`, `world_point: { x, y, unit: "PX"|"M" }` |

Dodatkowe pola (zawsze wymagane):

```typescript
interface CutResolutionPolicy {
  snap_to_existing_node_threshold_m: number;  // np. 0.01
  if_within_threshold: "SNAP_TO_NODE" | "REJECT_WITH_ERROR";
  if_hits_port_exactly: "SNAP_TO_PORT" | "SNAP_TO_NODE";
  deterministic_tie_breaker: "SORT_BY_ELEMENT_ID_THEN_PORT_ID";
}
```

### 10.3 Jawny plan portów stacji

**Reguły per typ stacji:**

| Port | Typ A | Typ B | Typ C | Typ D |
|---|---|---|---|---|
| `SN_IN` | required | required | required | required |
| `SN_OUT` | optional=false | required | required | required |
| `SN_BRANCH_01` | optional=false | optional=true | required | optional=true |
| `NN_BUS` | required | required | required | required |
| `NN_OUT_01..N` | required ≥ 1 | required ≥ 1 | required ≥ 1 | required ≥ 1 |
| Sekcje SN | 1 | 1 | 1 | ≥ 2 |
| Sprzęgło | nie | nie | nie | required |

**port_to_field_binding:** Jawne mapowanie `port → field_id`.

### 10.4 Blok nN — minimalny model

```typescript
interface NnBlockSpec {
  nn_bus: { bus_nn_id: string };                           // wymagane
  nn_main: { main_field_id: string; main_device_id: string }; // wymagane
  outgoing: {
    count_required_min: number;  // >= 1
    outgoing_fields: OutgoingField[];
  };
  nn_voltage_kv: number;        // wymagane, > 0
  odbiory_nn_moga_byc_puste: boolean;  // true = feedery istnieją, ale mogą być puste
}

interface OutgoingField {
  field_id: string;
  port_id: string;
  device_id: string;
  creates_nn_segment: boolean;
  nn_segment_id?: string;
  nn_segment_length_placeholder?: number;
}
```

### 10.5 Katalogi — materializacja + wersjonowanie

```typescript
interface CatalogBinding {
  catalog_item_id: string;
  catalog_item_version: string | number;  // wymagane
  policy: {
    store_ref_only: boolean;
    store_materialized_params: boolean;
  };
  materialized_params?: {
    // Linia SN:
    r_ohm_per_km?: number;
    x_ohm_per_km?: number;
    i_max_a?: number;
    // Transformator SN/nN:
    u_k_percent?: number;
    p0_kw?: number;
    pk_kw?: number;
    s_n_kva?: number;
  };
}
```

**Zasada:** Aktualizacja katalogu NIE MOŻE zmienić wyników obliczeń dla istniejącego Snapshot → wersja wpisu jest obowiązkowa.

### 10.6 Identyfikatory deterministyczne

| Aspekt | Specyfikacja |
|---|---|
| Normalizacja tekstu | trim, NFC, lower-case (pola techniczne), stabilne separatory |
| Seed includes | trunk_id, segment_id, cut (po kanonizacji), station_type |
| Seed excludes | ui.click_id, timestamp, world_point w PX |
| Hash format | SHA-256 → pierwsze 16 bajtów → hex32 (32 znaki) |
| Element IDs | `station_seed + local_path` → SHA-256 hex32 z prefixem |

### 10.7 Zdarzenia domenowe — `insert_station_on_segment_sn`

| event_seq | event_type | Opis |
|---|---|---|
| 1 | `SEGMENT_SPLIT` | Podział odcinka w punkcie cięcia |
| 2 | `CUT_NODE_CREATED` | Utworzenie węzła w punkcie cięcia |
| 3 | `STATION_CREATED` | Utworzenie obiektu stacji |
| 4 | `PORTS_CREATED` | Utworzenie portów wg port_plan |
| 5 | `FIELDS_CREATED_SN` | Utworzenie pól SN |
| 6 | `DEVICES_CREATED_SN` | Utworzenie aparatów SN (CB/CT/przekaźnik) |
| 7 | `TR_CREATED` | Utworzenie transformatora SN/nN |
| 8 | `BUS_NN_CREATED` | Utworzenie szyny nN |
| 9 | `FIELDS_CREATED_NN` | Utworzenie pól nN |
| 10 | `DEVICES_CREATED_NN` | Utworzenie aparatów nN |
| 11 | `RECONNECTED_GRAPH` | Ponowne połączenie grafu topologii |
| 12 | `LOGICAL_VIEWS_UPDATED` | Aktualizacja widoków logicznych |

**Reguły:** event_seq rosnąca (start=1), bez luk, kolejność deterministyczna i testowana.

### 10.8 Powiązanie z SLD — natychmiastowy render

**sld_immediate_render_contains:**
- Blok stacji (symbol + nazwa)
- Pola SN wg `declared_order`
- Aparaty SN (CB/CT/przekaźnik/głowica) jeśli zadeklarowane
- Transformator SN/nN
- Szyna nN + pole główne + odpływy nN (jako obiekty)

**layout_expectations_for_golden_tests:**
```json
{
  "layout_hash_policy": "DERIVED_FROM_SNAPSHOT_HASH",
  "layout_hash_expected": null
}
```

Dla złotych sieci (golden networks): `layout_hash_expected = "sha256:..."`.

### 10.9 Tabela walidacji z pierwszeństwem

Patrz [§8](#8-walidacje--tabela-kodów-pl--fixactions) — pełna tabela z kodami PL, poziomami, fix actions i numerami pierwszeństwa.

**Zasada deterministyczna:** Jeśli występuje kilka błędów, zwracany jest pełny zestaw posortowany wg `priority` (mniejszy numer = pierwszy).

---

## KONIEC DOKUMENTU

**Lokalizacje artefaktów w repo:**

| Artefakt | Ścieżka |
|---|---|
| Ten dokument | `docs/contracts/CONTRACT_CLOSURES_APPENDIX_CD.md` |
| Backend registry | `backend/src/application/wizard_actions/canonical_ops.py` |
| Frontend registry | `frontend/src/ui/wizard/canonicalOps.ts` |
| JSON Schema | `backend/schemas/insert_station_on_segment_sn_v1.json` |
| CI guard | `scripts/canonical_ops_guard.py` |
| Testy BE | `backend/tests/test_canonical_ops.py` |
