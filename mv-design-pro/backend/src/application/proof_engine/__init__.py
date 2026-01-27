"""
Proof Engine P11.1a — Mathematical Proof Engine (MVP)

Kanoniczny silnik dowodowy kompilujący pełne dowody matematyczne
na podstawie ShortCircuitResult i white_box_trace.

STATUS: CANONICAL & BINDING
"""

from application.proof_engine.types import (
    EquationDefinition,
    ProofDocument,
    ProofHeader,
    ProofStep,
    ProofSummary,
    ProofType,
    ProofValue,
    SymbolDefinition,
    UnitCheckResult,
)
from application.proof_engine.equation_registry import EquationRegistry
from application.proof_engine.unit_verifier import UnitVerifier
from application.proof_engine.proof_generator import ProofGenerator
from application.proof_engine.latex_renderer import LaTeXRenderer

__all__ = [
    # Types
    "EquationDefinition",
    "ProofDocument",
    "ProofHeader",
    "ProofStep",
    "ProofSummary",
    "ProofType",
    "ProofValue",
    "SymbolDefinition",
    "UnitCheckResult",
    # Registry
    "EquationRegistry",
    # Verifier
    "UnitVerifier",
    # Generator
    "ProofGenerator",
    # Renderer
    "LaTeXRenderer",
]
