"""
Solver-input contract package (v1.0).

Provides canonical, versioned, deterministic transformation from
ENM (NetworkGraph + Catalog) to solver-ready input with full
parameter provenance tracing.

Public API:
    build_solver_input()     — main entry point
    check_eligibility()      — per-analysis gating
    build_eligibility_map()  — all analyses gating
"""

from solver_input.builder import build_solver_input
from solver_input.contracts import (
    SOLVER_INPUT_CONTRACT_VERSION,
    AnalysisEligibilityEntry,
    BranchPayload,
    BusPayload,
    EligibilityMap,
    EligibilityResult,
    InverterSourcePayload,
    LoadFlowPayload,
    ProvenanceEntrySchema,
    ProvenanceSummarySchema,
    ShortCircuitPayload,
    SolverAnalysisType,
    SolverInputEnvelope,
    SolverInputIssue,
    SolverInputIssueSeverity,
    SwitchPayload,
    TransformerPayload,
)
from solver_input.eligibility import build_eligibility_map, check_eligibility
from solver_input.provenance import (
    ProvenanceEntry,
    ProvenanceSummary,
    SourceKind,
    SourceRef,
    build_provenance_summary,
    compute_value_hash,
)

__all__ = [
    "SOLVER_INPUT_CONTRACT_VERSION",
    "AnalysisEligibilityEntry",
    "BranchPayload",
    "BusPayload",
    "EligibilityMap",
    "EligibilityResult",
    "InverterSourcePayload",
    "LoadFlowPayload",
    "ProvenanceEntry",
    "ProvenanceEntrySchema",
    "ProvenanceSummary",
    "ProvenanceSummarySchema",
    "ShortCircuitPayload",
    "SolverAnalysisType",
    "SolverInputEnvelope",
    "SolverInputIssue",
    "SolverInputIssueSeverity",
    "SourceKind",
    "SourceRef",
    "SwitchPayload",
    "TransformerPayload",
    "build_eligibility_map",
    "build_provenance_summary",
    "build_solver_input",
    "check_eligibility",
    "compute_value_hash",
]
