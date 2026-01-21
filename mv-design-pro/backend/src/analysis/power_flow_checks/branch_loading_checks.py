from __future__ import annotations

from typing import Any

from network_model.core.branch import LineBranch, TransformerBranch
from network_model.core.graph import NetworkGraph


def build_branch_violations(
    branch_s_from_mva: dict[str, complex],
    branch_s_to_mva: dict[str, complex],
    branch_current_ka: dict[str, float],
    branch_limits: list[Any],
    graph: NetworkGraph,
) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    branch_limit_map = {limit.branch_id: limit for limit in branch_limits}

    for branch_id, branch in graph.branches.items():
        if not branch.in_service:
            continue
        if branch_id not in branch_s_from_mva and branch_id not in branch_s_to_mva:
            continue
        s_limit = None
        i_limit = None

        if branch_id in branch_limit_map:
            spec = branch_limit_map[branch_id]
            s_limit = spec.s_max_mva
            i_limit = spec.i_max_ka
        else:
            if isinstance(branch, TransformerBranch) and branch.rated_power_mva > 0:
                s_limit = branch.rated_power_mva
            if isinstance(branch, LineBranch) and branch.rated_current_a > 0:
                i_limit = branch.rated_current_a / 1000.0

        if s_limit is not None:
            s_from = abs(branch_s_from_mva.get(branch_id, 0.0 + 0.0j))
            s_to = abs(branch_s_to_mva.get(branch_id, 0.0 + 0.0j))
            s_value = max(s_from, s_to)
            if s_value > s_limit:
                violations.append(
                    {
                        "type": "branch_loading",
                        "id": branch_id,
                        "value": float(s_value),
                        "limit": float(s_limit),
                        "severity": float(s_value / s_limit),
                        "direction": "over",
                    }
                )

        if i_limit is not None and branch_id in branch_current_ka:
            i_value = branch_current_ka[branch_id]
            if i_value > i_limit:
                violations.append(
                    {
                        "type": "branch_current",
                        "id": branch_id,
                        "value": float(i_value),
                        "limit": float(i_limit),
                        "severity": float(i_value / i_limit),
                        "direction": "over",
                    }
                )

    return violations
