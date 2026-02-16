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
    "start_branch_segment_sn",
    "insert_section_switch_sn",
    "connect_secondary_ring_sn",
    "set_normal_open_point",
    "add_transformer_sn_nn",
    "assign_catalog_to_element",
    "update_element_parameters",
})

ALIAS_MAP: dict[str, str] = {
    "add_trunk_segment_sn": "continue_trunk_segment_sn",
    "add_branch_segment_sn": "start_branch_segment_sn",
    "start_branch_from_port": "start_branch_segment_sn",
    "insert_station_on_trunk_segment_sn": "insert_station_on_segment_sn",
    "insert_station_on_trunk_segment": "insert_station_on_segment_sn",
    "connect_ring_sn": "connect_secondary_ring_sn",
    "connect_secondary_ring": "connect_secondary_ring_sn",
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
                "corridors", "measurements", "protection_assignments"):
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

        return {
            "ready": readiness.ready,
            "blockers": blockers,
            "warnings": warnings,
        }, fix_actions
    except Exception:
        return {"ready": False, "blockers": [], "warnings": []}, []


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

    # Build logical_views (corridors summary)
    corridors = enm.get("corridors", [])
    logical_views = {
        "trunks": [
            {
                "corridor_ref": c.get("ref_id"),
                "type": c.get("corridor_type"),
                "segments": c.get("ordered_segment_refs", []),
                "no_point_ref": c.get("no_point_ref"),
            }
            for c in corridors
        ],
    }

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
    }


# ---------------------------------------------------------------------------
# 1. add_grid_source_sn
# ---------------------------------------------------------------------------


def add_grid_source_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Dodaj źródło zasilania (GPZ) — pierwszy krok budowy sieci SN."""
    voltage_kv = payload.get("voltage_kv")
    if not voltage_kv or voltage_kv <= 0:
        return _error_response(
            "Napięcie znamionowe szyny GPZ musi być > 0 kV.",
            "source.voltage_invalid",
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
    dlugosc_m = segment.get("dlugosc_m", 0)
    if dlugosc_m <= 0:
        return _error_response("Długość odcinka musi być > 0 m.", "trunk.segment_length_invalid")

    catalog_ref = segment.get("catalog_ref")
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

    # Create downstream bus
    voltage_kv = from_bus.get("voltage_kv", 15.0)
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

    # Update corridor
    if trunk_id:
        for c in new_enm.get("corridors", []):
            if c.get("ref_id") == trunk_id:
                c.setdefault("ordered_segment_refs", []).append(branch_ref)
                break
    ev_seq += 1
    events.append({"event_seq": ev_seq, "event_type": "LOGICAL_VIEWS_UPDATED", "element_id": trunk_id})

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
    segment_id = payload.get("segment_id")
    insert_at = payload.get("insert_at", {})
    station = payload.get("station", {})
    sn_fields = payload.get("sn_fields", [])
    transformer = payload.get("transformer", {})
    nn_block = payload.get("nn_block", {})

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

    station_type = station.get("station_type", "")
    if station_type not in ("A", "B", "C", "D"):
        return _error_response(
            f"Typ stacji '{station_type}' jest nieprawidłowy. Wymagane: A, B, C lub D.",
            "station.insert.station_type_invalid",
        )

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

    sn_voltage_kv = station.get("sn_voltage_kv")
    nn_voltage_kv = station.get("nn_voltage_kv")
    if not sn_voltage_kv or sn_voltage_kv <= 0:
        return _error_response("Napięcie SN stacji musi być > 0 kV.", "station.insert.sn_voltage_invalid")
    if not nn_voltage_kv or nn_voltage_kv <= 0:
        return _error_response("Napięcie nN stacji musi być > 0 kV.", "station.insert.nn_voltage_invalid")

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

    # Create Substation
    new_enm.setdefault("substations", []).append({
        "ref_id": stn_id,
        "name": station.get("station_name") or f"Stacja {station_type}",
        "station_type": "mv_lv",
        "bus_refs": [sn_bus_id],
        "transformer_refs": [],
        "tags": [],
        "meta": {"station_type_sn": station_type},
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
        tr_data = {
            "device_type": "transformer",
            "ref_id": tr_id,
            "name": f"Transformator SN/nN",
            "hv_bus_ref": sn_bus_id,
            "lv_bus_ref": nn_bus_id,
            "sn_mva": 0.001,  # Placeholder — wymaga katalogu
            "uhv_kv": sn_voltage_kv,
            "ulv_kv": nn_voltage_kv,
            "uk_percent": 0.01,  # Placeholder — wymaga katalogu
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
# 4. start_branch_segment_sn
# ---------------------------------------------------------------------------


def start_branch_segment_sn(enm: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Dodaj odgałęzienie SN z istniejącej szyny."""
    from_bus_ref = payload.get("from_bus_ref")
    segment = payload.get("segment", {})

    if not from_bus_ref:
        return _error_response("Brak identyfikatora szyny źródłowej.", "branch.from_bus_missing")

    from_bus = None
    for b in enm.get("buses", []):
        if b.get("ref_id") == from_bus_ref:
            from_bus = b
            break
    if not from_bus:
        return _error_response(f"Szyna '{from_bus_ref}' nie istnieje.", "branch.from_bus_not_found")

    rodzaj = segment.get("rodzaj", "KABEL")
    dlugosc_m = segment.get("dlugosc_m", 0)
    if dlugosc_m <= 0:
        return _error_response("Długość odcinka musi być > 0 m.", "branch.segment_length_invalid")

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

    voltage_kv = from_bus.get("voltage_kv", 15.0)
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
    result = create_branch(new_enm, {
        "ref_id": branch_ref,
        "name": f"Odgałęzienie",
        "type": branch_type,
        "from_bus_ref": from_bus_ref,
        "to_bus_ref": new_bus_ref,
        "length_km": dlugosc_m / 1000.0,
        "r_ohm_per_km": 0.0,
        "x_ohm_per_km": 0.0,
        "status": "closed",
        "catalog_ref": segment.get("catalog_ref"),
    })
    if not result.success:
        return _error_response("Nie udało się utworzyć odgałęzienia.", "branch.creation_failed")
    new_enm = result.enm
    created.append(branch_ref)
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

    # Create switch bus
    voltage_kv = 15.0
    for b in enm.get("buses", []):
        if b.get("ref_id") == from_bus_ref:
            voltage_kv = b.get("voltage_kv", 15.0)
            break

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
    """Zamknij pierścień SN."""
    from_bus_ref = payload.get("from_bus_ref")
    to_bus_ref = payload.get("to_bus_ref")
    segment = payload.get("segment", {})

    if not from_bus_ref or not to_bus_ref:
        return _error_response("Brak szyn do połączenia.", "ring.buses_missing")

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
    dlugosc_m = segment.get("dlugosc_m", 100)
    branch_type = "cable" if rodzaj == "KABEL" else "line_overhead"

    result = create_branch(new_enm, {
        "ref_id": ring_ref,
        "name": payload.get("ring_name") or "Zamknięcie pierścienia",
        "type": branch_type,
        "from_bus_ref": from_bus_ref,
        "to_bus_ref": to_bus_ref,
        "length_km": dlugosc_m / 1000.0,
        "r_ohm_per_km": 0.0,
        "x_ohm_per_km": 0.0,
        "status": "closed",
        "catalog_ref": segment.get("catalog_ref"),
    })
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
    switch_ref = payload.get("switch_ref")
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

    seed = _compute_seed({"op": "add_transformer", "hv": hv_bus_ref, "lv": lv_bus_ref})
    tr_ref = f"tr/{seed}/transformer"

    new_enm = copy.deepcopy(enm)
    created = []
    events = []
    ev_seq = 0

    tr_data: dict[str, Any] = {
        "device_type": "transformer",
        "ref_id": tr_ref,
        "name": "Transformator SN/nN",
        "hv_bus_ref": hv_bus_ref,
        "lv_bus_ref": lv_bus_ref,
        "sn_mva": payload.get("sn_mva") or 0.001,
        "uhv_kv": payload.get("uhv_kv") or 15.0,
        "ulv_kv": payload.get("ulv_kv") or 0.4,
        "uk_percent": payload.get("uk_percent") or 0.01,
        "pk_kw": payload.get("pk_kw") or 0.0,
    }
    if payload.get("transformer_catalog_ref"):
        tr_data["catalog_ref"] = payload["transformer_catalog_ref"]
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
    catalog_item_id = payload.get("catalog_item_id")

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

    new_enm = copy.deepcopy(enm)
    coll, idx = loc
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
# Dispatcher
# ---------------------------------------------------------------------------

_HANDLERS: dict[str, Any] = {
    "add_grid_source_sn": add_grid_source_sn,
    "continue_trunk_segment_sn": continue_trunk_segment_sn,
    "insert_station_on_segment_sn": insert_station_on_segment_sn,
    "start_branch_segment_sn": start_branch_segment_sn,
    "insert_section_switch_sn": insert_section_switch_sn,
    "connect_secondary_ring_sn": connect_secondary_ring_sn,
    "set_normal_open_point": set_normal_open_point,
    "add_transformer_sn_nn": add_transformer_sn_nn,
    "assign_catalog_to_element": assign_catalog_to_element,
    "update_element_parameters": update_element_parameters,
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

    return _HANDLERS[canonical_name](enm_dict, payload)
