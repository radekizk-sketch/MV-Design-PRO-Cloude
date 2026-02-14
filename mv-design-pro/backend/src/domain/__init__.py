"""Domain layer for MV-DESIGN-PRO."""

from .analysis_run import AnalysisRun
from .element_ref import CatalogRefV1, ElementRefV1, ElementScopeV1, ElementTypeV1
from .models import (
    Network,
    OperatingCase,
    Project,
    Scenario,
    StudyCase,
    StudyRun,
)
from .project_design_mode import ProjectDesignMode
from .grounding import Grounding
from .limits import Limits
from .readiness import (
    ReadinessAreaV1,
    ReadinessGateError,
    ReadinessIssueV1,
    ReadinessPriority,
    ReadinessProfileV1,
    build_readiness_profile,
    require_devices_parametrized,
    require_export_ready,
    require_fields_complete,
    require_load_flow_ready,
    require_protection_bindings,
    require_short_circuit_ready,
    require_sld_ready,
)
from .field_device import (
    AparatTypeV1,
    DeviceTypeV1 as FieldDeviceTypeV1,
    FieldRoleV1,
    PoleTypeV1,
    validate_generator_field_connection,
)
from .export_manifest import ExportManifestV1, build_export_manifest
from .result_join import (
    InspectorFactV1,
    ResultJoinV1,
    SldOverlayTokenV1,
    join_results,
)
from .sources import Source
from .substation import SubstationMetadata
from .units import BaseQuantities, UnitSystem
from .validation import ValidationIssue, ValidationReport
from .result_set import OverlayElement, OverlayLegendEntry, OverlayPayloadV1
from .sld import SldAnnotation, SldBranchSymbol, SldDiagram, SldNodeSymbol

__all__ = [
    "BaseQuantities",
    "CatalogRefV1",
    "ElementRefV1",
    "ElementScopeV1",
    "ElementTypeV1",
    "ExportManifestV1",
    "Grounding",
    "AnalysisRun",
    "InspectorFactV1",
    "Limits",
    "OverlayElement",
    "OverlayLegendEntry",
    "OverlayPayloadV1",
    "Network",
    "OperatingCase",
    "Project",
    "ProjectDesignMode",
    "ReadinessAreaV1",
    "ReadinessGateError",
    "ReadinessIssueV1",
    "ReadinessPriority",
    "ReadinessProfileV1",
    "ResultJoinV1",
    "Scenario",
    "SldOverlayTokenV1",
    "Source",
    "StudyCase",
    "StudyRun",
    "SubstationMetadata",
    "SldAnnotation",
    "SldBranchSymbol",
    "SldDiagram",
    "SldNodeSymbol",
    "UnitSystem",
    "ValidationIssue",
    "ValidationReport",
    "build_export_manifest",
    "build_readiness_profile",
    "join_results",
    "require_devices_parametrized",
    "require_export_ready",
    "require_fields_complete",
    "require_load_flow_ready",
    "require_protection_bindings",
    "require_short_circuit_ready",
    "require_sld_ready",
    # Field/Device (RUN #3F)
    "AparatTypeV1",
    "FieldDeviceTypeV1",
    "FieldRoleV1",
    "PoleTypeV1",
    "validate_generator_field_connection",
]
