"""
Reference Patterns Package — Wzorce odniesienia

Engineering benchmark patterns for validating protection methodology.

CANONICAL ALIGNMENT:
- NOT-A-SOLVER: Patterns are INTERPRETATION layer components.
- WHITE BOX: Full trace of validation steps.
- DETERMINISM: Same inputs → identical outputs.

AVAILABLE PATTERNS:
- Pattern A (RP-LINE-I2-THERMAL-SPZ): Dobór I>> dla linii SN
  Validates: selectivity, sensitivity, thermal criteria, SPZ blocking
- Pattern C (RP-LOC-GEN-IMPACT): Wpływ generacji lokalnej na zabezpieczenia SN
  Validates: fault current change, busbar blocking risk, selectivity impact

NO CODENAMES IN UI/PROOF.
"""

from .base import (
    # Types
    ReferenceVerdict,
    CheckStatus,
    # Result class
    ReferencePatternResult,
    # Helpers
    stable_sort_dict,
    stable_json,
    compare_results_deterministic,
    build_check,
    build_trace_step,
)

from .pattern_line_i_doubleprime_thermal_spz import (
    # Constants
    PATTERN_ID,
    PATTERN_NAME_PL,
    NARROW_WINDOW_THRESHOLD,
    PATTERN_A_FIXTURES_SUBDIR,
    # Validator
    LineIDoublePrimeReferencePattern,
    # Public API
    run_pattern_a,
    # Fixture utilities
    load_fixture,
    fixture_to_input,
    get_pattern_a_fixtures_dir,
)

from .wzorzec_c_generacja_lokalna import (
    # Constants
    PATTERN_C_ID,
    PATTERN_C_NAME_PL,
    PATTERN_C_FIXTURES_SUBDIR,
    PROG_INFORMACYJNY_PCT,
    PROG_GRANICZNY_PCT,
    PROG_REZERWY_SELEKTYWNOSCI_PCT,
    # Types
    TypGeneracji,
    ZrodloGeneracji,
    DaneZwarciowePunktuZabezpieczenia,
    NastawyZabezpieczen,
    WzorzecCInput,
    # Validator
    WzorzecCGeneracjaLokalna,
    # Public API
    run_pattern_c,
    # Fixture utilities
    load_fixture_c,
    fixture_to_input_c,
    get_pattern_c_fixtures_dir,
)

__all__ = [
    # Types
    "ReferenceVerdict",
    "CheckStatus",
    # Result
    "ReferencePatternResult",
    # Helpers
    "stable_sort_dict",
    "stable_json",
    "compare_results_deterministic",
    "build_check",
    "build_trace_step",
    # Pattern A
    "PATTERN_ID",
    "PATTERN_NAME_PL",
    "NARROW_WINDOW_THRESHOLD",
    "PATTERN_A_FIXTURES_SUBDIR",
    "LineIDoublePrimeReferencePattern",
    "run_pattern_a",
    "load_fixture",
    "fixture_to_input",
    "get_pattern_a_fixtures_dir",
    # Pattern C
    "PATTERN_C_ID",
    "PATTERN_C_NAME_PL",
    "PATTERN_C_FIXTURES_SUBDIR",
    "PROG_INFORMACYJNY_PCT",
    "PROG_GRANICZNY_PCT",
    "PROG_REZERWY_SELEKTYWNOSCI_PCT",
    "TypGeneracji",
    "ZrodloGeneracji",
    "DaneZwarciowePunktuZabezpieczenia",
    "NastawyZabezpieczen",
    "WzorzecCInput",
    "WzorzecCGeneracjaLokalna",
    "run_pattern_c",
    "load_fixture_c",
    "fixture_to_input_c",
    "get_pattern_c_fixtures_dir",
]
