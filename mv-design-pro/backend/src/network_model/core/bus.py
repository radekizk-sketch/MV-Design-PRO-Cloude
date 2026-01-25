"""
Bus alias for PowerFactory-aligned terminology.

In the legacy core implementation, the electrical node is implemented as `Node`.
PowerFactory terminology uses `Bus` for the same concept. This module provides a
compatibility alias without changing runtime behavior or internal data models.
"""

from __future__ import annotations

from .node import Node

Bus = Node

__all__ = ["Bus"]
