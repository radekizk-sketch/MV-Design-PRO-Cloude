"""
Unit of Work adapter for catalog governance tests.

This module re-exports UnitOfWork from parent persistence module
to maintain test import compatibility.

Refs: P13b Type Library Governance integration tests
"""

from __future__ import annotations

from infrastructure.persistence.unit_of_work import UnitOfWork, build_uow_factory

# Alias for test compatibility
# Tests import: from infrastructure.persistence.repositories.unit_of_work import UnitOfWorkFactory
UnitOfWorkFactory = build_uow_factory

__all__ = ["UnitOfWork", "UnitOfWorkFactory", "build_uow_factory"]
