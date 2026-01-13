"""
Branch module for power network modeling.

Contains classes for modeling different types of network branches:
lines, cables, and transformers.
"""

import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict


class BranchType(Enum):
    """Enumeration of branch types in the network model."""

    LINE = "LINE"
    CABLE = "CABLE"
    TRANSFORMER = "TRANSFORMER"


@dataclass
class Branch(ABC):
    """
    Abstract base class for all branch types in the network.

    Attributes:
        id: Unique identifier for the branch.
        from_node: ID of the source node.
        to_node: ID of the target node.
        branch_type: Type of the branch (LINE, CABLE, TRANSFORMER).
        name: Optional name/description of the branch.
    """

    id: str
    from_node: str
    to_node: str
    branch_type: BranchType
    name: str = ""

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Branch":
        """
        Create a Branch instance from a dictionary.

        Dispatches to the appropriate subclass based on branch_type.

        Args:
            data: Dictionary containing branch data.

        Returns:
            Branch instance (LineBranch or TransformerBranch).

        Raises:
            ValueError: If branch_type is missing or invalid.
        """
        raw_type = data.get("branch_type")

        if raw_type is None:
            raise ValueError("Missing 'branch_type' in data")

        # Handle both string and BranchType enum inputs
        if isinstance(raw_type, BranchType):
            branch_type = raw_type
        elif isinstance(raw_type, str):
            try:
                branch_type = BranchType(raw_type)
            except ValueError:
                valid_types = [bt.value for bt in BranchType]
                raise ValueError(
                    f"Unknown branch_type: '{raw_type}'. "
                    f"Valid types are: {valid_types}"
                )
        else:
            raise ValueError(
                f"branch_type must be a string or BranchType enum, "
                f"got {type(raw_type).__name__}"
            )

        # Dispatch to appropriate subclass
        if branch_type in (BranchType.LINE, BranchType.CABLE):
            return LineBranch._from_dict(data, branch_type)
        elif branch_type == BranchType.TRANSFORMER:
            return TransformerBranch._from_dict(data)
        else:
            # This should not be reachable if BranchType enum is complete
            raise ValueError(f"Unhandled branch_type: {branch_type}")

    def validate(self) -> bool:
        """
        Validate the branch data.

        Returns:
            True if valid, False otherwise.
        """
        # Check that branch_type is a proper BranchType enum instance
        if not isinstance(self.branch_type, BranchType):
            return False

        # Validate required string fields
        if not self.id or not isinstance(self.id, str):
            return False
        if not self.from_node or not isinstance(self.from_node, str):
            return False
        if not self.to_node or not isinstance(self.to_node, str):
            return False

        return True

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert the branch to a dictionary representation."""
        pass

    @abstractmethod
    def get_impedance(self) -> complex:
        """Get the series impedance of the branch."""
        pass

    @abstractmethod
    def get_admittance(self) -> complex:
        """Get the shunt admittance of the branch."""
        pass


@dataclass
class LineBranch(Branch):
    """
    Line or cable branch in the network.

    Attributes:
        r_ohm_per_km: Resistance per kilometer [Ohm/km].
        x_ohm_per_km: Reactance per kilometer [Ohm/km].
        b_us_per_km: Susceptance per kilometer [uS/km] (micro-Siemens).
        length_km: Length of the line/cable [km].
        rated_current_a: Rated current capacity [A].
    """

    r_ohm_per_km: float = 0.0
    x_ohm_per_km: float = 0.0
    b_us_per_km: float = 0.0
    length_km: float = 0.0
    rated_current_a: float = 0.0

    @classmethod
    def _from_dict(cls, data: Dict[str, Any], branch_type: BranchType) -> "LineBranch":
        """
        Create a LineBranch from dictionary data.

        Args:
            data: Dictionary containing line branch data.
            branch_type: The branch type (LINE or CABLE).

        Returns:
            LineBranch instance.
        """
        return cls(
            id=data.get("id", ""),
            from_node=data.get("from_node", ""),
            to_node=data.get("to_node", ""),
            branch_type=branch_type,
            name=data.get("name", ""),
            r_ohm_per_km=float(data.get("r_ohm_per_km", 0.0)),
            x_ohm_per_km=float(data.get("x_ohm_per_km", 0.0)),
            b_us_per_km=float(data.get("b_us_per_km", 0.0)),
            length_km=float(data.get("length_km", 0.0)),
            rated_current_a=float(data.get("rated_current_a", 0.0)),
        )

    def validate(self) -> bool:
        """
        Validate the line branch data.

        Returns:
            True if valid, False otherwise.
        """
        if not super().validate():
            return False

        # Validate finiteness of numeric fields (no NaN or infinity)
        numeric_fields = [
            self.r_ohm_per_km,
            self.x_ohm_per_km,
            self.b_us_per_km,
            self.length_km,
            self.rated_current_a,
        ]
        for value in numeric_fields:
            if not math.isfinite(value):
                return False

        # Validate non-negative values where required
        if self.length_km < 0:
            return False
        if self.rated_current_a < 0:
            return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the line branch to a dictionary.

        Returns:
            Dictionary representation of the line branch.
        """
        return {
            "id": self.id,
            "from_node": self.from_node,
            "to_node": self.to_node,
            "branch_type": self.branch_type.value,
            "name": self.name,
            "r_ohm_per_km": self.r_ohm_per_km,
            "x_ohm_per_km": self.x_ohm_per_km,
            "b_us_per_km": self.b_us_per_km,
            "length_km": self.length_km,
            "rated_current_a": self.rated_current_a,
        }

    def get_impedance(self) -> complex:
        """
        Calculate the total series impedance of the line.

        Returns:
            Complex impedance Z = R + jX [Ohm].
        """
        r_total = self.r_ohm_per_km * self.length_km
        x_total = self.x_ohm_per_km * self.length_km
        return complex(r_total, x_total)

    def get_admittance(self) -> complex:
        """
        Calculate the total shunt admittance of the line.

        The susceptance is given in uS/km (micro-Siemens per km),
        so we convert to Siemens: B [S] = b_us_per_km * 1e-6 * length_km

        Returns:
            Complex shunt admittance Y_sh = jB [S].
        """
        # Convert from uS/km to S total
        b_total_s = self.b_us_per_km * 1e-6 * self.length_km
        return complex(0, b_total_s)


@dataclass
class TransformerBranch(Branch):
    """
    Transformer branch in the network.

    Attributes:
        rated_power_mva: Rated apparent power [MVA].
        voltage_hv_kv: High voltage side nominal voltage [kV].
        voltage_lv_kv: Low voltage side nominal voltage [kV].
        uk_percent: Short-circuit voltage [%].
        pk_kw: Short-circuit losses (copper losses) [kW].
        i0_percent: No-load current [%].
        p0_kw: No-load losses (iron losses) [kW].
        tap_step_percent: Tap step size [%].
    """

    rated_power_mva: float = 0.0
    voltage_hv_kv: float = 0.0
    voltage_lv_kv: float = 0.0
    uk_percent: float = 0.0
    pk_kw: float = 0.0
    i0_percent: float = 0.0
    p0_kw: float = 0.0
    tap_step_percent: float = 0.0

    @classmethod
    def _from_dict(cls, data: Dict[str, Any]) -> "TransformerBranch":
        """
        Create a TransformerBranch from dictionary data.

        Args:
            data: Dictionary containing transformer branch data.

        Returns:
            TransformerBranch instance.
        """
        return cls(
            id=data.get("id", ""),
            from_node=data.get("from_node", ""),
            to_node=data.get("to_node", ""),
            branch_type=BranchType.TRANSFORMER,
            name=data.get("name", ""),
            rated_power_mva=float(data.get("rated_power_mva", 0.0)),
            voltage_hv_kv=float(data.get("voltage_hv_kv", 0.0)),
            voltage_lv_kv=float(data.get("voltage_lv_kv", 0.0)),
            uk_percent=float(data.get("uk_percent", 0.0)),
            pk_kw=float(data.get("pk_kw", 0.0)),
            i0_percent=float(data.get("i0_percent", 0.0)),
            p0_kw=float(data.get("p0_kw", 0.0)),
            tap_step_percent=float(data.get("tap_step_percent", 0.0)),
        )

    def validate(self) -> bool:
        """
        Validate the transformer branch data.

        Returns:
            True if valid, False otherwise.
        """
        if not super().validate():
            return False

        # Validate finiteness of numeric fields (no NaN or infinity)
        numeric_fields = [
            self.rated_power_mva,
            self.voltage_hv_kv,
            self.voltage_lv_kv,
            self.uk_percent,
            self.pk_kw,
            self.i0_percent,
            self.p0_kw,
            self.tap_step_percent,
        ]
        for value in numeric_fields:
            if not math.isfinite(value):
                return False

        # Validate positive values where required
        if self.rated_power_mva <= 0:
            return False
        if self.voltage_hv_kv <= 0:
            return False
        if self.voltage_lv_kv <= 0:
            return False

        return True

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the transformer branch to a dictionary.

        Returns:
            Dictionary representation of the transformer branch.
        """
        return {
            "id": self.id,
            "from_node": self.from_node,
            "to_node": self.to_node,
            "branch_type": self.branch_type.value,
            "name": self.name,
            "rated_power_mva": self.rated_power_mva,
            "voltage_hv_kv": self.voltage_hv_kv,
            "voltage_lv_kv": self.voltage_lv_kv,
            "uk_percent": self.uk_percent,
            "pk_kw": self.pk_kw,
            "i0_percent": self.i0_percent,
            "p0_kw": self.p0_kw,
            "tap_step_percent": self.tap_step_percent,
        }

    def get_impedance_pu(self, base_mva: float) -> complex:
        """
        Calculate the per-unit impedance of the transformer.

        The impedance is first calculated at the transformer's rated MVA,
        then scaled to the specified base MVA.

        Formulas:
            z_pu_sn = uk_percent / 100
            r_pu_sn = (pk_kw / 1000) / rated_power_mva
            x_pu_sn = sqrt(z_pu_sn^2 - r_pu_sn^2)

        Scaling to base_mva:
            z_pu_base = z_pu_sn * (base_mva / rated_power_mva)

        Args:
            base_mva: Base power for per-unit calculation [MVA].

        Returns:
            Complex per-unit impedance Z_pu = R_pu + jX_pu.
        """
        # Calculate per-unit values at rated power
        z_pu_sn = self.uk_percent / 100.0
        r_pu_sn = (self.pk_kw / 1000.0) / self.rated_power_mva

        # Calculate reactance (ensure non-negative under sqrt)
        z_squared = z_pu_sn * z_pu_sn
        r_squared = r_pu_sn * r_pu_sn
        x_pu_sn = math.sqrt(max(0.0, z_squared - r_squared))

        # Scale to the specified base MVA
        scale_factor = base_mva / self.rated_power_mva
        r_pu_base = r_pu_sn * scale_factor
        x_pu_base = x_pu_sn * scale_factor

        return complex(r_pu_base, x_pu_base)

    def get_impedance(self) -> complex:
        """
        Get the series impedance of the transformer in Ohms.

        Converts per-unit impedance to Ohms using the HV side voltage.

        Returns:
            Complex impedance Z [Ohm].
        """
        z_pu = self.get_impedance_pu(self.rated_power_mva)
        # Z_base = V^2 / S
        z_base = (self.voltage_hv_kv ** 2) / self.rated_power_mva
        return z_pu * z_base

    def get_admittance(self) -> complex:
        """
        Get the shunt admittance of the transformer (magnetizing branch).

        Calculates from no-load losses and no-load current.

        Returns:
            Complex shunt admittance Y_sh = G + jB [S].
        """
        if self.rated_power_mva <= 0 or self.voltage_hv_kv <= 0:
            return complex(0, 0)

        # Conductance from no-load losses: G = P0 / V^2
        # (P0 in MW, V in kV -> G in S)
        g_s = (self.p0_kw / 1000.0) / (self.voltage_hv_kv ** 2)

        # Susceptance from no-load current
        # I0 (%) = |Y_sh| * V / (S/V) * 100
        # |Y_sh| = I0 / 100 * S / V^2
        y_mag = (self.i0_percent / 100.0) * self.rated_power_mva / (self.voltage_hv_kv ** 2)

        # B = sqrt(|Y|^2 - G^2), with B negative (capacitive magnetizing current)
        b_squared = max(0.0, y_mag ** 2 - g_s ** 2)
        b_s = -math.sqrt(b_squared)

        return complex(g_s, b_s)
