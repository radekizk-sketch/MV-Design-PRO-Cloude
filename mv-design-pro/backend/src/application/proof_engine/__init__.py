"""
Proof Engine — Mathematical Proof Engine (P11–P19)

Kanoniczny silnik dowodowy kompilujący pełne dowody matematyczne
na podstawie ShortCircuitResult i white_box_trace.

STATUS: CANONICAL & BINDING

Moduły:
- types: Struktury danych (ProofDocument, ProofStep, etc.)
- equation_registry: Rejestr równań (EQ_SC3F_*, EQ_VDROP_*, etc.)
- unit_verifier: Weryfikacja jednostek
- proof_generator: Generator dowodów
- latex_renderer: Renderer LaTeX
- proof_inspector: Warstwa przeglądu i eksportu (P11.1d)
"""

from application.proof_engine.types import (
    EquationDefinition,
    EnergyProfilePoint,
    LoadCurrentsCounterfactualInput,
    LoadCurrentsInput,
    LoadElementKind,
    LossesEnergyInput,
    LossesEnergyTargetKind,
    ProtectionProofInput,
    ProtectionSelectivityInput,
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
from application.proof_engine.proof_pack import (
    ProofPackBuilder,
    ProofPackContext,
    proof_pack_proof_type,
    resolve_mv_design_pro_version,
)

# P11.1d: Proof Inspector (read-only viewer & export)
from application.proof_engine.proof_inspector import (
    # Types
    CounterfactualRow,
    CounterfactualView,
    HeaderView,
    InspectorView,
    ProtectionComparisonRow,
    ProtectionComparisonView,
    StepView,
    SummaryView,
    UnitCheckView,
    ValueView,
    # Inspector
    ProofInspector,
    inspect,
    # Exporters
    ExportResult,
    InspectorExporter,
    export_to_json,
    export_to_pdf,
    export_to_tex,
    is_pdf_export_available,
)

__all__ = [
    # Types
    "EquationDefinition",
    "EnergyProfilePoint",
    "LoadCurrentsCounterfactualInput",
    "LoadCurrentsInput",
    "LoadElementKind",
    "LossesEnergyInput",
    "LossesEnergyTargetKind",
    "ProtectionProofInput",
    "ProtectionSelectivityInput",
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
    # P11.1d: Inspector Types
    "CounterfactualRow",
    "CounterfactualView",
    "HeaderView",
    "InspectorView",
    "ProtectionComparisonRow",
    "ProtectionComparisonView",
    "StepView",
    "SummaryView",
    "UnitCheckView",
    "ValueView",
    # P11.1d: Inspector
    "ProofInspector",
    "inspect",
    # P11.1d: Exporters
    "ExportResult",
    "InspectorExporter",
    "export_to_json",
    "export_to_pdf",
    "export_to_tex",
    "is_pdf_export_available",
    # P11.3: Proof Pack
    "ProofPackBuilder",
    "ProofPackContext",
    "proof_pack_proof_type",
    "resolve_mv_design_pro_version",
]
