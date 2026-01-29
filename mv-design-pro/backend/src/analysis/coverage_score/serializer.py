from __future__ import annotations

from typing import Any

from analysis.coverage_score.models import CoverageScoreView


def view_to_dict(view: CoverageScoreView) -> dict[str, Any]:
    return {
        "analysis_id": view.analysis_id,
        "context": view.context.to_dict() if view.context else None,
        "total_score": float(view.total_score),
        "missing_items": list(view.missing_items),
        "critical_gaps": list(view.critical_gaps),
    }
