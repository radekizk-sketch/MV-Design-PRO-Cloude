#!/usr/bin/env python3
"""
Strażnik: zero wystąpień 'draft_graph' / 'draftGraph' / 'DraftGraph' w kodzie frontend.

UI V3 wymaga, aby UI nie przechowywało lokalnej kopii grafu topologii.
Snapshot jest jedynym źródłem prawdy.

Wynik: EXIT 0 = PASS, EXIT 1 = FAIL
"""

import re
import sys
from pathlib import Path

FRONTEND_SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"

PATTERNS = [
    re.compile(r"\bdraft_graph\b", re.IGNORECASE),
    re.compile(r"\bdraftGraph\b"),
    re.compile(r"\bDraftGraph\b"),
]

# Dozwolone: komentarze dokumentujące zakaz
ALLOWED_PATTERNS = [
    re.compile(r"//\s*ZAKAZ.*draft.?graph", re.IGNORECASE),
    re.compile(r"#\s*ZAKAZ.*draft.?graph", re.IGNORECASE),
    re.compile(r"\*\s*ZAKAZ.*draft.?graph", re.IGNORECASE),
]

EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}


def is_allowed(line: str) -> bool:
    return any(p.search(line) for p in ALLOWED_PATTERNS)


def main() -> int:
    if not FRONTEND_SRC.exists():
        print(f"SKIP: {FRONTEND_SRC} nie istnieje")
        return 0

    violations: list[str] = []

    for path in FRONTEND_SRC.rglob("*"):
        if path.suffix not in EXTENSIONS:
            continue
        if "__tests__" in str(path) and "guard" in path.name.lower():
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        for line_no, line in enumerate(content.splitlines(), 1):
            if is_allowed(line):
                continue
            for pattern in PATTERNS:
                if pattern.search(line):
                    rel = path.relative_to(FRONTEND_SRC.parent.parent)
                    violations.append(f"  {rel}:{line_no}: {line.strip()}")
                    break

    if violations:
        print(f"FAIL: Znaleziono {len(violations)} wystąpień 'draft_graph' w kodzie frontend:")
        for v in violations:
            print(v)
        print()
        print("UI V3 wymaga: brak draft_graph. Snapshot jest jedynym źródłem prawdy.")
        return 1

    print("PASS: zero wystąpień 'draft_graph' w kodzie frontend.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
