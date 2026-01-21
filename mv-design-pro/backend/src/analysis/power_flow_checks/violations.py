from __future__ import annotations

from typing import Any, Iterable


def merge_and_sort_violations(
    violation_groups: Iterable[Iterable[dict[str, Any]]],
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    for group in violation_groups:
        merged.extend(group)
    merged.sort(key=lambda item: item["severity"], reverse=True)
    return merged


def summarize_violations(violations: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {"count": len(violations), "by_type": {}}
    for violation in violations:
        summary["by_type"].setdefault(violation["type"], 0)
        summary["by_type"][violation["type"]] += 1
    summary["top"] = violations[:3]
    return summary
