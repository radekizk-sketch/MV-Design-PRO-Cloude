"""
SPZ Lookup Tables — FIX-12D

Lookup tables for SPZ (Auto-reclosing) blocking decisions.

CANONICAL ALIGNMENT:
- NOT-A-SOLVER: Pure lookup/interpretation, no physics
- DETERMINISM: Same inputs → identical outputs
- Configurable: Operator can override thresholds

METHODOLOGY (from lecture materials):
    SPZ should be blocked from I>> when:
    1. Fault current at line start exceeds thermal threshold
    2. Repeated fault cycles would exceed conductor thermal capacity

    Threshold table based on:
    - Conductor thermal capacity
    - Maximum single fault duration
    - Number of SPZ cycles

STABILITY:
    This module provides STABLE lookup tables.
    Changing values affects system behavior globally.
    All changes must be audited.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SPZThresholdEntry:
    """
    Single entry in SPZ threshold lookup table.

    Attributes:
        max_fault_time_s: Maximum fault duration for this threshold [s]
        current_threshold_ka: Current threshold [kA]
        block_spz: Whether to block SPZ above this threshold
        notes_pl: Polish notes
    """

    max_fault_time_s: float
    current_threshold_ka: float
    block_spz: bool
    notes_pl: str

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "max_fault_time_s": self.max_fault_time_s,
            "current_threshold_ka": self.current_threshold_ka,
            "block_spz": self.block_spz,
            "notes_pl": self.notes_pl,
        }


@dataclass(frozen=True)
class SPZLookupTable:
    """
    SPZ blocking threshold lookup table.

    Provides thresholds for SPZ blocking decisions based on
    fault current and duration.

    Attributes:
        name: Table name
        entries: Sorted tuple of threshold entries (by current ascending)
        default_block: Default decision if no entry matches
    """

    name: str
    entries: tuple[SPZThresholdEntry, ...]
    default_block: bool = False

    def lookup(
        self,
        fault_current_ka: float,
        fault_time_s: float,
    ) -> tuple[bool, str]:
        """
        Look up SPZ blocking decision.

        Args:
            fault_current_ka: Fault current at line start [kA]
            fault_time_s: Single fault duration [s]

        Returns:
            Tuple of (block_spz, reason_pl)
        """
        # Find matching entry (sorted by current ascending)
        for entry in self.entries:
            if fault_time_s <= entry.max_fault_time_s:
                if fault_current_ka >= entry.current_threshold_ka:
                    if entry.block_spz:
                        return True, entry.notes_pl
                    else:
                        return False, entry.notes_pl

        # No match found - use default
        if self.default_block:
            return True, "Brak pasującego wpisu w tabeli - domyślna blokada SPZ"
        return False, "Brak pasującego wpisu w tabeli - domyślnie SPZ dozwolone"

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "name": self.name,
            "entries": [e.to_dict() for e in self.entries],
            "default_block": self.default_block,
        }


# =============================================================================
# DEFAULT THRESHOLD TABLE
# =============================================================================

# Default SPZ threshold table based on typical MV line parameters
# Values from lecture materials and utility practice
SPZ_THRESHOLD_TABLE_DEFAULT = SPZLookupTable(
    name="SPZ_THRESHOLD_DEFAULT",
    entries=tuple(
        sorted(
            [
                # For short faults (< 0.3s), allow SPZ up to higher currents
                SPZThresholdEntry(
                    max_fault_time_s=0.3,
                    current_threshold_ka=8.0,
                    block_spz=True,
                    notes_pl="Prąd zwarciowy > 8 kA przy czasie < 0.3s - blokada SPZ (ryzyko cieplne)",
                ),
                SPZThresholdEntry(
                    max_fault_time_s=0.3,
                    current_threshold_ka=0.0,
                    block_spz=False,
                    notes_pl="Prąd zwarciowy < 8 kA przy czasie < 0.3s - SPZ dozwolone",
                ),
                # For medium faults (0.3-0.5s), lower threshold
                SPZThresholdEntry(
                    max_fault_time_s=0.5,
                    current_threshold_ka=6.0,
                    block_spz=True,
                    notes_pl="Prąd zwarciowy > 6 kA przy czasie 0.3-0.5s - blokada SPZ (ryzyko cieplne)",
                ),
                SPZThresholdEntry(
                    max_fault_time_s=0.5,
                    current_threshold_ka=0.0,
                    block_spz=False,
                    notes_pl="Prąd zwarciowy < 6 kA przy czasie 0.3-0.5s - SPZ dozwolone",
                ),
                # For longer faults (0.5-1.0s), even lower threshold
                SPZThresholdEntry(
                    max_fault_time_s=1.0,
                    current_threshold_ka=4.0,
                    block_spz=True,
                    notes_pl="Prąd zwarciowy > 4 kA przy czasie 0.5-1.0s - blokada SPZ (ryzyko cieplne)",
                ),
                SPZThresholdEntry(
                    max_fault_time_s=1.0,
                    current_threshold_ka=0.0,
                    block_spz=False,
                    notes_pl="Prąd zwarciowy < 4 kA przy czasie 0.5-1.0s - SPZ dozwolone",
                ),
                # For very long faults (> 1.0s), conservative threshold
                SPZThresholdEntry(
                    max_fault_time_s=2.0,
                    current_threshold_ka=3.0,
                    block_spz=True,
                    notes_pl="Prąd zwarciowy > 3 kA przy czasie > 1.0s - blokada SPZ (ryzyko cieplne)",
                ),
                SPZThresholdEntry(
                    max_fault_time_s=2.0,
                    current_threshold_ka=0.0,
                    block_spz=False,
                    notes_pl="Prąd zwarciowy < 3 kA przy czasie > 1.0s - SPZ dozwolone",
                ),
            ],
            key=lambda e: (e.max_fault_time_s, -e.current_threshold_ka),
        )
    ),
    default_block=False,
)


def get_spz_blocking_decision(
    fault_current_a: float,
    fault_time_s: float,
    lookup_table: SPZLookupTable | None = None,
) -> tuple[bool, str]:
    """
    Get SPZ blocking decision from lookup table.

    Args:
        fault_current_a: Fault current at line start [A]
        fault_time_s: Single fault duration [s]
        lookup_table: Custom lookup table (uses default if None)

    Returns:
        Tuple of (block_spz, reason_pl)
    """
    table = lookup_table or SPZ_THRESHOLD_TABLE_DEFAULT
    fault_current_ka = fault_current_a / 1000.0
    return table.lookup(fault_current_ka, fault_time_s)


# =============================================================================
# THERMAL CAPACITY LOOKUP
# =============================================================================

# Typical MV cable thermal withstand data (from manufacturer catalogs)
# Format: (material, voltage_kv) -> {cross_section_mm2: ithn_1s_ka}
CABLE_THERMAL_WITHSTAND_KA: dict[tuple[str, int], dict[int, float]] = {
    # XLPE Cu cables 15/20 kV
    ("XLPE_CU", 20): {
        35: 5.0,
        50: 7.2,
        70: 10.0,
        95: 13.6,
        120: 17.2,
        150: 21.5,
        185: 26.5,
        240: 34.3,
        300: 42.9,
    },
    # XLPE Al cables 15/20 kV
    ("XLPE_AL", 20): {
        35: 3.3,
        50: 4.7,
        70: 6.6,
        95: 8.9,
        120: 11.3,
        150: 14.1,
        185: 17.4,
        240: 22.6,
        300: 28.2,
    },
    # Paper-insulated Cu cables 15/20 kV (legacy)
    ("PAPER_CU", 20): {
        35: 4.5,
        50: 6.5,
        70: 9.0,
        95: 12.2,
        120: 15.5,
        150: 19.4,
        185: 23.9,
        240: 30.9,
    },
}


def get_cable_ithn_ka(
    material: str,
    voltage_kv: int,
    cross_section_mm2: int,
) -> float | None:
    """
    Get cable thermal withstand current from lookup.

    Args:
        material: Cable material (XLPE_CU, XLPE_AL, PAPER_CU)
        voltage_kv: Voltage level [kV]
        cross_section_mm2: Cross-section [mm²]

    Returns:
        Ithn for 1s [kA] or None if not found
    """
    key = (material, voltage_kv)
    if key not in CABLE_THERMAL_WITHSTAND_KA:
        return None

    table = CABLE_THERMAL_WITHSTAND_KA[key]
    return table.get(cross_section_mm2)
