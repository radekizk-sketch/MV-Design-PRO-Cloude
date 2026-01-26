"""
Type Catalog module for network elements.

PowerFactory Alignment:
- Types are IMMUTABLE once created
- Types are SHARED across projects
- Instances store only: type reference + local parameters (e.g., length)

The Catalog is the single source of physical parameters for network elements.
"""

from .repository import CatalogRepository
from .types import (
    CableType,
    ConverterKind,
    ConverterType,
    InverterType,
    LineType,
    SwitchEquipmentType,
    TransformerType,
)

__all__ = [
    "LineType",
    "CableType",
    "TransformerType",
    "SwitchEquipmentType",
    "ConverterKind",
    "ConverterType",
    "InverterType",
    "CatalogRepository",
]
