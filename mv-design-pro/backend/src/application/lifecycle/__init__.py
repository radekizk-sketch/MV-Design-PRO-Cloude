"""
P10a Lifecycle Management — STATE / LIFECYCLE

Application service for managing Project → StudyCase → Run → Snapshot lifecycle.

RESPONSIBILITIES:
- Result invalidation when network model changes
- Snapshot binding updates for cases and runs
- Project-level active snapshot management
"""

from .service import LifecycleService

__all__ = ["LifecycleService"]
