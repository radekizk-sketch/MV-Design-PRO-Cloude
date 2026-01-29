"""
P10b Comparison Service — Case A/B Result Comparison

CANONICAL ALIGNMENT:
- P10b: Result State + Case A/B Comparison (BACKEND ONLY)
- Read-only comparison between two Study Runs
- No physics, no mutations, no solver invocation

USAGE:
    from application.comparison import ComparisonService

    service = ComparisonService(uow_factory)
    result = service.compare_runs(run_a_id, run_b_id)
"""

from application.comparison.service import ComparisonService

__all__ = ["ComparisonService"]
