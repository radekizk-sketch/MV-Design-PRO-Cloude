#!/usr/bin/env python3
"""
Straznik bramki katalogowej — CI guard.

Sprawdza ze w kodzie ENM domain operations NIE MA sciezek
tworzacych segmenty lub transformatory bez walidacji catalog_ref.

Blokuje:
- create_branch() bez sprawdzenia catalog_ref
- create_device() type=transformer bez sprawdzenia catalog_ref

Zasada: grep-positive dla "catalog.ref_required" we wszystkich operacjach
tworzacych elementy techniczne.

Uzycie:
    python scripts/catalog_gate_guard.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Sciezki do sprawdzenia
ENM_OPS_FILE = Path("mv-design-pro/backend/src/enm/domain_operations.py")

# Operacje ktore MUSZA miec bramke katalogowa
OPERATIONS_REQUIRING_GATE = [
    "continue_trunk_segment_sn",
    "start_branch_segment_sn",
    "connect_secondary_ring_sn",
    "insert_station_on_segment_sn",
    "add_transformer_sn_nn",
]

# Wzorzec bramy katalogowej (musi byc w kazdej operacji)
GATE_PATTERN = re.compile(r"catalog\.ref_required")


def check_catalog_gates() -> list[str]:
    """Sprawdz czy wszystkie operacje maja bramke katalogowa."""
    violations: list[str] = []

    if not ENM_OPS_FILE.exists():
        violations.append(f"Plik nie istnieje: {ENM_OPS_FILE}")
        return violations

    content = ENM_OPS_FILE.read_text(encoding="utf-8")

    for op_name in OPERATIONS_REQUIRING_GATE:
        # Znajdz definicje funkcji
        func_pattern = re.compile(
            rf"def\s+{re.escape(op_name)}\s*\(.*?\).*?(?=\ndef\s|\Z)",
            re.DOTALL,
        )
        match = func_pattern.search(content)

        if not match:
            violations.append(
                f"BRAK DEFINICJI: Operacja '{op_name}' nie znaleziona w {ENM_OPS_FILE}"
            )
            continue

        func_body = match.group(0)

        # Sprawdz czy jest bramka katalogowa
        if not GATE_PATTERN.search(func_body):
            violations.append(
                f"BRAK BRAMKI KATALOGOWEJ: Operacja '{op_name}' nie zawiera "
                f"walidacji 'catalog.ref_required' w {ENM_OPS_FILE}"
            )

    return violations


def main() -> int:
    """Uruchom straznika bramki katalogowej."""
    print("=" * 60)
    print("Straznik bramki katalogowej (catalog_gate_guard)")
    print("=" * 60)

    violations = check_catalog_gates()

    if violations:
        print(f"\nZNALEZIONO {len(violations)} NARUSZEN:\n")
        for v in violations:
            print(f"  [BLAD] {v}")
        print()
        return 1
    else:
        print("\nBramka katalogowa: OK — wszystkie operacje maja walidacje.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
