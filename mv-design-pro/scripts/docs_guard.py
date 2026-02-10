#!/usr/bin/env python3
"""
DOCS GUARD — Documentation Integrity CI Check

Checks:
1. No "PCC" term in entrypoint documentation files (prohibited concept).
   Scans only entrypoint docs (SYSTEM_SPEC, ARCHITECTURE, README, AGENTS, PLANS).
   Excludes docs/spec/ (canonical, binding — not to be modified by guard).
2. Broken markdown links in key entrypoints (SYSTEM_SPEC, README, ARCHITECTURE, INDEX).

Note: Project codenames in frontend UI strings are checked by the separate
no_codenames_guard.py script. This guard focuses on documentation integrity.

Usage:
  python scripts/docs_guard.py

Exit codes:
  0 — all checks pass
  1 — violations found
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# CHECK 1: PCC prohibition in entrypoint docs
# ---------------------------------------------------------------------------

PCC_CHECK_FILES = [
    "SYSTEM_SPEC.md",
    "ARCHITECTURE.md",
    "README.md",
    "AGENTS.md",
    "PLANS.md",
]

PCC_PATTERN = re.compile(r"\bPCC\b")

# Lines that are allowed to mention PCC (prohibition rule definitions)
PCC_ALLOWED_CONTEXTS = [
    "NOT in NetworkModel",
    "Forbidden Terms",
    "Prohibition",
    "prohibited",
    "ZAKAZ",
    "zakaz",
    "nie wolno",
    "belongs to interpretation",
    "belongs to Analysis",
    "belongs ONLY",
    "interpretation, not physics",
    "BoundaryNode",
    "no_codenames",
    "docs_guard",
    "PCC_",
    "pcc_",
    "PCC prohibition",
    "PCC Prohibition",
]


def check_pcc() -> list[str]:
    """Check for PCC term in entrypoint documentation."""
    violations = []

    for rel_file in PCC_CHECK_FILES:
        file_path = REPO_ROOT / rel_file
        if not file_path.exists():
            continue

        try:
            content = file_path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        for line_num, line in enumerate(content.split("\n"), start=1):
            if PCC_PATTERN.search(line):
                if any(ctx in line for ctx in PCC_ALLOWED_CONTEXTS):
                    continue
                violations.append(f"  {rel_file}:{line_num}: {line.strip()[:100]}")

    return violations


# ---------------------------------------------------------------------------
# CHECK 2: Broken links in key entrypoints
# ---------------------------------------------------------------------------

LINK_CHECK_FILES = [
    "SYSTEM_SPEC.md",
    "README.md",
    "ARCHITECTURE.md",
    "docs/INDEX.md",
]

MD_LINK_PATTERN = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")


def check_broken_links() -> list[str]:
    """Check for broken relative links in key entrypoints."""
    violations = []

    for rel_file in LINK_CHECK_FILES:
        file_path = REPO_ROOT / rel_file
        if not file_path.exists():
            continue

        try:
            content = file_path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        base_dir = file_path.parent

        for line_num, line in enumerate(content.split("\n"), start=1):
            for match in MD_LINK_PATTERN.finditer(line):
                link_target = match.group(2)

                # Skip external URLs, anchors, mailto
                if link_target.startswith(("http://", "https://", "#", "mailto:")):
                    continue

                # Strip anchor from link
                link_path = link_target.split("#")[0]
                if not link_path:
                    continue

                # Handle directory links (ending with /)
                if link_path.endswith("/"):
                    target = base_dir / link_path
                    if not target.exists():
                        violations.append(
                            f"  {rel_file}:{line_num}: broken directory link -> {link_target}"
                        )
                    continue

                # Skip glob patterns
                if "*" in link_path:
                    continue

                target = base_dir / link_path
                if not target.exists():
                    violations.append(
                        f"  {rel_file}:{line_num}: broken link -> {link_target}"
                    )

    return violations


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------


def main() -> int:
    all_ok = True

    # Check 1: PCC
    pcc_violations = check_pcc()
    if pcc_violations:
        print("=" * 70, file=sys.stderr)
        print("DOCS GUARD: PCC TERM FOUND IN ENTRYPOINT DOCS", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print(
            "The term 'PCC' is prohibited in core model documentation.",
            file=sys.stderr,
        )
        print(f"Found {len(pcc_violations)} violation(s):", file=sys.stderr)
        for v in pcc_violations:
            print(v, file=sys.stderr)
        print(file=sys.stderr)
        all_ok = False

    # Check 2: Broken links
    link_violations = check_broken_links()
    if link_violations:
        print("=" * 70, file=sys.stderr)
        print("DOCS GUARD: BROKEN LINKS IN ENTRYPOINTS", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print(f"Found {len(link_violations)} broken link(s):", file=sys.stderr)
        for v in link_violations:
            print(v, file=sys.stderr)
        print(file=sys.stderr)
        all_ok = False

    if all_ok:
        print("docs-guard: OK (all checks pass)")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
