"""
FixAction — deterministyczne sugestie naprawcze dla ValidationIssue.

FixAction NIE wykonuje mutacji modelu.
To jest deklaratywny opis akcji, którą projektant może podjąć.
Brak heurystyki. Brak automatycznych napraw. Brak fallbacków.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class FixAction(BaseModel):
    """Deterministyczna sugestia naprawcza.

    Opisuje akcję UI do podjęcia — nie modyfikuje modelu.
    """

    action_type: Literal[
        "OPEN_MODAL",
        "NAVIGATE_TO_ELEMENT",
        "SELECT_CATALOG",
        "ADD_MISSING_DEVICE",
    ]
    element_ref: str | None = None
    modal_type: str | None = None
    payload_hint: dict | None = None
