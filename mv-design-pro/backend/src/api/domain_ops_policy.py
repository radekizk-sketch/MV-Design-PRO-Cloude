"""Shared catalog enforcement policy for domain operation API endpoints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from network_model.catalog.materialization import (
    materialize_catalog_binding,
    validate_catalog_binding,
)
from network_model.catalog.types import CatalogBinding

# Operations that require catalog binding in their payload
CATALOG_REQUIRED_OPERATIONS: frozenset[str] = frozenset({
    "continue_trunk_segment_sn",
    "start_branch_segment_sn",
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
})


@dataclass(frozen=True)
class CatalogPolicyError:
    """Canonical catalog policy error returned by API endpoints."""

    code: str
    message_pl: str
    errors: list[dict[str, str]]


def extract_catalog_binding(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Extract catalog_binding from payload (searching nested structures)."""
    if "catalog_binding" in payload:
        return payload["catalog_binding"]

    for key in (
        "segment",
        "branch",
        "load",
        "pv_source",
        "bess_source",
        "protection",
        "transformer_spec",
        "relay_catalog_binding",
    ):
        nested = payload.get(key)
        if isinstance(nested, dict) and "catalog_binding" in nested:
            return nested["catalog_binding"]

    return None


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

    binding_data = extract_catalog_binding(payload)
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

