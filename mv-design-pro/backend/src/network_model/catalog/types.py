"""
Immutable type definitions for network elements.

PowerFactory Alignment:
- All types are FROZEN (immutable)
- Types define physical parameters
- Instances reference types and add local parameters (e.g., length)

Usage:
    line_type = LineType(
        id="...",
        name="ACSR 240",
        r_ohm_per_km=0.12,
        x_ohm_per_km=0.39,
        b_us_per_km=2.82,
        rated_current_a=645,
    )

    # Instance references type and adds local params
    line = LineBranch(
        type_ref=line_type.id,
        length_km=5.2,  # Local parameter
    )
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional
from uuid import uuid4


@dataclass(frozen=True)
class LineType:
    """
    Immutable overhead line type definition.

    Contains all physical parameters for an overhead line conductor.
    Instances (LineBranch) reference this type and add local parameters.

    Attributes:
        id: Unique identifier.
        name: Type name (e.g., "ACSR 240/40").
        manufacturer: Manufacturer name (optional).
        standard: Standard designation (optional).
        r_ohm_per_km: Resistance per unit length [Ω/km].
        x_ohm_per_km: Reactance per unit length [Ω/km].
        b_us_per_km: Susceptance per unit length [μS/km].
        rated_current_a: Continuous current rating [A].
        max_temperature_c: Maximum operating temperature [°C].
        voltage_rating_kv: Rated voltage [kV].
        conductor_material: Conductor material (e.g., "ACSR", "AAC").
        cross_section_mm2: Conductor cross-section [mm²].
    """
    id: str
    name: str
    r_ohm_per_km: float
    x_ohm_per_km: float
    b_us_per_km: float = 0.0
    rated_current_a: float = 0.0
    manufacturer: Optional[str] = None
    standard: Optional[str] = None
    max_temperature_c: float = 70.0
    voltage_rating_kv: float = 0.0
    conductor_material: Optional[str] = None
    cross_section_mm2: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "r_ohm_per_km": self.r_ohm_per_km,
            "x_ohm_per_km": self.x_ohm_per_km,
            "b_us_per_km": self.b_us_per_km,
            "rated_current_a": self.rated_current_a,
            "manufacturer": self.manufacturer,
            "standard": self.standard,
            "max_temperature_c": self.max_temperature_c,
            "voltage_rating_kv": self.voltage_rating_kv,
            "conductor_material": self.conductor_material,
            "cross_section_mm2": self.cross_section_mm2,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LineType":
        """Create from dictionary."""
        return cls(
            id=str(data.get("id", str(uuid4()))),
            name=str(data.get("name", "")),
            r_ohm_per_km=float(data.get("r_ohm_per_km", 0.0)),
            x_ohm_per_km=float(data.get("x_ohm_per_km", 0.0)),
            b_us_per_km=float(data.get("b_us_per_km", 0.0)),
            rated_current_a=float(data.get("rated_current_a", 0.0)),
            manufacturer=data.get("manufacturer"),
            standard=data.get("standard"),
            max_temperature_c=float(data.get("max_temperature_c", 70.0)),
            voltage_rating_kv=float(data.get("voltage_rating_kv", 0.0)),
            conductor_material=data.get("conductor_material"),
            cross_section_mm2=float(data.get("cross_section_mm2", 0.0)),
        )


@dataclass(frozen=True)
class CableType:
    """
    Immutable underground cable type definition.

    Contains all physical parameters for an underground cable.

    Attributes:
        id: Unique identifier.
        name: Type name (e.g., "NA2XS(F)2Y 1x240").
        manufacturer: Manufacturer name (optional).
        r_ohm_per_km: Resistance per unit length [Ω/km].
        x_ohm_per_km: Reactance per unit length [Ω/km].
        c_nf_per_km: Capacitance per unit length [nF/km].
        rated_current_a: Continuous current rating [A].
        voltage_rating_kv: Rated voltage [kV].
        insulation_type: Insulation type (e.g., "XLPE", "EPR").
        standard: Standard designation (optional).
        conductor_material: Conductor material (e.g., "Al", "Cu").
        cross_section_mm2: Conductor cross-section [mm²].
        max_temperature_c: Maximum operating temperature [°C].
    """
    id: str
    name: str
    r_ohm_per_km: float
    x_ohm_per_km: float
    c_nf_per_km: float = 0.0
    rated_current_a: float = 0.0
    manufacturer: Optional[str] = None
    voltage_rating_kv: float = 0.0
    insulation_type: Optional[str] = None
    standard: Optional[str] = None
    conductor_material: Optional[str] = None
    cross_section_mm2: float = 0.0
    max_temperature_c: float = 90.0

    @property
    def b_us_per_km(self) -> float:
        """
        Calculate susceptance from capacitance.

        B [μS/km] = 2 * π * f * C [nF/km] * 1e-3
        Assuming f = 50 Hz
        """
        return 2 * 3.14159 * 50 * self.c_nf_per_km * 1e-3

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "r_ohm_per_km": self.r_ohm_per_km,
            "x_ohm_per_km": self.x_ohm_per_km,
            "c_nf_per_km": self.c_nf_per_km,
            "b_us_per_km": self.b_us_per_km,
            "rated_current_a": self.rated_current_a,
            "manufacturer": self.manufacturer,
            "voltage_rating_kv": self.voltage_rating_kv,
            "insulation_type": self.insulation_type,
            "standard": self.standard,
            "conductor_material": self.conductor_material,
            "cross_section_mm2": self.cross_section_mm2,
            "max_temperature_c": self.max_temperature_c,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CableType":
        """Create from dictionary."""
        return cls(
            id=str(data.get("id", str(uuid4()))),
            name=str(data.get("name", "")),
            r_ohm_per_km=float(data.get("r_ohm_per_km", 0.0)),
            x_ohm_per_km=float(data.get("x_ohm_per_km", 0.0)),
            c_nf_per_km=float(data.get("c_nf_per_km", 0.0)),
            rated_current_a=float(data.get("rated_current_a", 0.0)),
            manufacturer=data.get("manufacturer"),
            voltage_rating_kv=float(data.get("voltage_rating_kv", 0.0)),
            insulation_type=data.get("insulation_type"),
            standard=data.get("standard"),
            conductor_material=data.get("conductor_material"),
            cross_section_mm2=float(data.get("cross_section_mm2", 0.0)),
            max_temperature_c=float(data.get("max_temperature_c", 90.0)),
        )


@dataclass(frozen=True)
class TransformerType:
    """
    Immutable transformer type definition.

    Contains all nameplate and short-circuit parameters.

    Attributes:
        id: Unique identifier.
        name: Type name (e.g., "ONAN 10MVA 110/15kV").
        manufacturer: Manufacturer name (optional).
        rated_power_mva: Rated apparent power [MVA].
        voltage_hv_kv: High voltage side nominal [kV].
        voltage_lv_kv: Low voltage side nominal [kV].
        uk_percent: Short-circuit voltage [%].
        pk_kw: Short-circuit losses [kW].
        i0_percent: No-load current [%].
        p0_kw: No-load losses [kW].
        vector_group: Vector group (e.g., "Dyn11").
        cooling_class: Cooling class (e.g., "ONAN", "ONAF").
        tap_min: Minimum tap position.
        tap_max: Maximum tap position.
        tap_step_percent: Tap step size [%].
    """
    id: str
    name: str
    rated_power_mva: float
    voltage_hv_kv: float
    voltage_lv_kv: float
    uk_percent: float
    pk_kw: float = 0.0
    manufacturer: Optional[str] = None
    i0_percent: float = 0.0
    p0_kw: float = 0.0
    vector_group: str = "Dyn11"
    cooling_class: Optional[str] = None
    tap_min: int = -5
    tap_max: int = 5
    tap_step_percent: float = 2.5

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "rated_power_mva": self.rated_power_mva,
            "voltage_hv_kv": self.voltage_hv_kv,
            "voltage_lv_kv": self.voltage_lv_kv,
            "uk_percent": self.uk_percent,
            "pk_kw": self.pk_kw,
            "manufacturer": self.manufacturer,
            "i0_percent": self.i0_percent,
            "p0_kw": self.p0_kw,
            "vector_group": self.vector_group,
            "cooling_class": self.cooling_class,
            "tap_min": self.tap_min,
            "tap_max": self.tap_max,
            "tap_step_percent": self.tap_step_percent,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TransformerType":
        """Create from dictionary."""
        return cls(
            id=str(data.get("id", str(uuid4()))),
            name=str(data.get("name", "")),
            rated_power_mva=float(data.get("rated_power_mva", 0.0)),
            voltage_hv_kv=float(data.get("voltage_hv_kv", 0.0)),
            voltage_lv_kv=float(data.get("voltage_lv_kv", 0.0)),
            uk_percent=float(data.get("uk_percent", 0.0)),
            pk_kw=float(data.get("pk_kw", 0.0)),
            manufacturer=data.get("manufacturer"),
            i0_percent=float(data.get("i0_percent", 0.0)),
            p0_kw=float(data.get("p0_kw", 0.0)),
            vector_group=str(data.get("vector_group", "Dyn11")),
            cooling_class=data.get("cooling_class"),
            tap_min=int(data.get("tap_min", -5)),
            tap_max=int(data.get("tap_max", 5)),
            tap_step_percent=float(data.get("tap_step_percent", 2.5)),
        )


@dataclass(frozen=True)
class SwitchEquipmentType:
    """
    Immutable switch type definition.

    Note: This defines switch EQUIPMENT type, not the state (OPEN/CLOSED).
    Switches have NO impedance.

    Attributes:
        id: Unique identifier.
        name: Type name (e.g., "ABB VD4 12kV").
        manufacturer: Manufacturer name (optional).
        equipment_kind: Equipment kind (CIRCUIT_BREAKER, DISCONNECTOR, EARTH_SWITCH).
        un_kv: Rated voltage [kV].
        in_a: Rated current [A].
        ik_ka: Short-circuit breaking current [kA] (for breakers).
        icw_ka: Short-time withstand current [kA] (for disconnectors).
        medium: Quenching medium (e.g., "SF6", "VACUUM").
    """
    id: str
    name: str
    manufacturer: Optional[str] = None
    equipment_kind: str = "CIRCUIT_BREAKER"
    un_kv: float = 0.0
    in_a: float = 0.0
    ik_ka: float = 0.0
    icw_ka: float = 0.0
    medium: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "manufacturer": self.manufacturer,
            "equipment_kind": self.equipment_kind,
            "un_kv": self.un_kv,
            "in_a": self.in_a,
            "ik_ka": self.ik_ka,
            "icw_ka": self.icw_ka,
            "medium": self.medium,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SwitchEquipmentType":
        """Create from dictionary."""
        return cls(
            id=str(data.get("id", str(uuid4()))),
            name=str(data.get("name", "")),
            manufacturer=data.get("manufacturer"),
            equipment_kind=str(data.get("equipment_kind", "CIRCUIT_BREAKER")),
            un_kv=float(data.get("un_kv", 0.0)),
            in_a=float(data.get("in_a", 0.0)),
            ik_ka=float(data.get("ik_ka", 0.0)),
            icw_ka=float(data.get("icw_ka", 0.0)),
            medium=data.get("medium"),
        )


@dataclass(frozen=True)
class ConverterKind(Enum):
    PV = "PV"
    WIND = "WIND"
    BESS = "BESS"


@dataclass(frozen=True)
class ConverterType:
    """
    Immutable converter-based source type definition.

    Attributes:
        id: Unique identifier.
        name: Type name.
        kind: Converter kind (PV/WIND/BESS).
        un_kv: Rated voltage [kV].
        sn_mva: Rated apparent power [MVA].
        pmax_mw: Maximum active power [MW].
        qmin_mvar: Minimum reactive power [MVAr] (optional).
        qmax_mvar: Maximum reactive power [MVAr] (optional).
        cosphi_min: Minimum cos(phi) (optional).
        cosphi_max: Maximum cos(phi) (optional).
        e_kwh: Nameplate energy [kWh] (optional, BESS only).
        manufacturer: Manufacturer name (optional).
        model: Model designation (optional).
    """

    id: str
    name: str
    kind: ConverterKind
    un_kv: float
    sn_mva: float
    pmax_mw: float
    qmin_mvar: Optional[float] = None
    qmax_mvar: Optional[float] = None
    cosphi_min: Optional[float] = None
    cosphi_max: Optional[float] = None
    e_kwh: Optional[float] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind.value,
            "un_kv": self.un_kv,
            "sn_mva": self.sn_mva,
            "pmax_mw": self.pmax_mw,
            "qmin_mvar": self.qmin_mvar,
            "qmax_mvar": self.qmax_mvar,
            "cosphi_min": self.cosphi_min,
            "cosphi_max": self.cosphi_max,
            "e_kwh": self.e_kwh,
            "manufacturer": self.manufacturer,
            "model": self.model,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConverterType":
        """Create from dictionary."""
        kind = data.get("kind") or data.get("converter_kind") or ConverterKind.PV.value
        return cls(
            id=str(data.get("id", str(uuid4()))),
            name=str(data.get("name", "")),
            kind=ConverterKind(str(kind).upper()),
            un_kv=float(data.get("un_kv", 0.0)),
            sn_mva=float(data.get("sn_mva", 0.0)),
            pmax_mw=float(data.get("pmax_mw", 0.0)),
            qmin_mvar=(
                float(data.get("qmin_mvar"))
                if data.get("qmin_mvar") is not None
                else None
            ),
            qmax_mvar=(
                float(data.get("qmax_mvar"))
                if data.get("qmax_mvar") is not None
                else None
            ),
            cosphi_min=(
                float(data.get("cosphi_min"))
                if data.get("cosphi_min") is not None
                else None
            ),
            cosphi_max=(
                float(data.get("cosphi_max"))
                if data.get("cosphi_max") is not None
                else None
            ),
            e_kwh=(
                float(data.get("e_kwh"))
                if data.get("e_kwh") is not None
                else None
            ),
            manufacturer=data.get("manufacturer"),
            model=data.get("model"),
        )


@dataclass(frozen=True)
class InverterType:
    """
    Immutable inverter type definition.

    Attributes:
        id: Unique identifier.
        name: Type name.
        un_kv: Rated voltage [kV].
        sn_mva: Rated apparent power [MVA].
        pmax_mw: Maximum active power [MW].
        qmin_mvar: Minimum reactive power [MVAr] (optional).
        qmax_mvar: Maximum reactive power [MVAr] (optional).
        cosphi_min: Minimum cos(phi) (optional).
        cosphi_max: Maximum cos(phi) (optional).
        manufacturer: Manufacturer name (optional).
        model: Model designation (optional).
    """

    id: str
    name: str
    un_kv: float
    sn_mva: float
    pmax_mw: float
    qmin_mvar: Optional[float] = None
    qmax_mvar: Optional[float] = None
    cosphi_min: Optional[float] = None
    cosphi_max: Optional[float] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "un_kv": self.un_kv,
            "sn_mva": self.sn_mva,
            "pmax_mw": self.pmax_mw,
            "qmin_mvar": self.qmin_mvar,
            "qmax_mvar": self.qmax_mvar,
            "cosphi_min": self.cosphi_min,
            "cosphi_max": self.cosphi_max,
            "manufacturer": self.manufacturer,
            "model": self.model,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "InverterType":
        """Create from dictionary."""
        return cls(
            id=str(data.get("id", str(uuid4()))),
            name=str(data.get("name", "")),
            un_kv=float(data.get("un_kv", 0.0)),
            sn_mva=float(data.get("sn_mva", 0.0)),
            pmax_mw=float(data.get("pmax_mw", 0.0)),
            qmin_mvar=(
                float(data.get("qmin_mvar"))
                if data.get("qmin_mvar") is not None
                else None
            ),
            qmax_mvar=(
                float(data.get("qmax_mvar"))
                if data.get("qmax_mvar") is not None
                else None
            ),
            cosphi_min=(
                float(data.get("cosphi_min"))
                if data.get("cosphi_min") is not None
                else None
            ),
            cosphi_max=(
                float(data.get("cosphi_max"))
                if data.get("cosphi_max") is not None
                else None
            ),
            manufacturer=data.get("manufacturer"),
            model=data.get("model"),
        )
