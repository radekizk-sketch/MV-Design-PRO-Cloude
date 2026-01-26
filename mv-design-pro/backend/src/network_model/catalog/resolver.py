"""
Central parameter precedence resolver for equipment types.

Implements PowerFactory-grade canonical precedence rules:
- Line/Cable: impedance_override > type_ref > instance
- Transformer: type_ref > instance
- Switch: type_ref > instance (metadata only, no impedance)

This module provides backward compatibility adapters for models without type_ref.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from network_model.catalog.repository import CatalogRepository
from network_model.catalog.types import CableType, LineType, TransformerType


class ParameterSource(Enum):
    """Source of resolved parameters for transparency and debugging."""

    OVERRIDE = "override"  # impedance_override (Line/Cable only)
    TYPE_REF = "type_ref"  # Catalog type reference
    INSTANCE = "instance"  # Direct instance parameters (fallback)


@dataclass(frozen=True)
class ResolvedLineParams:
    """Resolved electrical parameters for Line/Cable branches."""

    r_ohm_per_km: float
    x_ohm_per_km: float
    b_us_per_km: float
    rated_current_a: float
    source: ParameterSource


@dataclass(frozen=True)
class ResolvedTransformerParams:
    """Resolved nameplate parameters for Transformer branches."""

    rated_power_mva: float
    voltage_hv_kv: float
    voltage_lv_kv: float
    uk_percent: float
    pk_kw: float
    i0_percent: float
    p0_kw: float
    vector_group: str
    source: ParameterSource


class TypeNotFoundError(ValueError):
    """Raised when type_ref points to non-existent catalog entry."""

    def __init__(self, type_ref: str, equipment_type: str):
        super().__init__(
            f"{equipment_type} type_ref '{type_ref}' not found in catalog. "
            f"Check that the type exists and is correctly spelled."
        )
        self.type_ref = type_ref
        self.equipment_type = equipment_type


def _get_b_us_per_km(type_data: LineType | CableType) -> float:
    """Extract susceptance from LineType or CableType.

    Both types have b_us_per_km property (CableType converts from c_nf_per_km).
    """
    return type_data.b_us_per_km


def resolve_line_params(
    *,
    type_ref: Optional[str],
    is_cable: bool,
    impedance_override: Optional[dict],
    length_km: float,
    instance_r_ohm_per_km: float,
    instance_x_ohm_per_km: float,
    instance_b_us_per_km: float,
    instance_rated_current_a: float,
    catalog: Optional[CatalogRepository],
) -> ResolvedLineParams:
    """
    Resolve Line/Cable electrical parameters with canonical precedence.

    Precedence: impedance_override > type_ref > instance

    Args:
        type_ref: Optional catalog type reference
        is_cable: True for cable, False for line
        impedance_override: Optional dict with r_total_ohm, x_total_ohm, b_total_us
        length_km: Length of the line/cable
        instance_r_ohm_per_km: Direct resistance parameter
        instance_x_ohm_per_km: Direct reactance parameter
        instance_b_us_per_km: Direct susceptance parameter
        instance_rated_current_a: Direct rated current parameter
        catalog: Optional catalog repository

    Returns:
        ResolvedLineParams with source indicator

    Raises:
        TypeNotFoundError: If type_ref is specified but not found in catalog
    """
    # PRECEDENCE LEVEL 1: impedance_override (highest priority)
    if impedance_override is not None:
        if length_km <= 0:
            return ResolvedLineParams(
                r_ohm_per_km=0.0,
                x_ohm_per_km=0.0,
                b_us_per_km=0.0,
                rated_current_a=instance_rated_current_a,
                source=ParameterSource.OVERRIDE,
            )
        return ResolvedLineParams(
            r_ohm_per_km=impedance_override.get("r_total_ohm", 0.0) / length_km,
            x_ohm_per_km=impedance_override.get("x_total_ohm", 0.0) / length_km,
            b_us_per_km=impedance_override.get("b_total_us", 0.0) / length_km,
            rated_current_a=instance_rated_current_a,
            source=ParameterSource.OVERRIDE,
        )

    # PRECEDENCE LEVEL 2: type_ref (catalog reference)
    if type_ref and catalog is not None:
        type_data = None
        equipment_type = "Cable" if is_cable else "Line"

        if is_cable:
            type_data = catalog.get_cable_type(type_ref)
        else:
            type_data = catalog.get_line_type(type_ref)

        if type_data is None:
            # Validation: type_ref specified but not found
            raise TypeNotFoundError(type_ref, equipment_type)

        return ResolvedLineParams(
            r_ohm_per_km=type_data.r_ohm_per_km,
            x_ohm_per_km=type_data.x_ohm_per_km,
            b_us_per_km=_get_b_us_per_km(type_data),
            rated_current_a=type_data.rated_current_a,
            source=ParameterSource.TYPE_REF,
        )

    # PRECEDENCE LEVEL 3: instance (backward compatibility fallback)
    return ResolvedLineParams(
        r_ohm_per_km=instance_r_ohm_per_km,
        x_ohm_per_km=instance_x_ohm_per_km,
        b_us_per_km=instance_b_us_per_km,
        rated_current_a=instance_rated_current_a,
        source=ParameterSource.INSTANCE,
    )


def resolve_transformer_params(
    *,
    type_ref: Optional[str],
    instance_rated_power_mva: float,
    instance_voltage_hv_kv: float,
    instance_voltage_lv_kv: float,
    instance_uk_percent: float,
    instance_pk_kw: float,
    instance_i0_percent: float,
    instance_p0_kw: float,
    instance_vector_group: str,
    catalog: Optional[CatalogRepository],
) -> ResolvedTransformerParams:
    """
    Resolve Transformer nameplate parameters with canonical precedence.

    Precedence: type_ref > instance

    Args:
        type_ref: Optional catalog type reference
        instance_*: Direct instance parameters (fallback)
        catalog: Optional catalog repository

    Returns:
        ResolvedTransformerParams with source indicator

    Raises:
        TypeNotFoundError: If type_ref is specified but not found in catalog
    """
    # PRECEDENCE LEVEL 1: type_ref (catalog reference)
    if type_ref and catalog is not None:
        type_data = catalog.get_transformer_type(type_ref)

        if type_data is None:
            # Validation: type_ref specified but not found
            raise TypeNotFoundError(type_ref, "Transformer")

        return ResolvedTransformerParams(
            rated_power_mva=type_data.rated_power_mva,
            voltage_hv_kv=type_data.voltage_hv_kv,
            voltage_lv_kv=type_data.voltage_lv_kv,
            uk_percent=type_data.uk_percent,
            pk_kw=type_data.pk_kw,
            i0_percent=type_data.i0_percent or 0.0,
            p0_kw=type_data.p0_kw or 0.0,
            vector_group=type_data.vector_group or "",
            source=ParameterSource.TYPE_REF,
        )

    # PRECEDENCE LEVEL 2: instance (backward compatibility fallback)
    return ResolvedTransformerParams(
        rated_power_mva=instance_rated_power_mva,
        voltage_hv_kv=instance_voltage_hv_kv,
        voltage_lv_kv=instance_voltage_lv_kv,
        uk_percent=instance_uk_percent,
        pk_kw=instance_pk_kw,
        i0_percent=instance_i0_percent,
        p0_kw=instance_p0_kw,
        vector_group=instance_vector_group,
        source=ParameterSource.INSTANCE,
    )
