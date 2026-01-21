from __future__ import annotations

from typing import Any


def build_voltage_violations(
    node_u_mag_pu: dict[str, float],
    bus_limits: list[Any],
) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    for limit in bus_limits:
        if limit.node_id not in node_u_mag_pu:
            continue
        value = node_u_mag_pu[limit.node_id]
        if value < limit.u_min_pu:
            violations.append(
                {
                    "type": "bus_voltage",
                    "id": limit.node_id,
                    "value": float(value),
                    "limit": float(limit.u_min_pu),
                    "severity": float(value / limit.u_min_pu),
                    "direction": "under",
                }
            )
        if value > limit.u_max_pu:
            violations.append(
                {
                    "type": "bus_voltage",
                    "id": limit.node_id,
                    "value": float(value),
                    "limit": float(limit.u_max_pu),
                    "severity": float(value / limit.u_max_pu),
                    "direction": "over",
                }
            )
    return violations
