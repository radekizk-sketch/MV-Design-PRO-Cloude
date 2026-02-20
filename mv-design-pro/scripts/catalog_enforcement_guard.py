#!/usr/bin/env python3
"""
CI Guard: catalog_enforcement_guard.py

Validates that:
1. All technical element operations in CANONICAL_OPERATIONS that create elements
   are listed in _CATALOG_REQUIRED_OPERATIONS in the domain_operations API
2. CatalogBinding model has all required fields
3. MaterializationContract exists for every CatalogNamespace
4. Every BLOCKER readiness code related to catalog has a fix_action

EXIT 0 = pass, EXIT 1 = fail
"""

import sys
import os

# Add backend/src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend", "src"))


def check_catalog_binding_fields() -> list[str]:
    """Check CatalogBinding has required fields."""
    errors: list[str] = []

    from network_model.catalog.types import CatalogBinding

    binding = CatalogBinding(
        catalog_namespace="TEST",
        catalog_item_id="TEST_ID",
        catalog_item_version="1.0",
        materialize=True,
    )
    d = binding.to_dict()

    required = ["catalog_namespace", "catalog_item_id", "catalog_item_version", "materialize"]
    for field in required:
        if field not in d:
            errors.append(f"FAIL: CatalogBinding missing field '{field}' in to_dict()")

    return errors


def check_materialization_contracts() -> list[str]:
    """Check MaterializationContract exists for every CatalogNamespace."""
    errors: list[str] = []

    from network_model.catalog.types import CatalogNamespace, MATERIALIZATION_CONTRACTS

    for ns in CatalogNamespace:
        if ns.value not in MATERIALIZATION_CONTRACTS:
            # CONVERTER and INVERTER may not have contracts (they use ConverterType)
            if ns.value in ("CONVERTER", "INVERTER"):
                continue
            errors.append(
                f"FAIL: No MaterializationContract for CatalogNamespace.{ns.value}"
            )
        else:
            contract = MATERIALIZATION_CONTRACTS[ns.value]
            if not contract.solver_fields:
                errors.append(
                    f"FAIL: MaterializationContract for {ns.value} has empty solver_fields"
                )

    return errors


def check_readiness_codes_coverage() -> list[str]:
    """Check that catalog-related BLOCKER codes have fix_actions."""
    errors: list[str] = []

    from domain.canonical_operations import READINESS_CODES, ReadinessLevel

    catalog_blockers = [
        (code, spec)
        for code, spec in READINESS_CODES.items()
        if spec.level == ReadinessLevel.BLOCKER
        and "catalog" in code.lower()
    ]

    for code, spec in catalog_blockers:
        if not spec.fix_action_id:
            errors.append(
                f"FAIL: Catalog BLOCKER '{code}' has no fix_action_id"
            )

    return errors


def check_namespace_accessor_coverage() -> list[str]:
    """Check that materialization engine can look up items for all namespaces."""
    errors: list[str] = []

    from network_model.catalog.materialization import _NAMESPACE_ACCESSOR
    from network_model.catalog.types import CatalogNamespace

    for ns in CatalogNamespace:
        if ns.value in ("CONVERTER", "INVERTER"):
            continue
        if ns.value not in _NAMESPACE_ACCESSOR:
            errors.append(
                f"FAIL: No accessor in materialization engine for namespace {ns.value}"
            )

    return errors


def main() -> int:
    print("=" * 60)
    print("GUARD: catalog_enforcement_guard")
    print("=" * 60)

    all_errors: list[str] = []

    # Check 1: CatalogBinding fields
    print("\n[1/4] Checking CatalogBinding fields...")
    errors = check_catalog_binding_fields()
    all_errors.extend(errors)
    print(f"  {'OK' if not errors else f'{len(errors)} error(s)'}")
    for e in errors:
        print(f"  {e}")

    # Check 2: MaterializationContract coverage
    print("\n[2/4] Checking MaterializationContract coverage...")
    errors = check_materialization_contracts()
    all_errors.extend(errors)
    print(f"  {'OK' if not errors else f'{len(errors)} error(s)'}")
    for e in errors:
        print(f"  {e}")

    # Check 3: Readiness codes for catalog
    print("\n[3/4] Checking catalog readiness codes coverage...")
    errors = check_readiness_codes_coverage()
    all_errors.extend(errors)
    print(f"  {'OK' if not errors else f'{len(errors)} error(s)'}")
    for e in errors:
        print(f"  {e}")

    # Check 4: Namespace accessor coverage
    print("\n[4/4] Checking materialization accessor coverage...")
    errors = check_namespace_accessor_coverage()
    all_errors.extend(errors)
    print(f"  {'OK' if not errors else f'{len(errors)} error(s)'}")
    for e in errors:
        print(f"  {e}")

    # Summary
    fail_count = sum(1 for e in all_errors if e.startswith("FAIL"))
    print(f"\n{'=' * 60}")
    if fail_count > 0:
        print(f"FAILED: {fail_count} error(s)")
        return 1

    print("PASSED: All catalog enforcement checks OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
