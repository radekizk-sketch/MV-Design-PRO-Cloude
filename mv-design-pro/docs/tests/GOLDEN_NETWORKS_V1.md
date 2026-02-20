# GOLDEN NETWORKS V1 — KANON TESTOWY

> Dokument wiążący: definicje sieci referencyjnych V1 i ich role w CI.
> Patrz też: `GOLDEN_NETWORKS_CANONICAL.md` (szczegółowe definicje sieci GN01–GN05).

## 1. SIECI REFERENCYJNE

| ID | Topologia | Elementy | Cel testowy |
|----|-----------|----------|-------------|
| GN01 | Promieniowa SN | GPZ + 3 odcinki + stacja B | Budowa krok-po-kroku, hash |
| GN02 | Odgałęzienie SN | GPZ + magistrala + stacja C + branch | Odgałęzienie od stacji |
| GN03 | Ring SN + NOP | GPZ + ring + NOP | Opcjonalny ring, NOP |
| GN04 | 2 stacje + ring | GPZ + stacja B + stacja C + ring | Kompletna topologia |
| GN05 | Wieloodgałęzieniowa | GPZ + 2 odgałęzienia | Permutacja, stabilność |

## 2. FLOW BUDOWY GOLDEN NETWORK V1 (KANONICZNA)

Sekwencja V1 (test_golden_network_v1_e2e.py):

```
KROK 1:  add_grid_source_sn (15 kV, Sk3=250 MVA)
KROK 2a: continue_trunk_segment_sn (320m)
KROK 2b: continue_trunk_segment_sn (320m)
KROK 2c: continue_trunk_segment_sn (320m)
KROK 3:  insert_station_on_segment_sn (B, ratio=0.5)
KROK 4:  continue_trunk_segment_sn (320m)
KROK 5:  start_branch_segment_sn (z szyny SN stacji)
KROK 6:  insert_station_on_segment_sn (C, ratio=0.5)
KROK 7:  connect_secondary_ring_sn
KROK 8:  set_normal_open_point
```

Każdy krok weryfikuje:
- `error == null`
- `snapshot` obecny
- `logical_views.trunks` obecny
- `layout.layout_hash` zaczyna się od `sha256:`
- `readiness` obecny
- `changes.created_element_ids` niepuste (oprócz NOP)

## 3. PIPELINE ANALIZY E2E

Test `test_v1_analysis_pipeline.py` weryfikuje pełny pipeline:

```
build_v1_network() [ENM via domain_operations]
    ↓
materialize_cable_impedances() [symulacja katalogu]
materialize_transformer_params() [symulacja katalogu]
    ↓
EnergyNetworkModel.model_validate()
    ↓
map_enm_to_network_graph() [enm/mapping.py]
    ↓
PowerFlowNewtonSolver.solve() → zbieżny PF
ShortCircuitIEC60909Solver.compute_3ph_short_circuit() → Ik'', Ip, Ith, Sk
    ↓
WHITE BOX: ybus_trace + nr_trace (PF), Zk + Ikss + kappa (SC)
    ↓
Determinizm 10×: SHA-256 identyczny
```

## 4. TESTY DETERMINIZMU

| Test | Powtórzenia | Co weryfikuje |
|------|-------------|---------------|
| Hash snapshot | 100× | Identyczny layout_hash |
| Permutacja | 50× | Niezależność od kolejności elementów |
| PF wyniki | 10× | Identyczny JSON wyniku PF |
| SC wyniki | 10× | Identyczny JSON wyniku SC |
| Mapping | 10× | Identyczna struktura NetworkGraph |
| LogicalViews | 10× | Identyczne trunks/branches/connectors |

## 5. PLIKI TESTOWE

| Plik | Lokalizacja | Co testuje |
|------|-------------|------------|
| builders.py | `tests/reference_networks/builders.py` | Buildery GN01–GN05 |
| test_golden_networks.py | `tests/test_golden_networks.py` | GN01–GN03 inline |
| test_golden_network_v1_e2e.py | `tests/enm/test_golden_network_v1_e2e.py` | Pełna sekwencja V1 |
| test_reference_networks_determinism.py | `tests/test_reference_networks_determinism.py` | Determinizm GN01–GN05 |
| test_v1_analysis_pipeline.py | `tests/e2e/test_v1_analysis_pipeline.py` | Pipeline analizy E2E |

## 6. WYMAGANIA CATALOG_REF

Wszystkie segmenty w golden networks muszą zawierać `catalog_ref`:
- Segmenty kabli: `"catalog_ref": "YAKXS_3x120"`
- Transformatory: `"transformer_catalog_ref": "ONAN_630"`

Brak catalog_ref → `error_code: "catalog.ref_required"` (operacja odrzucona).
