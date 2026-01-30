"""
Issues API — P30d

READ-ONLY endpoint for aggregating validation/interpretation findings.
Combines model validation + P22 interpretation into unified Issue list.

DETERMINISTIC: Same inputs → same output (sorted by severity, source, id).
100% Polish messages.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_uow_factory
from application.analysis_run import AnalysisRunService
from infrastructure.persistence.unit_of_work import UnitOfWork

router = APIRouter(prefix="/api/issues", tags=["issues"])


# =============================================================================
# Response Models (DTO)
# =============================================================================


def _map_validation_to_issues(
    validation_report: dict[str, Any],
    source: str = "MODEL",
) -> list[dict[str, Any]]:
    """
    Map ValidationReport to Issue format.

    Args:
        validation_report: ValidationReport.to_dict() output
        source: Issue source (MODEL, POWER_FLOW, PROTECTION)

    Returns:
        List of Issue dicts
    """
    issues = []

    # Map errors (severity HIGH)
    for error in validation_report.get("errors", []):
        issue_id = f"{source.lower()}.{error['code']}.{error.get('element_id', 'global')}"
        issues.append({
            "issue_id": issue_id,
            "source": source,
            "severity": "HIGH",  # Errors are always HIGH
            "title_pl": f"Błąd walidacji: {error['code']}",
            "description_pl": error["message"],
            "object_ref": {
                "type": _infer_element_type(error.get("element_id")),
                "id": error.get("element_id") or "",
                "name": None,
            } if error.get("element_id") else None,
            "field": error.get("field"),
            "evidence_ref": None,
        })

    # Map warnings (severity WARN)
    for warning in validation_report.get("warnings", []):
        issue_id = f"{source.lower()}.{warning['code']}.{warning.get('element_id', 'global')}"
        issues.append({
            "issue_id": issue_id,
            "source": source,
            "severity": "WARN",  # Warnings are WARN
            "title_pl": f"Ostrzeżenie: {warning['code']}",
            "description_pl": warning["message"],
            "object_ref": {
                "type": _infer_element_type(warning.get("element_id")),
                "id": warning.get("element_id") or "",
                "name": None,
            } if warning.get("element_id") else None,
            "field": warning.get("field"),
            "evidence_ref": None,
        })

    return issues


def _map_interpretation_to_issues(interpretation: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Map P22 PowerFlowInterpretationResult to Issue format.

    Args:
        interpretation: Interpretation result dict

    Returns:
        List of Issue dicts
    """
    issues = []

    # Voltage findings
    for finding in interpretation.get("voltage_findings", []):
        issue_id = f"power_flow.voltage.{finding['bus_id']}"
        issues.append({
            "issue_id": issue_id,
            "source": "POWER_FLOW",
            "severity": finding["severity"],  # INFO/WARN/HIGH from P22
            "title_pl": f"Napięcie: {finding['bus_id']}",
            "description_pl": finding["description_pl"],
            "object_ref": {
                "type": "Bus",
                "id": finding["bus_id"],
                "name": None,
            },
            "field": "voltage_kv",
            "evidence_ref": finding.get("evidence_ref"),
        })

    # Branch loading findings
    for finding in interpretation.get("branch_findings", []):
        issue_id = f"power_flow.loading.{finding['branch_id']}"
        # Infer branch type from ID or use generic
        branch_type = _infer_element_type(finding['branch_id'])
        issues.append({
            "issue_id": issue_id,
            "source": "POWER_FLOW",
            "severity": finding["severity"],  # INFO/WARN/HIGH from P22
            "title_pl": f"Obciążenie: {finding['branch_id']}",
            "description_pl": finding["description_pl"],
            "object_ref": {
                "type": branch_type,
                "id": finding["branch_id"],
                "name": None,
            },
            "field": "loading_pct",
            "evidence_ref": finding.get("evidence_ref"),
        })

    return issues


def _infer_element_type(element_id: str | None) -> str:
    """
    Infer ElementType from element ID.
    Simple heuristic based on naming conventions.
    """
    if not element_id:
        return "Bus"  # Default fallback

    # Common prefixes
    if element_id.startswith("BUS") or element_id.startswith("B_"):
        return "Bus"
    elif element_id.startswith("LINE") or element_id.startswith("L_"):
        return "LineBranch"
    elif element_id.startswith("TRAFO") or element_id.startswith("T_"):
        return "TransformerBranch"
    elif element_id.startswith("SW") or element_id.startswith("S_"):
        return "Switch"
    elif element_id.startswith("SRC") or element_id.startswith("GEN"):
        return "Source"
    elif element_id.startswith("LOAD") or element_id.startswith("LD"):
        return "Load"

    # Default fallback
    return "Bus"


def _sort_issues(issues: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    DETERMINISTIC sort: severity DESC, source, object_ref.id ASC.

    Severity order: HIGH > WARN > INFO
    """
    severity_order = {"HIGH": 0, "WARN": 1, "INFO": 2}

    return sorted(
        issues,
        key=lambda x: (
            severity_order.get(x["severity"], 99),
            x["source"],
            x["object_ref"]["id"] if x.get("object_ref") else "",
        ),
    )


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/study-cases/{case_id}/issues")
def get_case_issues(
    case_id: UUID,
    uow_factory=Depends(get_uow_factory),
) -> dict[str, Any]:
    """
    P30d: Agreguj issues dla danego study case.

    Źródła:
    - MODEL: walidacje z failed AnalysisRun
    - POWER_FLOW: P22 interpretation z successful PF run
    - PROTECTION: (TODO) protection findings

    DETERMINISTIC: Ten sam case → identyczna lista issues.
    READ-ONLY: Zero nowych obliczeń, tylko agregacja.

    Returns:
        {
            "issues": [...],
            "total_count": int,
            "by_severity": {"HIGH": int, "WARN": int, "INFO": int},
            "by_source": {"MODEL": int, "POWER_FLOW": int, "PROTECTION": int},
        }
    """
    service = AnalysisRunService(uow_factory)
    all_issues: list[dict[str, Any]] = []

    with uow_factory() as uow:
        # Get latest run for this case
        latest_runs = uow.analysis_runs.list_runs(
            operating_case_id=case_id,
            limit=1,
        )

        if not latest_runs:
            # No runs yet → return empty
            return {
                "issues": [],
                "total_count": 0,
                "by_severity": {"HIGH": 0, "WARN": 0, "INFO": 0},
                "by_source": {"MODEL": 0, "POWER_FLOW": 0, "PROTECTION": 0},
            }

        latest_run = latest_runs[0]

        # Check if run failed → extract validation errors
        if latest_run.status == "FAILED" and latest_run.error_message:
            try:
                # Parse ValidationReport from error_message
                validation_report = json.loads(latest_run.error_message)
                model_issues = _map_validation_to_issues(validation_report, source="MODEL")
                all_issues.extend(model_issues)
            except (json.JSONDecodeError, KeyError):
                # Not a validation report → skip
                pass

        # If run succeeded and is PF → get interpretation
        if latest_run.status == "FINISHED" and latest_run.analysis_type == "PF":
            try:
                # Get interpretation (cached)
                from api.power_flow_runs import get_power_flow_interpretation
                interpretation = get_power_flow_interpretation(
                    run_id=latest_run.id,
                    uow_factory=uow_factory,
                )
                pf_issues = _map_interpretation_to_issues(interpretation)
                all_issues.extend(pf_issues)
            except HTTPException:
                # No interpretation available → skip
                pass

    # DETERMINISTIC sort
    all_issues = _sort_issues(all_issues)

    # Compute stats
    by_severity = {"HIGH": 0, "WARN": 0, "INFO": 0}
    by_source = {"MODEL": 0, "POWER_FLOW": 0, "PROTECTION": 0}

    for issue in all_issues:
        by_severity[issue["severity"]] = by_severity.get(issue["severity"], 0) + 1
        by_source[issue["source"]] = by_source.get(issue["source"], 0) + 1

    return {
        "issues": all_issues,
        "total_count": len(all_issues),
        "by_severity": by_severity,
        "by_source": by_source,
    }
