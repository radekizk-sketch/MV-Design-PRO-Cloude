"""
Operacje domenowe V1 — budowa sieci SN od GPZ z SLD na żywo.

Kanoniczny zestaw operacji semantycznych kompozytujących niskopoziomowe CRUD
z topology_ops.py w spójne przepływy domenowe.

DETERMINISTYCZNE: identyczne wejście → identyczny wynik.
BINDING: Komunikaty po polsku, brak kodów projektowych.
"""

from __future__ import annotations

import copy
import hashlib
import json
from typing import Any

from .topology_ops import (
    TopologyOpResult,
    create_branch,
    create_device,
    create_node,
    delete_branch,
    update_branch,
)
from .validator import ENMValidator
from .models import EnergyNetworkModel


# ---------------------------------------------------------------------------
# Canonical operation names and alias mapping
# ---------------------------------------------------------------------------

CANONICAL_OPS = frozenset({
    "add_grid_source_sn",
    "continue_trunk_segment_sn",
    "insert_station_on_segment_sn",
    "insert_branch_pole_on_segment_sn",
    "insert_zksn_on_segment_sn",
    "start_branch_segment_sn",
    "insert_section_switch_sn",
    "connect_secondary_ring_sn",
    "set_normal_open_point",
    "add_transformer_sn_nn",
    "assign_catalog_to_element",
    "update_element_parameters",
    "add_nn_source_field",
    "add_pv_inverter_nn",
    "add_bess_inverter_nn",
    "add_genset_nn",
    "add_ups_nn",
    "add_nn_load",
    "refresh_snapshot",
})

ALIAS_MAP: dict[str, str] = {
    "add_trunk_segment_sn": "continue_trunk_segment_sn",
    "continue_trunk_segment_sn_from_catalog": "continue_trunk_segment_sn",
    "add_branch_segment_sn": "start_branch_segment_sn",
    "add_branch_segment_sn_from_catalog": "start_branch_segment_sn",
    "start_branch_from_port": "start_branch_segment_sn",
    "insert_station_on_trunk_segment_sn": "insert_station_on_segment_sn",
    "insert_station_on_trunk_segment": "insert_station_on_segment_sn",
    "insert_branch_pole": "insert_branch_pole_on_segment_sn",
    "insert_zksn": "insert_zksn_on_segment_sn",
    "add_transformer_sn_nn_from_catalog": "add_transformer_sn_nn",
    "add_switch_from_catalog": "insert_section_switch_sn",
    "connect_ring_sn": "connect_secondary_ring_sn",
    "connect_secondary_ring": "connect_secondary_ring_sn",
    "connect_ring": "connect_secondary_ring_sn",
}


# ---------------------------------------------------------------------------
# Helpers — deterministic ID generation
# ---------------------------------------------------------------------------


def _canonical_json(data: Any) -> str:
    """Kanoniczny JSON: sortowane klucze, brak spacji, stabilna repr. liczb."""
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _compute_seed(parts: dict[str, Any]) -> str:
    """SHA-256 z kanonicznych danych, pierwsze 32 znaki hex."""
    canonical = _canonical_json(parts)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:32]


def _make_id(prefix: str, seed: str, local_path: str) -> str:
    """Buduj deterministyczny identyfikator elementu."""
    return f"{prefix}/{seed}/{local_path}"


def _quantize_ratio(value: float, quantum: float = 1e-6) -> float:
    """Kwantyzacja wartości ratio dla stabilności deterministycznej."""
    return round(value / quantum) * quantum


# ---------------------------------------------------------------------------
# Helpers — snapshot utilities
# ---------------------------------------------------------------------------


def _find_element(enm: dict[str, Any], ref_id: str) -> tuple[str, int] | None:
    """Znajdź element po ref_id, zwróć (kolekcja, indeks)."""
    for key in ("buses", "branches", "transformers", "sources", "loads",
                "generators", "substations", "bays", "junctions",
                "corridors", "measurements", "protection_assignments", "branch_points"):
        for i, elem in enumerate(enm.get(key, [])):
            if elem.get("ref_id") == ref_id:
                return (key, i)
    return None


def _find_branch(enm: dict[str, Any], ref_id: str) -> dict[str, Any] | None:
    """Znajdź gałąź po ref_id."""
    for b in enm.get("branches", []):
        if b.get("ref_id") == ref_id:
            return b
    return None


def _find_corridor_for_segment(enm: dict[str, Any], segment_ref: str) -> dict[str, Any] | None:
    """Znajdź magistralę (corridor) zawierającą dany segment."""
    for c in enm.get("corridors", []):
        if segment_ref in c.get("ordered_segment_refs", []):
            return c
    return None


def _auto_detect_trunk_end(enm: dict[str, Any], trunk_id: str | None) -> str | None:
    """Auto-detect the end bus of the trunk for continue_trunk operations.

    Strategy: find the corridor, get the last segment, return its to_bus_ref.
    If no corridor segments, return the first bus (GPZ bus).
    """
    corridors = enm.get("corridors", [])
    target_corridor = None

    if trunk_id:
        for c in corridors:
            if c.get("ref_id") == trunk_id:
                target_corridor = c
                break
    elif corridors:
        target_corridor = corridors[0]

    if target_corridor:
        segments = target_corridor.get("ordered_segment_refs", [])
        if segments:
            last_seg_ref = segments[-1]
            for b in enm.get("branches", []):
                if b.get("ref_id") == last_seg_ref:
                    return b.get("to_bus_ref")

    # Fallback: return the first bus (likely GPZ bus)
    buses = enm.get("buses", [])
    if buses:
        return buses[0].get("ref_id")
    return None


def _build_readiness(enm: dict[str, Any]) -> dict[str, Any]:
    """Oblicz gotowość i blokery z walidatora."""
    try:
        enm_model = EnergyNetworkModel.model_validate(enm)
        validator = ENMValidator()
        validation = validator.validate(enm_model)
        readiness = validator.readiness(validation)

        blockers = []
        warnings = []
        fix_actions = []

        for issue in validation.issues:
            entry = {
                "code": issue.code,
                "message_pl": issue.message_pl,
                "element_ref": issue.element_refs[0] if issue.element_refs else None,
            }
            fa = None
            if issue.fix_action:
                fa = {
                    "code": issue.code,
                    "action_type": issue.fix_action.action_type,
                    "element_ref": issue.fix_action.element_ref,
                    "panel": issue.fix_action.modal_type,
                    "step": issue.wizard_step_hint or None,
                    "focus": issue.fix_action.element_ref,
                    "message_pl": issue.suggested_fix or issue.message_pl,
                }
                fix_actions.append(fa)

            if issue.severity == "BLOCKER":
                entry["severity"] = "BLOKUJACE"
                blockers.append(entry)
            elif issue.severity == "IMPORTANT":
                entry["severity"] = "OSTRZEZENIE"
                warnings.append(entry)

        # Domain-level check: PV/BESS generators without transformer
        for gen in enm.get("generators", []):
            gen_type = (gen.get("gen_type") or "").lower()
            if ("pv" in gen_type or "bess" in gen_type or "inverter" in gen_type):
                has_trafo = bool(gen.get("blocking_transformer_ref"))
                cv = gen.get("connection_variant") or ""
                if not has_trafo and "direct" not in cv.lower():
                    blockers.append({
                        "code": "pv_bess.transformer_required",
                        "message_pl": (
                            f"Generator OZE '{gen.get('name', gen.get('ref_id'))}' "
                            f"typu {gen_type} wymaga transformatora w ścieżce."
                        ),
                        "element_ref": gen.get("ref_id"),
                        "severity": "BLOKUJACE",
                    })
                    fix_actions.append({
                        "code": "pv_bess.transformer_required",
                        "action_type": "add_transformer",
                        "element_ref": gen.get("ref_id"),
                        "panel": "transformer_panel",
                        "step": None,
                        "focus": gen.get("ref_id"),
                        "message_pl": "Dodaj transformator dla generatora OZE.",
                    })

        # Domain-level check: branch points (slup rozgałęźny / ZKSN)
        for bp in enm.get("branch_points", []):
            bp_ref = bp.get("ref_id")
            bp_type = bp.get("branch_point_type")
            parent_segment_id = bp.get("parent_segment_id")
            main_in = bp.get("ports", {}).get("MAIN_IN")
            main_out = bp.get("ports", {}).get("MAIN_OUT")
            branch_ports = bp.get("ports", {}).get("BRANCH", [])

            parent = _find_branch(enm, parent_segment_id) if parent_segment_id else None
            if not parent:
                blockers.append({
                    "code": "branch_point.invalid_parent_medium",
                    "message_pl": f"Punkt rozgałęzienia '{bp_ref}' nie ma poprawnego segmentu nadrzędnego.",
                    "element_ref": bp_ref,
                    "severity": "BLOKUJACE",
                })
            else:
                if bp_type == "branch_pole" and parent.get("type") != "line_overhead":
                    blockers.append({
                        "code": "branch_point.invalid_parent_medium",
                        "message_pl": f"Słup rozgałęźny '{bp_ref}' może być osadzony tylko na linii napowietrznej.",
                        "element_ref": bp_ref,
                        "severity": "BLOKUJACE",
                    })
                if bp_type == "zksn" and parent.get("type") != "cable":
                    blockers.append({
                        "code": "branch_point.invalid_parent_medium",
                        "message_pl": f"ZKSN '{bp_ref}' może być osadzony tylko na kablu.",
                        "element_ref": bp_ref,
                        "severity": "BLOKUJACE",
                    })

            if not main_in or not main_out:
                blockers.append({
                    "code": "branch_point.required_port_missing",
                    "message_pl": f"Punkt '{bp_ref}' nie ma wymaganych portów MAIN_IN/MAIN_OUT.",
                    "element_ref": bp_ref,
                    "severity": "BLOKUJACE",
                })

            if not bp.get("catalog_ref"):
                blockers.append({
                    "code": "branch_point.catalog_ref_missing",
                    "message_pl": f"Punkt '{bp_ref}' nie ma przypisanej referencji katalogowej.",
                    "element_ref": bp_ref,
                    "severity": "BLOKUJACE",
                })
                fix_actions.append({
                    "code": "branch_point.catalog_ref_missing",
                    "action_type": "SELECT_CATALOG",
                    "element_ref": bp_ref,
                    "panel": "catalog",
                    "step": "branch_point",
                    "focus": bp_ref,
                    "message_pl": "Wybierz pozycję katalogową dla punktu rozgałęzienia.",
                })

            if bp_type == "zksn" and len(branch_ports) not in (1, 2):
                blockers.append({
                    "code": "zksn.branch_count_invalid",
                    "message_pl": f"ZKSN '{bp_ref}' ma niepoprawną liczbę portów odgałęźnych.",
                    "element_ref": bp_ref,
                    "severity": "BLOKUJACE",
                })

            if bp_type == "zksn" and not bp.get("switch_state"):
                blockers.append({
                    "code": "branch_point.switch_state_missing",
                    "message_pl": f"ZKSN '{bp_ref}' nie ma stanu łącznika (switch_state).",
                    "element_ref": bp_ref,
                    "severity": "BLOKUJACE",
                })

        # Domain-level check: switches/breakers without catalog_ref
        for b in enm.get("branches", []):
            b_type = b.get("type", "")
            if b_type in ("switch", "breaker") and not b.get("catalog_ref"):
                b_ref = b.get("ref_id", "")
                blockers.append({
                    "code": "switch.catalog_ref_missing",
                    "message_pl": (
                        f"Łącznik '{b.get('name', b_ref)}' "
                        "nie ma przypisanej referencji katalogowej."
                    ),
                    "element_ref": b_ref,
                    "severity": "BLOKUJACE",
                })
                fix_actions.append({
                    "code": "switch.catalog_ref_missing",
                    "action_type": "SELECT_CATALOG",
                    "element_ref": b_ref,
                    "panel": "catalog",
                    "step": "switch",
                    "focus": b_ref,
                    "message_pl": "Wybierz pozycję katalogową dla łącznika.",
                })

        has_any_blocker = len(blockers) > 0
        return {
            "ready": readiness.ready and not has_any_blocker,
            "blockers": blockers,
            "warnings": warnings,
        }, fix_actions
    except Exception:
        return {"ready": False, "blockers": [], "warnings": []}, []


def _compute_logical_views(enm: dict[str, Any]) -> dict[str, Any]:
    """Oblicz widoki logiczne — deterministyczna pochodna Snapshot.

    Zawiera magistrale z terminalami, odgałęzienia, połączenia wtórne.
    """
    corridors = enm.get("corridors", [])
    branches = enm.get("branches", [])
    buses = enm.get("buses", [])

    # Index branches by ref_id
    branch_idx = {b.get("ref_id"): b for b in branches}
    bus_refs = {b.get("ref_id") for b in buses}

    # Collect all segment refs that belong to corridors
    corridor_segment_refs: set[str] = set()
    for c in corridors:
        for seg in c.get("ordered_segment_refs", []):
            corridor_segment_refs.add(seg)

    branch_points = {bp.get("bus_ref"): bp for bp in enm.get("branch_points", [])}

    # Build trunks with terminals
    trunks = []
    for c in sorted(corridors, key=lambda x: x.get("ref_id", "")):
        segments = c.get("ordered_segment_refs", [])
        terminals = []

        if segments:
            # Start terminal: from_bus of first segment
            first_seg = branch_idx.get(segments[0])
            if first_seg:
                start_bus = first_seg.get("from_bus_ref", "")
                # Check if start bus has other connections (ZAJETY) or is open
                start_status = _terminal_status(enm, start_bus, c.get("ref_id"))
                terminals.append({
                    "element_id": start_bus,
                    "port_id": "trunk_start",
                    "trunk_id": c.get("ref_id"),
                    "branch_id": None,
                    "status": start_status,
                })

            # End terminal: to_bus of last segment
            last_seg = branch_idx.get(segments[-1])
            if last_seg:
                end_bus = last_seg.get("to_bus_ref", "")
                end_status = _terminal_status(enm, end_bus, c.get("ref_id"))
                terminals.append({
                    "element_id": end_bus,
                    "port_id": "trunk_end",
                    "trunk_id": c.get("ref_id"),
                    "branch_id": None,
                    "status": end_status,
                })

        embedded_objects: list[dict[str, Any]] = []
        for seg_ref in segments:
            seg = branch_idx.get(seg_ref)
            if not seg:
                continue
            for side in ("from_bus_ref", "to_bus_ref"):
                bp = branch_points.get(seg.get(side, ""))
                if not bp:
                    continue
                embedded_objects.append({
                    "object_id": bp.get("ref_id"),
                    "object_type": bp.get("branch_point_type"),
                    "segment_id": seg_ref,
                    "parent_segment_id": bp.get("parent_segment_id"),
                    "ports": bp.get("ports", {}),
                })

        trunks.append({
            "corridor_ref": c.get("ref_id"),
            "corridor_type": c.get("corridor_type", "radial"),
            "segments": segments,
            "no_point_ref": c.get("no_point_ref"),
            "terminals": terminals,
            "embedded_objects": sorted(embedded_objects, key=lambda x: x.get("object_id", "")),
        })

    # Collect all corridor bus refs for ring detection (needed before branch classification)
    corridor_bus_refs: set[str] = set()
    for c in corridors:
        for seg_ref in c.get("ordered_segment_refs", []):
            seg = branch_idx.get(seg_ref)
            if seg:
                corridor_bus_refs.add(seg.get("from_bus_ref", ""))
                corridor_bus_refs.add(seg.get("to_bus_ref", ""))
    corridor_bus_refs.discard("")

    # Classify non-corridor cable/line segments into branches vs secondary connectors
    branch_views = []
    secondary_connectors = []
    for b in sorted(branches, key=lambda x: x.get("ref_id", "")):
        ref = b.get("ref_id", "")
        if ref in corridor_segment_refs:
            continue
        btype = b.get("type", "")
        if btype not in ("cable", "line_overhead"):
            continue
        from_ref = b.get("from_bus_ref", "")
        to_ref = b.get("to_bus_ref", "")

        # Ring closure: both ends connect to corridor buses → secondary connector
        if from_ref in corridor_bus_refs and to_ref in corridor_bus_refs:
            secondary_connectors.append({
                "connector_id": ref,
                "from_element_id": from_ref,
                "to_element_id": to_ref,
                "segment_ref": ref,
            })
        else:
            # Lateral branch segment
            branch_views.append({
                "branch_id": ref,
                "from_element_id": from_ref,
                "from_port_id": "branch_start",
                "segments": [ref],
                "terminals": [{
                    "element_id": to_ref,
                    "port_id": "branch_end",
                    "trunk_id": None,
                    "branch_id": ref,
                    "status": _terminal_status(enm, to_ref, None),
                }],
            })

    # Aggregate all terminals
    all_terminals = []
    for t in trunks:
        all_terminals.extend(t.get("terminals", []))
    for bv in branch_views:
        all_terminals.extend(bv.get("terminals", []))

    return {
        "trunks": trunks,
        "branches": branch_views,
        "secondary_connectors": secondary_connectors,
        "terminals": all_terminals,
    }


def _terminal_status(
    enm: dict[str, Any], bus_ref: str, corridor_ref: str | None
) -> str:
    """Określ status terminala na podstawie topologii.

    OTWARTY — bus ma wolne porty (< 2 połączenia kablowe).
    ZAJETY — bus ma >= 2 połączenia kablowe w magistrali.
    ZAREZERWOWANY_DLA_RINGU — bus jest oznaczony jako kandydat do pierścienia.
    """
    cable_count = 0
    for b in enm.get("branches", []):
        btype = b.get("type", "")
        if btype in ("cable", "line_overhead"):
            if b.get("from_bus_ref") == bus_ref or b.get("to_bus_ref") == bus_ref:
                cable_count += 1

    # Ring corridor — end terminal is reserved
    if corridor_ref:
        for c in enm.get("corridors", []):
            if c.get("ref_id") == corridor_ref and c.get("corridor_type") == "ring":
                return "ZAREZERWOWANY_DLA_RINGU"

    if cable_count >= 2:
        return "ZAJETY"
    return "OTWARTY"


def _resolve_branch_from_ref(enm: dict[str, Any], from_ref: str) -> tuple[str | None, str | None]:
    """Rozwiąż from_ref (station/branch_pole/zksn) na szynę źródłową.

    Obsługiwane:
    - station.BRANCH (przez pole FEEDER)
    - branch_pole.BRANCH
    - zksn.BRANCH_1, zksn.BRANCH_2
    """
    if "." not in from_ref:
        return None, "branch_connection.invalid_source_port"
    element_ref, port_id = from_ref.split(".", 1)

    if element_ref.startswith("stn/"):
        sub = next((s for s in enm.get("substations", []) if s.get("ref_id") == element_ref), None)
        if not sub:
            return None, "branch.from_bus_not_found"
        if port_id != "BRANCH":
            return None, "branch_connection.invalid_source_port"
        feeder_bay = next(
            (
                bay for bay in enm.get("bays", [])
                if bay.get("substation_ref") == element_ref and bay.get("bay_role") == "FEEDER"
            ),
            None,
        )
        if not feeder_bay:
            return None, "branch_connection.source_not_branch_capable"
        return feeder_bay.get("bus_ref"), None

    bp = next((b for b in enm.get("branch_points", []) if b.get("ref_id") == element_ref), None)
    if not bp:
        return None, "branch_connection.source_not_branch_capable"

    ports = bp.get("ports", {})
    if bp.get("branch_point_type") == "branch_pole":
        if port_id != "BRANCH":
            return None, "branch_connection.invalid_source_port"
        if bp.get("branch_occupied", {}).get(port_id):
            return None, "branch_point.branch_port_occupied"
        bus_ref = ports.get("BRANCH", [None])[0] if isinstance(ports.get("BRANCH"), list) else None
        if not bus_ref:
            return None, "branch_point.required_port_missing"
        return bus_ref, None

    if bp.get("branch_point_type") == "zksn":
        if not port_id.startswith("BRANCH_"):
            return None, "branch_connection.invalid_source_port"
        try:
            idx = int(port_id.split("_", 1)[1]) - 1
        except Exception:
            return None, "branch_connection.invalid_source_port"
        branch_ports = ports.get("BRANCH", [])
        if idx < 0 or idx >= len(branch_ports):
            return None, "branch_connection.invalid_source_port"
        if bp.get("branch_occupied", {}).get(port_id):
            return None, "branch_point.branch_port_occupied"
        return branch_ports[idx], None

    return None, "branch_connection.source_not_branch_capable"


def _get_catalog_safe():
    """Załaduj katalog MV (bezpieczne — zwraca None przy braku)."""
    try:
        from network_model.catalog import get_default_mv_catalog
        return get_default_mv_catalog()
    except Exception:
        return None


def _compute_materialized_params(enm: dict[str, Any]) -> dict[str, Any]:
    """Oblicz zmaterializowane parametry katalogowe.

    Każdy segment z catalog_ref ma skopiowane parametry.
    Jeśli dostępny jest katalog (CatalogRepository), parametry są
    rozwiązywane z katalogu (precedence: catalog > instance).
    """
    lines_sn: dict[str, Any] = {}
    transformers_sn_nn: dict[str, Any] = {}

    # Try loading catalog for actual parameter resolution
    catalog = _get_catalog_safe()

    for b in enm.get("branches", []):
        btype = b.get("type", "")
        if btype not in ("cable", "line_overhead"):
            continue
        catalog_ref = b.get("catalog_ref")
        if not catalog_ref:
            continue

        r_ohm_per_km = b.get("r_ohm_per_km")
        x_ohm_per_km = b.get("x_ohm_per_km")
        i_max_a = (
            (b.get("rating") or {}).get("in_a")
            if isinstance(b.get("rating"), dict)
            else None
        )

        # Resolve from catalog if available
        if catalog:
            is_cable = btype == "cable"
            type_data = (
                catalog.get_cable_type(catalog_ref) if is_cable
                else catalog.get_line_type(catalog_ref)
            )
            if type_data:
                r_ohm_per_km = type_data.r_ohm_per_km
                x_ohm_per_km = type_data.x_ohm_per_km
                i_max_a = type_data.rated_current_a

        lines_sn[b["ref_id"]] = {
            "catalog_item_id": catalog_ref,
            "catalog_item_version": b.get("meta", {}).get(
                "catalog_item_version"
            ),
            "r_ohm_per_km": r_ohm_per_km,
            "x_ohm_per_km": x_ohm_per_km,
            "i_max_a": i_max_a,
        }

    for t in enm.get("transformers", []):
        catalog_ref = t.get("catalog_ref")
        if not catalog_ref:
            continue

        uk_percent = t.get("uk_percent")
        p0_kw = t.get("p0_kw")
        pk_kw = t.get("pk_kw")
        s_n_kva = (t.get("sn_mva") or 0) * 1000 if t.get("sn_mva") else None

        # Resolve from catalog if available
        if catalog:
            type_data = catalog.get_transformer_type(catalog_ref)
            if type_data:
                uk_percent = type_data.uk_percent
                p0_kw = type_data.p0_kw
                pk_kw = type_data.pk_kw
                s_n_kva = type_data.rated_power_mva * 1000

        transformers_sn_nn[t["ref_id"]] = {
            "catalog_item_id": catalog_ref,
            "catalog_item_version": t.get("meta", {}).get(
                "catalog_item_version"
            ),
            "u_k_percent": uk_percent,
            "p0_kw": p0_kw,
            "pk_kw": pk_kw,
            "s_n_kva": s_n_kva,
        }

    return {
        "lines_sn": lines_sn,
        "transformers_sn_nn": transformers_sn_nn,
    }


def _compute_layout_hash(enm: dict[str, Any]) -> str:
    """Oblicz deterministyczny hash układu topologicznego."""
    layout_data = {
        "buses": sorted(
            [b.get("ref_id", "") for b in enm.get("buses", [])]
        ),
        "branches": sorted(
            [
                f"{b.get('from_bus_ref', '')}→{b.get('to_bus_ref', '')}"
                for b in enm.get("branches", [])
            ]
        ),
        "transformers": sorted(
            [
                f"{t.get('hv_bus_ref', '')}→{t.get('lv_bus_ref', '')}"
                for t in enm.get("transformers", [])
            ]
        ),
        "corridors": [
            c.get("ordered_segment_refs", [])
            for c in sorted(
                enm.get("corridors", []),
                key=lambda x: x.get("ref_id", ""),
            )
        ],
    }
    canonical = _canonical_json(layout_data)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _response(
    enm: dict[str, Any],
    created: list[str] | None = None,
    updated: list[str] | None = None,
    deleted: list[str] | None = None,
    selection_id: str | None = None,
    selection_type: str | None = None,
    audit: list[dict] | None = None,
    events: list[dict] | None = None,
) -> dict[str, Any]:
    """Zbuduj standardową odpowiedź operacji domenowej."""
    readiness, fix_actions = _build_readiness(enm)
    logical_views = _compute_logical_views(enm)
    materialized_params = _compute_materialized_params(enm)
    layout_hash = _compute_layout_hash(enm)

    return {
        "snapshot": enm,
        "logical_views": logical_views,
        "readiness": readiness,
        "fix_actions": fix_actions,
        "changes": {
            "created_element_ids": created or [],
            "updated_element_ids": updated or [],
            "deleted_element_ids": deleted or [],
        },
        "selection_hint": {
            "element_id": selection_id,
            "element_type": selection_type,
            "zoom_to": True,
        } if selection_id else None,
        "audit_trail": audit or [],
        "domain_events": events or [],
        "materialized_params": materialized_params,
        "layout": {
            "layout_hash": f"sha256:{layout_hash}",
            "layout_version": "1.0",
        },
    }


def _error_response(message: str, code: str = "UNKNOWN") -> dict[str, Any]:
    """Odpowiedź błędu operacji."""
    return {
        "error": message,
        "error_code": code,
        "snapshot": None,
        "logical_views": {},
        "readiness": {"ready": False, "blockers": [], "warnings": []},
        "fix_actions": [],
        "changes": {"created_element_ids": [], "updated_element_ids": [], "deleted_element_ids": []},
        "selection_hint": None,
        "audit_trail": [],
        "domain_events": [],
        "materialized_params": {"lines_sn": {}, "transformers_sn_nn": {}},
        "layout": {"layout_hash": "", "layout_version": "1.0"},
    }


# ---------------------------------------------------------------------------
# 1. add_grid_source_sn
# ---------------------------------------------------------------------------


def add_grid_source_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Dodaj źródło zasilania (GPZ) — pierwszy krok budowy sieci SN."""
    voltage_kv = payload.get("voltage_kv")
    if voltage_kv is None or voltage_kv <= 0:
        # Pobierz napięcie z jawnych ustawień projektu (ENM defaults)
        voltage_kv = enm.get("header", {}).get("defaults", {}).get("sn_nominal_kv")
    if voltage_kv is None or voltage_kv <= 0:
        return _error_response(
            "Brak napięcia znamionowego SN: podaj voltage_kv w payloadzie lub ustaw "
            "defaults.sn_nominal_kv w nagłówku ENM.",
            "source.missing_voltage",
        )

    # Check no existing source
    if enm.get("sources"):
        return _error_response(
            "Model sieci już ma źródło zasilania. Można dodać tylko jedno GPZ.",
            "source.already_exists",
        )

    seed = _compute_seed({"op": "add_grid_source_sn", "voltage_kv": voltage_kv})
    bus_ref = _make_id("gpz", seed, "bus_sn")
    source_ref = _make_id("gpz", seed, "source")
    substation_ref = _make_id("gpz", seed, "substation")
    corridor_ref = _make_id("gpz", seed, "corridor_01")

    new_enm = copy.deepcopy(enm)
    created = []
    events = []
    audit = []
    ev_seq = 0

    # Create GPZ bus
    bus_name = payload.get("bus_name") or f"Szyna GPZ {voltage_kv} kV"
    result = create_node(new_enm, {
        "ref_id": bus_ref,
        "name": bus_name,
        "voltage_kv": voltage_kv,
        "zone": "GPZ",
    })
    if not result.success:
        return _error_response(
            f"Nie udało się utworzyć szyny GPZ: {result.issues[0].message_pl if result.issues else '?'}",
            "source.bus_creation_failed",
        )
    new_enm = result.enm
    created.append(bus_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "BUS_CREATED", "element_id": bus_ref})
    audit.append({"step": ev_seq, "action": "Utworzono szynę GPZ", "element_id": bus_ref})

    # Create source
    source_data = {
        "device_type": "source",
        "ref_id": source_ref,
        "name": payload.get("source_name") or f"Źródło GPZ {voltage_kv} kV",
        "bus_ref": bus_ref,
        "model": "short_circuit_power",
    }
    if payload.get("sk3_mva"):
        source_data["sk3_mva"] = payload["sk3_mva"]
    if payload.get("ik3_ka"):
        source_data["ik3_ka"] = payload["ik3_ka"]
    if payload.get("rx_ratio"):
        source_data["rx_ratio"] = payload["rx_ratio"]

    result = create_device(new_enm, source_data)
    if not result.success:
        return _error_response(
            f"Nie udało się utworzyć źródła: {result.issues[0].message_pl if result.issues else '?'}",
            "source.creation_failed",
        )
    new_enm = result.enm
    created.append(source_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "SOURCE_CREATED", "element_id": source_ref})
    audit.append({"step": ev_seq, "action": "Utworzono źródło zasilania", "element_id": source_ref})

    # Create substation (GPZ)
    new_enm.setdefault("substations", []).append({
        "ref_id": substation_ref,
        "name": payload.get("source_name") or f"GPZ {voltage_kv} kV",
        "station_type": "gpz",
        "bus_refs": [bus_ref],
        "transformer_refs": [],
        "tags": [],
        "meta": {},
    })
    created.append(substation_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "STATION_CREATED", "element_id": substation_ref})

    # Create corridor (trunk)
    new_enm.setdefault("corridors", []).append({
        "ref_id": corridor_ref,
        "name": f"Magistrala 01",
        "corridor_type": "radial",
        "ordered_segment_refs": [],
        "no_point_ref": None,
        "tags": [],
        "meta": {},
    })
    created.append(corridor_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "LOGICAL_VIEWS_UPDATED", "element_id": corridor_ref})

    return _response(
        new_enm,
        created=created,
        selection_id=substation_ref,
        selection_type="substation",
        audit=audit,
        events=events,
    )


# ---------------------------------------------------------------------------
# 2. continue_trunk_segment_sn
# ---------------------------------------------------------------------------


def continue_trunk_segment_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Kontynuuj magistralę SN — dodaj kolejny odcinek."""
    trunk_id = payload.get("trunk_id")
    from_terminal_id = payload.get("from_terminal_id")
    segment = payload.get("segment", {})

    # Auto-detect from_terminal_id: find the last bus on the trunk
    if not from_terminal_id:
        from_terminal_id = _auto_detect_trunk_end(enm, trunk_id)

    if not from_terminal_id:
        return _error_response("Brak identyfikatora terminala źródłowego.", "trunk.from_terminal_missing")

    # Validate from_terminal exists
    from_bus = None
    for b in enm.get("buses", []):
        if b.get("ref_id") == from_terminal_id:
            from_bus = b
            break
    if not from_bus:
        return _error_response(
            f"Szyna '{from_terminal_id}' nie istnieje.",
            "trunk.from_terminal_not_found",
        )

    rodzaj = segment.get("rodzaj", "KABEL")
    dlugosc_m = segment.get("dlugosc_m") or payload.get("dlugosc_m") or 0
    if dlugosc_m <= 0:
        return _error_response(
            "Brak długości odcinka magistrali (dlugosc_m). "
            "Podaj jawną wartość > 0.",
            "trunk.dlugosc_missing",
        )

    catalog_ref = segment.get("catalog_ref")
    # Bramka katalogowa (ENM) — segment SN WYMAGA catalog_ref
    catalog_binding = segment.get("catalog_binding") or payload.get("catalog_binding")
    if not catalog_ref and not catalog_binding:
        return _error_response(
            "Odcinek SN wymaga powiązania z katalogiem. "
            "Podaj catalog_ref lub catalog_binding w payload segmentu.",
            "catalog.ref_required",
        )
    # Wyciagnij catalog_ref z catalog_binding jesli nie podano bezposrednio
    if not catalog_ref and catalog_binding:
        catalog_ref = catalog_binding.get("item_id") if isinstance(catalog_binding, dict) else None
    segment_name = segment.get("name")

    seed = _compute_seed({
        "op": "continue_trunk",
        "trunk_id": trunk_id or "",
        "from": from_terminal_id,
        "rodzaj": rodzaj,
        "dlugosc_m": dlugosc_m,
    })
    new_bus_ref = f"bus/{seed}/downstream"
    branch_ref = f"seg/{seed}/segment"

    new_enm = copy.deepcopy(enm)
    created = []
    events = []
    audit = []
    ev_seq = 0

    # Create downstream bus — napięcie z szyny źródłowej (topologiczne)
    voltage_kv = from_bus.get("voltage_kv")
    if not voltage_kv or voltage_kv <= 0:
        return _error_response(
            f"Szyna źródłowa '{from_terminal_id}' nie ma napięcia znamionowego.",
            "trunk.from_bus_voltage_missing",
        )
    result = create_node(new_enm, {
        "ref_id": new_bus_ref,
        "name": segment_name or f"Szyna {new_bus_ref[-8:]}",
        "voltage_kv": voltage_kv,
    })
    if not result.success:
        return _error_response(
            f"Nie udało się utworzyć szyny: {result.issues[0].message_pl if result.issues else '?'}",
            "trunk.bus_creation_failed",
        )
    new_enm = result.enm
    created.append(new_bus_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "BUS_CREATED", "element_id": new_bus_ref})

    # Create branch (cable or overhead line)
    branch_type = "cable" if rodzaj == "KABEL" else "line_overhead"
    branch_data: dict[str, Any] = {
        "ref_id": branch_ref,
        "name": segment_name or f"Odcinek {branch_ref[-8:]}",
        "type": branch_type,
        "from_bus_ref": from_terminal_id,
        "to_bus_ref": new_bus_ref,
        "length_km": dlugosc_m / 1000.0,
        "r_ohm_per_km": 0.0,
        "x_ohm_per_km": 0.0,
        "status": "closed",
        "source_mode": "KATALOG",
        "catalog_namespace": "KABEL_SN" if branch_type == "cable" else "LINIA_SN",
    }
    if catalog_ref:
        branch_data["catalog_ref"] = catalog_ref

    result = create_branch(new_enm, branch_data)
    if not result.success:
        return _error_response(
            f"Nie udało się utworzyć odcinka: {result.issues[0].message_pl if result.issues else '?'}",
            "trunk.segment_creation_failed",
        )
    new_enm = result.enm
    created.append(branch_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "BRANCH_CREATED", "element_id": branch_ref})
    audit.append({"step": ev_seq, "action": "Utworzono odcinek magistrali", "element_id": branch_ref})

    # Update corridor (auto-detect if not specified)
    effective_trunk_id = trunk_id
    if not effective_trunk_id:
        corridors = new_enm.get("corridors", [])
        if corridors:
            effective_trunk_id = corridors[0].get("ref_id")

    if effective_trunk_id:
        for c in new_enm.get("corridors", []):
            if c.get("ref_id") == effective_trunk_id:
                c.setdefault("ordered_segment_refs", []).append(branch_ref)
                break
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "LOGICAL_VIEWS_UPDATED", "element_id": effective_trunk_id})

    return _response(
        new_enm,
        created=created,
        selection_id=new_bus_ref,
        selection_type="bus",
        audit=audit,
        events=events,
    )


# ---------------------------------------------------------------------------
# 3. insert_station_on_segment_sn (CRITICAL OPERATION)
# ---------------------------------------------------------------------------


def insert_station_on_segment_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Wstaw stację SN/nN w odcinek — operacja krytyczna.

    Algorytm:
    0. Walidacja wejścia
    1. Odczyt topologii segmentu
    2. Rozdzielenie segmentu na dwa
    3. Utworzenie bloku stacji (podgraf)
    4. Podłączenie stacji
    5. Gotowość i FixActions
    6. Zwrot odpowiedzi
    """
    segment_id = payload.get("segment_id") or payload.get("segment_ref")
    insert_at = payload.get("insert_at", {})
    station = payload.get("station", {})
    sn_fields_raw = payload.get("sn_fields", [])
    transformer = payload.get("transformer", {})
    nn_block = payload.get("nn_block", {})

    # Normalize sn_fields: accept list of strings or list of dicts
    _role_str_map = {
        "IN": "LINIA_IN",
        "OUT": "LINIA_OUT",
        "FEEDER": "LINIA_ODG",
        "TR": "TRANSFORMATOROWE",
        "COUPLER": "SPRZEGLO",
    }
    sn_fields: list[dict[str, Any]] = []
    for item in sn_fields_raw:
        if isinstance(item, str):
            sn_fields.append({"field_role": _role_str_map.get(item, item)})
        else:
            sn_fields.append(item)

    # --- Krok 0: Walidacja wejścia ---
    if not segment_id:
        return _error_response("Brak identyfikatora odcinka.", "station.insert.segment_missing")

    segment = _find_branch(enm, segment_id)
    if not segment:
        return _error_response(
            f"Odcinek '{segment_id}' nie istnieje.",
            "station.insert.segment_missing",
        )

    seg_type = segment.get("type", "")
    if seg_type not in ("cable", "line_overhead"):
        return _error_response(
            f"Odcinek '{segment_id}' nie jest typu SN (typ: {seg_type}).",
            "topology.segment_not_sn",
        )

    # Accept station_type from station dict OR root payload.
    # Supports both legacy shorthand (A/B/C/D) and semantic labels.
    _SEMANTIC_TO_LEGACY: dict[str, str] = {
        "inline": "B",       # Stacja przelotowa → typ B (IN+OUT+TR)
        "branch": "C",       # Stacja odgałęźna → typ C (IN+OUT+BRANCH+TR)
        "terminal": "A",     # Stacja końcowa → typ A (liść)
        "sectional": "D",    # Stacja sekcyjna → typ D (ze sprzęgłem)
    }
    _SUBSTATION_TYPE_MAP: dict[str, str] = {
        "A": "mv_lv",
        "B": "inline",
        "C": "branch",
        "D": "sectional",
        "inline": "inline",
        "branch": "branch",
        "terminal": "terminal",
        "sectional": "sectional",
    }
    station_type_raw = station.get("station_type") or payload.get("station_type", "")
    # Map semantic → legacy for internal logic
    station_type = _SEMANTIC_TO_LEGACY.get(station_type_raw, station_type_raw)
    if station_type not in ("A", "B", "C", "D"):
        return _error_response(
            f"Typ stacji '{station_type_raw}' jest nieprawidłowy. "
            "Wymagane: A, B, C, D, inline, branch, terminal lub sectional.",
            "station.insert.station_type_invalid",
        )
    # The semantic station_type stored in substation record
    substation_semantic_type = _SUBSTATION_TYPE_MAP.get(station_type_raw, "mv_lv")

    # Validate insert_at
    insert_mode = insert_at.get("mode", "RATIO")
    insert_value = insert_at.get("value", 0.5)
    if insert_mode == "RATIO":
        insert_value = _quantize_ratio(float(insert_value))
        if insert_value < 0.0 or insert_value > 1.0:
            return _error_response(
                f"Współczynnik podziału {insert_value} poza zakresem [0, 1].",
                "station.insert.insert_at_invalid",
            )
    elif insert_mode == "ODLEGLOSC_OD_POCZATKU_M":
        if float(insert_value) < 0:
            return _error_response(
                "Odległość od początku musi być >= 0.",
                "station.insert.insert_at_invalid",
            )

    # Napięcia — topologiczne dziedziczenie z segmentu, brak domyślnych
    sn_voltage_kv = station.get("sn_voltage_kv")
    nn_voltage_kv = station.get("nn_voltage_kv")

    if not sn_voltage_kv or sn_voltage_kv <= 0:
        from_ref = segment.get("from_bus_ref")
        for b in enm.get("buses", []):
            if b.get("ref_id") == from_ref:
                sn_voltage_kv = b.get("voltage_kv")
                break
        if not sn_voltage_kv or sn_voltage_kv <= 0:
            return _error_response(
                "Brak napięcia SN stacji. Podaj sn_voltage_kv lub upewnij się, "
                "że szyna źródłowa segmentu ma zdefiniowane napięcie.",
                "station.insert.sn_voltage_missing",
            )

    if not nn_voltage_kv or nn_voltage_kv <= 0:
        return _error_response(
            "Brak napięcia nN stacji. Podaj nn_voltage_kv.",
            "station.insert.nn_voltage_missing",
        )

    # --- Krok 1: Topologia segmentu ---
    from_bus_ref = segment.get("from_bus_ref")
    to_bus_ref = segment.get("to_bus_ref")
    length_km = segment.get("length_km", 1.0)
    catalog_ref = segment.get("catalog_ref")

    # --- Compute deterministic seed ---
    station_seed = _compute_seed({
        "segment_id": segment_id,
        "insert_at": {"mode": insert_mode, "value": insert_value},
        "station_type": station_type,
    })

    # --- Element IDs ---
    stn_id = _make_id("stn", station_seed, "station")
    sn_bus_id = _make_id("stn", station_seed, "sn_bus")
    nn_bus_id = _make_id("stn", station_seed, "nn_bus")
    tr_id = _make_id("stn", station_seed, "transformer")
    nn_main_id = _make_id("stn", station_seed, "nn_main_breaker")
    seg_left_id = f"{segment_id}_L"
    seg_right_id = f"{segment_id}_R"

    new_enm = copy.deepcopy(enm)
    created = []
    deleted = []
    updated = []
    events = []
    audit = []
    ev_seq = 0

    # --- Krok 2: Rozdzielenie segmentu na dwa ---
    if insert_mode == "RATIO":
        ratio = float(insert_value)
    elif insert_mode == "ODLEGLOSC_OD_POCZATKU_M":
        total_m = length_km * 1000.0
        ratio = float(insert_value) / total_m if total_m > 0 else 0.5
    else:
        ratio = 0.5

    left_length = length_km * ratio
    right_length = length_km * (1.0 - ratio)

    # Delete old segment
    del_result = delete_branch(new_enm, segment_id)
    if not del_result.success:
        return _error_response(
            f"Nie udało się usunąć segmentu: {del_result.issues[0].message_pl if del_result.issues else '?'}",
            "station.insert.segment_delete_failed",
        )
    new_enm = del_result.enm
    deleted.append(segment_id)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "SEGMENT_SPLIT", "element_id": segment_id})

    # Create SN bus (insertion point)
    result = create_node(new_enm, {
        "ref_id": sn_bus_id,
        "name": station.get("station_name") or f"Szyna SN stacji",
        "voltage_kv": sn_voltage_kv,
    })
    if not result.success:
        return _error_response(
            f"Nie udało się utworzyć szyny SN: {result.issues[0].message_pl if result.issues else '?'}",
            "station.insert.sn_bus_failed",
        )
    new_enm = result.enm
    created.append(sn_bus_id)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "CUT_NODE_CREATED", "element_id": sn_bus_id})

    # Create left segment
    left_data: dict[str, Any] = {
        "ref_id": seg_left_id,
        "name": f"Odcinek {seg_left_id}",
        "type": seg_type,
        "from_bus_ref": from_bus_ref,
        "to_bus_ref": sn_bus_id,
        "length_km": left_length,
        "r_ohm_per_km": segment.get("r_ohm_per_km", 0.0),
        "x_ohm_per_km": segment.get("x_ohm_per_km", 0.0),
        "status": "closed",
    }
    if catalog_ref:
        left_data["catalog_ref"] = catalog_ref
    result = create_branch(new_enm, left_data)
    if not result.success:
        return _error_response(
            "Nie udało się utworzyć lewego odcinka.", "station.insert.left_segment_failed")
    new_enm = result.enm
    created.append(seg_left_id)

    # Create right segment
    right_data: dict[str, Any] = {
        "ref_id": seg_right_id,
        "name": f"Odcinek {seg_right_id}",
        "type": seg_type,
        "from_bus_ref": sn_bus_id,
        "to_bus_ref": to_bus_ref,
        "length_km": right_length,
        "r_ohm_per_km": segment.get("r_ohm_per_km", 0.0),
        "x_ohm_per_km": segment.get("x_ohm_per_km", 0.0),
        "status": "closed",
    }
    if catalog_ref:
        right_data["catalog_ref"] = catalog_ref
    result = create_branch(new_enm, right_data)
    if not result.success:
        return _error_response(
            "Nie udało się utworzyć prawego odcinka.", "station.insert.right_segment_failed")
    new_enm = result.enm
    created.append(seg_right_id)

    audit.append({"step": ev_seq, "action": "Podzielono odcinek na dwa", "element_id": segment_id})

    # --- Krok 3: Blok stacji ---
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "STATION_CREATED", "element_id": stn_id})

    # Create Substation — use semantic type (inline/branch/terminal/sectional/mv_lv)
    new_enm.setdefault("substations", []).append({
        "ref_id": stn_id,
        "name": station.get("station_name") or payload.get("name") or f"Stacja {station_type_raw or station_type}",
        "station_type": substation_semantic_type,
        "bus_refs": [sn_bus_id],
        "transformer_refs": [],
        "tags": [],
        "meta": {"station_type_sn": station_type, "station_type_semantic": station_type_raw},
    })
    created.append(stn_id)

    # Create SN Bays (fields)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "PORTS_CREATED", "element_id": stn_id})
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "FIELDS_CREATED_SN", "element_id": stn_id})

    bay_ids = []
    for idx, field_spec in enumerate(sorted(sn_fields, key=lambda f: f.get("field_role", ""))):
        bay_ref = _make_id("stn", station_seed, f"sn_field/{idx:03d}")
        role_map = {
            "LINIA_IN": "IN",
            "LINIA_OUT": "OUT",
            "LINIA_ODG": "FEEDER",
            "TRANSFORMATOROWE": "TR",
            "SPRZEGLO": "COUPLER",
        }
        bay_role = role_map.get(field_spec.get("field_role", ""), "FEEDER")
        new_enm.setdefault("bays", []).append({
            "ref_id": bay_ref,
            "name": f"Pole {field_spec.get('field_role', '')} {idx + 1}",
            "bay_role": bay_role,
            "substation_ref": stn_id,
            "bus_ref": sn_bus_id,
            "equipment_refs": [],
            "protection_ref": None,
            "tags": [],
            "meta": {"apparatus_plan": field_spec.get("apparatus_plan", [])},
        })
        bay_ids.append(bay_ref)
        created.append(bay_ref)

    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "DEVICES_CREATED_SN", "element_id": stn_id})

    # --- Create nN bus ---
    result = create_node(new_enm, {
        "ref_id": nn_bus_id,
        "name": f"Szyna nN stacji",
        "voltage_kv": nn_voltage_kv,
    })
    if not result.success:
        return _error_response(
            "Nie udało się utworzyć szyny nN.", "station.insert.nn_bus_failed")
    new_enm = result.enm
    created.append(nn_bus_id)

    # Update substation bus_refs
    for sub in new_enm.get("substations", []):
        if sub.get("ref_id") == stn_id:
            sub["bus_refs"].append(nn_bus_id)
            break

    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "BUS_NN_CREATED", "element_id": nn_bus_id})

    # --- Create Transformer ---
    if transformer.get("create", True):
        tr_catalog = transformer.get("transformer_catalog_ref")
        tr_catalog_binding = transformer.get("catalog_binding") or payload.get("catalog_binding")
        # Bramka katalogowa (ENM) — transformator WYMAGA catalog_ref
        if not tr_catalog and not tr_catalog_binding:
            return _error_response(
                "Transformator SN/nN wymaga powiązania z katalogiem. "
                "Podaj transformer_catalog_ref lub catalog_binding w payload transformatora.",
                "catalog.ref_required",
            )
        if not tr_catalog and tr_catalog_binding:
            tr_catalog = (
                tr_catalog_binding.get("item_id")
                if isinstance(tr_catalog_binding, dict) else None
            )
        tr_data = {
            "device_type": "transformer",
            "ref_id": tr_id,
            "name": f"Transformator SN/nN",
            "hv_bus_ref": sn_bus_id,
            "lv_bus_ref": nn_bus_id,
            "sn_mva": 0.001,  # Wartosc inicjalna — materializacja z katalogu
            "uhv_kv": sn_voltage_kv,
            "ulv_kv": nn_voltage_kv,
            "uk_percent": 0.01,  # Wartosc inicjalna — materializacja z katalogu
            "pk_kw": 0.0,
        }
        if tr_catalog:
            tr_data["catalog_ref"] = tr_catalog

        result = create_device(new_enm, tr_data)
        if not result.success:
            return _error_response(
                "Nie udało się utworzyć transformatora.", "station.insert.transformer_failed")
        new_enm = result.enm
        created.append(tr_id)

        # Update substation
        for sub in new_enm.get("substations", []):
            if sub.get("ref_id") == stn_id:
                sub["transformer_refs"].append(tr_id)
                break

        ev_seq += 1
        events.append({"event_seq": ev_seq, "event_type": "TR_CREATED", "element_id": tr_id})

    # --- nN Feeders ---
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "FIELDS_CREATED_NN", "element_id": nn_bus_id})

    # Main breaker nN
    nn_main_data: dict[str, Any] = {
        "ref_id": nn_main_id,
        "name": "Wyłącznik główny nN",
        "type": "breaker",
        "from_bus_ref": nn_bus_id,
        "to_bus_ref": nn_bus_id,
        "status": "closed",
    }
    # NOTE: Self-loop breaker is modeled as a bay, not a branch
    new_enm.setdefault("bays", []).append({
        "ref_id": nn_main_id,
        "name": "Wyłącznik główny nN",
        "bay_role": "IN",
        "substation_ref": stn_id,
        "bus_ref": nn_bus_id,
        "equipment_refs": [],
        "protection_ref": None,
        "tags": ["nn_main_breaker"],
        "meta": {},
    })
    created.append(nn_main_id)

    # Outgoing feeders nN
    feeders = nn_block.get("outgoing_feeders_nn", [])
    feeder_count = nn_block.get("outgoing_feeders_nn_count", max(1, len(feeders)))
    for idx in range(max(feeder_count, len(feeders))):
        feeder_ref = _make_id("stn", station_seed, f"nn_feeder/{idx:03d}")
        feeder_spec = feeders[idx] if idx < len(feeders) else {}
        new_enm.setdefault("bays", []).append({
            "ref_id": feeder_ref,
            "name": f"Odpływ nN {idx + 1}",
            "bay_role": "FEEDER",
            "substation_ref": stn_id,
            "bus_ref": nn_bus_id,
            "equipment_refs": [],
            "protection_ref": None,
            "tags": [],
            "meta": {"feeder_role": feeder_spec.get("feeder_role", "ODPLYW_NN")},
        })
        created.append(feeder_ref)

    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "DEVICES_CREATED_NN", "element_id": nn_bus_id})

    # --- Krok 4: Aktualizacja magistrali ---
    corridor = _find_corridor_for_segment(enm, segment_id)
    if corridor:
        for c in new_enm.get("corridors", []):
            if c.get("ref_id") == corridor.get("ref_id"):
                segments = c.get("ordered_segment_refs", [])
                if segment_id in segments:
                    idx = segments.index(segment_id)
                    segments[idx:idx + 1] = [seg_left_id, seg_right_id]
                break

    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "RECONNECTED_GRAPH", "element_id": stn_id})
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "LOGICAL_VIEWS_UPDATED", "element_id": stn_id})

    audit.append({"step": ev_seq, "action": f"Wstawiono stację typ {station_type}", "element_id": stn_id})

    return _response(
        new_enm,
        created=created,
        deleted=deleted,
        selection_id=stn_id,
        selection_type="substation",
        audit=audit,
        events=events,
    )


# ---------------------------------------------------------------------------
# 4. insert_branch_point_on_segment_sn
# ---------------------------------------------------------------------------


def _insert_branch_point_on_segment_sn(
    enm: dict[str, Any],
    payload: dict[str, Any],
    *,
    branch_point_type: str,
) -> dict[str, Any]:
    segment_id = payload.get("segment_id") or payload.get("segment_ref")
    if not segment_id:
        return _error_response("Brak identyfikatora odcinka.", "branch_point.segment_missing")

    segment = _find_branch(enm, segment_id)
    if not segment:
        return _error_response(f"Odcinek '{segment_id}' nie istnieje.", "branch_point.segment_not_found")

    seg_type = segment.get("type")
    if branch_point_type == "branch_pole" and seg_type != "line_overhead":
        return _error_response(
            "Słup rozgałęźny można osadzić wyłącznie na linii napowietrznej.",
            "branch_point.invalid_parent_medium",
        )
    if branch_point_type == "zksn" and seg_type != "cable":
        return _error_response(
            "ZKSN można osadzić wyłącznie na odcinku kablowym.",
            "branch_point.invalid_parent_medium",
        )

    # Bramka katalogowa — punkt rozgałęzienia WYMAGA catalog_ref PRZED utworzeniem
    bp_catalog_ref = payload.get("catalog_ref")
    bp_catalog_binding = payload.get("catalog_binding")
    if not bp_catalog_ref and not bp_catalog_binding:
        type_label = "Słup rozgałęźny" if branch_point_type == "branch_pole" else "ZKSN"
        return _error_response(
            f"{type_label} SN wymaga powiązania z katalogiem. "
            "Podaj catalog_ref lub catalog_binding w payload.",
            "catalog.ref_required",
        )
    if not bp_catalog_ref and bp_catalog_binding:
        bp_catalog_ref = (
            bp_catalog_binding.get("item_id")
            if isinstance(bp_catalog_binding, dict) else None
        )

    insert_at = payload.get("insert_at", {"mode": "RATIO", "value": 0.5})
    length_km = float(segment.get("length_km", 0.0))
    ratio = float(insert_at.get("value", 0.5))
    if insert_at.get("mode") == "ODLEGLOSC_OD_POCZATKU_M":
        ratio = float(insert_at.get("value", 0.0)) / (length_km * 1000.0) if length_km > 0 else 0.5
    ratio = _quantize_ratio(max(0.0, min(1.0, ratio)))

    seed = _compute_seed({
        "op": f"insert_{branch_point_type}",
        "segment_id": segment_id,
        "ratio": ratio,
        "branch_ports_count": payload.get("branch_ports_count", 2 if branch_point_type == "zksn" else 1),
    })
    bp_ref = _make_id("bp", seed, branch_point_type)
    bp_bus_ref = _make_id("bp", seed, "bus")
    seg_left_id = f"{segment_id}_L_{branch_point_type}"
    seg_right_id = f"{segment_id}_R_{branch_point_type}"

    new_enm = copy.deepcopy(enm)
    created: list[str] = []
    deleted: list[str] = []

    from_bus_ref = segment.get("from_bus_ref")
    to_bus_ref = segment.get("to_bus_ref")
    left_length = length_km * ratio
    right_length = length_km * (1.0 - ratio)

    del_result = delete_branch(new_enm, segment_id)
    if not del_result.success:
        return _error_response("Nie udało się podzielić odcinka.", "branch_point.segment_split_failed")
    new_enm = del_result.enm
    deleted.append(segment_id)

    bus_voltage = None
    for b in enm.get("buses", []):
        if b.get("ref_id") == from_bus_ref:
            bus_voltage = b.get("voltage_kv")
            break
    if not bus_voltage:
        return _error_response("Nie można ustalić napięcia punktu rozgałęzienia.", "branch_point.voltage_missing")

    node_res = create_node(new_enm, {
        "ref_id": bp_bus_ref,
        "name": payload.get("name") or ("Słup rozgałęźny" if branch_point_type == "branch_pole" else "ZKSN"),
        "voltage_kv": bus_voltage,
    })
    if not node_res.success:
        return _error_response("Nie udało się utworzyć punktu rozgałęzienia.", "branch_point.bus_creation_failed")
    new_enm = node_res.enm
    created.append(bp_bus_ref)

    for seg_id, seg_from, seg_to, seg_len in (
        (seg_left_id, from_bus_ref, bp_bus_ref, left_length),
        (seg_right_id, bp_bus_ref, to_bus_ref, right_length),
    ):
        seg_data: dict[str, Any] = {
            "ref_id": seg_id,
            "name": f"Odcinek {seg_id}",
            "type": seg_type,
            "from_bus_ref": seg_from,
            "to_bus_ref": seg_to,
            "length_km": seg_len,
            "r_ohm_per_km": segment.get("r_ohm_per_km", 0.0),
            "x_ohm_per_km": segment.get("x_ohm_per_km", 0.0),
            "status": "closed",
            "catalog_ref": segment.get("catalog_ref"),
        }
        branch_res = create_branch(new_enm, seg_data)
        if not branch_res.success:
            return _error_response("Nie udało się odtworzyć geometrii segmentu.", "branch_point.segment_rebuild_failed")
        new_enm = branch_res.enm
        created.append(seg_id)

    branch_ports_count = int(payload.get("branch_ports_count", 2 if branch_point_type == "zksn" else 1))
    branch_port_bus_refs: list[str] = []
    for idx in range(branch_ports_count):
        port_bus = _make_id("bp", seed, f"branch_bus_{idx+1}")
        port_res = create_node(new_enm, {
            "ref_id": port_bus,
            "name": f"Port odgałęźny {idx+1}",
            "voltage_kv": bus_voltage,
        })
        if not port_res.success:
            return _error_response("Nie udało się utworzyć portu BRANCH.", "branch_point.required_port_missing")
        new_enm = port_res.enm
        created.append(port_bus)
        branch_port_bus_refs.append(port_bus)

    # bp_catalog_ref already validated above (cannot be None here)
    completeness = "KOMPLETNY"
    new_enm.setdefault("branch_points", []).append({
        "ref_id": bp_ref,
        "name": payload.get("name") or ("Słup rozgałęźny SN" if branch_point_type == "branch_pole" else "ZKSN SN"),
        "branch_point_type": branch_point_type,
        "parent_segment_id": segment_id,
        "bus_ref": bp_bus_ref,
        "catalog_ref": bp_catalog_ref,
        "catalog_namespace": payload.get("catalog_namespace") or "mv_branch_points",
        "catalog_version": payload.get("catalog_version"),
        "source_mode": payload.get("source_mode") or "KATALOG",
        "ports": {
            "MAIN_IN": from_bus_ref,
            "MAIN_OUT": to_bus_ref,
            "BRANCH": branch_port_bus_refs,
        },
        "branch_occupied": {},
        "switch_state": payload.get("switch_state"),
        "materialized_params": payload.get("materialized_params"),
        "completeness_status": completeness,
        "runtime_inputs": {
            "name": payload.get("name"),
            "branch_ports_count": branch_ports_count,
            "insert_at": insert_at,
        },
    })
    created.append(bp_ref)

    for c in new_enm.get("corridors", []):
        refs = c.get("ordered_segment_refs", [])
        if segment_id in refs:
            idx = refs.index(segment_id)
            c["ordered_segment_refs"] = refs[:idx] + [seg_left_id, seg_right_id] + refs[idx + 1:]
            break

    return _response(
        new_enm,
        created=created,
        deleted=deleted,
        selection_id=bp_ref,
        selection_type=branch_point_type,
        events=[{"event_seq": 1, "event_type": "BRANCH_POINT_CREATED", "element_id": bp_ref}],
    )


def insert_branch_pole_on_segment_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    return _insert_branch_point_on_segment_sn(enm, payload, branch_point_type="branch_pole")


def insert_zksn_on_segment_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    return _insert_branch_point_on_segment_sn(enm, payload, branch_point_type="zksn")


# ---------------------------------------------------------------------------
# 5. start_branch_segment_sn
# ---------------------------------------------------------------------------


def start_branch_segment_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Dodaj odgałęzienie SN z istniejącej szyny.

    Wymaga jawnego from_bus_ref — brak auto-detekcji.
    """
    from_bus_ref = payload.get("from_bus_ref")
    from_ref = payload.get("from_ref")
    segment = payload.get("segment", {})

    if not from_bus_ref and from_ref:
        resolved_bus_ref, err_code = _resolve_branch_from_ref(enm, from_ref)
        if err_code:
            return _error_response("Nieprawidłowe źródło odgałęzienia.", err_code)
        from_bus_ref = resolved_bus_ref
    if not from_bus_ref:
        return _error_response(
            "Brak identyfikatora szyny źródłowej (from_bus_ref/from_ref). "
            "Kliknij port BRANCH na stacji, słupie lub ZKSN w SLD.",
            "branch.from_bus_missing",
        )

    from_bus = None
    for b in enm.get("buses", []):
        if b.get("ref_id") == from_bus_ref:
            from_bus = b
            break
    if not from_bus:
        return _error_response(f"Szyna '{from_bus_ref}' nie istnieje.", "branch.from_bus_not_found")

    rodzaj = segment.get("rodzaj", "KABEL")
    dlugosc_m = segment.get("dlugosc_m") or payload.get("dlugosc_m") or 0
    if dlugosc_m <= 0:
        return _error_response(
            "Brak długości odcinka odgałęzienia (dlugosc_m). "
            "Podaj jawną wartość > 0.",
            "branch.dlugosc_missing",
        )

    # Bramka katalogowa (ENM) — segment odgalezienia WYMAGA catalog_ref
    branch_catalog_ref = segment.get("catalog_ref")
    branch_catalog_binding = segment.get("catalog_binding") or payload.get("catalog_binding")
    if not branch_catalog_ref and not branch_catalog_binding:
        return _error_response(
            "Odcinek odgałęzienia SN wymaga powiązania z katalogiem. "
            "Podaj catalog_ref lub catalog_binding w payload segmentu.",
            "catalog.ref_required",
        )
    if not branch_catalog_ref and branch_catalog_binding:
        branch_catalog_ref = (
            branch_catalog_binding.get("item_id")
            if isinstance(branch_catalog_binding, dict) else None
        )

    seed = _compute_seed({
        "op": "start_branch",
        "from": from_bus_ref,
        "rodzaj": rodzaj,
        "dlugosc_m": dlugosc_m,
    })
    new_bus_ref = f"bus/{seed}/branch_end"
    branch_ref = f"seg/{seed}/branch_segment"

    new_enm = copy.deepcopy(enm)
    created = []
    events = []
    ev_seq = 0

    voltage_kv = from_bus.get("voltage_kv")
    if not voltage_kv or voltage_kv <= 0:
        return _error_response(
            f"Szyna źródłowa '{from_bus_ref}' nie ma napięcia znamionowego.",
            "branch.from_bus_voltage_missing",
        )
    result = create_node(new_enm, {
        "ref_id": new_bus_ref,
        "name": f"Szyna odgałęzienia",
        "voltage_kv": voltage_kv,
    })
    if not result.success:
        return _error_response("Nie udało się utworzyć szyny.", "branch.bus_creation_failed")
    new_enm = result.enm
    created.append(new_bus_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "BUS_CREATED", "element_id": new_bus_ref})

    branch_type = "cable" if rodzaj == "KABEL" else "line_overhead"
    branch_data: dict[str, Any] = {
        "ref_id": branch_ref,
        "name": f"Odgałęzienie",
        "type": branch_type,
        "from_bus_ref": from_bus_ref,
        "to_bus_ref": new_bus_ref,
        "length_km": dlugosc_m / 1000.0,
        "r_ohm_per_km": 0.0,
        "x_ohm_per_km": 0.0,
        "status": "closed",
        "source_mode": "KATALOG",
        "catalog_namespace": "KABEL_SN" if branch_type == "cable" else "LINIA_SN",
    }
    if branch_catalog_ref:
        branch_data["catalog_ref"] = branch_catalog_ref
    result = create_branch(new_enm, branch_data)
    if not result.success:
        return _error_response("Nie udało się utworzyć odgałęzienia.", "branch.creation_failed")
    new_enm = result.enm
    created.append(branch_ref)

    if from_ref and from_ref.startswith("bp/"):
        element_ref, port_id = from_ref.split(".", 1)
        for bp in new_enm.get("branch_points", []):
            if bp.get("ref_id") == element_ref:
                bp.setdefault("branch_occupied", {})[port_id] = branch_ref
                break

    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "BRANCH_CREATED", "element_id": branch_ref})

    return _response(new_enm, created=created, selection_id=new_bus_ref,
                      selection_type="bus", events=events)


# ---------------------------------------------------------------------------
# 5. insert_section_switch_sn
# ---------------------------------------------------------------------------


def insert_section_switch_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Wstaw łącznik sekcyjny w odcinek SN."""
    segment_id = payload.get("segment_id")
    insert_at = payload.get("insert_at", {"mode": "RATIO", "value": 0.5})
    switch_type = payload.get("switch_type", "ROZLACZNIK")
    normal_state = payload.get("normal_state", "closed")

    if not segment_id:
        return _error_response("Brak identyfikatora odcinka.", "switch.segment_missing")

    segment = _find_branch(enm, segment_id)
    if not segment:
        return _error_response(f"Odcinek '{segment_id}' nie istnieje.", "switch.segment_not_found")

    # Bramka katalogowa — łącznik SN WYMAGA catalog_ref aparatu PRZED utworzeniem
    switch_catalog_ref = payload.get("catalog_ref")
    switch_catalog_binding = payload.get("catalog_binding")
    if not switch_catalog_ref and not switch_catalog_binding:
        return _error_response(
            "Łącznik sekcyjny SN wymaga powiązania z katalogiem. "
            "Podaj catalog_ref lub catalog_binding aparatu w payload.",
            "catalog.ref_required",
        )
    if not switch_catalog_ref and switch_catalog_binding:
        switch_catalog_ref = (
            switch_catalog_binding.get("item_id")
            if isinstance(switch_catalog_binding, dict) else None
        )

    from_bus_ref = segment.get("from_bus_ref")
    to_bus_ref = segment.get("to_bus_ref")
    length_km = segment.get("length_km", 1.0)
    seg_type = segment.get("type", "cable")

    insert_mode = insert_at.get("mode", "RATIO")
    insert_value = float(insert_at.get("value", 0.5))
    ratio = insert_value if insert_mode == "RATIO" else (
        insert_value / (length_km * 1000) if length_km > 0 else 0.5
    )

    seed = _compute_seed({
        "op": "insert_switch",
        "segment_id": segment_id,
        "ratio": ratio,
    })
    switch_bus_ref = f"bus/{seed}/switch_node"
    switch_ref = f"sw/{seed}/switch"
    seg_left_id = f"{segment_id}_SL"
    seg_right_id = f"{segment_id}_SR"

    new_enm = copy.deepcopy(enm)
    created = []
    deleted = []
    events = []
    ev_seq = 0

    # Delete old segment
    del_result = delete_branch(new_enm, segment_id)
    if not del_result.success:
        return _error_response("Nie udało się usunąć odcinka.", "switch.segment_delete_failed")
    new_enm = del_result.enm
    deleted.append(segment_id)

    # Create switch bus — napięcie z szyny źródłowej (topologiczne)
    voltage_kv = None
    for b in enm.get("buses", []):
        if b.get("ref_id") == from_bus_ref:
            voltage_kv = b.get("voltage_kv")
            break
    if not voltage_kv or voltage_kv <= 0:
        return _error_response(
            f"Szyna '{from_bus_ref}' nie ma napięcia znamionowego.",
            "switch.from_bus_voltage_missing",
        )

    result = create_node(new_enm, {
        "ref_id": switch_bus_ref,
        "name": f"Węzeł łącznika",
        "voltage_kv": voltage_kv,
    })
    if not result.success:
        return _error_response("Nie udało się utworzyć węzła.", "switch.bus_creation_failed")
    new_enm = result.enm
    created.append(switch_bus_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "SWITCH_INSERTED", "element_id": switch_ref})

    # Left segment
    left_length = length_km * ratio
    result = create_branch(new_enm, {
        "ref_id": seg_left_id,
        "name": f"Odcinek {seg_left_id}",
        "type": seg_type,
        "from_bus_ref": from_bus_ref,
        "to_bus_ref": switch_bus_ref,
        "length_km": left_length,
        "r_ohm_per_km": segment.get("r_ohm_per_km", 0.0),
        "x_ohm_per_km": segment.get("x_ohm_per_km", 0.0),
        "catalog_ref": segment.get("catalog_ref"),
        "status": "closed",
    })
    new_enm = result.enm
    created.append(seg_left_id)

    # Switch branch
    sw_type = "breaker" if switch_type == "WYLACZNIK" else "switch"
    result = create_branch(new_enm, {
        "ref_id": switch_ref,
        "name": payload.get("switch_name") or "Łącznik sekcyjny",
        "type": sw_type,
        "from_bus_ref": switch_bus_ref,
        "to_bus_ref": switch_bus_ref,
        "status": normal_state,
    })
    # Note: switch connecting same bus is a conceptual model
    # Actually switch connects between two adjacent nodes
    # Let's create another bus
    switch_bus2_ref = f"bus/{seed}/switch_node_2"
    result = create_node(new_enm, {
        "ref_id": switch_bus2_ref,
        "name": f"Węzeł łącznika 2",
        "voltage_kv": voltage_kv,
    })
    new_enm = result.enm
    created.append(switch_bus2_ref)

    # Redo: switch between two buses
    result = create_branch(new_enm, {
        "ref_id": switch_ref,
        "name": payload.get("switch_name") or "Łącznik sekcyjny",
        "type": sw_type,
        "from_bus_ref": switch_bus_ref,
        "to_bus_ref": switch_bus2_ref,
        "status": normal_state,
        "source_mode": "KATALOG",
        "catalog_namespace": "APARAT_SN",
        "catalog_ref": switch_catalog_ref,
    })
    if result.success:
        new_enm = result.enm
        created.append(switch_ref)

    # Right segment
    right_length = length_km * (1.0 - ratio)
    result = create_branch(new_enm, {
        "ref_id": seg_right_id,
        "name": f"Odcinek {seg_right_id}",
        "type": seg_type,
        "from_bus_ref": switch_bus2_ref,
        "to_bus_ref": to_bus_ref,
        "length_km": right_length,
        "r_ohm_per_km": segment.get("r_ohm_per_km", 0.0),
        "x_ohm_per_km": segment.get("x_ohm_per_km", 0.0),
        "catalog_ref": segment.get("catalog_ref"),
        "status": "closed",
    })
    new_enm = result.enm
    created.append(seg_right_id)

    # Update corridor
    corridor = _find_corridor_for_segment(enm, segment_id)
    if corridor:
        for c in new_enm.get("corridors", []):
            if c.get("ref_id") == corridor.get("ref_id"):
                segments = c.get("ordered_segment_refs", [])
                if segment_id in segments:
                    idx_seg = segments.index(segment_id)
                    segments[idx_seg:idx_seg + 1] = [seg_left_id, switch_ref, seg_right_id]
                break

    return _response(new_enm, created=created, deleted=deleted,
                      selection_id=switch_ref, selection_type="switch", events=events)


# ---------------------------------------------------------------------------
# 6. connect_secondary_ring_sn
# ---------------------------------------------------------------------------


def connect_secondary_ring_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Zamknij pierścień SN.

    Wymaga jawnych from_bus_ref i to_bus_ref — brak auto-detekcji.
    """
    from_bus_ref = payload.get("from_bus_ref")
    to_bus_ref = payload.get("to_bus_ref")
    segment = payload.get("segment", {})

    if not from_bus_ref:
        return _error_response(
            "Brak szyny początkowej pierścienia (from_bus_ref). "
            "Kliknij dwa końce magistrali w SLD.",
            "ring.from_bus_missing",
        )
    if not to_bus_ref:
        return _error_response(
            "Brak szyny końcowej pierścienia (to_bus_ref). "
            "Kliknij dwa końce magistrali w SLD.",
            "ring.to_bus_missing",
        )

    bus_refs = {b.get("ref_id") for b in enm.get("buses", [])}
    if from_bus_ref not in bus_refs:
        return _error_response(f"Szyna '{from_bus_ref}' nie istnieje.", "ring.from_not_found")
    if to_bus_ref not in bus_refs:
        return _error_response(f"Szyna '{to_bus_ref}' nie istnieje.", "ring.to_not_found")

    seed = _compute_seed({"op": "connect_ring", "from": from_bus_ref, "to": to_bus_ref})
    ring_ref = f"seg/{seed}/ring_closure"

    new_enm = copy.deepcopy(enm)
    created = []
    events = []
    ev_seq = 0

    rodzaj = segment.get("rodzaj", "KABEL")
    dlugosc_m = segment.get("dlugosc_m") or 0
    if dlugosc_m <= 0:
        return _error_response(
            "Brak długości segmentu zamknięcia pierścienia (dlugosc_m). "
            "Podaj jawną wartość > 0.",
            "ring.dlugosc_missing",
        )

    # Bramka katalogowa (ENM) — segment pierscienia WYMAGA catalog_ref
    ring_catalog_ref = segment.get("catalog_ref")
    ring_catalog_binding = segment.get("catalog_binding") or payload.get("catalog_binding")
    if not ring_catalog_ref and not ring_catalog_binding:
        return _error_response(
            "Segment zamknięcia pierścienia wymaga powiązania z katalogiem. "
            "Podaj catalog_ref lub catalog_binding w payload segmentu.",
            "catalog.ref_required",
        )
    if not ring_catalog_ref and ring_catalog_binding:
        ring_catalog_ref = (
            ring_catalog_binding.get("item_id")
            if isinstance(ring_catalog_binding, dict) else None
        )

    branch_type = "cable" if rodzaj == "KABEL" else "line_overhead"
    ring_data: dict[str, Any] = {
        "ref_id": ring_ref,
        "name": payload.get("ring_name") or "Zamknięcie pierścienia",
        "type": branch_type,
        "from_bus_ref": from_bus_ref,
        "to_bus_ref": to_bus_ref,
        "length_km": dlugosc_m / 1000.0,
        "r_ohm_per_km": 0.0,
        "x_ohm_per_km": 0.0,
        "status": "closed",
    }
    if ring_catalog_ref:
        ring_data["catalog_ref"] = ring_catalog_ref
    result = create_branch(new_enm, ring_data)
    if not result.success:
        return _error_response("Nie udało się zamknąć pierścienia.", "ring.creation_failed")
    new_enm = result.enm
    created.append(ring_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "RING_CONNECTED", "element_id": ring_ref})

    # Update corridor type
    for c in new_enm.get("corridors", []):
        c["corridor_type"] = "ring"
        break  # First corridor becomes ring

    return _response(new_enm, created=created, selection_id=ring_ref,
                      selection_type="branch", events=events)


# ---------------------------------------------------------------------------
# 7. set_normal_open_point
# ---------------------------------------------------------------------------


def set_normal_open_point(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Ustaw punkt normalnie otwarty (NOP)."""
    switch_ref = payload.get("switch_ref") or payload.get("segment_ref")
    corridor_ref = payload.get("corridor_ref")

    if not switch_ref:
        return _error_response("Brak identyfikatora łącznika.", "nop.switch_missing")

    new_enm = copy.deepcopy(enm)
    updated = []
    events = []
    ev_seq = 0

    # Find and open switch
    found = False
    for b in new_enm.get("branches", []):
        if b.get("ref_id") == switch_ref:
            b["status"] = "open"
            found = True
            updated.append(switch_ref)
            break

    if not found:
        return _error_response(f"Łącznik '{switch_ref}' nie znaleziony.", "nop.switch_not_found")

    # Update corridor NOP
    if corridor_ref:
        for c in new_enm.get("corridors", []):
            if c.get("ref_id") == corridor_ref:
                c["no_point_ref"] = switch_ref
                updated.append(corridor_ref)
                break
    else:
        for c in new_enm.get("corridors", []):
            c["no_point_ref"] = switch_ref
            updated.append(c.get("ref_id", ""))
            break

    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "NOP_SET", "element_id": switch_ref})

    return _response(new_enm, updated=updated, selection_id=switch_ref,
                      selection_type="switch", events=events)


# ---------------------------------------------------------------------------
# 8. add_transformer_sn_nn
# ---------------------------------------------------------------------------


def add_transformer_sn_nn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Dodaj transformator SN/nN."""
    hv_bus_ref = payload.get("hv_bus_ref")
    lv_bus_ref = payload.get("lv_bus_ref")

    if not hv_bus_ref or not lv_bus_ref:
        return _error_response("Brak szyn HV/LV.", "transformer.buses_missing")

    # Bramka katalogowa (ENM) — transformator WYMAGA catalog_ref
    standalone_catalog = payload.get("transformer_catalog_ref")
    standalone_binding = payload.get("catalog_binding")
    if not standalone_catalog and not standalone_binding:
        return _error_response(
            "Transformator SN/nN wymaga powiązania z katalogiem. "
            "Podaj transformer_catalog_ref lub catalog_binding w payload.",
            "catalog.ref_required",
        )
    if not standalone_catalog and standalone_binding:
        standalone_catalog = (
            standalone_binding.get("item_id")
            if isinstance(standalone_binding, dict) else None
        )

    seed = _compute_seed({"op": "add_transformer", "hv": hv_bus_ref, "lv": lv_bus_ref})
    tr_ref = f"tr/{seed}/transformer"

    new_enm = copy.deepcopy(enm)
    created = []
    events = []
    ev_seq = 0

    # Napięcia z szyn (topologiczne), brak domyślnych parametrów
    hv_voltage = None
    lv_voltage = None
    for b in enm.get("buses", []):
        if b.get("ref_id") == hv_bus_ref:
            hv_voltage = b.get("voltage_kv")
        if b.get("ref_id") == lv_bus_ref:
            lv_voltage = b.get("voltage_kv")

    tr_data: dict[str, Any] = {
        "device_type": "transformer",
        "ref_id": tr_ref,
        "name": "Transformator SN/nN",
        "hv_bus_ref": hv_bus_ref,
        "lv_bus_ref": lv_bus_ref,
        "sn_mva": payload.get("sn_mva") or 0.0,
        "uhv_kv": payload.get("uhv_kv") or hv_voltage or 0.0,
        "ulv_kv": payload.get("ulv_kv") or lv_voltage or 0.0,
        "uk_percent": payload.get("uk_percent") or 0.0,
        "pk_kw": payload.get("pk_kw") or 0.0,
        "source_mode": "KATALOG",
        "catalog_namespace": "TRAFO_SN_NN",
    }
    if standalone_catalog:
        tr_data["catalog_ref"] = standalone_catalog
    if payload.get("station_ref"):
        for sub in new_enm.get("substations", []):
            if sub.get("ref_id") == payload["station_ref"]:
                sub.setdefault("transformer_refs", []).append(tr_ref)
                break

    result = create_device(new_enm, tr_data)
    if not result.success:
        return _error_response(
            f"Nie udało się utworzyć transformatora: {result.issues[0].message_pl if result.issues else '?'}",
            "transformer.creation_failed",
        )
    new_enm = result.enm
    created.append(tr_ref)
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "TRANSFORMER_CREATED", "element_id": tr_ref})

    return _response(new_enm, created=created, selection_id=tr_ref,
                      selection_type="transformer", events=events)


# ---------------------------------------------------------------------------
# 9. assign_catalog_to_element
# ---------------------------------------------------------------------------


def assign_catalog_to_element(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Przypisz katalog do elementu."""
    element_ref = payload.get("element_ref")
    catalog_item_id = payload.get("catalog_item_id") or payload.get("catalog_ref")

    if not element_ref:
        return _error_response("Brak identyfikatora elementu.", "catalog.element_missing")
    if not catalog_item_id:
        return _error_response("Brak identyfikatora katalogu.", "catalog.item_missing")

    loc = _find_element(enm, element_ref)
    if not loc:
        return _error_response(f"Element '{element_ref}' nie znaleziony.", "catalog.element_not_found")

    new_enm = copy.deepcopy(enm)
    coll, idx = loc
    new_enm[coll][idx]["catalog_ref"] = catalog_item_id
    new_enm[coll][idx]["parameter_source"] = "CATALOG"
    new_enm[coll][idx]["source_mode"] = payload.get("source_mode") or "MIGRACJA"
    if payload.get("catalog_namespace"):
        new_enm[coll][idx]["catalog_namespace"] = payload["catalog_namespace"]
    if payload.get("catalog_item_version"):
        new_enm[coll][idx].setdefault("meta", {})["catalog_item_version"] = payload["catalog_item_version"]

    return _response(
        new_enm,
        updated=[element_ref],
        selection_id=element_ref,
        events=[{"event_seq": 1, "event_type": "CATALOG_ASSIGNED", "element_id": element_ref}],
    )


# ---------------------------------------------------------------------------
# 10. update_element_parameters
# ---------------------------------------------------------------------------


def update_element_parameters(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Aktualizuj parametry elementu."""
    element_ref = payload.get("element_ref")
    parameters = payload.get("parameters", {})

    if not element_ref:
        return _error_response("Brak identyfikatora elementu.", "params.element_missing")
    if not parameters:
        return _error_response("Brak parametrów do aktualizacji.", "params.empty")

    loc = _find_element(enm, element_ref)
    if not loc:
        return _error_response(f"Element '{element_ref}' nie znaleziony.", "params.element_not_found")

    coll, idx = loc
    current_element = enm[coll][idx]

    generator_type = str(current_element.get("gen_type") or "").upper()
    generator_requires_catalog = (
        coll == "generators"
        and generator_type in {"PV_INVERTER", "WIND_INVERTER", "BESS", "BESS_INVERTER"}
    )
    catalog_guard_collections = {"branches", "transformers", "branch_points"}
    guarded_catalog_binding = coll in catalog_guard_collections or generator_requires_catalog
    if guarded_catalog_binding:
        if "catalog_ref" in parameters:
            catalog_ref = parameters.get("catalog_ref")
            if catalog_ref is None or (isinstance(catalog_ref, str) and not catalog_ref.strip()):
                return _error_response("Element fizyczny wymaga przypiętego katalogu.", "catalog.ref_required")

        effective_source_mode = parameters.get("source_mode", current_element.get("source_mode"))
        effective_namespace = parameters.get("catalog_namespace", current_element.get("catalog_namespace"))
        if effective_source_mode is not None or effective_namespace is not None:
            if effective_source_mode == "KATALOG" and not effective_namespace:
                return _error_response(
                    "Brak spójnego source_mode/catalog_namespace dla elementu fizycznego.",
                    "catalog.ref_required",
                )
            if effective_source_mode in {"MIGRACJA", "EKSPERCKI_RECZNY"} and effective_namespace:
                return _error_response(
                    "Brak spójnego source_mode/catalog_namespace dla elementu fizycznego.",
                    "catalog.ref_required",
                )

        if "materialized_params" in parameters:
            materialized = parameters.get("materialized_params")
            if effective_source_mode == "KATALOG":
                if not isinstance(materialized, dict) or not materialized:
                    return _error_response(
                        "materialized_params musi być kompletne dla source_mode=KATALOG.",
                        "catalog.ref_required",
                    )
                required_keys = {"branch_point_type", "parent_segment_id", "ports"}
                if coll == "branch_points" and not required_keys.issubset(materialized.keys()):
                    return _error_response(
                        "materialized_params dla punktu rozgałęzienia jest niekompletne.",
                        "catalog.ref_required",
                    )

    if coll in {"branches", "transformers", "branch_points", "generators"}:
        immutable_keys = {"ref_id", "id", "type"}
        allowlist_by_collection = {
            "branches": {
                "name", "status", "length_km", "r_ohm_per_km", "x_ohm_per_km",
                "b_siemens_per_km", "r0_ohm_per_km", "x0_ohm_per_km", "b0_siemens_per_km",
                "rating", "insulation", "catalog_ref", "parameter_source", "overrides",
                "meta", "source_mode", "catalog_namespace",
            },
            "transformers": {
                "name", "sn_mva", "uhv_kv", "ulv_kv", "uk_percent", "pk_kw", "p0_kw",
                "i0_percent", "vector_group", "hv_neutral", "lv_neutral", "tap_position",
                "tap_min", "tap_max", "tap_step_percent", "catalog_ref", "parameter_source",
                "overrides", "meta", "source_mode", "catalog_namespace",
            },
            "branch_points": {
                "name", "switch_state", "catalog_ref", "catalog_namespace", "catalog_version",
                "source_mode", "materialized_params", "completeness_status", "runtime_inputs",
                "branch_occupied", "ports", "meta",
            },
            "generators": {
                "name", "p_mw", "q_mvar", "catalog_ref", "quantity", "n_parallel",
                "parameter_source", "overrides", "limits", "connection_variant",
                "blocking_transformer_ref", "station_ref", "meta", "in_service",
            },
        }
        illegal_keys = sorted(
            key for key in parameters
            if key not in immutable_keys and key not in allowlist_by_collection[coll]
        )
        if illegal_keys:
            return _error_response(
                f"Niedozwolone pola aktualizacji dla '{coll}': {', '.join(illegal_keys)}.",
                "params.key_not_allowed",
            )

    new_enm = copy.deepcopy(enm)
    for key, value in parameters.items():
        if key not in ("ref_id", "id", "type"):
            new_enm[coll][idx][key] = value

    return _response(
        new_enm,
        updated=[element_ref],
        selection_id=element_ref,
        events=[{"event_seq": 1, "event_type": "PARAMETERS_UPDATED", "element_id": element_ref}],
    )


# ---------------------------------------------------------------------------
# refresh_snapshot — odczyt bez modyfikacji
# ---------------------------------------------------------------------------


def refresh_snapshot(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Zwróć pełną kopertę odpowiedzi bez modyfikacji modelu.

    Używane przez frontend po operacjach Wizard (PUT /enm) lub Topology
    w celu synchronizacji snapshotStore z bieżącym stanem ENM.
    Operacja nie mutuje ENM — zwraca readiness, logical_views, fix_actions.
    """
    return _response(enm)


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_HANDLERS: dict[str, Any] = {
    "add_grid_source_sn": add_grid_source_sn,
    "continue_trunk_segment_sn": continue_trunk_segment_sn,
    "insert_station_on_segment_sn": insert_station_on_segment_sn,
    "insert_branch_pole_on_segment_sn": insert_branch_pole_on_segment_sn,
    "insert_zksn_on_segment_sn": insert_zksn_on_segment_sn,
    "start_branch_segment_sn": start_branch_segment_sn,
    "insert_section_switch_sn": insert_section_switch_sn,
    "connect_secondary_ring_sn": connect_secondary_ring_sn,
    "set_normal_open_point": set_normal_open_point,
    "add_transformer_sn_nn": add_transformer_sn_nn,
    "assign_catalog_to_element": assign_catalog_to_element,
    "update_element_parameters": update_element_parameters,
    "refresh_snapshot": refresh_snapshot,
}


def execute_domain_operation(
    enm_dict: dict[str, Any],
    op_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Główny punkt wejścia — rozwiąż aliasy, wywołaj handler.

    Kanoniczne nazwy: patrz CANONICAL_OPS.
    Aliasy: patrz ALIAS_MAP.
    """
    canonical_name = ALIAS_MAP.get(op_name, op_name)

    if canonical_name not in _HANDLERS:
        return _error_response(
            f"Nieznana operacja: '{op_name}'. Dostępne: {', '.join(sorted(CANONICAL_OPS))}",
            "dispatcher.unknown_operation",
        )

    try:
        return _HANDLERS[canonical_name](enm_dict, payload)
    except Exception as exc:
        return _error_response(
            f"Nieobsłużony wyjątek w operacji '{canonical_name}': {exc}",
            "dispatcher.unhandled_exception",
        )


# ---------------------------------------------------------------------------
# V2 Integration — ochrona, Study Case, źródła nN, operacje uniwersalne
# ---------------------------------------------------------------------------

from .domain_operations_v2 import ALL_V2_HANDLERS, V2_CANONICAL_OPS  # noqa: E402

CANONICAL_OPS = CANONICAL_OPS | V2_CANONICAL_OPS
_HANDLERS.update(ALL_V2_HANDLERS)
