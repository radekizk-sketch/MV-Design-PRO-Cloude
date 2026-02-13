#!/usr/bin/env python3
"""SolverBoundaryGuard — blokuje PR-y LF modyfikujące solvery SC/Protection.

Sprawdza git diff i failuje jeśli dotknięte są chronione pliki solverów.
"""
import subprocess
import sys

WATCHED_PATHS = [
    "backend/src/network_model/solvers/short_circuit_iec60909.py",
    "backend/src/network_model/solvers/short_circuit_iec60909_internal.py",
    "backend/src/network_model/solvers/short_circuit_contributions.py",
    "backend/src/domain/protection_engine_v1.py",
]

def get_changed_files() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "origin/main...HEAD"],
            capture_output=True, text=True, check=True,
        )
        return [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
    except subprocess.CalledProcessError:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1"],
            capture_output=True, text=True, check=True,
        )
        return [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]

def main() -> int:
    changed = get_changed_files()
    violations = []
    for path in changed:
        for watched in WATCHED_PATHS:
            if path.endswith(watched) or watched in path:
                violations.append(path)

    if violations:
        print("BŁĄD [SolverBoundaryGuard]: PR modyfikuje pliki solvera SC/Protection.")
        print("Zmienione pliki chronione:")
        for v in sorted(set(violations)):
            print(f"  - {v}")
        print()
        print("Load Flow PR NIE MOŻE modyfikować solverów zwarciowych ani zabezpieczeń.")
        return 1

    print("OK [SolverBoundaryGuard]: Brak zmian w chronionych plikach solverów.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
