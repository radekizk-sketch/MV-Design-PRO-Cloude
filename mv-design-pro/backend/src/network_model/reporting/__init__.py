"""
Reporting/export layer for network model results.

This package provides export functionality for solver results to various formats.
"""

from network_model.reporting.short_circuit_export import (
    export_short_circuit_result_to_json,
    export_short_circuit_results_to_jsonl,
)
from network_model.reporting.short_circuit_report_docx import (
    export_short_circuit_result_to_docx,
)
from network_model.reporting.short_circuit_report_pdf import (
    export_short_circuit_result_to_pdf,
)
from network_model.reporting.analysis_run_report_docx import (
    export_analysis_run_to_docx,
)
from network_model.reporting.analysis_run_report_pdf import (
    export_analysis_run_to_pdf,
)
from network_model.reporting.power_flow_report_pdf import (
    export_power_flow_result_to_pdf,
    export_power_flow_comparison_to_pdf,
)
from network_model.reporting.power_flow_report_docx import (
    export_power_flow_result_to_docx,
    export_power_flow_comparison_to_docx,
)
from network_model.reporting.power_flow_export import (
    export_power_flow_result_to_json,
    export_power_flow_results_to_jsonl,
)

__all__ = [
    # Short Circuit exports
    "export_short_circuit_result_to_json",
    "export_short_circuit_results_to_jsonl",
    "export_short_circuit_result_to_docx",
    "export_short_circuit_result_to_pdf",
    # Analysis Run exports
    "export_analysis_run_to_docx",
    "export_analysis_run_to_pdf",
    # Power Flow exports
    "export_power_flow_result_to_pdf",
    "export_power_flow_comparison_to_pdf",
    "export_power_flow_result_to_docx",
    "export_power_flow_comparison_to_docx",
    "export_power_flow_result_to_json",
    "export_power_flow_results_to_jsonl",
]
