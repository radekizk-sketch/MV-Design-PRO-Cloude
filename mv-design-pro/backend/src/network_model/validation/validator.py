"""
Network Validator module.

PowerFactory-style validation that must pass before solver execution.
Validates graph connectivity, element presence, and parameter validity.

This is NOT a solver - it's a pre-check layer.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set
from uuid import UUID

import networkx as nx


class Severity(Enum):
    """Validation issue severity."""
    ERROR = "ERROR"      # Blocking - solver cannot run
    WARNING = "WARNING"  # Non-blocking - solver can run with caution


@dataclass
class ValidationIssue:
    """
    Single validation issue.

    Attributes:
        code: Machine-readable issue code (e.g., "network.disconnected").
        message: Human-readable description.
        severity: ERROR (blocking) or WARNING (non-blocking).
        element_id: ID of the element with the issue (if applicable).
        field: Field name with the issue (if applicable).
    """
    code: str
    message: str
    severity: Severity = Severity.ERROR
    element_id: Optional[str] = None
    field: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "code": self.code,
            "message": self.message,
            "severity": self.severity.value,
            "element_id": self.element_id,
            "field": self.field,
        }


@dataclass
class ValidationReport:
    """
    Collection of validation issues.

    Immutable pattern - use with_error/with_warning to add issues.
    """
    issues: tuple = field(default_factory=tuple)

    @property
    def is_valid(self) -> bool:
        """
        Check if validation passed (no blocking errors).

        Returns:
            True if no ERROR-level issues, False otherwise.
        """
        return not any(i.severity == Severity.ERROR for i in self.issues)

    @property
    def errors(self) -> List[ValidationIssue]:
        """Get all ERROR-level issues."""
        return [i for i in self.issues if i.severity == Severity.ERROR]

    @property
    def warnings(self) -> List[ValidationIssue]:
        """Get all WARNING-level issues."""
        return [i for i in self.issues if i.severity == Severity.WARNING]

    def with_error(self, issue: ValidationIssue) -> "ValidationReport":
        """
        Add an error issue.

        Args:
            issue: ValidationIssue with severity=ERROR.

        Returns:
            New ValidationReport with the added issue.
        """
        return ValidationReport(
            issues=self.issues + (ValidationIssue(
                code=issue.code,
                message=issue.message,
                severity=Severity.ERROR,
                element_id=issue.element_id,
                field=issue.field,
            ),)
        )

    def with_warning(self, issue: ValidationIssue) -> "ValidationReport":
        """
        Add a warning issue.

        Args:
            issue: ValidationIssue with severity=WARNING.

        Returns:
            New ValidationReport with the added issue.
        """
        return ValidationReport(
            issues=self.issues + (ValidationIssue(
                code=issue.code,
                message=issue.message,
                severity=Severity.WARNING,
                element_id=issue.element_id,
                field=issue.field,
            ),)
        )

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "is_valid": self.is_valid,
            "issues": [i.to_dict() for i in self.issues],
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
        }


class NetworkValidator:
    """
    PowerFactory-style network validator.

    Validates network model before solver execution.
    If validation fails, solver execution is BLOCKED.

    Validation rules:
    1. Graph connectivity - network must be connected
    2. Source presence - at least one source required
    3. No dangling elements - all branches connected to valid nodes
    4. Bus voltage validity - all voltages > 0
    5. Branch endpoint validity - both endpoints exist
    6. Transformer voltage mismatch - HV ≠ LV

    This is NOT a solver - it performs no physics calculations.
    """

    def validate(self, graph) -> ValidationReport:
        """
        Run all validation rules on the network graph.

        Args:
            graph: NetworkGraph instance to validate.

        Returns:
            ValidationReport with all issues found.
        """
        report = ValidationReport()

        # Check if network is empty
        report = self._check_empty_network(graph, report)

        # Check graph connectivity
        report = self._check_connectivity(graph, report)

        # Check source presence
        report = self._check_source_presence(graph, report)

        # Check for dangling elements
        report = self._check_dangling_elements(graph, report)

        # Check bus voltages
        report = self._check_bus_voltages(graph, report)

        # Check branch endpoints
        report = self._check_branch_endpoints(graph, report)

        # Check transformer voltages
        report = self._check_transformer_voltages(graph, report)

        # Check for SLACK node
        report = self._check_slack_node(graph, report)

        return report

    def _check_empty_network(self, graph, report: ValidationReport) -> ValidationReport:
        """Check if network has any nodes."""
        if not graph.nodes:
            return report.with_error(ValidationIssue(
                code="network.empty",
                message="Network has no nodes",
            ))
        return report

    def _check_connectivity(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check if network graph is connected.

        A disconnected network cannot be solved as a single system.
        """
        if not graph.nodes:
            return report

        if not graph.is_connected():
            islands = graph.find_islands()
            return report.with_error(ValidationIssue(
                code="network.disconnected",
                message=f"Network is disconnected into {len(islands)} islands",
            ))
        return report

    def _check_source_presence(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check if at least one source is present.

        Network needs at least one source for power flow.
        """
        # Check for inverter sources
        if hasattr(graph, 'inverter_sources') and graph.inverter_sources:
            return report

        # Check for SLACK node (acts as source)
        for node in graph.nodes.values():
            from network_model.core.node import NodeType
            if node.node_type == NodeType.SLACK:
                return report

        return report.with_error(ValidationIssue(
            code="network.no_source",
            message="Network has no source (SLACK node or inverter source)",
        ))

    def _check_dangling_elements(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check for dangling elements (branches with invalid endpoints).
        """
        node_ids = set(graph.nodes.keys())

        for branch_id, branch in graph.branches.items():
            if branch.from_node_id not in node_ids:
                report = report.with_error(ValidationIssue(
                    code="branch.dangling_from",
                    message=f"Branch from_node_id '{branch.from_node_id}' does not exist",
                    element_id=branch_id,
                    field="from_node_id",
                ))
            if branch.to_node_id not in node_ids:
                report = report.with_error(ValidationIssue(
                    code="branch.dangling_to",
                    message=f"Branch to_node_id '{branch.to_node_id}' does not exist",
                    element_id=branch_id,
                    field="to_node_id",
                ))

        return report

    def _check_bus_voltages(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check if all bus voltages are valid (> 0).
        """
        for node_id, node in graph.nodes.items():
            if node.voltage_level <= 0:
                report = report.with_error(ValidationIssue(
                    code="bus.voltage_invalid",
                    message=f"Bus voltage_level must be > 0, got {node.voltage_level}",
                    element_id=node_id,
                    field="voltage_level",
                ))
        return report

    def _check_branch_endpoints(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check if all branch endpoints exist.
        """
        node_ids = set(graph.nodes.keys())

        for branch_id, branch in graph.branches.items():
            if branch.from_node_id not in node_ids:
                report = report.with_error(ValidationIssue(
                    code="branch.from_missing",
                    message="Branch from_node_id does not exist",
                    element_id=branch_id,
                    field="from_node_id",
                ))
            if branch.to_node_id not in node_ids:
                report = report.with_error(ValidationIssue(
                    code="branch.to_missing",
                    message="Branch to_node_id does not exist",
                    element_id=branch_id,
                    field="to_node_id",
                ))
            if branch.from_node_id == branch.to_node_id:
                report = report.with_error(ValidationIssue(
                    code="branch.self_loop",
                    message="Branch cannot connect a node to itself",
                    element_id=branch_id,
                ))
        return report

    def _check_transformer_voltages(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check transformer HV/LV voltages are different.
        """
        from network_model.core.branch import BranchType, TransformerBranch

        for branch_id, branch in graph.branches.items():
            if branch.branch_type == BranchType.TRANSFORMER:
                if isinstance(branch, TransformerBranch):
                    if branch.voltage_hv_kv == branch.voltage_lv_kv:
                        report = report.with_error(ValidationIssue(
                            code="transformer.voltage_equal",
                            message="Transformer HV and LV voltages must be different",
                            element_id=branch_id,
                        ))
                    if branch.voltage_hv_kv <= 0:
                        report = report.with_error(ValidationIssue(
                            code="transformer.hv_invalid",
                            message="Transformer HV voltage must be > 0",
                            element_id=branch_id,
                            field="voltage_hv_kv",
                        ))
                    if branch.voltage_lv_kv <= 0:
                        report = report.with_error(ValidationIssue(
                            code="transformer.lv_invalid",
                            message="Transformer LV voltage must be > 0",
                            element_id=branch_id,
                            field="voltage_lv_kv",
                        ))
        return report

    def _check_slack_node(self, graph, report: ValidationReport) -> ValidationReport:
        """
        Check for exactly one SLACK node for power flow.
        """
        from network_model.core.node import NodeType

        slack_nodes = [
            node_id for node_id, node in graph.nodes.items()
            if node.node_type == NodeType.SLACK
        ]

        if len(slack_nodes) == 0:
            return report.with_error(ValidationIssue(
                code="network.no_slack",
                message="Network has no SLACK node (required for power flow)",
            ))

        if len(slack_nodes) > 1:
            return report.with_error(ValidationIssue(
                code="network.multiple_slack",
                message=f"Network has {len(slack_nodes)} SLACK nodes, expected 1",
            ))

        return report


def validate_network(graph) -> ValidationReport:
    """
    Convenience function to validate a network graph.

    Args:
        graph: NetworkGraph instance.

    Returns:
        ValidationReport with all issues.
    """
    validator = NetworkValidator()
    return validator.validate(graph)
