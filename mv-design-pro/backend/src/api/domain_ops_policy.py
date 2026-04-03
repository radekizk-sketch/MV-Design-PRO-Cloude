"""Shared catalog enforcement policy for domain operation API endpoints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from network_model.catalog.materialization import (
    materialize_catalog_binding,
    validate_catalog_binding,
)
from network_model.catalog.types import CatalogBinding

DEFAULT_CATALOG_VERSION = "2024.1"

# Operations that require catalog binding in their payload
CATALOG_REQUIRED_OPERATIONS: frozenset[str] = frozenset({
    "add_grid_source_sn",
    "continue_trunk_segment_sn",
    "insert_branch_pole_on_segment_sn",
    "start_branch_segment_sn",
    "insert_zksn_on_segment_sn",
    "insert_station_on_segment_sn",
    "add_transformer_sn_nn",
    "add_nn_load",
    "add_pv_inverter_nn",
    "add_bess_inverter_nn",
    "add_relay",
    "add_ct",
    "add_vt",
    "add_nn_outgoing_field",
    "insert_section_switch_sn",
    "connect_secondary_ring_sn",
})


@dataclass(frozen=True)
class CatalogPolicyError:
    """Canonical catalog policy error returned by API endpoints."""

    code: str
    message_pl: str
    errors: list[dict[str, str]]


def _binding_from_ref(namespace: str | None, catalog_ref: Any) -> dict[str, Any] | None:
    if not namespace or not isinstance(catalog_ref, str) or not catalog_ref.strip():
        return None
    return {
        "catalog_namespace": namespace,
        "catalog_item_id": catalog_ref.strip(),
        "catalog_item_version": DEFAULT_CATALOG_VERSION,
        "materialize": True,
        "snapshot_mapping_version": "1.0",
    }


def _extract_binding_from_container(
    container: Any,
    *,
    namespace: str | None = None,
    ref_keys: tuple[str, ...] = (),
) -> dict[str, Any] | None:
    if not isinstance(container, dict):
        return None

    binding = container.get("catalog_binding")
    if isinstance(binding, dict):
        return binding

    for key in ref_keys:
        synthesized = _binding_from_ref(namespace, container.get(key))
        if synthesized is not None:
            return synthesized

    return None


def _segment_namespace(segment: Any) -> str | None:
    if not isinstance(segment, dict):
        return None
    segment_kind = segment.get("rodzaj") or segment.get("segment_kind") or segment.get("type")
    if segment_kind in {"KABEL", "KABEL_SN", "cable"}:
        return "KABEL_SN"
    if segment_kind in {"LINIA_NAPOWIETRZNA", "LINIA_SN", "line_overhead"}:
        return "LINIA_SN"
    return None


def _explicit_namespace(payload: dict[str, Any]) -> str | None:
    namespace = payload.get("catalog_namespace")
    if isinstance(namespace, str) and namespace.strip():
        return namespace.strip()
    return None


def extract_catalog_binding(operation: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    """Extract catalog_binding from payload, preferring canonical nested contracts."""

    if operation in {"continue_trunk_segment_sn", "start_branch_segment_sn", "connect_secondary_ring_sn"}:
        candidate = _extract_binding_from_container(
            payload.get("segment"),
            namespace=_segment_namespace(payload.get("segment")),
            ref_keys=("catalog_ref",),
        )
        if candidate is not None:
            return candidate

    if operation == "insert_station_on_segment_sn":
        candidate = _extract_binding_from_container(
            payload.get("transformer"),
            namespace="TRAFO_SN_NN",
            ref_keys=("transformer_catalog_ref",),
        )
        if candidate is not None:
            return candidate

    if operation == "add_transformer_sn_nn":
        candidate = _extract_binding_from_container(
            payload,
            namespace="TRAFO_SN_NN",
            ref_keys=("transformer_catalog_ref", "catalog_ref"),
        )
        if candidate is not None:
            return candidate

    if operation == "add_grid_source_sn":
        candidate = _extract_binding_from_container(
            payload,
            namespace="ZRODLO_SN",
            ref_keys=("catalog_ref",),
        )
        if candidate is not None:
            return candidate

    if operation == "insert_section_switch_sn":
        candidate = _extract_binding_from_container(
            payload,
            namespace="APARAT_SN",
            ref_keys=("catalog_ref",),
        )
        if candidate is not None:
            return candidate

    if operation == "add_nn_load":
        candidate = _extract_binding_from_container(
            payload.get("load") or payload,
            namespace="OBCIAZENIE",
            ref_keys=("catalog_ref",),
        )
        if candidate is not None:
            return candidate

    if operation == "add_pv_inverter_nn":
        candidate = _extract_binding_from_container(
            payload.get("pv_spec") or payload.get("pv_source"),
            namespace="ZRODLO_NN_PV",
            ref_keys=("catalog_item_id",),
        )
        if candidate is not None:
            return candidate

    if operation == "add_bess_inverter_nn":
        candidate = _extract_binding_from_container(
            payload.get("bess_spec") or payload.get("bess_source"),
            namespace="ZRODLO_NN_BESS",
            ref_keys=("inverter_catalog_id",),
        )
        if candidate is not None:
            return candidate

    if operation == "add_relay":
        candidate = _extract_binding_from_container(
            payload.get("protection") or payload,
            namespace="ZABEZPIECZENIE",
            ref_keys=("catalog_ref", "catalog_item_id"),
        )
        if candidate is not None:
            return candidate

    if operation == "add_ct":
        candidate = _extract_binding_from_container(
            payload.get("measurement") or payload,
            namespace="CT",
            ref_keys=("catalog_ref", "catalog_item_id"),
        )
        if candidate is not None:
            return candidate

    if operation == "add_vt":
        candidate = _extract_binding_from_container(
            payload.get("measurement") or payload,
            namespace="VT",
            ref_keys=("catalog_ref", "catalog_item_id"),
        )
        if candidate is not None:
            return candidate

    if operation == "add_nn_outgoing_field":
        candidate = _extract_binding_from_container(
            payload,
            namespace="APARAT_NN",
            ref_keys=("catalog_ref",),
        )
        if candidate is not None:
            return candidate

    if operation in {"insert_branch_pole_on_segment_sn", "insert_zksn_on_segment_sn"}:
        candidate = _extract_binding_from_container(
            payload,
            namespace=_explicit_namespace(payload),
            ref_keys=("catalog_ref",),
        )
        if candidate is not None:
            return candidate

    candidate = _extract_binding_from_container(payload)
    if candidate is not None:
        return candidate

    for key in (
        "segment",
        "branch",
        "load",
        "pv_source",
        "pv_spec",
        "bess_source",
        "bess_spec",
        "protection",
        "transformer",
        "transformer_spec",
        "measurement",
        "relay_catalog_binding",
    ):
        nested = payload.get(key)
        if key == "relay_catalog_binding" and isinstance(nested, dict):
            return nested
        candidate = _extract_binding_from_container(nested)
        if candidate is not None:
            return candidate

    return _binding_from_ref(_explicit_namespace(payload), payload.get("catalog_ref"))


def validate_and_materialize_catalog_binding(
    operation: str,
    payload: dict[str, Any],
) -> tuple[CatalogPolicyError | None, dict[str, Any]]:
    """Apply canonical catalog policy (binding + materialization dry-run).

    Returns:
      - CatalogPolicyError when operation must be rejected
      - materialized solver params (dry-run) when binding is valid and resolvable
    """
    if operation not in CATALOG_REQUIRED_OPERATIONS:
        return None, {}

    binding_data = extract_catalog_binding(operation, payload)
    if binding_data is None:
        return (
            CatalogPolicyError(
                code="catalog.ref_required",
                message_pl="Element techniczny wymaga powiązania z katalogiem",
                errors=[{
                    "code": "catalog.ref_required",
                    "message_pl": (
                        f"Operacja '{operation}' wymaga 'catalog_binding' w payload."
                    ),
                }],
            ),
            {},
        )

    binding_errors = validate_catalog_binding(binding_data)
    if binding_errors:
        return (
            CatalogPolicyError(
                code="catalog.ref_required",
                message_pl="Powiązanie katalogowe jest niekompletne lub niepoprawne",
                errors=[
                    {
                        "code": "catalog.ref_required",
                        "message_pl": e.message_pl,
                    }
                    for e in binding_errors
                ],
            ),
            {},
        )

    try:
        binding = CatalogBinding.from_dict(binding_data)
    except Exception:
        return (
            CatalogPolicyError(
                code="catalog.ref_required",
                message_pl="Powiązanie katalogowe ma nieprawidłowy format",
                errors=[{
                    "code": "catalog.ref_required",
                    "message_pl": "Nie można odczytać danych 'catalog_binding'.",
                }],
            ),
            {},
        )

    from network_model.catalog.repository import get_default_mv_catalog

    catalog = get_default_mv_catalog()
    mat_result = materialize_catalog_binding(binding, catalog)
    if not mat_result.success:
        return (
            CatalogPolicyError(
                code=mat_result.error_code or "catalog.materialization_failed",
                message_pl=mat_result.error_message_pl or "Błąd materializacji katalogu",
                errors=[{
                    "code": mat_result.error_code or "catalog.materialization_failed",
                    "message_pl": mat_result.error_message_pl
                    or "Błąd materializacji katalogu",
                }],
            ),
            {},
        )

    return None, mat_result.solver_fields
