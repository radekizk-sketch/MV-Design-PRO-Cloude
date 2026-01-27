"""
Conftest dla testów Proof Engine.

Proof Engine nie wymaga FastAPI ani bazy danych - jest standalone.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend/src to path for imports
backend_src = Path(__file__).parents[2] / "src"
sys.path.insert(0, str(backend_src))
