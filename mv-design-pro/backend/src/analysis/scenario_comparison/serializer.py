from __future__ import annotations

from typing import Any

from analysis.scenario_comparison.models import ScenarioComparisonEntry, ScenarioComparisonView


def entry_to_dict(entry: ScenarioComparisonEntry) -> dict[str, Any]:
    return {
        "scenario_id": entry.scenario_id,
        "scenario_name": entry.scenario_name,
        "risk_score": float(entry.risk_score),
        "delta_margin": float(entry.delta_margin) if entry.delta_margin is not None else None,
        "delta_risk_rank": int(entry.delta_risk_rank),
        "not_computed_count": int(entry.not_computed_count),
        "key_drivers": list(entry.key_drivers),
        "winner_flag": bool(entry.winner_flag),
        "why_pl": entry.why_pl,
    }


def view_to_dict(view: ScenarioComparisonView) -> dict[str, Any]:
    return {
        "comparison_id": view.comparison_id,
        "study_id": view.study_id,
        "generated_at": view.generated_at.isoformat(),
        "scenarios": [entry_to_dict(entry) for entry in view.scenarios],
        "winner_scenario_id": view.winner_scenario_id,
    }
