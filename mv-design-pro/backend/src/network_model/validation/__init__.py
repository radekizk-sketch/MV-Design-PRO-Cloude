"""
Network model validation module.

PowerFactory-style validation that must pass before solver execution.
Validates graph connectivity, element presence, and parameter validity.

This is NOT a solver - it's a pre-check layer.
"""

from .validator import (
    NetworkValidator,
    ValidationReport,
    ValidationIssue,
    Severity,
    validate_network,
)

__all__ = [
    "NetworkValidator",
    "ValidationReport",
    "ValidationIssue",
    "Severity",
    "validate_network",
]
