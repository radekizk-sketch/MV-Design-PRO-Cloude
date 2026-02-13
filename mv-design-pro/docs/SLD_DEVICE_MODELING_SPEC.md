# SLD Device Modeling Specification (RUN #3D)

> CANONICAL DOCUMENT. All device/field/station modeling follows this spec.

## Overview

RUN #3D introduces ETAP-grade device and field modeling into the SLD pipeline.
This extends the VisualGraphV1 + LayoutResultV1 contracts without breaking
the frozen VisualGraphV1 contract.

## Architecture (M2: Internal Subgraph with Anchor Mapping)

```
TopologyInputV1
       |
       v
TopologyAdapterV2
  buildVisualGraphFromTopology()
       |
       +---> VisualGraphV1 (FROZEN, station = 1 node)
       |
       +---> StationBlockBuildResult (NEW: fields, devices, anchors per station)
                    |
                    v
             LayoutPipeline
               computeLayout(graph, config, stationBlockDetails?)
                    |
                    v
             LayoutResultV1
               SwitchgearBlockV1.detail: StationBlockDetailV1 | null
```

**Key principle**: VisualGraphV1 stays frozen (stations are single nodes).
Field/device details go into `LayoutResultV1.SwitchgearBlockV1.detail` with
`DeviceAnchorV1` for renderer/overlay/inspector.

## Domain Types

### FieldRoleV1

Each field (bay) in a station has a canonical role:

| Role | Description |
|------|-------------|
| `LINE_IN` | Pole liniowe wejsciowe (od magistrali) |
| `LINE_OUT` | Pole liniowe wyjsciowe (do nastepnej stacji) |
| `LINE_BRANCH` | Pole odgalezieniowe |
| `TRANSFORMER_SN_NN` | Pole transformatorowe SN/nN |
| `PV_SN` | Pole przylaczeniowe PV na SN |
| `BESS_SN` | Pole przylaczeniowe BESS na SN |
| `COUPLER_SN` | Pole sprzeglowe (lacznik sekcyjny) |
| `BUS_TIE` | Pole lacznika szyn |

### DeviceTypeV1

Equipment in a field:

| Type | Electrical Role | Power Path Position |
|------|----------------|---------------------|
| `CB` | POWER_PATH | MIDSTREAM |
| `DS` | POWER_PATH | UPSTREAM |
| `ES` | POWER_PATH | UPSTREAM |
| `CT` | POWER_PATH | MIDSTREAM |
| `VT` | MEASUREMENT | OFF_PATH |
| `RELAY` | PROTECTION | OFF_PATH |
| `CABLE_HEAD` | TERMINATION | DOWNSTREAM |
| `TRANSFORMER_DEVICE` | POWER_PATH | MIDSTREAM |
| `GENERATOR_PV` | POWER_PATH | DOWNSTREAM |
| `GENERATOR_BESS` | POWER_PATH | DOWNSTREAM |
| `GENERATOR_WIND` | POWER_PATH | DOWNSTREAM |
| `ACB` | POWER_PATH | DOWNSTREAM |
| `PCS` | POWER_PATH | DOWNSTREAM |
| `BATTERY` | POWER_PATH | DOWNSTREAM |

### EmbeddingRoleV1

Station's role relative to trunk segmentation:

| Role | Condition | Description |
|------|-----------|-------------|
| `TRUNK_LEAF` | trunkCount == 1, branchCount == 0 | Stacja koncowa (typ A) |
| `TRUNK_INLINE` | trunkCount == 2, branchCount == 0 | Stacja przelotowa (typ B) |
| `TRUNK_BRANCH` | trunkCount >= 1, branchCount >= 1 | Stacja odgalezieniowa (typ C) |
| `LOCAL_SECTIONAL` | busSections >= 2 | Stacja sekcyjna (typ D) |

**Embedding role derivation**: Based on incident trunk/branch edges (excluding
TR_LINK and BUS_LINK which are internal to the station) and bus section count.

## Device Requirements

Each `FieldRole` has canonical device requirements defined in `DEVICE_REQUIREMENT_SETS`:

- `MANDATORY`: Device MUST be present (fixAction if missing)
- `REQUIRED_IF`: Device required under specific conditions
- `OPTIONAL`: Device may be present

## Validation & Fix Actions

26 stable fix codes in `FieldDeviceFixCodes` (all PL messages):

- `field.device_missing.*` - Required device absent
- `protection.relay_binding_missing` - Relay not bound to CB
- `protection.ct_missing` - CT missing for relay measurement
- `catalog.ref_missing` - Device without catalog reference
- `catalog.ratings_mismatch` - Catalog ratings incompatible
- `generator.block_tr_missing` - OZE without blocking transformer
- `station.embedding_undetermined` - Cannot derive embedding role
- `station.bus_section_missing` - Station without bus sections
- `field.terminals_inconsistent` - Terminal/port mismatch

**Zero fabrication**: Missing data generates FixAction, never fallback/default.

## Determinism Guarantees

- Same TopologyInputV1 + SegmentationEdgeSets --> identical StationBlockBuildResult
- All arrays sorted by id (stationBlocks, fields, devices, anchors)
- 100x hash stability tested
- 50x permutation invariance tested (shuffled input arrays)
- No Math.random(), Date.now(), or Set/Map iteration order dependency

## CI Guards (Guards 11-15)

| Guard | Description |
|-------|-------------|
| 11 | Station has members/fields |
| 12 | Field device requirements enforced (DEVICE_REQUIREMENT_SETS + validateFieldDevices) |
| 13 | Device catalog ref validation (CATALOG_REF_MISSING, no fabrication) |
| 14 | Relay binding fix actions (PROTECTION_RELAY_BINDING_MISSING) |
| 15 | Zero fabrication in builder (no auto-defaults, no fallbackDevice) |

## Files

| File | Purpose |
|------|---------|
| `fieldDeviceContracts.ts` | Domain contracts: FieldV1, DeviceV1, BusSectionV1, StationBlockDetailV1, validators |
| `stationBlockBuilder.ts` | Builder: deriveEmbeddingRole, buildStationBlocks, buildFieldsForStation |
| `layoutResult.ts` | Extended: SwitchgearBlockV1.detail |
| `layoutPipeline.ts` | Extended: computeLayout accepts StationBlockBuildResult |
| `topologyAdapterV2.ts` | Extended: AdapterResultV1.stationBlockDetails |
| `index.ts` | Barrel exports for all RUN #3D types |

## Test Coverage

33 tests in `stationBlockBuilder.test.ts`:
- 6 EmbeddingRole derivation tests
- 7 Field/device building tests
- 3 Station block validation tests
- 5 Adapter integration tests
- 3 Layout pipeline integration tests
- 5 Determinism tests (100x hash, 50x permutation)
- 4 Golden network statistics tests
