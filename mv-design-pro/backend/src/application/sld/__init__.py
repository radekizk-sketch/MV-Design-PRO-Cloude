"""
SLD (Single Line Diagram) Module.

PowerFactory Alignment (per SYSTEM_SPEC.md § 9, sld_rules.md):
- Bijection: Each SLD symbol corresponds to exactly ONE NetworkModel object
- No helper objects or virtual symbols
- Results as overlay only, never written to model
- Operating modes: MODEL_EDIT, CASE_CONFIG, RESULT_VIEW
"""

from .dtos import (
    SldAnnotationDTO,
    SldBranchSymbolDTO,
    SldDiagramDTO,
    SldNodeSymbolDTO,
    SldOperatingMode,
    SldResultStatus,
    SldSwitchSymbolDTO,
)
from .layout import build_auto_layout_diagram
from .overlay import ResultSldOverlayBuilder, ResultStatus

__all__ = [
    "ResultSldOverlayBuilder",
    "ResultStatus",
    "SldAnnotationDTO",
    "SldBranchSymbolDTO",
    "SldDiagramDTO",
    "SldNodeSymbolDTO",
    "SldOperatingMode",
    "SldResultStatus",
    "SldSwitchSymbolDTO",
    "build_auto_layout_diagram",
]
