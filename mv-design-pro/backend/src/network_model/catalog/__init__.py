"""
Type Catalog module for network elements.

PowerFactory Alignment:
- Types are IMMUTABLE once created
- Types are SHARED across projects
- Instances store only: type reference + local parameters (e.g., length)

The Catalog is the single source of physical parameters for network elements.
"""

from .types import (
    LineType,
    CableType,
    TransformerType,
    SwitchType as SwitchTypeSpec,  # Avoid conflict with SwitchType enum
)

__all__ = [
    "LineType",
    "CableType",
    "TransformerType",
    "SwitchTypeSpec",
]
