"""
Definicje źródeł falownikowych (OZE) dla obliczeń zwarciowych IEC 60909.
"""

from dataclasses import dataclass, field
import uuid


@dataclass
class InverterSource:
    """
    Źródło falownikowe modelowane jako ograniczone źródło prądowe IEC 60909.

    Model uproszczony: wkład tylko jako prąd RMS w punkcie zwarcia,
    bez modelowania impedancji wewnętrznej.
    """

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = field(default="")
    node_id: str = field(default="")
    in_rated_a: float = field(default=0.0)
    k_sc: float = field(default=1.1)
    contributes_negative_sequence: bool = field(default=False)
    contributes_zero_sequence: bool = field(default=False)
    in_service: bool = field(default=True)

    @property
    def ik_sc_a(self) -> float:
        """
        Zwraca RMS wkład prądowy do zwarcia: Ik = k_sc * In.
        """
        return self.k_sc * self.in_rated_a
