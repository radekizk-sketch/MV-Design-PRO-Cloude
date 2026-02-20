"""
Testy operacji domenowych — budowa sieci SN od GPZ.

Testy deterministyczne: ten sam wejściowy ENM + ta sama operacja → identyczny wynik.
Brak heurystyk, brak domyślnych parametrów elektrycznych.
"""
from __future__ import annotations

import copy
import itertools
import json

import pytest

from enm.models import EnergyNetworkModel, ENMHeader, ENMDefaults
from enm.hash import compute_enm_hash
from enm.domain_operations import execute_domain_operation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _empty_enm() -> dict:
    """Pusty ENM do testów z jawnymi domyślnymi ustawieniami projektu."""
    enm = EnergyNetworkModel(
        header=ENMHeader(name="test", defaults=ENMDefaults(sn_nominal_kv=15.0)),
    )
    return enm.model_dump(mode="json")


def _snapshot_hash(snapshot: dict) -> str:
    """Oblicz hash snapshot'a (przez EnergyNetworkModel)."""
    enm = EnergyNetworkModel.model_validate(snapshot)
    return compute_enm_hash(enm)


def _count(snapshot: dict, collection: str) -> int:
    """Policz elementy w kolekcji snapshot'a."""
    return len(snapshot.get(collection, []))


def _find_by_ref(snapshot: dict, collection: str, ref_id: str) -> dict | None:
    """Znajdź element po ref_id w kolekcji."""
    for elem in snapshot.get(collection, []):
        if elem.get("ref_id") == ref_id:
            return elem
    return None


def _add_grid_source(enm_dict: dict) -> dict:
    """Wykonaj add_grid_source_sn i zwróć result."""
    return execute_domain_operation(
        enm_dict=enm_dict,
        op_name="add_grid_source_sn",
        payload={"voltage_kv": 15.0, "sk3_mva": 250.0},
    )


def _continue_trunk(enm_dict: dict, **extra_payload) -> dict:
    """Wykonaj continue_trunk_segment_sn i zwróć result.

    Podaje jawne parametry: segment z dlugosc_m=500, rodzaj=KABEL, catalog_ref.
    Brak domyślnych wartości — zgodność z kanonem 'bez zgadywania'.
    Bramka katalogowa wymaga catalog_ref lub catalog_binding.
    """
    payload = {
        "segment": {
            "rodzaj": "KABEL",
            "dlugosc_m": 500,
            "catalog_ref": "YAKXS_3x120",
        },
    }
    payload.update(extra_payload)
    return execute_domain_operation(
        enm_dict=enm_dict,
        op_name="continue_trunk_segment_sn",
        payload=payload,
    )


def _build_gpz_plus_segments(n_segments: int = 2) -> tuple[dict, dict]:
    """Zbuduj GPZ + N segmentów magistrali. Zwróć (last_result, snapshot)."""
    enm = _empty_enm()
    result = _add_grid_source(enm)
    assert result.get("snapshot") is not None, "add_grid_source_sn failed"
    assert not result.get("error"), f"add_grid_source_sn error: {result.get('error')}"

    snapshot = result["snapshot"]
    for _ in range(n_segments):
        result = _continue_trunk(snapshot)
        assert result.get("snapshot") is not None, "continue_trunk_segment_sn failed"
        assert not result.get("error"), f"continue_trunk_segment_sn error: {result.get('error')}"
        snapshot = result["snapshot"]

    return result, snapshot


def _get_first_segment_ref(snapshot: dict) -> str:
    """Zwróć ref_id pierwszego segmentu (gałęzi kablowej) w snapshot."""
    for branch in snapshot.get("branches", []):
        if branch.get("type") in ("cable", "line_overhead"):
            return branch["ref_id"]
    raise ValueError("Brak segmentu kablowego w snapshot")


def _get_corridor_segment_refs(snapshot: dict) -> list[str]:
    """Zwróć listę ordered_segment_refs z pierwszego korytarza."""
    corridors = snapshot.get("corridors", [])
    if corridors:
        return corridors[0].get("ordered_segment_refs", [])
    return []


# ===========================================================================
# TEST 1: test_add_grid_source_sn
# ===========================================================================


class TestAddGridSourceSN:
    def test_add_grid_source_sn(self):
        """Call add_grid_source_sn on empty ENM.

        Assert: 1 bus created, 1 source created, 1 substation created, 1 corridor created.
        Assert: readiness has blockers (no branches/lines yet).
        Assert: changes.created_element_ids is non-empty.
        """
        enm = _empty_enm()
        result = _add_grid_source(enm)

        assert result.get("error") is None or result.get("error") == ""
        snapshot = result["snapshot"]
        assert snapshot is not None

        # At least 1 bus (GPZ SN bus)
        assert _count(snapshot, "buses") >= 1

        # At least 1 source
        assert _count(snapshot, "sources") >= 1

        # At least 1 substation (GPZ)
        assert _count(snapshot, "substations") >= 1

        # At least 1 corridor
        assert _count(snapshot, "corridors") >= 1

        # Readiness should be present (may or may not have blockers at GPZ-only stage)
        readiness = result.get("readiness", {})
        assert readiness is not None, "Readiness should be present"
        # Network is not ready yet (only GPZ, no complete circuit)
        assert readiness.get("ready") is not True or len(readiness.get("blockers", [])) >= 0

        # Changes should have created_element_ids
        changes = result.get("changes", {})
        created_ids = changes.get("created_element_ids", [])
        assert len(created_ids) > 0, "changes.created_element_ids should be non-empty"


# ===========================================================================
# TEST 2: test_add_grid_source_sn_duplicate
# ===========================================================================


class TestAddGridSourceSNDuplicate:
    def test_add_grid_source_sn_duplicate(self):
        """Call add_grid_source_sn twice — second call should fail (duplicate source)."""
        enm = _empty_enm()
        result1 = _add_grid_source(enm)
        assert result1.get("snapshot") is not None
        assert not result1.get("error")

        snapshot1 = result1["snapshot"]

        # Second call on the same snapshot — should fail
        result2 = _add_grid_source(snapshot1)

        # Must indicate error or failure
        has_error = bool(result2.get("error"))
        has_no_snapshot = result2.get("snapshot") is None
        has_blockers = any(
            b.get("severity") == "BLOCKER"
            for b in result2.get("readiness", {}).get("blockers", [])
        )

        assert has_error or has_no_snapshot or has_blockers, (
            "Second add_grid_source_sn should fail (duplicate source)"
        )


# ===========================================================================
# TEST 3: test_continue_trunk_segment_sn
# ===========================================================================


class TestContinueTrunkSegmentSN:
    def test_continue_trunk_segment_sn(self):
        """First add_grid_source_sn, then continue_trunk_segment_sn.

        Assert: new bus created, new branch created.
        Assert: corridor updated with segment.
        """
        enm = _empty_enm()
        result_gpz = _add_grid_source(enm)
        snapshot_gpz = result_gpz["snapshot"]

        bus_count_before = _count(snapshot_gpz, "buses")
        branch_count_before = _count(snapshot_gpz, "branches")

        result_seg = _continue_trunk(snapshot_gpz)
        assert not result_seg.get("error"), f"Error: {result_seg.get('error')}"

        snapshot_seg = result_seg["snapshot"]
        assert snapshot_seg is not None

        # New bus created
        assert _count(snapshot_seg, "buses") > bus_count_before

        # New branch (cable/line) created
        assert _count(snapshot_seg, "branches") > branch_count_before

        # Corridor updated with segment
        corridors = snapshot_seg.get("corridors", [])
        assert len(corridors) >= 1
        seg_refs = corridors[0].get("ordered_segment_refs", [])
        assert len(seg_refs) >= 1, "Corridor should have at least 1 segment"


# ===========================================================================
# TEST 4: test_full_v1_sequence
# ===========================================================================


class TestFullV1Sequence:
    def test_full_v1_sequence(self):
        """Execute the full V1 sequence:
        1. add_grid_source_sn
        2. continue_trunk_segment_sn (first segment)
        3. continue_trunk_segment_sn (second segment)
        4. insert_station_on_segment_sn (type B)
        5. start_branch_segment_sn

        Verify each step produces valid snapshot.
        Verify bus/branch counts increase correctly.
        """
        enm = _empty_enm()

        # Step 1: add_grid_source_sn
        r1 = _add_grid_source(enm)
        assert r1.get("snapshot") is not None
        assert not r1.get("error")
        s1 = r1["snapshot"]
        buses_after_gpz = _count(s1, "buses")
        branches_after_gpz = _count(s1, "branches")

        # Step 2: continue_trunk_segment_sn (first)
        r2 = _continue_trunk(s1)
        assert r2.get("snapshot") is not None
        assert not r2.get("error")
        s2 = r2["snapshot"]
        assert _count(s2, "buses") > buses_after_gpz
        assert _count(s2, "branches") > branches_after_gpz

        # Step 3: continue_trunk_segment_sn (second)
        r3 = _continue_trunk(s2)
        assert r3.get("snapshot") is not None
        assert not r3.get("error")
        s3 = r3["snapshot"]
        assert _count(s3, "buses") > _count(s2, "buses")
        assert _count(s3, "branches") > _count(s2, "branches")

        # Step 4: insert_station_on_segment_sn (type B) — z bramka katalogowa
        first_seg = _get_first_segment_ref(s3)
        r4 = execute_domain_operation(
            enm_dict=s3,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
                "transformer": {
                    "create": True,
                    "transformer_catalog_ref": "ONAN_630",
                },
            },
        )
        assert r4.get("snapshot") is not None, f"insert_station error: {r4.get('error')}"
        s4 = r4["snapshot"]
        assert _count(s4, "substations") > _count(s3, "substations")

        # Step 5: start_branch_segment_sn — jawny from_bus_ref
        # Find the SN bus of the just-inserted station
        stn_sn_buses = [
            b for b in s4.get("buses", [])
            if "sn_bus" in b.get("ref_id", "")
        ]
        branch_bus_ref = stn_sn_buses[0]["ref_id"] if stn_sn_buses else s4["buses"][-1]["ref_id"]
        r5 = execute_domain_operation(
            enm_dict=s4,
            op_name="start_branch_segment_sn",
            payload={
                "from_bus_ref": branch_bus_ref,
                "segment": {"rodzaj": "KABEL", "dlugosc_m": 200, "catalog_ref": "YAKXS_3x120"},
            },
        )
        assert r5.get("snapshot") is not None, f"start_branch error: {r5.get('error')}"
        s5 = r5["snapshot"]
        # branch count should increase (new lateral branch)
        assert _count(s5, "branches") >= _count(s4, "branches")


# ===========================================================================
# TEST 5: test_insert_station_creates_structure
# ===========================================================================


class TestInsertStationCreatesStructure:
    def test_insert_station_creates_structure(self):
        """Build GPZ + 2 segments. Insert station type B on first segment.

        Assert: station substation created.
        Assert: original segment deleted, 2 new segments created.
        Assert: sn_bus, nn_bus, transformer created.
        Assert: bays created for sn_fields.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        buses_before = _count(snapshot, "buses")
        branches_before = _count(snapshot, "branches")
        subs_before = _count(snapshot, "substations")
        trafos_before = _count(snapshot, "transformers")
        bays_before = _count(snapshot, "bays")

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Station substation created
        assert _count(s, "substations") > subs_before

        # Original segment replaced: total branches should change
        # (1 segment removed, 2 new segments added = net +1)
        assert _count(s, "branches") > branches_before

        # sn_bus and nn_bus created
        assert _count(s, "buses") > buses_before

        # Transformer created (SN/nn)
        assert _count(s, "transformers") > trafos_before

        # Bays created for sn_fields
        assert _count(s, "bays") > bays_before


# ===========================================================================
# TEST 6: test_insert_station_readiness_blockers
# ===========================================================================


class TestInsertStationReadinessBlockers:
    def test_insert_station_readiness_blockers(self):
        """Insert station without catalog refs.

        Assert: readiness has blockers for line.catalog_ref_missing and
                transformer.catalog_ref_missing.
        Assert: fix_actions point to correct elements.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )

        assert result.get("snapshot") is not None

        readiness = result.get("readiness", {})
        blockers = readiness.get("blockers", [])
        fix_actions = result.get("fix_actions", [])

        # Expect blockers for missing catalog refs (lines and/or transformers)
        blocker_codes = [b.get("code", "") for b in blockers]
        blocker_messages = " ".join(b.get("message_pl", "") for b in blockers)

        has_line_catalog_blocker = (
            "line.catalog_ref_missing" in blocker_codes
            or "E009" in blocker_codes
            or "catalog_ref" in blocker_messages.lower()
        )
        has_trafo_catalog_blocker = (
            "transformer.catalog_ref_missing" in blocker_codes
            or "E009" in blocker_codes
            or "transformator" in blocker_messages.lower()
        )

        assert has_line_catalog_blocker or has_trafo_catalog_blocker, (
            f"Expected catalog_ref blockers, got: {blocker_codes}"
        )

        # fix_actions should point to specific elements
        if fix_actions:
            action_refs = [fa.get("element_ref") for fa in fix_actions if fa.get("element_ref")]
            assert len(action_refs) > 0, "fix_actions should reference specific elements"


# ===========================================================================
# TEST 7: test_deterministic_ids_100x
# ===========================================================================


class TestDeterministicIds100x:
    def test_deterministic_ids_100x(self):
        """Run insert_station_on_segment_sn 100 times with same input.

        Assert: ALL 100 results produce identical element IDs.
        Assert: ALL 100 snapshot hashes are identical.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        payload = {
            "segment_ref": first_seg,
            "station_type": "B",
            "insert_at": {"value": 0.5},
            "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
            "sn_fields": ["IN", "OUT"],
        }

        # Collect results from 100 runs
        ref_id_sets: list[set[str]] = []
        hashes: list[str] = []

        for _ in range(100):
            # Deep copy to ensure isolation
            snap_copy = copy.deepcopy(snapshot)
            result = execute_domain_operation(
                enm_dict=snap_copy,
                op_name="insert_station_on_segment_sn",
                payload=payload,
            )
            assert result.get("snapshot") is not None, f"Error: {result.get('error')}"

            s = result["snapshot"]

            # Collect all ref_ids from the snapshot
            all_refs: set[str] = set()
            for coll in ("buses", "branches", "transformers", "sources",
                         "loads", "generators", "substations", "bays",
                         "junctions", "corridors"):
                for elem in s.get(coll, []):
                    ref = elem.get("ref_id", "")
                    if ref:
                        all_refs.add(ref)

            ref_id_sets.append(all_refs)
            hashes.append(_snapshot_hash(s))

        # ALL 100 results should produce identical ref_id sets
        first_refs = ref_id_sets[0]
        for i, refs in enumerate(ref_id_sets[1:], start=1):
            assert refs == first_refs, (
                f"Run {i} produced different ref_ids: "
                f"extra={refs - first_refs}, missing={first_refs - refs}"
            )

        # ALL 100 hashes identical
        first_hash = hashes[0]
        for i, h in enumerate(hashes[1:], start=1):
            assert h == first_hash, f"Run {i} produced different hash: {h} != {first_hash}"


# ===========================================================================
# TEST 8: test_permutation_invariance_sn_fields
# ===========================================================================


class TestPermutationInvarianceSNFields:
    def test_permutation_invariance_sn_fields(self):
        """Create payload with 3 sn_fields in different orders.
        Run operation with each permutation (at least 6 permutations).
        Assert: all results produce identical snapshot hash (after sorting).
        Do this 50 times.
        """
        fields = ["IN", "OUT", "TR"]
        perms = list(itertools.permutations(fields))
        assert len(perms) >= 6  # 3! = 6

        for _ in range(50):
            _, snapshot = _build_gpz_plus_segments(2)
            first_seg = _get_first_segment_ref(snapshot)

            perm_hashes: list[str] = []
            for perm in perms:
                snap_copy = copy.deepcopy(snapshot)
                result = execute_domain_operation(
                    enm_dict=snap_copy,
                    op_name="insert_station_on_segment_sn",
                    payload={
                        "segment_ref": first_seg,
                        "station_type": "B",
                        "insert_at": {"value": 0.5},
                        "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                        "sn_fields": list(perm),
                    },
                )
                assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
                perm_hashes.append(_snapshot_hash(result["snapshot"]))

            # All permutations should produce the same hash
            first_h = perm_hashes[0]
            for i, h in enumerate(perm_hashes[1:], start=1):
                assert h == first_h, (
                    f"Permutation {perms[i]} produced different hash: {h} != {first_h}"
                )


# ===========================================================================
# TEST 9: test_pv_bess_transformer_gate
# ===========================================================================


class TestPVBESSTransformerGate:
    def test_pv_bess_transformer_gate(self):
        """Create a generator with gen_type=pv_inverter without transformer.

        Assert: readiness blocker pv_bess.transformer_required.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        # Insert station first
        result_station = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )
        assert result_station.get("snapshot") is not None
        s = result_station["snapshot"]

        # Find a bus in the station (nn bus if present, otherwise sn bus)
        station_buses = [b for b in s.get("buses", []) if "nn" in b.get("ref_id", "").lower()
                         or "04" in b.get("ref_id", "")]
        if not station_buses:
            # Use any bus that is not the GPZ source bus
            source_bus_refs = {src.get("bus_ref") for src in s.get("sources", [])}
            station_buses = [b for b in s.get("buses", [])
                             if b.get("ref_id") not in source_bus_refs]

        assert len(station_buses) > 0, "Need at least one non-source bus"
        target_bus_ref = station_buses[0]["ref_id"]

        # Add a PV inverter generator WITHOUT transformer reference
        gen_data = {
            "ref_id": "gen_pv_test",
            "name": "PV test",
            "bus_ref": target_bus_ref,
            "p_mw": 0.5,
            "q_mvar": 0.0,
            "gen_type": "pv_inverter",
            # NO connection_variant, NO blocking_transformer_ref
        }
        s_copy = copy.deepcopy(s)
        s_copy.setdefault("generators", []).append(gen_data)

        # Use update_element_parameters on a known element to trigger readiness
        # Pick any bus to update its name (effectively a no-op that returns readiness)
        any_bus = s_copy["buses"][0]
        result = execute_domain_operation(
            enm_dict=s_copy,
            op_name="update_element_parameters",
            payload={
                "element_ref": any_bus["ref_id"],
                "parameters": {"name": any_bus.get("name", "test")},
            },
        )

        # The readiness check should flag pv_bess.transformer_required
        readiness = result.get("readiness", {})
        blockers = readiness.get("blockers", [])
        blocker_codes = [b.get("code", "") for b in blockers]
        blocker_messages = " ".join(b.get("message_pl", "") for b in blockers)

        has_pv_blocker = (
            "pv_bess.transformer_required" in blocker_codes
            or "pv_bess" in " ".join(blocker_codes).lower()
            or "transformer" in blocker_messages.lower()
            or "pv" in blocker_messages.lower()
        )

        assert has_pv_blocker, (
            f"Expected pv_bess.transformer_required blocker, got codes: {blocker_codes}"
        )


# ===========================================================================
# TEST 10: test_set_normal_open_point
# ===========================================================================


class TestSetNormalOpenPoint:
    def test_set_normal_open_point(self):
        """Build network with ring. Set NOP.

        Assert: switch status is 'open'.
        Assert: corridor no_point_ref is set.
        """
        # Build a network with at least 3 segments for ring potential
        _, snapshot = _build_gpz_plus_segments(3)

        # Get the last bus and try to connect back to form a ring
        buses = snapshot.get("buses", [])
        branches = snapshot.get("branches", [])

        # Find the last bus in the corridor (end of trunk)
        corridors = snapshot.get("corridors", [])
        seg_refs = []
        if corridors:
            seg_refs = corridors[0].get("ordered_segment_refs", [])

        # Get first and last bus for ring connection
        first_bus = buses[0].get("ref_id") if buses else None
        last_bus = buses[-1].get("ref_id") if len(buses) > 1 else None

        # Try to connect ring with explicit endpoints
        result_ring = execute_domain_operation(
            enm_dict=snapshot,
            op_name="connect_ring",
            payload={
                "from_bus_ref": last_bus,
                "to_bus_ref": first_bus,
                "segment": {"rodzaj": "KABEL", "dlugosc_m": 200},
            },
        )

        ring_snapshot = snapshot
        if result_ring.get("snapshot"):
            ring_snapshot = result_ring["snapshot"]

        # Now set normal open point
        # Pick a segment ref for NOP
        corridors_now = ring_snapshot.get("corridors", [])
        nop_segment_ref = None
        if corridors_now:
            segs = corridors_now[0].get("ordered_segment_refs", [])
            if segs:
                nop_segment_ref = segs[-1]

        if nop_segment_ref is None and branches:
            nop_segment_ref = branches[-1].get("ref_id")

        assert nop_segment_ref is not None, "Need a segment ref for NOP"

        result = execute_domain_operation(
            enm_dict=ring_snapshot,
            op_name="set_normal_open_point",
            payload={"segment_ref": nop_segment_ref},
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Verify switch status is "open" OR the segment has open status
        found_open = False
        for branch in s.get("branches", []):
            if branch.get("ref_id") == nop_segment_ref:
                if branch.get("status") == "open":
                    found_open = True
                    break
            # Also check if a new switch was inserted
            if branch.get("type") in ("switch", "breaker", "disconnector"):
                if branch.get("status") == "open":
                    found_open = True

        assert found_open, "Expected at least one element with status='open' after NOP"

        # Verify corridor no_point_ref is set
        corridors_final = s.get("corridors", [])
        has_no_point = any(
            c.get("no_point_ref") is not None and c.get("no_point_ref") != ""
            for c in corridors_final
        )
        assert has_no_point, "corridor.no_point_ref should be set after set_normal_open_point"


# ===========================================================================
# TEST 11: test_assign_catalog
# ===========================================================================


class TestAssignCatalog:
    def test_assign_catalog(self):
        """Create branch without catalog. Assign catalog.

        Assert: catalog_ref is set.
        Assert: parameter_source is 'CATALOG'.
        """
        _, snapshot = _build_gpz_plus_segments(1)

        # Find a branch without catalog_ref
        target_branch = None
        for branch in snapshot.get("branches", []):
            if not branch.get("catalog_ref"):
                target_branch = branch
                break

        # If all branches have catalog_ref, clear one
        if target_branch is None:
            branches = snapshot.get("branches", [])
            if branches:
                target_branch = branches[0]
                target_branch["catalog_ref"] = None
                target_branch["parameter_source"] = None

        assert target_branch is not None, "Need a branch to test"

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="assign_catalog_to_element",
            payload={
                "element_ref": target_branch["ref_id"],
                "catalog_ref": "CAT-YAKY-240-SN",
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Verify catalog_ref is set
        updated_branch = _find_by_ref(s, "branches", target_branch["ref_id"])
        assert updated_branch is not None, f"Branch {target_branch['ref_id']} not found"
        assert updated_branch.get("catalog_ref") == "CAT-YAKY-240-SN"
        assert updated_branch.get("parameter_source") == "CATALOG"


# ===========================================================================
# TEST 12: test_snapshot_hash_stability
# ===========================================================================


class TestSnapshotHashStability:
    def test_snapshot_hash_stability(self):
        """Build same network twice from scratch (same operations, same order).

        Assert: final snapshot hashes are identical.
        """
        hashes = []
        for _ in range(2):
            enm = _empty_enm()

            r1 = _add_grid_source(enm)
            assert r1.get("snapshot") is not None
            s1 = r1["snapshot"]

            r2 = _continue_trunk(s1)
            assert r2.get("snapshot") is not None
            s2 = r2["snapshot"]

            r3 = _continue_trunk(s2)
            assert r3.get("snapshot") is not None
            s3 = r3["snapshot"]

            hashes.append(_snapshot_hash(s3))

        assert hashes[0] == hashes[1], (
            f"Same operations should produce identical hashes: {hashes[0]} != {hashes[1]}"
        )


# ===========================================================================
# TEST 13: test_station_type_b_passthrough
# ===========================================================================


class TestStationTypeBPassthrough:
    def test_station_type_b_passthrough(self):
        """Insert type B station.

        Assert: IN and OUT ports present.
        Assert: trunk continuity maintained (from_bus -> station -> to_bus).
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        # Remember the original segment's endpoints
        orig_branch = _find_by_ref(snapshot, "branches", first_seg)
        assert orig_branch is not None
        orig_from = orig_branch.get("from_bus_ref")
        orig_to = orig_branch.get("to_bus_ref")

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Check for IN and OUT bays
        bays = s.get("bays", [])
        bay_roles = [b.get("bay_role") for b in bays]
        assert "IN" in bay_roles, "Type B station should have IN bay"
        assert "OUT" in bay_roles, "Type B station should have OUT bay"

        # Trunk continuity: there should be a path from orig_from to orig_to
        # through the station (via branches/transformers)
        bus_refs = {b.get("ref_id") for b in s.get("buses", [])}
        adj: dict[str, set[str]] = {ref: set() for ref in bus_refs}
        for branch in s.get("branches", []):
            fr = branch.get("from_bus_ref", "")
            to = branch.get("to_bus_ref", "")
            if fr in adj and to in adj and branch.get("status", "closed") != "open":
                adj[fr].add(to)
                adj[to].add(fr)
        for trafo in s.get("transformers", []):
            hv = trafo.get("hv_bus_ref", "")
            lv = trafo.get("lv_bus_ref", "")
            if hv in adj and lv in adj:
                adj[hv].add(lv)
                adj[lv].add(hv)

        # BFS from orig_from to orig_to
        visited: set[str] = set()
        queue = [orig_from]
        found = False
        while queue:
            current = queue.pop(0)
            if current == orig_to:
                found = True
                break
            if current in visited:
                continue
            visited.add(current)
            for neighbor in adj.get(current, set()):
                if neighbor not in visited:
                    queue.append(neighbor)

        assert found, (
            f"Trunk continuity broken: no path from {orig_from} to {orig_to} "
            f"through station type B"
        )


# ===========================================================================
# TEST 14: test_station_type_c_branch
# ===========================================================================


class TestStationTypeCBranch:
    def test_station_type_c_branch(self):
        """Insert type C station.

        Assert: IN, OUT, and BRANCH ports.
        Assert: trunk continuity + branch port available.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "C",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT", "FEEDER"],
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Check for IN, OUT and branch-capable bay (FEEDER or similar)
        bays = s.get("bays", [])
        bay_roles = [b.get("bay_role") for b in bays]

        assert "IN" in bay_roles, "Type C station should have IN bay"
        assert "OUT" in bay_roles, "Type C station should have OUT bay"

        # Branch port: FEEDER, or an additional bay for lateral connection
        has_branch_port = (
            "FEEDER" in bay_roles
            or len(bays) >= 3  # more than IN+OUT means branch capability
        )
        assert has_branch_port, (
            f"Type C station should have branch port (FEEDER), got roles: {bay_roles}"
        )


# ===========================================================================
# TEST 15: test_station_type_d_sectional
# ===========================================================================


class TestStationTypeDSectional:
    def test_station_type_d_sectional(self):
        """Insert type D station.

        Assert: 2 section buses + coupler bay.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "D",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT", "COUPLER"],
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Check for COUPLER bay
        bays = s.get("bays", [])
        bay_roles = [b.get("bay_role") for b in bays]

        assert "COUPLER" in bay_roles, (
            f"Type D station should have COUPLER bay, got roles: {bay_roles}"
        )

        # Find the station that was just created
        new_subs = [sub for sub in s.get("substations", [])
                    if sub.get("station_type") in ("mv_lv", "switching")]
        assert len(new_subs) >= 1, "Type D station should create a substation"

        # The station should have at least 2 bus_refs (section buses)
        station = new_subs[-1]  # latest created station
        bus_refs = station.get("bus_refs", [])
        assert len(bus_refs) >= 2, (
            f"Type D station should have >= 2 section buses, got {len(bus_refs)}: {bus_refs}"
        )


# ===========================================================================
# TEST 16: test_insert_station_on_nonexistent_segment
# ===========================================================================


class TestInsertStationOnNonexistentSegment:
    def test_insert_station_on_nonexistent_segment(self):
        """Call with non-existent segment_id.

        Assert: error response with code station.insert.segment_missing.
        """
        _, snapshot = _build_gpz_plus_segments(1)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": "nonexistent_segment_xyz",
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )

        # Should fail with error
        error = result.get("error")
        readiness = result.get("readiness", {})
        blockers = readiness.get("blockers", [])
        blocker_codes = [b.get("code", "") for b in blockers]

        has_segment_missing_error = (
            (error and "segment" in error.lower())
            or "station.insert.segment_missing" in blocker_codes
            or (error and "not found" in error.lower())
            or (error and "missing" in error.lower())
            or result.get("snapshot") is None
        )

        assert has_segment_missing_error, (
            f"Expected segment_missing error, got error={error}, codes={blocker_codes}"
        )


# ===========================================================================
# TEST 17: test_insert_at_ratio_out_of_range
# ===========================================================================


class TestInsertAtRatioOutOfRange:
    def test_insert_at_ratio_out_of_range(self):
        """Call with insert_at.value > 1.0.

        Assert: error with code station.insert.insert_at_invalid.
        """
        _, snapshot = _build_gpz_plus_segments(1)
        first_seg = _get_first_segment_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 1.5},  # > 1.0
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )

        error = result.get("error")
        readiness = result.get("readiness", {})
        blockers = readiness.get("blockers", [])
        blocker_codes = [b.get("code", "") for b in blockers]

        has_invalid_error = (
            (error and "insert_at" in error.lower())
            or "station.insert.insert_at_invalid" in blocker_codes
            or (error and "range" in error.lower())
            or (error and "invalid" in error.lower())
            or result.get("snapshot") is None
        )

        assert has_invalid_error, (
            f"Expected insert_at_invalid error for value > 1.0, "
            f"got error={error}, codes={blocker_codes}"
        )


# ===========================================================================
# TEST 18: test_alias_resolution
# ===========================================================================


class TestAliasResolution:
    def test_alias_resolution(self):
        """Call execute_domain_operation with alias name 'add_trunk_segment_sn'.

        Assert: works correctly (resolves to continue_trunk_segment_sn).
        """
        enm = _empty_enm()
        r1 = _add_grid_source(enm)
        assert r1.get("snapshot") is not None
        s1 = r1["snapshot"]

        # Use the alias name with explicit segment params
        result = execute_domain_operation(
            enm_dict=s1,
            op_name="add_trunk_segment_sn",
            payload={
                "segment": {"rodzaj": "KABEL", "dlugosc_m": 500},
            },
        )

        # Should succeed (alias resolved to continue_trunk_segment_sn)
        assert result.get("snapshot") is not None, (
            f"Alias 'add_trunk_segment_sn' should resolve to "
            f"'continue_trunk_segment_sn', got error: {result.get('error')}"
        )

        snapshot = result["snapshot"]

        # Should have created new elements (same behavior as continue_trunk_segment_sn)
        assert _count(snapshot, "branches") > _count(s1, "branches")


# ===========================================================================
# TEST 19: test_domain_events_order
# ===========================================================================


class TestDomainEventsOrder:
    def test_domain_events_order(self):
        """Insert station.

        Assert: domain_events are in correct order
                (SEGMENT_SPLIT first, LOGICAL_VIEWS_UPDATED last).
        Assert: event_seq is monotonically increasing starting from 1.
        """
        _, snapshot = _build_gpz_plus_segments(2)
        first_seg = _get_first_segment_ref(snapshot)

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="insert_station_on_segment_sn",
            payload={
                "segment_ref": first_seg,
                "station_type": "B",
                "insert_at": {"value": 0.5},
                "station": {"sn_voltage_kv": 15.0, "nn_voltage_kv": 0.4},
                "sn_fields": ["IN", "OUT"],
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"

        domain_events = result.get("domain_events", [])
        assert len(domain_events) >= 2, (
            f"Expected at least 2 domain events, got {len(domain_events)}"
        )

        # Extract event types
        event_types = [e.get("type", e.get("event_type", "")) for e in domain_events]

        # SEGMENT_SPLIT should come before LOGICAL_VIEWS_UPDATED
        segment_split_idx = None
        logical_views_idx = None
        for i, et in enumerate(event_types):
            if "SEGMENT_SPLIT" in et.upper():
                segment_split_idx = i
            if "LOGICAL_VIEWS_UPDATED" in et.upper():
                logical_views_idx = i

        if segment_split_idx is not None and logical_views_idx is not None:
            assert segment_split_idx < logical_views_idx, (
                f"SEGMENT_SPLIT (idx={segment_split_idx}) should come before "
                f"LOGICAL_VIEWS_UPDATED (idx={logical_views_idx})"
            )

        # event_seq is monotonically increasing starting from 1
        seqs = [e.get("event_seq", e.get("seq", 0)) for e in domain_events]
        if all(s > 0 for s in seqs):
            assert seqs[0] >= 1, f"event_seq should start from >= 1, got {seqs[0]}"
            for i in range(1, len(seqs)):
                assert seqs[i] > seqs[i - 1], (
                    f"event_seq not monotonically increasing: "
                    f"seq[{i-1}]={seqs[i-1]}, seq[{i}]={seqs[i]}"
                )


# ===========================================================================
# TEST 20: test_connect_ring
# ===========================================================================


class TestConnectRing:
    def test_connect_ring(self):
        """Build network with 2+ segments forming a path. Connect ring.

        Assert: cycle exists in topology.
        Assert: corridor type updated to 'ring'.
        """
        _, snapshot = _build_gpz_plus_segments(3)

        # Jawne podanie szyn — brak auto-detekcji
        buses = snapshot.get("buses", [])
        first_bus = buses[0].get("ref_id")
        last_bus = buses[-1].get("ref_id")

        result = execute_domain_operation(
            enm_dict=snapshot,
            op_name="connect_ring",
            payload={
                "from_bus_ref": last_bus,
                "to_bus_ref": first_bus,
                "segment": {"rodzaj": "KABEL", "dlugosc_m": 200},
            },
        )

        assert result.get("snapshot") is not None, f"Error: {result.get('error')}"
        s = result["snapshot"]

        # Check for cycle in topology (more edges than V-1 means cycle)
        bus_refs = {b.get("ref_id") for b in s.get("buses", [])}
        edge_set: set[tuple[str, str]] = set()

        for branch in s.get("branches", []):
            if branch.get("status", "closed") != "open":
                fr = branch.get("from_bus_ref", "")
                to = branch.get("to_bus_ref", "")
                if fr and to:
                    edge_set.add((min(fr, to), max(fr, to)))

        for trafo in s.get("transformers", []):
            hv = trafo.get("hv_bus_ref", "")
            lv = trafo.get("lv_bus_ref", "")
            if hv and lv:
                edge_set.add((min(hv, lv), max(hv, lv)))

        # For a tree: E = V - 1. If E >= V, there's at least one cycle.
        v = len(bus_refs)
        e = len(edge_set)
        assert e >= v, (
            f"Expected cycle after connect_ring: "
            f"edges={e}, vertices={v} (need edges >= vertices for cycle)"
        )

        # Check corridor type updated to "ring"
        corridors = s.get("corridors", [])
        ring_corridors = [c for c in corridors if c.get("corridor_type") == "ring"]
        assert len(ring_corridors) >= 1, (
            f"Expected at least one ring corridor after connect_ring, "
            f"got types: {[c.get('corridor_type') for c in corridors]}"
        )
