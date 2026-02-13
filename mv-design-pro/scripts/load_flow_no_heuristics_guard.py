#!/usr/bin/env python3
"""NoHeuristicsGuard — wykrywa zakazane wzorce heurystyczne w kodzie Load Flow."""
import re
import sys
from pathlib import Path

SCAN_DIRS = [
    "backend/src/application/analysis_run",
    "backend/src/domain",
    "backend/src/analysis/power_flow",
]

BANNED_PATTERNS = [
    {
        "id": "NH-01",
        "name": "Auto-select slack",
        "pattern": re.compile(r"auto_select_slack|pick_slack|find_slack|choose_slack|default_slack", re.IGNORECASE),
        "description": "Automatyczny dobór węzła bilansującego jest zabroniony.",
    },
    {
        "id": "NH-02",
        "name": "Implicit cosφ",
        "pattern": re.compile(r"cos_phi|power_factor\s*\*|cosfi|cos_fi", re.IGNORECASE),
        "description": "Obliczanie Q z cosφ bez jawnego parametru wejścia jest zabronione.",
    },
    {
        "id": "NH-05",
        "name": "Implicit distributed weights",
        "pattern": re.compile(r"distribute_slack|auto_weight|equal_weight", re.IGNORECASE),
        "description": "Automatyczny podział slack bez jawnych wag jest zabroniony.",
    },
]

EXCLUDED_FILENAMES = {"__pycache__", ".pyc"}

def scan_file(filepath: Path) -> list[dict]:
    violations = []
    try:
        content = filepath.read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError):
        return violations

    for line_num, line in enumerate(content.splitlines(), start=1):
        # Skip comments
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        for bp in BANNED_PATTERNS:
            if bp["pattern"].search(line):
                violations.append({
                    "file": str(filepath),
                    "line": line_num,
                    "pattern_id": bp["id"],
                    "pattern_name": bp["name"],
                    "description": bp["description"],
                    "code": stripped[:120],
                })
    return violations

def main() -> int:
    base = Path("mv-design-pro")
    if not base.exists():
        base = Path(".")

    all_violations = []
    for scan_dir in SCAN_DIRS:
        scan_path = base / scan_dir
        if not scan_path.exists():
            continue
        for py_file in scan_path.rglob("*.py"):
            if any(exc in str(py_file) for exc in EXCLUDED_FILENAMES):
                continue
            all_violations.extend(scan_file(py_file))

    if all_violations:
        print("BŁĄD [NoHeuristicsGuard]: Wykryto zakazane wzorce heurystyczne.")
        print()
        for v in sorted(all_violations, key=lambda x: (x["file"], x["line"])):
            print(f"  {v['file']}:{v['line']}")
            print(f"    Wzorzec: {v['pattern_id']} — {v['pattern_name']}")
            print(f"    Opis: {v['description']}")
            print(f"    Kod: {v['code']}")
            print()
        print("Load Flow NIE MOŻE zawierać domyślnych wartości ani automatycznego doboru parametrów.")
        return 1

    print("OK [NoHeuristicsGuard]: Brak zakazanych wzorców heurystycznych.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
