"""
EnergyNetworkModel (ENM) — Pydantic v2 canonical models.

Kanoniczny kontrakt modelu sieci elektroenergetycznej.
Jedno źródło prawdy dla projektu (case-bound).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Supporting types
# ---------------------------------------------------------------------------


class GroundingConfig(BaseModel):
    type: Literal["isolated", "petersen_coil", "directly_grounded", "resistor_grounded"]
    r_ohm: float | None = None
    x_ohm: float | None = None


class BusLimits(BaseModel):
    u_min_pu: float | None = None
    u_max_pu: float | None = None


class BranchRating(BaseModel):
    in_a: float | None = None
    ith_ka: float | None = None
    idyn_ka: float | None = None


class GenLimits(BaseModel):
    p_min_mw: float | None = None
    p_max_mw: float | None = None
    q_min_mvar: float | None = None
    q_max_mvar: float | None = None


# ---------------------------------------------------------------------------
# ENMElement — base for all elements
# ---------------------------------------------------------------------------


class ENMElement(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    ref_id: str
    name: str
    tags: list[str] = []
    meta: dict = {}


# ---------------------------------------------------------------------------
# Header + Defaults
# ---------------------------------------------------------------------------


class ENMDefaults(BaseModel):
    frequency_hz: float = 50.0
    unit_system: Literal["SI"] = "SI"


class ENMHeader(BaseModel):
    enm_version: Literal["1.0"] = "1.0"
    name: str
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    revision: int = 1
    hash_sha256: str = ""
    defaults: ENMDefaults = Field(default_factory=ENMDefaults)


# ---------------------------------------------------------------------------
# Bus (node)
# ---------------------------------------------------------------------------


class Bus(ENMElement):
    voltage_kv: float
    frequency_hz: float | None = None
    phase_system: Literal["3ph"] = "3ph"
    zone: str | None = None
    grounding: GroundingConfig | None = None
    nominal_limits: BusLimits | None = None


# ---------------------------------------------------------------------------
# Branch — discriminated union
# ---------------------------------------------------------------------------


class BranchBase(ENMElement):
    from_bus_ref: str
    to_bus_ref: str
    status: Literal["closed", "open"] = "closed"
    catalog_ref: str | None = None


class OverheadLine(BranchBase):
    type: Literal["line_overhead"] = "line_overhead"
    length_km: float
    r_ohm_per_km: float
    x_ohm_per_km: float
    b_siemens_per_km: float | None = None
    r0_ohm_per_km: float | None = None
    x0_ohm_per_km: float | None = None
    b0_siemens_per_km: float | None = None
    rating: BranchRating | None = None


class Cable(BranchBase):
    type: Literal["cable"] = "cable"
    length_km: float
    r_ohm_per_km: float
    x_ohm_per_km: float
    b_siemens_per_km: float | None = None
    r0_ohm_per_km: float | None = None
    x0_ohm_per_km: float | None = None
    b0_siemens_per_km: float | None = None
    rating: BranchRating | None = None
    insulation: Literal["XLPE", "PVC", "PAPER"] | None = None


class SwitchBranch(BranchBase):
    """Wyłącznik, rozłącznik, sprzęgło, sekcjoner."""
    type: Literal["switch", "breaker", "bus_coupler", "disconnector"]
    r_ohm: float | None = None
    x_ohm: float | None = None


class FuseBranch(BranchBase):
    type: Literal["fuse"] = "fuse"
    rated_current_a: float | None = None
    rated_voltage_kv: float | None = None


Branch = Annotated[
    OverheadLine | Cable | SwitchBranch | FuseBranch,
    Field(discriminator="type"),
]


# ---------------------------------------------------------------------------
# Transformer
# ---------------------------------------------------------------------------


class Transformer(ENMElement):
    hv_bus_ref: str
    lv_bus_ref: str
    sn_mva: float
    uhv_kv: float
    ulv_kv: float
    uk_percent: float
    pk_kw: float
    p0_kw: float | None = None
    i0_percent: float | None = None
    vector_group: str | None = None
    hv_neutral: GroundingConfig | None = None
    lv_neutral: GroundingConfig | None = None
    tap_position: int | None = None
    tap_min: int | None = None
    tap_max: int | None = None
    tap_step_percent: float | None = None
    catalog_ref: str | None = None


# ---------------------------------------------------------------------------
# Source (punkt zasilania)
# ---------------------------------------------------------------------------


class Source(ENMElement):
    bus_ref: str
    model: Literal["thevenin", "short_circuit_power", "external_grid"]
    sk3_mva: float | None = None
    ik3_ka: float | None = None
    r_ohm: float | None = None
    x_ohm: float | None = None
    rx_ratio: float | None = None
    r0_ohm: float | None = None
    x0_ohm: float | None = None
    z0_z1_ratio: float | None = None
    c_max: float | None = None
    c_min: float | None = None


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------


class Load(ENMElement):
    bus_ref: str
    p_mw: float
    q_mvar: float
    model: Literal["pq", "zip"] = "pq"


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------


class Generator(ENMElement):
    bus_ref: str
    p_mw: float
    q_mvar: float | None = None
    gen_type: Literal["synchronous", "pv_inverter", "wind_inverter", "bess"] | None = None
    limits: GenLimits | None = None


# ---------------------------------------------------------------------------
# Substation (stacja SN/nn — kontener logiczny z rozdzielnicami)
# ---------------------------------------------------------------------------


class Substation(ENMElement):
    """Stacja SN/nn — logiczny kontener z rozdzielnicami."""

    station_type: Literal["gpz", "mv_lv", "switching", "customer"]
    bus_refs: list[str] = []
    transformer_refs: list[str] = []
    entry_point_ref: str | None = None


# ---------------------------------------------------------------------------
# Bay (pole rozdzielcze SN)
# ---------------------------------------------------------------------------


class Bay(ENMElement):
    """Pole rozdzielcze SN (IN, OUT, TR, COUPLER, FEEDER, MEASUREMENT, OZE)."""

    bay_role: Literal["IN", "OUT", "TR", "COUPLER", "FEEDER", "MEASUREMENT", "OZE"]
    substation_ref: str
    bus_ref: str
    equipment_refs: list[str] = []
    protection_ref: str | None = None


# ---------------------------------------------------------------------------
# Junction (węzeł T — rozgałęzienie magistrali)
# ---------------------------------------------------------------------------


class Junction(ENMElement):
    """Węzeł T (rozgałęzienie magistrali)."""

    connected_branch_refs: list[str]
    junction_type: Literal["T_node", "sectionalizer", "recloser_point", "NO_point"]


# ---------------------------------------------------------------------------
# Corridor (magistrala — ciąg linii SN)
# ---------------------------------------------------------------------------


class Corridor(ENMElement):
    """Magistrala (ciąg linii SN od GPZ do stacji końcowej)."""

    corridor_type: Literal["radial", "ring", "mixed"]
    ordered_segment_refs: list[str]
    no_point_ref: str | None = None


# ---------------------------------------------------------------------------
# ROOT
# ---------------------------------------------------------------------------


class EnergyNetworkModel(BaseModel):
    header: ENMHeader
    buses: list[Bus] = []
    branches: list[Branch] = []
    transformers: list[Transformer] = []
    sources: list[Source] = []
    loads: list[Load] = []
    generators: list[Generator] = []
    substations: list[Substation] = []
    bays: list[Bay] = []
    junctions: list[Junction] = []
    corridors: list[Corridor] = []
