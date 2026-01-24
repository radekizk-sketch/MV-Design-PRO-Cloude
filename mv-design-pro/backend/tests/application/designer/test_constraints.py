from __future__ import annotations

from typing import cast

from application.designer.actions import ActionType
from application.designer.constraints import Allowed, Blocked, can_run
from application.designer.context import ProjectContext
from application.designer.messages import BlockedCode
from application.designer.state import ProjectState


def _context(network_complete: bool, results: set[ActionType] | None = None) -> ProjectContext:
    state = ProjectState(
        available_results=results or set(),
        completeness_flags={"network_complete": network_complete},
    )
    return ProjectContext(state=state)


def test_can_run_blocks_incomplete_network() -> None:
    decision = can_run(ActionType.SHORT_CIRCUIT, _context(network_complete=False))

    assert isinstance(decision, Blocked)
    assert decision.reason.code == BlockedCode.NETWORK_INCOMPLETE


def test_can_run_allows_power_flow_for_complete_network() -> None:
    decision = can_run(ActionType.POWER_FLOW, _context(network_complete=True))

    assert isinstance(decision, Allowed)


def test_can_run_blocks_analysis_without_results() -> None:
    decision = can_run(ActionType.ANALYSIS, _context(network_complete=True))

    assert isinstance(decision, Blocked)
    assert decision.reason.code == BlockedCode.NO_SOLVER_RESULTS


def test_can_run_allows_analysis_with_results() -> None:
    decision = can_run(
        ActionType.ANALYSIS,
        _context(network_complete=True, results={ActionType.SHORT_CIRCUIT}),
    )

    assert isinstance(decision, Allowed)


def test_can_run_blocks_unsupported_action() -> None:
    decision = can_run(cast(ActionType, "unsupported_action"), _context(network_complete=True))

    assert isinstance(decision, Blocked)
    assert decision.reason.code == BlockedCode.UNSUPPORTED_ACTION
